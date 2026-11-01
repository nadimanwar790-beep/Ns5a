// @ts-nocheck
import React, { useState } from 'react';
import {
  X,
  Users,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
  onSubmitName: (name: string, roomCode?: string) => void;
  appName?: string;
}

export const GuestRoomJoinModal: React.FC<Props> = ({
  isOpen,
  onClose,
  roomCode,
  onSubmitName,
  appName = 'NSTA',
}) => {
  const [nameInput, setNameInput] = useState('');
  const [targetCode, setTargetCode] = useState(roomCode || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) {
      setError('Kripya apna naam likhein.');
      return;
    }
    if (cleanName.length < 2) {
      setError('Naam kam se kam 2 akshar ka hona chahiye.');
      return;
    }
    setError(null);
    onSubmitName(cleanName, targetCode.trim() || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 text-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm leading-tight flex items-center gap-1.5">
                Study Room Me Judien
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h3>
              <p className="text-[11px] text-teal-100 font-medium">Bina login direct participation</p>
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
        <form onSubmit={handleSubmit} className="p-5 flex flex-col space-y-4">
          <div className="text-left space-y-1">
            <p className="text-xs text-slate-300 leading-relaxed">
              Aap bina app account ke bhi Study Room me jud sakte hain aur room create kar sakte hain. Dusre students ko dikhane ke liye bas apna naam enter karein:
            </p>
          </div>

          {roomCode && (
            <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-400">Target Study Room</span>
                <p className="font-mono font-black text-white text-sm">{roomCode}</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">QR Invite</span>
            </div>
          )}

          {!roomCode && (
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-300">Room Code (Optional)</label>
              <input
                type="text"
                value={targetCode}
                onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123 ya khali chhod dein"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          )}

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-200">
              Aapka Naam <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 font-bold"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-medium text-left">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/30 cursor-pointer active:scale-95"
            >
              <span>{roomCode || targetCode ? 'Room Me Join Karein' : 'Study Room Open Karein'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
