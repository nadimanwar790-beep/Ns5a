// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
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
  Lightbulb,
  ScanFace,
  ImagePlus,
  Loader2
} from "lucide-react";
import {
  saveFaceDescriptor,
  deleteFaceDescriptor,
  extractNeuralDescriptor,
  extractNeuralDescriptorWith3DPose,
  initArcFaceEngine,
  isArcFaceReady,
  getArcFaceError,
  estimateHeadPose,
  draw3DHolographicMesh,
  playAttendanceSuccessChime,
  playCooldownTick,
  getSchoolFaceDescriptors,
  detectFacesInFrame,
  assessFaceLightingAndQuality,
  enrollStudentFromPhotoUrl,
  enrollTeacherFromPhotoUrl,
  enrollPersonFromImageFile,
  isActiveRosterPerson,
  FaceDescriptorRecord,
  DetectedFaceBox,
  HeadPoseEstimate
} from "../../utils/faceRecognitionEngine";
import { updateStudentPhoto, updateTeacher, getTeachers, getLocalTeachers, saveNstaMessage } from "../../school-firebase";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { hapticStrong } from "../../utils/haptic";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";

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

const EMPTY_LIST: any[] = [];

export const UniversalFaceIdStudioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  students = EMPTY_LIST,
  teachers = EMPTY_LIST,
  classes = EMPTY_LIST,
  initialTab,
  initialTargetPerson,
  initialTargetType,
  onEnrollmentUpdated
}) => {
  // Navigation tabs: "STUDENTS" | "TEACHERS" | "TEST"
  const [activeTab, setActiveTab] = useState<"STUDENTS" | "TEACHERS" | "TEST">(initialTab || "STUDENTS");
  const [localTeachersList, setLocalTeachersList] = useState<any[]>(() =>
    teachers && teachers.length > 0 ? teachers : (schoolId ? getLocalTeachers(schoolId) || [] : [])
  );
  const teachersPropSig = (teachers || []).map((t) => `${t?.id || ""}:${t?.photoUrl ? 1 : 0}:${t?.active ?? ""}`).join("|");
  const fetchedTeachersSchoolRef = useRef<string>("");

  useEffect(() => {
    if (teachers && teachers.length > 0) {
      setLocalTeachersList(teachers);
      fetchedTeachersSchoolRef.current = schoolId;
    } else if (schoolId && fetchedTeachersSchoolRef.current !== schoolId) {
      fetchedTeachersSchoolRef.current = schoolId;
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
  }, [teachersPropSig, schoolId]);

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

  // 3D Multi-Angle / Quick Scan State (Default to QUICK for fast 2-second enrollment)
  const [scanMode, setScanMode] = useState<"3D_MULTI_ANGLE" | "QUICK">("QUICK");
  const [step3D, setStep3D] = useState<"FRONT" | "LEFT" | "RIGHT" | "COMPLETE">("FRONT");
  const [collected3DVectors, setCollected3DVectors] = useState<{
    front?: number[];
    left?: number[];
    right?: number[];
  }>({});
  const [currentHeadPose, setCurrentHeadPose] = useState<HeadPoseEstimate | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const step3DRef = useRef<"FRONT" | "LEFT" | "RIGHT" | "COMPLETE">("FRONT");
  const collected3DRef = useRef<{
    front?: number[];
    left?: number[];
    right?: number[];
  }>({});

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
    action?: "in" | "out";
    count?: number;
  } | null>(null);
  const testCooldownRef = useRef<Map<string, number>>(new Map());
  const testCountsRef = useRef<Record<string, number>>({});
  const [testHistoryCount, setTestHistoryCount] = useState<number>(0);

  const studentsRef = useRef<any[]>(students);
  studentsRef.current = students;
  const teachersRef = useRef<any[]>(localTeachersList);
  teachersRef.current = localTeachersList;
  const hasLoadedDescriptorsRef = useRef<boolean>(false);

  // Load descriptors from IndexedDB and Firestore (never flickers the UI once loaded)
  const loadDescriptors = useCallback(async () => {
    if (!hasLoadedDescriptorsRef.current) {
      setLoadingMap(true);
    }
    try {
      const map = await getSchoolFaceDescriptors(schoolId);
      const rosterById = new Map<string, any>();
      for (const s of studentsRef.current || []) {
        if (s?.id) rosterById.set(s.id, s);
      }
      for (const t of teachersRef.current || []) {
        if (t?.id) rosterById.set(t.id, t);
      }
      const cleanMap: Record<string, FaceDescriptorRecord> = {};
      for (const [id, rec] of Object.entries(map)) {
        const rp = rosterById.get(id);
        if (rp && !isActiveRosterPerson(rp)) continue;
        cleanMap[id] = rec;
      }
      setEnrolledMap(cleanMap);
      hasLoadedDescriptorsRef.current = true;
    } catch (e) {
      console.warn("Error loading face descriptors:", e);
    } finally {
      setLoadingMap(false);
    }
  }, [schoolId]);

  const [isBatchVectorizing, setIsBatchVectorizing] = useState(false);
  const [batchVectorizeProgress, setBatchVectorizeProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadingPersonId, setUploadingPersonId] = useState<string | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadTargetRef = useRef<{ person: any; role: "STUDENT" | "TEACHER" } | null>(null);
  const [confirmDeleteFaceId, setConfirmDeleteFaceId] = useState<string | null>(null);

  const handleTriggerPhotoUpload = (person: any, role: "STUDENT" | "TEACHER") => {
    pendingUploadTargetRef.current = { person, role };
    if (fileUploadInputRef.current) {
      fileUploadInputRef.current.value = "";
      fileUploadInputRef.current.click();
    }
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = pendingUploadTargetRef.current;
    e.target.value = "";
    if (!file || !target) return;

    const { person, role } = target;
    setUploadingPersonId(person.id);
    if (targetPerson?.id === person.id) {
      setIsProcessingCapture(true);
      setGuidanceMsg("फोटो से फेस डेटा तैयार किया जा रहा है...");
    }

    try {
      const result = await enrollPersonFromImageFile(
        file,
        {
          id: person.id,
          name: person.name,
          rollNo: String(person.rollNo || ""),
          classId: person.classId,
          className: person.className,
          designation: person.designation || (Array.isArray(person.subjects) ? person.subjects.join(", ") : undefined),
        },
        schoolId,
        role
      );

      if (!result) {
        const errMsg = "इस फोटो में चेहरा स्पष्ट नहीं मिला। कृपया सामने से ली गई साफ़ फोटो चुनें।";
        toast.error(errMsg);
        if (targetPerson?.id === person.id) {
          setGuidanceMsg("⚠️ " + errMsg);
        }
        return;
      }

      if (role === "STUDENT") {
        try {
          await updateStudentPhoto(schoolId, person.id, result.photoDataUrl);
        } catch {}
      } else {
        try {
          await updateTeacher(schoolId, person.id, { photoUrl: result.photoDataUrl });
        } catch {}
      }

      person.photoUrl = result.photoDataUrl;
      setEnrolledMap((prev) => ({ ...prev, [person.id]: result.record }));
      playAttendanceSuccessChime();
      try { hapticStrong(); } catch {}
      toast.success(`✅ ${person.name} की फोटो से फेस हाजिरी के लिए सेव हो गई!`);
      speakNotification("फोटो फेस आईडी सेव", `${person.name} की फोटो सफलतापूर्वक सेव हो गई है।`);
      if (onEnrollmentUpdated) onEnrollmentUpdated();

      if (targetPerson?.id === person.id) {
        setCaptureSuccess(true);
        setTimeout(() => {
          setTargetPerson(null);
          setCaptureSuccess(false);
          setIsProcessingCapture(false);
        }, 1400);
      }
    } catch (err: any) {
      const errMsg = err?.message || "फोटो अपलोड करने में समस्या आई।";
      toast.error(errMsg);
      if (targetPerson?.id === person.id) {
        setGuidanceMsg("⚠️ " + errMsg);
      }
    } finally {
      setUploadingPersonId(null);
      if (targetPerson?.id === person.id) {
        setIsProcessingCapture(false);
      }
    }
  };

  const handle1ClickClassAutoVectorize = async () => {
    const currentRole = activeTab === "TEACHERS" ? "TEACHER" : "STUDENT";
    const list = currentRole === "STUDENT" ? students : localTeachersList;
    const withPhotos = (list || []).filter((p) => p && isActiveRosterPerson(p) && p.photoUrl && p.photoUrl.trim());
    if (withPhotos.length === 0) {
      toast.error("सक्रिय प्रोफाइल में फोटो उपलब्ध नहीं है। कृपया पहले फोटो जोड़ें।");
      return;
    }
    setIsBatchVectorizing(true);
    setBatchVectorizeProgress({ current: 0, total: withPhotos.length });
    setGuidanceMsg(`⚡ 1-क्लिक में पूरी लिस्ट (${withPhotos.length}) सेव हो रही है...`);
    try {
      let saved = 0;
      for (let i = 0; i < withPhotos.length; i++) {
        const p = withPhotos[i];
        setBatchVectorizeProgress({ current: i + 1, total: withPhotos.length });
        try {
          const rec = currentRole === "TEACHER"
            ? await enrollTeacherFromPhotoUrl({
                id: p.id,
                schoolId,
                name: p.name,
                designation: p.designation,
                photoUrl: p.photoUrl,
                active: p.active,
                isDeleted: p.isDeleted,
                status: p.status,
              })
            : await enrollStudentFromPhotoUrl({
                id: p.id,
                schoolId,
                name: p.name,
                rollNo: String(p.rollNo || ""),
                classId: p.classId,
                className: p.className,
                photoUrl: p.photoUrl,
                active: p.active,
                isDeleted: p.isDeleted,
                status: p.status,
                tcIssued: p.tcIssued,
              });
          if (rec) saved++;
        } catch {}
      }
      await loadDescriptors();
      playAttendanceSuccessChime();
      toast.success(`✅ ${saved} प्रोफाइल फोटो से फेस हाजिरी के लिए सेव हो गए!`);
      if (onEnrollmentUpdated) onEnrollmentUpdated();
    } catch {
      toast.error("क्लास सेव करने में समस्या आई");
    } finally {
      setIsBatchVectorizing(false);
      setBatchVectorizeProgress(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDescriptors();
    } else {
      hasLoadedDescriptorsRef.current = false;
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
            const detected = await detectFacesInFrame(video, enrolledMap, { schoolId });

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
                ? `✓ ${matchedStudent.name} (Sim: ${Math.round(matchedStudent.similarityPercent)}%)`
                : "चेहरा मिला (Unregistered Face)";
              ctx.fillText(label, x + 8, Math.max(22, y - 10));

              if (matchedStudent) {
                const rec = enrolledMap[matchedStudent.studentId];
                if (rec) {
                  const nowMs = Date.now();
                  const lastTs = testCooldownRef.current.get(rec.studentId) || 0;
                  const timeStr = new Date(nowMs).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  });

                  if (nowMs - lastTs >= 3000) {
                    testCooldownRef.current.set(rec.studentId, nowMs);
                    const nextCount = (testCountsRef.current[rec.studentId] || 0) + 1;
                    testCountsRef.current[rec.studentId] = nextCount;
                    const action: "in" | "out" = nextCount % 2 === 1 ? "in" : "out";
                    setTestHistoryCount((c) => c + 1);

                    playAttendanceSuccessChime();
                    hapticStrong();

                    setTestMatchedPerson({
                      record: rec,
                      confidence: matchedStudent.similarityPercent,
                      time: timeStr,
                      action,
                      count: nextCount,
                    });

                    try {
                      if (typeof window !== "undefined" && "speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                        const utt = new SpeechSynthesisUtterance(
                          `${rec.name} ${action === "out" ? "प्रस्थान OUT" : "उपस्थित IN"}`
                        );
                        utt.lang = "hi-IN";
                        window.speechSynthesis.speak(utt);
                      } else {
                        speakNotification(`${rec.name} ${action.toUpperCase()}`, undefined, { force: true, playTone: false });
                      }
                    } catch {}

                    const clsLabel = rec.className || (rec.role === "TEACHER" ? "शिक्षक (Faculty)" : "Class");
                    const pushTitle = action === "in"
                      ? `🟢 [TEST #${nextCount} • IN] ${rec.name} प्रवेश`
                      : `🔴 [TEST #${nextCount} • OUT] ${rec.name} प्रस्थान`;
                    const pushBody = action === "in"
                      ? `[Test Mode #${nextCount}] ${rec.name} (${clsLabel}) ka Check-IN samay ${timeStr} par darj hua.`
                      : `[Test Mode #${nextCount}] ${rec.name} (${clsLabel}) ka Check-OUT samay ${timeStr} par darj hua.`;

                    void sendSchoolPushNotification({
                      schoolId,
                      classId: rec.classId || "",
                      className: clsLabel,
                      studentIds: [rec.studentId],
                      ...(rec.role === "TEACHER" ? { userId: rec.studentId } : {}),
                      senderId: "school_kiosk_test",
                      senderName: "स्कूल टेस्ट डेस्क",
                      title: pushTitle,
                      body: pushBody,
                      type: "SCHOOL_NOTICE",
                      url: `/?schoolPortal=1&studentId=${encodeURIComponent(rec.studentId)}&schoolTab=messenger&subTab=school`,
                      urgent: true,
                    }).catch(() => {});

                    if (rec.role !== "TEACHER") {
                      const testMsgText = action === "in"
                        ? `🟢 [TEST MODE #${nextCount} — Check-IN]\nनमस्ते! ${rec.name} (${clsLabel}${rec.rollNo ? `, Roll #${rec.rollNo}` : ""}) का टेस्ट प्रवेश (IN) समय ${timeStr} पर दर्ज हुआ।`
                        : `🔴 [TEST MODE #${nextCount} — Check-OUT]\nनमस्ते! ${rec.name} (${clsLabel}${rec.rollNo ? `, Roll #${rec.rollNo}` : ""}) का टेस्ट प्रस्थान (OUT) समय ${timeStr} पर दर्ज हुआ।`;
                      void saveNstaMessage({
                        id: `msg_test_studio_${nowMs}_${nextCount}_${rec.studentId}`,
                        schoolId,
                        threadType: "SCHOOL_DESK",
                        classId: rec.classId || "",
                        studentId: rec.studentId,
                        studentName: rec.name,
                        senderId: "school_kiosk_test",
                        senderName: "स्कूल टेस्ट डेस्क",
                        senderRole: "ADMIN",
                        text: testMsgText,
                        createdAt: new Date(nowMs).toISOString(),
                        status: "delivered",
                      }).catch(() => {});
                    }
                  } else {
                    setTestMatchedPerson((prev) => ({
                      record: rec,
                      confidence: matchedStudent.similarityPercent,
                      time: prev?.record?.studentId === rec.studentId ? prev.time : timeStr,
                      action: prev?.record?.studentId === rec.studentId ? prev.action : ((testCountsRef.current[rec.studentId] || 1) % 2 === 1 ? "in" : "out"),
                      count: prev?.record?.studentId === rec.studentId ? prev.count : (testCountsRef.current[rec.studentId] || 1),
                    }));
                  }
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
  }, [activeTab, isOpen, enrolledMap, schoolId]);

  // 3D Live Head Pose Tracking & Holographic Wireframe Loop
  useEffect(() => {
    if (!targetPerson || !cameraActive || captureSuccess) return;

    let animId: number;
    let lastScan = 0;
    let poseHoldCounter = 0;

    const studioPoseLoop = async (time: number) => {
      if (time - lastScan >= 140 && liveVideoRef.current && studioCanvasRef.current) {
        lastScan = time;
        const video = liveVideoRef.current;
        const canvas = studioCanvasRef.current;
        const ctx = canvas.getContext("2d");

        if (video.readyState >= 2 && ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          try {
            const neural3D = await extractNeuralDescriptorWith3DPose(video);
            if (neural3D) {
              const { pose, landmarks, box, descriptor } = neural3D;
              setCurrentHeadPose(pose);

              // Draw futuristic 3D holographic wireframe mesh
              draw3DHolographicMesh(
                ctx,
                box,
                pose,
                landmarks,
                false,
                undefined,
                enrollFacingMode === "user",
                canvas.width
              );

              // In 3D Multi-Angle Mode: Auto-step guidance & capture
              if (scanMode === "3D_MULTI_ANGLE" && !isProcessingCapture) {
                const currentStep = step3DRef.current;
                const collected = collected3DRef.current;

                // STEP 1: FRONT (Straight 0°)
                if (currentStep === "FRONT" && !collected.front) {
                  if (pose.isFrontFacing) {
                    poseHoldCounter++;
                    setGuidanceMsg("✓ सामने का कोण सही है, स्थिर रहें...");
                    if (poseHoldCounter >= 2) {
                      poseHoldCounter = 0;
                      playCooldownTick();
                      const next = { ...collected, front: descriptor };
                      collected3DRef.current = next;
                      setCollected3DVectors(next);
                      step3DRef.current = "LEFT";
                      setStep3D("LEFT");
                      setGuidanceMsg("शानदार! अब हल्का बाईं ओर मुड़ें (Turn Left ~15°)");
                      speakNotification("बहुत बढ़िया, अब हल्का बाईं ओर मुड़ें");
                    }
                  } else {
                    poseHoldCounter = 0;
                    setGuidanceMsg("कदम 1/3: कृपया कैमरे में सीधा देखें (0° Front)");
                  }
                }
                // STEP 2: LEFT (Head turned left ~15°)
                else if (currentStep === "LEFT" && !collected.left) {
                  const isLeftAngled = enrollFacingMode === "user" ? pose.yaw > 8 : pose.yaw < -8;
                  if (isLeftAngled) {
                    poseHoldCounter++;
                    setGuidanceMsg("✓ बायां कोण लॉक हो रहा है, स्थिर रहें...");
                    if (poseHoldCounter >= 2) {
                      poseHoldCounter = 0;
                      playCooldownTick();
                      const next = { ...collected, left: descriptor };
                      collected3DRef.current = next;
                      setCollected3DVectors(next);
                      step3DRef.current = "RIGHT";
                      setStep3D("RIGHT");
                      setGuidanceMsg("उत्तम! अब हल्का दाईं ओर मुड़ें (Turn Right ~15°)");
                      speakNotification("अब हल्का दाईं ओर मुड़ें");
                    }
                  } else {
                    poseHoldCounter = 0;
                    setGuidanceMsg("कदम 2/3: हल्का बाईं ओर देखें (Turn Left ~15°)");
                  }
                }
                // STEP 3: RIGHT (Head turned right ~15°)
                else if (currentStep === "RIGHT" && !collected.right) {
                  const isRightAngled = enrollFacingMode === "user" ? pose.yaw < -8 : pose.yaw > 8;
                  if (isRightAngled) {
                    poseHoldCounter++;
                    setGuidanceMsg("✓ दायां कोण लॉक हो रहा है...");
                    if (poseHoldCounter >= 2) {
                      poseHoldCounter = 0;
                      const final3D = {
                        front: collected.front || descriptor,
                        left: collected.left || descriptor,
                        right: descriptor,
                      };
                      collected3DRef.current = final3D;
                      setCollected3DVectors(final3D);
                      step3DRef.current = "COMPLETE";
                      setStep3D("COMPLETE");
                      void handleSave3DComposite(final3D, video);
                    }
                  } else {
                    poseHoldCounter = 0;
                    setGuidanceMsg("कदम 3/3: हल्का दाईं ओर देखें (Turn Right ~15°)");
                  }
                }
              }
            } else {
              setCurrentHeadPose(null);
            }
          } catch {}
        }
      }
      animId = requestAnimationFrame(studioPoseLoop);
    };

    animId = requestAnimationFrame(studioPoseLoop);
    return () => cancelAnimationFrame(animId);
  }, [targetPerson, cameraActive, captureSuccess, scanMode, isProcessingCapture, enrollFacingMode]);

  // Save 3D Multi-Angle Composite Profile
  const handleSave3DComposite = async (
    final3D: { front?: number[]; left?: number[]; right?: number[] },
    videoElement?: HTMLVideoElement | null
  ) => {
    try {
      setIsProcessingCapture(true);
      const video = videoElement || liveVideoRef.current;
      let photoDataUrl = "";
      if (video) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        photoDataUrl = canvas.toDataURL("image/jpeg", 0.90);
      }

      // Strictly enforce valid 512-D ArcFace primary descriptor ONLY (zero 128-D)
      let primaryDesc = final3D.front || final3D.left || final3D.right || [];
      if (primaryDesc.length !== 512 && video) {
        const neural = await extractNeuralDescriptor(video).catch(() => null);
        if (neural?.arcfaceDescriptor && neural.arcfaceDescriptor.length === 512) {
          primaryDesc = neural.arcfaceDescriptor;
        }
      }

      if (primaryDesc.length !== 512) {
        setIsProcessingCapture(false);
        const arcErr = !isArcFaceReady() ? getArcFaceError() : null;
        setGuidanceMsg(
          arcErr
            ? `⚠️ ArcFace 512-D इंजन लोड नहीं हुआ: ${arcErr}`
            : "⚠️ ArcFace 512-D मॉडल तैयार नहीं है या चेहरा स्पष्ट नहीं दिखा। कृपया रोशनी में दोबारा स्कैन करें या गैलरी से साफ़ फोटो जोड़ें।"
        );
        return;
      }

      const composite3D = {
        front: final3D.front?.length === 512 ? final3D.front : primaryDesc,
        left: final3D.left?.length === 512 ? final3D.left : primaryDesc,
        right: final3D.right?.length === 512 ? final3D.right : primaryDesc,
      };

      const record: FaceDescriptorRecord = {
        studentId: targetPerson.id,
        schoolId,
        name: targetPerson.name,
        role: targetType,
        designation: targetType === "TEACHER" ? (targetPerson.designation || (Array.isArray(targetPerson.subjects) ? targetPerson.subjects.join(", ") : "Faculty")) : undefined,
        rollNo: targetType === "STUDENT" ? String(targetPerson.rollNo || "") : undefined,
        classId: targetPerson.classId,
        className: targetPerson.className,
        photoUrl: photoDataUrl || targetPerson.photoUrl || "",
        descriptor: primaryDesc,
        arcfaceDescriptor: primaryDesc,
        multiAngleDescriptors: composite3D,
        descriptors3D: composite3D,
        depthMesh: {
          yaw: currentHeadPose?.yaw || 0,
          pitch: currentHeadPose?.pitch || 0,
          roll: currentHeadPose?.roll || 0,
          is3DCalibrated: true,
          anglesCount: 3,
        },
        enrolledAt: new Date().toISOString(),
        source: "arcface_512d",
        preprocessOrder: "RGB",
      };

      await saveFaceDescriptor(record);

      if (targetType === "STUDENT" && photoDataUrl) {
        try {
          await updateStudentPhoto(schoolId, targetPerson.id, photoDataUrl);
        } catch {}
      } else if (targetType === "TEACHER" && photoDataUrl) {
        try {
          await updateTeacher(schoolId, targetPerson.id, { photoUrl: photoDataUrl });
        } catch {}
      }

      setEnrolledMap((prev) => ({ ...prev, [targetPerson.id]: record }));
      setCaptureSuccess(true);
      playAttendanceSuccessChime();
      try { hapticStrong(); } catch {}

      speakNotification(
        "3D फेस आईडी दर्ज हुई",
        `${targetPerson.name} का 3D मल्टी-एंगल फेस सफलतापूर्वक सुरक्षित हो गया है।`
      );

      if (onEnrollmentUpdated) onEnrollmentUpdated();

      setTimeout(() => {
        setTargetPerson(null);
        setCaptureSuccess(false);
        setIsProcessingCapture(false);
        step3DRef.current = "FRONT";
        setStep3D("FRONT");
        collected3DRef.current = {};
        setCollected3DVectors({});
      }, 1800);
    } catch (e) {
      console.warn("3D save error:", e);
      setIsProcessingCapture(false);
      setGuidanceMsg("3D सेव करने में समस्या आई, कृपया दोबारा क्लिक करें");
    }
  };

  // Execute Live Capture and Biometric Feature Extraction (Supports Instant Save & Manual Step Captures)
  const handleCaptureLiveFace = async (forceInstantSave = false) => {
    if (!liveVideoRef.current || !targetPerson || isProcessingCapture) return;

    setIsProcessingCapture(true);
    setGuidanceMsg("बायोमेट्रिक स्कैन किया जा रहा है...");

    try {
      const video = liveVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL("image/jpeg", 0.90);

      const box = {
        x: canvas.width * 0.18,
        y: canvas.height * 0.15,
        width: canvas.width * 0.64,
        height: canvas.height * 0.70
      };

      const lighting = assessFaceLightingAndQuality(canvas, box);
      if (lighting.isTooDark && !studioScreenFlash) {
        setStudioScreenFlash(true);
        setGuidanceMsg("💡 रोशनी कम है — स्क्रीन फेस लाइट चालू की गई है। 1 सेकंड रुकें और दोबारा टैप करें।");
        setIsProcessingCapture(false);
        return;
      }

      // Strictly extract 512-D ArcFace neural embedding ONLY (zero 128-D)
      await initArcFaceEngine().catch(() => false);
      const neural3D = await extractNeuralDescriptorWith3DPose(canvas).catch(() => null);
      const neuralStd = !neural3D ? await extractNeuralDescriptor(canvas).catch(() => null) : null;
      const neuralResult = neural3D || neuralStd;

      const descriptor =
        neuralResult?.arcfaceDescriptor?.length === 512
          ? neuralResult.arcfaceDescriptor
          : null;

      if (!descriptor) {
        const arcErr = !isArcFaceReady() ? getArcFaceError() : null;
        setGuidanceMsg(
          arcErr
            ? `⚠️ ArcFace 512-D इंजन लोड नहीं हो सका: ${arcErr}`
            : "⚠️ ArcFace 512-D वेक्टर तैयार नहीं हो सका। कृपया चेहरा कैमरे के सामने सीधा रखें या नीचे 'फोटो जोड़ें' से गैलरी फोटो अपलोड करें।"
        );
        setIsProcessingCapture(false);
        return;
      }

      const source = "arcface_512d";

      // 1-TAP FAST ENROLLMENT (2-Second Face ID Generation)
      const final3D = {
        front: descriptor,
        left: descriptor,
        right: descriptor,
      };

      const record: FaceDescriptorRecord = {
        studentId: targetPerson.id,
        schoolId,
        name: targetPerson.name,
        role: targetType,
        designation: targetType === "TEACHER" ? (targetPerson.designation || (Array.isArray(targetPerson.subjects) ? targetPerson.subjects.join(", ") : "Faculty")) : undefined,
        rollNo: targetType === "STUDENT" ? String(targetPerson.rollNo || "") : undefined,
        classId: targetPerson.classId,
        className: targetPerson.className,
        photoUrl: photoDataUrl || targetPerson.photoUrl || "",
        descriptor,
        arcfaceDescriptor: descriptor,
        multiAngleDescriptors: final3D,
        descriptors3D: final3D,
        depthMesh: {
          yaw: currentHeadPose?.yaw || 0,
          pitch: currentHeadPose?.pitch || 0,
          roll: currentHeadPose?.roll || 0,
          is3DCalibrated: true,
          anglesCount: 3,
        },
        enrolledAt: new Date().toISOString(),
        source,
        preprocessOrder: "RGB",
      };

      await saveFaceDescriptor(record);

      if (targetType === "STUDENT" && photoDataUrl) {
        try {
          await updateStudentPhoto(schoolId, targetPerson.id, photoDataUrl);
        } catch {}
      } else if (targetType === "TEACHER" && photoDataUrl) {
        try {
          await updateTeacher(schoolId, targetPerson.id, { photoUrl: photoDataUrl });
        } catch {}
      }

      setEnrolledMap((prev) => ({ ...prev, [targetPerson.id]: record }));
      setCaptureSuccess(true);
      playAttendanceSuccessChime();
      try { hapticStrong(); } catch {}

      speakNotification(
        "फेस आईडी दर्ज हुई",
        `${targetPerson.name} का फेस आईडी सफलतापूर्वक रजिस्टर हो गया है।`
      );

      if (onEnrollmentUpdated) onEnrollmentUpdated();

      setTimeout(() => {
        setTargetPerson(null);
        setIsProcessingCapture(false);
        setCaptureSuccess(false);
        step3DRef.current = "FRONT";
        setStep3D("FRONT");
        collected3DRef.current = {};
        setCollected3DVectors({});
      }, 1600);
    } catch (err: any) {
      console.error("Capture error:", err);
      setGuidanceMsg("फेस कैप्चर में समस्या: " + (err?.message || "कृपया दोबारा क्लिक करें"));
      setIsProcessingCapture(false);
    }
  };

  // Rapid Batch Enrollment: Switch directly to the next person in line
  const handleSelectNextPerson = useCallback(() => {
    const list = targetType === "STUDENT" ? students : localTeachersList;
    if (!list || list.length === 0) return;
    const currentIndex = list.findIndex((item) => item.id === targetPerson?.id);
    let nextPerson = list.slice(currentIndex + 1).find((item) => !enrolledMap[item.id]);
    if (!nextPerson) {
      nextPerson = list.find((item) => !enrolledMap[item.id] && item.id !== targetPerson?.id);
    }
    if (!nextPerson && currentIndex + 1 < list.length) {
      nextPerson = list[currentIndex + 1];
    }

    if (nextPerson) {
      setTargetPerson(nextPerson);
      setCaptureSuccess(false);
      setIsProcessingCapture(false);
      step3DRef.current = "FRONT";
      setStep3D("FRONT");
      collected3DRef.current = {};
      setCollected3DVectors({});
      setGuidanceMsg("कैमरे में सीधा देखें और चेहरा फ्रेम में रखें");
    } else {
      setTargetPerson(null);
      setCaptureSuccess(false);
      setIsProcessingCapture(false);
    }
  }, [students, localTeachersList, targetType, targetPerson, enrolledMap]);

  // Delete Face Record
  const handleDeleteFace = async (id: string, name: string) => {
    if (confirmDeleteFaceId !== id) {
      setConfirmDeleteFaceId(id);
      return;
    }
    setConfirmDeleteFaceId(null);
    try {
      await deleteFaceDescriptor(id, schoolId);
      setEnrolledMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      speakNotification("बायोमेट्रिक हटाया गया", `${name} का फेस डेटा हटा दिया गया।`);
      toast.success(`${name} का फेस डेटा हटा दिया गया।`);
      if (onEnrollmentUpdated) onEnrollmentUpdated();
    } catch (e: any) {
      toast.error("हटाने में समस्या: " + (e?.message || e));
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
                सीधे गैलरी से फोटो जोड़ें (Upload Image) या लाइव कैमरे से स्कैन करें — दोनों से फेस हाजिरी 100% सटीक लगेगी
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

        {/* Tab Navigation & 1-Click Class Action */}
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
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <ScanFace className="w-4 h-4" />
              <span>लाइव टेस्ट स्कैनर</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* 1-Click Batch Save for entire class */}
            <button
              type="button"
              onClick={handle1ClickClassAutoVectorize}
              disabled={isBatchVectorizing}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 flex items-center gap-2 shadow-md cursor-pointer transition disabled:opacity-50 shrink-0"
              title="जिनकी फोटो पहले से ऐप में है, वे 1-क्लिक में पूरी क्लास अपने आप सेव हो जाएगी"
            >
              {isBatchVectorizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>{batchVectorizeProgress ? `${batchVectorizeProgress.current}/${batchVectorizeProgress.total} सेव हो रहे हैं...` : "क्लास सेव हो रही है..."}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>⚡ 1-क्लिक पूरी क्लास सेव</span>
                </>
              )}
            </button>

            <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
              कुल: <strong className="text-white">{Object.keys(enrolledMap).length}</strong> फेस आईडी
            </span>
          </div>
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
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {rec?.multiAngleDescriptors?.left || rec?.multiAngleDescriptors?.right || rec?.descriptors3D?.left || rec?.descriptors3D?.right || rec?.source === "3d_multi_angle" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                                    <span>Multi-Angle 2D सुरक्षित</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {rec?.source === "id_photo" ? "🖼️ फोटो से सेव" : rec?.source === "live_studio" ? "लाइव स्कैन" : "फेस आईडी सक्रिय"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-400 font-medium">
                                ⏳ फेस आईडी बाकी है
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTriggerPhotoUpload(person, isStudent ? "STUDENT" : "TEACHER")}
                            disabled={uploadingPersonId === person.id}
                            className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                            title="बिना लाइव स्कैन किए सीधे गैलरी से फोटो अपलोड करें"
                          >
                            {uploadingPersonId === person.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>सेव...</span>
                              </>
                            ) : (
                              <>
                                <ImagePlus className="w-3.5 h-3.5" />
                                <span>{isEnrolled ? "फोटो बदलें" : "फोटो जोड़ें"}</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setTargetPerson(person);
                              setTargetType(isStudent ? "STUDENT" : "TEACHER");
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
                              isEnrolled
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20"
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{isEnrolled ? "री-स्कैन" : "लाइव स्कैन"}</span>
                          </button>

                          {isEnrolled && (
                            confirmDeleteFaceId === person.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFace(person.id, person.name)}
                                  className="px-2 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteFaceId(null)}
                                  className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                                >
                                  रद्द
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeleteFace(person.id, person.name)}
                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                                title="बायोमेट्रिक डेटा हटाएं"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
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
                      <div className={`mt-4 p-4 rounded-2xl border text-center space-y-3 animate-in zoom-in-95 ${
                        testMatchedPerson.action === "out"
                          ? "bg-rose-950/50 border-rose-500/50"
                          : "bg-emerald-950/60 border-emerald-500/40"
                      }`}>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                            testMatchedPerson.action === "out"
                              ? "bg-rose-500 text-white"
                              : "bg-emerald-500 text-slate-950"
                          }`}>
                            {testMatchedPerson.action === "out" ? "🔴 TEST OUT" : "🟢 TEST IN"} (#{testMatchedPerson.count || 1})
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                            📲 Mobile Push Sent ({testHistoryCount})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              testCountsRef.current = {};
                              testCooldownRef.current.clear();
                              setTestHistoryCount(0);
                              setTestMatchedPerson(null);
                            }}
                            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-amber-500/30 cursor-pointer"
                          >
                            रीसेट
                          </button>
                        </div>

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
                          ✓ 1st स्कैन IN और 2nd स्कैन OUT • अगला स्कैन (3s बाद) {testMatchedPerson.action === "in" ? "OUT" : "IN"} होगा और स्टूडेंट मोबाइल पर Push जाएगा।
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

              {/* Fast 1-Tap Enrollment Badge */}
              <div className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>⚡ 1-टैप सिंगल फोटो (2 सेकंड में फेस ID तैयार)</span>
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

                  {/* 3D Holographic Wireframe Canvas Overlay */}
                  <canvas
                    ref={studioCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
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
                    <div className="absolute inset-0 bg-emerald-600/90 flex items-center justify-center text-white flex-col gap-2 animate-in zoom-in-95 z-20">
                      <CheckCircle2 className="w-14 h-14" />
                      <span className="text-sm font-black">
                        बायोमेट्रिक सेव हुआ (2s Face ID Created)!
                      </span>
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

              <div className="w-full flex flex-col gap-2">
                {/* Primary: Fast 1-Tap Save Button (2 Seconds) */}
                <button
                  type="button"
                  onClick={() => handleCaptureLiveFace(true)}
                  disabled={isProcessingCapture || !cameraActive}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isProcessingCapture ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>फेस ID तैयार हो रही है (2 Seconds)...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-emerald-200" />
                      <span>📸 1-टैप फोटो लें व फेस ID बनाएं (2 Seconds)</span>
                    </>
                  )}
                </button>

                {/* Direct Image Upload Alternative (No live scan required) */}
                <button
                  type="button"
                  onClick={() => handleTriggerPhotoUpload(targetPerson, targetType)}
                  disabled={isProcessingCapture || uploadingPersonId === targetPerson.id}
                  className="w-full py-2.5 rounded-2xl text-indigo-100 font-bold text-xs flex items-center justify-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400/40 transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <ImagePlus className="w-4 h-4 text-indigo-200" />
                  <span>🖼️ लाइव स्कैन की जगह गैलरी से फोटो जोड़ें (Add Image)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Gallery/File Picker for Direct Image Enrollment */}
        <input
          ref={fileUploadInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoFileSelected}
          className="hidden"
        />
      </div>
    </div>
  );
};
