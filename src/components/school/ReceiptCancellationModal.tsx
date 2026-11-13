// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  RotateCcw,
  Search,
  CheckCircle,
  Printer,
  FileText,
  XCircle,
  IndianRupee,
  ShieldAlert,
  User,
  Calendar,
  Clock
} from "lucide-react";
import { School, SchoolSession } from "../../school-types";
import { loadSchoolSubcollection, syncSchoolSubcollection } from "../../utils/schoolCloudSync";
import { printElementInIframe } from "./AdmissionFormPrintModal";

export interface RefundVoucher {
  id: string;
  voucherNo: string;
  originalReceiptNo: string;
  studentId: string;
  studentName: string;
  className: string;
  rollNo?: string;
  refundAmount: number;
  refundMode: "CASH" | "UPI" | "ADJUST_FUTURE_DUES";
  reason: string;
  remarks: string;
  authorizedBy: string;
  date: string;
  time: string;
}

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
  isOpen: boolean;
  onClose: () => void;
  onReceiptCancelled?: () => void;
}

export const ReceiptCancellationModal: React.FC<Props> = ({
  school,
  activeSession,
  isOpen,
  onClose,
  onReceiptCancelled
}) => {
  const schoolId = school?.id || "SCH-001";
  const feeStorageKey = `school_fee_records_${schoolId}`;
  const refundStorageKey = `school_refund_vouchers_${schoolId}`;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [cancellationReason, setCancellationReason] = useState("गलत छात्र चयन (Wrong Student Selected)");
  const [refundMode, setRefundMode] = useState<"CASH" | "UPI" | "ADJUST_FUTURE_DUES">("CASH");
  const [remarks, setRemarks] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("Admin (Principal)");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmCancelReceiptId, setConfirmCancelReceiptId] = useState<string | null>(null);
  const [successVoucher, setSuccessVoucher] = useState<RefundVoucher | null>(null);
  const voucherPrintRef = useRef<HTMLDivElement>(null);

  // Load paid fee records from localStorage
  const allFeeRecords = useMemo(() => {
    try {
      const raw = localStorage.getItem(feeStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((r) => r.status === "PAID" || (r.paidAmount && r.paidAmount > 0));
    } catch {
      return [];
    }
  }, [feeStorageKey]);

  // Load refund audit logs
  const [auditLogs, setAuditLogs] = useState<RefundVoucher[]>(() => {
    try {
      const raw = localStorage.getItem(refundStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  useEffect(() => {
    if (!isOpen || !school?.id) return;
    let active = true;
    loadSchoolSubcollection<RefundVoucher>(school.id, "refund_vouchers").then((cloudLogs) => {
      if (active && cloudLogs.length > 0) {
        setAuditLogs(cloudLogs);
        try {
          localStorage.setItem(refundStorageKey, JSON.stringify(cloudLogs));
        } catch {}
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [isOpen, school?.id, refundStorageKey]);

  const matchingReceipts = useMemo(() => {
    if (!searchQuery.trim()) return allFeeRecords.slice(0, 10);
    const q = searchQuery.toLowerCase().trim();
    return allFeeRecords.filter((r) => {
      const rNo = (r.receiptNo || r.receiptNumber || r.id || "").toLowerCase();
      const sName = (r.studentName || "").toLowerCase();
      const roll = (r.rollNo || "").toString().toLowerCase();
      return rNo.includes(q) || sName.includes(q) || roll.includes(q);
    });
  }, [allFeeRecords, searchQuery]);

  if (!isOpen) return null;

  const handleExecuteCancellation = () => {
    if (!selectedReceipt) return;
    if (!remarks.trim()) {
      toast.error("कृपया कैंसिलेशन व रिफंड का विस्तृत कारण (Remarks) दर्ज करें!");
      return;
    }

    if (confirmCancelReceiptId !== selectedReceipt.id) {
      setConfirmCancelReceiptId(selectedReceipt.id);
      return;
    }

    try {
      setIsProcessing(true);

      const targetAmt = Number(selectedReceipt.paidAmount || selectedReceipt.amount || 0);
      const voucherNum = `RFD-${Date.now().toString().slice(-6)}`;
      const newVoucher: RefundVoucher = {
        id: `rfd_${Date.now()}`,
        voucherNo: voucherNum,
        originalReceiptNo: selectedReceipt.receiptNo || selectedReceipt.id,
        studentId: selectedReceipt.studentId || "",
        studentName: selectedReceipt.studentName || "Student",
        className: selectedReceipt.className || "",
        rollNo: selectedReceipt.rollNo,
        refundAmount: targetAmt,
        refundMode,
        reason: cancellationReason,
        remarks: remarks.trim(),
        authorizedBy,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      };

      // 1. Update the fee record to CANCELLED in fee_records
      const rawFees = localStorage.getItem(feeStorageKey);
      if (rawFees) {
        const fees = JSON.parse(rawFees);
        const updatedFees = fees.map((f: any) => {
          if (f.id === selectedReceipt.id || f.receiptNo === selectedReceipt.receiptNo) {
            return {
              ...f,
              status: "CANCELLED",
              cancelledAt: new Date().toISOString(),
              cancellationReason,
              refundVoucherNo: voucherNum,
              paidAmount: 0 // reverse paid amount
            };
          }
          return f;
        });
        localStorage.setItem(feeStorageKey, JSON.stringify(updatedFees));
      }

      // 2. Save into Refund Vouchers Audit Log
      const updatedLogs = [newVoucher, ...auditLogs];
      setAuditLogs(updatedLogs);
      localStorage.setItem(refundStorageKey, JSON.stringify(updatedLogs));
      if (school?.id) {
        syncSchoolSubcollection(school.id, "refund_vouchers", updatedLogs);
      }

      setConfirmCancelReceiptId(null);
      setSuccessVoucher(newVoucher);
      setIsProcessing(false);
      toast.success(`रसीद #${newVoucher.originalReceiptNo} निरस्त कर रिफंड वाउचर जारी किया गया!`);
      onReceiptCancelled?.();
    } catch (err: any) {
      toast.error("रसीद निरस्तीकरण में त्रुटि: " + (err?.message || err));
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                फीस रसीद निरस्तीकरण व रिफंड वाउचर (Receipt Cancellation & Refund)
              </h3>
              <p className="text-xs text-rose-300/80">
                मानवीय भूल या गलत भुगतान को सुरक्षित रूप से रिवर्स करें व आधिकारिक रिफंड वाउचर बनाएं
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {successVoucher ? (
            /* SUCCESS PRINT SLIP */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-300">
                    रसीद #{successVoucher.originalReceiptNo} सफलतापूर्वक निरस्त कर दी गई है!
                  </div>
                  <div className="text-[11px] text-emerald-200/80">
                    रिफंड वाउचर #{successVoucher.voucherNo} जारी हुआ। छात्र के खाते में बकाया पुनः बहाल कर दिया गया है।
                  </div>
                </div>
              </div>

              {/* Printable Official Refund Voucher Slip */}
              <div ref={voucherPrintRef} id="print-refund-voucher" className="bg-white text-slate-900 rounded-2xl p-6 border shadow space-y-4">
                <div className="text-center border-b pb-3">
                  <div className="text-xs font-black uppercase text-rose-700 tracking-wider">OFFICIAL REFUND VOUCHER / भुगतान वापसी रसीद</div>
                  <h3 className="text-lg font-black text-slate-900">{school?.name || "SCHOOL NAME"}</h3>
                  <p className="text-[10px] text-slate-500">{activeSession?.name || "2026-2027"} • Voucher No: <strong>{successVoucher.voucherNo}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">छात्र का नाम:</span>
                    <div className="font-bold text-slate-900">{successVoucher.studentName}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">कक्षा व रोल नं:</span>
                    <div className="font-bold">{successVoucher.className} {successVoucher.rollNo ? `(Roll: ${successVoucher.rollNo})` : ""}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">मूल रसीद संख्या:</span>
                    <div className="font-bold text-rose-600 line-through">#{successVoucher.originalReceiptNo} (CANCELLED)</div>
                  </div>
                  <div>
                    <span className="text-slate-500">वापसी माध्यम:</span>
                    <div className="font-bold">{successVoucher.refundMode}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">निरस्तीकरण का कारण:</span>
                    <div className="font-semibold text-slate-800">{successVoucher.reason} ({successVoucher.remarks})</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                  <span className="text-xs font-bold uppercase">कुल वापस की गई राशि (Refund Amount):</span>
                  <span className="text-xl font-black">₹{successVoucher.refundAmount.toLocaleString("en-IN")}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 text-center text-[10px] text-slate-500 border-t">
                  <div>
                    <div className="border-t border-slate-300 pt-1">अभिभावक / प्राप्तकर्ता के हस्ताक्षर</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-300 pt-1">प्रिंसिपल / अधिकृत हस्ताक्षर ({successVoucher.authorizedBy})</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 no-print print:hidden">
                <button
                  onClick={() => voucherPrintRef.current && printElementInIframe(voucherPrintRef.current, `Refund_Voucher_${successVoucher.voucherNo}`)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  रिफंड रसीद प्रिंट करें (Print)
                </button>
                <button
                  onClick={() => {
                    setSuccessVoucher(null);
                    setSelectedReceipt(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  अन्य रसीद चुनें
                </button>
              </div>
            </div>
          ) : (
            /* STEP 1: SELECT RECEIPT & CONFIRM CANCEL */
            <div className="space-y-4">
              {!selectedReceipt ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="रसीद संख्या (#INV / #REC), छात्र का नाम या रोल नं लिखें..."
                      className="w-full pl-9 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    हाल ही में जमा की गई फीस रसीदें (Paid Receipts):
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {matchingReceipts.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">कोई रसीद नहीं मिली।</div>
                    ) : (
                      matchingReceipts.map((rec) => (
                        <div
                          key={rec.id}
                          onClick={() => setSelectedReceipt(rec)}
                          className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 flex items-center justify-between cursor-pointer transition"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-rose-300">
                                #{rec.receiptNo || rec.id}
                              </span>
                              <span className="text-xs font-bold text-white">{rec.studentName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {rec.className || "Class"}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              भुगतान तारीख: {rec.paidDate || rec.updatedAt?.slice(0, 10) || "Today"} • {rec.paymentMode || "CASH"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-emerald-400">
                              ₹{(rec.paidAmount || rec.amount || 0).toLocaleString("en-IN")}
                            </div>
                            <span className="text-[10px] text-rose-400 font-semibold hover:underline">
                              चुनें व कैंसिल करें →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                /* CANCELLATION FORM FOR SELECTED RECEIPT */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300">चयनित रसीद विवरण:</span>
                      <button
                        onClick={() => setSelectedReceipt(null)}
                        className="text-[11px] text-slate-400 hover:text-white underline"
                      >
                        बदलें (Change)
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>रसीद नं: <strong className="text-white">#{selectedReceipt.receiptNo || selectedReceipt.id}</strong></div>
                      <div>छात्र: <strong className="text-white">{selectedReceipt.studentName}</strong> ({selectedReceipt.className})</div>
                      <div>जमा राशि: <strong className="text-emerald-400">₹{(selectedReceipt.paidAmount || selectedReceipt.amount).toLocaleString("en-IN")}</strong></div>
                      <div>माध्यम: <strong className="text-white">{selectedReceipt.paymentMode || "CASH"}</strong></div>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        रसीद निरस्तीकरण का कारण चुनें (Reason) *
                      </label>
                      <select
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="गलत छात्र चयन (Wrong Student Selected)">गलत छात्र चयन (Wrong Student Selected)</option>
                        <option value="डुप्लीकेट / डबल भुगतान (Duplicate Payment)">डुप्लीकेट / डबल भुगतान (Duplicate Payment)</option>
                        <option value="एडमिशन निरस्तीकरण (Admission Cancelled)">एडमिशन निरस्तीकरण (Admission Cancelled)</option>
                        <option value="छूट समायोजन (Fee Concession Adjustment)">छूट समायोजन (Fee Concession Adjustment)</option>
                        <option value="अन्य प्रशासनिक भूल (Other Administrative Error)">अन्य प्रशासनिक भूल (Other Administrative Error)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">रिफंड माध्यम (Refund Mode)</label>
                        <select
                          value={refundMode}
                          onChange={(e: any) => setRefundMode(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                        >
                          <option value="CASH">नकद वापसी (Cash Counter)</option>
                          <option value="UPI">ऑनलाइन यूपीआई रिवर्सल (UPI)</option>
                          <option value="ADJUST_FUTURE_DUES">अगले महीने की फीस में एडजस्ट करें</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">अधिकृत कर्ता (Authorized By)</label>
                        <input
                          type="text"
                          value={authorizedBy}
                          onChange={(e) => setAuthorizedBy(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">विस्तृत विवरण / टिप्पणी (Remarks) *</label>
                      <textarea
                        rows={2}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="कैंसिलेशन का कारण स्पष्ट लिखें..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedReceipt(null); setConfirmCancelReceiptId(null); }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                    >
                      पीछे जाएं
                    </button>
                    {confirmCancelReceiptId === selectedReceipt.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleExecuteCancellation}
                          disabled={isProcessing}
                          className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Confirm Cancel (₹{(selectedReceipt.paidAmount || selectedReceipt.amount || 0).toLocaleString("en-IN")})
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCancelReceiptId(null)}
                          className="px-3 py-2.5 rounded-xl bg-slate-700 text-slate-200 font-bold text-xs"
                        >
                          रद्द
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleExecuteCancellation}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        रसीद कैंसिल व रिफंड जारी करें
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
