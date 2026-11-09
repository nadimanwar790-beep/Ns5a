// @ts-nocheck
import React, { useState } from "react";
import {
  ArrowLeft, Crown, Shield, Lock, CheckCircle2, XCircle,
  Calendar, AlertTriangle, MessageSquare, ChevronDown, ChevronUp,
  BookOpen, Users, FileText, ClipboardList, IndianRupee, Sparkles,
  Zap, Copy, Check, ExternalLink, X
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { TIER_CONFIG, type School, type SubscriptionTier } from "../../school-types";

interface Props {
  school: School | null;
  schoolId: string;
  adminUid: string;
  onBack: () => void;
}

// ── Plan feature matrix ───────────────────────────────────────────────────────
const FEATURES = [
  { id: "students",     icon: <Users size={15} />, label: "Student Capacity",        basic: "200 Students", standard: "500 Students", pro: "2000 Students" },
  { id: "teachers",     icon: <Users size={15} />, label: "Staff & Teachers Limit",  basic: "10 Teachers",  standard: "25 Teachers",  pro: "Unlimited Staff" },
  { id: "subadmins",    icon: <Shield size={15} />, label: "Multi/Sub-Admins",       basic: "1 Admin Only", standard: "Up to 3 Admins", pro: "Unlimited Admins" },
  { id: "notesmanager", icon: <Sparkles size={15} />, label: "Class 1–12 Notes & Media (Elite)", basic: "Elite 2× Plan", standard: "Elite 2× Plan", pro: "Elite 2× Plan" },
  { id: "fees",         icon: <IndianRupee size={15} />, label: "Fee & Due Register", basic: "Basic Register", standard: "Monthly Dues + Slip", pro: "Advance Analytics + Export" },
  { id: "whatsapp",     icon: <MessageSquare size={15} />, label: "WhatsApp Alerts", basic: "Manual Share", standard: "1-Click Due/Receipt", pro: "Bulk Alerts & Templates" },
  { id: "attendance",   icon: <ClipboardList size={15}/>, label: "Attendance Tracking", basic: "Daily Attendance", standard: "Attendance + SMS Link", pro: "Summary + Leave Register" },
  { id: "admissions",   icon: <BookOpen size={15} />, label: "Online Admissions",    basic: "Basic Form", standard: "Form + Approval", pro: "Portal + Auto Roll/Class" },
  { id: "idcards",      icon: <FileText size={15} />, label: "Live QR ID Cards & Admit", basic: false, standard: "QR Student Cards + Admit", pro: "Student + Staff Smart IDs" },
  { id: "hrm",          icon: <Users size={15} />, label: "Staff HRM & Payroll",      basic: false, standard: "Salary Register", pro: "Full Payroll + Salary Slips" },
  { id: "website",      icon: <BookOpen size={15} />, label: "School Public Website", basic: "Single Page", standard: "Website + Gallery", pro: "Premium Domain / Branding" },
  { id: "referral",     icon: <Sparkles size={15} />, label: "Sibling Auto-Discount", basic: false, standard: true, pro: true },
  { id: "certificates", icon: <FileText size={15} />, label: "Certificates (TC/Bonafide)", basic: false, standard: "TC Generator", pro: "Unlimited TC, Character & Bonafide" },
  { id: "support",      icon: <Shield size={15} />, label: "Support & Cloud Backup", basic: "Standard Support", standard: "Priority WhatsApp (12h)", pro: "Dedicated VIP + Cloud Backup" },
];

const daysRemaining = (isoDate?: string): number => {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

export const SchoolPlanView: React.FC<Props> = ({ school, schoolId, adminUid, onBack }) => {
  const [showCompare, setShowCompare] = useState(false);
  const [contactMsg, setContactMsg]   = useState("");
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);

  // ── In-App Store State (Standard vs Elite & Monthly vs Annual) ───────────
  const [selectedEdition, setSelectedEdition] = useState<"standard" | "elite">("elite");
  const [tierDurations, setTierDurations] = useState<Record<string, "monthly" | "1_year">>({
    starter_200: "monthly",
    growth_500: "monthly",
    enterprise_2000: "monthly",
  });
  const [selectedDuration, setSelectedDuration] = useState<"monthly" | "1_year">("monthly");
  const [buyingPlan, setBuyingPlan] = useState<{
    tier: SubscriptionTier;
    isElite: boolean;
    duration: "monthly" | "1_year";
    amount: number;
    title: string;
  } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);

  // ── Derive plan info ─────────────────────────────────────────────────────
  const sub            = school?.subscription;
  const isActive       = sub?.status === "active";
  const tier           = sub?.tier;
  const isSchoolElite  = Boolean(sub?.isElite || sub?.customCurriculumEnabled || (sub?.monthlyAmount && sub.monthlyAmount >= 1999));
  const planLevel: "none" | "basic" | "standard" | "pro" =
    !isActive ? "none" :
    tier === "starter_200" || tier === "lite" ? "basic" :
    tier === "growth_500" ? "standard" : "pro";

  const expiresAt      = sub?.expiresAt || sub?.paidUntil;
  const days           = daysRemaining(expiresAt);
  const expiringSoon   = isActive && days > 0 && days <= 30;

  // ── Plan badge config ────────────────────────────────────────────────────
  const planCfg = {
    none: {
      label: "No Plan Active",
      color: "from-slate-400 to-slate-500",
      bg:    "bg-slate-50 border-slate-200",
      icon:  <Lock size={28} className="text-slate-400" />,
      desc:  "Aapke school ka koi active plan nahi hai. Neeche se apna plan choose karke buy karein.",
    },
    basic: {
      label: isSchoolElite ? "Basic Elite Plan (200 Students)" : "Basic Plan (200 Students)",
      color: isSchoolElite ? "from-amber-500 to-amber-700" : "from-blue-500 to-indigo-600",
      bg:    isSchoolElite ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-200",
      icon:  isSchoolElite ? <Crown size={28} className="text-amber-500" /> : <Shield size={28} className="text-blue-500" />,
      desc:  isSchoolElite
        ? "Upto 200 Students • 10 Teachers • 👑 Elite Class 1–12 Custom Notes, MCQ, Video & PDF Manager Included!"
        : "Upto 200 Students • 10 Teachers • Core Management, Fees & Due Slips.",
    },
    standard: {
      label: isSchoolElite ? "Standard Elite Plan (500 Students)" : "Standard Plan (500 Students)",
      color: isSchoolElite ? "from-amber-500 to-purple-600" : "from-purple-500 to-indigo-600",
      bg:    isSchoolElite ? "bg-amber-50 border-amber-300" : "bg-purple-50 border-purple-200",
      icon:  isSchoolElite ? <Crown size={28} className="text-amber-500" /> : <Users size={28} className="text-purple-500" />,
      desc:  isSchoolElite
        ? "Upto 500 Students • 25 Teachers • Sub-Admins, QR ID Cards • 👑 Elite Class 1–12 Custom Curriculum!"
        : "Upto 500 Students • 25 Teachers • Sub-Admins, QR ID Cards & Admit Cards.",
    },
    pro: {
      label: isSchoolElite ? "Pro Elite Plan (2000 Students)" : "Pro Plan (2000 Students)",
      color: "from-amber-500 to-orange-500",
      bg:    "bg-amber-50 border-amber-200",
      icon:  <Crown size={28} className="text-amber-500" />,
      desc:  isSchoolElite
        ? "Upto 2000 Students • Unlimited Staff • Multi-Admins, Full Payroll HRM, Website • 👑 Elite Class 1–12 Manager Active!"
        : "Upto 2000 Students • Unlimited Staff • Multi-Admins, Full Payroll HRM, Advance Accounts & School Website.",
    },
  }[planLevel];

  // ── Handle Buy / Upgrade Click ───────────────────────────────────────────
  const handleInitiateBuy = (targetTier: SubscriptionTier, durationOverride?: "monthly" | "1_year") => {
    const cfg = TIER_CONFIG[targetTier];
    if (!cfg) return;

    const isElite = selectedEdition === "elite";
    const duration = durationOverride || selectedDuration;
    const isAnnual = duration === "1_year";

    let amount = 0;
    if (isElite) {
      amount = isAnnual ? cfg.eliteSessionPrice : cfg.eliteMonthlyPrice;
    } else {
      amount = isAnnual ? cfg.sessionPrice : cfg.monthlyPrice;
    }

    setBuyingPlan({
      tier: targetTier,
      isElite,
      duration,
      amount,
      title: `${cfg.name.split("(")[0].trim()} ${isElite ? "👑 Elite Plan" : "Standard Plan"}`
    });
    setCheckoutDone(false);
  };

  // ── Handle Checkout Confirmation ─────────────────────────────────────────
  const handleConfirmCheckout = async () => {
    if (!buyingPlan) return;
    setCheckoutSubmitting(true);
    try {
      const id = `${schoolId}_${Date.now()}`;
      await setDoc(doc(db, "schoolPlanRequests", id), {
        schoolId,
        schoolName: school?.name || "",
        schoolCode: school?.code || "",
        adminUid,
        targetTier: buyingPlan.tier,
        isElite: buyingPlan.isElite,
        duration: buyingPlan.duration,
        amount: buyingPlan.amount,
        planTitle: buyingPlan.title,
        message: `School: ${school?.name} (Code: ${school?.code || 'N/A'}) ne ${buyingPlan.title} (${buyingPlan.duration === '1_year' ? 'Annual Session' : 'Monthly'}) ₹${buyingPlan.amount.toLocaleString('en-IN')} select kiya hai.`,
        requestedAt: serverTimestamp(),
        status: "pending",
      });
      setCheckoutDone(true);
    } catch (e) {
      console.error("Checkout request error:", e);
    }
    setCheckoutSubmitting(false);
  };

  // ── WhatsApp Direct Share ────────────────────────────────────────────────
  const openWhatsAppCheckout = () => {
    if (!buyingPlan) return;
    const durLabel = buyingPlan.duration === "1_year" ? "1st Year Annual Session" : "Monthly";
    const eliteText = buyingPlan.isElite ? "👑 Elite Edition (Class 1-12 Notes Manager & Curriculum Included)" : "Standard Edition";
    const text = encodeURIComponent(
      `*School Plan Purchase Request*\n\n` +
      `🏫 *School:* ${school?.name || "School"}\n` +
      `🔑 *School Code:* ${school?.code || "N/A"}\n` +
      `📦 *Selected Plan:* ${buyingPlan.title}\n` +
      `⚡ *Edition:* ${eliteText}\n` +
      `🗓️ *Duration:* ${durLabel}\n` +
      `💰 *Amount:* ₹${buyingPlan.amount.toLocaleString("en-IN")}\n\n` +
      `Kripya hamare school ke liye ye plan activate karein.`
    );
    window.open(`https://wa.me/918227070298?text=${text}`, "_blank");
  };

  // ── Manual Contact Request ───────────────────────────────────────────────
  const sendRequest = async () => {
    if (!contactMsg.trim()) return;
    setSending(true);
    try {
      const id = `${schoolId}_${Date.now()}`;
      await setDoc(doc(db, "schoolPlanRequests", id), {
        schoolId,
        schoolName: school?.name || "",
        adminUid,
        currentPlan: planLevel,
        message: contactMsg.trim(),
        requestedAt: serverTimestamp(),
        status: "pending",
      });
      setSent(true);
      setContactMsg("");
    } catch (e) {
      console.error("Plan request error:", e);
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 px-4 pt-safe pb-5 shadow-md">
        <div className="flex items-center gap-3 pt-3 mb-2">
          <button onClick={onBack} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-lg font-black text-white">Mera School Plan & Subscription Store</h1>
            <p className="text-xs text-blue-300 font-semibold">{school?.name || "School"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-xl mx-auto">

        {/* ── CURRENT ACTIVE PLAN CARD ── */}
        <div className={`rounded-2xl border-2 p-5 ${planCfg.bg} dark:bg-slate-800 dark:border-slate-700 shadow-sm relative overflow-hidden`}>
          {isSchoolElite && (
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
              <Crown size={12} /> Elite School
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${planCfg.color} flex items-center justify-center text-white shadow-md shrink-0`}>
              {planCfg.icon}
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-lg font-black bg-gradient-to-r ${planCfg.color} bg-clip-text text-transparent`}>
                  {planCfg.label}
                </span>
                {sub?.planDuration === "1_year" && (
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-xs font-bold">
                    📅 Annual Session
                  </span>
                )}
                {sub?.planDuration === "monthly" && (
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-full text-xs font-bold">
                    🗓️ Monthly
                  </span>
                )}
                {isActive ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-black">
                    ✅ Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    ❌ Inactive
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold mt-1">{planCfg.desc}</p>
            </div>
          </div>

          {/* Expiry info */}
          {isActive && expiresAt ? (
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 ${
              expiringSoon ? "bg-red-100 dark:bg-red-900/30" : "bg-white/70 dark:bg-slate-700/60"
            }`}>
              {expiringSoon
                ? <AlertTriangle size={16} className="text-red-500 shrink-0" />
                : <Calendar size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
              }
              <div>
                <p className={`text-xs font-bold ${expiringSoon ? "text-red-600" : "text-slate-800 dark:text-slate-200"}`}>
                  {expiringSoon
                    ? `⚠️ Sirf ${days} din baaki — jaldi renew karo!`
                    : `Valid till: ${fmtDate(expiresAt)} (${days} din baaki)`
                  }
                </p>
              </div>
            </div>
          ) : null}

          {!isActive && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 border border-red-200 dark:border-red-800">
              <AlertTriangle size={15} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                School plan active nahi hai. Neeche diye gaye plan store se apna manpasand plan choose karke buy karein.
              </p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SUBSCRIPTION BUY & UPGRADE STORE (Standard vs Elite 2×)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Zap size={18} className="text-amber-500" /> Subscription Plan Kharidein ya Upgrade Karein
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apne school ke size aur requirements ke anusaar plan select karein
              </p>
            </div>
          </div>

          {/* Edition Selector: Standard (1x) vs Elite (2x) */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
              Plan Edition Select Karein:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-2xl">
              <button
                type="button"
                onClick={() => setSelectedEdition("standard")}
                className={`py-3 px-3 rounded-xl text-left transition-all cursor-pointer ${
                  selectedEdition === "standard"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">⚡ Standard Plan</span>
                  <span className="text-[10px] font-bold text-slate-500">1× Rate</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  ERP, Fees, WhatsApp, Smart ID Cards, Online Admissions & HRM.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEdition("elite")}
                className={`py-3 px-3 rounded-xl text-left transition-all cursor-pointer relative overflow-hidden ${
                  selectedEdition === "elite"
                    ? "bg-gradient-to-br from-amber-500/10 via-amber-500/20 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 text-amber-900 dark:text-amber-200 shadow-sm border-2 border-amber-500"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black flex items-center gap-1">
                    <Crown size={13} className="text-amber-500" /> Elite Plan (2×)
                  </span>
                  <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[10px] text-amber-800 dark:text-amber-300/80 mt-1 leading-snug font-medium">
                  All ERP + 👑 <strong>Class 1–12 Notes Manager</strong>, MCQ, Video & PDF Lectures!
                </p>
              </button>
            </div>
          </div>

          {/* Tier Options Grid: Basic (200), Standard (500), Pro (2000) */}
          <div className="space-y-3 pt-1">
            {(["starter_200", "growth_500", "enterprise_2000"] as SubscriptionTier[]).map(tKey => {
              const cfg = TIER_CONFIG[tKey];
              const isElite = selectedEdition === "elite";
              const duration = tierDurations[tKey] || "monthly";
              const isAnnual = duration === "1_year";

              const mPrice = isElite ? cfg.eliteMonthlyPrice : cfg.monthlyPrice;
              const yPrice = isElite ? cfg.eliteSessionPrice : cfg.sessionPrice;
              const activePrice = isAnnual ? yPrice : mPrice;

              const isCurrentTier = isActive && (tier === tKey || (tKey === "enterprise_2000" && tier === "full") || (tKey === "starter_200" && tier === "lite"));

              return (
                <div
                  key={tKey}
                  className={`rounded-2xl border-2 p-4 transition-all relative ${
                    isElite
                      ? "border-amber-200 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/40 via-white to-orange-50/30 dark:from-slate-800 dark:to-slate-800"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  } hover:shadow-md`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {cfg.name}
                        </span>
                        {isElite && (
                          <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown size={10} /> ELITE (2×)
                          </span>
                        )}
                        {isCurrentTier && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300">
                            Aapka Current Tier
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {cfg.desc}
                      </p>

                      {isElite && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-[11px] font-bold border border-amber-300/60">
                          <Sparkles size={12} className="text-amber-600 shrink-0" />
                          <span>Includes <strong>Class 1–12 Notes Manager</strong>, MCQ, Video & PDF Lectures</span>
                        </div>
                      )}

                      {/* ── TIER-LEVEL MONTHLY & YEARLY BUTTONS ── */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => setTierDurations(prev => ({ ...prev, [tKey]: "monthly" }))}
                            className={`w-full py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 border active:scale-95 text-center ${
                              duration === "monthly"
                                ? (isElite
                                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-300/50"
                                    : "bg-indigo-600 text-white border-indigo-500 shadow-md font-black ring-2 ring-indigo-400/50")
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                            }`}
                          >
                            <span>🗓️ Monthly</span>
                            <span className={`text-[11px] font-black ${duration === "monthly" ? "opacity-100" : "text-slate-500 dark:text-slate-300"}`}>
                              ₹{mPrice.toLocaleString("en-IN")}/mo
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTierDurations(prev => ({ ...prev, [tKey]: "1_year" }))}
                            className={`w-full py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 border active:scale-95 text-center relative ${
                              duration === "1_year"
                                ? (isElite
                                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-300/50"
                                    : "bg-indigo-600 text-white border-indigo-500 shadow-md font-black ring-2 ring-indigo-400/50")
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                            }`}
                          >
                            <span className="truncate">📅 1st Year Annual</span>
                            <span className={`text-[11px] font-black ${duration === "1_year" ? "opacity-100" : "text-slate-500 dark:text-slate-300"}`}>
                              ₹{yPrice.toLocaleString("en-IN")}/yr
                            </span>
                            <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                              10+2 Month Free
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Price & Buy Button */}
                    <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-between self-stretch pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60">
                      <div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          ₹{activePrice.toLocaleString("en-IN")}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInitiateBuy(tKey, duration)}
                        className={`sm:mt-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                          isElite
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                        }`}
                      >
                        <Zap size={14} />
                        {isCurrentTier ? "Renew / Change" : "Kharidein"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ACTIVE FEATURES IN CURRENT PLAN ── */}
        {isActive && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">Aapke Plan mein shamil suvidhayen:</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {FEATURES.map(f => {
                const val = f[planLevel] ?? false;
                const hasIt = Boolean(val);
                return (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={hasIt ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600"}>
                      {f.icon}
                    </span>
                    <span className={`flex-1 text-xs font-semibold ${hasIt ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
                      {f.label}
                    </span>
                    {typeof val === "string" ? (
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {val}
                      </span>
                    ) : hasIt ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAN COMPARISON ACCORDION ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <button
            onClick={() => setShowCompare(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
          >
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              Teeno Plans Compare Karo (Basic vs Standard vs Pro)
            </p>
            {showCompare
              ? <ChevronUp size={16} className="text-slate-400" />
              : <ChevronDown size={16} className="text-slate-400" />
            }
          </button>

          {showCompare && (
            <div className="border-t border-slate-100 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-2.5 text-left font-black">Suvidha (Features)</th>
                    <th className="p-2 text-center font-black text-blue-600">Basic (200)</th>
                    <th className="p-2 text-center font-black text-purple-600">Standard (500)</th>
                    <th className="p-2 text-center font-black text-amber-600">Pro (2000)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-200">Standard Monthly</td>
                    <td className="p-2 text-center font-black text-slate-600">₹999</td>
                    <td className="p-2 text-center font-black text-slate-600">₹1,999</td>
                    <td className="p-2 text-center font-black text-slate-600">₹3,999</td>
                  </tr>
                  <tr className="bg-amber-50/60 dark:bg-amber-950/20">
                    <td className="p-2.5 font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Crown size={12} className="text-amber-500" /> 👑 Elite Monthly (2×)
                    </td>
                    <td className="p-2 text-center font-black text-amber-700">₹1,999</td>
                    <td className="p-2 text-center font-black text-amber-700">₹3,999</td>
                    <td className="p-2 text-center font-black text-amber-700">₹7,999</td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-200">1st Year Session</td>
                    <td className="p-2 text-center font-black text-blue-600">₹9,999</td>
                    <td className="p-2 text-center font-black text-purple-600">₹19,999</td>
                    <td className="p-2 text-center font-black text-amber-600">₹39,999</td>
                  </tr>
                  <tr className="bg-amber-50/60 dark:bg-amber-950/20">
                    <td className="p-2.5 font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Crown size={12} className="text-amber-500" /> 👑 Elite Session (2×)
                    </td>
                    <td className="p-2 text-center font-black text-amber-700">₹19,999</td>
                    <td className="p-2 text-center font-black text-amber-700">₹39,999</td>
                    <td className="p-2 text-center font-black text-amber-700">₹79,999</td>
                  </tr>
                  {FEATURES.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        {f.label}
                      </td>
                      <td className="p-2 text-center">
                        {typeof f.basic === "string" ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">{f.basic}</span>
                        ) : f.basic ? (
                          <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle size={15} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {typeof f.standard === "string" ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">{f.standard}</span>
                        ) : f.standard ? (
                          <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle size={15} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {typeof f.pro === "string" ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">{f.pro}</span>
                        ) : f.pro ? (
                          <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle size={15} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── CUSTOM MESSAGE / ASSISTANCE ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
              Koi Sawal ya Custom Requirements?
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Super Admin ko direct message bhej kar apna custom quotation ya sawal puchen:
          </p>
          {sent ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-3 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-800 dark:text-emerald-200 font-bold">
                Message bhej diya gaya hai! Super Admin jald reply karenge.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={contactMsg}
                onChange={e => setContactMsg(e.target.value)}
                placeholder="Jaise: Humare school mein 350 students hain, Elite plan chahiye."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={sendRequest}
                disabled={sending || !contactMsg.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <MessageSquare size={14} />
                )}
                {sending ? "Bhej rahe hain…" : "Super Admin ko Message Bhejo"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CHECKOUT & PLAN PURCHASE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {buyingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className={`p-4 text-white flex items-center justify-between ${
              buyingPlan.isElite
                ? "bg-gradient-to-r from-amber-600 to-orange-600"
                : "bg-gradient-to-r from-blue-700 to-indigo-700"
            }`}>
              <div className="flex items-center gap-2">
                {buyingPlan.isElite ? <Crown size={20} /> : <Zap size={20} />}
                <div>
                  <h3 className="text-base font-black leading-tight">{buyingPlan.title}</h3>
                  <p className="text-[11px] opacity-90">
                    {buyingPlan.duration === "1_year" ? "1st Year Annual Session" : "Monthly Subscription"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBuyingPlan(null)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              {checkoutDone ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white">Request Successfully Sent!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Aapka plan purchase request Super Admin ko bhej diya gaya hai. Instant activation ke liye neeche diye gaye WhatsApp button se slip share karein.
                  </p>
                  <button
                    onClick={openWhatsAppCheckout}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <MessageSquare size={16} /> Open WhatsApp for Instant Activation
                  </button>
                  <button
                    onClick={() => setBuyingPlan(null)}
                    className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Close Modal
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary Box */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">School Name:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{school?.name || "School"}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Selected Edition:</span>
                      <span className="font-black text-amber-600 dark:text-amber-400">
                        {buyingPlan.isElite ? "👑 Elite Plan (2× Price)" : "Standard Plan"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Duration:</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {buyingPlan.duration === "1_year" ? "12 Mahine (Annual)" : "Monthly"}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900 dark:text-white">Total Amount:</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ₹{buyingPlan.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {buyingPlan.isElite && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black">👑 Elite Curriculum Feature Unlocked:</p>
                        <p className="text-[11px] mt-0.5 text-amber-800 dark:text-amber-300 font-medium">
                          Activation ke baad aapke school ke pass <strong>Class 1 se 12</strong> tak ke Notes, Coaching MCQs, Video Lectures aur PDF Notes add karne ka exclusive direct access rahega.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Direct WhatsApp Purchase Guidance */}
                  <div className="border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-2 bg-emerald-50/70 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                      <MessageSquare size={16} className="text-emerald-600 shrink-0" />
                      <span>Direct Official WhatsApp Subscription (+91 8227070298)</span>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed font-medium">
                      School subscription direct Super Admin ke WhatsApp <strong>+91 8227070298</strong> se activate hota hai. Neeche diye button par click karte hi aapke selected plan aur school details ka message ready ho jayega.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={openWhatsAppCheckout}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
                    >
                      <MessageSquare size={16} /> WhatsApp (+91 8227070298) par Message Bhejein
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmCheckout}
                      disabled={checkoutSubmitting}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {checkoutSubmitting ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      {checkoutSubmitting ? "Submitting Request…" : "In-App Activation Request Bhejein"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
