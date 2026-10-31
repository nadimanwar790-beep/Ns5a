// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { QRCode } from 'react-qr-code';
import {
  X,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Share2,
  Sparkles,
  AlertTriangle,
  User as UserIcon,
  RotateCw,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { generateLoginQrToken } from '../services/sessionManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  appName?: string;
}

export const UserLoginQrModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  appName = 'NSTA',
}) => {
  const [copied, setCopied] = useState(false);
  const [qrToken, setQrToken] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [refreshing, setRefreshing] = useState(false);

  // Generate dynamic QR Token with 60s validity
  const refreshQr = () => {
    if (!user) return;
    setRefreshing(true);
    const token = generateLoginQrToken(user, 60);
    setQrToken(token);
    setSecondsLeft(60);
    setTimeout(() => setRefreshing(false), 300);
  };

  useEffect(() => {
    if (!isOpen || !user) return;
    refreshQr();

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, user?.id, user?.uid]);

  if (!isOpen || !user) return null;

  const displayId = user.displayId || `NSTA-${(user.uid || user.id || '').slice(0, 6).toUpperCase()}`;

  const handleCopyToken = () => {
    try {
      navigator.clipboard.writeText(qrToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${appName} Live Login QR Code`,
          text: `${user.name} ka dynamic ${appName} Login QR Code (60s security validity). Scan karke bina password ke direct login karein!`,
        });
      } catch {}
    } else {
      handleCopyToken();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-slate-900 border border-indigo-500/30 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(99,102,241,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-between text-white relative">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm leading-tight flex items-center gap-1.5">
                Mera Login QR Code
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h3>
              <p className="text-[10px] text-indigo-100 font-medium">Bina password instant secure login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col items-center text-center space-y-3.5">
          {/* User profile capsule */}
          <div className="w-full flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-white shrink-0 shadow-md">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0 text-left flex-1">
              <h4 className="font-bold text-xs truncate text-white">{user.name || 'Student'}</h4>
              <p className="text-[10px] font-mono text-indigo-400 font-bold truncate">ID: {displayId}</p>
            </div>
            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase shrink-0">
              {user.role || 'STUDENT'}
            </span>
          </div>

          {/* Dynamic 60s Expiration Bar */}
          <div className="w-full bg-slate-800/90 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
              <Clock size={13} className="text-amber-400" />
              <span>QR Valid: <strong className="text-amber-300 font-mono font-bold">{secondsLeft}s</strong></span>
            </div>
            <button
              onClick={refreshQr}
              disabled={refreshing}
              className="flex items-center gap-1 text-[10.5px] text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/40 px-2 py-0.5 rounded-lg border border-indigo-500/30 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCw size={11} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* QR Code Container with 60s Progress Outline */}
          <div className="relative p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-indigo-500/40">
            {qrToken ? (
              <QRCode
                value={qrToken}
                size={175}
                level="M"
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">Generating QR...</div>
            )}
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck size={13} />
            <span>Anti-Hijack Live Protection · Har 60s Me Naya Token</span>
          </div>

          {/* Instructions */}
          <div className="text-left w-full space-y-1.5 bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
            <p className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-snug">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>Dusre phone me login screen par <strong>"Scan QR"</strong> dabakar is screen ko scan karein.</span>
            </p>
            <p className="text-[10px] text-amber-300 flex items-start gap-1.5 leading-snug font-medium pt-1 border-t border-slate-700/50">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>1 Mobile Limit:</strong> Wahan login hote hi ye mobile automatic logout ho jayega.</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full flex items-center gap-2 pt-0.5">
            <button
              onClick={handleCopyToken}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span>{copied ? 'Copied Token!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Share QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
