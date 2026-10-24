// @ts-nocheck
import React, { useState } from "react";
import QRCode from "react-qr-code";
import {
  X, QrCode, Calendar, Clock, School, Download, Maximize2,
  Minimize2, CheckCircle, Sparkles, Printer, Share2, Copy, Check
} from "lucide-react";
import { todayStr } from "../../school-firebase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  classId: string;
  className: string;
  presentCount?: number;
  totalStudents?: number;
}

export const ClassQrCodeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  classId,
  className,
  presentCount = 0,
  totalStudents = 0,
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const today = todayStr();

  if (!isOpen) return null;

  // The QR payload
  const qrData = JSON.stringify({
    type: "NSTA_ATTENDANCE_QR",
    schoolId,
    schoolName,
    classId,
    className,
    date: today,
    timestamp: Date.now(),
  });

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(qrData).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 ${fullscreen ? "p-0" : ""}`}>
      <div className={`relative w-full ${fullscreen ? "h-full rounded-none" : "max-w-md rounded-3xl"} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden`}>
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white leading-tight">
                {className} — Attendance QR
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {schoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={fullscreen ? "Normal view" : "Fullscreen projector"}
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
          {/* Date pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-4">
            <Calendar size={13} />
            <span>Today: {today}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          {/* Big high contrast QR Code display */}
          <div className="p-4 bg-white rounded-3xl border-2 border-indigo-500/30 shadow-xl flex items-center justify-center transition-transform hover:scale-[1.02]">
            <div className="bg-white p-2 rounded-2xl">
              <QRCode
                value={qrData}
                size={fullscreen ? 320 : 220}
                level="Q"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
          </div>

          {/* Student scan instructions */}
          <div className="mt-5 space-y-1 max-w-xs">
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
              Students apne phone se Scan karein
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              NSTA App kholein → Home par School Card me <strong className="text-indigo-600 dark:text-indigo-400">"📷 QR Attendance"</strong> dabayein aur is code ko scan karein.
            </p>
          </div>

          {/* Live Student Count summary */}
          {totalStudents > 0 && (
            <div className="mt-4 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle size={14} /> {presentCount} Present
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600 dark:text-slate-300 font-bold">
                {totalStudents} Total Students
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Payload"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-indigo-600/30"
          >
            <Printer size={14} />
            <span>Print QR</span>
          </button>
        </div>

      </div>
    </div>
  );
};
