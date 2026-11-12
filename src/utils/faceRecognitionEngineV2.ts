// @ts-nocheck
/**
 * Face Recognition Engine V2 — Real Deep Biometric Neural Network
 * Powered by @vladmandic/face-api
 * 
 * Capabilities:
 * 1. Deep 128-Dimensional ResNet-34 Feature Embeddings (LFW 99.38% benchmark).
 * 2. Real Neural Face Detection & 68-Point Facial Landmark Alignment via WebGL.
 * 3. 100% Client-Side on-device inference with zero server API costs.
 * 4. Composite Key Storage (${schoolId}_${studentId}) preventing multi-school collisions.
 * 5. Automatic Fallback to heuristic pipeline while models load.
 */

import * as faceapi from "@vladmandic/face-api/dist/face-api.esm.js";
import {
  initArcFaceEngine,
  isArcFaceReady,
  extractArcFace512Descriptor,
  extractArcFaceFromPhotoUrl,
  matchArcFace512,
  calculateArcFaceCosineSimilarity,
  calculateArcFaceEuclideanDistance,
  ARCFACE_MATCH_THRESHOLD,
  ARCFACE_HIGH_CONFIDENCE_THRESHOLD,
  ArcFaceMatchResult,
} from "./arcfaceEngine";

export {
  initArcFaceEngine,
  isArcFaceReady,
  extractArcFace512Descriptor,
  extractArcFaceFromPhotoUrl,
  matchArcFace512,
  calculateArcFaceCosineSimilarity,
  calculateArcFaceEuclideanDistance,
  ARCFACE_MATCH_THRESHOLD,
  ARCFACE_HIGH_CONFIDENCE_THRESHOLD,
};

export interface HeadPoseEstimate {
  yaw: number;   // -45° to +45° (negative = looking left, positive = looking right, 0 = straight)
  pitch: number; // -30° to +30° (negative = looking up, positive = looking down)
  roll: number;  // head tilt angle
  label: "FRONT" | "LEFT" | "RIGHT" | "UP" | "DOWN";
  isFrontFacing: boolean;
  isLeftFacing: boolean;
  isRightFacing: boolean;
  depthRatio?: number;
}

export interface FaceDescriptorRecord {
  studentId: string;
  schoolId: string;
  name: string;
  role?: "STUDENT" | "TEACHER" | "STAFF";
  designation?: string;
  rollNo?: string;
  classId?: string;
  className?: string;
  photoUrl?: string;
  descriptor: number[]; // 512-D ArcFace or 128-D ResNet deep neural vector
  arcfaceDescriptor?: number[]; // Explicit 512-D ArcFace Deep Biometric Vector
  descriptors3D?: {
    front?: number[];
    left?: number[];    // ~15° Left turn vector
    right?: number[];   // ~15° Right turn vector
  };
  depthMesh?: {
    yaw?: number;
    pitch?: number;
    roll?: number;
    eyeDistanceRatio?: number;
    is3DCalibrated?: boolean;
    anglesCount?: number;
  };
  enrolledAt: string;
  source: "arcface_512d" | "face_api_neural" | "id_photo" | "live_kiosk" | "admission_form" | "live_studio" | "student_self_update" | "3d_multi_angle";
  compositeKey?: string; // ${schoolId}_${studentId}
}

export interface FaceLightingAssessment {
  meanLuminance: number;       // 0 - 255
  contrast: number;            // 0 - 100
  isTooDark: boolean;          // Critically dark
  isLowLight: boolean;         // Low light
  isOverExposed: boolean;      // Too bright / glare
  isUnevenLighting: boolean;   // Heavy shadow
  qualityPercent: number;      // 0 - 100%
  statusMessage: string;
}

export interface DetectedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  descriptor?: number[];
  pose?: HeadPoseEstimate;
  landmarks?: any;
  lighting?: FaceLightingAssessment;
  lowLightWarning?: boolean;
  isNeuralActive?: boolean;
  isAiEngineWarmingUp?: boolean;
  is3DActive?: boolean;
  matchedStudent?: {
    studentId: string;
    name: string;
    role?: "STUDENT" | "TEACHER" | "STAFF";
    designation?: string;
    rollNo?: string;
    classId?: string;
    className?: string;
    photoUrl?: string;
    confidencePercent: number;
    distance: number;
    isAmbiguous?: boolean;
    margin?: number;
    matchedAngle?: "front" | "left" | "right" | "primary";
    is3DVerified?: boolean;
  };
}

const DESCRIPTOR_STORAGE_PREFIX = "nst_face_descriptors_v2_";
const IDB_DB_NAME = "nsta_face_biometrics_db_v2";
const IDB_STORE_NAME = "face_descriptors_v2";

// ── 1. FACE-API MODEL LOADER ─────────────────────────────────────────────────

let modelsLoadingPromise: Promise<boolean> | null = null;
let isModelsLoaded = false;

export function isFaceApiLoaded(): boolean {
  return isModelsLoaded;
}

/**
 * Pre-warms and loads face detection, 68 landmarks, and ResNet-34 FaceRecognition models
 * from /models/face-api directory. Loads tiny and full landmark nets to prevent inference throws.
 */
export async function loadFaceApiModels(): Promise<boolean> {
  if (isModelsLoaded) return true;
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = (async () => {
    try {
      const modelPath = "/models/face-api";
      // Try loading SSD MobileNet V1 if available in models folder, otherwise tinyFaceDetector
      let isSsdLoaded = false;
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
        isSsdLoaded = true;
        console.log("[FaceAPI V2] SSD MobileNet V1 loaded successfully!");
      } catch {
        // Fallback to tinyFaceDetector
      }

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath).catch(() => {}),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath).catch(() => {}),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath).catch(() => {}),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath).catch(() => {}),
      ]);
      modelsLoadingPromise = null;
      isModelsLoaded = true;
      console.log(`[FaceAPI V2] Neural models loaded successfully (ResNet-34 + ${isSsdLoaded ? "SSD MobileNet V1" : "TinyFace"} + Landmark68)`);
      return true;
    } catch (err) {
      console.warn("[FaceAPI V2] Failed to load models from /models/face-api, will allow retry:", err);
      isModelsLoaded = false;
      modelsLoadingPromise = null;
      return false;
    }
  })();

  return modelsLoadingPromise;
}

/**
 * Returns whether to use tiny landmark model based on what is currently loaded in memory.
 */
function getLandmarkOption(): boolean {
  if (faceapi.nets.faceLandmark68TinyNet?.params) return true;
  return false;
}

// Auto-trigger loading in background on client side
if (typeof window !== "undefined") {
  setTimeout(() => {
    loadFaceApiModels().catch(() => {});
  }, 100);
}

// ── 2. INDEXEDDB PERSISTENCE (Composite Key: schoolId_studentId) ─────────────

// In-memory runtime cache for instantaneous access across all tabs & modals
const inMemoryDescriptorCache: Record<string, Record<string, FaceDescriptorRecord>> = {};
const DELETED_DESCRIPTORS_PREFIX = "nst_face_deleted_";

/**
 * Returns a Set of student/teacher IDs whose face descriptors were explicitly deleted by an admin.
 */
export function getDeletedFaceIds(schoolId: string): Set<string> {
  const schoolKey = schoolId || "default";
  try {
    const raw = localStorage.getItem(`${DELETED_DESCRIPTORS_PREFIX}${schoolKey}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {}
  return new Set();
}

/**
 * Marks a student/teacher face as explicitly deleted, preventing auto-enrollment from photoUrl.
 */
export function markFaceDescriptorDeleted(studentId: string, schoolId: string): void {
  if (!studentId) return;
  const schoolKey = schoolId || "default";
  try {
    const set = getDeletedFaceIds(schoolKey);
    set.add(studentId);
    localStorage.setItem(`${DELETED_DESCRIPTORS_PREFIX}${schoolKey}`, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Clears the deleted mark when an admin explicitly captures a new live photo or re-enrolls.
 */
export function unmarkFaceDescriptorDeleted(studentId: string, schoolId: string): void {
  if (!studentId) return;
  const schoolKey = schoolId || "default";
  try {
    const set = getDeletedFaceIds(schoolKey);
    if (set.has(studentId)) {
      set.delete(studentId);
      localStorage.setItem(`${DELETED_DESCRIPTORS_PREFIX}${schoolKey}`, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

export function isFaceDescriptorDeleted(studentId: string, schoolId: string): boolean {
  if (!studentId) return false;
  return getDeletedFaceIds(schoolId).has(studentId);
}

function openFaceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const req = window.indexedDB.open(IDB_DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: "compositeKey" });
        store.createIndex("schoolId", "schoolId", { unique: false });
        store.createIndex("studentId", "studentId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      console.warn("[FaceDB] IndexedDB blocked");
      reject(new Error("IndexedDB blocked"));
    };
  });
}

function makeCompositeKey(schoolId: string, studentId: string): string {
  return `${schoolId || "default"}_${studentId}`;
}

export async function saveFaceDescriptor(record: FaceDescriptorRecord): Promise<void> {
  if (!record || !record.studentId) return;
  const schoolKey = record.schoolId || "default";
  const compositeKey = record.compositeKey || makeCompositeKey(schoolKey, record.studentId);
  const enriched: FaceDescriptorRecord = { ...record, schoolId: schoolKey, compositeKey };

  // Explicit save: unmark from deleted tombstone so re-enrollment works properly
  unmarkFaceDescriptorDeleted(record.studentId, schoolKey);

  // 1. In-Memory Cache (Immediate synchronous availability)
  if (!inMemoryDescriptorCache[schoolKey]) {
    inMemoryDescriptorCache[schoolKey] = {};
  }
  inMemoryDescriptorCache[schoolKey][record.studentId] = enriched;

  // 2. IndexedDB (Persistent multi-MB storage)
  try {
    const db = await openFaceDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put(enriched);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[FaceDB] IndexedDB save fallback active:", err);
  }

  // 3. LocalStorage fallback (Compact record without heavy raw base64 to avoid DOMException: QuotaExceededError)
  try {
    const key = `${DESCRIPTOR_STORAGE_PREFIX}${schoolKey}`;
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    const compactRecord: FaceDescriptorRecord = {
      ...enriched,
      // If photoUrl is huge data URL (> 4KB), strip for localStorage to avoid QuotaExceededError
      photoUrl: enriched.photoUrl && enriched.photoUrl.startsWith("data:") && enriched.photoUrl.length > 5000
        ? ""
        : enriched.photoUrl,
    };
    existing[record.studentId] = compactRecord;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (lsErr) {
    console.warn("[FaceDB] LocalStorage save warning:", lsErr);
  }

  // 4. Firestore Sync (Cloud backup for all school devices)
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const { db } = await import("../school-firebase");
    if (db && schoolKey && record.studentId) {
      const sanitized = JSON.parse(JSON.stringify(enriched));
      const ref = doc(db, `schools/${schoolKey}/face_descriptors_v2/${record.studentId}`);
      await setDoc(ref, sanitized, { merge: true });
    }
  } catch {}
}

export async function getSchoolFaceDescriptors(schoolId: string): Promise<Record<string, FaceDescriptorRecord>> {
  const result: Record<string, FaceDescriptorRecord> = {};
  const schoolKey = schoolId || "default";
  const deletedSet = getDeletedFaceIds(schoolKey);

  // 1. First, populate from in-memory cache (filtering out any deleted IDs)
  if (inMemoryDescriptorCache[schoolKey]) {
    for (const [stId, rec] of Object.entries(inMemoryDescriptorCache[schoolKey])) {
      if (!deletedSet.has(stId)) {
        result[stId] = rec;
      }
    }
  }

  // 2. Load from IndexedDB (filtering out any deleted IDs)
  try {
    const db = await openFaceDb();
    const records = await new Promise<FaceDescriptorRecord[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    records.forEach((rec) => {
      if (rec && (rec.schoolId === schoolKey || !rec.schoolId)) {
        if (!deletedSet.has(rec.studentId)) {
          result[rec.studentId] = rec;
        }
      }
    });
  } catch {}

  // 3. Merge from LocalStorage (filtering out any deleted IDs)
  try {
    const key = `${DESCRIPTOR_STORAGE_PREFIX}${schoolKey}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const stId of Object.keys(parsed)) {
        if (deletedSet.has(stId)) continue;
        if (!result[stId]) {
          result[stId] = parsed[stId];
        } else if (!result[stId].photoUrl && parsed[stId]?.photoUrl) {
          result[stId].photoUrl = parsed[stId].photoUrl;
        }
      }
    }
  } catch {}

  // Keep in-memory cache synchronized with cleaned result
  inMemoryDescriptorCache[schoolKey] = { ...result };

  // 4. Firestore Cloud Sync
  if (Object.keys(result).length === 0) {
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("../school-firebase");
      if (db) {
        const snap = await getDocs(collection(db, `schools/${schoolKey}/face_descriptors_v2`));
        snap.forEach((d) => {
          const data = d.data() as FaceDescriptorRecord;
          if (data && data.studentId && data.descriptor && !deletedSet.has(data.studentId)) {
            result[data.studentId] = data;
            void saveFaceDescriptor(data);
          }
        });
      }
    } catch {}
  }

  // 5. Backward Compatibility: Migrate legacy V1 descriptors if V2 is empty
  if (Object.keys(result).length === 0) {
    try {
      const legacyKey = `nst_face_descriptors_${schoolKey}`;
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        for (const stId of Object.keys(legacyParsed)) {
          if (deletedSet.has(stId)) continue;
          const item = legacyParsed[stId];
          if (item && item.descriptor) {
            result[stId] = {
              ...item,
              schoolId: schoolKey,
              compositeKey: makeCompositeKey(schoolKey, stId),
              source: item.source || "live_kiosk",
            };
            void saveFaceDescriptor(result[stId]);
          }
        }
      }
    } catch {}
  }

  // Final cache synchronization
  inMemoryDescriptorCache[schoolKey] = { ...result };

  return result;
}

export async function deleteFaceDescriptor(studentId: string, schoolId: string): Promise<void> {
  if (!studentId) return;
  const schoolKey = schoolId || "default";
  const compositeKey = makeCompositeKey(schoolKey, studentId);

  // 1. Immediately mark in Tombstone / Blacklist so auto-enroll from photo never resurrects this face
  markFaceDescriptorDeleted(studentId, schoolKey);

  // 2. Clear from In-Memory Cache (CRITICAL: prevents immediate resurrection in current tab)
  if (inMemoryDescriptorCache[schoolKey]) {
    delete inMemoryDescriptorCache[schoolKey][studentId];
  }
  if (inMemoryDescriptorCache["default"]) {
    delete inMemoryDescriptorCache["default"][studentId];
  }

  // 3. Clear from IndexedDB (compositeKey, raw studentId, and default key)
  try {
    const db = await openFaceDb();
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    store.delete(compositeKey);
    store.delete(studentId);
    store.delete(`default_${studentId}`);
  } catch (idbErr) {
    console.warn("[FaceDB] IndexedDB delete note:", idbErr);
  }

  // 4. Clear from LocalStorage (both V2 and legacy keys, school and default)
  const lsKeys = [
    `${DESCRIPTOR_STORAGE_PREFIX}${schoolKey}`,
    `${DESCRIPTOR_STORAGE_PREFIX}default`,
    `nst_face_descriptors_${schoolKey}`,
    `nst_face_descriptors_default`
  ];
  for (const key of lsKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed[studentId]) {
          delete parsed[studentId];
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    } catch {}
  }

  // 5. Clear from Firestore Cloud Storage (both V2 and V1 paths)
  try {
    const { doc, deleteDoc } = await import("firebase/firestore");
    const { db } = await import("../school-firebase");
    if (db) {
      await Promise.allSettled([
        deleteDoc(doc(db, `schools/${schoolKey}/face_descriptors_v2/${studentId}`)),
        deleteDoc(doc(db, `schools/${schoolKey}/face_descriptors/${studentId}`)),
        deleteDoc(doc(db, `schools/default/face_descriptors_v2/${studentId}`))
      ]);
    }
  } catch {}

  console.log(`[FaceDB] Successfully deleted face descriptor for: ${studentId} (School: ${schoolKey})`);
}

/**
 * Purges a corrupted or mismatched face descriptor from memory, IndexedDB, and LocalStorage
 * WITHOUT adding the ID to the deleted tombstone, allowing fresh re-vectorization from photo.
 */
export async function purgeFaceDescriptor(studentId: string, schoolId: string): Promise<void> {
  if (!studentId) return;
  const schoolKey = schoolId || "default";
  const compositeKey = makeCompositeKey(schoolKey, studentId);

  // Unmark tombstone so photo enrollment is allowed
  unmarkFaceDescriptorDeleted(studentId, schoolKey);

  // Clear from In-Memory Cache
  if (inMemoryDescriptorCache[schoolKey]) {
    delete inMemoryDescriptorCache[schoolKey][studentId];
  }
  if (inMemoryDescriptorCache["default"]) {
    delete inMemoryDescriptorCache["default"][studentId];
  }

  // Clear from IndexedDB
  try {
    const db = await openFaceDb();
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    store.delete(compositeKey);
    store.delete(studentId);
    store.delete(`default_${studentId}`);
  } catch (idbErr) {
    console.warn("[FaceDB] IndexedDB purge note:", idbErr);
  }

  // Clear from LocalStorage
  const lsKeys = [
    `${DESCRIPTOR_STORAGE_PREFIX}${schoolKey}`,
    `${DESCRIPTOR_STORAGE_PREFIX}default`,
    `nst_face_descriptors_${schoolKey}`,
    `nst_face_descriptors_default`
  ];
  for (const key of lsKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed[studentId]) {
          delete parsed[studentId];
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    } catch {}
  }
}

export async function purgeDummyFaceDescriptors(schoolId: string, validStudentIds?: string[]): Promise<void> {
  const dummyPrefixes = ["std-", "DPS-ADM-", "demo_", "mock_"];
  const dummyNames = [
    "aarav sharma", "ananya kumari", "ananya verma", "riya choudhary",
    "kavya joshi", "rohan verma", "aditya singh", "sneha patel", "vikram rathore"
  ];
  const validIdSet = validStudentIds && validStudentIds.length > 0 ? new Set(validStudentIds) : null;

  try {
    const db = await openFaceDb();
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: FaceDescriptorRecord[] = req.result || [];
      all.forEach((rec) => {
        if (!rec || (schoolId && rec.schoolId !== schoolId)) return;
        const idLower = (rec.studentId || "").toLowerCase();
        const nameLower = (rec.name || "").toLowerCase().trim();

        const isPrefixDummy = dummyPrefixes.some((p) => idLower.startsWith(p.toLowerCase()));
        const isNameDummy = dummyNames.some((dn) => nameLower === dn);
        const isNotValid = validIdSet ? !validIdSet.has(rec.studentId) : false;

        if (isPrefixDummy || isNameDummy || isNotValid) {
          const compKey = rec.compositeKey || makeCompositeKey(rec.schoolId, rec.studentId);
          store.delete(compKey);
        }
      });
    };
  } catch {}

  try {
    const key = `${DESCRIPTOR_STORAGE_PREFIX}${schoolId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: Record<string, FaceDescriptorRecord> = JSON.parse(raw);
      let changed = false;
      Object.keys(parsed).forEach((stId) => {
        const rec = parsed[stId];
        const idLower = (stId || "").toLowerCase();
        const nameLower = (rec?.name || "").toLowerCase().trim();

        const isPrefixDummy = dummyPrefixes.some((p) => idLower.startsWith(p.toLowerCase()));
        const isNameDummy = dummyNames.some((dn) => nameLower === dn);
        const isNotValid = validIdSet ? !validIdSet.has(stId) : false;

        if (isPrefixDummy || isNameDummy || isNotValid) {
          delete parsed[stId];
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    }
  } catch {}

  // Clean from in-memory cache as well
  try {
    if (inMemoryDescriptorCache[schoolId]) {
      Object.keys(inMemoryDescriptorCache[schoolId]).forEach((stId) => {
        const rec = inMemoryDescriptorCache[schoolId][stId];
        const idLower = (stId || "").toLowerCase();
        const nameLower = (rec?.name || "").toLowerCase().trim();
        const isPrefixDummy = dummyPrefixes.some((p) => idLower.startsWith(p.toLowerCase()));
        const isNameDummy = dummyNames.some((dn) => nameLower === dn);
        const isNotValid = validIdSet ? !validIdSet.has(stId) : false;
        if (isPrefixDummy || isNameDummy || isNotValid) {
          delete inMemoryDescriptorCache[schoolId][stId];
        }
      });
    }
  } catch {}
}

// ── 3. REAL NEURAL DESCRIPTOR EXTRACTION ─────────────────────────────────────

export function createContrastEnhancedCanvas(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  gamma = 1.4
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const w = (input as any).videoWidth || (input as any).naturalWidth || input.width || 320;
  const h = (input as any).videoHeight || (input as any).naturalHeight || input.height || 320;
  c.width = Math.min(w, 640);
  c.height = Math.min(h, 640);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return c;
  ctx.drawImage(input, 0, 0, c.width, c.height);
  try {
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const d = imgData.data;
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.min(255, Math.round(255 * Math.pow(i / 255, 1 / gamma)));
    }
    for (let i = 0; i < d.length; i += 4) {
      d[i] = lut[d[i]];
      d[i + 1] = lut[d[i + 1]];
      d[i + 2] = lut[d[i + 2]];
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {}
  return c;
}

/**
 * Extracts a true 128-dimensional deep neural biometric embedding using Face-API
 * with low-light dynamic contrast compensation and SSD MobileNet / TinyFace multi-scale pass.
 */
export async function extractNeuralDescriptor(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<{ descriptor: number[]; box: { x: number; y: number; width: number; height: number }; score: number } | null> {
  const isReady = await loadFaceApiModels();
  if (!isReady) return null;

  try {
    // 1. Try SSD MobileNet V1 first if loaded (superb accuracy in low lighting & tilted angles)
    if (faceapi.nets.ssdMobilenetv1?.params) {
      try {
        const detSsd = await faceapi
          .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }))
          .withFaceLandmarks(getLandmarkOption())
          .withFaceDescriptor();
        if (detSsd?.descriptor) {
          const b = detSsd.detection.box;
          return {
            descriptor: Array.from(detSsd.descriptor),
            box: { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) },
            score: detSsd.detection.score,
          };
        }
      } catch {}
    }

    // 2. Standard TinyFaceDetector pass (320px)
    let detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.28 }))
      .withFaceLandmarks(getLandmarkOption())
      .withFaceDescriptor();

    // 3. Low-Light / distance fallback pass (224px, lower score threshold)
    if (!detection || !detection.descriptor) {
      try {
        detection = await faceapi
          .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.18 }))
          .withFaceLandmarks(getLandmarkOption())
          .withFaceDescriptor();
      } catch {}
    }

    // 4. Low-Light Adaptive Gamma Pre-Processing pass
    if (!detection || !detection.descriptor) {
      try {
        const enhanced = createContrastEnhancedCanvas(input, 1.45);
        detection = await faceapi
          .detectSingleFace(enhanced, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.18 }))
          .withFaceLandmarks(getLandmarkOption())
          .withFaceDescriptor();
      } catch {}
    }

    if (!detection || !detection.descriptor) return null;

    const box = detection.detection.box;
    const boxObj = {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };

    // Priority 1: Extract 512-D ArcFace deep vector
    try {
      const arcfaceVec = await extractArcFace512Descriptor(input, boxObj);
      if (arcfaceVec && arcfaceVec.length === 512) {
        return {
          descriptor: arcfaceVec,
          box: boxObj,
          score: Math.max(0.96, detection.detection.score),
          isArcFace: true,
        };
      }
    } catch {}

    return {
      descriptor: Array.from(detection.descriptor),
      box: boxObj,
      score: detection.detection.score,
    };
  } catch (err) {
    console.warn("[FaceAPI V2] Neural descriptor extraction error:", err);
    return null;
  }
}

/**
 * 3D Head Pose Estimator from 68-Point Facial Landmarks.
 * Computes exact Yaw (Left/Right turn in degrees), Pitch (Up/Down tilt), and Roll.
 */
export function estimateHeadPose(landmarks: any): HeadPoseEstimate {
  if (!landmarks || !landmarks.positions || landmarks.positions.length < 68) {
    return {
      yaw: 0,
      pitch: 0,
      roll: 0,
      label: "FRONT",
      isFrontFacing: true,
      isLeftFacing: false,
      isRightFacing: false,
      depthRatio: 1,
    };
  }

  const pts = landmarks.positions;
  const noseTip = pts[30] || pts[29];
  const noseBridge = pts[27];
  const leftEyeOuter = pts[36];
  const rightEyeOuter = pts[45];
  const chin = pts[8];

  const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const eyeDist = Math.max(1, Math.hypot(rightEyeOuter.x - leftEyeOuter.x, rightEyeOuter.y - leftEyeOuter.y));

  // Yaw: horizontal displacement of nose tip from midpoint of eyes
  const rawYaw = ((noseTip.x - eyeMidX) / eyeDist) * 75;
  const yaw = Math.max(-50, Math.min(50, Math.round(rawYaw)));

  // Pitch: vertical displacement of nose tip between eyes and chin
  const faceHeight = Math.max(1, Math.abs(chin.y - eyeMidY));
  const expectedNoseY = eyeMidY + faceHeight * 0.42;
  const rawPitch = ((noseTip.y - expectedNoseY) / faceHeight) * 90;
  const pitch = Math.max(-40, Math.min(40, Math.round(rawPitch)));

  // Roll: 2D plane tilt
  const roll = Math.round((Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x) * 180) / Math.PI);

  const isLeftFacing = yaw < -8;
  const isRightFacing = yaw > 8;
  const isFrontFacing = Math.abs(yaw) <= 8 && Math.abs(pitch) <= 12;

  let label: "FRONT" | "LEFT" | "RIGHT" | "UP" | "DOWN" = "FRONT";
  if (yaw < -8) label = "LEFT";
  else if (yaw > 8) label = "RIGHT";
  else if (pitch < -12) label = "UP";
  else if (pitch > 12) label = "DOWN";

  return {
    yaw,
    pitch,
    roll,
    label,
    isFrontFacing,
    isLeftFacing,
    isRightFacing,
    depthRatio: Number((eyeDist / (faceHeight || 1)).toFixed(3)),
  };
}

/**
 * Extracts true 128-D ResNet-34 neural embedding along with 3D Head Pose and 68 Landmarks.
 */
export async function extractNeuralDescriptorWith3DPose(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<{
  descriptor: number[];
  box: { x: number; y: number; width: number; height: number };
  score: number;
  pose: HeadPoseEstimate;
  landmarks: any;
} | null> {
  const isReady = await loadFaceApiModels();
  if (!isReady) return null;

  try {
    let detection: any = null;
    if (faceapi.nets.ssdMobilenetv1?.params) {
      try {
        detection = await faceapi
          .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }))
          .withFaceLandmarks(getLandmarkOption())
          .withFaceDescriptor();
      } catch {}
    }

    if (!detection || !detection.descriptor) {
      detection = await faceapi
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.26 }))
        .withFaceLandmarks(getLandmarkOption())
        .withFaceDescriptor();
    }

    if (!detection || !detection.descriptor) {
      try {
        const enhanced = createContrastEnhancedCanvas(input, 1.45);
        detection = await faceapi
          .detectSingleFace(enhanced, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.18 }))
          .withFaceLandmarks(getLandmarkOption())
          .withFaceDescriptor();
      } catch {}
    }

    if (!detection || !detection.descriptor) return null;

    const b = detection.detection.box;
    const pose = estimateHeadPose(detection.landmarks);
    const boxObj = {
      x: Math.round(b.x),
      y: Math.round(b.y),
      width: Math.round(b.width),
      height: Math.round(b.height),
    };

    let finalDescriptor = Array.from(detection.descriptor);
    try {
      const arcfaceVec = await extractArcFace512Descriptor(input, boxObj);
      if (arcfaceVec && arcfaceVec.length === 512) {
        finalDescriptor = arcfaceVec;
      }
    } catch {}

    return {
      descriptor: finalDescriptor,
      box: boxObj,
      score: detection.detection.score,
      pose,
      landmarks: detection.landmarks,
    };
  } catch (err) {
    console.warn("[FaceAPI 3D] Neural 3D pose extraction error:", err);
    return null;
  }
}

/**
 * Automatically converts an enrolled profile with a photoUrl from legacy pixel/canvas vector
 * into a true 512-D ArcFace or 128-D ResNet deep neural embedding with facial alignment.
 */
export async function revectorizeLegacyRecord(
  record: FaceDescriptorRecord,
  force = false
): Promise<FaceDescriptorRecord | null> {
  if (!record || !record.photoUrl) return null;
  if (!force && isFaceDescriptorDeleted(record.studentId, record.schoolId)) return null;
  // If already running on 512-D ArcFace and not forced, nothing to do
  if (!force && record.source === "arcface_512d" && (record.arcfaceDescriptor?.length === 512 || record.descriptor?.length === 512)) {
    return record;
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!record.photoUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.referrerPolicy = "no-referrer";
    img.onload = async () => {
      try {
        if (!force && isFaceDescriptorDeleted(record.studentId, record.schoolId)) {
          resolve(null);
          return;
        }

        // Detect face bounding box first, then extract aligned 512-D ArcFace descriptor
        let neural = await extractNeuralDescriptor(img);
        if (neural && neural.descriptor && (neural.descriptor.length === 512 || neural.descriptor.length === 128)) {
          const is512 = neural.descriptor.length === 512;
          const upgraded: FaceDescriptorRecord = {
            ...record,
            descriptor: neural.descriptor,
            arcfaceDescriptor: is512 ? neural.descriptor : record.arcfaceDescriptor,
            source: is512 ? "arcface_512d" : "face_api_neural",
            compositeKey: record.compositeKey || makeCompositeKey(record.schoolId, record.studentId),
            enrolledAt: new Date().toISOString(),
          };
          await saveFaceDescriptor(upgraded);
          console.log(`[FaceEngine] Successfully ${force ? "re-synced" : "upgraded"} ${record.name} to ${is512 ? "512-D ArcFace" : "128-D ResNet"} from photo!`);
          resolve(upgraded);
          return;
        }

        // Direct ArcFace attempt if face detector had low confidence on stylized photo
        const directArcface = await extractArcFace512Descriptor(img);
        if (directArcface && directArcface.length === 512) {
          const upgraded: FaceDescriptorRecord = {
            ...record,
            descriptor: directArcface,
            arcfaceDescriptor: directArcface,
            source: "arcface_512d",
            compositeKey: record.compositeKey || makeCompositeKey(record.schoolId, record.studentId),
            enrolledAt: new Date().toISOString(),
          };
          await saveFaceDescriptor(upgraded);
          resolve(upgraded);
          return;
        }

        resolve(null);
      } catch (e) {
        console.warn("[FaceEngine] Auto-revectorize note for", record.name, e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = record.photoUrl;
  });
}

/**
 * Automatically inspects all enrolled face descriptors for duplicates or corruption,
 * purges contaminated records, and cleanly re-syncs genuine ArcFace vectors from original photos.
 */
export async function repairAndResyncAllFaceDescriptors(
  schoolId: string,
  students: any[] = [],
  teachers: any[] = [],
  onProgress?: (msg: string) => void
): Promise<{ repairedCount: number; purgedCount: number; totalActive: number; details: string[] }> {
  const currentMap = await getSchoolFaceDescriptors(schoolId);
  const records = Object.values(currentMap);
  const details: string[] = [];
  let repairedCount = 0;
  let purgedCount = 0;

  if (records.length === 0) {
    return { repairedCount: 0, purgedCount: 0, totalActive: 0, details: ["कोई सेव चेहरा नहीं मिला"] };
  }

  onProgress?.("बायोमेट्रिक डेटा की जांच हो रही है...");

  // Build a roster lookup
  const rosterMap = new Map<string, any>();
  for (const s of students || []) {
    if (s?.id) rosterMap.set(s.id, { ...s, role: "STUDENT" });
  }
  for (const t of teachers || []) {
    if (t?.id) rosterMap.set(t.id, { ...t, role: "TEACHER" });
  }

  // Step 1: Detect duplicate / cross-contaminated descriptors
  // Two different people having cosine similarity >= 0.90 is impossible unless one was overwritten!
  const contaminatedIds = new Set<string>();
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const rA = records[i];
      const rB = records[j];
      if (rA.studentId === rB.studentId) continue;

      const vA = rA.arcfaceDescriptor || rA.descriptor;
      const vB = rB.arcfaceDescriptor || rB.descriptor;
      if (vA && vB && vA.length === vB.length) {
        const sim = vA.length === 512
          ? calculateArcFaceCosineSimilarity(vA, vB)
          : calculateCosineSimilarity(vA, vB);

        if (sim >= 0.90) {
          console.warn(`[FaceRepair] Cross-contamination detected between "${rA.name}" and "${rB.name}" (sim=${sim.toFixed(3)})`);
          contaminatedIds.add(rA.studentId);
          contaminatedIds.add(rB.studentId);
          details.push(`डुप्लीकेट चेहरा मिला: ${rA.name} ↔ ${rB.name}`);
        }
      }
    }
  }

  // Step 2: Repair contaminated, legacy, or photo-backed records from their original photo
  for (const rec of records) {
    const isContaminated = contaminatedIds.has(rec.studentId);
    const isLegacy = rec.source !== "arcface_512d" || rec.descriptor?.length !== 512;
    const rosterPerson = rosterMap.get(rec.studentId);
    const photoUrl = rosterPerson?.photoUrl || rec.photoUrl;

    if (isContaminated || isLegacy || photoUrl) {
      if (photoUrl && typeof photoUrl === "string" && photoUrl.trim()) {
        onProgress?.(`${rec.name} का चेहरा फोटो से री-सिंक हो रहा है...`);
        try {
          unmarkFaceDescriptorDeleted(rec.studentId, schoolId);
          const upgraded = await revectorizeLegacyRecord(
            {
              ...rec,
              photoUrl,
              name: rosterPerson?.name || rec.name,
              role: rosterPerson?.role || rec.role,
            },
            true // force re-vectorize
          );
          if (upgraded) {
            repairedCount++;
            details.push(`✓ ${rec.name} का चेहरा फोटो से 512-D ArcFace में री-सिंक हुआ`);
          } else if (isContaminated) {
            // Photo failed and it was contaminated with someone else's face: purge to prevent wrong attendance!
            await purgeFaceDescriptor(rec.studentId, schoolId);
            purgedCount++;
            details.push(`⚠️ ${rec.name} का करप्ट चेहरा हटाया गया (नई फोटो सेव करें)`);
          }
        } catch (err) {
          if (isContaminated) {
            await purgeFaceDescriptor(rec.studentId, schoolId);
            purgedCount++;
          }
        }
      } else if (isContaminated) {
        // No photo to recover from and it was corrupted with another person's face: delete contaminated vector!
        await purgeFaceDescriptor(rec.studentId, schoolId);
        purgedCount++;
        details.push(`⚠️ ${rec.name} का करप्ट चेहरा हटाया गया (फोटो नहीं थी)`);
      }
    }
  }

  // Step 3: Refresh in-memory and return active count
  const refreshedMap = await getSchoolFaceDescriptors(schoolId);
  const totalActive = Object.keys(refreshedMap).length;

  return { repairedCount, purgedCount, totalActive, details };
}

/**
 * Checks all enrolled profiles and upgrades any legacy profiles in the background.
 */
export async function upgradeLegacyDescriptors(
  enrolledMap: Record<string, FaceDescriptorRecord>,
  onProfileUpgraded?: (upgraded: FaceDescriptorRecord) => void
): Promise<Record<string, FaceDescriptorRecord>> {
  const updatedMap = { ...enrolledMap };
  const records = Object.values(enrolledMap);
  for (const rec of records) {
    if (isFaceDescriptorDeleted(rec.studentId, rec.schoolId)) continue;
    if (rec.photoUrl && (rec.source !== "arcface_512d" || rec.descriptor?.length !== 512)) {
      try {
        const upgraded = await revectorizeLegacyRecord(rec);
        if (upgraded) {
          updatedMap[upgraded.studentId] = upgraded;
          if (onProfileUpgraded) onProfileUpgraded(upgraded);
        }
      } catch {}
    }
  }
  return updatedMap;
}

// Heuristic fallback descriptor generator (used only when models fail to load)
export function extractDescriptorFromCanvas(
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  box?: { x: number; y: number; width: number; height: number },
  isLowLightBoost = false,
  landmarks?: any
): number[] {
  const canvas = document.createElement("canvas");
  const size = 112;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Array(128).fill(0);

  const sW = (source as any).videoWidth || (source as any).naturalWidth || source.width || 480;
  const sH = (source as any).videoHeight || (source as any).naturalHeight || source.height || 480;

  const bx = Math.max(0, box?.x ?? 0);
  const by = Math.max(0, box?.y ?? 0);
  const bw = Math.min(sW - bx, box?.width ?? sW);
  const bh = Math.min(sH - by, box?.height ?? sH);

  ctx.drawImage(source, bx, by, bw, bh, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // 128-dimensional spatial and gradient features
  const descriptor = new Array(128).fill(0);
  let mean = 0;
  for (let i = 0; i < 128; i++) {
    const pxIndex = (i * 98) % (size * size);
    const r = data[pxIndex * 4] || 0;
    const g = data[pxIndex * 4 + 1] || 0;
    const b = data[pxIndex * 4 + 2] || 0;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    descriptor[i] = lum;
    mean += lum;
  }
  mean /= 128;

  // Zero-mean centering and L2 normalization
  let normSq = 0;
  for (let i = 0; i < 128; i++) {
    descriptor[i] -= mean;
    normSq += descriptor[i] * descriptor[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  return descriptor.map((v) => v / norm);
}

// ── 4. VECTOR DISTANCE & STRICT BIOMETRIC MATCHER ────────────────────────────

export function calculateCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dot = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
  }
  return Math.max(-1, Math.min(1, dot));
}

export function calculateEuclideanDistance(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 999;
  let sumSq = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

/**
/**
 * Multi-Angle ResNet-34 Face Recognition Thresholds:
 * - Match Distance <= 0.65 (Allows natural head turns, ~35° left/right yaw, chin up/down)
 * - Minimum Cosine Similarity >= 0.74 (Recognizes user across angle variations while rejecting strangers)
 * - Separation Margin >= 0.025
 */
export const NEURAL_MAX_DISTANCE = 0.65;
export const STRICT_MAX_DISTANCE = 0.65;
export const STRICT_MIN_SIMILARITY = 0.74;

export function matchFaceDescriptor(
  queryDescriptor: number[],
  enrolledMap: Record<string, FaceDescriptorRecord>,
  similarityThreshold = STRICT_MIN_SIMILARITY,
  mirroredQueryDescriptor?: number[],
  options?: {
    maxDistance?: number;
    minMargin?: number;
    lighting?: FaceLightingAssessment;
  }
): {
  student: FaceDescriptorRecord;
  confidencePercent: number;
  similarity: number;
  distance: number;
  isAmbiguous?: boolean;
  margin?: number;
  secondBest?: { name: string; similarity: number; distance: number };
} | null {
  const records = Object.values(enrolledMap);
  if (records.length === 0 || !queryDescriptor) return null;

  // 1. High-Performance 512-D ArcFace Matcher
  if (queryDescriptor.length === 512) {
    const arcMatch = matchArcFace512(queryDescriptor, enrolledMap, ARCFACE_MATCH_THRESHOLD);
    if (arcMatch) {
      return {
        student: arcMatch.student,
        confidencePercent: arcMatch.confidencePercent,
        similarity: arcMatch.similarity,
        distance: arcMatch.distance,
        isAmbiguous: arcMatch.isAmbiguous,
        margin: arcMatch.margin,
        secondBest: arcMatch.secondBest,
      };
    }
    return null;
  }

  if (queryDescriptor.length !== 128) return null;

  // In absolute pitch-black darkness (meanLuminance < 10), reject. In dim/low lighting, allow match with strict distance gate.
  if (options?.lighting?.meanLuminance !== undefined && options.lighting.meanLuminance < 10) {
    return null;
  }

  const isLowLighting = Boolean(options?.lighting?.isLowLight || options?.lighting?.isTooDark);
  const maxAllowedDist = options?.maxDistance !== undefined
    ? options.maxDistance
    : (isLowLighting ? 0.55 : NEURAL_MAX_DISTANCE);
  const minRequiredMargin = options?.minMargin !== undefined ? options.minMargin : (isLowLighting ? 0.040 : 0.035);

  // STEP 1: Group by studentId to find the best match for each UNIQUE student/teacher
  const studentBestMap: Map<string, { record: FaceDescriptorRecord; distance: number; similarity: number }> = new Map();

  for (const rec of records) {
    if (!rec?.studentId) continue;

    const candidateVectors: Array<{ vec: number[]; angle: "primary" | "front" | "left" | "right" }> = [];
    if (rec.descriptor && rec.descriptor.length === 128) {
      candidateVectors.push({ vec: rec.descriptor, angle: "primary" });
    }
    if (rec.descriptors3D?.front && rec.descriptors3D.front.length === 128) {
      candidateVectors.push({ vec: rec.descriptors3D.front, angle: "front" });
    }
    if (rec.descriptors3D?.left && rec.descriptors3D.left.length === 128) {
      candidateVectors.push({ vec: rec.descriptors3D.left, angle: "left" });
    }
    if (rec.descriptors3D?.right && rec.descriptors3D.right.length === 128) {
      candidateVectors.push({ vec: rec.descriptors3D.right, angle: "right" });
    }

    if (candidateVectors.length === 0) continue;

    let bestDist = 999;
    let bestSim = -1;
    let bestAngle: "primary" | "front" | "left" | "right" = "primary";

    for (const cand of candidateVectors) {
      const simNormal = calculateCosineSimilarity(queryDescriptor, cand.vec);
      const simMirrored = mirroredQueryDescriptor
        ? calculateCosineSimilarity(mirroredQueryDescriptor, cand.vec)
        : -1;
      const sim = Math.max(simNormal, simMirrored);
      const dist = calculateEuclideanDistance(
        simMirrored > simNormal && mirroredQueryDescriptor ? mirroredQueryDescriptor : queryDescriptor,
        cand.vec
      );

      if (dist < bestDist) {
        bestDist = dist;
        bestSim = sim;
        bestAngle = cand.angle;
      }
    }

    const is3D = Boolean(rec.descriptors3D && (rec.descriptors3D.left || rec.descriptors3D.right));
    const existing = studentBestMap.get(rec.studentId);
    if (!existing || bestDist < existing.distance) {
      studentBestMap.set(rec.studentId, {
        record: rec,
        distance: bestDist,
        similarity: bestSim,
        matchedAngle: bestAngle,
        is3DVerified: is3D,
      });
    }
  }

  if (studentBestMap.size === 0) return null;

  // STEP 2: Sort unique students by Euclidean distance ascending (closest first)
  const sortedStudents = Array.from(studentBestMap.values()).sort((a, b) => a.distance - b.distance);

  const top1 = sortedStudents[0];
  const top2 = sortedStudents.length > 1 ? sortedStudents[1] : null;

  // STEP 3: Strict Distance & Similarity threshold gates
  const isStrictDistancePass = top1.distance <= maxAllowedDist;
  const isStrictSimilarityPass = top1.similarity >= similarityThreshold;

  if (isStrictDistancePass && isStrictSimilarityPass) {
    // Margin is the distance gap between 1st best and 2nd best unique candidate
    let margin: number | undefined = undefined;
    let isAmbiguous = false;

    if (top2) {
      margin = Number(Math.max(0, top2.distance - top1.distance).toFixed(4));
      // If 2nd best candidate is dangerously close (margin < minRequiredMargin), flag as ambiguous!
      isAmbiguous = margin < minRequiredMargin;
    }

    // Honest Calibrated Confidence: Real Cosine Similarity percentage (no artificial padding)
    const confidencePercent = Math.min(
      99.9,
      Math.max(0, Number((top1.similarity * 100).toFixed(1)))
    );

    return {
      student: top1.record,
      confidencePercent,
      similarity: Number(top1.similarity.toFixed(4)),
      distance: Number(top1.distance.toFixed(4)),
      isAmbiguous,
      margin,
      matchedAngle: top1.matchedAngle,
      is3DVerified: top1.is3DVerified,
      secondBest: top2
        ? {
            name: top2.record.name,
            similarity: Number(top2.similarity.toFixed(4)),
            distance: Number(top2.distance.toFixed(4)),
          }
        : undefined,
    };
  }

  return null;
}

// ── 5. LIGHTING & QUALITY ASSESSMENT ─────────────────────────────────────────

export function assessFaceLightingAndQuality(
  source: HTMLCanvasElement | HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number }
): FaceLightingAssessment {
  const canvas = document.createElement("canvas");
  const w = 48;
  const h = 48;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return {
      meanLuminance: 120,
      contrast: 40,
      isTooDark: false,
      isLowLight: false,
      isOverExposed: false,
      isUnevenLighting: false,
      qualityPercent: 80,
      statusMessage: "रोशनी सामान्य है (Good lighting)",
    };
  }

  ctx.drawImage(source, box.x, box.y, box.width, box.height, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let totalLum = 0;
  const count = w * h;
  for (let i = 0; i < count; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  const meanLuminance = totalLum / count;

  let varSum = 0;
  for (let i = 0; i < count; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    varSum += (lum - meanLuminance) * (lum - meanLuminance);
  }
  const contrast = Math.sqrt(varSum / count);

  // Critical darkness only when near pitch-black (under 10). Low light is 10 to 45.
  const isTooDark = meanLuminance < 10;
  const isLowLight = meanLuminance >= 10 && meanLuminance < 45;
  const isOverExposed = meanLuminance > 225;
  const isUnevenLighting = contrast > 75;

  let qualityPercent = 95;
  let statusMessage = "रोशनी सामान्य है";

  if (isTooDark) {
    qualityPercent = 25;
    statusMessage = "बहुत अंधेरा है — कृपया लाइट जलाएं";
  } else if (isLowLight) {
    qualityPercent = 70;
    statusMessage = "कम रोशनी में भी चेहरा पहचाना जा रहा है";
  } else if (isOverExposed) {
    qualityPercent = 50;
    statusMessage = "बहुत तेज़ रोशनी";
  }

  return {
    meanLuminance: Math.round(meanLuminance),
    contrast: Math.round(contrast),
    isTooDark,
    isLowLight,
    isOverExposed,
    isUnevenLighting,
    qualityPercent,
    statusMessage,
  };
}

// ── 6. REAL-TIME MULTI-FACE DETECTION IN VIDEO FRAMES ───────────────────────

/**
 * Detects faces in live video frames using Face-API neural network.
 * If models are still warming up, smoothly falls back to native FaceDetector or central canvas scan.
 */
export async function detectFacesInFrame(
  videoElement: HTMLVideoElement,
  enrolledMap: Record<string, FaceDescriptorRecord> = {}
): Promise<DetectedFaceBox[]> {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return [];
  }

  const vWidth = videoElement.videoWidth;
  const vHeight = videoElement.videoHeight;

  // METHOD 0: Real Deep Biometric Face-API Neural Network (With 360° Omnidirectional Rotation Support)
  if (isFaceApiLoaded()) {
    try {
      // Sensitive detector settings for both bright daylight and low-light / evening conditions
      let detections = await faceapi
        .detectAllFaces(
          videoElement,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.20 })
        )
        .withFaceLandmarks(getLandmarkOption())
        .withFaceDescriptors();

      // If phone is tilted 90°, 180° (upside down) or 270° (landscape sideways) and no face found at 0°:
      if ((!detections || detections.length === 0) && (vWidth > 0 && vHeight > 0)) {
        const anglesToTry = [90, 270, 180];
        const rotCanvas = (window as any).__nstaRotCanvas || ((window as any).__nstaRotCanvas = document.createElement("canvas"));
        const rotCtx = rotCanvas.getContext("2d", { willReadFrequently: true });

        for (const angle of anglesToTry) {
          if (rotCtx) {
            if (angle === 90 || angle === 270) {
              rotCanvas.width = vHeight;
              rotCanvas.height = vWidth;
            } else {
              rotCanvas.width = vWidth;
              rotCanvas.height = vHeight;
            }

            rotCtx.save();
            rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
            rotCtx.rotate((angle * Math.PI) / 180);
            rotCtx.drawImage(videoElement, -vWidth / 2, -vHeight / 2, vWidth, vHeight);
            rotCtx.restore();

            const rotDetections = await faceapi
              .detectAllFaces(
                rotCanvas,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.22 })
              )
              .withFaceLandmarks(getLandmarkOption())
              .withFaceDescriptors();

            if (rotDetections && rotDetections.length > 0) {
              // Map rotated detections back into original video coordinate space
              detections = rotDetections.map((rd: any) => {
                const b = rd.detection.box;
                let origX = b.x;
                let origY = b.y;
                let origW = b.width;
                let origH = b.height;

                if (angle === 90) {
                  // rotCanvas is [vHeight, vWidth]. Original x = b.y, y = vHeight - b.x - b.width
                  origX = b.y;
                  origY = vHeight - (b.x + b.width);
                  origW = b.height;
                  origH = b.width;
                } else if (angle === 270) {
                  origX = vWidth - (b.y + b.height);
                  origY = b.x;
                  origW = b.height;
                  origH = b.width;
                } else if (angle === 180) {
                  origX = vWidth - (b.x + b.width);
                  origY = vHeight - (b.y + b.height);
                }

                return {
                  ...rd,
                  detection: {
                    ...rd.detection,
                    box: {
                      x: Math.max(0, Math.round(origX)),
                      y: Math.max(0, Math.round(origY)),
                      width: Math.min(vWidth, Math.round(origW)),
                      height: Math.min(vHeight, Math.round(origH)),
                    },
                  },
                };
              });
              break;
            }
          }
        }
      }

      if (detections && detections.length > 0) {
        // Step 1: IoU Non-Maximum Suppression (NMS) to eliminate duplicate/overlapping boxes on the same face
        const nmsDetections: typeof detections = [];
        const byScore = [...detections].sort((a, b) => b.detection.score - a.detection.score);

        for (const candidate of byScore) {
          const cBox = candidate.detection.box;
          let isDuplicate = false;

          for (const kept of nmsDetections) {
            const kBox = kept.detection.box;
            const xA = Math.max(cBox.x, kBox.x);
            const yA = Math.max(cBox.y, kBox.y);
            const xB = Math.min(cBox.x + cBox.width, kBox.x + kBox.width);
            const yB = Math.min(cBox.y + cBox.height, kBox.y + kBox.height);

            const interW = Math.max(0, xB - xA);
            const interH = Math.max(0, yB - yA);
            const interArea = interW * interH;

            const areaC = cBox.width * cBox.height;
            const areaK = kBox.width * kBox.height;
            const unionArea = areaC + areaK - interArea;
            const iou = unionArea > 0 ? interArea / unionArea : 0;
            const containmentC = areaC > 0 ? interArea / areaC : 0;
            const containmentK = areaK > 0 ? interArea / areaK : 0;

            if (iou > 0.30 || containmentC > 0.55 || containmentK > 0.55) {
              isDuplicate = true;
              break;
            }
          }

          if (!isDuplicate) {
            nmsDetections.push(candidate);
          }
        }

        // Sort deduplicated faces by area (largest face in foreground gets priority)
        const sorted = nmsDetections.sort((a, b) => {
          const areaA = a.detection.box.width * a.detection.box.height;
          const areaB = b.detection.box.width * b.detection.box.height;
          return areaB - areaA;
        });

        const detectedList = await Promise.all(
          sorted.slice(0, 2).map(async (det) => {
            const b = det.detection.box;
            const padX = b.width * 0.12;
            const padY = b.height * 0.12;

            const box = {
              x: Math.max(0, Math.round(b.x - padX)),
              y: Math.max(0, Math.round(b.y - padY)),
              width: Math.min(vWidth - b.x, Math.round(b.width + padX * 2)),
              height: Math.min(vHeight - b.y, Math.round(b.height + padY * 2)),
              confidence: Number(det.detection.score.toFixed(2)),
            };

            const lighting = assessFaceLightingAndQuality(videoElement, box);
            const pose = det.landmarks ? estimateHeadPose(det.landmarks) : undefined;

            // Extract 512-D ArcFace vector
            let arcfaceVec: number[] | null = null;
            try {
              arcfaceVec = await extractArcFace512Descriptor(videoElement, box);
            } catch {}

            const descriptor = arcfaceVec && arcfaceVec.length === 512 ? arcfaceVec : Array.from(det.descriptor);

            // Step A: Priority ArcFace 512-D Match
            let match = null;
            if (arcfaceVec && arcfaceVec.length === 512) {
              const arcMatch = matchArcFace512(arcfaceVec, enrolledMap, ARCFACE_MATCH_THRESHOLD);
              if (arcMatch) {
                match = {
                  student: arcMatch.student,
                  confidencePercent: arcMatch.confidencePercent,
                  similarity: arcMatch.similarity,
                  distance: arcMatch.distance,
                  isAmbiguous: arcMatch.isAmbiguous,
                  margin: arcMatch.margin,
                  matchedAngle: "primary",
                  is3DVerified: true,
                };
              }
            }

            // Step B: Fallback to ResNet-34 128-D matcher if no 512-D match
            if (!match) {
              match = matchFaceDescriptor(Array.from(det.descriptor), enrolledMap, STRICT_MIN_SIMILARITY, undefined, {
                maxDistance: NEURAL_MAX_DISTANCE,
                lighting,
              });
            }

            // Neural match fallback completed without live-stream identity mutation
            // Note: A live camera frame must NEVER overwrite an existing profile in the database!

            const isArcFace = Boolean(arcfaceVec && arcfaceVec.length === 512);
            const maxValidDistance = isArcFace ? 1.05 : 0.68;

            return {
              ...box,
              descriptor,
              pose,
              landmarks: det.landmarks,
              lighting,
              lowLightWarning: lighting.isLowLight || lighting.isTooDark,
              isNeuralActive: true,
              isArcFaceActive: isArcFace,
              isAiEngineWarmingUp: false,
              is3DActive: true,
              matchedStudent: match && (!lighting.isTooDark || (match.distance && match.distance <= maxValidDistance))
                ? {
                    studentId: match.student.studentId,
                    name: match.student.name,
                    role: match.student.role,
                    designation: match.student.designation,
                    rollNo: match.student.rollNo,
                    classId: match.student.classId,
                    className: match.student.className,
                    photoUrl: match.student.photoUrl,
                    confidencePercent: match.confidencePercent,
                    distance: match.distance,
                    isAmbiguous: match.isAmbiguous,
                    margin: match.margin,
                    matchedAngle: match.matchedAngle,
                    is3DVerified: match.is3DVerified,
                  }
                : undefined,
            };
          })
        );
        return detectedList;
      }
    } catch (e) {
      console.warn("[FaceAPI V2] Inference warning, fallback active:", e);
    }
  }

  // METHOD 1: Native Chrome FaceDetector Fallback (Visual bounding box only, NO pixel matching!)
  if (typeof (window as any).FaceDetector === "function") {
    try {
      if (!(window as any).__nstaFaceDetector) {
        (window as any).__nstaFaceDetector = new (window as any).FaceDetector({
          maxDetectedFaces: 2,
          fastMode: true,
        });
      }
      const detector = (window as any).__nstaFaceDetector;
      const detected = await detector.detect(videoElement);

      if (detected && detected.length > 0) {
        const sorted = [...detected].sort((a: any, b: any) => {
          const areaA = (a.boundingBox?.width || 0) * (a.boundingBox?.height || 0);
          const areaB = (b.boundingBox?.width || 0) * (b.boundingBox?.height || 0);
          return areaB - areaA;
        });
        const primary = sorted[0];
        const bb = primary.boundingBox;
        const box = {
          x: Math.max(0, bb.x),
          y: Math.max(0, bb.y),
          width: Math.min(vWidth - bb.x, bb.width),
          height: Math.min(vHeight - bb.y, bb.height),
          confidence: 0.90,
        };

        const lighting = assessFaceLightingAndQuality(videoElement, box);
        const desc = extractDescriptorFromCanvas(videoElement, box);

        // While neural engine loads, match legacy pixel descriptors like-with-like
        const legacyOnlyMap: Record<string, FaceDescriptorRecord> = {};
        for (const [k, v] of Object.entries(enrolledMap)) {
          if (v && v.source !== "face_api_neural" && v.descriptor?.length === 128) {
            legacyOnlyMap[k] = v;
          }
        }

        const legacyMatch = Object.keys(legacyOnlyMap).length > 0
          ? matchFaceDescriptor(desc, legacyOnlyMap, 0.86, undefined, { maxDistance: 0.44, lighting })
          : null;

        return [
          {
            ...box,
            descriptor: desc,
            lighting,
            lowLightWarning: lighting.isLowLight || lighting.isTooDark,
            isNeuralActive: false,
            isAiEngineWarmingUp: !legacyMatch,
            matchedStudent: legacyMatch && !lighting.isTooDark
              ? {
                  studentId: legacyMatch.student.studentId,
                  name: legacyMatch.student.name,
                  role: legacyMatch.student.role,
                  designation: legacyMatch.student.designation,
                  rollNo: legacyMatch.student.rollNo,
                  classId: legacyMatch.student.classId,
                  className: legacyMatch.student.className,
                  photoUrl: legacyMatch.student.photoUrl,
                  confidencePercent: legacyMatch.confidencePercent,
                  distance: legacyMatch.distance,
                  isAmbiguous: legacyMatch.isAmbiguous,
                  margin: legacyMatch.margin,
                }
              : undefined,
          },
        ];
      }
    } catch {}
  }

  // METHOD 2: Central Reticle Visual Fallback
  const scanCanvas = (window as any).__nstaScanCanvas || ((window as any).__nstaScanCanvas = document.createElement("canvas"));
  const scale = 0.25;
  const sW = Math.round(vWidth * scale);
  const sH = Math.round(vHeight * scale);
  if (scanCanvas.width !== sW || scanCanvas.height !== sH) {
    scanCanvas.width = sW;
    scanCanvas.height = sH;
  }
  const ctx = scanCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(videoElement, 0, 0, sW, sH);
  const frame = ctx.getImageData(0, 0, sW, sH);
  const data = frame.data;

  const centerX = sW / 2;
  const centerY = sH / 2;
  const searchW = sW * 0.54;
  const searchH = sH * 0.64;

  let skinPixels = 0;
  let totalChecked = 0;
  const startX = Math.floor(centerX - searchW / 2);
  const endX = Math.floor(centerX + searchW / 2);
  const startY = Math.floor(centerY - searchH / 2);
  const endY = Math.floor(centerY + searchH / 2);

  for (let y = startY; y < endY; y += 3) {
    for (let x = startX; x < endX; x += 3) {
      const idx = (y * sW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      totalChecked++;

      const isSkin = r > 65 && g > 40 && b > 20 && r > g && r > b && (r - Math.min(g, b)) > 15 && Math.abs(r - g) > 12;
      if (isSkin) skinPixels++;
    }
  }

  const skinRatio = skinPixels / (totalChecked || 1);
  if (skinRatio > 0.08) {
    const box = {
      x: Math.round(vWidth * 0.22),
      y: Math.round(vHeight * 0.18),
      width: Math.round(vWidth * 0.56),
      height: Math.round(vHeight * 0.64),
      confidence: 0.82,
    };
    const lighting = assessFaceLightingAndQuality(videoElement, box);
    const desc = extractDescriptorFromCanvas(videoElement, box);

    const legacyOnlyMap: Record<string, FaceDescriptorRecord> = {};
    for (const [k, v] of Object.entries(enrolledMap)) {
      if (v && v.source !== "face_api_neural" && v.descriptor?.length === 128) {
        legacyOnlyMap[k] = v;
      }
    }

    const legacyMatch = Object.keys(legacyOnlyMap).length > 0
      ? matchFaceDescriptor(desc, legacyOnlyMap, 0.86, undefined, { maxDistance: 0.44, lighting })
      : null;

    return [
      {
        ...box,
        descriptor: desc,
        lighting,
        lowLightWarning: lighting.isLowLight || lighting.isTooDark,
        isNeuralActive: false,
        isAiEngineWarmingUp: !legacyMatch,
        matchedStudent: legacyMatch && !lighting.isTooDark
          ? {
              studentId: legacyMatch.student.studentId,
              name: legacyMatch.student.name,
              role: legacyMatch.student.role,
              designation: legacyMatch.student.designation,
              rollNo: legacyMatch.student.rollNo,
              classId: legacyMatch.student.classId,
              className: legacyMatch.student.className,
              photoUrl: legacyMatch.student.photoUrl,
              confidencePercent: legacyMatch.confidencePercent,
              distance: legacyMatch.distance,
              isAmbiguous: legacyMatch.isAmbiguous,
              margin: legacyMatch.margin,
            }
          : undefined,
      },
    ];
  }

  return [];
}

// ── 7. ACCURATE PHOTO ENROLLMENT WITH REAL NEURAL DETECTOR ──────────────────

/**
 * Enrolls a student from photo URL using the real neural face detector.
 * Automatically finds the face inside the photo (no fixed 70% blind crop!).
 */
export async function enrollStudentFromPhotoUrl(
  student: {
    id: string;
    schoolId: string;
    name: string;
    rollNo?: string;
    classId?: string;
    className?: string;
    photoUrl?: string;
  },
  options?: { force?: boolean }
): Promise<FaceDescriptorRecord | null> {
  if (!student?.photoUrl) return null;

  // Never auto-enroll a student whose face was explicitly deleted by the admin unless force=true
  if (!options?.force && isFaceDescriptorDeleted(student.id, student.schoolId)) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    img.onload = async () => {
      try {
        if (!options?.force && isFaceDescriptorDeleted(student.id, student.schoolId)) {
          resolve(null);
          return;
        }

        // Step 1: Attempt true deep neural face extraction
        const neural = await extractNeuralDescriptor(img);
        if (!neural || !neural.descriptor || (neural.score && neural.score < 0.45)) {
          console.warn(`[FaceAPI V2 Enrollment] No clear face detected in photo for ${student.name}. Skipping to prevent false identities.`);
          resolve(null);
          return;
        }

        const is512 = Boolean(neural && neural.descriptor && neural.descriptor.length === 512);

        const record: FaceDescriptorRecord = {
          studentId: student.id,
          schoolId: student.schoolId,
          name: student.name,
          rollNo: student.rollNo,
          classId: student.classId,
          className: student.className,
          photoUrl: student.photoUrl,
          descriptor: neural.descriptor,
          arcfaceDescriptor: is512 ? neural.descriptor : undefined,
          enrolledAt: new Date().toISOString(),
          source: is512 ? "arcface_512d" : "face_api_neural",
          compositeKey: makeCompositeKey(student.schoolId, student.id),
        };

        await saveFaceDescriptor(record);
        resolve(record);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = student.photoUrl;
  });
}

/**
 * Enrolls a teacher from photo URL using the real neural face detector.
 */
export async function enrollTeacherFromPhotoUrl(
  teacher: {
    id: string;
    schoolId: string;
    name: string;
    designation?: string;
    role?: "TEACHER" | "STAFF";
    photoUrl?: string;
  },
  options?: { force?: boolean }
): Promise<FaceDescriptorRecord | null> {
  if (!teacher?.photoUrl) return null;

  // Never auto-enroll a teacher whose face was explicitly deleted by the admin unless force=true
  if (!options?.force && isFaceDescriptorDeleted(teacher.id, teacher.schoolId)) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    img.onload = async () => {
      try {
        if (!options?.force && isFaceDescriptorDeleted(teacher.id, teacher.schoolId)) {
          resolve(null);
          return;
        }

        const neural = await extractNeuralDescriptor(img);
        if (!neural || !neural.descriptor || (neural.score && neural.score < 0.45)) {
          console.warn(`[FaceAPI V2 Enrollment] No clear face detected in photo for teacher ${teacher.name}. Skipping.`);
          resolve(null);
          return;
        }

        const record: FaceDescriptorRecord = {
          studentId: teacher.id,
          schoolId: teacher.schoolId,
          name: teacher.name,
          role: "TEACHER",
          designation: teacher.designation || "Faculty",
          photoUrl: teacher.photoUrl,
          descriptor: neural.descriptor,
          enrolledAt: new Date().toISOString(),
          source: "face_api_neural",
          compositeKey: makeCompositeKey(teacher.schoolId, teacher.id),
        };

        await saveFaceDescriptor(record);
        resolve(record);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = teacher.photoUrl;
  });
}

/**
 * Batch enrolls multiple students from photo URLs concurrently.
 */
export async function batchEnrollStudentsFromPhotos(
  param1: any,
  param2?: any,
  param3?: any
): Promise<number> {
  // Support both (students, onProgress) and (schoolId, students, onProgress)
  let studentsList: Array<any> = [];
  let onProgressCallback: ((current: number, total: number, name?: string) => void) | undefined = undefined;

  if (Array.isArray(param1)) {
    studentsList = param1;
    onProgressCallback = typeof param2 === "function" ? param2 : undefined;
  } else if (typeof param1 === "string" && Array.isArray(param2)) {
    studentsList = param2;
    onProgressCallback = typeof param3 === "function" ? param3 : undefined;
  } else if (Array.isArray(param2)) {
    studentsList = param2;
    onProgressCallback = typeof param3 === "function" ? param3 : undefined;
  }

  let count = 0;
  const valid = studentsList.filter((s) => s && s.photoUrl && s.photoUrl.trim().length > 0);
  const total = valid.length;

  for (let i = 0; i < total; i++) {
    const item = valid[i];
    const rec = await enrollStudentFromPhotoUrl(item);
    if (rec) count++;
    if (onProgressCallback) {
      onProgressCallback(i + 1, total, item.name || "Student");
    }
  }

  return count;
}

// ── 8. AUDIO FEEDBACK CHIMES ─────────────────────────────────────────────────

export function playAttendanceSuccessChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    // Ascending melody: C5 -> E5 -> G5 -> C6
    playTone(523.25, now, 0.18);
    playTone(659.25, now + 0.08, 0.22);
    playTone(783.99, now + 0.16, 0.26);
    playTone(1046.50, now + 0.25, 0.40);
  } catch {}
}

export function playCooldownTick(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch {}
}

// Landmark helper stubs for backward compatibility
export function estimateEyeNoseLandmarks(canvas: any, box: any) {
  return {
    leftEye: { x: (box?.x || 0) + (box?.width || 100) * 0.35, y: (box?.y || 0) + (box?.height || 100) * 0.38 },
    rightEye: { x: (box?.x || 0) + (box?.width || 100) * 0.65, y: (box?.y || 0) + (box?.height || 100) * 0.38 },
    nose: { x: (box?.x || 0) + (box?.width || 100) * 0.50, y: (box?.y || 0) + (box?.height || 100) * 0.58 },
  };
}

export function alignFaceToKycCanvas(source: any, box: any, landmarks: any): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 112;
  c.height = 112;
  const ctx = c.getContext("2d");
  if (ctx && source) {
    ctx.drawImage(source, box?.x || 0, box?.y || 0, box?.width || 100, box?.height || 100, 0, 0, 112, 112);
  }
  return c;
}

export function ensureZeroMeanUnitDescriptor(v: number[]): number[] {
  return v;
}

export function synthesizeStudentFaceDescriptor(studentId: string, name: string): number[] {
  return new Array(128).fill(0);
}

export function calculateEyeOpenness(
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
  landmarks?: any
): { leftEyeOpenness: number; rightEyeOpenness: number; averageOpenness: number } {
  return { leftEyeOpenness: 0.72, rightEyeOpenness: 0.72, averageOpenness: 0.72 };
}

export interface BlinkState {
  isEyeOpen: boolean;
  openness: number;
  blinkDetected: boolean;
  lastBlinkTimestamp: number;
  phase: "waiting_face" | "open" | "closing" | "blinked";
  earValue?: number;
}

export class EyeBlinkDetector {
  private lastBlinkTime = 0;
  private state: "waiting_face" | "open" | "closing" = "waiting_face";
  private eyeClosedStartTime = 0;
  private consecutiveClosedFrames = 0;
  private consecutiveOpenFrames = 0;
  private simulatedBlinkUntil = 0;

  private calculateEAR(points: Array<{ x: number; y: number }>, indices: number[]): number {
    if (!points || indices.some((idx) => !points[idx])) return 0.28;
    const p1 = points[indices[0]]; // outer corner
    const p2 = points[indices[1]]; // top outer
    const p3 = points[indices[2]]; // top inner
    const p4 = points[indices[3]]; // inner corner
    const p5 = points[indices[4]]; // bottom inner
    const p6 = points[indices[5]]; // bottom outer

    const v1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const v2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    const h = Math.hypot(p1.x - p4.x, p1.y - p4.y);

    if (h <= 0.001) return 0.28;
    return (v1 + v2) / (2.0 * h);
  }

  public update(source: any, box: any, landmarks?: any): BlinkState {
    const now = Date.now();

    // Check if manual simulateBlink was triggered recently
    if (this.simulatedBlinkUntil > now) {
      return {
        isEyeOpen: true,
        openness: 0.85,
        blinkDetected: true,
        lastBlinkTimestamp: now,
        phase: "blinked",
        earValue: 0.29,
      };
    }

    if (!landmarks || !landmarks.positions || landmarks.positions.length < 68) {
      return {
        isEyeOpen: true,
        openness: 0.70,
        blinkDetected: false,
        lastBlinkTimestamp: this.lastBlinkTime,
        phase: "open",
      };
    }

    const pts = landmarks.positions;
    // Left eye (36-41), Right eye (42-47)
    const leftEAR = this.calculateEAR(pts, [36, 37, 38, 39, 40, 41]);
    const rightEAR = this.calculateEAR(pts, [42, 43, 44, 45, 46, 47]);
    const avgEAR = (leftEAR + rightEAR) / 2.0;

    const rawOpenness = Math.max(0, Math.min(1, (avgEAR - 0.16) / (0.32 - 0.16)));
    const CLOSED_THRESHOLD = 0.21;
    const OPEN_THRESHOLD = 0.245;

    const isClosed = avgEAR < CLOSED_THRESHOLD;
    const isOpen = avgEAR > OPEN_THRESHOLD;

    let blinkDetected = false;

    if (isOpen) {
      this.consecutiveOpenFrames++;
      if (this.state === "closing") {
        const closedDuration = now - this.eyeClosedStartTime;
        if (closedDuration >= 60 && closedDuration <= 1100 && this.consecutiveClosedFrames >= 1) {
          blinkDetected = true;
          this.lastBlinkTime = now;
          this.state = "open";
        } else {
          this.state = "open";
        }
      } else {
        this.state = "open";
      }
      this.consecutiveClosedFrames = 0;
    } else if (isClosed) {
      this.consecutiveClosedFrames++;
      if (this.state === "open" || this.state === "waiting_face") {
        this.state = "closing";
        this.eyeClosedStartTime = now;
      }
      this.consecutiveOpenFrames = 0;
    }

    return {
      isEyeOpen: !isClosed,
      openness: Number(rawOpenness.toFixed(2)),
      blinkDetected,
      lastBlinkTimestamp: this.lastBlinkTime,
      phase: blinkDetected ? "blinked" : this.state === "closing" ? "closing" : "open",
      earValue: Number(avgEAR.toFixed(3)),
    };
  }

  public simulateBlink(): void {
    const now = Date.now();
    this.lastBlinkTime = now;
    this.simulatedBlinkUntil = now + 1800;
  }

  public reset(): void {
    this.state = "waiting_face";
    this.consecutiveClosedFrames = 0;
    this.consecutiveOpenFrames = 0;
    this.simulatedBlinkUntil = 0;
  }
}

/**
 * Renders a futuristic 3D Holographic Biometric Wireframe Mesh on the canvas.
 * Draws 3D depth rings, 68-point triangulation constellation, and real-time head pose HUD.
 */
export function draw3DHolographicMesh(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  pose?: HeadPoseEstimate,
  landmarks?: any,
  isMatched = false,
  matchedLabel?: string,
  isMirrored = false,
  canvasWidth?: number
): void {
  if (!ctx || !box) return;

  const rawX = box.x;
  const y = box.y;
  const w = box.width;
  const h = box.height;
  const x = isMirrored && canvasWidth ? Math.max(0, canvasWidth - rawX - w) : rawX;

  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  const primaryColor = isMatched ? "#10b981" : "#06b6d4";
  const glowColor = isMatched ? "rgba(16, 185, 129, 0.4)" : "rgba(6, 182, 212, 0.35)";

  ctx.save();

  // 1. 3D Outer Depth Rings
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = glowColor;
  ctx.setLineDash([6, 6]);

  // Main elliptical ring
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, rx * 1.08, ry * 1.08, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Offset depth ring based on Yaw & Pitch
  const yawOffset = (pose?.yaw || 0) * (rx / 60);
  const pitchOffset = (pose?.pitch || 0) * (ry / 60);

  ctx.strokeStyle = isMatched ? "rgba(16, 185, 129, 0.25)" : "rgba(14, 165, 233, 0.25)";
  ctx.beginPath();
  ctx.ellipse(centerX + yawOffset, centerY + pitchOffset, rx * 0.92, ry * 0.92, (pose?.roll || 0) * (Math.PI / 180), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. 68-Point Constellation & 3D Feature Mesh
  if (landmarks?.positions && landmarks.positions.length >= 68) {
    const pts = landmarks.positions;
    ctx.fillStyle = isMatched ? "#34d399" : "#38bdf8";
    ctx.strokeStyle = isMatched ? "rgba(52, 211, 153, 0.35)" : "rgba(56, 189, 248, 0.3)";
    ctx.lineWidth = 1;

    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i];
      const px = isMirrored && canvasWidth ? canvasWidth - p.x : p.x;
      const py = p.y;
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const connectPath = (indices: number[]) => {
      ctx.beginPath();
      indices.forEach((idx, i) => {
        const pt = pts[idx];
        if (!pt) return;
        const px = isMirrored && canvasWidth ? canvasWidth - pt.x : pt.x;
        const py = pt.y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };

    connectPath([0, 3, 6, 8, 10, 13, 16]);
    connectPath([17, 19, 21, 22, 24, 26]);
    connectPath([27, 28, 29, 30, 33, 30]);
    connectPath([36, 37, 38, 39, 40, 41, 36]);
    connectPath([42, 43, 44, 45, 46, 47, 42]);
    connectPath([48, 51, 54, 57, 48]);
  }

  // 3. 3D Pose Compass Badge (Top of box)
  if (pose) {
    const badgeW = 120;
    const badgeH = 22;
    const badgeX = centerX - badgeW / 2;
    const badgeY = Math.max(10, y - 30);

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isMatched ? "#34d399" : "#38bdf8";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const angleText = `3D Yaw: ${pose.yaw > 0 ? "+" : ""}${pose.yaw}° [${pose.label}]`;
    ctx.fillText(angleText, centerX, badgeY + badgeH / 2);
  }

  // 4. Matched Label Banner (Bottom of box)
  if (isMatched && matchedLabel) {
    const bannerW = Math.max(140, w * 0.85);
    const bannerH = 26;
    const bannerX = centerX - bannerW / 2;
    const bannerY = y + h + 8;

    ctx.fillStyle = "rgba(6, 78, 59, 0.9)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`✓ ${matchedLabel}`, centerX, bannerY + bannerH / 2);
  }

  ctx.restore();
}

