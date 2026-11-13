// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Users,
  IndianRupee,
  MapPin,
  Phone,
  UserCheck,
  Briefcase,
  Layers,
  ArrowRightLeft,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from "lucide-react";
import type { School, SchoolBranch, SchoolStudent, SchoolClass } from "../../school-types";
import { loadSchoolSubcollection, syncSchoolSubcollection, saveSchoolSubdoc } from "../../utils/schoolCloudSync";
import { shouldUseDemoForSchool } from "../../school-firebase";

interface Props {
  school: School;
  currentSchoolId: string;
  onSwitchBranch: (branchId: string, branchSchoolId: string) => void;
  onClose?: () => void;
}

const DEFAULT_BRANCHES: SchoolBranch[] = [
  {
    id: "branch_main",
    schoolId: "demo_school",
    name: "DPS Senior Campus (Main Branch)",
    code: "DPS-MAIN",
    address: "Sector 45, Urban Estate, Main Highway",
    city: "Gurugram / Patna",
    phone: "+91 98765 43210",
    principalName: "Principal",
    isMainBranch: true,
    totalStudents: 540,
    totalTeachers: 28,
    monthlyRevenue: 1250000,
  },
  {
    id: "branch_city",
    schoolId: "demo_school_city",
    name: "DPS Junior & Primary Wing (City Campus)",
    code: "DPS-CITY",
    address: "Civil Lines, Near Railway Station",
    city: "City Center",
    phone: "+91 98765 43211",
    principalName: "Mrs. Sunita Verma",
    isMainBranch: false,
    totalStudents: 380,
    totalTeachers: 18,
    monthlyRevenue: 780000,
  },
  {
    id: "branch_rural",
    schoolId: "demo_school_rural",
    name: "DPS Global Academy (East Campus)",
    code: "DPS-EAST",
    address: "Bypass Road, Greenfield Knowledge Park",
    city: "East Zone",
    phone: "+91 98765 43212",
    principalName: "Er. Rajeshwar Singh",
    isMainBranch: false,
    totalStudents: 260,
    totalTeachers: 14,
    monthlyRevenue: 520000,
  },
];

export const MultiBranchManager: React.FC<Props> = ({
  school,
  currentSchoolId,
  onSwitchBranch,
  onClose,
}) => {
  const isDemo = shouldUseDemoForSchool(school?.id);

  const [branches, setBranches] = useState<SchoolBranch[]>(() => {
    try {
      const saved = localStorage.getItem(`school_branches_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("[MultiBranchManager] Failed reading cached branches:", err);
    }
    if (isDemo) return DEFAULT_BRANCHES;
    return [
      {
        id: "branch_main",
        schoolId: school?.id || "school_1",
        name: school?.name || "Main Campus",
        code: school?.code || "MAIN-01",
        address: school?.address || "Main Campus Location",
        city: "Headquarter",
        phone: school?.phone || school?.mobile || "",
        principalName: school?.principalName || "Principal",
        isMainBranch: true,
        totalStudents: 0,
        totalTeachers: 0,
        monthlyRevenue: 0,
      }
    ];
  });

  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    const found = branches.find((b) => b.schoolId === currentSchoolId);
    return found ? found.id : branches[0]?.id || "branch_main";
  });

  const [activeTab, setActiveTab] = useState<"branches" | "consolidated" | "transfer">("branches");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchCity, setNewBranchCity] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [newBranchPrincipal, setNewBranchPrincipal] = useState("");

  // Transfer state
  const [transferStudentName, setTransferStudentName] = useState("");
  const [transferFromBranch, setTransferFromBranch] = useState("branch_main");
  const [transferToBranch, setTransferToBranch] = useState("branch_city");
  const [transferReason, setTransferReason] = useState("Family Relocation to City Center");
  const [transferSuccess, setTransferSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const sid = school?.id;
    if (!sid) return;
    loadSchoolSubcollection<SchoolBranch>(sid, "school_branches", `school_branches_${sid || "demo"}`).then((data) => {
      if (active && data.length > 0) setBranches(data);
    });
    return () => { active = false; };
  }, [school?.id]);

  const saveBranches = (updated: SchoolBranch[]) => {
    setBranches(updated);
    try {
      localStorage.setItem(`school_branches_${school?.id || "demo"}`, JSON.stringify(updated));
    } catch (err) {
      console.warn("[MultiBranchManager] Failed caching branches:", err);
    }
    syncSchoolSubcollection(school?.id, "school_branches", updated);
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      toast.error("Please enter a branch name.");
      return;
    }

    const newId = `branch_${Date.now()}`;
    const newRecord: SchoolBranch = {
      id: newId,
      schoolId: `${school.id}_${newBranchCode.toLowerCase().replace(/[^a-z0-9]/g, "") || "b" + Date.now().toString().slice(-4)}`,
      name: newBranchName.trim(),
      code: (newBranchCode.trim() || `BR-${branches.length + 1}`).toUpperCase(),
      address: newBranchAddress.trim() || "School Campus",
      city: newBranchCity.trim() || "Main City",
      phone: newBranchPhone.trim() || school.phone || "",
      principalName: newBranchPrincipal.trim() || "Branch Incharge",
      isMainBranch: false,
      totalStudents: 0,
      totalTeachers: 0,
      monthlyRevenue: 0,
    };

    const updated = [...branches, newRecord];
    saveBranches(updated);
    setShowAddModal(false);
    setNewBranchName("");
    setNewBranchCode("");
    setNewBranchAddress("");
    setNewBranchCity("");
    setNewBranchPhone("");
    setNewBranchPrincipal("");
    toast.success(`Branch "${newRecord.name}" activated!`);
  };

  // Consolidated statistics
  const totalCombinedStudents = branches.reduce((sum, b) => sum + (b.totalStudents || 0), 0);
  const totalCombinedTeachers = branches.reduce((sum, b) => sum + (b.totalTeachers || 0), 0);
  const totalCombinedRevenue = branches.reduce((sum, b) => sum + (b.monthlyRevenue || 0), 0);

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStudentName.trim()) {
      toast.error("Please enter student name or admission number.");
      return;
    }

    const transferRecord = {
      id: `trf_${Date.now()}`,
      schoolId: school?.id || "demo",
      studentNameOrAdm: transferStudentName.trim(),
      fromBranchId: transferFromBranch,
      toBranchId: transferToBranch,
      reason: transferReason.trim(),
      transferredAt: new Date().toISOString(),
    };
    try {
      const key = `branch_transfers_${school?.id || "demo"}`;
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([transferRecord, ...prev]));
    } catch {}
    await saveSchoolSubdoc(school?.id, "branch_transfers", transferRecord);

    setTransferSuccess(true);
    toast.success(`Transfer logged for ${transferStudentName.trim()}.`);
    setTimeout(() => {
      setTransferSuccess(false);
      setTransferStudentName("");
    }, 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Multi-Branch &amp; Franchise Desk
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {branches.length} Branches Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              1-Click branch switcher, consolidated management reports &amp; inter-branch transfers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New Branch</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "branches"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Branches List ({branches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("consolidated")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "consolidated"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Consolidated Group Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transfer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "transfer"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Inter-Branch Transfer</span>
        </button>
      </div>

      {/* TAB 1: BRANCHES LIST */}
      {activeTab === "branches" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => {
            const isCurrent = b.id === activeBranchId;
            return (
              <div
                key={b.id}
                className={`rounded-2xl p-4 sm:p-5 border transition-all relative flex flex-col justify-between ${
                  isCurrent
                    ? "bg-gradient-to-b from-indigo-950/70 to-slate-900 border-indigo-400 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/40"
                    : "bg-slate-800/60 border-slate-700/80 hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        b.isMainBranch
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {b.isMainBranch ? "Main Head Campus" : b.code}
                    </span>
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active Now
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBranchId(b.id);
                          onSwitchBranch(b.id, b.schoolId);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] transition active:scale-95 cursor-pointer shadow"
                      >
                        <span>Switch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-black text-white leading-snug mb-1">
                    {b.name}
                  </h3>
                  <div className="space-y-1 text-xs text-slate-300 mb-4">
                    <p className="flex items-center gap-1.5 text-slate-400 truncate">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{b.address}, {b.city}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{b.phone}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Head: {b.principalName}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/60 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Students</span>
                    <span className="text-sm font-black text-white">{b.totalStudents}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Faculty</span>
                    <span className="text-sm font-black text-indigo-300">{b.totalTeachers}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Revenue/Mo</span>
                    <span className="text-xs font-black text-emerald-400">
                      ₹{((b.monthlyRevenue || 0) / 100000).toFixed(1)}L
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CONSOLIDATED GROUP SUMMARY */}
      {activeTab === "consolidated" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-slate-900 border border-indigo-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Total Enrolled Students
                </span>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {totalCombinedStudents}
              </p>
              <p className="text-[11px] text-indigo-200/80 mt-1">Across all {branches.length} campuses</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-900/60 to-slate-900 border border-emerald-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Consolidated Monthly Revenue
                </span>
                <IndianRupee className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-300">
                ₹{totalCombinedRevenue.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-emerald-200/80 mt-1">Estimated monthly gross collections</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-900/60 to-slate-900 border border-purple-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Total Teaching &amp; Staff
                </span>
                <Briefcase className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-purple-300">
                {totalCombinedTeachers} Staff Members
              </p>
              <p className="text-[11px] text-purple-200/80 mt-1">Unified payroll &amp; attendance</p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 overflow-x-auto">
            <h4 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Campus Performance Comparison</span>
            </h4>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Branch Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Principal</th>
                  <th className="py-2.5 px-3 text-center">Students</th>
                  <th className="py-2.5 px-3 text-center">Faculty</th>
                  <th className="py-2.5 px-3 text-right">Monthly Dues/Fees</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{b.code}</td>
                    <td className="py-3 px-3">{b.principalName}</td>
                    <td className="py-3 px-3 text-center font-bold text-white">{b.totalStudents}</td>
                    <td className="py-3 px-3 text-center text-indigo-300">{b.totalTeachers}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-400">
                      ₹{(b.monthlyRevenue || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBranchId(b.id);
                          onSwitchBranch(b.id, b.schoolId);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-black text-[10px] transition cursor-pointer"
                      >
                        Open Desk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INTER-BRANCH TRANSFER */}
      {activeTab === "transfer" && (
        <div className="max-w-2xl mx-auto bg-slate-950/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Inter-Branch Student Transfer Desk</h3>
              <p className="text-xs text-slate-400">
                Transfer student admission, previous fees history &amp; academic records without data loss
              </p>
            </div>
          </div>

          {transferSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Transfer successful! Student profile &amp; fee ledger forwarded to target campus.
              </span>
            </div>
          )}

          <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Student Name or Admission No</label>
              <input
                type="text"
                required
                value={transferStudentName}
                onChange={(e) => setTransferStudentName(e.target.value)}
                placeholder="e.g. Rohan Sharma (ADM-2026-084)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Transfer From (Current Branch)</label>
                <select
                  value={transferFromBranch}
                  onChange={(e) => setTransferFromBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Transfer To (Destination Branch)</label>
                <select
                  value={transferToBranch}
                  onChange={(e) => setTransferToBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none"
                >
                  {branches.filter((b) => b.id !== transferFromBranch).map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Reason for Transfer</label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Confirm Inter-Branch Transfer</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE NEW BRANCH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Add New School Branch / Franchise</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. DPS International Campus"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Branch Code (3-6 chars)</label>
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="e.g. DPS-WEST"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">City / Location</label>
                  <input
                    type="text"
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    placeholder="e.g. Noida / Patna"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Full Address</label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Street / Campus Road"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Contact Phone</label>
                  <input
                    type="text"
                    value={newBranchPhone}
                    onChange={(e) => setNewBranchPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Branch Principal / Incharge</label>
                  <input
                    type="text"
                    value={newBranchPrincipal}
                    onChange={(e) => setNewBranchPrincipal(e.target.value)}
                    placeholder="Dr. / Mrs. Name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md cursor-pointer"
                >
                  Save &amp; Activate Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
