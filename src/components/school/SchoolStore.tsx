// @ts-nocheck
import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, MessageCircle, Users, BookOpen, Star, Crown, Lock, Shield, Sparkles, Camera, QrCode } from "lucide-react";
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
      { text: "Daily Class Attendance & QR Code Scan Attendance (Lite Included)", included: true },
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
      { text: "QR Code Scan Attendance + SMS/WhatsApp Alert Link", included: true },
      { text: "Live QR Student ID Cards (Bulk Print)", included: true },
      { text: "Exam Admit Cards Hub & Roll Numbers", included: true },
      { text: "Online Admission Form + Approval Workflow", included: true },
      { text: "Staff Salary Register (Basic)", included: true },
      { text: "Sibling Auto-Discount & Teacher Referral", included: true },
      { text: "Standard School Website (Lite: Default Data Only)", included: true },
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
      { text: "QR Code Scan Attendance + Monthly Summary & Leave Register", included: true },
      { text: "Online Admission Portal + Direct Roll/Class Auto-Assign", included: true },
      { text: "Full Payroll + Salary Slip + Attendance Deductions", included: true },
      { text: "Default Website (Lite) / Full Custom Website CMS (Elite)", included: true },
      { text: "Student + Teacher Smart QR ID Cards & Admit Cards", included: true },
      { text: "Official Certificates (TC, Character, Bonafide) with School Seal", included: true },
      { text: "Dedicated VIP Super Admin Support & Auto Cloud Backup", included: true },
    ],
  },
  {
    key: "whitelabel_5000",
    name: "Enterprise White-Label",
    badge: "5000+ Students",
    studentCapText: "5000+ Students • Unlimited Staff & Multi-Branch",
    theme: {
      border: "border-rose-500 dark:border-rose-400",
      badgeBg: "bg-gradient-to-r from-rose-600 via-amber-500 to-orange-500 text-white",
      btnBg: "bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700",
      iconBg: "bg-gradient-to-br from-rose-600 to-amber-500",
      glow: "bg-gradient-to-r from-rose-50 via-amber-50/70 to-orange-50 dark:from-rose-950/30 dark:to-amber-950/20",
    },
    prices: {
      "1_year": { price: 199999, mrp: 239988, save: 39989 },
      monthly: { price: 19999 },
    },
    features: [
      { text: "5000+ Students & Unlimited Staff & Multi-Branch ERP", included: true },
      { text: "📱 Play Store पर स्कूल के अपने नाम व लोगो वाला App (APK/AAB)", included: true },
      { text: "🏫 स्कूल कैंपस में On-Site Staff Training & Kiosk Setup", included: true },
      { text: "📂 100% Old Excel/Register Data Migration हमारी टीम द्वारा", included: true },
      { text: "🌐 Custom .com/.in Domain + Full Custom Website CMS & Gallery", included: true },
      { text: "👑 Dedicated Relationship Manager + All Elite AI Face ID & Notes Included", included: true },
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
    whitelabel_5000: "1_year",
  });
  const [eliteMap, setEliteMap] = useState<Record<string, boolean>>({
    starter_200: false,
    growth_500: false,
    enterprise_2000: false,
    whitelabel_5000: true,
  });

  const sendWhatsApp = (tier: TierPlanConfig, dur: Duration) => {
    const isWhiteLabel = tier.key === "whitelabel_5000";
    const isElite = isWhiteLabel ? true : (eliteMap[tier.key] || false);
    const durName = durationLabel[dur];
    const basePrice = dur === "1_year" ? tier.prices["1_year"].price : tier.prices.monthly.price;
    const priceVal = isWhiteLabel ? basePrice : (isElite ? basePrice * 2 : basePrice);
    const priceStr = `₹${priceVal.toLocaleString("en-IN")}`;
    const editionText = isWhiteLabel
      ? "👑 Enterprise White-Label (Play Store Branded App, On-Site Training, Data Migration, Custom .com Website CMS + All Elite Features)"
      : isElite
      ? "👑 Elite Plan (2× Price — Custom Website CMS + Photos/Gallery, AI Face Attendance & Class 1 to 12 Notes)"
      : "⚡ Lite Plan (Default Website Only — No Custom Photos + QR Code Scan Attendance)";
    const msg = encodeURIComponent(
      `Namaste! 🙏\n\nMain *${school.name}* ka School Admin hoon.\n\nMujhe *IIC School ${tier.name} (${tier.badge}) — ${editionText} — ${durName} (${priceStr})* subscription chahiye.\n\n📋 School Details:\n• School: ${school.name}\n• School Code: ${school.code}\n• Admin Email: ${school.adminEmail}\n\nKripya subscription activate karein. Dhanyawad!`
    );
    safeOpenExternalUrl(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${msg}`);
  };

  const currentTier = school.subscription?.tier;
  const isEliteActive = Boolean(school.isElite || school.subscription?.isElite || currentTier === "whitelabel_5000");
  const isActive = school.subscription?.status === "active";
  const expiresAt = school.subscription?.expiresAt;

  const isCurrent = (tierKey: SubscriptionTier) => {
    if (!isActive) return false;
    if (tierKey === "starter_200") return currentTier === "starter_200" || currentTier === "lite";
    if (tierKey === "growth_500") return currentTier === "growth_500";
    if (tierKey === "enterprise_2000") return currentTier === "enterprise_2000" || currentTier === "full";
    if (tierKey === "whitelabel_5000") return currentTier === "whitelabel_5000";
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 px-4 py-5 shadow-sm border-b-2 border-indigo-700 dark:border-indigo-500/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-indigo-800 hover:text-indigo-950 dark:text-blue-300 dark:hover:text-white text-sm font-black mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <p className="text-indigo-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-1">Official School Store</p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">School Subscription Plans</h1>
        <p className="text-slate-700 dark:text-blue-200 text-sm font-medium mt-1">Super Admin द्वारा निर्धारित 4-Tier छात्र क्षमता व आधिकारिक शुल्क</p>
      </div>

      <div className="p-4 max-w-xl mx-auto space-y-5">
        {/* Active Plan status banner */}
        {isActive && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                {currentTier === "whitelabel_5000"
                  ? "👑 Enterprise White-Label (5000+ Students) Active ✓"
                  : currentTier === "starter_200" || currentTier === "lite"
                  ? "Basic Plan (200 Students) Active ✓"
                  : currentTier === "growth_500"
                  ? "Standard Plan (500 Students) Active ✓"
                  : "Pro Plan (2000 Students) Active ✓"}
                {isEliteActive && currentTier !== "whitelabel_5000" ? " · 👑 Elite" : ""}
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

        {/* Website & Attendance Comparison Banner: Lite (Default Website + QR Scan) vs Elite (Custom Website CMS + AI Face Attendance) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-3.5 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-blue-900 dark:text-blue-200">⚡ Lite: Default Website + QR Scan</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 leading-snug">
                Lite mein sirf <strong>Default Website</strong> milta hai (school khud photo/banner nahi jod sakta) + QR Code Scan Attendance.
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-3.5 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-950 dark:text-amber-200">👑 Elite: Custom Website + AI Face ID</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-snug">
                Elite mein <strong>Full Custom Website CMS</strong> (apni photo, banner, teacher &amp; gallery) + 🤖 0.2s Face Kiosk + Class 1–12 Notes milta hai!
              </p>
            </div>
          </div>
        </div>

        {/* ── 4 TIERS: BASIC (200), STANDARD (500), PRO (2000), ENTERPRISE WHITE-LABEL (5000+) ── */}
        {STORE_TIERS.map((tier) => {
          const selectedDur = durations[tier.key] || "1_year";
          const activeThis = isCurrent(tier.key);
          const priceObj = tier.prices[selectedDur];
          const isWhiteLabel = tier.key === "whitelabel_5000";
          const isPro = tier.key === "enterprise_2000";
          const isStandard = tier.key === "growth_500";
          const effectiveElite = isWhiteLabel ? true : Boolean(eliteMap[tier.key]);
          const finalPrice = isWhiteLabel ? priceObj.price : (effectiveElite ? priceObj.price * 2 : priceObj.price);

          return (
            <div
              key={tier.key}
              className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border-2 transition-all ${
                activeThis || isWhiteLabel
                  ? `${tier.theme.border} shadow-md ring-2 ring-indigo-400/20`
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              {/* Top Badges */}
              {isWhiteLabel && (
                <div className="bg-gradient-to-r from-rose-600 via-amber-500 to-orange-500 text-white text-center text-xs font-black py-1.5 tracking-wide uppercase">
                  👑 FLAGSHIP 4TH TIER — PLAY STORE APP + CUSTOM .COM WEBSITE
                </div>
              )}
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
                      {isWhiteLabel || isPro ? <Crown className="w-5 h-5" /> : isStandard ? <Users className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
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

                {/* Standard vs Elite Edition Switch (White-Label includes Elite) */}
                {!isWhiteLabel ? (
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
                      ⚡ Lite (Default Web)
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
                      👑 Elite (2× · Custom Web)
                    </button>
                  </div>
                ) : (
                  <div className="mt-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-2.5 text-[11px] text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2">
                    <Crown size={14} className="text-amber-600 shrink-0" />
                    <span>All Elite Features + Play Store Branded App + Custom Website CMS Included!</span>
                  </div>
                )}

                {effectiveElite && !isWhiteLabel && (
                  <div className="mt-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Sparkles size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold leading-snug">
                      <strong>👑 Elite Features:</strong> 🌐 Custom School Website CMS (अपनी फ़ोटो, बैनर, टीचर व गैलरी), 🤖 AI Face Attendance aur Class 1–12 Notes unlock honge.
                    </p>
                  </div>
                )}

                {/* Price Display */}
                <div className="mt-3.5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    ₹{finalPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    /{selectedDur === "1_year" ? "session (365 din)" : "month"}
                  </span>
                  {effectiveElite && !isWhiteLabel && (
                    <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full font-black">
                      2× Elite Rate
                    </span>
                  )}
                  {(!effectiveElite || isWhiteLabel) && selectedDur === "1_year" && tier.prices["1_year"].mrp && (
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
                {effectiveElite ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-black text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-300 dark:border-amber-800">
                      <Sparkles size={14} className="shrink-0 text-amber-600" />
                      <span>🌐 Full Custom Website CMS (Banner, Principal, Teachers &amp; Gallery Photos) Included ✓</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-black text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-300 dark:border-amber-800">
                      <Camera size={14} className="shrink-0 text-amber-600" />
                      <span>👑 AI Face Attendance (0.2s Face Kiosk &amp; Live Face ID Studio) + Class 1–12 Notes Included ✓</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-xs bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Shield size={13} className="shrink-0 text-blue-600" />
                      <span>🌐 Default School Website Included (सिर्फ़ डिफ़ॉल्ट डेटा, कस्टम फ़ोटो नहीं)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-semibold text-xs bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Lock size={13} className="shrink-0 text-amber-500" />
                      <span>👑 Custom Website CMS व 🤖 AI Face Attendance — Elite Plan Only</span>
                    </div>
                  </>
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
                  WhatsApp Buy: {tier.name} {isWhiteLabel ? "" : effectiveElite ? "(Elite 2×)" : "(Lite)"} — ₹{finalPrice.toLocaleString("en-IN")}
                </button>
              </div>
            </div>
          );
        })}

        {/* Informative Terms Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-4 space-y-2 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-black text-blue-900 dark:text-blue-200">📋 Official Subscription Terms &amp; 4-Tier Rates:</p>
          <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-300">
            <p>• <strong>Basic Plan (200 Students):</strong> Lite ₹999/माह या ₹9,999/सत्र (Default Website) • Elite ₹1,999/माह या ₹19,999/सत्र (Custom Website CMS + Face ID)।</p>
            <p>• <strong>Standard Plan (500 Students):</strong> Lite ₹1,999/माह या ₹19,999/सत्र (Default Website) • Elite ₹3,999/माह या ₹39,999/सत्र (Custom Website CMS + Face ID)।</p>
            <p>• <strong>Pro Plan (2000 Students):</strong> Lite ₹3,999/माह या ₹39,999/सत्र (Default Website) • Elite ₹7,999/माह या ₹79,999/सत्र (Custom Website CMS + Face ID)।</p>
            <p>• <strong>👑 Enterprise White-Label (5000+ Students):</strong> ₹19,999/माह या ₹1,99,999/सत्र — Play Store Branded App, Custom .com Domain + CMS, On-Site Training व Data Migration।</p>
          </div>
        </div>
      </div>
    </div>
  );
};
