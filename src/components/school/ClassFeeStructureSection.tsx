// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  IndianRupee, Save, RotateCcw, Sparkles, CheckCircle2,
  GraduationCap, Search, AlertCircle, RefreshCw, ChevronLeft,
  Sliders, ShieldCheck, ArrowRight, Check, Info, Users,
  UserCheck, Briefcase, Plus, X, Building2, Wallet,
  CreditCard, TrendingUp, Filter, Award, Trash2, Copy,
  Layers, ChevronDown, ChevronUp, FolderPlus, Tag
} from "lucide-react";
import type {
  SchoolClass,
  ClassFeeStructure,
  ClassFeeGroup,
  ClassFeeHead,
  FeeSectionBucket,
  SchoolTeacher,
  SchoolAccountant,
  TeacherSalaryStructure,
} from "../../school-types";
import {
  FEE_SECTION_OPTIONS,
  FEE_GROUP_TEMPLATES,
  getFeeSectionMeta,
  makeFeeUid,
  normalizeFeeGroups,
  syncStructureFromFeeGroups,
  calculateFeeGroupsTotals,
  calculateGroupDiscount,
  getMonthlyFeeFromStructure,
  isGroupShownInAdmission,
  isItemShownInAdmission,
  type FeeGroupTemplate,
} from "../../utils/feeStructureUtils";
import {
  updateClassFeeStructure,
  updateStudent,
  subscribeToAllStudents,
  isStudentInClass,
  updateTeacher,
  saveTeacher,
  subscribeToTeachers,
  subscribeToAccountants,
  saveAccountant,
} from "../../school-firebase";

interface Props {
  schoolId: string;
  sessionId?: string;
  onBack?: () => void;
  classes: SchoolClass[];
  teachers?: SchoolTeacher[];
  viewMode?: "all" | "classes_only" | "teachers_only";
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
  viewMode = "all",
  onClassesUpdated,
  onTeachersUpdated,
}) => {
  // Active Tab: "classes" (Student Class Fee Heads) vs "teachers" (Teacher Monthly Salary & Pay Structure)
  const [activeTab, setActiveTab] = useState<"classes" | "teachers">(
    viewMode === "teachers_only" ? "teachers" : "classes"
  );

  useEffect(() => {
    if (viewMode === "classes_only") setActiveTab("classes");
    else if (viewMode === "teachers_only") setActiveTab("teachers");
  }, [viewMode]);

  // Classes state
  const [classesList, setClassesList] = useState<SchoolClass[]>(initialClasses || []);
  const [feeForms, setFeeForms] = useState<Record<string, ClassFeeStructure>>({});
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [savingAllClasses, setSavingAllClasses] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});
  const [newGroupDrafts, setNewGroupDrafts] = useState<
    Record<string, { title: string; billingSection: FeeSectionBucket; targetSection: string }>
  >({});
  const [newItemDrafts, setNewItemDrafts] = useState<
    Record<string, { name: string; amount: string }>
  >({});

  // Teachers + Accountants state
  const [rawTeachers, setRawTeachers] = useState<SchoolTeacher[]>(initialTeachers || []);
  const [rawAccountants, setRawAccountants] = useState<SchoolAccountant[]>([]);
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
      setRawTeachers(initialTeachers);
    }
  }, [initialTeachers]);

  // Live subscription to teachers & accountants
  useEffect(() => {
    const unsubT = subscribeToTeachers(schoolId, (teachers) => {
      if (teachers) {
        setRawTeachers(teachers);
      }
    });
    const unsubA = subscribeToAccountants(schoolId, (accs) => {
      if (accs) {
        setRawAccountants(accs);
      }
    });
    return () => {
      unsubT();
      unsubA();
    };
  }, [schoolId]);

  useEffect(() => {
    const normPhone = (p?: string) => String(p || "").replace(/[^0-9]/g, "").slice(-10);
    const normName = (n?: string) => String(n || "").trim().toLowerCase();
    const activeAccs = (rawAccountants || []).filter((a) => a && a.active !== false);

    const merged: any[] = (rawTeachers || []).map((t) => {
      const tPhone = normPhone(t.phone);
      const tName = normName(t.name);
      const matchedAcc = activeAccs.find(
        (a) =>
          a.teacherRef === t.id ||
          a.id === t.id ||
          (tPhone.length >= 8 && normPhone(a.phone) === tPhone) ||
          (tName && normName(a.name) === tName)
      );
      if (!matchedAcc) return t;
      return {
        ...t,
        _isAccountant: true,
        _accountantId: matchedAcc.id,
        monthlySalary: t.monthlySalary || matchedAcc.monthlySalary || 0,
        salaryStructure: t.salaryStructure || matchedAcc.salaryStructure,
      };
    });

    activeAccs.forEach((acc) => {
      const accPhone = normPhone(acc.phone);
      const accName = normName(acc.name);
      const alreadyInList = merged.some(
        (t) =>
          t.id === acc.id ||
          acc.teacherRef === t.id ||
          t._accountantId === acc.id ||
          (accPhone.length >= 8 && normPhone(t.phone) === accPhone) ||
          (accName && normName(t.name) === accName)
      );
      if (!alreadyInList) {
        merged.push({
          id: acc.id,
          schoolId: acc.schoolId || schoolId,
          name: acc.name,
          email: acc.email || "",
          phone: acc.phone || "",
          photoUrl: acc.photoUrl || undefined,
          employeeId: acc.employeeId || "ACC",
          designation: acc.designation || "Accountant & Cashier",
          subjects: [],
          classes: [],
          joinDate: acc.joinDate || new Date().toISOString().split("T")[0],
          monthlySalary: acc.monthlySalary || 0,
          salary: acc.monthlySalary || 0,
          salaryStructure: acc.salaryStructure,
          active: true,
          createdAt: acc.createdAt || new Date().toISOString(),
          _isAccountant: true,
          _isAccountantOnly: true,
          _accountantId: acc.id,
        });
      }
    });

    setTeachersList(merged);
  }, [rawTeachers, rawAccountants, schoolId]);

  // Live subscription to students
  useEffect(() => {
    const unsub = subscribeToAllStudents(schoolId, (st) => setAllStudents(st));
    return unsub;
  }, [schoolId]);

  // Initialize fee forms for each class (migrates legacy 6-heads seamlessly into unlimited feeGroups)
  useEffect(() => {
    const initialForms: Record<string, ClassFeeStructure> = {};
    classesList.forEach((cls) => {
      const fs = cls.feeStructure;
      const groups = normalizeFeeGroups(fs, Number(cls.defaultFee || 0));
      initialForms[cls.id] = syncStructureFromFeeGroups(groups, fs || undefined);
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

  // --- Dynamic Fee Groups & Sub-Groups Handlers ---
  const updateClassGroups = (
    classId: string,
    updater: (groups: ClassFeeGroup[]) => ClassFeeGroup[]
  ) => {
    setFeeForms((prev) => {
      const current = prev[classId] || syncStructureFromFeeGroups([], undefined);
      const nextGroups = updater(current.feeGroups || []);
      return {
        ...prev,
        [classId]: syncStructureFromFeeGroups(nextGroups, current),
      };
    });
  };

  const handleToggleGroupEnabled = (classId: string, groupId: string) => {
    updateClassGroups(classId, (groups) =>
      groups.map((g) => (g.id === groupId ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const handleUpdateGroupField = (
    classId: string,
    groupId: string,
    patch: Partial<ClassFeeGroup>
  ) => {
    updateClassGroups(classId, (groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const nextGroup = { ...g, ...patch };
        // If group's billingSection or targetSection changes, sync children whose section matches old group section
        if (patch.billingSection && patch.billingSection !== g.billingSection) {
          nextGroup.items = nextGroup.items.map((it) => ({
            ...it,
            billingSection: patch.billingSection,
          }));
        }
        if (patch.targetSection !== undefined && patch.targetSection !== g.targetSection) {
          nextGroup.items = nextGroup.items.map((it) => ({
            ...it,
            targetSection: patch.targetSection,
          }));
        }
        if (patch.showInAdmission !== undefined) {
          nextGroup.items = nextGroup.items.map((it) => ({
            ...it,
            showInAdmission: patch.showInAdmission,
          }));
        }
        return nextGroup;
      })
    );
  };

  const handleDeleteGroup = (classId: string, groupId: string) => {
    updateClassGroups(classId, (groups) => groups.filter((g) => g.id !== groupId));
  };

  const handleAddGroupFromDraft = (classId: string) => {
    const draft = newGroupDrafts[classId] || {
      title: "",
      billingSection: "annual" as FeeSectionBucket,
      targetSection: "ALL",
    };
    const title = draft.title.trim();
    if (!title) {
      toast.error("Kripya Group ka naam likhein (e.g. Annual Fee, Development Fee)");
      return;
    }
    const gId = makeFeeUid("grp");
    const defaultShowAdm = (draft.billingSection || "annual") !== "monthly";
    const newGroup: ClassFeeGroup = {
      id: gId,
      title,
      billingSection: draft.billingSection || "annual",
      targetSection: draft.targetSection || "ALL",
      enabled: true,
      showInAdmission: defaultShowAdm,
      items: [
        {
          id: makeFeeUid("sub"),
          name: title,
          amount: 0,
          enabled: true,
          showInAdmission: defaultShowAdm,
          billingSection: draft.billingSection || "annual",
          targetSection: draft.targetSection || "ALL",
        },
      ],
    };
    updateClassGroups(classId, (groups) => [...groups, newGroup]);
    setNewGroupDrafts((prev) => ({
      ...prev,
      [classId]: { title: "", billingSection: draft.billingSection, targetSection: "ALL" },
    }));
    setCollapsedClasses((prev) => ({ ...prev, [classId]: false }));
  };

  const handleAddTemplateGroup = (classId: string, tpl: FeeGroupTemplate) => {
    const gId = makeFeeUid("grp");
    const defaultShowAdm = tpl.billingSection !== "monthly";
    const newGroup: ClassFeeGroup = {
      id: gId,
      title: tpl.title,
      billingSection: tpl.billingSection,
      targetSection: "ALL",
      enabled: true,
      showInAdmission: defaultShowAdm,
      items: tpl.items.map((it) => ({
        id: makeFeeUid("sub"),
        name: it.name,
        amount: it.amount,
        enabled: true,
        showInAdmission: defaultShowAdm,
        billingSection: tpl.billingSection,
        targetSection: "ALL",
        isUserOptional: Boolean(it.isUserOptional),
      })),
    };
    updateClassGroups(classId, (groups) => [...groups, newGroup]);
    setCollapsedClasses((prev) => ({ ...prev, [classId]: false }));
  };

  const handleAddSubItem = (classId: string, groupId: string) => {
    const draftKey = `${classId}__${groupId}`;
    const draft = newItemDrafts[draftKey] || { name: "", amount: "" };
    const name = draft.name.trim();
    if (!name) {
      toast.error("Kripya Sub-Group / Fee Item ka naam likhein");
      return;
    }
    const amt = Math.max(0, parseInt(draft.amount, 10) || 0);
    updateClassGroups(classId, (groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const newItem: ClassFeeHead = {
          id: makeFeeUid("sub"),
          name,
          amount: amt,
          enabled: true,
          showInAdmission: isGroupShownInAdmission(g),
          billingSection: g.billingSection,
          targetSection: g.targetSection || "ALL",
        };
        return { ...g, items: [...g.items, newItem] };
      })
    );
    setNewItemDrafts((prev) => ({ ...prev, [draftKey]: { name: "", amount: "" } }));
  };

  const handleUpdateSubItem = (
    classId: string,
    groupId: string,
    itemId: string,
    patch: Partial<ClassFeeHead>
  ) => {
    updateClassGroups(classId, (groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const nextItems = g.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
        const nextGrpShowAdm =
          patch.showInAdmission !== undefined
            ? nextItems.some((it) =>
                typeof it.showInAdmission === "boolean"
                  ? it.showInAdmission
                  : isItemShownInAdmission(it, g)
              )
            : g.showInAdmission;
        return {
          ...g,
          showInAdmission: nextGrpShowAdm,
          items: nextItems,
        };
      })
    );
  };

  const handleDeleteSubItem = (classId: string, groupId: string, itemId: string) => {
    updateClassGroups(classId, (groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, items: g.items.filter((it) => it.id !== itemId) };
      })
    );
  };

  const cloneGroupsWithFreshIds = (sourceGroups: ClassFeeGroup[]): ClassFeeGroup[] =>
    sourceGroups.map((g) => {
      const nextGId = makeFeeUid("grp");
      return {
        ...g,
        id: nextGId,
        items: (g.items || []).map((it) => ({
          ...it,
          id: makeFeeUid("sub"),
          groupId: nextGId,
        })),
      };
    });

  const handleCopyStructureToAllClasses = (sourceClassId: string) => {
    const sourceForm = feeForms[sourceClassId];
    if (!sourceForm?.feeGroups) return;
    const sourceClass = classesList.find((c) => c.id === sourceClassId);
    const updated: Record<string, ClassFeeStructure> = {};
    classesList.forEach((cls) => {
      if (cls.id === sourceClassId) {
        updated[cls.id] = sourceForm;
      } else {
        const clonedGroups = cloneGroupsWithFreshIds(sourceForm.feeGroups || []);
        updated[cls.id] = syncStructureFromFeeGroups(clonedGroups, feeForms[cls.id]);
      }
    });
    setFeeForms(updated);
    showNotification(
      `${sourceClass?.name || "Class"} ke sabhi Fee Groups & Sub-Groups baaki sabhi classes me copy ho gaye! 'Save All Classes' dabayein.`
    );
  };

  const calculateTotal = (structure?: ClassFeeStructure): number => {
    if (!structure) return 0;
    if (structure.feeGroups && structure.feeGroups.length > 0) {
      return calculateFeeGroupsTotals(structure.feeGroups).withoutOptional;
    }
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
    const presetGroups = normalizeFeeGroups(
      {
        ...DPS_OFFICIAL_FEE_PRESET,
        registrationFee: Number(feeForms[classId]?.registrationFee || 0),
        enabledHeads: {
          admissionFee: true,
          registrationFee: Boolean(feeForms[classId]?.enabledHeads?.registrationFee),
          tuitionFee: true,
          cautionMoney: true,
          annualCharges: true,
          busFee: true,
        },
      },
      DPS_OFFICIAL_FEE_PRESET.tuitionFee
    );
    setFeeForms((prev) => ({
      ...prev,
      [classId]: syncStructureFromFeeGroups(presetGroups, prev[classId]),
    }));
    showNotification("Standard Fee Groups Preset loaded. Click 'Save Class Fee' to persist.");
  };

  const handleApplyPresetToAllClasses = () => {
    const updated: Record<string, ClassFeeStructure> = {};
    classesList.forEach((c) => {
      const presetGroups = normalizeFeeGroups(
        {
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
        },
        DPS_OFFICIAL_FEE_PRESET.tuitionFee
      );
      updated[c.id] = syncStructureFromFeeGroups(presetGroups, feeForms[c.id]);
    });
    setFeeForms(updated);
    showNotification("Preset loaded for all classes. Click 'Save All Classes' to save.");
  };

  const handleSaveClass = async (cls: SchoolClass) => {
    const current = feeForms[cls.id];
    if (!current) return;
    setSavingClassId(cls.id);
    try {
      const synced = syncStructureFromFeeGroups(current.feeGroups || [], current);
      await updateClassFeeStructure(schoolId, cls.id, synced);
      const classStudents = allStudents.filter((s) => isStudentInClass(s, cls.id, cls.name));
      if (classStudents.length > 0) {
        for (const st of classStudents) {
          const nextMonthly = getMonthlyFeeFromStructure(synced, synced.tuitionFee || 0, st.section);
          if (nextMonthly > 0 && st.monthlyFee !== nextMonthly) {
            await updateStudent(schoolId, st.id, { monthlyFee: nextMonthly });
          }
        }
      }
      showNotification(`${cls.name} ke sabhi fee groups, sub-groups aur sections save ho gaye!`);
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
          const synced = syncStructureFromFeeGroups(current.feeGroups || [], current);
          await updateClassFeeStructure(schoolId, cls.id, synced);
          const classStudents = allStudents.filter((s) => isStudentInClass(s, cls.id, cls.name));
          for (const st of classStudents.slice(0, 15)) {
            const nextMonthly = getMonthlyFeeFromStructure(synced, synced.tuitionFee || 0, st.section);
            if (nextMonthly > 0 && st.monthlyFee !== nextMonthly) {
              await updateStudent(schoolId, st.id, { monthlyFee: nextMonthly });
            }
          }
        }
      }
      showNotification(`Sabhi ${classesList.length} classes ki custom fee structure save ho gayi!`);
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

  const handleSaveTeacherPay = async (teacher: any) => {
    const current = teacherPayForms[teacher.id];
    if (!current) return;
    setSavingTeacherId(teacher.id);
    const updatedStruct = {
      ...current,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (!teacher._isAccountantOnly) {
        await updateTeacher(schoolId, teacher.id, {
          monthlySalary: current.netMonthlySalary,
          salary: current.netMonthlySalary,
          salaryStructure: updatedStruct,
        });
      }
      const linkedAcc = rawAccountants.find(
        (a) => a.id === teacher.id || a.id === teacher._accountantId || a.teacherRef === teacher.id
      );
      if (linkedAcc) {
        await saveAccountant({
          ...linkedAcc,
          monthlySalary: current.netMonthlySalary,
          salaryStructure: updatedStruct,
        });
      }
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
      for (const t of teachersList as any[]) {
        const cur = teacherPayForms[t.id];
        if (cur) {
          const updatedStruct = {
            ...cur,
            updatedAt: new Date().toISOString(),
          };
          if (!t._isAccountantOnly) {
            await updateTeacher(schoolId, t.id, {
              monthlySalary: cur.netMonthlySalary,
              salary: cur.netMonthlySalary,
              salaryStructure: updatedStruct,
            });
          }
          const linkedAcc = rawAccountants.find(
            (a) => a.id === t.id || a.id === t._accountantId || a.teacherRef === t.id
          );
          if (linkedAcc) {
            await saveAccountant({
              ...linkedAcc,
              monthlySalary: cur.netMonthlySalary,
              salaryStructure: updatedStruct,
            });
          }
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
      toast.error("Kripya Teacher ka naam likhein.");
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
      toast.error("Error adding teacher: " + (err?.message || "Failed"));
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
    <div className={viewMode === "teachers_only" ? "space-y-5 pb-12" : "min-h-screen bg-slate-50 dark:bg-slate-900 pb-24"}>
      {/* Toast Banner */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      {viewMode === "teachers_only" ? (
        <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-slate-900 dark:text-white shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Monthly Salary &amp; Pay Heads
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Sabhi teachers aur accountants ka Basic, HRA, Travel/DA, Special Allowance aur PF deduction yahan se configure karein.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddTeacherModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/70 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Add Faculty Member</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAllTeachersPay}
                disabled={savingAllTeachers}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {savingAllTeachers ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{savingAllTeachers ? "Saving All..." : "Save All Salaries"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 px-4 sm:px-8 py-6 text-white shadow-md">
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
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-inner">
                <IndianRupee className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight">
                  Fee Structure &amp; Admission Heads Management
                </h1>
                <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
                  {viewMode === "classes_only"
                    ? "छात्र कक्षा-वार मासिक, वार्षिक व Online/Direct Admission शुल्क (किस हेड को एडमिशन में दिखाना है), ग्रुप व ऑफ (%) डिस्काउंट यहीं से प्रबंधित करें।"
                    : "छात्र कक्षा शुल्क व Online Admission हेड संरचना एवं शिक्षक मासिक वेतन (Teacher Monthly Pay & Heads) एकीकृत रूप से प्रबंधित करें।"}
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
                <span>Add Faculty Member</span>
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
      )}

      <div className={viewMode === "teachers_only" ? "py-4 space-y-6" : "max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6"}>
        {/* Main Segmented Switcher (only shown when viewMode === 'all') */}
        {viewMode === "all" && (
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
        )}

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
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Flexible Fee Engine</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                    Unlimited Groups &amp; Sub-Groups
                  </p>
                </div>
              </div>

              {/* Search box */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search class (e.g. Nursery, Class 2, 10)..."
                  className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-xs"
                />
              </div>
            </div>

            {/* Classes Dynamic Fee Group Builders */}
            {filteredClasses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Koi class nahi mili</h3>
                <p className="text-xs text-slate-500 mt-1">Search query badal kar dekhein ya Classes management se classes add karein.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredClasses.map((cls, idx) => {
                  const currentStructure =
                    feeForms[cls.id] ||
                    syncStructureFromFeeGroups(
                      normalizeFeeGroups(cls.feeStructure, Number(cls.defaultFee || 0)),
                      cls.feeStructure
                    );
                  const groups = currentStructure.feeGroups || [];
                  const totals = calculateFeeGroupsTotals(groups);
                  const isSavingThis = savingClassId === cls.id;
                  const classStudents = allStudents.filter((s) => isStudentInClass(s, cls.id, cls.name));
                  const classStudentCount = classStudents.length;
                  const isCollapsed = Boolean(collapsedClasses[cls.id]);

                  // Collect known class sections for dropdown
                  const knownSections = Array.from(
                    new Set(
                      [
                        "A",
                        "B",
                        "C",
                        "D",
                        ...(cls.section ? [cls.section] : []),
                        ...classStudents.map((s) => s.section).filter(Boolean),
                      ].map((sec) => String(sec).trim())
                    )
                  ).filter(Boolean);

                  const groupDraft = newGroupDrafts[cls.id] || {
                    title: "",
                    billingSection: "annual" as FeeSectionBucket,
                    targetSection: "ALL",
                  };

                  return (
                    <div
                      key={cls.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 shadow-xs hover:border-emerald-500/40 transition-all"
                    >
                      {/* Class Card Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-500/20 shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {cls.name}
                              </h3>
                              {cls.section && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  Section {cls.section}
                                </span>
                              )}
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
                                {groups.length} Fee Groups
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                {classStudentCount > 0 ? `${classStudentCount} Students` : "Enrolled Students"}
                              </span>
                              <span>•</span>
                              {totals.totalDiscount > 0 && (
                                <span className="line-through text-slate-400 font-bold">
                                  ₹{totals.grossWithoutOptional.toLocaleString("en-IN")}
                                </span>
                              )}
                              <span className="text-emerald-700 dark:text-emerald-400 font-black tabular-nums">
                                Active Total: ₹{totals.withoutOptional.toLocaleString("en-IN")}
                              </span>
                              <span
                                className="text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tabular-nums whitespace-nowrap"
                                title="Online & Direct Admission फॉर्म में दिखने वाला कुल शुल्क (Bus को छोड़कर)"
                              >
                                Admission Form: ₹{(totals.admissionTotal || 0).toLocaleString("en-IN")}
                              </span>
                              {totals.totalDiscount > 0 && (
                                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  Total OFF: -₹{totals.totalDiscount.toLocaleString("en-IN")}
                                </span>
                              )}
                              {totals.optionalTransport > 0 && (
                                <span className="text-[11px] text-slate-500 font-semibold">
                                  (+ ₹{totals.optionalTransport.toLocaleString("en-IN")} Bus/Opt)
                                </span>
                              )}
                            </div>

                            {/* Live Section-wise Breakdown */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {FEE_SECTION_OPTIONS.map((sec) => {
                                const amt = totals.bySection[sec.value] || 0;
                                if (amt <= 0) return null;
                                return (
                                  <span
                                    key={sec.value}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sec.badgeClass}`}
                                  >
                                    {sec.shortLabel}: ₹{amt.toLocaleString("en-IN")}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Class Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyStructureToAllClasses(cls.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Is class ke sabhi Groups aur Sub-Groups baaki sabhi classes me copy karein"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy to All</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyPresetToClass(cls.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-100 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Standard School Receipt Template Values"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Preset</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveClass(cls)}
                            disabled={isSavingThis}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-60 cursor-pointer"
                          >
                            {isSavingThis ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>{isSavingThis ? "Saving..." : "Save Class Fee"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedClasses((prev) => ({
                                ...prev,
                                [cls.id]: !isCollapsed,
                              }))
                            }
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
                            title={isCollapsed ? "Expand Fee Groups" : "Collapse Fee Groups"}
                          >
                            {isCollapsed ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Unlimited Fee Groups + Sub-Groups Builder */}
                      {!isCollapsed && (
                        <div className="pt-4 space-y-3.5">
                          {groups.length === 0 ? (
                            <div className="p-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center bg-slate-50/70 dark:bg-slate-900/40">
                              <p className="text-xs font-bold text-slate-500">
                                Is class me abhi koi Fee Group nahi hai. Neeche "+ Add New Fee Group" ya quick buttons se groups banayein.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                              {groups.map((grp, gIdx) => {
                                const secMeta = getFeeSectionMeta(grp.billingSection);
                                const grpDisc = calculateGroupDiscount(grp);
                                const showOffEditor = Boolean(grp.discountEnabled) || Number(grp.discountValue || 0) > 0;
                                const draftKey = `${cls.id}__${grp.id}`;
                                const subDraft = newItemDrafts[draftKey] || { name: "", amount: "" };

                                return (
                                  <div
                                    key={grp.id}
                                    className={`rounded-2xl border p-3.5 transition-all ${
                                      grp.enabled
                                        ? "bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
                                        : "bg-slate-100/60 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800 opacity-65"
                                    }`}
                                  >
                                    {/* Group Header Controls */}
                                    <div className="flex flex-col gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-700/70">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={grp.enabled}
                                          onChange={() => handleToggleGroupEnabled(cls.id, grp.id)}
                                          className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
                                          title="Group Enable / Disable"
                                        />
                                        <span className="text-[11px] font-black text-slate-400 shrink-0">
                                          #{gIdx + 1}
                                        </span>
                                        <input
                                          type="text"
                                          value={grp.title}
                                          onChange={(e) =>
                                            handleUpdateGroupField(cls.id, grp.id, { title: e.target.value })
                                          }
                                          placeholder="Group Title (e.g. Annual Fee, Development Fee)"
                                          className="flex-1 min-w-0 px-2.5 py-1 text-xs sm:text-sm font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                          {grpDisc.discount > 0 && (
                                            <span className="text-[10px] font-bold line-through text-slate-400 tabular-nums">
                                              ₹{grpDisc.gross.toLocaleString("en-IN")}
                                            </span>
                                          )}
                                          <span className="text-xs font-black tabular-nums px-2 py-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                            ₹{grpDisc.net.toLocaleString("en-IN")}
                                          </span>
                                          {grpDisc.discount > 0 && (
                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                              {grpDisc.badgeText}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteGroup(cls.id, grp.id)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                                          title="Delete Group"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Section Assignment Row (Billing Section + Class Section + Add OFF button) */}
                                      <div className="flex flex-wrap items-center gap-2 pl-6">
                                        <div className="flex items-center gap-1 flex-1 min-w-[145px]">
                                          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                            Fee Section:
                                          </span>
                                          <select
                                            value={grp.billingSection}
                                            onChange={(e) =>
                                              handleUpdateGroupField(cls.id, grp.id, {
                                                billingSection: e.target.value as FeeSectionBucket,
                                              })
                                            }
                                            className={`w-full px-2 py-1 text-[11px] font-bold rounded-lg border focus:outline-none cursor-pointer ${secMeta.badgeClass}`}
                                          >
                                            {FEE_SECTION_OPTIONS.map((opt) => (
                                              <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex items-center gap-1 min-w-[115px]">
                                          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                            Class Sec:
                                          </span>
                                          <select
                                            value={grp.targetSection || "ALL"}
                                            onChange={(e) =>
                                              handleUpdateGroupField(cls.id, grp.id, {
                                                targetSection: e.target.value,
                                              })
                                            }
                                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                                          >
                                            <option value="ALL">All Sections (सभी)</option>
                                            {knownSections.map((sec) => (
                                              <option key={sec} value={sec}>
                                                Section {sec}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                          <label
                                            className={`px-2 py-1 rounded-lg border text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition ${
                                              isGroupShownInAdmission(grp)
                                                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                            }`}
                                            title="टिक होने पर इस ग्रुप के शुल्क Online & Direct Admission फॉर्म में दिखेंगे"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isGroupShownInAdmission(grp)}
                                              onChange={(e) =>
                                                handleUpdateGroupField(cls.id, grp.id, {
                                                  showInAdmission: e.target.checked,
                                                })
                                              }
                                              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                                            />
                                            <span>Admission में दिखाएँ</span>
                                          </label>

                                          {!showOffEditor && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleUpdateGroupField(cls.id, grp.id, {
                                                  discountEnabled: true,
                                                  discountType: grp.discountType || "flat",
                                                  discountValue: grp.discountValue || 0,
                                                })
                                              }
                                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-[10.5px] font-black flex items-center gap-1 transition cursor-pointer shrink-0"
                                              title="Is group par OFF / Discount lagayein"
                                            >
                                              <Tag className="w-3 h-3" />
                                              <span>+ Add OFF</span>
                                            </button>
                                          )}
                                        </div>

                                      {/* Group OFF / Discount Editor Row */}
                                      {showOffEditor && (
                                        <div className="ml-6 p-2 rounded-xl bg-rose-50/80 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800/70 flex flex-wrap items-center gap-1.5">
                                          <label className="flex items-center gap-1 cursor-pointer shrink-0">
                                            <input
                                              type="checkbox"
                                              checked={grp.discountEnabled !== false}
                                              onChange={() =>
                                                handleUpdateGroupField(cls.id, grp.id, {
                                                  discountEnabled: grp.discountEnabled === false,
                                                })
                                              }
                                              className="w-3.5 h-3.5 accent-rose-600 cursor-pointer"
                                            />
                                            <span className="text-[10.5px] font-black text-rose-800 dark:text-rose-300 flex items-center gap-1">
                                              <Tag className="w-3 h-3" />
                                              Group OFF:
                                            </span>
                                          </label>

                                          <select
                                            value={grp.discountType === "percent" ? "percent" : "flat"}
                                            onChange={(e) =>
                                              handleUpdateGroupField(cls.id, grp.id, {
                                                discountType: e.target.value === "percent" ? "percent" : "flat",
                                                discountEnabled: true,
                                              })
                                            }
                                            className="px-1.5 py-1 text-[10.5px] font-black rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-rose-800 dark:text-rose-200 cursor-pointer"
                                          >
                                            <option value="flat">₹ OFF</option>
                                            <option value="percent">% OFF</option>
                                          </select>

                                          <input
                                            type="number"
                                            min="0"
                                            max={grp.discountType === "percent" ? 100 : undefined}
                                            value={grp.discountValue || ""}
                                            onChange={(e) => {
                                              const raw = Math.max(0, parseInt(e.target.value, 10) || 0);
                                              handleUpdateGroupField(cls.id, grp.id, {
                                                discountEnabled: true,
                                                discountValue:
                                                  grp.discountType === "percent" ? Math.min(100, raw) : raw,
                                              });
                                            }}
                                            placeholder={grp.discountType === "percent" ? "%" : "₹"}
                                            className="w-16 px-2 py-1 text-[11px] font-black tabular-nums rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                          />

                                          <input
                                            type="text"
                                            value={grp.discountLabel || ""}
                                            onChange={(e) =>
                                              handleUpdateGroupField(cls.id, grp.id, {
                                                discountLabel: e.target.value,
                                              })
                                            }
                                            placeholder="OFF Reason (e.g. Early Bird, Waiver)"
                                            className="flex-1 min-w-[110px] px-2 py-1 text-[10.5px] font-semibold rounded-lg border border-rose-200/80 dark:border-rose-800/70 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                          />

                                          {grpDisc.discount > 0 && (
                                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md tabular-nums shrink-0">
                                              -₹{grpDisc.discount.toLocaleString("en-IN")} → Net ₹{grpDisc.net.toLocaleString("en-IN")}
                                            </span>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateGroupField(cls.id, grp.id, {
                                                discountEnabled: false,
                                                discountValue: 0,
                                                discountLabel: "",
                                              })
                                            }
                                            className="p-1 text-rose-400 hover:text-rose-700 cursor-pointer shrink-0"
                                            title="OFF Hatayein"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Sub-Groups / Items Inside This Group */}
                                    <div className="pt-2.5 space-y-2">
                                      {grp.items.map((item) => {
                                        const isActive = item.enabled !== false;
                                        return (
                                          <div
                                            key={item.id}
                                            className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl border ${
                                              isActive
                                                ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                : "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800 opacity-65"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isActive}
                                              onChange={() =>
                                                handleUpdateSubItem(cls.id, grp.id, item.id, {
                                                  enabled: !isActive,
                                                })
                                              }
                                              className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer shrink-0"
                                            />
                                            <input
                                              type="text"
                                              value={item.name}
                                              onChange={(e) =>
                                                handleUpdateSubItem(cls.id, grp.id, item.id, {
                                                  name: e.target.value,
                                                })
                                              }
                                              placeholder="Sub-head name"
                                              className="flex-1 min-w-[120px] px-2 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                            <select
                                              value={item.billingSection || grp.billingSection}
                                              onChange={(e) =>
                                                handleUpdateSubItem(cls.id, grp.id, item.id, {
                                                  billingSection: e.target.value as FeeSectionBucket,
                                                })
                                              }
                                              title="Is sub-head ko kis section me lena hai"
                                              className="px-1.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
                                            >
                                              {FEE_SECTION_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                  {opt.shortLabel}
                                                </option>
                                              ))}
                                            </select>
                                            <div className="relative w-24 shrink-0">
                                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                                                ₹
                                              </span>
                                              <input
                                                type="number"
                                                min="0"
                                                value={item.amount || ""}
                                                onChange={(e) =>
                                                  handleUpdateSubItem(cls.id, grp.id, item.id, {
                                                    amount: Math.max(0, parseInt(e.target.value, 10) || 0),
                                                  })
                                                }
                                                placeholder="0"
                                                className="w-full pl-5 pr-2 py-1 text-xs font-black tabular-nums rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                              />
                                            </div>
                                            <label
                                              className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap transition ${
                                                isItemShownInAdmission(item, grp)
                                                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                  : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                                              }`}
                                              title="Online & Direct Admission फॉर्म में शामिल करें"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isItemShownInAdmission(item, grp)}
                                                onChange={(e) =>
                                                  handleUpdateSubItem(cls.id, grp.id, item.id, {
                                                    showInAdmission: e.target.checked,
                                                  })
                                                }
                                                className="w-3 h-3 accent-blue-600 cursor-pointer"
                                              />
                                              <span>Adm</span>
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteSubItem(cls.id, grp.id, item.id)}
                                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                                              title="Remove Sub-Head"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        );
                                      })}

                                      {/* Inline Add Unlimited Sub-Group / Fee Item */}
                                      <div className="flex items-center gap-1.5 pt-1">
                                        <input
                                          type="text"
                                          value={subDraft.name}
                                          onChange={(e) =>
                                            setNewItemDrafts((prev) => ({
                                              ...prev,
                                              [draftKey]: { ...subDraft, name: e.target.value },
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              handleAddSubItem(cls.id, grp.id);
                                            }
                                          }}
                                          placeholder="+ Add Sub-Group / Item (e.g. Lab, Building, Extra...)"
                                          className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                                        />
                                        <div className="relative w-20 shrink-0">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={subDraft.amount}
                                            onChange={(e) =>
                                              setNewItemDrafts((prev) => ({
                                                ...prev,
                                                [draftKey]: { ...subDraft, amount: e.target.value },
                                              }))
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddSubItem(cls.id, grp.id);
                                              }
                                            }}
                                            placeholder="Amt"
                                            className="w-full pl-4 pr-1.5 py-1.5 text-[11px] font-bold tabular-nums bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleAddSubItem(cls.id, grp.id)}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0"
                                        >
                                          <Plus className="w-3 h-3" /> Add
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add New Unlimited Fee Group Section */}
                          <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-slate-50 to-indigo-50/70 dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-indigo-950/20 border border-dashed border-emerald-300 dark:border-emerald-800/70 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                                <FolderPlus className="w-3.5 h-3.5" />
                                Add Unlimited Fee Group &amp; Section (नया ग्रुप जोड़ें)
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {FEE_GROUP_TEMPLATES.map((tpl) => (
                                  <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => handleAddTemplateGroup(cls.id, tpl)}
                                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-2xs"
                                  >
                                    {tpl.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <input
                                type="text"
                                value={groupDraft.title}
                                onChange={(e) =>
                                  setNewGroupDrafts((prev) => ({
                                    ...prev,
                                    [cls.id]: { ...groupDraft, title: e.target.value },
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddGroupFromDraft(cls.id);
                                  }
                                }}
                                placeholder="Custom Group Name (e.g. Annual Fee, Development Fee, Hostel, Sports...)"
                                className="sm:col-span-5 px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <select
                                value={groupDraft.billingSection}
                                onChange={(e) =>
                                  setNewGroupDrafts((prev) => ({
                                    ...prev,
                                    [cls.id]: {
                                      ...groupDraft,
                                      billingSection: e.target.value as FeeSectionBucket,
                                    },
                                  }))
                                }
                                className="sm:col-span-3 px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white cursor-pointer"
                              >
                                {FEE_SECTION_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={groupDraft.targetSection}
                                onChange={(e) =>
                                  setNewGroupDrafts((prev) => ({
                                    ...prev,
                                    [cls.id]: { ...groupDraft, targetSection: e.target.value },
                                  }))
                                }
                                className="sm:col-span-2 px-2.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white cursor-pointer"
                              >
                                <option value="ALL">All Sections</option>
                                {knownSections.map((sec) => (
                                  <option key={sec} value={sec}>
                                    Section {sec}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAddGroupFromDraft(cls.id)}
                                className="sm:col-span-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Group
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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
                              {(teacher as any)._isAccountant && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                                  Accountant
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
