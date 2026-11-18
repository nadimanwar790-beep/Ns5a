import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Printer,
  Edit3,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  X,
  ArrowLeft,
  Users,
  Sparkles,
  Award,
} from "lucide-react";
import type { School } from "../../school-types";
import {
  getTeacherRulesConfig,
  saveTeacherRulesConfig,
  subscribeToTeacherRulesConfig,
  getTeacherRuleAcceptances,
  saveTeacherRuleAcceptance,
} from "../../school-firebase";
import {
  getDefaultTeacherRulesConfig,
  isLifeMakerSchool,
  OFFICIAL_LIFE_MAKER_RULES_POSTER_URL,
  type SchoolTeacherRulesConfig,
  type TeacherRuleAcceptance,
  type TeacherRuleCategory,
  type TeacherRuleItem,
} from "../../utils/schoolTeacherRules";
import { printHtmlInIframe } from "./AdmissionFormPrintModal";
import { getSavedSchoolLogo } from "./feeReceiptUtils";

interface Props {
  school: School | null;
  canEdit?: boolean;
  currentTeacherId?: string;
  currentTeacherName?: string;
  currentTeacherRole?: string;
  teacherSignatureUrl?: string;
  staffCount?: number;
  onBack?: () => void;
  onClose?: () => void;
}

const CATEGORY_BADGE: Record<
  TeacherRuleCategory,
  { label: string; cls: string }
> = {
  payroll: {
    label: "Salary & Bonus",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  attendance: {
    label: "Attendance & Time",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  conduct: {
    label: "Code of Conduct",
    cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  },
  welfare: {
    label: "Staff Child Benefit",
    cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  documents: {
    label: "Documents",
    cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  },
};

export const TeacherRulesRegulationsView: React.FC<Props> = ({
  school,
  canEdit = false,
  currentTeacherId = "",
  currentTeacherName = "",
  currentTeacherRole = "Teacher",
  teacherSignatureUrl = "",
  staffCount = 0,
  onBack,
  onClose,
}) => {
  const schoolId = school?.id || "";
  const [config, setConfig] = useState<SchoolTeacherRulesConfig>(() =>
    getDefaultTeacherRulesConfig(schoolId, school)
  );
  const [acceptances, setAcceptances] = useState<
    Record<string, TeacherRuleAcceptance>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPolicySettings, setShowPolicySettings] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [showAcceptancesList, setShowAcceptancesList] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | TeacherRuleCategory>("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [newRuleForm, setNewRuleForm] = useState<{
    title: string;
    description: string;
    highlight: string;
    category: TeacherRuleCategory;
    icon: string;
  }>({
    title: "",
    description: "",
    highlight: "",
    category: "conduct",
    icon: "📌",
  });
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    const unsub = subscribeToTeacherRulesConfig(schoolId, school, (cfg) => {
      setConfig(cfg);
      setLoading(false);
    });
    getTeacherRuleAcceptances(schoolId)
      .then((ackMap) => setAcceptances(ackMap || {}))
      .catch(() => {});

    const onAckEvent = (e: any) => {
      if (e?.detail?.schoolId === schoolId && e?.detail?.acceptances) {
        setAcceptances(e.detail.acceptances);
      }
    };
    window.addEventListener("teacher-rules-ack-updated", onAckEvent);

    // Fallback load in case subscription settles slowly
    getTeacherRulesConfig(schoolId, school)
      .then((cfg) => {
        setConfig(cfg);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => {
      unsub();
      window.removeEventListener("teacher-rules-ack-updated", onAckEvent);
    };
  }, [schoolId, school]);

  const activeRules = useMemo(() => {
    const sorted = [...(config.rules || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    const visible = editMode ? sorted : sorted.filter((r) => r.enabled !== false);
    if (categoryFilter === "ALL") return visible;
    return visible.filter((r) => r.category === categoryFilter);
  }, [config.rules, editMode, categoryFilter]);

  const acceptedCount = Object.keys(acceptances || {}).length;
  const myAcceptance = currentTeacherId ? acceptances[currentTeacherId] : undefined;
  const isLifeMaker = isLifeMakerSchool(school);
  const schoolLogo = school?.logoUrl || (schoolId ? getSavedSchoolLogo(schoolId) : "");

  const handleSaveConfig = async (nextConfig: SchoolTeacherRulesConfig) => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const saved = await saveTeacherRulesConfig(schoolId, nextConfig);
      setConfig(saved);
      notify("✅ School Rules & Payroll Policy सुरक्षित हो गई!");
    } catch {
      notify("❌ सेव करने में त्रुटि हुई, कृपया पुनः प्रयास करें।");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToLifeMakerDefaults = async () => {
    const fresh = getDefaultTeacherRulesConfig(schoolId, school);
    await handleSaveConfig(fresh);
    setEditMode(false);
  };

  const handleRuleFieldChange = (
    ruleId: string,
    patch: Partial<TeacherRuleItem>
  ) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
    }));
  };

  const handleDeleteRule = (ruleId: string) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules
        .filter((r) => r.id !== ruleId)
        .map((r, i) => ({ ...r, order: i + 1 })),
    }));
  };

  const handleAddCustomRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleForm.title.trim() || !newRuleForm.description.trim()) return;
    const nextOrder = (config.rules?.length || 0) + 1;
    const item: TeacherRuleItem = {
      id: `rule_custom_${Date.now()}`,
      order: nextOrder,
      title: newRuleForm.title.trim(),
      description: newRuleForm.description.trim(),
      highlight: newRuleForm.highlight.trim() || undefined,
      category: newRuleForm.category,
      icon: newRuleForm.icon.trim() || "📌",
      enabled: true,
    };
    const nextCfg: SchoolTeacherRulesConfig = {
      ...config,
      rules: [...(config.rules || []), item],
    };
    setNewRuleForm({
      title: "",
      description: "",
      highlight: "",
      category: "conduct",
      icon: "📌",
    });
    setShowAddRuleForm(false);
    await handleSaveConfig(nextCfg);
  };

  const handleAcceptRules = async () => {
    if (!schoolId || !currentTeacherId) return;
    setSaving(true);
    try {
      const next = await saveTeacherRuleAcceptance(schoolId, {
        schoolId,
        staffId: currentTeacherId,
        staffName: currentTeacherName || "Faculty Member",
        role: currentTeacherRole || "Teacher",
        acceptedAt: new Date().toISOString(),
        rulesVersion: config.updatedAt || "v1",
      });
      setAcceptances(next);
      notify("✅ धन्यवाद! आपकी नियम सहमति (Rules Acceptance) दर्ज हो गई है।");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintOfficialSheet = () => {
    const enabledOnly = [...(config.rules || [])]
      .filter((r) => r.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const safeSchoolName = (school?.name || "SCHOOL NAME").toUpperCase();
    const safeAddress = school?.address || "";
    const trustBadge = config.trustLine
      ? `<div class="trust-pill">— Run By: ${config.trustLine} —</div>`
      : "";
    const logoHtml = schoolLogo
      ? `<img src="${schoolLogo}" alt="Logo" class="school-logo" />`
      : `<div class="logo-placeholder">🏫</div>`;

    const rulesRowsHtml = enabledOnly
      .map(
        (rule, idx) => `
        <div class="rule-row">
          <div class="rule-num">${idx + 1}).</div>
          <div class="rule-body">
            <span class="rule-title">${rule.title}:</span>
            <span class="rule-desc">${rule.description}</span>
          </div>
          <div class="rule-icon">${rule.icon || "•"}</div>
        </div>
      `
      )
      .join("");

    const teacherSigHtml = teacherSignatureUrl
      ? `<img src="${teacherSignatureUrl}" alt="Teacher Sign" style="max-height:38px; max-width:130px; object-fit:contain;" />`
      : "";
    const principalSigHtml = school?.principalSignatureUrl
      ? `<img src="${school.principalSignatureUrl}" alt="Principal Sign" style="max-height:38px; max-width:130px; object-fit:contain;" />`
      : "";

    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeSchoolName} - Rules & Regulations for Teachers</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; font-family: "Segoe UI", Arial, sans-serif; }
    body { margin: 0; padding: 0; background: #fff; color: #0f172a; }
    .sheet {
      border: 3px solid #1e3a8a;
      border-radius: 14px;
      padding: 14px 16px;
      background: linear-gradient(180deg, #eff6ff 0%, #ffffff 18%);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 10px;
    }
    .school-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 50%; border: 2px solid #1e3a8a; background: #fff; padding: 3px; }
    .logo-placeholder { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #1e3a8a; display: flex; align-items: center; justify-content: center; font-size: 28px; background: #fff; }
    .title-block { flex: 1; text-align: center; }
    .school-title { font-size: 22px; font-weight: 900; color: #1e3a8a; margin: 0; letter-spacing: 0.4px; }
    .address-pill {
      display: inline-block;
      margin-top: 4px;
      padding: 3px 14px;
      border-radius: 999px;
      background: #fde047;
      color: #0f172a;
      font-size: 11px;
      font-weight: 800;
    }
    .trust-pill {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 12px;
      border-radius: 999px;
      background: #0f172a;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }
    .banner {
      margin: 10px 0 12px;
      background: linear-gradient(90deg, #991b1b, #dc2626, #991b1b);
      color: #fef08a;
      text-align: center;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      border: 1.5px solid #facc15;
    }
    .rules-list { display: flex; flex-direction: column; gap: 6px; }
    .rule-row {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      padding: 6px 12px;
      background: #ffffff;
    }
    .rule-row:nth-child(even) { background: #f8fafc; }
    .rule-num {
      min-width: 30px;
      height: 26px;
      border-radius: 999px;
      background: #dc2626;
      color: #fff;
      font-weight: 900;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .rule-body { flex: 1; font-size: 11px; line-height: 1.35; }
    .rule-title { font-weight: 800; color: #1e3a8a; }
    .rule-desc { font-weight: 600; color: #1e293b; }
    .rule-icon { font-size: 16px; width: 26px; text-align: center; flex-shrink: 0; }
    .signatures {
      display: grid;
      grid-template-columns: repeat(${config.requireGuardianSignature ? 3 : 2}, 1fr);
      gap: 12px;
      margin-top: 14px;
    }
    .sig-box {
      border: 1.5px solid #1e3a8a;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .sig-head {
      background: #1e3a8a;
      color: #fff;
      text-align: center;
      padding: 4px 6px;
      font-size: 11px;
      font-weight: 800;
    }
    .sig-space { height: 44px; display: flex; align-items: center; justify-content: center; padding: 3px; }
    .tagline {
      margin-top: 10px;
      background: linear-gradient(90deg, #1e3a8a, #1d4ed8, #1e3a8a);
      color: #fde047;
      text-align: center;
      padding: 6px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 900;
      font-style: italic;
    }
    .meta-foot {
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      ${logoHtml}
      <div class="title-block">
        <h1 class="school-title">${safeSchoolName}</h1>
        ${safeAddress ? `<div class="address-pill">${safeAddress}</div>` : ""}
        <div>${trustBadge}</div>
      </div>
      <div style="width:60px;"></div>
    </div>

    <div class="banner">★ ${config.headerSubtitle || "Rules & Regulations for Teachers"} ★</div>

    <div class="rules-list">${rulesRowsHtml}</div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-head">Teacher's Signature</div>
        <div class="sig-space">${teacherSigHtml}</div>
      </div>
      ${
        config.requireGuardianSignature
          ? `<div class="sig-box">
              <div class="sig-head">Teacher's Guardian Signature</div>
              <div class="sig-space"></div>
            </div>`
          : ""
      }
      <div class="sig-box">
        <div class="sig-head">Principal Signature</div>
        <div class="sig-space">${principalSigHtml}</div>
      </div>
    </div>

    <div class="tagline">${config.tagline || "Together for a Better Tomorrow..."}</div>
    <div class="meta-foot">
      <span>Teacher Name: ${currentTeacherName || "________________________"}</span>
      <span>Date: ____ / ____ / 20____</span>
    </div>
  </div>
</body>
</html>`;

    printHtmlInIframe(htmlDoc, `${safeSchoolName}_Teacher_Rules`);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Action & Official School Header */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border border-blue-700/50 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {(onBack || onClose) && (
              <button
                type="button"
                onClick={onBack || onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
                title="वापस जाएं"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={school?.name || "School"}
                className="w-12 h-12 rounded-2xl object-contain bg-white p-1 border-2 border-amber-300 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0 shadow">
                📜
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white">
                  {school?.name || "SCHOOL"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase border border-amber-300">
                  ★ {config.rules.filter((r) => r.enabled !== false).length} Rules Active
                </span>
              </div>
              {school?.address && (
                <p className="text-xs font-bold text-amber-300 mt-0.5">{school.address}</p>
              )}
              {config.trustLine && (
                <p className="text-[11px] text-blue-200 font-semibold">
                  Run By: {config.trustLine}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isLifeMaker && (
              <button
                type="button"
                onClick={() => setShowPosterModal(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>Notice Poster</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintOfficialSheet}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Rules Sheet</span>
            </button>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPolicySettings((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer ${
                    showPolicySettings
                      ? "bg-emerald-500 text-slate-950 border-emerald-300"
                      : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Payroll Rules</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer ${
                    editMode
                      ? "bg-blue-500 text-white border-blue-300"
                      : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{editMode ? "Editing On" : "Edit Rules"}</span>
                </button>
              </>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white cursor-pointer"
                title="बंद करें"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Highlights Strip (Live Financial & Conduct Rules) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-white/15">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
            <div className="text-[10px] text-emerald-200 font-bold">Full Month Bonus</div>
            <div className="text-xs font-black text-white mt-0.5">
              +{config.policy.fullMonthBonusDays} Days Extra Pay
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/30">
            <div className="text-[10px] text-rose-200 font-bold">Leave &amp; Absent Rule</div>
            <div className="text-xs font-black text-white mt-0.5">
              1d Leave = 0 Bonus • &gt;{config.policy.maxFreeLeaveBeforeNoLeave}d Abs
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30">
            <div className="text-[10px] text-amber-200 font-bold">Punctuality &amp; Dress</div>
            <div className="text-xs font-black text-white mt-0.5">
              &gt;{config.policy.lateCutoffDays} Late / {config.policy.dressCodeCutoffDays}d Dress = -1d
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/30">
            <div className="text-[10px] text-sky-200 font-bold">Salary Pay Window</div>
            <div className="text-xs font-black text-white mt-0.5 truncate" title={config.policy.salaryPayWindow}>
              {config.policy.salaryPayWindow}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-400/30">
            <div className="text-[10px] text-purple-200 font-bold">Staff Child Fee</div>
            <div className="text-xs font-black text-white mt-0.5">
              1st Free • 2nd 50% Off
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
            <div className="text-[10px] text-slate-200 font-bold">Class Mobile &amp; Notice</div>
            <div className="text-xs font-black text-white mt-0.5">
              Account Office • {config.policy.noticePeriodMonths}m Notice
            </div>
          </div>
        </div>
      </div>

      {/* Teacher/Accountant Digital Agreement Bar */}
      {!canEdit && currentTeacherId && (
        <div
          className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            myAcceptance
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                myAcceptance
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 text-slate-950"
              }`}
            >
              {myAcceptance ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {myAcceptance
                  ? "आपने स्कूल के सभी नियम स्वीकार (Accept) कर लिए हैं"
                  : "कृपया सभी नियम पढ़कर डिजिटल सहमति (Rules Acceptance) दें"}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {myAcceptance
                  ? `स्वीकृत दिनांक: ${new Date(myAcceptance.acceptedAt).toLocaleString("en-IN")} • ${myAcceptance.staffName}`
                  : "नियमों के अनुसार +2 दिन बोनस, समय की पाबंदी, ड्रेस कोड और अकाउंट ऑफिस मोबाइल जमा लागू हैं।"}
              </p>
            </div>
          </div>

          {!myAcceptance ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleAcceptRules}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? "सेव हो रहा है..." : "I Read & Accept All Rules"}</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-black shrink-0">
              ✅ Verified Agreement
            </span>
          )}
        </div>
      )}

      {/* Admin Staff Acceptance Summary */}
      {canEdit && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                Staff Digital Agreement Register:{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {acceptedCount}
                  {staffCount > 0 ? ` / ${staffCount}` : ""} Accepted
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                सभी Teachers और Accountants के पोर्टल में ये 13 नियम और +2 Days Bonus पॉलिसी लाइव दिख रही है।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {acceptedCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAcceptancesList((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
              >
                {showAcceptancesList ? "लिस्ट छुपाएं" : `स्वीकृति लिस्ट देखें (${acceptedCount})`}
              </button>
            )}
            <button
              type="button"
              onClick={handleResetToLifeMakerDefaults}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="13 Official Rules को डिफ़ॉल्ट पर रीसेट करें"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default 13 Rules</span>
            </button>
          </div>
        </div>
      )}

      {canEdit && showAcceptancesList && acceptedCount > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-black text-slate-700 dark:text-slate-200">
            डिजिटल सहमति देने वाले शिक्षक / स्टाफ:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.values(acceptances).map((ack) => (
              <div
                key={ack.staffId}
                className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{ack.staffName}</div>
                  <div className="text-[10px] text-slate-500">{ack.role || "Teacher"}</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {new Date(ack.acceptedAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Payroll Automation Parameters Editor */}
      {canEdit && showPolicySettings && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-emerald-500/40 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <h4 className="text-sm font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Payroll Automation &amp; Header Settings (वेतन नियम ऑटोमेशन)
            </h4>
            <button
              type="button"
              onClick={() => handleSaveConfig(config)}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Policy"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Full-Month Attendance Bonus (Days)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={config.policy.fullMonthBonusDays}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: {
                      ...p.policy,
                      fullMonthBonusDays: Math.max(0, Number(e.target.value) || 0),
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-black"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Late Cutoff Days (&gt; X days = 1 day cut)
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={config.policy.lateCutoffDays}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: {
                      ...p.policy,
                      lateCutoffDays: Math.max(1, Number(e.target.value) || 3),
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-black"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Non-Dress Cutoff Days (X days = 1 day cut)
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={config.policy.dressCodeCutoffDays}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: {
                      ...p.policy,
                      dressCodeCutoffDays: Math.max(1, Number(e.target.value) || 3),
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-black"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Salary Disbursement Window
              </label>
              <input
                type="text"
                value={config.policy.salaryPayWindow}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: { ...p.policy, salaryPayWindow: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Run By / Trust Line
              </label>
              <input
                type="text"
                value={config.trustLine}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, trustLine: e.target.value }))
                }
                placeholder="e.g. Ummid Educational & Welfare Trust"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                Notice Period (Months)
              </label>
              <input
                type="number"
                min="0"
                max="6"
                value={config.policy.noticePeriodMonths}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: {
                      ...p.policy,
                      noticePeriodMonths: Math.max(0, Number(e.target.value) || 0),
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-black"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1 text-xs font-bold">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.policy.enableAttendanceBonus}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: { ...p.policy, enableAttendanceBonus: e.target.checked },
                  }))
                }
                className="w-4 h-4 accent-emerald-600"
              />
              <span>Auto +2 Days Full-Month Bonus in Payroll</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.policy.enableLatePenalty}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: { ...p.policy, enableLatePenalty: e.target.checked },
                  }))
                }
                className="w-4 h-4 accent-rose-600"
              />
              <span>Auto Late Cut (&gt;{config.policy.lateCutoffDays} Days)</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.policy.enableDressCodePenalty}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    policy: { ...p.policy, enableDressCodePenalty: e.target.checked },
                  }))
                }
                className="w-4 h-4 accent-amber-600"
              />
              <span>Auto Dress Code Cut ({config.policy.dressCodeCutoffDays} Days)</span>
            </label>
          </div>
        </div>
      )}

      {/* Filter Tabs + Edit Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "ALL", label: `All Rules (${config.rules.length})` },
              { id: "payroll", label: "💰 Salary & Bonus" },
              { id: "attendance", label: "⏰ Attendance" },
              { id: "conduct", label: "🛡️ Conduct & Dress" },
              { id: "welfare", label: "👶 Staff Child Benefit" },
              { id: "documents", label: "📂 Documents" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                categoryFilter === tab.id
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {canEdit && editMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddRuleForm((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Rule</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await handleSaveConfig(config);
                setEditMode(false);
              }}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save All Changes"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Custom Rule Form */}
      {canEdit && showAddRuleForm && (
        <form
          onSubmit={handleAddCustomRule}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-blue-500/40 space-y-3 text-xs"
        >
          <div className="font-black text-blue-600 dark:text-blue-400 text-sm">
            नया स्कूल नियम जोड़ें (Add Rule)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Rule Title (उदा. Exam Duty)"
              value={newRuleForm.title}
              onChange={(e) =>
                setNewRuleForm((p) => ({ ...p, title: e.target.value }))
              }
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold"
            />
            <input
              type="text"
              placeholder="Short Highlight Badge (Optional)"
              value={newRuleForm.highlight}
              onChange={(e) =>
                setNewRuleForm((p) => ({ ...p, highlight: e.target.value }))
              }
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <select
              value={newRuleForm.category}
              onChange={(e) =>
                setNewRuleForm((p) => ({
                  ...p,
                  category: e.target.value as TeacherRuleCategory,
                }))
              }
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
            >
              <option value="conduct">Code of Conduct</option>
              <option value="payroll">Salary &amp; Bonus</option>
              <option value="attendance">Attendance &amp; Time</option>
              <option value="welfare">Staff Child Benefit</option>
              <option value="documents">Documents</option>
            </select>
          </div>
          <textarea
            rows={2}
            required
            placeholder="Full Rule Description..."
            value={newRuleForm.description}
            onChange={(e) =>
              setNewRuleForm((p) => ({ ...p, description: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddRuleForm(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-black cursor-pointer"
            >
              Add Rule
            </button>
          </div>
        </form>
      )}

      {/* Rules List Cards */}
      {loading && activeRules.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          नियम लोड हो रहे हैं...
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeRules.map((rule, idx) => {
            const cat = CATEGORY_BADGE[rule.category] || CATEGORY_BADGE.conduct;
            return (
              <div
                key={rule.id}
                className={`rounded-2xl p-3.5 sm:p-4 border transition flex items-start gap-3 ${
                  rule.enabled === false
                    ? "opacity-55 bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800"
                    : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {rule.order || idx + 1}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  {editMode && canEdit ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={rule.title}
                          onChange={(e) =>
                            handleRuleFieldChange(rule.id, { title: e.target.value })
                          }
                          className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-xs font-black"
                        />
                        <input
                          type="text"
                          value={rule.highlight || ""}
                          placeholder="Badge"
                          onChange={(e) =>
                            handleRuleFieldChange(rule.id, {
                              highlight: e.target.value,
                            })
                          }
                          className="w-40 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={rule.description}
                        onChange={(e) =>
                          handleRuleFieldChange(rule.id, {
                            description: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{rule.icon}</span>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {rule.title}
                        </h4>
                        {rule.highlight && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-[10px] font-black">
                            {rule.highlight}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.cls}`}
                        >
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {rule.description}
                      </p>
                    </>
                  )}
                </div>

                {editMode && canEdit && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleRuleFieldChange(rule.id, {
                          enabled: rule.enabled === false,
                        })
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                        rule.enabled === false
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-600"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {rule.enabled === false ? "OFF" : "ON"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Signature Strip Preview + Tagline */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 text-white p-4 border border-blue-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-blue-100 font-semibold">
          <Award className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            Signature Fields on A4 Printout: Teacher's Signature •{" "}
            {config.requireGuardianSignature ? "Teacher's Guardian Signature • " : ""}
            Principal Signature
          </span>
        </div>
        <span className="text-sm font-black italic text-amber-300">
          "{config.tagline || "Together for a Better Tomorrow..."}"
        </span>
      </div>

      {/* Original Uploaded Poster Lightbox */}
      {showPosterModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-2xl w-full max-h-[92vh] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white">
                Life Maker Public School — Official Rules Poster
              </h4>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto rounded-2xl bg-white p-1">
              <img
                src={OFFICIAL_LIFE_MAKER_RULES_POSTER_URL}
                alt="Life Maker Rules & Regulations for Teachers"
                className="w-full h-auto rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-[80] px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-2xl border border-emerald-400">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
