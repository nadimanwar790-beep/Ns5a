// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  X, Printer, Download, MessageCircle, Edit3, Plus, Trash2,
  CheckCircle2, Building2, Sparkles, Shield, RotateCcw, Copy
} from "lucide-react";
import type { School, MonthlyFee, SchoolStudent } from "../../school-types";
import {
  generateDpsReceiptHtml,
  generate4in1A4PageHtml,
  printDpsReceipts4in1,
  printDpsReceiptDirect,
  DPS_RECEIPT_CSS,
  numberToIndianWords,
  type FeeReceiptItem,
  type DpsReceiptData,
  type PayModeInfo
} from "./feeReceiptUtils";
import { downloadFeeDocument } from "./feeDocument";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  fee: MonthlyFee;
  student?: SchoolStudent | null;
  className?: string;
  sessionName?: string;
}

export const OfficialFeeReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  fee,
  student,
  className = "Class 6-B",
  sessionName = "2026-2027",
}) => {
  if (!isOpen) return null;

  // Format month name for installment
  const initialInstallment = useMemo(() => {
    if (!fee.month) return "CURRENT INSTALLMENT";
    const d = new Date(`${fee.month}-01T00:00:00`);
    const monthIndex = d.getMonth();
    // Check quarter like DPS: APR-JUN, JULY-SEP, OCT-DEC, JAN-MAR
    if (monthIndex >= 3 && monthIndex <= 5) return "APR-JUN";
    if (monthIndex >= 6 && monthIndex <= 8) return "JULY-SEP";
    if (monthIndex >= 9 && monthIndex <= 11) return "OCT-DEC";
    return "JAN-MAR";
  }, [fee.month]);

  // Form states
  const [receiptNo, setReceiptNo] = useState(
    () => fee.receiptNo || String(Math.floor(10000 + Math.random() * 90000))
  );
  const [admissionNo, setAdmissionNo] = useState(
    () => student?.admissionNo || fee.rollNo || String(Math.floor(100000 + Math.random() * 900000))
  );
  const [studentName, setStudentName] = useState(
    () => fee.studentName || student?.name || "SAMARTH SHARMA"
  );
  const [studentPhotoUrl, setStudentPhotoUrl] = useState(
    () => student?.photoUrl || (student as any)?.photo || ""
  );
  const [installment, setInstallment] = useState(initialInstallment);
  const [receiptDate, setReceiptDate] = useState(() => {
    if (fee.paidDate) {
      const d = new Date(fee.paidDate);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });
  const [session, setSession] = useState(sessionName);
  const [resolvedClass, setResolvedClass] = useState(className);
  const [counterNo, setCounterNo] = useState("DPS-RECEIPT");
  const [note, setNote] = useState(() => fee.note || String(Math.floor(100 + Math.random() * 900)));
  const [showDigitalSign, setShowDigitalSign] = useState(Boolean(school?.principalSignatureUrl));

  const [layoutMode, setLayoutMode] = useState<"4in1" | "full">("4in1");

  // Pay Mode Information
  const [payMode, setPayMode] = useState<string>("Cheque");
  const [bank, setBank] = useState<string>("HDFC BANK");
  const [chequeNumber, setChequeNumber] = useState<string>("689870,06,07");
  const [payDate, setPayDate] = useState<string>(receiptDate);

  // Fee items breakdown (Default mirrors realistic breakdown from DPS screenshot or dynamically adapts to fee)
  const [items, setItems] = useState<FeeReceiptItem[]>(() => {
    const baseFee = Number(fee.monthlyAmount ?? fee.amount ?? 0) || 5000;
    const arrears = Number(fee.arrearsAmount || 0);

    if (baseFee >= 50000) {
      // Large fee breakdown like in screenshot
      return [
        { id: "1", slNo: 1, description: "Admission Fee", due: 65000, con: 0, paid: 65000 },
        { id: "2", slNo: 2, description: "Tuition Fee", due: 19140, con: 0, paid: 19140 },
        { id: "3", slNo: 3, description: "Caution Money", due: 60000, con: 0, paid: 60000 },
        { id: "4", slNo: 4, description: "Annual Charges", due: 23320, con: 0, paid: 23320 },
        { id: "5", slNo: 5, description: "Bus Fee", due: 10360, con: 0, paid: 10360 },
      ];
    }

    // Standard school fee breakdown
    const list: FeeReceiptItem[] = [
      { id: "1", slNo: 1, description: "Tuition Fee", due: baseFee, con: 0, paid: baseFee },
    ];
    if (arrears > 0) {
      list.push({
        id: "2",
        slNo: 2,
        description: "Back Due / Previous Arrears",
        due: arrears,
        con: 0,
        paid: arrears,
      });
    }
    return list;
  });

  // Calculate totals
  const totalPaid = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.paid) || 0), 0);
  }, [items]);

  const totalDue = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.due) || 0), 0);
  }, [items]);

  const totalCon = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.con) || 0), 0);
  }, [items]);

  const grandTotal = totalPaid > 0 ? totalPaid : totalDue;
  const wordsAmount = numberToIndianWords(grandTotal);

  // Quick preset helper
  const loadDpsScreenshotSample = () => {
    setReceiptNo("43358");
    setAdmissionNo("140516");
    setStudentName("SAMARTH SHARMA BHARDWAJ");
    setInstallment("JULY-SEP");
    setReceiptDate("14/07/2016");
    setSession("2016-2017");
    setResolvedClass("6 - B");
    setCounterNo("DPS-RECEIPT");
    setPayMode("Cheque");
    setBank("HDFC BANK");
    setChequeNumber("689870,06,07");
    setPayDate("15/07/2016");
    setNote("356");
    setItems([
      { id: "1", slNo: 1, description: "Admission Fee", due: 65000, con: 0, paid: 65000 },
      { id: "2", slNo: 2, description: "Tuition Fee", due: 19140, con: 0, paid: 19140 },
      { id: "3", slNo: 3, description: "Caution Money", due: 60000, con: 0, paid: 60000 },
      { id: "4", slNo: 4, description: "Annual Charges", due: 23320, con: 0, paid: 23320 },
      { id: "5", slNo: 5, description: "Bus Fee", due: 10360, con: 0, paid: 10360 },
    ]);
  };

  // Add Item
  const handleAddItem = () => {
    const nextSl = items.length + 1;
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        slNo: nextSl,
        description: "Annual / Activity Charges",
        due: 1500,
        con: 0,
        paid: 1500,
      },
    ]);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev =>
      prev
        .filter(it => it.id !== id)
        .map((it, idx) => ({ ...it, slNo: idx + 1 }))
    );
  };

  // Build current receipt data object
  const receiptData: DpsReceiptData = {
    schoolName: school?.name || "Delhi Public School",
    schoolAddress: school?.address || "Site No.1, Sector-45, Urban Estate, Gurgaon, Haryana",
    schoolLogoUrl: school?.logoUrl,
    schoolPhone: school?.mobile || school?.phone,
    schoolEmail: school?.email,
    schoolAffiliation: school?.affiliation,
    receiptNo,
    admissionNo,
    studentName,
    studentPhotoUrl,
    installment,
    receiptDate,
    session,
    className: resolvedClass,
    counterNo,
    items,
    payModeInfo: {
      payMode,
      date: payDate,
      bank,
      number: chequeNumber,
    },
    note,
    showDigitalSignature: showDigitalSign,
    principalSignatureUrl: school?.principalSignatureUrl,
    principalName: school?.principalName || "Principal",
    principalTitle: "Principal / Authorized Signatory",
  };

  // Direct Print action (defaults to 4-in-1 A4 sheet)
  const handlePrint = (mode: "4in1" | "full" = layoutMode) => {
    if (mode === "4in1") {
      printDpsReceipts4in1([receiptData], {
        customTitle: `Fee Receipt (4-in-1 A4) - ${studentName} - ${receiptNo}`
      });
      return;
    }
    printDpsReceiptDirect(receiptData, "full");
  };

  // WhatsApp share
  const handleWhatsApp = () => {
    const rawPhone = student?.phone || "";
    const digits = rawPhone.replace(/\D/g, "");
    const targetPhone = digits.length === 10 ? `91${digits}` : digits;

    const message = [
      `*🏛️ ${receiptData.schoolName}*`,
      `*OFFICIAL FEE RECEIPT*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📄 Receipt No: ${receiptNo}`,
      `👤 Student: ${studentName}`,
      `🎓 Class: ${resolvedClass} | Adm No: ${admissionNo}`,
      `📅 Installment: ${installment} (${session})`,
      `💰 Total Received: ₹${grandTotal.toLocaleString("en-IN")}`,
      `📝 In Words: ${wordsAmount}`,
      `💳 Pay Mode: ${payMode} ${bank ? `(${bank})` : ""}`,
      `📅 Date: ${receiptDate}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Note: Computer generated receipt. Thank you!`,
    ].join("\n");

    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadFeeDocument({
        fee: {
          ...fee,
          receiptNo,
          amount: grandTotal,
          monthlyAmount: grandTotal,
          studentName,
          note,
        },
        student,
        schoolName: receiptData.schoolName,
        className: resolvedClass,
        schoolDetails: {
          schoolName: receiptData.schoolName,
          address: receiptData.schoolAddress,
          logoUrl: receiptData.schoolLogoUrl,
          phone: receiptData.schoolPhone,
          email: receiptData.schoolEmail,
          affiliation: receiptData.schoolAffiliation,
          principalName: receiptData.principalName,
          principalSignatureUrl: receiptData.principalSignatureUrl,
        },
      });
    } catch (err) {
      console.error("PDF download error:", err);
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Active view on mobile: "edit" or "preview"
  const [mobileTab, setMobileTab] = useState<"preview" | "edit">("preview");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Navbar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 font-bold text-lg shadow-inner">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white leading-tight">
                  Official School Fee Receipt
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  DPS Layout
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {studentName} • Receipt #{receiptNo} • ₹{grandTotal.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-white/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">{isDownloadingPdf ? "Saving PDF..." : "Download PDF"}</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={() => handlePrint("4in1")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/40 active:scale-95 transition cursor-pointer"
              title="Ek A4 sheet me 4 receipts print karein"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Print 4-in-1 A4</span>
              <span className="sm:hidden">4-in-1</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex sm:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-1">
          <button
            onClick={() => setMobileTab("preview")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              mobileTab === "preview"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            👁️ Receipt Preview
          </button>
          <button
            onClick={() => setMobileTab("edit")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              mobileTab === "edit"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            ✏️ Customize Fields
          </button>
        </div>

        {/* Modal Body: Split 2 columns on desktop */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Customizer & Settings */}
          <div
            className={`w-full md:w-[420px] lg:w-[460px] border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 shrink-0 ${
              mobileTab === "edit" ? "block" : "hidden md:block"
            }`}
          >
            {/* Quick Actions Card */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Preset Format:
              </span>
              <button
                type="button"
                onClick={loadDpsScreenshotSample}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-400/30 rounded-lg transition flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Load DPS Sample</span>
              </button>
            </div>

            {/* Basic Metadata */}
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-xs">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Student &amp; Receipt Info</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Receipt No</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={e => setReceiptNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Admission No</label>
                  <input
                    type="text"
                    value={admissionNo}
                    onChange={e => setAdmissionNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Student Full Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Student Picture (Photo) */}
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <span>📸 Student Photo (Picture)</span>
                  </label>
                  {studentPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setStudentPhotoUrl("")}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-14 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                    {studentPhotoUrl ? (
                      <img src={studentPhotoUrl} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold">No Pic</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={studentPhotoUrl}
                      onChange={e => setStudentPhotoUrl(e.target.value)}
                      placeholder="Paste Photo URL"
                      className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <label className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100 transition">
                      <span>📁 Upload from device</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (typeof ev.target?.result === "string") {
                              setStudentPhotoUrl(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Installment / Period</label>
                  <input
                    type="text"
                    value={installment}
                    onChange={e => setInstallment(e.target.value)}
                    placeholder="e.g. JULY-SEP"
                    className="w-full px-2.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Receipt Date</label>
                  <input
                    type="text"
                    value={receiptDate}
                    onChange={e => setReceiptDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Class</label>
                  <input
                    type="text"
                    value={resolvedClass}
                    onChange={e => setResolvedClass(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Session</label>
                  <input
                    type="text"
                    value={session}
                    onChange={e => setSession(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Counter No</label>
                  <input
                    type="text"
                    value={counterNo}
                    onChange={e => setCounterNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Fee Items Table Customizer */}
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Itemized Fee Breakdown
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2 py-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Head</span>
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400">#{item.slNo}</span>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => {
                          const val = e.target.value;
                          setItems(prev =>
                            prev.map(it => (it.id === item.id ? { ...it, description: val } : it))
                          );
                        }}
                        placeholder="Description (e.g. Tuition Fee)"
                        className="flex-1 px-2 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block">Due (₹)</label>
                        <input
                          type="number"
                          value={item.due}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setItems(prev =>
                              prev.map(it => (it.id === item.id ? { ...it, due: val } : it))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block">Con (₹)</label>
                        <input
                          type="number"
                          value={item.con}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setItems(prev =>
                              prev.map(it => (it.id === item.id ? { ...it, con: val } : it))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block">Paid (₹)</label>
                        <input
                          type="number"
                          value={item.paid}
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setItems(prev =>
                              prev.map(it => (it.id === item.id ? { ...it, paid: val } : it))
                            );
                          }}
                          className="w-full px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total calculations */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500">Calculated Grand Total:</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Pay Mode Information */}
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-xs">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Pay Mode Information
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Pay Mode</label>
                  <select
                    value={payMode}
                    onChange={e => setPayMode(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Online / UPI">Online / UPI</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Demand Draft">Demand Draft</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Payment Date</label>
                  <input
                    type="text"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Bank / Channel</label>
                  <input
                    type="text"
                    value={bank}
                    onChange={e => setBank(e.target.value)}
                    placeholder="e.g. HDFC BANK / CASH"
                    className="w-full px-2 py-1.5 text-xs font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Cheque / Ref No</label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={e => setChequeNumber(e.target.value)}
                    placeholder="e.g. 689870,06,07"
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Receipt Note / Memo</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. 356"
                  className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showDigitalSign}
                    onChange={e => setShowDigitalSign(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <span>Attach Principal Digital Signature</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Real-Time Document Preview */}
          <div
            className={`flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 dark:bg-slate-950/60 flex flex-col items-center ${
              mobileTab === "preview" ? "flex" : "hidden md:flex"
            }`}
          >
            {/* Format Toggle Bar */}
            <div className="w-full max-w-[760px] mb-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLayoutMode("4in1")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    layoutMode === "4in1"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>📑 4 Receipts per A4 (4-in-1)</span>
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                    Recommended
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("full")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    layoutMode === "full"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>📄 1 Receipt per A4 (Full)</span>
                </button>
              </div>

              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-2">
                {layoutMode === "4in1" ? (
                  <>
                    <span className="text-amber-500">✂️</span>
                    <span>1 A4 Sheet = 4 Copies (Student, Office, Accounts, Parent)</span>
                  </>
                ) : (
                  <span>Standard 1-Page Official Receipt</span>
                )}
              </div>
            </div>

            <div className="w-full max-w-[760px] flex justify-center">
              {/* Inject CSS styling for DPS layout */}
              <style>{DPS_RECEIPT_CSS}</style>

              {/* RENDER LIVE EXACT DPS CARD (4-in-1 or Full) */}
              {layoutMode === "4in1" ? (
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{
                    __html: generate4in1A4PageHtml([
                      { data: receiptData, copyTitle: "STUDENT COPY" },
                      { data: receiptData, copyTitle: "SCHOOL / OFFICE COPY" },
                      { data: receiptData, copyTitle: "ACCOUNTS COPY" },
                      { data: receiptData, copyTitle: "PARENT / GUARDIAN COPY" },
                    ]),
                  }}
                />
              ) : (
                <div
                  className="w-full max-w-[650px]"
                  dangerouslySetInnerHTML={{
                    __html: generateDpsReceiptHtml(receiptData, { layout: "full" }),
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Share receipt directly on parent WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isDownloadingPdf ? "Saving PDF..." : "Download PDF"}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint("4in1")}
              className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Print 4 receipts on one A4 paper"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print 4-in-1 A4 Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint("full")}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1 cursor-pointer"
              title="Print 1 full page receipt"
            >
              <span>Full A4</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
