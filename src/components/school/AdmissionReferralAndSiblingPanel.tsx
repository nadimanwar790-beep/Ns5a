import React from "react";
import { Users, Award, Check, Percent, IndianRupee } from "lucide-react";
import type { ReferralCommissionDuration, ReferralCommissionScope, SchoolStudent } from "../../school-types";
import { formatReferralDurationLabel, type ReferrerOption, type SiblingDetectionResult } from "../../utils/schoolReferralSiblingEngine";

interface Props {
  siblingDetection: SiblingDetectionResult;
  manualSiblingMarked: boolean;
  onManualSiblingChange: (marked: boolean) => void;
  siblingDiscountPct: number;
  siblingAdmissionDiscountAmt: number;
  applyMonthlySiblingDiscount: boolean;
  baseMonthlyTuition: number;
  eligibleAdmissionGrossExclBus: number;
  onApplySiblingPresetPct: (pct: number) => void;
  onCustomAdmissionDiscountChange: (amt: number) => void;
  onToggleMonthlySiblingDiscount: (enabled: boolean) => void;

  // Teacher Referral (10% Commission)
  referrers: ReferrerOption[];
  referredByTeacherId: string;
  customTeacherName: string;
  commissionPct: number;
  commissionScope: ReferralCommissionScope;
  commissionDuration?: ReferralCommissionDuration;
  eligiblePaidNowExclBus: number;
  eligibleDueExclBus: number;
  onSelectReferrer: (teacherId: string) => void;
  onCustomTeacherNameChange: (name: string) => void;
  onCommissionPctChange: (pct: number) => void;
  onCommissionScopeChange: (scope: ReferralCommissionScope) => void;
  onCommissionDurationChange?: (duration: ReferralCommissionDuration) => void;
}

const SIBLING_DISCOUNT_PRESETS = [10, 15, 20, 25, 50];

export const AdmissionReferralAndSiblingPanel: React.FC<Props> = ({
  siblingDetection,
  manualSiblingMarked,
  onManualSiblingChange,
  siblingDiscountPct,
  siblingAdmissionDiscountAmt,
  applyMonthlySiblingDiscount,
  baseMonthlyTuition,
  eligibleAdmissionGrossExclBus,
  onApplySiblingPresetPct,
  onCustomAdmissionDiscountChange,
  onToggleMonthlySiblingDiscount,
  referrers,
  referredByTeacherId,
  customTeacherName,
  commissionPct,
  commissionScope,
  commissionDuration = "1_year",
  eligiblePaidNowExclBus,
  eligibleDueExclBus,
  onSelectReferrer,
  onCustomTeacherNameChange,
  onCommissionPctChange,
  onCommissionScopeChange,
  onCommissionDurationChange,
}) => {
  const isSameFamilyActive = siblingDetection.isExactFamily || manualSiblingMarked;
  const matchedSiblings: SchoolStudent[] =
    siblingDetection.exactMatches.length > 0
      ? siblingDetection.exactMatches
      : siblingDetection.partialMatches;

  const monthlyDiscountPreview =
    isSameFamilyActive && applyMonthlySiblingDiscount && siblingDiscountPct > 0
      ? Math.round((baseMonthlyTuition * siblingDiscountPct) / 100)
      : 0;

  const discountedMonthlyTuition = Math.max(0, baseMonthlyTuition - monthlyDiscountPreview);

  const selectedReferrer = referrers.find((r) => r.id === referredByTeacherId);
  const hasActiveReferrer =
    Boolean(referredByTeacherId && referredByTeacherId !== "__custom__") ||
    (referredByTeacherId === "__custom__" && Boolean(customTeacherName.trim()));

  const unlockedCommissionNow = hasActiveReferrer
    ? Math.round((eligiblePaidNowExclBus * commissionPct) / 100)
    : 0;
  const pendingCommissionLater = hasActiveReferrer
    ? Math.round((eligibleDueExclBus * commissionPct) / 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
      {/* 1. SAME FAMILY / SIBLING AUTO-DETECTION & DISCOUNT */}
      <div
        className={`rounded-2xl p-4 border transition-colors space-y-3 ${
          isSameFamilyActive
            ? "bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700/80"
            : siblingDetection.partialMatches.length > 0
            ? "bg-sky-50/70 dark:bg-sky-950/25 border-sky-300 dark:border-sky-800"
            : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
        }`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isSameFamilyActive
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                एक ही घर के बच्चे (Same Family / Sibling Discount)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Same Father + Mother + WhatsApp होने पर अपने-आप पहचानता है
              </p>
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none shrink-0 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={isSameFamilyActive}
              onChange={(e) => onManualSiblingChange(e.target.checked)}
              className="w-3.5 h-3.5 accent-amber-600"
            />
            <span>Same Family Mark</span>
          </label>
        </div>

        {/* Auto-detected Exact Match Banner */}
        {siblingDetection.isExactFamily && (
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
              <span>
                Same Family Match Confirmed ({siblingDetection.childNumber}
                {siblingDetection.childNumber === 2 ? "nd" : siblingDetection.childNumber === 3 ? "rd" : "th"} Child)
              </span>
              <span className="tabular-nums text-[11px] text-amber-700 dark:text-amber-400">
                {siblingDetection.exactMatches.length} Sibling Enrolled
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {siblingDetection.exactMatches.map((sib) => (
                <div key={sib.id} className="py-1 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="font-semibold truncate">
                    {sib.name} · {sib.className || "Class"} (Roll #{sib.rollNo})
                  </span>
                  <span className="font-mono tabular-nums text-slate-500 shrink-0 ml-2">
                    ₹{Number(sib.monthlyFee || 0).toLocaleString("en-IN")}/mo
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Partial / Possible Sibling Suggestion */}
        {!siblingDetection.isExactFamily && siblingDetection.partialMatches.length > 0 && (
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
                Possible Same Family Found ({siblingDetection.partialMatches.length} Match)
              </span>
              {!manualSiblingMarked && (
                <button
                  type="button"
                  onClick={() => onManualSiblingChange(true)}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold cursor-pointer"
                >
                  Confirm Same Family
                </button>
              )}
            </div>
            {siblingDetection.partialMatches.slice(0, 2).map((sib) => (
              <div key={sib.id} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span className="truncate">
                  {sib.name} · {sib.className || "Class"} · Father: {sib.fatherName || "-"}
                </span>
                <span className="font-mono tabular-nums text-slate-500 ml-2">{sib.whatsappNo || sib.phone || ""}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sibling Discount Controls (Visible when auto-matched OR manually marked) */}
        {isSameFamilyActive ? (
          <div className="space-y-2.5 pt-1 border-t border-amber-200/70 dark:border-amber-800/50">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Select Family / Sibling Discount:</span>
                <span className="tabular-nums text-slate-500">
                  Eligible Fee: ₹{eligibleAdmissionGrossExclBus.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SIBLING_DISCOUNT_PRESETS.map((pct) => {
                  const active = siblingDiscountPct === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onApplySiblingPresetPct(pct)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums transition cursor-pointer ${
                        active
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                      }`}
                    >
                      {pct}% OFF
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onApplySiblingPresetPct(0)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Admission Fee Discount (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="number"
                    min={0}
                    value={siblingAdmissionDiscountAmt}
                    onChange={(e) => onCustomAdmissionDiscountChange(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyMonthlySiblingDiscount}
                  onChange={(e) => onToggleMonthlySiblingDiscount(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-600"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    Monthly Fee में भी छूट दें
                  </span>
                  <span className="text-slate-500 tabular-nums">
                    {applyMonthlySiblingDiscount && siblingDiscountPct > 0
                      ? `₹${baseMonthlyTuition} → ₹${discountedMonthlyTuition}/माह`
                      : `Base ₹${baseMonthlyTuition}/माह`}
                  </span>
                </div>
              </label>
            </div>

            {matchedSiblings.length > 0 && (
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                रसीद और छात्र प्रोफाइल पर Sibling Family लिंक सेव रहेगा।
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            पिता का नाम, माता का नाम और WhatsApp नंबर भरते ही सिस्टम पहले से पढ़ रहे भाई/बहन की जाँच करेगा।
          </p>
        )}
      </div>

      {/* 2. TEACHER REFERRAL & 10% COMMISSION */}
      <div
        className={`rounded-2xl p-4 border transition-colors space-y-3 ${
          hasActiveReferrer
            ? "bg-teal-50/70 dark:bg-teal-950/25 border-teal-300 dark:border-teal-700/80"
            : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
        }`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                hasActiveReferrer
                  ? "bg-teal-500/20 text-teal-700 dark:text-teal-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Teacher Student Referral ({commissionPct}% Commission)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                जो टीचर छात्र लाएगा उसे जमा हुई नेट फीस (बिना बस शुल्क) का हिस्सा मिलेगा
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Referred By Teacher / Staff (किस टीचर के ज़रिए आया?)
            </label>
            <select
              value={referredByTeacherId}
              onChange={(e) => onSelectReferrer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="">-- Direct Walk-in / कोई टीचर रेफरल नहीं --</option>
              {referrers.map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {ref.name} ({ref.designation})
                </option>
              ))}
              <option value="__custom__">+ अन्य टीचर का नाम लिखें (Enter Teacher Name)</option>
            </select>
          </div>

          {referredByTeacherId === "__custom__" && (
            <div>
              <input
                type="text"
                value={customTeacherName}
                onChange={(e) => onCustomTeacherNameChange(e.target.value)}
                placeholder="टीचर का पूरा नाम लिखें (e.g. Rajesh Verma)"
                className="w-full px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          )}

          {hasActiveReferrer && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Commission Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={commissionPct}
                      onChange={(e) => onCommissionPctChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-full pl-3 pr-7 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    कमीशन नियम (Scope)
                  </label>
                  <select
                    value={commissionScope}
                    onChange={(e) => onCommissionScopeChange(e.target.value as ReferralCommissionScope)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="all_fees">हर जमा ट्यूशन/स्कूल फीस पर</option>
                    <option value="admission_only">सिर्फ Admission फीस पर</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    अवधि (Duration Cap)
                  </label>
                  {onCommissionDurationChange ? (
                    <select
                      value={commissionDuration}
                      onChange={(e) => onCommissionDurationChange(e.target.value as ReferralCommissionDuration)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="1_year">1st Year Cap (1 साल)</option>
                      <option value="2_years">2 Years Cap (2 साल)</option>
                      <option value="lifetime">Lifetime (जब तक पढ़े)</option>
                    </select>
                  ) : (
                    <div className="px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-white/80 dark:bg-slate-900 text-[11px] font-bold text-teal-800 dark:text-teal-300 truncate">
                      {formatReferralDurationLabel(commissionDuration)}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    {selectedReferrer?.name || customTeacherName.trim()} का कमीशन ({commissionPct}%):
                  </span>
                  <span className="font-bold text-teal-800 dark:text-teal-300 tabular-nums flex items-center gap-1 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-teal-600" />
                    अभी अनलॉक (Paid पर): ₹{unlockedCommissionNow.toLocaleString("en-IN")}
                  </span>
                </div>
                {pendingCommissionLater > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">बकाया जमा होने पर</span>
                    <span className="text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      +₹{pendingCommissionLater.toLocaleString("en-IN")} Pending
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
