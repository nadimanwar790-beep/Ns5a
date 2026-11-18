// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  X,
  Bell,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Loader2,
  Sparkles,
  Phone,
  Percent,
  IndianRupee,
  Minus,
  Plus,
  Save,
  Trash2,
  Calendar,
} from "lucide-react";
import type { School, SchoolStudent, SchoolClass, MonthlyFee, FeeDiscountSlab } from "../../school-types";
import { formatMonthLabel } from "../../utils/feeFifoAllocation";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { autoSendFeeSlipToSchoolDesk } from "../../school-firebase";
import {
  getSchoolFeeDiscountSlabs,
  saveSchoolFeeDiscountSlabs,
  normalizeFeeDiscountSlabs,
  computeSlabDiscountAmount,
  resolveSlabForDay,
  formatSlabsHeadline,
} from "../../utils/feeDiscountSlabs";

export interface ClassFeeAlertBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  students: SchoolStudent[];
  fees: MonthlyFee[];
  classes: SchoolClass[];
  currentMonth: string;
  onSuccess?: (msg: string) => void;
  onViewStudentFeeSlip?: (fee: MonthlyFee, student: SchoolStudent) => void;
}

export const ClassFeeAlertBroadcastModal: React.FC<ClassFeeAlertBroadcastModalProps> = ({
  isOpen,
  onClose,
  school,
  students,
  fees,
  classes,
  currentMonth,
  onSuccess,
  onViewStudentFeeSlip,
}) => {
  // Selected class for class-wise broadcast (Strictly isolated!)
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [includeA6Slip, setIncludeA6Slip] = useState(true);
  const [customRemark, setCustomRemark] = useState("");

  // Multi-Tier Date-Limited Fee Discount Slabs (Only applied when paid within date!)
  const [discountSlabs, setDiscountSlabs] = useState<FeeDiscountSlab[]>(() =>
    getSchoolFeeDiscountSlabs(school?.id, school)
  );
  const [savingSlabs, setSavingSlabs] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDiscountSlabs(getSchoolFeeDiscountSlabs(school?.id, school));
    }
  }, [isOpen, school?.id]);

  const monthLabel = useMemo(() => formatMonthLabel(currentMonth), [currentMonth]);

  // Map of class names
  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [classes]);

  // Class list with stats (total students, due count, total due amount)
  const classStats = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      studentCount: number;
      dueCount: number;
      totalDue: number;
    }> = [];

    const allDueStudents = fees.filter((f) => {
      const bal = Number(f.balanceDue !== undefined ? f.balanceDue : (f.amount || 0) - Number(f.paidAmount || 0));
      return !f.paid || bal > 0;
    });
    const allTotalDue = allDueStudents.reduce((sum, f) => {
      const bal = Number(f.balanceDue !== undefined ? f.balanceDue : (f.amount || 0) - Number(f.paidAmount || 0));
      return sum + Math.max(0, bal);
    }, 0);

    list.push({
      id: "all",
      name: "Sabhi Classes (All School)",
      studentCount: students.length,
      dueCount: allDueStudents.length,
      totalDue: allTotalDue,
    });

    classes.forEach((c) => {
      const classSts = students.filter((s) => s.classId === c.id);
      const classFees = fees.filter((f) => f.classId === c.id || classSts.some((s) => s.id === f.studentId));
      const dueFees = classFees.filter((f) => {
        const bal = Number(f.balanceDue !== undefined ? f.balanceDue : (f.amount || 0) - Number(f.paidAmount || 0));
        return !f.paid || bal > 0;
      });
      const dueAmt = dueFees.reduce((sum, f) => {
        const bal = Number(f.balanceDue !== undefined ? f.balanceDue : (f.amount || 0) - Number(f.paidAmount || 0));
        return sum + Math.max(0, bal);
      }, 0);

      list.push({
        id: c.id,
        name: c.name,
        studentCount: classSts.length,
        dueCount: dueFees.length,
        totalDue: dueAmt,
      });
    });

    return list;
  }, [classes, students, fees]);

  // Filtered defaulter students based on selected class
  const classDefaulters = useMemo(() => {
    return fees
      .map((f) => {
        const st = students.find((s) => s.id === f.studentId);
        const bal = Number(
          f.balanceDue !== undefined
            ? f.balanceDue
            : (Number(f.monthlyAmount || f.amount || 0) - Number(f.paidAmount || 0))
        );
        const resolvedClassId = f.classId || st?.classId || "";
        const resolvedClassName = classNameMap[resolvedClassId] || (st as any)?.className || "Class";

        return {
          fee: f,
          student: st,
          studentId: f.studentId,
          studentName: f.studentName || st?.name || "Student",
          classId: resolvedClassId,
          className: resolvedClassName,
          rollNo: f.rollNo || st?.rollNo || "",
          admissionNo: st?.admissionNo || (st as any)?.admNo || "—",
          parentPhone: st?.phone || (st as any)?.whatsappNo || (st as any)?.fatherPhone || f.phone || "",
          pendingDue: Math.max(0, bal),
          isPaid: Boolean(f.paid && bal <= 0),
        };
      })
      .filter((item) => {
        if (item.pendingDue <= 0 || item.isPaid) return false;
        if (selectedClassId === "all") return true;
        return item.classId === selectedClassId;
      });
  }, [fees, students, selectedClassId, classNameMap]);

  // Reset selected student IDs when class filter changes
  React.useEffect(() => {
    setSelectedStudentIds(classDefaulters.map((d) => d.studentId));
  }, [classDefaulters.length, selectedClassId]);

  if (!isOpen) return null;

  const currentClassObj = classStats.find((c) => c.id === selectedClassId) || classStats[0];
  const allSelected =
    classDefaulters.length > 0 && selectedStudentIds.length === classDefaulters.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(classDefaulters.map((d) => d.studentId));
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const normalizedSlabs = normalizeFeeDiscountSlabs(discountSlabs);
  const slabsHeadline = formatSlabsHeadline(normalizedSlabs);

  const handleAddSlab = () => {
    const maxDay = discountSlabs.reduce((m, s) => Math.max(m, Number(s.uptoDay) || 0), 0);
    const nextDay = maxDay === 0 ? 1 : maxDay < 5 ? 5 : maxDay < 10 ? 10 : Math.min(31, maxDay + 5);
    const lastVal = discountSlabs.length > 0 ? discountSlabs[discountSlabs.length - 1].discountValue : 10;
    const nextVal = discountSlabs.length === 0 ? 10 : Math.max(1, Math.round(lastVal / 2));
    setDiscountSlabs((prev) => [
      ...prev,
      {
        id: `slab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uptoDay: nextDay,
        discountType: "percent",
        discountValue: nextVal,
      },
    ]);
  };

  const handleUpdateSlab = (id: string, patch: Partial<FeeDiscountSlab>) => {
    setDiscountSlabs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleRemoveSlab = (id: string) => {
    setDiscountSlabs((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveSlabsOnly = async () => {
    setSavingSlabs(true);
    setBroadcastSuccessMsg(null);
    try {
      const saved = await saveSchoolFeeDiscountSlabs(school?.id || "default", discountSlabs);
      setDiscountSlabs(saved);
      const summary = formatSlabsHeadline(saved);
      const msg = summary
        ? `✅ Discount Date Rules Save ho gaye: ${summary} (अंतिम तिथि के बाद पूरा भुगतान देय होगा)`
        : `✅ Discount Offers band kar diye gaye (Ab sabhi students se poora fee liya jayega).`;
      setBroadcastSuccessMsg(msg);
      if (onSuccess) onSuccess(msg);
    } catch (err: any) {
      setBroadcastSuccessMsg(`❌ Rule save karne me samasya: ${err?.message || "Punah prayas karein"}`);
    } finally {
      setSavingSlabs(false);
    }
  };

  // Execute Class-Wise Broadcast with Lock-screen Push & In-App Channel Message
  const handleExecuteBroadcast = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsBroadcasting(true);
    setBroadcastSuccessMsg(null);

    try {
      // Save the configured date slabs so Payment Counter & Online Slips enforce the exact same dates!
      const savedSlabs = await saveSchoolFeeDiscountSlabs(school?.id || "default", discountSlabs);
      setDiscountSlabs(savedSlabs);

      const targetClassName =
        selectedClassId === "all" ? "Sabhi Classes" : (currentClassObj?.name || "Class");
      const schoolTitle = school?.name || "DPS School";

      const slabNoticeLine = formatSlabsHeadline(savedSlabs);
      const notifBody = slabNoticeLine
        ? `📢 ${monthLabel} फीस सूचना: ⚡ अर्ली पेमेंट छूट: ${slabNoticeLine}। (तय तारीख के बाद स्लिप की पूरी राशि देय होगी)। A6 Fee Demand Slip देखें।`
        : `📢 ${monthLabel} Mahine ki fees jama karne hetu A6 Fee Demand Slip jari ki gayi hai. Kripya samay par poora shulk jama karein.`;

      const pushResult = await sendSchoolPushNotification({
        schoolId: school?.id,
        classId: selectedClassId === "all" ? undefined : selectedClassId,
        studentIds: selectedStudentIds,
        title: `🏫 ${schoolTitle} • ${targetClassName} Fee Alert`,
        body: notifBody,
        type: "MONTHLY_FEE",
        url: `/?schoolPortal=1&schoolTab=fees`,
        urgent: true,
      });

      const broadcastEntry = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        schoolId: school?.id || "school",
        schoolName: schoolTitle,
        classId: selectedClassId,
        className: targetClassName,
        senderRole: "ACCOUNTANT",
        senderName: "School Fee Accounts Desk",
        title: `📢 ${targetClassName} • Fee Demand Slip (${monthLabel})`,
        text:
          customRemark.trim() ||
          (slabNoticeLine
            ? `Aadarniya Abhibhavak, ${monthLabel} mahine ki school fees hetu A6 Fee Demand Slip jari kar di gayi hai. ⚡ Discount Offer: ${slabNoticeLine}. Tay tarikh ke andar jama karne par hi chhoot milegi, anyatha slip par likha poora payment jama karna hoga.`
            : `Aadarniya Abhibhavak, ${monthLabel} mahine ki school fees jama karne hetu A6 Fee Demand Slip jari kar di gayi hai. Niche diye gaye link se slip dekhein ya direct UPI/WhatsApp se jama karein.`),
        slipType: "A6_DEMAND_SLIP",
        month: currentMonth,
        monthLabel,
        studentCount: selectedStudentIds.length,
        createdAt: new Date().toISOString(),
      };

      const storageKey = `nst_school_broadcast_channel_${school?.id || "default"}`;
      try {
        const raw = localStorage.getItem(storageKey);
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(broadcastEntry);
        localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 50)));
      } catch {}

      const todayDay = new Date().getDate();

      // Auto-deliver A6 Fee Demand Slip directly to student's NSTA Messenger School Desk
      // NOTE: Full balanceDue is ALWAYS kept on the slip — discount applies ONLY if paid within slab date!
      selectedStudentIds.forEach((stId) => {
        const studentObj = students.find((s) => s.id === stId);
        const defItem = classDefaulters.find((d) => d.studentId === stId);
        if (!defItem) return;
        const dueBalance = Number(defItem.pendingDue || 500);
        const feeObj = defItem.fee;
        const currentMonthFee = Number(feeObj?.monthlyAmount || feeObj?.amount || dueBalance);
        const oldArrears = Math.max(0, Number(feeObj?.previousDue || Math.max(0, dueBalance - currentMonthFee)));

        const todaySlabMatch = resolveSlabForDay(savedSlabs, todayDay, currentMonthFee);
        const earlyDiscount = todaySlabMatch.discountAmount;
        const netPayableIfPaidToday = earlyDiscount > 0 ? Math.max(0, dueBalance - earlyDiscount) : dueBalance;

        const studentClass = studentObj?.className || targetClassName || (studentObj?.classId ? `Class ${studentObj.classId}` : "Class");
        const studentRoll = studentObj?.rollNo || defItem?.rollNo || "";
        const studentAdmission = studentObj?.admissionNo || "";
        const feeBreakdown = (feeObj as any)?.items || (feeObj as any)?.breakdown || undefined;

        autoSendFeeSlipToSchoolDesk({
          schoolId: school?.id || "school",
          studentId: stId,
          studentName: studentObj?.name || defItem?.studentName || "Student",
          className: studentClass,
          rollNo: studentRoll,
          admissionNo: studentAdmission,
          feeItems: feeBreakdown,
          slipType: "A6_DEMAND_SLIP",
          month: currentMonth,
          monthLabel,
          amount: currentMonthFee,
          balanceDue: dueBalance,
          monthlyAmount: currentMonthFee,
          oldArrears,
          earlyDiscount,
          netPayableWithDiscount: netPayableIfPaidToday,
          discountLabel: todaySlabMatch.label || undefined,
          discountSlabs: savedSlabs,
          dueDate:
            savedSlabs.length > 0
              ? `${savedSlabs[savedSlabs.length - 1].uptoDay} तारीख तक`
              : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          payLink: school?.bankUpiId
            ? `upi://pay?pa=${school.bankUpiId}&pn=${encodeURIComponent(school?.name || "School")}&am=${netPayableIfPaidToday}`
            : undefined,
        }).catch(() => {});
      });

      const msg = `✅ ${targetClassName} ke ${selectedStudentIds.length} chhatron ke parents ko A6 Fee Demand Slip & Date-Limited Discount Alert bhej diya gaya! ${pushResult.delivered > 0 ? `(Delivered: ${pushResult.delivered})` : `(Queued on Device)`}`;
      setBroadcastSuccessMsg(msg);
      if (onSuccess) onSuccess(msg);

      setTimeout(() => {
        setBroadcastSuccessMsg(null);
        onClose();
      }, 3500);
    } catch (err: any) {
      console.error("Broadcast failed:", err);
      setBroadcastSuccessMsg(`❌ Alert bhejne me samasya: ${err?.message || "Kripya punah prayas karein"}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  Class Fee Alert &amp; Broadcast
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-300">
                  👑 PRO PLAN
                </span>
              </div>
              <p className="text-xs text-indigo-200 font-medium mt-0.5">
                NSTA Messenger • Class-Wise Push &amp; A6 Fee Demand Slips
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Banner */}
          {broadcastSuccessMsg && (
            <div
              className={`p-3.5 rounded-2xl ${
                broadcastSuccessMsg.startsWith("❌")
                  ? "bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                  : "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              } text-xs font-bold flex items-center gap-2.5 animate-in fade-in`}
            >
              {broadcastSuccessMsg.startsWith("❌") ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <span>{broadcastSuccessMsg}</span>
            </div>
          )}

          {/* STEP 1: CLASS SELECTION (STRICT ISOLATION) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-indigo-600" />
                Target Class Chunein (Class-Wise Segment)
              </label>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                Sirf isi class ko jayega ✓
              </span>
            </div>

            {/* Scrollable Class Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {classStats.map((c) => {
                const isSelected = selectedClassId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClassId(c.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{c.name}</span>
                    {c.dueCount > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected
                            ? "bg-white text-indigo-700"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {c.dueCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Summary of Selected Class */}
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-200">
              <div>
                <span>Selected: <strong>{currentClassObj.name}</strong></span>
                <span className="mx-2">•</span>
                <span>Pending Fees Wale: <strong>{currentClassObj.dueCount} Students</strong></span>
              </div>
              <strong className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                ₹{currentClassObj.totalDue.toLocaleString("en-IN")} Dues
              </strong>
            </div>
          </div>

          {/* STEP 2: SLIP ATTACHMENT & DATE-LIMITED DISCOUNT SLABS */}
          <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                  Automatic Document Attachment
                </h4>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeA6Slip}
                  onChange={(e) => setIncludeA6Slip(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>📄 A6 Fee Demand Slip (105×148.5mm)</span>
              </label>
            </div>

            {/* Multi-Tier Date-Limited Fee Discount Builder */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/95 border border-emerald-300 dark:border-emerald-700/60 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      तारीख के अनुसार Fee Discount कम-बेसी करें (Date-Limited Offers)
                    </h5>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                      स्लिप पर <strong>पूरा बकाया (Full Fee)</strong> ही दिखेगा। यदि अभिभावक तय तारीख तक पेमेंट करेंगे तभी छूट मिलेगी, वरना पूरा भुगतान करना होगा।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSlabsOnly}
                  disabled={savingSlabs}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50 transition shadow-xs shrink-0"
                  title="ये तारीख व छूट नियम पेमेंट काउंटर व स्लिप के लिए सेव करें"
                >
                  {savingSlabs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>Save Dates</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="font-bold text-slate-500 dark:text-slate-400 mr-1">Quick Set:</span>
                <button
                  type="button"
                  onClick={() => setDiscountSlabs([])}
                  className={`px-2 py-1 rounded-lg font-bold border transition cursor-pointer ${
                    discountSlabs.length === 0
                      ? "bg-rose-600 text-white border-rose-500"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  कोई छूट नहीं (0)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDiscountSlabs([
                      { id: `slab_10_${Date.now()}`, uptoDay: 10, discountType: "percent", discountValue: 5 },
                    ])
                  }
                  className="px-2 py-1 rounded-lg font-bold border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  10 तारीख तक 5%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDiscountSlabs([
                      { id: `slab_1_${Date.now()}`, uptoDay: 1, discountType: "percent", discountValue: 10 },
                      { id: `slab_5_${Date.now() + 1}`, uptoDay: 5, discountType: "percent", discountValue: 5 },
                      { id: `slab_10_${Date.now() + 2}`, uptoDay: 10, discountType: "percent", discountValue: 3 },
                    ])
                  }
                  className="px-2 py-1 rounded-lg font-bold border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                >
                  ⚡ 1 तक 10% • 5 तक 5% • 10 तक 3%
                </button>
              </div>

              {/* Dynamic Date + Discount Slabs List */}
              <div className="space-y-2">
                {discountSlabs.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-dashed border-slate-300 dark:border-slate-700 text-center text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                    अभी कोई छूट ऑफर सक्रिय नहीं है — स्लिप पर लिखा पूरा शुल्क ही देय होगा।
                  </div>
                ) : (
                  discountSlabs.map((slab, idx) => (
                    <div
                      key={slab.id}
                      className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white tabular-nums">
                          #{idx + 1}
                        </span>

                        {/* Day Selector (1..31) */}
                        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSlab(slab.id, { uptoDay: Math.max(1, (Number(slab.uptoDay) || 1) - 1) })
                            }
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white flex items-center justify-center cursor-pointer"
                            title="तारीख कम करें"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={slab.uptoDay}
                            onChange={(e) => {
                              const d = Math.max(1, Math.min(31, Number(e.target.value) || 1));
                              handleUpdateSlab(slab.id, { uptoDay: d });
                            }}
                            className="w-10 text-center text-xs font-black tabular-nums bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSlab(slab.id, { uptoDay: Math.min(31, (Number(slab.uptoDay) || 1) + 1) })
                            }
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white flex items-center justify-center cursor-pointer"
                            title="तारीख बढ़ाएं"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1.5">
                            तारीख तक
                          </span>
                        </div>

                        <span className="text-xs font-black text-slate-400">→</span>

                        {/* Discount Value Stepper */}
                        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const step = slab.discountType === "percent" ? 1 : 50;
                              handleUpdateSlab(slab.id, {
                                discountValue: Math.max(0, (Number(slab.discountValue) || 0) - step),
                              });
                            }}
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 text-slate-800 dark:text-white flex items-center justify-center cursor-pointer"
                            title="छूट कम करें"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={slab.discountType === "percent" ? 100 : 100000}
                            value={slab.discountValue}
                            onChange={(e) => {
                              const raw = Number(e.target.value) || 0;
                              const clamped =
                                slab.discountType === "percent" ? Math.max(0, Math.min(100, raw)) : Math.max(0, raw);
                              handleUpdateSlab(slab.id, { discountValue: clamped });
                            }}
                            className="w-12 text-center text-xs font-black tabular-nums bg-transparent text-emerald-700 dark:text-emerald-300 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const step = slab.discountType === "percent" ? 1 : 50;
                              const maxVal = slab.discountType === "percent" ? 100 : 100000;
                              handleUpdateSlab(slab.id, {
                                discountValue: Math.min(maxVal, (Number(slab.discountValue) || 0) + step),
                              });
                            }}
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 text-slate-800 dark:text-white flex items-center justify-center cursor-pointer"
                            title="छूट बढ़ाएं"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* % vs ₹ Toggle per Slab */}
                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSlab(slab.id, {
                                discountType: "percent",
                                discountValue: slab.discountValue > 100 ? 10 : slab.discountValue,
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center ${
                              slab.discountType === "percent"
                                ? "bg-emerald-600 text-white"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <Percent className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSlab(slab.id, {
                                discountType: "fixed",
                                discountValue: slab.discountValue <= 20 ? 100 : slab.discountValue,
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center ${
                              slab.discountType === "fixed"
                                ? "bg-emerald-600 text-white"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <IndianRupee className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSlab(slab.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                        title="यह डेट ऑफर हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={handleAddSlab}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>एक और तारीख व छूट जोड़ें (Add More Date Discount)</span>
                </button>
              </div>

              {slabsHeadline && (
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    स्लिप नोटिस: <strong>{slabsHeadline}</strong> • इसके बाद पूरा बकाया देय।
                  </span>
                </div>
              )}
            </div>

            {/* Custom Admin Note / Circular Text */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Khas Suchna / Custom Note (Optional):
              </label>
              <input
                type="text"
                value={customRemark}
                onChange={(e) => setCustomRemark(e.target.value)}
                placeholder="Jaise: Kripya tay tarikh ke andar fees jama karke chhoot ka labh uthayein."
                className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* STEP 3: DEFAULTER STUDENTS LIST (TARGET RECIPIENTS) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-black text-slate-800 dark:text-white">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>
                  Praptkarta Chhatra ({selectedStudentIds.length}/{classDefaulters.length})
                </span>
              </div>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {allSelected ? "Sabhi Deselect Karein" : "Sabhi Select Karein"}
              </button>
            </div>

            {classDefaulters.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h5 className="text-xs font-black text-slate-800 dark:text-white">
                  Sabhi Fees Jama Hai!
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chuni hui class me kisi bhi chhatra par koi fees baki nahi hai.
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800/50">
                {classDefaulters.map((item) => {
                  const isChecked = selectedStudentIds.includes(item.studentId);
                  const curMonthFee = Number(item.fee?.monthlyAmount || item.fee?.amount || item.pendingDue);
                  return (
                    <div
                      key={item.studentId}
                      className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
                    >
                      <label className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudent(item.studentId)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {item.studentName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                              Roll: {item.rollNo || "—"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                              {item.className}
                            </span>
                          </div>
                          {item.parentPhone && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              {item.parentPhone}
                            </p>
                          )}
                          {normalizedSlabs.length > 0 && (
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                              {normalizedSlabs
                                .slice(0, 3)
                                .map((s) => {
                                  const dAmt = computeSlabDiscountAmount(s, curMonthFee);
                                  const net = Math.max(0, item.pendingDue - dAmt);
                                  return `${s.uptoDay} तक: ₹${net.toLocaleString("en-IN")}`;
                                })
                                .join(" • ")}
                            </p>
                          )}
                        </div>
                      </label>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">
                            Slip Full Due
                          </span>
                          <strong className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                            ₹{item.pendingDue.toLocaleString("en-IN")}
                          </strong>
                        </div>
                        {onViewStudentFeeSlip && item.student && (
                          <button
                            type="button"
                            onClick={() => onViewStudentFeeSlip(item.fee, item.student)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                            title="A6 Demand Slip Dekhein"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isBroadcasting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteBroadcast}
            disabled={isBroadcasting || selectedStudentIds.length === 0}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isBroadcasting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Class Push Alert Bhej Rahe Hain...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  🚀 Broadcast Fee Alerts ({selectedStudentIds.length} Students)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
