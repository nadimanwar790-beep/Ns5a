import React, { useEffect, useState, useRef } from "react";
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  CalendarCheck,
  MessageSquare,
  ReceiptText,
  ArrowRight,
  X,
  Share2,
  Download,
  School,
  PartyPopper,
  Volume2
} from "lucide-react";
import type { NstaWelcomeData } from "../../school-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  welcomeData: NstaWelcomeData | null;
  onOpenSchoolDesk?: () => void;
}

export const SchoolWelcomeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  welcomeData,
  onOpenSchoolDesk,
}) => {
  const [copied, setCopied] = useState(false);
  const audioPlayedRef = useRef(false);

  // Play pleasant celebratory audio chime using Web Audio API on mount
  useEffect(() => {
    if (isOpen && !audioPlayedRef.current) {
      audioPlayedRef.current = true;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
            gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + idx * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.12);
            osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
          });
        }
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen || !welcomeData) return null;

  const schoolName = welcomeData.schoolName || "NSTA Digital School";
  const studentName = welcomeData.studentName || "Student";
  const className = welcomeData.className || "Class 10";
  const admNo = welcomeData.admissionNo || "ADM-001";
  const rollNo = welcomeData.rollNo || "01";

  const handleShare = () => {
    const text = `🎓 Welcome to ${schoolName} Digital Campus!\n\nStudent: ${studentName}\nClass: ${className}\nRoll No: ${rollNo}\nAdmission No: ${admNo}\n\nDigital Student ID has been verified & active on NSTA App!`;
    if (navigator.share) {
      navigator.share({ title: `Welcome to ${schoolName}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* ── TOP BANNER: CELEBRATION HEADER ── */}
        <div className="relative px-5 pt-6 pb-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/80 border-b border-amber-500/20 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* School Badge & Sparkle Icon */}
          <div className="inline-flex items-center justify-center relative mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-xl shadow-amber-500/25">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden">
                {welcomeData.schoolLogo ? (
                  <img src={welcomeData.schoolLogo} alt="Logo" className="w-11 h-11 object-contain" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-amber-400" />
                )}
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] shadow-md shadow-emerald-500/40">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-black text-amber-300 uppercase tracking-widest mb-1.5">
            <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
            <span>Digital ID Verified • New Account</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            विद्यालय परिवार में आपका स्वागत है!
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-emerald-400 mt-0.5">
            Welcome to {schoolName} Digital Campus
          </p>
        </div>

        {/* ── SCROLLABLE BODY: STUDENT VERIFICATION & FACILITIES ── */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Official Student Credentials Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900 border border-slate-700/80 shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-md">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                    <span>{studentName}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {className} • Roll No: <span className="text-white font-bold">{rollNo}</span>
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-[10px] tracking-wide uppercase">
                Active ID
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Admission No</span>
                <span className="text-white font-mono font-bold text-xs">{admNo}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Session</span>
                <span className="text-white font-mono font-bold text-xs">{welcomeData.session || "2026-27"}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Verification</span>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  QR Card Active
                </span>
              </div>
            </div>
          </div>

          {/* Principal Welcome Note */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[11px] sm:text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-2 font-black text-amber-300 text-xs">
              <School className="w-4 h-4" />
              <span>प्रधानाचार्य संदेश (Principal Desk)</span>
            </div>
            <p>
              प्रिय <strong>{studentName}</strong>, {schoolName} के आधुनिक डिजिटल अध्ययन केंद्र में आपका स्वागत है। आपकी डिजिटल छात्र आईडी सक्रिय कर दी गई है। आप अपनी पढ़ाई, अध्यायवार नोट्स और विद्यालय के सभी संदेश इस पोर्टल से प्राप्त कर सकते हैं।
            </p>
          </div>

          {/* 4 Feature Highlights Grid */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              आपके लिए सक्रिय सुविधाएं (Active Facilities)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-white text-[11px]">100% फ्री नोट्स</p>
                  <p className="text-[10px] text-slate-400">अध्यायवार सम्पूर्ण सिलेबस</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                  <CalendarCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-white text-[11px]">लाइव हाजिरी</p>
                  <p className="text-[10px] text-slate-400">आगमन/प्रस्थान सूचना</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-white text-[11px]">स्कूल मैसेंजर</p>
                  <p className="text-[10px] text-slate-400">सर्कुलर व शिक्षक डाउट</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <ReceiptText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-white text-[11px]">डिजिटल रसीदें</p>
                  <p className="text-[10px] text-slate-400">पारदर्शी शुल्क पासबुक</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2.5 flex-wrap shrink-0">
          {onOpenSchoolDesk && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSchoolDesk();
              }}
              className="flex-1 min-w-[170px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>स्कूल डेस्क संदेश देखें</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-slate-700"
          >
            <span>पोर्टल शुरू करें</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
            title="Share Welcome Status"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
