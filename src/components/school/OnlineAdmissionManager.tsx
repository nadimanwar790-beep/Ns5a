// @ts-nocheck
import React, { useState, useEffect } from "react";
import type { School, SchoolClass, SchoolSession, AdmissionApplication, SchoolStudent } from "../../school-types";
import {
  getAdmissionApplications, saveAdmissionApplication, updateAdmissionStatus,
  saveStudent, generateId, saveFee, saveSchoolUserProfile, getLocalStudents, setLocalStudents
} from "../../school-firebase";
import { saveUserToLive } from "../../firebase";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import type { MonthlyFee } from "../../school-types";
import {
  UserPlus, CheckCircle2, XCircle, Clock, ChevronLeft, Search, Filter,
  Printer, Download, Phone, Mail, Calendar, MapPin, Building2, User,
  Sparkles, Check, AlertCircle, FileText, CreditCard, ShieldCheck
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
  classes = [],
  sessions = [],
  activeSession,
  isAdmin = true,
  onBack,
}) => {
  if (!school) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <p className="text-sm font-bold text-slate-300">School Profile Loading...</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 px-4 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20">
            Back
          </button>
        )}
      </div>
    );
  }

  const [tab, setTab] = useState<"admin_list" | "apply_form">("admin_list");
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);

  // Enrollment Modal & Admission Fee Structure
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingApp, setEnrollingApp] = useState<AdmissionApplication | null>(null);
  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollRollNo, setEnrollRollNo] = useState("");
  const [enrollMonthlyFee, setEnrollMonthlyFee] = useState<number>(1500);
  const [enrollStudentAadhaar, setEnrollStudentAadhaar] = useState("");
  const [enrollFatherAadhaar, setEnrollFatherAadhaar] = useState("");
  const [enrollMotherAadhaar, setEnrollMotherAadhaar] = useState("");
  
  // Admission Fee Heads
  const [enrollAdmissionFee, setEnrollAdmissionFee] = useState<number>(2500);
  const [enrollRegistrationFee, setEnrollRegistrationFee] = useState<number>(350);
  const [enrollDevelopmentFee, setEnrollDevelopmentFee] = useState<number>(1200);
  const [enrollIdKitFee, setEnrollIdKitFee] = useState<number>(450);
  const [enrollExamFund, setEnrollExamFund] = useState<number>(800);
  const [enrollPayMode, setEnrollPayMode] = useState<string>("Cash");
  const [enrollPaidAmount, setEnrollPaidAmount] = useState<number>(5300);
  
  const [enrolling, setEnrolling] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Admission Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalFee, setReceiptModalFee] = useState<MonthlyFee | null>(null);
  const [receiptModalStudent, setReceiptModalStudent] = useState<SchoolStudent | null>(null);

  // New Application Form State with Aadhaar Cards
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
    studentAadhaar: "",
    fatherAadhaar: "",
    motherAadhaar: "",
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
      (a.aadhaarNo && a.aadhaarNo.includes(search)) ||
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
        aadhaarNo: form.studentAadhaar.trim() || undefined,
        fatherAadhaar: form.fatherAadhaar.trim() || undefined,
        motherAadhaar: form.motherAadhaar.trim() || undefined,
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
      // 1. Create Student record with Aadhaar numbers
      const selectedCls = classes.find(c => c.id === enrollClassId);
      const studentId = generateId();
      const newStudent: SchoolStudent = {
        id: studentId,
        schoolId: school.id,
        sessionId: activeSession?.id || sessions[0]?.id || "",
        classId: enrollClassId,
        className: selectedCls?.name || enrollingApp.className || "Class",
        name: enrollingApp.studentName,
        rollNo: enrollRollNo || String(Math.floor(10 + Math.random() * 89)),
        admissionNo: enrollingApp.applicationNo,
        fatherName: enrollingApp.fatherName,
        motherName: enrollingApp.motherName,
        aadhaarNo: enrollStudentAadhaar.trim() || enrollingApp.aadhaarNo || undefined,
        fatherAadhaar: enrollFatherAadhaar.trim() || enrollingApp.fatherAadhaar || undefined,
        motherAadhaar: enrollMotherAadhaar.trim() || enrollingApp.motherAadhaar || undefined,
        phone: enrollingApp.phone,
        dateOfBirth: enrollingApp.dateOfBirth,
        bloodGroup: enrollingApp.bloodGroup || undefined,
        address: enrollingApp.address,
        monthlyFee: Number(enrollMonthlyFee) || 0,
        joinDate: new Date().toISOString().split("T")[0],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await saveStudent(newStudent);

      // Ensure local school students cache is updated across both school.id and default
      try {
        const curLocals = getLocalStudents(school.id);
        setLocalStudents(school.id, [newStudent, ...curLocals.filter(s => s.id !== newStudent.id)]);
        if (school.id !== 'dps_gurgaon_sector45') {
          const defLocals = getLocalStudents('dps_gurgaon_sector45');
          setLocalStudents('dps_gurgaon_sector45', [newStudent, ...defLocals.filter(s => s.id !== newStudent.id)]);
        }

        const studentUserPayload = {
          id: newStudent.id,
          uid: newStudent.id,
          displayId: `ROLL-${newStudent.rollNo}`,
          name: newStudent.name,
          email: enrollingApp.email || `${newStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.dps.edu.in`,
          mobile: newStudent.phone,
          role: 'STUDENT',
          schoolId: school.id,
          classLevel: enrollClassId,
          stream: 'General',
          credits: 100,
          diamonds: 50,
          streak: 1,
          totalScore: 0,
          profileCompleted: true,
          subscriptionTier: 'PRO',
          provider: 'qr_student_id',
          isQrLogin: true,
          admissionNo: newStudent.admissionNo,
          rollNo: newStudent.rollNo,
          fatherName: newStudent.fatherName,
          motherName: newStudent.motherName,
          bloodGroup: newStudent.bloodGroup,
          monthlyFee: newStudent.monthlyFee,
        };

        localStorage.setItem(`nst_school_user_${newStudent.id}`, JSON.stringify({
          uid: newStudent.id,
          schoolId: school.id,
          role: 'SCHOOL_STUDENT',
          name: newStudent.name,
          email: studentUserPayload.email,
          studentRef: newStudent.id,
          classId: enrollClassId,
          sessionId: '2026-27'
        }));

        saveSchoolUserProfile({
          uid: newStudent.id,
          schoolId: school.id,
          role: 'SCHOOL_STUDENT',
          name: newStudent.name,
          email: studentUserPayload.email,
          studentRef: newStudent.id,
          classId: enrollClassId,
          sessionId: '2026-27'
        }).catch(() => {});

        saveUserToLive(studentUserPayload, { immediate: true }).catch(() => {});
      } catch (cacheErr) {
        console.warn('Student profile cache notice:', cacheErr);
      }

      // 2. Compute Admission Fee Record & Receipts
      const totalAdmissionPayable =
        Number(enrollAdmissionFee) +
        Number(enrollRegistrationFee) +
        Number(enrollDevelopmentFee) +
        Number(enrollIdKitFee) +
        Number(enrollExamFund);

      const paidAdmissionAmt = Number(enrollPaidAmount) || totalAdmissionPayable;
      const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;

      const admissionFeeRecord: MonthlyFee = {
        schoolId: school.id,
        studentId: studentId,
        studentName: enrollingApp.studentName,
        rollNo: newStudent.rollNo,
        classId: enrollClassId,
        month: new Date().toISOString().slice(0, 7),
        amount: totalAdmissionPayable,
        monthlyAmount: Number(enrollMonthlyFee) || 0,
        paid: paidAdmissionAmt >= totalAdmissionPayable,
        paidDate: new Date().toISOString(),
        receiptNo: receiptNo,
        paidAmount: paidAdmissionAmt,
        balanceDue: Math.max(0, totalAdmissionPayable - paidAdmissionAmt),
        concession: 0,
        feeType: 'admission',
        receiptCategory: 'admission',
        payModeInfo: {
          payMode: enrollPayMode,
          date: new Date().toLocaleDateString('en-GB'),
          bank: enrollPayMode === "Cash" ? "" : "Bank / QR",
          number: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        },
        items: [
          { id: "adm_1", slNo: 1, description: "Admission Fee (नामांकन / प्रवेश शुल्क)", due: Number(enrollAdmissionFee), con: 0, paid: Number(enrollAdmissionFee) },
          { id: "adm_2", slNo: 2, description: "Registration & Prospectus Form (पंजीकरण फॉर्म)", due: Number(enrollRegistrationFee), con: 0, paid: Number(enrollRegistrationFee) },
          { id: "adm_3", slNo: 3, description: "Annual Development & Building Fund (विकास कोष)", due: Number(enrollDevelopmentFee), con: 0, paid: Number(enrollDevelopmentFee) },
          { id: "adm_4", slNo: 4, description: "Student Kit, ID Card & Diary (आईडी कार्ड, डायरी व किट)", due: Number(enrollIdKitFee), con: 0, paid: Number(enrollIdKitFee) },
          { id: "adm_5", slNo: 5, description: "Annual Exam & Activity Charges (वार्षिक परीक्षा कोष)", due: Number(enrollExamFund), con: 0, paid: Number(enrollExamFund) },
        ]
      };

      await saveFee(admissionFeeRecord);

      // 3. Update Application Status
      await updateAdmissionStatus(school.id, enrollingApp.id, "approved", {
        assignedRollNo: newStudent.rollNo,
        remarks: `Enrolled. Admission Receipt #${receiptNo} generated.`,
      });

      setShowEnrollModal(false);
      setSuccessToast(`🎉 ${enrollingApp.studentName} नामांकित हो गए (Roll #${newStudent.rollNo})! प्रवेश रसीद तैयार है।`);
      
      // Auto open Admission Fee Receipt Modal for instant print/download
      setReceiptModalStudent(newStudent);
      setReceiptModalFee(admissionFeeRecord);
      setReceiptModalOpen(true);

      setTimeout(() => setSuccessToast(null), 5000);
      fetchApplications();
    } catch (err: any) {
      alert("Enrollment failed: " + (err?.message || "Error"));
    } finally {
      setEnrolling(false);
    }
  };

  const handleOpenExistingAdmissionReceipt = (app: AdmissionApplication) => {
    const student: SchoolStudent = {
      id: app.id,
      schoolId: school.id,
      sessionId: activeSession?.id || "",
      classId: app.classId,
      name: app.studentName,
      rollNo: app.assignedRollNo || "01",
      admissionNo: app.applicationNo,
      fatherName: app.fatherName,
      motherName: app.motherName,
      aadhaarNo: app.aadhaarNo,
      fatherAadhaar: app.fatherAadhaar,
      motherAadhaar: app.motherAadhaar,
      phone: app.phone,
      dateOfBirth: app.dateOfBirth,
      monthlyFee: 1500,
      joinDate: app.appliedAt.slice(0, 10),
      active: true,
      createdAt: app.appliedAt,
    };

    const fee: MonthlyFee = {
      schoolId: school.id,
      studentId: app.id,
      studentName: app.studentName,
      rollNo: app.assignedRollNo || "01",
      classId: app.classId,
      month: app.appliedAt.slice(0, 7),
      amount: 5300,
      monthlyAmount: 1500,
      paid: true,
      paidDate: app.appliedAt,
      receiptNo: `ADM-${app.applicationNo.replace(/\D/g, '').slice(-5) || "55241"}`,
      paidAmount: 5300,
      balanceDue: 0,
      concession: 0,
      feeType: 'admission',
      receiptCategory: 'admission',
      payModeInfo: {
        payMode: "Cash",
        date: new Date(app.appliedAt).toLocaleDateString('en-GB'),
        bank: "",
        number: "PAID-OFFICE",
      },
      items: [
        { id: "adm_1", slNo: 1, description: "Admission Fee (नामांकन / प्रवेश शुल्क)", due: 2500, con: 0, paid: 2500 },
        { id: "adm_2", slNo: 2, description: "Registration & Prospectus Form (पंजीकरण फॉर्म)", due: 350, con: 0, paid: 350 },
        { id: "adm_3", slNo: 3, description: "Annual Development & Building Fund (विकास कोष)", due: 1200, con: 0, paid: 1200 },
        { id: "adm_4", slNo: 4, description: "Student Kit, ID Card & Diary (आईडी कार्ड, डायरी व किट)", due: 450, con: 0, paid: 450 },
        { id: "adm_5", slNo: 5, description: "Annual Exam & Activity Charges (वार्षिक परीक्षा कोष)", due: 800, con: 0, paid: 800 },
      ]
    };

    setReceiptModalStudent(student);
    setReceiptModalFee(fee);
    setReceiptModalOpen(true);
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

                  {/* Aadhaar Badge if available */}
                  {(app.aadhaarNo || app.fatherAadhaar) && (
                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                      {app.aadhaarNo && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-blue-600" /> Student UID: {app.aadhaarNo}
                        </span>
                      )}
                      {app.fatherAadhaar && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Father UID: {app.fatherAadhaar}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400">
                      Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {app.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setEnrollingApp(app);
                              setEnrollClassId(app.classId || classes[0]?.id || "");
                              setEnrollRollNo("");
                              setEnrollStudentAadhaar(app.aadhaarNo || "");
                              setEnrollFatherAadhaar(app.fatherAadhaar || "");
                              setEnrollMotherAadhaar(app.motherAadhaar || "");
                              setEnrollMonthlyFee((classes.find(c => c.id === (app.classId || classes[0]?.id)) as any)?.defaultFee || 1500);
                              setEnrollPaidAmount(5300);
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Roll #{app.assignedRollNo || "✓"}
                          </span>
                          <button
                            onClick={() => handleOpenExistingAdmissionReceipt(app)}
                            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/30 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            title="Print or view official admission fee receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-600" />
                            <span>प्रवेश रसीद</span>
                          </button>
                        </div>
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

                {/* 3. Aadhaar Card Verification (अनिवार्य U-DISE+ / DBT / Scholarship) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>3. Aadhaar Card Details (आधार कार्ड विवरण - U-DISE+ / DBT)</span>
                    </h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Govt. Verified Format
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Student's 12-Digit Aadhaar No.
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={form.studentAadhaar}
                        onChange={e => setForm(p => ({ ...p, studentAadhaar: e.target.value.replace(/\D/g, '') }))}
                        placeholder="XXXX-XXXX-XXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">छात्र का आधार नंबर</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Father's 12-Digit Aadhaar No.
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={form.fatherAadhaar}
                        onChange={e => setForm(p => ({ ...p, fatherAadhaar: e.target.value.replace(/\D/g, '') }))}
                        placeholder="XXXX-XXXX-XXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">पिता का आधार नंबर</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Mother's 12-Digit Aadhaar No.
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={form.motherAadhaar}
                        onChange={e => setForm(p => ({ ...p, motherAadhaar: e.target.value.replace(/\D/g, '') }))}
                        placeholder="XXXX-XXXX-XXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">माता का आधार नंबर</span>
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
                    {submitting ? "Submitting..." : "Submit Admission Application"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ENROLLMENT & ADMISSION FEE MODAL */}
      {showEnrollModal && enrollingApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-auto">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Enrollment &amp; Admission Fee Receipt
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                नामांकन व प्रवेश शुल्क: {enrollingApp.studentName}
              </h3>
              <p className="text-xs text-slate-500">
                कक्षा, रोल नंबर, आधार और प्रवेश शुल्क विवरण भरें। सबमिट करते ही प्रवेश रसीद बन जाएगी।
              </p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Class & Roll No */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Class Assigned *
                  </label>
                  <select
                    value={enrollClassId}
                    onChange={e => setEnrollClassId(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl text-xs font-bold bg-white dark:bg-slate-800"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    value={enrollRollNo}
                    onChange={e => setEnrollRollNo(e.target.value)}
                    placeholder="e.g. 01 or 105"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl text-xs font-bold bg-white dark:bg-slate-800"
                  >
                  </input>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Monthly Tuition Fee (मासिक शुल्क ₹)
                  </label>
                  <input
                    type="number"
                    value={enrollMonthlyFee}
                    onChange={e => setEnrollMonthlyFee(Number(e.target.value))}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl text-xs font-bold bg-white dark:bg-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">हर महीने की नियमित ट्यूशन फीस</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Mode (भुगतान माध्यम)
                  </label>
                  <select
                    value={enrollPayMode}
                    onChange={e => setEnrollPayMode(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl text-xs font-bold bg-white dark:bg-slate-800"
                  >
                    <option value="Cash">Cash (नकद)</option>
                    <option value="UPI / QR">UPI / QR Code</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Aadhaar Numbers */}
              <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-2">
                <span className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                  Aadhaar Card Records (आधार कार्ड नंबर)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Student Aadhaar (12 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={enrollStudentAadhaar}
                      onChange={e => setEnrollStudentAadhaar(e.target.value.replace(/\D/g, ''))}
                      placeholder="Student 12-digit UID"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Father / Parent Aadhaar (12 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={enrollFatherAadhaar}
                      onChange={e => setEnrollFatherAadhaar(e.target.value.replace(/\D/g, ''))}
                      placeholder="Father 12-digit UID"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* One-Time Admission Fee Breakup */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">
                    प्रवेश शुल्क विवरण (Admission Fee Heads)
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    Total: ₹{(
                      Number(enrollAdmissionFee) +
                      Number(enrollRegistrationFee) +
                      Number(enrollDevelopmentFee) +
                      Number(enrollIdKitFee) +
                      Number(enrollExamFund)
                    ).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Admission Fee (नामांकन) ₹
                    </label>
                    <input
                      type="number"
                      value={enrollAdmissionFee}
                      onChange={e => setEnrollAdmissionFee(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-bold border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Registration / Form ₹
                    </label>
                    <input
                      type="number"
                      value={enrollRegistrationFee}
                      onChange={e => setEnrollRegistrationFee(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-bold border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Development Fund ₹
                    </label>
                    <input
                      type="number"
                      value={enrollDevelopmentFee}
                      onChange={e => setEnrollDevelopmentFee(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-bold border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      ID Card, Diary &amp; Kit ₹
                    </label>
                    <input
                      type="number"
                      value={enrollIdKitFee}
                      onChange={e => setEnrollIdKitFee(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-bold border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Annual Exam / Lab Fund ₹
                    </label>
                    <input
                      type="number"
                      value={enrollExamFund}
                      onChange={e => setEnrollExamFund(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-bold border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Amount Received (जमा) ₹
                    </label>
                    <input
                      type="number"
                      value={enrollPaidAmount}
                      onChange={e => setEnrollPaidAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-bold border border-emerald-500 rounded-lg bg-white dark:bg-slate-900 text-emerald-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveAndEnroll}
                disabled={enrolling}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{enrolling ? "Enrolling..." : "नामांकन करें व रसीद बनाएं"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL ADMISSION FEE RECEIPT MODAL */}
      {receiptModalOpen && receiptModalFee && (
        <OfficialFeeReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          school={school}
          fee={receiptModalFee}
          student={receiptModalStudent}
          className={classes.find(c => c.id === receiptModalFee.classId)?.name || "Standard"}
          sessionName={activeSession?.name || "2026-2027"}
        />
      )}
    </div>
  );
};
