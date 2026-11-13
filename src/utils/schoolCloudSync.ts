import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

const sanitizeCloudPayload = (val: unknown): unknown => {
  if (val === null || val === undefined) return null;
  if (typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(sanitizeCloudPayload);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (v !== undefined) out[k] = sanitizeCloudPayload(v);
  }
  return out;
};

const withCloudTimeout = <T,>(promise: Promise<T>, ms = 3500): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Cloud sync timed out after ${ms}ms`)), ms)
    ),
  ]);

const isDemoSchoolId = (schoolId?: string | null): boolean =>
  !schoolId || schoolId === "demo_school" || schoolId.startsWith("demo_");

export async function loadSchoolSubcollection<T extends { id: string }>(
  schoolId: string | undefined,
  subcollection: string,
  localKey: string
): Promise<T[]> {
  let localItems: T[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localItems = parsed;
    }
  } catch (err) {
    console.warn(`[schoolCloudSync] Failed reading local cache ${localKey}:`, err);
  }

  if (!db || !schoolId || isDemoSchoolId(schoolId)) {
    return localItems;
  }

  try {
    const snap = await withCloudTimeout(
      getDocs(collection(db, "schools", schoolId, subcollection)),
      4000
    );
    const cloudItems = snap.docs.map((d) => d.data() as T);
    if (cloudItems.length > 0) {
      try {
        localStorage.setItem(localKey, JSON.stringify(cloudItems));
      } catch (err) {
        console.warn(`[schoolCloudSync] Failed caching ${localKey}:`, err);
      }
      return cloudItems;
    }
    // If cloud is empty and local has user-entered items, push local items up once
    if (localItems.length > 0) {
      await syncSchoolSubcollection(schoolId, subcollection, localItems).catch(() => {});
    }
    return localItems;
  } catch (err) {
    console.warn(`[schoolCloudSync] Cloud read failed for ${subcollection}:`, err);
    return localItems;
  }
}

export async function syncSchoolSubcollection<T extends { id: string }>(
  schoolId: string | undefined,
  subcollection: string,
  items: T[]
): Promise<void> {
  if (!db || !schoolId || isDemoSchoolId(schoolId)) return;
  try {
    const colRef = collection(db, "schools", schoolId, subcollection);
    const existingSnap = await withCloudTimeout(getDocs(colRef), 4000);
    const nextIds = new Set(items.map((item) => String(item.id)));
    const batch = writeBatch(db);

    for (const item of items) {
      const id = String(item.id);
      batch.set(
        doc(db, "schools", schoolId, subcollection, id),
        sanitizeCloudPayload({ ...item, schoolId, updatedAt: new Date().toISOString() }) as Record<string, unknown>,
        { merge: true }
      );
    }

    for (const existingDoc of existingSnap.docs) {
      if (!nextIds.has(existingDoc.id)) {
        batch.delete(existingDoc.ref);
      }
    }

    await withCloudTimeout(batch.commit(), 5000);
  } catch (err) {
    console.warn(`[schoolCloudSync] Batch sync failed for ${subcollection}:`, err);
  }
}

export async function saveSchoolSubdoc<T extends { id: string }>(
  schoolId: string | undefined,
  subcollection: string,
  item: T
): Promise<void> {
  if (!db || !schoolId || isDemoSchoolId(schoolId)) return;
  try {
    await withCloudTimeout(
      setDoc(
        doc(db, "schools", schoolId, subcollection, String(item.id)),
        sanitizeCloudPayload({ ...item, schoolId, updatedAt: new Date().toISOString() }) as Record<string, unknown>,
        { merge: true }
      ),
      4000
    );
  } catch (err) {
    console.warn(`[schoolCloudSync] Save doc failed for ${subcollection}/${item.id}:`, err);
  }
}

export async function deleteSchoolSubdoc(
  schoolId: string | undefined,
  subcollection: string,
  docId: string
): Promise<void> {
  if (!db || !schoolId || isDemoSchoolId(schoolId)) return;
  try {
    await withCloudTimeout(
      deleteDoc(doc(db, "schools", schoolId, subcollection, String(docId))),
      4000
    );
  } catch (err) {
    console.warn(`[schoolCloudSync] Delete doc failed for ${subcollection}/${docId}:`, err);
  }
}

export async function loadSchoolSettingBlob<T>(
  schoolId: string | undefined,
  settingKey: string,
  localKey: string,
  fallback: T
): Promise<T> {
  let localVal: T = fallback;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localVal = JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[schoolCloudSync] Failed reading local blob ${localKey}:`, err);
  }

  if (!db || !schoolId || isDemoSchoolId(schoolId)) return localVal;

  try {
    const snap = await withCloudTimeout(
      getDoc(doc(db, "schools", schoolId, "erp_settings", settingKey)),
      3500
    );
    if (snap.exists() && snap.data()?.value !== undefined) {
      const cloudVal = snap.data().value as T;
      try {
        localStorage.setItem(localKey, JSON.stringify(cloudVal));
      } catch {}
      return cloudVal;
    }
  } catch (err) {
    console.warn(`[schoolCloudSync] Failed loading setting blob ${settingKey}:`, err);
  }
  return localVal;
}

export async function saveSchoolSettingBlob<T>(
  schoolId: string | undefined,
  settingKey: string,
  localKey: string,
  value: T
): Promise<void> {
  try {
    localStorage.setItem(localKey, JSON.stringify(value));
  } catch (err) {
    console.warn(`[schoolCloudSync] Failed saving local blob ${localKey}:`, err);
  }
  if (!db || !schoolId || isDemoSchoolId(schoolId)) return;
  try {
    await withCloudTimeout(
      setDoc(
        doc(db, "schools", schoolId, "erp_settings", settingKey),
        sanitizeCloudPayload({
          value,
          schoolId,
          updatedAt: new Date().toISOString(),
        }) as Record<string, unknown>,
        { merge: true }
      ),
      4000
    );
  } catch (err) {
    console.warn(`[schoolCloudSync] Failed saving setting blob ${settingKey}:`, err);
  }
}
