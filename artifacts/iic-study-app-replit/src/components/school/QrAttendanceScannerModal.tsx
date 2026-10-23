// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  X, Camera, RefreshCw, Zap, ZapOff, CheckCircle2, AlertCircle,
  Upload, UserCheck, ShieldCheck, Sparkles, School, Volume2, ArrowRight
} from "lucide-react";
import { markStudentQrAttendance, todayStr } from "../../school-firebase";
import { playSoundCorrect, playSoundWrong } from "../../utils/soundEffects";
import { hapticStrong, hapticMedium } from "../../utils/haptic";

export interface QrAttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If a student is self-scanning class attendance QR:
  currentStudent?: {
    id: string;
    name: string;
    rollNo?: string;
    classId?: string;
    className?: string;
    schoolId?: string;
    schoolName?: string;
  };
  // If a teacher/admin is scanning student ID cards:
  isTeacherMode?: boolean;
  targetSchoolId?: string;
  targetClassId?: string;
  targetClassName?: string;
  teacherId?: string;
  onStudentMarked?: (student: { id: string; name: string; rollNo?: string }) => void;
}

export const QrAttendanceScannerModal: React.FC<QrAttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  isTeacherMode = false,
  targetSchoolId,
  targetClassId,
  targetClassName,
  teacherId,
  onStudentMarked,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [continuousCount, setContinuousCount] = useState(0);
  const [scanMode, setScanMode] = useState<"auto" | "in" | "out">("auto");
  const [cutoffTime, setCutoffTime] = useState("08:30");
  const [recentPunches, setRecentPunches] = useState<Array<{
    id: string;
    name: string;
    rollNo?: string;
    action: "in" | "out";
    time: string;
    duration?: string;
    isLate?: boolean;
  }>>([]);
  const [lastScannedResult, setLastScannedResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    action?: "in" | "out";
    inTime?: string;
    outTime?: string;
    stayDuration?: string;
    isLate?: boolean;
    name?: string;
    rollNo?: string;
    className?: string;
    date?: string;
    timestamp?: string;
  } | null>(null);

  // Stop camera stream safely
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("[QR Scanner] Stop/clear warning:", e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Handle scanned raw string
  const handleDecodedText = useCallback(async (decodedText: string) => {
    if (processing) return;
    setProcessing(true);

    try {
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(decodedText);
      } catch {
        parsedJson = null;
      }

      const today = todayStr();

      // ==========================================
      // SCENARIO A: TEACHER MODE (Scanning Student IDs)
      // ==========================================
      if (isTeacherMode) {
        let studentId = "";
        let studentName = "";
        let rollNo = "";
        let schoolId = targetSchoolId || "";
        let classId = targetClassId || "";

        if (parsedJson) {
          // Standard student QR or ID card QR
          studentId = parsedJson.id || parsedJson.studentId || "";
          studentName = parsedJson.name || parsedJson.studentName || "Student";
          rollNo = parsedJson.rollNo || "";
          schoolId = targetSchoolId || parsedJson.schoolId || "";
          classId = targetClassId || parsedJson.classId || "";
        } else if (decodedText.includes("NSTA-SCHOOL:")) {
          // Format: NSTA-SCHOOL:schoolId:studentId:rollNo or URL ending with #NSTA-SCHOOL:...
          const token = decodedText.split("NSTA-SCHOOL:")[1];
          const parts = token.split(":");
          schoolId = targetSchoolId || parts[0] || "";
          studentId = parts[1] || "";
          rollNo = parts[2] || "";
          studentName = `Roll #${rollNo || studentId.slice(0, 5)}`;
        } else if (decodedText.includes("studentId=")) {
          try {
            const urlObj = new URL(decodedText);
            studentId = urlObj.searchParams.get("studentId") || "";
            schoolId = targetSchoolId || urlObj.searchParams.get("schoolId") || "";
            rollNo = urlObj.searchParams.get("roll") || "";
            studentName = urlObj.searchParams.get("name") || `Roll #${rollNo || studentId.slice(0, 5)}`;
          } catch {
            studentId = decodedText.trim();
          }
        } else {
          studentId = decodedText.trim();
          studentName = "Scanned Student";
        }

        if (!studentId || !schoolId || !classId) {
          throw new Error("Invalid Student QR code or missing Class ID");
        }

        const res = await markStudentQrAttendance({
          schoolId,
          classId,
          studentId,
          studentName,
          rollNo,
          date: today,
          markedBy: teacherId || "TEACHER_QR_SCAN",
          scanMode,
          cutoffTime,
        });

        if (res.success) {
          playSoundCorrect();
          hapticStrong();
          setContinuousCount(c => c + 1);

          const punchTime = res.action === "in" ? (res.inTime || "") : (res.outTime || "");
          const isLate = res.isLate;

          const title = res.action === "in"
            ? (isLate ? "⚠️ Late Punch-In (Haziri Lag Gayi)" : "✅ Entry / Punch-In Recorded!")
            : "🚪 Exit / Punch-Out Recorded!";

          const message = res.action === "in"
            ? `${studentName} ${rollNo ? `(Roll ${rollNo})` : ""} - Entry time: ${res.inTime}${isLate ? " (Cutoff ke baad late)" : ""}`
            : `${studentName} - Exit time: ${res.outTime} • Total Stay: ${res.stayDuration || "Recorded"}`;

          setLastScannedResult({
            success: true,
            title,
            message,
            action: res.action,
            inTime: res.inTime,
            outTime: res.outTime,
            stayDuration: res.stayDuration,
            isLate: res.isLate,
            name: studentName,
            rollNo,
            date: today,
            timestamp: punchTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });

          // Add to recent punches live stream
          setRecentPunches(prev => [
            {
              id: `${studentId}_${Date.now()}`,
              name: studentName,
              rollNo,
              action: res.action,
              time: punchTime,
              duration: res.stayDuration,
              isLate: res.isLate,
            },
            ...prev.slice(0, 19)
          ]);

          onStudentMarked?.({ id: studentId, name: studentName, rollNo });
        } else {
          throw new Error(res.message);
        }

      } else {
        // ==========================================
        // SCENARIO B: STUDENT MODE (Scanning Class/School Attendance QR)
        // ==========================================
        let schoolId = currentStudent?.schoolId || "";
        let classId = currentStudent?.classId || "";
        let className = currentStudent?.className || targetClassName || "";
        let qrDate = today;

        if (parsedJson && parsedJson.type === "NSTA_ATTENDANCE_QR") {
          schoolId = parsedJson.schoolId || schoolId;
          classId = parsedJson.classId || classId;
          className = parsedJson.className || className;
          qrDate = parsedJson.date || today;
        } else if (decodedText.startsWith("NSTA-ATTENDANCE:")) {
          // Format: NSTA-ATTENDANCE:schoolId:classId:date
          const parts = decodedText.split(":");
          schoolId = parts[1] || schoolId;
          classId = parts[2] || classId;
          qrDate = parts[3] || today;
        } else if (parsedJson && parsedJson.schoolId && parsedJson.classId) {
          schoolId = parsedJson.schoolId;
          classId = parsedJson.classId;
          className = parsedJson.className || className;
        } else {
          throw new Error("Ye official School Attendance QR code nahi hai. Kripya teacher ya smart board ka QR scan karein.");
        }

        if (!currentStudent?.id) {
          throw new Error("Student profile detect nahi hui. Kripya login check karein.");
        }

        const res = await markStudentQrAttendance({
          schoolId,
          classId,
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          rollNo: currentStudent.rollNo || "",
          date: qrDate,
          markedBy: "STUDENT_SELF_QR",
          scanMode,
          cutoffTime,
        });

        if (res.success) {
          playSoundCorrect();
          hapticStrong();
          const punchTime = res.action === "in" ? (res.inTime || "") : (res.outTime || "");
          setLastScannedResult({
            success: true,
            title: res.action === "in" ? "Haziri (Punch-In) Safalta se Darj! ✅" : "School Exit (Punch-Out) Safalta se Darj! 🚪",
            message: res.action === "in"
              ? `${currentStudent.name}, aapki attendance (${res.inTime}) me darj ho gayi hai.`
              : `${currentStudent.name}, Exit time (${res.outTime}) darj ho gaya. Stay: ${res.stayDuration || "Completed"}`,
            action: res.action,
            inTime: res.inTime,
            outTime: res.outTime,
            stayDuration: res.stayDuration,
            isLate: res.isLate,
            name: currentStudent.name,
            rollNo: currentStudent.rollNo,
            className,
            date: qrDate,
            timestamp: punchTime,
          });
        } else {
          throw new Error(res.message);
        }
      }

    } catch (err: any) {
      playSoundWrong();
      hapticMedium();
      console.warn("[QR Attendance Error]:", err);
      setLastScannedResult({
        success: false,
        title: "Scan Fail Ho Gaya",
        message: err?.message || "Valid Attendance QR nahi mila. Kripya dobara try karein.",
      });
    } finally {
      // Allow re-scanning after 1.8 seconds in continuous teacher mode
      setTimeout(() => {
        setProcessing(false);
      }, isTeacherMode ? 1500 : 2500);
    }
  }, [processing, isTeacherMode, targetSchoolId, targetClassId, targetClassName, teacherId, currentStudent, onStudentMarked]);

  // Start the camera scanner
  const startScanner = useCallback(async (facing: "environment" | "user") => {
    setCameraError(null);
    setLastScannedResult(null);

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode(containerId.current, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: facing },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // frame decode failed (normal when no QR in view)
        }
      );

      setCameraActive(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities = scanner.getRunningTrackCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        }
      } catch {}

    } catch (err: any) {
      console.error("[QR Scanner] Camera Start Error:", err);
      setCameraActive(false);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied hai. Kripya browser settings me Camera allow karein ya image upload karein."
          : "Camera shuru nahi ho paya. Kripya camera permissions check karein ya photo upload karein."
      );
    }
  }, [stopScanner, handleDecodedText]);

  // Switch Camera Front / Back
  const toggleCamera = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startScanner(nextFacing);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  // Scan from file input
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setCameraError(null);

    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId.current, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        await handleDecodedText(decodedText);
      }
    } catch (err: any) {
      playSoundWrong();
      setLastScannedResult({
        success: false,
        title: "QR Code Read Nahi Hua",
        message: "Chuni hui image me saaf QR code nahi mila. Kripya saaf photo upload karein.",
      });
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Mount effect
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startScanner(facingMode);
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Camera size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 truncate">
                <span>{isTeacherMode ? "Student QR Scanner" : "QR Attendance Scanner"}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {isTeacherMode
                  ? `${targetClassName || "Class"} • Entry + Exit Time Track`
                  : currentStudent?.schoolName || "Classroom ka Attendance QR scan karein"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scan Mode & Time Options (Punch In / Exit) */}
        {isTeacherMode && (
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setScanMode("auto")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${scanMode === "auto" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                Auto (In/Exit)
              </button>
              <button
                type="button"
                onClick={() => setScanMode("in")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${scanMode === "in" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                🟢 Entry Only
              </button>
              <button
                type="button"
                onClick={() => setScanMode("out")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${scanMode === "out" ? "bg-amber-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                🚪 Exit Only
              </button>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Cutoff:</span>
              <input
                type="time"
                value={cutoffTime}
                onChange={e => setCutoffTime(e.target.value)}
                className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 text-[11px] outline-hidden cursor-pointer"
                title="School cutoff time for late arrival"
              />
            </div>
          </div>
        )}

        {/* Main Camera Viewfinder Body */}
        <div className="relative flex-1 bg-black flex flex-col items-center justify-center min-h-[300px] sm:min-h-[340px] overflow-hidden">
          
          {/* html5-qrcode mount target */}
          <div id={containerId.current} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

          {/* Scanner Overlay Visuals (Only if camera is active and no blocking result) */}
          {cameraActive && !lastScannedResult?.success && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Reticle Box */}
              <div className="relative w-64 h-64 border-2 border-indigo-400/40 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* 4 Corner Accents */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

                {/* Animated Laser Scanning Beam */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#818cf8] animate-[bounce_2s_infinite]" />
              </div>

              <div className="mt-4 px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400 animate-spin" />
                <span>
                  {scanMode === "in" ? "Entry Scan: Student ID card dikhayein" :
                   scanMode === "out" ? "Exit Scan: Student ID card dikhayein" :
                   "QR Code ko center me layein"}
                </span>
              </div>
            </div>
          )}

          {/* Camera Error State */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertCircle size={28} />
              </div>
              <p className="text-sm font-bold text-white max-w-xs">{cameraError}</p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startScanner(facingMode)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95"
                >
                  <RefreshCw size={13} /> Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black flex items-center gap-1.5 border border-slate-700 transition active:scale-95"
                >
                  <Upload size={13} /> Upload QR
                </button>
              </div>
            </div>
          )}

          {/* Scanned Result Card Overlay */}
          {lastScannedResult && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in zoom-in-95 duration-200">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg ${
                lastScannedResult.success
                  ? lastScannedResult.action === "out"
                    ? "bg-amber-500/20 border-2 border-amber-400 text-amber-400 shadow-amber-500/20"
                    : lastScannedResult.isLate
                    ? "bg-orange-500/20 border-2 border-orange-400 text-orange-400 shadow-orange-500/20"
                    : "bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-emerald-500/20"
                  : "bg-rose-500/20 border-2 border-rose-400 text-rose-400 shadow-rose-500/20"
              }`}>
                {lastScannedResult.success ? <CheckCircle2 size={36} /> : <AlertCircle size={36} />}
              </div>

              <h4 className="text-lg font-black text-white">{lastScannedResult.title}</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                {lastScannedResult.message}
              </p>

              {lastScannedResult.success && lastScannedResult.name && (
                <div className="mt-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 w-full max-w-xs text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Student:</span>
                    <span className="font-black text-white">{lastScannedResult.name}</span>
                  </div>
                  {lastScannedResult.rollNo && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Roll No:</span>
                      <span className="font-bold text-indigo-300">{lastScannedResult.rollNo}</span>
                    </div>
                  )}
                  {lastScannedResult.inTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Entry (In-Time):</span>
                      <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        {lastScannedResult.inTime}
                      </span>
                    </div>
                  )}
                  {lastScannedResult.outTime && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Exit (Out-Time):</span>
                      <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                        {lastScannedResult.outTime}
                      </span>
                    </div>
                  )}
                  {lastScannedResult.stayDuration && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Stay:</span>
                      <span className="font-black text-sky-300">
                        ⏱️ {lastScannedResult.stayDuration}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2.5 mt-5 w-full max-w-xs">
                {isTeacherMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLastScannedResult(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
                  >
                    <span>Agla Student Scan Karein</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      stopScanner();
                      onClose();
                    }}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/30"
                  >
                    <CheckCircle2 size={15} />
                    <span>Done (Ho Gaya)</span>
                  </button>
                )}

                {!lastScannedResult.success && (
                  <button
                    type="button"
                    onClick={() => setLastScannedResult(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
                  >
                    Retry Scan
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Live Recent Scans Log Feed (Visible in Teacher mode) */}
        {isTeacherMode && recentPunches.length > 0 && (
          <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-2.5 max-h-24 overflow-y-auto shrink-0 space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Punch Activity:</p>
            {recentPunches.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs py-0.5 text-slate-300">
                <span className="font-semibold line-clamp-1">{p.name} {p.rollNo ? `(#${p.rollNo})` : ""}</span>
                <span className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                  {p.action === "in" ? (
                    <span className={p.isLate ? "text-orange-400" : "text-emerald-400"}>
                      IN {p.time} {p.isLate ? "(Late)" : ""}
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      EXIT {p.time} {p.duration ? `(${p.duration})` : ""}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer Controls & Actions */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {/* Left: Continuous count / status */}
          <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
            {isTeacherMode ? (
              <span className="px-2.5 py-1 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 font-black">
                Scanned: {continuousCount}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-300">
                <School size={13} className="text-indigo-400" />
                <span>Attendance System</span>
              </span>
            )}
          </div>

          {/* Right: Quick Camera Toggles */}
          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2.5 rounded-xl border transition-all active:scale-90 ${
                  torchOn
                    ? "bg-amber-400 text-slate-900 border-amber-300 shadow-md shadow-amber-400/30"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
                title={torchOn ? "Torch Off" : "Torch On"}
              >
                {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
              </button>
            )}

            <button
              type="button"
              onClick={toggleCamera}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-90"
              title="Switch Front/Back Camera"
            >
              <RefreshCw size={16} />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-90"
              title="Upload QR Image"
            >
              <Upload size={16} />
            </button>
          </div>
        </div>

        {/* Hidden File Input for scanning photos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileScan}
        />
      </div>
    </div>
  );
};
