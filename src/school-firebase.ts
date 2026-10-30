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
  SchoolHomework, SchoolMCQResult, SchoolUserProfile
} from "./school-types";

const col = (path: string) => collection(db, path);
const d = (path: string) => doc(db, path);

// ── SCHOOLS LOCAL CACHE ───────────────────────────────────────────────────────
const LOCAL_SCHOOLS_KEY = "nst_schools_local_cache";

export const DEFAULT_DPS_SCHOOL: School = {
  id: "dps_gurgaon_sector45",
  name: "Delhi Public School",
  code: "DPS_DEL",
  address: "Site No.1, Sector-45, Urban Estate, Gurgaon, Haryana",
  phone: "0124-4125800",
  email: "dpsgurgaon45@dps.edu.in",
  affiliation: "CBSE Affiliated • Affiliation No. 530025",
  adminEmail: "admin@dps.edu.in",
  principalName: "Dr. Arvind Swaminathan",
  principalPhone: "9811023450",
  directorName: "Mrs. Shashi Sharma",
  directorPhone: "9811023451",
  mobile: "0124-4125800",
  tagline: "Service Before Self",
  bannerColor: "#047857",
  subscription: {
    reading: true,
    writing: true,
    pdf: true,
    mcq: true,
    monthlyAmount: 4500,
    status: "active",
    tier: "full"
  },
  active: true,
  createdAt: "2026-04-01T00:00:00.000Z",
  createdBy: "admin_uid",
  totalStudents: 910,
  totalTeachers: 26
};

export const getLocalSchools = (): School[] => {
  try {
    const raw = localStorage.getItem(LOCAL_SCHOOLS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Return default school if empty
    return [DEFAULT_DPS_SCHOOL];
  } catch {
    return [DEFAULT_DPS_SCHOOL];
  }
};

export const setLocalSchools = (schools: School[]) => {
  try {
    localStorage.setItem(LOCAL_SCHOOLS_KEY, JSON.stringify(schools));
  } catch {}
};

// ── SCHOOLS ──────────────────────────────────────────────────────────────────

export const saveSchool = async (school: School) => {
  const sanitized = sanitizeForFirestore(school);

  // 1. Instantly store in local cache so UI is responsive in 0ms
  const current = getLocalSchools();
  const next = [sanitized, ...current.filter((s: any) => s.id !== school.id)];
  setLocalSchools(next);

  // 2. Fast dual-save to RTDB (realtime websocket, fast & reliable)
  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${school.id}`), sanitized), 2500);
    } catch (e) {
      console.warn("[school-firebase] RTDB saveSchool:", e);
    }
  }

  // 3. Save to Firestore with timeout so operation never hangs
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${school.id}`), sanitized), 3000);
    } catch (e) {
      console.warn("[school-firebase] Firestore saveSchool timed out or offline:", e);
    }
  }

  return sanitized;
};

export const getSchool = async (schoolId: string): Promise<School | null> => {
  const local = getLocalSchools().find(s => s.id === schoolId);
  if (local) return local;

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}`)), 2000);
      const val = (snap as any)?.val?.();
      if (val) return val as School;
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`schools/${schoolId}`)), 2500);
      if (snap.exists()) return snap.data() as School;
    } catch {}
  }

  return null;
};

export const getAllSchools = async (): Promise<School[]> => {
  const local = getLocalSchools();

  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, "schools")), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const list: School[] = Object.values(val);
        if (list.length > 0) {
          setLocalSchools(list);
          return list;
        }
      }
    } catch {}
  }

  if (db) {
    try {
      const snap = await withTimeout(getDocs(col("schools")), 2500);
      const list = (snap as any).docs.map((d: any) => d.data() as School);
      if (list.length > 0) {
        setLocalSchools(list);
        return list;
      }
    } catch {}
  }

  return local;
};

export const subscribeToSchool = (schoolId: string, cb: (s: School | null) => void) => {
  const local = getLocalSchools().find(s => s.id === schoolId);
  if (local) cb(local);

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}`), snap => {
        const val = snap.val();
        if (val) cb(val as School);
      });
    } catch {}
  }

  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        d(`schools/${schoolId}`),
        snap => cb(snap.exists() ? snap.data() as School : null),
        err => { console.warn(`[school-firebase] subscribeToSchool error:`, err?.code || err); }
      );
    } catch {}
  }

  return () => {
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const subscribeToAllSchools = (
  cb: (schools: School[]) => void,
  onError?: (err: Error) => void
) => {
  // Deliver local cache first so UI is immediately populated
  const local = getLocalSchools();
  if (local.length > 0) {
    cb(local);
  }

  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(
        ref(rtdb, "schools"),
        snap => {
          const val = snap.val();
          if (val && typeof val === "object") {
            const list: School[] = Object.values(val);
            if (list.length > 0) {
              setLocalSchools(list);
              cb(list);
            }
          }
        },
        err => console.warn(`[school-firebase] RTDB subscribeToAllSchools error:`, err)
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
            const list = snap.docs.map(d => d.data() as School);
            setLocalSchools(list);
            cb(list);
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
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const updateSchool = async (schoolId: string, data: Partial<School>) => {
  const sanitized = sanitizeForFirestore(data);

  // Local cache
  const current = getLocalSchools();
  const next = current.map(s => s.id === schoolId ? { ...s, ...sanitized } : s);
  setLocalSchools(next);

  // RTDB
  if (rtdb) {
    try {
      await withTimeout(update(ref(rtdb, `schools/${schoolId}`), sanitized), 2500);
    } catch {}
  }

  // Firestore
  if (db) {
    try {
      await withTimeout(updateDoc(d(`schools/${schoolId}`), sanitized), 3000);
    } catch {}
  }
};

export const lockSchool = async (schoolId: string, locked: boolean) => {
  await updateSchool(schoolId, { locked });
};

export const deleteSchool = async (schoolId: string) => {
  const current = getLocalSchools();
  setLocalSchools(current.filter(s => s.id !== schoolId));

  if (rtdb) {
    try {
      await withTimeout(remove(ref(rtdb, `schools/${schoolId}`)), 2000);
    } catch {}
  }

  if (db) {
    try {
      await withTimeout(deleteDoc(d(`schools/${schoolId}`)), 2500);
    } catch {}
  }
};

// ── SESSIONS ─────────────────────────────────────────────────────────────────

export const saveSession = async (session: SchoolSession) => {
  const sanitized = sanitizeForFirestore(session);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${session.schoolId}/sessions/${session.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${session.schoolId}/sessions/${session.id}`), sanitized), 3000); } catch {}
  }
};

export const getSessions = async (schoolId: string): Promise<SchoolSession[]> => {
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/sessions`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") return Object.values(val);
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/sessions`)), 2500);
    return (snap as any).docs.map((doc: any) => doc.data() as SchoolSession);
  } catch {
    return [];
  }
};

export const subscribeToSessions = (schoolId: string, cb: (sessions: SchoolSession[]) => void) => {
  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/sessions`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") cb(Object.values(val));
      });
    } catch {}
  }
  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        col(`schools/${schoolId}/sessions`),
        snap => cb(snap.docs.map(doc => doc.data() as SchoolSession)),
        err => { console.warn(`[school-firebase] subscribeToSessions error:`, err?.code || err); }
      );
    } catch {}
  }
  return () => {
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const updateSession = async (schoolId: string, sessionId: string, data: Partial<SchoolSession>) => {
  const sanitized = sanitizeForFirestore(data);
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/sessions/${sessionId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(updateDoc(d(`schools/${schoolId}/sessions/${sessionId}`), sanitized), 3000); } catch {}
  }
};

export const deleteSession = async (schoolId: string, sessionId: string) => {
  if (rtdb) {
    try { await withTimeout(remove(ref(rtdb, `schools/${schoolId}/sessions/${sessionId}`)), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(deleteDoc(d(`schools/${schoolId}/sessions/${sessionId}`)), 2500); } catch {}
  }
};

// ── CLASSES ──────────────────────────────────────────────────────────────────

export const saveClass = async (cls: SchoolClass) => {
  const sanitized = sanitizeForFirestore(cls);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${cls.schoolId}/classes/${cls.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${cls.schoolId}/classes/${cls.id}`), sanitized), 3000); } catch {}
  }
};

export const getClasses = async (schoolId: string, sessionId?: string): Promise<SchoolClass[]> => {
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/classes`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const all: SchoolClass[] = Object.values(val);
        return sessionId ? all.filter(c => c.sessionId === sessionId) : all;
      }
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/classes`)), 2500);
    const all = (snap as any).docs.map((doc: any) => doc.data() as SchoolClass);
    return sessionId ? all.filter((c: any) => c.sessionId === sessionId) : all;
  } catch {
    return [];
  }
};

export const subscribeToClasses = (schoolId: string, sessionId: string, cb: (classes: SchoolClass[]) => void) => {
  let rtdbUnsub: any = null;
  if (rtdb) {
    try {
      rtdbUnsub = onValue(ref(rtdb, `schools/${schoolId}/classes`), snap => {
        const val = snap.val();
        if (val && typeof val === "object") {
          const all: SchoolClass[] = Object.values(val);
          cb(all.filter(c => c.sessionId === sessionId));
        }
      });
    } catch {}
  }
  let fsUnsub: any = null;
  if (db) {
    try {
      fsUnsub = onSnapshot(
        query(col(`schools/${schoolId}/classes`), where("sessionId", "==", sessionId)),
        snap => cb(snap.docs.map(doc => doc.data() as SchoolClass)),
        err => { console.warn(`[school-firebase] subscribeToClasses error:`, err?.code || err); }
      );
    } catch {}
  }
  return () => {
    if (typeof fsUnsub === "function") fsUnsub();
    if (typeof rtdbUnsub === "function") rtdbUnsub();
  };
};

export const updateClass = async (schoolId: string, classId: string, data: Partial<SchoolClass>) => {
  const sanitized = sanitizeForFirestore(data);
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/classes/${classId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(updateDoc(d(`schools/${schoolId}/classes/${classId}`), sanitized), 3000); } catch {}
  }
};

export const deleteClass = async (schoolId: string, classId: string) => {
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

export const getSubjects = async (schoolId: string, classId?: string): Promise<SchoolSubject[]> => {
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `schools/${schoolId}/subjects`)), 2000);
      const val = (snap as any)?.val?.();
      if (val && typeof val === "object") {
        const all: SchoolSubject[] = Object.values(val);
        return classId ? all.filter(s => s.classId === classId) : all;
      }
    } catch {}
  }
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/subjects`)), 2500);
    const all = (snap as any).docs.map((doc: any) => doc.data() as SchoolSubject);
    return classId ? all.filter((s: any) => s.classId === classId) : all;
  } catch {
    return [];
  }
};

export const subscribeToSubjects = (schoolId: string, classId: string, cb: (subjects: SchoolSubject[]) => void) =>
  onSnapshot(
    query(col(`schools/${schoolId}/subjects`), where("classId", "==", classId)),
    snap => cb(snap.docs.map(d => d.data() as SchoolSubject)),
    err => { console.warn(`[school-firebase] subscribeToSubjects error:`, err?.code || err); cb([]); }
  );

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
    return (snap as any).docs.map((doc: any) => doc.data() as SchoolTeacher);
  } catch {
    return [];
  }
};

export const subscribeToTeachers = (schoolId: string, cb: (teachers: SchoolTeacher[]) => void) =>
  onSnapshot(
    col(`schools/${schoolId}/teachers`),
    snap => cb(snap.docs.map(d => d.data() as SchoolTeacher)),
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

export const saveStudent = async (student: SchoolStudent) => {
  const sanitized = sanitizeForFirestore(student);
  if (rtdb) {
    try { await withTimeout(set(ref(rtdb, `schools/${student.schoolId}/students/${student.id}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(setDoc(d(`schools/${student.schoolId}/students/${student.id}`), sanitized), 3000); } catch {}
  }
};

export const getStudent = async (schoolId: string, studentId: string): Promise<SchoolStudent | null> => {
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

export const getStudents = async (schoolId: string, classId?: string): Promise<SchoolStudent[]> => {
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/students`)), 2500);
    const all = (snap as any).docs.map((doc: any) => doc.data() as SchoolStudent).filter((s: any) => s.active);
    return classId ? all.filter((s: any) => s.classId === classId) : all;
  } catch {
    return [];
  }
};

export const subscribeToStudents = (schoolId: string, classId: string, cb: (students: SchoolStudent[]) => void) =>
  onSnapshot(
    query(col(`schools/${schoolId}/students`), where("classId", "==", classId), where("active", "==", true)),
    snap => cb(snap.docs.map(d => d.data() as SchoolStudent).sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }))),
    err => { console.warn(`[school-firebase] subscribeToStudents error:`, err?.code || err); cb([]); }
  );

export const subscribeToAllStudents = (schoolId: string, cb: (students: SchoolStudent[]) => void) =>
  onSnapshot(
    query(col(`schools/${schoolId}/students`), where("active", "==", true)),
    snap => cb(snap.docs.map(d => d.data() as SchoolStudent)),
    err => { console.warn(`[school-firebase] subscribeToAllStudents error:`, err?.code || err); cb([]); }
  );

export const updateStudent = async (schoolId: string, studentId: string, data: Partial<SchoolStudent>) => {
  const sanitized = sanitizeForFirestore(data);
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/students/${studentId}`), sanitized), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(updateDoc(d(`schools/${schoolId}/students/${studentId}`), sanitized), 3000); } catch {}
  }
};

export const deleteStudent = async (schoolId: string, studentId: string) => {
  if (rtdb) {
    try { await withTimeout(update(ref(rtdb, `schools/${schoolId}/students/${studentId}`), { active: false }), 2000); } catch {}
  }
  if (db) {
    try { await withTimeout(updateDoc(d(`schools/${schoolId}/students/${studentId}`), { active: false }), 2500); } catch {}
  }
};

// ── ATTENDANCE ───────────────────────────────────────────────────────────────

export const saveAttendance = async (record: AttendanceRecord) => {
  const id = `${record.classId}_${record.date}`;
  await setDoc(
    d(`schools/${record.schoolId}/attendance/${id}`),
    sanitizeForFirestore(record)
  );
};

export const getAttendance = async (schoolId: string, classId: string, date: string): Promise<AttendanceRecord | null> => {
  const id = `${classId}_${date}`;
  const snap = await getDoc(d(`schools/${schoolId}/attendance/${id}`));
  return snap.exists() ? snap.data() as AttendanceRecord : null;
};

export const getMonthlyAttendance = async (schoolId: string, classId: string, month: string): Promise<AttendanceRecord[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/attendance`));
  return snap.docs
    .map(d => d.data() as AttendanceRecord)
    .filter(r => r.classId === classId && r.date.startsWith(month));
};

export const subscribeToAttendance = (
  schoolId: string, classId: string, date: string, cb: (r: AttendanceRecord | null) => void
) => {
  const id = `${classId}_${date}`;
  return onSnapshot(
    d(`schools/${schoolId}/attendance/${id}`),
    snap => cb(snap.exists() ? snap.data() as AttendanceRecord : null),
    err => { console.warn(`[school-firebase] subscribeToAttendance error:`, err?.code || err); cb(null); }
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

// ── MARKS / EXAMS ────────────────────────────────────────────────────────────

export const saveExam = async (exam: ExamEntry) => {
  await setDoc(d(`schools/${exam.schoolId}/exams/${exam.id}`), sanitizeForFirestore(exam));
};

export const getExams = async (schoolId: string, classId?: string): Promise<ExamEntry[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/exams`));
  const all = snap.docs.map(d => d.data() as ExamEntry);
  return classId ? all.filter(e => e.classId === classId) : all;
};

export const subscribeToExams = (schoolId: string, classId: string, cb: (exams: ExamEntry[]) => void) =>
  onSnapshot(
    query(col(`schools/${schoolId}/exams`), where("classId", "==", classId)),
    snap => cb(snap.docs.map(d => d.data() as ExamEntry)),
    err => { console.warn(`[school-firebase] subscribeToExams error:`, err?.code || err); cb([]); }
  );

export const deleteExam = async (schoolId: string, examId: string) => {
  await deleteDoc(d(`schools/${schoolId}/exams/${examId}`));
};

// ── FEE ─────────────────────────────────────────────────────────────────────

const LOCAL_FEES_KEY = (schoolId: string) => `nst_school_fees_${schoolId}`;

export const getLocalSchoolFees = (schoolId: string): MonthlyFee[] => {
  try {
    const raw = localStorage.getItem(LOCAL_FEES_KEY(schoolId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const setLocalSchoolFees = (schoolId: string, fees: MonthlyFee[]) => {
  try {
    localStorage.setItem(LOCAL_FEES_KEY(schoolId), JSON.stringify(fees));
  } catch {}
};

export const saveFee = async (fee: MonthlyFee) => {
  const id = `${fee.studentId}_${fee.month}`;
  const sanitized = sanitizeForFirestore(fee);

  // 1. Immediately cache in localStorage for instant 0ms retrieval
  try {
    const current = getLocalSchoolFees(fee.schoolId);
    const filtered = current.filter(f => !(f.studentId === fee.studentId && f.month === fee.month));
    setLocalSchoolFees(fee.schoolId, [...filtered, sanitized]);
  } catch (e) {
    console.warn("[school-firebase] Local cache saveFee error:", e);
  }

  // 2. Realtime Database fast sync
  if (rtdb) {
    try {
      await withTimeout(set(ref(rtdb, `schools/${fee.schoolId}/fees/${id}`), sanitized), 2000);
    } catch (e) {
      console.warn("[school-firebase] RTDB saveFee:", e);
    }
  }

  // 3. Firestore persistence
  if (db) {
    try {
      await withTimeout(setDoc(d(`schools/${fee.schoolId}/fees/${id}`), sanitized), 2500);
    } catch (e) {
      console.warn("[school-firebase] Firestore saveFee error:", e);
    }
  }
};

export const getStudentFees = async (schoolId: string, studentId: string): Promise<MonthlyFee[]> => {
  const local = getLocalSchoolFees(schoolId).filter(f => f.studentId === studentId);
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/fees`)), 2500);
    const firestoreFees = (snap as any).docs
      .map((doc: any) => doc.data() as MonthlyFee)
      .filter((f: MonthlyFee) => f.studentId === studentId);

    // Merge: local takes precedence for recent updates
    const map = new Map<string, MonthlyFee>();
    firestoreFees.forEach((f: MonthlyFee) => map.set(`${f.studentId}_${f.month}`, f));
    local.forEach((f: MonthlyFee) => map.set(`${f.studentId}_${f.month}`, f));
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  } catch {
    return local.sort((a, b) => b.month.localeCompare(a.month));
  }
};

export const getMonthlyFees = async (schoolId: string, month: string, classId?: string): Promise<MonthlyFee[]> => {
  const local = getLocalSchoolFees(schoolId).filter(f => f.month === month && (!classId || f.classId === classId));
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/fees`)), 2500);
    const firestoreFees = (snap as any).docs
      .map((doc: any) => doc.data() as MonthlyFee)
      .filter((f: MonthlyFee) => f.month === month && (!classId || f.classId === classId));

    const map = new Map<string, MonthlyFee>();
    firestoreFees.forEach((f: MonthlyFee) => map.set(`${f.studentId}_${f.month}`, f));
    local.forEach((f: MonthlyFee) => map.set(`${f.studentId}_${f.month}`, f));

    let all = Array.from(map.values());
    if (classId) all = all.filter(f => f.classId === classId);
    return all.sort((a, b) => a.studentName.localeCompare(b.studentName));
  } catch {
    return local.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }
};

export const getSchoolFeeHistory = async (schoolId: string): Promise<MonthlyFee[]> => {
  const local = getLocalSchoolFees(schoolId);
  try {
    const snap = await withTimeout(getDocs(col(`schools/${schoolId}/fees`)), 2500);
    const firestoreFees = (snap as any).docs.map((doc: any) => doc.data() as MonthlyFee);

    const map = new Map<string, MonthlyFee>();
    firestoreFees.forEach((f: MonthlyFee) => map.set(`${f.studentId}_${f.month}`, f));
    local.forEach((f: MonthlyFee) => map.set(`${f.studentId}_${f.month}`, f));

    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return local.sort((a, b) => a.month.localeCompare(b.month));
  }
};

export const subscribeToClassFees = (schoolId: string, month: string, classId: string, cb: (fees: MonthlyFee[]) => void) =>
  onSnapshot(
    query(col(`schools/${schoolId}/fees`), where("month", "==", month), where("classId", "==", classId)),
    snap => cb(snap.docs.map(d => d.data() as MonthlyFee)),
    err => { console.warn(`[school-firebase] subscribeToClassFees error:`, err?.code || err); cb([]); }
  );

export const markFeePaid = async (schoolId: string, studentId: string, month: string, paidBy: string) => {
  const id = `${studentId}_${month}`;
  const updates = {
    paid: true,
    paidDate: new Date().toISOString(),
    paidBy,
  };
  const current = getLocalSchoolFees(schoolId);
  const target = current.find(f => f.studentId === studentId && f.month === month);
  if (target) {
    const updated = { ...target, ...updates, balanceDue: 0, paidAmount: target.amount };
    setLocalSchoolFees(schoolId, [...current.filter(f => !(f.studentId === studentId && f.month === month)), updated]);
  }
  if (rtdb) {
    try { await update(ref(rtdb, `schools/${schoolId}/fees/${id}`), updates); } catch {}
  }
  if (db) {
    try { await updateDoc(d(`schools/${schoolId}/fees/${id}`), sanitizeForFirestore(updates)); } catch {}
  }
};

// ── HOMEWORK ─────────────────────────────────────────────────────────────────

export const saveHomework = async (hw: SchoolHomework) => {
  await setDoc(d(`schools/${hw.schoolId}/homework/${hw.id}`), sanitizeForFirestore(hw));
};

export const getHomework = async (schoolId: string, classId: string): Promise<SchoolHomework[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/homework`));
  return snap.docs
    .map(d => d.data() as SchoolHomework)
    .filter(h => h.classId === classId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// ── MCQ RESULTS (school) ─────────────────────────────────────────────────────

export const saveSchoolMCQResult = async (result: SchoolMCQResult) => {
  await setDoc(d(`schools/${result.schoolId}/mcq_results/${result.id}`), sanitizeForFirestore(result));
};

export const getClassMCQResults = async (schoolId: string, classId: string): Promise<SchoolMCQResult[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/mcq_results`));
  return snap.docs
    .map(d => d.data() as SchoolMCQResult)
    .filter(r => r.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date));
};

// ── SCHOOL USER PROFILE ──────────────────────────────────────────────────────

export const saveSchoolUserProfile = async (profile: SchoolUserProfile) => {
  const sanitized = sanitizeForFirestore(profile);
  if (rtdb) {
    try { await set(ref(rtdb, `school_users/${profile.uid}`), sanitized); } catch {}
  }
  await withTimeout(setDoc(d(`school_users/${profile.uid}`), sanitized), 3000);
};

export const getSchoolUserProfile = async (uid: string, userEmail?: string): Promise<SchoolUserProfile | null> => {
  const normEmail = (userEmail || "").trim().toLowerCase();

  // 1. Check RTDB first (fastest)
  if (rtdb) {
    try {
      const snap = await withTimeout(get(ref(rtdb, `school_users/${uid}`)), 1500);
      const val = snap?.val?.();
      if (val && val.schoolId) return val as SchoolUserProfile;
    } catch {}
  }

  // 2. Check Firestore school_users document
  if (db) {
    try {
      const snap = await withTimeout(getDoc(d(`school_users/${uid}`)), 2500);
      if (snap.exists()) {
        const data = snap.data() as SchoolUserProfile;
        if (data && data.schoolId) return data;
      }
    } catch {}
  }

  // 3. Fallback: If userEmail matches a school's adminEmail, auto-grant SCHOOL_ADMIN power!
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
        role: 'SCHOOL_ADMIN',
        name: adminSchool.name + ' Admin',
        email: normEmail,
      };
      // Persist in background so subsequent checks are instant
      saveSchoolUserProfile(autoProfile).catch(() => {});
      return autoProfile;
    }
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
  await updateDoc(d(`schools/${schoolId}`), sanitizeForFirestore({ lockCode, lockCodeActive: active }));
};

export const verifySchoolLockCode = async (schoolId: string, enteredCode: string): Promise<boolean> => {
  const snap = await getDoc(d(`schools/${schoolId}`));
  if (!snap.exists()) return false;
  const school = snap.data();
  if (!school.lockCodeActive || !school.lockCode) return true;
  return school.lockCode === enteredCode;
};

// ── ASSIGN SCHOOL ROLE BY EMAIL ───────────────────────────────────────────────
// Fast & reliable: updates School adminEmail, updates RTDB, and binds school_users
export const assignSchoolAdminByEmail = async (schoolId: string, email: string): Promise<SchoolUserProfile> => {
  const normEmail = email.trim().toLowerCase();
  if (!normEmail) throw new Error("Email address required");

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

export const getAllMonthlyFees = async (schoolId: string, month: string): Promise<MonthlyFee[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/fees`));
  return snap.docs.map(d => d.data() as MonthlyFee).filter(f => f.month === month);
};

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
  await setDoc(d(`schools/${notice.schoolId}/notices/${notice.id}`), sanitizeForFirestore(notice));
};

export const getNotices = async (schoolId: string): Promise<import('./school-types').SchoolNotice[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/notices`));
  return snap.docs.map(doc => doc.data() as import('./school-types').SchoolNotice).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const deleteNotice = async (schoolId: string, noticeId: string) => {
  await deleteDoc(d(`schools/${schoolId}/notices/${noticeId}`));
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
  const snap = await getDocs(col(`schools/${schoolId}/staff`));
  return snap.docs.map(doc => doc.data() as import('./school-types').StaffEmployee);
};

export const deleteStaffEmployee = async (schoolId: string, staffId: string) => {
  await deleteDoc(d(`schools/${schoolId}/staff/${staffId}`));
};

export const saveStaffLeave = async (leave: import('./school-types').StaffLeave) => {
  await setDoc(d(`schools/${leave.schoolId}/leaves/${leave.id}`), sanitizeForFirestore(leave));
};

export const getStaffLeaves = async (schoolId: string): Promise<import('./school-types').StaffLeave[]> => {
  const snap = await getDocs(col(`schools/${schoolId}/leaves`));
  return snap.docs.map(doc => doc.data() as import('./school-types').StaffLeave).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
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

export const generateId = () => doc(collection(db, "_")).id;

export const todayStr = () => new Date().toISOString().split("T")[0];

export const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ── ONLINE ADMISSION & REGISTRATIONS ─────────────────────────────────────────

export const getAdmissionApplications = async (schoolId: string): Promise<import('./school-types').AdmissionApplication[]> => {
  try {
    const snap = await getDocs(col(`schools/${schoolId}/admissions`));
    return snap.docs.map(doc => doc.data() as import('./school-types').AdmissionApplication).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  } catch (e) {
    console.warn("[getAdmissionApplications] error:", e);
    return [];
  }
};

export const saveAdmissionApplication = async (schoolId: string, appData: import('./school-types').AdmissionApplication): Promise<void> => {
  await setDoc(d(`schools/${schoolId}/admissions/${appData.id}`), sanitizeForFirestore(appData));
};

export const updateAdmissionStatus = async (
  schoolId: string,
  appId: string,
  status: 'approved' | 'rejected',
  details?: { reviewedBy?: string; remarks?: string; assignedRollNo?: string; assignedSection?: string }
): Promise<void> => {
  await updateDoc(d(`schools/${schoolId}/admissions/${appId}`), sanitizeForFirestore({
    status,
    reviewedAt: new Date().toISOString(),
    ...(details || {})
  }));
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

export const getSchoolEvents = async (schoolId: string): Promise<import('./school-types').SchoolEventItem[]> => {
  try {
    const snap = await getDocs(col(`schools/${schoolId}/events`));
    return snap.docs.map(doc => doc.data() as import('./school-types').SchoolEventItem).sort((a, b) => a.startDate.localeCompare(b.startDate));
  } catch (e) {
    return [];
  }
};

export const saveSchoolEvent = async (schoolId: string, event: import('./school-types').SchoolEventItem): Promise<void> => {
  await setDoc(d(`schools/${schoolId}/events/${event.id}`), sanitizeForFirestore(event));
};

export const deleteSchoolEvent = async (schoolId: string, eventId: string): Promise<void> => {
  await deleteDoc(d(`schools/${schoolId}/events/${eventId}`));
};

// ── HOLIDAYS & FESTIVALS ────────────────────────────────────────────────────

const LOCAL_HOLIDAYS_KEY = (schoolId: string) => `nst_holidays_${schoolId}`;

export const getSchoolHolidays = async (schoolId: string): Promise<import('./school-types').SchoolHoliday[]> => {
  try {
    const raw = localStorage.getItem(LOCAL_HOLIDAYS_KEY(schoolId));
    let localList: import('./school-types').SchoolHoliday[] = raw ? JSON.parse(raw) : [];

    try {
      const snap = await withTimeout(getDocs(col(`schools/${schoolId}/holidays`)), 2500);
      if (snap && !snap.empty) {
        const remote = snap.docs.map(doc => doc.data() as import('./school-types').SchoolHoliday);
        localStorage.setItem(LOCAL_HOLIDAYS_KEY(schoolId), JSON.stringify(remote));
        return remote.sort((a, b) => a.startDate.localeCompare(b.startDate));
      }
    } catch {}

    return localList.sort((a, b) => a.startDate.localeCompare(b.startDate));
  } catch {
    return [];
  }
};

export const saveSchoolHoliday = async (schoolId: string, holiday: import('./school-types').SchoolHoliday): Promise<void> => {
  try {
    const list = await getSchoolHolidays(schoolId);
    const updated = [holiday, ...list.filter(h => h.id !== holiday.id)].sort((a, b) => a.startDate.localeCompare(b.startDate));
    localStorage.setItem(LOCAL_HOLIDAYS_KEY(schoolId), JSON.stringify(updated));

    if (db) {
      await withTimeout(setDoc(d(`schools/${schoolId}/holidays/${holiday.id}`), sanitizeForFirestore(holiday)), 2500);
    }
  } catch (e) {
    console.warn("[school-firebase] saveSchoolHoliday:", e);
  }
};

export const deleteSchoolHoliday = async (schoolId: string, holidayId: string): Promise<void> => {
  try {
    const list = await getSchoolHolidays(schoolId);
    const updated = list.filter(h => h.id !== holidayId);
    localStorage.setItem(LOCAL_HOLIDAYS_KEY(schoolId), JSON.stringify(updated));

    if (db) {
      await withTimeout(deleteDoc(d(`schools/${schoolId}/holidays/${holidayId}`)), 2500);
    }
  } catch (e) {
    console.warn("[school-firebase] deleteSchoolHoliday:", e);
  }
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

