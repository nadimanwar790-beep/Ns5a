import React, { useEffect, useState, useRef } from "react";
import {
  Cake,
  Sparkles,
  Gift,
  Heart,
  PartyPopper,
  School,
  Share2,
  X,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Crown
} from "lucide-react";
import type { NstaBirthdayData } from "../../school-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  birthdayData: NstaBirthdayData | null;
  onOpenSchoolDesk?: () => void;
}

export const SchoolBirthdayModal: React.FC<Props> = ({
  isOpen,
  onClose,
  birthdayData,
  onOpenSchoolDesk,
}) => {
  const [copied, setCopied] = useState(false);
  const audioPlayedRef = useRef(false);

  // Play pleasant celebratory birthday melodic motif using Web Audio API on mount
  useEffect(() => {
    if (isOpen && !audioPlayedRef.current) {
      audioPlayedRef.current = true;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          // "Happy Birthday to You" notes: C4, C4, D4, C4, F4, E4
          const melody = [
            { f: 261.63, d: 0.18, pause: 0.04 }, // C4
            { f: 261.63, d: 0.18, pause: 0.04 }, // C4
            { f: 293.66, d: 0.32, pause: 0.05 }, // D4
            { f: 261.63, d: 0.32, pause: 0.05 }, // C4
            { f: 349.23, d: 0.35, pause: 0.06 }, // F4
            { f: 329.63, d: 0.55, pause: 0.10 }, // E4
          ];

          let t = ctx.currentTime + 0.05;
          melody.forEach((note) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(note.f, t);

            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + note.d + 0.02);
            t += note.d + note.pause;
          });
        }
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen || !birthdayData) return null;

  const schoolName = birthdayData.schoolName || "NSTA Digital School";
  const studentName = birthdayData.studentName || "Student";
  const className = birthdayData.className || "Class 10";
  const admNo = birthdayData.admissionNo || "ADM-001";
  const rollNo = birthdayData.rollNo || "01";
  const dob = birthdayData.dateOfBirth || "";

  const handleShare = () => {
    const text = `🎂 Happy Birthday to ${studentName}! 🎉\n\nOfficial birthday blessings and best wishes from the Principal & Management of ${schoolName}.\n\nStudent: ${studentName}\nClass: ${className}\nRoll No: ${rollNo}\nDate: ${dob}\n\nMay this year bring immense learning, wisdom, and glorious success!`;
    if (navigator.share) {
      navigator.share({ title: `Happy Birthday ${studentName}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-rose-950/40 to-slate-950 border border-amber-500/50 rounded-3xl shadow-2xl shadow-rose-950/40 overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* ── TOP BANNER: CELEBRATION HEADER ── */}
        <div className="relative px-5 pt-6 pb-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Birthday Cake & Crown Icon */}
          <div className="inline-flex items-center justify-center relative mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-400 to-amber-300 p-0.5 shadow-xl shadow-rose-500/25">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden relative">
                <Cake className="w-9 h-9 text-rose-400" />
                <div className="absolute top-1 right-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/50">
              <Crown className="w-4 h-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-[11px] font-black text-rose-300 uppercase tracking-widest mb-1.5">
            <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Birthday Blessings • Principal Desk</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            🎂 जन्मदिन की हार्दिक शुभकामनाएं!
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-amber-300 mt-0.5">
            Happy Birthday, {studentName}!
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {schoolName} परिवार की ओर से शुभाशीर्वाद
          </p>
        </div>

        {/* ── SCROLLABLE BODY: STUDENT BLESSINGS CARD ── */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Student Birthday Profile Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/90 via-slate-900 to-rose-950/40 border border-amber-500/30 shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md relative">
                  {studentName.charAt(0).toUpperCase()}
                  <span className="absolute -bottom-1 -right-1 text-xs">👑</span>
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
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold text-[10px] tracking-wide uppercase">
                Birthday VIP 🎉
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Admission No</span>
                <span className="text-white font-mono font-bold text-xs">{admNo}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Date of Birth</span>
                <span className="text-amber-300 font-mono font-bold text-xs">{dob || "Today"}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Status</span>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Wished by School
                </span>
              </div>
            </div>
          </div>

          {/* Official Principal Desk Blessing Letter */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/40 text-slate-200 text-xs leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-black text-amber-300 text-xs">
              <School className="w-4 h-4" />
              <span>प्रधानाचार्य शुभाशीर्वाद (Principal's Official Blessing)</span>
            </div>
            <p className="italic text-slate-300">
              "प्रिय <strong>{studentName}</strong>, आपके जन्मदिवस के इस मंगलमय अवसर पर {schoolName} परिवार की ओर से हार्दिक बधाई। ईश्वर से प्रार्थना है कि यह नया वर्ष आपके जीवन में उत्तम स्वास्थ्य, प्रखर बुद्धि, एकाग्रता और नित-नई उपलब्धियां लेकर आए। आप अपने ज्ञान, परिश्रम और श्रेष्ठ आचरण से अपने परिवार और विद्यालय का नाम रोशन करें।"
            </p>
            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-400/90 font-medium">
              <span>🏛️ {schoolName}</span>
              <span>— Principal &amp; All Faculty</span>
            </div>
          </div>

          {/* Quick Inspiring Pillars */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-base block mb-0.5">🌟</span>
              <strong className="text-white block">उत्तम स्वास्थ्य</strong>
              <span className="text-slate-400 text-[9px]">दीर्घायु व ऊर्जा</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-base block mb-0.5">📚</span>
              <strong className="text-white block">प्रखर विद्या</strong>
              <span className="text-slate-400 text-[9px]">ज्ञान व एकाग्रता</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="text-base block mb-0.5">🏆</span>
              <strong className="text-white block">महान सफलता</strong>
              <span className="text-slate-400 text-[9px]">उज्ज्वल भविष्य</span>
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
              className="flex-1 min-w-[170px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:opacity-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>स्कूल डेस्क पर संदेश देखें</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border border-slate-700"
          >
            <span>धन्यवाद (Thank You)</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
            title="Share Birthday Status"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
