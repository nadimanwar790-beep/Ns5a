// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  subscribeToAllSchools, saveSchool, updateSchool, generateId, setSchoolLockCode,
  assignSchoolAdminByEmail, checkEmailSchoolAllotment, lockSchool, deleteSchool
} from "../../school-firebase";
import { isSchoolEliteCurriculum, type School, type SchoolSubscription } from "../../school-types";
import { SchoolAdminPanel } from "./SchoolAdminPanel";
import { db, rtdb } from "../../firebase";
import { ref, set } from "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import {
  School as SchoolIcon, Plus, Pause, Play,
  Users, IndianRupee, Settings, X, Zap, Tag, Lock, Eye, EyeOff, Shield, Trash2, Unlock, ArrowLeft,
  CreditCard, CheckCircle, AlertCircle, Clock, ChevronRight, FileText, StickyNote, Calendar, Crown,
  Bell, Sliders, Smartphone, Check, Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  adminUid: string;
  onBack?: () => void;
}

// ── PRICING CONFIG ────────────────────────────────────────────────────────────
const FEATURE_PRICES = { reading: 2000, writing: 1000, pdf: 1000, mcq: 1000 };
const COMBO_PRICE = 4500;       // all-4 combo offer (Pro Plan)
const COMBO_RETAIL = 5000;      // sum of individual prices
const COMBO_SAVING = COMBO_RETAIL - COMBO_PRICE; // ₹500
const LITE_PRICE = 1500;        // Lite plan — student management only

const isCombo = (s: SchoolSubscription) =>
  s.reading && s.writing && s.pdf && s.mcq;

const calcAmount = (s: SchoolSubscription): number => {
  if (s.tier === "lite") return LITE_PRICE;
  if (isCombo(s)) return COMBO_PRICE;
  let total = 0;
  if (s.reading) total += FEATURE_PRICES.reading;
  if (s.writing) total += FEATURE_PRICES.writing;
  if (s.pdf)     total += FEATURE_PRICES.pdf;
  if (s.mcq)     total += FEATURE_PRICES.mcq;
  return total;
};

const COMBO_SUB: SchoolSubscription = {
  reading: true, writing: true, pdf: true, mcq: true,
  monthlyAmount: COMBO_PRICE, status: "active", tier: "full"
};

const defaultSub: SchoolSubscription = {
  reading: true, writing: false, pdf: false, mcq: false,
  monthlyAmount: 2000, status: "active", tier: "full"
};

// ── REUSABLE 3-TIER SUBSCRIPTION EDITOR ─────────────────────────────────────────────
const SubEditor = ({
  value,
  onChange,
  label = "School Management Subscription Plan",
}: {
  value: SchoolSubscription;
  onChange: (s: SchoolSubscription) => void;
  label?: string;
}) => {
  const currentTier = value.tier || (value.maxStudents === 200 ? "starter_200" : value.maxStudents === 500 ? "growth_500" : "enterprise_2000");

  const isEliteActive = Boolean(value.isElite || value.customCurriculumEnabled);
  const selectTier = (tier: "starter_200" | "growth_500" | "enterprise_2000") => {
    const mult = isEliteActive ? 2 : 1;
    if (tier === "starter_200") {
      onChange({
        ...value,
        tier: "starter_200",
        maxStudents: 200,
        maxTeachers: 10,
        monthlyAmount: 999 * mult,
        isElite: isEliteActive,
        customCurriculumEnabled: isEliteActive,
        reading: true,
        writing: true,
        pdf: true,
        mcq: true,
        status: "active"
      });
    } else if (tier === "growth_500") {
      onChange({
        ...value,
        tier: "growth_500",
        maxStudents: 500,
        maxTeachers: 25,
        monthlyAmount: 1999 * mult,
        isElite: isEliteActive,
        customCurriculumEnabled: isEliteActive,
        reading: true,
        writing: true,
        pdf: true,
        mcq: true,
        status: "active"
      });
    } else {
      onChange({
        ...value,
        tier: "enterprise_2000",
        maxStudents: 2000,
        maxTeachers: 9999,
        monthlyAmount: 3999 * mult,
        isElite: isEliteActive,
        customCurriculumEnabled: isEliteActive,
        reading: true,
        writing: true,
        pdf: true,
        mcq: true,
        status: "active"
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3.5 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{label}</h3>
        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
          ₹{(value.monthlyAmount || 999).toLocaleString()}/month
        </span>
      </div>

      {/* 3 Tier Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
        <button
          type="button"
          onClick={() => selectTier("starter_200")}
          className={`py-2 px-1 rounded-lg text-xs font-black transition cursor-pointer text-center ${
            currentTier === "starter_200" || currentTier === "lite"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
        >
          <p className="leading-tight">Tier 1: Starter</p>
          <span className="text-[10px] opacity-90">200 Std • ₹999</span>
        </button>

        <button
          type="button"
          onClick={() => selectTier("growth_500")}
          className={`py-2 px-1 rounded-lg text-xs font-black transition cursor-pointer text-center ${
            currentTier === "growth_500"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
        >
          <p className="leading-tight">Tier 2: Growth</p>
          <span className="text-[10px] opacity-90">500 Std • ₹1,999</span>
        </button>

        <button
          type="button"
          onClick={() => selectTier("enterprise_2000")}
          className={`py-2 px-1 rounded-lg text-xs font-black transition cursor-pointer text-center ${
            currentTier === "enterprise_2000" || currentTier === "full"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
        >
          <p className="leading-tight">Tier 3: Enterprise</p>
          <span className="text-[10px] opacity-90">2000 Std • ₹3,999</span>
        </button>
      </div>

      {/* Tier Details Card */}
      <div className={`p-3.5 rounded-xl border text-xs ${
        currentTier === "starter_200" || currentTier === "lite"
          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
          : currentTier === "growth_500"
          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200"
          : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200"
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-black text-sm">
            {currentTier === "starter_200" || currentTier === "lite"
              ? "📦 Tier 1: Starter Plan (Max 200 Students)"
              : currentTier === "growth_500"
              ? "🚀 Tier 2: Growth Plan (Max 500 Students)"
              : "👑 Tier 3: Enterprise Plan (Max 2000 Students)"}
          </span>
          <span className="font-mono font-bold">
            {currentTier === "starter_200" || currentTier === "lite" ? "₹999 / mo" : currentTier === "growth_500" ? "₹1,999 / mo" : "₹3,999 / mo"}
          </span>
        </div>
        <ul className="space-y-1 text-[11px] list-disc list-inside opacity-90">
          <li><strong>Student Capacity:</strong> {currentTier === "starter_200" || currentTier === "lite" ? "Max 200 Active Students" : currentTier === "growth_500" ? "Max 500 Active Students" : "Max 2000 Active Students"}</li>
          <li><strong>Faculty / Teachers:</strong> {currentTier === "starter_200" || currentTier === "lite" ? "Max 10 Teachers" : currentTier === "growth_500" ? "Max 25 Teachers" : "Unlimited Staff & Teachers"}</li>
          <li><strong>Included Powers:</strong> {currentTier === "starter_200" || currentTier === "lite" ? "Student Management, Fees & Due Slips, Daily Attendance" : currentTier === "growth_500" ? "Everything in Tier 1 + Sub-Admins, ID Cards & Admit Card Hub" : "Everything in Tier 2 + Staff HRM Payroll, Online Admissions & School Website"}</li>
        </ul>
      </div>

      {/* Elite Edition 2x Toggle */}
      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
        value.isElite
          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700"
          : "bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600"
      }`}>
        <div className="flex-1">
          <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <Crown size={14} className="text-amber-500" />
            Elite Edition (2× Price) — Custom Curriculum &amp; Notes
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
            School ko Class 1-12 Notes, Video, Audio, PDF &amp; MCQ Manager aur Custom Study Rooms ka access dega.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextElite = !value.isElite;
            const baseRate = currentTier === "starter_200" || currentTier === "lite" ? 999 : currentTier === "growth_500" ? 1999 : 3999;
            onChange({
              ...value,
              isElite: nextElite,
              customCurriculumEnabled: nextElite,
              monthlyAmount: nextElite ? baseRate * 2 : baseRate
            });
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
            value.isElite
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200"
          }`}
        >
          {value.isElite ? "👑 Elite (2× Active)" : "Standard (1×)"}
        </button>
      </div>
    </div>
  );
};

// ── PLAN ASSIGNER COMPONENT ───────────────────────────────────────────────────
type PlanTier = "starter_200" | "growth_500" | "enterprise_2000";
type PlanDur  = "1_year" | "2_years" | "lifetime" | "monthly" | "weekly" | "3months" | "yearly";

const PLAN_PRICES: Record<PlanTier, Record<PlanDur, number>> = {
  starter_200:     { "1_year": 9999,  "2_years": 17999, lifetime: 34999,  monthly: 999,  weekly: 299, "3months": 2699,  yearly: 9999 },
  growth_500:      { "1_year": 19999, "2_years": 35999, lifetime: 69999,  monthly: 1999, weekly: 599, "3months": 5399,  yearly: 19999 },
  enterprise_2000: { "1_year": 39999, "2_years": 69999, lifetime: 129999, monthly: 3999, weekly: 999, "3months": 10799, yearly: 39999 },
};
const PLAN_SAVINGS: Record<PlanTier, Record<PlanDur, number>> = {
  starter_200:     { "1_year": 1989, "2_years": 5977,  lifetime: 24965, monthly: 0, weekly: 0, "3months": 298,  yearly: 1989 },
  growth_500:      { "1_year": 3989, "2_years": 11977, lifetime: 49965, monthly: 0, weekly: 0, "3months": 598,  yearly: 3989 },
  enterprise_2000: { "1_year": 7989, "2_years": 25977, lifetime: 99965, monthly: 0, weekly: 0, "3months": 1198, yearly: 7989 },
};
const DURATION_DAYS: Record<PlanDur, number> = {
  "1_year": 365,
  "2_years": 730,
  lifetime: 7300, // 20 years permanent
  monthly: 30,
  weekly: 7,
  "3months": 90,
  yearly: 365,
};
const DURATION_LABEL: Record<PlanDur, string> = {
  "1_year": "1st Year Session (1 साल)",
  "2_years": "2 Years (2 साल)",
  lifetime: "Lifetime (लाइफटाइम)",
  monthly: "Monthly (1 माह)",
  weekly: "Weekly",
  "3months": "3 Months",
  yearly: "Yearly",
};

const PlanAssigner: React.FC<{
  school: School;
  onAssigned: (updatedSub: SchoolSubscription) => void;
}> = ({ school, onAssigned }) => {
  const [tier, setTier]       = useState<PlanTier>(() => {
    const st = school?.subscription?.tier;
    if (st === "starter_200" || st === "growth_500" || st === "enterprise_2000") return st;
    return "enterprise_2000";
  });
  const [isElite, setIsElite] = useState<boolean>(() => {
    return Boolean(
      school?.subscription?.isElite ||
      (school as any)?.isElite ||
      school?.subscription?.customCurriculumEnabled ||
      (school as any)?.customCurriculumEnabled
    );
  });
  const [duration, setDur]    = useState<PlanDur>("1_year");
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);

  const rawBasePrice  = PLAN_PRICES[tier][duration] || 0;
  const rawBaseSaving = PLAN_SAVINGS[tier][duration] || 0;
  const price   = isElite ? rawBasePrice * 2 : rawBasePrice;
  const saving_ = isElite ? rawBaseSaving * 2 : rawBaseSaving;

  const computeExpiry = (dur: PlanDur): string => {
    if (dur === "lifetime") {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 25);
      return d.toISOString().split("T")[0];
    }
    const d = new Date();
    d.setDate(d.getDate() + (DURATION_DAYS[dur] || 365));
    return d.toISOString().split("T")[0];
  };

  const handleAssign = async () => {
    setSaving(true);
    setSuccess(false);
    const expiresAt = computeExpiry(duration);
    const maxStudents = tier === "starter_200" ? 200 : tier === "growth_500" ? 500 : 2000;
    const maxTeachers = tier === "starter_200" ? 10 : tier === "growth_500" ? 25 : 9999;
    const baseMonthly = PLAN_PRICES[tier]["monthly"] || 999;
    const monthlyAmount = isElite ? baseMonthly * 2 : baseMonthly;

    const newSub: SchoolSubscription = {
      ...school.subscription,
      tier,
      maxStudents,
      maxTeachers,
      status:        "active",
      isElite,
      customCurriculumEnabled: isElite,
      expiresAt,
      paidUntil:     expiresAt,
      reading:       true,
      writing:       true,
      pdf:           true,
      mcq:           true,
      monthlyAmount,
      planDuration:  duration,
      assignedAt:    new Date().toISOString(),
      lastPaidDate:  new Date().toISOString(),
      lastPaidAmount: price,
      paymentNotes:  isElite ? "Elite Plan (2× Price — Class 1-12 Notes, MCQ, PDF & Video Manager Active)" : "Standard Plan Active",
    };
    await updateSchool(school.id, {
      subscription: newSub,
      isElite,
      customCurriculumEnabled: isElite,
      active: true,
    });
    onAssigned(newSub);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const tierLabel = tier === "starter_200" ? "Basic (200)" : tier === "growth_500" ? "Standard (500)" : "Pro (2000)";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-indigo-500" />
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Plan Assign Karo (Subscription Tier)</h3>
        {school.subscription.expiresAt && (
          <span className="ml-auto text-[10px] text-slate-400">
            Expires: {new Date(school.subscription.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Tier selector */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
        {(["starter_200", "growth_500", "enterprise_2000"] as PlanTier[]).map(t => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`py-2 px-1 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
              tier === t
                ? t === "starter_200"
                  ? "bg-blue-600 text-white shadow"
                  : t === "growth_500"
                  ? "bg-purple-600 text-white shadow"
                  : "bg-amber-500 text-slate-950 shadow"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {t === "starter_200" ? "📦 Basic (200)" : t === "growth_500" ? "🚀 Standard (500)" : "👑 Pro (2000)"}
          </button>
        ))}
      </div>

      {/* Plan description */}
      <div className={`rounded-lg px-3 py-2 text-xs ${
        tier === "enterprise_2000"
          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
          : tier === "growth_500"
          ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
          : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
      }`}>
        {tier === "enterprise_2000"
          ? "👑 Pro Plan (2000 Students): Unlimited Staff • Multi-Admins, Full Payroll HRM, Advance Accounts & Website"
          : tier === "growth_500"
          ? "🚀 Standard Plan (500 Students): 25 Teachers • Sub-Admins, QR ID Cards & Admit Cards"
          : "📦 Basic Plan (200 Students): 10 Teachers • Core Management, Fees & Due Register"}
      </div>

      {/* ── 👑 ELITE PLAN (2× PRICE) EDITION SELECTOR ───────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-200">Plan Edition Chunein:</span>
          {isElite && (
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
              <Crown size={11} /> 2× Price Active
            </span>
          )}
        </div>
        <div className="bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setIsElite(false)}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              !isElite
                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Standard Plan (1×)
          </button>
          <button
            type="button"
            onClick={() => setIsElite(true)}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isElite
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs"
                : "text-amber-600 dark:text-amber-400 hover:text-amber-700"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            👑 Elite Plan (2× Price)
          </button>
        </div>

        {isElite && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-amber-900 dark:text-amber-100">👑 Elite Curriculum Feature Unlocked:</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                School ke pass <strong>Class 1 se 12</strong> tak ke Subject Notes, Coaching MCQs, Video Lectures, PDF Notes add karne ka exclusive manager aur Custom School Study Rooms ka full power active rahega.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Duration selector */}
      <div className="grid grid-cols-2 gap-2">
        {(["1_year", "monthly"] as PlanDur[]).map(d => {
          const rawP = PLAN_PRICES[tier][d] || 0;
          const p = isElite ? rawP * 2 : rawP;
          const rawS = PLAN_SAVINGS[tier][d] || 0;
          const s = isElite ? rawS * 2 : rawS;
          return (
            <button
              key={d}
              onClick={() => setDur(d)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all active:scale-95 cursor-pointer text-center ${
                duration === d
                  ? isElite
                    ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/30"
                    : "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                  : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
              }`}
            >
              <span className={`text-[11px] font-black uppercase ${
                duration === d
                  ? isElite
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}>
                {d === "1_year" ? "📅 " : "🗓️ "}
                {DURATION_LABEL[d]}
              </span>
              <span className={`text-xs font-black ${
                duration === d
                  ? isElite
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-300"
              }`}>
                ₹{p.toLocaleString("en-IN")}
              </span>
              {s > 0 && (
                <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1 rounded font-bold">
                  Save ₹{s.toLocaleString("en-IN")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/60 rounded-xl px-4 py-3">
        <div>
          <p className="text-xs text-slate-400">Plan</p>
          <p className="text-sm font-black text-slate-800 dark:text-white">
            {tierLabel} Plan · {isElite ? "👑 Elite Edition (2×)" : "Standard Plan"} · {DURATION_LABEL[duration]}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Valid till: {computeExpiry(duration)}
          </p>
          <p className={`text-[10px] font-bold mt-1 ${isElite ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
            {isElite ? "👑 Class 1-12 Notes, Video, PDF & MCQ Manager Included" : "Standard Student ERP & School Suite"}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-black ${isElite ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}`}>
            ₹{price.toLocaleString("en-IN")}
          </p>
          {saving_ > 0 && <p className="text-[10px] text-green-600 font-bold">Save ₹{saving_.toLocaleString("en-IN")}</p>}
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2.5 text-green-700 dark:text-green-300 text-sm font-bold">
          <CheckCircle className="w-4 h-4" /> Plan assign ho gaya! ✅
        </div>
      )}

      <button
        onClick={handleAssign}
        disabled={saving}
        className={`w-full py-3.5 disabled:opacity-60 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-md ${
          isElite
            ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/20"
            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
        }`}
      >
        {saving ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : isElite ? (
          <Crown className="w-4 h-4" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {saving ? "Assigning Plan..." : `Assign ${tierLabel} ${isElite ? "👑 Elite Plan (2×)" : "Plan"} (₹${price.toLocaleString("en-IN")})`}
      </button>
    </div>
  );
};

// ── SUBSCRIPTION HELPERS ──────────────────────────────────────────────────────

// Get payment status for a school
function getPaymentStatus(school: School): "overdue" | "due_soon" | "paid" | "no_date" {
  const paidUntil = school.subscription.paidUntil;
  if (!paidUntil) return "no_date";
  const daysLeft = Math.ceil((new Date(paidUntil).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 7) return "due_soon";
  return "paid";
}

function daysLeftLabel(paidUntil?: string): string {
  if (!paidUntil) return "Date not set";
  const days = Math.ceil((new Date(paidUntil).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days <= 7) return `Due in ${days} days`;
  return `Valid till ${new Date(paidUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

// Extend paidUntil by N months from today or from paidUntil (whichever is later)
function extendPaidUntil(current?: string, months = 1): string {
  const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().split("T")[0];
}

// ── SUBSCRIPTION MANAGEMENT PANEL ────────────────────────────────────────────
const SubscriptionHub: React.FC<{ schools: School[]; onRefresh: () => void }> = ({ schools }) => {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [editPaidUntil, setEditPaidUntil] = useState("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "overdue" | "due_soon" | "paid">("all");

  const now = new Date();
  const currentMonth = now.toLocaleString("default", { month: "long", year: "numeric" });

  const overdueSchools  = schools.filter(s => s.active && getPaymentStatus(s) === "overdue");
  const dueSoonSchools  = schools.filter(s => s.active && getPaymentStatus(s) === "due_soon");
  const paidSchools     = schools.filter(s => s.active && getPaymentStatus(s) === "paid");
  const noDateSchools   = schools.filter(s => s.active && getPaymentStatus(s) === "no_date");
  const totalExpected   = schools.filter(s => s.active).reduce((sum, s) => sum + s.subscription.monthlyAmount, 0);
  const totalOverdue    = overdueSchools.reduce((sum, s) => sum + s.subscription.monthlyAmount, 0);

  const sortedSchools = [...schools].filter(s => s.active).sort((a, b) => {
    const order = { overdue: 0, due_soon: 1, no_date: 2, paid: 3 };
    return order[getPaymentStatus(a)] - order[getPaymentStatus(b)];
  });

  const filtered = filter === "all" ? sortedSchools
    : sortedSchools.filter(s => getPaymentStatus(s) === filter);

  const openEdit = (school: School) => {
    setSelectedSchool(school);
    setEditPaidUntil(school.subscription.paidUntil || "");
    setNotes(school.subscription.paymentNotes || "");
    setCustomAmount(String(school.subscription.monthlyAmount));
    setMarkingPaid(null);
  };

  const handleMarkPaid = async (school: School, months = 1) => {
    setMarkingPaid(school.id);
    const newPaidUntil = extendPaidUntil(school.subscription.paidUntil, months);
    const amount = Number(customAmount) || school.subscription.monthlyAmount;
    await updateSchool(school.id, {
      subscription: {
        ...school.subscription,
        paidUntil: newPaidUntil,
        lastPaidDate: new Date().toISOString(),
        lastPaidAmount: amount,
        paymentNotes: notes || school.subscription.paymentNotes,
        status: "active",
        monthlyAmount: amount,
      },
      active: true,
    });
    setMarkingPaid(null);
    setSelectedSchool(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedSchool) return;
    setSaving(true);
    await updateSchool(selectedSchool.id, {
      subscription: {
        ...selectedSchool.subscription,
        paidUntil: editPaidUntil || undefined,
        paymentNotes: notes,
        monthlyAmount: Number(customAmount) || selectedSchool.subscription.monthlyAmount,
      },
    });
    setSaving(false);
    setSelectedSchool(null);
  };

  return (
    <div className="space-y-4">
      {/* Revenue Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm col-span-3 flex gap-4 items-center">
          <div className="flex-1">
            <p className="text-[11px] text-slate-400 font-medium">Monthly Expected</p>
            <p className="text-2xl font-black text-green-600">₹{totalExpected.toLocaleString()}</p>
          </div>
          <div className="flex-1 border-l pl-4 dark:border-slate-600">
            <p className="text-[11px] text-slate-400 font-medium">Overdue</p>
            <p className="text-2xl font-black text-red-500">₹{totalOverdue.toLocaleString()}</p>
            <p className="text-[10px] text-red-400">{overdueSchools.length} schools</p>
          </div>
          <div className="flex-1 border-l pl-4 dark:border-slate-600">
            <p className="text-[11px] text-slate-400 font-medium">Clear</p>
            <p className="text-2xl font-black text-blue-500">{paidSchools.length}</p>
            <p className="text-[10px] text-slate-400">schools paid</p>
          </div>
        </div>
      </div>

      {/* Alert strips */}
      {overdueSchools.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 font-semibold">
            {overdueSchools.length} school{overdueSchools.length > 1 ? "s" : ""} overdue — ₹{totalOverdue.toLocaleString()} pending
          </p>
        </div>
      )}
      {dueSoonSchools.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300 font-semibold">
            {dueSoonSchools.length} school{dueSoonSchools.length > 1 ? "s" : ""} due within 7 days
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["all", "All", schools.filter(s => s.active).length],
          ["overdue", "⚠️ Overdue", overdueSchools.length],
          ["due_soon", "⏰ Due Soon", dueSoonSchools.length],
          ["paid", "✅ Clear", paidSchools.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filter === key
                ? "bg-indigo-600 text-white shadow"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border dark:border-slate-700"
            }`}
          >
            {label} <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === key ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Schools List */}
      {filtered.map(school => {
        const status = getPaymentStatus(school);
        const statusColors = {
          overdue:  { bg: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900", badge: "bg-red-100 text-red-700", icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
          due_soon: { bg: "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900", badge: "bg-amber-100 text-amber-700", icon: <Clock className="w-4 h-4 text-amber-500" /> },
          paid:     { bg: "bg-white dark:bg-slate-800 border-transparent", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
          no_date:  { bg: "bg-white dark:bg-slate-800 border-transparent", badge: "bg-slate-100 text-slate-500", icon: <Calendar className="w-4 h-4 text-slate-400" /> },
        }[status];

        const isExpanded = selectedSchool?.id === school.id;

        return (
          <div key={school.id} className={`rounded-xl border shadow-sm overflow-hidden ${statusColors.bg}`}>
            {/* School row */}
            <button
              onClick={() => isExpanded ? setSelectedSchool(null) : openEdit(school)}
              className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
            >
              <div className="flex-shrink-0">{statusColors.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{school.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{daysLeftLabel(school.subscription.paidUntil)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-slate-700 dark:text-slate-200 text-sm">₹{school.subscription.monthlyAmount.toLocaleString()}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${statusColors.badge}`}>
                  {status === "overdue" ? "OVERDUE" : status === "due_soon" ? "DUE SOON" : status === "paid" ? "CLEAR" : "NO DATE"}
                </span>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>

            {/* Expanded payment panel */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t dark:border-slate-700 space-y-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">

                {/* Last payment info */}
                {school.subscription.lastPaidDate && (
                  <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                    Last paid: <span className="font-semibold text-slate-600 dark:text-slate-300">
                      ₹{school.subscription.lastPaidAmount?.toLocaleString() || school.subscription.monthlyAmount.toLocaleString()}
                    </span> on {new Date(school.subscription.lastPaidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Monthly Amount (₹)</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm font-bold"
                  />
                </div>

                {/* Paid until */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Paid Until Date</label>
                  <input
                    type="date"
                    value={editPaidUntil}
                    onChange={e => setEditPaidUntil(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                  />
                </div>

                {/* Payment notes */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-semibold">Payment Notes</label>
                  <input
                    type="text"
                    placeholder="UPI ID, receipt no., remarks..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkPaid(school, 1)}
                    disabled={markingPaid === school.id}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-black disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {markingPaid === school.id ? "Saving..." : "Mark Paid (+1 Month)"}
                  </button>
                  <button
                    onClick={() => handleMarkPaid(school, 3)}
                    disabled={markingPaid === school.id}
                    className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 active:scale-95 transition-transform"
                  >
                    +3M
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-3 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 active:scale-95 transition-transform"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                </div>

                {/* Subscription plan badge */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {school.subscription.reading && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">📖 Reading</span>}
                  {school.subscription.writing && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">✏️ Writing</span>}
                  {school.subscription.pdf     && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">📄 PDF</span>}
                  {school.subscription.mcq     && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">❓ MCQ</span>}
                  {school.subscription.tier === "lite" && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">📦 Lite</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No schools in this category</p>
        </div>
      )}
    </div>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export const SuperAdminPanel: React.FC<Props> = ({ adminUid, onBack }) => {
  const [schools, setSchools]           = useState<School[]>([]);
  const [view, setView]                 = useState<"dashboard" | "new" | "manage">("dashboard");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [directManageSchool, setDirectManageSchool] = useState<School | null>(null);
  const [saving, setSaving]             = useState(false);
  const [dashTab, setDashTab]           = useState<"schools" | "subscriptions" | "policies">("schools");

  // Notification Gate Bypass Policy (Default: true — "defuot me bypass rahega", managed by Super Admin)
  const [notificationGateBypass, setNotificationGateBypass] = useState<boolean>(() => {
    try {
      const sysRaw = localStorage.getItem('nst_system_settings');
      if (sysRaw) {
        const parsed = JSON.parse(sysRaw);
        if (typeof parsed?.notificationGateBypass === 'boolean') {
          return parsed.notificationGateBypass;
        }
      }
      const direct = localStorage.getItem('nst_notification_gate_bypass');
      if (direct !== null) return direct === 'true';
    } catch (err) {
      console.warn('[SuperAdminPanel] Policy load warning:', err);
    }
    return true; // Default is bypass enabled
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policyFeedback, setPolicyFeedback] = useState<string | null>(null);

  const handleToggleNotificationPolicy = async (newVal: boolean) => {
    setSavingPolicy(true);
    setNotificationGateBypass(newVal);
    try {
      // 1. Direct local storage key
      localStorage.setItem('nst_notification_gate_bypass', String(newVal));
      
      // 2. Sync inside system settings cache
      try {
        const raw = localStorage.getItem('nst_system_settings');
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.notificationGateBypass = newVal;
        localStorage.setItem('nst_system_settings', JSON.stringify(parsed));
      } catch (err) {
        console.warn('[SuperAdminPanel] Settings cache update warning:', err);
      }

      // 3. Sync to RTDB and Firestore
      try {
        if (rtdb) {
          await set(ref(rtdb, 'system_settings/notificationGateBypass'), newVal).catch(() => {});
        }
        if (db) {
          await setDoc(doc(db, 'config', 'system_settings'), { notificationGateBypass: newVal }, { merge: true }).catch(() => {});
        }
      } catch (e) {
        console.warn('Firebase policy sync error:', e);
      }

      // 4. Dispatch event so active app components update immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nst_system_settings_updated', {
          detail: { notificationGateBypass: newVal }
        }));
      }

      setPolicyFeedback(newVal
        ? '✅ बाईपास चालू: छात्र व अभिभावक अब नोटिफिकेशन अनुमति स्किप कर सकते हैं और बाद में ऑन कर सकते हैं।'
        : '🔒 अनिवार्य मोड: बिना नोटिफिकेशन अनुमति दिए कोई यूजर आगे नहीं बढ़ सकेगा।');
      setTimeout(() => setPolicyFeedback(null), 5000);
    } finally {
      setSavingPolicy(false);
    }
  };

  // Lock code state
  const [lockCodeInput, setLockCodeInput]       = useState('');
  const [lockCodeActive, setLockCodeActive]     = useState(false);
  const [showLockCode, setShowLockCode]         = useState(false);
  const [savingLockCode, setSavingLockCode]     = useState(false);

  // Assign school admin state
  const [assignEmail, setAssignEmail]           = useState('');
  const [assigningAdmin, setAssigningAdmin]     = useState(false);
  const [assignResult, setAssignResult]         = useState<{ ok: boolean; msg: string } | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm]       = useState(false);
  const [deleting, setDeleting]                 = useState(false);

  const [form, setForm] = useState({
    name: "", code: "", email: "", adminEmail: "", phone: "", address: ""
  });
  const [sub, setSub] = useState<SchoolSubscription>({ ...defaultSub });

  useEffect(() => {
    const unsub = subscribeToAllSchools(setSchools);
    return unsub;
  }, []);

  const activeSchools   = schools.filter(s => s.active && s.subscription.status === "active");
  const inactiveSchools = schools.filter(s => !s.active || s.subscription.status !== "active");
  const monthlyRevenue  = activeSchools.reduce((sum, s) => sum + (s.subscription.monthlyAmount || 0), 0);
  const comboSchools    = activeSchools.filter(s => isCombo(s.subscription));

  const [createError, setCreateError] = useState<string | null>(null);

  const createSchool = async () => {
    const cleanName = (form.name || "").trim();
    if (!cleanName) {
      setCreateError("Kripya School ka Naam (School Name) enter karein.");
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      const id = generateId();
      const schoolCode = (form.code.trim() || cleanName.slice(0, 6)).toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const cleanEmail = form.email.trim() || `${schoolCode.toLowerCase()}@school.internal`;
      const cleanAdminEmail = (form.adminEmail.trim() || cleanEmail).toLowerCase();

      // Enforce 1 Email = 1 School Rule for Super Admin allotment
      if (form.adminEmail.trim()) {
        const check = await checkEmailSchoolAllotment(cleanAdminEmail);
        if (check.isAllotted) {
          setCreateError(`❌ Yeh Email (${cleanAdminEmail}) pehle se "${check.schoolName}" school ko allot hai! Ek email/ID par sirf 1 hi school allot ho sakta hai.`);
          setSaving(false);
          return;
        }
      }

      const school: School = {
        id,
        name: cleanName,
        code: schoolCode,
        email: cleanEmail,
        adminEmail: cleanAdminEmail,
        phone: form.phone.trim(),
        address: form.address.trim(),
        subscription: { ...sub, monthlyAmount: calcAmount(sub) },
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: adminUid,
        totalStudents: 0,
        totalTeachers: 0,
      };

      // 1. Instantly update UI (0ms) so user is never blocked
      setSchools(prev => [school, ...prev.filter(s => s.id !== school.id)]);
      setForm({ name: "", code: "", email: "", adminEmail: "", phone: "", address: "" });
      setSub({ ...defaultSub });
      setView("dashboard");

      // 2. Save school in DB
      await saveSchool(school);

      // 3. Automatically grant Admin power to cleanAdminEmail!
      if (cleanAdminEmail) {
        assignSchoolAdminByEmail(school.id, cleanAdminEmail).catch(e => {
          console.warn("[SuperAdminPanel] auto assign school admin notice:", e);
        });
      }
    } catch (e: any) {
      setCreateError(e?.message || "School create karne mein error aaya. Dobara try karo.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSchoolStatus = async (school: School) => {
    await updateSchool(school.id, {
      active: !school.active,
      subscription: { ...school.subscription, status: school.active ? "suspended" : "active" },
    });
  };

  const openManage = (school: School) => {
    setSelectedSchool(school);
    setLockCodeInput(school.lockCode || '');
    setLockCodeActive(school.lockCodeActive ?? false);
    setShowLockCode(false);
    setView("manage");
  };

  const saveLockCode = async () => {
    if (!selectedSchool) return;
    setSavingLockCode(true);
    await setSchoolLockCode(selectedSchool.id, lockCodeInput.trim(), lockCodeActive);
    setSelectedSchool({ ...selectedSchool, lockCode: lockCodeInput.trim(), lockCodeActive });
    setSavingLockCode(false);
  };

  const handleAssignAdmin = async () => {
    if (!selectedSchool || !assignEmail.trim()) return;
    const cleanEmail = assignEmail.trim().toLowerCase();
    setAssigningAdmin(true);
    setAssignResult(null);

    // Strict 1 Email / ID = 1 School Rule Check
    const check = await checkEmailSchoolAllotment(cleanEmail, selectedSchool.id);
    if (check.isAllotted) {
      setAssignResult({
        ok: false,
        msg: `❌ Yeh Email (${cleanEmail}) pehle se "${check.schoolName}" school ko allot hai! Ek email/ID par sirf 1 hi school allot ho sakta hai.`
      });
      setAssigningAdmin(false);
      return;
    }

    try {
      const profile = await assignSchoolAdminByEmail(selectedSchool.id, cleanEmail);
      setAssignResult({ ok: true, msg: `✅ ${profile.name} (${profile.email}) ab is school ka admin hai!` });
      setSelectedSchool(prev => prev ? ({ ...prev, adminEmail: cleanEmail }) : null);
      setSchools(prev => prev.map(s => s.id === selectedSchool.id ? { ...s, adminEmail: cleanEmail } : s));
      setAssignEmail('');
    } catch (e: any) {
      setAssignResult({ ok: false, msg: `❌ ${e.message || 'Error aaya, dobara try karo.'}` });
    }
    setAssigningAdmin(false);
  };

  const updateSubscription = async (school: School, newSub: SchoolSubscription) => {
    const isElite = Boolean(newSub.isElite || newSub.customCurriculumEnabled);
    const updated = {
      ...newSub,
      isElite,
      customCurriculumEnabled: isElite,
      monthlyAmount: calcAmount(newSub)
    };
    await updateSchool(school.id, {
      subscription: updated,
      isElite,
      customCurriculumEnabled: isElite,
    });
    setSelectedSchool({
      ...school,
      subscription: updated,
      isElite,
      customCurriculumEnabled: isElite,
    });
  };

  const handleToggleLock = async () => {
    if (!selectedSchool) return;
    const newLocked = !selectedSchool.locked;
    await lockSchool(selectedSchool.id, newLocked);
    setSelectedSchool({ ...selectedSchool, locked: newLocked });
  };

  const handleDelete = async () => {
    if (!selectedSchool) return;
    const targetId = selectedSchool.id;
    setDeleting(true);
    await deleteSchool(targetId);
    setSchools(prev => prev.filter(s => s.id !== targetId));
    setDeleting(false);
    setDeleteConfirm(false);
    setView("dashboard");
    setSelectedSchool(null);
  };

  // ── DIRECT SCHOOL ADMIN ACCESS ──
  if (directManageSchool) {
    return (
      <SchoolAdminPanel
        schoolId={directManageSchool.id}
        adminUid={adminUid}
        onBack={() => setDirectManageSchool(null)}
      />
    );
  }

  // ── NEW SCHOOL FORM ──────────────────────────────────────────────────────
  if (view === "new") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("dashboard")} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
          <h2 className="flex-1 font-bold text-slate-800 dark:text-white">Add New School</h2>
          <button
            onClick={createSchool}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {createError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 font-medium">
              ❌ {createError}
            </div>
          )}
          {/* School Details */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">School Details</h3>
            {([
              ["name",       "School Name *",                   "text"],
              ["code",       "School Code (e.g. DPS_01 / auto)", "text"],
              ["email",      "School Email (optional)",          "email"],
              ["adminEmail", "Admin Email (optional)",           "email"],
              ["phone",      "Phone Number",                     "tel"],
              ["address",    "Address",                          "text"],
            ] as const).map(([k, lbl, t]) => (
              <div key={k}>
                <label className="text-xs text-slate-500 mb-1 block">{lbl}</label>
                <input
                  type={t}
                  value={(form as any)[k]}
                  onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm"
                />
              </div>
            ))}
          </div>

          <SubEditor
            value={sub}
            onChange={s => setSub({ ...s, monthlyAmount: calcAmount(s) })}
          />

          <button
            onClick={createSchool}
            disabled={saving || !form.name.trim()}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-base font-bold shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            {saving ? "School Create Ho Raha Hai..." : "🏫 Create & Save School Now"}
          </button>
        </div>
      </div>
    );
  }

  // ── MANAGE SCHOOL ────────────────────────────────────────────────────────
  if (view === "manage" && selectedSchool) {
    const s = selectedSchool;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 flex items-center gap-2">
          <button onClick={() => { setView("dashboard"); setDeleteConfirm(false); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
          <h2 className="flex-1 font-bold text-slate-800 dark:text-white truncate">{s.name}</h2>
          {s.locked && (
            <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
          <button
            onClick={() => toggleSchoolStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${s.active ? "bg-red-100 text-red-700 dark:bg-red-900/40" : "bg-green-100 text-green-700 dark:bg-green-900/40"}`}
          >
            {s.active ? <><Pause className="w-3.5 h-3.5" /> Suspend</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
          </button>
        </div>
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {/* School Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">School Info</h3>
            <div className="space-y-2 text-sm">
              {[["Email", s.email], ["Admin Email", s.adminEmail], ["Code", s.code]].map(([lbl, val]) => (
                <div key={lbl} className="flex justify-between">
                  <span className="text-slate-400">{lbl}</span>
                  <span className="text-slate-700 dark:text-slate-200 font-mono text-xs">{val}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`font-medium ${s.active ? "text-green-500" : "text-red-400"}`}>{s.subscription.status}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400">Edition</span>
                {isSchoolEliteCurriculum(s) ? (
                  <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    <Crown size={12} className="text-amber-500" /> 👑 Elite Plan (Class 1-12 Notes Active)
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300 font-semibold text-xs">
                    Standard Plan (Core ERP)
                  </span>
                )}
              </div>
            </div>
          </div>

          <PlanAssigner
            school={s}
            onAssigned={newSub => setSelectedSchool({ ...s, subscription: newSub })}
          />

          <SubEditor
            value={s.subscription}
            onChange={newSub => updateSubscription(s, newSub)}
            label="Advanced: Manual Override"
          />

          {/* ── ASSIGN SCHOOL ADMIN ──────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">School Admin Assign Karo</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 px-3 py-1.5 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Strict Rule: 1 Email / ID = Sirf 1 School Allot Hoga</span>
            </div>
            <p className="text-xs text-slate-400">
              Jis IIC user ko is school ka admin banana hai, uska email enter karo. Ek email par sirf 1 hi school allot ho sakta hai.
            </p>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Admin ka Email</label>
              <input
                type="email"
                placeholder="schooladmin@example.com"
                value={assignEmail}
                onChange={e => { setAssignEmail(e.target.value); setAssignResult(null); }}
                className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm"
              />
            </div>
            {assignResult && (
              <div className={`text-xs px-3 py-2 rounded-lg font-medium ${assignResult.ok ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                {assignResult.msg}
              </div>
            )}
            <button
              onClick={handleAssignAdmin}
              disabled={assigningAdmin || !assignEmail.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {assigningAdmin ? 'Searching...' : '👤 School Admin Banao'}
            </button>
          </div>

          {/* Lock Code Management */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">Lock Code</h3>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${lockCodeActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {lockCodeActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Jab active hoga, students ko join karne ke liye yeh code enter karna padega.</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lockCodeActive}
                onChange={e => setLockCodeActive(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">Lock Code Enable Karo</span>
            </label>

            <div className="relative">
              <label className="text-xs text-slate-500 mb-1 block">Lock Code</label>
              <input
                type={showLockCode ? "text" : "password"}
                placeholder="School ka secret code"
                value={lockCodeInput}
                onChange={e => setLockCodeInput(e.target.value)}
                className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowLockCode(!showLockCode)}
                className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
              >
                {showLockCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={saveLockCode}
              disabled={savingLockCode}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold disabled:opacity-60"
            >
              {savingLockCode ? 'Saving...' : 'Lock Code Save Karo'}
            </button>
          </div>

          {/* ── DANGER ZONE ────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3 border border-red-200 dark:border-red-900/50">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
            </div>

            {/* Lock / Unlock school */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {s.locked ? '🔒 School Locked' : '🔓 School Unlocked'}
                </p>
                <p className="text-xs text-slate-400">
                  {s.locked
                    ? 'Students is school mein login nahi kar sakte.'
                    : 'Students is school mein freely login kar sakte hain.'}
                </p>
              </div>
              <button
                onClick={handleToggleLock}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${s.locked
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300'}`}
              >
                {s.locked ? <><Unlock className="w-3.5 h-3.5" /> Unlock</> : <><Lock className="w-3.5 h-3.5" /> Lock</>}
              </button>
            </div>

            {/* Delete school */}
            <div className="pt-2 border-t dark:border-slate-700">
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> School Delete Karo
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">
                    ⚠️ Yeh action permanent hai! School ka saara data delete ho jayega.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-60"
                    >
                      {deleting ? 'Deleting...' : 'Haan, Delete Karo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-4 py-5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black mb-3 shadow-lg shadow-amber-400/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-1 ring-amber-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← NSTA Master Admin Console Par Wapas Jayein</span>
          </button>
        )}
        <p className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-1">Super Admin</p>
        <h1 className="text-2xl font-bold text-white">IIC×NSTA Control Panel</h1>
        <p className="text-slate-400 text-sm mt-1">Manage all schools in the ecosystem</p>
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {/* Revenue cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm col-span-2 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <IndianRupee className="w-4 h-4 text-green-500" />
                <span className="text-xs text-slate-500">Monthly Revenue</span>
              </div>
              <p className="text-3xl font-bold text-green-600">₹{monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">{activeSchools.length} active schools</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">Combo schools</span>
              </div>
              <p className="text-2xl font-bold text-amber-500">{comboSchools.length}</p>
              <p className="text-xs text-slate-400">₹{(comboSchools.length * COMBO_PRICE).toLocaleString()}/mo</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total Schools</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{schools.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-500">{activeSchools.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Inactive/Suspended</p>
            <p className="text-2xl font-bold text-red-400">{inactiveSchools.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total Students</p>
            <p className="text-2xl font-bold text-blue-500">{schools.reduce((s, sc) => s + (sc.totalStudents || 0), 0)}</p>
          </div>
        </div>

        {/* Combo offer info strip */}
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
          <Tag className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-bold text-amber-700 dark:text-amber-300">Combo Offer: </span>
            <span className="text-amber-600 dark:text-amber-400">All 4 features @ ₹{COMBO_PRICE}/mo</span>
            <span className="text-xs text-slate-400 ml-2">(Save ₹{COMBO_SAVING} vs individual)</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <button
            onClick={() => setDashTab("schools")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
              dashTab === "schools" ? "bg-blue-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            <SchoolIcon className="w-4 h-4" /> Schools
          </button>
          <button
            onClick={() => setDashTab("subscriptions")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all relative ${
              dashTab === "subscriptions" ? "bg-indigo-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Subscriptions
            {schools.filter(s => s.active && (getPaymentStatus(s) === "overdue" || getPaymentStatus(s) === "due_soon")).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {schools.filter(s => s.active && (getPaymentStatus(s) === "overdue" || getPaymentStatus(s) === "due_soon")).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setDashTab("policies")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all relative ${
              dashTab === "policies" ? "bg-amber-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            <Bell className="w-4 h-4" /> नोटिफिकेशन नीति
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${notificationGateBypass ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {notificationGateBypass ? "Bypass ON" : "Lock"}
            </span>
          </button>
        </div>

        {/* Policies & Notification Bypass Tab */}
        {dashTab === "policies" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Feedback notification toast if saved */}
            {policyFeedback && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{policyFeedback}</span>
              </div>
            )}

            {/* Notification Gate Bypass Policy Management Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-start gap-3.5 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Bell className="w-6 h-6 animate-[wiggle_1s_ease-in-out_infinite]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      नोटिफिकेशन परमिशन गेट बाईपास नियंत्रण (Bypass Control)
                    </h3>
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                      notificationGateBypass
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                        : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700"
                    }`}>
                      {notificationGateBypass ? "🟢 बाईपास चालू (Bypass Active - Default)" : "🔒 अनिवार्य लॉक (Mandatory Mode)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    यह तय करें कि छात्र या अभिभावक जब ऐप खोलें तो क्या वे नोटिफिकेशन अनुमति को <strong>स्किप (Skip)</strong> करके बाद में चालू कर सकते हैं, या इसे चालू करना 100% अनिवार्य रहेगा।
                  </p>
                </div>
              </div>

              {/* Mode Selection Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
                {/* Option 1: Bypass Mode (Default) */}
                <div
                  onClick={() => !savingPolicy && handleToggleNotificationPolicy(true)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    notificationGateBypass
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-md"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>🟢 बाईपास चालू (अनुशंसित / डिफ़ॉल्ट)</span>
                    </span>
                    <input
                      type="radio"
                      name="notifBypassRadio"
                      checked={notificationGateBypass}
                      onChange={() => handleToggleNotificationPolicy(true)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong>डिफ़ॉल्ट मोड:</strong> यूज़र को नोटिफिकेशन का प्रॉम्प्ट दिखेगा, लेकिन वे &quot;बाद में चालू करेंगे / अभी छोड़ें&quot; दबाकर सीधे ऐप उपयोग कर सकेंगे। वे बाद में सेटिंग्स या ऊपर घंटी आइकॉन से कभी भी नोटिफिकेशन चालू कर सकेंगे।
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> यूज़र फ्रेंडली • कोई रुकावट नहीं
                  </div>
                </div>

                {/* Option 2: Mandatory Lock Mode */}
                <div
                  onClick={() => !savingPolicy && handleToggleNotificationPolicy(false)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    !notificationGateBypass
                      ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/20 shadow-md"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>🔒 अनिवार्य लॉक (Strict Mandatory)</span>
                    </span>
                    <input
                      type="radio"
                      name="notifBypassRadio"
                      checked={!notificationGateBypass}
                      onChange={() => handleToggleNotificationPolicy(false)}
                      className="w-4 h-4 accent-rose-600"
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong>कठोर मोड:</strong> स्किप करने का विकल्प छिपा दिया जाएगा। जब तक छात्र/अभिभावक फोन में नोटिफिकेशन अनुमति &quot;Allow&quot; नहीं करेंगे, तब तक वे ऐप के किसी भी पेज को नहीं खोल सकेंगे।
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    <Lock className="w-3.5 h-3.5" /> 100% सूचना डिलीवरी अनिवार्य
                  </div>
                </div>
              </div>

              {/* Action Buttons for Super Admin */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => handleToggleNotificationPolicy(!notificationGateBypass)}
                  disabled={savingPolicy}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    notificationGateBypass
                      ? "bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{notificationGateBypass ? "अनिवार्य मोड में बदलें (Set Mandatory)" : "डिफ़ॉल्ट बाईपास चालू करें (Enable Bypass)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-popup-settings-guide'));
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>👁️ परमिशन गेट का लाइव टेस्ट/प्रीव्यू देखें</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('nst_notif_gate_skipped');
                    sessionStorage.removeItem('nst_notif_gate_skipped');
                    toast.success("स्किप स्थिति रीसेट कर दी गई है! नए यूज़र की तरह परमिशन गेट देखने के लिए पेज रीफ्रेश करें।");
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <span>🔄 टेस्ट हेतु स्किप रीसेट करें</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {dashTab === "subscriptions" && (
          <SubscriptionHub schools={schools} onRefresh={() => {}} />
        )}

        {/* Schools Tab */}
        {dashTab === "schools" && <>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-white">All Schools</h3>
          <button onClick={() => setView("new")}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add School
          </button>
        </div>

        {schools.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <SchoolIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No schools yet. Add your first school.</p>
          </div>
        )}

        {schools.map(school => {
          const combo = isCombo(school.subscription);
          return (
            <div key={school.id} className={`rounded-xl p-4 shadow-sm border ${combo ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-slate-800 border-transparent"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${combo ? "bg-amber-100 dark:bg-amber-900/40" : "bg-blue-100 dark:bg-blue-900/40"}`}>
                  {combo ? <Zap className="w-5 h-5 text-amber-500" /> : <SchoolIcon className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800 dark:text-white truncate">{school.name}</p>
                    {combo && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" /> COMBO
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${school.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {school.active ? "Active" : "Suspended"}
                    </span>
                    {school.locked && (
                      <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{school.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {school.subscription.reading && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Reading</span>}
                    {school.subscription.writing && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Writing</span>}
                    {school.subscription.pdf     && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">PDF</span>}
                    {school.subscription.mcq     && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">MCQ</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${combo ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      ₹{school.subscription.monthlyAmount.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setDirectManageSchool(school)}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    title="School Admin Panel Kholein"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>Manage</span>
                  </button>
                  <button onClick={() => openManage(school)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                    <Settings className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </>}
      </div>
    </div>
  );
};

export default SuperAdminPanel;
