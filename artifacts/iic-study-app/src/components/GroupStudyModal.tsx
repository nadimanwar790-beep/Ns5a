import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  BookOpen,
  MessageSquare,
  Sparkles,
  Send,
  X,
  Copy,
  Check,
  Trophy,
  Flame,
  Radio,
  ExternalLink,
  Plus,
  Lock,
  Globe,
  Award,
  Clock,
  Zap,
  HelpCircle,
  Video,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Smartphone,
  User,
  UserCheck,
  Minimize2,
  Compass,
  Search,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  MonitorPlay,
  FastForward,
  Timer,
  CheckCircle2,
  XCircle,
  BarChart3,
  Medal,
  Trash2,
  Crown,
  LogOut,
  Loader2,
  Share2,
  Info,
  ChevronDown,
  ChevronUp,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';

const FaWhatsapp = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const StudyRoomSetupProgress = ({ currentStep }: { currentStep: 1 | 2 | 3 }) => {
  const steps = ['Room', 'Question set', 'Launch'];

  return (
    <div
      className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-3"
      aria-label={`Study Room setup: step ${currentStep} of 3`}
    >
      {steps.map((label, index) => {
        const step = index + 1;
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div
            key={label}
            className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 ${
              isCurrent
                ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-400/40'
                : isComplete
                ? 'text-emerald-300'
                : 'text-slate-500'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                isCurrent
                  ? 'border-indigo-300 bg-indigo-500 text-white'
                  : isComplete
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-500'
              }`}
            >
              {isComplete ? <CheckCircle2 size={13} /> : `0${step}`}
            </span>
            <span className="truncate text-[10px] font-bold sm:text-[11px]">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

import {
  type GroupStudyRoom,
  type GroupStudyMember,
  type GroupStudyMessage,
  type GroupStudyMcqQuestion,
  type StudyRoomMcqType,
  type McqAnswerOutcome,
  CURATED_MCQ_SETS,
  subscribeToActiveRooms,
  subscribeToRoom,
  createGroupRoom,
  joinGroupRoom,
  leaveGroupRoom,
  deleteGroupRoom,
  markRoomAsCreatedByMe,
  isRoomCreatedByMe,
  findRoomByCodeOrId,
  getCachedRooms,
  saveCachedRoom,
  sendRoomMessage,
  toggleHandRaise,
  setRoomMode,
  setRoomMcqType,
  startLiveMcqBattle,
  scheduleRoomWithQuestions,
  setRoomMcqDuration,
  setRoomMcqAutoAdvance,
  revealMcqAnswer,
  advanceMcqQuestion,
  submitMcqAnswer,
  submitFinalBatchScore,
  awardFinalStreakBonus,
  autoSubmitRoom,
  endLiveMcqBattle,
  resetLiveMcqToWaiting,
  syncHostActivity,
  cleanRtdbPayload,
  electAndPromoteHighestLevelHost,
  awardRoomStudyXp,
  syncMemberLiveStats,
  formatDayHourMinSec,
  updateMemberDisplayName,
} from '../services/groupStudyService';
import { getLevelFromScore } from '../utils/levelSystem';
import { rotateScreen } from '../utils/displayPrefs';
import { auth, getChapterData, saveUserToLive, subscribeMcqLessons, saveTestResult, saveUserHistory } from '../firebase';
import { STATIC_SYLLABUS, ADMIN_EMAIL, LUCENT_SUBJECT_OPTIONS_BASE, getLucentSubjectOptions } from '../constants';
import { parseMCQText, extractStatements } from '../utils/mcqParser';
import { parseMcqQuestion } from '../utils/mcqRender';
import McqQuestionDisplay from './McqQuestionDisplay';
import { detectQuestionType } from '../utils/questionTypeDetector';
import { type MCQResult } from '../types';
import { notifyStudyRoomInviteInBackground, notifyStudyRoomChallengeInBackground } from './NotificationManager';
import { MarksheetCard } from './MarksheetCard';

// Normalize any raw MCQ question to GroupStudyMcqQuestion format with all 8 competition types
function parseQuestionToGroupMcq(q: any): GroupStudyMcqQuestion | null {
  if (!q) return null;
  let questionText = String(q.question || q.title || q.prompt || '').trim();
  if (!questionText) return null;

  let rawOptions: string[] = [];
  if (Array.isArray(q.options) && q.options.length > 0) {
    rawOptions = q.options.map((o: any) => String(o ?? '').trim()).filter(Boolean);
  } else if (q.optionA || q.optionB) {
    rawOptions = [q.optionA, q.optionB, q.optionC, q.optionD]
      .map((o: any) => String(o ?? '').trim())
      .filter(Boolean);
  } else if (q.choices && Array.isArray(q.choices)) {
    rawOptions = q.choices.map((o: any) => String(o ?? '').trim()).filter(Boolean);
  }

  if (rawOptions.length < 2) return null;

  let correctIndex = 0;
  if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < rawOptions.length) {
    correctIndex = q.correctIndex;
  } else if (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < rawOptions.length) {
    correctIndex = q.correctAnswer;
  } else if (typeof q.correctAnswer === 'string') {
    const ca = q.correctAnswer.trim().toLowerCase();
    const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
    if (letterMap[ca] !== undefined && letterMap[ca] < rawOptions.length) {
      correctIndex = letterMap[ca];
    } else {
      const idx = rawOptions.findIndex(opt => opt.toLowerCase() === ca);
      if (idx >= 0) correctIndex = idx;
    }
  }

  // Preserve or extract statements for statement-based MCQs
  let statements: string[] | undefined = undefined;
  const rawStmts = q.statements ?? q.statement ?? q.statementsList ?? (q as any).mcqStatements;
  if (Array.isArray(rawStmts) && rawStmts.length > 0) {
    statements = rawStmts.map((s: any) => String(s ?? '').trim()).filter(Boolean);
  } else if (typeof rawStmts === 'string' && rawStmts.trim()) {
    statements = rawStmts.replace(/<br\s*\/?>/gi, '\n').split('\n').map((s: string) => s.trim()).filter(Boolean);
  }

  // If no explicit statements array, check if question contains embedded statements
  if (!statements || statements.length === 0) {
    try {
      const ext = extractStatements(questionText);
      if (ext.statements && ext.statements.length > 0) {
        statements = ext.statements;
        if (ext.cleanedQuestion && ext.cleanedQuestion.trim()) {
          questionText = ext.cleanedQuestion.trim();
        }
      }
    } catch {}
  }

  // ── Auto-Detect All 8 Competition Question Types ──
  let detectedType = q.questionType;
  let detectedMatchColumns = q.matchColumns;
  let detectedAssertion = q.assertion;
  let detectedReason = q.reason;
  let detectedPassage = q.passage;
  let detectedNegative = q.negativeHighlight;

  try {
    const det = detectQuestionType({
      question: questionText,
      options: rawOptions,
      statements,
      questionType: detectedType,
      matchColumns: detectedMatchColumns,
      assertion: detectedAssertion,
      reason: detectedReason,
      passage: detectedPassage,
    });
    if (det) {
      detectedType = detectedType || det.type;
      if (det.matchColumns && !detectedMatchColumns) detectedMatchColumns = det.matchColumns;
      if (det.assertionReason) {
        if (!detectedAssertion) detectedAssertion = det.assertionReason.assertion;
        if (!detectedReason) detectedReason = det.assertionReason.reason;
      }
      if (det.caseStudy?.passage && !detectedPassage) {
        detectedPassage = det.caseStudy.passage;
        if (det.caseStudy.cleanedQuestion) questionText = det.caseStudy.cleanedQuestion;
      }
      if (det.isNegative && !detectedNegative) detectedNegative = 'true';
    }
  } catch {}

  return {
    id: q.id,
    question: questionText,
    ...(statements && statements.length > 0 ? { statements } : {}),
    options: rawOptions.slice(0, 4),
    correctIndex,
    explanation: q.explanation ? String(q.explanation).trim() : '',
    topic: String(q.topic || q.chapterTitle || q.chapter || q.subtopic || '').trim(),
    chapterTitle: String(q.chapterTitle || q.chapter || '').trim(),
    subject: String(q.subject || '').trim(),
    questionType: detectedType,
    assertion: detectedAssertion,
    reason: detectedReason,
    matchColumns: detectedMatchColumns,
    passage: detectedPassage,
    negativeHighlight: detectedNegative,
    sequenceItems: q.sequenceItems,
    dataSufficiencyStatements: q.dataSufficiencyStatements,
    imageUrl: q.imageUrl,
    imageWidth: q.imageWidth,
    imageAlign: q.imageAlign,
    imagePosition: q.imagePosition,
  };
}

// Competition Books Catalog for 🎯 MCQ Mode ("mcq me competition me jitne book honge sab ka option hoga")
export const COMPETITION_BOOKS = [
  { id: 'ALL', name: 'Sabhi Books (All)', emoji: '📚', tag: 'All Books' },
  { id: 'lucent', name: 'Lucent Samanya Gyan / GK', emoji: '📖', tag: 'Lucent' },
  { id: 'speedyScience', name: 'Speedy Science', emoji: '🔬', tag: 'Speedy Sci' },
  { id: 'speedySocialScience', name: 'Speedy Social Science', emoji: '🌍', tag: 'Speedy SST' },
  { id: 'sarSangrah', name: 'Sar Sangrah', emoji: '📜', tag: 'Sar Sangrah' },
  { id: 'mcq', name: 'MCQ Practice Bank', emoji: '🎯', tag: 'MCQ Bank' },
];

export function getLessonCompetitionBookId(lesson: {
  id?: string;
  lessonTitle?: string;
  subject?: string;
  bookId?: string;
  bookName?: string;
  classLevel?: string;
}): string {
  const title = (lesson.lessonTitle || '').toLowerCase();
  const sub = (lesson.subject || '').toLowerCase();
  const bid = (lesson.bookId || '').toLowerCase();
  const bname = (lesson.bookName || '').toLowerCase();

  if (bid.includes('speedy_science') || bid.includes('speedyscience') || title.includes('speedy science') || sub.includes('speedy science') || bname.includes('speedy science')) {
    return 'speedyScience';
  }
  if (bid.includes('speedy_social') || bid.includes('speedysocial') || title.includes('speedy social') || sub.includes('speedy social') || bname.includes('speedy social')) {
    return 'speedySocialScience';
  }
  if (bid.includes('sar_sangrah') || bid.includes('sarsangrah') || title.includes('sar sangrah') || sub.includes('sar sangrah') || bname.includes('sar sangrah')) {
    return 'sarSangrah';
  }
  if (bid.includes('mcq') || title.includes('mcq practice') || sub.includes('mcq practice')) {
    return 'mcq';
  }
  if (bid.includes('lucent') || title.includes('lucent') || sub.includes('lucent') || bname.includes('lucent')) {
    return 'lucent';
  }
  if (bid && bid !== 'general' && bid !== 'comp') {
    return bid;
  }
  return 'lucent';
}

export interface GroupStudyPrefilledContext {
  contentType: 'READING_NOTES' | 'WRITING_NOTES' | 'MCQ' | 'PREMIUM_MCQ' | 'FLASHCARD' | 'PDF';
  title?: string;
  subject?: string;
  chapterId?: string;
  chapterTitle?: string;
  board?: string;
  classLevel?: string;
  totalQuestions?: number;
  pdfUrl?: string;
  mcqData?: any[];
}

interface GroupStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  settings?: any;
  tierTheme: any;
  activeRoom?: GroupStudyRoom | null;
  prefilledContext?: GroupStudyPrefilledContext | null;
  onActiveRoomChange?: (room: GroupStudyRoom | null) => void;
  onOpenStore?: () => void;
  onNavigateToContent?: (target: {
    tab?: string;
    board?: string;
    classLevel?: string;
    subjectId?: string;
    subjectName?: string;
    chapterId?: string;
    chapterTitle?: string;
    mode?: 'NOTES' | 'MCQ' | 'PDF';
  }) => void;
  onUserUpdate?: (user: any) => void;
}

export const GroupStudyModal: React.FC<GroupStudyModalProps> = ({
  isOpen,
  onClose,
  user,
  settings,
  tierTheme,
  activeRoom,
  prefilledContext,
  onActiveRoomChange,
  onOpenStore,
  onNavigateToContent,
  onUserUpdate,
}) => {
  // ── Plan & Tier Permissions ───────────────────────────────────────────────
  const userTier: 'FREE' | 'BASIC' | 'ULTRA' = (user?.subscriptionLevel || 'FREE')?.toUpperCase() as any;
  const userEmail = (user?.email || auth.currentUser?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(
    user?.role === 'ADMIN' ||
    user?.role === 'SUB_ADMIN' ||
    user?.isAdmin ||
    userEmail === 'n44438403@gmail.com' ||
    userEmail === ADMIN_EMAIL.toLowerCase() ||
    userEmail.includes('admin') ||
    user?.isSuperAdmin
  );

  // Limits mandated:
  // Admin: UNLIMITED rooms, up to 240 min (4 hrs) duration, up to 500 members capacity!
  // Ultra: max 5 rooms per day, max 120 min (2 hr) duration
  // Basic: max 3 rooms per day, max 60 min (1 hr) duration
  // Free: max 2 rooms per day, max 30 min duration
  const maxRoomsPerDay = isAdmin ? Infinity : (
    userTier === 'ULTRA' ? 5 :
    userTier === 'BASIC' ? 3 :
    2
  );

  const isFreeUser = userTier === 'FREE' && !isAdmin && !user?.isPro && !user?.isVip && !user?.isUltraVip;
  const isUltraUser = userTier === 'ULTRA' || isAdmin || Boolean(user?.isUltraVip);
  const isBasicUser = userTier === 'BASIC' || isUltraUser || Boolean(user?.isPro || user?.isVip);
  const isFreeOnly = !isBasicUser;

  const maxDurationMinutesAllowed = isAdmin ? 240 : (
    userTier === 'ULTRA' ? 120 :
    userTier === 'BASIC' ? 60 :
    30
  );

  const durationOptions = useMemo(() => {
    if (isAdmin) return [15, 30, 45, 60, 90, 120, 180, 240];
    if (userTier === 'ULTRA') return [30, 60, 90, 120];
    if (userTier === 'BASIC') return [15, 30, 45, 60];
    return [30];
  }, [isAdmin, userTier]);

  const maxRoomCapacityAllowed = isAdmin ? 500 : (
    userTier === 'ULTRA' ? 100 :
    userTier === 'BASIC' ? 50 :
    25
  );

  const isCreateRoomGloballyHidden = false;

  // ── Daily Created Rooms Tracking ──────────────────────────────────────────
  const [todayCreatedRoomsCount, setTodayCreatedRoomsCount] = useState<number>(0);
  const [upgradePromptReason, setUpgradePromptReason] = useState<'DAILY_ROOM_LIMIT' | 'HOST_BATTLE' | null>(null);

  const getTodayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const getRecordedCreatedRoomsToday = () => {
    try {
      const key = `group_study_created_rooms_${user?.id || 'guest'}_${getTodayDateKey()}`;
      return parseInt(localStorage.getItem(key) || '0', 10);
    } catch {
      return 0;
    }
  };

  const recordCreatedRoomToday = () => {
    if (isAdmin) return;
    try {
      const key = `group_study_created_rooms_${user?.id || 'guest'}_${getTodayDateKey()}`;
      const updated = getRecordedCreatedRoomsToday() + 1;
      localStorage.setItem(key, String(updated));
      setTodayCreatedRoomsCount(updated);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setTodayCreatedRoomsCount(getRecordedCreatedRoomsToday());
    }
  }, [isOpen, user?.id]);

  // ── Rooms & Navigation State ──────────────────────────────────────────────
  const [activeRooms, setActiveRooms] = useState<GroupStudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GroupStudyRoom | null>(() => activeRoom || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinPasswordInput, setJoinPasswordInput] = useState<string>('');
  const [showJoinPasswordInput, setShowJoinPasswordInput] = useState<boolean>(false);
  const [joinCodeError, setJoinCodeError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'MCQ' | 'LEADERBOARD' | 'MEMBERS' | 'CHAT'>('MCQ');

  // ── Password Protection & Optional Name on Entry State ───────────────────
  const [passwordModalRoom, setPasswordModalRoom] = useState<GroupStudyRoom | null>(null);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [entryCustomName, setEntryCustomName] = useState<string>('');
  const [joinNameInput, setJoinNameInput] = useState<string>('');
  const [showChangeNameModal, setShowChangeNameModal] = useState<boolean>(false);
  const [changeNameInputValue, setChangeNameInputValue] = useState<string>('');

  // ── Create Room Form State ────────────────────────────────────────────────
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomSubject, setNewRoomSubject] = useState<string>('Lucent Samanya Gyan');
  const [newRoomPassword, setNewRoomPassword] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [newRoomMcqType, setNewRoomMcqType] = useState<StudyRoomMcqType>('PROJECTOR_MODE');
  const [newRoomDurationMinutes, setNewRoomDurationMinutes] = useState<number>(maxDurationMinutesAllowed);
  const [newRoomMaxMembers, setNewRoomMaxMembers] = useState<number>(30);
  const [showRulesGuideModal, setShowRulesGuideModal] = useState<boolean>(false);
  // ── Room Setup Drawers (Compact Drawer System: Assessment Mode, Section, Class, Competition Book, Lessons, Duration, Question Limits) ──
  const [activeSetupDrawer, setActiveSetupDrawer] = useState<'ASSESSMENT_MODE' | 'SECTION' | 'CLASS' | 'COMPETITION_BOOK' | 'LESSONS' | 'DURATION' | 'QUESTION_LIMITS' | null>(null);
  const [isScheduleMode, setIsScheduleMode] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [autoRunWithoutHost, setAutoRunWithoutHost] = useState<boolean>(true);
  const [roomTheme, setRoomTheme] = useState<'blue' | 'black' | 'white'>(() => {
    try { return (localStorage.getItem('nst_study_room_theme') as any) || 'blue'; } catch { return 'blue'; }
  });

  const toggleRoomTheme = (newTheme: 'blue' | 'black' | 'white') => {
    setRoomTheme(newTheme);
    try { localStorage.setItem('nst_study_room_theme', newTheme); } catch {}
  };

  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState<boolean>(false);
  const [selectedPreloadLesson, setSelectedPreloadLesson] = useState<any | null>(null);
  const [createModeClass, setCreateModeClass] = useState<string>('ALL');
  const [createModeDomain, setCreateModeDomain] = useState<'ACADEMIC' | 'COMPETITION'>('ACADEMIC');
  const [createModeBook, setCreateModeBook] = useState<string>('ALL');
  const [createModeSubject, setCreateModeSubject] = useState<string>('ALL');
  const [createModeSearch, setCreateModeSearch] = useState<string>('');
  const [createModeSourceFilter, setCreateModeSourceFilter] = useState<'ALL' | 'NOTES' | 'HOMEWORK' | 'REVISION_HUB'>('ALL');
  const [lastCreatedRoomId, setLastCreatedRoomId] = useState<string | null>(null);
  const [createdRoomIds, setCreatedRoomIds] = useState<Set<string>>(() => new Set());
  const [launchingLessonId, setLaunchingLessonId] = useState<string | null>(null);

  // ── Room Time Expiry Countdown ────────────────────────────────────────────
  const [roomSecondsLeft, setRoomSecondsLeft] = useState<number>(0);
  const [liveClockNow, setLiveClockNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClockNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Chat & Doubts State ───────────────────────────────────────────────────
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'ALL' | 'DOUBTS'>('ALL');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Live MCQ Battle State ─────────────────────────────────────────────────
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState<boolean>(false);
  const [mcqSecondsLeft, setMcqSecondsLeft] = useState<number>(20);
  const questionTimerRef = useRef<{ key: string; startedAt: number; sourceStart: number }>({
    key: '',
    startedAt: 0,
    sourceStart: 0,
  });
  const [selectedCuratedSet, setSelectedCuratedSet] = useState<string>('');
  const [lastXpOutcome, setLastXpOutcome] = useState<McqAnswerOutcome | null>(null);
  const [showXpBanner, setShowXpBanner] = useState<boolean>(false);
  const [selectedTimerDuration, setSelectedTimerDuration] = useState<number>(30);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState<number>(3);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(true);
  const [showLiveAnswersSheet, setShowLiveAnswersSheet] = useState<boolean>(false);

  // ── Advanced Exam Timer & Pacing Modes ─────────────────────────────────────
  // Default to MIX mode (Self-paced test with Question Grid and alerts)
  const [testTimerMode, setTestTimerMode] = useState<'PER_QUESTION' | 'TOTAL_TEST' | 'MIX'>('MIX');
  const [totalTestMinutes, setTotalTestMinutes] = useState<number>(15);
  const [mixPaceSeconds, setMixPaceSeconds] = useState<number>(20);
  const [mixVibrateAlert, setMixVibrateAlert] = useState<boolean>(true);
  const [studentActiveQIndex, setStudentActiveQIndex] = useState<number>(0);
  const [totalTestSecondsLeft, setTotalTestSecondsLeft] = useState<number>(0);
  const [paceSecondsLeft, setPaceSecondsLeft] = useState<number>(20);
  const [hasPaceAlertTriggered, setHasPaceAlertTriggered] = useState<boolean>(false);
  const [showQuestionPalette, setShowQuestionPalette] = useState<boolean>(false);
  const [hasStudentSubmittedEarly, setHasStudentSubmittedEarly] = useState<boolean>(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lobbyActionTab, setLobbyActionTab] = useState<'LAUNCH' | 'SCHEDULE'>('LAUNCH');
  const [isSchedulingTest, setIsSchedulingTest] = useState<boolean>(false);

  // ── Student-controlled Ideal Question Pace & Vibration Alert ────────────────
  const [userPaceSeconds, setUserPaceSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('study_user_pace_seconds');
      if (saved) {
        const val = parseInt(saved, 10);
        if (Number.isFinite(val) && val >= 5 && val <= 300) return val;
      }
    } catch {}
    return 20;
  });

  const [userVibrateAlert, setUserVibrateAlert] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('study_user_vibrate_alert');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default ON: Phone vibrates when pace alert triggers
  });

  const [showPaceSettingsModal, setShowPaceSettingsModal] = useState<boolean>(false);

  useEffect(() => {
    if (showSubmitConfirmModal) setSubmitError(null);
  }, [showSubmitConfirmModal]);

  // ── Staggered Batch Submission State (Zero Continuous RTDB Writes during questions) ──
  const [localBattleStats, setLocalBattleStats] = useState<{
    score: number;
    correctCount: number;
    wrongCount: number;
    totalAnswered: number;
    currentStreak: number;
    maxStreak: number;
    userXp: number;
    streakBonusXp: number;
    answers: Record<number, { selectedOption: number; isCorrect: boolean; timeTakenSec: number }>;
  }>({
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    totalAnswered: 0,
    currentStreak: 0,
    maxStreak: 0,
    userXp: 0,
    streakBonusXp: 0,
    answers: {},
  });
  const [hasBatchSubmitted, setHasBatchSubmitted] = useState<boolean>(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);
  const [batchSyncSecondsRemaining, setBatchSyncSecondsRemaining] = useState<number>(0);

  // ── Anti-Cheating / App-Minimize Detection State ─────────────────────────
  const [minimizeWarningCount, setMinimizeWarningCount] = useState<number>(0);
  const [showMinimizeWarningModal, setShowMinimizeWarningModal] = useState<boolean>(false);
  const [isDisqualifiedFromRoom, setIsDisqualifiedFromRoom] = useState<boolean>(false);
  const [showDisqualifiedModal, setShowDisqualifiedModal] = useState<boolean>(false);

  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);
  const [isDiscussionCollapsed, setIsDiscussionCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nst_hide_live_discussion') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDiscussionCollapsed = (forceState?: boolean) => {
    setIsDiscussionCollapsed((prev) => {
      const next = typeof forceState === 'boolean' ? forceState : !prev;
      try {
        localStorage.setItem('nst_hide_live_discussion', String(next));
      } catch {}
      return next;
    });
  };
  const [showMobileRoomInfo, setShowMobileRoomInfo] = useState<boolean>(false);
  const [showMobileInvite, setShowMobileInvite] = useState<boolean>(false);
  const [sendingInviteNotif, setSendingInviteNotif] = useState<boolean>(false);
  const [inviteNotifSent, setInviteNotifSent] = useState<boolean>(false);
  const [showMobileHostControls, setShowMobileHostControls] = useState<boolean>(false);
  const [showHostTimerDropdown, setShowHostTimerDropdown] = useState<boolean>(false);
  const [selectedReviewQIdx, setSelectedReviewQIdx] = useState<number | null>(null);
  const [showHostNextPicker, setShowHostNextPicker] = useState<boolean>(false);
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');
  const savedSessionsRef = useRef<Set<string>>(new Set());
  const battleSessionKeyRef = useRef('');

  const battleSessionKey = currentRoom?.id && currentRoom.liveMcq?.testStartTime
    ? `${currentRoom.id}:${currentRoom.liveMcq.testStartTime}`
    : '';

  // A room can host multiple battles. Do not carry a previous battle's score
  // or submitted state into the next lesson launched in the same room.
  useEffect(() => {
    if (!battleSessionKey || battleSessionKeyRef.current === battleSessionKey) return;
    battleSessionKeyRef.current = battleSessionKey;
    setLocalBattleStats({
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      totalAnswered: 0,
      currentStreak: 0,
      maxStreak: 0,
      userXp: 0,
      streakBonusXp: 0,
      answers: {},
    });
    setHasBatchSubmitted(false);
    setIsSubmittingBatch(false);
    setBatchSyncSecondsRemaining(0);
    setHasStudentSubmittedEarly(false);
    setStudentActiveQIndex(0);
    setSelectedOption(null);
    setHasAnsweredCurrentQ(false);
    setShowQuestionPalette(false);
  }, [battleSessionKey]);

  // Is an MCQ actively being answered or revealed right now?
  const isMcqRunning = Boolean(
    currentRoom?.liveMcq?.isActive &&
    (currentRoom.liveMcq.status === 'QUESTION' || currentRoom.liveMcq.status === 'REVEAL')
  );

  // ── In-Room Lobby Lesson & Subject Chooser Filters (3rd Pic Screen) ──────
  const [battleDomain, setBattleDomain] = useState<'ACADEMIC' | 'COMPETITION'>('ACADEMIC');
  const [battleBook, setBattleBook] = useState<string>('ALL');
  const [battleClass, setBattleClass] = useState<string>('ALL');
  const [battleSubject, setBattleSubject] = useState<string>('ALL');
  const [battleSubjects, setBattleSubjects] = useState<string[]>(['ALL']);
  const [selectedCuratedSets, setSelectedCuratedSets] = useState<string[]>([]);
  const [limitMode, setLimitMode] = useState<'ALL' | 'PER_LESSON' | 'PER_SUBJECT' | 'TOTAL'>('ALL');
  const [questionsPerLessonLimit, setQuestionsPerLessonLimit] = useState<number>(10);
  const [questionsPerSubjectLimit, setQuestionsPerSubjectLimit] = useState<number>(15);
  const [totalQuestionsLimit, setTotalQuestionsLimit] = useState<number>(20);
  const [questionOrderMode, setQuestionOrderMode] = useState<'SEQUENTIAL' | 'RANDOM'>('RANDOM');
  const [showUltraQuestionInspector, setShowUltraQuestionInspector] = useState<boolean>(false);
  const [ultraExcludedQuestionKeys, setUltraExcludedQuestionKeys] = useState<Set<string>>(new Set());
  const [ultraQuestionsSearch, setUltraQuestionsSearch] = useState<string>('');
  const [tierFeaturePrompt, setTierFeaturePrompt] = useState<{
    title: string;
    description: string;
    targetTier: 'BASIC' | 'ULTRA';
  } | null>(null);
  const [showDetailedMarksheet, setShowDetailedMarksheet] = useState<boolean>(false);
  const [currentExamResult, setCurrentExamResult] = useState<MCQResult | null>(null);
  const [topicFilterTab, setTopicFilterTab] = useState<'ALL' | 'WEAK' | 'STRONG'>('ALL');
  const [battleCategory, setBattleCategory] = useState<'ALL' | 'NOTES' | 'HOMEWORK'>('ALL');
  const [battleSearch, setBattleSearch] = useState<string>('');
  const [showChapterChooser, setShowChapterChooser] = useState<boolean>(false);
  const [chooserMcqType, setChooserMcqType] = useState<StudyRoomMcqType>('PROJECTOR_MODE');
  const [chooserClass, setChooserClass] = useState<string>('ALL');
  const [chooserSubject, setChooserSubject] = useState<string>('ALL');
  const [chooserSearch, setChooserSearch] = useState<string>('');
  const [chooserSource, setChooserSource] = useState<'ALL' | 'REVISION_HUB' | 'NOTES' | 'HOMEWORK'>('ALL');
  const [isLoadingChapterMcq, setIsLoadingChapterMcq] = useState<boolean>(false);
  const [firebaseMcqLessons, setFirebaseMcqLessons] = useState<any[]>([]);

  // Subscribe to real-time mcq_lessons from Firebase / cache
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeMcqLessons((lessons) => {
      setFirebaseMcqLessons(lessons || []);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [isOpen]);

  // Keep ref to onActiveRoomChange
  const onActiveRoomChangeRef = useRef(onActiveRoomChange);
  useEffect(() => {
    onActiveRoomChangeRef.current = onActiveRoomChange;
  });

  // Sync external activeRoom changes
  useEffect(() => {
    if (activeRoom && (!currentRoom || currentRoom.id !== activeRoom.id)) {
      setCurrentRoom(activeRoom);
    }
  }, [activeRoom?.id]);

  // ── Screen Rotate & Orientation State ─────────────────────────────────────
  const [isScreenRotated, setIsScreenRotated] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkOrientation = () => {
      try {
        setIsScreenRotated(window.innerWidth > window.innerHeight);
      } catch {}
    };
    const handleRotateEvent = (e: any) => {
      if (e.detail?.orientation) {
        setIsScreenRotated(e.detail.orientation === 'landscape');
      } else {
        checkOrientation();
      }
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('nst-screen-rotate', handleRotateEvent);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('nst-screen-rotate', handleRotateEvent);
    };
  }, []);

  const handleToggleRotate = async () => {
    try {
      const res = await rotateScreen();
      if (res !== null) {
        setIsScreenRotated(res === 'landscape');
      } else {
        setIsScreenRotated(prev => !prev);
      }
    } catch (err) {
      console.error('Rotate error:', err);
      setIsScreenRotated(prev => !prev);
    }
  };

  // ── Unified Real MCQ Lessons Actually Added in the App ────────────────────
  // STRICT: Only lessons that actually contain questions are included!
  const allRealLessons = useMemo(() => {
    const lessonsMap = new Map<string, {
      id: string;
      lessonTitle: string;
      classLevel: string;
      subject: string;
      board?: string;
      bookId?: string;
      bookName?: string;
      isRevisionHub?: boolean;
      questions: GroupStudyMcqQuestion[];
      mcqCount: number;
      sourceType: 'REVISION_HUB' | 'NOTES' | 'HOMEWORK' | 'CURATED' | 'CONTEXT' | 'COMPETITION';
    }>();

    // 1. From Firebase mcq_lessons (Admin Class MCQs & Competition MCQs - Revision Hub)
    (firebaseMcqLessons || []).forEach((l: any) => {
      if (!l) return;
      const title = (l.lessonTitle || l.title || l.name || '').trim();
      if (!title) return;

      const rawQs = Array.isArray(l.mcqs) ? l.mcqs : (Array.isArray(l.mcqList) ? l.mcqList : (Array.isArray(l.parsedMcqs) ? l.parsedMcqs : []));
      const cleanQs: GroupStudyMcqQuestion[] = [];
      for (const q of rawQs) {
        const parsed = parseQuestionToGroupMcq(q);
        if (parsed) {
          cleanQs.push({
            ...parsed,
            topic: parsed.topic || (q as any).topic || title,
            chapterTitle: parsed.chapterTitle || (q as any).chapterTitle || title,
            subject: parsed.subject || l.subject || 'General',
          });
        }
      }

      if (cleanQs.length === 0) return; // Only include if it actually has MCQs!

      let cls = String(l.classLevel || '').trim().toUpperCase();
      if (cls.startsWith('CLASS_') || cls.startsWith('CLASS ') || cls.startsWith('CLASS-')) {
        cls = cls.replace(/^CLASS[-_ ]+/i, '');
      }
      cls = cls.replace(/(?:ST|ND|RD|TH)$/i, '');

      // Check if title, subject or book indicates competition
      const titleLower = title.toLowerCase();
      const subLower = (l.subject || '').toLowerCase();
      const isCompTitle =
        cls === 'COMPETITION' ||
        cls === 'LUCENT' ||
        titleLower.includes('lucent') ||
        titleLower.includes('speedy') ||
        titleLower.includes('sar sangrah') ||
        titleLower.includes('competition') ||
        subLower.includes('lucent') ||
        subLower.includes('speedy') ||
        subLower.includes('competition');

      if (!cls || cls === 'ALL' || cls === 'LUCENT') {
        cls = isCompTitle ? 'COMPETITION' : '10';
      }

      const effectiveCls = isCompTitle ? 'COMPETITION' : cls;

      const key = `${effectiveCls}__${title.toLowerCase()}`;
      lessonsMap.set(key, {
        id: l.id || `mcq_${title}`,
        lessonTitle: title,
        classLevel: effectiveCls,
        subject: l.subject || 'General',
        board: l.board,
        bookId: l.bookId || l.book,
        bookName: l.bookName,
        questions: cleanQs,
        mcqCount: cleanQs.length,
        sourceType: isCompTitle ? 'COMPETITION' : (l.sourceType || 'NOTES'),
        isRevisionHub: true,
      });
    });

    // 2. From Admin Lucent & Class Notes in settings
    if (Array.isArray(settings?.lucentNotes)) {
      for (const n of settings.lucentNotes) {
        if (!n || !n.lessonTitle) continue;
        const title = n.lessonTitle.trim();
        if (!title) continue;

        let cls = String(n.classLevel || '').trim().toUpperCase();
        if (cls.startsWith('CLASS_') || cls.startsWith('CLASS ')) cls = cls.replace(/CLASS[_ ]/i, '');
        if (!cls || cls === 'ALL' || cls === 'LUCENT') cls = 'COMPETITION';

        const key = `${cls}__${title.toLowerCase()}`;
        if (lessonsMap.has(key)) continue;

        const cleanQs: GroupStudyMcqQuestion[] = [];
        if (Array.isArray(n.pages)) {
          for (const page of n.pages) {
            if (!page) continue;
            let found = false;
            for (const qKey of ['mcqs', 'parsedMcqs', 'mcqList'] as const) {
              if (Array.isArray(page[qKey])) {
                for (const q of page[qKey]) {
                  const parsed = parseQuestionToGroupMcq(q);
                  if (parsed) {
                    const pageTopic = (page as any).topicName || (page as any).topic || (page as any).title || title;
                    cleanQs.push({
                      ...parsed,
                      topic: parsed.topic || pageTopic,
                      chapterTitle: parsed.chapterTitle || title,
                      subject: parsed.subject || n.subject || 'General',
                    });
                    found = true;
                  }
                }
              }
            }
            if (!found && typeof page.mcqText === 'string' && page.mcqText.trim()) {
              try {
                const parsed = parseMCQText(page.mcqText.trim());
                if (parsed && Array.isArray(parsed.questions)) {
                  for (const q of parsed.questions) {
                    const pq = parseQuestionToGroupMcq(q);
                    if (pq) {
                      const pageTopic = (page as any).topicName || (page as any).topic || (page as any).title || title;
                      cleanQs.push({
                        ...pq,
                        topic: pq.topic || pageTopic,
                        chapterTitle: pq.chapterTitle || title,
                        subject: pq.subject || n.subject || 'General',
                      });
                    }
                  }
                }
              } catch (_) {}
            }
          }
        }

        if (cleanQs.length === 0) continue; // Only include if it actually has MCQs!

        lessonsMap.set(key, {
          id: n.id || `note_${title}`,
          lessonTitle: title,
          classLevel: cls,
          subject: n.subject || 'General',
          board: n.board,
          questions: cleanQs,
          mcqCount: cleanQs.length,
          sourceType: 'NOTES',
        });
      }
    }

    // 3. From Admin Homework & Competition Homework in settings
    if (Array.isArray(settings?.homework)) {
      for (const hw of settings.homework) {
        if (!hw) continue;
        const title = (hw.lessonTitle || hw.title || hw.name || hw.targetSubject || '').trim();
        if (!title) continue;

        let cls = String(hw.classTarget || hw.classLevel || '').trim().toUpperCase();
        if (cls.startsWith('CLASS_') || cls.startsWith('CLASS ')) cls = cls.replace(/CLASS[_ ]/i, '');
        if (!cls || cls === 'ALL' || cls === 'LUCENT' || cls === 'COMP') cls = 'COMPETITION';

        const key = `${cls}__${title.toLowerCase()}`;
        if (lessonsMap.has(key)) continue;

        const cleanQs: GroupStudyMcqQuestion[] = [];
        for (const qKey of ['parsedMcqs', 'mcqs', 'mcqList'] as const) {
          if (Array.isArray(hw[qKey])) {
            for (const q of hw[qKey]) {
              const parsed = parseQuestionToGroupMcq(q);
              if (parsed) cleanQs.push(parsed);
            }
          }
        }

        if (Array.isArray(hw.pages)) {
          for (const page of hw.pages) {
            if (!page) continue;
            let found = false;
            for (const qKey of ['mcqs', 'parsedMcqs', 'mcqList'] as const) {
              if (Array.isArray(page[qKey])) {
                for (const q of page[qKey]) {
                  const parsed = parseQuestionToGroupMcq(q);
                  if (parsed) {
                    cleanQs.push(parsed);
                    found = true;
                  }
                }
              }
            }
            if (!found && typeof page.mcqText === 'string' && page.mcqText.trim()) {
              try {
                const parsed = parseMCQText(page.mcqText.trim());
                if (parsed && Array.isArray(parsed.questions)) {
                  for (const q of parsed.questions) {
                    const pq = parseQuestionToGroupMcq(q);
                    if (pq) cleanQs.push(pq);
                  }
                }
              } catch (_) {}
            }
          }
        }

        if (cleanQs.length === 0 && typeof hw.mcqText === 'string' && hw.mcqText.trim()) {
          try {
            const parsed = parseMCQText(hw.mcqText.trim());
            if (parsed && Array.isArray(parsed.questions)) {
              for (const q of parsed.questions) {
                const pq = parseQuestionToGroupMcq(q);
                if (pq) cleanQs.push(pq);
              }
            }
          } catch (_) {}
        }

        if (cleanQs.length === 0) continue;

        lessonsMap.set(key, {
          id: hw.id || `hw_${title}`,
          lessonTitle: title,
          classLevel: cls,
          subject: hw.targetSubject || hw.subject || 'Competition Homework',
          board: hw.board,
          questions: cleanQs,
          mcqCount: cleanQs.length,
          sourceType: 'HOMEWORK',
        });
      }
    }

    // 4. Built-in curated sets (Lucent Samanya Gyan, General Science, etc.)
    CURATED_MCQ_SETS.forEach((s) => {
      if (s.questions && s.questions.length > 0) {
        const key = `COMPETITION__${s.name.toLowerCase()}`;
        if (!lessonsMap.has(key)) {
          lessonsMap.set(key, {
            id: s.id,
            lessonTitle: s.name,
            classLevel: 'COMPETITION',
            subject: s.subject || 'Competition',
            questions: s.questions,
            mcqCount: s.questions.length,
            sourceType: 'CURATED',
          });
        }
      }
    });

    // 5. From prefilledContext if present
    if (prefilledContext && Array.isArray(prefilledContext.mcqData) && prefilledContext.mcqData.length > 0) {
      const cleanQs: GroupStudyMcqQuestion[] = [];
      for (const q of prefilledContext.mcqData) {
        const parsed = parseQuestionToGroupMcq(q);
        if (parsed) cleanQs.push(parsed);
      }
      if (cleanQs.length > 0) {
        const title = prefilledContext.chapterTitle || prefilledContext.title || 'Selected Topic MCQ';
        const cls = String(prefilledContext.classLevel || user.classLevel || '10').replace(/class[_ ]/i, '').toUpperCase();
        const key = `${cls}__${title.toLowerCase()}`;
        lessonsMap.set(key, {
          id: 'context_prefilled_lesson',
          lessonTitle: title,
          classLevel: cls || '10',
          subject: prefilledContext.subject || 'General',
          questions: cleanQs,
          mcqCount: cleanQs.length,
          sourceType: 'CONTEXT',
        });
      }
    }

    return Array.from(lessonsMap.values());
  }, [firebaseMcqLessons, settings?.lucentNotes, settings?.homework, prefilledContext, user.classLevel]);

  // Available classes in sorted order
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    allRealLessons.forEach((l) => {
      if (l.classLevel) classSet.add(l.classLevel);
    });
    const order = ['10', '12', '9', '8', '7', '6', '11', 'COMPETITION'];
    return Array.from(classSet).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [allRealLessons]);

  // Filter lessons by chosen class
  const lessonsForSelectedClass = useMemo(() => {
    if (chooserClass === 'ALL') return allRealLessons;
    return allRealLessons.filter((l) => l.classLevel === chooserClass);
  }, [allRealLessons, chooserClass]);

  // Available subjects for the chosen class
  const availableSubjectsForClass = useMemo(() => {
    const subjSet = new Set<string>();
    lessonsForSelectedClass.forEach((l) => {
      if (l.subject) subjSet.add(l.subject);
    });
    return Array.from(subjSet).sort();
  }, [lessonsForSelectedClass]);

  // Filtered lessons by source, class, subject, and search query
  const filteredRealLessons = useMemo(() => {
    let list = lessonsForSelectedClass;
    if (chooserSource !== 'ALL') {
      list = list.filter((l) => l.sourceType === chooserSource);
    }
    if (chooserSubject !== 'ALL') {
      list = list.filter((l) => l.subject === chooserSubject);
    }
    if (chooserSearch.trim()) {
      const q = chooserSearch.trim().toLowerCase();
      list = list.filter((l) =>
        l.lessonTitle.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        (l.classLevel && l.classLevel.toLowerCase().includes(q))
      );
    }
    return list;
  }, [lessonsForSelectedClass, chooserSource, chooserSubject, chooserSearch]);

  // Academic classes (Class 6th to 12th)
  const academicClasses = useMemo(() => {
    const defaultClasses = ['6', '7', '8', '9', '10', '11', '12'];
    const found = availableClasses.filter((c) => c !== 'COMPETITION');
    const merged = Array.from(new Set([...defaultClasses, ...found]));
    const order = ['10', '12', '9', '8', '7', '6', '11'];
    return merged.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [availableClasses]);

  // All Competition Books for MCQ Mode (including custom books from settings)
  const allCompetitionBooks = useMemo(() => {
    const list = [...COMPETITION_BOOKS];
    if (Array.isArray(settings?.customBooks)) {
      settings.customBooks.forEach((cb: any) => {
        if (cb && cb.id && cb.name && !list.some((b) => b.id === cb.id)) {
          list.push({
            id: cb.id,
            name: cb.name,
            emoji: '📗',
            tag: cb.name.slice(0, 12),
          });
        }
      });
    }
    return list;
  }, [settings?.customBooks]);

  // Lucent Subject Options (for Revision Hub Competition Mode)
  const lucentSubjectOptions = useMemo(() => {
    return getLucentSubjectOptions(settings);
  }, [settings]);

  // Academic Subject Options (for Academic Mode)
  const academicSubjects = useMemo(() => {
    const classLessons = allRealLessons.filter(
      (l) => l.classLevel && l.classLevel !== 'COMPETITION' && (battleClass === 'ALL' || l.classLevel === battleClass)
    );
    return Array.from(new Set(classLessons.map((l) => l.subject))).filter(Boolean).sort();
  }, [allRealLessons, battleClass]);

  // ── Build Available Real MCQ Sets from Syllabus / Context / App Data (In-Room 3rd Screen) ─────
  const availableBattleSets = useMemo(() => {
    const sets: Array<{
      id: string;
      name: string;
      subject: string;
      classLevel?: string;
      sourceType?: string;
      emoji: string;
      tag?: string;
      badgeColor?: string;
      questions: GroupStudyMcqQuestion[];
    }> = [];

    const isSubjectAllowed = (subj: string) => {
      if (currentRoom?.mcqType !== 'REVISION_HUB' && battleSubjects && battleSubjects.length > 0) {
        if (battleSubjects.includes('ALL')) return true;
        return battleSubjects.includes(subj);
      }
      return battleSubject === 'ALL' || subj === battleSubject;
    };

    const isRevisionHub = currentRoom?.mcqType === 'REVISION_HUB';

    if (isRevisionHub) {
      // ⚡ MCQ + MODE: Revision Hub sets
      let revLessons = allRealLessons.filter((l) => l.isRevisionHub || l.sourceType === 'REVISION_HUB');

      if (battleDomain === 'ACADEMIC') {
        // Class 6th to 12th Board Syllabus
        revLessons = revLessons.filter((l) => l.classLevel && l.classLevel !== 'COMPETITION');
        if (battleClass !== 'ALL') {
          revLessons = revLessons.filter((l) => l.classLevel === battleClass || l.classLevel === 'ALL');
        }
        revLessons = revLessons.filter((l) => isSubjectAllowed(l.subject));
      } else {
        // 🏆 COMPETITION in MCQ+ Mode: STRICTLY ONLY LUCENT!
        // "par mcq+ me competition me revision hub me only lucent jata hai to only lucent hi rahega bas."
        revLessons = revLessons.filter((l) => {
          const isCompClass = l.classLevel === 'COMPETITION';
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          const isLucent = titleLower.includes('lucent') || subLower.includes('lucent') || isCompClass;
          const isOtherBook = titleLower.includes('speedy') || titleLower.includes('sar sangrah');
          return isLucent && !isOtherBook;
        });

        revLessons = revLessons.filter((l) => isSubjectAllowed(l.subject));
      }

      if (battleSearch.trim()) {
        const q = battleSearch.trim().toLowerCase();
        revLessons = revLessons.filter(
          (l) =>
            l.lessonTitle.toLowerCase().includes(q) ||
            l.subject.toLowerCase().includes(q) ||
            (l.classLevel && l.classLevel.toLowerCase().includes(q))
        );
      }

      // Sort so the user's class comes first in Academic
      const userClass = String(user?.classLevel || '10').replace(/class[_ ]/i, '').toUpperCase();
      const sortedRevLessons = [...revLessons].sort((a, b) => {
        if (battleDomain === 'ACADEMIC') {
          const aIsUserClass = a.classLevel === userClass ? 1 : 0;
          const bIsUserClass = b.classLevel === userClass ? 1 : 0;
          if (aIsUserClass !== bIsUserClass) return bIsUserClass - aIsUserClass;
        }
        return a.lessonTitle.localeCompare(b.lessonTitle);
      });

      sortedRevLessons.forEach((l) => {
        const isComp = l.classLevel === 'COMPETITION' || battleDomain === 'COMPETITION';
        const clsLabel = isComp ? '🏆 Lucent Comp' : `Class ${l.classLevel || '10'}`;
        sets.push({
          id: l.id,
          name: `${l.lessonTitle} (${clsLabel} • ${l.subject})`,
          subject: l.subject,
          classLevel: l.classLevel,
          sourceType: l.sourceType,
          emoji: '⚡',
          tag: `⚡ ${clsLabel}`,
          badgeColor: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
          questions: l.questions,
        });
      });
    } else {
      // 🎯 MCQ MODE:
      if (battleDomain === 'ACADEMIC') {
        // Academic Syllabus (Class 6-12 Notes, Firebase MCQs & Homework)
        let academicLessons = allRealLessons.filter((l) => {
          return l.classLevel && l.classLevel !== 'COMPETITION';
        });

        if (battleClass !== 'ALL') {
          academicLessons = academicLessons.filter((l) => l.classLevel === battleClass || l.classLevel === 'ALL');
        }
        if (battleCategory === 'NOTES') {
          academicLessons = academicLessons.filter((l) => l.sourceType !== 'HOMEWORK');
        } else if (battleCategory === 'HOMEWORK') {
          academicLessons = academicLessons.filter((l) => l.sourceType === 'HOMEWORK');
        }

        academicLessons = academicLessons.filter((l) => isSubjectAllowed(l.subject));

        if (battleSearch.trim()) {
          const q = battleSearch.trim().toLowerCase();
          academicLessons = academicLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q) ||
              (l.classLevel && l.classLevel.toLowerCase().includes(q))
          );
        }

        // Add prefilledContext if chapter was pre-selected
        if (prefilledContext && prefilledContext.mcqData && Array.isArray(prefilledContext.mcqData)) {
          const title = prefilledContext.chapterTitle || prefilledContext.title || 'Selected Chapter MCQ';
          const matchesSearch = !battleSearch.trim() || title.toLowerCase().includes(battleSearch.trim().toLowerCase());
          if (matchesSearch && (battleCategory === 'ALL' || battleCategory === 'NOTES')) {
            const qs: GroupStudyMcqQuestion[] = prefilledContext.mcqData
              .map((q: any) => parseQuestionToGroupMcq(q))
              .filter(Boolean) as GroupStudyMcqQuestion[];

            if (qs.length > 0) {
              sets.push({
                id: 'context_chapter_set',
                name: title,
                subject: prefilledContext.subject || 'General',
                classLevel: prefilledContext.classLevel,
                sourceType: 'CURATED',
                emoji: '🎯',
                tag: '🎯 Chapter',
                badgeColor: 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
                questions: qs,
              });
            }
          }
        }

        academicLessons.forEach((l) => {
          const isHw = l.sourceType === 'HOMEWORK';
          const emoji = isHw ? '📝' : '📖';
          const typeLabel = isHw ? 'Homework' : 'Notes';
          const badgeColor = isHw
            ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
            : 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50';

          sets.push({
            id: l.id,
            name: `${l.lessonTitle} (${typeLabel} • ${l.subject})`,
            subject: l.subject,
            classLevel: l.classLevel,
            sourceType: l.sourceType,
            emoji,
            tag: `${emoji} Class ${l.classLevel || '10'}`,
            badgeColor,
            questions: l.questions,
          });
        });
      } else {
        // 🏆 COMPETITION in MCQ Mode: ALL COMPETITION BOOKS!
        // "mcq me competition me jitne book honge sab ka option hoga"
        let compLessons = allRealLessons.filter((l) => {
          if (l.classLevel === 'COMPETITION' || l.sourceType === 'CURATED') return true;
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          return (
            titleLower.includes('lucent') ||
            titleLower.includes('speedy') ||
            titleLower.includes('sar sangrah') ||
            titleLower.includes('bssc') ||
            titleLower.includes('railway') ||
            titleLower.includes('ssc') ||
            subLower.includes('lucent') ||
            subLower.includes('speedy') ||
            subLower.includes('competition')
          );
        });

        // Filter by book if selected
        if (battleBook !== 'ALL') {
          compLessons = compLessons.filter((l) => getLessonCompetitionBookId(l) === battleBook);
        }

        compLessons = compLessons.filter((l) => isSubjectAllowed(l.subject));

        if (battleSearch.trim()) {
          const q = battleSearch.trim().toLowerCase();
          compLessons = compLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q)
          );
        }

        compLessons.forEach((l) => {
          const bookId = getLessonCompetitionBookId(l);
          const bookMeta = allCompetitionBooks.find((b) => b.id === bookId) || {
            name: 'Competition Book',
            emoji: '🏆',
            tag: 'Competition',
          };

          sets.push({
            id: l.id,
            name: `${l.lessonTitle} (${bookMeta.name} • ${l.subject})`,
            subject: l.subject,
            classLevel: 'COMPETITION',
            sourceType: l.sourceType,
            emoji: bookMeta.emoji,
            tag: `${bookMeta.emoji} ${bookMeta.tag}`,
            badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
            questions: l.questions,
          });
        });
      }
    }

    return sets;
  }, [
    prefilledContext,
    allRealLessons,
    currentRoom?.mcqType,
    user?.classLevel,
    battleDomain,
    battleBook,
    battleClass,
    battleSubject,
    battleSubjects,
    isBasicUser,
    battleCategory,
    battleSearch,
    allCompetitionBooks,
  ]);

  useEffect(() => {
    if (availableBattleSets.length > 0) {
      if (!availableBattleSets.some((s) => s.id === selectedCuratedSet)) {
        setSelectedCuratedSet(availableBattleSets[0].id);
      }
      if (selectedCuratedSets.length === 0) {
        setSelectedCuratedSets([availableBattleSets[0].id]);
      }
    } else {
      setSelectedCuratedSet('');
      setSelectedCuratedSets([]);
    }
  }, [availableBattleSets, selectedCuratedSet, selectedCuratedSets.length]);

  // Compute all available questions for Ultra Question Inspector
  const allAvailableQuestionsForUltra = useMemo(() => {
    let targetSets: typeof availableBattleSets = [];
    if (isBasicUser && selectedCuratedSets.length > 0) {
      targetSets = availableBattleSets.filter((s) => selectedCuratedSets.includes(s.id));
    } else {
      const single = availableBattleSets.find((s) => s.id === selectedCuratedSet);
      if (single) targetSets = [single];
    }
    if (targetSets.length === 0 && availableBattleSets.length > 0) {
      targetSets = [availableBattleSets[0]];
    }

    const list: { q: GroupStudyMcqQuestion; lessonTitle: string; subject: string; key: string }[] = [];
    targetSets.forEach((s) => {
      (s.questions || []).forEach((q, idx) => {
        const key = `${s.id}__${idx}__${(q.question || '').slice(0, 30)}`;
        list.push({
          q,
          lessonTitle: s.name,
          subject: s.subject || 'General',
          key,
        });
      });
    });
    return list;
  }, [isBasicUser, selectedCuratedSets, selectedCuratedSet, availableBattleSets]);

  const filteredUltraQuestions = useMemo(() => {
    if (!ultraQuestionsSearch.trim()) return allAvailableQuestionsForUltra;
    const q = ultraQuestionsSearch.trim().toLowerCase();
    return allAvailableQuestionsForUltra.filter(
      (item) =>
        item.q.question.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.lessonTitle.toLowerCase().includes(q) ||
        item.q.options.some((opt) => opt.toLowerCase().includes(q))
    );
  }, [allAvailableQuestionsForUltra, ultraQuestionsSearch]);

  // ── Available Lessons for Create Room Modal ──────────────────────────────
  const createModalBattleSets = useMemo(() => {
    const isRevision = newRoomMcqType === 'REVISION_HUB';
    if (isRevision) {
      let revLessons = allRealLessons.filter((l) => l.isRevisionHub || l.sourceType === 'REVISION_HUB');

      if (createModeDomain === 'ACADEMIC') {
        // Academic Syllabus: Class 6 to 12
        revLessons = revLessons.filter((l) => l.classLevel && l.classLevel !== 'COMPETITION');
        if (createModeClass !== 'ALL') {
          revLessons = revLessons.filter((l) => l.classLevel === createModeClass || l.classLevel === 'ALL');
        }
        if (createModeSubject !== 'ALL') {
          revLessons = revLessons.filter((l) => l.subject === createModeSubject);
        }
      } else {
        // Competition: ONLY Lucent!
        revLessons = revLessons.filter((l) => {
          const isCompClass = l.classLevel === 'COMPETITION';
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          const isLucent = titleLower.includes('lucent') || subLower.includes('lucent') || isCompClass;
          const isOtherBook = titleLower.includes('speedy') || titleLower.includes('sar sangrah');
          return isLucent && !isOtherBook;
        });

        if (createModeSubject !== 'ALL') {
          revLessons = revLessons.filter((l) => l.subject === createModeSubject);
        }
      }

      if (createModeSearch.trim()) {
        const q = createModeSearch.trim().toLowerCase();
        revLessons = revLessons.filter(
          (l) =>
            l.lessonTitle.toLowerCase().includes(q) ||
            l.subject.toLowerCase().includes(q) ||
            (l.classLevel && l.classLevel.toLowerCase().includes(q))
        );
      }
      return revLessons;
    } else {
      // 🎯 MCQ Mode
      if (createModeDomain === 'ACADEMIC') {
        let academicLessons = allRealLessons.filter((l) => {
          return l.classLevel && l.classLevel !== 'COMPETITION';
        });

        if (createModeClass !== 'ALL') {
          academicLessons = academicLessons.filter((l) => l.classLevel === createModeClass || l.classLevel === 'ALL');
        }
        if (createModeSourceFilter === 'NOTES') {
          academicLessons = academicLessons.filter((l) => l.sourceType !== 'HOMEWORK');
        } else if (createModeSourceFilter === 'HOMEWORK') {
          academicLessons = academicLessons.filter((l) => l.sourceType === 'HOMEWORK');
        }

        if (createModeSearch.trim()) {
          const q = createModeSearch.trim().toLowerCase();
          academicLessons = academicLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q) ||
              (l.classLevel && l.classLevel.toLowerCase().includes(q))
          );
        }
        return academicLessons;
      } else {
        // Competition: All competition books
        let compLessons = allRealLessons.filter((l) => {
          if (l.classLevel === 'COMPETITION' || l.sourceType === 'CURATED') return true;
          const titleLower = (l.lessonTitle || '').toLowerCase();
          const subLower = (l.subject || '').toLowerCase();
          return (
            titleLower.includes('lucent') ||
            titleLower.includes('speedy') ||
            titleLower.includes('sar sangrah') ||
            titleLower.includes('bssc') ||
            titleLower.includes('railway') ||
            titleLower.includes('ssc') ||
            subLower.includes('lucent') ||
            subLower.includes('speedy') ||
            subLower.includes('competition')
          );
        });

        if (createModeBook !== 'ALL') {
          compLessons = compLessons.filter((l) => getLessonCompetitionBookId(l) === createModeBook);
        }

        if (createModeSearch.trim()) {
          const q = createModeSearch.trim().toLowerCase();
          compLessons = compLessons.filter(
            (l) =>
              l.lessonTitle.toLowerCase().includes(q) ||
              l.subject.toLowerCase().includes(q)
          );
        }
        return compLessons;
      }
    }
  }, [
    newRoomMcqType,
    createModeDomain,
    createModeBook,
    createModeClass,
    createModeSubject,
    createModeSourceFilter,
    createModeSearch,
    allRealLessons,
  ]);

  // ── Auto-populate create room from prefilledContext ───────────────────────
  useEffect(() => {
    if (isOpen && prefilledContext) {
      const titleText = (prefilledContext.chapterTitle || prefilledContext.title || '').trim();
      const generatedName = titleText
        ? `${titleText.slice(0, 28)} · Live MCQ`
        : `${prefilledContext.subject || 'Live'} · MCQ Battle`;

      setNewRoomName(generatedName);
      if (prefilledContext.subject) {
        setNewRoomSubject(prefilledContext.subject);
      }
      if (!currentRoom) {
        setShowCreateModal(true);
      }
    }
  }, [isOpen, prefilledContext]);

  const isHost = Boolean(
    currentRoom && (
      (user?.id && currentRoom.hostId === user.id) ||
      (auth.currentUser?.uid && currentRoom.hostId === auth.currentUser.uid) ||
      (lastCreatedRoomId && currentRoom.id === lastCreatedRoomId) ||
      createdRoomIds.has(currentRoom.id) ||
      isRoomCreatedByMe(currentRoom.id, currentRoom.hostId, user?.id) ||
      Boolean(user?.id && currentRoom.members?.[user.id]?.isHost) ||
      Boolean(auth.currentUser?.uid && currentRoom.members?.[auth.currentUser.uid]?.isHost) ||
      (Boolean(user?.name && currentRoom.hostName) && user.name.trim().toLowerCase() === currentRoom.hostName.trim().toLowerCase() && currentRoom.hostName.trim().length > 1) ||
      (isAdmin && (!currentRoom.hostId || currentRoom.hostId === user?.id))
    )
  );
  const currentMember = currentRoom?.members?.[user?.id] || (auth.currentUser?.uid ? currentRoom?.members?.[auth.currentUser.uid] : undefined);
  const currentEffectiveUid = auth.currentUser?.uid || user?.id || '';
  const onlineMemberIds = useMemo(() => {
    return Object.keys(currentRoom?.members || {}).sort();
  }, [currentRoom?.members]);

  const isHostPresent = Boolean(currentRoom?.hostId && currentRoom?.members?.[currentRoom.hostId]);

  // Host is authority if present. If host is absent or room has autoRunWithoutHost, the lowest UID member is elected runner.
  const isElectedRunner = Boolean(
    isHost ||
    ((currentRoom?.autoRunWithoutHost || !isHostPresent) && onlineMemberIds.length > 0 && onlineMemberIds[0] === currentEffectiveUid)
  );

  // ── 1. Subscribe to Active Rooms in Lobby ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToActiveRooms((rooms) => {
      setActiveRooms(rooms);
    });
    return () => unsub();
  }, [isOpen]);

  // ── 2. Subscribe to Currently Joined Room ────────────────────────────────
  useEffect(() => {
    const roomId = currentRoom?.id;
    if (!roomId) return;
    const unsub = subscribeToRoom(roomId, (room) => {
      if (!room) {
        // Guard against momentary null glitches: only clear if cached room is also gone or deleted
        const cached = getCachedRooms()[roomId];
        if (cached && !cached.isDeleted) {
          return;
        }
        setCurrentRoom(null);
        onActiveRoomChangeRef.current?.(null);
        return;
      }
      setCurrentRoom((prev) => {
        // Keep the last good MCQ only if a snapshot briefly omits that branch.
        // A real isActive=false snapshot is how ENDED/WAITING reaches members;
        // preserving the previous active state here hid final results for them.
        if (prev?.id === room.id && prev.liveMcq?.isActive && !room.liveMcq) {
          return {
            ...room,
            mode: 'LIVE_MCQ',
            liveMcq: prev.liveMcq,
          };
        }
        return room;
      });
      onActiveRoomChangeRef.current?.(room);

      // Host Off Hone Par Highest Level / XP User Ka Host Banna
      if (room.hostId && room.members && !room.members[room.hostId]) {
        electAndPromoteHighestLevelHost(room.id, room);
      }
    });

    return () => unsub();
  }, [currentRoom?.id]);

  // ── 2b. Live Room Study XP & Minutes Accumulation ────────────────────────
  // Active in Study Room: 30 XP per minute (0 credit) per user mandate
  useEffect(() => {
    if (!currentRoom?.id || !user?.id) return;
    const rId = currentRoom.id;
    const uId = user.id;

    const studyXpTimer = setInterval(() => {
      awardRoomStudyXp(rId, uId, 30, 1);
      if (onUserUpdate) {
        const curXp = user.xp || user.totalScore || 0;
        onUserUpdate({
          ...user,
          xp: curXp + 30,
          totalScore: curXp + 30,
        });
      }
    }, 60000);

    return () => clearInterval(studyXpTimer);
  }, [currentRoom?.id, user?.id, onUserUpdate]);

  // ── 3. Synchronized Room Expiry Countdown & Auto-Submit ──────────────────
  useEffect(() => {
    if (!currentRoom) return;

    const calculateRemaining = () => {
      const createdTime = typeof currentRoom.createdAt === 'number'
        ? currentRoom.createdAt
        : (currentRoom.createdAt ? new Date(currentRoom.createdAt).getTime() : Date.now());
      const expiresTime = typeof currentRoom.expiresAt === 'number'
        ? currentRoom.expiresAt
        : (currentRoom.expiresAt ? new Date(currentRoom.expiresAt).getTime() : 0);
      const expiry = expiresTime > 0 ? expiresTime : (createdTime + (currentRoom.durationMinutes || 30) * 60 * 1000);
      const diffMs = expiry - Date.now();
      const remainingSec = Math.max(0, Math.floor(diffMs / 1000));
      setRoomSecondsLeft(isNaN(remainingSec) ? 0 : remainingSec);

      // Auto-submit when time expires!
      if (!isNaN(remainingSec) && remainingSec <= 0 && !currentRoom.isExpired && expiry > 0) {
        handleTimeExpiredAutoSubmit();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [currentRoom?.id, currentRoom?.expiresAt, currentRoom?.isExpired]);

  const handleTimeExpiredAutoSubmit = async () => {
    if (!currentRoom) return;
    try {
      // Award final unbroken streak bonus for the current user
      if (user?.id) {
        const streakBonus = await awardFinalStreakBonus(currentRoom.id, user.id);
        if (streakBonus > 0 && onUserUpdate) {
          const currentXp = user.xp || user.totalScore || 0;
          const updatedUser = {
            ...user,
            xp: currentXp + streakBonus,
            totalScore: currentXp + streakBonus,
          };
          onUserUpdate(updatedUser);
        }
      }

      // If host, update room state in RTDB to auto-submit
      if (isHost) {
        await autoSubmitRoom(currentRoom.id);
      }
    } catch (err) {
      console.warn('Auto-submit execution error:', err);
    }
  };

  // ── 4. Synchronized Live MCQ Question Countdown & Auto-Advance ─────────
  useEffect(() => {
    if (!currentRoom || !currentRoom.liveMcq?.isActive) return;
    const { liveMcq } = currentRoom;

    let interval: any = null;
    if (liveMcq.status === 'QUESTION') {
      const isSelfPaced = liveMcq.timerMode === 'TOTAL_TEST' || liveMcq.timerMode === 'MIX';

      const updateMcqTick = () => {
        const now = Date.now();

        if (isSelfPaced) {
          // Total exam timer countdown
          const totalEnd = liveMcq.testEndTime || (liveMcq.testStartTime ? liveMcq.testStartTime + (liveMcq.totalTestDurationMinutes || 15) * 60000 : now + 600000);
          const totalRem = Math.max(0, Math.floor((totalEnd - now) / 1000));
          setTotalTestSecondsLeft(totalRem);

          if (totalRem <= 0) {
            // Auto submit immediately when time runs out!
            if (isElectedRunner) {
              endLiveMcqBattle(currentRoom.id).catch(console.warn);
            }
            if (!hasBatchSubmitted && currentRoom?.id && user?.id) {
              submitFinalBatchScore(currentRoom.id, user.id, user.name || 'Student', {
                score: localBattleStats.score,
                correctCount: localBattleStats.correctCount,
                wrongCount: localBattleStats.wrongCount,
                totalAnswered: localBattleStats.totalAnswered,
                maxStreak: localBattleStats.maxStreak,
                userXp: localBattleStats.userXp,
                streakBonusXp: localBattleStats.streakBonusXp,
                userPhotoURL: user.photoURL || '',
                answers: localBattleStats.answers,
              }).catch(console.warn);
              setHasBatchSubmitted(true);
            }
            return;
          }

          // If MIX mode: question pace countdown & mobile vibration
          if (liveMcq.timerMode === 'MIX') {
            setPaceSecondsLeft((prev) => {
              const next = Math.max(0, prev - 1);
              if (next === 0 && !hasPaceAlertTriggered) {
                setHasPaceAlertTriggered(true);
                if (userVibrateAlert && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try {
                    navigator.vibrate([150, 70, 150]);
                  } catch {}
                }
              }
              return next;
            });
          }
        } else {
          // Standard Per-Question countdown
          const rawStart = liveMcq.questionStartTime as unknown;
          const sourceStart = typeof rawStart === 'number'
            ? rawStart
            : typeof rawStart === 'string'
              ? (Number.isFinite(Number(rawStart)) ? Number(rawStart) : Date.parse(rawStart))
              : 0;
          const validSourceStart = Number.isFinite(sourceStart) && sourceStart > 0 ? sourceStart : 0;
          const questionKey = `${currentRoom.id}:${liveMcq.currentQuestionIndex ?? 0}`;
          const previousTimer = questionTimerRef.current;

          if (previousTimer.key !== questionKey) {
            // Prefer the room's synchronized start time, but don't carry an old
            // question's timestamp forward if a room snapshot arrives out of order.
            const sourceWasRefreshed = validSourceStart > 0 && validSourceStart !== previousTimer.sourceStart;
            questionTimerRef.current = {
              key: questionKey,
              startedAt: sourceWasRefreshed || !previousTimer.key ? (validSourceStart || now) : now,
              sourceStart: validSourceStart,
            };
            setMcqSecondsLeft(liveMcq.durationPerQuestion || 20);
          } else if (validSourceStart > questionTimerRef.current.startedAt) {
            // A later synchronized timestamp for this same question wins.
            questionTimerRef.current = {
              ...questionTimerRef.current,
              startedAt: validSourceStart,
              sourceStart: validSourceStart,
            };
          }

          const duration = liveMcq.durationPerQuestion || 20;
          const elapsedSec = Math.floor((now - questionTimerRef.current.startedAt) / 1000);
          const remaining = Math.max(0, duration - elapsedSec);
          setMcqSecondsLeft(remaining);

          // Auto-reveal exactly when selected timer expires (0s) - Host or Elected Runner
          if (isElectedRunner && remaining <= 0 && liveMcq.status === 'QUESTION') {
            handleRevealAnswer();
            return;
          }
        }
      };

      updateMcqTick();
      interval = setInterval(updateMcqTick, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    currentRoom?.liveMcq?.status,
    currentRoom?.id,
    currentRoom?.liveMcq?.currentQuestionIndex,
    currentRoom?.liveMcq?.questionStartTime,
    currentRoom?.liveMcq?.durationPerQuestion,
    currentRoom?.liveMcq?.timerMode,
    currentRoom?.liveMcq?.testEndTime,
    currentRoom?.liveMcq?.testStartTime,
    isElectedRunner,
    hasPaceAlertTriggered,
    userVibrateAlert,
  ]);

  // ── Auto-advance Countdown during REVEAL ──
  useEffect(() => {
    if (!currentRoom || !currentRoom.liveMcq?.isActive) return;
    const { liveMcq } = currentRoom;

    // Never auto-advance in Total Test or Mix modes (free navigation self-paced exam)
    if (liveMcq.timerMode === 'TOTAL_TEST' || liveMcq.timerMode === 'MIX') {
      return;
    }

    if (liveMcq.status !== 'REVEAL') {
      setRevealSecondsLeft(2);
      return;
    }

    const shouldAutoAdvance = liveMcq.autoAdvance !== false && autoAdvanceEnabled !== false;
    if (!shouldAutoAdvance) return;

    setRevealSecondsLeft(2);
    const revealTimer = setInterval(() => {
      setRevealSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(revealTimer);
          if (isElectedRunner && liveMcq.status === 'REVEAL') {
            handleNextMcqQuestion();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(revealTimer);
  }, [
    currentRoom?.liveMcq?.status,
    currentRoom?.liveMcq?.currentQuestionIndex,
    currentRoom?.liveMcq?.autoAdvance,
    autoAdvanceEnabled,
    isElectedRunner,
  ]);

  // ── Scheduled Room Auto-Start Effect (Bina Host Ke Bhi Time Par Shuru Hoga) ──
  useEffect(() => {
    if (!currentRoom || !currentRoom.isScheduled || !currentRoom.scheduledStartTime) return;
    if (currentRoom.liveMcq?.status !== 'WAITING') return;
    if (!currentRoom.liveMcq?.questions || currentRoom.liveMcq.questions.length === 0) return;

    const checkScheduledStart = () => {
      const now = Date.now();
      if (now >= currentRoom.scheduledStartTime!) {
        if (isElectedRunner && currentRoom.liveMcq?.status === 'WAITING') {
          startLiveMcqBattle(
            currentRoom.id,
            currentRoom.liveMcq.title,
            currentRoom.liveMcq.questions,
            currentRoom.liveMcq.durationPerQuestion || 20,
            currentRoom.liveMcq.timerMode === 'PER_QUESTION' ? (currentRoom.liveMcq.autoAdvance ?? true) : false,
            currentRoom.liveMcq.timerMode || 'PER_QUESTION',
            currentRoom.liveMcq.totalTestDurationMinutes || 15,
            currentRoom.liveMcq.targetPaceSeconds || 20,
            currentRoom.liveMcq.vibrateOnPaceAlert ?? true
          ).catch((e) => console.warn('[GroupStudy] Scheduled auto-start notice:', e));
        }
      }
    };

    checkScheduledStart();
    const interval = setInterval(checkScheduledStart, 1000);
    return () => clearInterval(interval);
  }, [
    currentRoom?.id,
    currentRoom?.isScheduled,
    currentRoom?.scheduledStartTime,
    currentRoom?.liveMcq?.status,
    currentRoom?.liveMcq?.title,
    currentRoom?.liveMcq?.questions,
    currentRoom?.liveMcq?.durationPerQuestion,
    currentRoom?.liveMcq?.autoAdvance,
    currentRoom?.liveMcq?.timerMode,
    currentRoom?.liveMcq?.totalTestDurationMinutes,
    currentRoom?.liveMcq?.targetPaceSeconds,
    currentRoom?.liveMcq?.vibrateOnPaceAlert,
    isElectedRunner,
  ]);

  // Reset local answer selection on new question or new battle session
  useEffect(() => {
    if (currentRoom?.liveMcq?.currentQuestionIndex !== undefined) {
      const isSelfPaced = currentRoom.liveMcq.timerMode === 'TOTAL_TEST' || currentRoom.liveMcq.timerMode === 'MIX';
      if (!isSelfPaced) {
        setStudentActiveQIndex(currentRoom.liveMcq.currentQuestionIndex);
      }
    }
  }, [currentRoom?.liveMcq?.currentQuestionIndex, currentRoom?.liveMcq?.timerMode]);

  // Synchronize selected option state with active question index
  useEffect(() => {
    const activeAnswer = localBattleStats.answers[studentActiveQIndex]?.selectedOption;
    setSelectedOption(activeAnswer !== undefined ? activeAnswer : null);
    setHasAnsweredCurrentQ(activeAnswer !== undefined);
  }, [studentActiveQIndex, localBattleStats.answers]);

  // Reset anti-cheating flags when battle resets or is in lobby
  useEffect(() => {
    if (
      !currentRoom ||
      currentRoom.liveMcq?.status === 'WAITING' ||
      (currentRoom.liveMcq?.status === 'QUESTION' && currentRoom.liveMcq?.currentQuestionIndex === 0)
    ) {
      setMinimizeWarningCount(0);
      setIsDisqualifiedFromRoom(false);
      setShowMinimizeWarningModal(false);
      setShowDisqualifiedModal(false);
    }
  }, [currentRoom?.id, currentRoom?.liveMcq?.status, currentRoom?.liveMcq?.currentQuestionIndex]);

  // ── Anti-Cheating / App-Minimize Listener (1st Time: Warning, 2nd Time: Disqualify & Exit) ──
  useEffect(() => {
    if (!isOpen || !currentRoom?.id || !currentRoom?.liveMcq) return;
    const mcqStatus = currentRoom.liveMcq.status;
    const isBattleRunning = (mcqStatus === 'QUESTION' || mcqStatus === 'REVEAL') && !currentRoom.isExpired;
    if (!isBattleRunning || isDisqualifiedFromRoom) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setMinimizeWarningCount((prev) => {
          const nextCount = prev + 1;
          if (nextCount === 1) {
            return 1;
          } else if (nextCount >= 2) {
            setIsDisqualifiedFromRoom(true);
            setShowDisqualifiedModal(true);

            // Auto-submit whatever questions were attempted so far and treat the rest as skipped
            if (currentRoom?.id && user?.id) {
              submitFinalBatchScore(currentRoom.id, user.id, user.name || 'Student', {
                score: localBattleStats.score,
                correctCount: localBattleStats.correctCount,
                wrongCount: localBattleStats.wrongCount,
                totalAnswered: localBattleStats.totalAnswered,
                maxStreak: localBattleStats.maxStreak,
                userXp: localBattleStats.userXp,
                streakBonusXp: localBattleStats.streakBonusXp,
                userPhotoURL: user.photoURL || '',
                answers: localBattleStats.answers,
              }).catch(() => {});

              // Auto remove from active members
              leaveGroupRoom(currentRoom.id, user.id, user.name || 'Student').catch(() => {});
            }
            return 2;
          }
          return prev;
        });
      } else if (document.visibilityState === 'visible') {
        setMinimizeWarningCount((curr) => {
          if (curr === 1) {
            setShowMinimizeWarningModal(true);
          }
          return curr;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, currentRoom?.id, currentRoom?.liveMcq?.status, currentRoom?.isExpired, isDisqualifiedFromRoom, localBattleStats, user?.id, user?.name]);

  // ── Auto-save Group Study MCQ results to Student's MCQ Activity History ────
  useEffect(() => {
    if (!currentRoom || !user?.id) return;
    const liveMcq = currentRoom.liveMcq;
    if (!liveMcq) return;

    const isEnded = liveMcq.status === 'ENDED' || currentRoom.isExpired;
    if (!isEnded) return;

    const totalQ = liveMcq.totalQuestions || liveMcq.questions?.length || 0;
    if (totalQ === 0) return;

    const sessionKey = `${currentRoom.id}_${liveMcq.title || (liveMcq as any).quizTitle || currentRoom.name || 'battle'}_${totalQ}_${liveMcq.questions?.[0]?.question?.slice(0, 20) || ''}`;
    if (savedSessionsRef.current.has(sessionKey)) return;
    savedSessionsRef.current.add(sessionKey);

    // ── Staggered Batch Submission to Firebase RTDB (Zero-Collision Queue across 10-15s) ──
    const hashString = (str: string) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
      }
      return Math.abs(h);
    };

    const currentUid = user.id;

    setIsSubmittingBatch(true);
    setBatchSyncSecondsRemaining(0);

    const submitTask = async () => {
      try {
        await submitFinalBatchScore(currentRoom.id, currentUid, user.name || 'Student', {
          score: localBattleStats.score,
          correctCount: localBattleStats.correctCount,
          wrongCount: localBattleStats.wrongCount,
          totalAnswered: localBattleStats.totalAnswered,
          maxStreak: localBattleStats.maxStreak,
          userXp: localBattleStats.userXp,
          streakBonusXp: localBattleStats.streakBonusXp,
          userPhotoURL: user.photoURL || '',
          answers: localBattleStats.answers,
        });

        // Award XP to user profile once at end of test
        if (localBattleStats.userXp > 0) {
          const currentXp = user.xp || user.totalScore || 0;
          const newXp = Math.max(0, currentXp + localBattleStats.userXp);
          const newLevel = getLevelFromScore(newXp);
          const updatedUser = {
            ...user,
            xp: newXp,
            totalScore: newXp,
            level: newLevel,
          };
          try {
            localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
            localStorage.setItem(`nst_user_profile_${user.id}`, JSON.stringify(updatedUser));
          } catch (_) {}
          saveUserToLive(updatedUser, { immediate: true }).catch(() => {});
          onUserUpdate?.(updatedUser);
        }

        setHasBatchSubmitted(true);
      } catch (e) {
        console.warn('Batch submit notice:', e);
      } finally {
        setIsSubmittingBatch(false);
      }
    };
    submitTask();

    const myScore = liveMcq.scores?.[user.id] || {
      name: user.name || 'Student',
      score: localBattleStats.score,
      correctCount: localBattleStats.correctCount,
      wrongCount: localBattleStats.wrongCount,
      totalAnswered: localBattleStats.totalAnswered,
    };
    const allAnswersMap = liveMcq.questionAnswers || {};
    const questions = liveMcq.questions || [];

    const correctCount = myScore?.correctCount !== undefined ? myScore.correctCount : localBattleStats.correctCount;
    const wrongCount = myScore?.wrongCount !== undefined ? myScore.wrongCount : localBattleStats.wrongCount;
    const unansweredCount = Math.max(0, totalQ - correctCount - wrongCount);
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const durationPerQ = liveMcq.durationPerQuestion || 20;

    const userAnswersRecord: Record<number, number> = {};
    const topicAnalysisMap: Record<string, { correct: number; total: number; percentage: number }> = {};
    const omrDataList: any[] = [];
    const wrongQuestionsList: NonNullable<MCQResult['wrongQuestions']> = [];

    questions.forEach((q, qIndex) => {
      const localAns = localBattleStats.answers?.[qIndex];
      const qAns = allAnswersMap[qIndex]?.[user.id];
      const selected = localAns?.selectedOption !== undefined
        ? localAns.selectedOption
        : (qAns?.selectedOption !== undefined ? qAns.selectedOption : -1);
      userAnswersRecord[qIndex] = selected;

      const topicKey = (q as any).topic || (q as any).chapterTitle || currentRoom.subject || 'General';
      if (!topicAnalysisMap[topicKey]) {
        topicAnalysisMap[topicKey] = { correct: 0, total: 0, percentage: 0 };
      }
      topicAnalysisMap[topicKey].total++;

      const isAnsCorrect = selected === q.correctIndex;
      if (isAnsCorrect) {
        topicAnalysisMap[topicKey].correct++;
      } else if (selected !== -1) {
        wrongQuestionsList.push({
          question: q.question,
          statements: q.statements,
          qIndex,
          correctAnswer: q.correctIndex,
          explanation: q.explanation || '',
        });
      }

      omrDataList.push({
        qIndex,
        selected,
        correct: q.correctIndex,
        timeSpent: localAns?.timeTakenSec || 0,
      });
    });

    Object.keys(topicAnalysisMap).forEach((tKey) => {
      const item = topicAnalysisMap[tKey];
      item.percentage = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
    });

    const groupStudyResult: MCQResult = {
      id: `study_room_${currentRoom.id}_${Date.now()}`,
      userId: user.id,
      chapterId: currentRoom.id,
      chapterTitle: liveMcq.title || (liveMcq as any).quizTitle || currentRoom.name || 'Study Room MCQ Battle',
      subjectId: currentRoom.subject || 'GROUP_STUDY',
      subjectName: currentRoom.subject || 'Group Study Room',
      topic: `Study Room • ${currentRoom.name}`,
      date: new Date().toISOString(),
      score: correctCount,
      totalQuestions: totalQ,
      correctCount,
      wrongCount,
      totalTimeSeconds: Math.round(totalQ * durationPerQ),
      averageTimePerQuestion: durationPerQ,
      performanceTag: accuracy >= 80 ? 'EXCELLENT' : accuracy >= 50 ? 'GOOD' : 'BAD',
      userAnswers: userAnswersRecord,
      wrongQuestions: wrongQuestionsList,
      topicAnalysis: topicAnalysisMap,
      omrData: omrDataList,
      questions: questions.map((q, qIndex) => ({
        id: q.id || `q_${qIndex}`,
        question: q.question,
        statements: q.statements,
        options: q.options,
        correctAnswer: q.correctIndex,
        explanation: q.explanation || '',
      })),
    };

    setCurrentExamResult(groupStudyResult);

    // 1. Save to local storage for immediate HistoryPage access
    try {
      const storageKey = `nst_test_results_${user.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = [groupStudyResult, ...existing.filter((item: any) => item.id !== groupStudyResult.id)].slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('[GroupStudy] Error saving local test result:', err);
    }

    // 2. Save to Firestore / RTDB
    saveTestResult(user.id, groupStudyResult).catch((err) => {
      console.warn('[GroupStudy] saveTestResult notice:', err);
    });
    saveUserHistory(user.id, groupStudyResult).catch((err) => {
      console.warn('[GroupStudy] saveUserHistory notice:', err);
    });

    // 3. Update in-memory user mcqHistory
    if (onUserUpdate && user) {
      const updatedUser = {
        ...user,
        mcqHistory: [groupStudyResult, ...(user.mcqHistory || []).filter((h: any) => h.id !== groupStudyResult.id)],
      };
      onUserUpdate(updatedUser);
    }
  }, [currentRoom?.liveMcq?.status, currentRoom?.isExpired, user?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.chat]);

  // ── Action Handlers: Create Room ──────────────────────────────────────────
  const handleOpenCreateModal = () => {
    if (isCreateRoomGloballyHidden) {
      alert('Naya Study Room create karne ka option admin dwara band kiya gaya hai.');
      return;
    }
    if (!isAdmin && todayCreatedRoomsCount >= maxRoomsPerDay) {
      setUpgradePromptReason('DAILY_ROOM_LIMIT');
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveRoomName = newRoomName.trim() || `${user?.name || 'Live'} MCQ Arena`;
    const cleanPassword = newRoomPassword.trim();

    // Password is now optional: agar enter kiya to kam se kam 2 characters hone chahiye
    if (cleanPassword && cleanPassword.length < 2) {
      alert('Agar aap password rakh rahe hain to kripya kam se kam 2 akshar/number ka password enter karein. Ya phir khali chhod kar Public room banayein.');
      return;
    }

    if (isCreateRoomGloballyHidden) {
      setShowCreateModal(false);
      alert('Naya Study Room create karne ka option admin dwara band kiya gaya hai.');
      return;
    }

    if (!isAdmin && todayCreatedRoomsCount >= maxRoomsPerDay) {
      setShowCreateModal(false);
      setUpgradePromptReason('DAILY_ROOM_LIMIT');
      return;
    }

    setIsLoading(true);
    try {
      const effectiveUid = auth.currentUser?.uid || user?.id || 'guest';
      const effectiveName = user?.name || auth.currentUser?.displayName || 'Host';

      const durationMinutes = Math.min(newRoomDurationMinutes || 30, maxDurationMinutesAllowed);

      // Check if questions are preloaded for this room
      const lessonToLaunch = selectedPreloadLesson || (
        prefilledContext?.mcqData && Array.isArray(prefilledContext.mcqData) && prefilledContext.mcqData.length > 0
          ? {
              lessonTitle: prefilledContext.chapterTitle || prefilledContext.title || 'Chapter MCQ Battle',
              questions: prefilledContext.mcqData
                .map((q: any) => parseQuestionToGroupMcq(q))
                .filter((q: any): q is GroupStudyMcqQuestion => Boolean(q && q.question && q.options.length >= 2)),
            }
          : null
      );

      const userXp = Number(user?.totalScore ?? (user as any)?.xp ?? 0);
      const userLevel = Number(getLevelFromScore(userXp));

      const roomId = await createGroupRoom(
        {
          name: effectiveRoomName,
          subject: newRoomSubject || 'General Knowledge',
          mode: 'LIVE_MCQ',
          mcqType: 'PROJECTOR_MODE',
          password: cleanPassword,
          durationMinutes,
          maxMembers: Math.min(newRoomMaxMembers || 30, maxRoomCapacityAllowed),
          isPrivate: !!cleanPassword,
          isScheduled: false,
          scheduledStartTime: undefined,
          autoRunWithoutHost: true,
          themeColor: roomTheme,
          preloadedQuestions: lessonToLaunch?.questions || [],
          preloadedTitle: lessonToLaunch?.lessonTitle || `${effectiveRoomName} MCQ Battle`,
          durationPerQuestion: newRoomMcqType === 'REVISION_HUB' ? 15 : 20,
        },
        {
          id: effectiveUid,
          name: effectiveName,
          photoURL: user?.photoURL || auth.currentUser?.photoURL || '',
          level: userLevel,
          xp: userXp,
        }
      );

      recordCreatedRoomToday();
      markRoomAsCreatedByMe(roomId);
      setLastCreatedRoomId(roomId);
      setCreatedRoomIds((prev) => new Set([...prev, roomId]));
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomPassword('');

      // Instantly open room for host from local cache
      const cached = getCachedRooms()[roomId];
      if (cached) {
        setCurrentRoom(cached);
        if (onActiveRoomChange) onActiveRoomChange(cached);
      } else {
        // Fallback room object so currentRoom is never null
        const fallbackRoom: GroupStudyRoom = {
          id: roomId,
          name: effectiveRoomName,
          subject: newRoomSubject || 'General Knowledge',
          code: roomId.slice(-6).toUpperCase(),
          password: cleanPassword,
          isPrivate: !!newRoomIsPrivate,
          hostId: effectiveUid,
          hostName: effectiveName,
          createdAt: Date.now(),
          lastActive: Date.now(),
          maxMembers: Math.min(newRoomMaxMembers || 30, maxRoomCapacityAllowed),
          mode: 'LIVE_MCQ',
          mcqType: 'PROJECTOR_MODE',
          durationMinutes,
          expiresAt: Date.now() + durationMinutes * 60 * 1000,
          isExpired: false,
          isScheduled: false,
          scheduledStartTime: undefined,
          autoRunWithoutHost: true,
          themeColor: roomTheme,
          timer: {
            durationMinutes,
            startTime: Date.now(),
            isPaused: false,
            remainingSeconds: durationMinutes * 60,
          },
          liveMcq: {
            isActive: false,
            title: lessonToLaunch?.lessonTitle || `${effectiveRoomName} MCQ Battle`,
            currentQuestionIndex: 0,
            totalQuestions: (lessonToLaunch?.questions || []).length,
            questionStartTime: 0,
            durationPerQuestion: newRoomMcqType === 'REVISION_HUB' ? 15 : 20,
            status: 'WAITING',
            questions: lessonToLaunch?.questions || [],
            scores: {},
          },
          members: {
            [effectiveUid]: {
              id: effectiveUid,
              name: effectiveName,
              joinedAt: Date.now(),
              lastSeen: Date.now(),
              isHost: true,
              level: userLevel,
              xp: userXp,
              totalXp: userXp,
              roomXp: 0,
              studyMinutes: 0,
            },
          },
        };
        saveCachedRoom(fallbackRoom);
        setCurrentRoom(fallbackRoom);
        if (onActiveRoomChange) onActiveRoomChange(fallbackRoom);
      }

      // Room banne ke baad: Set active tab to MCQ arena directly
      setActiveTab('MCQ');

      // Launch immediately ONLY if NOT scheduled
      if (!isScheduleMode && lessonToLaunch && Array.isArray(lessonToLaunch.questions) && lessonToLaunch.questions.length > 0) {
        try {
          await startLiveMcqBattle(
            roomId,
            lessonToLaunch.lessonTitle,
            lessonToLaunch.questions,
            newRoomMcqType === 'REVISION_HUB' ? 15 : 25
          );
          setShowChapterChooser(false);
        } catch (e) {
          console.warn('Could not auto-start prefilled MCQ battle:', e);
        }
      }
      setSelectedPreloadLesson(null);
    } catch (err: any) {
      console.error('Failed to create room:', err);
      alert('Could not create room: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Action Handlers: Join Room with Password Prompt & Optional Name ─────────
  const handleInitiateJoin = (room: GroupStudyRoom) => {
    // Only the verified room creator can enter without entering the password
    const currentUid = auth.currentUser?.uid || user?.id;
    const isCreator = Boolean(currentUid && room.hostId && currentUid === room.hostId);

    // Initialize entry custom name with user's name or saved custom name
    if (!entryCustomName) {
      setEntryCustomName(user?.name || '');
    }

    if (isCreator) {
      handleJoinRoom(room, entryCustomName);
      return;
    }

    // Password is strictly COMPULSORY for all users joining the room!
    setPasswordModalRoom(room);
    setEnteredPassword('');
    setPasswordError('');
  };

  const handleVerifyPasswordAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalRoom) return;

    const chosenName = entryCustomName.trim() || user?.name || 'Student';

    const hasPassword = Boolean(passwordModalRoom.password && passwordModalRoom.password.trim().length > 0);
    if (!hasPassword) {
      // Password-free public room: confirm and join directly
      const roomToJoin = passwordModalRoom;
      setPasswordModalRoom(null);
      await handleJoinRoom(roomToJoin, chosenName);
      return;
    }

    // Room password check
    const correctPassword = (passwordModalRoom.password?.trim() || '').toLowerCase();
    const typedPassword = enteredPassword.trim().toLowerCase();

    if (!typedPassword) {
      setPasswordError('Kripya Room Password enter karein.');
      return;
    }

    if (typedPassword === correctPassword) {
      const roomToJoin = passwordModalRoom;
      setPasswordModalRoom(null);
      await handleJoinRoom(roomToJoin, chosenName);
    } else {
      setPasswordError('Galat Password! Kripya Host se sahi room password maangein.');
    }
  };

  const handleJoinRoom = async (room: GroupStudyRoom, customName?: string) => {
    setIsLoading(true);
    // Cache immediately so any background listener finds it locally
    saveCachedRoom(room);
    // Instantly transition into room in UI so user is never blocked or left in lobby
    setCurrentRoom(room);
    if (onActiveRoomChange) onActiveRoomChange(room);

    try {
      const userXp = Number(user?.totalScore ?? (user as any)?.xp ?? 0);
      const userLevel = Number(getLevelFromScore(userXp));
      const effectiveName = (customName && customName.trim()) 
        || entryCustomName.trim() 
        || user?.name 
        || auth.currentUser?.displayName 
        || 'Student';

      await joinGroupRoom(room.id, {
        id: user?.id || auth.currentUser?.uid || 'guest',
        name: effectiveName,
        photoURL: user?.photoURL || auth.currentUser?.photoURL || '',
        level: userLevel,
        xp: userXp,
      });
    } catch (err: any) {
      console.warn('[GroupStudy] Background join error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = joinCodeInput.trim()?.toUpperCase();
    if (!code) {
      setJoinCodeError('Kripya 6-digit Room Code enter karein.');
      return;
    }

    setJoinCodeError('');
    setIsLoading(true);
    try {
      // 1. Search in memory activeRooms
      let found = activeRooms.find(
        (r) =>
          r.code?.toUpperCase() === code ||
          r.id?.toUpperCase() === code ||
          r.id?.slice(-6).toUpperCase() === code
      );

      // 2. Fallback to cache and RTDB
      if (!found) {
        found = (await findRoomByCodeOrId(code)) || undefined;
      }

      if (!found) {
        setJoinCodeError('Room nahi mila! Kripya Room Code check karein ya Host se confirm karein.');
        setIsLoading(false);
        return;
      }

      const effectiveName = joinNameInput.trim() || entryCustomName.trim() || user?.name || 'Student';

      // Check if user has already entered a password in the join form
      const typedPass = joinPasswordInput.trim().toLowerCase();
      const actualPass = (found.password?.trim() || found.code?.trim() || '').toLowerCase();
      const currentUid = auth.currentUser?.uid || user?.id;
      const isCreator = Boolean(currentUid && found.hostId && currentUid === found.hostId);

      if (isCreator || !found.password || (typedPass && typedPass === actualPass)) {
        // Direct password match or creator: Join immediately!
        setJoinCodeInput('');
        setJoinPasswordInput('');
        setJoinNameInput('');
        setJoinCodeError('');
        await handleJoinRoom(found, effectiveName);
      } else if (typedPass && typedPass !== actualPass) {
        setJoinCodeError('Galat Password! Kripya sahi room password enter karein.');
      } else {
        // No password typed in the form: open the password prompt modal
        if (joinNameInput.trim()) {
          setEntryCustomName(joinNameInput.trim());
        }
        handleInitiateJoin(found);
      }
    } catch (err: any) {
      setJoinCodeError(err.message || 'Failed to join');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;
    const effectiveUid = auth.currentUser?.uid || user?.id || '';
    const otherMembersCount = Object.keys(currentRoom.members || {}).filter(
      (mid) => mid !== effectiveUid && mid !== user?.id
    ).length;

    const isRoomHost =
      isHost ||
      (user?.id && currentRoom.hostId === user.id) ||
      isRoomCreatedByMe(currentRoom.id, currentRoom.hostId, user?.id) ||
      (auth.currentUser?.uid && currentRoom.hostId === auth.currentUser.uid);

    let promptText = 'Kya aap is Group Study Room se bahar aana chahte hain? (Room destroy nahi hoga, aap ya anya sadasya kabhi bhi wapas jud sakte hain).';
    if (isRoomHost && otherMembersCount > 0) {
      promptText = '⚠️ Aap is Room ke HOST hain! Aapke leave karte hi room band nahi hoga — Highest Level & XP wale user naye Host ban jayenge. Kya aap leave karna chahte hain?';
    }

    if (confirm(promptText)) {
      const rId = currentRoom.id;
      setCurrentRoom(null);
      if (onActiveRoomChange) onActiveRoomChange(null);
      // Room se bahar aane pe ab room destroy nahi hoga
      await leaveGroupRoom(rId, user?.id || 'guest', user?.name || 'Student');
    }
  };

  const handleDestroyRoom = async (targetRoomId?: string) => {
    const roomId = targetRoomId || currentRoom?.id;
    if (!roomId) return;
    if (confirm('⚠️ Kya aap is Study Room ko poori tarah DESTROY / DELETE karna chahte hain? Sabhi jude hue members room se bahar ho jayenge aur room list se hat jayega.')) {
      setIsLoading(true);
      try {
        if (currentRoom?.id === roomId) {
          setCurrentRoom(null);
          if (onActiveRoomChange) onActiveRoomChange(null);
        }
        await deleteGroupRoom(roomId);
      } catch (err: any) {
        console.error('Failed to destroy room:', err);
        alert('Room delete nahi ho paya: ' + (err.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopyCode = async (targetRoom?: GroupStudyRoom | null) => {
    const room = targetRoom || currentRoom;
    if (!room) return;
    const roomCode = (room.code || room.id?.slice(-6) || 'STUDY1').toUpperCase();
    const roomPassword = (room.password || (room as any).pass || '1234').trim();
    const textToCopy = `🔑 Room Code: ${roomCode} | 🔒 Password: ${roomPassword}`;
    let copied = false;

    // 1. Try modern navigator.clipboard
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copied = true;
      } catch (err) {
        console.warn('Clipboard writeText failed, falling back:', err);
      }
    }

    // 2. Fallback via temporary textarea for iframes or unsupported browsers
    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) copied = true;
      } catch (err) {
        console.warn('execCommand copy fallback failed:', err);
      }
    }

    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // ── Share to WhatsApp ──
  const getShareInviteMessage = (targetRoom?: GroupStudyRoom | null) => {
    const room = targetRoom || currentRoom;
    if (!room) return '';
    const roomName = room.name || 'Live Study Room';
    const roomSubject = room.subject || 'All Subjects';
    const roomCode = (room.code || room.id?.slice(-6) || 'STUDY1').toUpperCase();
    const roomPassword = (room.password || (room as any).pass || '1234').trim();
    const hostText = room.hostName ? `👑 *Host:* ${room.hostName}\n` : '';

    return `🔥 *IIC Live Group Study & MCQ Battle Room!*
📚 *Room:* ${roomName}
🎯 *Subject:* ${roomSubject}
${hostText}🔑 *Room Code:* ${roomCode}
🔒 *Password:* ${roomPassword}

👉 *Kaise Judein:*
1. IIC App kholein
2. "Group Study" section me jayein
3. Room Code *${roomCode}* aur Password *${roomPassword}* enter karke Join karein!

Aao dekhte hain kisme kitna hai dum! 🏆`;
  };

  const handleShareToWhatsApp = (targetRoom?: GroupStudyRoom | null) => {
    const text = getShareInviteMessage(targetRoom || currentRoom);
    if (!text) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleSendAppInviteNotification = async (targetRoom?: GroupStudyRoom | null) => {
    const room = targetRoom || currentRoom;
    if (!room || sendingInviteNotif) return;
    setSendingInviteNotif(true);
    try {
      const challengeTitle = room.liveMcq?.title || room.name || 'Practice Challenge';
      const qCount = room.liveMcq?.totalQuestions || room.preloadedQuestions?.length || 0;
      await notifyStudyRoomChallengeInBackground({
        senderId: user?.id || 'host',
        senderName: user?.name || 'Study Room',
        challengeTitle,
        roomId: room.id,
        roomCode: (room.code || room.id?.slice(-6) || 'STUDY1').toUpperCase(),
        password: room.password || '',
        totalQuestions: qCount > 0 ? qCount : undefined,
      });
      setInviteNotifSent(true);
      setTimeout(() => setInviteNotifSent(false), 5000);
      alert(`📢 Push Notification Sent!\nSabhi students ko Study Room Challenge notification bhej diya gaya hai (Kisi bhi class ke students jud sakte hain).\nRoom ID: ${(room.code || room.id?.slice(-6)).toUpperCase()} notification me bhej di gayi hai!`);
    } catch (err) {
      console.warn('Invite notification error:', err);
    } finally {
      setSendingInviteNotif(false);
    }
  };

  const handleSendChat = (e: React.FormEvent, isDoubt: boolean = false) => {
    e.preventDefault();
    if (!currentRoom || !chatMessage.trim()) return;

    sendRoomMessage(
      currentRoom.id,
      {
        id: user?.id || 'guest',
        name: user?.name || 'Student',
        photoURL: user?.photoURL,
      },
      chatMessage.trim(),
      isDoubt ? 'DOUBT' : 'MESSAGE'
    );
    setChatMessage('');
  };

  // ── Subject & Lesson Selection Helpers (MCQ vs MCQ+) ─────────
  const handleToggleBattleSubject = (subj: string) => {
    // In MCQ+ (REVISION_HUB), user selects only 1 subject
    if (currentRoom?.mcqType === 'REVISION_HUB') {
      setBattleSubject(subj);
      setBattleSubjects([subj]);
      return;
    }
    // In standard MCQ, all users can choose multiple subjects
    if (subj === 'ALL') {
      setBattleSubject('ALL');
      setBattleSubjects(['ALL']);
      return;
    }
    setBattleSubjects((prev) => {
      const withoutAll = prev.filter((s) => s !== 'ALL');
      let next: string[];
      if (withoutAll.includes(subj)) {
        next = withoutAll.filter((s) => s !== subj);
        if (next.length === 0) {
          setBattleSubject('ALL');
          return ['ALL'];
        }
      } else {
        next = [...withoutAll, subj];
      }
      setBattleSubject(next.length === 1 ? next[0] : 'ALL');
      return next;
    });
  };

  const isBattleSubjectActive = (subj: string) => {
    if (currentRoom?.mcqType === 'REVISION_HUB') {
      return battleSubject === subj;
    }
    if (subj === 'ALL') {
      return battleSubjects.includes('ALL') || battleSubject === 'ALL';
    }
    if (battleSubjects && battleSubjects.length > 0 && !battleSubjects.includes('ALL')) {
      return battleSubjects.includes(subj);
    }
    return battleSubject === subj;
  };

  const handleToggleBattleLesson = (setId: string) => {
    // In MCQ+ (REVISION_HUB), STRICTLY single lesson only!
    if (currentRoom?.mcqType === 'REVISION_HUB') {
      setSelectedCuratedSet(setId);
      setSelectedCuratedSets([setId]);
      return;
    }
    // In standard MCQ mode, users can pick multiple lessons freely!
    setSelectedCuratedSets((prev) => {
      if (prev.includes(setId)) {
        if (prev.length <= 1) return prev;
        const next = prev.filter((id) => id !== setId);
        if (selectedCuratedSet === setId) setSelectedCuratedSet(next[0] || '');
        return next;
      } else {
        const next = [...prev, setId];
        setSelectedCuratedSet(setId);
        return next;
      }
    });
  };

  const handleSelectAllBattleLessons = () => {
    if (currentRoom?.mcqType === 'REVISION_HUB') {
      alert('⚡ MCQ+ Mode me sirf 1 single lesson ka test hota hai (Fixed 100 Questions & Revision Hub Analysis). Multiple lessons ke liye Standard MCQ Mode chunein.');
      return;
    }
    const allIds = availableBattleSets.map((s) => s.id);
    setSelectedCuratedSets(allIds);
    if (allIds.length > 0) setSelectedCuratedSet(allIds[0]);
  };

  const handleDeselectAllBattleLessons = () => {
    if (availableBattleSets.length > 0) {
      setSelectedCuratedSets([availableBattleSets[0].id]);
      setSelectedCuratedSet(availableBattleSets[0].id);
    }
  };

  // ── MCQ Battle Handlers & Host Free Lesson Launch ─────────────────────────
  const compileSelectedQuestions = (): { targetSets: typeof availableBattleSets; compiledQuestions: GroupStudyMcqQuestion[]; battleTitle: string } | null => {
    const isMcqPlus = currentRoom?.mcqType === 'REVISION_HUB';
    let targetSets: typeof availableBattleSets = [];

    if (isMcqPlus) {
      // ⚡ MCQ+ Mode: Strictly 1 lesson only!
      const single = availableBattleSets.find((s) => s.id === selectedCuratedSet) || availableBattleSets[0];
      if (single) targetSets = [single];
    } else {
      // 🎯 Standard MCQ Mode: Multiple lessons allowed
      if (selectedCuratedSets.length > 0) {
        targetSets = availableBattleSets.filter((s) => selectedCuratedSets.includes(s.id));
      } else {
        const single = availableBattleSets.find((s) => s.id === selectedCuratedSet);
        if (single) targetSets = [single];
      }
    }

    if (targetSets.length === 0) {
      if (availableBattleSets.length > 0) {
        targetSets = [availableBattleSets[0]];
      } else {
        alert('Kripya pehle koi lesson chunein!');
        return null;
      }
    }

    let compiledQuestions: GroupStudyMcqQuestion[] = [];

    if (isMcqPlus) {
      // ⚡ MCQ+ MODE: Fixed 100 Questions!
      // Pool all questions from this 1 lesson and ensure 100 questions (or exact count if < 100)
      const basePool = questionOrderMode === 'RANDOM'
        ? [...targetSets[0].questions].sort(() => 0.5 - Math.random())
        : [...targetSets[0].questions];

      if (basePool.length >= 100) {
        compiledQuestions = basePool.slice(0, 100);
      } else if (basePool.length > 0) {
        // Repeat or cycle through questions to make exactly 100 questions as requested by user
        const expanded: GroupStudyMcqQuestion[] = [];
        let i = 0;
        while (expanded.length < 100) {
          const originalQ = basePool[i % basePool.length];
          expanded.push({
            ...originalQ,
            id: `${originalQ.id || 'q'}_idx_${expanded.length}`,
          });
          i++;
        }
        compiledQuestions = expanded;
      }
    } else {
      // 🎯 Standard MCQ Mode: Variable questions based on limits
      if (limitMode === 'PER_LESSON' && questionsPerLessonLimit > 0) {
        targetSets.forEach((s) => {
          const pool = questionOrderMode === 'RANDOM'
            ? [...s.questions].sort(() => 0.5 - Math.random())
            : s.questions;
          compiledQuestions.push(...pool.slice(0, questionsPerLessonLimit));
        });
      } else if (limitMode === 'PER_SUBJECT' && questionsPerSubjectLimit > 0) {
        const bySubj = new Map<string, GroupStudyMcqQuestion[]>();
        targetSets.forEach((s) => {
          const subKey = s.subject || 'General';
          const list = bySubj.get(subKey) || [];
          list.push(...s.questions);
          bySubj.set(subKey, list);
        });
        bySubj.forEach((list) => {
          const pool = questionOrderMode === 'RANDOM'
            ? [...list].sort(() => 0.5 - Math.random())
            : list;
          compiledQuestions.push(...pool.slice(0, questionsPerSubjectLimit));
        });
      } else {
        targetSets.forEach((s) => compiledQuestions.push(...s.questions));
      }

      if (isUltraUser && ultraExcludedQuestionKeys.size > 0) {
        let filtered: GroupStudyMcqQuestion[] = [];
        targetSets.forEach((s) => {
          (s.questions || []).forEach((q, idx) => {
            const key = `${s.id}__${idx}__${(q.question || '').slice(0, 30)}`;
            if (!ultraExcludedQuestionKeys.has(key)) {
              filtered.push(q);
            }
          });
        });
        if (filtered.length > 0) {
          compiledQuestions = filtered;
        }
      }

      if (limitMode === 'TOTAL' && totalQuestionsLimit > 0) {
        if (questionOrderMode === 'RANDOM') {
          compiledQuestions = compiledQuestions.sort(() => 0.5 - Math.random());
        }
        compiledQuestions = compiledQuestions.slice(0, totalQuestionsLimit);
      } else if (questionOrderMode === 'RANDOM') {
        compiledQuestions = compiledQuestions.sort(() => 0.5 - Math.random());
      }
    }

    if (compiledQuestions.length === 0) {
      alert('Chune gaye lessons me koi questions uplabdh nahi hain. Kripya questions select karein.');
      return null;
    }

    const battleTitle = isMcqPlus
      ? `⚡ ${targetSets[0].name} (Fixed 100 Qs • MCQ+)`
      : targetSets.length > 1
      ? `${targetSets.length} Lessons Battle (${compiledQuestions.length} Questions)`
      : targetSets[0].name;

    return { targetSets, compiledQuestions, battleTitle };
  };

  const handleLaunchCuratedMcq = async () => {
    if (!currentRoom || !isHost) return;
    const compiled = compileSelectedQuestions();
    if (!compiled) return;

    await handleLaunchRealLessonMcq(
      {
        id: compiled.targetSets.length === 1 ? compiled.targetSets[0].id : `multi_${Date.now()}`,
        lessonTitle: compiled.battleTitle,
        classLevel: compiled.targetSets.length === 1 ? compiled.targetSets[0].classLevel : 'ALL',
        subject: compiled.targetSets.length === 1 ? compiled.targetSets[0].subject : 'Multi-Subject',
        questions: compiled.compiledQuestions,
      },
      currentRoom.mcqType
    );
  };

  const handleScheduleCuratedMcq = async () => {
    if (!currentRoom || !isHost) return;

    if (!isBasicUser && !isUltraUser && !isAdmin) {
      alert('Room schedule karne ka option Basic aur Ultra members ke liye hai. Kripya Store se upgrade karein.');
      return;
    }

    // Free User Host Restriction: Free users cannot host MCQ+ sets
    if (isFreeUser && currentRoom.mcqType === 'REVISION_HUB') {
      alert('🔒 MCQ+ Question Sets sirf Pro / Ultra members host kar sakte hain! Kripya standard MCQ sets chunein.');
      return;
    }

    const combined = new Date(`${scheduledDate}T${scheduledTime}`);
    const scheduledStartTime = combined.getTime();
    if (isNaN(scheduledStartTime) || scheduledStartTime < Date.now() - 60000) {
      alert('Kripya aane wale samay (future time) ka date aur time select karein.');
      return;
    }

    const compiled = compileSelectedQuestions();
    if (!compiled) return;

    setIsSchedulingTest(true);
    try {
      await scheduleRoomWithQuestions(
        currentRoom.id,
        scheduledStartTime,
        compiled.compiledQuestions,
        compiled.battleTitle,
        selectedTimerDuration || 20,
        false,
        'MIX',
        totalTestMinutes,
        userPaceSeconds,
        userVibrateAlert,
        autoRunWithoutHost
      );

      const updatedRoom: GroupStudyRoom = {
        ...currentRoom,
        isScheduled: true,
        scheduledStartTime,
        autoRunWithoutHost,
        preloadedTitle: compiled.battleTitle,
        preloadedQuestions: compiled.compiledQuestions,
        liveMcq: {
          isActive: false,
          status: 'WAITING',
          title: compiled.battleTitle,
          totalQuestions: compiled.compiledQuestions.length,
          currentQuestionIndex: 0,
          questionStartTime: 0,
          durationPerQuestion: selectedTimerDuration || 20,
          autoAdvance: false,
          timerMode: 'MIX',
          totalTestDurationMinutes: totalTestMinutes,
          targetPaceSeconds: userPaceSeconds,
          vibrateOnPaceAlert: userVibrateAlert,
          questions: compiled.compiledQuestions,
          scores: {},
          questionAnswers: {},
        },
      };

      saveCachedRoom(updatedRoom);
      // Room schedule karne ke baad host room se bahar chala jayega (returns to lobby/list)
      setCurrentRoom(null);
      await leaveGroupRoom(updatedRoom.id, user?.id || 'guest', user?.name || 'Student');
      // User requirement: Notify all users about the scheduled challenge (no class restriction)
      void notifyStudyRoomChallengeInBackground({
        senderId: user?.id || 'host',
        senderName: user?.name || 'Study Room',
        challengeTitle: `⏳ Scheduled Challenge: ${compiled.battleTitle}`,
        roomId: updatedRoom.id,
        roomCode: (updatedRoom.code || updatedRoom.id?.slice(-6) || 'STUDY1').toUpperCase(),
        password: updatedRoom.password || '',
        totalQuestions: compiled.compiledQuestions.length,
      }).catch((e) => console.warn('Schedule notify notice:', e));

      alert(`🎉 Test schedule ho gaya!\n⏰ Start Time: ${new Date(scheduledStartTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}\n\nHost room se bahar aa gaye hain. Room list me countdown chal raha hai. Samay aane par test auto-start hoga aur aap ya koi bhi sadasya kabhi bhi wapas join kar sakte hain!`);
    } catch (e: any) {
      alert('Schedule karne me samasya: ' + (e?.message || 'Unknown error'));
    } finally {
      setIsSchedulingTest(false);
    }
  };

  // Host launches ANY real lesson MCQ for FREE (0 credits)
  const handleLaunchRealLessonMcq = async (
    lesson: {
      id: string;
      lessonTitle: string;
      classLevel?: string;
      subject?: string;
      questions: GroupStudyMcqQuestion[];
    },
    targetMcqType?: StudyRoomMcqType
  ) => {
    if (launchingLessonId) return;

    // 1. Reliably resolve target room
    let targetRoom: GroupStudyRoom | null = currentRoom || activeRoom || null;
    if (!targetRoom && lastCreatedRoomId) {
      targetRoom = getCachedRooms()[lastCreatedRoomId] || null;
    }
    if (!targetRoom) {
      const cached = getCachedRooms();
      const allCached = Object.values(cached).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (allCached.length > 0) {
        targetRoom = allCached[0];
      }
    }

    if (!targetRoom) {
      alert('Room connect nahi ho paya. Kripya pehle room create karein ya dobara join karein.');
      return;
    }

    const rawQuestions = Array.isArray(lesson.questions) ? lesson.questions : [];
    const cleanQuestions: GroupStudyMcqQuestion[] = rawQuestions
      .map((q, idx) => {
        const parsed = parseQuestionToGroupMcq(q);
        if (parsed) return parsed;
        const rawStmts = (q as any)?.statements ?? (q as any)?.statement ?? (q as any)?.mcqStatements;
        let statements: string[] | undefined = undefined;
        if (Array.isArray(rawStmts) && rawStmts.length > 0) {
          statements = rawStmts.map((s: any) => String(s ?? '').trim()).filter(Boolean);
        } else if (typeof rawStmts === 'string' && rawStmts.trim()) {
          statements = rawStmts.split('\n').map((s: string) => s.trim()).filter(Boolean);
        }
        return {
          question: String(q?.question || `Question ${idx + 1}`).trim(),
          ...(statements && statements.length > 0 ? { statements } : {}),
          options: (Array.isArray(q?.options) ? q.options : ['A', 'B', 'C', 'D'])
            .slice(0, 4)
            .map((opt, oIdx) => String(opt ?? `Option ${oIdx + 1}`).trim()),
          correctIndex: typeof q?.correctIndex === 'number' ? Math.max(0, Math.min(3, q.correctIndex)) : 0,
          explanation: q?.explanation ? String(q.explanation).trim() : '',
        };
      })
      .filter((q) => q.question.length > 0 && q.options.length >= 2);

    if (cleanQuestions.length === 0) {
      alert('Is lesson me koi MCQ uplabdh nahi hai.');
      return;
    }

    // Free User Host Restriction: Free users cannot host MCQ+ sets
    const isMcqPlusLesson = (lesson as any).isRevisionHub || (lesson as any).sourceType === 'REVISION_HUB' || targetMcqType === 'REVISION_HUB' || chooserMcqType === 'REVISION_HUB';
    if (isFreeUser && isMcqPlusLesson) {
      alert('🔒 MCQ+ Question Sets sirf Pro / Ultra members host kar sakte hain! Kripya standard MCQ sets chunein ya Store se plan upgrade karein.');
      return;
    }

    // Check host authority generously (creator, admin, host ID, name)
    const userIsHost =
      isHost ||
      (user?.id && targetRoom.hostId === user.id) ||
      (auth.currentUser?.uid && targetRoom.hostId === auth.currentUser.uid) ||
      (user?.name && targetRoom.hostName && user.name.toLowerCase() === targetRoom.hostName.toLowerCase()) ||
      isRoomCreatedByMe(targetRoom.id, targetRoom.hostId, user?.id) ||
      isAdmin;

    if (!userIsHost) {
      alert('Sirf Room Host hi live MCQ battle shuru kar sakte hain.');
      return;
    }

    // Close chooser modal immediately so user transitions to the arena right away
    setShowChapterChooser(false);
    setActiveTab('MCQ');
    setIsLoadingChapterMcq(true);
    setLaunchingLessonId(lesson.id);

    try {
      const chosenType: StudyRoomMcqType = targetMcqType || chooserMcqType || targetRoom.mcqType || 'PROJECTOR_MODE';
      const duration = selectedTimerDuration || 30;
      const displayTitle = `${lesson.lessonTitle} (${lesson.classLevel === 'COMPETITION' ? 'Competition' : `Class ${lesson.classLevel}`} • ${lesson.subject || 'MCQ'})`;

      const now = Date.now();
      const testStartTime = now;
      const testEndTime = now + (totalTestMinutes || 10) * 60 * 1000;

      // 2. IMMEDIATE local update: show live MCQ arena instantly!
      const updatedRoom: GroupStudyRoom = {
        ...targetRoom,
        mode: 'LIVE_MCQ',
        mcqType: chosenType,
        liveMcq: {
          isActive: true,
          title: displayTitle,
          currentQuestionIndex: 0,
          totalQuestions: cleanQuestions.length,
          questionStartTime: now,
          durationPerQuestion: duration,
          autoAdvance: false,
          timerMode: 'MIX',
          totalTestDurationMinutes: totalTestMinutes,
          testStartTime,
          testEndTime,
          targetPaceSeconds: userPaceSeconds,
          vibrateOnPaceAlert: userVibrateAlert,
          status: 'QUESTION',
          questions: cleanQuestions,
          scores: {},
          questionAnswers: {},
        },
        lastActive: now,
      };

      saveCachedRoom(updatedRoom);
      setCurrentRoom(updatedRoom);
      setStudentActiveQIndex(0);
      setPaceSecondsLeft(userPaceSeconds || 20);
      setHasPaceAlertTriggered(false);
      if (onActiveRoomChange) onActiveRoomChange(updatedRoom);

      // 3. Background sync to RTDB & peers
      await startLiveMcqBattle(
        targetRoom.id,
        displayTitle,
        cleanQuestions,
        duration,
        false,
        'MIX',
        totalTestMinutes,
        userPaceSeconds,
        userVibrateAlert
      );

      if (chosenType !== targetRoom.mcqType) {
        await setRoomMcqType(targetRoom.id, chosenType);
      }

      // User requirement: Study room practice questions notify ALL users without class restriction
      void notifyStudyRoomChallengeInBackground({
        senderId: user?.id || targetRoom.hostId || 'host',
        senderName: user?.name || targetRoom.hostName || 'Study Room',
        challengeTitle: displayTitle,
        roomId: targetRoom.id,
        roomCode: (targetRoom.code || targetRoom.id.slice(-6)).toUpperCase(),
        password: targetRoom.password,
        totalQuestions: cleanQuestions.length,
      }).catch((e) => console.warn('Challenge notify notice:', e));
    } catch (err: any) {
      console.warn('[GroupStudy] Live battle background sync error:', err);
    } finally {
      setIsLoadingChapterMcq(false);
      setLaunchingLessonId(null);
    }
  };

  // Host launches ANY lesson MCQ for FREE (0 credits)
  const handleLaunchFreeLessonMcq = async (chapterTitle: string, subjectKey: string) => {
    if (!currentRoom || !isHost) return;
    setIsLoadingChapterMcq(true);
    try {
      let questions: GroupStudyMcqQuestion[] = [];

      // 1. Fetch from Firestore / local storage via getChapterData
      try {
        const chapterData = await getChapterData(chapterTitle) || await getChapterData(`nst_${chapterTitle}`);
        if (chapterData && Array.isArray(chapterData.mcq) && chapterData.mcq.length > 0) {
          questions = chapterData.mcq
            .map((q: any) => parseQuestionToGroupMcq(q))
            .filter((q: any): q is GroupStudyMcqQuestion => Boolean(q && q.question && q.options.length >= 2));
        }
      } catch (e) {
        console.warn('Chapter MCQ fetch note:', e);
      }

      // 2. If chapter didn't have stored MCQs, pick from syllabus bank or curated sets
      if (questions.length === 0) {
        const fallbackSet = availableBattleSets[0];
        if (fallbackSet && fallbackSet.questions.length > 0) {
          questions = fallbackSet.questions.slice(0, 15);
        }
      }

      if (questions.length === 0) {
        alert('Is chapter ke MCQs abhi taiyaar nahi hain. Kripya doosra chapter chunein.');
        return;
      }

      const duration = selectedTimerDuration || 30;

      await startLiveMcqBattle(
        currentRoom.id,
        `${chapterTitle} · Free Lesson MCQ`,
        questions,
        duration,
        false,
        'MIX',
        totalTestMinutes,
        userPaceSeconds,
        userVibrateAlert
      );

      // User requirement: Study room practice questions notify ALL users without class restriction
      void notifyStudyRoomChallengeInBackground({
        senderId: user?.id || currentRoom.hostId || 'host',
        senderName: user?.name || currentRoom.hostName || 'Study Room',
        challengeTitle: `${chapterTitle} · Practice Challenge`,
        roomId: currentRoom.id,
        roomCode: (currentRoom.code || currentRoom.id.slice(-6)).toUpperCase(),
        password: currentRoom.password,
        totalQuestions: questions.length,
      }).catch((e) => console.warn('Challenge notify notice:', e));

      setShowChapterChooser(false);
    } catch (err: any) {
      alert('MCQ shuru karne me samasya: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoadingChapterMcq(false);
    }
  };

  // Host adjusts question timer on the fly
  const handleSetDuration = async (sec: number) => {
    setSelectedTimerDuration(sec);
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      const updated = {
        ...prev,
        liveMcq: {
          ...prev.liveMcq,
          durationPerQuestion: sec,
        },
      };
      saveCachedRoom(updated);
      return updated;
    });
    if (currentRoom?.id && isHost) {
      await setRoomMcqDuration(currentRoom.id, sec);
    }
  };

  // Host toggles auto-advance
  const handleToggleAutoAdvance = async () => {
    const nextVal = !autoAdvanceEnabled;
    setAutoAdvanceEnabled(nextVal);
    if (currentRoom?.id && isHost) {
      await setRoomMcqAutoAdvance(currentRoom.id, nextVal);
    }
  };

  // Host manually finishes and submits battle early
  const handleForceEndBattle = async () => {
    if (!currentRoom?.id || !isHost || !currentRoom.liveMcq) return;
    const confirmEnd = window.confirm('Kya aap sach me Live MCQ Battle submit karke sabhi ko final data dikhana chahte hain?');
    if (!confirmEnd) return;
    await advanceMcqQuestion(currentRoom.id, currentRoom.liveMcq.currentQuestionIndex, true);
    if (user?.id) {
      await awardFinalStreakBonus(currentRoom.id, user.id);
    }
  };

  // Reveal answer in battle with immediate optimistic state update
  const handleRevealAnswer = async () => {
    if (!currentRoom?.id || !currentRoom.liveMcq) return;
    if (currentRoom.liveMcq.status === 'REVEAL' || currentRoom.liveMcq.status === 'ENDED') return;

    // Optimistically update currentRoom immediately
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      if (prev.liveMcq.status === 'REVEAL' || prev.liveMcq.status === 'ENDED') return prev;
      const updated = {
        ...prev,
        liveMcq: {
          ...prev.liveMcq,
          status: 'REVEAL' as const,
        },
      };
      saveCachedRoom(updated);
      return updated;
    });

    try {
      await revealMcqAnswer(currentRoom.id);
    } catch (err) {
      console.warn('Error revealing answer in RTDB:', err);
    }
  };

  // Student/Member submits answer
  const handleSelectOption = async (optIdx: number) => {
    if (!currentRoom || !currentRoom.liveMcq) return;
    const isSelfPaced = currentRoom.liveMcq.timerMode === 'TOTAL_TEST' || currentRoom.liveMcq.timerMode === 'MIX';
    
    const totalQCount = currentRoom.liveMcq.questions?.length || 1;
    const curIdx = Math.max(0, Math.min(studentActiveQIndex, totalQCount - 1));
    const q = currentRoom.liveMcq.questions[curIdx];
    if (!q) return;

    // Check if current question was already answered (prevent duplicate answers in single question lock mode)
    const wasAlreadyAnswered = localBattleStats.answers[curIdx] !== undefined;
    if (!isSelfPaced && wasAlreadyAnswered && !isHost) return;

    setSelectedOption(optIdx);
    setHasAnsweredCurrentQ(true);

    const isCorrect = optIdx === q.correctIndex;
    const durationLimit = currentRoom.liveMcq.durationPerQuestion || 20;
    const timeTaken = isSelfPaced ? 5 : Math.max(0.5, durationLimit - mcqSecondsLeft);

    // Optimistically record the answer in currentRoom.liveMcq.questionAnswers immediately
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      const existingAnswers = prev.liveMcq.questionAnswers?.[curIdx] || {};
      const updatedAnswers = {
        ...existingAnswers,
        [user?.id || 'guest']: {
          userId: user?.id || 'guest',
          userName: user?.name || 'Student',
          isCorrect,
          selectedOption: optIdx,
          timeTakenSec: timeTaken,
          submittedAt: Date.now(),
        },
      };
      const updatedLiveMcq = {
        ...prev.liveMcq,
        questionAnswers: {
          ...(prev.liveMcq.questionAnswers || {}),
          [curIdx]: updatedAnswers,
        },
      };
      const updatedRoom = { ...prev, liveMcq: updatedLiveMcq };
      saveCachedRoom(updatedRoom);
      return updatedRoom;
    });

    // Staggered Zero-Firebase-Write Engine: Calculate score and answers 100% locally in React memory!
    let netXpChange = 0;
    setLocalBattleStats((prev) => {
      const prevAnswer = prev.answers[curIdx];
      const wasAlreadyAnswered = prevAnswer !== undefined;
      const wasCorrectBefore = prevAnswer?.isCorrect;

      let correctCount = prev.correctCount;
      let wrongCount = prev.wrongCount;
      let totalAnswered = prev.totalAnswered;

      if (!wasAlreadyAnswered) {
        totalAnswered += 1;
        if (isCorrect) correctCount += 1;
        else wrongCount += 1;
      } else {
        if (wasCorrectBefore && !isCorrect) {
          correctCount = Math.max(0, correctCount - 1);
          wrongCount += 1;
        } else if (!wasCorrectBefore && isCorrect) {
          wrongCount = Math.max(0, wrongCount - 1);
          correctCount += 1;
        }
      }

      const newScore = Math.max(0, correctCount * 4 - wrongCount * 1);
      const newTotalXp = Math.max(0, correctCount * 5 - wrongCount * 2);

      const updatedStats = {
        score: newScore,
        correctCount,
        wrongCount,
        totalAnswered,
        currentStreak: isCorrect ? prev.currentStreak + 1 : 0,
        maxStreak: Math.max(prev.maxStreak, isCorrect ? prev.currentStreak + 1 : 0),
        userXp: newTotalXp,
        streakBonusXp: prev.streakBonusXp,
        answers: {
          ...prev.answers,
          [curIdx]: { selectedOption: optIdx, isCorrect, timeTakenSec: timeTaken },
        },
      };

      // Optimistically show user's score on device without hitting network
      const currentUid = user?.id || 'guest';
      setCurrentRoom((r) => {
        if (!r || !r.liveMcq) return r;
        const updatedScores = {
          ...(r.liveMcq.scores || {}),
          [currentUid]: {
            name: user?.name || 'Student',
            score: newScore,
            correctCount: updatedStats.correctCount,
            wrongCount: updatedStats.wrongCount,
            totalAnswered: updatedStats.totalAnswered,
            maxStreak: updatedStats.maxStreak,
            userXp: newTotalXp,
            streakBonusXp: updatedStats.streakBonusXp,
          },
        };
        const updatedRoom = {
          ...r,
          liveMcq: {
            ...r.liveMcq,
            scores: updatedScores,
          },
        };
        saveCachedRoom(updatedRoom);
        return updatedRoom;
      });

      return updatedStats;
    });

    setLastXpOutcome({
      isCorrect,
      timeTakenSec: timeTaken,
      earnedPoints: isCorrect ? Math.max(1, Math.round(10 - timeTaken * 0.3)) : 0,
      baseXp: isCorrect ? 5 : -2,
      streakBonusXp: 0,
      netXpChange,
      currentStreak: isCorrect ? (localBattleStats.currentStreak + 1) : 0,
      maxStreak: Math.max(localBattleStats.maxStreak, isCorrect ? (localBattleStats.currentStreak + 1) : 0),
    });
    setShowXpBanner(false);
  };

  const handleNextMcqQuestion = async () => {
    if (!currentRoom || !currentRoom.liveMcq) return;
    const { liveMcq } = currentRoom;
    const nextIdx = (liveMcq.currentQuestionIndex || 0) + 1;
    const totalQuestions = liveMcq.totalQuestions || liveMcq.questions?.length || 0;
    const isFinished = nextIdx >= totalQuestions;
    const nextQuestionStartTime = Date.now();

    // Reset local option selection & timers for next question
    setSelectedOption(null);
    setHasAnsweredCurrentQ(false);
    setShowXpBanner(false);
    setRevealSecondsLeft(2);
    setMcqSecondsLeft(liveMcq.durationPerQuestion || 20);
    questionTimerRef.current = {
      key: `${currentRoom.id}:${nextIdx}`,
      startedAt: nextQuestionStartTime,
      sourceStart: nextQuestionStartTime,
    };

    // 1. Optimistically update local React state immediately so UI switches to next question instantly!
    setCurrentRoom((prev) => {
      if (!prev || !prev.liveMcq) return prev;
      const updatedLiveMcq = {
        ...prev.liveMcq,
        currentQuestionIndex: nextIdx,
        status: isFinished ? ('ENDED' as const) : ('QUESTION' as const),
        questionStartTime: nextQuestionStartTime,
        isActive: !isFinished,
      };
      const updatedRoom: GroupStudyRoom = {
        ...prev,
        liveMcq: updatedLiveMcq,
      };
      saveCachedRoom(updatedRoom);
      return updatedRoom;
    });

    // 2. Broadcast to RTDB so other members in the room also advance
    try {
      if (isFinished) {
        await advanceMcqQuestion(currentRoom.id, nextIdx, true);
        if (user?.id) {
          await awardFinalStreakBonus(currentRoom.id, user.id);
        }
      } else {
        await advanceMcqQuestion(currentRoom.id, nextIdx, false);
      }
    } catch (err) {
      console.warn('Error advancing question in RTDB:', err);
    }
  };

  const handleSwitchMcqType = async (type: StudyRoomMcqType) => {
    if (!currentRoom || !isHost) return;
    if (type === 'REVISION_HUB' && isFreeUser) {
      alert('🔒 MCQ+ Question Sets sirf Pro / Ultra members host kar sakte hain! Free users standard MCQ practice sets host kar sakte hain.');
      return;
    }
    const updated: GroupStudyRoom = { ...currentRoom, mcqType: type };
    setCurrentRoom(updated);
    saveCachedRoom(updated);
    setChooserMcqType(type);

    if (type === 'REVISION_HUB') {
      // In MCQ+, strictly single lesson & 100 questions benchmark
      if (selectedCuratedSets.length > 1) {
        setSelectedCuratedSets([selectedCuratedSets[0]]);
        setSelectedCuratedSet(selectedCuratedSets[0]);
      }
      setLimitMode('TOTAL');
      setTotalQuestionsLimit(100);
    } else {
      // In standard MCQ, allow variable questions & multiple lessons
      setLimitMode('ALL');
    }

    try {
      await setRoomMcqType(currentRoom.id, type);
    } catch (err) {
      console.warn('Failed to sync mcqType to RTDB:', err);
    }
  };

  // Filtered Live Rooms for Search
  const filteredActiveRooms = useMemo(() => {
    const q = roomSearchQuery.trim().toLowerCase();
    if (!q) return activeRooms;
    return activeRooms.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        (r.hostName && r.hostName.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.id && r.id.slice(-6).toLowerCase().includes(q)) ||
        (r.password && r.password.toLowerCase().includes(q))
    );
  }, [activeRooms, roomSearchQuery]);

  const brandColor = tierTheme?.primary || '#6366f1';

  const formatSeconds = (sec: number) => {
    if (typeof sec !== 'number' || isNaN(sec) || !isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-sans"
      id="group-study-modal-overlay"
    >
      <div
        className={`w-full h-full ${
          isScreenRotated
            ? 'md:h-full md:max-w-none md:rounded-none'
            : 'md:h-[92vh] md:max-w-4xl md:rounded-3xl'
        } ${
          roomTheme === 'black'
            ? 'bg-black border-zinc-800 text-white'
            : roomTheme === 'white'
            ? 'bg-slate-50 border-slate-300 text-slate-900'
            : 'bg-slate-900 border-slate-700/70 text-slate-100'
        } shadow-2xl flex flex-col overflow-hidden transition-colors duration-200`}
        style={{
          boxShadow: `0 25px 50px -12px ${brandColor}33`,
        }}
      >
        {/* ── TOP NAV BAR ── */}
        <div className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b shrink-0 ${
          roomTheme === 'black'
            ? 'bg-zinc-950 border-zinc-800 text-white'
            : roomTheme === 'white'
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-950/90 border-slate-800 text-slate-100'
        }`}>
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-1 shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black shadow-md text-white shrink-0"
              style={{ background: brandColor }}
            >
              <Trophy size={18} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`font-black text-xs sm:text-sm md:text-base tracking-wide truncate max-w-[95px] sm:max-w-[170px] md:max-w-[260px] ${
                  roomTheme === 'white' ? 'text-slate-900' : 'text-white'
                }`}>
                  {currentRoom ? ((currentRoom.name && currentRoom.name !== 'undefined') ? currentRoom.name : `${currentRoom.subject || 'Live'} Battle`) : 'Study Room · Live MCQ Arena'}
                </span>
                {currentRoom && (
                  <span
                    className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border shrink-0 ${
                      currentRoom.mcqType === 'REVISION_HUB'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {currentRoom.mcqType === 'REVISION_HUB'
                      ? '⚡ MCQ +'
                      : '🎯 MCQ'}
                  </span>
                )}
              </div>
              <p className={`text-[10px] sm:text-[11px] truncate max-w-[110px] sm:max-w-[220px] ${
                roomTheme === 'white' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {currentRoom
                  ? `${currentRoom.subject || 'General'} • ${Object.keys(currentRoom.members || {}).length} Online`
                  : 'Live peer MCQ battles, instant XP & streak bonuses'}
              </p>
            </div>
          </div>

          {/* Horizontally Scrollable Buttons Bar - Same Size for All Buttons */}
          <div
            className="flex-1 flex items-center justify-end gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap py-1 pl-2 scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
            }}
            onWheel={(e) => {
              if (e.deltaY !== 0 && e.currentTarget) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            {/* Room Theme Selector (Blue / Black / White) */}
            <div className={`h-9 px-2 rounded-xl border flex items-center gap-1.5 shrink-0 ${
              roomTheme === 'black'
                ? 'bg-zinc-900 border-zinc-700'
                : roomTheme === 'white'
                ? 'bg-slate-100 border-slate-300'
                : 'bg-slate-800/90 border-slate-700'
            }`} title="Room Color: Blue, Black, ya White chunein">
              <button
                type="button"
                onClick={() => toggleRoomTheme('blue')}
                className={`w-5 h-5 rounded-full bg-indigo-600 transition-transform cursor-pointer ${roomTheme === 'blue' ? 'ring-2 ring-white scale-110 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                title="Blue Theme (Indigo Slate)"
              />
              <button
                type="button"
                onClick={() => toggleRoomTheme('black')}
                className={`w-5 h-5 rounded-full bg-black border border-zinc-500 transition-transform cursor-pointer ${roomTheme === 'black' ? 'ring-2 ring-amber-400 scale-110 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                title="Black Theme (Pitch AMOLED)"
              />
              <button
                type="button"
                onClick={() => toggleRoomTheme('white')}
                className={`w-5 h-5 rounded-full bg-white border border-slate-400 transition-transform cursor-pointer ${roomTheme === 'white' ? 'ring-2 ring-indigo-600 scale-110 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                title="White Theme (Clean Day White)"
              />
            </div>
            {/* Rotate Screen Button (Always in Top Bar, Same Size as Other Buttons) */}
            <button
              type="button"
              onClick={handleToggleRotate}
              className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0 ${
                isScreenRotated
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/60 shadow-purple-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title={isScreenRotated ? 'Switch to Portrait' : 'Rotate Screen (Landscape / Portrait)'}
              aria-label="Rotate Screen"
            >
              <RotateCw size={14} className={`shrink-0 transition-transform ${isScreenRotated ? 'rotate-90 text-purple-300' : ''}`} />
              <span>Rotate</span>
            </button>

            {currentRoom && (
              <button
                type="button"
                onClick={() => handleCopyCode()}
                className="h-9 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                title="Room Code copy karein"
                aria-label="Copy Room Code"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400 shrink-0" /> : <Copy size={14} className="shrink-0" />}
                <span className="font-mono text-xs">{copiedCode ? 'Copied!' : currentRoom.code}</span>
              </button>
            )}

            {currentRoom && isHost && !isMcqRunning && (
              <button
                type="button"
                onClick={() => setActiveTab('MCQ')}
                className="h-9 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition shadow-md cursor-pointer whitespace-nowrap shrink-0"
                title="Live MCQ Battle start karein"
                aria-label="Start Live MCQ"
              >
                <Play size={13} className="fill-slate-950 shrink-0" />
                <span>Start MCQ</span>
              </button>
            )}

            {!isMcqRunning && currentRoom && isHost && (
              <button
                type="button"
                onClick={() => handleDestroyRoom()}
                className="h-9 px-3 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm cursor-pointer border border-rose-500/80 whitespace-nowrap shrink-0"
                title="Host: Room delete karein"
                aria-label="Destroy Room"
              >
                <Trash2 size={14} className="shrink-0" />
                <span>Destroy</span>
              </button>
            )}

            {currentRoom && (
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="h-9 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Room se bahar aayein"
                aria-label="Leave Room"
              >
                <LogOut size={14} className="shrink-0" />
                <span>Leave</span>
              </button>
            )}

            {!currentRoom && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="h-9 px-3 rounded-xl text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
                style={{ background: brandColor }}
                title="Naya study room banayein"
                aria-label="Create Room"
              >
                <Plus size={14} className="shrink-0" />
                <span>+ Room Banayein</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (currentRoom) {
                  handleLeaveRoom();
                } else {
                  onClose();
                }
              }}
              className="h-9 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shrink-0 cursor-pointer whitespace-nowrap"
              title={currentRoom ? 'Leave Room' : 'Close'}
              aria-label={currentRoom ? 'Leave Room' : 'Close'}
            >
              <X size={15} className="shrink-0" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* ── CONDITIONAL CONTENT: LOBBY vs ACTIVE ROOM ── */}
        {!currentRoom ? (
          /* ─────────────────────────────────────────────────────────────────
             LOBBY VIEW (Explore active live rooms, search by name, join via password)
          ─────────────────────────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Banner with Tier Quotas */}
            <div
              className="rounded-2xl p-5 relative overflow-hidden border border-indigo-500/30 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${brandColor}22, #0f172a 80%)`,
              }}
            >
              <div className="relative z-10 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                      isAdmin
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : userTier === 'ULTRA'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                        : userTier === 'BASIC'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isAdmin
                      ? '👑 Admin: Unlimited Rooms & 4 Hr Max'
                      : userTier === 'ULTRA'
                      ? `👑 Ultra VIP: ${todayCreatedRoomsCount}/5 Daily Rooms (2 Hr Max)`
                      : userTier === 'BASIC'
                      ? `⭐ Basic Plan: ${todayCreatedRoomsCount}/3 Daily Rooms (1 Hr Max)`
                      : `🆓 Free User: ${todayCreatedRoomsCount}/2 Daily Rooms (30 Min Max)`}
                  </span>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🎁 Free Lesson MCQs (0 Credits)
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowRulesGuideModal(true)}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <BookOpen size={11} className="text-amber-400" />
                    <span>📖 Room Rules & Capacity (100 Users & Limits)</span>
                  </button>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-2">
                  Live MCQ Study Room me Doston ke Sath Muqabala Karein!
                </h2>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4">
                  Har sahi jawab par <b>+5 XP</b> aur galat par <b>-2 XP</b>. Continuous streak todne par payein{' '}
                  <b>+10, +15, ya +20 XP Bonus</b>! Password enter karke room join karein ya apna room banayein.
                </p>

                {/* Enhanced Join by Code & Password Box */}
                <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <Key size={14} />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-white">Join by Room Code & Password</h3>
                        <p className="text-[11px] text-slate-400">Host dwara share kiya gaya Room Code aur Password enter karein</p>
                      </div>
                    </div>
                    {!isCreateRoomGloballyHidden && (
                      <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer shrink-0"
                        style={{ background: brandColor }}
                      >
                        <Plus size={14} /> Apna Room Banayein
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleJoinByCode} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Code input */}
                    <div className="sm:col-span-4 relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none">
                        <Key size={13} />
                      </div>
                      <input
                        type="text"
                        placeholder="6-Digit Room Code"
                        value={joinCodeInput}
                        onChange={(e) => {
                          setJoinCodeInput(e.target.value.toUpperCase());
                          setJoinCodeError('');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-8 pr-3 py-2 text-xs font-mono uppercase font-bold text-white placeholder:text-slate-500 outline-none transition"
                        maxLength={12}
                      />
                    </div>

                    {/* Password input */}
                    <div className="sm:col-span-3 relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Lock size={13} />
                      </div>
                      <input
                        type={showJoinPasswordInput ? 'text' : 'password'}
                        placeholder="Password (if any)"
                        value={joinPasswordInput}
                        onChange={(e) => {
                          setJoinPasswordInput(e.target.value);
                          setJoinCodeError('');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-8 pr-9 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowJoinPasswordInput(!showJoinPasswordInput)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        title={showJoinPasswordInput ? 'Hide Password' : 'Show Password'}
                      >
                        {showJoinPasswordInput ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>

                    {/* Optional Name input */}
                    <div className="sm:col-span-3 relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <User size={13} />
                      </div>
                      <input
                        type="text"
                        placeholder={user?.name || "Naam (Optional)"}
                        value={joinNameInput}
                        onChange={(e) => {
                          setJoinNameInput(e.target.value);
                          setJoinCodeError('');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-400 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition"
                        maxLength={30}
                      />
                    </div>

                    {/* Join button */}
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={!joinCodeInput.trim() || isLoading}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-95 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} className="fill-current" />}
                        <span>Join</span>
                      </button>
                    </div>
                  </form>

                  {joinCodeError && (
                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5 pt-0.5">
                      <AlertCircle size={13} className="shrink-0" /> {joinCodeError}
                    </p>
                  )}

                  {!isCreateRoomGloballyHidden && (
                    <div className="sm:hidden pt-1">
                      <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                        style={{ background: brandColor }}
                      >
                        <Plus size={14} /> Apna Room Banayein
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Room Discovery & Search Header */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-emerald-400 animate-pulse" />
                  <h3 className="font-black text-base text-white">Live MCQ Rooms</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                    {filteredActiveRooms.length} Live
                  </span>
                </div>

                {/* Search Input */}
                <div className="w-full sm:w-80 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Room Code, Name, Subject or Host..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition"
                  />
                  {roomSearchQuery && (
                    <button
                      onClick={() => setRoomSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Rooms Grid */}
              {filteredActiveRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredActiveRooms.map((room, rIdx) => {
                    const memberCount = Object.keys(room.members || {}).length;
                    const modeBadge =
                      room.mcqType === 'REVISION_HUB'
                        ? { label: '⚡ MCQ +', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
                        : { label: '🎯 MCQ', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };

                    const expiry = room.expiresAt || (room.createdAt + (room.durationMinutes || 30) * 60 * 1000);
                    const remainingMin = Math.max(0, Math.ceil((expiry - Date.now()) / (60 * 1000)));
                    const isMyRoom = isRoomCreatedByMe(room.id, room.hostId, user?.id) ||
                      (Boolean(auth.currentUser?.uid) && room.hostId === auth.currentUser.uid) ||
                      (Boolean(user?.name && room.hostName) && user?.name?.toLowerCase() === room.hostName?.toLowerCase()) ||
                      isAdmin;

                    return (
                      <div
                        key={room.id || room.code || `room_${rIdx}`}
                        className={`border rounded-2xl p-4 transition flex flex-col justify-between group shadow-sm ${
                          isMyRoom 
                            ? 'bg-slate-800/90 border-emerald-500/50 shadow-emerald-950/30 ring-1 ring-emerald-500/30' 
                            : 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${modeBadge.bg}`}>
                                {modeBadge.label}
                              </span>
                              {isMyRoom && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  👑 Aap Host Hain
                                </span>
                              )}
                              {room.liveMcq?.isActive && (room.liveMcq.status === 'QUESTION' || room.liveMcq.status === 'REVEAL') ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  <span>Battle Live</span>
                                </span>
                              ) : (!room.liveMcq?.questions || room.liveMcq.questions.length === 0) ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  <span>Active (Waiting Room)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Active ({room.liveMcq.questions.length} Qs)</span>
                                </span>
                              )}
                              {room.isScheduled && room.scheduledStartTime && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>⏰ Scheduled: {new Date(room.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="text-amber-400" />
                                <span className="text-slate-300 font-bold">{remainingMin}m</span> left
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                <span className="text-white font-bold">{memberCount}</span>/{room.maxMembers}
                              </span>
                            </div>
                          </div>

                          <h4 className="font-black text-sm text-white group-hover:text-indigo-300 transition line-clamp-1">
                            {room.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mb-2">
                            Topic: <span className="text-slate-200 font-semibold">{room.subject}</span>
                          </p>

                          {(!room.liveMcq?.questions || room.liveMcq.questions.length === 0) && (
                            <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5">
                              <Clock size={12} className="shrink-0 text-amber-400" />
                              <span>Host sawal select kar rahe hain • Password daal kar room join karein</span>
                            </div>
                          )}

                          {/* Live Day, Hour, Min, Sec Cooldown Banner */}
                          {room.isScheduled && room.scheduledStartTime && (() => {
                            const cd = formatDayHourMinSec(room.scheduledStartTime, liveClockNow);
                            return (
                              <div className="mb-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 shadow-inner">
                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                    <Clock size={11} className="text-amber-400 shrink-0" />
                                    <span>{cd.isStarted ? 'Test Time Active:' : '⏳ Room Cooldown (Starts In):'}</span>
                                  </span>
                                  {cd.isStarted && (
                                    <span className="text-[10px] font-black text-emerald-400 animate-pulse">🟢 Active Now!</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-center gap-1 font-mono text-center">
                                  <div className="flex-1 py-1 px-1 rounded-lg bg-slate-950/90 border border-amber-500/30">
                                    <span className="block text-xs font-black text-amber-300">{cd.days}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Day</span>
                                  </div>
                                  <span className="text-amber-400 font-bold text-xs">:</span>
                                  <div className="flex-1 py-1 px-1 rounded-lg bg-slate-950/90 border border-amber-500/30">
                                    <span className="block text-xs font-black text-amber-300">{String(cd.hours).padStart(2, '0')}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Hour</span>
                                  </div>
                                  <span className="text-amber-400 font-bold text-xs">:</span>
                                  <div className="flex-1 py-1 px-1 rounded-lg bg-slate-950/90 border border-amber-500/30">
                                    <span className="block text-xs font-black text-amber-300">{String(cd.minutes).padStart(2, '0')}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Min</span>
                                  </div>
                                  <span className="text-amber-400 font-bold text-xs">:</span>
                                  <div className="flex-1 py-1 px-1 rounded-lg bg-slate-950/90 border border-amber-500/30">
                                    <span className="block text-xs font-black text-amber-300">{String(cd.seconds).padStart(2, '0')}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Sec</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="flex items-center justify-between gap-2 mb-4 text-xs text-slate-400 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {room.hostName?.charAt(0)?.toUpperCase() || 'H'}
                              </div>
                              <span>Host: {room.hostName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md" title="Room Code">
                                🔑 Code: {(room.code || room.id?.slice(-6) || 'STUDY1').toUpperCase()}
                              </span>
                              {isMyRoom ? (
                                <>
                                  {room.password && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md" title="Room password (sirf host ko dikhta hai)">
                                      🔒 PW: {room.password}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDestroyRoom(room.id);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-black text-rose-400 hover:text-white bg-rose-950/50 hover:bg-rose-600 border border-rose-500/40 px-2 py-0.5 rounded-full transition cursor-pointer"
                                    title="Aap host hain: is room ko destroy / delete karein"
                                  >
                                    <Trash2 size={10} /> Delete Room
                                  </button>
                                </>
                              ) : (
                                room.password ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                    <Lock size={10} /> Password
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    Open
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareToWhatsApp(room);
                            }}
                            className="px-2.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow active:scale-95 transition cursor-pointer shrink-0"
                            title="WhatsApp par Code aur Password share karein"
                          >
                            <FaWhatsapp size={14} />
                            <span className="hidden sm:inline">Share</span>
                          </button>
                          {isMyRoom ? (
                            <button
                              type="button"
                              onClick={() => handleJoinRoom(room)}
                              disabled={isLoading}
                              className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                            >
                              <Sparkles size={13} className="text-yellow-200" /> Enter Room (Aap Host Hain) <ChevronRight size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiateJoin(room)}
                              disabled={isLoading}
                              className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition cursor-pointer"
                              style={{
                                background: brandColor,
                                color: '#ffffff',
                              }}
                            >
                              {room.password ? (
                                <>
                                  <Lock size={13} /> Join Room (Enter Password) <ChevronRight size={14} />
                                </>
                              ) : (
                                <>
                                  <Play size={13} /> Join Room <ChevronRight size={14} />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center bg-slate-900/50">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                    <Trophy size={24} />
                  </div>
                  <h4 className="text-base font-black text-white mb-1">
                    {roomSearchQuery ? 'Search me koi room nahi mila' : 'Abhi koi Live MCQ Room nahi hai'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    {roomSearchQuery
                      ? 'Dusre keyword se search karein ya naya MCQ study room banayein.'
                      : 'Aap pehla Live MCQ room banakar password aur room code doston ke sath share karein!'}
                  </p>
                  {!isCreateRoomGloballyHidden && (
                    <button
                      onClick={handleOpenCreateModal}
                      className="px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-lg active:scale-95 transition inline-flex items-center gap-2 cursor-pointer"
                      style={{ background: brandColor }}
                    >
                      <Plus size={14} /> Pehla MCQ Room Banayein
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
             ACTIVE ROOM VIEW (Live MCQ Arena, Host Lesson Picker, Real-time XP & Podium)
          ─────────────────────────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Main Battle Stage */}
            <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-800">
              {/* During active MCQ running: Ultra-compact Single Row Toolbar (Exactly 2 rows with top bar, Live Discussion removed during test) */}
              {isMcqRunning ? (
                <div className="shrink-0 mb-2 px-2 py-1 sm:py-1.5 rounded-xl bg-slate-900/95 border border-slate-800 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar shadow-md">
                  {/* Single Unified Row: Controls & Navigation */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
                    {/* Invite Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileInvite(!showMobileInvite);
                        if (!showMobileInvite) {
                          setShowMobileRoomInfo(false);
                          setShowMobileHostControls(false);
                        }
                      }}
                      className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-black border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                        showMobileInvite
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title="Invite Room Code & WhatsApp Share"
                    >
                      <Share2 size={12} className="text-emerald-400 shrink-0" />
                      <span>Invite ({currentRoom.code || currentRoom.id?.slice(-6)})</span>
                    </button>

                    {/* Rules Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileRoomInfo(!showMobileRoomInfo);
                        if (!showMobileRoomInfo) {
                          setShowMobileInvite(false);
                          setShowMobileHostControls(false);
                        }
                      }}
                      className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-black border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                        showMobileRoomInfo
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title="Scoring & Rules Dekhein"
                    >
                      <Info size={12} className="text-amber-400 shrink-0" />
                      <span>Rules</span>
                    </button>

                    {/* Host Settings & Time Management (Admin / Host only) */}
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileHostControls(!showMobileHostControls);
                          if (!showMobileHostControls) {
                            setShowMobileRoomInfo(false);
                            setShowMobileInvite(false);
                          }
                        }}
                        className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-black border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                          showMobileHostControls
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                        title="Per Question Timer aur Host Settings"
                      >
                        <Settings size={12} className="text-indigo-400 shrink-0" />
                        <span>Host Settings ⚙️</span>
                      </button>
                    )}

                    {/* Sawal Grid Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowQuestionPalette((prev) => !prev)}
                      className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-black border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                        showQuestionPalette
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title="Question Grid kholein ya band karein"
                    >
                      <LayoutGrid size={12} className="text-indigo-400 shrink-0" />
                      <span>Sawal Grid ({Object.keys(localBattleStats.answers).length}/{currentRoom.liveMcq?.totalQuestions || currentRoom.liveMcq?.questions?.length || 0})</span>
                    </button>
                  </div>

                  {/* Right Side: Live Pulse Badge (Live Discussion completely removed during active test) */}
                  <div className="flex items-center gap-1 shrink-0 ml-auto pl-1">
                    <span className="font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" /> Live
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Banner: Host Controls & Room Status */}
                  <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                          Live Room Active
                        </span>
                      </div>

                      {isHost && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">MCQ Mode:</span>
                          <button
                            onClick={() => handleSwitchMcqType('PROJECTOR_MODE')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${
                              currentRoom.mcqType === 'PROJECTOR_MODE' || currentRoom.mcqType === 'MCQ_PRACTICE'
                                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                            title="Ek Lesson ke Pure MCQs (Notes, Lucent & Homework)"
                          >
                            🎯 MCQ
                          </button>
                          <button
                            onClick={() => {
                              if (isFreeUser) {
                                alert('🔒 MCQ+ Question Sets sirf Pro / Ultra members host kar sakte hain! Free users standard MCQ practice sets host kar sakte hain.');
                                return;
                              }
                              handleSwitchMcqType('REVISION_HUB');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${
                              currentRoom.mcqType === 'REVISION_HUB'
                                ? 'bg-purple-500 text-slate-950 shadow-sm'
                                : isFreeUser
                                ? 'bg-slate-900 text-slate-500 border border-slate-800'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                            title={isFreeUser ? 'MCQ+ Mode (Pro/Ultra Members Only)' : 'Revision Hub ke Subjects & Lessons'}
                          >
                            ⚡ MCQ + {isFreeUser && '🔒'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">Rules:</span>
                        <span className="text-slate-300">
                          Sahi: <b className="text-emerald-400">+5 XP</b> | Galat: <b className="text-rose-400">-2 XP</b> |
                          Streak Bonus (3: <b className="text-amber-300">+10</b>, 5: <b className="text-amber-300">+15</b>, 7+: <b className="text-amber-300">+20</b>)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Invite & Share Bar: All Buttons in Single Line */}
                  <div className="mb-4 p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-300">👥 Doston ko bulayein:</span>
                      <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        🔑 Code: {(currentRoom.code || currentRoom.id?.slice(-6) || 'STUDY1').toUpperCase()}
                      </span>
                      {currentRoom.password && (
                        <span className="font-mono text-xs font-black text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          🔒 PW: {currentRoom.password}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(currentRoom)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition cursor-pointer shrink-0"
                        title="Room Code aur Password copy karein"
                      >
                        {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedCode ? 'Copied' : 'Copy Details'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendAppInviteNotification(currentRoom)}
                        disabled={sendingInviteNotif || inviteNotifSent}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-md active:scale-95 transition cursor-pointer shrink-0 disabled:opacity-80"
                        title="Class ke sabhi doston ko direct App Push Notification bhejein (WhatsApp ki zaroorat nahi)"
                      >
                        <Radio size={13} className={sendingInviteNotif ? "animate-spin text-amber-300" : inviteNotifSent ? "text-emerald-300" : "text-amber-300"} />
                        <span>{sendingInviteNotif ? "Bhej raha hai..." : inviteNotifSent ? "✅ Sent to Class!" : "📢 App Notification Bhejo"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareToWhatsApp(currentRoom)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md active:scale-95 transition cursor-pointer shrink-0"
                        title="Doston ko WhatsApp par invite karein (Code aur Password dono jayega)"
                      >
                        <FaWhatsapp size={14} className="text-emerald-100" />
                        <span>WhatsApp Share</span>
                      </button>
                      {isHost && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('MCQ')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition cursor-pointer shrink-0"
                          title="Wahi se koi bhi lesson ka MCQ start karein"
                        >
                          <Play size={13} className="fill-current" />
                          <span>Start Live MCQ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Collapsible Info during active MCQ */}
              {isMcqRunning && showMobileRoomInfo && (
                <div className="mb-3 p-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-white text-xs space-y-1.5 animate-in slide-in-from-top duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-black flex items-center gap-1">
                      <Info size={13} /> Scoring & XP Rules:
                    </span>
                    <button onClick={() => setShowMobileRoomInfo(false)} className="text-slate-400 hover:text-white text-[11px] cursor-pointer">✕ Close</button>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Sahi Uttar: <b className="text-emerald-400">+5 XP</b> | Galat: <b className="text-rose-400">-2 XP</b><br />
                    Streak Bonus: 3 Sahi: <b className="text-amber-300">+10</b>, 5 Sahi: <b className="text-amber-300">+15</b>, 7+ Sahi: <b className="text-amber-300">+20 XP</b>
                  </p>
                </div>
              )}

              {/* Collapsible Invite during active MCQ */}
              {isMcqRunning && showMobileInvite && (
                <div className="mb-3 p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 animate-in slide-in-from-top duration-150">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-300">Room Code:</span>
                    <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      {(currentRoom.code || currentRoom.id?.slice(-6) || 'STUDY1').toUpperCase()}
                    </span>
                    {currentRoom.password && (
                      <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                        🔒 PW: {currentRoom.password}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCode(currentRoom)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="Code aur Password copy karein"
                    >
                      {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedCode ? 'Copied' : 'Copy Details'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendAppInviteNotification(currentRoom)}
                      disabled={sendingInviteNotif || inviteNotifSent}
                      className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow disabled:opacity-80"
                      title="Class ke sabhi doston ko App Push Notification bhejein"
                    >
                      <Radio size={12} className={sendingInviteNotif ? "animate-spin text-amber-300" : inviteNotifSent ? "text-emerald-300" : "text-amber-300"} />
                      <span>{sendingInviteNotif ? "Sending..." : inviteNotifSent ? "Sent!" : "App Notify"}</span>
                    </button>
                    <button
                      onClick={() => handleShareToWhatsApp(currentRoom)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow"
                      title="WhatsApp par share karein"
                    >
                      <FaWhatsapp size={12} />
                      <span>WhatsApp</span>
                    </button>
                    <button onClick={() => setShowMobileInvite(false)} className="text-slate-400 hover:text-white text-xs pl-1 cursor-pointer">✕</button>
                  </div>
                </div>
              )}

              {/* Collapsible Host Settings during active MCQ */}
              {isMcqRunning && isHost && showMobileHostControls && (
                <div className="mb-3 p-3 rounded-2xl bg-slate-900 border border-indigo-500/40 text-white text-xs space-y-2 animate-in slide-in-from-top duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-400 font-black flex items-center gap-1">
                      <Settings size={13} /> Host Battle Controls:
                    </span>
                    <button onClick={() => setShowMobileHostControls(false)} className="text-slate-400 hover:text-white text-[11px] cursor-pointer">✕ Close</button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 text-[11px]">Timer per Q:</span>
                      <div className="flex items-center gap-1">
                        {[10, 15, 20, 30, 45, 60].map((sec) => {
                          const activeDuration = currentRoom?.liveMcq?.durationPerQuestion || selectedTimerDuration || 20;
                          return (
                            <button
                              key={`dur_drawer_${sec}`}
                              type="button"
                              onClick={() => handleSetDuration(sec)}
                              className={`px-2 py-1 rounded-lg font-black transition cursor-pointer text-[10px] ${
                                activeDuration === sec
                                  ? 'bg-amber-500 text-slate-950 shadow'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {sec}s
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={handleToggleAutoAdvance}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                          autoAdvanceEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        ⚡ Auto-Next: {autoAdvanceEnabled ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={handleForceEndBattle}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px] hover:bg-rose-500/30 cursor-pointer"
                      >
                        🏁 Submit & End
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Dynamic XP Outcome Notification */}
              {showXpBanner && lastXpOutcome && (
                <div
                  className={`mb-3 p-3 rounded-2xl border flex items-center justify-between text-xs font-black animate-in slide-in-from-top duration-200 ${
                    lastXpOutcome.isCorrect
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : lastXpOutcome.streakBonusXp > 0
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{lastXpOutcome.isCorrect ? '🎉' : '⚠️'}</span>
                    <span>
                      {lastXpOutcome.isCorrect
                        ? `Sahi Uttar! +5 XP mila! 🔥 Current Streak: ${lastXpOutcome.currentStreak}`
                        : lastXpOutcome.streakBonusXp > 0
                        ? `Galat Answer (-2 XP) · 🏆 Streak Tooti (${lastXpOutcome.streakBrokenAt} streak) Bonus: +${lastXpOutcome.streakBonusXp} XP! (Net: +${lastXpOutcome.netXpChange} XP)`
                        : `Galat Answer (-2 XP). Agla sawal sahi karke naya streak banayein!`}
                    </span>
                  </div>
                  <span className="font-mono text-sm">
                    {lastXpOutcome.netXpChange >= 0 ? `+${lastXpOutcome.netXpChange}` : lastXpOutcome.netXpChange} XP
                  </span>
                </div>
              )}

              {/* Room Mode Tabs: MCQ vs LEADERBOARD vs MEMBERS - Hidden during active MCQ on mobile to save vertical space */}
              {!isMcqRunning && (
                <div className="flex items-center justify-between mb-4 bg-slate-950/60 p-2 rounded-2xl border border-slate-800 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('MCQ')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'MCQ'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Trophy size={14} className="text-amber-400" />
                      <span>Live MCQ Battle</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('LEADERBOARD')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'LEADERBOARD'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Award size={14} />
                      <span>Leaderboard & Scores</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('MEMBERS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'MEMBERS'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Users size={14} />
                      <span>{Object.keys(currentRoom.members || {}).length} Online</span>
                    </button>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Room: <b className="text-slate-200">{currentRoom.code}</b>
                  </div>
                </div>
              )}

              {/* ── TAB 1: LIVE MCQ BATTLE ── */}
              {activeTab === 'MCQ' && (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {/* Battle State: WAITING (Host launches quiz, members wait in lobby) */}
                  {(!currentRoom.liveMcq || currentRoom.liveMcq?.status === 'WAITING') && currentRoom.liveMcq?.status !== 'ENDED' && !currentRoom.isExpired && (
                    <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-6 text-center space-y-4 my-auto shadow-xl">
                      {/* Top waiting arena: only show to members waiting in lobby, NOT host ("tup pe rules na dikhega") */}
                      {!isHost && (
                        <div className="text-center space-y-3 pb-2">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl">
                            🎯
                          </div>
                          <h3 className="text-lg font-black text-white">Live MCQ Battle Arena</h3>
                          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                            Host question set choose kar rahe hain. Jaise hi test launch hoga, sawal yahan live ho jayenge!
                          </p>
                        </div>
                      )}

                      {/* Scheduled Room Countdown Banner */}
                      {currentRoom.isScheduled && currentRoom.scheduledStartTime && (() => {
                        const cd = formatDayHourMinSec(currentRoom.scheduledStartTime, liveClockNow);
                        return (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-500/40 text-center space-y-3 max-w-md mx-auto shadow-xl">
                            <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-sm">
                              <Clock size={16} className="text-amber-400" />
                              <span>⏰ Scheduled MCQ Test Room</span>
                            </div>
                            <p className="text-xs text-slate-200">
                              Test Start Samay: <b className="text-white">{new Date(currentRoom.scheduledStartTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</b>
                            </p>

                            {/* Live Day Hour Min Sec Cooldown Blocks */}
                            <div className="flex items-center justify-center gap-2 py-1">
                              <div className="flex items-center gap-1.5 font-mono">
                                <div className="px-3 py-2 rounded-xl bg-slate-950/90 border border-amber-500/40 text-center min-w-[50px] shadow-inner">
                                  <span className="block text-base font-black text-amber-300">{cd.days}</span>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Day</span>
                                </div>
                                <span className="font-bold text-amber-400 text-sm">:</span>
                                <div className="px-3 py-2 rounded-xl bg-slate-950/90 border border-amber-500/40 text-center min-w-[50px] shadow-inner">
                                  <span className="block text-base font-black text-amber-300">{String(cd.hours).padStart(2, '0')}</span>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Hour</span>
                                </div>
                                <span className="font-bold text-amber-400 text-sm">:</span>
                                <div className="px-3 py-2 rounded-xl bg-slate-950/90 border border-amber-500/40 text-center min-w-[50px] shadow-inner">
                                  <span className="block text-base font-black text-amber-300">{String(cd.minutes).padStart(2, '0')}</span>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Min</span>
                                </div>
                                <span className="font-bold text-amber-400 text-sm">:</span>
                                <div className="px-3 py-2 rounded-xl bg-slate-950/90 border border-amber-500/40 text-center min-w-[50px] shadow-inner">
                                  <span className="block text-base font-black text-amber-300">{String(cd.seconds).padStart(2, '0')}</span>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Sec</span>
                                </div>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-300">
                              ⚡ <b>Host ke bina bhi chalega:</b> Time aane par test <b>automatically start</b> ho jayega aur questions auto-advance honge!
                            </p>
                          </div>
                        );
                      })()}

                      {isHost ? (
                        <div className="space-y-4 w-full max-w-3xl mx-auto pt-2 text-left">
                          <div className="rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 p-4 sm:p-5 shadow-xl">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">Assessment builder · Step 02</p>
                                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">Exam question set tayyar karein</h4>
                                <p className="text-xs text-slate-400 mt-1">Mode aur syllabus chunein, phir questions ko set karke test launch ya schedule karein.</p>
                              </div>
                              <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-right">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Room</p>
                                <p className="max-w-48 truncate text-xs font-black text-slate-100">{currentRoom.name}</p>
                              </div>
                            </div>
                            <StudyRoomSetupProgress currentStep={2} />
                          </div>

                          {/* ── COMPACT SETUP CONTROLLER TILES (2-Column Grid on all screens: Drawer System) ── */}
                          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                            {/* 1. Assessment Mode Tile */}
                            <button
                              type="button"
                              onClick={() => setActiveSetupDrawer('ASSESSMENT_MODE')}
                              className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-400/60 transition cursor-pointer text-left flex flex-col justify-between gap-2 shadow-md active:scale-[0.98]"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${
                                  currentRoom.mcqType === 'REVISION_HUB'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}>
                                  {currentRoom.mcqType === 'REVISION_HUB' ? '⚡' : '🎯'}
                                </div>
                                <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-cyan-300">
                                  <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">Badlein</span>
                                  <ChevronRight size={13} />
                                </div>
                              </div>
                              <div className="min-w-0 w-full">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Assessment Mode</span>
                                <p className="text-xs font-black text-white truncate mt-0.5">
                                  {currentRoom.mcqType === 'REVISION_HUB' ? '⚡ MCQ + Mode (100 Qs)' : '🎯 MCQ Mode (Variable)'}
                                </p>
                                <p className="text-[10px] text-cyan-400/90 truncate mt-0.5">
                                  {currentRoom.mcqType === 'REVISION_HUB' ? '1 Lesson • Revision Hub Result' : 'Multi-Subject & Multi-Lesson'}
                                </p>
                              </div>
                            </button>

                            {/* 2. Section Chunein Tile */}
                            <button
                              type="button"
                              onClick={() => setActiveSetupDrawer('SECTION')}
                              className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-400/60 transition cursor-pointer text-left flex flex-col justify-between gap-2 shadow-md active:scale-[0.98]"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${
                                  battleDomain === 'COMPETITION'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                }`}>
                                  {battleDomain === 'COMPETITION' ? '🏆' : '📚'}
                                </div>
                                <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-amber-300">
                                  <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">Badlein</span>
                                  <ChevronRight size={13} />
                                </div>
                              </div>
                              <div className="min-w-0 w-full">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Section Chunein</span>
                                <p className="text-xs font-black text-white truncate mt-0.5">
                                  {battleDomain === 'COMPETITION' ? '🏆 Competition' : '📚 Academic'}
                                </p>
                                <p className="text-[10px] text-amber-400/90 truncate mt-0.5">
                                  {battleDomain === 'COMPETITION' ? 'Exam Books' : 'Class 6-12 Notes'}
                                </p>
                              </div>
                            </button>

                            {/* 3. Class Chunein OR Competition Book Tile */}
                            {battleDomain === 'ACADEMIC' ? (
                              <button
                                type="button"
                                onClick={() => setActiveSetupDrawer('CLASS')}
                                className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-purple-400/60 transition cursor-pointer text-left flex flex-col justify-between gap-2 shadow-md active:scale-[0.98]"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-base shrink-0">
                                    🏫
                                  </div>
                                  <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-purple-300">
                                    <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">Chunein</span>
                                    <ChevronRight size={13} />
                                  </div>
                                </div>
                                <div className="min-w-0 w-full">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Class Chunein</span>
                                  <p className="text-xs font-black text-white truncate mt-0.5">
                                    {battleClass === 'ALL' ? 'Sabhi Classes' : `Class ${battleClass}`}
                                  </p>
                                  <p className="text-[10px] text-purple-300 truncate mt-0.5">
                                    {battleSubject === 'ALL' ? 'All Subjects' : battleSubject}
                                  </p>
                                </div>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveSetupDrawer('COMPETITION_BOOK')}
                                className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-400/60 transition cursor-pointer text-left flex flex-col justify-between gap-2 shadow-md active:scale-[0.98]"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-base shrink-0">
                                    📖
                                  </div>
                                  <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-amber-300">
                                    <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">Chunein</span>
                                    <ChevronRight size={13} />
                                  </div>
                                </div>
                                <div className="min-w-0 w-full">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Book Chunein</span>
                                  <p className="text-xs font-black text-white truncate mt-0.5">
                                    {currentRoom.mcqType === 'REVISION_HUB'
                                      ? (battleSubject === 'ALL' ? 'Lucent GK' : `Lucent: ${battleSubject}`)
                                      : (allCompetitionBooks.find((b) => b.id === battleBook)?.name || 'Sabhi Books')}
                                  </p>
                                  <p className="text-[10px] text-amber-400 truncate mt-0.5">
                                    {currentRoom.mcqType === 'REVISION_HUB' ? 'Revision Hub' : `${allCompetitionBooks.length} Books`}
                                  </p>
                                </div>
                              </button>
                            )}

                            {/* 4. Lesson Chunein Tile */}
                            <button
                              type="button"
                              onClick={() => setActiveSetupDrawer('LESSONS')}
                              className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-emerald-400/60 transition cursor-pointer text-left flex flex-col justify-between gap-2 shadow-md active:scale-[0.98]"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-base shrink-0">
                                  📋
                                </div>
                                <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-emerald-300">
                                  <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">Kholein</span>
                                  <ChevronRight size={13} />
                                </div>
                              </div>
                              <div className="min-w-0 w-full">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Lesson Chunein</span>
                                <p className="text-xs font-black text-white truncate mt-0.5">
                                  {currentRoom.mcqType === 'REVISION_HUB'
                                    ? (availableBattleSets.find((s) => s.id === selectedCuratedSet)?.name || (availableBattleSets[0]?.name || '1 Lesson (Fixed 100 Qs)'))
                                    : (selectedCuratedSets.length > 0
                                        ? `⭐ ${selectedCuratedSets.length} Lessons`
                                        : (availableBattleSets.find((s) => s.id === selectedCuratedSet)?.name || 'Lesson Chunein'))}
                                </p>
                                <p className="text-[10px] text-emerald-400 truncate mt-0.5">
                                  {currentRoom.mcqType === 'REVISION_HUB'
                                    ? '⚡ 1 Lesson • 100 Qs Fixed'
                                    : `${availableBattleSets.length} Lessons • Multiple Allowed`}
                                </p>
                              </div>
                            </button>

                            {/* 5. Total Exam Duration Tile (Opens Drawer) */}
                            <button
                              type="button"
                              onClick={() => setActiveSetupDrawer('DURATION')}
                              className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-purple-400/60 transition cursor-pointer text-left flex flex-col justify-between gap-2 shadow-md active:scale-[0.98]"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-base shrink-0">
                                  ⏱️
                                </div>
                                <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-purple-300">
                                  <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">Badlein</span>
                                  <ChevronRight size={13} />
                                </div>
                              </div>
                              <div className="min-w-0 w-full">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Total Exam Time</span>
                                <p className="text-xs font-black text-purple-300 truncate mt-0.5">
                                  ⏱️ {totalTestMinutes} Minutes
                                </p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  Time Limit Set Karein
                                </p>
                              </div>
                            </button>

                            {/* 6. Question Limits & Order Tile (Opens Drawer) */}
                            <button
                              type="button"
                              onClick={() => setActiveSetupDrawer('QUESTION_LIMITS')}
                              className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-400/60 transition cursor-pointer text-left flex flex-col justify-between gap-2 shadow-md active:scale-[0.98]"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-base shrink-0">
                                  🎛️
                                </div>
                                <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-amber-300">
                                  <span className="text-[9px] font-bold text-slate-500 hidden sm:inline">Settings</span>
                                  <ChevronRight size={13} />
                                </div>
                              </div>
                              <div className="min-w-0 w-full">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Question Limits & Order</span>
                                <p className="text-xs font-black text-amber-300 truncate mt-0.5">
                                  {currentRoom.mcqType === 'REVISION_HUB'
                                    ? '100 Questions (Fixed)'
                                    : (limitMode === 'ALL'
                                      ? 'Sabhi Questions (Variable)'
                                      : limitMode === 'PER_LESSON'
                                      ? `${questionsPerLessonLimit}/Lesson`
                                      : limitMode === 'PER_SUBJECT'
                                      ? `${questionsPerSubjectLimit}/Subject`
                                      : `Total ${totalQuestionsLimit} Qs`)}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {currentRoom.mcqType === 'REVISION_HUB'
                                    ? '⚡ MCQ+ Fixed 100 Qs'
                                    : (questionOrderMode === 'RANDOM' ? '🎲 Shuffled' : '📋 Sequential')}
                                </p>
                              </div>
                            </button>
                          </div>

                          {/* ── ULTRA USER QUESTION INSPECTOR CARD ── */}
                          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 to-purple-950/40 border border-amber-500/30 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                                  👑 Ultra Question Inspector
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                                  ULTRA VIP
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-300 mt-0.5">
                                {isUltraUser
                                  ? `Sare questions padhein aur tick lagayein (${allAvailableQuestionsForUltra.length - ultraExcludedQuestionKeys.size}/${allAvailableQuestionsForUltra.length} Selected)`
                                  : 'Host sare questions scroll karke padh aur select kar sakta hai (Ultra exclusive)'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isUltraUser) {
                                  setTierFeaturePrompt({
                                    title: '👑 Ultra VIP Power: Direct Question Selector',
                                    description: 'Pura Question Bank dekhkar ek-ek question ko tick ya un-tick karke test banane ki power sirf Ultra VIP users ke paas hai!',
                                    targetTier: 'ULTRA',
                                  });
                                  return;
                                }
                                setShowUltraQuestionInspector(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer shrink-0"
                            >
                              🔍 Sawal Chunein ({allAvailableQuestionsForUltra.length - ultraExcludedQuestionKeys.size})
                            </button>
                          </div>

                          {/* 5. Launch or Schedule Action Section (Last Step after choosing questions) */}
                          <div className="space-y-3.5 p-4 rounded-2xl bg-slate-900/80 border border-indigo-400/20 shadow-lg">
                            {/* Toggle between Launch Now vs Schedule */}
                            <div className="p-1 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() => setLobbyActionTab('LAUNCH')}
                                className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  lobbyActionTab === 'LAUNCH'
                                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                <Play size={13} className="fill-current" />
                                <span>Test abhi launch karein</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isBasicUser && !isUltraUser && !isAdmin) {
                                    alert('Test schedule karne ka option Basic aur Ultra members ke liye hai. Kripya Store se upgrade karein.');
                                    return;
                                  }
                                  setLobbyActionTab('SCHEDULE');
                                }}
                                className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  lobbyActionTab === 'SCHEDULE'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                <Clock size={13} />
                                <span>Test schedule karein</span>
                                {!isBasicUser && !isUltraUser && !isAdmin && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">VIP</span>
                                )}
                              </button>
                            </div>

                            {/* If LAUNCH tab selected */}
                            {lobbyActionTab === 'LAUNCH' && (
                              <button
                                type="button"
                                onClick={handleLaunchCuratedMcq}
                                disabled={availableBattleSets.length === 0}
                                className={`w-full py-3.5 rounded-xl font-black text-sm shadow-xl active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 ${
                                  availableBattleSets.length === 0
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : currentRoom.mcqType === 'REVISION_HUB'
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-900/30'
                                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-900/30'
                                }`}
                              >
                                <Play size={16} className="fill-current" />
                                <span>
                                  🚀 Launch {currentRoom.mcqType === 'REVISION_HUB' ? 'MCQ + Battle' : 'MCQ Battle'} Now ({totalTestMinutes}m Exam)
                                </span>
                              </button>
                            )}

                            {/* If SCHEDULE tab selected */}
                            {lobbyActionTab === 'SCHEDULE' && (
                              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-3 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                                    <Clock size={14} className="text-amber-400" /> Test Shuru Hone Ka Samay Set Karein:
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    24-Hour Format
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Date:</label>
                                    <input
                                      type="date"
                                      required
                                      value={scheduledDate}
                                      min={new Date().toISOString().split('T')[0]}
                                      onChange={(e) => setScheduledDate(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Time:</label>
                                    <input
                                      type="time"
                                      required
                                      value={scheduledTime}
                                      onChange={(e) => setScheduledTime(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                                    />
                                  </div>
                                </div>

                                <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer pt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={autoRunWithoutHost}
                                    onChange={(e) => setAutoRunWithoutHost(e.target.checked)}
                                    className="mt-0.5 rounded text-amber-500 focus:ring-0"
                                  />
                                  <span className="text-[11px] leading-relaxed">
                                    <b>Bina host ke auto-start:</b> Host offline rahe tab bhi samay aane par sabhi online students ke liye test apne aap shuru ho jayega!
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  onClick={handleScheduleCuratedMcq}
                                  disabled={availableBattleSets.length === 0 || isSchedulingTest}
                                  className="w-full py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-xl shadow-amber-900/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                                >
                                  <Clock size={16} />
                                  <span>
                                    {isSchedulingTest ? 'Scheduling...' : `⏰ Confirm & Schedule Test (${scheduledTime} baje)`}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 space-y-4 max-w-lg mx-auto text-left">
                          {/* Waiting Status Banner */}
                          {currentRoom.isScheduled && currentRoom.scheduledStartTime && currentRoom.scheduledStartTime > liveClockNow ? (() => {
                            const cd = formatDayHourMinSec(currentRoom.scheduledStartTime, liveClockNow);
                            return (
                              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2.5">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black animate-pulse">
                                  <Clock size={15} /> ⏰ Scheduled Test Cooldown
                                </div>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                  Yeh room schedule kiya gaya hai. Niche diye gaye countdown ke mutabiq test auto-start hoga:
                                </p>
                                <div className="flex items-center justify-center gap-1 font-mono text-center py-1">
                                  <div className="flex-1 max-w-[60px] py-1.5 px-1 rounded-xl bg-slate-950 border border-amber-500/30">
                                    <span className="block text-sm font-black text-amber-300">{cd.days}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Day</span>
                                  </div>
                                  <span className="text-amber-400 font-bold text-sm">:</span>
                                  <div className="flex-1 max-w-[60px] py-1.5 px-1 rounded-xl bg-slate-950 border border-amber-500/30">
                                    <span className="block text-sm font-black text-amber-300">{String(cd.hours).padStart(2, '0')}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Hour</span>
                                  </div>
                                  <span className="text-amber-400 font-bold text-sm">:</span>
                                  <div className="flex-1 max-w-[60px] py-1.5 px-1 rounded-xl bg-slate-950 border border-amber-500/30">
                                    <span className="block text-sm font-black text-amber-300">{String(cd.minutes).padStart(2, '0')}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Min</span>
                                  </div>
                                  <span className="text-amber-400 font-bold text-sm">:</span>
                                  <div className="flex-1 max-w-[60px] py-1.5 px-1 rounded-xl bg-slate-950 border border-amber-500/30">
                                    <span className="block text-sm font-black text-amber-300">{String(cd.seconds).padStart(2, '0')}</span>
                                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Sec</span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  ⚡ Test samay aane par bina kisi delay ke automatically shuru ho jayega!
                                </p>
                              </div>
                            );
                          })() : (!currentRoom.liveMcq?.questions || currentRoom.liveMcq.questions.length === 0) ? (
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 text-center space-y-3 shadow-lg">
                              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black animate-pulse">
                                <Clock size={15} className="animate-spin text-amber-400" />
                                <span>Host Sawal Select Kar Rahe Hain...</span>
                              </div>
                              <h4 className="text-sm font-black text-white">Room Active Hai — Aap Waiting Room Me Hain</h4>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
                                Aap password enter karke safaltapoorvak room me join ho chuke hain! Host abhi is test ke liye questions chun rahe hain. Jaise hi Host test start karenge, aapka test screen par bina kisi delay ke turant shuru ho jayega!
                              </p>
                              <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 py-1.5 px-3 rounded-xl max-w-xs mx-auto">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <span>Waiting for Host to Launch Test</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black animate-pulse">
                                <Clock size={15} /> Host Ke Shuru Karne Ka Intezar Karein...
                              </div>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                Aap Study Room me safaltapoorvak jud chuke hain ({currentRoom.liveMcq.questions.length} sawal ready hain). Jaise hi Host session shuru karenge, pehla sawal aapke screen par turant aa jayega!
                              </p>
                            </div>
                          )}

                          {/* Kitne User Aaye Hain (Count Banner) */}
                          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
                                <Users size={18} />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white">
                                  Room Me Kul {Object.keys(currentRoom.members || {}).length} Vidhyarthi Online Hain
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  Sabhi participants live arena me jud chuke hain
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(currentRoom.code || '');
                                alert(`Room Code ${currentRoom.code} copy ho gaya! Doston ko bulayein.`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Copy size={12} /> Code: {currentRoom.code}
                            </button>
                          </div>

                          {/* Kon Kon Aaye Hain (Members List) */}
                          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                                <UserCheck size={14} className="text-emerald-400" />
                                Kon Kon Aaye Hain ({Object.keys(currentRoom.members || {}).length})
                              </span>
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Connected
                              </span>
                            </div>

                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {Object.values(currentRoom.members || {}).map((m, idx) => {
                                const isSelf = m.id === user?.id;
                                const isMemberHost = m.id === currentRoom.hostId || m.isHost;

                                return (
                                  <div
                                    key={m.id || `m_${idx}`}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                                      isSelf
                                        ? 'bg-indigo-950/40 border-indigo-500/40'
                                        : 'bg-slate-800/60 border-slate-700/60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs text-white shrink-0 overflow-hidden">
                                        {m.photoURL ? (
                                          <img src={m.photoURL} alt={m.name} className="w-full h-full object-cover" />
                                        ) : (
                                          (m.name || 'S').charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-200 truncate text-xs flex items-center gap-1.5">
                                          <span>{m.name || 'Student'}</span>
                                          {isSelf && (
                                            <span className="text-[10px] text-indigo-400 font-black">(Aap)</span>
                                          )}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] border border-amber-500/30">
                                            Lvl {m.level || 1}
                                          </span>
                                          <span className="text-[10px] text-indigo-300 font-semibold">
                                            ⭐ {m.xp ?? m.totalXp ?? 0} XP
                                          </span>
                                          {(m.roomXp || 0) > 0 && (
                                            <span className="text-[9px] text-emerald-400 font-bold">
                                              +{m.roomXp}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-1.5">
                                      {isMemberHost ? (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/30">
                                          👑 Host
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-700/70 text-slate-300 font-bold text-[10px]">
                                          Online
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Battle State: QUESTION or REVEAL */}
                    {currentRoom.liveMcq?.isActive &&
                    (currentRoom.liveMcq.status === 'QUESTION' || currentRoom.liveMcq.status === 'REVEAL') &&
                    (() => {
                      const isSelfPaced = currentRoom.liveMcq!.timerMode === 'TOTAL_TEST' || currentRoom.liveMcq!.timerMode === 'MIX';
                      const totalQuestions = currentRoom.liveMcq!.totalQuestions || currentRoom.liveMcq!.questions?.length || 1;
                      const qIdx = Math.max(0, Math.min(studentActiveQIndex, totalQuestions - 1));
                      const q = currentRoom.liveMcq!.questions[qIdx];
                      if (!q) return null;
                      const savedMyScore = user?.id ? currentRoom.liveMcq!.scores?.[user.id] : undefined;
                      const hasSubmittedThisTest = hasStudentSubmittedEarly || Boolean(savedMyScore?.submittedAt);

                      const isReveal = currentRoom.liveMcq!.status === 'REVEAL';
                      const isProjector = currentRoom.mcqType === 'PROJECTOR_MODE';
                      const isRevision = currentRoom.mcqType === 'REVISION_HUB';
                      const duration = currentRoom.liveMcq!.durationPerQuestion || 20;

                      const currentQAnswers = currentRoom.liveMcq!.questionAnswers?.[qIdx] || {};
                      const roomMembers = Object.values(currentRoom.members || {});
                      const answeredCount = Object.keys(currentQAnswers).length;
                      const totalMembersCount = Math.max(roomMembers.length, 1);

                      const totalMinutesRem = Math.floor(totalTestSecondsLeft / 60);
                      const totalSecsRem = totalTestSecondsLeft % 60;
                      const formattedExamTime = `${String(totalMinutesRem).padStart(2, '0')}:${String(totalSecsRem).padStart(2, '0')}`;
                      const answeredQuestionsCount = Object.keys(localBattleStats.answers).length;
                      const activeSelectedOption = localBattleStats.answers[qIdx]?.selectedOption ?? (qIdx === studentActiveQIndex ? selectedOption : null);

                      return (
                        <div
                          className={`flex-1 flex flex-col justify-between space-y-3.5 ${
                            isProjector ? 'p-2 sm:p-4 rounded-3xl bg-slate-950 border-2 border-cyan-500/40' : ''
                          }`}
                        >
                          {/* ── EARLY SUBMITTED STATE: Waiting for Room Timer to Complete ── */}
                          {hasSubmittedThisTest && !currentRoom.isExpired && totalTestSecondsLeft > 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 rounded-3xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl animate-in zoom-in-95 duration-200">
                              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center text-3xl shadow-lg">
                                <CheckCircle2 size={36} className="text-emerald-400 animate-pulse" />
                              </div>

                              <div className="space-y-1">
                                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                                  Test Submitted Successfully
                                </span>
                                <h3 className="text-xl sm:text-2xl font-black text-white pt-1">
                                  Aapka Result Tayyar Hai!
                                </h3>
                                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                                  Aapka score abhi dekh sakte hain. Room ka samay pura hone par sabhi participants ki final rank aur leaderboard bhi dikhegi.
                                </p>
                              </div>

                              {/* Show this student's score immediately; the room leaderboard remains live until the test ends. */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
                                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                                  <span className="block text-[10px] font-bold text-slate-400">Score</span>
                                  <span className="text-lg font-black text-amber-400">
                                    {savedMyScore?.score ?? localBattleStats.score} pts
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                                  <span className="block text-[10px] font-bold text-slate-400">Sahi</span>
                                  <span className="text-lg font-black text-emerald-400">
                                    {savedMyScore?.correctCount ?? localBattleStats.correctCount}
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                                  <span className="block text-[10px] font-bold text-slate-400">Galat</span>
                                  <span className="text-lg font-black text-rose-400">
                                    {savedMyScore?.wrongCount ?? localBattleStats.wrongCount}
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                                  <span className="block text-[10px] font-bold text-slate-400">Accuracy</span>
                                  <span className="text-lg font-black text-cyan-300">
                                    {Math.round(((savedMyScore?.correctCount ?? localBattleStats.correctCount) / Math.max(totalQuestions, 1)) * 100)}%
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                                  <span className="block text-[10px] font-bold text-slate-400">Kul Attempt</span>
                                  <span className="text-lg font-black text-indigo-300">
                                    {savedMyScore?.totalAnswered ?? localBattleStats.totalAnswered}
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                                  <span className="block text-[10px] font-bold text-slate-400">Bache Sawal</span>
                                  <span className="text-lg font-black text-amber-400">
                                    {Math.max(0, totalQuestions - (savedMyScore?.totalAnswered ?? localBattleStats.totalAnswered))}
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center col-span-2 sm:col-span-3">
                                  <span className="block text-[10px] font-bold text-slate-400">Bacha Samay</span>
                                  <span className="text-lg font-black text-cyan-300 font-mono">
                                    {Math.floor(totalTestSecondsLeft / 60)}:{String(totalTestSecondsLeft % 60).padStart(2, '0')}
                                  </span>
                                </div>
                              </div>

                              {/* Actions while waiting */}
                              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                {isHost && (
                                  <button
                                    type="button"
                                    onClick={handleForceEndBattle}
                                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                                  >
                                    🏁 End Test For All Now
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Progress & Countdown Header */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                  <span className={isProjector ? 'text-sm font-black text-cyan-300' : ''}>
                                    Question {qIdx + 1} of {totalQuestions}
                                    {isRevision && (
                                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-300 border border-purple-500/50">
                                        ⚡ MCQ + Sprint
                                      </span>
                                    )}
                                  </span>

                                  {/* Timer Badge */}
                                  <div className="flex items-center gap-2">
                                    {isSelfPaced ? (
                                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        {/* Overall Exam Timer */}
                                        <span
                                          className={`font-mono font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs shadow-sm ${
                                            totalTestSecondsLeft <= 120
                                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                          }`}
                                        >
                                          <Timer size={14} className={totalTestSecondsLeft <= 120 ? 'text-rose-400' : 'text-emerald-400'} />
                                          <span>Exam: {formattedExamTime}</span>
                                        </span>

                                        {/* Ideal Question Pace Badge (User controls their own pace) */}
                                        <button
                                          type="button"
                                          onClick={() => setShowPaceSettingsModal(true)}
                                          className={`font-mono font-black px-2 py-1 rounded-xl border text-[11px] flex items-center gap-1 transition cursor-pointer select-none active:scale-95 ${
                                            paceSecondsLeft === 0
                                              ? 'bg-purple-600 text-white border-purple-400 animate-bounce shadow-md shadow-purple-500/30'
                                              : 'bg-slate-800/90 hover:bg-slate-700 text-purple-300 border-purple-500/40 hover:border-purple-300'
                                          }`}
                                          title="Ideal Question Pace: Click to change time & vibration alert"
                                        >
                                          <Smartphone size={12} className={paceSecondsLeft === 0 ? 'text-white' : 'text-purple-400'} />
                                          <span>{paceSecondsLeft === 0 ? '📳 Pace Alert!' : `${paceSecondsLeft}s Pace`}</span>
                                          <SlidersHorizontal size={11} className="text-purple-300 opacity-70 ml-0.5" />
                                        </button>

                                        {/* Direct Phone Vibration Alert Toggle (In user's hands) */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextVal = !userVibrateAlert;
                                            setUserVibrateAlert(nextVal);
                                            try {
                                              localStorage.setItem('study_user_vibrate_alert', String(nextVal));
                                              if (nextVal && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                                                navigator.vibrate(60);
                                              }
                                            } catch {}
                                          }}
                                          className={`px-2 py-1 rounded-xl text-[11px] font-black border transition cursor-pointer flex items-center gap-1 select-none active:scale-95 ${
                                            userVibrateAlert
                                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30'
                                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
                                          }`}
                                          title={userVibrateAlert ? 'Vibration Alert is ON (Click to Mute)' : 'Vibration is Muted (Click to turn ON)'}
                                        >
                                          <span>{userVibrateAlert ? '📳 Vibrate ON' : '🔕 Mute'}</span>
                                        </button>

                                        {/* Quick Finish Button */}
                                        <button
                                          type="button"
                                          onClick={() => setShowSubmitConfirmModal(true)}
                                          className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer shadow flex items-center gap-1"
                                        >
                                          <CheckCircle2 size={13} /> Submit Test
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                                          {answeredCount}/{totalMembersCount} Answered
                                        </span>
                                        {isReveal ? (
                                          <span className="font-mono font-black px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 text-xs animate-pulse">
                                            <FastForward size={14} /> Agla Sawal: {revealSecondsLeft}s
                                          </span>
                                        ) : (
                                          <span
                                            className={`font-mono font-black flex items-center gap-1 ${
                                              isProjector
                                                ? 'text-xl sm:text-2xl text-cyan-300'
                                                : mcqSecondsLeft <= 5
                                                ? 'text-rose-400 animate-pulse text-base'
                                                : 'text-amber-400 text-sm'
                                            }`}
                                          >
                                            <Timer size={14} /> {mcqSecondsLeft}s
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Progress Bars */}
                                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                  {isReveal ? (
                                    <div
                                      className="h-full bg-emerald-400 transition-all duration-1000"
                                      style={{
                                        width: `${Math.max(10, ((2 - revealSecondsLeft) / 2) * 100)}%`,
                                      }}
                                    />
                                  ) : isSelfPaced ? (
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
                                      style={{
                                        width: `${Math.min(100, Math.max(5, (answeredQuestionsCount / totalQuestions) * 100))}%`,
                                      }}
                                    />
                                  ) : (
                                    <div
                                      className={`h-full transition-all duration-1000 ${
                                        isProjector
                                          ? 'bg-cyan-400'
                                          : isRevision
                                          ? 'bg-purple-500'
                                          : mcqSecondsLeft <= 5
                                          ? 'bg-rose-500 animate-pulse'
                                          : 'bg-amber-400'
                                      }`}
                                      style={{
                                        width: `${Math.max(0, Math.min(100, (mcqSecondsLeft / duration) * 100))}%`,
                                      }}
                                    />
                                  )}
                                </div>
                              </div>

                              {/* ── QUESTION PALETTE / GRID (OPENS VIA BUTTON, CLOSED BY DEFAULT) ── */}
                              {showQuestionPalette && (
                                <div className="rounded-2xl bg-slate-900/95 border border-indigo-500/50 p-3 space-y-2 shadow-2xl animate-in slide-in-from-top duration-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <LayoutGrid size={14} className="text-indigo-400" />
                                      <span className="text-xs font-black text-white">
                                        Question Palette (Sawal Grid)
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                        Attempted: <b className="text-emerald-400">{answeredQuestionsCount}</b>/{totalQuestions}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 hidden sm:flex">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Done</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Current</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-700" /> Left</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setShowQuestionPalette(false)}
                                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                                        title="Close Grid"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
                                    {currentRoom.liveMcq!.questions.map((_, idx) => {
                                      const isAnswered = localBattleStats.answers[idx] !== undefined;
                                      const isCurrent = qIdx === idx;
                                      return (
                                        <button
                                          key={`q_grid_btn_${idx}`}
                                          type="button"
                                          onClick={() => {
                                            setStudentActiveQIndex(idx);
                                            setPaceSecondsLeft(userPaceSeconds || 20);
                                            setHasPaceAlertTriggered(false);
                                          }}
                                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-black transition flex items-center justify-center cursor-pointer select-none ${
                                            isCurrent
                                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-2 ring-offset-slate-950 scale-105 shadow-md z-10'
                                              : isAnswered
                                              ? 'bg-emerald-600 text-white border border-emerald-400 shadow-sm'
                                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                          }`}
                                        >
                                          {idx + 1}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Mix Mode Alert Banner if pace is reached */}
                              {isSelfPaced && paceSecondsLeft === 0 && (
                                <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-200 animate-in fade-in duration-150">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <Smartphone size={14} className="text-purple-400 animate-pulse" />
                                    <span>
                                      <b>Pace Alert:</b> Is sawal ka ideal time ({userPaceSeconds}s) pura ho gaya! {userVibrateAlert ? '📳 Mobile vibrate hua.' : '🔕 (Muted).'} Agle sawal par switch karein.
                                    </span>
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setShowPaceSettingsModal(true)}
                                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-purple-500/30 text-purple-300 text-[10px] font-black transition cursor-pointer"
                                      title="Change Ideal Question Pace seconds or vibration"
                                    >
                                      ⏱️ Pace ({userPaceSeconds}s)
                                    </button>
                                    {qIdx < totalQuestions - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStudentActiveQIndex(qIdx + 1);
                                          setPaceSecondsLeft(userPaceSeconds || 20);
                                          setHasPaceAlertTriggered(false);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black shrink-0 transition cursor-pointer"
                                      >
                                        Next Q ➡
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* ── SCROLLABLE QUESTION & OPTIONS CONTAINER (Prevents Layout Shifting) ── */}
                              <div className="flex-1 overflow-y-auto px-0.5 py-1 space-y-3.5 max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-300px)]">
                                {/* Question Card */}
                                <div
                                  className={`rounded-2xl p-4 sm:p-5 shadow-xl transition-all ${
                                    isProjector
                                      ? 'bg-slate-900 border border-cyan-500/50'
                                      : 'bg-slate-800/90 border border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        isProjector
                                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      }`}
                                    >
                                      Live MCQ #{qIdx + 1}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      Sahi: <b className="text-emerald-400">+5 XP</b> | Galat: <b className="text-rose-400">-2 XP</b>
                                    </span>
                                  </div>

                                  <div className="mt-1 mb-2">
                                    <McqQuestionDisplay
                                      q={{
                                        ...q,
                                        correctAnswer: (q as any).correctAnswer ?? (q as any).correctIndex ?? 0,
                                      } as any}
                                      variant="dark"
                                      showTypeBadge={true}
                                      questionClassName={
                                        isProjector
                                          ? 'text-lg sm:text-2xl font-black text-cyan-50 leading-relaxed'
                                          : 'text-base sm:text-lg font-bold text-white leading-relaxed'
                                      }
                                    />
                                  </div>
                                </div>

                                {/* Options Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.options.map((opt, optIdx) => {
                                    let btnStyle = isProjector
                                      ? 'bg-slate-900/90 border-slate-700 text-white hover:border-cyan-400 text-base sm:text-lg'
                                      : 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs md:text-sm';

                                    if (activeSelectedOption === optIdx) {
                                      btnStyle = isProjector
                                        ? 'bg-cyan-600/50 border-cyan-400 text-white ring-2 ring-cyan-400'
                                        : 'bg-indigo-600/40 border-indigo-400 text-white ring-2 ring-indigo-400';
                                    }

                                    // Only show answer colors if reveal is active!
                                    if (isReveal) {
                                      if (optIdx === q.correctIndex) {
                                        btnStyle =
                                          'bg-emerald-600/40 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500';
                                      } else if (activeSelectedOption === optIdx && optIdx !== q.correctIndex) {
                                        btnStyle = 'bg-rose-600/40 border-rose-500 text-rose-200';
                                      }
                                    }

                                    return (
                                      <button
                                        key={`battle_opt_${optIdx}`}
                                        onClick={() => handleSelectOption(optIdx)}
                                        disabled={(!isSelfPaced && hasAnsweredCurrentQ) || isReveal}
                                        className={`p-3.5 sm:p-4 rounded-2xl border text-left font-bold flex items-start sm:items-center gap-3 transition active:scale-95 disabled:cursor-not-allowed cursor-pointer ${btnStyle}`}
                                      >
                                        <span
                                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black shrink-0 mt-0.5 sm:mt-0 ${
                                            isProjector
                                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-sm'
                                              : 'bg-slate-950/70 text-slate-300 text-xs'
                                          }`}
                                        >
                                          {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        <span
                                          className="flex-1 leading-snug break-words"
                                          dangerouslySetInnerHTML={{ __html: renderMathInHtml(opt) }}
                                        />
                                        {isReveal && optIdx === q.correctIndex && (
                                          <Check size={18} className="text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Answer Status or Explanation */}
                                {isReveal ? (
                                  <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-200 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <p className="font-black text-sm text-emerald-300 flex items-center gap-1.5">
                                        <CheckCircle2 size={16} /> Sahi Uttar: Option {String.fromCharCode(65 + q.correctIndex)}
                                      </p>
                                      {autoAdvanceEnabled && (
                                        <span className="text-[11px] font-black text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded">
                                          Agla Sawal {revealSecondsLeft}s me 🚀
                                        </span>
                                      )}
                                    </div>
                                    {q.explanation && (
                                      <p className="text-xs text-emerald-300/90 pt-0.5">{q.explanation}</p>
                                    )}
                                  </div>
                                ) : !isSelfPaced && hasAnsweredCurrentQ ? (
                                  <div className="text-center text-xs font-medium text-slate-400">
                                    <span className="text-indigo-300 font-black flex items-center justify-center gap-1.5">
                                      <CheckCircle2 size={15} /> Aapka Uttar Darj Ho Gaya! (Option {selectedOption !== null ? String.fromCharCode(65 + selectedOption) : ''} Chuna) • Timer khatam hote hi agla sawal aayega ({mcqSecondsLeft}s)...
                                    </span>
                                  </div>
                                ) : null}
                              </div>

                              {/* ── FIXED BOTTOM NAVIGATION & ACTION BAR (Never shifts or jumps with MCQ height!) ── */}
                              <div className="sticky bottom-0 z-20 mt-auto pt-3 pb-1 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md flex items-center justify-between gap-2 shadow-2xl">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  {isSelfPaced && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={qIdx === 0}
                                        onClick={() => {
                                          if (qIdx > 0) {
                                            setStudentActiveQIndex(qIdx - 1);
                                            setPaceSecondsLeft(userPaceSeconds || 20);
                                            setHasPaceAlertTriggered(false);
                                          }
                                        }}
                                        className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black text-slate-200 flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm shrink-0"
                                        title="Pichla Sawal"
                                      >
                                        <ChevronLeft size={16} /> <span className="hidden xs:inline">Pichla</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setShowQuestionPalette((prev) => !prev)}
                                        className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
                                          showQuestionPalette
                                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                            : 'bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-500/40'
                                        }`}
                                        title="Sawal Grid kholein ya band karein"
                                      >
                                        <LayoutGrid size={15} />
                                        <span className="hidden sm:inline">Sawal Grid</span>
                                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-[10px] font-black text-white">
                                          {answeredQuestionsCount}/{totalQuestions}
                                        </span>
                                      </button>
                                    </>
                                  )}
                                </div>

                                <span className="text-xs font-bold text-slate-400 hidden md:inline">
                                  Sawal <b className="text-white">{qIdx + 1}</b> / {totalQuestions}
                                </span>

                                <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                                  {/* No manual answer-reveal control: users see the answer only after the timer reveals it. */}
                                  {isHost && isReveal && !isSelfPaced && (
                                    <button
                                      type="button"
                                      onClick={handleNextMcqQuestion}
                                      className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg active:scale-95 transition flex items-center gap-1 cursor-pointer shrink-0"
                                    >
                                      {qIdx + 1 >= totalQuestions ? (
                                        <>Podium 🏆</>
                                      ) : (
                                        <>Sync Next ➡️ ({revealSecondsLeft}s)</>
                                      )}
                                    </button>
                                  )}

                                  {/* Next Question / Submit Test Button */}
                                  {qIdx < totalQuestions - 1 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isSelfPaced) {
                                          void handleNextMcqQuestion();
                                          return;
                                        }
                                        setStudentActiveQIndex(qIdx + 1);
                                        setPaceSecondsLeft(userPaceSeconds || 20);
                                        setHasPaceAlertTriggered(false);
                                      }}
                                      className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-indigo-500 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-xs font-black text-white flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/30 shrink-0"
                                    >
                                      <span>Agla</span> <ChevronRight size={16} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isSelfPaced) {
                                          void handleNextMcqQuestion();
                                          return;
                                        }
                                        setShowSubmitConfirmModal(true);
                                      }}
                                      className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-emerald-500 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-xs font-black text-white flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-600/30 shrink-0"
                                    >
                                      <span>{isSelfPaced ? 'Submit' : 'Finish'}</span> <CheckCircle2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}

                  {/* Battle State: ENDED (Complete Results, Podium & Question-by-Question Review) */}
                  {(currentRoom.liveMcq?.status === 'ENDED' || currentRoom.isExpired) && (() => {
                    const scoreMap = currentRoom.liveMcq?.scores || {};
                    const scores = Object.entries(scoreMap).sort(
                      (a, b) => (b[1].score || 0) - (a[1].score || 0)
                    );
                    const myScore = user?.id
                      ? scoreMap[user.id] || {
                          name: user.name || 'Student',
                          score: localBattleStats.score,
                          correctCount: localBattleStats.correctCount,
                          wrongCount: localBattleStats.wrongCount,
                          totalAnswered: localBattleStats.totalAnswered,
                          userXp: localBattleStats.userXp,
                        }
                      : null;
                    if (user?.id && !scoreMap[user.id]) {
                      scores.push([user.id, myScore!]);
                      scores.sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
                    }
                    const myRank = user?.id ? scores.findIndex(([uid]) => uid === user.id) + 1 : 0;
                    const totalQ = currentRoom.liveMcq?.totalQuestions || currentRoom.liveMcq?.questions?.length || 0;
                    const questions = currentRoom.liveMcq?.questions || [];
                    const allAnswersMap = currentRoom.liveMcq?.questionAnswers || {};

                    const myAccuracy =
                      myScore && totalQ > 0
                        ? Math.round(((myScore.correctCount || 0) / totalQ) * 100)
                        : 0;

                    return (
                      <div className="rounded-2xl bg-slate-900/95 border border-slate-700 p-5 sm:p-6 text-center space-y-6 shadow-2xl overflow-y-auto max-h-[75vh]">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto text-3xl shadow-lg">
                          🏆
                        </div>

                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-white">
                            Live MCQ Battle Final Results & Report
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {currentRoom.name} • {totalQ} Questions Completed • {scores.length} Participants
                            {currentRoom.isExpired && ' • Room Time Expired & Auto-Submitted'}
                          </p>
                        </div>

                        {/* Staggered Syncing Queue Banner */}
                        {isSubmittingBatch && (
                          <div className="p-3.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 text-center space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-xs">
                              <span className="animate-spin text-sm">⏳</span>
                              <span>
                                Sabhi participants ka result queue mein sync ho raha hai... (Aapka Slot: {batchSyncSecondsRemaining}s)
                              </span>
                            </div>
                            <div className="w-full max-w-xs mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-1.5 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.max(15, 100 - batchSyncSecondsRemaining * 8)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400">
                              ⚡ Staggered Zero-Spike Engine: Firebase quota surakshit hai aur load evenly divide ho chuka hai.
                            </p>
                          </div>
                        )}

                        {/* Podium Top 3 */}
                        <div className="flex items-end justify-center gap-3 pt-2">
                          {scores[1] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-slate-300 truncate max-w-[85px]">
                                {scores[1][1].name}
                              </span>
                              <span className="text-[10px] text-amber-400 font-bold">{scores[1][1].score} pts</span>
                              <div className="w-20 sm:w-24 h-20 rounded-t-2xl bg-slate-700 flex flex-col items-center justify-center font-black text-slate-300 mt-1 shadow">
                                <span className="text-lg">🥈</span>
                                <span className="text-xs">2nd</span>
                              </div>
                            </div>
                          )}
                          {scores[0] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-amber-300 truncate max-w-[95px]">
                                👑 {scores[0][1].name}
                              </span>
                              <span className="text-[11px] text-amber-400 font-black">{scores[0][1].score} pts</span>
                              <div className="w-24 sm:w-28 h-28 rounded-t-2xl bg-gradient-to-t from-amber-600/40 to-amber-500/40 border-2 border-amber-400 flex flex-col items-center justify-center font-black text-amber-300 mt-1 shadow-xl">
                                <span className="text-2xl">🥇</span>
                                <span className="text-sm">1st Place</span>
                              </div>
                            </div>
                          )}
                          {scores[2] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-slate-300 truncate max-w-[85px]">
                                {scores[2][1].name}
                              </span>
                              <span className="text-[10px] text-amber-400 font-bold">{scores[2][1].score} pts</span>
                              <div className="w-20 sm:w-24 h-16 rounded-t-2xl bg-amber-900/40 flex flex-col items-center justify-center font-black text-amber-500 mt-1 shadow">
                                <span className="text-lg">🥉</span>
                                <span className="text-xs">3rd</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Personal Performance Scorecard */}
                        {myScore && (
                          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 max-w-xl mx-auto text-left space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                                <Medal size={14} className="text-amber-400" /> Aapka Performance Card
                              </h4>
                              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Rank #{myRank || 1} • {myScore.score || 0} Points
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <span className="block text-[10px] text-slate-400 font-bold">Sahi (+5 XP)</span>
                                <span className="text-base font-black text-emerald-400">
                                  {myScore.correctCount || 0}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <span className="block text-[10px] text-slate-400 font-bold">Galat (-2 XP)</span>
                                <span className="text-base font-black text-rose-400">
                                  {myScore.wrongCount || 0}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <span className="block text-[10px] text-slate-400 font-bold">Accuracy</span>
                                <span className="text-base font-black text-cyan-400">
                                  {myAccuracy}%
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40">
                                <span className="block text-[10px] text-indigo-300 font-bold">Room XP</span>
                                <span className="text-base font-black text-white">
                                  +{myScore.userXp || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── REVISION HUB STYLE TOPIC ANALYSIS (Weak vs Strong Topics Analysis) ── */}
                        {(() => {
                          const topicStatsMap: Record<string, { total: number; correct: number; percent: number }> = {};
                          questions.forEach((q, qIdx) => {
                            const topicKey = (q as any).topic || (q as any).chapterTitle || (q as any).chapter || currentRoom.subject || 'General';
                            if (!topicStatsMap[topicKey]) {
                              topicStatsMap[topicKey] = { total: 0, correct: 0, percent: 0 };
                            }
                            topicStatsMap[topicKey].total++;
                            const qAnswers = allAnswersMap[qIdx] || {};
                            const myAns = user?.id ? qAnswers[user.id] : null;
                            if (myAns && myAns.isCorrect) {
                              topicStatsMap[topicKey].correct++;
                            }
                          });

                          Object.keys(topicStatsMap).forEach((k) => {
                            const itm = topicStatsMap[k];
                            itm.percent = itm.total > 0 ? Math.round((itm.correct / itm.total) * 100) : 0;
                          });

                          const topicEntries = Object.entries(topicStatsMap);
                          if (topicEntries.length === 0) return null;

                          const strongTopics = topicEntries.filter(([_, s]) => s.percent >= 70);
                          const averageTopics = topicEntries.filter(([_, s]) => s.percent >= 40 && s.percent < 70);
                          const weakTopics = topicEntries.filter(([_, s]) => s.percent < 40);

                          const isRevisionHubRoom = currentRoom.mcqType === 'REVISION_HUB';

                          return (
                            <div className="bg-slate-800/90 border border-purple-500/30 rounded-2xl p-4 max-w-xl mx-auto text-left space-y-3.5 shadow-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-black border border-purple-500/30">
                                    {isRevisionHubRoom ? '⚡' : '📊'}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                                      {isRevisionHubRoom ? '⚡ Revision Hub Topic Analysis' : '📊 Topic-Wise Mastery Report'}
                                    </h4>
                                    <p className="text-[10px] text-slate-400">
                                      Aapka kon sa topic majboot hai aur kon sa kamzor
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  weakTopics.length > 0
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}>
                                  {weakTopics.length > 0 ? `⚠️ ${weakTopics.length} Kamzor Topic` : '🌟 Sabhi Topics Majboot'}
                                </span>
                              </div>

                              {/* Donut / Badge Summary Row */}
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setTopicFilterTab(topicFilterTab === 'STRONG' ? 'ALL' : 'STRONG')}
                                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                                    topicFilterTab === 'STRONG'
                                      ? 'bg-emerald-600/30 border-emerald-400 ring-2 ring-emerald-400'
                                      : 'bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-900/30'
                                  }`}
                                >
                                  <span className="block text-[10px] font-bold text-emerald-400">🟢 Majboot (Strong)</span>
                                  <span className="text-sm font-black text-white">{strongTopics.length} Topics</span>
                                </button>
                                <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
                                  <span className="block text-[10px] font-bold text-amber-400">🟠 Madhyam (Average)</span>
                                  <span className="text-sm font-black text-white">{averageTopics.length} Topics</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setTopicFilterTab(topicFilterTab === 'WEAK' ? 'ALL' : 'WEAK')}
                                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                                    topicFilterTab === 'WEAK'
                                      ? 'bg-rose-600/30 border-rose-400 ring-2 ring-rose-400'
                                      : 'bg-rose-950/40 border-rose-500/30 hover:bg-rose-900/30'
                                  }`}
                                >
                                  <span className="block text-[10px] font-bold text-rose-400">🔴 Kamzor (Weak)</span>
                                  <span className="text-sm font-black text-white">{weakTopics.length} Topics</span>
                                </button>
                              </div>

                              {/* Interactive Filter Pills */}
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setTopicFilterTab('ALL')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                    topicFilterTab === 'ALL'
                                      ? 'bg-purple-600 text-white shadow'
                                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                  }`}
                                >
                                  Sabhi Topics ({topicEntries.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTopicFilterTab('WEAK')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                    topicFilterTab === 'WEAK'
                                      ? 'bg-rose-600 text-white shadow'
                                      : 'bg-slate-900 text-rose-400 hover:bg-slate-800'
                                  }`}
                                >
                                  🔴 Kamzor Topics ({weakTopics.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTopicFilterTab('STRONG')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                    topicFilterTab === 'STRONG'
                                      ? 'bg-emerald-600 text-white shadow'
                                      : 'bg-slate-900 text-emerald-400 hover:bg-slate-800'
                                  }`}
                                >
                                  🟢 Majboot Topics ({strongTopics.length})
                                </button>
                              </div>

                              {/* Topic Breakdown Progress Bars */}
                              {(() => {
                                const displayed = topicFilterTab === 'WEAK'
                                  ? weakTopics
                                  : topicFilterTab === 'STRONG'
                                  ? strongTopics
                                  : topicEntries;

                                return (
                                  <div className="space-y-2 pt-1 max-h-60 overflow-y-auto pr-1">
                                    {displayed.length === 0 ? (
                                      <p className="text-center py-4 text-xs text-slate-400">
                                        Is category me koi topic nahi mila.
                                      </p>
                                    ) : (
                                      displayed.map(([tName, tStat], tIdx) => {
                                        const isWeak = tStat.percent < 40;
                                        const isStrong = tStat.percent >= 70;
                                        return (
                                          <div
                                            key={`t_stat_${tIdx}`}
                                            className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition ${
                                              isWeak
                                                ? 'bg-rose-950/25 border-rose-500/40 ring-1 ring-rose-500/20'
                                                : isStrong
                                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                                : 'bg-slate-900/60 border-slate-800'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-sm">
                                                  {isWeak ? '🔴' : isStrong ? '🟢' : '🟠'}
                                                </span>
                                                <span className="font-bold text-slate-200 truncate">
                                                  {tName}
                                                </span>
                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                                  isWeak
                                                    ? 'bg-rose-500/30 text-rose-300'
                                                    : isStrong
                                                    ? 'bg-emerald-500/30 text-emerald-300'
                                                    : 'bg-amber-500/30 text-amber-300'
                                                }`}>
                                                  {isWeak ? 'Kamzor (Weak)' : isStrong ? 'Majboot (Strong)' : 'Average'}
                                                </span>
                                              </div>
                                              <span className="font-black text-white text-xs shrink-0">
                                                {tStat.correct}/{tStat.total} ({tStat.percent}%)
                                              </span>
                                            </div>

                                            {/* Visual Progress Track */}
                                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                  isWeak ? 'bg-rose-500' : isStrong ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`}
                                                style={{ width: `${tStat.percent}%` }}
                                              />
                                            </div>

                                            {/* Revision Hub Recommendation Note */}
                                            {isWeak && (
                                              <p className="text-[10px] text-rose-300/90 leading-tight">
                                                ⚠️ <b>Sudhar ki zaroorat:</b> Is topic ke basic concepts aur short notes ko Revision Hub me dubara padhein!
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Button to Open Full Revision Hub Marksheet Card */}
                              <button
                                type="button"
                                onClick={() => setShowDetailedMarksheet(true)}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer mt-2"
                              >
                                <span>📑</span>
                                <span>Revision Hub Pura Marksheet Card Kholein (Solutions, Weak Topics & Audio)</span>
                              </button>
                            </div>
                          );
                        })()}

                        {/* Full Participants Leaderboard Table */}
                        <div className="max-w-xl mx-auto text-left space-y-2">
                          <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                            <Trophy size={14} className="text-amber-400" /> Sabhi Participants Ka Final Result
                          </h4>
                          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                            <div className="grid grid-cols-12 gap-1 p-2 bg-slate-900 text-[10px] font-black text-slate-400 uppercase">
                              <div className="col-span-2">Rank</div>
                              <div className="col-span-5">Student</div>
                              <div className="col-span-2 text-center">Sahi</div>
                              <div className="col-span-3 text-right">Points / XP</div>
                            </div>
                            <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                              {scores.map(([uid, data], idx) => {
                                const isCurrentUser = uid === user?.id;
                                return (
                                  <div
                                    key={uid ? `score_${uid}_${idx}` : `score_${idx}`}
                                    className={`grid grid-cols-12 gap-1 p-2 text-xs items-center ${
                                      isCurrentUser ? 'bg-indigo-950/40 font-black text-white' : 'text-slate-300'
                                    }`}
                                  >
                                    <div className="col-span-2 font-black">
                                      {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                                    </div>
                                    <div className="col-span-5 truncate flex items-center gap-1.5">
                                      <span className="truncate">{data.name}</span>
                                      {isCurrentUser && <span className="text-[9px] text-indigo-400 font-bold">(Aap)</span>}
                                    </div>
                                    <div className="col-span-2 text-center font-bold text-emerald-400">
                                      {data.correctCount || 0}/{totalQ}
                                    </div>
                                    <div className="col-span-3 text-right font-black text-amber-400">
                                      {data.score} pts
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* ── QUESTION-BY-QUESTION DEEP REVIEW (Har Ek Sawal Ka Vishleshan: Kon Sahi Hua Kon Galat) ── */}
                        {questions.length > 0 && (
                          <div className="max-w-xl mx-auto text-left space-y-3 pt-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                                <BookOpen size={14} className="text-emerald-400" /> Har Ek Sawal Ka Full Analysis & Answers
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setReviewFilter('ALL')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    reviewFilter === 'ALL'
                                      ? 'bg-indigo-600 text-white shadow'
                                      : 'bg-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  Sabhi ({questions.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewFilter('CORRECT')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    reviewFilter === 'CORRECT'
                                      ? 'bg-emerald-600 text-white shadow'
                                      : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                                  }`}
                                >
                                  ✅ Sahi ({myScore?.correctCount || 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewFilter('WRONG')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    reviewFilter === 'WRONG'
                                      ? 'bg-rose-600 text-white shadow'
                                      : 'bg-slate-800 text-slate-400 hover:text-rose-400'
                                  }`}
                                >
                                  ❌ Galat ({myScore?.wrongCount || 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewFilter('UNANSWERED')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    reviewFilter === 'UNANSWERED'
                                      ? 'bg-amber-600 text-white shadow'
                                      : 'bg-slate-800 text-slate-400 hover:text-amber-400'
                                  }`}
                                >
                                  ⚪ Attempt Nahi ({Math.max(0, totalQ - (myScore?.correctCount || 0) - (myScore?.wrongCount || 0))})
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                              {questions
                                .map((q, idx) => ({ questionItem: q, qIndex: idx }))
                                .filter(({ qIndex }) => {
                                  const ans = allAnswersMap[qIndex]?.[user?.id || ''];
                                  if (reviewFilter === 'CORRECT') return ans?.isCorrect === true;
                                  if (reviewFilter === 'WRONG') return ans && ans.isCorrect === false;
                                  if (reviewFilter === 'UNANSWERED') return !ans;
                                  return true;
                                })
                                .map(({ questionItem, qIndex }) => {
                                const qAnswers = allAnswersMap[qIndex] || {};
                                const myAnswer = user?.id ? qAnswers[user.id] : null;
                                const isExpanded = selectedReviewQIdx === qIndex;

                                const correctCountInRoom = Object.values(qAnswers).filter((a) => a.isCorrect).length;
                                const totalAnsweredInRoom = Object.keys(qAnswers).length;

                                return (
                                  <div
                                    key={`rev_q_${qIndex}`}
                                    className="p-3 rounded-xl border border-slate-800 bg-slate-800/60 space-y-2"
                                  >
                                    <div
                                      onClick={() => setSelectedReviewQIdx(isExpanded ? null : qIndex)}
                                      className="flex items-start justify-between gap-2 cursor-pointer"
                                    >
                                      <div className="flex items-start gap-2 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                          {qIndex + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-white line-clamp-2">
                                            {questionItem.question}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                                            {myAnswer ? (
                                              myAnswer.isCorrect ? (
                                                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                                  <CheckCircle2 size={11} /> Aapka Sahi (⚡ {myAnswer.timeTakenSec.toFixed(1)}s)
                                                </span>
                                              ) : (
                                                <span className="text-rose-400 font-bold flex items-center gap-0.5">
                                                  <XCircle size={11} /> Aapka Galat (⚡ {myAnswer.timeTakenSec.toFixed(1)}s)
                                                </span>
                                              )
                                            ) : (
                                              <span className="text-slate-400">
                                                Aapne attempt nahi kiya
                                              </span>
                                            )}
                                            <span className="text-slate-500">•</span>
                                            <span className="text-slate-400">
                                              Room me {correctCountInRoom}/{Math.max(totalAnsweredInRoom, 1)} ne sahi kiya
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <span className="text-[10px] font-bold text-indigo-400 shrink-0 mt-1">
                                        {isExpanded ? 'Chhupayein' : 'Dekhein'}
                                      </span>
                                    </div>

                                    {/* Expanded Detail View of Question */}
                                    {isExpanded && (
                                      <div className="pt-2 border-t border-slate-700/60 space-y-2 text-xs">
                                        <div className="mb-2">
                                          <McqQuestionDisplay
                                            q={{
                                              ...questionItem,
                                              correctAnswer: (questionItem as any).correctAnswer ?? (questionItem as any).correctIndex ?? 0,
                                            } as any}
                                            variant="dark"
                                            showTypeBadge={true}
                                            questionClassName="text-xs sm:text-sm font-bold text-white leading-relaxed"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          {questionItem.options.map((optText, optI) => {
                                            const isCorrectOpt = optI === questionItem.correctIndex;
                                            const wasSelectedByMe = myAnswer && myAnswer.selectedOption === optI;

                                            return (
                                              <div
                                                key={`rev_opt_${optI}`}
                                                className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between ${
                                                  isCorrectOpt
                                                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                                    : wasSelectedByMe
                                                    ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                                                    : 'bg-slate-900/60 text-slate-400'
                                                }`}
                                              >
                                                <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                                                  <span className="w-5 h-5 rounded bg-slate-950/60 text-[10px] flex items-center justify-center font-black shrink-0 mt-0.5 sm:mt-0">
                                                    {String.fromCharCode(65 + optI)}
                                                  </span>
                                                  <span
                                                    className="break-words leading-relaxed flex-1"
                                                    dangerouslySetInnerHTML={{ __html: renderMathInHtml(optText) }}
                                                  />
                                                </div>
                                                <div className="text-[10px] font-black flex items-center gap-1">
                                                  {isCorrectOpt && (
                                                    <span className="text-emerald-400 flex items-center gap-0.5">
                                                      <Check size={12} /> Sahi Uttar
                                                    </span>
                                                  )}
                                                  {wasSelectedByMe && !isCorrectOpt && (
                                                    <span className="text-rose-400 flex items-center gap-0.5">
                                                      <X size={12} /> Aapka Chuna Uttar
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {questionItem.explanation && (
                                          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-[11px] leading-relaxed">
                                            <b>Vishleshan (Explanation):</b> {questionItem.explanation}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Host can start next session in same room; Students see persistence note */}
                        <div className="pt-3 flex flex-col items-center justify-center gap-3">
                          {isHost ? (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await resetLiveMcqToWaiting(currentRoom.id, currentRoom.durationMinutes);
                                }}
                                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-900/30"
                              >
                                <Play size={14} className="fill-current" /> Agla / Naya MCQ Lesson Shuru Karein (Isi Room Me)
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveTab('CHAT')}
                                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                              >
                                <MessageSquare size={14} /> Classroom Chat & Doubts
                              </button>
                            </div>
                          ) : (
                            <div className="w-full space-y-2.5">
                              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-center space-y-1">
                                <p className="text-xs font-bold text-indigo-300 flex items-center justify-center gap-1.5">
                                  <Clock size={14} className="text-amber-400" /> Host agla MCQ session isi room me shuru karenge to aap dobara attempt kar sakenge!
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Aapka yeh result aur sabhi sawal aapke "MCQ Activity" me save ho chuke hain.
                                </p>
                              </div>
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('CHAT')}
                                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <MessageSquare size={14} /> Classroom Chat & Doubts Me Jayein
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── TAB 2: LEADERBOARD ── */}
              {activeTab === 'LEADERBOARD' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" /> Room Battle Leaderboard & XP
                  </h4>

                  {currentRoom.liveMcq?.scores && Object.keys(currentRoom.liveMcq.scores).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(currentRoom.liveMcq.scores)
                        .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
                        .map(([uid, data], idx) => (
                          <div
                            key={uid ? `tab_score_${uid}_${idx}` : `tab_score_${idx}`}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              uid === user?.id
                                ? 'bg-indigo-950/50 border-indigo-500/50'
                                : 'bg-slate-800/70 border-slate-700/80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 text-center font-black text-xs ${
                                  idx === 0
                                    ? 'text-amber-400'
                                    : idx === 1
                                    ? 'text-slate-300'
                                    : idx === 2
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="text-xs font-black text-white">
                                  {data.name} {uid === user?.id && '(Aap)'}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {data.correctCount || 0} Sahi (+5 XP) • {data.wrongCount || 0} Galat (-2 XP) • Max Streak: 🔥{data.maxStreak || 0}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-amber-400 block">{data.score || 0} pts</span>
                              <span className="text-[10px] font-bold text-emerald-400">+{data.userXp || 0} XP</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      Abhi koi MCQ Battle nahi hui hai. MCQ tab par jakar live battle shuru karein!
                    </p>
                  )}
                </div>
              )}

              {/* ── TAB 3: MEMBERS LIST ── */}
              {activeTab === 'MEMBERS' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Users size={16} /> Online Room Members ({Object.keys(currentRoom.members || {}).length})
                  </h4>

                  <div className="space-y-2">
                    {Object.entries(currentRoom.members || {}).map(([memKey, m], mIdx) => (
                      <div
                        key={m?.id ? `mem_${m.id}_${mIdx}` : `mem_${memKey}_${mIdx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                            {m.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{m.name}</span>
                              {m.isHost && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                  Host
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] border border-amber-500/30">
                                Lvl {m.level || 1}
                              </span>
                              <span className="text-[10px] text-indigo-300 font-semibold">
                                ⭐ {m.xp ?? m.totalXp ?? 0} XP
                              </span>
                              {(m.roomXp || 0) > 0 && (
                                <span className="text-[9px] text-emerald-400 font-bold">
                                  (+{m.roomXp} Room XP)
                                </span>
                              )}
                              {(m.studyMinutes || 0) > 0 && (
                                <span className="text-[9px] text-slate-400">
                                  ⏱️ {m.studyMinutes}m
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {m.handRaised && (
                          <span className="text-xs font-bold text-amber-400 animate-bounce">✋ Hand Raised</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Host Danger Zone / Room Destruction */}
                  {isHost && (
                    <div className="mt-6 p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-400">
                        <Trash2 size={16} />
                        <h5 className="text-xs font-black text-white">Host Controls: Room Destroy Karein</h5>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Aap is room ke <b>Host</b> hain. Agar aapka study session poora ho gaya hai ya aap room ko band karna chahte hain, toh yahan se room ko poori tarah destroy/delete kar sakte hain. Sabhi participants auto-disconnect ho jayenge.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDestroyRoom()}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 active:scale-95 transition shadow-lg cursor-pointer"
                      >
                        <Trash2 size={14} /> Room Destroy Karein
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SIDE PANEL / BOTTOM BAR: ROOM CHAT & DOUBTS (Only visible before test starts and after test ends) ── */}
            {!isMcqRunning && (
              <div className={`w-full md:w-80 flex flex-col bg-slate-950/90 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 transition-all duration-200 ${
                isDiscussionCollapsed ? 'h-auto' : 'h-64 md:h-auto'
              }`}>
                <div
                  onClick={() => toggleDiscussionCollapsed()}
                  className="flex items-center justify-between px-3 py-2 sm:py-2.5 border-b border-slate-800 bg-slate-900/90 cursor-pointer select-none hover:bg-slate-800/80 transition"
                  title={isDiscussionCollapsed ? "Live Discussion kholne ke liye tap karein" : "Live Discussion hide/niche karne ke liye tap karein"}
                >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <MessageSquare size={14} className="text-indigo-400 shrink-0" />
                  <span className="text-xs font-black text-white whitespace-nowrap">Live Discussion</span>
                  {isDiscussionCollapsed ? (
                    <span className="text-[10px] text-indigo-300 font-bold bg-indigo-950/70 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                      Tap to Chat ▴
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline whitespace-nowrap">
                      Charcha & Doubts
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  {!isDiscussionCollapsed && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatFilter('ALL');
                        }}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          chatFilter === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatFilter('DOUBTS');
                        }}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          chatFilter === 'DOUBTS'
                            ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        💡 Doubts
                      </button>
                    </>
                  )}

                  {/* Hide / Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDiscussionCollapsed();
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer whitespace-nowrap ${
                      isDiscussionCollapsed
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                    title={isDiscussionCollapsed ? "Live Discussion Kholein (Bara Karein)" : "Live Discussion Chhupayein (Niche Bhejein)"}
                  >
                    {isDiscussionCollapsed ? (
                      <>
                        <ChevronUp size={13} className="text-white" />
                        <span>Kholein (Open)</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} className="text-slate-400" />
                        <span>Hide</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Message Feed & Input (Collapsible on tap when isDiscussionCollapsed is true) */}
              <div className={`${isDiscussionCollapsed ? 'hidden' : 'flex'} flex-1 flex-col overflow-hidden`}>
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-48 md:max-h-none">
                  {currentRoom.chat &&
                    Object.entries(currentRoom.chat)
                      .filter(([_, msg]) => (chatFilter === 'DOUBTS' ? msg.type === 'DOUBT' : true))
                      .map(([msgKey, msg], msgIdx) => {
                        const isMe = msg.userId === user?.id;
                        const isDoubt = msg.type === 'DOUBT';
                        const isSystem = msg.type === 'SYSTEM';

                        if (isSystem) {
                          return (
                            <p
                              key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`}
                              className="text-[10px] text-center text-slate-400 py-1 font-medium bg-slate-900/40 rounded-lg"
                            >
                              {msg.text}
                            </p>
                          );
                        }

                        const isHostSender = msg.userId === currentRoom.hostId;
                        const displayName = isMe ? `${user?.name?.trim() || 'Aap'} (You)` : (msg.userName?.trim() || 'Student');

                        return (
                          <div key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}>
                            <div className="flex items-center gap-1.5 px-1">
                              <span className="w-4 h-4 rounded-full bg-slate-800 text-indigo-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                              <span className={`text-[11px] font-black ${isMe ? 'text-indigo-300' : 'text-slate-200'}`}>
                                {displayName}
                              </span>
                              {isHostSender && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  👑 Host
                                </span>
                              )}
                              {msg.timestamp && (
                                <span className="text-[8px] text-slate-500 font-mono">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div
                              className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-snug break-words shadow-sm ${
                                isDoubt
                                  ? 'bg-amber-950/60 border border-amber-500/50 text-amber-100'
                                  : isMe
                                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white'
                                  : 'bg-slate-800/90 border border-slate-700/80 text-slate-100'
                              }`}
                            >
                              {isDoubt && (
                                <span className="block text-[9px] font-black text-amber-300 uppercase tracking-wide mb-0.5">
                                  💡 Doubt
                                </span>
                              )}
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={(e) => handleSendChat(e, false)}
                  className="p-2 border-t border-slate-800 bg-slate-900/80 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Type message or doubt..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSendChat(e as any, true)}
                    className="px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black cursor-pointer"
                    title="Ask Doubt"
                  >
                    💡
                  </button>
                  <button
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40 transition shrink-0 cursor-pointer"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      {/* ── MOBILE DEDICATED LIVE DISCUSSION DRAWER (Before and After MCQ battle only) ── */}
      {showMobileChat && !isMcqRunning && currentRoom && (
        <div className="fixed inset-0 z-[10002] md:hidden flex flex-col bg-slate-950/95 backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-400" />
              <span className="font-black text-sm text-white">Live Discussion & Doubts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setChatFilter('ALL')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    chatFilter === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setChatFilter('DOUBTS')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    chatFilter === 'DOUBTS'
                      ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💡 Doubts
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ml-1"
                title="Close Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {currentRoom.chat &&
              Object.entries(currentRoom.chat)
                .filter(([_, msg]) => (chatFilter === 'DOUBTS' ? msg.type === 'DOUBT' : true))
                .map(([msgKey, msg], msgIdx) => {
                  const isMe = msg.userId === user?.id;
                  const isDoubt = msg.type === 'DOUBT';
                  const isSystem = msg.type === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <p key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`} className="text-[10px] text-center text-slate-400 py-1 font-medium bg-slate-900/40 rounded-lg">
                        {msg.text}
                      </p>
                    );
                  }

                  const isHostSender = msg.userId === currentRoom.hostId;
                  const displayName = isMe ? `${user?.name?.trim() || 'Aap'} (You)` : (msg.userName?.trim() || 'Student');

                  return (
                    <div key={msg?.id ? `msg_${msg.id}_${msgIdx}` : `msg_${msgKey}_${msgIdx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}>
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-indigo-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-black ${isMe ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {displayName}
                        </span>
                        {isHostSender && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            👑 Host
                          </span>
                        )}
                        {msg.timestamp && (
                          <span className="text-[8px] text-slate-500 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div
                        className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-snug break-words ${
                          isDoubt
                            ? 'bg-amber-950/50 border border-amber-500/40 text-amber-200'
                            : isMe
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {isDoubt && (
                          <span className="block text-[9px] font-black text-amber-400 uppercase tracking-wide mb-0.5">
                            💡 Doubt
                          </span>
                        )}
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
            <div ref={chatBottomRef} />
          </div>

          {/* Input bar */}
          <form
            onSubmit={(e) => handleSendChat(e, false)}
            className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Type message or doubt..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
            />
            <button
              type="button"
              onClick={(e) => handleSendChat(e as any, true)}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black cursor-pointer"
              title="Ask Doubt"
            >
              💡
            </button>
            <button
              type="submit"
              disabled={!chatMessage.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40 transition shrink-0 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ── CREATE ROOM MODAL (Mandatory Password & MCQ Mode Selection) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 border border-indigo-400/25 rounded-[28px] p-4 sm:p-6 shadow-[0_28px_100px_rgba(0,0,0,0.65)] space-y-4 text-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 flex items-center justify-center shrink-0">
                  <Trophy size={19} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">Assessment workspace · Step 01</p>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Study Room tayyar karein</h3>
                  <p className="text-xs text-slate-400 mt-1">Room details set karein, phir lobby mein apna exam question set banayein.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Close room setup"
                className="w-8 h-8 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <StudyRoomSetupProgress currentStep={1} />

            <form onSubmit={handleCreateRoom} className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 flex-1 min-h-0">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Room Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mission Bihar SSC & Lucent MCQ Battle"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition"
                />
              </div>

              {/* Optional Password Field */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>
                    Room Password <span className="text-slate-400 font-normal">(Optional / Marzi Hai)</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">🔓 Khali chhodne par Public</span>
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    placeholder="Khali chhodein ya secret password daalein (e.g. 1234)"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 focus:border-indigo-400 rounded-xl px-4 py-3 text-sm text-white outline-none pr-11 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showCreatePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Agar password khali chhodenge to koi bhi student direct confirmation ke sath room me enter kar sakega.
                </p>
              </div>

              {/* Informational Card: MCQ Mode & Chapter Selection happens inside the Room Lobby */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-500/[0.07] border border-indigo-400/20 text-xs text-slate-200 flex items-start gap-3">
                <span className="text-base shrink-0">💡</span>
                <div className="space-y-1">
                  <p className="font-bold text-white text-xs">
                    MCQ Mode & Chapter Selection:
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Room banne ke baad aap Room Lobby me <b>🎯 MCQ Mode</b> ya <b>⚡ MCQ + Mode</b> chunn sakte hain, question choose karke turant <b>🚀 Launch</b> ya <b>⏰ Schedule</b> kar sakte hain.
                  </p>
                </div>
              </div>

              {/* Room Duration Selection based on Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Duration (Time Limit):</span>
                  <span className="text-[10px] text-amber-300 font-bold">
                    {isAdmin
                      ? '👑 Unlimited / Up to 4 Hours (Admin)'
                      : userTier === 'FREE'
                      ? '30 Min Max (Free Plan)'
                      : userTier === 'BASIC'
                      ? '1 Hour Max (Basic Plan)'
                      : '2 Hours Max (Ultra Plan)'}
                  </span>
                </label>
                <select
                  value={newRoomDurationMinutes}
                  onChange={(e) => setNewRoomDurationMinutes(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition"
                >
                  {durationOptions.map((m) => (
                    <option key={`dur_opt_${m}`} value={m}>
                      {m} Minutes {m === 60 ? '(1 Hour)' : m === 120 ? '(2 Hours)' : m === 180 ? '(3 Hours)' : m === 240 ? '(4 Hours)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Capacity (Max Members) Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Capacity (Kitne Log Jud Sakenge):</span>
                  <button
                    type="button"
                    onClick={() => setShowRulesGuideModal(true)}
                    className="text-[10px] text-amber-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>ℹ️ Rules Dekhein</span>
                  </button>
                </label>
                <select
                  value={newRoomMaxMembers}
                  onChange={(e) => setNewRoomMaxMembers(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition"
                >
                  {(isAdmin || userTier === 'ULTRA') && (
                    <option value={100}>🚀 100 Members (Mega Battle Room - Full Cohort / High Speed)</option>
                  )}
                  {(isAdmin || userTier === 'ULTRA' || userTier === 'BASIC') && (
                    <option value={50}>⚡ 50 Members (Medium Class / Group Battle)</option>
                  )}
                  <option value={30}>🎯 30 Members (Standard Batch - Recommended for Best Speed)</option>
                  <option value={15}>👥 15 Members (Small Study Circle - Ultra Fast)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Zero-lag atomic live sync ke sath 100 students tak bina kisi rukawat ke live quiz khel sakte hain.
                </p>
              </div>

              {/* ── ROOM COLOR THEME SELECTOR ── */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Theme / Color:</span>
                  <span className="text-[10px] text-indigo-300 font-bold">
                    {roomTheme === 'blue' ? '🔵 Midnight Blue' : roomTheme === 'black' ? '⚫ AMOLED Black' : '⚪ Clean White'}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRoomTheme('blue')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      roomTheme === 'blue'
                        ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🔵 Blue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRoomTheme('black')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      roomTheme === 'black'
                        ? 'bg-zinc-900 border-zinc-500 text-white shadow-sm ring-1 ring-zinc-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>⚫ Black</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRoomTheme('white')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      roomTheme === 'white'
                        ? 'bg-white border-slate-300 text-slate-900 shadow-sm ring-1 ring-slate-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>⚪ White</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px]">
                <span className="text-slate-400">Daily Room Limit:</span>
                <span className="font-bold">
                  {isAdmin ? (
                    <span className="text-emerald-400 font-black flex items-center gap-1">
                      <Crown size={12} className="text-yellow-400" /> Unlimited Rooms (Admin Access)
                    </span>
                  ) : (
                    <span className="text-indigo-300 font-bold">
                      {todayCreatedRoomsCount}/{maxRoomsPerDay} Used Today ({userTier} Plan)
                    </span>
                  )}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="md:col-span-2 w-full py-3.5 rounded-xl font-black text-sm text-white shadow-xl active:scale-[0.99] transition cursor-pointer shrink-0"
                style={{ background: brandColor }}
              >
                {isLoading ? 'Creating Room...' : '🚀 Room Banayein (Lobby Kholein)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── JOIN ROOM (PASSWORD OR CONFIRMATION) MODAL ── */}
      {passwordModalRoom && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  {passwordModalRoom.password && passwordModalRoom.password.trim() ? <Lock size={16} /> : <Users size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {passwordModalRoom.password && passwordModalRoom.password.trim() ? 'Enter Room Password' : 'Join Room Confirmation'}
                  </h3>
                  <p className="text-[10px] text-slate-400">{passwordModalRoom.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalRoom(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {passwordModalRoom.password && passwordModalRoom.password.trim() ? (
              <>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Yeh room password protected hai. Is room me entry karne ke liye Host dwara set kiya gaya password enter karein.
                </p>

                <form onSubmit={handleVerifyPasswordAndJoin} className="space-y-3">
                  {/* Optional Name on Entry */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">👤 Aapka Naam (Optional)</span>
                      <span className="text-[10px] text-cyan-400 font-medium">🌐 Sabhi Classes Allowed</span>
                    </label>
                    <input
                      type="text"
                      placeholder={user?.name || "Apna naam likhein (optional)..."}
                      value={entryCustomName}
                      onChange={(e) => setEntryCustomName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400 placeholder:text-slate-500"
                      maxLength={30}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {entryCustomName.trim() ? `Room me aapka naam: "${entryCustomName.trim()}" dikhega.` : `Default: "${user?.name || 'Student'}"`}
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="Room Password yahan likhein..."
                      value={enteredPassword}
                      onChange={(e) => {
                        setEnteredPassword(e.target.value);
                        setPasswordError('');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {passwordError && (
                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} /> {passwordError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={!enteredPassword.trim()}
                      className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
                    >
                      Unlock & Join Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasswordModalRoom(null)}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Room Code:</span>
                    <span className="font-mono font-bold text-amber-400">{passwordModalRoom.code}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Host:</span>
                    <span className="font-bold text-slate-200">{passwordModalRoom.hostName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Subject:</span>
                    <span className="text-indigo-300">{passwordModalRoom.subject}</span>
                  </div>
                </div>

                {/* Optional Name on Entry */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">👤 Aapka Naam (Optional)</span>
                    <span className="text-[10px] text-cyan-400 font-medium">🌐 Sabhi Classes Allowed</span>
                  </label>
                  <input
                    type="text"
                    placeholder={user?.name || "Apna naam likhein (optional)..."}
                    value={entryCustomName}
                    onChange={(e) => setEntryCustomName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400 placeholder:text-slate-500"
                    maxLength={30}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {entryCustomName.trim() ? `Room me aapka naam: "${entryCustomName.trim()}" dikhega.` : `Default: "${user?.name || 'Student'}"`}
                  </p>
                </div>

                <p className="text-xs text-slate-300">
                  Yeh public room hai. Kya aap abhi is room me join karna chahte hain?
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const roomToJoin = passwordModalRoom;
                      setPasswordModalRoom(null);
                      handleJoinRoom(roomToJoin, entryCustomName.trim());
                    }}
                    className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md active:scale-95 transition cursor-pointer"
                  >
                    🚀 Ha, Room Join Karein
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordModalRoom(null)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHANGE DISPLAY NAME MODAL (Inside Study Room) ── */}
      {showChangeNameModal && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Naam Badlein (Display Name)</h3>
                  <p className="text-[10px] text-slate-400">Is Study Room ke liye apna naam update karein</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeNameModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Naya Display Naam:</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Apna naya naam yahan likhein..."
                  value={changeNameInputValue}
                  onChange={(e) => setChangeNameInputValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-400"
                  maxLength={30}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={!changeNameInputValue.trim()}
                  onClick={async () => {
                    if (!currentRoom || !changeNameInputValue.trim()) return;
                    const newName = changeNameInputValue.trim();
                    setShowChangeNameModal(false);
                    await updateMemberDisplayName(currentRoom.id, user?.id || 'guest', newName);
                    setCurrentRoom((prev) => {
                      if (!prev || !prev.members) return prev;
                      const uid = auth.currentUser?.uid || user?.id || 'guest';
                      if (!prev.members[uid]) return prev;
                      const updated = {
                        ...prev,
                        members: {
                          ...prev.members,
                          [uid]: {
                            ...prev.members[uid],
                            name: newName,
                          },
                        },
                      };
                      saveCachedRoom(updated);
                      return updated;
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  ✓ Naam Save Karein
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangeNameModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DAILY ROOM LIMIT UPGRADE MODAL ── */}
      {upgradePromptReason && (
        <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                  ⭐
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Daily Room Creation Limit Reached</h3>
                  <p className="text-[11px] text-slate-400">Upgrade for more rooms & longer duration</p>
                </div>
              </div>
              <button
                onClick={() => setUpgradePromptReason(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs text-slate-200 leading-relaxed">
              <p>
                Aapke aaj ke <strong>{maxRoomsPerDay} Study Rooms</strong> create karne ki limit poori ho chuki hai.
              </p>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <span>🆓</span> <b>Free User:</b> 2 Rooms per day (Max 30 min duration)
                </div>
                <div className="flex items-center gap-2 text-cyan-300">
                  <span>⭐</span> <b>Basic User:</b> 3 Rooms per day (Max 1 Hour duration)
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <span>👑</span> <b>Ultra User:</b> 5 Rooms per day (Max 2 Hours duration)
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setUpgradePromptReason(null);
                  onClose();
                  onOpenStore?.();
                }}
                className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md active:scale-95 transition cursor-pointer"
              >
                ⚡ Store Me Upgrade Karein
              </button>
              <button
                onClick={() => setUpgradePromptReason(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
              >
                Band Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROOM RULES & CAPACITY GUIDE MODAL (100 Users & Simultaneous Rooms) ── */}
      {showRulesGuideModal && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">
                  📚
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Room Capacity & Multi-Room Rules</h3>
                  <p className="text-[11px] text-slate-400">100 Users Speed & Simultaneous Room Guidelines</p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesGuideModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3.5 overflow-y-auto pr-1 text-xs text-slate-200">
              {/* Section 1: Ek Time Pe Kitne Rooms Chal Sakte Hain? */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                  <Flame size={15} /> Ek Time Pe Kitne Rooms Chal Sakte Hain? (Simultaneous Rooms)
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Realtime Database <b>100 Simultaneous Active Connections</b> support karta hai. Iska matlab hai ki aap alag-alag rooms me kul milakar 100 students ek sath bina kisi lag ke connect rakh sakte hain:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                    <p className="font-black text-indigo-300">🚀 1 Mega Room</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">1 Room × <b>100 Students</b><br />(Grand Mega Quiz)</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                    <p className="font-black text-emerald-300">🎯 3–4 Batches</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">3-4 Rooms × <b>25-30 Students</b><br />(Best for Daily Batches)</p>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30">
                    <p className="font-black text-purple-300">👥 6–8 Small Circles</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">6-8 Rooms × <b>10-15 Students</b><br />(Self Group Revision)</p>
                  </div>
                </div>
              </div>

              {/* Section 2: 100 Users Ke Liye Zero-Lag Architecture */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                  <ShieldCheck size={15} /> 100 Users Ke Sath Zero-Lag Kaise Kaam Karta Hai?
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside leading-relaxed">
                  <li>
                    <b className="text-white">Atomic Independent Scores:</b> Har student ka answer unke apne user ID par save hota hai. 100 log ek saath bhi click karenge to koi database freeze ya lock nahi hoga.
                  </li>
                  <li>
                    <b className="text-white">Optimized Live Sync:</b> Quiz ke dauran sirf current active question aur light-weight score stream hota hai taaki 3G/4G par bhi battery ya data consume na ho.
                  </li>
                  <li>
                    <b className="text-white">Auto-Disconnect Release:</b> Jaise hi koi student tab close karta hai ya test complete hota hai, room slot turant agle student ke liye khali ho jata hai.
                  </li>
                </ul>
              </div>

              {/* Section 3: Plan-Wise Creation Quotas */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-black text-xs">
                  <Crown size={15} /> Plan Ke Hisaab Se Room Creation Limits
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">🆓 <b>Free User</b></span>
                    <span className="text-slate-400 font-bold">2 Rooms / Din • 30 Min Max • Up to 25 Members</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
                    <span className="text-cyan-300">⭐ <b>Basic Plan</b></span>
                    <span className="text-cyan-200 font-bold">3 Rooms / Din • 60 Min Max • Up to 50 Members</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-purple-950/30 border border-purple-500/20">
                    <span className="text-purple-300">👑 <b>Ultra VIP</b></span>
                    <span className="text-purple-200 font-bold">5 Rooms / Din • 120 Min Max • Up to 100 Members</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                    <span className="text-emerald-300">🛡️ <b>Admin Access</b></span>
                    <span className="text-emerald-200 font-black">Unlimited Rooms • 240 Min Max • 100+ Members</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesGuideModal(false)}
              className="w-full py-2.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md active:scale-95 transition cursor-pointer shrink-0"
            >
              Samajh Gaya (Done)
            </button>
          </div>
        </div>
      )}

      {/* ── ULTRA QUESTION INSPECTOR MODAL (Cherry-Pick Individual Questions) ── */}
      {showUltraQuestionInspector && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex flex-col p-3 md:p-6 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl flex-1 flex flex-col max-w-4xl w-full mx-auto overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  <h3 className="text-base font-black text-white">Ultra Question Bank Selector</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                    {allAvailableQuestionsForUltra.length - ultraExcludedQuestionKeys.size} of {allAvailableQuestionsForUltra.length} Selected
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Har ek sawal ko check/uncheck karke tay karein ki battle me kaun sa exact sawal aayega.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUltraQuestionInspector(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search & Actions Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={ultraQuestionsSearch}
                  onChange={(e) => setUltraQuestionsSearch(e.target.value)}
                  placeholder="🔍 Sawaal ya option search karein..."
                  className="w-full pl-9 pr-7 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                {ultraQuestionsSearch && (
                  <button
                    type="button"
                    onClick={() => setUltraQuestionsSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUltraExcludedQuestionKeys(new Set())}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold hover:bg-emerald-500/30 transition cursor-pointer"
                >
                  ✓ Sabhi Chunein (Select All)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allKeys = new Set(allAvailableQuestionsForUltra.map((item) => item.key));
                    setUltraExcludedQuestionKeys(allKeys);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold hover:bg-rose-500/30 transition cursor-pointer"
                >
                  ✕ Sabhi Hatayein (Deselect All)
                </button>
              </div>
            </div>

            {/* Question List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredUltraQuestions.length > 0 ? (
                filteredUltraQuestions.map((item, qIdx) => {
                  const isIncluded = !ultraExcludedQuestionKeys.has(item.key);
                  return (
                    <div
                      key={item.key || `ultra_q_${qIdx}`}
                      onClick={() => {
                        setUltraExcludedQuestionKeys((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.key)) next.delete(item.key);
                          else next.add(item.key);
                          return next;
                        });
                      }}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isIncluded
                          ? 'bg-slate-950/80 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20'
                          : 'bg-slate-950/30 border-slate-800/60 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black">
                              Q{qIdx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                              {item.subject}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-xs">
                              📖 {item.lessonTitle}
                            </span>
                          </div>

                          <div className="my-1">
                            <McqQuestionDisplay
                              q={{
                                ...item.q,
                                correctAnswer: (item.q as any).correctAnswer ?? (item.q as any).correctIndex ?? 0,
                              } as any}
                              variant="dark"
                              showTypeBadge={true}
                              questionClassName="text-xs font-bold text-slate-100 leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2.5">
                            {item.q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === item.q.correctIndex;
                              return (
                                <div
                                  key={`opt_${optIdx}`}
                                  className={`p-1.5 px-2 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 ${
                                    isCorrect
                                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                                      : 'bg-slate-900/50 border-slate-800 text-slate-300'
                                  }`}
                                >
                                  <span className="w-4 h-4 rounded bg-slate-800 text-[9px] font-mono flex items-center justify-center font-bold shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span
                                    className="break-words flex-1 leading-snug"
                                    dangerouslySetInnerHTML={{ __html: renderMathInHtml(opt) }}
                                  />
                                  {isCorrect && <span className="ml-auto text-[10px] text-emerald-400 font-bold shrink-0">✓ Sahi</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Koi question nahi mila search query ke anusar.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Selected: <b className="text-amber-400">{allAvailableQuestionsForUltra.length - ultraExcludedQuestionKeys.size} Questions</b> Active For Battle
              </span>
              <button
                type="button"
                onClick={() => setShowUltraQuestionInspector(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
              >
                ✓ Done & Save Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TIER FEATURE PROMPT MODAL (Free user upgrade teaser) ── */}
      {tierFeaturePrompt && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl mx-auto">
              {tierFeaturePrompt.targetTier === 'ULTRA' ? '👑' : '⭐'}
            </div>
            <div>
              <h3 className="text-base font-black text-white">{tierFeaturePrompt.title}</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {tierFeaturePrompt.description}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500">🎓 Free:</span>
                <span>Single Lesson Battle (Standard Test)</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <span>⭐ Basic:</span>
                <span>Multiple Subjects + Multiple Chapters + Question Limits</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <span>👑 Ultra:</span>
                <span>Full Question Bank Browser + Cherry-Pick Exact Questions</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTierFeaturePrompt(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
            >
              Samajh Gaya (Close)
            </button>
          </div>
        </div>
      )}

      {/* ── ANTI-CHEATING WARNING MODAL (1st Minimize Violation) ── */}
      {showMinimizeWarningModal && (
        <div className="fixed inset-0 z-[10001] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center ring-4 ring-amber-500/20">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
              ⚠️
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
                Anti-Cheat Alert • Warning 1 of 2
              </div>
              <h3 className="text-lg font-black text-white">App Minimize Karna Mana Hai!</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Aapne live test ke dauran doosra app kholne ya screen minimize karne ki koshish ki hai. Yeh sakht mana hai!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-left space-y-2 text-xs text-amber-200">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-black text-sm">❗</span>
                <span>
                  <b>2nd Warning Rule:</b> Agar aapne dobara app minimize ya tab switch kiya, toh aapko turant <b>Room se Exit aur Disqualify</b> kar diya jayega!
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-black text-sm">⏭️</span>
                <span>
                  Bache huye sabhi questions ko <b>SKIP</b> maan liya jayega aur koi extra mauka nahi milega.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMinimizeWarningModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition cursor-pointer"
            >
              Main Samajh Gaya (Test Jari Rakhein)
            </button>
          </div>
        </div>
      )}

      {/* ── ROOM SETUP DRAWER SYSTEM (Bottom Sheet on Mobile, Centered Modal on Desktop) ── */}
      {activeSetupDrawer && (
        <div className="fixed inset-0 z-[11500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setActiveSetupDrawer(null)} />
          <div className="relative w-full sm:max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-t-[32px] sm:rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col text-slate-100 z-10 animate-in slide-in-from-bottom-6 duration-200">
            {/* Mobile Drag Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-700 mx-auto mb-3 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-lg shrink-0">
                  {activeSetupDrawer === 'ASSESSMENT_MODE' && '🎯'}
                  {activeSetupDrawer === 'SECTION' && '📚'}
                  {activeSetupDrawer === 'CLASS' && '🏫'}
                  {activeSetupDrawer === 'COMPETITION_BOOK' && '📖'}
                  {activeSetupDrawer === 'LESSONS' && '📋'}
                  {activeSetupDrawer === 'DURATION' && '⏱️'}
                  {activeSetupDrawer === 'QUESTION_LIMITS' && '🎛️'}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {activeSetupDrawer === 'ASSESSMENT_MODE' && 'Assessment Mode Chunein'}
                    {activeSetupDrawer === 'SECTION' && 'Section Chunein'}
                    {activeSetupDrawer === 'CLASS' && 'Class & Subject Chunein'}
                    {activeSetupDrawer === 'COMPETITION_BOOK' && 'Competition Book Chunein'}
                    {activeSetupDrawer === 'LESSONS' && 'Lesson Chunein'}
                    {activeSetupDrawer === 'DURATION' && 'Total Exam Duration Chunein'}
                    {activeSetupDrawer === 'QUESTION_LIMITS' && 'Question Limits & Order'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeSetupDrawer === 'ASSESSMENT_MODE' && 'MCQ Mode ya MCQ + Mode select karein'}
                    {activeSetupDrawer === 'SECTION' && 'Academic Syllabus ya Competition select karein'}
                    {activeSetupDrawer === 'CLASS' && 'Class aur Subject ke mutabiq filter karein'}
                    {activeSetupDrawer === 'COMPETITION_BOOK' && 'Competition exam ki book chunein'}
                    {activeSetupDrawer === 'LESSONS' && `${availableBattleSets.length} Lessons uplabdh hain`}
                    {activeSetupDrawer === 'DURATION' && 'Pure test ka kul samay (minutes) tay karein'}
                    {activeSetupDrawer === 'QUESTION_LIMITS' && 'Har lesson, subject ya total question limit aur sequence tay karein'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSetupDrawer(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0 pr-1">
              {/* 1. ASSESSMENT MODE DRAWER CONTENT */}
              {activeSetupDrawer === 'ASSESSMENT_MODE' && (
                <div className="space-y-3">
                  <div
                    onClick={() => {
                      handleSwitchMcqType('PROJECTOR_MODE');
                      setBattleSearch('');
                      setBattleSubject('ALL');
                      setBattleCategory('ALL');
                      setBattleBook('ALL');
                      setActiveSetupDrawer(null);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      currentRoom?.mcqType !== 'REVISION_HUB'
                        ? 'bg-cyan-600/25 border-cyan-400 text-white ring-1 ring-cyan-500 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xl shrink-0">
                      🎯
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-white">🎯 MCQ Mode</h4>
                        {currentRoom?.mcqType !== 'REVISION_HUB' && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black">
                            ✓ Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-bold mt-0.5">Syllabus & All Competition Books</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Lucent, Speedy Science, Speedy SST aur NCERT School Syllabus (Class 6-12) ke MCQs available hain. Sabhi users ke liye free practice.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (isFreeUser) {
                        alert('🔒 MCQ+ Question Sets sirf Pro / Ultra members host kar sakte hain! Free users standard MCQ practice sets host kar sakte hain.');
                        return;
                      }
                      handleSwitchMcqType('REVISION_HUB');
                      setBattleSearch('');
                      setBattleSubject('ALL');
                      setBattleBook('ALL');
                      setActiveSetupDrawer(null);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      isFreeUser
                        ? 'bg-slate-950/50 border-slate-800 text-slate-500'
                        : currentRoom?.mcqType === 'REVISION_HUB'
                        ? 'bg-purple-600/25 border-purple-400 text-white ring-1 ring-purple-500 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-xl shrink-0">
                      ⚡
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">⚡ MCQ + Mode</h4>
                          {isFreeUser && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black">
                              🔒 PRO
                            </span>
                          )}
                        </div>
                        {currentRoom?.mcqType === 'REVISION_HUB' && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-black">
                            ✓ Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-bold mt-0.5">Revision Hub & Strictly Lucent GK</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Curated Revision Hub questions aur Lucent Samanya Gyan ke special sets. Pro & Ultra members ke liye exclusive.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SECTION DRAWER CONTENT */}
              {activeSetupDrawer === 'SECTION' && (
                <div className="space-y-3">
                  <div
                    onClick={() => {
                      setBattleDomain('ACADEMIC');
                      setBattleSubject('ALL');
                      setBattleCategory('ALL');
                      setActiveSetupDrawer(null);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      battleDomain === 'ACADEMIC'
                        ? 'bg-cyan-600/25 border-cyan-400 text-white ring-1 ring-cyan-500 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xl shrink-0">
                      📚
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-white">📚 Academic Syllabus</h4>
                        {battleDomain === 'ACADEMIC' && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-bold mt-0.5">Class 6th se 12th Notes & Homework</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        School & Board syllabus ke mutabiq subjects jaise Science, Math, SST, Hindi, etc.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setBattleDomain('COMPETITION');
                      setBattleSubject('ALL');
                      setBattleBook('ALL');
                      setActiveSetupDrawer(null);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      battleDomain === 'COMPETITION'
                        ? 'bg-amber-600/25 border-amber-400 text-white ring-1 ring-amber-500 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xl shrink-0">
                      🏆
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-white">🏆 Competition Books</h4>
                        {battleDomain === 'COMPETITION' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-bold mt-0.5">
                        {currentRoom?.mcqType === 'REVISION_HUB' ? '⚡ Revision Hub: Only Lucent' : '🎯 Sabhi Competition Books'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Lucent GK, Speedy Science, Speedy Social Science aur sabhi competitive exam sets.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. CLASS DRAWER CONTENT */}
              {activeSetupDrawer === 'CLASS' && (
                <div className="space-y-4">
                  {/* Class Pills */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">Class Chunein:</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setBattleClass('ALL');
                          setBattleSubject('ALL');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          battleClass === 'ALL'
                            ? 'bg-cyan-500 text-slate-950 shadow-md ring-2 ring-cyan-300'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Sabhi Classes
                      </button>
                      {academicClasses.map((cls, cIdx) => (
                        <button
                          key={`drawer_cls_${cls || cIdx}`}
                          type="button"
                          onClick={() => {
                            setBattleClass(cls);
                            setBattleSubject('ALL');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                            battleClass === cls
                              ? 'bg-cyan-500 text-slate-950 shadow-md ring-2 ring-cyan-300'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          Class {cls}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject Pills */}
                  {(() => {
                    const classLessons = allRealLessons.filter(
                      (l) =>
                        l.classLevel !== 'COMPETITION' &&
                        (battleClass === 'ALL' || l.classLevel === battleClass)
                    );
                    const subjects = Array.from(new Set(classLessons.map((l) => l.subject))).filter(Boolean).sort();
                    if (subjects.length === 0) return null;
                    return (
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-2">Subject Chunein:</label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                          <button
                            type="button"
                            onClick={() => handleToggleBattleSubject('ALL')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isBattleSubjectActive('ALL')
                                ? 'bg-indigo-600 text-white font-black shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Sabhi Subjects ({classLessons.length})
                          </button>
                          {subjects.map((sub, sIdx) => {
                            const subCount = classLessons.filter((l) => l.subject === sub).length;
                            return (
                              <button
                                key={`drawer_sub_${sub || sIdx}`}
                                type="button"
                                onClick={() => handleToggleBattleSubject(sub)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  isBattleSubjectActive(sub)
                                    ? 'bg-indigo-600 text-white font-black shadow ring-1 ring-indigo-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {sub} ({subCount})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Category Pills (if Projector mode) */}
                  {currentRoom?.mcqType !== 'REVISION_HUB' && (
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-2">Category:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(['ALL', 'NOTES', 'HOMEWORK'] as const).map((cat) => (
                          <button
                            key={`drawer_cat_${cat}`}
                            type="button"
                            onClick={() => setBattleCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                              battleCategory === cat
                                ? 'bg-cyan-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {cat === 'ALL' ? 'Sabhi' : cat === 'NOTES' ? '📖 Notes ke MCQs' : '📝 Homework'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="relative pt-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={battleSearch}
                      onChange={(e) => setBattleSearch(e.target.value)}
                      placeholder="🔍 Lesson ka naam ya chapter search karein..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    {battleSearch && (
                      <button
                        type="button"
                        onClick={() => setBattleSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 4. COMPETITION BOOK DRAWER CONTENT */}
              {activeSetupDrawer === 'COMPETITION_BOOK' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={battleSearch}
                      onChange={(e) => setBattleSearch(e.target.value)}
                      placeholder="🔍 Book ya topic search karein..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    {battleSearch && (
                      <button
                        type="button"
                        onClick={() => setBattleSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Revision Hub: Only Lucent Topics */}
                  {currentRoom?.mcqType === 'REVISION_HUB' ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-amber-300">📖 Lucent Samanya Gyan Topics:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleToggleBattleSubject('ALL');
                            setActiveSetupDrawer(null);
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs font-black transition cursor-pointer ${
                            isBattleSubjectActive('ALL')
                              ? 'bg-amber-500 text-slate-950 shadow ring-2 ring-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          Sabhi Lucent Topics
                        </button>
                        {lucentSubjectOptions.map((opt) => (
                          <button
                            key={`drawer_luc_${opt.id}`}
                            type="button"
                            onClick={() => {
                              handleToggleBattleSubject(opt.name);
                              setActiveSetupDrawer(null);
                            }}
                            className={`p-2.5 rounded-xl border text-left text-xs font-black transition cursor-pointer ${
                              isBattleSubjectActive(opt.name)
                                ? 'bg-amber-500 text-slate-950 shadow ring-2 ring-amber-300'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            📖 {opt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* All Competition Books */
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-amber-300">
                        📚 Competition Books ({allCompetitionBooks.length} Books Uplabdh):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                        {allCompetitionBooks.map((b) => (
                          <button
                            key={`drawer_b_${b.id}`}
                            type="button"
                            onClick={() => {
                              setBattleBook(b.id);
                              setActiveSetupDrawer(null);
                            }}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                              battleBook === b.id
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="text-2xl shrink-0">{b.emoji}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black truncate">{b.name}</p>
                              {b.tag && (
                                <span className="text-[10px] opacity-75 block mt-0.5">{b.tag}</span>
                              )}
                            </div>
                            {battleBook === b.id && (
                              <CheckCircle2 size={16} className="text-slate-950 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. LESSONS DRAWER CONTENT */}
              {activeSetupDrawer === 'LESSONS' && (
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={battleSearch}
                      onChange={(e) => setBattleSearch(e.target.value)}
                      placeholder="🔍 Lesson ka naam ya topic search karein..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                    {battleSearch && (
                      <button
                        type="button"
                        onClick={() => setBattleSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Toolbar based on Assessment Mode: MCQ+ (Strictly 1 Lesson) vs MCQ (Multi-Lesson) */}
                  {currentRoom?.mcqType === 'REVISION_HUB' ? (
                    <div className="flex items-center justify-between bg-purple-950/40 p-2.5 rounded-xl border border-purple-500/40 text-xs">
                      <span className="font-bold text-purple-200 flex items-center gap-1.5">
                        <span>⚡ MCQ+ Mode:</span>
                        <span className="text-white font-black">Sirf 1 Lesson (Fixed 100 Qs)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                        Revision Hub Benchmark
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-cyan-500/30 text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="text-cyan-400 font-black">🎯 Multi-Lesson MCQ:</span>
                        <span>{selectedCuratedSets.length} Lessons Chune Gaye</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllBattleLessons}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-600/50 cursor-pointer text-[10px]"
                        >
                          ✓ Sabhi Select
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllBattleLessons}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer text-[10px]"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Available Lessons List */}
                  {availableBattleSets.length > 0 ? (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {availableBattleSets.map((set, sIdx) => {
                        const isRevision = currentRoom?.mcqType === 'REVISION_HUB';
                        const isSelected = isRevision
                          ? selectedCuratedSet === set.id
                          : selectedCuratedSets.includes(set.id);
                        return (
                          <div
                            key={set.id ? `${set.id}_${sIdx}` : `drawer_bset_${sIdx}`}
                            onClick={() => handleToggleBattleLesson(set.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-left ${
                              isSelected
                                ? isRevision
                                  ? 'bg-purple-600/25 border-purple-400 text-white ring-1 ring-purple-500/50 shadow-md'
                                  : 'bg-cyan-600/25 border-cyan-400 text-white ring-1 ring-cyan-500/50 shadow-md'
                                : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {isRevision ? (
                              <input
                                type="radio"
                                name="drawerMcqSet"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 text-purple-500 bg-slate-900 border-slate-700 cursor-pointer shrink-0"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-slate-700 cursor-pointer shrink-0"
                              />
                            )}
                            <span className="text-xl shrink-0">{set.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-black truncate">{set.name}</p>
                                {set.tag && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 ${
                                      set.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                    }`}
                                  >
                                    {set.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {set.questions.length} Questions • {set.subject || 'General'}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2
                                size={16}
                                className={`shrink-0 ${isRevision ? 'text-purple-400' : 'text-cyan-400'}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2 bg-slate-950/60 rounded-xl border border-slate-800 p-4">
                      <p className="text-xs text-slate-400 font-semibold">
                        Is filter me koi lesson nahi mila.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setBattleSearch('');
                          setBattleSubject('ALL');
                          setBattleSubjects(['ALL']);
                          setBattleClass('ALL');
                          setBattleCategory('ALL');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        Filter Reset Karein
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 6. DURATION DRAWER CONTENT */}
              {activeSetupDrawer === 'DURATION' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <Timer size={16} className="text-purple-400" /> Current Selected Duration:
                      </span>
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        ⏱️ {totalTestMinutes} Minutes
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Test ka samay pura hone par test automatically submit ho jayega. Niche diye gaye presets me se chunein ya custom time dalein:
                    </p>
                  </div>

                  {/* Preset Minute Buttons */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">Preset Time Chunein:</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {[5, 10, 15, 20, 30, 45, 60].map((min) => (
                        <button
                          key={`drawer_min_${min}`}
                          type="button"
                          onClick={() => setTotalTestMinutes(min)}
                          className={`py-2 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            totalTestMinutes === min
                              ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300 scale-[1.02]'
                              : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <span className="text-sm font-black">{min}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-75">min</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Exam Time Input */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Custom Time (Aapki Pasand):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={totalTestMinutes}
                        onChange={(e) => setTotalTestMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
                        className="w-24 px-3 py-2 bg-slate-900 border border-purple-500/50 rounded-xl text-purple-300 font-mono text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <span className="text-xs font-bold text-slate-300">Minutes (1 se 240 tak)</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      💡 Tip: Shorter tests (10-15 mins) live group battle ke liye best hote hain.
                    </p>
                  </div>
                </div>
              )}

              {/* 7. QUESTION LIMITS & ORDER DRAWER CONTENT */}
              {activeSetupDrawer === 'QUESTION_LIMITS' && (
                <div className="space-y-4">
                  {currentRoom?.mcqType === 'REVISION_HUB' ? (
                    <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2.5 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <div>
                          <h4 className="text-sm font-black text-white">MCQ+ Mode: Fixed 100 Questions Benchmark</h4>
                          <p className="text-[10px] text-purple-300">Revision Hub Assessment Standard</p>
                        </div>
                      </div>
                      <p className="text-xs text-purple-200/90 leading-relaxed">
                        MCQ+ Mode me hamesha <b>100 Questions (Fixed)</b> ka comprehensive test hota hai. Isse test ke baad Revision Hub jaisa topic-by-topic analysis milta hai ki <b>kon topic kamjor hai aur kon majboot hai</b>.
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-300">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 font-black">
                          ✓ 100 Questions Fixed
                        </span>
                        <span>Variable question limits ke liye Assessment Mode me standard MCQ chunein.</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Limit Mode Switcher */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <SlidersHorizontal size={14} className="text-amber-400" />
                            <span>Question Limits Mode:</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'ALL', label: 'Sabhi Questions', desc: 'Saare questions include karein' },
                            { id: 'PER_LESSON', label: 'Per Lesson', desc: 'Har lesson se barabar' },
                            { id: 'PER_SUBJECT', label: 'Per Subject', desc: 'Har subject se barabar' },
                            { id: 'TOTAL', label: 'Total Limit', desc: 'Total fixed limit' },
                          ].map((m) => (
                            <button
                              key={`drawer_limit_${m.id}`}
                              type="button"
                              onClick={() => setLimitMode(m.id as any)}
                              className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                                limitMode === m.id
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="text-xs font-black">{m.label}</span>
                              <span className={`text-[10px] ${limitMode === m.id ? 'text-slate-900 opacity-90' : 'text-slate-500'}`}>
                                {m.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Numeric Selectors */}
                      {limitMode === 'PER_LESSON' && (
                        <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                          <span className="text-xs text-amber-300 font-bold block">Har Lesson se Kitne Sawaal?</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[5, 10, 15, 20].map((num) => (
                              <button
                                key={`pl_drawer_${num}`}
                                type="button"
                                onClick={() => setQuestionsPerLessonLimit(num)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                                  questionsPerLessonLimit === num
                                    ? 'bg-amber-500 text-slate-950 shadow ring-2 ring-amber-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {num} Sawaal
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {limitMode === 'PER_SUBJECT' && (
                        <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                          <span className="text-xs text-amber-300 font-bold block">Har Subject se Kitne Sawaal?</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[5, 10, 15, 20, 25, 30].map((num) => (
                              <button
                                key={`ps_drawer_${num}`}
                                type="button"
                                onClick={() => setQuestionsPerSubjectLimit(num)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                                  questionsPerSubjectLimit === num
                                    ? 'bg-amber-500 text-slate-950 shadow ring-2 ring-amber-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {num} Sawaal
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {limitMode === 'TOTAL' && (
                        <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                          <span className="text-xs text-amber-300 font-bold block">Kul (Total) Questions Limit:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[10, 15, 20, 30, 50, 100].map((num) => (
                              <button
                                key={`tot_drawer_${num}`}
                                type="button"
                                onClick={() => setTotalQuestionsLimit(num)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                                  totalQuestionsLimit === num
                                    ? 'bg-amber-500 text-slate-950 shadow ring-2 ring-amber-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {num} Sawaal
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Question Shuffling / Order */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <label className="text-xs font-bold text-slate-300 block">Sawaal Ka Sequence / Order:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuestionOrderMode('RANDOM')}
                        className={`p-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                          questionOrderMode === 'RANDOM'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500 shadow-md ring-1 ring-emerald-500'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-base">🎲</span>
                        <span>Shuffled (Random)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionOrderMode('SEQUENTIAL')}
                        className={`p-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                          questionOrderMode === 'SEQUENTIAL'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500 shadow-md ring-1 ring-emerald-500'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-base">📋</span>
                        <span>Sequential</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      🎲 Shuffled se sabhi participants ko alag alag kram me questions aate hain.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 shrink-0 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-medium">
                {activeSetupDrawer === 'LESSONS'
                  ? isBasicUser
                    ? `${selectedCuratedSets.length} Lessons Chune Gaye`
                    : '1 Lesson Chuna Gaya'
                  : activeSetupDrawer === 'DURATION'
                  ? `⏱️ ${totalTestMinutes} Minutes Set`
                  : activeSetupDrawer === 'QUESTION_LIMITS'
                  ? `${limitMode === 'ALL' ? 'Sabhi Questions' : limitMode} • ${questionOrderMode}`
                  : 'Selection Saved'}
              </span>
              <button
                type="button"
                onClick={() => setActiveSetupDrawer(null)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-xs text-white shadow-md active:scale-95 transition cursor-pointer"
              >
                Theek Hai (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STUDENT-CONTROLLED IDEAL QUESTION PACE & VIBRATION ALERT MODAL ── */}
      {showPaceSettingsModal && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-purple-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ideal Question Pace</h3>
                  <p className="text-[10px] text-purple-300">Aapka Personal Pace & Alert</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaceSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* 1. Time Select Karne Ka Option */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Har Sawal Ka Ideal Time:</span>
                  <span className="font-black text-purple-400">{userPaceSeconds} Sec</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[15, 20, 30, 45, 60].map((sec) => (
                    <button
                      key={`modal_pace_${sec}`}
                      type="button"
                      onClick={() => {
                        setUserPaceSeconds(sec);
                        setPaceSecondsLeft(sec);
                        setHasPaceAlertTriggered(false);
                        try {
                          localStorage.setItem('study_user_pace_seconds', String(sec));
                        } catch {}
                      }}
                      className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        userPaceSeconds === sec
                          ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-md shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                {/* Custom seconds input */}
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400">Custom Pace Time:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={userPaceSeconds}
                      onChange={(e) => {
                        const val = Math.max(5, Math.min(300, Number(e.target.value) || 5));
                        setUserPaceSeconds(val);
                        setPaceSecondsLeft(val);
                        setHasPaceAlertTriggered(false);
                        try {
                          localStorage.setItem('study_user_pace_seconds', String(val));
                        } catch {}
                      }}
                      className="w-16 px-2 py-1 bg-slate-900 border border-purple-500/40 rounded-lg text-purple-300 font-mono text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <span className="text-xs font-bold text-slate-400">Sec</span>
                  </div>
                </div>
              </div>

              {/* 2. Vibration On / Off Toggle (User ke haath me) */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Smartphone size={13} className="text-purple-400" /> Phone Vibration Alert
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Ideal time khatam hone par mobile vibrate kare
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !userVibrateAlert;
                      setUserVibrateAlert(nextVal);
                      try {
                        localStorage.setItem('study_user_vibrate_alert', String(nextVal));
                        if (nextVal && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                          navigator.vibrate([150, 70, 150]);
                        }
                      } catch {}
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      userVibrateAlert
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {userVibrateAlert ? '📳 Vibrate ON' : '🔕 Mute'}
                  </button>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[10px] text-purple-200 leading-relaxed">
                Har sawal badalne par yeh timer dobara {userPaceSeconds}s se shuru hoga. Mobile vibration aapke hath me hai.
              </div>

              <button
                type="button"
                onClick={() => setShowPaceSettingsModal(false)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-purple-600/30"
              >
                Theek Hai (Test Jari Rakhein)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEST SUBMIT CONFIRMATION MODAL (Total Test & Mix Mode) ── */}
      {showSubmitConfirmModal && currentRoom?.liveMcq && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" /> Test Submit Karein?
              </h3>
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kul Sawal:</span>
                <span className="font-black text-white">
                  {currentRoom.liveMcq.totalQuestions || currentRoom.liveMcq.questions?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Attempt Kiye Gaye:</span>
                <span className="font-black text-emerald-400">
                  {Object.keys(localBattleStats.answers).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bache Huye Sawal:</span>
                <span className="font-black text-amber-400">
                  {Math.max(
                    0,
                    (currentRoom.liveMcq.totalQuestions || currentRoom.liveMcq.questions?.length || 0) -
                      Object.keys(localBattleStats.answers).length
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Bacha Hua Samay:</span>
                <span className="font-black text-cyan-300">
                  {Math.floor(totalTestSecondsLeft / 60)}m {totalTestSecondsLeft % 60}s
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Kya aap sach me test submit karna chahte hain? Submit karte hi aapka scorecard generate hoga aur final result screen khulegi.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                disabled={isSubmittingBatch}
                className="py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black transition cursor-pointer"
              >
                Aur Hal Karein
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentRoom?.id || !user?.id) {
                    setSubmitError('Submit nahi hua. Room ya student account ki jaankari nahi mili.');
                    return;
                  }
                  setIsSubmittingBatch(true);
                  setSubmitError(null);
                  try {
                    const didSubmit = await submitFinalBatchScore(currentRoom.id, user.id, user.name || 'Student', {
                      score: localBattleStats.score,
                      correctCount: localBattleStats.correctCount,
                      wrongCount: localBattleStats.wrongCount,
                      totalAnswered: localBattleStats.totalAnswered,
                      maxStreak: localBattleStats.maxStreak,
                      userXp: localBattleStats.userXp,
                      streakBonusXp: localBattleStats.streakBonusXp,
                      userPhotoURL: user.photoURL || '',
                      answers: localBattleStats.answers,
                    });
                    if (!didSubmit) {
                      setSubmitError('Submit save nahi ho paya. Internet connection check karke dobara try karein.');
                      return;
                    }

                    if (localBattleStats.userXp > 0) {
                      const currentXp = user.xp || user.totalScore || 0;
                      const newXp = Math.max(0, currentXp + localBattleStats.userXp);
                      const newLevel = getLevelFromScore(newXp);
                      const updatedUser = {
                        ...user,
                        xp: newXp,
                        totalScore: newXp,
                        level: newLevel,
                      };
                      try {
                        localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
                        localStorage.setItem(`nst_user_profile_${user.id}`, JSON.stringify(updatedUser));
                      } catch (_) {}
                      saveUserToLive(updatedUser, { immediate: true }).catch(() => {});
                      onUserUpdate?.(updatedUser);
                    }

                    setShowSubmitConfirmModal(false);
                    setHasStudentSubmittedEarly(true);
                    setHasBatchSubmitted(true);
                    setCurrentRoom((prev) => {
                      if (!prev?.liveMcq) return prev;
                      const submittedAt = Date.now();
                      const score = {
                        name: user.name || 'Student',
                        score: localBattleStats.score,
                        correctCount: localBattleStats.correctCount,
                        wrongCount: localBattleStats.wrongCount,
                        totalAnswered: localBattleStats.totalAnswered,
                        maxStreak: localBattleStats.maxStreak,
                        userXp: localBattleStats.userXp,
                        streakBonusXp: localBattleStats.streakBonusXp,
                        userPhotoURL: user.photoURL || '',
                        submittedAt,
                      };
                      const questionAnswers = { ...(prev.liveMcq.questionAnswers || {}) };
                      Object.entries(localBattleStats.answers).forEach(([questionIndex, answer]) => {
                        const index = Number(questionIndex);
                        questionAnswers[index] = {
                          ...(questionAnswers[index] || {}),
                          [user.id]: {
                            userId: user.id,
                            userName: user.name || 'Student',
                            userPhotoURL: user.photoURL || '',
                            selectedOption: answer.selectedOption,
                            isCorrect: answer.isCorrect,
                            timeTakenSec: answer.timeTakenSec,
                            timestamp: submittedAt,
                          },
                        };
                      });
                      const updated = {
                        ...prev,
                        liveMcq: {
                          ...prev.liveMcq,
                          scores: {
                            ...(prev.liveMcq.scores || {}),
                            [user.id]: score,
                          },
                          questionAnswers,
                        },
                      };
                      saveCachedRoom(updated);
                      return updated;
                    });

                    // If the host submits, or the test timer has expired, end the battle.
                    if (isHost || totalTestSecondsLeft <= 0) {
                      await endLiveMcqBattle(currentRoom.id).catch(console.warn);
                    }
                  } catch (error) {
                    console.warn('[GroupStudy] Manual test submit failed:', error);
                    setSubmitError('Submit save nahi ho paya. Internet connection check karke dobara try karein.');
                  } finally {
                    setIsSubmittingBatch(false);
                  }
                }}
                disabled={isSubmittingBatch}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer shadow-lg"
              >
                {isSubmittingBatch ? 'Submit ho raha hai…' : 'Haan, Submit Karein'}
              </button>
            </div>
            {submitError && (
              <p role="alert" className="text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                {submitError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── ANTI-CHEATING DISQUALIFIED MODAL (2nd Minimize Violation -> Auto Exit) ── */}
      {showDisqualifiedModal && (
        <div className="fixed inset-0 z-[10002] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center ring-4 ring-rose-500/20">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🚫
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-black uppercase tracking-wider mb-2">
                Room Se Disqualified
              </div>
              <h3 className="text-lg font-black text-white">Aapko Room Se Exit Kar Diya Gaya Hai!</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Aapne live test ke dauran <b>2 baar app minimize ya switch kiya</b>. Fair competition policy ke mutabiq aapka test terminate kar diya gaya hai.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-left space-y-2 text-xs text-rose-200">
              <div className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✓</span>
                <span>Ab tak ke attempt kiye gaye sawalon ka score submit ho chuka hai.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">⏭️</span>
                <span>Bache huye sabhi questions ko <b>SKIP (Unanswered)</b> maan liya gaya hai.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowDisqualifiedModal(false);
                setIsDisqualifiedFromRoom(false);
                setMinimizeWarningCount(0);
                setCurrentRoom(null);
                if (onActiveRoomChange) onActiveRoomChange(null);
              }}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xl active:scale-95 transition cursor-pointer"
            >
              Lobby Mein Wapas Jayein 🚪
            </button>
          </div>
        </div>
      )}

      {/* ── DETAILED REVISION HUB MARKSHEET MODAL ── */}
      {showDetailedMarksheet && (() => {
        const liveMcq = currentRoom?.liveMcq;
        const questions = liveMcq?.questions || [];
        const totalQ = liveMcq?.totalQuestions || questions.length;
        const myScore = user?.id ? liveMcq?.scores?.[user.id] : undefined;
        const correctCount = myScore?.correctCount ?? localBattleStats.correctCount;
        const wrongCount = myScore?.wrongCount ?? localBattleStats.wrongCount;
        const myAccuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
        const allAnswersMap = liveMcq?.questionAnswers || {};
        const fallbackResult: MCQResult = currentExamResult || {
          id: `study_room_${currentRoom?.id || 'exam'}_${Date.now()}`,
          userId: user?.id || 'student',
          chapterId: currentRoom?.id || 'room_test',
          chapterTitle: currentRoom?.preloadedTitle || currentRoom?.name || 'Study Room MCQ Battle',
          subjectId: currentRoom?.subject || 'GROUP_STUDY',
          subjectName: currentRoom?.subject || 'Group Study',
          topic: currentRoom?.name || 'MCQ Practice',
          date: new Date().toISOString(),
          score: correctCount,
          totalQuestions: totalQ,
          correctCount,
          wrongCount,
          totalTimeSeconds: Math.round(totalQ * (selectedTimerDuration || 20)),
          averageTimePerQuestion: selectedTimerDuration || 20,
          performanceTag: myAccuracy >= 80 ? 'EXCELLENT' : myAccuracy >= 50 ? 'GOOD' : 'BAD',
          userAnswers: (user?.id ? allAnswersMap : {}) as any,
          wrongQuestions: [],
          topicAnalysis: {},
          omrData: [],
          questions: (questions || []).map((q, qIndex) => ({
            id: q.id || `q_${qIndex}`,
            question: q.question,
            statements: q.statements,
            options: q.options,
            correctAnswer: q.correctIndex,
            explanation: q.explanation || '',
            topic: (q as any).topic || currentRoom?.subject || 'General',
          })),
        };

        return (
          <div className="fixed inset-0 z-[12000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-4xl relative my-auto">
              <button
                type="button"
                onClick={() => setShowDetailedMarksheet(false)}
                className="absolute -top-3 -right-3 z-50 w-9 h-9 rounded-full bg-slate-800 border-2 border-slate-600 text-white flex items-center justify-center hover:bg-slate-700 shadow-xl cursor-pointer"
              >
                ✕
              </button>
              <MarksheetCard
                result={fallbackResult}
                user={user}
                questions={fallbackResult.questions as any}
                onClose={() => setShowDetailedMarksheet(false)}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};
