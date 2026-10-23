// @ts-nocheck
import { SetLeaderboardEntry } from '../types';
import { db, rtdb } from '../firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';

export interface WeekInfo {
  weekKey: string;          // e.g. '2026-W42'
  previousWeekKey: string;  // e.g. '2026-W41'
  weekNumber: number;
  year: number;
  label: string;            // e.g. '12 Oct – 18 Oct 2026'
  daysLeft: number;
  hoursLeft: number;
  minsLeft: number;
  formattedCountdown: string; // e.g. '3 दिन 5 घंटे'
  resetNotice: string;
}

/**
 * Returns ISO week info and countdown to Sunday 23:59:59
 */
export function getCurrentWeekInfo(date: Date = new Date()): WeekInfo {
  const d = new Date(date.getTime());
  // ISO day: 1 = Mon ... 7 = Sun
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getFullYear();
  const weekKey = `${year}-W${String(weekNo).padStart(2, '0')}`;

  // Previous week key
  const prevDate = new Date(date.getTime() - 7 * 86400000);
  const prevD = new Date(prevDate.getTime());
  const prevDay = prevD.getDay() || 7;
  prevD.setDate(prevD.getDate() + 4 - prevDay);
  const prevYearStart = new Date(prevD.getFullYear(), 0, 1);
  const prevWeekNo = Math.ceil((((prevD.getTime() - prevYearStart.getTime()) / 86400000) + 1) / 7);
  const previousWeekKey = `${prevD.getFullYear()}-W${String(prevWeekNo).padStart(2, '0')}`;

  // Calculate start and end date of current week (Monday to Sunday)
  const currentDay = date.getDay(); // 0 is Sunday
  const distanceToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
  const monday = new Date(date);
  monday.setDate(date.getDate() + distanceToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const label = `${monday.toLocaleDateString('hi-IN', options)} – ${sunday.toLocaleDateString('hi-IN', { ...options, year: 'numeric' })}`;

  // Countdown to Sunday 23:59:59
  const now = date.getTime();
  const diffMs = Math.max(0, sunday.getTime() - now);
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    weekKey,
    previousWeekKey,
    weekNumber: weekNo,
    year,
    label,
    daysLeft,
    hoursLeft,
    minsLeft,
    formattedCountdown: `${daysLeft} दिन ${hoursLeft} घंटे बाकी`,
    resetNotice: 'प्रत्येक रविवार रात 11:59 PM पर यह लीडरबोर्ड अपडेट होकर नए सप्ताह में प्रवेश करता है।'
  };
}

// Local cache key
const getLocalKey = (setId: string) => `nst_set_lb_${setId}`;

/**
 * Deterministic seeded mock toppers for a set so every set has immediate active ranking competition
 */
function getSeededToppers(setId: string, weekKey: string, maxMarks: number = 25): SetLeaderboardEntry[] {
  // Use set ID hash to produce stable scores
  let hash = 0;
  for (let i = 0; i < setId.length; i++) {
    hash = (hash << 5) - hash + setId.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const mockUsers = [
    { name: 'रोहन कुमार', city: 'पटना', photo: '👨‍🎓', factor: 0.96, timeSec: 540 },
    { name: 'प्रिया शर्मा', city: 'मुजफ्फरपुर', photo: '👩‍🎓', factor: 0.92, timeSec: 610 },
    { name: 'अमन सिंह राजपूत', city: 'गया', photo: '👨‍🎓', factor: 0.88, timeSec: 670 },
    { name: 'नेहा कुमारी', city: 'भागलपुर', photo: '👩‍🎓', factor: 0.84, timeSec: 720 },
    { name: 'दीपक वर्मा', city: 'दरभंगा', photo: '👨‍🎓', factor: 0.80, timeSec: 780 },
    { name: 'पूजा गुप्ता', city: 'आरा', photo: '👩‍🎓', factor: 0.76, timeSec: 810 },
    { name: 'विक्रम पटेल', city: 'पूर्णिया', photo: '👨‍🎓', factor: 0.72, timeSec: 850 },
    { name: 'स्नेहा यादव', city: 'छपरा', photo: '👩‍🎓', factor: 0.68, timeSec: 900 }
  ];

  return mockUsers.map((u, i) => {
    const marks = Math.max(1, Math.round(maxMarks * u.factor));
    const percentage = Math.round((marks / maxMarks) * 100);
    const timeSpent = Math.max(120, u.timeSec + ((positiveHash + i * 37) % 180));
    return {
      id: `seed_${setId}_${weekKey}_${i}`,
      setId,
      userId: `seed_user_${i}`,
      userName: `${u.name} (${u.city})`,
      userPhoto: u.photo,
      classLevel: setId.includes('class12') ? '12' : setId.includes('class10') ? '10' : 'COMPETITION',
      targetExam: setId.includes('police') ? 'बिहार पुलिस' : setId.includes('bssc') ? 'BSSC' : 'Board Exam',
      marksObtained: marks,
      maxMarks,
      percentage,
      correct: marks,
      wrong: Math.max(0, Math.round((maxMarks - marks) * 0.7)),
      unattempted: Math.max(0, maxMarks - marks - Math.round((maxMarks - marks) * 0.7)),
      timeSpentSeconds: timeSpent,
      submittedAt: new Date(Date.now() - (i + 1) * 3600000 * 5).toISOString(),
      weekKey,
      isSeeded: true
    };
  });
}

/**
 * Save test score for a practice set and returns the user's weekly rank
 */
export async function saveSetLeaderboardScore(entry: SetLeaderboardEntry): Promise<{ rank: number; total: number }> {
  try {
    const weekInfo = getCurrentWeekInfo();
    const completeEntry: SetLeaderboardEntry = {
      ...entry,
      weekKey: entry.weekKey || weekInfo.weekKey,
      submittedAt: entry.submittedAt || new Date().toISOString()
    };

    // 1. Save to local storage
    try {
      const localKey = getLocalKey(entry.setId);
      const raw = localStorage.getItem(localKey);
      let list: SetLeaderboardEntry[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      // Replace or add user's best entry for this week
      const existingIdx = list.findIndex(e => e.userId === entry.userId && e.weekKey === completeEntry.weekKey);
      if (existingIdx >= 0) {
        // Keep better score (or faster time if score is same)
        const old = list[existingIdx];
        if (
          completeEntry.marksObtained > old.marksObtained ||
          (completeEntry.marksObtained === old.marksObtained && completeEntry.timeSpentSeconds < old.timeSpentSeconds)
        ) {
          list[existingIdx] = completeEntry;
        }
      } else {
        list.push(completeEntry);
      }
      localStorage.setItem(localKey, JSON.stringify(list));
    } catch (e) {
      console.warn('[SetLeaderboard] LocalStorage save error:', e);
    }

    // 2. Save to Firestore (async, fire & forget)
    try {
      if (db) {
        const docRef = doc(db, 'practice_set_leaderboards', `${entry.setId}_${completeEntry.weekKey}`, 'scores', entry.userId);
        await setDoc(docRef, completeEntry, { merge: true });
      }
    } catch (e) {
      console.warn('[SetLeaderboard] Firestore save notice:', e);
    }

    // 3. Mirror to Firebase RTDB
    try {
      if (rtdb) {
        const safeUserId = entry.userId.replace(/[.#$[\]/]/g, '_');
        await set(ref(rtdb, `practice_set_leaderboards/${entry.setId}/${completeEntry.weekKey}/${safeUserId}`), completeEntry);
      }
    } catch (e) {
      console.warn('[SetLeaderboard] RTDB save notice:', e);
    }

    // Compute updated rank
    const res = await fetchSetLeaderboard(entry.setId, 'CURRENT', entry.userId, entry.maxMarks);
    return {
      rank: res.userRank || 1,
      total: res.entries.length
    };
  } catch (err) {
    console.error('[SetLeaderboard] save error:', err);
    return { rank: 1, total: 1 };
  }
}

/**
 * Fetch dedicated leaderboard for a practice set
 */
export async function fetchSetLeaderboard(
  setId: string,
  period: 'CURRENT' | 'PREVIOUS' | 'ALL' = 'CURRENT',
  currentUserId?: string,
  maxMarks: number = 25
): Promise<{
  entries: SetLeaderboardEntry[];
  userRank: number | null;
  userEntry: SetLeaderboardEntry | null;
  weekInfo: WeekInfo;
}> {
  const weekInfo = getCurrentWeekInfo();
  const targetWeekKey = period === 'PREVIOUS' ? weekInfo.previousWeekKey : weekInfo.weekKey;

  let remoteEntries: SetLeaderboardEntry[] = [];

  // 1. Try Firestore
  try {
    if (db) {
      const snap = await getDocs(collection(db, 'practice_set_leaderboards', `${setId}_${targetWeekKey}`, 'scores'));
      if (!snap.empty) {
        remoteEntries = snap.docs.map(d => d.data() as SetLeaderboardEntry);
      }
    }
  } catch (e) {
    // Fallback to RTDB
    try {
      if (rtdb) {
        const rtdbSnap = await get(ref(rtdb, `practice_set_leaderboards/${setId}/${targetWeekKey}`));
        if (rtdbSnap.exists()) {
          remoteEntries = Object.values(rtdbSnap.val() || {}) as SetLeaderboardEntry[];
        }
      }
    } catch (_) {}
  }

  // 2. Read local entries
  let localEntries: SetLeaderboardEntry[] = [];
  try {
    const raw = localStorage.getItem(getLocalKey(setId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localEntries = parsed.filter(e => {
          if (period === 'ALL') return true;
          return e.weekKey === targetWeekKey;
        });
      }
    }
  } catch (_) {}

  // 3. Merge live entries
  const userMap = new Map<string, SetLeaderboardEntry>();
  [...remoteEntries, ...localEntries].forEach(entry => {
    if (!entry || !entry.userId) return;
    const existing = userMap.get(entry.userId);
    if (!existing) {
      userMap.set(entry.userId, entry);
    } else {
      if (
        entry.marksObtained > existing.marksObtained ||
        (entry.marksObtained === existing.marksObtained && entry.timeSpentSeconds < existing.timeSpentSeconds)
      ) {
        userMap.set(entry.userId, entry);
      }
    }
  });

  // 4. Seeded cohort participants to ensure active leaderboard excitement
  const seeded = getSeededToppers(setId, targetWeekKey, maxMarks);
  seeded.forEach(s => {
    if (!userMap.has(s.userId)) {
      userMap.set(s.userId, s);
    }
  });

  // 5. Sort entries:
  // Primary: marksObtained DESC
  // Secondary: timeSpentSeconds ASC (faster = better)
  // Tertiary: submittedAt ASC
  const sorted = Array.from(userMap.values()).sort((a, b) => {
    if (b.marksObtained !== a.marksObtained) {
      return b.marksObtained - a.marksObtained;
    }
    if (a.timeSpentSeconds !== b.timeSpentSeconds) {
      return a.timeSpentSeconds - b.timeSpentSeconds;
    }
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });

  // Assign ranks
  const ranked = sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));

  const userEntry = currentUserId ? ranked.find(e => e.userId === currentUserId) || null : null;
  const userRank = userEntry ? userEntry.rank || null : null;

  return {
    entries: ranked,
    userRank,
    userEntry,
    weekInfo
  };
}
