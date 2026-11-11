import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Smartphone, KeyRound, Loader2, AlertCircle, X, Lock, ArrowLeft } from 'lucide-react';
import { verifyLoginChallengeOtp } from '../services/sessionManager';

interface Props {
  isOpen: boolean;
  userId: string;
  challengeId: string;
  remoteDeviceName?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onFallbackToPassword?: () => void;
}

export const QrLoginOtpChallengeModal: React.FC<Props> = ({
  isOpen,
  userId,
  challengeId,
  remoteDeviceName = 'Dusra Logged-in Mobile',
  onSuccess,
  onCancel,
  onFallbackToPassword,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setDigits(['', '', '', '', '', '']);
    setError(null);
    setIsLocked(false);
    setLoading(false);
    setSecondsLeft(120);

    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isOpen, challengeId]);

  if (!isOpen) return null;

  const handleChange = (index: number, val: string) => {
    if (isLocked) return;
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const digitChar = cleaned[cleaned.length - 1];
    const next = [...digits];
    next[index] = digitChar;
    setDigits(next);
    setError(null);

    // Auto-advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // If all 6 digits are filled, auto-verify
      const fullOtp = next.join('');
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isLocked) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setDigits(next);
    setError(null);

    const lastIdx = Math.min(pasted.length, 5);
    inputRefs.current[lastIdx]?.focus();

    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otpToVerify?: string) => {
    const fullOtp = otpToVerify || digits.join('');
    if (fullOtp.length < 6) {
      setError('Kripya pura 6-digit OTP dalein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyLoginChallengeOtp(userId, challengeId, fullOtp);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || 'Galat OTP! Kripya dobara check karein.');
        if (res.locked) {
          setIsLocked(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Verification fail hua.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-[#0d162b] to-slate-950 border border-cyan-500/30 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] text-center flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Top Icon */}
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center mb-3 text-cyan-400 shadow-lg shadow-cyan-500/20">
          <KeyRound size={34} />
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">
          Cross-Device Security OTP
        </h3>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 mb-3 w-full text-left flex items-center gap-2">
          <Smartphone size={13} className="text-cyan-400 shrink-0" />
          <p className="text-[11px] text-slate-300 truncate">
            Active Phone: <strong className="text-white">{remoteDeviceName}</strong>
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4 font-medium">
          Aapka account pehle se dusre mobile me login hai. Suraksha ke liye, us phone par ek <strong className="text-cyan-300">6-digit OTP</strong> bheja gaya hai:
        </p>

        {/* 6-Digit OTP inputs */}
        <div className="flex items-center justify-center gap-2 mb-3 w-full" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={loading || secondsLeft <= 0 || isLocked}
              className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl text-center text-2xl font-black font-mono transition-all outline-none ${
                digit
                  ? 'bg-cyan-500/20 border-2 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-950/70 border border-slate-700/80 text-slate-200 focus:border-cyan-400 focus:bg-cyan-950/30'
              } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
          ))}
        </div>

        {/* Rate limit note */}
        <div className="text-[10px] text-slate-400 mb-2 flex items-center gap-1">
          <ShieldCheck size={12} className="text-cyan-400" />
          <span>Rate Limit: Max 3 attempts (Anti-Brute Force Protected)</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-950/50 border border-rose-500/50 rounded-xl p-2.5 mb-3 w-full flex items-center gap-2 text-rose-300 text-xs font-semibold text-left animate-in shake">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Timer */}
        <div className="text-xs text-slate-400 mb-4 font-mono">
          {secondsLeft > 0 && !isLocked ? (
            <span>OTP expire in: <strong className="text-cyan-400 font-bold">{secondsLeft}s</strong></span>
          ) : isLocked ? (
            <span className="text-rose-400 font-bold">Request locked. Naya QR code scan karein.</span>
          ) : (
            <span className="text-rose-400 font-bold">OTP expire ho chuka hai. Kripya naya scan karein.</span>
          )}
        </div>

        {/* Fallback Option (Lost Phone Deadlock Resolution) */}
        {onFallbackToPassword && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-slate-800/60 border border-amber-500/30 text-left">
            <p className="text-[10.5px] text-amber-200/90 font-medium leading-tight mb-1.5">
              📱 Purana phone kho gaya ya band hai?
            </p>
            <button
              onClick={() => {
                onCancel();
                onFallbackToPassword();
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 active:scale-95 transition-all cursor-pointer underline"
            >
              <Lock size={12} />
              <span>Password / Security Key se Login karein</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => handleVerify()}
            disabled={loading || digits.join('').length < 6 || secondsLeft <= 0 || isLocked}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verify kar rahe hain...</span>
              </>
            ) : isLocked ? (
              <>
                <Lock size={16} />
                <span>Locked (Max attempts exceeded)</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Verify & Login Karein</span>
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all cursor-pointer"
          >
            Cancel Karein
          </button>
        </div>
      </div>
    </div>
  );
};
