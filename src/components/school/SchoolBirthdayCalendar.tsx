// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { SchoolStudent, SchoolClass, SchoolEvent, SchoolEventType } from "../../school-types";
import {
  isStudentBirthdayOnDate,
  isStudentBirthdayToday,
  dispatchOfficialSchoolBirthdayWish,
  getStudentBirthdayInfo,
  subscribeToSchoolEvents,
  saveSchoolEvent,
  deleteSchoolEvent,
  dispatchTeacherEventNotification,
  checkAndDispatchMorningEventAlerts
} from "../../school-firebase";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Cake, Gift, Sparkles,
  Users, Check, Share2, Award, Clock, ArrowRight, Heart, Bell, Loader2,
  Plus, Trash2, MapPin, Send, AlertCircle, FileText, CheckCircle2, X, Briefcase
} from "lucide-react";

interface Props {
  schoolId: string;
  schoolName?: string;
  students: SchoolStudent[];
  classes: SchoolClass[];
  onOpenMessenger?: () => void;
}

const MONTH_NAMES = [
  "January (जनवरी)", "February (फ़रवरी)", "March (मार्च)", "April (अप्रैल)",
  "May (मई)", "June (जून)", "July (जुलाई)", "August (अगस्त)",
  "September (सितंबर)", "October (अक्टूबर)", "November (नवंबर)", "December (दिसंबर)"
];

const WEEK_DAYS_SHORT = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

export const SchoolBirthdayCalendar: React.FC<Props> = ({
  schoolId,
  schoolName = "School",
  students = [],
  classes = [],
  onOpenMessenger
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayYear = today.getFullYear();

  const [currentYear, setCurrentYear] = useState<number>(todayYear);
  const [currentMonth, setCurrentMonth] = useState<number>(todayMonth); // 1-12
  const [selectedDay, setSelectedDay] = useState<number>(todayDay);
  // On mobile screens, user can view both side-by-side or quick toggle between Calendar and Events
  const [mobileViewMode, setMobileViewMode] = useState<"side_by_side" | "calendar" | "events">("side_by_side");

  // Events state
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [dispatchingEventId, setDispatchingEventId] = useState<string | null>(null);

  // Form state for new event
  const [eventForm, setEventForm] = useState<{
    title: string;
    type: SchoolEventType;
    date: string;
    time: string;
    venue: string;
    description: string;
    targetAudience: "ALL_TEACHERS" | "ALL_STUDENTS" | "WHOLE_SCHOOL";
    autoMorningAlert: boolean;
  }>({
    title: "",
    type: "MEETING",
    date: `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`,
    time: "09:30 AM",
    venue: "Principal Office / Conference Room",
    description: "",
    targetAudience: "ALL_TEACHERS",
    autoMorningAlert: true
  });

  const [wishingId, setWishingId] = useState<string | null>(null);
  const [wishedMap, setWishedMap] = useState<{ [studentId: string]: boolean }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to school events
  useEffect(() => {
    if (!schoolId) return;
    const unsub = subscribeToSchoolEvents(schoolId, (evts) => {
      setEvents(evts);
    });
    // Trigger morning 6 AM check
    checkAndDispatchMorningEventAlerts(schoolId).catch(() => {});
    return () => unsub();
  }, [schoolId]);

  // Selected date formatted as YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    const y = currentYear;
    const m = String(currentMonth).padStart(2, "0");
    const d = String(selectedDay).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentYear, currentMonth, selectedDay]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(1);
  };

  const handleJumpToToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setSelectedDay(todayDay);
  };

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1).getDay();
  }, [currentYear, currentMonth]);

  // Map of day -> students with birthdays
  const birthdaysByDay = useMemo(() => {
    const map: { [day: number]: SchoolStudent[] } = {};
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = [];
    }
    students.forEach((st) => {
      const info = getStudentBirthdayInfo(st.dateOfBirth);
      if (info && info.month === currentMonth && info.day <= daysInMonth) {
        if (!map[info.day]) map[info.day] = [];
        map[info.day].push(st);
      }
    });
    return map;
  }, [students, currentMonth, daysInMonth]);

  // Map of day -> events
  const eventsByDay = useMemo(() => {
    const map: { [day: number]: SchoolEvent[] } = {};
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = [];
    }
    events.forEach((evt) => {
      if (!evt.date) return;
      const parts = evt.date.split("-").map(Number);
      if (parts.length === 3) {
        const [y, m, d] = parts;
        if (y === currentYear && m === currentMonth && d <= daysInMonth) {
          if (!map[d]) map[d] = [];
          map[d].push(evt);
        }
      }
    });
    return map;
  }, [events, currentYear, currentMonth, daysInMonth]);

  // Total items this month
  const totalMonthBirthdays = useMemo(() => {
    return Object.values(birthdaysByDay).reduce((acc, list) => acc + list.length, 0);
  }, [birthdaysByDay]);

  const totalMonthEvents = useMemo(() => {
    return Object.values(eventsByDay).reduce((acc, list) => acc + list.length, 0);
  }, [eventsByDay]);

  // Selected date items
  const selectedDayBirthdays = useMemo(() => {
    return birthdaysByDay[selectedDay] || [];
  }, [birthdaysByDay, selectedDay]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDay[selectedDay] || [];
  }, [eventsByDay, selectedDay]);

  // Handle Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      toast.error("कृपया कार्यक्रम का नाम (Title) दर्ज करें।");
      return;
    }
    setSavingEvent(true);
    try {
      const newEvent: SchoolEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        schoolId,
        title: eventForm.title.trim(),
        type: eventForm.type,
        date: eventForm.date || selectedDateStr,
        time: eventForm.time || undefined,
        venue: eventForm.venue || undefined,
        description: eventForm.description || undefined,
        targetAudience: eventForm.targetAudience,
        createdAt: new Date().toISOString()
      };

      await saveSchoolEvent(newEvent);

      // If user wants immediate dispatch or if date is today and auto alert is enabled
      const todayStr = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;
      if (newEvent.date === todayStr) {
        await dispatchTeacherEventNotification(schoolId, newEvent, { force: true });
        setToastMessage(`✅ कार्यक्रम सेव हुआ व सभी शिक्षकों के NSTA Messenger पर अलर्ट भेज दिया गया!`);
      } else {
        setToastMessage(`✅ कार्यक्रम सेव हुआ! ${newEvent.date} को सुबह 6:00 बजे सभी शिक्षकों को स्वतः NSTA अलर्ट जाएगा।`);
      }

      setShowAddEventModal(false);
      setEventForm({
        title: "",
        type: "MEETING",
        date: selectedDateStr,
        time: "09:30 AM",
        venue: "Principal Office / Conference Room",
        description: "",
        targetAudience: "ALL_TEACHERS",
        autoMorningAlert: true
      });
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      toast.error("इवेंट सेव करने में त्रुटि: " + (err?.message || "Error"));
    } finally {
      setSavingEvent(false);
    }
  };

  // Immediate Broadcast to Teachers
  const handleBroadcastEventNow = async (event: SchoolEvent) => {
    setDispatchingEventId(event.id);
    try {
      const res = await dispatchTeacherEventNotification(schoolId, event, { force: true });
      setToastMessage(`📢 ${res.delivered} शिक्षकों के NSTA Messenger पर कार्यक्रम सूचना सफलतापूर्वक भेजी गई!`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: any) {
      toast.error("अलर्ट भेजने में त्रुटि: " + (err?.message || "Error"));
    } finally {
      setDispatchingEventId(null);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteSchoolEvent(schoolId, eventId);
      setToastMessage("कार्यक्रम सफलतापूर्वक हटाया गया।");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      toast.error("हटाने में त्रुटि: " + (err?.message || "Error"));
    }
  };

  // Send official birthday wish
  const handleSendBirthdayWish = async (student: SchoolStudent) => {
    setWishingId(student.id);
    try {
      const className = classes.find((c) => c.id === student.classId)?.name || "Class Student";
      await dispatchOfficialSchoolBirthdayWish({
        schoolId,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        className,
        photoUrl: student.photoUrl,
        dateOfBirth: student.dateOfBirth,
        parentPhone: student.phone
      });
      setWishedMap((prev) => ({ ...prev, [student.id]: true }));
      setToastMessage(`🎉 ${student.name} को जन्मदिन की आधिकारिक बधाई व आशीर्वाद पत्र भेजा गया!`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (e: any) {
      toast.error("शुभकामना भेजने में त्रुटि: " + (e?.message || "Error"));
    } finally {
      setWishingId(null);
    }
  };

  const isViewingToday = currentYear === todayYear && currentMonth === todayMonth && selectedDay === todayDay;

  // Type badge styling helper
  const getEventTypeMeta = (type: SchoolEventType) => {
    switch (type) {
      case "MEETING":
        return { label: "🤝 मीटिंग (Staff Meeting)", bg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" };
      case "EXAM":
        return { label: "📝 परीक्षा (Exam Day)", bg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" };
      case "RESULT_DAY":
        return { label: "📊 रिजल्ट डे (Result / PTM)", bg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" };
      case "OFFICIAL_WORK":
        return { label: "💼 स्कूल कार्य (Inspection/Audit)", bg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" };
      case "CELEBRATION":
        return { label: "🎉 वार्षिकोत्सव / उत्सव", bg: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30" };
      case "HOLIDAY":
        return { label: "🏖️ अवकाश (Holiday)", bg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" };
      default:
        return { label: "📌 महत्वपूर्ण कार्य", bg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" };
    }
  };

  return (
    <div className="space-y-4">
      {/* ── TOAST ALERT ── */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white text-xs sm:text-sm font-bold shadow-xl border border-indigo-500/40 flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded">
            ✕
          </button>
        </div>
      )}

      {/* ── UNIFIED SIDE-BY-SIDE CARD: CALENDAR (LEFT) + EVENTS & BIRTHDAYS (RIGHT) ── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Top Header Ribbon */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg shadow-sm shrink-0">
              📅
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white">
                  स्कूल कैलेंडर व इवेंट सेंटर (School Calendar &amp; Events)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  ⚡ 6 AM Teacher Auto-Alert Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                एक तरफ कैलेंडर • दूसरी तरफ आज के इवेंट्स, मीटिंग्स व छात्र जन्मदिन
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile View Toggle Pills (Side-by-Side vs Single Tab) */}
            <div className="flex md:hidden items-center bg-black/40 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setMobileViewMode("side_by_side")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  mobileViewMode === "side_by_side"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
                title="दोनों साथ-साथ (Side by Side)"
              >
                ⬛ 2-Side
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode("calendar")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  mobileViewMode === "calendar"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
                title="सिर्फ कैलेंडर (Calendar Only)"
              >
                📅 Cal
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode("events")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  mobileViewMode === "events"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
                title="सिर्फ इवेंट्स (Events Only)"
              >
                📋 Event ({selectedDayEvents.length + selectedDayBirthdays.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setEventForm((prev) => ({
                  ...prev,
                  date: selectedDateStr
                }));
                setShowAddEventModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ नया इवेंट</span>
            </button>
          </div>
        </div>

        {/* ── 2-COLUMN SPLIT CONTAINER (EK SIDE CALENDAR • DUSRI TARAF EVENTS) ── */}
        <div className={`divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700 ${
          mobileViewMode === "side_by_side"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12"
            : "grid grid-cols-1 md:grid-cols-12"
        }`}>
          {/* ════ LEFT COLUMN: COMPACT CALENDAR (5/12 on md+, sm:col-span-1) ════ */}
          <div className={`p-3 sm:p-5 flex flex-col justify-between ${
            mobileViewMode === "side_by_side"
              ? "sm:col-span-1 md:col-span-5 block"
              : mobileViewMode === "calendar"
              ? "block md:col-span-5"
              : "hidden md:flex md:col-span-5"
          }`}>
            <div>
              {/* Month Navigation Strip */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {MONTH_NAMES[currentMonth - 1].split(" ")[0]} {currentYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-black hover:bg-indigo-100 transition cursor-pointer"
                    title="Jump to Today"
                  >
                    आज (Today)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day-of-week labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {WEEK_DAYS_SHORT.map((wd, idx) => (
                  <div
                    key={wd}
                    className={`text-[10px] font-black py-1 uppercase ${
                      idx === 0 ? "text-rose-500" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Calendar Grid (Compact Cells) */}
              <div className="grid grid-cols-7 gap-1">
                {/* Prefix empty cells */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`blank-${i}`} className="h-8 sm:h-9 rounded-lg opacity-20 pointer-events-none" />
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayBirthdays = birthdaysByDay[dayNum] || [];
                  const dayEvents = eventsByDay[dayNum] || [];
                  const hasBirthdays = dayBirthdays.length > 0;
                  const hasEvents = dayEvents.length > 0;
                  const isTodayCell = currentYear === todayYear && currentMonth === todayMonth && dayNum === todayDay;
                  const isSelected = dayNum === selectedDay;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => setSelectedDay(dayNum)}
                      className={`h-8 sm:h-9 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer font-bold text-xs ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black scale-105 z-10"
                          : isTodayCell
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 ring-2 ring-amber-400 font-black"
                          : hasEvents && hasBirthdays
                          ? "bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100 font-black"
                          : hasEvents
                          ? "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 font-black"
                          : hasBirthdays
                          ? "bg-pink-50 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300 hover:bg-pink-100 font-black"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750"
                      }`}
                      title={`${dayNum} ${MONTH_NAMES[currentMonth - 1]}: ${dayEvents.length} Events, ${dayBirthdays.length} Birthdays`}
                    >
                      <span>{dayNum}</span>

                      {/* Micro Indicators */}
                      <div className="flex items-center gap-0.5 absolute bottom-0.5">
                        {hasEvents && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-amber-300" : "bg-blue-600"
                            }`}
                          />
                        )}
                        {hasBirthdays && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-pink-200" : "bg-rose-500 animate-pulse"
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend / Summary Footer */}
            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>मीटिंग/इवेंट ({totalMonthEvents})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>जन्मदिन ({totalMonthBirthdays})</span>
                </span>
              </div>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {selectedDay} {MONTH_NAMES[currentMonth - 1].split(" ")[0]} चयनित
              </span>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: EVENTS & BIRTHDAYS DETAILS (7/12 on md+, sm:col-span-1) ════ */}
          <div className={`p-3 sm:p-5 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 max-h-[560px] overflow-y-auto ${
            mobileViewMode === "side_by_side"
              ? "sm:col-span-1 md:col-span-7 block"
              : mobileViewMode === "events"
              ? "block md:col-span-7"
              : "hidden md:block md:col-span-7"
          }`}>
            {/* Header for Selected Day */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                  {selectedDay}
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {selectedDay} {MONTH_NAMES[currentMonth - 1].split(" ")[0]} {currentYear}
                    </span>
                    {isViewingToday && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                        आज का दिन (TODAY)
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedDayEvents.length} स्कूल इवेंट्स • {selectedDayBirthdays.length} छात्र जन्मदिन
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEventForm((prev) => ({
                    ...prev,
                    date: selectedDateStr
                  }));
                  setShowAddEventModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-indigo-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Add Event on this date"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>इवेंट जोड़ें</span>
              </button>
            </div>

            {/* ── SECTION A: SCHOOL EVENTS & TASKS (मीटिंग / परीक्षा / रिजल्ट डे / काम) ── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                  <span>स्कूल कार्यक्रम व कार्य ({selectedDayEvents.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">सुबह 6:00 बजे शिक्षक अलर्ट</span>
              </div>

              {selectedDayEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayEvents.map((evt) => {
                    const meta = getEventTypeMeta(evt.type);
                    const isDispatching = dispatchingEventId === evt.id;

                    return (
                      <div
                        key={evt.id}
                        className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex flex-col gap-2 group hover:border-indigo-300 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="text-xl shrink-0 mt-0.5">
                              {evt.type === "MEETING" ? "🤝" : evt.type === "EXAM" ? "📝" : evt.type === "RESULT_DAY" ? "📊" : "💼"}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-black text-sm text-slate-900 dark:text-white">
                                  {evt.title}
                                </h5>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${meta.bg}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                {evt.time && (
                                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                    <span>समय: {evt.time}</span>
                                  </span>
                                )}
                                {evt.venue && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <MapPin className="w-3 h-3 text-indigo-500" />
                                    <span>{evt.venue}</span>
                                  </span>
                                )}
                              </div>
                              {evt.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                                  {evt.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Event Action Ribbon */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>
                              {evt.notifiedTeachers
                                ? "✓ शिक्षकों को NSTA अलर्ट भेजा जा चुका है"
                                : "6 AM ऑटो-अलर्ट शेड्यूल्ड ✓"}
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleBroadcastEventNow(evt)}
                            disabled={isDispatching}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                            title="Broadcast notice to all teachers' NSTA Messenger right now"
                          >
                            {isDispatching ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>भेज रहे हैं...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>📢 टीचर्स को NSTA अलर्ट भेजें</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                  इस तारीख पर कोई मीटिंग या परीक्षा कार्यक्रम शेड्यूल्ड नहीं है।
                </div>
              )}
            </div>

            {/* ── SECTION B: BIRTHDAY STUDENTS (आज के छात्र जन्मदिन व विश) ── */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-pink-500" />
                  <span>छात्र जन्मदिन ({selectedDayBirthdays.length})</span>
                </span>
                <span className="text-[10px] text-rose-500 font-bold">1-Click स्कूल डेस्क विश</span>
              </div>

              {selectedDayBirthdays.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayBirthdays.map((st) => {
                    const cName = classes.find((c) => c.id === st.classId)?.name || "Class Student";
                    const isSent = Boolean(wishedMap[st.id]);
                    const isWishing = wishingId === st.id;

                    return (
                      <div
                        key={st.id}
                        className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
                            ) : (
                              st.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-xs text-slate-900 dark:text-white truncate">
                              {st.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {cName} • Roll #{st.rollNo || "N/A"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendBirthdayWish(st)}
                          disabled={isWishing}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 flex items-center gap-1 transition active:scale-95 shadow-xs cursor-pointer ${
                            isSent
                              ? "bg-emerald-600 text-white"
                              : "bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90"
                          }`}
                        >
                          {isWishing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isSent ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Gift className="w-3 h-3" />
                          )}
                          <span>{isWishing ? "भेज रहे..." : isSent ? "✓ भेजा गया" : "🎁 Wish"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                  इस तारीख पर किसी छात्र का जन्मदिन नहीं है।
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: ADD SCHOOL EVENT / MEETING / EXAM / RESULT DAY ── */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  📌
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-white">
                    नया स्कूल कार्यक्रम / मीटिंग जोड़ें
                  </h4>
                  <p className="text-xs text-indigo-200">
                    मीटिंग, परीक्षा, रिजल्ट डे या स्कूल का कोई भी महत्वपूर्ण कार्य
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="p-1 hover:bg-white/20 rounded-xl transition text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveEvent} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  कार्यक्रम / मीटिंग का नाम (Event Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. स्टाफ मीटिंग / PA-2 परीक्षा / रिजल्ट डे"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Event Type & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    प्रकार (Event Type)
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as SchoolEventType })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                  >
                    <option value="MEETING">🤝 स्टाफ मीटिंग (Meeting)</option>
                    <option value="EXAM">📝 परीक्षा (Exam Day)</option>
                    <option value="RESULT_DAY">📊 रिजल्ट डे (Result / PTM)</option>
                    <option value="OFFICIAL_WORK">💼 स्कूल कार्य (Inspection/Audit)</option>
                    <option value="CELEBRATION">🎉 वार्षिकोत्सव (Function)</option>
                    <option value="HOLIDAY">🏖️ स्कूल अवकाश (Holiday)</option>
                    <option value="OTHER">📌 अन्य कार्य (Other Work)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    टारगेट ऑडियंस (Audience)
                  </label>
                  <select
                    value={eventForm.targetAudience}
                    onChange={(e) => setEventForm({ ...eventForm, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                  >
                    <option value="ALL_TEACHERS">👨‍🏫 सभी शिक्षक (All Teachers)</option>
                    <option value="WHOLE_SCHOOL">🏫 पूरा विद्यालय (All Staff &amp; Students)</option>
                    <option value="ALL_STUDENTS">🎒 सभी छात्र (All Students)</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    तारीख (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    समय (Time)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. 09:30 AM या 10:00 AM - 01:00 PM"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  स्थान (Venue / Room)
                </label>
                <input
                  type="text"
                  placeholder="उदा. Principal Office / Assembly Hall / All Classrooms"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none"
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  विवरण व निर्देश (Details &amp; Agenda)
                </label>
                <textarea
                  rows={2}
                  placeholder="बैठक का एजेंडा, परीक्षा नियम या आवश्यक निर्देश..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none resize-none"
                />
              </div>

              {/* Morning 6:00 AM Auto-Alert Checkbox */}
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="morningAlertCheck"
                  checked={eventForm.autoMorningAlert}
                  onChange={(e) => setEventForm({ ...eventForm, autoMorningAlert: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="morningAlertCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <strong className="block text-indigo-900 dark:text-indigo-200 font-black">
                    ⏰ सुबह 6:00 बजे सभी टीचर्स के NSTA Messenger पर स्वतः अलर्ट भेजें
                  </strong>
                  इवेंट के दिन सुबह 6 बजे सभी शिक्षकगण को उनके स्कूल डेस्क पर आधिकारिक नोटिस व पुश नोटिफिकेशन स्वतः चला जाएगा।
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {savingEvent ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>सेव हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>कार्यक्रम सेव करें व अलर्ट शेड्यूल करें</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
