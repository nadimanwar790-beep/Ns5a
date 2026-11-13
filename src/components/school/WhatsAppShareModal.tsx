import React, { useState } from "react";
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  Phone,
  User,
  GraduationCap,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  parentPhone: string;
  className?: string;
  rollNo?: string;
  admissionNo?: string;
  fatherName?: string;
  receiptNo?: string;
  title?: string;
  subtitle?: string;
  formattedMessage: string;
  isDueDemand?: boolean;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  generatePdfBlob?: () => Promise<{ blob: Blob; filename: string }>;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  studentName,
  parentPhone: initialParentPhone,
  className,
  rollNo,
  admissionNo,
  fatherName,
  receiptNo,
  title,
  subtitle,
  formattedMessage,
  isDueDemand = false,
  totalAmount,
  paidAmount,
  balanceDue,
  generatePdfBlob,
}) => {
  const [parentPhone, setParentPhone] = useState(initialParentPhone || "");
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSharingFile, setIsSharingFile] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Keep phone in sync when initialParentPhone updates
  React.useEffect(() => {
    setParentPhone(initialParentPhone || "");
  }, [initialParentPhone]);

  if (!isOpen) return null;

  // Clean 10-digit number
  const cleanPhone = parentPhone.replace(/\D/g, "").slice(-10);
  const hasValidPhone = cleanPhone.length === 10;
  const targetWaNumber = hasValidPhone ? `91${cleanPhone}` : "";

  // 1. Copy Parent's Phone Number
  const handleCopyPhone = async () => {
    if (!cleanPhone) return;
    try {
      await navigator.clipboard.writeText(cleanPhone);
      setCopiedPhone(true);
      setShareFeedback("✅ अभिभावक का मोबाइल नंबर क्लिपबोर्ड पर कॉपी हो गया!");
      setTimeout(() => setCopiedPhone(false), 3000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = cleanPhone;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 3000);
    }
  };

  // 2. Copy Full WhatsApp Message
  const handleCopyMessage = async () => {
    if (!formattedMessage) return;
    try {
      await navigator.clipboard.writeText(formattedMessage);
      setCopiedMessage(true);
      setShareFeedback("✅ रसीद का पूरा टेक्स्ट कॉपी हो गया! अब आप सीधे व्हाट्सएप में पेस्ट कर सकते हैं।");
      setTimeout(() => setCopiedMessage(false), 3500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = formattedMessage;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 3500);
    }
  };

  // 3. Direct Document PDF Share (Using Native Web Share API if supported)
  const handleDirectDocumentShare = async () => {
    if (!generatePdfBlob) return;
    setIsSharingFile(true);
    setShareFeedback(null);
    try {
      const { blob, filename } = await generatePdfBlob();
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: filename,
          text: `📄 ${studentName} - ${isDueDemand ? "फीस बकाया मांग पर्ची" : "फीस रसीद"}`,
          files: [file],
        });
        setShareFeedback("✅ WhatsApp शेयर शीट खुल गई! अभिभावक का चैट चुनकर सेंड करें।");
      } else {
        // Fallback: download file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setShareFeedback("📄 PDF रसीद डाउनलोड हो गई! अब व्हाट्सएप खोलकर अटैच कर भेजें।");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Document share error:", err);
        setShareFeedback("❌ दस्तावेज़ शेयर करने में समस्या आई। नीचे दिए 'PDF डाउनलोड' बटन से फाइल सेव करें।");
      }
    } finally {
      setIsSharingFile(false);
    }
  };

  // 4. Download PDF Receipt
  const handleDownloadPdf = async () => {
    if (!generatePdfBlob) return;
    setIsDownloadingPdf(true);
    setShareFeedback(null);
    try {
      const { blob, filename } = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setShareFeedback("✅ PDF रसीद डाउनलोड हो गई!");
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // 5. Open Direct WhatsApp Chat with Pre-filled Message
  const handleOpenDirectChat = () => {
    const waUrl = targetWaNumber
      ? `https://wa.me/${targetWaNumber}?text=${encodeURIComponent(formattedMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(formattedMessage)}`;
    safeOpenExternalUrl(waUrl);
  };

  // 6. Just Open WhatsApp App (for manual number search & paste)
  const handleOpenWhatsAppSearch = () => {
    // Open WhatsApp Web or app
    safeOpenExternalUrl("https://web.whatsapp.com");
  };

  const resolvedTitle =
    title || (isDueDemand ? "Fee Due Demand Slip (बकाया पर्ची)" : "Official Fee Payment Receipt (रसीद)");

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
              <MessageCircle className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  WhatsApp Document & Share
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  FREE / मुफ़्त
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                {resolvedTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Student & Receipt Snapshot */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">छात्र / Student:</span>
                <strong className="text-sm font-black text-slate-900 dark:text-white">
                  {studentName}
                </strong>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1 flex-wrap">
                {className && (
                  <span>
                    📚 कक्षा: <strong>{className}</strong>
                  </span>
                )}
                {rollNo && (
                  <span>
                    Roll: <strong>{rollNo}</strong>
                  </span>
                )}
                {fatherName && (
                  <span>
                    👨 पिता: <strong>{fatherName}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Bill snapshot */}
            <div className="text-right">
              {isDueDemand ? (
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                    कुल देय बकाया
                  </span>
                  <strong className="text-base font-black text-amber-600 dark:text-amber-400">
                    ₹{Number(balanceDue || totalAmount || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    जमा रसीद राशि
                  </span>
                  <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Number(paidAmount || totalAmount || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Feedback banner if copied/shared */}
          {shareFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{shareFeedback}</span>
            </div>
          )}

          {/* SECTION 1: PARENT PHONE & 1-TAP COPY (CRUCIAL REQUEST) */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600" />
                अभिभावक का WhatsApp नंबर (Parent Mobile)
              </label>
              {hasValidPhone && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200">
                  10 Digits ✓
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10 अंकों का WhatsApp नंबर"
                  className="w-full pl-11 pr-3 py-2.5 text-base sm:text-lg font-mono font-black rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden tracking-wider shadow-inner"
                />
              </div>

              {/* 1-Tap Copy Number Button */}
              <button
                type="button"
                onClick={handleCopyPhone}
                disabled={!cleanPhone}
                className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0 ${
                  copiedPhone
                    ? "bg-emerald-700 text-white shadow-emerald-500/50"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                } disabled:opacity-50`}
                title="अभिभावक का नंबर कॉपी करें"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>कॉपी हो गया ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>नंबर कॉपी करें</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              💡 <strong>नंबर कॉपी करें</strong> दबाकर सीधे व्हाट्सएप सर्च बार में पेस्ट कर सकते हैं।
            </p>
          </div>

          {/* SECTION 2: SEND DOCUMENT (PDF FILE) DIRECTLY */}
          {generatePdfBlob && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                    दस्तावेज़ (PDF Slip / Receipt) सीधे भेजें
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  POS / DPS PDF
                </span>
              </div>

              <p className="text-xs text-indigo-900 dark:text-indigo-300">
                फोन में व्हाट्सएप पर <strong>सीधा PDF डॉक्यूमेंट</strong> अटैच करके भेजने के लिए नीचे बटन दबाएं:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Direct Share Document */}
                <button
                  type="button"
                  onClick={handleDirectDocumentShare}
                  disabled={isSharingFile}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSharingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>PDF तैयार हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>📱 WhatsApp पर PDF शेयर करें</span>
                    </>
                  )}
                </button>

                {/* Download PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>डाउनलोड हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>⬇️ PDF डाउनलोड करें</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: DIRECT WHATSAPP CHAT & TEXT COPY */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                व्हाट्सएप चैट व रसीद मैसेज
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Open Direct Chat */}
              <button
                type="button"
                onClick={handleOpenDirectChat}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                title="सीधे WhatsApp चैट खोलें"
              >
                <ExternalLink className="w-4 h-4" />
                <span>🟢 WhatsApp चैट में खोलें</span>
              </button>

              {/* Copy Full Message */}
              <button
                type="button"
                onClick={handleCopyMessage}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border shadow-xs transition cursor-pointer ${
                  copiedMessage
                    ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-800 dark:text-emerald-200"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>टेक्स्ट कॉपी हो गया ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>📋 पूरा रसीद टेक्स्ट कॉपी करें</span>
                  </>
                )}
              </button>
            </div>

            {/* Open WhatsApp App for manual search */}
            <button
              type="button"
              onClick={handleOpenWhatsAppSearch}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>🔍 WhatsApp ऐप खोलें (नंबर सर्च करने के लिए)</span>
            </button>
          </div>

          {/* Step by Step Easy Guide in Hindi */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
            <div className="font-black flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>मुफ़्त (₹0) भेजने की सरल प्रक्रिया:</span>
            </div>
            <ol className="list-decimal pl-5 space-y-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
              <li>
                <strong>नंबर कॉपी करें:</strong> ऊपर 📋 बटन से अभिभावक का 10 अंकों का नंबर कॉपी करें।
              </li>
              <li>
                <strong>व्हाट्सएप खोलें:</strong> सर्च बार में नंबर पेस्ट करें और चैट पर जाएं।
              </li>
              <li>
                <strong>PDF या रसीद सेंड करें:</strong> सीधे अटैच कर या मैसेज पेस्ट करके भेज दें!
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
