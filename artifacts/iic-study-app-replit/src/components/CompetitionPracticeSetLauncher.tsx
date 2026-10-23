// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Trophy,
  Lock,
  Unlock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Star,
  FileText,
  X,
  Zap,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Share2,
  Check
} from 'lucide-react';
import {
  PracticeSetMeta,
  PRACTICE_SETS_CONFIG,
  buildPracticeSetQuestions,
} from '../utils/competitionPracticeSets';
import { buildClassAutoPracticeSets } from '../utils/classAutoPracticeSets';
import { subscribeMcqLessons } from '../firebase';
import { isSubscriptionFromCoins } from '../utils/subscriptionUtils';
import { CompetitionPracticeSetModal } from './CompetitionPracticeSetModal';
import { SetLeaderboardModal } from './SetLeaderboardModal';
import { hapticLight, hapticStrong } from '../utils/haptic';

interface Props {
  user: any;
  settings: any;
  compMcqPracticeLessons?: any[];
  isDarkMode?: boolean;
  onOpenStore?: () => void;
  onClose?: () => void;
}

export const CompetitionPracticeSetLauncher: React.FC<Props> = ({
  user,
  settings,
  compMcqPracticeLessons = [],
  isDarkMode = false,
  onOpenStore,
  onClose
}) => {
  const [selectedSet, setSelectedSet] = useState<PracticeSetMeta | null>(null);
  const [drawerSet, setDrawerSet] = useState<PracticeSetMeta | null>(null);
  const [activeLeaderboardSet, setActiveLeaderboardSet] = useState<PracticeSetMeta | null>(null);
  const [showVipLockAlert, setShowVipLockAlert] = useState<{
    open: boolean;
    title: string;
    isFromCoins?: boolean;
    hasNoSub?: boolean;
  } | null>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);

  // Weekly countdown info for banner
  const weekCountdown = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const daysUntilSunday = (7 - day) % 7;
    const nextSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59);
    const diffMs = Math.max(0, nextSunday.getTime() - now.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION & LOCKING RULES
  // 1. Both Basic & Ultra sets are premium (require subscription).
  // 2. Basic subscription unlocks BOTH Bihar Police (Basic) & BSSC (Ultra) sets!
  // 3. Subscriptions acquired with credits/coins do NOT unlock ("credit se liya hua subscription pe na milega").
  // 4. Sets 1 & 2 of Bihar Police AND Sets 1 & 2 of BSSC are completely FREE!
  // ─────────────────────────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN';
  const isFromCoins = isSubscriptionFromCoins(user);
  
  // Real active subscription (excluding coin/credit purchases)
  const isSubscribedPaid = !isFromCoins && (
    Boolean(user?.isPremium) ||
    Boolean(user?.subscriptionLevel) ||
    Boolean(user?.subscriptionEndDate && new Date(user.subscriptionEndDate).getTime() > Date.now())
  );
  
  const hasAccessToPremiumSets = isAdmin || isSubscribedPaid;

  // Real-time lessons listener to automatically form Class 10 & 12 subject sets
  useEffect(() => {
    const unsub = subscribeMcqLessons(lessons => {
      setAllLessons(lessons || []);
    });
    return unsub;
  }, []);

  // Auto-generated Class 10 Subject Sets
  const class10Sets = useMemo(() => {
    return buildClassAutoPracticeSets('10', allLessons, settings);
  }, [allLessons, settings]);

  // Auto-generated Class 12 Subject Sets
  const class12Sets = useMemo(() => {
    return buildClassAutoPracticeSets('12', allLessons, settings);
  }, [allLessons, settings]);

  // Convert custom practice sets configured by Admin
  const customSetsAsMeta: (PracticeSetMeta & { customQuestions?: any[]; isCustom?: boolean; isSubjectSet?: boolean })[] = (settings?.customPracticeSets || []).map((cs: any, idx: number) => ({
    id: cs.id,
    setNumber: 100 + idx,
    type: (cs.type === 'ULTRA' ? 'ULTRA' : 'BASIC') as any,
    title: cs.title,
    subtitle: cs.subtitle || `${cs.questions?.length || 0} प्रश्न · ${cs.durationMinutes || (cs.type === 'ULTRA' ? 120 : 60)} मिनट`,
    description: cs.description || `${cs.targetExam || 'प्रतियोगिता परीक्षा'} स्पेशल अभ्यास सेट।`,
    targetExam: cs.targetExam || (cs.type === 'ULTRA' ? 'BSSC Inter Level / SSC' : 'Bihar Police Constable'),
    durationMinutes: cs.durationMinutes || (cs.type === 'ULTRA' ? 120 : 60),
    totalQuestions: cs.questions?.length || (cs.type === 'ULTRA' ? 150 : 100),
    negativeMarking: cs.negativeMarking ?? (cs.type === 'ULTRA'),
    marksPerQuestion: cs.marksPerQuestion || 1,
    negativePenalty: cs.negativePenalty ?? (cs.type === 'ULTRA' ? 0.25 : 0),
    sections: [
      { id: 'gk', name: 'General Knowledge', hindiName: 'सामान्य ज्ञान (GK)', icon: '📖', targetCount: Math.round((cs.questions?.length || 100) * 0.5) },
      { id: 'gs', name: 'General Science', hindiName: 'सामान्य विज्ञान (GS)', icon: '🔬', targetCount: Math.round((cs.questions?.length || 100) * 0.3) },
      { id: 'math', name: 'Mathematics', hindiName: 'गणित (Math)', icon: '🔢', targetCount: Math.round((cs.questions?.length || 100) * 0.2) }
    ],
    customQuestions: cs.questions,
    isCustom: true
  }));

  // Convert subject-wise question pools into practice sets for subject-level training
  const subjectSetsAsMeta: (PracticeSetMeta & { customQuestions?: any[]; isCustom?: boolean; isSubjectSet?: boolean })[] = (settings?.subjectMcqPools || []).map((pool: any, idx: number) => ({
    id: pool.id,
    setNumber: 200 + idx,
    type: 'BASIC' as any,
    title: pool.setName,
    subtitle: `${pool.questions?.length || 0} प्रश्न · 15 मिनट · ${pool.subjectLabel || pool.subject}`,
    description: `${pool.targetExam || 'प्रतियोगिता परीक्षा'} — ${pool.subjectLabel || pool.subject} स्पेशल विषय टेस्ट।`,
    targetExam: pool.targetExam || 'General',
    durationMinutes: Math.max(10, Math.round((pool.questions?.length || 10) * 1.2)),
    totalQuestions: pool.questions?.length || 10,
    negativeMarking: false,
    marksPerQuestion: 1,
    negativePenalty: 0,
    sections: [
      { id: 'gk', name: pool.subjectLabel || 'Subject Practice', hindiName: pool.subjectLabel || 'विषय टेस्ट', icon: '📚', targetCount: pool.questions?.length || 10 }
    ],
    customQuestions: pool.questions,
    isCustom: true,
    isSubjectSet: true
  }));

  // Combine all available sets
  const allAvailableSets = useMemo(() => [
    ...PRACTICE_SETS_CONFIG,
    ...customSetsAsMeta,
    ...subjectSetsAsMeta,
    ...class10Sets,
    ...class12Sets
  ], [customSetsAsMeta, subjectSetsAsMeta, class10Sets, class12Sets]);

  // Check if a specific set is free for all users:
  // - Bihar Police (Basic) Set 1 & Set 2 are FREE!
  // - BSSC (Ultra) Set 1 & Set 2 are FREE!
  // - Class 10 & 12 Board sets are FREE!
  const isSetFree = (meta?: PracticeSetMeta | null) => {
    if (!meta) return true;
    if ((meta as any).isClassSet) return true;
    if ((meta as any).isSubjectSet) return true;

    // Bihar Police: Set 1 & Set 2 free
    if (meta.type === 'BASIC' && (meta.setNumber === 1 || meta.setNumber === 2)) {
      return true;
    }

    // BSSC / SSC: Set 1 & Set 2 free
    if (meta.type === 'ULTRA' && (meta.setNumber === 1 || meta.setNumber === 2)) {
      return true;
    }

    return false;
  };

  // Check if a set is locked for the current student
  const checkSetLocked = (meta?: PracticeSetMeta | null): boolean => {
    if (!meta) return false;
    if (isAdmin) return false;
    if (isSetFree(meta)) return false;

    // Set 3+ requires subscription. Basic subscription unlocks both Basic & Ultra sets.
    // Credit-acquired subscriptions do NOT unlock.
    return !hasAccessToPremiumSets;
  };

  const handleStartSet = (meta: PracticeSetMeta) => {
    hapticLight();

    if (checkSetLocked(meta)) {
      hapticStrong();
      setShowVipLockAlert({
        open: true,
        title: meta.title,
        isFromCoins: isFromCoins,
        hasNoSub: !user?.isPremium
      });
      return;
    }

    // Unlocked -> Launch Modal
    setSelectedSet(meta);
    setDrawerSet(null);
  };

  const handleOpenDrawer = (meta: PracticeSetMeta) => {
    hapticLight();
    setDrawerSet(meta);
  };

  return (
    <div className="space-y-4 max-w-5xl w-full mx-auto">
      {/* ── ULTRA-PREMIUM HEADER HERO BANNER (Clean, Uncluttered, No Search/Sub-Filters) ── */}
      <div className="relative rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          {/* Top Micro Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>सेट 1 व 2 सभी के लिए मुफ़्त (Free)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Clock size={11} />
              <span>साप्ताहिक रैंक रीसेट: {weekCountdown}</span>
            </span>
          </div>

          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
            प्रैक्टिस सेट्स व साप्ताहिक रैंक हब
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            बिहार पुलिस (100 Qs) व BSSC (150 Qs) के सेट 1 व 2 सभी विद्यार्थियों के लिए बिल्कुल मुफ़्त हैं। बेसिक सब्सक्रिप्शन लेने पर आगे के सभी बिहार पुलिस व BSSC अल्ट्रा सेट्स भी अनलॉक हो जाएंगे।
          </p>

          {/* Quick Key Highlights */}
          <div className="flex items-center gap-2.5 text-[11px] text-slate-400 pt-1 flex-wrap font-medium">
            <span className="flex items-center gap-1 text-emerald-300 font-bold">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>2 बिहार पुलिस + 2 BSSC मुफ़्त</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-indigo-300 font-bold">
              <Sparkles size={13} className="text-indigo-400" />
              <span>बेसिक सब्सक्रिप्शन में अल्ट्रा सेट्स शामिल</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <Trophy size={13} className="text-amber-400" />
              <span>साप्ताहिक लाइव रैंक</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── SETS GRID (ELEVATED PREMIUM CARDS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {allAvailableSets.map(meta => {
          const isBasic = meta.type === 'BASIC';
          const isClassSet = Boolean((meta as any).isClassSet);
          const isSubject = Boolean((meta as any).isSubjectSet);
          const isFree = isSetFree(meta);
          const isLocked = checkSetLocked(meta);

          return (
            <div
              key={meta.id}
              onClick={() => handleOpenDrawer(meta)}
              className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden group cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-0.5 ${
                isLocked
                  ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                  : isClassSet
                  ? 'bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-slate-900/90 border-slate-800 hover:border-emerald-500/50'
                  : isBasic
                  ? 'bg-gradient-to-br from-slate-900/90 via-blue-950/25 to-slate-900/90 border-slate-800 hover:border-blue-500/50'
                  : 'bg-gradient-to-br from-slate-900/90 via-amber-950/25 to-slate-900/90 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              {/* Top Pill / Badge row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isClassSet ? (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles size={10} />
                      <span>कक्षा {(meta as any).classLevel} ऑटो-सेट</span>
                    </span>
                  ) : isSubject ? (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      📚 विषय-वार टेस्ट
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      isBasic
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isBasic ? 'बिहार पुलिस · 100 Qs' : 'BSSC / SSC · 150 Qs'}
                    </span>
                  )}

                  <span className="text-[10px] text-slate-400 font-medium">
                    {isClassSet
                      ? `${(meta as any).subjectLabel || 'बोर्ड'} स्पेशल`
                      : (meta.targetExam || 'प्रतियोगिता परीक्षा')}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isFree ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                      <Unlock size={11} />
                      <span>मुफ़्त (Free)</span>
                    </span>
                  ) : isLocked ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-black border border-amber-500/30">
                      <Lock size={11} />
                      <span>प्रीमियम सेट</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                      <Unlock size={11} />
                      <span>अनलॉक्ड (VIP)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-sm sm:text-base font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {meta.title}
              </h3>
              <p className="text-xs text-slate-300/80 mt-1 line-clamp-2 leading-relaxed">
                {meta.description}
              </p>

              {/* Unboxed Metadata (Zero-pill discipline) */}
              <div className="flex items-center flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-medium text-slate-300">
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock size={12} className="text-indigo-400" />
                  <span>{meta.durationMinutes} Min</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <FileText size={12} className="text-indigo-400" />
                  <span>{meta.totalQuestions} प्रश्न</span>
                </span>
                <span className="text-slate-600">·</span>
                {meta.negativeMarking ? (
                  <span className="text-rose-400 font-bold">
                    -0.25 Negative
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">
                    No Negative
                  </span>
                )}
                <span className="text-slate-600">·</span>
                <span className="text-amber-300/90 font-medium">
                  🏆 साप्ताहिक रैंक
                </span>
              </div>

              {/* Section mini badges */}
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 font-bold">
                {meta.sections.map(s => (
                  <span key={s.id} className="bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded">
                    {s.icon} {s.hindiName.split(' ')[0]}: {s.targetCount}Q
                  </span>
                ))}
              </div>

              {/* Action Buttons: Leaderboard & Start Test */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    setActiveLeaderboardSet(meta);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Trophy size={13} className="text-amber-400" />
                  <span>लीडरबोर्ड</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDrawer(meta);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                    isLocked
                      ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                      : isFree
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                      : isBasic
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30'
                      : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/30'
                  }`}
                >
                  {isLocked ? (
                    <>
                      <Lock size={13} />
                      <span>अनलॉक VIP</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} className="fill-current" />
                      <span>{isFree ? 'मुफ़्त टेस्ट शुरू करें' : 'टेस्ट शुरू करें'}</span>
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── ULTRA-PREMIUM TEST LAUNCH DRAWER (BOTTOM SHEET) ──                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {drawerSet && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          style={{ zIndex: 9999999 }}
          onClick={() => setDrawerSet(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-[32px] sm:rounded-3xl border border-indigo-500/40 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col max-h-[84vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-8 duration-250 pb-0"
          >
            {/* Top Pull Notch for Mobile Gesture Affordance */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-600" />
            </div>

            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isSetFree(drawerSet)
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : drawerSet.type === 'ULTRA'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {isSetFree(drawerSet)
                      ? '🟢 मुफ़्त सेट (Set 1 & 2)'
                      : drawerSet.type === 'ULTRA'
                      ? 'ULTRA MOCK SET'
                      : 'BASIC MOCK SET'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {drawerSet.targetExam}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  {drawerSet.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setDrawerSet(null)}
                className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="बंद करें"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Drawer Body with ample bottom padding */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar flex-1 pb-10">
              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">समय सीमा</div>
                  <div className="text-sm sm:text-base font-black text-white mt-0.5 flex items-center justify-center gap-1">
                    <Clock size={14} className="text-indigo-400" />
                    <span>{drawerSet.durationMinutes} Min</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">कुल प्रश्न</div>
                  <div className="text-sm sm:text-base font-black text-white mt-0.5 flex items-center justify-center gap-1">
                    <FileText size={14} className="text-indigo-400" />
                    <span>{drawerSet.totalQuestions} Qs</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">नेगेटिव अंक</div>
                  <div className="text-sm sm:text-base font-black mt-0.5">
                    {drawerSet.negativeMarking ? (
                      <span className="text-rose-400">-0.25 Mark</span>
                    ) : (
                      <span className="text-emerald-400">शून्य (0)</span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">साप्ताहिक रैंक</div>
                  <div className="text-sm sm:text-base font-black text-amber-300 mt-0.5 flex items-center justify-center gap-1">
                    <Trophy size={14} className="text-amber-400" />
                    <span>Live State</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {drawerSet.description}
              </div>

              {/* Section Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span>विषयवार प्रश्नों का विवरण (Syllabus Split)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    कुल {drawerSet.totalQuestions} प्रश्न
                  </span>
                </div>

                {/* Progress bar visualizing distribution */}
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  {drawerSet.sections.map((sec, idx) => {
                    const pct = Math.round((sec.targetCount / drawerSet.totalQuestions) * 100);
                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];
                    return (
                      <div
                        key={sec.id}
                        style={{ width: `${pct}%` }}
                        className={`${colors[idx % colors.length]} transition-all`}
                        title={`${sec.name}: ${sec.targetCount} प्रश्न (${pct}%)`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {drawerSet.sections.map(sec => (
                    <div
                      key={sec.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
                    >
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span>{sec.icon}</span>
                        <span>{sec.hindiName}</span>
                      </span>
                      <span className="font-black text-indigo-300">
                        {sec.targetCount} प्रश्न
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guidelines & Rules Checklist */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <h4 className="font-black text-white flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>महत्वपूर्ण परीक्षा निर्देश (Guidelines):</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>टेस्ट शुरू करते ही टाइमर चालू हो जाएगा, समय समाप्त होने पर टेस्ट स्वतः सबमिट हो जाएगा।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>सभी विद्यार्थियों के लिए समान प्रश्न पत्र रहेगा ताकि साप्ताहिक रैंकिंग निष्पक्ष रहे।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>सबमिट करने के बाद आपकी रैंक, मार्क्स व सम्पूर्ण हल व्याख्या सहित उपलब्ध होगी।</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Sticky Bottom Actions - Elevated with extra safe-area padding for mobile navigation */}
            <div className="p-4 pt-3 pb-10 sm:pb-4 border-t border-slate-800/90 bg-slate-950/98 backdrop-blur-xl flex items-center gap-2.5 shrink-0 shadow-[0_-12px_24px_rgba(0,0,0,0.5)]">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveLeaderboardSet(drawerSet);
                }}
                className="py-3 px-3.5 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 shadow-md"
              >
                <Trophy size={14} className="text-amber-400" />
                <span>साप्ताहिक रैंक</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartSet(drawerSet)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 cursor-pointer ${
                  checkSetLocked(drawerSet)
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/50'
                    : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/50 ring-2 ring-indigo-400/40'
                }`}
              >
                {checkSetLocked(drawerSet) ? (
                  <>
                    <Lock size={15} />
                    <span>अनलॉक करने के लिए सब्सक्रिप्शन लें</span>
                  </>
                ) : (
                  <>
                    <Play size={15} className="fill-current" />
                    <span>{isSetFree(drawerSet) ? 'मुफ़्त टेस्ट शुरू करें' : 'अभी टेस्ट शुरू करें'}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── VIP LOCK PROMPT MODAL ── */}
      {showVipLockAlert?.open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          style={{ zIndex: 9999999 }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto text-2xl shadow-lg">
              🔒
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                प्रीमियम प्रैक्टिस सेट
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                {showVipLockAlert.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {showVipLockAlert.isFromCoins ? (
                  <>
                    ⚠️ आपने <strong className="text-amber-300">क्रेडिट्स (Coins)</strong> से सब्सक्रिप्शन लिया है। प्रैक्टिस सेट्स केवल <strong>डायरेक्ट मुख्य सब्सक्रिप्शन</strong> पर उपलब्ध हैं।
                  </>
                ) : (
                  <>
                    बिहार पुलिस व BSSC के सेट 1 व 2 सभी के लिए मुफ़्त हैं। सेट 3 और आगे के सभी सेट्स अनलॉक करने के लिए सब्सक्रिप्शन आवश्यक है।
                  </>
                )}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-left text-xs space-y-1.5 text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>सब्सक्रिप्शन के विशेष फायदे:</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Check size={12} className="text-emerald-400" />
                <span>बेसिक सब्सक्रिप्शन में बिहार पुलिस + BSSC अल्ट्रा सेट्स दोनों शामिल</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Check size={12} className="text-emerald-400" />
                <span>60 व 120 मिनट का रियल एग्जाम टाइमर एवं निगेटिव मार्किंग</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Check size={12} className="text-emerald-400" />
                <span>राज्य स्तरीय साप्ताहिक रैंक एवं संपूर्ण व्याख्या</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowVipLockAlert(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-black border border-slate-700 cursor-pointer"
              >
                बंद करें
              </button>
              {onOpenStore && (
                <button
                  type="button"
                  onClick={() => {
                    setShowVipLockAlert(null);
                    onOpenStore();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  स्टोर / अपग्रेड करें
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── TEST MODAL LAUNCHER ── */}
      {selectedSet && (
        <CompetitionPracticeSetModal
          meta={selectedSet}
          user={user}
          questions={
            (selectedSet as any).customQuestions?.length > 0
              ? (selectedSet as any).customQuestions.map((q: any, i: number) => ({
                  ...q,
                  sectionId: q.sectionId || 'gk',
                  setQuestionNumber: i + 1
                }))
              : buildPracticeSetQuestions(selectedSet, {
                  lucentNotes: settings?.lucentNotes || [],
                  competitionMcqs: settings?.competitionMcqs || [],
                  mcqLessons: compMcqPracticeLessons,
                  customMcqs: user?.customMcqs || []
                })
          }
          onClose={() => setSelectedSet(null)}
          onSaveResult={(res) => {
            // Callback for result handling
          }}
        />
      )}

      {/* ── SET LEADERBOARD MODAL ── */}
      {activeLeaderboardSet && (
        <SetLeaderboardModal
          setId={activeLeaderboardSet.id}
          setTitle={activeLeaderboardSet.title}
          targetExam={activeLeaderboardSet.targetExam}
          maxMarks={activeLeaderboardSet.totalQuestions * (activeLeaderboardSet.marksPerQuestion || 1)}
          user={user}
          isOpen={Boolean(activeLeaderboardSet)}
          onClose={() => setActiveLeaderboardSet(null)}
        />
      )}
    </div>
  );
};
