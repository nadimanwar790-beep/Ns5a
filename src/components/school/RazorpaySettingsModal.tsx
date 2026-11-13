import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName?: string;
  adminUid?: string;
  onSaved?: () => void;
}

export const RazorpaySettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  adminUid,
  onSaved,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [hasKeySecret, setHasKeySecret] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    let active = true;
    setLoading(true);
    setStatusBanner(null);

    fetch(`/api/razorpay/config?schoolId=${encodeURIComponent(schoolId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data?.ok) {
          setEnabled(Boolean(data.enabled || !data.keyId));
          setKeyId(data.keyId || "");
          setHasKeySecret(Boolean(data.hasKeySecret));
          setHasWebhookSecret(Boolean(data.hasWebhookSecret));
          setWebhookUrl(
            data.webhookUrl ||
              `${window.location.origin}/api/razorpay/webhook?schoolId=${encodeURIComponent(schoolId)}`
          );
        }
      })
      .catch(() => {
        if (!active) return;
        setWebhookUrl(
          `${window.location.origin}/api/razorpay/webhook?schoolId=${encodeURIComponent(schoolId)}`
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, schoolId]);

  if (!isOpen) return null;

  const isLiveKey = keyId.trim().startsWith("rzp_live_");
  const isTestKey = keyId.trim().startsWith("rzp_test_");

  const handleCopyWebhook = async () => {
    const urlToCopy =
      webhookUrl ||
      `${window.location.origin}/api/razorpay/webhook?schoolId=${encodeURIComponent(schoolId)}`;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedWebhook(true);
      toast.success("Webhook URL copy ho gaya!");
      setTimeout(() => setCopiedWebhook(false), 2500);
    } catch {
      toast.error("Copy fail — manually select karke copy karein");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);
    const cleanKeyId = keyId.trim();

    if (enabled && !cleanKeyId) {
      setStatusBanner({
        type: "error",
        text: "Razorpay Key ID daalein (rzp_test_... ya rzp_live_...)",
      });
      return;
    }
    if (enabled && !keySecret.trim() && !hasKeySecret) {
      setStatusBanner({
        type: "error",
        text: "Pehli baar save karne ke liye Key Secret daalna zaroori hai",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/razorpay/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          enabled,
          keyId: cleanKeyId,
          keySecret: keySecret.trim() || undefined,
          webhookSecret: webhookSecret.trim() || undefined,
          updatedBy: adminUid || "school_admin",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setStatusBanner({
          type: "error",
          text: data?.error || "Config save nahi ho paaya",
        });
        return;
      }

      setHasKeySecret(Boolean(data.hasKeySecret));
      setHasWebhookSecret(Boolean(data.hasWebhookSecret));
      setKeySecret("");
      setWebhookSecret("");
      setStatusBanner({
        type: "success",
        text: enabled
          ? `✅ Razorpay (${data.mode === "live" ? "LIVE" : "TEST"} Mode) active ho gaya! Ab Student Portal me Pay Online button dikhega.`
          : "⏸️ Razorpay online payment pause kar diya gaya hai.",
      });
      toast.success("Razorpay settings saved!");
      onSaved?.();
    } catch (err: any) {
      setStatusBanner({
        type: "error",
        text: err?.message || "Network error while saving",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestKeys = async () => {
    setTesting(true);
    setStatusBanner(null);
    try {
      const res = await fetch("/api/razorpay/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setStatusBanner({
          type: "error",
          text: data?.error || "Razorpay keys verify nahi ho paayi",
        });
        return;
      }
      setStatusBanner({
        type: "success",
        text: `🎉 Keys Verified! (${String(data.mode || "test").toUpperCase()} Mode) — ${
          data.hasWebhookSecret
            ? "Webhook Secret bhi set hai."
            : "Tip: Auto-sync ke liye Webhook Secret bhi daal dein."
        }`,
      });
    } catch (err: any) {
      setStatusBanner({
        type: "error",
        text: err?.message || "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">
                Razorpay Online Fee &amp; Auto-Webhook
              </h2>
              <p className="text-[11px] text-indigo-100 truncate">
                {schoolName || "School"} • Paisa seedha school ke Razorpay bank account me
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs font-semibold">Settings load ho rahi hain...</span>
            </div>
          ) : (
            <>
              {/* Security & Isolation Guarantee Banner */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-emerald-900 dark:text-emerald-200 space-y-0.5">
                  <p className="font-bold">100% Safe Student Lock + Zero Cross-Fee Error</p>
                  <p className="text-[11px] opacity-90">
                    Har payment par unique <code className="font-mono font-bold">order_id</code> banta hai jisme student ID aur month locked hota hai. Pay hote hi sirf usi bachche ki fee PAID hoti hai aur Official Receipt NSTA Messenger me chali jaati hai.
                  </p>
                </div>
              </div>

              {statusBanner && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                    statusBanner.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200"
                  }`}
                >
                  {statusBanner.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{statusBanner.text}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3.5">
                {/* Enable Toggle + Mode Badge */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <span>Student Portal Online Pay Button</span>
                      {isLiveKey ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          LIVE MODE
                        </span>
                      ) : isTestKey ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          TEST MODE (₹0)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      On karne par parents Student Portal se direct UPI / Card fee pay kar sakenge
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnabled((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                      enabled
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {enabled ? "ON ✓" : "OFF"}
                  </button>
                </div>

                {/* Key ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    1. Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    placeholder="rzp_test_xxxxxxxxxxxx ya rzp_live_xxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                {/* Key Secret */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>2. Razorpay Key Secret</span>
                    </label>
                    {hasKeySecret && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ Server par saved hai (badalna ho tabhi likhein)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showKeySecret ? "text" : "password"}
                      value={keySecret}
                      onChange={(e) => setKeySecret(e.target.value)}
                      placeholder={
                        hasKeySecret
                          ? "•••••••••••••••• (already saved)"
                          : "Razorpay Key Secret yahan paste karein"
                      }
                      className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeySecret((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Webhook URL (Readonly Copy) */}
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>School Auto-Webhook URL (Razorpay Dashboard me lagayein)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? "Copied" : "Copy URL"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-[11px] font-mono text-slate-700 dark:text-slate-200 select-all"
                  />
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300">
                    Active Events me <strong>payment.captured</strong> aur <strong>order.paid</strong> tick karein.
                  </p>
                </div>

                {/* Webhook Secret */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>3. Webhook Secret (Signature Verification)</span>
                    </label>
                    {hasWebhookSecret && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ Saved
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showWebhookSecret ? "text" : "password"}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder={
                        hasWebhookSecret
                          ? "•••••••••••••••• (already saved)"
                          : "Webhook banate waqt jo Secret dala tha wo yahan likhein"
                      }
                      className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestKeys}
                    disabled={testing || saving || (!keyId && !hasKeySecret)}
                    className="sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                    <span>Test Connection</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Save Razorpay Settings</span>
                  </button>
                </div>
              </form>

              {/* Step-by-step Setup Guide */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowGuide((v) => !v)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    <span>School Razorpay Kaise Set Kare? (5-Minute Hindi Guide)</span>
                  </span>
                  {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showGuide && (
                  <ol className="p-3.5 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside bg-white dark:bg-slate-900">
                    <li>
                      <strong>razorpay.com</strong> par School ke naam se free account banayein (₹0 setup fee). Bina KYC ke turant <strong>Test Mode</strong> chalu ho jata hai.
                    </li>
                    <li>
                      Razorpay Dashboard → <strong>Account &amp; Settings → API Keys</strong> me jaakar <strong>Key ID</strong> aur <strong>Key Secret</strong> generate karke upar paste karein.
                    </li>
                    <li>
                      Razorpay Dashboard → <strong>Webhooks → Add New Webhook</strong> me upar wala <strong>Webhook URL</strong> daalein, koi Secret password banayein aur <strong>payment.captured</strong> tick karein.
                    </li>
                    <li>
                      Wahi Secret password yahan <strong>Webhook Secret</strong> me save karein. Ab parent Student Portal me pay karega to automatically Receipt banegi!
                    </li>
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
