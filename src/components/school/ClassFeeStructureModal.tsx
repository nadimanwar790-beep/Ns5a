// @ts-nocheck
import React, { useState } from "react";
import { X, Save, Plus, Trash2, IndianRupee, CheckCircle2, Sparkles, FolderPlus, Tag } from "lucide-react";
import type {
  SchoolClass,
  ClassFeeStructure,
  ClassFeeGroup,
  ClassFeeHead,
  FeeSectionBucket,
} from "../../school-types";
import { updateClassFeeStructure } from "../../school-firebase";
import {
  FEE_SECTION_OPTIONS,
  FEE_GROUP_TEMPLATES,
  getFeeSectionMeta,
  makeFeeUid,
  normalizeFeeGroups,
  syncStructureFromFeeGroups,
  calculateFeeGroupsTotals,
  calculateGroupDiscount,
} from "../../utils/feeStructureUtils";

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
  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const getInitialStructure = (c?: SchoolClass): ClassFeeStructure => {
    const fs = c?.feeStructure;
    const groups = normalizeFeeGroups(fs, Number(c?.defaultFee || 0));
    return syncStructureFromFeeGroups(groups, fs || undefined);
  };

  const [structure, setStructure] = useState<ClassFeeStructure>(() => getInitialStructure(currentClass));
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // New group draft
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupSection, setNewGroupSection] = useState<FeeSectionBucket>("annual");
  const [newGroupTargetSec, setNewGroupTargetSec] = useState("ALL");

  // New sub-item draft per group
  const [subItemDrafts, setSubItemDrafts] = useState<Record<string, { name: string; amount: string }>>({});

  if (!isOpen) return null;

  const groups: ClassFeeGroup[] = structure.feeGroups || [];

  const updateGroups = (updater: (prev: ClassFeeGroup[]) => ClassFeeGroup[]) => {
    setStructure((prev) => {
      const nextGroups = updater(prev.feeGroups || []);
      return syncStructureFromFeeGroups(nextGroups, prev);
    });
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const target = classes.find((c) => c.id === newClassId);
    setStructure(getInitialStructure(target));
    setSuccessMsg("");
    setErrorMsg("");
  };

  const handleAddGroup = () => {
    const title = newGroupTitle.trim();
    if (!title) return;
    const newGroup: ClassFeeGroup = {
      id: makeFeeUid("grp"),
      title,
      billingSection: newGroupSection,
      targetSection: newGroupTargetSec || "ALL",
      enabled: true,
      items: [
        {
          id: makeFeeUid("sub"),
          name: title,
          amount: 0,
          enabled: true,
          billingSection: newGroupSection,
          targetSection: newGroupTargetSec || "ALL",
        },
      ],
    };
    updateGroups((prev) => [...prev, newGroup]);
    setNewGroupTitle("");
  };

  const handleAddTemplate = (tpl: (typeof FEE_GROUP_TEMPLATES)[number]) => {
    const newGroup: ClassFeeGroup = {
      id: makeFeeUid("grp"),
      title: tpl.title,
      billingSection: tpl.billingSection,
      targetSection: "ALL",
      enabled: true,
      items: tpl.items.map((it) => ({
        id: makeFeeUid("sub"),
        name: it.name,
        amount: it.amount,
        enabled: true,
        billingSection: tpl.billingSection,
        targetSection: "ALL",
        isUserOptional: Boolean(it.isUserOptional),
      })),
    };
    updateGroups((prev) => [...prev, newGroup]);
  };

  const handleAddSubItem = (groupId: string) => {
    const d = subItemDrafts[groupId] || { name: "", amount: "" };
    if (!d.name.trim()) return;
    const amt = Math.max(0, Number(d.amount) || 0);
    updateGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const item: ClassFeeHead = {
          id: makeFeeUid("sub"),
          name: d.name.trim(),
          amount: amt,
          enabled: true,
          billingSection: g.billingSection,
          targetSection: g.targetSection || "ALL",
        };
        return { ...g, items: [...g.items, item] };
      })
    );
    setSubItemDrafts((prev) => ({ ...prev, [groupId]: { name: "", amount: "" } }));
  };

  const handleApplyStandardPreset = () => {
    const presetGroups = normalizeFeeGroups(
      {
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
      },
      Number(currentClass?.defaultFee || 800)
    );
    setStructure(syncStructureFromFeeGroups(presetGroups));
    setSuccessMsg("Standard school preset load ho gaya! Save button dabayein.");
  };

  const handleSave = async () => {
    if (!currentClass) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const synced = syncStructureFromFeeGroups(groups, structure);
      await updateClassFeeStructure(schoolId, currentClass.id, synced);
      setSuccessMsg(`${currentClass.name} ke sabhi fee groups aur sections save ho gaye!`);
      if (onUpdated) onUpdated();
    } catch (e: any) {
      setErrorMsg("Fee save karne me error aaya: " + (e?.message || "Please retry"));
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateFeeGroupsTotals(groups);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 px-6 py-4 text-slate-900 dark:text-white border-b-2 border-indigo-700 dark:border-indigo-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow border border-amber-700">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Fee Structure &amp; Unlimited Groups Settings
              </h2>
              <p className="text-xs text-slate-600 dark:text-blue-200 font-medium">
                Admin apni marzi se unlimited Groups, Sub-Groups aur Section mapping add/edit kar sakte hain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-indigo-100 dark:hover:bg-white/20 flex items-center justify-center text-slate-700 dark:text-white border border-indigo-300 dark:border-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Class Selector & Quick Preset */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Class Chunein:
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(Section ${c.section})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleApplyStandardPreset}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg flex items-center justify-center gap-1.5 shadow transition shrink-0 self-end sm:self-auto cursor-pointer"
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

          {/* Fee Groups List */}
          <div className="space-y-3">
            {groups.map((grp) => {
              const secMeta = getFeeSectionMeta(grp.billingSection);
              const grpDisc = calculateGroupDiscount(grp);
              const showOffEditor = Boolean(grp.discountEnabled) || Number(grp.discountValue || 0) > 0;
              const subDraft = subItemDrafts[grp.id] || { name: "", amount: "" };
              return (
                <div
                  key={grp.id}
                  className={`p-3.5 rounded-xl border ${
                    grp.enabled
                      ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                      : "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 opacity-65"
                  } space-y-2.5`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={grp.enabled}
                      onChange={() =>
                        updateGroups((prev) =>
                          prev.map((g) => (g.id === grp.id ? { ...g, enabled: !g.enabled } : g))
                        )
                      }
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={grp.title}
                      onChange={(e) =>
                        updateGroups((prev) =>
                          prev.map((g) => (g.id === grp.id ? { ...g, title: e.target.value } : g))
                        )
                      }
                      className="flex-1 min-w-[160px] px-2.5 py-1 text-xs font-black bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    />
                    <select
                      value={grp.billingSection}
                      onChange={(e) => {
                        const sec = e.target.value as FeeSectionBucket;
                        updateGroups((prev) =>
                          prev.map((g) =>
                            g.id === grp.id
                              ? {
                                  ...g,
                                  billingSection: sec,
                                  items: g.items.map((it) => ({ ...it, billingSection: sec })),
                                }
                              : g
                          )
                        );
                      }}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg border ${secMeta.badgeClass}`}
                    >
                      {FEE_SECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.shortLabel}
                        </option>
                      ))}
                    </select>
                    <select
                      value={grp.targetSection || "ALL"}
                      onChange={(e) =>
                        updateGroups((prev) =>
                          prev.map((g) =>
                            g.id === grp.id ? { ...g, targetSection: e.target.value } : g
                          )
                        )
                      }
                      className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="ALL">All Sec</option>
                      <option value="A">Sec A</option>
                      <option value="B">Sec B</option>
                      <option value="C">Sec C</option>
                    </select>
                    <div className="flex items-center gap-1 shrink-0">
                      {grpDisc.discount > 0 && (
                        <span className="text-[10px] line-through text-slate-400 font-bold tabular-nums">
                          ₹{grpDisc.gross.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className="text-[11px] font-black tabular-nums px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        ₹{grpDisc.net.toLocaleString("en-IN")}
                      </span>
                      {grpDisc.discount > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                          {grpDisc.badgeText}
                        </span>
                      )}
                    </div>
                    {!showOffEditor && (
                      <button
                        type="button"
                        onClick={() =>
                          updateGroups((prev) =>
                            prev.map((g) =>
                              g.id === grp.id
                                ? {
                                    ...g,
                                    discountEnabled: true,
                                    discountType: g.discountType || "flat",
                                    discountValue: g.discountValue || 0,
                                  }
                                : g
                            )
                          )
                        }
                        className="px-2 py-1 text-[10px] font-black rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 flex items-center gap-1 cursor-pointer shrink-0"
                        title="Group par OFF / Discount add karein"
                      >
                        <Tag className="w-3 h-3" />
                        + OFF
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => updateGroups((prev) => prev.filter((g) => g.id !== grp.id))}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Group OFF / Discount Editor Row */}
                  {showOffEditor && (
                    <div className="ml-4 p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800 flex flex-wrap items-center gap-1.5">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={grp.discountEnabled !== false}
                          onChange={() =>
                            updateGroups((prev) =>
                              prev.map((g) =>
                                g.id === grp.id
                                  ? { ...g, discountEnabled: g.discountEnabled === false }
                                  : g
                              )
                            )
                          }
                          className="w-3.5 h-3.5 accent-rose-600 cursor-pointer"
                        />
                        <span className="text-[10.5px] font-black text-rose-800 dark:text-rose-300 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Group OFF:
                        </span>
                      </label>
                      <select
                        value={grp.discountType === "percent" ? "percent" : "flat"}
                        onChange={(e) =>
                          updateGroups((prev) =>
                            prev.map((g) =>
                              g.id === grp.id
                                ? {
                                    ...g,
                                    discountType: e.target.value === "percent" ? "percent" : "flat",
                                    discountEnabled: true,
                                  }
                                : g
                            )
                          )
                        }
                        className="px-1.5 py-0.5 text-[10.5px] font-black rounded border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800"
                      >
                        <option value="flat">₹ OFF</option>
                        <option value="percent">% OFF</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        max={grp.discountType === "percent" ? 100 : undefined}
                        value={grp.discountValue || ""}
                        onChange={(e) => {
                          const raw = Math.max(0, Number(e.target.value) || 0);
                          updateGroups((prev) =>
                            prev.map((g) =>
                              g.id === grp.id
                                ? {
                                    ...g,
                                    discountEnabled: true,
                                    discountValue: g.discountType === "percent" ? Math.min(100, raw) : raw,
                                  }
                                : g
                            )
                          );
                        }}
                        placeholder={grp.discountType === "percent" ? "%" : "₹"}
                        className="w-16 px-2 py-0.5 text-[11px] font-black tabular-nums rounded border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={grp.discountLabel || ""}
                        onChange={(e) =>
                          updateGroups((prev) =>
                            prev.map((g) =>
                              g.id === grp.id ? { ...g, discountLabel: e.target.value } : g
                            )
                          )
                        }
                        placeholder="OFF Title (e.g. Early Bird)"
                        className="flex-1 min-w-[100px] px-2 py-0.5 text-[10.5px] rounded border border-rose-200/80 dark:border-rose-800 bg-white dark:bg-slate-900"
                      />
                      {grpDisc.discount > 0 && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded tabular-nums">
                          -₹{grpDisc.discount.toLocaleString("en-IN")}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          updateGroups((prev) =>
                            prev.map((g) =>
                              g.id === grp.id
                                ? { ...g, discountEnabled: false, discountValue: 0, discountLabel: "" }
                                : g
                            )
                          )
                        }
                        className="p-0.5 text-rose-400 hover:text-rose-700 cursor-pointer"
                        title="Remove OFF"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Items inside group */}
                  <div className="space-y-1.5 pl-4">
                    {grp.items.map((item) => {
                      const active = item.enabled !== false;
                      return (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() =>
                              updateGroups((prev) =>
                                prev.map((g) =>
                                  g.id === grp.id
                                    ? {
                                        ...g,
                                        items: g.items.map((it) =>
                                          it.id === item.id ? { ...it, enabled: !active } : it
                                        ),
                                      }
                                    : g
                                )
                              )
                            }
                            className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              updateGroups((prev) =>
                                prev.map((g) =>
                                  g.id === grp.id
                                    ? {
                                        ...g,
                                        items: g.items.map((it) =>
                                          it.id === item.id ? { ...it, name: e.target.value } : it
                                        ),
                                      }
                                    : g
                                )
                              )
                            }
                            className="flex-1 px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.amount || ""}
                            onChange={(e) =>
                              updateGroups((prev) =>
                                prev.map((g) =>
                                  g.id === grp.id
                                    ? {
                                        ...g,
                                        items: g.items.map((it) =>
                                          it.id === item.id
                                            ? { ...it, amount: Math.max(0, Number(e.target.value) || 0) }
                                            : it
                                        ),
                                      }
                                    : g
                                )
                              )
                            }
                            className="w-24 px-2 py-1 text-xs font-black tabular-nums bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateGroups((prev) =>
                                prev.map((g) =>
                                  g.id === grp.id
                                    ? { ...g, items: g.items.filter((it) => it.id !== item.id) }
                                    : g
                                )
                              )
                            }
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="+ Add Sub-Group / Item..."
                        value={subDraft.name}
                        onChange={(e) =>
                          setSubItemDrafts((prev) => ({
                            ...prev,
                            [grp.id]: { ...subDraft, name: e.target.value },
                          }))
                        }
                        className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="₹"
                        value={subDraft.amount}
                        onChange={(e) =>
                          setSubItemDrafts((prev) => ({
                            ...prev,
                            [grp.id]: { ...subDraft, amount: e.target.value },
                          }))
                        }
                        className="w-20 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubItem(grp.id)}
                        className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Group */}
          <div className="p-3.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <FolderPlus className="w-3.5 h-3.5" /> Add New Fee Group:
              </span>
              <div className="flex flex-wrap gap-1">
                {FEE_GROUP_TEMPLATES.slice(0, 4).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleAddTemplate(tpl)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="New Group Name (e.g. Development Fee)"
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              <select
                value={newGroupSection}
                onChange={(e) => setNewGroupSection(e.target.value as FeeSectionBucket)}
                className="px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {FEE_SECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.shortLabel}
                  </option>
                ))}
              </select>
              <select
                value={newGroupTargetSec}
                onChange={(e) => setNewGroupTargetSec(e.target.value)}
                className="px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="ALL">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
              <button
                type="button"
                onClick={handleAddGroup}
                className="px-3 py-1.5 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-black rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Group
              </button>
            </div>
          </div>

          {/* Total Fee Preview */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Active Payable (Without Optional/Bus):</span>
              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                केवल सक्रिय ग्रुप व सब-हेड्स का योग
                {totals.totalDiscount > 0
                  ? ` • कुल OFF छूट: -₹${totals.totalDiscount.toLocaleString("en-IN")}`
                  : ""}
                {totals.optionalTransport > 0
                  ? ` (बस सहित: ₹${totals.withOptional.toLocaleString("en-IN")})`
                  : ""}
              </p>
            </div>
            <div className="text-right">
              {totals.totalDiscount > 0 && (
                <span className="text-xs line-through text-slate-400 font-bold block">
                  ₹{totals.grossWithoutOptional.toLocaleString("en-IN")}
                </span>
              )}
              <span className="text-xl font-black tabular-nums text-blue-950 dark:text-blue-100">
                ₹{totals.withoutOptional.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : `Save ${currentClass?.name || "Class"} Fee Structure`}
          </button>
        </div>
      </div>
    </div>
  );
};
