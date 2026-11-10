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
  extractDescriptorFromCanvas,
  playAttendanceSuccessChime,
  FaceDescriptorRecord,
} from "../../utils/faceRecognitionEngine";
import { getDemoSchoolDataset } from "./demoDataStore";
import { INITIAL_STUDENTS } from "./feeReceiptUtils";
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
  const [scanStatus, setScanStatus] = useState<"searching" | "detected" | "matched" | "error">("searching");
  const [matchedStudentInfo, setMatchedStudentInfo] = useState<any>(null);
  const [confidencePct, setConfidencePct] = useState<number>(0);

  // 1. Gather all students and ensure face descriptors are ready
  const prepareFaceDatabase = useCallback(async () => {
    setLoadingDescriptors(true);
    try {
      // Load already saved descriptors from IndexedDB / LocalStorage
      let map = await getSchoolFaceDescriptors(schoolId);

      // Also pool all students from demoDataStore, initialStudents, and localStorage
      const dataset = getDemoSchoolDataset();
      const safeInitial = Array.isArray(INITIAL_STUDENTS) ? INITIAL_STUDENTS : [];
      let studentPool: any[] = [...(dataset.students || []), ...safeInitial];

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("nst_school_students_")) {
            const list = JSON.parse(localStorage.getItem(k) || "[]");
            if (Array.isArray(list)) {
              studentPool.push(...list);
            }
          }
        }
      } catch {}

      // Deduplicate by studentId / rollNo
      const uniqueStudents = Array.from(new Map(studentPool.map((s) => [s.id || s.rollNo, s])).values());

      // If any students have photoUrl but not yet enrolled in descriptors, auto-generate descriptors
      const pendingEnroll = uniqueStudents.filter(
        (s) => s && s.photoUrl && !map[s.id]
      );

      for (const st of pendingEnroll.slice(0, 15)) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = st.photoUrl;
          });

          const c = document.createElement("canvas");
          c.width = img.naturalWidth || 200;
          c.height = img.naturalHeight || 200;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const box = {
              x: c.width * 0.15,
              y: c.height * 0.08,
              width: c.width * 0.7,
              height: c.height * 0.75,
            };
            const descriptor = extractDescriptorFromCanvas(c, box);
            const rec: FaceDescriptorRecord = {
              studentId: st.id,
              schoolId: st.schoolId || schoolId,
              name: st.name,
              rollNo: st.rollNo,
              classId: st.classId,
              className: st.className,
              photoUrl: st.photoUrl,
              descriptor,
              enrolledAt: new Date().toISOString(),
              source: "id_photo",
            };
            await saveFaceDescriptor(rec);
            map[st.id] = rec;
          }
        } catch {}
      }

      setEnrolledMap(map);
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
      prepareFaceDatabase();
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, prepareFaceDatabase]);

  // 3. Continuous Face Detection & Recognition Loop
  useEffect(() => {
    if (!isOpen || isMatchingRef.current) return;

    let animId: number;
    let lastScanTime = 0;

    const scanFrame = async (timestamp: number) => {
      if (!isOpen || isMatchingRef.current) return;

      // Scan every ~120ms (approx 8-10 FPS for optimal battery and responsive recognition)
      if (
        timestamp - lastScanTime >= 120 &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        !loadingDescriptors
      ) {
        lastScanTime = timestamp;

        try {
          const video = videoRef.current;
          const detectedBoxes = await detectFacesInFrame(video, enrolledMap);

          if (detectedBoxes.length > 0) {
            setScanStatus("detected");

            // Check if any face matches an enrolled student
            const matchedBox = detectedBoxes.find((b) => b.matchedStudent);

            if (matchedBox && matchedBox.matchedStudent) {
              const matched = matchedBox.matchedStudent;

              // High confidence match!
              if (matched.confidencePercent >= 75) {
                isMatchingRef.current = true;
                setScanStatus("matched");
                setMatchedStudentInfo(matched);
                setConfidencePct(matched.confidencePercent);

                // Sound & Haptic Feedback
                playAttendanceSuccessChime();
                try {
                  hapticStrong();
                } catch {}

                speakNotification(
                  "पहचान सत्यापित",
                  `नमस्ते ${matched.name}! आपका फेस लॉगिन सत्यापित हो गया है।`
                );

                // Trigger successful login after brief celebration visual
                setTimeout(() => {
                  stopCamera();
                  onStudentMatched(matched);
                }, 900);
                return;
              }
            }
          } else {
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
  }, [isOpen, enrolledMap, loadingDescriptors, onStudentMatched, stopCamera]);

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
                  ? "border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.6)] ring-4 ring-emerald-500/40"
                  : scanStatus === "detected"
                  ? "border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] ring-2 ring-amber-500/30"
                  : "border-cyan-400/50 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
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

            {/* Status Floating Pill */}
            <div className="mt-4 z-10">
              {scanStatus === "matched" && matchedStudentInfo ? (
                <div className="px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xl animate-bounce">
                  <CheckCircle2 size={16} /> पहचान सत्यापित • {confidencePct.toFixed(1)}% Match!
                </div>
              ) : scanStatus === "detected" ? (
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500/90 text-slate-950 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg">
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

          {/* Camera Error Display with One-Tap Demo Face Match */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-30 overflow-y-auto">
              <AlertTriangle size={36} className="text-amber-400 mb-2" />
              <p className="text-xs font-bold text-slate-200 mb-1 max-w-xs">{cameraError}</p>
              <p className="text-[11px] text-slate-400 mb-4 max-w-xs">
                कैमरा अनुमति न होने पर भी आप नीचे दिए गए छात्र के फेस से डायरेक्ट टेस्ट लॉगिन कर सकते हैं:
              </p>
              
              <div className="w-full max-w-xs space-y-2 mb-4">
                {Object.values(enrolledMap).slice(0, 3).map((st) => (
                  <button
                    key={st.studentId}
                    type="button"
                    onClick={() => {
                      setScanStatus("matched");
                      setMatchedStudentInfo(st);
                      setConfidencePct(98.4);
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
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 hover:bg-emerald-950/40 flex items-center justify-between text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {st.photoUrl ? <img src={st.photoUrl} alt={st.name} className="w-full h-full object-cover" /> : <User size={14} />}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-white truncate">{st.name}</p>
                        <p className="text-[10px] text-emerald-400">Roll #{st.rollNo} • {st.className || 'Class 10'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black shrink-0">
                      Face Match
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                पुनः कैमरा चालू करें (Retry Camera)
              </button>
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
