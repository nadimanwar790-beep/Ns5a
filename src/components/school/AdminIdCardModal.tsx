// @ts-nocheck
import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";
import {
  X, Printer, Phone, Mail, Award, Shield, User,
  Share2, ExternalLink, Check, Copy, Sparkles,
  Download, QrCode, Building2, Crown, CheckCircle2,
  Calendar, MapPin
} from "lucide-react";
import type { School } from "../../school-types";
import { getSavedSchoolLogo, cleanLogoUrl, formatAcademicSession } from "./feeReceiptUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School | null;
  adminName?: string;
  adminPhone?: string;
  adminEmail?: string;
  designation?: string;
}

export const AdminIdCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  adminName: customAdminName,
  adminPhone: customAdminPhone,
  adminEmail: customAdminEmail,
  designation: customDesignation,
}) => {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const schoolName = school?.name || "Institutional Campus";
  const schoolLogo = getSavedSchoolLogo(school?.logoUrl, school?.id);
  const affiliation = school?.affiliation || school?.tagline || "Affiliated Educational Center";
  const sessionLabel = formatAcademicSession(school?.session || "2026-27");
  const principalName = customAdminName || school?.principalName || "Dr. Arvind Swaminathan";
  const principalTitle = customDesignation || "Principal & School Administrator";
  const signatureUrl = school?.principalSignatureUrl;
  const directorSignatureUrl = school?.directorSignatureUrl;

  const adminId = "ADMIN-01";
  const phone = customAdminPhone || school?.phone || school?.mobile || "9811023450";
  const email = customAdminEmail || school?.email || school?.adminEmail || "admin@dps.edu.in";
  const bloodGroup = "B+";
  const address = school?.address || "Institutional Area, Main Campus";

  // Standardized Admin Login & Attendance QR Code
  // Format: NSTA-SCHOOL-STAFF:schoolId:id:rollOrEmp:classOrDept:name:admNo:phone:father:mother:blood:dob:address:fee:title:schoolName
  const qrVerifyUrl = `NSTA-SCHOOL-STAFF:${[
    encodeURIComponent(school?.id || "dps_gurgaon_sector45"),
    encodeURIComponent("ADMIN-01"),
    encodeURIComponent("ADMIN-01"),
    encodeURIComponent("Administration & Head"),
    encodeURIComponent(principalName),
    encodeURIComponent("ADM-001"),
    encodeURIComponent(phone),
    encodeURIComponent("Executive Committee"),
    encodeURIComponent("Management Board"),
    encodeURIComponent(bloodGroup),
    encodeURIComponent(""),
    encodeURIComponent(address),
    encodeURIComponent("0"),
    encodeURIComponent("SCHOOL_ADMIN"),
    encodeURIComponent(schoolName),
  ].join(":")}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text =
      `*🏛️ ${schoolName.toUpperCase()}*\n` +
      `*👑 OFFICIAL SCHOOL ADMINISTRATOR & PRINCIPAL ID CARD*\n\n` +
      `👤 *Name:* ${principalName}\n` +
      `🏷️ *Designation:* ${principalTitle}\n` +
      `🆔 *Admin ID:* ${adminId}\n` +
      `📱 *Official Mobile:* ${phone}\n` +
      `📧 *Email:* ${email}\n` +
      `📅 *Session Validity:* ${sessionLabel}\n` +
      `📍 *Campus:* ${address}\n\n` +
      `⚡ *NSTA Quick Attendance:* QR कोड को NSTA होम स्कैनर पर स्कैन करके आगमन (Punch-In) या प्रस्थान (Punch-Out) तुरंत दर्ज करें।`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${targetPhone}?text=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  Official School Admin &amp; Principal ID Card
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  AUTHORITY
                </span>
              </div>
              <p className="text-xs text-amber-200/90 font-medium">
                हाई-रेजोल्यूशन प्रिंट, बारकोड, क्यूआर कोड व डिजिटल हस्ताक्षर
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Orientation Toggle */}
            <div className="bg-white/10 rounded-xl p-1 flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  orientation === "landscape"
                    ? "bg-amber-400 text-slate-950 shadow-xs"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Horizontal (ATM)
              </button>
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  orientation === "portrait"
                    ? "bg-amber-400 text-slate-950 shadow-xs"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Vertical (Lanyard)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex flex-col items-center">
          {/* Action Helper Strip */}
          <div className="w-full flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>QR Code scans instantly for School Admin Arrival (Punch In) &amp; Departure (Punch Out)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Card</span>
              </button>
            </div>
          </div>

          {/* PRINTABLE ID CARD WRAPPER */}
          <div ref={printAreaRef} className="print:m-0 print:p-0 flex justify-center">
            {orientation === "landscape" ? (
              /* LANDSCAPE CR80 ID CARD (85.6mm x 54mm) */
              <div
                className="w-[420px] max-w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/60 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white relative font-sans print:shadow-none print:w-[85.6mm] print:h-[54mm] print:border-amber-600"
                style={{ aspectRatio: "1.586 / 1" }}
              >
                {/* Gold Top Banner */}
                <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 px-3 py-2 flex items-center justify-between text-slate-950">
                  <div className="flex items-center gap-2 min-w-0">
                    {schoolLogo ? (
                      <img
                        src={schoolLogo}
                        alt="Logo"
                        className="w-7 h-7 rounded-lg object-contain bg-white/90 p-0.5 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                        🏛️
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-black text-[12px] leading-tight uppercase tracking-tight truncate">
                        {schoolName}
                      </h4>
                      <p className="text-[9px] font-bold opacity-80 truncate">{affiliation}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 text-[8px] font-black uppercase tracking-wider">
                      ADMIN
                    </span>
                    <p className="text-[8px] font-mono font-bold mt-0.5">{sessionLabel}</p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 grid grid-cols-12 gap-3 items-center">
                  {/* Left Column: Photo & Crown */}
                  <div className="col-span-4 flex flex-col items-center text-center">
                    <div className="relative">
                      <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-amber-400 shadow-md bg-slate-800 flex items-center justify-center">
                        {schoolLogo ? (
                          <img src={schoolLogo} alt="Admin" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-amber-400 bg-amber-950/40">
                            <Crown className="w-8 h-8 mb-1" />
                            <span className="text-[9px] font-black">ADMIN</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5 fill-slate-950" />
                          <span>HEAD</span>
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-[10px] font-mono font-bold text-amber-300">
                      ID: {adminId}
                    </p>
                  </div>

                  {/* Middle Column: Details */}
                  <div className="col-span-5 space-y-1 text-left min-w-0">
                    <div>
                      <h5 className="font-black text-sm text-white leading-tight truncate">
                        {principalName}
                      </h5>
                      <p className="text-[10px] font-bold text-amber-300 truncate">
                        {principalTitle}
                      </p>
                    </div>

                    <div className="space-y-0.5 pt-1 text-[9px] text-slate-300">
                      <p className="flex items-center gap-1 truncate">
                        <Phone className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span className="font-semibold">{phone}</span>
                      </p>
                      <p className="flex items-center gap-1 truncate">
                        <Mail className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span className="truncate">{email}</span>
                      </p>
                      <p className="flex items-center gap-1 text-[8.5px] text-slate-400 truncate">
                        <MapPin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span className="truncate">{address}</span>
                      </p>
                    </div>

                    {/* Authorized Signature Stamp */}
                    <div className="pt-1.5 flex items-end justify-between border-t border-white/10 mt-1">
                      <div>
                        {signatureUrl ? (
                          <img
                            src={signatureUrl}
                            alt="Signature"
                            className="h-5 object-contain filter invert brightness-200"
                          />
                        ) : (
                          <div className="font-serif italic text-[11px] text-amber-300 font-bold leading-tight">
                            {principalName.split(" ")[0]}
                          </div>
                        )}
                        <p className="text-[7.5px] uppercase text-slate-400 font-bold">Authorized Signatory</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-emerald-400 font-mono font-bold">VERIFIED</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Attendance QR Code & Barcode */}
                  <div className="col-span-3 flex flex-col items-center justify-center text-center">
                    <div className="p-1.5 bg-white rounded-xl shadow-inner border border-amber-400/40">
                      <QRCode value={qrVerifyUrl} size={64} level="M" />
                    </div>
                    <span className="text-[8px] font-mono text-amber-200 mt-1 uppercase tracking-tight">
                      Scan To Punch
                    </span>
                    {/* Simulated 1D Barcode */}
                    <div className="mt-1 flex items-center gap-[1px] h-3 opacity-70">
                      {[3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1].map((w, i) => (
                        <div
                          key={`b-${i}`}
                          className="bg-white h-full"
                          style={{ width: `${w}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* PORTRAIT LANYARD BADGE (54mm x 85.6mm) */
              <div
                className="w-[300px] max-w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 text-white relative font-sans print:shadow-none print:w-[54mm] print:h-[85.6mm] print:border-amber-600 flex flex-col justify-between"
                style={{ aspectRatio: "1 / 1.586" }}
              >
                {/* Lanyard Clip Slot */}
                <div className="flex justify-center pt-2">
                  <div className="w-12 h-2 rounded-full bg-slate-800 border border-white/20" />
                </div>

                {/* Header */}
                <div className="px-3 pt-2 pb-1 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {schoolLogo ? (
                      <img
                        src={schoolLogo}
                        alt="Logo"
                        className="w-8 h-8 rounded-lg object-contain bg-white/90 p-0.5 shadow-xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                        🏛️
                      </div>
                    )}
                  </div>
                  <h4 className="font-black text-xs uppercase leading-tight text-amber-300">
                    {schoolName}
                  </h4>
                  <p className="text-[8.5px] text-slate-300">{affiliation}</p>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-[8px] font-black uppercase tracking-wider mt-1.5 shadow-sm">
                    👑 ADMINISTRATIVE HEAD IDENTITY CARD
                  </div>
                </div>

                {/* Photo & Crown Badge */}
                <div className="flex flex-col items-center px-4">
                  <div className="relative">
                    <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-amber-400 shadow-lg bg-slate-800 flex items-center justify-center">
                      {schoolLogo ? (
                        <img src={schoolLogo} alt="Admin" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-amber-400 bg-amber-950/40">
                          <Crown className="w-8 h-8 mb-1" />
                          <span className="text-[9px] font-black">ADMIN</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black uppercase tracking-wider shadow-sm">
                        PRINCIPAL
                      </span>
                    </div>
                  </div>

                  <h5 className="font-black text-sm text-white mt-3 text-center leading-tight">
                    {principalName}
                  </h5>
                  <p className="text-[10px] font-bold text-amber-300 text-center">
                    {principalTitle}
                  </p>
                  <p className="text-[9px] font-mono text-slate-300 mt-0.5">
                    Emp ID: <strong className="text-amber-400">{adminId}</strong> • Blood: {bloodGroup}
                  </p>
                </div>

                {/* Details & Contacts */}
                <div className="px-4 py-1 text-[9px] text-slate-300 space-y-0.5 text-center">
                  <p>Mobile: <strong className="text-white">{phone}</strong></p>
                  <p className="truncate">Email: <span className="text-white">{email}</span></p>
                  <p className="text-[8px] text-slate-400 truncate">Session: {sessionLabel}</p>
                </div>

                {/* Footer with QR Code & Sign */}
                <div className="bg-slate-900/90 border-t border-amber-400/30 p-2.5 flex items-center justify-between gap-2">
                  <div className="p-1 bg-white rounded-lg shadow-sm shrink-0">
                    <QRCode value={qrVerifyUrl} size={46} level="M" />
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Signature"
                        className="h-5 object-contain filter invert brightness-200 ml-auto"
                      />
                    ) : (
                      <div className="font-serif italic text-[11px] text-amber-300 font-bold leading-tight">
                        {principalName.split(" ")[0]}
                      </div>
                    )}
                    <p className="text-[7.5px] uppercase text-slate-400 font-bold">Authorized Signatory</p>
                    <p className="text-[7.5px] text-emerald-400 font-mono">SCAN TO PUNCH IN/OUT</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Copy Info Box */}
          <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <h6 className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>School Admin Official Credentials &amp; Verification Details</span>
            </h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Admin ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-white">{adminId}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Designation:</span>
                <span className="font-bold text-slate-800 dark:text-white">{principalTitle}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Official Mobile:</span>
                <span className="font-bold text-slate-800 dark:text-white">{phone}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">QR Token Protocol:</span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">NSTA-SCHOOL-STAFF</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
