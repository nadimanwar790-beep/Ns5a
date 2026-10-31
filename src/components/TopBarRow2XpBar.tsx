import React, { useState, useEffect, useRef } from 'react';
import { User, SystemSettings } from '../types';
import { getLevelInfo, getNextLevelInfo, getLevelProgress } from '../utils/levelSystem';
import { Zap } from 'lucide-react';

export function formatXpDisplay(num: number): string {
  if (num >= 1_000_000_000) {
    const inB = num / 1_000_000_000;
    return `${inB.toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (num >= 1_000_000) {
    const inM = num / 1_000_000;
    return `${inM.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 10_000) {
    const inK = num / 1000;
    return `${inK.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toString();
}

interface TopBarRow2XpBarProps {
  user: User;
  settings?: SystemSettings;
  activeTab: string;
  onOpenScorePanel: () => void;
  levelAnimOff?: boolean;
  isExpanded?: boolean;
}

export const TopBarRow2XpBar: React.FC<TopBarRow2XpBarProps> = ({
  user,
  settings,
  activeTab,
  onOpenScorePanel,
  levelAnimOff: propLevelAnimOff,
  isExpanded = false,
}) => {
  const isLevelAnimDisabled = propLevelAnimOff ?? (() => {
    try { return localStorage.getItem('nst_level_anim_off') === '1'; } catch { return false; }
  })();
  const currentTotalScore = user.totalScore || 0;
  const currentLevelInfo = getLevelInfo(currentTotalScore, settings);
  const nextLevelInfo = getNextLevelInfo(currentTotalScore);
  const currentLevelPct = getLevelProgress(currentTotalScore);

  // Track previous score to detect live score increases
  const prevScoreRef = useRef<number>(currentTotalScore);
  const isInitialMount = useRef<boolean>(true);

  // Displayed percentage for smooth bar
  const [displayedPct, setDisplayedPct] = useState<number>(currentLevelPct);

  // Animate bar smoothly on score increase without flashy animations
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevScoreRef.current = currentTotalScore;
      setDisplayedPct(currentLevelPct);
      return undefined;
    }

    const prev = prevScoreRef.current;
    if (currentTotalScore > prev && prev > 0) {
      const oldPct = getLevelProgress(prev);
      const newPct = getLevelProgress(currentTotalScore);

      setDisplayedPct(oldPct);
      const animTimer = setTimeout(() => {
        setDisplayedPct(newPct);
      }, 60);

      prevScoreRef.current = currentTotalScore;
      return () => clearTimeout(animTimer);
    } else {
      setDisplayedPct(currentLevelPct);
      prevScoreRef.current = currentTotalScore;
      return undefined;
    }
  }, [currentTotalScore, currentLevelPct]);

  const clampedPct = Math.min(100, Math.max(0, displayedPct));
  const levelColor = currentLevelInfo.color || '#38bdf8';
  const levelGlow = currentLevelInfo.glowColor || 'rgba(56,189,248,0.75)';

  return (
    <div className={`flex items-center gap-1.5 flex-1 min-w-0 mx-1 ${
      isExpanded ? 'max-w-none w-full' : 'max-w-[280px] sm:max-w-[360px]'
    }`}>
      {/* THE COMPACT XP STATUS BAR WITH HIGHLIGHTED BINDU (STATIC) */}
      <div
        id="topbar-row2-xp-track-container"
        onClick={onOpenScorePanel}
        className="relative flex-1 min-w-[50px] cursor-pointer py-1 group"
        title={`Level ${currentLevelInfo.level} (${Math.round(clampedPct)}%) — Tap karke details dekhein`}
      >
        {/* Track bar - sleek and thin */}
        <div className={`relative w-full rounded-full overflow-hidden bg-white/20 border border-white/25 ${
          isExpanded ? 'h-[3px] sm:h-[3.5px]' : 'h-[3.5px] sm:h-1'
        }`}>
          {/* Filled portion */}
          <div
            className="h-full rounded-full relative"
            style={{
              width: `${clampedPct}%`,
              background: `linear-gradient(90deg, ${levelColor}, #818cf8)`,
              boxShadow: `0 0 6px ${levelGlow}`,
              transition: 'width 0.8s ease-out',
            }}
          />
        </div>

        {/* HIGHLIGHTED BINDU (STATIC INDICATOR DOT) AT PROGRESS ENDPOINT */}
        <div
          id="topbar-row2-xp-bindu"
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{
            left: `${clampedPct}%`,
            transition: 'left 0.8s ease-out',
          }}
        >
          <div
            className={`rounded-full bg-white border border-amber-300 pointer-events-none ${
              isExpanded ? 'w-2 h-2 sm:w-2.5 sm:h-2.5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'
            }`}
            style={{
              boxShadow: `0 0 4px ${levelGlow}`,
            }}
          />
        </div>
      </div>

      {/* LEVEL DISPLAY: Clean static text "Lev - 1", "Lev - 2", no animations */}
      <button
        id="topbar-row2-total-xp-btn"
        onClick={onOpenScorePanel}
        className="bg-transparent border-0 p-0 shadow-none inline-flex items-center active:scale-95 transition-transform shrink-0 cursor-pointer select-none group"
        title={`Level ${currentLevelInfo.level} (${formatXpDisplay(currentTotalScore)} XP) — Tap karke details dekhein`}
      >
        <span className="font-extrabold text-[11px] sm:text-xs tabular-nums text-white group-hover:text-amber-200 transition-colors whitespace-nowrap tracking-wide">
          Lev - {currentLevelInfo.level}
        </span>
      </button>
    </div>
  );
};
