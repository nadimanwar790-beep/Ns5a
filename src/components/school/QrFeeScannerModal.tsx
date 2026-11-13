// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import jsQR from "jsqr";
import {
  X, Camera, RefreshCw, Zap, ZapOff, CheckCircle2, AlertCircle,
  Upload, UserCheck, ShieldCheck, Sparkles, School, Volume2, ArrowRight,
  Clock, ZoomIn, Image as ImageIcon, FolderOpen, FileCheck2, Smartphone,
  IndianRupee, Search, ReceiptText, Bus
} from "lucide-react";
import type { SchoolStudent, MonthlyFee, SchoolClass } from "../../school-types";
import { playSoundCorrect, playSoundWrong } from "../../utils/soundEffects";
import { hapticStrong, hapticMedium } from "../../utils/haptic";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  students: SchoolStudent[];
  fees: MonthlyFee[];
  classes?: SchoolClass[];
  onSelectStudentForPayment: (student: SchoolStudent, fee?: MonthlyFee) => void;
  onSelectStudentForReceipt?: (fee: MonthlyFee) => void;
}

/**
 * Universal ID Card QR Decoder:
 * Decodes:
 * 1. NSTA-SCHOOL:schoolId:studentId:rollNo:classId:studentName:admissionNo:phone:...
 * 2. URL params ?u=..., ?studentId=..., ?roll=..., ?admissionNo=...
 * 3. JSON payload
 * 4. Raw Student ID, Admission No, or Roll Number
 */
export function parseIdCardQr(rawText: string) {
  const text = (rawText || "").trim();
  let studentId = "";
  let rollNo = "";
  let admissionNo = "";
  let studentName = "";
  let classId = "";

  const decodePart = (val: string) => {
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  };

  // Case 1: NSTA-SCHOOL format (Standard generated ID Card QR)
  if (text.startsWith("NSTA-SCHOOL:") || text.startsWith("NSTA-SCHOOL-STAFF:")) {
    const rawParts = text.replace(/^NSTA-SCHOOL(-STAFF)?:/, "").split(":");
    const parts = rawParts.map(decodePart);
    if (parts.length >= 2) {
      studentId = parts[1] || "";
      rollNo = parts[2] || "";
      classId = parts[3] || "";
      studentName = parts[4] || "";
      admissionNo = parts[5] || "";
    }
    return { studentId, rollNo, admissionNo, studentName, classId };
  }

  // Case 2: URL with query parameters or hash
  if (text.includes("?") || text.includes("#")) {
    try {
      const url = new URL(text.startsWith("http") ? text : `https://nsta.app/${text.replace(/^\//, "")}`);
      studentId = url.searchParams.get("u") || url.searchParams.get("uid") || url.searchParams.get("studentId") || "";
      rollNo = url.searchParams.get("r") || url.searchParams.get("roll") || url.searchParams.get("rollNo") || "";
      admissionNo = url.searchParams.get("adm") || url.searchParams.get("admissionNo") || "";
      studentName = url.searchParams.get("n") || url.searchParams.get("name") || "";
      classId = url.searchParams.get("c") || url.searchParams.get("classId") || "";
      if (studentId || rollNo || admissionNo) {
        return { studentId, rollNo, admissionNo, studentName, classId };
      }
    } catch (err) {
      console.warn("[QrFeeScannerModal] URL QR parse warning:", err);
    }
  }

  // Case 3: JSON payload
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      studentId = parsed.id || parsed.studentId || parsed.uid || "";
      rollNo = parsed.rollNo || parsed.roll || "";
      admissionNo = parsed.admissionNo || parsed.admNo || "";
      studentName = parsed.name || parsed.studentName || "";
      classId = parsed.classId || "";
      return { studentId, rollNo, admissionNo, studentName, classId };
    } catch (err) {
      console.warn("[QrFeeScannerModal] JSON QR parse warning:", err);
    }
  }

  // Case 4: Raw text is student ID, Admission No, or Roll No
  return {
    studentId: text.startsWith("std_") || text.startsWith("demo_std_") ? text : "",
    admissionNo: text.toUpperCase().startsWith("ADM") ? text : "",
    rollNo: text.length <= 6 ? text : "",
    studentName: "",
    classId: "",
  };
}

export const QrFeeScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  students = [],
  fees = [],
  classes = [],
  onSelectStudentForPayment,
  onSelectStudentForReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "manual">("camera");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [matchedStudent, setMatchedStudent] = useState<SchoolStudent | null>(null);
  const [matchedFee, setMatchedFee] = useState<MonthlyFee | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = "nsta-fee-qr-scanner-region";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Match scanned token to student
  const resolveStudentFromScan = (decodedText: string): { student: SchoolStudent | null; fee: MonthlyFee | null } => {
    const parsed = parseIdCardQr(decodedText);
    const cleanScan = decodedText.trim().toLowerCase();

    // 1. Direct ID match
    let found = students.find(s => {
      if (parsed.studentId && s.id === parsed.studentId) return true;
      if (parsed.admissionNo && (s.admissionNo || "").toLowerCase() === parsed.admissionNo.toLowerCase()) return true;
      if (parsed.rollNo && (s.rollNo || "").toLowerCase() === parsed.rollNo.toLowerCase()) return true;
      if (s.id && cleanScan === s.id.toLowerCase()) return true;
      if (s.rollNo && cleanScan === s.rollNo.toLowerCase()) return true;
      if (s.admissionNo && cleanScan === (s.admissionNo || "").toLowerCase()) return true;
      return false;
    });

    // 2. Name + Roll fallback match
    if (!found && parsed.studentName) {
      found = students.find(s =>
        s.name.toLowerCase().includes(parsed.studentName.toLowerCase()) ||
        parsed.studentName.toLowerCase().includes(s.name.toLowerCase())
      );
    }

    // 3. Substring match for roll in token
    if (!found && parsed.rollNo) {
      found = students.find(s => (s.rollNo || "").toLowerCase() === parsed.rollNo.toLowerCase());
    }

    if (!found) {
      return { student: null, fee: null };
    }

    const fee = fees.find(f => f.studentId === found!.id) || null;
    return { student: found, fee };
  };

  const handleScanSuccess = (decodedText: string) => {
    if (!decodedText) return;
    const { student, fee } = resolveStudentFromScan(decodedText);

    if (student) {
      playSoundCorrect();
      hapticStrong();
      setMatchedStudent(student);
      setMatchedFee(fee);
      stopCamera();
    } else {
      playSoundWrong();
      hapticMedium();
      setCameraError(`QR detect hua ("${decodedText.slice(0, 30)}..."), lekin student nahi mila. Manual search try karein.`);
    }
  };

  const startCamera = async (cameraIdToUse?: string) => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          console.warn("[QrFeeScannerModal] Previous scanner stop warning:", err);
        }
      }

      const html5QrCode = new Html5Qrcode(qrRegionId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCam = devices.find(d =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        );
        const activeCamId = cameraIdToUse || (backCam ? backCam.id : devices[0].id);
        setSelectedCameraId(activeCamId);

        await html5QrCode.start(
          activeCamId,
          {
            fps: 15,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => handleScanSuccess(decodedText),
          () => {}
        );
        setIsScanning(true);

        // Check torch capability
        try {
          const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
          if (track && track.torchFeature?.().isSupported()) {
            setHasTorch(true);
          }
        } catch (err) {
          console.warn("[QrFeeScannerModal] Torch capability check warning:", err);
        }
      } else {
        setCameraError("Camera nahi mila. Kripya QR photo upload karein ya Roll Number se search karein.");
      }
    } catch (err: any) {
      console.warn("Camera scan error:", err);
      setCameraError("Camera open nahi ho paya. Permission allow karein ya QR image upload karein.");
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn("[QrFeeScannerModal] Stop camera warning:", err);
      }
      setIsScanning(false);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("[QrFeeScannerModal] Torch toggle warning:", err);
    }
  };

  const handleCameraSwitch = (newCamId: string) => {
    setSelectedCameraId(newCamId);
    startCamera(newCamId);
  };

  // Decode from file / image upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDecodingFile(true);
    setCameraError(null);

    try {
      // 1. Try Html5Qrcode scanner
      const html5Qr = new Html5Qrcode("nsta-file-decoder-temp");
      try {
        const decoded = await html5Qr.scanFile(file, true);
        if (decoded) {
          handleScanSuccess(decoded);
          setIsDecodingFile(false);
          return;
        }
      } catch (err) {
        console.warn("[QrFeeScannerModal] html5Qr scanFile fallback to jsQR:", err);
      }

      // 2. Canvas + jsQR fallback
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              handleScanSuccess(code.data);
            } else {
              setCameraError("Is image me valid QR code detect nahi hua. Kripya saaf photo upload karein ya Roll Number likhein.");
            }
          }
          setIsDecodingFile(false);
        };
        img.onerror = () => {
          setCameraError("Photo load nahi ho payi.");
          setIsDecodingFile(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setCameraError("Image decode karne me error: " + (err?.message || "Please retry"));
      setIsDecodingFile(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "camera" && !matchedStudent) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, matchedStudent]);

  if (!isOpen) return null;

  // Filtered students for manual search tab
  const manualMatches = manualQuery.trim()
    ? students.filter(s => {
        const q = manualQuery.trim().toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(q) ||
          (s.rollNo || "").toLowerCase().includes(q) ||
          (s.admissionNo || "").toLowerCase().includes(q) ||
          (s.phone || "").includes(q)
        );
      }).slice(0, 10)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div id="nsta-file-decoder-temp" className="hidden"></div>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-4 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-1.5">
                Scan ID Card QR Code
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase">
                  Fee Collect
                </span>
              </h2>
              <p className="text-xs text-blue-100">
                Student ke ID Card ka QR code scan karke direct fee jama karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        {!matchedStudent && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => { setActiveTab("camera"); startCamera(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "camera"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera Scan</span>
            </button>
            <button
              onClick={() => { setActiveTab("upload"); stopCamera(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "upload"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload QR Photo</span>
            </button>
            <button
              onClick={() => { setActiveTab("manual"); stopCamera(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "manual"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Roll / Name</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col justify-center">
          {/* SUCCESS MATCH RESULT VIEW */}
          {matchedStudent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                    ✓ Student ID Card QR Verified
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {matchedStudent.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Roll No: <strong className="text-slate-800 dark:text-slate-200">{matchedStudent.rollNo}</strong> • Class: {classes.find(c => c.id === matchedStudent.classId)?.name || matchedStudent.classId || "Class"} • Adm: {matchedStudent.admissionNo || "—"}
                  </p>
                </div>

                {/* Fee Status Summary Card */}
                {(() => {
                  const fee = matchedFee || {
                    amount: matchedStudent.monthlyFee ?? 0,
                    paid: false,
                    paidAmount: 0,
                    balanceDue: matchedStudent.monthlyFee ?? 0,
                  };
                  const isPaid = Boolean(fee.paid);
                  const total = Number(fee.amount || fee.monthlyAmount || 0);
                  const paidAmt = Number(fee.paidAmount || (isPaid ? total : 0));
                  const dueAmt = isPaid ? 0 : Math.max(0, total - paidAmt);

                  return (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 grid grid-cols-3 gap-2 text-center">
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-500 block font-bold">Total Bill</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">₹{total.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60">
                        <span className="text-[10px] text-emerald-600 font-bold block">Paid Amount</span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">₹{paidAmt.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60">
                        <span className="text-[10px] text-rose-600 font-bold block">Balance Due</span>
                        <span className="text-xs font-black text-rose-700 dark:text-rose-300">₹{dueAmt.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Bus Indicator if student is taking bus */}
                {matchedStudent.usesBus && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-800">
                    <Bus className="w-4 h-4 text-teal-600" />
                    <span>Bus Service Active ({matchedStudent.busRoute || "Daily Route"}) • Bus Fee: ₹{matchedStudent.busFee ?? 0}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for this student */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectStudentForPayment(matchedStudent, matchedFee);
                    onClose();
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-98 transition cursor-pointer"
                >
                  <IndianRupee className="w-5 h-5 text-amber-300" />
                  <span>💳 Collect / Pay Fee for {matchedStudent.name}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {matchedFee && onSelectStudentForReceipt && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectStudentForReceipt(matchedFee);
                        onClose();
                      }}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <ReceiptText className="w-4 h-4 text-blue-600" />
                      <span>Official Fee Slip</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMatchedStudent(null);
                      setMatchedFee(null);
                      setCameraError(null);
                      setActiveTab("camera");
                    }}
                    className={`py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      !matchedFee || !onSelectStudentForReceipt ? "col-span-2" : ""
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Scan Next Student</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: LIVE CAMERA SCANNER */}
              {activeTab === "camera" && (
                <div className="space-y-4">
                  {cameraError && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div className="relative mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black border-4 border-blue-500 shadow-xl flex items-center justify-center">
                    <div id={qrRegionId} className="w-full h-full object-cover"></div>

                    {/* Viewfinder Overlay */}
                    <div className="absolute inset-0 pointer-events-none border-2 border-white/30 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-dashed border-amber-400 rounded-xl animate-pulse"></div>
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {cameras.length > 1 && (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => handleCameraSwitch(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white font-medium max-w-[180px] truncate"
                      >
                        {cameras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label || `Camera ${c.id.slice(0, 4)}`}
                          </option>
                        ))}
                      </select>
                    )}

                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition ${
                          torchOn ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                        <span>Torch</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => startCamera(selectedCameraId)}
                      className="ml-auto px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Restart</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-center text-slate-400">
                    💡 Student ID Card ko camera ke samne sidha rakhein
                  </p>
                </div>
              )}

              {/* TAB 2: UPLOAD QR PHOTO */}
              {activeTab === "upload" && (
                <div className="space-y-4 text-center py-4">
                  {cameraError && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-xs text-amber-900 text-left flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-400 hover:border-blue-600 dark:border-blue-700 dark:hover:border-blue-500 rounded-3xl p-8 bg-blue-50/50 dark:bg-blue-950/20 cursor-pointer transition flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {isDecodingFile ? "Scanning QR Code..." : "Click to Select ID Card Photo"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Gallery se student ID card ka screenshot ya photo upload karein
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isDecodingFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700"
                    >
                      {isDecodingFile ? "Processing..." : "Browse Photo"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SEARCH MANUAL */}
              {activeTab === "manual" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Student Name, Roll No (e.g. 70), ya Admission No likhein..."
                      value={manualQuery}
                      onChange={(e) => setManualQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    {manualMatches.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          const fee = fees.find(f => f.studentId === st.id) || null;
                          setMatchedStudent(st);
                          setMatchedFee(fee);
                        }}
                        className="p-3 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-between cursor-pointer transition"
                      >
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{st.name}</p>
                          <p className="text-xs text-slate-500">
                            Roll No: <strong>{st.rollNo}</strong> • Adm: {st.admissionNo || "—"}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-lg">
                          Select
                        </span>
                      </div>
                    ))}
                    {manualQuery && manualMatches.length === 0 && (
                      <p className="p-4 text-center text-xs text-slate-400">
                        Koi student nahi mila "{manualQuery}" ke naam se.
                      </p>
                    )}
                    {!manualQuery && (
                      <p className="p-4 text-center text-xs text-slate-400">
                        Search box me roll number ya student name likhein
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
