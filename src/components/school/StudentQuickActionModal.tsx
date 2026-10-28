// @ts-nocheck
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  X, CreditCard, Calendar, IndianRupee, Printer, Phone, MessageCircle,
  CheckCircle, XCircle, AlertCircle, User, Award, Shield, Check,
  Clock, ArrowRight, ExternalLink, ReceiptText
} from "lucide-react";
import { getStudentFees, getMonthlyAttendance, currentMonthStr, saveFee, markFeePaid, updateStudent } from "../../school-firebase";
import type { School, SchoolClass, SchoolStudent, MonthlyFee, AttendanceRecord } from "../../school-types";
import { BLOOD_GROUPS } from "../../school-types";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: SchoolStudent | null;
  school: School | null;
  classes?: SchoolClass[];
  currentMonth?: string;
  adminUid?: string;
  onFeeUpdated?: () => void;
  initialTab?: "id_card" | "fees" | "attendance";
}

export const StudentQuickActionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  student,
  school,
  classes = [],
  currentMonth = currentMonthStr(),
  adminUid = "admin",
  onFeeUpdated,
  initialTab = "id_card",
}) => {
  const [activeStudent, setActiveStudent] = useState<SchoolStudent | null>(student);
  const [activeTab, setActiveTab] = useState<"id_card" | "fees" | "attendance">(initialTab);
  const [feeRecords, setFeeRecords] = useState<MonthlyFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [updatingFeeId, setUpdatingFeeId] = useState<string | null>(null);
  const [dpsReceiptFee, setDpsReceiptFee] = useState<MonthlyFee | null>(null);
  const [updatingBloodGroup, setUpdatingBloodGroup] = useState(false);
  const [bloodGroupUpdatedToast, setBloodGroupUpdatedToast] = useState(false);

  useEffect(() => {
    setActiveStudent(student);
  }, [student]);

  const handleUpdateBloodGroup = async (bg: string) => {
    if (!school?.id || !activeStudent?.id) return;
    setUpdatingBloodGroup(true);
    try {
      await updateStudent(school.id, activeStudent.id, { bloodGroup: bg });
      setActiveStudent(prev => prev ? { ...prev, bloodGroup: bg } : prev);
      setBloodGroupUpdatedToast(true);
      setTimeout(() => setBloodGroupUpdatedToast(false), 2500);
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to update blood group:", err);
    } finally {
      setUpdatingBloodGroup(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen || !student || !school?.id) return;

    // Fetch fee records for this student
    setLoadingFees(true);
    getStudentFees(school.id, student.id)
      .then(fees => {
        setFeeRecords(fees || []);
      })
      .catch(err => console.error("Error fetching student fees:", err))
      .finally(() => setLoadingFees(false));

    // Fetch attendance for student's class for the selected month
    if (student.classId) {
      setLoadingAttendance(true);
      getMonthlyAttendance(school.id, student.classId, selectedMonth)
        .then(records => {
          setAttendanceRecords(records || []);
        })
        .catch(err => console.error("Error fetching attendance:", err))
        .finally(() => setLoadingAttendance(false));
    }
  }, [isOpen, student?.id, school?.id, selectedMonth]);

  if (!isOpen || !student) return null;

  const className = classes.find(c => c.id === student.classId)?.name || student.classId || "Class";
  const schoolName = school?.name || "School";
  const schoolPhone = school?.phone || school?.mobile || "";

  // Attendance stats calculation
  const totalDaysMarked = attendanceRecords.length;
  let presentDays = 0;
  let absentDays = 0;
  const dayStatusMap: { [day: number]: boolean } = {};

  attendanceRecords.forEach(rec => {
    const dayNum = parseInt(rec.date.split("-")[2], 10);
    const studRec = rec.students?.[student.id];
    const isPresent = studRec
      ? (typeof studRec === "object" ? Boolean(studRec.present) : Boolean(studRec))
      : false;
    dayStatusMap[dayNum] = isPresent;
    if (isPresent) presentDays++;
    else absentDays++;
  });

  const attendancePercent = totalDaysMarked > 0 ? Math.round((presentDays / totalDaysMarked) * 100) : 0;

  // Fee calculation
  const totalFeesPaid = feeRecords.filter(f => f.paid).reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const unpaidRecords = feeRecords.filter(f => !f.paid);
  const totalPendingFee = unpaidRecords.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  // Toggle fee status
  const handleToggleFeePaid = async (fee: MonthlyFee) => {
    if (!school?.id) return;
    setUpdatingFeeId(fee.month);
    try {
      const newPaid = !fee.paid;
      const receiptNo = newPaid ? (fee.receiptNo || `RCP-${Date.now()}`) : undefined;
      const paidDate = newPaid ? new Date().toISOString() : undefined;
      const updatedFee: MonthlyFee = {
        ...fee,
        paid: newPaid,
        receiptNo,
        paidDate,
        paidBy: newPaid ? adminUid : undefined,
      };

      await saveFee(updatedFee);
      if (newPaid) {
        await markFeePaid(school.id, student.id, fee.month, adminUid);
      }

      setFeeRecords(prev => prev.map(f => f.month === fee.month ? updatedFee : f));
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to update fee:", err);
      alert("Fee update failed. Please retry.");
    } finally {
      setUpdatingFeeId(null);
    }
  };

  // Print ID Card
  const handlePrintIdCard = () => {
    const cur = activeStudent || student;
    const printWin = window.open("", "_blank", "width=800,height=600");
    if (!printWin) {
      alert("Please allow pop-ups to print the ID card.");
      return;
    }
    const qrData = `STUDENT ID\nName: ${cur.name}\nRoll: ${cur.rollNo || ""}\nClass: ${className}\nAdm: ${cur.admissionNo || ""}\nBlood: ${cur.bloodGroup || "—"}\nSchool: ${schoolName}\nPhone: ${cur.phone || ""}`;
    printWin.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>ID Card - ${cur.name}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f8fafc; }
            .card {
              width: 86mm;
              height: 54mm;
              background: #ffffff;
              border: 1.5px solid #1e3a8a;
              border-radius: 8px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              position: relative;
            }
            .header {
              background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
              color: white;
              padding: 3mm 4mm;
              text-align: center;
            }
            .school-title { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2; }
            .school-sub { font-size: 6pt; opacity: 0.9; margin-top: 1px; }
            .content {
              flex: 1;
              padding: 2.5mm 3.5mm;
              display: flex;
              gap: 3mm;
              align-items: center;
            }
            .photo-box {
              width: 22mm;
              height: 27mm;
              border: 1.5px solid #94a3b8;
              border-radius: 4px;
              overflow: hidden;
              background: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            .photo-box .placeholder { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
            .info { flex: 1; min-width: 0; }
            .student-name { font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
            .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: 1.2px 3mm; font-size: 6.5pt; color: #334155; }
            .meta-label { font-weight: 600; color: #64748b; }
            .meta-val { font-weight: 700; color: #0f172a; }
            .footer {
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              padding: 1.5mm 3.5mm;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 5.5pt;
              color: #64748b;
            }
            .sig { font-weight: 700; color: #1e3a8a; border-top: 1px solid #1e3a8a; padding-top: 1px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-title">${schoolName}</div>
              <div class="school-sub">${school?.address || "Student Identity Card"}</div>
            </div>
            <div class="content">
              <div class="photo-box">
                ${cur.photoUrl ? `<img src="${cur.photoUrl}" alt="${cur.name}" />` : `<div class="placeholder">${cur.name.charAt(0)}</div>`}
              </div>
              <div class="info">
                <div class="student-name">${cur.name}</div>
                <div class="meta-grid">
                  <div class="meta-label">Class:</div><div class="meta-val">${className}</div>
                  <div class="meta-label">Roll No:</div><div class="meta-val">${cur.rollNo || "—"}</div>
                  <div class="meta-label">Adm No:</div><div class="meta-val">${cur.admissionNo || "—"}</div>
                  ${cur.bloodGroup ? `<div class="meta-label">Blood Grp:</div><div class="meta-val" style="color: #b91c1c; font-weight: 800;">🩸 ${cur.bloodGroup}</div>` : ""}
                  ${cur.fatherName ? `<div class="meta-label">Father:</div><div class="meta-val">${cur.fatherName}</div>` : ""}
                  ${cur.phone ? `<div class="meta-label">Mobile:</div><div class="meta-val">${cur.phone}</div>` : ""}
                  ${cur.dateOfBirth ? `<div class="meta-label">DOB:</div><div class="meta-val">${cur.dateOfBirth}</div>` : ""}
                </div>
              </div>
            </div>
            <div class="footer">
              <div>Card ID: ${cur.id.slice(-6).toUpperCase()}</div>
              <div style="text-align: right;">
                ${school?.principalSignatureUrl ? `<img src="${school.principalSignatureUrl}" style="height: 18px; max-width: 65px; object-fit: contain; display: block; margin-left: auto; margin-bottom: 2px;" alt="Principal Sign" />` : ""}
                <div class="sig">${school?.principalName || "Principal Signature"}</div>
              </div>
            </div>
          </div>
          <script>window.onload = () => setTimeout(() => { window.print(); window.close(); }, 250);</script>
        </body>
      </html>`);
    printWin.document.close();
  };

  // WhatsApp reminder / info
  const handleWhatsAppMessage = (text: string) => {
    const raw = student.phone?.trim() || "";
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      alert("Student/Parent phone number nahi hai.");
      return;
    }
    const phoneNum = digits.length === 10 ? `91${digits}` : digits;
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg text-white overflow-hidden shadow-inner flex-shrink-0">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <span>{student.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold leading-tight">{student.name}</h3>
                {student.rollNo && (
                  <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                    Roll #{student.rollNo}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                {className} • Adm: {student.admissionNo || "—"} {student.phone ? `• 📞 ${student.phone}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Main Action Pills (As requested: ID Card, Fee Details, Attendance) */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-around gap-2">
          <button
            onClick={() => setActiveTab("id_card")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === "id_card"
                ? "bg-blue-600 text-white shadow-blue-500/30 scale-[1.02]"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>🪪 ID Card</span>
          </button>

          <button
            onClick={() => setActiveTab("fees")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === "fees"
                ? "bg-blue-600 text-white shadow-blue-500/30 scale-[1.02]"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <IndianRupee className="w-4 h-4 text-amber-400" />
            <span>💰 Fee Details</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === "attendance"
                ? "bg-blue-600 text-white shadow-blue-500/30 scale-[1.02]"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>📅 Attendance</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ──────────────── TAB 1: ID CARD ──────────────── */}
          {activeTab === "id_card" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Student Identity Card Preview
                </span>
                <button
                  onClick={handlePrintIdCard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print ID Card</span>
                </button>
              </div>

              {/* Realistic ID Card Card Preview */}
              <div className="max-w-sm mx-auto bg-white rounded-2xl border-2 border-blue-900 shadow-xl overflow-hidden text-slate-800">
                {/* ID Card Top Banner */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-3 text-center">
                  <p className="font-extrabold text-sm tracking-wide uppercase line-clamp-1">{schoolName}</p>
                  <p className="text-[10px] text-blue-200 line-clamp-1">{school?.address || "Recognized High School"}</p>
                </div>

                {/* ID Card Details Grid */}
                {(() => {
                  const cur = activeStudent || student;
                  return (
                    <div className="p-3.5 flex gap-3 items-center">
                      <div className="w-20 h-24 rounded-lg border-2 border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                        {cur.photoUrl ? (
                          <img src={cur.photoUrl} alt={cur.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-2 text-slate-400">
                            <User className="w-8 h-8 mx-auto mb-1 opacity-50" />
                            <span className="text-[9px] font-bold block">{cur.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-extrabold text-sm text-slate-900 line-clamp-1">{cur.name}</p>
                          {cur.bloodGroup && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              🩸 {cur.bloodGroup}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-400">Class:</span>
                          <span className="font-bold text-slate-800">{className}</span>
                          <span className="font-semibold text-slate-400">Roll No:</span>
                          <span className="font-bold text-slate-800">{cur.rollNo || "—"}</span>
                          <span className="font-semibold text-slate-400">Adm No:</span>
                          <span className="font-bold text-slate-800">{cur.admissionNo || "—"}</span>
                          {cur.bloodGroup && (
                            <>
                              <span className="font-semibold text-rose-600">Blood:</span>
                              <span className="font-black text-rose-700">🩸 {cur.bloodGroup}</span>
                            </>
                          )}
                          {cur.fatherName && (
                            <>
                              <span className="font-semibold text-slate-400">Father:</span>
                              <span className="font-bold text-slate-800 line-clamp-1">{cur.fatherName}</span>
                            </>
                          )}
                          {cur.phone && (
                            <>
                              <span className="font-semibold text-slate-400">Mobile:</span>
                              <span className="font-bold text-slate-800">{cur.phone}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="hidden sm:flex flex-col items-center justify-center p-1 bg-white rounded border border-slate-200">
                        <QRCode
                          value={`STUDENT:${cur.name}|ROLL:${cur.rollNo || ""}|CLASS:${className}|ADM:${cur.admissionNo || ""}|BLOOD:${cur.bloodGroup || ""}`}
                          size={44}
                        />
                        <span className="text-[8px] text-slate-400 mt-0.5">VERIFIED</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ID Card Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Card ID: {(activeStudent?.id || student.id).slice(-6).toUpperCase()}</span>
                  <div className="flex flex-col items-end">
                    {school?.principalSignatureUrl ? (
                      <img
                        src={school.principalSignatureUrl}
                        alt="Principal Sign"
                        className="h-4 max-w-[65px] object-contain mb-0.5"
                      />
                    ) : null}
                    <span className="font-bold text-blue-900 border-b border-blue-900 pb-0.5">
                      {school?.principalName ? `${school.principalName}` : "Authorized Sign"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instant Blood Group Selection & Update Widget */}
              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🩸</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Blood Group Set / Change Karein:
                    </span>
                    {(activeStudent?.bloodGroup || student.bloodGroup) ? (
                      <span className="text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full">
                        Current: {activeStudent?.bloodGroup || student.bloodGroup}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Not set</span>
                    )}
                  </div>
                  {bloodGroupUpdatedToast && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-in fade-in">
                      ✅ Blood Group Updated!
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {BLOOD_GROUPS.map(bg => {
                    const isSelected = (activeStudent?.bloodGroup || student.bloodGroup) === bg;
                    return (
                      <button
                        key={bg}
                        type="button"
                        disabled={updatingBloodGroup}
                        onClick={() => handleUpdateBloodGroup(bg)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          isSelected
                            ? "bg-rose-600 text-white shadow-rose-500/30 ring-2 ring-rose-400 scale-105"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {bg}
                      </button>
                    );
                  })}
                  {(activeStudent?.bloodGroup || student.bloodGroup) && (
                    <button
                      type="button"
                      disabled={updatingBloodGroup}
                      onClick={() => handleUpdateBloodGroup("")}
                      className="px-2 py-1 rounded-xl text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-center pt-1">
                {(activeStudent?.phone || student.phone) && (
                  <button
                    onClick={() => {
                      const cur = activeStudent || student;
                      handleWhatsAppMessage(
                        `Namaste, Yeh ${cur.name} ka Student ID Card details hai:\nClass: ${className}\nRoll No: ${cur.rollNo || "—"}\nAdmission No: ${cur.admissionNo || "—"}${cur.bloodGroup ? `\nBlood Group: ${cur.bloodGroup}` : ""}\nSchool: ${schoolName}`
                      );
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp ID Details</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: FEE DETAILS ──────────────── */}
          {activeTab === "fees" && (
            <div className="space-y-4">
              {/* Fee Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Total Paid</span>
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                    ₹{totalFeesPaid.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-emerald-600/70">
                    Monthly rate: ₹{student.monthlyFee || 0}/mo
                  </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Pending Dues</span>
                  <p className="text-lg font-extrabold text-orange-700 dark:text-orange-300">
                    ₹{totalPendingFee.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-orange-600/70">
                    {unpaidRecords.length} months pending
                  </p>
                </div>
              </div>

              {/* Month-wise records */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Fee History ({feeRecords.length} records)
                  </span>
                  {student.phone && totalPendingFee > 0 && (
                    <button
                      onClick={() =>
                        handleWhatsAppMessage(
                          `Fee Reminder — ${schoolName}\nStudent: ${student.name} (Roll: ${student.rollNo || "—"}, Class: ${className})\nTotal Due Amount: ₹${totalPendingFee.toLocaleString("en-IN")}\nKripya fee samay par jama karein.`
                        )
                      }
                      className="text-xs text-green-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send Due Reminder</span>
                    </button>
                  )}
                </div>

                {loadingFees ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Loading fee records...</div>
                ) : feeRecords.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 text-xs">
                    Koi fee record nahi mila.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {feeRecords.map(fee => {
                      const monthName = new Date(`${fee.month}-01T00:00:00`).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <div
                          key={fee.month}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            fee.paid
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                              : "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-white text-sm">{monthName}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  fee.paid
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                                }`}
                              >
                                {fee.paid ? "PAID" : "UNPAID"}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Fee: ₹{Number(fee.monthlyAmount ?? fee.amount ?? 0).toLocaleString("en-IN")}
                              {Number(fee.arrearsAmount || 0) > 0 ? ` + Due: ₹${fee.arrearsAmount}` : ""}
                              {fee.receiptNo ? ` • ${fee.receiptNo}` : ""}
                              {fee.paidDate ? ` • ${new Date(fee.paidDate).toLocaleDateString("en-IN")}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">
                              ₹{Number(fee.amount || 0).toLocaleString("en-IN")}
                            </span>
                            {fee.paid && (
                              <button
                                type="button"
                                onClick={() => setDpsReceiptFee(fee)}
                                className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Open Official DPS-Format Fee Receipt"
                              >
                                <ReceiptText className="w-3.5 h-3.5 text-amber-500" />
                                <span className="hidden sm:inline">DPS Receipt</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleFeePaid(fee)}
                              disabled={updatingFeeId === fee.month}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                                fee.paid
                                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              {updatingFeeId === fee.month ? "..." : fee.paid ? "Unpay" : "Mark Paid"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: ATTENDANCE ──────────────── */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              {/* Month Selector */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Month: {new Date(`${selectedMonth}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="text-xs px-2.5 py-1 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                />
              </div>

              {/* Attendance Score Card */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Total Marked</span>
                  <p className="text-xl font-extrabold text-blue-800 dark:text-blue-200">{totalDaysMarked}</p>
                  <span className="text-[10px] text-slate-400">Days</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Present</span>
                  <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200">{presentDays}</p>
                  <span className="text-[10px] text-emerald-600">Days (P)</span>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400">Absent</span>
                  <p className="text-xl font-extrabold text-red-800 dark:text-red-200">{absentDays}</p>
                  <span className="text-[10px] text-red-600">Days (A)</span>
                </div>
              </div>

              {/* Attendance Progress Bar */}
              <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300">Attendance Percentage:</span>
                  <span
                    className={
                      attendancePercent >= 75
                        ? "text-emerald-600"
                        : attendancePercent >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                    }
                  >
                    {attendancePercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      attendancePercent >= 75
                        ? "bg-emerald-500"
                        : attendancePercent >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, attendancePercent))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {attendancePercent >= 75
                    ? "✓ Minimum 75% attendance criteria satisfied."
                    : "⚠️ Attendance 75% se kam hai. Attention required."}
                </p>
              </div>

              {/* Day-by-day mini grid (1 to 31) */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Daily Attendance Matrix
                </span>
                {loadingAttendance ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Loading attendance...</div>
                ) : totalDaysMarked === 0 ? (
                  <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 text-xs">
                    Is month mein attendance mark nahi hui hai.
                  </div>
                ) : (
                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 text-center">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      const marked = day in dayStatusMap;
                      const isPresent = dayStatusMap[day];
                      return (
                        <div
                          key={day}
                          className={`p-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center ${
                            !marked
                              ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                              : isPresent
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                              : "bg-red-500 text-white border-red-600 shadow-sm"
                          }`}
                        >
                          <span className="text-[10px] opacity-80">{day}</span>
                          <span className="text-xs font-black">{!marked ? "-" : isPresent ? "P" : "A"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* WhatsApp Notification */}
              {student.phone && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() =>
                      handleWhatsAppMessage(
                        `Attendance Report — ${schoolName}\nStudent: ${student.name} (Class: ${className}, Roll: ${student.rollNo || "—"})\nMonth: ${selectedMonth}\nTotal Days: ${totalDaysMarked}\nPresent: ${presentDays}\nAbsent: ${absentDays}\nAttendance: ${attendancePercent}%`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Attendance on WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{schoolName} • Student Portal</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {dpsReceiptFee && (
        <OfficialFeeReceiptModal
          isOpen={Boolean(dpsReceiptFee)}
          onClose={() => setDpsReceiptFee(null)}
          school={school || {
            id: school?.id || "school",
            name: schoolName,
            address: school?.address || "",
            logoUrl: school?.logoUrl,
            principalSignatureUrl: school?.principalSignatureUrl,
          } as any}
          fee={dpsReceiptFee}
          student={activeStudent || student}
          className={className}
          sessionName="2026-2027"
        />
      )}
    </div>
  );
};
