import localforage from "localforage";

export type OfflineSyncCategory =
  | "Student"
  | "Fee"
  | "Attendance"
  | "Staff Attendance"
  | "Marks/Exam"
  | "Homework"
  | "Class/Subject"
  | "Staff/HRM"
  | "Expense"
  | "Notice/Event"
  | "Admission"
  | "School Profile"
  | "Message"
  | "Notes/Study"
  | "General";

export interface OfflineFirestoreOp {
  type: "set" | "update" | "delete";
  path: string;
  data?: any;
  merge?: boolean;
}

export interface OfflineRtdbOp {
  type: "set" | "update" | "remove";
  path: string;
  data?: any;
}

export interface OfflineImageUploadSpec {
  fieldPath: string;
  filenamePrefix: string;
}

export interface OfflineCustomAction {
  type:
    | "MARK_STUDENT_QR_ATTENDANCE"
    | "MARK_STAFF_ATOMIC_ATTENDANCE"
    | "SAVE_CLASS_ATTENDANCE"
    | "SAVE_USER_LIVE"
    | "SAVE_CHAPTER_DATA"
    | "SAVE_SYSTEM_SETTINGS"
    | "ATTENDANCE_BATCH_ALERTS";
  payload: any;
}

export interface OfflineSyncItem {
  id: string;
  coalesceKey: string;
  kind: "WRITE_PAIR" | "DELETE_PAIR" | "CUSTOM_ACTION";
  category: OfflineSyncCategory;
  label: string;
  schoolId?: string;
  entityCollection?: string; // e.g., "students", "classes", "teachers", "exams", "fees", "notices", etc.
  entityId?: string;
  firestoreOp?: OfflineFirestoreOp;
  rtdbOp?: OfflineRtdbOp;
  extraFirestoreOps?: OfflineFirestoreOp[];
  extraRtdbOps?: OfflineRtdbOp[];
  imageFieldsToUpload?: OfflineImageUploadSpec[];
  customAction?: OfflineCustomAction;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError?: string;
  status: "pending" | "syncing" | "failed";
}

export interface OfflineSyncSnapshot {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  syncProgress: { done: number; total: number } | null;
  lastSyncedAt: string | null;
  lastSyncedCount: number;
  items: OfflineSyncItem[];
}

const syncDb = localforage.createInstance({
  name: "nst_offline_sync_v1",
  storeName: "sync_queue",
  description: "Persistent Offline Mutation & Cloud Sync Queue",
});

const QUEUE_STORAGE_KEY = "nst_offline_sync_queue_items_v1";
const META_STORAGE_KEY = "nst_offline_sync_meta_v1";
const MAX_RETRY_ATTEMPTS = 6;

let memQueue: OfflineSyncItem[] = [];
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let isSyncingNow = false;
let syncProgressState: { done: number; total: number } | null = null;
let lastSyncedAtState: string | null = null;
let lastSyncedCountState = 0;
let listenersSetup = false;
let autoSyncIntervalId: ReturnType<typeof setInterval> | null = null;
let lastFlushAttemptAt = 0;

const subscribers = new Set<(snap: OfflineSyncSnapshot) => void>();

// Synchronously seed memQueue from localStorage mirror on boot for 0ms readiness
function primeFromLocalStorageMirror() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const rawMeta = localStorage.getItem(META_STORAGE_KEY);
    if (rawMeta) {
      const parsed = JSON.parse(rawMeta);
      if (parsed?.lastSyncedAt) lastSyncedAtState = parsed.lastSyncedAt;
    }
    const rawItems = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (rawItems) {
      const arr = JSON.parse(rawItems);
      if (Array.isArray(arr)) {
        memQueue = arr.map((it: OfflineSyncItem) => ({
          ...it,
          status: it.status === "syncing" ? "pending" : (it.status || "pending"),
        }));
      }
    }
  } catch {}
}

primeFromLocalStorageMirror();

function persistQueue() {
  try {
    void syncDb.setItem(QUEUE_STORAGE_KEY, memQueue).catch(() => {});
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      // Keep localStorage mirror compact if payloads have large base64 strings
      const mirrorSafe = memQueue.map((it) => {
        const jsonLen = (() => {
          try {
            return JSON.stringify(it).length;
          } catch {
            return 999999;
          }
        })();
        if (jsonLen < 120000) return it;
        // Metadata-only mirror for huge items; full data remains safely in IndexedDB
        return {
          ...it,
          firestoreOp: it.firestoreOp ? { type: it.firestoreOp.type, path: it.firestoreOp.path, merge: it.firestoreOp.merge } : undefined,
          rtdbOp: it.rtdbOp ? { type: it.rtdbOp.type, path: it.rtdbOp.path } : undefined,
        };
      });
      if (JSON.stringify(mirrorSafe).length < 1500000) {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(mirrorSafe));
      }
      localStorage.setItem(
        META_STORAGE_KEY,
        JSON.stringify({ lastSyncedAt: lastSyncedAtState, pendingCount: memQueue.length })
      );
    }
  } catch {}
}

function getIsOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function isNetworkOfflineImmediate(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function getOfflineSyncSnapshot(): OfflineSyncSnapshot {
  const pendingCount = memQueue.filter((i) => i.status !== "failed").length;
  const failedCount = memQueue.filter((i) => i.status === "failed").length;
  return {
    isOnline: getIsOnline(),
    isSyncing: isSyncingNow,
    pendingCount,
    failedCount,
    syncProgress: syncProgressState,
    lastSyncedAt: lastSyncedAtState,
    lastSyncedCount: lastSyncedCountState,
    items: [...memQueue],
  };
}

function emitSnapshot() {
  const snap = getOfflineSyncSnapshot();
  subscribers.forEach((cb) => {
    try {
      cb(snap);
    } catch {}
  });
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("nst-offline-sync-updated", { detail: snap }));
    } catch {}
  }
}

export function subscribeOfflineSyncState(cb: (snap: OfflineSyncSnapshot) => void): () => void {
  ensureOfflineSyncInitialized();
  subscribers.add(cb);
  cb(getOfflineSyncSnapshot());
  return () => {
    subscribers.delete(cb);
  };
}

/**
 * Absorb any legacy AttendanceManager queues (`nst_offline_attendance_queue_*`) into the unified engine.
 */
function absorbLegacyAttendanceQueues() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const legacyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("nst_offline_attendance_queue_")) {
        legacyKeys.push(k);
      }
    }
    let changed = false;
    for (const k of legacyKeys) {
      const schoolId = k.replace("nst_offline_attendance_queue_", "");
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        for (const leg of arr) {
          if (!leg?.record) continue;
          const docId = leg.id || `${leg.classId}_${leg.date}`;
          const cKey = `att_sheet:${schoolId}:${docId}`;
          if (!memQueue.some((q) => q.coalesceKey === cKey)) {
            const nowIso = new Date().toISOString();
            memQueue.push({
              id: `sync_leg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              coalesceKey: cKey,
              kind: "CUSTOM_ACTION",
              category: "Attendance",
              label: `Attendance: ${leg.className || leg.classId} (${leg.date})`,
              schoolId,
              entityCollection: "attendance",
              entityId: docId,
              customAction: {
                type: "SAVE_CLASS_ATTENDANCE",
                payload: { record: leg.record, className: leg.className },
              },
              createdAt: leg.timestamp || nowIso,
              updatedAt: nowIso,
              retryCount: 0,
              status: "pending",
            });
            changed = true;
          }
        }
      }
      localStorage.removeItem(k);
    }
    if (changed) {
      persistQueue();
    }
  } catch {}
}

export async function hydrateOfflineSyncQueue(): Promise<void> {
  if (hydrated) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const stored = await syncDb.getItem<OfflineSyncItem[]>(QUEUE_STORAGE_KEY);
      if (Array.isArray(stored) && stored.length > 0) {
        const mergedMap = new Map<string, OfflineSyncItem>();
        stored.forEach((it) => {
          if (it?.id) {
            mergedMap.set(it.coalesceKey || it.id, {
              ...it,
              status: it.status === "syncing" ? "pending" : (it.status || "pending"),
            });
          }
        });
        // Keep newer mutations written synchronously during current boot
        memQueue.forEach((it) => {
          if (it?.id) mergedMap.set(it.coalesceKey || it.id, it);
        });
        memQueue = Array.from(mergedMap.values()).sort((a, b) =>
          (a.createdAt || "").localeCompare(b.createdAt || "")
        );
      }
      absorbLegacyAttendanceQueues();
      hydrated = true;
      persistQueue();
      emitSnapshot();
    } catch {
      hydrated = true;
    }
  })();

  return hydrationPromise;
}

export function ensureOfflineSyncInitialized() {
  if (typeof window === "undefined") return;
  void hydrateOfflineSyncQueue().then(() => {
    if (getIsOnline() && memQueue.some((i) => i.status === "pending")) {
      void flushOfflineSyncQueue();
    }
  });

  if (listenersSetup) return;
  listenersSetup = true;

  const triggerSync = () => {
    emitSnapshot();
    if (getIsOnline() && memQueue.some((i) => i.status === "pending")) {
      void flushOfflineSyncQueue();
    }
  };

  window.addEventListener("online", triggerSync);
  window.addEventListener("offline", () => emitSnapshot());
  window.addEventListener("focus", () => {
    if (getIsOnline() && memQueue.some((i) => i.status === "pending")) {
      const now = Date.now();
      if (now - lastFlushAttemptAt > 5000) {
        void flushOfflineSyncQueue();
      }
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && getIsOnline() && memQueue.some((i) => i.status === "pending")) {
      void flushOfflineSyncQueue();
    }
  });

  // Also trigger immediately when Firebase RTDB `.info/connected` reports live connection
  window.addEventListener("nst-firebase-connected", triggerSync);

  autoSyncIntervalId = setInterval(() => {
    if (getIsOnline() && !isSyncingNow && memQueue.some((i) => i.status === "pending")) {
      void flushOfflineSyncQueue();
    }
  }, 15000);
}

/**
 * Enqueue an offline mutation with coalescing support.
 */
export function enqueueOfflineSyncItem(
  input: Omit<OfflineSyncItem, "id" | "createdAt" | "updatedAt" | "retryCount" | "status">
): OfflineSyncItem {
  ensureOfflineSyncInitialized();
  const nowIso = new Date().toISOString();

  // Check if an un-started pending/failed item with the same coalesceKey exists
  const existingIdx = memQueue.findIndex(
    (item) => item.coalesceKey === input.coalesceKey && item.status !== "syncing"
  );

  if (existingIdx >= 0) {
    const prev = memQueue[existingIdx];
    // Merge update payloads if both are WRITE_PAIR updates on same doc
    let mergedFirestoreOp = input.firestoreOp;
    if (
      prev.kind === "WRITE_PAIR" &&
      input.kind === "WRITE_PAIR" &&
      prev.firestoreOp?.data &&
      input.firestoreOp?.data &&
      input.firestoreOp.type === "update"
    ) {
      mergedFirestoreOp = {
        ...input.firestoreOp,
        type: prev.firestoreOp.type,
        data: { ...prev.firestoreOp.data, ...input.firestoreOp.data },
      };
    }

    let mergedRtdbOp = input.rtdbOp;
    if (
      prev.kind === "WRITE_PAIR" &&
      input.kind === "WRITE_PAIR" &&
      prev.rtdbOp?.data &&
      input.rtdbOp?.data &&
      input.rtdbOp.type === "update"
    ) {
      mergedRtdbOp = {
        ...input.rtdbOp,
        type: prev.rtdbOp.type,
        data: { ...prev.rtdbOp.data, ...input.rtdbOp.data },
      };
    }

    const updatedItem: OfflineSyncItem = {
      ...prev,
      ...input,
      firestoreOp: mergedFirestoreOp,
      rtdbOp: mergedRtdbOp,
      id: prev.id,
      createdAt: prev.createdAt,
      updatedAt: nowIso,
      retryCount: 0,
      lastError: undefined,
      status: "pending",
    };
    memQueue[existingIdx] = updatedItem;
    persistQueue();
    emitSnapshot();
    return updatedItem;
  }

  const newItem: OfflineSyncItem = {
    ...input,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso,
    updatedAt: nowIso,
    retryCount: 0,
    status: "pending",
  };

  memQueue.push(newItem);
  persistQueue();
  emitSnapshot();
  return newItem;
}

export function removeOfflineSyncItem(id: string) {
  memQueue = memQueue.filter((it) => it.id !== id);
  persistQueue();
  emitSnapshot();
}

export function retryFailedOfflineSyncItems() {
  let changed = false;
  memQueue = memQueue.map((it) => {
    if (it.status === "failed") {
      changed = true;
      return { ...it, status: "pending", retryCount: 0, lastError: undefined };
    }
    return it;
  });
  if (changed) {
    persistQueue();
    emitSnapshot();
    void flushOfflineSyncQueue(true);
  }
}

export function clearFailedOfflineSyncItems() {
  memQueue = memQueue.filter((it) => it.status !== "failed");
  persistQueue();
  emitSnapshot();
}

/**
 * Overlay any pending offline mutations onto a remote list so stale cloud snapshots
 * never clobber newly added/edited/deleted items before the sync queue finishes flushing.
 */
export function applyPendingSchoolEntityOverlay<T extends Record<string, any>>(
  schoolId: string,
  entityCollection: string,
  list: T[],
  idResolver: (item: T) => string = (it) => String(it?.id || "")
): T[] {
  if (!schoolId || memQueue.length === 0) return list;
  const relevant = memQueue.filter(
    (q) => q.schoolId === schoolId && q.entityCollection === entityCollection
  );
  if (relevant.length === 0) return list;

  const map = new Map<string, T>();
  for (const item of list) {
    const id = idResolver(item);
    if (id) map.set(id, item);
  }

  for (const q of relevant) {
    const eid = q.entityId;
    if (!eid) continue;
    if (q.kind === "DELETE_PAIR") {
      map.delete(eid);
    } else if (q.kind === "WRITE_PAIR") {
      const data = q.firestoreOp?.data || q.rtdbOp?.data;
      if (data && typeof data === "object") {
        const existing = map.get(eid);
        if (q.firestoreOp?.type === "update" || q.rtdbOp?.type === "update") {
          map.set(eid, { ...(existing || ({ id: eid } as any)), ...data } as T);
        } else {
          map.set(eid, { ...(existing || {}), ...data, id: data.id || eid } as T);
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Helper to check if an error is clearly a permanent permission/bad-argument failure vs transient network failure.
 */
function isPermanentFirebaseError(err: any): boolean {
  const code = String(err?.code || "").toLowerCase();
  const msg = String(err?.message || err || "").toLowerCase();
  if (
    code.includes("permission-denied") ||
    code.includes("invalid-argument") ||
    msg.includes("permission_denied") ||
    msg.includes("missing or insufficient permissions") ||
    msg.includes("invalid document reference")
  ) {
    return true;
  }
  return false;
}

const withShortTimeout = <T>(p: Promise<T>, ms = 6000): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Sync timeout after ${ms}ms`)), ms)),
  ]);

function getNestedField(obj: any, dotPath: string): any {
  const parts = dotPath.split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function setNestedField(obj: any, dotPath: string, value: any) {
  if (!obj || typeof obj !== "object") return;
  const parts = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

async function resolveDeferredImageUploads(item: OfflineSyncItem): Promise<void> {
  if (!item.imageFieldsToUpload || item.imageFieldsToUpload.length === 0) return;
  const { uploadImageToImgBB } = await import("./imgbbService");

  for (const spec of item.imageFieldsToUpload) {
    const fsVal = item.firestoreOp?.data ? getNestedField(item.firestoreOp.data, spec.fieldPath) : undefined;
    const rtVal = item.rtdbOp?.data ? getNestedField(item.rtdbOp.data, spec.fieldPath) : undefined;
    const candidate =
      typeof fsVal === "string" && fsVal.startsWith("data:image/")
        ? fsVal
        : typeof rtVal === "string" && rtVal.startsWith("data:image/")
        ? rtVal
        : "";

    if (!candidate) continue;
    try {
      const cdnUrl = await withShortTimeout(
        uploadImageToImgBB(candidate, `${spec.filenamePrefix}_${Date.now()}.png`),
        8000
      );
      if (cdnUrl && !cdnUrl.startsWith("data:image/")) {
        if (item.firestoreOp?.data) setNestedField(item.firestoreOp.data, spec.fieldPath, cdnUrl);
        if (item.rtdbOp?.data) setNestedField(item.rtdbOp.data, spec.fieldPath, cdnUrl);
      }
    } catch {
      // Keep base64 fallback cleanly if ImgBB unreachable; don't block Firestore/RTDB sync
    }
  }
}

async function executeSingleSyncItem(item: OfflineSyncItem): Promise<void> {
  const [{ db, rtdb }, fsMod, rtdbMod] = await Promise.all([
    import("../firebase"),
    import("firebase/firestore"),
    import("firebase/database"),
  ]);

  // Upload any deferred base64 photos first while online
  await resolveDeferredImageUploads(item);

  if (item.kind === "CUSTOM_ACTION" && item.customAction) {
    const { type, payload } = item.customAction;
    if (type === "SAVE_CLASS_ATTENDANCE") {
      const schoolFb = await import("../school-firebase");
      await schoolFb.saveAttendanceDirectCloud(payload.record);
      // Also dispatch parent alerts for today's records if applicable
      const today = schoolFb.todayStr();
      if (payload.record?.date === today && payload.record?.students) {
        try {
          const { dispatchAttendanceBatchAlerts } = await import("../utils/attendanceAlertDispatcher");
          const alertItems = Object.entries(payload.record.students).map(([sid, st]: [string, any]) => ({
            studentId: sid,
            studentName: st?.name || "Student",
            rollNo: st?.rollNo || "",
            classId: payload.record.classId,
            className: payload.className || payload.record.classId,
            status: st?.present === false ? ("absent" as const) : st?.status === "late" ? ("late" as const) : ("present" as const),
            timeText: st?.inTime || undefined,
          }));
          if (alertItems.length > 0) {
            void dispatchAttendanceBatchAlerts({
              schoolId: payload.record.schoolId,
              classId: payload.record.classId,
              className: payload.className || payload.record.classId,
              date: payload.record.date,
              sourceLabel: "क्लास अटेंडेंस (ऑटो सिंक)",
              items: alertItems,
            }).catch(() => {});
          }
        } catch {}
      }
      return;
    }

    if (type === "MARK_STUDENT_QR_ATTENDANCE") {
      const schoolFb = await import("../school-firebase");
      await schoolFb.replayOfflineStudentAttendancePunch(payload);
      return;
    }

    if (type === "MARK_STAFF_ATOMIC_ATTENDANCE") {
      const schoolFb = await import("../school-firebase");
      await schoolFb.replayOfflineStaffAttendancePunch(payload);
      return;
    }

    if (type === "SAVE_USER_LIVE") {
      const fb = await import("../firebase");
      const ok = await fb.saveUserToLive(payload.user, { immediate: true });
      if (!ok) throw new Error("User profile sync did not complete");
      return;
    }

    if (type === "SAVE_CHAPTER_DATA") {
      const fb = await import("../firebase");
      await fb.saveChapterData(payload.key, payload.data, payload.historyMeta);
      return;
    }

    if (type === "SAVE_SYSTEM_SETTINGS") {
      const fb = await import("../firebase");
      await fb.saveSystemSettings(payload.settings);
      return;
    }

    return;
  }

  // Standard WRITE_PAIR or DELETE_PAIR
  const promises: Promise<void>[] = [];
  let fsPermError: any = null;
  let rtdbPermError: any = null;
  let anySucceeded = false;

  const runFsOp = async (op: OfflineFirestoreOp) => {
    if (!db) throw new Error("Firestore unavailable");
    const docRef = fsMod.doc(db, op.path);
    if (op.type === "delete") {
      await withShortTimeout(fsMod.deleteDoc(docRef), 5000);
    } else if (op.type === "update") {
      await withShortTimeout(fsMod.setDoc(docRef, op.data || {}, { merge: true }), 5000);
    } else {
      await withShortTimeout(
        op.merge ? fsMod.setDoc(docRef, op.data || {}, { merge: true }) : fsMod.setDoc(docRef, op.data || {}),
        5000
      );
    }
  };

  const runRtdbOp = async (op: OfflineRtdbOp) => {
    if (!rtdb) throw new Error("RTDB unavailable");
    const r = rtdbMod.ref(rtdb, op.path);
    if (op.type === "remove") {
      await withShortTimeout(rtdbMod.remove(r), 4500);
    } else if (op.type === "update") {
      await withShortTimeout(rtdbMod.update(r, op.data || {}), 4500);
    } else {
      await withShortTimeout(rtdbMod.set(r, op.data ?? null), 4500);
    }
  };

  const allFsOps: OfflineFirestoreOp[] = [
    ...(item.firestoreOp ? [item.firestoreOp] : []),
    ...(item.extraFirestoreOps || []),
  ];
  const allRtdbOps: OfflineRtdbOp[] = [
    ...(item.rtdbOp ? [item.rtdbOp] : []),
    ...(item.extraRtdbOps || []),
  ];

  for (const op of allRtdbOps) {
    promises.push(
      runRtdbOp(op)
        .then(() => {
          anySucceeded = true;
        })
        .catch((err) => {
          if (isPermanentFirebaseError(err)) rtdbPermError = err;
          else throw err;
        })
    );
  }

  for (const op of allFsOps) {
    promises.push(
      runFsOp(op)
        .then(() => {
          anySucceeded = true;
        })
        .catch((err) => {
          if (isPermanentFirebaseError(err)) fsPermError = err;
          else throw err;
        })
    );
  }

  const results = await Promise.allSettled(promises);
  const transientFailures = results.filter((r) => r.status === "rejected");

  // If browser went offline mid-flight or all targets failed transiently -> throw so item stays queued!
  if (!anySucceeded && transientFailures.length > 0) {
    throw (transientFailures[0] as PromiseRejectedResult).reason;
  }

  // If only permanent errors occurred (e.g. permission denied on both)
  if (!anySucceeded && (fsPermError || rtdbPermError)) {
    throw fsPermError || rtdbPermError;
  }
}

export async function flushOfflineSyncQueue(forceIncludeFailed = false): Promise<{
  synced: number;
  remaining: number;
}> {
  await hydrateOfflineSyncQueue();

  if (isSyncingNow) {
    return { synced: 0, remaining: memQueue.length };
  }
  if (!getIsOnline()) {
    emitSnapshot();
    return { synced: 0, remaining: memQueue.length };
  }

  const candidates = memQueue.filter((i) =>
    forceIncludeFailed ? i.status === "pending" || i.status === "failed" : i.status === "pending"
  );
  if (candidates.length === 0) {
    return { synced: 0, remaining: memQueue.length };
  }

  isSyncingNow = true;
  lastFlushAttemptAt = Date.now();
  syncProgressState = { done: 0, total: candidates.length };
  emitSnapshot();

  let synced = 0;

  try {
    for (let idx = 0; idx < candidates.length; idx++) {
      if (!getIsOnline()) break;

      const candidate = candidates[idx];
      const liveIdx = memQueue.findIndex((x) => x.id === candidate.id);
      if (liveIdx < 0) continue;

      memQueue[liveIdx] = { ...memQueue[liveIdx], status: "syncing" };
      emitSnapshot();

      try {
        await executeSingleSyncItem(memQueue[liveIdx]);
        // Remove succeeded item
        memQueue = memQueue.filter((x) => x.id !== candidate.id);
        synced++;
        syncProgressState = { done: synced, total: candidates.length };
        persistQueue();
        emitSnapshot();
      } catch (err: any) {
        const currentIdx = memQueue.findIndex((x) => x.id === candidate.id);
        if (currentIdx >= 0) {
          const prevItem = memQueue[currentIdx];
          const nextRetry = prevItem.retryCount + 1;
          const permanent = isPermanentFirebaseError(err);
          memQueue[currentIdx] = {
            ...prevItem,
            retryCount: nextRetry,
            lastError: String(err?.message || err || "Network error"),
            status: permanent || nextRetry >= MAX_RETRY_ATTEMPTS ? "failed" : "pending",
          };
          persistQueue();
          emitSnapshot();
        }
        // If offline now, pause remaining items until connectivity resumes
        if (!getIsOnline()) break;
      }
    }

    if (synced > 0) {
      lastSyncedAtState = new Date().toISOString();
      lastSyncedCountState = synced;
      persistQueue();
    }
  } finally {
    isSyncingNow = false;
    syncProgressState = null;
    emitSnapshot();
  }

  return { synced, remaining: memQueue.length };
}

if (typeof window !== "undefined") {
  ensureOfflineSyncInitialized();
}
