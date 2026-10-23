// @ts-nocheck
import React, { useState, useEffect } from "react";
import type { School, SchoolClass, SchoolSession, AdmissionApplication, SchoolStudent } from "../../school-types";
import {
  getAdmissionApplications, saveAdmissionApplication, updateAdmissionStatus,
  saveStudent, generateId
} from "../../school-firebase";
import {
  UserPlus, CheckCircle2, XCircle, Clock, ChevronLeft, Search, Filter,
  Printer, Download, Phone, Mail, Calendar, MapPin, Building2, User,
  Sparkles, Check, AlertCircle, FileText
} from "lucide-react";

interface Props {
  school: School;
  classes: SchoolClass[];
  sessions: SchoolSession[];
  activeSession: SchoolSession | null;
  isAdmin?: boolean;
  onBack: () => void;
}

export const OnlineAdmissionManager: React.FC<Props> = ({
  school,
  classes,
  sessions,
  activeSession,
  isAdmin = true,
  onBack,
}) => {
  const [tab, setTab] = useState<"admin_list" | "apply_form">("admin_list");
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);

  // Enrollment Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingApp, setEnrollingApp] = useState<AdmissionApplication | null>(null);
  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollRollNo, setEnrollRollNo] = useState("");
  const [enrollMonthlyFee, setEnrollMonthlyFee] = useState<number>(0);
  const [enrolling, setEnrolling] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Application Form State
  const [form, setForm] = useState({
    studentName: "",
    gender: "male" as "male" | "female" | "other",
    dateOfBirth: "",
    bloodGroup: "O+",
    category: "General",
    classId: classes[0]?.id || "",
    className: classes[0]?.name || "Class 1",
    previousSchool: "",
    previousMarks: "",
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedAppNo, setSubmittedAppNo] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const list = await getAdmissionApplications(school.id);
      setApplications(list);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [school.id]);

  const filteredApps = applications.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchSearch = !search.trim() ||
      a.studentName.toLowerCase().includes(search.toLowerCase()) ||
      a.applicationNo.toLowerCase().includes(search.toLowerCase()) ||
      a.phone.includes(search);
    return matchStatus && matchSearch;
  });

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.phone.trim()) {
      alert("Please fill student name and contact number.");
      return;
    }
    setSubmitting(true);
    try {
      const selectedCls = classes.find(c => c.id === form.classId);
      const appNo = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newApp: AdmissionApplication = {
        id: generateId(),
        applicationNo: appNo,
        schoolId: school.id,
        sessionId: activeSession?.id || "",
        classId: form.classId,
        className: selectedCls?.name || form.className,
        studentName: form.studentName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bloodGroup: form.bloodGroup,
        category: form.category,
        previousSchool: form.previousSchool,
        previousMarks: form.previousMarks,
        fatherName: form.fatherName.trim(),
        fatherOccupation: form.fatherOccupation,
        motherName: form.motherName.trim(),
        motherOccupation: form.motherOccupation,
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        status: "pending",
        appliedAt: new Date().toISOString(),
      };

      await saveAdmissionApplication(school.id, newApp);
      setSubmittedAppNo(appNo);
      fetchApplications();
    } catch (err: any) {
      alert("Submission failed: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndEnroll = async () => {
    if (!enrollingApp || !enrollClassId) return;
    setEnrolling(true);
    try {
      // 1. Create Student record
      const studentId = generateId();
      const newStudent: SchoolStudent = {
        id: studentId,
        schoolId: school.id,
        sessionId: activeSession?.id || sessions[0]?.id || "",
        classId: enrollClassId,
        name: enrollingApp.studentName,
        rollNo: enrollRollNo || String(Math.floor(10 + Math.random() * 89)),
        admissionNo: enrollingApp.applicationNo,
        fatherName: enrollingApp.fatherName,
        motherName: enrollingApp.motherName,
        phone: enrollingApp.phone,
        dateOfBirth: enrollingApp.dateOfBirth,
        address: enrollingApp.address,
        monthlyFee: Number(enrollMonthlyFee) || 0,
        joinDate: new Date().toISOString().split("T")[0],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await saveStudent(newStudent);

      // 2. Update Application Status
      await updateAdmissionStatus(school.id, enrollingApp.id, "approved", {
        assignedRollNo: enrollRollNo,
        remarks: "Enrolled in class",
      });

      setShowEnrollModal(false);
      setSuccessToast(`Student ${enrollingApp.studentName} enrolled successfully as Roll #${enrollRollNo}!`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchApplications();
    } catch (err: any) {
      alert("Enrollment failed: " + (err?.message || "Error"));
    } finally {
      setEnrolling(false);
    }
  };

  const handleReject = async (app: AdmissionApplication) => {
    if (!window.confirm(`Reject admission application for ${app.studentName}?`)) return;
    await updateAdmissionStatus(school.id, app.id, "rejected", { remarks: "Did not meet criteria" });
    fetchApplications();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTab("admin_list"); setSubmittedAppNo(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                tab === "admin_list" ? "bg-blue-600 text-white shadow" : "bg-white/10 text-slate-300 hover:text-white"
              }`}
            >
              📋 Admissions List ({applications.length})
            </button>
            <button
              onClick={() => setTab("apply_form")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                tab === "apply_form" ? "bg-amber-500 text-slate-950 font-black shadow" : "bg-white/10 text-slate-300 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> + New Online Admission Form
            </button>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="max-w-xl mx-auto mt-4 px-4">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* VIEW A: ADMIN ADMISSION LIST */}
      {tab === "admin_list" && (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
          {/* Header Stats */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-600" />
                Online Admission &amp; Registration Portal
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage online registrations, verify documents, and admit candidates directly into classes.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                Pending: {applications.filter(a => a.status === "pending").length}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                Enrolled: {applications.filter(a => a.status === "approved").length}
              </span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by student name, application no, or phone..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {(["all", "pending", "approved", "rejected"] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                    statusFilter === st ? "bg-slate-900 text-white dark:bg-blue-600" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Applications List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading applications...</div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-slate-700 dark:text-slate-300 font-bold">No Applications Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No admission forms matching your filter. Click "+ New Online Admission Form" to register a candidate or share the school website link.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApps.map(app => (
                <div
                  key={app.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {app.applicationNo}
                      </span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                        {app.studentName}
                      </h4>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                        Applied for: {app.className || "Standard"}
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                      app.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                      app.status === "rejected" ? "bg-rose-100 text-rose-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl font-medium">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Father:</span>
                      <span className="font-bold">{app.fatherName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phone:</span>
                      <span className="font-bold">{app.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOB:</span>
                      <span>{app.dateOfBirth || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Prev. School:</span>
                      <span className="truncate block">{app.previousSchool || "Fresh admission"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400">
                      Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {app.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setEnrollingApp(app);
                              setEnrollClassId(app.classId || classes[0]?.id || "");
                              setEnrollRollNo("");
                              setEnrollMonthlyFee((classes.find(c => c.id === (app.classId || classes[0]?.id)) as any)?.defaultFee || 0);
                              setShowEnrollModal(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve &amp; Enroll
                          </button>
                          <button
                            onClick={() => handleReject(app)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {app.status === "approved" && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Enrolled (Roll #{app.assignedRollNo || "✓"})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW B: ONLINE ADMISSION APPLICATION FORM */}
      {tab === "apply_form" && (
        <div className="max-w-3xl mx-auto px-4 py-8">
          {submittedAppNo ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-emerald-300 dark:border-emerald-700 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Application Submitted Successfully!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Your online admission application has been recorded in the school registry.
              </p>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl inline-block">
                <span className="text-xs font-bold text-slate-500 uppercase block">Application Number</span>
                <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">{submittedAppNo}</span>
              </div>
              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => { setSubmittedAppNo(null); setTab("admin_list"); }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow"
                >
                  View in Applications List
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Application Slip
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-wider">
                  Official Admission Form 2026-27
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  Student Registration &amp; Admission
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill candidate and parent details accurately for verification.
                </p>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-6">
                {/* 1. Student Particulars */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b pb-1">
                    1. Student Particulars
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Full Name of Candidate *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.studentName}
                        onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))}
                        placeholder="e.g. Rohan Sharma"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Class Applying For *
                      </label>
                      <select
                        value={form.classId}
                        onChange={e => {
                          const cls = classes.find(c => c.id === e.target.value);
                          setForm(p => ({ ...p, classId: e.target.value, className: cls?.name || "" }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Gender
                      </label>
                      <select
                        value={form.gender}
                        onChange={e => setForm(p => ({ ...p, gender: e.target.value as any }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Previous School Attended (If any)
                      </label>
                      <input
                        type="text"
                        value={form.previousSchool}
                        onChange={e => setForm(p => ({ ...p, previousSchool: e.target.value }))}
                        placeholder="e.g. St. Xavier's Convent"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Last Class Marks / %
                      </label>
                      <input
                        type="text"
                        value={form.previousMarks}
                        onChange={e => setForm(p => ({ ...p, previousMarks: e.target.value }))}
                        placeholder="e.g. 84.5% or A Grade"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Parent & Contact Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b pb-1">
                    2. Parent / Guardian Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Father's Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fatherName}
                        onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))}
                        placeholder="Shri..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Mother's Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.motherName}
                        onChange={e => setForm(p => ({ ...p, motherName: e.target.value }))}
                        placeholder="Smt..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Primary Mobile / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+91..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="parent@example.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Residential Address
                      </label>
                      <textarea
                        rows={2}
                        value={form.address}
                        onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                        placeholder="House No, Village/Ward, Post, District..."
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTab("admin_list")}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-lg disabled:opacity-60 flex items-center gap-2"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ENROLLMENT MODAL */}
      {showEnrollModal && enrollingApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Enroll Student: {enrollingApp.studentName}
            </h3>
            <p className="text-xs text-slate-500">
              Assign class and roll number to finalize enrollment and add to school registry.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign Class *
                </label>
                <select
                  value={enrollClassId}
                  onChange={e => setEnrollClassId(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign Roll Number *
                </label>
                <input
                  type="text"
                  value={enrollRollNo}
                  onChange={e => setEnrollRollNo(e.target.value)}
                  placeholder="e.g. 101 or 01"
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Tuition Fee (₹)
                </label>
                <input
                  type="number"
                  value={enrollMonthlyFee}
                  onChange={e => setEnrollMonthlyFee(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAndEnroll}
                disabled={enrolling}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow disabled:opacity-60"
              >
                {enrolling ? "Enrolling..." : "Confirm & Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
