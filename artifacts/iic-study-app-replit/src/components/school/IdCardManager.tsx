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

  // Helper to render single ID Card
  const renderCard = (item: any, isStaff: boolean) => {
    const className = !isStaff ? (classes.find(c => c.id === item.classId)?.name || "Class") : item.designation;
    const qrData = JSON.stringify({
      school: school.name,
      id: item.id,
      name: item.name,
      role: isStaff ? "STAFF" : "STUDENT",
      rollNo: item.rollNo || item.employeeId || "",
      phone: item.phone || "",
      verified: true
    });

    return (
      <div
        key={item.id}
        className={`w-[320px] h-[480px] bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${currentTheme.border} flex flex-col relative print:shadow-none print:m-2 print:break-inside-avoid print:inline-block`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header with School Branding */}
        <div className={`${currentTheme.headerBg} p-3.5 text-center text-white relative`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="Logo" className="w-8 h-8 rounded-full bg-white p-0.5 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs text-white">
                {school.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h3 className="font-black text-sm tracking-wide leading-tight line-clamp-1">{school.name}</h3>
          </div>
          {school.address && (
            <p className="text-[9px] text-white/80 line-clamp-1 px-2">{school.address}</p>
          )}
          <div className="mt-1 inline-block px-3 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-widest text-amber-300">
            {isStaff ? "STAFF IDENTITY CARD" : "STUDENT IDENTITY CARD"}
          </div>
        </div>

        {/* Photo and Badges */}
        <div className="flex flex-col items-center pt-3 pb-2 px-4">
          <div className="w-24 h-28 rounded-xl border-2 border-slate-200 overflow-hidden shadow-md bg-slate-50 flex items-center justify-center">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-100">
                <User className="w-12 h-12" />
                <span className="text-[9px] text-slate-400 mt-1 font-bold">No Photo</span>
              </div>
            )}
          </div>
          <h2 className="text-base font-black text-slate-900 mt-2 text-center leading-tight line-clamp-1">
            {item.name}
          </h2>
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full mt-1 ${currentTheme.badge}`}>
            {isStaff ? item.designation : className}
          </span>
        </div>

        {/* Details Table */}
        <div className="px-4 py-2 flex-1 text-[11px] text-slate-700 space-y-1 bg-slate-50/60 mx-3 rounded-xl border border-slate-100">
          {!isStaff ? (
            <>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-bold">Roll No:</span>
                <span className="font-black text-slate-900">{item.rollNo || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-bold">Admission No:</span>
                <span className="font-bold text-slate-800">{item.admissionNo || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-bold">Father's Name:</span>
                <span className="font-bold text-slate-800 truncate max-w-[150px]">{item.fatherName || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-bold">Contact:</span>
                <span className="font-bold text-slate-800">{item.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Valid Till:</span>
                <span className="font-black text-emerald-700">2026-27</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-bold">Employee ID:</span>
                <span className="font-black text-slate-900">{item.employeeId || item.id.slice(0, 6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-bold">Department:</span>
                <span className="font-bold text-slate-800">{item.department || "Academic"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-bold">Phone:</span>
                <span className="font-bold text-slate-800">{item.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Join Date:</span>
                <span className="font-bold text-slate-800">{item.joinDate || "—"}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer with QR Code and Principal Signature */}
        <div className="p-3 bg-white flex items-center justify-between border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
              <QRCode value={qrData} size={48} level="M" />
            </div>
            <div className="text-[8px] text-slate-400 leading-tight">
              <p className="font-bold text-slate-600">Scan to Verify</p>
              <p>Official School ID</p>
            </div>
          </div>
          <div className="text-right">
            <div className="w-16 h-6 border-b border-slate-400 mb-0.5 flex items-end justify-center">
              <span className="text-[7px] italic text-indigo-700 font-serif font-black">Principal</span>
            </div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Authorized Sign</p>
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
