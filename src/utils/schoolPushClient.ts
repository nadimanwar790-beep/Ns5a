import { rtdb } from "../firebase";
import { ref, set } from "firebase/database";

export interface LinkedStudentPushPayload {
  id: string;
  schoolId: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  name: string;
  rollNo?: string;
  admissionNo?: string;
  pendingDues?: number;
  monthlyFee?: number;
}

const PUSH_ENABLED_KEY = (uid: string) => `nst_school_push_enabled_${uid || "guest"}`;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function isSchoolPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function getSchoolPushEnabledState(uid?: string): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }
  try {
    return (
      localStorage.getItem(PUSH_ENABLED_KEY(uid || "guest")) === "true" ||
      localStorage.getItem("nst_school_push_enabled_any") === "true"
    );
  } catch {
    return false;
  }
}

async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("ServiceWorker not supported in this environment");
  }

  try {
    const existing = await navigator.serviceWorker.getRegistrations();
    const activeRoot = existing.find(
      (r) => r.active && (r.scope === window.location.origin + "/" || r.scope.endsWith("/"))
    );
    if (activeRoot) return activeRoot;
    if (existing.length > 0 && existing[0].active) {
      return existing[0];
    }
  } catch (_) {}

  // Prefer the unified root service worker /sw.js so WebAPK attributes notifications to NSTA
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    const fallbackReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    return fallbackReg;
  }
}

export async function enableSchoolPushForUser(params: {
  userId: string;
  schoolId?: string;
  students: LinkedStudentPushPayload[];
  replaceStudents?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSchoolPushSupported()) {
    return {
      ok: false,
      error: "Is browser me Push Notification supported nahi hai (iPhone par Home Screen par Add karein).",
    };
  }

  try {
    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return {
        ok: false,
        error: "Notification permission allow nahi hui. Browser settings me Notification Allow karein.",
      };
    }

    const keyRes = await fetch("/api/school-push/vapid-public-key");
    if (!keyRes.ok) {
      return { ok: false, error: "Push server se connect nahi ho paya." };
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      return { ok: false, error: "Server VAPID key uplabdh nahi hai." };
    }

    const expectedAppKey = urlBase64ToUint8Array(publicKey);
    const swReg = await getPushServiceWorkerRegistration();
    let sub = await swReg.pushManager.getSubscription();

    // Auto-recover from stale VAPID subscription mismatches across server restarts/deployments
    if (sub && sub.options?.applicationServerKey) {
      try {
        const existingKeyBytes = new Uint8Array(sub.options.applicationServerKey);
        if (!uint8ArraysEqual(existingKeyBytes, expectedAppKey)) {
          await sub.unsubscribe().catch(() => {});
          sub = null;
        }
      } catch {
        // Ignore comparison errors if browser blocks applicationServerKey reading
      }
    }

    if (!sub) {
      sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedAppKey as unknown as BufferSource,
      });
    }

    const resolvedSchoolId =
      params.schoolId ||
      params.students?.[0]?.schoolId ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("nst_active_school_id") || "" : "");

    const saveRes = await fetch("/api/school-push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: params.userId || "guest",
        schoolId: resolvedSchoolId || undefined,
        subscription: sub.toJSON(),
        students: params.students,
        autoMonthlyEnabled: true,
        replaceStudents: Boolean(params.replaceStudents),
      }),
    });

    if (!saveRes.ok) {
      return { ok: false, error: "Push subscription save karne me samasya aayi." };
    }

    try {
      localStorage.setItem(PUSH_ENABLED_KEY(params.userId || "guest"), "true");
      localStorage.setItem("nst_school_push_enabled_any", "true");
    } catch {}

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Push notification chalu nahi ho saka." };
  }
}

/**
 * Automatically ensures Web Push subscription & linked student/class metadata are synced
 * whenever browser/device Notification.permission is already "granted".
 * Throttled per unique signature in sessionStorage to avoid redundant calls.
 */
export async function autoSyncSchoolPushIfPermitted(params: {
  userId: string;
  schoolId?: string;
  students: LinkedStudentPushPayload[];
}): Promise<boolean> {
  if (typeof window === "undefined" || !isSchoolPushSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const cleanStudents = (params.students || []).filter((s) => s && s.id);
  const sig = `${params.userId || "guest"}|${params.schoolId || ""}|${cleanStudents
    .map((s) => `${s.id}:${s.schoolId}:${s.classId || ""}:${s.className || ""}`)
    .join(",")}`;

  try {
    const prevSig = sessionStorage.getItem("nst_school_push_sync_sig");
    if (prevSig === sig) return true;
  } catch {}

  const res = await enableSchoolPushForUser({
    userId: params.userId || "guest",
    schoolId: params.schoolId,
    students: cleanStudents,
    replaceStudents: cleanStudents.length > 0,
  });

  if (res.ok) {
    try {
      sessionStorage.setItem("nst_school_push_sync_sig", sig);
    } catch {}
  }
  return res.ok;
}

export async function disableSchoolPushForUser(userId: string): Promise<void> {
  try {
    localStorage.setItem(PUSH_ENABLED_KEY(userId || "guest"), "false");
    localStorage.removeItem("nst_school_push_enabled_any");
    sessionStorage.removeItem("nst_school_push_sync_sig");
  } catch {}
  if (!isSchoolPushSupported()) return;
  try {
    const swReg = await navigator.serviceWorker.getRegistration("/");
    const sub = await swReg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/school-push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }
  } catch {}
}

export async function syncLinkedStudentsToPushSubscription(
  userId: string,
  students: LinkedStudentPushPayload[]
): Promise<void> {
  if (!isSchoolPushSupported() || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    await enableSchoolPushForUser({
      userId,
      students,
      replaceStudents: students.length > 0,
    });
  } catch {}
}

export async function syncStudentFeeDueForPush(item: {
  studentId: string;
  schoolId: string;
  schoolName?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  rollNo?: string;
  pendingDues: number;
  monthlyFee?: number;
}): Promise<void> {
  try {
    await fetch("/api/school-push/sync-dues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  } catch {}
}

export async function sendSchoolPushNotification(payload: {
  schoolId?: string;
  classId?: string;
  className?: string;
  studentIds?: string[];
  userId?: string;
  classBroadcast?: boolean;
  schoolBroadcast?: boolean;
  senderId?: string;
  senderName?: string;
  title: string;
  body: string;
  type?: "MONTHLY_FEE" | "FEE_RECEIPT" | "SCHOOL_NOTICE" | "SCHOOL_HOLIDAY" | "HOMEWORK" | "DEFAULT" | "NSTA_MESSAGE";
  url?: string;
  urgent?: boolean;
  icon?: string;
  senderPhoto?: string;
}): Promise<{ delivered: number; matchedDevices: number; rtdbDispatched?: boolean }> {
  const timestamp = Date.now();
  const notifId = `school_notif_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;
  let rtdbDispatched = false;

  // 1. Dual-write to RTDB for instantaneous in-app & background SW wake up
  try {
    if (rtdb) {
      const targetStudentIds = Array.isArray(payload.studentIds)
        ? Array.from(new Set(payload.studentIds.map((id) => String(id).trim()).filter(Boolean)))
        : [];

      const notifPayload = {
        id: notifId,
        type: payload.type || "SCHOOL_NOTICE",
        title: payload.title,
        body: payload.body,
        url: payload.url || "/?schoolPortal=1",
        icon: payload.icon || payload.senderPhoto || "",
        senderPhoto: payload.senderPhoto || payload.icon || "",
        senderId: payload.senderId || "",
        senderName: payload.senderName || "",
        timestamp,
        status: "UNREAD",
        urgent: payload.urgent !== false,
        schoolId: payload.schoolId || "",
        classId: payload.classId || "",
        className: payload.className || "",
        ...(payload.classBroadcast ? { classBroadcast: true } : {}),
        ...(payload.schoolBroadcast ? { schoolBroadcast: true } : {}),
        ...(targetStudentIds.length > 0 ? { studentIds: targetStudentIds } : {}),
      };

      const rtdbWrites: Promise<any>[] = [];

      if (targetStudentIds.length > 0) {
        targetStudentIds.forEach((stId) => {
          const cleanId = stId.replace(/[.#$[\]/]/g, "_");
          rtdbWrites.push(set(ref(rtdb, `user_notifications/${cleanId}/${notifId}`), notifPayload).catch(() => {}));
        });
      }

      if (payload.userId) {
        const cleanUid = String(payload.userId).trim().replace(/[.#$[\]/]/g, "_");
        if (cleanUid) {
          rtdbWrites.push(set(ref(rtdb, `user_notifications/${cleanUid}/${notifId}`), notifPayload).catch(() => {}));
        }
      }

      // School-scoped real-time channel for School Broadcasts, Class Broadcasts, or School-wide alerts (not private 1-to-1/per-student alerts)
      if (
        payload.schoolId &&
        (payload.schoolBroadcast || payload.classBroadcast || (targetStudentIds.length === 0 && !payload.userId))
      ) {
        const cleanSchoolId = String(payload.schoolId).trim().replace(/[.#$[\]/]/g, "_");
        if (cleanSchoolId) {
          rtdbWrites.push(set(ref(rtdb, `school_notifications/${cleanSchoolId}/${notifId}`), notifPayload).catch(() => {}));
        }
      }

      if ((targetStudentIds.length === 0 && !payload.userId) || payload.schoolBroadcast) {
        rtdbWrites.push(set(ref(rtdb, `broadcast_notifications/${notifId}`), notifPayload).catch(() => {}));
      }

      await Promise.allSettled(rtdbWrites);
      rtdbDispatched = rtdbWrites.length > 0;
    }
  } catch (_) {}

  // 2. Dispatch server WebPush + Firebase Cloud Messaging (FCM v1)
  try {
    const res = await fetch("/api/school-push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, notifId }),
    });
    if (!res.ok) return { delivered: 0, matchedDevices: 0, rtdbDispatched };
    const data = await res.json();
    return {
      delivered: Number(data?.delivered || 0),
      matchedDevices: Number(data?.matchedDevices || 0),
      rtdbDispatched,
    };
  } catch {
    return { delivered: 0, matchedDevices: 0, rtdbDispatched };
  }
}

export async function triggerMonthlySchoolFeePush(payload: {
  schoolId: string;
  schoolName: string;
  monthLabel: string;
  duesList: Array<{
    studentId: string;
    schoolId: string;
    schoolName?: string;
    studentName: string;
    classId?: string;
    className?: string;
    rollNo?: string;
    pendingDues: number;
    monthlyFee?: number;
  }>;
}): Promise<{ delivered: number; matchedStudents: number }> {
  try {
    const res = await fetch("/api/school-push/trigger-monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { delivered: 0, matchedStudents: 0 };
    const data = await res.json();
    return {
      delivered: Number(data?.delivered || 0),
      matchedStudents: Number(data?.matchedStudents || 0),
    };
  } catch {
    return { delivered: 0, matchedStudents: 0 };
  }
}
