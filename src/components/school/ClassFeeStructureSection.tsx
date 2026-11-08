// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  IndianRupee, Save, RotateCcw, Sparkles, CheckCircle2,
  GraduationCap, Search, AlertCircle, RefreshCw, ChevronLeft,
  Sliders, ShieldCheck, ArrowRight, Check, Info, Users,
  UserCheck, Briefcase, Plus, X, Building2, Wallet,
  CreditCard, TrendingUp, Filter, Award
} from "lucide-react";
import type { SchoolClass, ClassFeeStructure, SchoolTeacher, TeacherSalaryStructure } from "../../school-types";
import {
  updateClassFeeStructure,
  updateStudent,
  subscribeToAllStudents,
  isStudentInClass,
  updateTeacher,
  saveTeacher,
  subscribeToTeachers
} from "../../school-firebase";

interface Props {
  schoolId: string;
  sessionId?: string;
  onBack?: () => void;
  classes: SchoolClass[];
  teachers?: SchoolTeacher[];
  onClassesUpdated?: () => void;
  onTeachersUpdated?: () => void;
}

// DPS Official Receipt preset matching standard CBSE/State school fee structure
export const DPS_OFFICIAL_FEE_PRESET: ClassFeeStructure = {
  admissionFee: 65000,
  registrationFee: 2500,
  tuitionFee: 19140,
  cautionMoney: 60000,
  annualCharges: 23320,
  busFee: 10360,
  customHeads: [],
};

// Teacher Salary Presets for quick batch configuration
export const TEACHER_SALARY_PRESETS: Record<string, { label: string; structure: TeacherSalaryStructure }> = {
  prt: {
    label: "PRT / Primary Teacher (₹21,000)",
    structure: {
      monthlyBaseSalary: 18000,
      allowanceHra: 2000,
      allowanceTravel: 1000,
      allowanceSpecial: 500,
      deductionPf: 500,
      deductionOther: 0,
      netMonthlySalary: 21000,
      paymentMode: "Bank Transfer",
    },
  },
  tgt: {
    label: "TGT / Middle Faculty (₹30,000)",
    structure: {
      monthlyBaseSalary: 25000,
      allowanceHra: 3500,
      allowanceTravel: 2000,
      allowanceSpecial: 1000,
      deductionPf: 1500,
      deductionOther: 0,
      netMonthlySalary: 30000,
      paymentMode: "Bank Transfer",
    },
  },
  pgt: {
    label: "PGT / Senior Faculty (₹42,000)",
    structure: {
      monthlyBaseSalary: 35000,
      allowanceHra: 5000,
      allowanceTravel: 2500,
      allowanceSpecial: 2000,
      deductionPf: 2500,
      deductionOther: 0,
      netMonthlySalary: 42000,
      paymentMode: "Bank Transfer",
    },
  },
  admin_principal: {
    label: "Coordinator / Vice Principal (₹55,000)",
    structure: {
      monthlyBaseSalary: 45000,
      allowanceHra: 7000,
      allowanceTravel: 3500,
      allowanceSpecial: 2500,
      deductionPf: 3000,
      deductionOther: 0,
      netMonthlySalary: 55000,
      paymentMode: "Bank Transfer",
    },
  },
};

export const ClassFeeStructureSection: React.FC<Props> = ({
  schoolId,
  sessionId,
  onBack,
  classes: initialClasses,
  teachers: initialTeachers,
  onClassesUpdated,
  onTeachersUpdated,
}) => {
  // Active Tab: "classes" (Student Class Fee Heads) vs "teachers" (Teacher Monthly Salary & Pay Structure)
  const [activeTab, setActiveTab] = useState<"classes" | "teachers">("classes");

  // Classes state
  const [classesList, setClassesList] = useState<SchoolClass[]>(initialClasses || []);
  const [feeForms, setFeeForms] = useState<Record<string, ClassFeeStructure>>({});
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [savingAllClasses, setSavingAllClasses] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Teachers state
  const [teachersList, setTeachersList] = useState<SchoolTeacher[]>(initialTeachers || []);
  const [teacherPayForms, setTeacherPayForms] = useState<Record<string, TeacherSalaryStructure>>({});
  const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);
  const [savingAllTeachers, setSavingAllTeachers] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: "",
    designation: "TGT Mathematics",
    subjects: "Mathematics",
    monthlyBaseSalary: 25000,
    allowanceHra: 3000,
    allowanceTravel: 1500,
    allowanceSpecial: 1000,
    deductionPf: 1200,
    phone: "",
    email: "",
  });

  // Toast
  const [successToast, setSuccessToast] = useState<string>("");

  useEffect(() => {
    setClassesList(initialClasses || []);
  }, [initialClasses]);

  useEffect(() => {
    if (initialTeachers && initialTeachers.length > 0) {
      setTeachersList(initialTeachers);
    }
  }, [initialTeachers]);

  // Live subscription to teachers
  useEffect(() => {
    const unsub = subscribeToTeachers(schoolId, (teachers) => {
      if (teachers && teachers.length > 0) {
        setTeachersList(teachers);
      }
    });
    return unsub;
  }, [schoolId]);

  // Live subscription to students
  useEffect(() => {
    const unsub = subscribeToAllStudents(schoolId, (st) => setAllStudents(st));
    return unsub;
  }, [schoolId]);

  // Initialize fee forms for each class
  useEffect(() => {
    const initialForms: Record<string, ClassFeeStructure> = {};
    classesList.forEach((cls) => {
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

  // Initialize teacher monthly pay forms
  useEffect(() => {
    const initialPay: Record<string, TeacherSalaryStructure> = {};
    teachersList.forEach((t) => {
      const struct = t.salaryStructure;
      const base = Number(struct?.monthlyBaseSalary || t.monthlySalary || t.salary || 25000);
      const hra = Number(struct?.allowanceHra || 0);
      const travel = Number(struct?.allowanceTravel || 0);
      const special = Number(struct?.allowanceSpecial || 0);
      const pf = Number(struct?.deductionPf || 0);
      const other = Number(struct?.deductionOther || 0);
      const net = struct?.netMonthlySalary || Math.max(0, base + hra + travel + special - pf - other);

      initialPay[t.id] = {
        monthlyBaseSalary: base,
        allowanceHra: hra,
        allowanceTravel: travel,
        allowanceSpecial: special,
        deductionPf: pf,
        deductionOther: other,
        netMonthlySalary: net,
        paymentMode: struct?.paymentMode || "Bank Transfer",
      };
    });
    setTeacherPayForms(initialPay);
  }, [teachersList]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 4500);
  };

  // --- Class Fee Handlers ---
  const handleFieldChange = (
    classId: string,
    field: "admissionFee" | "registrationFee" | "tuitionFee" | "cautionMoney" | "annualCharges" | "busFee",
    value: string
  ) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setFeeForms((prev) => ({
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
    setFeeForms((prev) => {
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
    setFeeForms((prev) => ({
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
    showNotification("Standard Student Fee Preset loaded. Click 'Save Class Fee' to persist.");
  };

  const handleApplyPresetToAllClasses = () => {
    const updated: Record<string, ClassFeeStructure> = {};
    classesList.forEach((c) => {
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
    showNotification("Preset loaded for all classes. Click 'Save All Classes' to save.");
  };

  const handleSaveClass = async (cls: SchoolClass) => {
    const current = feeForms[cls.id];
    if (!current) return;
    setSavingClassId(cls.id);
    try {
      await updateClassFeeStructure(schoolId, cls.id, current);
      const classStudents = allStudents.filter((s) => isStudentInClass(s, cls.id, cls.name));
      if (current.tuitionFee && classStudents.length > 0) {
        for (const st of classStudents) {
          if (st.monthlyFee !== current.tuitionFee) {
            await updateStudent(schoolId, st.id, { monthlyFee: current.tuitionFee });
          }
        }
      }
      showNotification(`${cls.name} ki fee structure aur heads save ho gaye!`);
      if (onClassesUpdated) onClassesUpdated();
    } catch (e: any) {
      showNotification("Error saving fee structure: " + (e?.message || "Retry"));
    } finally {
      setSavingClassId(null);
    }
  };

  const handleSaveAllClasses = async () => {
    setSavingAllClasses(true);
    try {
      for (const cls of classesList) {
        const current = feeForms[cls.id];
        if (current) {
          await updateClassFeeStructure(schoolId, cls.id, current);
          const classStudents = allStudents.filter((s) => isStudentInClass(s, cls.id, cls.name));
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
      setSavingAllClasses(false);
    }
  };

  // --- Teacher Salary Handlers ---
  const handleTeacherPayChange = (
    teacherId: string,
    field: keyof TeacherSalaryStructure,
    value: any
  ) => {
    setTeacherPayForms((prev) => {
      const current = prev[teacherId] || {
        monthlyBaseSalary: 25000,
        allowanceHra: 0,
        allowanceTravel: 0,
        allowanceSpecial: 0,
        deductionPf: 0,
        deductionOther: 0,
        netMonthlySalary: 25000,
        paymentMode: "Bank Transfer",
      };

      const numVal = typeof value === "string" ? Math.max(0, parseInt(value, 10) || 0) : value;
      const updated = {
        ...current,
        [field]: numVal,
      };

      // Auto-compute net monthly salary
      const base = Number(updated.monthlyBaseSalary || 0);
      const hra = Number(updated.allowanceHra || 0);
      const travel = Number(updated.allowanceTravel || 0);
      const special = Number(updated.allowanceSpecial || 0);
      const pf = Number(updated.deductionPf || 0);
      const other = Number(updated.deductionOther || 0);
      updated.netMonthlySalary = Math.max(0, base + hra + travel + special - pf - other);

      return {
        ...prev,
        [teacherId]: updated,
      };
    });
  };

  const handleApplyPresetToTeacher = (teacherId: string, presetKey: string) => {
    const preset = TEACHER_SALARY_PRESETS[presetKey];
    if (!preset) return;
    setTeacherPayForms((prev) => ({
      ...prev,
      [teacherId]: {
        ...preset.structure,
        updatedAt: new Date().toISOString(),
      },
    }));
    showNotification(`Teacher ke liye "${preset.label}" preset load ho gaya. Save par click karein.`);
  };

  const handleApplyPresetToAllTeachers = (presetKey: string) => {
    const preset = TEACHER_SALARY_PRESETS[presetKey];
    if (!preset) return;
    const updated: Record<string, TeacherSalaryStructure> = {};
    teachersList.forEach((t) => {
      updated[t.id] = {
        ...preset.structure,
        updatedAt: new Date().toISOString(),
      };
    });
    setTeacherPayForms(updated);
    showNotification(`Sabhi ${teachersList.length} teachers ke liye "${preset.label}" preset load ho gaya!`);
  };

  const handleSaveTeacherPay = async (teacher: SchoolTeacher) => {
    const current = teacherPayForms[teacher.id];
    if (!current) return;
    setSavingTeacherId(teacher.id);
    try {
      await updateTeacher(schoolId, teacher.id, {
        monthlySalary: current.netMonthlySalary,
        salary: current.netMonthlySalary,
        salaryStructure: {
          ...current,
          updatedAt: new Date().toISOString(),
        },
      });
      showNotification(`${teacher.name} ka monthly salary structure (₹${current.netMonthlySalary.toLocaleString("en-IN")}) save ho gaya!`);
      if (onTeachersUpdated) onTeachersUpdated();
    } catch (e: any) {
      showNotification("Error saving teacher salary: " + (e?.message || "Retry"));
    } finally {
      setSavingTeacherId(null);
    }
  };

  const handleSaveAllTeachersPay = async () => {
    if (teachersList.length === 0) return;
    setSavingAllTeachers(true);
    try {
      for (const t of teachersList) {
        const cur = teacherPayForms[t.id];
        if (cur) {
          await updateTeacher(schoolId, t.id, {
            monthlySalary: cur.netMonthlySalary,
            salary: cur.netMonthlySalary,
            salaryStructure: {
              ...cur,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      }
      showNotification(`Sabhi ${teachersList.length} teachers ka monthly salary structure save ho gaya!`);
      if (onTeachersUpdated) onTeachersUpdated();
    } catch (e: any) {
      showNotification("Error saving teachers salary: " + (e?.message || "Retry"));
    } finally {
      setSavingAllTeachers(false);
    }
  };

  const handleCreateNewTeacherWithSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherForm.name.trim()) {
      alert("Kripya Teacher ka naam likhein.");
      return;
    }
    const base = Number(newTeacherForm.monthlyBaseSalary) || 0;
    const hra = Number(newTeacherForm.allowanceHra) || 0;
    const travel = Number(newTeacherForm.allowanceTravel) || 0;
    const special = Number(newTeacherForm.allowanceSpecial) || 0;
    const pf = Number(newTeacherForm.deductionPf) || 0;
    const net = Math.max(0, base + hra + travel + special - pf);

    const newId = "t_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
    const newTeacherRecord: SchoolTeacher = {
      id: newId,
      schoolId,
      name: newTeacherForm.name.trim(),
      designation: newTeacherForm.designation,
      subjects: [newTeacherForm.subjects.trim()],
      classes: [],
      phone: newTeacherForm.phone.trim(),
      email: newTeacherForm.email.trim(),
      active: true,
      joinDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      monthlySalary: net,
      salary: net,
      salaryStructure: {
        monthlyBaseSalary: base,
        allowanceHra: hra,
        allowanceTravel: travel,
        allowanceSpecial: special,
        deductionPf: pf,
        deductionOther: 0,
        netMonthlySalary: net,
        paymentMode: "Bank Transfer",
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      await saveTeacher(newTeacherRecord);
      setTeachersList((prev) => [newTeacherRecord, ...prev]);
      setTeacherPayForms((prev) => ({
        ...prev,
        [newId]: newTeacherRecord.salaryStructure!,
      }));
      setShowAddTeacherModal(false);
      setNewTeacherForm({
        name: "",
        designation: "TGT Mathematics",
        subjects: "Mathematics",
        monthlyBaseSalary: 25000,
        allowanceHra: 3000,
        allowanceTravel: 1500,
        allowanceSpecial: 1000,
        deductionPf: 1200,
        phone: "",
        email: "",
      });
      showNotification(`Naye teacher "${newTeacherRecord.name}" aur unka monthly salary structure add ho gaya!`);
      if (onTeachersUpdated) onTeachersUpdated();
    } catch (err: any) {
      alert("Error adding teacher: " + (err?.message || "Failed"));
    }
  };

  // Filtered lists
  const filteredClasses = classesList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.section && c.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTeachers = teachersList.filter(
    (t) =>
      t.name?.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
      t.designation?.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
      (t.subjects && t.subjects.join(" ").toLowerCase().includes(teacherSearchQuery.toLowerCase())) ||
      (t.employeeId && t.employeeId.toLowerCase().includes(teacherSearchQuery.toLowerCase()))
  );

  // Teacher monthly payroll stats
  const teacherPayrollStats = useMemo(() => {
    let totalPayroll = 0;
    let configuredCount = 0;
    teachersList.forEach((t) => {
      const struct = teacherPayForms[t.id];
      const net = struct ? struct.netMonthlySalary : Number(t.monthlySalary || t.salary || 0);
      if (net > 0) configuredCount++;
      totalPayroll += net;
    });
    const avgSalary = teachersList.length > 0 ? Math.round(totalPayroll / teachersList.length) : 0;
    return {
      totalTeachers: teachersList.length,
      totalPayroll,
      avgSalary,
      configuredCount,
    };
  }, [teachersList, teacherPayForms]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Toast Banner */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner - Strict Title: "Fee Structure & Heads Management" (No "Class" prefix) */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white px-4 sm:px-8 py-6 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-emerald-200 hover:text-white text-xs font-bold mb-2 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Dashboard
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-inner">
                <IndianRupee className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Fee Structure & Heads Management
                </h1>
                <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
                  छात्र कक्षा शुल्क हेड संरचना एवं शिक्षक मासिक वेतन (Teacher Monthly Pay & Heads) एकीकृत रूप से प्रबंधित करें।
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons based on active tab */}
          {activeTab === "classes" ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleApplyPresetToAllClasses}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                title="Standard School Receipt Preset: Admission 65K, Tuition 19.1K, Caution 60K, Annual 23.3K, Bus 10.3K"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Apply Standard Preset to All</span>
              </button>
              <button
                onClick={handleSaveAllClasses}
                disabled={savingAllClasses}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {savingAllClasses ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{savingAllClasses ? "Saving All..." : "Save All Classes"}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowAddTeacherModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/60 hover:bg-emerald-600 border border-emerald-400/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-emerald-300" />
                <span>+ Add Faculty Member</span>
              </button>
              <button
                onClick={handleSaveAllTeachersPay}
                disabled={savingAllTeachers}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-400/30 transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {savingAllTeachers ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{savingAllTeachers ? "Saving All Teachers..." : "Save All Teacher Salaries"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Main Segmented Switcher: Student Fee Heads vs Teacher Monthly Pay */}
        <div className="flex items-center justify-center sm:justify-start">
          <div className="inline-flex p-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-2xl border border-slate-300/60 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => setActiveTab("classes")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === "classes"
                  ? "bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-sm ring-1 ring-emerald-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Class Fee Heads ({classesList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("teachers")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === "teachers"
                  ? "bg-white dark:bg-indigo-600 text-indigo-800 dark:text-white shadow-sm ring-1 ring-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Teacher Monthly Salary & Pay Heads ({teachersList.length})</span>
            </button>
          </div>
        </div>

        {/* ===================== TAB 1: STUDENT CLASS FEE HEADS ===================== */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            {/* Info & Search Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Active Classes</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{classesList.length} Classes</p>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <p className="text-xs text-slate-500 mt-1">Search query badal kar dekhein ya Classes management se classes add karein.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClasses.map((cls, idx) => {
                  const currentStructure = feeForms[cls.id] || {
                    admissionFee: 0, registrationFee: 0, tuitionFee: 0, cautionMoney: 0, annualCharges: 0, busFee: 0,
                  };
                  const totalAmount = calculateTotal(currentStructure);
                  const isSavingThis = savingClassId === cls.id;
                  const classStudentCount = allStudents.filter((s) => isStudentInClass(s, cls.id, cls.name)).length;

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
                                {classStudentCount > 0 ? `${classStudentCount} Students` : "Enrolled Students"}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Total Rate: ₹{totalAmount.toLocaleString("en-IN")}
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
                                  onChange={(e) => handleFieldChange(cls.id, hd.field, e.target.value)}
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
        )}

        {/* ===================== TAB 2: TEACHER MONTHLY SALARY & HEADS ===================== */}
        {activeTab === "teachers" && (
          <div className="space-y-6">
            {/* Top Stat Cards for Teachers Monthly Payroll */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Faculty / Staff</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{teacherPayrollStats.totalTeachers} Teachers</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Monthly Payroll</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{teacherPayrollStats.totalPayroll.toLocaleString("en-IN")} <span className="text-xs font-semibold text-slate-400">/mo</span>
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Average Monthly Pay</p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                    ₹{teacherPayrollStats.avgSalary.toLocaleString("en-IN")} <span className="text-xs font-semibold text-slate-400">/mo</span>
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configured Salaries</p>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400">
                    {teacherPayrollStats.configuredCount} / {teacherPayrollStats.totalTeachers} Staff
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Batch Presets & Search */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  placeholder="Search teacher by name, designation, subject, or employee ID..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyPresetToAllTeachers("prt")}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold transition cursor-pointer"
                >
                  PRT (₹21k)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetToAllTeachers("tgt")}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition cursor-pointer"
                >
                  TGT (₹30k)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetToAllTeachers("pgt")}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                >
                  PGT (₹42k)
                </button>
              </div>
            </div>

            {/* Teachers Monthly Pay Cards List */}
            {filteredTeachers.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Koi teacher nahi mila</h3>
                <p className="text-xs text-slate-500 mt-1">Naya teacher jodne ke liye upar diye "+ Add Faculty Member" button ka prayog karein.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTeachers.map((teacher, idx) => {
                  const pay = teacherPayForms[teacher.id] || {
                    monthlyBaseSalary: Number(teacher.monthlySalary || teacher.salary || 25000),
                    allowanceHra: 0,
                    allowanceTravel: 0,
                    allowanceSpecial: 0,
                    deductionPf: 0,
                    deductionOther: 0,
                    netMonthlySalary: Number(teacher.monthlySalary || teacher.salary || 25000),
                    paymentMode: "Bank Transfer",
                  };

                  const isSavingThis = savingTeacherId === teacher.id;

                  return (
                    <div
                      key={teacher.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs hover:border-indigo-500/40 transition-all"
                    >
                      {/* Teacher Profile & Actions */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-3.5">
                          {teacher.photoUrl ? (
                            <img
                              src={teacher.photoUrl}
                              alt={teacher.name}
                              className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/20 shadow-xs"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-base flex items-center justify-center border border-indigo-500/20 shadow-inner">
                              {teacher.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {teacher.name}
                              </h3>
                              {teacher.designation && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300/30">
                                  {teacher.designation}
                                </span>
                              )}
                              {teacher.employeeId && (
                                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  ID: {teacher.employeeId}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                              {teacher.subjects && teacher.subjects.length > 0 && (
                                <span>Sub: {teacher.subjects.join(", ")}</span>
                              )}
                              {teacher.phone && <span>• Tel: {teacher.phone}</span>}
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                Net Monthly: ₹{pay.netMonthlySalary.toLocaleString("en-IN")}/mo
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Presets and Individual Save Button */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleApplyPresetToTeacher(teacher.id, e.target.value);
                            }}
                            defaultValue=""
                            className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
                          >
                            <option value="" disabled>Load Preset...</option>
                            <option value="prt">PRT (₹21k)</option>
                            <option value="tgt">TGT (₹30k)</option>
                            <option value="pgt">PGT (₹42k)</option>
                            <option value="admin_principal">VP / Coord (₹55k)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleSaveTeacherPay(teacher)}
                            disabled={isSavingThis}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-60 cursor-pointer"
                          >
                            {isSavingThis ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>{isSavingThis ? "Saving..." : "Save Teacher Salary"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Monthly Salary Heads Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-4">
                        {/* 1. Base Salary */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block truncate">
                            1. Monthly Basic (मूल वेतन)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={pay.monthlyBaseSalary || ""}
                              onChange={(e) => handleTeacherPayChange(teacher.id, "monthlyBaseSalary", e.target.value)}
                              placeholder="25000"
                              className="w-full pl-6 pr-2 py-2 text-xs sm:text-sm font-bold tabular-nums rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* 2. HRA */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block truncate">
                            2. HRA (मकान किराया)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={pay.allowanceHra || ""}
                              onChange={(e) => handleTeacherPayChange(teacher.id, "allowanceHra", e.target.value)}
                              placeholder="0"
                              className="w-full pl-6 pr-2 py-2 text-xs sm:text-sm font-bold tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* 3. Travel Allowance */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block truncate">
                            3. Travel / DA (यात्रा भत्ता)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={pay.allowanceTravel || ""}
                              onChange={(e) => handleTeacherPayChange(teacher.id, "allowanceTravel", e.target.value)}
                              placeholder="0"
                              className="w-full pl-6 pr-2 py-2 text-xs sm:text-sm font-bold tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* 4. Special Allowance */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block truncate">
                            4. Special (विशेष भत्ता)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={pay.allowanceSpecial || ""}
                              onChange={(e) => handleTeacherPayChange(teacher.id, "allowanceSpecial", e.target.value)}
                              placeholder="0"
                              className="w-full pl-6 pr-2 py-2 text-xs sm:text-sm font-bold tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* 5. PF / ESI Deductions */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-rose-600 dark:text-rose-400 block truncate">
                            5. PF/ESI Cut (कटौती)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold">-₹</span>
                            <input
                              type="number"
                              min="0"
                              value={pay.deductionPf || ""}
                              onChange={(e) => handleTeacherPayChange(teacher.id, "deductionPf", e.target.value)}
                              placeholder="0"
                              className="w-full pl-7 pr-2 py-2 text-xs sm:text-sm font-bold tabular-nums rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                        </div>

                        {/* 6. Payment Mode */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block truncate">
                            6. Mode (भुगतान माध्यम)
                          </label>
                          <select
                            value={pay.paymentMode || "Bank Transfer"}
                            onChange={(e) => handleTeacherPayChange(teacher.id, "paymentMode", e.target.value)}
                            className="w-full px-2 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="UPI">UPI</option>
                          </select>
                        </div>

                        {/* Net Monthly Payable Card */}
                        <div className="space-y-1 bg-gradient-to-br from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/40 p-2.5 rounded-xl border border-indigo-500/20">
                          <label className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                            Net Monthly Pay
                          </label>
                          <div className="text-sm sm:text-base font-black tabular-nums text-emerald-700 dark:text-emerald-300 pt-0.5">
                            ₹{pay.netMonthlySalary.toLocaleString("en-IN")}
                          </div>
                          <span className="text-[10px] text-slate-400 block font-semibold">/month</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add Faculty / Teacher</h3>
                  <p className="text-xs text-slate-500">Teacher profile aur unka monthly salary structure set karein</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTeacherWithSalary} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                    Teacher Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeacherForm.name}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={newTeacherForm.designation}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, designation: e.target.value })}
                    placeholder="e.g. TGT Mathematics"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                    Main Subject
                  </label>
                  <input
                    type="text"
                    value={newTeacherForm.subjects}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, subjects: e.target.value })}
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newTeacherForm.phone}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Monthly Salary Head Setup */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Monthly Salary Structure
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Base Salary (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTeacherForm.monthlyBaseSalary}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, monthlyBaseSalary: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      HRA (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTeacherForm.allowanceHra}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, allowanceHra: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Travel / DA (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTeacherForm.allowanceTravel}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, allowanceTravel: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Special (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTeacherForm.allowanceSpecial}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, allowanceSpecial: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">
                      PF Cut (-₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTeacherForm.deductionPf}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, deductionPf: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300"
                    />
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Net Pay</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ₹{Math.max(
                        0,
                        (Number(newTeacherForm.monthlyBaseSalary) || 0) +
                        (Number(newTeacherForm.allowanceHra) || 0) +
                        (Number(newTeacherForm.allowanceTravel) || 0) +
                        (Number(newTeacherForm.allowanceSpecial) || 0) -
                        (Number(newTeacherForm.deductionPf) || 0)
                      ).toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Save & Add Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Also export as FeeStructureSection for semantic consistency
export const FeeStructureSection = ClassFeeStructureSection;
