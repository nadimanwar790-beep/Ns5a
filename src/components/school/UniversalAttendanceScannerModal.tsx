// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import jsQR from "jsqr";
import {
  X, Camera, RefreshCw, Zap, ZapOff, CheckCircle2,
  AlertCircle, Upload, ShieldCheck, Sparkles, Clock,
  Users, Crown, UserCheck, ArrowRight, Volume2, LogIn,
  LogOut, Phone
} from "lucide-react";
import type { School, SchoolClass, SchoolStudent, SchoolTeacher } from "../../school-types";
import {
  todayStr, getAdminAttendance, saveAdminAttendance,
  getStaffDailyAttendance, saveStaffDailyAttendance,
  markStudentQrAttendance
} from "../../school-firebase";
import { playSoundCorrect } from "../../utils/soundEffects";
import { hapticStrong } from "../../utils/haptic";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  teachers: SchoolTeacher[];
  onOpenFaceKiosk?: () => void;
}

interface ScanResultCard {
  role: "ADMIN" | "TEACHER" | "STUDENT";
  name: string;
  idOrRoll: string;
  className?: string;
  action: "in" | "out";
  time: string;
  stayDuration?: string;
  photoUrl?: string;
}

export const UniversalAttendanceScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  classes = [],
  students = [],
  teachers = [],
  onOpenFaceKiosk,
}) => {
  const [scanMode, setScanMode] = useState<"auto" | "in" | "out">("auto");
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentScanResult, setRecentScanResult] = useState<ScanResultCard | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = "universal-attendance-qr-reader";

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        // Silently handled
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  // Start scanner
  const startScanner = async () => {
    await stopScanner();
    const elem = document.getElementById(scannerContainerId);
    if (!elem) return;

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: cameraFacing },
        config,
        (decodedText) => {
          handleDecodedPayload(decodedText);
        },
        () => {
          // Frame error ignored
        }
      );
      setScannerActive(true);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(
        "कैमरा शुरू नहीं हो सका: " +
          (err?.message || "कृपया कैमरा अनुमति जांचें या नीचे 'फाइल से स्कैन करें' चुनें।")
      );
      setScannerActive(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM node to render
      const timer = setTimeout(() => {
        startScanner();
      }, 350);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, cameraFacing]);

  // Decode handler
  const handleDecodedPayload = async (rawText: string) => {
    if (scanCooldown) return;
    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), 2200);

    const now = new Date();
    const nowTime = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const today = todayStr();

    let matchedRole: "ADMIN" | "TEACHER" | "STUDENT" | null = null;
    let matchedId = "";
    let matchedName = "";
    let matchedClassId = "";
    let matchedClassName = "";
    let matchedRoll = "";
    let matchedPhoto = "";

    // Parse Token
    // Case 1: Admin Token or NSTA-SCHOOL-STAFF with SCHOOL_ADMIN
    if (
      rawText.includes("ADMIN-01") ||
      rawText.includes("SCHOOL_ADMIN") ||
      rawText.toLowerCase().includes("principal") ||
      (school.principalName && rawText.includes(encodeURIComponent(school.principalName)))
    ) {
      matchedRole = "ADMIN";
      matchedId = "ADMIN-01";
      matchedName = school.principalName || "School Admin";
      matchedPhoto = school.logoUrl || "";
    }
    // Case 2: NSTA-SCHOOL-STAFF:schoolId:id:empId:dept:name...
    else if (rawText.startsWith("NSTA-SCHOOL-STAFF:") || rawText.includes("NSTA-SCHOOL-STAFF:")) {
      const parts = rawText.replace("NSTA-SCHOOL-STAFF:", "").split(":");
      const empOrId = decodeURIComponent(parts[1] || "");
      const teacherName = decodeURIComponent(parts[4] || "");
      const designation = decodeURIComponent(parts[13] || "");

      if (designation === "SCHOOL_ADMIN" || empOrId === "ADMIN-01") {
        matchedRole = "ADMIN";
        matchedId = "ADMIN-01";
        matchedName = teacherName || school.principalName || "School Admin";
        matchedPhoto = school.logoUrl || "";
      } else {
        // Teacher
        const foundT = teachers.find(
          (t) =>
            t.id === empOrId ||
            t.employeeId === empOrId ||
            (teacherName && t.name.toLowerCase() === teacherName.toLowerCase())
        );
        matchedRole = "TEACHER";
        matchedId = foundT ? foundT.id : empOrId || `TEA-${Date.now().toString().slice(-4)}`;
        matchedName = foundT ? foundT.name : teacherName || "Teacher";
        matchedPhoto = foundT?.photoUrl || "";
      }
    }
    // Case 3: NSTA-SCHOOL Student Token or URL parameter
    else if (rawText.includes("NSTA-SCHOOL:") || rawText.includes("?u=") || rawText.includes("studentId=")) {
      // Find student in entire school student directory
      let foundSt: SchoolStudent | undefined;

      if (rawText.includes("NSTA-SCHOOL:")) {
        const parts = rawText.split("NSTA-SCHOOL:")[1].split(":");
        const stId = decodeURIComponent(parts[1] || "");
        const roll = decodeURIComponent(parts[2] || "");
        const clsId = decodeURIComponent(parts[3] || "");
        foundSt = students.find((s) => s.id === stId || (clsId && s.classId === clsId && s.rollNo === roll));
      } else {
        try {
          const url = new URL(rawText.startsWith("http") ? rawText : `https://nsta.app/${rawText}`);
          const u = url.searchParams.get("u") || url.searchParams.get("studentId");
          if (u) {
            foundSt = students.find((s) => s.id === u);
          }
        } catch (err) {
          console.warn("[UniversalAttendanceScannerModal] URL QR parse warning:", err);
        }
      }

      if (foundSt) {
        matchedRole = "STUDENT";
        matchedId = foundSt.id;
        matchedName = foundSt.name;
        matchedClassId = foundSt.classId;
        matchedClassName = classes.find((c) => c.id === foundSt.classId)?.name || "Class Student";
        matchedRoll = foundSt.rollNo;
        matchedPhoto = foundSt.photoUrl || "";
      }
    }

    // Fallback: Check if raw text matches any student ID or Roll number
    if (!matchedRole) {
      const clean = rawText.trim();
      const byId = students.find((s) => s.id === clean || s.admissionNo === clean);
      if (byId) {
        matchedRole = "STUDENT";
        matchedId = byId.id;
        matchedName = byId.name;
        matchedClassId = byId.classId;
        matchedClassName = classes.find((c) => c.id === byId.classId)?.name || "Class";
        matchedRoll = byId.rollNo;
        matchedPhoto = byId.photoUrl || "";
      } else {
        const byTeacher = teachers.find((t) => t.id === clean || t.employeeId === clean);
        if (byTeacher) {
          matchedRole = "TEACHER";
          matchedId = byTeacher.id;
          matchedName = byTeacher.name;
          matchedPhoto = byTeacher.photoUrl || "";
        }
      }
    }

    if (!matchedRole) {
      setErrorMessage("अमान्य या अपरिचित QR कोड। कृपया मान्य NSTA ID कार्ड स्कैन करें।");
      return;
    }

    // Process Punch for Matched Role
    let finalAction: "in" | "out" = "in";
    let stayDuration: string | undefined;

    if (matchedRole === "ADMIN") {
      const currentAdminAtt = getAdminAttendance(school.id, today);
      if (scanMode === "in") finalAction = "in";
      else if (scanMode === "out") finalAction = "out";
      else finalAction = currentAdminAtt.inTime ? "out" : "in";

      const updatedAdminAtt = {
        ...currentAdminAtt,
        schoolId: school.id,
        adminId: "ADMIN-01",
        adminName: matchedName,
        date: today,
        present: true,
        inTime: finalAction === "in" ? nowTime : (currentAdminAtt.inTime || nowTime),
        outTime: finalAction === "out" ? nowTime : currentAdminAtt.outTime,
        locationStatus: "inside_campus" as const,
        updatedAt: now.toISOString(),
      };
      await saveAdminAttendance(updatedAdminAtt);
    } else if (matchedRole === "TEACHER") {
      const staffAtt = getStaffDailyAttendance(school.id, today);
      const existing = staffAtt.records[matchedId];

      if (scanMode === "in") finalAction = "in";
      else if (scanMode === "out") finalAction = "out";
      else finalAction = existing?.inTime ? "out" : "in";

      staffAtt.records[matchedId] = {
        id: matchedId,
        name: matchedName,
        role: "TEACHER",
        employeeId: matchedId,
        present: true,
        status: "present",
        inTime: finalAction === "in" ? nowTime : (existing?.inTime || nowTime),
        outTime: finalAction === "out" ? nowTime : existing?.outTime,
      };
      await saveStaffDailyAttendance(staffAtt);
    } else if (matchedRole === "STUDENT") {
      const res = await markStudentQrAttendance({
        schoolId: school.id,
        classId: matchedClassId,
        studentId: matchedId,
        studentName: matchedName,
        rollNo: matchedRoll,
        date: today,
        scanMode,
        markedBy: "UNIVERSAL_SCANNER",
      });
      finalAction = res.action;
      stayDuration = res.stayDuration;

      // Dispatch parent push notification
      sendSchoolPushNotification({
        schoolId: school.id,
        classId: matchedClassId,
        studentId: matchedId,
        title: `स्कूल हाजिरी: ${matchedName}`,
        body: `${matchedName} का ${finalAction === "in" ? "आगमन समय" : "प्रस्थान समय"} ${nowTime} दर्ज हुआ।`,
      }).catch(() => {});
    }

    playSoundCorrect();
    hapticStrong();

    const actionText = finalAction === "in" ? "आगमन" : "प्रस्थान";
    speakNotification(
      `${matchedName} ${actionText}`,
      `${matchedName} का ${actionText} समय ${nowTime} दर्ज हुआ।`
    );

    setRecentScanResult({
      role: matchedRole,
      name: matchedName,
      idOrRoll: matchedRole === "STUDENT" ? `Roll #${matchedRoll}` : matchedId,
      className: matchedClassName,
      action: finalAction,
      time: nowTime,
      stayDuration,
      photoUrl: matchedPhoto,
    });
  };

  // Handle Image File Upload QR
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedPayload(code.data);
          } else {
            setErrorMessage("छवि में कोई मान्य QR कोड नहीं मिला। कृपया स्पष्ट फोटो चुनें।");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  यूनिवर्सल हाजिरी स्कैनर (Universal QR Punch)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white">
                  ALL-IN-ONE
                </span>
              </div>
              <p className="text-xs text-purple-200/90 font-medium">
                किसी भी क्लास के छात्र, शिक्षक या स्कूल एडमिन का QR कोड स्कैन करें
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Mode Toggle Strip (Auto, In, Out) */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">पंच प्रकार:</span>
          <div className="grid grid-cols-3 gap-1.5 flex-1 max-w-xs">
            <button
              type="button"
              onClick={() => setScanMode("auto")}
              className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer ${
                scanMode === "auto"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            >
              🔄 Auto (IN/OUT)
            </button>
            <button
              type="button"
              onClick={() => setScanMode("in")}
              className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer ${
                scanMode === "in"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            >
              🟢 Punch IN
            </button>
            <button
              type="button"
              onClick={() => setScanMode("out")}
              className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer ${
                scanMode === "out"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            >
              🟠 Punch OUT
            </button>
          </div>
        </div>

        {/* Camera Viewport Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex flex-col items-center">
          {/* Error Message */}
          {errorMessage && (
            <div className="w-full p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Scanner Box with Target Reticle */}
          <div className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden bg-black border-4 border-purple-500/40 shadow-2xl flex items-center justify-center">
            <div id={scannerContainerId} className="w-full h-full object-cover" />

            {/* Glowing Crosshair Reticle */}
            <div className="absolute inset-8 border-2 border-purple-400/80 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
            </div>

            {/* Camera Floating Controls */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-20 pointer-events-auto">
              <button
                type="button"
                onClick={() => setCameraFacing((p) => (p === "environment" ? "user" : "environment"))}
                className="p-2.5 rounded-xl bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-800 transition active:scale-95 cursor-pointer shadow-md"
                title="Camera switch karein"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR</span>
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* RECENT SCAN SUCCESS HUD OVERLAY */}
          {recentScanResult && (
            <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl space-y-2 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20">
                  {recentScanResult.action === "in" ? "🟢 PUNCH IN (आगमन)" : "🟠 PUNCH OUT (प्रस्थान)"}
                </span>
                <span className="text-xs font-mono font-bold">{recentScanResult.time}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-xl font-black shrink-0 overflow-hidden">
                  {recentScanResult.photoUrl ? (
                    <img src={recentScanResult.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                  ) : recentScanResult.role === "ADMIN" ? (
                    "👑"
                  ) : recentScanResult.role === "TEACHER" ? (
                    "👨‍🏫"
                  ) : (
                    "🎓"
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="font-black text-sm text-white truncate">{recentScanResult.name}</h4>
                  <p className="text-xs text-emerald-100">
                    {recentScanResult.role === "ADMIN"
                      ? "School Administrator & Principal"
                      : recentScanResult.role === "TEACHER"
                      ? "Faculty Member"
                      : `${recentScanResult.className} • ${recentScanResult.idOrRoll}`}
                  </p>
                  {recentScanResult.stayDuration && (
                    <p className="text-[11px] text-teal-200 font-mono mt-0.5">
                      ⏱️ Stay: {recentScanResult.stayDuration}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shortcut to AI Face Attendance Kiosk */}
          {onOpenFaceKiosk && (
            <div className="w-full p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <h5 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                    Face Attendance (चेहरा पहचान हाजिरी)
                  </h5>
                  <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80">
                    AI फेस डिटेक्शन से बिना छुए 0.3 सेकंड में ऑटो हाजिरी
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  onOpenFaceKiosk();
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
              >
                Face Kiosk →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
