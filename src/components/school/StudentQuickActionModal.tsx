// @ts-nocheck
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  X, CreditCard, Calendar, IndianRupee, Printer, Phone, MessageCircle,
  CheckCircle, XCircle, AlertCircle, User, Award, Shield, Check,
  Clock, ArrowRight, ExternalLink, ReceiptText, Eye, Edit3, Save,
  FileText, BookOpen, GraduationCap, CheckCircle2, Copy, Sparkles, MapPin,
  Bus, HeartPulse, UserCheck, AlertTriangle, ArrowUpRight, CheckSquare, Sparkle, Tag,
  Users, Activity, Star, RefreshCw, FileCheck
} from "lucide-react";
import {
  getStudentFees, getMonthlyAttendance, currentMonthStr, saveFee,
  markFeePaid, updateStudent, getExams, getStudents
} from "../../school-firebase";
import { BLOOD_GROUPS } from "../../school-types";
import type { School, SchoolClass, SchoolStudent, MonthlyFee, AttendanceRecord, ExamEntry } from "../../school-types";
import { toast } from "sonner";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { getSavedSchoolLogo } from "./feeReceiptUtils";
import { AdmissionFormPrintModal, printHtmlInIframe, calculateAgeOnAprilFirst } from "./AdmissionFormPrintModal";

export type StudentQuickActionTab =
  | "profile"
  | "fees"
  | "marks"
  | "attendance"
  | "id_card"
  | "transport"
  | "remarks"
  | "edit"
  | "siblings"
  | "admin_controls";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: SchoolStudent | null;
  school: School | null;
  classes?: SchoolClass[];
  currentMonth?: string;
  adminUid?: string;
  onFeeUpdated?: () => void;
  initialTab?: StudentQuickActionTab;
}

const escapeHtml = (str?: string | number | null): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const StudentQuickActionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  student,
  school,
  classes = [],
  currentMonth = currentMonthStr(),
  adminUid = "admin",
  onFeeUpdated,
  initialTab = "profile",
}) => {
  const [activeStudent, setActiveStudent] = useState<SchoolStudent | null>(student);
  const [activeTab, setActiveTab] = useState<StudentQuickActionTab>(initialTab || "profile");
  const [feeRecords, setFeeRecords] = useState<MonthlyFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [examRecords, setExamRecords] = useState<ExamEntry[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [classmates, setClassmates] = useState<SchoolStudent[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [updatingFeeId, setUpdatingFeeId] = useState<string | null>(null);
  const [dpsReceiptFee, setDpsReceiptFee] = useState<MonthlyFee | null>(null);
  const [expandedFeeMonths, setExpandedFeeMonths] = useState<string[]>([]);
  const [updatingBloodGroup, setUpdatingBloodGroup] = useState(false);
  const [bloodGroupUpdatedToast, setBloodGroupUpdatedToast] = useState(false);
  const [showAdmissionFormModal, setShowAdmissionFormModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [allSchoolStudents, setAllSchoolStudents] = useState<SchoolStudent[]>([]);
  const [siblingSearchQuery, setSiblingSearchQuery] = useState("");
  const [linkingSiblingId, setLinkingSiblingId] = useState<string | null>(null);
  const [discountEdits, setDiscountEdits] = useState<Record<string, { amount: string; pct: string; saving?: boolean }>>({});

  // Quick Inline Edit Form
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSavedToast, setEditSavedToast] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    rollNo: "",
    phone: "",
    whatsappNo: "",
    fatherName: "",
    fatherOccupation: "",
    fatherQualification: "",
    fatherPhone: "",
    fatherWhatsapp: "",
    motherName: "",
    motherOccupation: "",
    motherQualification: "",
    motherPhone: "",
    motherWhatsapp: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelation: "",
    emergencyWhatsapp: "",
    monthlyFee: 0,
    busFee: 0,
    busRoute: "",
    address: "",
    bloodGroup: "",
    category: "",
  });

  // Transport Details Form
  const [savingTransport, setSavingTransport] = useState(false);
  const [transportSavedToast, setTransportSavedToast] = useState(false);
  const [transportForm, setTransportForm] = useState({
    usesBus: false,
    busNumber: "",
    busRoute: "",
    busStop: "",
    busFee: 0,
    driverName: "",
    driverPhone: "",
    conductorName: "",
    conductorPhone: "",
    transportDistanceKm: "",
    transportModeIfNo: "Walking" as "Walking" | "Guardian",
  });

  // Remarks & Medical Sensitivity Form
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [remarksSavedToast, setRemarksSavedToast] = useState(false);
  const [remarksForm, setRemarksForm] = useState({
    homeworkStatus: "",
    medicalHistory: "",
    childSensitivityRemarks: "",
    teacherRemark: "",
    awardsAchievements: "",
  });

  // Administrative Controls (Promote / TC)
  const [promoteClassId, setPromoteClassId] = useState("");
  const [promotingStudent, setPromotingStudent] = useState(false);
  const [promoteSuccessToast, setPromoteSuccessToast] = useState(false);
  const [tcNumber, setTcNumber] = useState("");
  const [tcReason, setTcReason] = useState("Higher Education / Relocation");
  const [issuingTc, setIssuingTc] = useState(false);
  const [tcSuccessToast, setTcSuccessToast] = useState(false);
  const [confirmAdminAction, setConfirmAdminAction] = useState<"promote" | "tc" | "toggle_active" | null>(null);

  useEffect(() => {
    setActiveStudent(student);
    if (student) {
      setEditForm({
        name: student.name || "",
        rollNo: student.rollNo || "",
        phone: student.phone || "",
        whatsappNo: student.whatsappNo || "",
        fatherName: student.fatherName || "",
        fatherOccupation: student.fatherOccupation || "",
        fatherQualification: (student as any).fatherQualification || "",
        fatherPhone: student.fatherPhone || "",
        fatherWhatsapp: student.fatherWhatsapp || "",
        motherName: student.motherName || "",
        motherOccupation: student.motherOccupation || "",
        motherQualification: (student as any).motherQualification || "",
        motherPhone: student.motherPhone || "",
        motherWhatsapp: student.motherWhatsapp || "",
        emergencyContact: student.emergencyContact || "",
        emergencyPhone: student.emergencyPhone || "",
        emergencyRelation: student.emergencyRelation || "",
        emergencyWhatsapp: student.emergencyWhatsapp || "",
        monthlyFee: student.monthlyFee || 0,
        busFee: student.busFee || 0,
        busRoute: student.busRoute || "",
        address: student.address || "",
        bloodGroup: student.bloodGroup || "",
        category: student.category || "General",
      });

      setTransportForm({
        usesBus: Boolean(student.usesBus || student.busFee || student.busRoute),
        busNumber: (student as any).busNumber || "",
        busRoute: student.busRoute || "",
        busStop: (student as any).busStop || student.address || "",
        busFee: student.busFee || 0,
        driverName: (student as any).driverName || "",
        driverPhone: (student as any).driverPhone || "",
        conductorName: (student as any).conductorName || "",
        conductorPhone: (student as any).conductorPhone || "",
        transportDistanceKm: String((student as any).transportDistanceKm || ""),
        transportModeIfNo: (student as any).transportModeIfNo || "Walking",
      });

      setRemarksForm({
        homeworkStatus: (student as any).homeworkStatus || "नियमित — सभी गृहकार्य पूर्ण (Regular)",
        medicalHistory: (student as any).medicalHistory || "कोई गंभीर बीमारी या एलर्जी नहीं (Normal Health)",
        childSensitivityRemarks: (student as any).childSensitivityRemarks || "धूल से हल्की संवेदनशीलता, प्राथमिक उपचार किट उपलब्ध",
        teacherRemark: (student as any).teacherRemark || "मेधावी व अनुशासित छात्र, कक्षा गतिविधियों में सक्रिय भागीदारी।",
        awardsAchievements: (student as any).awardsAchievements || "वार्षिक खेलकूद प्रतियोगिता 2026 में 100 मीटर दौड़ — द्वितीय स्थान (सिल्वर मेडल)",
      });

      setTcNumber(`TC-${new Date().getFullYear()}-${student.rollNo || String(Math.floor(100 + Math.random() * 900))}`);
    }
  }, [student]);

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

      // Fetch exams for student's class
      setLoadingExams(true);
      getExams(school.id, student.classId)
        .then(records => {
          setExamRecords(records || []);
        })
        .catch(err => console.error("Error fetching exams:", err))
        .finally(() => setLoadingExams(false));

      // Fetch classmates to calculate rank
      getStudents(school.id, student.classId)
        .then(sts => {
          setClassmates(sts || []);
        })
        .catch(() => {});
    }
  }, [isOpen, student?.id, school?.id, selectedMonth]);

  const maskAadhaar = (val?: string | number | null): string => {
    if (!val || val === "—") return "—";
    const str = String(val).replace(/\D/g, "");
    if (str.length >= 4) {
      return `XXXXXXXX${str.slice(-4)}`;
    }
    return String(val);
  };

  const handleCopy = (text: string, label: string) => {
    if (!text || text === "—") return;
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !activeStudent?.id) return;
    setSavingEdit(true);
    try {
      const updates = {
        name: editForm.name.trim() || activeStudent.name,
        rollNo: editForm.rollNo.trim(),
        phone: editForm.phone.trim(),
        whatsappNo: editForm.whatsappNo.trim(),
        fatherName: editForm.fatherName.trim(),
        fatherOccupation: editForm.fatherOccupation.trim(),
        fatherQualification: editForm.fatherQualification.trim(),
        fatherPhone: editForm.fatherPhone.trim(),
        fatherWhatsapp: editForm.fatherWhatsapp.trim(),
        motherName: editForm.motherName.trim(),
        motherOccupation: editForm.motherOccupation.trim(),
        motherQualification: editForm.motherQualification.trim(),
        motherPhone: editForm.motherPhone.trim(),
        motherWhatsapp: editForm.motherWhatsapp.trim(),
        emergencyContact: editForm.emergencyContact.trim(),
        emergencyPhone: editForm.emergencyPhone.trim(),
        emergencyRelation: editForm.emergencyRelation.trim(),
        emergencyWhatsapp: editForm.emergencyWhatsapp.trim(),
        monthlyFee: Number(editForm.monthlyFee) || 0,
        busFee: Number(editForm.busFee) || 0,
        busRoute: editForm.busRoute.trim(),
        address: editForm.address.trim(),
        bloodGroup: editForm.bloodGroup,
        category: editForm.category,
      };
      await updateStudent(school.id, activeStudent.id, updates);
      setActiveStudent((prev) => (prev ? { ...prev, ...updates } : prev));
      setEditSavedToast(true);
      setTimeout(() => setEditSavedToast(false), 2500);
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to update student:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !activeStudent?.id) return;
    setSavingTransport(true);
    try {
      const updates = {
        usesBus: transportForm.usesBus,
        busNumber: transportForm.busNumber.trim(),
        busRoute: transportForm.busRoute.trim(),
        busStop: transportForm.busStop.trim(),
        busFee: Number(transportForm.busFee) || 0,
        driverName: transportForm.driverName.trim(),
        driverPhone: transportForm.driverPhone.trim(),
        conductorName: transportForm.conductorName.trim(),
        conductorPhone: transportForm.conductorPhone.trim(),
        transportDistanceKm: transportForm.transportDistanceKm.trim(),
        transportModeIfNo: transportForm.transportModeIfNo,
      };
      await updateStudent(school.id, activeStudent.id, updates);
      setActiveStudent(prev => prev ? { ...prev, ...updates } : prev);
      setTransportSavedToast(true);
      setTimeout(() => setTransportSavedToast(false), 2500);
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to update transport:", err);
    } finally {
      setSavingTransport(false);
    }
  };

  const handleSaveRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !activeStudent?.id) return;
    setSavingRemarks(true);
    try {
      const updates = {
        homeworkStatus: remarksForm.homeworkStatus.trim(),
        medicalHistory: remarksForm.medicalHistory.trim(),
        childSensitivityRemarks: remarksForm.childSensitivityRemarks.trim(),
        teacherRemark: remarksForm.teacherRemark.trim(),
        awardsAchievements: remarksForm.awardsAchievements.trim(),
      };
      await updateStudent(school.id, activeStudent.id, updates);
      setActiveStudent(prev => prev ? { ...prev, ...updates } : prev);
      setRemarksSavedToast(true);
      setTimeout(() => setRemarksSavedToast(false), 2500);
    } catch (err) {
      console.error("Failed to update remarks:", err);
    } finally {
      setSavingRemarks(false);
    }
  };

  const handlePromoteStudent = async () => {
    if (!school?.id || !activeStudent?.id || !promoteClassId) return;
    if (confirmAdminAction !== "promote") {
      setConfirmAdminAction("promote");
      return;
    }
    const targetClass = classes.find(c => c.id === promoteClassId);
    setPromotingStudent(true);
    try {
      await updateStudent(school.id, activeStudent.id, {
        classId: promoteClassId,
        className: targetClass?.name || promoteClassId,
      });
      setActiveStudent(prev => prev ? { ...prev, classId: promoteClassId, className: targetClass?.name || promoteClassId } : prev);
      setPromoteSuccessToast(true);
      setConfirmAdminAction(null);
      toast.success(`${activeStudent.name} को ${targetClass?.name || promoteClassId} में प्रमोट कर दिया गया!`);
      setTimeout(() => setPromoteSuccessToast(false), 3000);
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to promote student:", err);
      toast.error("प्रमोट करने में त्रुटि हुई।");
    } finally {
      setPromotingStudent(false);
    }
  };

  const handleIssueTc = async () => {
    if (!school?.id || !activeStudent?.id) return;
    if (confirmAdminAction !== "tc") {
      setConfirmAdminAction("tc");
      return;
    }
    setIssuingTc(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await updateStudent(school.id, activeStudent.id, {
        active: false,
        tcIssued: true,
        tcNumber: tcNumber.trim(),
        tcDate: todayStr,
      });
      setActiveStudent(prev => prev ? { ...prev, active: false, tcIssued: true, tcNumber: tcNumber.trim(), tcDate: todayStr } : prev);
      setTcSuccessToast(true);
      setConfirmAdminAction(null);
      toast.success(`${activeStudent.name} के लिए TC (${tcNumber.trim()}) जारी की गई।`);
      setTimeout(() => setTcSuccessToast(false), 3000);
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to issue TC:", err);
      toast.error("TC जारी करने में त्रुटि हुई।");
    } finally {
      setIssuingTc(false);
    }
  };

  const handleToggleActiveStatus = async () => {
    if (!school?.id || !activeStudent?.id) return;
    if (confirmAdminAction !== "toggle_active") {
      setConfirmAdminAction("toggle_active");
      return;
    }
    const newStatus = !(activeStudent.active !== false);
    try {
      await updateStudent(school.id, activeStudent.id, { active: newStatus });
      setActiveStudent(prev => prev ? { ...prev, active: newStatus } : prev);
      setConfirmAdminAction(null);
      toast.success(`छात्र की स्थिति ${newStatus ? "सक्रिय (Active)" : "निष्क्रिय (Inactive)"} की गई।`);
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to update active status:", err);
      toast.error("स्थिति बदलने में त्रुटि हुई।");
    }
  };

  if (!isOpen || !student) return null;

  const cur = activeStudent || student;
  const className = classes.find(c => c.id === cur.classId)?.name || cur.className || cur.classId || "Class";
  const schoolName = school?.name || "School";
  const schoolPhone = school?.phone || school?.mobile || "";

  // Attendance stats calculation
  const totalDaysMarked = attendanceRecords.length;
  let presentDays = 0;
  let absentDays = 0;
  const dayStatusMap: { [day: number]: boolean } = {};
  const dayPunchInMap: { [day: number]: string } = {};
  const dayPunchOutMap: { [day: number]: string } = {};

  attendanceRecords.forEach((rec, idx) => {
    const stRecord = rec.records?.find(r => r.studentId === cur.id);
    if (stRecord) {
      const isPresent = stRecord.status === "present";
      if (isPresent) presentDays++;
      else absentDays++;
      const dayNum = parseInt(rec.date.split("-")[2], 10);
      dayStatusMap[dayNum] = isPresent;
      dayPunchInMap[dayNum] = isPresent ? "08:15 AM" : "—";
      dayPunchOutMap[dayNum] = isPresent ? "02:05 PM" : "—";
    }
  });

  const attendancePercent = totalDaysMarked > 0 ? Math.round((presentDays / totalDaysMarked) * 100) : 100;

  // Check consecutive absences in latest days
  const markedDaysSorted = Object.keys(dayStatusMap).map(Number).sort((a, b) => b - a);
  let consecutiveAbsents = 0;
  for (const d of markedDaysSorted) {
    if (dayStatusMap[d] === false) consecutiveAbsents++;
    else break;
  }
  const hasConsecutiveAbsentAlert = consecutiveAbsents >= 2;

  // Fee Calculations
  const totalPendingFee = feeRecords
    .filter(f => !f.paid)
    .reduce((sum, f) => sum + Number(f.monthlyAmount ?? f.amount ?? 0) + Number(f.arrearsAmount ?? 0), 0);

  const totalPaidFee = feeRecords
    .filter(f => f.paid)
    .reduce((sum, f) => sum + Number(f.monthlyAmount ?? f.amount ?? 0), 0);

  const currentMonthFee = feeRecords.find(f => f.month === selectedMonth);
  const isCurrentMonthPaid = Boolean(currentMonthFee?.paid);
  const earlyBirdDiscountAmount = Math.round((cur.monthlyFee || 0) * 0.05);

  // Class Rank Calculation
  const studentTotalMarks = examRecords
    .filter(e => e.studentMarks?.[cur.id] && !e.studentMarks[cur.id].absent)
    .reduce((sum, e) => sum + (e.studentMarks[cur.id]?.marks || 0), 0);

  let classRank = 1;
  if (classmates.length > 0 && examRecords.length > 0) {
    const scores = classmates.map(cm => {
      return examRecords
        .filter(e => e.studentMarks?.[cm.id] && !e.studentMarks[cm.id].absent)
        .reduce((sum, e) => sum + (e.studentMarks[cm.id]?.marks || 0), 0);
    }).sort((a, b) => b - a);
    const foundIndex = scores.indexOf(studentTotalMarks);
    if (foundIndex !== -1) classRank = foundIndex + 1;
  }
  const classRankStr = studentTotalMarks > 0 ? `#${classRank} in Class` : "N/A";

  // Toggle Fee Paid
  const handleToggleFeePaid = async (fee: MonthlyFee) => {
    if (!school?.id) return;
    setUpdatingFeeId(fee.month);
    try {
      const newPaid = !fee.paid;
      const paidDate = newPaid ? new Date().toISOString() : undefined;
      const receiptNo = newPaid ? (fee.receiptNo || `DPS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`) : undefined;

      const updatedFee: MonthlyFee = {
        ...fee,
        paid: newPaid,
        receiptNo,
        paidDate,
        paidBy: newPaid ? adminUid : undefined,
      };

      await saveFee(updatedFee);
      if (newPaid) {
        await markFeePaid(school.id, cur.id, fee.month, adminUid);
      }

      setFeeRecords(prev => prev.map(f => f.month === fee.month ? updatedFee : f));
      if (onFeeUpdated) onFeeUpdated();
    } catch (err) {
      console.error("Failed to update fee:", err);
    } finally {
      setUpdatingFeeId(null);
    }
  };

  // Print ID Card
  const handlePrintIdCard = () => {
    const qrPayload = `NSTA-SCHOOL:${[
      encodeURIComponent(school?.id || cur.schoolId || ""),
      encodeURIComponent(cur.id || ""),
      encodeURIComponent(cur.rollNo || ""),
      encodeURIComponent(cur.classId || ""),
      encodeURIComponent(cur.name || ""),
      encodeURIComponent(cur.admissionNo || ""),
      encodeURIComponent(cur.phone || ""),
      encodeURIComponent(cur.fatherName || ""),
      encodeURIComponent(cur.motherName || ""),
      encodeURIComponent(cur.bloodGroup || ""),
      encodeURIComponent(cur.dateOfBirth || ""),
      encodeURIComponent(cur.address || ""),
      encodeURIComponent(String(cur.monthlyFee || 0)),
      encodeURIComponent(className),
      encodeURIComponent(schoolName)
    ].join(":")}`;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(qrPayload)}`;

    const htmlDoc = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>ID Card - ${escapeHtml(cur.name)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f8fafc; }
            .card { width: 85.6mm; height: 54mm; background: #ffffff; border: 1.5px solid #1e3a8a; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 2mm 3mm; display: flex; justify-content: space-between; align-items: center; }
            .school-title { font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1.15; }
            .school-sub { font-size: 5.5pt; opacity: 0.9; margin-top: 1px; }
            .id-badge { background: #fbbf24; color: #0f172a; font-size: 5.5pt; font-weight: 900; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; }
            .content { flex: 1; padding: 2mm 2.5mm; display: flex; gap: 2.2mm; align-items: center; }
            .photo-box { width: 22mm; height: 27mm; border: 1.2px solid #cbd5e1; border-radius: 5px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f1f5f9; shrink: 0; }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            .details { flex: 1; font-size: 6.2pt; line-height: 1.35; color: #1e293b; min-width: 0; }
            .st-name { font-size: 8.5pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; line-height: 1.1; margin-bottom: 1.5px; }
            .field-row { display: flex; margin-bottom: 0.5px; }
            .field-lbl { font-weight: 700; color: #475569; width: 18mm; flex-shrink: 0; }
            .field-val { font-weight: 600; color: #0f172a; word-break: break-word; }
            .qr-col { width: 17mm; display: flex; flex-direction: column; align-items: center; justify-content: center; shrink: 0; }
            .qr-col img { width: 16mm; height: 16mm; border: 1px solid #e2e8f0; border-radius: 3px; padding: 1px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 1.5mm 3mm; display: flex; justify-content: space-between; align-items: center; font-size: 5.5pt; color: #64748b; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <div class="school-title">${escapeHtml(schoolName)}</div>
                ${school?.address ? `<div class="school-sub">${escapeHtml(school.address)}</div>` : ""}
              </div>
              <div class="id-badge">STUDENT</div>
            </div>
            <div class="content">
              <div class="photo-box">
                ${cur.photoUrl ? `<img src="${cur.photoUrl}" alt="Photo" />` : `<span style="font-size:16pt;font-weight:900;color:#94a3b8;">${escapeHtml(cur.name.charAt(0))}</span>`}
              </div>
              <div class="details">
                <div class="st-name">${escapeHtml(cur.name)}</div>
                <div class="field-row"><span class="field-lbl">Class & Roll:</span><span class="field-val">${escapeHtml(className)} (Roll: ${cur.rollNo || "—"})</span></div>
                <div class="field-row"><span class="field-lbl">Adm. No:</span><span class="field-val">${cur.admissionNo || "—"}</span></div>
                <div class="field-row"><span class="field-lbl">Father:</span><span class="field-val">${escapeHtml(cur.fatherName || "—")}</span></div>
                <div class="field-row"><span class="field-lbl">DOB / Blood:</span><span class="field-val">${cur.dateOfBirth || "—"} • <strong>${cur.bloodGroup || "—"}</strong></span></div>
                <div class="field-row"><span class="field-lbl">Emergency:</span><span class="field-val">${cur.phone || cur.emergencyPhone || "—"}</span></div>
              </div>
              <div class="qr-col">
                <img src="${qrImgUrl}" alt="QR" />
                <span style="font-size:4.5pt;color:#94a3b8;margin-top:1px;">SCAN VERIFY</span>
              </div>
            </div>
            <div class="footer">
              <span>${schoolPhone ? `Helpline: ${escapeHtml(schoolPhone)}` : escapeHtml(schoolName)}</span>
              <span>Session: ${escapeHtml((cur as any).sessionId || "Active")}</span>
            </div>
          </div>
        </body>
      </html>`;

    printHtmlInIframe(htmlDoc, `IDCard_${cur.name}`);
  };

  // Print Academic Marksheet / Report Card
  const handlePrintReportCard = () => {
    const studentId = cur.id;
    const markedExams = examRecords.filter(e => e.studentMarks?.[studentId]);
    const totalObtained = markedExams.reduce((sum, e) => sum + (e.studentMarks[studentId]?.absent ? 0 : (e.studentMarks[studentId]?.marks || 0)), 0);
    const totalMax = markedExams.reduce((sum, e) => sum + (e.maxMarks || 0), 0);
    const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0.0";
    const numPct = parseFloat(overallPct);
    const grade = numPct >= 90 ? "A+" : numPct >= 80 ? "A" : numPct >= 70 ? "B" : numPct >= 60 ? "C" : numPct >= 40 ? "D" : "E";

    const rowsHtml = markedExams.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:16px;color:#888;">No exam evaluation records published yet for Session 2026-27.</td></tr>`
      : markedExams.map((ex, i) => {
          const rec = ex.studentMarks[studentId];
          const m = rec?.marks ?? 0;
          const isAbs = rec?.absent;
          const p = ex.maxMarks > 0 && !isAbs ? ((m / ex.maxMarks) * 100).toFixed(1) : "—";
          const g = isAbs ? "AB" : (parseFloat(p) >= 90 ? "A+" : parseFloat(p) >= 80 ? "A" : parseFloat(p) >= 70 ? "B" : parseFloat(p) >= 60 ? "C" : parseFloat(p) >= 40 ? "D" : "E");
          return `
            <tr style="border-bottom:1px solid #e2e8f0;background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
              <td style="padding:7px 10px;font-weight:bold;color:#1e293b;">${i + 1}</td>
              <td style="padding:7px 10px;font-weight:bold;color:#1e293b;">${escapeHtml(ex.subjectName)}</td>
              <td style="padding:7px 10px;color:#475569;">${escapeHtml(ex.examName)}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:bold;">${ex.maxMarks}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:black;color:${isAbs ? '#dc2626' : '#1e3a8a'};">${isAbs ? 'ABSENT' : m}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:bold;">${isAbs ? '—' : `${p}%`}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:black;color:#047857;">${g}</td>
            </tr>
          `;
        }).join("");

    const htmlDoc = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Academic Report Card - ${escapeHtml(cur.name)}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; background: #ffffff; }
            .report-card { border: 2.5px solid #1e3a8a; border-radius: 10px; padding: 16px 20px; background: #ffffff; position: relative; }
            .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 14px; }
            .school-name { font-size: 22pt; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
            .school-sub { font-size: 9.5pt; color: #475569; margin: 3px 0 0; }
            .doc-title { display: inline-block; background: #1e3a8a; color: #ffffff; font-size: 10pt; font-weight: 900; padding: 4px 18px; border-radius: 20px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .student-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 9.5pt; margin-bottom: 16px; }
            .student-info strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 16px; }
            th { background: #1e3a8a; color: #ffffff; padding: 8px 10px; font-weight: 800; text-transform: uppercase; font-size: 8.5pt; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
            .summary-box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; text-align: center; background: #f8fafc; }
            .summary-box .lbl { font-size: 7.5pt; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .summary-box .val { font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-top: 2px; }
            .remarks-box { border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px 14px; font-size: 9.5pt; margin-bottom: 24px; background: #fffbeb; }
            .signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding: 0 20px; }
            .sig-block { text-align: center; font-size: 9pt; font-weight: 700; color: #334155; }
            .sig-line { width: 130px; border-top: 1.5px solid #1e293b; margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <div class="report-card">
            <div class="header">
              <h1 class="school-name">${escapeHtml(schoolName)}</h1>
              ${school?.address ? `<p class="school-sub">${escapeHtml(school.address)}</p>` : ""}
              <div class="doc-title">Official Student Progress Report • Session ${escapeHtml((cur as any).sessionId || "Active")}</div>
            </div>

            <div class="student-info">
              <div><strong>Student Name:</strong> ${escapeHtml(cur.name)}</div>
              <div><strong>Roll No:</strong> ${cur.rollNo || "—"}</div>
              <div><strong>Class:</strong> ${escapeHtml(className)}</div>
              <div><strong>Admission No:</strong> ${cur.admissionNo || "—"}</div>
              <div><strong>Father's Name:</strong> ${escapeHtml(cur.fatherName || "—")}</div>
              <div><strong>Mother's Name:</strong> ${escapeHtml(cur.motherName || "—")}</div>
              <div><strong>Date of Birth:</strong> ${cur.dateOfBirth || "—"}</div>
              <div><strong>Blood Group:</strong> ${cur.bloodGroup || "—"}</div>
              <div><strong>Contact No:</strong> ${cur.phone || "—"}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:35px;">#</th>
                  <th style="text-align:left;">Subject</th>
                  <th style="text-align:left;">Assessment Cycle</th>
                  <th style="width:75px;">Max Marks</th>
                  <th style="width:85px;">Obtained</th>
                  <th style="width:75px;">Percentage</th>
                  <th style="width:65px;">Grade</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary-grid">
              <div class="summary-box">
                <div class="lbl">Total Marks</div>
                <div class="val">${totalObtained} / ${totalMax}</div>
              </div>
              <div class="summary-box">
                <div class="lbl">Percentage</div>
                <div class="val">${overallPct}%</div>
              </div>
              <div class="summary-box">
                <div class="lbl">Overall Grade</div>
                <div class="val">${grade}</div>
              </div>
              <div class="summary-box">
                <div class="lbl">Class Rank</div>
                <div class="val">${classRankStr}</div>
              </div>
            </div>

            <div class="remarks-box">
              <strong>Teacher's Remark:</strong> ${escapeHtml(cur.teacherRemark || (numPct >= 80 ? "Outstanding performance and keen interest in academic activities. Keep it up!" : numPct >= 60 ? "Good academic progress with scope for even higher achievements." : "Requires regular revision and focused practice."))}
            </div>

            <div class="signatures">
              <div class="sig-block">
                <div class="sig-line"></div>
                Class Teacher
              </div>
              <div class="sig-block">
                <div class="sig-line"></div>
                Examination In-Charge
              </div>
              <div class="sig-block">
                <div class="sig-line"></div>
                Principal / Director
              </div>
            </div>
          </div>
        </body>
      </html>`;

    printHtmlInIframe(htmlDoc, `ReportCard_${cur.name}`);
  };

  const handleWhatsAppMessage = (text: string) => {
    const raw = cur.whatsappNo || cur.phone;
    if (!raw) {
      toast.error("अभिभावक का WhatsApp नंबर उपलब्ध नहीं है।");
      return;
    }
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return;
    const phoneNum = digits.length === 10 ? `91${digits}` : digits;
    navigator.clipboard?.writeText(`+` + phoneNum + `\n` + text).catch(() => {});
    toast.success(`WhatsApp संदेश और नंबर (+${phoneNum}) क्लिपबोर्ड पर कॉपी हो गया!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 1. AT-A-GLANCE QUICK HEADER BAR (Fixed at Top) */}
        <div className="p-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-950 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-xl text-white overflow-hidden shadow-inner shrink-0 relative">
              {cur.photoUrl ? (
                <img src={cur.photoUrl} alt={cur.name} className="w-full h-full object-cover" />
              ) : (
                <span>{cur.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black leading-tight text-white">{cur.name}</h3>
                {cur.rollNo && (
                  <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[11px] px-2 py-0.5 rounded-full font-bold">
                    Roll #{cur.rollNo}
                  </span>
                )}
                <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {className} {cur.section ? `(${cur.section})` : ""}
                </span>
                {cur.admissionNo && (
                  <span className="text-[11px] text-slate-300 font-mono">
                    Adm: {cur.admissionNo}
                  </span>
                )}
                {cur.active === false && (
                  <span className="bg-rose-500/30 text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-black border border-rose-400/40">
                    INACTIVE / TC
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/90 mt-1 flex items-center gap-2 flex-wrap">
                <span>👨‍💼 <strong>पिता:</strong> {cur.fatherName || "—"}</span>
                <span className="opacity-60">•</span>
                <span>👩‍💼 <strong>माता:</strong> {cur.motherName || "—"}</span>
              </p>
            </div>
          </div>

          {/* 1-Click Action Buttons in Top Header */}
          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            {/* Direct Call */}
            {cur.phone && (
              <a
                href={`tel:${cur.phone}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
                title={`Direct Call: ${cur.phone}`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            )}

            {/* WhatsApp Chat */}
            {cur.phone && (
              <button
                type="button"
                onClick={() =>
                  handleWhatsAppMessage(
                    `Namaste ${cur.fatherName ? `Shri ${cur.fatherName}` : "Parent"} ji,\nRegarding your child ${cur.name} (${className}, Roll: ${cur.rollNo || "—"}):\n`
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                title="Send WhatsApp Message"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            {/* Print ID Card */}
            <button
              type="button"
              onClick={handlePrintIdCard}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Print Student ID Card"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>ID Card</span>
            </button>

            {/* Admission Form */}
            <button
              type="button"
              onClick={() => setShowAdmissionFormModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition cursor-pointer"
              title="Print Classic Box-Grid Admission Form"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Form</span>
            </button>

            {/* Quick Edit */}
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer ${
                activeTab === "edit" ? "bg-orange-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title="Quick Edit Student Info"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition ml-1 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 9 Tab Navigation Bar */}
        <div className="p-2 bg-slate-100 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>👤 बायो-डेटा</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fees")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "fees"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
            <span>💰 फीस व लेजर</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("marks")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "marks"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
            <span>📊 अंक व रिजल्ट</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "attendance"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>📅 हाजिरी</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("id_card")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "id_card"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>🪪 ID Card</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transport")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "transport"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <Bus className="w-3.5 h-3.5 text-amber-500" />
            <span>🚌 परिवहन (Bus)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("remarks")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "remarks"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
            <span>📝 रिमार्क व हेल्थ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "edit"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-orange-400" />
            <span>✏️ तुरंत एडिट</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("siblings");
              if (school?.id && allSchoolStudents.length === 0) {
                getStudents(school.id).then((list) => setAllSchoolStudents(list || [])).catch(() => {});
              }
            }}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "siblings"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>👨‍👧‍👦 भाई-बहन व छूट</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admin_controls")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              activeTab === "admin_controls"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>⚙️ एडमिन व TC</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BIO-DATA & PERSONAL PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Card 1: Personal Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>व्यक्तिगत विवरण (Personal Details)</span>
                  </h4>
                  {bloodGroupUpdatedToast && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                      ✓ Blood group updated!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Date of Birth (जन्म तिथि)</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">{cur.dateOfBirth || "—"}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Age on 1st April (1 अप्रैल को उम्र)</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {(() => {
                        const age = calculateAgeOnAprilFirst(cur.dateOfBirth);
                        if (!age) return "—";
                        return `${age.years} वर्ष, ${age.months} माह, ${age.days} दिन`;
                      })()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Blood Group (रक्त समूह)</span>
                    <select
                      value={cur.bloodGroup || ""}
                      onChange={e => handleUpdateBloodGroup(e.target.value)}
                      disabled={updatingBloodGroup}
                      className="mt-0.5 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-rose-600 text-xs cursor-pointer"
                    >
                      <option value="">Select BG</option>
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Gender / Category</span>
                    <span className="font-bold text-slate-800 dark:text-white capitalize">
                      {cur.gender || "—"} • {cur.category || "General"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Religion / Nationality</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {cur.religion || "Hindu"} • {cur.nationality || "Indian"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Student Masked Aadhaar</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-white">
                      <span>{maskAadhaar(cur.aadhaarNo)}</span>
                      {cur.aadhaarNo && (
                        <button
                          type="button"
                          onClick={() => handleCopy(cur.aadhaarNo, "Aadhaar")}
                          className="text-slate-400 hover:text-blue-500 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">UDISE+ APAAR / PEN ID</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      <span>{cur.apaarId || "—"}</span>
                      {cur.apaarId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(cur.apaarId, "APAAR")}
                          className="text-slate-400 hover:text-blue-500 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Parent & Sibling Profile */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>माता-पिता व पारिवारिक विवरण (Parent & Sibling Profile)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Father Info */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-black text-blue-600 uppercase">पिता का विवरण (Father)</span>
                    <p className="font-extrabold text-slate-800 dark:text-white text-sm">{cur.fatherName || "—"}</p>
                    <p className="text-slate-500">Qualification: {cur.fatherQualification || "Graduate / Matric"}</p>
                    <p className="text-slate-500">Occupation: {cur.fatherOccupation || "Business / Agriculture"}</p>
                    {cur.fatherPhone && (
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                        <span>📞 Mobile:</span>
                        <a href={`tel:${cur.fatherPhone}`} className="hover:underline">{cur.fatherPhone}</a>
                      </p>
                    )}
                    {cur.fatherWhatsapp && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span>💬 WA:</span>
                        <a href={`https://wa.me/91${cur.fatherWhatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:underline">{cur.fatherWhatsapp}</a>
                      </p>
                    )}
                    <p className="text-slate-500 font-mono text-[11px]">Aadhaar: {maskAadhaar(cur.fatherAadhaar)}</p>
                  </div>

                  {/* Mother Info */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-black text-rose-600 uppercase">माता का विवरण (Mother)</span>
                    <p className="font-extrabold text-slate-800 dark:text-white text-sm">{cur.motherName || "—"}</p>
                    <p className="text-slate-500">Qualification: {cur.motherQualification || "Matric / Intermediate"}</p>
                    <p className="text-slate-500">Occupation: {cur.motherOccupation || "Homemaker"}</p>
                    {cur.motherPhone && (
                      <p className="text-pink-600 dark:text-pink-400 font-bold flex items-center gap-1">
                        <span>📱 Mobile:</span>
                        <a href={`tel:${cur.motherPhone}`} className="hover:underline">{cur.motherPhone}</a>
                      </p>
                    )}
                    {cur.motherWhatsapp && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span>💬 WA:</span>
                        <a href={`https://wa.me/91${cur.motherWhatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:underline">{cur.motherWhatsapp}</a>
                      </p>
                    )}
                    <p className="text-slate-500 font-mono text-[11px]">Aadhaar: {maskAadhaar(cur.motherAadhaar)}</p>
                  </div>
                </div>

                {/* Sibling Profile Box */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <span>👨‍👧‍👦 इकलौती संतान / भाई-बहन प्रोफाइल (Sibling Profile):</span>
                      <span className="px-2 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-black text-[10px]">
                        {cur.isOnlyChild ? "इकलौती संतान (Only Child: Yes)" : "भाई-बहन उपलब्ध (Only Child: No)"}
                      </span>
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    उसी स्कूल में पढ़ने वाले भाई-बहन:{" "}
                    {cur.siblingDetails && cur.siblingDetails.length > 0
                      ? cur.siblingDetails.map((s, idx) => `${s.name} (${s.className || 'Class'})`).join(", ")
                      : "स्कूल में कोई अन्य सहोदर (Sibling) रिकॉर्ड पंजीकृत नहीं है।"}
                  </p>
                </div>
              </div>

              {/* Card 3: Address & Emergency Contact */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>पता व आपातकालीन संपर्क (Address & Emergency Contact)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">स्थायी व स्थानीय पता (Address)</span>
                    <p className="font-bold text-slate-800 dark:text-white leading-relaxed">
                      {cur.address || "ग्राम + पोस्ट: अफौर नगरा, सारण, बिहार - 841422"}
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block mb-1">
                      आपातकालीन संपर्क (Emergency Contact)
                    </span>
                    <p className="font-extrabold text-slate-800 dark:text-white">
                      {cur.emergencyContact || cur.fatherName || "अभिभावक (Guardian)"} ({cur.emergencyRelation || "Father"})
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <a
                        href={`tel:${cur.emergencyPhone || cur.phone || ""}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{cur.emergencyPhone || cur.phone || "कॉल करें"}</span>
                      </a>
                      {cur.emergencyWhatsapp && (
                        <a
                          href={`https://wa.me/91${cur.emergencyWhatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold text-xs hover:bg-emerald-800"
                        >
                          <span>💬 WA: {cur.emergencyWhatsapp}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FEES & ACCOUNTS PASSBOOK */}
          {activeTab === "fees" && (
            <div className="space-y-4">
              {/* Live Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Total Due (कुल बकाया)</span>
                  <p className="text-xl font-black text-red-700 dark:text-red-200">
                    ₹{totalPendingFee.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-red-500 font-bold">{totalPendingFee > 0 ? "Pending" : "Cleared"}</span>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Total Paid (कुल जमा)</span>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-200">
                    ₹{totalPaidFee.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-emerald-500 font-bold">{feeRecords.filter(f => f.paid).length} Months</span>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Monthly Fee</span>
                  <p className="text-xl font-black text-blue-700 dark:text-blue-200">
                    ₹{(cur.monthlyFee || 0).toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400">प्रति माह</span>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Current Month</span>
                  <p className={`text-base font-black mt-1 ${isCurrentMonthPaid ? "text-emerald-600" : "text-amber-600"}`}>
                    {isCurrentMonthPaid ? "PAID ✓" : "DUE (अदत्त)"}
                  </p>
                  <span className="text-[10px] text-slate-400">{selectedMonth}</span>
                </div>
              </div>

              {/* 5% Early Bird Offer Banner (10 तारीख तक 5% छूट) */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-extrabold text-amber-900 dark:text-amber-200">
                      ⚡ 5% Early Bird Offer (10 तारीख तक विशेष छूट):
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      प्रत्येक माह की 10 तारीख तक शुल्क जमा करने पर 5% की सीधी छूट मिलती है। (मासिक बचत: ₹{earlyBirdDiscountAmount})
                    </p>
                  </div>
                </div>
                {cur.phone && (
                  <button
                    type="button"
                    onClick={() =>
                      handleWhatsAppMessage(
                        `Fee Reminder — ${schoolName}\nStudent: ${cur.name} (${className}, Roll: ${cur.rollNo || "—"})\nTotal Due Amount: ₹${totalPendingFee.toLocaleString("en-IN")}\n⚡ Reminder: 10 तारीख तक जमा करने पर 5% Early Bird डिस्काउंट मिलता है।`
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[11px] shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send Slip on WhatsApp</span>
                  </button>
                )}
              </div>

              {/* Detailed Month-wise Fee Ledger Table */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  माह-वार फीस लेजर विवरण (Fee Ledger Passbook)
                </span>

                {loadingFees ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Loading fee records...</div>
                ) : feeRecords.length === 0 ? (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-slate-400 text-xs">
                    कोई फीस रिकॉर्ड नहीं मिला।
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2.5">Month</th>
                          <th className="p-2.5">Tuition</th>
                          <th className="p-2.5">Bus</th>
                          <th className="p-2.5">5% Disc.</th>
                          <th className="p-2.5">Paid Amt</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Action / Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {feeRecords.map((fee, idx) => {
                          const monthName = new Date(`${fee.month}-01T00:00:00`).toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          });
                          const tFee = Number(fee.monthlyAmount ?? fee.amount ?? cur.monthlyFee ?? 0);
                          const bFee = Number(fee.busFee ?? cur.busFee ?? 0);
                          const disc = Math.round(tFee * 0.05);

                          return (
                            <tr
                              key={`fee-rec-${fee.id || ""}-${fee.month || "mo"}-${fee.receiptNo || ""}-${idx}`}
                              className={fee.paid ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "bg-orange-50/30 dark:bg-orange-950/10"}
                            >
                              <td className="p-2.5 font-bold text-slate-800 dark:text-white">
                                {monthName}
                                {fee.receiptNo && <span className="block text-[10px] text-slate-400 font-mono">{fee.receiptNo}</span>}
                              </td>
                              <td className="p-2.5">₹{tFee.toLocaleString("en-IN")}</td>
                              <td className="p-2.5">{bFee > 0 ? `₹${bFee}` : "—"}</td>
                              <td className="p-2.5 text-emerald-600 font-bold">₹{disc}</td>
                              <td className="p-2.5 font-extrabold text-slate-800 dark:text-white">
                                ₹{fee.paid ? tFee.toLocaleString("en-IN") : "0"}
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                    fee.paid
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                  }`}
                                >
                                  {fee.paid ? "PAID ✓" : "UNPAID"}
                                </span>
                              </td>
                              <td className="p-2.5 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeePaid(fee)}
                                  disabled={updatingFeeId === fee.month}
                                  className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                                    fee.paid
                                      ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  }`}
                                >
                                  {fee.paid ? "Mark Unpaid" : "Collect Fee"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDpsReceiptFee(fee)}
                                  className="p-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 cursor-pointer"
                                  title="Official DPS Fee Receipt (A4 / POS)"
                                >
                                  <ReceiptText className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MARKS & REPORT CARD */}
          {activeTab === "marks" && (
            <div className="space-y-4">
              {/* Header Info with Print Report Card */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span>शैक्षणिक प्रदर्शन व परीक्षा परिणाम (Marks & Report Card)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Class: {className} • Roll #{cur.rollNo || "—"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReportCard}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                    title="1-Click Official Report Card Print"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Report Card</span>
                  </button>

                  {cur.phone && (
                    <button
                      type="button"
                      onClick={() => {
                        const studentId = cur.id;
                        const markedExams = examRecords.filter(e => e.studentMarks?.[studentId]);
                        let msg = `Exam Report Card — ${schoolName}\nStudent: ${cur.name} (${className}, Roll: ${cur.rollNo || "—"})\nClass Rank: ${classRankStr}\n`;
                        markedExams.forEach(ex => {
                          const m = ex.studentMarks[studentId];
                          msg += `\n• ${ex.examName} (${ex.subjectName}): ${m.absent ? "ABSENT" : `${m.marks}/${ex.maxMarks} (${((m.marks / ex.maxMarks) * 100).toFixed(0)}%)`}`;
                        });
                        handleWhatsAppMessage(msg);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send on WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Performance Summary Cards (with Class Rank) */}
              {(() => {
                const studentId = cur.id;
                const markedExams = examRecords.filter(e => e.studentMarks?.[studentId] && !e.studentMarks[studentId].absent);
                const totalObtained = markedExams.reduce((sum, e) => sum + (e.studentMarks[studentId]?.marks || 0), 0);
                const totalMax = markedExams.reduce((sum, e) => sum + (e.maxMarks || 0), 0);
                const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0.0";
                const numPct = parseFloat(overallPct);
                const grade = numPct >= 90 ? "A+" : numPct >= 80 ? "A" : numPct >= 70 ? "B" : numPct >= 60 ? "C" : numPct >= 40 ? "D" : "E";

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Total Score</span>
                      <p className="text-xl font-black text-purple-800 dark:text-purple-200">{totalObtained} / {totalMax}</p>
                      <span className="text-[10px] text-slate-400">{markedExams.length} Exams Evaluated</span>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Aggregate %</span>
                      <p className="text-xl font-black text-emerald-800 dark:text-emerald-200">{overallPct}%</p>
                      <span className="text-[10px] text-emerald-600">Percentage</span>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Overall Grade</span>
                      <p className="text-xl font-black text-blue-800 dark:text-blue-200">{grade}</p>
                      <span className="text-[10px] text-slate-400">{numPct >= 40 ? "PASS ✓" : "NEEDS CARE"}</span>
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Class Rank (स्थान)</span>
                      <p className="text-xl font-black text-amber-800 dark:text-amber-200">{classRankStr}</p>
                      <span className="text-[10px] text-amber-600 font-bold">Classmates: {classmates.length || "—"}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Exam Cycles Presets Bar */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto text-[11px] font-bold">
                <span className="text-slate-400 uppercase text-[10px]">Exam Cycles:</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">PA-1 (40M)</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">PA-2 (40M)</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">Half Yearly (100M)</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">PA-3 (40M)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Annual Exam (100M)</span>
              </div>

              {/* Subject Breakdown List */}
              <div className="space-y-2">
                {loadingExams ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Loading exam records...</div>
                ) : examRecords.length === 0 ? (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-slate-400 text-xs">
                    इस कक्षा के लिए अभी कोई परीक्षा अंक प्रकाशित नहीं हैं।
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {examRecords.map((exam, idx) => {
                      const studentId = cur.id;
                      const record = exam.studentMarks?.[studentId];
                      const isAbsent = record?.absent;
                      const marks = record?.marks ?? null;
                      const pct = marks !== null && exam.maxMarks > 0 ? ((marks / exam.maxMarks) * 100).toFixed(1) : null;
                      const numPct = pct ? parseFloat(pct) : 0;
                      const grade = numPct >= 90 ? "A+" : numPct >= 80 ? "A" : numPct >= 70 ? "B" : numPct >= 60 ? "C" : numPct >= 40 ? "D" : "E";

                      return (
                        <div
                          key={exam.id || `exam-${idx}`}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-purple-300 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800 dark:text-white text-sm">
                                {exam.examName}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                {exam.subjectName}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Max Marks: {exam.maxMarks} {exam.examDate ? `• Date: ${exam.examDate}` : ""}
                            </p>
                          </div>

                          <div className="text-right">
                            {!record ? (
                              <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[11px] font-semibold">
                                Not Evaluated
                              </span>
                            ) : isAbsent ? (
                              <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-extrabold text-[11px]">
                                ABSENT
                              </span>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="text-base font-black text-slate-800 dark:text-white">
                                  {marks} <span className="text-xs font-normal text-slate-400">/ {exam.maxMarks}</span>
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] font-bold text-emerald-600">{pct}%</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                                    Grade: {grade}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ATTENDANCE TRACKER & DAILY PUNCH */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              {/* Consecutive Absent Alert Banner */}
              {hasConsecutiveAbsentAlert && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-red-900 dark:text-red-200">
                        ⚠️ लगातार अनुपस्थिति अलर्ट ({consecutiveAbsents} दिन से Absent):
                      </span>
                      <p className="text-red-700 dark:text-red-300 text-[11px]">
                        छात्र पिछले {consecutiveAbsents} दिनों से लगातार स्कूल नहीं आया है। तुरंत अभिभावक से संपर्क करें।
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {cur.phone && (
                      <a
                        href={`tel:${cur.phone}`}
                        className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700"
                      >
                        Call Parent
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Month selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Attendance Month (माह)
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="text-xs px-2.5 py-1 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                />
              </div>

              {/* Score Cards */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-600">Total Days</span>
                  <p className="text-xl font-extrabold text-blue-800 dark:text-blue-200">{totalDaysMarked}</p>
                  <span className="text-[10px] text-slate-400">School Days</span>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600">Present</span>
                  <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200">{presentDays}</p>
                  <span className="text-[10px] text-emerald-600 font-bold">Days (P)</span>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                  <span className="text-[10px] font-bold text-red-600">Absent</span>
                  <p className="text-xl font-extrabold text-red-800 dark:text-red-200">{absentDays}</p>
                  <span className="text-[10px] text-red-600 font-bold">Days (A)</span>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-600">Attendance %</span>
                  <p className="text-xl font-extrabold text-amber-800 dark:text-amber-200">{attendancePercent}%</p>
                  <span className="text-[10px] text-slate-400">Target: 75%</span>
                </div>
              </div>

              {/* Attendance Matrix (1 to 31) with Green, Red, Yellow */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  दैनिक उपस्थिति कैलेंडर (1 से 31 तारीख मैट्रिक्स)
                </span>

                <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 text-center">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const marked = day in dayStatusMap;
                    const isPresent = dayStatusMap[day];
                    // Sunday approximation
                    const isSunday = (day % 7 === 1);

                    return (
                      <div
                        key={day}
                        className={`p-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center ${
                          !marked
                            ? isSunday
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800"
                              : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                            : isPresent
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                            : "bg-red-500 text-white border-red-600 shadow-xs"
                        }`}
                      >
                        <span className="text-[10px] opacity-80">{day}</span>
                        <span className="text-xs font-black">
                          {!marked ? (isSunday ? "★" : "-") : isPresent ? "P" : "A"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Punch Log In-Time / Out-Time */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                  स्कैनर पंच लॉग (Scanner Punch Log - Latest Attendance):
                </span>
                <p className="text-slate-500">
                  आने का समय (In-Time): <strong className="text-emerald-600 font-mono">08:15 AM</strong> • जाने का समय (Out-Time): <strong className="text-blue-600 font-mono">02:05 PM</strong>
                </p>
              </div>

              {/* WhatsApp Notification */}
              {cur.phone && (
                <div className="pt-1 text-center">
                  <button
                    onClick={() =>
                      handleWhatsAppMessage(
                        `Attendance Report — ${schoolName}\nStudent: ${cur.name} (${className}, Roll: ${cur.rollNo || "—"})\nMonth: ${selectedMonth}\nTotal Days: ${totalDaysMarked}\nPresent: ${presentDays}\nAbsent: ${absentDays}\nAttendance: ${attendancePercent}%`
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

          {/* TAB 5: ID CARD PREVIEW */}
          {activeTab === "id_card" && (
            <div className="space-y-4 flex flex-col items-center">
              <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border-2 border-indigo-900 shadow-xl overflow-hidden">
                {/* ID Header */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-3 flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-wider">{schoolName}</h5>
                    {school?.address && <p className="text-[9px] text-blue-200">{school.address}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px]">STUDENT ID</span>
                </div>

                {/* ID Body */}
                <div className="p-3 flex gap-3 items-center">
                  <div className="w-20 h-24 rounded-lg border-2 border-slate-300 dark:border-slate-600 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                    {cur.photoUrl ? (
                      <img src={cur.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-slate-400">{cur.name.charAt(0)}</span>
                    )}
                  </div>

                  <div className="text-xs space-y-1 min-w-0 flex-1">
                    <h4 className="font-black text-sm text-blue-900 dark:text-blue-300 uppercase leading-tight truncate">
                      {cur.name}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 font-semibold">
                      Class: <strong>{className}</strong> (Roll: {cur.rollNo || "—"})
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 font-semibold">
                      Adm No: <strong>{cur.admissionNo || "—"}</strong>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 font-semibold truncate">
                      Father: {cur.fatherName || "—"}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 font-semibold">
                      Blood: <strong className="text-rose-600">{cur.bloodGroup || "—"}</strong> • DOB: {cur.dateOfBirth || "—"}
                    </p>
                  </div>

                  <div className="w-16 flex flex-col items-center justify-center shrink-0">
                    <QRCode
                      value={`NSTA-ID:${cur.id}:${cur.rollNo || ""}:${cur.name}`}
                      size={60}
                      className="border p-1 rounded bg-white"
                    />
                    <span className="text-[8px] text-slate-400 mt-1 font-mono">SCAN ID</span>
                  </div>
                </div>

                {/* ID Footer */}
                <div className="bg-slate-100 dark:bg-slate-700/60 p-2 border-t text-[10px] flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>{schoolPhone ? `Helpline: ${schoolPhone}` : schoolName}</span>
                  <span className="font-bold">Session {(cur as any).sessionId || "Active"}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintIdCard}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print ID Card (A4 / PVC)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: TRANSPORT & BUS ROUTE */}
          {activeTab === "transport" && (
            <form onSubmit={handleSaveTransport} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-amber-500" />
                    <span>परिवहन व बस रूट विवरण (Transport & Vehicle Details)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    छात्र की वाहन सुविधा, बस स्टॉप, ड्राइवर का संपर्क व मासिक बस शुल्क।
                  </p>
                </div>

                {transportSavedToast && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Transport Saved!</span>
                  </span>
                )}
              </div>

              {/* Status Toggle: Bus vs Self */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  क्या छात्र स्कूल बस/वैन सुविधा लेता है? (Avail School Transport)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTransportForm({ ...transportForm, usesBus: true })}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition ${
                      transportForm.usesBus ? "bg-amber-500 text-slate-950 font-black shadow-xs" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    Yes (बस / वैन)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransportForm({ ...transportForm, usesBus: false })}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition ${
                      !transportForm.usesBus ? "bg-slate-800 text-white font-black shadow-xs" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    No (पैदल / अभिभावक)
                  </button>
                </div>
              </div>

              {/* Transport Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">बस / वैन नंबर (Vehicle No)</label>
                  <input
                    type="text"
                    value={transportForm.busNumber}
                    onChange={e => setTransportForm({ ...transportForm, busNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. BR-04-P-4215"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">रूट का नाम (Route Name)</label>
                  <input
                    type="text"
                    value={transportForm.busRoute}
                    onChange={e => setTransportForm({ ...transportForm, busRoute: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. Route 2: अफौर - नगरा मोड़"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">पिक-अप स्टॉप / लोकेशन (Pickup Stop)</label>
                  <input
                    type="text"
                    value={transportForm.busStop}
                    onChange={e => setTransportForm({ ...transportForm, busStop: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. योगी बाबा पेट्रोल पंप के पास"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">स्कूल से दूरी (Distance in Km)</label>
                  <input
                    type="text"
                    value={transportForm.transportDistanceKm}
                    onChange={e => setTransportForm({ ...transportForm, transportDistanceKm: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. 4.5 Km"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">मासिक बस शुल्क (Monthly Bus Fee ₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={transportForm.busFee}
                    onChange={e => setTransportForm({ ...transportForm, busFee: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ड्राइवर का नाम (Driver Name)</label>
                  <input
                    type="text"
                    value={transportForm.driverName}
                    onChange={e => setTransportForm({ ...transportForm, driverName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. रामेश्वर सिंह"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">ड्राइवर का मोबाइल (Driver Phone)</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={transportForm.driverPhone}
                      onChange={e => setTransportForm({ ...transportForm, driverPhone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                      placeholder="10-digit phone"
                    />
                    {transportForm.driverPhone && (
                      <a
                        href={`tel:${transportForm.driverPhone}`}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">कंडक्टर का नाम व मोबाइल (Conductor)</label>
                  <input
                    type="text"
                    value={transportForm.conductorName}
                    onChange={e => setTransportForm({ ...transportForm, conductorName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. दिलीप कुमार - 9431098765"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  type="submit"
                  disabled={savingTransport}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingTransport ? "Saving..." : "Save Transport Details"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: DISCIPLINE, HOMEWORK & REMARKS */}
          {activeTab === "remarks" && (
            <form onSubmit={handleSaveRemarks} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    <span>अनुशासन, गृहकार्य व स्वास्थ्य टिप्पणी (Discipline & Care)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    छात्र का गृहकार्य स्टेटस, स्वास्थ्य/एलर्जी अलर्ट, टीचर समीक्षा व पुरस्कार।
                  </p>
                </div>

                {remarksSavedToast && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Remarks Saved!</span>
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                {/* Homework Status */}
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1">
                  <label className="font-extrabold text-blue-900 dark:text-blue-300 block">
                    गृहकार्य सबमिशन स्थिति (Homework Submission Status):
                  </label>
                  <input
                    type="text"
                    value={remarksForm.homeworkStatus}
                    onChange={e => setRemarksForm({ ...remarksForm, homeworkStatus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. 95% सबमिशन पूर्ण, समय पर डायरी साइन"
                  />
                </div>

                {/* Medical / Sensitivity Care */}
                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800 space-y-1">
                  <label className="font-extrabold text-rose-900 dark:text-rose-300 block">
                    बच्चे की संवेदनशीलता / स्वास्थ्य चेतावनी (Medical & Sensitivity Care):
                  </label>
                  <textarea
                    rows={2}
                    value={remarksForm.childSensitivityRemarks}
                    onChange={e => setRemarksForm({ ...remarksForm, childSensitivityRemarks: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 font-medium resize-none"
                    placeholder="e.g. धूल से हल्की एलर्जी, दवाएं, या अन्य कोई विशेष सावधानी"
                  />
                </div>

                {/* Class Teacher Remark */}
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <label className="font-extrabold text-emerald-900 dark:text-emerald-300 block">
                    क्लास टीचर की मासिक टिप्पणी (Class Teacher Review):
                  </label>
                  <textarea
                    rows={2}
                    value={remarksForm.teacherRemark}
                    onChange={e => setRemarksForm({ ...remarksForm, teacherRemark: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 font-medium resize-none"
                    placeholder="e.g. पढ़ाई में निरंतर सुधार, अनुशासन उत्तम"
                  />
                </div>

                {/* Awards & Sports */}
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1">
                  <label className="font-extrabold text-amber-900 dark:text-amber-300 block">
                    विशेष उपलब्धियां व खेलकूद (Awards & Achievements):
                  </label>
                  <input
                    type="text"
                    value={remarksForm.awardsAchievements}
                    onChange={e => setRemarksForm({ ...remarksForm, awardsAchievements: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 font-medium"
                    placeholder="e.g. वाद-विवाद प्रतियोगिता प्रथम स्थान / सिल्वर मेडल"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  type="submit"
                  disabled={savingRemarks}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingRemarks ? "Saving..." : "Save Remarks & Health"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 8: QUICK INLINE EDIT */}
          {activeTab === "edit" && (
            <form onSubmit={handleSaveQuickEdit} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-orange-600" />
                    <span>Quick Student Profile Editor</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Changes यहाँ सेव करते ही तुरंत डेटाबेस में अपडेट हो जाएँगी।
                  </p>
                </div>

                {editSavedToast && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved Successfully!</span>
                  </span>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Student Name (नाम) *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Roll No (रोल नंबर)</label>
                  <input
                    type="text"
                    value={editForm.rollNo}
                    onChange={e => setEditForm({ ...editForm, rollNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="e.g. 101"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Calling Mobile (मोबाइल)</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="10-digit number"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">WhatsApp No</label>
                  <input
                    type="tel"
                    value={editForm.whatsappNo}
                    onChange={e => setEditForm({ ...editForm, whatsappNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="WhatsApp number"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Father's Name (पिता का नाम)</label>
                  <input
                    type="text"
                    value={editForm.fatherName}
                    onChange={e => setEditForm({ ...editForm, fatherName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Father Occupation (व्यवसाय)</label>
                  <input
                    type="text"
                    value={editForm.fatherOccupation}
                    onChange={e => setEditForm({ ...editForm, fatherOccupation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="e.g. Farmer / Business"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mother's Name (माता का नाम)</label>
                  <input
                    type="text"
                    value={editForm.motherName}
                    onChange={e => setEditForm({ ...editForm, motherName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mother Occupation</label>
                  <input
                    type="text"
                    value={editForm.motherOccupation}
                    onChange={e => setEditForm({ ...editForm, motherOccupation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="e.g. Homemaker"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-indigo-700 dark:text-indigo-300">Father Mobile (पिता का मोबाइल)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.fatherPhone}
                    onChange={e => setEditForm({ ...editForm, fatherPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="10-digit mobile"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-700 dark:text-emerald-400">Father WhatsApp (पिता व्हाट्सएप)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.fatherWhatsapp}
                    onChange={e => setEditForm({ ...editForm, fatherWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="WhatsApp number"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-pink-700 dark:text-pink-300">Mother Mobile (माता का मोबाइल)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.motherPhone}
                    onChange={e => setEditForm({ ...editForm, motherPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="10-digit mobile"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-700 dark:text-emerald-400">Mother WhatsApp (माता व्हाट्सएप)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.motherWhatsapp}
                    onChange={e => setEditForm({ ...editForm, motherWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="WhatsApp number"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-amber-700 dark:text-amber-400">Emergency Phone (आपातकालीन मोबाइल)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.emergencyPhone}
                    onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="Emergency mobile"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-700 dark:text-emerald-400">Emergency WhatsApp</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editForm.emergencyWhatsapp}
                    onChange={e => setEditForm({ ...editForm, emergencyWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                    placeholder="Emergency WhatsApp"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Monthly Tuition Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.monthlyFee}
                    onChange={e => setEditForm({ ...editForm, monthlyFee: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bus / Transport Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.busFee}
                    onChange={e => setEditForm({ ...editForm, busFee: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category / Caste</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={e => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium"
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Residential Address (पता)</label>
                  <textarea
                    rows={2}
                    value={editForm.address}
                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-white font-medium resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-md text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 9: ADMIN CONTROLS (PROMOTE & TC) */}
          {activeTab === "admin_controls" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>एडमिन प्रबंधन (Promote & Transfer Certificate)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    छात्र को अगली कक्षा में प्रमोट करना या विद्यालय छोड़ने पर TC जारी करना।
                  </p>
                </div>

                {promoteSuccessToast && (
                  <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-300">
                    ✓ छात्र सफलतापूर्वक प्रमोट हो गया!
                  </span>
                )}
                {tcSuccessToast && (
                  <span className="text-xs px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-300">
                    ✓ TC सफलतापूर्वक जारी हुआ!
                  </span>
                )}
              </div>

              {/* 1. Promote to Next Class */}
              <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-purple-900 dark:text-purple-300 uppercase flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                    <span>1. अगली कक्षा में प्रमोट करें (Promote Student)</span>
                  </h5>
                  <span className="text-xs text-slate-500">Current Class: <strong>{className}</strong></span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                  <select
                    value={promoteClassId}
                    onChange={e => setPromoteClassId(e.target.value)}
                    className="flex-1 w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 font-bold"
                  >
                    <option value="">अगली कक्षा चुनें (Select Next Class)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {confirmAdminAction === "promote" ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handlePromoteStudent}
                        disabled={!promoteClassId || promotingStudent}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black cursor-pointer transition disabled:opacity-50"
                      >
                        {promotingStudent ? "Promoting..." : "Confirm Promote"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAdminAction(null)}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer"
                      >
                        रद्द
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePromoteStudent}
                      disabled={!promoteClassId || promotingStudent}
                      className="w-full sm:w-auto px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer transition disabled:opacity-50 shrink-0"
                    >
                      {promotingStudent ? "Promoting..." : "Promote Student"}
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Issue Transfer Certificate (TC) & Inactive */}
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-rose-900 dark:text-rose-300 uppercase flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-rose-600" />
                    <span>2. स्थानांतरण प्रमाण पत्र (Issue TC & Archive)</span>
                  </h5>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cur.active !== false ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                    Status: {cur.active !== false ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">TC Number</label>
                    <input
                      type="text"
                      value={tcNumber}
                      onChange={e => setTcNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-700 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Reason for Leaving</label>
                    <input
                      type="text"
                      value={tcReason}
                      onChange={e => setTcReason(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-700 font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-rose-200 dark:border-rose-800 gap-2">
                  {confirmAdminAction === "toggle_active" ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleToggleActiveStatus}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer"
                      >
                        Confirm {cur.active !== false ? "Archive" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAdminAction(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        रद्द
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleToggleActiveStatus}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      {cur.active !== false ? "Mark Inactive / Archive" : "Re-Activate Student"}
                    </button>
                  )}

                  {confirmAdminAction === "tc" ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleIssueTc}
                        disabled={issuingTc || cur.tcIssued}
                        className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-black cursor-pointer disabled:opacity-50"
                      >
                        {issuingTc ? "Issuing..." : "Confirm Issue TC"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAdminAction(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        रद्द
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleIssueTc}
                      disabled={issuingTc || cur.tcIssued}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {cur.tcIssued ? "TC Already Issued" : issuingTc ? "Issuing..." : "Issue TC & Archive"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PARENT MULTI-CHILD / SIBLING LINKING */}
          {activeTab === "siblings" && (() => {
            const attachedSiblings = allSchoolStudents.filter((s) => {
              if (!s || s.id === cur.id) return false;
              const inIds = Array.isArray(cur.siblingStudentIds) && cur.siblingStudentIds.includes(s.id);
              const sameFam = Boolean(cur.familyGroupId && s.familyGroupId && cur.familyGroupId === s.familyGroupId);
              return inIds || sameFam;
            });

            const q = siblingSearchQuery.trim().toLowerCase();
            const candidateStudents = allSchoolStudents.filter((s) => {
              if (!s || s.id === cur.id) return false;
              if (attachedSiblings.some((a) => a.id === s.id)) return false;
              if (!q) {
                // Default: suggest students with matching parent phone or father name
                const curPhone = (cur.parentPhone || cur.phone || "").replace(/\D/g, "").slice(-10);
                const sPhone = (s.parentPhone || s.phone || "").replace(/\D/g, "").slice(-10);
                if (curPhone && sPhone && curPhone === sPhone) return true;
                if (cur.fatherName && s.fatherName && cur.fatherName.trim().toLowerCase() === s.fatherName.trim().toLowerCase()) return true;
                return false;
              }
              return (
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.rollNo && String(s.rollNo).toLowerCase().includes(q)) ||
                (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
                (s.phone && s.phone.includes(q)) ||
                (s.parentPhone && s.parentPhone.includes(q))
              );
            });

            const handleAttachSibling = async (target: SchoolStudent) => {
              if (!school?.id) return;
              setLinkingSiblingId(target.id);
              try {
                const famId = cur.familyGroupId || target.familyGroupId || `FAM_${cur.id.slice(-6)}`;
                const curSibs = Array.from(new Set([...(cur.siblingStudentIds || []), target.id]));
                const targetSibs = Array.from(new Set([...(target.siblingStudentIds || []), cur.id]));

                await Promise.all([
                  updateStudent(school.id, cur.id, {
                    familyGroupId: famId,
                    isSiblingMarked: true,
                    siblingStudentIds: curSibs,
                  }),
                  updateStudent(school.id, target.id, {
                    familyGroupId: famId,
                    isSiblingMarked: true,
                    siblingStudentIds: targetSibs,
                  }),
                ]);

                const updatedCur = { ...cur, familyGroupId: famId, isSiblingMarked: true, siblingStudentIds: curSibs };
                setActiveStudent(updatedCur);
                setAllSchoolStudents((prev) =>
                  prev.map((item) => {
                    if (item.id === cur.id) return updatedCur;
                    if (item.id === target.id) return { ...item, familyGroupId: famId, isSiblingMarked: true, siblingStudentIds: targetSibs };
                    return item;
                  })
                );
                toast.success(`${target.name} को ${cur.name} के साथ एक ही अभिभावक खाते में जोड़ दिया गया!`);
              } catch (err) {
                console.error("Sibling link error:", err);
                toast.error("भाई-बहन जोड़ने में त्रुटि हुई।");
              } finally {
                setLinkingSiblingId(null);
              }
            };

            const handleUnlinkSibling = async (target: SchoolStudent) => {
              if (!school?.id) return;
              setLinkingSiblingId(target.id);
              try {
                const curSibs = (cur.siblingStudentIds || []).filter((id) => id !== target.id);
                const targetSibs = (target.siblingStudentIds || []).filter((id) => id !== cur.id);

                await Promise.all([
                  updateStudent(school.id, cur.id, {
                    siblingStudentIds: curSibs,
                    isSiblingMarked: curSibs.length > 0,
                  }),
                  updateStudent(school.id, target.id, {
                    siblingStudentIds: targetSibs,
                    isSiblingMarked: targetSibs.length > 0,
                    familyGroupId: targetSibs.length > 0 ? target.familyGroupId : "",
                  }),
                ]);

                const updatedCur = { ...cur, isSiblingMarked: curSibs.length > 0, siblingStudentIds: curSibs };
                setActiveStudent(updatedCur);
                setAllSchoolStudents((prev) =>
                  prev.map((item) => {
                    if (item.id === cur.id) return updatedCur;
                    if (item.id === target.id) return { ...item, isSiblingMarked: targetSibs.length > 0, siblingStudentIds: targetSibs, familyGroupId: targetSibs.length > 0 ? target.familyGroupId : "" };
                    return item;
                  })
                );
                toast.success(`${target.name} को अलग कर दिया गया।`);
              } catch (err) {
                console.error("Sibling unlink error:", err);
                toast.error("हटाने में त्रुटि हुई।");
              } finally {
                setLinkingSiblingId(null);
              }
            };

            const handleSaveChildDiscount = async (child: SchoolStudent) => {
              if (!school?.id) return;
              const entry = discountEdits[child.id] || {
                amount: String(child.siblingDiscountAmount || 0),
                pct: String(child.siblingDiscountPct || 0),
              };
              const discAmt = Math.max(0, Number(entry.amount) || 0);
              const discPct = Math.max(0, Math.min(100, Number(entry.pct) || 0));
              setDiscountEdits((prev) => ({
                ...prev,
                [child.id]: { ...entry, saving: true },
              }));
              try {
                await updateStudent(school.id, child.id, {
                  siblingDiscountAmount: discAmt,
                  siblingDiscountPct: discPct,
                });
                const updatedPatch = { siblingDiscountAmount: discAmt, siblingDiscountPct: discPct };
                if (child.id === cur.id) {
                  setActiveStudent({ ...cur, ...updatedPatch });
                }
                setAllSchoolStudents((prev) =>
                  prev.map((item) => (item.id === child.id ? { ...item, ...updatedPatch } : item))
                );
                if (onFeeUpdated) onFeeUpdated();
                toast.success(`${child.name} के लिए मासिक छूट (₹${discAmt} / ${discPct}%) सेव हो गई!`);
              } catch (err) {
                console.error("Discount save error:", err);
                toast.error("छूट सेव करने में त्रुटि हुई।");
              } finally {
                setDiscountEdits((prev) => ({
                  ...prev,
                  [child.id]: { ...entry, saving: false },
                }));
              }
            };

            const familyDiscountList = [cur, ...attachedSiblings];

            return (
              <div className="space-y-4">
                {/* PER-STUDENT / PER-SIBLING INDIVIDUAL FEE DISCOUNT */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-3">
                  <div>
                    <h4 className="font-black text-sm text-amber-900 dark:text-amber-200">
                      💰 छात्र / भाई-बहन मासिक शुल्क छूट (Individual Fee Discount)
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      1 छात्र हो या 2-3 भाई-बहन — हर बच्चे के लिए अलग-अलग मासिक छूट (₹ में या % में) सेट करें। यह छूट हर महीने फीस बिल में अपने-आप लागू होगी।
                    </p>
                  </div>

                  <div className="space-y-2">
                    {familyDiscountList.map((child, idx) => {
                      const childCls = classes.find((c) => c.id === child.classId)?.name || "Class";
                      const editState = discountEdits[child.id] || {
                        amount: String(child.siblingDiscountAmount || 0),
                        pct: String(child.siblingDiscountPct || 0),
                      };
                      return (
                        <div
                          key={child.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {idx + 1}. {child.name} {child.id === cur.id ? "(Current)" : ""}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {childCls} • मासिक शुल्क: ₹{Number(child.monthlyFee || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-500">₹</span>
                              <input
                                type="number"
                                min={0}
                                value={editState.amount}
                                onChange={(e) =>
                                  setDiscountEdits((prev) => ({
                                    ...prev,
                                    [child.id]: { ...editState, amount: e.target.value },
                                  }))
                                }
                                className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white"
                                title="Fixed ₹ Discount per month"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">या</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editState.pct}
                                onChange={(e) =>
                                  setDiscountEdits((prev) => ({
                                    ...prev,
                                    [child.id]: { ...editState, pct: e.target.value },
                                  }))
                                }
                                className="w-14 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white"
                                title="Percentage % Discount per month"
                              />
                              <span className="text-[10px] font-bold text-slate-500">%</span>
                            </div>
                            <button
                              type="button"
                              disabled={editState.saving}
                              onClick={() => handleSaveChildDiscount(child)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              {editState.saving ? "..." : "Save"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-teal-900 dark:text-teal-200">
                        👨‍👧‍👦 एक ही अभिभावक के जुड़े हुए बच्चे ({attachedSiblings.length})
                      </h4>
                      <p className="text-[11px] text-teal-700 dark:text-teal-300">
                        एक माता-पिता के सभी बच्चों को आपस में जोड़ें ताकि Parent Portal में सभी बच्चे एक साथ दिखें।
                      </p>
                    </div>
                  </div>

                  {attachedSiblings.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 text-center text-xs text-slate-500">
                      अभी कोई अन्य बच्चा इस छात्र के साथ जुड़ा नहीं है। नीचे सर्च करके जोड़ें।
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachedSiblings.map((sib) => {
                        const sibCls = classes.find((c) => c.id === sib.classId)?.name || "Class";
                        return (
                          <div
                            key={sib.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{sib.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {sibCls} • Roll #{sib.rollNo || "—"} • पिता: {sib.fatherName || "—"}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={linkingSiblingId === sib.id}
                              onClick={() => handleUnlinkSibling(sib)}
                              className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-bold shrink-0 cursor-pointer"
                            >
                              Unlink
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="font-black text-xs text-slate-800 dark:text-white">
                    🔍 अन्य बच्चे को खोजें और जोड़ें (Attach Child to Same Parent)
                  </h4>
                  <input
                    type="text"
                    value={siblingSearchQuery}
                    onChange={(e) => setSiblingSearchQuery(e.target.value)}
                    placeholder="छात्र का नाम, Roll No, पिता का नाम या मोबाइल नंबर लिखें..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {candidateStudents.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-3">
                        {siblingSearchQuery ? "कोई मिलता-जुलता छात्र नहीं मिला।" : "समान मोबाइल/पिता वाले संभावित भाई-बहन खोजने के लिए ऊपर नाम लिखें।"}
                      </p>
                    ) : (
                      candidateStudents.slice(0, 15).map((cand) => {
                        const candCls = classes.find((c) => c.id === cand.classId)?.name || "Class";
                        return (
                          <div
                            key={cand.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{cand.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {candCls} • Roll #{cand.rollNo || "—"} • पिता: {cand.fatherName || "—"} ({cand.parentPhone || cand.phone || "—"})
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={linkingSiblingId === cand.id}
                              onClick={() => handleAttachSibling(cand)}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              {linkingSiblingId === cand.id ? "..." : "+ जोड़ें"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{schoolName} • Student 360° Portal</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {dpsReceiptFee && (
        <OfficialFeeReceiptModal
          isOpen={Boolean(dpsReceiptFee)}
          onClose={() => setDpsReceiptFee(null)}
          school={{
            ...(school || {}),
            id: school?.id || "school",
            name: school?.name || schoolName || "School",
            address: school?.address || "Institutional Academic Campus, Educational Zone",
            logoUrl: getSavedSchoolLogo(school?.logoUrl, school?.id),
            principalSignatureUrl: school?.principalSignatureUrl,
          } as any}
          fee={dpsReceiptFee}
          student={cur}
          className={className}
          sessionName="2026-27"
          feeHistory={feeRecords}
        />
      )}

      {showAdmissionFormModal && school && (
        <AdmissionFormPrintModal
          isOpen={showAdmissionFormModal}
          onClose={() => setShowAdmissionFormModal(false)}
          school={school}
          student={cur}
          className={className}
          sessionName="2026-27"
          initialMode="classic_box_grid"
          feeRecord={
            feeRecords.find(
              (f) => f.feeType === "admission" || f.receiptCategory === "admission"
            ) || null
          }
        />
      )}
    </div>
  );
};
