// @ts-nocheck
import React, { useState } from 'react';
import { QRCode } from 'react-qr-code';
import {
  X,
  QrCode,
  Share2,
  Copy,
  Check,
  Users,
  Sparkles,
  Link2,
} from 'lucide-react';
import { GroupStudyRoom } from '../services/groupStudyService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: GroupStudyRoom | null;
  appName?: string;
}

export const StudyRoomQrModal: React.FC<Props> = ({
  isOpen,
  onClose,
  room,
  appName = 'NSTA',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !room) return null;

  const roomCode = room.code || room.id?.slice(-6)?.toUpperCase() || 'ROOM';
  const joinUrl = `${window.location.origin}/?studyRoom=${encodeURIComponent(roomCode)}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${room.name} — ${appName} Study Room`,
          text: `Join my live study room "${room.name}" on ${appName}! Camera se QR scan karein ya link kholein (bina login sirf naam likhkar direct join karein): ${joinUrl}`,
          url: joinUrl,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 text-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm leading-tight flex items-center gap-1.5">
                Study Room QR Code
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h3>
              <p className="text-[11px] text-teal-100 font-medium">Bina login scan karke direct join karein</p>
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
          {/* Room Name & Code */}
          <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-teal-400 tracking-wider">Live Study Room</span>
                <h4 className="font-black text-sm truncate text-white">{room.name}</h4>
                <p className="text-[11px] text-slate-400 truncate">{room.subject || 'All Subjects'} • Host: {room.hostName || 'Host'}</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 flex flex-col items-center shrink-0 cursor-pointer transition active:scale-95"
                title="Room Code Copy Karein"
              >
                <span className="text-[9px] uppercase font-bold text-teal-400">Code</span>
                <span className="font-mono font-black text-sm">{roomCode}</span>
              </button>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-teal-500/30">
            <QRCode
              value={joinUrl}
              size={185}
              level="M"
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            />
          </div>

          {/* Highlight note */}
          <div className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 text-left space-y-1">
            <p className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-snug">
              <Users className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>No Login Needed:</strong> Koi bhi dost phone camera se ye QR scan karega, apna naam likhega aur room me direct jud jayega!</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full flex items-center gap-2 pt-1">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-slate-300" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Invite</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
