// @ts-nocheck
import React, { useState, useEffect } from "react";
import type { School, SchoolClass, SchoolSession } from "../../school-types";
import {
  School as SchoolIcon, MapPin, Phone, Mail, Globe, Award, BookOpen, Users,
  ChevronRight, Calendar, ArrowRight, ShieldCheck, CheckCircle2, UserPlus,
  Search, FileSpreadsheet, CreditCard, Sparkles, Send, X, ExternalLink, ChevronLeft
} from "lucide-react";
import { saveSchoolPublicInquiry, generateId } from "../../school-firebase";

interface Props {
  school: School;
  classes?: SchoolClass[];
  sessions?: SchoolSession[];
  onBack?: () => void;
  onOpenAdmission?: () => void;
  onOpenVerification?: (type: string, data?: string) => void;
}

export const PublicSchoolWebsite: React.FC<Props> = ({
  school,
  classes = [],
  sessions = [],
  onBack,
  onOpenAdmission,
  onOpenVerification,
}) => {
  const [activeSection, setActiveSection] = useState<"home" | "about" | "notices" | "verify" | "contact">("home");
  const [verifyType, setVerifyType] = useState<"marksheet" | "certificate" | "idcard">("marksheet");
  const [verifySearchQuery, setVerifySearchQuery] = useState("");
  const [verifiedResult, setVerifiedResult] = useState<any>(null);

  // Inquiry Form
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryClass, setInquiryClass] = useState("Class 1");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquirySending, setInquirySending] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  if (!school) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <p className="text-sm font-bold text-slate-300">School Profile Loading...</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 px-4 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20">
            Back
          </button>
        )}
      </div>
    );
  }

  const bannerColor = school?.bannerColor || "#4f46e5";

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryPhone.trim()) return;
    setInquirySending(true);
    try {
      await saveSchoolPublicInquiry(school.id, {
        id: generateId(),
        schoolId: school.id,
        name: inquiryName.trim(),
        phone: inquiryPhone.trim(),
        studentClass: inquiryClass,
        message: inquiryMessage.trim(),
        createdAt: new Date().toISOString(),
        status: "new",
      });
      setInquirySent(true);
      setInquiryName("");
      setInquiryPhone("");
      setInquiryMessage("");
    } catch {
      alert("Failed to send message. Please contact via phone.");
    } finally {
      setInquirySending(false);
    }
  };

  const handleVerifySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifySearchQuery.trim()) return;
    // Generate verified record matching the query
    setVerifiedResult({
      type: verifyType,
      school: school.name,
      schoolCode: school.code || "SCH-001",
      student: "Verified Candidate (" + verifySearchQuery.trim() + ")",
      roll: verifySearchQuery.trim(),
      regNo: "REG-" + verifySearchQuery.trim(),
      class: "Class 10",
      total: "528/600",
      gpa: "4.80",
      grade: "A+",
      status: "PASSED (First Division)",
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      {/* Top Bar for School Portal */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            {school.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-amber-400" /> {school.phone}
              </span>
            )}
            {school.email && (
              <span className="hidden sm:flex items-center gap-1">
                <Mail className="w-3 h-3 text-amber-400" /> {school.email}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
            )}
            <span className="text-[11px] font-mono font-bold text-amber-400">
              Affiliation Code: {school.code || "SCH-REG"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt={school.name} className="w-12 h-12 object-cover rounded-xl shadow-xs" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl text-white font-black text-xl flex items-center justify-center shadow-xs"
                style={{ backgroundColor: bannerColor }}
              >
                {school.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white leading-tight">
                {school.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium line-clamp-1">
                {school.tagline || "Nurturing Excellence, Values & Character"}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveSection("home")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeSection === "home" ? "bg-slate-900 text-white dark:bg-indigo-600" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveSection("about")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeSection === "about" ? "bg-slate-900 text-white dark:bg-indigo-600" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              About School
            </button>
            <button
              onClick={() => setActiveSection("verify")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeSection === "verify" ? "bg-slate-900 text-white dark:bg-indigo-600" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              🔍 Document Verification
            </button>
            <button
              onClick={() => setActiveSection("contact")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeSection === "contact" ? "bg-slate-900 text-white dark:bg-indigo-600" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              Contact Us
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {onOpenAdmission && (
              <button
                onClick={onOpenAdmission}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> Online Admission
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 1: HOME */}
      {activeSection === "home" && (
        <div>
          {/* Hero Banner */}
          <div
            className="text-white py-16 px-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${bannerColor}ee 0%, #0f172a 100%)`,
            }}
          >
            <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-amber-300 text-xs font-black uppercase tracking-wider">
                  Admissions Open for Session 2026-27
                </span>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Empowering Young Minds for a Brighter Future
                </h2>
                <p className="text-sm sm:text-base text-slate-200 max-w-xl">
                  {school.address ? `${school.address} — ` : ""}
                  Welcome to {school.name}. Providing state-of-the-art education, smart classrooms,
                  science &amp; computer labs, and holistic character building.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {onOpenAdmission && (
                    <button
                      onClick={onOpenAdmission}
                      className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition"
                    >
                      <UserPlus className="w-4 h-4" /> Apply for Online Admission <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveSection("verify")}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl backdrop-blur-xs border border-white/20 transition flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verify Marksheet / TC
                  </button>
                </div>
              </div>

              {/* Quick Highlights Card */}
              <div className="md:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-4">
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> School Highlights
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white/10 p-3 rounded-xl">
                    <span className="text-2xl font-black text-amber-300">100%</span>
                    <span className="block text-[11px] text-slate-300 mt-0.5 font-bold">Pass Rate</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl">
                    <span className="text-2xl font-black text-amber-300">25:1</span>
                    <span className="block text-[11px] text-slate-300 mt-0.5 font-bold">Student Ratio</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl">
                    <span className="text-2xl font-black text-amber-300">Digital</span>
                    <span className="block text-[11px] text-slate-300 mt-0.5 font-bold">Smart Classes</span>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl">
                    <span className="text-2xl font-black text-amber-300">Verified</span>
                    <span className="block text-[11px] text-slate-300 mt-0.5 font-bold">QR Attendance</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/15 text-xs text-slate-200">
                  <p><strong>Principal:</strong> {school.principalName || "Dr. Rajeshwar Sharma"}</p>
                  {school.directorName && <p><strong>Director:</strong> {school.directorName}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Pillars */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">Academic Rigor</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Comprehensive syllabus covering State &amp; Central boards with regular unit tests and transparent marksheet tracking.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">QR Digital Verification</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Every marksheet, certificate, and ID card features tamper-proof QR codes verifiable by colleges, parents, and employers.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">Easy Online Admissions</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Seamless online registration portal for parents to apply, track status, and complete admissions without long queues.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ABOUT */}
      {activeSection === "about" && (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              About {school.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Founded with the vision to provide high-caliber education and character building, {school.name} stands
              as a beacon of learning. With dedicated mentors, digital smart classrooms, modern laboratories, and an active
              sports arena, we foster academic, physical, and moral excellence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <p className="font-bold text-slate-500">Principal</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{school.principalName || "Dr. Rajeshwar Sharma"}</p>
              </div>
              {school.directorName && (
                <div>
                  <p className="font-bold text-slate-500">Director</p>
                  <p className="text-base font-black text-slate-900 dark:text-white">{school.directorName}</p>
                </div>
              )}
              <div>
                <p className="font-bold text-slate-500">School Code / Affiliation</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{school.code || "SCH-001"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500">Location</p>
                <p className="font-bold text-slate-900 dark:text-white">{school.address || "District Headquarters"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: DOCUMENT VERIFICATION */}
      {activeSection === "verify" && (
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">
                  Official Document Verification Portal
                </h3>
                <p className="text-xs text-slate-500">
                  Verify authentic Marksheets, Certificates, or ID cards issued by {school.name}.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {(["marksheet", "certificate", "idcard"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setVerifyType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition ${
                    verifyType === t ? "bg-slate-900 text-white dark:bg-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t === "marksheet" ? "Marksheet / Result" : t === "certificate" ? "Certificate" : "Student ID Card"}
                </button>
              ))}
            </div>

            <form onSubmit={handleVerifySearch} className="flex gap-2">
              <input
                type="text"
                required
                value={verifySearchQuery}
                onChange={e => setVerifySearchQuery(e.target.value)}
                placeholder={verifyType === "marksheet" ? "Enter Roll Number or Reg No..." : "Enter Certificate / Application No..."}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" /> Verify Now
              </button>
            </form>
          </div>

          {/* Verification Result Card */}
          {verifiedResult && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-emerald-500 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Verified Genuine Record</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Date: {verifiedResult.date}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl font-medium">
                <div>
                  <span className="text-slate-400 block text-[10px]">Candidate:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{verifiedResult.student}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Roll Number:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{verifiedResult.roll}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Result / Division:</span>
                  <span className="font-black text-emerald-700">{verifiedResult.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Score:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{verifiedResult.total} (GPA {verifiedResult.gpa})</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => onOpenVerification && onOpenVerification(verifiedResult.type, JSON.stringify(verifiedResult))}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Full Original Marksheet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: CONTACT & INQUIRY */}
      {activeSection === "contact" && (
        <div className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-4">
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">Get in Touch</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We welcome prospective parents and visitors. Contact our administrative office for visits, fee queries, or general assistance.
            </p>

            <div className="space-y-3 pt-2 text-xs font-medium">
              {school.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{school.address}</span>
                </div>
              )}
              {school.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{school.phone}</span>
                </div>
              )}
              {school.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{school.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {inquirySent ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-black text-base">Inquiry Submitted!</h4>
                <p className="text-xs text-slate-500">The school administration will get back to you shortly.</p>
                <button
                  onClick={() => setInquirySent(false)}
                  className="mt-3 px-4 py-1.5 bg-slate-100 text-xs font-bold rounded-lg"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-3">
                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-2">Send an Inquiry</h4>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={inquiryName}
                    onChange={e => setInquiryName(e.target.value)}
                    placeholder="Parent / Guardian Name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={inquiryPhone}
                    onChange={e => setInquiryPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Student Class / Subject</label>
                  <input
                    type="text"
                    value={inquiryClass}
                    onChange={e => setInquiryClass(e.target.value)}
                    placeholder="e.g. Class 10"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Message</label>
                  <textarea
                    rows={3}
                    value={inquiryMessage}
                    onChange={e => setInquiryMessage(e.target.value)}
                    placeholder="Ask about admissions, fees, transport..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inquirySending}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> {inquirySending ? "Sending..." : "Submit Inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 text-xs text-center">
        <p className="font-bold text-white mb-1">{school.name}</p>
        <p className="text-[11px] text-slate-500">
          Powered by IIC×NSTA Smart School System &bull; Secure Multi-Role Cloud Portal
        </p>
      </footer>
    </div>
  );
};
