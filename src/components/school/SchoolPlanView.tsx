// @ts-nocheck
import React, { useState } from "react";
import {
  ArrowLeft, Crown, Shield, Lock, CheckCircle2, XCircle,
  Calendar, AlertTriangle, MessageSquare, ChevronDown, ChevronUp,
  BookOpen, Users, FileText, Brain, ClipboardList, IndianRupee, BarChart3, Sparkles
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import type { School } from "../../school-types";

interface Props {
  school: School | null;
  schoolId: string;
  adminUid: string;
  onBack: () => void;
}

// ── Plan feature matrix ───────────────────────────────────────────────────────
const FEATURES = [
  { id: "students",   icon: <Users size={15} />, label: "Student Capacity",        basic: "200 Students", standard: "500 Students", pro: "2000 Students" },
  { id: "teachers",   icon: <Users size={15} />, label: "Staff & Teachers Limit",  basic: "10 Teachers",  standard: "25 Teachers",  pro: "Unlimited Staff" },
  { id: "subadmins",  icon: <Shield size={15} />, label: "Multi/Sub-Admins",       basic: "1 Admin Only", standard: "Up to 3 Admins", pro: "Unlimited Admins" },
  { id: "fees",       icon: <IndianRupee size={15} />, label: "Fee & Due Register", basic: "Basic Register", standard: "Monthly Dues + Slip", pro: "Advance Analytics + Export" },
  { id: "whatsapp",   icon: <MessageSquare size={15} />, label: "WhatsApp Alerts", basic: "Manual Share", standard: "1-Click Due/Receipt", pro: "Bulk Alerts & Templates" },
  { id: "attendance", icon: <ClipboardList size={15}/>, label: "Attendance Tracking", basic: "Daily Attendance", standard: "Attendance + SMS Link", pro: "Summary + Leave Register" },
  { id: "admissions", icon: <BookOpen size={15} />, label: "Online Admissions",    basic: "Basic Form", standard: "Form + Approval", pro: "Portal + Auto Roll/Class" },
  { id: "idcards",    icon: <FileText size={15} />, label: "Live QR ID Cards & Admit", basic: false, standard: "QR Student Cards + Admit", pro: "Student + Staff Smart IDs" },
  { id: "hrm",        icon: <Users size={15} />, label: "Staff HRM & Payroll",      basic: false, standard: "Salary Register", pro: "Full Payroll + Salary Slips" },
  { id: "website",    icon: <BookOpen size={15} />, label: "School Public Website", basic: "Single Page", standard: "Website + Gallery", pro: "Premium Domain / Branding" },
  { id: "referral",   icon: <Sparkles size={15} />, label: "Sibling Auto-Discount", basic: false, standard: true, pro: true },
  { id: "certificates", icon: <FileText size={15} />, label: "Certificates (TC/Bonafide)", basic: false, standard: "TC Generator", pro: "Unlimited TC, Character & Bonafide" },
  { id: "support",    icon: <Shield size={15} />, label: "Support & Cloud Backup", basic: "Standard Support", standard: "Priority WhatsApp (12h)", pro: "Dedicated VIP + Cloud Backup" },
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

  // ── Derive plan info ─────────────────────────────────────────────────────
  const sub            = school?.subscription;
  const isActive       = sub?.status === "active";
  const tier           = sub?.tier;
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
      label: "No Plan",
      color: "from-slate-400 to-slate-500",
      bg:    "bg-slate-50 border-slate-200",
      icon:  <Lock size={28} className="text-slate-400" />,
      desc:  "Aapke school ka koi active plan nahi hai. Super Admin se contact karo.",
    },
    basic: {
      label: "Basic Plan (200 Students)",
      color: "from-blue-500 to-indigo-600",
      bg:    "bg-blue-50 border-blue-200",
      icon:  <Shield size={28} className="text-blue-500" />,
      desc:  "Upto 200 Students • 10 Teachers • Core Management, Fees & Due Slips.",
    },
    standard: {
      label: "Standard Plan (500 Students)",
      color: "from-purple-500 to-indigo-600",
      bg:    "bg-purple-50 border-purple-200",
      icon:  <Users size={28} className="text-purple-500" />,
      desc:  "Upto 500 Students • 25 Teachers • Sub-Admins, QR ID Cards & Admit Cards.",
    },
    pro: {
      label: "Pro Plan (2000 Students)",
      color: "from-amber-500 to-orange-500",
      bg:    "bg-amber-50 border-amber-200",
      icon:  <Crown size={28} className="text-amber-500" />,
      desc:  "Upto 2000 Students • Unlimited Staff • Multi-Admins, Full Payroll HRM, Advance Accounts & School Website.",
    },
  }[planLevel];

  // ── Upgrade request ──────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 px-4 pt-safe pb-5 shadow-md">
        <div className="flex items-center gap-3 pt-3 mb-4">
          <button onClick={onBack} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-lg font-black text-white">Mera School Plan</h1>
            <p className="text-xs text-blue-300 font-semibold">{school?.name || "School"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* ── Current Plan Card ── */}
        <div className={`rounded-2xl border-2 p-5 ${planCfg.bg} dark:bg-slate-800 dark:border-slate-700 shadow-sm`}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${planCfg.color} flex items-center justify-center text-white shadow-md shrink-0`}>
              {planCfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-lg font-black bg-gradient-to-r ${planCfg.color} bg-clip-text text-transparent`}>
                  {planCfg.label}
                </span>
                {sub?.planDuration === "1_year" && (
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-xs font-bold">
                    📅 1st Year Session
                  </span>
                )}
                {sub?.planDuration === "monthly" && (
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-full text-xs font-bold">
                    🗓️ Monthly
                  </span>
                )}
                {isActive && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-black">
                    ✅ Active
                  </span>
                )}
                {!isActive && (
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
            <div className="mt-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
              <AlertTriangle size={15} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Plan active nahi hai. Neeche Super Admin ko contact karo.
              </p>
            </div>
          )}
        </div>

        {/* ── Active Features ── */}
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

        {/* ── Plan Comparison (Basic vs Standard vs Pro) ── */}
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
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-200">1st Year Session Fees</td>
                    <td className="p-2 text-center font-black text-blue-600">₹9,999</td>
                    <td className="p-2 text-center font-black text-purple-600">₹19,999</td>
                    <td className="p-2 text-center font-black text-amber-600">₹39,999</td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-200">Monthly Fees</td>
                    <td className="p-2 text-center font-black text-slate-600">₹999</td>
                    <td className="p-2 text-center font-black text-slate-600">₹1,999</td>
                    <td className="p-2 text-center font-black text-slate-600">₹3,999</td>
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

        {/* ── Contact / Upgrade Request ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
              Plan Upgrade ya Change Request
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Super Admin ko direct message bhej kar apna school plan upgrade ya renew karwayen:
          </p>
          {sent ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-3 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-800 dark:text-emerald-200 font-bold">
                Request bhej di gayi hai! Super Admin jald reply karenge.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={contactMsg}
                onChange={e => setContactMsg(e.target.value)}
                placeholder="Jaise: Basic (200), Standard (500) ya Pro Plan (2000) chahiye 1st Year Session ke liye. School: ABC School."
                rows={3}
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
                {sending ? "Bhej rahe hain…" : "Super Admin ko Request Bhejo"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
