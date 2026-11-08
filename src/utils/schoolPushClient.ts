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
    return localStorage.getItem(PUSH_ENABLED_KEY(uid || "guest")) === "true";
  } catch {
    return false;
  }
}

async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function enableSchoolPushForUser(params: {
  userId: string;
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

    const swReg = await getPushServiceWorkerRegistration();
    let sub = await swReg.pushManager.getSubscription();
    if (!sub) {
      sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    const saveRes = await fetch("/api/school-push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: params.userId || "guest",
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
    } catch {}

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Push notification chalu nahi ho saka." };
  }
}

export async function disableSchoolPushForUser(userId: string): Promise<void> {
  try {
    localStorage.setItem(PUSH_ENABLED_KEY(userId || "guest"), "false");
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
  if (!getSchoolPushEnabledState(userId) || !isSchoolPushSupported()) return;
  try {
    await enableSchoolPushForUser({
      userId,
      students,
      replaceStudents: true,
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
  studentIds?: string[];
  userId?: string;
  title: string;
  body: string;
  type?: "MONTHLY_FEE" | "FEE_RECEIPT" | "SCHOOL_NOTICE" | "SCHOOL_HOLIDAY" | "HOMEWORK" | "DEFAULT" | "NSTA_MESSAGE";
  url?: string;
  urgent?: boolean;
}): Promise<{ delivered: number; matchedDevices: number }> {
  // 1. Dual-write to RTDB for instantaneous in-app wake up & chime
  try {
    const { rtdb } = await import("../firebase");
    const { ref, set } = await import("firebase/database");
    if (rtdb) {
      const timestamp = Date.now();
      const notifId = `school_notif_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;
      const notifPayload = {
        id: notifId,
        type: payload.type || "SCHOOL_NOTICE",
        title: payload.title,
        body: payload.body,
        url: payload.url || "/?schoolPortal=1",
        timestamp,
        status: "UNREAD",
        schoolId: payload.schoolId || "",
        classId: payload.classId || "",
      };

      if (Array.isArray(payload.studentIds) && payload.studentIds.length > 0) {
        payload.studentIds.forEach((stId) => {
          const cleanId = String(stId).replace(/[.#$[\]/]/g, "_");
          void set(ref(rtdb, `user_notifications/${cleanId}/${notifId}`), notifPayload).catch(() => {});
        });
      } else if (payload.userId) {
        const cleanUid = String(payload.userId).replace(/[.#$[\]/]/g, "_");
        void set(ref(rtdb, `user_notifications/${cleanUid}/${notifId}`), notifPayload).catch(() => {});
      } else {
        void set(ref(rtdb, `broadcast_notifications/${notifId}`), notifPayload).catch(() => {});
      }
    }
  } catch (_) {}

  // 2. Dispatch server WebPush + Firebase Cloud Messaging (FCM v1)
  try {
    const res = await fetch("/api/school-push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { delivered: 0, matchedDevices: 0 };
    const data = await res.json();
    return {
      delivered: Number(data?.delivered || 0),
      matchedDevices: Number(data?.matchedDevices || 0),
    };
  } catch {
    return { delivered: 0, matchedDevices: 0 };
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
