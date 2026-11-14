// @ts-nocheck
import React, { useState } from "react";
import {
  ArrowLeft, Crown, Shield, Lock, CheckCircle2, XCircle,
  Calendar, AlertTriangle, MessageSquare, ChevronDown, ChevronUp,
  BookOpen, Users, FileText, ClipboardList, IndianRupee, Sparkles,
  Zap, Copy, Check, ExternalLink, X, Flame, Clock, Camera, QrCode
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { TIER_CONFIG, isSchoolEliteCurriculum, type School, type SubscriptionTier } from "../../school-types";
import { ADMIN_WHATSAPP_NUMBER, SUPPORT_PHONE } from "../../constants";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";

interface Props {
  school: School | null;
  schoolId: string;
  adminUid: string;
  onBack: () => void;
}

// ── Plan feature matrix ───────────────────────────────────────────────────────
const FEATURES = [
  { id: "students",       icon: <Users size={14} />, label: "Student Capacity",        basic: "200 Students", standard: "500 Students", pro: "2000 Students" },
  { id: "teachers",       icon: <Users size={14} />, label: "Staff & Teachers Limit",  basic: "10 Teachers",  standard: "25 Teachers",  pro: "Unlimited Staff" },
  { id: "subadmins",      icon: <Shield size={14} />, label: "Multi/Sub-Admins",       basic: "1 Admin Only", standard: "Up to 3 Admins", pro: "Unlimited Admins" },
  { id: "attendance",     icon: <QrCode size={14} />, label: "QR Code Scan Attendance", basic: "⚡ Lite Included", standard: "⚡ Lite + SMS Link", pro: "⚡ Lite + Summary" },
  { id: "faceattendance", icon: <Camera size={14} />, label: "🤖 AI Face Attendance (0.2s Kiosk & Face ID)", basic: "👑 Elite Only", standard: "👑 Elite Only", pro: "👑 Elite Only" },
  { id: "notesmanager",   icon: <Sparkles size={14} />, label: "Class 1–12 Notes & Media (Elite)", basic: "👑 Elite Only", standard: "👑 Elite Only", pro: "👑 Elite Only" },
  { id: "fees",           icon: <IndianRupee size={14} />, label: "Fee & Due Register", basic: "Basic Register", standard: "Monthly Dues + Slip", pro: "Advance Analytics + Export" },
  { id: "whatsapp",       icon: <MessageSquare size={14} />, label: "WhatsApp Alerts", basic: "Manual Share", standard: "1-Click Due/Receipt", pro: "Bulk Alerts & Templates" },
  { id: "admissions",     icon: <BookOpen size={14} />, label: "Online Admissions",    basic: "Basic Form", standard: "Form + Approval", pro: "Portal + Auto Roll/Class" },
  { id: "idcards",        icon: <FileText size={14} />, label: "Live QR ID Cards & Admit", basic: false, standard: "QR Student Cards + Admit", pro: "Student + Staff Smart IDs" },
  { id: "hrm",            icon: <Users size={14} />, label: "Staff HRM & Payroll",      basic: false, standard: "Salary Register", pro: "Full Payroll + Salary Slips" },
  { id: "website",        icon: <BookOpen size={14} />, label: "School Public Website", basic: "Single Page", standard: "Website + Gallery", pro: "Premium Domain / Branding" },
  { id: "referral",       icon: <Sparkles size={14} />, label: "Sibling Auto-Discount", basic: false, standard: true, pro: true },
  { id: "certificates",   icon: <FileText size={14} />, label: "Certificates (TC/Bonafide)", basic: false, standard: "TC Generator", pro: "Unlimited TC, Character & Bonafide" },
  { id: "support",        icon: <Shield size={14} />, label: "Support & Cloud Backup", basic: "Standard Support", standard: "Priority WhatsApp (12h)", pro: "Dedicated VIP + Cloud Backup" },
];

const daysRemaining = (isoDate?: string): number => {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

type PlanOptionKey = "lite_monthly" | "elite_monthly" | "lite_yearly" | "elite_yearly";

interface TierPlanSelection {
  isElite: boolean;
  duration: "monthly" | "1_year";
  key: PlanOptionKey;
}

export const SchoolPlanView: React.FC<Props> = ({ school, schoolId, adminUid, onBack }) => {
  const [showCompare, setShowCompare] = useState(false);
  const [contactMsg, setContactMsg]   = useState("");
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);

  // ── Plan Filter View: All vs Lite vs Elite ───────────────────────────────
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "lite" | "elite">("all");

  // ── Compact Plan Option Selection Per Tier ────────────────────────────────
  // Default: Lite Monthly for starter and growth, Elite Monthly for enterprise
  const [tierOptions, setTierOptions] = useState<Record<string, TierPlanSelection>>({
    starter_200: { isElite: false, duration: "monthly", key: "lite_monthly" },
    growth_500: { isElite: false, duration: "monthly", key: "lite_monthly" },
    enterprise_2000: { isElite: true, duration: "monthly", key: "elite_monthly" },
  });

  const [buyingPlan, setBuyingPlan] = useState<{
    tier: SubscriptionTier;
    isElite: boolean;
    duration: "monthly" | "1_year";
    amount: number;
    title: string;
  } | null>(null);

  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);

  // ── Derive plan info ─────────────────────────────────────────────────────
  const sub            = school?.subscription;
  const isActive       = sub?.status === "active";
  const tier           = sub?.tier;
  const isSchoolElite  = isSchoolEliteCurriculum(school);
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
      badge: "INACTIVE",
      color: "from-slate-400 to-slate-500",
      bg:    "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
      icon:  <Lock size={20} className="text-slate-400" />,
      desc:  "School subscription active nahi hai. Neeche se apna plan chun kar activate karein.",
    },
    basic: {
      label: isSchoolElite ? "Basic Elite (200 Students)" : "Basic Lite (200 Students)",
      badge: isSchoolElite ? "👑 ELITE" : "⚡ LITE",
      color: isSchoolElite ? "from-amber-500 to-orange-500" : "from-blue-600 to-indigo-600",
      bg:    isSchoolElite ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800" : "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
      icon:  isSchoolElite ? <Crown size={20} className="text-amber-500" /> : <Shield size={20} className="text-blue-500" />,
      desc:  isSchoolElite
        ? "200 Students · 👑 AI Face Attendance (Kiosk + Face ID) + QR Scan + Class 1–12 Notes Active"
        : "200 Students · 📷 QR Code Scan Attendance · Fee Register · WhatsApp Alerts (Face Attendance: Elite Only)",
    },
    standard: {
      label: isSchoolElite ? "Standard Elite (500 Students)" : "Standard Lite (500 Students)",
      badge: isSchoolElite ? "👑 ELITE" : "⚡ LITE",
      color: isSchoolElite ? "from-amber-500 to-purple-600" : "from-indigo-600 to-purple-600",
      bg:    isSchoolElite ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800" : "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800",
      icon:  isSchoolElite ? <Crown size={20} className="text-amber-500" /> : <Users size={20} className="text-indigo-500" />,
      desc:  isSchoolElite
        ? "500 Students · 👑 AI Face Attendance (Kiosk + Face ID) + QR ID Cards + Class 1–12 Notes Active"
        : "500 Students · 📷 QR Code Scan Attendance · Sub-Admins · QR ID Cards (Face Attendance: Elite Only)",
    },
    pro: {
      label: isSchoolElite ? "Pro Elite (2000 Students)" : "Pro Lite (2000 Students)",
      badge: isSchoolElite ? "👑 ELITE" : "⚡ LITE",
      color: "from-amber-500 to-orange-500",
      bg:    "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800",
      icon:  <Crown size={20} className="text-amber-500" />,
      desc:  isSchoolElite
        ? "2000 Students · 👑 AI Face Attendance (Kiosk + Face ID) + Payroll HRM + Class 1–12 Notes Active"
        : "2000 Students · 📷 QR Code Scan Attendance · Payroll HRM · School Website (Face Attendance: Elite Only)",
    },
  }[planLevel];

  // ── Handle Buy / Upgrade Click ───────────────────────────────────────────
  const handleInitiateBuy = (targetTier: SubscriptionTier, option?: TierPlanSelection) => {
    const cfg = TIER_CONFIG[targetTier];
    if (!cfg) return;

    const currentOpt = option || tierOptions[targetTier] || { isElite: false, duration: "monthly", key: "lite_monthly" };
    const isElite = currentOpt.isElite;
    const isAnnual = currentOpt.duration === "1_year";

    const amount = isElite
      ? (isAnnual ? cfg.eliteSessionPrice : cfg.eliteMonthlyPrice)
      : (isAnnual ? cfg.sessionPrice : cfg.monthlyPrice);

    setBuyingPlan({
      tier: targetTier,
      isElite,
      duration: currentOpt.duration,
      amount,
      title: `${cfg.name.split("(")[0].trim()} ${isElite ? "👑 Elite Plan" : "⚡ Lite Plan"}`
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
        message: `School: ${school?.name} (${school?.code || 'N/A'}) ne ${buyingPlan.title} (${buyingPlan.duration === '1_year' ? 'Annual Session' : 'Monthly'}) ₹${buyingPlan.amount.toLocaleString('en-IN')} select kiya hai.`,
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
    const durLabel = buyingPlan.duration === "1_year" ? "1st Year Annual Session (10+2 Mo Free)" : "Monthly Subscription";
    const eliteText = buyingPlan.isElite
      ? "👑 Elite Edition (AI Face Attendance + QR Scan + Class 1-12 Notes, MCQ, Video & PDF Included)"
      : "⚡ Lite ERP Edition (QR Code Scan Attendance Included)";
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
    safeOpenExternalUrl(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${text}`);
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

  const TIERS_LIST: SubscriptionTier[] = ["starter_200", "growth_500", "enterprise_2000"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 text-slate-800 dark:text-slate-100">
      {/* ── TOP NAV BAR (Compact & Premium) ── */}
      <div className="sticky top-0 z-30 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xs font-black text-white tracking-wide truncate flex items-center gap-1.5">
                <span>School Plan & Store</span>
                {school?.code && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                    {school.code}
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-slate-400 truncate">{school?.name || "School ERP"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
              isActive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}>
              {isActive ? "Active" : "Expired"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-3.5 space-y-3.5 max-w-xl mx-auto">

        {/* ── CURRENT ACTIVE PLAN CARD (Compact, Sleek, Professional) ── */}
        <div className={`rounded-xl border p-3.5 ${planCfg.bg} shadow-xs relative overflow-hidden transition-all`}>
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${planCfg.color} flex items-center justify-center text-white shadow-xs shrink-0`}>
                {planCfg.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {planCfg.label}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                    isSchoolElite
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                  }`}>
                    {planCfg.badge}
                  </span>
                  {sub?.planDuration === "1_year" ? (
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                      · Annual
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                      · Monthly
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {planCfg.desc}
                </p>
              </div>
            </div>

            {/* Countdown badge */}
            {isActive && expiresAt && (
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-black tabular-nums px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                  expiringSoon
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse"
                    : "bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                }`}>
                  <Clock size={11} /> {days}d left
                </span>
              </div>
            )}
          </div>

          {/* Expiry Bar / Prompt */}
          {isActive && expiresAt && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Valid till: <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{fmtDate(expiresAt)}</strong>
              </span>
              {expiringSoon ? (
                <span className="font-black text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Flame size={12} /> Jaldi renew karein!
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> System Online
                </span>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SUBSCRIPTION STORE SECTION (Compact, Professional SaaS Grid)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-xs space-y-3">
          
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Zap size={14} className="text-amber-500" /> Plan Kharidein ya Upgrade Karein
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Chhota button click karein aur direct select karein:
              </p>
            </div>

            {/* Quick Segmented Switcher */}
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTabFilter("all")}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  activeTabFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Sabhi Plans
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter("lite")}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTabFilter === "lite"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span>⚡ Lite ERP</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter("elite")}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTabFilter === "elite"
                    ? "bg-amber-500 text-slate-950 font-black shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Crown size={10} />
                <span>Elite Store</span>
              </button>
            </div>
          </div>

          {/* ── ATTENDANCE PLAN COMPARISON HIGHLIGHT (LITE = QR SCAN, ELITE = AI FACE ATTENDANCE) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/25 p-2.5 flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <QrCode size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-blue-900 dark:text-blue-200 flex items-center gap-1">
                  <span>⚡ Lite Plan: QR Code Scan Attendance</span>
                </p>
                <p className="text-[10px] text-blue-700/90 dark:text-blue-300/80 leading-snug mt-0.5">
                  Lite subscription mein 📷 QR Code Scanner &amp; Class QR Attendance full access milega.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-gradient-to-r from-amber-50 to-orange-50/70 dark:from-amber-950/35 dark:to-orange-950/25 p-2.5 flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs">
                <Camera size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-amber-950 dark:text-amber-200 flex items-center gap-1">
                  <span>👑 Elite Plan: AI Face Attendance</span>
                </p>
                <p className="text-[10px] text-amber-800 dark:text-amber-300/90 leading-snug mt-0.5">
                  Sirf Elite walon ko 🤖 0.2s Face Attendance Kiosk, Live Face ID Studio + QR Scan + Class 1–12 Notes milenge!
                </p>
              </div>
            </div>
          </div>

          {/* ── TIER CARDS WITH 4 COMPACT BUTTONS ── */}
          {/* Order in each card: 1. Lite Monthly -> 2. Elite Monthly -> 3. Lite Yearly -> 4. Elite Yearly */}
          <div className="space-y-2.5">
            {TIERS_LIST.map((tKey) => {
              const cfg = TIER_CONFIG[tKey];
              const sel = tierOptions[tKey] || { isElite: false, duration: "monthly", key: "lite_monthly" };
              const isCurrentTier = isActive && (tier === tKey || (tKey === "enterprise_2000" && tier === "full") || (tKey === "starter_200" && tier === "lite"));

              // Calculate active price based on current selection
              const activePrice = sel.isElite
                ? (sel.duration === "1_year" ? cfg.eliteSessionPrice : cfg.eliteMonthlyPrice)
                : (sel.duration === "1_year" ? cfg.sessionPrice : cfg.monthlyPrice);

              return (
                <div
                  key={tKey}
                  className={`rounded-xl border p-3 transition-all relative ${
                    sel.isElite
                      ? "border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-r from-amber-50/30 via-white to-amber-50/10 dark:from-slate-900 dark:to-slate-900"
                      : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900"
                  } hover:border-slate-300 dark:hover:border-slate-700`}
                >
                  {/* Top Row: Title, Capacity & Current Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {cfg.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Upto {cfg.maxStudents} Students)
                      </span>
                      {isCurrentTier && (
                        <span className="text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                          Current Tier
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                        ₹{activePrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold ml-0.5">
                        {sel.duration === "1_year" ? "/yr" : "/mo"}
                      </span>
                    </div>
                  </div>

                  {/* Feature Subtext */}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2.5">
                    {cfg.desc}
                    {sel.isElite ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
                        · 👑 AI Face Attendance (Kiosk &amp; Face ID) + Class 1–12 Notes, MCQs &amp; Videos Included!
                      </span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">
                        · ⚡ QR Code Scan Attendance Included (Face Attendance ke liye Elite chunein)
                      </span>
                    )}
                  </p>

                  {/* ── 4 COMPACT BUTTONS GRID IN EXACT REQUESTED SEQUENCE:
                      1. Lite Monthly
                      2. Elite Monthly
                      3. Lite Yearly
                      4. Elite Yearly
                  ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    
                    {/* 1. LITE MONTHLY BUTTON */}
                    <button
                      type="button"
                      onClick={() => setTierOptions(prev => ({
                        ...prev,
                        [tKey]: { isElite: false, duration: "monthly", key: "lite_monthly" }
                      }))}
                      className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-97 ${
                        sel.key === "lite_monthly"
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                      title="Lite Monthly Plan"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black truncate">⚡ Lite Monthly</span>
                        {sel.key === "lite_monthly" && <Check size={11} className="shrink-0" />}
                      </div>
                      <span className={`text-[11px] font-black tabular-nums mt-0.5 ${sel.key === "lite_monthly" ? "text-white" : "text-slate-900 dark:text-white"}`}>
                        ₹{cfg.monthlyPrice.toLocaleString("en-IN")}<span className="text-[9px] font-normal opacity-80">/mo</span>
                      </span>
                    </button>

                    {/* 2. ELITE MONTHLY BUTTON */}
                    <button
                      type="button"
                      onClick={() => setTierOptions(prev => ({
                        ...prev,
                        [tKey]: { isElite: true, duration: "monthly", key: "elite_monthly" }
                      }))}
                      className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-97 ${
                        sel.key === "elite_monthly"
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-2xs font-black"
                          : "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/70"
                      }`}
                      title="Elite Monthly Plan with Class 1-12 Notes"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black truncate flex items-center gap-0.5">
                          <Crown size={10} className="shrink-0 text-amber-600 dark:text-amber-400" /> Elite Monthly
                        </span>
                        {sel.key === "elite_monthly" && <Check size={11} className="shrink-0" />}
                      </div>
                      <span className={`text-[11px] font-black tabular-nums mt-0.5 ${sel.key === "elite_monthly" ? "text-slate-950 font-black" : "text-amber-700 dark:text-amber-300 font-bold"}`}>
                        ₹{cfg.eliteMonthlyPrice.toLocaleString("en-IN")}<span className="text-[9px] font-normal opacity-80">/mo</span>
                      </span>
                    </button>

                    {/* 3. LITE YEARLY BUTTON */}
                    <button
                      type="button"
                      onClick={() => setTierOptions(prev => ({
                        ...prev,
                        [tKey]: { isElite: false, duration: "1_year", key: "lite_yearly" }
                      }))}
                      className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-97 ${
                        sel.key === "lite_yearly"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                      title="Lite Annual Session Plan"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black truncate">⚡ Lite Yearly</span>
                        <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 rounded">10+2</span>
                      </div>
                      <span className={`text-[11px] font-black tabular-nums mt-0.5 ${sel.key === "lite_yearly" ? "text-white" : "text-slate-900 dark:text-white"}`}>
                        ₹{cfg.sessionPrice.toLocaleString("en-IN")}<span className="text-[9px] font-normal opacity-80">/yr</span>
                      </span>
                    </button>

                    {/* 4. ELITE YEARLY BUTTON */}
                    <button
                      type="button"
                      onClick={() => setTierOptions(prev => ({
                        ...prev,
                        [tKey]: { isElite: true, duration: "1_year", key: "elite_yearly" }
                      }))}
                      className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between active:scale-97 ${
                        sel.key === "elite_yearly"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-2xs font-black"
                          : "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/70"
                      }`}
                      title="Elite Annual Session Plan with Class 1-12 Notes"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black truncate flex items-center gap-0.5">
                          <Crown size={10} className="shrink-0 text-amber-500" /> Elite Yearly
                        </span>
                        <span className="text-[8px] font-black bg-emerald-500 text-white px-1 rounded">Free</span>
                      </div>
                      <span className={`text-[11px] font-black tabular-nums mt-0.5 ${sel.key === "elite_yearly" ? "text-white" : "text-amber-700 dark:text-amber-300 font-bold"}`}>
                        ₹{cfg.eliteSessionPrice.toLocaleString("en-IN")}<span className="text-[9px] font-normal opacity-80">/yr</span>
                      </span>
                    </button>
                  </div>

                  {/* Bottom Action Strip: Compact Buy / Upgrade Button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <span>Selected:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold truncate">
                        {sel.isElite ? "👑 Elite" : "⚡ Lite"} · {sel.duration === "1_year" ? "Annual" : "Monthly"}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInitiateBuy(tKey, sel)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 shrink-0 ${
                        sel.isElite
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                      }`}
                    >
                      <Zap size={13} />
                      <span>{isCurrentTier ? "Renew / Switch" : "Kharidein"}</span>
                      <span className="text-[11px] tabular-nums font-black ml-0.5">
                        (₹{activePrice.toLocaleString("en-IN")})
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── DEDICATED ELITE ALL-IN-ONE CARD (Clean Compact Callout) ── */}
          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 dark:from-amber-950/30 dark:to-orange-950/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs">
                <Crown size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-950 dark:text-amber-200 leading-tight">
                  Kyu hai 👑 Elite Plan Schools ki Pehli Pasand?
                </p>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-snug">
                  🤖 AI Face Attendance (0.2s Kiosk + Live Face ID Studio) + QR Scan + Class 1–12 Notes, MCQs aur Video Lectures shamil hain.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleInitiateBuy("growth_500", { isElite: true, duration: "monthly", key: "elite_monthly" })}
              className="py-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-black whitespace-nowrap self-start sm:self-auto transition cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <Sparkles size={12} />
              <span>Elite 500 Select (₹3,999)</span>
            </button>
          </div>
        </div>

        {/* ── ACTIVE FEATURES IN CURRENT PLAN (Compact Clean Matrix) ── */}
        {isActive && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                Aapke Active Plan mein shamil suvidhayen:
              </p>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {FEATURES.length} Modules
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-56 overflow-y-auto">
              {FEATURES.map(f => {
                const val = f[planLevel] ?? false;
                const hasIt = Boolean(val);
                return (
                  <div key={f.id} className="flex items-center gap-2.5 px-3.5 py-1.5 text-[11px]">
                    <span className={hasIt ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600"}>
                      {f.icon}
                    </span>
                    <span className={`flex-1 font-medium truncate ${hasIt ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
                      {f.label}
                    </span>
                    {typeof val === "string" ? (
                      <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                        {val}
                      </span>
                    ) : hasIt ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAN COMPARISON ACCORDION (Compact) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <button
            onClick={() => setShowCompare(v => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
          >
            <p className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Full Comparison: Basic (200) vs Standard (500) vs Pro (2000)</span>
            </p>
            {showCompare
              ? <ChevronUp size={15} className="text-slate-400" />
              : <ChevronDown size={15} className="text-slate-400" />
            }
          </button>

          {showCompare && (
            <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2 text-left font-black">Plan Rate / Feature</th>
                    <th className="p-1.5 text-center font-black text-blue-600">Basic (200)</th>
                    <th className="p-1.5 text-center font-black text-purple-600">Standard (500)</th>
                    <th className="p-1.5 text-center font-black text-amber-600">Pro (2000)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="p-2 font-bold text-slate-700 dark:text-slate-300">⚡ Lite Monthly</td>
                    <td className="p-1.5 text-center font-black text-slate-700 dark:text-slate-200 tabular-nums">₹999</td>
                    <td className="p-1.5 text-center font-black text-slate-700 dark:text-slate-200 tabular-nums">₹1,999</td>
                    <td className="p-1.5 text-center font-black text-slate-700 dark:text-slate-200 tabular-nums">₹3,999</td>
                  </tr>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                    <td className="p-2 font-black text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Crown size={11} className="text-amber-500" /> 👑 Elite Monthly
                    </td>
                    <td className="p-1.5 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums">₹1,999</td>
                    <td className="p-1.5 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums">₹3,999</td>
                    <td className="p-1.5 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums">₹7,999</td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="p-2 font-bold text-slate-700 dark:text-slate-300">⚡ Lite Yearly (10+2)</td>
                    <td className="p-1.5 text-center font-black text-blue-600 dark:text-blue-400 tabular-nums">₹9,999</td>
                    <td className="p-1.5 text-center font-black text-purple-600 dark:text-purple-400 tabular-nums">₹19,999</td>
                    <td className="p-1.5 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums">₹39,999</td>
                  </tr>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                    <td className="p-2 font-black text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Crown size={11} className="text-amber-500" /> 👑 Elite Yearly (10+2)
                    </td>
                    <td className="p-1.5 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums">₹19,999</td>
                    <td className="p-1.5 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums">₹39,999</td>
                    <td className="p-1.5 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums">₹79,999</td>
                  </tr>
                  {FEATURES.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2 text-slate-600 dark:text-slate-400 font-medium">
                        {f.label}
                      </td>
                      <td className="p-1.5 text-center">
                        {typeof f.basic === "string" ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">{f.basic}</span>
                        ) : f.basic ? (
                          <CheckCircle2 size={13} className="text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle size={13} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="p-1.5 text-center">
                        {typeof f.standard === "string" ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">{f.standard}</span>
                        ) : f.standard ? (
                          <CheckCircle2 size={13} className="text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle size={13} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="p-1.5 text-center">
                        {typeof f.pro === "string" ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">{f.pro}</span>
                        ) : f.pro ? (
                          <CheckCircle2 size={13} className="text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle size={13} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── CUSTOM MESSAGE / ASSISTANCE (Compact) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-black text-slate-800 dark:text-slate-100">
              Koi Sawal ya Custom Requirements?
            </p>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
            Super Admin ko direct message bhej kar apna custom quotation ya sawal puchen:
          </p>
          {sent ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-2.5 py-2 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-800 dark:text-emerald-200 font-bold">
                Message bhej diya gaya hai! Super Admin jald reply karenge.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={contactMsg}
                onChange={e => setContactMsg(e.target.value)}
                placeholder="Jaise: Humare school mein 350 students hain, Elite plan chahiye."
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={sendRequest}
                disabled={sending || !contactMsg.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {sending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <MessageSquare size={13} />
                )}
                <span>{sending ? "Bhej rahe hain…" : "Super Admin ko Message Bhejo"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CHECKOUT & PLAN PURCHASE MODAL (Compact & Clean)
      ══════════════════════════════════════════════════════════════════ */}
      {buyingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className={`p-3.5 text-white flex items-center justify-between ${
              buyingPlan.isElite
                ? "bg-gradient-to-r from-amber-600 to-orange-600"
                : "bg-gradient-to-r from-blue-700 to-indigo-700"
            }`}>
              <div className="flex items-center gap-2">
                {buyingPlan.isElite ? <Crown size={18} /> : <Zap size={18} />}
                <div>
                  <h3 className="text-xs font-black leading-tight">{buyingPlan.title}</h3>
                  <p className="text-[10px] opacity-90">
                    {buyingPlan.duration === "1_year" ? "1st Year Annual Session (10+2 Mo)" : "Monthly Subscription"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBuyingPlan(null)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3.5 space-y-3 overflow-y-auto max-h-[75vh]">
              {checkoutDone ? (
                <div className="text-center py-3 space-y-2.5">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={26} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white">Request Sent Successfully!</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                    Aapka plan purchase request Super Admin ko bhej diya gaya hai. Instant activation ke liye neeche WhatsApp par slip share karein.
                  </p>
                  <button
                    onClick={openWhatsAppCheckout}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <MessageSquare size={15} /> WhatsApp for Instant Activation
                  </button>
                  <button
                    onClick={() => setBuyingPlan(null)}
                    className="w-full py-1 text-slate-500 hover:text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">School:</span>
                      <span className="font-bold text-slate-800 dark:text-white truncate max-w-[170px]">{school?.name || "School"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Edition:</span>
                      <span className={`font-black text-[11px] ${buyingPlan.isElite ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {buyingPlan.isElite ? "👑 Elite (AI Face Attendance + Notes)" : "⚡ Lite ERP (QR Scan Attendance)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Duration:</span>
                      <span className="font-bold text-slate-800 dark:text-white text-[11px]">
                        {buyingPlan.duration === "1_year" ? "12 Mahine (Annual Session)" : "Monthly"}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 dark:text-white">Amount:</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ₹{buyingPlan.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {buyingPlan.isElite ? (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-2.5 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                      <Sparkles size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black">👑 Elite Face Attendance &amp; Curriculum Unlocked:</p>
                        <p className="text-[10px] mt-0.5 text-amber-800 dark:text-amber-300 font-medium">
                          🤖 AI Face Attendance (0.2s Kiosk + Live Face ID Studio), QR Scan aur Class 1–12 Notes/MCQs/Videos activate honge.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-1.5">
                      <QrCode size={14} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black">⚡ Lite Plan — QR Code Scan Attendance:</p>
                        <p className="text-[10px] mt-0.5 text-blue-800 dark:text-blue-300 font-medium">
                          📷 QR Code Scan Attendance shamil hai. 🤖 AI Face Attendance ke liye 👑 Elite Plan chunein.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={openWhatsAppCheckout}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <MessageSquare size={15} /> WhatsApp (+91 {SUPPORT_PHONE}) se Buy Karein
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmCheckout}
                      disabled={checkoutSubmitting}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {checkoutSubmitting ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      <span>{checkoutSubmitting ? "Submitting…" : "In-App Activation Request Bhejein"}</span>
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
export default SchoolPlanView;
