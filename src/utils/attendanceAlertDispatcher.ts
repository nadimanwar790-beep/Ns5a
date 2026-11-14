import { saveNstaMessage, todayStr } from "../school-firebase";
import type { NstaMessage } from "../school-types";
import { sendSchoolPushNotification } from "./schoolPushClient";

export type AttendanceAlertStatus = "in" | "out" | "late" | "present" | "absent";

export interface AttendanceAlertStudentItem {
  studentId: string;
  studentName: string;
  rollNo?: string;
  classId?: string;
  className?: string;
  status: AttendanceAlertStatus;
  timeText?: string;
  stayDuration?: string;
}

export interface DispatchSingleAttendanceAlertParams extends AttendanceAlertStudentItem {
  schoolId: string;
  schoolName?: string;
  date?: string;
  sourceLabel?: string;
  senderName?: string;
  skipPush?: boolean;
  skipMessenger?: boolean;
  skipDedupe?: boolean;
  consecutiveAbsent?: boolean;
}

export interface DispatchBatchAttendanceAlertsParams {
  schoolId: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  date?: string;
  sourceLabel?: string;
  senderName?: string;
  items: AttendanceAlertStudentItem[];
  skipPush?: boolean;
  skipMessenger?: boolean;
  skipDedupe?: boolean;
}

const ALERT_SENT_KEY = (schoolId: string, date: string) =>
  `nst_att_alert_sent_${schoolId}_${date}`;

const normalizeAlertBucket = (status: AttendanceAlertStatus): "arrived" | "out" | "absent" => {
  if (status === "out") return "out";
  if (status === "absent") return "absent";
  return "arrived"; // 'in' | 'late' | 'present'
};

const readDailyAlertMap = (schoolId: string, date: string): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ALERT_SENT_KEY(schoolId, date));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeDailyAlertMap = (schoolId: string, date: string, map: Record<string, string>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALERT_SENT_KEY(schoolId, date), JSON.stringify(map));
  } catch {}
};

export const recordAttendanceAlertDispatched = (
  schoolId: string,
  date: string,
  studentId: string,
  status: AttendanceAlertStatus
) => {
  if (!schoolId || !studentId) return;
  const d = date || todayStr();
  const map = readDailyAlertMap(schoolId, d);
  const bucket = normalizeAlertBucket(status);
  // Keep combined history if student already arrived and now departed: "arrived+out"
  const prev = map[studentId] || "";
  if (bucket === "out" && prev === "arrived") {
    map[studentId] = "arrived+out";
  } else {
    map[studentId] = bucket;
  }
  writeDailyAlertMap(schoolId, d, map);
};

const shouldDispatchForStudent = (
  map: Record<string, string>,
  studentId: string,
  status: AttendanceAlertStatus,
  skipDedupe?: boolean
): boolean => {
  if (skipDedupe) return true;
  const prev = map[studentId];
  if (!prev) return true;
  const bucket = normalizeAlertBucket(status);
  if (bucket === "out") {
    return prev !== "out" && prev !== "arrived+out";
  }
  if (bucket === "arrived") {
    return prev !== "arrived" && prev !== "arrived+out";
  }
  return prev !== bucket;
};

const buildAlertCopy = (params: {
  studentName: string;
  rollNo?: string;
  className?: string;
  status: AttendanceAlertStatus;
  timeText?: string;
  stayDuration?: string;
  date: string;
  schoolName?: string;
  sourceLabel?: string;
  consecutiveAbsent?: boolean;
}) => {
  const {
    studentName,
    rollNo,
    className,
    status,
    timeText,
    stayDuration,
    date,
    sourceLabel,
    consecutiveAbsent,
  } = params;

  const classRollLabel = [className, rollNo ? `रोल #${rollNo}` : ""].filter(Boolean).join(", ");
  const metaSuffix = classRollLabel ? ` (${classRollLabel})` : "";
  const timeNow =
    timeText ||
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  const modeTag = sourceLabel ? `\nमाध्यम: ${sourceLabel} • दिनांक: ${date}` : "";

  if (status === "out") {
    return {
      pushTitle: `🚪 विद्यालय प्रस्थान (OUT): ${studentName}`,
      pushBody: `आपका बच्चा ${studentName}${metaSuffix} आज ${timeNow} पर विद्यालय से प्रस्थान कर चुका है। कुल समय: ${stayDuration || "दर्ज"}।`,
      messengerText: `🏠 [विद्यालय प्रस्थान सूचना]\nनमस्ते! आपका बच्चा ${studentName}${metaSuffix} आज समय ${timeNow} पर विद्यालय से प्रस्थान कर चुका है।\nकुल उपस्थिति समय: ${stayDuration || "दर्ज"}।${modeTag}`,
      pushType: "SCHOOL_NOTICE" as const,
      urgent: true,
    };
  }

  if (status === "absent") {
    const day2Prefix = consecutiveAbsent
      ? "⚠️ [लगातार दूसरे दिन अनुपस्थिति सूचना]"
      : "⚠️ [विद्यालय अनुपस्थिति सूचना]";
    const bodyText = consecutiveAbsent
      ? `आदरणीय अभिभावक, आपका बच्चा ${studentName}${metaSuffix} लगातार दूसरे दिन (${date}) भी विद्यालय में अनुपस्थित है। कृपया तुरंत विद्यालय प्रशासन से संपर्क करें।`
      : `आदरणीय अभिभावक, आपका बच्चा ${studentName}${metaSuffix} आज (${date}) विद्यालय में अनुपस्थित है। यदि कोई समस्या या अवकाश है तो कृपया सूचित करें।`;

    return {
      pushTitle: `${consecutiveAbsent ? "🚨 लगातार अनुपस्थिति" : "⚠️ अनुपस्थिति सूचना"} • ${studentName}`,
      pushBody: bodyText,
      messengerText: `${day2Prefix}\n${bodyText}${modeTag}`,
      pushType: "SCHOOL_NOTICE" as const,
      urgent: true,
    };
  }

  if (status === "late") {
    return {
      pushTitle: `⚠️ विद्यालय प्रवेश (Late): ${studentName}`,
      pushBody: `आपका बच्चा ${studentName}${metaSuffix} आज ${timeNow} पर (विलंब से) विद्यालय पहुँच चुका है। उपस्थिति दर्ज।`,
      messengerText: `🎒 [विद्यालय आगमन सूचना — विलंब]\nनमस्ते! आपका बच्चा ${studentName}${metaSuffix} आज समय ${timeNow} पर विद्यालय पहुँच चुका है।\nउपस्थिति स्थिति: विलंब आगमन (Late Arrival)।${modeTag}`,
      pushType: "SCHOOL_NOTICE" as const,
      urgent: true,
    };
  }

  // 'in' or 'present'
  const actionPhrase =
    status === "in"
      ? `आज समय ${timeNow} पर विद्यालय सकुशल पहुँच चुका है`
      : `की आज (${date}) की उपस्थिति (Present) दर्ज की गई है (${timeNow})`;

  return {
    pushTitle: `🎒 विद्यालय उपस्थिति (Present): ${studentName}`,
    pushBody: `नमस्ते! आपका बच्चा ${studentName}${metaSuffix} ${actionPhrase}। ✅`,
    messengerText: `🎒 [विद्यालय उपस्थिति सूचना]\nनमस्ते! आपका बच्चा ${studentName}${metaSuffix} ${actionPhrase}।\nउपस्थिति स्थिति: उपस्थित (Present) ✅${modeTag}`,
    pushType: "SCHOOL_NOTICE" as const,
    urgent: true,
  };
};

/**
 * Dispatches BOTH an NSTA Messenger chat message (SCHOOL_DESK private student thread)
 * AND a targeted mobile Push Notification for a single student's attendance event.
 */
export const dispatchAttendanceParentAlert = async (
  params: DispatchSingleAttendanceAlertParams
): Promise<{ messengerSent: boolean; pushDelivered: number; skippedDuplicate?: boolean }> => {
  if (!params.schoolId || !params.studentId) {
    return { messengerSent: false, pushDelivered: 0 };
  }

  const date = params.date || todayStr();
  const alertMap = readDailyAlertMap(params.schoolId, date);

  if (!shouldDispatchForStudent(alertMap, params.studentId, params.status, params.skipDedupe)) {
    return { messengerSent: false, pushDelivered: 0, skippedDuplicate: true };
  }

  // Record upfront so double-taps cannot race
  recordAttendanceAlertDispatched(params.schoolId, date, params.studentId, params.status);

  const copy = buildAlertCopy({
    studentName: params.studentName,
    rollNo: params.rollNo,
    className: params.className,
    status: params.status,
    timeText: params.timeText,
    stayDuration: params.stayDuration,
    date,
    schoolName: params.schoolName,
    sourceLabel: params.sourceLabel,
    consecutiveAbsent: params.consecutiveAbsent,
  });

  let messengerSent = false;
  let pushDelivered = 0;

  const messengerPromise = params.skipMessenger
    ? Promise.resolve()
    : saveNstaMessage({
        id: `msg_att_${Date.now()}_${params.studentId}_${Math.random().toString(36).slice(2, 6)}`,
        schoolId: params.schoolId,
        threadType: "SCHOOL_DESK",
        classId: params.classId,
        studentId: params.studentId,
        studentName: params.studentName,
        senderId: "school_attendance_desk",
        senderName: params.senderName || `${params.schoolName || "विद्यालय"} उपस्थिति डेस्क`,
        senderRole: "ADMIN",
        text: copy.messengerText,
        createdAt: new Date().toISOString(),
        status: "delivered",
      })
        .then(() => {
          messengerSent = true;
        })
        .catch(() => {});

  const pushPromise = params.skipPush
    ? Promise.resolve()
    : sendSchoolPushNotification({
        schoolId: params.schoolId,
        classId: params.classId,
        className: params.className,
        studentIds: [params.studentId],
        senderId: "school_attendance_desk",
        senderName: params.senderName || `${params.schoolName || "विद्यालय"} उपस्थिति डेस्क`,
        title: copy.pushTitle,
        body: copy.pushBody,
        type: copy.pushType,
        url: `/?schoolPortal=1&studentId=${encodeURIComponent(params.studentId)}&schoolTab=messenger&subTab=school`,
        urgent: true,
      })
        .then((res) => {
          pushDelivered = Number(res?.delivered || 0);
        })
        .catch(() => {});

  await Promise.allSettled([messengerPromise, pushPromise]);

  return { messengerSent, pushDelivered };
};

/**
 * Dispatches NSTA Messenger messages (individually in each student's SCHOOL_DESK thread)
 * + grouped batch Push Notifications when class register or bulk attendance is saved.
 */
export const dispatchAttendanceBatchAlerts = async (
  params: DispatchBatchAttendanceAlertsParams
): Promise<{ messengerCount: number; pushDelivered: number }> => {
  if (!params.schoolId || !Array.isArray(params.items) || params.items.length === 0) {
    return { messengerCount: 0, pushDelivered: 0 };
  }

  const date = params.date || todayStr();
  const alertMap = readDailyAlertMap(params.schoolId, date);

  const eligible = params.items.filter((item) =>
    item.studentId && shouldDispatchForStudent(alertMap, item.studentId, item.status, params.skipDedupe)
  );

  if (eligible.length === 0) {
    return { messengerCount: 0, pushDelivered: 0 };
  }

  // Record all eligible students immediately
  eligible.forEach((item) => {
    const bucket = normalizeAlertBucket(item.status);
    const prev = alertMap[item.studentId] || "";
    alertMap[item.studentId] = bucket === "out" && prev === "arrived" ? "arrived+out" : bucket;
  });
  writeDailyAlertMap(params.schoolId, date, alertMap);

  let messengerCount = 0;
  let pushDelivered = 0;

  // 1. Send personalized NSTA Messenger SCHOOL_DESK message for each student
  if (!params.skipMessenger) {
    const baseTs = Date.now();
    await Promise.allSettled(
      eligible.map(async (item, idx) => {
        const copy = buildAlertCopy({
          studentName: item.studentName,
          rollNo: item.rollNo,
          className: item.className || params.className,
          status: item.status,
          timeText: item.timeText,
          stayDuration: item.stayDuration,
          date,
          schoolName: params.schoolName,
          sourceLabel: params.sourceLabel,
        });

        const msg: NstaMessage = {
          id: `msg_att_${baseTs}_${idx}_${item.studentId}`,
          schoolId: params.schoolId,
          threadType: "SCHOOL_DESK",
          classId: item.classId || params.classId,
          studentId: item.studentId,
          studentName: item.studentName,
          senderId: "school_attendance_desk",
          senderName: params.senderName || `${params.schoolName || "विद्यालय"} उपस्थिति डेस्क`,
          senderRole: "ADMIN",
          text: copy.messengerText,
          createdAt: new Date(baseTs + idx).toISOString(),
          status: "delivered",
        };
        await saveNstaMessage(msg);
        messengerCount++;
      })
    );
  }

  // 2. Group push notifications by status bucket so parents get instant alerts cleanly
  if (!params.skipPush) {
    const presentIds = eligible.filter((i) => i.status === "present" || i.status === "in" || i.status === "late").map((i) => i.studentId);
    const absentIds = eligible.filter((i) => i.status === "absent").map((i) => i.studentId);
    const outIds = eligible.filter((i) => i.status === "out").map((i) => i.studentId);

    const pushCalls: Promise<void>[] = [];

    if (presentIds.length > 0) {
      pushCalls.push(
        sendSchoolPushNotification({
          schoolId: params.schoolId,
          classId: params.classId,
          className: params.className,
          studentIds: presentIds,
          senderId: "school_attendance_desk",
          senderName: params.senderName || `${params.schoolName || "विद्यालय"} उपस्थिति डेस्क`,
          title: `🎒 विद्यालय उपस्थिति सूचना • ${params.className || "Class"}`,
          body: `आपका बच्चा आज (${date}) विद्यालय में उपस्थित (Present) दर्ज किया गया है। ✅`,
          type: "SCHOOL_NOTICE",
          url: `/?schoolPortal=1&classId=${encodeURIComponent(params.classId || "")}&schoolTab=messenger&subTab=school`,
          urgent: true,
        })
          .then((res) => {
            pushDelivered += Number(res?.delivered || 0);
          })
          .catch(() => {})
      );
    }

    if (absentIds.length > 0) {
      pushCalls.push(
        sendSchoolPushNotification({
          schoolId: params.schoolId,
          classId: params.classId,
          className: params.className,
          studentIds: absentIds,
          senderId: "school_attendance_desk",
          senderName: params.senderName || `${params.schoolName || "विद्यालय"} उपस्थिति डेस्क`,
          title: `⚠️ विद्यालय अनुपस्थिति सूचना • ${params.className || "Class"}`,
          body: `आदरणीय अभिभावक, आपका बच्चा आज (${date}) विद्यालय में अनुपस्थित है। यदि कोई समस्या या अवकाश है तो कृपया सूचित करें।`,
          type: "SCHOOL_NOTICE",
          url: `/?schoolPortal=1&classId=${encodeURIComponent(params.classId || "")}&schoolTab=messenger&subTab=school`,
          urgent: true,
        })
          .then((res) => {
            pushDelivered += Number(res?.delivered || 0);
          })
          .catch(() => {})
      );
    }

    if (outIds.length > 0) {
      pushCalls.push(
        sendSchoolPushNotification({
          schoolId: params.schoolId,
          classId: params.classId,
          className: params.className,
          studentIds: outIds,
          senderId: "school_attendance_desk",
          senderName: params.senderName || `${params.schoolName || "विद्यालय"} उपस्थिति डेस्क`,
          title: `🚪 विद्यालय प्रस्थान सूचना • ${params.className || "Class"}`,
          body: `आपका बच्चा आज (${date}) विद्यालय से प्रस्थान (Punch-Out) कर चुका है।`,
          type: "SCHOOL_NOTICE",
          url: `/?schoolPortal=1&classId=${encodeURIComponent(params.classId || "")}&schoolTab=messenger&subTab=school`,
          urgent: true,
        })
          .then((res) => {
            pushDelivered += Number(res?.delivered || 0);
          })
          .catch(() => {})
      );
    }

    await Promise.allSettled(pushCalls);
  }

  return { messengerCount, pushDelivered };
};
