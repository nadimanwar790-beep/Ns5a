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
  if (!isOpen) return null;

  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || "");
  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  const getInitialStructure = (c?: SchoolClass): ClassFeeStructure => {
    if (c?.feeStructure) {
      return {
        admissionFee: Number(c.feeStructure.admissionFee || 0),
        tuitionFee: Number(c.feeStructure.tuitionFee || c.defaultFee || 0),
        cautionMoney: Number(c.feeStructure.cautionMoney || 0),
        annualCharges: Number(c.feeStructure.annualCharges || 0),
        busFee: Number(c.feeStructure.busFee || 0),
        customHeads: c.feeStructure.customHeads || [],
      };
    }
    // Standard defaults matching DPS layout
    return {
      admissionFee: 65000,
      tuitionFee: Number(c?.defaultFee || 19140),
      cautionMoney: 60000,
      annualCharges: 23320,
      busFee: 10360,
      customHeads: [],
    };
  };

  const [structure, setStructure] = useState<ClassFeeStructure>(() => getInitialStructure(currentClass));
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [newHeadName, setNewHeadName] = useState("");
  const [newHeadAmount, setNewHeadAmount] = useState<number | "">("");

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const target = classes.find(c => c.id === newClassId);
    setStructure(getInitialStructure(target));
    setSuccessMsg("");
  };

  const handleAddCustomHead = () => {
    if (!newHeadName.trim() || !newHeadAmount) return;
    const newHead: ClassFeeHead = {
      id: String(Date.now()),
      name: newHeadName.trim(),
      amount: Number(newHeadAmount) || 0,
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

  const handleApplyDpsPreset = () => {
    // Exact values from Delhi Public School receipt image uploaded by user
    setStructure({
      admissionFee: 65000,
      tuitionFee: 19140,
      cautionMoney: 60000,
      annualCharges: 23320,
      busFee: 10360,
      customHeads: [],
    });
    setSuccessMsg("DPS Receipt photo preset apply ho gaya!");
  };

  const handleSave = async () => {
    if (!currentClass) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      await updateClassFeeStructure(schoolId, currentClass.id, structure);
      setSuccessMsg(`✅ ${currentClass.name} ki fee structure save ho gayi!`);
      if (onUpdated) onUpdated();
    } catch (e: any) {
      alert("Fee save karne me error aaya: " + (e?.message || "Please retry"));
    } finally {
      setSaving(false);
    }
  };

  const totalFee =
    Number(structure.admissionFee || 0) +
    Number(structure.tuitionFee || 0) +
    Number(structure.cautionMoney || 0) +
    Number(structure.annualCharges || 0) +
    Number(structure.busFee || 0) +
    (structure.customHeads || []).reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

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
              onClick={handleApplyDpsPreset}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg flex items-center justify-center gap-1.5 shadow transition shrink-0 self-end sm:self-auto"
              title="Delhi Public School Receipt ke standard heads load karein"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load DPS Receipt Preset
            </button>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 5 Authentic Fee Heads from the Receipt Picture */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Official Fee Heads ({currentClass?.name || "Class"})
              </h3>
              <span className="text-xs font-bold text-slate-500">Amount (₹)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Admission Fee */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 text-[10px] font-black flex items-center justify-center">1</span>
                    Admission Fee
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">One-time / Session</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={structure.admissionFee}
                    onChange={e => setStructure({ ...structure, admissionFee: Number(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm font-black bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    placeholder="65000"
                  />
                </div>
              </div>

              {/* 2. Tuition Fee */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-[10px] font-black flex items-center justify-center">2</span>
                    Tuition Fee
                  </span>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">Monthly / Quarterly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={structure.tuitionFee}
                    onChange={e => setStructure({ ...structure, tuitionFee: Number(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm font-black bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    placeholder="19140"
                  />
                </div>
              </div>

              {/* 3. Caution Money */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-black flex items-center justify-center">3</span>
                    Caution Money
                  </span>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">Refundable Security</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={structure.cautionMoney}
                    onChange={e => setStructure({ ...structure, cautionMoney: Number(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm font-black bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    placeholder="60000"
                  />
                </div>
              </div>

              {/* 4. Annual Charges */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 text-[10px] font-black flex items-center justify-center">4</span>
                    Annual Charges
                  </span>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">Yearly Maintenance</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={structure.annualCharges}
                    onChange={e => setStructure({ ...structure, annualCharges: Number(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm font-black bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    placeholder="23320"
                  />
                </div>
              </div>

              {/* 5. Bus Fee */}
              <div className="col-span-1 sm:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center">5</span>
                    Bus Fee (Transport)
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">Transport Facility</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={structure.busFee}
                    onChange={e => setStructure({ ...structure, busFee: Number(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm font-black bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    placeholder="10360"
                  />
                </div>
              </div>
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
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Total Standard Class Fee:</span>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">Sabhi heads ka kul yog (Admission + Tuition + Caution + Annual + Bus)</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-blue-950 dark:text-blue-100">₹{totalFee.toLocaleString("en-IN")}</span>
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
