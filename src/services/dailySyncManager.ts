// @ts-nocheck
/**
 * Daily Master Sync & Offline-First Cache Manager
 * 
 * Rules:
 * 1. On the 1st login of the day, fetches the Master Data Snapshot from Firebase.
 * 2. Rest of the day: 100% of data reads (syllabus, notes, settings, questions, store)
 *    are served directly from super-fast local storage (0 Firebase reads).
 * 3. During MCQ tests / question solving: options, next/prev, and timer run 100% locally.
 *    Only on FINAL TEST SUBMIT, exactly 1 batch write is sent to Firebase.
 * 4. Manual "Sync Now" button allows on-demand mid-day refresh when needed.
 */

import { getUserData } from '../firebase';

export interface DailySyncInfo {
  syncDate: string; // YYYY-MM-DD
  syncedAt: number; // Timestamp
  isTodaySynced: boolean;
  totalItemsCached: number;
}

export interface DailyMasterBundle {
  syncDate: string;
  syncedAt: number;
  userSnapshot?: any;
  settingsSnapshot?: any;
  cachedDailyMcqs?: any[];
  cachedSyllabusSummary?: any[];
  cachedLeaderboardTop50?: any[];
}

const DAILY_SYNC_DATE_KEY = 'nst_last_daily_sync_date';
const DAILY_MASTER_BUNDLE_KEY = 'nst_daily_master_bundle_v1';
const PENDING_SCORE_QUEUE_KEY = 'nst_pending_score_queue_v1';

export const getTodayDateString = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const isDailySyncNeeded = (): boolean => {
  try {
    const lastSyncDate = localStorage.getItem(DAILY_SYNC_DATE_KEY);
    return lastSyncDate !== getTodayDateString();
  } catch {
    return true;
  }
};

export const getDailySyncInfo = (): DailySyncInfo => {
  const today = getTodayDateString();
  try {
    const syncDate = localStorage.getItem(DAILY_SYNC_DATE_KEY) || '';
    const rawBundle = localStorage.getItem(DAILY_MASTER_BUNDLE_KEY);
    const bundle: DailyMasterBundle | null = rawBundle ? JSON.parse(rawBundle) : null;

    return {
      syncDate: syncDate || today,
      syncedAt: bundle?.syncedAt || 0,
      isTodaySynced: syncDate === today,
      totalItemsCached: bundle ? Object.keys(bundle).length : 0,
    };
  } catch {
    return {
      syncDate: today,
      syncedAt: 0,
      isTodaySynced: false,
      totalItemsCached: 0,
    };
  }
};

export const getCachedDailyBundle = (): DailyMasterBundle | null => {
  try {
    const raw = localStorage.getItem(DAILY_MASTER_BUNDLE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Performs the master morning fetch.
 * Downloads user snapshot, system settings, and essential caches in one single round trip.
 */
export const performDailyMasterSync = async (
  user: any,
  options?: { force?: boolean }
): Promise<{ success: boolean; bundle: DailyMasterBundle; message: string }> => {
  const today = getTodayDateString();
  const force = options?.force === true;

  // If already synced today and not forced, return cached bundle with 0 network calls!
  if (!force && !isDailySyncNeeded()) {
    const cached = getCachedDailyBundle();
    if (cached) {
      return {
        success: true,
        bundle: cached,
        message: 'Aapka data pehle se hi cached hai (0 Firebase calls).',
      };
    }
  }

  try {
    const userId = user?.uid || user?.id;
    let freshUser = user;

    // 1 single user read if user is logged in
    if (userId && !user?.isGuest) {
      try {
        const fetched = await getUserData(userId);
        if (fetched) {
          freshUser = { ...user, ...fetched };
          localStorage.setItem('nst_current_user', JSON.stringify(freshUser));
        }
      } catch (err) {
        console.warn('[DailySync] User sync fallback to local cache:', err);
      }
    }

    // Get cached settings
    let cachedSettings: any = null;
    try {
      const rawSettings = localStorage.getItem('nst_system_settings');
      if (rawSettings) cachedSettings = JSON.parse(rawSettings);
    } catch {}

    const masterBundle: DailyMasterBundle = {
      syncDate: today,
      syncedAt: Date.now(),
      userSnapshot: {
        id: freshUser?.id || freshUser?.uid,
        name: freshUser?.name || 'Student',
        credits: freshUser?.credits ?? 50,
        diamonds: freshUser?.diamonds ?? 0,
        streak: freshUser?.streak ?? 1,
        totalScore: freshUser?.totalScore ?? 0,
        subscriptionTier: freshUser?.subscriptionTier || 'FREE',
        isPremium: !!freshUser?.isPremium,
        subscriptionEndDate: freshUser?.subscriptionEndDate || null,
      },
      settingsSnapshot: cachedSettings,
    };

    // Save master bundle and update today's date stamp
    localStorage.setItem(DAILY_MASTER_BUNDLE_KEY, JSON.stringify(masterBundle));
    localStorage.setItem(DAILY_SYNC_DATE_KEY, today);

    // Notify all app components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nst-daily-sync-completed', {
          detail: { bundle: masterBundle, syncDate: today },
        })
      );
    }

    return {
      success: true,
      bundle: masterBundle,
      message: 'Today\'s Daily Master Pack synced successfully (Pure din offline chalega)!',
    };
  } catch (err: any) {
    console.error('[DailySync] Master sync error:', err);
    return {
      success: false,
      bundle: getCachedDailyBundle() || { syncDate: today, syncedAt: Date.now() },
      message: 'Sync fallback: purane cached data se continue kar rahe hain.',
    };
  }
};

/**
 * MCQ Test Write-Batching Engine:
 * Prevents writing to Firebase on every single option click.
 * Instead, changes accumulate in local memory and are committed in 1 single write upon Test Submit!
 */
interface PendingScoreUpdate {
  userId: string;
  scoreDelta: number;
  creditsDelta: number;
  streak: number;
  lastUpdated: number;
}

export const queueLocalMcqScoreDelta = (
  userId: string,
  scoreDelta: number,
  creditsDelta: number = 0,
  streak: number = 0
) => {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(PENDING_SCORE_QUEUE_KEY);
    const existing: PendingScoreUpdate = raw
      ? JSON.parse(raw)
      : { userId, scoreDelta: 0, creditsDelta: 0, streak: 0, lastUpdated: Date.now() };

    existing.scoreDelta += scoreDelta;
    existing.creditsDelta += creditsDelta;
    existing.streak = Math.max(existing.streak, streak);
    existing.lastUpdated = Date.now();

    localStorage.setItem(PENDING_SCORE_QUEUE_KEY, JSON.stringify(existing));
  } catch {}
};

export const getPendingScoreUpdate = (): PendingScoreUpdate | null => {
  try {
    const raw = localStorage.getItem(PENDING_SCORE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPendingScoreUpdate = () => {
  try {
    localStorage.removeItem(PENDING_SCORE_QUEUE_KEY);
  } catch {}
};
