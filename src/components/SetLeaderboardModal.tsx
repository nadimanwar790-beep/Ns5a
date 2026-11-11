// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Clock,
  Calendar,
  X,
  Users,
  Sparkles,
  Zap,
  Award,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Flame,
  ArrowRight
} from 'lucide-react';
import { SetLeaderboardEntry } from '../types';
import { fetchSetLeaderboard, getCurrentWeekInfo, WeekInfo } from '../utils/setLeaderboard';
import { hapticLight, hapticStrong } from '../utils/haptic';

interface Props {
  setId: string;
  setTitle: string;
  targetExam?: string;
  maxMarks?: number;
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onStartSet?: () => void;
}

export const SetLeaderboardModal: React.FC<Props> = ({
  setId,
  setTitle,
  targetExam = 'प्रतियोगिता परीक्षा',
  maxMarks = 25,
  user,
  isOpen,
  onClose,
  onStartSet
}) => {
  const [period, setPeriod] = useState<'CURRENT' | 'PREVIOUS' | 'ALL'>('CURRENT');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<SetLeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userEntry, setUserEntry] = useState<SetLeaderboardEntry | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo>(() => getCurrentWeekInfo());

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchSetLeaderboard(setId, period, user?.id, maxMarks)
      .then(res => {
        setEntries(res.entries);
        setUserRank(res.userRank);
        setUserEntry(res.userEntry);
        setWeekInfo(res.weekInfo);
      })
      .catch(err => {
        console.error('Failed to load set leaderboard:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setId, period, isOpen, user?.id, maxMarks]);

  if (!isOpen) return null;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs}s`;
  };

  return (
    <div className="fixed inset-0 z-[1000005] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden font-sans text-slate-100 animate-in zoom-in-95 duration-150">
        {/* ── HEADER ── */}
        <div className="shrink-0 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-lg">
              <Trophy size={22} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {targetExam}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Flame size={11} />
                  <span>साप्ताहिक अपडेट</span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                {setTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── WEEKLY COUNTDOWN & PERIOD TABS ── */}
        <div className="shrink-0 px-4 pt-3 pb-2 bg-slate-900/90 border-b border-slate-800 space-y-2.5">
          {/* Weekly Reset Info Banner */}
          <div className="p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={15} className="text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px] truncate">
                  सप्ताह {weekInfo.weekNumber} ({weekInfo.label})
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  हर हफ्ते रैंक रीसेट व नए टॉपर्स घोषित
                </div>
              </div>
            </div>
            <div className="shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-black text-[11px] border border-amber-500/30">
              ⏳ {weekInfo.formattedCountdown}
            </div>
          </div>

          {/* Period Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-800/70 rounded-xl border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setPeriod('CURRENT');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                period === 'CURRENT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap size={13} className={period === 'CURRENT' ? 'text-amber-300' : ''} />
              <span>⚡ इस सप्ताह</span>
            </button>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setPeriod('PREVIOUS');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                period === 'PREVIOUS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award size={13} className={period === 'PREVIOUS' ? 'text-amber-300' : ''} />
              <span>👑 पिछला सप्ताह</span>
            </button>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setPeriod('ALL');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                period === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={13} />
              <span>🌟 ऑल-टाइम</span>
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE LEADERBOARD BODY ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* USER'S OWN RANK HERO CARD */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-800/90 via-slate-800 to-indigo-950/60 border border-slate-700/80 shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-lg font-black shrink-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    '👤'
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                    <span>आपकी रैंकिंग (Your Performance)</span>
                  </div>
                  <div className="font-black text-white text-sm truncate">
                    {user?.name || user?.displayName || 'विद्यार्थी'}
                  </div>
                </div>
              </div>

              {userRank ? (
                <div className="text-right shrink-0">
                  <div className="text-base sm:text-lg font-black text-amber-400">
                    रैंक #{userRank}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold">
                    {userEntry?.marksObtained} / {userEntry?.maxMarks || maxMarks} ({userEntry?.percentage}%)
                  </div>
                </div>
              ) : (
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-700/80 text-slate-300 text-xs font-bold border border-slate-600">
                    अनलॉक नहीं
                  </span>
                </div>
              )}
            </div>

            {!userRank && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>आपने अभी तक इस सेट को सबमिट नहीं किया है।</span>
                {onStartSet && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onClose();
                      onStartSet();
                    }}
                    className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>टेस्ट दें</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TOP 3 PODIUM */}
          {top3.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Medal size={14} className="text-amber-400" />
                <span>साप्ताहिक शीर्ष 3 चैंपियंस (Weekly Top 3)</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="text-2xl mb-1">🥈</div>
                    <div className="text-[10px] font-black uppercase text-slate-400">रैंक 2</div>
                    <div className="font-bold text-xs text-white truncate w-full mt-0.5">
                      {top3[1].userName}
                    </div>
                    <div className="text-xs font-black text-slate-300 mt-1">
                      {top3[1].marksObtained} अंक
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      ⏱️ {formatTime(top3[1].timeSpentSeconds)}
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-800 border-2 border-amber-500/50 flex flex-col items-center text-center relative overflow-hidden shadow-lg scale-105 z-10">
                    <div className="absolute top-0 inset-x-0 h-1 bg-amber-400"></div>
                    <div className="text-2xl mb-1 animate-bounce">🥇</div>
                    <div className="text-[10px] font-black uppercase text-amber-400">चैंपियन (रैंक 1)</div>
                    <div className="font-black text-xs text-amber-200 truncate w-full mt-0.5">
                      {top3[0].userName}
                    </div>
                    <div className="text-sm font-black text-amber-400 mt-1">
                      {top3[0].marksObtained} अंक ({top3[0].percentage}%)
                    </div>
                    <div className="text-[9px] text-slate-300 font-mono">
                      ⏱️ {formatTime(top3[0].timeSpentSeconds)}
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="text-2xl mb-1">🥉</div>
                    <div className="text-[10px] font-black uppercase text-slate-400">रैंक 3</div>
                    <div className="font-bold text-xs text-white truncate w-full mt-0.5">
                      {top3[2].userName}
                    </div>
                    <div className="text-xs font-black text-slate-300 mt-1">
                      {top3[2].marksObtained} अंक
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      ⏱️ {formatTime(top3[2].timeSpentSeconds)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FULL LEADERBOARD LIST */}
          <div className="space-y-1.5">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between px-1">
              <span>सम्पूर्ण लीडरबोर्ड ({entries.length} प्रतिभागी)</span>
              <span className="text-[10px] text-slate-500 lowercase font-normal">हाई स्कोर व तेज समय</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-xs">लीडरबोर्ड लोड हो रहा है...</div>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-800/40 rounded-2xl border border-slate-800 p-4">
                इस सेट में अभी तक कोई स्कोर दर्ज नहीं हुआ है। पहले प्रतिभागी बनें!
              </div>
            ) : (
              <div className="space-y-1.5">
                {entries.map(item => {
                  const isCurrentUser = item.userId === user?.id;
                  const rankBadge =
                    item.rank === 1
                      ? '🥇'
                      : item.rank === 2
                      ? '🥈'
                      : item.rank === 3
                      ? '🥉'
                      : `#${item.rank}`;

                  return (
                    <div
                      key={item.id || item.userId}
                      className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 text-xs ${
                        isCurrentUser
                          ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                          : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60'
                      }`}
                    >
                      {/* Left: Rank & User Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            item.rank === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 text-base'
                              : item.rank === 2
                              ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40 text-base'
                              : item.rank === 3
                              ? 'bg-amber-800/20 text-amber-400 border border-amber-800/40 text-base'
                              : 'bg-slate-700/60 text-slate-400'
                          }`}
                        >
                          {rankBadge}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                            <span>{item.userName}</span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded-md bg-indigo-500 text-white text-[9px] font-black uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                            <span>⏱️ {formatTime(item.timeSpentSeconds)}</span>
                            <span>•</span>
                            <span className="text-emerald-400">✓ {item.correct || item.marksObtained} सही</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score & Percentage */}
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm text-white">
                          <span className="text-emerald-400">{item.marksObtained}</span>
                          <span className="text-slate-500 text-xs font-normal"> / {item.maxMarks}</span>
                        </div>
                        <div className="text-[10px] text-indigo-300 font-bold">
                          {item.percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          {onStartSet ? (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
                onStartSet();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white text-xs font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Zap size={14} className="text-amber-300" />
              <span>यह प्रैक्टिस सेट शुरू करें (Start Test)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              बंद करें (Close)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
