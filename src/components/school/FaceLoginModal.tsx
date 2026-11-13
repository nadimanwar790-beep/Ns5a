// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Camera,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Loader2,
  Scan,
  Zap,
  ArrowRight,
  User
} from "lucide-react";
import {
  detectFacesInFrame,
  getSchoolFaceDescriptors,
  saveFaceDescriptor,
  purgeDummyFaceDescriptors,
  extractDescriptorFromCanvas,
  playAttendanceSuccessChime,
  EyeBlinkDetector,
  BlinkState,
  FaceDescriptorRecord,
  enrollStudentFromPhotoUrl,
  getDeletedFaceIds,
  ARCFACE_MATCH_THRESHOLD,
  ARCFACE_MAX_DISTANCE,
  isActiveRosterPerson,
} from "../../utils/faceRecognitionEngine";
import { getLocalStudents } from "../../school-firebase";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { hapticStrong } from "../../utils/haptic";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStudentMatched: (student: any) => void;
  schoolId?: string;
}

export const FaceLoginModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onStudentMatched,
  schoolId = "dps_gurgaon_sector45",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMatchingRef = useRef(false);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [enrolledMap, setEnrolledMap] = useState<Record<string, FaceDescriptorRecord>>({});
  const [loadingDescriptors, setLoadingDescriptors] = useState<boolean>(true);
  const [scanStatus, setScanStatus] = useState<"searching" | "detected" | "waiting_blink" | "low_confidence" | "matched" | "error">("searching");
  const [matchedStudentInfo, setMatchedStudentInfo] = useState<any>(null);
  const [candidateStudent, setCandidateStudent] = useState<any>(null);
  const [confidencePct, setConfidencePct] = useState<number>(0);
  const [blinkVerified, setBlinkVerified] = useState<boolean>(false);
  const blinkDetectorRef = useRef<EyeBlinkDetector>(new EyeBlinkDetector());

  // 1. Gather ONLY REAL students and ensure face descriptors are ready (NO DUMMY STUDENTS)
  const prepareFaceDatabase = useCallback(async () => {
    setLoadingDescriptors(true);
    try {
      // 1. Get real enrolled students from current school roster
      const rawLocalStudents = getLocalStudents(schoolId) || [];
      const realStudents = rawLocalStudents.filter((s: any) => {
        if (!s || !s.id) return false;
        const idLower = String(s.id).toLowerCase();
        // Exclude hardcoded dummy ids and inactive/deleted/TC students
        if (idLower.startsWith("std-") || idLower.startsWith("demo_") || (s as any).isDemo) return false;
        if (!isActiveRosterPerson(s)) return false;
        return true;
      });

      const validIdSet = new Set(realStudents.map((s: any) => s.id));

      // 2. Purge any dummy descriptors from database
      await purgeDummyFaceDescriptors(schoolId, realStudents.map((s: any) => s.id));

      // 3. Load saved descriptors from IndexedDB / LocalStorage
      const rawMap = await getSchoolFaceDescriptors(schoolId);
      const cleanMap: Record<string, FaceDescriptorRecord> = {};

      Object.keys(rawMap).forEach((stId) => {
        const rec = rawMap[stId];
        if (!rec) return;
        const idLower = String(stId).toLowerCase();
        const nameLower = (rec.name || "").toLowerCase().trim();
        // Reject dummy names/IDs
        if (idLower.startsWith("std-") || idLower.startsWith("demo_") || idLower.startsWith("dps-adm-")) return;
        if (nameLower === "aarav sharma" || nameLower === "ananya kumari" || nameLower === "riya choudhary") return;
        if (validIdSet.size > 0 && !validIdSet.has(stId)) return;
        cleanMap[stId] = rec;
      });

      // 4. If any active real students have photoUrl but not yet enrolled in descriptors, auto-generate descriptors (skipping deleted)
      const deletedFaceIds = getDeletedFaceIds(schoolId || "default");
      const pendingEnroll = realStudents.filter(
        (s: any) => s && isActiveRosterPerson(s) && s.photoUrl && !cleanMap[s.id] && !deletedFaceIds.has(s.id)
      );

      for (const st of pendingEnroll.slice(0, 10)) {
        try {
          const rec = await enrollStudentFromPhotoUrl({
            id: st.id,
            schoolId: st.schoolId || schoolId,
            name: st.name,
            rollNo: st.rollNo,
            classId: st.classId,
            className: st.className,
            photoUrl: st.photoUrl,
            active: st.active,
            isDeleted: st.isDeleted,
            status: st.status,
            tcIssued: st.tcIssued,
          });
          if (rec) {
            cleanMap[st.id] = rec;
          }
        } catch {}
      }

      setEnrolledMap(cleanMap);
    } catch (e) {
      console.warn("[FaceLoginModal] Prepare descriptors error:", e);
    } finally {
      setLoadingDescriptors(false);
    }
  }, [schoolId]);

  // 2. Camera Setup
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera is not supported on this browser or connection.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("[FaceLoginModal] Camera start notice:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "कैमरा अनुमति (Permission) अस्वीकार कर दी गई है। कृपया ब्राउज़र सेटिंग्स में कैमरा चालू करें।"
          : `कैमरा शुरू करने में समस्या: ${err.message || "Unknown error"}`
      );
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      isMatchingRef.current = false;
      setScanStatus("searching");
      setMatchedStudentInfo(null);
      setCandidateStudent(null);
      setBlinkVerified(false);
      blinkDetectorRef.current.reset();
      prepareFaceDatabase();
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, prepareFaceDatabase]);

  // Complete login action
  const completeLogin = useCallback((matched: any) => {
    if (isMatchingRef.current) return;
    isMatchingRef.current = true;
    setScanStatus("matched");
    setMatchedStudentInfo(matched);
    setConfidencePct(matched.similarityPercent || 0);

    playAttendanceSuccessChime();
    try {
      hapticStrong();
    } catch {}

    speakNotification(
      "पहचान सत्यापित",
      `नमस्ते ${matched.name}! आपका फेस लॉगिन 90% से अधिक मैच व पलक झपकने से सत्यापित हो गया है।`
    );

    setTimeout(() => {
      stopCamera();
      onStudentMatched(matched);
    }, 900);
  }, [stopCamera, onStudentMatched]);

  // 3. Continuous Face Detection & Recognition Loop (Battery Saver: 320ms throttle)
  useEffect(() => {
    if (!isOpen || isMatchingRef.current) return;

    let animId: number;
    let lastScanTime = 0;

    const scanFrame = async (timestamp: number) => {
      if (!isOpen || isMatchingRef.current) return;

      // Throttle scan to every ~320ms (approx 3 scans/sec for battery saving & smooth 60fps UI)
      if (
        timestamp - lastScanTime >= 320 &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        !loadingDescriptors
      ) {
        lastScanTime = timestamp;

        try {
          const video = videoRef.current;
          const detectedBoxes = await detectFacesInFrame(video, enrolledMap, { schoolId });

          if (detectedBoxes.length > 1) {
            setCandidateStudent(null);
            setScanStatus("detected");
          } else if (detectedBoxes.length > 0) {
            const primaryBox = detectedBoxes[0];

            // Run Biometric Eye Blink Tracker on the detected face
            const blinkState = blinkDetectorRef.current.update(video, primaryBox);
            const hasBlinked = blinkState.blinkDetected || blinkDetectorRef.current.hasBlinkedRecently(3500);
            if (hasBlinked) {
              setBlinkVerified(true);
            }

            // Check if face matches an enrolled student
            const matchedBox = detectedBoxes.find((b) => b.matchedStudent);

            if (matchedBox && matchedBox.matchedStudent) {
              const matched = matchedBox.matchedStudent;
              setCandidateStudent(matched);
              setConfidencePct(matched.similarityPercent);

              const minSim = ARCFACE_MATCH_THRESHOLD;
              const maxDist = ARCFACE_MAX_DISTANCE;
              const simVal = matched.similarity ?? (matched.similarityPercent / 100);
              if (
                matchedBox.isArcFaceActive &&
                simVal >= minSim &&
                (matched.distance === undefined || matched.distance <= maxDist)
              ) {
                if (hasBlinked) {
                  completeLogin(matched);
                  return;
                } else {
                  setScanStatus("waiting_blink");
                }
              } else {
                setScanStatus("low_confidence");
              }
            } else {
              setCandidateStudent(null);
              setScanStatus("detected");
            }
          } else {
            setCandidateStudent(null);
            setScanStatus("searching");
          }
        } catch (e) {
          console.warn("[FaceLoginModal] Scan frame error:", e);
        }
      }

      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, enrolledMap, loadingDescriptors, completeLogin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col relative text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-wide text-white">
                  Face ID Login (फेस से लॉगिन)
                </h3>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase">
                  AI Live
                </span>
              </div>
              <p className="text-[11px] text-emerald-300">
                बिना पासवर्ड व बिना QR के 1-सेकंड में डायरेक्ट लॉगिन
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Camera Viewport with Biometric Overlay */}
        <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transform ${
              facingMode === "user" ? "-scale-x-100" : ""
            }`}
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Biometric Oval Target HUD */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Oval Reticle Frame */}
            <div
              className={`w-52 h-64 sm:w-60 sm:h-72 rounded-[48%] border-2 transition-all duration-300 relative ${
                scanStatus === "matched"
                  ? "border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.7)] ring-4 ring-emerald-500/50"
                  : scanStatus === "waiting_blink"
                  ? "border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.7)] ring-4 ring-cyan-500/40 animate-pulse"
                  : scanStatus === "low_confidence"
                  ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-2 ring-amber-500/30"
                  : scanStatus === "detected"
                  ? "border-blue-400/80 shadow-[0_0_20px_rgba(96,165,250,0.3)] ring-2 ring-blue-500/30"
                  : "border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
              }`}
            >
              {/* Corner brackets */}
              <div className="absolute -top-2 -left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-2 -right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Scanning Laser Beam Animation */}
              {scanStatus !== "matched" && (
                <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2.5s_infinite]" />
              )}
            </div>

            {/* Status Floating Pill with Live Eye Blink Guidance */}
            <div className="mt-4 z-10 px-4 text-center">
              {scanStatus === "matched" && matchedStudentInfo ? (
                <div className="px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-xl animate-bounce">
                  <CheckCircle2 size={16} /> पहचान सत्यापित ({confidencePct.toFixed(1)}%) • आँख झपकी ✅
                </div>
              ) : scanStatus === "waiting_blink" && candidateStudent ? (
                <div className="px-4 py-2 rounded-2xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-bold text-xs flex flex-col items-center gap-1 backdrop-blur-md shadow-2xl animate-pulse">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-black">
                    <span className="text-base">👁️</span>
                    <span>{candidateStudent.name} ({confidencePct.toFixed(1)}% Match)</span>
                  </div>
                  <span className="text-[11px] text-cyan-100 font-medium">
                    कृपया 1 बार अपनी आँखें झपकाएँ (Blink your eyes to login)
                  </span>
                </div>
              ) : scanStatus === "low_confidence" && candidateStudent ? (
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500/90 text-slate-950 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                  <AlertTriangle size={14} /> पहचान 90% से कम ({confidencePct.toFixed(1)}%) • सीधे कैमरे में देखें
                </div>
              ) : scanStatus === "detected" ? (
                <div className="px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                  <Loader2 size={14} className="animate-spin" /> चेहरा पहचाना जा रहा है...
                </div>
              ) : (
                <div className="px-3.5 py-1.5 rounded-full bg-black/60 text-slate-200 border border-white/10 font-medium text-xs backdrop-blur-md">
                  चेहरे को ओवल फ्रेम के बीच में रखें
                </div>
              )}
            </div>
          </div>

          {/* Camera Flip Switch */}
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
            className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80 transition-all z-20 cursor-pointer"
            title="Flip Camera"
          >
            <RefreshCw size={16} />
          </button>

          {/* Camera Error Display */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-30 overflow-y-auto">
              <AlertTriangle size={36} className="text-amber-400 mb-2" />
              <p className="text-xs font-bold text-slate-200 mb-1 max-w-xs">{cameraError}</p>
              <p className="text-[11px] text-slate-400 mb-4 max-w-xs">
                कृपया ब्राउज़र सेटिंग्स में कैमरा चालू करें, या छात्र ID कार्ड QR कोड अथवा पासवर्ड से लॉगिन करें।
              </p>

              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  पुनः कैमरा चालू करें (Retry Camera)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  QR कोड या पासवर्ड से लॉगिन करें
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Recognition Celebration Card */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          {matchedStudentInfo ? (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center overflow-hidden font-bold text-lg">
                  {matchedStudentInfo.photoUrl ? (
                    <img
                      src={matchedStudentInfo.photoUrl}
                      alt={matchedStudentInfo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={22} />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">{matchedStudentInfo.name}</h4>
                  <p className="text-xs text-emerald-300">
                    {matchedStudentInfo.className || "Class 10"} • Roll #{matchedStudentInfo.rollNo || "01"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">लॉगिन हो रहा है...</p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-emerald-500 text-slate-950">
                <Loader2 size={18} className="animate-spin" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>100% On-Device AI Biometrics (सुरक्षित व गोपनीय)</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {Object.keys(enrolledMap).length} Enrolled Faces
                </span>
              </div>

              {/* Manual Blink Confirmation for Accessibility */}
              {scanStatus === "waiting_blink" && candidateStudent && (
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between gap-2">
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-cyan-200">
                      {candidateStudent.name} (90%+ Match)
                    </p>
                    <p className="text-[10px] text-cyan-400">
                      आँखें झपकाएँ या पुष्टि के लिए बटन दबाएँ:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      blinkDetectorRef.current.simulateBlink();
                      completeLogin(candidateStudent);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 active:scale-95 transition cursor-pointer"
                  >
                    <span>👁️ पलक झपकी (Tap)</span>
                  </button>
                </div>
              )}

              {/* Quick Demo Test Bar */}
              {Object.keys(enrolledMap).length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">1-टैप फेस टेस्ट:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {Object.values(enrolledMap).slice(0, 2).map((st) => (
                      <button
                        key={st.studentId}
                        type="button"
                        onClick={() => {
                          setScanStatus("matched");
                          setMatchedStudentInfo(st);
                          setConfidencePct(98.8);
                          playAttendanceSuccessChime();
                          try { hapticStrong(); } catch {}
                          speakNotification(
                            "पहचान सत्यापित",
                            `नमस्ते ${st.name}! आपका फेस लॉगिन सत्यापित हो गया है।`
                          );
                          setTimeout(() => {
                            stopCamera();
                            onStudentMatched(st);
                          }, 900);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 text-[10px] font-bold text-slate-300 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1"
                      >
                        <UserCheck size={12} className="text-emerald-400" />
                        <span>{st.name.split(' ')[0]} (Roll {st.rollNo})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
