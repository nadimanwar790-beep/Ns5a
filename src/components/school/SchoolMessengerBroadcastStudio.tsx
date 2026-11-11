// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  Bell,
  Send,
  Users,
  FileText,
  MessageSquare,
  Lock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Plus,
  Trash2,
  Sparkles,
  Phone,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ReceiptText,
} from "lucide-react";
import type { School, SchoolClass, SchoolStudent, MonthlyFee } from "../../school-types";
import { formatMonthLabel } from "../../utils/feeFifoAllocation";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { ParentTeacherQueryManager } from "./ParentTeacherQueryManager";
import { ClassFeeAlertBroadcastModal } from "./ClassFeeAlertBroadcastModal";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  fees?: MonthlyFee[];
  currentUserName: string;
  currentUserRole: "ADMIN" | "TEACHER";
  teacherClassId?: string; // If teacher is restricted to a class
  onBack: () => void;
}

export const SchoolMessengerBroadcastStudio: React.FC<Props> = ({
  school,
  classes = [],
  students = [],
  fees = [],
  currentUserName,
  currentUserRole,
  teacherClassId,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"broadcast" | "feed" | "helpdesk">("broadcast");
  const [selectedClassId, setSelectedClassId] = useState<string>(teacherClassId || "all");
  const [msgType, setMsgType] = useState<"CIRCULAR" | "FEE_DEMAND_SLIP" | "HOMEWORK" | "EMERGENCY">("CIRCULAR");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showFeeBroadcastModal, setShowFeeBroadcastModal] = useState(false);

  // Filter available classes: if teacher has specific class, restrict to it
  const availableClasses = useMemo(() => {
    if (teacherClassId) {
      const found = classes.find((c) => c.id === teacherClassId);
      return found ? [found] : classes;
    }
    return classes;
  }, [classes, teacherClassId]);

  // Selected class display name
  const selectedClassName = useMemo(() => {
    if (selectedClassId === "all") return "Sabhi Classes (Whole School)";
    const found = classes.find((c) => c.id === selectedClassId);
    return found ? found.name : "Class";
  }, [classes, selectedClassId]);

  // Target students count
  const availableStudentsForClass = useMemo(() => {
    if (selectedClassId === "all") return students;
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Specific student targeting with SELECT ALL capability
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Keep selected students in sync when class changes (default to all selected)
  useEffect(() => {
    setSelectedStudentIds(availableStudentsForClass.map((s) => s.id));
  }, [availableStudentsForClass]);

  const targetStudents = useMemo(() => {
    if (selectedStudentIds.length === 0) return availableStudentsForClass;
    return availableStudentsForClass.filter((s) => selectedStudentIds.includes(s.id));
  }, [availableStudentsForClass, selectedStudentIds]);

  // Channel Storage
  const storageKey = `nst_school_broadcast_channel_${school?.id || "default"}`;
  const [broadcastFeed, setBroadcastFeed] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Pre-fill quick template shortcuts
  const handleApplyTemplate = (type: string) => {
    if (type === "holiday") {
      setTitle("🏫 School Avkash / Chhutti Suchna");
      setBodyText("Aadarniya Abhibhavak, kal school me avkash (holiday) rahega. Parson se niyamit kakshayein chalengi.");
      setMsgType("CIRCULAR");
    } else if (type === "exam") {
      setTitle("📝 Exam & Admit Card Alert");
      setBodyText("Sabhi chhatron ki aane wali pareeksha ka time-table aur admit card jari kar diya gaya hai. Kripya tayari shuru karein.");
      setMsgType("CIRCULAR");
    } else if (type === "fee") {
      setTitle(`📢 Fee Due Demand Slip (${formatMonthLabel("2026-11")})`);
      setBodyText("Aadarniya Abhibhavak, chalu mahine ki school fees jama karne hetu A6 Fee Demand Slip jari ki gayi hai. Kripya samay par jama karein.");
      setMsgType("FEE_DEMAND_SLIP");
    } else if (type === "homework") {
      setTitle("📚 Aaj Ka Homework & Diary Note");
      setBodyText("Kripya bache ki homework diary check karein aur diye gaye vishayon ka abhyas karye poora karwayein.");
      setMsgType("HOMEWORK");
    }
  };

  // Dispatch Broadcast with Lock-Screen Web-Push
  const handleSendBroadcast = async () => {
    if (!title.trim() || !bodyText.trim()) {
      setFeedback({ type: "err", text: "Kripya Title aur Message text dono likhein." });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      // 1. Dispatch Web-Push to all students of this class
      const pushRes = await sendSchoolPushNotification({
        schoolId: school?.id,
        classId: selectedClassId === "all" ? undefined : selectedClassId,
        studentIds: targetStudents.map((s) => s.id),
        title: `🏫 ${school?.name || "DPS School"} • ${selectedClassName}`,
        body: `${title.trim()}: ${bodyText.trim().slice(0, 100)}...`,
        type: msgType === "FEE_DEMAND_SLIP" ? "MONTHLY_FEE" : "SCHOOL_NOTICE",
        urgent: true,
      });

      // 2. Add to Local Broadcast Channel Stream
      const newBroadcast = {
        id: `broadcast_${Date.now()}`,
        schoolId: school?.id || "",
        schoolName: school?.name || "DPS School",
        classId: selectedClassId,
        className: selectedClassName,
        senderRole: currentUserRole === "ADMIN" ? "PRINCIPAL" : "TEACHER",
        senderName: currentUserName || "School Staff",
        title: title.trim(),
        text: bodyText.trim(),
        slipType: msgType,
        studentCount: targetStudents.length,
        createdAt: new Date().toISOString(),
      };

      const updated = [newBroadcast, ...broadcastFeed];
      setBroadcastFeed(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated.slice(0, 60)));
      } catch {}

      setFeedback({
        type: "ok",
        text: `✅ ${selectedClassName} ke ${targetStudents.length} chhatron ko broadcast aur Lock-screen push bhej diya gaya! (Delivered: ${pushRes.delivered})`,
      });

      setTitle("");
      setBodyText("");
    } catch (err: any) {
      console.error("Broadcast failed:", err);
      setFeedback({ type: "err", text: "Broadcast bhejte samay samasya aayi." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-slate-100 animate-in fade-in">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-950 px-4 py-4 sm:px-6 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  NSTA Messenger Broadcast Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  {currentUserRole}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                {school?.name || "School"} • 1-Way Class Broadcast &amp; Lock-Screen Push
              </p>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("broadcast")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "broadcast"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              📢 Naya Broadcast
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("feed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "feed"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              📋 Live Feed ({broadcastFeed.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("helpdesk")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "helpdesk"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              💬 Parent Helpdesk
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-black flex items-center justify-between border shadow-sm animate-in fade-in ${
              feedback.type === "ok"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "ok" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-sm font-bold opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: NEW BROADCAST CREATION */}
        {activeTab === "broadcast" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Compose Form */}
            <div className="lg:col-span-2 space-y-5 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-600" />
                  Compose Broadcast Message
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  Target: <strong>{targetStudents.length} Students</strong>
                </span>
              </div>

              {/* Class Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  Target Class Chunein
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {!teacherClassId && (
                    <button
                      type="button"
                      onClick={() => setSelectedClassId("all")}
                      className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                        selectedClassId === "all"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      Sabhi Classes (All School)
                    </button>
                  )}
                  {availableClasses.map((c) => {
                    const isSel = selectedClassId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClassId(c.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                          isSel
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Multi-Select with "SELECT ALL" / "DESELECT ALL" (Ek-ek karke na chunna pade) */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      Recipients ({targetStudents.length} / {availableStudentsForClass.length} Selected)
                    </span>
                  </div>
                  {/* SELECT ALL / DESELECT ALL ACTION BUTTON */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentIds(availableStudentsForClass.map((s) => s.id));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition cursor-pointer active:scale-95 shadow-xs"
                    >
                      ☑️ Select All (सभी चुनें)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentIds([]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer active:scale-95"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Horizontal scrollable or wrap student chips */}
                <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pt-1">
                  {availableStudentsForClass.map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                          } else {
                            setSelectedStudentIds([...selectedStudentIds, s.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border active:scale-95 ${
                          isChecked
                            ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 text-indigo-800 dark:text-indigo-200 shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${isChecked ? "bg-indigo-600 text-white" : "border border-slate-400"}`}>
                          {isChecked ? "✓" : ""}
                        </span>
                        <span>{s.name}</span>
                        {s.rollNo && <span className="opacity-60 text-[10px]">({s.rollNo})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Broadcast Type Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Message Type
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: "CIRCULAR", label: "📢 General Circular", color: "indigo" },
                    { id: "FEE_DEMAND_SLIP", label: "📄 A6 Fee Due Demand Slip", color: "amber" },
                    { id: "HOMEWORK", label: "📚 Homework / Diary", color: "purple" },
                    { id: "EMERGENCY", label: "🚨 Urgent Alert", color: "rose" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMsgType(t.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        msgType === t.id
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Broadcast Title / Subject:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Jaise: Class 8 Avkash Suchna ya A6 Fee Demand Slip"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Message Body Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Details (Lock-Screen Push me dikhega):
                </label>
                <textarea
                  rows={4}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Yahan apna sandesh likhein... Yeh parent ke phone ke lock-screen aur unke NSTA Messenger channel me seedha dikhega."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={isSending}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white font-black text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Lock-Screen Push Bhej Rahe Hain...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        🚀 Send Broadcast to {selectedClassName} ({targetStudents.length})
                      </span>
                    </>
                  )}
                </button>

                {/* Direct Class Fee Alert Studio trigger */}
                <button
                  type="button"
                  onClick={() => setShowFeeBroadcastModal(true)}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95 shrink-0"
                  title="Specific Class Dues ke liye A6 Demand Slips bhejey"
                >
                  <ReceiptText className="w-4 h-4" />
                  <span>Class Fee Slips</span>
                </button>
              </div>
            </div>

            {/* Right: Quick Templates & Guarantee Box */}
            <div className="space-y-5">
              {/* Quick Template Shortcuts */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  1-Tap Ready Templates
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Rozana ke notices ko bina type kiye 1-click me bhejey:
                </p>

                <div className="space-y-2">
                  {[
                    { key: "holiday", title: "🏖️ Holiday / Chhutti Suchna", desc: "Kal school band rahega" },
                    { key: "fee", title: "📄 Monthly Fee Demand Slip", desc: "A6 Demand slip jama notice" },
                    { key: "homework", title: "📚 Daily Homework Note", desc: "Diary submission alert" },
                    { key: "exam", title: "📝 Exam Time-Table & Admit Card", desc: "Pareeksha ki suchna" },
                  ].map((tpl) => (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.key)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50 dark:bg-slate-800/60 text-left transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                          {tpl.title}
                        </strong>
                        <span className="text-[10px] text-slate-400">{tpl.desc}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 1-Way Discipline Box */}
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-3xl p-4 text-xs space-y-2 text-indigo-950 dark:text-indigo-200">
                <div className="font-black flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                  <Lock className="w-4 h-4" />
                  <span>100% No Spam Discipline</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Is channel me students ya parents aapas me koi baat nahi kar sakte. Unke sawal sirf <strong>Helpdesk</strong> ke zariye private ticket me aayenge!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE BROADCAST FEED STREAM */}
        {activeTab === "feed" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Live Class Broadcasts ({broadcastFeed.length})
              </h3>
              <span className="text-xs text-slate-400">Lock-screen synced</span>
            </div>

            {broadcastFeed.length === 0 ? (
              <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <Bell className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Abhi tak koi broadcast nahi bheja gaya
                </h4>
                <p className="text-xs text-slate-400">
                  Upar 'Naya Broadcast' tab se pehla class notice bhejey!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {broadcastFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {item.className || "Class"}
                        </span>
                        <strong className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.senderName} ({item.senderRole})
                        </strong>
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

                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PARENT HELPDESK & QUERIES */}
        {activeTab === "helpdesk" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <ParentTeacherQueryManager
              school={school}
              students={students}
              teachers={[]}
              classes={classes}
              currentUserRole={currentUserRole}
              currentUserName={currentUserName}
              currentUserId={currentUserRole === "ADMIN" ? "admin" : "teacher"}
              onBack={() => setActiveTab("broadcast")}
            />
          </div>
        )}
      </div>

      {/* Class Fee Alert Modal (for specific dues & A6 slips) */}
      {showFeeBroadcastModal && (
        <ClassFeeAlertBroadcastModal
          isOpen={showFeeBroadcastModal}
          onClose={() => setShowFeeBroadcastModal(false)}
          school={school}
          students={students}
          fees={fees}
          classes={classes}
          currentMonth="2026-11"
          onSuccess={(msg) => setFeedback({ type: "ok", text: msg })}
        />
      )}
    </div>
  );
};
