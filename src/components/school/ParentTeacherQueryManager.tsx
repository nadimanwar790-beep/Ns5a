// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare, Send, CheckCircle2, Clock, AlertCircle, Plus,
  Search, Filter, ChevronLeft, User, Users, Shield, MessageCircle,
  FileText, CornerDownRight, Check
} from "lucide-react";
import type {
  School, SchoolStudent, SchoolTeacher, SchoolClass,
  ParentTeacherQuery, QueryReply
} from "../../school-types";

interface Props {
  school: School;
  students?: SchoolStudent[];
  teachers?: SchoolTeacher[];
  classes?: SchoolClass[];
  currentUserRole?: "ADMIN" | "TEACHER" | "STUDENT";
  currentStudent?: SchoolStudent;
  currentUserName?: string;
  currentUserId?: string;
  onBack?: () => void;
}

const CATEGORIES = [
  { id: "academic", label: "Academic / Studies (पढ़ाई व मार्क्स)" },
  { id: "fee", label: "Fee & Billing (फीस व रसीद)" },
  { id: "leave", label: "Leave Application (छुट्टी का आवेदन)" },
  { id: "transport", label: "Bus & Transport (बस व वैन रूट)" },
  { id: "general", label: "General Feedback (सुझाव व पूछताछ)" }
];

export const ParentTeacherQueryManager: React.FC<Props> = ({
  school,
  students = [],
  teachers = [],
  classes = [],
  currentUserRole = "ADMIN",
  currentStudent,
  currentUserName = "User",
  currentUserId = "user-1",
  onBack
}) => {
  const storageKey = useMemo(() => `nst_school_pt_queries_${school?.id || "default"}`, [school?.id]);

  const [queries, setQueries] = useState<ParentTeacherQuery[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "query-1",
        schoolId: school?.id || "",
        studentId: students[0]?.id || "std-1",
        studentName: students[0]?.name || "Aarav Kumar",
        rollNo: "01",
        className: "Class 10 - Section A",
        category: "leave",
        subject: "Medical Leave Application (2 Days)",
        message: "Respected Class Teacher, Aarav has been diagnosed with viral fever. Doctor advised 2 days bed rest. Kindly grant medical leave for 4th and 5th March 2026. Medical certificate attached.",
        status: "resolved",
        createdAt: "2026-03-02T09:30:00.000Z",
        updatedAt: "2026-03-02T11:15:00.000Z",
        replies: [
          {
            id: "rep-1",
            senderId: "tch-1",
            senderName: "Dr. Arvind Swaminathan (Class Teacher)",
            senderRole: "TEACHER",
            message: "Dear Parent, Leave application has been approved. Please take care of Aarav's health. He can collect missed notes from his classmates upon return.",
            timestamp: "2026-03-02T11:15:00.000Z"
          }
        ]
      },
      {
        id: "query-2",
        schoolId: school?.id || "",
        studentId: students[1]?.id || "std-2",
        studentName: students[1]?.name || "Priya Sharma",
        rollNo: "02",
        className: "Class 10 - Section A",
        category: "academic",
        subject: "Doubt in Mathematics Trigonometry Chapter",
        message: "Hello Sir, Priya is having trouble understanding height and distance formula applications. Could you please give 10 minutes extra time during zero period tomorrow?",
        status: "open",
        createdAt: "2026-03-03T14:20:00.000Z",
        updatedAt: "2026-03-03T14:20:00.000Z",
        replies: []
      }
    ];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(queries));
    } catch {}
  }, [queries, storageKey]);

  // Selected Query View / Thread
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(queries[0]?.id || null);
  const [replyInput, setReplyInput] = useState("");
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"ALL" | "open" | "in_progress" | "resolved">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // New Query Form State
  const [newCategory, setNewCategory] = useState<ParentTeacherQuery["category"]>("academic");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newSelectedStudentId, setNewSelectedStudentId] = useState(currentStudent?.id || students[0]?.id || "");

  // Active query object
  const activeQuery = useMemo(() => queries.find(q => q.id === selectedQueryId) || null, [queries, selectedQueryId]);

  // Filtered queries list
  const filteredQueries = useMemo(() => {
    return queries.filter(q => {
      if (currentUserRole === "STUDENT" && currentStudent) {
        if (q.studentId !== currentStudent.id) return false;
      }
      if (statusFilter !== "ALL" && q.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && q.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.subject.toLowerCase().includes(query) ||
          q.studentName.toLowerCase().includes(query) ||
          q.message.toLowerCase().includes(query)
        );
      }
      return true;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [queries, currentUserRole, currentStudent, statusFilter, categoryFilter, searchQuery]);

  // Send Reply
  const handleSendReply = () => {
    if (!replyInput.trim() || !activeQuery) return;

    const newReply: QueryReply = {
      id: `rep-${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole === "ADMIN" ? "ADMIN" : currentUserRole === "TEACHER" ? "TEACHER" : "PARENT",
      message: replyInput.trim(),
      timestamp: new Date().toISOString()
    };

    setQueries(prev => prev.map(q => {
      if (q.id === activeQuery.id) {
        return {
          ...q,
          replies: [...q.replies, newReply],
          updatedAt: new Date().toISOString(),
          status: q.status === "open" && currentUserRole !== "STUDENT" ? "in_progress" : q.status
        };
      }
      return q;
    }));

    setReplyInput("");
  };

  // Change Query Status
  const handleUpdateStatus = (queryId: string, status: ParentTeacherQuery["status"]) => {
    setQueries(prev => prev.map(q => q.id === queryId ? { ...q, status, updatedAt: new Date().toISOString() } : q));
  };

  // Submit New Query
  const handleCreateQuery = () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      alert("Kripya Subject aur Message enter karein.");
      return;
    }

    let stdName = currentStudent?.name || "Student";
    let stdRoll = currentStudent?.rollNo || "";
    let stdClass = "Class 10";

    if (currentUserRole !== "STUDENT") {
      const foundStd = students.find(s => s.id === newSelectedStudentId);
      if (foundStd) {
        stdName = foundStd.name;
        stdRoll = foundStd.rollNo || "";
        const c = classes.find(cls => cls.id === foundStd.classId);
        stdClass = c?.name || "Class";
      }
    } else if (currentStudent) {
      const c = classes.find(cls => cls.id === currentStudent.classId);
      stdClass = c?.name || "Class";
    }

    const created: ParentTeacherQuery = {
      id: `query-${Date.now()}`,
      schoolId: school.id,
      studentId: currentStudent?.id || newSelectedStudentId || "std-1",
      studentName: stdName,
      rollNo: stdRoll,
      className: stdClass,
      category: newCategory,
      subject: newSubject.trim(),
      message: newMessage.trim(),
      status: "open",
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setQueries(prev => [created, ...prev]);
    setSelectedQueryId(created.id);
    setShowNewQueryModal(false);
    setNewSubject("");
    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-4 sm:py-6 shadow-md border-b border-indigo-800/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
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
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[11px] font-black uppercase tracking-wider border border-blue-400/30">
                  Two-Way Communication
                </span>
                <span className="text-slate-300 text-xs font-semibold">
                  School Helpdesk & Leave Portal
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-400" />
                <span>Parent-Teacher Query & Helpdesk (संवाद व आवेदन)</span>
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNewQueryModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Query / Leave Application</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Filter Strip */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by student, subject, query..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "ALL" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("open")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "open" ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "in_progress" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === "resolved" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* 2-Column Split: Query List & Conversation Thread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Queries List */}
          <div className="lg:col-span-5 space-y-2.5">
            {filteredQueries.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Koi Query nahi mili</p>
                <p className="text-xs text-slate-400 mt-0.5">Upar diye button se nayi query post karein.</p>
              </div>
            ) : (
              filteredQueries.map((q) => {
                const isSelected = q.id === selectedQueryId;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQueryId(q.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-1 ring-blue-500/30"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {q.category.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        q.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : q.status === "in_progress"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}>
                        {q.status === "resolved" ? "✓ Resolved" : q.status === "in_progress" ? "In Progress" : "Open"}
                      </span>
                    </div>

                    <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-1">
                      {q.subject}
                    </h4>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {q.message}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{q.studentName} ({q.className})</span>
                      <span>{q.replies.length} replies</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Active Thread & Conversation */}
          <div className="lg:col-span-7">
            {activeQuery ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs p-5 sm:p-6 space-y-4">
                {/* Thread Header */}
                <div className="pb-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {activeQuery.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(activeQuery.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white mt-1.5 leading-snug">
                      {activeQuery.subject}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      Student: <strong className="text-slate-800 dark:text-slate-200">{activeQuery.studentName}</strong> • {activeQuery.className} {activeQuery.rollNo ? `(Roll #${activeQuery.rollNo})` : ""}
                    </p>
                  </div>

                  {/* Status Toggle (Admin/Teacher) */}
                  {(currentUserRole === "ADMIN" || currentUserRole === "TEACHER") && (
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/60 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeQuery.id, "open")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          activeQuery.status === "open" ? "bg-amber-500 text-white shadow-xs" : "text-slate-500"
                        }`}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeQuery.id, "in_progress")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          activeQuery.status === "in_progress" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500"
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeQuery.id, "resolved")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          activeQuery.status === "resolved" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500"
                        }`}
                      >
                        Resolved
                      </button>
                    </div>
                  )}
                </div>

                {/* Initial Query Body */}
                <div className="p-4 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {activeQuery.studentName} (Parent / Student Note)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {activeQuery.message}
                  </p>
                </div>

                {/* Reply Messages Thread */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">
                    Replies & Discussion ({activeQuery.replies.length})
                  </h4>

                  {activeQuery.replies.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center">
                      Abhi koi reply nahi aaya hai. Neeche box me apna jawab type karein.
                    </p>
                  ) : (
                    activeQuery.replies.map((rep) => {
                      const isOfficial = rep.senderRole === "ADMIN" || rep.senderRole === "TEACHER";
                      return (
                        <div
                          key={rep.id}
                          className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                            isOfficial
                              ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 ml-3"
                              : "bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 mr-3"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {isOfficial ? <Shield className="w-3.5 h-3.5 text-blue-600" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
                              <strong className={isOfficial ? "text-blue-900 dark:text-blue-200 font-black" : "text-slate-800 dark:text-slate-200 font-black"}>
                                {rep.senderName}
                              </strong>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-slate-500 font-bold">
                                {rep.senderRole}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(rep.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{rep.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply Input Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  <input
                    type="text"
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendReply()}
                    placeholder="Type official reply or parent note..."
                    className="flex-1 px-4 py-2.5 border rounded-2xl dark:border-slate-600 dark:bg-slate-700 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={handleSendReply}
                    className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400 text-sm">
                Select a query from the left to view the thread.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NEW QUERY / LEAVE APPLICATION MODAL ── */}
      {showNewQueryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>Submit Query or Leave Application (नया संवाद / प्रार्थना-पत्र)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewQueryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Select student if Admin or Teacher */}
            {currentUserRole !== "STUDENT" && students.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  On Behalf of Student (छात्र का चयन) *
                </label>
                <select
                  value={newSelectedStudentId}
                  onChange={e => setNewSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Roll #{s.rollNo || "—"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Category (श्रेणी) *
              </label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Subject / Title (विषय) *
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="e.g. Leave for Family Function, Fee receipt query"
                className="w-full px-3 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Message & Details (पूरा विवरण) *
              </label>
              <textarea
                rows={4}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Apna sandesh ya prarthana patra yahan likhein..."
                className="w-full px-3 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCreateQuery}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Submit Query
              </button>
              <button
                type="button"
                onClick={() => setShowNewQueryModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
