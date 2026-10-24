// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import jsQR from "jsqr";
import {
  X, Camera, RefreshCw, Zap, ZapOff, CheckCircle2, AlertCircle,
  Upload, UserCheck, ShieldCheck, Sparkles, School, Volume2, ArrowRight,
  Clock, ZoomIn, Image as ImageIcon, FolderOpen, FileCheck2, Smartphone
} from "lucide-react";
import { markStudentQrAttendance, todayStr, getStudents } from "../../school-firebase";
import { playSoundCorrect, playSoundWrong } from "../../utils/soundEffects";
import { hapticStrong, hapticMedium } from "../../utils/haptic";

export interface QrAttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If a student is self-scanning class attendance QR:
  currentStudent?: {
    id: string;
    name: string;
    rollNo?: string;
    classId?: string;
    className?: string;
    schoolId?: string;
    schoolName?: string;
  };
  // If a teacher/admin is scanning student ID cards:
  isTeacherMode?: boolean;
  targetSchoolId?: string;
  targetClassId?: string;
  targetClassName?: string;
  teacherId?: string;
  onStudentMarked?: (student: { id: string; name: string; rollNo?: string }) => void;
}

/**
 * Universal attendance payload parser:
 * Parses:
 * 1. Compact URL with ?v=id&s=...&u=...&r=...&c=...&n=...
 * 2. Hash token #NSTA-SCHOOL:schoolId:studentId:rollNo:classId
 * 3. Class QR token #NSTA-ATTENDANCE:schoolId:classId:date
 * 4. Legacy URL with ?data= param (JSON encoded document)
 * 5. Direct URL params (?studentId=, ?roll=, ?schoolId=)
 * 6. Raw JSON
 * 7. Raw student ID
 */
function parseDecodedAttendanceString(
  rawText: string,
  defaultSchoolId?: string,
  defaultClassId?: string,
  defaultClassName?: string
) {
  let text = (rawText || "").trim();
  const today = todayStr();

  let studentId = "";
  let studentName = "";
  let rollNo = "";
  let schoolId = defaultSchoolId || "";
  let classId = defaultClassId || "";
  let className = defaultClassName || "";
  let qrDate = today;
  let isClassQr = false;
  const decodeTokenPart = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  // Case 1: URL with query parameters or hash
  if (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.includes("?v=") ||
    text.includes("?verify=") ||
    text.includes("data=") ||
    text.includes("studentId=") ||
    text.includes("uid=") ||
    text.includes("#NSTA-")
  ) {
    try {
      const url = new URL(text.startsWith("http") ? text : `https://nsta.app/${text.replace(/^\//, "")}`);

      // 1A. Direct compact query parameters: ?v=id&s=...&u=...&r=...&c=...&n=...
      const uParam = url.searchParams.get("u") || url.searchParams.get("uid") || url.searchParams.get("studentId");
      const sParam = url.searchParams.get("s") || url.searchParams.get("sid") || url.searchParams.get("schoolId");
      const rParam = url.searchParams.get("r") || url.searchParams.get("roll") || url.searchParams.get("rollNo");
      const cParam = url.searchParams.get("c") || url.searchParams.get("cid") || url.searchParams.get("classId");
      const nParam = url.searchParams.get("n") || url.searchParams.get("name") || url.searchParams.get("studentName");

      if (uParam) studentId = uParam;
      if (sParam) schoolId = sParam;
      if (rParam) rollNo = rParam;
      if (cParam) classId = cParam;
      if (nParam) {
        try {
          studentName = decodeURIComponent(nParam);
        } catch {
          studentName = nParam;
        }
      }

      // 1B. Check if ?data= contains URL-encoded JSON
      const dataParam = url.searchParams.get("data");
      if (dataParam && !studentId) {
        try {
          const parsed = JSON.parse(decodeURIComponent(dataParam));
          if (parsed && typeof parsed === "object") {
            if (parsed.type === "NSTA_ATTENDANCE_QR") {
              isClassQr = true;
              schoolId = parsed.schoolId || schoolId;
              classId = parsed.classId || classId;
              className = parsed.className || className;
              qrDate = parsed.date || today;
            } else {
              studentId = parsed.id || parsed.studentId || "";
              studentName = parsed.student || parsed.name || parsed.studentName || "";
              rollNo = parsed.roll || parsed.rollNo || "";
              schoolId = parsed.schoolId || schoolId;
              classId = parsed.classId || classId;
              className = parsed.class || parsed.className || className;
            }
          }
        } catch {}
      }

      // 1C. Hash token #NSTA-SCHOOL:schoolId:studentId:rollNo:classId
      if (url.hash && url.hash.includes("NSTA-SCHOOL:")) {
        const token = url.hash.split("NSTA-SCHOOL:")[1];
        const parts = token.split(":");
        if (parts[0] && !schoolId) schoolId = decodeTokenPart(parts[0]);
        if (parts[1] && !studentId) studentId = decodeTokenPart(parts[1]);
        if (parts[2] && !rollNo) rollNo = decodeTokenPart(parts[2]);
        if (parts[3] && !classId) classId = decodeTokenPart(parts[3]);
      }

      // 1D. Hash token #NSTA-ATTENDANCE:schoolId:classId:date
      if (url.hash && url.hash.includes("NSTA-ATTENDANCE:")) {
        isClassQr = true;
        const token = url.hash.split("NSTA-ATTENDANCE:")[1];
        const parts = token.split(":");
        if (parts[0]) schoolId = parts[0];
        if (parts[1]) classId = parts[1];
        if (parts[2]) qrDate = parts[2];
      }
    } catch {}
  }

  // Case 2: Standalone NSTA-SCHOOL token
  if (!studentId && text.includes("NSTA-SCHOOL:")) {
    const token = text.split("NSTA-SCHOOL:")[1];
    const parts = token.split(":");
    if (parts[0] && !schoolId) schoolId = decodeTokenPart(parts[0]);
    if (parts[1] && !studentId) studentId = decodeTokenPart(parts[1]);
    if (parts[2] && !rollNo) rollNo = decodeTokenPart(parts[2]);
    if (parts[3] && !classId) classId = decodeTokenPart(parts[3]);
  }

  // Case 3: Standalone NSTA-ATTENDANCE token
  if (text.includes("NSTA-ATTENDANCE:")) {
    isClassQr = true;
    const parts = text.split("NSTA-ATTENDANCE:")[1].split(":");
    if (parts[0]) schoolId = parts[0];
    if (parts[1]) classId = parts[1];
    if (parts[2]) qrDate = parts[2] || today;
  }

  // Case 4: Raw JSON String
  if (!studentId && !isClassQr && text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        if (parsed.type === "NSTA_ATTENDANCE_QR") {
          isClassQr = true;
          schoolId = parsed.schoolId || schoolId;
          classId = parsed.classId || classId;
          className = parsed.className || className;
          qrDate = parsed.date || today;
        } else {
          studentId = parsed.id || parsed.studentId || "";
          studentName = parsed.name || parsed.student || parsed.studentName || "";
          rollNo = parsed.rollNo || parsed.roll || "";
          schoolId = parsed.schoolId || schoolId;
          classId = parsed.classId || classId;
          className = parsed.className || parsed.class || className;
        }
      }
    } catch {}
  }

  // Case 5: Raw identifier string
  if (!studentId && !isClassQr && text.length > 0 && text.length < 60 && !text.includes("http")) {
    studentId = text;
    studentName = `Student (${text.slice(0, 8)})`;
  }

  return {
    studentId,
    studentName,
    rollNo,
    schoolId,
    classId,
    className,
    qrDate,
    isClassQr,
  };
}

/**
 * Loads an image File into an HTMLImageElement safely
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image render nahi ho saki."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates an in-memory canvas scaled to a maximum dimension
 */
function renderImageToCanvas(img: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDimension || h > maxDimension) {
    if (w > h) {
      h = Math.round((h * maxDimension) / w);
      w = maxDimension;
    } else {
      w = Math.round((w * maxDimension) / h);
      h = maxDimension;
    }
  }
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * Multi-pass media decoder for full-size phone photos and compressed screenshots.
 */
async function decodeQrFromImageFile(file: File): Promise<string> {
  const decodeTask = async (): Promise<string> => {
    // Stage 1: Load image in memory
    const img = await loadImageFromFile(file);

    // Preserve enough detail for a QR occupying only a small part of a phone photo.
    const primaryCanvas = renderImageToCanvas(img, 1800);
    const primaryCtx = primaryCanvas.getContext("2d", { willReadFrequently: true });

    // Method 1: Hardware BarcodeDetector on Android / Chrome if available
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const barcodes = await detector.detect(primaryCanvas);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue.trim();
        }
      } catch (e) {
        // Fallback to pure JS
      }
    }

    // Method 2: jsQR on primary canvas (Standard pass - runs in <20ms)
    if (primaryCtx) {
      try {
        const imgData = primaryCtx.getImageData(0, 0, primaryCanvas.width, primaryCanvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code && code.data && code.data.trim().length > 0) {
          return code.data.trim();
        }
      } catch (e) {
        console.warn("[jsQR pass 1]:", e);
      }
    }

    // Method 3: Otsu thresholding adapts to the brightness and contrast of each photo.
    if (primaryCtx) {
      try {
        const imgData = primaryCtx.getImageData(0, 0, primaryCanvas.width, primaryCanvas.height);
        const pixelCount = imgData.width * imgData.height;
        const grayscale = new Uint8Array(pixelCount);
        const histogram = new Uint32Array(256);
        for (let pixel = 0, offset = 0; pixel < pixelCount; pixel++, offset += 4) {
          const value = Math.round(
            imgData.data[offset] * 0.299 +
            imgData.data[offset + 1] * 0.587 +
            imgData.data[offset + 2] * 0.114
          );
          grayscale[pixel] = value;
          histogram[value]++;
        }

        let weightedTotal = 0;
        for (let value = 0; value < histogram.length; value++) {
          weightedTotal += value * histogram[value];
        }
        let backgroundWeight = 0;
        let backgroundSum = 0;
        let bestVariance = -1;
        let threshold = 127;
        for (let value = 0; value < histogram.length; value++) {
          backgroundWeight += histogram[value];
          if (backgroundWeight === 0) continue;
          const foregroundWeight = pixelCount - backgroundWeight;
          if (foregroundWeight === 0) break;
          backgroundSum += value * histogram[value];
          const backgroundMean = backgroundSum / backgroundWeight;
          const foregroundMean = (weightedTotal - backgroundSum) / foregroundWeight;
          const variance = backgroundWeight * foregroundWeight *
            (backgroundMean - foregroundMean) ** 2;
          if (variance > bestVariance) {
            bestVariance = variance;
            threshold = value;
          }
        }

        const binaryPixels = new Uint8ClampedArray(pixelCount * 4);
        for (let pixel = 0, offset = 0; pixel < pixelCount; pixel++, offset += 4) {
          const value = grayscale[pixel] > threshold ? 255 : 0;
          binaryPixels[offset] = value;
          binaryPixels[offset + 1] = value;
          binaryPixels[offset + 2] = value;
          binaryPixels[offset + 3] = 255;
        }
        const code = jsQR(binaryPixels, primaryCanvas.width, primaryCanvas.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code && code.data && code.data.trim().length > 0) {
          return code.data.trim();
        }
      } catch (e) {
        console.warn("[jsQR binarized pass]:", e);
      }
    }

    // Method 4: Try a smaller image scale as a fallback for noisy/compressed photos.
    try {
      const altCanvas = renderImageToCanvas(img, 960);
      const altCtx = altCanvas.getContext("2d", { willReadFrequently: true });
      if (altCtx) {
        const altData = altCtx.getImageData(0, 0, altCanvas.width, altCanvas.height);
        const code = jsQR(altData.data, altData.width, altData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code && code.data && code.data.trim().length > 0) {
          return code.data.trim();
        }
      }
    } catch {}

    // Method 5: Html5Qrcode fallback (Offscreen container with showImage = false)
    try {
      const tempMountId = "media-qr-scanner-offscreen";
      let tempDiv = document.getElementById(tempMountId);
      if (!tempDiv) {
        tempDiv = document.createElement("div");
        tempDiv.id = tempMountId;
        tempDiv.style.position = "fixed";
        tempDiv.style.left = "-9999px";
        tempDiv.style.top = "-9999px";
        tempDiv.style.width = "300px";
        tempDiv.style.height = "300px";
        tempDiv.style.opacity = "0";
        tempDiv.style.pointerEvents = "none";
        document.body.appendChild(tempDiv);
      }

      const html5Qr = new Html5Qrcode(tempMountId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      // Pass showImage = false so it never touches DOM rendering.
      const scanPromise = html5Qr.scanFile(file, false);
      let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
      const timeoutSub = new Promise<never>((_, reject) => {
        fallbackTimer = setTimeout(() => reject(new Error("QR fallback timeout")), 3000);
      });
      let res: string;
      try {
        res = await Promise.race([scanPromise, timeoutSub]);
      } finally {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        try { await html5Qr.clear(); } catch {}
      }
      if (res && res.trim()) return res.trim();
    } catch {}

    throw new Error("Is photo me saaf QR code nahi mila. Kripya QR code ko thoda seedha aur paas se khinch kar photo upload karein.");
  };

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Scan timeout: Photo process hone mein zyada waqt laga. QR code ko crop karke dobara upload karein."));
    }, 10000);
  });
  try {
    return await Promise.race([decodeTask(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const QrAttendanceScannerModal: React.FC<QrAttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  isTeacherMode = false,
  targetSchoolId,
  targetClassId,
  targetClassName,
  teacherId,
  onStudentMarked,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaTabFileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const lastCameraDecodedTextRef = useRef<string | null>(null);
  const cameraDecodeReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active Scan Mode: Live Camera vs Media / Gallery
  const [activeTab, setActiveTab] = useState<"camera" | "media">("camera");

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [processing, setProcessing] = useState(false);
  const [continuousCount, setContinuousCount] = useState(0);

  // Media / Gallery State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaScanning, setMediaScanning] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Attendance Mode
  const [scanMode, setScanMode] = useState<"auto" | "in" | "out">("auto");
  const [cutoffTime, setCutoffTime] = useState("08:30");

  // Recent Punches Feed (Live Feed)
  const [recentPunches, setRecentPunches] = useState<Array<{
    id: string;
    name: string;
    rollNo?: string;
    action: "in" | "out";
    time: string;
    duration?: string;
    isLate?: boolean;
    source?: "camera" | "media";
  }>>([]);

  // Result Banner
  const [lastScannedResult, setLastScannedResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    action?: "in" | "out";
    inTime?: string;
    outTime?: string;
    stayDuration?: string;
    isLate?: boolean;
    name?: string;
    rollNo?: string;
    className?: string;
    date?: string;
    timestamp?: string;
    source?: "camera" | "media";
  } | null>(null);

  // Auto-dismiss success notification banner in teacher mode so camera keeps scanning
  useEffect(() => {
    if (lastScannedResult && isTeacherMode && lastScannedResult.success && activeTab === "camera") {
      const timer = setTimeout(() => {
        setLastScannedResult(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [lastScannedResult, isTeacherMode, activeTab]);

  // Stop camera stream safely
  const stopScanner = useCallback(async () => {
    if (cameraDecodeReleaseTimerRef.current) {
      clearTimeout(cameraDecodeReleaseTimerRef.current);
      cameraDecodeReleaseTimerRef.current = null;
    }
    lastCameraDecodedTextRef.current = null;
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("[QR Scanner] Stop/clear warning:", e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Handle scanned raw string (works for both Camera and Media Gallery)
  const processAttendanceData = useCallback(async (rawText: string, source: "camera" | "media" = "camera") => {
    // QR callbacks can fire several times before React has rendered the updated state.
    // Use a ref so only one attendance write can be in flight at a time.
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    try {
      const parsed = parseDecodedAttendanceString(
        rawText,
        targetSchoolId || currentStudent?.schoolId,
        targetClassId || currentStudent?.classId,
        targetClassName || currentStudent?.className
      );

      const today = todayStr();

      // ==========================================
      // SCENARIO A: TEACHER / ADMIN MODE (Scanning Student IDs)
      // ==========================================
      if (isTeacherMode) {
        let studentId = parsed.studentId;
        let studentName = parsed.studentName || "";
        let rollNo = parsed.rollNo || "";
        let schoolId = parsed.schoolId || targetSchoolId || "";
        let classId = parsed.classId || targetClassId || "";

        if (!studentId) {
          throw new Error("Student ID detect nahi hua. Kripya valid student ID card ka QR image/code use karein.");
        }

        if (!schoolId) {
          throw new Error("School ID missing hai. Kripya valid school card use karein.");
        }

        if (!classId) {
          classId = targetClassId || "class_general";
        }

        // If studentName is missing or generic, fetch actual student profile
        if (!studentName || studentName === "Student" || studentName.startsWith("Student (")) {
          try {
            const classStudents = await getStudents(schoolId, classId);
            const found = classStudents.find(s => s.id === studentId || (rollNo && s.rollNo === rollNo));
            if (found) {
              studentName = found.name;
              if (!rollNo) rollNo = found.rollNo;
            }
          } catch {}
        }
        if (!studentName) studentName = "Student";

        const res = await markStudentQrAttendance({
          schoolId,
          classId,
          studentId,
          studentName,
          rollNo,
          date: today,
          markedBy: source === "media" ? "TEACHER_MEDIA_QR_SCAN" : (teacherId || "TEACHER_QR_SCAN"),
          scanMode,
          cutoffTime,
        });

        if (res.success) {
          playSoundCorrect();
          hapticStrong();
          setContinuousCount(c => c + 1);

          const punchTime = res.action === "in" ? (res.inTime || "") : (res.outTime || "");
          const isLate = res.isLate;

          const title = res.action === "in"
            ? (isLate ? "⚠️ Late Entry (Haziri Lag Gayi)" : "✅ Haziri (Punch-In) Recorded!")
            : "🚪 Exit (Punch-Out) Recorded!";

          const message = res.action === "in"
            ? `${studentName} ${rollNo ? `(Roll: #${rollNo})` : ""} — Entry: ${res.inTime}${isLate ? " (Cutoff ke baad Late)" : ""}${source === "media" ? " • [Media Scan]" : ""}`
            : `${studentName} — Exit: ${res.outTime} • Total Stay: ${res.stayDuration || "Recorded"}${source === "media" ? " • [Media Scan]" : ""}`;

          setLastScannedResult({
            success: true,
            title,
            message,
            action: res.action,
            inTime: res.inTime,
            outTime: res.outTime,
            stayDuration: res.stayDuration,
            isLate: res.isLate,
            name: studentName,
            rollNo,
            date: today,
            timestamp: punchTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
            source,
          });

          // Add to recent punches live stream
          setRecentPunches(prev => [
            {
              id: `${studentId}_${Date.now()}`,
              name: studentName,
              rollNo,
              action: res.action,
              time: punchTime,
              duration: res.stayDuration,
              isLate: res.isLate,
              source,
            },
            ...prev.slice(0, 19)
          ]);

          onStudentMarked?.({ id: studentId, name: studentName, rollNo });
        } else {
          throw new Error(res.message);
        }

      } else {
        // ==========================================
        // SCENARIO B: STUDENT MODE (Scanning Class Attendance QR)
        // ==========================================
        let schoolId = currentStudent?.schoolId || parsed.schoolId || "";
        let classId = currentStudent?.classId || parsed.classId || "";
        let className = currentStudent?.className || targetClassName || parsed.className || "Class";
        let qrDate = parsed.qrDate || today;

        if (!currentStudent?.id) {
          throw new Error("Student profile detect nahi hui. Kripya login check karein.");
        }

        if (!parsed.isClassQr && !parsed.schoolId) {
          throw new Error("Ye official Class Attendance QR code nahi hai. Kripya Smart Board ya Teacher ka QR scan karein.");
        }

        const res = await markStudentQrAttendance({
          schoolId,
          classId,
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          rollNo: currentStudent.rollNo || "",
          date: qrDate,
          markedBy: source === "media" ? "STUDENT_MEDIA_QR" : "STUDENT_SELF_QR",
          scanMode,
          cutoffTime,
        });

        if (res.success) {
          playSoundCorrect();
          hapticStrong();
          const punchTime = res.action === "in" ? (res.inTime || "") : (res.outTime || "");
          setLastScannedResult({
            success: true,
            title: res.action === "in" ? "Haziri Safalta se Darj! ✅" : "School Exit Safalta se Darj! 🚪",
            message: res.action === "in"
              ? `${currentStudent.name}, Entry (${res.inTime}) darj ho gayi.`
              : `${currentStudent.name}, Exit (${res.outTime}) darj ho gaya. Total Stay: ${res.stayDuration || "Completed"}`,
            action: res.action,
            inTime: res.inTime,
            outTime: res.outTime,
            stayDuration: res.stayDuration,
            isLate: res.isLate,
            name: currentStudent.name,
            rollNo: currentStudent.rollNo,
            className,
            date: qrDate,
            timestamp: punchTime,
            source,
          });
        } else {
          throw new Error(res.message);
        }
      }

    } catch (err: any) {
      playSoundWrong();
      hapticMedium();
      console.warn("[QR Attendance Error]:", err);
      setLastScannedResult({
        success: false,
        title: "Scan Fail Ho Gaya",
        message: err?.message || "Valid Attendance QR code detect nahi hua. Kripya image saaf aur seedhi upload karein.",
        source,
      });
      if (source === "media") {
        setMediaError(err?.message || "Is image me valid QR code nahi mila.");
      }
    } finally {
      processingRef.current = false;
      setProcessing(false);
      setMediaScanning(false);
    }
  }, [isTeacherMode, targetSchoolId, targetClassId, targetClassName, teacherId, currentStudent, scanMode, cutoffTime, onStudentMarked]);

  // Start the camera scanner with optimized autofocus and hardware acceleration
  const startScanner = useCallback(async (facing: "environment" | "user") => {
    setCameraError(null);
    setLastScannedResult(null);

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      // Initialize Html5Qrcode strictly for QR_CODE to maximize detection speed
      const scanner = new Html5Qrcode(containerId.current, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Native hardware C++ BarcodeDetector on Android Chrome
        },
      });

      scannerRef.current = scanner;

      const cameraConfig = {
        facingMode: facing,
      };

      await scanner.start(
        cameraConfig,
        {
          fps: 25, // 25 fps for instantaneous frame capture
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.75);
            return {
              width: Math.max(edge, 230),
              height: Math.max(edge, 230),
            };
          },
          aspectRatio: undefined,
          disableFlip: false,
        },
        (decodedText) => {
          if (cameraDecodeReleaseTimerRef.current) {
            clearTimeout(cameraDecodeReleaseTimerRef.current);
            cameraDecodeReleaseTimerRef.current = null;
          }
          if (processingRef.current) return;
          // A code remains in front of the camera for multiple frames. Process it
          // once until it has been absent for a short period, preventing an
          // accidental immediate punch-out after a successful punch-in.
          if (lastCameraDecodedTextRef.current === decodedText) return;
          lastCameraDecodedTextRef.current = decodedText;
          processAttendanceData(decodedText, "camera");
        },
        () => {
          if (lastCameraDecodedTextRef.current) {
            if (cameraDecodeReleaseTimerRef.current) {
              clearTimeout(cameraDecodeReleaseTimerRef.current);
            }
            cameraDecodeReleaseTimerRef.current = setTimeout(() => {
              lastCameraDecodedTextRef.current = null;
              cameraDecodeReleaseTimerRef.current = null;
            }, 1800);
          }
        }
      );

      setCameraActive(true);

      // Inspect camera capabilities (torch, zoom)
      try {
        const capabilities = scanner.getRunningTrackCapabilities?.();
        if (capabilities) {
          if ('torch' in capabilities) {
            setHasTorch(true);
          }
          if ('zoom' in capabilities && typeof capabilities.zoom === 'object') {
            const zMax = (capabilities.zoom as any).max || 1;
            setMaxZoom(zMax);
          }
        }
      } catch {}

    } catch (err: any) {
      console.error("[QR Scanner] Camera Start Error:", err);
      setCameraActive(false);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied hai. Kripya browser me Camera permission allow karein ya Media / Gallery se photo upload karein."
          : "Camera shuru nahi ho paya. Kripya permissions check karein ya Media / Gallery se QR scan karein."
      );
    }
  }, [stopScanner, processAttendanceData]);

  // Switch Camera Front / Back
  const toggleCamera = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startScanner(nextFacing);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  // Adjust Zoom Level
  const adjustZoom = async (newZoom: number) => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ zoom: newZoom } as any]
      });
      setZoomLevel(newZoom);
    } catch (e) {
      console.warn("Zoom adjustment failed:", e);
    }
  };

  // Core Media File Processing Function
  const handleMediaFileSelected = async (file: File) => {
    if (!file) return;

    setMediaError(null);
    setMediaFile(file);
    setMediaScanning(true);
    setLastScannedResult(null);

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(objectUrl);

    // Keep the UI responsive while higher-resolution photos are being decoded.
    const watchdogTimer = setTimeout(() => {
      setMediaScanning(false);
    }, 12000);

    try {
      // Decode QR from the selected photo, allowing slower phones enough time.
      const decodedText = await decodeQrFromImageFile(file);
      if (decodedText) {
        await processAttendanceData(decodedText, "media");
      } else {
        throw new Error("Is media photo me saaf QR code nahi mila.");
      }
    } catch (err: any) {
      playSoundWrong();
      hapticMedium();
      const msg = err?.message || "Is photo me saaf QR code nahi mila. Kripya doosri photo select karein.";
      setMediaError(msg);
      setLastScannedResult({
        success: false,
        title: "Media Scan Fail Ho Gaya",
        message: msg,
        source: "media",
      });
    } finally {
      clearTimeout(watchdogTimer);
      setMediaScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (mediaTabFileInputRef.current) mediaTabFileInputRef.current.value = "";
    }
  };

  // Drag & drop handlers for Media Scan tab
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleMediaFileSelected(file);
    } else {
      setMediaError("Kripya valid image file (.jpg, .png, .webp) drop karein.");
    }
  };

  // Mount effect & Tab Switch Handling
  useEffect(() => {
    if (isOpen) {
      if (activeTab === "camera") {
        const timer = setTimeout(() => {
          startScanner(facingMode);
        }, 300);
        return () => {
          clearTimeout(timer);
          stopScanner();
        };
      } else {
        // Media tab active: stop camera to save battery & release device
        stopScanner();
      }
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              {activeTab === "camera" ? <Camera size={20} /> : <ImageIcon size={20} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 truncate">
                <span>{isTeacherMode ? "Student Attendance Scanner" : "QR Attendance Scanner"}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activeTab === "camera"
                    ? cameraActive
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-700 text-slate-300 border-slate-600"
                    : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                }`}>
                  {activeTab === "camera" ? (cameraActive ? "Live HD" : "Ready") : "Media File"}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {isTeacherMode
                  ? `${targetClassName || "Class"} • Camera & Media/Gallery Scanner`
                  : currentStudent?.schoolName || "Classroom ka Attendance QR scan karein"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: 📷 Live Camera vs 🖼️ Media / Gallery QR Scan */}
        <div className="bg-slate-950 px-4 pt-2.5 pb-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex p-0.5 bg-slate-800/80 rounded-xl w-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab("camera");
                setLastScannedResult(null);
                setMediaError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === "camera"
                  ? "bg-indigo-600 text-white shadow-xs font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera size={14} />
              <span>📷 Live Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                setActiveTab("media");
                setLastScannedResult(null);
                setMediaError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === "media"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FolderOpen size={14} />
              <span>🖼️ Media / Gallery File</span>
            </button>
          </div>
        </div>

        {/* Scan Mode & Time Options (In / Exit / Cutoff) */}
        {isTeacherMode && (
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setScanMode("auto")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${scanMode === "auto" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                Auto (In/Exit)
              </button>
              <button
                type="button"
                onClick={() => setScanMode("in")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${scanMode === "in" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                🟢 Entry Only
              </button>
              <button
                type="button"
                onClick={() => setScanMode("out")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${scanMode === "out" ? "bg-amber-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                🚪 Exit Only
              </button>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Cutoff:</span>
              <input
                type="time"
                value={cutoffTime}
                onChange={e => setCutoffTime(e.target.value)}
                className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 text-[11px] outline-hidden cursor-pointer"
                title="School cutoff time for late arrival"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: LIVE CAMERA VIEWFINDER BODY                             */}
        {/* ============================================================== */}
        {activeTab === "camera" ? (
          <div className="relative flex-1 bg-black flex flex-col items-center justify-center min-h-[320px] sm:min-h-[380px] overflow-hidden">
            {/* html5-qrcode mount target */}
            <div id={containerId.current} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

            {/* Scanner Overlay Visuals */}
            {cameraActive && !lastScannedResult?.success && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                {/* Reticle Box */}
                <div className="relative w-64 h-64 border-2 border-indigo-400/50 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]">
                  {/* 4 Corner Accents */}
                  <span className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl shadow-xs" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl shadow-xs" />
                  <span className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl shadow-xs" />
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-indigo-400 rounded-br-xl shadow-xs" />

                  {/* Animated Laser Scanning Beam */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[bounce_1.8s_infinite]" />
                </div>

                <div className="mt-4 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white text-xs font-bold tracking-wide flex items-center gap-2">
                  <Sparkles size={13} className="text-amber-400 animate-spin" />
                  <span>
                    {scanMode === "in" ? "Entry Scan: Student ID card dikhayein" :
                     scanMode === "out" ? "Exit Scan: Student ID card dikhayein" :
                     "QR Code ko is box ke andar layein"}
                  </span>
                </div>
              </div>
            )}

            {/* Camera Floating Controls (Torch, Zoom, Flip, Media Upload) */}
            {cameraActive && !lastScannedResult && (
              <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-auto z-10">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${torchOn ? "bg-amber-400 text-slate-950 shadow" : "text-white hover:bg-white/10"}`}
                      title="Torch / Flashlight"
                    >
                      {torchOn ? <Zap size={15} /> : <ZapOff size={15} />}
                    </button>
                  )}
                  {maxZoom > 1 && (
                    <button
                      type="button"
                      onClick={() => adjustZoom(zoomLevel === 1 ? 1.5 : zoomLevel === 1.5 ? 2 : 1)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-black text-white hover:bg-white/10 border border-white/10 flex items-center gap-1"
                      title="Camera Zoom"
                    >
                      <ZoomIn size={13} />
                      <span>{zoomLevel}x</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="p-2 rounded-xl text-white hover:bg-white/10 transition"
                    title="Camera badlein (Front / Back)"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("media");
                      setTimeout(() => mediaTabFileInputRef.current?.click(), 100);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 transition flex items-center gap-1.5"
                    title="Media / Gallery se QR photo chunein"
                  >
                    <Upload size={13} /> Media Scan
                  </button>
                </div>
              </div>
            )}

            {/* Camera Error State */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <AlertCircle size={28} />
                </div>
                <p className="text-sm font-bold text-white max-w-xs">{cameraError}</p>
                <div className="flex gap-2 pt-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => startScanner(facingMode)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <RefreshCw size={13} /> Camera Retry Karein
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("media");
                      setTimeout(() => mediaTabFileInputRef.current?.click(), 100);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <FolderOpen size={13} /> Media / Gallery se Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* TAB 2: MEDIA / PHOTO GALLERY QR SCANNER BODY                   */
          /* ============================================================== */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex-1 bg-slate-900 flex flex-col items-center justify-center p-5 min-h-[320px] sm:min-h-[380px] overflow-hidden transition-all ${
              isDragging ? "bg-indigo-950/60 ring-2 ring-indigo-500" : ""
            }`}
          >
            {/* If an image is selected and currently being previewed / scanned */}
            {mediaPreviewUrl ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center max-h-[290px] relative">
                <div className="relative max-w-full max-h-[240px] rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-black flex items-center justify-center shadow-xl">
                  <img
                    src={mediaPreviewUrl}
                    alt="Uploaded Media QR"
                    className="max-h-[240px] w-auto object-contain rounded-xl"
                  />
                  {/* Laser scan animation when processing media */}
                  {mediaScanning && (
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-[bounce_1.4s_infinite]" />
                      <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-emerald-400 text-xs font-bold flex items-center gap-2 border border-emerald-500/30">
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Media Se QR Scan Ho Raha Hai...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mediaTabFileInputRef.current?.click()}
                    disabled={mediaScanning}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer disabled:opacity-50"
                  >
                    <FolderOpen size={14} />
                    <span>Doosri Photo Chunein</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaPreviewUrl(null);
                      setMediaFile(null);
                      setMediaError(null);
                      setLastScannedResult(null);
                    }}
                    disabled={mediaScanning}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              /* Drag & Drop / File Selector Box */
              <div
                onClick={() => mediaTabFileInputRef.current?.click()}
                className="w-full flex-1 max-w-sm border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-800/40 hover:bg-slate-800/70 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all shadow-inner">
                  <FolderOpen size={30} />
                </div>
                <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition">
                  Media / Gallery se QR Code Chunein
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                  Apne phone ki photo gallery, WhatsApp screenshot ya file manager se ID card ki photo select karein.
                </p>

                <div className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95">
                  <Upload size={14} />
                  <span>Choose Photo / File</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  <span>Supports: JPG, PNG, WEBP, Screenshot</span>
                </div>
              </div>
            )}

            {/* Error Message for Media Scan */}
            {mediaError && !mediaScanning && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 w-full max-w-sm animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span className="flex-1 font-semibold">{mediaError}</span>
              </div>
            )}
          </div>
        )}

        {/* Scanned Result Banner / Card Overlay */}
        {lastScannedResult && (
          <div className="absolute inset-0 bg-slate-950/94 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg ${
              lastScannedResult.success
                ? lastScannedResult.action === "out"
                  ? "bg-amber-500/20 border-2 border-amber-400 text-amber-400 shadow-amber-500/20"
                  : lastScannedResult.isLate
                  ? "bg-orange-500/20 border-2 border-orange-400 text-orange-400 shadow-orange-500/20"
                  : "bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-emerald-500/20"
                : "bg-rose-500/20 border-2 border-rose-400 text-rose-400 shadow-rose-500/20"
            }`}>
              {lastScannedResult.success ? <CheckCircle2 size={36} /> : <AlertCircle size={36} />}
            </div>

            <h4 className="text-lg font-black text-white">{lastScannedResult.title}</h4>
            <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
              {lastScannedResult.message}
            </p>

            {lastScannedResult.success && lastScannedResult.name && (
              <div className="mt-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 w-full max-w-xs text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Student:</span>
                  <span className="font-black text-white">{lastScannedResult.name}</span>
                </div>
                {lastScannedResult.rollNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Roll No:</span>
                    <span className="font-bold text-indigo-300">#{lastScannedResult.rollNo}</span>
                  </div>
                )}
                {lastScannedResult.inTime && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Entry (In-Time):</span>
                    <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      {lastScannedResult.inTime}
                    </span>
                  </div>
                )}
                {lastScannedResult.outTime && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Exit (Out-Time):</span>
                    <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      {lastScannedResult.outTime}
                    </span>
                  </div>
                )}
                {lastScannedResult.stayDuration && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Stay:</span>
                    <span className="font-black text-sky-300">
                      ⏱️ {lastScannedResult.stayDuration}
                    </span>
                  </div>
                )}
                {lastScannedResult.source === "media" && (
                  <div className="pt-1 border-t border-white/5 text-[10px] text-purple-300 flex items-center gap-1 font-bold">
                    <FolderOpen size={12} />
                    <span>Scanned from Media / Gallery File</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2.5 mt-5 w-full max-w-xs">
              {isTeacherMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setLastScannedResult(null);
                      if (activeTab === "media") {
                        setMediaPreviewUrl(null);
                        setMediaFile(null);
                        setTimeout(() => mediaTabFileInputRef.current?.click(), 100);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
                  >
                    <span>{activeTab === "media" ? "Media se Agla Scan" : "Agla Student Scan Karein"}</span>
                    <ArrowRight size={14} />
                  </button>
                  {activeTab === "media" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("camera");
                        setLastScannedResult(null);
                      }}
                      className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 transition"
                      title="Live Camera par jayein"
                    >
                      <Camera size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      stopScanner();
                      onClose();
                    }}
                    className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition"
                  >
                    <X size={14} />
                    <span>Close</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    stopScanner();
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/30"
                >
                  <CheckCircle2 size={15} />
                  <span>Done (Ho Gaya)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hidden file input for photo QR scan from camera bar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleMediaFileSelected(file);
          }}
        />

        {/* Dedicated Media tab file input */}
        <input
          ref={mediaTabFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleMediaFileSelected(file);
          }}
        />

        {/* Live Punches Stream Footer (For Teacher Mode) */}
        {isTeacherMode && (
          <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 shrink-0 max-h-36 overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
              <span>Aaj Ki Live Punches ({continuousCount} Total):</span>
              <span className="text-emerald-400">✓ Auto Recorded</span>
            </div>
            {recentPunches.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic text-center py-1">
                Student ka ID card samne layein ya Media se photo upload karein...
              </p>
            ) : (
              <div className="space-y-1.5">
                {recentPunches.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${p.action === "in" ? (p.isLate ? "bg-orange-400" : "bg-emerald-400") : "bg-amber-400"}`} />
                      <span className="font-bold text-white truncate max-w-[130px]">{p.name}</span>
                      {p.rollNo && <span className="text-slate-400 text-[10px]">#{p.rollNo}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.source === "media" && (
                        <span className="text-[9px] text-purple-400 bg-purple-950/60 px-1 rounded">Media</span>
                      )}
                      <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${p.action === "in" ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"}`}>
                        {p.action === "in" ? "Entry" : "Exit"} {p.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
