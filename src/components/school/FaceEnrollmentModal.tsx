// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  X,
  UserPlus,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
  Zap,
  Check,
  ShieldCheck,
  ArrowRight,
  Loader2
} from "lucide-react";
import {
  enrollStudentFromPhotoUrl,
  batchEnrollStudentsFromPhotos,
  saveFaceDescriptor,
  deleteFaceDescriptor,
  extractDescriptorFromCanvas,
  extractNeuralDescriptor,
  FaceDescriptorRecord
} from "../../utils/faceRecognitionEngine";

export interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  students: any[];
  enrolledMap: Record<string, FaceDescriptorRecord>;
  onEnrollmentUpdated?: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  students = [],
  enrolledMap = {},
  onEnrollmentUpdated
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "ENROLLED" | "PENDING">("ALL");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Live Studio Capture State
  const [liveCaptureTarget, setLiveCaptureTarget] = useState<any | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captureSuccess, setCaptureSuccess] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);

  // Start Live Capture Camera
  const startLiveStudioCamera = async (overrideMode?: "user" | "environment") => {
    const mode = overrideMode || facingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }
      streamRef.current = stream;
      setCameraActive(true);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraActive(false);
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    await startLiveStudioCamera(nextMode);
  };

  const stopLiveStudioCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (liveCaptureTarget) {
      startLiveStudioCamera();
    } else {
      stopLiveStudioCamera();
      setCountdown(null);
      setCaptureSuccess(false);
    }
    return () => stopLiveStudioCamera();
  }, [liveCaptureTarget]);

  // Snap photo and extract descriptor in 1 tap (2 seconds)
  const handleCaptureLiveDescriptor = async () => {
    if (!liveVideoRef.current || !liveCaptureTarget) return;

    const video = liveVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.9);

    const box = {
      x: canvas.width * 0.15,
      y: canvas.height * 0.15,
      width: canvas.width * 0.70,
      height: canvas.height * 0.70
    };

    const neural = await extractNeuralDescriptor(canvas);
    const has512 = Boolean(neural?.arcfaceDescriptor && neural.arcfaceDescriptor.length === 512);

    if (!has512) {
      toast.error("⚠️ चेहरे के 5 मुख्य बिंदु (आँखें, नाक, होंठ) स्पष्ट नहीं दिखे। कृपया सीधी रोशनी में सामने देखकर दोबारा फ़ोटो लें।");
      return;
    }

    const record: FaceDescriptorRecord = {
      studentId: liveCaptureTarget.id,
      schoolId,
      name: liveCaptureTarget.name,
      rollNo: liveCaptureTarget.rollNo,
      classId: liveCaptureTarget.classId,
      className: liveCaptureTarget.className,
      photoUrl: photoDataUrl,
      descriptor: neural!.arcfaceDescriptor!,
      arcfaceDescriptor: neural!.arcfaceDescriptor!,
      enrolledAt: new Date().toISOString(),
      source: "arcface_512d",
      preprocessOrder: "RGB"
    };

    await saveFaceDescriptor(record);
    setCaptureSuccess(true);
    if (onEnrollmentUpdated) onEnrollmentUpdated();

    setTimeout(() => {
      setLiveCaptureTarget(null);
    }, 1500);
  };

  // Run Batch Auto-Vectorize from ID Photos
  const handleBatchAutoVectorize = async () => {
    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: students.length, name: "Initializing..." });

    try {
      await batchEnrollStudentsFromPhotos(
        schoolId,
        students,
        (current, total, name) => {
          setBatchProgress({ current, total, name });
        }
      );
      if (onEnrollmentUpdated) onEnrollmentUpdated();
    } catch (e) {
      console.warn("Batch auto-vectorize error:", e);
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress(null);
    }
  };

  // Single Student Enroll from photo
  const handleEnrollSingleFromPhoto = async (st: any) => {
    if (!st.photoUrl) return;
    await enrollStudentFromPhotoUrl({
      id: st.id,
      schoolId,
      name: st.name,
      rollNo: st.rollNo,
      classId: st.classId,
      className: st.className,
      photoUrl: st.photoUrl
    });
    if (onEnrollmentUpdated) onEnrollmentUpdated();
  };

  // Delete Descriptor
  const handleDeleteDescriptor = async (studentId: string) => {
    if (confirmDeleteStudentId !== studentId) {
      setConfirmDeleteStudentId(studentId);
      return;
    }
    setConfirmDeleteStudentId(null);
    await deleteFaceDescriptor(studentId, schoolId);
    toast.success("छात्र का फेस बायोमेट्रिक डेटा हटाया गया।");
    if (onEnrollmentUpdated) onEnrollmentUpdated();
  };

  if (!isOpen) return null;

  const totalStudents = students.length;
  const enrolledCount = students.filter(s => enrolledMap[s.id]).length;
  const withPhotosCount = students.filter(s => s.photoUrl && s.photoUrl.trim()).length;

  const filteredStudents = students.filter(s => {
    const isEnrolled = Boolean(enrolledMap[s.id]);
    if (filterMode === "ENROLLED" && !isEnrolled) return false;
    if (filterMode === "PENDING" && isEnrolled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toString().includes(q)) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Face Enrollment Desk (फेस नामांकन)
              </h2>
              <p className="text-xs text-slate-400">
                Manage student 128-D biometric vectors & ID card photo mappings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Stats Strip & 1-Click Action */}
        <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{enrolledCount} / {totalStudents} Enrolled</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>{withPhotosCount} ID Photos Available</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBatchAutoVectorize}
            disabled={isBatchProcessing || withPhotosCount === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-400 hover:to-teal-500 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            title="जिनकी फोटो पहले से ऐप में है, वे 1-क्लिक में पूरी क्लास अपने आप सेव हो जाएगी"
          >
            {isBatchProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>पूरी क्लास सेव हो रही है...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>⚡ 1-क्लिक में पूरी क्लास सेव करें</span>
              </>
            )}
          </button>
        </div>

        {/* Batch Progress Bar */}
        {isBatchProcessing && batchProgress && (
          <div className="px-5 py-3 bg-emerald-950/40 border-b border-emerald-900/50">
            <div className="flex items-center justify-between text-xs text-emerald-300 mb-1.5 font-bold">
              <span>Generating Face Embeddings: {batchProgress.name}</span>
              <span className="font-mono">{batchProgress.current} / {batchProgress.total}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${Math.round((batchProgress.current / Math.max(1, batchProgress.total)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number, or admission ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-xl">
            <button
              onClick={() => setFilterMode("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterMode === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({totalStudents})
            </button>
            <button
              onClick={() => setFilterMode("ENROLLED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterMode === "ENROLLED" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Enrolled ({enrolledCount})
            </button>
            <button
              onClick={() => setFilterMode("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterMode === "PENDING" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Pending ({totalStudents - enrolledCount})
            </button>
          </div>
        </div>

        {/* Student Enrollment Roster Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No students match current filter criteria.
            </div>
          ) : (
            filteredStudents.map((st) => {
              const enrolled = enrolledMap[st.id];
              return (
                <div
                  key={st.id}
                  className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-white relative">
                      {st.photoUrl ? (
                        <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{st.name?.slice(0, 2).toUpperCase()}</span>
                      )}
                      {enrolled && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-tl-md flex items-center justify-center text-[8px] text-white">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{st.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Roll #{st.rollNo || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>ID: {st.admissionNo || "—"}</span>
                        <span>•</span>
                        <span className={enrolled ? "text-emerald-400 font-bold" : "text-amber-400 font-medium"}>
                          {enrolled
                            ? ((enrolled.source === "3d_multi_angle" || enrolled.multiAngleDescriptors || enrolled.descriptors3D) ? "🌐 Multi-Angle Biometrics Enrolled" : "✅ Biometrics Enrolled")
                            : st.photoUrl ? "📷 Ready to Vectorize" : "⚠️ Photo Missing"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {st.photoUrl && !enrolled && (
                      <button
                        type="button"
                        onClick={() => handleEnrollSingleFromPhoto(st)}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Convert Photo to 128-D Vector"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span className="hidden sm:inline">Vectorize</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setLiveCaptureTarget(st)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Open Live Camera Studio to Capture High-Res Face"
                    >
                      <Camera className="w-3.5 h-3.5 text-teal-400" />
                      <span className="hidden sm:inline">Live Studio</span>
                    </button>

                    {enrolled && (
                      confirmDeleteStudentId === st.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteDescriptor(st.id)}
                            className="px-2 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStudentId(null)}
                            className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                          >
                            रद्द
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteDescriptor(st.id)}
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition border border-slate-700 cursor-pointer"
                          title="Remove Face Biometric"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── LIVE STUDIO RE-SCAN MODAL ── */}
      {liveCaptureTarget && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl flex flex-col items-center text-center">
            <div className="flex items-center justify-between w-full mb-3">
              <div className="text-left">
                <h3 className="text-sm font-bold text-white">Live Face Enrollment Studio</h3>
                <p className="text-xs text-slate-400">{liveCaptureTarget.name} (Roll #{liveCaptureTarget.rollNo || "—"})</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  title="कैमरा बदलें (Front / Back Camera)"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{facingMode === "user" ? "📱 फ्रंट" : "📷 बैक"}</span>
                </button>
                <button
                  onClick={() => setLiveCaptureTarget(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Preview Frame */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden bg-black border-2 border-slate-700 flex items-center justify-center mb-4">
              <video
                ref={liveVideoRef}
                playsInline
                muted
                className={`w-full h-full object-cover transition-transform duration-300 ${facingMode === "user" ? "transform -scale-x-100" : ""}`}
              />
              {/* Single Clean Center Circle Guide */}
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-emerald-400/70 pointer-events-none" />

              {countdown !== null && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-5xl font-black text-white animate-ping">{countdown === 0 ? "📸" : countdown}</span>
                </div>
              )}

              {captureSuccess && (
                <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-emerald-400 p-4">
                  <CheckCircle2 className="w-12 h-12 mb-2" />
                  <span className="text-sm font-bold text-white">बायोमेट्रिक सेव हुआ (2s Face ID)!</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-4 max-w-xs">
              चेहरा बीच के सर्किल में रखें और 1 बार टैप करें — 2 सेकंड में फेस ID बन जाएगी।
            </p>

            <button
              type="button"
              onClick={handleCaptureLiveDescriptor}
              disabled={captureSuccess}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black rounded-xl text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>📸 1-टैप फोटो लें व फेस ID बनाएं (2 Seconds)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
