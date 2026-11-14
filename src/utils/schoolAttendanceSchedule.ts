import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface SchoolAttendanceSchedule {
  inCutoffTime: string; // HH:MM (24h), e.g., "09:30" — arrival after this counts as Late IN
  outStartTime: string; // HH:MM (24h), e.g., "12:30" — auto mode starts marking OUT at/after this time
  updatedAt?: string;
}

export const DEFAULT_IN_CUTOFF_TIME = "09:30";
export const DEFAULT_OUT_START_TIME = "12:30";
const SCHEDULE_UPDATED_EVENT = "school-attendance-schedule-updated";

const getInCutoffKey = (schoolId: string) => `nst_kiosk_in_cutoff_${schoolId}`;
const getOutStartKey = (schoolId: string) => `nst_kiosk_out_start_${schoolId}`;

export const isValidHHMM = (val?: string): val is string =>
  typeof val === "string" && /^\d{1,2}:\d{2}$/.test(val.trim());

export const timeToMinutes = (hhmm?: string, fallbackMinutes = 570): number => {
  if (!hhmm || !isValidHHMM(hhmm)) return fallbackMinutes;
  const [hStr, mStr] = hhmm.trim().split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallbackMinutes;
  }
  return h * 60 + m;
};

export const formatTime12h = (hhmm?: string): string => {
  if (!hhmm || !isValidHHMM(hhmm)) return hhmm || "--:--";
  const [hStr, mStr] = hhmm.trim().split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

export const getLocalAttendanceSchedule = (schoolId?: string): SchoolAttendanceSchedule => {
  if (!schoolId || typeof window === "undefined") {
    return { inCutoffTime: DEFAULT_IN_CUTOFF_TIME, outStartTime: DEFAULT_OUT_START_TIME };
  }
  try {
    const rawIn = localStorage.getItem(getInCutoffKey(schoolId));
    const rawOut = localStorage.getItem(getOutStartKey(schoolId));
    return {
      inCutoffTime: isValidHHMM(rawIn || undefined) ? rawIn!.trim() : DEFAULT_IN_CUTOFF_TIME,
      outStartTime: isValidHHMM(rawOut || undefined) ? rawOut!.trim() : DEFAULT_OUT_START_TIME,
    };
  } catch {
    return { inCutoffTime: DEFAULT_IN_CUTOFF_TIME, outStartTime: DEFAULT_OUT_START_TIME };
  }
};

export const fetchAttendanceSchedule = async (schoolId?: string): Promise<SchoolAttendanceSchedule> => {
  const local = getLocalAttendanceSchedule(schoolId);
  if (!schoolId || !db) return local;

  try {
    const snap = await getDoc(doc(db, `schools/${schoolId}/config/attendance_timings`));
    if (snap.exists()) {
      const data = snap.data() as any;
      const inCutoffTime = isValidHHMM(data?.inCutoffTime) ? data.inCutoffTime.trim() : local.inCutoffTime;
      const outStartTime = isValidHHMM(data?.outStartTime) ? data.outStartTime.trim() : local.outStartTime;
      try {
        localStorage.setItem(getInCutoffKey(schoolId), inCutoffTime);
        localStorage.setItem(getOutStartKey(schoolId), outStartTime);
      } catch {}
      return {
        inCutoffTime,
        outStartTime,
        updatedAt: data?.updatedAt,
      };
    }
  } catch (err) {
    console.warn("[schoolAttendanceSchedule] Firestore fetch failed:", err);
  }
  return local;
};

export const saveAttendanceSchedule = async (
  schoolId: string,
  schedule: { inCutoffTime: string; outStartTime: string }
): Promise<SchoolAttendanceSchedule> => {
  const clean: SchoolAttendanceSchedule = {
    inCutoffTime: isValidHHMM(schedule.inCutoffTime) ? schedule.inCutoffTime.trim() : DEFAULT_IN_CUTOFF_TIME,
    outStartTime: isValidHHMM(schedule.outStartTime) ? schedule.outStartTime.trim() : DEFAULT_OUT_START_TIME,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getInCutoffKey(schoolId), clean.inCutoffTime);
      localStorage.setItem(getOutStartKey(schoolId), clean.outStartTime);
    } catch {}
    window.dispatchEvent(
      new CustomEvent(SCHEDULE_UPDATED_EVENT, { detail: { schoolId, ...clean } })
    );
  }

  if (db && schoolId) {
    try {
      await setDoc(
        doc(db, `schools/${schoolId}/config/attendance_timings`),
        clean,
        { merge: true }
      );
    } catch (err) {
      console.warn("[schoolAttendanceSchedule] Firestore save warning:", err);
    }
  }

  return clean;
};

export const subscribeAttendanceSchedule = (
  schoolId: string | undefined,
  onChange: (schedule: SchoolAttendanceSchedule) => void
): (() => void) => {
  if (!schoolId) {
    onChange({ inCutoffTime: DEFAULT_IN_CUTOFF_TIME, outStartTime: DEFAULT_OUT_START_TIME });
    return () => {};
  }

  let active = true;
  onChange(getLocalAttendanceSchedule(schoolId));

  void fetchAttendanceSchedule(schoolId).then((remote) => {
    if (active) onChange(remote);
  });

  const handleEvent = (ev: Event) => {
    const custom = ev as CustomEvent<{ schoolId?: string } & SchoolAttendanceSchedule>;
    if (!custom?.detail || custom.detail.schoolId === schoolId) {
      onChange({
        inCutoffTime: custom.detail?.inCutoffTime || getLocalAttendanceSchedule(schoolId).inCutoffTime,
        outStartTime: custom.detail?.outStartTime || getLocalAttendanceSchedule(schoolId).outStartTime,
        updatedAt: custom.detail?.updatedAt,
      });
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener(SCHEDULE_UPDATED_EVENT, handleEvent);
  }

  return () => {
    active = false;
    if (typeof window !== "undefined") {
      window.removeEventListener(SCHEDULE_UPDATED_EVENT, handleEvent);
    }
  };
};

export interface LiveShiftStatus {
  autoAction: "in" | "out";
  phase: "on_time_in" | "late_in" | "out_active";
  inCutoffLabel: string;
  outStartLabel: string;
  badgeText: string;
  helperText: string;
}

export const getLiveShiftStatus = (
  schedule: SchoolAttendanceSchedule,
  now: Date = new Date()
): LiveShiftStatus => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const inCutoffMinutes = timeToMinutes(schedule.inCutoffTime, 570);
  const outStartMinutes = timeToMinutes(schedule.outStartTime, 750);

  const inCutoffLabel = formatTime12h(schedule.inCutoffTime);
  const outStartLabel = formatTime12h(schedule.outStartTime);

  if (nowMinutes >= outStartMinutes) {
    return {
      autoAction: "out",
      phase: "out_active",
      inCutoffLabel,
      outStartLabel,
      badgeText: `🔴 अभी OUT सक्रिय (${outStartLabel} से)`,
      helperText: `जिन छात्रों/स्टाफ का IN हो चुका है, स्कैन करने पर अब Auto OUT (प्रस्थान) लगेगा। नया आगमन आने पर पहले IN लगेगा।`,
    };
  }

  if (nowMinutes > inCutoffMinutes) {
    return {
      autoAction: "in",
      phase: "late_in",
      inCutoffLabel,
      outStartLabel,
      badgeText: `🟠 Late IN सक्रिय • OUT: ${outStartLabel} से`,
      helperText: `${inCutoffLabel} कटऑफ के बाद आने पर Late IN दर्ज होगा। Auto OUT ${outStartLabel} से शुरू होगा (जरूरी हो तो OUT बटन चुनें)।`,
    };
  }

  return {
    autoAction: "in",
    phase: "on_time_in",
    inCutoffLabel,
    outStartLabel,
    badgeText: `🟢 अभी IN टाइम (${inCutoffLabel} तक समय पर) • OUT: ${outStartLabel} से`,
    helperText: `सुबह ${inCutoffLabel} तक On-Time IN लगेगा। ${outStartLabel} के बाद छुट्टी (Auto OUT) शुरू होगा।`,
  };
};
