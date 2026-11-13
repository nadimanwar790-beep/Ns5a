// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  X, Bus, Save, Search, Check, CheckSquare, Square,
  IndianRupee, Sparkles, AlertCircle, Users, CheckCircle2,
  MapPin, Sliders
} from "lucide-react";
import type { SchoolClass, SchoolStudent } from "../../school-types";
import { updateClassFeeStructure, updateStudent } from "../../school-firebase";
import { toast } from "sonner";
import { AdminBusFleetRadar } from "./AdminBusFleetRadar";
import { DriverTripConsole } from "./DriverTripConsole";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classes: SchoolClass[];
  students: SchoolStudent[];
  initialClassId?: string;
  onUpdated: () => void;
  isEmbedded?: boolean;
}

export const BusTransportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  classes = [],
  students = [],
  initialClassId,
  onUpdated,
  isEmbedded = false,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || classes[0]?.id || ""
  );
  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  // Bus fee structure for the selected class
  const [classBusFee, setClassBusFee] = useState<number>(() => {
    return Number(currentClass?.feeStructure?.busFee ?? 1000);
  });

  // Local student bus state map: { [studentId]: { usesBus: boolean, busRoute: string, busFee: number } }
  const [studentBusMap, setStudentBusMap] = useState<Record<string, { usesBus: boolean; busRoute: string; busFee: number }>>({});
  const [activeViewTab, setActiveViewTab] = useState<"students" | "live_radar" | "driver_console">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Sync state whenever selected class or students change
  useEffect(() => {
    const targetClass = classes.find(c => c.id === selectedClassId) || classes[0];
    const initialFee = Number(targetClass?.feeStructure?.busFee !== undefined ? targetClass.feeStructure.busFee : 1000);
    setClassBusFee(initialFee);

    const initialMap: Record<string, { usesBus: boolean; busRoute: string; busFee: number; custom?: boolean }> = {};
    students.forEach(st => {
      initialMap[st.id] = {
        usesBus: Boolean(st.usesBus),
        busRoute: st.busRoute || "Route 1",
        busFee: st.busFee !== undefined ? Number(st.busFee) : initialFee,
        custom: st.busFee !== undefined && st.busFee !== initialFee,
      };
    });
    setStudentBusMap(initialMap);
  }, [selectedClassId, classes, students]);

  if (!isOpen) return null;

  // Students belonging to current class
  const classStudents = students.filter(s => {
    if (!selectedClassId) return true;
    const sC = (s.classId || "").toLowerCase();
    const tC = selectedClassId.toLowerCase();
    return sC === tC || sC.startsWith(tC) || tC.startsWith(sC);
  });

  // Filtered by search query
  const filteredStudents = classStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.rollNo || "").toLowerCase().includes(q);
  });

  const toggleStudentBus = (studentId: string) => {
    setStudentBusMap(prev => {
      const cur = prev[studentId] || { usesBus: false, busRoute: "Route 1", busFee: classBusFee };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          usesBus: !cur.usesBus,
          busFee: cur.busFee || classBusFee,
        },
      };
    });
  };

  const updateStudentRoute = (studentId: string, busRoute: string) => {
    setStudentBusMap(prev => {
      const cur = prev[studentId] || { usesBus: true, busRoute: "Route 1", busFee: classBusFee };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          busRoute,
        },
      };
    });
  };

  const handleClassBusFeeChange = (newFee: number) => {
    setClassBusFee(newFee);
    setStudentBusMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(stId => {
        if (!next[stId].custom) {
          next[stId] = { ...next[stId], busFee: newFee };
        }
      });
      return next;
    });
  };

  const updateStudentFee = (studentId: string, feeStr: string) => {
    const feeNum = Number(feeStr) || 0;
    setStudentBusMap(prev => {
      const cur = prev[studentId] || { usesBus: true, busRoute: "Route 1", busFee: classBusFee };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          busFee: feeNum,
          custom: true,
        },
      };
    });
  };

  const handleSelectAll = (enable: boolean) => {
    setStudentBusMap(prev => {
      const next = { ...prev };
      classStudents.forEach(st => {
        next[st.id] = {
          ...(next[st.id] || {}),
          usesBus: enable,
          busRoute: next[st.id]?.busRoute || "Route 1",
          busFee: next[st.id]?.busFee || classBusFee,
        };
      });
      return next;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSuccessMsg("");
    try {
      // 1. Update Class Fee Structure bus fee
      if (currentClass) {
        const curStruct = currentClass.feeStructure || {
          admissionFee: 65000,
          tuitionFee: Number(currentClass.defaultFee || 19140),
          cautionMoney: 60000,
          annualCharges: 23320,
          busFee: classBusFee,
        };
        await updateClassFeeStructure(schoolId, currentClass.id, {
          ...curStruct,
          busFee: Number(classBusFee) || 0,
        });
      }

      // 2. Save each student's bus setting
      const promises: Promise<any>[] = [];
      for (const st of classStudents) {
        const busState = studentBusMap[st.id];
        if (busState) {
          promises.push(
            updateStudent(schoolId, st.id, {
              usesBus: Boolean(busState.usesBus),
              busRoute: busState.busRoute || "Route 1",
              busFee: Number(busState.busFee || classBusFee),
            })
          );
        }
      }
      await Promise.all(promises);

      setSuccessMsg(`✓ Bus Fee (₹${classBusFee}) aur students ka bus status save ho gaya! Fee slip me automatically jud gaya hai.`);
      onUpdated();
      setTimeout(() => {
        setSuccessMsg("");
      }, 3500);
    } catch (err: any) {
      console.error("Error saving bus details:", err);
      toast.error("Bus settings save karne me error aaya: " + (err?.message || "Please retry"));
    } finally {
      setSaving(false);
    }
  };

  const busCount = classStudents.filter(s => studentBusMap[s.id]?.usesBus).length;
  const totalBusRevenue = classStudents.reduce((sum, s) => {
    const info = studentBusMap[s.id];
    return sum + (info?.usesBus ? Number(info.busFee || classBusFee) : 0);
  }, 0);

  return (
    <div className={isEmbedded ? "w-full max-w-4xl mx-auto my-2" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"}>
      <div className={`bg-white dark:bg-slate-900 rounded-3xl w-full ${isEmbedded ? "max-w-4xl shadow-xl" : "max-w-2xl my-4 max-h-[90vh] shadow-2xl"} border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-800 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                Bus Fee & Transport Manager
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-300 text-slate-950 uppercase">
                  बस सेवा
                </span>
              </h2>
              <p className="text-xs text-teal-100">
                Class ki bus fee set karein aur mark karein kon-kon bacha bus se jata hai
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveViewTab("students")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViewTab === "students"
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users size={14} /> 1. Student Bus Roster (विद्यार्थी सूची)
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("live_radar")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViewTab === "live_radar"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MapPin size={14} /> 2. Live Bus GPS Radar (लाइव बस ट्रैकर)
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("driver_console")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViewTab === "driver_console"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Bus size={14} /> 3. Driver Mobile Console (ड्राइवर मोड)
          </button>
        </div>

        {activeViewTab === "live_radar" && (
          <div className="p-4 flex-1 overflow-y-auto">
            <AdminBusFleetRadar
              school={{ id: schoolId, name: "Institutional Campus" } as any}
              onOpenDriverConsole={() => setActiveViewTab("driver_console")}
            />
          </div>
        )}

        {activeViewTab === "driver_console" && (
          <div className="flex-1 overflow-y-auto">
            <DriverTripConsole
              school={{ id: schoolId, name: "Institutional Campus" } as any}
              onBack={() => setActiveViewTab("live_radar")}
            />
          </div>
        )}

        {/* Content Body */}
        {activeViewTab === "students" && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

          {/* Section 1: Class Selector & Class Bus Fee Setting */}
          <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-3">
            <span className="text-[11px] font-black uppercase text-teal-800 dark:text-teal-300 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              1. Class &amp; Bus Fee Setting:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Class Chunein:
                </label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Is Class Ki Monthly Bus Fee (₹):
                  </label>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">Admin Editable</span>
                </div>
                <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                  {[0, 500, 800, 1000, 1200, 1500, 2000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleClassBusFeeChange(amt)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                        classBusFee === amt
                          ? "bg-teal-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={classBusFee}
                    onChange={e => handleClassBusFeeChange(Number(e.target.value) || 0)}
                    placeholder="e.g. 800 ya 1200"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Student Bus Roster */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Bus className="w-4 h-4 text-teal-600" />
                  2. Bachho Ko Mark Karein (Kon Kon Bus Se Jata Hai):
                </h4>
                <p className="text-xs text-slate-500">
                  {busCount} of {classStudents.length} bache bus se ja rahe hain • Expected Bus Fee: <strong>₹{totalBusRevenue.toLocaleString("en-IN")}</strong>
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 text-[11px] font-bold cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Student name ya roll no se filter karein..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white"
              />
            </div>

            {/* Students List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              {filteredStudents.map(st => {
                const busInfo = studentBusMap[st.id] || { usesBus: false, busRoute: "Route 1", busFee: classBusFee };
                const isBusActive = Boolean(busInfo.usesBus);

                return (
                  <div
                    key={st.id}
                    className={`p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition ${
                      isBusActive ? "bg-teal-50/40 dark:bg-teal-950/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleStudentBus(st.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${
                          isBusActive
                            ? "bg-teal-600 text-white shadow-xs"
                            : "border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                        title={isBusActive ? "Bus Band Karein" : "Bus Shuru Karein"}
                      >
                        {isBusActive && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            {st.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Roll {st.rollNo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isBusActive ? (
                            <span className="text-teal-700 dark:text-teal-300 font-bold">
                              🚌 Bus Se Jata Hai (+₹{Number(busInfo.busFee || classBusFee).toLocaleString("en-IN")})
                            </span>
                          ) : (
                            <span className="text-slate-400">Bus Se Nahi Jata (Normal)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Extra Route and Fee inputs if active */}
                    {isBusActive && (
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="w-32">
                          <input
                            type="text"
                            placeholder="Route/Stop (e.g. Route 1)"
                            value={busInfo.busRoute}
                            onChange={e => updateStudentRoute(st.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs font-semibold rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="w-24">
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              placeholder="Fee"
                              value={busInfo.busFee}
                              onChange={e => updateStudentFee(st.id, e.target.value)}
                              className="w-full pl-4 pr-1 py-1 text-right text-xs font-black rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Koi student nahi mila.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Footer Actions (Only for students bus roster tab) */}
        {activeViewTab === "students" && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-teal-700/20 flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Changes..." : "✓ Save Bus Settings & Apply to Fee Slip"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
