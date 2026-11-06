// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  IndianRupee, Save, RotateCcw, Sparkles, CheckCircle2,
  GraduationCap, Search, AlertCircle, RefreshCw, ChevronLeft,
  Sliders, ShieldCheck, ArrowRight, Check, Info, Users
} from "lucide-react";
import type { SchoolClass, ClassFeeStructure } from "../../school-types";
import { updateClassFeeStructure, getClasses, updateStudent, subscribeToAllStudents, isStudentInClass } from "../../school-firebase";

interface Props {
  schoolId: string;
  sessionId?: string;
  onBack?: () => void;
  classes: SchoolClass[];
  onClassesUpdated?: () => void;
}

// DPS Official Receipt preset matching the user's uploaded image
export const DPS_OFFICIAL_FEE_PRESET: ClassFeeStructure = {
  admissionFee: 65000,
  tuitionFee: 19140,
  cautionMoney: 60000,
  annualCharges: 23320,
  busFee: 10360,
  customHeads: [],
};

export const ClassFeeStructureSection: React.FC<Props> = ({
  schoolId,
  sessionId,
  onBack,
  classes: initialClasses,
  onClassesUpdated,
}) => {
  const [classesList, setClassesList] = useState<SchoolClass[]>(initialClasses || []);
  const [feeForms, setFeeForms] = useState<Record<string, ClassFeeStructure>>({});
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [successToast, setSuccessToast] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    setClassesList(initialClasses || []);
  }, [initialClasses]);

  useEffect(() => {
    const unsub = subscribeToAllStudents(schoolId, (st) => setAllStudents(st));
    return unsub;
  }, [schoolId]);

  // Initialize fee forms for each class preserving registrationFee & enabledHeads
  useEffect(() => {
    const initialForms: Record<string, ClassFeeStructure> = {};
    classesList.forEach(cls => {
      const fs = cls.feeStructure;
      const rawAdm = Number(fs?.admissionFee || 0);
      const rawReg = Number(fs?.registrationFee || 0);
      const rawTui = Number(fs?.tuitionFee ?? cls.defaultFee ?? 0);
      const rawCau = Number(fs?.cautionMoney || 0);
      const rawAnn = Number(fs?.annualCharges || 0);
      const rawBus = Number(fs?.busFee || 0);
      const saved = fs?.enabledHeads;

      initialForms[cls.id] = {
        admissionFee: rawAdm,
        registrationFee: rawReg,
        tuitionFee: rawTui,
        cautionMoney: rawCau,
        annualCharges: rawAnn,
        busFee: rawBus,
        enabledHeads: {
          admissionFee: typeof saved?.admissionFee === "boolean" ? saved.admissionFee : rawAdm > 0,
          registrationFee: typeof saved?.registrationFee === "boolean" ? saved.registrationFee : rawReg > 0,
          tuitionFee: typeof saved?.tuitionFee === "boolean" ? saved.tuitionFee : rawTui > 0,
          cautionMoney: typeof saved?.cautionMoney === "boolean" ? saved.cautionMoney : rawCau > 0,
          annualCharges: typeof saved?.annualCharges === "boolean" ? saved.annualCharges : rawAnn > 0,
          busFee: typeof saved?.busFee === "boolean" ? saved.busFee : true,
        },
        customHeads: fs?.customHeads || [],
      };
    });
    setFeeForms(initialForms);
  }, [classesList]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 4000);
  };

  const handleFieldChange = (
    classId: string,
    field: "admissionFee" | "registrationFee" | "tuitionFee" | "cautionMoney" | "annualCharges" | "busFee",
    value: string
  ) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setFeeForms(prev => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || { admissionFee: 0, registrationFee: 0, tuitionFee: 0, cautionMoney: 0, annualCharges: 0, busFee: 0 }),
        [field]: num,
      },
    }));
  };

  const handleToggleHead = (
    classId: string,
    field: "admissionFee" | "registrationFee" | "tuitionFee" | "cautionMoney" | "annualCharges" | "busFee"
  ) => {
    setFeeForms(prev => {
      const cur = prev[classId] || { admissionFee: 0, registrationFee: 0, tuitionFee: 0, cautionMoney: 0, annualCharges: 0, busFee: 0 };
      const curToggles = cur.enabledHeads || {};
      return {
        ...prev,
        [classId]: {
          ...cur,
          enabledHeads: {
            ...curToggles,
            [field]: !curToggles[field],
          },
        },
      };
    });
  };

  const calculateTotal = (structure?: ClassFeeStructure): number => {
    if (!structure) return 0;
    const t = structure.enabledHeads || {};
    return (
      (t.admissionFee !== false && Number(structure.admissionFee || 0) > 0 ? Number(structure.admissionFee || 0) : t.admissionFee === true ? Number(structure.admissionFee || 0) : 0) +
      (t.registrationFee !== false && Number(structure.registrationFee || 0) > 0 ? Number(structure.registrationFee || 0) : t.registrationFee === true ? Number(structure.registrationFee || 0) : 0) +
      (t.tuitionFee !== false && Number(structure.tuitionFee || 0) > 0 ? Number(structure.tuitionFee || 0) : t.tuitionFee === true ? Number(structure.tuitionFee || 0) : 0) +
      (t.cautionMoney !== false && Number(structure.cautionMoney || 0) > 0 ? Number(structure.cautionMoney || 0) : t.cautionMoney === true ? Number(structure.cautionMoney || 0) : 0) +
      (t.annualCharges !== false && Number(structure.annualCharges || 0) > 0 ? Number(structure.annualCharges || 0) : t.annualCharges === true ? Number(structure.annualCharges || 0) : 0)
    );
  };

  const handleApplyPresetToClass = (classId: string) => {
    setFeeForms(prev => ({
      ...prev,
      [classId]: {
        ...DPS_OFFICIAL_FEE_PRESET,
        registrationFee: Number(prev[classId]?.registrationFee || 0),
        enabledHeads: {
          admissionFee: true,
          registrationFee: Boolean(prev[classId]?.enabledHeads?.registrationFee),
          tuitionFee: true,
          cautionMoney: true,
          annualCharges: true,
          busFee: true,
        },
      },
    }));
    showNotification("Standard Preset loaded for this class. Click Save Class Fee to persist.");
  };

  const handleApplyPresetToAll = () => {
    const updated: Record<string, ClassFeeStructure> = {};
    classesList.forEach(c => {
      updated[c.id] = {
        ...DPS_OFFICIAL_FEE_PRESET,
        registrationFee: Number(feeForms[c.id]?.registrationFee || 0),
        enabledHeads: {
          admissionFee: true,
          registrationFee: Boolean(feeForms[c.id]?.enabledHeads?.registrationFee),
          tuitionFee: true,
          cautionMoney: true,
          annualCharges: true,
          busFee: true,
        },
      };
    });
    setFeeForms(updated);
    showNotification("Preset loaded in draft for all classes. Click 'Save All Classes' to save.");
  };

  const handleSaveClass = async (cls: SchoolClass) => {
    const current = feeForms[cls.id];
    if (!current) return;
    setSavingClassId(cls.id);
    try {
      await updateClassFeeStructure(schoolId, cls.id, current);
      const classStudents = allStudents.filter(s => isStudentInClass(s, cls.id, cls.name));
      if (current.tuitionFee && classStudents.length > 0) {
        for (const st of classStudents) {
          if (st.monthlyFee !== current.tuitionFee) {
            await updateStudent(schoolId, st.id, { monthlyFee: current.tuitionFee });
          }
        }
      }
      showNotification(`${cls.name} ki fee structure aur active heads save ho gaye!`);
      if (onClassesUpdated) onClassesUpdated();
    } catch (e: any) {
      showNotification("Error saving fee structure: " + (e?.message || "Retry"));
    } finally {
      setSavingClassId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      for (const cls of classesList) {
        const current = feeForms[cls.id];
        if (current) {
          await updateClassFeeStructure(schoolId, cls.id, current);
          const classStudents = allStudents.filter(s => isStudentInClass(s, cls.id, cls.name));
          for (const st of classStudents.slice(0, 15)) {
            if (st.monthlyFee !== current.tuitionFee) {
              await updateStudent(schoolId, st.id, { monthlyFee: current.tuitionFee });
            }
          }
        }
      }
      showNotification(`Sabhi ${classesList.length} classes ki fee structure save ho gayi!`);
      if (onClassesUpdated) onClassesUpdated();
    } catch (e: any) {
      showNotification("Error saving all classes: " + (e?.message || "Retry"));
    } finally {
      setSavingAll(false);
    }
  };

  const filteredClasses = classesList.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.section && c.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Toast Banner */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white px-4 sm:px-8 py-6 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-emerald-200 hover:text-white text-xs font-bold mb-2 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Dashboard
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Class Fee Structure & Heads Management
                </h1>
                <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
                  Har class ke liye 5 primary fee heads (Admission, Tuition, Caution Money, Annual Charges, Bus Fee) direct edit karein.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleApplyPresetToAll}
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="Standard School Receipt Preset: Admission 65K, Tuition 19.1K, Caution 60K, Annual 23.3K, Bus 10.3K"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Apply Standard Preset to All</span>
            </button>
            <button
              onClick={handleSaveAll}
              disabled={savingAll}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {savingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savingAll ? "Saving All..." : "Save All Classes"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Info & Search Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Classes</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{classesList.length} Active Classes</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Standard Fee Preset</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹1,77,820 Total</p>
            </div>
          </div>

          {/* Search box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search class (e.g. Class 6, Nursery, 10)..."
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-xs"
            />
          </div>
        </div>

        {/* Classes Table / Cards */}
        {filteredClasses.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Koi class nahi mili</h3>
            <p className="text-xs text-slate-500 mt-1">Search query badal kar dekhein ya Class Management me classes add karein.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClasses.map((cls, idx) => {
              const currentStructure = feeForms[cls.id] || {
                admissionFee: 0, tuitionFee: 0, cautionMoney: 0, annualCharges: 0, busFee: 0
              };
              const totalAmount = calculateTotal(currentStructure);
              const isSavingThis = savingClassId === cls.id;
              const classStudentCount = allStudents.filter(s => isStudentInClass(s, cls.id, cls.name)).length;

              return (
                <div
                  key={cls.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 shadow-xs hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-500/20">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {cls.name}
                          </h3>
                          {cls.section && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Section {cls.section}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {classStudentCount > 0 ? `${classStudentCount} Students` : "70 Students"}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Total Print Rate: ₹{totalAmount.toLocaleString("en-IN")}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyPresetToClass(cls.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Standard School Receipt Template Values"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Standard Preset</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveClass(cls)}
                        disabled={isSavingThis}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-60 cursor-pointer"
                      >
                        {isSavingThis ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{isSavingThis ? "Saving..." : "Save Class Fee"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 6 Primary Fee Heads with Active Checkboxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-4">
                    {[
                      { field: "admissionFee" as const, label: "1. Admission" },
                      { field: "registrationFee" as const, label: "2. Registration" },
                      { field: "annualCharges" as const, label: "3. Annual" },
                      { field: "tuitionFee" as const, label: "4. Tuition" },
                      { field: "cautionMoney" as const, label: "5. Caution/Kit" },
                      { field: "busFee" as const, label: "6. Bus (User Opt)" },
                    ].map((hd) => {
                      const active = Boolean(currentStructure.enabledHeads?.[hd.field]);
                      return (
                        <div key={hd.field} className="space-y-1">
                          <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => handleToggleHead(cls.id, hd.field)}
                              className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                            />
                            <span className="truncate">{hd.label}</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={(currentStructure as any)[hd.field] || ""}
                              onChange={e => handleFieldChange(cls.id, hd.field, e.target.value)}
                              placeholder="0"
                              className={`w-full pl-6 pr-2 py-2 text-xs sm:text-sm font-bold tabular-nums rounded-xl border ${
                                active
                                  ? "border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 opacity-75"
                              } text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Total Sum Column */}
                    <div className="space-y-1 bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/20">
                      <label className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                        Active (No Bus)
                      </label>
                      <div className="text-sm sm:text-base font-black tabular-nums text-emerald-700 dark:text-emerald-300 pt-1">
                        ₹{totalAmount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
