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
    <div className="nst-isolated-modal fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center border"
        style={{
          backgroundColor: '#0f172a',
          borderColor: 'rgba(244, 63, 94, 0.45)',
          color: '#f8fafc',
        }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border"
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.16)',
            borderColor: 'rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
          }}
        >
          <ShieldAlert size={30} />
        </div>

        <h3
          className="text-xl font-bold mb-3 tracking-tight"
          style={{ color: '#ffffff' }}
        >
          Account Dusre Mobile Par Login Hua
        </h3>

        <div
          className="rounded-2xl p-3 mb-4 w-full text-left border"
          style={{
            backgroundColor: '#250e19',
            borderColor: 'rgba(244, 63, 94, 0.35)',
          }}
        >
          <div
            className="flex items-center gap-2 font-bold text-xs mb-1"
            style={{ color: '#fda4af' }}
          >
            <Smartphone size={14} className="shrink-0" />
            <span>Naya Active Device:</span>
          </div>
          <p
            className="text-[11px] font-mono truncate"
            style={{ color: '#ffe4e6' }}
          >
            {deviceName}
          </p>
        </div>

        <p
          className="text-xs leading-relaxed mb-6 font-medium"
          style={{ color: '#cbd5e1' }}
        >
          Suraksha ke niyam anusar ek account{' '}
          <strong style={{ color: '#ffffff', fontWeight: 700 }}>bas ek hi mobile</strong>{' '}
          me chal sakta hai. Dusre device me login hote hi is phone se account automatic logout ho gaya hai.
        </p>

        <button
          type="button"
          onClick={onAcknowledge}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          style={{
            background: 'linear-gradient(90deg, #e11d48 0%, #f43f5e 100%)',
            color: '#ffffff',
          }}
        >
          <LogOut size={16} />
          <span>Login Screen Par Jayein</span>
        </button>
      </div>
    </div>
  );
};
