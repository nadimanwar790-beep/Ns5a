// @ts-nocheck
import React, { useState, useEffect } from "react";
import type { School, StaffEmployee, StaffLeave } from "../../school-types";
import {
  saveStaffEmployee, getStaffEmployees, deleteStaffEmployee,
  saveStaffLeave, getStaffLeaves, updateStaffLeaveStatus, generateId, todayStr
} from "../../school-firebase";
import {
  Users, ChevronLeft, Plus, Trash2, Calendar, Phone, Mail, Award,
  CheckCircle2, XCircle, Clock, IndianRupee, Printer, UserCheck, Briefcase
} from "lucide-react";

interface Props {
  school: School;
  onBack: () => void;
}

export const StaffHRMManager: React.FC<Props> = ({ school, onBack }) => {
  const [activeTab, setActiveTab] = useState<"directory" | "leaves" | "salary">("directory");
  const [staffList, setStaffList] = useState<StaffEmployee[]>([]);
  const [leavesList, setLeavesList] = useState<StaffLeave[]>([]);
  const [loading, setLoading] = useState(true);

  // New staff modal
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "PGT Senior Teacher",
    department: "Science & Academics",
    monthlySalary: 25000,
    joinDate: todayStr(),
  });

  // Leave apply modal
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    staffId: "",
    leaveType: "casual" as StaffLeave["leaveType"],
    fromDate: todayStr(),
    toDate: todayStr(),
    days: 1,
    reason: "",
  });

  // Pay slip state
  const [selectedStaffForSlip, setSelectedStaffForSlip] = useState<StaffEmployee | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stf, lvs] = await Promise.all([
        getStaffEmployees(school.id),
        getStaffLeaves(school.id),
      ]);
      setStaffList(stf);
      setLeavesList(lvs);
      if (stf.length > 0 && !leaveForm.staffId) {
        setLeaveForm(prev => ({ ...prev, staffId: stf[0].id }));
        setSelectedStaffForSlip(stf[0]);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [school.id]);

  const handleAddStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.phone.trim()) return;
    try {
      const newStaff: StaffEmployee = {
        id: generateId(),
        schoolId: school.id,
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        designation: staffForm.designation.trim(),
        department: staffForm.department.trim(),
        monthlySalary: Number(staffForm.monthlySalary) || 0,
        joinDate: staffForm.joinDate,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await saveStaffEmployee(newStaff);
      setStaffList(prev => [newStaff, ...prev]);
      setShowAddStaff(false);
      setStaffForm({
        name: "",
        email: "",
        phone: "",
        designation: "PGT Senior Teacher",
        department: "Science & Academics",
        monthlySalary: 25000,
        joinDate: todayStr(),
      });
    } catch (e: any) {
      alert("Error adding staff: " + e.message);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Kya aap is staff member ko hatana chahte hain?")) return;
    await deleteStaffEmployee(school.id, id);
    setStaffList(prev => prev.filter(s => s.id !== id));
  };

  const handleApplyLeave = async () => {
    const staff = staffList.find(s => s.id === leaveForm.staffId);
    if (!staff || !leaveForm.reason.trim()) return;
    try {
      const newLeave: StaffLeave = {
        id: generateId(),
        schoolId: school.id,
        staffId: staff.id,
        staffName: staff.name,
        designation: staff.designation,
        leaveType: leaveForm.leaveType,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        days: Number(leaveForm.days) || 1,
        reason: leaveForm.reason.trim(),
        status: "pending",
        appliedAt: new Date().toISOString(),
      };
      await saveStaffLeave(newLeave);
      setLeavesList(prev => [newLeave, ...prev]);
      setShowApplyLeave(false);
      setLeaveForm(prev => ({ ...prev, reason: "" }));
    } catch (e: any) {
      alert("Error applying leave: " + e.message);
    }
  };

  const handleUpdateLeave = async (leaveId: string, status: "approved" | "rejected") => {
    await updateStaffLeaveStatus(school.id, leaveId, status);
    setLeavesList(prev => prev.map(l => l.id === leaveId ? { ...l, status } : l));
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-teal-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          <div className="flex p-1 bg-white/10 rounded-xl">
            {(["directory", "leaves", "salary"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all ${
                  activeTab === tab ? "bg-white text-teal-900 shadow" : "text-white/80 hover:text-white"
                }`}
              >
                {tab === "directory" ? "👨‍🏫 Staff Directory" : tab === "leaves" ? "🏖️ Leave Requests" : "💵 Salary / Payslip"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-7 h-7 text-teal-600" />
              Staff HRM & Leave Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Shikshakon aur school karmchariyon ka record, salary slpis aur leave approvals manage karein.
            </p>
          </div>
          {activeTab === "directory" && (
            <button
              onClick={() => setShowAddStaff(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Naya Staff Add Karein
            </button>
          )}
          {activeTab === "leaves" && (
            <button
              onClick={() => setShowApplyLeave(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Chhutti (Leave) Apply Karein
            </button>
          )}
        </div>

        {/* TAB 1: STAFF DIRECTORY */}
        {activeTab === "directory" && (
          <div className="space-y-4">
            {showAddStaff && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-teal-500 shadow-md space-y-4">
                <h3 className="font-black text-slate-900 dark:text-white text-base">Naya Staff Member Jodein</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Poora Naam:</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar Sharma"
                      value={staffForm.name}
                      onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Mobile Number:</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={staffForm.phone}
                      onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Designation / Pad:</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Maths Teacher, Lab Incharge, Accountant"
                      value={staffForm.designation}
                      onChange={e => setStaffForm({ ...staffForm, designation: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Monthly Salary (₹):</label>
                    <input
                      type="number"
                      value={staffForm.monthlySalary}
                      onChange={e => setStaffForm({ ...staffForm, monthlySalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddStaff(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                    Cancel
                  </button>
                  <button onClick={handleAddStaff} className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-black shadow">
                    Save Staff Member
                  </button>
                </div>
              </div>
            )}

            {staffList.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Koi Staff Member Added Nahi Hai</p>
                <p className="text-xs">Upar diye button se pehla staff member add karein.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {staffList.map(st => (
                  <div key={st.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 font-black flex items-center justify-center text-sm">
                        {st.name.slice(0, 1)}
                      </div>
                      <button onClick={() => handleDeleteStaff(st.id)} className="text-slate-400 hover:text-rose-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm">{st.name}</h3>
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400">{st.designation}</p>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {st.phone}
                      </p>
                    </div>
                    <div className="pt-2 border-t dark:border-slate-700 flex justify-between items-center text-xs">
                      <span className="text-slate-400">Monthly Salary:</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">₹{st.monthlySalary.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEAVE REQUESTS */}
        {activeTab === "leaves" && (
          <div className="space-y-4">
            {showApplyLeave && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-indigo-500 shadow-md space-y-4">
                <h3 className="font-black text-slate-900 dark:text-white text-base">Chhutti (Leave) Apply Karein</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Staff Member Chuno:</label>
                    <select
                      value={leaveForm.staffId}
                      onChange={e => setLeaveForm({ ...leaveForm, staffId: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    >
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Leave Type:</label>
                    <select
                      value={leaveForm.leaveType}
                      onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    >
                      <option value="casual">Casual Leave (CL)</option>
                      <option value="sick">Medical / Sick Leave</option>
                      <option value="earned">Earned Leave (EL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Kab Se (From):</label>
                    <input
                      type="date"
                      value={leaveForm.fromDate}
                      onChange={e => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Kab Tak (To):</label>
                    <input
                      type="date"
                      value={leaveForm.toDate}
                      onChange={e => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Karan (Reason):</label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent family matter, viral fever..."
                      value={leaveForm.reason}
                      onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowApplyLeave(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                    Cancel
                  </button>
                  <button onClick={handleApplyLeave} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow">
                    Submit Leave Application
                  </button>
                </div>
              </div>
            )}

            {leavesList.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Clock className="w-10 h-10 mx-auto opacity-30 text-indigo-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Koi Leave Request Nahi Hai</p>
                <p className="text-xs">Staff ke sabbhi leave applications yahan dikhenge.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leavesList.map(l => (
                  <div key={l.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-900 dark:text-white text-sm">{l.staffName}</span>
                        <span className="text-xs text-slate-400">({l.designation})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                          {l.leaveType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {l.fromDate} to {l.toDate} · <strong className="text-slate-800 dark:text-white">{l.reason}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {l.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleUpdateLeave(l.id, "approved")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateLeave(l.id, "rejected")}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      ) : (
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                          l.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {l.status === "approved" ? "✅ Approved" : "❌ Rejected"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SALARY PAYSLIP */}
        {activeTab === "salary" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Staff Member Chuno:</span>
                <select
                  value={selectedStaffForSlip?.id || ""}
                  onChange={e => setSelectedStaffForSlip(staffList.find(s => s.id === e.target.value) || null)}
                  className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePrintSlip}
                disabled={!selectedStaffForSlip}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Print Payslip
              </button>
            </div>

            {selectedStaffForSlip ? (
              <div className="bg-white rounded-2xl border-2 border-slate-900 p-8 shadow-xl max-w-2xl mx-auto text-slate-900 print:shadow-none print:border-2 print:m-0 print:max-w-none">
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
                  <h2 className="text-2xl font-black uppercase text-slate-900">{school.name}</h2>
                  <p className="text-xs text-slate-600">{school.address}</p>
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs uppercase mt-2">
                    MONTHLY SALARY SLIP
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                  <div>
                    <span className="text-slate-500 font-bold">Employee Name: </span>
                    <strong className="text-slate-900 text-sm">{selectedStaffForSlip.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Designation: </span>
                    <strong className="text-slate-900">{selectedStaffForSlip.designation}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Phone Number: </span>
                    <strong className="text-slate-900">{selectedStaffForSlip.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Pay Month: </span>
                    <strong className="text-slate-900">{new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}</strong>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-slate-300 rounded-xl overflow-hidden mb-6">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-2.5">Earnings Description</th>
                      <th className="p-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 font-bold">Basic Pay + Allowances</td>
                      <td className="p-2.5 text-right font-black">₹{selectedStaffForSlip.monthlySalary.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500">Deductions (TDS / Advance / PF)</td>
                      <td className="p-2.5 text-right text-slate-500">₹0</td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-950 font-black text-sm">
                      <td className="p-2.5">Net Payable Salary</td>
                      <td className="p-2.5 text-right">₹{selectedStaffForSlip.monthlySalary.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                  <div>
                    <div className="h-10 border-b border-slate-400 mb-1"></div>
                    <p className="font-bold text-slate-600">Employee Signature</p>
                  </div>
                  <div>
                    <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
                      <span className="italic font-serif font-black text-indigo-700">Authorized Signatory</span>
                    </div>
                    <p className="font-black text-slate-900 uppercase">Principal / Accounts Head</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
