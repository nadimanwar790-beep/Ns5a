// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle,
  QrCode,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { parseLoginQrToken } from '../services/sessionManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'LOGIN' | 'STUDY_ROOM';
  onScanSuccess: (decodedText: string, metadata?: any) => void;
  title?: string;
}

export const QrScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mode,
  onScanSuccess,
  title,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [fileScanning, setFileScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewport';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setCameraError(null);
      setScannedResult(null);
      setManualCode('');
      return;
    }

    const timer = setTimeout(() => {
      startCamera();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        await scannerInstanceRef.current.clear();
      } catch (e) {
        console.warn('[QrScannerModal] stop error:', e);
      } finally {
        scannerInstanceRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleDecoded = (decodedText: string) => {
    if (scannedResult) return;
    setScannedResult(decodedText);
    stopScanner();

    if (mode === 'LOGIN') {
      const parsed = parseLoginQrToken(decodedText);
      if (parsed) {
        onScanSuccess(decodedText, parsed);
        return;
      }
      onScanSuccess(decodedText, { uid: decodedText.trim() });
    } else {
      let roomCode = decodedText.trim();
      try {
        if (roomCode.includes('studyRoom=')) {
          const url = new URL(roomCode, window.location.origin);
          const p = url.searchParams.get('studyRoom');
          if (p) roomCode = p;
        } else if (roomCode.includes('/room/')) {
          const parts = roomCode.split('/room/');
          if (parts[1]) roomCode = parts[1].split('?')[0];
        }
      } catch {}
      onScanSuccess(roomCode);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      await stopScanner();
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerInstanceRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('[QrScannerModal] Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        'Camera access nahi mila. Browser permission check karein ya neeche Gallery se QR image select karein.'
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanning(true);
    setCameraError(null);

    try {
      const html5QrCode = new Html5Qrcode('qr-file-helper');
      const result = await html5QrCode.scanFile(file, true);
      await html5QrCode.clear();
      setFileScanning(false);
      handleDecoded(result);
    } catch (err: any) {
      setFileScanning(false);
      setCameraError('Image me QR Code scan nahi ho saka. Sahi QR image chunein ya code enter karein.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecoded(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 text-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm leading-tight">
                {title || (mode === 'LOGIN' ? 'Scan QR Code to Login' : 'Scan Study Room QR')}
              </h3>
              <p className="text-[10px] text-indigo-100 font-medium">
                {mode === 'LOGIN' ? 'Bina password instant login' : 'Study Room camera se scan karke join karein'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Viewport / Camera Box */}
        <div className="p-4 flex flex-col items-center space-y-3">
          <div className="relative w-full max-w-[280px] h-[280px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500/40 flex items-center justify-center">
            <div id={scannerContainerId} className="w-full h-full" />
            <div id="qr-file-helper" className="hidden" />

            {isScanning && !cameraError && (
              <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-slate-300 leading-snug">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
              </div>
            )}

            {fileScanning && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-xs text-slate-300">Image scan ho rahi hai...</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            QR code ko camera frame ke beech me rakhein
          </p>

          <div className="w-full flex items-center gap-2 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gallery se QR chunein</span>
            </button>
          </div>

          <form onSubmit={handleManualSubmit} className="w-full flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={mode === 'LOGIN' ? 'Paste Login Token or UID...' : 'Room Code enter karein (e.g. ABC123)'}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white cursor-pointer"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
