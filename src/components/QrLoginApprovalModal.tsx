import React, { useState, useEffect } from 'react';
import { ShieldAlert, Smartphone, Copy, Check, X, Clock, AlertTriangle } from 'lucide-react';
import {
  LoginChallengeData,
  rejectLoginChallenge,
  clearLoginChallenge,
} from '../services/sessionManager';

interface Props {
  challenge: LoginChallengeData | null;
  userId: string;
  onDismiss?: () => void;
}

export const QrLoginApprovalModal: React.FC<Props> = ({ challenge, userId, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(120);

  useEffect(() => {
    if (!challenge || !challenge.expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [challenge]);

  if (!challenge || timeLeft <= 0 || challenge.status !== 'PENDING') {
    return null;
  }

  const handleCopyOtp = () => {
    try {
      navigator.clipboard?.writeText(challenge.otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDeny = async () => {
    await rejectLoginChallenge(userId, challenge.challengeId);
    if (onDismiss) onDismiss();
  };

  const otpDigits = (challenge.otp || '').split('');

  return (
    <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-[#0d162b] to-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(245,158,11,0.2)] text-center flex flex-col items-center overflow-hidden">
        {/* Glow ambient background circles */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Close Button (Deny) */}
        <button
          onClick={handleDeny}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Dismiss"
        >
          <X size={18} />
        </button>

        {/* Animated Security Icon */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <ShieldAlert size={36} className="animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-white mb-1 tracking-tight">
          QR Login Koshish Dikhai Di!
        </h3>
        <p className="text-xs text-amber-300/90 font-medium mb-3">
          Dusre mobile se aapka QR code scan hua hai
        </p>

        {/* Device pill */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 mb-4 text-[11px] text-slate-300">
          <Smartphone size={13} className="text-amber-400 shrink-0" />
          <span className="truncate max-w-[220px]">
            Device: <strong className="text-white">{challenge.requestingDevice || 'Naya Mobile'}</strong>
          </span>
        </div>

        {/* OTP Display Card */}
        <div className="w-full bg-black/50 border border-amber-500/30 rounded-2xl p-4 mb-4 relative group">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
            Security Login OTP
          </span>

          <div className="flex items-center justify-center gap-2 mb-2">
            {otpDigits.map((digit, i) => (
              <div
                key={i}
                className="w-10 h-12 rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-950/40 border border-amber-400/50 flex items-center justify-center text-2xl font-black font-mono text-amber-300 shadow-inner"
              >
                {digit}
              </div>
            ))}
          </div>

          <button
            onClick={handleCopyOtp}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'OTP Copied!' : 'Copy OTP'}</span>
          </button>
        </div>

        {/* Notice description */}
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 mb-4 w-full text-left flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-rose-200/90 leading-relaxed font-medium">
            Agar yeh aap hain, toh naye phone me ye OTP dalein. Wahan login hote hi <strong className="text-white font-bold">yeh phone automatic logout</strong> ho jayega.
          </p>
        </div>

        {/* Expiry countdown bar */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 font-mono">
          <Clock size={13} className="text-amber-400" />
          <span>Expire hone me samay: <strong className="text-amber-300 font-bold">{timeLeft}s</strong></span>
        </div>

        {/* Deny button */}
        <button
          onClick={handleDeny}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-200 hover:text-rose-300 font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <X size={14} />
          <span>Mera Nahi Hai (Cancel / Deny Login)</span>
        </button>
      </div>
    </div>
  );
};
