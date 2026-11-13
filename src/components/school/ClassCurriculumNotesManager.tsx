// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Trash2, Edit3, Video, FileText, Music,
  CheckCircle2, AlertCircle, Sparkles, Plus, Search, Filter,
  BookOpen, Crown, Lock, ChevronDown, ChevronUp, ExternalLink, HelpCircle
} from "lucide-react";
import { CoachingMcqEditor } from "../CoachingMcqEditor";
import { DirectUploadButton } from "../DirectUploadButton";
import { AdminLucentMediaModal } from "../AdminLucentMediaModal";
import type { LucentNoteEntry, LucentNotePage } from "../../types";
import {
  saveSchoolCurriculumNote,
  deleteSchoolCurriculumNote,
  subscribeToSchoolCurriculumNotes,
  getLocalSchoolCurriculumNotes
} from "../../school-firebase";
import { saveLucentEntryDirect, deleteLucentEntry, saveMcqLesson, fetchMcqLesson } from "../../firebase";
import { ADMIN_WHATSAPP_NUMBER } from "../../constants";

const syncClassNotesMcqsToRevisionHub = async (entry: LucentNoteEntry, subjectName?: string) => {
  if (!entry || !entry.lessonTitle || !entry.lessonTitle.trim()) return;
  const entryId = entry.id || Date.now().toString();
  const syncedId = `clsnotes_${entryId}`;
  const cleanClassLevel = String(entry.classLevel || '10');
  const resolvedSubject = subjectName || entry.subject || 'General';

  try {
    const existing = await fetchMcqLesson(syncedId);
    const isTopicMcq = (m: any) => {
      if (!m?.question?.trim()) return false;
      const t = String(m.topic || '').trim().toLowerCase();
      return t !== '' && t !== 'general' && t !== 'सामान्य';
    };

    const pageMcqs = (entry.pages || []).flatMap((p: any) =>
      (p.mcqs || []).filter(isTopicMcq)
    );

    const rawMcqs = (existing && Array.isArray(existing.mcqs) && existing.mcqs.length > 0)
      ? existing.mcqs
      : pageMcqs;

    const currentMcqs = rawMcqs.filter(isTopicMcq);
    const topics = [...new Set(currentMcqs.map((q: any) => q.topic).filter(Boolean))] as string[];

    const lesson = {
      id: syncedId,
      classLevel: cleanClassLevel,
      subject: resolvedSubject,
      board: (entry as any).board || existing?.board || null,
      bookName: entry.bookName || existing?.bookName || null,
      lessonTitle: entry.lessonTitle.trim(),
      mcqs: currentMcqs || [],
      mcqCount: (currentMcqs || []).length,
      topics,
      topicCount: topics.length,
      topicNotes: existing?.topicNotes || [],
      createdAt: existing?.createdAt || entry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceClassNotesId: entry.id,
      schoolId: entry.schoolId || null,
    };
    await saveMcqLesson(lesson);
  } catch (e) {
    console.warn('[syncClassNotesMcqsToRevisionHub] non-fatal sync error:', e);
  }
};

interface Props {
  schoolId?: string;
  schoolName?: string;
  isSuperAdmin?: boolean;
  isElite?: boolean;
  onBack?: () => void;
  // If passed from Super Admin dashboard:
  localSettings?: any;
  onUpdateSettings?: (s: any) => void;
  saveLucentEntryDirectly?: (updatedNotes: LucentNoteEntry[], msg: string) => Promise<void>;
}

export const formatSamsungNotesToHtml = (raw: string): string => {
  if (!raw) return "";
  const lines = raw.split("\n");
  const htmlParts: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      continue;
    }

    if (line.startsWith("# ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push(`<h2 class="text-lg font-black text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700">${line.slice(2)}</h2>`);
      continue;
    }

    if (line.startsWith("## ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push(`<h3 class="text-base font-black text-slate-800 dark:text-slate-100 mt-3 mb-1.5">${line.slice(3)}</h3>`);
      continue;
    }

    if (line.startsWith("### ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push(`<h4 class="text-sm font-bold text-slate-700 dark:text-slate-200 mt-2.5 mb-1">${line.slice(4)}</h4>`);
      continue;
    }

    if (line.startsWith("> ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push(`<div class="my-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-semibold leading-relaxed">💡 ${line.slice(2)}</div>`);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        htmlParts.push("<ul class='list-disc pl-5 space-y-1.5 my-2'>");
        inList = true;
      }
      const itemText = line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong class='font-black text-slate-900 dark:text-white'>$1</strong>");
      htmlParts.push(`<li class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${itemText}</li>`);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      const itemText = line.replace(/^\d+\.\s/, "").replace(/\*\*(.*?)\*\*/g, "<strong class='font-black text-slate-900 dark:text-white'>$1</strong>");
      htmlParts.push(`<p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1"><span class="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">${line.match(/^\d+\./)?.[0]}</span>${itemText}</p>`);
      continue;
    }

    if (inList) { htmlParts.push("</ul>"); inList = false; }
    const pText = line.replace(/\*\*(.*?)\*\*/g, "<strong class='font-black text-slate-900 dark:text-white'>$1</strong>");
    htmlParts.push(`<p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1.5">${pText}</p>`);
  }

  if (inList) {
    htmlParts.push("</ul>");
  }

  return htmlParts.join("\n");
};

const CLASS_OPTIONS = [
  { id: "1", label: "Class 1" },
  { id: "2", label: "Class 2" },
  { id: "3", label: "Class 3" },
  { id: "4", label: "Class 4" },
  { id: "5", label: "Class 5" },
  { id: "6", label: "Class 6" },
  { id: "7", label: "Class 7" },
  { id: "8", label: "Class 8" },
  { id: "9", label: "Class 9" },
  { id: "10", label: "Class 10" },
  { id: "11", label: "Class 11" },
  { id: "12", label: "Class 12" },
];

export const DEFAULT_SUBJECTS_BY_CLASS: Record<string, { id: string; name: string }[]> = {
  "1": [
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "evs", name: "EVS / आस-पास" },
    { id: "art", name: "Art & Drawing" },
  ],
  "2": [
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "evs", name: "EVS (पर्यावरण अध्ययन)" },
    { id: "gk", name: "General Knowledge (GK)" },
  ],
  "3": [
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "evs", name: "EVS (पर्यावरण अध्ययन)" },
    { id: "science", name: "General Science" },
  ],
  "4": [
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "evs", name: "EVS / Social Studies" },
    { id: "science", name: "General Science" },
  ],
  "5": [
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "evs", name: "EVS (पर्यावरण अध्ययन)" },
    { id: "sanskrit", name: "Sanskrit / Urdu" },
  ],
  "6": [
    { id: "science", name: "Science (विज्ञान)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "social_science", name: "Social Science (सामाजिक विज्ञान)" },
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "sanskrit", name: "Sanskrit (संस्कृत)" },
  ],
  "7": [
    { id: "science", name: "Science (विज्ञान)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "social_science", name: "Social Science (सामाजिक विज्ञान)" },
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "sanskrit", name: "Sanskrit (संस्कृत)" },
  ],
  "8": [
    { id: "science", name: "Science (विज्ञान)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "social_science", name: "Social Science (सामाजिक विज्ञान)" },
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "sanskrit", name: "Sanskrit (संस्कृत)" },
  ],
  "9": [
    { id: "science", name: "Science (विज्ञान)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "social_science", name: "Social Science (सामाजिक विज्ञान)" },
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "sanskrit", name: "Sanskrit (संस्कृत)" },
    { id: "information_technology", name: "Information Tech (IT)" },
  ],
  "10": [
    { id: "science", name: "Science (विज्ञान)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "social_science", name: "Social Science (सामाजिक विज्ञान)" },
    { id: "hindi", name: "Hindi (हिंदी)" },
    { id: "english", name: "English (अंग्रेजी)" },
    { id: "sanskrit", name: "Sanskrit (संस्कृत)" },
    { id: "physics", name: "Physics (भौतिकी)" },
    { id: "chemistry", name: "Chemistry (रसायन)" },
    { id: "biology", name: "Biology (जीवविज्ञान)" },
    { id: "history", name: "History (इतिहास)" },
    { id: "geography", name: "Geography (भूगोल)" },
    { id: "civics", name: "Civics (नागरिक शास्त्र)" },
    { id: "economics", name: "Economics (अर्थशास्त्र)" },
  ],
  "11": [
    { id: "physics", name: "Physics (भौतिक विज्ञान)" },
    { id: "chemistry", name: "Chemistry (रसायन विज्ञान)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "biology", name: "Biology (जीव विज्ञान)" },
    { id: "english", name: "English Core / Elective" },
    { id: "hindi", name: "Hindi Core / Elective" },
    { id: "accountancy", name: "Accountancy (लेखाशास्त्र)" },
    { id: "business_studies", name: "Business Studies (व्यवसाय अध्ययन)" },
    { id: "economics", name: "Economics (अर्थशास्त्र)" },
    { id: "history", name: "History (इतिहास)" },
    { id: "political_science", name: "Political Science (राजनीति शास्त्र)" },
    { id: "geography", name: "Geography (भूगोल)" },
  ],
  "12": [
    { id: "physics", name: "Physics (भौतिक विज्ञान)" },
    { id: "chemistry", name: "Chemistry (रसायन विज्ञान)" },
    { id: "mathematics", name: "Mathematics (गणित)" },
    { id: "biology", name: "Biology (जीव विज्ञान)" },
    { id: "english", name: "English Core / Elective" },
    { id: "hindi", name: "Hindi Core / Elective" },
    { id: "accountancy", name: "Accountancy (लेखाशास्त्र)" },
    { id: "business_studies", name: "Business Studies (व्यवसाय अध्ययन)" },
    { id: "economics", name: "Economics (अर्थशास्त्र)" },
    { id: "history", name: "History (इतिहास)" },
    { id: "political_science", name: "Political Science (राजनीति शास्त्र)" },
    { id: "geography", name: "Geography (भूगोल)" },
  ],
};

export const ClassCurriculumNotesManager: React.FC<Props> = ({
  schoolId,
  schoolName,
  isSuperAdmin = false,
  isElite = true,
  onBack,
  localSettings,
  onUpdateSettings,
  saveLucentEntryDirectly,
}) => {
  const isSchoolMode = Boolean(schoolId && !isSuperAdmin);

  // Notes state
  const [notesList, setNotesList] = useState<LucentNoteEntry[]>(() => {
    if (isSchoolMode && schoolId) {
      return getLocalSchoolCurriculumNotes(schoolId);
    }
    return localSettings?.lucentNotes || [];
  });

  // Active form state
  const [selectedClass, setSelectedClass] = useState<string>("6");
  const subjectOptions = DEFAULT_SUBJECTS_BY_CLASS[selectedClass] || DEFAULT_SUBJECTS_BY_CLASS["6"];
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectOptions[0]?.id || "science");
  const [board, setBoard] = useState<string>(""); // Only for Super Admin
  const [bookName, setBookName] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [pages, setPages] = useState<LucentNotePage[]>([
    { id: Date.now().toString(), pageNo: "1", content: "", chunkNotes: "", htmlNotes: "", mcqs: [] }
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [previewModeByPage, setPreviewModeByPage] = useState<Record<string, boolean>>({});
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);

  // Filters for history
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [filterBook, setFilterBook] = useState<string>("ALL");

  // Media preview modal
  const [mediaModalEntry, setMediaModalEntry] = useState<LucentNoteEntry | null>(null);

  // Keep subject in sync when class changes
  useEffect(() => {
    const valid = DEFAULT_SUBJECTS_BY_CLASS[selectedClass] || [];
    if (!valid.some(s => s.id === selectedSubject)) {
      setSelectedSubject(valid[0]?.id || "science");
    }
  }, [selectedClass]);

  // Subscribe to real-time school notes when in school mode
  useEffect(() => {
    if (isSchoolMode && schoolId) {
      const unsub = subscribeToSchoolCurriculumNotes(schoolId, (notes) => {
        setNotesList(notes);
      });
      return () => unsub();
    } else if (localSettings?.lucentNotes) {
      setNotesList(localSettings.lucentNotes);
    }
  }, [schoolId, isSchoolMode, localSettings?.lucentNotes]);

  // Reset form helper
  const handleResetForm = () => {
    setEditingId(null);
    setBookName("");
    setBoard("");
    setLessonTitle("");
    setPages([{ id: Date.now().toString(), pageNo: "1", content: "", chunkNotes: "", htmlNotes: "", mcqs: [] }]);
  };

  // Save handler
  const handleSave = async () => {
    if (!lessonTitle.trim()) {
      toast.error("Chapter / Lesson title daalein.");
      return;
    }

    const processedPages = pages.map(p => {
      if (isSchoolMode) {
        const plain = (p.chunkNotes || p.content || "").trim();
        const html = p.htmlNotes?.trim() || formatSamsungNotesToHtml(plain);
        return {
          ...p,
          chunkNotes: plain,
          content: plain,
          htmlNotes: html,
        };
      }
      return p;
    });

    const validPages = processedPages.filter(p =>
      p.pageNo.trim() &&
      (p.chunkNotes?.trim() || p.htmlNotes?.trim() || (p.mcqs && p.mcqs.length > 0) ||
       (p as any).videoUrl?.trim() || (p as any).pdfUrl?.trim() || (p as any).audioUrl?.trim())
    );
    if (validPages.length === 0) {
      toast.error("Kam se kam ek page ke notes, media ya MCQ add karein.");
      return;
    }

    setIsSaving(true);
    const titleTrimmed = lessonTitle.trim();
    const classLabel = CLASS_OPTIONS.find(t => t.id === selectedClass)?.label || `Class ${selectedClass}`;
    const subjLabel = subjectOptions.find(o => o.id === selectedSubject)?.name || selectedSubject;

    try {
      const entryId = editingId || (isSchoolMode ? `sch_${schoolId}_${Date.now()}` : Date.now().toString());
      const nowIso = new Date().toISOString();

      const newEntry: LucentNoteEntry = {
        id: entryId,
        subject: selectedSubject,
        bookName: bookName.trim() || undefined,
        classLevel: selectedClass,
        // Board is ONLY saved if Super Admin set it; School entries have no board lock
        board: isSuperAdmin ? (board || undefined) : undefined,
        lessonTitle: titleTrimmed,
        pages: validPages,
        schoolId: isSchoolMode ? schoolId : undefined,
        schoolName: isSchoolMode ? (schoolName || "School") : undefined,
        createdRole: isSchoolMode ? "SCHOOL_ADMIN" : "SUPERADMIN",
        updatedAt: nowIso,
        createdAt: editingId ? (notesList.find(n => n.id === editingId)?.createdAt || nowIso) : nowIso,
      };

      if (isSchoolMode && schoolId) {
        // Save in school isolated database
        await saveSchoolCurriculumNote(schoolId, newEntry);
        // Also sync MCQs to revision hub
        syncClassNotesMcqsToRevisionHub(newEntry, subjLabel).catch(console.error);

        // Update local list
        setNotesList(prev => {
          const idx = prev.findIndex(n => n.id === entryId);
          return idx >= 0 ? prev.map(n => n.id === entryId ? newEntry : n) : [newEntry, ...prev];
        });
      } else {
        // Super admin mode
        let updated: LucentNoteEntry[];
        if (editingId) {
          updated = (localSettings?.lucentNotes || []).map((n: LucentNoteEntry) => n.id === editingId ? newEntry : n);
        } else {
          updated = [...(localSettings?.lucentNotes || []), newEntry];
        }
        if (saveLucentEntryDirectly) {
          await saveLucentEntryDirectly(updated, `✅ Saved → ${classLabel} — ${titleTrimmed}!`);
        } else {
          await saveLucentEntryDirect(newEntry);
        }
        syncClassNotesMcqsToRevisionHub(newEntry, subjLabel).catch(console.error);
        setNotesList(updated);
      }

      const msg = editingId ? `✏️ Updated: ${classLabel} — ${titleTrimmed}` : `✅ Saved: ${classLabel} — ${titleTrimmed}`;
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(null), 4000);
      handleResetForm();
    } catch (err: any) {
      toast.error(`Save error: ${err?.message || "Failed to save"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async (entry: LucentNoteEntry) => {
    if (confirmDeleteNoteId !== entry.id) {
      setConfirmDeleteNoteId(entry.id);
      return;
    }
    setConfirmDeleteNoteId(null);
    if (editingId === entry.id) setEditingId(null);

    try {
      if (isSchoolMode && schoolId) {
        await deleteSchoolCurriculumNote(schoolId, entry.id);
        setNotesList(prev => prev.filter(n => n.id !== entry.id));
      } else {
        const updated = (localSettings?.lucentNotes || []).filter((n: LucentNoteEntry) => n.id !== entry.id);
        await deleteLucentEntry(entry.id);
        if (saveLucentEntryDirectly) {
          await saveLucentEntryDirectly(updated, `🗑️ "${entry.lessonTitle}" deleted!`);
        }
        setNotesList(updated);
      }
      setSuccessToast(`🗑️ "${entry.lessonTitle}" deleted!`);
      toast.success(`"${entry.lessonTitle}" deleted!`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      toast.error(`Delete error: ${err?.message || "Failed"}`);
    }
  };

  // Filter notes list: In school mode, only show school notes
  const displayedNotes = notesList
    .filter(n => !isSchoolMode || n.schoolId === schoolId)
    .filter(n => filterClass === "ALL" || n.classLevel === filterClass)
    .filter(n => filterSubject === "ALL" || n.subject === filterSubject)
    .filter(n => filterBook === "ALL" || n.bookName === filterBook);

  const uniqueClasses = Array.from(new Set(notesList.filter(n => !isSchoolMode || n.schoolId === schoolId).map(n => n.classLevel).filter(Boolean))).sort();
  const uniqueSubjects = Array.from(new Set(notesList.filter(n => !isSchoolMode || n.schoolId === schoolId).map(n => n.subject).filter(Boolean))).sort();
  const uniqueBooks = Array.from(new Set(notesList.filter(n => !isSchoolMode || n.schoolId === schoolId).map(n => n.bookName).filter(Boolean))).sort();

  // If in school mode and school does NOT have Elite plan, show upgrade wall
  if (isSchoolMode && !isElite) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-right max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          {onBack && (
            <button onClick={onBack} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Crown className="text-amber-500" size={24} />
              Class 1-12 Notes Manager
            </h3>
            <p className="text-xs text-slate-500 font-medium">{schoolName || "School"} Curriculum & Content Desk</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-500/10 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
            <Crown size={32} />
          </div>
          <div className="space-y-1">
            <span className="px-3 py-1 bg-amber-200/80 text-amber-900 rounded-full text-[11px] font-black uppercase tracking-wider">
              👑 Elite School Plan Required
            </span>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Custom School Curriculum &amp; Notes Manager
            </h4>
            <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Apne school ke students ke liye Class 1 se 12 tak ka subject-wise custom notes, Video lectures, Audio studio, PDF books aur MCQs add karne ke liye <strong>School Elite Subscription (2× Price)</strong> activate karein.
            </p>
          </div>

          {/* Pricing Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left pt-2">
            <div className="bg-white border border-amber-200 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Basic Elite</p>
              <p className="text-lg font-black text-slate-800">₹1,999<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">200 Students + Custom Notes</p>
            </div>
            <div className="bg-white border-2 border-amber-400 rounded-2xl p-3.5 shadow-sm relative">
              <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">POPULAR</span>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Standard Elite</p>
              <p className="text-lg font-black text-slate-800">₹3,999<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">500 Students + Custom Notes</p>
            </div>
            <div className="bg-white border border-amber-200 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pro Elite</p>
              <p className="text-lg font-black text-slate-800">₹7,999<span className="text-xs font-normal text-slate-500">/mo</span></p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">2000 Students + Full Elite</p>
            </div>
          </div>

          <div className="bg-white/80 border border-amber-200 rounded-2xl p-4 text-xs text-slate-700 max-w-xl mx-auto text-left space-y-1.5">
            <p className="font-bold text-amber-900">✨ Elite Plan Features:</p>
            <p>• Har school ka apna isolated curriculum data — koi doosra school nahi dekh payega.</p>
            <p>• School students ko direct custom reader milega bina kisi board confusion ke.</p>
            <p>• School teachers aur principal direct live study rooms bana sakenge.</p>
            <p>• <strong>Default Fallback:</strong> Agar school custom notes nahi daalta, to students NSTA Super Admin ka default content padh sakenge.</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Super Admin, I want to upgrade school "${schoolName || 'My School'}" (ID: ${schoolId}) to the Elite Plan (2x Price) to unlock Class 1-12 Custom Notes, MCQ, PDF & Video Manager.`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              👑 Contact Super Admin for Elite Upgrade
            </a>
            {onBack && (
              <button
                onClick={onBack}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer"
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
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-right max-w-5xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-green-100">
        {onBack && (
          <button onClick={onBack} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 cursor-pointer">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-black text-green-800">Class 1-12 Notes Manager</h3>
            {isSchoolMode && (
              <span className="px-2.5 py-0.5 bg-green-100 text-green-800 border border-green-300 rounded-full text-[10px] font-black uppercase">
                🏫 {schoolName || "School"} Custom Curriculum
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {isSchoolMode
              ? `${schoolName || 'School'} curriculum notes — Class 1 se 12 tak ka custom content add karein`
              : "School curriculum notes — Class 1 se 12 tak ka content add karein"}
          </p>
        </div>
        {editingId && (
          <button
            onClick={handleResetForm}
            className="flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-amber-200 cursor-pointer"
          >
            ✕ Cancel Edit
          </button>
        )}
      </div>

      {editingId && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-800 flex items-center gap-2 mb-3">
          <span className="text-base">✏️</span> Edit Mode — changes save karne par purana entry replace ho jayega
        </div>
      )}

      <div className="space-y-4">
        {/* Banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
          <strong>Class Notes Mode:</strong> Class 1 se 12 tak subject-wise, chapter-wise notes yahan add karein. Students ko direct Samsung Notes style clean reader aur calm voiceover milega.
        </div>

        {/* Class + Subject Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">🎓 Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 border border-green-300 rounded-lg text-sm outline-none focus:border-green-500 bg-white font-bold"
            >
              {CLASS_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">📗 Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 bg-white"
            >
              {subjectOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Board Selector: ONLY shown for Super Admin, completely omitted for School ERP */}
        {isSuperAdmin && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">🏫 Board</label>
            <div className="flex gap-2 flex-wrap">
              {([
                ["", "🌐 Sab Boards"],
                ["NCERT_EN", "📘 NCERT English"],
                ["NCERT_HI", "📗 NCERT Hindi"],
                ["BSEB", "🟠 BSEB"]
              ] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBoard(val)}
                  className={`flex-1 py-2 px-2 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                    board === val
                      ? val === ""
                        ? "bg-slate-700 border-slate-700 text-white"
                        : val === "NCERT_EN"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : val === "NCERT_HI"
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "bg-green-600 border-green-600 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 font-bold mt-1">
              ⚠️ Board select karne par sirf us board ke students ko dikhai dega. "Sab Boards" choose karne par sab ko dikhai dega.
            </p>
          </div>
        )}

        {/* Book Name */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">📚 Book Name (Optional)</label>
          <input
            type="text"
            list="class-book-name-list"
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500"
            placeholder="e.g. NCERT, RD Sharma, Lakhmir Singh, School Syllabus..."
          />
          <datalist id="class-book-name-list">
            <option value="NCERT" />
            <option value="RD Sharma" />
            <option value="RS Aggarwal" />
            <option value="Lakhmir Singh" />
            <option value="HC Verma" />
            <option value="School Syllabus" />
          </datalist>
          <p className="text-[10px] text-green-700 mt-1">Khaali chhodne par default class reader mein jayega.</p>
        </div>

        {/* Chapter / Lesson Title */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">📖 Chapter / Lesson Title *</label>
          <input
            type="text"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 font-medium"
            placeholder="e.g. Chapter 1: Cell Structure, Chapter 5: Gravitation..."
          />
        </div>

        {/* Pages Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-500 uppercase">📄 Pages ({pages.length})</label>
            <button
              type="button"
              onClick={() => setPages(prev => [
                ...prev,
                { id: Date.now().toString(), pageNo: String(prev.length + 1), content: "", chunkNotes: "", htmlNotes: "", mcqs: [] }
              ])}
              className="text-[10px] font-black text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 cursor-pointer"
            >
              + Page Add Karein
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {pages.map((pg, pgIdx) => (
              <div key={pg.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 relative">
                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const u = [...pages];
                      u.splice(pgIdx, 1);
                      setPages(u);
                    }}
                    className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 rounded cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Page No.</label>
                    <input
                      type="text"
                      value={pg.pageNo}
                      onChange={(e) => {
                        const u = [...pages];
                        u[pgIdx] = { ...u[pgIdx], pageNo: e.target.value };
                        setPages(u);
                      }}
                      className="w-full p-1.5 border border-slate-200 rounded text-sm outline-none focus:border-green-500"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                    <input
                      type="date"
                      value={pg.date || ""}
                      onChange={(e) => {
                        const u = [...pages];
                        u[pgIdx] = { ...u[pgIdx], date: e.target.value };
                        setPages(u);
                      }}
                      className="w-full p-1.5 border border-slate-200 rounded text-xs outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                {isSchoolMode ? (
                  /* Professional Notebook Editor (Samsung Notes / Gemini Format) - NO RAW HTML */
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1.5">
                        <Sparkles size={13} className="text-emerald-600" />
                        <span>Professional Notebook Notes (Samsung Notes / Gemini Format)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewModeByPage(prev => ({ ...prev, [pg.id]: !prev[pg.id] }))}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition cursor-pointer"
                        >
                          {previewModeByPage[pg.id] ? "✏️ Edit Mode" : "👁️ Live Notebook Preview"}
                        </button>
                      </div>
                    </div>

                    {!previewModeByPage[pg.id] ? (
                      <>
                        {/* Formatting Quick Insert Toolbar */}
                        <div className="flex items-center gap-1.5 flex-wrap pb-1">
                          <span className="text-[9px] font-bold text-slate-400">Quick Insert:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = pg.chunkNotes || "";
                              const u = [...pages];
                              const newText = curr + (curr ? "\n\n" : "") + "# Chapter Title\n";
                              u[pgIdx] = { ...u[pgIdx], chunkNotes: newText, content: newText, htmlNotes: formatSamsungNotesToHtml(newText) };
                              setPages(u);
                            }}
                            className="text-[10px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            + # Title
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = pg.chunkNotes || "";
                              const u = [...pages];
                              const newText = curr + (curr ? "\n\n" : "") + "## Sub Heading\n";
                              u[pgIdx] = { ...u[pgIdx], chunkNotes: newText, content: newText, htmlNotes: formatSamsungNotesToHtml(newText) };
                              setPages(u);
                            }}
                            className="text-[10px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            + ## Subtitle
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = pg.chunkNotes || "";
                              const u = [...pages];
                              const newText = curr + " **Important Word** ";
                              u[pgIdx] = { ...u[pgIdx], chunkNotes: newText, content: newText, htmlNotes: formatSamsungNotesToHtml(newText) };
                              setPages(u);
                            }}
                            className="text-[10px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            **Bold**
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = pg.chunkNotes || "";
                              const u = [...pages];
                              const newText = curr + (curr ? "\n" : "") + "- Key Point 1\n- Key Point 2\n";
                              u[pgIdx] = { ...u[pgIdx], chunkNotes: newText, content: newText, htmlNotes: formatSamsungNotesToHtml(newText) };
                              setPages(u);
                            }}
                            className="text-[10px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            • Bullets
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = pg.chunkNotes || "";
                              const u = [...pages];
                              const newText = curr + (curr ? "\n\n" : "") + "> Important Note: Exam ke liye yeh zaroori hai.\n";
                              u[pgIdx] = { ...u[pgIdx], chunkNotes: newText, content: newText, htmlNotes: formatSamsungNotesToHtml(newText) };
                              setPages(u);
                            }}
                            className="text-[10px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            💡 Note Box
                          </button>
                        </div>

                        <textarea
                          value={pg.chunkNotes || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const u = [...pages];
                            u[pgIdx] = {
                              ...u[pgIdx],
                              chunkNotes: val,
                              content: val,
                              htmlNotes: formatSamsungNotesToHtml(val),
                            };
                            setPages(u);
                          }}
                          className="w-full p-3 border border-emerald-300 rounded-xl text-sm outline-none min-h-[140px] resize-y focus:border-emerald-500 bg-white leading-relaxed text-slate-800 placeholder:text-slate-400 font-sans shadow-inner"
                          placeholder={"Yahan notes likhein ya Gemini / Samsung Notes se copy karke paste karein.\n\n# Cell Structure\nCell sabhi living beings ki basic structural aur functional unit hai.\n\n## Important Types\n* **Prokaryotic Cell**: Bina nucleus ke.\n* **Eukaryotic Cell**: Well-defined nucleus ke saath.\n\n> Note: Mitochondria ko 'Powerhouse of the Cell' kaha jata hai."}
                        />
                        <p className="text-[10px] text-emerald-800 font-medium">
                          ✨ Koi HTML tag likhne ki zaroorat nahi hai. Yeh notes Samsung Notes jaisa clean notebook paper par dikhenge aur calm Text-to-Speech se sunaye jayenge.
                        </p>
                      </>
                    ) : (
                      /* Live Notebook Preview */
                      <div className="bg-white border border-slate-200 rounded-xl p-4 min-h-[120px] shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">
                          Notebook Preview (Student View)
                        </p>
                        {pg.chunkNotes?.trim() ? (
                          <div
                            className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                            dangerouslySetInnerHTML={{ __html: formatSamsungNotesToHtml(pg.chunkNotes) }}
                          />
                        ) : (
                          <p className="text-xs text-slate-400 italic">Abhi koi text nahi likha gaya hai.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Read Mode (TTS) */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <label className="text-[9px] font-black text-amber-700 uppercase block mb-1">
                        📖 Read Mode Notes (TTS ke liye)
                      </label>
                      <textarea
                        value={pg.chunkNotes || ""}
                        onChange={(e) => {
                          const u = [...pages];
                          u[pgIdx] = { ...u[pgIdx], chunkNotes: e.target.value };
                          setPages(u);
                        }}
                        className="w-full p-2 border border-amber-200 rounded text-sm outline-none min-h-[90px] resize-y focus:border-amber-500 bg-white leading-relaxed"
                        placeholder="Plain text notes — students yahan sunenge."
                      />
                    </div>

                    {/* Write Mode (HTML formatted) */}
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5">
                      <label className="text-[9px] font-black text-teal-700 uppercase block mb-1">
                        🎨 Write Mode Notes (HTML formatted)
                      </label>
                      <textarea
                        value={pg.htmlNotes || ""}
                        onChange={(e) => {
                          const u = [...pages];
                          u[pgIdx] = { ...u[pgIdx], htmlNotes: e.target.value };
                          setPages(u);
                        }}
                        className="w-full p-2 border border-teal-200 rounded text-sm outline-none min-h-[110px] resize-y focus:border-teal-500 bg-white font-mono text-xs"
                        placeholder="<h2>Topic</h2><p>HTML formatted notes — bold, tables, colors sab supported hai.</p>"
                      />
                    </div>
                  </>
                )}

                {/* Media Links */}
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 space-y-2">
                  <p className="text-[9px] font-black text-rose-700 uppercase">
                    🎬 Media (Direct App se Upload karein ya Link daalein)
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">
                        ▶ Video (App Upload ya Link)
                      </label>
                      <DirectUploadButton
                        kind="video"
                        compact
                        currentUrl={(pg as any).videoUrl}
                        onUploaded={(url) => {
                          const u = [...pages];
                          u[pgIdx] = { ...u[pgIdx], videoUrl: url } as any;
                          setPages(u);
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">
                        🎵 Audio (App Upload ya Link)
                      </label>
                      <DirectUploadButton
                        kind="audio"
                        compact
                        currentUrl={(pg as any).audioUrl}
                        onUploaded={(url) => {
                          const u = [...pages];
                          u[pgIdx] = { ...u[pgIdx], audioUrl: url } as any;
                          setPages(u);
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">
                        📄 PDF (App Upload ya Link)
                      </label>
                      <DirectUploadButton
                        kind="pdf"
                        compact
                        currentUrl={(pg as any).pdfUrl}
                        onUploaded={(url) => {
                          const u = [...pages];
                          u[pgIdx] = { ...u[pgIdx], pdfUrl: url } as any;
                          setPages(u);
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[8px] text-rose-600">
                    💡 Direct App se Video, Audio ya PDF upload kar sakte hain — ya Google Drive / YouTube link bhi daal sakte hain.
                  </p>
                </div>

                {/* MCQs per page */}
                <div className="border-t border-slate-200 pt-2">
                  <CoachingMcqEditor
                    value={(pg.mcqs || []) as any[]}
                    onChange={(mcqs) => {
                      const updated = [...pages];
                      updated[pgIdx] = { ...updated[pgIdx], mcqs };
                      setPages(updated);
                    }}
                    accent="green"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save / Update Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-md ${
            editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          <Save size={16} />
          {isSaving ? "Saving…" : editingId ? "✏️ Update Class Notes" : "Save Class Notes"}
        </button>

        {/* History of recently added class notes */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          {/* Filters Row */}
          <div className="flex gap-2 mb-3 flex-wrap items-end">
            <div className="flex-1 min-w-[100px]">
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Class</label>
              <select
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setFilterSubject("ALL");
                }}
                className="w-full p-1.5 border border-green-200 rounded-lg text-xs outline-none focus:border-green-500 bg-white font-bold"
              >
                <option value="ALL">All Classes</option>
                {CLASS_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            {uniqueSubjects.length > 0 && (
              <div className="flex-1 min-w-[100px]">
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Subject</label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full p-1.5 border border-green-200 rounded-lg text-xs outline-none focus:border-green-500 bg-white font-bold"
                >
                  <option value="ALL">All Subjects</option>
                  {uniqueSubjects.map((sub: string) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}
            {uniqueBooks.length > 0 && (
              <div className="flex-1 min-w-[100px]">
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">📚 Book</label>
                <select
                  value={filterBook}
                  onChange={(e) => setFilterBook(e.target.value)}
                  className="w-full p-1.5 border border-green-200 rounded-lg text-xs outline-none focus:border-green-500 bg-white"
                >
                  <option value="ALL">All Books</option>
                  {uniqueBooks.map((bk: string) => (
                    <option key={bk} value={bk}>{bk}</option>
                  ))}
                </select>
              </div>
            )}
            {(filterClass !== "ALL" || filterSubject !== "ALL" || filterBook !== "ALL") && (
              <button
                onClick={() => {
                  setFilterClass("ALL");
                  setFilterSubject("ALL");
                  setFilterBook("ALL");
                }}
                className="px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 shrink-0 cursor-pointer"
              >
                ✕ Clear
              </button>
            )}
          </div>

          <p className="text-[10px] font-black text-slate-500 uppercase mb-2">
            {isSchoolMode ? `${schoolName || 'School'} Notes History` : "Class Notes History"} ({displayedNotes.length})
          </p>

          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {displayedNotes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                Koi notes nahi mili is filter se.
              </p>
            ) : (
              displayedNotes.map((entry: LucentNoteEntry) => (
                <div
                  key={entry.id}
                  className={`border rounded-xl p-3 flex items-start justify-between gap-3 ${
                    editingId === entry.id
                      ? "bg-amber-50 border-amber-300"
                      : "bg-green-50 border-green-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-black text-slate-800 truncate">{entry.lessonTitle}</p>
                      {editingId === entry.id && (
                        <span className="text-[9px] font-black bg-amber-400 text-white px-1.5 py-0.5 rounded-full shrink-0">
                          ✏️ Editing
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Class {entry.classLevel} • {entry.subject} {entry.bookName ? `• ${entry.bookName}` : ""} • {entry.pages?.length || 0} page(s)
                      {entry.schoolName ? ` • 🏫 ${entry.schoolName}` : ""}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {(entry as any).updatedAt
                        ? `Updated: ${new Date((entry as any).updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                        : entry.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : ""}
                    </p>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setMediaModalEntry(entry)}
                      className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg cursor-pointer"
                      title="Media (Video/PDF/Audio)"
                    >
                      <Video size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(entry.id);
                        setSelectedClass(entry.classLevel || "6");
                        setSelectedSubject(entry.subject || "science");
                        setBoard((entry as any).board || "");
                        setBookName(entry.bookName || "");
                        setLessonTitle(entry.lessonTitle || "");
                        setPages(
                          entry.pages && entry.pages.length > 0
                            ? entry.pages
                            : [{ id: Date.now().toString(), pageNo: "1", content: "", chunkNotes: "", htmlNotes: "", mcqs: [] }]
                        );
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    {confirmDeleteNoteId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteNoteId(null)}
                          className="px-1.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                        >
                          रद्द
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(entry)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Media Modal */}
      {mediaModalEntry && (
        <AdminLucentMediaModal
          entry={mediaModalEntry}
          initialPageIndex={-1}
          onClose={() => setMediaModalEntry(null)}
          onSaved={(updated) => {
            setNotesList(prev => prev.map(n => n.id === updated.id ? updated : n));
            setMediaModalEntry(null);
          }}
        />
      )}
    </div>
  );
};
