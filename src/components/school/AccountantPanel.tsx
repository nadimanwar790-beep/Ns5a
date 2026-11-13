// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";
import {
  IndianRupee,
  Receipt,
  Users,
  Search,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  UserPlus,
  Bus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Plus,
  ChevronLeft,
  RefreshCw,
  Sliders,
  DollarSign,
  Share2,
  CreditCard,
  QrCode,
  Lock,
  RotateCw,
  LogOut,
  Building2,
  Phone,
  MessageCircle,
  Briefcase,
  X,
  Clock,
  BookOpen,
  Check,
  Percent,
  Wallet,
  Home,
  UserX,
  CalendarDays,
  PhoneCall,
  Sparkles,
  Laptop,
  Smartphone,
  Bell,
  RotateCcw
} from "lucide-react";
import { rotateToLandscape, rotateToPortrait, setDesktopMode, useDeviceOrientation } from "../../utils/displayPrefs";
import type {
  School,
  SchoolStudent,
  SchoolClass,
  SchoolSession,
  MonthlyFee,
  SchoolAccountant,
  AccountantPermissions,
  SchoolExpenseVoucher,
  AdmissionApplication,
  StoreSaleRecord
} from "../../school-types";
import {
  getSchool,
  getClasses,
  getSessions,
  getStudents,
  getMonthlyFees,
  getSchoolFeeHistory,
  saveFee,
  currentMonthStr,
  getAccountants,
  saveAccountant,
  getSchoolExpenseVouchers,
  saveSchoolExpenseVoucher,
  deleteSchoolExpenseVoucher,
  getAdmissions,
  saveStudent,
  updateStudent,
  getAttendance,
  todayStr as getTodayDateStr,
  getTeachers
} from "../../school-firebase";
import { loadMergedStoreSales } from "../../utils/schoolCloudSync";
import { computePaymentBreakdown } from "../../utils/paymentBreakdown";
import { toast } from "sonner";
import { FeeManager } from "./FeeManager";
import { OnlineAdmissionManager } from "./OnlineAdmissionManager";
import { AbsenteeActionPage } from "./AbsenteeActionPage";
import { SiblingProfileManager } from "./SiblingProfileManager";
import { NstaMessengerSuite } from "./NstaMessengerSuite";
import { ReceiptCancellationModal } from "./ReceiptCancellationModal";
import { RazorpaySettingsModal } from "./RazorpaySettingsModal";
import { printHtmlInIframe } from "./AdmissionFormPrintModal";
import {
  printPosSlipDirect,
  printA6SlipDirect,
  printDpsReceiptDirect,
  cleanLogoUrl,
  getSavedSchoolLogo
} from "./feeReceiptUtils";

interface Props {
  schoolId: string;
  accountantId?: string;
  onBack?: () => void;
  onLogout?: () => void;
  onOpenPlatformContent?: () => void;
}

type AccountantTab =
  | "home"
  | "counter"
  | "absentee"
  | "fee_collection"
  | "sibling_profiles"
  | "admissions"
  | "dues_defaulters"
  | "daybook"
  | "expenses"
  | "bus_fees"
  | "admission_receipt"
  | "qr_pay"
  | "fee_alerts"
  | "class_rates"
  | "receipt_header"
  | "receipt_cancellation"
  | "razorpay_setup"
  | "messenger";

const DEFAULT_PERMISSIONS: AccountantPermissions = {
  canCollectFee: true,
  canAdmitStudents: true,
  canGrantDiscount: true,
  maxDiscountLimitPct: 20,
  canRecordExpenses: true,
  canViewDayBook: true,
  canSendFeeAlerts: true,
  canManageBusFee: true,
  canPrintIdCards: true,
  canManageAbsentee: true
};

export const AccountantPanel: React.FC<Props> = ({
  schoolId,
  accountantId,
  onBack,
  onLogout,
  onOpenPlatformContent
}) => {
  const handleExploreFullApp = () => {
    try {
      localStorage.setItem("nst_app_view_mode", "STUDENT");
      window.dispatchEvent(new CustomEvent("nst_open_student_dashboard"));
    } catch {}
    if (onOpenPlatformContent) {
      onOpenPlatformContent();
    } else if (onBack) {
      onBack();
    }
  };

  const [activeTab, setActiveTab] = useState<AccountantTab>("home");
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sessions, setSessions] = useState<SchoolSession[]>([]);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [fees, setFees] = useState<MonthlyFee[]>([]);
  const [allHistoryFees, setAllHistoryFees] = useState<MonthlyFee[]>([]);
  const [storeSales, setStoreSales] = useState<StoreSaleRecord[]>([]);
  const [expenses, setExpenses] = useState<SchoolExpenseVoucher[]>([]);
  const [accountants, setAccountants] = useState<SchoolAccountant[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [activeAccountant, setActiveAccountant] = useState<SchoolAccountant | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    presentCount: number;
    absentCount: number;
    totalMarked: number;
    attendancePct: number;
  }>({
    presentCount: 0,
    absentCount: 0,
    totalMarked: 0,
    attendancePct: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Quick Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<{
    category: SchoolExpenseVoucher["category"];
    amount: number | "";
    paidTo: string;
    paymentMode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
    description: string;
  }>({
    category: "Stationery",
    amount: "",
    paidTo: "",
    paymentMode: "Cash",
    description: ""
  });

  // Fast Quick Collect modal state
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [selectedStudentForDues, setSelectedStudentForDues] = useState<SchoolStudent | null>(null);
  const [duesSettlementModal, setDuesSettlementModal] = useState<{
    student: SchoolStudent;
    type: "admission" | "advance";
    amount: string;
    mode: "Cash" | "UPI" | "Bank";
    saving: boolean;
  } | null>(null);

  // Continuous Device Orientation & Screen Width Hook
  const { isLandscape: isClientLandscape, isWideScreen } = useDeviceOrientation();
  const [isDesktopMode, setIsDesktopMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("accountant_desktop_mode") === "true";
    } catch {
      return false;
    }
  });
  const isEffectiveLandscape = isDesktopMode || isClientLandscape || isWideScreen;

  // Screen rotation helper
  const handleToggleOrientation = async () => {
    const next = !isEffectiveLandscape;
    setIsDesktopMode(next);
    try {
      localStorage.setItem("accountant_desktop_mode", next ? "true" : "false");
    } catch {}

    if (next) {
      await rotateToLandscape();
      setDesktopMode(true, false);
    } else {
      await rotateToPortrait();
      setDesktopMode(false, false);
    }
  };

  // Load core school and finance data
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      setLoading(true);
      try {
        const [schData, clsData, sessData, expData, accData, tchData] = await Promise.all([
          getSchool(schoolId),
          getClasses(schoolId),
          getSessions(schoolId),
          getSchoolExpenseVouchers(schoolId),
          getAccountants(schoolId),
          getTeachers(schoolId)
        ]);

        const currentSess = sessData?.find((s: any) => s.active) || sessData?.[0];
        const targetSessionId = currentSess?.id;

        const [stdData, feeData, histFeeData, storeSalesData] = await Promise.all([
          getStudents(schoolId, undefined, undefined, targetSessionId),
          getMonthlyFees(schoolId, currentMonthStr(), undefined, targetSessionId),
          getSchoolFeeHistory(schoolId, targetSessionId).catch(() => []),
          loadMergedStoreSales<StoreSaleRecord>(schoolId).catch(() => [])
        ]);

        if (!mounted) return;
        setSchool(schData);
        setClasses(targetSessionId ? (clsData || []).filter(c => !c.sessionId || c.sessionId === targetSessionId) : (clsData || []));
        setSessions(sessData || []);
        setStudents(stdData || []);
        setFees(feeData || []);
        setAllHistoryFees(Array.isArray(histFeeData) ? histFeeData : []);
        setStoreSales(Array.isArray(storeSalesData) ? storeSalesData : []);
        setExpenses(expData || []);
        setAccountants(accData || []);
        setTeachers(tchData || []);

        // Load today's attendance summary across classes
        const todayDateStr = getTodayDateStr();
        if (clsData && clsData.length > 0) {
          try {
            let pCount = 0;
            let aCount = 0;
            let tMarked = 0;
            const attResults = await Promise.allSettled(
              clsData.map(c => getAttendance(schoolId, c.id, todayDateStr))
            );
            attResults.forEach(res => {
              if (res.status === "fulfilled" && res.value?.students) {
                Object.values(res.value.students).forEach((s: any) => {
                  tMarked++;
                  if (s.present) pCount++;
                  else aCount++;
                });
              }
            });
            const pct = tMarked > 0 ? Math.round((pCount / tMarked) * 100) : 0;
            setAttendanceSummary({
              presentCount: pCount,
              absentCount: aCount,
              totalMarked: tMarked,
              attendancePct: pct,
            });
          } catch (attErr) {
            console.warn("[AccountantPanel] Failed loading attendance summary:", attErr);
          }
        }

        if (accData && accData.length > 0) {
          const found = accountantId ? accData.find(a => a.id === accountantId) : accData[0];
          setActiveAccountant(found || accData[0]);
        } else {
          // Fallback accountant profile
          const defaultAcc: SchoolAccountant = {
            id: accountantId || "acc_head_01",
            schoolId,
            name: "Head Accountant",
            phone: "",
            employeeId: "ACC-01",
            designation: "Senior School Accountant & Cashier",
            joinDate: "2026-04-01",
            active: true,
            permissions: DEFAULT_PERMISSIONS,
            createdAt: new Date().toISOString()
          };
          setActiveAccountant(defaultAcc);
        }
      } catch (err) {
        console.error("Failed to load accountant panel data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();
    return () => {
      mounted = false;
    };
  }, [schoolId, accountantId, refreshTrigger]);

  const permissions: AccountantPermissions = activeAccountant?.permissions || DEFAULT_PERMISSIONS;

  // Active Session
  const activeSession = useMemo(() => {
    return sessions.find(s => s.active) || sessions[0] || { id: "2026-27", name: "2026-27", active: true };
  }, [sessions]);

  // Today's Date String YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  // Today's Financial Summary (3-Channel: Cash / Online QR Code / NSTA Online across Fees + Store)
  const financialSummary = useMemo(() => {
    const feePool = allHistoryFees.length > 0 ? allHistoryFees : fees;
    const todayBreakdown = computePaymentBreakdown({
      fees: feePool,
      storeSales,
      datePrefix: todayStr,
    });
    const monthPrefix = todayStr.slice(0, 7);
    const monthBreakdown = computePaymentBreakdown({
      fees: feePool,
      storeSales,
      datePrefix: monthPrefix,
    });

    let monthPendingDues = 0;
    fees.forEach(f => {
      if (!f.paid) {
        monthPendingDues += Number(f.balanceDue !== undefined ? f.balanceDue : f.amount || 0);
      }
    });

    let todayExpenseCash = 0;
    let todayExpenseUpi = 0;
    let todayExpenseTotal = 0;

    expenses.forEach(e => {
      if (e.date && e.date.startsWith(todayStr)) {
        const amt = Number(e.amount || 0);
        todayExpenseTotal += amt;
        if (e.paymentMode === "Cash") {
          todayExpenseCash += amt;
        } else {
          todayExpenseUpi += amt;
        }
      }
    });

    const netCashInHand = todayBreakdown.cash - todayExpenseCash;

    return {
      todayCashFee: todayBreakdown.cash,
      todayQrFee: todayBreakdown.onlineQr,
      todayNstaOnlineFee: todayBreakdown.nstaOnline,
      todayUpiFee: todayBreakdown.onlineQr + todayBreakdown.nstaOnline,
      todayTotalFee: todayBreakdown.total,
      todayFeeOnlyTotal: todayBreakdown.feeTotal,
      todayStoreTotal: todayBreakdown.storeTotal,
      monthTotalFee: monthBreakdown.total,
      monthCash: monthBreakdown.cash,
      monthOnlineQr: monthBreakdown.onlineQr,
      monthNstaOnline: monthBreakdown.nstaOnline,
      monthPendingDues: monthPendingDues || 0,
      totalDuesAmount: monthPendingDues || 0,
      todayExpenseTotal: todayExpenseTotal || 0,
      todayExpenseCash: todayExpenseCash || 0,
      todayExpenseUpi: todayExpenseUpi || 0,
      netCashInHand: netCashInHand || 0,
    };
  }, [fees, allHistoryFees, storeSales, expenses, todayStr]);

  // Defaulters List - O(N) optimized with hash map lookups
  const defaultersList = useMemo(() => {
    const studentMap = new Map<string, SchoolStudent>();
    students.forEach(s => studentMap.set(s.id, s));

    const unpaidMap = new Map<string, { student: SchoolStudent; unpaidAmount: number; unpaidMonths: string[] }>();
    fees.forEach(f => {
      const isDue = !f.paid || (f.balanceDue !== undefined && Number(f.balanceDue) > 0);
      if (isDue) {
        const student = studentMap.get(f.studentId);
        if (student) {
          const due = f.balanceDue !== undefined ? Number(f.balanceDue) : Number(f.amount || 0);
          const existing = unpaidMap.get(f.studentId);
          if (existing) {
            existing.unpaidAmount += due;
            if (f.month && !existing.unpaidMonths.includes(f.month)) {
              existing.unpaidMonths.push(f.month);
            }
          } else {
            unpaidMap.set(f.studentId, {
              student,
              unpaidAmount: due,
              unpaidMonths: f.month ? [f.month] : []
            });
          }
        }
      }
    });
    return Array.from(unpaidMap.values()).sort((a, b) => b.unpaidAmount - a.unpaidAmount);
  }, [students, fees]);

  // Handle adding expense voucher
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || Number(newExpense.amount) <= 0 || !newExpense.paidTo.trim()) {
      toast.error("कृपया मान्य राशि व प्राप्तकर्ता का नाम दर्ज करें।");
      return;
    }

    try {
      const voucher: SchoolExpenseVoucher = {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        schoolId,
        voucherNo: `VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: todayStr,
        category: newExpense.category,
        amount: Number(newExpense.amount),
        paidTo: newExpense.paidTo.trim(),
        paymentMode: newExpense.paymentMode,
        recordedBy: activeAccountant?.name || "Accountant",
        description: newExpense.description.trim(),
        createdAt: new Date().toISOString()
      };

      await saveSchoolExpenseVoucher(voucher);
      setExpenses(prev => [voucher, ...prev]);
      setShowExpenseModal(false);
      setNewExpense({
        category: "Stationery",
        amount: "",
        paidTo: "",
        paymentMode: "Cash",
        description: ""
      });
      toast.success(`वाउचर #${voucher.voucherNo} सफलता पूर्वक सहेजा गया!`);
    } catch (err) {
      console.error("Expense save failed:", err);
      toast.error("वाउचर सुरक्षित करने में त्रुटि हुई। पुनः प्रयास करें।");
    }
  };

  // Quick print expense voucher (iframe-safe, never blocked by popup blockers)
  const handlePrintExpenseVoucher = (voucher: SchoolExpenseVoucher) => {
    const schoolLogo = getSavedSchoolLogo() || cleanLogoUrl(school?.logoUrl || "");
    const htmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Expense Voucher - ${voucher.voucherNo}</title>
        <style>
          @page { size: A5 landscape; margin: 8mm; }
          body { font-family: system-ui, -apple-system, sans-serif; margin: 16px; color: #1e293b; background: #fff; }
          .voucher-box { border: 2px solid #0f172a; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
          .school-name { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
          .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .title-tag { display: inline-block; background: #0f172a; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 8px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .label { font-weight: 600; color: #64748b; }
          .val { font-weight: 700; color: #0f172a; }
          .amount-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 6px; text-align: center; margin: 16px 0; }
          .amount-val { font-size: 24px; font-weight: 900; color: #047857; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; border-top: 1px dashed #94a3b8; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="voucher-box">
          <div class="header">
            ${schoolLogo ? `<img src="${schoolLogo}" style="height: 40px; margin-bottom: 4px;" />` : ""}
            <div class="school-name">${school?.name || "School"}</div>
            <div class="sub">${school?.address || "Official Payment Voucher"}</div>
            <div class="title-tag">DEBIT EXPENSE VOUCHER</div>
          </div>
          <div class="row">
            <div><span class="label">Voucher No:</span> <span class="val">${voucher.voucherNo}</span></div>
            <div><span class="label">Date:</span> <span class="val">${voucher.date}</span></div>
          </div>
          <div class="row">
            <div><span class="label">Paid To:</span> <span class="val">${voucher.paidTo}</span></div>
            <div><span class="label">Payment Mode:</span> <span class="val">${voucher.paymentMode}</span></div>
          </div>
          <div class="row">
            <div><span class="label">Category:</span> <span class="val">${voucher.category}</span></div>
            <div><span class="label">Prepared By:</span> <span class="val">${voucher.recordedBy}</span></div>
          </div>
          <div class="amount-box">
            <div class="label">AMOUNT PAID</div>
            <div class="amount-val">₹ ${(Number(voucher?.amount) || 0).toLocaleString("en-IN")}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">(${voucher.description || "School Operational Expense"})</div>
          </div>
          <div class="signatures">
            <div>Receiver's Signature</div>
            <div>Accountant Signature</div>
            <div>Principal / Admin Seal</div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHtmlInIframe(htmlDoc, `Expense_Voucher_${voucher.voucherNo}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* ── TOP NAV HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
            title="Menu"
          >
            <Sliders className="w-5 h-5" />
          </button>

          {/* School Badge & Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 shadow-md">
              <Briefcase className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm md:text-base text-white truncate max-w-[200px] sm:max-w-md">
                  {school?.name || "School ERP"}
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ACCOUNTANT / CASHIER PORTAL
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-semibold text-amber-400">{activeSession.name}</span>
                <span>•</span>
                <span className="text-slate-300 font-medium truncate max-w-[150px]">
                  {activeAccountant?.name || "Accountant"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Refresh Data */}
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden sm:inline">रीफ्रेश</span>
          </button>

          {/* Mobile / Laptop Rotate Toggle Button */}
          <button
            onClick={handleToggleOrientation}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer active:scale-95 shadow-md border ${
              isEffectiveLandscape
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white border-cyan-300/60 shadow-cyan-500/30 ring-2 ring-cyan-400/30"
                : "bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10"
            }`}
            title={
              isEffectiveLandscape
                ? "Mobile (Portrait) Mode me wapas layein"
                : "Laptop (Desktop) Mode me badlein"
            }
          >
            {isEffectiveLandscape ? (
              <>
                <Laptop className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
                <span className="inline">💻 Laptop</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="inline">📱 Mobile</span>
              </>
            )}
          </button>

          {/* Back to Admin ERP button */}
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Back to Admin ERP</span>
            </button>
          )}

          {/* Logout if standalone */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN WORKSPACE WITH SIDEBAR ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 p-4 space-y-6 shrink-0 overflow-y-auto">
          {/* Cash In Hand Mini Counter */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-emerald-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
              <span>आज का नकद (Cash In Hand)</span>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              ₹ {(Number(financialSummary.netCashInHand) || 0).toLocaleString("en-IN")}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>आज फीस: ₹{(Number(financialSummary.todayTotalFee) || 0).toLocaleString("en-IN")}</span>
              <span className="text-rose-400">खर्च: ₹{(Number(financialSummary.todayExpenseTotal) || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Menu Sections */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 py-1">
              मुख्य अवलोकन (DASHBOARD)
            </div>

            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "home"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home Dashboard (होम)</span>
            </button>

            <button
              onClick={() => setActiveTab("counter")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "counter"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <IndianRupee className="w-4 h-4" />
              <span>Cash Counter & Overview</span>
            </button>

            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 py-1 pt-2">
              छात्र उपस्थिति व संपर्क (ATTENDANCE)
            </div>

            <button
              onClick={() => setActiveTab("absentee")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "absentee"
                  ? "bg-rose-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <UserX className="w-4 h-4 text-rose-400" />
                <span>Absentee Desk (अनुपस्थिति)</span>
              </div>
              {attendanceSummary.absentCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {attendanceSummary.absentCount}
                </span>
              )}
            </button>

            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 py-1 pt-2">
              वित्त व काउंटर (FINANCE & POS)
            </div>

            {permissions.canCollectFee && (
              <button
                onClick={() => setActiveTab("fee_collection")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  activeTab === "fee_collection"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Fee Collection & 3" POS Slip</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("sibling_profiles")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "sibling_profiles"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Sibling Profiles (भाई-बहन प्रोफाइल)</span>
            </button>

            {permissions.canAdmitStudents && (
              <button
                onClick={() => setActiveTab("admissions")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  activeTab === "admissions"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Online & Direct Admission</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("dues_defaulters")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "dues_defaulters"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Fee Dues & Defaulters</span>
              </div>
              {defaultersList.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {defaultersList.length}
                </span>
              )}
            </button>

            {permissions.canViewDayBook && (
              <button
                onClick={() => setActiveTab("daybook")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  activeTab === "daybook"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Daily Cashbook & Settlement</span>
              </button>
            )}

            {permissions.canRecordExpenses && (
              <button
                onClick={() => setActiveTab("expenses")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  activeTab === "expenses"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>School Expense Vouchers</span>
              </button>
            )}

            {permissions.canManageBusFee && (
              <button
                onClick={() => setActiveTab("bus_fees")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  activeTab === "bus_fees"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Bus className="w-4 h-4" />
                <span>Bus & Transport Dues</span>
              </button>
            )}

            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 py-1 pt-2">
              फीस टूल्स व सेटिंग्स (FEE TOOLS)
            </div>

            {permissions.canCollectFee && (
              <>
                <button
                  onClick={() => setActiveTab("admission_receipt")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                    activeTab === "admission_receipt"
                      ? "bg-amber-500 text-slate-950 shadow-md font-black"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>New Admission Receipt (+ प्रवेश शुल्क)</span>
                </button>

                <button
                  onClick={() => setActiveTab("qr_pay")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                    activeTab === "qr_pay"
                      ? "bg-amber-500 text-slate-950 shadow-md font-black"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Scan ID Card QR (फास्ट पे)</span>
                </button>
              </>
            )}

            {permissions.canSendFeeAlerts && (
              <button
                onClick={() => setActiveTab("fee_alerts")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  activeTab === "fee_alerts"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Bell className="w-4 h-4 text-purple-400" />
                <span>Class Fee Alerts & Push</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("class_rates")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "class_rates"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Class Fee Rates & Structure</span>
            </button>

            <button
              onClick={() => setActiveTab("receipt_header")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "receipt_header"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Building2 className="w-4 h-4 text-slate-300" />
              <span>Receipt Header & Print Settings</span>
            </button>

            <button
              onClick={() => setActiveTab("receipt_cancellation")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "receipt_cancellation"
                  ? "bg-rose-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Receipt Cancellation & Refund</span>
            </button>

            <button
              onClick={() => setActiveTab("razorpay_setup")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "razorpay_setup"
                  ? "bg-indigo-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>Razorpay Auto-Webhook Setup</span>
            </button>

            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 py-1 pt-2">
              कम्युनिकेशन व मेसेंजर (COMMUNICATION)
            </div>

            <button
              onClick={() => setActiveTab("messenger")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeTab === "messenger"
                  ? "bg-emerald-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>NSTA Messenger (मेसेंजर)</span>
            </button>
          </div>

          {/* Quick Expense Action Button */}
          {permissions.canRecordExpenses && (
            <div className="pt-2">
              <button
                onClick={() => setShowExpenseModal(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया खर्च वाउचर दर्ज करें</span>
              </button>
            </div>
          )}

          {/* Explore Full NSTA Learning App */}
          <button
            type="button"
            onClick={handleExploreFullApp}
            className="w-full p-2.5 rounded-xl bg-gradient-to-r from-indigo-900/70 via-purple-900/60 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-left transition flex items-center justify-between gap-2 shadow-md group cursor-pointer active:scale-95"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-amber-300">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white group-hover:text-indigo-200 truncate">
                  Explore Full NSTA App
                </p>
                <p className="text-[9.5px] text-indigo-300/80 truncate">
                  53+ Books, MCQs &amp; Study Room
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* Security & Boundary Notice */}
          <div className="mt-auto p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Role Security: Accountant</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              आपको केवल फीस, रसीद, प्रवेश व खर्च की अधिकृत शक्तियां दी गई हैं। परीक्षा अंक या शिक्षण डायरी Admin व शिक्षकों के अधीन है।
            </p>
          </div>
        </aside>

        {/* MOBILE DRAWER NAVIGATION */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-slate-950 p-4 flex flex-col space-y-4 z-10 border-r border-slate-800 h-full overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-black text-sm text-amber-400">Accountant Menu</div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("home");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "home" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-300"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home Dashboard (होम)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("counter");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "counter" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-300"
                  }`}
                >
                  <IndianRupee className="w-4 h-4" />
                  <span>Cash Counter & Overview</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("absentee");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "absentee" ? "bg-rose-600 text-white font-black" : "text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserX className="w-4 h-4 text-rose-400" />
                    <span>Absentee Desk (अनुपस्थिति)</span>
                  </div>
                  {attendanceSummary.absentCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300">
                      {attendanceSummary.absentCount}
                    </span>
                  )}
                </button>

                {permissions.canCollectFee && (
                  <button
                    onClick={() => {
                      setActiveTab("fee_collection");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                      activeTab === "fee_collection" ? "bg-amber-500 text-slate-950" : "text-slate-300"
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Fee Collection & 3" POS</span>
                  </button>
                )}

                {permissions.canAdmitStudents && (
                  <button
                    onClick={() => {
                      setActiveTab("admissions");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                      activeTab === "admissions" ? "bg-amber-500 text-slate-950" : "text-slate-300"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Online & Direct Admission</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab("dues_defaulters");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "dues_defaulters" ? "bg-amber-500 text-slate-950" : "text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Fee Dues & Defaulters</span>
                  </div>
                  {defaultersList.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300">
                      {defaultersList.length}
                    </span>
                  )}
                </button>

                {permissions.canViewDayBook && (
                  <button
                    onClick={() => {
                      setActiveTab("daybook");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                      activeTab === "daybook" ? "bg-amber-500 text-slate-950" : "text-slate-300"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Daily Cashbook & Settlement</span>
                  </button>
                )}

                {permissions.canRecordExpenses && (
                  <button
                    onClick={() => {
                      setActiveTab("expenses");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                      activeTab === "expenses" ? "bg-amber-500 text-slate-950" : "text-slate-300"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>School Expense Vouchers</span>
                  </button>
                )}

                {permissions.canManageBusFee && (
                  <button
                    onClick={() => {
                      setActiveTab("bus_fees");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                      activeTab === "bus_fees" ? "bg-amber-500 text-slate-950" : "text-slate-300"
                    }`}
                  >
                    <Bus className="w-4 h-4" />
                    <span>Bus & Transport Dues</span>
                  </button>
                )}

                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 py-1 pt-2">
                  फीस टूल्स व सेटिंग्स (FEE TOOLS)
                </div>

                {permissions.canCollectFee && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab("admission_receipt");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                        activeTab === "admission_receipt" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-300"
                      }`}
                    >
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      <span>New Admission Receipt (+ प्रवेश शुल्क)</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("qr_pay");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                        activeTab === "qr_pay" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-300"
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Scan ID Card QR (फास्ट पे)</span>
                    </button>
                  </>
                )}

                {permissions.canSendFeeAlerts && (
                  <button
                    onClick={() => {
                      setActiveTab("fee_alerts");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                      activeTab === "fee_alerts" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-300"
                    }`}
                  >
                    <Bell className="w-4 h-4 text-purple-400" />
                    <span>Class Fee Alerts & Push</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab("class_rates");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "class_rates" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-300"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Class Fee Rates & Structure</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("receipt_header");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "receipt_header" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-300"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-slate-300" />
                  <span>Receipt Header & Print Settings</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("receipt_cancellation");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "receipt_cancellation" ? "bg-rose-600 text-white font-black" : "text-slate-300"
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Receipt Cancellation & Refund</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("razorpay_setup");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "razorpay_setup" ? "bg-indigo-600 text-white font-black" : "text-slate-300"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Razorpay Auto-Webhook Setup</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("messenger");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    activeTab === "messenger" ? "bg-emerald-600 text-white font-black" : "text-slate-300"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>NSTA Messenger (मेसेंजर)</span>
                </button>

                {/* Explore Full NSTA Learning App */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleExploreFullApp();
                    }}
                    className="w-full p-2.5 rounded-xl bg-gradient-to-r from-indigo-900/70 via-purple-900/60 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-left transition flex items-center justify-between gap-2 shadow-md group cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white group-hover:text-indigo-200 truncate">
                          Explore Full NSTA App
                        </p>
                        <p className="text-[9.5px] text-indigo-300/80 truncate">
                          53+ Books, MCQs &amp; Study Room
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 bg-slate-900 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* TAB 0: HOME DASHBOARD (मुख्य विद्यालय व वित्तीय अवलोकन) */}
          {activeTab === "home" && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Accountant Home Dashboard • {school?.name || "School ERP"}</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white">
                    नमस्ते, {activeAccountant?.name || "Accountant"}
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
                    दैनिक रोकड़ बही, 3-इंच POS थर्मल फीस रसीद, प्रवेश व छात्र अनुपस्थिति (Absentee Management) का समग्र अवलोकन।
                  </p>
                  <div className="flex items-center gap-3 pt-2 text-xs flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 font-bold">
                      सत्र: <strong className="text-amber-400">{activeSession.name}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 font-bold">
                      दिनांक: <strong className="text-white">{todayStr}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      Emp ID: {activeAccountant?.employeeId || "ACC-01"}
                    </span>
                  </div>
                </div>

                {/* Cash in Hand Big Highlight */}
                <div className="w-full md:w-auto p-5 rounded-3xl bg-amber-500/15 border border-amber-500/30 shadow-lg text-center md:text-right shrink-0">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-1">
                    वर्तमान नकद गल्ला (Cash In Hand)
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                    ₹ {(Number(financialSummary.netCashInHand) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-2 flex items-center justify-center md:justify-end gap-3 text-xs text-slate-400">
                    <span>आज की फीस: <strong className="text-emerald-400">₹{(Number(financialSummary.todayTotalFee) || 0).toLocaleString("en-IN")}</strong></span>
                    <span>खर्च: <strong className="text-rose-400">₹{(Number(financialSummary.todayExpenseTotal) || 0).toLocaleString("en-IN")}</strong></span>
                  </div>
                </div>
              </div>

              {/* ── 4 KPI CARDS ──────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Students */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>कुल नामांकित छात्र</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-3xl font-black text-white tabular-nums">
                    {students.length}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    कुल {classes.length} कक्षाएं सक्रिय हैं
                  </p>
                </div>

                {/* 2. Today's Attendance & Absentee */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>आज की उपस्थिति (Attendance)</span>
                    <UserX className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-400 tabular-nums">
                      {attendanceSummary.attendancePct}%
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      ({attendanceSummary.presentCount} उपस्थित)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${attendanceSummary.attendancePct}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${100 - attendanceSummary.attendancePct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-rose-400 font-bold">{attendanceSummary.absentCount} छात्र अनुपस्थित</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("absentee")}
                      className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                    >
                      कॉल व नोटिस &rarr;
                    </button>
                  </div>
                </div>

                {/* 3. Today's Total Collections (3-Channel Breakdown) */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>आज का कुल संकलन</span>
                    <Receipt className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black text-white tabular-nums">
                    ₹ {(Number(financialSummary.todayTotalFee) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800/80 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">Online QR</span>
                      <span className="font-black text-cyan-400 tabular-nums">₹{(Number(financialSummary.todayQrFee) || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="border-l border-slate-800 pl-1.5">
                      <span className="text-slate-400 block">NSTA Online</span>
                      <span className="font-black text-indigo-400 tabular-nums">₹{(Number(financialSummary.todayNstaOnlineFee) || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="border-l border-slate-800 pl-1.5">
                      <span className="text-slate-400 block">Cash</span>
                      <span className="font-black text-emerald-400 tabular-nums">₹{(Number(financialSummary.todayCashFee) || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Total Dues & Defaulters */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>बकाया फीस छात्र</span>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-3xl font-black text-rose-400 tabular-nums">
                    {defaultersList.length}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    कुल अनुमानित बकाया: ₹{(Number(financialSummary.totalDuesAmount ?? financialSummary.monthPendingDues) || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* ── ADMISSION BALANCE & 1-MONTH ADVANCE FEE DUES CARDS ──────── */}
              {(() => {
                const studentsWithAdmissionDues = students.filter(
                  (s) => Number(s.admissionDueBalance || 0) > 0
                );
                const totalAdmissionDue = studentsWithAdmissionDues.reduce(
                  (sum, s) => sum + Number(s.admissionDueBalance || 0),
                  0
                );

                const studentsWithAdvanceDues = students.filter(
                  (s) =>
                    s.advanceMonthlyFeePaid === false &&
                    Number(s.advanceMonthlyFeeDue || s.monthlyFee || 0) > 0
                );
                const totalAdvanceDue = studentsWithAdvanceDues.reduce(
                  (sum, s) => sum + Number(s.advanceMonthlyFeeDue || s.monthlyFee || 0),
                  0
                );

                const getClassLabel = (clsId: string) =>
                  classes.find((c) => c.id === clsId)?.name || "Class";

                const openWhatsAppReminder = (
                  st: SchoolStudent,
                  headLabel: string,
                  dueAmt: number
                ) => {
                  const phone = (st.parentPhone || st.phone || "").replace(/\D/g, "");
                  const targetPhone = phone.length === 10 ? `91${phone}` : phone;
                  const msg = encodeURIComponent(
                    `नमस्ते ${st.fatherName || "अभिभावक जी"},\n${school?.name || "School"} से सूचना:\nछात्र/छात्रा: *${st.name}* (${getClassLabel(st.classId)}, Roll #${st.rollNo || "—"})\nबकाया शीर्षक: *${headLabel}*\nबकाया राशि: *₹${dueAmt.toLocaleString("en-IN")}*\nकृपया शीघ्र शुल्क जमा कराने की कृपा करें। धन्यवाद!`
                  );
                  const url = targetPhone
                    ? `https://wa.me/${targetPhone}?text=${msg}`
                    : `https://wa.me/?text=${msg}`;
                  safeOpenExternalUrl(url);
                };

                const handleSettleDue = async () => {
                  if (!duesSettlementModal || !schoolId) return;
                  const { student: st, type, amount, mode } = duesSettlementModal;
                  const payAmt = Math.max(0, Number(amount) || 0);
                  if (payAmt <= 0) return;

                  setDuesSettlementModal((prev) => (prev ? { ...prev, saving: true } : null));
                  const todayIso = new Date().toISOString().slice(0, 10);
                  const receiptNo = `ADM-${Date.now().toString().slice(-6)}`;

                  try {
                    let patch: Partial<SchoolStudent> = {};
                    if (type === "admission") {
                      const curDue = Number(st.admissionDueBalance || 0);
                      const applied = Math.min(curDue, payAmt);
                      const rem = Math.max(0, curDue - applied);
                      patch = {
                        admissionDueBalance: rem,
                        admissionPaidAmount: Number(st.admissionPaidAmount || 0) + applied,
                        admissionBalanceHistory: [
                          ...(st.admissionBalanceHistory || []),
                          {
                            date: todayIso,
                            paidAmount: applied,
                            remainingDue: rem,
                            receiptNo,
                            paymentMode: mode,
                          },
                        ],
                      };
                    } else {
                      patch = {
                        advanceMonthlyFeePaid: true,
                        advanceMonthlyFeeDue: 0,
                      };
                    }

                    await updateStudent(schoolId, st.id, patch);
                    setStudents((prev) =>
                      prev.map((item) => (item.id === st.id ? { ...item, ...patch } : item))
                    );
                    toast.success("भुगतान सफलतापूर्वक दर्ज किया गया!");
                    setDuesSettlementModal(null);
                  } catch (err) {
                    console.error("Accountant settle due failed:", err);
                    toast.error("भुगतान सहेजने में त्रुटि हुई।");
                    setDuesSettlementModal((prev) => (prev ? { ...prev, saving: false } : null));
                  }
                };

                return (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* CARD 1: PENDING ADMISSION BALANCE */}
                      <div className="rounded-2xl border border-rose-900/70 bg-rose-950/25 p-5 flex flex-col justify-between gap-3">
                        <div className="flex items-start justify-between gap-3 border-b border-rose-900/50 pb-3">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                              Pending Admission Balance
                            </span>
                            <h3 className="text-base font-black text-white mt-0.5">
                              अधूरा एडमिशन शुल्क (Admission Arrears)
                            </h3>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black font-mono tabular-nums text-rose-300">
                              ₹{totalAdmissionDue.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[11px] font-bold font-mono tabular-nums text-rose-400">
                              {studentsWithAdmissionDues.length} Students
                            </p>
                          </div>
                        </div>

                        {studentsWithAdmissionDues.length === 0 ? (
                          <div className="py-5 text-center text-xs font-semibold text-slate-400">
                            सभी छात्रों का एडमिशन शुल्क पूर्ण जमा है।
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {studentsWithAdmissionDues.slice(0, 12).map((st) => {
                              const due = Number(st.admissionDueBalance || 0);
                              return (
                                <div
                                  key={st.id}
                                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-rose-900/40"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">{st.name}</p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {getClassLabel(st.classId)} • Roll #{st.rollNo || "—"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-black font-mono tabular-nums text-rose-300 mr-1">
                                      ₹{due.toLocaleString("en-IN")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDuesSettlementModal({
                                          student: st,
                                          type: "admission",
                                          amount: String(due),
                                          mode: "Cash",
                                          saving: false,
                                        })
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition cursor-pointer"
                                    >
                                      💰 जमा करें
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openWhatsAppReminder(st, "बकाया एडमिशन शुल्क", due)
                                      }
                                      className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer"
                                      title="WhatsApp Reminder"
                                    >
                                      📲
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* CARD 2: 1-MONTH ADVANCE FEE UNPAID */}
                      <div className="rounded-2xl border border-amber-900/70 bg-amber-950/25 p-5 flex flex-col justify-between gap-3">
                        <div className="flex items-start justify-between gap-3 border-b border-amber-900/50 pb-3">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                              Unpaid 1-Month Advance Fee
                            </span>
                            <h3 className="text-base font-black text-white mt-0.5">
                              1-माह एडवांस फीस बकाया (Advance Tuition)
                            </h3>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black font-mono tabular-nums text-amber-300">
                              ₹{totalAdvanceDue.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[11px] font-bold font-mono tabular-nums text-amber-400">
                              {studentsWithAdvanceDues.length} Students
                            </p>
                          </div>
                        </div>

                        {studentsWithAdvanceDues.length === 0 ? (
                          <div className="py-5 text-center text-xs font-semibold text-slate-400">
                            सभी नए छात्रों की 1-माह एडवांस फीस जमा है।
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {studentsWithAdvanceDues.slice(0, 12).map((st) => {
                              const advDue = Number(st.advanceMonthlyFeeDue || st.monthlyFee || 0);
                              return (
                                <div
                                  key={st.id}
                                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-amber-900/40"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">{st.name}</p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {getClassLabel(st.classId)} • Roll #{st.rollNo || "—"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-black font-mono tabular-nums text-amber-300 mr-1">
                                      ₹{advDue.toLocaleString("en-IN")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDuesSettlementModal({
                                          student: st,
                                          type: "advance",
                                          amount: String(advDue),
                                          mode: "Cash",
                                          saving: false,
                                        })
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ⚡ जमा करें
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openWhatsAppReminder(st, "1-माह एडवांस ट्यूशन फीस", advDue)
                                      }
                                      className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer"
                                      title="WhatsApp Reminder"
                                    >
                                      📲
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 1-TAP DUES SETTLEMENT MODAL */}
                    {duesSettlementModal && (
                      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                              <h4 className="text-base font-black text-white">
                                {duesSettlementModal.type === "admission"
                                  ? "💰 अधूरा एडमिशन शुल्क जमा करें"
                                  : "⚡ 1-माह एडवांस फीस जमा करें"}
                              </h4>
                              <p className="text-xs text-slate-400">
                                {duesSettlementModal.student.name} ({getClassLabel(duesSettlementModal.student.classId)})
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDuesSettlementModal(null)}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-1">
                                जमा राशि (Amount in ₹)
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={duesSettlementModal.amount}
                                onChange={(e) =>
                                  setDuesSettlementModal((prev) =>
                                    prev ? { ...prev, amount: e.target.value } : null
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono tabular-nums font-bold text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-1">
                                भुगतान माध्यम (Payment Mode)
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {(["Cash", "UPI", "Bank"] as const).map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() =>
                                      setDuesSettlementModal((prev) =>
                                        prev ? { ...prev, mode: m } : null
                                      )
                                    }
                                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                      duesSettlementModal.mode === m
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-slate-800 text-slate-300 border-slate-700"
                                    }`}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => setDuesSettlementModal(null)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 cursor-pointer"
                            >
                              रद्द करें
                            </button>
                            <button
                              type="button"
                              disabled={duesSettlementModal.saving}
                              onClick={handleSettleDue}
                              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50"
                            >
                              {duesSettlementModal.saving ? "सहेजा जा रहा है..." : "✓ भुगतान दर्ज करें"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ── URGENT ABSENTEE ALERT BANNER ──────────────────────────────── */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/60 border border-rose-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <h3 className="font-black text-white text-base flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-rose-400" />
                      <span>छात्र अनुपस्थिति व कॉल एक्शन (Absentee Desk)</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl">
                    Accountant व Admin सीधे अभिभावकों से बात कर सकते हैं। कारण (बीमारी, शादी, गाँव जाना) और संभावित वापसी की तारीख दर्ज करें। तय अवधि तक सिस्टम उन्हें परेशान नहीं करेगा।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("absentee")}
                  className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition active:scale-95 shrink-0"
                >
                  <UserX className="w-4 h-4" />
                  <span>अनुपस्थिति डेस्क खोलें &rarr;</span>
                </button>
              </div>

              {/* ── 6 QUICK ACTION CARDS ─────────────────────────────────────── */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  त्वरित कार्य (1-Click Quick Actions)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Action 1: Fee Collection */}
                  {permissions.canCollectFee && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("fee_collection")}
                      className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-left transition flex items-start gap-3.5 cursor-pointer group shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white group-hover:text-amber-400 transition">
                          3" POS फीस संकलन
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          छात्र खोजें, बकाया देखें और 3-इंच थर्मल रसीद प्रिंट करें।
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Action 2: Absentee Desk */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("absentee")}
                    className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 text-left transition flex items-start gap-3.5 cursor-pointer group shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white group-hover:text-rose-400 transition">
                        Absentee Desk (अनुपस्थिति)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Day 1 Notice, Day 2 Call व छुट्टी-वापसी ट्रैकर।
                      </p>
                    </div>
                  </button>

                  {/* Action 3: Online & Direct Admission */}
                  {permissions.canAdmitStudents && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("admissions")}
                      className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/40 text-left transition flex items-start gap-3.5 cursor-pointer group shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white group-hover:text-blue-400 transition">
                          Online & Direct Admission
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          नए छात्र का फॉर्म भरें व प्रवेश रसीद जारी करें।
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Action 4: Daily Cashbook */}
                  {permissions.canViewDayBook && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("daybook")}
                      className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 text-left transition flex items-start gap-3.5 cursor-pointer group shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white group-hover:text-emerald-400 transition">
                          दैनिक रोकड़ बही (Cashbook)
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          शाम का नकद गल्ला, UPI संकलन व दिन का हिसाब।
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Action 5: Expense Voucher */}
                  {permissions.canRecordExpenses && (
                    <button
                      type="button"
                      onClick={() => setShowExpenseModal(true)}
                      className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-left transition flex items-start gap-3.5 cursor-pointer group shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white group-hover:text-purple-400 transition">
                          नया खर्च वाउचर दर्ज करें
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          स्टेशनरी, डीजल, बिजली व रिपेयरिंग वाउचर बनाएं।
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Action 6: Dues Defaulters */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("dues_defaulters")}
                    className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 text-left transition flex items-start gap-3.5 cursor-pointer group shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white group-hover:text-rose-400 transition">
                        बकाया फीस सूची (Defaulters)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        कक्षा अनुसार बकाया देखें व WhatsApp तकादा भेजें।
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ABSENTEE DESK (अनुपस्थिति प्रबंधन) */}
          {activeTab === "absentee" && (
            <div className="max-w-6xl mx-auto space-y-4">
              <AbsenteeActionPage
                schoolId={schoolId}
                schoolName={school?.name}
                classes={classes}
                currentRole="ACCOUNTANT"
                currentUserId={activeAccountant?.id || accountantId}
                currentUserName={activeAccountant?.name || "Accountant"}
                onBack={() => setActiveTab("home")}
              />
            </div>
          )}

          {/* TAB 1: CASH COUNTER & OVERVIEW */}
          {activeTab === "counter" && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Welcome & Fast Search */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <span>आज का लेखा-जोखा • {todayStr}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    Accountant काउंटर (Accounts Desk)
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    त्वरित फीस संकलन, 3-इंच थर्मल रसीद, प्रवेश सत्यापन व दैनिक रोकड़ बही (Cashbook).
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  {permissions.canCollectFee && (
                    <button
                      onClick={() => setActiveTab("fee_collection")}
                      className="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>फीस काउंटर खोलें (POS)</span>
                    </button>
                  )}
                  {permissions.canRecordExpenses && (
                    <button
                      onClick={() => setShowExpenseModal(true)}
                      className="px-4 py-3 rounded-2xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>खर्च वाउचर</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 STAT CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Today's Total Collections */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>आज कुल संकलन (Fee + Store)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-400 tabular-nums">
                    ₹ {(Number(financialSummary.todayTotalFee) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800 grid grid-cols-3 gap-1 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">Online QR</span>
                      <span className="font-black text-cyan-400 tabular-nums">₹{(Number(financialSummary.todayQrFee) || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="border-l border-slate-800 pl-1">
                      <span className="text-slate-400 block">NSTA Online</span>
                      <span className="font-black text-indigo-400 tabular-nums">₹{(Number(financialSummary.todayNstaOnlineFee) || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="border-l border-slate-800 pl-1">
                      <span className="text-slate-400 block">Cash</span>
                      <span className="font-black text-white tabular-nums">₹{(Number(financialSummary.todayCashFee) || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Today's Expenses */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>आज का कुल खर्च</span>
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-rose-400 tabular-nums">
                    ₹ {(Number(financialSummary.todayExpenseTotal) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {expenses.filter(e => e.date === todayStr).length} वाउचर दर्ज
                  </div>
                </div>

                {/* 3. Net Cash in Hand */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 shadow-md bg-gradient-to-br from-amber-500/10 to-transparent">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>नकद हाथ में (Cash in Hand)</span>
                    <Wallet className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-white tabular-nums">
                    ₹ {(Number(financialSummary.netCashInHand) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-300">
                    शाम को Admin को जमा करने हेतु
                  </div>
                </div>

                {/* 4. Total Dues */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>मासिक बकाया (Pending Dues)</span>
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-400 tabular-nums">
                    ₹ {(Number(financialSummary.monthPendingDues) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {defaultersList.length} छात्र बकाया सूची में
                  </div>
                </div>
              </div>

              {/* QUICK STUDENT SEARCH & ACTIONS */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-400" />
                    <span>त्वरित छात्र खोज व बकाया जांच (Quick Student Lookup)</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    नाम, रोल नं, या प्रवेश क्रमांक से खोजें
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={quickSearchQuery}
                    onChange={e => setQuickSearchQuery(e.target.value)}
                    placeholder="छात्र का नाम / Admission No / Roll No दर्ज करें..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {quickSearchQuery.trim().length > 1 && (
                  <div className="mt-3 divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {students
                      .filter(s => {
                        const q = quickSearchQuery.toLowerCase();
                        return (
                          (s.name || "").toLowerCase().includes(q) ||
                          (s.admissionNo || "").toLowerCase().includes(q) ||
                          (s.rollNo || "").toLowerCase().includes(q) ||
                          (s.fatherName || "").toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 10)
                      .map(s => {
                        const studentFees = fees.filter(f => f.studentId === s.id);
                        const hasUnpaid = studentFees.some(f => !f.paid);
                        return (
                          <div
                            key={s.id}
                            className="p-3 bg-slate-900/60 hover:bg-slate-800/80 transition flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{s.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  Roll: {s.rollNo || "N/A"}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  Adm: {s.admissionNo || "N/A"}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                पिता: {s.fatherName || "N/A"} • कक्षा: {s.className || "N/A"} • शुल्क: ₹{s.monthlyFee || 0}/माह
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {hasUnpaid ? (
                                <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                  बकाया है
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                  पूर्ण चुकता
                                </span>
                              )}
                              <button
                                onClick={() => setActiveTab("fee_collection")}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                              >
                                फीस जमा करें →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* RECENT EXPENSES PREVIEW */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span>हालिया दैनिक खर्च वाउचर (Recent Expense Vouchers)</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("expenses")}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold"
                  >
                    सभी वाउचर देखें →
                  </button>
                </div>

                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    कोई खर्च वाउचर दर्ज नहीं किया गया है।
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
                    {expenses.slice(0, 5).map(exp => (
                      <div
                        key={exp.id}
                        className="p-3.5 bg-slate-900/50 hover:bg-slate-800/60 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{exp.paidTo}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {exp.voucherNo}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300">
                              {exp.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            दिनांक: {exp.date} • माध्यम: {exp.paymentMode} • दर्जकर्ता: {exp.recordedBy}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-black text-rose-400 text-sm tabular-nums">
                            - ₹{(Number(exp?.amount) || 0).toLocaleString("en-IN")}
                          </span>
                          <button
                            onClick={() => handlePrintExpenseVoucher(exp)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Print Voucher"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FEE COLLECTION & POS SLIP */}
          {activeTab === "fee_collection" && (
            <div className="h-full">
              <FeeManager
                schoolId={schoolId}
                school={school || undefined}
                sessionId={activeSession.id}
                adminId={activeAccountant?.id || "accountant"}
                userRole="ACCOUNTANT"
                actorName={activeAccountant?.name || "Accountant"}
                onBack={() => setActiveTab("counter")}
              />
            </div>
          )}

          {/* FEE TOOL MENU TABS (MOVED FROM FEE TOOLS DROPDOWN) */}
          {(activeTab === "admission_receipt" ||
            activeTab === "qr_pay" ||
            activeTab === "fee_alerts" ||
            activeTab === "class_rates" ||
            activeTab === "receipt_header") && (
            <div className="h-full">
              <FeeManager
                key={activeTab}
                schoolId={schoolId}
                school={school || undefined}
                sessionId={activeSession.id}
                adminId={activeAccountant?.id || "accountant"}
                userRole="ACCOUNTANT"
                actorName={activeAccountant?.name || "Accountant"}
                initialTool={
                  activeTab === "admission_receipt"
                    ? "admission_receipt"
                    : activeTab === "qr_pay"
                      ? "qr_scanner"
                      : activeTab === "fee_alerts"
                        ? "fee_alert"
                        : activeTab === "class_rates"
                          ? "class_rates"
                          : "header"
                }
                onBack={() => setActiveTab("fee_collection")}
              />
            </div>
          )}

          {activeTab === "receipt_cancellation" && (
            <ReceiptCancellationModal
              isOpen={true}
              onClose={() => setActiveTab("fee_collection")}
              school={school || { id: schoolId, name: "School" } as any}
              activeSession={activeSession}
              onReceiptCancelled={() => setRefreshTrigger((t) => t + 1)}
            />
          )}

          {activeTab === "razorpay_setup" && (
            <RazorpaySettingsModal
              isOpen={true}
              onClose={() => setActiveTab("fee_collection")}
              schoolId={schoolId}
              schoolName={school?.name}
              adminUid={activeAccountant?.id || "accountant"}
              onSaved={() => toast.success("Razorpay Online Fee & Auto-Webhook settings saved!")}
            />
          )}

          {/* TAB 3: ONLINE & DIRECT ADMISSION */}
          {activeTab === "admissions" && (
            <div className="h-full">
              {school && (
                <OnlineAdmissionManager
                  school={school}
                  classes={classes}
                  sessions={sessions}
                  activeSession={activeSession}
                  isAdmin={true}
                  viewMode="admissions_only"
                  onBack={() => setActiveTab("counter")}
                />
              )}
            </div>
          )}

          {/* SIBLING PROFILES TAB */}
          {activeTab === "sibling_profiles" && school && (
            <div className="max-w-6xl mx-auto space-y-4">
              <SiblingProfileManager
                school={school}
                students={students}
                classes={classes}
                activeSession={activeSession}
                onUpdateStudent={(updated) => {
                  setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                }}
                onBack={() => setActiveTab("counter")}
              />
            </div>
          )}

          {/* TAB 4: FEE DUES & DEFAULTERS */}
          {activeTab === "dues_defaulters" && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                    <span>बकाया फीस सूची • DUES ACTION CENTER</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">
                    छात्र बकाया सूची ({defaultersList.length} Students)
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    जिन विद्यार्थियों का मासिक शुल्क लंबित है, उन्हें तुरंत व्हाट्सएप अथवा पुश अलर्ट भेजें।
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">कुल बकाया राशि</div>
                  <div className="text-2xl font-black text-rose-400 tabular-nums">
                    ₹ {(Number(financialSummary.monthPendingDues) || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {defaultersList.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-950 border border-slate-800 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <div className="text-base font-bold text-white">कोई बकाया शुल्क नहीं है!</div>
                  <div className="text-xs mt-1">सभी विद्यार्थियों ने अपना मासिक शुल्क समय पर जमा कर दिया है।</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-3xl overflow-hidden bg-slate-950 shadow-md">
                  {defaultersList.map(({ student, unpaidAmount, unpaidMonths }) => (
                    <div
                      key={student.id}
                      className="p-4 hover:bg-slate-900/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{student.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            कक्षा: {student.className || "N/A"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            Roll: {student.rollNo || "N/A"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          पिता: {student.fatherName || "N/A"} • मो.: {student.phone || "N/A"}
                        </div>
                        <div className="text-[10px] text-amber-400 mt-0.5 font-semibold">
                          लंबित माह: {unpaidMonths.join(", ") || "वर्तमान माह"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">बकाया</div>
                          <div className="font-black text-rose-400 text-sm tabular-nums">
                            ₹ {(Number(unpaidAmount) || 0).toLocaleString("en-IN")}
                          </div>
                        </div>

                        {student.phone && (
                          <a
                            href={`https://wa.me/${student.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `प्रिय अभिभावक, ${school?.name || "विद्यालय"} में ${student.name} (कक्षा ${student.className || ""}) का मासिक शुल्क ₹${unpaidAmount} बकाया है। कृपया शीघ्र अति शीघ्र विद्यालय कार्यालय अथवा ऑनलाइन जमा करें। धन्यवाद।`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          onClick={() => setActiveTab("fee_collection")}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                        >
                          जमा करें
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DAILY CASHBOOK & SETTLEMENT */}
          {activeTab === "daybook" && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <span>दैनिक रोकड़ बही • DAYBOOK SETTLEMENT</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">
                    दैनिक रोकड़ बही (Cash & UPI Settlement)
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    आज के सभी नकदी व डिजिटल लेनदेन का मिलान व लेखा-जोखा।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>प्रिंट डेबुक</span>
                  </button>
                </div>
              </div>

              {/* Daybook Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="text-xs font-bold text-emerald-400">1. कुल नकद आमदनी (Cash In)</div>
                  <div className="text-2xl font-black text-white mt-1 tabular-nums">
                    ₹ {(Number(financialSummary.todayCashFee) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-emerald-300/80 mt-1">
                    फीस व प्रवेश काउंटर से प्राप्त नकद
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/30">
                  <div className="text-xs font-bold text-rose-400">2. कुल नकद निकासी/खर्च (Cash Out)</div>
                  <div className="text-2xl font-black text-white mt-1 tabular-nums">
                    ₹ {(Number(financialSummary.todayExpenseCash) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-rose-300/80 mt-1">
                    दैनिक वाउचरों के माध्यम से दिया गया नकद
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40">
                  <div className="text-xs font-bold text-amber-400">3. शुद्ध नकद शेष (Closing Cash In Hand)</div>
                  <div className="text-2xl font-black text-amber-300 mt-1 tabular-nums">
                    ₹ {(Number(financialSummary.netCashInHand) || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-amber-300/80 mt-1">
                    तिजोरी / गल्ले में मौजूद नकद राशि
                  </div>
                </div>
              </div>

              {/* Digital Online Statement (Online QR Code vs NSTA Online) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-slate-950 border border-cyan-500/30 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      <span>Online QR Code (Counter UPI / Bank)</span>
                    </h3>
                    <span className="font-black text-cyan-400 text-lg tabular-nums">
                      ₹ {(Number(financialSummary.todayQrFee) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    स्कूल काउंटर QR कोड / PhonePe / GPay / बैंक ट्रांसफर से प्राप्त डिजिटल राशि।
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-500/30 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-400" />
                      <span>NSTA Online (Razorpay Gateway)</span>
                    </h3>
                    <span className="font-black text-indigo-400 text-lg tabular-nums">
                      ₹ {(Number(financialSummary.todayNstaOnlineFee) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    अभिभावक व छात्र पोर्टल से Razorpay द्वारा ऑनलाइन जमा की गई फीस व स्कूल स्टोर राशि।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SCHOOL EXPENSE VOUCHERS */}
          {activeTab === "expenses" && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                    <span>विद्यालय खर्च लेखा • EXPENSE MANAGER</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">
                    दैनिक खर्च वाउचर (Daily Expense Vouchers)
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    स्टेशनरी, वाहन ईंधन, मेंटेनेंस व अन्य विद्यालय खर्चों का आधिकारिक वाउचर व प्रिंट।
                  </p>
                </div>

                {permissions.canRecordExpenses && (
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ नया वाउचर बनाएं</span>
                  </button>
                )}
              </div>

              {expenses.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-950 border border-slate-800 text-slate-400">
                  <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <div className="text-base font-bold text-white">कोई खर्च दर्ज नहीं किया गया है</div>
                  <div className="text-xs mt-1">पहला वाउचर दर्ज करने के लिए ऊपर "+ नया वाउचर बनाएं" बटन दबाएं।</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-3xl overflow-hidden bg-slate-950 shadow-md">
                  {expenses.map(exp => (
                    <div
                      key={exp.id}
                      className="p-4 hover:bg-slate-900/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{exp.paidTo}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            #{exp.voucherNo}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                            {exp.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          दिनांक: {exp.date} • भुगतान माध्यम: {exp.paymentMode} • दर्जकर्ता: {exp.recordedBy}
                        </div>
                        {exp.description && (
                          <div className="text-[11px] text-slate-300 mt-0.5 italic">
                            "{exp.description}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">राशि</div>
                          <div className="font-black text-rose-400 text-base tabular-nums">
                            - ₹{(Number(exp?.amount) || 0).toLocaleString("en-IN")}
                          </div>
                        </div>

                        <button
                          onClick={() => handlePrintExpenseVoucher(exp)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>प्रिंट वाउचर</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: BUS & TRANSPORT DUES */}
          {activeTab === "bus_fees" && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <span>वाहन व परिवहन शुल्क • TRANSPORT SERVICE</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">
                    बस व वाहन शुल्क प्रबंधन (Bus & Transport Fees)
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    स्कूल बस अथवा वैन सेवा लेने वाले विद्यार्थियों का शुल्क संकलन व रूट विवरण।
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-3xl overflow-hidden bg-slate-950 shadow-md">
                {students
                  .filter(s => s.usesBus)
                  .map(s => (
                    <div
                      key={s.id}
                      className="p-4 hover:bg-slate-900/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{s.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                            बस सेवा एक्टिव
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            कक्षा: {s.className || "N/A"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          रूट: {s.busRoute || "General Route"} • स्टॉप: {s.busStop || "School Bus Stop"} • पिता: {s.fatherName || "N/A"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">मासिक बस शुल्क</div>
                          <div className="font-black text-amber-400 text-sm tabular-nums">
                            ₹ {s.busFee || 0} / माह
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab("fee_collection")}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                        >
                          फीस रसीद काटें →
                        </button>
                      </div>
                    </div>
                  ))}

                {students.filter(s => s.usesBus).length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    वर्तमान में किसी विद्यार्थी के लिए बस सेवा चिह्नित नहीं है।
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: NSTA MESSENGER SUITE */}
          {activeTab === "messenger" && school && (
            <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen w-screen overflow-hidden">
              <NstaMessengerSuite
                school={school}
                classes={classes}
                students={students}
                teachers={teachers}
                currentUserId={accountantId || "accountant_admin"}
                currentUserName={activeAccountant?.name || "School Accountant"}
                currentUserRole="ADMIN"
                onBack={() => setActiveTab("home")}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── RECORD EXPENSE MODAL ── */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">नया खर्च वाउचर दर्ज करें</h3>
                  <p className="text-[11px] text-slate-400">विद्यालय का दैनिक खर्च रिकॉर्ड करें</p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              {/* Category */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">खर्च की श्रेणी (Category)</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="Stationery">Stationery & Paper (कागज, रजिस्टर, पेन)</option>
                  <option value="Electricity / Utilities">Electricity / Utilities (बिजली, पानी बिल)</option>
                  <option value="Maintenance & Repair">Maintenance & Repair (मरम्मत, रंग-रोगन)</option>
                  <option value="Vehicle Fuel & Bus">Vehicle Fuel & Bus (बस/वैन डीजल, पेट्रोल)</option>
                  <option value="Events & Functions">Events & Functions (समारोह, खेलकूद)</option>
                  <option value="Staff Welfare / Refreshment">Staff Welfare / Refreshment (चाय, नाश्ता)</option>
                  <option value="Other">Other Miscellaneous (अन्य विविध खर्च)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">खर्च राशि (₹ Amount)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="उदा. 450"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value ? Number(e.target.value) : "" })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-amber-400 tabular-nums"
                />
              </div>

              {/* Paid To */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">प्राप्तकर्ता का नाम (Paid To)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. श्री राम स्टेशनर्स / चालक राजू"
                  value={newExpense.paidTo}
                  onChange={e => setNewExpense({ ...newExpense, paidTo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">भुगतान माध्यम (Payment Mode)</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Cash", "UPI", "Bank Transfer", "Cheque"] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setNewExpense({ ...newExpense, paymentMode: mode })}
                      className={`py-2 px-3 rounded-xl font-bold transition text-center cursor-pointer ${
                        newExpense.paymentMode === mode
                          ? "bg-amber-500 text-slate-950 font-black shadow"
                          : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">विवरण / टिप्पणी (Description)</label>
                <input
                  type="text"
                  placeholder="उदा. 5 रिम A4 पेपर व 10 रजिस्टर"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black shadow-lg transition cursor-pointer"
                >
                  वाउचर सुरक्षित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
