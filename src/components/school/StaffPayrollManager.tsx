// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import { renderHtmlToCanvasSafe } from "../../utils/safePdfCapture";
import { printHtmlInIframe } from "./AdmissionFormPrintModal";
import {
  Briefcase,
  FileText,
  Printer,
  Download,
  Users,
  Search,
  AlertCircle,
  Edit3,
  Save,
  X,
  Loader2,
} from "lucide-react";
import type {
  School,
  SchoolSession,
  SchoolTeacher,
  StaffEmployee,
  StaffLeave,
  SchoolAccountant,
} from "../../school-types";
import {
  getStaffEmployees,
  getTeachers,
  getAccountants,
  getStaffLeaves,
  subscribeStaffLeaves,
  getStaffDailyAttendance,
  getMonthlyStaffDailyAttendance,
  getDeletedTeacherIds,
  isDemoRecord,
  updateTeacher,
  saveStaffEmployee,
  saveAccountant,
  subscribeToTeacherRulesConfig,
  getMonthlyPolicyAdjustments,
  saveStaffMonthlyPolicyAdjustment,
} from "../../school-firebase";
import {
  computeTeacherRulePayrollAdjustment,
  getDefaultTeacherRulesConfig,
  type SchoolTeacherRulesConfig,
  type StaffMonthlyPolicyAdjustments,
} from "../../utils/schoolTeacherRules";

export interface SalaryStructure {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  bankAccountNo?: string;
  ifscCode?: string;
  panNo?: string;
  basicSalary: number;
  da: number;       // Dearness / Travel Allowance
  hra: number;      // House Rent Allowance
  conveyance: number;
  pfDeduction: number;
  esiDeduction: number;
  advanceRecovery: number;
  presentDays: number;
  totalWorkingDays: number;
  runningWorkingDays: number;
  daysInMonth: number;
  explicitAbsentDays: number;
  approvedLeaveDays: number;
  unpaidLeaveDays: number;
  attendanceRecordedDays: number;
  bonusEligible: boolean;
  bonusReason: string;
  bonusDays: number;
  bonusAmount: number;
  lateDays: number;
  autoLateDays?: number;
  latePenaltyDays: number;
  latePenaltyAmount: number;
  dressViolationDays: number;
  dressPenaltyDays: number;
  dressPenaltyAmount: number;
  totalCutDays: number;
  lateEmergencyExcused: boolean;
  bonusWaived: boolean;
  exceededNoLeaveLimit: boolean;
  ruleBadges: string[];
  perDayRate: number;
  rawPresentPay: number;
  earnedTillDate: number;
  netPayable: number;
}

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
  teachers?: SchoolTeacher[];
  staffList?: StaffEmployee[];
}

const getWorkingDaysInMonth = (ym: string): string[] => {
  const [yStr, mStr] = (ym || "").split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (!y || !m) return [];
  const daysInMonth = new Date(y, m, 0).getDate();
  const workingDates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(y, m - 1, day);
    if (dt.getDay() !== 0) {
      workingDates.push(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }
  return workingDates;
};

export const StaffPayrollManager: React.FC<Props> = ({
  school,
  activeSession,
  teachers: propTeachers,
  staffList: propStaffList,
}) => {
  const schoolId = school?.id || "";
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [fetchedTeachers, setFetchedTeachers] = useState<SchoolTeacher[]>([]);
  const [fetchedStaff, setFetchedStaff] = useState<StaffEmployee[]>([]);
  const [accountants, setAccountants] = useState<SchoolAccountant[]>([]);
  const [leavesList, setLeavesList] = useState<StaffLeave[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedStaffForSlip, setSelectedStaffForSlip] = useState<SalaryStructure | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPayRow, setEditingPayRow] = useState<{
    id: string;
    name: string;
    role: string;
    employeeId: string;
    monthlyBaseSalary: number;
    allowanceHra: number;
    allowanceTravel: number;
    allowanceSpecial: number;
    deductionPf: number;
    deductionOther: number;
    lateDays: number;
    autoLateDays?: number;
    dressViolationDays: number;
    lateEmergencyExcused: boolean;
    bonusWaived: boolean;
  } | null>(null);
  const [savingPay, setSavingPay] = useState(false);
  const [downloadingSlipPdf, setDownloadingSlipPdf] = useState(false);
  const [payToast, setPayToast] = useState<string | null>(null);
  const [rulesConfig, setRulesConfig] = useState<SchoolTeacherRulesConfig>(() =>
    getDefaultTeacherRulesConfig(schoolId, school)
  );
  const [monthlyPolicyAdj, setMonthlyPolicyAdj] = useState<
    Record<string, StaffMonthlyPolicyAdjustments>
  >({});
  const [monthlyStaffAttMap, setMonthlyStaffAttMap] = useState<
    Record<string, Record<string, any>>
  >({});

  useEffect(() => {
    if (!schoolId) return;
    const unsub = subscribeToTeacherRulesConfig(schoolId, school, setRulesConfig);
    return () => unsub();
  }, [schoolId, school]);

  useEffect(() => {
    if (!schoolId || !selectedMonth) return;
    getMonthlyPolicyAdjustments(schoolId, selectedMonth)
      .then((adj) => setMonthlyPolicyAdj(adj || {}))
      .catch(() => {});
    const onAdjUpdate = (e: any) => {
      if (e?.detail?.schoolId === schoolId && e?.detail?.yearMonth === selectedMonth && e?.detail?.next) {
        setMonthlyPolicyAdj(e.detail.next);
      }
    };
    window.addEventListener("payroll-policy-adjustments-updated", onAdjUpdate);
    return () => window.removeEventListener("payroll-policy-adjustments-updated", onAdjUpdate);
  }, [schoolId, selectedMonth]);

  useEffect(() => {
    if (!schoolId || !selectedMonth) return;
    let active = true;
    const refreshMonthlyAtt = () => {
      getMonthlyStaffDailyAttendance(schoolId, selectedMonth)
        .then((recMap) => {
          if (active) setMonthlyStaffAttMap(recMap || {});
        })
        .catch(() => {});
    };
    refreshMonthlyAtt();
    const onAttUpdated = (e: any) => {
      if (e?.detail?.schoolId && e.detail.schoolId !== schoolId) return;
      refreshMonthlyAtt();
    };
    window.addEventListener("staff-daily-attendance-updated", onAttUpdated);
    return () => {
      active = false;
      window.removeEventListener("staff-daily-attendance-updated", onAttUpdated);
    };
  }, [schoolId, selectedMonth]);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    setLoading(true);
    Promise.all([
      propTeachers ? Promise.resolve(propTeachers) : getTeachers(schoolId).catch(() => []),
      propStaffList ? Promise.resolve(propStaffList) : getStaffEmployees(schoolId).catch(() => []),
      getAccountants(schoolId).catch(() => []),
    ])
      .then(([tList, sList, aList]) => {
        if (!active) return;
        setFetchedTeachers(Array.isArray(tList) ? tList : []);
        setFetchedStaff(Array.isArray(sList) ? sList : []);
        setAccountants(Array.isArray(aList) ? aList : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const unsubLeaves = subscribeStaffLeaves(schoolId, (lList) => {
      if (active) setLeavesList(Array.isArray(lList) ? lList : []);
    });
    return () => {
      active = false;
      unsubLeaves();
    };
  }, [schoolId, propTeachers, propStaffList]);

  useEffect(() => {
    const onRemoved = (e: any) => {
      if (e?.detail?.schoolId && e.detail.schoolId !== schoolId) return;
      const rid = e?.detail?.teacherId || e?.detail?.staffId;
      if (rid) {
        setFetchedTeachers((prev) => prev.filter((t) => t.id !== rid));
        setFetchedStaff((prev) => prev.filter((s) => s.id !== rid));
      }
    };
    window.addEventListener("teacher-deleted", onRemoved);
    window.addEventListener("staff-deleted", onRemoved);
    return () => {
      window.removeEventListener("teacher-deleted", onRemoved);
      window.removeEventListener("staff-deleted", onRemoved);
    };
  }, [schoolId]);

  const activeTeachers = propTeachers ?? fetchedTeachers;
  const activeStaff = propStaffList ?? fetchedStaff;

  // Build real payroll rows exclusively from authentic Teachers, Staff HRM, and Accountants (ZERO dummy data)
  const staffPayrollList: SalaryStructure[] = useMemo(() => {
    if (!schoolId) return [];
    const deletedIds = getDeletedTeacherIds(schoolId);
    const isDemoSess = Boolean((activeSession as any)?.isDemo);
    const workingDates = getWorkingDaysInMonth(selectedMonth);
    const totalWorkingDays = workingDates.length || 26;
    const [ymYearStr, ymMonthStr] = (selectedMonth || "").split("-");
    const ymYear = parseInt(ymYearStr, 10) || new Date().getFullYear();
    const ymMonth = parseInt(ymMonthStr, 10) || new Date().getMonth() + 1;
    const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();
    const nowDate = new Date();
    const todayLocalIso = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
    const currentYm = todayLocalIso.slice(0, 7);
    const runningWorkingDays =
      selectedMonth < currentYm
        ? totalWorkingDays
        : selectedMonth > currentYm
        ? 0
        : workingDates.filter((d) => d <= todayLocalIso).length;

    // Collect daily attendance records for selectedMonth (Cloud + LocalStorage merged)
    const dailyAttByDate: Record<string, Record<string, any>> = {};
    Object.entries(monthlyStaffAttMap || {}).forEach(([dateStr, recs]) => {
      if (dateStr.startsWith(`${selectedMonth}-`) && recs && typeof recs === "object") {
        dailyAttByDate[dateStr] = { ...recs };
      }
    });
    workingDates.forEach((dateStr) => {
      const rec = getStaffDailyAttendance(schoolId, dateStr);
      if (rec?.records && Object.keys(rec.records).length > 0) {
        dailyAttByDate[dateStr] = {
          ...(dailyAttByDate[dateStr] || {}),
          ...rec.records,
        };
      }
    });

    const unifiedMap = new Map<string, any>();

    const registerPerson = (
      person: any,
      fallbackRole: string,
      prefix: string,
      idx: number
    ) => {
      if (!person || !person.id) return;
      if (person.active === false || person.deleted === true || deletedIds.has(person.id)) return;
      if (!isDemoSess && isDemoRecord(person)) return;

      const existing = unifiedMap.get(person.id);
      if (existing) {
        // Merge richer fields if available
        unifiedMap.set(person.id, {
          ...existing,
          salaryStructure: existing.salaryStructure || person.salaryStructure,
          monthlySalary: Number(existing.monthlySalary || person.monthlySalary || person.salary || 0),
          bankAccountNo: existing.bankAccountNo || person.bankAccountNo,
          ifscCode: existing.ifscCode || person.ifscCode,
          panNo: existing.panNo || person.panNo,
        });
        return;
      }

      unifiedMap.set(person.id, {
        ...person,
        _role: person.designation || person.department || fallbackRole,
        _empId:
          person.employeeId ||
          person.empId ||
          `${prefix}-${String(idx + 1).padStart(2, "0")}`,
      });
    };

    activeTeachers.forEach((t, idx) => registerPerson(t, "Faculty / Teacher", "TCH", idx));
    activeStaff.forEach((s, idx) => registerPerson(s, "School Staff", "STF", idx));
    accountants
      .filter((a) => !a.teacherRef || !unifiedMap.has(a.teacherRef))
      .forEach((a, idx) =>
        registerPerson(a, a.designation || "Accountant", "ACC", idx)
      );

    const rows: SalaryStructure[] = [];
    unifiedMap.forEach((person) => {
      const st = person.salaryStructure;
      const fallbackMonthly = Math.max(
        0,
        Number(person.monthlySalary ?? person.salary ?? 0)
      );

      const basicSalary = Math.max(
        0,
        Number(st?.monthlyBaseSalary ?? fallbackMonthly)
      );
      const hra = Math.max(0, Number(st?.allowanceHra || 0));
      const conveyance = Math.max(0, Number(st?.allowanceTravel || 0));
      const da = Math.max(0, Number(st?.allowanceSpecial || 0));
      const pfDeduction = Math.max(0, Number(st?.deductionPf || 0));
      const esiDeduction = Math.max(0, Number(st?.deductionOther || 0));

      // Count real attendance & automatic late marks for this staff member in selectedMonth
      let presentDays = 0;
      let explicitAbsentDays = 0;
      let recordedLateDays = 0;
      let attendanceRecordedDays = 0;
      Object.values(dailyAttByDate).forEach((dayRecs) => {
        const entry = dayRecs[person.id];
        if (entry) {
          attendanceRecordedDays++;
          if (entry.present === true) presentDays++;
          else if (entry.present === false) explicitAbsentDays++;
          if (
            entry.present !== false &&
            (entry.status === "late" || entry.isLate === true)
          ) {
            recordedLateDays++;
          }
        }
      });

      // Count approved leaves overlapping selectedMonth
      let approvedLeaveDays = 0;
      leavesList.forEach((lv) => {
        if (lv.staffId !== person.id || lv.status !== "approved") return;
        const start = lv.fromDate || (lv as any).startDate || "";
        const end = lv.toDate || (lv as any).endDate || start;
        if (start.startsWith(selectedMonth) || end.startsWith(selectedMonth)) {
          approvedLeaveDays += Math.max(1, Number((lv as any).days || 1));
        }
      });

      const unpaidLeaveDays = Math.max(explicitAbsentDays, approvedLeaveDays);
      const gross = basicSalary + da + hra + conveyance;
      const fixedDeductions = pfDeduction + esiDeduction;
      const perDayRate = totalWorkingDays > 0 ? gross / totalWorkingDays : 0;
      const absenceRecovery =
        unpaidLeaveDays > 0 ? Math.round(perDayRate * unpaidLeaveDays) : 0;

      const adj = monthlyPolicyAdj[person.id];
      const effectiveLateDays = Math.max(recordedLateDays, Number(adj?.lateDays || 0));
      const effectiveAdj: StaffMonthlyPolicyAdjustments = {
        lateDays: effectiveLateDays,
        dressViolationDays: Number(adj?.dressViolationDays || 0),
        lateEmergencyExcused: Boolean(adj?.lateEmergencyExcused),
        bonusWaived: Boolean(adj?.bonusWaived),
        updatedAt: adj?.updatedAt,
      };
      const ruleAdj = computeTeacherRulePayrollAdjustment({
        presentDays,
        explicitAbsentDays,
        approvedLeaveDays,
        unpaidLeaveDays,
        perDayRate,
        adjustments: effectiveAdj,
        policy: rulesConfig?.policy,
      });

      const netFromStruct = st?.netMonthlySalary;
      const baseNet =
        typeof netFromStruct === "number" && netFromStruct >= 0
          ? netFromStruct
          : Math.max(0, gross - fixedDeductions);
      const netPayable = Math.max(
        0,
        baseNet + ruleAdj.bonusAmount - absenceRecovery - ruleAdj.totalRuleDeduction
      );
      const rawPresentPay = presentDays > 0 ? Math.round(presentDays * perDayRate) : 0;
      const earnedTillDate =
        presentDays > 0
          ? Math.max(
              0,
              rawPresentPay + ruleAdj.bonusAmount - ruleAdj.totalRuleDeduction
            )
          : 0;
      const totalCutDays = unpaidLeaveDays + ruleAdj.latePenaltyDays + ruleAdj.dressPenaltyDays;
      const bonusGoalDays = rulesConfig?.policy?.fullMonthBonusDays ?? 2;
      const bonusReason =
        ruleAdj.bonusAmount > 0
          ? `बोनस मिला (+${ruleAdj.bonusDays} दिन — 0 छुट्टी / नियमित उपस्थिति)`
          : !rulesConfig?.policy?.enableAttendanceBonus
          ? "बोनस नहीं मिला (स्कूल वेतन नियम में Attendance Bonus बंद है)"
          : Boolean(adj?.bonusWaived)
          ? "बोनस नहीं मिला (प्रबंधन/Admin द्वारा बोनस निरस्त किया गया)"
          : presentDays === 0
          ? `बोनस अभी लागू नहीं (अभी तक 0 दिन उपस्थिति दर्ज — नियम: 0 छुट्टी पर +${bonusGoalDays} दिन)`
          : `बोनस नहीं मिला (${unpaidLeaveDays} दिन अनुपस्थित/छुट्टी होने के कारण बोनस निरस्त — नियम: 0 छुट्टी = +${bonusGoalDays} दिन बोनस)`;

      rows.push({
        id: person.id,
        employeeId: person._empId,
        name: person.name || "Staff Member",
        role: person._role,
        bankAccountNo: person.bankAccountNo || "",
        ifscCode: person.ifscCode || "",
        panNo: person.panNo || "",
        basicSalary,
        da,
        hra,
        conveyance,
        pfDeduction,
        esiDeduction,
        advanceRecovery: absenceRecovery,
        presentDays,
        totalWorkingDays,
        runningWorkingDays,
        daysInMonth,
        explicitAbsentDays,
        approvedLeaveDays,
        unpaidLeaveDays,
        attendanceRecordedDays,
        bonusEligible: ruleAdj.bonusEligible,
        bonusReason,
        bonusDays: ruleAdj.bonusDays,
        bonusAmount: ruleAdj.bonusAmount,
        lateDays: ruleAdj.lateDays,
        autoLateDays: recordedLateDays,
        latePenaltyDays: ruleAdj.latePenaltyDays,
        latePenaltyAmount: ruleAdj.latePenaltyAmount,
        dressViolationDays: ruleAdj.dressViolationDays,
        dressPenaltyDays: ruleAdj.dressPenaltyDays,
        dressPenaltyAmount: ruleAdj.dressPenaltyAmount,
        totalCutDays,
        lateEmergencyExcused: Boolean(adj?.lateEmergencyExcused),
        bonusWaived: Boolean(adj?.bonusWaived),
        exceededNoLeaveLimit: ruleAdj.exceededNoLeaveLimit,
        ruleBadges: ruleAdj.badges,
        perDayRate: Math.round(perDayRate),
        rawPresentPay,
        earnedTillDate,
        netPayable,
      });
    });

    return rows;
  }, [
    schoolId,
    activeSession,
    selectedMonth,
    activeTeachers,
    activeStaff,
    accountants,
    leavesList,
    rulesConfig,
    monthlyPolicyAdj,
    monthlyStaffAttMap,
  ]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffPayrollList;
    const q = searchQuery.toLowerCase();
    return staffPayrollList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q)
    );
  }, [staffPayrollList, searchQuery]);

  // Overall Totals
  const payrollSummary = useMemo(() => {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalBonus = 0;
    let totalEarnedTillDate = 0;
    let totalPresentMarks = 0;
    let totalLateMarks = 0;
    let totalAbsentMarks = 0;
    let totalNet = 0;
    for (const s of staffPayrollList) {
      const gross = s.basicSalary + s.da + s.hra + s.conveyance;
      const deduct =
        s.pfDeduction +
        s.esiDeduction +
        s.advanceRecovery +
        s.latePenaltyAmount +
        s.dressPenaltyAmount;
      totalGross += gross;
      totalBonus += s.bonusAmount;
      totalDeductions += deduct;
      totalEarnedTillDate += s.earnedTillDate;
      totalPresentMarks += s.presentDays;
      totalLateMarks += s.lateDays;
      totalAbsentMarks += s.unpaidLeaveDays;
      totalNet += s.netPayable;
    }
    return {
      totalGross,
      totalBonus,
      totalDeductions,
      totalEarnedTillDate,
      totalPresentMarks,
      totalLateMarks,
      totalAbsentMarks,
      totalNet,
      count: staffPayrollList.length,
    };
  }, [staffPayrollList]);

  const handleSaveEditedPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayRow || !schoolId) return;
    setSavingPay(true);
    try {
      const base = Math.max(0, Number(editingPayRow.monthlyBaseSalary) || 0);
      const hra = Math.max(0, Number(editingPayRow.allowanceHra) || 0);
      const travel = Math.max(0, Number(editingPayRow.allowanceTravel) || 0);
      const special = Math.max(0, Number(editingPayRow.allowanceSpecial) || 0);
      const pf = Math.max(0, Number(editingPayRow.deductionPf) || 0);
      const other = Math.max(0, Number(editingPayRow.deductionOther) || 0);
      const net = Math.max(0, base + hra + travel + special - pf - other);
      const nowIso = new Date().toISOString();

      const salaryStructure = {
        monthlyBaseSalary: base,
        allowanceHra: hra,
        allowanceTravel: travel,
        allowanceSpecial: special,
        deductionPf: pf,
        deductionOther: other,
        netMonthlySalary: net,
        paymentMode: "Bank Transfer" as const,
        updatedAt: nowIso,
      };

      const matchedTeacher = activeTeachers.find((t) => t.id === editingPayRow.id);
      if (matchedTeacher) {
        await updateTeacher(schoolId, matchedTeacher.id, {
          monthlySalary: net,
          salary: net,
          salaryStructure,
        });
        setFetchedTeachers((prev) =>
          prev.map((t) =>
            t.id === matchedTeacher.id
              ? { ...t, monthlySalary: net, salary: net, salaryStructure }
              : t
          )
        );
      }

      const matchedStaff = activeStaff.find((s) => s.id === editingPayRow.id);
      if (matchedStaff) {
        const updatedStaff: StaffEmployee = {
          ...matchedStaff,
          monthlySalary: net,
          salaryStructure,
        };
        await saveStaffEmployee(updatedStaff);
        setFetchedStaff((prev) =>
          prev.map((s) => (s.id === matchedStaff.id ? updatedStaff : s))
        );
      }

      const matchedAccountants = accountants.filter(
        (a) => a.id === editingPayRow.id || a.teacherRef === editingPayRow.id
      );
      if (matchedAccountants.length > 0) {
        const updatedAccs = await Promise.all(
          matchedAccountants.map(async (acc) => {
            const nextAcc: SchoolAccountant = {
              ...acc,
              monthlySalary: net,
              salaryStructure,
            };
            await saveAccountant(nextAcc);
            return nextAcc;
          })
        );
        setAccountants((prev) =>
          prev.map((a) => updatedAccs.find((u) => u.id === a.id) || a)
        );
      }

      const nextAdjMap = await saveStaffMonthlyPolicyAdjustment(
        schoolId,
        selectedMonth,
        editingPayRow.id,
        {
          lateDays: editingPayRow.lateDays,
          dressViolationDays: editingPayRow.dressViolationDays,
          lateEmergencyExcused: editingPayRow.lateEmergencyExcused,
          bonusWaived: editingPayRow.bonusWaived,
        }
      );
      setMonthlyPolicyAdj(nextAdjMap);

      setEditingPayRow(null);
      setPayToast(`✅ ${editingPayRow.name} का नया मासिक वेतन ₹${net.toLocaleString("en-IN")} व नियम डेटा सेव हो गया!`);
      setTimeout(() => setPayToast(null), 3500);
    } finally {
      setSavingPay(false);
    }
  };

  // Export Bank NEFT Transfer CSV
  const handleExportBankCsv = () => {
    if (staffPayrollList.length === 0) return;
    const headers = "Beneficiary Name,Account Number,IFSC Code,Amount (INR),Narration\n";
    const rows = staffPayrollList
      .map(
        (s) =>
          `"${s.name}","${s.bankAccountNo || ""}","${s.ifscCode || ""}","${s.netPayable}","Salary for ${selectedMonth}"`
      )
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const schoolSlug = (school?.name || "School").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = `${schoolSlug}_Salary_Bank_Transfer_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Monthly Salary Register CSV (with Present, Late, Absent, Gross, Cut, Earned)
  const handleExportRegisterCsv = () => {
    if (staffPayrollList.length === 0) return;
    const headers =
      "Employee ID,Name,Designation,Present Days,Late Days,Absent Days,Gross Salary (INR),Total Deduction (INR),Earned Till Date (INR),Net Monthly Payable (INR)\n";
    const rows = staffPayrollList
      .map((s) => {
        const gross = s.basicSalary + s.da + s.hra + s.conveyance;
        const deduct =
          s.pfDeduction +
          s.esiDeduction +
          s.advanceRecovery +
          s.latePenaltyAmount +
          s.dressPenaltyAmount;
        return `"${s.employeeId}","${s.name}","${s.role}","${s.presentDays}/${s.totalWorkingDays}","${s.lateDays}","${s.unpaidLeaveDays}","${gross}","${deduct}","${s.earnedTillDate}","${s.netPayable}"`;
      })
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const schoolSlug = (school?.name || "School").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = `${schoolSlug}_Masik_Vetan_Register_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build Printable & Downloadable Official A4 Salary Slip HTML (Matches Earned Amount + Rules + Running/Present/Absent/Bonus/Cut Days)
  const buildSalarySlipDocument = (staff: SalaryStructure) => {
    const esc = (v: unknown) =>
      String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
      );
    const totalAllowances = staff.da + staff.hra + staff.conveyance;
    const fixedGross = staff.basicSalary + totalAllowances;
    const fixedDed = staff.pfDeduction + staff.esiDeduction;
    const ruleDed = staff.latePenaltyAmount + staff.dressPenaltyAmount;
    const totalDed = fixedDed + staff.advanceRecovery + ruleDed;
    const sundayCount = Math.max(0, staff.daysInMonth - staff.totalWorkingDays);
    const policy = rulesConfig?.policy || {};
    const bonusRuleDays = policy.fullMonthBonusDays ?? 2;
    const lateCut = policy.lateCutoffDays ?? 3;
    const dressCut = policy.dressCodeCutoffDays ?? 3;
    const maxFreeLeave = policy.maxFreeLeaveBeforeNoLeave ?? 2;
    const payWindow = policy.salaryPayWindow || "15th–20th of next month";
    const lateRuleText = policy.enableLatePenalty
      ? policy.lateTriggerMode === "every_n"
        ? `हर ${lateCut} दिन देरी पर 1 दिन वेतन कटौती`
        : `${lateCut} दिन से अधिक देरी पर 1 दिन वेतन कटौती`
      : "Late कटौती बंद";
    const dressRuleText = policy.enableDressCodePenalty
      ? `${dressCut} दिन बिना स्कूल ड्रेस पर 1 दिन वेतन कटौती`
      : "Dress कोड कटौती बंद";
    const bonusRuleText = policy.enableAttendanceBonus
      ? `पूरे माह 0 अनुपस्थिति / 0 छुट्टी रहने पर +${bonusRuleDays} दिन अतिरिक्त बोनस`
      : "Attendance बोनस नियम बंद";

    const css = `
      @page { size: A4 portrait; margin: 10mm; }
      body { font-family: 'Inter', 'Noto Sans Devanagari', Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 0; }
      .slip-sheet { width: 100%; max-width: 740px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 14px; padding: 18px 20px; box-sizing: border-box; background: #ffffff; }
      .slip-head { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 12px; }
      .slip-badge { display: inline-block; background: #0f766e; color: #ffffff; font-size: 10px; font-weight: 900; padding: 3px 10px; border-radius: 6px; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 4px; }
      .slip-school { font-size: 20px; font-weight: 900; margin: 2px 0; text-transform: uppercase; color: #0f172a; }
      .slip-sub { font-size: 11px; color: #475569; margin: 0; font-weight: 600; }
      .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 11.5px; margin-bottom: 12px; }
      .emp-lbl { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .emp-val { color: #0f172a; font-weight: 800; margin-top: 1px; }
      .att-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
      .att-box { border: 1px solid #cbd5e1; border-radius: 9px; padding: 8px 10px; background: #ffffff; }
      .att-k { font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #64748b; }
      .att-v { font-size: 14px; font-weight: 900; margin-top: 2px; color: #0f172a; }
      .att-s { font-size: 9.5px; color: #475569; margin-top: 2px; font-weight: 600; }
      .bonus-strip { padding: 8px 12px; border-radius: 9px; font-size: 11px; font-weight: 800; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .bonus-yes { background: #ecfdf5; border: 1px solid #10b981; color: #065f46; }
      .bonus-no { background: #fff7ed; border: 1px solid #f59e0b; color: #9a3412; }
      .ledger-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
      .ledger-card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 11px; }
      .ledger-title { font-size: 10px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 6px; }
      .l-row { display: flex; justify-content: space-between; gap: 6px; padding: 3px 0; }
      .l-tot { border-top: 1.5px solid #cbd5e1; margin-top: 5px; padding-top: 5px; font-weight: 900; }
      .net-banner { background: #ecfdf5; border: 2px solid #059669; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .net-amt { font-size: 26px; font-weight: 900; color: #065f46; }
      .rules-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 10.5px; margin-bottom: 16px; }
      .rules-title { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f766e; margin-bottom: 5px; }
      .rules-list { margin: 0; padding-left: 16px; color: #334155; line-height: 1.45; }
      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding-top: 22px; text-align: center; font-size: 10.5px; color: #475569; }
      .sig-line { border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 700; }
    `;

    const html = `
      <div class="slip-sheet">
        <div class="slip-head">
          <div class="slip-badge">OFFICIAL STAFF SALARY SLIP • आधिकारिक वेतन पर्ची</div>
          <div class="slip-school">${esc(school?.name || "SCHOOL NAME")}</div>
          <p class="slip-sub">${school?.address ? `${esc(school.address)} • ` : ""}Month: <strong>${esc(selectedMonth)}</strong> • Pay Window: <strong>${esc(payWindow)}</strong></p>
        </div>

        <div class="emp-grid">
          <div><div class="emp-lbl">Employee ID &amp; Name</div><div class="emp-val">${esc(staff.employeeId)} • ${esc(staff.name)}</div></div>
          <div><div class="emp-lbl">Designation (पद)</div><div class="emp-val">${esc(staff.role)}</div></div>
          <div><div class="emp-lbl">Fixed Monthly Pay &amp; Per-Day Rate</div><div class="emp-val">₹${fixedGross.toLocaleString("en-IN")} / माह (₹${staff.perDayRate.toLocaleString("en-IN")}/दिन दर)</div></div>
          <div><div class="emp-lbl">Bank Account / IFSC</div><div class="emp-val">${staff.bankAccountNo ? `${esc(staff.bankAccountNo)}${staff.ifscCode ? ` (${esc(staff.ifscCode)})` : ""}` : "Counter / Cash"}</div></div>
        </div>

        <div class="att-grid">
          <div class="att-box" style="background:#f0fdfa;border-color:#5eead4;">
            <div class="att-k" style="color:#0f766e;">Running Days (चले कार्यदिवस)</div>
            <div class="att-v" style="color:#0f766e;">${staff.runningWorkingDays} / ${staff.totalWorkingDays} दिन</div>
            <div class="att-s">माह में कुल ${staff.daysInMonth} दिन (${sundayCount} रविवार)</div>
          </div>
          <div class="att-box" style="background:#ecfdf5;border-color:#6ee7b7;">
            <div class="att-k" style="color:#047857;">Present Days (उपस्थित)</div>
            <div class="att-v" style="color:#065f46;">${staff.presentDays} दिन</div>
            <div class="att-s">हाजिरी कमाई: ₹${staff.rawPresentPay.toLocaleString("en-IN")} (${staff.presentDays} × ₹${staff.perDayRate})</div>
          </div>
          <div class="att-box" style="background:${staff.totalCutDays > 0 ? "#fff1f2" : "#f8fafc"};border-color:${staff.totalCutDays > 0 ? "#fda4af" : "#cbd5e1"};">
            <div class="att-k" style="color:${staff.totalCutDays > 0 ? "#be123c" : "#475569"};">Absent &amp; Cut Days (कटे दिन)</div>
            <div class="att-v" style="color:${staff.totalCutDays > 0 ? "#be123c" : "#0f172a"};">Absent: ${staff.unpaidLeaveDays}d · कटा: ${staff.totalCutDays}d</div>
            <div class="att-s">Late: ${staff.lateDays}d (Cut ${staff.latePenaltyDays}d) • Dress: ${staff.dressViolationDays}d (Cut ${staff.dressPenaltyDays}d)</div>
          </div>
        </div>

        <div class="bonus-strip ${staff.bonusAmount > 0 ? "bonus-yes" : "bonus-no"}">
          <span>${staff.bonusAmount > 0 ? "✅" : "ℹ️"} <strong>बोनस स्थिति (Bonus Status):</strong> ${esc(staff.bonusReason)}</span>
          <span style="white-space:nowrap;font-size:13px;">${staff.bonusAmount > 0 ? `+₹${staff.bonusAmount.toLocaleString("en-IN")}` : "₹0"}</span>
        </div>

        <div class="ledger-grid">
          <div class="ledger-card">
            <div class="ledger-title" style="color:#065f46;">इस माह आज तक की कमाई (Earned Till Today)</div>
            <div class="l-row"><span>उपस्थिति वेतन (${staff.presentDays} दिन × ₹${staff.perDayRate}):</span><strong>₹${staff.rawPresentPay.toLocaleString("en-IN")}</strong></div>
            <div class="l-row"><span>उपस्थिति बोनस (${staff.bonusAmount > 0 ? `+${staff.bonusDays} दिन मिला` : "नहीं मिला"}):</span><strong style="color:${staff.bonusAmount > 0 ? "#047857" : "#64748b"};">${staff.bonusAmount > 0 ? `+₹${staff.bonusAmount.toLocaleString("en-IN")}` : "₹0"}</strong></div>
            <div class="l-row"><span>Late/Dress नियम कटौती (${staff.latePenaltyDays + staff.dressPenaltyDays} दिन):</span><strong style="color:#be123c;">${ruleDed > 0 ? `-₹${ruleDed.toLocaleString("en-IN")}` : "₹0"}</strong></div>
            <div class="l-row l-tot" style="color:#065f46;"><span>आज तक बना कुल पैसा:</span><span>₹${staff.earnedTillDate.toLocaleString("en-IN")}</span></div>
          </div>

          <div class="ledger-card">
            <div class="ledger-title" style="color:#be123c;">तय वेतन व कटौती विवरण (कितने दिन कटा)</div>
            <div class="l-row"><span>तय मासिक वेतन (Basic ₹${staff.basicSalary.toLocaleString("en-IN")}${totalAllowances > 0 ? ` + भत्ते ₹${totalAllowances.toLocaleString("en-IN")}` : ""}):</span><strong>₹${fixedGross.toLocaleString("en-IN")}</strong></div>
            <div class="l-row"><span>Absent कटौती (${staff.unpaidLeaveDays} दिन अनुपस्थित):</span><strong style="color:#be123c;">${staff.advanceRecovery > 0 ? `-₹${staff.advanceRecovery.toLocaleString("en-IN")}` : "₹0"}</strong></div>
            <div class="l-row"><span>Late कटौती (${staff.latePenaltyDays} दिन कटे / ${staff.lateDays}d देरी):</span><strong style="color:#be123c;">${staff.latePenaltyAmount > 0 ? `-₹${staff.latePenaltyAmount.toLocaleString("en-IN")}` : "₹0"}</strong></div>
            <div class="l-row"><span>Dress कटौती (${staff.dressPenaltyDays} दिन कटे / ${staff.dressViolationDays}d):</span><strong style="color:#be123c;">${staff.dressPenaltyAmount > 0 ? `-₹${staff.dressPenaltyAmount.toLocaleString("en-IN")}` : "₹0"}</strong></div>
            ${fixedDed > 0 ? `<div class="l-row"><span>PF / ESI / अन्य कटौती:</span><strong style="color:#be123c;">-₹${fixedDed.toLocaleString("en-IN")}</strong></div>` : ""}
            <div class="l-row l-tot" style="color:#be123c;"><span>कुल कटौती (${staff.totalCutDays} दिन कटे):</span><span>${totalDed > 0 ? `-₹${totalDed.toLocaleString("en-IN")}` : "₹0 (कोई कटौती नहीं)"}</span></div>
          </div>
        </div>

        <div class="net-banner">
          <div>
            <div style="font-size:12px;font-weight:900;color:#065f46;text-transform:uppercase;">इस माह आज तक बना / देय वेतन (Earned Payable Amount)</div>
            <div style="font-size:10.5px;color:#047857;font-weight:700;margin-top:2px;">
              पूरा माह Net (यदि सभी ${staff.totalWorkingDays} कार्यदिवस पूरे हों): ₹${staff.netPayable.toLocaleString("en-IN")}
            </div>
          </div>
          <div class="net-amt">₹${staff.earnedTillDate.toLocaleString("en-IN")}</div>
        </div>

        <div class="rules-box">
          <div class="rules-title">लागू वेतन व उपस्थिति नियम (Applied Salary &amp; Fee/Payroll Rules)</div>
          <ul class="rules-list">
            <li><strong>दैनिक वेतन सूत्र:</strong> तय वेतन ₹${fixedGross.toLocaleString("en-IN")} ÷ ${staff.totalWorkingDays} कार्यदिवस = <strong>₹${staff.perDayRate}/दिन</strong> (${sundayCount} रविवार सहित कुल ${staff.daysInMonth} दिन का माह)।</li>
            <li><strong>बोनस नियम:</strong> ${esc(bonusRuleText)}। (इस माह स्थिति: <strong>${staff.bonusAmount > 0 ? `मिला +₹${staff.bonusAmount}` : "नहीं मिला"}</strong>)</li>
            <li><strong>देरी व ड्रेस नियम:</strong> ${esc(lateRuleText)}${staff.lateEmergencyExcused ? " (Emergency माफ़ ✓)" : ""} · ${esc(dressRuleText)}।</li>
            <li><strong>अनुपस्थिति नियम:</strong> 1 दिन अनुपस्थित = 1 दिन (₹${staff.perDayRate}) वेतन कटौती; ${maxFreeLeave} दिन से अधिक अनुपस्थित रहने पर Leave Allowance मान्य नहीं।</li>
          </ul>
        </div>

        <div class="sig-grid">
          <div><div class="sig-line">Employee Signature (${esc(staff.name)})</div></div>
          <div><div class="sig-line">Authorized Principal / Accountant</div></div>
        </div>
      </div>
    `;
    return { html, css };
  };

  const handlePrintSalarySlip = (staff: SalaryStructure) => {
    const { html, css } = buildSalarySlipDocument(staff);
    const fullDoc = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Salary_Slip_${staff.name}_${selectedMonth}</title><style>${css}</style></head><body>${html}</body></html>`;
    printHtmlInIframe(fullDoc, `Salary Slip - ${staff.name} (${selectedMonth})`);
  };

  const handleDownloadSalarySlipPdf = async (staff: SalaryStructure) => {
    setDownloadingSlipPdf(true);
    try {
      const { html, css } = buildSalarySlipDocument(staff);
      const canvas = await renderHtmlToCanvasSafe(html, css, {
        widthPx: 794,
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const renderW = pdfW - margin * 2;
      const renderH = Math.min(pdfH - margin * 2, (canvas.height * renderW) / canvas.width);
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, renderW, renderH);
      const safeStaff = (staff.name || "Staff").replace(/[^a-z0-9-_]+/gi, "_");
      pdf.save(`Salary_Slip_${safeStaff}_${selectedMonth}.pdf`);
    } catch (err) {
      console.warn("Salary slip PDF generation error, falling back to print:", err);
      handlePrintSalarySlip(staff);
    } finally {
      setDownloadingSlipPdf(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Staff Payroll &amp; Pay Slips (वेतन रजिस्टर)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Real attendance, +{rulesConfig?.policy?.fullMonthBonusDays ?? 2}d bonus, Late/Dress rules, Salary Slip PDF &amp; Bank NEFT · Pay Window:{" "}
              <strong className="text-teal-700 dark:text-teal-300">{rulesConfig?.policy?.salaryPayWindow || "15th–20th of next month"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold tabular-nums"
          />
          <button
            onClick={handleExportRegisterCsv}
            disabled={staffPayrollList.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 disabled:opacity-40 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            रजिस्टर CSV
          </button>
          <button
            onClick={handleExportBankCsv}
            disabled={staffPayrollList.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Bank NEFT CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={staffPayrollList.length === 0}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Pay-Sheet
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-700/60 shadow-xs">
          <div className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold mb-1">
            इस माह आज तक बना पैसा (Auto Track)
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 tabular-nums">
            ₹{payrollSummary.totalEarnedTillDate.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90 mt-1 tabular-nums font-semibold">
            Daily Present × ₹/दिन + Bonus - Late
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1">
            ऑटो हाजिरी ट्रैक ({selectedMonth})
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums flex items-center gap-2 mt-1">
            <span className="text-emerald-600 dark:text-emerald-400">P: {payrollSummary.totalPresentMarks}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-amber-600 dark:text-amber-400">L: {payrollSummary.totalLateMarks}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-rose-600 dark:text-rose-400">A: {payrollSummary.totalAbsentMarks}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {payrollSummary.count} active staff · Bonus: +₹{payrollSummary.totalBonus.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold mb-1">
            Total Deductions
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            ₹{payrollSummary.totalDeductions.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            PF, Absent, Late &amp; Dress rule cuts
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-teal-800/70 shadow-xs">
          <div className="text-[11px] uppercase tracking-wider text-teal-700 dark:text-teal-300 font-bold mb-1">
            पूर्ण मासिक वेतन (Full Net Est.)
          </div>
          <div className="text-2xl font-black text-teal-700 dark:text-teal-300 tabular-nums">
            ₹{payrollSummary.totalNet.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Pay Window: {rulesConfig?.policy?.salaryPayWindow || "15th–20th of next month"}
          </div>
        </div>
      </div>

      {/* Staff Payroll Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="tabular-nums">मासिक वेतन रजिस्टर ({selectedMonth})</span>
          </h3>
          <div className="relative w-full sm:w-64 print:hidden">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="स्टाफ नाम या आईडी खोजें..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {loading && staffPayrollList.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">
            पेरोल डेटा लोड हो रहा है...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {searchQuery.trim()
                ? "खोज के अनुसार कोई स्टाफ सदस्य नहीं मिला।"
                : "इस सत्र में अभी कोई शिक्षक या स्टाफ पेरोल डेटा उपलब्ध नहीं है।"}
            </div>
            {!searchQuery.trim() && (
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                कृपया पहले <strong>Faculty Directory</strong> में शिक्षक जोड़ें और{" "}
                उनका मासिक वेतन सेट करें।
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-extrabold text-[11px] uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-3">शिक्षक / कर्मचारी</th>
                  <th className="px-2.5 py-3 text-center text-emerald-700 dark:text-emerald-400">Present (उपस्थित)</th>
                  <th className="px-2.5 py-3 text-center text-amber-700 dark:text-amber-400">Late (देरी)</th>
                  <th className="px-2.5 py-3 text-center text-rose-700 dark:text-rose-400">Absent (अनुपस्थित)</th>
                  <th className="px-3.5 py-3 text-right">कितना वेतन था (तय वेतन)</th>
                  <th className="px-3.5 py-3 text-right text-rose-700 dark:text-rose-400">कितना कटा (कटौती)</th>
                  <th className="px-3.5 py-3 text-right text-emerald-700 dark:text-emerald-400">इस माह बना / Net</th>
                  <th className="px-3.5 py-3 text-center print:hidden">स्लिप / एडिट</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredStaff.map((staff) => {
                  const totalAllowances = staff.da + staff.hra + staff.conveyance;
                  const fixedGross = staff.basicSalary + totalAllowances;
                  const totalDeductions =
                    staff.pfDeduction +
                    staff.esiDeduction +
                    staff.advanceRecovery +
                    staff.latePenaltyAmount +
                    staff.dressPenaltyAmount;
                  const cutDetails: string[] = [];
                  if (staff.advanceRecovery > 0) cutDetails.push(`Abs -₹${staff.advanceRecovery.toLocaleString("en-IN")}`);
                  if (staff.latePenaltyAmount > 0) cutDetails.push(`Late -₹${staff.latePenaltyAmount.toLocaleString("en-IN")}`);
                  if (staff.dressPenaltyAmount > 0) cutDetails.push(`Dress -₹${staff.dressPenaltyAmount.toLocaleString("en-IN")}`);
                  if (staff.pfDeduction + staff.esiDeduction > 0) {
                    cutDetails.push(`PF/Other -₹${(staff.pfDeduction + staff.esiDeduction).toLocaleString("en-IN")}`);
                  }
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-3.5 py-3 font-semibold text-slate-900 dark:text-white min-w-[165px]">
                        <div className="font-bold">{staff.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="text-teal-600 dark:text-teal-400 font-mono font-bold">{staff.employeeId}</span> · {staff.role}
                        </div>
                        {staff.ruleBadges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {staff.ruleBadges.map((b, bi) => (
                              <span
                                key={bi}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  b.includes("Bonus")
                                    ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                                    : b.includes("Excused")
                                    ? "bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30"
                                    : "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                                }`}
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Present Column */}
                      <td className="px-2.5 py-3 text-center tabular-nums">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-black text-xs">
                          {staff.presentDays} दिन
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          /{staff.totalWorkingDays} कार्यदिवस
                        </div>
                      </td>

                      {/* Late Column */}
                      <td className="px-2.5 py-3 text-center tabular-nums">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs border ${
                            staff.lateDays > 0
                              ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                              : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {staff.lateDays} दिन
                        </span>
                      </td>

                      {/* Absent Column */}
                      <td className="px-2.5 py-3 text-center tabular-nums">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs border ${
                            staff.unpaidLeaveDays > 0
                              ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30"
                              : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {staff.unpaidLeaveDays} दिन
                        </span>
                      </td>

                      {/* Kitna Vetan Tha (Fixed Gross Salary) */}
                      <td className="px-3.5 py-3 text-right tabular-nums">
                        <div className="font-black text-slate-900 dark:text-white text-sm">
                          ₹{fixedGross.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Basic ₹{staff.basicSalary.toLocaleString("en-IN")}
                          {totalAllowances > 0 ? ` + भत्ते ₹${totalAllowances.toLocaleString("en-IN")}` : ""}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ₹{staff.perDayRate.toLocaleString("en-IN")}/दिन दर
                          {staff.bonusAmount > 0 ? ` · +₹${staff.bonusAmount.toLocaleString("en-IN")} बोनस` : ""}
                        </div>
                      </td>

                      {/* Kitna Kata (Total Deductions) */}
                      <td className="px-3.5 py-3 text-right tabular-nums">
                        <div
                          className={`font-black text-sm ${
                            totalDeductions > 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {totalDeductions > 0 ? `-₹${totalDeductions.toLocaleString("en-IN")}` : "₹0"}
                        </div>
                        <div className="text-[10px] text-rose-600/90 dark:text-rose-300/90 mt-0.5 max-w-[170px] ml-auto">
                          {cutDetails.length > 0 ? cutDetails.join(" · ") : "कोई कटौती नहीं"}
                        </div>
                      </td>

                      {/* Kitna Is Month Bana (Earned Till Date & Net) */}
                      <td className="px-3.5 py-3 text-right font-black tabular-nums">
                        <div className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 text-sm">
                          ₹{staff.earnedTillDate.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                          इस माह आज तक बना
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          पूरा माह Net: ₹{staff.netPayable.toLocaleString("en-IN")}
                        </div>
                      </td>

                      <td className="px-3.5 py-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPayRow({
                                id: staff.id,
                                name: staff.name,
                                role: staff.role,
                                employeeId: staff.employeeId,
                                monthlyBaseSalary: staff.basicSalary,
                                allowanceHra: staff.hra,
                                allowanceTravel: staff.conveyance,
                                allowanceSpecial: staff.da,
                                deductionPf: staff.pfDeduction,
                                deductionOther: staff.esiDeduction,
                                lateDays: staff.lateDays,
                                autoLateDays: staff.autoLateDays || 0,
                                dressViolationDays: staff.dressViolationDays,
                                lateEmergencyExcused: staff.lateEmergencyExcused,
                                bonusWaived: staff.bonusWaived,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="मासिक वेतन व Late/Dress नियम एडिट करें"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>वेतन एडिट</span>
                          </button>
                          <button
                            onClick={() => setSelectedStaffForSlip(staff)}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            स्लिप PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100/90 dark:bg-slate-950 font-black text-xs border-t-2 border-slate-200 dark:border-slate-700 tabular-nums">
                <tr>
                  <td className="px-3.5 py-3 text-slate-900 dark:text-white">
                    कुल योग ({filteredStaff.length} शिक्षक/स्टाफ)
                  </td>
                  <td className="px-2.5 py-3 text-center text-emerald-700 dark:text-emerald-300">
                    {filteredStaff.reduce((acc, s) => acc + s.presentDays, 0)} दिन
                  </td>
                  <td className="px-2.5 py-3 text-center text-amber-700 dark:text-amber-300">
                    {filteredStaff.reduce((acc, s) => acc + s.lateDays, 0)} दिन
                  </td>
                  <td className="px-2.5 py-3 text-center text-rose-700 dark:text-rose-300">
                    {filteredStaff.reduce((acc, s) => acc + s.unpaidLeaveDays, 0)} दिन
                  </td>
                  <td className="px-3.5 py-3 text-right text-slate-900 dark:text-white">
                    ₹{filteredStaff.reduce((acc, s) => acc + s.basicSalary + s.da + s.hra + s.conveyance, 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3.5 py-3 text-right text-rose-600 dark:text-rose-400">
                    -₹{filteredStaff.reduce((acc, s) => acc + s.pfDeduction + s.esiDeduction + s.advanceRecovery + s.latePenaltyAmount + s.dressPenaltyAmount, 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3.5 py-3 text-right text-emerald-700 dark:text-emerald-300">
                    <div>₹{filteredStaff.reduce((acc, s) => acc + s.earnedTillDate, 0).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Net: ₹{filteredStaff.reduce((acc, s) => acc + s.netPayable, 0).toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td className="px-3.5 py-3 print:hidden" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* PRINT & DOWNLOAD OFFICIAL SALARY SLIP MODAL */}
      {selectedStaffForSlip && (() => {
        const s = selectedStaffForSlip;
        const totalAllowances = s.da + s.hra + s.conveyance;
        const fixedGross = s.basicSalary + totalAllowances;
        const fixedDed = s.pfDeduction + s.esiDeduction;
        const ruleDed = s.latePenaltyAmount + s.dressPenaltyAmount;
        const totalDed = fixedDed + s.advanceRecovery + ruleDed;
        const sundayCount = Math.max(0, s.daysInMonth - s.totalWorkingDays);
        const policy = rulesConfig?.policy || {};
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
            <div className="bg-white text-slate-900 rounded-3xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl space-y-3.5 max-h-[94vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-teal-700/30 pb-3">
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded bg-teal-700 text-white text-[10px] font-black uppercase tracking-wider">
                    OFFICIAL SALARY SLIP / वेतन पर्ची
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 uppercase mt-1">
                    {school?.name || "SCHOOL NAME"}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Month: <strong className="text-slate-800">{selectedMonth}</strong> • Pay Window:{" "}
                    <strong className="text-teal-700">{policy.salaryPayWindow || "15th–20th of next month"}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStaffForSlip(null)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Employee & Rate Summary */}
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Employee ID &amp; Name</span>
                  <div className="font-black text-slate-900">{s.employeeId} • {s.name}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Designation</span>
                  <div className="font-bold text-slate-900">{s.role}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">तय वेतन व प्रति दिन दर</span>
                  <div className="font-black text-slate-900 tabular-nums">
                    ₹{fixedGross.toLocaleString("en-IN")}/माह (₹{s.perDayRate.toLocaleString("en-IN")}/दिन)
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Bank Account / IFSC</span>
                  <div className="font-mono text-slate-700 text-[11px]">
                    {s.bankAccountNo
                      ? `${s.bankAccountNo}${s.ifscCode ? ` (${s.ifscCode})` : ""}`
                      : "Counter / Cash"}
                  </div>
                </div>
              </div>

              {/* Running Days, Present, Absent, Cut Days Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
                  <div className="text-[10px] font-black uppercase text-teal-700">Running Days (चले कार्यदिवस)</div>
                  <div className="text-base font-black text-teal-950 tabular-nums mt-0.5">
                    {s.runningWorkingDays} / {s.totalWorkingDays} दिन
                  </div>
                  <div className="text-[10px] text-teal-700 font-semibold">
                    कुल माह: {s.daysInMonth} दिन ({sundayCount} रविवार)
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-black uppercase text-emerald-700">Present (उपस्थित दिन)</div>
                  <div className="text-base font-black text-emerald-950 tabular-nums mt-0.5">
                    {s.presentDays} दिन
                  </div>
                  <div className="text-[10px] text-emerald-800 font-semibold tabular-nums">
                    कमाई: ₹{s.rawPresentPay.toLocaleString("en-IN")} ({s.presentDays} × ₹{s.perDayRate})
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border ${s.totalCutDays > 0 || s.unpaidLeaveDays > 0 ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className={`text-[10px] font-black uppercase ${s.totalCutDays > 0 || s.unpaidLeaveDays > 0 ? "text-rose-700" : "text-slate-600"}`}>
                    Absent व कटे दिन (Cut Days)
                  </div>
                  <div className={`text-base font-black tabular-nums mt-0.5 ${s.totalCutDays > 0 || s.unpaidLeaveDays > 0 ? "text-rose-800" : "text-slate-900"}`}>
                    Absent: {s.unpaidLeaveDays}d · कटा: {s.totalCutDays} दिन
                  </div>
                  <div className="text-[10px] text-slate-600 font-semibold tabular-nums">
                    Late: {s.lateDays}d (Cut {s.latePenaltyDays}d) • Dress: {s.dressViolationDays}d (Cut {s.dressPenaltyDays}d)
                  </div>
                </div>
              </div>

              {/* Bonus Status Banner */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                s.bonusAmount > 0
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-amber-50 border-amber-300 text-amber-900"
              }`}>
                <span>
                  {s.bonusAmount > 0 ? "✅ बोनस मिला:" : "❌ बोनस स्थिति:"} {s.bonusReason}
                </span>
                <span className="font-black text-sm tabular-nums shrink-0">
                  {s.bonusAmount > 0 ? `+₹${s.bonusAmount.toLocaleString("en-IN")}` : "₹0"}
                </span>
              </div>

              {/* Earnings Till Today vs Deductions & Cut Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Earned Till Today */}
                <div className="border border-emerald-200 rounded-2xl p-3 space-y-1.5 bg-emerald-50/30">
                  <div className="font-black text-emerald-800 uppercase text-[10px] border-b border-emerald-200 pb-1">
                    इस माह आज तक बना पैसा (Earned Breakdown)
                  </div>
                  <div className="flex justify-between">
                    <span>उपस्थिति वेतन ({s.presentDays}d × ₹{s.perDayRate}):</span>
                    <span className="font-bold tabular-nums">₹{s.rawPresentPay.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>बोनस ({s.bonusAmount > 0 ? `मिला +${s.bonusDays}d` : "नहीं मिला"}):</span>
                    <span className={`font-bold tabular-nums ${s.bonusAmount > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                      {s.bonusAmount > 0 ? `+₹${s.bonusAmount.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>नियम कटौती (Late {s.latePenaltyDays}d + Dress {s.dressPenaltyDays}d):</span>
                    <span className="text-rose-600 font-bold tabular-nums">
                      {ruleDed > 0 ? `-₹${ruleDed.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200 pt-1.5 font-black text-emerald-900">
                    <span>आज तक बना कुल पैसा:</span>
                    <span className="tabular-nums">₹{s.earnedTillDate.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Deductions & Cut Days */}
                <div className="border border-slate-200 rounded-2xl p-3 space-y-1.5">
                  <div className="font-black text-rose-800 uppercase text-[10px] border-b border-slate-200 pb-1">
                    तय वेतन व कटौती ({s.totalCutDays} दिन का पैसा कटा)
                  </div>
                  <div className="flex justify-between">
                    <span>तय मासिक वेतन (Basic + भत्ते):</span>
                    <span className="font-bold tabular-nums">₹{fixedGross.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Absent कटौती ({s.unpaidLeaveDays} दिन अनुपस्थित):</span>
                    <span className="text-rose-600 font-bold tabular-nums">
                      {s.advanceRecovery > 0 ? `-₹${s.advanceRecovery.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late कटौती ({s.latePenaltyDays} दिन कटे / {s.lateDays}d देरी):</span>
                    <span className="text-rose-600 font-bold tabular-nums">
                      {s.latePenaltyAmount > 0 ? `-₹${s.latePenaltyAmount.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dress कटौती ({s.dressPenaltyDays} दिन कटे / {s.dressViolationDays}d):</span>
                    <span className="text-rose-600 font-bold tabular-nums">
                      {s.dressPenaltyAmount > 0 ? `-₹${s.dressPenaltyAmount.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                  {fixedDed > 0 && (
                    <div className="flex justify-between">
                      <span>PF / ESI / अन्य कटौती:</span>
                      <span className="text-rose-600 font-bold tabular-nums">-₹{fixedDed.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 font-black text-rose-800">
                    <span>कुल कटौती ({s.totalCutDays} दिन कटे):</span>
                    <span className="tabular-nums">{totalDed > 0 ? `-₹${totalDed.toLocaleString("en-IN")}` : "₹0 (कोई कटौती नहीं)"}</span>
                  </div>
                </div>
              </div>

              {/* Net Amount Banner — Shows Earned Till Today (Exact Match with Register!) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 flex justify-between items-center text-emerald-950 gap-3">
                <div>
                  <div className="font-black text-xs uppercase text-emerald-900">
                    इस माह आज तक बना / देय वेतन (Earned Payable Till Today)
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-0.5 tabular-nums">
                    पूरा माह Net (यदि पूरे {s.totalWorkingDays} दिन चलें): ₹{s.netPayable.toLocaleString("en-IN")}
                  </div>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 tabular-nums shrink-0">
                  ₹{s.earnedTillDate.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Applied Salary & Attendance Rules Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] space-y-1 text-slate-700">
                <div className="text-[10px] font-black uppercase text-teal-700">
                  लागू वेतन नियम (Salary &amp; Attendance Rules)
                </div>
                <div>• <strong>दैनिक दर:</strong> ₹{fixedGross.toLocaleString("en-IN")} ÷ {s.totalWorkingDays} कार्यदिवस = <strong>₹{s.perDayRate}/दिन</strong></div>
                <div>
                  • <strong>बोनस नियम:</strong>{" "}
                  {policy.enableAttendanceBonus
                    ? `0 अनुपस्थिति / 0 छुट्टी पर +${policy.fullMonthBonusDays ?? 2} दिन बोनस`
                    : "बोनस बंद"}{" "}
                  (स्थिति: <strong>{s.bonusAmount > 0 ? `मिला +₹${s.bonusAmount}` : "नहीं मिला"}</strong>)
                </div>
                <div>
                  • <strong>Late व Dress नियम:</strong>{" "}
                  {policy.enableLatePenalty
                    ? policy.lateTriggerMode === "every_n"
                      ? `हर ${policy.lateCutoffDays ?? 3} दिन देरी = 1 दिन कटौती`
                      : `${policy.lateCutoffDays ?? 3} दिन से अधिक देरी = 1 दिन कटौती`
                    : "Late कटौती बंद"}{" "}
                  ·{" "}
                  {policy.enableDressCodePenalty
                    ? `${policy.dressCodeCutoffDays ?? 3} दिन बिना ड्रेस = 1 दिन कटौती`
                    : "Dress कटौती बंद"}{" "}
                  · <strong>Absent नियम:</strong> 1 दिन अनुपस्थित = ₹{s.perDayRate} कटौती (&gt;{policy.maxFreeLeaveBeforeNoLeave ?? 2}d अनुपस्थित पर Leave Allowance नहीं)
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1 no-print">
                <button
                  type="button"
                  onClick={() => handleDownloadSalarySlipPdf(s)}
                  disabled={downloadingSlipPdf}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {downloadingSlipPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{downloadingSlipPdf ? "PDF बन रहा है..." : "स्लिप PDF डाउनलोड करें"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintSalarySlip(s)}
                  className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>प्रिंट करें</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStaffForSlip(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                >
                  बंद करें
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PAYROLL TOAST */}
      {payToast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-2xl border border-emerald-400">
          {payToast}
        </div>
      )}

      {/* EDIT SALARY STRUCTURE MODAL */}
      {editingPayRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">मासिक वेतन एडिट करें</h3>
                <p className="text-[11px] text-slate-400">
                  {editingPayRow.name} ({editingPayRow.employeeId}) • {editingPayRow.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayRow(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPay} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">मूल वेतन (Basic ₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPayRow.monthlyBaseSalary}
                    onChange={(e) =>
                      setEditingPayRow({ ...editingPayRow, monthlyBaseSalary: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">HRA भत्ता (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPayRow.allowanceHra}
                    onChange={(e) =>
                      setEditingPayRow({ ...editingPayRow, allowanceHra: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">यात्रा / Conveyance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPayRow.allowanceTravel}
                    onChange={(e) =>
                      setEditingPayRow({ ...editingPayRow, allowanceTravel: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">विशेष / DA भत्ता (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPayRow.allowanceSpecial}
                    onChange={(e) =>
                      setEditingPayRow({ ...editingPayRow, allowanceSpecial: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-rose-400 font-bold mb-1">PF कटौती (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPayRow.deductionPf}
                    onChange={(e) =>
                      setEditingPayRow({ ...editingPayRow, deductionPf: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-rose-800/60 text-rose-300 font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-rose-400 font-bold mb-1">अन्य / ESI कटौती (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPayRow.deductionOther}
                    onChange={(e) =>
                      setEditingPayRow({ ...editingPayRow, deductionOther: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-rose-800/60 text-rose-300 font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Monthly Rule Compliance Adjustments */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-black text-amber-300 uppercase">
                  नियम आधारित एडजस्टमेंट ({selectedMonth}) — Late &amp; Dress Code
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      Late Days (&gt;{rulesConfig?.policy?.lateCutoffDays ?? 3}d = 1d cut)
                      {(editingPayRow.autoLateDays || 0) > 0 && (
                        <span className="ml-1 text-[10px] text-amber-400">
                          (Auto Att: {editingPayRow.autoLateDays}d)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={editingPayRow.lateDays}
                      onChange={(e) =>
                        setEditingPayRow({
                          ...editingPayRow,
                          lateDays: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      Non-Dress Days ({rulesConfig?.policy?.dressCodeCutoffDays ?? 3}d = 1d cut)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={editingPayRow.dressViolationDays}
                      onChange={(e) =>
                        setEditingPayRow({
                          ...editingPayRow,
                          dressViolationDays: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-rose-300 font-bold tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-300">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPayRow.lateEmergencyExcused}
                      onChange={(e) =>
                        setEditingPayRow({
                          ...editingPayRow,
                          lateEmergencyExcused: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 accent-emerald-500"
                    />
                    <span>Emergency Excused (Principal Waiver)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPayRow.bonusWaived}
                      onChange={(e) =>
                        setEditingPayRow({
                          ...editingPayRow,
                          bonusWaived: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 accent-rose-500"
                    />
                    <span>Waive +{rulesConfig?.policy?.fullMonthBonusDays ?? 2}d Bonus</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
                <span className="font-bold text-teal-300">नया बेस मासिक वेतन (Base Net):</span>
                <span className="text-lg font-black text-white tabular-nums">
                  ₹
                  {Math.max(
                    0,
                    editingPayRow.monthlyBaseSalary +
                      editingPayRow.allowanceHra +
                      editingPayRow.allowanceTravel +
                      editingPayRow.allowanceSpecial -
                      editingPayRow.deductionPf -
                      editingPayRow.deductionOther
                  ).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPayRow(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={savingPay}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPay ? "सेव हो रहा है..." : "वेतन सेव करें"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
