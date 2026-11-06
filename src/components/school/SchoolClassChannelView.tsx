// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Bell,
  MessageCircle,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
  Download,
  ExternalLink,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  X,
  CreditCard,
  QrCode,
  ReceiptText,
} from "lucide-react";
import type { School, SchoolStudent, MonthlyFee } from "../../school-types";
import { formatMonthLabel } from "../../utils/feeFifoAllocation";
import { ParentTeacherQueryManager } from "./ParentTeacherQueryManager";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";

export interface SchoolBroadcastItem {
  id: string;
  schoolId: string;
  schoolName: string;
  classId?: string;
  className?: string;
  senderRole: "PRINCIPAL" | "ACCOUNTANT" | "TEACHER" | "ADMIN";
  senderName: string;
  title: string;
  text: string;
  slipType?: "A6_DEMAND_SLIP" | "FEE_RECEIPT" | "CIRCULAR" | "HOMEWORK";
  month?: string;
  monthLabel?: string;
  studentId?: string;
  studentName?: string;
  amount?: number;
  balanceDue?: number;
  receiptNo?: string;
  dueDate?: string;
  createdAt: string;
}

interface Props {
  school: School;
  student: SchoolStudent;
  fees?: MonthlyFee[];
  onOpenWhatsAppPay?: (fee: MonthlyFee) => void;
  onBack?: () => void;
}

export const SchoolClassChannelView: React.FC<Props> = ({
  school,
  student,
  fees = [],
  onOpenWhatsAppPay,
  onBack,
}) => {
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [selectedFeeForModal, setSelectedFeeForModal] = useState<MonthlyFee | null>(null);

  const studentClass = student?.className || "Class";
  const studentClassId = student?.classId || "";

  // Load broadcasts from local/shared storage
  const storageKey = `nst_school_broadcast_channel_${school?.id || "default"}`;
  const broadcasts = useMemo(() => {
    let list: SchoolBroadcastItem[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch {}

    // Filter messages: only show messages targeted to this student's class or all classes
    const classFiltered = list.filter((b) => {
      if (!b.classId || b.classId === "all") return true;
      if (studentClassId && b.classId === studentClassId) return true;
      if (studentClass && b.className && b.className.toLowerCase().includes(studentClass.toLowerCase())) return true;
      return false;
    });

    // If empty, generate prefilled default official broadcasts
    if (classFiltered.length === 0) {
      return [
        {
          id: "feed-1",
          schoolId: school?.id || "",
          schoolName: school?.name || "DPS School",
          classId: studentClassId,
          className: studentClass,
          senderRole: "ACCOUNTANT",
          senderName: "Accounts & Fee Desk",
          title: `📢 ${studentClass} • Official Fee Demand Slip Notice`,
          text: `Aadarniya Abhibhavak, chalu mahine ki fees jama karne hetu A6 Fee Demand Slip jari kar di gayi hai. Niche diye gaye 'View A6 Demand Slip' button par tap karke slip download karein.`,
          slipType: "A6_DEMAND_SLIP",
          month: "2026-11",
          monthLabel: "November 2026",
          amount: 2000,
          balanceDue: 2000,
          createdAt: new Date().toISOString(),
        },
        {
          id: "feed-2",
          schoolId: school?.id || "",
          schoolName: school?.name || "DPS School",
          classId: studentClassId,
          className: studentClass,
          senderRole: "PRINCIPAL",
          senderName: school?.principalName || "Principal Desk",
          title: `🏫 ${studentClass} • Winter Timetable & Disciplinary Notice`,
          text: `Sabhi chhatra shardi ki official school uniform me hi school aayenge. School ka samay subah 8:30 AM se dopahar 2:30 PM tak rahega.`,
          slipType: "CIRCULAR",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
    }

    return classFiltered;
  }, [storageKey, studentClassId, studentClass, school]);

  // Current student pending fees
  const studentPendingFees = useMemo(() => {
    return fees.filter((f) => {
      if (f.studentId !== student?.id) return false;
      const bal = Number(f.balanceDue !== undefined ? f.balanceDue : (f.amount || 0) - Number(f.paidAmount || 0));
      return !f.paid || bal > 0;
    });
  }, [fees, student?.id]);

  const latestFee = studentPendingFees[0] || fees.find((f) => f.studentId === student?.id) || {
    id: `fee_${student?.id}_current`,
    schoolId: school?.id,
    studentId: student?.id,
    studentName: student?.name,
    classId: student?.classId,
    amount: student?.monthlyFee || 2000,
    monthlyAmount: student?.monthlyFee || 2000,
    balanceDue: student?.monthlyFee || 2000,
    month: "2026-11",
    paid: false,
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Channel Header (WhatsApp-style Broadcast Header) */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white flex items-center justify-between shadow-md shrink-0 border-b border-indigo-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                {studentClass} Official Channel
              </h3>
              <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1-Way Broadcast
              </span>
            </div>
            <p className="text-[11px] text-indigo-200 font-medium mt-0.5">
              {school?.name || "DPS School"} • Lock-Screen Alerts & A6 Fee Slips
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Helpdesk Query Button */}
          <button
            type="button"
            onClick={() => setShowQueryModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="School se sawal poochein (Private Query)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Helpdesk</span>
          </button>
        </div>
      </div>

      {/* Info Badge: No Spam Guarantee */}
      <div className="px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-[11px] font-semibold">
            Sirf School Staff message bhej sakte hain (No spam, no chat noise).
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
          Student: {student?.name}
        </span>
      </div>

      {/* Broadcast Feed Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {/* Personal Active Fee Due Notification Card (A6 Slip Priority) */}
        {studentPendingFees.length > 0 && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-rose-500/10 border-2 border-amber-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <ReceiptText className="w-4 h-4 text-rose-600" />
                  Aapki Baki Fees • Demand Slip Uplabdh Hai
                </h4>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                ₹{Number(studentPendingFees[0].balanceDue || studentPendingFees[0].amount || 0).toLocaleString("en-IN")} Due
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>{student?.name}</strong> (Roll: {student?.rollNo || "—"}, {studentClass}) ki{" "}
              <strong>{formatMonthLabel(studentPendingFees[0].month || "2026-11")}</strong> ki school fees jama karne hetu Fee Demand Slip jari ki gayi hai.
            </p>

            {/* Quick Actions for Fee Demand Slip */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setSelectedFeeForModal(studentPendingFees[0])}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition cursor-pointer active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📄 View Fee Demand Slip (मांग पर्ची)</span>
              </button>

              {onOpenWhatsAppPay && (
                <button
                  type="button"
                  onClick={() => onOpenWhatsAppPay(studentPendingFees[0])}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>💬 WhatsApp Par Pay Karein</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* List of Channel Broadcasts */}
        {broadcasts.map((item) => {
          const isFeeSlip = item.slipType === "A6_DEMAND_SLIP";
          const isReceipt = item.slipType === "FEE_RECEIPT";

          return (
            <div
              key={item.id}
              className={`p-4 rounded-3xl border shadow-sm space-y-2.5 transition-all ${
                isFeeSlip
                  ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60"
                  : isReceipt
                  ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Sender & Timestamp */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                      isFeeSlip
                        ? "bg-amber-600"
                        : isReceipt
                        ? "bg-emerald-600"
                        : "bg-indigo-600"
                    }`}
                  >
                    {item.senderRole === "PRINCIPAL" ? "👑" : "🏢"}
                  </div>
                  <div>
                    <strong className="text-xs font-black text-slate-900 dark:text-white block leading-tight">
                      {item.senderName}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      {item.senderRole} • {item.className || studentClass}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Title & Body */}
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                {item.title}
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {item.text}
              </p>

              {/* Document Slip Action Card */}
              {isFeeSlip && (
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-amber-200 dark:border-amber-700/60 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <strong className="text-xs font-black text-slate-900 dark:text-white block">
                        Official Fee Demand Slip (A6 Format)
                      </strong>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.monthLabel || "Current Month"} • ₹{Number(item.amount || 2000).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedFeeForModal(latestFee)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>📄 View Slip</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Bar: 1-Way Notice & Two-Way Query Helpdesk */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate text-[11px]">
            Channel me sirf School Staff post kar sakte hain.
          </span>
        </div>

        {/* 2-Way Query Helpdesk Trigger */}
        <button
          type="button"
          onClick={() => setShowQueryModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition cursor-pointer shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>💬 Ask School / Parent Helpdesk</span>
        </button>
      </div>

      {/* Two-Way Helpdesk Modal (Parent-Teacher Query) */}
      {showQueryModal && (
        <div className="fixed inset-0 z-[10005] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="p-4 bg-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-200" />
                <h3 className="text-sm font-black text-white">
                  Parent-Teacher Helpdesk & Queries
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQueryModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ParentTeacherQueryManager
                school={school}
                students={[student]}
                currentUserRole="STUDENT"
                currentStudent={student}
                currentUserName={student?.name || "Parent"}
                currentUserId={student?.id || "parent"}
                onBack={() => setShowQueryModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* A6 Demand Slip & Receipt Modal */}
      {selectedFeeForModal && (
        <OfficialFeeReceiptModal
          isOpen={Boolean(selectedFeeForModal)}
          onClose={() => setSelectedFeeForModal(null)}
          school={school}
          fee={selectedFeeForModal}
          student={student}
          className={studentClass}
          initialFormat="a6"
          isStudentView={true}
        />
      )}
    </div>
  );
};
