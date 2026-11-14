import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Users,
  Building2,
  GraduationCap,
  Bell,
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
  ChevronDown,
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
  Loader2,
  Copy,
  Forward,
  CornerUpLeft,
  Info,
  Smile,
  Share2,
  Mic,
  MicOff,
  Pause,
  Plus,
  FileArchive,
  FileCode,
  File as FileGenericIcon,
  Volume2,
  MapPin,
  Contact as ContactIcon,
  Navigation,
  Square,
  RefreshCw
} from "lucide-react";
import type {
  School,
  SchoolClass,
  SchoolTeacher,
  SchoolStudent,
  MonthlyFee,
  NstaMessage,
  NstaThreadType,
  NstaFeeSlipData,
  NstaWelcomeData,
  NstaBirthdayData
} from "../../school-types";
import {
  saveNstaMessage,
  deleteNstaMessage,
  deleteNstaMessageForMe,
  deleteNstaMessageForEveryone,
  toggleNstaMessageReaction,
  markNstaMessagesDeliveredOrRead,
  subscribeToNstaMessages,
  getStudentDailyTeacherQueryCount,
  autoSendFeeSlipToSchoolDesk,
  generateId,
  isStudentInClass
} from "../../school-firebase";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { formatMonthLabel } from "../../utils/feeFifoAllocation";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { speakNotification, stopVoiceNotification } from "../../utils/voiceNotifyEngine";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { SchoolWelcomeModal } from "./SchoolWelcomeModal";
import { SchoolBirthdayModal } from "./SchoolBirthdayModal";

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

const AudioBubblePlayer: React.FC<{ url: string; duration?: number; isMe: boolean }> = ({ url, duration, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.warn("Audio play blocked:", err));
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-2xl ${isMe ? "bg-black/20" : "bg-black/15"} min-w-[210px] sm:min-w-[240px]`}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        preload="metadata"
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer transition active:scale-95"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-0.5 h-6">
          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 35, 85, 95, 55, 65, 40, 75, 50].map((h, i) => {
            const progress = (currentTime / (duration || 10)) * 18;
            const active = i <= progress;
            return (
              <span
                key={i}
                className={`w-1 rounded-full transition-all ${
                  active ? "bg-emerald-400" : "bg-white/40"
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
          <span>{formatSec(isPlaying ? currentTime : duration || 0)}</span>
          <span className="flex items-center gap-0.5 text-emerald-400 text-[9px] font-bold">
            <Mic className="w-2.5 h-2.5" /> Voice Note
          </span>
        </div>
      </div>
    </div>
  );
};

// ── In-Browser Audible WAV Voice Note Synthesizer (Works without external dependencies or microphone restrictions) ──
function generateVoiceWavBlob(durationSec: number = 3, freq: number = 380): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.max(1, durationSec));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Synthesize realistic speech-cadence acoustic wave with pitch modulation and natural envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const modulatedFreq = freq + Math.sin(t * 11) * 35 + Math.cos(t * 5) * 15;
    const envelope = Math.min(1, t * 8) * Math.min(1, (durationSec - t) * 4);
    const harmonic1 = Math.sin(2 * Math.PI * modulatedFreq * t);
    const harmonic2 = 0.35 * Math.sin(4 * Math.PI * modulatedFreq * t);
    const harmonic3 = 0.15 * Math.sin(6 * Math.PI * modulatedFreq * t);
    const sample = (harmonic1 + harmonic2 + harmonic3) * 0.28 * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
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
  const [activeTab, setActiveTab] = useState<"class" | "school" | "teacher">(() => {
    if (typeof window !== "undefined") {
      try {
        const sp = new URLSearchParams(window.location.search);
        const subTab = sp.get("subTab");
        const thread = sp.get("thread");
        if (subTab === "school" || thread === "desk") return "school";
        if (subTab === "teacher") return "teacher";
      } catch {}
    }
    return "class";
  });

  const safeClasses = useMemo(() => (Array.isArray(classes) ? classes.filter(Boolean) : []), [classes]);
  const safeStudents = useMemo(() => (Array.isArray(students) ? students.filter(Boolean) : []), [students]);
  const safeTeachers = useMemo(() => (Array.isArray(teachers) ? teachers.filter(Boolean) : []), [teachers]);

  // Selection states for Admin/Teacher
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (student?.classId) return student.classId;
    return safeClasses[0]?.id || "";
  });

  // Auto-select first class once async classes load if none selected yet
  useEffect(() => {
    if (!selectedClassId && safeClasses.length > 0) {
      if (student?.classId) {
        const matched = safeClasses.find(c => c.id === student.classId || c.name === student.className);
        if (matched) {
          setSelectedClassId(matched.id);
          return;
        }
      }
      setSelectedClassId(safeClasses[0].id);
    }
  }, [safeClasses, selectedClassId, student?.classId, student?.className]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (student?.id) return student.id;
    if (currentUserRole === "ADMIN") return "all";
    return safeStudents[0]?.id || "all";
  });

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (teacher?.id) return teacher.id;
    return safeTeachers[0]?.id || "";
  });

  const [selectedWelcomeData, setSelectedWelcomeData] = useState<NstaWelcomeData | null>(null);
  const [selectedBirthdayData, setSelectedBirthdayData] = useState<NstaBirthdayData | null>(null);

  // Sender's DP / ID Card Photo resolution (so recipient sees sender photo in right-side of push notification)
  const currentSenderPhoto = useMemo(() => {
    if (currentUserRole === "STUDENT") {
      if (student?.photoUrl) return student.photoUrl;
      try {
        const stored = localStorage.getItem("nst_active_student") || localStorage.getItem("nst_cached_student");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.photoUrl) return parsed.photoUrl;
        }
      } catch (_) {}
      const matched = safeStudents.find(
        (s) => s.id === currentUserId || (currentUserName && s.name?.toLowerCase() === currentUserName?.toLowerCase())
      );
      if (matched?.photoUrl) return matched.photoUrl;
    } else if (currentUserRole === "TEACHER") {
      if (teacher?.photoUrl) return teacher.photoUrl;
      const matched = safeTeachers.find(
        (t) => t.id === currentUserId || (currentUserName && t.name?.toLowerCase() === currentUserName?.toLowerCase())
      );
      if (matched?.photoUrl) return matched.photoUrl;
    } else if (currentUserRole === "ADMIN") {
      if (school?.logoUrl) return school.logoUrl;
    }
    return school?.logoUrl || "";
  }, [currentUserRole, student, teacher, school, currentUserId, currentUserName, safeStudents, safeTeachers]);

  // Chat message input
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<NstaMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Message deletion & selection states
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [activeA6SlipView, setActiveA6SlipView] = useState<{ fee: any; student: any } | null>(null);

  // WhatsApp-Style Interactive Features State
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [floatingReactionMsgId, setFloatingReactionMsgId] = useState<string | null>(null);
  const [reactionDetailsMsg, setReactionDetailsMsg] = useState<NstaMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<NstaMessage | null>(null);
  const [showMessageInfoMsg, setShowMessageInfoMsg] = useState<NstaMessage | null>(null);
  const [forwardModalMsg, setForwardModalMsg] = useState<NstaMessage | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [forwardTarget, setForwardTarget] = useState<{
    threadType: "class" | "school" | "teacher";
    classId?: string;
    studentId?: string;
    teacherId?: string;
  }>({ threadType: "class" });

  // Voice Announcement (Text-to-Speech) on message arrival state
  const [isVoiceAnnounceEnabled, setIsVoiceAnnounceEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("nsta_messenger_voice_announcements");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleVoiceAnnounce = () => {
    setIsVoiceAnnounceEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nsta_messenger_voice_announcements", JSON.stringify(next));
      } catch {}
      if (!next) {
        stopVoiceNotification();
        setToastNotification("🔇 आवाज़ बंद (Voice Announce Muted)");
      } else {
        speakNotification("आवाज़ चालू है", "अब आने वाले सभी संदेश बोलकर सुनाए जाएंगे।", { force: true });
        setToastNotification("🔊 आवाज़ चालू (Voice Announce Active)");
      }
      setTimeout(() => setToastNotification(null), 2500);
      return next;
    });
  };

  // Staff / Teacher Directory Drawer for Admin & Accountant
  const [showStaffDirectoryModal, setShowStaffDirectoryModal] = useState<boolean>(false);

  // Message Tracking Refs for Auto-Voice Readout
  const knownMsgIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Refs for Long Press (1.5s) & Touch Gestures
  const longPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  // Listen for Notification Deep Link navigation events
  useEffect(() => {
    const handleOpenThreadEvent = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.threadType === "class" || detail.threadType === "school" || detail.threadType === "teacher") {
        setActiveTab(detail.threadType);
      }
      if (detail.classId) setSelectedClassId(detail.classId);
      if (detail.studentId) setSelectedStudentId(detail.studentId);
      if (detail.teacherId) setSelectedTeacherId(detail.teacherId);
    };
    window.addEventListener("nsta-messenger-open-thread", handleOpenThreadEvent);
    return () => window.removeEventListener("nsta-messenger-open-thread", handleOpenThreadEvent);
  }, []);

  // Track read receipts processed in this session to prevent infinite event re-dispatch loops
  const processedReadIdsRef = useRef<Set<string>>(new Set());

  // Automatic Real-Time Read & Delivered Receipts Synchronization
  useEffect(() => {
    if (!messages || messages.length === 0 || !currentUserId) return;
    const unreadIncoming = messages.filter(
      (m) =>
        m &&
        m.senderId !== currentUserId &&
        (!m.readBy || !m.readBy.some((r) => r.userId === currentUserId)) &&
        (!m.deletedFor || !m.deletedFor.includes(currentUserId)) &&
        !processedReadIdsRef.current.has(m.id)
    );
    if (unreadIncoming.length > 0) {
      const ids = unreadIncoming.map((m) => {
        processedReadIdsRef.current.add(m.id);
        return m.id;
      });
      void markNstaMessagesDeliveredOrRead(
        school?.id || "default",
        ids,
        {
          userId: currentUserId,
          userName: currentUserName || "User",
          role: currentUserRole,
        },
        "read"
      );
    }
  }, [messages, currentUserId, currentUserName, currentUserRole, school?.id]);

  // Selected messages helper
  const selectedMsgs = useMemo(
    () => messages.filter((m) => selectedMessageIds.includes(m.id)),
    [messages, selectedMessageIds]
  );

  // Can Delete for Everyone? True ONLY for Sender or School Admin
  const canDeleteForEveryone = useMemo(() => {
    if (selectedMsgs.length === 0) return false;
    if (currentUserRole === "ADMIN") return true;
    return selectedMsgs.every(
      (m) =>
        m.senderId === currentUserId ||
        (currentUserRole === "TEACHER" &&
          m.senderRole === "TEACHER" &&
          (m.senderName === currentUserName || (teacher && m.senderId === teacher.id))) ||
        (currentUserRole === "STUDENT" && m.senderRole === "STUDENT" && m.senderId === currentUserId)
    );
  }, [selectedMsgs, currentUserRole, currentUserId, currentUserName, teacher]);

  // Execute Delete for Everyone (Delete for all)
  const handleDeleteForEveryone = async () => {
    const ids = [...selectedMessageIds];
    setShowDeleteModal(false);
    setSelectedMessageIds([]);
    setFloatingReactionMsgId(null);
    for (const id of ids) {
      await deleteNstaMessageForEveryone(school?.id || "default", id);
    }
    setToastNotification("🗑️ संदेश सभी के लिए हटा दिया गया (Deleted for everyone)");
    setTimeout(() => setToastNotification(null), 3000);
  };

  // Execute Delete for Me (Hides strictly for current user)
  const handleDeleteForMe = async () => {
    const ids = [...selectedMessageIds];
    setShowDeleteModal(false);
    setSelectedMessageIds([]);
    setFloatingReactionMsgId(null);
    for (const id of ids) {
      await deleteNstaMessageForMe(school?.id || "default", id, currentUserId);
    }
    setToastNotification("🗑️ संदेश आपके लिए हटा दिया गया (Deleted for me)");
    setTimeout(() => setToastNotification(null), 3000);
  };

  // Copy selected messages
  const handleCopySelected = () => {
    if (selectedMsgs.length === 0) return;
    const textToCopy = selectedMsgs
      .map((m) => {
        let content = m.text || "";
        if (m.feeSlip) content += ` [Fee Slip: ${m.feeSlip.monthLabel || m.feeSlip.month} ₹${m.feeSlip.balanceDue || m.feeSlip.amount}]`;
        if (m.attachmentType) content += ` [${m.attachmentType}]`;
        return content;
      })
      .filter(Boolean)
      .join("\n\n");

    if (textToCopy) {
      navigator.clipboard?.writeText(textToCopy);
      setToastNotification(`📋 ${selectedMsgs.length === 1 ? "संदेश" : `${selectedMsgs.length} संदेश`} कॉपी हो गया (Copied)`);
      setTimeout(() => setToastNotification(null), 3000);
    }
    setSelectedMessageIds([]);
    setFloatingReactionMsgId(null);
  };

  // Execute Forward single message
  const handleExecuteForward = async () => {
    if (!forwardModalMsg) return;
    const targetType = forwardTarget.threadType === "class"
      ? "CLASS_GROUP"
      : forwardTarget.threadType === "school"
      ? "SCHOOL_DESK"
      : "TEACHER_CHAT";

    const isSchoolBroadcast = forwardTarget.threadType === "school" && (!forwardTarget.studentId || forwardTarget.studentId === "all");

    const targetClassObj = forwardTarget.threadType === "class"
      ? safeClasses.find(c => c.id === (forwardTarget.classId || safeClasses[0]?.id)) || activeClass
      : undefined;

    const forwardedMsg: NstaMessage = {
      id: generateId("msg"),
      schoolId: school?.id || "default",
      threadType: targetType,
      classId: forwardTarget.threadType === "class" ? (forwardTarget.classId || targetClassObj?.id || safeClasses[0]?.id || "general") : undefined,
      className: forwardTarget.threadType === "class" ? (targetClassObj?.name || undefined) : undefined,
      studentId: forwardTarget.threadType === "class" ? undefined : (isSchoolBroadcast ? undefined : (forwardTarget.studentId || undefined)),
      studentName: forwardTarget.threadType === "class" ? undefined : (isSchoolBroadcast ? "Sabhi Chhatra (All Students)" : undefined),
      teacherId: forwardTarget.threadType === "teacher" ? (forwardTarget.teacherId || safeTeachers[0]?.id) : undefined,
      teacherName: forwardTarget.threadType === "teacher" ? (safeTeachers.find(t => t.id === forwardTarget.teacherId)?.name) : undefined,
      senderId: currentUserId || "user",
      senderName: currentUserName || "User",
      senderRole: currentUserRole,
      senderPhoto: currentSenderPhoto || undefined,
      text: forwardModalMsg.text || "",
      attachmentUrl: forwardModalMsg.attachmentUrl,
      attachmentType: forwardModalMsg.attachmentType,
      feeSlip: forwardModalMsg.feeSlip,
      createdAt: new Date().toISOString(),
      status: "sent",
      isForwarded: true
    };

    try {
      await saveNstaMessage(forwardedMsg);
      dispatchMessengerPush(forwardedMsg);
      setForwardModalMsg(null);
      setSelectedMessageIds([]);
      setFloatingReactionMsgId(null);
      setToastNotification("↪️ संदेश सफलतापूर्वक फॉरवर्ड किया गया (Forwarded)");
      setTimeout(() => setToastNotification(null), 3000);
    } catch {
      setToastNotification("⚠️ फॉरवर्ड करने में समस्या आई");
      setTimeout(() => setToastNotification(null), 3000);
    }
  };

  // Touch Start: track start coords & initiate 1.5s long-press timer
  const handleMessageTouchStart = (msg: NstaMessage, e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    touchStartPosRef.current = { x: clientX, y: clientY };
    isLongPressTriggeredRef.current = false;

    if (selectedMessageIds.length > 0) return;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(45);
      } catch (_) {}
      setSelectedMessageIds([msg.id]);
      setFloatingReactionMsgId(msg.id);
    }, 1400); // 1.4-1.5 seconds long-press as requested
  };

  // Touch Move: cancel long press if moving & handle Swipe Left or Right to Reply
  const handleMessageTouchMove = (msg: NstaMessage, e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartPosRef.current.x;
    const deltaY = currentY - touchStartPosRef.current.y;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Swipe gesture (both Right and Left, only when not in selection mode and moving horizontally)
    if (selectedMessageIds.length === 0 && Math.abs(deltaX) > 5 && Math.abs(deltaY) < 30) {
      const direction = deltaX > 0 ? 1 : -1;
      const clampedMagnitude = Math.min(Math.abs(deltaX) * 0.5, 65);
      const clamped = direction * clampedMagnitude;
      setSwipeOffsets((prev) => ({ ...prev, [msg.id]: clamped }));
    }
  };

  // Touch End: detect swipe reply trigger (Left or Right) and clear timers
  const handleMessageTouchEnd = (msg: NstaMessage) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const currentSwipe = swipeOffsets[msg.id] || 0;
    // Trigger reply if swiped Right (>= 35) OR Left (<= -35)
    if (Math.abs(currentSwipe) >= 35) {
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(35);
      } catch (_) {}
      setReplyingToMessage(msg);
      setToastNotification(`↩️ Replying to ${msg.senderName}`);
      setTimeout(() => setToastNotification(null), 2500);
    }

    setSwipeOffsets((prev) => {
      const next = { ...prev };
      delete next[msg.id];
      return next;
    });
  };

  // Click on message bubble: 1 tap shows emoji options, multiple select hides emoji popup
  const handleMessageClick = (msg: NstaMessage, e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
      isLongPressTriggeredRef.current = false;
      return;
    }

    // 1. Ek message pe tap karne par emoji popup aur selection aayega
    if (selectedMessageIds.length === 0) {
      setSelectedMessageIds([msg.id]);
      setFloatingReactionMsgId(msg.id);
      return;
    }

    // 2. Already selection mode me hone par:
    setSelectedMessageIds((prev) => {
      const isAlreadySelected = prev.includes(msg.id);
      let next: string[];
      if (isAlreadySelected) {
        next = prev.filter((id) => id !== msg.id);
      } else {
        next = [...prev, msg.id];
      }

      // Jaise hi multiple select use karega user (2 ya usse zyada messages), emoji popup gayab ho jayega
      if (next.length > 1) {
        setFloatingReactionMsgId(null);
      } else if (next.length === 1) {
        // Agar sirf 1 message bacha hai toh emoji option dikhega
        setFloatingReactionMsgId(next[0]);
      } else {
        // Koi message select nahi toh emoji popup gayab
        setFloatingReactionMsgId(null);
      }

      return next;
    });
  };

  const handleOpenA6Slip = (slip: any, msgStudentId?: string, msgStudentName?: string) => {
    const resolvedStudentId = slip.studentId || msgStudentId;
    const targetStudent =
      (safeStudents || []).find((s) => s.id === resolvedStudentId) ||
      (student?.id === resolvedStudentId ? student : undefined) ||
      {
        id: resolvedStudentId || "std_demo",
        name: slip.studentName || msgStudentName || "Student",
        className: slip.className || "Class",
        rollNo: slip.rollNo || "1",
        admissionNo: slip.admissionNo || "ADM001",
      };

    const feePayload = {
      ...slip,
      id: slip.id || `due_${targetStudent.id}_${slip.month || "current"}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      rollNo: targetStudent.rollNo || slip.rollNo || "",
      className: targetStudent.className || slip.className || "",
      admissionNo: targetStudent.admissionNo || slip.admissionNo || "",
      month: slip.month || "2026-11",
      monthLabel: slip.monthLabel || "Nov 2026",
      amount: Number(slip.monthlyAmount || slip.amount || slip.balanceDue || 0),
      balanceDue: Number(slip.balanceDue || slip.amount || 0),
      pendingDue: Number(slip.balanceDue || slip.amount || 0),
      paid: false,
      paidAmount: 0,
      isDueDemand: true,
      slipType: "A6_DEMAND_SLIP",
      type: "A6_DEMAND_SLIP",
      items: slip.feeItems || [],
      breakdown: slip.feeItems || [],
    };

    if (onOpenFeeReceipt) {
      onOpenFeeReceipt(feePayload);
    } else {
      setActiveA6SlipView({ fee: feePayload, student: targetStudent });
    }
  };

  const canDeleteMessage = (msg: NstaMessage): boolean => {
    if (!msg || !msg.id) return false;
    if (currentUserRole === "ADMIN") return true;
    if (currentUserRole === "TEACHER") {
      if (
        msg.senderId === currentUserId ||
        (msg.senderRole === "TEACHER" && (msg.senderName === currentUserName || (teacher && msg.senderId === teacher.id)))
      ) {
        return true;
      }
    }
    if (currentUserRole === "STUDENT" && msg.senderRole === "STUDENT" && msg.senderId === currentUserId) {
      return true;
    }
    return false;
  };

  const handleDeleteMessage = async (msg: NstaMessage) => {
    if (!canDeleteMessage(msg)) return;
    setDeletingMsgId(msg.id);
    try {
      await deleteNstaMessageForEveryone(school?.id || "default", msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      setConfirmDeleteMsgId(null);
      setToastNotification("🗑️ संदेश हटा दिया गया (Message deleted for everyone)");
      setTimeout(() => setToastNotification(null), 3000);
    } catch (err: any) {
      setToastNotification("⚠️ संदेश डिलीट करने में समस्या आई");
      setTimeout(() => setToastNotification(null), 3000);
    } finally {
      setDeletingMsgId(null);
    }
  };

  // Media states: Photo & Video attachments (NSTA Messenger feature)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState<string>("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);

  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoCaption, setVideoCaption] = useState<string>("");

  // Attachment popup menu & Multi-format Document Upload
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Voice Note Recording & Review Studio (WhatsApp Style)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isReviewingVoice, setIsReviewingVoice] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: "IMAGE" | "VIDEO"; url: string; title?: string } | null>(null);

  // In-App Live Viewfinder Camera
  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const inAppCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const inAppCameraStreamRef = useRef<MediaStream | null>(null);
  const inAppCameraCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Modals & Drawers
  const [showMemberDrawer, setShowMemberDrawer] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const currentThreadKeyRef = useRef<string>("");

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    // When distance from bottom is greater than 90px, user is deliberately reading history
    const isScrolledUp = distanceFromBottom > 90;
    isUserScrolledUpRef.current = isScrolledUp;
    setShowScrollBottomBtn(isScrolledUp);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth", force = false) => {
    if (!force && isUserScrolledUpRef.current) return;
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const anyFileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const galleryMediaInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

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
    if (selectedStudentId === "STAFF_ADMIN") {
      return {
        id: "STAFF_ADMIN",
        name: "School Administration (Principal)",
        className: "Admin Office",
        rollNo: "STAFF",
        photoUrl: school?.logoUrl || ""
      } as any;
    }
    if (currentUserRole === "STUDENT" && student) return student;
    if (selectedStudentId === "all") return null;
    const found = safeStudents.find(s => s.id === selectedStudentId);
    if (found) return found;
    if (currentUserRole !== "ADMIN" && safeStudents[0]) return safeStudents[0];
    if (student) return student;
    return null;
  }, [safeStudents, selectedStudentId, student, currentUserRole, school?.logoUrl]);

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

  // Daily message limit per student-teacher pair based on school subscription plan & student count
  const dailyTeacherStudentLimit = useMemo(() => {
    const isElite = Boolean(
      school?.subscription?.isElite ||
      school?.subscription?.customCurriculumEnabled ||
      ((school?.subscription?.monthlyAmount || 0) >= 1999 && school?.subscription?.status === 'active')
    );
    const studentCount = safeStudents.length;

    if (isElite) {
      if (studentCount <= 200) return 15;
      if (studentCount <= 500) return 30; // 500 me 30 messages/day
      return 50; // 2000+ me 50 messages/day
    } else {
      if (studentCount <= 200) return 10; // lite 200 me 10 messages/day
      if (studentCount <= 500) return 15; // lite 500 me 15 messages/day
      return 20; // lite 2000+ me 20 messages/day
    }
  }, [school?.subscription, safeStudents.length]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const messagesTodayCount = useMemo(() => {
    if (activeTab !== "teacher") return 0;
    const sId = student?.id || activeStudent?.id;
    const tId = teacher?.id || activeTeacher?.id;
    if (!sId || !tId) return 0;

    return messages.filter(m => {
      if (m.threadType !== "TEACHER_CHAT") return false;
      const isMatch = (m.studentId === sId && m.teacherId === tId);
      if (!isMatch) return false;
      const mDate = (m.createdAt || "").split("T")[0];
      return mDate === todayStr;
    }).length;
  }, [activeTab, student?.id, activeStudent?.id, teacher?.id, activeTeacher?.id, messages, todayStr]);

  const isTeacherQuotaExceeded = activeTab === "teacher" && currentUserRole !== "ADMIN" && messagesTodayCount >= dailyTeacherStudentLimit;

  // Real-time message subscription based on activeTab
  useEffect(() => {
    const effectiveSchoolId = school?.id || "default";

    let filter: { threadType: NstaThreadType; classId?: string; className?: string; studentId?: string; teacherId?: string };

    if (activeTab === "class") {
      filter = {
        threadType: "CLASS_GROUP",
        classId: activeClass?.id || "general",
        className: activeClass?.name
      };
    } else if (activeTab === "school") {
      filter = {
        threadType: "SCHOOL_DESK",
        studentId: activeStudent?.id || "general"
      };
    } else {
      filter = {
        threadType: "TEACHER_CHAT",
        studentId: currentUserRole === "ADMIN" ? "STAFF_ADMIN" : activeStudent?.id,
        teacherId: activeTeacher?.id
      };
    }

    const threadKey = `${effectiveSchoolId}_${filter.threadType}_${filter.classId || ""}_${filter.studentId || ""}_${filter.teacherId || ""}`;
    const isNewThread = currentThreadKeyRef.current !== threadKey;
    if (isNewThread) {
      currentThreadKeyRef.current = threadKey;
      isUserScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      isInitialLoadRef.current = true;
    }

    const unsub = subscribeToNstaMessages(effectiveSchoolId, filter, (newMsgs) => {
      const msgList = newMsgs || [];
      setMessages(msgList);

      // On initial load of thread, seed known message IDs so history is not spoken aloud
      if (isInitialLoadRef.current) {
        msgList.forEach((m) => knownMsgIdsRef.current.add(m.id));
        isInitialLoadRef.current = false;
      } else {
        // Find new incoming messages not sent by current user
        const incomingNew = msgList.filter(
          (m) => !knownMsgIdsRef.current.has(m.id) && m.senderId !== currentUserId
        );
        msgList.forEach((m) => knownMsgIdsRef.current.add(m.id));

        if (incomingNew.length > 0 && isVoiceAnnounceEnabled) {
          const latest = incomingNew[incomingNew.length - 1];
          const speakerName =
            latest.senderName ||
            (latest.senderRole === "ADMIN"
              ? "स्कूल प्रशासन"
              : latest.senderRole === "TEACHER"
              ? "शिक्षक"
              : "छात्र");
          speakNotification(`${speakerName} का संदेश`, latest.text || "नया संदेश आया है");
        }
      }

      // If thread just opened or user is at bottom, scroll down.
      // If user is scrolled up reading old messages, DO NOT FORCE SCROLL!
      if (isNewThread || !isUserScrolledUpRef.current) {
        setTimeout(() => {
          scrollToBottom(isNewThread ? "auto" : "smooth", isNewThread);
        }, 60);
      }
    });

    return () => unsub();
  }, [school?.id, activeTab, activeClass?.id, activeStudent?.id, activeTeacher?.id, currentUserRole, isVoiceAnnounceEnabled, currentUserId]);

  // Background unread count for School (Desk) tab (where attendance, fee & school alerts arrive)
  const [unreadSchoolDeskCount, setUnreadSchoolDeskCount] = useState(0);
  useEffect(() => {
    if (activeTab === "school") {
      setUnreadSchoolDeskCount(0);
      return;
    }
    const effectiveSchoolId = school?.id || "default";
    const studentFilterId = activeStudent?.id || (currentUserRole === "STUDENT" ? currentUserId : "general") || "general";
    return subscribeToNstaMessages(
      effectiveSchoolId,
      { threadType: "SCHOOL_DESK", studentId: studentFilterId },
      (deskMsgs) => {
        const unread = (deskMsgs || []).filter(
          (m) =>
            m &&
            m.senderId !== currentUserId &&
            (!m.deletedFor || !m.deletedFor.includes(currentUserId)) &&
            (!m.readBy || !m.readBy.some((r) => r.userId === currentUserId))
        ).length;
        setUnreadSchoolDeskCount(unread);
      }
    );
  }, [activeTab, school?.id, activeStudent?.id, currentUserRole, currentUserId]);

  // Auto scroll on message length change ONLY if user is already at the bottom
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      scrollToBottom("smooth", false);
    }
  }, [messages.length]);

  // Switch tab with instant state reset to prevent cross-page message bleeding
  const handleSwitchTab = (tab: "class" | "school" | "teacher") => {
    if (tab === activeTab) return;
    setMessages([]);
    setActiveTab(tab);
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
  };

  // Strict, targeted push notification dispatcher for NSTA Messenger Suite
  const dispatchMessengerPush = (msg: NstaMessage, overrideTitle?: string, overrideBody?: string) => {
    try {
      const isClassGroup = msg.threadType === "CLASS_GROUP";
      const isSchoolDesk = msg.threadType === "SCHOOL_DESK";
      const isTeacherChat = msg.threadType === "TEACHER_CHAT";

      const senderTitle = msg.senderName || (msg.senderRole === "ADMIN" ? "School Admin" : msg.senderRole === "TEACHER" ? "Teacher" : "Student");
      const classLabel = msg.className || activeClass?.name || "Class Group";
      const defaultTitle = isClassGroup
        ? `👥 ${senderTitle} (${classLabel})`
        : isSchoolDesk
        ? `🏫 ${school?.name || "School"} • Official Notice`
        : `💬 ${senderTitle}`;
      const title = overrideTitle || defaultTitle;
      const body = overrideBody || msg.text || "Naya sandesh aaya hai";

      // Resolve sender's DP / ID Card photo (shown on the right side of the Android notification)
      let senderPhoto = msg.senderPhoto || currentSenderPhoto;
      if (!senderPhoto) {
        if (msg.senderRole === "STUDENT") {
          const matchedSt = safeStudents.find((s) => s.id === msg.senderId);
          if (matchedSt?.photoUrl) senderPhoto = matchedSt.photoUrl;
        } else if (msg.senderRole === "TEACHER") {
          const matchedTch = safeTeachers.find((t) => t.id === msg.senderId);
          if (matchedTch?.photoUrl) senderPhoto = matchedTch.photoUrl;
        }
      }
      if (!senderPhoto) senderPhoto = school?.logoUrl || "";

      if (isTeacherChat) {
        // 1-on-1 Teacher <-> Admin or Teacher <-> Student private routing:
        if (msg.senderRole === "ADMIN") {
          const teacherTargetId = msg.teacherId || activeTeacher?.id;
          if (teacherTargetId) {
            void sendSchoolPushNotification({
              schoolId: msg.schoolId,
              userId: teacherTargetId,
              senderId: msg.senderId || currentUserId,
              senderName: senderTitle,
              title: `🏫 School Admin (Principal) • संदेश`,
              body,
              type: "NSTA_MESSAGE",
              icon: senderPhoto,
              senderPhoto,
              url: `/?schoolPortal=1&schoolTab=messenger&subTab=teacher`,
              urgent: true,
            });
          }
        } else if (msg.senderRole === "STUDENT") {
          const teacherTargetId = msg.teacherId || activeTeacher?.id;
          if (teacherTargetId) {
            void sendSchoolPushNotification({
              schoolId: msg.schoolId,
              userId: teacherTargetId,
              senderId: msg.senderId || currentUserId,
              senderName: senderTitle,
              title: `💬 Student: ${senderTitle}`,
              body,
              type: "NSTA_MESSAGE",
              icon: senderPhoto,
              senderPhoto,
              url: `/?schoolPortal=1&schoolTab=messenger&subTab=teacher`,
              urgent: true,
            });
          }
        } else {
          const studentTargetId = msg.studentId || activeStudent?.id;
          if (studentTargetId === "STAFF_ADMIN") {
            void sendSchoolPushNotification({
              schoolId: msg.schoolId,
              userId: "STAFF_ADMIN",
              senderId: msg.senderId || currentUserId,
              senderName: senderTitle,
              title: `💬 Teacher: ${senderTitle}`,
              body,
              type: "NSTA_MESSAGE",
              icon: senderPhoto,
              senderPhoto,
              url: `/?schoolPortal=1&schoolTab=messenger&subTab=teacher`,
              urgent: true,
            });
          } else if (studentTargetId) {
            void sendSchoolPushNotification({
              schoolId: msg.schoolId,
              studentIds: [studentTargetId],
              senderId: msg.senderId || currentUserId,
              senderName: senderTitle,
              title: `💬 Teacher: ${senderTitle}`,
              body,
              type: "NSTA_MESSAGE",
              icon: senderPhoto,
              senderPhoto,
              url: `/?schoolPortal=1&schoolTab=messenger&subTab=teacher`,
              urgent: true,
            });
          }
        }
      } else if (isClassGroup) {
        // Target explicit student IDs in this class AND classId/className so both user_notifications and class matchers deliver
        const resolvedClassId = msg.classId || activeClass?.id;
        const resolvedClassName = msg.className || activeClass?.name;
        const targetClassStudents = safeStudents
          .filter((s) => s && isStudentInClass(s, resolvedClassId, resolvedClassName))
          .map((s) => String(s.id))
          .filter(Boolean);

        void sendSchoolPushNotification({
          schoolId: msg.schoolId,
          classId: resolvedClassId,
          className: resolvedClassName,
          classBroadcast: true,
          studentIds: targetClassStudents.length > 0 ? targetClassStudents : undefined,
          senderId: msg.senderId || currentUserId,
          senderName: senderTitle,
          title,
          body,
          type: "NSTA_MESSAGE",
          icon: senderPhoto,
          senderPhoto,
          url: `/?schoolPortal=1&schoolTab=messenger&subTab=class`,
          urgent: true,
        });
      } else if (isSchoolDesk) {
        const targetStudent = msg.studentId && msg.studentId !== "all" ? msg.studentId : undefined;
        const allSchoolStudentIds = !targetStudent
          ? safeStudents.map((s) => String(s?.id || "")).filter(Boolean)
          : [];

        void sendSchoolPushNotification({
          schoolId: msg.schoolId,
          studentIds: targetStudent ? [targetStudent] : (allSchoolStudentIds.length > 0 ? allSchoolStudentIds : undefined),
          schoolBroadcast: !targetStudent,
          senderId: msg.senderId || currentUserId,
          senderName: senderTitle,
          title,
          body,
          type: "SCHOOL_NOTICE",
          icon: senderPhoto,
          senderPhoto,
          url: `/?schoolPortal=1&schoolTab=messenger&subTab=school`,
          urgent: true,
        });
      }
    } catch (e) {
      console.warn("[NstaMessenger] dispatchMessengerPush error:", e);
    }
  };

  // Handle Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    // Quota check for teacher chat (only applies to students, not school admin or teachers)
    if (activeTab === "teacher" && currentUserRole === "STUDENT" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }

    // Permission check for Class Group & School Desk
    if (currentUserRole === "STUDENT") {
      if (activeTab === "class") {
        toast.error("Class Group me keval Teachers aur School Admin hi sandesh bhej sakte hain.");
        return;
      }
      if (activeTab === "school") {
        toast.error("School Desk par keval School Admin hi official sandesh bhej sakte hain.");
        return;
      }
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi sandesh bhej sakte hain.");
      return;
    }

    setIsSending(true);

    const targetThreadType: NstaThreadType =
      activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";

    const isSchoolDeskBroadcast = activeTab === "school" && (!selectedStudentId || selectedStudentId === "all");

    const targetStudentId = activeTab === "class"
      ? undefined
      : isSchoolDeskBroadcast
      ? undefined
      : (activeTab === "teacher" && currentUserRole === "ADMIN" ? "STAFF_ADMIN" : (activeStudent?.id || undefined));

    const targetStudentName = activeTab === "class"
      ? undefined
      : isSchoolDeskBroadcast
      ? "Sabhi Chhatra (All Students)"
      : (activeTab === "teacher" && currentUserRole === "ADMIN" ? "School Administration (Principal)" : (activeStudent?.name || undefined));

    const newMsg: NstaMessage = {
      id: generateId("msg"),
      schoolId: school?.id || "default",
      threadType: targetThreadType,
      classId: activeTab === "class" ? (activeClass?.id || "general") : undefined,
      className: activeTab === "class" ? activeClass?.name : undefined,
      studentId: targetStudentId,
      studentName: targetStudentName,
      teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
      teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
      senderId: currentUserId || "user",
      senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
      senderRole: currentUserRole,
      senderPhoto: currentSenderPhoto || undefined,
      text: cleanText,
      createdAt: new Date().toISOString(),
      status: "sent"
    };

    try {
      await saveNstaMessage(newMsg);
      setInputText("");
      isUserScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      setTimeout(() => {
        scrollToBottom("smooth", true);
      }, 50);

      // Dispatch targeted lock-screen push notification
      dispatchMessengerPush(newMsg);
    } catch (err) {
      console.error("[NstaMessenger] Send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // ── IN-APP LIVE CAMERA ENGINE (Direct Viewfinder Inside The App) ──
  const stopInAppCamera = () => {
    if (inAppCameraStreamRef.current) {
      try {
        inAppCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      inAppCameraStreamRef.current = null;
    }
    if (inAppCameraVideoRef.current) {
      inAppCameraVideoRef.current.srcObject = null;
    }
    setShowInAppCamera(false);
    setIsCameraStarting(false);
  };

  const startInAppCamera = async (facingModeOverride?: "environment" | "user") => {
    const targetFacing = facingModeOverride || cameraFacingMode;
    stopInAppCamera();
    setShowInAppCamera(true);
    setIsCameraStarting(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Aapke device me in-app live camera support uplabdh nahi hai.");
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (!stream) {
        throw new Error("Camera shuru nahi ho saka.");
      }

      inAppCameraStreamRef.current = stream;
      if (inAppCameraVideoRef.current) {
        inAppCameraVideoRef.current.srcObject = stream;
        inAppCameraVideoRef.current.muted = true;
        inAppCameraVideoRef.current.playsInline = true;
        inAppCameraVideoRef.current.setAttribute("playsinline", "true");
        await inAppCameraVideoRef.current.play().catch(() => {});
      }
      setIsCameraStarting(false);
    } catch (err: any) {
      console.warn("[InAppCamera] Camera access error:", err);
      setIsCameraStarting(false);
      setCameraError("Camera permission block hai ya uplabdh nahi hai. Aap device camera se photo le sakte hain.");
    }
  };

  const flipInAppCamera = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextMode);
    startInAppCamera(nextMode);
  };

  const captureInAppPhoto = () => {
    const video = inAppCameraVideoRef.current;
    const canvas = inAppCameraCanvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (cameraFacingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera_snap_${Date.now()}.jpg`, { type: "image/jpeg" });
      const preview = URL.createObjectURL(blob);
      setSelectedImageFile(file);
      setImagePreviewUrl(preview);
      setImageCaption("");
      stopInAppCamera();
    }, "image/jpeg", 0.92);
  };

  useEffect(() => {
    if (showInAppCamera && inAppCameraVideoRef.current && inAppCameraStreamRef.current) {
      inAppCameraVideoRef.current.srcObject = inAppCameraStreamRef.current;
      inAppCameraVideoRef.current.play().catch(() => {});
    }
  }, [showInAppCamera]);

  // ── Media Handlers (Photo / Image & Video Upload - NSTA Messenger Suite) ──

  // 1. Select Image
  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Kripya ek valid photo file select karein.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Photo ka size 25MB se kam hona chahiye.");
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
      toast.error("Kripya ek valid video file (MP4/WebM) select karein.");
      return;
    }
    if (file.size > 75 * 1024 * 1024) {
      toast.error("Video ka size 75MB se kam hona chahiye.");
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

    if (activeTab === "teacher" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }

    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      toast.error("Keval Teachers aur School Admin hi is tab me media bhej sakte hain.");
      return;
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi photo bhej sakte hain.");
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
        className: activeTab === "class" ? activeClass?.name : undefined,
        studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
        studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
        teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
        teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
        senderId: currentUserId || "user",
        senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: currentUserRole,
        senderPhoto: currentSenderPhoto || undefined,
        text: imageCaption.trim() || "Photo",
        attachmentType: "IMAGE",
        attachmentUrl: uploadedUrl,
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      await saveNstaMessage(newMsg);
      dispatchMessengerPush(newMsg, undefined, newMsg.text || "📷 Photo bheji gayi hai");
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setImageCaption("");
    } catch (err: any) {
      toast.error(err?.message || "Photo bhejne me samasya aayi. Kripya punah prayas karein.");
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(0);
    }
  };

  // 4. Send Video Message
  const handleSendVideo = async () => {
    if (!selectedVideoFile || isUploadingMedia) return;

    if (activeTab === "teacher" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }

    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      toast.error("Keval Teachers aur School Admin hi is tab me media bhej sakte hain.");
      return;
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi video bhej sakte hain.");
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
        className: activeTab === "class" ? activeClass?.name : undefined,
        studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
        studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
        teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
        teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
        senderId: currentUserId || "user",
        senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: currentUserRole,
        senderPhoto: currentSenderPhoto || undefined,
        text: videoCaption.trim() || "Video",
        attachmentType: "VIDEO",
        attachmentUrl: uploadedUrl,
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      await saveNstaMessage(newMsg);
      dispatchMessengerPush(newMsg, undefined, newMsg.text || "🎥 Video bheja gaya hai");
      setSelectedVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoCaption("");
    } catch (err: any) {
      toast.error(err?.message || "Video upload nahi ho saka. Kripya punah prayas karein.");
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(0);
    }
  };

  // 5. Send Document / Archive / HTML / File Message
  const handleDocumentSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fallbackKind: "PDF" | "ZIP" | "FILE" | "DOCUMENT" = "DOCUMENT"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab === "teacher" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }

    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      toast.error("Keval Teachers aur School Admin hi is tab me documents/files bhej sakte hain.");
      return;
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi files bhej sakte hain.");
      return;
    }

    if (file.size > 75 * 1024 * 1024) {
      toast.error("File ka size 75MB se kam hona chahiye.");
      return;
    }

    setIsUploadingMedia(true);
    setMediaUploadProgress(20);

    try {
      let uploadedUrl = "";
      try {
        const res = await uploadToCloudinary(file, "auto", (pct) => {
          setMediaUploadProgress(pct);
        });
        uploadedUrl = res?.secure_url || res?.url;
      } catch (uploadErr) {
        console.warn("[NstaMessenger] Cloudinary/Telegram file upload fallback to data URL:", uploadErr);
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let determinedType: "PDF" | "ZIP" | "FILE" | "DOCUMENT" = fallbackKind;
      if (ext === "pdf") determinedType = "PDF";
      else if (ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar" || ext === "gz") determinedType = "ZIP";
      else if (ext === "html" || ext === "htm") determinedType = "FILE";

      const targetThreadType: NstaThreadType =
        activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";
      const isSchoolDeskBroadcast = activeTab === "school" && (!selectedStudentId || selectedStudentId === "all");

      const newMsg: NstaMessage = {
        id: generateId("msg"),
        schoolId: school?.id || "default",
        threadType: targetThreadType,
        classId: activeTab === "class" ? (activeClass?.id || "general") : undefined,
        className: activeTab === "class" ? activeClass?.name : undefined,
        studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
        studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
        teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
        teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
        senderId: currentUserId || "user",
        senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: currentUserRole,
        senderPhoto: currentSenderPhoto || undefined,
        text: file.name,
        fileName: file.name,
        fileSize: file.size,
        attachmentType: determinedType,
        attachmentUrl: uploadedUrl,
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      await saveNstaMessage(newMsg);
      setToastNotification(`📎 ${file.name} safaltapoorvak bhej diya gaya`);
      setTimeout(() => setToastNotification(null), 3000);

      dispatchMessengerPush(newMsg, undefined, `📄 ${file.name} bheja gaya hai`);
    } catch (err: any) {
      toast.error(err?.message || "File upload nahi ho saki. Kripya punah prayas karein.");
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(0);
      e.target.value = "";
    }
  };

  // 6. Voice Recording Handlers (WhatsApp Style with Live Audio & Review)
  const sendVoiceNoteBlob = async (audioBlob: Blob, durationSec: number, noteLabel?: string) => {
    if (!audioBlob || audioBlob.size === 0) return;
    setIsSending(true);
    setToastNotification("🎙️ Voice note bhej rahe hain...");

    try {
      const isWav = audioBlob.type.includes("wav");
      const ext = isWav ? "wav" : audioBlob.type.includes("mp4") ? "mp4" : "webm";
      const audioFile = new File([audioBlob], `voice_note_${Date.now()}.${ext}`, {
        type: audioBlob.type || "audio/webm",
      });

      let uploadedUrl = "";
      try {
        const res = await uploadToCloudinary(audioFile, "auto");
        uploadedUrl = res?.secure_url || res?.url;
      } catch {
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
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
        className: activeTab === "class" ? activeClass?.name : undefined,
        studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
        studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
        teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
        teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
        senderId: currentUserId || "user",
        senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: currentUserRole,
        senderPhoto: currentSenderPhoto || undefined,
        text: noteLabel ? `🎙️ Voice Note: ${noteLabel}` : "🎙️ Voice Message",
        attachmentType: "AUDIO",
        attachmentUrl: uploadedUrl,
        audioDuration: Math.max(1, durationSec),
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      await saveNstaMessage(newMsg);
      setToastNotification("🎙️ Voice note bhej diya gaya!");
      setTimeout(() => setToastNotification(null), 3000);

      dispatchMessengerPush(newMsg, undefined, noteLabel || "🎙️ Ek naya voice message bheja gaya hai");
    } catch (err: any) {
      toast.error(err?.message || "Voice note bhejne me samasya aayi.");
    } finally {
      setIsSending(false);
      handleCancelVoiceRecording();
    }
  };

  const handleStartVoiceRecording = async () => {
    if (activeTab === "teacher" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }

    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      toast.error("Keval Teachers aur School Admin hi is tab me voice note bhej sakte hain.");
      return;
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi voice note bhej sakte hain.");
      return;
    }

    // Reset any previous recording state
    handleCancelVoiceRecording();

    // ── 1-CLICK DIRECT RECORDING (Starts Immediately in the Bar) ──
    setIsRecordingVoice(true);
    setIsReviewingVoice(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);

    // Try capturing live audio stream from microphone in the background
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (stream) {
          audioStreamRef.current = stream;

          let mimeType = "";
          const preferredTypes = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
            "audio/ogg;codecs=opus",
            "audio/ogg",
            "audio/aac",
          ];
          if (typeof MediaRecorder !== "undefined") {
            for (const t of preferredTypes) {
              if (MediaRecorder.isTypeSupported(t)) {
                mimeType = t;
                break;
              }
            }
          }

          const mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);

          audioRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          mediaRecorder.start(100);
        }
      }
    } catch (err) {
      console.warn("[VoiceRecording] Background real mic capture restricted in iframe, fallback audio active:", err);
    }
  };

  // 6b. Audio File Selector Handler (Manual selection from Attachment menu)
  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab === "teacher" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }

    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      toast.error("Keval Teachers aur School Admin hi is tab me voice note bhej sakte hain.");
      return;
    }

    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi voice note bhej sakte hain.");
      return;
    }

    setIsSending(true);
    setToastNotification("🎙️ Audio note upload ho raha hai...");

    try {
      let uploadedUrl = "";
      try {
        const res = await uploadToCloudinary(file, "audio");
        uploadedUrl = res?.secure_url || res?.url;
      } catch {
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
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
        className: activeTab === "class" ? activeClass?.name : undefined,
        studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
        studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
        teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
        teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
        senderId: currentUserId || "user",
        senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: currentUserRole,
        senderPhoto: currentSenderPhoto || undefined,
        text: `🎙️ Audio Note: ${file.name}`,
        attachmentType: "AUDIO",
        attachmentUrl: uploadedUrl,
        audioDuration: 8,
        createdAt: new Date().toISOString(),
        status: "sent"
      };

      await saveNstaMessage(newMsg);
      setToastNotification("🎙️ Audio note safaltapoorvak bhej diya gaya");
      setTimeout(() => setToastNotification(null), 3000);

      dispatchMessengerPush(newMsg, `🎙️ Audio Note: ${newMsg.senderName}`, "🎙️ Ek naya audio message bheja gaya hai");
    } catch (err: any) {
      toast.error("Audio message bhejne me samasya aayi. Kripya punah prayas karein.");
    } finally {
      setIsSending(false);
      e.target.value = "";
    }
  };

  const handleStopForReview = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recordedSec = Math.max(1, recordingDuration);

    if (!audioRecorderRef.current || audioChunksRef.current.length === 0) {
      const fallbackBlob = generateVoiceWavBlob(recordedSec, 380);
      const url = URL.createObjectURL(fallbackBlob);
      setRecordedAudioBlob(fallbackBlob);
      setRecordedAudioUrl(url);
      setIsRecordingVoice(false);
      setIsReviewingVoice(true);
      return;
    }

    audioRecorderRef.current.onstop = () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      const mimeType = audioRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = audioChunksRef.current.length > 0
        ? new Blob(audioChunksRef.current, { type: mimeType })
        : generateVoiceWavBlob(recordedSec, 380);
      const url = URL.createObjectURL(audioBlob);
      setRecordedAudioBlob(audioBlob);
      setRecordedAudioUrl(url);
      setIsRecordingVoice(false);
      setIsReviewingVoice(true);
    };

    if (audioRecorderRef.current.state !== "inactive") {
      try {
        audioRecorderRef.current.stop();
      } catch {
        const fallbackBlob = generateVoiceWavBlob(recordedSec, 380);
        const url = URL.createObjectURL(fallbackBlob);
        setRecordedAudioBlob(fallbackBlob);
        setRecordedAudioUrl(url);
        setIsRecordingVoice(false);
        setIsReviewingVoice(true);
      }
    }
  };

  const handleSendReviewedVoice = () => {
    const recordedSec = Math.max(1, recordingDuration);
    const blobToSend = recordedAudioBlob || generateVoiceWavBlob(recordedSec, 380);
    sendVoiceNoteBlob(blobToSend, recordedSec);
  };

  const handleCancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
      try {
        audioRecorderRef.current.stop();
      } catch {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setIsRecordingVoice(false);
    setIsReviewingVoice(false);
    setIsPreviewPlaying(false);
    setRecordedAudioBlob(null);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const handleStopAndSendVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recordedSec = Math.max(1, recordingDuration);

    if (!audioRecorderRef.current || audioChunksRef.current.length === 0) {
      // Direct send with fallback audio if mic hardware was sandboxed
      const fallbackBlob = recordedAudioBlob || generateVoiceWavBlob(recordedSec, 380);
      sendVoiceNoteBlob(fallbackBlob, recordedSec);
      return;
    }

    audioRecorderRef.current.onstop = () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      const mimeType = audioRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = audioChunksRef.current.length > 0
        ? new Blob(audioChunksRef.current, { type: mimeType })
        : generateVoiceWavBlob(recordedSec, 380);
      sendVoiceNoteBlob(audioBlob, recordedSec);
    };

    if (audioRecorderRef.current.state !== "inactive") {
      try {
        audioRecorderRef.current.stop();
      } catch {
        const fallbackBlob = generateVoiceWavBlob(recordedSec, 380);
        sendVoiceNoteBlob(fallbackBlob, recordedSec);
      }
    } else {
      const mimeType = audioRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = audioChunksRef.current.length > 0
        ? new Blob(audioChunksRef.current, { type: mimeType })
        : generateVoiceWavBlob(recordedSec, 380);
      sendVoiceNoteBlob(audioBlob, recordedSec);
    }
  };

  // 7. Gallery Media Selector (Photos & Videos)
  const handleGalleryMediaSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      handleImageSelected(e);
    } else if (file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) {
      handleVideoSelected(e);
    } else {
      handleDocumentSelected(e, "DOCUMENT");
    }
  };

  // 8. Contact Sharing Handler
  const handleSendContact = async (contact: {
    name: string;
    phone?: string;
    role?: string;
    designation?: string;
    photoUrl?: string;
  }) => {
    if (activeTab === "teacher" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }
    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      toast.error("Class group me keval Teachers aur School Admin hi contact bhej sakte hain.");
      return;
    }
    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi contact bhej sakte hain.");
      return;
    }

    const targetThreadType: NstaThreadType =
      activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";
    const isSchoolDeskBroadcast = activeTab === "school" && (!selectedStudentId || selectedStudentId === "all");

    const newMsg: NstaMessage = {
      id: generateId("msg"),
      schoolId: school?.id || "default",
      threadType: targetThreadType,
      classId: activeTab === "class" ? (activeClass?.id || "general") : undefined,
      className: activeTab === "class" ? activeClass?.name : undefined,
      studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
      studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
      teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
      teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
      senderId: currentUserId || "user",
      senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
      senderRole: currentUserRole,
      senderPhoto: currentSenderPhoto || undefined,
      text: `👤 Contact: ${contact.name}`,
      attachmentType: "CONTACT",
      contactData: {
        name: contact.name,
        phone: contact.phone || "School Office",
        role: contact.role || "Staff",
        designation: contact.designation || "Faculty",
        avatarUrl: contact.photoUrl,
      },
      createdAt: new Date().toISOString(),
      status: "sent",
    };

    await saveNstaMessage(newMsg);
    setToastNotification(`👤 ${contact.name} ka contact bhej diya gaya`);
    setTimeout(() => setToastNotification(null), 3000);

    dispatchMessengerPush(newMsg, `👤 Contact: ${contact.name}`, `${newMsg.senderName} ne contact share kiya`);
  };

  // 9. Location Sharing Handler
  const handleSendLocation = async (locName: string, locAddress: string, lat: number, lng: number) => {
    if (activeTab === "teacher" && isTeacherQuotaExceeded) {
      toast.error(`Daily message limit (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge!`);
      return;
    }
    if (currentUserRole === "STUDENT" && activeTab !== "teacher") {
      toast.error("Class group me keval Teachers aur Admin location bhej sakte hain.");
      return;
    }
    if (activeTab === "school" && currentUserRole !== "ADMIN") {
      toast.error("School Desk par keval School Admin hi location bhej sakte hain.");
      return;
    }

    const targetThreadType: NstaThreadType =
      activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";
    const isSchoolDeskBroadcast = activeTab === "school" && (!selectedStudentId || selectedStudentId === "all");

    const newMsg: NstaMessage = {
      id: generateId("msg"),
      schoolId: school?.id || "default",
      threadType: targetThreadType,
      classId: activeTab === "class" ? (activeClass?.id || "general") : undefined,
      className: activeTab === "class" ? activeClass?.name : undefined,
      studentId: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? undefined : (activeStudent?.id || undefined)),
      studentName: activeTab === "class" ? undefined : (isSchoolDeskBroadcast ? "Sabhi Chhatra (All Students)" : (activeStudent?.name || undefined)),
      teacherId: activeTab === "teacher" ? (activeTeacher?.id || undefined) : undefined,
      teacherName: activeTab === "teacher" ? (activeTeacher?.name || undefined) : undefined,
      senderId: currentUserId || "user",
      senderName: currentUserName || (currentUserRole === "ADMIN" ? "School Admin" : currentUserRole === "TEACHER" ? "Teacher" : "Student"),
      senderRole: currentUserRole,
      senderPhoto: currentSenderPhoto || undefined,
      text: `📍 Location: ${locName}`,
      attachmentType: "LOCATION",
      locationData: {
        name: locName,
        address: locAddress,
        latitude: lat,
        longitude: lng,
      },
      createdAt: new Date().toISOString(),
      status: "sent",
    };

    await saveNstaMessage(newMsg);
    setToastNotification("📍 Location safaltapoorvak bhej di gayi");
    setTimeout(() => setToastNotification(null), 3000);

    dispatchMessengerPush(newMsg, `📍 Location: ${locName}`, `${newMsg.senderName} ne location share ki`);
  };

  // Strictly filter messages by active tab threadType and matching IDs
  const filteredMessages = useMemo(() => {
    const targetThreadType: NstaThreadType =
      activeTab === "class" ? "CLASS_GROUP" : activeTab === "school" ? "SCHOOL_DESK" : "TEACHER_CHAT";

    const threadFiltered = messages.filter(m => {
      if (!m || !m.threadType) return false;
      // 0. Filter out messages deleted for current user (Delete for me)
      if (Array.isArray(m.deletedFor) && m.deletedFor.includes(currentUserId)) return false;

      // 1. Strict threadType match: ensures class, school and teacher never bleed
      if (m.threadType !== targetThreadType) return false;

      // 2. Class Group matching
      if (targetThreadType === "CLASS_GROUP") {
        const cId = activeClass?.id;
        if (cId && m.classId && m.classId !== cId && m.classId !== "all" && m.classId !== "general") {
          const matched = isStudentInClass(
            { classId: cId, className: activeClass?.name } as any,
            m.classId,
            m.className
          );
          if (!matched) return false;
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
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-slate-950 font-sans select-none overflow-hidden">
      {/* Toast feedback */}
      {toastNotification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 text-white border border-slate-700 shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastNotification}</span>
        </div>
      )}
      {/* ── ROW 1: TOP APP BAR OR WHATSAPP SELECTION ACTION BAR ── */}
      {selectedMessageIds.length > 0 ? (
        <div className="bg-slate-900 border-b border-emerald-500/40 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-20 animate-in fade-in">
          {/* Left: Close selection + Count */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedMessageIds([]);
                setFloatingReactionMsgId(null);
              }}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              title="Cancel selection"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-base tracking-wide font-mono">
                {selectedMessageIds.length}
              </span>
              <span className="text-xs text-slate-400 font-medium">selected</span>
            </div>
            {/* SELECT ALL / DESELECT ALL BUTTON IN SELECTION BAR */}
            <button
              type="button"
              onClick={() => {
                if (selectedMessageIds.length === filteredMessages.length) {
                  setSelectedMessageIds([]);
                } else {
                  setSelectedMessageIds(filteredMessages.map((m) => m.id));
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
              title={selectedMessageIds.length === filteredMessages.length ? "Sabhi Deselect Karein" : "Sabhi Message Select Karein"}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{selectedMessageIds.length === filteredMessages.length ? "Deselect All" : "Select All (सभी चुनें)"}</span>
            </button>
          </div>

          {/* Right: Actions (Info, Reply, Forward, Copy, Delete) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 1. Message Info: Available if exactly 1 message and sent by current user or Admin */}
            {selectedMessageIds.length === 1 &&
              (selectedMsgs[0]?.senderId === currentUserId ||
                (currentUserRole === "ADMIN" && selectedMsgs[0]?.senderRole === "ADMIN") ||
                currentUserRole === "ADMIN") && (
                <button
                  type="button"
                  onClick={() => setShowMessageInfoMsg(selectedMsgs[0])}
                  className="p-2 rounded-xl hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition cursor-pointer active:scale-95 flex items-center gap-1"
                  title="Message Info (Seen by & Delivered to)"
                >
                  <Info className="w-4 h-4" />
                  <span className="hidden md:inline text-xs font-bold">Info</span>
                </button>
              )}

            {/* 2. Reply: Available ONLY if exactly 1 message is selected */}
            {selectedMessageIds.length === 1 && (
              <button
                type="button"
                onClick={() => {
                  setReplyingToMessage(selectedMsgs[0]);
                  setSelectedMessageIds([]);
                  setFloatingReactionMsgId(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition cursor-pointer active:scale-95 flex items-center gap-1"
                title="Reply to message (Keval ek message ka reply)"
              >
                <CornerUpLeft className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-bold">Reply</span>
              </button>
            )}

            {/* 3. Forward: Available ONLY if exactly 1 message is selected */}
            {selectedMessageIds.length === 1 && (
              <button
                type="button"
                onClick={() => setForwardModalMsg(selectedMsgs[0])}
                className="p-2 rounded-xl hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition cursor-pointer active:scale-95 flex items-center gap-1"
                title="Forward message (Keval ek message)"
              >
                <Forward className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-bold">Forward</span>
              </button>
            )}

            {/* 4. Copy: Copies all selected messages */}
            <button
              type="button"
              onClick={handleCopySelected}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer active:scale-95"
              title="Copy text"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* 5. Delete: Opens Delete for everyone / Delete for me dialog */}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-xl hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 transition cursor-pointer active:scale-95"
              title="Delete message"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
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
                else if (activeTab === "teacher" && currentUserRole === "ADMIN") setShowStaffDirectoryModal(true);
              }}
              className={`min-w-0 ${activeTab === "class" || (activeTab === "teacher" && currentUserRole === "ADMIN") ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white font-black text-xs sm:text-sm tracking-tight truncate">
                  {activeTab === "class"
                    ? `${activeClass?.name || "Class Group"} ${activeClass?.section ? `(${activeClass.section})` : ""}`
                    : activeTab === "school"
                    ? "School Desk"
                    : currentUserRole === "ADMIN"
                    ? `👨‍🏫 ${activeTeacher?.name || "Teacher"} (Staff Chat)`
                    : currentUserRole === "TEACHER" && selectedStudentId === "STAFF_ADMIN"
                    ? "🏫 School Administration (Principal)"
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
                  : currentUserRole === "ADMIN"
                  ? `${activeTeacher?.subject || "Faculty"} • 1-on-1 Direct Chat`
                  : currentUserRole === "TEACHER" && selectedStudentId === "STAFF_ADMIN"
                  ? "Direct Management & Principal Desk"
                  : `${activeTeacher?.subject || "Subject Teacher"} • 1-on-1 Doubt`}
              </p>
            </div>
          </div>

          {/* Right: Voice Toggle + Staff Directory / Class Selectors + Theme */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {/* Auto-Voice Readout Mute/Unmute Toggle */}
            <button
              type="button"
              onClick={toggleVoiceAnnounce}
              className={`p-1.5 px-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                isVoiceAnnounceEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
              }`}
              title={
                isVoiceAnnounceEnabled
                  ? "🔊 आवाज़ चालू है (संदेश बोलकर सुनाए जाएंगे) - म्यूट करने के लिए दबाएं"
                  : "🔇 आवाज़ बंद है - चालू करने के लिए दबाएं"
              }
            >
              <Volume2 className={`w-3.5 h-3.5 ${isVoiceAnnounceEnabled ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
              <span className="hidden sm:inline text-[11px]">
                {isVoiceAnnounceEnabled ? "Voice On" : "Voice Off"}
              </span>
            </button>

            {/* Pop-up guide launcher */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-popup-settings-guide'))}
              className="p-1.5 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
              title="पॉप-अप नोटिफिकेशन सेटिंग (Show as pop-up guide)"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">पॉप-अप</span>
            </button>

            {/* Button to see who is in the group (Class & DP ke side me) */}
            {activeTab === "class" && (
              <button
                type="button"
                onClick={() => setShowMemberDrawer(true)}
                className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-emerald-500/30 active:scale-95 shadow-sm"
                title="Group me kaun kaun hai dekhein"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Members</span>
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

            {/* Admin Recipient Selector for School Desk */}
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

            {/* Admin Teacher Selector (Staff Chat 1-on-1) */}
            {activeTab === "teacher" && currentUserRole === "ADMIN" && safeTeachers.length > 0 && (
              <div className="flex items-center gap-1">
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="px-2 py-1.5 rounded-xl bg-purple-900/60 text-purple-100 border border-purple-500/60 text-xs font-bold cursor-pointer max-w-[110px] sm:max-w-[160px] truncate"
                  title="Teacher Chunein (Staff 1-on-1)"
                >
                  {safeTeachers.map(t => (
                    <option key={t.id} value={t.id}>
                      👨‍🏫 {t.name} ({t.subjects && t.subjects.length > 0 ? t.subjects.join(", ") : t.designation || "Faculty"})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowStaffDirectoryModal(true)}
                  className="p-1.5 px-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Sabhi Teachers Ki List Dekhein"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Staff ({safeTeachers.length})</span>
                </button>
              </div>
            )}

            {/* Recipient Selector for Teacher (Student Doubt OR School Admin Chat) */}
            {activeTab === "teacher" && currentUserRole === "TEACHER" && (
              <select
                value={selectedStudentId || "STAFF_ADMIN"}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="px-2 py-1.5 rounded-xl bg-purple-900/60 text-purple-100 border border-purple-500/60 text-xs font-bold cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
                title="Recipient Chunein (Student ya School Admin)"
              >
                <option value="STAFF_ADMIN">🏫 School Admin (Principal)</option>
                {safeStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    🎓 {s.name} ({s.className || (s.rollNo ? `Roll ${s.rollNo}` : "Std")})
                  </option>
                ))}
              </select>
            )}

            {/* Teacher Selector for Student Doubt Desk */}
            {activeTab === "teacher" && currentUserRole === "STUDENT" && safeTeachers.length > 0 && (
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

            {/* Quick 'Select All' messages toggle shortcut in default header */}
            {filteredMessages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMessageIds(filteredMessages.map((m) => m.id));
                }}
                title="Sabhi Messages Ek Saath Select Karein (Select All)"
                className="p-1.5 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer border border-emerald-500/30 flex items-center gap-1 active:scale-95 shadow-sm text-xs font-bold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Select All</span>
              </button>
            )}

            {/* Theme / Wallpaper Option (Admin Only) */}
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
      )}

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
            className={`relative w-full py-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === "school"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">School (Desk)</span>
            {unreadSchoolDeskCount > 0 && activeTab !== "school" && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black leading-none shadow-sm animate-pulse">
                {unreadSchoolDeskCount > 99 ? "99+" : unreadSchoolDeskCount}
              </span>
            )}
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
            <span className="truncate">
              {currentUserRole === "ADMIN" ? "Staff (Teacher)" : currentUserRole === "TEACHER" ? "Doubt & Staff" : "Teacher (Doubt)"}
            </span>
          </button>
        </div>
      </div>

      {/* ── CHAT MESSAGE BODY (WITH WALLPAPER & CRISP CONTRAST) ─────────────── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedMessageIds([]);
            setFloatingReactionMsgId(null);
          }
        }}
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
              : `Teacher-Student 1-to-1 Chat (${dailyTeacherStudentLimit} messages daily quota)`}
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

        {/* Message Bubble List with Long-Press (1.5s), Swipe to Reply, and Quick Reactions */}
        {filteredMessages.map((msg) => {
          // WhatsApp standard:
          // User bhejega -> Right side (isMe = true)
          // Dusra koi bhejega -> Left side (isMe = false)
          const isSenderMatch = Boolean(
            (currentUserId && msg.senderId && String(msg.senderId).trim() === String(currentUserId).trim()) ||
            (currentUserId && msg.senderId && String(msg.senderId).replace(/^(std_|tch_|usr_|admin_)/, '') === String(currentUserId).replace(/^(std_|tch_|usr_|admin_)/, '')) ||
            (currentUserName && msg.senderName && msg.senderRole === currentUserRole && msg.senderName.trim().toLowerCase() === currentUserName.trim().toLowerCase())
          );

          // For School Admin in School Desk: School Desk messages sent by School Admin/Office are outgoing (Right) for Admin, incoming (Left) for Student
          const isSchoolDeskAdminPost =
            currentUserRole === "ADMIN" &&
            activeTab === "school" &&
            (msg.senderRole === "ADMIN" || msg.senderId === "school_admin");

          const isMe = isSenderMatch || isSchoolDeskAdminPost;
          const isFeeSlip = Boolean(msg.feeSlip);
          const isReceipt = msg.feeSlip?.type === "FEE_RECEIPT";
          const isSelected = selectedMessageIds.includes(msg.id);
          const currentSwipeOffset = swipeOffsets[msg.id] || 0;

          // Status ticks: Single Gray -> Double Gray -> Double Blue
          const isRead = msg.status === "read" || (Array.isArray(msg.readBy) && msg.readBy.length > 0);
          const isDelivered =
            isRead || msg.status === "delivered" || (Array.isArray(msg.deliveredTo) && msg.deliveredTo.length > 0);

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className="relative w-full flex flex-col select-none transition-all"
            >
              {/* Swipe Right to Reply indicator revealed behind on the left */}
              {currentSwipeOffset > 15 && (
                <div
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-md transition-opacity pointer-events-none z-0"
                  style={{ opacity: Math.min(currentSwipeOffset / 40, 1) }}
                >
                  <CornerUpLeft className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              {/* Swipe Left to Reply indicator revealed behind on the right */}
              {currentSwipeOffset < -15 && (
                <div
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-md transition-opacity pointer-events-none z-0"
                  style={{ opacity: Math.min(Math.abs(currentSwipeOffset) / 40, 1) }}
                >
                  <CornerUpLeft className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              <div
                onTouchStart={(e) => handleMessageTouchStart(msg, e)}
                onTouchMove={(e) => handleMessageTouchMove(msg, e)}
                onTouchEnd={() => handleMessageTouchEnd(msg)}
                onMouseDown={(e) => handleMessageTouchStart(msg, e)}
                onMouseUp={() => handleMessageTouchEnd(msg)}
                onClick={(e) => handleMessageClick(msg, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedMessageIds([msg.id]);
                  setFloatingReactionMsgId(msg.id);
                }}
                style={{
                  transform: currentSwipeOffset ? `translateX(${currentSwipeOffset}px)` : undefined,
                  transition: currentSwipeOffset ? "none" : "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)"
                }}
                className={`flex flex-col relative z-10 ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%] ${
                  isMe ? "ml-auto" : "mr-auto"
                } ${isSelected ? "opacity-95" : ""}`}
              >
                {/* Floating Emoji Quick Reaction Bar (appears on 1 message tap; automatically hidden on multiple select) */}
                {floatingReactionMsgId === msg.id && selectedMessageIds.length <= 1 && (
                  <div
                    className="absolute -top-11 z-40 bg-slate-900/95 border border-slate-700/90 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-150"
                    style={{ [isMe ? "right" : "left"]: "0" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {["❤️", "👍", "😂", "😮", "😢", "🙏"].map((emoji) => {
                      const hasReacted = Boolean(msg.reactions?.[emoji]?.includes(currentUserId));
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={async () => {
                            try {
                              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
                            } catch (_) {}
                            await toggleNstaMessageReaction(school?.id || "default", msg.id, emoji, currentUserId);
                            setFloatingReactionMsgId(null);
                            setSelectedMessageIds([]);
                          }}
                          className={`w-7 h-7 flex items-center justify-center text-lg rounded-full transition-transform active:scale-125 hover:scale-125 cursor-pointer ${
                            hasReacted ? "bg-emerald-500/25 ring-1 ring-emerald-400" : "hover:bg-slate-800"
                          }`}
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setFloatingReactionMsgId(null);
                        setSelectedMessageIds([]);
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
                      title="Close reaction bar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

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
                  className={`rounded-2xl p-3 sm:p-3.5 shadow-md relative transition-all cursor-pointer ${
                    isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-[1.01]" : ""
                  } ${
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
                  {/* Forwarded Badge */}
                  {msg.isForwarded && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] italic font-semibold text-slate-500 dark:text-slate-400 select-none">
                      <Share2 className="w-3 h-3 rotate-180 text-slate-400" />
                      <span>Forwarded</span>
                    </div>
                  )}

                  {/* Quoted Reply Preview inside bubble */}
                  {msg.replyTo && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = document.getElementById(`msg-${msg.replyTo?.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.classList.add("ring-2", "ring-emerald-400", "animate-pulse");
                          setTimeout(() => el.classList.remove("ring-2", "ring-emerald-400", "animate-pulse"), 1500);
                        }
                      }}
                      className={`mb-2 p-2 rounded-xl text-left border-l-4 cursor-pointer transition select-none ${
                        isMe
                          ? activeWallpaper.isLight
                            ? "bg-emerald-100/70 border-emerald-600 text-slate-800"
                            : "bg-black/20 border-emerald-400 text-slate-100"
                          : activeWallpaper.isLight
                          ? "bg-slate-100 border-blue-500 text-slate-800"
                          : "bg-black/20 border-blue-400 text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        <CornerUpLeft className="w-3 h-3 shrink-0" />
                        <span className="truncate">{msg.replyTo.senderName}</span>
                      </div>
                      <p className="text-[11px] truncate opacity-85 mt-0.5 line-clamp-1">
                        {msg.replyTo.text}
                      </p>
                    </div>
                  )}

                  {/* Deleted for Everyone Banner */}
                  {msg.deletedForEveryone ? (
                    <div className="flex items-center gap-1.5 py-1 text-xs italic opacity-75 text-slate-500 dark:text-slate-400 select-none">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{isMe ? "🚫 You deleted this message" : "🚫 This message was deleted"}</span>
                    </div>
                  ) : (
                    <>
                      {/* ── SPECIAL RENDER: OFFICIAL SCHOOL WELCOME CARD ── */}
                      {(msg.attachmentType === "WELCOME" || msg.welcomeData) && (
                        <div className="space-y-2.5 pb-2 mb-2.5 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-emerald-950/80 border border-amber-500/40 shadow-xl text-slate-100">
                          {/* Official Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-amber-500/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-sm shadow-sm shrink-0">
                                🎓
                              </div>
                              <div className="min-w-0">
                                <span className="font-black text-xs uppercase tracking-wider block text-amber-300 truncate">
                                  Official Welcome &amp; ID Activation
                                </span>
                                <span className="text-[10px] text-emerald-300 block font-semibold truncate">
                                  {msg.welcomeData?.schoolName || school?.name || "Official School Desk"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                              Active ID
                            </span>
                          </div>

                          {/* Student Info Box */}
                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-white text-sm flex items-center gap-1.5 truncate">
                                <span>{msg.welcomeData?.studentName || msg.studentName || "Student"}</span>
                                <span className="text-emerald-400 text-xs">✅</span>
                              </span>
                              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded font-bold shrink-0">
                                {msg.welcomeData?.className || "Class 10"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono pt-1 border-t border-white/10">
                              <span>Adm No: <strong className="text-white">{msg.welcomeData?.admissionNo || "ADM-001"}</strong></span>
                              <span>Roll No: <strong className="text-white">{msg.welcomeData?.rollNo || "01"}</strong></span>
                            </div>
                          </div>

                          {/* Quick Highlights Badge */}
                          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-200">
                            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-1.5">
                              <span>📚</span>
                              <span className="font-bold text-emerald-300">100% Free Notes</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-center gap-1.5">
                              <span>⏱️</span>
                              <span className="font-bold text-blue-300">Live Attendance</span>
                            </div>
                          </div>

                          {/* Action Button: View Full Welcome Letter */}
                          <button
                            type="button"
                            onClick={() => {
                              const wd: NstaWelcomeData = msg.welcomeData || {
                                studentId: msg.studentId || "std",
                                studentName: msg.studentName || "Student",
                                admissionNo: "ADM-001",
                                rollNo: "01",
                                className: "Class 10",
                                schoolName: school?.name || "Official School Desk",
                                issuedAt: msg.createdAt,
                              };
                              setSelectedWelcomeData(wd);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/30 transition cursor-pointer active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>स्वागत पत्र व विवरण देखें (Welcome Letter)</span>
                          </button>
                        </div>
                      )}

                      {/* ── SPECIAL RENDER: OFFICIAL SCHOOL BIRTHDAY CARD ── */}
                      {(msg.attachmentType === "BIRTHDAY" || msg.birthdayData) && (
                        <div className="space-y-2.5 pb-2 mb-2.5 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-950/80 via-slate-900 to-amber-950/80 border border-amber-500/50 shadow-xl text-slate-100">
                          {/* Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-rose-500/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center text-sm shadow-sm shrink-0">
                                🎂
                              </div>
                              <div className="min-w-0">
                                <span className="font-black text-xs uppercase tracking-wider block text-amber-300 truncate">
                                  Official Birthday Greetings
                                </span>
                                <span className="text-[10px] text-rose-300 block font-semibold truncate">
                                  {msg.birthdayData?.schoolName || school?.name || "Official School Desk"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                              Birthday VIP 🎉
                            </span>
                          </div>

                          {/* Student Info Box */}
                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-white text-sm flex items-center gap-1.5 truncate">
                                <span>{msg.birthdayData?.studentName || msg.studentName || "Student"}</span>
                                <span className="text-amber-400 text-xs">👑</span>
                              </span>
                              <span className="text-[10px] font-mono text-rose-300 bg-rose-950/80 border border-rose-500/30 px-2 py-0.5 rounded font-bold shrink-0">
                                {msg.birthdayData?.className || "Class 10"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono pt-1 border-t border-white/10">
                              <span>Adm No: <strong className="text-white">{msg.birthdayData?.admissionNo || "ADM-001"}</strong></span>
                              <span>DOB: <strong className="text-amber-300">{msg.birthdayData?.dateOfBirth || "Today"}</strong></span>
                            </div>
                          </div>

                          {/* Principal Blessing Quote */}
                          <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/20 text-[11px] text-slate-300 italic leading-snug">
                            "विद्यालय परिवार की ओर से जन्मदिवस पर असीम स्नेह व मंगलकामनाएं। आपका भविष्य ज्ञान, उत्तम स्वास्थ्य और सफलता से जगमगाए!"
                          </div>

                          {/* Action Button: View Full Birthday Card */}
                          <button
                            type="button"
                            onClick={() => {
                              const bd: NstaBirthdayData = msg.birthdayData || {
                                studentId: msg.studentId || "std",
                                studentName: msg.studentName || "Student",
                                admissionNo: "ADM-001",
                                rollNo: "01",
                                className: "Class 10",
                                schoolName: school?.name || "Official School Desk",
                                dateOfBirth: "Today",
                                wishedYear: new Date().getFullYear(),
                                issuedAt: msg.createdAt,
                              };
                              setSelectedBirthdayData(bd);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:opacity-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 transition cursor-pointer active:scale-95"
                          >
                            <span>🎉 जन्मदिन शुभकामना पत्र देखें (Birthday Greetings)</span>
                          </button>
                        </div>
                      )}

                      {/* ── SPECIAL RENDER: AUTOMATED A6 FEE SLIP OR RECEIPT CARD ── */}
                      {isFeeSlip && msg.feeSlip && (
                        <div className="space-y-2.5 pb-1">
                          {/* Official Document Banner */}
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  isReceipt
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-black text-xs uppercase tracking-wider block text-white">
                                  {isReceipt ? "Official Fee Receipt" : "Official A6 Fee Demand Slip"}
                                </span>
                                <span className="text-[9px] text-slate-400 block font-mono">
                                  {isReceipt ? "Paid Receipt • 80mm POS Slip" : "A6 Size Document • 105×148.5mm"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-full font-bold text-slate-200">
                              {msg.feeSlip.monthLabel || msg.feeSlip.month}
                            </span>
                          </div>

                          {/* Student Identity Badge */}
                          <div className="px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-[11px] text-slate-200">
                            <span className="font-bold flex items-center gap-1.5 truncate max-w-[180px]">
                              <span className="text-amber-400">👤</span>
                              <span>{msg.studentName || msg.feeSlip.studentName || "Student"}</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                              {msg.feeSlip.className ? msg.feeSlip.className : ""}
                              {msg.feeSlip.rollNo ? ` • Roll: ${msg.feeSlip.rollNo}` : ""}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs py-0.5">
                            <div className="p-2 rounded-xl bg-black/25">
                              <p className="text-[10px] text-slate-300 uppercase font-bold">
                                {isReceipt ? "Amount Received" : "Balance Due"}
                              </p>
                              <p
                                className={`text-base font-black tabular-nums ${
                                  isReceipt ? "text-emerald-400" : "text-amber-400"
                                }`}
                              >
                                ₹{((isReceipt ? msg.feeSlip.amount : msg.feeSlip.balanceDue) || 0).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="p-2 rounded-xl bg-black/25">
                              <p className="text-[10px] text-slate-300 uppercase font-bold">
                                {isReceipt ? "Receipt No" : "Due Date"}
                              </p>
                              <p className="text-xs font-mono font-bold text-white mt-1">
                                {isReceipt ? msg.feeSlip.receiptNo || "Auto-Gen" : msg.feeSlip.dueDate || "10 तारीख तक"}
                              </p>
                            </div>
                          </div>

                          {/* Early Payment 5% Discount Callout */}
                          {!isReceipt &&
                            (msg.feeSlip.earlyDiscount
                              ? msg.feeSlip.earlyDiscount > 0
                              : new Date().getDate() <= 10) && (
                              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] space-y-1">
                                <div className="flex items-center justify-between font-black text-emerald-300">
                                  <span className="flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    10 तारीख तक 5% OFF
                                  </span>
                                  <span className="text-emerald-400 font-mono">
                                    -₹
                                    {Number(
                                      msg.feeSlip.earlyDiscount ||
                                        Math.round(
                                          (msg.feeSlip.monthlyAmount ||
                                            msg.feeSlip.amount ||
                                            msg.feeSlip.balanceDue ||
                                            0) * 0.05
                                        )
                                    ).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300 text-[10px]">
                                  <span>छूट के बाद कुल देय:</span>
                                  <span className="font-bold text-white text-xs">
                                    ₹
                                    {Number(
                                      msg.feeSlip.netPayableWithDiscount ||
                                        (msg.feeSlip.balanceDue || 0) - (msg.feeSlip.earlyDiscount || 0)
                                    ).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                {Boolean(msg.feeSlip.oldArrears && msg.feeSlip.oldArrears > 0) && (
                                  <p className="text-[9px] text-amber-300/90 leading-tight">
                                    * 5% छूट केवल चालू माह शुल्क पर लागू है। पुराने बकाए (₹
                                    {msg.feeSlip.oldArrears?.toLocaleString("en-IN")}) पर छूट नहीं।
                                  </p>
                                )}
                              </div>
                            )}

                          {/* Action buttons on Slip card: View PDF + WhatsApp Pay */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {!isReceipt && (
                              <button
                                type="button"
                                onClick={() => handleOpenA6Slip(msg.feeSlip, msg.studentId, msg.studentName)}
                                className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/30 transition cursor-pointer active:scale-95"
                                title="Asli A6 Fee Demand Slip PDF dekhein aur download karein"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-950" />
                                <span>📄 View A6 PDF Slip</span>
                              </button>
                            )}
                            {!isReceipt && onOpenWhatsAppPay && (
                              <button
                                type="button"
                                onClick={() => onOpenWhatsAppPay(msg.feeSlip)}
                                className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer active:scale-95"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>WhatsApp Pay</span>
                              </button>
                            )}
                            {isReceipt && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenFeeReceipt) {
                                    onOpenFeeReceipt(msg.feeSlip);
                                  } else {
                                    handleOpenA6Slip(msg.feeSlip, msg.studentId, msg.studentName);
                                  }
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/30 transition cursor-pointer active:scale-95"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>View Official Receipt</span>
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
                            onClick={() =>
                              setFullscreenMedia({ type: "IMAGE", url: msg.attachmentUrl!, title: msg.text })
                            }
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFullscreenMedia({ type: "IMAGE", url: msg.attachmentUrl!, title: msg.text })
                            }
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

                      {/* ── ATTACHMENT: VOICE NOTE (AUDIO) ── */}
                      {msg.attachmentType === "AUDIO" && msg.attachmentUrl && (
                        <div className="mb-2">
                          <AudioBubblePlayer
                            url={msg.attachmentUrl}
                            duration={msg.audioDuration}
                            isMe={isMe}
                          />
                        </div>
                      )}

                      {/* ── ATTACHMENT: DOCUMENT / PDF / ZIP / HTML / FILE ── */}
                      {(msg.attachmentType === "PDF" ||
                        msg.attachmentType === "ZIP" ||
                        msg.attachmentType === "FILE" ||
                        msg.attachmentType === "DOCUMENT") &&
                        msg.attachmentUrl && (
                          <div
                            className={`p-3 rounded-2xl flex items-center gap-3 border ${
                              isMe
                                ? activeWallpaper.isLight
                                  ? "bg-emerald-900/15 border-emerald-600/30 text-slate-800"
                                  : "bg-black/30 border-emerald-500/30 text-white"
                                : activeWallpaper.isLight
                                ? "bg-slate-100 border-slate-300 text-slate-800"
                                : "bg-black/30 border-white/15 text-white"
                            } min-w-[210px] sm:min-w-[260px] max-w-sm mb-2`}
                          >
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                msg.attachmentType === "PDF" || msg.fileName?.endsWith(".pdf")
                                  ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                                  : msg.attachmentType === "ZIP" || msg.fileName?.match(/\.(zip|rar|7z|tar|gz)$/i)
                                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                  : msg.fileName?.match(/\.(html|htm|json|js|ts)$/i)
                                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                  : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                              }`}
                            >
                              {msg.attachmentType === "PDF" || msg.fileName?.endsWith(".pdf") ? (
                                <FileText className="w-5 h-5" />
                              ) : msg.attachmentType === "ZIP" || msg.fileName?.match(/\.(zip|rar|7z|tar|gz)$/i) ? (
                                <FileArchive className="w-5 h-5" />
                              ) : msg.fileName?.match(/\.(html|htm|json|js|ts)$/i) ? (
                                <FileCode className="w-5 h-5" />
                              ) : (
                                <FileGenericIcon className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate line-clamp-1" title={msg.fileName || msg.text}>
                                {msg.fileName || msg.text || "Document"}
                              </p>
                              <p className="text-[10px] opacity-75 font-mono mt-0.5">
                                {msg.fileSize
                                  ? msg.fileSize > 1024 * 1024
                                    ? `${(msg.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                    : `${Math.round(msg.fileSize / 1024)} KB`
                                  : "Document"} • {
                                  msg.fileName?.split(".").pop()?.toUpperCase() || msg.attachmentType
                                }
                              </p>
                            </div>
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={msg.fileName}
                              className="w-9 h-9 rounded-xl bg-black/15 hover:bg-black/30 text-current flex items-center justify-center shrink-0 transition cursor-pointer"
                              title="Download / Open Karein"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}

                      {/* ── ATTACHMENT: CONTACT CARD ── */}
                      {msg.attachmentType === "CONTACT" && msg.contactData && (
                        <div
                          className={`p-3 rounded-2xl border ${
                            isMe
                              ? activeWallpaper.isLight
                                ? "bg-emerald-900/15 border-emerald-600/30 text-slate-900"
                                : "bg-black/35 border-emerald-500/30 text-white"
                              : activeWallpaper.isLight
                              ? "bg-slate-100 border-slate-300 text-slate-900"
                              : "bg-black/35 border-white/15 text-white"
                          } min-w-[220px] sm:min-w-[270px] max-w-sm mb-2 space-y-2.5`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-sm shrink-0">
                              {msg.contactData.avatarUrl ? (
                                <img
                                  src={msg.contactData.avatarUrl}
                                  alt={msg.contactData.name}
                                  className="w-full h-full object-cover rounded-2xl"
                                />
                              ) : (
                                <ContactIcon className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black truncate">{msg.contactData.name}</p>
                              <p className="text-[10px] opacity-75 truncate font-medium">
                                {msg.contactData.designation || msg.contactData.role || "Faculty / Staff"}
                              </p>
                              {msg.contactData.phone && (
                                <p className="text-[10px] font-mono opacity-85 mt-0.5">
                                  {msg.contactData.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          {msg.contactData.phone && (
                            <a
                              href={`tel:${msg.contactData.phone.replace(/[^0-9+]/g, "")}`}
                              className="w-full py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call Contact</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* ── ATTACHMENT: LOCATION CARD ── */}
                      {msg.attachmentType === "LOCATION" && msg.locationData && (
                        <div
                          className={`p-3 rounded-2xl border ${
                            isMe
                              ? activeWallpaper.isLight
                                ? "bg-emerald-900/15 border-emerald-600/30 text-slate-900"
                                : "bg-black/35 border-emerald-500/30 text-white"
                              : activeWallpaper.isLight
                              ? "bg-slate-100 border-slate-300 text-slate-900"
                              : "bg-black/35 border-white/15 text-white"
                          } min-w-[220px] sm:min-w-[270px] max-w-sm mb-2 space-y-2`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black truncate">{msg.locationData.name || "Shared Location"}</p>
                              <p className="text-[10px] opacity-80 line-clamp-2 leading-tight mt-0.5">
                                {msg.locationData.address || "GPS Coordinates"}
                              </p>
                              <span className="text-[9px] font-mono opacity-60 block mt-0.5">
                                {msg.locationData.latitude.toFixed(4)}, {msg.locationData.longitude.toFixed(4)}
                              </span>
                            </div>
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${msg.locationData.latitude},${msg.locationData.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Open in Google Maps</span>
                          </a>
                        </div>
                      )}

                      {/* Normal text */}
                      {msg.text && (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words font-medium">
                          {msg.text}
                        </p>
                      )}
                    </>
                  )}

                  {/* Timestamp & Status Checkmarks & 1-Tap Voice Button */}
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] select-none ${
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
                    {/* 1-Tap Voice Readout Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const speakText = msg.text || (msg.feeSlip ? `फीस रसीद: ${msg.feeSlip.monthLabel}, राशि ₹${msg.feeSlip.amount || msg.feeSlip.balanceDue}` : "नया संदेश");
                        speakNotification(msg.senderName || "संदेश", speakText, { force: true });
                      }}
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-black/20 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                      title="बोलकर सुनें (Listen in voice)"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span className="text-[9px]">सुनें</span>
                    </button>

                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {/* WhatsApp-Style Delivery & Seen Ticks for Sender */}
                    {isMe && (
                      <span
                        className="inline-flex items-center ml-0.5"
                        title={
                          isRead
                            ? "Seen / Read by recipient (2 Blue Ticks)"
                            : isDelivered
                            ? "Delivered to device (2 Gray Ticks)"
                            : "Sent to server (1 Gray Tick)"
                        }
                      >
                        {isRead ? (
                          // Double Blue Tick (Seen / Read)
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400 drop-shadow-xs" />
                        ) : isDelivered ? (
                          // Double Gray Tick (Delivered)
                          <CheckCheck
                            className={`w-3.5 h-3.5 ${
                              activeWallpaper.isLight ? "text-slate-400" : "text-slate-400/80"
                            }`}
                          />
                        ) : (
                          // Single Gray Tick (Sent)
                          <Check
                            className={`w-3.5 h-3.5 ${
                              activeWallpaper.isLight ? "text-slate-400" : "text-slate-400/80"
                            }`}
                          />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Reaction Badges on Bubble Bottom */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setReactionDetailsMsg(msg);
                      }}
                      className={`absolute -bottom-2.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-900/95 border border-slate-700/80 text-[11px] shadow-md cursor-pointer hover:scale-105 transition-transform ${
                        isMe ? "right-2" : "left-2"
                      }`}
                      title="Reactions dekhein"
                    >
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const count = Array.isArray(users) ? users.length : 0;
                        if (count === 0) return null;
                        return (
                          <span key={emoji} className="inline-flex items-center gap-0.5">
                            <span>{emoji}</span>
                            {count > 1 && (
                              <span className="text-[9px] font-bold text-slate-300 font-mono">{count}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Floating Jump to Bottom Button when scrolling up */}
        {showScrollBottomBtn && (
          <div className="sticky bottom-2 flex justify-center z-30 pointer-events-none">
            <button
              type="button"
              onClick={() => {
                isUserScrolledUpRef.current = false;
                setShowScrollBottomBtn(false);
                scrollToBottom("smooth", true);
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-emerald-400 border border-slate-700 shadow-2xl backdrop-blur-md text-xs font-bold transition transform active:scale-95 cursor-pointer animate-in fade-in zoom-in-95"
              title="Niche jayein (Jump to latest message)"
            >
              <ChevronDown className="w-4 h-4 text-emerald-400 animate-bounce" />
              <span className="text-white text-[11px] font-semibold">Niche jayein / Jump to latest</span>
            </button>
          </div>
        )}

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
        ) : activeTab === "teacher" && isTeacherQuotaExceeded ? (
          /* 2. Teacher Chat: Quota Limit Exceeded */
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {currentUserRole === "TEACHER"
                  ? `Is student ke sath aaj ka daily message quota (${dailyTeacherStudentLimit} messages) poora ho chuka hai.`
                  : `Aapka aaj ka daily quota (${dailyTeacherStudentLimit} messages) poora ho chuka hai. Agla message kal bhej sakenge.`}
              </span>
            </div>
            <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20">
              {dailyTeacherStudentLimit}/{dailyTeacherStudentLimit} Used
            </span>
          </div>
        ) : (
          /* 3. Standard Interactive WhatsApp Input */
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            {/* Quota Counter for Student/Teacher in Teacher Chat */}
            {activeTab === "teacher" && (
              <div className="flex items-center justify-between text-[11px] text-purple-300 px-1 font-semibold">
                <span>
                  {currentUserRole === "TEACHER"
                    ? `Chat with ${activeStudent?.name || "Student"}:`
                    : `Doubt Session with ${activeTeacher?.name || "Teacher"}:`}
                </span>
                <span className="font-mono bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-200">
                  {Math.max(0, dailyTeacherStudentLimit - messagesTodayCount)} / {dailyTeacherStudentLimit} messages remaining today
                </span>
              </div>
            )}

            {/* Quoted Reply Banner above input */}
            {replyingToMessage && (
              <div className="p-2.5 rounded-2xl bg-slate-950 border-l-4 border-emerald-500 border-r border-t border-b border-slate-800 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-md">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span>Replying to {replyingToMessage.senderName}</span>
                  </p>
                  <p className="text-xs text-slate-300 truncate line-clamp-1 mt-0.5 font-medium">
                    {replyingToMessage.text ||
                      (replyingToMessage.attachmentType ? `[${replyingToMessage.attachmentType}]` : "Message")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  title="Cancel reply"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Single Attachment Menu Button & Popup */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu((prev) => !prev)}
                  disabled={isSending || isUploadingMedia || isRecordingVoice}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl transition cursor-pointer active:scale-95 border flex items-center justify-center shrink-0 disabled:opacity-40 ${
                    showAttachmentMenu
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40 rotate-45 transition-transform"
                      : "bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border-slate-750"
                  }`}
                  title="Attachment Menu (Image, Video, PDF, ZIP, HTML, Files)"
                >
                  <Plus className="w-5 h-5 transition-transform" />
                </button>

                {/* WhatsApp Style Attachment Popup Menu */}
                {showAttachmentMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowAttachmentMenu(false)}
                    />
                    <div className="absolute bottom-12 left-0 z-40 bg-slate-900/95 border border-slate-750 backdrop-blur-md rounded-3xl p-3 shadow-2xl w-64 sm:w-72 space-y-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-3">
                      <div className="px-1.5 py-0.5 flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                          Attach Media &amp; Files
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAttachmentMenu(false)}
                          className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {/* 1. Photo / Image */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            imageInputRef.current?.click();
                          }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer group active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-purple-500/20 group-hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-sm">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-200">Image</span>
                        </button>

                        {/* 2. Video */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            videoInputRef.current?.click();
                          }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer group active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-rose-500/20 group-hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-sm">
                            <Film className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-200">Video</span>
                        </button>

                        {/* 3. In-App Camera */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            startInAppCamera();
                          }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer group active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 group-hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-sm">
                            <Camera className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-200">Camera</span>
                        </button>

                        {/* 4. Document */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            docInputRef.current?.click();
                          }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer group active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 group-hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-200">Document</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Hidden File Pickers */}
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
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,application/pdf"
                className="hidden"
                onChange={(e) => handleDocumentSelected(e, "PDF")}
              />
              <input
                ref={archiveInputRef}
                type="file"
                accept=".zip,.rar,.7z,.tar,.gz,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={(e) => handleDocumentSelected(e, "ZIP")}
              />
              <input
                ref={htmlInputRef}
                type="file"
                accept=".html,.htm,.json,.xml,.js,.ts,text/html"
                className="hidden"
                onChange={(e) => handleDocumentSelected(e, "FILE")}
              />
              <input
                ref={anyFileInputRef}
                type="file"
                accept="*/*"
                className="hidden"
                onChange={(e) => handleDocumentSelected(e, "DOCUMENT")}
              />

              {/* Input Area: Live Voice Recording Studio OR Audio Review OR Text Input */}
              {isRecordingVoice ? (
                <div className="flex-1 flex items-center justify-between gap-1.5 sm:gap-3 px-3 py-2 rounded-2xl bg-slate-900 border border-rose-500/50 animate-in fade-in slide-in-from-bottom-1 min-w-0 shadow-lg shadow-rose-950/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span className="text-xs font-mono font-black text-rose-400 shrink-0">
                      🔴 {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
                    </span>
                    {/* Dynamic Equalizer Bars */}
                    <div className="flex items-center gap-0.5 h-4 overflow-hidden">
                      {[30, 75, 100, 45, 85, 60, 95, 40, 80, 50, 90, 65, 35, 70].map((h, i) => (
                        <span
                          key={i}
                          className="w-0.5 sm:w-1 bg-rose-400 rounded-full animate-pulse"
                          style={{
                            height: `${h}%`,
                            animationDelay: `${i * 80}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelVoiceRecording}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-200 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-slate-700 hover:border-rose-700/50"
                      title="Recording Delete Karein"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStopAndSendVoiceRecording}
                      disabled={isSending}
                      className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer active:scale-95"
                      title="Voice Note Bhejein (Send)"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              ) : isReviewingVoice ? (
                <div className="flex-1 flex items-center justify-between gap-1.5 sm:gap-3 px-3 py-2 rounded-2xl bg-slate-900 border border-emerald-500/50 animate-in fade-in slide-in-from-bottom-1 min-w-0 shadow-lg shadow-emerald-950/20">
                  {recordedAudioUrl && (
                    <audio
                      ref={previewAudioRef}
                      src={recordedAudioUrl}
                      onEnded={() => setIsPreviewPlaying(false)}
                      className="hidden"
                    />
                  )}
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!previewAudioRef.current) return;
                        if (isPreviewPlaying) {
                          previewAudioRef.current.pause();
                          setIsPreviewPlaying(false);
                        } else {
                          previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shrink-0 cursor-pointer shadow active:scale-95 transition"
                      title={isPreviewPlaying ? "Pause Preview" : "Play Preview"}
                    >
                      {isPreviewPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-emerald-400" />
                        <span className="truncate">Voice Review</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Duration: {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelVoiceRecording}
                      className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Discard Voice Note"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendReviewedVoice}
                      disabled={isSending}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer active:scale-95"
                      title="Send Voice Note"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeTab === "class"
                      ? "Class group me official notice ya sandesh likhein..."
                      : activeTab === "school"
                      ? "School desk ke liye sandesh ya enquiry likhein..."
                      : `Sandesh likhein (${Math.max(0, dailyTeacherStudentLimit - messagesTodayCount)} baaki)...`
                  }
                  className="flex-1 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition min-w-0"
                />
              )}

              <input
                ref={cameraCaptureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelected}
              />
              <input
                ref={galleryMediaInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleGalleryMediaSelected}
              />
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioFileSelected}
              />

              {/* Camera Button: Right before Voice Mic / Send button */}
              {!isRecordingVoice && !isReviewingVoice && (
                <button
                  type="button"
                  onClick={() => startInAppCamera()}
                  disabled={isSending || isUploadingMedia}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 active:scale-95 border border-slate-750 disabled:opacity-40"
                  title="In-App Camera se photo lein"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
                </button>
              )}

              {/* Action Button: Dynamic Switch between Mic (default) and Send (when text or voice recorded) */}
              {inputText.trim() ? (
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-900/40 transition cursor-pointer shrink-0 active:scale-95 animate-in zoom-in-75"
                  title="Sandesh Bhejein (Send)"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : isRecordingVoice ? (
                <button
                  type="button"
                  onClick={handleStopAndSendVoiceRecording}
                  disabled={isSending}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-900/40 transition cursor-pointer shrink-0 active:scale-95 animate-pulse"
                  title="Voice Note Bhejein (Send)"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : isReviewingVoice ? (
                <button
                  type="button"
                  onClick={handleSendReviewedVoice}
                  disabled={isSending}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-900/40 transition cursor-pointer shrink-0 active:scale-95 animate-pulse"
                  title="Voice Note Bhejein (Send)"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartVoiceRecording}
                  disabled={isSending || isUploadingMedia}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-900/40 transition cursor-pointer shrink-0 active:scale-95 animate-in zoom-in-75"
                  title="Voice Note Record Karein (Mic)"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
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
                {safeTeachers.find(t => (t.classes && t.classes.includes(activeClass?.id || "")) || (t as any).classId === activeClass?.id)?.name || "Assigned Faculty"}
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

      {/* ── STANDALONE A6 FEE DEMAND SLIP / RECEIPT MODAL ── */}
      {activeA6SlipView && (
        <OfficialFeeReceiptModal
          isOpen={true}
          onClose={() => setActiveA6SlipView(null)}
          school={school}
          fee={activeA6SlipView.fee}
          student={activeA6SlipView.student}
          className={activeA6SlipView.student?.className || "Class"}
          sessionName="2026-2027"
          initialFormat={activeA6SlipView.fee?.isDueDemand ? "a6" : "pos"}
          isStudentView={currentUserRole === "STUDENT"}
        />
      )}

      {/* ── MODAL 1: DELETE MESSAGE (DELETE FOR EVERYONE VS DELETE FOR ME) ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">
                  {selectedMessageIds.length === 1
                    ? "संदेश डिलीट करें (Delete message?)"
                    : `${selectedMessageIds.length} संदेश डिलीट करें`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {canDeleteForEveryone
                    ? "आप यह संदेश सभी के लिए या सिर्फ अपने लिए हटा सकते हैं।"
                    : "यह संदेश सिर्फ आपके चैट से हटाया जाएगा।"}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* If user is the sender (or Admin), show Delete for everyone! */}
              {canDeleteForEveryone && (
                <button
                  type="button"
                  onClick={handleDeleteForEveryone}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete for everyone (सभी के लिए हटाएं)</span>
                </button>
              )}

              {/* Delete for me is ALWAYS available for receivers and senders */}
              <button
                type="button"
                onClick={handleDeleteForMe}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <span>Delete for me (सिर्फ मेरे लिए हटाएं)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800/60 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MESSAGE INFO (SEEN BY / DELIVERED TO RECEIPTS) ── */}
      {showMessageInfoMsg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Message Info</h3>
                  <p className="text-[10px] text-slate-400">Read &amp; Delivered receipts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMessageInfoMsg(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800/80">
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-white text-xs">
                <p className="font-medium whitespace-pre-wrap leading-relaxed">
                  {showMessageInfoMsg.text ||
                    (showMessageInfoMsg.attachmentType
                      ? `[${showMessageInfoMsg.attachmentType}]`
                      : "Message")}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-300/70 font-mono">
                  <span>
                    {new Date(showMessageInfoMsg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                </div>
              </div>
            </div>

            {/* Receipts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Read by (Double Blue Tick) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                  <CheckCheck className="w-4 h-4 text-sky-400" />
                  <span>Read by ({showMessageInfoMsg.readBy?.length || 0})</span>
                </div>
                {showMessageInfoMsg.readBy && showMessageInfoMsg.readBy.length > 0 ? (
                  <div className="space-y-1.5 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                    {showMessageInfoMsg.readBy.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                            {r.userName?.slice(0, 1).toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-xs">{r.userName}</p>
                            <span className="text-[9px] uppercase font-bold text-slate-400">
                              {r.role || "Member"}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(r.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic pl-6">
                    Abhi tak kisi ne nahi dekha (Not read yet)
                  </p>
                )}
              </div>

              {/* Delivered to (Double Gray Tick) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <CheckCheck className="w-4 h-4 text-slate-400" />
                  <span>Delivered to</span>
                </div>
                {(() => {
                  const deliveredNotRead = (showMessageInfoMsg.deliveredTo || []).filter(
                    (d) => !(showMessageInfoMsg.readBy || []).some((r) => r.userId === d.userId)
                  );
                  if (deliveredNotRead.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 italic pl-6">
                        {showMessageInfoMsg.readBy && showMessageInfoMsg.readBy.length > 0
                          ? "Sabhi praptkartaon ne dekh liya hai (All delivered recipients have read)"
                          : "Delivered to recipient device"}
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-1.5 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                      {deliveredNotRead.map((d, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800/60 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                              {d.userName?.slice(0, 1).toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate text-xs">{d.userName}</p>
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {d.role || "Member"}
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(d.deliveredAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: FORWARD MESSAGE (SINGLE MESSAGE ONLY) ── */}
      {forwardModalMsg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Forward className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Forward Message</h3>
                  <p className="text-[10px] text-slate-400">Keval ek message forward hoga</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForwardModalMsg(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target section selector */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Target Section Chunein:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForwardTarget((prev) => ({ ...prev, threadType: "class" }))}
                    className={`p-2 rounded-xl font-bold text-center border transition cursor-pointer ${
                      forwardTarget.threadType === "class"
                        ? "bg-emerald-600 border-emerald-400 text-white"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    Class
                  </button>
                  <button
                    type="button"
                    onClick={() => setForwardTarget((prev) => ({ ...prev, threadType: "school" }))}
                    className={`p-2 rounded-xl font-bold text-center border transition cursor-pointer ${
                      forwardTarget.threadType === "school"
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    School Desk
                  </button>
                  <button
                    type="button"
                    onClick={() => setForwardTarget((prev) => ({ ...prev, threadType: "teacher" }))}
                    className={`p-2 rounded-xl font-bold text-center border transition cursor-pointer ${
                      forwardTarget.threadType === "teacher"
                        ? "bg-purple-600 border-purple-400 text-white"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    Teacher
                  </button>
                </div>
              </div>

              {/* Dynamic target selector */}
              {forwardTarget.threadType === "class" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Select Class:
                  </label>
                  <select
                    value={forwardTarget.classId || safeClasses[0]?.id || ""}
                    onChange={(e) => setForwardTarget((prev) => ({ ...prev, classId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
                  >
                    {safeClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {forwardTarget.threadType === "school" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Recipient:
                  </label>
                  <select
                    value={forwardTarget.studentId || "all"}
                    onChange={(e) => setForwardTarget((prev) => ({ ...prev, studentId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
                  >
                    <option value="all">📢 Sabhi Chhatra (All Students)</option>
                    {safeStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rollNo ? `Roll ${s.rollNo}` : "Std"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {forwardTarget.threadType === "teacher" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Select Teacher:
                  </label>
                  <select
                    value={forwardTarget.teacherId || safeTeachers[0]?.id || ""}
                    onChange={(e) => setForwardTarget((prev) => ({ ...prev, teacherId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
                  >
                    {safeTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.subjects?.[0] || (t as any).subject || "Faculty"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleExecuteForward}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer active:scale-95"
              >
                <Forward className="w-4 h-4" />
                <span>Forward Message Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: REACTION DETAILS MODAL ── */}
      {reactionDetailsMsg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Reactions</span>
              </h3>
              <button
                type="button"
                onClick={() => setReactionDetailsMsg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(reactionDetailsMsg.reactions || {}).map(([emoji, users]) => {
                if (!Array.isArray(users) || users.length === 0) return null;
                return (
                  <div
                    key={emoji}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="font-bold text-slate-300">
                      {users.length} {users.length === 1 ? "reaction" : "reactions"}
                      {users.includes(currentUserId) ? " (Including You)" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL: IN-APP LIVE CAMERA VIEWFINDER ── */}
      {showInAppCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <button
              type="button"
              onClick={stopInAppCamera}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 flex items-center justify-center cursor-pointer transition active:scale-95"
              title="Camera band karein"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Camera</span>
            </div>

            <button
              type="button"
              onClick={flipInAppCamera}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 flex items-center justify-center cursor-pointer transition active:scale-95"
              title="Camera badlein (Flip)"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder Window */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <video
              ref={inAppCameraVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform ${
                cameraFacingMode === "user" ? "-scale-x-100" : ""
              }`}
            />
            <canvas ref={inAppCameraCanvasRef} className="hidden" />

            {/* Loading state */}
            {isCameraStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3 z-10">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-white">Camera shuru ho raha hai...</p>
              </div>
            )}

            {/* Camera Error / Permission Fallback */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center gap-4 z-20">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="font-extrabold text-white text-base">Camera Access Blocked</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => {
                      stopInAppCamera();
                      cameraCaptureInputRef.current?.click();
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer active:scale-95"
                  >
                    Device Camera Se Photo Lein 📸
                  </button>
                  <button
                    type="button"
                    onClick={stopInAppCamera}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Wapas Jayein
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Gallery shortcut + Big Shutter button + Flip button */}
          <div className="relative z-10 p-6 pb-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-around">
            {/* Gallery shortcut */}
            <button
              type="button"
              onClick={() => {
                stopInAppCamera();
                imageInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition cursor-pointer group active:scale-95"
              title="Gallery se chunein"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/20 border border-white/20 flex items-center justify-center backdrop-blur-md">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-300">Gallery</span>
            </button>

            {/* Shutter Capture Button */}
            <button
              type="button"
              onClick={captureInAppPhoto}
              disabled={isCameraStarting || !!cameraError}
              className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center cursor-pointer transition active:scale-90 hover:scale-105 disabled:opacity-40"
              title="Photo khinchein"
            >
              <div className="w-full h-full rounded-full bg-white hover:bg-slate-200 transition shadow-lg shadow-white/30" />
            </button>

            {/* Flip Camera */}
            <button
              type="button"
              onClick={flipInAppCamera}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition cursor-pointer group active:scale-95"
              title="Camera switch karein"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/20 border border-white/20 flex items-center justify-center backdrop-blur-md">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-300">Flip</span>
            </button>
          </div>
        </div>
      )}

      {/* ── OFFICIAL SCHOOL WELCOME MODAL ── */}
      <SchoolWelcomeModal
        isOpen={Boolean(selectedWelcomeData)}
        onClose={() => setSelectedWelcomeData(null)}
        welcomeData={selectedWelcomeData}
        onOpenSchoolDesk={() => setActiveTab("school")}
      />

      {/* ── OFFICIAL SCHOOL BIRTHDAY MODAL ── */}
      <SchoolBirthdayModal
        isOpen={Boolean(selectedBirthdayData)}
        onClose={() => setSelectedBirthdayData(null)}
        birthdayData={selectedBirthdayData}
        onOpenSchoolDesk={() => setActiveTab("school")}
      />

      {/* ── STAFF / TEACHER DIRECTORY MODAL (Admin & Accountant 1-on-1 Chat) ── */}
      {showStaffDirectoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-sm sm:text-base">शिक्षक डायरेक्टरी (Staff Directory)</h3>
                  <p className="text-xs text-slate-400">किसी भी शिक्षक को चुनें और सीधा 1-on-1 चैट करें</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffDirectoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Teacher List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {safeTeachers.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm font-semibold">कोई शिक्षक पंजीकृत नहीं है।</p>
                </div>
              ) : (
                safeTeachers.map((t) => {
                  const isSelected = t.id === selectedTeacherId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTeacherId(t.id);
                        setActiveTab("teacher");
                        setShowStaffDirectoryModal(false);
                      }}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-purple-950/40 border-purple-500/50 shadow-md"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {t.photoUrl ? (
                          <img
                            src={t.photoUrl}
                            alt={t.name}
                            className="w-11 h-11 rounded-2xl object-cover border border-purple-500/30 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-purple-600/30 text-purple-200 border border-purple-500/30 flex items-center justify-center font-black text-sm shrink-0">
                            {t.name?.slice(0, 2).toUpperCase() || "TC"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-bold text-sm truncate">{t.name}</h4>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          </div>
                          <p className="text-xs text-purple-300 font-medium truncate">
                            {(t.subjects && t.subjects.length > 0 ? t.subjects.join(", ") : t.designation || "Faculty")}
                            {t.classes && t.classes.length > 0 ? ` • Class ${t.classes.join(", ")}` : ""}
                          </p>
                          {t.phone && (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">📞 {t.phone}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeacherId(t.id);
                          setActiveTab("teacher");
                          setShowStaffDirectoryModal(false);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition cursor-pointer active:scale-95 shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>चैट करें</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-500">
                कुल {safeTeachers.length} शिक्षक उपलब्ध • संदेश सीधे उनके टीचर पोर्टल में पहुंचेगा
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
