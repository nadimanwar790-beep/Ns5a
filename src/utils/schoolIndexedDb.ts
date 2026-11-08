import localforage from "localforage";

/**
 * Multi-School ERP High-Capacity IndexedDB Engine + 0ms RAM Cache
 * - Eliminates the 5 MB browser localStorage ceiling for multi-school data
 * - Keeps synchronous 0ms reads via in-memory Map so all existing components work seamlessly
 * - Automatically migrates & purges legacy heavy `nst_school_*` keys from localStorage
 */

const schoolIdb = localforage.createInstance({
  name: "nst_school_erp_idb",
  storeName: "school_kv",
  description: "Multi-School Management IndexedDB Store",
});

const memCache = new Map<string, any>();
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;

const LEGACY_LOCALSTORAGE_PREFIXES = [
  "nst_schools_local_cache",
  "nst_demo_school_1year_dataset_v3",
  "nst_demo_school_dataset",
  "nst_school_classes_",
  "nst_school_students_",
  "nst_school_admissions_",
  "nst_school_attendance_",
  "nst_school_exams_",
  "nst_school_fees_",
  "nst_school_homework_",
  "nst_school_notices_",
  "nst_holidays_",
  "nst_school_community_",
  "nst_school_user_",
  "nst_school_linked_list_",
  "nst_school_linked_",
];

function isLegacySchoolStorageKey(key: string): boolean {
  return LEGACY_LOCALSTORAGE_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(prefix)
  );
}

function safeParseLegacyValue(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Synchronously prime memCache from any legacy localStorage keys if present on first load,
 * then asynchronously migrate them into IndexedDB and delete them from localStorage.
 */
function primeLegacyKeysSynchronously(): Array<[string, any]> {
  const migrated: Array<[string, any]> = [];
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return migrated;
  }

  try {
    const keysToProcess: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isLegacySchoolStorageKey(k)) {
        keysToProcess.push(k);
      }
    }

    for (const key of keysToProcess) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = safeParseLegacyValue(raw);
        memCache.set(key, parsed);
        migrated.push([key, parsed]);
      }
    }

    // Migrate legacy single-school global logo strictly to default school key and purge global key
    const legacyLogo =
      localStorage.getItem("nst_active_school_logo") ||
      localStorage.getItem("nst_school_logo");
    if (legacyLogo && typeof legacyLogo === "string" && legacyLogo.trim()) {
      const defaultLogoKey = "school_logo:dps_gurgaon_sector45";
      if (!memCache.has(defaultLogoKey)) {
        memCache.set(defaultLogoKey, legacyLogo.trim());
        migrated.push([defaultLogoKey, legacyLogo.trim()]);
      }
    }
  } catch (err) {
    console.warn("[schoolIndexedDb] Legacy prime warning:", err);
  }

  return migrated;
}

const initialMigratedEntries = primeLegacyKeysSynchronously();

export function hydrateSchoolIndexedDb(): Promise<void> {
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      // 1. Persist any legacy entries primed from localStorage into IndexedDB, then free localStorage
      if (initialMigratedEntries.length > 0) {
        await Promise.all(
          initialMigratedEntries.map(([k, v]) =>
            schoolIdb.setItem(k, v).catch(() => {})
          )
        );
        if (typeof localStorage !== "undefined") {
          for (const [k] of initialMigratedEntries) {
            try {
              localStorage.removeItem(k);
            } catch {}
          }
          try {
            localStorage.removeItem("nst_active_school_logo");
            localStorage.removeItem("nst_school_logo");
          } catch {}
        }
      }

      // 2. Hydrate all persisted records from IndexedDB into memCache
      // Do not overwrite keys that were written to memCache more recently during boot
      const keysWrittenDuringBoot = new Set(memCache.keys());
      let loadedAnyFromIdb = false;

      await schoolIdb.iterate<any, void>((value, key) => {
        if (!keysWrittenDuringBoot.has(key) && value !== undefined) {
          memCache.set(key, value);
          loadedAnyFromIdb = true;
        }
      });

      hydrated = true;

      // 3. Notify active subscribers so UI reflects hydrated IndexedDB state immediately
      if (typeof window !== "undefined" && (loadedAnyFromIdb || initialMigratedEntries.length > 0)) {
        window.dispatchEvent(new CustomEvent("school-idb-hydrated"));
        window.dispatchEvent(new CustomEvent("notices-updated", { detail: {} }));
        window.dispatchEvent(new CustomEvent("holidays-updated", { detail: {} }));
        window.dispatchEvent(new CustomEvent("school-community-updated", { detail: {} }));
      }
    } catch (err) {
      hydrated = true;
      console.warn("[schoolIndexedDb] Hydration warning:", err);
    }
  })();

  return hydrationPromise;
}

// Start hydration immediately when module loads in browser
if (typeof window !== "undefined") {
  void hydrateSchoolIndexedDb();
}

export function whenSchoolIdbReady(): Promise<void> {
  return hydrateSchoolIndexedDb();
}

export function isSchoolIdbHydrated(): boolean {
  return hydrated;
}

export function getSchoolCacheSync<T>(key: string, fallback: T): T {
  if (memCache.has(key)) {
    return memCache.get(key) as T;
  }
  return fallback;
}

export function setSchoolCacheSync<T>(key: string, value: T): void {
  memCache.set(key, value);
  void schoolIdb.setItem(key, value).catch((err) => {
    console.warn(`[schoolIndexedDb] Failed writing key "${key}":`, err);
  });
}

export function removeSchoolCacheSync(key: string): void {
  memCache.delete(key);
  void schoolIdb.removeItem(key).catch(() => {});
}

export function getSchoolCacheEntriesByPrefix(prefix: string): Array<[string, any]> {
  const results: Array<[string, any]> = [];
  memCache.forEach((val, key) => {
    if (key.startsWith(prefix)) {
      results.push([key, val]);
    }
  });
  return results;
}

export function getSchoolLogoSync(schoolId?: string): string {
  if (!schoolId) return "";
  const val = memCache.get(`school_logo:${schoolId}`);
  return typeof val === "string" ? val : "";
}

export function setSchoolLogoSync(schoolId: string, logoUrl: string): void {
  if (!schoolId) return;
  const key = `school_logo:${schoolId}`;
  const cleaned = (logoUrl || "").trim();
  if (cleaned) {
    setSchoolCacheSync(key, cleaned);
  } else {
    removeSchoolCacheSync(key);
  }
}
