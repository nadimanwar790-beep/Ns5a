import crypto from "crypto";
import webpush from "web-push";

const RTDB_BASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  "https://nst2512-6a2e4-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "nst2512-6a2e4";
const TG_BOT_TOKEN = (
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.VITE_TELEGRAM_BOT_TOKEN ||
  "8932524192:AAGVxYSuKPZX6sOQFkXz0U7ESVQ2NcHmJZw"
).trim();
const TG_CHAT_CHANNEL_ID = (
  process.env.TELEGRAM_CHAT_CHANNEL_ID ||
  process.env.VITE_TELEGRAM_CHAT_CHANNEL_ID ||
  "-1004290996442"
).trim();

interface LinkedStudentPushMeta {
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

interface StoredPushSubscription {
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

let cachedVapid: { publicKey: string; privateKey: string } | null = null;
let cachedFcmAccessToken: { token: string; expiresAt: number } | null = null;

function hashEndpoint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 28);
}

function getCurrentMonthCode(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function rtdbGet<T = any>(rtdbPath: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
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
    const timer = setTimeout(() => controller.abort(), 4500);
    await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {}
}

async function rtdbDelete(rtdbPath: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, {
      method: "DELETE",
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {}
}

async function ensureVapidConfigured(): Promise<{ publicKey: string; privateKey: string }> {
  if (cachedVapid) return cachedVapid;

  let publicKey = process.env.VAPID_PUBLIC_KEY || "";
  let privateKey = process.env.VAPID_PRIVATE_KEY || "";

  if (!publicKey || !privateKey) {
    const remoteKeys = await rtdbGet<{ publicKey?: string; privateKey?: string }>(
      "system_config/school_webpush_vapid"
    );
    if (remoteKeys?.publicKey && remoteKeys?.privateKey) {
      publicKey = remoteKeys.publicKey;
      privateKey = remoteKeys.privateKey;
    }
  }

  if (!publicKey || !privateKey) {
    const generated = webpush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    await rtdbPut("system_config/school_webpush_vapid", { publicKey, privateKey });
  }

  const subject = process.env.VAPID_SUBJECT || "mailto:support@nsta.app";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  cachedVapid = { publicKey, privateKey };
  return cachedVapid;
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
    await ensureVapidConfigured();
    await webpush.sendNotification(
      record.subscription,
      JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/icons/icon-192.png?v=3",
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
        TTL: 60 * 60 * 24 * 7,
        urgency: "high",
      }
    );
    return true;
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await rtdbDelete(`school_webpush_subs/${record.id}`);
    }
    return false;
  }
}

async function getFcmAccessToken(): Promise<string | null> {
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim().replace(/^["']+|["',\s]+$/g, "");
  const rawPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim().replace(/^["']+|["',\s]+$/g, "");
  if (!clientEmail || !rawPrivateKey) return null;

  if (cachedFcmAccessToken && Date.now() < cachedFcmAccessToken.expiresAt - 60_000) {
    return cachedFcmAccessToken.token;
  }

  try {
    const privateKey = rawPrivateKey.replace(/\\n/g, "\n");
    const nowSec = Math.floor(Date.now() / 1000);
    const b64url = (input: string | Buffer) =>
      Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = b64url(
      JSON.stringify({
        iss: clientEmail,
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
    const signature = b64url(signer.sign(privateKey));
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
  } catch {
    return null;
  }
}

async function dispatchFcmToUsers(
  recipientIds: string[],
  broadcast: boolean,
  payload: { title: string; body: string; type?: string; url?: string; icon?: string }
): Promise<number> {
  const accessToken = await getFcmAccessToken();
  if (!accessToken) return 0;

  const allTokens = await rtdbGet<Record<string, { token?: string; userId?: string }>>("fcm_tokens");
  if (!allTokens || typeof allTokens !== "object") return 0;

  const cleanSet = new Set(recipientIds.map((id) => String(id).trim().replace(/[.#$[\]/]/g, "_")));
  const rawSet = new Set(recipientIds.map((id) => String(id).trim()));

  const targets: string[] = [];
  for (const [key, entry] of Object.entries(allTokens)) {
    if (!entry?.token) continue;
    if (broadcast || cleanSet.size === 0 || cleanSet.has(key) || (entry.userId && rawSet.has(String(entry.userId)))) {
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

export default async function handler(req: any, res: any) {
  const rawPath = String(req.query?.__path || req.url || "").split("?")[0].replace(/^\/?api\//, "");
  const method = String(req.method || "GET").toUpperCase();

  try {
    if (method === "GET" && rawPath === "school-push/vapid-public-key") {
      const { publicKey } = await ensureVapidConfigured();
      return res.status(200).json({ publicKey });
    }

    if (method === "POST" && rawPath === "school-push/subscribe") {
      const { userId, subscription, students, autoMonthlyEnabled = true, replaceStudents } = req.body || {};
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: "Invalid Web Push subscription payload" });
      }
      const subId = hashEndpoint(subscription.endpoint);
      const existing = await rtdbGet<StoredPushSubscription>(`school_webpush_subs/${subId}`);
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
            await rtdbPut(`school_webpush_dues/${dKey}`, {
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
            });
          }
        }
      }

      const finalStudents = replaceStudents === true ? incomingStudents : Array.from(mergedMap.values());
      const record: StoredPushSubscription = {
        id: subId,
        userId: String(userId || existing?.userId || "guest"),
        subscription,
        students: finalStudents,
        autoMonthlyEnabled: Boolean(autoMonthlyEnabled),
        notifiedMonthsByStudent: existing?.notifiedMonthsByStudent || {},
        updatedAt: new Date().toISOString(),
      };
      await rtdbPut(`school_webpush_subs/${subId}`, record);
      return res.status(200).json({ ok: true, subId, linkedCount: finalStudents.length });
    }

    if (method === "POST" && rawPath === "school-push/unsubscribe") {
      const endpoint = req.body?.endpoint;
      if (endpoint) {
        await rtdbDelete(`school_webpush_subs/${hashEndpoint(String(endpoint))}`);
      }
      return res.status(200).json({ ok: true });
    }

    if (method === "POST" && rawPath === "school-push/sync-dues") {
      const items = Array.isArray(req.body?.items) ? req.body.items : req.body?.studentId ? [req.body] : [];
      for (const item of items) {
        if (!item?.studentId || !item?.schoolId) continue;
        const dKey = `${item.schoolId}__${item.studentId}`;
        await rtdbPut(`school_webpush_dues/${dKey}`, {
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
        });
      }
      return res.status(200).json({ ok: true, count: items.length });
    }

    if (method === "POST" && rawPath === "school-push/send") {
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

      const subsObj = (await rtdbGet<Record<string, StoredPushSubscription>>("school_webpush_subs")) || {};
      const targetStudentSet =
        Array.isArray(studentIds) && studentIds.length > 0 ? new Set(studentIds.map(String)) : null;

      let delivered = 0;
      let matchedDevices = 0;

      for (const [id, record] of Object.entries(subsObj)) {
        if (!record?.subscription?.endpoint) continue;
        record.id = id;
        let matchedStudent: LinkedStudentPushMeta | undefined;

        if (userId && record.userId === String(userId)) {
          matchedStudent = record.students?.[0];
        }
        if (!matchedStudent && targetStudentSet) {
          matchedStudent = (record.students || []).find((s) => targetStudentSet.has(String(s.id)));
        }
        if (!matchedStudent && schoolId && !targetStudentSet && !userId) {
          matchedStudent = (record.students || []).find((s) => {
            if (s.schoolId !== schoolId) return false;
            if (classId && s.classId && s.classId !== classId) return false;
            return true;
          });
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

      if (userId) {
        delivered += await dispatchFcmToUsers([String(userId)], false, { title, body, type, url });
      }

      return res.status(200).json({ ok: true, matchedDevices, delivered });
    }

    if (method === "POST" && rawPath === "school-push/trigger-monthly") {
      const { schoolId, schoolName, monthLabel, duesList } = req.body || {};
      const subsObj = (await rtdbGet<Record<string, StoredPushSubscription>>("school_webpush_subs")) || {};
      const mCode = getCurrentMonthCode();
      let delivered = 0;
      let matchedStudents = 0;

      if (Array.isArray(duesList) && duesList.length > 0) {
        const dueLookup = new Map<string, any>();
        for (const item of duesList) {
          if (!item?.studentId) continue;
          const sid = String(schoolId || item.schoolId || "");
          const lookupKey = sid ? `${sid}__${item.studentId}` : String(item.studentId);
          dueLookup.set(lookupKey, item);
          if (sid) {
            await rtdbPut(`school_webpush_dues/${sid}__${item.studentId}`, {
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
            });
          }
        }

        for (const [id, record] of Object.entries(subsObj)) {
          if (!record?.subscription?.endpoint) continue;
          record.id = id;
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
              await rtdbPut(`school_webpush_subs/${id}`, record);
            }
          }
        }
        return res.status(200).json({ ok: true, matchedStudents, delivered });
      }

      const duesObj = (await rtdbGet<Record<string, StudentDueSnapshot>>("school_webpush_dues")) || {};
      const autoMonthLabel = new Date(`${mCode}-01T00:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });

      for (const [id, record] of Object.entries(subsObj)) {
        if (!record?.subscription?.endpoint || record.autoMonthlyEnabled === false) continue;
        record.id = id;
        let changed = false;
        for (const st of record.students || []) {
          if (!st?.id) continue;
          const dueKey = `${st.schoolId}__${st.id}`;
          const latestSnap = duesObj[dueKey];
          const pendingDues =
            latestSnap !== undefined ? Number(latestSnap.pendingDues || 0) : Number(st.pendingDues || 0);
          if (pendingDues <= 0 || record.notifiedMonthsByStudent?.[st.id] === mCode) continue;

          const sName = latestSnap?.studentName || st.name || "Student";
          const clsLabel = latestSnap?.className || st.className || "";
          const schName = latestSnap?.schoolName || st.schoolName || "School";

          const ok = await dispatchWebPush(record, {
            title: `🏫 ${schName} • मासिक शुल्क अनुस्मारक`,
            body: `${sName}${clsLabel ? ` (${clsLabel})` : ""} का ${autoMonthLabel} तक कुल देय शुल्क ₹${pendingDues.toLocaleString("en-IN")} जमा करना बाकी है। पासबुक देखने के लिए टैप करें।`,
            type: "MONTHLY_FEE",
            studentId: st.id,
            schoolId: st.schoolId,
            url: `/?schoolPortal=1&studentId=${encodeURIComponent(st.id)}&schoolTab=fees`,
            urgent: true,
          });
          if (ok) {
            record.notifiedMonthsByStudent = {
              ...(record.notifiedMonthsByStudent || {}),
              [st.id]: mCode,
            };
            changed = true;
            delivered++;
          }
        }
        if (changed) {
          record.updatedAt = new Date().toISOString();
          await rtdbPut(`school_webpush_subs/${id}`, record);
        }
      }
      return res.status(200).json({ ok: true, delivered });
    }

    if (method === "POST" && rawPath === "notifications/push") {
      const { recipientIds = [], broadcast = false, title, body, url, type, icon } = req.body || {};
      let delivered = 0;
      if (title && body) {
        const subsObj = (await rtdbGet<Record<string, StoredPushSubscription>>("school_webpush_subs")) || {};
        for (const [id, record] of Object.entries(subsObj)) {
          if (!record?.subscription?.endpoint) continue;
          record.id = id;
          if (
            broadcast ||
            !Array.isArray(recipientIds) ||
            recipientIds.length === 0 ||
            recipientIds.includes(record.userId) ||
            (record.students || []).some((s) => recipientIds.includes(s.id))
          ) {
            const ok = await dispatchWebPush(record, { title, body, type, url, urgent: true });
            if (ok) delivered++;
          }
        }
        delivered += await dispatchFcmToUsers(
          Array.isArray(recipientIds) ? recipientIds : [],
          Boolean(broadcast),
          { title, body, type, url, icon }
        );
      }
      return res.status(200).json({ ok: true, delivered });
    }

    if (method === "GET" && rawPath === "telegram/health") {
      const r = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getMe`);
      const data = await r.json().catch(() => ({ ok: false }));
      return res.status(r.ok ? 200 : 502).json({ ok: Boolean(data?.ok), bot: data?.result, error: data?.description });
    }

    if (method === "POST" && rawPath === "telegram/sendMessage") {
      const { text, chat_id, reply_to_message_id, parse_mode = "HTML" } = req.body || {};
      const r = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat_id || TG_CHAT_CHANNEL_ID,
          text,
          reply_to_message_id,
          parse_mode,
        }),
      });
      const data = await r.json().catch(() => ({ ok: false }));
      return res.status(r.ok ? 200 : 502).json(data);
    }

    if (method === "GET" && rawPath === "telegram/file") {
      const filePath = String(req.query?.path || "");
      const token = String(req.query?.token || TG_BOT_TOKEN);
      if (!filePath) return res.status(400).json({ error: "Missing path" });
      return res.redirect(302, `https://api.telegram.org/file/bot${token}/${filePath}`);
    }

    return res.status(404).json({ error: `Unknown push endpoint: ${rawPath}` });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Serverless push handler error" });
  }
}
