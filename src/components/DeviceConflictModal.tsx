import React from 'react';
import { Smartphone, LogOut, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  deviceName?: string;
  onAcknowledge: () => void;
}

export const DeviceConflictModal: React.FC<Props> = ({
  isOpen,
  deviceName = 'Dusra Mobile / Device',
  onAcknowledge,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
        {/* Glowing badge icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400 shadow-lg shadow-rose-500/20">
          <ShieldAlert size={34} />
        </div>

        <h3 className="text-xl font-black text-white mb-2 tracking-tight">
          Account Dusre Mobile Par Login Hua
        </h3>

        <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 mb-4 w-full text-left">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs mb-1">
            <Smartphone size={14} className="shrink-0" />
            <span>Naya Active Device:</span>
          </div>
          <p className="text-[11px] text-rose-200 font-mono truncate">
            {deviceName}
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-6 font-medium">
          Suraksha ke niyam anusar ek account <strong className="text-white">bas ek hi mobile</strong> me chal sakta hai. Dusre device me login hote hi is phone se account automatic logout ho gaya hai.
        </p>

        <button
          onClick={onAcknowledge}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut size={16} />
          <span>Login Screen Par Jayein</span>
        </button>
      </div>
    </div>
  );
};
