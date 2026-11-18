import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Award,
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import type {
  ExamEntry,
  SchoolStudent,
  StudentDailyActivity,
  StudentPortfolioItem,
  StudentWeeklyReport,
} from "../../school-types";
import { loadSchoolSubcollection } from "../../utils/schoolCloudSync";
import { shouldUseDemoForSchool } from "../../school-firebase";

interface Props {
  schoolId: string;
  student: SchoolStudent;
  studentExams: ExamEntry[];
  attendanceStats: { present: number; total: number; percentage: number };
  homeworkCompletedCount: number;
  homeworkTotalCount: number;
  onBack?: () => void;
}

const SKILL_LABELS: Array<{ key: keyof StudentWeeklyReport["skills"]; label: string }> = [
  { key: "reading", label: "Reading & Comprehension" },
  { key: "writing", label: "Writing & Neatness" },
  { key: "communication", label: "Verbal Communication" },
  { key: "creativity", label: "Creativity & Problem Solving" },
  { key: "teamwork", label: "Teamwork & Empathy" },
  { key: "discipline", label: "Discipline & Punctuality" },
];

export const StudentGrowthAndPortfolioView: React.FC<Props> = ({
  schoolId,
  student,
  studentExams,
  attendanceStats,
  homeworkCompletedCount,
  homeworkTotalCount,
  onBack,
}) => {
  const [tab, setTab] = useState<"ai_insights" | "diary" | "skills" | "portfolio">("ai_insights");
  const [activities, setActivities] = useState<StudentDailyActivity[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<StudentWeeklyReport[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<StudentPortfolioItem[]>([]);

  useEffect(() => {
    let active = true;
    if (!schoolId || !student?.id) return;
    const isDemo = shouldUseDemoForSchool(schoolId);

    loadSchoolSubcollection<StudentDailyActivity>(
      schoolId,
      "student_daily_activities",
      `nst_daily_activities_${schoolId}`
    ).then((rows) => {
      if (!active) return;
      const mine = rows.filter(
        (r) => r.studentId === student.id || (r.studentId === "ALL_CLASS" && r.classId === student.classId)
      );
      if (mine.length > 0) {
        setActivities(mine.sort((a, b) => b.date.localeCompare(a.date)));
      } else if (isDemo) {
        setActivities([
          {
            id: "act_demo_1",
            schoolId,
            studentId: student.id,
            classId: student.classId,
            date: new Date().toISOString().slice(0, 10),
            topicsTaught: "Quadratic equations word problems & Science acid-base indicator lab.",
            homeworkNote: "Complete NCERT Ex 4.3 Q1-5 in fair register.",
            behaviorNote: "Participated actively in science experiment and helped classmates.",
            moodTag: "excellent",
            teacherName: "Class Teacher",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setActivities([]);
      }
    });

    loadSchoolSubcollection<StudentWeeklyReport>(
      schoolId,
      "student_weekly_reports",
      `nst_weekly_reports_${schoolId}`
    ).then((rows) => {
      if (!active) return;
      const mine = rows
        .filter((r) => r.studentId === student.id)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      if (mine.length > 0) {
        setWeeklyReports(mine);
      } else if (isDemo) {
        setWeeklyReports([
          {
            id: "wk_demo_1",
            schoolId,
            studentId: student.id,
            weekLabel: "Week of Current Term",
            summary: "Steady academic progress with high classroom focus and punctual attendance.",
            strengths: "Mathematics steps clarity & group collaboration",
            focusAreas: "Reading speed in long English comprehension passages",
            skills: { reading: 4, writing: 5, communication: 4, creativity: 4, teamwork: 5, discipline: 5 },
            teacherName: "Class Teacher",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setWeeklyReports([]);
      }
    });

    loadSchoolSubcollection<StudentPortfolioItem>(
      schoolId,
      "student_portfolio",
      `nst_portfolio_${schoolId}`
    ).then((rows) => {
      if (!active) return;
      const mine = rows.filter((p) => p.studentId === student.id);
      if (mine.length > 0) {
        setPortfolioItems(mine.sort((a, b) => b.date.localeCompare(a.date)));
      } else if (isDemo) {
        setPortfolioItems([
          {
            id: "port_demo_1",
            schoolId,
            studentId: student.id,
            title: "Inter-House Science Model Merit",
            category: "academic",
            date: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
            description: "Built working solar water purifier demonstration with clear viva presentation.",
            awardedBy: "Science Department",
          },
          {
            id: "port_demo_2",
            schoolId,
            studentId: student.id,
            title: "100% Punctuality Star Badge",
            category: "badge",
            date: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
            description: "Zero late arrivals recorded across the entire month.",
            awardedBy: "Principal Office",
          },
        ]);
      } else {
        setPortfolioItems([]);
      }
    });

    return () => {
      active = false;
    };
  }, [schoolId, student?.id, student?.classId]);

  // Deterministic AI Learning Analytics computed from real studentExams, attendanceStats & homework
  const learningAnalytics = useMemo(() => {
    const bySubject = new Map<string, { obtained: number; max: number; exams: number }>();
    const byCycle = new Map<string, { obtained: number; max: number; date: string }>();

    studentExams.forEach((ex) => {
      const rec = ex.studentMarks?.[student.id];
      if (!rec || rec.absent) return;
      const max = Number(ex.maxMarks || 100);
      const obt = Number(rec.marks || 0);
      const subj = ex.subjectName || "Subject";
      const prevSubj = bySubject.get(subj) || { obtained: 0, max: 0, exams: 0 };
      bySubject.set(subj, {
        obtained: prevSubj.obtained + obt,
        max: prevSubj.max + max,
        exams: prevSubj.exams + 1,
      });

      const cycle = ex.examName || "Term Exam";
      const prevCycle = byCycle.get(cycle) || { obtained: 0, max: 0, date: ex.examDate || ex.createdAt || "" };
      byCycle.set(cycle, {
        obtained: prevCycle.obtained + obt,
        max: prevCycle.max + max,
        date: prevCycle.date || ex.examDate || "",
      });
    });

    const subjectStats = Array.from(bySubject.entries())
      .map(([subject, s]) => ({
        subject,
        pct: s.max > 0 ? Math.round((s.obtained / s.max) * 100) : 0,
        obtained: s.obtained,
        max: s.max,
        exams: s.exams,
      }))
      .sort((a, b) => b.pct - a.pct);

    const cycleStats = Array.from(byCycle.entries()).map(([cycle, c]) => ({
      cycle,
      pct: c.max > 0 ? Math.round((c.obtained / c.max) * 100) : 0,
      obtained: c.obtained,
      max: c.max,
    }));

    const strengths = subjectStats.filter((s) => s.pct >= 75);
    const focusAreas = subjectStats.filter((s) => s.pct < 60);
    const overallExamPct =
      subjectStats.length > 0
        ? Math.round(subjectStats.reduce((acc, s) => acc + s.pct, 0) / subjectStats.length)
        : 0;

    const trendDelta =
      cycleStats.length >= 2
        ? cycleStats[cycleStats.length - 1].pct - cycleStats[cycleStats.length - 2].pct
        : null;

    const hwPct = homeworkTotalCount > 0 ? Math.round((homeworkCompletedCount / homeworkTotalCount) * 100) : 100;

    const recommendations: string[] = [];
    if (focusAreas.length > 0) {
      recommendations.push(
        `Dedicate 25 mins daily revision to ${focusAreas.map((f) => f.subject).join(", ")} using NCERT solved examples.`
      );
    }
    if (attendanceStats.percentage < 85) {
      recommendations.push(
        `Attendance is ${attendanceStats.percentage}%. Improving regularity above 90% prevents missed concept foundations.`
      );
    }
    if (hwPct < 80 && homeworkTotalCount > 0) {
      recommendations.push(
        `Complete remaining ${homeworkTotalCount - homeworkCompletedCount} pending homework task(s) before weekend revision.`
      );
    }
    if (strengths.length > 0) {
      recommendations.push(
        `Maintain strong momentum in ${strengths[0].subject} (${strengths[0].pct}%) with weekly timed mock practice.`
      );
    }
    if (recommendations.length === 0) {
      recommendations.push("Once exam scores are published by teachers, personalized subject recommendations will appear here.");
    }

    return {
      subjectStats,
      cycleStats,
      strengths,
      focusAreas,
      overallExamPct,
      trendDelta,
      hwPct,
      recommendations,
    };
  }, [studentExams, student.id, attendanceStats.percentage, homeworkCompletedCount, homeworkTotalCount]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Student Growth Hub, Diary &amp; Learning Insights</span>
            </h2>
            <p className="text-xs text-slate-400">
              {student.name} · {student.className || "Class"} · Personalized performance analytics &amp; daily classroom diary
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: "ai_insights", label: "Learning Insights" },
            { id: "diary", label: `Daily Diary (${activities.length})` },
            { id: "skills", label: "Weekly Skills" },
            { id: "portfolio", label: `Portfolio (${portfolioItems.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                tab === t.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DETERMINISTIC LEARNING INSIGHTS */}
      {tab === "ai_insights" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 block">Exam Average</span>
              <span className="text-2xl font-black text-indigo-400 tabular-nums mt-1 block">
                {learningAnalytics.subjectStats.length > 0 ? `${learningAnalytics.overallExamPct}%` : "N/A"}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 block">Strong Subjects</span>
              <span className="text-2xl font-black text-emerald-400 tabular-nums mt-1 block">
                {learningAnalytics.strengths.length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 block">Focus Needed</span>
              <span className="text-2xl font-black text-amber-400 tabular-nums mt-1 block">
                {learningAnalytics.focusAreas.length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 block">Term Trend</span>
              <span className="text-2xl font-black text-white tabular-nums mt-1 block">
                {learningAnalytics.trendDelta === null
                  ? "Baseline"
                  : `${learningAnalytics.trendDelta >= 0 ? "+" : ""}${learningAnalytics.trendDelta}%`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Subject Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Subject Mastery Breakdown</span>
              </h3>
              {learningAnalytics.subjectStats.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">
                  No graded exam records available yet. Subject bars appear automatically once teachers upload unit test or term marks.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {learningAnalytics.subjectStats.map((s) => (
                    <div key={s.subject} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">{s.subject}</span>
                        <span className="font-bold tabular-nums text-slate-300">
                          {s.obtained}/{s.max} ({s.pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.pct >= 75 ? "bg-emerald-500" : s.pct >= 60 ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actionable Study Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Personalized Weekly Study Plan</span>
              </h3>
              <ul className="space-y-2">
                {learningAnalytics.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
              {learningAnalytics.focusAreas.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Priority Subjects: {learningAnalytics.focusAreas.map((f) => `${f.subject} (${f.pct}%)`).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY DIGITAL DIARY */}
      {tab === "diary" && (
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No daily classroom diary entries logged yet by teachers.
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>{act.date}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Logged by {act.teacherName} · Engagement:{" "}
                    <strong className="text-white uppercase">{(act.moodTag || "active").replace("_", " ")}</strong>
                  </span>
                </div>
                <p className="text-xs text-white font-semibold">Topics Taught: {act.topicsTaught}</p>
                {act.homeworkNote && (
                  <p className="text-xs text-indigo-300">Homework / Practice: {act.homeworkNote}</p>
                )}
                {act.behaviorNote && (
                  <p className="text-xs text-slate-400">Behavior &amp; Observation: {act.behaviorNote}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: WEEKLY 6-SKILL TRACKER */}
      {tab === "skills" && (
        <div className="space-y-4">
          {weeklyReports.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No weekly 6-skill assessments published yet.
            </div>
          ) : (
            weeklyReports.map((rep) => (
              <div key={rep.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-white">{rep.weekLabel}</h3>
                    <p className="text-xs text-slate-400">Evaluated by {rep.teacherName}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-200">{rep.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SKILL_LABELS.map((sk) => {
                    const score = Number(rep.skills?.[sk.key] || 0);
                    return (
                      <div key={sk.key} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-300">{sk.label}</span>
                          <span className="font-black text-amber-400 tabular-nums">{score}/5</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, (score / 5) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: DIGITAL PORTFOLIO & ACHIEVEMENTS */}
      {tab === "portfolio" && (
        <div className="space-y-3">
          {student.awardsAchievements && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4">
              <span className="text-xs font-black text-amber-400 block mb-1">Admission Honors</span>
              <p className="text-xs text-slate-200">{student.awardsAchievements}</p>
            </div>
          )}
          {portfolioItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No badges or certificates awarded yet. Achievements added by teachers appear on this wall.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {portfolioItems.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      {item.category === "badge" ? (
                        <Star className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>{item.title}</span>
                    </h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{item.description}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.date} {item.awardedBy ? `· ${item.awardedBy}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
