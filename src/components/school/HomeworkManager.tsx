// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen, Plus, Calendar, CheckCircle2, Clock, FileText, Send,
  Share2, Trash2, Edit3, Image as ImageIcon, ChevronLeft, Filter,
  Users, AlertCircle, Sparkles, Check, Paperclip, MessageSquare
} from "lucide-react";
import type {
  School, SchoolClass, SchoolSubject, SchoolTeacher, SchoolStudent,
  DailyHomework, HomeworkSubmission
} from "../../school-types";
import { DirectUploadButton } from "../DirectUploadButton";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";

interface Props {
  school: School;
  classes: SchoolClass[];
  subjects?: SchoolSubject[];
  teachers?: SchoolTeacher[];
  currentRole: "ADMIN" | "TEACHER" | "STUDENT";
  currentStudent?: SchoolStudent;
  currentTeacherId?: string;
  currentTeacherName?: string;
  onBack?: () => void;
}

export const HomeworkManager: React.FC<Props> = ({
  school,
  classes = [],
  subjects = [],
  teachers = [],
  currentRole = "ADMIN",
  currentStudent,
  currentTeacherId,
  currentTeacherName = "Teacher",
  onBack
}) => {
  // Persistence key
  const storageKey = useMemo(() => `nst_school_homework_${school?.id || "default"}`, [school?.id]);
  const subStorageKey = useMemo(() => `nst_school_hw_submissions_${school?.id || "default"}`, [school?.id]);

  // Homework items list
  const [homeworkList, setHomeworkList] = useState<DailyHomework[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "hw-demo-1",
        schoolId: school?.id || "",
        classId: classes[0]?.id || "cls-1",
        className: classes[0]?.name || "Class 10",
        section: "A",
        subjectName: "Mathematics",
        teacherId: currentTeacherId || "tch-1",
        teacherName: currentTeacherName || "Dr. Arvind Swaminathan",
        title: "Exercise 4.2 - Quadratic Equations (Q1 to Q7)",
        description: "Solve all sub-parts of Question 1 to 7 in fair notebook. Remember to write step-by-step factorization.",
        assignedDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        status: "active",
        createdAt: new Date().toISOString()
      },
      {
        id: "hw-demo-2",
        schoolId: school?.id || "",
        classId: classes[0]?.id || "cls-1",
        className: classes[0]?.name || "Class 10",
        section: "A",
        subjectName: "Science (Physics)",
        teacherId: currentTeacherId || "tch-2",
        teacherName: "Faculty Science",
        title: "Ray Diagrams of Concave Mirrors",
        description: "Draw the 6 ray diagrams showing image formation for different object positions. Label Pole, Focus and Center of Curvature.",
        assignedDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        status: "active",
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Student Submissions list
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(subStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(homeworkList));
    } catch {}
  }, [homeworkList, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(subStorageKey, JSON.stringify(submissions));
    } catch {}
  }, [submissions, subStorageKey]);

  // Filters
  const initialClass = currentStudent?.classId || (classes[0]?.id || "ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(initialClass);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [showAddForm, setShowAddForm] = useState(false);

  // New Homework Form State
  const [formClassId, setFormClassId] = useState(classes[0]?.id || "");
  const [formSubjectName, setFormSubjectName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");

  // Student submission state
  const [submittingHwId, setSubmittingHwId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFileUrl, setSubmissionFileUrl] = useState("");

  // Filtered Homework list
  const filteredHomework = useMemo(() => {
    return homeworkList.filter(item => {
      if (currentRole === "STUDENT" && currentStudent) {
        if (currentStudent.classId && item.classId !== currentStudent.classId) return false;
      } else if (selectedClassFilter !== "ALL" && item.classId !== selectedClassFilter) {
        return false;
      }
      if (selectedSubjectFilter !== "ALL" && item.subjectName !== selectedSubjectFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [homeworkList, currentRole, currentStudent, selectedClassFilter, selectedSubjectFilter]);

  // Add Homework Handler
  const handleCreateHomework = () => {
    if (!formTitle.trim() || !formClassId) {
      alert("Kripya Class aur Homework Title enter karein.");
      return;
    }

    const cls = classes.find(c => c.id === formClassId) || classes[0];
    const newHw: DailyHomework = {
      id: `hw-${Date.now()}`,
      schoolId: school.id,
      classId: cls.id,
      className: cls.name,
      section: cls.section || "A",
      subjectName: formSubjectName.trim() || "General Studies",
      teacherId: currentTeacherId || "admin",
      teacherName: currentTeacherName,
      title: formTitle.trim(),
      description: formDescription.trim(),
      assignedDate: new Date().toISOString().split("T")[0],
      dueDate: formDueDate,
      attachmentUrl: formAttachmentUrl || undefined,
      status: "active",
      createdAt: new Date().toISOString()
    };

    setHomeworkList(prev => [newHw, ...prev]);
    setShowAddForm(false);
    setFormTitle("");
    setFormDescription("");
    setFormAttachmentUrl("");

    // Broadcast instant homework notification to all students in the class
    void sendSchoolPushNotification({
      schoolId: school.id,
      classId: cls.id,
      title: `📚 ${school.name || "School"} • ${cls.name} Homework`,
      body: `नया गृहकार्य (Homework): ${newHw.subjectName} — "${newHw.title}". जमा करने की अंतिम तिथि: ${newHw.dueDate || "कल"}।`,
      type: "HOMEWORK",
      url: `/?schoolPortal=1&classId=${cls.id}&schoolTab=homework`,
      urgent: true,
    });
  };

  // Delete Homework
  const handleDeleteHomework = (id: string) => {
    if (window.confirm("Kya aap sach me yeh homework delete karna chahte hain?")) {
      setHomeworkList(prev => prev.filter(h => h.id !== id));
    }
  };

  // Submit Homework by Student
  const handleSubmitWork = (hwId: string) => {
    if (!submissionText.trim() && !submissionFileUrl) {
      alert("Kripya thoda vivran ya notebook photo upload karein.");
      return;
    }

    const newSub: HomeworkSubmission = {
      id: `sub-${Date.now()}`,
      homeworkId: hwId,
      schoolId: school.id,
      studentId: currentStudent?.id || "std-me",
      studentName: currentStudent?.name || "Student",
      rollNo: currentStudent?.rollNo || "",
      submittedAt: new Date().toISOString(),
      text: submissionText.trim(),
      fileUrl: submissionFileUrl || undefined,
      status: "submitted"
    };

    setSubmissions(prev => [newSub, ...prev.filter(s => !(s.homeworkId === hwId && s.studentId === newSub.studentId))]);
    setSubmittingHwId(null);
    setSubmissionText("");
    setSubmissionFileUrl("");
    alert("🎉 Homework successfully submit ho gaya!");
  };

  // Share Homework on WhatsApp
  const handleShareWhatsApp = (hw: DailyHomework) => {
    const text = `📚 *${school?.name || "School"} — Daily Homework*\n\n` +
      `📅 *Date:* ${hw.assignedDate} | *Due:* ${hw.dueDate}\n` +
      `🏫 *Class:* ${hw.className} ${hw.section ? `(${hw.section})` : ""}\n` +
      `📖 *Subject:* ${hw.subjectName}\n` +
      `✍️ *Teacher:* ${hw.teacherName}\n\n` +
      `📌 *Topic:* ${hw.title}\n` +
      `📝 *Details:* ${hw.description}\n` +
      (hw.attachmentUrl ? `📎 *Attachment:* ${hw.attachmentUrl}\n` : "") +
      `\nKripya sabhi chhatra apna homework samay par poora karein.`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-4 py-4 sm:py-6 shadow-md border-b border-purple-800/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-black uppercase tracking-wider border border-purple-400/30">
                  Daily Classwork & Homework
                </span>
                <span className="text-slate-300 text-xs font-semibold">
                  {currentRole === "STUDENT" ? "My Notebook Diary" : "Teacher Assignment Portal"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-400" />
                <span>Daily Homework & Class Diary (गृहकार्य एवं डायरी)</span>
              </h1>
            </div>
          </div>

          {(currentRole === "ADMIN" || currentRole === "TEACHER") && (
            <button
              type="button"
              onClick={() => setShowAddForm(p => !p)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Post New Homework</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        {/* ADD HOMEWORK FORM (ADMIN / TEACHER) */}
        {showAddForm && (currentRole === "ADMIN" || currentRole === "TEACHER") && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border-2 border-purple-500/30 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-600" />
                <span>Assign New Homework (नया गृहकार्य डालें)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Target Class *
                </label>
                <select
                  value={formClassId}
                  onChange={e => setFormClassId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Subject (विषय) *
                </label>
                <input
                  type="text"
                  value={formSubjectName}
                  onChange={e => setFormSubjectName(e.target.value)}
                  placeholder="e.g. Mathematics, Hindi, Science"
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Due Date (जमा करने की तिथि) *
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={e => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Homework Title / Chapter (शीर्षक) *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Chapter 5: Periodic Classification - Questions 1 to 5"
                className="w-full px-3 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Detailed Instructions & Notes (विवरण व निर्देश)
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="e.g. Read textbook pages 45-48. Write chemical reactions cleanly in fair notebook. Draw chart for Mendeléev's table."
                className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs text-slate-800 dark:text-white"
              />
            </div>

            {/* Direct Image / Worksheet Upload */}
            <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Worksheet / Question Image (Optional)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Upload questions photo or board work
                  </p>
                </div>
              </div>

              <DirectUploadButton
                kind="image"
                compact
                currentUrl={formAttachmentUrl}
                onUploaded={(url) => setFormAttachmentUrl(url)}
                onClear={() => setFormAttachmentUrl("")}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCreateHomework}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Publish Homework to Class
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        {currentRole !== "STUDENT" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Filter Class:</span>
              <button
                type="button"
                onClick={() => setSelectedClassFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedClassFilter === "ALL"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                All Classes
              </button>
              {classes.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClassFilter(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedClassFilter === c.id
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-bold">
              {filteredHomework.length} Assignments
            </span>
          </div>
        )}

        {/* HOMEWORK LIST */}
        {filteredHomework.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="font-bold text-base text-slate-800 dark:text-white">
              Koi Homework nahi hai
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {currentRole === "STUDENT"
                ? "Aapki class ke liye abhi koi pending homework nahi hai. Mauj karein!"
                : "Upar diye '+ Post New Homework' button se class ke liye homework assign karein."}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredHomework.map((hw) => {
              const mySub = submissions.find(
                s => s.homeworkId === hw.id && (currentStudent ? s.studentId === currentStudent.id : true)
              );
              const isOverdue = new Date(hw.dueDate) < new Date(new Date().toISOString().split("T")[0]);

              return (
                <div
                  key={hw.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition space-y-3"
                >
                  {/* Top Badge Strip */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-black border border-purple-200 dark:border-purple-800">
                        {hw.className} {hw.section ? `(${hw.section})` : ""}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-black">
                        {hw.subjectName}
                      </span>
                      {mySub ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-black">
                          <CheckCircle2 className="w-3 h-3" /> Submitted
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black">
                          Past Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" />
                      <span>Due: <strong className="text-slate-700 dark:text-slate-200">{hw.dueDate}</strong></span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {hw.title}
                    </h4>
                    {hw.description && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed">
                        {hw.description}
                      </p>
                    )}
                  </div>

                  {/* Attachment Preview */}
                  {hw.attachmentUrl && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-600 overflow-hidden shrink-0">
                        <img src={hw.attachmentUrl} alt="Homework Attachment" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">Worksheet / Reference Image</p>
                        <a
                          href={hw.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          View Full Screen →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Footer Action Strip */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-400 font-medium">
                      Assigned by: <strong className="text-slate-600 dark:text-slate-300">{hw.teacherName}</strong>
                    </p>

                    <div className="flex items-center gap-2">
                      {/* WhatsApp share */}
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(hw)}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Share on WhatsApp Class Group"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp Group</span>
                      </button>

                      {/* Student Submit Work button */}
                      {currentRole === "STUDENT" && !mySub && (
                        <button
                          type="button"
                          onClick={() => setSubmittingHwId(submittingHwId === hw.id ? null : hw.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          Submit Notebook Work
                        </button>
                      )}

                      {/* Admin / Teacher delete */}
                      {(currentRole === "ADMIN" || currentRole === "TEACHER") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteHomework(hw.id)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete Homework"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Student Submission Box */}
                  {submittingHwId === hw.id && (
                    <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-3 animate-in fade-in">
                      <h5 className="font-black text-xs text-purple-900 dark:text-purple-300 uppercase">
                        Upload Your Fair Notebook Work
                      </h5>
                      <textarea
                        rows={2}
                        value={submissionText}
                        onChange={e => setSubmissionText(e.target.value)}
                        placeholder="Write remarks or answers here (e.g. Done in copy, all 7 questions completed)..."
                        className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs"
                      />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <DirectUploadButton
                          kind="image"
                          compact
                          currentUrl={submissionFileUrl}
                          onUploaded={(url) => setSubmissionFileUrl(url)}
                          onClear={() => setSubmissionFileUrl("")}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSubmitWork(hw.id)}
                            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-black shadow transition active:scale-95 cursor-pointer"
                          >
                            Confirm Submit
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubmittingHwId(null)}
                            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
