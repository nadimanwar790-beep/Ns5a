import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  BadgePercent,
  BookOpen,
  CheckCircle2,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Power,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  EntranceClassNumber,
  EntranceDiscountConfig,
  EntranceDiscountSlab,
  EntranceTestAttempt,
  EntranceTestQuestion,
  EntranceTestQuestionFormat,
  EntranceTestSubject,
  School,
} from "../../school-types";
import { generateId, updateSchool } from "../../school-firebase";
import {
  DEFAULT_SAMPLE_ENTRANCE_SLABS,
  EntranceEvaluationTier,
  FORMAT_DISPLAY_LABEL,
  MAX_FREE_ATTEMPTS_PER_CLASS,
  TOTAL_PAPER_SETS,
  calculateEntranceScoreDiscount,
  deleteCustomEntranceQuestion,
  evaluateEntranceScore,
  formatSetId,
  generateEntrancePaperSet,
  getClassTestBlueprint,
  getCustomEntranceQuestions,
  getEntranceTestAttempts,
  normalizeEntranceDiscountConfig,
  saveCustomEntranceQuestion,
} from "../../utils/entranceTestEngine";
import {
  getCuratedQuestionsForClass,
  getEntranceBankStats,
  getTotalCuratedBankCount,
} from "../../data/entranceTestQuestionBank";
import { downloadEntrancePaperPdf } from "../../utils/entrancePaperPdf";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";

interface Props {
  school: School;
  onBack?: () => void;
  onConvertLeadToAdmission?: (attempt: EntranceTestAttempt) => void;
  onSchoolUpdated?: (updated: School) => void;
}

const CLASSES: EntranceClassNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
const FORMAT_OPTIONS: EntranceTestQuestionFormat[] = [
  "MCQ",
  "FILL_BLANK",
  "ODD_ONE_OUT",
  "TRUE_FALSE",
  "SERIES_PUZZLE",
  "MINI_PASSAGE",
];

export const EntranceTestAdminManager: React.FC<Props> = ({
  school,
  onBack,
  onConvertLeadToAdmission,
  onSchoolUpdated,
}) => {
  const schoolId = school?.id || "";
  const [activeTab, setActiveTab] = useState<"leads" | "discounts" | "papers" | "bank" | "custom">("leads");
  const [attempts, setAttempts] = useState<EntranceTestAttempt[]>([]);
  const [customQuestions, setCustomQuestions] = useState<EntranceTestQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Entrance Exam Score Percentage Fee Off Slabs
  const [discountConfig, setDiscountConfig] = useState<EntranceDiscountConfig>(() =>
    normalizeEntranceDiscountConfig(school?.websiteConfig?.entranceDiscountConfig)
  );
  const [savingDiscounts, setSavingDiscounts] = useState(false);
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [slabMinPct, setSlabMinPct] = useState<string>("80");
  const [slabMaxPct, setSlabMaxPct] = useState<string>("100");
  const [slabType, setSlabType] = useState<"fixed" | "percent">("fixed");
  const [slabValue, setSlabValue] = useState<string>("500");
  const [slabLabel, setSlabLabel] = useState<string>("");

  useEffect(() => {
    setDiscountConfig(
      normalizeEntranceDiscountConfig(school?.websiteConfig?.entranceDiscountConfig)
    );
  }, [school?.websiteConfig?.entranceDiscountConfig]);

  // Leads filters
  const [leadSearch, setLeadSearch] = useState("");
  const [leadClassFilter, setLeadClassFilter] = useState<"all" | EntranceClassNumber>("all");
  const [leadTierFilter, setLeadTierFilter] = useState<"all" | EntranceEvaluationTier>("all");
  const [onlyFiveCompleted, setOnlyFiveCompleted] = useState(false);

  // 100-Set Browser & PDF Generator
  const [paperClass, setPaperClass] = useState<EntranceClassNumber>(1);
  const [paperSetNumber, setPaperSetNumber] = useState<number>(1);
  const [showAnswersInPreview, setShowAnswersInPreview] = useState<boolean>(true);
  const [downloadingPdfMode, setDownloadingPdfMode] = useState<"full" | "questions_only" | null>(
    null
  );

  // Expanded Curated Question Bank Explorer (300+ Qs per Subject / Class)
  const [bankClass, setBankClass] = useState<EntranceClassNumber>(1);
  const [bankSubjectFilter, setBankSubjectFilter] = useState<string>("all");
  const [bankSearch, setBankSearch] = useState("");
  const [bankShowAnswers, setBankShowAnswers] = useState(true);
  const [bankPage, setBankPage] = useState(1);

  // Custom Question Creator
  const [qClass, setQClass] = useState<EntranceClassNumber>(1);
  const [qSubject, setQSubject] = useState<EntranceTestSubject>("English");
  const [qFormat, setQFormat] = useState<EntranceTestQuestionFormat>("MCQ");
  const [qPassage, setQPassage] = useState("");
  const [qPrompt, setQPrompt] = useState("");
  const [qOpt0, setQOpt0] = useState("");
  const [qOpt1, setQOpt1] = useState("");
  const [qOpt2, setQOpt2] = useState("");
  const [qOpt3, setQOpt3] = useState("");
  const [qCorrectIdx, setQCorrectIdx] = useState<0 | 1 | 2 | 3>(0);
  const [qExplanation, setQExplanation] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let alive = true;
    setLoading(true);
    Promise.all([getEntranceTestAttempts(schoolId), getCustomEntranceQuestions(schoolId)])
      .then(([att, cq]) => {
        if (!alive) return;
        setAttempts(att);
        setCustomQuestions(cq);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [schoolId]);

  const totalCuratedBankCount = useMemo(() => getTotalCuratedBankCount(), []);
  const paperBankStats = useMemo(() => getEntranceBankStats(paperClass), [paperClass]);
  const bankStats = useMemo(() => getEntranceBankStats(bankClass), [bankClass]);
  const bankAllQuestions = useMemo(() => getCuratedQuestionsForClass(bankClass), [bankClass]);

  const bankFilteredQuestions = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return bankAllQuestions.filter((item) => {
      if (bankSubjectFilter !== "all" && item.subject !== bankSubjectFilter) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        (item.topicTag || "").toLowerCase().includes(q) ||
        (item.explanation || "").toLowerCase().includes(q)
      );
    });
  }, [bankAllQuestions, bankSubjectFilter, bankSearch]);

  const BANK_PAGE_SIZE = 25;
  const bankTotalPages = Math.max(1, Math.ceil(bankFilteredQuestions.length / BANK_PAGE_SIZE));
  const safeBankPage = Math.min(bankPage, bankTotalPages);
  const bankVisibleQuestions = useMemo(
    () =>
      bankFilteredQuestions.slice(
        (safeBankPage - 1) * BANK_PAGE_SIZE,
        safeBankPage * BANK_PAGE_SIZE
      ),
    [bankFilteredQuestions, safeBankPage]
  );

  useEffect(() => {
    setBankSubjectFilter("all");
    setBankPage(1);
  }, [bankClass]);

  const previewPaper = useMemo(
    () =>
      generateEntrancePaperSet({
        schoolId,
        classLevel: paperClass,
        setNumber: paperSetNumber,
        customQuestions,
      }),
    [schoolId, paperClass, paperSetNumber, customQuestions]
  );

  const leadStats = useMemo(() => {
    const totalAttempts = attempts.length;
    const uniquePhones = new Set(attempts.map((a) => `${a.phone}_${a.classLevel}`)).size;
    const avgPct =
      totalAttempts > 0
        ? Math.round(attempts.reduce((s, a) => s + Number(a.percentage || 0), 0) / totalAttempts)
        : 0;
    const funnelReady = attempts.filter((a) => a.attemptNumber >= MAX_FREE_ATTEMPTS_PER_CLASS).length;
    return { totalAttempts, uniquePhones, avgPct, funnelReady };
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    return attempts.filter((a) => {
      if (leadClassFilter !== "all" && Number(a.classLevel) !== leadClassFilter) return false;
      if (onlyFiveCompleted && a.attemptNumber < MAX_FREE_ATTEMPTS_PER_CLASS) return false;
      if (leadTierFilter !== "all") {
        const tier = evaluateEntranceScore(a.percentage, a.classLabel).tier;
        if (tier !== leadTierFilter) return false;
      }
      if (!q) return true;
      return (
        (a.studentName || "").toLowerCase().includes(q) ||
        (a.phone || "").toLowerCase().includes(q) ||
        (a.setId || "").toLowerCase().includes(q) ||
        (a.classLabel || "").toLowerCase().includes(q)
      );
    });
  }, [attempts, leadSearch, leadClassFilter, leadTierFilter, onlyFiveCompleted]);

  const qBlueprint = useMemo(() => getClassTestBlueprint(qClass), [qClass]);
  useEffect(() => {
    const allowed = qBlueprint.quotas.map((x) => x.subject);
    if (!allowed.includes(qSubject)) {
      setQSubject(allowed[0]);
    }
  }, [qBlueprint, qSubject]);

  const handleDownloadPdf = async (mode: "full" | "questions_only") => {
    setDownloadingPdfMode(mode);
    try {
      await downloadEntrancePaperPdf({
        school,
        paper: previewPaper,
        mode,
      });
      toast.success(
        mode === "full"
          ? `${previewPaper.classLabel} (${previewPaper.setId}) — 2-Part PDF (Question + Answer Key) डाउनलोड हो गया!`
          : `${previewPaper.classLabel} (${previewPaper.setId}) — Student Question Paper PDF डाउनलोड हो गया!`
      );
    } catch (err: any) {
      toast.error("PDF बनाने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setDownloadingPdfMode(null);
    }
  };

  const handleSaveCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qPrompt.trim() || !qOpt0.trim() || !qOpt1.trim() || !qOpt2.trim() || !qOpt3.trim()) {
      toast.error("प्रश्न और चारों विकल्प (A, B, C, D) भरना अनिवार्य है।");
      return;
    }
    setSavingCustom(true);
    try {
      const saved = await saveCustomEntranceQuestion(schoolId, {
        classLevel: qClass,
        subject: qSubject,
        format: qFormat,
        passage: qFormat === "MINI_PASSAGE" && qPassage.trim() ? qPassage.trim() : undefined,
        question: qPrompt.trim(),
        options: [qOpt0.trim(), qOpt1.trim(), qOpt2.trim(), qOpt3.trim()],
        correctIndex: qCorrectIdx,
        explanation:
          qExplanation.trim() ||
          `Correct answer is (${OPTION_LETTERS[qCorrectIdx]}) ${
            [qOpt0, qOpt1, qOpt2, qOpt3][qCorrectIdx].trim()
          }.`,
      });
      setCustomQuestions((prev) => [saved, ...prev]);
      setQPrompt("");
      setQPassage("");
      setQOpt0("");
      setQOpt1("");
      setQOpt2("");
      setQOpt3("");
      setQExplanation("");
      toast.success(`Custom question saved! Automatically included in Class ${qClass} Sets.`);
    } finally {
      setSavingCustom(false);
    }
  };

  const handleDeleteCustom = async (qId: string) => {
    await deleteCustomEntranceQuestion(schoolId, qId);
    setCustomQuestions((prev) => prev.filter((q) => q.id !== qId));
    toast.success("Custom question deleted.");
  };

  // Persist Entrance Discount Slabs Config
  const persistDiscountConfig = async (nextCfg: EntranceDiscountConfig, successMsg: string) => {
    const normalized = normalizeEntranceDiscountConfig(nextCfg);
    setDiscountConfig(normalized);
    setSavingDiscounts(true);
    try {
      const nextWebsiteConfig = {
        ...(school.websiteConfig || {}),
        entranceDiscountConfig: normalized,
        updatedAt: new Date().toISOString(),
      };
      await updateSchool(schoolId, { websiteConfig: nextWebsiteConfig });
      onSchoolUpdated?.({
        ...school,
        websiteConfig: nextWebsiteConfig,
      });
      toast.success(successMsg);
    } catch (err: any) {
      toast.error("सेव करने में समस्या: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSavingDiscounts(false);
    }
  };

  const resetSlabForm = () => {
    setEditingSlabId(null);
    setSlabMinPct("80");
    setSlabMaxPct("100");
    setSlabType("fixed");
    setSlabValue("500");
    setSlabLabel("");
  };

  const handleAddOrUpdateSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    const minP = Math.max(0, Math.min(100, Math.round(Number(slabMinPct || 0))));
    const maxP = Math.max(0, Math.min(100, Math.round(Number(slabMaxPct || 0))));
    const val = Math.max(0, Math.round(Number(slabValue || 0)));

    if (minP > maxP) {
      toast.error("Minimum % कभी Maximum % से ज़्यादा नहीं हो सकता।");
      return;
    }
    if (val <= 0) {
      toast.error("कृपया 0 से बड़ा Discount Value (₹ या %) दर्ज करें।");
      return;
    }
    if (slabType === "percent" && val > 100) {
      toast.error("Percentage छूट 100% से अधिक नहीं हो सकती।");
      return;
    }

    const newSlab: EntranceDiscountSlab = {
      id: editingSlabId || generateId("eslab"),
      minPercentage: minP,
      maxPercentage: maxP,
      discountType: slabType,
      discountValue: val,
      label: slabLabel.trim() || `${minP}%–${maxP}% Merit Fee Off`,
      enabled: true,
    };

    const nextSlabs = editingSlabId
      ? discountConfig.slabs.map((s) => (s.id === editingSlabId ? newSlab : s))
      : [newSlab, ...discountConfig.slabs];

    const nextCfg: EntranceDiscountConfig = {
      ...discountConfig,
      enabled: true,
      slabs: nextSlabs,
    };

    resetSlabForm();
    await persistDiscountConfig(
      nextCfg,
      editingSlabId
        ? `Slab (${minP}%–${maxP}%) अपडेट हो गया!`
        : `नया Slab (${minP}%–${maxP}% → ${slabType === "percent" ? `${val}%` : `₹${val}`} OFF) जुड़ गया!`
    );
  };

  const handleEditSlabClick = (s: EntranceDiscountSlab) => {
    setEditingSlabId(s.id);
    setSlabMinPct(String(s.minPercentage));
    setSlabMaxPct(String(s.maxPercentage));
    setSlabType(s.discountType);
    setSlabValue(String(s.discountValue));
    setSlabLabel(s.label || "");
  };

  const handleToggleSlabActive = async (slabId: string) => {
    const nextSlabs = discountConfig.slabs.map((s) =>
      s.id === slabId ? { ...s, enabled: s.enabled === false } : s
    );
    await persistDiscountConfig(
      { ...discountConfig, slabs: nextSlabs },
      "Slab status updated."
    );
  };

  const handleDeleteSlab = async (slabId: string) => {
    const nextSlabs = discountConfig.slabs.filter((s) => s.id !== slabId);
    if (editingSlabId === slabId) resetSlabForm();
    await persistDiscountConfig(
      { ...discountConfig, slabs: nextSlabs },
      "Slab cancelled & removed."
    );
  };

  const handleToggleMasterDiscounts = async () => {
    const nextEnabled = !discountConfig.enabled;
    await persistDiscountConfig(
      {
        ...discountConfig,
        enabled: nextEnabled,
        slabs:
          nextEnabled && discountConfig.slabs.length === 0
            ? DEFAULT_SAMPLE_ENTRANCE_SLABS
            : discountConfig.slabs,
      },
      nextEnabled
        ? "✅ Entrance Exam Merit Fee Off चालू (Active) कर दिया गया!"
        : "⛔ सभी Entrance Exam Fee Off रद्द / बंद (Cancelled) कर दिए गए।"
    );
  };

  const handleLoadDefaultSlabs = async () => {
    await persistDiscountConfig(
      {
        enabled: true,
        applyScope: discountConfig.applyScope || "all",
        slabs: DEFAULT_SAMPLE_ENTRANCE_SLABS,
      },
      "✅ Default Merit Slabs (90%+ ₹500, 80–89% ₹300, 60–79% ₹200) लोड हो गए!"
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
              Entrance Test Leads &amp; {totalCuratedBankCount.toLocaleString("en-IN")}-Question Bank (Class 1–8)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              300+ Top Questions / Subject · Set-01 से Set-100 प्रीव्यू, 2-Part PDF डाउनलोड और लीड ट्रैकिंग
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          {(
            [
              { id: "leads", label: `Test Leads (${attempts.length})` },
              {
                id: "discounts",
                label: `Merit Fee Off (${discountConfig.enabled ? "ON" : "OFF"})`,
              },
              { id: "papers", label: "100-Set Bank & PDF" },
              { id: "bank", label: `Question Bank (${totalCuratedBankCount.toLocaleString("en-IN")})` },
              { id: "custom", label: `Custom Qs (${customQuestions.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? "bg-[#070D19] text-white"
                  : t.id === "discounts" && discountConfig.enabled
                  ? "text-emerald-700 dark:text-emerald-400 hover:text-slate-950 dark:hover:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: STUDENT TEST ATTEMPT LEADS */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500">Total Online Attempts</div>
              <div className="text-2xl font-black text-slate-950 dark:text-white font-mono tabular-nums mt-1">
                {leadStats.totalAttempts}
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500">Unique Students</div>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums mt-1">
                {leadStats.uniquePhones}
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500">Average Score %</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
                {leadStats.avgPct}%
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500">5/5 Admission Funnel Ready</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">
                {leadStats.funnelReady}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Search student name, mobile, Class, or Set-04..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={leadClassFilter}
                onChange={(e) =>
                  setLeadClassFilter(e.target.value === "all" ? "all" : (Number(e.target.value) as EntranceClassNumber))
                }
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <option value="all">All Classes (1–8)</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
              <select
                value={leadTierFilter}
                onChange={(e) =>
                  setLeadTierFilter(e.target.value as "all" | EntranceEvaluationTier)
                }
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <option value="all">All Evaluation Tiers</option>
                <option value="MERIT">Merit / 90%+ Discovery (80–100%)</option>
                <option value="QUALIFIED">Qualified Next Class (50–79%)</option>
                <option value="FOUNDATION_SUPPORT">Conditional Next Class (33–49%)</option>
                <option value="COUNSELING">Keep Same Class / Counseling (&lt;33%)</option>
              </select>
              <button
                type="button"
                onClick={() => setOnlyFiveCompleted((p) => !p)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer ${
                  onlyFiveCompleted
                    ? "bg-amber-400 text-slate-950 border-amber-400"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                5/5 Funnel Leads Only
              </button>
            </div>
          </div>

          {/* 4-Tier Principal Evaluation Guide Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
              <div className="font-black text-emerald-800 dark:text-emerald-300">80–100% · Merit (90%+ Step-Up)</div>
              <div className="text-emerald-700/90 dark:text-emerald-200/80">Next Class + Scholarship (90%+ Discovery Offer)</div>
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3 py-2">
              <div className="font-black text-sky-800 dark:text-sky-300">50–79% · Qualified</div>
              <div className="text-sky-700/90 dark:text-sky-200/80">Direct Admission in Next Class</div>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
              <div className="font-black text-amber-800 dark:text-amber-300">33–49% · Guided Next Class</div>
              <div className="text-amber-700/90 dark:text-amber-200/80">Next Class + 1-Month Foundation Support</div>
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-2">
              <div className="font-black text-rose-800 dark:text-rose-300">&lt;33% · Same Class</div>
              <div className="text-rose-700/90 dark:text-rose-200/80">Suggest Same Exam Class / Bridge Plan</div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading test attempts...
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                अभी कोई टेस्ट अटेम्प्ट रिकॉर्ड नहीं है
              </p>
              <p className="text-xs text-slate-500">
                जैसे ही अभिभावक या छात्र Public Website से Free Entrance Test देंगे, उनका नाम, नंबर, पेपर सेट और स्कोर यहाँ दिखेगा।
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAttempts.map((att) => {
                const evalInfo = evaluateEntranceScore(att.percentage, att.classLabel, att.classLevel);
                const feeOffInfo = calculateEntranceScoreDiscount(att.percentage, discountConfig);
                const badgeCls =
                  evalInfo.tier === "MERIT"
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                    : evalInfo.tier === "QUALIFIED"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : evalInfo.tier === "FOUNDATION_SUPPORT"
                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
                return (
                  <div
                    key={att.id}
                    className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-950 dark:text-white">
                          {att.studentName}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold font-mono">
                          Exam: {att.classLabel} · {att.setId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold tabular-nums">
                          Attempt #{att.attemptNumber}/5
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-extrabold tabular-nums ${badgeCls}`}
                          title={evalInfo.adminRuleNote}
                        >
                          {evalInfo.adminShortBadge}
                        </span>
                        {feeOffInfo.eligible && (
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold tabular-nums">
                            🎁 {feeOffInfo.displayBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums flex flex-wrap gap-3">
                        <span>📱 {att.phone}</span>
                        <span>
                          Score:{" "}
                          <strong
                            className={
                              evalInfo.isDirectEligible
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }
                          >
                            {att.score}/{att.totalQuestions} ({att.percentage}%)
                          </strong>
                        </span>
                        <span>{new Date(att.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        <strong>{evalInfo.adminTag}:</strong> {evalInfo.adminRuleNote}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={`tel:${att.phone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const waText = evalInfo.isDirectEligible
                            ? `नमस्ते ${att.studentName} जी, बधाई हो! ${school.name} के ${att.classLabel} ऑनलाइन एंट्रेंस टेस्ट (${att.setId}) में आपने ${att.score}/${att.totalQuestions} (${att.percentage}%) अंक प्राप्त किए हैं। आप ${att.classLabel} में सीधे प्रवेश के लिए योग्य हैं। कृपया स्कूल ऑफिस या ऑनलाइन पोर्टल से दाखिला कन्फर्म करें।`
                            : `नमस्ते ${att.studentName} जी, ${school.name} के ${att.classLabel} ऑनलाइन फाउंडेशन असेसमेंट (${att.setId}) में शामिल होने के लिए धन्यवाद! प्रिंसिपल सर के साथ फ्री काउंसलिंग व सीट बुकिंग के लिए कृपया स्कूल ऑफिस आएं या संपर्क करें।`;
                          safeOpenExternalUrl(`https://wa.me/91${att.phone}?text=${encodeURIComponent(waText)}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                      {onConvertLeadToAdmission && (
                        <button
                          type="button"
                          onClick={() => onConvertLeadToAdmission(att)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Admit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MERIT FEE OFF SLABS (PERCENTAGE -> ADMISSION OFF) */}
      {activeTab === "discounts" && (
        <div className="space-y-4">
          {/* Master ON/OFF & Scope Bar */}
          <div className="rounded-2xl bg-[#070D19] text-white border border-slate-800 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <BadgePercent className="w-4 h-4 text-amber-400" />
                <span className="text-sm sm:text-base font-extrabold">
                  Entrance Exam Merit Fee Off Settings
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    discountConfig.enabled
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {discountConfig.enabled ? "ACTIVE ON ADMISSIONS" : "CANCELLED / OFF"}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                तय करें कि एंट्रेंस टेस्ट में कितने प्रतिशत (%) नंबर आने पर एडमिशन फीस में कितनी छूट (₹ Fixed या % Off) मिलेगी। आप कभी भी कोई स्लैब जोड़, बदल या पूरा ऑफर कैंसल कर सकते हैं।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={discountConfig.applyScope || "all"}
                disabled={savingDiscounts}
                onChange={(e) =>
                  void persistDiscountConfig(
                    {
                      ...discountConfig,
                      applyScope:
                        e.target.value === "admission_only" ? "admission_only" : "all",
                    },
                    "Fee scope updated."
                  )
                }
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100"
              >
                <option value="all">Apply On: All Admission Heads (Excl. Bus)</option>
                <option value="admission_only">Apply On: Admission &amp; Reg. Fee Only</option>
              </select>

              <button
                type="button"
                disabled={savingDiscounts}
                onClick={handleLoadDefaultSlabs}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Default Slabs</span>
              </button>

              <button
                type="button"
                disabled={savingDiscounts}
                onClick={handleToggleMasterDiscounts}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60 ${
                  discountConfig.enabled
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {discountConfig.enabled ? "Cancel All Off (Turn OFF)" : "Enable Fee Off (Turn ON)"}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Add / Edit Slab Form */}
            <form
              onSubmit={handleAddOrUpdateSlab}
              className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  {editingSlabId ? (
                    <>
                      <Edit2 className="w-4 h-4 text-amber-500" />
                      <span>Edit Percentage Fee Off Slab</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-emerald-500" />
                      <span>Add Percentage Fee Off Slab</span>
                    </>
                  )}
                </h3>
                {editingSlabId && (
                  <button
                    type="button"
                    onClick={resetSlabForm}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Min Score % *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={slabMinPct}
                    onChange={(e) => setSlabMinPct(e.target.value)}
                    placeholder="e.g. 90"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Max Score % *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={slabMaxPct}
                    onChange={(e) => setSlabMaxPct(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={slabType}
                    onChange={(e) =>
                      setSlabType(e.target.value === "percent" ? "percent" : "fixed")
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    <option value="fixed">₹ Fixed Rupees OFF</option>
                    <option value="percent">% Percent Fee OFF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {slabType === "percent" ? "Off Percentage (%)" : "Off Amount (₹)"} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={slabType === "percent" ? 100 : 100000}
                    value={slabValue}
                    onChange={(e) => setSlabValue(e.target.value)}
                    placeholder={slabType === "percent" ? "e.g. 25" : "e.g. 500"}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Badge / Label (Optional)
                </label>
                <input
                  type="text"
                  value={slabLabel}
                  onChange={(e) => setSlabLabel(e.target.value)}
                  placeholder="e.g. 90%+ Scholar Merit Off"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={savingDiscounts}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {savingDiscounts ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {editingSlabId ? "Save Slab Changes" : "+ Add Fee Off Slab"}
                </span>
              </button>
            </form>

            {/* Right: Configured Slabs List */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Configured Percentage Fee Off Slabs ({discountConfig.slabs.length})</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Highest matching % slab auto-applies
                </span>
              </div>

              {discountConfig.slabs.length === 0 ? (
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    अभी कोई Percentage Fee Off Slab सेट नहीं है।
                  </p>
                  <p className="text-[11px] text-slate-500">
                    बाएं फॉर्म से नया स्लैब जोड़ें या ऊपर "Load Default Slabs" पर क्लिक करें।
                  </p>
                </div>
              ) : (
                discountConfig.slabs.map((slab) => {
                  const isActive = discountConfig.enabled && slab.enabled !== false;
                  const offText =
                    slab.discountType === "percent"
                      ? `${slab.discountValue}% OFF`
                      : `₹${slab.discountValue.toLocaleString("en-IN")} OFF`;
                  return (
                    <div
                      key={slab.id}
                      className={`rounded-xl bg-white dark:bg-slate-900 border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? "border-emerald-300 dark:border-emerald-800"
                          : "border-slate-200 dark:border-slate-800 opacity-75"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-[#070D19] text-amber-400 text-xs font-black font-mono tabular-nums">
                            {slab.minPercentage}% – {slab.maxPercentage}%
                          </span>
                          <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white text-xs font-black tabular-nums">
                            {offText}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}
                          >
                            {!discountConfig.enabled
                              ? "MASTER OFF"
                              : slab.enabled !== false
                              ? "ACTIVE"
                              : "PAUSED"}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {slab.label || `${slab.minPercentage}%–${slab.maxPercentage}% Merit Off`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSlabClick(slab)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={savingDiscounts}
                          onClick={() => void handleToggleSlabActive(slab.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                            slab.enabled !== false
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {slab.enabled !== false ? "Pause" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={savingDiscounts}
                          onClick={() => void handleDeleteSlab(slab.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 100-SET PAPER BROWSER & 2-PART PDF GENERATOR */}
      {activeTab === "papers" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Select Class (Class 1–8)
                </label>
                <select
                  value={paperClass}
                  onChange={(e) => setPaperClass(Number(e.target.value) as EntranceClassNumber)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold"
                >
                  {CLASSES.map((c) => {
                    const bp = getClassTestBlueprint(c);
                    return (
                      <option key={c} value={c}>
                        Class {c} ({bp.durationMinutes} Min · {bp.totalQuestions} Qs)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Select Paper Set (Set-01 to Set-100)
                </label>
                <select
                  value={paperSetNumber}
                  onChange={(e) => setPaperSetNumber(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold font-mono"
                >
                  {Array.from({ length: TOTAL_PAPER_SETS }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {formatSetId(n)} ({getClassTestBlueprint(paperClass).totalQuestions} Questions + Answer Key)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={downloadingPdfMode !== null}
                  onClick={() => handleDownloadPdf("full")}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-[#070D19] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {downloadingPdfMode === "full" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Question + Answer Key (2-Part PDF)</span>
                </button>
                <button
                  type="button"
                  disabled={downloadingPdfMode !== null}
                  onClick={() => handleDownloadPdf("questions_only")}
                  className="py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {downloadingPdfMode === "questions_only" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>Only Paper PDF</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Set Mix ({previewPaper.totalQuestions} Qs):
                  </span>
                  {previewPaper.subjectBreakdown.map((b, i) => (
                    <React.Fragment key={b.subject}>
                      {i > 0 && <span className="text-slate-400" aria-hidden="true">·</span>}
                      <span>
                        {b.subject} <strong className="font-mono">{b.count}</strong>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span className="font-semibold text-sky-700 dark:text-sky-400">
                    Class {paperClass} Pool ({paperBankStats.totalQuestions} Qs):
                  </span>
                  {paperBankStats.bySubject.map((s, i) => (
                    <React.Fragment key={s.subject}>
                      {i > 0 && <span aria-hidden="true">·</span>}
                      <span>
                        {s.subject} {s.count}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnswersInPreview((p) => !p)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                {showAnswersInPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showAnswersInPreview ? "Hide Answer Key" : "Show Answer Key"}</span>
              </button>
            </div>
          </div>

          {/* Paper Question Cards */}
          <div className="space-y-2.5">
            {previewPaper.questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    Q.{idx + 1} · {q.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-[11px]">
                    {FORMAT_DISPLAY_LABEL[q.format]}
                    {q.isCustom ? " · Custom" : ""}
                  </span>
                </div>
                {q.passage && (
                  <p className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-slate-700 dark:text-slate-300">
                    <strong>Passage:</strong> {q.passage}
                  </p>
                )}
                <p className="text-sm font-bold text-slate-950 dark:text-white">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === q.correctIndex && showAnswersInPreview;
                    return (
                      <div
                        key={oi}
                        className={`px-3 py-1.5 rounded-lg border ${
                          isCorrect
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        ({OPTION_LETTERS[oi]}) {opt}
                      </div>
                    );
                  })}
                </div>
                {showAnswersInPreview && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Answer ({OPTION_LETTERS[q.correctIndex]}):</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CURATED BANK EXPLORER (300+ QUESTIONS PER SUBJECT) */}
      {activeTab === "bank" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                  Class {bankClass} Curated Bank · {bankStats.totalQuestions} Top Questions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                  300+ questions in every subject across all 8 classes ({totalCuratedBankCount.toLocaleString("en-IN")} total across Class 1–8)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBankShowAnswers((p) => !p)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {bankShowAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{bankShowAnswers ? "Hide Answers" : "Show Answers"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {CLASSES.map((cls) => {
                const count = getEntranceBankStats(cls).totalQuestions;
                const active = bankClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setBankClass(cls)}
                    className={`py-2 px-2 rounded-lg border text-center cursor-pointer transition-colors ${
                      active
                        ? "bg-[#070D19] text-white border-[#070D19] dark:border-amber-400"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <div className="text-xs font-bold whitespace-nowrap">Class {cls}</div>
                    <div className={`text-[11px] font-mono tabular-nums ${active ? "text-amber-400" : "text-slate-500"}`}>
                      {count} Qs
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setBankSubjectFilter("all");
                    setBankPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                    bankSubjectFilter === "all"
                      ? "bg-[#070D19] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  All ({bankStats.totalQuestions})
                </button>
                {bankStats.bySubject.map((sub) => (
                  <button
                    key={sub.subject}
                    type="button"
                    onClick={() => {
                      setBankSubjectFilter(sub.subject);
                      setBankPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                      bankSubjectFilter === sub.subject
                        ? "bg-[#070D19] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {sub.subject} ({sub.count})
                  </button>
                ))}
              </div>

              <div className="relative sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => {
                    setBankSearch(e.target.value);
                    setBankPage(1);
                  }}
                  placeholder="Search topic or keyword..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {bankVisibleQuestions.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
              No questions matched your filter in Class {bankClass}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {bankVisibleQuestions.map((q, idx) => {
                const absNumber = (safeBankPage - 1) * BANK_PAGE_SIZE + idx + 1;
                return (
                  <div
                    key={q.id}
                    className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                        #{absNumber} · {q.subject} · {q.topicTag}
                      </span>
                      <span className="font-mono text-[11px]">
                        {FORMAT_DISPLAY_LABEL[q.format]}
                      </span>
                    </div>
                    {q.passage && (
                      <p className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-slate-700 dark:text-slate-300">
                        <strong>Passage:</strong> {q.passage}
                      </p>
                    )}
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {q.options.map((opt, oi) => {
                        const isCorrect = bankShowAnswers && oi === q.correctIndex;
                        return (
                          <div
                            key={oi}
                            className={`px-3 py-1.5 rounded-lg border ${
                              isCorrect
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold"
                                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            ({OPTION_LETTERS[oi]}) {opt}
                          </div>
                        );
                      })}
                    </div>
                    {bankShowAnswers && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>Answer ({OPTION_LETTERS[q.correctIndex]}):</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}

              {bankTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Showing {(safeBankPage - 1) * BANK_PAGE_SIZE + 1}–
                    {Math.min(safeBankPage * BANK_PAGE_SIZE, bankFilteredQuestions.length)} of{" "}
                    {bankFilteredQuestions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safeBankPage <= 1}
                      onClick={() => setBankPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-mono font-bold tabular-nums">
                      Page {safeBankPage} / {bankTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safeBankPage >= bankTotalPages}
                      onClick={() => setBankPage((p) => Math.min(bankTotalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CUSTOM SCHOOL QUESTION MANAGER */}
      {activeTab === "custom" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSaveCustomQuestion}
            className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Add Custom Entrance MCQ (Auto-Mixed in Sets)</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold mb-1">Class</label>
                <select
                  value={qClass}
                  onChange={(e) => setQClass(Number(e.target.value) as EntranceClassNumber)}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">Subject</label>
                <select
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value as EntranceTestSubject)}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  {qBlueprint.quotas.map((q) => (
                    <option key={q.subject} value={q.subject}>
                      {q.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">Question Type</label>
                <select
                  value={qFormat}
                  onChange={(e) => setQFormat(e.target.value as EntranceTestQuestionFormat)}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {FORMAT_DISPLAY_LABEL[f]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {qFormat === "MINI_PASSAGE" && (
              <div>
                <label className="block text-[11px] font-semibold mb-1">Passage Text</label>
                <textarea
                  rows={2}
                  value={qPassage}
                  onChange={(e) => setQPassage(e.target.value)}
                  placeholder="Enter short passage for the student to read..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold mb-1">Question *</label>
              <textarea
                rows={2}
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="Write question in English or Hindi..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { val: qOpt0, set: setQOpt0, label: "Option A *" },
                { val: qOpt1, set: setQOpt1, label: "Option B *" },
                { val: qOpt2, set: setQOpt2, label: "Option C *" },
                { val: qOpt3, set: setQOpt3, label: "Option D *" },
              ].map((opt, idx) => (
                <div key={idx}>
                  <label className="block text-[11px] font-semibold mb-1">{opt.label}</label>
                  <input
                    type="text"
                    value={opt.val}
                    onChange={(e) => opt.set(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold mb-1">Correct Option</label>
                <select
                  value={qCorrectIdx}
                  onChange={(e) => setQCorrectIdx(Number(e.target.value) as 0 | 1 | 2 | 3)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  {OPTION_LETTERS.map((l, idx) => (
                    <option key={l} value={idx}>
                      Option {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold mb-1">
                  1-Line Answer Explanation (For Answer Key)
                </label>
                <input
                  type="text"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Short solution printed on Answer Key PDF..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingCustom}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingCustom ? "Saving..." : "Save Question to School Pool"}</span>
            </button>
          </form>

          <div className="lg:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-500" />
                <span>Saved School Custom Questions ({customQuestions.length})</span>
              </h3>
            </div>

            {customQuestions.length === 0 ? (
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                अभी कोई कस्टम प्रश्न नहीं जोड़ा गया है। ऊपर के फॉर्म से जोड़े गए प्रश्न सभी 100 सेट और PDF में अपने-आप जुड़ जाएंगे।
              </div>
            ) : (
              customQuestions.map((cq) => (
                <div
                  key={cq.id}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-sky-700 dark:text-sky-300">
                      Class {cq.classLevel} · {cq.subject} · {FORMAT_DISPLAY_LABEL[cq.format]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(cq.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      aria-label="Delete custom question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{cq.question}</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Answer: ({OPTION_LETTERS[cq.correctIndex]}) {cq.options[cq.correctIndex]}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
