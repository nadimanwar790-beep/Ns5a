import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import webpush from "web-push";

// Prevent transient socket resets (e.g. pre-warmer closing connections early)
// or background async errors from terminating the dev/prod server process.
process.on("uncaughtException", (err: any) => {
  if (
    err?.code === "EPIPE" ||
    err?.code === "ECONNRESET" ||
    (err?.code === "EADDRINUSE" && String(err?.message || "").includes("24678")) ||
    String(err?.message || "").includes("WebSocket")
  ) {
    return;
  }
  console.error("[Server] Uncaught exception:", err?.message || err);
});

process.on("unhandledRejection", (reason: any) => {
  console.error("[Server] Unhandled rejection:", reason?.message || reason);
});

function resolvePort(): number {
  const portFlagIdx = process.argv.indexOf("--port");
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Number(process.env.PORT || 3000);
}

const PORT = resolvePort();
const isProduction = process.env.NODE_ENV === "production";
const ROOT_DIR = process.cwd();
const TMP_DIR = os.tmpdir();
const VAPID_FILE = path.join(TMP_DIR, "nsta-vapid-keys.json");
const LEGACY_VAPID_FILE = path.join(ROOT_DIR, ".vapid-keys.json");
const SUBS_FILE = path.join(TMP_DIR, "nsta-push-subscriptions.json");
const LEGACY_SUBS_FILE = path.join(ROOT_DIR, ".push-subscriptions.json");
const RTDB_BASE_URL = process.env.FIREBASE_DATABASE_URL || "https://nst2512-6a2e4-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "nst2512-6a2e4";

let activeVapidKeys: { publicKey: string; privateKey: string } = { publicKey: "", privateKey: "" };

let cachedFcmAccessToken: { token: string; expiresAt: number } | null = null;

function normalizeServiceAccount(
  rawEmail?: string,
  rawKey?: string
): { clientEmail: string; privateKey: string } | null {
  if (!rawEmail || !rawKey) return null;
  const match = rawEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const clientEmail = match ? match[0] : rawEmail.trim().replace(/^["']+|["',\s]+$/g, "");

  let key = rawKey.replace(/\\n/g, "\n").trim();
  if (key.startsWith("nMI")) {
    key = key.slice(1);
  }
  if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }
  return { clientEmail, privateKey: key };
}

async function getFcmAccessToken(): Promise<string | null> {
  let clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  let rawPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim();

  if (!clientEmail || !rawPrivateKey) {
    const rtdbCreds = await rtdbGet<{ clientEmail?: string; privateKey?: string }>(
      "system_config/firebase_service_account"
    );
    if (rtdbCreds?.clientEmail && rtdbCreds?.privateKey) {
      clientEmail = rtdbCreds.clientEmail;
      rawPrivateKey = rtdbCreds.privateKey;
    }
  }

  const normalized = normalizeServiceAccount(clientEmail, rawPrivateKey);
  if (!normalized) return null;

  if (cachedFcmAccessToken && Date.now() < cachedFcmAccessToken.expiresAt - 60_000) {
    return cachedFcmAccessToken.token;
  }

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const b64url = (input: string | Buffer) =>
      Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = b64url(
      JSON.stringify({
        iss: normalized.clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: nowSec,
        exp: nowSec + 3600,
      })
    );
    const unsignedJwt = `${header}.${claim}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsignedJwt);
    signer.end();
    const signature = b64url(signer.sign(normalized.privateKey));
    const assertion = `${unsignedJwt}.${signature}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });
    if (!tokenRes.ok) return null;
    const tokenJson = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
    if (!tokenJson.access_token) return null;

    cachedFcmAccessToken = {
      token: tokenJson.access_token,
      expiresAt: Date.now() + Number(tokenJson.expires_in || 3600) * 1000,
    };
    return tokenJson.access_token;
  } catch (err) {
    console.warn("[Server FCM] Access token generation error:", err);
    return null;
  }
}

async function dispatchFcmToUsers(
  recipientIds: string[],
  broadcast: boolean,
  payload: { title: string; body: string; type?: string; url?: string; icon?: string },
  filter?: { schoolId?: string; classId?: string }
): Promise<number> {
  const accessToken = await getFcmAccessToken();
  if (!accessToken) return 0;

  const allTokens = await rtdbGet<Record<string, any>>("fcm_tokens");
  if (!allTokens || typeof allTokens !== "object") return 0;

  const cleanSet = new Set(recipientIds.map((id) => String(id).trim().replace(/[.#$[\]/]/g, "_")));
  const rawSet = new Set(recipientIds.map((id) => String(id).trim()));

  const targets: string[] = [];
  for (const [key, entry] of Object.entries(allTokens)) {
    if (!entry?.token) continue;
    if (filter?.schoolId && entry.schoolId && entry.schoolId !== filter.schoolId) continue;
    if (filter?.classId && entry.classId && entry.classId !== filter.classId) continue;

    const entryUserId = entry.userId ? String(entry.userId).trim() : "";
    const entryStudentId = entry.studentId ? String(entry.studentId).trim() : "";

    const isMatch =
      broadcast ||
      cleanSet.size === 0 ||
      cleanSet.has(key) ||
      (entryUserId && (rawSet.has(entryUserId) || cleanSet.has(entryUserId.replace(/[.#$[\]/]/g, "_")))) ||
      (entryStudentId && (rawSet.has(entryStudentId) || cleanSet.has(entryStudentId.replace(/[.#$[\]/]/g, "_"))));

    if (isMatch) {
      targets.push(entry.token);
    }
  }

  let sent = 0;
  await Promise.allSettled(
    Array.from(new Set(targets)).map(async (fcmToken) => {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: fcmToken,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: {
                title: payload.title,
                body: payload.body,
                type: String(payload.type || "DEFAULT"),
                url: String(payload.url || "/"),
                icon: String(payload.icon || "/icons/icon-192.png?v=3"),
                urgent: "1",
              },
              webpush: {
                headers: {
                  Urgency: "high",
                  TTL: "604800",
                },
                notification: {
                  title: payload.title,
                  body: payload.body,
                  icon: payload.icon || "/icons/icon-192.png?v=3",
                  badge: "/icons/icon-192.png?v=3",
                  requireInteraction: true,
                },
                fcm_options: {
                  link: payload.url || "/",
                },
              },
            },
          }),
        }
      );
      if (res.ok) sent++;
    })
  );
  return sent;
}

export interface LinkedStudentPushMeta {
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

export interface StoredPushSubscription {
  id: string;
  userId: string;
  subscription: webpush.PushSubscription;
  students: LinkedStudentPushMeta[];
  autoMonthlyEnabled: boolean;
  notifiedMonthsByStudent: Record<string, string>;
  updatedAt: string;
}

interface StudentDueSnapshot {
  studentId: string;
  schoolId: string;
  schoolName?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  rollNo?: string;
  pendingDues: number;
  monthlyFee?: number;
  updatedAt: string;
}

const subscriptionsMap = new Map<string, StoredPushSubscription>();
const studentDuesMap = new Map<string, StudentDueSnapshot>();

function getCurrentMonthCode(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function hashEndpoint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 28);
}

async function rtdbGet<T = any>(rtdbPath: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function rtdbPut(rtdbPath: string, payload: unknown): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Non-fatal fallback to local disk
  }
}

async function rtdbDelete(rtdbPath: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, {
      method: "DELETE",
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Ignore
  }
}

function saveLocalSubscriptions(): void {
  try {
    const obj = {
      subscriptions: Array.from(subscriptionsMap.values()),
      dues: Array.from(studentDuesMap.values()),
    };
    fs.writeFileSync(SUBS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch {
    // Ignore write failure on read-only fs
  }
}

function applyVapidDetailsSafe(publicKey: string, privateKey: string): { publicKey: string; privateKey: string } {
  const rawSubject = (process.env.VAPID_SUBJECT || "mailto:support@nsta.app").trim();
  const subject =
    rawSubject.startsWith("mailto:") || rawSubject.startsWith("https://")
      ? rawSubject
      : "mailto:support@nsta.app";
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    activeVapidKeys = { publicKey, privateKey };
    return activeVapidKeys;
  } catch {
    const generated = webpush.generateVAPIDKeys();
    webpush.setVapidDetails("mailto:support@nsta.app", generated.publicKey, generated.privateKey);
    activeVapidKeys = { publicKey: generated.publicKey, privateKey: generated.privateKey };
    return activeVapidKeys;
  }
}

function initPushEngineSync(): { publicKey: string; privateKey: string } {
  let publicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
  let privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();

  if (!publicKey || !privateKey) {
    for (const candidate of [VAPID_FILE, LEGACY_VAPID_FILE]) {
      try {
        if (fs.existsSync(candidate)) {
          const saved = JSON.parse(fs.readFileSync(candidate, "utf8"));
          if (saved?.publicKey && saved?.privateKey) {
            publicKey = saved.publicKey;
            privateKey = saved.privateKey;
            break;
          }
        }
      } catch {}
    }
  }

  if (!publicKey || !privateKey) {
    const generated = webpush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    try {
      fs.writeFileSync(VAPID_FILE, JSON.stringify({ publicKey, privateKey }, null, 2), "utf8");
    } catch {}
  }

  const keys = applyVapidDetailsSafe(publicKey, privateKey);

  // Hydrate local disk subscriptions immediately without blocking on network
  for (const candidate of [SUBS_FILE, LEGACY_SUBS_FILE]) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
        if (Array.isArray(parsed?.subscriptions)) {
          for (const sub of parsed.subscriptions) {
            if (sub?.id && sub?.subscription?.endpoint) {
              subscriptionsMap.set(sub.id, sub);
            }
          }
        }
        if (Array.isArray(parsed?.dues)) {
          for (const d of parsed.dues) {
            if (d?.schoolId && d?.studentId) {
              studentDuesMap.set(`${d.schoolId}__${d.studentId}`, d);
            }
          }
        }
      }
    } catch {}
  }

  return keys;
}

async function hydrateRemotePushEngine(): Promise<void> {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      const remoteKeys = await rtdbGet<{ publicKey?: string; privateKey?: string }>("system_config/school_webpush_vapid");
      if (remoteKeys?.publicKey && remoteKeys?.privateKey) {
        const applied = applyVapidDetailsSafe(remoteKeys.publicKey, remoteKeys.privateKey);
        try {
          fs.writeFileSync(VAPID_FILE, JSON.stringify(applied, null, 2), "utf8");
        } catch {}
      } else if (activeVapidKeys.publicKey && activeVapidKeys.privateKey) {
        await rtdbPut("system_config/school_webpush_vapid", activeVapidKeys);
      }
    }

    const [remoteSubs, remoteDues] = await Promise.all([
      rtdbGet<Record<string, StoredPushSubscription>>("school_webpush_subs"),
      rtdbGet<Record<string, StudentDueSnapshot>>("school_webpush_dues"),
    ]);

    if (remoteSubs && typeof remoteSubs === "object") {
      for (const [id, sub] of Object.entries(remoteSubs)) {
        if (sub && sub.subscription?.endpoint) {
          subscriptionsMap.set(id, {
            ...sub,
            id,
            students: Array.isArray(sub.students) ? sub.students : [],
            notifiedMonthsByStudent: sub.notifiedMonthsByStudent || {},
          });
        }
      }
    }

    if (remoteDues && typeof remoteDues === "object") {
      for (const [key, snap] of Object.entries(remoteDues)) {
        if (snap && snap.studentId) {
          studentDuesMap.set(key, snap);
        }
      }
    }

    saveLocalSubscriptions();
  } catch (err: any) {
    console.warn("[Server] Remote push hydration skipped:", err?.message || err);
  }
}

async function dispatchWebPush(
  record: StoredPushSubscription,
  payload: {
    title: string;
    body: string;
    type?: string;
    url?: string;
    studentId?: string;
    schoolId?: string;
    urgent?: boolean;
  }
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      record.subscription,
      JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/icons/icon-192.png",
        },
        data: {
          title: payload.title,
          body: payload.body,
          type: payload.type || "SCHOOL_ALERT",
          url: payload.url || "/",
          studentId: payload.studentId || "",
          schoolId: payload.schoolId || "",
          urgent: payload.urgent !== false ? "1" : "0",
        },
      }),
      {
        TTL: 60 * 60 * 24 * 7, // Hold up to 7 days if phone is switched off / offline
        urgency: "high",
      }
    );
    return true;
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      subscriptionsMap.delete(record.id);
      saveLocalSubscriptions();
      void rtdbDelete(`school_webpush_subs/${record.id}`);
    }
    return false;
  }
}

async function runMonthlyAutoFeeNotifier(): Promise<number> {
  const monthCode = getCurrentMonthCode();
  const monthLabel = new Date(`${monthCode}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  let sentCount = 0;

  for (const record of subscriptionsMap.values()) {
    if (record.autoMonthlyEnabled === false) continue;
    let changed = false;

    for (const st of record.students || []) {
      if (!st?.id) continue;
      const dueKey = `${st.schoolId}__${st.id}`;
      const latestSnap = studentDuesMap.get(dueKey);
      const pendingDues =
        latestSnap !== undefined
          ? Number(latestSnap.pendingDues || 0)
          : Number(st.pendingDues || 0);

      if (pendingDues <= 0) continue;
      if (record.notifiedMonthsByStudent?.[st.id] === monthCode) continue;

      const sName = latestSnap?.studentName || st.name || "Student";
      const clsLabel = latestSnap?.className || st.className || "";
      const schName = latestSnap?.schoolName || st.schoolName || "School";

      const ok = await dispatchWebPush(record, {
        title: `🏫 ${schName} • मासिक शुल्क अनुस्मारक`,
        body: `${sName}${clsLabel ? ` (${clsLabel})` : ""} का ${monthLabel} तक कुल देय शुल्क ₹${pendingDues.toLocaleString("en-IN")} जमा करना बाकी है। पासबुक देखने के लिए टैप करें।`,
        type: "MONTHLY_FEE",
        studentId: st.id,
        schoolId: st.schoolId,
        url: `/?schoolPortal=1&studentId=${encodeURIComponent(st.id)}&schoolTab=fees`,
        urgent: true,
      });

      if (ok) {
        record.notifiedMonthsByStudent = {
          ...(record.notifiedMonthsByStudent || {}),
          [st.id]: monthCode,
        };
        changed = true;
        sentCount++;
      }
    }

    if (changed) {
      record.updatedAt = new Date().toISOString();
      subscriptionsMap.set(record.id, record);
      void rtdbPut(`school_webpush_subs/${record.id}`, record);
    }
  }

  if (sentCount > 0) {
    saveLocalSubscriptions();
  }
  return sentCount;
}

async function startServer() {
  initPushEngineSync();
  const app = express();

  app.use(express.json({ limit: "5mb" }));

  // 1. Public VAPID key for browser PushManager.subscribe()
  app.get("/api/school-push/vapid-public-key", (_req, res) => {
    res.json({ publicKey: activeVapidKeys.publicKey });
  });

  // 2. Subscribe or update linked students for a device (supports Multi-Student under 1 User ID)
  app.post("/api/school-push/subscribe", async (req, res) => {
    try {
      const { userId, subscription, students, autoMonthlyEnabled = true } = req.body || {};
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: "Invalid Web Push subscription payload" });
      }

      const subId = hashEndpoint(subscription.endpoint);
      const existing = subscriptionsMap.get(subId);

      // Merge student list cleanly so multiple QR-scanned children stay registered
      const incomingStudents: LinkedStudentPushMeta[] = Array.isArray(students) ? students : [];
      const mergedMap = new Map<string, LinkedStudentPushMeta>();
      for (const prev of existing?.students || []) {
        if (prev?.id) mergedMap.set(prev.id, prev);
      }
      for (const next of incomingStudents) {
        if (next?.id) {
          const prev = mergedMap.get(next.id);
          mergedMap.set(next.id, { ...(prev || {}), ...next });

          if (typeof next.pendingDues === "number") {
            const dKey = `${next.schoolId}__${next.id}`;
            const dueSnap: StudentDueSnapshot = {
              studentId: next.id,
              schoolId: next.schoolId,
              schoolName: next.schoolName,
              studentName: next.name,
              classId: next.classId,
              className: next.className,
              rollNo: next.rollNo,
              pendingDues: next.pendingDues,
              monthlyFee: next.monthlyFee,
              updatedAt: new Date().toISOString(),
            };
            studentDuesMap.set(dKey, dueSnap);
            void rtdbPut(`school_webpush_dues/${dKey}`, dueSnap);
          }
        }
      }

      // If caller explicitly sent replaceStudents: true, use exact incoming list
      const finalStudents =
        req.body?.replaceStudents === true ? incomingStudents : Array.from(mergedMap.values());

      const record: StoredPushSubscription = {
        id: subId,
        userId: String(userId || existing?.userId || "guest"),
        subscription,
        students: finalStudents,
        autoMonthlyEnabled: Boolean(autoMonthlyEnabled),
        notifiedMonthsByStudent: existing?.notifiedMonthsByStudent || {},
        updatedAt: new Date().toISOString(),
      };

      subscriptionsMap.set(subId, record);
      saveLocalSubscriptions();
      await rtdbPut(`school_webpush_subs/${subId}`, record);

      // Trigger monthly check asynchronously so newly opted-in parents get this month's pending due summary if unpaid
      setTimeout(() => {
        void runMonthlyAutoFeeNotifier();
      }, 1500);

      return res.json({ ok: true, subId, linkedCount: finalStudents.length });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to save subscription" });
    }
  });

  // 3. Unsubscribe device
  app.post("/api/school-push/unsubscribe", async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (endpoint) {
      const subId = hashEndpoint(String(endpoint));
      subscriptionsMap.delete(subId);
      saveLocalSubscriptions();
      await rtdbDelete(`school_webpush_subs/${subId}`);
    }
    res.json({ ok: true });
  });

  // 4. Sync latest pending dues for a student (from Admin Fee Manager or Student Ledger)
  app.post("/api/school-push/sync-dues", async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : req.body?.studentId ? [req.body] : [];
    for (const item of items) {
      if (!item?.studentId || !item?.schoolId) continue;
      const dKey = `${item.schoolId}__${item.studentId}`;
      const snap: StudentDueSnapshot = {
        studentId: String(item.studentId),
        schoolId: String(item.schoolId),
        schoolName: item.schoolName || "",
        studentName: item.studentName || "",
        classId: item.classId || "",
        className: item.className || "",
        rollNo: item.rollNo || "",
        pendingDues: Math.max(0, Number(item.pendingDues || 0)),
        monthlyFee: Number(item.monthlyFee || 0),
        updatedAt: new Date().toISOString(),
      };
      studentDuesMap.set(dKey, snap);
      void rtdbPut(`school_webpush_dues/${dKey}`, snap);
    }
    saveLocalSubscriptions();
    res.json({ ok: true, count: items.length });
  });

  // 5. Send instant Lock Screen Push Notification (Notices, Holidays, Fee Receipts, Homework, or Test)
  app.post("/api/school-push/send", async (req, res) => {
    try {
      const {
        schoolId,
        classId,
        studentIds,
        userId,
        title,
        body,
        type = "SCHOOL_NOTICE",
        url = "/?schoolPortal=1",
        urgent = true,
      } = req.body || {};

      if (!title || !body) {
        return res.status(400).json({ error: "title and body are required" });
      }

      const targetStudentSet = Array.isArray(studentIds) && studentIds.length > 0
        ? new Set(studentIds.map(String))
        : null;

      let delivered = 0;
      let matchedDevices = 0;

      for (const record of subscriptionsMap.values()) {
        let matchedStudent: LinkedStudentPushMeta | undefined;

        if (userId && record.userId === String(userId)) {
          matchedStudent = record.students?.[0];
        }

        if (!matchedStudent && targetStudentSet) {
          matchedStudent = (record.students || []).find((s) => targetStudentSet.has(String(s.id)));
        }

        if (!matchedStudent && schoolId && !targetStudentSet && !userId) {
          matchedStudent = (record.students || []).find((s) => {
            if (s.schoolId && s.schoolId !== schoolId) return false;
            if (classId && s.classId && s.classId !== classId) return false;
            return true;
          }) || record.students?.[0];
        }

        // If it is a school broadcast without target students, deliver to all subscribers
        if (!matchedStudent && !targetStudentSet && !userId) {
          matchedStudent = record.students?.[0] || ({ id: "all", schoolId: schoolId || "" } as any);
        }

        if (!matchedStudent && !(userId && record.userId === String(userId))) continue;
        matchedDevices++;

        const targetUrl =
          matchedStudent?.id && !url.includes("studentId=")
            ? `${url}${url.includes("?") ? "&" : "?"}studentId=${encodeURIComponent(matchedStudent.id)}`
            : url;

        const ok = await dispatchWebPush(record, {
          title,
          body,
          type,
          url: targetUrl,
          studentId: matchedStudent?.id,
          schoolId: matchedStudent?.schoolId || schoolId,
          urgent,
        });
        if (ok) delivered++;
      }

      // Also dispatch FCM push to all matching devices
      const fcmRecipients: string[] = [
        ...(userId ? [String(userId)] : []),
        ...(Array.isArray(studentIds) ? studentIds.map(String) : []),
      ];

      // Add linked parent userIds for targeted students
      if (Array.isArray(studentIds) && studentIds.length > 0) {
        const studentIdSet = new Set(studentIds.map(String));
        for (const sub of subscriptionsMap.values()) {
          const hasStudent = (sub.students || []).some((s) => studentIdSet.has(String(s.id)));
          if (hasStudent && sub.userId) {
            fcmRecipients.push(String(sub.userId));
          }
        }
      }

      const isFcmBroadcast = !userId && (!studentIds || studentIds.length === 0 || studentIds.includes("all"));
      const fcmDelivered = await dispatchFcmToUsers(
        fcmRecipients,
        isFcmBroadcast,
        { title, body, type, url },
        { schoolId, classId }
      );
      delivered += fcmDelivered;

      return res.json({ ok: true, matchedDevices, delivered });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Push send failed" });
    }
  });

  // 6. Trigger Monthly Fee Due Push Notifications (manual 1-click from Admin OR automated)
  app.post("/api/school-push/trigger-monthly", async (req, res) => {
    try {
      const { schoolId, schoolName, monthLabel, duesList } = req.body || {};
      // If Admin passed explicit live duesList from FeeManager, update snapshots & push customized per-student amounts
      if (Array.isArray(duesList) && duesList.length > 0) {
        let delivered = 0;
        let matchedStudents = 0;
        const dueLookup = new Map<string, any>();

        for (const item of duesList) {
          if (!item?.studentId) continue;
          const sid = String(schoolId || item.schoolId || "");
          const lookupKey = sid ? `${sid}__${item.studentId}` : String(item.studentId);
          dueLookup.set(lookupKey, item);
          if (sid) {
            const dKey = `${sid}__${item.studentId}`;
            const snap: StudentDueSnapshot = {
              studentId: String(item.studentId),
              schoolId: sid,
              schoolName: schoolName || item.schoolName || "",
              studentName: item.studentName || "",
              classId: item.classId || "",
              className: item.className || "",
              rollNo: item.rollNo || "",
              pendingDues: Math.max(0, Number(item.pendingDues || 0)),
              monthlyFee: Number(item.monthlyFee || 0),
              updatedAt: new Date().toISOString(),
            };
            studentDuesMap.set(dKey, snap);
            void rtdbPut(`school_webpush_dues/${dKey}`, snap);
          }
        }
        saveLocalSubscriptions();

        const mCode = getCurrentMonthCode();
        for (const record of subscriptionsMap.values()) {
          for (const st of record.students || []) {
            const targetSchoolId = String(st.schoolId || schoolId || "");
            const compositeKey = targetSchoolId ? `${targetSchoolId}__${st.id}` : String(st.id);
            const dueItem =
              dueLookup.get(compositeKey) ||
              (!schoolId || st.schoolId === schoolId ? dueLookup.get(String(st.id)) : undefined);
            if (!dueItem || Number(dueItem.pendingDues || 0) <= 0) continue;
            matchedStudents++;
            const amt = Number(dueItem.pendingDues);
            const sName = dueItem.studentName || st.name || "Student";
            const cName = dueItem.className || st.className || "";
            const schTitle = schoolName || dueItem.schoolName || st.schoolName || "School";

            const ok = await dispatchWebPush(record, {
              title: `🏫 ${schTitle} • मासिक शुल्क सूचना`,
              body: `${sName}${cName ? ` (${cName})` : ""} का ${monthLabel || mCode} तक कुल देय शुल्क ₹${amt.toLocaleString("en-IN")} बकाया है। विवरण देखने के लिए टैप करें।`,
              type: "MONTHLY_FEE",
              studentId: st.id,
              schoolId: targetSchoolId,
              url: `/?schoolPortal=1&schoolId=${encodeURIComponent(targetSchoolId)}&studentId=${encodeURIComponent(st.id)}&schoolTab=fees`,
              urgent: true,
            });
            if (ok) {
              delivered++;
              record.notifiedMonthsByStudent = {
                ...(record.notifiedMonthsByStudent || {}),
                [compositeKey]: mCode,
              };
              subscriptionsMap.set(record.id, record);
              void rtdbPut(`school_webpush_subs/${record.id}`, record);
            }
          }
        }
        saveLocalSubscriptions();
        return res.json({ ok: true, matchedStudents, delivered });
      }

      const autoSent = await runMonthlyAutoFeeNotifier();
      return res.json({ ok: true, delivered: autoSent });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Monthly trigger failed" });
    }
  });

  // Also handle /api/notifications/push via both Web Push and FCM HTTP v1
  app.post("/api/notifications/push", async (req, res) => {
    const { recipientIds = [], broadcast = false, title, body, url, type, icon } = req.body || {};
    let delivered = 0;
    if (title && body) {
      for (const record of subscriptionsMap.values()) {
        if (
          broadcast ||
          !Array.isArray(recipientIds) ||
          recipientIds.length === 0 ||
          recipientIds.includes(record.userId) ||
          record.students.some((s) => recipientIds.includes(s.id))
        ) {
          const ok = await dispatchWebPush(record, { title, body, type, url, urgent: true });
          if (ok) delivered++;
        }
      }
      const fcmDelivered = await dispatchFcmToUsers(
        Array.isArray(recipientIds) ? recipientIds : [],
        Boolean(broadcast),
        { title, body, type, url, icon }
      );
      delivered += fcmDelivered;
    }
    res.json({ ok: true, delivered });
  });

  // Digital Asset Links for Android App / Trusted Web Activity (TWA) verification
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    const assetlinksPath = path.join(ROOT_DIR, "public", ".well-known", "assetlinks.json");
    if (fs.existsSync(assetlinksPath)) {
      res.sendFile(assetlinksPath);
    } else {
      res.json([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "app.vercel.sms2027.twa",
            sha256_cert_fingerprints: [
              "6A:E1:82:0D:45:BB:8F:02:B9:D6:E4:6A:70:8E:20:83:2F:9D:7A:0C:88:2E:36:77:96:80:97:D7:35:84:2A:1D"
            ]
          }
        }
      ]);
    }
  });

  // Telegram helper proxy routes (parity with serverless api/push-router.ts)
  app.get("/api/telegram/health", async (_req, res) => {
    const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || "").trim();
    if (!token) return res.status(200).json({ ok: false, error: "TELEGRAM_BOT_TOKEN not configured" });
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await r.json().catch(() => ({ ok: false }))) as any;
      return res.status(r.ok ? 200 : 502).json({ ok: Boolean(data?.ok), bot: data?.result, error: data?.description });
    } catch (err: any) {
      return res.status(502).json({ ok: false, error: err?.message || "Telegram health check failed" });
    }
  });

  app.post("/api/telegram/sendMessage", async (req, res) => {
    const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || "").trim();
    const defaultChatId = (process.env.TELEGRAM_CHAT_CHANNEL_ID || process.env.VITE_TELEGRAM_CHAT_CHANNEL_ID || "").trim();
    if (!token) return res.status(400).json({ ok: false, error: "TELEGRAM_BOT_TOKEN not configured" });
    try {
      const { text, chat_id, reply_to_message_id, parse_mode = "HTML" } = req.body || {};
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat_id || defaultChatId,
          text,
          reply_to_message_id,
          parse_mode,
        }),
      });
      const data = await r.json().catch(() => ({ ok: false }));
      return res.status(r.ok ? 200 : 502).json(data);
    } catch (err: any) {
      return res.status(502).json({ ok: false, error: err?.message || "Telegram sendMessage failed" });
    }
  });

  app.get("/api/telegram/file", (req, res) => {
    const filePath = String(req.query?.path || "");
    const token = String(req.query?.token || process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || "").trim();
    if (!filePath || !token) return res.status(400).json({ error: "Missing path or token" });
    return res.redirect(302, `https://api.telegram.org/file/bot${token}/${filePath}`);
  });

  // Periodic background scheduler (checks every 15 minutes for new month's pending fee alerts)
  setInterval(() => {
    void runMonthlyAutoFeeNotifier();
  }, 15 * 60 * 1000);

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Express error handler so middleware errors never terminate the process
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Server] Express middleware error:", err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({ error: err?.message || "Internal Server Error" });
    }
  });

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT} (${isProduction ? "production" : "development"})`);
    // Hydrate remote RTDB push state asynchronously so server startup & pre-warming are never blocked
    void hydrateRemotePushEngine();
  });

  httpServer.on("clientError", (err: any, socket) => {
    if (err?.code === "ECONNRESET" || !socket.writable) return;
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });
}

void startServer();
