// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Users,
  Calendar,
  Sparkles,
  X,
  FileCheck,
  CheckSquare,
  Square,
  IndianRupee,
  RefreshCw,
  Search,
  Filter,
  Award
} from "lucide-react";
import {
  School,
  SchoolSession,
  SchoolClass,
  SchoolStudent,
  MonthlyFee
} from "../../school-types";
import {
  getStudents,
  getLocalStudents,
  saveStudent,
  setLocalStudents,
  getLocalFees,
  saveFee,
  todayStr
} from "../../school-firebase";
import { speakNotification } from "../../utils/voiceNotifyEngine";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School | null;
  sessions: SchoolSession[];
  classes: SchoolClass[];
  currentSession: SchoolSession | null;
  onSuccess?: () => void;
}

export type StudentPromotionStatus = "promote" | "repeat" | "alumni";

interface StudentPromotionItem {
  student: SchoolStudent;
  selected: boolean;
  status: StudentPromotionStatus;
  pendingDues: number;
  newRollNo?: string;
}

export const SessionRollOverModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  sessions,
  classes,
  currentSession,
  onSuccess
}) => {
  const schoolId = school?.id || "SCH-001";

  // Step state: 1 = Selection & Mapping, 2 = Student Review, 3 = Confirmation & Execution
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selected source & target sessions
  const [fromSessionId, setFromSessionId] = useState<string>(
    currentSession?.id || (sessions[0]?.id || "2026-27")
  );
  const [toSessionId, setToSessionId] = useState<string>(() => {
    const next = sessions.find((s) => s.id !== (currentSession?.id || "2026-27"));
    return next?.id || "2027-28";
  });

  // Selected source & target classes
  const [fromClassId, setFromClassId] = useState<string>(classes[0]?.id || "");
  const [toClassId, setToClassId] = useState<string>("");

  // Student items for promotion
  const [studentsList, setStudentsList] = useState<StudentPromotionItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Carry forward unpaid dues option
  const [carryForwardDues, setCarryForwardDues] = useState<boolean>(true);
  // Auto sequential roll number option
  const [autoReassignRollNo, setAutoReassignRollNo] = useState<boolean>(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<{
    promotedCount: number;
    repeatedCount: number;
    alumniCount: number;
    totalDuesCarried: number;
  } | null>(null);

  // Auto-suggest next class when fromClassId changes
  useEffect(() => {
    if (!fromClassId || classes.length === 0) return;
    const currentIndex = classes.findIndex((c) => c.id === fromClassId);
    if (currentIndex >= 0 && currentIndex + 1 < classes.length) {
      setToClassId(classes[currentIndex + 1].id);
    } else {
      setToClassId("ALUMNI");
    }
  }, [fromClassId, classes]);

  // Load students for selected source session & class
  useEffect(() => {
    if (!isOpen || !fromClassId) return;

    let isMounted = true;
    setLoadingStudents(true);

    const loadData = async () => {
      try {
        const fromClass = classes.find((c) => c.id === fromClassId);
        const fetched = await getStudents(
          schoolId,
          fromClassId,
          fromClass?.name,
          fromSessionId
        );
        const fallback = fetched.length > 0 ? fetched : getLocalStudents(schoolId).filter(
          (s) => s.classId === fromClassId && s.active !== false
        );

        // Fetch all fees to calculate pending dues for each student
        const allFees = getLocalFees(schoolId);

        if (isMounted) {
          const items: StudentPromotionItem[] = fallback.map((st) => {
            const studentFees = allFees.filter(
              (f) => f.studentId === st.id && (f.sessionId === fromSessionId || !f.sessionId)
            );
            const unpaidTotal = studentFees.reduce((acc, f) => {
              if (f.status === "unpaid" || f.status === "partial") {
                const due = (f.amount || 0) - (f.paidAmount || 0) - (f.discount || 0);
                return acc + Math.max(0, due);
              }
              return acc;
            }, 0);

            return {
              student: st,
              selected: true,
              status: "promote",
              pendingDues: unpaidTotal,
              newRollNo: st.rollNo
            };
          });

          setStudentsList(items);
        }
      } catch (err) {
        console.error("Error loading students for promotion:", err);
      } finally {
        if (isMounted) setLoadingStudents(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, fromClassId, fromSessionId, schoolId, classes]);

  if (!isOpen) return null;

  const fromClassObj = classes.find((c) => c.id === fromClassId);
  const toClassObj = classes.find((c) => c.id === toClassId);
  const fromSessionObj = sessions.find((s) => s.id === fromSessionId) || { name: fromSessionId };
  const toSessionObj = sessions.find((s) => s.id === toSessionId) || { name: toSessionId };

  // Filtered students by search
  const filteredStudents = studentsList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.student.name.toLowerCase().includes(q) ||
      (item.student.rollNo && item.student.rollNo.toLowerCase().includes(q)) ||
      (item.student.fatherName && item.student.fatherName.toLowerCase().includes(q))
    );
  });

  const selectedCount = studentsList.filter((s) => s.selected).length;
  const totalDuesForSelected = studentsList
    .filter((s) => s.selected && s.status === "promote")
    .reduce((sum, s) => sum + s.pendingDues, 0);

  const toggleSelectAll = (checked: boolean) => {
    setStudentsList((prev) => prev.map((s) => ({ ...s, selected: checked })));
  };

  const updateStudentStatus = (studentId: string, status: StudentPromotionStatus) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.student.id === studentId ? { ...s, status } : s))
    );
  };

  const setAllStatus = (status: StudentPromotionStatus) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.selected ? { ...s, status } : s))
    );
  };

  // Execute promotion
  const handleExecutePromotion = async () => {
    if (selectedCount === 0) {
      alert("कृपया प्रमोट करने के लिए कम से कम 1 छात्र चुनें!");
      return;
    }

    setIsExecuting(true);
    setProgressMsg("सत्र प्रमोशन प्रक्रिया शुरू हो रही है...");

    let promoted = 0;
    let repeated = 0;
    let alumni = 0;
    let duesCarried = 0;

    try {
      const selectedItems = studentsList.filter((s) => s.selected);
      let rollCounter = 1;

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const student = item.student;
        setProgressMsg(
          `छात्र प्रमोट किए जा रहे हैं: ${student.name} (${i + 1}/${selectedItems.length})...`
        );

        if (item.status === "promote") {
          const isAlumni = toClassId === "ALUMNI";
          const updatedStudent: SchoolStudent = {
            ...student,
            sessionId: toSessionId,
            classId: isAlumni ? student.classId : toClassId,
            className: isAlumni ? student.className : (toClassObj?.name || student.className),
            rollNo: autoReassignRollNo ? String(rollCounter++) : (item.newRollNo || student.rollNo),
            active: !isAlumni
          };

          // Carry forward unpaid dues
          if (carryForwardDues && item.pendingDues > 0 && !isAlumni) {
            const carryOverFee: MonthlyFee = {
              id: `carry_${student.id}_${toSessionId}`,
              schoolId,
              studentId: student.id,
              studentName: student.name,
              classId: toClassId,
              className: toClassObj?.name || student.className,
              rollNo: updatedStudent.rollNo,
              month: "Previous Session Due (सत्र बकाया)",
              feeType: "tuition",
              receiptCategory: "previous_due",
              amount: item.pendingDues,
              paidAmount: 0,
              discount: 0,
              status: "unpaid",
              paidDate: "",
              paymentMode: "cash",
              sessionId: toSessionId,
              createdAt: new Date().toISOString()
            };
            await saveFee(carryOverFee);
            duesCarried += item.pendingDues;
          }

          await saveStudent(updatedStudent);
          if (isAlumni) alumni++;
          else promoted++;
        } else if (item.status === "repeat") {
          // Repeat student stays in same class but moves to next session
          const updatedStudent: SchoolStudent = {
            ...student,
            sessionId: toSessionId,
            classId: fromClassId,
            className: fromClassObj?.name || student.className,
            rollNo: autoReassignRollNo ? String(rollCounter++) : (item.newRollNo || student.rollNo),
            active: true
          };
          await saveStudent(updatedStudent);
          repeated++;
        } else if (item.status === "alumni") {
          const updatedStudent: SchoolStudent = {
            ...student,
            active: false
          };
          await saveStudent(updatedStudent);
          alumni++;
        }
      }

      setExecutionResult({
        promotedCount: promoted,
        repeatedCount: repeated,
        alumniCount: alumni,
        totalDuesCarried: duesCarried
      });

      speakNotification(
        "सत्र प्रमोशन पूर्ण हुआ",
        `${promoted} छात्र अगली कक्षा में सफलतापूर्वक प्रमोट किए गए।`
      );

      setStep(3);
      onSuccess?.();
    } catch (err: any) {
      console.error("Session roll-over execution error:", err);
      alert("सत्र प्रमोशन के दौरान त्रुटि: " + (err?.message || err));
    } finally {
      setIsExecuting(false);
      setProgressMsg("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  छात्र वार्षिक सत्र प्रमोशन इंजन
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  New Session Roll-Over
                </span>
              </div>
              <p className="text-xs text-purple-200/80">
                पुरानी कक्षा के छात्रों को अगली कक्षा व नए सत्र में प्रमोट करें, बकाया फीस सहित
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-bold shrink-0">
          <div
            className={`flex items-center gap-2 ${
              step === 1 ? "text-purple-400" : "text-slate-400"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step === 1 ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              1
            </span>
            <span>सत्र व कक्षा चयन</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-800 hidden sm:block" />
          <div
            className={`flex items-center gap-2 ${
              step === 2 ? "text-purple-400" : "text-slate-400"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step === 2 ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              2
            </span>
            <span>छात्र समीक्षा व सेटिंग्स</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-800 hidden sm:block" />
          <div
            className={`flex items-center gap-2 ${
              step === 3 ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step === 3 ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              3
            </span>
            <span>सफलता रिपोर्ट</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Session & Class Mapping */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 text-xs text-indigo-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold mb-1">
                    सत्र रोल-ओवर कैसे काम करता है?
                  </strong>
                  जब नया शैक्षणिक वर्ष शुरू होता है, तो पुरानी कक्षा के सभी उत्तीर्ण छात्रों को एक क्लिक में अगली कक्षा में प्रमोट किया जा सकता है। उनका पिछला बकाया फीस स्वतः नए सत्र में जुड़ जाता है।
                </div>
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    पुराना सत्र (From Session):
                  </label>
                  <select
                    value={fromSessionId}
                    onChange={(e) => setFromSessionId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.active ? " (वर्तमान सक्रिय)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    नया सत्र (To Session):
                  </label>
                  <select
                    value={toSessionId}
                    onChange={(e) => setToSessionId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
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
              </div>

              {/* Classes Mapping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    इस कक्षा के छात्र (Current Class):
                  </label>
                  <select
                    value={fromClassId}
                    onChange={(e) => setFromClassId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                    अगली कक्षा (Target Class):
                  </label>
                  <select
                    value={toClassId}
                    onChange={(e) => setToClassId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="ALUMNI">🎓 उत्तीर्ण / पास आउट (Alumni / Passed Out)</option>
                  </select>
                </div>
              </div>

              {/* Flow Preview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{fromClassObj?.name || "कक्षा"}</span>
                  <span className="text-slate-400">({fromSessionObj?.name})</span>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-400" />
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">
                    {toClassId === "ALUMNI" ? "Alumni (पास आउट)" : (toClassObj?.name || "अगली कक्षा")}
                  </span>
                  <span className="text-slate-400">({toSessionObj?.name})</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Students Review & Options */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Settings Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carryForwardDues}
                    onChange={(e) => setCarryForwardDues(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                  />
                  <span className="font-medium text-slate-200">
                    पिछला बकाया फीस नए सत्र में कैरी-फॉरवर्ड करें
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReassignRollNo}
                    onChange={(e) => setAutoReassignRollNo(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                  />
                  <span className="font-medium text-slate-200">
                    रोल नंबर क्रमबद्ध (1, 2, 3...) री-असाइन करें
                  </span>
                </label>
              </div>

              {/* Toolbar & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="छात्र का नाम या रोल नंबर खोजें..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleSelectAll(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                  >
                    सभी चुनें
                  </button>
                  <button
                    onClick={() => toggleSelectAll(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-400 transition"
                  >
                    अन-सिलेक्ट
                  </button>
                  <button
                    onClick={() => setAllStatus("promote")}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold transition"
                  >
                    सबको प्रमोट करें
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs">
                <span>
                  कुल छात्र: <strong className="text-white">{studentsList.length}</strong> • चयनित:{" "}
                  <strong className="text-purple-300">{selectedCount}</strong>
                </span>
                {carryForwardDues && totalDuesForSelected > 0 && (
                  <span className="text-amber-300 font-bold">
                    ट्रांसफर होने वाला बकाया: ₹{totalDuesForSelected.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {/* Students Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 max-h-72 overflow-y-auto">
                {loadingStudents ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    छात्र लोड हो रहे हैं...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    इस कक्षा में कोई छात्र नहीं मिले।
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                      <tr>
                        <th className="p-2.5 w-8">
                          <input
                            type="checkbox"
                            checked={selectedCount === studentsList.length && studentsList.length > 0}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-purple-600"
                          />
                        </th>
                        <th className="p-2.5 font-bold">रोल नं.</th>
                        <th className="p-2.5 font-bold">छात्र का नाम व पिता</th>
                        <th className="p-2.5 font-bold">बकाया फीस</th>
                        <th className="p-2.5 font-bold text-right">प्रमोशन स्थिति</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredStudents.map((item) => (
                        <tr
                          key={item.student.id}
                          className={`hover:bg-slate-900/60 transition ${
                            !item.selected ? "opacity-50" : ""
                          }`}
                        >
                          <td className="p-2.5">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => {
                                const chk = e.target.checked;
                                setStudentsList((prev) =>
                                  prev.map((s) =>
                                    s.student.id === item.student.id
                                      ? { ...s, selected: chk }
                                      : s
                                  )
                                );
                              }}
                              className="w-3.5 h-3.5 rounded text-purple-600"
                            />
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-300">
                            #{item.student.rollNo || "-"}
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-white">{item.student.name}</div>
                            {item.student.fatherName && (
                              <div className="text-[10px] text-slate-400">
                                S/O, D/O {item.student.fatherName}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5">
                            {item.pendingDues > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ₹{item.pendingDues.toLocaleString("en-IN")} बकाया
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-semibold">
                                कोई बकाया नहीं
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            <select
                              value={item.status}
                              onChange={(e) =>
                                updateStudentStatus(
                                  item.student.id,
                                  e.target.value as StudentPromotionStatus
                                )
                              }
                              className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                                item.status === "promote"
                                  ? "bg-purple-900/60 text-purple-200 border-purple-500/50"
                                  : item.status === "repeat"
                                  ? "bg-amber-900/60 text-amber-200 border-amber-500/50"
                                  : "bg-slate-800 text-slate-300 border-slate-600"
                              }`}
                            >
                              <option value="promote">🎓 प्रमोट (Next Class)</option>
                              <option value="repeat">🔁 रिपीट (उसी कक्षा में)</option>
                              <option value="alumni">📜 टीसी / पास आउट</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Execution Success Report */}
          {step === 3 && executionResult && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-white">सत्र प्रमोशन सफलतापूर्वक पूर्ण हुआ!</h4>
                <p className="text-xs text-slate-400">
                  {fromClassObj?.name} के छात्र नए सत्र {toSessionObj?.name} में सफलतापूर्वक ट्रांसफर कर दिए गए हैं।
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
                <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
                  <div className="text-lg font-black text-purple-300">
                    {executionResult.promotedCount}
                  </div>
                  <div className="text-[10px] text-purple-200/80 font-bold uppercase">
                    प्रमोट किए गए
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30">
                  <div className="text-lg font-black text-amber-300">
                    {executionResult.repeatedCount}
                  </div>
                  <div className="text-[10px] text-amber-200/80 font-bold uppercase">
                    रिपीट छात्र
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700">
                  <div className="text-lg font-black text-slate-300">
                    {executionResult.alumniCount}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    पास आउट / TC
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                  <div className="text-lg font-black text-emerald-300">
                    ₹{executionResult.totalDuesCarried.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-emerald-200/80 font-bold uppercase">
                    बकाया ट्रांसफर
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!fromClassId || !toClassId}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition cursor-pointer disabled:opacity-40"
              >
                <span>छात्र समीक्षा करें</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isExecuting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              >
                वापस जाएं
              </button>
              <button
                type="button"
                onClick={handleExecutePromotion}
                disabled={isExecuting || selectedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-40"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{progressMsg || "प्रमोशन हो रहा है..."}</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4" />
                    <span>सत्र प्रमोशन निष्पादित करें ({selectedCount} छात्र)</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                पूर्ण (Done)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
