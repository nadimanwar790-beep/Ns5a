// @ts-nocheck
import React, { useState, useMemo } from "react";
import type { School, SchoolClass, SchoolSession, SchoolStudent, MonthlyFee } from "../../school-types";
import { sortSchoolClasses } from "../../school-types";
import {
  saveStudent,
  getLocalFees,
  saveFee,
  todayStr
} from "../../school-firebase";
import {
  TrendingUp,
  ChevronLeft,
  ArrowRight,
  CheckSquare,
  Square,
  CheckCircle,
  AlertCircle,
  Users,
  Sparkles,
  RefreshCw,
  IndianRupee,
  GraduationCap
} from "lucide-react";
import { speakNotification } from "../../utils/voiceNotifyEngine";

interface Props {
  schoolId: string;
  sessions: SchoolSession[];
  classes: SchoolClass[];
  students: SchoolStudent[];
  onBack: () => void;
  onRefreshData?: () => void;
}

export type PromotionAction = "promote" | "repeat" | "alumni";

export const StudentPromotionManager: React.FC<Props> = ({
  schoolId,
  sessions,
  classes,
  students,
  onBack,
  onRefreshData,
}) => {
  const sortedClasses = useMemo(() => sortSchoolClasses(classes), [classes]);
  const [fromSessionId, setFromSessionId] = useState(sessions[0]?.id || "");
  const [fromClassId, setFromClassId] = useState(sortedClasses[0]?.id || "");
  const [toSessionId, setToSessionId] = useState(sessions[1]?.id || sessions[0]?.id || "");
  const [toClassId, setToClassId] = useState(sortedClasses[1]?.id || sortedClasses[0]?.id || "");

  // Options
  const [carryForwardDues, setCarryForwardDues] = useState(true);
  const [autoReassignRoll, setAutoReassignRoll] = useState(false);

  // Student specific selections and statuses
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, PromotionAction>>({});

  const [promoting, setPromoting] = useState(false);
  const [promoteProgress, setPromoteProgress] = useState("");
  const [promoteResult, setPromoteResult] = useState<{
    promoted: number;
    repeated: number;
    alumni: number;
    duesCarried: number;
  } | null>(null);

  // Load fees to know unpaid dues
  const allFees = useMemo(() => {
    return getLocalFees(schoolId);
  }, [schoolId]);

  // Eligible students in source session and class
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => {
      const classMatch = !fromClassId || s.classId === fromClassId;
      const sessionMatch = !fromSessionId || s.sessionId === fromSessionId;
      return classMatch && sessionMatch && s.active !== false;
    });
  }, [students, fromClassId, fromSessionId]);

  // Compute student dues map
  const duesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const st of eligibleStudents) {
      const studentFees = allFees.filter(
        (f) => f.studentId === st.id && (f.sessionId === fromSessionId || !f.sessionId)
      );
      const unpaid = studentFees.reduce((acc, f) => {
        if (f.status === "unpaid" || f.status === "partial") {
          const due = (f.amount || 0) - (f.paidAmount || 0) - (f.discount || 0);
          return acc + Math.max(0, due);
        }
        return acc;
      }, 0);
      map[st.id] = unpaid;
    }
    return map;
  }, [eligibleStudents, allFees, fromSessionId]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === eligibleStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleStudents.map((s) => s.id));
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePromote = async () => {
    if (!toClassId || !toSessionId || selectedStudentIds.length === 0) return;
    setPromoting(true);
    setPromoteResult(null);

    let promotedCount = 0;
    let repeatedCount = 0;
    let alumniCount = 0;
    let totalDues = 0;

    const targetClass = classes.find((c) => c.id === toClassId);
    let rollCounter = 1;

    try {
      const selected = eligibleStudents.filter((s) => selectedStudentIds.includes(s.id));

      for (let i = 0; i < selected.length; i++) {
        const student = selected[i];
        setPromoteProgress(`छात्र प्रमोट किए जा रहे हैं: ${student.name} (${i + 1}/${selected.length})...`);

        const action = studentStatuses[student.id] || "promote";

        if (action === "promote") {
          const isAlumni = toClassId === "ALUMNI";
          const newRoll = autoReassignRoll ? String(rollCounter++) : student.rollNo;
          const updated: SchoolStudent = {
            ...student,
            sessionId: toSessionId,
            classId: isAlumni ? student.classId : toClassId,
            className: isAlumni ? student.className : (targetClass?.name || student.className),
            rollNo: newRoll,
            active: !isAlumni
          };

          // Carry forward unpaid dues
          const dues = duesMap[student.id] || 0;
          if (carryForwardDues && dues > 0 && !isAlumni) {
            const carryFee: MonthlyFee = {
              id: `carry_${student.id}_${toSessionId}`,
              schoolId,
              studentId: student.id,
              studentName: student.name,
              classId: toClassId,
              className: targetClass?.name || student.className,
              rollNo: newRoll,
              month: "Previous Session Due (पिछला बकाया)",
              feeType: "tuition",
              receiptCategory: "previous_due",
              amount: dues,
              paidAmount: 0,
              discount: 0,
              status: "unpaid",
              paidDate: "",
              paymentMode: "cash",
              sessionId: toSessionId,
              createdAt: new Date().toISOString()
            };
            await saveFee(carryFee);
            totalDues += dues;
          }

          await saveStudent(updated);
          if (isAlumni) alumniCount++;
          else promotedCount++;
        } else if (action === "repeat") {
          const updated: SchoolStudent = {
            ...student,
            sessionId: toSessionId,
            classId: fromClassId,
            active: true
          };
          await saveStudent(updated);
          repeatedCount++;
        } else if (action === "alumni") {
          const updated: SchoolStudent = {
            ...student,
            active: false
          };
          await saveStudent(updated);
          alumniCount++;
        }
      }

      setPromoteResult({
        promoted: promotedCount,
        repeated: repeatedCount,
        alumni: alumniCount,
        duesCarried: totalDues
      });

      speakNotification(
        "सत्र प्रमोशन पूर्ण",
        `${promotedCount} छात्रों को सफलतापूर्वक अगली कक्षा में प्रमोट कर दिया गया है।`
      );

      setSelectedStudentIds([]);
      onRefreshData?.();
    } catch (err: any) {
      console.error("Promotion error:", err);
      alert("Error promoting students: " + (err?.message || "Unknown error"));
    } finally {
      setPromoting(false);
      setPromoteProgress("");
    }
  };

  const sourceClassName = classes.find((c) => c.id === fromClassId)?.name || "Current Class";
  const targetClassName = toClassId === "ALUMNI" ? "Alumni / TC" : (classes.find((c) => c.id === toClassId)?.name || "Target Class");
  const sourceSessionName = sessions.find((s) => s.id === fromSessionId)?.name || "Current Session";
  const targetSessionName = sessions.find((s) => s.id === toSessionId)?.name || "Target Session";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-violet-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm font-bold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> स्कूल डैशबोर्ड पर लौटें
          </button>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
            🎓 Annual Roll-Over Engine
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-indigo-600" />
            छात्र वार्षिक सत्र प्रमोशन प्रणाली (Student Promotion & Dues Carryover)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            वार्षिक परीक्षा के बाद सभी पास छात्रों को एक क्लिक में नए सत्र व अगली कक्षा में प्रमोट करें, पुराना बकाया फीस सहित।
          </p>
        </div>

        {/* Source and Destination Session/Class Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FROM BOX */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full">
              चरण 1: कहाँ से प्रमोट करना है (Source)
            </span>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">सत्र (Session):</label>
                <select
                  value={fromSessionId}
                  onChange={(e) => {
                    setFromSessionId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.active ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">वर्तमान कक्षा:</label>
                <select
                  value={fromClassId}
                  onChange={(e) => {
                    setFromClassId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TO BOX */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-sm space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
              चरण 2: किस कक्षा में भेजना है (Target)
            </span>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">नया सत्र (Target):</label>
                <select
                  value={toSessionId}
                  onChange={(e) => setToSessionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  {!sessions.some((s) => s.id === "2027-28") && (
                    <option value="2027-28">Session 2027-28 (नया सत्र)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">अगली कक्षा (Target Class):</label>
                <select
                  value={toClassId}
                  onChange={(e) => setToClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                  <option value="ALUMNI">🎓 उत्तीर्ण / पास आउट (Alumni)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={carryForwardDues}
              onChange={(e) => setCarryForwardDues(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
            />
            <span className="font-bold text-slate-800 dark:text-white">
              पिछला बकाया फीस नए सत्र में कैरी-फॉरवर्ड करें (Transfer Unpaid Dues)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoReassignRoll}
              onChange={(e) => setAutoReassignRoll(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
            />
            <span className="font-bold text-slate-800 dark:text-white">
              रोल नंबर स्वतः क्रमबद्ध (1, 2, 3...) री-असाइन करें
            </span>
          </label>
        </div>

        {/* Promotion Arrow Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">प्रमोशन रूट (Promotion Route)</p>
              <p className="text-base font-black">
                {sourceClassName} ({sourceSessionName}) <span className="mx-2">➔</span> {targetClassName} ({targetSessionName})
              </p>
            </div>
          </div>
          <button
            onClick={handlePromote}
            disabled={promoting || selectedStudentIds.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 bg-white text-indigo-700 font-black text-xs rounded-xl shadow hover:bg-indigo-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shrink-0"
          >
            {promoting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{promoteProgress || "प्रमोट हो रहा है..."}</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4" />
                <span>चयनित छात्र प्रमोट करें ({selectedStudentIds.length})</span>
              </>
            )}
          </button>
        </div>

        {promoteResult && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-bold">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                🎉 सफलता! {promoteResult.promoted} छात्र {targetClassName} में प्रमोट हुए, {promoteResult.repeated} रिपीट किए गए।
                {promoteResult.duesCarried > 0 && ` कुल ₹${promoteResult.duesCarried.toLocaleString("en-IN")} बकाया नए सत्र में ट्रांसफर हुआ।`}
              </span>
            </div>
          </div>
        )}

        {/* Student Checklist */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b dark:border-slate-700">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              {selectedStudentIds.length === eligibleStudents.length && eligibleStudents.length > 0 ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedStudentIds.length === eligibleStudents.length && eligibleStudents.length > 0
                ? "सभी अन-सिलेक्ट करें"
                : "सभी छात्रों को चुनें"} ({eligibleStudents.length})
            </button>
            <span className="text-xs text-slate-400">
              {selectedStudentIds.length} छात्र चुने गए
            </span>
          </div>

          {eligibleStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              इस कक्षा/सत्र में कोई सक्रिय छात्र नहीं मिले।
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {eligibleStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                const dues = duesMap[student.id] || 0;
                const status = studentStatuses[student.id] || "promote";

                return (
                  <div
                    key={student.id}
                    className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/30 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => toggleStudent(student.id)}
                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="text-indigo-600 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-white text-xs truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Roll #{student.rollNo || "-"} {student.fatherName ? `• ${student.fatherName}` : ""}
                          </p>
                        </div>
                      </div>

                      {dues > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                          ₹{dues} बकाया
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                          Clear
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">प्रमोशन स्थिति:</span>
                      <select
                        value={status}
                        onChange={(e) => {
                          const val = e.target.value as PromotionAction;
                          setStudentStatuses((prev) => ({ ...prev, [student.id]: val }));
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-0 cursor-pointer"
                      >
                        <option value="promote">🎓 प्रमोट (Next Class)</option>
                        <option value="repeat">🔁 रिपीट (उसी कक्षा में)</option>
                        <option value="alumni">📜 पास आउट / TC</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
