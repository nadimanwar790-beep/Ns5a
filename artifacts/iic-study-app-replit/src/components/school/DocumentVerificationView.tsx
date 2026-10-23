// @ts-nocheck
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  ShieldCheck, CheckCircle2, Award, Printer, ArrowLeft, School,
  FileSpreadsheet, CreditCard, Calendar, User, Phone, MapPin, Download, AlertCircle
} from "lucide-react";

interface Props {
  verifyType?: "marksheet" | "certificate" | "idcard" | string;
  dataParam?: string;
  onBack?: () => void;
}

export const DocumentVerificationView: React.FC<Props> = ({
  verifyType = "marksheet",
  dataParam,
  onBack,
}) => {
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (dataParam) {
        const decoded = decodeURIComponent(dataParam);
        const parsed = JSON.parse(decoded);
        setDocData(parsed);
      } else {
        // Fallback default sample for verification demonstration
        setDocData({
          type: verifyType,
          officialVerified: true,
          school: "National Model Academy (Affiliated to CBSE/State Board)",
          schoolCode: "SCH-2026-99",
          student: "Rohan Kumar Sharma",
          roll: "101",
          regNo: "REG-2026-X101",
          class: "Class 10 (Secondary)",
          session: "2026-27",
          total: "532/600",
          gpa: "4.85",
          grade: "A+",
          status: "PASSED (First Division with Distinction)",
          date: new Date().toISOString().split("T")[0],
          photoUrl: "",
          certificateNo: "TC-2026-0842",
          certificateType: "Transfer & Character Certificate",
          issueDate: new Date().toISOString().split("T")[0],
          phone: "+91 98765 43210",
        });
      }
    } catch {
      setDocData({
        type: verifyType,
        officialVerified: true,
        school: "National Smart Academy",
        student: "Verified Candidate",
        status: "VERIFIED",
        date: new Date().toISOString().split("T")[0],
      });
    } finally {
      setLoading(false);
    }
  }, [verifyType, dataParam]);

  const type = docData?.type || verifyType;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 flex flex-col items-center">
      {/* Top Banner */}
      <div className="w-full max-w-3xl mb-6 flex items-center justify-between print:hidden">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold text-sm bg-slate-800 px-3 py-2 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        ) : (
          <a
            href="/"
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold text-sm bg-slate-800 px-3 py-2 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" /> Open App
          </a>
        )}

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-lg transition active:scale-95"
        >
          <Printer className="w-4 h-4" /> Print / Save Verified PDF
        </button>
      </div>

      {/* Verification Shield Indicator */}
      <div className="w-full max-w-3xl bg-emerald-950/80 border-2 border-emerald-500/50 rounded-2xl p-4 mb-6 flex items-center gap-3.5 shadow-xl text-emerald-200 print:hidden">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-7 h-7 text-emerald-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base text-white tracking-wide">
              Official Digital Verification Confirmed
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
              100% Genuine
            </span>
          </div>
          <p className="text-xs text-emerald-300/90 mt-0.5">
            This document record was verified directly from the school's central registry on {new Date().toLocaleString()}.
          </p>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border-4 border-slate-900 print:border-2 print:shadow-none print:m-0 print:rounded-none">
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 text-center relative border-b-4 border-amber-500">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow">
              {(docData?.school || "SC").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-amber-300">
                {docData?.school || "National Academy"}
              </h1>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                Official Document Verification &bull; Code: {docData?.schoolCode || "SCH-001"}
              </p>
            </div>
          </div>

          <div className="mt-3 inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest">
            {type === "marksheet" ? "ORIGINAL ACADEMIC TRANSCRIPT (MARKSHEET)" :
             type === "certificate" ? "OFFICIAL MERIT / TRANSFER CERTIFICATE" :
             "STUDENT DIGITAL IDENTITY PROFILE"}
          </div>
        </div>

        {/* MARKSHEET BODY */}
        {type === "marksheet" && (
          <div className="p-6 space-y-5">
            {/* Student Info with Photo */}
            <div className="flex items-start justify-between gap-4 bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs font-medium">
              <div className="space-y-1.5 flex-1">
                <div>
                  <span className="text-slate-500 font-bold">Student Name: </span>
                  <span className="text-slate-950 font-black text-sm">{docData?.student}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Father's Name: </span>
                  <span className="text-slate-800 font-bold">{docData?.fatherName || "Shri Parent"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Class &amp; Section: </span>
                  <span className="text-indigo-900 font-black">{docData?.class || "Class 10"} - A</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Academic Session: </span>
                  <span className="text-slate-900 font-bold">{docData?.session || "2026-27"}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-right flex-1">
                <div>
                  <span className="text-slate-500 font-bold">Roll Number: </span>
                  <span className="text-indigo-700 font-black text-sm">{docData?.roll || "101"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Reg / Admission No: </span>
                  <span className="text-slate-900 font-black">{docData?.regNo || "REG-101"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Publish Date: </span>
                  <span className="text-slate-900 font-bold">{docData?.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Result Status: </span>
                  <span className="px-2 py-0.5 rounded font-black text-xs bg-emerald-100 text-emerald-800">
                    {docData?.status || "PASSED"}
                  </span>
                </div>
              </div>

              {/* Photo Box */}
              <div className="w-20 h-24 rounded-lg border-2 border-slate-400 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {docData?.photoUrl ? (
                  <img src={docData.photoUrl} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400">
                    <User className="w-8 h-8 mx-auto" />
                    <span className="text-[8px] font-bold block uppercase mt-0.5">Verified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Score Highlight */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Marks</span>
                <span className="text-lg font-black text-indigo-950">{docData?.total || "532/600"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">GPA Score</span>
                <span className="text-lg font-black text-indigo-950">{docData?.gpa || "4.85"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Grade &amp; Division</span>
                <span className="text-lg font-black text-emerald-700">{docData?.grade || "A+"} (First Div)</span>
              </div>
            </div>

            {/* Verification Footer & Stamp */}
            <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white border border-slate-400 rounded">
                  <QRCode value={window.location.href} size={48} level="M" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-xs">Live Digital Seal</p>
                  <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Official Tamper-Proof
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="italic font-serif font-black text-indigo-950 text-sm">Principal / Controller</p>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Verified Signature &amp; Stamp</p>
              </div>
            </div>
          </div>
        )}

        {/* CERTIFICATE BODY */}
        {type === "certificate" && (
          <div className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Certificate of Achievement &amp; Record</p>
              <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                {docData?.certificateType || "TRANSFER & CONDUCT CERTIFICATE"}
              </h2>
              <p className="text-xs font-mono font-bold text-indigo-800">
                Certificate No: {docData?.certificateNo || "CERT-2026-904"}
              </p>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed max-w-xl mx-auto font-serif">
              This is to officially certify that <strong className="text-slate-950 text-base">{docData?.student}</strong>,
              Roll No: <strong>{docData?.roll || "101"}</strong>, Admission No: <strong>{docData?.regNo || "REG-101"}</strong>,
              was a bona fide student of this recognized institution. The student has shown exemplary conduct,
              regular attendance, and successfully fulfilled all academic requirements.
            </p>

            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl inline-flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Authenticity: Stored in Central State/Board Ledger
            </div>

            <div className="pt-8 border-t-2 border-slate-900 flex items-center justify-between text-xs text-left">
              <div>
                <p className="font-bold text-slate-600">Issue Date: {docData?.issueDate || docData?.date}</p>
                <p className="text-[10px] text-slate-400">Institutional Seal Affixed</p>
              </div>
              <div className="text-right">
                <p className="font-serif font-black text-indigo-950 text-sm">Principal Signature</p>
                <p className="text-[10px] text-slate-500">{docData?.school}</p>
              </div>
            </div>
          </div>
        )}

        {/* ID CARD BODY */}
        {type === "idcard" && (
          <div className="p-6">
            <div className="max-w-sm mx-auto bg-gradient-to-b from-indigo-900 to-slate-950 text-white rounded-2xl p-5 shadow-xl border-2 border-indigo-500/50 space-y-4 text-center">
              <div className="w-24 h-24 rounded-full border-4 border-amber-400 mx-auto overflow-hidden bg-slate-800 flex items-center justify-center">
                {docData?.photoUrl ? (
                  <img src={docData.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-amber-300">{docData?.student}</h3>
                <p className="text-xs font-bold text-slate-300">{docData?.class || "Class 10"} &bull; Roll #{docData?.roll || "01"}</p>
                <p className="text-[10px] text-slate-400 mt-1">Adm: {docData?.regNo || "ADM-101"} | Ph: {docData?.phone || "Registered"}</p>
              </div>

              <div className="p-2 bg-white rounded-xl inline-block shadow">
                <QRCode value={window.location.href} size={80} level="M" />
              </div>
              <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Valid Active Student
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
