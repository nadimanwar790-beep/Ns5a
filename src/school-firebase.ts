// IIC×NSTA Smart School Ecosystem — Firebase CRUD Helpers
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, Timestamp, writeBatch, runTransaction
} from "firebase/firestore";
import { ref, set, get, onValue, update, remove, runTransaction as rtdbRunTransaction } from "firebase/database";
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

export const isDemoSessionId = (sessionId?: string | null): boolean => {
  if (!sessionId) return false;
  const s = String(sessionId).toLowerCase();
  return s === "demo_session_2026_27" || s.startsWith("demo_") || s.includes("demo");
};

export const isDemoSchoolId = (sid?: string | null): boolean => {
  if (!sid) return true;
  const s = String(sid).toLowerCase();
  return s === "demo_school" || s.startsWith("demo_") || s.includes("demo");
};

// Strict rule: Demo data is ONLY allowed when in an explicit Demo Session. Real sessions have ZERO dummy data!
export const shouldUseDemoForSchool = (schoolId?: string, sessionId?: string): boolean => {
  if (sessionId) {
    return isDemoSessionId(sessionId);
  }
  if (typeof localStorage !== "undefined" && schoolId) {
    try {
      const savedSess = localStorage.getItem(`nst_active_session_${schoolId}`);
      if (savedSess) {
        return isDemoSessionId(savedSess);
      }
    } catch {}
  }
  if (!isDemoDataEnabled()) {
    return false;
  }
  if (isDemoSchoolId(schoolId)) {
    return true;
  }
  return false;
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
  name: "Life Maker Public School",
  code: "LMPS",
  address: "Institutional Academic Campus, Educational Zone",
  phone: "0124-4125800",
  email: "contact@lifemaker.edu.in",
  affiliation: "Ummid Educational & Welfare Trust",
  adminEmail: "admin@lifemaker.edu.in",
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

const normalizeDefaultSchoolBrand = (sc: School): School => {
  if (!sc || typeof sc !== "object") return sc;
  const nameLower = String(sc.name || "").trim().toLowerCase();
  const codeUpper = String(sc.code || "").trim().toUpperCase();
  const isLegacyDefaultBrand =
    nameLower === "nstz" ||
    nameLower === "nstz smart academy" ||
    codeUpper === "NSTZ" ||
    (sc.id === "dps_gurgaon_sector45" && (nameLower === "delhi public school" || !nameLower));

  if (!isLegacyDefaultBrand) return sc;

  return {
    ...sc,
    name: "Life Maker Public School",
    code: !sc.code || codeUpper === "NSTZ" || codeUpper === "DPS_DEL" ? "LMPS" : sc.code,
    email: !sc.email || String(sc.email).toLowerCase().includes("nstz.") ? "contact@lifemaker.edu.in" : sc.email,
    adminEmail:
      !sc.adminEmail || String(sc.adminEmail).toLowerCase().includes("nstz.") || sc.adminEmail === "admin@dps.edu.in"
        ? "admin@lifemaker.edu.in"
        : sc.adminEmail,
    affiliation:
      !sc.affiliation || sc.affiliation === "Affiliated Education Center"
        ? "Ummid Educational & Welfare Trust"
        : sc.affiliation,
  };
};

export const getLocalSchools = (): School[] => {
  try {
    const deletedIds = getDeletedSchoolIds();
    const parsed = getSchoolCacheSync<School[]>(LOCAL_SCHOOLS_KEY, []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const filtered = parsed
        .filter((s: any) => s && typeof s === "object" && s.id && !deletedIds.has(s.id))
        .map((s: School) => {
          let updated = normalizeDefaultSchoolBrand(stripNestedSchoolCollections(s));
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

const normalizeSchoolPhotoAssets = async (target: any, schoolId: string) => {
  if (!target || typeof target !== "object") return;
  const directFields: Array<[string, string]> = [
    ["logoUrl", `logo_${schoolId}`],
    ["principalSignatureUrl", `sig_prin_${schoolId}`],
    ["directorSignatureUrl", `sig_dir_${schoolId}`],
    ["examControllerSignatureUrl", `sig_exam_${schoolId}`],
    ["managerSignatureUrl", `sig_mgr_${schoolId}`],
    ["accountantSignatureUrl", `sig_acc_${schoolId}`],
    ["principalPhotoUrl", `photo_prin_${schoolId}`],
    ["subPrincipalPhotoUrl", `photo_subprin_${schoolId}`],
    ["directorPhotoUrl", `photo_dir_${schoolId}`],
    ["managerPhotoUrl", `photo_mgr_${schoolId}`],
    ["digitalCreatorPhotoUrl", `photo_creator_${schoolId}`],
  ];
  for (const [field, prefix] of directFields) {
    if (target[field] && typeof target[field] === "string" && target[field].startsWith("data:image/")) {
      target[field] = await ensureCloudImageUrl(target[field], prefix);
    }
  }
  if (target.websiteConfig && typeof target.websiteConfig === "object") {
    const cfg = { ...target.websiteConfig };
    const cfgFields: Array<[string, string]> = [
      ["heroBannerUrl", `web_hero_${schoolId}`],
      ["subPrincipalPhotoUrl", `web_subprin_${schoolId}`],
      ["directorPhotoUrl", `web_dir_${schoolId}`],
      ["managerPhotoUrl", `web_mgr_${schoolId}`],
      ["websiteAccountantPhotoUrl", `web_acc_${schoolId}`],
      ["digitalCreatorPhotoUrl", `web_creator_${schoolId}`],
    ];
    for (const [field, prefix] of cfgFields) {
      if (cfg[field] && typeof cfg[field] === "string" && cfg[field].startsWith("data:image/")) {
        cfg[field] = await ensureCloudImageUrl(cfg[field], prefix);
      }
    }
    if (cfg.admissionOffer && Array.isArray(cfg.admissionOffer.images)) {
      const normalizedOfferImgs = [];
      for (let i = 0; i < cfg.admissionOffer.images.length; i++) {
        const im = cfg.admissionOffer.images[i];
        if (!im || typeof im !== "object") continue;
        let nextUrl = im.url;
        if (nextUrl && typeof nextUrl === "string" && nextUrl.startsWith("data:image/")) {
          nextUrl = await ensureCloudImageUrl(nextUrl, `web_offer_${schoolId}_${im.id || i}`);
        }
        normalizedOfferImgs.push({ ...im, url: nextUrl });
      }
      cfg.admissionOffer = { ...cfg.admissionOffer, images: normalizedOfferImgs };
    }
    target.websiteConfig = cfg;
  }
};

export const saveSchool = async (school: School) => {
  clearSchoolFromDeletedList(school.id);
  const cleanMeta = stripNestedSchoolCollections({ ...school });
  await normalizeSchoolPhotoAssets(cleanMeta, school.id);
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
    let updated = normalizeDefaultSchoolBrand(stripNestedSchoolCollections(sc));
    const sid = updated.id || schoolId;
    if (sid === "dps_gurgaon_sector45") {
      if (updated.address && updated.address.includes("Sector-45, Urban Estate, Gurgaon")) {
        updated.address = "Institutional Academic Campus, Educational Zone";
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

  const finalSchools = Array.from(mergedMap.values())
    .filter(s => !deletedIds.has(s.id))
    .map(normalizeDefaultSchoolBrand);
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
        if (val && (val.id || val.name)) cb(normalizeDefaultSchoolBrand(stripNestedSchoolCollections({ id: schoolId, ...val })));
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
          if (snap.exists()) cb(normalizeDefaultSchoolBrand(stripNestedSchoolCollections({ ...(snap.data() as School), id: schoolId })));
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
    const list = Array.from(map.values())
      .filter(s => !deletedIds.has(s.id))
      .map(normalizeDefaultSchoolBrand);
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
  await normalizeSchoolPhotoAssets(prepared, schoolId);

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

const isValidRealSessionRecord = (s: any, allowDemo = false): boolean => {
  if (!s || typeof s !== "object") return false;
  const id = String(s.id || "").trim();
  const name = String(s.name || "").trim();
  if (!id || !name) return false;
  if (!allowDemo && (isDemoSessionId(id) || isDemoRecord(s))) return false;
  return true;
};

const provisionedUpcomingSessions = new Set<string>();

const extractSessionYear = (s?: Partial<SchoolSession> | null): number | null => {
  const txt = `${s?.name || ""} ${s?.startDate || ""} ${s?.id || ""}`;
  const match = txt.match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
};

const buildDynamicSessionBounds = (date: Date = new Date()) => {
  const yr = date.getFullYear();
  const m = date.getMonth();
  const currentStartYear = m >= 3 ? yr : yr - 1;
  const endShort = String((currentStartYear + 1) % 100).padStart(2, "0");
  const nextStartYear = currentStartYear + 1;
  const nextEndShort = String((nextStartYear + 1) % 100).padStart(2, "0");
  return {
    currentStartYear,
    currentLabel: `${currentStartYear}-${endShort}`,
    nextStartYear,
    nextLabel: `${nextStartYear}-${nextEndShort}`,
    isOctToMarWindow: m >= 9 || m < 3,
  };
};

const ensureOctoberUpcomingSession = (
  schoolId: string,
  list: SchoolSession[],
  now: Date = new Date()
): SchoolSession[] => {
  if (!schoolId || isDemoSchoolId(schoolId) || !Array.isArray(list) || list.length === 0) {
    return list;
  }
  const { currentStartYear, nextStartYear, nextLabel, isOctToMarWindow } = buildDynamicSessionBounds(now);
  if (!isOctToMarWindow) return list;

  const activeItem = list.find((s) => s.active) || list[0];
  const activeStartYr = extractSessionYear(activeItem) ?? currentStartYear;
  const targetNextStartYr = Math.max(activeStartYr + 1, nextStartYear);
  const targetNextEndShort = String((targetNextStartYr + 1) % 100).padStart(2, "0");
  const targetNextLabel =
    targetNextStartYr === nextStartYear ? nextLabel : `${targetNextStartYr}-${targetNextEndShort}`;

  const alreadyExists = list.some((s) => {
    const sy = extractSessionYear(s);
    return (sy !== null && sy >= targetNextStartYr) || String(s.name || "").includes(targetNextLabel);
  });
  if (alreadyExists) return list;

  const nextSessId = `sess_${schoolId}_${targetNextStartYr}_${targetNextEndShort}`;
  const autoNextSession: SchoolSession = {
    id: nextSessId,
    schoolId,
    name: `Academic Session ${targetNextLabel}`,
    startDate: `${targetNextStartYr}-04-01`,
    endDate: `${targetNextStartYr + 1}-03-31`,
    active: false, // Keep current session active while auto-opening next session for admissions
    createdAt: new Date().toISOString(),
  };

  const guardKey = `${schoolId}_${targetNextStartYr}`;
  if (!provisionedUpcomingSessions.has(guardKey)) {
    provisionedUpcomingSessions.add(guardKey);
    saveSession(autoNextSession).catch(() => {
      provisionedUpcomingSessions.delete(guardKey);
    });
  }

  return [...list, autoNextSession];
};

export const getSessions = async (schoolId: string): Promise<SchoolSession[]> => {
  const isDemoSchool = isDemoSchoolId(schoolId);
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/sessions`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const list: SchoolSession[] = Object.values(val);
        const filtered = list.filter(s => isValidRealSessionRecord(s, isDemoSchool));
        if (filtered.length > 0) return ensureOctoberUpcomingSession(schoolId, filtered);
      }
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/sessions`)), 2500);
    const list = (snap as any).docs.map((docSnap: any) => docSnap.data() as SchoolSession);
    const filtered = list.filter((s: any) => isValidRealSessionRecord(s, isDemoSchool));
    if (filtered.length > 0) return ensureOctoberUpcomingSession(schoolId, filtered);
  } catch {}

  if (isDemoSchool && shouldUseDemoForSchool(schoolId)) {
    const demo = getDemoSchoolDataset(true);
    if (demo && demo.sessions && demo.sessions.length > 0) return demo.sessions;
    if (demo && demo.session) return [demo.session];
  }

  // Auto-provision current active session (and next session if Oct-Mar) for newly added schools
  const { currentStartYear, currentLabel } = buildDynamicSessionBounds();
  const currentEndShort = String((currentStartYear + 1) % 100).padStart(2, "0");
  const autoSession: SchoolSession = {
    id: `sess_${schoolId}_${currentStartYear}_${currentEndShort}`,
    schoolId,
    name: `Academic Session ${currentLabel}`,
    startDate: `${currentStartYear}-04-01`,
    endDate: `${currentStartYear + 1}-03-31`,
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveSession(autoSession).catch(() => {});
  return ensureOctoberUpcomingSession(schoolId, [autoSession]);
};

export const subscribeToSessions = (schoolId: string, cb: (sessions: SchoolSession[]) => void) => {
  const isDemoSchool = isDemoSchoolId(schoolId);
  let deliveredAny = false;
  let demoUnsub: (() => void) | null = null;

  if (isDemoSchool && shouldUseDemoForSchool(schoolId)) {
    deliveredAny = true;
    demoUnsub = subscribeDemoSessions(cb);
  }

  const ensureFallbackRealSession = () => {
    if (!deliveredAny && !isDemoSchool && schoolId) {
      const { currentStartYear, currentLabel } = buildDynamicSessionBounds();
      const currentEndShort = String((currentStartYear + 1) % 100).padStart(2, "0");
      const autoSession: SchoolSession = {
        id: `sess_${schoolId}_${currentStartYear}_${currentEndShort}`,
        schoolId,
        name: `Academic Session ${currentLabel}`,
        startDate: `${currentStartYear}-04-01`,
        endDate: `${currentStartYear + 1}-03-31`,
        active: true,
        createdAt: new Date().toISOString(),
      };
      deliveredAny = true;
      saveSession(autoSession).catch(() => {});
      cb(ensureOctoberUpcomingSession(schoolId, [autoSession]));
    }
  };

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/sessions`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const list: SchoolSession[] = Object.values(val);
          const filtered = list.filter(s => isValidRealSessionRecord(s, isDemoSchool));
          if (filtered.length > 0) {
            deliveredAny = true;
            cb(ensureOctoberUpcomingSession(schoolId, filtered));
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
            const filtered = list.filter(s => isValidRealSessionRecord(s, isDemoSchool));
            if (filtered.length > 0) {
              deliveredAny = true;
              cb(ensureOctoberUpcomingSession(schoolId, filtered));
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
  if (!sessionId || isDemoSessionId(sessionId)) {
    if (isDemoSessionId(sessionId)) {
      updateDemoSession(sessionId, data);
    }
    return;
  }
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
  const useDemo = shouldUseDemoForSchool(schoolId, sessionId);
  if (useDemo) {
    const demo = getDemoSchoolDataset(true);
    if (demo && demo.classes && demo.classes.length > 0) {
      const targetSess = sessionId || demo.session?.id;
      const filtered = targetSess
        ? demo.classes.filter(c => c.sessionId === targetSess)
        : demo.classes;
      const resolved = filtered.length > 0 ? filtered : demo.classes.filter(c => c.sessionId === demo.session?.id);
      return sortSchoolClasses(resolved.length > 0 ? resolved : demo.classes);
    }
  }

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
        const all = allRaw.filter(c => c && !isDemoRecord(c));
        setLocalClasses(schoolId, all);
        const filtered = sessionId ? all.filter(c => c.sessionId === sessionId) : all;
        return sortSchoolClasses(filtered);
      }
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/classes`)), 2500);
    const allRaw = (snap as any).docs.map((docSnap: any) => docSnap.data() as SchoolClass);
    const all = allRaw.filter((c: any) => c && !isDemoRecord(c));
    if (all.length > 0) {
      setLocalClasses(schoolId, all);
      return sortSchoolClasses(sessionId ? all.filter((c: any) => c.sessionId === sessionId) : all);
    }
  } catch {}

  return [];
};

export const subscribeToClasses = (schoolId: string, sessionId: string, cb: (classes: SchoolClass[]) => void) => {
  const useDemo = shouldUseDemoForSchool(schoolId, sessionId);
  const deliverLocal = () => {
    if (useDemo) {
      const demo = getDemoSchoolDataset(true);
      if (demo && demo.classes && demo.classes.length > 0) {
        const targetSess = sessionId || demo.session?.id;
        const filtered = targetSess ? demo.classes.filter(c => c.sessionId === targetSess) : demo.classes;
        const resolved = filtered.length > 0 ? filtered : demo.classes.filter(c => c.sessionId === demo.session?.id);
        cb(sortSchoolClasses(resolved.length > 0 ? resolved : demo.classes));
        return;
      }
    }
    const local = getLocalClasses(schoolId);
    const realClasses = local.filter(c => !isDemoRecord(c));
    const filtered = sessionId ? realClasses.filter(c => c.sessionId === sessionId) : realClasses;
    cb(sortSchoolClasses(filtered));
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
  }

  let rtdbUnsub: any = null;
  if (rtdb && !useDemo) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/classes`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const all: SchoolClass[] = Object.values(val);
          const cleanAll = all.filter(c => c && !isDemoRecord(c));
          setLocalClasses(schoolId, cleanAll);
          const filtered = sessionId ? cleanAll.filter(c => c.sessionId === sessionId) : cleanAll;
          cb(sortSchoolClasses(filtered));
        }
      });
    } catch {}
  }
  let fsUnsub: any = null;
  if (db && !useDemo) {
    try {
      fsUnsub = onSnapshot(
        query(col(`schools/${schoolId}/classes`), where("sessionId", "==", sessionId)),
        snap => {
          if (!snap.empty) {
            const list = snap.docs.map(docSnap => docSnap.data() as SchoolClass);
            const clean = list.filter(c => !isDemoRecord(c));
            cb(sortSchoolClasses(clean));
          } else {
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
    const demo = getDemoSchoolDataset(true);
    if (demo && demo.subjects && demo.subjects.length > 0) {
      return classId ? demo.subjects.filter(s => s.classId === classId) : demo.subjects;
    }
  }
  return [];
};

export const subscribeToSubjects = (schoolId: string, classId: string, cb: (subjects: SchoolSubject[]) => void) => {
  const useDemo = shouldUseDemoForSchool(schoolId);
  if (useDemo) {
    const demo = getDemoSchoolDataset(true);
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
const LOCAL_TEACHERS_PREFIX = "nst_school_teachers_";
const DELETED_TEACHERS_PREFIX = "nst_deleted_teachers_";
const LOCAL_STAFF_PREFIX = "nst_school_staff_";
const DELETED_STAFF_PREFIX = "nst_deleted_staff_";

export const isActiveSchoolTeacherRecord = (t: any): boolean => {
  if (!t || typeof t !== "object" || !t.id) return false;
  if (t.active === false || t.isDeleted === true) return false;
  const st = typeof t.status === "string" ? t.status.trim().toLowerCase() : "";
  if (st === "deleted" || st === "disabled" || st === "inactive" || st === "removed") return false;
  return true;
};

export const isActiveStaffRecord = (s: any): boolean => {
  if (!s || typeof s !== "object" || !s.id) return false;
  if (s.active === false || s.isDeleted === true) return false;
  const st = typeof s.status === "string" ? s.status.trim().toLowerCase() : "";
  if (st === "deleted" || st === "disabled" || st === "inactive" || st === "removed") return false;
  return true;
};

const readIdSetFromStores = (key: string): Set<string> => {
  const out = new Set<string>();
  try {
    const cached = getSchoolCacheSync<string[]>(key, []);
    if (Array.isArray(cached)) cached.forEach((id) => id && out.add(String(id)));
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) parsed.forEach((id) => id && out.add(String(id)));
      }
    }
  } catch {}
  return out;
};

const writeIdSetToStores = (key: string, setVal: Set<string>) => {
  const arr = Array.from(setVal);
  try {
    setSchoolCacheSync(key, arr);
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(arr));
    }
  } catch {}
};

export const getDeletedTeacherIds = (schoolId: string): Set<string> => {
  if (!schoolId) return new Set<string>();
  const combined = readIdSetFromStores(`${DELETED_TEACHERS_PREFIX}${schoolId}`);
  readIdSetFromStores(`${DELETED_STAFF_PREFIX}${schoolId}`).forEach((id) => combined.add(id));
  return combined;
};

const markTeacherDeletedLocally = (schoolId: string, teacherId: string) => {
  if (!schoolId || !teacherId) return;
  const tSet = readIdSetFromStores(`${DELETED_TEACHERS_PREFIX}${schoolId}`);
  tSet.add(teacherId);
  writeIdSetToStores(`${DELETED_TEACHERS_PREFIX}${schoolId}`, tSet);

  const sSet = readIdSetFromStores(`${DELETED_STAFF_PREFIX}${schoolId}`);
  sSet.add(teacherId);
  writeIdSetToStores(`${DELETED_STAFF_PREFIX}${schoolId}`, sSet);

  // Purge immediately from both teacher and staff caches
  try {
    const curTeachers = getSchoolCacheSync<SchoolTeacher[]>(`${LOCAL_TEACHERS_PREFIX}${schoolId}`, []);
    if (Array.isArray(curTeachers)) {
      const filteredT = curTeachers.filter((t: any) => t && t.id !== teacherId);
      setSchoolCacheSync(`${LOCAL_TEACHERS_PREFIX}${schoolId}`, filteredT);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`${LOCAL_TEACHERS_PREFIX}${schoolId}`, JSON.stringify(filteredT));
      }
    }
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      const rawT = localStorage.getItem(`${LOCAL_TEACHERS_PREFIX}${schoolId}`);
      if (rawT) {
        const parsedT = JSON.parse(rawT);
        if (Array.isArray(parsedT)) {
          localStorage.setItem(
            `${LOCAL_TEACHERS_PREFIX}${schoolId}`,
            JSON.stringify(parsedT.filter((t: any) => t && t.id !== teacherId))
          );
        }
      }
    }
  } catch {}

  try {
    const curStaff = getSchoolCacheSync<any[]>(`${LOCAL_STAFF_PREFIX}${schoolId}`, []);
    if (Array.isArray(curStaff)) {
      const filteredS = curStaff.filter((s: any) => s && s.id !== teacherId);
      setSchoolCacheSync(`${LOCAL_STAFF_PREFIX}${schoolId}`, filteredS);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`${LOCAL_STAFF_PREFIX}${schoolId}`, JSON.stringify(filteredS));
      }
    }
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      const rawS = localStorage.getItem(`${LOCAL_STAFF_PREFIX}${schoolId}`);
      if (rawS) {
        const parsedS = JSON.parse(rawS);
        if (Array.isArray(parsedS)) {
          localStorage.setItem(
            `${LOCAL_STAFF_PREFIX}${schoolId}`,
            JSON.stringify(parsedS.filter((s: any) => s && s.id !== teacherId))
          );
        }
      }
    }
  } catch {}
};

const clearTeacherDeletedLocally = (schoolId: string, teacherId: string) => {
  if (!schoolId || !teacherId) return;
  const tSet = readIdSetFromStores(`${DELETED_TEACHERS_PREFIX}${schoolId}`);
  if (tSet.delete(teacherId)) writeIdSetToStores(`${DELETED_TEACHERS_PREFIX}${schoolId}`, tSet);
  const sSet = readIdSetFromStores(`${DELETED_STAFF_PREFIX}${schoolId}`);
  if (sSet.delete(teacherId)) writeIdSetToStores(`${DELETED_STAFF_PREFIX}${schoolId}`, sSet);
};

export const setLocalTeachers = (schoolId: string, teachers: SchoolTeacher[]) => {
  if (!schoolId) return;
  const deletedIds = getDeletedTeacherIds(schoolId);
  const useDemo = shouldUseDemoForSchool(schoolId);
  const clean = (Array.isArray(teachers) ? teachers : []).filter(
    (t) => isActiveSchoolTeacherRecord(t) && !deletedIds.has(t.id) && (useDemo || !isDemoRecord(t))
  );
  try {
    setSchoolCacheSync(`${LOCAL_TEACHERS_PREFIX}${schoolId}`, clean);
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`${LOCAL_TEACHERS_PREFIX}${schoolId}`, JSON.stringify(clean));
    }
  } catch {}
};

export const getLocalTeachers = (schoolId: string): SchoolTeacher[] => {
  if (!schoolId) return [];
  const deletedIds = getDeletedTeacherIds(schoolId);
  const useDemo = shouldUseDemoForSchool(schoolId);
  let pool: SchoolTeacher[] = [];
  try {
    const idbList = getSchoolCacheSync<SchoolTeacher[]>(`${LOCAL_TEACHERS_PREFIX}${schoolId}`, []);
    if (Array.isArray(idbList) && idbList.length > 0) {
      pool = idbList;
    }
  } catch {}
  if (pool.length === 0) {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(`${LOCAL_TEACHERS_PREFIX}${schoolId}`) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) pool = parsed;
      }
    } catch {}
  }
  return pool.filter(
    (t) => isActiveSchoolTeacherRecord(t) && !deletedIds.has(t.id) && (useDemo || !isDemoRecord(t))
  );
};

export const saveTeacher = async (teacher: SchoolTeacher) => {
  clearTeacherDeletedLocally(teacher.schoolId, teacher.id);
  const prepared: SchoolTeacher = {
    ...teacher,
    active: teacher.active ?? true,
  };
  if (prepared.signatureUrl && typeof prepared.signatureUrl === "string" && prepared.signatureUrl.startsWith("data:image/")) {
    prepared.signatureUrl = await ensureCloudImageUrl(prepared.signatureUrl, `sig_tch_${teacher.id}`);
  }
  const sanitized = sanitizeForFirestore(prepared);

  // Immediately update local cache
  const current = getLocalTeachers(teacher.schoolId);
  setLocalTeachers(teacher.schoolId, [sanitized, ...current.filter((t) => t.id !== teacher.id)]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("teacher-updated", { detail: { schoolId: teacher.schoolId, teacher: sanitized } }));
  }

  if (rtdb) {
    try {
      await Promise.allSettled([
        withTimeout(set(ref(rtdb, `schools/${teacher.schoolId}/teachers/${teacher.id}`), sanitized), 2000),
        withTimeout(remove(ref(rtdb, `schools/${teacher.schoolId}/deleted_teachers/${teacher.id}`)), 2000),
        withTimeout(remove(ref(rtdb, `schools/${teacher.schoolId}/deleted_staff/${teacher.id}`)), 2000),
      ]);
    } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${teacher.schoolId}/teachers/${teacher.id}`), sanitized), 3000); } catch {}
  }
};

export const getTeachers = async (schoolId: string): Promise<SchoolTeacher[]> => {
  if (!schoolId) return [];
  const useDemo = shouldUseDemoForSchool(schoolId);
  const deletedIds = getDeletedTeacherIds(schoolId);
  const rawMap = new Map<string, SchoolTeacher>();
  let fsOk = false;
  let rtdbOk = false;

  const jobs: Promise<void>[] = [];

  if (rtdb) {
    jobs.push(
      withTimeout(get(ref(rtdb, `schools/${schoolId}/deleted_teachers`)), 2000)
        .then((snap: any) => {
          const val = snap?.val?.();
          if (val && typeof val === "object") {
            Object.keys(val).forEach((id) => id && deletedIds.add(id));
          }
        })
        .catch(() => {})
    );
    jobs.push(
      withTimeout(get(ref(rtdb, `schools/${schoolId}/deleted_staff`)), 2000)
        .then((snap: any) => {
          const val = snap?.val?.();
          if (val && typeof val === "object") {
            Object.keys(val).forEach((id) => id && deletedIds.add(id));
          }
        })
        .catch(() => {})
    );
    jobs.push(
      withTimeout(get(ref(rtdb, `schools/${schoolId}/teachers`)), 2500)
        .then((snap: any) => {
          rtdbOk = true;
          const val = snap?.val?.();
          if (val && typeof val === "object") {
            Object.entries(val).forEach(([k, v]: [string, any]) => {
              if (!v || typeof v !== "object") return;
              const tid = v.id || k;
              if (!tid || (!useDemo && isDemoRecord(v))) return;
              rawMap.set(tid, { ...v, id: tid, schoolId: v.schoolId || schoolId } as SchoolTeacher);
            });
          }
        })
        .catch(() => {})
    );
  }

  if (db) {
    jobs.push(
      withTimeout(getDocs(col(`schools/${schoolId}/teachers`)), 2500)
        .then((snap: any) => {
          fsOk = true;
          (snap?.docs || []).forEach((docSnap: any) => {
            const data = docSnap.data() as SchoolTeacher;
            const tid = data?.id || docSnap.id;
            if (!tid || (!useDemo && isDemoRecord(data))) return;
            const existing = rawMap.get(tid);
            if (existing) {
              const deletedEither = !isActiveSchoolTeacherRecord(existing) || !isActiveSchoolTeacherRecord(data);
              rawMap.set(tid, {
                ...existing,
                ...data,
                id: tid,
                schoolId: data?.schoolId || existing.schoolId || schoolId,
                active: deletedEither ? false : (data.active ?? existing.active),
                isDeleted: Boolean((existing as any).isDeleted || (data as any).isDeleted),
              } as SchoolTeacher);
            } else {
              rawMap.set(tid, { ...data, id: tid, schoolId: data?.schoolId || schoolId } as SchoolTeacher);
            }
          });
        })
        .catch(() => {})
    );
  }

  await Promise.all(jobs);

  if (fsOk || rtdbOk) {
    const activeList = Array.from(rawMap.values()).filter(
      (t) => isActiveSchoolTeacherRecord(t) && !deletedIds.has(t.id) && (useDemo || !isDemoRecord(t))
    );
    setLocalTeachers(schoolId, activeList);
    return activeList;
  }

  return getLocalTeachers(schoolId);
};

export const subscribeToTeachers = (schoolId: string, cb: (teachers: SchoolTeacher[]) => void) => {
  if (!schoolId) {
    cb([]);
    return () => {};
  }

  let hasFsSnapshot = false;
  let hasRtdbSnapshot = false;
  let fsDocsMap = new Map<string, SchoolTeacher>();
  let rtdbDocsMap = new Map<string, SchoolTeacher>();
  let rtdbDeletedTeacherIds = new Set<string>();
  let rtdbDeletedStaffIds = new Set<string>();
  const getCombinedRtdbDeleted = () => new Set<string>([...rtdbDeletedTeacherIds, ...rtdbDeletedStaffIds]);

  const computeAndDeliver = () => {
    const useDemo = shouldUseDemoForSchool(schoolId);
    const localDeleted = getDeletedTeacherIds(schoolId);
    const allDeleted = new Set<string>([...localDeleted, ...getCombinedRtdbDeleted()]);

    if (!hasFsSnapshot && !hasRtdbSnapshot) {
      const local = getLocalTeachers(schoolId).filter((t) => !allDeleted.has(t.id));
      cb(local);
      return;
    }

    const merged = new Map<string, SchoolTeacher>();
    rtdbDocsMap.forEach((t, id) => merged.set(id, t));
    fsDocsMap.forEach((t, id) => {
      const existing = merged.get(id);
      if (existing) {
        const deletedEither = !isActiveSchoolTeacherRecord(existing) || !isActiveSchoolTeacherRecord(t);
        merged.set(id, {
          ...existing,
          ...t,
          id,
          schoolId: t.schoolId || existing.schoolId || schoolId,
          active: deletedEither ? false : (t.active ?? existing.active),
          isDeleted: Boolean((existing as any).isDeleted || (t as any).isDeleted),
        } as SchoolTeacher);
      } else {
        merged.set(id, t);
      }
    });

    const cleanList = Array.from(merged.values()).filter(
      (t) => isActiveSchoolTeacherRecord(t) && !allDeleted.has(t.id) && (useDemo || !isDemoRecord(t))
    );
    setLocalTeachers(schoolId, cleanList);
    cb(cleanList);
  };

  // Deliver instant local cache immediately
  computeAndDeliver();

  const onLocalSyncEvent = (e: any) => {
    if (e?.detail?.schoolId && e.detail.schoolId !== schoolId) return;
    if (e?.type === "teacher-deleted" && e?.detail?.teacherId) {
      fsDocsMap.delete(e.detail.teacherId);
      rtdbDocsMap.delete(e.detail.teacherId);
      rtdbDeletedTeacherIds.add(e.detail.teacherId);
    }
    if (e?.type === "staff-deleted" && e?.detail?.staffId) {
      fsDocsMap.delete(e.detail.staffId);
      rtdbDocsMap.delete(e.detail.staffId);
      rtdbDeletedStaffIds.add(e.detail.staffId);
    }
    if (e?.type === "teacher-role-unassigned" && e?.detail?.teacherId) {
      fsDocsMap.delete(e.detail.teacherId);
      rtdbDocsMap.delete(e.detail.teacherId);
    }
    if ((e?.type === "teacher-updated" || e?.type === "teacher-restored") && e?.detail?.teacher?.id) {
      const t = e.detail.teacher as SchoolTeacher;
      rtdbDeletedTeacherIds.delete(t.id);
      rtdbDeletedStaffIds.delete(t.id);
      fsDocsMap.set(t.id, t);
      rtdbDocsMap.set(t.id, t);
    }
    computeAndDeliver();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", onLocalSyncEvent);
    window.addEventListener("teacher-deleted", onLocalSyncEvent);
    window.addEventListener("teacher-role-unassigned", onLocalSyncEvent);
    window.addEventListener("staff-deleted", onLocalSyncEvent);
    window.addEventListener("teacher-updated", onLocalSyncEvent);
    window.addEventListener("teacher-restored", onLocalSyncEvent);
    window.addEventListener("nst_demo_toggle_changed", onLocalSyncEvent);
  }

  let rtdbTeachersUnsub: any = null;
  let rtdbDeletedUnsub: any = null;
  let rtdbDeletedStaffUnsub: any = null;
  if (rtdb) {
    try {
      rtdbDeletedUnsub = onValue(ref(rtdb, `schools/${schoolId}/deleted_teachers`), (snap) => {
        const val = snap.val();
        const nextDel = new Set<string>();
        if (val && typeof val === "object") {
          Object.keys(val).forEach((k) => k && nextDel.add(k));
        }
        rtdbDeletedTeacherIds = nextDel;
        computeAndDeliver();
      });
    } catch {}
    try {
      rtdbDeletedStaffUnsub = onValue(ref(rtdb, `schools/${schoolId}/deleted_staff`), (snap) => {
        const val = snap.val();
        const nextDel = new Set<string>();
        if (val && typeof val === "object") {
          Object.keys(val).forEach((k) => k && nextDel.add(k));
        }
        rtdbDeletedStaffIds = nextDel;
        computeAndDeliver();
      });
    } catch {}
    try {
      rtdbTeachersUnsub = onValue(ref(rtdb, `schools/${schoolId}/teachers`), (snap) => {
        hasRtdbSnapshot = true;
        const val = snap.val();
        const nextMap = new Map<string, SchoolTeacher>();
        if (val && typeof val === "object") {
          Object.entries(val).forEach(([k, v]: [string, any]) => {
            if (!v || typeof v !== "object") return;
            const tid = v.id || k;
            if (tid) nextMap.set(tid, { ...v, id: tid, schoolId: v.schoolId || schoolId } as SchoolTeacher);
          });
        }
        rtdbDocsMap = nextMap;
        computeAndDeliver();
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col(`schools/${schoolId}/teachers`),
        (snap) => {
          hasFsSnapshot = true;
          const nextMap = new Map<string, SchoolTeacher>();
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data() as SchoolTeacher;
            const tid = data?.id || docSnap.id;
            if (tid) nextMap.set(tid, { ...data, id: tid, schoolId: data?.schoolId || schoolId });
          });
          fsDocsMap = nextMap;
          computeAndDeliver();
        },
        (err) => {
          console.warn(`[school-firebase] subscribeToTeachers error:`, err?.code || err);
          computeAndDeliver();
        }
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", onLocalSyncEvent);
      window.removeEventListener("teacher-deleted", onLocalSyncEvent);
      window.removeEventListener("teacher-role-unassigned", onLocalSyncEvent);
      window.removeEventListener("staff-deleted", onLocalSyncEvent);
      window.removeEventListener("teacher-updated", onLocalSyncEvent);
      window.removeEventListener("teacher-restored", onLocalSyncEvent);
      window.removeEventListener("nst_demo_toggle_changed", onLocalSyncEvent);
    }
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbTeachersUnsub === "function") rtdbTeachersUnsub();
    if (typeof rtdbDeletedUnsub === "function") rtdbDeletedUnsub();
    if (typeof rtdbDeletedStaffUnsub === "function") rtdbDeletedStaffUnsub();
  };
};

export const updateTeacher = async (schoolId: string, teacherId: string, data: Partial<SchoolTeacher>) => {
  const preparedData: any = { ...data };
  if (preparedData.signatureUrl && typeof preparedData.signatureUrl === "string" && preparedData.signatureUrl.startsWith("data:image/")) {
    preparedData.signatureUrl = await ensureCloudImageUrl(preparedData.signatureUrl, `sig_tch_${teacherId}`);
  }
  const sanitized = sanitizeForFirestore(preparedData);
  const st = typeof (data as any)?.status === "string" ? (data as any).status.toLowerCase() : "";
  const isSoftDelete =
    data?.active === false ||
    (data as any)?.isDeleted === true ||
    st === "deleted" ||
    st === "disabled" ||
    st === "inactive";

  if (isSoftDelete) {
    markTeacherDeletedLocally(schoolId, teacherId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("teacher-deleted", { detail: { schoolId, teacherId } }));
    }
  } else {
    const current = getLocalTeachers(schoolId);
    const updatedList = current.map((t) => (t.id === teacherId ? { ...t, ...sanitized } : t));
    setLocalTeachers(schoolId, updatedList);
    const updatedItem = updatedList.find((t) => t.id === teacherId);
    if (updatedItem && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("teacher-updated", { detail: { schoolId, teacher: updatedItem } }));
    }
  }

  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/teachers/${teacherId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${schoolId}/teachers/${teacherId}`), sanitized, { merge: true }), 3000); } catch {}
  }
  if (isSoftDelete) {
    import("./utils/faceRecognitionEngineV2")
      .then((m) => m.deleteFaceDescriptor(teacherId, schoolId))
      .catch(() => {});
  }
};

const LOCAL_RECYCLE_TEACHERS_PREFIX = "nst_school_recycle_teachers_";
const LOCAL_RECYCLE_STUDENTS_PREFIX = "nst_school_recycle_students_";

export const getLocalRecycleTeachers = (schoolId: string): Array<SchoolTeacher & { deletedAt?: string }> => {
  if (!schoolId) return [];
  try {
    const list = getSchoolCacheSync<any[]>(`${LOCAL_RECYCLE_TEACHERS_PREFIX}${schoolId}`, []);
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(`${LOCAL_RECYCLE_TEACHERS_PREFIX}${schoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
};

const setLocalRecycleTeachers = (schoolId: string, list: Array<SchoolTeacher & { deletedAt?: string }>) => {
  if (!schoolId) return;
  try { setSchoolCacheSync(`${LOCAL_RECYCLE_TEACHERS_PREFIX}${schoolId}`, list); } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`${LOCAL_RECYCLE_TEACHERS_PREFIX}${schoolId}`, JSON.stringify(list));
    }
  } catch {}
};

export const getLocalRecycleStudents = (schoolId: string): Array<SchoolStudent & { deletedAt?: string }> => {
  if (!schoolId) return [];
  try {
    const list = getSchoolCacheSync<any[]>(`${LOCAL_RECYCLE_STUDENTS_PREFIX}${schoolId}`, []);
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(`${LOCAL_RECYCLE_STUDENTS_PREFIX}${schoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
};

const setLocalRecycleStudents = (schoolId: string, list: Array<SchoolStudent & { deletedAt?: string }>) => {
  if (!schoolId) return;
  try { setSchoolCacheSync(`${LOCAL_RECYCLE_STUDENTS_PREFIX}${schoolId}`, list); } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`${LOCAL_RECYCLE_STUDENTS_PREFIX}${schoolId}`, JSON.stringify(list));
    }
  } catch {}
};

export const deleteTeacher = async (schoolId: string, teacherId: string) => {
  if (!schoolId || !teacherId) return;
  const deletedAt = new Date().toISOString();
  const deletePatch = {
    active: false,
    isDeleted: true,
    status: "deleted",
    deletedAt,
  };

  // 0. Capture full teacher snapshot before purging so it can be restored from Recycle Bin
  let teacherSnapshot: any = null;
  try {
    teacherSnapshot = getLocalTeachers(schoolId).find((t) => t.id === teacherId) || null;
  } catch {}
  if (!teacherSnapshot && rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/teachers/${teacherId}`)), 1500);
      if (snap && snap.exists()) teacherSnapshot = snap.val();
    } catch {}
  }
  if (!teacherSnapshot && db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/teachers/${teacherId}`)), 1500);
      if (snap && snap.exists()) teacherSnapshot = snap.data();
    } catch {}
  }

  const binRecord = sanitizeForFirestore({
    ...(teacherSnapshot || { id: teacherId, schoolId, name: "Removed Teacher" }),
    id: teacherId,
    schoolId,
    deletedAt,
    deletedEntityType: "teacher",
  });

  try {
    const curBin = getLocalRecycleTeachers(schoolId);
    setLocalRecycleTeachers(schoolId, [binRecord, ...curBin.filter((item) => item.id !== teacherId)]);
  } catch {}

  // 1. Immediately purge from all local caches + persist tombstone
  markTeacherDeletedLocally(schoolId, teacherId);

  // 2. Notify all active UI panels & Recycle Bin immediately (0ms)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("teacher-deleted", { detail: { schoolId, teacherId } }));
    window.dispatchEvent(new CustomEvent("staff-deleted", { detail: { schoolId, staffId: teacherId } }));
    window.dispatchEvent(new CustomEvent("recycle-bin-updated", { detail: { schoolId, type: "teacher", id: teacherId } }));
  }

  // 3. Remove from RTDB & write Recycle Bin snapshot + tombstones
  if (rtdb) {
    try {
      await Promise.allSettled([
        withTimeout(set(ref(rtdb, `schools/${schoolId}/recycle_bin_teachers/${teacherId}`), binRecord), 2500),
        withTimeout(remove(ref(rtdb, `schools/${schoolId}/teachers/${teacherId}`)), 2500),
        withTimeout(remove(ref(rtdb, `schools/${schoolId}/staff/${teacherId}`)), 2500),
        withTimeout(set(ref(rtdb, `schools/${schoolId}/deleted_teachers/${teacherId}`), { id: teacherId, deletedAt }), 2500),
        withTimeout(set(ref(rtdb, `schools/${schoolId}/deleted_staff/${teacherId}`), { id: teacherId, deletedAt }), 2500),
      ]);
    } catch {}
  }

  // 4. Write Recycle Bin doc & delete from active Firestore collections
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/recycle_bin_teachers/${teacherId}`), binRecord), 2500);
    } catch {}
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/teachers/${teacherId}`)), 3000);
    } catch {
      try {
        await withTimeout(setDoc(d(`schools/${schoolId}/teachers/${teacherId}`), deletePatch, { merge: true }), 3000);
      } catch {}
    }
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/staff/${teacherId}`)), 3000);
    } catch {
      try {
        await withTimeout(setDoc(d(`schools/${schoolId}/staff/${teacherId}`), deletePatch, { merge: true }), 3000);
      } catch {}
    }
  }

  // 5. Cleanup enrolled Face ID descriptor
  import("./utils/faceRecognitionEngineV2")
    .then((m) => m.deleteFaceDescriptor(teacherId, schoolId))
    .catch(() => {});
};

/**
 * Unassigns a Teacher record strictly when converting a Teacher into Accountant-Only
 * WITHOUT placing the ID in Recycle Bin or deleted_teachers/deleted_staff pools
 * and WITHOUT wiping StaffEmployee payroll/attendance or Face ID.
 */
export const unassignTeacherForAccountantRole = async (schoolId: string, teacherId: string) => {
  if (!schoolId || !teacherId) return;
  const current = getLocalTeachers(schoolId);
  setLocalTeachers(schoolId, current.filter((t) => t.id !== teacherId));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("teacher-role-unassigned", { detail: { schoolId, teacherId } }));
  }
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/teachers/${teacherId}`)), 2500); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/teachers/${teacherId}`)), 3000); } catch {}
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

const isActiveSchoolStudentRecord = (s: any): boolean => {
  if (!s || typeof s !== "object") return false;
  if (s.active === false || s.isDeleted === true || s.tcIssued === true) return false;
  const st = typeof s.status === "string" ? s.status.trim().toLowerCase() : "";
  if (st === "deleted" || st === "disabled" || st === "inactive") return false;
  return true;
};

export const getStudent = async (schoolId: string, studentId: string): Promise<SchoolStudent | null> => {
  // 1. Instant IndexedDB RAM cache lookup (only active students)
  const local = getLocalStudents(schoolId).find(
    (s: any) =>
      isActiveSchoolStudentRecord(s) &&
      (s.id === studentId || s.admissionNo === studentId || s.rollNo === studentId)
  );
  if (local) return local;

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/students/${studentId}`)), 2000);
      if (snap && snap.exists()) {
        const val = snap.val() as SchoolStudent;
        return isActiveSchoolStudentRecord(val) ? val : null;
      }
    } catch {}
  }
  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/students/${studentId}`)), 2500);
      if (snap && snap.exists()) {
        const data = snap.data() as SchoolStudent;
        return isActiveSchoolStudentRecord(data) ? data : null;
      }
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
      schoolName: "Life Maker Public School",
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
    const demo = getDemoSchoolDataset(true);
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

export const getActiveCloudStudents = async (
  schoolId: string
): Promise<{ students: SchoolStudent[]; cloudVerified: boolean; rawAllRecords: SchoolStudent[] }> => {
  if (!schoolId) return { students: [], cloudVerified: false, rawAllRecords: [] };
  const useDemo = shouldUseDemoForSchool(schoolId);
  const rawMap = new Map<string, SchoolStudent>();
  let fsOk = false;
  let rtdbOk = false;

  const jobs: Promise<void>[] = [];

  if (db) {
    jobs.push(
      withTimeout(getDocs(col(`schools/${schoolId}/students`)), 3500)
        .then((snap: any) => {
          fsOk = true;
          (snap?.docs || []).forEach((docSnap: any) => {
            const data = docSnap.data() as SchoolStudent;
            const sid = data?.id || docSnap.id;
            if (!sid) return;
            if (!useDemo && isDemoRecord(data)) return;
            rawMap.set(sid, { ...data, id: sid, schoolId: data?.schoolId || schoolId });
          });
        })
        .catch(() => {})
    );
  }

  if (rtdb) {
    jobs.push(
      withTimeout(get(ref(rtdb, `schools/${schoolId}/students`)), 3000)
        .then((snap: any) => {
          rtdbOk = true;
          const val = snap?.val?.();
          if (val && typeof val === "object") {
            Object.entries(val).forEach(([k, v]: [string, any]) => {
              if (!v || typeof v !== "object") return;
              const sid = v.id || k;
              if (!useDemo && isDemoRecord(v)) return;
              const existing = rawMap.get(sid);
              // If either RTDB or Firestore marks student deleted/inactive, preserve deletion flag cleanly
              if (existing) {
                const deletedEither = !isActiveSchoolStudentRecord(existing) || !isActiveSchoolStudentRecord(v);
                rawMap.set(sid, {
                  ...v,
                  ...existing,
                  id: sid,
                  schoolId: existing.schoolId || v.schoolId || schoolId,
                  active: deletedEither ? false : (existing.active ?? v.active),
                  isDeleted: Boolean((existing as any).isDeleted || (v as any).isDeleted),
                } as SchoolStudent);
              } else {
                rawMap.set(sid, { ...v, id: sid, schoolId: v.schoolId || schoolId } as SchoolStudent);
              }
            });
          }
        })
        .catch(() => {})
    );
  }

  await Promise.all(jobs);

  const cloudVerified = fsOk || rtdbOk;
  const rawAllRecords = Array.from(rawMap.values());
  const activeCloud = rawAllRecords.filter((s) => isActiveSchoolStudentRecord(s));

  if (cloudVerified) {
    setLocalStudents(schoolId, activeCloud);
    return { students: activeCloud, cloudVerified: true, rawAllRecords };
  }

  const localActive = getLocalStudents(schoolId).filter(
    (s) => isActiveSchoolStudentRecord(s) && (useDemo || !isDemoRecord(s))
  );
  return { students: localActive, cloudVerified: false, rawAllRecords: localActive };
};

export const getStudents = async (schoolId: string, classId?: string, className?: string, sessionId?: string): Promise<SchoolStudent[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId, sessionId);
  const local = getLocalStudents(schoolId);
  const matchingLocal = local.filter((s: any) => {
    if (!isActiveSchoolStudentRecord(s)) return false;
    if (classId && !isStudentInClass(s, classId, className)) return false;
    if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
    return true;
  });

  if (!useDemo) {
    const realLocal = matchingLocal.filter(s => !isDemoRecord(s));
    if (realLocal.length > 0) return realLocal;
    const { students: cloudStudents } = await getActiveCloudStudents(schoolId);
    if (cloudStudents.length > 0) {
      return cloudStudents.filter((s: any) => {
        if (classId && !isStudentInClass(s, classId, className)) return false;
        if (sessionId && s.sessionId && s.sessionId !== sessionId) return false;
        return true;
      });
    }
    return realLocal;
  }

  if (matchingLocal.length > 0) {
    return matchingLocal;
  }

  if (useDemo) {
    const demo = getDemoSchoolDataset(true);
    if (demo && demo.students && demo.students.length > 0) {
      const targetSess = sessionId || demo.session?.id;
      const sessFiltered = demo.students.filter(s => !targetSess || s.sessionId === targetSess);
      const basePool = sessFiltered.length > 0 ? sessFiltered : demo.students.filter(s => s.sessionId === demo.session?.id);
      const filteredDemo = basePool.filter(s => {
        if (!isActiveSchoolStudentRecord(s)) return false;
        if (classId && !isStudentInClass(s, classId, className)) return false;
        return true;
      });
      return filteredDemo;
    }
    return [];
  }

  const realLocal = matchingLocal.filter(s => !isDemoRecord(s));
  if (realLocal.length > 0) {
    return realLocal;
  }

  const { students: cloudStudents } = await getActiveCloudStudents(schoolId);
  if (cloudStudents.length > 0) {
    return cloudStudents.filter((s: any) => {
      if (isDemoRecord(s)) return false;
      if (classId && !isStudentInClass(s, classId, className)) return false;
      if (sessionId && s.sessionId !== sessionId) return false;
      return true;
    });
  }

  return realLocal;
};

export const subscribeToStudents = (schoolId: string, classId: string, cb: (students: SchoolStudent[]) => void, sessionId?: string) => {
  const useDemo = shouldUseDemoForSchool(schoolId, sessionId);
  const deliverLocal = () => {
    if (useDemo) {
      const demo = getDemoSchoolDataset(true);
      if (demo && demo.students && demo.students.length > 0) {
        const targetSess = sessionId || demo.session?.id;
        const sessFiltered = demo.students.filter(s => !targetSess || s.sessionId === targetSess);
        const basePool = sessFiltered.length > 0 ? sessFiltered : demo.students.filter(s => s.sessionId === demo.session?.id);
        const filteredDemo = basePool.filter(s => {
          if (s.active === false) return false;
          if (classId && !isStudentInClass(s, classId)) return false;
          return true;
        });
        cb(filteredDemo);
        return;
      }
    }
    const local = getLocalStudents(schoolId);
    const matchingLocal = local.filter(s => {
      if (s.active === false || isDemoRecord(s)) return false;
      if (classId && !isStudentInClass(s, classId)) return false;
      if (sessionId && s.sessionId !== sessionId) return false;
      return true;
    });
    cb(matchingLocal);
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
  }

  const fsUnsub = onSnapshot(
    query(col(`schools/${schoolId}/students`), where("active", "==", true)),
    snap => {
      if (useDemo) return;
      if (!snap.empty) {
        const all = snap.docs.map(docSnap => docSnap.data() as SchoolStudent).filter(s => !isDemoRecord(s));
        setLocalStudents(schoolId, all);
        let filtered = classId ? all.filter(s => isStudentInClass(s, classId)) : all;
        if (sessionId) {
          filtered = filtered.filter(s => s.sessionId === sessionId);
        }
        cb(filtered.sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true })));
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
    const demo = useDemo ? getDemoSchoolDataset(true) : null;
    if (!useDemo) {
      cb(local.filter(s => isActiveSchoolStudentRecord(s) && !isDemoRecord(s)));
    } else if (demo && demo.students && demo.students.length > 0) {
      const localMap = new Map(local.map(s => [s.id, s]));
      const primaryPool = demo.students.filter(s => !demo.session?.id || s.sessionId === demo.session.id);
      const basePool = primaryPool.length > 0 ? primaryPool : demo.students;
      const merged = basePool.map(s => localMap.get(s.id) || s);
      cb(merged.filter(s => isActiveSchoolStudentRecord(s)));
    } else {
      cb(local.filter(s => isActiveSchoolStudentRecord(s)));
    }
  };
  deliverLocal();

  const onLocalStudentSync = (e: any) => {
    if (e?.detail?.schoolId && e.detail.schoolId !== schoolId) return;
    deliverLocal();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", onLocalStudentSync);
    window.addEventListener("student-deleted", onLocalStudentSync);
    window.addEventListener("student-restored", onLocalStudentSync);
    window.addEventListener("student-updated", onLocalStudentSync);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/students`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const all = (Object.values(val) as SchoolStudent[]).filter(s => isActiveSchoolStudentRecord(s));
          const clean = !useDemo ? all.filter(s => !isDemoRecord(s)) : all;
          setLocalStudents(schoolId, clean);
          cb(clean);
        } else if (val === null) {
          setLocalStudents(schoolId, []);
          cb([]);
        }
      });
    } catch {}
  }

  const fsUnsub = onSnapshot(
    query(col(`schools/${schoolId}/students`), where("active", "==", true)),
    snap => {
      if (!snap.empty) {
        const all = snap.docs.map(docSnap => docSnap.data() as SchoolStudent).filter(s => isActiveSchoolStudentRecord(s));
        const clean = !useDemo ? all.filter(s => !isDemoRecord(s)) : all;
        setLocalStudents(schoolId, clean);
        cb(clean);
      }
    },
    err => { console.warn(`[school-firebase] subscribeToAllStudents error:`, err?.code || err); }
  );

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", onLocalStudentSync);
      window.removeEventListener("student-deleted", onLocalStudentSync);
      window.removeEventListener("student-restored", onLocalStudentSync);
      window.removeEventListener("student-updated", onLocalStudentSync);
    }
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
      if (isActiveSchoolStudentRecord(found)) {
        cb(found);
      } else {
        cb({ ...found, active: false, isDeleted: true, status: "deleted" } as any);
      }
    } else if (useDemo) {
      const demo = getDemoSchoolDataset(true);
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
  const handleStudentDeleted = (e: any) => {
    if (e.detail?.schoolId && e.detail.schoolId !== schoolId) return;
    if (e.detail?.studentId === studentId) {
      cb({ id: studentId, schoolId, active: false, isDeleted: true, status: "deleted" } as any);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
    window.addEventListener("student-updated", handleLocalUpdate);
    window.addEventListener("student-deleted", handleStudentDeleted);
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
      window.removeEventListener("student-deleted", handleStudentDeleted);
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
  const st = typeof (data as any)?.status === "string" ? (data as any).status.toLowerCase() : "";
  if (
    data?.active === false ||
    data?.tcIssued === true ||
    (data as any)?.isDeleted === true ||
    st === "deleted" ||
    st === "disabled" ||
    st === "inactive"
  ) {
    import("./utils/faceRecognitionEngineV2")
      .then((m) => m.deleteFaceDescriptor(studentId, schoolId))
      .catch(() => {});
  }
};

export const deleteStudent = async (schoolId: string, studentId: string) => {
  if (!schoolId || !studentId) return;
  const deletedAt = new Date().toISOString();
  const deletePatch = {
    active: false,
    isDeleted: true,
    status: "deleted",
    deletedAt,
  };

  // 0. Capture full student snapshot for Recycle Bin before removing from active list
  let studentSnapshot: any = null;
  try {
    studentSnapshot = getLocalStudents(schoolId).find((s) => s.id === studentId) || null;
  } catch {}
  if (!studentSnapshot && rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/students/${studentId}`)), 1500);
      if (snap && snap.exists()) studentSnapshot = snap.val();
    } catch {}
  }
  if (!studentSnapshot && db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/students/${studentId}`)), 1500);
      if (snap && snap.exists()) studentSnapshot = snap.data();
    } catch {}
  }

  const binRecord = sanitizeForFirestore({
    ...(studentSnapshot || { id: studentId, schoolId, name: "Removed Student" }),
    id: studentId,
    schoolId,
    deletedAt,
    deletedEntityType: "student",
  });

  try {
    const curBin = getLocalRecycleStudents(schoolId);
    setLocalRecycleStudents(schoolId, [binRecord, ...curBin.filter((item) => item.id !== studentId)]);
  } catch {}

  try {
    const local = getLocalStudents(schoolId);
    setLocalStudents(schoolId, local.filter(s => s.id !== studentId));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("student-deleted", { detail: { schoolId, studentId } }));
    window.dispatchEvent(new CustomEvent("recycle-bin-updated", { detail: { schoolId, type: "student", id: studentId } }));
  }
  if (rtdb) {
    try {
      await Promise.allSettled([
        withTimeout(set(ref(rtdb, `schools/${schoolId}/recycle_bin_students/${studentId}`), binRecord), 2500),
        withTimeout(update(ref(rtdb, `schools/${schoolId}/students/${studentId}`), deletePatch), 2000),
        withTimeout(set(ref(rtdb, `schools/${schoolId}/deleted_students/${studentId}`), { id: studentId, deletedAt }), 2000),
      ]);
    } catch {}
  }
  if (db) {
    try {
      await Promise.allSettled([
        withTimeout(setDoc(d(`schools/${schoolId}/recycle_bin_students/${studentId}`), binRecord), 2500),
        withTimeout(setDoc(d(`schools/${schoolId}/students/${studentId}`), deletePatch, { merge: true }), 2500),
      ]);
    } catch {}
  }
  import("./utils/faceRecognitionEngineV2")
    .then((m) => m.deleteFaceDescriptor(studentId, schoolId))
    .catch(() => {});
};

// ── RECYCLE BIN (DELETED TEACHERS & STUDENTS MANAGEMENT) ─────────────────────
export const subscribeToRecycleBin = (
  schoolId: string,
  cb: (data: {
    teachers: Array<SchoolTeacher & { deletedAt?: string }>;
    students: Array<SchoolStudent & { deletedAt?: string }>;
  }) => void
) => {
  if (!schoolId) {
    cb({ teachers: [], students: [] });
    return () => {};
  }

  let rtdbTeachersMap = new Map<string, SchoolTeacher & { deletedAt?: string }>();
  let fsTeachersMap = new Map<string, SchoolTeacher & { deletedAt?: string }>();
  let rtdbStudentsMap = new Map<string, SchoolStudent & { deletedAt?: string }>();
  let fsStudentsMap = new Map<string, SchoolStudent & { deletedAt?: string }>();
  let hasRtdbT = false;
  let hasFsT = false;
  let hasRtdbS = false;
  let hasFsS = false;

  const emit = () => {
    const localT = getLocalRecycleTeachers(schoolId);
    const localS = getLocalRecycleStudents(schoolId);

    const tMap = new Map<string, SchoolTeacher & { deletedAt?: string }>();
    if (!hasRtdbT && !hasFsT) {
      localT.forEach((t) => t?.id && tMap.set(t.id, t));
    } else {
      rtdbTeachersMap.forEach((t, id) => tMap.set(id, t));
      fsTeachersMap.forEach((t, id) => tMap.set(id, { ...(tMap.get(id) || {}), ...t }));
      // Keep any optimistic local additions created moments ago before cloud confirms
      localT.forEach((t) => {
        if (t?.id && !tMap.has(t.id) && t.deletedAt && Date.now() - Date.parse(t.deletedAt) < 8000) {
          tMap.set(t.id, t);
        }
      });
      setLocalRecycleTeachers(schoolId, Array.from(tMap.values()));
    }

    const sMap = new Map<string, SchoolStudent & { deletedAt?: string }>();
    if (!hasRtdbS && !hasFsS) {
      localS.forEach((s) => s?.id && sMap.set(s.id, s));
    } else {
      rtdbStudentsMap.forEach((s, id) => sMap.set(id, s));
      fsStudentsMap.forEach((s, id) => sMap.set(id, { ...(sMap.get(id) || {}), ...s }));
      localS.forEach((s) => {
        if (s?.id && !sMap.has(s.id) && s.deletedAt && Date.now() - Date.parse(s.deletedAt) < 8000) {
          sMap.set(s.id, s);
        }
      });
      setLocalRecycleStudents(schoolId, Array.from(sMap.values()));
    }

    const teachers = Array.from(tMap.values()).sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
    const students = Array.from(sMap.values()).sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
    cb({ teachers, students });
  };

  emit();

  const onBinEvent = (e: any) => {
    if (e?.detail?.schoolId && e.detail.schoolId !== schoolId) return;
    if (e?.detail?.removedId && e?.detail?.type === "teacher") {
      rtdbTeachersMap.delete(e.detail.removedId);
      fsTeachersMap.delete(e.detail.removedId);
    }
    if (e?.detail?.removedId && e?.detail?.type === "student") {
      rtdbStudentsMap.delete(e.detail.removedId);
      fsStudentsMap.delete(e.detail.removedId);
    }
    emit();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("recycle-bin-updated", onBinEvent);
    window.addEventListener("school-idb-hydrated", onBinEvent);
  }

  let unsubRtdbT: any = null;
  let unsubRtdbS: any = null;
  if (rtdb) {
    try {
      unsubRtdbT = onValue(ref(rtdb, `schools/${schoolId}/recycle_bin_teachers`), (snap) => {
        hasRtdbT = true;
        const val = snap?.val?.();
        const next = new Map<string, any>();
        if (val && typeof val === "object") {
          Object.entries(val).forEach(([k, v]: [string, any]) => {
            if (v && typeof v === "object") next.set(v.id || k, { ...v, id: v.id || k, schoolId: v.schoolId || schoolId });
          });
        }
        rtdbTeachersMap = next;
        emit();
      });
    } catch {}
    try {
      unsubRtdbS = onValue(ref(rtdb, `schools/${schoolId}/recycle_bin_students`), (snap) => {
        hasRtdbS = true;
        const val = snap?.val?.();
        const next = new Map<string, any>();
        if (val && typeof val === "object") {
          Object.entries(val).forEach(([k, v]: [string, any]) => {
            if (v && typeof v === "object") next.set(v.id || k, { ...v, id: v.id || k, schoolId: v.schoolId || schoolId });
          });
        }
        rtdbStudentsMap = next;
        emit();
      });
    } catch {}
  }

  let unsubFsT: any = null;
  let unsubFsS: any = null;
  if (db) {
    try {
      unsubFsT = onSnapshot(col(`schools/${schoolId}/recycle_bin_teachers`), (snap) => {
        hasFsT = true;
        const next = new Map<string, any>();
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const id = data?.id || docSnap.id;
          if (id) next.set(id, { ...data, id, schoolId: data?.schoolId || schoolId });
        });
        fsTeachersMap = next;
        emit();
      });
    } catch {}
    try {
      unsubFsS = onSnapshot(col(`schools/${schoolId}/recycle_bin_students`), (snap) => {
        hasFsS = true;
        const next = new Map<string, any>();
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const id = data?.id || docSnap.id;
          if (id) next.set(id, { ...data, id, schoolId: data?.schoolId || schoolId });
        });
        fsStudentsMap = next;
        emit();
      });
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("recycle-bin-updated", onBinEvent);
      window.removeEventListener("school-idb-hydrated", onBinEvent);
    }
    if (typeof unsubRtdbT === "function") unsubRtdbT();
    if (typeof unsubRtdbS === "function") unsubRtdbS();
    if (typeof unsubFsT === "function") unsubFsT();
    if (typeof unsubFsS === "function") unsubFsS();
  };
};

export const restoreTeacherFromRecycleBin = async (schoolId: string, teacherId: string): Promise<SchoolTeacher | null> => {
  if (!schoolId || !teacherId) return null;
  let snapshot: any = getLocalRecycleTeachers(schoolId).find((t) => t.id === teacherId) || null;
  if (!snapshot && rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/recycle_bin_teachers/${teacherId}`)), 2000);
      if (snap && snap.exists()) snapshot = snap.val();
    } catch {}
  }
  if (!snapshot && db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/recycle_bin_teachers/${teacherId}`)), 2000);
      if (snap && snap.exists()) snapshot = snap.data();
    } catch {}
  }
  if (!snapshot) return null;

  const { deletedAt: _d, deletedEntityType: _et, isDeleted: _id, ...cleanFields } = snapshot;
  const restoredTeacher: SchoolTeacher = {
    ...cleanFields,
    id: teacherId,
    schoolId,
    active: true,
    status: "active",
  };

  // Clear local & cloud tombstones and save restored teacher
  clearTeacherDeletedLocally(schoolId, teacherId);
  await saveTeacher(restoredTeacher);

  // Remove from Recycle Bin stores
  setLocalRecycleTeachers(schoolId, getLocalRecycleTeachers(schoolId).filter((t) => t.id !== teacherId));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("teacher-restored", { detail: { schoolId, teacher: restoredTeacher } }));
    window.dispatchEvent(new CustomEvent("recycle-bin-updated", { detail: { schoolId, type: "teacher", removedId: teacherId } }));
  }

  const cleanupTasks: Promise<any>[] = [];
  if (rtdb) {
    cleanupTasks.push(withTimeout(remove(ref(rtdb, `schools/${schoolId}/recycle_bin_teachers/${teacherId}`)), 2500).catch(() => {}));
  }
  if (db) {
    cleanupTasks.push(withTimeout(deleteDoc(d(`schools/${schoolId}/recycle_bin_teachers/${teacherId}`)), 2500).catch(() => {}));
  }
  await Promise.allSettled(cleanupTasks);
  return restoredTeacher;
};

export const restoreStudentFromRecycleBin = async (schoolId: string, studentId: string): Promise<SchoolStudent | null> => {
  if (!schoolId || !studentId) return null;
  let snapshot: any = getLocalRecycleStudents(schoolId).find((s) => s.id === studentId) || null;
  if (!snapshot && rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/recycle_bin_students/${studentId}`)), 2000);
      if (snap && snap.exists()) snapshot = snap.val();
    } catch {}
  }
  if (!snapshot && db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/recycle_bin_students/${studentId}`)), 2000);
      if (snap && snap.exists()) snapshot = snap.data();
    } catch {}
  }
  if (!snapshot && rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/students/${studentId}`)), 2000);
      if (snap && snap.exists()) snapshot = snap.val();
    } catch {}
  }
  if (!snapshot) return null;

  const { deletedAt: _d, deletedEntityType: _et, isDeleted: _id, ...cleanFields } = snapshot;
  const restoredStudent: SchoolStudent = sanitizeForFirestore({
    ...cleanFields,
    id: studentId,
    schoolId,
    active: true,
    isDeleted: false,
    status: "active",
  });

  // Update active students local cache + cloud
  const current = getLocalStudents(schoolId);
  setLocalStudents(schoolId, [restoredStudent, ...current.filter((s) => s.id !== studentId)]);
  setLocalRecycleStudents(schoolId, getLocalRecycleStudents(schoolId).filter((s) => s.id !== studentId));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("student-updated", { detail: { schoolId, studentId, data: restoredStudent } }));
    window.dispatchEvent(new CustomEvent("student-restored", { detail: { schoolId, student: restoredStudent } }));
    window.dispatchEvent(new CustomEvent("recycle-bin-updated", { detail: { schoolId, type: "student", removedId: studentId } }));
  }

  const tasks: Promise<any>[] = [];
  if (rtdb) {
    tasks.push(withTimeout(set(ref(rtdb, `schools/${schoolId}/students/${studentId}`), restoredStudent), 2500).catch(() => {}));
    tasks.push(withTimeout(remove(ref(rtdb, `schools/${schoolId}/deleted_students/${studentId}`)), 2500).catch(() => {}));
    tasks.push(withTimeout(remove(ref(rtdb, `schools/${schoolId}/recycle_bin_students/${studentId}`)), 2500).catch(() => {}));
  }
  if (db) {
    tasks.push(withTimeout(setDoc(d(`schools/${schoolId}/students/${studentId}`), restoredStudent), 2500).catch(() => {}));
    tasks.push(withTimeout(deleteDoc(d(`schools/${schoolId}/recycle_bin_students/${studentId}`)), 2500).catch(() => {}));
  }
  await Promise.allSettled(tasks);
  return restoredStudent;
};

export const permanentDeleteTeacherFromBin = async (schoolId: string, teacherId: string): Promise<void> => {
  if (!schoolId || !teacherId) return;
  setLocalRecycleTeachers(schoolId, getLocalRecycleTeachers(schoolId).filter((t) => t.id !== teacherId));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("recycle-bin-updated", { detail: { schoolId, type: "teacher", removedId: teacherId } }));
  }
  const tasks: Promise<any>[] = [];
  if (rtdb) {
    tasks.push(withTimeout(remove(ref(rtdb, `schools/${schoolId}/recycle_bin_teachers/${teacherId}`)), 2500).catch(() => {}));
  }
  if (db) {
    tasks.push(withTimeout(deleteDoc(d(`schools/${schoolId}/recycle_bin_teachers/${teacherId}`)), 2500).catch(() => {}));
  }
  await Promise.allSettled(tasks);
};

export const permanentDeleteStudentFromBin = async (schoolId: string, studentId: string): Promise<void> => {
  if (!schoolId || !studentId) return;
  setLocalRecycleStudents(schoolId, getLocalRecycleStudents(schoolId).filter((s) => s.id !== studentId));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("recycle-bin-updated", { detail: { schoolId, type: "student", removedId: studentId } }));
  }
  const tasks: Promise<any>[] = [];
  if (rtdb) {
    tasks.push(withTimeout(remove(ref(rtdb, `schools/${schoolId}/recycle_bin_students/${studentId}`)), 2500).catch(() => {}));
    tasks.push(withTimeout(remove(ref(rtdb, `schools/${schoolId}/students/${studentId}`)), 2500).catch(() => {}));
    tasks.push(withTimeout(remove(ref(rtdb, `schools/${schoolId}/deleted_students/${studentId}`)), 2500).catch(() => {}));
  }
  if (db) {
    tasks.push(withTimeout(deleteDoc(d(`schools/${schoolId}/recycle_bin_students/${studentId}`)), 2500).catch(() => {}));
    tasks.push(withTimeout(deleteDoc(d(`schools/${schoolId}/students/${studentId}`)), 2500).catch(() => {}));
  }
  await Promise.allSettled(tasks);
};

// ── ATTENDANCE ───────────────────────────────────────────────────────────────
const LOCAL_ATTENDANCE_PREFIX = "nst_school_attendance_";

export const getLocalAttendance = (schoolId: string): AttendanceRecord[] => {
  try {
    const list = getSchoolCacheSync<AttendanceRecord[]>(`${LOCAL_ATTENDANCE_PREFIX}${schoolId}`, []);
    if (!shouldUseDemoForSchool(schoolId)) {
      return Array.isArray(list) ? list.filter(r => !isDemoRecord(r)) : [];
    }
    if (Array.isArray(list) && list.length > 0) return list;
    const demo = getDemoSchoolDataset(true);
    if (demo && demo.attendanceRecords && demo.attendanceRecords.length > 0) {
      return demo.attendanceRecords;
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

  // 2. Dual parallel save to Firestore & RTDB with explicit cloud failure reporting
  let firestoreOk = false;
  let rtdbOk = false;
  let lastError: any = null;

  const writes: Promise<void>[] = [];

  if (db) {
    writes.push(
      withTimeout(setDoc(d(`schools/${record.schoolId}/attendance/${id}`), sanitized), 3000)
        .then(() => {
          firestoreOk = true;
        })
        .catch((e) => {
          lastError = e;
          console.warn("[school-firebase] saveAttendance Firestore failed:", e);
        })
    );
  }

  if (rtdb) {
    writes.push(
      withTimeout(set(ref(rtdb, `schools/${record.schoolId}/attendance/${id}`), sanitized), 3000)
        .then(() => {
          rtdbOk = true;
        })
        .catch((e) => {
          if (!lastError) lastError = e;
          console.warn("[school-firebase] saveAttendance RTDB failed:", e);
        })
    );
  }

  await Promise.allSettled(writes);

  if (!firestoreOk && !rtdbOk) {
    throw new Error(lastError?.message || "Cloud attendance write failed (both Firestore & RTDB unreachable).");
  }
};

export const getAttendance = async (schoolId: string, classId: string, date: string): Promise<AttendanceRecord | null> => {
  const id = `${classId}_${date}`;
  const local = getLocalAttendance(schoolId).find((r: any) => `${r.classId}_${r.date}` === id || (r.classId === classId && r.date === date));
  if (local) return local;

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/attendance/${id}`)), 2500);
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

export const getAllSchoolAttendance = async (schoolId: string): Promise<AttendanceRecord[]> => {
  const local = getLocalAttendance(schoolId);
  const byKey = new Map<string, AttendanceRecord>();
  local.forEach((r: any) => {
    if (r?.classId && r?.date) byKey.set(`${r.classId}_${r.date}`, r);
  });

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/attendance`)), 3500);
      if (snap?.docs) {
        snap.docs.forEach((docSnap: any) => {
          const r = docSnap.data() as AttendanceRecord;
          if (r?.classId && r?.date) byKey.set(`${r.classId}_${r.date}`, r);
        });
      }
    } catch {}
  }

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/attendance`)), 3000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        Object.values(val).forEach((r: any) => {
          if (r?.classId && r?.date && !byKey.has(`${r.classId}_${r.date}`)) {
            byKey.set(`${r.classId}_${r.date}`, r as AttendanceRecord);
          }
        });
      }
    } catch {}
  }

  const merged = Array.from(byKey.values());
  if (merged.length > 0) {
    setLocalAttendance(schoolId, merged);
  }
  return merged;
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

export const calculateStayDuration = (
  inTimeStr?: string,
  outTimeStr?: string,
  inTimestamp?: number,
  outTimestamp?: number
): string => {
  // Prefer accurate epoch timestamps (handles midnight rollover & multi-day shifts)
  if (
    typeof inTimestamp === "number" &&
    typeof outTimestamp === "number" &&
    Number.isFinite(inTimestamp) &&
    Number.isFinite(outTimestamp) &&
    outTimestamp >= inTimestamp
  ) {
    const diffMins = Math.floor((outTimestamp - inTimestamp) / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours > 0 ? `${hours}h ` : ""}${mins}m`;
  }

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
    if (inMins === null || outMins === null) return "";
    // Handle midnight rollover if outMins < inMins
    const diff = outMins >= inMins ? outMins - inMins : (24 * 60 - inMins) + outMins;
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
  cutoffTime?: string; // e.g. "09:30" (Late IN cutoff)
  outStartTime?: string; // e.g. "12:30" (Auto OUT dispersal start time)
  prayerTime?: string; // legacy alias
}): Promise<{
  success: boolean;
  message: string;
  action: "in" | "out";
  inTime?: string;
  outTime?: string;
  stayDuration?: string;
  isLate?: boolean;
  alreadyMarked?: boolean;
  tooEarlyForOut?: boolean;
  cloudSaved?: boolean;
  record?: AttendanceRecord;
}> => {
  const date = params.date || todayStr();
  const now = new Date();
  const nowMs = now.getTime();
  const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const docId = `${params.classId}_${date}`;

  if (!db && !rtdb) {
    return {
      success: false,
      action: "in",
      cloudSaved: false,
      message: "Firebase उपलब्ध नहीं है। क्लाउड सेविंग के बिना हाजिरी दर्ज नहीं की जा सकती।"
    };
  }

  try {
    const docRef = d(`schools/${params.schoolId}/attendance/${docId}`);
    let storedInCutoff: string | null = null;
    let storedOutStart: string | null = null;
    try {
      if (typeof window !== "undefined") {
        storedInCutoff = localStorage.getItem(`nst_kiosk_in_cutoff_${params.schoolId}`);
        storedOutStart = localStorage.getItem(`nst_kiosk_out_start_${params.schoolId}`);
      }
    } catch {}

    const cutoff = params.cutoffTime || storedInCutoff || "09:30";
    const [cutHourRaw, cutMinRaw] = cutoff.split(":").map(Number);
    const cutHour = Number.isFinite(cutHourRaw) ? cutHourRaw : 9;
    const cutMin = Number.isFinite(cutMinRaw) ? cutMinRaw : 30;
    const isPastCutoff = now.getHours() > cutHour || (now.getHours() === cutHour && now.getMinutes() > cutMin);

    let outStartMinutes = 12 * 60 + 30; // Default 12:30 PM
    let outStartRaw = params.outStartTime || storedOutStart || "";
    if (!outStartRaw && params.prayerTime) {
      const [pHour, pMin] = params.prayerTime.split(":").map(Number);
      outStartMinutes = (Number.isFinite(pHour) ? pHour : 9) * 60 + (Number.isFinite(pMin) ? pMin : 0) + 60;
      const oh = Math.floor(outStartMinutes / 60) % 24;
      const om = outStartMinutes % 60;
      outStartRaw = `${String(oh).padStart(2, "0")}:${String(om).padStart(2, "0")}`;
    } else {
      if (!outStartRaw) outStartRaw = "12:30";
      const [oH, oM] = outStartRaw.split(":").map(Number);
      outStartMinutes = (Number.isFinite(oH) ? oH : 12) * 60 + (Number.isFinite(oM) ? oM : 30);
    }

    const outPeriod = Math.floor(outStartMinutes / 60) >= 12 ? "PM" : "AM";
    const outHour12 = Math.floor(outStartMinutes / 60) % 12 === 0 ? 12 : Math.floor(outStartMinutes / 60) % 12;
    const outStart12h = `${String(outHour12).padStart(2, "0")}:${String(outStartMinutes % 60).padStart(2, "0")} ${outPeriod}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    type TxOutcome = {
      committed: boolean;
      result: {
        success: boolean;
        message: string;
        action: "in" | "out";
        inTime?: string;
        outTime?: string;
        stayDuration?: string;
        isLate?: boolean;
        alreadyMarked?: boolean;
        tooEarlyForOut?: boolean;
        cloudSaved?: boolean;
        record?: AttendanceRecord;
      };
    };

    // ── ATOMIC FIRESTORE TRANSACTION (with RTDB fallback if Firestore fails or auth is absent) ──
    const studentDocRef = d(`schools/${params.schoolId}/students/${params.studentId}`);
    const computeQrAttendanceOutcome = (
      existing: AttendanceRecord | null,
      stData: any | null
    ): TxOutcome => {
      if (stData) {
        const stStatus = typeof stData?.status === "string" ? stData.status.toLowerCase() : "";
        if (
          stData?.active === false ||
          stData?.isDeleted === true ||
          stData?.tcIssued === true ||
          stStatus === "deleted" ||
          stStatus === "disabled" ||
          stStatus === "inactive"
        ) {
          return {
            committed: false,
            result: {
              success: false,
              action: "in",
              alreadyMarked: false,
              cloudSaved: false,
              message: `⚠️ ${params.studentName || 'छात्र'} का खाता निष्क्रिय (Inactive / Deleted / TC Issued) है। हाजिरी दर्ज नहीं की जा सकती।`
            }
          };
        }
      }

      const studentsMap = existing?.students ? { ...existing.students } : {};
      const existingEntry = studentsMap[params.studentId];

      let action: "in" | "out" = "in";
      if (params.scanMode === "out") {
        action = "out";
      } else if (params.scanMode === "in") {
        action = "in";
      } else {
        if (!existingEntry?.inTime) {
          action = "in";
        } else if (!existingEntry?.outTime) {
          if (nowMinutes >= outStartMinutes) {
            action = "out";
          } else {
            return {
              committed: false,
              result: {
                success: true,
                action: "in",
                inTime: existingEntry.inTime,
                outTime: existingEntry.outTime,
                stayDuration: existingEntry.stayDuration,
                isLate: existingEntry.status === "late",
                alreadyMarked: true,
                tooEarlyForOut: true,
                cloudSaved: true,
                message: `⏳ ${params.studentName || 'छात्र'} का आगमन (IN) पहले से दर्ज है (${existingEntry.inTime})। ऑटो OUT ${outStart12h} के बाद लगेगा (अभी तुरंत छुट्टी लगाने के लिए ऊपर 'OUT' मोड चुनें)।`,
                record: existing || undefined
              }
            };
          }
        } else {
          action = "out";
        }
      }

      if (action === "in") {
        if (existingEntry?.inTime) {
          return {
            committed: false,
            result: {
              success: true,
              action: "in",
              inTime: existingEntry.inTime,
              outTime: existingEntry.outTime,
              stayDuration: existingEntry.stayDuration,
              isLate: existingEntry.status === "late",
              alreadyMarked: true,
              cloudSaved: true,
              message: `${params.studentName || 'छात्र'} का आगमन समय पहले से दर्ज है (${existingEntry.inTime})।`,
              record: existing || undefined
            }
          };
        }
      } else {
        if (existingEntry?.outTime) {
          return {
            committed: false,
            result: {
              success: true,
              action: "out",
              inTime: existingEntry.inTime,
              outTime: existingEntry.outTime,
              stayDuration: existingEntry.stayDuration,
              isLate: existingEntry.status === "late",
              alreadyMarked: true,
              cloudSaved: true,
              message: `${params.studentName || 'छात्र'} का प्रस्थान समय पहले से दर्ज है (${existingEntry.outTime})।`,
              record: existing || undefined
            }
          };
        }

        if (!existingEntry?.inTime) {
          return {
            committed: false,
            result: {
              success: false,
              action: "out",
              alreadyMarked: false,
              cloudSaved: false,
              message: `⚠️ ${params.studentName || 'छात्र'} का आज आगमन (IN) दर्ज नहीं है। प्रस्थान (OUT) से पहले आगमन (IN) आवश्यक है।`,
              record: existing || undefined
            }
          };
        }

        let elapsedMinutes: number | null = null;
        if (typeof existingEntry.inTimestamp === "number" && Number.isFinite(existingEntry.inTimestamp)) {
          elapsedMinutes = Math.floor((nowMs - existingEntry.inTimestamp) / 60000);
        } else if (existingEntry.inTime) {
          try {
            const inParts = existingEntry.inTime.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
            if (inParts) {
              let h = parseInt(inParts[1], 10);
              const m = parseInt(inParts[2], 10);
              const meridiem = (inParts[4] || "").toUpperCase();
              if (meridiem === "PM" && h < 12) h += 12;
              if (meridiem === "AM" && h === 12) h = 0;
              const inDate = new Date();
              inDate.setHours(h, m, 0, 0);
              elapsedMinutes = Math.floor((nowMs - inDate.getTime()) / 60000);
            }
          } catch {}
        }

        const requiredMinGap = params.scanMode === "out" ? 1 : 30;
        if (elapsedMinutes !== null && elapsedMinutes >= 0 && elapsedMinutes < requiredMinGap) {
          const remainingMin = requiredMinGap - elapsedMinutes;
          return {
            committed: false,
            result: {
              success: false,
              action: "out",
              alreadyMarked: true,
              tooEarlyForOut: true,
              cloudSaved: false,
              inTime: existingEntry.inTime,
              message: `⚠️ ${params.studentName || 'छात्र'} का आगमन अभी दर्ज हुआ है (${existingEntry.inTime})। प्रस्थान (OUT) ${requiredMinGap} मिनट बाद ही मान्य होगा (शेष: ${remainingMin} मिनट)।`,
              record: existing || undefined
            }
          };
        }
      }

      let inTime = existingEntry?.inTime;
      let outTime = existingEntry?.outTime;
      let inTimestamp = existingEntry?.inTimestamp;
      let outTimestamp = existingEntry?.outTimestamp;
      let stayDuration = existingEntry?.stayDuration;
      let isLate = existingEntry?.status === "late";
      let status: "present" | "late" | "half_day" | "absent" | "leave" | "bunk" = existingEntry?.status || "present";

      if (action === "in") {
        inTime = timeFormatted;
        inTimestamp = nowMs;
        if (isPastCutoff) {
          isLate = true;
          status = "late";
        } else {
          status = "present";
        }
      } else {
        outTime = timeFormatted;
        outTimestamp = nowMs;
        stayDuration = calculateStayDuration(inTime, outTime, inTimestamp, outTimestamp);
      }

      studentsMap[params.studentId] = {
        present: true,
        name: params.studentName || existingEntry?.name || "Student",
        rollNo: params.rollNo || existingEntry?.rollNo || "",
        inTime,
        outTime,
        inTimestamp,
        outTimestamp,
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

      const sanitizedRecord = sanitizeForFirestore(record);
      const message = action === "in"
        ? (isLate ? `Late Punch-In recorded at ${inTime}!` : `Entry Punch-In recorded at ${inTime}!`)
        : `Exit Punch-Out recorded at ${outTime}! Stay duration: ${stayDuration || 'Saved'}`;

      return {
        committed: true,
        result: {
          success: true,
          action,
          inTime,
          outTime,
          stayDuration,
          isLate,
          alreadyMarked: false,
          cloudSaved: true,
          message,
          record: sanitizedRecord
        }
      };
    };

    let txOutcome: TxOutcome | null = null;
    if (db) {
      try {
        txOutcome = await withTimeout(
          runTransaction(db, async (transaction) => {
            const [snap, studentSnap] = await Promise.all([
              transaction.get(docRef),
              transaction.get(studentDocRef),
            ]);
            const existing = snap.exists() ? (snap.data() as AttendanceRecord) : null;
            const stData = studentSnap.exists() ? studentSnap.data() : null;
            const outcome = computeQrAttendanceOutcome(existing, stData);
            if (outcome.committed && outcome.result.record) {
              transaction.set(docRef, outcome.result.record);
            }
            return outcome;
          }),
          4500
        );
      } catch (fsErr) {
        console.warn("[school-firebase] Firestore markStudentQrAttendance failed, trying RTDB fallback:", fsErr);
      }
    }

    // RTDB atomic fallback if Firestore failed (e.g. permission-denied for School PIN login) or unavailable
    if (!txOutcome && rtdb) {
      let latestOutcome: TxOutcome | null = null;
      const rtdbAttRef = ref(rtdb, `schools/${params.schoolId}/attendance/${docId}`);
      await withTimeout(
        rtdbRunTransaction(rtdbAttRef, (currentVal: any) => {
          const outcome = computeQrAttendanceOutcome(
            currentVal && typeof currentVal === "object" ? (currentVal as AttendanceRecord) : null,
            null
          );
          latestOutcome = outcome;
          if (outcome.committed && outcome.result.record) {
            return outcome.result.record;
          }
          return undefined;
        }),
        4500
      );
      txOutcome = latestOutcome;
    }

    if (!txOutcome) {
      throw new Error("क्लाउड डेटाबेस सेव असफल रहा। कृपया नेटवर्क जांच कर पुनः प्रयास करें।");
    }

    if (txOutcome.committed && txOutcome.result.record) {
      // Update local cache & mirror to RTDB only AFTER atomic transaction commits
      try {
        const current = getLocalAttendance(params.schoolId);
        const updated = [txOutcome.result.record, ...current.filter((r: any) => `${r.classId}_${r.date}` !== docId)];
        setLocalAttendance(params.schoolId, updated);
      } catch {}

      if (rtdb) {
        void set(ref(rtdb, `schools/${params.schoolId}/attendance/${docId}`), txOutcome.result.record).catch(() => {});
      }
    }

    return txOutcome.result;
  } catch (err: any) {
    console.error("[school-firebase] markStudentQrAttendance atomic transaction error:", err);
    return {
      success: false,
      action: "in",
      cloudSaved: false,
      message: err?.message || "क्लाउड डेटाबेस सेव असफल रहा। कृपया नेटवर्क जांच कर पुनः प्रयास करें।"
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

export const fetchStaffDailyAttendance = async (schoolId: string, date: string): Promise<StaffDailyAttendanceRecord> => {
  const key = `nst_staff_daily_att_${schoolId}_${date}`;
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `school_staff_attendance/${schoolId}/${date}`)), 2500);
      if (snap && snap.exists()) {
        const cloudData = snap.val() as StaffDailyAttendanceRecord;
        const normalized: StaffDailyAttendanceRecord = {
          schoolId,
          date,
          records: cloudData?.records || {},
        };
        try {
          localStorage.setItem(key, JSON.stringify(normalized));
        } catch {}
        return normalized;
      }
    } catch (e) {
      console.warn("[school-firebase] fetchStaffDailyAttendance cloud read failed:", e);
    }
  }
  return getStaffDailyAttendance(schoolId, date);
};

export const saveStaffDailyAttendance = async (
  rec: StaffDailyAttendanceRecord
): Promise<{ success: boolean; cloudSaved: boolean; error?: string }> => {
  const key = `nst_staff_daily_att_${rec.schoolId}_${rec.date}`;
  try {
    localStorage.setItem(key, JSON.stringify(rec));
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("staff-daily-attendance-updated", { detail: rec }));
  }

  let cloudSaved = false;
  let lastError = "";

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `school_staff_attendance/${rec.schoolId}/${rec.date}`), sanitizeForFirestore(rec)), 3000);
      cloudSaved = true;
    } catch (err: any) {
      lastError = err?.message || "RTDB staff attendance save failed";
      console.error("[school-firebase] saveStaffDailyAttendance RTDB error:", err);
    }
  } else {
    lastError = "Firebase RTDB unavailable";
  }

  if (db) {
    try {
      await withTimeout(
        setDoc(d(`schools/${rec.schoolId}/staff_attendance/${rec.date}`), sanitizeForFirestore(rec)),
        3000
      );
      cloudSaved = true;
    } catch (err: any) {
      if (!lastError) lastError = err?.message || "Firestore staff attendance save failed";
      console.warn("[school-firebase] saveStaffDailyAttendance Firestore error:", err);
    }
  }

  return {
    success: cloudSaved,
    cloudSaved,
    error: cloudSaved ? undefined : lastError,
  };
};

export const getMonthlyStaffDailyAttendance = async (
  schoolId: string,
  yearMonth: string
): Promise<Record<string, Record<string, any>>> => {
  if (!schoolId || !yearMonth) return {};
  const prefix = `${yearMonth}-`;
  const result: Record<string, Record<string, any>> = {};

  const mergeDateRecord = (dateStr: string, recs: Record<string, any> | undefined) => {
    if (!dateStr || !dateStr.startsWith(prefix) || !recs || typeof recs !== "object") return;
    if (!result[dateStr]) result[dateStr] = {};
    Object.entries(recs).forEach(([staffId, entry]) => {
      if (entry && typeof entry === "object") {
        result[dateStr][staffId] = { ...(result[dateStr][staffId] || {}), ...entry };
      }
    });
  };

  // 1. Seed from localStorage cache
  try {
    const lsPrefix = `nst_staff_daily_att_${schoolId}_${prefix}`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(lsPrefix)) {
        const dateStr = k.slice(`nst_staff_daily_att_${schoolId}_`.length);
        const parsed = JSON.parse(localStorage.getItem(k) || "{}");
        mergeDateRecord(dateStr, parsed?.records);
      }
    }
  } catch {}

  // 2. Merge RTDB records for school
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `school_staff_attendance/${schoolId}`)), 3000);
      if (snap && snap.exists()) {
        const val = snap.val() || {};
        Object.entries(val).forEach(([dateStr, dayRec]: [string, any]) => {
          if (dateStr.startsWith(prefix) && dayRec?.records) {
            mergeDateRecord(dateStr, dayRec.records);
          }
        });
      }
    } catch (e) {
      console.warn("[school-firebase] getMonthlyStaffDailyAttendance RTDB failed:", e);
    }
  }

  // 3. Merge Firestore records for school
  if (db) {
    try {
      const colSnap = await withTimeout(getDocs(collection(db, `schools/${schoolId}/staff_attendance`)), 3000);
      if (colSnap && !colSnap.empty) {
        colSnap.forEach((docSnap) => {
          const data = docSnap.data() as StaffDailyAttendanceRecord;
          const dateStr = data?.date || docSnap.id;
          if (dateStr.startsWith(prefix) && data?.records) {
            mergeDateRecord(dateStr, data.records);
          }
        });
      }
    } catch (e) {
      console.warn("[school-firebase] getMonthlyStaffDailyAttendance Firestore failed:", e);
    }
  }

  // 4. Refresh localStorage cache for synced dates
  try {
    Object.entries(result).forEach(([dateStr, records]) => {
      const key = `nst_staff_daily_att_${schoolId}_${dateStr}`;
      localStorage.setItem(key, JSON.stringify({ schoolId, date: dateStr, records }));
    });
  } catch {}

  return result;
};

export const markStaffAttendanceAtomic = async (params: {
  schoolId: string;
  staffId: string;
  staffName: string;
  role?: "TEACHER" | "ACCOUNTANT" | "STAFF" | "ADMIN";
  employeeId?: string;
  date?: string;
  scanMode?: "auto" | "in" | "out";
  currentShiftMode?: "in" | "out";
  cutoffTime?: string;
  outStartTime?: string;
}): Promise<{
  success: boolean;
  cloudSaved: boolean;
  action: "in" | "out";
  isLate?: boolean;
  alreadyMarked?: boolean;
  tooEarlyForOut?: boolean;
  inTime?: string;
  outTime?: string;
  stayDuration?: string;
  inTimestamp?: number;
  outTimestamp?: number;
  message: string;
  record?: StaffDailyAttendanceRecord;
}> => {
  const date = params.date || todayStr();
  const now = new Date();
  const nowMs = now.getTime();
  const timeFormatted = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  if (!rtdb) {
    return {
      success: false,
      cloudSaved: false,
      action: "in",
      message: "Firebase RTDB उपलब्ध नहीं है। क्लाउड सेविंग के बिना शिक्षक की हाजिरी दर्ज नहीं की जा सकती।",
    };
  }

  let storedCutoff: string | null = null;
  let storedOutStart: string | null = null;
  try {
    if (typeof window !== "undefined") {
      storedCutoff = localStorage.getItem(`nst_kiosk_in_cutoff_${params.schoolId}`);
      storedOutStart = localStorage.getItem(`nst_kiosk_out_start_${params.schoolId}`);
    }
  } catch {}
  const cutoffRaw = params.cutoffTime || storedCutoff || "08:15";
  const [cH, cM] = cutoffRaw.split(":").map(Number);
  const cutoffMinutes = (Number.isFinite(cH) ? cH : 8) * 60 + (Number.isFinite(cM) ? cM : 15);
  const outStartRaw = params.outStartTime || storedOutStart || "12:30";
  const [oH, oM] = outStartRaw.split(":").map(Number);
  const outStartMinutes = (Number.isFinite(oH) ? oH : 12) * 60 + (Number.isFinite(oM) ? oM : 30);
  const outPeriod = Math.floor(outStartMinutes / 60) >= 12 ? "PM" : "AM";
  const outHour12 = Math.floor(outStartMinutes / 60) % 12 === 0 ? 12 : Math.floor(outStartMinutes / 60) % 12;
  const outStart12h = `${String(outHour12).padStart(2, "0")}:${String(outStartMinutes % 60).padStart(2, "0")} ${outPeriod}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isPastCutoff = nowMinutes > cutoffMinutes;

  const dayRef = ref(rtdb, `school_staff_attendance/${params.schoolId}/${date}`);
  let rejectedOutcome: {
    success: boolean;
    alreadyMarked?: boolean;
    tooEarlyForOut?: boolean;
    action: "in" | "out";
    inTime?: string;
    outTime?: string;
    stayDuration?: string;
    message: string;
  } | null = null;

  try {
    const txRes = await withTimeout(
      rtdbRunTransaction(dayRef, (currentData: any) => {
        const dayObj: StaffDailyAttendanceRecord = currentData && typeof currentData === "object"
          ? {
              schoolId: currentData.schoolId || params.schoolId,
              date: currentData.date || date,
              records: currentData.records && typeof currentData.records === "object" ? { ...currentData.records } : {},
            }
          : { schoolId: params.schoolId, date, records: {} };

        const existingRec = dayObj.records[params.staffId];

        let action: "in" | "out" =
          params.scanMode === "out"
            ? "out"
            : params.scanMode === "in"
            ? "in"
            : (params.currentShiftMode || "in");

        if (params.scanMode === "auto") {
          if (!existingRec?.inTime) {
            action = "in";
          } else if (!existingRec?.outTime) {
            if (nowMinutes >= outStartMinutes) {
              action = "out";
            } else {
              rejectedOutcome = {
                success: true,
                alreadyMarked: true,
                tooEarlyForOut: true,
                action: "in",
                inTime: existingRec.inTime,
                outTime: existingRec.outTime,
                stayDuration: existingRec.stayDuration,
                message: `⏳ शिक्षक ${params.staffName} का IN पहले से दर्ज है (${existingRec.inTime})। ऑटो OUT ${outStart12h} के बाद लगेगा (तुरंत OUT के लिए 'OUT' मोड चुनें)।`,
              };
              return;
            }
          } else {
            action = "out";
          }
        }

        if (action === "in") {
          if (existingRec?.inTime) {
            rejectedOutcome = {
              success: true,
              alreadyMarked: true,
              action: "in",
              inTime: existingRec.inTime,
              outTime: existingRec.outTime,
              stayDuration: existingRec.stayDuration,
              message: `शिक्षक ${params.staffName} का आगमन (IN) पहले से दर्ज है (${existingRec.inTime})।`,
            };
            return; // Abort transaction cleanly
          }
        } else {
          if (!existingRec?.inTime) {
            rejectedOutcome = {
              success: false,
              alreadyMarked: false,
              action: "out",
              message: `⚠️ शिक्षक ${params.staffName} का आज आगमन (IN) दर्ज नहीं है। प्रस्थान (OUT) से पहले आगमन (IN) आवश्यक है।`,
            };
            return;
          }

          if (existingRec?.outTime) {
            rejectedOutcome = {
              success: true,
              alreadyMarked: true,
              action: "out",
              inTime: existingRec.inTime,
              outTime: existingRec.outTime,
              stayDuration: existingRec.stayDuration,
              message: `शिक्षक ${params.staffName} का प्रस्थान (OUT) पहले से दर्ज है (${existingRec.outTime})।`,
            };
            return;
          }

          let elapsedMinutes: number | null = null;
          if (typeof existingRec.inTimestamp === "number" && Number.isFinite(existingRec.inTimestamp)) {
            elapsedMinutes = Math.floor((nowMs - existingRec.inTimestamp) / 60000);
          } else if (existingRec.inTime) {
            try {
              const inParts = existingRec.inTime.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
              if (inParts) {
                let h = parseInt(inParts[1], 10);
                const m = parseInt(inParts[2], 10);
                const meridiem = (inParts[4] || "").toUpperCase();
                if (meridiem === "PM" && h < 12) h += 12;
                if (meridiem === "AM" && h === 12) h = 0;
                const inDate = new Date();
                inDate.setHours(h, m, 0, 0);
                elapsedMinutes = Math.floor((nowMs - inDate.getTime()) / 60000);
              }
            } catch {}
          }

          const requiredMinGap = params.scanMode === "out" ? 1 : 30;
          if (elapsedMinutes !== null && elapsedMinutes >= 0 && elapsedMinutes < requiredMinGap) {
            rejectedOutcome = {
              success: false,
              alreadyMarked: true,
              tooEarlyForOut: true,
              action: "out",
              inTime: existingRec.inTime,
              message: `⚠️ शिक्षक ${params.staffName} का आगमन अभी दर्ज हुआ है (${existingRec.inTime})। प्रस्थान ${requiredMinGap} मिनट बाद ही मान्य होगा (शेष: ${requiredMinGap - elapsedMinutes} मिनट)।`,
            };
            return;
          }
        }

        const inTime = action === "in" ? timeFormatted : existingRec!.inTime!;
        const inTimestamp = action === "in" ? nowMs : existingRec?.inTimestamp;
        const outTime = action === "out" ? timeFormatted : existingRec?.outTime;
        const outTimestamp = action === "out" ? nowMs : existingRec?.outTimestamp;
        const stayDuration =
          action === "out"
            ? calculateStayDuration(inTime, outTime, inTimestamp, outTimestamp)
            : existingRec?.stayDuration;

        const entryIsLate =
          action === "in"
            ? Boolean(isPastCutoff)
            : Boolean(existingRec?.status === "late" || (existingRec as any)?.isLate);
        const entryStatus = entryIsLate ? "late" : "present";

        dayObj.records[params.staffId] = sanitizeForFirestore({
          id: params.staffId,
          name: params.staffName,
          role: params.role || "TEACHER",
          employeeId: params.employeeId || "Faculty",
          present: true,
          status: entryStatus,
          isLate: entryIsLate,
          inTime,
          outTime,
          inTimestamp,
          outTimestamp,
          stayDuration,
          scanType: action,
        });

        rejectedOutcome = null;
        return dayObj;
      }),
      5000
    );

    if (rejectedOutcome) {
      const rej: {
        success: boolean;
        alreadyMarked?: boolean;
        tooEarlyForOut?: boolean;
        action: "in" | "out";
        inTime?: string;
        outTime?: string;
        stayDuration?: string;
        message: string;
      } = rejectedOutcome;
      return {
        ...rej,
        cloudSaved: Boolean(rej.alreadyMarked && !rej.tooEarlyForOut),
      };
    }

    if (!txRes.committed || !txRes.snapshot.exists()) {
      return {
        success: false,
        cloudSaved: false,
        action: "in",
        message: "शिक्षक की हाजिरी क्लाउड पर कमिट नहीं हो पाई। कृपया पुनः प्रयास करें।",
      };
    }

    const committedDay = txRes.snapshot.val() as StaffDailyAttendanceRecord;
    const savedEntry = committedDay.records?.[params.staffId];

    // Update localStorage cache & broadcast event ONLY after cloud transaction commits
    try {
      localStorage.setItem(`nst_staff_daily_att_${params.schoolId}_${date}`, JSON.stringify(committedDay));
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("staff-daily-attendance-updated", { detail: committedDay }));
    }
    if (db) {
      void setDoc(
        d(`schools/${params.schoolId}/staff_attendance/${date}`),
        sanitizeForFirestore(committedDay)
      ).catch(() => {});
    }

    const finalAction = (savedEntry?.scanType || "in") as "in" | "out";
    const finalIsLate = Boolean((savedEntry as any)?.isLate || savedEntry?.status === "late");
    return {
      success: true,
      cloudSaved: true,
      action: finalAction,
      isLate: finalIsLate,
      alreadyMarked: false,
      inTime: savedEntry?.inTime,
      outTime: savedEntry?.outTime,
      inTimestamp: savedEntry?.inTimestamp,
      outTimestamp: savedEntry?.outTimestamp,
      stayDuration: savedEntry?.stayDuration,
      message:
        finalAction === "in"
          ? finalIsLate
            ? `⚠️ शिक्षक ${params.staffName} का आगमन (Late) दर्ज हुआ (${savedEntry?.inTime})।`
            : `शिक्षक ${params.staffName} का आगमन (IN) दर्ज हुआ (${savedEntry?.inTime})।`
          : `शिक्षक ${params.staffName} का प्रस्थान (OUT) दर्ज हुआ (${savedEntry?.outTime})।`,
      record: committedDay,
    };
  } catch (err: any) {
    console.error("[school-firebase] markStaffAttendanceAtomic error:", err);
    return {
      success: false,
      cloudSaved: false,
      action: "in",
      message: err?.message || "शिक्षक की हाजिरी क्लाउड सेव असफल रही। कृपया दोबारा प्रयास करें।",
    };
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
      const demo = getDemoSchoolDataset(true);
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
    const demo = getDemoSchoolDataset(true);
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

  const demo = getDemoSchoolDataset(true);
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

  let rtdbUnsub: (() => void) | null = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/fees`), snap => {
        if (!snap.exists()) return;
        const val = snap.val() || {};
        const remoteList = Object.values(val)
          .filter((f: any) => f && f.studentId === studentId) as MonthlyFee[];
        if (remoteList.length > 0) {
          try {
            const cur = getLocalFees(schoolId);
            const mergedMap = new Map<string, MonthlyFee>();
            cur.forEach((f: any) => {
              const k = `${f.studentId}_${f.month || f.id || ""}`;
              mergedMap.set(k, f);
            });
            remoteList.forEach((rf: any) => {
              const k = `${rf.studentId}_${rf.month || rf.id || ""}`;
              const prev = mergedMap.get(k);
              if (!prev || rf.paid || rf.razorpayPaymentId || (rf.updatedAt && (!prev.updatedAt || rf.updatedAt > prev.updatedAt))) {
                mergedMap.set(k, rf);
              }
            });
            setLocalFees(schoolId, Array.from(mergedMap.values()));
          } catch {}
          cb(remoteList.sort((a, b) => (b.month || "").localeCompare(a.month || "")));
        }
      });
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverCurrent);
      window.removeEventListener("fee-updated", handleFeeUpdate);
    }
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
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
  const useDemo = shouldUseDemoForSchool(schoolId, sessionId);
  const local = getLocalFees(schoolId).filter(
    f => f.month === month && (!classId || isStudentInClass(f, classId)) && (!sessionId || f.sessionId === sessionId)
  );
  const demo = useDemo ? getDemoSchoolDataset(true) : null;
  let demoFees = (demo && demo.fees && demo.fees.length > 0)
    ? demo.fees.filter(
        f => f.month === month && (!classId || isStudentInClass(f, classId)) && (!sessionId || isDemoSessionId(sessionId) || f.sessionId === sessionId)
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

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/fees`)), 2000);
      if (snap.exists()) {
        let rtdbList = Object.values(snap.val() || {}) as MonthlyFee[];
        rtdbList = rtdbList.filter(f => f && f.month === month);
        if (classId) rtdbList = rtdbList.filter(f => isStudentInClass(f, classId));
        if (sessionId) rtdbList = rtdbList.filter(f => !f.sessionId || f.sessionId === sessionId);
        if (!useDemo) rtdbList = rtdbList.filter(f => !isDemoRecord(f));
        rtdbList.forEach(rf => {
          const prev = map.get(rf.studentId);
          if (!prev || rf.paid || rf.razorpayPaymentId || (rf.updatedAt && (!prev.updatedAt || rf.updatedAt > prev.updatedAt))) {
            map.set(rf.studentId, rf);
          }
        });
      }
    } catch {}
  }

  const result = Array.from(map.values()).sort((a, b) => (a.studentName || "").localeCompare(b.studentName || ""));
  return !useDemo ? result.filter(f => !isDemoRecord(f)) : result;
};

export const getAllMonthlyFees = getMonthlyFees;

export const getSchoolFeeHistory = async (schoolId: string, sessionId?: string): Promise<MonthlyFee[]> => {
  const useDemo = shouldUseDemoForSchool(schoolId, sessionId);
  const local = getLocalFees(schoolId);
  const demo = useDemo ? getDemoSchoolDataset(true) : null;
  let demoFees: MonthlyFee[] = (demo && demo.fees) ? demo.fees : [];
  if (sessionId && !isDemoSessionId(sessionId)) {
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

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/fees`)), 2000);
      if (snap.exists()) {
        let rtdbAll = Object.values(snap.val() || {}) as MonthlyFee[];
        if (sessionId) rtdbAll = rtdbAll.filter(af => !af.sessionId || af.sessionId === sessionId);
        if (!useDemo) rtdbAll = rtdbAll.filter(af => !isDemoRecord(af));
        rtdbAll.forEach((af: any) => {
          const key = af.studentId && af.month ? `${af.studentId}_${af.month}` : (af.receiptNo || af.id || String(Math.random()));
          const prev = feeMap.get(key);
          if (!prev || af.paid || af.razorpayPaymentId || (af.updatedAt && (!prev.updatedAt || af.updatedAt > prev.updatedAt))) {
            feeMap.set(key, af);
          }
        });
      }
    } catch {}
  }

  return Array.from(feeMap.values());
};

const getRawFeeDedupKey = (f: any): string => {
  const recNo = String(f?.receiptNo || f?.receiptNumber || "").trim().toUpperCase();
  const sId = String(f?.studentId || "").trim();
  if (recNo) {
    return `${sId}|REC|${recNo}`;
  }
  const isAdm = f?.feeType === "admission" || f?.receiptCategory === "admission";
  if (isAdm) {
    return `${sId}|ADM|${f?.month || f?.id || f?._docId || ""}`;
  }
  return `${sId}|MON|${f?.month || f?.id || f?._docId || Math.random()}`;
};

const pickNewerFeeRecord = (prev: any, next: any): any => {
  if (!prev) return next;
  const prevCancelled = String(prev.status || "").toUpperCase() === "CANCELLED" || prev.cancelled === true;
  const nextCancelled = String(next.status || "").toUpperCase() === "CANCELLED" || next.cancelled === true;
  if (nextCancelled && !prevCancelled) {
    return { ...prev, ...next, _docId: next._docId || prev._docId };
  }
  if (prevCancelled && !nextCancelled) {
    return { ...next, ...prev, _docId: prev._docId || next._docId };
  }
  if (next.updatedAt && (!prev.updatedAt || next.updatedAt > prev.updatedAt)) {
    return { ...prev, ...next, _docId: next._docId || prev._docId };
  }
  const prevPaid = Number(prev.paidAmount || (prev.paid ? prev.amount : 0) || 0);
  const nextPaid = Number(next.paidAmount || (next.paid ? next.amount : 0) || 0);
  if ((!prev.paid && next.paid) || nextPaid > prevPaid || (next.receiptNo && !prev.receiptNo)) {
    return { ...prev, ...next, _docId: next._docId || prev._docId };
  }
  return { ...next, ...prev, _docId: prev._docId || next._docId };
};

export const getAllSchoolFeeReceiptsRaw = async (schoolId: string): Promise<Array<MonthlyFee & {
  _docId?: string;
  _source?: string;
  _appId?: string;
  _isSynthetic?: boolean;
  admissionNo?: string;
  phone?: string;
  receiptNumber?: string;
}>> => {
  if (!schoolId) return [];
  const useDemo = shouldUseDemoForSchool(schoolId);
  const feeMap = new Map<string, any>();

  const upsert = (item: any) => {
    if (!item || typeof item !== "object") return;
    if (!useDemo && isDemoRecord(item)) return;
    const key = getRawFeeDedupKey(item);
    feeMap.set(key, pickNewerFeeRecord(feeMap.get(key), item));
  };

  // 1. Local IndexedDB cache (`nst_school_fees_<schoolId>`)
  try {
    const localFees = getLocalFees(schoolId);
    localFees.forEach((lf) => upsert({ ...lf, _source: "local_fees" }));
  } catch {}

  // 2. Legacy `school_fee_records_<schoolId>` localStorage key
  try {
    const rawLegacy = localStorage.getItem(`school_fee_records_${schoolId}`);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy);
      if (Array.isArray(parsed)) {
        parsed.forEach((rf) => upsert({ ...rf, _source: "legacy_local" }));
      }
    }
  } catch {}

  // 3. Fetch Firestore fees, RTDB fees, students, classes, and admission applications in parallel
  const [fsFees, rtdbFees, studentsList, classesList, applicationsList] = await Promise.all([
    (async () => {
      if (!db) return [] as any[];
      try {
        const snap = await withTimeout(getDocs(col(`schools/${schoolId}/fees`)), 3000);
        return snap.docs.map((docSnap) => ({
          ...(docSnap.data() as MonthlyFee),
          _docId: docSnap.id,
          _source: "fees_firestore",
        }));
      } catch {
        return [] as any[];
      }
    })(),
    (async () => {
      if (!rtdb) return [] as any[];
      try {
        const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/fees`)), 2500);
        if (!snap.exists()) return [] as any[];
        const val = snap.val() || {};
        return Object.entries(val)
          .filter(([, v]) => v && typeof v === "object")
          .map(([k, v]) => ({
            ...(v as MonthlyFee),
            _docId: k,
            _source: "fees_rtdb",
          }));
      } catch {
        return [] as any[];
      }
    })(),
    getStudents(schoolId).catch(() => getLocalStudents(schoolId)),
    getClasses(schoolId).catch(() => getLocalClasses(schoolId)),
    getAdmissionApplications(schoolId).catch(() => [] as any[]),
  ]);

  fsFees.forEach(upsert);
  rtdbFees.forEach(upsert);

  const studentById = new Map<string, SchoolStudent>();
  (studentsList || []).forEach((st) => {
    if (st?.id && (useDemo || !isDemoRecord(st))) {
      studentById.set(st.id, st);
    }
  });

  const classById = new Map<string, string>();
  (classesList || []).forEach((cls) => {
    if (cls?.id) {
      classById.set(cls.id, `${cls.name}${cls.section ? ` (${cls.section})` : ""}`.trim());
    }
  });

  // Track seen receipt numbers so synthetic fallbacks never duplicate real fee docs
  const seenReceiptNos = new Set<string>();
  feeMap.forEach((f) => {
    const rNo = String(f.receiptNo || f.receiptNumber || "").trim().toUpperCase();
    if (rNo) seenReceiptNos.add(rNo);
  });

  // 4. Fallback synthesis from Student admissionReceiptNo / admissionBalanceHistory / reAdmissionReceiptNo
  studentById.forEach((st) => {
    const clsName = st.className || classById.get(st.classId) || "";
    const admRec = String(st.admissionReceiptNo || "").trim();
    const admPaid = Number(st.admissionPaidAmount || 0);
    if (admRec && admPaid > 0 && !seenReceiptNos.has(admRec.toUpperCase()) && !(st as any).admissionReceiptCancelled) {
      seenReceiptNos.add(admRec.toUpperCase());
      upsert({
        schoolId,
        sessionId: st.sessionId || "",
        studentId: st.id,
        studentName: st.name,
        rollNo: st.rollNo || "",
        classId: st.classId || "",
        className: clsName,
        admissionNo: st.admissionNo || "",
        phone: st.phone || "",
        month: ((st as any).admissionDate || st.joinDate || st.createdAt || new Date().toISOString()).slice(0, 7),
        amount: Number(st.admissionTotalAmount || admPaid),
        paid: Number(st.admissionDueBalance || 0) <= 0,
        paidDate: (st as any).admissionDate || st.joinDate || st.createdAt,
        receiptNo: admRec,
        paidAmount: admPaid,
        balanceDue: Number(st.admissionDueBalance || 0),
        feeType: "admission",
        receiptCategory: "admission",
        paymentMode: "Counter / Admission",
        _source: "student_admission",
        _isSynthetic: true,
      });
    }

    if (Array.isArray(st.admissionBalanceHistory)) {
      st.admissionBalanceHistory.forEach((hist: any, idx: number) => {
        const hRec = String(hist?.receiptNo || "").trim();
        const hPaid = Number(hist?.paidAmount || 0);
        if (hRec && hPaid > 0 && !hist?.cancelled && !seenReceiptNos.has(hRec.toUpperCase())) {
          seenReceiptNos.add(hRec.toUpperCase());
          upsert({
            schoolId,
            sessionId: st.sessionId || "",
            studentId: st.id,
            studentName: st.name,
            rollNo: st.rollNo || "",
            classId: st.classId || "",
            className: clsName,
            admissionNo: st.admissionNo || "",
            phone: st.phone || "",
            month: String(hist.date || new Date().toISOString()).slice(0, 7),
            amount: hPaid,
            paid: true,
            paidDate: hist.date || new Date().toISOString().slice(0, 10),
            receiptNo: hRec,
            paidAmount: hPaid,
            feeType: "admission",
            receiptCategory: "admission",
            paymentMode: hist.paymentMode || "Cash",
            _source: "student_balance_history",
            _balHistoryIndex: idx,
            _isSynthetic: true,
          });
        }
      });
    }

    const readmRec = String(st.reAdmissionReceiptNo || "").trim();
    const readmPaid = Number(st.reAdmissionPaidAmount || 0);
    if (readmRec && readmPaid > 0 && !seenReceiptNos.has(readmRec.toUpperCase())) {
      seenReceiptNos.add(readmRec.toUpperCase());
      upsert({
        schoolId,
        sessionId: st.sessionId || "",
        studentId: st.id,
        studentName: st.name,
        rollNo: st.rollNo || "",
        classId: st.classId || "",
        className: clsName,
        admissionNo: st.admissionNo || "",
        phone: st.phone || "",
        month: (st.reAdmissionDate || new Date().toISOString()).slice(0, 7),
        amount: Number(st.reAdmissionFee || readmPaid),
        paid: true,
        paidDate: st.reAdmissionDate || st.createdAt,
        receiptNo: readmRec,
        paidAmount: readmPaid,
        feeType: "admission",
        receiptCategory: "admission",
        paymentMode: "Re-Admission",
        _source: "student_readmission",
        _isSynthetic: true,
      });
    }
  });

  // 5. Fallback synthesis from Admission Applications (`admissionFeeDetails`)
  (applicationsList || []).forEach((app: any) => {
    const det = app?.admissionFeeDetails;
    const aRec = String(det?.receiptNo || "").trim();
    const aPaid = Number(det?.paidAmount || 0);
    if (aRec && aPaid > 0 && !det?.cancelled && !seenReceiptNos.has(aRec.toUpperCase())) {
      seenReceiptNos.add(aRec.toUpperCase());
      const st = app.enrolledStudentId ? studentById.get(app.enrolledStudentId) : undefined;
      upsert({
        schoolId,
        sessionId: app.targetSessionId || st?.sessionId || "",
        studentId: app.enrolledStudentId || app.id,
        studentName: app.studentName || st?.name || "Student",
        rollNo: app.assignedRollNo || st?.rollNo || "",
        classId: app.classId || st?.classId || "",
        className: app.className || st?.className || classById.get(app.classId) || "",
        admissionNo: st?.admissionNo || app.applicationNo || "",
        phone: app.phone || st?.phone || "",
        month: String(det.paidDate || app.appliedAt || new Date().toISOString()).slice(0, 7),
        amount: Number(det.totalPayable || aPaid),
        paid: Number(det.balanceDue || 0) <= 0,
        paidDate: det.paidDate || app.appliedAt,
        receiptNo: aRec,
        paidAmount: aPaid,
        balanceDue: Number(det.balanceDue || 0),
        feeType: "admission",
        receiptCategory: "admission",
        paymentMode: det.paymentMode || "Cash",
        items: det.items,
        _appId: app.id,
        _source: "admission_application",
        _isSynthetic: true,
      });
    }
  });

  // Enrich missing metadata (className, admissionNo, phone, paymentMode)
  const list = Array.from(feeMap.values()).map((f) => {
    const st = f.studentId ? studentById.get(f.studentId) : undefined;
    const resolvedClassName = f.className || st?.className || classById.get(f.classId) || "";
    const resolvedPayMode = f.paymentMode || f.payModeInfo?.payMode || "Cash";
    return {
      ...f,
      id: f.id || f.receiptNo || f._docId || `${f.studentId}_${f.month || "fee"}`,
      className: resolvedClassName,
      rollNo: f.rollNo || st?.rollNo || "",
      admissionNo: f.admissionNo || st?.admissionNo || "",
      phone: f.phone || st?.phone || "",
      paymentMode: resolvedPayMode,
    };
  });

  return list.sort((a, b) => {
    const da = String(a.paidDate || a.updatedAt || a.month || "");
    const dbDate = String(b.paidDate || b.updatedAt || b.month || "");
    return dbDate.localeCompare(da);
  });
};

export const cancelSchoolFeeReceipt = async (
  schoolId: string,
  receipt: any,
  cancelDetails: {
    voucherNo: string;
    reason: string;
    remarks: string;
    refundMode: string;
    authorizedBy: string;
    refundAmount: number;
  }
): Promise<void> => {
  if (!schoolId || !receipt) return;
  const nowIso = new Date().toISOString();
  const targetRecNo = String(receipt.receiptNo || receipt.receiptNumber || "").trim();

  // Strip internal UI/meta keys before saving to Firestore/RTDB
  const cleanBase: Record<string, any> = {};
  Object.entries(receipt).forEach(([k, v]) => {
    if (!k.startsWith("_") && k !== "admissionNo" && k !== "phone" && k !== "receiptNumber") {
      cleanBase[k] = v;
    }
  });

  const cancelledRecord: MonthlyFee & Record<string, any> = {
    ...(cleanBase as MonthlyFee),
    schoolId,
    status: "CANCELLED",
    cancelled: true,
    paid: false,
    paidAmount: 0,
    cancelledAt: nowIso,
    cancellationReason: cancelDetails.reason,
    refundVoucherNo: cancelDetails.voucherNo,
    refundMode: cancelDetails.refundMode,
    refundRemarks: cancelDetails.remarks,
    authorizedBy: cancelDetails.authorizedBy,
    refundedAmount: cancelDetails.refundAmount,
    updatedAt: nowIso,
  };

  // 1. Update local cache `nst_school_fees_<schoolId>`
  try {
    const currentLocal = getLocalFees(schoolId);
    const isMatch = (f: any) => {
      if (targetRecNo && (f.receiptNo === targetRecNo || (f as any).receiptNumber === targetRecNo)) return true;
      if (receipt.id && f.id === receipt.id) return true;
      if (
        f.studentId === receipt.studentId &&
        f.month === receipt.month &&
        Boolean(f.feeType === "admission" || f.receiptCategory === "admission") ===
          Boolean(receipt.feeType === "admission" || receipt.receiptCategory === "admission")
      ) {
        return true;
      }
      return false;
    };
    const foundLocal = currentLocal.some(isMatch);
    const updatedLocal = foundLocal
      ? currentLocal.map((f) => (isMatch(f) ? { ...f, ...cancelledRecord } : f))
      : [cancelledRecord, ...currentLocal];
    setLocalFees(schoolId, updatedLocal);
  } catch {}

  // 2. Update Firestore & RTDB under BOTH canonical saveFee id and original _docId (if different)
  const sanitized = sanitizeForFirestore(cancelledRecord);
  const isAdmissionFee = cancelledRecord.feeType === "admission" || cancelledRecord.receiptCategory === "admission";
  const canonicalId = isAdmissionFee
    ? `${cancelledRecord.studentId}_adm_${cancelledRecord.receiptNo || cancelledRecord.month || Date.now()}`
    : `${cancelledRecord.studentId}_${cancelledRecord.month || cancelledRecord.receiptNo || Date.now()}`;
  const docIdsToUpdate = Array.from(
    new Set([canonicalId, receipt._docId].filter((x): x is string => Boolean(x && typeof x === "string")))
  );

  await Promise.allSettled(
    docIdsToUpdate.flatMap((docId) => [
      rtdb ? withTimeout(set(ref(rtdb, `schools/${schoolId}/fees/${docId}`), sanitized), 2500) : Promise.resolve(),
      db ? withTimeout(setDoc(d(`schools/${schoolId}/fees/${docId}`), sanitized, { merge: true }), 3000) : Promise.resolve(),
    ])
  );

  // 3. Update legacy `school_fee_records_<schoolId>` if present
  try {
    const legacyKey = `school_fee_records_${schoolId}`;
    const rawLegacy = localStorage.getItem(legacyKey);
    if (rawLegacy) {
      const legacyArr = JSON.parse(rawLegacy);
      if (Array.isArray(legacyArr)) {
        const updatedLegacy = legacyArr.map((f: any) => {
          if (
            (targetRecNo && (f.receiptNo === targetRecNo || f.receiptNumber === targetRecNo)) ||
            (receipt.id && f.id === receipt.id)
          ) {
            return { ...f, ...cancelledRecord };
          }
          return f;
        });
        localStorage.setItem(legacyKey, JSON.stringify(updatedLegacy));
      }
    }
  } catch {}

  // 4. Restore student admission dues / mark balance history entry cancelled if applicable
  if (receipt.studentId && (isAdmissionFee || (targetRecNo && targetRecNo.startsWith("ADM-")))) {
    try {
      const studentsList = await getStudents(schoolId).catch(() => getLocalStudents(schoolId));
      const matchedStudent = studentsList.find((s) => s.id === receipt.studentId);
      if (matchedStudent) {
        const studentPatch: Record<string, any> = {};
        if (targetRecNo && matchedStudent.admissionReceiptNo === targetRecNo && !(matchedStudent as any).admissionReceiptCancelled) {
          const curPaid = Number(matchedStudent.admissionPaidAmount || 0);
          const restoreAmt = Math.min(curPaid, Number(cancelDetails.refundAmount || 0));
          studentPatch.admissionPaidAmount = Math.max(0, curPaid - restoreAmt);
          if (cancelDetails.refundMode !== "ADJUST_FUTURE_DUES") {
            studentPatch.admissionDueBalance = Number(matchedStudent.admissionDueBalance || 0) + restoreAmt;
          }
          studentPatch.admissionReceiptCancelled = true;
          studentPatch.admissionRefundVoucherNo = cancelDetails.voucherNo;
        }
        if (targetRecNo && Array.isArray(matchedStudent.admissionBalanceHistory)) {
          let changedHist = false;
          const nextHist = matchedStudent.admissionBalanceHistory.map((h: any) => {
            if (h?.receiptNo === targetRecNo && !h.cancelled) {
              changedHist = true;
              return { ...h, cancelled: true, refundVoucherNo: cancelDetails.voucherNo, cancelledAt: nowIso };
            }
            return h;
          });
          if (changedHist) {
            studentPatch.admissionBalanceHistory = nextHist;
            if (cancelDetails.refundMode !== "ADJUST_FUTURE_DUES") {
              studentPatch.admissionDueBalance =
                Number(matchedStudent.admissionDueBalance || 0) + Number(cancelDetails.refundAmount || 0);
            }
          }
        }
        if (Object.keys(studentPatch).length > 0) {
          await updateStudent(schoolId, matchedStudent.id, studentPatch);
        }
      }
    } catch {}
  }

  // 5. Update admission_application if this receipt also exists inside admissionFeeDetails
  if (targetRecNo) {
    try {
      const apps = await getAdmissionApplications(schoolId).catch(() => [] as any[]);
      const matchingApp = apps.find(
        (a: any) =>
          (receipt._appId && a.id === receipt._appId) ||
          (a?.admissionFeeDetails?.receiptNo === targetRecNo && !a?.admissionFeeDetails?.cancelled)
      );
      if (matchingApp && matchingApp.admissionFeeDetails) {
        await saveAdmissionApplication(schoolId, {
          ...matchingApp,
          admissionFeeDetails: {
            ...matchingApp.admissionFeeDetails,
            cancelled: true,
            refundVoucherNo: cancelDetails.voucherNo,
            cancelledAt: nowIso,
          } as any,
        });
      }
    } catch {}
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fee-updated", {
        detail: { schoolId, studentId: receipt.studentId, fee: sanitized },
      })
    );
  }
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

export const markFeePaid = async (
  schoolId: string,
  studentId: string,
  month: string,
  paidBy: string,
  collectorInfo?: {
    collectedBy?: string;
    collectedByRole?: "accountant" | "manager";
    collectedByName?: string;
    collectorSignatureUrl?: string;
  }
) => {
  const id = `${studentId}_${month}`;
  const patch: Record<string, any> = {
    paid: true,
    paidDate: new Date().toISOString(),
    paidBy,
    receiptNo: `RCP-${Date.now()}`
  };
  if (collectorInfo?.collectedBy) patch.collectedBy = collectorInfo.collectedBy;
  if (collectorInfo?.collectedByRole) patch.collectedByRole = collectorInfo.collectedByRole;
  if (collectorInfo?.collectedByName) patch.collectedByName = collectorInfo.collectedByName;
  if (collectorInfo?.collectorSignatureUrl) patch.collectorSignatureUrl = collectorInfo.collectorSignatureUrl;
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
export const setLocalStaffEmployees = (schoolId: string, staffList: import('./school-types').StaffEmployee[]) => {
  if (!schoolId) return;
  const deletedIds = getDeletedTeacherIds(schoolId);
  const useDemo = shouldUseDemoForSchool(schoolId);
  const clean = (Array.isArray(staffList) ? staffList : []).filter(
    (s) => isActiveStaffRecord(s) && !deletedIds.has(s.id) && (useDemo || !isDemoRecord(s))
  );
  try {
    setSchoolCacheSync(`${LOCAL_STAFF_PREFIX}${schoolId}`, clean);
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`${LOCAL_STAFF_PREFIX}${schoolId}`, JSON.stringify(clean));
    }
  } catch {}
};

export const getLocalStaffEmployees = (schoolId: string): import('./school-types').StaffEmployee[] => {
  if (!schoolId) return [];
  const deletedIds = getDeletedTeacherIds(schoolId);
  const useDemo = shouldUseDemoForSchool(schoolId);
  let pool: import('./school-types').StaffEmployee[] = [];
  try {
    const idbList = getSchoolCacheSync<import('./school-types').StaffEmployee[]>(`${LOCAL_STAFF_PREFIX}${schoolId}`, []);
    if (Array.isArray(idbList) && idbList.length > 0) pool = idbList;
  } catch {}
  if (pool.length === 0) {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(`${LOCAL_STAFF_PREFIX}${schoolId}`) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) pool = parsed;
      }
    } catch {}
  }
  return pool.filter(
    (s) => isActiveStaffRecord(s) && !deletedIds.has(s.id) && (useDemo || !isDemoRecord(s))
  );
};

export const saveStaffEmployee = async (staff: import('./school-types').StaffEmployee) => {
  clearTeacherDeletedLocally(staff.schoolId, staff.id);
  const prepared = { ...staff, active: staff.active ?? true };
  const sanitized = sanitizeForFirestore(prepared);

  const cur = getLocalStaffEmployees(staff.schoolId);
  setLocalStaffEmployees(staff.schoolId, [sanitized, ...cur.filter((s) => s.id !== staff.id)]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("staff-updated", { detail: { schoolId: staff.schoolId, staff: sanitized } }));
  }

  if (rtdb) {
    try {
      await Promise.allSettled([
        withTimeout(set(ref(rtdb, `schools/${staff.schoolId}/staff/${staff.id}`), sanitized), 2000),
        withTimeout(remove(ref(rtdb, `schools/${staff.schoolId}/deleted_staff/${staff.id}`)), 2000),
      ]);
    } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${staff.schoolId}/staff/${staff.id}`), sanitized), 3000); } catch {}
  }
};

export const getStaffEmployees = async (schoolId: string): Promise<import('./school-types').StaffEmployee[]> => {
  if (!schoolId) return [];
  const useDemo = shouldUseDemoForSchool(schoolId);
  const deletedIds = getDeletedTeacherIds(schoolId);
  const rawMap = new Map<string, import('./school-types').StaffEmployee>();
  let fsOk = false;
  let rtdbOk = false;

  const jobs: Promise<void>[] = [];

  if (rtdb) {
    jobs.push(
      withTimeout(get(ref(rtdb, `schools/${schoolId}/deleted_staff`)), 2000)
        .then((snap: any) => {
          const val = snap?.val?.();
          if (val && typeof val === "object") Object.keys(val).forEach((id) => id && deletedIds.add(id));
        })
        .catch(() => {})
    );
    jobs.push(
      withTimeout(get(ref(rtdb, `schools/${schoolId}/deleted_teachers`)), 2000)
        .then((snap: any) => {
          const val = snap?.val?.();
          if (val && typeof val === "object") Object.keys(val).forEach((id) => id && deletedIds.add(id));
        })
        .catch(() => {})
    );
    jobs.push(
      withTimeout(get(ref(rtdb, `schools/${schoolId}/staff`)), 2500)
        .then((snap: any) => {
          rtdbOk = true;
          const val = snap?.val?.();
          if (val && typeof val === "object") {
            Object.entries(val).forEach(([k, v]: [string, any]) => {
              if (!v || typeof v !== "object") return;
              const sid = v.id || k;
              if (!sid || (!useDemo && isDemoRecord(v))) return;
              rawMap.set(sid, { ...v, id: sid, schoolId: v.schoolId || schoolId });
            });
          }
        })
        .catch(() => {})
    );
  }

  if (db) {
    jobs.push(
      withTimeout(getDocs(col(`schools/${schoolId}/staff`)), 2500)
        .then((snap: any) => {
          fsOk = true;
          (snap?.docs || []).forEach((docSnap: any) => {
            const data = docSnap.data() as import('./school-types').StaffEmployee;
            const sid = data?.id || docSnap.id;
            if (!sid || (!useDemo && isDemoRecord(data))) return;
            const existing = rawMap.get(sid);
            if (existing) {
              const deletedEither = !isActiveStaffRecord(existing) || !isActiveStaffRecord(data);
              rawMap.set(sid, {
                ...existing,
                ...data,
                id: sid,
                schoolId: data?.schoolId || existing.schoolId || schoolId,
                active: deletedEither ? false : (data.active ?? existing.active),
              });
            } else {
              rawMap.set(sid, { ...data, id: sid, schoolId: data?.schoolId || schoolId });
            }
          });
        })
        .catch(() => {})
    );
  }

  // Also cross-check active teachers to auto-purge orphaned teacher-synced staff records ("Academic / Faculty")
  let activeTeacherIds: Set<string> | null = null;
  jobs.push(
    getTeachers(schoolId)
      .then((tList) => {
        activeTeacherIds = new Set(tList.map((t) => t.id));
      })
      .catch(() => {})
  );

  await Promise.all(jobs);

  if (fsOk || rtdbOk) {
    const cleanList: import('./school-types').StaffEmployee[] = [];
    const orphanIds: string[] = [];
    rawMap.forEach((s) => {
      if (!isActiveStaffRecord(s) || deletedIds.has(s.id) || (!useDemo && isDemoRecord(s))) return;
      if (
        activeTeacherIds !== null &&
        s.department === "Academic / Faculty" &&
        !activeTeacherIds.has(s.id)
      ) {
        orphanIds.push(s.id);
        return;
      }
      cleanList.push(s);
    });

    if (orphanIds.length > 0) {
      orphanIds.forEach((oid) => {
        void deleteStaffEmployee(schoolId, oid).catch(() => {});
      });
    }

    setLocalStaffEmployees(schoolId, cleanList);
    if (cleanList.length > 0) return cleanList;
  }

  if (useDemo) {
    const demo = getDemoSchoolDataset(true);
    if (demo && demo.staffEmployees && demo.staffEmployees.length > 0) {
      return demo.staffEmployees;
    }
  }
  return fsOk || rtdbOk ? [] : getLocalStaffEmployees(schoolId);
};

export const deleteStaffEmployee = async (schoolId: string, staffId: string) => {
  if (!schoolId || !staffId) return;
  const deletedAt = new Date().toISOString();
  const deletePatch = {
    active: false,
    isDeleted: true,
    status: "deleted",
    deletedAt,
  };

  markTeacherDeletedLocally(schoolId, staffId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("staff-deleted", { detail: { schoolId, staffId } }));
    window.dispatchEvent(new CustomEvent("teacher-deleted", { detail: { schoolId, teacherId: staffId } }));
  }

  if (rtdb) {
    try {
      await Promise.allSettled([
        withTimeout(remove(ref(rtdb, `schools/${schoolId}/staff/${staffId}`)), 2500),
        withTimeout(remove(ref(rtdb, `schools/${schoolId}/teachers/${staffId}`)), 2500),
        withTimeout(set(ref(rtdb, `schools/${schoolId}/deleted_staff/${staffId}`), { id: staffId, deletedAt }), 2500),
        withTimeout(set(ref(rtdb, `schools/${schoolId}/deleted_teachers/${staffId}`), { id: staffId, deletedAt }), 2500),
      ]);
    } catch {}
  }

  if (db) {
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/staff/${staffId}`)), 3000);
    } catch {
      try {
        await withTimeout(setDoc(d(`schools/${schoolId}/staff/${staffId}`), deletePatch, { merge: true }), 3000);
      } catch {}
    }
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/teachers/${staffId}`)), 3000);
    } catch {
      try {
        await withTimeout(setDoc(d(`schools/${schoolId}/teachers/${staffId}`), deletePatch, { merge: true }), 3000);
      } catch {}
    }
  }

  import("./utils/faceRecognitionEngineV2")
    .then((m) => m.deleteFaceDescriptor(staffId, schoolId))
    .catch(() => {});
};

const LOCAL_STAFF_LEAVES_PREFIX = "nst_staff_leaves_";

const mergeStaffLeaveLists = (
  ...lists: import('./school-types').StaffLeave[][]
): import('./school-types').StaffLeave[] => {
  const byId = new Map<string, import('./school-types').StaffLeave>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item?.id) continue;
      const prev = byId.get(item.id);
      if (!prev) {
        byId.set(item.id, item);
      } else {
        // Prefer finalized (approved/rejected) or newer status
        const prevFinal = prev.status !== "pending";
        const nextFinal = item.status !== "pending";
        byId.set(item.id, nextFinal && !prevFinal ? item : { ...prev, ...item });
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    String(b.appliedAt || "").localeCompare(String(a.appliedAt || ""))
  );
};

export const getLocalStaffLeaves = (schoolId: string): import('./school-types').StaffLeave[] => {
  try {
    return getSchoolCacheSync<import('./school-types').StaffLeave[]>(`${LOCAL_STAFF_LEAVES_PREFIX}${schoolId}`, []);
  } catch {
    return [];
  }
};

export const setLocalStaffLeaves = (schoolId: string, leaves: import('./school-types').StaffLeave[]) => {
  try {
    setSchoolCacheSync(`${LOCAL_STAFF_LEAVES_PREFIX}${schoolId}`, Array.isArray(leaves) ? leaves : []);
  } catch {}
};

export const saveStaffLeave = async (leave: import('./school-types').StaffLeave) => {
  const clean = sanitizeForFirestore(leave) as import('./school-types').StaffLeave;
  const current = getLocalStaffLeaves(leave.schoolId);
  const next = mergeStaffLeaveLists([clean], current);
  setLocalStaffLeaves(leave.schoolId, next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("staff-leaves-updated", { detail: { schoolId: leave.schoolId, leave: clean } }));
  }

  await Promise.allSettled([
    withTimeout(set(ref(rtdb, `schools/${leave.schoolId}/staff_leaves/${leave.id}`), clean), 2500),
    withTimeout(setDoc(d(`schools/${leave.schoolId}/leaves/${leave.id}`), clean, { merge: true }), 3000),
  ]);
};

export const getStaffLeaves = async (schoolId: string): Promise<import('./school-types').StaffLeave[]> => {
  const local = getLocalStaffLeaves(schoolId);
  const remoteLists: import('./school-types').StaffLeave[][] = [local];

  await Promise.allSettled([
    (async () => {
      try {
        const rtdbSnap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/staff_leaves`)), 2500);
        if (rtdbSnap.exists()) {
          const val = rtdbSnap.val() || {};
          remoteLists.push(Object.values(val) as import('./school-types').StaffLeave[]);
        }
      } catch {}
    })(),
    (async () => {
      try {
        const snap = await withTimeout(getDocs(col(`schools/${schoolId}/leaves`)), 2500);
        remoteLists.push(snap.docs.map(doc => doc.data() as import('./school-types').StaffLeave));
      } catch {}
    })(),
  ]);

  const merged = mergeStaffLeaveLists(...remoteLists);
  if (merged.length > 0) {
    setLocalStaffLeaves(schoolId, merged);
    return merged;
  }
  if (shouldUseDemoForSchool(schoolId)) {
    const demo = getDemoSchoolDataset(true);
    if (demo && demo.staffLeaves && demo.staffLeaves.length > 0) {
      return demo.staffLeaves;
    }
  }
  return [];
};

export const updateStaffLeaveStatus = async (
  schoolId: string,
  leaveId: string,
  status: 'approved' | 'rejected',
  remarks?: string
) => {
  const patch = sanitizeForFirestore({
    status,
    remarks: remarks || '',
    reviewedAt: new Date().toISOString(),
  });
  const local = getLocalStaffLeaves(schoolId);
  const updatedLocal = local.map((l) => (l.id === leaveId ? { ...l, ...patch } : l));
  setLocalStaffLeaves(schoolId, updatedLocal);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("staff-leaves-updated", { detail: { schoolId, leaveId, status } }));
  }

  await Promise.allSettled([
    withTimeout(update(ref(rtdb, `schools/${schoolId}/staff_leaves/${leaveId}`), patch), 2500),
    withTimeout(setDoc(d(`schools/${schoolId}/leaves/${leaveId}`), patch, { merge: true }), 3000),
  ]);
};

export const subscribeStaffLeaves = (
  schoolId: string,
  cb: (leaves: import('./school-types').StaffLeave[]) => void
) => {
  if (!schoolId) return () => {};
  let rtdbList: import('./school-types').StaffLeave[] = [];
  let fsList: import('./school-types').StaffLeave[] = [];

  const emit = () => {
    const local = getLocalStaffLeaves(schoolId);
    const merged = mergeStaffLeaveLists(rtdbList, fsList, local);
    if (merged.length > 0) {
      setLocalStaffLeaves(schoolId, merged);
      cb(merged);
    } else if (shouldUseDemoForSchool(schoolId)) {
      const demo = getDemoSchoolDataset(true);
      cb(demo?.staffLeaves || []);
    } else {
      cb([]);
    }
  };

  emit();

  let unsubRtdb: (() => void) | null = null;
  try {
    unsubRtdb = onValue(ref(rtdb, `schools/${schoolId}/staff_leaves`), (snap) => {
      const val = snap.val();
      rtdbList = val ? (Object.values(val) as import('./school-types').StaffLeave[]) : [];
      emit();
    });
  } catch {}

  let unsubFs: (() => void) | null = null;
  try {
    unsubFs = onSnapshot(col(`schools/${schoolId}/leaves`), (snap) => {
      fsList = snap.docs.map((doc) => doc.data() as import('./school-types').StaffLeave);
      emit();
    });
  } catch {}

  const onLocalEvent = (e: any) => {
    if (e?.detail?.schoolId && e.detail.schoolId !== schoolId) return;
    emit();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("staff-leaves-updated", onLocalEvent);
  }

  return () => {
    if (unsubRtdb) try { unsubRtdb(); } catch {}
    if (unsubFs) try { unsubFs(); } catch {}
    if (typeof window !== "undefined") {
      window.removeEventListener("staff-leaves-updated", onLocalEvent);
    }
  };
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

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
    const demo = getDemoSchoolDataset(true);
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
  status: 'pending' | 'approved' | 'rejected',
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

export const subscribeAdmissionApplications = (
  schoolId: string,
  cb: (apps: import('./school-types').AdmissionApplication[]) => void
) => {
  const sortApps = (list: import('./school-types').AdmissionApplication[]) =>
    [...list].sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));

  const mergedMap = new Map<string, import('./school-types').AdmissionApplication>();

  const emitMerged = () => {
    const finalApps = sortApps(Array.from(mergedMap.values()));
    if (finalApps.length > 0) {
      setSchoolCacheSync(LOCAL_ADMISSIONS_KEY(schoolId), finalApps);
      cb(finalApps);
      return;
    }
    if (shouldUseDemoForSchool(schoolId)) {
      const demo = getDemoSchoolDataset(true);
      if (demo && demo.admissions && demo.admissions.length > 0) {
        cb(demo.admissions);
        return;
      }
    }
    cb(finalApps);
  };

  const loadLocal = () => {
    const localRaw = getSchoolCacheSync<import('./school-types').AdmissionApplication[]>(LOCAL_ADMISSIONS_KEY(schoolId), []);
    if (Array.isArray(localRaw)) {
      localRaw.forEach((a) => { if (a?.id) mergedMap.set(a.id, a); });
    }
    emitMerged();
  };
  loadLocal();

  const onHydrated = () => loadLocal();
  const onAdmissionAlert = () => loadLocal();
  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", onHydrated);
    window.addEventListener("school-admission-alert", onAdmissionAlert);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/admissions`), (snap) => {
        const val = snap?.val?.();
        if (val && typeof val === "object") {
          Object.values(val).forEach((item: any) => {
            if (item?.id) mergedMap.set(item.id, { ...(mergedMap.get(item.id) || {}), ...item });
          });
          emitMerged();
        }
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col(`schools/${schoolId}/admissions`),
        (snap) => {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data() as import('./school-types').AdmissionApplication;
            if (data?.id) mergedMap.set(data.id, { ...(mergedMap.get(data.id) || {}), ...data });
          });
          emitMerged();
        },
        (err) => {
          console.warn("[subscribeAdmissionApplications] error:", err?.code || err);
        }
      );
    } catch {}
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", onHydrated);
      window.removeEventListener("school-admission-alert", onAdmissionAlert);
    }
    if (typeof rtdbUnsub === "function") rtdbUnsub();
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

// ── PUBLIC INQUIRIES ──────────────────────────────────────────────────────────

const LOCAL_INQUIRIES_KEY = (schoolId: string) => `nst_inquiries_${schoolId}`;
const LOCAL_GALLERY_KEY = (schoolId: string) => `nst_gallery_${schoolId}`;

export const getSchoolPublicInquiries = async (schoolId: string): Promise<import('./school-types').SchoolPublicInquiry[]> => {
  const local = getSchoolCacheSync<import('./school-types').SchoolPublicInquiry[]>(LOCAL_INQUIRIES_KEY(schoolId), []);
  const localList = Array.isArray(local) ? local : [];
  if (isDemoSchoolId(schoolId) || !db) {
    return [...localList].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/inquiries`)), 2500);
    if (snap && !snap.empty) {
      const remote = snap.docs.map(doc => doc.data() as import('./school-types').SchoolPublicInquiry);
      const mergedMap = new Map<string, import('./school-types').SchoolPublicInquiry>();
      localList.forEach(item => { if (item?.id) mergedMap.set(item.id, item); });
      remote.forEach(item => { if (item?.id) mergedMap.set(item.id, item); });
      const merged = Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setSchoolCacheSync(LOCAL_INQUIRIES_KEY(schoolId), merged);
      return merged;
    }
  } catch (e) {}
  return [...localList].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
};

export const saveSchoolPublicInquiry = async (schoolId: string, inquiry: import('./school-types').SchoolPublicInquiry): Promise<void> => {
  const payload = sanitizeForFirestore({ ...inquiry, schoolId, updatedAt: new Date().toISOString() });
  try {
    const cur = getSchoolCacheSync<import('./school-types').SchoolPublicInquiry[]>(LOCAL_INQUIRIES_KEY(schoolId), []);
    const next = [payload, ...(Array.isArray(cur) ? cur : []).filter(i => i.id !== payload.id)];
    setSchoolCacheSync(LOCAL_INQUIRIES_KEY(schoolId), next);
  } catch {}
  if (!isDemoSchoolId(schoolId) && db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/inquiries/${payload.id}`), payload, { merge: true }), 2500);
    } catch {}
  }
};

export const updateSchoolPublicInquiry = async (
  schoolId: string,
  inquiryId: string,
  patch: Partial<import('./school-types').SchoolPublicInquiry>
): Promise<void> => {
  const cleanPatch = sanitizeForFirestore({ ...patch, updatedAt: new Date().toISOString() });
  try {
    const cur = getSchoolCacheSync<import('./school-types').SchoolPublicInquiry[]>(LOCAL_INQUIRIES_KEY(schoolId), []);
    const next = (Array.isArray(cur) ? cur : []).map(i => (i.id === inquiryId ? { ...i, ...cleanPatch } : i));
    setSchoolCacheSync(LOCAL_INQUIRIES_KEY(schoolId), next);
  } catch {}
  if (!isDemoSchoolId(schoolId) && db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/inquiries/${inquiryId}`), cleanPatch, { merge: true }), 2500);
    } catch {}
  }
};

// ── GALLERY & EVENTS ─────────────────────────────────────────────────────────

export const getSchoolGallery = async (schoolId: string): Promise<import('./school-types').SchoolGalleryItem[]> => {
  const local = getSchoolCacheSync<import('./school-types').SchoolGalleryItem[]>(LOCAL_GALLERY_KEY(schoolId), []);
  const localList = Array.isArray(local) ? local : [];
  if (isDemoSchoolId(schoolId) || !db) {
    return localList;
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/gallery`)), 2500);
    if (snap && !snap.empty) {
      const remote = snap.docs.map(doc => doc.data() as import('./school-types').SchoolGalleryItem);
      const mergedMap = new Map<string, import('./school-types').SchoolGalleryItem>();
      localList.forEach(item => { if (item?.id) mergedMap.set(item.id, item); });
      remote.forEach(item => { if (item?.id) mergedMap.set(item.id, item); });
      const merged = Array.from(mergedMap.values());
      setSchoolCacheSync(LOCAL_GALLERY_KEY(schoolId), merged);
      return merged;
    }
  } catch (e) {}
  return localList;
};

export const saveSchoolGalleryItem = async (schoolId: string, item: import('./school-types').SchoolGalleryItem): Promise<void> => {
  const payload = sanitizeForFirestore({ ...item, schoolId });
  try {
    const cur = getSchoolCacheSync<import('./school-types').SchoolGalleryItem[]>(LOCAL_GALLERY_KEY(schoolId), []);
    const next = [payload, ...(Array.isArray(cur) ? cur : []).filter(g => g.id !== payload.id)];
    setSchoolCacheSync(LOCAL_GALLERY_KEY(schoolId), next);
  } catch {}
  if (!isDemoSchoolId(schoolId) && db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/gallery/${payload.id}`), payload, { merge: true }), 2500);
    } catch {}
  }
};

export const deleteSchoolGalleryItem = async (schoolId: string, itemId: string): Promise<void> => {
  try {
    const cur = getSchoolCacheSync<import('./school-types').SchoolGalleryItem[]>(LOCAL_GALLERY_KEY(schoolId), []);
    const next = (Array.isArray(cur) ? cur : []).filter(g => g.id !== itemId);
    setSchoolCacheSync(LOCAL_GALLERY_KEY(schoolId), next);
  } catch {}
  if (!isDemoSchoolId(schoolId) && db) {
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/gallery/${itemId}`)), 2500);
    } catch {}
  }
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

export const setLocalUserLinkedStudents = (
  uid: string,
  students: any[],
  activeStudentIdOrKey?: string
): void => {
  if (!uid) return;
  const cleanList = Array.isArray(students) ? students : [];
  const matchedActive =
    cleanList.find((s: any) => getStudentLinkKey(s) === activeStudentIdOrKey) ||
    cleanList.find((s: any) => s.id === activeStudentIdOrKey) ||
    cleanList[0] ||
    null;

  const bundle: UserLinkedStudentsBundle = {
    students: cleanList,
    activeStudentId: matchedActive?.id || "",
    activeStudentKey: matchedActive ? getStudentLinkKey(matchedActive) : "",
    updatedAt: new Date().toISOString(),
  };

  setSchoolCacheSync(`nst_school_linked_list_${uid}`, bundle);
  if (matchedActive) {
    setSchoolCacheSync(`nst_school_linked_${uid}`, matchedActive);
  } else {
    removeSchoolCacheSync(`nst_school_linked_${uid}`);
  }
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
      if (val && Array.isArray(val.students)) {
        setSchoolCacheSync(`nst_school_linked_list_${uid}`, val);
        if (val.students.length === 0) {
          removeSchoolCacheSync(`nst_school_linked_${uid}`);
        }
        return val as UserLinkedStudentsBundle;
      }
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`school_user_links/${safeUid}`)), 2500);
      if (snap.exists()) {
        const data = snap.data() as UserLinkedStudentsBundle;
        if (data && Array.isArray(data.students)) {
          setSchoolCacheSync(`nst_school_linked_list_${uid}`, data);
          if (data.students.length === 0) {
            removeSchoolCacheSync(`nst_school_linked_${uid}`);
          }
          return data;
        }
      }
    } catch {}
  }

  return localBundle;
};

/**
 * Verifies every linked student on an App User ID against each school's authoritative
 * cloud roster (Firestore + RTDB). If a school roster is reachable and confirms a student
 * was deleted or deactivated (missing from roster or active===false / isDeleted===true),
 * that stale student is automatically pruned. Offline/unreachable schools are preserved safely.
 */
export const verifyLinkedStudentsAuthoritative = async (
  students: any[],
  defaultSchoolId = "dps_gurgaon_sector45"
): Promise<{ validStudents: any[]; removedStudents: any[]; verifiedAnySchool: boolean }> => {
  const input = Array.isArray(students) ? students.filter(Boolean) : [];
  if (input.length === 0) {
    return { validStudents: [], removedStudents: [], verifiedAnySchool: false };
  }

  const schoolIds = Array.from(
    new Set(
      input
        .map((s: any) => String(s.schoolId || defaultSchoolId || "").trim())
        .filter(Boolean)
    )
  );

  const cloudCheckBySchool = new Map<
    string,
    { cloudVerified: boolean; activeMap: Map<string, any>; deletedIdSet: Set<string>; rawMap: Map<string, any> }
  >();

  await Promise.all(
    schoolIds.map(async (schId) => {
      try {
        const [{ cloudVerified, students: activeList, rawAllRecords }, deletedRtdbSet] = await Promise.all([
          getActiveCloudStudents(schId),
          (async () => {
            const setIds = new Set<string>();
            if (rtdb) {
              try {
                const delSnap = await withTimeout(get(ref(rtdb, `schools/${schId}/deleted_students`)), 2000);
                const val = delSnap?.val?.();
                if (val && typeof val === "object") {
                  Object.keys(val).forEach((k) => setIds.add(k));
                }
              } catch {}
            }
            return setIds;
          })(),
        ]);

        const activeMap = new Map<string, any>();
        activeList.forEach((st: any) => {
          if (st?.id) activeMap.set(st.id, st);
          if (st?.admissionNo) activeMap.set(`adm:${String(st.admissionNo).trim().toLowerCase()}`, st);
        });

        const rawMap = new Map<string, any>();
        rawAllRecords.forEach((st: any) => {
          if (st?.id) rawMap.set(st.id, st);
          if (st?.admissionNo) rawMap.set(`adm:${String(st.admissionNo).trim().toLowerCase()}`, st);
          if (!isActiveSchoolStudentRecord(st) && st?.id) {
            deletedRtdbSet.add(st.id);
          }
        });

        cloudCheckBySchool.set(schId, {
          cloudVerified: cloudVerified || deletedRtdbSet.size > 0,
          activeMap,
          deletedIdSet: deletedRtdbSet,
          rawMap,
        });
      } catch {
        cloudCheckBySchool.set(schId, {
          cloudVerified: false,
          activeMap: new Map(),
          deletedIdSet: new Set(),
          rawMap: new Map(),
        });
      }
    })
  );

  const validStudents: any[] = [];
  const removedStudents: any[] = [];
  let verifiedAnySchool = false;

  for (const linked of input) {
    const schId = String(linked.schoolId || defaultSchoolId || "").trim();
    const check = cloudCheckBySchool.get(schId);

    // Keep demo students ONLY when demo mode is active for demo school and not explicitly deleted
    if (shouldUseDemoForSchool(schId) && isDemoRecord(linked)) {
      if (!check?.deletedIdSet.has(linked.id)) {
        validStudents.push(linked);
      } else {
        removedStudents.push(linked);
      }
      continue;
    }

    if (!check || !check.cloudVerified) {
      // Offline / cloud unreachable -> keep safely rather than wiping user's list blindly
      validStudents.push(linked);
      continue;
    }

    verifiedAnySchool = true;
    const admKey = linked.admissionNo ? `adm:${String(linked.admissionNo).trim().toLowerCase()}` : "";

    // Explicit deleted tombstone or inactive raw record
    if ((linked.id && check.deletedIdSet.has(linked.id)) || (linked.id && check.rawMap.has(linked.id) && !isActiveSchoolStudentRecord(check.rawMap.get(linked.id)))) {
      removedStudents.push(linked);
      continue;
    }

    const activeMatch =
      (linked.id ? check.activeMap.get(linked.id) : undefined) ||
      (admKey ? check.activeMap.get(admKey) : undefined);

    if (activeMatch) {
      validStudents.push({
        ...linked,
        ...activeMatch,
        type: "STUDENT",
        schoolId: activeMatch.schoolId || schId,
        schoolName: linked.schoolName || activeMatch.schoolName || "",
      });
    } else {
      // School's cloud roster responded cleanly, and this student no longer exists in it!
      removedStudents.push(linked);
    }
  }

  return { validStudents, removedStudents, verifiedAnySchool };
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
    const demo = getDemoSchoolDataset(true);
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
      if (l.isUniversal === true || l.classId === "all" || l.classId === "universal") return true;
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

  const writes: Promise<void>[] = [];
  if (rtdb) {
    writes.push(
      withTimeout(set(ref(rtdb, `schools/${msg.schoolId}/nsta_messages/${msg.id}`), sanitized), 2500).catch(() => {})
    );
  }
  if (db) {
    writes.push(
      withTimeout(setDoc(d(`schools/${msg.schoolId}/nsta_messages/${msg.id}`), sanitized), 2500).catch(() => {})
    );
  }
  await Promise.allSettled(writes);
};

export const NSTA_MESSAGE_RETENTION_DAYS = 7;
export const NSTA_MESSAGE_RETENTION_MS = NSTA_MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const isNstaMessageExpired = (msg: Partial<NstaMessage> | null | undefined, nowMs = Date.now()): boolean => {
  if (!msg || !msg.createdAt) return false;
  const ts = Date.parse(msg.createdAt);
  if (Number.isNaN(ts)) return false;
  return nowMs - ts > NSTA_MESSAGE_RETENTION_MS;
};

const nstaPurgeCooldown = new Map<string, number>();

export const deleteNstaMessage = async (schoolId: string, messageId: string): Promise<void> => {
  await bulkPermanentDeleteNstaMessages(schoolId, [messageId]);
};

export const bulkPermanentDeleteNstaMessages = async (
  schoolId: string,
  messageIds: string[]
): Promise<number> => {
  if (!schoolId || !Array.isArray(messageIds) || messageIds.length === 0) return 0;
  const uniqueIds = Array.from(new Set(messageIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  const idSet = new Set<string>(uniqueIds);
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = Array.isArray(cur) ? cur.filter((m) => m && !idSet.has(m.id)) : [];
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nsta-messages-updated", {
        detail: { schoolId, messageIds: uniqueIds, action: "BULK_DELETE_PERMANENT" },
      })
    );
  }

  // RTDB chunked multi-path deletes (null removes nodes in one request per 200 keys)
  if (rtdb) {
    const CHUNK = 200;
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      const slice = uniqueIds.slice(i, i + CHUNK);
      const patch: Record<string, null> = {};
      slice.forEach((id) => {
        patch[id] = null;
      });
      try {
        await withTimeout(update(ref(rtdb, `schools/${schoolId}/nsta_messages`), patch), 6000);
      } catch {}
    }
  }

  // Firestore chunked writeBatch deletes (max 500 ops/batch; use 400 safely)
  if (db) {
    const CHUNK = 400;
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      const slice = uniqueIds.slice(i, i + CHUNK);
      try {
        const batch = writeBatch(db);
        slice.forEach((id) => {
          batch.delete(d(`schools/${schoolId}/nsta_messages/${id}`));
        });
        await withTimeout(batch.commit(), 8000);
      } catch {}
    }
  }

  return uniqueIds.length;
};

export const deleteNstaMessageForMe = async (
  schoolId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  await bulkDeleteNstaMessagesForMe(schoolId, [messageId], userId);
};

export const bulkDeleteNstaMessagesForMe = async (
  schoolId: string,
  messageIds: string[],
  userId: string
): Promise<number> => {
  if (!schoolId || !userId || !Array.isArray(messageIds) || messageIds.length === 0) return 0;
  const uniqueIds = Array.from(new Set(messageIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  const idSet = new Set<string>(uniqueIds);
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;
  const modifiedMsgs: NstaMessage[] = [];

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = (Array.isArray(cur) ? cur : []).map((m) => {
      if (m && idSet.has(m.id)) {
        const deletedFor = Array.isArray(m.deletedFor) ? [...m.deletedFor] : [];
        if (!deletedFor.includes(userId)) deletedFor.push(userId);
        const nextMsg = { ...m, deletedFor };
        modifiedMsgs.push(nextMsg);
        return nextMsg;
      }
      return m;
    });
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nsta-messages-updated", {
        detail: { schoolId, messageIds: uniqueIds, action: "BULK_DELETE_FOR_ME", userId },
      })
    );
  }

  if (modifiedMsgs.length > 0) {
    if (rtdb) {
      const CHUNK = 200;
      for (let i = 0; i < modifiedMsgs.length; i += CHUNK) {
        const slice = modifiedMsgs.slice(i, i + CHUNK);
        const patch: Record<string, any> = {};
        slice.forEach((m) => {
          patch[`${m.id}/deletedFor`] = m.deletedFor || [userId];
        });
        try {
          await withTimeout(update(ref(rtdb, `schools/${schoolId}/nsta_messages`), patch), 6000);
        } catch {}
      }
    }
    if (db) {
      const CHUNK = 400;
      for (let i = 0; i < modifiedMsgs.length; i += CHUNK) {
        const slice = modifiedMsgs.slice(i, i + CHUNK);
        try {
          const batch = writeBatch(db);
          slice.forEach((m) => {
            batch.set(
              d(`schools/${schoolId}/nsta_messages/${m.id}`),
              { deletedFor: m.deletedFor || [userId] },
              { merge: true }
            );
          });
          await withTimeout(batch.commit(), 8000);
        } catch {}
      }
    }
  }

  return modifiedMsgs.length;
};

export const deleteNstaMessageForEveryone = async (
  schoolId: string,
  messageId: string
): Promise<void> => {
  await bulkDeleteNstaMessagesForEveryone(schoolId, [messageId]);
};

export const bulkDeleteNstaMessagesForEveryone = async (
  schoolId: string,
  messageIds: string[],
  options?: { permanentOnBulk?: boolean }
): Promise<number> => {
  if (!schoolId || !Array.isArray(messageIds) || messageIds.length === 0) return 0;
  const uniqueIds = Array.from(new Set(messageIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  // For bulk deletions (> 5 messages) or explicit permanent mode, delete completely so 1000+ deleted bubbles vanish cleanly
  if (options?.permanentOnBulk !== false && uniqueIds.length > 5) {
    return bulkPermanentDeleteNstaMessages(schoolId, uniqueIds);
  }

  const idSet = new Set<string>(uniqueIds);
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;
  const nowIso = new Date().toISOString();
  const modifiedMsgs: NstaMessage[] = [];

  try {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const updated = (Array.isArray(cur) ? cur : []).map((m) => {
      if (m && idSet.has(m.id)) {
        const nextMsg: NstaMessage = {
          ...m,
          text: "🚫 This message was deleted",
          deletedForEveryone: true,
          deletedForEveryoneAt: nowIso,
          attachmentUrl: undefined,
          attachmentType: undefined,
          feeSlip: undefined,
        };
        modifiedMsgs.push(nextMsg);
        return nextMsg;
      }
      return m;
    });
    setSchoolCacheSync(cacheKey, updated);
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nsta-messages-updated", {
        detail: { schoolId, messageIds: uniqueIds, action: "BULK_DELETE_FOR_EVERYONE" },
      })
    );
  }

  if (modifiedMsgs.length > 0) {
    if (rtdb) {
      const CHUNK = 200;
      for (let i = 0; i < modifiedMsgs.length; i += CHUNK) {
        const slice = modifiedMsgs.slice(i, i + CHUNK);
        const patch: Record<string, any> = {};
        slice.forEach((m) => {
          patch[m.id] = sanitizeForFirestore(m);
        });
        try {
          await withTimeout(update(ref(rtdb, `schools/${schoolId}/nsta_messages`), patch), 6000);
        } catch {}
      }
    }
    if (db) {
      const CHUNK = 400;
      for (let i = 0; i < modifiedMsgs.length; i += CHUNK) {
        const slice = modifiedMsgs.slice(i, i + CHUNK);
        try {
          const batch = writeBatch(db);
          slice.forEach((m) => {
            batch.set(d(`schools/${schoolId}/nsta_messages/${m.id}`), sanitizeForFirestore(m));
          });
          await withTimeout(batch.commit(), 8000);
        } catch {}
      }
    }
  }

  return modifiedMsgs.length;
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
  filter: { threadType: NstaThreadType; classId?: string; className?: string; studentId?: string; teacherId?: string },
  cb: (msgs: NstaMessage[]) => void
): () => void => {
  const cacheKey = `nst_school_nsta_msgs_${schoolId}`;

  const loadFromCacheAndNotify = () => {
    const raw = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    if (Array.isArray(raw)) {
      const nowMs = Date.now();
      const expiredIds: string[] = [];
      const activeAll = raw.filter((m) => {
        if (!m) return false;
        if (isNstaMessageExpired(m, nowMs)) {
          if (m.id) expiredIds.push(m.id);
          return false;
        }
        return true;
      });
      if (expiredIds.length > 0) {
        setSchoolCacheSync(cacheKey, activeAll);
      }

      const filtered = activeAll.filter(m => {
        if (!m || !m.threadType) return false;
        // 1. Strict threadType match - class, school, or teacher
        if (m.threadType !== filter.threadType) return false;

        // 2. Class Group filtering (match exact classId OR className/normalized ID via isStudentInClass)
        if (filter.threadType === "CLASS_GROUP") {
          if (filter.classId && m.classId && m.classId !== filter.classId && m.classId !== "all" && m.classId !== "general") {
            const matched = isStudentInClass(
              { classId: filter.classId, className: filter.className } as any,
              m.classId,
              m.className
            );
            if (!matched) return false;
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

  let rtdbList: NstaMessage[] | null = null;
  let fsList: NstaMessage[] | null = null;

  const mergeAndEmit = () => {
    const cur = getSchoolCacheSync<NstaMessage[]>(cacheKey, []);
    const mergedMap = new Map<string, NstaMessage>();
    const expiredIds: string[] = [];
    const nowMs = Date.now();

    // Preserve optimistic local sends created in the last 30s until remote confirms
    const cutoff = nowMs - 30_000;
    if (Array.isArray(cur)) {
      for (const m of cur) {
        if (m?.id && m.createdAt && new Date(m.createdAt).getTime() >= cutoff) {
          mergedMap.set(m.id, m);
        }
      }
    }
    if (Array.isArray(rtdbList)) {
      for (const m of rtdbList) {
        if (!m?.id) continue;
        if (isNstaMessageExpired(m, nowMs)) {
          expiredIds.push(m.id);
        } else {
          mergedMap.set(m.id, m);
        }
      }
    }
    if (Array.isArray(fsList)) {
      for (const m of fsList) {
        if (!m?.id) continue;
        if (isNstaMessageExpired(m, nowMs)) {
          expiredIds.push(m.id);
        } else {
          mergedMap.set(m.id, m);
        }
      }
    }
    setSchoolCacheSync(cacheKey, Array.from(mergedMap.values()));
    loadFromCacheAndNotify();

    // Auto-purge expired (>7 days) messages from cloud & cache (throttled per school)
    if (expiredIds.length > 0) {
      const lastPurge = nstaPurgeCooldown.get(schoolId) || 0;
      if (nowMs - lastPurge > 60_000) {
        nstaPurgeCooldown.set(schoolId, nowMs);
        void bulkPermanentDeleteNstaMessages(schoolId, expiredIds);
      }
    }
  };

  // Realtime Database listener
  let unsubRtdb = () => {};
  if (rtdb) {
    try {
      const rtdbPath = ref(rtdb, `schools/${schoolId}/nsta_messages`);
      const onRtdbValue = (snap: any) => {
        const val = snap?.val?.();
        if (val && typeof val === "object") {
          rtdbList = Object.values(val);
          mergeAndEmit();
        } else if (val === null) {
          rtdbList = [];
          mergeAndEmit();
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
        fsList = snap.docs.map(docSnap => docSnap.data() as NstaMessage);
        mergeAndEmit();
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
  discountLabel?: string;
  discountSlabs?: import("./school-types").FeeDiscountSlab[];
  forceApplyDiscount?: boolean;
  receiptNo?: string;
  dueDate?: string;
  payLink?: string;
}): Promise<void> => {
  const isReceipt = payload.slipType === "FEE_RECEIPT";
  const todayDateNum = new Date().getDate();
  const slabs = Array.isArray(payload.discountSlabs) ? [...payload.discountSlabs].sort((a, b) => a.uptoDay - b.uptoDay) : [];

  const currentMonthFee = Number(payload.monthlyAmount || payload.amount || 0);
  const arrears = Math.max(0, Number(payload.oldArrears || Math.max(0, payload.balanceDue - currentMonthFee)));

  let earlyDiscount = 0;
  let resolvedDiscountLabel = payload.discountLabel || "";

  if (slabs.length > 0) {
    const matched = slabs.find((s) => todayDateNum <= s.uptoDay);
    if (matched && currentMonthFee > 0) {
      earlyDiscount =
        matched.discountType === "fixed"
          ? Math.min(currentMonthFee, Math.round(matched.discountValue))
          : Math.min(currentMonthFee, Math.round((currentMonthFee * matched.discountValue) / 100));
      const valTxt = matched.discountType === "fixed" ? `₹${matched.discountValue} OFF` : `${matched.discountValue}% OFF`;
      resolvedDiscountLabel = `${matched.uptoDay} तारीख तक ${valTxt}`;
    }
  } else if (payload.forceApplyDiscount || todayDateNum <= 10) {
    earlyDiscount =
      payload.earlyDiscount !== undefined
        ? Math.max(0, Number(payload.earlyDiscount))
        : currentMonthFee > 0 && todayDateNum <= 10
        ? Math.round(currentMonthFee * 0.05)
        : 0;
    if (!resolvedDiscountLabel && earlyDiscount > 0) {
      resolvedDiscountLabel = "10 तारीख तक 5% OFF";
    }
  }

  const netPayableWithDiscount =
    payload.netPayableWithDiscount !== undefined
      ? payload.netPayableWithDiscount
      : earlyDiscount > 0
      ? Math.max(0, payload.balanceDue - earlyDiscount)
      : payload.balanceDue;

  let text = "";
  if (isReceipt) {
    text = `Aapka ${payload.monthLabel} ka fee payment (₹${payload.amount.toLocaleString("en-IN")}) safalta-purvak receive ho gaya hai. Official receipt no: ${payload.receiptNo || "N/A"}. Dhanyawad!`;
  } else if (slabs.length > 0) {
    const slabSummary = slabs
      .map((s) => `${s.uptoDay} तारीख तक ${s.discountType === "fixed" ? `₹${s.discountValue}` : `${s.discountValue}%`} OFF`)
      .join(" • ");
    text = `📢 ${payload.monthLabel} फीस सूचना: कुल बकाया ₹${payload.balanceDue.toLocaleString("en-IN")} है। ⏳ अर्ली पेमेंट ऑफर: ${slabSummary}। (तय तिथि के बाद स्लिप की पूरी राशि ₹${payload.balanceDue.toLocaleString("en-IN")} देय होगी)।`;
  } else if (earlyDiscount > 0) {
    text = `📢 ${payload.monthLabel} फीस सूचना: कुल बकाया ₹${payload.balanceDue.toLocaleString("en-IN")} है। ⚡ ${resolvedDiscountLabel} (बचत: ₹${earlyDiscount.toLocaleString("en-IN")})! तय तिथि के बाद पूरा भुगतान देय होगा।`;
  } else {
    text = `Aapka ${payload.monthLabel} ka shulk baaki hai. Kul deya rashi: ₹${payload.balanceDue.toLocaleString("en-IN")}. Kripya antam tithi ${payload.dueDate || "jaldi"} se pehle jama karein.`;
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
      discountLabel: resolvedDiscountLabel || undefined,
      discountSlabs: slabs.length > 0 ? slabs : undefined,
      discountValidUntil:
        slabs.length > 0
          ? `${slabs[slabs.length - 1].uptoDay} तारीख तक`
          : payload.dueDate || "10 तारीख तक",
      isEligibleForEarlyDiscount: earlyDiscount > 0,
      studentName: payload.studentName,
      className: payload.className,
      rollNo: payload.rollNo,
      admissionNo: payload.admissionNo,
      feeItems: payload.feeItems,
      receiptNo: payload.receiptNo,
      dueDate: payload.dueDate || (slabs.length > 0 ? `${slabs[slabs.length - 1].uptoDay} तारीख तक` : "10th of Month"),
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
      const demo = getDemoSchoolDataset(true);
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
      const demo = getDemoSchoolDataset(true);
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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("accountants-updated", { detail: { schoolId: accountant.schoolId, accountants: next } }));
  }

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
  const deliverLocal = (e?: any) => {
    if (e?.detail?.schoolId && e.detail.schoolId !== schoolId) return;
    cb(getLocalAccountants(schoolId));
  };
  deliverLocal();

  if (typeof window !== "undefined") {
    window.addEventListener("school-idb-hydrated", deliverLocal);
    window.addEventListener("accountants-updated", deliverLocal);
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
    if (typeof window !== "undefined") {
      window.removeEventListener("school-idb-hydrated", deliverLocal);
      window.removeEventListener("accountants-updated", deliverLocal);
    }
    if (typeof fsUnsub === "function") fsUnsub();
  };
};

export const deleteAccountant = async (schoolId: string, accountantId: string) => {
  const current = getLocalAccountants(schoolId);
  const next = current.filter(a => a.id !== accountantId);
  setLocalAccountants(schoolId, next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("accountants-updated", { detail: { schoolId, accountants: next } }));
  }

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
      const demo = getDemoSchoolDataset(true);
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

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER RULES & PAYROLL POLICY CONFIGURATION (LIFE MAKER RULES ENGINE)
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_TEACHER_RULES_KEY = (schoolId: string) => `nst_teacher_rules_${schoolId}`;
const LOCAL_TEACHER_RULES_ACK_KEY = (schoolId: string) => `nst_teacher_rules_ack_${schoolId}`;
const LOCAL_MONTHLY_POLICY_ADJ_KEY = (schoolId: string, yearMonth: string) =>
  `nst_payroll_policy_adj_${schoolId}_${yearMonth}`;

export const getTeacherRulesConfig = async (
  schoolId: string,
  school?: import('./school-types').School | null
): Promise<import('./utils/schoolTeacherRules').SchoolTeacherRulesConfig> => {
  const { getDefaultTeacherRulesConfig } = await import('./utils/schoolTeacherRules');
  const fallback = getSchoolCacheSync<import('./utils/schoolTeacherRules').SchoolTeacherRulesConfig | null>(
    LOCAL_TEACHER_RULES_KEY(schoolId),
    null
  );

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/teacher_rules_config`)), 2000);
      const val = snap?.val?.();
      if (val && typeof val === "object" && Array.isArray(val.rules)) {
        const def = getDefaultTeacherRulesConfig(schoolId, school);
        const normalized = { ...def, ...val, policy: { ...def.policy, ...(val.policy || {}) } };
        setSchoolCacheSync(LOCAL_TEACHER_RULES_KEY(schoolId), normalized);
        return normalized;
      }
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/settings/teacher_rules`)), 2500);
      if (snap.exists()) {
        const val = snap.data() as import('./utils/schoolTeacherRules').SchoolTeacherRulesConfig;
        const def = getDefaultTeacherRulesConfig(schoolId, school);
        const normalized = { ...def, ...val, policy: { ...def.policy, ...(val.policy || {}) } };
        setSchoolCacheSync(LOCAL_TEACHER_RULES_KEY(schoolId), normalized);
        return normalized;
      }
    } catch {}
  }

  if (fallback && Array.isArray(fallback.rules)) {
    const def = getDefaultTeacherRulesConfig(schoolId, school);
    return { ...def, ...fallback, policy: { ...def.policy, ...(fallback.policy || {}) } };
  }

  return getDefaultTeacherRulesConfig(schoolId, school);
};

export const saveTeacherRulesConfig = async (
  schoolId: string,
  config: import('./utils/schoolTeacherRules').SchoolTeacherRulesConfig
): Promise<import('./utils/schoolTeacherRules').SchoolTeacherRulesConfig> => {
  const clean = sanitizeForFirestore({
    ...config,
    schoolId,
    updatedAt: new Date().toISOString(),
  });
  setSchoolCacheSync(LOCAL_TEACHER_RULES_KEY(schoolId), clean);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("teacher-rules-updated", { detail: { schoolId, config: clean } })
    );
  }

  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${schoolId}/teacher_rules_config`), clean), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/settings/teacher_rules`), clean, { merge: true }), 2500);
    } catch {}
  }
  return clean;
};

export const subscribeToTeacherRulesConfig = (
  schoolId: string,
  school: import('./school-types').School | null,
  callback: (config: import('./utils/schoolTeacherRules').SchoolTeacherRulesConfig) => void
): (() => void) => {
  let active = true;
  getTeacherRulesConfig(schoolId, school)
    .then((cfg) => {
      if (active) callback(cfg);
    })
    .catch(() => {});

  const handleLocalEvent = (e: any) => {
    if (!active) return;
    if (e?.detail?.schoolId === schoolId && e?.detail?.config) {
      callback(e.detail.config);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("teacher-rules-updated", handleLocalEvent);
  }

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubFirestore = onSnapshot(d(`schools/${schoolId}/settings/teacher_rules`), (snap) => {
        if (!active || !snap.exists()) return;
        const val = snap.data() as import('./utils/schoolTeacherRules').SchoolTeacherRulesConfig;
        if (val && Array.isArray(val.rules)) {
          setSchoolCacheSync(LOCAL_TEACHER_RULES_KEY(schoolId), val);
          callback(val);
        }
      });
    } catch {}
  }

  return () => {
    active = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("teacher-rules-updated", handleLocalEvent);
    }
    if (unsubFirestore) {
      try { unsubFirestore(); } catch {}
    }
  };
};

export const getTeacherRuleAcceptances = async (
  schoolId: string
): Promise<Record<string, import('./utils/schoolTeacherRules').TeacherRuleAcceptance>> => {
  const local = getSchoolCacheSync<Record<string, import('./utils/schoolTeacherRules').TeacherRuleAcceptance>>(
    LOCAL_TEACHER_RULES_ACK_KEY(schoolId),
    {}
  );
  const merged: Record<string, import('./utils/schoolTeacherRules').TeacherRuleAcceptance> = { ...(local || {}) };

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/teacher_rules_acceptances`)), 2000);
      const val = snap?.val?.();
      if (val && typeof val === "object") {
        Object.assign(merged, val);
      }
    } catch {}
  }
  if (db) {
    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/teacher_rules_acceptances`)), 2500);
      snap.docs.forEach((docSnap) => {
        const dObj = docSnap.data() as import('./utils/schoolTeacherRules').TeacherRuleAcceptance;
        if (dObj?.staffId) merged[dObj.staffId] = dObj;
      });
    } catch {}
  }
  setSchoolCacheSync(LOCAL_TEACHER_RULES_ACK_KEY(schoolId), merged);
  return merged;
};

export const saveTeacherRuleAcceptance = async (
  schoolId: string,
  acceptance: import('./utils/schoolTeacherRules').TeacherRuleAcceptance
): Promise<Record<string, import('./utils/schoolTeacherRules').TeacherRuleAcceptance>> => {
  const current = getSchoolCacheSync<Record<string, import('./utils/schoolTeacherRules').TeacherRuleAcceptance>>(
    LOCAL_TEACHER_RULES_ACK_KEY(schoolId),
    {}
  );
  const clean = sanitizeForFirestore({
    ...acceptance,
    schoolId,
    acceptedAt: acceptance.acceptedAt || new Date().toISOString(),
  });
  const next = { ...(current || {}), [clean.staffId]: clean };
  setSchoolCacheSync(LOCAL_TEACHER_RULES_ACK_KEY(schoolId), next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("teacher-rules-ack-updated", { detail: { schoolId, acceptances: next } })
    );
  }
  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${schoolId}/teacher_rules_acceptances/${clean.staffId}`), clean), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(doc(db, `schools/${schoolId}/teacher_rules_acceptances`, clean.staffId), clean, { merge: true }), 2500);
    } catch {}
  }
  return next;
};

export const getMonthlyPolicyAdjustments = async (
  schoolId: string,
  yearMonth: string
): Promise<Record<string, import('./utils/schoolTeacherRules').StaffMonthlyPolicyAdjustments>> => {
  const local = getSchoolCacheSync<Record<string, import('./utils/schoolTeacherRules').StaffMonthlyPolicyAdjustments>>(
    LOCAL_MONTHLY_POLICY_ADJ_KEY(schoolId, yearMonth),
    {}
  );
  const merged = { ...(local || {}) };

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/payroll_policy_adj/${yearMonth}`)), 2000);
      const val = snap?.val?.();
      if (val && typeof val === "object") Object.assign(merged, val);
    } catch {}
  }
  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}/payroll_policy_adj/${yearMonth}`)), 2500);
      if (snap.exists()) {
        const data = snap.data() as Record<string, any>;
        if (data && typeof data === "object") Object.assign(merged, data);
      }
    } catch {}
  }
  setSchoolCacheSync(LOCAL_MONTHLY_POLICY_ADJ_KEY(schoolId, yearMonth), merged);
  return merged;
};

export const saveStaffMonthlyPolicyAdjustment = async (
  schoolId: string,
  yearMonth: string,
  staffId: string,
  adjustment: import('./utils/schoolTeacherRules').StaffMonthlyPolicyAdjustments
): Promise<Record<string, import('./utils/schoolTeacherRules').StaffMonthlyPolicyAdjustments>> => {
  const current = getSchoolCacheSync<Record<string, import('./utils/schoolTeacherRules').StaffMonthlyPolicyAdjustments>>(
    LOCAL_MONTHLY_POLICY_ADJ_KEY(schoolId, yearMonth),
    {}
  );
  const clean = sanitizeForFirestore({
    lateDays: Math.max(0, Number(adjustment.lateDays) || 0),
    dressViolationDays: Math.max(0, Number(adjustment.dressViolationDays) || 0),
    lateEmergencyExcused: Boolean(adjustment.lateEmergencyExcused),
    bonusWaived: Boolean(adjustment.bonusWaived),
    updatedAt: new Date().toISOString(),
  });
  const next = { ...(current || {}), [staffId]: clean };
  setSchoolCacheSync(LOCAL_MONTHLY_POLICY_ADJ_KEY(schoolId, yearMonth), next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("payroll-policy-adjustments-updated", { detail: { schoolId, yearMonth, next } })
    );
  }
  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${schoolId}/payroll_policy_adj/${yearMonth}/${staffId}`), clean), 2000);
    } catch {}
  }
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${schoolId}/payroll_policy_adj/${yearMonth}`), { [staffId]: clean }, { merge: true }), 2500);
    } catch {}
  }
  return next;
};

// Backward-compatible exports used by offlineSyncService replay queue
export const saveAttendanceDirectCloud = saveAttendance;
export const replayOfflineStudentAttendancePunch = (payload: any) => markStudentQrAttendance(payload);
export const replayOfflineStaffAttendancePunch = (payload: any) => markStaffAttendanceAtomic(payload);


