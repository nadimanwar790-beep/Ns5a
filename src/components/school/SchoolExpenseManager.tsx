// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  IndianRupee,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  Filter,
  Download,
  Trash2,
  Printer,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Building,
  Fuel,
  Coffee,
  Wrench,
  BookOpen
} from "lucide-react";
import { School, SchoolSession, MonthlyFee } from "../../school-types";
import { toast } from "sonner";
import { getSchoolFeeHistory, getLocalFees } from "../../school-firebase";
import { loadSchoolSubcollection, saveSchoolSubdoc, deleteSchoolSubdoc } from "../../utils/schoolCloudSync";
import { printHtmlInIframe } from "./AdmissionFormPrintModal";

export interface SchoolExpense {
  id: string;
  schoolId: string;
  voucherNo: string;
  date: string; // YYYY-MM-DD
  time: string;
  category: string;
  amount: number;
  paymentMode: "CASH" | "UPI" | "CHEQUE" | "BANK_TRANSFER";
  payeeName: string;
  referenceNo?: string;
  notes?: string;
  receiptImage?: string;
  recordedBy: string;
  createdAt: string;
}

const DEFAULT_CATEGORIES = [
  { id: "bus_diesel", name: "बस ईंधन (Bus Fuel/Diesel)", icon: Fuel, color: "text-amber-400 bg-amber-500/10" },
  { id: "salary_advance", name: "स्टाफ वेतन अग्रिम (Salary/Advance)", icon: Wallet, color: "text-emerald-400 bg-emerald-500/10" },
  { id: "stationery", name: "प्रिंटिंग व स्टेशनरी (Stationery)", icon: BookOpen, color: "text-blue-400 bg-blue-500/10" },
  { id: "electricity", name: "बिजली, पानी व इंटरनेट (Utilities)", icon: Building, color: "text-purple-400 bg-purple-500/10" },
  { id: "refreshment", name: "स्टाफ चाय-नाश्ता (Refreshments)", icon: Coffee, color: "text-rose-400 bg-rose-500/10" },
  { id: "maintenance", name: "भवन व फर्नीचर मरम्मत (Maintenance)", icon: Wrench, color: "text-cyan-400 bg-cyan-500/10" },
  { id: "events", name: "वार्षिक उत्सव व खेलकूद (Events/Sports)", icon: FileText, color: "text-indigo-400 bg-indigo-500/10" },
  { id: "other", name: "अन्य विविध खर्च (Miscellaneous)", icon: Receipt, color: "text-slate-400 bg-slate-500/10" }
];

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
  onRefreshData?: () => void;
}

export const SchoolExpenseManager: React.FC<Props> = ({ school, activeSession }) => {
  const schoolId = school?.id || "SCH-001";
  const isDemo = Boolean(schoolId === "demo_school" || schoolId.startsWith("demo_"));
  const storageKey = `school_expenses_${schoolId}`;

  const [expenses, setExpenses] = useState<SchoolExpense[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    if (!isDemo) return [];
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        id: "exp_1",
        schoolId,
        voucherNo: "VCH-1001",
        date: today,
        time: "10:30 AM",
        category: "बस ईंधन (Bus Fuel/Diesel)",
        amount: 3200,
        paymentMode: "CASH",
        payeeName: "HP Petrol Pump (Bus-01)",
        referenceNo: "INV-8912",
        notes: "Bus Route 2 full tank diesel",
        recordedBy: "Accountant",
        createdAt: new Date().toISOString()
      },
      {
        id: "exp_2",
        schoolId,
        voucherNo: "VCH-1002",
        date: today,
        time: "11:45 AM",
        category: "प्रिंटिंग व स्टेशनरी (Stationery)",
        amount: 1450,
        paymentMode: "UPI",
        payeeName: "Gupta Stationery Store",
        referenceNo: "UPI/392019482",
        notes: "Exam Answer Sheets and Whiteboard markers",
        recordedBy: "Admin",
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [feeRecords, setFeeRecords] = useState<MonthlyFee[]>(() => getLocalFees(schoolId));
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<SchoolExpense | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let active = true;
    loadSchoolSubcollection<SchoolExpense>(schoolId, "expenses", storageKey).then((items) => {
      if (active && items.length > 0) setExpenses(items);
    });
    getSchoolFeeHistory(schoolId, activeSession?.id)
      .then((fees) => {
        if (active && Array.isArray(fees)) setFeeRecords(fees);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [schoolId, storageKey, activeSession?.id]);

  // Form State
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [formAmount, setFormAmount] = useState("");
  const [formPaymentMode, setFormPaymentMode] = useState<"CASH" | "UPI" | "CHEQUE" | "BANK_TRANSFER">("CASH");
  const [formPayee, setFormPayee] = useState("");
  const [formRefNo, setFormRefNo] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Save changes to localStorage + Cloud
  const saveExpenses = (updated: SchoolExpense[]) => {
    setExpenses(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Expense save failed:", e);
    }
  };

  // Get Today's REAL Fee Inflow from Fee Manager records (never fake ₹18,500)
  const todayFeeInflow = useMemo(() => {
    const targetDate = filterDate || new Date().toISOString().slice(0, 10);
    let cash = 0;
    let online = 0;
    for (const f of feeRecords) {
      if (f.cancelled || (f.status !== "paid" && f.status !== "partial")) continue;
      const feeDate = f.paidDate || (f.updatedAt ? String(f.updatedAt).slice(0, 10) : "");
      if (feeDate === targetDate) {
        const amt = Number(f.paidAmount ?? f.amount ?? 0);
        if (f.paymentMode === "CASH" || !f.paymentMode) cash += amt;
        else online += amt;
      }
    }
    return { cash, online, total: cash + online };
  }, [feeRecords, filterDate]);

  // Expenses calculations for selected date
  const dateExpensesSummary = useMemo(() => {
    const targetDate = filterDate || new Date().toISOString().slice(0, 10);
    const dayItems = expenses.filter((e) => e.date === targetDate);
    let cashSpent = 0;
    let bankSpent = 0;
    for (const item of dayItems) {
      if (item.paymentMode === "CASH") cashSpent += item.amount;
      else bankSpent += item.amount;
    }
    const totalSpent = cashSpent + bankSpent;
    const netCashInHand = todayFeeInflow.cash - cashSpent;
    return { cashSpent, bankSpent, totalSpent, netCashInHand };
  }, [expenses, filterDate, todayFeeInflow]);

  // Overall filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory !== "ALL" && e.category !== filterCategory) return false;
      if (filterDate && e.date !== filterDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.voucherNo.toLowerCase().includes(q) ||
          e.payeeName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [expenses, filterCategory, filterDate, searchQuery]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      toast.error("कृपया मान्य राशि दर्ज करें!");
      return;
    }
    if (!formPayee.trim()) {
      toast.error("कृपया प्राप्तकर्ता का नाम दर्ज करें!");
      return;
    }

    const nextVoucherNum = 1000 + expenses.length + 1;
    const newExp: SchoolExpense = {
      id: `exp_${Date.now()}`,
      schoolId,
      voucherNo: `VCH-${nextVoucherNum}`,
      date: formDate,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      category: formCategory,
      amount: amt,
      paymentMode: formPaymentMode,
      payeeName: formPayee.trim(),
      referenceNo: formRefNo.trim() || undefined,
      notes: formNotes.trim() || undefined,
      recordedBy: "Admin",
      createdAt: new Date().toISOString()
    };

    saveExpenses([newExp, ...expenses]);
    saveSchoolSubdoc(schoolId, "expenses", newExp);
    toast.success(`वाउचर ${newExp.voucherNo} सुरक्षित हो गया!`);
    setShowAddModal(false);
    // Reset Form
    setFormAmount("");
    setFormPayee("");
    setFormRefNo("");
    setFormNotes("");
  };

  const handleDeleteExpense = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      toast.info("हटाने की पुष्टि करने के लिए पुनः डिलीट दबाएं");
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 4000);
      return;
    }
    saveExpenses(expenses.filter((e) => e.id !== id));
    deleteSchoolSubdoc(schoolId, "expenses", id);
    setConfirmDeleteId(null);
    toast.success("वाउचर हटा दिया गया");
  };

  const printDebitVoucher = (v: SchoolExpense) => {
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Voucher ${v.voucherNo}</title>
      <style>
        @page { size: A5 landscape; margin: 8mm; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 12px; background: #fff; }
        .box { border: 2px solid #0f172a; border-radius: 10px; padding: 16px; max-width: 520px; margin: 0 auto; }
        .hdr { text-align: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; }
        .row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 6px 0; font-size: 12px; }
        .tot { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; padding-top: 10px; border-top: 2px solid #0f172a; margin-top: 8px; }
        .sigs { display: flex; justify-content: space-between; margin-top: 36px; font-size: 11px; color: #475569; }
      </style></head><body>
      <div class="box">
        <div class="hdr">
          <div style="font-size:17px;font-weight:900;text-transform:uppercase;">${school?.name || "SCHOOL"}</div>
          <div style="font-size:10px;color:#64748b;">DEBIT VOUCHER / PAYMENT SLIP • ${v.voucherNo}</div>
        </div>
        <div class="row"><span>Date &amp; Time:</span><strong>${v.date} • ${v.time}</strong></div>
        <div class="row"><span>Paid To:</span><strong>${v.payeeName}</strong></div>
        <div class="row"><span>Category:</span><strong>${v.category}</strong></div>
        <div class="row"><span>Payment Mode:</span><strong>${v.paymentMode}</strong></div>
        ${v.referenceNo ? `<div class="row"><span>Ref / Bill No:</span><strong>${v.referenceNo}</strong></div>` : ""}
        ${v.notes ? `<div style="margin-top:8px;font-size:11px;background:#f8fafc;padding:6px;border-radius:6px;">Notes: ${v.notes}</div>` : ""}
        <div class="tot"><span>Total Paid:</span><span>₹${v.amount.toLocaleString("en-IN")}</span></div>
        <div class="sigs"><div style="border-top:1px solid #94a3b8;padding-top:4px;">Receiver Signature</div><div style="border-top:1px solid #94a3b8;padding-top:4px;">Authorized Signatory</div></div>
      </div></body></html>`;
    printHtmlInIframe(html, `Voucher_${v.voucherNo}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              स्कूल खर्च व पेटी कैश मैनेजर (Daily Cashbook)
            </h2>
            <p className="text-xs text-slate-400">
              दैनिक खर्च, वाउचर प्रिंट, व दिन के अंत में नेट क्लोजिंग बैलेंस (Inflow vs Outflow)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + नया खर्च दर्ज करें
          </button>
        </div>
      </div>

      {/* Daily Cashbook & Balance HUD (3-Box Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Fee Inflow */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              आज की कुल फीस आवक (Inflow)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20">फीस काउंटर</span>
          </div>
          <div className="text-2xl font-black text-white">
            ₹{todayFeeInflow.total.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
            <span>नकद (Cash): ₹{todayFeeInflow.cash.toLocaleString("en-IN")}</span>
            <span>ऑनलाइन/UPI: ₹{todayFeeInflow.online.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Total Expenses Outflow */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-rose-400 font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              आज का कुल खर्च (Outflow)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20">पेटी कैश</span>
          </div>
          <div className="text-2xl font-black text-rose-400">
            ₹{dateExpensesSummary.totalSpent.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
            <span>नकद खर्च: ₹{dateExpensesSummary.cashSpent.toLocaleString("en-IN")}</span>
            <span>बैंक/UPI खर्च: ₹{dateExpensesSummary.bankSpent.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Net Cash in Hand */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-400" />
              नेट नकद शेष (Cash In Hand)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
              क्लोजिंग बैलेंस
            </span>
          </div>
          <div className={`text-2xl font-black ${dateExpensesSummary.netCashInHand >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ₹{dateExpensesSummary.netCashInHand.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-indigo-200/70 mt-2">
            शाम को काउंटर बंद करते समय तिजोरी/दराज में इतना कैश होना चाहिए।
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="वाउचर नं, प्राप्तकर्ता या विवरण खोजें..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">सभी खर्च श्रेणियां (All Categories)</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="text-[11px] px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              सभी तारीखें देखें
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            खर्च वाउचर सूची ({filteredExpenses.length} वाउचर्स)
          </h3>
          <span className="text-xs text-slate-400">
            कुल योग: <strong className="text-amber-400">₹{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("en-IN")}</strong>
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
            <p className="text-sm">इस तारीख या फिल्टर में कोई खर्च दर्ज नहीं है।</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs"
            >
              + नया खर्च वाउचर जोड़ें
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">वाउचर नं / समय</th>
                  <th className="px-4 py-3">श्रेणी (Category)</th>
                  <th className="px-4 py-3">प्राप्तकर्ता (Payee)</th>
                  <th className="px-4 py-3">माध्यम (Mode)</th>
                  <th className="px-4 py-3 text-right">राशि (Amount)</th>
                  <th className="px-4 py-3 text-center">एक्शन</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-850/60 transition">
                    <td className="px-4 py-3">
                      <div className="font-black text-white">{exp.voucherNo}</div>
                      <div className="text-[10px] text-slate-500">{exp.date} • {exp.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700/60">
                        {exp.category}
                      </span>
                      {exp.notes && (
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{exp.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{exp.payeeName}</div>
                      {exp.referenceNo && (
                        <div className="text-[10px] text-slate-500">Ref: {exp.referenceNo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exp.paymentMode === "CASH"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      }`}>
                        {exp.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-white text-sm">
                      ₹{exp.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedVoucherForPrint(exp)}
                          title="Debit Voucher प्रिंट करें"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="हटाएं"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                नया स्कूल खर्च वाउचर दर्ज करें
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">तारीख (Date)</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">भुगतान माध्यम (Mode)</label>
                  <select
                    value={formPaymentMode}
                    onChange={(e: any) => setFormPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="CASH">नकद (Cash Counter)</option>
                    <option value="UPI">ऑनलाइन (UPI / QR)</option>
                    <option value="BANK_TRANSFER">बैंक ट्रांसफर (NEFT/RTGS)</option>
                    <option value="CHEQUE">चेक (Cheque)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">खर्च श्रेणी (Category)</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">राशि ₹ (Amount) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-black text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">बिल / रसीद नं (Optional)</label>
                  <input
                    type="text"
                    value={formRefNo}
                    onChange={(e) => setFormRefNo(e.target.value)}
                    placeholder="e.g. INV-2024"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">प्राप्तकर्ता / विक्रेता का नाम *</label>
                <input
                  type="text"
                  required
                  value={formPayee}
                  onChange={(e) => setFormPayee(e.target.value)}
                  placeholder="e.g. HP Petrol Pump, Manoj Kumar (Driver), Book Depot"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">टिप्पणी / विवरण (Remarks)</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="खर्च के संबंध में अतिरिक्त जानकारी..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  वाउचर सुरक्षित करें (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT DEBIT VOUCHER MODAL */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-4">
            <div className="text-center border-b pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-indigo-950">{school?.name || "SCHOOL NAME"}</h2>
              <p className="text-[10px] text-slate-500">DEBIT VOUCHER / PAYMENT SLIP</p>
              <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-slate-100 border text-[11px] font-bold text-slate-700">
                {selectedVoucherForPrint.voucherNo}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-bold">{selectedVoucherForPrint.date} • {selectedVoucherForPrint.time}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Paid To (Payee):</span>
                <span className="font-bold text-slate-900">{selectedVoucherForPrint.payeeName}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Expense Category:</span>
                <span className="font-bold">{selectedVoucherForPrint.category}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold">{selectedVoucherForPrint.paymentMode}</span>
              </div>
              {selectedVoucherForPrint.referenceNo && (
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500">Ref / Bill No:</span>
                  <span className="font-mono font-bold">{selectedVoucherForPrint.referenceNo}</span>
                </div>
              )}
              {selectedVoucherForPrint.notes && (
                <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                  <strong>Notes:</strong> {selectedVoucherForPrint.notes}
                </div>
              )}
              <div className="flex justify-between items-center pt-2 text-base font-black text-indigo-900 border-t-2">
                <span>Total Amount Paid:</span>
                <span className="text-xl">₹{selectedVoucherForPrint.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-8 text-center text-[11px] text-slate-500 border-t">
              <div>
                <div className="border-t border-slate-300 pt-1">Receiver Signature</div>
              </div>
              <div>
                <div className="border-t border-slate-300 pt-1">Authorized Signatory</div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 no-print">
              <button
                onClick={() => printDebitVoucher(selectedVoucherForPrint)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                प्रिंट निकालें (Print)
              </button>
              <button
                onClick={() => setSelectedVoucherForPrint(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
