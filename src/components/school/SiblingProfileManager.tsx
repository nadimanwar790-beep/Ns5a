import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  ChevronDown,
  UserPlus,
  UserMinus,
  Save,
  GraduationCap,
  IndianRupee,
  Phone,
  CreditCard,
  MapPin,
  HeartHandshake,
  Check,
  Percent,
  Layers,
  ArrowRight,
  Filter
} from "lucide-react";
import type { School, SchoolClass, SchoolSession, SchoolStudent } from "../../school-types";
import { groupAllSchoolSiblings, SiblingFamilyGroup } from "../../utils/schoolReferralSiblingEngine";
import { updateStudent } from "../../school-firebase";

interface Props {
  school: School;
  students: SchoolStudent[];
  classes: SchoolClass[];
  activeSession: SchoolSession | null;
  onUpdateStudent?: (student: SchoolStudent) => void;
  onBack?: () => void;
}

export const SiblingProfileManager: React.FC<Props> = ({
  school,
  students,
  classes,
  activeSession,
  onUpdateStudent,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"families" | "discounted" | "free" | "singles">("families");
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [saveSuccessStudentId, setSaveSuccessStudentId] = useState<string | null>(null);

  // Manual Link modal state
  const [linkTargetFamily, setLinkTargetFamily] = useState<SiblingFamilyGroup | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [confirmActionKey, setConfirmActionKey] = useState<string | null>(null);

  // Group all students automatically using the intelligent engine
  const { families, singleStudents, stats } = useMemo(() => {
    return groupAllSchoolSiblings(students);
  }, [students]);

  // Filtered families based on search and active tab
  const filteredFamilies = useMemo(() => {
    let list = families;

    if (activeTab === "discounted") {
      list = list.filter((f) => f.hasDiscount);
    } else if (activeTab === "free") {
      list = list.filter((f) => f.hasFreeEducation);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((f) => {
        const matchesName = f.familyName.toLowerCase().includes(q);
        const matchesFather = f.fatherName?.toLowerCase().includes(q);
        const matchesMother = f.motherName?.toLowerCase().includes(q);
        const matchesPhone = f.phone?.includes(q) || f.whatsappNo?.includes(q);
        const matchesAadhaar = f.fatherAadhaar?.includes(q) || f.motherAadhaar?.includes(q);
        const matchesChild = f.students.some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.admissionNo?.toLowerCase().includes(q) ||
            s.rollNo?.toLowerCase().includes(q) ||
            s.className?.toLowerCase().includes(q)
        );
        return matchesName || matchesFather || matchesMother || matchesPhone || matchesAadhaar || matchesChild;
      });
    }

    return list;
  }, [families, activeTab, searchQuery]);

  // Handle individual child discount change
  const handleUpdateStudentDiscount = async (
    targetStudent: SchoolStudent,
    discountType: "FREE" | "50_PCT" | "25_PCT" | "CUSTOM_AMT" | "NONE",
    customAmt?: number,
    familyGroupId?: string
  ) => {
    setSavingStudentId(targetStudent.id);
    try {
      const baseFee = Number(targetStudent.baseMonthlyFee ?? targetStudent.monthlyFee ?? 0);
      let isFreeEducation = false;
      let siblingDiscountPct: number | undefined = undefined;
      let siblingDiscountAmount: number | undefined = undefined;
      let concessionType: any = "NONE";
      let concessionReason = "";

      if (discountType === "FREE") {
        isFreeEducation = true;
        siblingDiscountPct = 100;
        siblingDiscountAmount = baseFee;
        concessionType = "FREE_EDUCATION";
        concessionReason = "भाई-बहन 100% नि:शुल्क शिक्षा (Sibling Full Free)";
      } else if (discountType === "50_PCT") {
        siblingDiscountPct = 50;
        siblingDiscountAmount = Math.round((baseFee * 50) / 100);
        concessionType = "SIBLING_DISCOUNT";
        concessionReason = "भाई-बहन 50% छूट (Sibling 50% Concession)";
      } else if (discountType === "25_PCT") {
        siblingDiscountPct = 25;
        siblingDiscountAmount = Math.round((baseFee * 25) / 100);
        concessionType = "SIBLING_DISCOUNT";
        concessionReason = "भाई-बहन 25% छूट (Sibling 25% Concession)";
      } else if (discountType === "CUSTOM_AMT" && customAmt !== undefined) {
        siblingDiscountAmount = Math.max(0, customAmt);
        siblingDiscountPct = baseFee > 0 ? Math.round((customAmt / baseFee) * 100) : 0;
        concessionType = "SIBLING_DISCOUNT";
        concessionReason = `भाई-बहन ₹${customAmt} मासिक छूट`;
      } else {
        isFreeEducation = false;
        siblingDiscountPct = undefined;
        siblingDiscountAmount = undefined;
        concessionType = "NONE";
        concessionReason = "";
      }

      const updatePayload: Partial<SchoolStudent> = {
        isSiblingMarked: true,
        familyGroupId: familyGroupId || targetStudent.familyGroupId,
        isFreeEducation,
        siblingDiscountPct,
        siblingDiscountAmount,
        concessionType,
        concessionReason,
      };

      await updateStudent(school.id, targetStudent.id, updatePayload);

      if (onUpdateStudent) {
        onUpdateStudent({ ...targetStudent, ...updatePayload });
      }

      setSaveSuccessStudentId(targetStudent.id);
      setTimeout(() => setSaveSuccessStudentId(null), 2500);
    } catch (err) {
      console.error("Failed to update student sibling concession:", err);
      toast.error("छूट अपडेट करने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
    } finally {
      setSavingStudentId(null);
    }
  };

  // 1-Tap Smart Preset: 1st Child Normal, 2nd Child 50% Off, 3rd Child 100% Free
  const handleApplyFamilyStandardPreset = async (family: SiblingFamilyGroup) => {
    const key = `preset:${family.id}`;
    if (confirmActionKey !== key) {
      setConfirmActionKey(key);
      return;
    }
    setConfirmActionKey(null);
    for (let idx = 0; idx < family.students.length; idx++) {
      const st = family.students[idx];
      if (idx === 0) {
        await handleUpdateStudentDiscount(st, "NONE", undefined, family.id);
      } else if (idx === 1) {
        await handleUpdateStudentDiscount(st, "50_PCT", undefined, family.id);
      } else {
        await handleUpdateStudentDiscount(st, "FREE", undefined, family.id);
      }
    }
    toast.success(`${family.familyName} पर मानक छूट नियम लागू किया गया!`);
  };

  // 1-Tap Make All 100% Free
  const handleMakeAllSiblingsFree = async (family: SiblingFamilyGroup) => {
    const key = `free:${family.id}`;
    if (confirmActionKey !== key) {
      setConfirmActionKey(key);
      return;
    }
    setConfirmActionKey(null);
    for (const st of family.students) {
      await handleUpdateStudentDiscount(st, "FREE", undefined, family.id);
    }
    toast.success(`${family.familyName} के सभी बच्चों को 100% नि:शुल्क किया गया!`);
  };

  // 1-Tap Reset to Normal
  const handleResetFamilyToNormal = async (family: SiblingFamilyGroup) => {
    const key = `reset:${family.id}`;
    if (confirmActionKey !== key) {
      setConfirmActionKey(key);
      return;
    }
    setConfirmActionKey(null);
    for (const st of family.students) {
      await handleUpdateStudentDiscount(st, "NONE", undefined, family.id);
    }
    toast.success(`${family.familyName} की फीस सामान्य कर दी गई।`);
  };

  // Unlink a student from a family group
  const handleUnlinkStudent = async (student: SchoolStudent) => {
    const key = `unlink:${student.id}`;
    if (confirmActionKey !== key) {
      setConfirmActionKey(key);
      return;
    }
    setConfirmActionKey(null);
    try {
      const unlinkPayload: Partial<SchoolStudent> = {
        isSiblingMarked: false,
        familyGroupId: "",
        siblingStudentIds: [],
        siblingDiscountPct: undefined,
        siblingDiscountAmount: undefined,
        isFreeEducation: false,
        concessionType: "NONE",
        concessionReason: "",
      };

      await updateStudent(school.id, student.id, unlinkPayload);

      if (onUpdateStudent) {
        onUpdateStudent({ ...student, ...unlinkPayload });
      }
      toast.success(`${student.name} को परिवार समूह से अलग किया गया।`);
    } catch (err) {
      console.error("Failed to unlink student:", err);
      toast.error("छात्र को अलग करने में त्रुटि हुई।");
    } finally {
      setSavingStudentId(null);
    }
  };

  // Manual link student into target family
  const handleLinkStudentIntoFamily = async (studentToLink: SchoolStudent, targetFamily: SiblingFamilyGroup) => {
    try {
      setLinkingLoading(true);
      const existingStudentIds = targetFamily.students.map((s) => s.id);
      const updatedSiblingIds = Array.from(new Set([...existingStudentIds, studentToLink.id]));

      const linkPayload: Partial<SchoolStudent> = {
        isSiblingMarked: true,
        familyGroupId: targetFamily.id,
        siblingStudentIds: existingStudentIds,
        fatherName: studentToLink.fatherName || targetFamily.fatherName,
        motherName: studentToLink.motherName || targetFamily.motherName,
        fatherAadhaar: studentToLink.fatherAadhaar || targetFamily.fatherAadhaar,
        motherAadhaar: studentToLink.motherAadhaar || targetFamily.motherAadhaar,
        address: studentToLink.address || targetFamily.address,
      };

      // Update student to link
      await updateStudent(school.id, studentToLink.id, linkPayload);

      // Also link target family students to include this new sibling
      for (const st of targetFamily.students) {
        await updateStudent(school.id, st.id, {
          isSiblingMarked: true,
          familyGroupId: targetFamily.id,
          siblingStudentIds: updatedSiblingIds.filter((id) => id !== st.id),
        });
      }

      if (onUpdateStudent) {
        onUpdateStudent({ ...studentToLink, ...linkPayload });
      }

      setLinkTargetFamily(null);
      setLinkSearchQuery("");
      toast.success(`${studentToLink.name} को ${targetFamily.familyName} में जोड़ा गया!`);
    } catch (err) {
      console.error("Failed to link student:", err);
      toast.error("छात्र को लिंक करने में त्रुटि हुई।");
    } finally {
      setLinkingLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 pb-16">
      {/* ── TOP BANNER & HEADER ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-6 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-amber-300">
                <Users className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                    भाई-बहन प्रोफाइल (Sibling Profile &amp; Concessions)
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                    Auto-Group Engine
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200/90 font-medium">
                  समान माता-पिता, आधार कार्ड, मोबाइल व पते के आधार पर स्वतः निर्मित फैमिली प्रोफाइल • 1-क्लिक डिस्काउंट व 100% फ्री शिक्षा
                </p>
              </div>
            </div>

            {/* Smart Detection Rules Ribbon */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-indigo-200">
              <span className="font-bold text-slate-300">ऑटो पहचान नियम:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-400/30">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>समान माता-पिता का नाम</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-400/30">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>समान आधार कार्ड (माता/पिता/छात्र)</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-400/30">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>समान मोबाइल / व्हाट्सएप</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-400/30">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>समान निवास पता</span>
              </span>
            </div>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer self-start md:self-auto border border-white/10"
            >
              ← वापस डैशबोर्ड
            </button>
          )}
        </div>
      </div>

      {/* ── STATS DASHBOARD SUMMARY ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-indigo-400 mb-1">
            <span className="text-[11px] font-bold">कुल भाई-बहन परिवार</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{stats.totalFamilies}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">ऑटो डिटेक्टेड परिवार</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-blue-400 mb-1">
            <span className="text-[11px] font-bold">कुल नामांकित छात्र</span>
            <GraduationCap className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-300">{stats.totalSiblingStudents}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">परिवारों में शामिल बच्चे</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-bold">छूट प्राप्त छात्र</span>
            <Award className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-300">{stats.discountedStudents}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">25% से 100% छूट एक्टिव</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[11px] font-bold">100% नि:शुल्क छात्र</span>
            <HeartHandshake className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">{stats.freeEducationStudents}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">₹0 ट्यूशन फीस</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-emerald-300 mb-1">
            <span className="text-[11px] font-bold">मासिक कुल छूट</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
            ₹{stats.totalMonthlySavings.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-indigo-300 mt-0.5">प्रति माह कुल रियायत</p>
        </div>
      </div>

      {/* ── FILTER TABS & SEARCH BAR ────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("families")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "families"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400"
                : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>सभी भाई-बहन परिवार ({families.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("discounted")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "discounted"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400"
                : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>छूट प्राप्त परिवार ({families.filter((f) => f.hasDiscount).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("free")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "free"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400"
                : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750"
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>100% फ्री शिक्षा ({families.filter((f) => f.hasFreeEducation).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("singles")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "singles"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400"
                : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>अकेले छात्र / अन-लिंक्ड ({singleStudents.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="छात्र, पिता, माता, आधार या मोबाइल खोजें..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── UNLINKED / SINGLE STUDENTS TAB ─────────────────────────────────── */}
      {activeTab === "singles" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>अकेले छात्र (Single Students Not Linked to Any Sibling)</span>
              </h3>
              <p className="text-xs text-slate-400">
                ये छात्र अभी किसी परिवार में ऑटो-डिटेक्ट नहीं हुए हैं। आप इन्हें किसी भी परिवार में 1-क्लिक से जोड़ सकते हैं।
              </p>
            </div>
            <span className="text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-800 px-2.5 py-1 rounded-xl">
              {singleStudents.length} Students
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {singleStudents
              .filter((st) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                return (
                  st.name.toLowerCase().includes(q) ||
                  st.admissionNo?.toLowerCase().includes(q) ||
                  st.rollNo?.toLowerCase().includes(q) ||
                  st.fatherName?.toLowerCase().includes(q) ||
                  st.motherName?.toLowerCase().includes(q) ||
                  st.phone?.includes(q) ||
                  st.fatherAadhaar?.includes(q)
                );
              })
              .map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{st.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {st.className || "Class"} • Roll {st.rollNo || "—"} • Adm {st.admissionNo || "—"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      पिता: {st.fatherName || "—"} • माता: {st.motherName || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-400 font-mono block">
                      ₹{st.monthlyFee || 0}/माह
                    </span>
                    <span className="text-[9px] text-slate-400">सामान्य फीस</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── SIBLING FAMILIES LIST ───────────────────────────────────────────── */}
      {activeTab !== "singles" && (
        <div className="space-y-4">
          {filteredFamilies.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-slate-200">कोई भाई-बहन परिवार नहीं मिला</p>
              <p className="text-xs max-w-md mx-auto text-slate-500">
                खोज शब्द बदलें या सुनिश्चित करें कि छात्रों के नामांकन फॉर्म में माता, पिता का नाम या आधार कार्ड दर्ज है।
              </p>
            </div>
          ) : (
            filteredFamilies.map((family, fIdx) => (
              <div
                key={family.id}
                className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-slate-700 shadow-xl overflow-hidden transition"
              >
                {/* Family Header Strip */}
                <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-black font-mono">
                        #{fIdx + 1}
                      </span>
                      <h2 className="text-base font-black text-white flex items-center gap-2">
                        <span>👨‍👩‍👧‍👦 {family.familyName}</span>
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {family.totalStudents} भाई-बहन
                      </span>
                      {family.hasFreeEducation && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          100% नि:शुल्क एक्टिव
                        </span>
                      )}
                      {family.hasDiscount && !family.hasFreeEducation && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          छूट एक्टिव
                        </span>
                      )}
                    </div>

                    {/* Parents, Contact, Aadhaar & Match Reason */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      {family.fatherName && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-500 font-bold">पिता:</span>
                          <span className="text-slate-200 font-semibold">{family.fatherName}</span>
                        </span>
                      )}
                      {family.motherName && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-500 font-bold">माता:</span>
                          <span className="text-slate-200 font-semibold">{family.motherName}</span>
                        </span>
                      )}
                      {(family.phone || family.whatsappNo) && (
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <Phone className="w-3 h-3" />
                          <span>{family.phone || family.whatsappNo}</span>
                        </span>
                      )}
                      {(family.fatherAadhaar || family.motherAadhaar) && (
                        <span className="flex items-center gap-1 font-mono text-blue-300">
                          <CreditCard className="w-3 h-3" />
                          <span>आधार: {family.fatherAadhaar || family.motherAadhaar}</span>
                        </span>
                      )}
                      {family.address && (
                        <span className="flex items-center gap-1 text-slate-400 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{family.address}</span>
                        </span>
                      )}
                    </div>

                    {/* Matching Reason Tag */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-500 font-bold">ऑटो मैच आधार:</span>
                      {family.matchReasons.map((r, rIdx) => (
                        <span
                          key={rIdx}
                          className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-slate-800 text-indigo-300 border border-slate-700"
                        >
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 1-Tap Family Preset Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {confirmActionKey === `preset:${family.id}` ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleApplyFamilyStandardPreset(family)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-500 text-white font-black text-[11px] cursor-pointer"
                        >
                          Confirm मानक नियम
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmActionKey(null)}
                          className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-[11px] cursor-pointer"
                        >
                          रद्द
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyFamilyStandardPreset(family)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm transition flex items-center gap-1 cursor-pointer"
                        title="पहला बच्चा सामान्य, दूसरा 50% छूट, तीसरा 100% फ्री"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>मानक नियम (2nd: 50%, 3rd+: Free)</span>
                      </button>
                    )}

                    {confirmActionKey === `free:${family.id}` ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMakeAllSiblingsFree(family)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-[11px] cursor-pointer"
                        >
                          Confirm सभी 100% फ्री
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmActionKey(null)}
                          className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-[11px] cursor-pointer"
                        >
                          रद्द
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMakeAllSiblingsFree(family)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition flex items-center gap-1 cursor-pointer"
                        title="परिवार के सभी बच्चों को 100% फ्री करें"
                      >
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>सभी 100% फ्री</span>
                      </button>
                    )}

                    {confirmActionKey === `reset:${family.id}` ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleResetFamilyToNormal(family)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-600 text-white font-black text-[11px] cursor-pointer"
                        >
                          Confirm रीसेट
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmActionKey(null)}
                          className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-[11px] cursor-pointer"
                        >
                          रद्द
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResetFamilyToNormal(family)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="सभी बच्चों की छूट हटाकर सामान्य फीस करें"
                      >
                        <span>रीसेट</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setLinkTargetFamily(family)}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-200 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      title="इस परिवार में अन्य भाई/बहन जोड़ें"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ भाई/बहन जोड़ें</span>
                    </button>
                  </div>
                </div>

                {/* Children Breakdown Cards */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                    {family.students.map((student, sIdx) => {
                      const baseTuition = Number(student.baseMonthlyFee ?? student.monthlyFee ?? 0);
                      const isFree = Boolean(student.isFreeEducation);
                      const currentPct = Number(student.siblingDiscountPct || 0);
                      const currentAmt = Number(student.siblingDiscountAmount || 0);

                      let effectiveMonthlyFee = baseTuition;
                      if (isFree) {
                        effectiveMonthlyFee = 0;
                      } else if (currentPct > 0) {
                        effectiveMonthlyFee = Math.max(0, baseTuition - Math.round((baseTuition * currentPct) / 100));
                      } else if (currentAmt > 0) {
                        effectiveMonthlyFee = Math.max(0, baseTuition - currentAmt);
                      }

                      const isChildSaving = savingStudentId === student.id;
                      const isChildSuccess = saveSuccessStudentId === student.id;

                      return (
                        <div
                          key={student.id}
                          className={`p-3.5 rounded-2xl border transition relative ${
                            isFree
                              ? "bg-emerald-950/20 border-emerald-600/40"
                              : currentPct > 0 || currentAmt > 0
                              ? "bg-amber-950/20 border-amber-600/40"
                              : "bg-slate-950/70 border-slate-800"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                {student.photoUrl ? (
                                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-base font-black text-slate-400">
                                    {student.name.slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs sm:text-sm font-black text-white truncate">{student.name}</p>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                                    {sIdx === 0 ? "1st Child" : sIdx === 1 ? "2nd Child" : `${sIdx + 1}th Child`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  {student.className || "Class"} • Roll {student.rollNo || "—"} • Adm {student.admissionNo || "—"}
                                </p>
                              </div>
                            </div>

                            {confirmActionKey === `unlink:${student.id}` ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkStudent(student)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                                >
                                  Confirm Unlink
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmActionKey(null)}
                                  className="px-1.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                                >
                                  रद्द
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUnlinkStudent(student)}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                                title="इस छात्र को परिवार से अलग करें"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Fee Status Strip */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs mb-3">
                            <div>
                              <span className="text-[10px] text-slate-400 block">बेस ट्यूशन फीस</span>
                              <span className="font-mono font-bold text-slate-300">₹{baseTuition}/माह</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 block">सक्रिय रियायत</span>
                              <span
                                className={`font-mono font-black ${
                                  isFree
                                    ? "text-emerald-400"
                                    : currentPct > 0 || currentAmt > 0
                                    ? "text-amber-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {isFree
                                  ? "100% Free (नि:शुल्क)"
                                  : currentPct > 0
                                  ? `${currentPct}% छूट (-₹${Math.round((baseTuition * currentPct) / 100)})`
                                  : currentAmt > 0
                                  ? `-₹${currentAmt}/माह`
                                  : "कोई छूट नहीं"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">देय मासिक फीस</span>
                              <span className="font-mono font-black text-white text-sm">
                                ₹{effectiveMonthlyFee}/माह
                              </span>
                            </div>
                          </div>

                          {/* Quick Discount Buttons */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block">
                              छूट चयन करें (1-क्लिक से लागू करें):
                            </span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {/* Option 1: 100% Free */}
                              <button
                                type="button"
                                disabled={isChildSaving}
                                onClick={() => handleUpdateStudentDiscount(student, "FREE", undefined, family.id)}
                                className={`px-2 py-1.5 rounded-xl text-[10px] font-black border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  isFree
                                    ? "bg-emerald-600 text-white border-emerald-400 shadow-md ring-1 ring-emerald-300"
                                    : "bg-slate-900 text-emerald-400 border-slate-800 hover:bg-emerald-950/50 hover:border-emerald-600/50"
                                }`}
                              >
                                <span>100% Free</span>
                                <span className="text-[9px] opacity-80">नि:शुल्क</span>
                              </button>

                              {/* Option 2: 50% Off */}
                              <button
                                type="button"
                                disabled={isChildSaving}
                                onClick={() => handleUpdateStudentDiscount(student, "50_PCT", undefined, family.id)}
                                className={`px-2 py-1.5 rounded-xl text-[10px] font-black border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  !isFree && currentPct === 50
                                    ? "bg-amber-600 text-white border-amber-400 shadow-md ring-1 ring-amber-300"
                                    : "bg-slate-900 text-amber-400 border-slate-800 hover:bg-amber-950/50 hover:border-amber-600/50"
                                }`}
                              >
                                <span>50% OFF</span>
                                <span className="text-[9px] opacity-80">आधा शुल्क</span>
                              </button>

                              {/* Option 3: 25% Off */}
                              <button
                                type="button"
                                disabled={isChildSaving}
                                onClick={() => handleUpdateStudentDiscount(student, "25_PCT", undefined, family.id)}
                                className={`px-2 py-1.5 rounded-xl text-[10px] font-black border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  !isFree && currentPct === 25
                                    ? "bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-300"
                                    : "bg-slate-900 text-blue-400 border-slate-800 hover:bg-blue-950/50 hover:border-blue-600/50"
                                }`}
                              >
                                <span>25% OFF</span>
                                <span className="text-[9px] opacity-80">चौथाई छूट</span>
                              </button>

                              {/* Option 4: Normal */}
                              <button
                                type="button"
                                disabled={isChildSaving}
                                onClick={() => handleUpdateStudentDiscount(student, "NONE", undefined, family.id)}
                                className={`px-2 py-1.5 rounded-xl text-[10px] font-black border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                  !isFree && currentPct === 0 && currentAmt === 0
                                    ? "bg-slate-700 text-white border-slate-500 shadow-md"
                                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                                }`}
                              >
                                <span>Normal</span>
                                <span className="text-[9px] opacity-80">सामान्य</span>
                              </button>
                            </div>
                          </div>

                          {/* Save indicator toast */}
                          {isChildSuccess && (
                            <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] shadow-lg flex items-center gap-1 animate-in fade-in">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>सेव हो गया ✓</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Family Financial Total Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-3">
                      <span>
                        कुल सामान्य फीस: <strong className="font-mono text-white">₹{family.totalMonthlyFee}/माह</strong>
                      </span>
                      <span>
                        कुल परिवार छूट: <strong className="font-mono text-emerald-400">-₹{family.totalMonthlyDiscount}/माह</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">परिवार का नेट मासिक देय:</span>
                      <span className="font-mono text-base font-black text-amber-300">
                        ₹{family.netPayableMonthly}/माह
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── MANUAL LINK SIBLING MODAL ───────────────────────────────────────── */}
      {linkTargetFamily && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span>भाई-बहन जोड़ें (Link Sibling to Family)</span>
                </h3>
                <p className="text-xs text-indigo-300 truncate max-w-sm">
                  {linkTargetFamily.familyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkTargetFamily(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                placeholder="छात्र का नाम, रोल नंबर या एडमिशन नंबर टाइप करें..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Candidate Students List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {students
                .filter((st) => {
                  if (linkTargetFamily.students.some((s) => s.id === st.id)) return false;
                  if (!linkSearchQuery.trim()) return false;
                  const q = linkSearchQuery.toLowerCase().trim();
                  return (
                    st.name.toLowerCase().includes(q) ||
                    st.admissionNo?.toLowerCase().includes(q) ||
                    st.rollNo?.toLowerCase().includes(q) ||
                    st.fatherName?.toLowerCase().includes(q) ||
                    st.className?.toLowerCase().includes(q)
                  );
                })
                .slice(0, 15)
                .map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{st.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {st.className} • Roll {st.rollNo || "—"} • Adm {st.admissionNo || "—"} • पिता: {st.fatherName || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={linkingLoading}
                      onClick={() => handleLinkStudentIntoFamily(st, linkTargetFamily)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      + परिवार में जोड़ें
                    </button>
                  </div>
                ))}

              {linkSearchQuery.trim() &&
                students.filter((st) => {
                  if (linkTargetFamily.students.some((s) => s.id === st.id)) return false;
                  const q = linkSearchQuery.toLowerCase().trim();
                  return (
                    st.name.toLowerCase().includes(q) ||
                    st.admissionNo?.toLowerCase().includes(q) ||
                    st.rollNo?.toLowerCase().includes(q)
                  );
                }).length === 0 && (
                  <p className="text-xs text-center text-slate-500 py-6">कोई मिलान छात्र नहीं मिला</p>
                )}

              {!linkSearchQuery.trim() && (
                <p className="text-xs text-center text-slate-500 py-6">
                  ऊपर छात्र का नाम या रोल नंबर टाइप करके खोजें
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
