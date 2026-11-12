// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Camera,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Clock,
  Zap,
} from "lucide-react";
import {
  saveFaceDescriptor,
  extractDescriptorFromCanvas,
  extractNeuralDescriptor,
  estimateEyeNoseLandmarks,
  playAttendanceSuccessChime,
  FaceDescriptorRecord,
} from "../../utils/faceRecognitionEngine";
import { updateStudentPhoto } from "../../school-firebase";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { hapticStrong } from "../../utils/haptic";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  schoolId: string;
  lastFaceUpdate?: string | null;
  onFaceUpdated?: (newPhotoUrl: string) => void;
}

export const StudentFaceIdModal: React.FC<Props> = ({
  isOpen,
  onClose,
  student,
  schoolId,
  lastFaceUpdate,
  onFaceUpdated,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // 30-Day Check
  const getDaysRemaining = useCallback((): number => {
    if (!lastFaceUpdate) return 0;
    try {
      const last = new Date(lastFaceUpdate).getTime();
      const elapsedDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
      return Math.max(0, Math.ceil(30 - elapsedDays));
    } catch {
      return 0;
    }
  }, [lastFaceUpdate]);

  const daysRemaining = getDaysRemaining();
  const canUpdate = daysRemaining === 0;

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "कैमरा अनुमति (Permission) नहीं मिली। कृपया ब्राउज़र सेटिंग्स में कैमरा चालू करें।"
          : `कैमरा शुरू करने में त्रुटि: ${err.message || "Unknown error"}`
      );
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (isOpen && canUpdate) {
      setSuccess(false);
      setProcessing(false);
      setCountdown(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, canUpdate, startCamera, stopCamera]);

  // Capture & Save Face Biometric
  const handleCaptureFace = async () => {
    if (!videoRef.current || processing) return;

    // 3s Countdown for best posture
    setCountdown(3);
    for (let c = 2; c >= 0; c--) {
      await new Promise((r) => setTimeout(r, 700));
      setCountdown(c);
    }

    setProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context initialization failed");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL("image/jpeg", 0.92);

      const box = {
        x: canvas.width * 0.15,
        y: canvas.height * 0.12,
        width: canvas.width * 0.7,
        height: canvas.height * 0.72,
      };

      const landmarks = estimateEyeNoseLandmarks(canvas, box);
      const neural = await extractNeuralDescriptor(canvas);
      const is512 = Boolean(neural?.descriptor && neural.descriptor.length === 512);
      const is128 = Boolean(neural?.descriptor && neural.descriptor.length === 128);
      const descriptor = (is512 || is128)
        ? neural!.descriptor
        : extractDescriptorFromCanvas(canvas, box, false, landmarks);
      const source = is512
        ? "arcface_512d"
        : is128
        ? "face_api_neural"
        : "student_self_update";

      const nowIso = new Date().toISOString();
      const stId = student?.id || student?.studentId || "student";

      const record: FaceDescriptorRecord = {
        studentId: stId,
        schoolId,
        name: student?.name || "Student",
        rollNo: String(student?.rollNo || ""),
        classId: student?.classId || "",
        className: student?.className || "",
        photoUrl: photoDataUrl,
        descriptor,
        arcfaceDescriptor: is512 ? descriptor : undefined,
        enrolledAt: nowIso,
        source
      };

      // 1. Save biometric 128-D descriptor in IndexedDB + LocalStorage
      await saveFaceDescriptor(record);

      // 2. Update Student photo & timestamp in school database
      await updateStudentPhoto(schoolId, stId, photoDataUrl);

      // 3. Save local timestamp for 30-day enforcement
      try {
        localStorage.setItem(`nst_face_last_update_${stId}`, nowIso);
      } catch {}

      // 4. Feedback & Celebratory sounds
      playAttendanceSuccessChime();
      try {
        hapticStrong();
      } catch {}
      speakNotification(
        "फेस आईडी अपडेट सफल",
        `नमस्ते ${student?.name || "छात्र"}! आपका फेस आईडी सफलतापूर्वक अपडेट हो गया है। अब आप सीधे फेस से लॉगिन व हाजिरी लगा सकते हैं।`
      );

      setSuccess(true);
      if (onFaceUpdated) {
        onFaceUpdated(photoDataUrl);
      }

      setTimeout(() => {
        stopCamera();
        onClose();
      }, 1600);
    } catch (err: any) {
      console.warn("Face capture error:", err);
      setCameraError("फेस कैप्चर करने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
      setProcessing(false);
      setCountdown(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col relative text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-wide text-white">
                  अपडेट फेस आईडी (Update Face ID)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase">
                  Free 30-Day
                </span>
              </div>
              <p className="text-[11px] text-teal-300">
                {student?.name} • Roll #{student?.rollNo || "01"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 30-Day Rule Notice Banner */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2 text-[11px] text-slate-300">
          <Clock size={14} className="text-teal-400 shrink-0" />
          <span>
            हर <strong>30 दिन में 1 बार</strong> मुफ़्त फेस अपडेट की सुविधा। यही फेस आपकी <strong>हाजिरी व लॉगिन</strong> दोनों में काम करेगा।
          </span>
        </div>

        {/* Cooldown Check / Lock Screen */}
        {!canUpdate ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Clock size={32} />
            </div>
            <div>
              <h4 className="text-base font-black text-white">30 दिन की सीमा सक्रिय</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                आपने हाल ही में अपना फेस आईडी अपडेट किया है। अगला मुफ़्त अपडेट <strong>{daysRemaining} दिनों</strong> के बाद उपलब्ध होगा।
              </p>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
              अगला अपडेट: {daysRemaining} दिन शेष
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              ठीक है (Close)
            </button>
          </div>
        ) : (
          /* Live Camera Viewfinder */
          <div className="p-4 space-y-4">
            <div className="relative aspect-square max-h-[320px] w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform scale-x-[-1]"
                muted
                playsInline
              />

              {/* Oval Facial Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-52 h-64 rounded-[50%] border-2 transition-all duration-300 ${
                    success
                      ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_40px_rgba(52,211,153,0.5)]"
                      : "border-teal-400/80 shadow-[0_0_25px_rgba(20,184,166,0.3)] animate-pulse"
                  }`}
                />
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-20">
                  <span className="text-7xl font-black text-white font-mono animate-ping">
                    {countdown}
                  </span>
                </div>
              )}

              {/* Processing Spinner */}
              {processing && countdown === null && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                  <Loader2 size={36} className="text-teal-400 animate-spin" />
                  <p className="text-xs font-bold text-teal-200">
                    128-D बायोमेट्रिक वेक्टर बनाया जा रहा है...
                  </p>
                </div>
              )}

              {/* Success celebration */}
              {success && (
                <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20 animate-in fade-in zoom-in">
                  <CheckCircle2 size={48} className="text-emerald-400 animate-bounce" />
                  <h4 className="text-base font-black text-white">फेस आईडी सफलतापूर्वक अपडेट!</h4>
                  <p className="text-xs text-emerald-300">
                    हाजिरी व लॉगिन में सक्रिय कर दिया गया है
                  </p>
                </div>
              )}

              {/* Flip camera */}
              <button
                type="button"
                onClick={() => setFacingMode((p) => (p === "user" ? "environment" : "user"))}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80 transition-all z-10 cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw size={16} />
              </button>

              {/* Camera Error banner */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-30">
                  <AlertTriangle size={32} className="text-amber-400 mb-2" />
                  <p className="text-xs font-bold text-slate-200 mb-3">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    पुनः कैमरा चालू करें
                  </button>
                </div>
              )}
            </div>

            {/* Instruction Guidance */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-teal-400" />
                <span>सीधे कैमरे में देखें और स्थिर रहें</span>
              </span>
              <span className="text-[11px] font-mono text-teal-400">100% On-Device AI</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>

              <button
                type="button"
                disabled={processing || !cameraActive || success}
                onClick={handleCaptureFace}
                className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>प्रोसेसिंग...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>चेहरा कैप्चर व सेव करें (Free)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
