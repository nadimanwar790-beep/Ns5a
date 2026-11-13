// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  MapPin,
  Printer,
  Plus,
  Trash2,
  Ticket,
  Search,
  BookOpen
} from "lucide-react";
import { School, SchoolSession, SchoolStudent } from "../../school-types";
import { loadSchoolSubcollection, syncSchoolSubcollection } from "../../utils/schoolCloudSync";
import { printElementInIframe } from "./AdmissionFormPrintModal";

export interface PtmSlot {
  id: string;
  startTime: string; // e.g. "09:00 AM"
  endTime: string;   // e.g. "09:15 AM"
  isBooked: boolean;
  bookedStudentId?: string;
  bookedStudentName?: string;
  bookedParentPhone?: string;
  bookedAt?: string;
}

export interface PtmEvent {
  id: string;
  schoolId: string;
  title: string;
  date: string; // YYYY-MM-DD
  className: string;
  roomNo: string;
  teacherName: string;
  slotDurationMinutes: number;
  slots: PtmSlot[];
  createdAt: string;
}

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
  mode: "ADMIN_TEACHER" | "PARENT_STUDENT";
  currentStudent?: SchoolStudent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PtmSchedulerModal: React.FC<Props> = ({
  school,
  activeSession,
  mode = "ADMIN_TEACHER",
  currentStudent,
  isOpen,
  onClose
}) => {
  const schoolId = school?.id || "SCH-001";
  const ptmStorageKey = `school_ptm_events_${schoolId}`;

  const [events, setEvents] = useState<PtmEvent[]>(() => {
    try {
      const raw = localStorage.getItem(ptmStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Seed sample PTM Event
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        id: "ptm_event_1",
        schoolId,
        title: "Term-1 रिजल्ट समीक्षा अभिभावक-शिक्षक बैठक (PTM)",
        date: today,
        className: "Class 10-A",
        roomNo: "Room No. 104 (First Floor)",
        teacherName: "Mr. R. K. Sharma (Class Teacher)",
        slotDurationMinutes: 15,
        slots: [
          { id: "s1", startTime: "09:00 AM", endTime: "09:15 AM", isBooked: true, bookedStudentId: "STU-101", bookedStudentName: "Aman Verma", bookedParentPhone: "9811002233" },
          { id: "s2", startTime: "09:15 AM", endTime: "09:30 AM", isBooked: false },
          { id: "s3", startTime: "09:30 AM", endTime: "09:45 AM", isBooked: false },
          { id: "s4", startTime: "09:45 AM", endTime: "10:00 AM", isBooked: false },
          { id: "s5", startTime: "10:00 AM", endTime: "10:15 AM", isBooked: false },
          { id: "s6", startTime: "10:15 AM", endTime: "10:30 AM", isBooked: false }
        ],
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || "");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bookedPass, setBookedPass] = useState<any>(null);
  const [confirmBookSlotId, setConfirmBookSlotId] = useState<string | null>(null);
  const passPrintRef = useRef<HTMLDivElement>(null);
  const schedulePrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !school?.id) return;
    let active = true;
    loadSchoolSubcollection<PtmEvent>(school.id, "ptm_events").then((cloudEvents) => {
      if (active && cloudEvents.length > 0) {
        setEvents(cloudEvents);
        setSelectedEventId((prev) => cloudEvents.some((e) => e.id === prev) ? prev : cloudEvents[0].id);
        try {
          localStorage.setItem(ptmStorageKey, JSON.stringify(cloudEvents));
        } catch {}
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [isOpen, school?.id, ptmStorageKey]);

  // New Event Form State
  const [newTitle, setNewTitle] = useState("अर्धवार्षिक प्रगति समीक्षा PTM");
  const [newClass, setNewClass] = useState("Class 10-A");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newRoom, setNewRoom] = useState("Room 102");
  const [newTeacher, setNewTeacher] = useState("Class Teacher");
  const [newStartHour, setNewStartHour] = useState("09");
  const [newStartMin, setNewStartMin] = useState("00");
  const [newEndHour, setNewEndHour] = useState("12");
  const [newEndMin, setNewEndMin] = useState("00");
  const [newInterval, setNewInterval] = useState(15);

  const saveEvents = (updated: PtmEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem(ptmStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("PTM save error:", e);
    }
    if (school?.id) {
      syncSchoolSubcollection(school.id, "ptm_events", updated);
    }
  };

  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || null;
  }, [events, selectedEventId]);

  if (!isOpen) return null;

  // Generate Slots dynamically
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const startMins = parseInt(newStartHour) * 60 + parseInt(newStartMin);
    const endMins = parseInt(newEndHour) * 60 + parseInt(newEndMin);

    if (endMins <= startMins) {
      toast.error("समाप्ति का समय शुरुआत के समय से बाद का होना चाहिए!");
      return;
    }

    const generatedSlots: PtmSlot[] = [];
    let cur = startMins;
    let slotNum = 1;

    const formatMins = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    while (cur + newInterval <= endMins) {
      generatedSlots.push({
        id: `slot_${slotNum++}`,
        startTime: formatMins(cur),
        endTime: formatMins(cur + newInterval),
        isBooked: false
      });
      cur += newInterval;
    }

    const newEv: PtmEvent = {
      id: `ptm_${Date.now()}`,
      schoolId,
      title: newTitle.trim(),
      date: newDate,
      className: newClass,
      roomNo: newRoom.trim(),
      teacherName: newTeacher.trim(),
      slotDurationMinutes: newInterval,
      slots: generatedSlots,
      createdAt: new Date().toISOString()
    };

    const updated = [newEv, ...events];
    saveEvents(updated);
    setSelectedEventId(newEv.id);
    setShowCreateModal(false);
    toast.success("नया PTM इवेंट सफलतापूर्वक बनाया गया!");
  };

  // Parent Books a Slot
  const handleBookSlot = (slot: PtmSlot) => {
    if (slot.isBooked) return;
    if (confirmBookSlotId !== slot.id) {
      setConfirmBookSlotId(slot.id);
      return;
    }
    const stName = currentStudent?.name || "Student Name";
    const stId = currentStudent?.id || "STU-PARENT";
    const phone = currentStudent?.parentPhone || currentStudent?.mobile || "Parent";

    const updatedEvents = events.map((ev) => {
      if (ev.id === activeEvent.id) {
        return {
          ...ev,
          slots: ev.slots.map((s) => {
            if (s.id === slot.id) {
              return {
                ...s,
                isBooked: true,
                bookedStudentId: stId,
                bookedStudentName: stName,
                bookedParentPhone: phone,
                bookedAt: new Date().toISOString()
              };
            }
            return s;
          })
        };
      }
      return ev;
    });

    saveEvents(updatedEvents);
    setConfirmBookSlotId(null);
    setBookedPass({
      event: activeEvent,
      slot: { ...slot, isBooked: true, bookedStudentName: stName }
    });
    toast.success(`PTM स्लॉट (${slot.startTime} - ${slot.endTime}) सफलतापूर्वक बुक हो गया!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                पीटीएम (PTM) स्लॉट शेड्यूलर व बुकिंग इंजन
              </h3>
              <p className="text-xs text-indigo-200/80">
                अभिभावक-शिक्षक बैठक समय सारणी • लाइन रहित डिजिटल स्लॉट बुकिंग
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {bookedPass ? (
            /* PRINTABLE DIGITAL PTM ENTRY PASS */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-300">
                    आपका PTM स्लॉट सफलतापूर्वक बुक हो गया है!
                  </div>
                  <div className="text-[11px] text-emerald-200/80">
                    कृपया नीचे दिए गए डिजिटल प्रवेश पास (Digital Entry Pass) का समय ध्यान रखें।
                  </div>
                </div>
              </div>

              <div ref={passPrintRef} className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 border shadow-xl space-y-4 max-w-md mx-auto">
                <div className="text-center border-b pb-3">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider mb-1">
                    OFFICIAL PTM APPOINTMENT PASS
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{school?.name || "SCHOOL"}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{bookedPass.event.title}</p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-center space-y-1">
                  <div className="text-xs text-indigo-600 font-bold uppercase">आपका आवंटित समय (Slot Time):</div>
                  <div className="text-2xl font-black text-indigo-950">
                    {bookedPass.slot.startTime} - {bookedPass.slot.endTime}
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">
                    तारीख: <strong>{bookedPass.event.date}</strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">छात्र:</span>
                    <strong className="text-slate-900">{bookedPass.slot.bookedStudentName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">कक्षा:</span>
                    <strong>{bookedPass.event.className}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">स्थान / कमरा:</span>
                    <strong>{bookedPass.event.roomNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">शिक्षक:</span>
                    <strong>{bookedPass.event.teacherName}</strong>
                  </div>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-400">
                  कृपया अपने स्लॉट समय से 5 मिनट पूर्व उपस्थित हों।
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2 no-print print:hidden">
                <button
                  onClick={() => passPrintRef.current && printElementInIframe(passPrintRef.current, `PTM_Pass_${bookedPass.slot.bookedStudentName || "Pass"}`)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  पास प्रिंट करें (Print Pass)
                </button>
                <button
                  onClick={() => setBookedPass(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  वापस जाएं
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Event Bar & Creator */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-semibold">PTM मीटिंग:</span>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.className} - {ev.date})
                      </option>
                    ))}
                  </select>
                </div>

                {mode === "ADMIN_TEACHER" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + नया PTM इवेंट बनाएं
                    </button>
                    <button
                      onClick={() => schedulePrintRef.current && printElementInIframe(schedulePrintRef.current, `PTM_Schedule_${activeEvent?.className || "Schedule"}`, `body { background: #fff !important; color: #0f172a !important; } * { color: #0f172a !important; background-color: transparent !important; border-color: #cbd5e1 !important; }`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      शेड्यूल प्रिंट
                    </button>
                  </div>
                )}
              </div>

              <div ref={schedulePrintRef} className="space-y-4">
              {/* Event Details Card */}
              {activeEvent && (
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-black text-white text-sm">{activeEvent.title}</h4>
                    <div className="text-slate-400 flex items-center gap-3 mt-1 flex-wrap">
                      <span>📅 {activeEvent.date}</span>
                      <span>🏫 {activeEvent.className}</span>
                      <span>📍 {activeEvent.roomNo}</span>
                      <span>👤 {activeEvent.teacherName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">कुल स्लॉट्स:</div>
                      <div className="font-black text-white">{activeEvent.slots.length} ({activeEvent.slotDurationMinutes} mins)</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">बुक हो चुके:</div>
                      <div className="font-black text-amber-400">{activeEvent.slots.filter((s) => s.isBooked).length}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Slots Grid */}
              {activeEvent && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      उपलब्ध टाइम स्लॉट्स (Time Slots):
                    </h4>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> उपलब्ध (Available)
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> बुक (Booked)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {activeEvent.slots.map((slot) => {
                      const isBooked = slot.isBooked;
                      const isConfirming = confirmBookSlotId === slot.id;
                      return (
                        <div
                          key={slot.id}
                          onClick={() => {
                            if (!isBooked && mode === "PARENT_STUDENT" && !isConfirming) {
                              setConfirmBookSlotId(slot.id);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-center transition ${
                            isBooked
                              ? "bg-rose-950/20 border-rose-500/30 cursor-not-allowed opacity-80"
                              : isConfirming
                              ? "bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/40 shadow-md"
                              : "bg-slate-950 border-slate-800 hover:border-emerald-500/80 hover:bg-slate-900 cursor-pointer shadow-md"
                          }`}
                        >
                          <div className="font-black text-xs text-white">
                            {slot.startTime} - {slot.endTime}
                          </div>
                          {isBooked ? (
                            <div className="text-[10px] text-rose-400 font-bold mt-1.5 flex items-center justify-center gap-1">
                              <span>🔒 बुक:</span>
                              <span className="truncate max-w-[80px]">{slot.bookedStudentName || "Parent"}</span>
                            </div>
                          ) : isConfirming ? (
                            <div className="mt-2 flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleBookSlot(slot); }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black cursor-pointer"
                              >
                                Confirm बुक
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmBookSlotId(null); }}
                                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                              >
                                रद्द
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-400 font-bold mt-1.5">
                              {mode === "PARENT_STUDENT" ? "+ टैप करके बुक करें" : "✓ खाली है"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white pb-2 border-b border-slate-800">
              नया PTM इवेंट और स्लॉट्स बनाएं
            </h3>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">इवेंट का नाम *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">कक्षा (Class) *</label>
                  <input
                    type="text"
                    required
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">तारीख *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">कमरा नं (Room) *</label>
                  <input
                    type="text"
                    required
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">शिक्षक का नाम *</label>
                  <input
                    type="text"
                    required
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">शुरुआत (Start)</label>
                  <select
                    value={newStartHour}
                    onChange={(e) => setNewStartHour(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    {["08","09","10","11","12"].map((h) => <option key={h} value={h}>{h}:00 AM</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">समाप्ति (End)</label>
                  <select
                    value={newEndHour}
                    onChange={(e) => setNewEndHour(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    {["11","12","13","14","15","16"].map((h) => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">स्लॉट (Mins)</label>
                  <select
                    value={newInterval}
                    onChange={(e) => setNewInterval(parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value={10}>10 मिनट</option>
                    <option value={15}>15 मिनट</option>
                    <option value={20}>20 मिनट</option>
                    <option value={30}>30 मिनट</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  स्लॉट्स जनरेट करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
