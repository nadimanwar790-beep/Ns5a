// @ts-nocheck
import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  User,
  Calendar,
  MessageSquare,
  Share2,
  Printer,
  X,
  Layers,
  ChevronRight,
  Flame,
  Award
} from "lucide-react";
import type { School, SchoolClass, SubjectSyllabusPacing, SyllabusChapter } from "../../school-types";

interface Props {
  school: School;
  classes?: SchoolClass[];
  onBack?: () => void;
}

const DEFAULT_PACING_DATA: SubjectSyllabusPacing[] = [
  {
    id: "pace_c10_sci",
    schoolId: "demo_school",
    classId: "cls_10",
    className: "Class 10",
    subject: "Science (Physics, Chemistry, Biology)",
    teacherName: "Mr. Rakesh Sharma",
    totalChapters: 16,
    targetCompletionDate: "2027-01-15",
    pacingStatus: "LAGGING",
    backlogChaptersCount: 2,
    updatedAt: "2026-11-10",
    chapters: [
      { chapterNo: 1, title: "Chemical Reactions and Equations", targetMonth: "April", status: "COMPLETED", completedDate: "2026-04-25" },
      { chapterNo: 2, title: "Acids, Bases and Salts", targetMonth: "May", status: "COMPLETED", completedDate: "2026-05-20" },
      { chapterNo: 3, title: "Metals and Non-metals", targetMonth: "July", status: "COMPLETED", completedDate: "2026-07-28" },
      { chapterNo: 4, title: "Carbon and its Compounds", targetMonth: "August", status: "COMPLETED", completedDate: "2026-08-30" },
      { chapterNo: 5, title: "Life Processes (Nutrition & Respiration)", targetMonth: "September", status: "COMPLETED", completedDate: "2026-09-24" },
      { chapterNo: 6, title: "Control and Coordination", targetMonth: "October", status: "COMPLETED", completedDate: "2026-10-22" },
      { chapterNo: 7, title: "How do Organisms Reproduce?", targetMonth: "October", status: "IN_PROGRESS" },
      { chapterNo: 8, title: "Heredity and Evolution", targetMonth: "November", status: "PENDING" },
      { chapterNo: 9, title: "Light – Reflection and Refraction", targetMonth: "November", status: "PENDING" },
      { chapterNo: 10, title: "The Human Eye and the Colourful World", targetMonth: "December", status: "PENDING" },
      { chapterNo: 11, title: "Electricity", targetMonth: "December", status: "PENDING" },
      { chapterNo: 12, title: "Magnetic Effects of Electric Current", targetMonth: "January", status: "PENDING" },
      { chapterNo: 13, title: "Our Environment", targetMonth: "January", status: "PENDING" },
      { chapterNo: 14, title: "Sources of Energy & Sustainable Management", targetMonth: "January", status: "PENDING" },
      { chapterNo: 15, title: "Sample Paper 1 & Practical Revision", targetMonth: "February", status: "PENDING" },
      { chapterNo: 16, title: "Final Board Pre-Exam Marathon Mock Test", targetMonth: "February", status: "PENDING" },
    ],
  },
  {
    id: "pace_c10_math",
    schoolId: "demo_school",
    classId: "cls_10",
    className: "Class 10",
    subject: "Mathematics (Standard & Basic)",
    teacherName: "Mrs. Anjali Mishra",
    totalChapters: 15,
    targetCompletionDate: "2027-01-20",
    pacingStatus: "ON_TRACK",
    backlogChaptersCount: 0,
    updatedAt: "2026-11-09",
    chapters: [
      { chapterNo: 1, title: "Real Numbers", targetMonth: "April", status: "COMPLETED", completedDate: "2026-04-22" },
      { chapterNo: 2, title: "Polynomials", targetMonth: "May", status: "COMPLETED", completedDate: "2026-05-18" },
      { chapterNo: 3, title: "Pair of Linear Equations in Two Variables", targetMonth: "July", status: "COMPLETED", completedDate: "2026-07-25" },
      { chapterNo: 4, title: "Quadratic Equations", targetMonth: "August", status: "COMPLETED", completedDate: "2026-08-28" },
      { chapterNo: 5, title: "Arithmetic Progressions (AP)", targetMonth: "September", status: "COMPLETED", completedDate: "2026-09-22" },
      { chapterNo: 6, title: "Triangles (Theorems & Proofs)", targetMonth: "October", status: "COMPLETED", completedDate: "2026-10-18" },
      { chapterNo: 7, title: "Coordinate Geometry", targetMonth: "October", status: "COMPLETED", completedDate: "2026-10-30" },
      { chapterNo: 8, title: "Introduction to Trigonometry", targetMonth: "November", status: "IN_PROGRESS" },
      { chapterNo: 9, title: "Some Applications of Trigonometry", targetMonth: "November", status: "PENDING" },
      { chapterNo: 10, title: "Circles", targetMonth: "December", status: "PENDING" },
      { chapterNo: 11, title: "Areas Related to Circles", targetMonth: "December", status: "PENDING" },
      { chapterNo: 12, title: "Surface Areas and Volumes", targetMonth: "January", status: "PENDING" },
      { chapterNo: 13, title: "Statistics", targetMonth: "January", status: "PENDING" },
      { chapterNo: 14, title: "Probability", targetMonth: "January", status: "PENDING" },
      { chapterNo: 15, title: "Full Syllabus Speed & Accuracy Mock Drill", targetMonth: "February", status: "PENDING" },
    ],
  },
  {
    id: "pace_c9_eng",
    schoolId: "demo_school",
    classId: "cls_9",
    className: "Class 9",
    subject: "English Language & Literature",
    teacherName: "Mr. David George",
    totalChapters: 12,
    targetCompletionDate: "2027-01-30",
    pacingStatus: "CRITICAL_DELAY",
    backlogChaptersCount: 3,
    updatedAt: "2026-11-08",
    chapters: [
      { chapterNo: 1, title: "The Fun They Had & The Road Not Taken", targetMonth: "April", status: "COMPLETED", completedDate: "2026-04-20" },
      { chapterNo: 2, title: "The Sound of Music & Wind", targetMonth: "May", status: "COMPLETED", completedDate: "2026-05-15" },
      { chapterNo: 3, title: "The Little Girl & Rain on the Roof", targetMonth: "July", status: "COMPLETED", completedDate: "2026-07-22" },
      { chapterNo: 4, title: "A Truly Beautiful Mind & The Lake Isle", targetMonth: "August", status: "COMPLETED", completedDate: "2026-08-25" },
      { chapterNo: 5, title: "The Snake and the Mirror & A Legend", targetMonth: "September", status: "IN_PROGRESS" },
      { chapterNo: 6, title: "My Childhood & No Men Are Foreign", targetMonth: "October", status: "PENDING" },
      { chapterNo: 7, title: "Reach for the Top & On Killing a Tree", targetMonth: "November", status: "PENDING" },
      { chapterNo: 8, title: "Kathmandu & A Slumber Did My Spirit Seal", targetMonth: "November", status: "PENDING" },
      { chapterNo: 9, title: "If I Were You (Play)", targetMonth: "December", status: "PENDING" },
      { chapterNo: 10, title: "Moments: Supplementary Stories (1-5)", targetMonth: "December", status: "PENDING" },
      { chapterNo: 11, title: "Moments: Supplementary Stories (6-10)", targetMonth: "January", status: "PENDING" },
      { chapterNo: 12, title: "Formal Letters, Story Writing & Grammar Drill", targetMonth: "January", status: "PENDING" },
    ],
  },
];

export const SyllabusPacingTracker: React.FC<Props> = ({
  school,
  classes = [],
  onBack,
}) => {
  const isDemo = Boolean(school?.id && (school.id === "demo_school" || school.id.startsWith("demo_")));

  const [pacingList, setPacingList] = useState<SubjectSyllabusPacing[]>(() => {
    try {
      const saved = localStorage.getItem(`syllabus_pacing_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return isDemo ? DEFAULT_PACING_DATA : [];
  });

  const [selectedPacingId, setSelectedPacingId] = useState<string>(pacingList[0]?.id || "");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ON_TRACK" | "LAGGING" | "CRITICAL_DELAY">("ALL");

  const activePacing = pacingList.find((p) => p.id === selectedPacingId) || pacingList[0];

  const savePacingList = (updated: SubjectSyllabusPacing[]) => {
    setPacingList(updated);
    try {
      localStorage.setItem(`syllabus_pacing_${school?.id || "demo"}`, JSON.stringify(updated));
    } catch {}
  };

  const handleToggleChapterStatus = (pacingId: string, chapterNo: number) => {
    const updated = pacingList.map((p) => {
      if (p.id !== pacingId) return p;

      const newChapters = p.chapters.map((ch) => {
        if (ch.chapterNo !== chapterNo) return ch;
        const nextStatus = ch.status === "PENDING" ? "IN_PROGRESS" : ch.status === "IN_PROGRESS" ? "COMPLETED" : "PENDING";
        return {
          ...ch,
          status: nextStatus,
          completedDate: nextStatus === "COMPLETED" ? new Date().toISOString().split("T")[0] : undefined,
        };
      });

      const completedCount = newChapters.filter((c) => c.status === "COMPLETED").length;
      const expectedSoFar = 9; // By November, ~9-10 chapters expected
      const diff = expectedSoFar - completedCount;

      let newStatus: "ON_TRACK" | "LAGGING" | "CRITICAL_DELAY" | "COMPLETED" = "ON_TRACK";
      if (completedCount === p.totalChapters) newStatus = "COMPLETED";
      else if (diff >= 3) newStatus = "CRITICAL_DELAY";
      else if (diff > 0) newStatus = "LAGGING";

      return {
        ...p,
        chapters: newChapters,
        pacingStatus: newStatus,
        backlogChaptersCount: Math.max(0, diff),
        updatedAt: new Date().toISOString().split("T")[0],
      };
    });

    savePacingList(updated);
  };

  const completedChapters = activePacing?.chapters.filter((c) => c.status === "COMPLETED").length || 0;
  const inProgressChapters = activePacing?.chapters.filter((c) => c.status === "IN_PROGRESS").length || 0;
  const pendingChapters = activePacing?.chapters.filter((c) => c.status === "PENDING").length || 0;
  const completionPercentage = Math.round((completedChapters / (activePacing?.totalChapters || 1)) * 100);

  const filteredList = pacingList.filter((p) => {
    if (filterStatus === "ALL") return true;
    return p.pacingStatus === filterStatus;
  });

  const handleSendPacingNotice = (pacing: SubjectSyllabusPacing) => {
    const msg = `⚠️ *NSTA SYLLABUS PACING NOTICE*\nRespected ${pacing.teacherName},\nRegarding: ${pacing.className} ${pacing.subject}\nCurrently completed: ${completedChapters}/${pacing.totalChapters} chapters (${completionPercentage}%).\nExpected completion deadline is ${pacing.targetCompletionDate}.\nPlease expedite the pending chapters or schedule an extra class.\n- Principal, ${school?.name || "School"}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Syllabus Pacing &amp; Academic Progress Tracker
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Principal Academic HUD
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Subject chapter completion velocity, target deadline tracking &amp; backlog warnings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Side Subjects Selector / Right Side Pacing Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: SUBJECTS LIST & STATUS SUMMARY */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Classes &amp; Subjects ({pacingList.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterStatus("ALL")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${filterStatus === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("LAGGING")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${filterStatus === "LAGGING" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                Lagging
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("CRITICAL_DELAY")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${filterStatus === "CRITICAL_DELAY" ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                Critical
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredList.map((p) => {
              const isSelected = p.id === activePacing?.id;
              const compCount = p.chapters.filter((c) => c.status === "COMPLETED").length;
              const pct = Math.round((compCount / p.totalChapters) * 100);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPacingId(p.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-400 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/40"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-800 text-slate-300">
                      {p.className}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                        p.pacingStatus === "ON_TRACK"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : p.pacingStatus === "LAGGING"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                      }`}
                    >
                      {p.pacingStatus === "ON_TRACK"
                        ? "On Track"
                        : p.pacingStatus === "LAGGING"
                        ? "⚠️ 2 Ch Behind"
                        : "🔴 3+ Ch Delay"}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white leading-tight mb-1">
                    {p.subject}
                  </h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{p.teacherName}</span>
                  </p>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400">{compCount} of {p.totalChapters} Chapters</span>
                      <span className="text-indigo-300">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-indigo-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED PACING DRILL & CHAPTER BREAKDOWN */}
        <div className="lg:col-span-2 space-y-4">
          {activePacing && (
            <div className="space-y-4">
              {/* Detailed Progress Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 to-indigo-950/60 border border-indigo-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {activePacing.className}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                      {activePacing.subject}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Teacher Incharge: <b className="text-amber-400">{activePacing.teacherName}</b> &bull; Target Finish: <b className="text-white">{activePacing.targetCompletionDate}</b>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendPacingNotice(activePacing)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition active:scale-95 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Alert Teacher</span>
                    </button>
                  </div>
                </div>

                {/* Big Velocity Bar */}
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1 text-slate-300">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Syllabus Completion Meter</span>
                    </span>
                    <span className="text-base text-emerald-400">{completionPercentage}% Completed</span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 font-bold">
                    <div className="text-emerald-400">
                      <span className="block text-[10px] text-slate-400">Completed</span>
                      <span>{completedChapters} Chapters</span>
                    </div>
                    <div className="text-amber-400">
                      <span className="block text-[10px] text-slate-400">In Progress</span>
                      <span>{inProgressChapters} Chapters</span>
                    </div>
                    <div className="text-slate-400">
                      <span className="block text-[10px] text-slate-500">Pending</span>
                      <span>{pendingChapters} Chapters</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chapters Checklist */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Chapter Milestone Checklist</span>
                  </h4>
                  <span className="text-xs text-slate-400">Tap status button to update</span>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {activePacing.chapters.map((ch) => {
                    return (
                      <div
                        key={ch.chapterNo}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {ch.chapterNo}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate leading-tight">
                              {ch.title}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Target: <b>{ch.targetMonth}</b></span>
                              {ch.completedDate && (
                                <span className="text-emerald-400 font-semibold">&bull; Finished: {ch.completedDate}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleChapterStatus(activePacing.id, ch.chapterNo)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition active:scale-95 cursor-pointer shadow ${
                            ch.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                              : ch.status === "IN_PROGRESS"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse"
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                          }`}
                        >
                          {ch.status === "COMPLETED" ? "✓ Done" : ch.status === "IN_PROGRESS" ? "⏳ In Progress" : "Pending"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
