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
  EyeOff,
  Lightbulb,
  Sun,
  Moon,
  Trash2,
  ShieldAlert
} from "lucide-react";
import {
  detectFacesInFrame,
  getSchoolFaceDescriptors,
  saveFaceDescriptor,
  deleteFaceDescriptor,
  purgeDummyFaceDescriptors,
  extractDescriptorFromCanvas,
  assessFaceLightingAndQuality,
  enrollStudentFromPhotoUrl,
  enrollTeacherFromPhotoUrl,
  playAttendanceSuccessChime,
  playCooldownTick,
  EyeBlinkDetector,
  BlinkState,
  FaceDescriptorRecord,
  DetectedFaceBox,
  FaceLightingAssessment
} from "../../utils/faceRecognitionEngine";
import { markStudentQrAttendance, todayStr, saveNstaMessage, getStaffDailyAttendance, saveStaffDailyAttendance } from "../../school-firebase";
import type { NstaMessage } from "../../school-types";
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
  teachers?: any[];
  teacherId?: string;
  onAttendanceUpdated?: () => void;
}

interface RecentCheckIn {
  studentId: string;
  name: string;
  role?: "STUDENT" | "TEACHER" | "STAFF";
  designation?: string;
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
  teachers = [],
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
    role?: "STUDENT" | "TEACHER" | "STAFF";
    designation?: string;
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
  const [detectedFaceCount, setDetectedFaceCount] = useState<number>(0);

  // Eye Blink & Liveness + 1-Tap Candidate state
  const [pendingBlinkStudent, setPendingBlinkStudent] = useState<any>(null);
  const [lowConfidenceCandidate, setLowConfidenceCandidate] = useState<any>(null);
  const [activeCooldownInfo, setActiveCooldownInfo] = useState<{ name: string; rollNo?: string; remainingSec: number } | null>(null);
  const blinkDetectorRef = useRef<EyeBlinkDetector>(new EyeBlinkDetector());

  // Screen Fill Light / Flashlight & Ambient Illumination State
  const [screenFlashActive, setScreenFlashActive] = useState<boolean>(false);
  const [currentLighting, setCurrentLighting] = useState<FaceLightingAssessment | null>(null);
  const [isLowLightWarning, setIsLowLightWarning] = useState<boolean>(false);
  const [isAmbiguousMatchNotice, setIsAmbiguousMatchNotice] = useState<string | null>(null);

  // 25s Cooldown Guard tracker: studentId -> timestamp
  const scanCooldownsRef = useRef<Map<string, number>>(new Map());
  // 3.5s Global Camera Cooldown Guard: freezes scan loop for 3.5s after any successful punch
  const globalCooldownUntilRef = useRef<number>(0);
  const isPunchingLockRef = useRef<boolean>(false); // Synchronous Punch Lock
  const [globalFreezeCountdown, setGlobalFreezeCountdown] = useState<number>(0);
  const [showEnrolledProfilesModal, setShowEnrolledProfilesModal] = useState<boolean>(false);

  // Super Admin Configurable IN / OUT Shift Timings
  const [adminInCutoffTime, setAdminInCutoffTime] = useState<string>(() => {
    return localStorage.getItem(`nst_kiosk_in_cutoff_${schoolId}`) || "10:00";
  });
  const [adminOutStartTime, setAdminOutStartTime] = useState<string>(() => {
    return localStorage.getItem(`nst_kiosk_out_start_${schoolId}`) || "11:30";
  });
  const [showTimeConfigModal, setShowTimeConfigModal] = useState<boolean>(false);

  const isProcessingRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLiveDescriptorRef = useRef<number[] | null>(null);

  // Global Camera Freeze countdown ticker (3s -> 2s -> 1s -> 0)
  useEffect(() => {
    if (globalFreezeCountdown <= 0) return;
    const timer = setTimeout(() => {
      setGlobalFreezeCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [globalFreezeCountdown]);

  // Compute Shift Routine based on Super Admin configured timings
  const computeRoutineShift = useCallback((): "in" | "out" => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [inH, inM] = adminInCutoffTime.split(":").map(Number);
    const cutoffMinutes = (isNaN(inH) ? 10 : inH) * 60 + (isNaN(inM) ? 0 : inM);
    return currentMinutes <= cutoffMinutes ? "in" : "out";
  }, [adminInCutoffTime]);

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
            map = updatedMap;
          }
        }
      }

      // Auto-enroll teachers who have photos if not already enrolled
      if (teachers && teachers.length > 0) {
        const teachersToEnroll = teachers.filter(
          (t) => t && t.photoUrl && typeof t.photoUrl === "string" && t.photoUrl.trim() && !map[t.id]
        );
        if (teachersToEnroll.length > 0) {
          const teacherRecords = await Promise.all(
            teachersToEnroll.slice(0, 30).map((t) =>
              enrollTeacherFromPhotoUrl({
                id: t.id,
                schoolId: schoolId || "default_school",
                name: t.name,
                designation: t.designation || (Array.isArray(t.subjects) ? t.subjects.join(", ") : "Faculty"),
                photoUrl: t.photoUrl
              })
            )
          );
          const updatedMap = { ...map };
          let anyAdded = false;
          teacherRecords.forEach((rec) => {
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
  }, [schoolId, students, teachers, classId, className]);

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
    if (isOpen && !showEnrollmentModal) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, showEnrollmentModal, startCamera]);

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
      // Synchronous Lock: Prevent parallel / duplicate requests if called multiple times in same tick
      if (isPunchingLockRef.current) return;
      isPunchingLockRef.current = true;

      const now = Date.now();
      const lastScanned = scanCooldownsRef.current.get(match.studentId) || 0;

      // RULE 1: 25 Second Cooldown Guard
      const COOLDOWN_MS = 25000;
      if (now - lastScanned < COOLDOWN_MS) {
        isPunchingLockRef.current = false;
        const rem = Math.max(1, Math.ceil((COOLDOWN_MS - (now - lastScanned)) / 1000));
        setActiveCooldownInfo({ name: match.name, rollNo: match.rollNo, remainingSec: rem });
        return;
      }

      scanCooldownsRef.current.set(match.studentId, now);
      // Trigger 3.5s Global Camera Pause: freeze scanner so no other punches trigger on same face
      globalCooldownUntilRef.current = now + 3500;
      setGlobalFreezeCountdown(3);

      setActiveCooldownInfo(null);
      setPendingBlinkStudent(null);
      setLowConfidenceCandidate(null);

      const timeFormatted = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      // Check if match is a Teacher
      const descriptorRec = enrolledMap[match.studentId];
      const isTeacherMatch =
        descriptorRec?.role === "TEACHER" ||
        (teachers && teachers.some((t) => t.id === match.studentId));

      if (isTeacherMatch) {
        // Teacher Attendance Punch
        try {
          const today = todayStr();
          const staffAtt = getStaffDailyAttendance(schoolId, today);
          const existingRec = staffAtt.records[match.studentId];

          let action: "in" | "out" =
            kioskScanMode === "out" ? "out" : kioskScanMode === "in" ? "in" : currentShiftMode;
          if (kioskScanMode === "auto" && existingRec?.inTime && !existingRec?.outTime) {
            action = "out";
          }

          let stayDuration = existingRec?.stayDuration;
          if (action === "out" && existingRec?.inTime) {
            try {
              const [inH, inM] = existingRec.inTime.split(":");
              const inDate = new Date();
              inDate.setHours(parseInt(inH) || 9, parseInt(inM) || 0, 0);
              const diffMs = Math.max(0, Date.now() - inDate.getTime());
              const hrs = Math.floor(diffMs / (1000 * 60 * 60));
              const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              stayDuration = `${hrs}h ${mins}m`;
            } catch {}
          }

          const updatedRec = {
            ...staffAtt,
            schoolId,
            date: today,
            records: {
              ...staffAtt.records,
              [match.studentId]: {
                id: match.studentId,
                name: match.name,
                role: "TEACHER",
                employeeId: descriptorRec?.designation || "Faculty",
                present: true,
                status: "present",
                inTime: action === "in" ? timeFormatted : (existingRec?.inTime || timeFormatted),
                outTime: action === "out" ? timeFormatted : existingRec?.outTime,
                stayDuration,
                scanType: action,
              }
            }
          };
          await saveStaffDailyAttendance(updatedRec);

          playAttendanceSuccessChime();
          hapticStrong();

          const checkInEntry: RecentCheckIn = {
            studentId: match.studentId,
            name: match.name,
            role: "TEACHER",
            designation: descriptorRec?.designation || "Faculty",
            className: "शिक्षक (Faculty)",
            photoUrl: match.photoUrl || descriptorRec?.photoUrl,
            time: action === "out" ? timeFormatted : (existingRec?.inTime || timeFormatted),
            status: action === "out" ? "OUT" : "PRESENT",
            action,
            stayDuration,
            confidence: match.confidencePercent
          };

          setLastMatchedAlert(checkInEntry);
          setRecentScans((prev) => [checkInEntry, ...prev.filter((p) => p.studentId !== match.studentId)].slice(0, 8));

          // 3.5s Global Camera Pause
          globalCooldownUntilRef.current = Date.now() + 3500;
          setGlobalFreezeCountdown(3);

          speakNotification(
            "शिक्षक हाजिरी दर्ज",
            `${match.name} जी, आपकी उपस्थिति दर्ज कर ली गई है।`
          );

          if (onAttendanceUpdated) onAttendanceUpdated();
          return;
        } catch (err) {
          console.error("Teacher attendance punch error:", err);
        }
      }

      // Target class ID resolution for Student
      const targetClassId = match.classId || classId || "cls_default";
      const targetClassName = match.className || className || "Class";

      // 1. Mark student in school database with Shift Rule (morning IN, afternoon OUT)
      try {
        const res = await markStudentQrAttendance({
          schoolId,
          classId: targetClassId,
          studentId: match.studentId,
          studentName: match.name,
          rollNo: match.rollNo,
          markedBy: teacherId,
          scanMode: kioskScanMode,
          cutoffTime: adminInCutoffTime,
          prayerTime: "09:00"
        });

        if (res?.alreadyMarked) {
          playCooldownTick();
          setCooldownToast(res.message);
          setTimeout(() => setCooldownToast(null), res?.tooEarlyForOut ? 4000 : 2500);
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

        // 3.5s Global Camera Pause
        globalCooldownUntilRef.current = Date.now() + 3500;
        setGlobalFreezeCountdown(3);

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
          url: `/?schoolPortal=1&studentId=${encodeURIComponent(match.studentId)}&schoolTab=messenger&thread=desk`
        }).catch(() => {});

        // 3. Save Official NSTA Messenger Chat Message in Parent Thread
        try {
          const messengerChatText = action === "out"
            ? `🏠 [विद्यालय प्रस्थान सूचना]\nनमस्ते! आपका बच्चा ${match.name} (${targetClassName}, रोल #${match.rollNo || "—"}) आज समय ${recordedTime} पर विद्यालय से प्रस्थान कर चुका है।\nकुल उपस्थिति समय: ${stayDuration || "दर्ज"}।`
            : `🎒 [विद्यालय आगमन सूचना]\nनमस्ते! आपका बच्चा ${match.name} (${targetClassName}, रोल #${match.rollNo || "—"}) आज समय ${recordedTime} पर विद्यालय सकुशल पहुँच चुका है।\nउपस्थिति स्थिति: ${status === "LATE" ? "विलंब आगमन (Late Arrival)" : "समय पर उपस्थित (Present)"}।`;

          const nstaChatMsg: NstaMessage = {
            id: `msg_att_${Date.now()}_${match.studentId}`,
            schoolId,
            threadType: "SCHOOL_DESK",
            studentId: match.studentId,
            studentName: match.name,
            senderId: "school_kiosk_system",
            senderName: `${schoolName || "विद्यालय"} ऑटोमेशन डेस्क`,
            senderRole: "ADMIN",
            text: messengerChatText,
            createdAt: new Date().toISOString(),
            status: "delivered"
          };
          void saveNstaMessage(nstaChatMsg);
        } catch {}

        // Speak Hindi Voice Confirmation on Kiosk
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
      } finally {
        setTimeout(() => {
          isPunchingLockRef.current = false;
        }, 3500);
      }
    },
    [schoolId, classId, className, teacherId, kioskScanMode, currentShiftMode, adminInCutoffTime, onAttendanceUpdated, enrolledMap, teachers, schoolName]
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

  // Live Camera Detection Animation Loop (Throttled for battery efficiency)
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let lastScanTime = 0;

    const renderLoop = async (time: number) => {
      // RULE 1: Global Camera Cooldown (Freeze scan loop for 3.5s after any successful punch)
      if (Date.now() < globalCooldownUntilRef.current) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      // Ultra-Fast Group Scan: 140ms inference interval (~7 FPS) for smooth multi-student scanning
      if (time - lastScanTime >= 140 && videoRef.current && canvasRef.current) {
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
            setDetectedFaceCount(detected.length);
            if (detected[0]?.descriptor && detected[0].descriptor.length === 128) {
              lastLiveDescriptorRef.current = detected[0].descriptor;
            }

            if (detected.length === 0) {
              setPendingBlinkStudent(null);
              setLowConfidenceCandidate(null);
              setActiveCooldownInfo(null);
              setCurrentLighting(null);
              setIsLowLightWarning(false);
              setIsAmbiguousMatchNotice(null);
            } else {
              // ── SINGLE FACE POLICY: If 2 or more faces are in frame, HALT auto-punch! ──
              if (detected.length > 1) {
                setIsAmbiguousMatchNotice("👥 कैमरे में एक साथ 2 चेहरे हैं — कृपया लाइन में 1-1 करके सामने आएं (Single Face Only)");
                setPendingBlinkStudent(null);
                setLowConfidenceCandidate(null);

                // Draw amber warning boxes on all faces without triggering punch
                detected.forEach((f: DetectedFaceBox) => {
                  const { x: rawX, y, width, height } = f;
                  const x = facingMode === "user" ? Math.max(0, canvas.width - rawX - width) : rawX;
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = "#f59e0b";
                  ctx.strokeRect(x, y, width, height);
                });
                return; // STOP: do NOT auto-punch when multiple people stand together
              }

              const primaryFace = detected[0];
              if (primaryFace?.lighting) {
                setCurrentLighting(primaryFace.lighting);
                setIsLowLightWarning(primaryFace.lighting.isLowLight || primaryFace.lighting.isTooDark);
              }

              // Process strictly the single face present in the frame
              const face = primaryFace;
              const { x: rawX, y, width, height, matchedStudent, lighting } = face;
              // Front camera video is mirrored via CSS (-scale-x-100); mirror box X on canvas
              const x = facingMode === "user" ? Math.max(0, canvas.width - rawX - width) : rawX;
              const isMatched = Boolean(matchedStudent);

                // RULE 2: Per-Student Cooldown Guard Check
                const lastScanned = matchedStudent ? (scanCooldownsRef.current.get(matchedStudent.studentId) || 0) : 0;
                const isUnderCooldown = matchedStudent && (Date.now() - lastScanned < 25000);

                if (isUnderCooldown && matchedStudent) {
                  const rem = Math.max(1, Math.ceil((25000 - (Date.now() - lastScanned)) / 1000));
                  setActiveCooldownInfo({ name: matchedStudent.name, rollNo: matchedStudent.rollNo, remainingSec: rem });
                  setPendingBlinkStudent(null);
                  setLowConfidenceCandidate(null);
                  // CRITICAL: DO NOT FALLTHROUGH OR ASSIGN ANOTHER PERSON! STOP HERE!
                  return;
                } else if (matchedStudent) {
                  setActiveCooldownInfo(null);
                  // If candidate is ambiguous (e.g. low light separation margin too slim), do NOT auto-punch!
                  if (matchedStudent.isAmbiguous || lighting?.isTooDark) {
                    setIsAmbiguousMatchNotice(`⚠️ रोशनी कम या पहचान संदिग्ध है (${matchedStudent.name}) — गलत नाम से बचने के लिए स्क्रीन लाइट ऑन करें या नीचे नाम पर टैप करें`);
                    setLowConfidenceCandidate(matchedStudent);
                  } else if (matchedStudent.confidencePercent >= 85 && (matchedStudent.distance === undefined || matchedStudent.distance <= 0.52)) {
                    setIsAmbiguousMatchNotice(null);
                    setLowConfidenceCandidate(null);
                    setPendingBlinkStudent(null);
                    void handleMarkAttendanceSuccess(matchedStudent);
                  } else if (matchedStudent.confidencePercent >= 70) {
                    setLowConfidenceCandidate(matchedStudent);
                  }
                } else if (lighting?.isTooDark || lighting?.isLowLight) {
                  // No match and low light
                  setIsAmbiguousMatchNotice(null);
                }

                // Corner bracket styling
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = isUnderCooldown
                  ? "#10b981"
                  : pendingBlinkStudent
                  ? "#22d3ee"
                  : matchedStudent?.isAmbiguous || lighting?.isTooDark
                  ? "#f59e0b"
                  : isMatched
                  ? "#10b981"
                  : "#94a3b8";

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
            <button
              type="button"
              onClick={() => setShowTimeConfigModal(true)}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
              title="सुपर एडमिन: शिफ्ट टाइमिंग बदलें (Morning IN / Evening OUT Cutoff)"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline text-[11px] font-bold">टाइमिंग</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentTimeStr || "--:--:--"}</span>
          </div>

          {/* Screen Fill Light / Flash Toggle */}
          <button
            type="button"
            onClick={() => setScreenFlashActive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              screenFlashActive
                ? "bg-amber-300 text-slate-950 border-amber-400 shadow-md shadow-amber-300/40"
                : isLowLightWarning
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 animate-pulse"
                : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="कम रोशनी में चेहरे को उजागर करने के लिए स्क्रीन फेस लाइट चालू करें"
          >
            <Lightbulb className={`w-3.5 h-3.5 ${screenFlashActive ? "fill-slate-950 text-slate-950" : "text-amber-400"}`} />
            <span className="hidden sm:inline">{screenFlashActive ? "स्क्रीन लाइट ON" : "स्क्रीन लाइट"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEnrolledProfilesModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm shadow-emerald-900/30"
            title="एनरोल किए गए चेहरे देखें, सुधारें व साफ़ करें"
          >
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">📷 Enrolled Profiles</span>
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

        {/* SCREEN FILL LIGHT / FLASH EFFECT (Casts daylight-white illumination onto user's face from screen) */}
        {screenFlashActive && (
          <div className="absolute inset-0 z-20 pointer-events-none border-[36px] sm:border-[64px] border-white/95 shadow-[inset_0_0_120px_rgba(255,255,255,1)] flex items-center justify-center">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white text-slate-900 font-black text-xs shadow-xl flex items-center gap-2 border border-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>💡 स्क्रीन फेस लाइट चालू • चेहरे पर पूरी रोशनी पड़ रही है</span>
            </div>
          </div>
        )}

        {/* Floating Low Light Warning Banner */}
        {isLowLightWarning && !screenFlashActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-25 max-w-md w-[92%] px-4 py-2.5 rounded-2xl bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-amber-100 truncate">
                  {currentLighting?.isTooDark ? "💡 रोशनी बहुत कम है (Dark)" : "⚠️ रोशनी कम है (Low Light)"}
                </p>
                <p className="text-[11px] text-amber-300/80 truncate">
                  सही पहचान के लिए स्क्रीन लाइट ऑन करें या सामने रोशनी लाएं
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScreenFlashActive(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow flex items-center gap-1"
            >
              <Lightbulb className="w-3.5 h-3.5 fill-slate-950" />
              <span>लाइट ऑन</span>
            </button>
          </div>
        )}

        {/* Ambiguous Match Notice */}
        {isAmbiguousMatchNotice && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-25 max-w-lg w-[92%] px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-amber-500/80 text-amber-200 text-xs backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="font-semibold text-white truncate text-xs">{isAmbiguousMatchNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowManualSearch(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer"
            >
              हाजिरी चुनें
            </button>
          </div>
        )}

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

        {/* GLOBAL CAMERA COOLDOWN FREEZE OVERLAY (3.5s Pause with Large Green Tick) */}
        {globalFreezeCountdown > 0 && lastMatchedAlert && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 text-center animate-in fade-in duration-200">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.95)] mb-4 animate-bounce">
              <Check className="w-14 h-14 sm:w-16 sm:h-16 stroke-[3.5]" />
            </div>
            <div className="bg-slate-900/95 border-2 border-emerald-500/70 rounded-3xl p-5 shadow-2xl max-w-sm w-full mx-auto">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  lastMatchedAlert.action === "out" ? "bg-rose-500 text-white" : "bg-emerald-500 text-slate-950"
                }`}>
                  {lastMatchedAlert.action === "out" ? "🔴 OUT दर्ज (प्रस्थान)" : `🟢 IN दर्ज (${lastMatchedAlert.status})`}
                </span>
                <span className="text-xs font-mono text-emerald-300 font-bold">{lastMatchedAlert.time}</span>
              </div>
              <h3 className="text-xl font-black text-white truncate">{lastMatchedAlert.name}</h3>
              <p className="text-xs text-slate-300 mt-1">
                {lastMatchedAlert.className || "Class"} • Roll #{lastMatchedAlert.rollNo || "—"} ({lastMatchedAlert.confidence}% Match)
              </p>
              
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-300">
                  कैमरा पॉज़: {globalFreezeCountdown}s (अगले व्यक्ति के लिए रुकें)
                </span>
              </div>
            </div>
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
              <button
                type="button"
                onClick={() => setShowEnrolledProfilesModal(true)}
                className="text-[11px] font-bold text-emerald-400/90 bg-black/60 hover:bg-black/85 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 border border-emerald-500/30 transition cursor-pointer"
                title="एनरोल किए गए चेहरे देखें व साफ़ करें"
              >
                <span>{(kioskScanMode === "auto" ? currentShiftMode : kioskScanMode) === "in" ? "🟢 IN Mode (आगमन)" : "🔴 OUT Mode (प्रस्थान)"}</span>
                <span>•</span>
                <span>{enrolledCount > 0 ? `${enrolledCount} Enrolled (जाँचें)` : "0 Enrolled"}</span>
              </button>
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
                {[
                  ...(teachers || []).map(t => ({ ...t, isTeacher: true })),
                  ...(students || [])
                ].slice(0, 7).map((st) => {
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
                      <span>{isEnrolled ? "✓📷" : "+📸"} {st.name.split(" ")[0]} {st.rollNo ? `(#${st.rollNo})` : "(Staff)"}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowManualSearch(true)}
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] shrink-0"
                >
                  खोजें...
                </button>
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

      {/* ── ENROLLED PROFILES & BIOMETRIC HEALTH MODAL ── */}
      {showEnrolledProfilesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>पंजीकृत चेहरे (Enrolled Profiles)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs border border-emerald-500/30">
                      {Object.keys(enrolledMap).length} Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    AI फेस डेटाबेस में सुरक्षित 128-D वेक्टर्स। गलत पहचान से बचने के लिए धुंधले चेहरे हटाएँ या री-एनरोल करें।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrolledProfilesModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">जीरो-मीन नॉर्मलाइज्ड वेक्टर (Strict Distance ≤ 0.42)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const validIds = [...students.map(s => s.id), ...teachers.map(t => t.id)];
                    await purgeDummyFaceDescriptors(schoolId, validIds);
                    await loadDescriptors();
                    setCooldownToast("✨ अमान्य / डमी वेक्टर्स सफलतापूर्वक साफ़ कर दिए गए!");
                    setTimeout(() => setCooldownToast(null), 3000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="डमी / अमान्य वेक्टर्स हटाएँ"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>डमी वेक्टर्स साफ़ करें</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrolledProfilesModal(false);
                    setShowEnrollmentModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-700/30"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-300" />
                  <span>नया चेहरा एनरोल करें</span>
                </button>
              </div>
            </div>

            {/* Profiles List */}
            <div className="flex-1 overflow-y-auto mt-3 divide-y divide-slate-800/80 pr-1 space-y-2">
              {Object.keys(enrolledMap).length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <UserCheck className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="font-bold">अभी कोई चेहरा एनरोल नहीं है</p>
                  <p className="text-xs text-slate-500 mt-1">नीचे 'नया चेहरा एनरोल करें' पर क्लिक करके फोटो लें।</p>
                </div>
              ) : (
                Object.values(enrolledMap).map((rec) => {
                  const isTeacher = rec.role === "TEACHER" || (teachers && teachers.some(t => t.id === rec.studentId));
                  return (
                    <div
                      key={rec.studentId}
                      className="pt-2.5 pb-2 px-2 flex items-center justify-between gap-3 hover:bg-slate-800/50 rounded-2xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-300">
                          {rec.photoUrl ? (
                            <img src={rec.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{rec.name?.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white truncate">{rec.name}</h4>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-black uppercase ${
                              isTeacher ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            }`}>
                              {isTeacher ? "शिक्षक (Faculty)" : (rec.className || "छात्र")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate font-mono">
                            {rec.rollNo ? `Roll #${rec.rollNo} • ` : ""}{rec.designation ? `${rec.designation} • ` : ""}ID: {rec.studentId}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>128-D Zero-Mean Active</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {rec.enrolledAt ? new Date(rec.enrolledAt).toLocaleDateString("en-IN") : "Enrolled"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowEnrolledProfilesModal(false);
                            setShowEnrollmentModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                          title="इस व्यक्ति का नया साफ़ फ्रंट फेस फोटो लें"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">री-एनरोल</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`क्या आप ${rec.name} का चेहरा बायोमेट्रिक डेटाबेस से हटाना चाहते हैं?`)) {
                              await deleteFaceDescriptor(rec.studentId, schoolId);
                              await loadDescriptors();
                              setCooldownToast(`🗑️ ${rec.name} का बायोमेट्रिक वेक्टर हटा दिया गया`);
                              setTimeout(() => setCooldownToast(null), 3000);
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 flex items-center justify-center transition cursor-pointer"
                          title="चेहरा वेक्टर डिलीट करें (खराब या धुंधला होने पर)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN SHIFT TIMING CONFIG MODAL ── */}
      {showTimeConfigModal && (
        <div className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">सुपर एडमिन: शिफ्ट टाइमिंग कंट्रोल</h3>
                  <p className="text-xs text-slate-400">IN व OUT हाजिरी का समय निर्धारित करें</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimeConfigModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>सुबह विद्यालय प्रवेश (IN) बंद होने का समय</span>
                </label>
                <input
                  type="time"
                  value={adminInCutoffTime}
                  onChange={(e) => setAdminInCutoffTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  इस समय (जैसे {adminInCutoffTime}) तक आने वाले छात्रों की केवल <strong>IN (प्रवेश)</strong> हाजिरी लगेगी।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>दोपहर विद्यालय प्रस्थान (OUT) शुरू होने का समय</span>
                </label>
                <input
                  type="time"
                  value={adminOutStartTime}
                  onChange={(e) => setAdminOutStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  इस समय (जैसे {adminOutStartTime}) के बाद छुट्टी पर जाने वाले छात्रों की <strong>OUT (प्रस्थान)</strong> हाजिरी लगेगी।
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-cyan-300">🛡️ सुरक्षित नियम (Duplicate Protection Active):</p>
                <p>• एक दिन में केवल 1 IN और 1 OUT दर्ज होगा।</p>
                <p>• बिना IN लगे कभी भी OUT दर्ज नहीं होगा।</p>
                <p>• IN और OUT के बीच न्यूनतम 30 मिनट का अनिवार्य अंतराल लागू रहेगा।</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    localStorage.setItem(`nst_kiosk_in_cutoff_${schoolId}`, adminInCutoffTime);
                    localStorage.setItem(`nst_kiosk_out_start_${schoolId}`, adminOutStartTime);
                    try {
                      const { doc, setDoc } = await import("firebase/firestore");
                      const { db } = await import("../../school-firebase");
                      if (db) {
                        await setDoc(
                          doc(db, `schools/${schoolId}/config/attendance_timings`),
                          {
                            inCutoffTime: adminInCutoffTime,
                            outStartTime: adminOutStartTime,
                            updatedAt: new Date().toISOString()
                          },
                          { merge: true }
                        );
                      }
                    } catch {}
                    setShowTimeConfigModal(false);
                    setCooldownToast(`✅ शिफ्ट टाइमिंग सुरक्षित: IN कटऑफ ${adminInCutoffTime}, OUT शुरू ${adminOutStartTime}`);
                    setTimeout(() => setCooldownToast(null), 3500);
                  } catch (e) {
                    setShowTimeConfigModal(false);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition cursor-pointer"
              >
                टाइमिंग सेव करें (Save Schedule)
              </button>
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
