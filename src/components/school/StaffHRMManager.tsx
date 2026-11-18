import React, { useState, useEffect, useMemo } from "react";
import type {
  MonthlyFee,
  ReferralCommissionDuration,
  ReferralCommissionScope,
  School,
  SchoolReferralSettings,
  SchoolStudent,
  SchoolTeacher,
  StaffEmployee,
  StaffLeave,
  TeacherReferralPayout,
  SchoolAccountant,
  AccountantPermissions,
} from "../../school-types";
import {
  saveStaffEmployee,
  getStaffEmployees,
  deleteStaffEmployee,
  saveStaffLeave,
  getStaffLeaves,
  subscribeStaffLeaves,
  updateStaffLeaveStatus,
  getTeachers,
  saveTeacher,
  updateTeacher,
  getStudents,
  getSchoolFeeHistory,
  getReferralPayouts,
  saveReferralPayout,
  deleteReferralPayout,
  getSchoolReferralSettings,
  saveSchoolReferralSettings,
  getAccountants,
  saveAccountant,
  deleteAccountant,
  updateSchool,
  getMonthlyStaffDailyAttendance,
  generateId,
  todayStr,
  currentMonthStr,
} from "../../school-firebase";
import {
  calculateTeacherReferralLedger,
  formatReferralDurationLabel,
  mergeSchoolReferrerList,
  normalizePersonName,
  normalizeWhatsappOrPhone,
  type TeacherCommissionSummary,
} from "../../utils/schoolReferralSiblingEngine";
import {
  Users,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Phone,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  Printer,
  Briefcase,
  CreditCard,
  Settings2,
  Wallet,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  QrCode,
  Edit3,
  GraduationCap,
  UserPlus,
  Building2,
  PenTool,
} from "lucide-react";
import { TeacherIdCardModal } from "./TeacherIdCardModal";
import { TeacherSignatureModal } from "./TeacherSignatureModal";
import { speakNotification } from "../../utils/voiceNotifyEngine";

export type HrmTab = "directory" | "accountants" | "referrals" | "leaves" | "salary";

interface Props {
  school: School;
  onBack?: () => void;
  embedded?: boolean;
  controlledTab?: HrmTab;
  onTabChange?: (tab: HrmTab) => void;
  hideInternalNav?: boolean;
  hideAdminAttendanceCard?: boolean;
  initialTeacherIdForAccountant?: string | null;
  onClearInitialTeacherForAccountant?: () => void;
}

export const StaffHRMManager: React.FC<Props> = ({
  school,
  onBack,
  embedded = false,
  controlledTab,
  onTabChange,
  hideInternalNav = false,
  hideAdminAttendanceCard = false,
  initialTeacherIdForAccountant,
  onClearInitialTeacherForAccountant,
}) => {
  const [internalTab, setInternalTab] = useState<HrmTab>(controlledTab || "directory");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: HrmTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [staffList, setStaffList] = useState<StaffEmployee[]>([]);
  const [accountantsList, setAccountantsList] = useState<SchoolAccountant[]>([]);
  const [showAddAccountantModal, setShowAddAccountantModal] = useState(false);
  const [accountantForm, setAccountantForm] = useState<{
    name: string;
    phone: string;
    employeeId: string;
    designation: string;
    monthlySalary: number;
    permissions: AccountantPermissions;
    teacherRef?: string;
  }>({
    name: "",
    phone: "",
    employeeId: "ACC-01",
    designation: "Senior Accountant & Cashier",
    monthlySalary: 25000,
    permissions: {
      canCollectFee: true,
      canAdmitStudents: true,
      canGrantDiscount: true,
      maxDiscountLimitPct: 20,
      canRecordExpenses: true,
      canViewDayBook: true,
      canSendFeeAlerts: true,
      canManageBusFee: true,
      canPrintIdCards: true,
      canManageAbsentee: true,
    },
  });
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [matchedTeacherInfo, setMatchedTeacherInfo] = useState<{
    id: string;
    name: string;
    phone: string;
    employeeId?: string;
    designation?: string;
    salary?: number;
  } | null>(null);

  // Fast auto-fill when teacher ID / phone / name is entered or selected
  const handleTeacherSearchOrSelect = (queryOrId: string) => {
    setTeacherSearchQuery(queryOrId);
    if (!queryOrId || !queryOrId.trim()) {
      setMatchedTeacherInfo(null);
      return;
    }
    const clean = queryOrId.trim().toLowerCase();
    const cleanDigits = queryOrId.replace(/[^0-9]/g, "");

    const foundT = teachersList.find((t) =>
      (t.id && t.id.toLowerCase() === clean) ||
      (t.employeeId && t.employeeId.toLowerCase() === clean) ||
      (t.name && t.name.toLowerCase().includes(clean)) ||
      (cleanDigits.length >= 4 && t.phone && t.phone.replace(/[^0-9]/g, "").includes(cleanDigits))
    );

    const foundS = !foundT
      ? staffList.find((s) =>
          (s.id && s.id.toLowerCase() === clean) ||
          (s.employeeId && s.employeeId.toLowerCase() === clean) ||
          (s.name && s.name.toLowerCase().includes(clean)) ||
          (cleanDigits.length >= 4 && s.phone && s.phone.replace(/[^0-9]/g, "").includes(cleanDigits))
        )
      : null;

    const matched = foundT || foundS;
    if (matched) {
      setMatchedTeacherInfo({
        id: matched.id,
        name: matched.name,
        phone: matched.phone || "",
        employeeId: matched.employeeId || `ACC-${accountantsList.length + 1}`,
        designation: (matched as any).designation
          ? `${(matched as any).designation} & Accountant`
          : "Senior Teacher & Accountant",
        salary: (matched as any).monthlySalary || 25000,
      });

      setAccountantForm((prev) => ({
        ...prev,
        name: matched.name,
        phone: matched.phone || prev.phone,
        employeeId: matched.employeeId || `ACC-${accountantsList.length + 1}`,
        designation: (matched as any).designation
          ? `${(matched as any).designation} & Accountant`
          : "Senior Teacher & Accountant",
        monthlySalary: (matched as any).monthlySalary || prev.monthlySalary,
        teacherRef: matched.id,
      }));
    } else {
      setMatchedTeacherInfo(null);
    }
  };

  const [quickTeacherIdInput, setQuickTeacherIdInput] = useState("");

  const handleDirectAssignTeacherAsAccountant = async (queryOrId: string) => {
    if (!queryOrId || !queryOrId.trim()) {
      showToast("error", "कृपया शिक्षक की ID, मोबाइल नंबर या नाम दर्ज करें।");
      return;
    }
    const clean = queryOrId.trim().toLowerCase();
    const cleanDigits = queryOrId.replace(/[^0-9]/g, "");

    const foundT = teachersList.find(
      (t) =>
        (t.id && t.id.toLowerCase() === clean) ||
        (t.employeeId && t.employeeId.toLowerCase() === clean) ||
        (t.name && t.name.toLowerCase().includes(clean)) ||
        (cleanDigits.length >= 4 && t.phone && t.phone.replace(/[^0-9]/g, "").includes(cleanDigits))
    );

    const foundS = !foundT
      ? staffList.find(
          (s) =>
            (s.id && s.id.toLowerCase() === clean) ||
            (s.employeeId && s.employeeId.toLowerCase() === clean) ||
            (s.name && s.name.toLowerCase().includes(clean)) ||
            (cleanDigits.length >= 4 && s.phone && s.phone.replace(/[^0-9]/g, "").includes(cleanDigits))
        )
      : null;

    const matched = foundT
      ? {
          id: foundT.id,
          name: foundT.name,
          phone: foundT.phone || "",
          employeeId: foundT.employeeId || `ACC-${accountantsList.length + 1}`,
          designation: foundT.designation || "Senior Accountant & Cashier",
          salary: (foundT as any).monthlySalary || 25000,
        }
      : foundS
      ? {
          id: foundS.id,
          name: foundS.name,
          phone: foundS.phone || "",
          employeeId: foundS.employeeId || `ACC-${accountantsList.length + 1}`,
          designation: foundS.designation || "Senior Accountant & Cashier",
          salary: foundS.monthlySalary || 25000,
        }
      : null;

    if (!matched) {
      showToast("error", `आईडी "${queryOrId}" से कोई शिक्षक या स्टाफ नहीं मिला। कृपया ID जांचें।`);
      return;
    }

    const existing = accountantsList.find(
      (a) => a.teacherRef === matched.id || (matched.phone && a.phone === matched.phone)
    );
    if (existing) {
      showToast("error", `${matched.name} पहले से ही Accountant नियुक्त हैं! (ID: ${existing.employeeId || "ACC"})`);
      return;
    }

    try {
      const newAcc: SchoolAccountant = {
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        schoolId: school.id,
        name: matched.name,
        phone: matched.phone || "0000000000",
        employeeId: matched.employeeId,
        designation: matched.designation || "Senior Accountant & Cashier",
        monthlySalary: matched.salary || 25000,
        joinDate: todayStr(),
        active: true,
        teacherRef: matched.id,
        permissions: {
          canCollectFee: true,
          canAdmitStudents: true,
          canGrantDiscount: true,
          maxDiscountLimitPct: 20,
          canRecordExpenses: true,
          canViewDayBook: true,
          canSendFeeAlerts: true,
          canManageBusFee: true,
          canPrintIdCards: true,
          canManageAbsentee: true,
        },
        createdAt: new Date().toISOString(),
      };

      await saveAccountant(newAcc);
      setAccountantsList((prev) => [newAcc, ...prev]);
      setQuickTeacherIdInput("");
      showToast("success", `शिक्षक ${matched.name} (ID: ${matched.employeeId || matched.id}) को तुरंत Accountant बना दिया गया!`);
    } catch (e: any) {
      showToast("error", "Accountant बनाने में त्रुटि: " + (e?.message || ""));
    }
  };

  const [leavesList, setLeavesList] = useState<StaffLeave[]>([]);
  const [teachersList, setTeachersList] = useState<SchoolTeacher[]>([]);
  const [studentsList, setStudentsList] = useState<SchoolStudent[]>([]);
  const [feesList, setFeesList] = useState<MonthlyFee[]>([]);
  const [payoutsList, setPayoutsList] = useState<TeacherReferralPayout[]>([]);
  const [referralSettings, setReferralSettings] = useState<SchoolReferralSettings>({
    schoolId: school.id,
    enabled: true,
    defaultCommissionPct: 10,
    commissionScope: "all_fees",
    commissionDuration: "1_year",
    excludeTransportFee: true,
    siblingDiscountEnabled: true,
    defaultSiblingDiscountPct: 10,
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [selectedStaffForIdCard, setSelectedStaffForIdCard] = useState<StaffEmployee | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [confirmDeletePayoutId, setConfirmDeletePayoutId] = useState<string | null>(null);
  const [confirmDeleteAccountantId, setConfirmDeleteAccountantId] = useState<string | null>(null);

  // Edit Accountant salary/details modal state
  const [editingAccountantModal, setEditingAccountantModal] = useState<{
    acc: SchoolAccountant;
    name: string;
    phone: string;
    employeeId: string;
    designation: string;
    monthlySalary: number;
    signatureUrl?: string;
  } | null>(null);
  const [signatureTargetAccountant, setSignatureTargetAccountant] = useState<SchoolAccountant | null>(null);

  // Convert Accountant -> Teacher modal state
  const [convertAccountantModal, setConvertAccountantModal] = useState<{
    acc: SchoolAccountant;
    name: string;
    phone: string;
    employeeId: string;
    designation: string;
    subjects: string;
    qualification: string;
    experience: string;
    monthlySalary: number;
  } | null>(null);

  // Edit Staff Directory salary/details modal state
  const [editingStaffModal, setEditingStaffModal] = useState<{
    st: StaffEmployee;
    name: string;
    phone: string;
    employeeId: string;
    designation: string;
    department: string;
    monthlySalary: number;
  } | null>(null);

  const [savingRoleOrPay, setSavingRoleOrPay] = useState(false);

  const findLinkedTeacherForAccountant = (acc: SchoolAccountant): SchoolTeacher | undefined => {
    const accPhone = normalizeWhatsappOrPhone(acc.phone || "");
    const accName = normalizePersonName(acc.name || "");
    return teachersList.find(
      (t) =>
        (acc.teacherRef && t.id === acc.teacherRef) ||
        (accPhone.length >= 8 && normalizeWhatsappOrPhone(t.phone || "") === accPhone) ||
        (accName && normalizePersonName(t.name || "") === accName)
    );
  };

  const buildSyncedSalaryStructure = (prevStruct: any, nextMonthly: number) => {
    const pay = Math.max(0, Number(nextMonthly) || 0);
    const nowIso = new Date().toISOString();
    if (!prevStruct) {
      return {
        monthlyBaseSalary: pay,
        allowanceHra: 0,
        allowanceTravel: 0,
        allowanceSpecial: 0,
        deductionPf: 0,
        deductionOther: 0,
        netMonthlySalary: pay,
        paymentMode: "Bank Transfer" as const,
        updatedAt: nowIso,
      };
    }
    const hra = Number(prevStruct.allowanceHra || 0);
    const travel = Number(prevStruct.allowanceTravel || 0);
    const special = Number(prevStruct.allowanceSpecial || 0);
    const pf = Number(prevStruct.deductionPf || 0);
    const other = Number(prevStruct.deductionOther || 0);
    const adjustedBase = Math.max(0, pay - hra - travel - special + pf + other);
    return {
      ...prevStruct,
      monthlyBaseSalary: adjustedBase,
      netMonthlySalary: pay,
      updatedAt: nowIso,
    };
  };

  const handleSaveAccountantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountantModal) return;
    const { acc, name, phone, employeeId, designation, monthlySalary, signatureUrl } = editingAccountantModal;
    if (!name.trim() || !phone.trim()) {
      showToast("error", "कृपया Accountant का नाम और मोबाइल नंबर दर्ज करें।");
      return;
    }
    setSavingRoleOrPay(true);
    try {
      const nextPay = Math.max(0, Number(monthlySalary) || 0);
      const nextStruct = buildSyncedSalaryStructure(acc.salaryStructure, nextPay);
      const updatedAcc: SchoolAccountant = {
        ...acc,
        name: name.trim(),
        phone: phone.trim(),
        employeeId: employeeId.trim() || acc.employeeId || "ACC",
        designation: designation.trim() || acc.designation || "Accountant & Cashier",
        monthlySalary: nextPay,
        salaryStructure: nextStruct,
        signatureUrl: signatureUrl !== undefined ? signatureUrl : acc.signatureUrl,
      };
      await saveAccountant(updatedAcc);
      setAccountantsList((prev) => prev.map((a) => (a.id === acc.id ? updatedAcc : a)));

      // Sync linked Teacher & Staff record if linked
      const linkedTeacher = findLinkedTeacherForAccountant(acc);
      if (linkedTeacher) {
        const syncedStruct = buildSyncedSalaryStructure(linkedTeacher.salaryStructure, nextPay);
        await updateTeacher(school.id, linkedTeacher.id, {
          name: updatedAcc.name,
          phone: updatedAcc.phone,
          monthlySalary: nextPay,
          salary: nextPay,
          salaryStructure: syncedStruct,
        });
        setTeachersList((prev) =>
          prev.map((t) =>
            t.id === linkedTeacher.id
              ? { ...t, name: updatedAcc.name, phone: updatedAcc.phone, monthlySalary: nextPay, salary: nextPay, salaryStructure: syncedStruct }
              : t
          )
        );
      }

      const matchingStaff = staffList.find(
        (s) =>
          (acc.teacherRef && s.id === acc.teacherRef) ||
          s.id === acc.id ||
          (phone.trim() && s.phone === phone.trim())
      );
      if (matchingStaff) {
        const syncedStaff: StaffEmployee = {
          ...matchingStaff,
          name: updatedAcc.name,
          phone: updatedAcc.phone,
          monthlySalary: nextPay,
          salaryStructure: nextStruct,
        };
        await saveStaffEmployee(syncedStaff);
        setStaffList((prev) => prev.map((s) => (s.id === matchingStaff.id ? syncedStaff : s)));
      }

      setEditingAccountantModal(null);
      showToast("success", `✅ ${updatedAcc.name} का विवरण और मासिक वेतन (₹${nextPay.toLocaleString("en-IN")}) अपडेट हो गया!`);
    } catch (err: any) {
      showToast("error", "अपडेट करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSavingRoleOrPay(false);
    }
  };

  const openConvertAccountantToTeacherModal = (acc: SchoolAccountant) => {
    const existingTeacher = findLinkedTeacherForAccountant(acc);
    if (existingTeacher) {
      showToast("error", `${acc.name} पहले से ही Teacher के रूप में सक्रिय हैं!`);
      return;
    }
    setConvertAccountantModal({
      acc,
      name: acc.name || "",
      phone: acc.phone || "",
      employeeId: acc.employeeId && !acc.employeeId.startsWith("ACC") ? acc.employeeId : `TEA-${acc.id.slice(-4).toUpperCase()}`,
      designation: acc.designation ? `${acc.designation} & Faculty` : "Faculty & Accountant",
      subjects: "Accountancy, Mathematics",
      qualification: "",
      experience: "",
      monthlySalary: Math.max(0, Number(acc.monthlySalary || 0)),
    });
  };

  const handleConfirmConvertAccountantToTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertAccountantModal) return;
    const { acc, name, phone, employeeId, designation, subjects, qualification, experience, monthlySalary } =
      convertAccountantModal;
    if (!name.trim()) {
      showToast("error", "कृपया Teacher का नाम दर्ज करें।");
      return;
    }
    setSavingRoleOrPay(true);
    try {
      const nowIso = new Date().toISOString();
      const pay = Math.max(0, Number(monthlySalary) || 0);
      const salaryStruct = buildSyncedSalaryStructure(acc.salaryStructure, pay);
      const subArr = subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Re-use matching teacher if present by phone/name, else create new SchoolTeacher
      const existing = findLinkedTeacherForAccountant(acc);
      const teacherId = existing?.id || generateId();
      const empId = employeeId.trim() || `TEA-${teacherId.slice(-4).toUpperCase()}`;

      const teacherRecord: SchoolTeacher = {
        ...(existing || {}),
        id: teacherId,
        schoolId: school.id,
        name: name.trim(),
        phone: phone.trim() || acc.phone || undefined,
        email: existing?.email || acc.email || undefined,
        photoUrl: existing?.photoUrl || acc.photoUrl || undefined,
        employeeId: empId,
        designation: designation.trim() || "Faculty & Accountant",
        qualification: qualification.trim() || existing?.qualification || undefined,
        experience: experience.trim() || existing?.experience || undefined,
        subjects: subArr.length > 0 ? subArr : (existing?.subjects || ["General"]),
        classes: existing?.classes || [],
        active: true,
        joinDate: existing?.joinDate || acc.joinDate || todayStr(),
        createdAt: existing?.createdAt || nowIso,
        monthlySalary: pay,
        salary: pay,
        salaryStructure: salaryStruct,
      };

      await saveTeacher(teacherRecord);

      // Also sync StaffEmployee directory so attendance & payroll stay 100% synced
      const staffRecord: StaffEmployee = {
        id: teacherId,
        schoolId: school.id,
        name: teacherRecord.name,
        email: teacherRecord.email || "",
        phone: teacherRecord.phone || "",
        designation: teacherRecord.designation || "Faculty & Accountant",
        department: "Academic & Accounts",
        employeeId: empId,
        joinDate: teacherRecord.joinDate,
        monthlySalary: pay,
        salaryStructure: salaryStruct,
        active: true,
        photoUrl: teacherRecord.photoUrl,
        createdAt: teacherRecord.createdAt,
      };
      await saveStaffEmployee(staffRecord);

      // Link teacherRef back onto Accountant record & sync salary
      const updatedAcc: SchoolAccountant = {
        ...acc,
        teacherRef: teacherId,
        monthlySalary: pay,
        salaryStructure: salaryStruct,
      };
      await saveAccountant(updatedAcc);

      setTeachersList((prev) => [teacherRecord, ...prev.filter((t) => t.id !== teacherId)]);
      setStaffList((prev) => [staffRecord, ...prev.filter((s) => s.id !== teacherId)]);
      setAccountantsList((prev) => prev.map((a) => (a.id === acc.id ? updatedAcc : a)));
      setConvertAccountantModal(null);
      showToast("success", `👨‍🏫 ${teacherRecord.name} को सफलतापूर्वक Teacher भी बना दिया गया है!`);
    } catch (err: any) {
      showToast("error", "Teacher बनाने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSavingRoleOrPay(false);
    }
  };

  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffModal) return;
    const { st, name, phone, employeeId, designation, department, monthlySalary } = editingStaffModal;
    if (!name.trim()) {
      showToast("error", "कृपया स्टाफ का नाम दर्ज करें।");
      return;
    }
    setSavingRoleOrPay(true);
    try {
      const nextPay = Math.max(0, Number(monthlySalary) || 0);
      const nextStruct = buildSyncedSalaryStructure(st.salaryStructure, nextPay);
      const updatedStaff: StaffEmployee = {
        ...st,
        name: name.trim(),
        phone: phone.trim(),
        employeeId: employeeId.trim() || st.employeeId,
        designation: designation.trim() || st.designation,
        department: department.trim() || st.department,
        monthlySalary: nextPay,
        salaryStructure: nextStruct,
      };
      await saveStaffEmployee(updatedStaff);
      setStaffList((prev) => prev.map((item) => (item.id === st.id ? updatedStaff : item)));

      // Sync to Teacher if matching id
      const matchingTeacher = teachersList.find((t) => t.id === st.id);
      if (matchingTeacher) {
        const tStruct = buildSyncedSalaryStructure(matchingTeacher.salaryStructure, nextPay);
        await updateTeacher(school.id, matchingTeacher.id, {
          name: updatedStaff.name,
          phone: updatedStaff.phone || undefined,
          designation: updatedStaff.designation,
          employeeId: updatedStaff.employeeId,
          monthlySalary: nextPay,
          salary: nextPay,
          salaryStructure: tStruct,
        });
        setTeachersList((prev) =>
          prev.map((t) =>
            t.id === matchingTeacher.id
              ? { ...t, name: updatedStaff.name, phone: updatedStaff.phone, designation: updatedStaff.designation, monthlySalary: nextPay, salary: nextPay, salaryStructure: tStruct }
              : t
          )
        );
      }

      // Sync to Accountant if linked
      const linkedAcc = accountantsList.find(
        (a) => a.teacherRef === st.id || a.id === st.id || (updatedStaff.phone && a.phone === updatedStaff.phone)
      );
      if (linkedAcc) {
        const updatedAcc: SchoolAccountant = {
          ...linkedAcc,
          name: updatedStaff.name,
          phone: updatedStaff.phone || linkedAcc.phone,
          monthlySalary: nextPay,
          salaryStructure: nextStruct,
        };
        await saveAccountant(updatedAcc);
        setAccountantsList((prev) => prev.map((a) => (a.id === linkedAcc.id ? updatedAcc : a)));
      }

      if (selectedStaffForSlip?.id === st.id) {
        setSelectedStaffForSlip(updatedStaff);
      }
      setEditingStaffModal(null);
      showToast("success", `✅ ${updatedStaff.name} का वेतन ₹${nextPay.toLocaleString("en-IN")}/माह अपडेट हो गया!`);
    } catch (err: any) {
      showToast("error", "स्टाफ अपडेट करने में त्रुटि: " + (err?.message || ""));
    } finally {
      setSavingRoleOrPay(false);
    }
  };

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

  // Referral commission tab states
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [settlingTeacherId, setSettlingTeacherId] = useState<string | null>(null);
  const [payoutForm, setPayoutForm] = useState<{
    amount: number;
    paymentMode: TeacherReferralPayout["paymentMode"];
    referenceNo: string;
    remarks: string;
    paidDate: string;
  }>({
    amount: 0,
    paymentMode: "Cash",
    referenceNo: "",
    remarks: "",
    paidDate: todayStr(),
  });
  const [savingPayout, setSavingPayout] = useState(false);

  // Pay slip state
  const [selectedStaffForSlip, setSelectedStaffForSlip] = useState<StaffEmployee | null>(null);
  const [lateDaysMap, setLateDaysMap] = useState<Record<string, number>>({});
  const [monthlyAttMap, setMonthlyAttMap] = useState<Record<string, Record<string, any>>>({});
  const [includeReferralInSlip, setIncludeReferralInSlip] = useState(true);
  const [settlingSlipBonus, setSettlingSlipBonus] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // School Admin Official Attendance & ID Card State
  const adminAttKey = `nst_admin_att_${school?.id || "default"}_${todayStr()}`;
  const [adminAttendanceRecord, setAdminAttendanceRecord] = useState<{
    date: string;
    inTime?: string;
    outTime?: string;
    present: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem(`nst_admin_att_${school?.id || "default"}_${todayStr()}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("[StaffHRMManager] Failed reading admin attendance:", err);
    }
    return { date: todayStr(), present: false };
  });

  const handleAdminPunch = (type: "in" | "out") => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const updated = {
      date: todayStr(),
      present: true,
      inTime: type === "in" ? nowTime : (adminAttendanceRecord.inTime || nowTime),
      outTime: type === "out" ? nowTime : adminAttendanceRecord.outTime,
    };
    setAdminAttendanceRecord(updated);
    try {
      localStorage.setItem(adminAttKey, JSON.stringify(updated));
    } catch (err) {
      console.warn("[StaffHRMManager] Failed saving admin attendance:", err);
    }
    showToast("success", `✓ एडमिन ${type === "in" ? "Punch-In (आगमन)" : "Punch-Out (प्रस्थान)"} समय (${nowTime}) सफलतापूर्वक दर्ज हो गया!`);
    speakNotification(
      "एडमिन हाजिरी दर्ज",
      `स्कूल एडमिन का ${type === "in" ? "आगमन" : "प्रस्थान"} समय ${nowTime} दर्ज किया गया है।`
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [stf, lvs, tch, stds, fees, payouts, refCfg, accs] = await Promise.all([
        getStaffEmployees(school.id),
        getStaffLeaves(school.id),
        getTeachers(school.id),
        getStudents(school.id),
        getSchoolFeeHistory(school.id),
        getReferralPayouts(school.id),
        getSchoolReferralSettings(school.id),
        getAccountants(school.id),
      ]);
      setStaffList(stf);
      setLeavesList(lvs);
      setTeachersList(tch);
      setStudentsList(stds);
      setFeesList(fees);
      setPayoutsList(payouts);
      if (refCfg) setReferralSettings(refCfg);
      setAccountantsList(accs || []);

      if (stf.length > 0 && !leaveForm.staffId) {
        setLeaveForm((prev) => ({ ...prev, staffId: stf[0].id }));
        setSelectedStaffForSlip((prev) => prev || stf[0]);
      } else if (tch.length > 0 && !leaveForm.staffId) {
        setLeaveForm((prev) => ({ ...prev, staffId: tch[0].id }));
      }
    } catch {
      // Handled gracefully with cached state
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [school.id]);

  useEffect(() => {
    if (!school?.id) return;
    const unsub = subscribeStaffLeaves(school.id, (list) => {
      setLeavesList(list || []);
    });
    return unsub;
  }, [school?.id]);

  useEffect(() => {
    if (!school?.id) return;
    let active = true;
    const ym = currentMonthStr();
    const refreshAtt = () => {
      getMonthlyStaffDailyAttendance(school.id, ym)
        .then((res) => {
          if (active) setMonthlyAttMap(res || {});
        })
        .catch(() => {});
    };
    refreshAtt();
    const onAttUpdated = (e: any) => {
      if (e?.detail?.schoolId && e.detail.schoolId !== school.id) return;
      refreshAtt();
    };
    window.addEventListener("staff-daily-attendance-updated", onAttUpdated);
    return () => {
      active = false;
      window.removeEventListener("staff-daily-attendance-updated", onAttUpdated);
    };
  }, [school?.id]);

  useEffect(() => {
    const onRemoved = (e: any) => {
      if (e?.detail?.schoolId && e.detail.schoolId !== school.id) return;
      const rid = e?.detail?.teacherId || e?.detail?.staffId;
      if (rid) {
        setStaffList((prev) => prev.filter((s) => s.id !== rid));
        setTeachersList((prev) => prev.filter((t) => t.id !== rid));
      }
    };
    const onTeacherUpdated = (e: any) => {
      if (e?.detail?.schoolId && e.detail.schoolId !== school.id) return;
      const updated = e?.detail?.teacher;
      if (updated?.id) {
        setTeachersList((prev) => {
          const exists = prev.some((t) => t.id === updated.id);
          return exists
            ? prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            : [updated, ...prev];
        });
      }
    };
    const onStaffUpdated = (e: any) => {
      if (e?.detail?.schoolId && e.detail.schoolId !== school.id) return;
      const updated = e?.detail?.staff;
      if (updated?.id) {
        setStaffList((prev) => {
          const exists = prev.some((s) => s.id === updated.id);
          return exists
            ? prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            : [updated, ...prev];
        });
      }
    };
    window.addEventListener("teacher-deleted", onRemoved);
    window.addEventListener("staff-deleted", onRemoved);
    window.addEventListener("teacher-updated", onTeacherUpdated);
    window.addEventListener("staff-updated", onStaffUpdated);
    return () => {
      window.removeEventListener("teacher-deleted", onRemoved);
      window.removeEventListener("staff-deleted", onRemoved);
      window.removeEventListener("teacher-updated", onTeacherUpdated);
      window.removeEventListener("staff-updated", onStaffUpdated);
    };
  }, [school.id]);

  useEffect(() => {
    if (!initialTeacherIdForAccountant || loading) return;
    handleTeacherSearchOrSelect(initialTeacherIdForAccountant);
    setActiveTab("accountants");
    setShowAddAccountantModal(true);
    onClearInitialTeacherForAccountant?.();
  }, [initialTeacherIdForAccountant, loading, teachersList.length, staffList.length]);

  // Unified referrer list & live 10% commission ledger
  const mergedReferrers = useMemo(
    () => mergeSchoolReferrerList(teachersList, staffList),
    [teachersList, staffList]
  );

  const referralLedger = useMemo(
    () =>
      calculateTeacherReferralLedger({
        students: studentsList,
        fees: feesList,
        payouts: payoutsList,
        referrers: mergedReferrers,
        settings: referralSettings,
      }),
    [studentsList, feesList, payoutsList, mergedReferrers, referralSettings]
  );

  // Match selected staff or first available teacher in Salary Slip tab with their referral ledger bucket
  const slipReferralSummary: TeacherCommissionSummary | null = useMemo(() => {
    const targetPerson =
      selectedStaffForSlip ||
      staffList[0] ||
      (teachersList[0]
        ? {
            id: teachersList[0].id,
            name: teachersList[0].name,
            phone: teachersList[0].phone || "",
          }
        : null);
    if (!targetPerson) return null;
    const targetName = normalizePersonName(targetPerson.name);
    const targetPhone = normalizeWhatsappOrPhone(targetPerson.phone);

    return (
      referralLedger.teachers.find((t) => {
        if (t.teacherId === targetPerson.id) return true;
        if (targetPhone && normalizeWhatsappOrPhone(t.phone) === targetPhone) return true;
        if (targetName && normalizePersonName(t.teacherName) === targetName) return true;
        return false;
      }) || null
    );
  }, [selectedStaffForSlip, staffList, teachersList, referralLedger.teachers]);

  const handleAddStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.phone.trim()) {
      showToast("error", "Kripya staff member ka naam aur mobile number darj karein.");
      return;
    }
    try {
      const generatedStaffId = generateId();
      const newStaff: StaffEmployee = {
        id: generatedStaffId,
        schoolId: school.id,
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        designation: staffForm.designation.trim(),
        department: staffForm.department.trim(),
        employeeId: `EMP-${generatedStaffId.slice(-4).toUpperCase()}`,
        monthlySalary: Number(staffForm.monthlySalary) || 0,
        joinDate: staffForm.joinDate,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await saveStaffEmployee(newStaff);
      setStaffList((prev) => [newStaff, ...prev]);
      window.dispatchEvent(new CustomEvent("staff-updated", { detail: { schoolId: school.id, staff: newStaff } }));
      if (!selectedStaffForSlip) setSelectedStaffForSlip(newStaff);
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
      setSelectedStaffForIdCard(newStaff);
      showToast("success", `${newStaff.name} ko staff directory mein jod diya gaya.`);
    } catch (e: any) {
      showToast("error", "Staff save karne mein samasya: " + (e?.message || "Unknown error"));
    }
  };

  const handleDeleteStaff = async (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    setTeachersList((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteStaffId(null);
    await deleteStaffEmployee(school.id, id);
    window.dispatchEvent(new CustomEvent("staff-deleted", { detail: { schoolId: school.id, staffId: id } }));
    showToast("success", "Staff / Teacher record permanently hata diya gaya.");
  };

  const leaveCandidates = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; designation: string }>();
    staffList.forEach((s) => {
      if (s?.id) byId.set(s.id, { id: s.id, name: s.name, designation: s.designation || "Staff" });
    });
    teachersList.forEach((t) => {
      if (t?.id && !byId.has(t.id)) {
        byId.set(t.id, { id: t.id, name: t.name, designation: t.designation || "Teacher" });
      }
    });
    return Array.from(byId.values());
  }, [staffList, teachersList]);

  const handleApplyLeave = async () => {
    const candidate =
      leaveCandidates.find((c) => c.id === leaveForm.staffId) || leaveCandidates[0];
    if (!candidate || !leaveForm.reason.trim()) {
      showToast("error", "Teacher / Staff member chunein aur chhutti ka karan likhein.");
      return;
    }
    const fromMs = new Date(leaveForm.fromDate || todayStr()).getTime();
    const toMs = new Date(leaveForm.toDate || leaveForm.fromDate || todayStr()).getTime();
    const computedDays =
      Number.isFinite(fromMs) && Number.isFinite(toMs) && toMs >= fromMs
        ? Math.max(1, Math.round((toMs - fromMs) / 86400000) + 1)
        : Number(leaveForm.days) || 1;
    try {
      const newLeave: StaffLeave = {
        id: generateId(),
        schoolId: school.id,
        staffId: candidate.id,
        staffName: candidate.name,
        designation: candidate.designation,
        leaveType: leaveForm.leaveType,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        days: computedDays,
        reason: leaveForm.reason.trim(),
        status: "pending",
        appliedAt: new Date().toISOString(),
      };
      await saveStaffLeave(newLeave);
      setLeavesList((prev) => [newLeave, ...prev.filter((x) => x.id !== newLeave.id)]);
      setShowApplyLeave(false);
      setLeaveForm((prev) => ({ ...prev, reason: "" }));
      showToast("success", "Leave application jama ho gaya.");
    } catch (e: any) {
      showToast("error", "Leave apply karne mein samasya: " + (e?.message || "Unknown error"));
    }
  };

  const handleUpdateLeave = async (leaveId: string, status: "approved" | "rejected") => {
    await updateStaffLeaveStatus(school.id, leaveId, status);
    setLeavesList((prev) => prev.map((l) => (l.id === leaveId ? { ...l, status } : l)));
    showToast(
      "success",
      status === "approved"
        ? "✓ Leave Request approve ho gayi — Teacher ko status dikh jayega."
        : "Leave Request reject kar di gayi — Teacher ko status dikh jayega."
    );
  };

  const handleSaveReferralPolicy = async () => {
    setSavingPolicy(true);
    try {
      const saved = await saveSchoolReferralSettings(school.id, {
        enabled: referralSettings.enabled,
        defaultCommissionPct: Number(referralSettings.defaultCommissionPct) || 10,
        commissionScope: referralSettings.commissionScope,
        commissionDuration: referralSettings.commissionDuration || "1_year",
        excludeTransportFee: true,
        siblingDiscountEnabled: true,
        defaultSiblingDiscountPct: Number(referralSettings.defaultSiblingDiscountPct) || 10,
      });
      setReferralSettings(saved);
      showToast("success", "Referral commission policy (Rate, Scope & Year Cap) save ho gayi.");
    } catch (e: any) {
      showToast("error", "Policy save nahi ho saki: " + (e?.message || ""));
    }
    setSavingPolicy(false);
  };

  const openSettleDrawer = (summary: TeacherCommissionSummary) => {
    setSettlingTeacherId(summary.teacherId);
    setExpandedTeacherId(summary.teacherId);
    setPayoutForm({
      amount: summary.balancePayable > 0 ? summary.balancePayable : 0,
      paymentMode: "Cash",
      referenceNo: "",
      remarks: `10% Admission Referral Commission (${summary.studentsCount} students)`,
      paidDate: todayStr(),
    });
  };

  const handleRecordPayout = async (summary: TeacherCommissionSummary) => {
    const amt = Math.round(Number(payoutForm.amount) || 0);
    if (amt <= 0) {
      showToast("error", "Payout rashi ₹0 se adhik honi chahiye.");
      return;
    }
    setSavingPayout(true);
    try {
      const record: TeacherReferralPayout = {
        id: `RPAY_${generateId()}`,
        schoolId: school.id,
        teacherId: summary.teacherId,
        teacherName: summary.teacherName,
        amount: amt,
        paymentMode: payoutForm.paymentMode,
        referenceNo: payoutForm.referenceNo.trim() || undefined,
        remarks: payoutForm.remarks.trim() || "Referral Commission Settlement",
        paidDate: payoutForm.paidDate || todayStr(),
        createdAt: new Date().toISOString(),
      };
      await saveReferralPayout(record);
      setPayoutsList((prev) => [record, ...prev]);
      setSettlingTeacherId(null);
      showToast("success", `₹${amt.toLocaleString("en-IN")} commission payout ${summary.teacherName} ke khate mein darj ho gaya.`);
    } catch (e: any) {
      showToast("error", "Payout save nahi ho saka: " + (e?.message || ""));
    }
    setSavingPayout(false);
  };

  const handleDeletePayout = async (payoutId: string) => {
    await deleteReferralPayout(school.id, payoutId);
    setPayoutsList((prev) => prev.filter((p) => p.id !== payoutId));
    setConfirmDeletePayoutId(null);
    showToast("success", "Payout entry hata di gayi.");
  };

  const handleSettleFromPayslip = async () => {
    if (!slipReferralSummary || slipReferralSummary.balancePayable <= 0) return;
    setSettlingSlipBonus(true);
    try {
      const amt = slipReferralSummary.balancePayable;
      const monthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
      const record: TeacherReferralPayout = {
        id: `RPAY_${generateId()}`,
        schoolId: school.id,
        teacherId: slipReferralSummary.teacherId,
        teacherName: slipReferralSummary.teacherName,
        amount: amt,
        paymentMode: "Salary Slip",
        remarks: `Settled with ${monthLabel} Salary Payslip`,
        paidDate: todayStr(),
        createdAt: new Date().toISOString(),
      };
      await saveReferralPayout(record);
      setPayoutsList((prev) => [record, ...prev]);
      showToast("success", `₹${amt.toLocaleString("en-IN")} referral bonus Salary Slip ke madhyam se settle mark ho gaya.`);
    } catch (e: any) {
      showToast("error", "Bonus settle mark karne mein samasya: " + (e?.message || ""));
    }
    setSettlingSlipBonus(false);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-slate-50 dark:bg-slate-900 pb-16"}>
      {/* Top Navbar */}
      {embedded ? (
        hideInternalNav ? null : (
        <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 sm:px-4 shadow-xs print:hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>HRM Sections</span>
            </span>
            <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl gap-1">
              {(
                [
                  { id: "directory", label: "Staff Directory" },
                  {
                    id: "accountants",
                    label: `Accountants${accountantsList.length > 0 ? ` (${accountantsList.length})` : ""}`,
                  },
                  {
                    id: "referrals",
                    label: `10% Referral Bonus${referralLedger.totals.referredStudents > 0 ? ` (${referralLedger.totals.referredStudents})` : ""}`,
                  },
                  { id: "leaves", label: "Leave Requests" },
                  { id: "salary", label: "Salary / Payslip" },
                ] as { id: HrmTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-xs ring-1 ring-slate-200 dark:ring-teal-500"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        )
      ) : (
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30 print:hidden">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-teal-200 hover:text-white text-sm font-bold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> School Dashboard
              </button>
            ) : (
              <span className="text-xs font-black uppercase tracking-wider text-teal-200 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" /> Staff HRM, Accountants, Leaves &amp; Referrals
              </span>
            )}
            <div className="flex flex-wrap p-1 bg-white/10 rounded-xl gap-1">
              {(
                [
                  { id: "directory", label: "Staff Directory" },
                  {
                    id: "accountants",
                    label: `Accountants${accountantsList.length > 0 ? ` (${accountantsList.length})` : ""}`,
                  },
                  {
                    id: "referrals",
                    label: `10% Referral Bonus${referralLedger.totals.referredStudents > 0 ? ` (${referralLedger.totals.referredStudents})` : ""}`,
                  },
                  { id: "leaves", label: "Leave Requests" },
                  { id: "salary", label: "Salary / Payslip" },
                ] as { id: HrmTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer tabular-nums ${
                    activeTab === tab.id ? "bg-white text-teal-900 shadow" : "text-white/80 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={embedded ? "space-y-6" : "max-w-5xl mx-auto px-4 py-6 space-y-6"}>
        {feedback && (
          <div
            className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between gap-3 print:hidden ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
            }`}
          >
            <span className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              {feedback.text}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] font-black opacity-70 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-teal-600 shrink-0" />
              {hideInternalNav
                ? activeTab === "directory"
                  ? "Staff Directory (सपोर्ट व अन्य स्टाफ)"
                  : activeTab === "accountants"
                  ? "Accountants & Cashier Delegation"
                  : activeTab === "referrals"
                  ? "10% Student Referral Bonus Ledger"
                  : activeTab === "leaves"
                  ? "Staff Leave Requests (अवकाश प्रबंधन)"
                  : "Quick Staff Salary & Payslip"
                : "Staff HRM, Payroll & Referral Incentives"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {hideInternalNav
                ? activeTab === "directory"
                  ? "गैर-शैक्षणिक व सपोर्ट स्टाफ का रिकॉर्ड, वेतन एडिट, ID कार्ड और Accountant असाइनमेंट।"
                  : activeTab === "accountants"
                  ? "फीस संकलन, POS रसीद और कैशियर अधिकारों के लिए Accountant नियुक्त व मैनेज करें।"
                  : activeTab === "referrals"
                  ? "शिक्षकों द्वारा लाए गए प्रवेश पर 10% कमीशन, पॉलिसी और पेआउट सेटलमेंट।"
                  : activeTab === "leaves"
                  ? "स्टाफ व शिक्षकों की छुट्टी (CL/Medical/EL) आवेदन, स्वीकृति और रिकॉर्ड।"
                  : "लेट एंट्री (3:1 कटौती) और 10% रेफरल बोनस के साथ मासिक वेतन स्लिप प्रिंट करें।"
                : "Shikshakon ka record, 10% student referral commission, chhutti aur salary slips ek jagah manage karein."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === "directory" && (
              <button
                onClick={() => setShowAddStaff(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Naya Staff Add Karein
              </button>
            )}
            {activeTab === "leaves" && (
              <button
                onClick={() => setShowApplyLeave(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Chhutti (Leave) Apply Karein
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Admin Daily Attendance & Verification Desk (hidden when managed on Daily Attendance page) */}
        {!(hideAdminAttendanceCard || hideInternalNav) && (
        <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs text-slate-900 dark:text-white print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                    School Admin &amp; Principal Desk (एडमिन हाजिरी)
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 ${
                    adminAttendanceRecord.present
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40"
                      : "bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/40"
                  }`}>
                    {adminAttendanceRecord.present ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    <span>{adminAttendanceRecord.present ? "Present Today" : "Attendance Pending"}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                  {school.principalName || "Principal / School Admin"} · ID: <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">ADMIN-01</span>
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-mono font-semibold tabular-nums">
                  <span>In: <strong className="text-emerald-700 dark:text-emerald-400">{adminAttendanceRecord.inTime || "--:--"}</strong></span>
                  <span>·</span>
                  <span>Out: <strong className="text-amber-700 dark:text-amber-400">{adminAttendanceRecord.outTime || "--:--"}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdminPunch("in")}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Clock size={14} /> Punch In (आगमन)
              </button>
              <button
                type="button"
                onClick={() => handleAdminPunch("out")}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Clock size={14} /> Punch Out (प्रस्थान)
              </button>
            </div>
          </div>
        </div>
        )}

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
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Mobile Number:</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Designation / Pad:</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Maths Teacher, Lab Incharge, Accountant"
                      value={staffForm.designation}
                      onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Monthly Salary (₹):</label>
                    <input
                      type="number"
                      value={staffForm.monthlySalary}
                      onChange={(e) => setStaffForm({ ...staffForm, monthlySalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddStaff(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStaff}
                    className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-black shadow cursor-pointer"
                  >
                    Save Staff Member
                  </button>
                </div>
              </div>
            )}

            {!loading && staffList.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2 border border-slate-200/70 dark:border-slate-700">
                <Users className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Koi Staff Member Added Nahi Hai</p>
                <p className="text-xs">Upar diye button se pehla staff member add karein.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {staffList.map((st) => (
                  <div
                    key={st.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 font-black flex items-center justify-center text-sm">
                        {st.name.slice(0, 1)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingStaffModal({
                              st,
                              name: st.name || "",
                              phone: st.phone || "",
                              employeeId: st.employeeId || "",
                              designation: st.designation || "",
                              department: st.department || "",
                              monthlySalary: Number(st.salaryStructure?.netMonthlySalary ?? st.monthlySalary ?? 0),
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                          title="वेतन व विवरण एडिट करें"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>वेतन एडिट</span>
                        </button>
                        {confirmDeleteStaffId === st.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteStaff(st.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteStaffId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteStaffId(st.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                            title="Remove staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm">{st.name}</h3>
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400">{st.designation}</p>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 tabular-nums">
                        <Phone className="w-3 h-3" /> {st.phone}
                      </p>
                      {Number(st.lateEntriesCount || 0) > 0 ? (
                        <div className="mt-2 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center justify-between tabular-nums">
                          <span>{st.lateEntriesCount} Late Entries</span>
                          <span>Cut: {Math.floor(Number(st.lateEntriesCount) / 3)} Day</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          0 Late Entries (Full Pay)
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t dark:border-slate-700 flex justify-between items-center text-xs">
                      <span className="text-slate-400">Monthly Salary:</span>
                      <span className="font-black tabular-nums text-slate-800 dark:text-slate-200">
                        ₹{Number(st.salaryStructure?.netMonthlySalary ?? st.monthlySalary ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForIdCard(st)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>ID Card</span>
                      </button>
                      {accountantsList.some((a) => a.teacherRef === st.id || (st.phone && a.phone === st.phone)) ? (
                        <span className="py-1.5 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-black flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5 text-amber-600" /> Accountant Active
                        </span>
                      ) : !hideInternalNav ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleTeacherSearchOrSelect(st.id);
                            setActiveTab("accountants");
                            setShowAddAccountantModal(true);
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition shrink-0"
                          title="इस शिक्षक/स्टाफ को Accountant बनाएं"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Accountant बनाएं</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: ACCOUNTANTS & CASHIER DELEGATION */}
        {activeTab === "accountants" && (
          <div className="space-y-5">
            {/* Header & Add Button */}
            <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-amber-500/20">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <span>Accountant व वित्तीय शक्तियां • ROLE & PERMISSIONS DELEGATION</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-1">
                  विद्यालय Accountants व कैशियर (Accountants)
                </h2>
                <p className="text-slate-300 text-xs mt-1 max-w-xl">
                  अध्यापकों के पास केवल शिक्षण व उपस्थिति कार्य रहता है। फीस संकलन, 3" POS रसीद, प्रवेश व खर्च वाउचर हेतु Accountant नियुक्त करें तथा अपनी आवश्यकतानुसार शक्तियां सौंपें।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddAccountantModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया Accountant जोड़ें</span>
              </button>
            </div>

            {/* Quick 1-Click Teacher ID to Accountant Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border-2 border-amber-400/80 dark:border-amber-500/60 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>शिक्षक ID डालकर तुरंत Accountant बनाएं</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      शिक्षक की ID, मोबाइल नंबर या नाम दर्ज करें — सिस्टम उनका पूरा रिकॉर्ड लोड करके तुरंत Accountant बना देगा।
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 self-start sm:self-auto border border-amber-300 dark:border-amber-700">
                  ⚡ 1-Click Instant Assignment
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="शिक्षक ID (उदा. TCH-01, शिक्षक का नाम या मोबाइल)..."
                    value={quickTeacherIdInput}
                    onChange={(e) => setQuickTeacherIdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleDirectAssignTeacherAsAccountant(quickTeacherIdInput);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setQuickTeacherIdInput(e.target.value);
                      handleDirectAssignTeacherAsAccountant(e.target.value);
                    }
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border-0 cursor-pointer"
                >
                  <option value="">-- या शिक्षक लिस्ट से चुनें ({teachersList.length + staffList.length}) --</option>
                  {teachersList.map((t) => (
                    <option key={`q_${t.id}`} value={t.id}>
                      👨‍🏫 {t.name} (ID: {t.employeeId || t.id.slice(-6)})
                    </option>
                  ))}
                  {staffList.map((s) => (
                    <option key={`qs_${s.id}`} value={s.id}>
                      👔 {s.name} (ID: {s.employeeId || s.id.slice(-6)})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleDirectAssignTeacherAsAccountant(quickTeacherIdInput)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>तुरंत Accountant बनाएं</span>
                </button>
              </div>
            </div>

            {/* List of Accountants */}
            {accountantsList.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 text-center border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  अभी कोई Accountant नहीं जोड़ा गया है
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  विद्यालय में फीस काउंटर और प्रवेश संभालने के लिए Accountant जोड़ें। उन्हें क्या अधिकार देना है, उसका पूरा नियंत्रण आपके हाथ में रहेगा।
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddAccountantModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 transition cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>पहला Accountant नियुक्त करें</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {accountantsList.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4"
                  >
                    {/* Top Row: Basic Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-md">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 dark:text-white text-base">{acc.name}</h3>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                              {acc.employeeId || "ACC"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{acc.designation || "Accountant & Cashier"}</span>
                            <span>•</span>
                            <span className="tabular-nums">मो.: {acc.phone}</span>
                            {acc.monthlySalary ? (
                              <>
                                <span>•</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  वेतन: ₹{acc.monthlySalary.toLocaleString("en-IN")}/माह
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-2 self-end sm:self-auto">
                        {findLinkedTeacherForAccountant(acc) ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                            <span>✓ Teacher Active</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConvertAccountantToTeacherModal(acc)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                            title="इस Accountant को Teacher भी बनाएं"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Teacher बनाएं</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSignatureTargetAccountant(acc)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            acc.signatureUrl
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                              : "bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                          }`}
                          title="Accountant का Fee Receipt डिजिटल हस्ताक्षर जोड़ें या बदलें"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>{acc.signatureUrl ? "✍️ Sign अपडेट करें" : "✍️ Sign जोड़ें"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEditingAccountantModal({
                              acc,
                              name: acc.name || "",
                              phone: acc.phone || "",
                              employeeId: acc.employeeId || "",
                              designation: acc.designation || "Accountant & Cashier",
                              monthlySalary: Number(acc.salaryStructure?.netMonthlySalary ?? acc.monthlySalary ?? 0),
                              signatureUrl: acc.signatureUrl || "",
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-xs font-black transition flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Accountant का मासिक वेतन (पैसा) और विवरण एडिट करें"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>वेतन / विवरण एडिट</span>
                        </button>

                        {confirmDeleteAccountantId === acc.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAccountant(school.id, acc.id);
                                setAccountantsList((prev) => prev.filter((a) => a.id !== acc.id));
                                setConfirmDeleteAccountantId(null);
                                showToast("success", `${acc.name} को सफलता पूर्वक हटा दिया गया।`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-black transition cursor-pointer"
                            >
                              पक्का हटाएं
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteAccountantId(null)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                            >
                              रद्द करें
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAccountantId(acc.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>हटाएं</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Permissions Matrix */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>Admin द्वारा सौंपी गई वित्तीय शक्तियां (Delegated Permissions)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {[
                          {
                            key: "canCollectFee" as keyof AccountantPermissions,
                            label: "फीस संकलन व 3\" POS थर्मल रसीद",
                            desc: "छात्र फीस जमा करना व रसीद प्रिंट करना",
                          },
                          {
                            key: "canAdmitStudents" as keyof AccountantPermissions,
                            label: "ऑनलाइन व सीधा प्रवेश (Admissions)",
                            desc: "फॉर्म भरना व आवेदन अप्रूव करना",
                          },
                          {
                            key: "canGrantDiscount" as keyof AccountantPermissions,
                            label: "फीस में छूट / कंसेशन देना",
                            desc: "विशेष परिस्थिति में शुल्क छूट लागू करना",
                          },
                          {
                            key: "canRecordExpenses" as keyof AccountantPermissions,
                            label: "विद्यालय खर्च वाउचर दर्ज करना",
                            desc: "दैनिक स्टेशनरी, डीजल व मरम्मत खर्च",
                          },
                          {
                            key: "canViewDayBook" as keyof AccountantPermissions,
                            label: "दैनिक रोकड़ बही (Cashbook) मिलान",
                            desc: "शाम को नकद व UPI का हिसाब मिलाना",
                          },
                          {
                            key: "canSendFeeAlerts" as keyof AccountantPermissions,
                            label: "WhatsApp व SMS बकाया अलर्ट",
                            desc: "अभिभावकों को बकाया शुल्क सूचना भेजना",
                          },
                          {
                            key: "canManageBusFee" as keyof AccountantPermissions,
                            label: "बस व परिवहन शुल्क संभालना",
                            desc: "वाहन रूट अनुसार शुल्क संकलन",
                          },
                          {
                            key: "canManageAbsentee" as keyof AccountantPermissions,
                            label: "अनुपस्थिति प्रबंधन व कॉल एक्शन",
                            desc: "छात्र गैरहाजिरी देखना, कॉल करना व छुट्टी दर्ज करना",
                          },
                        ].map((perm) => {
                          const isEnabled = Boolean(acc.permissions?.[perm.key]);
                          return (
                            <button
                              key={perm.key}
                              type="button"
                              onClick={async () => {
                                const nextPerms: AccountantPermissions = {
                                  ...(acc.permissions || {}),
                                  [perm.key]: !isEnabled,
                                } as AccountantPermissions;
                                const updated = { ...acc, permissions: nextPerms };
                                await saveAccountant(updated);
                                setAccountantsList((prev) =>
                                  prev.map((a) => (a.id === acc.id ? updated : a))
                                );
                                showToast(
                                  "success",
                                  `${acc.name}: ${perm.label} ${!isEnabled ? "सक्रिय (ON)" : "बंद (OFF)"} किया गया`
                                );
                              }}
                              className={`p-3 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                                isEnabled
                                  ? "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40 text-slate-900 dark:text-white"
                                  : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-400"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  isEnabled
                                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                                    : "bg-slate-200 dark:bg-slate-700 text-transparent"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <div>
                                <div className="text-xs font-bold leading-snug">{perm.label}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {perm.desc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 10% TEACHER REFERRAL COMMISSION LEDGER */}
        {activeTab === "referrals" && (
          <div className="space-y-5">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Referred Students</span>
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white mt-1">
                  {referralLedger.totals.referredStudents}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {referralLedger.teachers.filter((t) => t.studentsCount > 0).length} active teachers bringing admissions
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Paid Fee (Excl. Bus)</span>
                  <IndianRupee className="w-4 h-4 text-teal-500" />
                </div>
                <p className="text-2xl font-black tabular-nums text-teal-700 dark:text-teal-300 mt-1">
                  ₹{referralLedger.totals.eligibleCollected.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Actual collected net fee after sibling discount
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Earned Commission</span>
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{referralLedger.totals.earnedCommission.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold tabular-nums mt-0.5">
                  Locked on unpaid fee: ₹{referralLedger.totals.pendingCommission.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Balance Payable</span>
                  <Wallet className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-black tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                  ₹{referralLedger.totals.balancePayable.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                  Already paid out: ₹{referralLedger.totals.paidOut.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Admin Referral & Sibling Policy Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-teal-600" />
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    School Referral &amp; Same-Family Discount Policy
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Rule: Commission sirf jama (paid) fee par milta hai • Bus/Van fee shamil nahi hota
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Default Teacher Commission (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={referralSettings.defaultCommissionPct}
                    onChange={(e) =>
                      setReferralSettings((prev) => ({
                        ...prev,
                        defaultCommissionPct: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-black tabular-nums text-slate-900 dark:text-white border-0"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Commission Calculation Scope
                  </label>
                  <select
                    value={referralSettings.commissionScope}
                    onChange={(e) =>
                      setReferralSettings((prev) => ({
                        ...prev,
                        commissionScope: e.target.value as ReferralCommissionScope,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-900 dark:text-white border-0"
                  >
                    <option value="all_fees">All Paid Fees (Admission + Tuition)</option>
                    <option value="admission_only">Admission Receipt Only (1-Time)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Admin Allowed Duration Cap
                  </label>
                  <select
                    value={referralSettings.commissionDuration || "1_year"}
                    onChange={(e) =>
                      setReferralSettings((prev) => ({
                        ...prev,
                        commissionDuration: e.target.value as ReferralCommissionDuration,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-900 dark:text-white border-0"
                  >
                    <option value="1_year">1st Year Session Cap (1 साल)</option>
                    <option value="2_years">2 Years Cap (2 साल तक)</option>
                    <option value="lifetime">Lifetime (जब तक पढ़े)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Default Sibling Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={referralSettings.defaultSiblingDiscountPct}
                    onChange={(e) =>
                      setReferralSettings((prev) => ({
                        ...prev,
                        defaultSiblingDiscountPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-black tabular-nums text-slate-900 dark:text-white border-0"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveReferralPolicy}
                  disabled={savingPolicy}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black shadow cursor-pointer"
                >
                  {savingPolicy ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </div>

            {/* All Teachers 10% Referral Eligibility Controls (Admin Only) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    Teachers Referral Access (किसे 10% Referral देना है)
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                  {teachersList.filter((tc) => tc.hasReferralIncentive).length} / {teachersList.length} Active
                </span>
              </div>

              {teachersList.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Abhi koi teacher record nahi mila.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {teachersList.map((tc) => {
                    const isOn = Boolean(tc.hasReferralIncentive);
                    return (
                      <div
                        key={`ref-perm-${tc.id}`}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                          isOn
                            ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                            : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {tc.name}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {tc.designation || "Faculty"}{tc.employeeId ? ` · ${tc.employeeId}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const nextVal = !isOn;
                            await updateTeacher(school.id, tc.id, { hasReferralIncentive: nextVal });
                            setTeachersList((prev) =>
                              prev.map((item) =>
                                item.id === tc.id ? { ...item, hasReferralIncentive: nextVal } : item
                              )
                            );
                            showToast(
                              "success",
                              `${tc.name} ke liye 10% Referral Incentive ${nextVal ? "चालू (ON)" : "बंद (OFF)"} kar diya gaya.`
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black border shrink-0 transition cursor-pointer active:scale-95 ${
                            isOn
                              ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          {isOn ? "Referral ON" : "Referral OFF"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Per-Teacher Commission Ledger */}
            {referralLedger.teachers.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-200/80 dark:border-slate-700 space-y-2">
                <Award className="w-10 h-10 mx-auto text-teal-600/40" />
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                  Abhi kisi student admission par Teacher Referral mark nahi hua hai
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Jab aap Direct Admission ya Online Admission Approve karte samay &ldquo;Referred By Teacher&rdquo; chunenge, unka 10% hisab aur student-wise fee status yahan apne aap dikhega.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referralLedger.teachers.map((t) => {
                  const isExpanded = expandedTeacherId === t.teacherId;
                  const isSettling = settlingTeacherId === t.teacherId;

                  return (
                    <div
                      key={t.teacherId}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden"
                    >
                      <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-sm shrink-0">
                            {t.teacherName.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                              {t.teacherName}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              {t.designation}
                              {t.phone ? ` • ${t.phone}` : ""}
                            </p>
                            {(() => {
                              const tchObj = teachersList.find(tc => tc.id === t.teacherId || tc.name === t.teacherName);
                              if (!tchObj) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextVal = !tchObj.hasReferralIncentive;
                                    await updateTeacher(school.id, tchObj.id, { hasReferralIncentive: nextVal });
                                    setTeachersList(prev => prev.map(tc => tc.id === tchObj.id ? { ...tc, hasReferralIncentive: nextVal } : tc));
                                    showToast("success", `${tchObj.name} ke liye 10% Referral Incentive ${nextVal ? "चालू (ON)" : "बंद (OFF)"} kar diya gaya.`);
                                  }}
                                  className={`mt-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border transition inline-flex items-center gap-1 cursor-pointer active:scale-95 ${
                                    tchObj.hasReferralIncentive
                                      ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                                      : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-750 dark:text-slate-400 dark:border-slate-600"
                                  }`}
                                  title="Teacher Referral Incentive Permission toggle"
                                >
                                  <span>{tchObj.hasReferralIncentive ? "10% Referral: ON (Active)" : "10% Referral: OFF (Disabled)"}</span>
                                </button>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right tabular-nums flex-1 max-w-xl">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Students</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {t.studentsCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Paid Fee</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                              ₹{t.totalEligibleFeeCollected.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Earned (10%)</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              ₹{t.totalEarnedCommission.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Payable Due</span>
                            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                              ₹{t.balancePayable.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {accountantsList.some((a) => a.teacherRef === t.teacherId || (t.phone && a.phone === t.phone)) ? (
                            <span className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-black flex items-center gap-1">
                              <Check className="w-3 h-3 text-amber-600" /> Accountant
                            </span>
                          ) : !hideInternalNav ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleTeacherSearchOrSelect(t.teacherId);
                                setActiveTab("accountants");
                                setShowAddAccountantModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
                              title="इस शिक्षक को Accountant बनाएं"
                            >
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Accountant बनाएं</span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openSettleDrawer(t)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer transition"
                          >
                            Pay / Settle
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedTeacherId(isExpanded ? null : t.teacherId)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>Details</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Inline Payout Form */}
                      {isSettling && (
                        <div className="px-4 py-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-t border-emerald-200/70 dark:border-emerald-800/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                              Record Commission Payment — {t.teacherName}
                            </p>
                            <span className="text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                              Current Payable: ₹{t.balancePayable.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Amount Paid (₹)
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={payoutForm.amount}
                                onChange={(e) =>
                                  setPayoutForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black tabular-nums"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Payment Mode
                              </label>
                              <select
                                value={payoutForm.paymentMode}
                                onChange={(e) =>
                                  setPayoutForm((prev) => ({
                                    ...prev,
                                    paymentMode: e.target.value as TeacherReferralPayout["paymentMode"],
                                  }))
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                              >
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Salary Slip">Salary Slip</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                value={payoutForm.paidDate}
                                onChange={(e) =>
                                  setPayoutForm((prev) => ({ ...prev, paidDate: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Remarks / UTR No.
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Paid via UPI / Cash"
                                value={payoutForm.remarks}
                                onChange={(e) =>
                                  setPayoutForm((prev) => ({ ...prev, remarks: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSettlingTeacherId(null)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingPayout}
                              onClick={() => handleRecordPayout(t)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
                            >
                              {savingPayout ? "Saving..." : "Confirm Payout"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expanded Student-Wise & Payout Breakdown */}
                      {isExpanded && (
                        <div className="border-t border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-4">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                              Referred Students ({t.students.length})
                            </h4>
                            {t.students.length === 0 ? (
                              <p className="text-xs text-slate-400">No active referred students.</p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                    <tr>
                                      <th className="p-2.5 font-bold">Student</th>
                                      <th className="p-2.5 font-bold">Class / Adm No</th>
                                      <th className="p-2.5 font-bold text-right">Paid Fee (Excl. Bus)</th>
                                      <th className="p-2.5 font-bold text-right">Rate</th>
                                      <th className="p-2.5 font-bold text-right">Earned</th>
                                      <th className="p-2.5 font-bold text-right">Unpaid Fee Locked</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 tabular-nums">
                                    {t.students.map((s) => (
                                      <tr key={s.studentId}>
                                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                                          <div>{s.studentName}</div>
                                          {s.isSiblingMarked && (
                                            <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                              Same-Family Discount Applied
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-slate-500">
                                          {s.className} • #{s.admissionNo}
                                        </td>
                                        <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-200">
                                          ₹{s.eligiblePaidExclBus.toLocaleString("en-IN")}
                                        </td>
                                        <td className="p-2.5 text-right text-slate-500">
                                          <div>{s.commissionPct}%</div>
                                          <div className="text-[10px] text-slate-400">
                                            {formatReferralDurationLabel(s.commissionDuration)}
                                          </div>
                                        </td>
                                        <td className="p-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                                          ₹{s.earnedCommission.toLocaleString("en-IN")}
                                        </td>
                                        <td className="p-2.5 text-right text-amber-600 dark:text-amber-400">
                                          ₹{s.pendingCommission.toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {t.payouts.length > 0 && (
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                                Payout History (Paid: ₹{t.totalPaidOut.toLocaleString("en-IN")})
                              </h4>
                              <div className="space-y-1.5">
                                {t.payouts.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700 text-xs"
                                  >
                                    <div>
                                      <span className="font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                                        ₹{p.amount.toLocaleString("en-IN")}
                                      </span>
                                      <span className="text-slate-500 ml-2">
                                        via {p.paymentMode} on {p.paidDate}
                                      </span>
                                      {p.remarks && (
                                        <span className="text-slate-400 ml-2">— {p.remarks}</span>
                                      )}
                                    </div>
                                    {confirmDeletePayoutId === p.id ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePayout(p.id)}
                                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeletePayoutId(null)}
                                          className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeletePayoutId(p.id)}
                                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                        title="Remove payout entry"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEAVE REQUESTS */}
        {activeTab === "leaves" && (
          <div className="space-y-4">
            {showApplyLeave && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-indigo-500 shadow-md space-y-4">
                <h3 className="font-black text-slate-900 dark:text-white text-base">Chhutti (Leave) Apply Karein</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Teacher / Staff Member Chuno:</label>
                    <select
                      value={leaveForm.staffId}
                      onChange={(e) => setLeaveForm({ ...leaveForm, staffId: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    >
                      {leaveCandidates.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.designation})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Leave Type:</label>
                    <select
                      value={leaveForm.leaveType}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, leaveType: e.target.value as StaffLeave["leaveType"] })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    >
                      <option value="casual">Casual Leave (CL)</option>
                      <option value="sick">Medical / Sick Leave</option>
                      <option value="earned">Earned Leave (EL)</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Kab Se (From):</label>
                    <input
                      type="date"
                      value={leaveForm.fromDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Kab Tak (To):</label>
                    <input
                      type="date"
                      value={leaveForm.toDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Karan (Reason):</label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent family matter, viral fever..."
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-xl border-0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowApplyLeave(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyLeave}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow cursor-pointer"
                  >
                    Submit Leave Application
                  </button>
                </div>
              </div>
            )}

            {leavesList.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2 border border-slate-200/70 dark:border-slate-700">
                <Clock className="w-10 h-10 mx-auto opacity-30 text-indigo-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Koi Leave Request Nahi Hai</p>
                <p className="text-xs">Teachers व स्टाफ द्वारा भेजे गए सभी leave applications यहाँ लाइव दिखेंगे।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leavesList.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-black text-slate-900 dark:text-white text-sm">{l.staffName}</span>
                        <span className="text-xs text-slate-400">({l.designation})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                          {l.leaveType}
                        </span>
                        {l.days ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                            {l.days} दिन
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {l.fromDate} to {l.toDate} ·{" "}
                        <strong className="text-slate-800 dark:text-white">{l.reason}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {l.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleUpdateLeave(l.id, "approved")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateLeave(l.id, "rejected")}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-lg ${
                            l.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {l.status === "approved" ? "Approved" : "Rejected"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SALARY PAYSLIP */}
        {activeTab === "salary" && (() => {
          const payslipPeople: StaffEmployee[] = (() => {
            const byId = new Map<string, StaffEmployee>();
            staffList.forEach((s) => {
              if (s?.id) byId.set(s.id, s);
            });
            teachersList.forEach((t) => {
              if (!t?.id || byId.has(t.id)) return;
              byId.set(t.id, {
                id: t.id,
                schoolId: school.id,
                name: t.name,
                email: (t as any).email || "",
                phone: t.phone || "",
                employeeId: t.employeeId || t.id,
                designation: t.designation || "Teacher",
                department: "Academic",
                monthlySalary: Number((t as any).monthlySalary || (t as any).salary || 0),
                joinDate: (t as any).joiningDate || todayStr(),
                active: true,
                createdAt: (t as any).createdAt || new Date().toISOString(),
              });
            });
            return Array.from(byId.values());
          })();

          const activeSlipPerson =
            (selectedStaffForSlip &&
              payslipPeople.find((p) => p.id === selectedStaffForSlip.id)) ||
            payslipPeople[0] ||
            null;

          let autoPresentDays = 0;
          let autoLateDays = 0;
          let autoAbsentDays = 0;
          if (activeSlipPerson?.id) {
            Object.values(monthlyAttMap || {}).forEach((dayRecs) => {
              const entry = dayRecs?.[activeSlipPerson.id];
              if (!entry) return;
              if (entry.present === true) autoPresentDays++;
              else if (entry.present === false) autoAbsentDays++;
              if (entry.present !== false && (entry.status === "late" || entry.isLate === true)) {
                autoLateDays++;
              }
            });
          }

          return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Staff Member Chuno:</span>
                <select
                  value={activeSlipPerson?.id || ""}
                  onChange={(e) =>
                    setSelectedStaffForSlip(payslipPeople.find((s) => s.id === e.target.value) || null)
                  }
                  className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {payslipPeople.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.designation})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePrintSlip}
                disabled={!activeSlipPerson}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Payslip
              </button>
            </div>

            {activeSlipPerson ? (
              <div className="space-y-4">
                {/* Auto Daily Attendance Live Tracker Strip */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Auto Track: Present</span>
                    <span className="text-lg font-black text-emerald-900 dark:text-white tabular-nums">{autoPresentDays} दिन</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block">Auto Track: Late</span>
                    <span className="text-lg font-black text-amber-700 dark:text-amber-300 tabular-nums">{autoLateDays} दिन</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300 block">Auto Track: Absent</span>
                    <span className="text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">{autoAbsentDays} दिन</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-300 block">आज तक बना पैसा</span>
                    <span className="text-lg font-black text-teal-800 dark:text-teal-200 tabular-nums">
                      ₹{Math.max(
                        0,
                        Math.round((activeSlipPerson.monthlySalary / 26) * autoPresentDays) -
                          Math.floor(Math.max(autoLateDays, lateDaysMap[activeSlipPerson.id] ?? 0) / 3) *
                            Math.round(activeSlipPerson.monthlySalary / 30)
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Late Entry Cut Control */}
                <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        Teacher Attendance &amp; Late Entry Salary Cut Rule
                      </span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100">
                        3 Days Late = 1 Day Salary Cut
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
                      3 din late aane par 1 din ka salary cut hota hai. Daily rate = ₹
                      {Math.round(activeSlipPerson.monthlySalary / 30)}/day · Cloud Auto Late: {autoLateDays}d
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Late Days (This Month):
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={
                        lateDaysMap[activeSlipPerson.id] ??
                        Math.max(autoLateDays, activeSlipPerson.lateEntriesCount || 0)
                      }
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setLateDaysMap((prev) => ({ ...prev, [activeSlipPerson.id]: val }));
                      }}
                      className="w-16 px-2 py-1 text-xs font-black tabular-nums bg-slate-100 dark:bg-slate-700 rounded-lg text-center border-0 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Unpaid Referral Commission Integration into Salary Slip */}
                {slipReferralSummary && slipReferralSummary.studentsCount > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeReferralInSlip}
                        onChange={(e) => setIncludeReferralInSlip(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded"
                      />
                      <div>
                        <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 block">
                          Include Unpaid 10% Student Referral Bonus in Payslip (+₹
                          {slipReferralSummary.balancePayable.toLocaleString("en-IN")})
                        </span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {slipReferralSummary.studentsCount} referred students • Total earned ₹
                          {slipReferralSummary.totalEarnedCommission.toLocaleString("en-IN")} • Paid out ₹
                          {slipReferralSummary.totalPaidOut.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </label>

                    {slipReferralSummary.balancePayable > 0 && (
                      <button
                        type="button"
                        disabled={settlingSlipBonus}
                        onClick={handleSettleFromPayslip}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
                      >
                        {settlingSlipBonus
                          ? "Marking..."
                          : `Mark ₹${slipReferralSummary.balancePayable.toLocaleString("en-IN")} Settled`}
                      </button>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-2xl border-2 border-slate-900 p-8 shadow-xl max-w-2xl mx-auto text-slate-900 print:shadow-none print:border-2 print:m-0 print:max-w-none">
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
                    <h2 className="text-2xl font-black uppercase text-slate-900">{school.name}</h2>
                    <p className="text-xs text-slate-600">{school.address}</p>
                    <span className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white font-black text-xs uppercase mt-2">
                      MONTHLY SALARY SLIP
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                    <div>
                      <span className="text-slate-500 font-bold">Employee Name: </span>
                      <strong className="text-slate-900 text-sm">{activeSlipPerson.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Designation: </span>
                      <strong className="text-slate-900">{activeSlipPerson.designation}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Phone Number: </span>
                      <strong className="text-slate-900 tabular-nums">{activeSlipPerson.phone || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Pay Month: </span>
                      <strong className="text-slate-900">
                        {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}
                      </strong>
                    </div>
                  </div>

                  {(() => {
                    const nowSlip = new Date();
                    const daysInMonthSlip = new Date(nowSlip.getFullYear(), nowSlip.getMonth() + 1, 0).getDate();
                    let totalWorkingSlip = 0;
                    let runningWorkingSlip = 0;
                    for (let d = 1; d <= daysInMonthSlip; d++) {
                      const dt = new Date(nowSlip.getFullYear(), nowSlip.getMonth(), d);
                      if (dt.getDay() !== 0) {
                        totalWorkingSlip++;
                        if (d <= nowSlip.getDate()) runningWorkingSlip++;
                      }
                    }
                    const effectiveWorkingDays = totalWorkingSlip || 26;
                    const lateCount =
                      lateDaysMap[activeSlipPerson.id] ??
                      Math.max(autoLateDays, activeSlipPerson.lateEntriesCount || 0);
                    const workingDailyRate = Math.round(activeSlipPerson.monthlySalary / effectiveWorkingDays);
                    const deductedDays = Math.floor(lateCount / 3);
                    const lateDeduction = deductedDays * workingDailyRate;
                    const absentDeduction = autoAbsentDays * workingDailyRate;
                    const bonusEligibleSlip = autoPresentDays > 0 && autoAbsentDays === 0;
                    const bonusAmountSlip = bonusEligibleSlip ? 2 * workingDailyRate : 0;
                    const totalCutDaysSlip = autoAbsentDays + deductedDays;
                    const referralBonusIncluded =
                      includeReferralInSlip && slipReferralSummary
                        ? slipReferralSummary.balancePayable
                        : 0;
                    const netSalary = Math.max(
                      0,
                      activeSlipPerson.monthlySalary + bonusAmountSlip - absentDeduction - lateDeduction + referralBonusIncluded
                    );
                    const earnedTillDate = Math.max(
                      0,
                      workingDailyRate * autoPresentDays + bonusAmountSlip - lateDeduction + referralBonusIncluded
                    );

                    return (
                      <>
                        <div className="grid grid-cols-3 gap-2.5 text-xs mb-4">
                          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
                            <span className="text-[10px] font-black text-teal-700 uppercase block">Running Days</span>
                            <strong className="text-sm font-black text-teal-950">{runningWorkingSlip} / {effectiveWorkingDays} दिन</strong>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] font-black text-emerald-700 uppercase block">Present / Absent</span>
                            <strong className="text-sm font-black text-emerald-950">P: {autoPresentDays}d · A: {autoAbsentDays}d</strong>
                          </div>
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                            <span className="text-[10px] font-black text-rose-700 uppercase block">कितने दिन कटा</span>
                            <strong className="text-sm font-black text-rose-900">{totalCutDaysSlip} दिन (Late: {lateCount}d)</strong>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-xl border mb-4 text-xs font-bold flex items-center justify-between ${
                          bonusAmountSlip > 0
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-amber-50 border-amber-300 text-amber-900"
                        }`}>
                          <span>
                            {bonusAmountSlip > 0
                              ? "✅ बोनस मिला: +2 दिन का नियमित उपस्थिति बोनस (0 Absent)"
                              : autoPresentDays === 0
                              ? "⏳ बोनस अभी लागू नहीं (0 दिन उपस्थिति)"
                              : `❌ बोनस नहीं मिला (${autoAbsentDays} दिन अनुपस्थित होने पर बोनस निरस्त)`}
                          </span>
                          <span className="font-black">+₹{bonusAmountSlip.toLocaleString("en-IN")}</span>
                        </div>

                        <table className="w-full text-left text-xs border border-slate-300 rounded-xl overflow-hidden mb-4 tabular-nums">
                          <thead className="bg-slate-800 text-white">
                            <tr>
                              <th className="p-2.5">Earnings &amp; Deductions Description</th>
                              <th className="p-2.5 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="p-2.5 font-bold">
                                तय मासिक वेतन (Monthly Fixed · ₹{workingDailyRate}/दिन दर)
                              </td>
                              <td className="p-2.5 text-right font-black">
                                ₹{activeSlipPerson.monthlySalary.toLocaleString("en-IN")}
                              </td>
                            </tr>
                            <tr className="bg-teal-50/70 text-teal-950">
                              <td className="p-2.5 font-bold">
                                इस माह उपस्थिति कमाई ({autoPresentDays} Present × ₹{workingDailyRate}/दिन)
                              </td>
                              <td className="p-2.5 text-right font-black text-teal-800">
                                ₹{(workingDailyRate * autoPresentDays).toLocaleString("en-IN")}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold">
                                Attendance Bonus ({bonusAmountSlip > 0 ? "मिला: +2 दिन" : "नहीं मिला"})
                              </td>
                              <td className="p-2.5 text-right font-black text-emerald-700">
                                {bonusAmountSlip > 0 ? `+₹${bonusAmountSlip.toLocaleString("en-IN")}` : "₹0"}
                              </td>
                            </tr>
                            {referralBonusIncluded > 0 && slipReferralSummary && (
                              <tr className="bg-emerald-50/70 text-emerald-950">
                                <td className="p-2.5 font-bold">
                                  Student Admission Referral Incentive ({slipReferralSummary.studentsCount} Students • Paid Fee Basis)
                                </td>
                                <td className="p-2.5 text-right font-black text-emerald-700">
                                  +₹{referralBonusIncluded.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            )}
                            <tr className={autoAbsentDays > 0 ? "bg-rose-50 text-rose-900" : ""}>
                              <td className="p-2.5 font-bold">
                                Absent कटौती ({autoAbsentDays} दिन अनुपस्थित × ₹{workingDailyRate})
                              </td>
                              <td className="p-2.5 text-right font-black text-rose-700">
                                {absentDeduction > 0 ? `-₹${absentDeduction.toLocaleString("en-IN")}` : "₹0"}
                              </td>
                            </tr>
                            {deductedDays > 0 ? (
                              <tr className="bg-rose-50 text-rose-900">
                                <td className="p-2.5 font-bold">
                                  Late Entry Penalty ({lateCount} Late Days @ 3:1 Ratio = -{deductedDays} Day Cut)
                                </td>
                                <td className="p-2.5 text-right font-black text-rose-700">
                                  -₹{lateDeduction.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ) : (
                              <tr>
                                <td className="p-2.5 text-slate-500">Late Penalty ({lateCount} Late Days · 0 Cut)</td>
                                <td className="p-2.5 text-right text-slate-500">₹0</td>
                              </tr>
                            )}
                            <tr className="bg-emerald-50 text-emerald-950 font-black text-sm">
                              <td className="p-2.5">
                                इस माह आज तक बना / देय वेतन (Earned Payable Till Today)
                                <span className="block text-[10px] font-semibold text-emerald-700">
                                  पूरा माह Net (यदि पूरे {effectiveWorkingDays} दिन चलें): ₹{netSalary.toLocaleString("en-IN")}
                                </span>
                              </td>
                              <td className="p-2.5 text-right text-emerald-800 text-lg">
                                ₹{earnedTillDate.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-700 mb-4 space-y-0.5">
                          <div className="font-black text-teal-800 uppercase text-[10px]">Applied Salary &amp; Attendance Rules:</div>
                          <div>• 1 दिन अनुपस्थित = 1 दिन (₹{workingDailyRate}) वेतन कटौती • 3 दिन लेट = 1 दिन कटौती • 0 अनुपस्थिति पर +2 दिन बोनस</div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                    <div>
                      <div className="h-10 border-b border-slate-400 mb-1"></div>
                      <p className="font-bold text-slate-600">Employee Signature</p>
                    </div>
                    <div>
                      <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
                        <span className="italic font-serif font-black text-indigo-700">
                          Authorized Signatory
                        </span>
                      </div>
                      <p className="font-black text-slate-900 uppercase">Principal / Accounts Head</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center text-xs text-slate-500 border border-slate-200/70 dark:border-slate-700">
                Pehle Teachers / Staff add karein, phir unka Salary Slip aur Auto Daily Earned amount dekhein.
              </div>
            )}
          </div>
          );
        })()}

        {/* ADD ACCOUNTANT MODAL */}
        {showAddAccountantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      नया Accountant नियुक्त करें
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      वित्तीय शक्तियां व अधिकार तय करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAccountantModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!accountantForm.name.trim() || !accountantForm.phone.trim()) {
                    showToast("error", "कृपया नाम व मोबाइल नंबर दर्ज करें।");
                    return;
                  }

                  const newAcc: SchoolAccountant = {
                    id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    schoolId: school.id,
                    name: accountantForm.name.trim(),
                    phone: accountantForm.phone.trim(),
                    employeeId: accountantForm.employeeId.trim() || `ACC-${accountantsList.length + 1}`,
                    designation: accountantForm.designation.trim() || "Accountant & Cashier",
                    monthlySalary: Number(accountantForm.monthlySalary) || 25000,
                    joinDate: todayStr(),
                    active: true,
                    permissions: accountantForm.permissions,
                    teacherRef: accountantForm.teacherRef,
                    createdAt: new Date().toISOString(),
                  };

                  await saveAccountant(newAcc);
                  setAccountantsList((prev) => [newAcc, ...prev]);
                  setShowAddAccountantModal(false);
                  showToast("success", `${newAcc.name} को सफलता पूर्वक Accountant नियुक्त किया गया!`);
                  setTeacherSearchQuery("");
                  setMatchedTeacherInfo(null);
                  setAccountantForm({
                    name: "",
                    phone: "",
                    employeeId: `ACC-0${accountantsList.length + 2}`,
                    designation: "Senior Accountant & Cashier",
                    monthlySalary: 25000,
                    permissions: {
                      canCollectFee: true,
                      canAdmitStudents: true,
                      canGrantDiscount: true,
                      maxDiscountLimitPct: 20,
                      canRecordExpenses: true,
                      canViewDayBook: true,
                      canSendFeeAlerts: true,
                      canManageBusFee: true,
                      canPrintIdCards: true,
                      canManageAbsentee: true,
                    },
                  });
                }}
                className="space-y-4 text-xs"
              >
                {/* ── TEACHER ID AUTO-ASSIGN & FAST FILL BOX ─────────────────── */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>शिक्षक ID से स्वतः Accountant बनाएं (Auto-Fill by Teacher ID)</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                      1-क्लिक आईडी असाइन
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Input for typing Teacher ID / Mobile / Name */}
                    <div>
                      <input
                        type="text"
                        placeholder="शिक्षक ID (e.g. TCH-01), मोबाइल या नाम लिखें..."
                        value={teacherSearchQuery}
                        onChange={(e) => handleTeacherSearchOrSelect(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Dropdown selector of all existing teachers & staff */}
                    <div>
                      <select
                        value={matchedTeacherInfo?.id || ""}
                        onChange={(e) => handleTeacherSearchOrSelect(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="">-- या शिक्षक लिस्ट से चुनें ({teachersList.length + staffList.length}) --</option>
                        {teachersList.map((t) => (
                          <option key={t.id} value={t.id}>
                            👨‍🏫 {t.name} (ID: {t.employeeId || t.id.slice(-6)}) - {t.phone || "No phone"}
                          </option>
                        ))}
                        {staffList.map((s) => (
                          <option key={`stf_${s.id}`} value={s.id}>
                            👔 {s.name} (ID: {s.employeeId || s.id.slice(-6)}) - {s.phone || "No phone"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Feedback indicator when teacher is found */}
                  {matchedTeacherInfo ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 flex items-center justify-between text-xs font-bold animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>
                          शिक्षक मिला: <strong>{matchedTeacherInfo.name}</strong> ({matchedTeacherInfo.phone || "No phone"}) • सभी विवरण नीचे भर दिए गए हैं!
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black">
                        Auto-Filled ✅
                      </span>
                    </div>
                  ) : teacherSearchQuery.trim() ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      इस ID या नाम से शिक्षक नहीं मिला। आप नीचे सीधे नया विवरण भी भर सकते हैं।
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Accountant का पूरा नाम *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. राकेश शर्मा"
                      value={accountantForm.name}
                      onChange={(e) =>
                        setAccountantForm({ ...accountantForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      मोबाइल नंबर *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={accountantForm.phone}
                      onChange={(e) =>
                        setAccountantForm({ ...accountantForm, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      कर्मचारी आईडी (Emp ID)
                    </label>
                    <input
                      type="text"
                      placeholder="ACC-01"
                      value={accountantForm.employeeId}
                      onChange={(e) =>
                        setAccountantForm({ ...accountantForm, employeeId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      मासिक वेतन (₹ Salary)
                    </label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={accountantForm.monthlySalary}
                      onChange={(e) =>
                        setAccountantForm({
                          ...accountantForm,
                          monthlySalary: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500 tabular-nums"
                    />
                  </div>
                </div>

                {/* Delegation Permissions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>प्रारंभिक शक्तियां (Initial Delegated Permissions)</span>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      {
                        key: "canCollectFee" as keyof AccountantPermissions,
                        label: "फीस संकलन व 3\" POS थर्मल रसीद जारी करना",
                      },
                      {
                        key: "canAdmitStudents" as keyof AccountantPermissions,
                        label: "ऑनलाइन व सीधा प्रवेश (Direct Admission) लेना",
                      },
                      {
                        key: "canGrantDiscount" as keyof AccountantPermissions,
                        label: "फीस में छूट / कंसेशन देने की अनुमति",
                      },
                      {
                        key: "canRecordExpenses" as keyof AccountantPermissions,
                        label: "दैनिक विद्यालय खर्च वाउचर दर्ज करना",
                      },
                      {
                        key: "canViewDayBook" as keyof AccountantPermissions,
                        label: "दैनिक रोकड़ बही (Cashbook) मिलान देखना",
                      },
                      {
                        key: "canSendFeeAlerts" as keyof AccountantPermissions,
                        label: "WhatsApp व SMS बकाया अलर्ट भेजना",
                      },
                      {
                        key: "canManageBusFee" as keyof AccountantPermissions,
                        label: "बस व परिवहन शुल्क संभालना",
                      },
                    ].map((p) => {
                      const checked = Boolean(accountantForm.permissions[p.key]);
                      return (
                        <label
                          key={p.key}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setAccountantForm({
                                ...accountantForm,
                                permissions: {
                                  ...accountantForm.permissions,
                                  [p.key]: e.target.checked,
                                },
                              })
                            }
                            className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountantModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg transition cursor-pointer"
                  >
                    Accountant नियुक्त करें
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {school && selectedStaffForIdCard && (
          <TeacherIdCardModal
            isOpen={true}
            teacher={selectedStaffForIdCard as any}
            school={school}
            onClose={() => setSelectedStaffForIdCard(null)}
          />
        )}

        {/* EDIT ACCOUNTANT SALARY & PROFILE MODAL */}
        {editingAccountantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Accountant वेतन व विवरण एडिट करें
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      मासिक वेतन (पैसा), पद और मोबाइल नंबर अपडेट करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAccountantModal(null)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAccountantEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">पूरा नाम *</label>
                  <input
                    type="text"
                    required
                    value={editingAccountantModal.name}
                    onChange={(e) => setEditingAccountantModal({ ...editingAccountantModal, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">मोबाइल नंबर *</label>
                    <input
                      type="tel"
                      required
                      value={editingAccountantModal.phone}
                      onChange={(e) => setEditingAccountantModal({ ...editingAccountantModal, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={editingAccountantModal.employeeId}
                      onChange={(e) => setEditingAccountantModal({ ...editingAccountantModal, employeeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">पद (Designation)</label>
                  <input
                    type="text"
                    value={editingAccountantModal.designation}
                    onChange={(e) => setEditingAccountantModal({ ...editingAccountantModal, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <label className="block text-emerald-800 dark:text-emerald-300 font-black mb-1">
                    मासिक वेतन / Monthly Salary (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingAccountantModal.monthlySalary}
                    onChange={(e) =>
                      setEditingAccountantModal({
                        ...editingAccountantModal,
                        monthlySalary: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white font-black text-base tabular-nums"
                  />
                </div>

                {/* Accountant Signature Box inside Edit Modal */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block font-black text-slate-700 dark:text-slate-200 text-xs">
                      Fee Receipt Signature (हस्ताक्षर)
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {editingAccountantModal.signatureUrl ? "✓ डिजिटल साइन सेव है" : "अभी साइन अपलोड नहीं है"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingAccountantModal.signatureUrl && (
                      <img
                        src={editingAccountantModal.signatureUrl}
                        alt="Accountant Sign"
                        className="h-8 max-w-[76px] object-contain bg-white border border-slate-200 rounded-lg p-1"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setSignatureTargetAccountant(editingAccountantModal.acc)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black cursor-pointer flex items-center gap-1"
                    >
                      <PenTool className="w-3 h-3" />
                      <span>{editingAccountantModal.signatureUrl ? "बदलें" : "Sign जोड़ें"}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccountantModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={savingRoleOrPay}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black shadow-lg cursor-pointer"
                  >
                    {savingRoleOrPay ? "सेव हो रहा है..." : "वेतन व विवरण सेव करें"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONVERT ACCOUNTANT -> TEACHER MODAL */}
        {convertAccountantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Accountant को Teacher बनाएं
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {convertAccountantModal.acc.name} को Teacher पैनल व कक्षा शिक्षण के लिए सक्रिय करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConvertAccountantModal(null)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmConvertAccountantToTeacher} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Teacher नाम *</label>
                    <input
                      type="text"
                      required
                      value={convertAccountantModal.name}
                      onChange={(e) => setConvertAccountantModal({ ...convertAccountantModal, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">मोबाइल नंबर (लॉगिन हेतु) *</label>
                    <input
                      type="tel"
                      required
                      value={convertAccountantModal.phone}
                      onChange={(e) => setConvertAccountantModal({ ...convertAccountantModal, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Teacher ID / Employee ID</label>
                    <input
                      type="text"
                      value={convertAccountantModal.employeeId}
                      onChange={(e) => setConvertAccountantModal({ ...convertAccountantModal, employeeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">पद (Designation)</label>
                    <input
                      type="text"
                      value={convertAccountantModal.designation}
                      onChange={(e) => setConvertAccountantModal({ ...convertAccountantModal, designation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    पढ़ाने वाले विषय (Subjects — comma से अलग करें)
                  </label>
                  <input
                    type="text"
                    value={convertAccountantModal.subjects}
                    onChange={(e) => setConvertAccountantModal({ ...convertAccountantModal, subjects: e.target.value })}
                    placeholder="उदा. Accountancy, Mathematics, Commerce"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">योग्यता (Qualification)</label>
                    <input
                      type="text"
                      value={convertAccountantModal.qualification}
                      onChange={(e) => setConvertAccountantModal({ ...convertAccountantModal, qualification: e.target.value })}
                      placeholder="M.Com, B.Ed"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">अनुभव (Experience)</label>
                    <input
                      type="text"
                      value={convertAccountantModal.experience}
                      onChange={(e) => setConvertAccountantModal({ ...convertAccountantModal, experience: e.target.value })}
                      placeholder="5+ Years"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-700 dark:text-emerald-300 font-black mb-1">मासिक वेतन (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={convertAccountantModal.monthlySalary}
                      onChange={(e) =>
                        setConvertAccountantModal({
                          ...convertAccountantModal,
                          monthlySalary: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white font-black tabular-nums"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-800 dark:text-indigo-200 font-medium">
                  नोट: इससे उनका Accountant रोल सुरक्षित रहेगा और साथ ही वे Teachers लिस्ट, Class Teacher असाइनमेंट और Attendance के लिए भी सक्रिय हो जाएंगे।
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertAccountantModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={savingRoleOrPay}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-black shadow-lg cursor-pointer"
                  >
                    {savingRoleOrPay ? "प्रक्रिया जारी है..." : "👨‍🏫 Teacher बनाएं (Confirm)"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT STAFF DIRECTORY SALARY & PROFILE MODAL */}
        {editingStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Staff वेतन व विवरण एडिट करें
                    </h3>
                    <p className="text-[11px] text-slate-500">सभी लिंक्ड रिकॉर्ड अपने आप अपडेट हो जाएंगे</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStaffModal(null)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStaffEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">नाम *</label>
                  <input
                    type="text"
                    required
                    value={editingStaffModal.name}
                    onChange={(e) => setEditingStaffModal({ ...editingStaffModal, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">मोबाइल</label>
                    <input
                      type="tel"
                      value={editingStaffModal.phone}
                      onChange={(e) => setEditingStaffModal({ ...editingStaffModal, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">पद (Designation)</label>
                    <input
                      type="text"
                      value={editingStaffModal.designation}
                      onChange={(e) => setEditingStaffModal({ ...editingStaffModal, designation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <label className="block text-emerald-800 dark:text-emerald-300 font-black mb-1">
                    मासिक वेतन / Monthly Salary (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingStaffModal.monthlySalary}
                    onChange={(e) =>
                      setEditingStaffModal({
                        ...editingStaffModal,
                        monthlySalary: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white font-black text-base tabular-nums"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStaffModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={savingRoleOrPay}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black shadow-lg cursor-pointer"
                  >
                    {savingRoleOrPay ? "सेव हो रहा है..." : "सेव करें"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ACCOUNTANT DIGITAL SIGNATURE MODAL */}
        {signatureTargetAccountant && (
          <TeacherSignatureModal
            isOpen={Boolean(signatureTargetAccountant)}
            onClose={() => setSignatureTargetAccountant(null)}
            title={`Accountant Signature — ${signatureTargetAccountant.name}`}
            subtitle="फीस रसीद (Fee Receipt) पर दिखने वाला Accountant का हस्ताक्षर ड्रा या अपलोड करें"
            initialSignatureUrl={signatureTargetAccountant.signatureUrl || ""}
            uploadPrefix={`sig_acc_${signatureTargetAccountant.id}`}
            onSaveSignature={async (url) => {
              const target = signatureTargetAccountant;
              const updatedAcc: SchoolAccountant = { ...target, signatureUrl: url };
              await saveAccountant(updatedAcc);
              setAccountantsList((prev) => prev.map((a) => (a.id === target.id ? updatedAcc : a)));
              if (editingAccountantModal && editingAccountantModal.acc.id === target.id) {
                setEditingAccountantModal({ ...editingAccountantModal, acc: updatedAcc, signatureUrl: url });
              }
              const linkedT = findLinkedTeacherForAccountant(target);
              if (linkedT) {
                await updateTeacher(school.id, linkedT.id, { signatureUrl: url }).catch(() => {});
                setTeachersList((prev) => prev.map((t) => (t.id === linkedT.id ? { ...t, signatureUrl: url } : t)));
              }
              if (!school.accountantSignatureUrl && url) {
                await updateSchool(school.id, {
                  accountantSignatureUrl: url,
                  accountantName: school.accountantName || target.name,
                }).catch(() => {});
              }
              showToast("success", `✅ ${target.name} का Fee Receipt हस्ताक्षर सेव हो गया!`);
            }}
          />
        )}
      </div>
    </div>
  );
};
