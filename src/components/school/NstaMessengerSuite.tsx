// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  Building2,
  GraduationCap,
  Send,
  Image as ImageIcon,
  FileText,
  Lock,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Paperclip,
  MoreVertical,
  X,
  Phone,
  Calendar,
  AlertCircle,
  ReceiptText,
  IndianRupee,
  ShieldCheck,
  HelpCircle,
  MessageSquare,
  Palette,
  CheckCircle2,
  Trash2,
  UserCheck,
  Camera,
  RotateCcw,
  Upload,
  Film,
  Play,
  Maximize2,
  Loader2
} from "lucide-react";
import type {
  School,
  SchoolClass,
  SchoolTeacher,
  SchoolStudent,
  MonthlyFee,
  NstaMessage,
  NstaThreadType,
  NstaFeeSlipData
} from "../../school-types";
import {
  saveNstaMessage,
  subscribeToNstaMessages,
  getStudentDailyTeacherQueryCount,
  autoSendFeeSlipToSchoolDesk,
  generateId,
  isStudentInClass
} from "../../school-firebase";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { formatMonthLabel } from "../../utils/feeFifoAllocation";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";

interface Props {
  school: School;
  currentUserRole: "ADMIN" | "TEACHER" | "STUDENT";
  currentUserId: string;
  currentUserName: string;
  // Student context (when logged in as student)
  student?: SchoolStudent;
  // Teacher context (when logged in as teacher)
  teacher?: SchoolTeacher;
  // Reference data
  classes?: SchoolClass[];
  teachers?: SchoolTeacher[];
  students?: SchoolStudent[];
  fees?: MonthlyFee[];
  onBack?: () => void;
  onOpenFeeReceipt?: (fee: any) => void;
  onOpenWhatsAppPay?: (fee: any) => void;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  tag?: string;
  isLight: boolean;
  bgClass: string;
  style: React.CSSProperties;
}

// Wallpaper Presets - White Doodle is STRICTLY DEFAULT
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "white_doodle",
    name: "Clean White Doodle",
    tag: "DEFAULT",
    isLight: true,
    bgClass: "bg-[#f8fafc]",
    style: {
      backgroundColor: "#f8fafc",
      backgroundImage: `radial-gradient(#cbd5e1 1.2px, transparent 1.2px), radial-gradient(#cbd5e1 1.2px, #f8fafc 1.2px)`,
      backgroundSize: "26px 26px",
      backgroundPosition: "0 0, 13px 13px"
    }
  },
  {
    id: "pure_white",
    name: "Pure White Minimal",
    isLight: true,
    bgClass: "bg-white",
    style: {
      backgroundColor: "#ffffff"
    }
  },
  {
    id: "soft_ivory",
    name: "Soft Ivory Canvas",
    isLight: true,
    bgClass: "bg-[#faf6ee]",
    style: {
      backgroundColor: "#faf6ee",
      backgroundImage: `radial-gradient(#e2dacf 1.2px, transparent 1.2px)`,
      backgroundSize: "22px 22px"
    }
  },
  {
    id: "dark_doodle",
    name: "WhatsApp Dark Doodle",
    isLight: false,
    bgClass: "bg-[#0b141a]",
    style: {
      backgroundColor: "#0b141a",
      backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px), radial-gradient(#1f2c34 1px, #0b141a 1px)`,
      backgroundSize: "28px 28px",
      backgroundPosition: "0 0, 14px 14px"
    }
  },
  {
    id: "slate",
    name: "Dark Academic Slate",
    isLight: false,
    bgClass: "bg-slate-900",
    style: {
      backgroundColor: "#0f172a",
      backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 1))`
    }
  },
  {
    id: "chalk",
    name: "Green Chalkboard",
    isLight: false,
    bgClass: "bg-[#0f2e22]",
    style: {
      backgroundColor: "#0f2e22",
      backgroundImage: `radial-gradient(#1a4433 1.5px, transparent 1.5px)`,
      backgroundSize: "24px 24px"
    }
  }
];

export interface SchoolWallpaperConfig {
  type: "preset" | "custom";
  presetId?: string;
  dataUrl?: string;
  isLight?: boolean;
  updatedAt?: number;
}

export const NstaMessengerSuite: React.FC<Props> = ({
  school,
  currentUserRole = "STUDENT",
  currentUserId,
  currentUserName,
  student,
  teacher,
  classes = [],
  teachers = [],
  students = [],
  fees = [],
  onBack,
  onOpenFeeReceipt,
  onOpenWhatsAppPay
}) => {
  // ── Top 3-Page Switcher: Class | School | Teacher ───────────────────────
  const [activeTab, setActiveTab] = useState<"class" | "school" | "teacher">("class");

  const safeClasses = useMemo(() => (Array.isArray(classes) ? classes.filter(Boolean) : []), [classes]);
  const safeStudents = useMemo(() => (Array.isArray(students) ? students.filter(Boolean) : []), [students]);
  const safeTeachers = useMemo(() => (Array.isArray(teachers) ? teachers.filter(Boolean) : []), [teachers]);

  // Selection states for Admin/Teacher
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (student?.classId) return student.classId;
    return safeClasses[0]?.id || "";
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (student?.id) return student.id;
    if (currentUserRole === "ADMIN") return "all";
    return safeStudents[0]?.id || "all";
  });

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (teacher?.id) return teacher.id;
    return safeTeachers[0]?.id || "";
  });

  // Chat message input
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<NstaMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Media states: Photo & Video attachments (NSTA Messenger feature)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState<string>("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);

  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoCaption, setVideoCaption] = useState<string>("");

  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: "IMAGE" | "VIDEO"; url: string; title?: string } | null>(null);

  // Modals & Drawers
  const [showMemberDrawer, setShowMemberDrawer] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── School-Wide Wallpaper Engine (Default: White Doodle, Editable ONLY by School Admin) ──
  const schoolIdKey = school?.id || "default";
  const schoolWallpaperStorageKey = `nst_school_wallpaper_${schoolIdKey}`;

  const readSchoolWallpaper = (): SchoolWallpaperConfig => {
    try {
      const raw = localStorage.getItem(schoolWallpaperStorageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.type === "preset" || parsed.type === "custom")) {
            return parsed;
          }
        } catch {
          if (typeof raw === "string") {
            return {
              type: "preset",
              presetId: raw,
              isLight: raw.startsWith("white") || raw.includes("ivory")
            };
          }
        }
      }
      // Check if school object has custom wallpaper
      if ((school as any)?.messengerWallpaper) {
        const mw = (school as any).messengerWallpaper;
        if (typeof mw === "string") {
          if (mw.startsWith("data:image/") || mw.startsWith("http")) {
            return { type: "custom", dataUrl: mw, isLight: false };
          }
          return { type: "preset", presetId: mw, isLight: mw.startsWith("white") };
        }
        if (mw && typeof mw === "object") return mw;
      }
    } catch {}

    // STRICT DEFAULT: White Doodle!
    return { type: "preset", presetId: "white_doodle", isLight: true };
  };

  const [wallpaperConfig, setWallpaperConfig] = useState<SchoolWallpaperConfig>(readSchoolWallpaper);

  // Listen for real-time school wallpaper change events across components/tabs
  useEffect(() => {
    const handleWallpaperEvent = (e: any) => {
      if (!e?.detail?.schoolId || e.detail.schoolId === schoolIdKey) {
        setWallpaperConfig(readSchoolWallpaper());
      }
    };
    window.addEventListener("nsta-wallpaper-updated", handleWallpaperEvent);
    return () => window.removeEventListener("nsta-wallpaper-updated", handleWallpaperEvent);
  }, [schoolIdKey]);

  // Compute active wallpaper visual styles & light/dark contrast
  const activeWallpaper = useMemo(() => {
    if (wallpaperConfig.type === "custom" && wallpaperConfig.dataUrl) {
      return {
        isLight: Boolean(wallpaperConfig.isLight),
        bgClass: "bg-slate-950",
        style: {
          backgroundImage: `url(${wallpaperConfig.dataUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        },
        hasOverlay: true
      };
    }
    const preset = WALLPAPER_PRESETS.find(p => p.id === wallpaperConfig.presetId) || WALLPAPER_PRESETS[0];
    return {
      isLight: preset.isLight,
      bgClass: preset.bgClass,
      style: preset.style,
      hasOverlay: false
    };
  }, [wallpaperConfig]);

  // Admin Only: Select Preset Wallpaper
  const handleSelectPreset = (presetId: string) => {
    if (currentUserRole !== "ADMIN") return;
    const preset = WALLPAPER_PRESETS.find(p => p.id === presetId) || WALLPAPER_PRESETS[0];
    const newConfig: SchoolWallpaperConfig = {
      type: "preset",
      presetId: preset.id,
      isLight: preset.isLight,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(schoolWallpaperStorageKey, JSON.stringify(newConfig));
      window.dispatchEvent(new CustomEvent("nsta-wallpaper-updated", { detail: { schoolId: schoolIdKey } }));
    } catch {}
    setWallpaperConfig(newConfig);
    setShowWallpaperModal(false);
  };

  // Admin Only: Upload Custom Wallpaper from Gallery / Camera / Files
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUserRole !== "ADMIN") return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGallery(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // High quality responsive compress to prevent localStorage quota exhaustion
        const canvas = document.createElement("canvas");
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          const newConfig: SchoolWallpaperConfig = {
            type: "custom",
            dataUrl,
            isLight: false, // Custom gallery image treated safely with translucent backdrop
            updatedAt: Date.now()
          };
          try {
            localStorage.setItem(schoolWallpaperStorageKey, JSON.stringify(newConfig));
            window.dispatchEvent(new CustomEvent("nsta-wallpaper-updated", { detail: { schoolId: schoolIdKey } }));
          } catch (err) {
            console.warn("Could not save to localStorage quota:", err);
          }
          setWallpaperConfig(newConfig);
          setIsUploadingGallery(false);
          setShowWallpaperModal(false);
        }
      };
      img.onerror = () => setIsUploadingGallery(false);
      img.src = reader.result as string;
    };
    reader.onerror = () => setIsUploadingGallery(false);
    reader.readAsDataURL(file);
  };

  // Admin Only: Reset to Default White Doodle
  const handleResetToWhiteDefault = () => {
    if (currentUserRole !== "ADMIN") return;
    const defConfig: SchoolWallpaperConfig = {
      type: "preset",
      presetId: "white_doodle",
      isLight: true,
      updatedAt: Date.now()
    };
    try {
      localStorage.removeItem(schoolWallpaperStorageKey);
      window.dispatchEvent(new CustomEvent("nsta-wallpaper-updated", { detail: { schoolId: schoolIdKey } }));
    } catch {}
    setWallpaperConfig(defConfig);
    setShowWallpaperModal(false);
  };

  // Active Class & Student resolution (Guaranteed NEVER null/undefined)
  const activeClass = useMemo(() => {
    if (student?.classId) {
      const found = safeClasses.find(c => c.id === student.classId || c.name === student.className);
      if (found) return found;
      return {
        id: student.classId,
        name: student.className || "Class Group",
        section: student.section || "A"
      };
    }
    if (student?.className) {
      const found = safeClasses.find(c => c.name?.toLowerCase() === student.className?.toLowerCase());
      if (found) return found;
      return {
        id: `cls_${student.className.toLowerCase().replace(/\s+/g, "_")}`,
        name: student.className,
        section: student.section || "A"
      };
    }
    const found = safeClasses.find(c => c.id === selectedClassId);
    if (found) return found;
    if (safeClasses[0]) return safeClasses[0];
    return {
      id: "all_students_class",
      name: "Class Group",
      section: "A"
    };
  }, [safeClasses, selectedClassId, student]);

  const activeStudent = useMemo(() => {
    if (currentUserRole === "STUDENT" && student) return student;
    if (selectedStudentId === "all") return null;
    const found = safeStudents.find(s => s.id === selectedStudentId);
    if (found) return found;
    if (currentUserRole !== "ADMIN" && safeStudents[0]) return safeStudents[0];
    if (student) return student;
    return null;
  }, [safeStudents, selectedStudentId, student, currentUserRole]);

  const activeTeacher = useMemo(() => {
    if (currentUserRole === "TEACHER" && teacher) return teacher;
    const found = safeTeachers.find(t => t.id === selectedTeacherId);
    if (found) return found;
    if (safeTeachers[0]) return safeTeachers[0];
    if (teacher) return teacher;
    return {
      id: "teacher_faculty",
      name: "Class Teacher",
      subject: "Academics"
    } as any;
  }, [safeTeachers, selectedTeacherId, teacher, currentUserRole]);

  // Students belonging to current class
  const classStudents = useMemo(() => {
    if (!activeClass) return safeStudents;
    const filtered = safeStudents.filter(s => s && isStudentInClass(s, activeClass.id, activeClass.name));
    if (filtered.length > 0) return filtered;
    if (activeStudent) return [activeStudent];
    return safeStudents;
  }, [safeStudents, activeClass, activeStudent]);

  // Daily message quota for student in Teacher Chat (Max 5)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const studentTeacherQueryCount = useMemo(() => {
    if (currentUserRole !== "STUDENT" || !student) return 0;
    return getStudentDailyTeacherQueryCount(school?.id || "default", student.id, todayStr);
  }, [school?.id, student, todayStr, messages]);

  const isTeacherQuotaExceeded = currentUserRole === "STUDENT" && studentTeacherQueryCount >= 5;

  // Real-time message subscription based on activeTab
  useEffect(() => {
    const effectiveSchoolId = school?.id || "default";

    let filter: { threadType: NstaThreadType; classId?: string; studentId?: string; teacherId?: string };

    if (activeTab === "class") {
      filter = {
        threadType: "CLASS_GROUP",
        classId: activeClass?.id || "general"
      };
    } else if (activeTab === "school") {
      filter = {
        threadType: "SCHOOL_DESK",
        studentId: activeStudent?.id || "general"
      };
    } else {
      filter = {
        threadType: "TEACHER_CHAT",
        studentId: activeStudent?.id,
        teacherId: activeTeacher?.id
      };
    }

    const unsub = subscribeToNstaMessages(effectiveSchoolId, filter, (newMsgs) => {
      setMessages(newMsgs || []);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    });

    return () => unsub();
  }, [school?.id, activeTab, activeClass?.id, activeStudent?.id, activeTeacher?.id]);

  // Auto scroll on message length change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Switch tab with instant state reset to prevent cross-page message bleeding
  const handleSwitchTab = (tab: "class" | "school" | "teacher") => {
    if (tab === activeTab) return;
    setMessages([]);
    setActiveTab(tab);
  };

  // Handle Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    // Quota check for students in teacher chat
    if (activeTab === "teacher" && currentUserRole === "STUDENT" && isTeacherQuotaExceeded) {
      alert("Aapka daily limit (5 messages) poora ho chuka hai. Agla sawal kal bhej sakenge!");
      return;
    }

    // Permission check for Class Group & School Desk
    if (currentUserRole === "STUDENT") {
      if (activeTab === "class") {
        alert("Class Group me keval Teachers aur School Admin hi sandesh bhej sakte hain.");
        return;
      }
      if (activeTab === "school") {
        alert("School Desk par keval School Admin hi official sandesh bhej sakte hain.");
        return;
      }
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      alert("School Desk par keval School Admin hi sandesh bhej sakte hain.");
      return;
    }

    setIsSending(true);

    const targetThreadType: NstaThreadType =
      activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";

    const isSchoolDeskBroadcast = activeTab === "school" && (!selectedStudentId || selectedStudentId === "all");

    const newMsg: NstaMessage = {
      id: generateId("msg"),
      schoolId: school?.id || "default",
      threadType: targetThreadType,
      // Strictly set IDs relevant ONLY to this specific tab/thread type
      classId: activeTab === "class" ? (activeClass?.id || "general") : undefined,
      studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
      studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
      teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
      teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
      senderId: currentUserId || "user",
      senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
      senderRole: currentUserRole,
      text: cleanText,
      createdAt: new Date().toISOString(),
      status: "sent"
    };

    try {
      await saveNstaMessage(newMsg);
      setInputText("");

      // Dispatch real lock-screen push notification to receiver
      try {
        const isClassGroup = newMsg.threadType === "CLASS_GROUP";
        const isSchoolDesk = newMsg.threadType === "SCHOOL_DESK";
        const senderTitle = newMsg.senderName || (newMsg.senderRole === "ADMIN" ? "School Admin" : "Teacher");
        const title = isClassGroup
          ? `👥 ${senderTitle} (${activeClass?.name || "Class Group"})`
          : isSchoolDesk
          ? `🏫 ${school?.name || "School"} • Official Notice`
          : `💬 ${senderTitle}`;
        const body = newMsg.text || "Naya sandesh aaya hai";

        void sendSchoolPushNotification({
          schoolId: newMsg.schoolId,
          classId: isClassGroup ? newMsg.classId : undefined,
          studentIds: isClassGroup ? undefined : (newMsg.studentId ? [newMsg.studentId] : undefined),
          title,
          body,
          type: isSchoolDesk ? "SCHOOL_NOTICE" : "DEFAULT",
          url: `/?schoolPortal=1&schoolTab=messenger`,
          urgent: true,
        });
      } catch (_) {}
    } catch (err) {
      console.error("[NstaMessenger] Send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // ── Media Handlers (Photo / Image & Video Upload - NSTA Messenger Suite) ──

  // 1. Select Image
  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Kripya ek valid photo file select karein.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert("Photo ka size 25MB se kam hona chahiye.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setImagePreviewUrl(preview);
    setImageCaption("");
    e.target.value = "";
  };

  // 2. Select Video
  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) {
      alert("Kripya ek valid video file (MP4/WebM) select karein.");
      return;
    }
    if (file.size > 75 * 1024 * 1024) {
      alert("Video ka size 75MB se kam hona chahiye.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedVideoFile(file);
    setVideoPreviewUrl(preview);
    setVideoCaption("");
    e.target.value = "";
  };

  // 3. Send Photo Message
  const handleSendImage = async () => {
    if (!selectedImageFile || isUploadingMedia) return;

    if (activeTab === "teacher" && currentUserRole === "STUDENT" && isTeacherQuotaExceeded) {
      alert("Aapka daily limit (5 messages) poora ho chuka hai. Agla sawal kal bhej sakenge!");
      return;
    }

    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      alert("Keval Teachers aur School Admin hi is tab me media bhej sakte hain.");
      return;
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      alert("School Desk par keval School Admin hi photo bhej sakte hain.");
      return;
    }

    setIsUploadingMedia(true);
    setMediaUploadProgress(15);

    try {
      let uploadedUrl = "";
      try {
        const res = await uploadToCloudinary(selectedImageFile, "image", (pct) => {
          setMediaUploadProgress(pct);
        });
        uploadedUrl = res?.secure_url || res?.url;
      } catch (uploadErr) {
        console.warn("[NstaMessenger] Telegram/Cloudinary upload failed, falling back to base64:", uploadErr);
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedImageFile);
        });
      }

      const targetThreadType: NstaThreadType =
        activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";

      const isSchoolDeskBroadcast = activeTab === "school" && (!selectedStudentId || selectedStudentId === "all");

      const newMsg: NstaMessage = {
        id: generateId("msg"),
        schoolId: school?.id || "default",
        threadType: targetThreadType,
        classId: activeTab === "class" ? (activeClass?.id || "general") : undefined,
        studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
        studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
        teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
        teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
        senderId: currentUserId || "user",
        senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: currentUserRole,
        text: imageCaption.trim() || "Photo",
        attachmentType: "IMAGE",
        attachmentUrl: uploadedUrl,
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      await saveNstaMessage(newMsg);
      try {
        void sendSchoolPushNotification({
          schoolId: newMsg.schoolId,
          classId: newMsg.threadType === "CLASS_GROUP" ? newMsg.classId : undefined,
          studentIds: newMsg.threadType === "CLASS_GROUP" ? undefined : (newMsg.studentId ? [newMsg.studentId] : undefined),
          title: newMsg.threadType === "CLASS_GROUP"
            ? `👥 ${newMsg.senderName} (${activeClass?.name || "Class Group"})`
            : newMsg.threadType === "SCHOOL_DESK"
            ? `🏫 ${school?.name || "School"} • Official Notice`
            : `📷 Photo: ${newMsg.senderName}`,
          body: newMsg.text || "📷 Photo bheji gayi hai",
          type: "SCHOOL_NOTICE",
          url: `/?schoolPortal=1&schoolTab=messenger`,
          urgent: true,
        });
      } catch (_) {}
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setImageCaption("");
    } catch (err: any) {
      alert(err?.message || "Photo bhejne me samasya aayi. Kripya punah prayas karein.");
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(0);
    }
  };

  // 4. Send Video Message
  const handleSendVideo = async () => {
    if (!selectedVideoFile || isUploadingMedia) return;

    if (activeTab === "teacher" && currentUserRole === "STUDENT" && isTeacherQuotaExceeded) {
      alert("Aapka daily limit (5 messages) poora ho chuka hai. Agla sawal kal bhej sakenge!");
      return;
    }

    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      alert("Keval Teachers aur School Admin hi is tab me media bhej sakte hain.");
      return;
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      alert("School Desk par keval School Admin hi video bhej sakte hain.");
      return;
    }

    setIsUploadingMedia(true);
    setMediaUploadProgress(10);

    try {
      const res = await uploadToCloudinary(selectedVideoFile, "video", (pct) => {
        setMediaUploadProgress(pct);
      });
      const uploadedUrl = res?.secure_url || res?.url;

      const targetThreadType: NstaThreadType =
        activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";

      const isSchoolDeskBroadcast = activeTab === "school" && (!selectedStudentId || selectedStudentId === "all");

      const newMsg: NstaMessage = {
        id: generateId("msg"),
        schoolId: school?.id || "default",
        threadType: targetThreadType,
        classId: activeTab === "class" ? (activeClass?.id || "general") : undefined,
        studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
        studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
        teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
        teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
        senderId: currentUserId || "user",
        senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: currentUserRole,
        text: videoCaption.trim() || "Video",
        attachmentType: "VIDEO",
        attachmentUrl: uploadedUrl,
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      await saveNstaMessage(newMsg);
      try {
        void sendSchoolPushNotification({
          schoolId: newMsg.schoolId,
          classId: newMsg.threadType === "CLASS_GROUP" ? newMsg.classId : undefined,
          studentIds: newMsg.threadType === "CLASS_GROUP" ? undefined : (newMsg.studentId ? [newMsg.studentId] : undefined),
          title: newMsg.threadType === "CLASS_GROUP"
            ? `👥 ${newMsg.senderName} (${activeClass?.name || "Class Group"})`
            : newMsg.threadType === "SCHOOL_DESK"
            ? `🏫 ${school?.name || "School"} • Official Notice`
            : `🎥 Video: ${newMsg.senderName}`,
          body: newMsg.text || "🎥 Video bheja gaya hai",
          type: "SCHOOL_NOTICE",
          url: `/?schoolPortal=1&schoolTab=messenger`,
          urgent: true,
        });
      } catch (_) {}
      setSelectedVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoCaption("");
    } catch (err: any) {
      alert(err?.message || "Video upload nahi ho saka. Kripya punah prayas karein.");
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(0);
    }
  };

  // Strictly filter messages by active tab threadType and matching IDs
  const filteredMessages = useMemo(() => {
    const targetThreadType: NstaThreadType =
      activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";

    const threadFiltered = messages.filter(m => {
      if (!m || !m.threadType) return false;
      // 1. Strict threadType match: ensures class, school and teacher never bleed
      if (m.threadType !== targetThreadType) return false;

      // 2. Class Group matching
      if (targetThreadType === "CLASS_GROUP") {
        const cId = activeClass?.id;
        if (cId && m.classId && m.classId !== cId && m.classId !== "all" && m.classId !== "general") {
          return false;
        }
      }

      // 3. School Desk matching
      if (targetThreadType === "SCHOOL_DESK") {
        const sId = activeStudent?.id;
        if (sId && m.studentId && m.studentId !== sId && m.studentId !== "all" && m.studentId !== "general") {
          return false;
        }
      }

      // 4. Teacher Doubt matching
      if (targetThreadType === "TEACHER_CHAT") {
        if (activeStudent?.id && m.studentId && m.studentId !== activeStudent.id) return false;
        if (activeTeacher?.id && m.teacherId && m.teacherId !== activeTeacher.id) return false;
      }

      return true;
    });

    if (!searchQuery.trim()) return threadFiltered;
    const q = searchQuery.toLowerCase();
    return threadFiltered.filter(m =>
      (m.text || "").toLowerCase().includes(q) ||
      (m.senderName || "").toLowerCase().includes(q) ||
      (m.feeSlip?.monthLabel || "").toLowerCase().includes(q)
    );
  }, [messages, searchQuery, activeTab, activeClass?.id, activeStudent?.id, activeTeacher?.id]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 font-sans select-none overflow-hidden">
      {/* ── ROW 1: TOP APP BAR (DP, CLASS NAME, NSTA MESSENGER, GROUP INFO BUTTON & THEME) ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: Back button + DP + Class & Messenger info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer active:scale-95 shrink-0"
              title="Wapas Jaayein"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* DP / Group Avatar - Tap to open Group Info */}
          <button
            type="button"
            onClick={() => {
              if (activeTab === "class") setShowMemberDrawer(true);
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-md transition active:scale-95 cursor-pointer ${
              activeTab === "class"
                ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-900/30"
                : activeTab === "school"
                ? "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-900/30"
                : "bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-purple-900/30"
            }`}
            title={activeTab === "class" ? "Group Info & Members Dekhein" : ""}
          >
            {activeTab === "class"
              ? (activeClass?.name?.slice(0, 2).toUpperCase() || "CL")
              : activeTab === "school"
              ? "🏫"
              : "👨‍🏫"}
          </button>

          {/* Titles: Class name, NSTA Messenger & Members */}
          <div
            onClick={() => {
              if (activeTab === "class") setShowMemberDrawer(true);
            }}
            className={`min-w-0 ${activeTab === "class" ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-white font-black text-xs sm:text-sm tracking-tight truncate">
                {activeTab === "class"
                  ? `${activeClass?.name || "Class Group"} ${activeClass?.section ? `(${activeClass.section})` : ""}`
                  : activeTab === "school"
                  ? "School Desk"
                  : (activeTeacher?.name || "Teacher Doubt")}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                LIVE
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {activeTab === "class"
                ? `${classStudents.length} Students • ${school?.name || "School Group"}`
                : activeTab === "school"
                ? (school?.name || "Official School Desk")
                : `${activeTeacher?.subject || "Subject Teacher"} • 1-on-1 Doubt`}
            </p>
          </div>
        </div>

        {/* Right: Group Info button (kon kon hai) + Class dropdown (if admin) + Theme button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Button to see who is in the group (Class & DP ke side me) */}
          {activeTab === "class" && (
            <button
              type="button"
              onClick={() => setShowMemberDrawer(true)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-emerald-500/30 active:scale-95 shadow-sm"
              title="Group me kaun kaun hai dekhein"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Group Info</span>
              <span className="font-mono text-[11px]">({classStudents.length})</span>
            </button>
          )}

          {/* Admin Class Selector Dropdown */}
          {currentUserRole === "ADMIN" && activeTab === "class" && safeClasses.length > 1 && (
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="px-2 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 cursor-pointer max-w-[95px] sm:max-w-[120px] truncate"
              title="Class Chunein"
            >
              {safeClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
              ))}
            </select>
          )}

          {/* Admin Recipient Selector for School Desk (Sabhi Chhatra Broadcast vs Specific Student) */}
          {currentUserRole === "ADMIN" && activeTab === "school" && (
            <select
              value={selectedStudentId || "all"}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="px-2 py-1.5 rounded-xl bg-blue-900/60 text-blue-100 border border-blue-500/60 text-xs font-bold cursor-pointer max-w-[120px] sm:max-w-[170px] truncate"
              title="School Desk Praptkarta Chunein"
            >
              <option value="all">📢 Sabhi Chhatra (Broadcast)</option>
              {safeStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.rollNo ? `Roll ${s.rollNo}` : "Std"})</option>
              ))}
            </select>
          )}

          {/* Teacher Selector for Student Doubt Desk */}
          {activeTab === "teacher" && safeTeachers.length > 0 && (
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="px-2 py-1.5 rounded-xl bg-purple-900/40 text-purple-200 border border-purple-700/60 text-xs font-bold cursor-pointer max-w-[100px] sm:max-w-[130px] truncate"
              title="Teacher Chunein"
            >
              {safeTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Theme / Wallpaper Option moved to Row 1 (Admin Only) */}
          {currentUserRole === "ADMIN" && (
            <button
              type="button"
              onClick={() => setShowWallpaperModal(true)}
              title="Chat Theme & Wallpaper Badlein (Admin Only)"
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition cursor-pointer border border-amber-500/30 flex items-center justify-center active:scale-95 shadow-sm"
            >
              <Palette className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 2: FULL-SCREEN 3-SEGMENT BUTTONS (CLASS | SCHOOL | TEACHER) ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-2 sm:px-3 py-1.5 shrink-0 z-10 w-full">
        <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800/90 w-full shadow-inner">
          <button
            type="button"
            onClick={() => handleSwitchTab("class")}
            className={`w-full py-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === "class"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Class (Group)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab("school")}
            className={`w-full py-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === "school"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">School (Desk)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab("teacher")}
            className={`w-full py-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === "teacher"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Teacher (Doubt)</span>
          </button>
        </div>
      </div>

      {/* ── CHAT MESSAGE BODY (WITH WALLPAPER & CRISP CONTRAST) ─────────────── */}
      <div
        className={`flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 transition-colors relative ${activeWallpaper.bgClass}`}
        style={activeWallpaper.style}
      >
        {/* Soft overlay for custom gallery photo wallpapers to ensure perfect text legibility */}
        {activeWallpaper.hasOverlay && (
          <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />
        )}

        {/* Welcome Kicker Banner */}
        <div className="max-w-md mx-auto text-center my-2 relative z-10">
          <div
            className={`inline-block px-3.5 py-1 rounded-full text-[11px] font-medium shadow-sm transition-colors ${
              activeWallpaper.isLight
                ? "bg-white/95 text-slate-800 border border-slate-300/80 shadow-slate-200/50"
                : "bg-slate-900/90 text-slate-300 border border-slate-800"
            }`}
          >
            🔒 {activeTab === "class"
              ? "Official Class Notice & Announcements Group"
              : activeTab === "school"
              ? "Direct Communication Desk • Fees, Receipts & Official Alerts"
              : "Teacher-Student Academic Doubt Session (5 messages daily quota)"}
          </div>
        </div>

        {/* Zero State */}
        {filteredMessages.length === 0 && (
          <div className="text-center py-16 space-y-2 relative z-10">
            <div
              className={`w-14 h-14 rounded-3xl text-2xl flex items-center justify-center mx-auto shadow-md ${
                activeWallpaper.isLight
                  ? "bg-white border border-slate-250 text-slate-800"
                  : "bg-slate-900/90 border border-slate-800 text-white"
              }`}
            >
              {activeTab === "class" ? "📢" : activeTab === "school" ? "🏫" : "💡"}
            </div>
            <p className={`font-bold text-sm ${activeWallpaper.isLight ? "text-slate-900 font-extrabold" : "text-slate-300"}`}>
              {activeTab === "class"
                ? "Is class group me abhi koi naya message nahi hai."
                : activeTab === "school"
                ? "School desk par abhi koi active message nahi hai."
                : "Apne teacher se doubt poochhne ke liye neeche sandesh likhein."}
            </p>
            <p className={`text-xs max-w-sm mx-auto ${activeWallpaper.isLight ? "text-slate-600 font-medium" : "text-slate-500"}`}>
              {activeTab === "class" && "Jab bhi Teacher ya Admin circular ya homework bhejenge, yahan turant dikhega."}
              {activeTab === "school" && "A6 fee due slip ya fee receipt generate hone par auto message yahan drop hoga."}
              {activeTab === "teacher" && "Student rozana 5 academic sawal seedhe teacher se poochh sakte hain."}
            </p>
          </div>
        )}

        {/* Message Bubble List */}
        {filteredMessages.map((msg) => {
          const isMe = msg.senderRole === currentUserRole && (msg.senderId === currentUserId || (currentUserRole === "ADMIN" && msg.senderRole === "ADMIN"));
          const isFeeSlip = Boolean(msg.feeSlip);
          const isReceipt = msg.feeSlip?.type === "FEE_RECEIPT";

          return (
            <div
              key={msg.id}
              className={`flex flex-col relative z-10 ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%] ${isMe ? "ml-auto" : "mr-auto"}`}
            >
              {/* Sender Name & Role (Shown for non-self in groups) */}
              {!isMe && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span
                    className={`text-[11px] font-bold ${
                      activeWallpaper.isLight ? "text-slate-800 font-black drop-shadow-xs" : "text-slate-300"
                    }`}
                  >
                    {msg.senderName}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                      msg.senderRole === "ADMIN"
                        ? "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                        : msg.senderRole === "TEACHER"
                        ? "bg-purple-500/20 text-purple-500 border border-purple-500/30"
                        : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                    }`}
                  >
                    {msg.senderRole}
                  </span>
                </div>
              )}

              {/* Message Bubble Box */}
              <div
                className={`rounded-2xl p-3 sm:p-3.5 shadow-md relative ${
                  isFeeSlip
                    ? isReceipt
                      ? "bg-gradient-to-br from-emerald-950/95 to-slate-900 border-2 border-emerald-500/60 text-white w-full max-w-md shadow-lg"
                      : "bg-gradient-to-br from-amber-950/95 to-slate-900 border-2 border-amber-500/60 text-white w-full max-w-md shadow-lg"
                    : isMe
                    ? activeWallpaper.isLight
                      ? "bg-[#d9fdd3] text-slate-950 rounded-tr-xs border border-emerald-300/70 shadow-xs"
                      : "bg-[#005c4b] text-white rounded-tr-xs shadow-md"
                    : activeWallpaper.isLight
                    ? "bg-white text-slate-950 rounded-tl-xs border border-slate-200/90 shadow-xs"
                    : "bg-[#202c33] text-slate-100 rounded-tl-xs shadow-md"
                }`}
              >
                {/* ── SPECIAL RENDER: AUTOMATED A6 FEE SLIP OR RECEIPT CARD ── */}
                {isFeeSlip && msg.feeSlip && (
                  <div className="space-y-2.5 pb-1">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <ReceiptText className={`w-4 h-4 ${isReceipt ? "text-emerald-400" : "text-amber-400"}`} />
                        <span className="font-black text-xs uppercase tracking-wider">
                          {isReceipt ? "Official Fee Receipt" : "A6 Demand Fee Slip"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-full font-bold">
                        {msg.feeSlip.monthLabel || msg.feeSlip.month}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-1">
                      <div className="p-2 rounded-xl bg-black/25">
                        <p className="text-[10px] text-slate-300 uppercase font-bold">
                          {isReceipt ? "Amount Received" : "Balance Due"}
                        </p>
                        <p className={`text-base font-black tabular-nums ${isReceipt ? "text-emerald-400" : "text-amber-400"}`}>
                          ₹{((isReceipt ? msg.feeSlip.amount : msg.feeSlip.balanceDue) || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-black/25">
                        <p className="text-[10px] text-slate-300 uppercase font-bold">
                          {isReceipt ? "Receipt No" : "Due Date"}
                        </p>
                        <p className="text-xs font-mono font-bold text-white mt-1">
                          {isReceipt ? msg.feeSlip.receiptNo || "Auto-Gen" : msg.feeSlip.dueDate || "By 10th"}
                        </p>
                      </div>
                    </div>

                    {/* Early Payment 10% Discount Callout */}
                    {!isReceipt && (msg.feeSlip.earlyDiscount ? msg.feeSlip.earlyDiscount > 0 : (new Date().getDate() <= 10)) && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-black text-emerald-300">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            10 तारीख तक 10% OFF
                          </span>
                          <span className="text-emerald-400 font-mono">
                            -₹{Number(msg.feeSlip.earlyDiscount || Math.round((msg.feeSlip.monthlyAmount || msg.feeSlip.amount || msg.feeSlip.balanceDue || 0) * 0.10)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300 text-[10px]">
                          <span>छूट के बाद कुल देय:</span>
                          <span className="font-bold text-white text-xs">
                            ₹{Number(msg.feeSlip.netPayableWithDiscount || ((msg.feeSlip.balanceDue || 0) - (msg.feeSlip.earlyDiscount || 0))).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {Boolean(msg.feeSlip.oldArrears && msg.feeSlip.oldArrears > 0) && (
                          <p className="text-[9px] text-amber-300/90 leading-tight">
                            * 10% छूट केवल चालू माह शुल्क पर लागू है। पुराने बकाए (₹{msg.feeSlip.oldArrears?.toLocaleString("en-IN")}) पर छूट नहीं।
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons on Slip card */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {!isReceipt && onOpenWhatsAppPay && (
                        <button
                          type="button"
                          onClick={() => onOpenWhatsAppPay(msg.feeSlip)}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1 shadow-md transition cursor-pointer active:scale-95"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp Pay</span>
                        </button>
                      )}
                      {isReceipt && onOpenFeeReceipt && (
                        <button
                          type="button"
                          onClick={() => onOpenFeeReceipt(msg.feeSlip)}
                          className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-1 shadow-md transition cursor-pointer active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── ATTACHMENT: PHOTO / IMAGE ── */}
                {msg.attachmentType === "IMAGE" && msg.attachmentUrl && (
                  <div className="mb-2 relative group rounded-xl overflow-hidden border border-black/15 bg-black/10">
                    <img
                      src={msg.attachmentUrl}
                      alt={msg.text || "Shared photo"}
                      className="w-full max-h-72 object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                      onClick={() => setFullscreenMedia({ type: "IMAGE", url: msg.attachmentUrl!, title: msg.text })}
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => setFullscreenMedia({ type: "IMAGE", url: msg.attachmentUrl!, title: msg.text })}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs transition cursor-pointer"
                      title="Badi screen me dekhein"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── ATTACHMENT: VIDEO ── */}
                {msg.attachmentType === "VIDEO" && msg.attachmentUrl && (
                  <div className="mb-2 relative rounded-xl overflow-hidden border border-black/15 bg-black">
                    <video
                      src={msg.attachmentUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-72 rounded-xl object-contain bg-black"
                    />
                  </div>
                )}

                {/* Normal text */}
                {msg.text && (
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words font-medium">
                    {msg.text}
                  </p>
                )}

                {/* Timestamp & double ticks */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                    isFeeSlip
                      ? "text-slate-400"
                      : isMe
                      ? activeWallpaper.isLight
                        ? "text-emerald-800/80"
                        : "text-slate-300"
                      : activeWallpaper.isLight
                      ? "text-slate-500"
                      : "text-slate-400"
                  }`}
                >
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isMe && (
                    <CheckCheck
                      className={`w-3.5 h-3.5 ${activeWallpaper.isLight ? "text-emerald-700" : "text-sky-400"}`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ── BOTTOM INPUT / ACTION BAR ────────────────────────────────────── */}
      <div className="bg-slate-900 border-t border-slate-800 p-2.5 sm:p-3 shrink-0 z-20">
        {/* 1. Student Read-Only Lock in Class Group or School Desk */}
        {currentUserRole === "STUDENT" && (activeTab === "class" || activeTab === "school") ? (
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {activeTab === "class"
                ? "Keval Teachers aur School Admin hi is Class Group me message bhej sakte hain."
                : "Keval School Admin hi is School Desk par official circular, fee slips aur receipts bhej sakte hain."}
            </span>
          </div>
        ) : activeTab === "school" && currentUserRole !== "ADMIN" ? (
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Keval School Admin hi is School Desk par official sandesh bhej sakte hain.
            </span>
          </div>
        ) : activeTab === "teacher" && currentUserRole === "STUDENT" && isTeacherQuotaExceeded ? (
          /* 2. Teacher Chat: Quota Limit Exceeded (5/5) */
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Aapka aaj ka daily quota (<strong>5 messages</strong>) poora ho chuka hai. Agla message kal bhej sakenge.
              </span>
            </div>
            <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20">
              5/5 Used
            </span>
          </div>
        ) : (
          /* 3. Standard Interactive WhatsApp Input */
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            {/* Quota Counter for Student in Teacher Chat */}
            {activeTab === "teacher" && currentUserRole === "STUDENT" && (
              <div className="flex items-center justify-between text-[11px] text-purple-300 px-1 font-semibold">
                <span>Doubt Session with {activeTeacher?.name || "Teacher"}:</span>
                <span className="font-mono bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {5 - studentTeacherQueryCount} / 5 messages remaining today
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Photo Attachment Picker */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isSending || isUploadingMedia}
                className="p-2 sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer active:scale-95 border border-slate-750 flex items-center justify-center shrink-0 disabled:opacity-40"
                title="Photo / Image Bhejein"
              >
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Video Attachment Picker */}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isSending || isUploadingMedia}
                className="p-2 sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition cursor-pointer active:scale-95 border border-slate-750 flex items-center justify-center shrink-0 disabled:opacity-40"
                title="Video Bhejein"
              >
                <Film className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelected}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                className="hidden"
                onChange={handleVideoSelected}
              />

              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={
                  activeTab === "class"
                    ? "Class group me official notice ya sandesh likhein..."
                    : activeTab === "school"
                    ? "School desk ke liye sandesh ya enquiry likhein..."
                    : `Shikshak se sawal poochhein (${5 - studentTeacherQueryCount} baaki)...`
                }
                className="flex-1 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition min-w-0"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-900/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── DRAWER / MODAL: GROUP MEMBERS & CLASS TEACHER INFO ───────────── */}
      {showMemberDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-800 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    {activeClass?.name} Group Members
                  </h3>
                  <p className="text-xs text-slate-400">
                    {classStudents.length} Students • Official Class Group
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMemberDrawer(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Class Teacher Header */}
            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-700/50 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-purple-300">
                Class Teacher (कक्षाध्यापक)
              </span>
              <p className="text-sm font-black text-white">
                {safeTeachers.find(t => t.classId === activeClass?.id)?.name || "Assigned Faculty"}
              </p>
              <p className="text-xs text-purple-200/80">
                Authorized group admin for notices &amp; updates
              </p>
            </div>

            {/* Enrolled Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Enrolled Classmates ({classStudents.length})
              </p>
              {classStudents.map((st, idx) => (
                <div
                  key={st.id || `st_${idx}`}
                  className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-200 font-black text-xs flex items-center justify-center shrink-0">
                      {st.rollNo || idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {st.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        Adm: {st.admissionNo || "N/A"}
                      </p>
                    </div>
                  </div>
                  {st.id === student?.id && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMemberDrawer(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs cursor-pointer active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: WALLPAPER CUSTOMIZER (RESTRICTED STRICTLY TO SCHOOL ADMIN) ── */}
      {showWallpaperModal && currentUserRole === "ADMIN" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-750 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="font-black text-white text-sm">School Chat Wallpaper</h3>
                  <p className="text-[11px] text-slate-400">School Admin Control • Pure School me lagu hoga</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWallpaperModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── OPTION 1: CHOOSE WALLPAPER FROM ADMIN GALLERY / DEVICE FILES ── */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-800 to-indigo-950/70 border-2 border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-black">Admin Gallery se Wallpaper</h4>
                    <p className="text-[10px] text-slate-300">Apne phone ya PC ki gallery se custom photo lagayein</p>
                  </div>
                </div>
                {wallpaperConfig.type === "custom" && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                    Active Gallery
                  </span>
                )}
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryUpload}
              />

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploadingGallery}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploadingGallery ? "Photo Process Ho Rahi Hai..." : "Gallery se Photo Chunein"}</span>
              </button>
            </div>

            {/* ── OPTION 2: CURATED PRESETS (WHITE DOODLE IS DEFAULT) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Preset Wallpapers
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Default: Clean White Doodle
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {WALLPAPER_PRESETS.map((wp) => {
                  const isSelected = wallpaperConfig.type === "preset" && wallpaperConfig.presetId === wp.id;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => handleSelectPreset(wp.id)}
                      className={`h-20 rounded-2xl p-2.5 flex flex-col justify-between text-left border-2 transition cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? "border-emerald-500 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30"
                          : "border-slate-800 hover:border-slate-600"
                      } ${wp.bgClass}`}
                      style={wp.style}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-black drop-shadow-sm truncate ${
                            wp.isLight ? "text-slate-900" : "text-white"
                          }`}
                        >
                          {wp.name}
                        </span>
                        {wp.tag && (
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-500 text-slate-950">
                            {wp.tag}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 self-end drop-shadow-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── RESET TO DEFAULT WHITE DOODLE ── */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToWhiteDefault}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Default White Doodle par Reset Karein</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWallpaperModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-750 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer active:scale-95"
              >
                Band Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: IMAGE PREVIEW & CAPTION (NSTA MESSENGER) ───────────── */}
      {selectedImageFile && imagePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-750 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Send Photo</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedImageFile.name} • {(selectedImageFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedImageFile(null);
                  setImagePreviewUrl(null);
                }}
                disabled={isUploadingMedia}
                className="text-slate-400 hover:text-white p-1 cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview Canvas */}
            <div className="p-3 sm:p-4 bg-slate-950 flex items-center justify-center max-h-[50vh] overflow-hidden">
              <img
                src={imagePreviewUrl}
                alt="Preview"
                className="max-h-[46vh] max-w-full rounded-2xl object-contain shadow-lg"
              />
            </div>

            {/* Caption & Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 space-y-3">
              <input
                type="text"
                value={imageCaption}
                onChange={e => setImageCaption(e.target.value)}
                placeholder="Photo ke sath sandesh ya caption likhein..."
                disabled={isUploadingMedia}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
              />

              {isUploadingMedia && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Photo Upload Ho Rahi Hai...
                    </span>
                    <span className="font-mono">{mediaUploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${mediaUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageFile(null);
                    setImagePreviewUrl(null);
                  }}
                  disabled={isUploadingMedia}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendImage}
                  disabled={isUploadingMedia}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isUploadingMedia ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIDEO PREVIEW & CAPTION (NSTA MESSENGER) ───────────── */}
      {selectedVideoFile && videoPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-750 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Send Video</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedVideoFile.name} • {(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVideoFile(null);
                  setVideoPreviewUrl(null);
                }}
                disabled={isUploadingMedia}
                className="text-slate-400 hover:text-white p-1 cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Preview */}
            <div className="p-3 sm:p-4 bg-black flex items-center justify-center max-h-[50vh] overflow-hidden">
              <video
                src={videoPreviewUrl}
                controls
                playsInline
                className="max-h-[46vh] max-w-full rounded-2xl bg-black"
              />
            </div>

            {/* Caption & Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 space-y-3">
              <input
                type="text"
                value={videoCaption}
                onChange={e => setVideoCaption(e.target.value)}
                placeholder="Video ke sath sandesh ya caption likhein..."
                disabled={isUploadingMedia}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition"
              />

              {isUploadingMedia && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Video Upload Ho Raha Hai...
                    </span>
                    <span className="font-mono">{mediaUploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{ width: `${mediaUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVideoFile(null);
                    setVideoPreviewUrl(null);
                  }}
                  disabled={isUploadingMedia}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendVideo}
                  disabled={isUploadingMedia}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-900/40 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isUploadingMedia ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN MEDIA VIEWER (ZOOM & PLAYBACK) ─────────────────── */}
      {fullscreenMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3 text-white z-10">
            <span className="text-xs sm:text-sm font-bold truncate">
              {fullscreenMedia.title || (fullscreenMedia.type === "IMAGE" ? "Photo Viewer" : "Video Player")}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={fullscreenMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Download Media"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setFullscreenMedia(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Band Karein"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            {fullscreenMedia.type === "IMAGE" ? (
              <img
                src={fullscreenMedia.url}
                alt={fullscreenMedia.title || "Full photo"}
                className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={fullscreenMedia.url}
                controls
                autoPlay
                playsInline
                className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl bg-black"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
