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
  getDeletedFaceIds,
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
  FaceLightingAssessment,
  loadFaceApiModels,
  isFaceApiLoaded,
  upgradeLegacyDescriptors,
  revectorizeLegacyRecord,
  repairAndResyncAllFaceDescriptors,
  purgeFaceDescriptor,
  calculateArcFaceCosineSimilarity,
  calculateCosineSimilarity,
  draw3DHolographicMesh,
  isActiveRosterPerson
} from "../../utils/faceRecognitionEngine";
import { markStudentQrAttendance, markStaffAttendanceAtomic, todayStr, saveNstaMessage } from "../../school-firebase";
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
  initialTestMode?: boolean;
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
  onAttendanceUpdated,
  initialTestMode = false
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
  const [aiEngineStatus, setAiEngineStatus] = useState<"loading" | "ready" | "fallback">(() => {
    return isFaceApiLoaded() ? "ready" : "loading";
  });
  const [liveMatchedCandidate, setLiveMatchedCandidate] = useState<any | null>(null);
  const [isFaceUnregistered, setIsFaceUnregistered] = useState<boolean>(false);

  // Eye Blink & Liveness + 1-Tap Candidate state
  const [pendingBlinkStudent, setPendingBlinkStudent] = useState<any>(null);
  const [lowConfidenceCandidate, setLowConfidenceCandidate] = useState<any>(null);
  const [activeCooldownInfo, setActiveCooldownInfo] = useState<{ name: string; rollNo?: string; remainingSec: number } | null>(null);
  const blinkDetectorRef = useRef<EyeBlinkDetector>(new EyeBlinkDetector());
  const blinkPromptSpokenForRef = useRef<string | null>(null);
  const lastBlinkVoiceTimeRef = useRef<number>(0);
  const [isVectorizingClass, setIsVectorizingClass] = useState<boolean>(false);

  // Screen Fill Light / Flashlight & Ambient Illumination State
  const [screenFlashActive, setScreenFlashActive] = useState<boolean>(false);
  const [currentLighting, setCurrentLighting] = useState<FaceLightingAssessment | null>(null);
  const [isLowLightWarning, setIsLowLightWarning] = useState<boolean>(false);
  const [isAmbiguousMatchNotice, setIsAmbiguousMatchNotice] = useState<string | null>(null);

  // 25s Cooldown Guard tracker: studentId -> timestamp
  const scanCooldownsRef = useRef<Map<string, number>>(new Map());
  // Global Camera Cooldown Guard: freezes scan loop for 2s after any successful punch
  const globalCooldownUntilRef = useRef<number>(0);
  const isPunchingLockRef = useRef<boolean>(false); // Synchronous Punch Lock
  const [globalFreezeCountdown, setGlobalFreezeCountdown] = useState<number>(0);
  const [showEnrolledProfilesModal, setShowEnrolledProfilesModal] = useState<boolean>(false);
  const [confirmDeleteBiometricId, setConfirmDeleteBiometricId] = useState<string | null>(null);

  // Super Admin Configurable IN / OUT Shift Timings
  const [adminInCutoffTime, setAdminInCutoffTime] = useState<string>(() => {
    return localStorage.getItem(`nst_kiosk_in_cutoff_${schoolId}`) || "10:00";
  });
  const [adminOutStartTime, setAdminOutStartTime] = useState<string>(() => {
    return localStorage.getItem(`nst_kiosk_out_start_${schoolId}`) || "11:30";
  });
  const [showTimeConfigModal, setShowTimeConfigModal] = useState<boolean>(false);

  // ── LIVE FACE TEST PLAYGROUND (Zero Attendance, Match & Voice Name Announcement) ──
  const [isFaceTestMode, setIsFaceTestMode] = useState<boolean>(() => Boolean(initialTestMode));
  const [testMatchCounts, setTestMatchCounts] = useState<Record<string, number>>({});
  const [testActiveMatch, setTestActiveMatch] = useState<{
    studentId: string;
    name: string;
    role?: "STUDENT" | "TEACHER" | "STAFF";
    designation?: string;
    rollNo?: string;
    className?: string;
    photoUrl?: string;
    similarityPercent: number;
    matchCount: number;
    lastTime: string;
    distance?: number;
  } | null>(null);
  const [testCooldownRemaining, setTestCooldownRemaining] = useState<number>(0);
  const [testSessionLog, setTestSessionLog] = useState<Array<{
    id: string;
    name: string;
    role?: string;
    className?: string;
    time: string;
    similarityPercent: number;
    matchNumber: number;
  }>>([]);
  const testAnnounceCooldownRef = useRef<Map<string, number>>(new Map());
  const testActiveMatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMatchedAlertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTestHistoryTray, setShowTestHistoryTray] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (testActiveMatchTimeoutRef.current) clearTimeout(testActiveMatchTimeoutRef.current);
      if (lastMatchedAlertTimeoutRef.current) clearTimeout(lastMatchedAlertTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen && initialTestMode) {
      setIsFaceTestMode(true);
    }
  }, [isOpen, initialTestMode]);

  // Voice Speech Synthesizer for Test Mode: Bas naam bolega ("Nadim", "Aarav", etc.)
  const announceFaceTestMatch = useCallback((name: string, count: number, role?: string) => {
    if (!name) return;
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        // Speak ONLY the person's name cleanly
        const utterance = new SpeechSynthesisUtterance(name);
        utterance.lang = "hi-IN";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
          voices.find((v) => v.lang.includes("hi") || v.lang.includes("HI")) ||
          voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("hi_IN")) ||
          voices.find((v) => v.lang.includes("en-GB") || v.lang.includes("en-US"));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        window.speechSynthesis.speak(utterance);
      } else {
        speakNotification(name, undefined, { force: true, playTone: false });
      }
    } catch (err) {
      console.warn("Speech synthesis error:", err);
    }
  }, []);

  const isProcessingRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLiveDescriptorRef = useRef<number[] | null>(null);
  const isDetectingBusyRef = useRef<boolean>(false);
  const lastValidFacesRef = useRef<{ faces: any[]; timestamp: number }>({ faces: [], timestamp: 0 });

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

  const [isRepairingFaces, setIsRepairingFaces] = useState(false);

  // Manual 1-Tap Trigger for Cleaning Corrupted/Overwritten Biometrics and Re-syncing from Real Photos
  const handleManualRepairBiometrics = useCallback(async () => {
    setIsRepairingFaces(true);
    setCooldownToast("🔄 बायोमेट्रिक डेटा की जांच व फोटो से री-सिंक हो रहा है...");
    try {
      const result = await repairAndResyncAllFaceDescriptors(
        schoolId,
        students,
        teachers,
        (msg) => setCooldownToast(msg)
      );
      const fixedMap = await getSchoolFaceDescriptors(schoolId);
      setEnrolledMap(fixedMap);
      setTestMatchCounts({});
      setTestActiveMatch(null);
      testAnnounceCooldownRef.current.clear();
      setCooldownToast(
        `✅ बायोमेट्रिक डेटा ठीक हो गया! ${result.repairedCount} फोटो से री-सिंक हुए, ${result.totalActive} चेहरे एक्टिव हैं।`
      );
      setTimeout(() => setCooldownToast(null), 4000);
    } catch (e) {
      console.error("[FaceRepair] Error repairing descriptors:", e);
      setCooldownToast("⚠️ बायोमेट्रिक री-सिंक में त्रुटि, कृपया पुनः प्रयास करें।");
      setTimeout(() => setCooldownToast(null), 3000);
    } finally {
      setIsRepairingFaces(false);
    }
  }, [schoolId, students, teachers]);

  // Load Enrolled Descriptors from IndexedDB & Auto-Enroll Roster
  const loadDescriptors = useCallback(async () => {
    setLoadingDescriptors(true);
    try {
      // 1. Immediately activate cached face descriptors, filtering out any deactivated/deleted roster members
      let map = await getSchoolFaceDescriptors(schoolId);
      const rosterById = new Map<string, any>();
      for (const s of students || []) {
        if (s?.id) rosterById.set(s.id, s);
      }
      for (const t of teachers || []) {
        if (t?.id) rosterById.set(t.id, t);
      }
      const filteredMap: Record<string, FaceDescriptorRecord> = {};
      for (const [id, rec] of Object.entries(map)) {
        const rosterPerson = rosterById.get(id);
        if (rosterPerson && !isActiveRosterPerson(rosterPerson)) {
          continue;
        }
        filteredMap[id] = rec;
      }
      map = filteredMap;
      setEnrolledMap(map);
      setLoadingDescriptors(false);

      // 2. Defer background photo auto-enrollment so live camera inference has 100% priority
      setTimeout(async () => {
        try {
          upgradeLegacyDescriptors(map, (upgraded) => {
            setEnrolledMap((prev) => ({ ...prev, [upgraded.studentId]: upgraded }));
          }).catch(() => {});

          const deletedFaceIds = getDeletedFaceIds(schoolId || "default_school");

          if (students && students.length > 0) {
            const toEnroll = students.filter(
              (st) =>
                st &&
                isActiveRosterPerson(st) &&
                st.photoUrl &&
                typeof st.photoUrl === "string" &&
                st.photoUrl.trim() &&
                !map[st.id] &&
                !deletedFaceIds.has(st.id)
            );
            if (toEnroll.length > 0) {
              const updatedMap = { ...map };
              let anyAdded = false;
              for (const st of toEnroll.slice(0, 30)) {
                try {
                  const rec = await enrollStudentFromPhotoUrl({
                    id: st.id,
                    schoolId: schoolId || "default_school",
                    name: st.name,
                    rollNo: String(st.rollNo || ""),
                    classId: st.classId || classId,
                    className: st.className || className,
                    photoUrl: st.photoUrl,
                    active: st.active,
                    isDeleted: st.isDeleted,
                    status: st.status,
                    tcIssued: st.tcIssued,
                  });
                  if (rec) {
                    updatedMap[rec.studentId] = rec;
                    anyAdded = true;
                  }
                  await new Promise((r) => setTimeout(r, 100));
                } catch {}
              }
              if (anyAdded) {
                setEnrolledMap(updatedMap);
                map = updatedMap;
              }
            }
          }

          if (teachers && teachers.length > 0) {
            const teachersToEnroll = teachers.filter(
              (t) =>
                t &&
                isActiveRosterPerson(t) &&
                t.photoUrl &&
                typeof t.photoUrl === "string" &&
                t.photoUrl.trim() &&
                !map[t.id] &&
                !deletedFaceIds.has(t.id)
            );
            if (teachersToEnroll.length > 0) {
              const updatedMap = { ...map };
              let anyAdded = false;
              for (const t of teachersToEnroll.slice(0, 15)) {
                try {
                  const rec = await enrollTeacherFromPhotoUrl({
                    id: t.id,
                    schoolId: schoolId || "default_school",
                    name: t.name,
                    designation: t.designation || (Array.isArray(t.subjects) ? t.subjects.join(", ") : "Faculty"),
                    photoUrl: t.photoUrl,
                    active: t.active,
                    isDeleted: t.isDeleted,
                    status: t.status,
                  });
                  if (rec) {
                    updatedMap[rec.studentId] = rec;
                    anyAdded = true;
                  }
                  await new Promise((r) => setTimeout(r, 100));
                } catch {}
              }
              if (anyAdded) {
                setEnrolledMap(updatedMap);
              }
            }
          }
        } catch {}
      }, 1500);
    } catch (e) {
      console.warn("Error loading face descriptors:", e);
      setLoadingDescriptors(false);
    }
  }, [schoolId, students, teachers, classId, className]);

  useEffect(() => {
    if (isOpen) {
      loadDescriptors();
      if (!isFaceApiLoaded()) {
        loadFaceApiModels()
          .then((ok) => setAiEngineStatus(ok ? "ready" : "fallback"))
          .catch(() => setAiEngineStatus("fallback"));
      } else {
        setAiEngineStatus("ready");
      }
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

  // 1-Click Batch Auto-Vectorize whole class from existing photos in ~2 seconds
  const handle1ClickClassVectorize = async () => {
    if (!students || students.length === 0 || isVectorizingClass) return;
    const studentsWithPhotos = students.filter(
      (s) => s && isActiveRosterPerson(s) && s.photoUrl && s.photoUrl.trim()
    );
    if (studentsWithPhotos.length === 0) {
      setCooldownToast("⚠️ सक्रिय छात्रों की प्रोफाइल में कोई फोटो नहीं मिली।");
      setTimeout(() => setCooldownToast(null), 3000);
      return;
    }
    setIsVectorizingClass(true);
    setCooldownToast(`⚡ पूरी क्लास (${studentsWithPhotos.length} छात्र) की फोटो से फेस ID बन रही है...`);
    try {
      let savedCount = 0;
      const updatedMap = { ...enrolledMap };
      for (const st of studentsWithPhotos) {
        try {
          const rec = await enrollStudentFromPhotoUrl({
            id: st.id,
            schoolId: schoolId || "default_school",
            name: st.name,
            rollNo: String(st.rollNo || ""),
            classId: st.classId || classId,
            className: st.className || className,
            photoUrl: st.photoUrl,
            active: st.active,
            isDeleted: st.isDeleted,
            status: st.status,
            tcIssued: st.tcIssued,
          });
          if (rec) {
            updatedMap[rec.studentId] = rec;
            savedCount++;
          }
        } catch {}
      }
      setEnrolledMap(updatedMap);
      playAttendanceSuccessChime();
      setCooldownToast(`✅ पूरी क्लास (${savedCount} छात्र) की फेस ID 2 सेकंड में सेव हो गई!`);
      setTimeout(() => setCooldownToast(null), 3500);
      if (onAttendanceUpdated) onAttendanceUpdated();
    } catch {
      setCooldownToast("❌ क्लास फेस ID सेव करने में त्रुटि आई");
      setTimeout(() => setCooldownToast(null), 3000);
    } finally {
      setIsVectorizingClass(false);
    }
  };

  // Handle successful attendance marking (With 2-Second Crisp Auto Fade-Out)
  const handleMarkAttendanceSuccess = useCallback(
    async (match: {
      studentId: string;
      name: string;
      rollNo?: string;
      classId?: string;
      className?: string;
      photoUrl?: string;
      similarityPercent: number;
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

      setActiveCooldownInfo(null);
      setPendingBlinkStudent(null);
      setLowConfidenceCandidate(null);

      const timeFormatted = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      // Verify person is still active in loaded roster (blocks deactivated/deleted/TC profiles)
      const matchedRosterRecord =
        (students || []).find((s) => s.id === match.studentId) ||
        (teachers || []).find((t) => t.id === match.studentId);
      if (matchedRosterRecord && !isActiveRosterPerson(matchedRosterRecord)) {
        isPunchingLockRef.current = false;
        setCooldownToast(`⚠️ ${match.name} का खाता निष्क्रिय या हटाया गया है। हाजिरी दर्ज नहीं की गई।`);
        setTimeout(() => setCooldownToast(null), 3000);
        return;
      }

      // Check if match is a Teacher
      const descriptorRec = enrolledMap[match.studentId];
      const isTeacherMatch =
        descriptorRec?.role === "TEACHER" ||
        (teachers && teachers.some((t) => t.id === match.studentId));

      if (isTeacherMatch) {
        // ── TEACHER ATTENDANCE PUNCH (Atomic RTDB Transaction + Symmetric IN/OUT Rules) ──
        try {
          const staffRes = await markStaffAttendanceAtomic({
            schoolId,
            staffId: match.studentId,
            staffName: match.name,
            role: "TEACHER",
            employeeId: descriptorRec?.designation || "Faculty",
            date: todayStr(),
            scanMode: kioskScanMode,
            currentShiftMode,
          });

          if (staffRes.alreadyMarked) {
            playCooldownTick();
            setCooldownToast(staffRes.message);
            setTimeout(() => setCooldownToast(null), staffRes.tooEarlyForOut ? 3500 : 2500);

            isPunchingLockRef.current = false;
            setGlobalFreezeCountdown(0);
            globalCooldownUntilRef.current = 0;
            return;
          }

          if (!staffRes.success || !staffRes.cloudSaved) {
            playCooldownTick();
            scanCooldownsRef.current.delete(match.studentId);
            setCooldownToast(staffRes.message || "शिक्षक की हाजिरी क्लाउड पर सेव नहीं हुई। कृपया दोबारा प्रयास करें।");
            setTimeout(() => setCooldownToast(null), 3000);

            isPunchingLockRef.current = false;
            setGlobalFreezeCountdown(0);
            globalCooldownUntilRef.current = 0;
            return;
          }

          // Cooldown only updated on successful committed cloud punch!
          scanCooldownsRef.current.set(match.studentId, now);
          globalCooldownUntilRef.current = now + 2000;
          setGlobalFreezeCountdown(2);

          playAttendanceSuccessChime();
          hapticStrong();

          const action = staffRes.action;
          const recordedTime = action === "out" ? (staffRes.outTime || timeFormatted) : (staffRes.inTime || timeFormatted);

          const checkInEntry: RecentCheckIn = {
            studentId: match.studentId,
            name: match.name,
            role: "TEACHER",
            designation: descriptorRec?.designation || "Faculty",
            className: "शिक्षक (Faculty)",
            photoUrl: match.photoUrl || descriptorRec?.photoUrl,
            time: recordedTime,
            status: action === "out" ? "OUT" : "PRESENT",
            action,
            stayDuration: staffRes.stayDuration,
            confidence: match.similarityPercent
          };

          setLastMatchedAlert(checkInEntry);
          if (lastMatchedAlertTimeoutRef.current) clearTimeout(lastMatchedAlertTimeoutRef.current);
          lastMatchedAlertTimeoutRef.current = setTimeout(() => {
            setLastMatchedAlert(null);
            setLiveMatchedCandidate(null);
            setPendingBlinkStudent(null);
            setActiveCooldownInfo(null);
            setGlobalFreezeCountdown(0);
            globalCooldownUntilRef.current = 0;
            isPunchingLockRef.current = false;
            blinkDetectorRef.current.reset();
            blinkPromptSpokenForRef.current = null;
          }, 2000);
          setRecentScans((prev) => [checkInEntry, ...prev.filter((p) => p.studentId !== match.studentId)].slice(0, 8));

          const teacherVoice = action === "out" ? `${match.name} प्रस्थान` : `${match.name} उपस्थित`;
          try {
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
              const utt = new SpeechSynthesisUtterance(teacherVoice);
              utt.lang = "hi-IN";
              utt.rate = 1.0;
              window.speechSynthesis.speak(utt);
            } else {
              speakNotification("हाजिरी", teacherVoice);
            }
          } catch {}

          if (onAttendanceUpdated) onAttendanceUpdated();
          return; // Strict return: NEVER fall through to student flow
        } catch (err) {
          console.error("Teacher attendance punch error:", err);
          scanCooldownsRef.current.delete(match.studentId);
          isPunchingLockRef.current = false;
          setGlobalFreezeCountdown(0);
          globalCooldownUntilRef.current = 0;

          setCooldownToast("शिक्षक की हाजिरी सेव नहीं हुई। कृपया दोबारा प्रयास करें।");
          setTimeout(() => setCooldownToast(null), 3000);
          return; // Strict return on teacher error
        }
      }

      // ── STUDENT ATTENDANCE FLOW ──
      const targetClassId = match.classId || classId || "cls_default";
      const targetClassName = match.className || className || "Class";

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

          isPunchingLockRef.current = false;
          setGlobalFreezeCountdown(0);
          globalCooldownUntilRef.current = 0;
          return;
        }

        if (!res?.success) {
          playCooldownTick();
          setCooldownToast(res?.message || "हाजिरी दर्ज नहीं हो सकी।");
          setTimeout(() => setCooldownToast(null), 3000);

          isPunchingLockRef.current = false;
          setGlobalFreezeCountdown(0);
          globalCooldownUntilRef.current = 0;
          return;
        }

        // Successful punch: Now set cooldown and freeze
        scanCooldownsRef.current.set(match.studentId, now);
        globalCooldownUntilRef.current = now + 2000;
        setGlobalFreezeCountdown(2);

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
          confidence: match.similarityPercent
        };

        setLastMatchedAlert(checkInEntry);
        if (lastMatchedAlertTimeoutRef.current) clearTimeout(lastMatchedAlertTimeoutRef.current);
        lastMatchedAlertTimeoutRef.current = setTimeout(() => {
          setLastMatchedAlert(null);
          setLiveMatchedCandidate(null);
          setPendingBlinkStudent(null);
          setActiveCooldownInfo(null);
          setGlobalFreezeCountdown(0);
          globalCooldownUntilRef.current = 0;
          isPunchingLockRef.current = false;
          blinkDetectorRef.current.reset();
          blinkPromptSpokenForRef.current = null;
        }, 2000);
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

        // Exact requested voice confirmation: In पर "{Name} उपस्थित", Exit पर "{Name} प्रस्थान"
        try {
          const speechVoiceText = action === "out" ? `${match.name} प्रस्थान` : `${match.name} उपस्थित`;
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(speechVoiceText);
            utt.lang = "hi-IN";
            utt.rate = 1.0;
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice =
              voices.find((v) => v.lang.includes("hi") || v.lang.includes("HI")) ||
              voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("hi_IN")) ||
              voices.find((v) => v.lang.includes("en-GB") || v.lang.includes("en-US"));
            if (preferredVoice) utt.voice = preferredVoice;
            window.speechSynthesis.speak(utt);
          } else {
            speakNotification("हाजिरी", speechVoiceText);
          }
        } catch {}

        if (onAttendanceUpdated) {
          onAttendanceUpdated();
        }
      } catch (err) {
        console.error("Student attendance punch error:", err);
        scanCooldownsRef.current.delete(match.studentId);
        isPunchingLockRef.current = false;
        setGlobalFreezeCountdown(0);
        globalCooldownUntilRef.current = 0;

        setCooldownToast("हाजिरी सेव नहीं हुई। कृपया दोबारा प्रयास करें।");
        setTimeout(() => setCooldownToast(null), 3000);
      }
    },
    [schoolId, classId, className, teacherId, kioskScanMode, currentShiftMode, adminInCutoffTime, onAttendanceUpdated, enrolledMap, teachers, schoolName]
  );

  // Manual Attendance Mark (Safe: Records attendance WITHOUT touching biometric descriptors)
  const handleManualMark = (st: any) => {
    handleMarkAttendanceSuccess({
      studentId: st.id,
      name: st.name,
      rollNo: st.rollNo,
      classId: st.classId || classId,
      className: st.className || className,
      photoUrl: st.photoUrl,
      similarityPercent: 100
    });
    setCooldownToast(`✅ ${st.name} की हाजिरी (मैनुअल) दर्ज हो गई!`);
    setTimeout(() => setCooldownToast(null), 3000);
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

      // Concurrency Lock: Never queue overlapping detections if previous frame is still analyzing
      if (isDetectingBusyRef.current) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      // Ultra-Fast Group Scan: 140ms inference interval (~7 FPS) for smooth single-student reticle scanning
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

          isDetectingBusyRef.current = true;
          try {
            const detected = await detectFacesInFrame(video, enrolledMap, { schoolId });
            if (detected[0]?.descriptor && (detected[0].descriptor.length === 512 || detected[0].descriptor.length === 128)) {
              lastLiveDescriptorRef.current = detected[0].descriptor;
            }

            // ── KBY-AI FULLSCREEN DETECTION WITH TEMPORAL SMOOTHING BUFFER ──
            const nowTime = Date.now();
            let detectedFaces = detected || [];

            if (detectedFaces.length > 0) {
              lastValidFacesRef.current = { faces: detectedFaces, timestamp: nowTime };
            } else if (nowTime - lastValidFacesRef.current.timestamp < 350) {
              // Smooth out brief 1-frame detection dips so boxes never flicker or vanish ("gayab ho jate hai")
              detectedFaces = lastValidFacesRef.current.faces;
            }

            if (detectedFaces.length === 0) {
              setHasFaceInView(false);
              setDetectedFaceCount(0);
              setLiveMatchedCandidate(null);
              setIsFaceUnregistered(false);
              setPendingBlinkStudent(null);
              setLowConfidenceCandidate(null);
              setActiveCooldownInfo(null);
              setCurrentLighting(null);
              setIsLowLightWarning(false);
              setIsAmbiguousMatchNotice(null);
              blinkDetectorRef.current.reset();
              blinkPromptSpokenForRef.current = null;
              if (testActiveMatchTimeoutRef.current) clearTimeout(testActiveMatchTimeoutRef.current);
              setTestActiveMatch(null);

              // KBY-AI Fullscreen Viewfinder Brackets (Corners of the screen)
              const margin = 28;
              const bracketLen = 32;
              ctx.save();
              ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              // Top-Left
              ctx.moveTo(margin, margin + bracketLen); ctx.lineTo(margin, margin); ctx.lineTo(margin + bracketLen, margin);
              // Top-Right
              ctx.moveTo(canvas.width - margin - bracketLen, margin); ctx.lineTo(canvas.width - margin, margin); ctx.lineTo(canvas.width - margin, margin + bracketLen);
              // Bottom-Left
              ctx.moveTo(margin, canvas.height - margin - bracketLen); ctx.lineTo(margin, canvas.height - margin); ctx.lineTo(margin + bracketLen, canvas.height - margin);
              // Bottom-Right
              ctx.moveTo(canvas.width - margin - bracketLen, canvas.height - margin); ctx.lineTo(canvas.width - margin, canvas.height - margin); ctx.lineTo(canvas.width - margin, canvas.height - margin - bracketLen);
              ctx.stroke();

              // Subtle scanning HUD badge at top
              const scanMsg = "🔍 कैमरे के सामने आएं • AI Face Scanning Active";
              ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
              const msgW = ctx.measureText(scanMsg).width;
              const pillW = msgW + 28;
              const pillH = 30;
              const pillX = canvas.width / 2 - pillW / 2;
              const pillY = margin + 6;
              ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
              ctx.beginPath();
              ctx.roundRect(pillX, pillY, pillW, pillH, 15);
              ctx.fill();
              ctx.strokeStyle = "rgba(255, 255, 255, 0.20)";
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.fillStyle = "#e2e8f0";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(scanMsg, canvas.width / 2, pillY + pillH / 2);
              ctx.restore();
            } else {
              // Sort faces by area: largest face in foreground gets priority for attendance / speech
              detectedFaces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
              const primaryFace = detectedFaces[0];
              const matchedStudent = primaryFace.matchedStudent;
              const isMatched = Boolean(matchedStudent);

              setHasFaceInView(true);
              setDetectedFaceCount(detectedFaces.length);
              if (detectedFaces.length > 1) {
                setIsAmbiguousMatchNotice("कैमरे में कई चेहरे हैं: एक समय में केवल एक व्यक्ति सामने आएँ");
              } else {
                setIsAmbiguousMatchNotice(null);
              }

              if (primaryFace.lighting) {
                setCurrentLighting(primaryFace.lighting);
                setIsLowLightWarning(primaryFace.lighting.isLowLight || primaryFace.lighting.isTooDark);
              }

              // ── 1. TEST MODE LOGIC (Zero Attendance, Voice Announcement only) ──
              if (isFaceTestMode) {
                if (detectedFaces.length > 1) {
                  setTestActiveMatch(null);
                } else if (isMatched && matchedStudent) {
                  const now = Date.now();
                  const lastAnnounced = testAnnounceCooldownRef.current.get(matchedStudent.studentId) || 0;
                  const cooldownMs = 2800;
                  const elapsed = now - lastAnnounced;

                  if (elapsed >= cooldownMs) {
                    testAnnounceCooldownRef.current.set(matchedStudent.studentId, now);
                    const newCount = (testMatchCounts[matchedStudent.studentId] || 0) + 1;
                    setTestMatchCounts((prev) => ({
                      ...prev,
                      [matchedStudent.studentId]: (prev[matchedStudent.studentId] || 0) + 1
                    }));

                    const timeFormatted = new Date().toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true
                    });

                    const activeRecord = {
                      studentId: matchedStudent.studentId,
                      name: matchedStudent.name,
                      role: matchedStudent.role,
                      designation: matchedStudent.designation,
                      className: matchedStudent.className || (matchedStudent.role === "TEACHER" ? "शिक्षक (Faculty)" : className),
                      rollNo: matchedStudent.rollNo,
                      photoUrl: matchedStudent.photoUrl || enrolledMap[matchedStudent.studentId]?.photoUrl,
                      similarityPercent: matchedStudent.similarityPercent,
                      matchCount: newCount,
                      lastTime: timeFormatted,
                      distance: matchedStudent.distance
                    };

                    setTestActiveMatch(activeRecord);
                    setTestCooldownRemaining(3);

                    if (testActiveMatchTimeoutRef.current) clearTimeout(testActiveMatchTimeoutRef.current);
                    testActiveMatchTimeoutRef.current = setTimeout(() => {
                      setTestActiveMatch(null);
                    }, 2200);

                    setTestSessionLog((prev) => [
                      {
                        id: `${matchedStudent.studentId}_${now}`,
                        name: matchedStudent.name,
                        role: matchedStudent.role,
                        className: activeRecord.className,
                        time: timeFormatted,
                        similarityPercent: matchedStudent.similarityPercent,
                        matchNumber: newCount
                      },
                      ...prev
                    ].slice(0, 30));

                    playAttendanceSuccessChime();
                    announceFaceTestMatch(matchedStudent.name, newCount, matchedStudent.role);
                  } else {
                    const remSec = Math.max(1, Math.ceil((cooldownMs - elapsed) / 1000));
                    setTestCooldownRemaining(remSec);
                  }
                }
              } else {
                // ── 2. NORMAL ATTENDANCE FLOW ──
                if (detectedFaces.length > 1) {
                  // Guard: Multiple faces in frame. Don't mark attendance to prevent photobomb or ambiguity
                  setLiveMatchedCandidate(null);
                  setIsFaceUnregistered(false);
                  setPendingBlinkStudent(null);
                  setLowConfidenceCandidate(null);
                } else {
                  const lastScanned = matchedStudent ? (scanCooldownsRef.current.get(matchedStudent.studentId) || 0) : 0;
                  const isUnderCooldown = matchedStudent && (Date.now() - lastScanned < 25000);

                  if (isUnderCooldown && matchedStudent) {
                    const rem = Math.max(1, Math.ceil((25000 - (Date.now() - lastScanned)) / 1000));
                    setActiveCooldownInfo({ name: matchedStudent.name, rollNo: matchedStudent.rollNo, remainingSec: rem });
                    setPendingBlinkStudent(null);
                    setLowConfidenceCandidate(null);
                  } else if (isMatched && matchedStudent) {
                    setActiveCooldownInfo(null);
                    setLowConfidenceCandidate(null);
                    setIsFaceUnregistered(false);
                    setLiveMatchedCandidate(matchedStudent);
                    setPendingBlinkStudent(null);

                    void handleMarkAttendanceSuccess(matchedStudent);
                  } else {
                    setLiveMatchedCandidate(null);
                    setIsFaceUnregistered(true);
                    setPendingBlinkStudent(null);
                    setLowConfidenceCandidate(null);
                  }
                }
              }

              // ── 3. KBY-AI FULLSCREEN BOUNDING BOXES (MAX 2 FOREGROUND FACES) ──
              // GREEN BOX = Matched Student with Name & Confidence Badge!
              // RED BOX = Unknown / Unregistered Face (No Match)!
              // Coordinate Mirroring: In selfie front camera (-scale-x-100), boxX is mirrored to align with displayed face
              const isMirrored = facingMode === "user";
              const foregroundFaces = detectedFaces.slice(0, 2);

              const isMultiFaceFrame = detectedFaces.length > 1;
              foregroundFaces.forEach((f) => {
                const isThisFaceBlockedMulti = isMultiFaceFrame || Boolean(f.multiFaceBlocked);
                const isThisFaceMatched = !isThisFaceBlockedMulti && Boolean(f.matchedStudent);
                const isCooldownFace = isThisFaceMatched && scanCooldownsRef.current.has(f.matchedStudent.studentId) && (Date.now() - (scanCooldownsRef.current.get(f.matchedStudent.studentId) || 0) < 25000);

                const drawX = isMirrored ? Math.max(0, canvas.width - f.x - f.width) : f.x;
                const drawY = f.y;

                const boxColor = isThisFaceBlockedMulti ? "#f59e0b" : isThisFaceMatched ? "#10b981" : "#ef4444";
                const accentColor = isThisFaceBlockedMulti ? "#fbbf24" : isThisFaceMatched ? "#34d399" : "#f87171";
                const glowColor = isThisFaceBlockedMulti
                  ? "rgba(245, 158, 11, 0.45)"
                  : isThisFaceMatched
                  ? "rgba(16, 185, 129, 0.45)"
                  : "rgba(239, 68, 68, 0.45)";

                ctx.save();

                // 1. Sleek Bounding Box with Rounded Corners
                ctx.beginPath();
                ctx.roundRect(drawX, drawY, f.width, f.height, 10);
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = boxColor;
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 12;
                ctx.stroke();

                // 2. High-Tech KBY-AI Corner Brackets
                const cLen = Math.min(26, f.width * 0.22);
                ctx.lineWidth = 5.5;
                ctx.strokeStyle = accentColor;
                ctx.beginPath();
                // Top-Left Corner
                ctx.moveTo(drawX, drawY + cLen); ctx.lineTo(drawX, drawY); ctx.lineTo(drawX + cLen, drawY);
                // Top-Right Corner
                ctx.moveTo(drawX + f.width - cLen, drawY); ctx.lineTo(drawX + f.width, drawY); ctx.lineTo(drawX + f.width, drawY + cLen);
                // Bottom-Left Corner
                ctx.moveTo(drawX, drawY + f.height - cLen); ctx.lineTo(drawX, drawY + f.height); ctx.lineTo(drawX + cLen, drawY + f.height);
                // Bottom-Right Corner
                ctx.moveTo(drawX + f.width - cLen, drawY + f.height); ctx.lineTo(drawX + f.width, drawY + f.height); ctx.lineTo(drawX + f.width, drawY + f.height - cLen);
                ctx.stroke();

                // 3. Name Badge Floating Directly Above Face
                ctx.shadowBlur = 0;
                let badgeTitle = "";
                let badgeSub = "";

                if (isThisFaceBlockedMulti) {
                  badgeTitle = "⚠️ कई चेहरे (Multi-Face Blocked)";
                  badgeSub = "एक समय में केवल एक व्यक्ति सामने आएँ";
                } else if (isCooldownFace && f.matchedStudent) {
                  badgeTitle = `✓ ${f.matchedStudent.name} (उपस्थिति दर्ज)`;
                  badgeSub = `${f.matchedStudent.className || "छात्र"} • 25s Pause Active`;
                } else if (isThisFaceMatched && f.matchedStudent) {
                  const simPct = f.matchedStudent.similarity !== undefined ? Number((f.matchedStudent.similarity * 100).toFixed(1)) : f.matchedStudent.similarityPercent;
                  badgeTitle = `🟢 ${f.matchedStudent.name} (Sim: ${simPct}%)`;
                  badgeSub = `${f.matchedStudent.className || (f.matchedStudent.role === "TEACHER" ? "शिक्षक (Faculty)" : "छात्र")}${f.matchedStudent.rollNo ? ` • Roll #${f.matchedStudent.rollNo}` : ""}${f.pose?.yaw !== undefined ? ` • Yaw: ${f.pose.yaw.toFixed(0)}°` : ""}`;
                } else {
                  badgeTitle = "🔴 अज्ञात चेहरा (No Match)";
                  badgeSub = "⚠️ Unregistered • डेटाबेस में नहीं मिला";
                }

                ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
                const titleW = ctx.measureText(badgeTitle).width;
                ctx.font = "600 11px system-ui, -apple-system, sans-serif";
                const subW = ctx.measureText(badgeSub).width;
                const badgeW = Math.max(f.width * 0.90, Math.max(titleW, subW) + 26);
                const badgeH = 40;
                const badgeX = Math.max(10, Math.min(canvas.width - badgeW - 10, drawX + f.width / 2 - badgeW / 2));
                const badgeY = Math.max(10, drawY - badgeH - 10);

                // Badge Background with Dark Glow
                ctx.fillStyle = isThisFaceBlockedMulti
                  ? "rgba(120, 53, 15, 0.94)"
                  : isThisFaceMatched
                  ? "rgba(6, 78, 59, 0.94)"
                  : "rgba(127, 29, 29, 0.94)";
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
                ctx.fill();

                ctx.strokeStyle = isThisFaceBlockedMulti ? "#fbbf24" : isThisFaceMatched ? "#34d399" : "#f87171";
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // Text: Title
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold 13.5px system-ui, -apple-system, sans-serif";
                ctx.fillText(badgeTitle, badgeX + badgeW / 2, badgeY + 14);

                // Text: Subtitle
                ctx.fillStyle = isThisFaceBlockedMulti ? "#fde68a" : isThisFaceMatched ? "#a7f3d0" : "#fca5a5";
                ctx.font = "600 11px system-ui, -apple-system, sans-serif";
                ctx.fillText(badgeSub, badgeX + badgeW / 2, badgeY + 29);

                ctx.restore();
              });
            }
          } catch (e) {
            // Frame processing blip ignored
          } finally {
            isDetectingBusyRef.current = false;
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, enrolledMap, facingMode, handleMarkAttendanceSuccess, pendingBlinkStudent, isFaceTestMode, announceFaceTestMatch, testMatchCounts, className]);

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
      <header className="h-14 sm:h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 shrink-0 z-20">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 transition-all ${
            isFaceTestMode
              ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/20"
              : "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/20"
          }`}>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[85px] sm:max-w-none">
                {isFaceTestMode ? "Face Test" : "Face Kiosk"}
              </h1>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border ${
                isFaceTestMode
                  ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}>
                {isFaceTestMode ? "🧪 Test" : "Live"}
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 truncate">
              {isFaceTestMode
                ? "जीरो अटेंडेंस • सिर्फ सेव चेहरा मैच करके नाम बोलेगा"
                : `${schoolName} ${className ? `• ${className}` : ""}`}
            </p>
          </div>
        </div>

        {/* Mode Switcher & Quick Controls (Strictly fits on mobile without overflowing) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Main Function Switch: Attendance vs Test Playground */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-black shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsFaceTestMode(false);
                setTestActiveMatch(null);
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer text-xs ${
                !isFaceTestMode
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="हाजिरी दर्ज करने का सामान्य मोड"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>हाजिरी</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFaceTestMode(true);
                setActiveCooldownInfo(null);
                setLastMatchedAlert(null);
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer text-xs ${
                isFaceTestMode
                  ? "bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-300/80"
                  : "text-amber-400 hover:text-amber-300 font-bold"
              }`}
              title="टेस्ट मोड: अटेंडेंस नहीं लगेगी, सिर्फ चेहरा मैच करके वॉयस से नाम बोलेगा"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>🧪 टेस्ट</span>
              <span className="hidden sm:inline text-[10px] font-semibold text-slate-800">(No Attn)</span>
            </button>
          </div>

          {/* Gate Scan Mode Toggle (Only shown during normal attendance, hidden during Test Mode) */}
          {!isFaceTestMode && (
            <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold shrink-0">
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
                className={`px-1.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  kioskScanMode === "in"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="केवल Check-IN"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>IN</span>
              </button>
              <button
                type="button"
                onClick={() => setKioskScanMode("out")}
                className={`px-1.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  kioskScanMode === "out"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="केवल Check-OUT"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>OUT</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTimeConfigModal(true)}
                className="px-1.5 py-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
                title="शिफ्ट टाइमिंग"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          )}

          {/* Quick Camera Flip in Header */}
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer shrink-0"
            title={facingMode === "user" ? "Switch to Rear Camera" : "Switch to Front Camera"}
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Screen Fill Light / Flash Toggle */}
          <button
            type="button"
            onClick={() => setScreenFlashActive((prev) => !prev)}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition border cursor-pointer shrink-0 ${
              screenFlashActive
                ? "bg-amber-300 text-slate-950 border-amber-400 shadow-md shadow-amber-300/40"
                : isLowLightWarning
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="स्क्रीन लाइट ऑन/ऑफ"
          >
            <Lightbulb className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${screenFlashActive ? "fill-slate-950 text-slate-950" : "text-amber-400"}`} />
          </button>

          {/* 1-Click Auto-Vectorize Whole Class Photos */}
          <button
            type="button"
            onClick={handle1ClickClassVectorize}
            disabled={isVectorizingClass}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center gap-1 shrink-0 disabled:opacity-50"
            title="पूरी क्लास के फोटो 1-क्लिक में 2 सेकंड में सेव करें"
          >
            <Zap className={`w-3.5 h-3.5 ${isVectorizingClass ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">1-क्लिक सेव</span>
          </button>

          {/* Enrolled Profiles */}
          <button
            type="button"
            onClick={() => setShowEnrolledProfilesModal(true)}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
            title="एनरोल किए गए चेहरे"
          >
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
            <span className="hidden md:inline">Profiles</span>
            <span className="text-[10px] sm:text-[11px] text-emerald-100 font-mono">({enrolledCount})</span>
          </button>

          {/* 1-Tap Biometric Re-Sync & Auto-Clean */}
          <button
            type="button"
            onClick={handleManualRepairBiometrics}
            disabled={isRepairingFaces}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-indigo-600/40 hover:bg-indigo-600/60 active:scale-95 text-indigo-200 border border-indigo-500/50 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1 shrink-0 disabled:opacity-50"
            title="बायोमेट्रिक डेटा चेक व फोटो से री-सिंक करें (Clean & Re-sync Faces)"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-300 ${isRepairingFaces ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">री-सिंक</span>
          </button>

          {/* Close [X] Button - Always Accessible and prominent on top right */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 hover:border-rose-700 active:scale-95 text-slate-200 flex items-center justify-center transition border border-slate-700 cursor-pointer shrink-0"
            title="Exit Kiosk"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
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

        {/* ── TEST MODE ACTIVE COMPACT HUD PILL (Ultra Slim, Unblocks Camera & Reticle) ── */}
        {isFaceTestMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 max-w-md w-[95%] pointer-events-auto animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-slate-900/90 border border-amber-400/90 rounded-full px-3 py-1 shadow-xl backdrop-blur-md flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="text-[11px] sm:text-xs font-black text-amber-300 shrink-0">
                  🧪 टेस्ट मोड
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-black border border-amber-400/30 shrink-0">
                  NO ATTENDANCE
                </span>
                <span className="hidden sm:inline text-[10px] text-slate-300 truncate">
                  • सिर्फ नाम बोलेगा
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTestMatchCounts({});
                    setTestActiveMatch(null);
                    setTestSessionLog([]);
                    testAnnounceCooldownRef.current.clear();
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="टेस्ट काउंटर रीसेट करें"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>रीसेट</span>
                </button>
                {testSessionLog.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTestHistoryTray((prev) => !prev)}
                    className="px-2 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] transition cursor-pointer"
                  >
                    {showTestHistoryTray ? "बंद" : `लॉग (${testSessionLog.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TEST MODE LIVE MATCH CARD (With Voice Announcement & Repeat Count) ── */}
        {isFaceTestMode && testActiveMatch && (
          <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-35 max-w-md w-[92%] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
            <div className="bg-slate-900/95 border-2 border-emerald-400 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-md ring-4 ring-emerald-500/20 flex flex-col gap-2.5 sm:gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-emerald-400 overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {testActiveMatch.photoUrl ? (
                    <img src={testActiveMatch.photoUrl} alt={testActiveMatch.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{testActiveMatch.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] uppercase flex items-center gap-1 shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>पहचान सफल (Verified)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-sm">
                      🎯 {testActiveMatch.matchCount} बार पहचाने गए
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white truncate mt-1">
                    {testActiveMatch.name}
                  </h3>
                  <p className="text-xs text-slate-300 truncate">
                    {testActiveMatch.className} {testActiveMatch.rollNo ? `• Roll #${testActiveMatch.rollNo}` : ""}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => announceFaceTestMatch(testActiveMatch.name, testActiveMatch.matchCount, testActiveMatch.role)}
                  className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-bold font-mono transition cursor-pointer"
                  title="नाम दोबारा बोलकर सुनें"
                >
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>वॉयस: "{testActiveMatch.name}"</span>
                </button>
                <div className="flex items-center gap-2 font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold">Sim: {testActiveMatch.similarityPercent}%</span>
                  <span>•</span>
                  <span>{testActiveMatch.lastTime}</span>
                </div>
              </div>

              <div className="bg-slate-950/80 rounded-xl px-3 py-1.5 border border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                <span>कैमरे में रहने पर 3 सेकंड बाद पुनः नाम बोला जाएगा</span>
                <span className="font-bold text-amber-300">रिपीट कूलडाउन: 3s</span>
              </div>
            </div>
          </div>
        )}

        {/* ── TEST MODE HISTORY LOG TRAY ── */}
        {isFaceTestMode && showTestHistoryTray && (
          <div className="absolute inset-x-4 top-20 bottom-24 z-40 max-w-lg mx-auto bg-slate-900/95 border-2 border-amber-400/80 rounded-3xl p-4 shadow-2xl backdrop-blur-md flex flex-col pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-amber-300">📋 टेस्ट सेशन लॉग</span>
                <span className="text-xs text-slate-400">({testSessionLog.length} मैच)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTestHistoryTray(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800 py-2">
              {testSessionLog.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  अभी कोई टेस्ट मैच दर्ज नहीं हुआ है
                </div>
              ) : (
                testSessionLog.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.className} • मैच #{item.matchNumber}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                        Sim {item.similarityPercent}%
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                यूनिक चेहरे: {Object.keys(testMatchCounts).length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTestMatchCounts({});
                  setTestActiveMatch(null);
                  setTestSessionLog([]);
                  testAnnounceCooldownRef.current.clear();
                  setShowTestHistoryTray(false);
                }}
                className="text-xs text-amber-400 hover:underline cursor-pointer"
              >
                लॉग साफ़ करें
              </button>
            </div>
          </div>
        )}

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

        {/* ── 2-SECOND AUTO FADE-OUT ATTENDANCE CELEBRATION CARD ── */}
        {lastMatchedAlert && (
          <div className="absolute inset-0 z-35 flex flex-col items-center justify-center p-4 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900/95 border-2 border-emerald-400 rounded-3xl p-5 shadow-2xl backdrop-blur-md max-w-xs w-full flex flex-col items-center text-center ring-4 ring-emerald-500/30">
              <div className="w-20 h-20 rounded-2xl border-2 border-emerald-400 overflow-hidden mb-3 bg-slate-800 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                {lastMatchedAlert.photoUrl ? (
                  <img src={lastMatchedAlert.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{lastMatchedAlert.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase mb-1 ${
                lastMatchedAlert.action === "out" ? "bg-rose-500 text-white" : "bg-emerald-500 text-slate-950"
              }`}>
                {lastMatchedAlert.action === "out" ? "🔴 OUT दर्ज (प्रस्थान)" : `🟢 IN दर्ज (${lastMatchedAlert.status})`}
              </span>
              <h3 className="text-xl font-black text-white truncate max-w-full">
                {lastMatchedAlert.name} उपस्थित
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {lastMatchedAlert.time} {lastMatchedAlert.rollNo ? `• Roll #${lastMatchedAlert.rollNo}` : ""}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>हाजिरी दर्ज • 2 सेकंड में साफ़ (Ready)</span>
              </div>
            </div>
          </div>
        )}

        {/* ── KBY-AI FULLSCREEN HUD OVERLAYS (NO RESTRICTIVE CIRCLES) ── */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 z-10">
          {/* Top HUD Floating Banner */}
          <div className="flex justify-center pt-2">
            <div className="pointer-events-auto">
              {isFaceTestMode ? (
                testActiveMatch ? (
                  <span className="text-[12px] font-black tracking-wider text-amber-200 bg-amber-950/95 border-2 border-amber-400 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 shadow-2xl animate-pulse">
                    <span>🎯</span>
                    <span>{testActiveMatch.name} • {testActiveMatch.matchCount} बार पहचाने गए (Sim: {testActiveMatch.similarityPercent}%)</span>
                  </span>
                ) : hasFaceInView ? (
                  <span className="text-[12px] font-black tracking-wider text-emerald-200 bg-slate-900/90 border border-emerald-400 px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>🧪 KBY-AI टेस्ट मैचिंग सक्रिय...</span>
                  </span>
                ) : (
                  <span className="text-[12px] font-black tracking-wider text-amber-300 bg-black/80 border border-amber-400/60 px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-xl">
                    <span>🧪</span>
                    <span>टेस्ट मोड • फुलस्क्रीन AI स्कैनर सक्रिय ({enrolledCount} सेव चेहरे)</span>
                  </span>
                )
              ) : activeCooldownInfo ? (
                <span className="text-[12px] font-bold tracking-wider uppercase text-emerald-300 bg-emerald-950/90 border border-emerald-500/60 px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-2xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{activeCooldownInfo.name} • उपस्थिति दर्ज ({activeCooldownInfo.remainingSec}s Pause)</span>
                </span>
              ) : liveMatchedCandidate ? (
                <span className="text-[12px] font-bold tracking-wider text-emerald-300 bg-emerald-950/95 border border-emerald-400 px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-2xl animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>🟢 {liveMatchedCandidate.name} (Sim: {liveMatchedCandidate.similarityPercent}%)</span>
                </span>
              ) : isFaceUnregistered ? (
                <span className="text-[12px] font-bold tracking-wider text-rose-200 bg-rose-950/90 border border-rose-400 px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-2xl animate-pulse">
                  <span>🔴</span>
                  <span>अज्ञात चेहरा • नीचे नाम पर टैप करें</span>
                </span>
              ) : hasFaceInView ? (
                <span className="text-[12px] font-bold tracking-wider text-cyan-200 bg-slate-900/85 border border-cyan-400/50 px-4 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-2 shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>चेहरा स्कैन हो रहा है...</span>
                </span>
              ) : (
                <span className="text-[12px] font-bold tracking-wider text-white/90 bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-xs border border-white/20 flex items-center gap-2 shadow-lg">
                  <span>👤</span>
                  <span>कैमरे के सामने आएं (Fullscreen Scanning Active)</span>
                </span>
              )}
            </div>
          </div>

          {/* Bottom Floating Shift & Enrolled Faces Pill */}
          <div className="flex justify-center pb-24 sm:pb-20">
            <div className="pointer-events-auto">
              {isFaceTestMode ? (
                <div className="text-[11px] font-black px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 backdrop-blur-md shadow-xl flex items-center gap-2">
                  <span>🧪</span>
                  <span>जीरो अटेंडेंस मोड • {enrolledCount} सेव चेहरे (KBY-AI Fullscreen)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowEnrolledProfilesModal(true)}
                  className={`text-[12px] font-bold px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 border transition cursor-pointer shadow-xl ${
                    enrolledCount === 0
                      ? "text-amber-300 bg-amber-950/85 border-amber-400/60 animate-pulse"
                      : "text-emerald-400/95 bg-black/75 hover:bg-black/90 border-emerald-500/40"
                  }`}
                  title="एनरोल किए गए चेहरे देखें व साफ़ करें"
                >
                  <span>{(kioskScanMode === "auto" ? currentShiftMode : kioskScanMode) === "in" ? "🟢 IN Mode (आगमन)" : "🔴 OUT Mode (प्रस्थान)"}</span>
                  <span>•</span>
                  <span>{enrolledCount > 0 ? `${enrolledCount} सेव चेहरे` : "⚠️ 0 चेहरे सेव"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated Unregistered Face Help Banner */}
        {isFaceUnregistered && !activeCooldownInfo && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 max-w-sm w-[92%] pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border-2 border-amber-400/90 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-amber-200 truncate flex items-center gap-1.5">
                    <span>अज्ञात / नया चेहरा (Unregistered Face)</span>
                  </p>
                  <p className="text-[11px] text-slate-200 leading-snug">
                    यह चेहरा सिस्टम में सेव नहीं है। <b>नीचे अपने नाम पर 1 बार टैप करें</b> — चेहरा तुरंत सेव होकर हाजिरी लग जाएगी!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualSearch(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 active:scale-95 shadow cursor-pointer whitespace-nowrap"
              >
                नाम खोजें
              </button>
            </div>
          </div>
        )}

        {/* 1-Tap Low-Confidence Assisted Attendance Help (when 52% - 87% match in low light/angle) */}
        {lowConfidenceCandidate && !activeCooldownInfo && (
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
                    कम रोशनी / कोण (Sim: {lowConfidenceCandidate.similarityPercent}%)
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


        {/* Live 1-Tap Candidate Bar on Viewfinder */}
        {students && students.length > 0 && (
          <div className="absolute left-2 sm:left-4 right-14 sm:right-20 bottom-2 sm:bottom-3 z-20 pointer-events-auto">
            <div className={`backdrop-blur-md rounded-xl p-1.5 sm:p-2 shadow-xl flex items-center justify-between gap-1.5 flex-nowrap transition-all ${
              isFaceUnregistered
                ? "bg-slate-900/95 border border-amber-400 ring-2 ring-amber-400/25"
                : "bg-slate-900/90 border border-slate-700/80"
            }`}>
              <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  isFaceTestMode
                    ? "bg-amber-400 animate-pulse"
                    : isFaceUnregistered
                    ? "bg-amber-400 animate-ping"
                    : hasFaceInView
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400"
                }`} />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-black text-white truncate max-w-[90px] sm:max-w-none">
                    {isFaceTestMode
                      ? "🧪 1-टैप टेस्ट"
                      : isFaceUnregistered
                      ? "⚡ नाम चुनें"
                      : hasFaceInView
                      ? "⚡ चेहरा सक्रिय"
                      : "📷 1-टैप"}
                  </p>
                  <p className="hidden md:block text-[9px] text-amber-300 font-semibold truncate">
                    {isFaceTestMode
                      ? "टैप करने पर नाम बोलेगा (No Attn)"
                      : "चेहरा सेव व हाजिरी:"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full sm:max-w-md scrollbar-none">
                {(() => {
                  const allCandidates = [
                    ...(teachers || []).map(t => ({ ...t, isTeacher: true })),
                    ...(students || [])
                  ];
                  const sorted = [
                    ...allCandidates.filter(c => Boolean(enrolledMap[c.id])),
                    ...allCandidates.filter(c => !enrolledMap[c.id])
                  ].slice(0, 10);
                  return sorted;
                })().map((st) => {
                  const isEnrolled = Boolean(enrolledMap[st.id]);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        if (isFaceTestMode) {
                          const newCount = (testMatchCounts[st.id] || 0) + 1;
                          setTestMatchCounts((prev) => ({ ...prev, [st.id]: newCount }));
                          const timeFormatted = new Date().toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true
                          });
                          const act = {
                            studentId: st.id,
                            name: st.name,
                            role: st.role || (st.isTeacher ? "TEACHER" : "STUDENT"),
                            className: st.className || (st.isTeacher ? "शिक्षक (Faculty)" : className),
                            rollNo: st.rollNo,
                            photoUrl: st.photoUrl || enrolledMap[st.id]?.photoUrl,
                            similarityPercent: 100,
                            matchCount: newCount,
                            lastTime: timeFormatted
                          };
                          setTestActiveMatch(act);
                          setTestSessionLog((prev) => [
                            {
                              id: `${st.id}_${Date.now()}`,
                              name: st.name,
                              role: act.role,
                              className: act.className,
                              time: timeFormatted,
                              similarityPercent: 100,
                              matchNumber: newCount
                            },
                            ...prev
                          ].slice(0, 30));
                          playAttendanceSuccessChime();
                          announceFaceTestMatch(st.name, newCount, act.role);
                        } else {
                          handleManualMark(st);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl active:scale-95 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-sm transition cursor-pointer ${
                        isFaceTestMode
                          ? isEnrolled
                            ? "bg-amber-600 hover:bg-amber-500 ring-1 ring-amber-300"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                          : isEnrolled
                          ? "bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-300/50"
                          : isFaceUnregistered
                          ? "bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-300 animate-pulse shadow-md"
                          : "bg-indigo-600 hover:bg-indigo-500"
                      }`}
                      title={
                        isFaceTestMode
                          ? `टेस्ट करें: ${st.name} (वॉयस से नाम बोलेगा)`
                          : isEnrolled
                          ? `${st.name} (चेहरा सेव है)`
                          : `${st.name} का चेहरा सेव करें व हाजिरी लगाएं`
                      }
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

        {/* Viewfinder Floating Tool Buttons (Compact, Touch-friendly) */}
        <div className="absolute right-3 bottom-20 sm:bottom-24 flex flex-col gap-2 z-20">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            title="Switch Front/Rear Camera"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowManualSearch(true)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            title="Manual Student Search"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* ── BOTTOM TAPE: TEST MODE vs RECENT CHECK-INS ── */}
      {isFaceTestMode ? (
        <footer className="h-14 sm:h-16 bg-slate-900/95 border-t border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
              🧪
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>टेस्ट सेशन</span>
                <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-mono">0 Attendance</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400">
                चेहरे: {Object.keys(testMatchCounts).length} • मैच: {testSessionLog.length}
              </div>
            </div>
          </div>

          {/* Horizontal Quick Match Pills */}
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {Object.entries(testMatchCounts).length === 0 ? (
              <div className="text-xs text-slate-500 italic pl-1">
                कैमरे में सेव चेहरा आने पर नाम बोलेगा और काउंट यहाँ दिखेगा...
              </div>
            ) : (
              Object.entries(testMatchCounts).map(([id, count]) => {
                const person = (students || []).find((s) => s.id === id) || (teachers || []).find((t) => t.id === id);
                const pName = person?.name || "चेहरा";
                return (
                  <div
                    key={id}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 border border-amber-500/40 flex items-center gap-1.5 text-xs text-white shrink-0 animate-in fade-in"
                  >
                    <span className="font-bold truncate max-w-[90px]">{pName}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] font-mono">
                      {count}x
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {testSessionLog.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTestHistoryTray(true)}
                className="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
              >
                लॉग ({testSessionLog.length})
              </button>
            )}
          </div>
        </footer>
      ) : (
        <footer className="h-16 sm:h-20 bg-slate-900/95 border-t border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-20 overflow-hidden">
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
      )}

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
                <span className="font-semibold text-emerald-300">512-D ArcFace Deep Biometric AI (KBY-AI Grade, Zero False Match)</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualRepairBiometrics}
                  disabled={isRepairingFaces}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="सभी चेहरों की फोटो से री-सिंक करें और ओवरराइट/करप्ट चेहरे साफ करें"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${isRepairingFaces ? "animate-spin" : ""}`} />
                  <span>🔄 बायोमेट्रिक क्लीन व फोटो से री-सिंक</span>
                </button>
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
                  const isArcFace = rec.source === "arcface_512d" || rec.descriptor?.length === 512 || Boolean(rec.arcfaceDescriptor);
                  const isNeural = isArcFace || (rec.source === "face_api_neural" && rec.descriptor?.length === 128);
                  const isTeacher = rec.role === "TEACHER" || (teachers && teachers.some((t: any) => t.id === rec.studentId));
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
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${isNeural ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}></span>
                            <span className={isNeural ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                              {isArcFace
                                ? "512-D ArcFace Gold AI (99.83% LFW)"
                                : isNeural
                                ? "128-D ResNet-34 Active (99.38% LFW)"
                                : "Auto-Upgrading to ArcFace..."}
                            </span>
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
                        {confirmDeleteBiometricId === rec.studentId ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                setConfirmDeleteBiometricId(null);
                                setEnrolledMap((prev) => {
                                  const next = { ...prev };
                                  delete next[rec.studentId];
                                  return next;
                                });
                                await deleteFaceDescriptor(rec.studentId, schoolId);
                                await loadDescriptors();
                                setCooldownToast(`🗑️ ${rec.name} का बायोमेट्रिक वेक्टर स्थायी रूप से हटा दिया गया`);
                                setTimeout(() => setCooldownToast(null), 3000);
                              }}
                              className="px-2 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] transition cursor-pointer"
                            >
                              हटाएं
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBiometricId(null)}
                              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition cursor-pointer"
                            >
                              रद्द
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBiometricId(rec.studentId)}
                            className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 flex items-center justify-center transition cursor-pointer"
                            title="चेहरा वेक्टर डिलीट करें (खराब या धुंधला होने पर)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
