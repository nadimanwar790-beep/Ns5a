// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Youtube, Calendar, BookOpen, Clock, User, Plus, Trash2, Edit3,
  Search, Play, ChevronLeft, ChevronRight, Video, Sparkles, Filter,
  Layers, CheckCircle2, AlertCircle, Save, X, ExternalLink, Crown
} from "lucide-react";
import {
  type School, type SchoolClass, type SchoolSession, type SchoolTeacher, type SchoolSubject,
  type DailyClassLecture, isSchoolEliteCurriculum
} from "../../school-types";
import {
  getClassLectures, saveClassLecture, deleteClassLecture,
  extractYouTubeVideoId, generateId
} from "../../school-firebase";
import { CustomPlayer } from "../CustomPlayer";
import { rotateScreen } from "../../utils/displayPrefs";

interface Props {
  school: School;
  classes: SchoolClass[];
  teachers?: SchoolTeacher[];
  subjects?: SchoolSubject[];
  activeSession?: SchoolSession | null;
  currentUserRole?: "ADMIN" | "TEACHER" | "STUDENT";
  currentTeacherName?: string;
  currentTeacherId?: string;
  studentClassId?: string;
  onBack?: () => void;
}

const MONTH_NAMES = [
  { key: "04", name: "April" },
  { key: "05", name: "May" },
  { key: "06", name: "June" },
  { key: "07", name: "July" },
  { key: "08", name: "August" },
  { key: "09", name: "September" },
  { key: "10", name: "October" },
  { key: "11", name: "November" },
  { key: "12", name: "December" },
  { key: "01", name: "January" },
  { key: "02", name: "February" },
  { key: "03", name: "March" },
];

export const ClassroomVideoArchive: React.FC<Props> = ({
  school,
  classes = [],
  teachers = [],
  subjects = [],
  activeSession,
  currentUserRole = "ADMIN",
  currentTeacherName = "Teacher",
  currentTeacherId = "",
  studentClassId = "",
  onBack,
}) => {
  const isAdmin = currentUserRole === "ADMIN";
  const isTeacher = currentUserRole === "TEACHER";
  const canEdit = isAdmin || isTeacher;

  // Hierarchical State
  const defaultClass = studentClassId
    ? classes.find(c => c.id === studentClassId) || classes[0]
    : classes[0];

  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClass?.id || "");
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId) || defaultClass, [classes, selectedClassId, defaultClass]);

  // Current year & month defaults
  const todayIso = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const currentMonthKey = todayIso.slice(5, 7); // MM
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [searchQuery, setSearchQuery] = useState("");

  // Lectures from DB
  const [lectures, setLectures] = useState<DailyClassLecture[]>([]);
  const [loading, setLoading] = useState(false);

  // Active video player modal
  const [playingLecture, setPlayingLecture] = useState<DailyClassLecture | null>(null);

  // Add / Edit Lecture Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<DailyClassLecture | null>(null);

  // Form State
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formSubject, setFormSubject] = useState("");
  const [formTeacher, setFormTeacher] = useState(isTeacher ? currentTeacherName : "");
  const [formTopic, setFormTopic] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  // Load lectures
  const loadLectures = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await getClassLectures(school.id, selectedClassId || undefined);
      setLectures(data);
    } catch (e) {
      console.warn("Failed to load lectures:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLectures();
  }, [school?.id, selectedClassId]);

  // Listen for external updates
  useEffect(() => {
    const handler = () => loadLectures();
    window.addEventListener("lectures-updated", handler);
    return () => window.removeEventListener("lectures-updated", handler);
  }, [school?.id, selectedClassId]);

  // Auto-sync selectedDate to the latest available lecture date if today has no lectures
  useEffect(() => {
    if (lectures.length > 0) {
      const hasSelected = lectures.some(l => l.date === selectedDate);
      if (!hasSelected) {
        const latestDate = lectures[0]?.date;
        if (latestDate) {
          setSelectedDate(latestDate);
          setSelectedMonth(latestDate.slice(5, 7));
        }
      }
    }
  }, [lectures, selectedDate]);

  // Filter lectures for selected month and date
  const monthLectures = useMemo(() => {
    return lectures.filter(l => {
      if (!l.date) return false;
      const m = l.date.slice(5, 7);
      return m === selectedMonth;
    });
  }, [lectures, selectedMonth]);

  // Distinct dates in this month that have videos
  const activeDatesInMonth = useMemo(() => {
    const set = new Set(monthLectures.map(l => l.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [monthLectures]);

  // Filter lectures for selected date with fallback to available month and class lectures
  const dateLectures = useMemo(() => {
    const direct = lectures.filter(l => l.date === selectedDate);
    if (direct.length > 0) return direct;
    if (monthLectures.length > 0) return monthLectures;
    if (lectures.length > 0) return lectures.slice(0, 8);
    return [];
  }, [lectures, selectedDate, monthLectures]);

  // Open add modal for a specific period or general
  const handleOpenAdd = (periodNumber = 1, defaultSub = "") => {
    setEditingLecture(null);
    setFormPeriod(periodNumber);
    setFormSubject(defaultSub || (subjects[0]?.name || "Mathematics"));
    setFormTeacher(isTeacher ? currentTeacherName : (teachers[0]?.name || school?.principalName || "Teacher"));
    setFormTopic("");
    setFormUrl("");
    setFormNotes("");
    setFormNotice(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (lec: DailyClassLecture) => {
    setEditingLecture(lec);
    setFormPeriod(lec.periodNumber || 1);
    setFormSubject(lec.subjectName || "");
    setFormTeacher(lec.teacherName || "");
    setFormTopic(lec.topic || "");
    setFormUrl(lec.youtubeUrl || "");
    setFormNotes(lec.notes || "");
    setFormNotice(null);
    setShowAddModal(true);
  };

  const handleSaveLecture = async () => {
    if (!formUrl.trim()) {
      setFormNotice("Kripya YouTube video link daalein!");
      return;
    }

    const videoId = extractYouTubeVideoId(formUrl);
    if (!videoId) {
      setFormNotice("Invalid YouTube Link! Sahi link daalein (e.g. youtu.be/... ya youtube.com/watch?v=...)");
      return;
    }

    if (!formSubject.trim()) {
      setFormNotice("Subject ka naam chunein ya daalein!");
      return;
    }

    setSaving(true);
    try {
      const lecturePayload: DailyClassLecture = {
        id: editingLecture?.id || generateId("lec"),
        schoolId: school.id,
        sessionId: activeSession?.name || "2026-27",
        classId: selectedClass?.id || selectedClassId || "class_1",
        className: selectedClass?.name || "Class",
        date: selectedDate,
        month: selectedDate.slice(0, 7),
        periodNumber: Number(formPeriod) || 1,
        periodTime: `Period ${formPeriod}`,
        subjectName: formSubject.trim(),
        topic: formTopic.trim() || `${formSubject} Lecture`,
        teacherName: formTeacher.trim() || currentTeacherName,
        teacherId: currentTeacherId || undefined,
        youtubeUrl: formUrl.trim(),
        youtubeVideoId: videoId,
        notes: formNotes.trim(),
        addedAt: new Date().toISOString(),
        addedBy: isAdmin ? "ADMIN" : "TEACHER",
      };

      await saveClassLecture(lecturePayload);
      setShowAddModal(false);
      await loadLectures();
    } catch (e: any) {
      setFormNotice(e?.message || "Failed to save lecture video");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lecId: string) => {
    if (!confirm("Kya aap is lecture video ko delete karna chahte hain?")) return;
    try {
      await deleteClassLecture(school.id, lecId);
      await loadLectures();
    } catch (e) {
      console.warn("Delete error:", e);
    }
  };

  // DIRECT CUSTOM PLAYER VIEW (NO POPUP MODAL)
  if (playingLecture) {
    const lectureUrl = playingLecture.youtubeUrl || (playingLecture.youtubeVideoId ? `https://youtu.be/${playingLecture.youtubeVideoId}` : "");
    const videoTitle = `${playingLecture.topic || "Class Lecture"} • ${playingLecture.subjectName || ""}`;
    const sortedLectures = [...dateLectures].sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0));
    const currentIndex = sortedLectures.findIndex(l => l.id === playingLecture.id);
    const nextLec = currentIndex >= 0 && currentIndex < sortedLectures.length - 1 ? sortedLectures[currentIndex + 1] : null;

    return (
      <div className="fixed inset-0 bg-black flex flex-col z-[500] animate-in fade-in duration-150">
        <div className="flex-1 relative">
          <div style={{ position: "absolute", inset: 0 }}>
            <CustomPlayer
              videoUrl={lectureUrl}
              videoTitle={videoTitle}
              brandingText={school?.name || "NSTA School"}
              brandingLogo={school?.logoUrl}
              onBack={() => setPlayingLecture(null)}
              onNext={nextLec ? () => setPlayingLecture(nextLec) : undefined}
              nextTitle={nextLec ? `${nextLec.topic || nextLec.subjectName} (Period ${nextLec.periodNumber})` : undefined}
              onRotate={async () => {
                await rotateScreen();
              }}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </div>
    );
  }

  const isElite = isSchoolEliteCurriculum(school);
  if (!isElite) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in slide-in-from-right max-w-4xl mx-auto my-4">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          {onBack && (
            <button type="button" onClick={onBack} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full hover:bg-slate-200 cursor-pointer">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Crown className="text-amber-500" size={24} />
              Classroom YouTube Video Lectures
            </h3>
            <p className="text-xs text-slate-500 font-medium">{school?.name || "School"} Video Archive Desk</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 dark:via-amber-950/20 to-orange-500/10 border-2 border-amber-300 dark:border-amber-600 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
            <Crown size={32} />
          </div>
          <div className="space-y-1">
            <span className="px-3 py-1 bg-amber-200/80 text-amber-900 rounded-full text-[11px] font-black uppercase tracking-wider">
              👑 Elite School Plan Required
            </span>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              Classroom YouTube Video Lectures Archive
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
              Apne school ke students ke liye Class 1 se 12 tak ke daily YouTube lecture links, revision archive aur missed class videos jodne ke liye <strong>School Elite Subscription (2× Price)</strong> activate karein.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left pt-2">
            <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Basic Elite</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">₹1,999<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">200 Students + YouTube Lectures</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border-2 border-amber-400 rounded-2xl p-3.5 shadow-sm relative">
              <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">POPULAR</span>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Standard Elite</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">₹3,999<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">500 Students + YouTube Lectures</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pro Elite</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">₹7,999<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">2000 Students + Full Video Desk</p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/918227070298?text=${encodeURIComponent(`Hello Super Admin, I want to upgrade school "${school?.name || 'My School'}" (ID: ${school?.id}) to the Elite Plan (2x Price) to unlock Classroom YouTube Video Lectures.`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              👑 Contact Super Admin for Elite Upgrade
            </a>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm cursor-pointer"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto p-3 sm:p-5 animate-in fade-in duration-150">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-red-900 via-rose-900 to-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-xl border border-red-700/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-red-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer mr-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shrink-0 shadow-md">
                <Youtube className="w-4 h-4 fill-white text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                Classroom YouTube Video Lectures
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/15 text-rose-200 border border-white/20">
                Revision & Missed Class Archive
              </span>
            </div>
            <p className="text-xs sm:text-sm text-rose-100/90 max-w-2xl">
              Daily class me jo padhaya gaya, uska YouTube lecture yahan judta hai taaki agar student class na kar paye toh future me revision kar sake!
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => handleOpenAdd(1)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Video Lecture</span>
            </button>
          )}
        </div>
      </div>

      {/* Tier 1 & 2: Session & Class Selector Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Class Selector Pills */}
          <div className="space-y-1.5 flex-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Class Chunein:</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                    selectedClassId === cls.id
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-red-50"
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>

          {/* Academic Session Badge */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Session:</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {activeSession?.name || "2026-27"}
            </span>
          </div>
        </div>

        {/* Tier 3: Month Wise Tabs */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-red-500" />
            <span>Month Wise Lectures (Folder View):</span>
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
            {MONTH_NAMES.map(m => {
              const isSelected = selectedMonth === m.key;
              const countInMonth = lectures.filter(l => l.date && l.date.slice(5, 7) === m.key).length;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(m.key);
                    // Select first available date in that month or update month prefix of selectedDate
                    const matching = lectures.find(l => l.date && l.date.slice(5, 7) === m.key);
                    if (matching) {
                      setSelectedDate(matching.date);
                    } else {
                      const curYear = new Date().getFullYear();
                      setSelectedDate(`${curYear}-${m.key}-01`);
                    }
                  }}
                  className={`p-2 rounded-xl text-center border transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-xs font-bold truncate">{m.name}</p>
                  <p className="text-[10px] opacity-75 mt-0.5 font-mono">
                    {countInMonth > 0 ? `${countInMonth} vids` : "—"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tier 4: Date Picker & Active Day Lectures Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        {/* Date Chooser & Quick Day Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Lecture Date: <span className="text-red-600 dark:text-red-400">{selectedDate}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {selectedClass?.name || "Class"} • {dateLectures.length} Video Lectures Conducted
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Change Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                const val = e.target.value;
                setSelectedDate(val);
                if (val) setSelectedMonth(val.slice(5, 7));
              }}
              className="px-3 py-1.5 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-xs font-bold"
            />
          </div>
        </div>

        {/* Existing Dates in Month Pills for Fast 1-Tap Switching */}
        {activeDatesInMonth.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-slate-400 shrink-0 font-bold">Videos Available On:</span>
            {activeDatesInMonth.map(dStr => (
              <button
                key={dStr}
                type="button"
                onClick={() => setSelectedDate(dStr)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer whitespace-nowrap ${
                  selectedDate === dStr
                    ? "bg-red-600 text-white border-red-600 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-200"
                }`}
              >
                {dStr.slice(8, 10)} {MONTH_NAMES.find(m => m.key === dStr.slice(5, 7))?.name} ({lectures.filter(l => l.date === dStr).length})
              </button>
            ))}
          </div>
        )}

        {/* Lectures List for This Day */}
        {dateLectures.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
            <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Is Date ({selectedDate}) ko abhi koi YouTube Lecture video attached nahi hai
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Teacher ya Admin &quot;+ Add Video Lecture&quot; par tap karke YouTube link attach kar sakte hain.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenAdd(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Is Date Ka Lecture Jodein</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {dateLectures.map(lec => {
              const vId = lec.youtubeVideoId || extractYouTubeVideoId(lec.youtubeUrl);
              const thumbUrl = vId ? `https://img.youtube.com/vi/${vId}/hqdefault.jpg` : "";

              return (
                <div
                  key={lec.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col"
                >
                  {/* YouTube Thumbnail Preview with Play Overlay */}
                  <div
                    onClick={() => setPlayingLecture(lec)}
                    className="relative aspect-video w-full bg-slate-950 cursor-pointer group overflow-hidden"
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={lec.topic}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <Youtube className="w-12 h-12 text-red-500/50" />
                      </div>
                    )}

                    {/* Gradient Overlay & Big Play Button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Period Badge on Video */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-[10px] font-black tracking-wide border border-white/20">
                      Period {lec.periodNumber} • {lec.subjectName}
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-red-600 text-white text-[10px] font-black flex items-center gap-1 shadow-md">
                      <Youtube className="w-3 h-3 fill-white" />
                      <span>YouTube In-App</span>
                    </div>
                  </div>

                  {/* Lecture Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1">
                        {lec.topic || `${lec.subjectName} Class`}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{lec.subjectName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{lec.teacherName}</span>
                        </span>
                      </p>
                      {lec.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                          📝 {lec.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setPlayingLecture(lec)}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Watch Class Video</span>
                      </button>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lec)}
                            title="Edit Lecture Link / Topic"
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(lec.id)}
                            title="Delete Lecture"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Lecture Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center">
                  <Youtube className="w-4 h-4 fill-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {editingLecture ? "Edit YouTube Class Lecture" : "+ Add YouTube Class Lecture"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedClass?.name} • Date: {selectedDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formNotice && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formNotice}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Period Number & Subject */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">Period Number *</label>
                  <select
                    value={formPeriod}
                    onChange={e => setFormPeriod(Number(e.target.value))}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-xl bg-transparent font-bold text-slate-800 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">Subject *</label>
                  <input
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    placeholder="e.g. Mathematics, Science"
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-xl bg-transparent font-bold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* YouTube Video URL */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block flex items-center justify-between">
                  <span>YouTube Video URL (Unlisted / Public) *</span>
                  <span className="text-[10px] text-red-500 font-normal">youtu.be / watch?v=...</span>
                </label>
                <input
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://youtu.be/xxxxxx ya https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white font-mono"
                />
              </div>

              {/* Topic / Chapter */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">Chapter / Topic Covered Today *</label>
                <input
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  placeholder="e.g. Chapter 4: Carbon and Its Compounds - Part 1"
                  className="w-full px-3 py-2 border dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white font-bold"
                />
              </div>

              {/* Teacher Name */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">Teacher Name</label>
                <input
                  value={formTeacher}
                  onChange={e => setFormTeacher(e.target.value)}
                  placeholder="Subject Teacher Name"
                  className="w-full px-3 py-2 border dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">Class Notes / Summary (Optional)</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Page 45 homework, formula notes..."
                  className="w-full px-3 py-2 border dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLecture}
                disabled={saving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Lecture"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
