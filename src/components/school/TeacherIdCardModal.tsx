// @ts-nocheck
import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";
import {
  X, Printer, Phone, Mail, Award, Shield, User,
  Share2, ExternalLink, Check, Copy, Sparkles,
  Download, QrCode, Building2
} from "lucide-react";
import type { School, SchoolTeacher, StaffEmployee } from "../../school-types";
import { getSavedSchoolLogo, cleanLogoUrl, formatAcademicSession } from "./feeReceiptUtils";
import { printElementInIframe } from "./AdmissionFormPrintModal";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teacher: SchoolTeacher | StaffEmployee | null;
  school: School | null;
  onOpenTeacherPortal?: (teacher: SchoolTeacher | StaffEmployee) => void;
}

export const TeacherIdCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  teacher,
  school,
  onOpenTeacherPortal,
}) => {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !teacher) return null;

  const schoolName = school?.name || "Institutional Campus";
  const schoolLogo = getSavedSchoolLogo(school?.logoUrl, school?.id);
  const affiliation = school?.affiliation || school?.tagline || "Affiliated Educational Center";
  const sessionLabel = formatAcademicSession(school?.session || "2026-27");
  const principalName = school?.principalName || "Principal / Head of Institution";
  const principalTitle = school?.principalTitle || "Principal / Head of Institution";
  const signatureUrl = school?.principalSignatureUrl;

  const teacherName = teacher.name || "Teacher";
  const teacherId = teacher.id || `tea_${Date.now()}`;
  const empId =
    teacher.employeeId ||
    (teacher as any).empId ||
    `EMP-${teacherId.slice(-4).toUpperCase()}`;
  const phone = teacher.phone || (teacher as any).mobile || "";
  const email = teacher.email || `${teacherName.toLowerCase().replace(/[^a-z0-9]/g, "")}@${school?.code ? school.code.toLowerCase() : "school"}.edu.in`;
  const designation = teacher.designation || "Faculty Member";
  const department =
    teacher.department ||
    ((teacher as any).subjects && (teacher as any).subjects.length > 0
      ? (Array.isArray((teacher as any).subjects) ? (teacher as any).subjects.join(", ") : (teacher as any).subjects)
      : "Academics");
  const photoUrl = teacher.photoUrl;

  // Generate standardized Teacher Login & Attendance QR Code
  // Format: NSTA-SCHOOL-STAFF:schoolId:id:rollOrEmp:classOrDept:name:admNo:phone:father:mother:blood:dob:address:fee:title:schoolName
  const qrVerifyUrl = `NSTA-SCHOOL-STAFF:${[
    encodeURIComponent(school?.id || ""),
    encodeURIComponent(teacherId),
    encodeURIComponent(empId),
    encodeURIComponent(department),
    encodeURIComponent(teacherName),
    encodeURIComponent(""),
    encodeURIComponent(phone),
    encodeURIComponent(""),
    encodeURIComponent(""),
    encodeURIComponent(""),
    encodeURIComponent(""),
    encodeURIComponent(school?.address || ""),
    encodeURIComponent("0"),
    encodeURIComponent(designation),
    encodeURIComponent(schoolName),
  ].join(":")}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    printElementInIframe(printAreaRef.current, `${teacherName} - Teacher ID Card`);
  };

  const handleShareWhatsApp = () => {
    const text =
      `*🏫 ${schoolName.toUpperCase()}*\n` +
      `*🪪 OFFICIAL TEACHER IDENTITY CARD*\n\n` +
      `👤 *Teacher Name:* ${teacherName}\n` +
      `🏷️ *Designation:* ${designation}\n` +
      `🏢 *Department:* ${department}\n` +
      `🆔 *Employee ID:* ${empId}\n` +
      `📱 *Registered Mobile:* ${phone || "Not set"}\n` +
      `📧 *Email:* ${email}\n` +
      `📅 *Academic Session:* ${sessionLabel}\n\n` +
      `🔑 *Teacher Portal Login:* App open karein aur login screen par apna QR Code scan karein ya Mobile/Emp ID daal kar apna Teacher Dashboard access karein.`;

    const encoded = encodeURIComponent(text);
    const waUrl = phone ? `https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    safeOpenExternalUrl(waUrl);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight leading-tight">
                  Teacher Identity Card (शिक्षक पहचान पत्र)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                  ID Ready
                </span>
              </div>
              <p className="text-[11px] text-purple-200">
                Teacher login, haziri aur class management ke liye authorized card
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Orientation Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                orientation === "landscape"
                  ? "bg-purple-600 text-white shadow-xs"
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
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Vertical (54 × 85.6mm)
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              title="Teacher ke WhatsApp par ID Card details bhejein"
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

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-100/50 dark:bg-slate-950/40">
          {/* Card Presentation Container */}
          <div className="flex justify-center items-center py-2">
            <div ref={printAreaRef} className="print-card-wrapper">
              {orientation === "landscape" ? (
                /* ── LANDSCAPE CR80 ID CARD ── */
                <div
                  className="w-[360px] min-h-[224px] max-h-[224px] bg-white rounded-2xl shadow-xl border-2 border-purple-500/40 flex flex-col relative overflow-hidden select-none print:w-[85.6mm] print:h-[54mm] print:shadow-none print:m-0"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {/* Top School Header */}
                  <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 px-3 py-1.5 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {schoolLogo ? (
                        <img
                          src={cleanLogoUrl(schoolLogo)}
                          alt="Logo"
                          className="w-6 h-6 rounded-full bg-white object-contain p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-black text-[9px] text-white shrink-0">
                          {(schoolName || "SC").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 leading-tight">
                        <h4 className="font-black text-[11px] tracking-tight truncate max-w-[210px] text-white">
                          {schoolName}
                        </h4>
                        <p className="text-[7px] text-purple-200 truncate max-w-[210px]">
                          {affiliation}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-wider shadow-xs">
                        TEACHER ID
                      </span>
                      <p className="text-[6.5px] text-purple-200 font-bold mt-0.5 text-right">{sessionLabel}</p>
                    </div>
                  </div>

                  {/* Body Columns: 1. Photo Left, 2. Info Center, 3. QR Right */}
                  <div className="px-3 py-2 flex-1 flex items-center justify-between gap-2.5 bg-white">
                    {/* Photo */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="w-[66px] h-[82px] rounded-xl border-2 border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center shadow-xs">
                        {photoUrl ? (
                          <img src={photoUrl} alt={teacherName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                            <User className="w-8 h-8 text-slate-300" />
                            <span className="text-[7px] font-bold mt-0.5 text-slate-400">Teacher</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 text-[9px] leading-tight space-y-0.5">
                      <div className="border-b border-slate-100 pb-0.5">
                        <h3 className="font-black text-[12px] text-slate-900 truncate">
                          {teacherName}
                        </h3>
                        <span className="inline-block text-[7.5px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider mt-0.5">
                          {designation}
                        </span>
                      </div>

                      <div className="pt-0.5 space-y-0.5 text-[8.5px] text-slate-700">
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-400 font-bold">Emp ID / Login:</span>
                          <span className="font-mono font-black text-purple-700">{empId}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-400 font-bold">Dept / Subjects:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[125px]">{department}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-400 font-bold">Mobile:</span>
                          <span className="font-bold text-slate-800">{phone || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold">Valid Till:</span>
                          <span className="font-black text-emerald-700">{sessionLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-[78px]">
                      <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs flex items-center justify-center">
                        <QRCode value={qrVerifyUrl} size={66} level="M" />
                      </div>
                      <span className="text-[6.5px] font-black text-purple-700 uppercase tracking-tighter mt-0.5">
                        Scan to Login
                      </span>
                      <span className="text-[6px] text-slate-600 font-mono font-bold whitespace-nowrap">
                        {empId}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Footer */}
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
                /* ── PORTRAIT CR80 ID CARD ── */
                <div
                  className="w-[240px] min-h-[380px] max-h-[380px] bg-white rounded-2xl shadow-xl border-2 border-purple-500/40 flex flex-col relative overflow-hidden select-none print:w-[54mm] print:h-[85.6mm] print:shadow-none print:m-0"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {/* Top Lanyard Slot Accent */}
                  <div className="bg-purple-950 py-1 flex items-center justify-center">
                    <div className="w-10 h-1.5 rounded-full bg-white/20" />
                  </div>

                  {/* School Header */}
                  <div className="bg-gradient-to-b from-purple-900 to-indigo-900 px-3 py-2 text-center text-white shrink-0">
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
                    <p className="text-[6.5px] text-purple-200 truncate mt-0.5">{affiliation}</p>
                    <div className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-widest">
                      TEACHER ID CARD • {sessionLabel}
                    </div>
                  </div>

                  {/* Photo & QR Row */}
                  <div className="px-3 pt-2.5 pb-1 flex items-center justify-between gap-2 shrink-0 bg-white">
                    <div className="w-[68px] h-[82px] rounded-xl border-2 border-slate-300 overflow-hidden shadow-xs bg-slate-50 flex items-center justify-center">
                      {photoUrl ? (
                        <img src={photoUrl} alt={teacherName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0 w-[76px]">
                      <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs flex items-center justify-center">
                        <QRCode value={qrVerifyUrl} size={62} level="M" />
                      </div>
                      <span className="text-[6.5px] text-purple-700 font-black uppercase tracking-tighter mt-0.5">
                        Scan ID
                      </span>
                      <span className="text-[6px] text-slate-600 font-mono font-bold whitespace-nowrap">
                        {empId}
                      </span>
                    </div>
                  </div>

                  {/* Teacher Name Band */}
                  <div className="px-3 py-1 text-center bg-purple-50/70 border-y border-purple-100 shrink-0">
                    <h3 className="text-xs font-black text-slate-900 leading-tight truncate">
                      {teacherName}
                    </h3>
                    <span className="inline-block text-[8px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white uppercase tracking-wider mt-0.5">
                      {designation}
                    </span>
                  </div>

                  {/* Details List */}
                  <div className="px-3 py-1 flex-1 text-[8.5px] text-slate-700 space-y-1 leading-tight overflow-hidden">
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="text-slate-400 font-bold">Emp ID:</span>
                      <span className="font-mono font-black text-purple-700">{empId}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="text-slate-400 font-bold">Department:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[125px]">{department}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="text-slate-400 font-bold">Mobile:</span>
                      <span className="font-bold text-slate-800">{phone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Valid Till:</span>
                      <span className="font-black text-emerald-700">{sessionLabel}</span>
                    </div>
                  </div>

                  {/* Footer */}
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

          {/* Teacher Login Credentials Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-800 dark:text-white">
                    Teacher Login Details (लॉगिन क्रेडेंशियल)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Teacher is ID / Mobile Number ya QR code ko scan karke portal me login kar sakte hain
                  </p>
                </div>
              </div>

              {onOpenTeacherPortal && (
                <button
                  type="button"
                  onClick={() => onOpenTeacherPortal(teacher)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Teacher Portal</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Employee / Teacher ID:</span>
                  <span className="font-mono font-black text-sm text-purple-600 dark:text-purple-400">{empId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(empId, "empId")}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                  title="Copy ID"
                >
                  {copiedField === "empId" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Registered Mobile:</span>
                  <span className="font-mono font-black text-sm text-slate-800 dark:text-slate-200">{phone || "Not Set"}</span>
                </div>
                {phone && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(phone, "phone")}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedField === "phone" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed">
              💡 <strong>Teacher Login Kaise Karein?</strong>
              <ol className="list-decimal list-inside space-y-0.5 mt-1 text-slate-600 dark:text-slate-300">
                <li>Teacher app khol kar login screen par diye gaye <strong>"Scan ID Card"</strong> button se is ID card ka QR code scan kar sakte hain.</li>
                <li>Ya seedhe apna <strong>Mobile Number ({phone || empId})</strong> ya <strong>Employee ID ({empId})</strong> daal kar bina kisi dikkat ke login kar sakte hain.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            School ERP • Teacher ID Card Generation Engine
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
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official ID Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
