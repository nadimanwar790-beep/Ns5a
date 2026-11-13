// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Clock, Calendar, BookOpen, Users, Plus, Edit3, Trash2, Printer,
  Save, AlertTriangle, CheckCircle2, ChevronLeft, Sparkles, Filter,
  Building2, ArrowRight, Youtube, Video, Check, Layers, UserCheck,
  Award, GraduationCap, Settings, X
} from "lucide-react";
import type {
  School, SchoolClass, SchoolSubject, SchoolTeacher, SchoolSession,
  TimetablePeriod, ClassWeeklyTimetable, DailyClassLecture
} from "../../school-types";
import {
  saveClassLecture,
  extractYouTubeVideoId,
  generateId,
  subscribeToTeachers,
  subscribeToSubjects,
  getSubjects,
  saveSubject,
  saveClass,
  shouldUseDemoForSchool
} from "../../school-firebase";
import { loadSchoolSettingBlob, saveSchoolSettingBlob } from "../../utils/schoolCloudSync";
import { YouTubeLectureModal } from "./YouTubeLectureModal";
import { ClassroomVideoArchive } from "./ClassroomVideoArchive";
import { getDemoSchoolDataset } from "./demoDataStore";

interface Props {
  school: School;
  classes: SchoolClass[];
  subjects?: SchoolSubject[];
  teachers?: SchoolTeacher[];
  activeSession?: SchoolSession | null;
  isAdmin?: boolean;
  isTeacher?: boolean;
  currentTeacherId?: string;
  studentClassId?: string;
  onBack?: () => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface PeriodSlotConfig {
  periodNumber: number;
  label?: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export const DEFAULT_PERIOD_TIMES: PeriodSlotConfig[] = [
  { periodNumber: 1, label: "Period 1", startTime: "08:30", endTime: "09:15" },
  { periodNumber: 2, label: "Period 2", startTime: "09:15", endTime: "10:00" },
  { periodNumber: 3, label: "Period 3", startTime: "10:00", endTime: "10:45" },
  { periodNumber: 4, label: "Period 4", startTime: "10:45", endTime: "11:30" },
  { periodNumber: 5, label: "Period 5 (Post-Lunch)", startTime: "12:00", endTime: "12:45" },
  { periodNumber: 6, label: "Period 6", startTime: "12:45", endTime: "01:30" },
  { periodNumber: 7, label: "Period 7", startTime: "01:30", endTime: "02:15" },
  { periodNumber: 8, label: "Period 8", startTime: "02:15", endTime: "03:00" },
];

export const TimetableManager: React.FC<Props> = ({
  school,
  classes = [],
  subjects = [],
  teachers = [],
  activeSession,
  isAdmin = false,
  isTeacher = false,
  currentTeacherId,
  studentClassId,
  onBack
}) => {
  // ── 1. Live Teacher Roster (Guaranteed to load all registered school teachers) ──
  const [liveTeachers, setLiveTeachers] = useState<SchoolTeacher[]>(teachers);

  useEffect(() => {
    if (teachers && teachers.length > 1) {
      setLiveTeachers(teachers);
      return;
    }
    if (!school?.id) return;
    const unsub = subscribeToTeachers(school.id, (tList) => {
      if (Array.isArray(tList) && tList.length > 0) {
        setLiveTeachers(tList);
      }
    });
    return () => unsub();
  }, [school?.id, teachers]);

  // Default selected class
  const initialClassId = studentClassId || (classes[0]?.id || "");
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [viewMode, setViewMode] = useState<"day" | "week" | "teacher" | "archive">("week");
  const [filterTeacherId, setFilterTeacherId] = useState<string>(currentTeacherId || "");
  const [confirmDeletePeriodNum, setConfirmDeletePeriodNum] = useState<number | null>(null);

  const isCloudHydratedRef = React.useRef(false);

  // ── 2. Section Management & Persistence (Local + Cloud) ──
  const sectionsStorageKey = useMemo(() => `nst_school_sections_${school?.id || "default"}`, [school?.id]);
  const [customSections, setCustomSections] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(sectionsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("[TimetableManager] Failed reading sections:", err);
    }
    return {};
  });

  useEffect(() => {
    if (!isCloudHydratedRef.current) return;
    saveSchoolSettingBlob(school?.id, "timetable_sections", sectionsStorageKey, customSections);
  }, [customSections, sectionsStorageKey, school?.id]);

  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // Dynamic Period Slots Configuration (Customizable per school, add/delete/timing)
  const periodSlotsKey = useMemo(() => `nst_school_period_slots_${school?.id || "default"}`, [school?.id]);
  const [periodSlots, setPeriodSlots] = useState<PeriodSlotConfig[]>(() => {
    try {
      const saved = localStorage.getItem(periodSlotsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn("[TimetableManager] Failed reading period slots:", err);
    }
    return DEFAULT_PERIOD_TIMES;
  });

  useEffect(() => {
    if (!isCloudHydratedRef.current) return;
    saveSchoolSettingBlob(school?.id, "timetable_period_slots", periodSlotsKey, periodSlots);
  }, [periodSlots, periodSlotsKey, school?.id]);

  const [showPeriodManagerModal, setShowPeriodManagerModal] = useState(false);

  // Edit Modal State
  const [editingPeriod, setEditingPeriod] = useState<{
    day: string;
    periodNumber: number;
    period?: TimetablePeriod;
  } | null>(null);

  const [formSubjectName, setFormSubjectName] = useState("");
  const [formTeacherName, setFormTeacherName] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:30");
  const [formEndTime, setFormEndTime] = useState("09:15");
  const [formRoom, setFormRoom] = useState("");
  const [formIsBreak, setFormIsBreak] = useState(false);
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formTopic, setFormTopic] = useState("");

  // Video Player Modal State
  const [watchingVideo, setWatchingVideo] = useState<{
    url: string;
    title: string;
    subject?: string;
    teacher?: string;
  } | null>(null);

  // Storage key for all timetables
  const storageKey = useMemo(() => `nst_school_timetable_${school?.id || "default"}`, [school?.id]);

  // All schedules: { [classId_or_key]: { [day]: TimetablePeriod[] } }
  const [allTimetables, setAllTimetables] = useState<Record<string, Record<string, TimetablePeriod[]>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch (err) {
      console.warn("[TimetableManager] Failed reading local timetables:", err);
    }
    if (shouldUseDemoForSchool(school?.id)) {
      const demo = getDemoSchoolDataset();
      if (demo && demo.timetables && Object.keys(demo.timetables).length > 0) {
        return demo.timetables;
      }
    }
    return {};
  });

  // Load latest cloud timetable settings & schedules on school change
  useEffect(() => {
    let active = true;
    const sid = school?.id;
    isCloudHydratedRef.current = false;
    if (!sid) return;
    Promise.all([
      loadSchoolSettingBlob<Record<string, string[]>>(sid, "timetable_sections", sectionsStorageKey, {}),
      loadSchoolSettingBlob<PeriodSlotConfig[]>(sid, "timetable_period_slots", periodSlotsKey, DEFAULT_PERIOD_TIMES),
      loadSchoolSettingBlob<Record<string, Record<string, TimetablePeriod[]>>>(sid, "timetable_schedules", storageKey, {}),
    ]).then(([secs, slots, schedules]) => {
      if (!active) return;
      if (secs && Object.keys(secs).length > 0) setCustomSections(secs);
      if (Array.isArray(slots) && slots.length > 0) setPeriodSlots(slots);
      if (schedules && Object.keys(schedules).length > 0) setAllTimetables(schedules);
      isCloudHydratedRef.current = true;
    }).catch((err) => {
      console.warn("[TimetableManager] Cloud hydration error:", err);
      isCloudHydratedRef.current = true;
    });
    return () => { active = false; };
  }, [school?.id, sectionsStorageKey, periodSlotsKey, storageKey]);

  // Save to local storage + Firestore cloud on change
  useEffect(() => {
    if (!isCloudHydratedRef.current) return;
    saveSchoolSettingBlob(school?.id, "timetable_schedules", storageKey, allTimetables);
  }, [allTimetables, storageKey, school?.id]);

  // Current class resolution
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId) || classes[0], [classes, selectedClassId]);

  // Compute all sections available for currently selected class
  const currentClassSections = useMemo(() => {
    if (!selectedClass) return ["A"];
    const baseName = selectedClass.name;
    const fromClasses = classes
      .filter(c => c && c.name?.toLowerCase() === baseName?.toLowerCase() && c.section)
      .map(c => c.section!.trim().toUpperCase());
    const fromCustom = (customSections[baseName] || []).map(s => s.trim().toUpperCase());
    const combined = Array.from(new Set([...fromClasses, ...fromCustom]));
    if (combined.length === 0) return ["A"];
    return combined.sort();
  }, [classes, selectedClass, customSections]);

  // Active section (defaults to selectedClass.section or "A")
  const [selectedSection, setSelectedSection] = useState<string>(() => {
    if (selectedClass?.section) return selectedClass.section.toUpperCase();
    return "A";
  });

  // Keep section synchronized when class changes
  useEffect(() => {
    if (selectedClass?.section) {
      setSelectedSection(selectedClass.section.toUpperCase());
    } else if (!currentClassSections.includes(selectedSection)) {
      setSelectedSection(currentClassSections[0] || "A");
    }
  }, [selectedClassId, currentClassSections]);

  // Section-specific schedule key to isolate timetable per section
  const activeScheduleKey = useMemo(() => {
    if (!selectedClass) return "";
    return `${selectedClass.id}__sec_${selectedSection || "A"}`;
  }, [selectedClass, selectedSection]);

  // Current class & section schedule with backward compatibility and demo fallback
  const classSchedule = useMemo(() => {
    if (!selectedClass) return {};
    const cleanName = (selectedClass.name || "").replace(/\s*-\s*Section\s*[AB]/i, "").trim();
    const shortKey = (selectedClass.id || "").replace(/^demo_cls_[^_]+_|^demo_class_|^cls_/i, "").replace(/_sec_[ab]$/i, "").toLowerCase();

    const lookupSchedule = (dict: Record<string, any>) => {
      if (!dict) return null;
      if (dict[activeScheduleKey] && Object.keys(dict[activeScheduleKey]).length > 0) return dict[activeScheduleKey];
      if (dict[selectedClass.id] && Object.keys(dict[selectedClass.id]).length > 0) return dict[selectedClass.id];
      if (dict[selectedClass.name] && Object.keys(dict[selectedClass.name]).length > 0) return dict[selectedClass.name];
      const secKey = `${selectedClass.name}__sec_${selectedSection || "A"}`;
      if (dict[secKey] && Object.keys(dict[secKey]).length > 0) return dict[secKey];
      if (cleanName && dict[cleanName] && Object.keys(dict[cleanName]).length > 0) return dict[cleanName];
      const cleanSecKey = `${cleanName}__sec_${selectedSection || "A"}`;
      if (cleanName && dict[cleanSecKey] && Object.keys(dict[cleanSecKey]).length > 0) return dict[cleanSecKey];
      if (shortKey && dict[shortKey] && Object.keys(dict[shortKey]).length > 0) return dict[shortKey];
      if (shortKey && dict[`demo_class_${shortKey}`] && Object.keys(dict[`demo_class_${shortKey}`]).length > 0) return dict[`demo_class_${shortKey}`];
      // Search partial match in keys
      for (const [k, v] of Object.entries(dict)) {
        if (v && Object.keys(v).length > 0) {
          const kLower = k.toLowerCase();
          if (cleanName && kLower.includes(cleanName.toLowerCase())) return v;
          if (shortKey && (kLower.includes(`_${shortKey}_`) || kLower.endsWith(`_${shortKey}`))) return v;
        }
      }
      return null;
    };

    // 1. Check local/state allTimetables
    const localMatch = lookupSchedule(allTimetables);
    if (localMatch) return localMatch;

    // 2. Demo dataset timetables ONLY when explicitly in a demo school
    if (shouldUseDemoForSchool(school?.id)) {
      const demo = getDemoSchoolDataset();
      if (demo && demo.timetables) {
        const demoMatch = lookupSchedule(demo.timetables);
        if (demoMatch) return demoMatch;
        const anySchedule = Object.values(demo.timetables)[0];
        if (anySchedule && Object.keys(anySchedule).length > 0) return anySchedule;
      }
    }
    return {};
  }, [allTimetables, selectedClass, activeScheduleKey, selectedSection, school?.id]);

  // ── 3. Live Class Subjects (कक्षा में जोड़े गए वास्तविक विषय - No Dummy List) ──
  const [liveClassSubjects, setLiveClassSubjects] = useState<SchoolSubject[]>([]);
  const [newClassSubjectInput, setNewClassSubjectInput] = useState("");
  const [showInlineAddSubject, setShowInlineAddSubject] = useState(false);

  useEffect(() => {
    if (!school?.id || !selectedClass?.id) return;

    // A. Check initial subjects passed in props
    const initialMatching = (subjects || []).filter(s =>
      s.classId === selectedClass.id ||
      s.className?.toLowerCase() === selectedClass.name?.toLowerCase()
    );
    if (initialMatching.length > 0) {
      setLiveClassSubjects(initialMatching);
    }

    // B. Direct fetch from database/dataset
    getSubjects(school.id, selectedClass.id).then(subs => {
      if (Array.isArray(subs) && subs.length > 0) {
        setLiveClassSubjects(subs);
      }
    }).catch(() => {});

    // C. Real-time subscription to ensure instant updates
    const unsub = subscribeToSubjects(school.id, selectedClass.id, (subs) => {
      if (Array.isArray(subs)) {
        setLiveClassSubjects(subs);
      }
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [school?.id, selectedClass?.id, selectedClass?.name, subjects]);

  // Strictly subjects added to this specific class
  const classSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const map = new Map<string, SchoolSubject>();

    (liveClassSubjects || []).forEach(s => {
      if (s && s.name && s.name.trim()) {
        map.set(s.name.trim().toLowerCase(), s);
      }
    });

    (subjects || []).forEach(s => {
      if (
        s && s.name && s.name.trim() &&
        (s.classId === selectedClass.id || s.className?.toLowerCase() === selectedClass.name?.toLowerCase())
      ) {
        const key = s.name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, s);
        }
      }
    });

    return Array.from(map.values());
  }, [liveClassSubjects, subjects, selectedClass]);

  // Action to add a real subject to this class permanently
  const handleAddNewSubjectToClass = async (subName?: string) => {
    const nameToAdd = (subName || newClassSubjectInput).trim();
    if (!nameToAdd || !selectedClass || !school?.id) return;

    const newSub: SchoolSubject = {
      id: generateId("sub"),
      schoolId: school.id,
      sessionId: activeSession?.id || "default",
      classId: selectedClass.id,
      name: nameToAdd,
      createdAt: new Date().toISOString()
    };

    try {
      await saveSubject(newSub);
    } catch (err) {
      console.warn("[TimetableManager] Error saving subject:", err);
    }

    setLiveClassSubjects(prev => {
      const filtered = prev.filter(s => s.name.toLowerCase() !== nameToAdd.toLowerCase());
      return [...filtered, newSub];
    });
    setFormSubjectName(nameToAdd);
    setNewClassSubjectInput("");
    setShowInlineAddSubject(false);
  };

  // Faculty matching the selected subject (Kon teacher kya padhayenge)
  const matchingTeachersForSubject = useMemo(() => {
    if (!formSubjectName.trim()) return [];
    const q = formSubjectName.toLowerCase().trim();
    return liveTeachers.filter(t =>
      Array.isArray(t.subjects) &&
      t.subjects.some(sub => {
        const sLower = sub.toLowerCase();
        return sLower.includes(q) || q.includes(sLower);
      })
    );
  }, [liveTeachers, formSubjectName]);

  // Handle adding new section
  const handleAddSectionSubmit = async () => {
    const sec = newSectionName.trim().toUpperCase();
    if (!sec || !selectedClass) return;

    const baseName = selectedClass.name;
    setCustomSections(prev => ({
      ...prev,
      [baseName]: Array.from(new Set([...(prev[baseName] || []), sec]))
    }));

    if (isAdmin) {
      try {
        const newClassObj: SchoolClass = {
          id: generateId("cls"),
          schoolId: school.id,
          sessionId: activeSession?.name || "2026-27",
          name: baseName,
          section: sec,
          createdAt: new Date().toISOString()
        };
        await saveClass(newClassObj);
      } catch (err) {
        console.warn("[TimetableManager] Could not save new section class to Firebase:", err);
      }
    }

    setSelectedSection(sec);
    setNewSectionName("");
    setShowAddSectionModal(false);
  };

  // Quick auto-populate standard routine if empty
  const handleAutoPopulate = () => {
    if (!selectedClass) return;
    const sampleSubjects = subjects.filter(s => s.classId === selectedClass.id);
    const subList = sampleSubjects.length > 0
      ? sampleSubjects.map(s => s.name)
      : ["Mathematics", "Science", "English", "Hindi", "Social Science", "Sanskrit/Computer", "Moral Science", "Games/Library"];

    const newClassSchedule: Record<string, TimetablePeriod[]> = {};

    DAYS_OF_WEEK.forEach(day => {
      newClassSchedule[day] = periodSlots.map((t, idx) => {
        const sub = t.isBreak ? "Lunch Break" : (subList[idx % subList.length] || "General Studies");
        const matchedTeacher = liveTeachers.find(tch =>
          Array.isArray(tch.subjects) && tch.subjects.some(s => s.toLowerCase().includes(sub.toLowerCase()))
        );
        return {
          id: `p-${day}-${t.periodNumber}`,
          periodNumber: t.periodNumber,
          startTime: t.startTime,
          endTime: t.endTime,
          subjectName: sub,
          teacherName: t.isBreak ? "" : (matchedTeacher?.name || liveTeachers[idx % Math.max(1, liveTeachers.length)]?.name || "Subject Teacher"),
          room: `Room ${selectedClass.name.replace(/\D+/g, "") || "101"}${selectedSection ? `-${selectedSection}` : ""}`,
          isBreak: Boolean(t.isBreak)
        };
      });
    });

    setAllTimetables(prev => ({
      ...prev,
      [activeScheduleKey]: newClassSchedule,
      ...(selectedSection === "A" ? { [selectedClass.id]: newClassSchedule } : {})
    }));
  };

  // Open edit modal for a period
  const handleOpenEdit = (day: string, periodNumber: number) => {
    if (!isAdmin && !isTeacher) return;
    const existing = classSchedule[day]?.find(p => p.periodNumber === periodNumber);
    const defaultTime = periodSlots.find(p => p.periodNumber === periodNumber);

    setEditingPeriod({ day, periodNumber, period: existing });
    setFormSubjectName(existing?.subjectName || "");
    setFormTeacherName(existing?.teacherName || "");
    setFormStartTime(existing?.startTime || defaultTime?.startTime || "08:30");
    setFormEndTime(existing?.endTime || defaultTime?.endTime || "09:15");
    setFormRoom(existing?.room || "");
    setFormIsBreak(existing?.isBreak || defaultTime?.isBreak || false);
    setFormYoutubeUrl(existing?.youtubeUrl || "");
    setFormTopic(existing?.topic || "");
    setShowInlineAddSubject(false);
    setNewClassSubjectInput("");
  };

  // Clear single period assignment for the active cell
  const handleClearCurrentPeriod = () => {
    if (!editingPeriod || !selectedClass) return;
    const { day, periodNumber } = editingPeriod;
    setAllTimetables(prev => {
      const curClassData = prev[activeScheduleKey] || prev[selectedClass.id] || {};
      const dayPeriods = (curClassData[day] || []).filter(p => p.periodNumber !== periodNumber);
      const updatedClassData = {
        ...curClassData,
        [day]: dayPeriods
      };
      return {
        ...prev,
        [activeScheduleKey]: updatedClassData,
        ...(selectedSection === "A" ? { [selectedClass.id]: updatedClassData } : {})
      };
    });
    setEditingPeriod(null);
  };

  // Delete a period slot across the entire school timetable
  const handleDeletePeriodSlot = (pNum: number) => {
    if (periodSlots.length <= 1) {
      toast.error("Kam se kam ek period timetable me hona anivarya hai.");
      return;
    }
    const targetSlot = periodSlots.find(p => p.periodNumber === pNum);
    const label = targetSlot?.label || `Period ${pNum}`;
    if (confirmDeletePeriodNum !== pNum) {
      setConfirmDeletePeriodNum(pNum);
      return;
    }
    setConfirmDeletePeriodNum(null);

    const filtered = periodSlots.filter(p => p.periodNumber !== pNum);
    const reindexed = filtered.map((p, idx) => ({
      ...p,
      periodNumber: idx + 1,
      label: p.label && !p.label.startsWith("Period ") ? p.label : `Period ${idx + 1}`
    }));
    setPeriodSlots(reindexed);

    setAllTimetables(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        const sched = updated[k];
        if (sched && typeof sched === "object") {
          const newSched: Record<string, TimetablePeriod[]> = {};
          Object.keys(sched).forEach(d => {
            const list = sched[d] || [];
            newSched[d] = list.filter(item => item.periodNumber !== pNum);
          });
          updated[k] = newSched;
        }
      });
      return updated;
    });
    toast.success(`${label} टाइमटेबल से हटाया गया।`);
  };

  // Quick Add next period slot (Period N+1)
  const handleQuickAddPeriod = () => {
    const nextNum = periodSlots.length + 1;
    const last = periodSlots[periodSlots.length - 1];
    let newStart = "03:00";
    let newEnd = "03:45";
    if (last && last.endTime) {
      newStart = last.endTime;
      const parts = newStart.split(":").map(Number);
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        const total = parts[0] * 60 + parts[1] + 45;
        const h = Math.floor(total / 60) % 24;
        const m = total % 60;
        newStart = `${String(parts[0]).padStart(2, "0")}:${String(parts[1]).padStart(2, "0")}`;
        newEnd = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }
    const newSlot: PeriodSlotConfig = {
      periodNumber: nextNum,
      label: `Period ${nextNum}`,
      startTime: newStart,
      endTime: newEnd,
      isBreak: false
    };
    setPeriodSlots(prev => [...prev, newSlot]);
  };

  // Apply Presets (e.g. 6, 7, 8, 9 periods)
  const applyPeriodPreset = (count: number) => {
    let preset: PeriodSlotConfig[] = [];
    if (count === 6) {
      preset = [
        { periodNumber: 1, label: "Period 1", startTime: "08:30", endTime: "09:15" },
        { periodNumber: 2, label: "Period 2", startTime: "09:15", endTime: "10:00" },
        { periodNumber: 3, label: "Period 3", startTime: "10:00", endTime: "10:45" },
        { periodNumber: 4, label: "Period 4", startTime: "10:45", endTime: "11:30" },
        { periodNumber: 5, label: "Period 5 (Post-Lunch)", startTime: "12:00", endTime: "12:45" },
        { periodNumber: 6, label: "Period 6", startTime: "12:45", endTime: "01:30" }
      ];
    } else if (count === 7) {
      preset = [
        { periodNumber: 1, label: "Period 1", startTime: "08:30", endTime: "09:15" },
        { periodNumber: 2, label: "Period 2", startTime: "09:15", endTime: "10:00" },
        { periodNumber: 3, label: "Period 3", startTime: "10:00", endTime: "10:45" },
        { periodNumber: 4, label: "Period 4", startTime: "10:45", endTime: "11:30" },
        { periodNumber: 5, label: "Period 5 (Post-Lunch)", startTime: "12:00", endTime: "12:45" },
        { periodNumber: 6, label: "Period 6", startTime: "12:45", endTime: "01:30" },
        { periodNumber: 7, label: "Period 7", startTime: "01:30", endTime: "02:15" }
      ];
    } else if (count === 8) {
      preset = DEFAULT_PERIOD_TIMES;
    } else if (count === 9) {
      preset = [
        ...DEFAULT_PERIOD_TIMES,
        { periodNumber: 9, label: "Period 9 (Special/Sports)", startTime: "03:00", endTime: "03:45" }
      ];
    }
    setPeriodSlots(preset);
  };

  const handleUpdatePeriodSlot = (pNum: number, field: keyof PeriodSlotConfig, val: any) => {
    setPeriodSlots(prev => prev.map(p => p.periodNumber === pNum ? { ...p, [field]: val } : p));
  };

  // Save period edit
  const handleSavePeriod = () => {
    if (!editingPeriod || !selectedClass) return;
    const { day, periodNumber } = editingPeriod;
    const cleanUrl = formYoutubeUrl.trim();
    const videoId = extractYouTubeVideoId(cleanUrl);

    const newPeriod: TimetablePeriod = {
      id: editingPeriod.period?.id || `p-${day}-${periodNumber}-${Date.now()}`,
      periodNumber,
      startTime: formStartTime,
      endTime: formEndTime,
      subjectName: formIsBreak ? "Lunch Break" : (formSubjectName.trim() || "Free Period"),
      teacherName: formIsBreak ? "" : (formTeacherName.trim() || "TBA"),
      room: formRoom.trim() || "",
      isBreak: formIsBreak,
      youtubeUrl: !formIsBreak && cleanUrl ? cleanUrl : undefined,
      youtubeVideoId: !formIsBreak && videoId ? videoId : undefined,
      topic: !formIsBreak && formTopic.trim() ? formTopic.trim() : undefined,
    };

    // Auto-save to Daily Lectures collection if YouTube video is provided
    if (!formIsBreak && cleanUrl && videoId) {
      const todayIso = new Date().toISOString().split("T")[0];
      saveClassLecture({
        id: generateId("lec"),
        schoolId: school.id,
        sessionId: activeSession?.name || "2026-27",
        classId: selectedClass.id,
        className: `${selectedClass.name} ${selectedSection ? `(Sec ${selectedSection})` : ""}`,
        date: todayIso,
        month: todayIso.slice(0, 7),
        periodNumber,
        periodTime: `${formStartTime} - ${formEndTime}`,
        subjectName: formSubjectName.trim() || "Subject",
        topic: formTopic.trim() || `${formSubjectName || "Class"} Lecture`,
        teacherName: formTeacherName.trim() || "Teacher",
        teacherId: currentTeacherId,
        youtubeUrl: cleanUrl,
        youtubeVideoId: videoId,
        addedAt: new Date().toISOString(),
        addedBy: isAdmin ? "ADMIN" : "TEACHER",
      }).catch(() => {});
    }

    setAllTimetables(prev => {
      const curClassData = prev[activeScheduleKey] || prev[selectedClass.id] || {};
      const curDayPeriods = curClassData[day] || [];
      const updatedDayPeriods = [
        ...curDayPeriods.filter(p => p.periodNumber !== periodNumber),
        newPeriod
      ].sort((a, b) => a.periodNumber - b.periodNumber);

      return {
        ...prev,
        [activeScheduleKey]: {
          ...curClassData,
          [day]: updatedDayPeriods
        },
        ...(selectedSection === "A" ? {
          [selectedClass.id]: {
            ...curClassData,
            [day]: updatedDayPeriods
          }
        } : {})
      };
    });

    setEditingPeriod(null);
  };

  // Check teacher conflicts across classes for a given day and period
  const checkTeacherConflict = (day: string, periodNumber: number, teacherName: string, currentSchedKey: string) => {
    if (!teacherName || teacherName === "TBA" || teacherName === "Subject Teacher") return null;
    const cleanT = teacherName.trim().toLowerCase();

    for (const [sKey, sched] of Object.entries(allTimetables)) {
      if (sKey === currentSchedKey || sKey === selectedClass?.id) continue;
      const periodsOnDay = sched[day] || [];
      const clash = periodsOnDay.find(p =>
        p.periodNumber === periodNumber &&
        p.teacherName?.trim().toLowerCase() === cleanT &&
        !p.isBreak
      );
      if (clash) {
        const [cId, secPart] = sKey.split("__sec_");
        const otherCls = classes.find(c => c.id === cId);
        return otherCls ? `${otherCls.name} ${secPart ? `(Sec ${secPart})` : ""}` : "Another Class";
      }
    }
    return null;
  };

  // Teacher-Subject Allotment summary for active Class & Section
  const classSubjectAllotments = useMemo(() => {
    const map = new Map<string, {
      subjectName: string;
      teacherName: string;
      periodsCount: number;
      slots: { day: string; periodNumber: number }[];
      room?: string;
    }>();

    DAYS_OF_WEEK.forEach(day => {
      const periods = classSchedule[day] || [];
      periods.forEach(p => {
        if (!p || p.isBreak) return;
        const key = `${p.subjectName}__${p.teacherName || "TBA"}`;
        if (!map.has(key)) {
          map.set(key, {
            subjectName: p.subjectName,
            teacherName: p.teacherName || "TBA",
            periodsCount: 0,
            slots: [],
            room: p.room
          });
        }
        const item = map.get(key)!;
        item.periodsCount += 1;
        item.slots.push({ day, periodNumber: p.periodNumber });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.periodsCount - a.periodsCount);
  }, [classSchedule]);

  // School-wide Teacher Workload summary (how many periods per week each teacher teaches)
  const teacherWorkloadSummary = useMemo(() => {
    const workload = new Map<string, {
      teacherName: string;
      teacherObj?: SchoolTeacher;
      totalPeriods: number;
      classBreakdown: Record<string, number>;
    }>();

    liveTeachers.forEach(t => {
      workload.set(t.name.toLowerCase(), {
        teacherName: t.name,
        teacherObj: t,
        totalPeriods: 0,
        classBreakdown: {}
      });
    });

    Object.entries(allTimetables).forEach(([schedKey, sched]) => {
      const [cId, secPart] = schedKey.split("__sec_");
      const cls = classes.find(c => c.id === cId);
      const clsLabel = cls ? `${cls.name} ${secPart ? `(${secPart})` : ""}` : "Class";

      DAYS_OF_WEEK.forEach(day => {
        const periods = sched[day] || [];
        periods.forEach(p => {
          if (!p || p.isBreak || !p.teacherName) return;
          const key = p.teacherName.toLowerCase();
          if (!workload.has(key)) {
            workload.set(key, {
              teacherName: p.teacherName,
              totalPeriods: 0,
              classBreakdown: {}
            });
          }
          const item = workload.get(key)!;
          item.totalPeriods += 1;
          item.classBreakdown[clsLabel] = (item.classBreakdown[clsLabel] || 0) + 1;
        });
      });
    });

    return Array.from(workload.values()).sort((a, b) => b.totalPeriods - a.totalPeriods);
  }, [liveTeachers, allTimetables, classes]);

  // Print Timetable
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 print:min-h-0 print:bg-white print:pb-0">
      <style>{`
        @media print {
          @page { size: landscape; margin: 6mm; }
          .timetable-print-table { font-size: 9px !important; width: 100% !important; table-layout: fixed; }
          .timetable-print-table th, .timetable-print-table td { padding: 4px !important; min-width: 0 !important; position: static !important; }
        }
      `}</style>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-4 sm:py-5 shadow-md border-b border-indigo-800/40 print:hidden">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Top row: Title + Session + Print Icon Only */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Go Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[11px] font-black uppercase tracking-wider border border-blue-400/30">
                    Academic Routine
                  </span>
                  {activeSession && (
                    <span className="text-slate-300 text-xs font-semibold">
                      Session: {activeSession.name}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-amber-400" />
                  <span>Class Timetable & Period Routine (समय-सारणी)</span>
                </h1>
              </div>
            </div>

            {/* Print Icon Button (Icon only as requested) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/20 cursor-pointer active:scale-95 shadow-sm"
                title="Print A4 Routine"
                aria-label="Print A4 Routine"
              >
                <Printer className="w-5 h-5 text-sky-300" />
              </button>
            </div>
          </div>

          {/* Unified Controls Bar in Blue Card: View Tabs + Actions */}
          <div className="flex items-center justify-between gap-2.5 flex-wrap pt-2.5 border-t border-white/10">
            {/* View Modes */}
            <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/10 flex-wrap">
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === "week"
                    ? "bg-white text-blue-900 shadow-md font-black"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                Weekly Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === "day"
                    ? "bg-white text-blue-900 shadow-md font-black"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                Day-by-Day
              </button>
              <button
                type="button"
                onClick={() => setViewMode("teacher")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "teacher"
                    ? "bg-purple-600 text-white shadow-md font-black"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
                title="Kaun teacher kya padhayenge dekhein"
              >
                <Users className="w-3.5 h-3.5 text-purple-300" />
                <span>Teacher Allotment</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "archive" ? "week" : "archive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "archive"
                    ? "bg-red-600 text-white shadow-md font-black ring-2 ring-red-300"
                    : "text-red-300 hover:text-white hover:bg-red-600/30"
                }`}
              >
                <Youtube className="w-3.5 h-3.5 text-red-400" />
                <span>{viewMode === "archive" ? "← Back to Routine" : "🔴 Video Lecture Archive"}</span>
              </button>
            </div>

            {/* Quick Actions (Auto-Fill & Manage Periods) */}
            <div className="flex items-center gap-2 flex-wrap">
              {(isAdmin || isTeacher) && viewMode !== "archive" && (
                <button
                  type="button"
                  onClick={handleAutoPopulate}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Fill Routine</span>
                </button>
              )}
              {isAdmin && viewMode !== "archive" && (
                <button
                  type="button"
                  onClick={() => setShowPeriodManagerModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
                  title="Periods kam/jyada karein, naya period jodein ya delete karein"
                >
                  <Settings className="w-4 h-4 text-indigo-200" />
                  <span>⚙️ Manage Periods ({periodSlots.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 0. VIDEO ARCHIVE MODE ── */}
      {viewMode === "archive" ? (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <ClassroomVideoArchive
            school={school}
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            activeSession={activeSession}
            currentUserRole={isAdmin ? "ADMIN" : isTeacher ? "TEACHER" : "STUDENT"}
            currentTeacherName={currentTeacherId ? teachers.find(t => t.id === currentTeacherId)?.name : undefined}
            currentTeacherId={currentTeacherId}
            studentClassId={studentClassId}
            onBack={() => setViewMode("week")}
          />
        </div>
      ) : (
        /* Main Container */
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
          {/* Printable Header (Visible only during print) */}
          <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
            <h2 className="text-2xl font-black text-slate-900">{school?.name || "School Timetable"}</h2>
            <p className="text-xs text-slate-600">{school?.address} {school?.phone && `• Ph: ${school.phone}`}</p>
            <div className="mt-2 inline-block px-4 py-1 rounded bg-slate-100 border border-slate-300 text-sm font-black">
              Official Weekly Timetable — {selectedClass ? `${selectedClass.name} - Section ${selectedSection || "A"}` : "All Classes"}
            </div>
          </div>

          {/* Filter Card: Class & Section Selectors */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 print:hidden">
            {/* ROW 1: Class Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                <span>Select Class:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((cls) => {
                  const isSel = cls.id === selectedClassId;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isSel
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ROW 2: Section Selector & + Add Section Button */}
            <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100 dark:border-slate-700/80">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Section (सेक्शन):</span>
              </label>

              <div className="flex items-center gap-1.5 flex-wrap">
                {currentClassSections.map((sec) => {
                  const isSel = sec === selectedSection;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSelectedSection(sec)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isSel
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      Section {sec}
                    </button>
                  );
                })}

                {/* + Add Section Button */}
                {(isAdmin || isTeacher) && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewSectionName("");
                      setShowAddSectionModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700/60 text-xs font-black flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                    title={`${selectedClass?.name} ke liye naya section jodein`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Section</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* DAY SELECTOR TABS (for day mode) */}
          {viewMode === "day" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 print:hidden">
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                    selectedDay === d
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* ── 1. WEEKLY GRID VIEW (Table) ── */}
          {viewMode === "week" && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden print:overflow-visible print:border-slate-300 print:shadow-none print:rounded-none">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-xs border-collapse timetable-print-table">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                      <th className="p-3 font-black w-24 sticky left-0 bg-slate-100 dark:bg-slate-700 print:static">Day</th>
                      {periodSlots.map((t) => (
                        <th key={t.periodNumber} className="p-3 font-black text-center border-l border-slate-200 dark:border-slate-700 min-w-[130px] group relative">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{t.label || `Period ${t.periodNumber}`}</span>
                            {isAdmin && periodSlots.length > 1 && (
                              confirmDeletePeriodNum === t.periodNumber ? (
                                <span className="inline-flex items-center gap-1 print:hidden">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePeriodSlot(t.periodNumber);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black cursor-pointer"
                                  >
                                    Delete?
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeletePeriodNum(null);
                                    }}
                                    className="px-1 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-bold cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePeriodSlot(t.periodNumber);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-400 p-0.5 rounded transition cursor-pointer print:hidden"
                                  title={`Period ${t.periodNumber} डिलीट करें`}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              )
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">{t.startTime} - {t.endTime}</div>
                        </th>
                      ))}
                      {isAdmin && (
                        <th className="p-2 text-center border-l border-slate-200 dark:border-slate-700 w-16 print:hidden">
                          <button
                            type="button"
                            onClick={handleQuickAddPeriod}
                            className="px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-750 text-[10px] font-black flex items-center gap-1 transition cursor-pointer mx-auto shadow-2xs active:scale-95"
                            title="Naya Period jodein (e.g. Period 9)"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayPeriods = classSchedule[day] || [];
                      return (
                        <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                          <td className="p-3 font-black text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                            {day}
                          </td>
                          {periodSlots.map((t) => {
                            const p = dayPeriods.find(item => item.periodNumber === t.periodNumber);
                            const clash = p && checkTeacherConflict(day, t.periodNumber, p.teacherName, selectedClass?.id || "");
                            const canEdit = isAdmin || isTeacher;

                            return (
                              <td
                                key={t.periodNumber}
                                onClick={() => canEdit && handleOpenEdit(day, t.periodNumber)}
                                className={`p-2.5 border-l border-slate-200 dark:border-slate-700 align-top transition ${
                                  canEdit ? "cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/30" : ""
                                } ${p?.isBreak || t.isBreak ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                              >
                                {p ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`font-black text-xs ${p.isBreak ? "text-amber-700 dark:text-amber-400" : "text-slate-800 dark:text-white"}`}>
                                        {p.subjectName}
                                      </span>
                                      {canEdit && (
                                        <Edit3 className="w-2.5 h-2.5 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 print:hidden shrink-0" />
                                      )}
                                    </div>
                                    {!p.isBreak && p.teacherName && (
                                      <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <Users className="w-2.5 h-2.5" />
                                        <span className="truncate">{p.teacherName}</span>
                                      </div>
                                    )}
                                    {p.topic && (
                                      <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                                        📌 {p.topic}
                                      </p>
                                    )}
                                    {p.room && (
                                      <div className="text-[9px] text-slate-400">
                                        {p.room}
                                      </div>
                                    )}
                                    {/* YouTube Watch Button on card */}
                                    {p.youtubeUrl && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setWatchingVideo({
                                            url: p.youtubeUrl!,
                                            title: p.topic || `${selectedClass?.name} - ${p.subjectName}`,
                                            subject: p.subjectName,
                                            teacher: p.teacherName
                                          });
                                        }}
                                        className="w-full mt-1 px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[9px] font-black flex items-center justify-center gap-1 shadow-xs transition cursor-pointer print:hidden"
                                      >
                                        <Youtube className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">Watch Video</span>
                                      </button>
                                    )}
                                    {clash && (
                                      <div className="text-[9px] text-rose-600 font-bold flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded">
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                        <span>Clash: {clash}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-12 flex items-center justify-center text-slate-300 dark:text-slate-600 text-[10px] italic">
                                    {canEdit ? "+ Add" : "—"}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 2. DAY-BY-DAY CARD VIEW ── */}
          {viewMode === "day" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {periodSlots.map((t) => {
                const dayPeriods = classSchedule[selectedDay] || [];
                const p = dayPeriods.find(item => item.periodNumber === t.periodNumber);
                const clash = p && checkTeacherConflict(selectedDay, t.periodNumber, p.teacherName, selectedClass?.id || "");
                const canEdit = isAdmin || isTeacher;

                return (
                  <div
                    key={t.periodNumber}
                    onClick={() => canEdit && handleOpenEdit(selectedDay, t.periodNumber)}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition relative ${
                      canEdit ? "cursor-pointer hover:border-blue-400" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black text-xs">
                        {t.label || `Period ${t.periodNumber}`}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {p?.startTime || t.startTime} - {p?.endTime || t.endTime}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <h4 className="font-black text-base text-slate-900 dark:text-white">
                        {p?.subjectName || "Unassigned"}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{p?.teacherName || "No teacher allocated"}</span>
                      </p>
                      {p?.topic && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold bg-slate-50 dark:bg-slate-750 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                          📌 Topic: {p.topic}
                        </p>
                      )}
                      {p?.room && (
                        <p className="text-[11px] text-slate-400">
                          Location: {p.room}
                        </p>
                      )}
                      {clash && (
                        <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Teacher Clash with {clash}</span>
                        </div>
                      )}

                      {/* YouTube Watch Button in Day card */}
                      {p?.youtubeUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWatchingVideo({
                              url: p.youtubeUrl!,
                              title: p.topic || `${selectedClass?.name} - ${p?.subjectName}`,
                              subject: p?.subjectName,
                              teacher: p?.teacherName
                            });
                          }}
                          className="w-full mt-2 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer active:scale-95"
                        >
                          <Youtube className="w-4 h-4 shrink-0" />
                          <span>▶ Watch Class Video Lecture</span>
                        </button>
                      ) : canEdit && !p?.isBreak ? (
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                          <Youtube className="w-3 h-3 text-red-400 shrink-0" />
                          <span>No YouTube video attached (Click to add)</span>
                        </div>
                      ) : null}
                    </div>

                    {canEdit && (
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Edit Period & Video
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {isAdmin && (
                <div
                  onClick={handleQuickAddPeriod}
                  className="rounded-2xl p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center gap-2 cursor-pointer transition min-h-[160px] text-slate-400 hover:text-blue-600 bg-slate-50/50 dark:bg-slate-800/30 print:hidden active:scale-95"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-black text-lg">
                    +
                  </div>
                  <span className="text-xs font-black">+ Add Period {periodSlots.length + 1}</span>
                  <span className="text-[10px] text-slate-400">Naya period slot add karein</span>
                </div>
              )}
            </div>
          )}

          {/* ── 3. TEACHER ALLOTMENT & WORKLOAD VIEW ("Kon Teacher Kya Padhayenge") ── */}
          {viewMode === "teacher" && (
            <div className="space-y-6">
              {/* Card 1: Active Class & Section Allotment Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">
                        {selectedClass?.name} - Section {selectedSection || "A"} : Teacher Allotment
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Is class aur section me kaun shikshak kaun sa vishay padha rahe hain
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
                  >
                    Weekly Grid me Dekhein / Edit Karein →
                  </button>
                </div>

                {classSubjectAllotments.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      Is Class & Section ke liye abhi koi routine period save nahi kiya gaya hai.
                    </p>
                    <p className="text-xs text-slate-400">
                      "Auto-Fill Routine" par click karein ya Weekly Grid me periods par tap karke vishay aur shikshak chunein.
                    </p>
                    {(isAdmin || isTeacher) && (
                      <button
                        type="button"
                        onClick={handleAutoPopulate}
                        className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md cursor-pointer"
                      >
                        ⚡ Auto-Fill Routine Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          <th className="p-3 font-black">Subject (विषय)</th>
                          <th className="p-3 font-black">Assigned Faculty (शिक्षक)</th>
                          <th className="p-3 font-black text-center">Periods / Week</th>
                          <th className="p-3 font-black">Days & Schedule Slots</th>
                          <th className="p-3 font-black">Classroom</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {classSubjectAllotments.map((item, idx) => {
                          const teacherObj = liveTeachers.find(t => t.name.toLowerCase() === item.teacherName.toLowerCase());
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/30">
                              <td className="p-3">
                                <span className="font-black text-sm text-slate-900 dark:text-white">
                                  {item.subjectName}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                                    👨‍🏫
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                      {item.teacherName}
                                    </p>
                                    {teacherObj?.designation && (
                                      <p className="text-[10px] text-slate-400">
                                        {teacherObj.designation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono font-black text-xs">
                                  {item.periodsCount} periods
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {item.slots.map((s, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300"
                                    >
                                      {s.day.slice(0, 3)} P{s.periodNumber}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-slate-500 dark:text-slate-400 text-xs font-mono">
                                {item.room || `Room ${selectedClass?.name.replace(/\D+/g, "") || "101"}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Card 2: School-Wide Teacher Workload & Period Distribution */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      School-Wide Faculty Workload (सभी शिक्षकों का साप्ताहिक कार्यभार)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Har shikshak pure school me kitne periods padha rahe hain aur kaun si class me
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3 font-black">Faculty Name</th>
                        <th className="p-3 font-black">Subjects</th>
                        <th className="p-3 font-black text-center">Total Periods / Week</th>
                        <th className="p-3 font-black">Classes Taught</th>
                        <th className="p-3 font-black text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {teacherWorkloadSummary.map((tItem, idx) => {
                        const classesList = Object.entries(tItem.classBreakdown);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/30">
                            <td className="p-3">
                              <p className="font-black text-slate-900 dark:text-white text-xs">
                                {tItem.teacherName}
                              </p>
                              {tItem.teacherObj?.designation && (
                                <p className="text-[10px] text-slate-400">
                                  {tItem.teacherObj.designation}
                                </p>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {tItem.teacherObj?.subjects?.length ? (
                                  tItem.teacherObj.subjects.map(sub => (
                                    <span key={sub} className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                                      {sub}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px]">General Faculty</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-3 py-1 rounded-full font-mono font-black text-xs ${
                                tItem.totalPeriods > 30
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : tItem.totalPeriods > 0
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                              }`}>
                                {tItem.totalPeriods} periods
                              </span>
                            </td>
                            <td className="p-3">
                              {classesList.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {classesList.map(([cName, count]) => (
                                    <span key={cName} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                      {cName} ({count})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">No periods assigned yet</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {tItem.totalPeriods > 30 ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                  Heavy Load
                                </span>
                              ) : tItem.totalPeriods > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-400 text-[10px] font-bold">
                                  Unallocated
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EDIT PERIOD MODAL ── */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {selectedClass?.name} • {editingPeriod.day}
                </p>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  Period {editingPeriod.periodNumber} Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-750 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={formIsBreak}
                onChange={e => setFormIsBreak(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Mark as Recess / Lunch Break (लंच / मध्यंतर)
              </span>
            </label>

            {!formIsBreak && (
              <>
                {/* ── 1. SUBJECT SELECTOR ── */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>Subject (विषय) *</span>
                    </label>
                    {formSubjectName && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        ✓ {formSubjectName}
                      </span>
                    )}
                  </div>

                  {/* Dropdown to select subject — STRICTLY CLASS SUBJECTS ONLY (No dummy list) */}
                  <select
                    value={formSubjectName}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "__add_new__") {
                        setShowInlineAddSubject(true);
                        return;
                      }
                      setFormSubjectName(val);
                      // Auto-suggest registered teacher for this subject if not already set
                      const matched = liveTeachers.find(t =>
                        Array.isArray(t.subjects) &&
                        t.subjects.some(sub => sub.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(sub.toLowerCase()))
                      );
                      if (matched && !formTeacherName) {
                        setFormTeacherName(matched.name);
                      }
                    }}
                    className="w-full px-3 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- विषय चुनें (Select Subject) --</option>
                    {classSubjects.length > 0 ? (
                      classSubjects.map(s => (
                        <option key={s.id || s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        ⚠️ इस कक्षा में अभी कोई विषय नहीं जोड़ा गया है (No subjects)
                      </option>
                    )}
                    {isAdmin && (
                      <option value="__add_new__">
                        ➕ इस कक्षा में नया विषय जोड़ें (+ Add Subject to {selectedClass?.name || "Class"})
                      </option>
                    )}
                  </select>

                  {/* Empty state: If no subjects added to this class yet, allow 1-click addition */}
                  {classSubjects.length === 0 && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>इस कक्षा ({selectedClass?.name}) में अभी कोई विषय नहीं जुड़ा है</span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        नीचे विषय का नाम लिखकर सीधे इस क्लास में जोड़ें:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newClassSubjectInput}
                          onChange={e => setNewClassSubjectInput(e.target.value)}
                          placeholder="विषय का नाम (e.g. Mathematics, Science)"
                          className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-slate-900 dark:text-white"
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddNewSubjectToClass();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewSubjectToClass()}
                          disabled={!newClassSubjectInput.trim()}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black cursor-pointer disabled:opacity-40 transition active:scale-95"
                        >
                          + Add Subject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Add Subject Box when requested by Admin */}
                  {showInlineAddSubject && (
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span>Add Subject to {selectedClass?.name} (कक्षा में नया विषय जोड़ें)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowInlineAddSubject(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newClassSubjectInput}
                          onChange={e => setNewClassSubjectInput(e.target.value)}
                          placeholder="विषय का नाम (e.g. Sanskrit, Computer, GK)"
                          className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl font-bold text-slate-900 dark:text-white"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddNewSubjectToClass();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewSubjectToClass()}
                          disabled={!newClassSubjectInput.trim()}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer disabled:opacity-40 transition active:scale-95 shadow-xs"
                        >
                          Save &amp; Select
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Class Subjects Quick Badges (केवल इस कक्षा के विषय) */}
                  {classSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {classSubjects.map(s => (
                        <button
                          key={s.id || s.name}
                          type="button"
                          onClick={() => {
                            setFormSubjectName(s.name);
                            const t = liveTeachers.find(tch =>
                              Array.isArray(tch.subjects) && tch.subjects.some(sub => sub.toLowerCase() === s.name.toLowerCase())
                            );
                            if (t && !formTeacherName) setFormTeacherName(t.name);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer active:scale-95 ${
                            formSubjectName === s.name
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                      {isAdmin && !showInlineAddSubject && (
                        <button
                          type="button"
                          onClick={() => setShowInlineAddSubject(true)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-dashed border-blue-300 dark:border-blue-700 transition cursor-pointer"
                        >
                          + Add New
                        </button>
                      )}
                    </div>
                  )}

                  {/* Recommendation: Kon Teacher Padhayenge */}
                  {matchingTeachersForSubject.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-1 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>इस विषय के शिक्षक (Faculty for {formSubjectName}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {matchingTeachersForSubject.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormTeacherName(t.name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs ${
                              formTeacherName === t.name
                                ? "bg-emerald-700 text-white ring-2 ring-emerald-400"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            <span>Assign {t.name}</span>
                            {t.designation && <span className="text-[9px] opacity-75">({t.designation})</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 2. TEACHER SELECTOR ── */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Assigned Teacher (अध्यापक) *</span>
                    </label>
                    {formTeacherName && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ {formTeacherName}
                      </span>
                    )}
                  </div>

                  {/* Dropdown to select from existing teachers list */}
                  <select
                    value={formTeacherName}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        setFormTeacherName("");
                        return;
                      }
                      setFormTeacherName(val);
                      // Auto-fill primary subject if subject is empty
                      const tObj = liveTeachers.find(t => t.name === val);
                      if (tObj && Array.isArray(tObj.subjects) && tObj.subjects.length > 0 && !formSubjectName) {
                        setFormSubjectName(tObj.subjects[0]);
                      }
                    }}
                    className="w-full px-3 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="">-- स्कूल के रजिस्टर्ड शिक्षक चुनें (Select Teacher) --</option>
                    {liveTeachers.map(t => {
                      const subLabel = t.subjects?.length ? `• [${t.subjects.join(", ")}]` : t.designation ? `• ${t.designation}` : "";
                      return (
                        <option key={t.id} value={t.name}>
                          👨‍🏫 {t.name} {subLabel}
                        </option>
                      );
                    })}
                    <option value="__custom__">✏️ अन्य शिक्षक टाइप करें (Custom Name)</option>
                  </select>

                  {/* Manual input for custom teacher or tweaking */}
                  <input
                    type="text"
                    value={formTeacherName}
                    onChange={e => setFormTeacherName(e.target.value)}
                    placeholder="Ya teacher ka naam type karein (e.g. Dr. Arvind, Priya Sharma)"
                    className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-750 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400"
                  />

                  {/* Quick Teacher Pills */}
                  {liveTeachers.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 max-h-20 overflow-y-auto">
                      {liveTeachers.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setFormTeacherName(t.name);
                            if (t.subjects?.length && !formSubjectName) setFormSubjectName(t.subjects[0]);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                            formTeacherName === t.name
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-emerald-50"
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Real-Time Teacher Conflict Check Warning */}
                  {editingPeriod && checkTeacherConflict(editingPeriod.day, editingPeriod.periodNumber, formTeacherName, activeScheduleKey) && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 mt-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>
                        ⚠️ Clash Alert: <strong>{formTeacherName}</strong> is already assigned in <strong>{checkTeacherConflict(editingPeriod.day, editingPeriod.periodNumber, formTeacherName, activeScheduleKey)}</strong> during Period {editingPeriod.periodNumber} on {editingPeriod.day}!
                      </span>
                    </div>
                  )}
                </div>

                {/* YouTube Class Lecture Section */}
                <div className="p-3.5 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <Youtube className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Today's Class YouTube Video (आज की क्लास वीडियो)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Teacher is period ka YouTube video link yahan paste karein. Absent students aur revision ke liye video app me play hoga.
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Lecture Topic / Chapter (पाठ / विषय)
                    </label>
                    <input
                      type="text"
                      value={formTopic}
                      onChange={e => setFormTopic(e.target.value)}
                      placeholder="e.g. Chapter 3: Linear Equations Part 2"
                      className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-750 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      YouTube URL (लिंक)
                    </label>
                    <input
                      type="text"
                      value={formYoutubeUrl}
                      onChange={e => setFormYoutubeUrl(e.target.value)}
                      placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-750 text-xs font-mono text-slate-800 dark:text-white"
                    />
                    {formYoutubeUrl && extractYouTubeVideoId(formYoutubeUrl) && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Valid YouTube Video ID: {extractYouTubeVideoId(formYoutubeUrl)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Time slot & Room */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={e => setFormStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={e => setFormEndTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Classroom / Lab (Optional)
              </label>
              <input
                type="text"
                value={formRoom}
                onChange={e => setFormRoom(e.target.value)}
                placeholder="e.g. Room 102, Science Lab, Ground"
                className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSavePeriod}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                Save Period &amp; Video Link
              </button>
              {editingPeriod.period && (
                <button
                  type="button"
                  onClick={handleClearCurrentPeriod}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 flex items-center gap-1 cursor-pointer transition active:scale-95"
                  title="Is din se is period ka subject/teacher hatayein"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── YOUTUBE LECTURE PLAYER MODAL ── */}
      <YouTubeLectureModal
        isOpen={Boolean(watchingVideo)}
        onClose={() => setWatchingVideo(null)}
        fallbackUrl={watchingVideo?.url}
        fallbackTitle={watchingVideo?.title}
      />

      {/* ── ADD NEW SECTION MODAL (कक्षा में नया सेक्शन जोड़ें) ── */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">
                    Add New Section (नया सेक्शन)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Class: {selectedClass?.name || "Class"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Section Name / Letter (सेक्शन का नाम) *
              </label>
              <input
                type="text"
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value.toUpperCase())}
                placeholder="e.g. A, B, C, D, Science, Commerce"
                className="w-full px-3.5 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-emerald-500/30"
                autoFocus
              />

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-slate-400 font-bold">Quick:</span>
                {["A", "B", "C", "D", "E"].filter(s => !currentClassSections.includes(s)).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewSectionName(s)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
                  >
                    Sec {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleAddSectionSubmit}
                disabled={!newSectionName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer disabled:opacity-40 active:scale-95"
              >
                Save Section &amp; Create Routine
              </button>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERIOD MANAGER MODAL (स्कूल एडमिन पीरियड्स सेटिंग्स - कम/ज्यादा/डिलीट/ऐड) ── */}
      {showPeriodManagerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                  <Clock className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span>Manage Daily Periods (पीरियड्स सेटिंग्स)</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                      Total: {periodSlots.length} Periods
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    एडमिन यहाँ से पीरियड्स की संख्या कम/ज्यादा कर सकते हैं, नया पीरियड जोड़ या डिलीट कर सकते हैं।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPeriodManagerModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-Click Presets */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shrink-0">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Click Routine Presets (क्विक प्रीसेट चुने):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPeriodPreset(6)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                    periodSlots.length === 6
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  6 Periods (Half Day)
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset(7)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                    periodSlots.length === 7
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  7 Periods Day
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset(8)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                    periodSlots.length === 8
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  8 Periods (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset(9)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                    periodSlots.length === 9
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  9 Periods (Extended)
                </button>
              </div>
            </div>

            {/* List of Periods */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {periodSlots.map((slot) => (
                <div
                  key={slot.periodNumber}
                  className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-300 transition flex-wrap sm:flex-nowrap"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                    #{slot.periodNumber}
                  </div>

                  <div className="flex-1 min-w-[120px]">
                    <input
                      type="text"
                      value={slot.label || `Period ${slot.periodNumber}`}
                      onChange={(e) => handleUpdatePeriodSlot(slot.periodNumber, "label", e.target.value)}
                      placeholder={`Period ${slot.periodNumber}`}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => handleUpdatePeriodSlot(slot.periodNumber, "startTime", e.target.value)}
                      className="px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => handleUpdatePeriodSlot(slot.periodNumber, "endTime", e.target.value)}
                      className="px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(slot.isBreak)}
                      onChange={(e) => handleUpdatePeriodSlot(slot.periodNumber, "isBreak", e.target.checked)}
                      className="rounded text-amber-600 w-3.5 h-3.5"
                    />
                    <span>Break</span>
                  </label>

                  {confirmDeletePeriodNum === slot.periodNumber ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeletePeriodSlot(slot.periodNumber)}
                        className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePeriodNum(null)}
                        className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeletePeriodSlot(slot.periodNumber)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer shrink-0"
                      title={`Period ${slot.periodNumber} डिलीट करें`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={handleQuickAddPeriod}
                className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-black text-xs flex items-center gap-1.5 transition cursor-pointer border border-blue-200 dark:border-blue-750 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Period {periodSlots.length + 1}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPeriodManagerModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                Done / Save Settings (सहेजें)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
