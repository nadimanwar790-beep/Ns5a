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
  Search,
  Trash2,
  Zap,
  Users,
  GraduationCap,
  Briefcase,
  Check,
  ArrowRight,
  Eye,
  CheckCircle,
  HelpCircle,
  Volume2,
  Lightbulb
} from "lucide-react";
import {
  saveFaceDescriptor,
  deleteFaceDescriptor,
  extractDescriptorFromCanvas,
  estimateEyeNoseLandmarks,
  playAttendanceSuccessChime,
  getSchoolFaceDescriptors,
  detectFacesInFrame,
  matchFaceDescriptor,
  assessFaceLightingAndQuality,
  FaceDescriptorRecord,
  DetectedFaceBox
} from "../../utils/faceRecognitionEngine";
import { updateStudentPhoto, updateTeacher, getTeachers, getLocalTeachers } from "../../school-firebase";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { hapticStrong } from "../../utils/haptic";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  students: any[];
  teachers?: any[];
  classes?: any[];
  initialTab?: "STUDENTS" | "TEACHERS" | "TEST";
  initialTargetPerson?: any;
  initialTargetType?: "STUDENT" | "TEACHER";
  onEnrollmentUpdated?: () => void;
}

export const UniversalFaceIdStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  students = [],
  teachers = [],
  classes = [],
  initialTab,
  initialTargetPerson,
  initialTargetType,
  onEnrollmentUpdated
}) => {
  // Navigation tabs: "STUDENTS" | "TEACHERS" | "TEST"
  const [activeTab, setActiveTab] = useState<"STUDENTS" | "TEACHERS" | "TEST">(initialTab || "STUDENTS");
  const [localTeachersList, setLocalTeachersList] = useState<any[]>(teachers || []);

  useEffect(() => {
    if (teachers && teachers.length > 0) {
      setLocalTeachersList(teachers);
    } else if (schoolId) {
      const local = getLocalTeachers(schoolId);
      if (local && local.length > 0) {
        setLocalTeachersList(local);
      } else {
        getTeachers(schoolId).then((list) => {
          if (list && list.length > 0) {
            setLocalTeachersList(list);
          }
        }).catch(() => {});
      }
    }
  }, [teachers, schoolId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (initialTargetPerson) {
      setTargetPerson(initialTargetPerson);
      setTargetType(initialTargetType || "TEACHER");
    }
  }, [isOpen, initialTab, initialTargetPerson, initialTargetType]);

  // Enrolled descriptors map
  const [enrolledMap, setEnrolledMap] = useState<Record<string, FaceDescriptorRecord>>({});
  const [loadingMap, setLoadingMap] = useState<boolean>(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [filterEnrolledStatus, setFilterEnrolledStatus] = useState<"ALL" | "ENROLLED" | "PENDING">("ALL");

  // Live Camera Capture State
  const [targetPerson, setTargetPerson] = useState<any | null>(null);
  const [targetType, setTargetType] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [enrollFacingMode, setEnrollFacingMode] = useState<"user" | "environment">("user");
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessingCapture, setIsProcessingCapture] = useState<boolean>(false);
  const [captureSuccess, setCaptureSuccess] = useState<boolean>(false);
  const [studioScreenFlash, setStudioScreenFlash] = useState<boolean>(false);
  const [guidanceMsg, setGuidanceMsg] = useState<string>("कैमरे में सीधा देखें और चेहरा फ्रेम में रखें");

  // Test Mode State
  const [testFacingMode, setTestFacingMode] = useState<"user" | "environment">("user");
  const testVideoRef = useRef<HTMLVideoElement | null>(null);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  const [testCameraActive, setTestCameraActive] = useState<boolean>(false);
  const [testMatchedPerson, setTestMatchedPerson] = useState<{
    record: FaceDescriptorRecord;
    confidence: number;
    time: string;
  } | null>(null);

  // Load descriptors from IndexedDB and Firestore
  const loadDescriptors = useCallback(async () => {
    setLoadingMap(true);
    try {
      const map = await getSchoolFaceDescriptors(schoolId);
      setEnrolledMap(map);
    } catch (e) {
      console.warn("Error loading face descriptors:", e);
    } finally {
      setLoadingMap(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (isOpen) {
      loadDescriptors();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
        testStreamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
        testStreamRef.current = null;
      }
    };
  }, [isOpen, loadDescriptors]);

  // Start Camera for Enrollment
  const startEnrollmentCamera = async (overrideMode?: "user" | "environment") => {
    setCameraError(null);
    const mode = overrideMode || enrollFacingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      // Progressive constraints fallback for Android and mobile browsers
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 640 }, height: { ideal: 480 } },
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
        liveVideoRef.current.setAttribute("playsinline", "true");
        await liveVideoRef.current.play();
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "कैमरा अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में कैमरा चालू करें।"
          : `कैमरा शुरू करने में त्रुटि: ${err.message || "Unknown error"}`
      );
    }
  };

  const toggleEnrollFacingMode = async () => {
    const nextMode = enrollFacingMode === "user" ? "environment" : "user";
    setEnrollFacingMode(nextMode);
    await startEnrollmentCamera(nextMode);
  };

  const stopEnrollmentCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (targetPerson) {
      startEnrollmentCamera();
    } else {
      stopEnrollmentCamera();
      setCountdown(null);
      setCaptureSuccess(false);
    }
    return () => stopEnrollmentCamera();
  }, [targetPerson]);

  // Start Camera for Test Mode
  const startTestCamera = async (overrideMode?: "user" | "environment") => {
    const mode = overrideMode || testFacingMode;
    try {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false
        });
      }
      testStreamRef.current = stream;
      setTestCameraActive(true);
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
        testVideoRef.current.setAttribute("playsinline", "true");
        await testVideoRef.current.play();
      }
    } catch {
      setTestCameraActive(false);
    }
  };

  const toggleTestFacingMode = async () => {
    const nextMode = testFacingMode === "user" ? "environment" : "user";
    setTestFacingMode(nextMode);
    await startTestCamera(nextMode);
  };

  const stopTestCamera = () => {
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    setTestCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === "TEST" && isOpen) {
      startTestCamera();
    } else {
      stopTestCamera();
      setTestMatchedPerson(null);
    }
    return () => stopTestCamera();
  }, [activeTab, isOpen]);

  // Test Mode Detection Loop
  useEffect(() => {
    if (activeTab !== "TEST" || !isOpen) return;

    let animId: number;
    let lastScanTime = 0;

    const renderTestLoop = async (time: number) => {
      if (time - lastScanTime >= 400 && testVideoRef.current && testCanvasRef.current) {
        lastScanTime = time;
        const video = testVideoRef.current;
        const canvas = testCanvasRef.current;
        const ctx = canvas.getContext("2d");

        if (video.readyState >= 2 && ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          try {
            const detected = await detectFacesInFrame(video, enrolledMap);

            if (detected.length > 0) {
              const face = detected[0];
              const { x, y, width, height, matchedStudent } = face;

              // Draw Face Bounding Box
              ctx.lineWidth = 3;
              ctx.strokeStyle = matchedStudent ? "#10b981" : "#f59e0b";
              ctx.beginPath();
              ctx.roundRect(x, y, width, height, 16);
              ctx.stroke();

              // Draw Label
              ctx.fillStyle = matchedStudent ? "rgba(16, 185, 129, 0.9)" : "rgba(245, 158, 11, 0.9)";
              ctx.fillRect(x, Math.max(0, y - 32), width, 32);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 13px sans-serif";
              const label = matchedStudent
                ? `✓ ${matchedStudent.name} (${Math.round(matchedStudent.confidencePercent)}%)`
                : "चेहरा मिला (Unregistered Face)";
              ctx.fillText(label, x + 8, Math.max(22, y - 10));

              if (matchedStudent) {
                const rec = enrolledMap[matchedStudent.studentId];
                if (rec) {
                  setTestMatchedPerson({
                    record: rec,
                    confidence: matchedStudent.confidencePercent,
                    time: new Date().toLocaleTimeString("en-IN")
                  });
                }
              }
            } else {
              setTestMatchedPerson(null);
            }
          } catch {}
        }
      }
      animId = requestAnimationFrame(renderTestLoop);
    };

    animId = requestAnimationFrame(renderTestLoop);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, isOpen, enrolledMap]);

  // Execute Live Capture and Biometric Feature Extraction
  const handleCaptureLiveFace = async () => {
    if (!liveVideoRef.current || !targetPerson || isProcessingCapture) return;

    setIsProcessingCapture(true);
    setGuidanceMsg("स्थिर रहें... 3 सेकंड में चेहरा स्कैन होगा");

    // 3-step countdown
    for (let c = 3; c >= 1; c--) {
      setCountdown(c);
      await new Promise((r) => setTimeout(r, 700));
    }
    setCountdown(null);
    setGuidanceMsg("चेहरा कैप्चर किया जा रहा है...");

    try {
      const video = liveVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      // Draw high-resolution frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL("image/jpeg", 0.92);

      // Centered face box in oval
      const box = {
        x: canvas.width * 0.18,
        y: canvas.height * 0.15,
        width: canvas.width * 0.64,
        height: canvas.height * 0.70
      };

      const lighting = assessFaceLightingAndQuality(canvas, box);
      if (lighting.isTooDark && !studioScreenFlash) {
        setStudioScreenFlash(true);
        setGuidanceMsg("💡 रोशनी बहुत कम थी — स्क्रीन लाइट चालू कर दी गई है। कृपया 1 सेकंड रुकें, फिर कैप्चर करें।");
        setIsProcessingCapture(false);
        return;
      }

      const landmarks = estimateEyeNoseLandmarks(canvas, box);
      const descriptor = extractDescriptorFromCanvas(canvas, box, false, landmarks);

      const record: FaceDescriptorRecord = {
        studentId: targetPerson.id,
        schoolId,
        name: targetPerson.name,
        role: targetType,
        designation: targetType === "TEACHER" ? (targetPerson.designation || (Array.isArray(targetPerson.subjects) ? targetPerson.subjects.join(", ") : "Faculty")) : undefined,
        rollNo: targetType === "STUDENT" ? String(targetPerson.rollNo || "") : undefined,
        classId: targetPerson.classId,
        className: targetPerson.className,
        photoUrl: photoDataUrl,
        descriptor,
        enrolledAt: new Date().toISOString(),
        source: "live_studio"
      };

      // 1. Save biometric descriptor (IndexedDB + LocalStorage + Firestore cloud sync)
      await saveFaceDescriptor(record);

      // 2. Update person's live photo in database so ID cards & portals match
      if (targetType === "STUDENT") {
        try {
          await updateStudentPhoto(schoolId, targetPerson.id, photoDataUrl);
        } catch {}
      } else if (targetType === "TEACHER") {
        try {
          await updateTeacher(schoolId, targetPerson.id, { photoUrl: photoDataUrl });
        } catch {}
      }

      setEnrolledMap((prev) => ({ ...prev, [targetPerson.id]: record }));
      setCaptureSuccess(true);
      playAttendanceSuccessChime();
      hapticStrong();

      speakNotification(
        "फेस आईडी दर्ज हुई",
        `${targetPerson.name} का लाइव फेस आईडी सफलतापूर्वक रजिस्टर हो गया है।`
      );

      if (onEnrollmentUpdated) onEnrollmentUpdated();

      setTimeout(() => {
        setTargetPerson(null);
        setIsProcessingCapture(false);
        setCaptureSuccess(false);
      }, 1800);
    } catch (err: any) {
      console.error("Capture error:", err);
      alert("फेस कैप्चर में समस्या: " + (err?.message || err));
      setIsProcessingCapture(false);
    }
  };

  // Delete Face Record
  const handleDeleteFace = async (id: string, name: string) => {
    if (!window.confirm(`क्या आप वाकई ${name} का फेस आईडी बायोमेट्रिक डेटा हटाना चाहते हैं?`)) {
      return;
    }
    try {
      await deleteFaceDescriptor(id, schoolId);
      setEnrolledMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      speakNotification("बायोमेट्रिक हटाया गया", `${name} का फेस डेटा हटा दिया गया।`);
      if (onEnrollmentUpdated) onEnrollmentUpdated();
    } catch (e: any) {
      alert("हटाने में समस्या: " + (e?.message || e));
    }
  };

  if (!isOpen) return null;

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = !q || s.name.toLowerCase().includes(q) || (s.rollNo && s.rollNo.includes(q));
    const classMatch = selectedClassId === "ALL" || s.classId === selectedClassId;
    const isEnrolled = Boolean(enrolledMap[s.id]);
    const statusMatch =
      filterEnrolledStatus === "ALL" ||
      (filterEnrolledStatus === "ENROLLED" && isEnrolled) ||
      (filterEnrolledStatus === "PENDING" && !isEnrolled);
    return nameMatch && classMatch && statusMatch;
  });

  // Filtered Teachers
  const filteredTeachers = localTeachersList.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = !q || (t.name || "").toLowerCase().includes(q);
    const isEnrolled = Boolean(enrolledMap[t.id]);
    const statusMatch =
      filterEnrolledStatus === "ALL" ||
      (filterEnrolledStatus === "ENROLLED" && isEnrolled) ||
      (filterEnrolledStatus === "PENDING" && !isEnrolled);
    return nameMatch && statusMatch;
  });

  const enrolledStudentCount = students.filter((s) => enrolledMap[s.id]).length;
  const enrolledTeacherCount = localTeachersList.filter((t) => enrolledMap[t.id]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  लाइव फेस आईडी रजिस्ट्रेशन स्टुडियो
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AI Biometrics
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                2D फोटो की जगह छात्रों व शिक्षकों का असली लाइव चेहरा कैमरे से स्कैन करें, ताकि हाजिरी 100% सटीक लगे
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("STUDENTS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === "STUDENTS"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>छात्र बायोमेट्रिक्स ({enrolledStudentCount}/{students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("TEACHERS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === "TEACHERS"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>शिक्षक व स्टाफ ({enrolledTeacherCount}/{localTeachersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("TEST")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === "TEST"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>🧪 लाइव फेस टेस्ट (Live Match Test)</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
            कुल नामांकित: <strong className="text-white">{Object.keys(enrolledMap).length}</strong> फेस आईडी
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1 & 2: Students or Teachers Roster */}
          {(activeTab === "STUDENTS" || activeTab === "TEACHERS") && (
            <>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === "STUDENTS"
                        ? "छात्र का नाम या रोल नंबर खोजें..."
                        : "शिक्षक का नाम खोजें..."
                    }
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {activeTab === "STUDENTS" && classes.length > 0 && (
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200"
                    >
                      <option value="ALL">सभी कक्षाएं (All Classes)</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={filterEnrolledStatus}
                    onChange={(e) => setFilterEnrolledStatus(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200"
                  >
                    <option value="ALL">सभी स्थितियां</option>
                    <option value="ENROLLED">✓ सिर्फ फेस रजिस्टर्ड</option>
                    <option value="PENDING">⏳ फेस पेंडिंग (बाकी)</option>
                  </select>
                </div>
              </div>

              {/* Grid of Persons */}
              {loadingMap ? (
                <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  बायोमेट्रिक डेटा लोड हो रहा है...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(activeTab === "STUDENTS" ? filteredStudents : filteredTeachers).map((person) => {
                    const isEnrolled = Boolean(enrolledMap[person.id]);
                    const rec = enrolledMap[person.id];
                    const isStudent = activeTab === "STUDENTS";

                    return (
                      <div
                        key={person.id}
                        className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                          isEnrolled
                            ? "bg-slate-950/80 border-emerald-500/30 shadow-xs"
                            : "bg-slate-950/40 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {person.photoUrl ? (
                              <img
                                src={person.photoUrl}
                                alt={person.name}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-base">
                                {person.name.charAt(0)}
                              </div>
                            )}
                            {isEnrolled && (
                              <span
                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow"
                                title="Face ID Enrolled"
                              >
                                ✓
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white truncate">{person.name}</h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {isStudent
                                ? `Roll #${person.rollNo || "—"} • ${person.className || "Class"}`
                                : person.designation || (Array.isArray(person.subjects) ? person.subjects.join(", ") : "Faculty")}
                            </p>
                            {isEnrolled ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {rec?.source === "live_studio" ? "लाइव स्टूडियो स्कैन" : "फोटो एन्कोडेड"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-400 font-medium">
                                ⏳ फेस आईडी बाकी है
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setTargetPerson(person);
                              setTargetType(isStudent ? "STUDENT" : "TEACHER");
                            }}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                              isEnrolled
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20"
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{isEnrolled ? "री-स्कैन (Re-Scan)" : "लाइव चेहरा स्कैन करें"}</span>
                          </button>

                          {isEnrolled && (
                            <button
                              onClick={() => handleDeleteFace(person.id, person.name)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                              title="बायोमेट्रिक डेटा हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 3: Test Match Mode */}
          {activeTab === "TEST" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong className="text-white block font-bold">लाइव फेस मैच टेस्ट सक्रिय है</strong>
                  कोई भी छात्र या शिक्षक कैमरे के सामने आए। AI इंजन 0ms में पहचानकर उनकी जानकारी और मैच प्रतिशत दिखाएगा।
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Camera Viewfinder */}
                <div className="relative aspect-video sm:aspect-square bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-xl flex items-center justify-center">
                  {/* Camera Switch Button */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={toggleTestFacingMode}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer backdrop-blur-sm"
                      title="कैमरा बदलें (Front / Back Camera)"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{testFacingMode === "user" ? "📱 फ्रंट (Selfie)" : "📷 बैक (Rear)"}</span>
                    </button>
                  </div>

                  <video
                    ref={testVideoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover transition-transform ${testFacingMode === "user" ? "transform -scale-x-100" : ""}`}
                  />
                  <canvas
                    ref={testCanvasRef}
                    className={`absolute inset-0 w-full h-full pointer-events-none ${testFacingMode === "user" ? "transform -scale-x-100" : ""}`}
                  />

                  {/* Face Target Center Oval Reticle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-64 sm:w-56 sm:h-72 border-2 border-dashed border-white/40 rounded-[50%] animate-pulse" />
                  </div>
                </div>

                {/* Match Result Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      लाइव डिटेक्शन व पहचान रिपोर्ट
                    </h4>

                    {testMatchedPerson ? (
                      <div className="mt-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-3 animate-in zoom-in-95">
                        <div className="w-20 h-20 rounded-2xl mx-auto overflow-hidden border-2 border-emerald-400 shadow-lg">
                          <img
                            src={testMatchedPerson.record.photoUrl}
                            alt={testMatchedPerson.record.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <h3 className="text-lg font-black text-white">
                              {testMatchedPerson.record.name}
                            </h3>
                          </div>
                          <p className="text-xs text-emerald-300 font-bold mt-0.5">
                            {testMatchedPerson.record.role === "TEACHER"
                              ? `👨‍🏫 शिक्षक • ${testMatchedPerson.record.designation || "Faculty"}`
                              : `🎓 छात्र • ${testMatchedPerson.record.className || "Class"} (Roll #${testMatchedPerson.record.rollNo || "—"})`}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-around text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              बायोमेट्रिक मैच
                            </span>
                            <span className="text-emerald-400 font-black text-sm">
                              {Math.round(testMatchedPerson.confidence)}% सटीक
                            </span>
                          </div>
                          <div className="w-px h-6 bg-slate-800" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              सत्यापन समय
                            </span>
                            <span className="text-white font-mono font-bold text-xs">
                              {testMatchedPerson.time}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-emerald-200/90 font-medium">
                          ✓ बायोमेट्रिक वेरिफिकेशन पास! कियोस्क में उपस्थिति दर्ज करने के लिए पूर्णतः तैयार।
                        </p>
                      </div>
                    ) : (
                      <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                        <Eye className="w-10 h-10 text-slate-700 mx-auto" />
                        <p className="font-bold text-slate-400">चेहरे की तलाश जारी है...</p>
                        <p className="text-[11px] text-slate-600">
                          कैमरे के सामने चेहरा लाएं। यदि चेहरा पंजीकृत है, तो वह यहाँ तुरंत दिखाई देगा।
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                    💡 <strong>टिप:</strong> यदि चेहरा 2D फोटो से मैच नहीं होता, तो उसे "लाइव चेहरा स्कैन करें" बटन से एक बार लाइव कैमरे से रजिस्टर करें। इसके बाद लाइव मैच 98%+ एक्यूरेसी पर काम करेगा।
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Enrollment Camera Overlay Modal */}
        {targetPerson && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="text-left">
                  <h4 className="text-sm font-black text-white">लाइव चेहरा पंजीकरण (Face ID)</h4>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    {targetPerson.name} ({targetType === "STUDENT" ? `Class ${targetPerson.className || ""}` : "शिक्षक"})
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={toggleEnrollFacingMode}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-cyan-500/40 bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer active:scale-95"
                    title="कैमरा बदलें (फ्रंट या बैक कैमरा)"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px]">{enrollFacingMode === "user" ? "📱 फ्रंट" : "📷 बैक"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioScreenFlash((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                      studioScreenFlash
                        ? "bg-amber-300 text-slate-950 border-amber-400 shadow-md shadow-amber-300/40"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                    }`}
                    title="स्क्रीन फेस लाइट (कम रोशनी में चेहरे को उजागर करने के लिए)"
                  >
                    <Lightbulb className={`w-3.5 h-3.5 ${studioScreenFlash ? "fill-slate-950 text-slate-950" : "text-amber-400"}`} />
                    <span className="text-[11px]">{studioScreenFlash ? "स्क्रीन लाइट ON" : "स्क्रीन लाइट"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setTargetPerson(null);
                      setStudioScreenFlash(false);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {cameraError ? (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                  {cameraError}
                </div>
              ) : (
                <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 shadow-2xl bg-black flex items-center justify-center transition-all duration-300 ${
                  studioScreenFlash
                    ? "border-white shadow-[0_0_80px_rgba(255,255,255,1)] ring-8 ring-white/90"
                    : "border-emerald-500 shadow-emerald-500/20"
                }`}>
                  <video
                    ref={liveVideoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover transition-transform duration-300 ${enrollFacingMode === "user" ? "transform -scale-x-100" : ""}`}
                  />

                  {/* Circular Face Alignment Guide */}
                  <div className="absolute inset-0 border-2 border-dashed border-white/60 rounded-full pointer-events-none" />

                  {/* Countdown Number */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-6xl font-black text-white animate-ping">
                        {countdown}
                      </span>
                    </div>
                  )}

                  {captureSuccess && (
                    <div className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center text-white flex-col gap-2 animate-in zoom-in-95">
                      <CheckCircle2 className="w-14 h-14" />
                      <span className="text-sm font-black">बायोमेट्रिक सेव हुआ!</span>
                    </div>
                  )}
                </div>
              )}

              {studioScreenFlash && (
                <p className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/50">
                  💡 स्क्रीन फेस लाइट चालू • चेहरे पर पूरी रोशनी पड़ रही है
                </p>
              )}

              <p className="text-xs font-bold text-slate-300">{guidanceMsg}</p>

              <button
                onClick={handleCaptureLiveFace}
                disabled={isProcessingCapture || !cameraActive}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isProcessingCapture ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>बायोमेट्रिक तैयार हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>चेहरा स्कैन करें (Scan & Save Face ID)</span>
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
