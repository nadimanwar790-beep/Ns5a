export interface Student {
  id: string;
  rollNo: string;
  admissionNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  classGrade: string;
  section: string;
  phone: string;
  email: string;
  photoUrl: string;
  address: string;
  admissionDate: string;
  monthlyFee: number;
  duesAmount: number;
}

export interface FeeBreakdown {
  tuitionFee: number;
  examFee: number;
  computerFee: number;
  transportFee: number;
  sportsFee: number;
  activityFee: number;
  lateFine: number;
  discount: number;
}

export interface FeeReceipt {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  rollNo: string;
  admissionNo: string;
  classGrade: string;
  section: string;
  month: string;
  year: number;
  session: string;
  paymentDate: string;
  breakdown: FeeBreakdown;
  subTotal: number;
  discount: number;
  lateFine: number;
  totalPayable: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: 'Cash' | 'UPI / QR' | 'Net Banking' | 'Cheque' | 'Card';
  transactionId?: string;
  status: 'Paid' | 'Partial' | 'Pending';
  remarks?: string;
  studentPhotoUrl: string;
  qrPayload: string;
  collectorName: string;
}

export interface SchoolConfig {
  name: string;
  tagline: string;
  affiliationNo: string;
  schoolCode: string;
  board: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  website: string;
  upiId: string;
  logoUrl?: string;
}

export interface LucentPageNote {
  id?: string;
  pageNo?: string | number;
  content?: string;
  chunkNotes?: string;
  mcqs?: any[];
  [key: string]: any;
}

export interface LucentNoteEntry {
  id: string;
  subject: string;
  bookName?: string;
  lessonTitle: string;
  classLevel?: string;
  board?: any;
  chapterId?: string;
  pages?: LucentPageNote[];
  mcqOnly?: boolean;
  createdAt?: string;
  [key: string]: any;
}

export interface AppFeedbackAnswer {
  questionId: string;
  question: string;
  rating?: number;
  text?: string;
  choice?: string;
  type?: string;
  [key: string]: any;
}

export interface AppFeedbackEntry {
  id: string;
  userId: string;
  userName: string;
  userRole?: any;
  userClass?: string;
  userBoard?: string;
  isPremium?: boolean;
  subscriptionTier?: string;
  answers: AppFeedbackAnswer[];
  overallRating: number;
  submittedAt: string;
  [key: string]: any;
}


// ── NSTA STUDY APP TYPES & INTERFACES ──────────────────────────────────────────

export type ClassLevel = string;
export type Language = 'HINDI' | 'ENGLISH' | 'HINGLISH' | string;
export type Board = 'CBSE' | 'ICSE' | 'BIHAR' | 'UP' | 'STATE' | string;
export type Stream = 'Science' | 'Commerce' | 'Arts' | string;
export type ContentType = 'NOTES' | 'VIDEO' | 'AUDIO' | 'MCQ' | 'PDF' | 'TEST' | string;
export type StudentTab = string;
export type ViewState = string;

export interface User {
  id: string;
  uid?: string;
  displayId?: string;
  name: string;
  email?: string;
  mobile?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN' | string;
  isGuest?: boolean;
  isAnonymous?: boolean;
  board?: string;
  classLevel?: string;
  stream?: string;
  credits?: number;
  diamonds?: number;
  streak?: number;
  longestStreak?: number;
  totalScore?: number;
  studyCoins?: number;
  studyMode?: string;
  profileCompleted?: boolean;
  createdAt?: string;
  lastLoginDate?: string;
  redeemedCodes?: string[];
  timedUnlocks?: Record<string, any>;
  savedNotes?: any[];
  testResults?: any[];
  [key: string]: any;
}

export interface Subject {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  classLevel?: string;
  stream?: string;
  board?: string;
  chaptersCount?: number;
  [key: string]: any;
}

export interface Chapter {
  id: string;
  title: string;
  description?: string;
  subjectName?: string;
  order?: number;
  isLocked?: boolean;
  notesCount?: number;
  mcqsCount?: number;
  [key: string]: any;
}

export interface LessonContent {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  type?: string;
  dateCreated?: string;
  subjectName?: string;
  videoPlaylist?: any[];
  audioPlaylist?: any[];
  pdfUrl?: string;
  [key: string]: any;
}

export interface MCQItem {
  id?: string;
  question?: string;
  options?: any;
  answer?: any;
  correctAnswer?: any;
  explanation?: string;
  subject?: string;
  chapter?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  [key: string]: any;
}

export interface MCQResult {
  id?: string;
  totalQuestions?: number;
  score?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  skipped?: number;
  accuracy?: number;
  timeSpentSeconds?: number;
  answers?: any[];
  date?: string;
  subjectName?: string;
  chapterTitle?: string;
  [key: string]: any;
}

export interface WeeklyTest {
  id?: string;
  title?: string;
  subject?: string;
  classLevel?: string;
  durationMinutes?: number;
  totalMarks?: number;
  questions?: MCQItem[];
  startDate?: string;
  endDate?: string;
  isLive?: boolean;
  [key: string]: any;
}

export interface Challenge20 {
  id?: string;
  date?: string;
  title?: string;
  subject?: string;
  questions?: MCQItem[];
  xpReward?: number;
  coinReward?: number;
  [key: string]: any;
}

export interface SystemSettings {
  appName?: string;
  appShortName?: string;
  appVersion?: string;
  contactNumber?: string;
  contactEmail?: string;
  websiteUrl?: string;
  maintenanceMode?: boolean;
  hiddenFeatures?: string[];
  splashFontId?: string;
  creditSubPlans?: any[];
  mcqLimitFree?: number;
  mcqLimitBasic?: number;
  mcqLimitUltra?: number;
  levelLimitsOverride?: Record<string, any>;
  levelScoreOverride?: Record<string, number>;
  [key: string]: any;
}

export type AppSettings = SystemSettings;

export interface MathImagePage {
  id?: string;
  pageNumber?: number;
  imageUrl?: string;
  [key: string]: any;
}

export interface PedroPageConfig {
  [key: string]: any;
}

export interface PedroSystemConfig {
  [key: string]: any;
}

export type AppFeature = string;

export interface InboxMessage {
  id?: string;
  title?: string;
  message?: string;
  sender?: string;
  date?: string;
  read?: boolean;
  actionUrl?: string;
  [key: string]: any;
}

export interface SubscriptionHistoryEntry {
  id?: string;
  planName?: string;
  amount?: number;
  date?: string;
  expiryDate?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | string;
  [key: string]: any;
}

export interface UniversalAnalysisLog {
  id?: string;
  userId?: string;
  timestamp?: string;
  activityType?: string;
  details?: any;
  [key: string]: any;
}

export interface QuestionBankItem {
  id?: string;
  question?: any;
  options?: any;
  answer?: any;
  subject?: string;
  classLevel?: string;
  [key: string]: any;
}

export interface PrizeRule {
  id: string;
  title: string;
  requiredScore: number;
  rewardType: string;
  rewardAmount: number;
  [key: string]: any;
}

export interface ActiveSubscription {
  id?: string;
  planId?: string;
  planName?: string;
  expiresAt?: string;
  tier?: string;
  [key: string]: any;
}

export interface CreditSubscriptionPlan {
  id?: string;
  name?: string;
  credits?: number;
  price?: number;
  durationDays?: number;
  [key: string]: any;
}

export interface UserCreditSubscription {
  id?: string;
  userId?: string;
  planId?: string;
  creditsRemaining?: number;
  expiryDate?: string;
  [key: string]: any;
}

export interface UserDiamondSubscription {
  id?: string;
  userId?: string;
  planId?: string;
  diamondsRemaining?: number;
  expiryDate?: string;
  [key: string]: any;
}

export interface DiamondPack {
  id?: string;
  name?: string;
  diamonds?: number;
  price?: number;
  [key: string]: any;
}

export interface DiamondSubscriptionPlan {
  id?: string;
  name?: string;
  diamondsPerDay?: number;
  dailyDiamonds?: number;
  durationDays?: number;
  price?: number;
  [key: string]: any;
}

export type MCQQuestionType = 'single_choice' | 'multiple_choice' | 'match_column' | 'assertion_reason' | string;

export interface MatchColumnRow {
  leftKey?: string;
  leftText?: string;
  rightKey?: string;
  rightText?: string;
  [key: string]: any;
}

export interface MatchColumnData {
  rows?: MatchColumnRow[];
  correctPairs?: Record<string, string>;
  [key: string]: any;
}

export interface ReferredUserRecord {
  userId?: string;
  userName?: string;
  dateJoined?: string;
  status?: string;
  rewardEarned?: number;
  isCompleted?: boolean;
  lastActiveAt?: string;
  joinedAt?: string;
  [key: string]: any;
}

export interface ReferralMilestone {
  inviteCount?: number;
  target?: number;
  rewardCoins?: number;
  rewardDiamonds?: number;
  rewardType?: string;
  credits?: number;
  diamonds?: number;
  subTier?: string;
  subLevel?: string;
  subDurationDays?: number;
  title?: string;
  rewardDescription?: string;
  [key: string]: any;
}

export interface ReferralCommissionLog {
  id?: string;
  referredUserId?: string;
  friendId?: string;
  amount?: number;
  date?: string;
  [key: string]: any;
}

export interface RevisionConfig {
  reviewIntervalDays?: number[];
  maxTopicsPerDay?: number;
  autoSchedule?: boolean;
  thresholds?: any;
  intervals?: any;
  [key: string]: any;
}

export interface RoutineTask {
  id?: string;
  title?: string;
  subject?: string;
  durationMinutes?: number;
  duration?: number;
  completed?: boolean;
  timeSlot?: string;
  [key: string]: any;
}

export interface DailyRoutine {
  id?: string;
  date?: string;
  tasks?: RoutineTask[];
  overallProgress?: number;
  focusArea?: string;
  [key: string]: any;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  [key: string]: any;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  details?: string;
  timestamp: string;
  userId?: string;
  [key: string]: any;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
  level: number;
  avatarUrl?: string;
  streak?: number;
  [key: string]: any;
}

export interface RecycleBinItem {
  id: string;
  type: string;
  originalData: any;
  deletedAt: string;
  deletedBy?: string;
}

export interface GiftCode {
  code: string;
  rewardType: string;
  rewardValue: number;
  maxUses: number;
  usesCount: number;
  expiryDate?: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  badge?: string;
}

export interface SpinReward {
  id: string;
  label: string;
  type: string;
  amount: number;
  probability: number;
  color: string;
}

export type SpinGameType = 'DAILY_WHEEL' | 'LUCKY_DICE' | 'CARD_SCRATCH' | string;

export interface HtmlModule {
  id: string;
  title: string;
  htmlContent: string;
  createdAt: string;
}

export interface PremiumNoteSlot {
  id: string;
  title: string;
  price: number;
  isUnlocked: boolean;
}

export interface ContentInfoItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

export interface ContentInfoConfig {
  items: ContentInfoItem[];
  themeColor?: string;
}

export interface DeepDiveEntry {
  id: string;
  topic: string;
  explanation: string;
  bulletPoints?: string[];
  formulaList?: string[];
}

export interface AdditionalNoteEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface TeacherStorePlan {
  id: string;
  title: string;
  price: number;
  commissionPercent: number;
}

export interface TeacherCode {
  code: string;
  teacherId: string;
  teacherName: string;
  discountPercent: number;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  completed: boolean;
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type?: string;
  read?: boolean;
}

export interface BroadcastRedeemCode {
  code: string;
  description: string;
  credits: number;
  diamonds?: number;
  expiresAt: string;
}

export interface LoginBonusRandomGiftOption {
  type: 'COINS' | 'DIAMONDS' | 'CREDITS' | 'THEME';
  amount: number;
  weight: number;
}

export interface TopicItem {
  id: string;
  name: string;
  subject: string;
  subjectName?: string;
  chapter?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVISED' | 'MASTERED';
  lastRevisedDate?: string;
  nextReviewDate?: string;
  confidenceScore?: number;
  [key: string]: any;
}

export interface AppState {
  user: User | null;
  selectedBoard?: string;
  selectedClass?: string;
  selectedStream?: string;
  selectedSubject?: Subject | null;
  selectedChapter?: Chapter | null;
  lessonContent?: LessonContent | null;
  view?: string;
  originalAdmin?: any;
}

export type PedroCategory = any;

export interface PedroItemDetail {
  id: string;
  name?: string;
  category?: PedroCategory;
  price?: number;
  icon?: string;
  previewUrl?: string;
  [key: string]: any;
}

export interface PlanCompareItem {
  id: string;
  title?: string;
  label?: string;
  tooltip?: string;
  free?: boolean | string;
  basic?: boolean | string;
  ultra?: boolean | string;
  [key: string]: any;
}

export interface PlanCompareGroup {
  id: string;
  name?: string;
  category?: string;
  icon?: any;
  items: PlanCompareItem[];
  [key: string]: any;
}
