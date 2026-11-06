// @ts-nocheck
import React, { useState } from "react";
import { X, Save, RotateCcw, Plus, Trash2, IndianRupee, Shield, CheckCircle2, Building2, Sparkles } from "lucide-react";
import type { SchoolClass, ClassFeeStructure, ClassFeeHead } from "../../school-types";
import { updateClassFeeStructure } from "../../school-firebase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  schoolId: string;
  onUpdated?: () => void;
}

export const ClassFeeStructureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  classes,
  schoolId,
  onUpdated,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || "");
  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  const getInitialStructure = (c?: SchoolClass): ClassFeeStructure => {
    const fs = c?.feeStructure;
    const rawAdm = Number(fs?.admissionFee || 0);
    const rawReg = Number(fs?.registrationFee || 0);
    const rawTui = Number(fs?.tuitionFee || c?.defaultFee || 0);
    const rawCau = Number(fs?.cautionMoney || 0);
    const rawAnn = Number(fs?.annualCharges || 0);
    const rawBus = Number(fs?.busFee || 0);
    const saved = fs?.enabledHeads;

    return {
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
      customHeads: (fs?.customHeads || []).map(h => ({ ...h, enabled: h.enabled !== false })),
    };
  };

  const [structure, setStructure] = useState<ClassFeeStructure>(() => getInitialStructure(currentClass));
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newHeadName, setNewHeadName] = useState("");
  const [newHeadAmount, setNewHeadAmount] = useState<number | "">("");

  if (!isOpen) return null;

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const target = classes.find(c => c.id === newClassId);
    setStructure(getInitialStructure(target));
    setSuccessMsg("");
    setErrorMsg("");
  };

  const toggleHeadEnabled = (key: "admissionFee" | "registrationFee" | "tuitionFee" | "cautionMoney" | "annualCharges" | "busFee") => {
    setStructure(prev => ({
      ...prev,
      enabledHeads: {
        ...(prev.enabledHeads || {}),
        [key]: !prev.enabledHeads?.[key],
      },
    }));
  };

  const handleAddCustomHead = () => {
    if (!newHeadName.trim() || newHeadAmount === "") return;
    const newHead: ClassFeeHead = {
      id: String(Date.now()),
      name: newHeadName.trim(),
      amount: Number(newHeadAmount) || 0,
      enabled: true,
    };
    setStructure(prev => ({
      ...prev,
      customHeads: [...(prev.customHeads || []), newHead],
    }));
    setNewHeadName("");
    setNewHeadAmount("");
  };

  const handleRemoveCustomHead = (id: string) => {
    setStructure(prev => ({
      ...prev,
      customHeads: (prev.customHeads || []).filter(h => h.id !== id),
    }));
  };

  const handleApplyStandardPreset = () => {
    setStructure({
      admissionFee: 1500,
      registrationFee: 300,
      tuitionFee: Number(currentClass?.defaultFee || 800),
      cautionMoney: 500,
      annualCharges: 1200,
      busFee: 600,
      enabledHeads: {
        admissionFee: true,
        registrationFee: true,
        tuitionFee: true,
        cautionMoney: false,
        annualCharges: true,
        busFee: true,
      },
      customHeads: [],
    });
    setSuccessMsg("Standard school preset load ho gaya! Save button dabayein.");
  };

  const handleSave = async () => {
    if (!currentClass) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await updateClassFeeStructure(schoolId, currentClass.id, structure);
      setSuccessMsg(`${currentClass.name} ki fee aur active heads save ho gaye!`);
      if (onUpdated) onUpdated();
    } catch (e: any) {
      setErrorMsg("Fee save karne me error aaya: " + (e?.message || "Please retry"));
    } finally {
      setSaving(false);
    }
  };

  const toggles = structure.enabledHeads || {};
  const totalFee =
    (toggles.admissionFee ? Number(structure.admissionFee || 0) : 0) +
    (toggles.registrationFee ? Number(structure.registrationFee || 0) : 0) +
    (toggles.tuitionFee ? Number(structure.tuitionFee || 0) : 0) +
    (toggles.cautionMoney ? Number(structure.cautionMoney || 0) : 0) +
    (toggles.annualCharges ? Number(structure.annualCharges || 0) : 0) +
    (structure.customHeads || [])
      .filter(h => h.enabled !== false)
      .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Class-Wise Fee Structure Settings</h2>
              <p className="text-xs text-blue-200">
                Har class ki alag-alag fee heads (Admission, Tuition, Caution, Annual, Bus) set aur edit karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Class Selector & Quick Preset */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Class Chunein jiska Fee Set/Edit karna hai:
              </label>
              <select
                value={selectedClassId}
                onChange={e => handleClassChange(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(Section ${c.section})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleApplyStandardPreset}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg flex items-center justify-center gap-1.5 shadow transition shrink-0 self-end sm:self-auto"
              title="Standard School Receipt ke heads load karein"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Standard Preset
            </button>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Per-Class Active Checkboxes + Amounts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Official Fee Heads &amp; Active Selection ({currentClass?.name || "Class"})
              </h3>
              <span className="text-xs font-bold text-slate-500">[✓] टिक करने पर ही ऑनलाइन दिखेगा व जुड़ेगा</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "admissionFee" as const, label: "1. Admission Fee (प्रवेश शुल्क)", badge: "One-time" },
                { key: "registrationFee" as const, label: "2. Registration Fee (पंजीकरण शुल्क)", badge: "Form/Reg" },
                { key: "annualCharges" as const, label: "3. Annual Charges (वार्षिक शुल्क)", badge: "Yearly" },
                { key: "tuitionFee" as const, label: "4. Tuition Fee (मासिक शिक्षण शुल्क)", badge: "Monthly" },
                { key: "cautionMoney" as const, label: "5. Caution / Kit Fee (कॉशन व किट)", badge: "Optional" },
                { key: "busFee" as const, label: "6. Bus Fee (वाहन — छात्र चुन सकेगा)", badge: "User Bus Toggle" },
              ].map((item) => {
                const active = Boolean(structure.enabledHeads?.[item.key]);
                return (
                  <div
                    key={item.key}
                    className={`p-3.5 rounded-xl border transition ${
                      active
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-75"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5 gap-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleHeadEnabled(item.key)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-semibold shrink-0">{item.badge}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={Number((structure as any)[item.key] || 0)}
                        onChange={e => setStructure({ ...structure, [item.key]: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full pl-7 pr-3 py-2 text-sm font-black tabular-nums bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Heads */}
            {structure.customHeads && structure.customHeads.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Custom Fee Heads</p>
                {structure.customHeads.map(head => (
                  <div key={head.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{head.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">₹{head.amount.toLocaleString("en-IN")}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomHead(head.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Head Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Naya Head (e.g. Lab Charges, Exam Fee)"
                value={newHeadName}
                onChange={e => setNewHeadName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              <input
                type="number"
                placeholder="Amount ₹"
                value={newHeadAmount}
                onChange={e => setNewHeadAmount(e.target.value ? Number(e.target.value) : "")}
                className="w-28 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddCustomHead}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {/* Total Fee Preview */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Active Payable (Without Bus):</span>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                  केवल टिक [✓] किए गए हेड्स का योग {toggles.busFee ? `(बस सहित: ₹${(totalFee + Number(structure.busFee || 0)).toLocaleString("en-IN")})` : ""}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black tabular-nums text-blue-950 dark:text-blue-100">₹{totalFee.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : `Save ${currentClass?.name || "Class"} Fee Structure`}
          </button>
        </div>
      </div>
    </div>
  );
};
