// @ts-nocheck
import React, { useState } from 'react';
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

  if (!isOpen || !user) return null;

  const qrToken = generateLoginQrToken(user);
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
          title: `${appName} Login QR Code`,
          text: `${user.name} ka ${appName} Login QR Code. Scan karke bina password ke direct login karein!`,
        });
      } catch {}
    } else {
      handleCopyToken();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/70 text-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-between text-white relative">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm leading-tight flex items-center gap-1.5">
                Mera Login QR Code
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h3>
              <p className="text-[11px] text-indigo-100 font-medium">Bina password instant login</p>
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
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          {/* User profile capsule */}
          <div className="w-full flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shrink-0 shadow-md">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0 text-left flex-1">
              <h4 className="font-bold text-xs truncate text-white">{user.name || 'Student'}</h4>
              <p className="text-[10px] font-mono text-indigo-400 font-bold truncate">ID: {displayId}</p>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase shrink-0">
              {user.role || 'STUDENT'}
            </span>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-indigo-500/30">
            <QRCode
              value={qrToken}
              size={180}
              level="M"
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            />
          </div>

          {/* Instructions */}
          <div className="text-left w-full space-y-1.5 bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
            <p className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-snug">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>Kisi bhi phone me <strong>{appName}</strong> open karein aur login screen par <strong>"Scan QR"</strong> dabakar scan karein.</span>
            </p>
            <p className="text-[10px] text-amber-300 flex items-start gap-1.5 leading-snug font-medium pt-1 border-t border-slate-700/50">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>1 Mobile Limit:</strong> Dusre mobile me login hote hi is mobile se automatically logout ho jayega.</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full flex items-center gap-2 pt-1">
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
