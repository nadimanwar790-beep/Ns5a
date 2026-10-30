import React, { useMemo } from 'react';
import { ClassLevel, Subject, Stream, Board, SystemSettings, LucentNoteEntry, HomeworkItem } from '../types';
import { getSubjectsList } from '../constants';
import { Calculator, FlaskConical, Languages, Globe2, BookMarked, History, TrendingUp, Briefcase, Landmark, Feather, Home, HeartPulse, Activity, Cpu, ChevronRight, ArrowLeft } from 'lucide-react';
import type { ContentIndexMap } from '../firebase';
import { useAppTheme } from '../utils/themeContext';
import { computeSubjectStats, computeHwSubjectStats, type SubjectLessonStats } from '../utils/subjectProgressStore';
import { formatDuration } from '../utils/routineAutoTrack';

interface Props {
  classLevel: ClassLevel;
  stream: Stream | null;
  board?: Board;
  onSelect: (subject: Subject) => void;
  onBack: () => void;
  hideBack?: boolean;
  initialParentSubject?: string | null;
  settings?: SystemSettings | null;
  contentIndex?: ContentIndexMap;
  lucentNotes?: LucentNoteEntry[];
  subscriptionLevel?: string;
  isPremium?: boolean;
  listCardBg?: string;
  listCardBorder?: string;
  onOpenPracticeSets?: () => void;
}

const SubjectIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => {
  switch (icon) {
    case 'math':     return <Calculator className={className} />;
    case 'science':
    case 'physics':
    case 'flask':    return <FlaskConical className={className} />;
    case 'bio':      return <HeartPulse className={className} />;
    case 'english':
    case 'hindi':
    case 'sanskrit':
    case 'book':     return <Languages className={className} />;
    case 'social':
    case 'geo':      return <Globe2 className={className} />;
    case 'computer': return <Cpu className={className} />;
    case 'history':  return <History className={className} />;
    case 'accounts': return <TrendingUp className={className} />;
    case 'business': return <Briefcase className={className} />;
    case 'gov':      return <Landmark className={className} />;
    case 'ppl':      return <BookMarked className={className} />;
    case 'mind':     return <Feather className={className} />;
    case 'home':     return <Home className={className} />;
    case 'active':   return <Activity className={className} />;
    default:         return <BookMarked className={className} />;
  }
};

interface SubjectStats { notes: number; pdf: number; video: number; audio: number; mcq: number; lucentNotes: number; }

const getSubjectStats = (
  subject: Subject,
  classLevel: string,
  board: string,
  contentIndex: ContentIndexMap,
  lucentNotes: LucentNoteEntry[],
  settings?: SystemSettings | null
): SubjectStats => {
  if (classLevel === 'COMPETITION') {
    if (subject.id === 'lucent') {
      const lessons = lucentNotes.length;
      let mcqTotal = 0;
      lucentNotes.forEach(n => {
        (n.pages || []).forEach(p => {
          if ((p as any).mcqs && Array.isArray((p as any).mcqs)) mcqTotal += (p as any).mcqs.length;
        });
      });
      const totalPages = lucentNotes.reduce((sum, n) => sum + (n.pages || []).length, 0);
      return { notes: lessons, pdf: totalPages, video: 0, audio: 0, mcq: mcqTotal, lucentNotes: 0 };
    }
    const homeworkItems = (settings?.homework || []).filter((hw: any) => hw.targetSubject === subject.id);
    let notes = 0, mcq = 0, audio = 0, video = 0, pdf = 0;
    homeworkItems.forEach((hw: any) => {
      if (hw.notes || hw.chunkNotes || hw.htmlNotes) notes++;
      if (hw.parsedMcqs && hw.parsedMcqs.length > 0) mcq += hw.parsedMcqs.length;
      if (hw.audioUrl) audio++;
      if (hw.videoUrl) video++;
      if (hw.pdfUrl) pdf++;
    });
    const bookLucentCount = lucentNotes.filter(
      (n: any) => (n.bookName?.trim() || 'Lucent') === subject.name.trim()
    ).length;
    notes += bookLucentCount;
    return { notes, pdf, video, audio, mcq, lucentNotes: 0 };
  }

  const prefix = `nst_content_${board}_${classLevel}_`;
  const subjectNameLower = subject.name.toLowerCase().replace(/\s+/g, '_');
  const subjectIdLower = subject.id.toLowerCase().replace(/\s+/g, '_');
  let notes = 0, pdf = 0, video = 0, audio = 0, mcq = 0;

  Object.entries(contentIndex).forEach(([key, entry]) => {
    if (!key.startsWith(prefix)) return;
    const rest = key.slice(prefix.length);
    const restLower = rest.toLowerCase();
    const storedSubject = (entry.subject || '').toLowerCase().replace(/\s+/g, '_');
    if (!storedSubject && !restLower.startsWith(subjectNameLower + '_') && !restLower.startsWith(subjectIdLower + '_')) return;
    if (storedSubject && storedSubject !== subjectNameLower && storedSubject !== subjectIdLower) return;
    if (entry.notes)  notes++;
    if (entry.pdf)    pdf++;
    if (entry.video)  video++;
    if (entry.audio)  audio++;
    if (entry.mcq)    mcq++;
  });

  const lucentCount = lucentNotes.filter(n => {
    const nClass = (n as any).classLevel || 'COMPETITION';
    return nClass === classLevel && (n.subject || '').toLowerCase() === subject.id.toLowerCase();
  }).length;

  return { notes, pdf, video, audio, mcq, lucentNotes: lucentCount };
};

// ── Progress bar for school subjects + competition ─────────────────────────────
const LessonProgressBar: React.FC<{ stats: SubjectLessonStats; primary: string }> = ({ stats, primary }) => {
  if (stats.totalLessons === 0) return null;

  const pct = stats.coveragePct;
  const statusColor =
    pct === 0 ? '#64748b' :
    pct >= 80 ? '#16a34a' :
    pct >= 40 ? '#d97706' : '#2563eb';

  const timeLabel = stats.totalTimeSecs > 0 ? formatDuration(stats.totalTimeSecs) : null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Stats row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Lessons */}
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
          📖 {stats.completedLessons}/{stats.totalLessons}
        </span>
        {/* Total time */}
        {timeLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
            ⏱ {timeLabel}
          </span>
        )}
        {/* In-progress */}
        {stats.inProgressLessons > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
            ⏳ {stats.inProgressLessons} ongoing
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%`, background: statusColor }}
        />
      </div>

      {/* % label */}
      <p className="text-[10px] font-bold" style={{ color: statusColor }}>
        {pct === 0 ? 'Not started' : pct >= 100 ? '✅ Completed' : `${pct}% covered`}
      </p>
    </div>
  );
};

export const SubjectSelection: React.FC<Props> = ({
  classLevel, stream, board, onSelect, onBack, hideBack = false, settings,
  contentIndex = {}, lucentNotes = [], subscriptionLevel, isPremium,
  listCardBg, listCardBorder, onOpenPracticeSets,
}) => {
  const appTheme = useAppTheme();
  const subjects = useMemo(() => {
    const list = getSubjectsList(classLevel, stream, board, settings).filter(
      sub => !(settings?.hiddenSubjects || []).includes(sub.id)
    );
    const seen = new Set<string>();
    return list.filter(s => {
      if (!s || !s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [classLevel, stream, board, settings]);
  const currentBoard = board || 'CBSE';
  const isCompetition = classLevel === 'COMPETITION';
  const isSchoolClass = !isCompetition && ['6','7','8','9','10','11','12'].includes(String(classLevel));

  const tier = isPremium && subscriptionLevel === 'ULTRA'
    ? 'ultra'
    : isPremium && subscriptionLevel === 'BASIC'
      ? 'basic'
      : 'free';

  const tierHeaderColor = appTheme.primary;

  // Pre-compute per-subject lesson progress for school classes (class 6-12) AND competition
  const subjectProgressMap = useMemo(() => {
    const map: Record<string, SubjectLessonStats> = {};

    if (isSchoolClass && lucentNotes.length > 0) {
      subjects.forEach(subject => {
        const lessons = lucentNotes.filter(n =>
          String((n as any).classLevel) === String(classLevel) &&
          (n.subject || '').toLowerCase().trim() === subject.id.toLowerCase().trim() &&
          (!(n as any).board || (n as any).board === currentBoard)
        ) as LucentNoteEntry[];
        if (lessons.length > 0) {
          map[subject.id] = computeSubjectStats(lessons);
        }
      });
    } else if (isCompetition) {
      subjects.forEach(subject => {
        if (subject.id === 'lucent') {
          // All competition lucent notes (no classLevel set, or classLevel === 'COMPETITION')
          const lessons = lucentNotes.filter(n =>
            (n as any).classLevel === 'COMPETITION' || !(n as any).classLevel
          ) as LucentNoteEntry[];
          if (lessons.length > 0) {
            map[subject.id] = computeSubjectStats(lessons);
          }
        } else {
          // Homework-based competition subjects (Polity, History, Geography, etc.)
          const hwItems = ((settings?.homework || []) as HomeworkItem[]).filter(
            hw => hw.targetSubject === subject.id
          );
          if (hwItems.length > 0) {
            map[subject.id] = computeHwSubjectStats(hwItems);
          }
        }
      });
    }

    return map;
  }, [subjects, lucentNotes, classLevel, currentBoard, isSchoolClass, isCompetition, settings]);

  return (
    <div className="animate-in fade-in duration-200 mt-0 pt-0 overflow-x-hidden">
      {!hideBack && (
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            title="Wapas Jayein (Back)"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {isCompetition ? 'Competition Books' : `Class ${classLevel} Subjects`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {isCompetition ? 'Ek book chunein padhne ke liye' : `Class ${classLevel} ka subject chunein`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isCompetition && onOpenPracticeSets && (
          <button
            type="button"
            onClick={onOpenPracticeSets}
            className="w-full text-left p-4 sm:p-5 rounded-2xl border border-indigo-400/40 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-lg hover:shadow-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between group active:scale-[0.99] cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  🎯 Mock Sets
                </span>
                <span className="text-xs font-black text-indigo-300 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  प्रैक्टिस सेट →
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>📝</span>
                <span>प्रैक्टिस सेट (Practice Sets)</span>
              </h3>
              <p className="text-xs text-indigo-200/90 mt-1 leading-relaxed">
                बिहार पुलिस (100 Qs · 60 Min) एवं BSSC / SSC (150 Qs · 120 Min) के पूर्ण मॉडल टेस्ट।
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3.5 pt-2.5 border-t border-indigo-500/30 text-[11px] font-bold text-indigo-200">
              <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">👮 Basic Set</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/10">🏛️ Ultra Set</span>
              <span className="ml-auto text-amber-300 font-black flex items-center gap-1">✓ VIP Unlocked</span>
            </div>
          </button>
        )}
        {subjects.map((subject) => {
          const stats = getSubjectStats(subject, classLevel, currentBoard, contentIndex, lucentNotes, settings);
          const lessonProgress = subjectProgressMap[subject.id];

          const _cardStyle = (listCardBg || listCardBorder) ? {
            background: listCardBg || undefined,
            borderColor: listCardBorder || undefined,
            borderWidth: listCardBorder ? 2 : undefined,
            borderStyle: listCardBorder ? 'solid' : undefined,
          } : undefined;

          return (
            <button
              key={subject.id}
              onClick={() => onSelect(subject)}
              data-tier={tier}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col gap-0 active:scale-[0.98] text-left group cursor-pointer border-l-4 border-l-blue-600 dark:border-l-blue-500"
              style={_cardStyle}
            >
              {/* Top row: icon + title + arrow */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-xs">
                  <SubjectIcon icon={subject.icon} className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-base !text-slate-900 dark:!text-white group-hover:!text-blue-600 dark:group-hover:!text-blue-400 transition-colors truncate">
                    {subject.name}
                  </h3>

                  {/* Lesson progress bar (school subjects + competition books) */}
                  {lessonProgress ? (
                    <LessonProgressBar stats={lessonProgress} primary={tierHeaderColor} />
                  ) : settings == null ? (
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">Loading…</p>
                  ) : null}
                </div>
                <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

