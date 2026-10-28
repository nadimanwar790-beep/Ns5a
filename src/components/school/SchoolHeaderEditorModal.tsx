// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Building2, X, Save, CheckCircle2, Image as ImageIcon, Phone, Mail, MapPin, User, Award, ShieldCheck, Sparkles, PenTool } from "lucide-react";
import { DirectUploadButton } from "../DirectUploadButton";
import { updateSchool } from "../../school-firebase";
import { DigitalSignatureModal } from "./DigitalSignatureModal";
import {
  DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS,
  type School,
  type SchoolDocumentKey,
  type SchoolDocumentPrintFields,
  type SchoolPrintField,
  type SchoolProfileCustomField,
} from "../../school-types";

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
  principalPhone?: string;
  directorName?: string;
  directorPhone?: string;
  principalSignatureUrl?: string;
  directorSignatureUrl?: string;
  customFields?: SchoolProfileCustomField[];
  documentPrintFields?: SchoolDocumentPrintFields;
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
  const createDefaultData = (): SchoolHeaderDetails => ({
    schoolName: currentDetails?.schoolName || initialDetails?.schoolName || school?.name || "",
    tagline: currentDetails?.tagline || initialDetails?.tagline || school?.tagline || "",
    affiliation: currentDetails?.affiliation || initialDetails?.affiliation || school?.affiliation || "",
    address: currentDetails?.address || initialDetails?.address || school?.address || "",
    phone: currentDetails?.phone || initialDetails?.phone || school?.mobile || school?.phone || "",
    email: currentDetails?.email || initialDetails?.email || school?.email || "",
    logoUrl: currentDetails?.logoUrl || initialDetails?.logoUrl || school?.logoUrl || "",
    principalName: currentDetails?.principalName || initialDetails?.principalName || school?.principalName || "",
    principalTitle: currentDetails?.principalTitle || initialDetails?.principalTitle || "Principal / Authorized Signatory",
    code: currentDetails?.code || initialDetails?.code || school?.code || "",
    principalPhone: currentDetails?.principalPhone || initialDetails?.principalPhone || school?.principalPhone || "",
    directorName: currentDetails?.directorName || initialDetails?.directorName || school?.directorName || "",
    directorPhone: currentDetails?.directorPhone || initialDetails?.directorPhone || school?.directorPhone || "",
    principalSignatureUrl: currentDetails?.principalSignatureUrl || initialDetails?.principalSignatureUrl || school?.principalSignatureUrl || "",
    directorSignatureUrl: currentDetails?.directorSignatureUrl || initialDetails?.directorSignatureUrl || school?.directorSignatureUrl || "",
    customFields: currentDetails?.customFields || initialDetails?.customFields || school?.customFields || [],
    documentPrintFields: currentDetails?.documentPrintFields || initialDetails?.documentPrintFields || school?.documentPrintFields || {},
  });

  const [details, setDetails] = useState<SchoolHeaderDetails>(createDefaultData);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDigitalSignatureModal, setShowDigitalSignatureModal] = useState(false);

  // CRITICAL FIX: Only populate details when the modal transitions from closed to open.
  // Never wipe user edits while they are actively typing inside the open modal!
  const prevOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setDetails(createDefaultData());
    }
    prevOpenRef.current = Boolean(isOpen);
  }, [isOpen]);

  if (isOpen === false) return null;

  const targetSchoolId = schoolId || school?.id;

  const saveToFirebase = async (dataToSave: SchoolHeaderDetails) => {
    if (!targetSchoolId) return;
    await updateSchool(targetSchoolId, {
      name: dataToSave.schoolName,
      tagline: dataToSave.tagline,
      affiliation: dataToSave.affiliation,
      address: dataToSave.address,
      phone: dataToSave.phone,
      mobile: dataToSave.phone,
      email: dataToSave.email,
      logoUrl: dataToSave.logoUrl,
      principalName: dataToSave.principalName,
      principalTitle: dataToSave.principalTitle || "Principal / Authorized Signatory",
      principalPhone: dataToSave.principalPhone || "",
      directorName: dataToSave.directorName || "",
      directorPhone: dataToSave.directorPhone || "",
      principalSignatureUrl: dataToSave.principalSignatureUrl || "",
      directorSignatureUrl: dataToSave.directorSignatureUrl || "",
      customFields: dataToSave.customFields || [],
      documentPrintFields: dataToSave.documentPrintFields || {},
      code: dataToSave.code || school?.code,
    });
  };

  const handleApply = async () => {
    setSavingDefault(true);
    try {
      if (targetSchoolId) {
        await saveToFirebase(details);
      }
    } catch (err) {
      console.warn("Could not auto-save to Firebase on apply:", err);
    } finally {
      setSavingDefault(false);
    }
    if (onApply) onApply(details);
    if (onSave) onSave(details);
    onClose();
  };

  const handleSaveAsSchoolDefault = async () => {
    setSavingDefault(true);
    try {
      if (targetSchoolId) {
        await saveToFirebase(details);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onApply) onApply(details);
      if (onSave) onSave(details);
    } catch (err) {
      console.error("Failed to update school profile:", err);
      alert("Failed to save school profile. Please retry.");
    } finally {
      setSavingDefault(false);
    }
  };

  const documentOptions: { key: SchoolDocumentKey; label: string }[] = [
    { key: "idCard", label: "ID Card" },
    { key: "certificate", label: "Certificate" },
    { key: "marksheet", label: "Marksheet" },
    { key: "feeReceipt", label: "Fee Receipt" },
  ];
  const fieldOptions: { key: SchoolPrintField; label: string }[] = [
    { key: "schoolName", label: "School name" },
    { key: "address", label: "School address" },
    { key: "phone", label: "School phone" },
    { key: "email", label: "School email" },
    { key: "affiliation", label: "Board / affiliation" },
    { key: "code", label: "School code" },
    { key: "principalName", label: "Principal name" },
    { key: "principalPhone", label: "Principal mobile" },
    { key: "directorName", label: "Director name" },
    { key: "directorPhone", label: "Director mobile" },
    { key: "customFields", label: "Extra school details" },
  ];
  const fieldsForDocument = (document: SchoolDocumentKey) =>
    details.documentPrintFields?.[document] ?? DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS[document];
  const toggleDocumentField = (document: SchoolDocumentKey, field: SchoolPrintField, enabled: boolean) => {
    const current = fieldsForDocument(document);
    const fields = enabled
      ? Array.from(new Set([...current, field]))
      : current.filter(item => item !== field);
    setDetails(previous => ({
      ...previous,
      documentPrintFields: {
        ...previous.documentPrintFields,
        [document]: fields,
      },
    }));
  };
  const setDocumentFields = (document: SchoolDocumentKey, fields: SchoolPrintField[]) => {
    setDetails(previous => ({
      ...previous,
      documentPrintFields: {
        ...previous.documentPrintFields,
        [document]: fields,
      },
    }));
  };
  const addCustomField = (defaultLabel = "") => {
    setDetails(previous => ({
      ...previous,
      customFields: [
        ...(previous.customFields || []),
        { id: `school-field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: defaultLabel, value: "" },
      ],
    }));
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
              <textarea
                rows={2}
              value={details.address}
              onChange={e => setDetails(p => ({ ...p, address: e.target.value }))}
              placeholder="e.g. Main Road, Civil Lines, Patna - 800001 (Bihar)"
                className="w-full resize-y px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Principal Mobile Number</label>
              <input
                type="tel"
                value={details.principalPhone || ""}
                onChange={e => setDetails(p => ({ ...p, principalPhone: e.target.value }))}
                placeholder="Principal mobile number"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Director / Manager Name</label>
              <input
                type="text"
                value={details.directorName || ""}
                onChange={e => setDetails(p => ({ ...p, directorName: e.target.value }))}
                placeholder="Director or manager name"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Director Mobile Number</label>
              <input
                type="tel"
                value={details.directorPhone || ""}
                onChange={e => setDetails(p => ({ ...p, directorPhone: e.target.value }))}
                placeholder="Director mobile number"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Digital Signatures Studio (Principal & Director) */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-amber-50/40 dark:from-indigo-950/40 dark:via-blue-950/20 dark:to-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950 dark:text-indigo-200">
                  <PenTool className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Digital Signatures Studio (Principal &amp; Director)</span>
                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full">New</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Screen pe ungli ya stylus se sign karein, ya photo upload karein — har document (ID Card, Fee Slip, Certificate, Marksheet, Admit Card) par auto-apply hoga.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDigitalSignatureModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>✍️ Screen Pe Sign Karein</span>
              </button>
            </div>

            {/* Signature status chips / mini previews */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Principal Signature</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate block">
                    {details.principalName || "Principal"}
                  </span>
                </div>
                {details.principalSignatureUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={details.principalSignatureUrl}
                      alt="Principal Sign"
                      className="h-8 max-w-[80px] object-contain border border-slate-200 dark:border-slate-700 rounded-md p-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setDetails(p => ({ ...p, principalSignatureUrl: "" }))}
                      className="text-[10px] text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDigitalSignatureModal(true)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    + Add Sign
                  </button>
                )}
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Director Signature</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate block">
                    {details.directorName || "Director / Manager"}
                  </span>
                </div>
                {details.directorSignatureUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={details.directorSignatureUrl}
                      alt="Director Sign"
                      className="h-8 max-w-[80px] object-contain border border-slate-200 dark:border-slate-700 rounded-md p-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setDetails(p => ({ ...p, directorSignatureUrl: "" }))}
                      className="text-[10px] text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDigitalSignatureModal(true)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    + Add Sign
                  </button>
                )}
              </div>
            </div>
          </div>

          <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Extra School Details</h3>
                <p className="text-[11px] text-slate-500">Apni zaroorat ke mutabik fields jodein; phir documents ke liye unhe select karein.</p>
              </div>
              <button
                type="button"
                onClick={() => addCustomField("")}
                className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-sm"
              >
                + Add Detail
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add:</span>
              {[
                "UDISE Code",
                "Registration No",
                "Estd. Year",
                "Trust / Society",
                "Website URL",
                "Office Timings"
              ].map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => addCustomField(sug)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-400 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors shadow-2xs"
                >
                  + {sug}
                </button>
              ))}
            </div>

            {(!details.customFields || details.customFields.length === 0) ? (
              <div className="text-center py-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-400">
                Koi extra detail add nahi hai. Upar <strong className="text-indigo-600 dark:text-indigo-400">+ Add Detail</strong> ya Quick Add button par click karein.
              </div>
            ) : (
              (details.customFields || []).map((field, index) => (
                <div key={field.id || index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    value={field.label}
                    onChange={e => setDetails(p => ({
                      ...p,
                      customFields: (p.customFields || []).map((item, i) => i === index ? { ...item, label: e.target.value } : item),
                    }))}
                    placeholder="Detail name (e.g. UDISE No.)"
                    className="min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <input
                    value={field.value}
                    onChange={e => setDetails(p => ({
                      ...p,
                      customFields: (p.customFields || []).map((item, i) => i === index ? { ...item, value: e.target.value } : item),
                    }))}
                    placeholder="Value (e.g. 10245089)"
                    className="min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    aria-label={`Remove detail ${index + 1}`}
                    onClick={() => setDetails(p => ({ ...p, customFields: (p.customFields || []).filter((_, i) => i !== index) }))}
                    className="rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 text-xs font-bold text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Choose details for each printout</h3>
                <p className="text-[11px] text-slate-500">School details can be shown or hidden separately on each document.</p>
              </div>
              <button
                type="button"
                onClick={() => setDetails(previous => ({
                  ...previous,
                  documentPrintFields: {
                    ...previous.documentPrintFields,
                    idCard: DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS.idCard,
                    certificate: DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS.certificate,
                    marksheet: DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS.marksheet,
                    feeReceipt: DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS.feeReceipt,
                  },
                }))}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white"
              >
                Recommended for all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {documentOptions.map(document => (
                <details key={document.key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" open={document.key === "idCard"}>
                  <summary className="cursor-pointer text-xs font-black text-slate-800 dark:text-white">{document.label}</summary>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-500">Blank school fields print nahi honge.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDocumentFields(document.key, DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS[document.key])}
                        className="rounded-lg border border-indigo-200 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"
                      >
                        Recommended
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentFields(document.key, fieldOptions.map(field => field.key))}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                      >
                        All fields
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {fieldOptions.map(field => (
                      <label key={field.key} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={fieldsForDocument(document.key).includes(field.key)}
                          onChange={e => toggleDocumentField(document.key, field.key, e.target.checked)}
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
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

      {showDigitalSignatureModal && targetSchoolId && (
        <DigitalSignatureModal
          isOpen={showDigitalSignatureModal}
          onClose={() => setShowDigitalSignatureModal(false)}
          school={school || { id: targetSchoolId, name: details.schoolName, principalSignatureUrl: details.principalSignatureUrl, directorSignatureUrl: details.directorSignatureUrl } as School}
          schoolId={targetSchoolId}
          onSignaturesUpdated={updated => {
            setDetails(p => ({
              ...p,
              principalSignatureUrl: updated.principalSignatureUrl !== undefined ? updated.principalSignatureUrl : p.principalSignatureUrl,
              directorSignatureUrl: updated.directorSignatureUrl !== undefined ? updated.directorSignatureUrl : p.directorSignatureUrl,
            }));
          }}
        />
      )}
    </div>
  );
};
