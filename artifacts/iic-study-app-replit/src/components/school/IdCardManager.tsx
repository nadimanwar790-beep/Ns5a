// @ts-nocheck
import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";
import type { School, SchoolClass, SchoolStudent, StaffEmployee } from "../../school-types";
import {
  CreditCard, Printer, Download, Eye, ChevronLeft, User, Phone, MapPin,
  Calendar, Award, Sparkles, Filter, CheckSquare, Square, Layers, RefreshCw,
  Building2, UserPlus, Sliders, CheckCircle2, QrCode, FileText, Image as ImageIcon,
  Edit2, AlertTriangle, ArrowRightLeft, ShieldCheck, HelpCircle, ChevronDown, ChevronUp, Save
} from "lucide-react";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { QuickAddStudentModal } from "./QuickAddStudentModal";
import { DirectUploadButton } from "../DirectUploadButton";
import { updateSchool } from "../../school-firebase";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  staff: StaffEmployee[];
  onBack: () => void;
}

type CardTheme = "modern_indigo" | "royal_maroon" | "golden_dark" | "emerald_green";

export const IdCardManager: React.FC<Props> = ({
  school,
  classes = [],
  students: initialStudents = [],
  staff = [],
  onBack,
}) => {
  const [studentList, setStudentList] = useState<SchoolStudent[]>(initialStudents || []);
  const [activeTab, setActiveTab] = useState<"students" | "staff">("students");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(initialStudents[0] || null);
  const [selectedStaff, setSelectedStaff] = useState<StaffEmployee | null>(staff[0] || null);
  const [theme, setTheme] = useState<CardTheme>("modern_indigo");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cardOrientation, setCardOrientation] = useState<"landscape" | "portrait">("landscape");

  // School Details & Customization State
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showQuickSchoolEditor, setShowQuickSchoolEditor] = useState(false);
  const [showAutoMappingOptions, setShowAutoMappingOptions] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const [schoolDetails, setSchoolDetails] = useState<SchoolHeaderDetails & { session: string }>({
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
    session: "2026-27",
  });

  // Smart Auto-Data Mapping (Automatically places every field in its optimal card position)
  const [autoDataMapping, setAutoDataMapping] = useState(true);
  const [fieldSettings, setFieldSettings] = useState({
    showFatherName: true,
    showRollNo: true,
    showAdmissionNo: true,
    showPhone: true,
    showBloodGroup: true,
    showSession: true,
    showAddress: true,
    showSignatory: true,
    showSchoolCode: true,
  });

  // Filtered lists
  const filteredStudents = studentList.filter(s => {
    const classMatch = selectedClassId === "all" || s.classId === selectedClassId;
    const searchMatch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(search.toLowerCase())) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search));
    return classMatch && searchMatch;
  });

  const filteredStaff = staff.filter(st => {
    return !search.trim() ||
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      st.designation.toLowerCase().includes(search.toLowerCase()) ||
      st.phone.includes(search);
  });

  const currentList = activeTab === "students" ? filteredStudents : filteredStaff;

  const toggleSelectAll = () => {
    if (selectedIds.length === currentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSchoolDefaults = async () => {
    setSavingDefault(true);
    try {
      await updateSchool(school.id, {
        name: schoolDetails.schoolName,
        tagline: schoolDetails.tagline,
        address: schoolDetails.address,
        phone: schoolDetails.phone,
        mobile: schoolDetails.phone,
        email: schoolDetails.email,
        logoUrl: schoolDetails.logoUrl,
        principalName: schoolDetails.principalName,
        code: schoolDetails.code || school.code,
      });
      setSaveSuccessMsg("School details default profile mein save ho gaye!");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to save school defaults:", err);
    } finally {
      setSavingDefault(false);
    }
  };

  // Theme styling presets
  const themeStyles: Record<CardTheme, { headerBg: string; border: string; accent: string; badge: string; textAccent: string }> = {
    modern_indigo: {
      headerBg: "bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-900",
      border: "border-indigo-400",
      accent: "#4f46e5",
      badge: "bg-indigo-100 text-indigo-800",
      textAccent: "text-indigo-700",
    },
    royal_maroon: {
      headerBg: "bg-gradient-to-r from-red-800 via-rose-900 to-amber-950",
      border: "border-rose-400",
      accent: "#9f1239",
      badge: "bg-rose-100 text-rose-800",
      textAccent: "text-rose-700",
    },
    golden_dark: {
      headerBg: "bg-gradient-to-r from-slate-900 via-zinc-900 to-amber-950",
      border: "border-amber-500",
      accent: "#d97706",
      badge: "bg-amber-100 text-amber-900",
      textAccent: "text-amber-700",
    },
    emerald_green: {
      headerBg: "bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900",
      border: "border-emerald-400",
      accent: "#059669",
      badge: "bg-emerald-100 text-emerald-800",
      textAccent: "text-emerald-700",
    },
  };

  const currentTheme = themeStyles[theme];

  // Helper to render single ID Card
  // PRINT SAFE LAYOUT:
  // 1. QR Code on the LEFT with white protective boundary (No clipping!)
  // 2. Student Details in the CENTER (Auto-placed data)
  // 3. Student Photo on the RIGHT (No cutting, safe right margin)
  const renderCard = (item: any, isStaff: boolean) => {
    const className = !isStaff ? (classes.find(c => c.id === item.classId)?.name || "Class") : item.designation;

    const cleanStudentName = (item.name || "").slice(0, 32);
    const cleanSchoolId = school?.id || "";
    const cleanStudentId = item.id || "";
    const cleanRollNo = item.rollNo || item.employeeId || "";
    const cleanClassId = item.classId || "";

    // Ultra-compact QR code (~75-90 chars) for instant, blur-free camera scanning
    const qrVerifyUrl = `${window.location.origin}/?v=id&s=${cleanSchoolId}&u=${cleanStudentId}&r=${encodeURIComponent(cleanRollNo)}&c=${cleanClassId}&n=${encodeURIComponent(cleanStudentName)}#NSTA-SCHOOL:${cleanSchoolId}:${cleanStudentId}:${cleanRollNo}:${cleanClassId}`;
    const isLandscape = cardOrientation === "landscape";

    if (isLandscape) {
      // ──────────────────────────────────────────────────────────────────────────
      // LANDSCAPE CR80 ID CARD (85.6mm x 54mm)
      // PRINT SAFETY FIX:
      // - QR Code on the LEFT
      // - Auto-Placed Data in the CENTER
      // - Student Photo on the RIGHT
      // ──────────────────────────────────────────────────────────────────────────
      return (
        <div
          key={item.id}
          className={`w-[350px] min-h-[220px] max-h-[220px] bg-white rounded-xl shadow-lg border-2 ${currentTheme.border} flex flex-col relative print-card-box print:w-[85.6mm] print:h-[54mm] print:min-h-[54mm] print:max-h-[54mm] print:shadow-none print:m-1.5 print:break-inside-avoid print:inline-block overflow-hidden`}
          style={{ fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
        >
          {/* Top School Brand Header */}
          <div className={`${currentTheme.headerBg} px-2.5 py-1 text-white flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-1.5 min-w-0">
              {schoolDetails.logoUrl ? (
                <img src={schoolDetails.logoUrl} alt="Logo" className="w-5 h-5 rounded-full bg-white object-contain p-0.5 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[8.5px] text-white shrink-0">
                  {(schoolDetails.schoolName || "SC").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 leading-tight">
                <h3 className="font-black text-[10.5px] tracking-tight truncate max-w-[200px] text-white">
                  {schoolDetails.schoolName}
                </h3>
                <p className="text-[6.5px] text-indigo-100 truncate max-w-[200px]">
                  {schoolDetails.affiliation || schoolDetails.tagline || "Recognized Educational Institution"}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-1.5 py-0.5 rounded-sm bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-wider">
                {isStaff ? "STAFF ID" : "STUDENT ID"}
              </span>
              <p className="text-[6.5px] text-amber-200 font-bold mt-0.5 text-right">{schoolDetails.session || "2026-27"}</p>
            </div>
          </div>

          {/* Body: 3-Column Safe Layout (QR Left, Info Center, Pic Right) */}
          <div className="px-2.5 py-1.5 flex-1 flex items-center justify-between gap-2 bg-white">
            {/* 1. LEFT COLUMN: QR Code (Never cut off during print) */}
            <div className="flex flex-col items-center justify-center shrink-0 w-[62px]">
              <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs flex items-center justify-center">
                <QRCode value={qrVerifyUrl} size={50} level="M" />
              </div>
              <span className="text-[6.5px] font-black text-slate-600 uppercase tracking-tighter mt-0.5 flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 inline" /> Scan Verify
              </span>
              <span className="text-[6px] text-slate-500 font-mono font-bold">
                {item.admissionNo || item.rollNo || item.id.slice(0, 5)}
              </span>
            </div>

            {/* 2. CENTER COLUMN: Auto-Placed Student Details */}
            <div className="flex-1 min-w-0 text-[9.5px] leading-tight space-y-0.5">
              <div className="border-b border-slate-100 pb-0.5">
                <h4 className="font-black text-xs text-slate-900 truncate">{item.name}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full ${currentTheme.badge} uppercase tracking-wider`}>
                    {isStaff ? item.designation : className}
                  </span>
                  {fieldSettings.showBloodGroup && item.bloodGroup && (
                    <span className="text-[7.5px] font-black px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {item.bloodGroup}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[8.5px] text-slate-700 pt-0.5">
                {!isStaff ? (
                  <>
                    {fieldSettings.showRollNo && (
                      <p className="truncate">
                        <strong className="text-slate-400 font-bold">Roll:</strong>{" "}
                        <span className="font-black text-slate-900">#{item.rollNo || "—"}</span>
                      </p>
                    )}
                    {fieldSettings.showAdmissionNo && (
                      <p className="truncate">
                        <strong className="text-slate-400 font-bold">Adm:</strong>{" "}
                        <span className="font-bold text-slate-800">{item.admissionNo || "—"}</span>
                      </p>
                    )}
                    {fieldSettings.showFatherName && (
                      <p className="col-span-2 truncate">
                        <strong className="text-slate-400 font-bold">Father:</strong>{" "}
                        <span className="font-medium text-slate-800">{item.fatherName || "—"}</span>
                      </p>
                    )}
                    {fieldSettings.showPhone && (
                      <p className="col-span-2 truncate">
                        <strong className="text-slate-400 font-bold">Mobile:</strong>{" "}
                        <span className="font-medium text-slate-800">{item.phone || "—"}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="truncate">
                      <strong className="text-slate-400 font-bold">Emp ID:</strong>{" "}
                      <span className="font-black text-slate-900">{item.employeeId || item.id.slice(0, 5).toUpperCase()}</span>
                    </p>
                    <p className="truncate">
                      <strong className="text-slate-400 font-bold">Dept:</strong>{" "}
                      <span className="font-bold text-slate-800">{item.department || "Academic"}</span>
                    </p>
                    <p className="col-span-2 truncate">
                      <strong className="text-slate-400 font-bold">Contact:</strong>{" "}
                      <span className="font-medium text-slate-800">{item.phone || "—"}</span>
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 3. RIGHT COLUMN: Student Photo (Safe Right Edge) */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="w-[62px] h-[76px] rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center shadow-xs">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                    <User className="w-7 h-7" />
                    <span className="text-[6.5px] text-slate-400 mt-0.5 font-bold">Photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Card Footer: Address & Principal Signature */}
          <div className="px-2.5 py-0.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-600 shrink-0">
            <div className="truncate max-w-[200px] leading-tight">
              <span className="font-bold text-slate-700">{schoolDetails.address || "Main Campus"}</span>
              {schoolDetails.phone && <span className="ml-1 text-slate-500">• Ph: {schoolDetails.phone}</span>}
            </div>
            <div className="text-right shrink-0">
              <span className="font-serif italic font-bold text-slate-900 text-[7px]">
                {schoolDetails.principalName ? `${schoolDetails.principalName}` : "Principal"}
              </span>
              <p className="text-[5.5px] uppercase tracking-tighter text-slate-400">Auth. Signatory</p>
            </div>
          </div>
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PORTRAIT CR80 ID CARD (54mm x 85.6mm)
    // PRINT SAFETY FIX:
    // - Top header with Lanyard slot & school details
    // - QR Code on the LEFT & Student Photo on the RIGHT
    // - Center Auto-Placed Details
    // - Bottom Address & Principal Signature
    // ──────────────────────────────────────────────────────────────────────────
    return (
      <div
        key={item.id}
        className={`w-[260px] min-h-[390px] max-h-[390px] bg-white rounded-2xl shadow-xl border-2 ${currentTheme.border} flex flex-col relative print-card-box print:w-[54mm] print:h-[85.6mm] print:min-h-[85.6mm] print:max-h-[85.6mm] print:shadow-none print:m-1.5 print:break-inside-avoid print:inline-block overflow-hidden`}
        style={{ fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
      >
        {/* Lanyard Hole Guide */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-7 h-1.5 rounded-full bg-white/40 z-20 print:border print:border-slate-300"></div>

        {/* Header with School Branding */}
        <div className={`${currentTheme.headerBg} pt-3 pb-1.5 px-2 text-center text-white relative shrink-0`}>
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            {schoolDetails.logoUrl ? (
              <img src={schoolDetails.logoUrl} alt="Logo" className="w-5 h-5 rounded-full bg-white p-0.5 object-contain shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[8px] text-white shrink-0">
                {(schoolDetails.schoolName || "SC").slice(0, 2).toUpperCase()}
              </div>
            )}
            <h3 className="font-black text-[11px] tracking-tight leading-tight line-clamp-1">{schoolDetails.schoolName}</h3>
          </div>
          <p className="text-[6.5px] text-indigo-100 truncate mb-1">
            {schoolDetails.affiliation || schoolDetails.tagline || "Affiliated Educational Institution"}
          </p>
          <div className="inline-block px-2 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-widest">
            {isStaff ? "STAFF ID CARD" : "STUDENT ID CARD"} • {schoolDetails.session || "2026-27"}
          </div>
        </div>

        {/* Identity Row: QR on the LEFT and Photo on the RIGHT */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2 shrink-0 bg-white">
          {/* QR Code on LEFT */}
          <div className="flex flex-col items-center justify-center shrink-0 w-[68px]">
            <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs flex items-center justify-center">
              <QRCode value={qrVerifyUrl} size={56} level="M" />
            </div>
            <span className="text-[7px] text-slate-600 font-black uppercase tracking-tighter mt-0.5">
              Scan Verify
            </span>
            <span className="text-[6.5px] text-slate-500 font-mono font-bold">
              {item.admissionNo || item.rollNo || item.id.slice(0, 5)}
            </span>
          </div>

          {/* Student Photo on RIGHT */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="w-[66px] h-[78px] rounded-xl border-2 border-slate-200 overflow-hidden shadow-xs bg-slate-50 flex items-center justify-center">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-100">
                  <User className="w-8 h-8" />
                  <span className="text-[6.5px] text-slate-400 mt-0.5 font-bold">No Photo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student Name & Designation Band */}
        <div className="px-3 py-1 text-center bg-slate-50/70 border-y border-slate-100 shrink-0">
          <h2 className="text-xs font-black text-slate-900 leading-tight truncate">
            {item.name}
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className={`text-[8.5px] font-black px-2 py-0.2 rounded-full ${currentTheme.badge}`}>
              {isStaff ? item.designation : className}
            </span>
            {fieldSettings.showBloodGroup && item.bloodGroup && (
              <span className="text-[7.5px] font-black px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Blood: {item.bloodGroup}
              </span>
            )}
          </div>
        </div>

        {/* Auto-Placed Details Table */}
        <div className="px-3 py-1 flex-1 text-[9px] text-slate-700 space-y-0.5 leading-tight overflow-hidden">
          {!isStaff ? (
            <>
              {fieldSettings.showRollNo && (
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span className="text-slate-400 font-bold">Roll No:</span>
                  <span className="font-black text-slate-900">{item.rollNo || "—"}</span>
                </div>
              )}
              {fieldSettings.showAdmissionNo && (
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span className="text-slate-400 font-bold">Admission No:</span>
                  <span className="font-bold text-slate-800">{item.admissionNo || "—"}</span>
                </div>
              )}
              {fieldSettings.showFatherName && (
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span className="text-slate-400 font-bold">Father's Name:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[120px]">{item.fatherName || "—"}</span>
                </div>
              )}
              {fieldSettings.showPhone && (
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span className="text-slate-400 font-bold">Mobile:</span>
                  <span className="font-bold text-slate-800">{item.phone || "—"}</span>
                </div>
              )}
              {fieldSettings.showSession && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Academic Session:</span>
                  <span className="font-black text-emerald-700">{schoolDetails.session || "2026-27"}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between border-b border-slate-100 pb-0.5">
                <span className="text-slate-400 font-bold">Emp ID:</span>
                <span className="font-black text-slate-900">{item.employeeId || item.id.slice(0, 5).toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-0.5">
                <span className="text-slate-400 font-bold">Department:</span>
                <span className="font-bold text-slate-800">{item.department || "Academic"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-0.5">
                <span className="text-slate-400 font-bold">Contact:</span>
                <span className="font-bold text-slate-800">{item.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Valid Till:</span>
                <span className="font-black text-emerald-700">{schoolDetails.session || "2026-27"}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer: Campus Address & Principal Signature */}
        <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-600 shrink-0 mt-auto">
          <div className="truncate max-w-[140px] leading-tight">
            <span className="font-bold text-slate-700 truncate block">{schoolDetails.address || "Campus Address"}</span>
            <span className="text-slate-400 text-[6px]">Reg: {schoolDetails.code || "SCH-001"}</span>
          </div>
          <div className="text-right shrink-0">
            <span className="font-serif italic font-black text-slate-900 text-[7.5px] block">
              {schoolDetails.principalName || "Principal"}
            </span>
            <span className="text-[6px] text-slate-400 uppercase tracking-tighter">Sign &amp; Seal</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Print Safe CSS: prevents clipping, keeps QR code & student picture within page margins */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 6mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden, .print\\:hidden {
            display: none !important;
          }
          .print-card-box {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            margin: 3mm !important;
            display: inline-block !important;
          }
          #pre-react-splash {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 px-4 py-3.5 text-white shadow-lg sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick School Details button */}
            <button
              onClick={() => setShowQuickSchoolEditor(!showQuickSchoolEditor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                showQuickSchoolEditor ? "bg-amber-500 text-slate-950 font-black" : "bg-white/15 hover:bg-white/25 text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏫 School Details Likhein</span>
              {showQuickSchoolEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Smart Auto Data Fit toggle */}
            <button
              onClick={() => setShowAutoMappingOptions(!showAutoMappingOptions)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                autoDataMapping ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"
              }`}
              title="Card mein data automatically sahi jagah fit ho jata hai"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Auto-Fit Data: {autoDataMapping ? "ON" : "OFF"}</span>
            </button>

            {/* Orientation Switcher */}
            <button
              onClick={() => setCardOrientation(prev => prev === "landscape" ? "portrait" : "landscape")}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-indigo-700/80 hover:bg-indigo-600 text-white transition-all shadow-xs"
              title="Card shape badlein"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{cardOrientation === "landscape" ? "Landscape (CR80)" : "Portrait (CR80)"}</span>
            </button>

            {/* Bulk vs Single */}
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bulkMode ? "bg-amber-500 text-slate-950 font-black shadow" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> {bulkMode ? "Single Mode" : "Bulk Print (Sheet)"}
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow active:scale-95 transition-transform"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-5 print:p-0">
        {/* Success toast notification */}
        {saveSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow print:hidden animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* 1. Quick School Details Inline Editor Drawer */}
        {showQuickSchoolEditor && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-indigo-200 dark:border-indigo-900 mb-6 print:hidden animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    School Details Likhne Ka Form (Live Card Updates)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Yahan se school details likhein, card me sabhi jagah apne aap fit ho jayenge.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSchoolHeaderModal(true)}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" /> Full Modal
                </button>
                <button
                  onClick={handleSaveSchoolDefaults}
                  disabled={savingDefault}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Save className="w-3 h-3" /> {savingDefault ? "Saving..." : "Save Default"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  School Ka Naam *
                </label>
                <input
                  type="text"
                  value={schoolDetails.schoolName}
                  onChange={e => setSchoolDetails(p => ({ ...p, schoolName: e.target.value }))}
                  placeholder="e.g. National Academy"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tagline / Board Line
                </label>
                <input
                  type="text"
                  value={schoolDetails.affiliation}
                  onChange={e => setSchoolDetails(p => ({ ...p, affiliation: e.target.value }))}
                  placeholder="e.g. Affiliated to CBSE / State Board"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  School Code / Reg No
                </label>
                <input
                  type="text"
                  value={schoolDetails.code}
                  onChange={e => setSchoolDetails(p => ({ ...p, code: e.target.value }))}
                  placeholder="e.g. SCH-001"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Academic Session (Year)
                </label>
                <input
                  type="text"
                  value={schoolDetails.session}
                  onChange={e => setSchoolDetails(p => ({ ...p, session: e.target.value }))}
                  placeholder="e.g. 2026-27"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  School Address (Print footer me aayega)
                </label>
                <input
                  type="text"
                  value={schoolDetails.address}
                  onChange={e => setSchoolDetails(p => ({ ...p, address: e.target.value }))}
                  placeholder="e.g. Main Campus, Road No 4, Patna, Bihar"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Helpline / Mobile Number
                </label>
                <input
                  type="text"
                  value={schoolDetails.phone}
                  onChange={e => setSchoolDetails(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Principal / Head Signatory Name
                </label>
                <input
                  type="text"
                  value={schoolDetails.principalName}
                  onChange={e => setSchoolDetails(p => ({ ...p, principalName: e.target.value }))}
                  placeholder="e.g. Dr. Rajeshwar Sharma"
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Logo direct upload */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">School Logo:</span>
                <DirectUploadButton
                  kind="image"
                  compact
                  currentUrl={schoolDetails.logoUrl}
                  onUploaded={url => setSchoolDetails(p => ({ ...p, logoUrl: url }))}
                  onClear={() => setSchoolDetails(p => ({ ...p, logoUrl: "" }))}
                  label="Upload Logo Image"
                />
                {schoolDetails.logoUrl && (
                  <img src={schoolDetails.logoUrl} alt="Logo preview" className="w-6 h-6 rounded-full object-cover border" />
                )}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ Ye details sabhi cards pe live reflect ho rahi hain!
              </p>
            </div>
          </div>
        )}

        {/* 2. Auto-Data Mapping Customizer Drawer */}
        {showAutoMappingOptions && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-300 dark:border-emerald-800 mb-6 print:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                  ⚡ Smart Auto-Data Mapping (Apne Aap Fit Hone Ka Option)
                </h4>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDataMapping}
                  onChange={e => setAutoDataMapping(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                  Auto-Placement Enable Rakhein
                </span>
              </label>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mb-3">
              Jab ye option active hota hai, har student ka <strong>Name, Roll No, Adm No, Father Name, Mobile, Blood Group</strong> card ke center me, <strong>QR Code LEFT me</strong> aur <strong>Photo RIGHT me</strong> automatically map ho jata hai!
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-900">
              {Object.entries({
                showRollNo: "Roll Number",
                showAdmissionNo: "Admission Number",
                showFatherName: "Father's Name",
                showPhone: "Mobile / Phone",
                showBloodGroup: "Blood Group",
                showSession: "Academic Session",
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs">
                  <input
                    type="checkbox"
                    checked={fieldSettings[key as keyof typeof fieldSettings]}
                    onChange={e => setFieldSettings(p => ({ ...p, [key]: e.target.checked }))}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Controls bar (hidden in print) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-indigo-600" />
                QR Code ID Card Generator
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Print ke dauran katne se bachne ke liye <strong>QR Code LEFT me</strong> aur <strong>Photo RIGHT me</strong> set hai.
              </p>
            </div>

            {/* Tab selection: Students vs Staff */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
              <button
                onClick={() => { setActiveTab("students"); setSelectedIds([]); }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  activeTab === "students" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                🎓 Students ({studentList.length})
              </button>
              <button
                onClick={() => { setActiveTab("staff"); setSelectedIds([]); }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  activeTab === "staff" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                👨‍🏫 Staff ({staff?.length || 0})
              </button>
            </div>
          </div>

          {/* Theme and Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t dark:border-slate-700">
            {/* Theme Picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Card Theme:</span>
              {(["modern_indigo", "royal_maroon", "golden_dark", "emerald_green"] as CardTheme[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                    theme === t
                      ? "ring-2 ring-indigo-500 bg-slate-200 dark:bg-slate-700 font-bold"
                      : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Search and Class Filter */}
            <div className="flex items-center gap-2">
              {activeTab === "students" && (
                <>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border-0"
                  >
                    <option value="all">Sabhi Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    title="Naya student turant add karein"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Student Data
                  </button>
                </>
              )}
              <input
                type="text"
                placeholder="Search name, roll, adm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border-0 w-44"
              />
            </div>
          </div>
        </div>

        {/* Notice Badge for Print Safety */}
        <div className="mb-4 p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Print Safety Active:</strong> QR Code baayein (left) taraf aur student ka photo daayein (right) taraf safe margins ke sath fit hai taaki print karne par koi bhi detail na kate!
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border">
              Orientation: {cardOrientation.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bulk Mode View vs Single Live Preview */}
        {bulkMode ? (
          <div>
            {/* Bulk Toolbar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {selectedIds.length === currentList.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectedIds.length === currentList.length ? "Deselect All" : "Select All"} ({currentList.length})
                </button>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {selectedIds.length > 0 ? `${selectedIds.length} cards ready to print` : "Print ke liye cards select karein"}
                </span>
              </div>
              <button
                onClick={handlePrint}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Selected ({selectedIds.length || currentList.length})
              </button>
            </div>

            {/* A4 Sheet Print Grid with Cut Guides */}
            <div
              ref={printAreaRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center print:block print:w-full"
            >
              {(selectedIds.length > 0 ? currentList.filter(item => selectedIds.includes(item.id)) : currentList).map(item => (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-lg shadow text-indigo-600 hover:scale-110 transition-transform print:hidden"
                  >
                    {selectedIds.includes(item.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                  </button>
                  {renderCard(item, activeTab === "staff")}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Single Card Live Studio */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Student/Staff Selector List */}
            <div className="md:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm space-y-2 max-h-[550px] overflow-y-auto print:hidden">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Card Chunne ke liye click karein:
              </p>
              {currentList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Koi record nahi mila. Pehle student ya staff add karein.
                </div>
              ) : (
                currentList.map(item => {
                  const isSelected = activeTab === "students"
                    ? selectedStudent?.id === item.id
                    : selectedStaff?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => activeTab === "students" ? setSelectedStudent(item) : setSelectedStaff(item)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/30 shadow-sm"
                          : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 overflow-hidden">
                          {item.photoUrl ? (
                            <img src={item.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            item.name.slice(0, 1)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            {activeTab === "students" ? `Roll: #${item.rollNo || "—"} • Adm: ${item.admissionNo || "—"}` : item.designation}
                          </p>
                        </div>
                      </div>
                      <Eye className={`w-4 h-4 ${isSelected ? "text-indigo-600" : "text-slate-300"}`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Column: Live Printable Preview */}
            <div className="md:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="mb-4 text-center print:hidden flex items-center gap-2 flex-wrap justify-center">
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full uppercase tracking-wider">
                  Live Card Preview (CR80 Standard Dimensions)
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ✓ QR: Left | Photo: Right
                </span>
              </div>

              {(activeTab === "students" ? selectedStudent : selectedStaff) ? (
                <>
                  <div className="p-3 bg-white/70 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    {renderCard(activeTab === "students" ? selectedStudent : selectedStaff, activeTab === "staff")}
                  </div>

                  <div className="mt-5 flex gap-3 print:hidden flex-wrap justify-center">
                    <button
                      onClick={handlePrint}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-transform"
                    >
                      <Printer className="w-4 h-4" /> Is Card ko Print Karein
                    </button>
                    <button
                      onClick={() => setShowQuickSchoolEditor(true)}
                      className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-indigo-500" /> School Details Edit
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-slate-400 text-sm">
                  Koi record select nahi hai.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSchoolHeaderModal && (
        <SchoolHeaderEditorModal
          isOpen={true}
          school={school}
          schoolId={school.id}
          currentDetails={schoolDetails}
          initialDetails={schoolDetails}
          onClose={() => setShowSchoolHeaderModal(false)}
          onApply={(updated) => setSchoolDetails(p => ({ ...p, ...updated }))}
          onSave={(updated) => setSchoolDetails(p => ({ ...p, ...updated }))}
        />
      )}

      {showAddStudentModal && (
        <QuickAddStudentModal
          schoolId={school.id}
          classes={classes}
          defaultClassId={selectedClassId === "all" ? classes[0]?.id : selectedClassId}
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={(newStu) => {
            setStudentList(prev => [newStu, ...prev]);
            setSelectedStudent(newStu);
          }}
        />
      )}
    </div>
  );
};
