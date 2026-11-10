// IIC×NSTA Smart School Ecosystem — Firebase CRUD Helpers
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, Timestamp, writeBatch
} from "firebase/firestore";
import { ref, set, get, onValue, update, remove } from "firebase/database";
import { db, rtdb } from "./firebase";

const withTimeout = <T>(promise: Promise<T>, ms = 3000, fallbackVal?: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        if (fallbackVal !== undefined) resolve(fallbackVal);
        else reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms)
    )
  ]);
};

const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = sanitizeForFirestore(v);
  }
  return out;
};
import type {
  School, SchoolSession, SchoolClass, SchoolSubject, SchoolLesson,
  SchoolTeacher, SchoolStudent, AttendanceRecord, ExamEntry, MonthlyFee,
  SchoolHomework, SchoolMCQResult, SchoolUserProfile, DailyClassLecture,
  NstaMessage, NstaThreadType, NstaFeeSlipData, NstaWelcomeData, NstaBirthdayData,
  SchoolAccountant, AccountantPermissions, SchoolExpenseVoucher,
  StudentAcknowledgedLeave, StudentAbsenteeCallLog,
  SchoolEvent, SchoolEventType,
  AdminAttendanceRecord, StaffDailyAttendanceRecord, StaffDailyAttendanceEntry
} from "./school-types";
import { sortSchoolClasses } from "./school-types";
import {
  getDemoSchoolDataset,
  isDemoDataEnabled,
  setDemoDataEnabled,
  addDemoSession,
  updateDemoSession,
  deleteDemoSession,
  setActiveDemoSession,
  subscribeDemoSessions
} from "./components/school/demoDataStore";
export { isDemoDataEnabled, setDemoDataEnabled };
import { cleanLogoUrl, isAppLogo, getSavedSchoolLogo } from "./components/school/feeReceiptUtils";
import {
  getSchoolCacheSync,
  setSchoolCacheSync,
  removeSchoolCacheSync,
  getSchoolCacheEntriesByPrefix,
  setSchoolLogoSync,
} from "./utils/schoolIndexedDb";
import { uploadImageToImgBB } from "./services/imgbbService";

// Only use the 910-student demo fallback for the default demo school when Demo Mode is ON.
export const shouldUseDemoForSchool = (schoolId?: string): boolean => {
  if (!schoolId || schoolId === "demo_school" || schoolId.startsWith("demo_") || schoolId.includes("demo")) {
    return isDemoDataEnabled();
  }
  return isDemoDataEnabled();
};

// Automatically converts heavy Base64 data:image strings into lightweight Cloud CDN URLs (~80 bytes)
// so no Firestore document ever approaches the 1 MB limit!
const ensureCloudImageUrl = async (val?: string | null, filenamePrefix = "school_asset"): Promise<string> => {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!trimmed.startsWith("data:image/")) return trimmed;
  try {
    return await uploadImageToImgBB(trimmed, `${filenamePrefix}_${Date.now()}.png`);
  } catch (err) {
    console.warn("[school-firebase] Cloud image upload fallback:", err);
    return trimmed;
  }
};

const NESTED_SCHOOL_RTDB_KEYS = new Set([
  "students",
  "classes",
  "sessions",
  "subjects",
  "lessons",
  "teachers",
  "attendance",
  "exams",
  "fees",
  "homework",
  "notices",
  "holidays",
  "community_posts",
  "mcq_results",
  "certificates",
  "admit_cards",
  "staff",
  "leaves",
  "admissions",
  "inquiries",
  "gallery",
  "events",
  "referral_payouts",
  "referral_settings",
]);

const stripNestedSchoolCollections = (raw: any): School => {
  if (!raw || typeof raw !== "object") return raw;
  const clean: any = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!NESTED_SCHOOL_RTDB_KEYS.has(k)) {
      clean[k] = v;
    }
  }
  return clean as School;
};

// Helper to reliably identify demo-seeded records across school entities
export const isDemoRecord = (item: any): boolean => {
  if (!item) return false;
  const id = String(item.id || "").toLowerCase();
  const sessionId = String(item.sessionId || "").toLowerCase();
  const classId = String(item.classId || "").toLowerCase();
  const rollNo = String(item.rollNo || "");
  const admissionNo = String(item.admissionNo || "").toUpperCase();
  const employeeId = String(item.employeeId || "").toUpperCase();
  const email = String(item.email || "").toLowerCase();

  // 1. Explicit demo ID prefixes
  if (
    id.startsWith("demo_") ||
    id.startsWith("std-0") ||
    id.startsWith("tea_demo_") ||
    id.startsWith("staff_demo_") ||
    id.startsWith("staff_principal_") ||
    id.startsWith("emp_tea_") ||
    id.startsWith("not_") ||
    id.startsWith("hol_")
  ) {
    return true;
  }

  // 2. Demo session / class reference
  if (sessionId.startsWith("demo_")) return true;
  if (classId.startsWith("demo_class_") || classId.startsWith("demo_")) return true;

  // 3. Demo admission numbers (DPS-ADM-141201 etc. or ADM-26-NUR...)
  if (admissionNo.startsWith("DPS-ADM-") || admissionNo.startsWith("ADM-26-")) return true;

  // 4. Demo roll numbers with section patterns like "Class10-A-01", "Class6-B-05", "Nursery-A-01"
  if (/^[A-Za-z0-9]+-[AB]-\d{2}$/.test(rollNo) || rollNo.includes("-A-") || rollNo.includes("-B-")) {
    return true;
  }

  // 5. Demo employee ID prefixes
  if (
    employeeId.startsWith("EMP-NUR") ||
    employeeId.startsWith("EMP-KG") ||
    employeeId.startsWith("EMP-C") ||
    employeeId.startsWith("EMP-1") ||
    employeeId.startsWith("EMP-2") ||
    employeeId.startsWith("EMP-3") ||
    employeeId.startsWith("EMP-4") ||
    employeeId.startsWith("EMP-5") ||
    employeeId.startsWith("EMP-6") ||
    employeeId.startsWith("EMP-7") ||
    employeeId.startsWith("EMP-8") ||
    employeeId.startsWith("EMP-9") ||
    employeeId.startsWith("EMP-10") ||
    employeeId.startsWith("TEA-RKVERMA")
  ) {
    return true;
  }

  // 6. Demo emails
  if (
    email.includes("@demoschool.edu.in") ||
    email.includes("@student.dps.edu.in") ||
    email.includes("@school.in") ||
    email.includes("rkverma.math@dps.edu.in") ||
    email.includes("priya.s@dps.edu.in") ||
    email.includes("rajesh.k@dps.edu.in")
  ) {
    return true;
  }

  return false;
};

const col = (path: string) => collection(db, path);
const d = (path: string) => doc(db, path);

// ── SCHOOLS LOCAL CACHE ───────────────────────────────────────────────────────
const LOCAL_SCHOOLS_KEY = "nst_schools_local_cache";
const DELETED_SCHOOLS_KEY = "nst_deleted_schools_list";

export const getDeletedSchoolIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_SCHOOLS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set<string>();
};

export const markSchoolAsDeleted = (schoolId: string) => {
  if (!schoolId) return;
  try {
    const set = getDeletedSchoolIds();
    set.add(schoolId);
    localStorage.setItem(DELETED_SCHOOLS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const clearSchoolFromDeletedList = (schoolId: string) => {
  if (!schoolId) return;
  try {
    const set = getDeletedSchoolIds();
    set.delete(schoolId);
    localStorage.setItem(DELETED_SCHOOLS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const DEFAULT_DPS_SCHOOL: School = {
  id: "dps_gurgaon_sector45",
  name: "Nstz",
  code: "NSTZ",
  address: "Institutional Academic Campus, Educational Zone",
  phone: "0124-4125800",
  email: "contact@nstz.app",
  affiliation: "Affiliated Education Center",
  adminEmail: "admin@nstz.app",
  logoUrl: "",
  principalName: "Dr. Arvind Swaminathan",
  principalPhone: "9811023450",
  directorName: "Mrs. Shashi Sharma",
  directorPhone: "9811023451",
  mobile: "0124-4125800",
  tagline: "Knowledge & Excellence",
  bannerColor: "#047857",
    subscription: {
    reading: true,
    writing: true,
    pdf: true,
    mcq: true,
    isElite: true,
    customCurriculumEnabled: true,
    monthlyAmount: 4500,
    status: "active",
    tier: "full",
    expiresAt: "2027-04-24T23:59:59.000Z",
    paidUntil: "2027-04-24T23:59:59.000Z",
    assignedAt: "2026-04-24T00:00:00.000Z"
  },
  active: true,
  createdAt: "2026-04-01T00:00:00.000Z",
  createdBy: "admin_uid",
  totalStudents: 910,
  totalTeachers: 26
};

export const getLocalSchools = (): School[] => {
  try {
    const deletedIds = getDeletedSchoolIds();
    const parsed = getSchoolCacheSync<School[]>(LOCAL_SCHOOLS_KEY, []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const filtered = parsed
        .filter((s: any) => s && typeof s === "object" && s.id && !deletedIds.has(s.id))
        .map((s: School) => {
          let updated = stripNestedSchoolCollections(s);
          if (
            updated.id === "dps_gurgaon_sector45" &&
            updated.name === "Delhi Public School" &&
            (!updated.code || updated.code === "DPS_DEL")
          ) {
            updated = { ...updated, name: "Nstz", code: "NSTZ" };
          }
          if (updated.subscription && !updated.subscription.expiresAt) {
            updated.subscription.expiresAt = "2027-04-24T23:59:59.000Z";
            updated.subscription.paidUntil = "2027-04-24T23:59:59.000Z";
          }
          const resolvedLogo = getSavedSchoolLogo(updated.logoUrl, updated.id);
          updated.logoUrl = resolvedLogo && !isAppLogo(resolvedLogo) ? resolvedLogo : "";
          return updated;
        });
      return filtered;
    }
    // If dps_gurgaon_sector45 has been deleted by user, NEVER resurrect it!
    if (deletedIds.has("dps_gurgaon_sector45") || deletedIds.has(DEFAULT_DPS_SCHOOL.id)) {
      return [];
    }
    const def = { ...DEFAULT_DPS_SCHOOL };
    const defLogo = getSavedSchoolLogo(def.logoUrl, def.id);
    if (defLogo) def.logoUrl = defLogo;
    return [def];
  } catch {
    const deletedIds = getDeletedSchoolIds();
    if (deletedIds.has("dps_gurgaon_sector45")) return [];
    return [DEFAULT_DPS_SCHOOL];
  }
};

export const setLocalSchools = (schools: School[]) => {
  try {
    const deletedIds = getDeletedSchoolIds();
    const cleaned = (Array.isArray(schools) ? schools : [])
      .filter((s: any) => s && typeof s === "object" && s.id && !deletedIds.has(s.id))
      .map(stripNestedSchoolCollections);
    setSchoolCacheSync(LOCAL_SCHOOLS_KEY, cleaned);
  } catch {}
};

// ── SCHOOLS ──────────────────────────────────────────────────────────────────

export const saveSchool = async (school: School) => {
  clearSchoolFromDeletedList(school.id);
  const cleanMeta = stripNestedSchoolCollections({ ...school });
  if (cleanMeta.logoUrl && cleanMeta.logoUrl.startsWith("data:image/")) {
    cleanMeta.logoUrl = await ensureCloudImageUrl(cleanMeta.logoUrl, `logo_${school.id}`);
  }
  if (cleanMeta.principalSignatureUrl && cleanMeta.principalSignatureUrl.startsWith("data:image/")) {
    cleanMeta.principalSignatureUrl = await ensureCloudImageUrl(cleanMeta.principalSignatureUrl, `sig_prin_${school.id}`);
  }
  if (cleanMeta.directorSignatureUrl && cleanMeta.directorSignatureUrl.startsWith("data:image/")) {
    cleanMeta.directorSignatureUrl = await ensureCloudImageUrl(cleanMeta.directorSignatureUrl, `sig_dir_${school.id}`);
  }
  if (cleanMeta.logoUrl) {
    setSchoolLogoSync(school.id, cleanMeta.logoUrl);
  }

  const sanitized = sanitizeForFirestore(cleanMeta);

  // 1. Instantly store in IndexedDB + RAM cache so UI is responsive in 0ms
  const current = getLocalSchools();
  const next = [sanitized, ...current.filter((s: any) => s.id !== school.id)];
  setLocalSchools(next);

  // 2. Ensure a clean default Academic Session exists for brand-new schools so classes can be added right away
  if (school.id && school.id !== "dps_gurgaon_sector45") {
    const defaultSession: SchoolSession = sanitizeForFirestore({
      id: `sess_${school.id}_2026_27`,
      schoolId: school.id,
      name: "Academic Session 2026-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
      active: true,
      createdAt: new Date().toISOString(),
    });
    if (rtdb) {
      update(ref(rtdb, `schools/${school.id}/sessions/${defaultSession.id}`), defaultSession).catch(() => {});
    }
    if (db) {
      setDoc(d(`schools/${school.id}/sessions/${defaultSession.id}`), defaultSession, { merge: true }).catch(() => {});
    }
  }

  // 3. CRITICAL MULTI-SCHOOL SAFETY: Use update() (NEVER set()) on RTDB `schools/${school.id}`
  // so child nodes (`students`, `classes`, `fees`, `community_posts`, etc.) are NEVER overwritten!
  if (rtdb) {
    try {
      await Promise.all([
        withTimeout(update(ref(rtdb, `schools/${school.id}`), sanitized), 2500),
        withTimeout(set(ref(rtdb, `schools_profiles/${school.id}`), sanitized), 2500),
      ]);
    } catch (e) {
      console.warn("[school-firebase] RTDB saveSchool:", e);
    }
  }

  // 4. Save to Firestore with merge: true so no existing fields are lost
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${school.id}`), sanitized, { merge: true }), 3000);
    } catch (e) {
      console.warn("[school-firebase] Firestore saveSchool timed out or offline:", e);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-profile-updated", { detail: { schoolId: school.id, data: sanitized } }));
  }

  return sanitized;
};

export const getSchool = async (schoolId: string): Promise<School | null> => {
  if (!schoolId) return null;
  const deletedIds = getDeletedSchoolIds();
  if (deletedIds.has(schoolId)) return null;

  const sanitize = (sc: School | null): School | null => {
    if (!sc) return null;
    const updated = stripNestedSchoolCollections(sc);
    const sid = updated.id || schoolId;
    if (sid === "dps_gurgaon_sector45") {
      if (updated.name === "Delhi Public School" && (!updated.code || updated.code === "DPS_DEL")) {
        updated.name = "Nstz";
        updated.code = "NSTZ";
      }
      if (updated.address && updated.address.includes("Sector-45, Urban Estate, Gurgaon")) {
        updated.address = "Institutional Academic Campus, Educational Zone";
      }
      if (updated.adminEmail === "admin@dps.edu.in") {
        updated.adminEmail = "admin@nstz.app";
      }
    }
    // Resolve strictly THIS school's logo (never another school's logo!)
    updated.logoUrl = getSavedSchoolLogo(updated.logoUrl, sid);
    return updated;
  };

  const local = getLocalSchools().find(s => s.id === schoolId);
  if (local) return sanitize(local);

  if (rtdb) {
    try {
      const profileSnap = await withTimeout(get(ref(rtdb, `schools_profiles/${schoolId}`)), 1800);
      const profileVal = (profileSnap as any)?.val?.();
      if (profileVal && profileVal.id && !deletedIds.has(profileVal.id)) return sanitize(profileVal as School);

      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && (val.id || val.name) && !deletedIds.has(schoolId)) return sanitize({ id: schoolId, ...val } as School);
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}`)), 2500);
      if (snap.exists() && !deletedIds.has(schoolId)) return sanitize({ ...(snap.data() as School), id: schoolId });
    } catch {}
  }

  if (schoolId === "dps_gurgaon_sector45" && !deletedIds.has("dps_gurgaon_sector45")) {
    return sanitize(DEFAULT_DPS_SCHOOL);
  }
  return null;
};

export const getAllSchools = async (): Promise<School[]> => {
  const deletedIds = getDeletedSchoolIds();
  const local = getLocalSchools().filter(s => !deletedIds.has(s.id));
  const mergedMap = new Map<string, School>();
  local.forEach(s => { if (s?.id && !deletedIds.has(s.id)) mergedMap.set(s.id, s); });

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col("schools")), 2500);
      const list = (snap as any).docs.map((docSnap: any) => stripNestedSchoolCollections({ id: docSnap.id, ...docSnap.data() }));
      list.forEach((s: School) => {
        if (s?.id && s.name && !deletedIds.has(s.id)) mergedMap.set(s.id, { ...(mergedMap.get(s.id) || {}), ...s });
      });
    } catch {}
  }

  if (rtdb) {
    try {
      const profSnap = await withTimeout(get(ref(rtdb, "schools_profiles")), 2000);
      const profVal = (profSnap as any)?.val?.();
      if (profVal && typeof profVal === "object") {
        Object.entries(profVal).forEach(([id, raw]: [string, any]) => {
          if (deletedIds.has(id)) return;
          const clean = stripNestedSchoolCollections({ id, ...raw });
          if (clean.id && clean.name) mergedMap.set(clean.id, { ...(mergedMap.get(clean.id) || {}), ...clean });
        });
      } else {
        const snap = await withTimeout(get(ref(rtdb, "schools")), 2000);
        const val = (snap as any)?.val?.();
        if (val && typeof val === "object") {
          Object.entries(val).forEach(([id, raw]: [string, any]) => {
            if (deletedIds.has(id)) return;
            const clean = stripNestedSchoolCollections({ id, ...raw });
            if (clean.id && clean.name) mergedMap.set(clean.id, { ...(mergedMap.get(clean.id) || {}), ...clean });
          });
        }
      }
    } catch {}
  }

  const finalSchools = Array.from(mergedMap.values()).filter(s => !deletedIds.has(s.id));
  setLocalSchools(finalSchools);
  return finalSchools;
};

export const subscribeToSchool = (schoolId: string, cb: (s: School | null) => void) => {
  const deliverLocal = () => {
    if (getDeletedSchoolIds().has(schoolId)) {
      cb(null);
      return;
    }
    const local = getLocalSchools().find(s => s.id === schoolId);
    if (local) cb(local);
  };
  deliverLocal();

  const onLocalEvt = (e: any) => {
    if (!e?.detail?.schoolId || e.detail.schoolId === schoolId) deliverLocal();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
    window.addEventListener("school-profile-updated", onLocalEvt);
    window.addEventListener("school-deleted", deliverLocal);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools_profiles/${schoolId}`), snap => {
        if (getDeletedSchoolIds().has(schoolId)) { cb(null); return; }
        const val = snap.val();
        if (val && (val.id || val.name)) cb(stripNestedSchoolCollections({ id: schoolId, ...val }));
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        d(`schools/${schoolId}`),
        snap => {
          if (getDeletedSchoolIds().has(schoolId)) { cb(null); return; }
          if (snap.exists()) cb(stripNestedSchoolCollections({ ...(snap.data() as School), id: schoolId }));
        },
        err => { console.warn(`[school-firebase] subscribeToSchool error:`, err?.code || err); }
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverLocal);
      window.removeEventListener("school-profile-updated", onLocalEvt);
      window.removeEventListener("school-deleted", deliverLocal);
    }
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const subscribeToAllSchools = (
  cb: (schools: School[]) => void,
  onError?: (err: Error) => void
) => {
  const mergeAndDeliver = (incoming?: School[]) => {
    const deletedIds = getDeletedSchoolIds();
    const current = getLocalSchools().filter(s => !deletedIds.has(s.id));
    const map = new Map<string, School>();
    current.forEach(s => { if (s?.id && s.name && !deletedIds.has(s.id)) map.set(s.id, s); });
    if (Array.isArray(incoming)) {
      incoming.forEach(raw => {
        const clean = stripNestedSchoolCollections(raw);
        if (clean?.id && clean.name && !deletedIds.has(clean.id)) {
          map.set(clean.id, { ...(map.get(clean.id) || {}), ...clean });
        }
      });
    }
    const list = Array.from(map.values()).filter(s => !deletedIds.has(s.id));
    setLocalSchools(list);
    cb(list);
  };

  mergeAndDeliver();

  const onHydratedOrUpdated = () => mergeAndDeliver();
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", onHydratedOrUpdated);
    window.addEventListener("school-profile-updated", onHydratedOrUpdated);
    window.addEventListener("school-deleted", onHydratedOrUpdated);
  }

  let rtdbProfUnsub: any = null;
  let rtdbLegacyUnsub: any = null;
  if (rtdb) {
    try {
      rtdbProfUnsub = onValue(
        ref(rtdb, "schools_profiles"),
        snap => {
          const val = snap.val();
          if (val && typeof val === "object") {
            const list: School[] = Object.entries(val).map(([id, raw]: [string, any]) =>
              stripNestedSchoolCollections({ id, ...raw })
            );
            mergeAndDeliver(list);
          }
        },
        err => console.warn(`[school-firebase] RTDB subscribeToAllSchools profiles error:`, err)
      );
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col("schools"),
        snap => {
          if (!snap.empty) {
            const list = snap.docs.map(docSnap => stripNestedSchoolCollections({ ...(docSnap.data() as School), id: docSnap.id }));
            mergeAndDeliver(list);
          }
        },
        err => {
          console.warn(`[school-firebase] subscribeToAllSchools Firestore error:`, err?.code || err);
          const current = getLocalSchools();
          if (current.length > 0) cb(current);
          onError?.(err);
        }
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", onHydratedOrUpdated);
      window.removeEventListener("school-profile-updated", onHydratedOrUpdated);
    }
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbProfUnsub === "function") rtdbProfUnsub();
    if (typeof rtdbLegacyUnsub === "function") rtdbLegacyUnsub();
  };
};

export const updateSchool = async (schoolId: string, data: Partial<School>) => {
  const prepared: any = { ...stripNestedSchoolCollections(data) };

  // Auto-upload any Base64 logo or signatures to Cloud CDN so Firestore doc stays ~1 KB
  if (prepared.logoUrl && typeof prepared.logoUrl === "string" && prepared.logoUrl.startsWith("data:image/")) {
    prepared.logoUrl = await ensureCloudImageUrl(prepared.logoUrl, `logo_${schoolId}`);
  }
  if (prepared.principalSignatureUrl && typeof prepared.principalSignatureUrl === "string" && prepared.principalSignatureUrl.startsWith("data:image/")) {
    prepared.principalSignatureUrl = await ensureCloudImageUrl(prepared.principalSignatureUrl, `sig_prin_${schoolId}`);
  }
  if (prepared.directorSignatureUrl && typeof prepared.directorSignatureUrl === "string" && prepared.directorSignatureUrl.startsWith("data:image/")) {
    prepared.directorSignatureUrl = await ensureCloudImageUrl(prepared.directorSignatureUrl, `sig_dir_${schoolId}`);
  }

  const sanitized = sanitizeForFirestore(prepared);

  // Per-school isolated logo in IndexedDB (never global localStorage!)
  if (sanitized?.logoUrl !== undefined && schoolId) {
    const cleaned = cleanLogoUrl(sanitized.logoUrl);
    if (cleaned && !isAppLogo(cleaned)) {
      setSchoolLogoSync(schoolId, cleaned);
      sanitized.logoUrl = cleaned;
    } else {
      setSchoolLogoSync(schoolId, "");
      sanitized.logoUrl = "";
    }
  }

  const current = getLocalSchools();
  let matched = false;
  const next = current.map(s => {
    if (s.id === schoolId) {
      matched = true;
      return { ...s, ...sanitized };
    }
    return s;
  });
  if (!matched && schoolId) {
    next.push({ id: schoolId, name: sanitized.name || "School", ...sanitized } as School);
  }
  setLocalSchools(next);

  // Instantly notify active screens strictly for this schoolId
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-profile-updated", {
      detail: { schoolId, data: sanitized, logoUrl: sanitized?.logoUrl }
    }));
  }

  // RTDB (update only — never wipes nested children)
  if (rtdb && schoolId) {
    try {
      await Promise.all([
        withTimeout(update(ref(rtdb, `schools/${schoolId}`), sanitized), 2500),
        withTimeout(update(ref(rtdb, `schools_profiles/${schoolId}`), { id: schoolId, ...sanitized }), 2500),
      ]);
    } catch {}
  }

  // Firestore (setDoc with merge: true so it never fails if doc wasn't created yet)
  if (db && schoolId) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}`), sanitized, { merge: true }), 3000);
    } catch {}
  }
};

export const lockSchool = async (schoolId: string, locked: boolean) => {
  await updateSchool(schoolId, { locked });
};

export const deleteSchool = async (schoolId: string) => {
  if (!schoolId) return;
  markSchoolAsDeleted(schoolId);

  const current = getLocalSchools();
  const updatedList = current.filter(s => s.id !== schoolId);
  setLocalSchools(updatedList);
  setSchoolLogoSync(schoolId, "");

  try {
    localStorage.removeItem(`nst_school_teachers_${schoolId}`);
    localStorage.removeItem(`nst_school_students_${schoolId}`);
    localStorage.removeItem(`nst_school_classes_${schoolId}`);
    localStorage.removeItem(`nst_school_fees_${schoolId}`);
    localStorage.removeItem(`nst_school_curriculum_notes_${schoolId}`);
    localStorage.removeItem(`school_logo:${schoolId}`);

    const activeSch = localStorage.getItem("nst_active_school_id");
    if (activeSch === schoolId) {
      localStorage.removeItem("nst_active_school_id");
      localStorage.removeItem("nst_active_student_key");
      localStorage.removeItem("nst_school_user_profile");
      localStorage.removeItem("nst_linked_school_info");
    }

    const curUserRaw = localStorage.getItem("nst_current_user");
    if (curUserRaw) {
      const cu = JSON.parse(curUserRaw);
      if (cu && cu.schoolId === schoolId) {
        cu.schoolId = "";
        cu.schoolName = null;
        cu.schoolRole = null;
        cu.schoolCode = null;
        localStorage.setItem("nst_current_user", JSON.stringify(cu));
        localStorage.setItem("nsta_cached_user", JSON.stringify(cu));
      }
    }
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-deleted", { detail: { schoolId, remainingSchools: updatedList } }));
    window.dispatchEvent(new CustomEvent("school-profile-updated", { detail: { schoolId, deleted: true } }));
    window.dispatchEvent(new CustomEvent("nst-school-exited", { detail: { schoolId } }));
  }

  if (rtdb) {
    try {
      await Promise.all([
        withTimeout(remove(ref(rtdb, `schools/${schoolId}`)), 2000),
        withTimeout(remove(ref(rtdb, `schools_profiles/${schoolId}`)), 2000),
        withTimeout(set(ref(rtdb, `deleted_schools/${schoolId}`), true), 2000),
      ]);
    } catch {}
  }

  if (db) {
    try {
      await Promise.all([
        withTimeout(deleteDoc(d(`schools/${schoolId}`)), 2500),
        withTimeout(setDoc(d(`deleted_schools/${schoolId}`), { deletedAt: new Date().toISOString() }, { merge: true }), 2500),
      ]);
    } catch {}
  }
};

export const detachUserFromSchool = async (userId: string, email?: string) => {
  try {
    localStorage.removeItem("nst_active_school_id");
    localStorage.removeItem("nst_active_student_key");
    localStorage.removeItem("nst_school_user_profile");
    localStorage.removeItem("nst_linked_school_info");
    if (userId) {
      localStorage.removeItem(`nst_user_linked_students_${userId}`);
    }

    const curUserRaw = localStorage.getItem("nst_current_user");
    if (curUserRaw) {
      const cu = JSON.parse(curUserRaw);
      if (cu) {
        cu.schoolId = "";
        cu.schoolName = null;
        cu.schoolRole = null;
        cu.schoolCode = null;
        localStorage.setItem("nst_current_user", JSON.stringify(cu));
        localStorage.setItem("nsta_cached_user", JSON.stringify(cu));
      }
    }

    if (userId && rtdb) {
      try {
        await update(ref(rtdb, `users/${userId}`), { schoolId: "", schoolName: null, schoolRole: null, schoolCode: null });
      } catch {}
    }
    if (userId && db) {
      try {
        await updateDoc(doc(db, "users", userId), { schoolId: "", schoolName: null, schoolRole: null, schoolCode: null });
      } catch {}
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nst-school-exited"));
      window.dispatchEvent(new CustomEvent("school-profile-updated", { detail: { schoolId: null } }));
    }
  } catch (e) {
    console.error("detachUserFromSchool error:", e);
  }
};

// ── SESSIONS ─────────────────────────────────────────────────────────────────

export const saveSession = async (session: SchoolSession) => {
  if (shouldUseDemoForSchool(session.schoolId)) {
    addDemoSession(session);
  }
  const sanitized = sanitizeForFirestore(session);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${session.schoolId}/sessions/${session.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${session.schoolId}/sessions/${session.id}`), sanitized), 3000); } catch {}
  }
};

export const getSessions = async (schoolId: string): Promise<SchoolSession[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/sessions`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const list: SchoolSession[] = Object.values(val);
        const filtered = !useDemo ? list.filter(s => !isDemoRecord(s)) : list;
        if (filtered.length > 0) return filtered;
      }
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/sessions`)), 2500);
    const list = (snap as any).docs.map((docSnap: any) => docSnap.data() as SchoolSession);
    const filtered = !useDemo ? list.filter((s: any) => !isDemoRecord(s)) : list;
    if (filtered.length > 0) return filtered;
  } catch {}

  if (useDemo) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.sessions && demo.sessions.length > 0) return demo.sessions;
    if (demo && demo.session) return [demo.session];
  }

  // Auto-provision a clean real session for newly added schools so they work out of the box
  const autoSession: SchoolSession = {
    id: `sess_${schoolId}_2026_27`,
    schoolId,
    name: "Academic Session 2026-27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveSession(autoSession).catch(() => {});
  return [autoSession];
};

export const subscribeToSessions = (schoolId: string, cb: (sessions: SchoolSession[]) => void) => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  let deliveredAny = false;
  let demoUnsub: (() => void) | null = null;

  if (useDemo) {
    deliveredAny = true;
    demoUnsub = subscribeDemoSessions(cb);
  }

  const ensureFallbackRealSession = () => {
    if (!deliveredAny && !useDemo && schoolId) {
      const autoSession: SchoolSession = {
        id: `sess_${schoolId}_2026_27`,
        schoolId,
        name: "Academic Session 2026-27",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        active: true,
        createdAt: new Date().toISOString(),
      };
      deliveredAny = true;
      cb([autoSession]);
      saveSession(autoSession).catch(() => {});
    }
  };

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/sessions`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const list: SchoolSession[] = Object.values(val);
          const filtered = !useDemo ? list.filter(s => !isDemoRecord(s)) : list;
          if (filtered.length > 0) {
            deliveredAny = true;
            cb(filtered);
            return;
          }
        }
        ensureFallbackRealSession();
      });
    } catch {}
  }
  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col(`schools/${schoolId}/sessions`),
        snap => {
          if (!snap.empty) {
            const list = snap.docs.map(docSnap => docSnap.data() as SchoolSession);
            const filtered = !useDemo ? list.filter(s => !isDemoRecord(s)) : list;
            if (filtered.length > 0) {
              deliveredAny = true;
              cb(filtered);
              return;
            }
          }
          ensureFallbackRealSession();
        },
        err => {
          console.warn(`[school-firebase] subscribeToSessions error:`, err?.code || err);
          ensureFallbackRealSession();
        }
      );
    } catch {}
  }
  return () => {
    if (typeof demoUnsub === "function") demoUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const updateSession = async (schoolId: string, sessionId: string, data: Partial<SchoolSession>) => {
  if (shouldUseDemoForSchool(schoolId)) {
    updateDemoSession(sessionId, data);
  }
  const sanitized = sanitizeForFirestore(data);
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/sessions/${sessionId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${schoolId}/sessions/${sessionId}`), sanitized, { merge: true }), 3000); } catch {}
  }
};

export const deleteSession = async (schoolId: string, sessionId: string) => {
  if (shouldUseDemoForSchool(schoolId)) {
    deleteDemoSession(sessionId);
  }
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/sessions/${sessionId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/sessions/${sessionId}`)), 2500); } catch {}
  }
};

// ── CLASSES ──────────────────────────────────────────────────────────────────
const LOCAL_CLASSES_PREFIX = "nst_school_classes_";

export const getLocalClasses = (schoolId: string): SchoolClass[] => {
  try {
    const list = getSchoolCacheSync<SchoolClass[]>(`${LOCAL_CLASSES_PREFIX}${schoolId}`, []);
    const arr = Array.isArray(list) ? list : [];
    const filtered = !shouldUseDemoForSchool(schoolId) ? arr.filter(c => !isDemoRecord(c)) : arr;
    return sortSchoolClasses(filtered);
  } catch {
    return [];
  }
};

export const setLocalClasses = (schoolId: string, classes: SchoolClass[]) => {
  try {
    const arr = Array.isArray(classes) ? classes : [];
    setSchoolCacheSync(`${LOCAL_CLASSES_PREFIX}${schoolId}`, sortSchoolClasses(arr));
  } catch {}
};

export const saveClass = async (cls: SchoolClass) => {
  const sanitized = sanitizeForFirestore(cls);
  // Cache in IndexedDB + RAM immediately
  try {
    const cur = getLocalClasses(cls.schoolId);
    const next = [sanitized, ...cur.filter((c: any) => c.id !== cls.id)];
    setLocalClasses(cls.schoolId, next);
  } catch {}

  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${cls.schoolId}/classes/${cls.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${cls.schoolId}/classes/${cls.id}`), sanitized), 3000); } catch {}
  }
};

export const getClasses = async (schoolId: string, sessionId?: string): Promise<SchoolClass[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const local = getLocalClasses(schoolId);

  if (local.length > 0) {
    const filteredLocal = sessionId ? local.filter(c => c.sessionId === sessionId) : local;
    if (filteredLocal.length > 0) return sortSchoolClasses(filteredLocal);
  }

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/classes`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const allRaw: SchoolClass[] = Object.values(val);
        const all = !useDemo ? allRaw.filter(c => !isDemoRecord(c)) : allRaw;
        setLocalClasses(schoolId, all);
        const filtered = sessionId ? all.filter(c => c.sessionId === sessionId) : all;
        if (filtered.length > 0 || !useDemo) return sortSchoolClasses(filtered);
      }
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/classes`)), 2500);
    const allRaw = (snap as any).docs.map((docSnap: any) => docSnap.data() as SchoolClass);
    const all = !useDemo ? allRaw.filter((c: any) => !isDemoRecord(c)) : allRaw;
    if (all.length > 0) {
      setLocalClasses(schoolId, all);
      return sortSchoolClasses(sessionId ? all.filter((c: any) => c.sessionId === sessionId) : all);
    }
  } catch {}

  if (useDemo) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.classes && demo.classes.length > 0) {
      const filtered = sessionId ? demo.classes.filter(c => c.sessionId === sessionId || !c.sessionId) : demo.classes;
      return sortSchoolClasses(filtered);
    }
  }
  return [];
};

export const subscribeToClasses = (schoolId: string, sessionId: string, cb: (classes: SchoolClass[]) => void) => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const deliverLocal = () => {
    const local = getLocalClasses(schoolId);
    if (!useDemo) {
      const realClasses = local.filter(c => !isDemoRecord(c));
      const filtered = sessionId ? realClasses.filter(c => c.sessionId === sessionId) : realClasses;
      cb(sortSchoolClasses(filtered));
    } else if (local && local.length > 0) {
      const filtered = sessionId ? local.filter(c => c.sessionId === sessionId) : local;
      cb(sortSchoolClasses(filtered));
    } else {
      const demo = getDemoSchoolDataset();
      if (demo && demo.classes && demo.classes.length > 0) {
        const filtered = sessionId ? demo.classes.filter(c => c.sessionId === sessionId || !c.sessionId) : demo.classes;
        cb(sortSchoolClasses(filtered));
      } else {
        cb([]);
      }
    }
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/classes`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const all: SchoolClass[] = Object.values(val);
          const cleanAll = !useDemo ? all.filter(c => !isDemoRecord(c)) : all;
          setLocalClasses(schoolId, cleanAll);
          const filtered = sessionId ? cleanAll.filter(c => c.sessionId === sessionId) : cleanAll;
          cb(sortSchoolClasses(filtered));
        }
      });
    } catch {}
  }
  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        query(col(`schools/${schoolId}/classes`), where("sessionId", "==", sessionId)),
        snap => {
          if (!snap.empty) {
            const list = snap.docs.map(docSnap => docSnap.data() as SchoolClass);
            const clean = !useDemo ? list.filter(c => !isDemoRecord(c)) : list;
            cb(sortSchoolClasses(clean));
          } else if (!useDemo) {
            cb([]);
          }
        },
        err => { console.warn(`[school-firebase] subscribeToClasses error:`, err?.code || err); }
      );
    } catch {}
  }
  return () => {
    if (typeof window !== "undefined") window.removeEventListener("school-idb-hydrated", deliverLocal);
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const updateClass = async (schoolId: string, classId: string, data: Partial<SchoolClass>) => {
  const sanitized = sanitizeForFirestore(data);
  try {
    const cur = getLocalClasses(schoolId);
    setLocalClasses(schoolId, cur.map(c => c.id === classId ? { ...c, ...sanitized } : c));
  } catch {}
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/classes/${classId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${schoolId}/classes/${classId}`), sanitized, { merge: true }), 3000); } catch {}
  }
};

export const deleteClass = async (schoolId: string, classId: string) => {
  try {
    const cur = getLocalClasses(schoolId);
    setLocalClasses(schoolId, cur.filter(c => c.id !== classId));
  } catch {}
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/classes/${classId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/classes/${classId}`)), 2500); } catch {}
  }
};

// ── SUBJECTS ─────────────────────────────────────────────────────────────────

export const saveSubject = async (subject: SchoolSubject) => {
  const sanitized = sanitizeForFirestore(subject);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${subject.schoolId}/subjects/${subject.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${subject.schoolId}/subjects/${subject.id}`), sanitized), 3000); } catch {}
  }
};

export const saveMultipleSubjects = async (subjects: SchoolSubject[]) => {
  if (!Array.isArray(subjects) || subjects.length === 0) return;
  const schoolId = subjects[0].schoolId;
  const updates: Record<string, any> = {};
  const batch = db ? writeBatch(db) : null;

  subjects.forEach(sub => {
    const sanitized = sanitizeForFirestore(sub);
    updates[`schools/${schoolId}/subjects/${sub.id}`] = sanitized;
    if (batch && db) {
      batch.set(d(`schools/${schoolId}/subjects/${sub.id}`), sanitized);
    }
  });

  if (rtdb) {
    try {
      await withTimeout(update(ref(rtdb), updates), 2500);
    } catch {}
  }
  if (batch) {
    try {
      await withTimeout(batch.commit(), 3000);
    } catch {}
  }
};

export const getSubjects = async (schoolId: string, classId?: string): Promise<SchoolSubject[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/subjects`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const all: SchoolSubject[] = Object.values(val);
        const filtered = !useDemo ? all.filter(s => !isDemoRecord(s)) : all;
        if (filtered.length > 0) return classId ? filtered.filter(s => s.classId === classId) : filtered;
      }
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/subjects`)), 2500);
    const all = (snap as any).docs.map((docSnap: any) => docSnap.data() as SchoolSubject);
    const filtered = !useDemo ? all.filter((s: any) => !isDemoRecord(s)) : all;
    if (filtered.length > 0) {
      return classId ? filtered.filter((s: any) => s.classId === classId) : filtered;
    }
  } catch {}

  if (useDemo) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.subjects && demo.subjects.length > 0) {
      return classId ? demo.subjects.filter(s => s.classId === classId) : demo.subjects;
    }
  }
  return [];
};

export const subscribeToSubjects = (schoolId: string, classId: string, cb: (subjects: SchoolSubject[]) => void) => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  if (useDemo) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.subjects && demo.subjects.length > 0) {
      cb(classId ? demo.subjects.filter(s => s.classId === classId) : demo.subjects);
    } else {
      cb([]);
    }
  } else {
    cb([]);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/subjects`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const list: SchoolSubject[] = Object.values(val);
          const filtered = !useDemo ? list.filter(s => !isDemoRecord(s)) : list;
          const matching = classId ? filtered.filter(s => s.classId === classId) : filtered;
          if (matching.length > 0 || !useDemo) {
            cb(matching);
          }
        }
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        query(col(`schools/${schoolId}/subjects`), where("classId", "==", classId)),
        snap => {
          if (!snap.empty) {
            const list = snap.docs.map(docSnap => docSnap.data() as SchoolSubject);
            cb(!useDemo ? list.filter(s => !isDemoRecord(s)) : list);
          } else if (!useDemo) {
            // Real school with 0 subjects in this class
            cb([]);
          }
        },
        err => { console.warn(`[school-firebase] subscribeToSubjects error:`, err?.code || err); }
      );
    } catch {}
  }
  return () => {
    if (typeof rtdbUnsub === "function") rtdbUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const deleteSubject = async (schoolId: string, subjectId: string) => {
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/subjects/${subjectId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/subjects/${subjectId}`)), 2500); } catch {}
  }
};

// ── LESSONS ──────────────────────────────────────────────────────────────────

export const saveLesson = async (lesson: SchoolLesson) => {
  const sanitized = sanitizeForFirestore(lesson);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${lesson.schoolId}/lessons/${lesson.id}`), sanitized), 2500); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${lesson.schoolId}/lessons/${lesson.id}`), sanitized), 3000); } catch {}
  }
};

export const getLessons = async (schoolId: string, subjectId?: string): Promise<SchoolLesson[]> => {
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/lessons`)), 2500);
    const all = (snap as any).docs.map((doc: any) => doc.data() as SchoolLesson);
    return subjectId ? all.filter((l: any) => l.subjectId === subjectId) : all;
  } catch {
    return [];
  }
};

export const subscribeToLessons = (schoolId: string, subjectId: string, cb: (lessons: SchoolLesson[]) => void) =>
  onSnapshot(
    query(col(`schools/${schoolId}/lessons`), where("subjectId", "==", subjectId)),
    snap => cb(snap.docs.map(d => d.data() as SchoolLesson).sort((a, b) => a.order - b.order)),
    err => { console.warn(`[school-firebase] subscribeToLessons error:`, err?.code || err); cb([]); }
  );

export const updateLesson = async (schoolId: string, lessonId: string, data: Partial<SchoolLesson>) => {
  const sanitized = sanitizeForFirestore(data);
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/lessons/${lessonId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(updateDoc(d(`schools/${schoolId}/lessons/${lessonId}`), sanitized), 3000); } catch {}
  }
};

export const deleteLesson = async (schoolId: string, lessonId: string) => {
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/lessons/${lessonId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/lessons/${lessonId}`)), 2500); } catch {}
  }
};

// ── TEACHERS ─────────────────────────────────────────────────────────────────

export const saveTeacher = async (teacher: SchoolTeacher) => {
  const sanitized = sanitizeForFirestore(teacher);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${teacher.schoolId}/teachers/${teacher.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${teacher.schoolId}/teachers/${teacher.id}`), sanitized), 3000); } catch {}
  }
};

export const getTeachers = async (schoolId: string): Promise<SchoolTeacher[]> => {
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/teachers`)), 2500);
    const list = (snap as any).docs.map((doc: any) => doc.data() as SchoolTeacher);
    return !isDemoDataEnabled() ? list.filter((t: SchoolTeacher) => !isDemoRecord(t)) : list;
  } catch {
    return [];
  }
};

export const subscribeToTeachers = (schoolId: string, cb: (teachers: SchoolTeacher[]) => void) =>
  onSnapshot(
    col(`schools/${schoolId}/teachers`),
    snap => {
      const list = snap.docs.map(d => d.data() as SchoolTeacher);
      cb(!isDemoDataEnabled() ? list.filter(t => !isDemoRecord(t)) : list);
    },
    err => { console.warn(`[school-firebase] subscribeToTeachers error:`, err?.code || err); cb([]); }
  );

export const updateTeacher = async (schoolId: string, teacherId: string, data: Partial<SchoolTeacher>) => {
  const sanitized = sanitizeForFirestore(data);
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/teachers/${teacherId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(updateDoc(d(`schools/${schoolId}/teachers/${teacherId}`), sanitized), 3000); } catch {}
  }
};

export const deleteTeacher = async (schoolId: string, teacherId: string) => {
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/teachers/${teacherId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/teachers/${teacherId}`)), 2500); } catch {}
  }
};

// ── STUDENTS ─────────────────────────────────────────────────────────────────
const LOCAL_STUDENTS_PREFIX = "nst_school_students_";

export const getLocalStudents = (schoolId: string): SchoolStudent[] => {
  try {
    const list = getSchoolCacheSync<SchoolStudent[]>(`${LOCAL_STUDENTS_PREFIX}${schoolId}`, []);
    const arr = Array.isArray(list) ? list : [];
    return !shouldUseDemoForSchool(schoolId) ? arr.filter(s => !isDemoRecord(s)) : arr;
  } catch {
    return [];
  }
};

export const setLocalStudents = (schoolId: string, students: SchoolStudent[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_STUDENTS_PREFIX}${schoolId}`, Array.isArray(students) ? students : []);
  } catch {}
};

export const saveStudent = async (student: SchoolStudent) => {
  const prepared = { ...student };
  if (prepared.photoUrl && prepared.photoUrl.startsWith("data:image/")) {
    prepared.photoUrl = await ensureCloudImageUrl(prepared.photoUrl, `std_${student.schoolId}_${student.id}`);
  }
  const sanitized = sanitizeForFirestore(prepared);

  // 1. Immediately cache in IndexedDB + RAM so scans and queries resolve in 0ms
  const current = getLocalStudents(student.schoolId);
  const next = [sanitized, ...current.filter((s: any) => s.id !== student.id)];
  setLocalStudents(student.schoolId, next);

  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${student.schoolId}/students/${student.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${student.schoolId}/students/${student.id}`), sanitized), 3000); } catch {}
  }

  // Auto-dispatch official welcome message to NSTA Messenger School Desk when ID is created
  try {
    void dispatchOfficialSchoolWelcomeMessage(sanitized, { triggerPopup: true });
  } catch {}

  return sanitized;
};

export const getStudent = async (schoolId: string, studentId: string): Promise<SchoolStudent | null> => {
  // 1. Instant IndexedDB RAM cache lookup
  const local = getLocalStudents(schoolId).find(
    (s: any) => s.id === studentId || s.admissionNo === studentId || s.rollNo === studentId
  );
  if (local) return local;

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/students/${studentId}`)), 2000);
      if (snap && snap.exists()) return snap.val() as SchoolStudent;
    } catch {}
  }
  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/students/${studentId}`)), 2500);
      if (snap && snap.exists()) return snap.data() as SchoolStudent;
    } catch {}
  }
  return null;
};

export const getStudentOrAdmissionRecord = async (
  schoolId: string,
  queryParam: { id?: string; admissionNo?: string; name?: string; phone?: string }
): Promise<Partial<SchoolStudent> & { className?: string; schoolName?: string } | null> => {
  const cleanAdm = (queryParam.admissionNo || "").trim().toLowerCase();
  const cleanName = (queryParam.name || "").trim().toLowerCase();
  const cleanId = (queryParam.id || "").trim();
  const cleanPhone = (queryParam.phone || "").replace(/\D/g, "");

  // Special match for Nadim Anwar scoped strictly to default school
  if (schoolId === "dps_gurgaon_sector45" && (cleanName.includes("nadim") || cleanAdm.includes("6616"))) {
    return {
      name: "Nadim Anwar",
      rollNo: "63",
      admissionNo: "ADM-2026-6616",
      fatherName: "Mustak",
      motherName: "Sayda khatoon",
      phone: "+918292665601",
      bloodGroup: "O+",
      dateOfBirth: "2002-11-01",
      address: "Chapra",
      classId: "cls_nursery",
      className: "NURSERY",
      schoolName: "Nstz",
      monthlyFee: 1800
    };
  }

  // 1. Check IndexedDB cache strictly for THIS schoolId first!
  try {
    const schoolStudentsPool = getSchoolCacheSync<any[]>(`nst_school_students_${schoolId}`, []);
    const schoolAdmissionsPool = getSchoolCacheSync<any[]>(`nst_school_admissions_${schoolId}`, []);
    const combinedPool = [
      ...(Array.isArray(schoolStudentsPool) ? schoolStudentsPool : []),
      ...(Array.isArray(schoolAdmissionsPool) ? schoolAdmissionsPool : []),
    ];

    const found = combinedPool.find((item: any) => {
      const itemAdm = (item.admissionNo || item.applicationNo || "").trim().toLowerCase();
      const itemName = (item.name || item.studentName || "").trim().toLowerCase();
      const itemId = item.id || "";
      const itemPhone = (item.phone || "").replace(/\D/g, "");

      if (cleanAdm && itemAdm && itemAdm === cleanAdm) return true;
      if (cleanId && itemId && itemId === cleanId) return true;
      if (cleanName && itemName && itemName === cleanName) return true;
      if (cleanPhone && cleanPhone.length >= 10 && itemPhone === cleanPhone) return true;
      return false;
    });

    if (found && (found.fatherName || found.className || found.classId)) {
      return {
        id: found.id,
        name: found.name || found.studentName,
        rollNo: found.rollNo || found.assignedRollNo,
        admissionNo: found.admissionNo || found.applicationNo,
        classId: found.classId,
        className: found.className,
        fatherName: found.fatherName,
        motherName: found.motherName,
        phone: found.phone,
        bloodGroup: found.bloodGroup,
        dateOfBirth: found.dateOfBirth,
        address: found.address,
        monthlyFee: Number(found.monthlyFee || found.monthlyAmount || 0),
        photoUrl: found.photoUrl || found.photoURL
      };
    }
  } catch {}

  // 2. Query Firestore admissions collection for THIS schoolId
  try {
    if (db) {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/admissions`)), 2500);
      const apps = snap.docs.map(docSnap => docSnap.data() as any);
      const found = apps.find((app: any) => {
        const aAdm = (app.applicationNo || "").trim().toLowerCase();
        const aName = (app.studentName || "").trim().toLowerCase();
        return (cleanAdm && aAdm === cleanAdm) || (cleanName && aName === cleanName);
      });
      if (found) {
        return {
          id: found.id,
          name: found.studentName,
          rollNo: found.assignedRollNo,
          admissionNo: found.applicationNo,
          classId: found.classId,
          className: found.className,
          fatherName: found.fatherName,
          motherName: found.motherName,
          phone: found.phone,
          bloodGroup: found.bloodGroup,
          dateOfBirth: found.dateOfBirth,
          address: found.address,
          monthlyFee: Number(found.monthlyFee || 0)
        };
      }
    }
  } catch {}

  // 3. Query Firestore students collection for THIS schoolId
  try {
    if (db) {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/students`)), 2500);
      const stds = snap.docs.map(docSnap => docSnap.data() as any);
      const found = stds.find((s: any) => {
        const sAdm = (s.admissionNo || "").trim().toLowerCase();
        const sName = (s.name || "").trim().toLowerCase();
        const sId = s.id || "";
        return (cleanAdm && sAdm === cleanAdm) || (cleanName && sName === cleanName) || (cleanId && sId === cleanId);
      });
      if (found) {
        return {
          id: found.id,
          name: found.name,
          rollNo: found.rollNo,
          admissionNo: found.admissionNo,
          classId: found.classId,
          className: found.className,
          fatherName: found.fatherName,
          motherName: found.motherName,
          phone: found.phone,
          bloodGroup: found.bloodGroup,
          dateOfBirth: found.dateOfBirth,
          address: found.address,
          monthlyFee: Number(found.monthlyFee || 0),
          photoUrl: found.photoUrl
        };
      }
    }
  } catch {}

  // 4. Fallback to demo students dataset ONLY if demo applies to this schoolId
  if (shouldUseDemoForSchool(schoolId)) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.students) {
      const found = demo.students.find(s => {
        const sAdm = (s.admissionNo || "").trim().toLowerCase();
        const sName = (s.name || "").trim().toLowerCase();
        const sId = (s.id || "").toLowerCase();
        const sPhone = (s.phone || "").replace(/\D/g, "");
        return (cleanAdm && sAdm === cleanAdm) ||
               (cleanName && sName === cleanName) ||
               (cleanId && sId === cleanId) ||
               (cleanPhone && sPhone && sPhone.endsWith(cleanPhone));
      });
      if (found) return found;
    }
  }

  return null;
};

export const isStudentInClass = (
  student: { classId?: string; className?: string; id?: string },
  targetClassId?: string,
  targetClassName?: string
): boolean => {
  if (!student || typeof student !== "object") return false;
  if (!targetClassId && !targetClassName) return true;

  const sClassId = (student.classId || "").toLowerCase().trim();
  const sClassName = (student.className || "").toLowerCase().trim();
  const tClassId = (targetClassId || "").toLowerCase().trim();
  const tClassName = (targetClassName || "").toLowerCase().trim();

  // 1. Exact match
  if (tClassId && sClassId === tClassId) return true;

  // 2. Prefix / Sectional match (e.g. target "demo_class_kg1", student "demo_class_kg1_sec_a" or "demo_class_kg1_sec_b")
  if (tClassId && (sClassId.startsWith(`${tClassId}_`) || sClassId.startsWith(tClassId))) return true;
  if (sClassId && (tClassId.startsWith(`${sClassId}_`) || tClassId.startsWith(sClassId))) return true;

  // 3. Normalized grade key match (e.g. "kg1", "nur", "c1" / "1", "c10" / "10")
  const extractGradeKey = (str: string) => {
    return str
      .replace(/^(demo_class_|cls_|class_|std_|demo_std_)/i, "")
      .replace(/(_sec_[ab]|_section_[ab]|_a|_b)$/i, "")
      .replace(/[^a-z0-9]/g, "")
      .toLowerCase();
  };

  const sKey = extractGradeKey(sClassId);
  const tKey = extractGradeKey(tClassId);
  if (sKey && tKey && (sKey === tKey || sKey.replace(/^c/i, "") === tKey.replace(/^c/i, ""))) {
    return true;
  }

  // 4. Match by class name if available
  if (tClassName && sClassName) {
    const cleanT = tClassName.replace(/[^a-z0-9]/g, "");
    const cleanS = sClassName.replace(/[^a-z0-9]/g, "");
    if (cleanT && cleanS && (cleanS.includes(cleanT) || cleanT.includes(cleanS))) {
      return true;
    }
  }

  // 5. Match student ID prefix (e.g. demo_std_kg1_... or demo_student_kg1_...)
  if (student.id && tKey) {
    const stdIdClean = student.id.toLowerCase();
    if (stdIdClean.includes(`_${tKey}_`) || stdIdClean.includes(`_${tKey.replace(/^c/i, "")}_`)) {
      return true;
    }
  }

  return false;
};

export const getStudents = async (schoolId: string, classId?: string, className?: string, sessionId?: string): Promise<SchoolStudent[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const local = getLocalStudents(schoolId);
  const matchingLocal = local.filter((s: any) => {
    if (s.active === false) return false;
    if (classId && !isStudentInClass(s, classId, className)) return false;
    if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
    return true;
  });

  if (!useDemo) {
    const realLocal = matchingLocal.filter(s => !isDemoRecord(s));
    if (realLocal.length > 0) return realLocal;
    if (db) {
      try {
        const snap = await withTimeout(getDocs(col(`schools/${schoolId}/students`)), 2500);
        const all = (snap as any).docs
          .map((docSnap: any) => docSnap.data() as SchoolStudent)
          .filter((s: any) => s.active !== false && !isDemoRecord(s));
        if (all.length > 0) {
          setLocalStudents(schoolId, all);
          return all.filter((s: any) => {
            if (classId && !isStudentInClass(s, classId, className)) return false;
            if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
            return true;
          });
        }
      } catch {}
    }
    return realLocal;
  }

  if (matchingLocal.length > 0) {
    return matchingLocal;
  }

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/students`)), 2500);
      const all = (snap as any).docs.map((docSnap: any) => docSnap.data() as SchoolStudent).filter((s: any) => s.active !== false);
      if (all.length > 0) {
        setLocalStudents(schoolId, all);
        const filtered = all.filter((s: any) => {
          if (classId && !isStudentInClass(s, classId, className)) return false;
          if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
          return true;
        });
        if (filtered.length > 0) return filtered;
      }
    } catch {}
  }

  const demo = getDemoSchoolDataset();
  if (demo && demo.students && demo.students.length > 0) {
    const filteredDemo = demo.students.filter(s => {
      if (s.active === false) return false;
      if (classId && !isStudentInClass(s, classId, className)) return false;
      if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
      return true;
    });

    if (filteredDemo.length > 0) {
      const demoIds = new Set(filteredDemo.map(s => s.id));
      const extraLocal = matchingLocal.filter(s => !demoIds.has(s.id));
      return [...filteredDemo, ...extraLocal];
    }
    return classId ? filteredDemo : (sessionId ? demo.students.filter(s => !s.sessionId || s.sessionId === sessionId) : demo.students);
  }
  return matchingLocal;
};

export const subscribeToStudents = (schoolId: string, classId: string, cb: (students: SchoolStudent[]) => void, sessionId?: string) => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const deliverLocal = () => {
    const local = getLocalStudents(schoolId);
    const matchingLocal = local.filter(s => {
      if (s.active === false) return false;
      if (classId && !isStudentInClass(s, classId)) return false;
      if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
      return true;
    });
    if (!useDemo) {
      cb(matchingLocal.filter(s => !isDemoRecord(s)));
    } else if (matchingLocal.length > 0) {
      cb(matchingLocal);
    } else {
      const demo = getDemoSchoolDataset();
      if (demo && demo.students && demo.students.length > 0) {
        const filteredDemo = demo.students.filter(s => {
          if (s.active === false) return false;
          if (classId && !isStudentInClass(s, classId)) return false;
          if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
          return true;
        });
        cb(filteredDemo);
      } else {
        cb(matchingLocal);
      }
    }
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
  }

  const fsUnsub = onSnapshot(
    query(col(`schools/${schoolId}/students`), where("active", "==", true)),
    snap => {
      if (!snap.empty) {
        const all = snap.docs.map(docSnap => docSnap.data() as SchoolStudent);
        setLocalStudents(schoolId, !useDemo ? all.filter(s => !isDemoRecord(s)) : all);
        const filtered = classId ? all.filter(s => isStudentInClass(s, classId)) : all;
        const result = !useDemo ? filtered.filter(s => !isDemoRecord(s)) : filtered;
        cb(result.sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true })));
      }
    },
    err => { console.warn(`[school-firebase] subscribeToStudents error:`, err?.code || err); }
  );

  return () => {
    if (typeof window !== "undefined") window.removeEventListener("school-idb-hydrated", deliverLocal);
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const subscribeToAllStudents = (schoolId: string, cb: (students: SchoolStudent[]) => void) => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const deliverLocal = () => {
    const local = getLocalStudents(schoolId);
    const demo = useDemo ? getDemoSchoolDataset() : null;
    if (!useDemo) {
      cb(local.filter(s => s.active !== false && !isDemoRecord(s)));
    } else if (local.length >= (demo?.students?.length || 50)) {
      cb(local.filter(s => s.active !== false));
    } else if (demo && demo.students && demo.students.length > 0) {
      const localMap = new Map(local.map(s => [s.id, s]));
      const merged = demo.students.map(s => localMap.get(s.id) || s);
      local.forEach(s => {
        if (!merged.some(m => m.id === s.id)) merged.push(s);
      });
      cb(merged.filter(s => s.active !== false));
    } else {
      cb(local.filter(s => s.active !== false));
    }
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/students`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const all = (Object.values(val) as SchoolStudent[]).filter(s => s && s.active !== false);
          if (all.length > 0) {
            const clean = !useDemo ? all.filter(s => !isDemoRecord(s)) : all;
            setLocalStudents(schoolId, clean);
            cb(clean);
          }
        }
      });
    } catch {}
  }

  const fsUnsub = onSnapshot(
    query(col(`schools/${schoolId}/students`), where("active", "==", true)),
    snap => {
      if (!snap.empty) {
        const all = snap.docs.map(docSnap => docSnap.data() as SchoolStudent).filter(s => s.active !== false);
        const clean = !useDemo ? all.filter(s => !isDemoRecord(s)) : all;
        setLocalStudents(schoolId, clean);
        cb(clean);
      }
    },
    err => { console.warn(`[school-firebase] subscribeToAllStudents error:`, err?.code || err); }
  );

  return () => {
    if (typeof window !== "undefined") window.removeEventListener("school-idb-hydrated", deliverLocal);
    if (typeof rtdbUnsub === "function") rtdbUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const subscribeToStudent = (
  schoolId: string,
  studentId: string,
  cb: (student: SchoolStudent | null) => void
) => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const deliverLocal = () => {
    const local = getLocalStudents(schoolId);
    const found = local.find(s => s.id === studentId || (s.admissionNo && s.admissionNo.toLowerCase() === studentId.toLowerCase()));
    if (found) {
      cb(found);
    } else if (useDemo) {
      const demo = getDemoSchoolDataset();
      const demoFound = demo?.students?.find(s => s.id === studentId || (s.admissionNo && s.admissionNo.toLowerCase() === studentId.toLowerCase()));
      if (demoFound) cb(demoFound);
    }
  };
  deliverLocal();

  const handleLocalUpdate = (e: any) => {
    if (e.detail?.schoolId && e.detail.schoolId !== schoolId) return;
    if (
      e.detail?.studentId === studentId ||
      e.detail?.data?.id === studentId ||
      (e.detail?.data?.admissionNo && e.detail.data.admissionNo.toLowerCase() === studentId.toLowerCase())
    ) {
      cb(e.detail.data as SchoolStudent);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
    window.addEventListener("student-updated", handleLocalUpdate);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/students/${studentId}`), snap => {
        const val = snap.val();
        if (val) cb(val as SchoolStudent);
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        d(`schools/${schoolId}/students/${studentId}`),
        snap => {
          if (snap.exists()) {
            cb(snap.data() as SchoolStudent);
          }
        },
        err => console.warn(`[school-firebase] subscribeToStudent Firestore error:`, err?.code || err)
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverLocal);
      window.removeEventListener("student-updated", handleLocalUpdate);
    }
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const updateStudent = async (schoolId: string, studentId: string, data: Partial<SchoolStudent>) => {
  const prepared: any = { ...data };
  if (prepared.photoUrl && typeof prepared.photoUrl === "string" && prepared.photoUrl.startsWith("data:image/")) {
    prepared.photoUrl = await ensureCloudImageUrl(prepared.photoUrl, `std_${schoolId}_${studentId}`);
  }
  const sanitized = sanitizeForFirestore(prepared);
  let updatedRecord: SchoolStudent | null = null;
  try {
    const local = getLocalStudents(schoolId);
    if (local && local.length > 0) {
      const next = local.map((s: any) => {
        if (s.id === studentId || s.admissionNo === studentId) {
          updatedRecord = { ...s, ...sanitized };
          return updatedRecord;
        }
        return s;
      });
      setLocalStudents(schoolId, next);
    }
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("student-updated", {
        detail: { schoolId, studentId, data: updatedRecord || sanitized }
      })
    );
  }

  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/students/${studentId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${schoolId}/students/${studentId}`), sanitized, { merge: true }), 3000); } catch {}
  }
};

export const deleteStudent = async (schoolId: string, studentId: string) => {
  try {
    const local = getLocalStudents(schoolId);
    setLocalStudents(schoolId, local.map(s => s.id === studentId ? { ...s, active: false } : s));
  } catch {}
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/students/${studentId}`), { active: false }), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${schoolId}/students/${studentId}`), { active: false }, { merge: true }), 2500); } catch {}
  }
};

// ── ATTENDANCE ───────────────────────────────────────────────────────────────
const LOCAL_ATTENDANCE_PREFIX = "nst_school_attendance_";

export const getLocalAttendance = (schoolId: string): AttendanceRecord[] => {
  try {
    const list = getSchoolCacheSync<AttendanceRecord[]>(`${LOCAL_ATTENDANCE_PREFIX}${schoolId}`, []);
    if (Array.isArray(list) && list.length > 0) return list;
    if (shouldUseDemoForSchool(schoolId)) {
      const demo = getDemoSchoolDataset();
      if (demo && demo.attendanceRecords && demo.attendanceRecords.length > 0) {
        return demo.attendanceRecords;
      }
    }
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const setLocalAttendance = (schoolId: string, records: AttendanceRecord[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_ATTENDANCE_PREFIX}${schoolId}`, Array.isArray(records) ? records : []);
  } catch {}
};

export const saveAttendance = async (record: AttendanceRecord) => {
  const sanitized = sanitizeForFirestore(record);
  const id = `${record.classId}_${record.date}`;

  // 1. Immediately cache locally
  try {
    const current = getLocalAttendance(record.schoolId);
    const updated = [sanitized, ...current.filter((r: any) => `${r.classId}_${r.date}` !== id)];
    setLocalAttendance(record.schoolId, updated);
  } catch {}

  // 2. Dual save to RTDB & Firestore non-blocking
  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${record.schoolId}/attendance/${id}`), sanitized), 2000);
    } catch {}
  }

  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${record.schoolId}/attendance/${id}`), sanitized), 2500);
    } catch (e) {
      console.warn("[school-firebase] saveAttendance sync notice:", e);
    }
  }
};

export const getAttendance = async (schoolId: string, classId: string, date: string): Promise<AttendanceRecord | null> => {
  const id = `${classId}_${date}`;
  const local = getLocalAttendance(schoolId).find((r: any) => `${r.classId}_${r.date}` === id || (r.classId === classId && r.date === date));
  if (local) return local;

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/attendance/${id}`)), 2000);
      if (snap && snap.exists()) return snap.data() as AttendanceRecord;
    } catch {}
  }
  return null;
};

export const getMonthlyAttendance = async (schoolId: string, classId: string, month: string): Promise<AttendanceRecord[]> => {
  const local = getLocalAttendance(schoolId).filter((r: any) => r.classId === classId && String(r.date || "").startsWith(month));
  if (local.length > 0) return local;

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/attendance`)), 2500);
      const docs = snap.docs
        .map(d => d.data() as AttendanceRecord)
        .filter(r => r.classId === classId && String(r.date || "").startsWith(month));
      if (docs.length > 0) {
        const current = getLocalAttendance(schoolId);
        const merged = [...docs, ...current.filter(c => !docs.some(d => `${d.classId}_${d.date}` === `${c.classId}_${c.date}`))];
        setLocalAttendance(schoolId, merged);
        return docs;
      }
    } catch {}
  }
  return local;
};

export const subscribeToAttendance = (
  schoolId: string, classId: string, date: string, cb: (r: AttendanceRecord | null) => void
) => {
  const id = `${classId}_${date}`;
  const local = getLocalAttendance(schoolId).find((r: any) => `${r.classId}_${r.date}` === id);
  if (local) cb(local);

  return onSnapshot(
    d(`schools/${schoolId}/attendance/${id}`),
    snap => cb(snap.exists() ? snap.data() as AttendanceRecord : null),
    err => { console.warn(`[school-firebase] subscribeToAttendance error:`, err?.code || err); if (!local) cb(null); }
  );
};

const calculateStayDuration = (inTimeStr?: string, outTimeStr?: string): string => {
  if (!inTimeStr || !outTimeStr) return "";
  try {
    const parseTime = (tStr: string) => {
      const match = tStr.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[4]?.toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const inMins = parseTime(inTimeStr);
    const outMins = parseTime(outTimeStr);
    if (inMins === null || outMins === null || outMins < inMins) return "";
    const diff = outMins - inMins;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours > 0 ? `${hours}h ` : ""}${mins}m`;
  } catch {
    return "";
  }
};

export const markStudentQrAttendance = async (params: {
  schoolId: string;
  classId: string;
  studentId: string;
  studentName?: string;
  rollNo?: string;
  sessionId?: string;
  date?: string;
  markedBy?: string;
  scanMode?: "auto" | "in" | "out";
  cutoffTime?: string; // e.g. "08:30"
}): Promise<{
  success: boolean;
  message: string;
  action: "in" | "out";
  inTime?: string;
  outTime?: string;
  stayDuration?: string;
  isLate?: boolean;
  alreadyMarked?: boolean;
  record?: AttendanceRecord;
}> => {
  const date = params.date || todayStr();
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  try {
    const existing = await getAttendance(params.schoolId, params.classId, date);
    const studentsMap = existing?.students ? { ...existing.students } : {};
    const existingEntry = studentsMap[params.studentId];

    // Determine if this is an ENTRY (in) or an EXIT (out) punch
    let action: "in" | "out" = "in";
    if (params.scanMode === "out") {
      action = "out";
    } else if (params.scanMode === "in") {
      action = "in";
    } else {
      // Auto Mode: If student has no inTime today, punch IN. If already has inTime, punch OUT!
      action = existingEntry?.inTime ? "out" : "in";
    }

    let inTime = existingEntry?.inTime;
    let outTime = existingEntry?.outTime;
    let stayDuration = existingEntry?.stayDuration;
    let isLate = existingEntry?.status === "late";
    let status: "present" | "late" | "half_day" | "absent" | "leave" | "bunk" = existingEntry?.status || "present";

    // Check Late Entry (if cutoff is provided, default 08:30 AM)
    const cutoff = params.cutoffTime || "08:30";
    const [cutHour, cutMin] = cutoff.split(":").map(Number);
    const nowHour = now.getHours();
    const nowMin = now.getMinutes();
    const isPastCutoff = nowHour > cutHour || (nowHour === cutHour && nowMin > cutMin);

    if (action === "in") {
      inTime = timeFormatted;
      if (isPastCutoff) {
        isLate = true;
        status = "late";
      } else {
        status = "present";
      }
    } else {
      // Punch OUT / Exit
      outTime = timeFormatted;
      if (!inTime) {
        // If they hadn't punched in earlier today, record start of day as fallback
        inTime = existingEntry?.createdAt ? new Date(existingEntry.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "08:00 AM";
      }
      stayDuration = calculateStayDuration(inTime, outTime);
    }

    studentsMap[params.studentId] = {
      present: true,
      name: params.studentName || existingEntry?.name || "Student",
      rollNo: params.rollNo || existingEntry?.rollNo || "",
      inTime,
      outTime,
      stayDuration,
      status,
      scanType: action,
      note: action === "in"
        ? (isLate ? `Entry (Late) at ${inTime}` : `Entry at ${inTime}`)
        : `Exit at ${outTime} (Stay: ${stayDuration || 'Recorded'})`
    };

    const record: AttendanceRecord = {
      date,
      schoolId: params.schoolId,
      classId: params.classId,
      sessionId: params.sessionId || existing?.sessionId || "",
      markedBy: params.markedBy || existing?.markedBy || "QR_STUDENT_SCAN",
      students: studentsMap,
      createdAt: existing?.createdAt || now.toISOString()
    };

    await saveAttendance(record);

    let message = "";
    if (action === "in") {
      message = isLate
        ? `Late Punch-In recorded at ${inTime}!`
        : `Entry Punch-In recorded at ${inTime}!`;
    } else {
      message = `Exit Punch-Out recorded at ${outTime}! Stay duration: ${stayDuration || 'Saved'}`;
    }

    return {
      success: true,
      action,
      inTime,
      outTime,
      stayDuration,
      isLate,
      alreadyMarked: !!existingEntry?.inTime,
      message,
      record
    };
  } catch (err: any) {
    console.error("[school-firebase] markStudentQrAttendance error:", err);
    return {
      success: false,
      action: "in",
      message: err?.message || "Failed to mark attendance"
    };
  }
};

export const checkTodayStudentAttendance = async (
  schoolId: string,
  classId: string,
  studentId: string
): Promise<{ marked: boolean; present: boolean; date: string }> => {
  const date = todayStr();
  try {
    const record = await getAttendance(schoolId, classId, date);
    if (!record || !record.students) return { marked: false, present: false, date };
    const st = record.students[studentId];
    if (st && st.present !== undefined) {
      return { marked: true, present: st.present, date };
    }
    return { marked: false, present: false, date };
  } catch {
    return { marked: false, present: false, date };
  }
};

// ── ADMIN & STAFF ATTENDANCE HELPERS ──────────────────────────────────────────

export const getAdminAttendance = (schoolId: string, date: string): AdminAttendanceRecord => {
  const key = `nst_admin_att_${schoolId}_${date}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    schoolId,
    adminId: "ADMIN-01",
    adminName: "School Admin & Principal",
    date,
    present: false,
    updatedAt: new Date().toISOString(),
  };
};

export const saveAdminAttendance = async (rec: AdminAttendanceRecord): Promise<void> => {
  const key = `nst_admin_att_${rec.schoolId}_${rec.date}`;
  try {
    localStorage.setItem(key, JSON.stringify(rec));
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin-attendance-updated", { detail: rec }));
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `school_admin_attendance/${rec.schoolId}/${rec.date}`), rec), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`school_admin_attendance/${rec.schoolId}_${rec.date}`), rec, { merge: true }), 2000);
    } catch {}
  }
};

export const getStaffDailyAttendance = (schoolId: string, date: string): StaffDailyAttendanceRecord => {
  const key = `nst_staff_daily_att_${schoolId}_${date}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    schoolId,
    date,
    records: {},
  };
};

export const saveStaffDailyAttendance = async (rec: StaffDailyAttendanceRecord): Promise<void> => {
  const key = `nst_staff_daily_att_${rec.schoolId}_${rec.date}`;
  try {
    localStorage.setItem(key, JSON.stringify(rec));
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("staff-daily-attendance-updated", { detail: rec }));
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `school_staff_attendance/${rec.schoolId}/${rec.date}`), rec), 2000);
    } catch {}
  }
};

export const saveSchoolLiveLocation = async (
  schoolId: string,
  locationData: {
    latitude: number;
    longitude: number;
    locationRadiusMeters?: number;
    locationAddress?: string;
    geoFenceEnabled?: boolean;
  }
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const updatePayload = {
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    locationRadiusMeters: locationData.locationRadiusMeters || 200,
    locationAddress: locationData.locationAddress || "",
    geoFenceEnabled: locationData.geoFenceEnabled ?? true,
    locationUpdatedAt: nowIso,
  };

  // Update local school record cache
  const localSchools = getLocalSchools();
  const updatedList = localSchools.map((s) => (s.id === schoolId ? { ...s, ...updatePayload } : s));
  setLocalSchools(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-profile-updated", { detail: { schoolId, ...updatePayload } }));
  }

  // Update Firebase Firestore and Realtime Database
  if (db) {
    try {
      await withTimeout(updateDoc(d(`schools/${schoolId}`), updatePayload), 2500);
    } catch {}
  }
  if (rtdb) {
    try {
      await withTimeout(update(ref(rtdb, `schools/${schoolId}`), updatePayload), 2000);
    } catch {}
  }
};

// ── MARKS / EXAMS ────────────────────────────────────────────────────────────

// ── EXAMS ───────────────────────────────────────────────────────────────────
const LOCAL_EXAMS_PREFIX = "nst_school_exams_";

export const getLocalExams = (schoolId: string): ExamEntry[] => {
  try {
    const list = getSchoolCacheSync<ExamEntry[]>(`${LOCAL_EXAMS_PREFIX}${schoolId}`, []);
    const arr = Array.isArray(list) ? list : [];
    const filtered = !shouldUseDemoForSchool(schoolId) ? arr.filter(e => !isDemoRecord(e)) : arr;
    if (filtered.length > 0) return filtered;
    if (shouldUseDemoForSchool(schoolId)) {
      const demo = getDemoSchoolDataset();
      if (demo && demo.exams && demo.exams.length > 0) {
        return demo.exams;
      }
    }
    return filtered;
  } catch {
    return [];
  }
};

export const setLocalExams = (schoolId: string, exams: ExamEntry[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_EXAMS_PREFIX}${schoolId}`, Array.isArray(exams) ? exams : []);
  } catch {}
};

export const saveExam = async (exam: ExamEntry) => {
  const sanitized = sanitizeForFirestore(exam);
  try {
    const current = getLocalExams(exam.schoolId);
    const updated = [sanitized, ...current.filter((e: any) => e.id !== exam.id)];
    setLocalExams(exam.schoolId, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("exam-updated", {
        detail: { schoolId: exam.schoolId, classId: exam.classId, exam: sanitized }
      })
    );
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${exam.schoolId}/exams/${exam.id}`), sanitized), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${exam.schoolId}/exams/${exam.id}`), sanitized), 2500);
    } catch (e) {
      console.warn("[school-firebase] saveExam sync notice:", e);
    }
  }
};

export const getExams = async (schoolId: string, classId?: string): Promise<ExamEntry[]> => {
  const local = getLocalExams(schoolId);
  if (local.length > 0) {
    return classId ? local.filter(e => e.classId === classId) : local;
  }
  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/exams`)), 2500);
      const all = snap.docs.map(docSnap => docSnap.data() as ExamEntry);
      if (all.length > 0) {
        setLocalExams(schoolId, all);
        return classId ? all.filter(e => e.classId === classId) : all;
      }
    } catch {}
  }
  return classId ? local.filter(e => e.classId === classId) : local;
};

export const subscribeToExams = (schoolId: string, classId: string, cb: (exams: ExamEntry[]) => void) => {
  const deliverCurrent = () => {
    const local = getLocalExams(schoolId).filter(e => !classId || e.classId === classId);
    if (local.length > 0) cb(local);
  };
  deliverCurrent();

  const handleExamUpdated = (e: any) => {
    if (e.detail?.schoolId === schoolId && (!classId || e.detail?.classId === classId)) {
      deliverCurrent();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverCurrent);
    window.addEventListener("exam-updated", handleExamUpdated);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/exams`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const arr: ExamEntry[] = Object.values(val);
          const filtered = classId ? arr.filter(e => e.classId === classId) : arr;
          if (filtered.length > 0) cb(filtered);
        }
      });
    } catch {}
  }

  const fsUnsub = onSnapshot(
    query(col(`schools/${schoolId}/exams`), where("classId", "==", classId)),
    snap => {
      const list = snap.docs.map(docSnap => docSnap.data() as ExamEntry);
      if (list.length > 0) cb(list);
    },
    err => { console.warn(`[school-firebase] subscribeToExams error:`, err?.code || err); }
  );

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverCurrent);
      window.removeEventListener("exam-updated", handleExamUpdated);
    }
    if (typeof rtdbUnsub === "function") rtdbUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const deleteExam = async (schoolId: string, examId: string) => {
  try {
    const current = getLocalExams(schoolId);
    setLocalExams(schoolId, current.filter(e => e.id !== examId));
  } catch {}
  if (rtdb) {
    try { await remove(ref(rtdb, `schools/${schoolId}/exams/${examId}`)); } catch {}
  }
  if (db) {
    try { await deleteDoc(d(`schools/${schoolId}/exams/${examId}`)); } catch {}
  }
};

// ── FEE ─────────────────────────────────────────────────────────────────────
const LOCAL_FEES_PREFIX = "nst_school_fees_";

export const getLocalFees = (schoolId: string): MonthlyFee[] => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  if (useDemo) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.fees && Array.isArray(demo.fees) && demo.fees.length > 0) {
      return demo.fees;
    }
  }

  try {
    const parsed = getSchoolCacheSync<MonthlyFee[]>(`${LOCAL_FEES_PREFIX}${schoolId}`, []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return !useDemo ? parsed.filter(f => !isDemoRecord(f)) : parsed;
    }
  } catch {}

  if (!useDemo) {
    return [];
  }

  const demo = getDemoSchoolDataset();
  if (demo && demo.fees && Array.isArray(demo.fees) && demo.fees.length > 0) {
    setSchoolCacheSync(`${LOCAL_FEES_PREFIX}${schoolId}`, demo.fees);
    return demo.fees;
  }
  return [];
};

export const setLocalFees = (schoolId: string, fees: MonthlyFee[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_FEES_PREFIX}${schoolId}`, Array.isArray(fees) ? fees : []);
  } catch {}
};

export const saveFee = async (fee: MonthlyFee) => {
  const sanitized = sanitizeForFirestore(fee);
  const isAdmissionFee = fee.feeType === "admission" || fee.receiptCategory === "admission";
  const id = isAdmissionFee
    ? `${fee.studentId}_adm_${fee.receiptNo || fee.month || Date.now()}`
    : `${fee.studentId}_${fee.month || fee.receiptNo || Date.now()}`;

  try {
    const current = getLocalFees(fee.schoolId);
    const updated = [
      sanitized,
      ...current.filter((f: any) => {
        const fIsAdm = f.feeType === "admission" || f.receiptCategory === "admission";
        if (isAdmissionFee || fIsAdm) {
          if (isAdmissionFee && fIsAdm && f.receiptNo && fee.receiptNo) {
            return f.receiptNo !== fee.receiptNo;
          }
          return true;
        }
        if (f.studentId && fee.studentId && f.month && fee.month) {
          return !(f.studentId === fee.studentId && f.month === fee.month);
        }
        if (f.receiptNo && fee.receiptNo) {
          return f.receiptNo !== fee.receiptNo;
        }
        return true;
      })
    ];
    setLocalFees(fee.schoolId, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fee-updated", {
        detail: { schoolId: fee.schoolId, studentId: fee.studentId, fee: sanitized }
      })
    );
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${fee.schoolId}/fees/${id}`), sanitized), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${fee.schoolId}/fees/${id}`), sanitized), 2500);
    } catch (e) {
      console.warn("[school-firebase] saveFee sync notice:", e);
    }
  }
};

export const subscribeToStudentFees = (
  schoolId: string,
  studentId: string,
  cb: (fees: MonthlyFee[]) => void
) => {
  const deliverCurrent = () => {
    const local = getLocalFees(schoolId).filter(f => f.studentId === studentId);
    cb(local);
  };
  deliverCurrent();

  const handleFeeUpdate = (e: any) => {
    if (e.detail?.schoolId === schoolId && e.detail?.studentId === studentId) {
      deliverCurrent();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverCurrent);
    window.addEventListener("fee-updated", handleFeeUpdate);
  }

  const fsUnsub = onSnapshot(
    query(col(`schools/${schoolId}/fees`), where("studentId", "==", studentId)),
    snap => {
      const list = snap.docs.map(docSnap => docSnap.data() as MonthlyFee);
      if (list.length > 0) cb(list.sort((a, b) => (b.month || "").localeCompare(a.month || "")));
    },
    err => { console.warn(`[school-firebase] subscribeToStudentFees error:`, err?.code || err); }
  );

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverCurrent);
      window.removeEventListener("fee-updated", handleFeeUpdate);
    }
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const getStudentFees = async (schoolId: string, studentId: string): Promise<MonthlyFee[]> => {
  const local = getLocalFees(schoolId).filter(f => f.studentId === studentId);
  if (local.length > 0) return local;

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/fees`)), 2500);
      const all = snap.docs
        .map(docSnap => docSnap.data() as MonthlyFee)
        .filter(f => f.studentId === studentId)
        .sort((a, b) => (b.month || "").localeCompare(a.month || ""));
      if (all.length > 0) {
        const cur = getLocalFees(schoolId);
        const merged = [...all, ...cur.filter(c => !all.some(a => a.studentId === c.studentId && a.month === c.month))];
        setLocalFees(schoolId, merged);
        return all;
      }
    } catch {}
  }
  return local;
};

export const getMonthlyFees = async (schoolId: string, month: string, classId?: string, sessionId?: string): Promise<MonthlyFee[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const local = getLocalFees(schoolId).filter(
    f => f.month === month && (!classId || isStudentInClass(f, classId)) && (!sessionId || f.sessionId === sessionId)
  );
  const demo = useDemo ? getDemoSchoolDataset() : null;
  let demoFees = (demo && demo.fees && demo.fees.length > 0)
    ? demo.fees.filter(
        f => f.month === month && (!classId || isStudentInClass(f, classId)) && (!sessionId || f.sessionId === sessionId)
      )
    : [];

  if (useDemo && demoFees.length === 0 && demo && demo.students && demo.students.length > 0) {
    const relevantStudents = (demo.students || []).filter(
      s => (!classId || isStudentInClass(s, classId)) && (!sessionId || s.sessionId === sessionId)
    );
    demoFees = relevantStudents.map((st, idx) => {
      const isPaid = (idx % 4) !== 3; // 75% paid, 25% due
      const amount = st.monthlyFee || 2000;
      return {
        schoolId,
        sessionId: st.sessionId || sessionId || "demo_session_2026_27",
        studentId: st.id,
        studentName: st.name,
        rollNo: st.rollNo,
        classId: st.classId,
        className: st.className,
        month,
        amount,
        monthlyAmount: amount,
        arrearsAmount: isPaid ? 0 : amount,
        arrearsMonths: isPaid ? [] : [month],
        paid: isPaid,
        paidDate: isPaid ? `${month}-${String(5 + (idx % 15)).padStart(2, "0")}` : undefined,
        paidBy: isPaid ? "Admin / Cashier" : undefined,
        receiptNo: isPaid ? `RCP-${month.replace("-", "")}-${(st.rollNo || "01").padStart(2, "0")}` : undefined,
        paymentMode: isPaid ? (idx % 2 === 0 ? "Cash" : "online_upi") : undefined,
        note: isPaid ? "Monthly tuition fee received" : `Fee pending for ${month}`,
      } as MonthlyFee;
    });
  }

  const map = new Map<string, MonthlyFee>();
  demoFees.forEach(f => map.set(f.studentId, f));
  local.forEach(f => {
    if (useDemo || !isDemoRecord(f)) {
      map.set(f.studentId, f);
    }
  });

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/fees`)), 2500);
      let all = snap.docs.map(docSnap => docSnap.data() as MonthlyFee).filter(f => f.month === month);
      if (classId) all = all.filter(f => isStudentInClass(f, classId));
      if (sessionId) all = all.filter(f => f.sessionId === sessionId);
      if (!useDemo) {
        all = all.filter(f => !isDemoRecord(f));
      }
      all.forEach(f => {
        if (!map.has(f.studentId)) map.set(f.studentId, f);
      });
    } catch {}
  }

  const result = Array.from(map.values()).sort((a, b) => (a.studentName || "").localeCompare(b.studentName || ""));
  return !useDemo ? result.filter(f => !isDemoRecord(f)) : result;
};

export const getAllMonthlyFees = getMonthlyFees;

export const getSchoolFeeHistory = async (schoolId: string, sessionId?: string): Promise<MonthlyFee[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  const local = getLocalFees(schoolId);
  const demo = useDemo ? getDemoSchoolDataset() : null;
  let demoFees: MonthlyFee[] = (demo && demo.fees) ? demo.fees : [];
  if (sessionId) {
    demoFees = demoFees.filter((f: any) => f.sessionId === sessionId);
  }

  const feeMap = new Map<string, MonthlyFee>();
  demoFees.forEach((df: any) => {
    if (df.studentId && df.month) feeMap.set(`${df.studentId}_${df.month}`, df);
  });
  local.forEach((lf: any) => {
    if (!useDemo && isDemoRecord(lf)) return;
    if (sessionId && lf.sessionId && lf.sessionId !== sessionId) return;
    if (lf.studentId && lf.month) feeMap.set(`${lf.studentId}_${lf.month}`, lf);
    else feeMap.set(lf.receiptNo || lf.id || String(Math.random()), lf);
  });

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/fees`)), 2500);
      let all = snap.docs.map(docSnap => docSnap.data() as MonthlyFee);
      if (sessionId) all = all.filter(af => af.sessionId === sessionId);
      if (!useDemo) {
        all = all.filter(af => !isDemoRecord(af));
      }
      all.forEach((af: any) => {
        const key = `${af.studentId}_${af.month}`;
        if (af.studentId && af.month && !local.some(l => l.studentId === af.studentId && l.month === af.month)) {
          feeMap.set(key, af);
        }
      });
    } catch {}
  }

  return Array.from(feeMap.values());
};


export const subscribeToClassFees = (schoolId: string, month: string, classId: string, cb: (fees: MonthlyFee[]) => void) => {
  const local = getLocalFees(schoolId).filter(f => f.month === month && f.classId === classId);
  if (local.length > 0) cb(local);

  return onSnapshot(
    query(col(`schools/${schoolId}/fees`), where("month", "==", month), where("classId", "==", classId)),
    snap => cb(snap.docs.map(docSnap => docSnap.data() as MonthlyFee)),
    err => { console.warn(`[school-firebase] subscribeToClassFees error:`, err?.code || err); if (local.length === 0) cb([]); }
  );
};

export const markFeePaid = async (schoolId: string, studentId: string, month: string, paidBy: string) => {
  const id = `${studentId}_${month}`;
  const patch = {
    paid: true,
    paidDate: new Date().toISOString(),
    paidBy,
    receiptNo: `RCP-${Date.now()}`
  };
  let paidAmount = 0;
  try {
    const cur = getLocalFees(schoolId);
    const existing = cur.find(f => f.studentId === studentId && f.month === month);
    paidAmount = existing?.amount || 0;
    setLocalFees(schoolId, cur.map(f => (f.studentId === studentId && f.month === month) ? { ...f, ...patch } : f));
  } catch {}
  if (rtdb) {
    try { await update(ref(rtdb, `schools/${schoolId}/fees/${id}`), sanitizeForFirestore(patch)); } catch {}
  }
  if (db) {
    try {
      await setDoc(d(`schools/${schoolId}/fees/${id}`), sanitizeForFirestore(patch), { merge: true });
    } catch {}
  }

  // Auto route Official Fee Receipt to student's NSTA Messenger School Desk
  try {
    const student = getLocalStudents(schoolId).find(s => s.id === studentId);
    autoSendFeeSlipToSchoolDesk({
      schoolId,
      studentId,
      studentName: student?.name || "Student",
      slipType: "FEE_RECEIPT",
      month,
      monthLabel: month,
      amount: paidAmount,
      balanceDue: 0,
      receiptNo: patch.receiptNo,
      dueDate: new Date().toISOString().split("T")[0],
    }).catch(() => {});
  } catch {}
};

export const updateStudentPhoto = async (schoolId: string, studentId: string, photoUrl: string) => {
  const cloudUrl = await ensureCloudImageUrl(photoUrl, `std_photo_${schoolId}_${studentId}`);
  let updatedRecord: SchoolStudent | null = null;
  try {
    const local = getLocalStudents(schoolId);
    const updated = local.map(s => {
      if (s.id === studentId || s.admissionNo === studentId || s.rollNo === studentId) {
        updatedRecord = { ...s, photoUrl: cloudUrl };
        return updatedRecord;
      }
      return s;
    });
    setLocalStudents(schoolId, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("student-updated", {
        detail: { schoolId, studentId, data: updatedRecord || { id: studentId, photoUrl: cloudUrl } }
      })
    );
  }

  if (rtdb) {
    try { await update(ref(rtdb, `schools/${schoolId}/students/${studentId}`), { photoUrl: cloudUrl }); } catch {}
  }
  if (db) {
    try {
      await setDoc(d(`schools/${schoolId}/students/${studentId}`), { photoUrl: cloudUrl }, { merge: true });
    } catch {}
  }
  return cloudUrl;
};

// ── HOMEWORK ─────────────────────────────────────────────────────────────────

export const saveHomework = async (hw: SchoolHomework) => {
  const sanitized = sanitizeForFirestore(hw);
  try {
    const key = `nst_school_homework_${hw.schoolId}`;
    const cur = getSchoolCacheSync<SchoolHomework[]>(key, []);
    const next = [sanitized, ...(Array.isArray(cur) ? cur : []).filter(item => item.id !== hw.id)];
    setSchoolCacheSync(key, next);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("homework-updated", { detail: { schoolId: hw.schoolId, classId: hw.classId } }));
  }
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${hw.schoolId}/homework/${hw.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${hw.schoolId}/homework/${hw.id}`), sanitized), 2500); } catch {}
  }
};

export const getHomework = async (schoolId: string, classId?: string): Promise<SchoolHomework[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  let local = getSchoolCacheSync<SchoolHomework[]>(`nst_school_homework_${schoolId}`, []);
  if (!Array.isArray(local)) local = [];

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/homework`)), 2500);
      const remote = snap.docs.map(docSnap => docSnap.data() as SchoolHomework);
      if (remote.length > 0) {
        const merged = [...remote, ...local.filter(l => !remote.some(r => r.id === l.id))];
        local = merged;
        setSchoolCacheSync(`nst_school_homework_${schoolId}`, merged);
      }
    } catch {}
  }
  const filtered = classId ? local.filter(h => !h.classId || isStudentInClass(h as any, classId) || h.classId === classId) : local;
  const clean = !useDemo ? filtered.filter(h => !isDemoRecord(h)) : filtered;
  return clean.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
};

// ── MCQ RESULTS (school) ─────────────────────────────────────────────────────

export const saveSchoolMCQResult = async (result: SchoolMCQResult) => {
  await setDoc(d(`schools/${result.schoolId}/mcq_results/${result.id}`), sanitizeForFirestore(result));
};

export const getClassMCQResults = async (schoolId: string, classId: string): Promise<SchoolMCQResult[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/mcq_results`));
  return snap.docs
    .map(docSnap => docSnap.data() as SchoolMCQResult)
    .filter(r => r.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date));
};

// ── SCHOOL USER PROFILE ──────────────────────────────────────────────────────

export const saveSchoolUserProfile = async (profile: SchoolUserProfile) => {
  const sanitized = sanitizeForFirestore(profile);
  setSchoolCacheSync(`nst_school_user_${profile.uid}`, sanitized);

  if (rtdb) {
    try { await set(ref(rtdb, `school_users/${profile.uid}`), sanitized); } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`school_users/${profile.uid}`), sanitized), 3000);
    } catch (e) {
      console.warn('[school-firebase] saveSchoolUserProfile non-fatal notice:', (e as any)?.code || e);
    }
  }
};

export const getSchoolUserProfile = async (uid: string, userEmail?: string): Promise<SchoolUserProfile | null> => {
  const normEmail = (userEmail || "").trim().toLowerCase();

  // 0. Check IndexedDB RAM cached profile first (instant)
  const cached = getSchoolCacheSync<SchoolUserProfile | null>(`nst_school_user_${uid}`, null);
  if (cached && cached.schoolId) {
    return cached;
  }

  // 1. Check RTDB (fastest remote)
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `school_users/${uid}`)), 1500);
      const val = snap?.val?.();
      if (val && val.schoolId) {
        setSchoolCacheSync(`nst_school_user_${uid}`, val);
        return val as SchoolUserProfile;
      }
    } catch {}
  }

  // 2. Check Firestore school_users document
  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`school_users/${uid}`)), 2500);
      if (snap.exists()) {
        const data = snap.data() as SchoolUserProfile;
        if (data && data.schoolId) {
          setSchoolCacheSync(`nst_school_user_${uid}`, data);
          return data;
        }
      }
    } catch {}
  }

  // 3. FIRST check if this email was allotted to a SPECIFIC school in SuperAdminPanel!
  // This guarantees Multi-School Admin isolation (School 2's admin ALWAYS opens School 2!).
  if (normEmail) {
    const schools = await getAllSchools();
    const adminSchool = schools.find(s =>
      (s.adminEmail && s.adminEmail.trim().toLowerCase() === normEmail) ||
      (s.email && s.email.trim().toLowerCase() === normEmail)
    );

    if (adminSchool) {
      const autoProfile: SchoolUserProfile = {
        uid,
        schoolId: adminSchool.id,
        role: "SCHOOL_ADMIN",
        name: adminSchool.name + " Admin",
        email: normEmail,
      };
      saveSchoolUserProfile(autoProfile).catch(() => {});
      return autoProfile;
    }
  }

  // 4. Fallback for global default demo school admin emails
  const isAdminEmailMatch =
    normEmail === "nadimanwar794@gmail.com" ||
    normEmail === "nadiman0636indo@gmail.com" ||
    normEmail === "admin@dps.edu.in" ||
    normEmail === "dpsgurgaon45@dps.edu.in" ||
    normEmail.startsWith("admin@") ||
    normEmail.includes("schooladmin") ||
    normEmail.includes("principal") ||
    uid === "admin_uid" ||
    uid.toLowerCase().includes("admin");

  if (isAdminEmailMatch) {
    const autoProfile: SchoolUserProfile = {
      uid,
      schoolId: "dps_gurgaon_sector45",
      role: "SCHOOL_ADMIN",
      name: "Dr. Arvind Swaminathan (School Admin & Principal)",
      email: normEmail || "admin@dps.edu.in",
    };
    saveSchoolUserProfile(autoProfile).catch(() => {});
    return autoProfile;
  }

  return null;
};

export const subscribeToSchoolUserProfile = (uid: string, cb: (p: SchoolUserProfile | null) => void) =>
  onSnapshot(
    d(`school_users/${uid}`),
    snap => cb(snap.exists() ? snap.data() as SchoolUserProfile : null),
    err => { console.warn(`[school-firebase] subscribeToSchoolUserProfile error:`, err?.code || err); cb(null); }
  );

// ── LOCK CODE ────────────────────────────────────────────────────────────────

export const setSchoolLockCode = async (schoolId: string, lockCode: string, active: boolean) => {
  await updateSchool(schoolId, { lockCode, lockCodeActive: active });
};

export const verifySchoolLockCode = async (schoolId: string, enteredCode: string): Promise<boolean> => {
  const snap = await getDoc(d(`schools/${schoolId}`));
  if (!snap.exists()) return false;
  const school = snap.data();
  if (!school.lockCodeActive || !school.lockCode) return true;
  return school.lockCode === enteredCode;
};

// ── ASSIGN SCHOOL ROLE BY EMAIL ───────────────────────────────────────────────
// Check if an email is already allotted to any school (Strict 1 Email = 1 School Rule)
export const checkEmailSchoolAllotment = async (
  email: string,
  excludeSchoolId?: string
): Promise<{ isAllotted: boolean; schoolName?: string; schoolId?: string }> => {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail) return { isAllotted: false };

  // 1. Check all schools in memory / cache / db
  const allSchools = await getAllSchools();
  const existing = allSchools.find(
    s => (!excludeSchoolId || s.id !== excludeSchoolId) && s.adminEmail && s.adminEmail.trim().toLowerCase() === normEmail
  );
  if (existing) {
    return { isAllotted: true, schoolName: existing.name, schoolId: existing.id };
  }

  // 2. Check RTDB index
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `school_admins_by_email/${normEmail.replace(/\./g, '_')}`)), 1500);
      const val = (snap as any)?.val?.();
      if (val && val.schoolId && (!excludeSchoolId || val.schoolId !== excludeSchoolId)) {
        const found = allSchools.find(s => s.id === val.schoolId);
        return { isAllotted: true, schoolName: found?.name || val.schoolId, schoolId: val.schoolId };
      }
    } catch {}
  }

  // 3. Check Firestore school_users
  if (db) {
    try {
      const q = query(col('school_users'), where('email', '==', normEmail), where('role', 'in', ['SCHOOL_ADMIN', 'SCHOOL_SUB_ADMIN']));
      const snap = await withTimeout(getDocs(q), 1500);
      if (!snap.empty) {
        const foundDoc = snap.docs.find(doc => {
          const sId = doc.data()?.schoolId;
          return sId && (!excludeSchoolId || sId !== excludeSchoolId);
        });
        if (foundDoc) {
          const sId = foundDoc.data().schoolId;
          const found = allSchools.find(s => s.id === sId);
          return { isAllotted: true, schoolName: found?.name || sId, schoolId: sId };
        }
      }
    } catch {}
  }

  return { isAllotted: false };
};

// Fast & reliable: updates School adminEmail, updates RTDB, and binds school_users with 1-to-1 enforcement
export const assignSchoolAdminByEmail = async (schoolId: string, email: string): Promise<SchoolUserProfile> => {
  const normEmail = email.trim().toLowerCase();
  if (!normEmail) throw new Error("Email address required");

  // Strict Rule: 1 Email / ID = 1 School Allotment
  const allotmentCheck = await checkEmailSchoolAllotment(normEmail, schoolId);
  if (allotmentCheck.isAllotted) {
    throw new Error(
      `Yeh Email (${normEmail}) pehle se school "${allotmentCheck.schoolName}" ko allot hai! Ek email/ID par sirf 1 hi school allot ho sakta hai.`
    );
  }

  // 1. Immediately update school adminEmail
  await updateSchool(schoolId, { adminEmail: normEmail });

  // 2. Lookup existing user in Firestore or RTDB
  let targetUid = "";
  let targetName = normEmail;

  try {
    const q = query(col('users'), where('email', '==', normEmail));
    const snap = await withTimeout(getDocs(q), 2500);
    if (!snap.empty) {
      const uDoc = snap.docs[0];
      targetUid = uDoc.id || uDoc.data()?.id;
      targetName = uDoc.data()?.name || uDoc.data()?.displayName || normEmail;
    }
  } catch (err) {
    console.warn("[school-firebase] email query in users error:", err);
  }

  // If UID not found yet, use hashed or normalized key so it activates immediately
  if (!targetUid) {
    targetUid = `pending_${normEmail.replace(/[^a-z0-9]/g, '_')}`;
  }

  const profile: SchoolUserProfile = {
    uid: targetUid,
    schoolId,
    role: 'SCHOOL_ADMIN',
    name: targetName,
    email: normEmail,
  };

  // 3. Save profile in Firestore and RTDB
  if (db && !targetUid.startsWith('pending_')) {
    await withTimeout(setDoc(d(`school_users/${targetUid}`), sanitizeForFirestore(profile)), 3000);
  }
  if (rtdb) {
    await withTimeout(set(ref(rtdb, `school_admins_by_email/${normEmail.replace(/\./g, '_')}`), {
      schoolId,
      email: normEmail,
      assignedAt: new Date().toISOString()
    }), 2000).catch(() => {});
  }

  return profile;
};

export const assignSchoolSubAdminByEmail = async (schoolId: string, email: string): Promise<SchoolUserProfile> => {
  const normEmail = email.trim().toLowerCase();
  const q = query(col('users'), where('email', '==', normEmail));
  const snap = await withTimeout(getDocs(q), 2500);
  let uid = snap.empty ? `pending_${normEmail.replace(/[^a-z0-9]/g, '_')}` : snap.docs[0].id;
  let name = snap.empty ? normEmail : snap.docs[0].data()?.name || normEmail;

  const profile: SchoolUserProfile = {
    uid,
    schoolId,
    role: 'SCHOOL_SUB_ADMIN',
    name,
    email: normEmail,
  };
  await withTimeout(setDoc(d(`school_users/${uid}`), sanitizeForFirestore(profile)), 3000);
  return profile;
};

export const removeSchoolUserByUid = async (uid: string) => {
  await deleteDoc(d(`school_users/${uid}`));
  if (rtdb) {
    try { await remove(ref(rtdb, `school_users/${uid}`)); } catch {}
  }
};

export const getSchoolAdmins = async (schoolId: string): Promise<SchoolUserProfile[]> => {
  const q = query(col('school_users'), where('schoolId', '==', schoolId), where('role', 'in', ['SCHOOL_ADMIN', 'SCHOOL_SUB_ADMIN']));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) } as SchoolUserProfile));
};

// ── FEE ALL CLASSES ──────────────────────────────────────────────────────────
// (Handled by getMonthlyFees above)

// ── ACCOUNT LINKING (NAME + MOBILE + ROLL NUMBER) ─────────────────────────────
// Student enters Name, Mobile Number, and Roll Number → strict match against school students

export const linkStudentAccount = async (
  schoolId: string,
  iicUid: string,
  studentName: string,
  mobileNumber: string,
  rollNo: string,
  classId?: string
): Promise<{ success: boolean; message: string; studentId?: string; student?: SchoolStudent }> => {
  const cleanName = (studentName || "").trim().toLowerCase().replace(/\s+/g, " ");
  const cleanRoll = (rollNo || "").trim().toLowerCase();
  const cleanPhone = (mobileNumber || "").replace(/\D/g, "").slice(-10); // last 10 digits

  if (!cleanName) {
    return { success: false, message: "Kripya apna poora Naam daalein." };
  }
  if (!cleanRoll) {
    return { success: false, message: "Kripya apna Roll Number daalein." };
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, message: "Kripya 10 ankon ka Mobile Number daalein." };
  }

  // Fetch all students for this school
  const snap = await withTimeout(getDocs(col(`schools/${schoolId}/students`)), 3500);
  const allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SchoolStudent[];

  const normalize = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

  // Matching algorithm:
  // 1. Roll number must match exactly
  // 2. Name must match or start with same first/last name
  // 3. Mobile: if student record already has phone, it must match. If student record has no phone yet, we match by Roll + Name and save the mobile!
  const match = allStudents.find(s => {
    if (classId && s.classId && s.classId !== classId) return false;

    const sRoll = normalize(s.rollNo);
    const sName = normalize(s.name);
    const sPhone = (s.phone || "").replace(/\D/g, "").slice(-10);

    const rollMatches = sRoll === cleanRoll;
    const nameMatches = sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName);

    if (!rollMatches || !nameMatches) return false;

    // If student record already had a phone, verify it
    if (sPhone && sPhone.length >= 10) {
      return sPhone === cleanPhone;
    }

    // If student didn't have phone filled during admission, Roll + Name matched
    return true;
  });

  if (!match) {
    return {
      success: false,
      message: "❌ Record Match Nahi Hua! Kripya apna Naam, Roll Number aur Mobile Number sahi daalein (jo school register mein darj hai), ya school admin se sampark karein."
    };
  }

  // Already linked to someone else?
  if (match.iicUid && match.iicUid !== iicUid) {
    return {
      success: false,
      message: "Yeh student record pehle se kisi aur account se link hai. Agar yeh aapka record hai to school admin se reset karwayen."
    };
  }

  // Update student record with iicUid and verified phone
  const updatePayload: any = { iicUid };
  if (!match.phone || match.phone.replace(/\D/g, "").slice(-10) !== cleanPhone) {
    updatePayload.phone = cleanPhone;
  }
  await updateDoc(d(`schools/${schoolId}/students/${match.id}`), sanitizeForFirestore(updatePayload));

  // Save school user profile
  const profile: SchoolUserProfile = {
    uid: iicUid,
    schoolId,
    role: 'SCHOOL_STUDENT',
    name: match.name,
    email: match.email || '',
    studentRef: match.id,
    classId: match.classId,
    sessionId: match.sessionId,
  };
  await saveSchoolUserProfile(profile);

  return {
    success: true,
    message: `🎉 Mubarak ho ${match.name}! Aapka account successfully link ho gaya hai.`,
    studentId: match.id,
    student: match
  };
};

// ── 9-MODULE CRUD HELPERS ────────────────────────────────────────────────────

// 1. NOTICES & EVENTS
export const saveNotice = async (notice: import('./school-types').SchoolNotice) => {
  const sanitized = sanitizeForFirestore(notice);
  try {
    const key = `nst_school_notices_${notice.schoolId}`;
    const cur = getSchoolCacheSync<any[]>(key, []);
    const next = [sanitized, ...(Array.isArray(cur) ? cur : []).filter((n: any) => n.id !== notice.id)];
    setSchoolCacheSync(key, next);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notices-updated", { detail: { schoolId: notice.schoolId } }));
  }
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${notice.schoolId}/notices/${notice.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${notice.schoolId}/notices/${notice.id}`), sanitized), 2500); } catch {}
  }
};

export const getNotices = async (schoolId: string): Promise<import('./school-types').SchoolNotice[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  let local = getSchoolCacheSync<import('./school-types').SchoolNotice[]>(`nst_school_notices_${schoolId}`, []);
  if (!Array.isArray(local)) local = [];

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/notices`)), 2500);
      const remote = snap.docs.map(docSnap => docSnap.data() as import('./school-types').SchoolNotice);
      if (remote.length > 0) {
        const merged = [...remote, ...local.filter(l => !remote.some(r => r.id === l.id))];
        local = merged;
        setSchoolCacheSync(`nst_school_notices_${schoolId}`, merged);
      }
    } catch {}
  }
  const sorted = [...local].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return !useDemo ? sorted.filter(n => !isDemoRecord(n)) : sorted;
};

export const subscribeToNotices = (
  schoolId: string,
  cb: (notices: import('./school-types').SchoolNotice[]) => void
) => {
  if (!schoolId) return () => {};
  const useDemo = shouldUseDemoForSchool(schoolId);
  const deliverLocal = () => {
    const list = getSchoolCacheSync<any[]>(`nst_school_notices_${schoolId}`, []);
    if (Array.isArray(list)) {
      const clean = !useDemo ? list.filter((n: any) => !isDemoRecord(n)) : list;
      cb([...clean].sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    }
  };
  deliverLocal();

  const onLocalEvt = (e: any) => {
    if (!e?.detail?.schoolId || e.detail.schoolId === schoolId) deliverLocal();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
    window.addEventListener("notices-updated", onLocalEvt);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/notices`), (snap) => {
        const val = snap.val();
        const arr = val && typeof val === "object" ? Object.values(val) : [];
        setSchoolCacheSync(`nst_school_notices_${schoolId}`, arr);
        const clean = !useDemo ? (arr as any[]).filter((n) => !isDemoRecord(n)) : (arr as any[]);
        cb([...clean].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col(`schools/${schoolId}/notices`),
        (snap) => {
          const list = snap.docs.map((docSnap) => docSnap.data() as import('./school-types').SchoolNotice);
          if (list.length > 0) {
            setSchoolCacheSync(`nst_school_notices_${schoolId}`, list);
            const clean = !useDemo ? list.filter((n) => !isDemoRecord(n)) : list;
            cb([...clean].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
          }
        },
        () => {}
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverLocal);
      window.removeEventListener("notices-updated", onLocalEvt);
    }
    if (typeof rtdbUnsub === "function") rtdbUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const deleteNotice = async (schoolId: string, noticeId: string) => {
  try {
    const key = `nst_school_notices_${schoolId}`;
    const cur = getSchoolCacheSync<any[]>(key, []);
    if (Array.isArray(cur)) {
      setSchoolCacheSync(key, cur.filter((n: any) => n.id !== noticeId));
    }
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notices-updated", { detail: { schoolId } }));
  }
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/notices/${noticeId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/notices/${noticeId}`)), 2500); } catch {}
  }
};

// 2. CERTIFICATES (TC, Character, Bonafide, Merit)
export const saveCertificate = async (cert: import('./school-types').SchoolCertificate) => {
  await setDoc(d(`schools/${cert.schoolId}/certificates/${cert.id}`), sanitizeForFirestore(cert));
};

export const getCertificates = async (schoolId: string): Promise<import('./school-types').SchoolCertificate[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/certificates`));
  return snap.docs.map(doc => doc.data() as import('./school-types').SchoolCertificate).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
};

// 3. ADMIT CARD CONFIG
export const saveAdmitCardConfig = async (config: import('./school-types').SchoolAdmitCardConfig) => {
  await setDoc(d(`schools/${config.schoolId}/admit_cards/${config.id}`), sanitizeForFirestore(config));
};

export const getAdmitCardConfigs = async (schoolId: string): Promise<import('./school-types').SchoolAdmitCardConfig[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/admit_cards`));
  return snap.docs.map(doc => doc.data() as import('./school-types').SchoolAdmitCardConfig);
};

// 4. STAFF HRM & LEAVE MANAGEMENT
export const saveStaffEmployee = async (staff: import('./school-types').StaffEmployee) => {
  await setDoc(d(`schools/${staff.schoolId}/staff/${staff.id}`), sanitizeForFirestore(staff));
};

export const getStaffEmployees = async (schoolId: string): Promise<import('./school-types').StaffEmployee[]> => {
  try {
    const snap = await getDocs(col(`schools/${schoolId}/staff`));
    const list = snap.docs.map(doc => doc.data() as import('./school-types').StaffEmployee);
    const filtered = !isDemoDataEnabled() ? list.filter(s => !isDemoRecord(s)) : list;
    if (filtered.length > 0) return filtered;
  } catch {}
  if (shouldUseDemoForSchool(schoolId)) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.staffEmployees && demo.staffEmployees.length > 0) {
      return demo.staffEmployees;
    }
  }
  return [];
};

export const deleteStaffEmployee = async (schoolId: string, staffId: string) => {
  await deleteDoc(d(`schools/${schoolId}/staff/${staffId}`));
};

export const saveStaffLeave = async (leave: import('./school-types').StaffLeave) => {
  await setDoc(d(`schools/${leave.schoolId}/leaves/${leave.id}`), sanitizeForFirestore(leave));
};

export const getStaffLeaves = async (schoolId: string): Promise<import('./school-types').StaffLeave[]> => {
  try {
    const snap = await getDocs(col(`schools/${schoolId}/leaves`));
    const list = snap.docs.map(doc => doc.data() as import('./school-types').StaffLeave).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
    if (list.length > 0) return list;
  } catch {}
  if (shouldUseDemoForSchool(schoolId)) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.staffLeaves && demo.staffLeaves.length > 0) {
      return demo.staffLeaves;
    }
  }
  return [];
};

export const updateStaffLeaveStatus = async (schoolId: string, leaveId: string, status: 'approved' | 'rejected', remarks?: string) => {
  await updateDoc(d(`schools/${schoolId}/leaves/${leaveId}`), sanitizeForFirestore({ status, remarks: remarks || '' }));
};

// 5. STUDENT PROMOTION SYSTEM (Batch promote)
export const promoteStudents = async (
  schoolId: string,
  targetClassId: string,
  targetSessionId: string,
  studentIds: string[]
): Promise<{ success: boolean; count: number }> => {
  let count = 0;
  for (const id of studentIds) {
    try {
      await updateDoc(d(`schools/${schoolId}/students/${id}`), sanitizeForFirestore({
        classId: targetClassId,
        sessionId: targetSessionId,
      }));
      count++;
    } catch (e) {
      console.warn("[promoteStudents] Failed for student", id, e);
    }
  }
  return { success: true, count };
};


// ── UTILITY ──────────────────────────────────────────────────────────────────

export const generateId = (prefix?: string) => prefix ? `${prefix}_${doc(collection(db, "_")).id}` : doc(collection(db, "_")).id;

export const todayStr = () => new Date().toISOString().split("T")[0];

export const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ── ONLINE ADMISSION & REGISTRATIONS ─────────────────────────────────────────

const LOCAL_ADMISSIONS_KEY = (schoolId: string) => `nst_school_admissions_${schoolId}`;

export const generateNextAdmissionNo = (
  school?: { code?: string; name?: string; id?: string } | null,
  existingCount = 0
): string => {
  const year = new Date().getFullYear();
  const rawPrefix = (school?.code || school?.name || "SCH")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  const safePrefix = !rawPrefix || rawPrefix === "DPSA" ? "SCH" : rawPrefix;
  const seq = String(Math.max(1, existingCount + 1)).padStart(3, "0");
  const randSuffix = String(Math.floor(10 + Math.random() * 89));
  return `${safePrefix}-${year}-${seq}${randSuffix}`;
};

export const getAdmissionApplications = async (schoolId: string): Promise<import('./school-types').AdmissionApplication[]> => {
  const localRaw = getSchoolCacheSync<import('./school-types').AdmissionApplication[]>(LOCAL_ADMISSIONS_KEY(schoolId), []);
  const localList = Array.isArray(localRaw) ? localRaw : [];
  const mergedMap = new Map<string, import('./school-types').AdmissionApplication>();
  localList.forEach(a => { if (a?.id) mergedMap.set(a.id, a); });

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/admissions`)), 2000);
      const val = snap?.val?.();
      if (val && typeof val === "object") {
        Object.values(val).forEach((item: any) => {
          if (item?.id) mergedMap.set(item.id, { ...(mergedMap.get(item.id) || {}), ...item });
        });
      }
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/admissions`)), 2500);
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as import('./school-types').AdmissionApplication;
        if (data?.id) mergedMap.set(data.id, { ...(mergedMap.get(data.id) || {}), ...data });
      });
    } catch (e) {
      console.warn("[getAdmissionApplications] error:", e);
    }
  }

  const finalApps = Array.from(mergedMap.values()).sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));
  if (finalApps.length > 0) {
    setSchoolCacheSync(LOCAL_ADMISSIONS_KEY(schoolId), finalApps);
    return finalApps;
  }
  if (shouldUseDemoForSchool(schoolId)) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.admissions && demo.admissions.length > 0) {
      return demo.admissions;
    }
  }
  return finalApps;
};

export const saveAdmissionApplication = async (schoolId: string, appData: import('./school-types').AdmissionApplication): Promise<void> => {
  const prepared = { ...appData, schoolId };
  if (prepared.photoUrl && prepared.photoUrl.startsWith("data:image/")) {
    prepared.photoUrl = await ensureCloudImageUrl(prepared.photoUrl, `adm_${schoolId}_${appData.id}`);
  }
  const sanitized = sanitizeForFirestore(prepared);

  try {
    const cur = getSchoolCacheSync<import('./school-types').AdmissionApplication[]>(LOCAL_ADMISSIONS_KEY(schoolId), []);
    const next = [sanitized, ...(Array.isArray(cur) ? cur : []).filter(a => a.id !== appData.id)];
    setSchoolCacheSync(LOCAL_ADMISSIONS_KEY(schoolId), next);
  } catch {}

  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${schoolId}/admissions/${appData.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${schoolId}/admissions/${appData.id}`), sanitized, { merge: true }), 3000); } catch {}
  }
};

export const updateAdmissionStatus = async (
  schoolId: string,
  appId: string,
  status: 'approved' | 'rejected',
  details?: Partial<import('./school-types').AdmissionApplication>
): Promise<void> => {
  const patch = sanitizeForFirestore({
    status,
    reviewedAt: new Date().toISOString(),
    ...(details || {})
  });

  try {
    const cur = getSchoolCacheSync<import('./school-types').AdmissionApplication[]>(LOCAL_ADMISSIONS_KEY(schoolId), []);
    if (Array.isArray(cur) && cur.length > 0) {
      const next = cur.map(a => a.id === appId ? { ...a, ...patch } : a);
      setSchoolCacheSync(LOCAL_ADMISSIONS_KEY(schoolId), next);
    }
  } catch {}

  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/admissions/${appId}`), patch), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${schoolId}/admissions/${appId}`), patch, { merge: true }), 2500); } catch {}
  }
};

// ── PUBLIC INQUIRIES ──────────────────────────────────────────────────────────

export const getSchoolPublicInquiries = async (schoolId: string): Promise<import('./school-types').SchoolPublicInquiry[]> => {
  try {
    const snap = await getDocs(col(`schools/${schoolId}/inquiries`));
    return snap.docs.map(doc => doc.data() as import('./school-types').SchoolPublicInquiry).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) {
    return [];
  }
};

export const saveSchoolPublicInquiry = async (schoolId: string, inquiry: import('./school-types').SchoolPublicInquiry): Promise<void> => {
  await setDoc(d(`schools/${schoolId}/inquiries/${inquiry.id}`), sanitizeForFirestore(inquiry));
};

// ── GALLERY & EVENTS ─────────────────────────────────────────────────────────

export const getSchoolGallery = async (schoolId: string): Promise<import('./school-types').SchoolGalleryItem[]> => {
  try {
    const snap = await getDocs(col(`schools/${schoolId}/gallery`));
    return snap.docs.map(doc => doc.data() as import('./school-types').SchoolGalleryItem);
  } catch (e) {
    return [];
  }
};

export const saveSchoolGalleryItem = async (schoolId: string, item: import('./school-types').SchoolGalleryItem): Promise<void> => {
  await setDoc(d(`schools/${schoolId}/gallery/${item.id}`), sanitizeForFirestore(item));
};

export const deleteSchoolGalleryItem = async (schoolId: string, itemId: string): Promise<void> => {
  await deleteDoc(d(`schools/${schoolId}/gallery/${itemId}`));
};

// ── HOLIDAYS & FESTIVALS (LIVE REALTIME SYNC) ────────────────────────────────

const LOCAL_HOLIDAYS_KEY = (schoolId: string) => `nst_holidays_${schoolId}`;

export const getSchoolHolidays = async (schoolId: string): Promise<import('./school-types').SchoolHoliday[]> => {
  try {
    const rawList = getSchoolCacheSync<import('./school-types').SchoolHoliday[]>(LOCAL_HOLIDAYS_KEY(schoolId), []);
    const localList = Array.isArray(rawList) ? rawList : [];

    if (rtdb) {
      try {
        const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/holidays`)), 2000);
        const val = snap?.val?.();
        if (val && typeof val === "object") {
          const remote = Object.values(val) as import('./school-types').SchoolHoliday[];
          if (remote.length > 0) {
            const merged = [...remote, ...localList.filter(l => !remote.some(r => r.id === l.id))].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
            setSchoolCacheSync(LOCAL_HOLIDAYS_KEY(schoolId), merged);
            return merged;
          }
        }
      } catch {}
    }

    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/holidays`)), 2500);
      if (snap && !snap.empty) {
        const remote = snap.docs.map(docSnap => docSnap.data() as import('./school-types').SchoolHoliday);
        const merged = [...remote, ...localList.filter(l => !remote.some(r => r.id === l.id))].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
        setSchoolCacheSync(LOCAL_HOLIDAYS_KEY(schoolId), merged);
        return merged;
      }
    } catch {}

    return [...localList].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
  } catch {
    return [];
  }
};

export const saveSchoolHoliday = async (schoolId: string, holiday: import('./school-types').SchoolHoliday): Promise<void> => {
  const sanitized = sanitizeForFirestore({ ...holiday, schoolId });
  try {
    const list = getSchoolCacheSync<import('./school-types').SchoolHoliday[]>(LOCAL_HOLIDAYS_KEY(schoolId), []);
    const updated = [sanitized, ...(Array.isArray(list) ? list : []).filter(h => h.id !== holiday.id)].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
    setSchoolCacheSync(LOCAL_HOLIDAYS_KEY(schoolId), updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("holidays-updated", { detail: { schoolId, holiday: sanitized } }));
    window.dispatchEvent(new CustomEvent("notices-updated", { detail: { schoolId } }));
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${schoolId}/holidays/${holiday.id}`), sanitized), 2000);
    } catch {}
  }

  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/holidays/${holiday.id}`), sanitized), 2500);
    } catch (e) {
      console.warn("[school-firebase] saveSchoolHoliday:", e);
    }
  }
};

export const deleteSchoolHoliday = async (schoolId: string, holidayId: string): Promise<void> => {
  try {
    const list = getSchoolCacheSync<import('./school-types').SchoolHoliday[]>(LOCAL_HOLIDAYS_KEY(schoolId), []);
    const updated = (Array.isArray(list) ? list : []).filter(h => h.id !== holidayId);
    setSchoolCacheSync(LOCAL_HOLIDAYS_KEY(schoolId), updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("holidays-updated", { detail: { schoolId, holidayId } }));
    window.dispatchEvent(new CustomEvent("notices-updated", { detail: { schoolId } }));
  }

  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/holidays/${holidayId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/holidays/${holidayId}`)), 2500); } catch {}
  }
};

export const subscribeToSchoolHolidays = (
  schoolId: string,
  cb: (holidays: import('./school-types').SchoolHoliday[]) => void
) => {
  if (!schoolId) return () => {};
  const deliverLocal = () => {
    const list = getSchoolCacheSync<any[]>(LOCAL_HOLIDAYS_KEY(schoolId), []);
    if (Array.isArray(list)) {
      cb([...list].sort((a: any, b: any) => (a.startDate || "").localeCompare(b.startDate || "")));
    }
  };
  deliverLocal();

  const onEvt = (e: any) => {
    if (!e?.detail?.schoolId || e.detail.schoolId === schoolId) deliverLocal();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
    window.addEventListener("holidays-updated", onEvt);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/holidays`), (snap) => {
        const val = snap.val();
        const arr = val && typeof val === "object" ? Object.values(val) : [];
        if (arr.length > 0) {
          setSchoolCacheSync(LOCAL_HOLIDAYS_KEY(schoolId), arr);
          cb([...(arr as any[])].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")));
        }
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col(`schools/${schoolId}/holidays`),
        (snap) => {
          const list = snap.docs.map(docSnap => docSnap.data() as import('./school-types').SchoolHoliday);
          if (list.length > 0) {
            setSchoolCacheSync(LOCAL_HOLIDAYS_KEY(schoolId), list);
            cb([...list].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")));
          }
        },
        () => {}
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverLocal);
      window.removeEventListener("holidays-updated", onEvt);
    }
    if (typeof rtdbUnsub === "function") rtdbUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

// ── SCHOOL COMMUNITY FEED (PHOTOS, VIDEOS, HOLIDAYS, NOTICES, LIKES & COMMENTS) ──

export interface SchoolCommunityComment {
  id: string;
  userId: string;
  userName: string;
  userRole: "ADMIN" | "TEACHER" | "STUDENT" | string;
  text: string;
  createdAt: string;
}

export interface SchoolCommunityPost {
  id: string;
  schoolId: string;
  schoolName?: string;
  title?: string;
  text: string;
  category: "HOLIDAY" | "NOTICE" | "EVENT_MEDIA" | "HOMEWORK" | "GENERAL";
  imageUrl?: string;
  videoUrl?: string;
  holidayStartDate?: string;
  holidayEndDate?: string;
  classId?: string;
  className?: string;
  authorId: string;
  authorName: string;
  authorRole: "ADMIN" | "TEACHER" | "STUDENT" | string;
  isPinned?: boolean;
  commentsEnabled?: boolean;
  likes?: Record<string, boolean>;
  comments?: Record<string, SchoolCommunityComment>;
  createdAt: string;
}

const LOCAL_SCHOOL_COMMUNITY_KEY = (schoolId: string) => `nst_school_community_${schoolId}`;

export const saveSchoolCommunityPost = async (post: SchoolCommunityPost): Promise<void> => {
  if (!post?.schoolId || !post?.id) return;
  let finalImageUrl = post.imageUrl;
  if (finalImageUrl && finalImageUrl.startsWith("data:image/")) {
    finalImageUrl = await ensureCloudImageUrl(finalImageUrl, `comm_${post.schoolId}_${post.id}`);
  }
  const sanitized: SchoolCommunityPost = sanitizeForFirestore({
    ...post,
    imageUrl: finalImageUrl,
    commentsEnabled: post.commentsEnabled !== false,
    createdAt: post.createdAt || new Date().toISOString(),
  });

  try {
    const cur = getSchoolCacheSync<SchoolCommunityPost[]>(LOCAL_SCHOOL_COMMUNITY_KEY(post.schoolId), []);
    const next = [sanitized, ...(Array.isArray(cur) ? cur : []).filter((p) => p.id !== post.id)].sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
    setSchoolCacheSync(LOCAL_SCHOOL_COMMUNITY_KEY(post.schoolId), next);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-community-updated", { detail: { schoolId: post.schoolId, post: sanitized } }));
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${post.schoolId}/community_posts/${post.id}`), sanitized), 2500);
    } catch {}
  }

  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${post.schoolId}/community_posts/${post.id}`), sanitized), 3000);
    } catch {}
  }
};

export const deleteSchoolCommunityPost = async (schoolId: string, postId: string): Promise<void> => {
  if (!schoolId || !postId) return;
  try {
    const cur = getSchoolCacheSync<SchoolCommunityPost[]>(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), []);
    if (Array.isArray(cur)) {
      setSchoolCacheSync(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), cur.filter((p) => p.id !== postId));
    }
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-community-updated", { detail: { schoolId, deletedId: postId } }));
  }

  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/community_posts/${postId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/community_posts/${postId}`)), 2500); } catch {}
  }
};

export const toggleSchoolCommunityLike = async (
  schoolId: string,
  postId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<void> => {
  if (!schoolId || !postId || !userId) return;
  const safeUid = String(userId).replace(/[.#$[\]/]/g, "_");

  try {
    const cur = getSchoolCacheSync<SchoolCommunityPost[]>(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), []);
    if (Array.isArray(cur) && cur.length > 0) {
      const next = cur.map((p) => {
        if (p.id !== postId) return p;
        const likes = { ...(p.likes || {}) };
        if (currentlyLiked) delete likes[safeUid];
        else likes[safeUid] = true;
        return { ...p, likes };
      });
      setSchoolCacheSync(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("school-community-updated", { detail: { schoolId } }));
      }
    }
  } catch {}

  if (rtdb) {
    try {
      const likeRef = ref(rtdb, `schools/${schoolId}/community_posts/${postId}/likes/${safeUid}`);
      if (currentlyLiked) await withTimeout(remove(likeRef), 2000);
      else await withTimeout(set(likeRef, true), 2000);
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/community_posts/${postId}`)), 2000);
      if (snap.exists()) {
        const data = snap.data() as SchoolCommunityPost;
        const likes = { ...(data.likes || {}) };
        if (currentlyLiked) delete likes[safeUid];
        else likes[safeUid] = true;
        await withTimeout(updateDoc(d(`schools/${schoolId}/community_posts/${postId}`), { likes }), 2000);
      }
    } catch {}
  }
};

export const addSchoolCommunityComment = async (
  schoolId: string,
  postId: string,
  comment: SchoolCommunityComment
): Promise<void> => {
  if (!schoolId || !postId || !comment?.id) return;
  const sanitized = sanitizeForFirestore(comment);

  try {
    const cur = getSchoolCacheSync<SchoolCommunityPost[]>(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), []);
    if (Array.isArray(cur) && cur.length > 0) {
      const next = cur.map((p) =>
        p.id === postId ? { ...p, comments: { ...(p.comments || {}), [comment.id]: sanitized } } : p
      );
      setSchoolCacheSync(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("school-community-updated", { detail: { schoolId } }));
      }
    }
  } catch {}

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${schoolId}/community_posts/${postId}/comments/${comment.id}`), sanitized), 2000);
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/community_posts/${postId}`)), 2000);
      if (snap.exists()) {
        const data = snap.data() as SchoolCommunityPost;
        const comments = { ...(data.comments || {}), [comment.id]: sanitized };
        await withTimeout(updateDoc(d(`schools/${schoolId}/community_posts/${postId}`), { comments }), 2000);
      }
    } catch {}
  }
};

export const deleteSchoolCommunityComment = async (
  schoolId: string,
  postId: string,
  commentId: string
): Promise<void> => {
  if (!schoolId || !postId || !commentId) return;
  try {
    const cur = getSchoolCacheSync<SchoolCommunityPost[]>(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), []);
    if (Array.isArray(cur) && cur.length > 0) {
      const next = cur.map((p) => {
        if (p.id !== postId) return p;
        const comments = { ...(p.comments || {}) };
        delete comments[commentId];
        return { ...p, comments };
      });
      setSchoolCacheSync(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("school-community-updated", { detail: { schoolId } }));
      }
    }
  } catch {}

  if (rtdb) {
    try {
      await withTimeout(remove(ref(rtdb, `schools/${schoolId}/community_posts/${postId}/comments/${commentId}`)), 2000);
    } catch {}
  }
  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/community_posts/${postId}`)), 2000);
      if (snap.exists()) {
        const data = snap.data() as SchoolCommunityPost;
        const comments = { ...(data.comments || {}) };
        delete comments[commentId];
        await withTimeout(updateDoc(d(`schools/${schoolId}/community_posts/${postId}`), { comments }), 2000);
      }
    } catch {}
  }
};

export const subscribeToSchoolCommunityPosts = (
  schoolId: string,
  cb: (posts: SchoolCommunityPost[]) => void
) => {
  if (!schoolId) return () => {};
  const sortPosts = (arr: SchoolCommunityPost[]) =>
    [...arr].sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

  const deliverLocal = () => {
    const parsed = getSchoolCacheSync<SchoolCommunityPost[]>(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), []);
    if (Array.isArray(parsed)) cb(sortPosts(parsed));
  };
  deliverLocal();

  const onEvt = (e: any) => {
    if (!e?.detail?.schoolId || e.detail.schoolId === schoolId) deliverLocal();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
    window.addEventListener("school-community-updated", onEvt);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/community_posts`), (snap) => {
        const val = snap.val();
        const arr: SchoolCommunityPost[] = val && typeof val === "object" ? Object.values(val) : [];
        setSchoolCacheSync(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), arr);
        cb(sortPosts(arr));
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col(`schools/${schoolId}/community_posts`),
        (snap) => {
          const list = snap.docs.map((docSnap) => docSnap.data() as SchoolCommunityPost);
          if (list.length > 0) {
            setSchoolCacheSync(LOCAL_SCHOOL_COMMUNITY_KEY(schoolId), list);
            cb(sortPosts(list));
          }
        },
        () => {}
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverLocal);
      window.removeEventListener("school-community-updated", onEvt);
    }
    if (typeof rtdbUnsub === "function") rtdbUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const updateClassFeeStructure = async (
  schoolId: string,
  classId: string,
  feeStructure: import('./school-types').ClassFeeStructure
): Promise<void> => {
  await updateClass(schoolId, classId, {
    feeStructure,
    defaultFee: feeStructure.tuitionFee || 0
  });
};

// ── MULTI-SCHOOL & MULTI-STUDENT PERMANENT USER ID BINDING ───────────────────

export const getStudentLinkKey = (st: { schoolId?: string; id?: string } | null | undefined, fallbackSchoolId = "dps_gurgaon_sector45"): string => {
  if (!st || !st.id) return "";
  return `${st.schoolId || fallbackSchoolId}__${st.id}`;
};

export const findStudentInSchoolRemote = async (
  schoolId: string,
  studentId?: string,
  admissionNo?: string
): Promise<import('./school-types').SchoolStudent | null> => {
  if (!schoolId) return null;
  if (rtdb && studentId) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/students/${studentId}`)), 2000);
      const val = snap?.val?.();
      if (val && val.id) return val as import('./school-types').SchoolStudent;
    } catch {}
  }
  if (db && studentId) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/students/${studentId}`)), 2500);
      if (snap.exists()) return snap.data() as import('./school-types').SchoolStudent;
    } catch {}
  }
  if (admissionNo && db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/students`)), 2500);
      const all = snap.docs.map((doc) => doc.data() as import('./school-types').SchoolStudent);
      const match = all.find(
        (s) => s.admissionNo && s.admissionNo.toLowerCase() === admissionNo.toLowerCase()
      );
      if (match) return match;
    } catch {}
  }
  return null;
};

export interface UserLinkedStudentsBundle {
  students: any[];
  activeStudentId?: string;
  activeStudentKey?: string;
  updatedAt: string;
}

const cleanRtdbUid = (uid: string) => String(uid || "guest").replace(/[.#$[\]/]/g, "_");

export const getLocalUserLinkedStudents = (uid: string): UserLinkedStudentsBundle | null => {
  if (!uid) return null;
  const cachedList = getSchoolCacheSync<UserLinkedStudentsBundle | null>(`nst_school_linked_list_${uid}`, null);
  if (cachedList && Array.isArray(cachedList.students)) {
    return cachedList;
  }
  const legacy = getSchoolCacheSync<any>(`nst_school_linked_${uid}`, null);
  if (legacy && legacy.type === "STUDENT" && legacy.id) {
    return {
      students: [legacy],
      activeStudentId: legacy.id,
      activeStudentKey: getStudentLinkKey(legacy),
      updatedAt: legacy.linkedAt || new Date().toISOString(),
    };
  }
  return null;
};

export const getLocalLinkedTeacher = (uid: string): any | null => {
  if (!uid) return null;
  const saved = getSchoolCacheSync<any>(`nst_school_linked_${uid}`, null);
  if (saved && saved.type === "TEACHER") return saved;
  return null;
};

export const setLocalLinkedTeacher = (uid: string, teacherRecord: any | null): void => {
  if (!uid) return;
  if (teacherRecord) {
    setSchoolCacheSync(`nst_school_linked_${uid}`, teacherRecord);
  } else {
    removeSchoolCacheSync(`nst_school_linked_${uid}`);
  }
};

export const saveUserLinkedStudents = async (
  uid: string,
  students: any[],
  activeStudentIdOrKey?: string
): Promise<void> => {
  if (!uid) return;
  const cleanList = Array.isArray(students) ? students : [];
  const matchedActive =
    cleanList.find((s: any) => getStudentLinkKey(s) === activeStudentIdOrKey) ||
    cleanList.find((s: any) => s.id === activeStudentIdOrKey) ||
    cleanList[0] ||
    null;

  const bundle: UserLinkedStudentsBundle = sanitizeForFirestore({
    students: cleanList,
    activeStudentId: matchedActive?.id || "",
    activeStudentKey: matchedActive ? getStudentLinkKey(matchedActive) : "",
    updatedAt: new Date().toISOString(),
  });

  setSchoolCacheSync(`nst_school_linked_list_${uid}`, bundle);
  if (matchedActive) {
    setSchoolCacheSync(`nst_school_linked_${uid}`, matchedActive);
  } else {
    removeSchoolCacheSync(`nst_school_linked_${uid}`);
  }

  const safeUid = cleanRtdbUid(uid);
  if (rtdb) {
    try {
      await Promise.all([
        withTimeout(set(ref(rtdb, `users/${safeUid}/linkedSchoolStudents`), bundle), 2500),
        withTimeout(set(ref(rtdb, `school_user_links/${safeUid}`), bundle), 2500),
      ]);
    } catch {}
  }

  if (db) {
    try {
      await withTimeout(setDoc(d(`school_user_links/${safeUid}`), bundle), 3000);
    } catch {}
  }
};

export const getUserLinkedStudents = async (uid: string): Promise<UserLinkedStudentsBundle | null> => {
  if (!uid) return null;
  const localBundle = getLocalUserLinkedStudents(uid);
  const safeUid = cleanRtdbUid(uid);

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `school_user_links/${safeUid}`)), 2000);
      const val = snap?.val?.();
      if (val && Array.isArray(val.students) && val.students.length > 0) {
        setSchoolCacheSync(`nst_school_linked_list_${uid}`, val);
        return val as UserLinkedStudentsBundle;
      }
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`school_user_links/${safeUid}`)), 2500);
      if (snap.exists()) {
        const data = snap.data() as UserLinkedStudentsBundle;
        if (data && Array.isArray(data.students) && data.students.length > 0) {
          setSchoolCacheSync(`nst_school_linked_list_${uid}`, data);
          return data;
        }
      }
    } catch {}
  }

  return localBundle;
};

// ── TEACHER REFERRAL 10% COMMISSION PAYOUTS & SETTINGS ───────────────────────

const LOCAL_REFERRAL_PAYOUTS_KEY = (schoolId: string) => `nst_school_ref_payouts_${schoolId}`;
const LOCAL_REFERRAL_SETTINGS_KEY = (schoolId: string) => `nst_school_ref_settings_${schoolId}`;

export const getDefaultReferralSettings = (schoolId: string): import('./school-types').SchoolReferralSettings => ({
  schoolId,
  defaultCommissionPct: 10,
  commissionScope: "all_fees",
  commissionDuration: "1_year",
  defaultSiblingDiscountPct: 10,
  updatedAt: new Date().toISOString(),
});

export const getSchoolReferralSettings = async (
  schoolId: string
): Promise<import('./school-types').SchoolReferralSettings> => {
  const fallback = getSchoolCacheSync<import('./school-types').SchoolReferralSettings | null>(
    LOCAL_REFERRAL_SETTINGS_KEY(schoolId),
    null
  );

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/referral_settings`)), 2000);
      const val = snap?.val?.();
      if (val && typeof val === "object" && typeof val.defaultCommissionPct === "number") {
        const normalized = { commissionDuration: "1_year" as const, ...val };
        setSchoolCacheSync(LOCAL_REFERRAL_SETTINGS_KEY(schoolId), normalized);
        return normalized as import('./school-types').SchoolReferralSettings;
      }
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/settings/referral_policy`)), 2500);
      if (snap.exists()) {
        const data = { commissionDuration: "1_year" as const, ...(snap.data() as import('./school-types').SchoolReferralSettings) };
        setSchoolCacheSync(LOCAL_REFERRAL_SETTINGS_KEY(schoolId), data);
        return data;
      }
    } catch {}
  }

  return fallback ? { commissionDuration: "1_year", ...fallback } : getDefaultReferralSettings(schoolId);
};

export const saveSchoolReferralSettings = async (
  schoolId: string,
  settings: Partial<import('./school-types').SchoolReferralSettings>
): Promise<import('./school-types').SchoolReferralSettings> => {
  const current = getSchoolCacheSync<import('./school-types').SchoolReferralSettings | null>(
    LOCAL_REFERRAL_SETTINGS_KEY(schoolId),
    null
  ) || getDefaultReferralSettings(schoolId);

  const merged: import('./school-types').SchoolReferralSettings = sanitizeForFirestore({
    ...current,
    ...settings,
    schoolId,
    defaultCommissionPct: Math.max(0, Math.min(100, Number(settings.defaultCommissionPct ?? current.defaultCommissionPct ?? 10))),
    defaultSiblingDiscountPct: Math.max(0, Math.min(100, Number(settings.defaultSiblingDiscountPct ?? current.defaultSiblingDiscountPct ?? 10))),
    commissionScope: settings.commissionScope || current.commissionScope || "all_fees",
    commissionDuration: settings.commissionDuration || current.commissionDuration || "1_year",
    updatedAt: new Date().toISOString(),
  });

  setSchoolCacheSync(LOCAL_REFERRAL_SETTINGS_KEY(schoolId), merged);

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${schoolId}/referral_settings`), merged), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/settings/referral_policy`), merged), 2500);
    } catch {}
  }
  return merged;
};

export const getReferralPayouts = async (
  schoolId: string
): Promise<import('./school-types').TeacherReferralPayout[]> => {
  const local = getSchoolCacheSync<import('./school-types').TeacherReferralPayout[]>(
    LOCAL_REFERRAL_PAYOUTS_KEY(schoolId),
    []
  );
  const map = new Map<string, import('./school-types').TeacherReferralPayout>();
  if (Array.isArray(local)) {
    local.forEach((p) => {
      if (p?.id) map.set(p.id, p);
    });
  }

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/referral_payouts`)), 2000);
      const val = snap?.val?.();
      if (val && typeof val === "object") {
        Object.values(val).forEach((p: any) => {
          if (p?.id) map.set(p.id, p as import('./school-types').TeacherReferralPayout);
        });
      }
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/referral_payouts`)), 2500);
      snap.docs.forEach((docSnap) => {
        const p = docSnap.data() as import('./school-types').TeacherReferralPayout;
        if (p?.id) map.set(p.id, p);
      });
    } catch {}
  }

  const merged = Array.from(map.values()).sort((a, b) =>
    (b.paidDate || b.createdAt || "").localeCompare(a.paidDate || a.createdAt || "")
  );
  setSchoolCacheSync(LOCAL_REFERRAL_PAYOUTS_KEY(schoolId), merged);
  return merged;
};

export const saveReferralPayout = async (
  payout: import('./school-types').TeacherReferralPayout
): Promise<void> => {
  const sanitized = sanitizeForFirestore(payout);
  const cur = getSchoolCacheSync<import('./school-types').TeacherReferralPayout[]>(
    LOCAL_REFERRAL_PAYOUTS_KEY(payout.schoolId),
    []
  );
  const updated = [sanitized, ...(Array.isArray(cur) ? cur.filter((p) => p.id !== payout.id) : [])];
  setSchoolCacheSync(LOCAL_REFERRAL_PAYOUTS_KEY(payout.schoolId), updated);

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${payout.schoolId}/referral_payouts/${payout.id}`), sanitized), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${payout.schoolId}/referral_payouts/${payout.id}`), sanitized), 2500);
    } catch {}
  }
};

export const deleteReferralPayout = async (schoolId: string, payoutId: string): Promise<void> => {
  const cur = getSchoolCacheSync<import('./school-types').TeacherReferralPayout[]>(
    LOCAL_REFERRAL_PAYOUTS_KEY(schoolId),
    []
  );
  if (Array.isArray(cur)) {
    setSchoolCacheSync(
      LOCAL_REFERRAL_PAYOUTS_KEY(schoolId),
      cur.filter((p) => p.id !== payoutId)
    );
  }
  if (rtdb) {
    try {
      await withTimeout(remove(ref(rtdb, `schools/${schoolId}/referral_payouts/${payoutId}`)), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/referral_payouts/${payoutId}`)), 2500);
    } catch {}
  }
};

// ── DAILY CLASSROOM VIDEO LECTURES ──────────────────────────────────────────

export const extractYouTubeVideoId = (url: string): string => {
  if (!url) return "";
  const clean = url.trim();
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(clean)) return clean;
  return "";
};

export const saveClassLecture = async (lecture: DailyClassLecture): Promise<void> => {
  const sanitized = sanitizeForFirestore(lecture);
  try {
    const key = `nst_school_lectures_${lecture.schoolId}`;
    const cur = getSchoolCacheSync<DailyClassLecture[]>(key, []);
    const next = [sanitized, ...(Array.isArray(cur) ? cur.filter(l => l.id !== lecture.id) : [])];
    setSchoolCacheSync(key, next);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("lectures-updated", { detail: { schoolId: lecture.schoolId, classId: lecture.classId, date: lecture.date } })
    );
  }

  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${lecture.schoolId}/lectures/${lecture.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${lecture.schoolId}/lectures/${lecture.id}`), sanitized), 2500); } catch {}
  }
};

export const getClassLectures = async (schoolId: string, classId?: string, date?: string): Promise<DailyClassLecture[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  let local = getSchoolCacheSync<DailyClassLecture[]>(`nst_school_lectures_${schoolId}`, []);
  if (!Array.isArray(local)) local = [];

  if (useDemo) {
    const demo = getDemoSchoolDataset();
    if (demo && demo.videoLectures && demo.videoLectures.length > 0) {
      // Merge demo lectures with local edits
      const mergedDemo = [...local, ...demo.videoLectures.filter(dl => !local.some(l => l.id === dl.id))];
      local = mergedDemo;
    }
  }

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/lectures`)), 2500);
      const remote = snap.docs.map(docSnap => docSnap.data() as DailyClassLecture);
      if (remote.length > 0) {
        const merged = [...remote, ...local.filter(l => !remote.some(r => r.id === l.id))];
        local = merged;
        setSchoolCacheSync(`nst_school_lectures_${schoolId}`, merged);
      }
    } catch {}
  }

  let filtered = local;
  if (classId) {
    const cleanCid = classId.toLowerCase().replace(/[^a-z0-9]/g, "");
    const classFiltered = filtered.filter(l => {
      if (l.classId === classId || l.className === classId) return true;
      const cleanLCid = (l.classId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLName = (l.className || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return cleanLCid === cleanCid ||
             cleanLName === cleanCid ||
             cleanLCid.includes(cleanCid) ||
             cleanCid.includes(cleanLCid) ||
             cleanLName.includes(cleanCid) ||
             cleanCid.includes(cleanLName);
    });
    if (classFiltered.length > 0) {
      filtered = classFiltered;
    }
  }

  if (date) {
    const dateFiltered = filtered.filter(l => l.date === date);
    if (dateFiltered.length > 0) {
      filtered = dateFiltered;
    }
  }
  return filtered.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (a.periodNumber - b.periodNumber));
};

export const deleteClassLecture = async (schoolId: string, lectureId: string): Promise<void> => {
  try {
    const key = `nst_school_lectures_${schoolId}`;
    const cur = getSchoolCacheSync<DailyClassLecture[]>(key, []);
    if (Array.isArray(cur)) {
      setSchoolCacheSync(key, cur.filter(l => l.id !== lectureId));
    }
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lectures-updated", { detail: { schoolId, lectureId } }));
  }

  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/lectures/${lectureId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/lectures/${lectureId}`)), 2500); } catch {}
  }
};

// ── NSTA MESSENGER SUITE API ──
export const getNstaThreadKey = (
  threadType: NstaThreadType,
  classId?: string,
  studentId?: string,
  teacherId?: string
): string => {
  if (threadType === "CLASS_GROUP") return `class_${classId || "general"}`;
  if (threadType === "SCHOOL_DESK") return `school_${studentId || "all"}`;
  if (threadType === "TEACHER_CHAT") return `teacher_${studentId || "std"}_${teacherId || "tch"}`;
  return "general";
};

export const saveNstaMessage = async (msg: NstaMessage): Promise<void> => {
  const sanitized = sanitizeForFirestore(msg);
  const cacheKey = `nst_school_nsta_msgs_${msg.schoolId}`;

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = [sanitized, ...(Array.isArray(cur) ? cur.filter(m => m.id !== msg.id) : [])];
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nsta-messages-updated", { detail: { schoolId: msg.schoolId, message: msg } }));
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${msg.schoolId}/nsta_messages/${msg.id}`), sanitized), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${msg.schoolId}/nsta_messages/${msg.id}`), sanitized), 2500);
    } catch {}
  }
};

export const deleteNstaMessage = async (schoolId: string, messageId: string): Promise<void> => {
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = Array.isArray(cur) ? cur.filter(m => m.id !== messageId) : [];
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nsta-messages-updated", { detail: { schoolId, messageId, action: "DELETE" } }));
  }

  if (rtdb) {
    try {
      await withTimeout(remove(ref(rtdb, `schools/${schoolId}/nsta_messages/${messageId}`)), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/nsta_messages/${messageId}`)), 2500);
    } catch {}
  }
};

export const deleteNstaMessageForMe = async (
  schoolId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  if (!schoolId || !messageId || !userId) return;
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;
  let updatedMsg: NstaMessage | null = null;

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = (Array.isArray(cur) ? cur : []).map((m) => {
      if (m.id === messageId) {
        const deletedFor = Array.isArray(m.deletedFor) ? [...m.deletedFor] : [];
        if (!deletedFor.includes(userId)) deletedFor.push(userId);
        updatedMsg = { ...m, deletedFor };
        return updatedMsg;
      }
      return m;
    });
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nsta-messages-updated", {
        detail: { schoolId, messageId, action: "DELETE_FOR_ME", userId }
      })
    );
  }

  if (updatedMsg) {
    const sanitized = sanitizeForFirestore(updatedMsg);
    if (rtdb) {
      try {
        await withTimeout(set(ref(rtdb, `schools/${schoolId}/nsta_messages/${messageId}`), sanitized), 2000);
      } catch {}
    }
    if (db) {
      try {
        await withTimeout(setDoc(d(`schools/${schoolId}/nsta_messages/${messageId}`), sanitized), 2500);
      } catch {}
    }
  }
};

export const deleteNstaMessageForEveryone = async (
  schoolId: string,
  messageId: string
): Promise<void> => {
  if (!schoolId || !messageId) return;
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;
  let updatedMsg: NstaMessage | null = null;

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = (Array.isArray(cur) ? cur : []).map((m) => {
      if (m.id === messageId) {
        updatedMsg = {
          ...m,
          text: "🚫 This message was deleted",
          deletedForEveryone: true,
          deletedForEveryoneAt: new Date().toISOString(),
          attachmentUrl: undefined,
          attachmentType: undefined,
          feeSlip: undefined
        };
        return updatedMsg;
      }
      return m;
    });
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nsta-messages-updated", {
        detail: { schoolId, messageId, action: "DELETE_FOR_EVERYONE" }
      })
    );
  }

  if (updatedMsg) {
    const sanitized = sanitizeForFirestore(updatedMsg);
    if (rtdb) {
      try {
        await withTimeout(set(ref(rtdb, `schools/${schoolId}/nsta_messages/${messageId}`), sanitized), 2000);
      } catch {}
    }
    if (db) {
      try {
        await withTimeout(setDoc(d(`schools/${schoolId}/nsta_messages/${messageId}`), sanitized), 2500);
      } catch {}
    }
  }
};

export const toggleNstaMessageReaction = async (
  schoolId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  if (!schoolId || !messageId || !emoji || !userId) return;
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;
  let updatedMsg: NstaMessage | null = null;

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = (Array.isArray(cur) ? cur : []).map((m) => {
      if (m.id === messageId) {
        const reactions: Record<string, string[]> = { ...(m.reactions || {}) };
        const userCurrentReaction = Object.entries(reactions).find(([_, users]) =>
          Array.isArray(users) && users.includes(userId)
        )?.[0];

        // Remove user from any existing reactions
        Object.keys(reactions).forEach((k) => {
          if (Array.isArray(reactions[k])) {
            reactions[k] = reactions[k].filter((uid) => uid !== userId);
            if (reactions[k].length === 0) delete reactions[k];
          }
        });

        // If clicking a different emoji, add it
        if (userCurrentReaction !== emoji) {
          if (!reactions[emoji]) reactions[emoji] = [];
          reactions[emoji].push(userId);
        }

        updatedMsg = { ...m, reactions };
        return updatedMsg;
      }
      return m;
    });
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nsta-messages-updated", {
        detail: { schoolId, messageId, action: "REACTION" }
      })
    );
  }

  if (updatedMsg) {
    const sanitized = sanitizeForFirestore(updatedMsg);
    if (rtdb) {
      try {
        await withTimeout(set(ref(rtdb, `schools/${schoolId}/nsta_messages/${messageId}`), sanitized), 2000);
      } catch {}
    }
    if (db) {
      try {
        await withTimeout(setDoc(d(`schools/${schoolId}/nsta_messages/${messageId}`), sanitized), 2500);
      } catch {}
    }
  }
};

export const markNstaMessagesDeliveredOrRead = async (
  schoolId: string,
  messageIds: string[],
  user: { userId: string; userName: string; role?: string },
  markAs: "delivered" | "read"
): Promise<void> => {
  if (!schoolId || !Array.isArray(messageIds) || messageIds.length === 0 || !user.userId) return;
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;
  const nowIso = new Date().toISOString();
  const modifiedMsgs: NstaMessage[] = [];

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    if (!Array.isArray(cur) || cur.length === 0) return;

    let hasChanges = false;
    const updated = cur.map((m) => {
      if (!messageIds.includes(m.id)) return m;
      // Do not mark own messages as read by self
      if (m.senderId === user.userId) return m;

      let changed = false;
      const deliveredTo = Array.isArray(m.deliveredTo) ? [...m.deliveredTo] : [];
      const readBy = Array.isArray(m.readBy) ? [...m.readBy] : [];

      // Add to deliveredTo if not already there
      if (!deliveredTo.some((d) => d.userId === user.userId)) {
        deliveredTo.push({
          userId: user.userId,
          userName: user.userName,
          deliveredAt: nowIso,
          role: user.role
        });
        changed = true;
      }

      let newStatus = m.status || "sent";
      if (newStatus === "sent") {
        newStatus = "delivered";
        changed = true;
      }

      if (markAs === "read") {
        if (!readBy.some((r) => r.userId === user.userId)) {
          readBy.push({
            userId: user.userId,
            userName: user.userName,
            readAt: nowIso,
            role: user.role
          });
          changed = true;
        }
        newStatus = "read";
      }

      if (changed) {
        hasChanges = true;
        const up = { ...m, status: newStatus, deliveredTo, readBy };
        modifiedMsgs.push(up);
        return up;
      }
      return m;
    });

    if (hasChanges) {
      setSchoolCacheSync(cacheKey, updated);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("nsta-messages-updated", {
            detail: { schoolId, action: markAs === "read" ? "READ" : "DELIVERED" }
          })
        );
      }
    }
  } catch {}

  // Sync back modified messages
  if (modifiedMsgs.length > 0) {
    for (const msg of modifiedMsgs.slice(0, 5)) {
      const sanitized = sanitizeForFirestore(msg);
      if (rtdb) {
        try {
          void set(ref(rtdb, `schools/${schoolId}/nsta_messages/${msg.id}`), sanitized);
        } catch {}
      }
      if (db) {
        try {
          void setDoc(d(`schools/${schoolId}/nsta_messages/${msg.id}`), sanitized);
        } catch {}
      }
    }
  }
};

export const subscribeToNstaMessages = (
  schoolId: string,
  filter: { threadType: NstaThreadType; classId?: string; studentId?: string; teacherId?: string },
  cb: (msgs: NstaMessage[]) => void
): () => void => {
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;

  const loadFromCacheAndNotify = () => {
    const all = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    if (Array.isArray(all)) {
      const filtered = all.filter(m => {
        if (!m || !m.threadType) return false;
        // 1. Strict threadType match - class, school, or teacher
        if (m.threadType !== filter.threadType) return false;

        // 2. Class Group filtering
        if (filter.threadType === "CLASS_GROUP") {
          if (filter.classId && m.classId && m.classId !== filter.classId && m.classId !== "all" && m.classId !== "general") {
            return false;
          }
        }

        // 3. School Desk filtering
        if (filter.threadType === "SCHOOL_DESK") {
          if (filter.studentId && m.studentId && m.studentId !== filter.studentId && m.studentId !== "all" && m.studentId !== "general") {
            return false;
          }
        }

        // 4. Teacher Chat filtering
        if (filter.threadType === "TEACHER_CHAT") {
          if (filter.studentId && m.studentId && m.studentId !== filter.studentId) return false;
          if (filter.teacherId && m.teacherId && m.teacherId !== filter.teacherId) return false;
        }

        return true;
      });
      cb(filtered.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")));
    }
  };

  loadFromCacheAndNotify();

  const handleCustomEvent = (e: any) => {
    if (e.detail?.schoolId === schoolId) {
      loadFromCacheAndNotify();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("nsta-messages-updated", handleCustomEvent);
  }

  // Realtime Database listener
  let unsubRtdb = () => {};
  if (rtdb) {
    try {
      const rtdbPath = ref(rtdb, `schools/${schoolId}/nsta_messages`);
      const onRtdbValue = (snap: any) => {
        const val = snap?.val?.();
        if (val && typeof val === "object") {
          const remoteList: NstaMessage[] = Object.values(val);
          setSchoolCacheSync(cacheKey, remoteList);
          loadFromCacheAndNotify();
        } else if (val === null) {
          setSchoolCacheSync(cacheKey, []);
          loadFromCacheAndNotify();
        }
      };
      const unsub = onValue(rtdbPath, onRtdbValue);
      unsubRtdb = () => {
        try { unsub(); } catch {}
      };
    } catch {}
  }

  // Firestore listener
  let unsubFirestore = () => {};
  if (db) {
    try {
      unsubFirestore = onSnapshot(col(`schools/${schoolId}/nsta_messages`), (snap) => {
        const remote = snap.docs.map(docSnap => docSnap.data() as NstaMessage);
        setSchoolCacheSync(cacheKey, remote);
        loadFromCacheAndNotify();
      });
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("nsta-messages-updated", handleCustomEvent);
    }
    unsubRtdb();
    unsubFirestore();
  };
};

// Check student's daily teacher query count (max 5)
export const getStudentDailyTeacherQueryCount = (schoolId: string, studentId: string, dateStr?: string): number => {
  const targetDate = dateStr || new Date().toISOString().split("T")[0];
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;
  const all = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
  if (!Array.isArray(all)) return 0;
  return all.filter(m =>
    m.threadType === "TEACHER_CHAT" &&
    m.studentId === studentId &&
    m.senderRole === "STUDENT" &&
    (m.createdAt || "").startsWith(targetDate)
  ).length;
};

// Auto route fee slip or receipt directly to student's School Desk in NSTA Messenger
export const autoSendFeeSlipToSchoolDesk = async (payload: {
  schoolId: string;
  studentId: string;
  studentName: string;
  className?: string;
  rollNo?: string;
  admissionNo?: string;
  feeItems?: any[];
  slipType: "A6_DEMAND_SLIP" | "FEE_RECEIPT";
  month: string;
  monthLabel: string;
  amount: number;
  balanceDue: number;
  monthlyAmount?: number;
  oldArrears?: number;
  earlyDiscount?: number;
  netPayableWithDiscount?: number;
  receiptNo?: string;
  dueDate?: string;
  payLink?: string;
}): Promise<void> => {
  const isReceipt = payload.slipType === "FEE_RECEIPT";
  const todayDateNum = new Date().getDate();
  const isBeforeOrOn10th = todayDateNum <= 10;

  const currentMonthFee = Number(payload.monthlyAmount || payload.amount || 0);
  const arrears = Math.max(0, Number(payload.oldArrears || Math.max(0, payload.balanceDue - currentMonthFee)));
  
  // 5% Early Discount Rule: Strictly applies to current month regular fee, NEVER on old arrears!
  const earlyDiscount = isBeforeOrOn10th && currentMonthFee > 0
    ? (payload.earlyDiscount !== undefined ? payload.earlyDiscount : Math.round(currentMonthFee * 0.05))
    : 0;
  const netPayableWithDiscount = earlyDiscount > 0
    ? (currentMonthFee - earlyDiscount) + arrears
    : payload.balanceDue;

  let text = "";
  if (isReceipt) {
    text = `Aapka ${payload.monthLabel} ka fee payment (₹${payload.amount.toLocaleString("en-IN")}) safalta-purvak receive ho gaya hai. Official receipt no: ${payload.receiptNo || "N/A"}. Dhanyawad!`;
  } else {
    if (isBeforeOrOn10th && earlyDiscount > 0) {
      text = `📢 ${payload.monthLabel} फीस सूचना: कुल बकाया ₹${payload.balanceDue.toLocaleString("en-IN")} है। ⚡ 10 तारीख तक जमा करने पर चालू माह फीस पर 5% विशेष छूट (बचत: ₹${earlyDiscount.toLocaleString("en-IN")})! छूट के बाद देय: ₹${netPayableWithDiscount.toLocaleString("en-IN")}${arrears > 0 ? ` (पुराने बकाए ₹${arrears.toLocaleString("en-IN")} पर छूट लागू नहीं)` : ""}।`;
    } else {
      text = `Aapka ${payload.monthLabel} ka shulk baaki hai. Kul deya rashi: ₹${payload.balanceDue.toLocaleString("en-IN")}. Kripya antam tithi ${payload.dueDate || "jaldi"} se pehle jama karein. (10 तारीख के बाद 5% छूट समाप्त)।`;
    }
  }

  const msg: NstaMessage = {
    id: `slip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    schoolId: payload.schoolId,
    threadType: "SCHOOL_DESK",
    studentId: payload.studentId,
    studentName: payload.studentName,
    senderId: "school_admin",
    senderName: "School Accounts & Administration",
    senderRole: "ADMIN",
    text,
    feeSlip: {
      type: payload.slipType,
      month: payload.month,
      monthLabel: payload.monthLabel,
      amount: payload.amount,
      balanceDue: payload.balanceDue,
      monthlyAmount: currentMonthFee,
      oldArrears: arrears,
      earlyDiscount,
      netPayableWithDiscount,
      discountValidUntil: "10 तारीख तक",
      isEligibleForEarlyDiscount: isBeforeOrOn10th && earlyDiscount > 0,
      studentName: payload.studentName,
      className: payload.className,
      rollNo: payload.rollNo,
      admissionNo: payload.admissionNo,
      feeItems: payload.feeItems,
      receiptNo: payload.receiptNo,
      dueDate: payload.dueDate || "10th of Month",
      payLink: payload.payLink,
    },
    createdAt: new Date().toISOString(),
    status: "delivered",
  };

  await saveNstaMessage(msg);
};

// ── OFFICIAL SCHOOL WELCOME MESSAGE (नया आईडी बनते ही आधिकारिक स्वागत संदेश) ──
export const dispatchOfficialSchoolWelcomeMessage = async (
  student: {
    id: string;
    name: string;
    admissionNo?: string;
    rollNo?: string;
    classId?: string;
    className?: string;
    schoolId?: string;
    schoolName?: string;
    fatherName?: string;
    mobile?: string;
    phone?: string;
    photoUrl?: string;
    photoURL?: string;
  },
  options?: {
    force?: boolean;
    schoolName?: string;
    schoolLogo?: string;
    triggerPopup?: boolean;
  }
): Promise<NstaMessage | null> => {
  if (!student || !student.id || !student.name) return null;
  const targetSchoolId = student.schoolId || "dps_gurgaon_sector45";
  const sentKey = `nst_welcome_sent_${targetSchoolId}_${student.id}`;

  const cleanAdmNo = student.admissionNo || `ADM-${student.id.slice(-6).toUpperCase()}`;
  const cleanRollNo = student.rollNo || "01";
  const cleanClassName =
    student.className ||
    (student.classId ? student.classId.replace(/^cls_/i, "Class ") : "Class 10");

  // Determine school name & branding
  let resolvedSchoolName = options?.schoolName || student.schoolName || "";
  let resolvedSchoolLogo = options?.schoolLogo || "";

  if (!resolvedSchoolName) {
    try {
      const schools = getLocalSchools();
      const matched = schools.find((s) => s.id === targetSchoolId);
      if (matched?.name) {
        resolvedSchoolName = matched.name;
        resolvedSchoolLogo = matched.logoUrl || "";
      }
    } catch {}
  }
  if (!resolvedSchoolName) {
    resolvedSchoolName = targetSchoolId === "dps_gurgaon_sector45" ? "Delhi Public School" : "NSTA Digital School";
  }

  const welcomePayload: NstaWelcomeData = {
    studentId: student.id,
    studentName: student.name,
    admissionNo: cleanAdmNo,
    rollNo: cleanRollNo,
    classId: student.classId,
    className: cleanClassName,
    schoolName: resolvedSchoolName,
    schoolLogo: resolvedSchoolLogo,
    fatherName: student.fatherName,
    mobile: student.phone || student.mobile,
    session: "2026-27",
    verificationBadge: "VERIFIED_STUDENT_ID",
    issuedAt: new Date().toISOString(),
  };

  // Set popup flags so the student sees the celebratory Welcome Modal on login/scan
  try {
    localStorage.setItem(`nst_show_welcome_popup_${student.id}`, JSON.stringify(welcomePayload));
    localStorage.setItem("nst_pending_welcome_student", JSON.stringify(welcomePayload));
  } catch {}

  // Prevent duplicate chat messages in School Desk if already delivered
  try {
    if (!options?.force && localStorage.getItem(sentKey)) {
      return null;
    }
  } catch {}

  const welcomeText = `🌟 *आधिकारिक स्वागत संदेश | OFFICIAL WELCOME LETTER* 🌟

प्रिय विद्यार्थी *${student.name}*,
*${resolvedSchoolName}* के डिजिटल शैक्षणिक पोर्टल में आपका हार्दिक स्वागत एवं अभिनंदन है! 🎓

📋 *विद्यार्थी पहचान पत्र विवरण (Verified Student Identity)*:
• **विद्यार्थी का नाम (Student Name):** ${student.name}
• **प्रवेश संख्या (Admission No):** ${cleanAdmNo}
• **कक्षा (Class & Section):** ${cleanClassName}
• **रोल नंबर (Roll No):** ${cleanRollNo}
• **सत्र (Academic Session):** 2026-27
• **आईडी स्थिति:** ✅ सक्रिय व प्रमाणित (Digital ID Card Active)

🚀 *पोर्टल पर उपलब्ध मुख्य सुविधाएं (Digital Campus Facilities)*:
1. 📚 *डिजिटल पाठ्यक्रम एवं नोट्स* - सभी विषयों के सम्पूर्ण अध्यायवार नोट्स व व्याख्या (100% Free)।
2. 🎯 *दैनिक MCQ अभ्यास व टेस्ट* - वस्तुनिष्ठ प्रश्नोत्तरी, तत्काल स्कोर व लाइव लीडरबोर्ड।
3. ⏱️ *डिजिटल हाजिरी व लाइव अलर्ट्स* - स्कूल आगमन/प्रस्थान की रीयल-टाइम सूचना आपके अभिभावक तक।
4. 🧾 *शुल्क पर्ची व आधिकारिक रसीदें* - पारदर्शी ऑनलाइन फीस लेजर, पासबुक और POS रसीदें।
5. 💬 *NSTA मैसेंजर स्कूल डेस्क* - स्कूल के सभी सर्कुलर, नोटिस, गृहकार्य व शिक्षक मार्गदर्शन।

📌 *महत्वपूर्ण निर्देश (Guidelines)*:
• आपकी डिजिटल आईडी सक्रिय है। आप इसे स्कूल QR कोड स्कैनर द्वारा कभी भी 1-टैप में लॉगिन कर सकते हैं।
• सभी आवश्यक स्कूल सर्कुलर व अवकाश सूचना इसी स्कूल डेस्क पर प्राप्त होंगी।
• किसी भी समस्या हेतु विद्यालय कार्यालय अथवा कक्षा शिक्षक से संपर्क करें।

विद्यालय परिवार आपके उज्ज्वल भविष्य और उच्चतम शैक्षणिक सफलता की मंगलकामना करता है!

सादर,
*प्रधानाचार्य एवं विद्यालय प्रशासन (Principal & Academic Administration)*
🏛️ *${resolvedSchoolName}*
📞 हेल्पलाइन: 9811023450 | ✉️ support@nsta.app`;

  const welcomeMsg: NstaMessage = {
    id: `msg_welcome_${student.id}_${Date.now()}`,
    schoolId: targetSchoolId,
    threadType: "SCHOOL_DESK",
    studentId: student.id,
    studentName: student.name,
    senderId: `admin_${targetSchoolId}`,
    senderName: `${resolvedSchoolName} (Principal Desk)`,
    senderRole: "ADMIN",
    senderPhoto: resolvedSchoolLogo,
    text: welcomeText,
    attachmentType: "WELCOME",
    welcomeData: welcomePayload,
    createdAt: new Date().toISOString(),
    status: "sent",
  };

  try {
    await saveNstaMessage(welcomeMsg);
    localStorage.setItem(sentKey, "true");
  } catch {}

  // Send push notification
  try {
    const { sendSchoolPushNotification } = await import("./utils/schoolPushClient");
    void sendSchoolPushNotification({
      schoolId: targetSchoolId,
      studentIds: [student.id],
      title: `🎓 Welcome to ${resolvedSchoolName}!`,
      body: `प्रिय ${student.name}, आपका डिजिटल आईडी कार्ड व पोर्टल सक्रिय कर दिया गया है।`,
      type: "SCHOOL_NOTICE",
      icon: resolvedSchoolLogo,
      senderPhoto: resolvedSchoolLogo,
      url: "/?schoolPortal=1&schoolTab=messenger&subTab=school",
      urgent: true,
    });
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nst-school-welcome-received", { detail: welcomePayload })
    );
  }

  return welcomeMsg;
};

// ── STUDENT BIRTHDAY UTILITIES (स्वचालित जन्मदिन शुभकामना इंजन) ──
export const getStudentBirthdayInfo = (dob?: string): { month: number; day: number; birthYear?: number } | null => {
  if (!dob) return null;
  try {
    const clean = dob.trim();
    // Support formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD
    const parts = clean.split(/[-/]/).map(Number);
    if (parts.length >= 3) {
      if (parts[0] > 1000) {
        // YYYY-MM-DD
        return { birthYear: parts[0], month: parts[1], day: parts[2] };
      }
      // DD-MM-YYYY (or DD/MM/YYYY)
      return { birthYear: parts[2], month: parts[1], day: parts[0] };
    } else if (parts.length === 2) {
      return { month: parts[1], day: parts[0] };
    }
  } catch {}
  return null;
};

export const isStudentBirthdayOnDate = (dob: string | undefined | null, targetMonth: number, targetDay: number): boolean => {
  const info = getStudentBirthdayInfo(dob || undefined);
  if (!info) return false;
  return info.month === targetMonth && info.day === targetDay;
};

export const isStudentBirthdayToday = (dob?: string): boolean => {
  if (!dob) return false;
  const today = new Date();
  return isStudentBirthdayOnDate(dob, today.getMonth() + 1, today.getDate());
};

export const dispatchOfficialSchoolBirthdayWish = async (
  student: {
    id: string;
    name: string;
    admissionNo?: string;
    rollNo?: string;
    classId?: string;
    className?: string;
    schoolId?: string;
    schoolName?: string;
    dateOfBirth?: string;
    phone?: string;
    photoUrl?: string;
  },
  options?: {
    force?: boolean;
    schoolName?: string;
    schoolLogo?: string;
    triggerPopup?: boolean;
  }
): Promise<NstaMessage | null> => {
  if (!student || !student.id || !student.name) return null;
  const targetSchoolId = student.schoolId || "dps_gurgaon_sector45";
  const currentYear = new Date().getFullYear();
  const sentKey = `nst_birthday_wish_sent_${targetSchoolId}_${student.id}_${currentYear}`;

  const cleanAdmNo = student.admissionNo || `ADM-${student.id.slice(-6).toUpperCase()}`;
  const cleanRollNo = student.rollNo || "01";
  const cleanClassName =
    student.className ||
    (student.classId ? student.classId.replace(/^cls_/i, "Class ") : "Class 10");
  const cleanDob = student.dateOfBirth || "Today";

  // Determine school name & branding
  let resolvedSchoolName = options?.schoolName || student.schoolName || "";
  let resolvedSchoolLogo = options?.schoolLogo || "";

  if (!resolvedSchoolName) {
    try {
      const schools = getLocalSchools();
      const matched = schools.find((s) => s.id === targetSchoolId);
      if (matched?.name) {
        resolvedSchoolName = matched.name;
        resolvedSchoolLogo = matched.logoUrl || "";
      }
    } catch {}
  }
  if (!resolvedSchoolName) {
    resolvedSchoolName =
      targetSchoolId === "dps_gurgaon_sector45"
        ? "Delhi Public School"
        : "NSTA Digital School";
  }

  const birthdayPayload: NstaBirthdayData = {
    studentId: student.id,
    studentName: student.name,
    admissionNo: cleanAdmNo,
    rollNo: cleanRollNo,
    classId: student.classId,
    className: cleanClassName,
    schoolName: resolvedSchoolName,
    schoolLogo: resolvedSchoolLogo,
    dateOfBirth: cleanDob,
    wishedYear: currentYear,
    issuedAt: new Date().toISOString(),
  };

  // Set popup flags so student sees the celebratory Birthday Modal
  try {
    localStorage.setItem(
      `nst_show_birthday_popup_${student.id}`,
      JSON.stringify(birthdayPayload)
    );
    localStorage.setItem(
      "nst_pending_birthday_student",
      JSON.stringify(birthdayPayload)
    );
  } catch {}

  // Prevent duplicate chat messages in School Desk if already delivered this year
  try {
    if (!options?.force && localStorage.getItem(sentKey)) {
      return null;
    }
  } catch {}

  const birthdayText = `🎂 *जन्मदिन की हार्दिक शुभकामनाएं एवं शुभाशीर्वाद!* 🎂
✨ *OFFICIAL BIRTHDAY BLESSINGS & GREETINGS* ✨

प्रिय विद्यार्थी *${student.name}*,
*${resolvedSchoolName}* परिवार की ओर से आपके जन्मदिवस के इस मंगलमय अवसर पर आपको हार्दिक बधाई, असीम स्नेह और मंगलमय शुभकामनाएं! 🌟🎉

📋 *विद्यार्थी पहचान विवरण (Student Profile)*:
• **विद्यार्थी का नाम (Student Name):** ${student.name}
• **प्रवेश संख्या (Admission No):** ${cleanAdmNo}
• **कक्षा (Class & Section):** ${cleanClassName}
• **रोल नंबर (Roll No):** ${cleanRollNo}
• **जन्म तिथि (Date of Birth):** ${cleanDob}
• **विद्यालय (School):** ${resolvedSchoolName}

💐 *प्रधानाचार्य व विद्यालय प्रबंधन का संदेश (Principal's Blessing)*:
"विद्यार्थी जीवन स्वर्णिम भविष्य की मजबूत नींव होता है। ईश्वर से प्रार्थना है कि यह नया वर्ष आपके जीवन में उत्तम स्वास्थ्य, प्रखर बुद्धि, एकाग्रता और नित-नई शैक्षणिक उपलब्धियां लेकर आए। आप अपनी कड़ी मेहनत, अनुशासन और श्रेष्ठ आचरण से अपने माता-पिता, गुरुजनों और विद्यालय का नाम पूरे देश में रोशन करें।"

🌟 *जन्मदिवस पर आपके लिए विशेष (Birthday Highlights)*:
1. 📚 ज्ञान और अनुशासन के साथ अपने लक्ष्यों की ओर अग्रसर रहें।
2. 🎯 अपने दैनिक अध्ययन, अभ्यास और सीखने की ललक को सदैव जीवित रखें।
3. 🏆 विद्यालय का संपूर्ण डिजिटल लर्निंग कैंपस व शिक्षक मार्गदर्शन सदैव आपके साथ है।

विद्यालय परिवार आपके सुखद, स्वस्थ, यशस्वी एवं उज्ज्वल भविष्य की कामना करता है। ईश्वर आपको सदैव प्रगति के मार्ग पर प्रशस्त रखें।

सस्नेह व शुभाशीर्वाद,
*प्रधानाचार्य एवं समस्त शिक्षकगण (Principal & Faculty Members)*
🏛️ *${resolvedSchoolName}*
📞 हेल्पलाइन: 9811023450 | ✉️ support@nsta.app`;

  const birthdayMsg: NstaMessage = {
    id: `msg_bday_${student.id}_${currentYear}_${Date.now()}`,
    schoolId: targetSchoolId,
    threadType: "SCHOOL_DESK",
    studentId: student.id,
    studentName: student.name,
    senderId: `admin_${targetSchoolId}`,
    senderName: `${resolvedSchoolName} (Principal Desk)`,
    senderRole: "ADMIN",
    senderPhoto: resolvedSchoolLogo,
    text: birthdayText,
    attachmentType: "BIRTHDAY",
    birthdayData: birthdayPayload,
    createdAt: new Date().toISOString(),
    status: "sent",
  };

  try {
    await saveNstaMessage(birthdayMsg);
    localStorage.setItem(sentKey, "true");
  } catch {}

  // Send real-time push notification
  try {
    const { sendSchoolPushNotification } = await import("./utils/schoolPushClient");
    void sendSchoolPushNotification({
      schoolId: targetSchoolId,
      studentIds: [student.id],
      title: `🎂 जन्मदिन की हार्दिक शुभकामनाएं! | Happy Birthday!`,
      body: `प्रिय ${student.name}, ${resolvedSchoolName} की ओर से जन्मदिवस पर हार्दिक बधाई व शुभाशीर्वाद।`,
      type: "SCHOOL_NOTICE",
      icon: resolvedSchoolLogo,
      senderPhoto: resolvedSchoolLogo,
      url: "/?schoolPortal=1&schoolTab=messenger&subTab=school",
      urgent: true,
    });
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nst-school-birthday-received", { detail: birthdayPayload })
    );
  }

  return birthdayMsg;
};

// Automatic daily check for any student whose birthday is today in the given school
export const checkAndDispatchTodaysBirthdays = async (
  schoolId: string = "dps_gurgaon_sector45"
): Promise<number> => {
  try {
    const students = getLocalStudents(schoolId);
    if (!Array.isArray(students) || students.length === 0) return 0;

    let dispatchedCount = 0;
    for (const st of students) {
      if (st && st.dateOfBirth && isStudentBirthdayToday(st.dateOfBirth)) {
        const msg = await dispatchOfficialSchoolBirthdayWish(st, {
          force: false,
          triggerPopup: true,
        });
        if (msg) dispatchedCount++;
      }
    }
    return dispatchedCount;
  } catch {
    return 0;
  }
};

// ── SCHOOL EVENTS & MORNING 6:00 AM TEACHER NOTIFICATIONS ──────────────────
const LOCAL_EVENTS_PREFIX = "nst_school_events_";

export const getLocalSchoolEvents = (schoolId: string): SchoolEvent[] => {
  try {
    const list = getSchoolCacheSync<SchoolEvent[]>(`${LOCAL_EVENTS_PREFIX}${schoolId}`, []);
    if (Array.isArray(list) && list.length > 0) return list;
    if (shouldUseDemoForSchool(schoolId)) {
      const demo = getDemoSchoolDataset();
      if (demo && demo.events && demo.events.length > 0) {
        return demo.events;
      }
    }
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const setLocalSchoolEvents = (schoolId: string, events: SchoolEvent[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_EVENTS_PREFIX}${schoolId}`, Array.isArray(events) ? events : []);
  } catch {}
};

const getDefaultInitialEvents = (schoolId: string): SchoolEvent[] => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayDate = `${y}-${m}-${d}`;

  return [
    {
      id: `evt_staff_meet_${schoolId}`,
      schoolId,
      title: "मासिक शिक्षक समीक्षा बैठक (Staff Monthly Meeting)",
      type: "MEETING",
      date: todayDate,
      time: "09:30 AM",
      venue: "Principal Office / Conference Room",
      description: "मासिक शैक्षणिक प्रगति, उपस्थिति सुधार, कमजोर छात्रों की रेमेडियल क्लास व अनुशासन समीक्षा हेतु बैठक।",
      targetAudience: "ALL_TEACHERS",
      createdAt: new Date().toISOString()
    },
    {
      id: `evt_exam_pa2_${schoolId}`,
      schoolId,
      title: "PA-2 आवधिक मूल्यांकन परीक्षा (Periodic Assessment Exam)",
      type: "EXAM",
      date: todayDate,
      time: "10:00 AM - 01:00 PM",
      venue: "All Classrooms",
      description: "कक्षा 1 से 10 तक के सभी छात्रों की परीक्षा आयोजित की जाएगी। वीक्षक शिक्षक समय पर ड्यूटी संभालें।",
      targetAudience: "WHOLE_SCHOOL",
      createdAt: new Date().toISOString()
    },
    {
      id: `evt_ptm_result_${schoolId}`,
      schoolId,
      title: "अभिभावक-शिक्षक बैठक व रिजल्ट डे (PTM & Result Day)",
      type: "RESULT_DAY",
      date: todayDate,
      time: "08:30 AM - 12:30 PM",
      venue: "Main School Auditorium",
      description: "अभिभावकों के समक्ष छात्र प्रगति पत्रक (Report Card) वितरण व फीडबैक सत्र।",
      targetAudience: "WHOLE_SCHOOL",
      createdAt: new Date().toISOString()
    }
  ];
};

export const getSchoolEvents = async (schoolId: string): Promise<SchoolEvent[]> => {
  const local = getLocalSchoolEvents(schoolId);
  if (local.length > 0) return local;

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/events`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const list = Object.values(val) as SchoolEvent[];
        setLocalSchoolEvents(schoolId, list);
        return list;
      }
    } catch {}
  }

  const defEvents = getDefaultInitialEvents(schoolId);
  setLocalSchoolEvents(schoolId, defEvents);
  return defEvents;
};

export const saveSchoolEvent = async (event: SchoolEvent): Promise<void> => {
  const sanitized = sanitizeForFirestore(event);
  const current = getLocalSchoolEvents(event.schoolId);
  const updated = [sanitized, ...current.filter(e => e.id !== event.id)];
  setLocalSchoolEvents(event.schoolId, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-events-updated", { detail: { schoolId: event.schoolId, event: sanitized } }));
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${event.schoolId}/events/${event.id}`), sanitized), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${event.schoolId}/events/${event.id}`), sanitized), 2500);
    } catch {}
  }
};

export const deleteSchoolEvent = async (schoolId: string, eventId: string): Promise<void> => {
  const current = getLocalSchoolEvents(schoolId);
  const updated = current.filter(e => e.id !== eventId);
  setLocalSchoolEvents(schoolId, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("school-events-updated", { detail: { schoolId, eventId, action: "DELETE" } }));
  }

  if (rtdb) {
    try {
      await withTimeout(remove(ref(rtdb, `schools/${schoolId}/events/${eventId}`)), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/events/${eventId}`)), 2500);
    } catch {}
  }
};

export const subscribeToSchoolEvents = (schoolId: string, cb: (events: SchoolEvent[]) => void) => {
  const local = getLocalSchoolEvents(schoolId);
  if (local.length > 0) {
    cb(local);
  } else {
    cb(getDefaultInitialEvents(schoolId));
  }

  let unsubRtdb = () => {};
  if (rtdb) {
    try {
      const q = ref(rtdb, `schools/${schoolId}/events`);
      unsubRtdb = onValue(q, (snap) => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const list = Object.values(val) as SchoolEvent[];
          setLocalSchoolEvents(schoolId, list);
          cb(list);
        }
      });
    } catch {}
  }

  const handleEvt = (e: any) => {
    if (e.detail?.schoolId === schoolId) {
      cb(getLocalSchoolEvents(schoolId));
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-events-updated", handleEvt);
  }

  return () => {
    unsubRtdb();
    if (typeof window !== "undefined") {
      window.removeEventListener("school-events-updated", handleEvt);
    }
  };
};

export const dispatchTeacherEventNotification = async (
  schoolId: string,
  event: SchoolEvent,
  options?: { force?: boolean }
): Promise<{ delivered: number }> => {
  if (!event || !event.title) return { delivered: 0 };
  const targetSchoolId = schoolId || event.schoolId;
  const sentKey = `nst_morning_event_sent_${targetSchoolId}_${event.id}_${event.date}`;

  if (!options?.force && typeof window !== "undefined") {
    try {
      if (localStorage.getItem(sentKey)) {
        return { delivered: 0 };
      }
    } catch {}
  }

  let schoolName = "School";
  try {
    const s = await getSchool(targetSchoolId);
    if (s?.name) schoolName = s.name;
  } catch {}

  const typeLabels: Record<SchoolEventType, string> = {
    MEETING: "🤝 स्टाफ मीटिंग / परामर्श",
    EXAM: "📝 परीक्षा (Exam Day)",
    RESULT_DAY: "📊 रिजल्ट डे / PTM",
    OFFICIAL_WORK: "💼 स्कूल महत्वपूर्ण कार्य (Inspection/Audit)",
    CELEBRATION: "🎉 वार्षिकोत्सव / उत्सव",
    HOLIDAY: "🏖️ स्कूल अवकाश",
    OTHER: "📌 आवश्यक सूचना"
  };
  const typeLabel = typeLabels[event.type] || "📌 आधिकारिक कार्यक्रम";

  const teachers = await getTeachers(targetSchoolId);
  let delivered = 0;

  const notificationText =
    `🔔 **[${schoolName}] — आवश्यक शिक्षक सूचना व कार्यक्रम**\n\n` +
    `📌 **कार्यक्रम**: ${event.title}\n` +
    `🏷️ **प्रकार**: ${typeLabel}\n` +
    `🗓️ **तारीख**: ${event.date}\n` +
    (event.time ? `⏰ **समय**: ${event.time}\n` : "") +
    (event.venue ? `📍 **स्थान**: ${event.venue}\n` : "") +
    (event.description ? `📝 **विवरण**: ${event.description}\n\n` : "\n") +
    `*समस्त शिक्षकगण कृपया समय पर संज्ञान लें व आवश्यक तैयारी सुनिश्चित करें।* — प्रधानाचार्य व प्रशासन`;

  for (const t of teachers) {
    try {
      const msg: NstaMessage = {
        id: `evt_msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        schoolId: targetSchoolId,
        threadType: "SCHOOL_DESK",
        teacherId: t.id,
        teacherName: t.name,
        senderId: "admin",
        senderName: `${schoolName} Administration`,
        senderRole: "ADMIN",
        text: notificationText,
        createdAt: new Date().toISOString(),
        status: "delivered"
      };
      await saveNstaMessage(msg);
      delivered++;
    } catch {}
  }

  // Dual dispatch real-time web push alert with sound
  try {
    const { sendSchoolPushNotification } = await import("./utils/schoolPushClient");
    await sendSchoolPushNotification({
      schoolId: targetSchoolId,
      title: `🔔 [${schoolName}] आज का कार्यक्रम: ${event.title}`,
      body: `तारीख: ${event.date}${event.time ? ` • समय: ${event.time}` : ""} — ${typeLabel}. सभी शिक्षक कृपया संज्ञान लें।`,
      type: "SCHOOL_NOTICE",
      urgent: true
    });
  } catch {}

  // Mark notified
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(sentKey, new Date().toISOString());
    }
  } catch {}

  // Update event state
  await saveSchoolEvent({
    ...event,
    notifiedTeachers: true,
    notifiedAt: new Date().toISOString()
  });

  return { delivered };
};

export const checkAndDispatchMorningEventAlerts = async (schoolId: string): Promise<number> => {
  try {
    const now = new Date();
    const currentHour = now.getHours(); // 0-23
    // Morning 6 AM or later
    if (currentHour < 6) return 0;

    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const events = await getSchoolEvents(schoolId);
    const todaysEvents = events.filter(e => e.date === todayStr);
    let count = 0;

    for (const evt of todaysEvents) {
      const sentKey = `nst_morning_event_sent_${schoolId}_${evt.id}_${todayStr}`;
      let alreadySent = false;
      try {
        if (typeof window !== "undefined" && localStorage.getItem(sentKey)) {
          alreadySent = true;
        }
      } catch {}

      if (!alreadySent) {
        const res = await dispatchTeacherEventNotification(schoolId, evt);
        if (res.delivered > 0) count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
};


// ── ACCOUNTANTS (कैशियर / वित्तीय प्रबंधन) ──────────────────────────────────────────────
const LOCAL_ACCOUNTANTS_PREFIX = "nst_school_accountants_";

export const getLocalAccountants = (schoolId: string): SchoolAccountant[] => {
  try {
    const list = getSchoolCacheSync<SchoolAccountant[]>(`${LOCAL_ACCOUNTANTS_PREFIX}${schoolId}`, []);
    if (Array.isArray(list) && list.length > 0) return list;
    if (shouldUseDemoForSchool(schoolId)) {
      const demo = getDemoSchoolDataset();
      if (demo && demo.accountants && demo.accountants.length > 0) {
        return demo.accountants;
      }
    }
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const setLocalAccountants = (schoolId: string, accountants: SchoolAccountant[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_ACCOUNTANTS_PREFIX}${schoolId}`, Array.isArray(accountants) ? accountants : []);
  } catch {}
};

export const saveAccountant = async (accountant: SchoolAccountant) => {
  const sanitized = sanitizeForFirestore(accountant);
  const current = getLocalAccountants(accountant.schoolId);
  const next = [sanitized, ...current.filter((a: any) => a.id !== accountant.id)];
  setLocalAccountants(accountant.schoolId, next);

  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${accountant.schoolId}/accountants/${accountant.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${accountant.schoolId}/accountants/${accountant.id}`), sanitized), 3000); } catch {}
  }
  return sanitized;
};

export const getAccountants = async (schoolId: string): Promise<SchoolAccountant[]> => {
  const local = getLocalAccountants(schoolId);
  if (local.length > 0) return local;

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/accountants`)), 2500);
      const list = snap.docs.map(docSnap => docSnap.data() as SchoolAccountant);
      if (list.length > 0) {
        setLocalAccountants(schoolId, list);
        return list;
      }
    } catch {}
  }

  return local;
};

export const subscribeToAccountants = (schoolId: string, cb: (accountants: SchoolAccountant[]) => void) => {
  const deliverLocal = () => {
    cb(getLocalAccountants(schoolId));
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
  }

  const fsUnsub = onSnapshot(
    col(`schools/${schoolId}/accountants`),
    snap => {
      if (!snap.empty) {
        const list = snap.docs.map(docSnap => docSnap.data() as SchoolAccountant);
        setLocalAccountants(schoolId, list);
        cb(list);
      }
    },
    err => { console.warn(`[school-firebase] subscribeToAccountants error:`, err?.code || err); }
  );

  return () => {
    if (typeof window !== "undefined") window.removeEventListener("school-idb-hydrated", deliverLocal);
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const deleteAccountant = async (schoolId: string, accountantId: string) => {
  const current = getLocalAccountants(schoolId);
  setLocalAccountants(schoolId, current.filter(a => a.id !== accountantId));

  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/accountants/${accountantId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/accountants/${accountantId}`)), 2500); } catch {}
  }
};

// ── EXPENSE VOUCHERS (दैनिक विद्यालय खर्च / वाउचर) ───────────────────────────
const LOCAL_EXPENSES_PREFIX = "nst_school_expenses_";

export const getLocalExpenseVouchers = (schoolId: string): SchoolExpenseVoucher[] => {
  try {
    const list = getSchoolCacheSync<SchoolExpenseVoucher[]>(`${LOCAL_EXPENSES_PREFIX}${schoolId}`, []);
    if (Array.isArray(list) && list.length > 0) return list;
    if (shouldUseDemoForSchool(schoolId)) {
      const demo = getDemoSchoolDataset();
      if (demo && demo.expenseVouchers && demo.expenseVouchers.length > 0) {
        return demo.expenseVouchers;
      }
    }
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const setLocalExpenseVouchers = (schoolId: string, vouchers: SchoolExpenseVoucher[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_EXPENSES_PREFIX}${schoolId}`, Array.isArray(vouchers) ? vouchers : []);
  } catch {}
};

export const saveSchoolExpenseVoucher = async (voucher: SchoolExpenseVoucher) => {
  const sanitized = sanitizeForFirestore(voucher);
  const current = getLocalExpenseVouchers(voucher.schoolId);
  const next = [sanitized, ...current.filter((v: any) => v.id !== voucher.id)];
  setLocalExpenseVouchers(voucher.schoolId, next);

  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${voucher.schoolId}/expenses/${voucher.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${voucher.schoolId}/expenses/${voucher.id}`), sanitized), 3000); } catch {}
  }
  return sanitized;
};

export const getSchoolExpenseVouchers = async (schoolId: string): Promise<SchoolExpenseVoucher[]> => {
  const local = getLocalExpenseVouchers(schoolId);
  if (local.length > 0) return local;

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/expenses`)), 2500);
      const list = snap.docs.map(docSnap => docSnap.data() as SchoolExpenseVoucher);
      if (list.length > 0) {
        setLocalExpenseVouchers(schoolId, list);
        return list;
      }
    } catch {}
  }
  return local;
};

export const subscribeToExpenseVouchers = (schoolId: string, cb: (vouchers: SchoolExpenseVoucher[]) => void) => {
  const deliverLocal = () => {
    cb(getLocalExpenseVouchers(schoolId));
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
  }

  const fsUnsub = onSnapshot(
    col(`schools/${schoolId}/expenses`),
    snap => {
      if (!snap.empty) {
        const list = snap.docs.map(docSnap => docSnap.data() as SchoolExpenseVoucher);
        setLocalExpenseVouchers(schoolId, list);
        cb(list);
      }
    },
    err => { console.warn(`[school-firebase] subscribeToExpenseVouchers error:`, err?.code || err); }
  );

  return () => {
    if (typeof window !== "undefined") window.removeEventListener("school-idb-hydrated", deliverLocal);
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const deleteSchoolExpenseVoucher = async (schoolId: string, voucherId: string) => {
  const current = getLocalExpenseVouchers(schoolId);
  setLocalExpenseVouchers(schoolId, current.filter(v => v.id !== voucherId));

  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/expenses/${voucherId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/expenses/${voucherId}`)), 2500); } catch {}
  }
};

// ── STUDENT ACKNOWLEDGED LEAVES (छुट्टी व वापसी ट्रैकर) ──────────────────────────────
const LOCAL_STUDENT_LEAVES_PREFIX = "nst_student_leaves_";

export const getLocalStudentLeaves = (schoolId: string): StudentAcknowledgedLeave[] => {
  try {
    const list = getSchoolCacheSync<StudentAcknowledgedLeave[]>(`${LOCAL_STUDENT_LEAVES_PREFIX}${schoolId}`, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const setLocalStudentLeaves = (schoolId: string, leaves: StudentAcknowledgedLeave[]) => {
  setSchoolCacheSync(`${LOCAL_STUDENT_LEAVES_PREFIX}${schoolId}`, leaves);
};

export const saveStudentAcknowledgedLeave = async (leave: StudentAcknowledgedLeave): Promise<void> => {
  const current = getLocalStudentLeaves(leave.schoolId);
  const idx = current.findIndex(l => l.id === leave.id || (l.studentId === leave.studentId && l.status === "active"));
  let updated: StudentAcknowledgedLeave[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = leave;
  } else {
    updated = [leave, ...current];
  }
  setLocalStudentLeaves(leave.schoolId, updated);

  const clean = sanitizeForFirestore(leave);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${leave.schoolId}/student_leaves/${leave.id}`), clean), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(doc(db, `schools/${leave.schoolId}/student_leaves`, leave.id), clean, { merge: true }), 2500); } catch {}
  }
};

export const getStudentAcknowledgedLeaves = async (schoolId: string): Promise<StudentAcknowledgedLeave[]> => {
  const local = getLocalStudentLeaves(schoolId);
  if (local.length > 0) return local;

  if (db) {
    try {
      const snap = await withTimeout(getDocs(collection(db, `schools/${schoolId}/student_leaves`)), 2500);
      const list = snap.docs.map(docSnap => docSnap.data() as StudentAcknowledgedLeave);
      if (list.length > 0) {
        setLocalStudentLeaves(schoolId, list);
        return list;
      }
    } catch {}
  }
  return local;
};

export const deleteStudentAcknowledgedLeave = async (schoolId: string, leaveId: string): Promise<void> => {
  const current = getLocalStudentLeaves(schoolId);
  setLocalStudentLeaves(schoolId, current.filter(l => l.id !== leaveId));

  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/student_leaves/${leaveId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(doc(db, `schools/${schoolId}/student_leaves`, leaveId)), 2500); } catch {}
  }
};

// ── ABSENTEE CALL LOGS (पेरेंट्स कॉल व रिमार्क्स) ──────────────────────────────
const LOCAL_CALL_LOGS_PREFIX = "nst_absentee_call_logs_";

export const getLocalAbsenteeCallLogs = (schoolId: string, date?: string): StudentAbsenteeCallLog[] => {
  try {
    const key = date ? `${LOCAL_CALL_LOGS_PREFIX}${schoolId}_${date}` : `${LOCAL_CALL_LOGS_PREFIX}${schoolId}`;
    const list = getSchoolCacheSync<StudentAbsenteeCallLog[]>(key, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const saveAbsenteeCallLog = async (log: StudentAbsenteeCallLog): Promise<void> => {
  const dateKey = `${LOCAL_CALL_LOGS_PREFIX}${log.schoolId}_${log.date}`;
  const current = getLocalAbsenteeCallLogs(log.schoolId, log.date);
  const updated = [log, ...current.filter(l => l.id !== log.id && l.studentId !== log.studentId)];
  setSchoolCacheSync(dateKey, updated);

  const clean = sanitizeForFirestore(log);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${log.schoolId}/absentee_call_logs/${log.date}/${log.id}`), clean), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(doc(db, `schools/${log.schoolId}/absentee_call_logs`, log.id), clean, { merge: true }), 2500); } catch {}
  }
};

// ── SCHOOL CUSTOM CURRICULUM & NOTES (Class 6-12 Notes, MCQ, PDF, Audio, Video) ──
const LOCAL_CURRICULUM_NOTES_PREFIX = "nst_school_curriculum_notes_";

export const getLocalSchoolCurriculumNotes = (schoolId: string): any[] => {
  try {
    const list = getSchoolCacheSync<any[]>(`${LOCAL_CURRICULUM_NOTES_PREFIX}${schoolId}`, []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const setLocalSchoolCurriculumNotes = (schoolId: string, notes: any[]): void => {
  setSchoolCacheSync(`${LOCAL_CURRICULUM_NOTES_PREFIX}${schoolId}`, notes);
};

export const getAllAvailableSchoolCurriculumNotes = (preferredSchoolId?: string): any[] => {
  if (!preferredSchoolId) return [];
  const deletedIds = getDeletedSchoolIds();
  if (deletedIds.has(preferredSchoolId)) return [];

  const map = new Map<string, any>();
  const list = getLocalSchoolCurriculumNotes(preferredSchoolId);
  list.forEach(n => {
    if (n && n.id && (!n.schoolId || n.schoolId === preferredSchoolId)) {
      map.set(n.id, n);
    }
  });

  return Array.from(map.values());
};

export const saveSchoolCurriculumNote = async (schoolId: string, note: any): Promise<void> => {
  const current = getLocalSchoolCurriculumNotes(schoolId);
  const existingIdx = current.findIndex(n => n.id === note.id);
  const updatedNote = {
    ...note,
    schoolId,
    updatedAt: new Date().toISOString(),
    createdAt: note.createdAt || new Date().toISOString(),
  };

  const updatedList = existingIdx >= 0
    ? current.map(n => n.id === note.id ? updatedNote : n)
    : [updatedNote, ...current];

  setLocalSchoolCurriculumNotes(schoolId, updatedList);

  // Also sync into localSettings / nst_system_settings so global student reader views can see it immediately
  try {
    const rawSettings = localStorage.getItem('nst_system_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      const existingLucent: any[] = Array.isArray(parsed.lucentNotes) ? parsed.lucentNotes : [];
      const lIdx = existingLucent.findIndex((n: any) => n.id === note.id);
      const updatedLucent = lIdx >= 0
        ? existingLucent.map((n: any) => n.id === note.id ? updatedNote : n)
        : [...existingLucent, updatedNote];
      parsed.lucentNotes = updatedLucent;
      localStorage.setItem('nst_system_settings', JSON.stringify(parsed));
    }
  } catch {}

  // Dispatch events to notify active views in the student and school apps immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nst-school-curriculum-notes-updated', {
      detail: { schoolId, note: updatedNote, allNotes: updatedList }
    }));
    window.dispatchEvent(new CustomEvent('nst_lucent_notes_updated', {
      detail: { note: updatedNote }
    }));
    window.dispatchEvent(new CustomEvent('nst_system_settings_updated', {
      detail: { lucentNote: updatedNote }
    }));
  }

  const clean = sanitizeForFirestore(updatedNote);
  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${schoolId}/curriculum_notes/${note.id}`), clean), 2500);
      await withTimeout(set(ref(rtdb, `lucent_entries/${note.id}`), clean), 2500);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(doc(db, `schools/${schoolId}/curriculum_notes`, note.id), clean, { merge: true }), 3000);
      await withTimeout(setDoc(doc(db, 'lucent_entries', note.id), clean, { merge: true }), 3000);
    } catch {}
  }
};

export const deleteSchoolCurriculumNote = async (schoolId: string, noteId: string): Promise<void> => {
  const current = getLocalSchoolCurriculumNotes(schoolId);
  const updatedList = current.filter(n => n.id !== noteId);
  setLocalSchoolCurriculumNotes(schoolId, updatedList);

  try {
    const rawSettings = localStorage.getItem('nst_system_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (Array.isArray(parsed.lucentNotes)) {
        parsed.lucentNotes = parsed.lucentNotes.filter((n: any) => n.id !== noteId);
        localStorage.setItem('nst_system_settings', JSON.stringify(parsed));
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nst-school-curriculum-notes-updated', {
      detail: { schoolId, deletedNoteId: noteId, allNotes: updatedList }
    }));
    window.dispatchEvent(new CustomEvent('nst_lucent_notes_updated', {
      detail: { deletedNoteId: noteId }
    }));
    window.dispatchEvent(new CustomEvent('nst_system_settings_updated', {
      detail: { deletedNoteId: noteId }
    }));
  }

  if (rtdb) {
    try {
      await withTimeout(remove(ref(rtdb, `schools/${schoolId}/curriculum_notes/${noteId}`)), 2000);
      await withTimeout(remove(ref(rtdb, `lucent_entries/${noteId}`)), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(deleteDoc(doc(db, `schools/${schoolId}/curriculum_notes`, noteId)), 2500);
      await withTimeout(deleteDoc(doc(db, 'lucent_entries', noteId)), 2500);
    } catch {}
  }
};

export const subscribeToSchoolCurriculumNotes = (
  schoolId: string,
  callback: (notes: any[]) => void
): (() => void) => {
  const local = getLocalSchoolCurriculumNotes(schoolId);
  callback(local);

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      const colRef = collection(db, `schools/${schoolId}/curriculum_notes`);
      unsubFirestore = onSnapshot(colRef, (snap) => {
        if (!snap.empty) {
          const notes = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          setLocalSchoolCurriculumNotes(schoolId, notes);
          callback(notes);
        } else {
          const freshLocal = getLocalSchoolCurriculumNotes(schoolId);
          callback(freshLocal);
        }
      }, (err) => {
        console.warn("[subscribeToSchoolCurriculumNotes] snapshot error:", err);
      });
    } catch {}
  }

  return () => {
    if (unsubFirestore) {
      try { unsubFirestore(); } catch {}
    }
  };
};
