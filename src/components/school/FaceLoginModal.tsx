// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Loader2,
  User,
  Building2,
} from "lucide-react";
import {
  detectFacesInFrame,
  getSchoolFaceDescriptors,
  purgeDummyFaceDescriptors,
  playAttendanceSuccessChime,
  EyeBlinkDetector,
  FaceDescriptorRecord,
  enrollStudentFromPhotoUrl,
  getDeletedFaceIds,
  ARCFACE_MATCH_THRESHOLD,
  ARCFACE_MAX_DISTANCE,
  ARCFACE_MIN_SEPARATION_MARGIN,
  isActiveRosterPerson,
  loadFaceApiModels,
  initArcFaceEngine,
  isArcFaceReady,
  getArcFaceError,
  matchArcFace512,
} from "../../utils/faceRecognitionEngine";
import {
  getAllSchools,
  getLocalSchools,
  getActiveCloudStudents,
  isDemoRecord,
} from "../../school-firebase";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { hapticStrong } from "../../utils/haptic";
import type { School } from "../../school-types";

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
  schoolId = "",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMatchingRef = useRef(false);
  const schoolMapsRef = useRef<Record<string, Record<string, FaceDescriptorRecord>>>({});
  const schoolNameMapRef = useRef<Record<string, string>>({});

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [schoolsList, setSchoolsList] = useState<School[]>(() => {
    try {
      return getLocalSchools().filter(Boolean);
    } catch {
      return [];
    }
  });
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() => {
    if (schoolId) return schoolId;
    try {
      return localStorage.getItem("nst_active_school_id") || "ALL";
    } catch {
      return "ALL";
    }
  });

  const [enrolledMap, setEnrolledMap] = useState<Record<string, FaceDescriptorRecord>>({});
  const [loadingDescriptors, setLoadingDescriptors] = useState<boolean>(true);
  const [aiStatus, setAiStatus] = useState<"loading" | "ready" | "error">("loading");
  const [aiStatusText, setAiStatusText] = useState<string>("AI बायोमेट्रिक मॉडल लोड हो रहे हैं...");

  const [scanStatus, setScanStatus] = useState<
    | "searching"
    | "detected"
    | "waiting_blink"
    | "low_confidence"
    | "multi_face"
    | "too_dark"
    | "matched"
    | "error"
  >("searching");
  const [matchedStudentInfo, setMatchedStudentInfo] = useState<any>(null);
  const [candidateStudent, setCandidateStudent] = useState<any>(null);
  const [confidencePct, setConfidencePct] = useState<number>(0);
  const [blinkVerified, setBlinkVerified] = useState<boolean>(false);
  const blinkDetectorRef = useRef<EyeBlinkDetector>(new EyeBlinkDetector());

  useEffect(() => {
    if (schoolId) {
      setSelectedSchoolId(schoolId);
    }
  }, [schoolId]);

  // 1. Gather ONLY REAL active students across selected school(s) & ensure AI models + 512-D descriptors are ready
  const prepareFaceDatabase = useCallback(async () => {
    setLoadingDescriptors(true);
    setAiStatus("loading");
    setAiStatusText("AI बायोमेट्रिक मॉडल और स्कूल डेटा लोड हो रहा है...");

    try {
      // Load AI engines & schools list in parallel
      const [modelsOk, arcOk, fetchedSchools] = await Promise.all([
        loadFaceApiModels().catch(() => false),
        initArcFaceEngine().catch(() => false),
        getAllSchools().catch(() => getLocalSchools()),
      ]);

      const validSchools = (fetchedSchools || []).filter((s) => s && s.id);
      if (validSchools.length > 0) {
        setSchoolsList(validSchools);
        validSchools.forEach((s) => {
          schoolNameMapRef.current[s.id] = s.name || s.id;
        });
      }

      if (!modelsOk || !arcOk) {
        const errDetail = getArcFaceError();
        setAiStatus("error");
        setAiStatusText(
          errDetail
            ? `AI मॉडल लोड नहीं हो सके: ${errDetail}`
            : "512-D ArcFace AI मॉडल लोड करने में समस्या आई। इंटरनेट जांचें।"
        );
      } else {
        setAiStatus("ready");
        setAiStatusText("100% On-Device 512-D ArcFace AI तैयार");
      }

      // Determine target school IDs to scan
      let targetIds: string[] = [];
      if (schoolId) {
        targetIds = [schoolId];
      } else if (selectedSchoolId && selectedSchoolId !== "ALL") {
        targetIds = [selectedSchoolId];
      } else {
        const allIds = validSchools.map((s) => s.id);
        let activeFallback = "";
        try {
          activeFallback = localStorage.getItem("nst_active_school_id") || "";
        } catch {}
        targetIds = Array.from(new Set([...(activeFallback ? [activeFallback] : []), ...allIds])).filter(Boolean);
        if (targetIds.length === 0) {
          targetIds = ["dps_gurgaon_sector45"];
        }
      }

      const nextSchoolMaps: Record<string, Record<string, FaceDescriptorRecord>> = {};
      const mergedDisplayMap: Record<string, FaceDescriptorRecord> = {};
      const pendingPhotoEnrollQueue: Array<{ student: any; schId: string }> = [];

      await Promise.all(
        targetIds.map(async (sId) => {
          try {
            const [{ students: activeCloudStudents, cloudVerified, rawAllRecords }, rawDescMap] =
              await Promise.all([
                getActiveCloudStudents(sId),
                getSchoolFaceDescriptors(sId),
              ]);

            const activeRoster = (activeCloudStudents || []).filter((s: any) => {
              if (!s || !s.id) return false;
              const idLower = String(s.id).toLowerCase();
              if (idLower.startsWith("std-") || idLower.startsWith("demo_") || (s as any).isDemo || isDemoRecord(s)) {
                return false;
              }
              return isActiveRosterPerson(s);
            });

            const activeById = new Map<string, any>();
            activeRoster.forEach((s: any) => activeById.set(s.id, s));

            const deletedRosterIds = new Set<string>();
            (rawAllRecords || []).forEach((s: any) => {
              if (s?.id && !isActiveRosterPerson(s)) {
                deletedRosterIds.add(s.id);
              }
            });

            if (cloudVerified && activeRoster.length > 0) {
              await purgeDummyFaceDescriptors(sId, activeRoster.map((s: any) => s.id));
            }

            const schoolCleanMap: Record<string, FaceDescriptorRecord> = {};

            Object.keys(rawDescMap || {}).forEach((stId) => {
              const rec = rawDescMap[stId];
              if (!rec || !isActiveRosterPerson(rec)) return;
              if (deletedRosterIds.has(stId)) return;

              const idLower = String(stId).toLowerCase();
              const nameLower = (rec.name || "").toLowerCase().trim();
              if (idLower.startsWith("std-") || idLower.startsWith("demo_") || idLower.startsWith("dps-adm-")) return;
              if (nameLower === "aarav sharma" || nameLower === "ananya kumari" || nameLower === "riya choudhary") return;

              // If we got an authoritative cloud student roster for this school, ensure student still exists & is active!
              if (cloudVerified && !activeById.has(stId)) return;

              const rosterMatch = activeById.get(stId);
              const enrichedRec: any = {
                ...rec,
                schoolId: sId,
                schoolName: schoolNameMapRef.current[sId] || (rec as any).schoolName || "",
                name: rosterMatch?.name || rec.name,
                rollNo: rosterMatch?.rollNo || rec.rollNo,
                classId: rosterMatch?.classId || rec.classId,
                className: rosterMatch?.className || rec.className,
                admissionNo: rosterMatch?.admissionNo || (rec as any).admissionNo,
                phone: rosterMatch?.phone || (rec as any).phone,
                fatherName: rosterMatch?.fatherName || (rec as any).fatherName,
                motherName: rosterMatch?.motherName || (rec as any).motherName,
                monthlyFee: rosterMatch?.monthlyFee ?? (rec as any).monthlyFee,
                photoUrl: rosterMatch?.photoUrl || rec.photoUrl,
              };

              schoolCleanMap[stId] = enrichedRec;
              mergedDisplayMap[`${sId}__${stId}`] = enrichedRec;
            });

            nextSchoolMaps[sId] = schoolCleanMap;

            const deletedFaceIds = getDeletedFaceIds(sId);
            activeRoster.forEach((st: any) => {
              if (st.photoUrl && !schoolCleanMap[st.id] && !deletedFaceIds.has(st.id)) {
                pendingPhotoEnrollQueue.push({ student: st, schId: sId });
              }
            });
          } catch {}
        })
      );

      schoolMapsRef.current = nextSchoolMaps;
      setEnrolledMap(mergedDisplayMap);
      setLoadingDescriptors(false);

      // Background auto-enroll active students who have a profile photoUrl but no 512-D descriptor yet
      if (pendingPhotoEnrollQueue.length > 0 && modelsOk && arcOk) {
        for (const item of pendingPhotoEnrollQueue.slice(0, 12)) {
          try {
            const st = item.student;
            const sId = item.schId;
            const rec = await enrollStudentFromPhotoUrl({
              id: st.id,
              schoolId: sId,
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
              const enrichedRec: any = {
                ...rec,
                schoolId: sId,
                schoolName: schoolNameMapRef.current[sId] || "",
                admissionNo: st.admissionNo,
                phone: st.phone,
                fatherName: st.fatherName,
                motherName: st.motherName,
                monthlyFee: st.monthlyFee,
              };
              if (!schoolMapsRef.current[sId]) schoolMapsRef.current[sId] = {};
              schoolMapsRef.current[sId][st.id] = enrichedRec;
              setEnrolledMap((prev) => ({
                ...prev,
                [`${sId}__${st.id}`]: enrichedRec,
              }));
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[FaceLoginModal] Prepare descriptors error:", e);
      setLoadingDescriptors(false);
    }
  }, [schoolId, selectedSchoolId]);

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
  const completeLogin = useCallback(
    (matched: any) => {
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
        `नमस्ते ${matched.name}! आपका फेस लॉगिन सत्यापित हो गया है।`
      );

      setTimeout(() => {
        stopCamera();
        onStudentMatched(matched);
      }, 850);
    },
    [stopCamera, onStudentMatched]
  );

  // 3. Continuous Face Detection & Recognition Loop (180ms throttle for reliable eye blink capture)
  useEffect(() => {
    if (!isOpen || isMatchingRef.current) return;

    let animId: number;
    let lastScanTime = 0;

    const scanFrame = async (timestamp: number) => {
      if (!isOpen || isMatchingRef.current) return;

      if (
        timestamp - lastScanTime >= 180 &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        !loadingDescriptors
      ) {
        lastScanTime = timestamp;

        try {
          const video = videoRef.current;
          const schoolEntries = Object.entries(schoolMapsRef.current).filter(
            ([, map]) => map && Object.keys(map).length > 0
          );
          const singleSchoolMode = schoolEntries.length === 1;
          const singleSchId = singleSchoolMode ? schoolEntries[0][0] : "";
          const singleSchMap = singleSchoolMode ? schoolEntries[0][1] : {};

          const detectedBoxes = await detectFacesInFrame(
            video,
            singleSchMap,
            singleSchoolMode ? { schoolId: singleSchId } : undefined
          );

          if (detectedBoxes.length > 1 || detectedBoxes[0]?.multiFaceBlocked) {
            setCandidateStudent(null);
            setScanStatus("multi_face");
          } else if (detectedBoxes.length > 0) {
            const primaryBox = detectedBoxes[0];

            if (primaryBox.lighting?.isTooDark) {
              setCandidateStudent(null);
              setScanStatus("too_dark");
              animId = requestAnimationFrame(scanFrame);
              return;
            }

            // Pass 68-point facial landmarks into EyeBlinkDetector!
            const blinkState = blinkDetectorRef.current.update(
              video,
              primaryBox,
              primaryBox.landmarks
            );
            const hasBlinked =
              blinkState.blinkDetected || blinkDetectorRef.current.hasBlinkedRecently(4000);
            if (hasBlinked) {
              setBlinkVerified(true);
            }

            let matched: any = null;
            let matchedSchoolId = singleSchId;

            if (singleSchoolMode && primaryBox.matchedStudent) {
              matched = primaryBox.matchedStudent;
              const fullRec = singleSchMap[matched.studentId];
              if (fullRec) {
                matched = {
                  ...fullRec,
                  ...matched,
                  schoolId: fullRec.schoolId || singleSchId,
                  schoolName: schoolNameMapRef.current[singleSchId] || (fullRec as any).schoolName || "",
                };
              }
            } else if (
              !singleSchoolMode &&
              primaryBox.arcfaceDescriptor &&
              primaryBox.arcfaceDescriptor.length === 512 &&
              schoolEntries.length > 0
            ) {
              // Multi-school auto scan using strict isolated matchArcFace512 per school
              const candidatesAcrossSchools: Array<{ res: any; schId: string }> = [];
              for (const [schId, schMap] of schoolEntries) {
                const res = matchArcFace512(
                  primaryBox.arcfaceDescriptor,
                  schMap,
                  ARCFACE_MATCH_THRESHOLD,
                  ARCFACE_MIN_SEPARATION_MARGIN,
                  {
                    schoolId: schId,
                    isLowLight: primaryBox.lighting?.isLowLight,
                    isTooDark: primaryBox.lighting?.isTooDark,
                  }
                );
                if (res && !res.isAmbiguous) {
                  candidatesAcrossSchools.push({ res, schId });
                }
              }
              if (candidatesAcrossSchools.length > 0) {
                candidatesAcrossSchools.sort((a, b) => b.res.similarity - a.res.similarity);
                const top1 = candidatesAcrossSchools[0];
                const top2 = candidatesAcrossSchools[1];
                const crossSchoolMarginOk =
                  !top2 ||
                  top1.res.student.studentId === top2.res.student.studentId ||
                  top1.res.similarity - top2.res.similarity >= ARCFACE_MIN_SEPARATION_MARGIN;
                if (crossSchoolMarginOk) {
                  matchedSchoolId = top1.schId;
                  matched = {
                    ...top1.res.student,
                    studentId: top1.res.student.studentId,
                    name: top1.res.student.name,
                    rollNo: top1.res.student.rollNo,
                    classId: top1.res.student.classId,
                    className: top1.res.student.className,
                    photoUrl: top1.res.student.photoUrl,
                    similarityPercent: top1.res.similarityPercent,
                    similarity: top1.res.similarity,
                    distance: top1.res.distance,
                    schoolId: matchedSchoolId,
                    schoolName:
                      schoolNameMapRef.current[matchedSchoolId] ||
                      top1.res.student.schoolName ||
                      "",
                  };
                }
              }
            }

            if (matched) {
              setCandidateStudent(matched);
              setConfidencePct(matched.similarityPercent || 0);

              const simVal = matched.similarity ?? (matched.similarityPercent || 0) / 100;
              if (
                (primaryBox.isArcFaceActive || isArcFaceReady()) &&
                simVal >= ARCFACE_MATCH_THRESHOLD &&
                (matched.distance === undefined || matched.distance <= ARCFACE_MAX_DISTANCE)
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

  const enrolledCount = Object.keys(enrolledMap).length;

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

        {/* School Filter Bar when launched from Login Screen with multiple schools */}
        {!schoolId && schoolsList.length > 0 && (
          <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold shrink-0">
              <Building2 size={14} className="text-emerald-400" />
              स्कूल:
            </span>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 truncate cursor-pointer"
            >
              <option value="ALL">सभी स्कूल (Auto Detect All)</option>
              {schoolsList.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.name} {sch.code ? `(${sch.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

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
            <div
              className={`w-52 h-64 sm:w-60 sm:h-72 rounded-[48%] border-2 transition-all duration-300 relative ${
                scanStatus === "matched"
                  ? "border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.7)] ring-4 ring-emerald-500/50"
                  : scanStatus === "waiting_blink"
                  ? "border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.7)] ring-4 ring-cyan-500/40 animate-pulse"
                  : scanStatus === "low_confidence" || scanStatus === "multi_face" || scanStatus === "too_dark"
                  ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-2 ring-amber-500/30"
                  : scanStatus === "detected"
                  ? "border-blue-400/80 shadow-[0_0_20px_rgba(96,165,250,0.3)] ring-2 ring-blue-500/30"
                  : "border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
              }`}
            >
              <div className="absolute -top-2 -left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-2 -right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {scanStatus !== "matched" && (
                <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2.5s_infinite]" />
              )}
            </div>

            {/* Status Floating Pill */}
            <div className="mt-4 z-10 px-4 text-center">
              {loadingDescriptors || aiStatus === "loading" ? (
                <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md">
                  <Loader2 size={14} className="animate-spin" />
                  <span>AI इंजन और फेस डेटा लोड हो रहा है...</span>
                </div>
              ) : scanStatus === "matched" && matchedStudentInfo ? (
                <div className="px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-xl animate-bounce">
                  <CheckCircle2 size={16} /> पहचान सत्यापित ({confidencePct.toFixed(1)}%) • लॉगिन हो रहा है ✅
                </div>
              ) : scanStatus === "waiting_blink" && candidateStudent ? (
                <div className="px-4 py-2 rounded-2xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-bold text-xs flex flex-col items-center gap-1 backdrop-blur-md shadow-2xl animate-pulse">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-black">
                    <span className="text-base">👁️</span>
                    <span>
                      {candidateStudent.name} ({confidencePct.toFixed(1)}% Match)
                    </span>
                  </div>
                  <span className="text-[11px] text-cyan-100 font-medium">
                    कृपया 1 बार अपनी आँखें झपकाएँ (Blink to login)
                  </span>
                </div>
              ) : scanStatus === "multi_face" ? (
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500/95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg">
                  <AlertTriangle size={14} /> एक समय में केवल 1 व्यक्ति कैमरे के सामने रहें
                </div>
              ) : scanStatus === "too_dark" ? (
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500/95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg">
                  <AlertTriangle size={14} /> बहुत अंधेरा है — कृपया रोशनी में आएं
                </div>
              ) : scanStatus === "low_confidence" && candidateStudent ? (
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500/90 text-slate-950 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                  <AlertTriangle size={14} /> पहचान मैच कम है ({confidencePct.toFixed(1)}%) • सीधे कैमरे में देखें
                </div>
              ) : scanStatus === "detected" ? (
                <div className="px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                  <Loader2 size={14} className="animate-spin" />
                  {enrolledCount === 0
                    ? "कोई रजिस्टर्ड फेस नहीं मिला"
                    : "चेहरा मिला • 512-D AI मिलान जारी है..."}
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

        {/* Footer / Recognition Card */}
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
                    {matchedStudentInfo.className || "Student"} • Roll #{matchedStudentInfo.rollNo || "01"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {matchedStudentInfo.schoolName ? `${matchedStudentInfo.schoolName} • ` : ""}
                    लॉगिन हो रहा है...
                  </p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-emerald-500 text-slate-950">
                <Loader2 size={18} className="animate-spin" />
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck
                    size={14}
                    className={aiStatus === "error" ? "text-amber-400" : "text-emerald-400"}
                  />
                  <span className="truncate max-w-[230px]">{aiStatusText}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {loadingDescriptors ? "Loading..." : `${enrolledCount} Faces`}
                </span>
              </div>

              {!loadingDescriptors && enrolledCount === 0 && (
                <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    इस स्कूल में अभी कोई Face ID सेव नहीं है। पहले Student Portal में{" "}
                    <strong>"अपडेट फेस आईडी"</strong> या Admin <strong>Face ID Studio</strong> से
                    चेहरा रजिस्टर करें।
                  </span>
                </div>
              )}

              {/* Accessibility Blink Confirmation — ONLY shown after real biometric face match */}
              {scanStatus === "waiting_blink" && candidateStudent && (
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between gap-2">
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-cyan-200">
                      {candidateStudent.name} ({confidencePct.toFixed(0)}% Match)
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
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 active:scale-95 transition cursor-pointer shrink-0"
                  >
                    <span>👁️ पलक झपकी (Confirm)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
