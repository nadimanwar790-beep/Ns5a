// @ts-nocheck
import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, MessageCircle, Users, BookOpen, Star, Crown, Lock, Shield, Sparkles } from "lucide-react";
import type { School, SubscriptionTier } from "../../school-types";
import { ADMIN_WHATSAPP_NUMBER } from "../../constants";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";

export { ADMIN_WHATSAPP_NUMBER };

type Duration = "1_year" | "monthly";

interface TierPlanConfig {
  key: SubscriptionTier;
  name: string;
  badge: string;
  studentCapText: string;
  theme: {
    border: string;
    badgeBg: string;
    btnBg: string;
    iconBg: string;
    glow: string;
  };
  features: { text: string; included: boolean }[];
  prices: {
    "1_year": { price: number; mrp: number; save: number };
    monthly: { price: number; mrp?: number };
  };
}

const STORE_TIERS: TierPlanConfig[] = [
  {
    key: "starter_200",
    name: "Basic Plan",
    badge: "200 Students",
    studentCapText: "Upto 200 Students • 10 Teachers",
    theme: {
      border: "border-blue-400 dark:border-blue-500",
      badgeBg: "bg-blue-600 text-white",
      btnBg: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
      iconBg: "bg-blue-600",
      glow: "bg-blue-50 dark:bg-blue-900/20",
    },
    prices: {
      "1_year": { price: 9999, mrp: 11999, save: 1989 },
      monthly: { price: 999 },
    },
    features: [
      { text: "Upto 200 Students Records", included: true },
      { text: "Upto 10 Teachers & Staff Accounts", included: true },
      { text: "1 Master School Admin Account", included: true },
      { text: "Daily Class Attendance Tracking", included: true },
      { text: "Basic Fee Collection & Due Register", included: true },
      { text: "Official Fee Receipts & 4-in-1 Slips", included: true },
      { text: "Manual WhatsApp Fee & Due Share", included: true },
      { text: "Online Admissions: Basic Form", included: true },
      { text: "Exam Marks Entry & Progress Reports", included: true },
      { text: "Multi/Sub-Admins Delegation (Growth / Pro Only)", included: false },
      { text: "Live QR ID Cards & Admit Cards (Growth / Pro Only)", included: false },
      { text: "Staff HRM & Salary Slips (Growth / Pro Only)", included: false },
    ],
  },
  {
    key: "growth_500",
    name: "Standard Plan",
    badge: "500 Students",
    studentCapText: "Upto 500 Students • 25 Teachers",
    theme: {
      border: "border-purple-400 dark:border-purple-500",
      badgeBg: "bg-purple-600 text-white",
      btnBg: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800",
      iconBg: "bg-purple-600",
      glow: "bg-purple-50 dark:bg-purple-900/20",
    },
    prices: {
      "1_year": { price: 19999, mrp: 23999, save: 3989 },
      monthly: { price: 1999 },
    },
    features: [
      { text: "Upto 500 Students Records", included: true },
      { text: "Upto 25 Teachers & Staff Accounts", included: true },
      { text: "Up to 3 Sub-Admins (Accountant, Vice Principal)", included: true },
      { text: "Full Monthly Dues + Pending Register", included: true },
      { text: "1-Click WhatsApp Dues & Fee Receipts", included: true },
      { text: "Attendance + SMS/WhatsApp Alert Link", included: true },
      { text: "Live QR Student ID Cards (Bulk Print)", included: true },
      { text: "Exam Admit Cards Hub & Roll Numbers", included: true },
      { text: "Online Admission Form + Approval Workflow", included: true },
      { text: "Staff Salary Register (Basic)", included: true },
      { text: "Sibling Auto-Discount & Teacher Referral", included: true },
      { text: "Standard School Website with Photo Gallery", included: true },
      { text: "Full Payroll with Deductions & Slips (Pro Only)", included: false },
    ],
  },
  {
    key: "enterprise_2000",
    name: "Pro Plan",
    badge: "2000 Students",
    studentCapText: "Upto 2000 Students • Unlimited Staff",
    theme: {
      border: "border-amber-400 dark:border-amber-500",
      badgeBg: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
      btnBg: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      glow: "bg-amber-50 dark:bg-amber-900/20",
    },
    prices: {
      "1_year": { price: 39999, mrp: 47999, save: 7989 },
      monthly: { price: 3999 },
    },
    features: [
      { text: "Upto 2000 Students Records", included: true },
      { text: "Unlimited Teachers & Staff Accounts", included: true },
      { text: "Unlimited Role-based Multi Admins", included: true },
      { text: "Advance Fee Reports + Defaulter Analytics + Excel Export", included: true },
      { text: "Bulk WhatsApp Alerts & Custom Message Templates", included: true },
      { text: "Monthly Attendance Summary + Late/Leave Register", included: true },
      { text: "Online Admission Portal + Direct Roll/Class Auto-Assign", included: true },
      { text: "Full Payroll + Salary Slip + Attendance Deductions", included: true },
      { text: "Premium School Website with Custom Domain / Branding", included: true },
      { text: "Student + Teacher Smart QR ID Cards & Admit Cards", included: true },
      { text: "Official Certificates (TC, Character, Bonafide) with School Seal", included: true },
      { text: "Dedicated VIP Super Admin Support & Auto Cloud Backup", included: true },
    ],
  },
];

const durationLabel: Record<Duration, string> = {
  "1_year": "1st Year Session (1 साल का सेशन)",
  monthly: "Monthly (1 महीना)",
};

interface Props {
  school: School;
  onBack: () => void;
}

export const SchoolStore: React.FC<Props> = ({ school, onBack }) => {
  const [durations, setDurations] = useState<Record<string, Duration>>({
    starter_200: "1_year",
    growth_500: "1_year",
    enterprise_2000: "1_year",
  });
  const [eliteMap, setEliteMap] = useState<Record<string, boolean>>({
    starter_200: false,
    growth_500: false,
    enterprise_2000: false,
  });

  const sendWhatsApp = (tier: TierPlanConfig, dur: Duration) => {
    const isElite = eliteMap[tier.key] || false;
    const durName = durationLabel[dur];
    const basePrice = dur === "1_year" ? tier.prices["1_year"].price : tier.prices.monthly.price;
    const priceVal = isElite ? basePrice * 2 : basePrice;
    const priceStr = `₹${priceVal.toLocaleString("en-IN")}`;
    const editionText = isElite ? "👑 Elite Plan (2× Price — Class 1 to 12 Notes, MCQ, PDF & Video Manager Included)" : "Standard Plan";
    const msg = encodeURIComponent(
      `Namaste! 🙏\n\nMain *${school.name}* ka School Admin hoon.\n\nMujhe *IIC School ${tier.name} (${tier.badge}) — ${editionText} — ${durName} (${priceStr})* subscription chahiye.\n\n📋 School Details:\n• School: ${school.name}\n• School Code: ${school.code}\n• Admin Email: ${school.adminEmail}\n\nKripya subscription activate karein. Dhanyawad!`
    );
    safeOpenExternalUrl(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${msg}`);
  };

  const currentTier = school.subscription?.tier;
  const isEliteActive = Boolean(school.isElite || school.subscription?.isElite);
  const isActive = school.subscription?.status === "active";
  const expiresAt = school.subscription?.expiresAt;

  const isCurrent = (tierKey: SubscriptionTier) => {
    if (!isActive) return false;
    if (tierKey === "starter_200") return currentTier === "starter_200" || currentTier === "lite";
    if (tierKey === "growth_500") return currentTier === "growth_500";
    if (tierKey === "enterprise_2000") return currentTier === "enterprise_2000" || currentTier === "full";
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 px-4 py-5 shadow-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-blue-300 hover:text-white text-sm font-bold mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <p className="text-blue-300 text-xs font-black uppercase tracking-wider mb-1">Official School Store</p>
        <h1 className="text-2xl font-black text-white tracking-tight">School Subscription Plans</h1>
        <p className="text-blue-200 text-sm mt-1">Super Admin द्वारा निर्धारित छात्र क्षमता व आधिकारिक शुल्क</p>
      </div>

      <div className="p-4 max-w-xl mx-auto space-y-5">
        {/* Active Plan status banner */}
        {isActive && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                {currentTier === "starter_200" || currentTier === "lite"
                  ? "Basic Plan (200 Students) Active ✓"
                  : currentTier === "growth_500"
                  ? "Standard Plan (500 Students) Active ✓"
                  : "Pro Plan (2000 Students) Active ✓"}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                {expiresAt
                  ? `Valid till: ${new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Subscription active hai"}
              </p>
            </div>
          </div>
        )}

        {!isActive && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <Lock className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Subscription Inactive</p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Neeche se koi bhi plan select karke WhatsApp se activate karwayen
              </p>
            </div>
          </div>
        )}

        {/* ── 3 TIERS: BASIC (200), STANDARD (500), PRO (2000) ────────────────── */}
        {STORE_TIERS.map((tier) => {
          const selectedDur = durations[tier.key] || "1_year";
          const activeThis = isCurrent(tier.key);
          const priceObj = tier.prices[selectedDur];
          const isPro = tier.key === "enterprise_2000";
          const isStandard = tier.key === "growth_500";

          return (
            <div
              key={tier.key}
              className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border-2 transition-all ${
                activeThis
                  ? `${tier.theme.border} shadow-md ring-2 ring-indigo-400/20`
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              {/* Optional Top Badge for Standard & Pro */}
              {isPro && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center text-xs font-black py-1.5 tracking-wide uppercase">
                  👑 VIP UNLIMITED — COMPLETE SCHOOL SUITE
                </div>
              )}
              {isStandard && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center text-xs font-black py-1.5 tracking-wide uppercase">
                  ⭐ MOST POPULAR — 500 STUDENTS
                </div>
              )}

              {/* Tier Header */}
              <div className={`${tier.theme.glow} px-4 py-4 border-b border-slate-100 dark:border-slate-700`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl ${tier.theme.iconBg} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                      {isPro ? <Crown className="w-5 h-5" /> : isStandard ? <Users className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-black text-slate-800 dark:text-white text-lg leading-tight">
                          {tier.name}
                        </h2>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tier.theme.badgeBg}`}>
                          {tier.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-0.5">
                        {tier.studentCapText}
                      </p>
                    </div>
                  </div>

                  {activeThis && (
                    <span className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-black shadow-xs">
                      Active Plan
                    </span>
                  )}
                </div>

                {/* Duration Switcher (1st Year Session vs Monthly) */}
                <div className="grid grid-cols-2 gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={() => setDurations(prev => ({ ...prev, [tier.key]: "1_year" }))}
                    className={`text-xs font-black px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                      selectedDur === "1_year"
                        ? `${tier.theme.btnBg} text-white border-transparent shadow-md scale-[1.01]`
                        : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-1 font-black">
                      📅 1st Year Session
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 ${selectedDur === "1_year" ? "text-amber-200 font-black" : "text-blue-600 dark:text-blue-400"}`}>
                      365 Din • Full Session
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurations(prev => ({ ...prev, [tier.key]: "monthly" }))}
                    className={`text-xs font-black px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                      selectedDur === "monthly"
                        ? `${tier.theme.btnBg} text-white border-transparent shadow-md scale-[1.01]`
                        : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-1 font-black">
                      🗓️ Monthly Plan
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 ${selectedDur === "monthly" ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
                      30 Din • 1 Month
                    </span>
                  </button>
                </div>

                {/* Standard vs Elite Edition Switch */}
                <div className="mt-3.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEliteMap(prev => ({ ...prev, [tier.key]: false }))}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                      !eliteMap[tier.key]
                        ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    Standard Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setEliteMap(prev => ({ ...prev, [tier.key]: true }))}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      eliteMap[tier.key]
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs"
                        : "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                    }`}
                  >
                    👑 Elite Plan (2×)
                  </button>
                </div>

                {eliteMap[tier.key] && (
                  <div className="mt-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Sparkles size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold leading-snug">
                      <strong>👑 Elite Edition Feature:</strong> Class 1 se 12 tak ke Notes, Coaching MCQs, Video Lectures aur PDF Notes add karne ka exclusive manager unlock hoga.
                    </p>
                  </div>
                )}

                {/* Price Display */}
                <div className="mt-3.5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    ₹{(eliteMap[tier.key] ? priceObj.price * 2 : priceObj.price).toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    /{selectedDur === "1_year" ? "session (365 din)" : "month"}
                  </span>
                  {eliteMap[tier.key] && (
                    <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full font-black">
                      2× Elite Rate
                    </span>
                  )}
                  {!eliteMap[tier.key] && selectedDur === "1_year" && tier.prices["1_year"].mrp && (
                    <>
                      <span className="text-xs line-through text-slate-400">
                        ₹{tier.prices["1_year"].mrp.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-black">
                        Save ₹{tier.prices["1_year"].save.toLocaleString("en-IN")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="px-4 py-3.5 space-y-2 border-t border-slate-100 dark:border-slate-700">
                {tier.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-base font-black ${f.included ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
                      {f.included ? "✓" : "✕"}
                    </span>
                    <span className={`text-sm ${f.included ? "text-slate-700 dark:text-slate-200 font-semibold" : "text-slate-400 dark:text-slate-500"}`}>
                      {f.text}
                    </span>
                  </div>
                ))}
                {eliteMap[tier.key] && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900">
                    <Sparkles size={14} className="shrink-0" />
                    <span>Class 1 to 12 Notes, MCQ, PDF & Video Manager Included</span>
                  </div>
                )}
              </div>

              {/* WhatsApp Purchase Button */}
              <div className="px-4 pb-4 pt-1">
                <button
                  type="button"
                  onClick={() => sendWhatsApp(tier, selectedDur)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer text-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Buy: {tier.name} {eliteMap[tier.key] ? "(Elite 2×)" : ""} — ₹{(eliteMap[tier.key] ? priceObj.price * 2 : priceObj.price).toLocaleString("en-IN")}
                </button>
              </div>
            </div>
          );
        })}

        {/* Informative Terms Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-4 space-y-2 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-black text-blue-900 dark:text-blue-200">📋 Official Subscription Terms & Rates:</p>
          <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-300">
            <p>• <strong>Basic Plan (200 Students):</strong> ₹999/माह या ₹9,999/सत्र (10 शिक्षक, उपस्थिति, फ़ीस व परीक्षा)।</p>
            <p>• <strong>Standard Plan (500 Students):</strong> ₹1,999/माह या ₹19,999/सत्र (25 शिक्षक, सब-एडमिन, QR आईडी कार्ड व एडमिट कार्ड)।</p>
            <p>• <strong>Pro Plan (2000 Students):</strong> ₹3,999/माह या ₹39,999/सत्र (असीमित स्टाफ, मल्टी-एडमिन, एडवांस एकाउंट्स, HRM सैलरी स्लिप व स्कूल वेबसाइट)।</p>
            <p>• <strong>एक्टिवेशन:</strong> WhatsApp पर संदेश भेजते ही सुपर एडमिन द्वारा तुरंत प्लान एक्टिवेट कर दिया जाता है।</p>
          </div>
        </div>
      </div>
    </div>
  );
};
