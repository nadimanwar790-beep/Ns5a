// @ts-nocheck
import React, { useState } from "react";
import { Building2, X, Save, CheckCircle2, Image as ImageIcon, Phone, Mail, MapPin, User, Award, ShieldCheck, Sparkles } from "lucide-react";
import { DirectUploadButton } from "../DirectUploadButton";
import { updateSchool } from "../../school-firebase";
import type { School } from "../../school-types";

export interface SchoolHeaderDetails {
  schoolName: string;
  tagline: string;
  affiliation: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  principalName: string;
  principalTitle: string;
  code: string;
}

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  school?: School;
  schoolId?: string;
  currentDetails?: SchoolHeaderDetails;
  initialDetails?: SchoolHeaderDetails;
  onApply?: (details: SchoolHeaderDetails) => void;
  onSave?: (details: SchoolHeaderDetails) => void;
  title?: string;
  subtitle?: string;
}

export const SchoolHeaderEditorModal: React.FC<Props> = ({
  isOpen = true,
  onClose,
  school,
  schoolId,
  currentDetails,
  initialDetails,
  onApply,
  onSave,
  title = "School Details & Template Customizer",
  subtitle = "Apne school ka naam, logo, address aur principal details yahan se likhein aur customize karein"
}) => {
  const initialData: SchoolHeaderDetails = currentDetails || initialDetails || {
    schoolName: school?.name || "National Academy",
    tagline: school?.tagline || "Learn • Grow • Lead",
    affiliation: "Affiliated to State / Central Board of Secondary Education",
    address: school?.address || "Main Campus Examination Center",
    phone: school?.mobile || school?.phone || "+91 98765 43210",
    email: school?.email || "info@school.org",
    logoUrl: school?.logoUrl || "",
    principalName: school?.principalName || "Dr. Rajeshwar Sharma",
    principalTitle: "Principal / Authorized Signatory",
    code: school?.code || "SCH-001",
  };

  const [details, setDetails] = useState<SchoolHeaderDetails>(initialData);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (isOpen === false) return null;

  const targetSchoolId = schoolId || school?.id;

  const handleApply = () => {
    if (onApply) onApply(details);
    if (onSave) onSave(details);
    onClose();
  };

  const handleSaveAsSchoolDefault = async () => {
    setSavingDefault(true);
    try {
      if (targetSchoolId) {
        await updateSchool(targetSchoolId, {
          name: details.schoolName,
          tagline: details.tagline,
          address: details.address,
          phone: details.phone,
          mobile: details.phone,
          email: details.email,
          logoUrl: details.logoUrl,
          principalName: details.principalName,
          code: details.code || school?.code,
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onApply) onApply(details);
      if (onSave) onSave(details);
    } catch (err) {
      console.error("Failed to update school profile:", err);
    } finally {
      setSavingDefault(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight text-white">{title}</h2>
              <p className="text-xs text-indigo-200 font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>School details default profile mein successfully save ho gaye hain!</span>
            </div>
          )}

          {/* School Name & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                School / Institution Name *
              </label>
              <input
                type="text"
                value={details.schoolName}
                onChange={e => setDetails(p => ({ ...p, schoolName: e.target.value }))}
                placeholder="e.g. Delhi Public School / IIC Model Academy"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                School Tagline / Slogan
              </label>
              <input
                type="text"
                value={details.tagline}
                onChange={e => setDetails(p => ({ ...p, tagline: e.target.value }))}
                placeholder="e.g. Learn • Lead • Succeed"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Affiliation / Board & School Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Board Affiliation / Recognition Line
              </label>
              <input
                type="text"
                value={details.affiliation}
                onChange={e => setDetails(p => ({ ...p, affiliation: e.target.value }))}
                placeholder="e.g. Affiliated to CBSE / State Board, New Delhi"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                School Code / Registration No
              </label>
              <input
                type="text"
                value={details.code}
                onChange={e => setDetails(p => ({ ...p, code: e.target.value }))}
                placeholder="e.g. SCH-0042 / AFF-2130"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Complete School Address
            </label>
            <input
              type="text"
              value={details.address}
              onChange={e => setDetails(p => ({ ...p, address: e.target.value }))}
              placeholder="e.g. Main Road, Civil Lines, Patna - 800001 (Bihar)"
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Contact Details (Phone & Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Helpline / Phone Number
              </label>
              <input
                type="text"
                value={details.phone}
                onChange={e => setDetails(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98765 43210 / 0612-224455"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Official Email / Website
              </label>
              <input
                type="text"
                value={details.email}
                onChange={e => setDetails(p => ({ ...p, email: e.target.value }))}
                placeholder="info@school.org / www.school.org"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Logo Section */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-700 border-2 border-indigo-200 dark:border-slate-600 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
              {details.logoUrl ? (
                <img src={details.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase">
                  {details.schoolName.slice(0, 2) || "LOGO"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                School Logo (Direct Upload / Web URL):
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <DirectUploadButton
                  kind="image"
                  compact
                  currentUrl={details.logoUrl}
                  onUploaded={url => setDetails(p => ({ ...p, logoUrl: url }))}
                  onClear={() => setDetails(p => ({ ...p, logoUrl: "" }))}
                  label="Upload Logo Photo"
                />
                <input
                  type="text"
                  value={details.logoUrl}
                  onChange={e => setDetails(p => ({ ...p, logoUrl: e.target.value }))}
                  placeholder="Ya logo image ka URL yahan paste karein"
                  className="flex-1 min-w-[180px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Principal & Signatory Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Principal / Headmaster Name
              </label>
              <input
                type="text"
                value={details.principalName}
                onChange={e => setDetails(p => ({ ...p, principalName: e.target.value }))}
                placeholder="Dr. Rajeshwar Sharma"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Principal Designation / Title
              </label>
              <input
                type="text"
                value={details.principalTitle}
                onChange={e => setDetails(p => ({ ...p, principalTitle: e.target.value }))}
                placeholder="Principal / Head of Institution"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveAsSchoolDefault}
            disabled={savingDefault}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>{savingDefault ? "Saving Default..." : "💾 Save as School Default"}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold bg-transparent hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ Apply Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
