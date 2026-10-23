// @ts-nocheck
import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";
import type { School, SchoolClass, SchoolStudent, StaffEmployee } from "../../school-types";
import {
  CreditCard, Printer, Download, Eye, ChevronLeft, User, Phone, MapPin,
  Calendar, Award, Sparkles, Filter, CheckSquare, Square, Layers, RefreshCw
} from "lucide-react";

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
  classes,
  students,
  staff,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"students" | "staff">("students");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(students[0] || null);
  const [selectedStaff, setSelectedStaff] = useState<StaffEmployee | null>(staff[0] || null);
  const [theme, setTheme] = useState<CardTheme>("modern_indigo");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cardOrientation, setCardOrientation] = useState<"portrait" | "landscape">("portrait");
  const [printLayout, setPrintLayout] = useState<"pvc_exact" | "a4_grid">("pvc_exact");
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Filtered lists
  const filteredStudents = students.filter(s => {
    const classMatch = selectedClassId === "all" || s.classId === selectedClassId;
    const searchMatch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(search.toLowerCase())) ||
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

  // Theme styling presets
  const themeStyles: Record<CardTheme, { headerBg: string; border: string; accent: string; badge: string }> = {
    modern_indigo: {
      headerBg: "bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-900",
      border: "border-indigo-400",
      accent: "#4f46e5",
      badge: "bg-indigo-100 text-indigo-800",
    },
    royal_maroon: {
      headerBg: "bg-gradient-to-r from-red-800 via-rose-900 to-amber-950",
      border: "border-rose-400",
      accent: "#9f1239",
      badge: "bg-rose-100 text-rose-800",
    },
    golden_dark: {
      headerBg: "bg-gradient-to-r from-slate-900 via-zinc-900 to-amber-950",
      border: "border-amber-500",
      accent: "#d97706",
      badge: "bg-amber-100 text-amber-900",
    },
    emerald_green: {
      headerBg: "bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900",
      border: "border-emerald-400",
      accent: "#059669",
      badge: "bg-emerald-100 text-emerald-800",
    },
  };

  const currentTheme = themeStyles[theme];

  // Helper to render single ID Card (Standard CR80 / PVC pocket badge size)
  const renderCard = (item: any, isStaff: boolean) => {
    const className = !isStaff ? (classes.find(c => c.id === item.classId)?.name || "Class") : item.designation;

    const verifiedPayload = {
      type: "idcard",
      officialVerified: true,
      school: school.name,
      schoolCode: school.code || "SCH-001",
      id: item.id,
      student: item.name,
      roll: item.rollNo || item.employeeId || "",
      regNo: item.admissionNo || `ADM-${item.rollNo || "01"}`,
      class: className,
      phone: item.phone || "",
      photoUrl: item.photoUrl || "",
      fatherName: item.fatherName || "",
      bloodGroup: item.bloodGroup || "B+",
      role: isStaff ? "STAFF" : "STUDENT",
    };

    // Live verification link for normal phone cameras
    const qrVerifyUrl = `${window.location.origin}/?verify=doc&type=idcard&data=${encodeURIComponent(JSON.stringify(verifiedPayload))}`;

    const isLandscape = cardOrientation === "landscape";

    if (isLandscape) {
      // Landscape CR80 Pocket Card (85.6mm x 54mm)
      return (
        <div
          key={item.id}
          className={`w-[340px] h-[216px] bg-white rounded-xl shadow-lg overflow-hidden border-2 ${currentTheme.border} flex flex-col relative print:w-[85.6mm] print:h-[54mm] print:shadow-none print:m-1.5 print:break-inside-avoid print:inline-block`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className={`${currentTheme.headerBg} px-3 py-1.5 text-white flex items-center justify-between`}>
            <div className="flex items-center gap-1.5">
              {school.logoUrl ? (
                <img src={school.logoUrl} alt="Logo" className="w-5 h-5 rounded-full bg-white object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[9px] text-white">
                  {school.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <h3 className="font-black text-xs tracking-tight truncate max-w-[170px]">{school.name}</h3>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-300">
              {isStaff ? "STAFF ID" : "STUDENT ID"}
            </span>
          </div>

          {/* Body */}
          <div className="p-2.5 flex-1 flex gap-3 items-center">
            {/* Photo */}
            <div className="w-16 h-20 rounded-lg border border-slate-300 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center shadow-xs">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-[10px] space-y-0.5 leading-tight">
              <h4 className="font-black text-xs text-slate-900 truncate">{item.name}</h4>
              <p className="font-bold text-indigo-700 text-[9.5px]">
                {isStaff ? item.designation : `${className} | Roll: #${item.rollNo || "—"}`}
              </p>
              <p className="text-slate-600 truncate"><strong>Adm No:</strong> {item.admissionNo || "—"}</p>
              {!isStaff && <p className="text-slate-600 truncate"><strong>Father:</strong> {item.fatherName || "—"}</p>}
              <p className="text-slate-600"><strong>Ph:</strong> {item.phone || "—"}</p>
              <p className="text-[8.5px] font-bold text-emerald-700">Valid: 2026-27</p>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="p-0.5 bg-white border border-slate-300 rounded shadow-2xs">
                <QRCode value={qrVerifyUrl} size={42} level="M" />
              </div>
              <span className="text-[6.5px] text-slate-400 mt-0.5 font-bold">Verify</span>
            </div>
          </div>

          <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7.5px] text-slate-500">
            <span>{school.address || "Recognized Institution"}</span>
            <span className="font-serif italic font-bold text-indigo-900">Principal Sign</span>
          </div>
        </div>
      );
    }

    // Standard Portrait PVC Lanyard Badge (54mm x 85.6mm)
    return (
      <div
        key={item.id}
        className={`w-[260px] h-[390px] bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${currentTheme.border} flex flex-col relative print:w-[54mm] print:h-[85.6mm] print:shadow-none print:m-1.5 print:break-inside-avoid print:inline-block`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Lanyard Hole Guide */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-white/40 z-20 print:border print:border-slate-300"></div>

        {/* Header with School Branding */}
        <div className={`${currentTheme.headerBg} pt-3 pb-2 px-2.5 text-center text-white relative`}>
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="Logo" className="w-6 h-6 rounded-full bg-white p-0.5 object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-black text-[9px] text-white">
                {school.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h3 className="font-black text-xs tracking-tight leading-tight line-clamp-1">{school.name}</h3>
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[8px] font-black uppercase tracking-widest text-amber-300">
            {isStaff ? "STAFF ID CARD" : "STUDENT ID CARD"}
          </div>
        </div>

        {/* Photo and Name */}
        <div className="flex flex-col items-center pt-2 pb-1.5 px-3">
          <div className="w-18 h-22 rounded-xl border-2 border-slate-200 overflow-hidden shadow-xs bg-slate-50 flex items-center justify-center">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-100">
                <User className="w-10 h-10" />
                <span className="text-[8px] text-slate-400 mt-0.5 font-bold">No Photo</span>
              </div>
            )}
          </div>
          <h2 className="text-sm font-black text-slate-900 mt-1 text-center leading-tight line-clamp-1">
            {item.name}
          </h2>
          <span className={`text-[9px] font-black px-2 py-0.2 rounded-full mt-0.5 ${currentTheme.badge}`}>
            {isStaff ? item.designation : className}
          </span>
        </div>

        {/* Details Table */}
        <div className="px-3 py-1.5 flex-1 text-[10px] text-slate-700 space-y-0.5 bg-slate-50/70 mx-2.5 rounded-xl border border-slate-100 leading-tight">
          {!isStaff ? (
            <>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="text-slate-400 font-bold">Roll No:</span>
                <span className="font-black text-slate-900">{item.rollNo || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="text-slate-400 font-bold">Adm No:</span>
                <span className="font-bold text-slate-800">{item.admissionNo || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="text-slate-400 font-bold">Father:</span>
                <span className="font-bold text-slate-800 truncate max-w-[110px]">{item.fatherName || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="text-slate-400 font-bold">Phone:</span>
                <span className="font-bold text-slate-800">{item.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Valid:</span>
                <span className="font-black text-emerald-700">2026-27</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="text-slate-400 font-bold">Emp ID:</span>
                <span className="font-black text-slate-900">{item.employeeId || item.id.slice(0, 5).toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="text-slate-400 font-bold">Dept:</span>
                <span className="font-bold text-slate-800">{item.department || "Academic"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span className="text-slate-400 font-bold">Phone:</span>
                <span className="font-bold text-slate-800">{item.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Join:</span>
                <span className="font-bold text-slate-800">{item.joinDate || "—"}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer with QR Code and Principal Signature */}
        <div className="p-2 bg-white flex items-center justify-between border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-1.5">
            <div className="p-0.5 bg-white border border-slate-200 rounded shadow-2xs">
              <QRCode value={qrVerifyUrl} size={36} level="M" />
            </div>
            <div className="text-[7px] text-slate-400 leading-tight">
              <p className="font-bold text-slate-600">Scan to Verify</p>
              <p>Official Smart ID</p>
            </div>
          </div>
          <div className="text-right">
            <div className="w-12 h-4 border-b border-slate-400 mb-0.5 flex items-end justify-center">
              <span className="text-[6.5px] italic text-indigo-700 font-serif font-black">Principal</span>
            </div>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">Sign &amp; Seal</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bulkMode ? "bg-amber-500 text-white shadow" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> {bulkMode ? "Single Mode" : "Bulk Print (A4 Sheet)"}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow active:scale-95 transition-transform"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-5 print:p-0">
        {/* Controls bar (hidden in print) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-indigo-600" />
                QR Code ID Card Generator
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Live QR Code ke saath Student aur Staff ke smart ID cards generate aur print karein.
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
                🎓 Students ({students.length})
              </button>
              <button
                onClick={() => { setActiveTab("staff"); setSelectedIds([]); }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  activeTab === "staff" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                👨‍🏫 Staff ({staff.length})
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
              )}
              <input
                type="text"
                placeholder="Search name, roll..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border-0 w-44"
              />
            </div>
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
                <Printer className="w-3.5 h-3.5" /> Print Selected Cards
              </button>
            </div>

            {/* A4 Sheet Print Grid */}
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
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                          {item.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            {activeTab === "students" ? `Roll: ${item.rollNo || "—"}` : item.designation}
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
              <div className="mb-4 text-center print:hidden">
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full uppercase tracking-wider">
                  Live Card Preview (CR80 Standard Dimensions)
                </span>
              </div>

              {(activeTab === "students" ? selectedStudent : selectedStaff) ? (
                <>
                  {renderCard(activeTab === "students" ? selectedStudent : selectedStaff, activeTab === "staff")}
                  <div className="mt-5 flex gap-3 print:hidden">
                    <button
                      onClick={handlePrint}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-transform"
                    >
                      <Printer className="w-4 h-4" /> Is Card ko Print Karein
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
    </div>
  );
};
