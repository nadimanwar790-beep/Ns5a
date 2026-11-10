// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Camera,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  UserCheck,
  Search,
  ShieldCheck,
  Users,
  AlertTriangle,
  Zap,
  Volume2,
  Check,
  ChevronRight,
  UserPlus
} from "lucide-react";
import {
  detectFacesInFrame,
  getSchoolFaceDescriptors,
  saveFaceDescriptor,
  extractDescriptorFromCanvas,
  enrollStudentFromPhotoUrl,
  playAttendanceSuccessChime,
  playCooldownTick,
  FaceDescriptorRecord,
  DetectedFaceBox
} from "../../utils/faceRecognitionEngine";
import { markStudentQrAttendance, todayStr } from "../../school-firebase";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { hapticStrong, hapticMedium } from "../../utils/haptic";
import { FaceEnrollmentModal } from "./FaceEnrollmentModal";

export interface FaceAttendanceKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  students: any[];
  teacherId?: string;
  onAttendanceUpdated?: () => void;
}

interface RecentCheckIn {
  studentId: string;
  name: string;
  rollNo?: string;
  className?: string;
  photoUrl?: string;
  time: string;
  status: "PRESENT" | "LATE" | "OUT";
  action: "in" | "out";
  stayDuration?: string;
  confidence: number;
}

export const FaceAttendanceKioskModal: React.FC<FaceAttendanceKioskModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName = "School Campus",
  classId,
  className,
  students = [],
  teacherId = "teacher",
  onAttendanceUpdated
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [enrolledMap, setEnrolledMap] = useState<Record<string, FaceDescriptorRecord>>({});
  const [loadingDescriptors, setLoadingDescriptors] = useState<boolean>(true);
  const [recentScans, setRecentScans] = useState<RecentCheckIn[]>([]);
  const [lastMatchedAlert, setLastMatchedAlert] = useState<{
    name: string;
    rollNo?: string;
    className?: string;
    photoUrl?: string;
    time: string;
    status: "PRESENT" | "LATE" | "OUT";
    action: "in" | "out";
    stayDuration?: string;
    confidence: number;
  } | null>(null);
  const [kioskScanMode, setKioskScanMode] = useState<"auto" | "in" | "out">("auto");

  const [cooldownToast, setCooldownToast] = useState<string | null>(null);
  const [manualSearchQuery, setManualSearchQuery] = useState<string>("");
  const [showManualSearch, setShowManualSearch] = useState<boolean>(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [hasFaceInView, setHasFaceInView] = useState<boolean>(false);

  // Scan cooldown tracker: studentId -> timestamp
  const scanCooldownsRef = useRef<Map<string, number>>(new Map());
  const isProcessingRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLiveDescriptorRef = useRef<number[] | null>(null);

  // Live Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load Enrolled Descriptors from IndexedDB & Auto-Enroll Roster
  const loadDescriptors = useCallback(async () => {
    setLoadingDescriptors(true);
    try {
      let map = await getSchoolFaceDescriptors(schoolId);
      setEnrolledMap(map);

      // Auto-enroll students who have real ID/admission photos in background
      if (students && students.length > 0) {
        const toEnroll = students.filter(
          (st) => st && st.photoUrl && typeof st.photoUrl === "string" && st.photoUrl.trim() && !map[st.id]
        );
        if (toEnroll.length > 0) {
          const enrolledRecords = await Promise.all(
            toEnroll.slice(0, 60).map((st) =>
              enrollStudentFromPhotoUrl({
                id: st.id,
                schoolId: schoolId || "default_school",
                name: st.name,
                rollNo: String(st.rollNo || ""),
                classId: st.classId || classId,
                className: st.className || className,
                photoUrl: st.photoUrl,
              })
            )
          );
          const updatedMap = { ...map };
          let anyAdded = false;
          enrolledRecords.forEach((rec) => {
            if (rec) {
              updatedMap[rec.studentId] = rec;
              anyAdded = true;
            }
          });
          if (anyAdded) {
            setEnrolledMap(updatedMap);
          }
        }
      }
    } catch (e) {
      console.warn("Error loading face descriptors:", e);
    } finally {
      setLoadingDescriptors(false);
    }
  }, [schoolId, students, classId, className]);

  useEffect(() => {
    if (isOpen) {
      loadDescriptors();
    }
  }, [isOpen, loadDescriptors]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("[FaceKiosk] Camera access note:", err?.name || err?.message || err);
      setCameraError(
        err?.name === "NotAllowedError" || err?.message?.includes("Permission denied")
          ? "कैमरा परमिशन नहीं मिली (Permission Denied). कृपया ब्राउज़र के URL बार में 🔒 या 📹 आइकन पर क्लिक करके 'Allow' करें।"
          : "कैमरा शुरू नहीं हो पाया। कृपया कैमरा कनेक्शन जांचें या पुनः प्रयास करें।"
      );
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, startCamera]);

  // Handle successful attendance marking
  const handleMarkAttendanceSuccess = useCallback(
    async (match: {
      studentId: string;
      name: string;
      rollNo?: string;
      classId?: string;
      className?: string;
      photoUrl?: string;
      confidencePercent: number;
    }) => {
      const now = Date.now();
      const lastScanned = scanCooldownsRef.current.get(match.studentId) || 0;

      // 60-Second Duplicate Scan Cooldown Guard
      if (now - lastScanned < 60000) {
        playCooldownTick();
        setCooldownToast(`${match.name} (Roll #${match.rollNo || "—"}) pehle se darj hai`);
        setTimeout(() => setCooldownToast(null), 2500);
        return;
      }

      scanCooldownsRef.current.set(match.studentId, now);

      // Play Sound Chime & Haptic
      playAttendanceSuccessChime();
      hapticStrong();

      const timeFormatted = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      // Target class ID resolution
      const targetClassId = match.classId || classId || "cls_default";
      const targetClassName = match.className || className || "Class";

      // 1. Mark in school database with selected gate mode (auto, in, out)
      try {
        const res = await markStudentQrAttendance({
          schoolId,
          classId: targetClassId,
          studentId: match.studentId,
          studentName: match.name,
          rollNo: match.rollNo,
          markedBy: teacherId,
          scanMode: kioskScanMode
        });

        const action = res?.action || (kioskScanMode === "out" ? "out" : "in");
        const isLate = Boolean(res?.isLate);
        const status = action === "out" ? "OUT" : isLate ? "LATE" : "PRESENT";
        const stayDuration = res?.stayDuration;
        const recordedTime = action === "out" ? (res?.outTime || timeFormatted) : (res?.inTime || timeFormatted);

        const checkInEntry: RecentCheckIn = {
          studentId: match.studentId,
          name: match.name,
          rollNo: match.rollNo,
          className: targetClassName,
          photoUrl: match.photoUrl,
          time: recordedTime,
          status,
          action,
          stayDuration,
          confidence: match.confidencePercent
        };

        setLastMatchedAlert(checkInEntry);
        setRecentScans((prev) => [checkInEntry, ...prev.filter((p) => p.studentId !== match.studentId)].slice(0, 8));

        // 2. Dispatch Parent Web Push Arrival / Departure Notification
        const pushTitle = action === "out"
          ? `🏠 विद्यालय प्रस्थान (OUT): ${match.name}`
          : `🎒 विद्यालय प्रवेश (IN): ${match.name}`;

        const pushBody = action === "out"
          ? `Aapka bachha ${match.name} (${targetClassName}, Roll #${match.rollNo || "—"}) aaj ${recordedTime} par vidyalaya se prasthan kar chuka hai. Kul samay: ${stayDuration || "—"}.`
          : `Aapka bachha ${match.name} (${targetClassName}, Roll #${match.rollNo || "—"}) aaj ${recordedTime} par vidyalaya pahunch chuka hai. Status: ${status === "LATE" ? "Late Arrival" : "Present"}.`;

        void sendSchoolPushNotification({
          schoolId,
          classId: targetClassId,
          studentIds: [match.studentId],
          title: pushTitle,
          body: pushBody,
          type: "DEFAULT",
          url: `/?schoolPortal=1&studentId=${encodeURIComponent(match.studentId)}&schoolTab=attendance`
        }).catch(() => {});

        // Speak Hindi Voice Confirmation
        try {
          speakNotification(
            "हाजिरी",
            `${match.name} की ${action === "out" ? "प्रस्थान" : "उपस्थिति"} दर्ज हुई।`
          );
        } catch {}

        if (onAttendanceUpdated) {
          onAttendanceUpdated();
        }
      } catch (err) {
        console.warn("Error marking face attendance:", err);
      }
    },
    [schoolId, classId, className, teacherId, kioskScanMode, onAttendanceUpdated]
  );

  // Manual Attendance Mark + Live Face Auto-Enrollment
  const handleManualMark = (st: any) => {
    if (lastLiveDescriptorRef.current && lastLiveDescriptorRef.current.length === 128) {
      const liveRec: FaceDescriptorRecord = {
        studentId: st.id,
        schoolId: schoolId || "default_school",
        name: st.name,
        rollNo: String(st.rollNo || ""),
        classId: st.classId || classId,
        className: st.className || className,
        photoUrl: st.photoUrl,
        descriptor: lastLiveDescriptorRef.current,
        enrolledAt: new Date().toISOString(),
        source: "live_kiosk",
      };
      void saveFaceDescriptor(liveRec);
      setEnrolledMap((prev) => ({ ...prev, [st.id]: liveRec }));
    }
    handleMarkAttendanceSuccess({
      studentId: st.id,
      name: st.name,
      rollNo: st.rollNo,
      classId: st.classId || classId,
      className: st.className || className,
      photoUrl: st.photoUrl,
      confidencePercent: 100
    });
    setShowManualSearch(false);
    setManualSearchQuery("");
  };

  // Live Camera Detection Animation Loop
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let lastScanTime = 0;

    const renderLoop = async (time: number) => {
      // Throttle inference to every 120ms (approx 8-10 inferences/sec) for fluid 60fps UI
      if (time - lastScanTime >= 120 && videoRef.current && canvasRef.current) {
        lastScanTime = time;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (video.readyState >= 2 && ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          try {
            const detected = await detectFacesInFrame(video, enrolledMap);
            setHasFaceInView(detected.length > 0);
            lastLiveDescriptorRef.current = detected[0]?.descriptor || null;

            detected.forEach((face: DetectedFaceBox) => {
              const { x, y, width, height, matchedStudent } = face;
              const isMatched = Boolean(matchedStudent);

              // Corner bracket styling
              ctx.lineWidth = 3.5;
              ctx.strokeStyle = isMatched ? "#10b981" : "#f59e0b"; // Emerald if matched, Amber if evaluating

              const cornerLen = Math.min(width, height) * 0.22;

              // Top-Left Corner
              ctx.beginPath();
              ctx.moveTo(x, y + cornerLen);
              ctx.lineTo(x, y);
              ctx.lineTo(x + cornerLen, y);
              ctx.stroke();

              // Top-Right Corner
              ctx.beginPath();
              ctx.moveTo(x + width - cornerLen, y);
              ctx.lineTo(x + width, y);
              ctx.lineTo(x + width, y + cornerLen);
              ctx.stroke();

              // Bottom-Left Corner
              ctx.beginPath();
              ctx.moveTo(x, y + height - cornerLen);
              ctx.lineTo(x, y + height);
              ctx.lineTo(x + cornerLen, y + height);
              ctx.stroke();

              // Bottom-Right Corner
              ctx.beginPath();
              ctx.moveTo(x + width - cornerLen, y + height);
              ctx.lineTo(x + width, y + height);
              ctx.lineTo(x + width, y + height - cornerLen);
              ctx.stroke();

              // Overlay Label Card
              const labelText = matchedStudent
                ? `${matchedStudent.name} (${matchedStudent.confidencePercent}%)`
                : "Scanning Face...";

              ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
              const textWidth = ctx.measureText(labelText).width;
              const badgeW = textWidth + 24;
              const badgeH = 28;
              const badgeX = x + width / 2 - badgeW / 2;
              const badgeY = Math.max(10, y - badgeH - 8);

              // Card Background
              ctx.fillStyle = isMatched ? "rgba(6, 78, 59, 0.90)" : "rgba(30, 41, 59, 0.85)";
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
              ctx.fill();

              // Border
              ctx.strokeStyle = isMatched ? "#34d399" : "#64748b";
              ctx.lineWidth = 1;
              ctx.stroke();

              // Text
              ctx.fillStyle = "#ffffff";
              ctx.fillText(labelText, badgeX + 12, badgeY + 19);

              // If matched, trigger attendance
              if (matchedStudent) {
                void handleMarkAttendanceSuccess(matchedStudent);
              }
            });
          } catch (e) {
            // Frame processing blip ignored
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, enrolledMap, handleMarkAttendanceSuccess]);

  if (!isOpen) return null;

  const enrolledCount = Object.keys(enrolledMap).length;
  const filteredStudents = manualSearchQuery.trim()
    ? students.filter((s) => {
        const q = manualSearchQuery.toLowerCase();
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.rollNo && s.rollNo.toString().includes(q)) ||
          (s.admissionNo && s.admissionNo.toLowerCase().includes(q))
        );
      })
    : students;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none overflow-hidden font-sans">
      {/* ── TOP HUD HEADER ── */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white truncate">
                AI Face Attendance Kiosk
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                Live AI
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {schoolName} {className ? `• ${className}` : ""}
            </p>
          </div>
        </div>

        {/* Live Clock & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Gate Scan Mode Toggle (Auto / IN / OUT) */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setKioskScanMode("auto")}
              className={`px-2 py-1 rounded-lg transition ${
                kioskScanMode === "auto"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="स्वतः पहचानें (सुबह IN, बाद में OUT)"
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setKioskScanMode("in")}
              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                kioskScanMode === "in"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="केवल विद्यालय प्रवेश (Check-IN)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>IN</span>
            </button>
            <button
              type="button"
              onClick={() => setKioskScanMode("out")}
              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                kioskScanMode === "out"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="केवल विद्यालय प्रस्थान (Check-OUT)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>OUT</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentTimeStr || "--:--:--"}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowEnrollmentModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Inspect & Enroll Student Face Data"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Face Enrollment</span>
            <span className="text-[11px] text-slate-400">({enrolledCount})</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer"
            title="Exit Kiosk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── MAIN VIEWFINDER CANVAS & TARGETING RETICLE ── */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Camera Video Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Real-time Facial Bounding Box Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Camera Error Display */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Camera Access Issue</h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Center Framing Guide Oval */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
          <div className="w-64 h-80 sm:w-72 sm:h-96 rounded-[50%] border-2 border-dashed border-white/20 flex flex-col items-center justify-between p-6">
            <span className="text-[11px] font-bold tracking-wider uppercase text-white/50 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
              Position Face Inside
            </span>
            <span className="text-[11px] font-bold text-emerald-400/80 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
              {enrolledCount > 0 ? `⚡ ${enrolledCount} Students Enrolled` : "⚠️ 0 Face Enrolled"}
            </span>
          </div>
        </div>

        {/* Notification Toast for Already Scanned Student */}
        {cooldownToast && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="px-4 py-2.5 bg-amber-500/90 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-xl flex items-center gap-2 backdrop-blur-md">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{cooldownToast}</span>
            </div>
          </div>
        )}

        {/* Celebration / Attendance Banner with IN vs OUT styling */}
        {lastMatchedAlert && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-md w-[90%] animate-in fade-in zoom-in-95 duration-200">
            <div
              className={`rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-3 border ${
                lastMatchedAlert.action === "out"
                  ? "bg-rose-950/90 border-rose-500/50"
                  : "bg-emerald-950/90 border-emerald-500/50"
              }`}
            >
              <div
                className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center text-white text-lg font-bold ${
                  lastMatchedAlert.action === "out"
                    ? "bg-rose-800/80 border-rose-400"
                    : "bg-emerald-800/80 border-emerald-400"
                }`}
              >
                {lastMatchedAlert.photoUrl ? (
                  <img
                    src={lastMatchedAlert.photoUrl}
                    alt={lastMatchedAlert.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{lastMatchedAlert.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      lastMatchedAlert.action === "out"
                        ? "bg-rose-500 text-white"
                        : "bg-emerald-500 text-slate-950"
                    }`}
                  >
                    {lastMatchedAlert.action === "out" ? "🔴 OUT (प्रस्थान)" : `🟢 IN (${lastMatchedAlert.status})`}
                  </span>
                  <span
                    className={`text-xs font-mono ${
                      lastMatchedAlert.action === "out" ? "text-rose-300" : "text-emerald-300"
                    }`}
                  >
                    {lastMatchedAlert.time}
                  </span>
                  {lastMatchedAlert.stayDuration && (
                    <span className="text-[10px] text-amber-300 font-bold">
                      ⏱️ {lastMatchedAlert.stayDuration}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-white truncate mt-0.5">
                  {lastMatchedAlert.name}
                </h4>
                <p className="text-xs text-slate-300 truncate">
                  Roll #{lastMatchedAlert.rollNo || "—"} • {lastMatchedAlert.className || "Class"} ({lastMatchedAlert.confidence}% Match)
                </p>
              </div>
              <CheckCircle2
                className={`w-8 h-8 shrink-0 ${
                  lastMatchedAlert.action === "out" ? "text-rose-400" : "text-emerald-400"
                }`}
              />
            </div>
          </div>
        )}
        {/* Live 1-Tap Candidate Bar on Viewfinder */}
        {students && students.length > 0 && (
          <div className="absolute left-4 right-20 bottom-4 z-20 pointer-events-auto">
            <div className="bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasFaceInView ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-white truncate">
                    {hasFaceInView ? "⚡ कैमरा में चेहरा सक्रिय (Face Detected)" : "📷 1-टैप हाजिरी (Quick Attendance)"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    नाम पर टैप करके तुरंत हाजिरी लगाएं:
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full sm:max-w-md">
                {students.slice(0, 5).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleManualMark(st)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-sm transition cursor-pointer"
                    title={`Mark ${st.name} attendance`}
                  >
                    <span>✓ {st.name.split(" ")[0]} (#{st.rollNo})</span>
                  </button>
                ))}
                {students.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowManualSearch(true)}
                    className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] shrink-0"
                  >
                    +{students.length - 5}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Viewfinder Floating Tool Buttons */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-2 z-20">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
            className="w-12 h-12 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-white border border-slate-700 shadow-xl flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            title="Switch Front/Rear Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowManualSearch(true)}
            className="w-12 h-12 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-xl flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            title="Manual Student Search"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── BOTTOM TAPE: RECENT CHECK-INS ── */}
      <footer className="h-20 bg-slate-900/95 border-t border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0 z-20 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
              Recent Check-Ins
            </div>
            <div className="text-[10px] text-slate-500">
              {recentScans.length} marked this session
            </div>
          </div>
        </div>

        {/* Horizontal Card List */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {recentScans.length === 0 ? (
            <div className="text-xs text-slate-500 italic pl-2">
              Walk into camera view to automatically mark attendance...
            </div>
          ) : (
            recentScans.map((sc, idx) => (
              <div
                key={`${sc.studentId}-${idx}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 shrink-0 text-left animate-in fade-in slide-in-from-right-3 duration-200"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-white">
                  {sc.photoUrl ? (
                    <img src={sc.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{sc.name.slice(0, 1)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${
                        sc.action === "out" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {sc.action === "out" ? "OUT" : "IN"}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[100px]">
                      {sc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className={sc.action === "out" ? "text-rose-400 font-mono" : "text-emerald-400 font-mono"}>
                      {sc.time}
                    </span>
                    <span>•</span>
                    <span>#{sc.rollNo || "—"}</span>
                    {sc.stayDuration && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400 text-[9px] font-medium">{sc.stayDuration}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </footer>

      {/* ── MANUAL STUDENT SEARCH MODAL (FALLBACK) ── */}
      {showManualSearch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Manual Student Check-In (मैन्युअल खोजें)
                </h3>
              </div>
              <button
                onClick={() => setShowManualSearch(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3">
              <input
                type="text"
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                placeholder="Search by student name or roll number..."
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto mt-3 divide-y divide-slate-800/60 max-h-80 pr-1">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No students found matching "{manualSearchQuery}"
                </div>
              ) : (
                filteredStudents.map((st) => (
                  <div
                    key={st.id}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-800/40 rounded-xl transition cursor-pointer"
                    onClick={() => handleManualMark(st)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                        {st.photoUrl ? (
                          <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{st.name?.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{st.name}</div>
                        <div className="text-xs text-slate-400">
                          Roll #{st.rollNo || "—"} • ID: {st.admissionNo || "—"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Present</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FACE ENROLLMENT MANAGEMENT MODAL ── */}
      <FaceEnrollmentModal
        isOpen={showEnrollmentModal}
        onClose={() => {
          setShowEnrollmentModal(false);
          loadDescriptors();
        }}
        schoolId={schoolId}
        students={students}
        enrolledMap={enrolledMap}
        onEnrollmentUpdated={loadDescriptors}
      />
    </div>
  );
};
