// @ts-nocheck
import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";
import {
  X, Printer, Phone, Bus, Shield, User,
  Share2, Check, Copy, QrCode, Route
} from "lucide-react";
import type { School } from "../../school-types";
import { getSavedSchoolLogo, cleanLogoUrl, formatAcademicSession } from "./feeReceiptUtils";
import { printElementInIframe } from "./AdmissionFormPrintModal";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";
import { buildDriverIdCardQrUrl } from "../../utils/qrVerifyUrl";

export interface DriverIdCardData {
  busId: string;
  busNumber: string;
  route: string;
  driverName: string;
  driverPhone: string;
  stops?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: DriverIdCardData | null;
  school: School | null;
}

export const DriverIdCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  driver,
  school,
}) => {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !driver) return null;

  const schoolName = school?.name || "School Campus";
  const schoolCode = school?.code || "";
  const schoolLogo = getSavedSchoolLogo(school?.logoUrl, school?.id);
  const affiliation = school?.affiliation || school?.tagline || "School Transport Department";
  const sessionLabel = formatAcademicSession(school?.session || "2026-27");
  const principalName = school?.principalName || "Principal / Transport Incharge";
  const principalTitle = school?.principalTitle || "Authorized Signatory";
  const signatureUrl = school?.principalSignatureUrl;

  const driverName = driver.driverName || "Bus Driver";
  const busId = driver.busId || `bus_${Date.now()}`;
  const busNumber = driver.busNumber || "School Bus";
  const route = driver.route || "Main School Route";
  const phone = driver.driverPhone || "";
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const driverIdCode = `DRV-${(cleanPhone || busId).slice(-5).toUpperCase()}`;

  // Standardized Driver Chrome Verify + Login QR Payload
  const qrVerifyPayload = buildDriverIdCardQrUrl({
    schoolId: school?.id || "",
    busId,
    busNumber,
    route,
    driverName,
    driverPhone: phone,
    schoolCode,
    schoolName,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    printElementInIframe(printAreaRef.current, `${driverName} - Driver ID Card`);
  };

  const handleShareWhatsApp = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams();
    params.set("driverConsole", "1");
    if (school?.id) params.set("schoolId", school.id);
    if (schoolCode) params.set("schoolCode", schoolCode);
    if (schoolName) params.set("schoolName", schoolName);
    params.set("busId", busId);
    params.set("busNumber", busNumber);
    params.set("route", route);
    params.set("driverName", driverName);
    if (phone) params.set("driverPhone", phone);
    const directUrl = `${origin}/?${params.toString()}`;

    const text =
      `*🏫 ${schoolName.toUpperCase()}*\n` +
      `*🪪 OFFICIAL BUS DRIVER ID CARD*\n\n` +
      `👤 *Driver Name:* ${driverName}\n` +
      `🚌 *Assigned Bus:* ${busNumber}\n` +
      `🛣️ *Route:* ${route}\n` +
      `🆔 *Driver ID:* ${driverIdCode}\n` +
      `📱 *Mobile:* ${phone || "Not set"}\n` +
      `📅 *Session:* ${sessionLabel}\n\n` +
      `📲 *App Login (QR Scan):* App khol kar "Login with ID Card QR Code" se apna ID Card QR scan karein — seedha Driver GPS Dashboard khul jayega.\n` +
      `🔗 *Direct Link:* ${directUrl}`;

    const encoded = encodeURIComponent(text);
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    safeOpenExternalUrl(waUrl);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-amber-500/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight leading-tight">
                  Driver Identity Card (ड्राइवर पहचान पत्र)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                  QR Login Ready
                </span>
              </div>
              <p className="text-[11px] text-amber-100">
                Is ID Card ke QR code ko scan karke driver seedha apna GPS Dashboard khol sakta hai
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                orientation === "landscape"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Horizontal (85.6 × 54mm)
            </button>
            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                orientation === "portrait"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Vertical (54 × 85.6mm)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share via WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print ID Card</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-100/50 dark:bg-slate-950/40">
          {/* Card Presentation Container */}
          <div className="flex justify-center items-center py-2">
            <div ref={printAreaRef} className="print-card-wrapper">
              {orientation === "landscape" ? (
                /* ── LANDSCAPE CR80 DRIVER ID CARD ── */
                <div
                  className="w-[360px] min-h-[224px] max-h-[224px] bg-white rounded-2xl shadow-xl border-2 border-amber-500/50 flex flex-col relative overflow-hidden select-none print:w-[85.6mm] print:h-[54mm] print:shadow-none print:m-0"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {/* Top Header */}
                  <div className="bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 px-3 py-1.5 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {schoolLogo ? (
                        <img
                          src={cleanLogoUrl(schoolLogo)}
                          alt="Logo"
                          className="w-6 h-6 rounded-full bg-white object-contain p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center font-black text-[9px] text-slate-950 shrink-0">
                          {(schoolName || "SC").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 leading-tight">
                        <h4 className="font-black text-[11px] tracking-tight truncate max-w-[205px] text-white">
                          {schoolName}
                        </h4>
                        <p className="text-[7px] text-amber-200 truncate max-w-[205px]">
                          {affiliation}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-wider shadow-xs">
                        BUS DRIVER ID
                      </span>
                      <p className="text-[6.5px] text-amber-200 font-bold mt-0.5 text-right">{sessionLabel}</p>
                    </div>
                  </div>

                  {/* Body Columns: Photo | Details | QR Code */}
                  <div className="px-3 py-2 flex-1 flex items-center justify-between gap-2.5 bg-white">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="w-[64px] h-[80px] rounded-xl border-2 border-amber-300 overflow-hidden bg-amber-50 flex flex-col items-center justify-center shadow-xs">
                        <User className="w-8 h-8 text-amber-600" />
                        <span className="text-[7px] font-black uppercase text-amber-800 mt-0.5">DRIVER</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 text-[9px] leading-tight space-y-0.5">
                      <div className="border-b border-slate-100 pb-0.5">
                        <h3 className="font-black text-[12px] text-slate-900 truncate">
                          {driverName}
                        </h3>
                        <span className="inline-block text-[7.5px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider mt-0.5">
                          Authorized Bus Driver
                        </span>
                      </div>

                      <div className="pt-0.5 space-y-0.5 text-[8.5px] text-slate-700">
                        <div className="flex justify-between border-b border-slate-100 pb-0.5 gap-1">
                          <span className="text-slate-400 font-bold shrink-0">Bus No:</span>
                          <span className="font-black text-slate-900 truncate">{busNumber}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5 gap-1">
                          <span className="text-slate-400 font-bold shrink-0">Route:</span>
                          <span className="font-bold text-slate-800 truncate">{route}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5 gap-1">
                          <span className="text-slate-400 font-bold shrink-0">Mobile:</span>
                          <span className="font-mono font-bold text-slate-800">{phone || "—"}</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="text-slate-400 font-bold shrink-0">Driver ID:</span>
                          <span className="font-mono font-black text-amber-700">{driverIdCode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0 w-[80px]">
                      <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs flex items-center justify-center">
                        <QRCode value={qrVerifyPayload} size={66} level="L" />
                      </div>
                      <span className="text-[6.5px] font-black text-amber-700 uppercase tracking-tighter mt-0.5">
                        Scan to Login
                      </span>
                      <span className="text-[6px] text-slate-600 font-mono font-bold whitespace-nowrap">
                        {driverIdCode}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[6.5px] text-slate-600 shrink-0">
                    <div className="min-w-0 flex-1 leading-tight truncate">
                      <span className="font-bold text-slate-700">{school?.address || "School Campus"}</span>
                      {school?.phone && <span className="ml-1 text-slate-500">• Helpline: {school.phone}</span>}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end justify-end">
                      {signatureUrl ? (
                        <img
                          src={signatureUrl}
                          alt="Signature"
                          className="h-3.5 max-w-[65px] object-contain block mb-0.5"
                        />
                      ) : (
                        <span className="font-serif italic font-bold text-slate-900 text-[7px] block leading-none mb-0.5">
                          {principalName}
                        </span>
                      )}
                      <p className="text-[6px] font-black uppercase tracking-wider text-slate-700">
                        {principalTitle}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── PORTRAIT CR80 DRIVER ID CARD ── */
                <div
                  className="w-[240px] min-h-[380px] max-h-[380px] bg-white rounded-2xl shadow-xl border-2 border-amber-500/50 flex flex-col relative overflow-hidden select-none print:w-[54mm] print:h-[85.6mm] print:shadow-none print:m-0"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <div className="bg-slate-950 py-1 flex items-center justify-center">
                    <div className="w-10 h-1.5 rounded-full bg-white/20" />
                  </div>

                  <div className="bg-gradient-to-b from-slate-900 to-amber-900 px-3 py-2 text-center text-white shrink-0">
                    <div className="flex items-center justify-center gap-1.5">
                      {schoolLogo && (
                        <img
                          src={cleanLogoUrl(schoolLogo)}
                          alt="Logo"
                          className="w-5 h-5 rounded-full bg-white object-contain p-0.5 shrink-0"
                        />
                      )}
                      <h4 className="font-black text-[11px] tracking-tight leading-tight line-clamp-1">
                        {schoolName}
                      </h4>
                    </div>
                    <p className="text-[6.5px] text-amber-200 truncate mt-0.5">{affiliation}</p>
                    <div className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-widest">
                      DRIVER ID CARD • {sessionLabel}
                    </div>
                  </div>

                  <div className="px-3 pt-2.5 pb-1 flex items-center justify-between gap-2 shrink-0 bg-white">
                    <div className="w-[66px] h-[80px] rounded-xl border-2 border-amber-300 shadow-xs bg-amber-50 flex flex-col items-center justify-center">
                      <User className="w-8 h-8 text-amber-600" />
                      <span className="text-[7px] font-black text-amber-800">DRIVER</span>
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0 w-[78px]">
                      <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs flex items-center justify-center">
                        <QRCode value={qrVerifyPayload} size={64} level="L" />
                      </div>
                      <span className="text-[6.5px] text-amber-700 font-black uppercase tracking-tighter mt-0.5">
                        Scan to Login
                      </span>
                      <span className="text-[6px] text-slate-600 font-mono font-bold whitespace-nowrap">
                        {driverIdCode}
                      </span>
                    </div>
                  </div>

                  <div className="px-3 py-1 text-center bg-amber-50 border-y border-amber-200 shrink-0">
                    <h3 className="text-xs font-black text-slate-900 leading-tight truncate">
                      {driverName}
                    </h3>
                    <span className="inline-block text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase tracking-wider mt-0.5">
                      Bus Driver
                    </span>
                  </div>

                  <div className="px-3 py-1.5 flex-1 text-[8.5px] text-slate-700 space-y-1 leading-tight overflow-hidden">
                    <div className="flex justify-between border-b border-slate-100 pb-0.5 gap-1">
                      <span className="text-slate-400 font-bold shrink-0">Bus No:</span>
                      <span className="font-black text-slate-900 truncate">{busNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5 gap-1">
                      <span className="text-slate-400 font-bold shrink-0">Route:</span>
                      <span className="font-bold text-slate-800 truncate">{route}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5 gap-1">
                      <span className="text-slate-400 font-bold shrink-0">Mobile:</span>
                      <span className="font-mono font-bold text-slate-800">{phone || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-1">
                      <span className="text-slate-400 font-bold shrink-0">Driver ID:</span>
                      <span className="font-mono font-black text-amber-700">{driverIdCode}</span>
                    </div>
                  </div>

                  <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[6.5px] text-slate-600 shrink-0 mt-auto">
                    <div className="min-w-0 flex-1 leading-tight truncate">
                      <span className="font-bold text-slate-700">{school?.address || "School Campus"}</span>
                    </div>
                    <div className="text-right shrink-0">
                      {signatureUrl ? (
                        <img
                          src={signatureUrl}
                          alt="Signature"
                          className="h-3 max-w-[60px] object-contain block mb-0.5 ml-auto"
                        />
                      ) : (
                        <span className="font-serif italic font-black text-slate-900 text-[6.5px] block leading-none mb-0.5">
                          {principalName}
                        </span>
                      )}
                      <p className="text-[5.5px] font-black uppercase tracking-wider text-slate-700">
                        {principalTitle}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Driver QR Login Details Box */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800 dark:text-white">
                  Driver QR Login Details (ड्राइवर लॉगिन जानकारी)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Is ID Card ka QR Code scan karte hi driver seedha apne Driver GPS Dashboard me login ho jayega
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Driver ID:</span>
                  <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">{driverIdCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(driverIdCode, "driverId")}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                >
                  {copiedField === "driverId" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Driver Mobile:</span>
                  <span className="font-mono font-black text-sm text-slate-800 dark:text-slate-200">{phone || "Not Set"}</span>
                </div>
                {phone && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(phone, "phone")}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                  >
                    {copiedField === "phone" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/25 rounded-xl border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed">
              <strong>Driver Login Kaise Karega?</strong>
              <ol className="list-decimal list-inside space-y-0.5 mt-1 text-slate-700 dark:text-slate-300">
                <li>Driver apne phone me App khol kar Login screen par <strong>"Login with ID Card QR Code"</strong> ya <strong>"Bus Driver Login"</strong> dabayega.</li>
                <li>Is Driver ID Card ka <strong>QR Code scan</strong> (ya photo upload) karte hi seedha Driver GPS Dashboard khul jayega!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Transport ERP • Driver ID Card Generator
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Driver ID Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
