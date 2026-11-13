// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import {
  Shield,
  UserCheck,
  UserX,
  Camera,
  Plus,
  Clock,
  Phone,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  X,
  Sparkles,
  ArrowRight,
  FileCheck,
  BadgeCheck,
  User
} from "lucide-react";
import type { School, SecurityVisitorPass, StudentEarlyGatePass, SchoolStudent, SchoolClass } from "../../school-types";
import { loadSchoolSubcollection, syncSchoolSubcollection } from "../../utils/schoolCloudSync";
import { shouldUseDemoForSchool } from "../../school-firebase";
import { printElementInIframe } from "./AdmissionFormPrintModal";

interface Props {
  school: School;
  students?: SchoolStudent[];
  classes?: SchoolClass[];
  onBack?: () => void;
}

const DEFAULT_VISITORS: SecurityVisitorPass[] = [
  {
    id: "vp_1",
    passNumber: "VP-2026-042",
    schoolId: "demo_school",
    visitorName: "Mahesh Kumar Mishra",
    visitorPhone: "+91 98765 44001",
    visitorType: "PARENT",
    purpose: "Fee Payment & Discussion with Class Teacher",
    personToMeet: "Mr. Rakesh Sharma (Class 10-A Incharge)",
    studentName: "Aman Mishra",
    studentClass: "Class 10-A",
    inTime: "10:15 AM, 11 Nov 2026",
    idProofType: "Aadhaar Card",
    status: "CHECKED_IN",
    guardName: "Security Guard Rampal",
  },
  {
    id: "vp_2",
    passNumber: "VP-2026-041",
    schoolId: "demo_school",
    visitorName: "Sunil Chopra",
    visitorPhone: "+91 98765 44002",
    visitorType: "VENDOR",
    purpose: "Uniform & Stationery Sample Delivery",
    personToMeet: "Accountant Desk / Store Manager",
    inTime: "09:30 AM, 11 Nov 2026",
    outTime: "10:05 AM, 11 Nov 2026",
    idProofType: "Driving License",
    status: "CHECKED_OUT",
    guardName: "Security Guard Rampal",
  },
  {
    id: "vp_3",
    passNumber: "VP-2026-040",
    schoolId: "demo_school",
    visitorName: "Dr. Pratibha Rao",
    visitorPhone: "+91 98765 44003",
    visitorType: "OFFICIAL",
    purpose: "State Education Board Academic Inspection",
    personToMeet: "Principal Office",
    inTime: "09:00 AM, 11 Nov 2026",
    idProofType: "Govt Department ID",
    status: "CHECKED_IN",
    guardName: "Security Guard Rampal",
  },
];

const DEFAULT_EARLY_PASSES: StudentEarlyGatePass[] = [
  {
    id: "egp_1",
    passNumber: "EGP-2026-101",
    schoolId: "demo_school",
    studentId: "std_1",
    studentName: "Rohan Sharma",
    className: "Class 10-A",
    rollNo: "12",
    parentName: "Shri Ashok Sharma (Father)",
    parentPhone: "+91 98765 11001",
    reason: "Severe viral fever during 3rd period, picked by father",
    approvedBy: "Principal",
    approvalStatus: "APPROVED",
    requestTime: "11:20 AM, 11 Nov 2026",
    exitTime: "11:35 AM",
    gateSecurityConfirmed: true,
  },
  {
    id: "egp_2",
    passNumber: "EGP-2026-102",
    schoolId: "demo_school",
    studentId: "std_2",
    studentName: "Pooja Verma",
    className: "Class 9-B",
    rollNo: "08",
    parentName: "Mrs. Geeta Verma (Mother)",
    parentPhone: "+91 98765 11002",
    reason: "Urgent dental clinic surgery scheduled at 1:00 PM",
    approvedBy: "Mrs. Meenakshi (Class Teacher)",
    approvalStatus: "APPROVED",
    requestTime: "12:10 PM, 11 Nov 2026",
    gateSecurityConfirmed: false,
  },
];

export const VisitorGateSecurityManager: React.FC<Props> = ({
  school,
  students = [],
  classes = [],
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"visitors" | "early_exit">("visitors");

  const isDemo = shouldUseDemoForSchool(school?.id);

  const [visitors, setVisitors] = useState<SecurityVisitorPass[]>(() => {
    try {
      const saved = localStorage.getItem(`gate_visitors_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("[VisitorGateSecurityManager] Failed reading visitors:", err);
    }
    return isDemo ? DEFAULT_VISITORS : [];
  });

  const [earlyPasses, setEarlyPasses] = useState<StudentEarlyGatePass[]>(() => {
    try {
      const saved = localStorage.getItem(`gate_early_passes_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("[VisitorGateSecurityManager] Failed reading early passes:", err);
    }
    return isDemo ? DEFAULT_EARLY_PASSES : [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [printPass, setPrintPass] = useState<SecurityVisitorPass | StudentEarlyGatePass | null>(null);
  const gateSlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const sid = school?.id;
    if (!sid) return;
    const suffix = sid || "demo";
    loadSchoolSubcollection<SecurityVisitorPass>(sid, "gate_visitors", `gate_visitors_${suffix}`).then((data) => {
      if (active && data.length > 0) setVisitors(data);
    });
    loadSchoolSubcollection<StudentEarlyGatePass>(sid, "gate_early_passes", `gate_early_passes_${suffix}`).then((data) => {
      if (active && data.length > 0) setEarlyPasses(data);
    });
    return () => { active = false; };
  }, [school?.id]);

  // New Visitor Form State
  const [showAddVisitorModal, setShowAddVisitorModal] = useState(false);
  const [vName, setVName] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vType, setVType] = useState<"PARENT" | "VENDOR" | "OFFICIAL" | "GUEST">("PARENT");
  const [vPurpose, setVPurpose] = useState("Meeting Class Teacher");
  const [vPersonToMeet, setVPersonToMeet] = useState("Class Teacher / Principal");
  const [vStudentName, setVStudentName] = useState("");
  const [vStudentClass, setVStudentClass] = useState("Class 10");
  const [vIdProof, setVIdProof] = useState("Aadhaar Card");
  const [vGuard, setVGuard] = useState("Main Gate Guard");

  // New Early Pass Form State
  const [showAddEarlyModal, setShowAddEarlyModal] = useState(false);
  const [eStudentName, setEStudentName] = useState("");
  const [eClassName, setEClassName] = useState("Class 10-A");
  const [eParentName, setEParentName] = useState("");
  const [eParentPhone, setEParentPhone] = useState("");
  const [eReason, setEReason] = useState("High fever / Medical emergency");
  const [eApprover, setEApprover] = useState("Principal Office");

  const saveVisitors = (updated: SecurityVisitorPass[]) => {
    setVisitors(updated);
    try {
      localStorage.setItem(`gate_visitors_${school?.id || "demo"}`, JSON.stringify(updated));
    } catch (err) {
      console.warn("[VisitorGateSecurityManager] Failed caching visitors:", err);
    }
    syncSchoolSubcollection(school?.id, "gate_visitors", updated);
  };

  const saveEarlyPasses = (updated: StudentEarlyGatePass[]) => {
    setEarlyPasses(updated);
    try {
      localStorage.setItem(`gate_early_passes_${school?.id || "demo"}`, JSON.stringify(updated));
    } catch (err) {
      console.warn("[VisitorGateSecurityManager] Failed caching early passes:", err);
    }
    syncSchoolSubcollection(school?.id, "gate_early_passes", updated);
  };

  const handleCreateVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim()) return;

    const passNo = `VP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nowDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    const newPass: SecurityVisitorPass = {
      id: `vp_${Date.now()}`,
      passNumber: passNo,
      schoolId: school.id,
      visitorName: vName.trim(),
      visitorPhone: vPhone.trim(),
      visitorType: vType,
      purpose: vPurpose.trim(),
      personToMeet: vPersonToMeet.trim(),
      studentName: vType === "PARENT" ? vStudentName.trim() : undefined,
      studentClass: vType === "PARENT" ? vStudentClass : undefined,
      inTime: `${nowTime}, ${nowDate}`,
      idProofType: vIdProof,
      status: "CHECKED_IN",
      guardName: vGuard.trim(),
    };

    const updated = [newPass, ...visitors];
    saveVisitors(updated);
    setShowAddVisitorModal(false);
    setVName("");
    setVPhone("");
    setPrintPass(newPass);
    toast.success(`Visitor Pass ${newPass.passNumber} issued.`);
  };

  const handleCheckoutVisitor = (id: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = visitors.map((v) => {
      if (v.id === id) {
        return {
          ...v,
          status: "CHECKED_OUT" as const,
          outTime: `${nowTime}, Today`,
        };
      }
      return v;
    });
    saveVisitors(updated);
    toast.success("Visitor checked out.");
  };

  const handleCreateEarlyPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eStudentName.trim()) {
      toast.error("Please enter student name.");
      return;
    }

    const passNo = `EGP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newEarly: StudentEarlyGatePass = {
      id: `egp_${Date.now()}`,
      passNumber: passNo,
      schoolId: school.id,
      studentId: `std_${Date.now().toString().slice(-4)}`,
      studentName: eStudentName.trim(),
      className: eClassName,
      parentName: eParentName.trim(),
      parentPhone: eParentPhone.trim(),
      reason: eReason.trim(),
      approvedBy: eApprover.trim(),
      approvalStatus: "APPROVED",
      requestTime: `${nowTime}, Today`,
      gateSecurityConfirmed: false,
    };

    saveEarlyPasses([newEarly, ...earlyPasses]);
    setShowAddEarlyModal(false);
    setEStudentName("");
    setPrintPass(newEarly);
    toast.success(`Early Exit Pass ${newEarly.passNumber} authorized.`);
  };

  const handleConfirmExit = (id: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = earlyPasses.map((p) => {
      if (p.id === id) {
        return { ...p, gateSecurityConfirmed: true, exitTime: nowTime };
      }
      return p;
    });
    saveEarlyPasses(updated);
    toast.success("Gate exit confirmed.");
  };

  const checkedInCount = visitors.filter((v) => v.status === "CHECKED_IN").length;
  const earlyExitCount = earlyPasses.filter((p) => p.approvalStatus === "APPROVED").length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Main Gate &amp; Visitor Security Desk
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Gate Security Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live visitor check-in, OTP gate-pass slips &amp; student early exit approval
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "visitors" && (
            <button
              type="button"
              onClick={() => setShowAddVisitorModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Visitor Pass</span>
            </button>
          )}

          {activeTab === "early_exit" && (
            <button
              type="button"
              onClick={() => setShowAddEarlyModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow active:scale-95"
            >
              <UserX className="w-4 h-4" />
              <span>+ Early Exit Pass</span>
            </button>
          )}

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Visitors Today</span>
          <span className="text-2xl font-black text-white">{visitors.length}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30">
          <span className="text-[10px] text-emerald-300 font-bold uppercase block">Currently on Campus</span>
          <span className="text-2xl font-black text-emerald-400">{checkedInCount} Inside</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/30">
          <span className="text-[10px] text-amber-300 font-bold uppercase block">Early Exit Approvals</span>
          <span className="text-2xl font-black text-amber-300">{earlyExitCount} Students</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30">
          <span className="text-[10px] text-indigo-300 font-bold uppercase block">Security Clearance</span>
          <span className="text-xl font-black text-indigo-300">100% Verified</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("visitors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "visitors"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-slate-800/80 text-slate-400 hover:text-white"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Visitor Register ({visitors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("early_exit")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "early_exit"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-slate-800/80 text-slate-400 hover:text-white"
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Student Early Exit Desk ({earlyPasses.length})</span>
        </button>
      </div>

      {/* TAB 1: VISITOR REGISTER */}
      {activeTab === "visitors" && (
        <div className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Pass No</th>
                  <th className="py-2.5 px-3">Visitor Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Meeting With / Purpose</th>
                  <th className="py-2.5 px-3 text-center">In-Time</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{v.passNumber}</td>
                    <td className="py-3 px-3 font-bold text-white">
                      {v.visitorName}
                      {v.studentName && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Parent of {v.studentName} ({v.studentClass})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        v.visitorType === "PARENT" ? "bg-indigo-500/20 text-indigo-300" :
                        v.visitorType === "OFFICIAL" ? "bg-purple-500/20 text-purple-300" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        {v.visitorType}
                      </span>
                    </td>
                    <td className="py-3 px-3">{v.visitorPhone}</td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="font-bold text-white block">{v.personToMeet}</span>
                      <span className="text-[10px] text-slate-400">{v.purpose}</span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">{v.inTime}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        v.status === "CHECKED_IN"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {v.status === "CHECKED_IN" ? "Inside Campus" : "Checked Out"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {v.status === "CHECKED_IN" && (
                          <button
                            type="button"
                            onClick={() => handleCheckoutVisitor(v.id)}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Check-Out
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPrintPass(v)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[10px] cursor-pointer flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Slip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT EARLY EXIT PASS DESK */}
      {activeTab === "early_exit" && (
        <div className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Pass No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Parent / Guardian</th>
                  <th className="py-2.5 px-3">Reason for Early Leave</th>
                  <th className="py-2.5 px-3">Approved By</th>
                  <th className="py-2.5 px-3 text-center">Gate Status</th>
                  <th className="py-2.5 px-3 text-center">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {earlyPasses.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{p.passNumber}</td>
                    <td className="py-3 px-3 font-bold text-white">{p.studentName}</td>
                    <td className="py-3 px-3 text-indigo-300 font-bold">{p.className}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{p.parentName}</span>
                      <span className="text-[10px] text-slate-400">{p.parentPhone}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs">{p.reason}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">{p.approvedBy}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.gateSecurityConfirmed
                          ? "bg-slate-800 text-slate-400"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                      }`}>
                        {p.gateSecurityConfirmed ? `Left Gate (${p.exitTime || "Done"})` : "Approved - Awaiting Gate Exit"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {!p.gateSecurityConfirmed ? (
                        <button
                          type="button"
                          onClick={() => handleConfirmExit(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] transition cursor-pointer shadow"
                        >
                          ✓ Let Student Exit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrintPass(p)}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-bold"
                        >
                          Print Pass
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW VISITOR MODAL */}
      {showAddVisitorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>Issue Visitor Gate Pass</span>
              </h3>
              <button onClick={() => setShowAddVisitorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVisitor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Visitor Full Name *</label>
                <input
                  type="text"
                  required
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Mobile Phone</label>
                  <input
                    type="text"
                    value={vPhone}
                    onChange={(e) => setVPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Visitor Type</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="PARENT">Parent / Guardian</option>
                    <option value="VENDOR">Vendor / Delivery</option>
                    <option value="OFFICIAL">Official Inspector</option>
                    <option value="GUEST">General Guest</option>
                  </select>
                </div>
              </div>

              {vType === "PARENT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Student Name</label>
                    <input
                      type="text"
                      value={vStudentName}
                      onChange={(e) => setVStudentName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Student Class</label>
                    <input
                      type="text"
                      value={vStudentClass}
                      onChange={(e) => setVStudentClass(e.target.value)}
                      placeholder="e.g. Class 10-A"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Person to Meet</label>
                <input
                  type="text"
                  value={vPersonToMeet}
                  onChange={(e) => setVPersonToMeet(e.target.value)}
                  placeholder="e.g. Class Teacher, Principal, Accountant"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Purpose of Visit</label>
                <input
                  type="text"
                  value={vPurpose}
                  onChange={(e) => setVPurpose(e.target.value)}
                  placeholder="e.g. Fee enquiry, book collection, PTM"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">ID Proof Verified</label>
                  <select
                    value={vIdProof}
                    onChange={(e) => setVIdProof(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="PAN Card">PAN Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Gate Guard</label>
                  <input
                    type="text"
                    value={vGuard}
                    onChange={(e) => setVGuard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddVisitorModal(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl">
                  Issue &amp; Print Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW EARLY EXIT PASS MODAL */}
      {showAddEarlyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-amber-400" />
                <span>Issue Student Early Exit Pass</span>
              </h3>
              <button onClick={() => setShowAddEarlyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEarlyPass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Student Name *</label>
                <input
                  type="text"
                  required
                  value={eStudentName}
                  onChange={(e) => setEStudentName(e.target.value)}
                  placeholder="e.g. Rohit Kumar"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Class</label>
                <input
                  type="text"
                  value={eClassName}
                  onChange={(e) => setEClassName(e.target.value)}
                  placeholder="Class 10-A"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={eParentName}
                    onChange={(e) => setEParentName(e.target.value)}
                    placeholder="Father / Mother Name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Guardian Contact</label>
                  <input
                    type="text"
                    required
                    value={eParentPhone}
                    onChange={(e) => setEParentPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Reason for Early Leave</label>
                <input
                  type="text"
                  required
                  value={eReason}
                  onChange={(e) => setEReason(e.target.value)}
                  placeholder="e.g. Fever, Doctor Appointment"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Approved By</label>
                <input
                  type="text"
                  value={eApprover}
                  onChange={(e) => setEApprover(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddEarlyModal(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer">
                  Authorize Exit Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE GATE PASS SLIP MODAL */}
      {printPass && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div ref={gateSlipRef} className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 text-center border-4 border-slate-900 animate-in zoom-in-95">
            <div className="border-b-2 border-slate-900 pb-3">
              <h3 className="font-black text-lg text-slate-950 uppercase">{school?.name || "School"}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                OFFICIAL SECURITY GATE PASS
              </p>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-slate-950 text-white font-mono text-xs font-black">
                {printPass.passNumber}
              </span>
            </div>

            <div className="space-y-2 text-left text-xs font-medium">
              <div>
                <span className="text-slate-500 font-bold block text-[10px]">Name:</span>
                <span className="text-sm font-black text-slate-950">
                  {"visitorName" in printPass ? printPass.visitorName : printPass.studentName}
                </span>
              </div>

              {"visitorPhone" in printPass && (
                <div>
                  <span className="text-slate-500 font-bold block text-[10px]">Mobile:</span>
                  <span className="font-bold text-slate-800">{printPass.visitorPhone}</span>
                </div>
              )}

              {"purpose" in printPass && (
                <div>
                  <span className="text-slate-500 font-bold block text-[10px]">Purpose &amp; Meeting:</span>
                  <span className="text-indigo-950 font-bold">{printPass.personToMeet} ({printPass.purpose})</span>
                </div>
              )}

              {"reason" in printPass && (
                <div>
                  <span className="text-slate-500 font-bold block text-[10px]">Exit Reason:</span>
                  <span className="text-rose-900 font-bold">{printPass.reason}</span>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-bold block text-[10px]">Time Stamp:</span>
                <span className="font-bold text-slate-800">
                  {"inTime" in printPass ? printPass.inTime : printPass.requestTime}
                </span>
              </div>
            </div>

            <div className="p-2 bg-slate-100 rounded-xl inline-block border border-slate-300">
              <QRCode value={`https://nsta.app/gate-verify?pass=${printPass.passNumber}`} size={80} level="M" />
            </div>

            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>Main Security Gate</span>
              <span>Guard Stamp Verified</span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 no-print print:hidden">
              <button
                type="button"
                onClick={() => {
                  if (gateSlipRef.current) {
                    printElementInIframe(
                      gateSlipRef.current,
                      `Gate Pass - ${printPass.passNumber}`,
                      `.no-print { display: none !important; }`
                    );
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs shadow cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Gate Slip
              </button>
              <button
                type="button"
                onClick={() => setPrintPass(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
