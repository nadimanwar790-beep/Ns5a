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
  UserPlus,
  Eye,
  EyeOff
} from "lucide-react";
import {
  detectFacesInFrame,
  getSchoolFaceDescriptors,
  saveFaceDescriptor,
  extractDescriptorFromCanvas,
  enrollStudentFromPhotoUrl,
  playAttendanceSuccessChime,
  playCooldownTick,
  EyeBlinkDetector,
  BlinkState,
  FaceDescriptorRecord,
  DetectedFaceBox
} from "../../utils/faceRecognitionEngine";
import { markStudentQrAttendance, todayStr } from "../../school-firebase";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { hapticStrong, hapticMedium } from "../../utils/haptic";
import { FaceEnrollmentModal } from "./FaceEnrollmentModal";
import { UniversalFaceIdStudioModal } from "./UniversalFaceIdStudioModal";

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
  const [currentShiftMode, setCurrentShiftMode] = useState<"in" | "out">("in");

  const [cooldownToast, setCooldownToast] = useState<string | null>(null);
  const [manualSearchQuery, setManualSearchQuery] = useState<string>("");
  const [showManualSearch, setShowManualSearch] = useState<boolean>(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [hasFaceInView, setHasFaceInView] = useState<boolean>(false);

  // Eye Blink & Liveness + 1-Tap Candidate state
  const [pendingBlinkStudent, setPendingBlinkStudent] = useState<any>(null);
  const [lowConfidenceCandidate, setLowConfidenceCandidate] = useState<any>(null);
  const [activeCooldownInfo, setActiveCooldownInfo] = useState<{ name: string; rollNo?: string; remainingSec: number } | null>(null);
  const blinkDetectorRef = useRef<EyeBlinkDetector>(new EyeBlinkDetector());

  // 15-20s Cooldown Guard tracker: studentId -> timestamp
  const scanCooldownsRef = useRef<Map<string, number>>(new Map());
  const isProcessingRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLiveDescriptorRef = useRef<number[] | null>(null);

  // Compute Shift Routine based on school prayer time (Default: 09:00 AM -> 10:00 AM cutoff)
  const computeRoutineShift = useCallback((): "in" | "out" => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const prayerMinutes = 9 * 60 + 0; // 09:00 AM
    const inCutoffMinutes = prayerMinutes + 60; // 10:00 AM (600 mins)
    return currentMinutes <= inCutoffMinutes ? "in" : "out";
  }, []);

  // Live Clock & Shift Ticker
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
      setCurrentShiftMode(computeRoutineShift());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [computeRoutineShift]);

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

      // RULE 1: 15-20 Second Cooldown Guard
      const COOLDOWN_MS = 20000;
      if (now - lastScanned < COOLDOWN_MS) {
        // Quietly maintain locked state without annoying sound or alerts
        const rem = Math.max(1, Math.ceil((COOLDOWN_MS - (now - lastScanned)) / 1000));
        setActiveCooldownInfo({ name: match.name, rollNo: match.rollNo, remainingSec: rem });
        return;
      }

      scanCooldownsRef.current.set(match.studentId, now);
      setActiveCooldownInfo(null);
      setPendingBlinkStudent(null);
      setLowConfidenceCandidate(null);

      const timeFormatted = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      // Target class ID resolution
      const targetClassId = match.classId || classId || "cls_default";
      const targetClassName = match.className || className || "Class";

      // 1. Mark in school database with Shift Rule (morning IN, afternoon OUT)
      try {
        const res = await markStudentQrAttendance({
          schoolId,
          classId: targetClassId,
          studentId: match.studentId,
          studentName: match.name,
          rollNo: match.rollNo,
          markedBy: teacherId,
          scanMode: kioskScanMode,
          prayerTime: "09:00"
        });

        if (res?.alreadyMarked) {
          playCooldownTick();
          setCooldownToast(res.message);
          setTimeout(() => setCooldownToast(null), 2500);
          return;
        }

        // Fresh attendance punch!
        playAttendanceSuccessChime();
        hapticStrong();

        const action = res?.action || (kioskScanMode === "out" ? "out" : currentShiftMode);
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
    [schoolId, classId, className, teacherId, kioskScanMode, currentShiftMode, onAttendanceUpdated]
  );

  // Manual Attendance Mark + Mandatory Live Face Auto-Enrollment
  const handleManualMark = (st: any) => {
    const alreadyEnrolled = Boolean(enrolledMap[st.id]);
    const hasLiveFace = Boolean(lastLiveDescriptorRef.current && lastLiveDescriptorRef.current.length === 128);

    if (!alreadyEnrolled && !hasLiveFace) {
      setCooldownToast(`⚠️ ${st.name} का चेहरा सेव नहीं है! पहले चेहरा कैमरे के सामने लाएं, फिर टैप करें।`);
      setTimeout(() => setCooldownToast(null), 3500);
      return;
    }

    let justEnrolled = false;
    if (hasLiveFace && lastLiveDescriptorRef.current) {
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
      justEnrolled = !alreadyEnrolled;
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
    if (justEnrolled) {
      setCooldownToast(`✅ ${st.name} की हाजिरी लगी व चेहरा सेव हो गया!`);
      setTimeout(() => setCooldownToast(null), 3000);
    }
    setShowManualSearch(false);
    setManualSearchQuery("");
  };

  // Live Camera Detection Animation Loop (RULE 4: Throttled to 380ms for Battery Saver)
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let lastScanTime = 0;

    const renderLoop = async (time: number) => {
      // RULE 4: Battery Saver - Throttle inference to every 380ms (~2.5 FPS)
      if (time - lastScanTime >= 380 && videoRef.current && canvasRef.current) {
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
            if (detected[0]?.descriptor && detected[0].descriptor.length === 128) {
              lastLiveDescriptorRef.current = detected[0].descriptor;
            }

            if (detected.length === 0) {
              setPendingBlinkStudent(null);
              setLowConfidenceCandidate(null);
              setActiveCooldownInfo(null);
            } else {
              const primaryFace = detected[0];
              const bState = blinkDetectorRef.current.update(video, primaryFace);
              const hasBlinked = bState.blinkDetected || blinkDetectorRef.current.hasBlinkedRecently(3500);

              detected.forEach((face: DetectedFaceBox) => {
                const { x: rawX, y, width, height, matchedStudent } = face;
                // Front camera video is mirrored via CSS (-scale-x-100); mirror box X on canvas
                const x = facingMode === "user" ? Math.max(0, canvas.width - rawX - width) : rawX;
                const isMatched = Boolean(matchedStudent);

                // RULE 1: Cooldown Guard Check
                const lastScanned = matchedStudent ? (scanCooldownsRef.current.get(matchedStudent.studentId) || 0) : 0;
                const isUnderCooldown = matchedStudent && (Date.now() - lastScanned < 20000);

                if (isUnderCooldown && matchedStudent) {
                  const rem = Math.max(1, Math.ceil((20000 - (Date.now() - lastScanned)) / 1000));
                  setActiveCooldownInfo({ name: matchedStudent.name, rollNo: matchedStudent.rollNo, remainingSec: rem });
                  setPendingBlinkStudent(null);
                  setLowConfidenceCandidate(null);
                } else if (matchedStudent) {
                  setActiveCooldownInfo(null);
                  if (matchedStudent.confidencePercent >= 88) {
                    setLowConfidenceCandidate(null);
                    if (hasBlinked) {
                      setPendingBlinkStudent(null);
                      void handleMarkAttendanceSuccess(matchedStudent);
                    } else {
                      setPendingBlinkStudent(matchedStudent);
                    }
                  } else if (matchedStudent.confidencePercent >= 60) {
                    setLowConfidenceCandidate(matchedStudent);
                    setPendingBlinkStudent(null);
                  }
                }

                // Corner bracket styling
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = isUnderCooldown
                  ? "#10b981"
                  : pendingBlinkStudent
                  ? "#22d3ee"
                  : isMatched
                  ? "#10b981"
                  : "#f59e0b";

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
                let labelText = "Scanning Face...";
                if (isUnderCooldown && matchedStudent) {
                  labelText = `⏸️ ${matchedStudent.name} (उपस्थिति दर्ज)`;
                } else if (pendingBlinkStudent && matchedStudent) {
                  labelText = `👁️ ${matchedStudent.name} (${matchedStudent.confidencePercent}%) • Blink Eyes`;
                } else if (matchedStudent) {
                  labelText = `${matchedStudent.name} (${matchedStudent.confidencePercent}%)`;
                }

                ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
                const textWidth = ctx.measureText(labelText).width;
                const badgeW = textWidth + 24;
                const badgeH = 28;
                const badgeX = Math.max(8, Math.min(canvas.width - badgeW - 8, x + width / 2 - badgeW / 2));
                const badgeY = Math.max(10, y - badgeH - 8);

                ctx.fillStyle = isUnderCooldown
                  ? "rgba(6, 78, 59, 0.90)"
                  : pendingBlinkStudent
                  ? "rgba(8, 51, 68, 0.92)"
                  : isMatched
                  ? "rgba(6, 78, 59, 0.90)"
                  : "rgba(30, 41, 59, 0.85)";
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
                ctx.fill();

                ctx.strokeStyle = isUnderCooldown
                  ? "#34d399"
                  : pendingBlinkStudent
                  ? "#38bdf8"
                  : isMatched
                  ? "#34d399"
                  : "#64748b";
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.fillText(labelText, badgeX + 12, badgeY + 19);
              });
            }
          } catch (e) {
            // Frame processing blip ignored
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, enrolledMap, facingMode, handleMarkAttendanceSuccess, pendingBlinkStudent]);

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
          {/* Shift / Routine Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                (kioskScanMode === "auto" ? currentShiftMode : kioskScanMode) === "in"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-rose-400 animate-pulse"
              }`}
            />
            <span className="font-bold text-slate-200">
              {kioskScanMode === "auto"
                ? currentShiftMode === "in"
                  ? "🌅 सुबह (IN मोड • 10:00 AM तक)"
                  : "🌇 दोपहर/छुट्टी (OUT मोड)"
                : kioskScanMode === "in"
                ? "🟢 फ़ोर्स्ड IN मोड"
                : "🔴 फ़ोर्स्ड OUT मोड"}
            </span>
          </div>

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
              title="स्वतः पहचानें (सुबह 10:00 AM तक IN, बाद में OUT)"
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm shadow-emerald-900/30"
            title="Open Universal Live Face ID Studio & Match Test"
          >
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">📷 Live Face Studio</span>
            <span className="text-[11px] text-emerald-100 font-mono">({enrolledCount})</span>
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
        {/* Camera Video Stream (mirror naturally when using front selfie camera) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-transform ${
            facingMode === "user" ? "-scale-x-100" : ""
          }`}
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

        {/* Center Framing Guide Oval with Dynamic Biometric State Colors */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
          <div
            className={`w-64 h-80 sm:w-72 sm:h-96 rounded-[50%] border-2 transition-all duration-300 flex flex-col items-center justify-between p-6 relative ${
              lastMatchedAlert && !activeCooldownInfo
                ? "border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.7)] ring-4 ring-emerald-500/40"
                : activeCooldownInfo
                ? "border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/30"
                : pendingBlinkStudent
                ? "border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.7)] ring-4 ring-cyan-500/40 animate-pulse"
                : lowConfidenceCandidate
                ? "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)] ring-2 ring-amber-500/30"
                : hasFaceInView
                ? "border-blue-400/80 shadow-[0_0_20px_rgba(96,165,250,0.4)] ring-2 ring-blue-500/30"
                : "border-dashed border-white/25"
            }`}
          >
            {/* Top Oval Pill */}
            <div className="pointer-events-auto">
              {activeCooldownInfo ? (
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300 bg-emerald-950/85 border border-emerald-500/40 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{activeCooldownInfo.name} • उपस्थिति दर्ज ({activeCooldownInfo.remainingSec}s Lock)</span>
                </span>
              ) : pendingBlinkStudent ? (
                <span className="text-[11px] font-bold tracking-wider text-cyan-200 bg-cyan-950/90 border border-cyan-400 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg animate-pulse">
                  <span>👁️</span>
                  <span>{pendingBlinkStudent.name} • कृपया आँखें झपकाएँ (Blink)</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold tracking-wider uppercase text-white/70 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                  {hasFaceInView ? "Scanning Face..." : "Position Face Inside"}
                </span>
              )}
            </div>

            {/* Bottom Oval Pill / Shift Indicator */}
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold text-emerald-400/90 bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                <span>{(kioskScanMode === "auto" ? currentShiftMode : kioskScanMode) === "in" ? "🟢 IN Mode (आगमन)" : "🔴 OUT Mode (प्रस्थान)"}</span>
                <span>•</span>
                <span>{enrolledCount > 0 ? `${enrolledCount} Enrolled` : "0 Enrolled"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 1-Tap Eye Blink Confirmation Button (when waiting for blink) */}
        {pendingBlinkStudent && !activeCooldownInfo && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-sm w-[90%] pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="bg-cyan-950/90 border border-cyan-400 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span>👁️</span>
                  <span>{pendingBlinkStudent.name} ({pendingBlinkStudent.confidencePercent}%)</span>
                </p>
                <p className="text-[10px] text-cyan-300">
                  कृपया 1 बार आँखें झपकाएँ या पुष्टि के लिए बटन दबाएँ
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  blinkDetectorRef.current.simulateBlink();
                  void handleMarkAttendanceSuccess(pendingBlinkStudent);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shrink-0 active:scale-95 transition shadow-lg shadow-cyan-400/30 cursor-pointer flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>पलक झपकी (Tap)</span>
              </button>
            </div>
          </div>
        )}

        {/* 1-Tap Low-Confidence Assisted Attendance Help (when 60% - 87% match in low light/angle) */}
        {lowConfidenceCandidate && !activeCooldownInfo && !pendingBlinkStudent && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-sm w-[90%] pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="bg-amber-950/90 border border-amber-400/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {lowConfidenceCandidate.photoUrl ? (
                    <img src={lowConfidenceCandidate.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{lowConfidenceCandidate.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    क्या आप {lowConfidenceCandidate.name} हैं?
                  </p>
                  <p className="text-[10px] text-amber-300">
                    कम रोशनी / कोण ({lowConfidenceCandidate.confidencePercent}% मैच)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleMarkAttendanceSuccess(lowConfidenceCandidate);
                  setLowConfidenceCandidate(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 active:scale-95 transition shadow-lg shadow-emerald-500/30 cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>हाँ, हाजिरी लगाएं</span>
              </button>
            </div>
          </div>
        )}

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
                  <p className="text-[10px] text-amber-300 font-semibold truncate">
                    {enrolledCount === 0
                      ? "अभी 0 चेहरा सेव है — नीचे नाम पर 1 बार टैप करें (चेहरा सेव + हाजिरी हो जाएगी)"
                      : "नाम पर टैप करके तुरंत हाजिरी लगाएं व चेहरा अपडेट करें:"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full sm:max-w-md">
                {students.slice(0, 5).map((st) => {
                  const isEnrolled = Boolean(enrolledMap[st.id]);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleManualMark(st)}
                      className={`px-2.5 py-1.5 rounded-xl active:scale-95 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-sm transition cursor-pointer ${
                        isEnrolled
                          ? "bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-300/50"
                          : "bg-indigo-600 hover:bg-indigo-500"
                      }`}
                      title={isEnrolled ? `${st.name} (चेहरा सेव है)` : `${st.name} का चेहरा सेव करें व हाजिरी लगाएं`}
                    >
                      <span>{isEnrolled ? "✓📷" : "+📸"} {st.name.split(" ")[0]} (#{st.rollNo})</span>
                    </button>
                  );
                })}
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

      {/* ── UNIVERSAL LIVE FACE ID STUDIO & ENROLLMENT MODAL ── */}
      {showEnrollmentModal && (
        <UniversalFaceIdStudioModal
          isOpen={showEnrollmentModal}
          onClose={() => {
            setShowEnrollmentModal(false);
            loadDescriptors();
          }}
          schoolId={schoolId}
          students={students}
          classes={className ? [{ id: classId, name: className }] : []}
          onEnrollmentUpdated={loadDescriptors}
        />
      )}
    </div>
  );
};
