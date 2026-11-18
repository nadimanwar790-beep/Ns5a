import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Star,
  Award,
  HeartPulse,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  School,
  SchoolClass,
  SchoolEmergencyAlert,
  SchoolStudent,
  StudentDailyActivity,
  StudentHealthRecord,
  StudentPortfolioItem,
  StudentSkillRatings,
  StudentWeeklyReport,
} from "../../school-types";
import { isStudentInClass, generateId } from "../../school-firebase";
import {
  loadSchoolSubcollection,
  syncSchoolSubcollection,
} from "../../utils/schoolCloudSync";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  actorName: string;
  canBroadcastEmergency?: boolean;
  onBack?: () => void;
}

export const TeacherAdminGrowthHub: React.FC<Props> = ({
  school,
  classes,
  students,
  actorName,
  canBroadcastEmergency = true,
  onBack,
}) => {
  const schoolId = school?.id || "";
  const [tab, setTab] = useState<"diary" | "skills" | "portfolio" | "health" | "emergency">("diary");
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const classStudents = useMemo(() => {
    const cls = classes.find((c) => c.id === selectedClassId);
    return students.filter((s) => !selectedClassId || isStudentInClass(s, selectedClassId, cls?.name));
  }, [students, classes, selectedClassId]);

  useEffect(() => {
    if (!selectedStudentId && classStudents.length > 0) {
      setSelectedStudentId(classStudents[0].id);
    }
  }, [classStudents, selectedStudentId]);

  // Subcollection states
  const [activities, setActivities] = useState<StudentDailyActivity[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<StudentWeeklyReport[]>([]);
  const [portfolio, setPortfolio] = useState<StudentPortfolioItem[]>([]);
  const [alerts, setAlerts] = useState<SchoolEmergencyAlert[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    loadSchoolSubcollection<StudentDailyActivity>(schoolId, "student_daily_activities", `nst_daily_activities_${schoolId}`).then(setActivities);
    loadSchoolSubcollection<StudentWeeklyReport>(schoolId, "student_weekly_reports", `nst_weekly_reports_${schoolId}`).then(setWeeklyReports);
    loadSchoolSubcollection<StudentPortfolioItem>(schoolId, "student_portfolio", `nst_portfolio_${schoolId}`).then(setPortfolio);
    loadSchoolSubcollection<SchoolEmergencyAlert>(schoolId, "emergency_alerts", `nst_emergency_alerts_${schoolId}`).then(setAlerts);
  }, [schoolId]);

  // Forms
  const [diaryTarget, setDiaryTarget] = useState<"ALL_CLASS" | "STUDENT">("ALL_CLASS");
  const [diaryDate, setDiaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topicsTaught, setTopicsTaught] = useState("");
  const [homeworkNote, setHomeworkNote] = useState("");
  const [behaviorNote, setBehaviorNote] = useState("");
  const [moodTag, setMoodTag] = useState<NonNullable<StudentDailyActivity["moodTag"]>>("active");

  const [weekLabel, setWeekLabel] = useState("Current Week");
  const [weeklySummary, setWeeklySummary] = useState("");
  const [weeklyStrengths, setWeeklyStrengths] = useState("");
  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [skills, setSkills] = useState<StudentSkillRatings>({
    reading: 4,
    writing: 4,
    communication: 4,
    creativity: 4,
    teamwork: 4,
    discipline: 5,
  });

  const [badgeTitle, setBadgeTitle] = useState("");
  const [badgeCat, setBadgeCat] = useState<StudentPortfolioItem["category"]>("academic");
  const [badgeDesc, setBadgeDesc] = useState("");

  const [healthEdit, setHealthEdit] = useState({ heightCm: "", weightKg: "", allergies: "", lastCheckupDate: "" });

  const [sosTitle, setSosTitle] = useState("");
  const [sosMsg, setSosMsg] = useState("");
  const [sosSeverity, setSosSeverity] = useState<SchoolEmergencyAlert["severity"]>("WARNING");
  const [sosCategory, setSosCategory] = useState<SchoolEmergencyAlert["category"]>("TRANSPORT_DELAY");

  const handleSaveDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicsTaught.trim()) {
      toast.error("Topics taught note is required.");
      return;
    }
    const entry: StudentDailyActivity = {
      id: generateId("act"),
      schoolId,
      studentId: diaryTarget === "ALL_CLASS" ? "ALL_CLASS" : selectedStudentId || "ALL_CLASS",
      classId: selectedClassId,
      date: diaryDate,
      topicsTaught: topicsTaught.trim(),
      homeworkNote: homeworkNote.trim(),
      behaviorNote: behaviorNote.trim(),
      moodTag,
      teacherName: actorName,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...activities];
    setActivities(next);
    try { localStorage.setItem(`nst_daily_activities_${schoolId}`, JSON.stringify(next)); } catch {}
    await syncSchoolSubcollection(schoolId, "student_daily_activities", next);
    setTopicsTaught("");
    setHomeworkNote("");
    setBehaviorNote("");
    toast.success("Daily activity diary synced to Parent Portal!");
  };

  const handleSaveWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !weeklySummary.trim()) {
      toast.error("Select a student and enter weekly remark.");
      return;
    }
    const entry: StudentWeeklyReport = {
      id: generateId("wk"),
      schoolId,
      studentId: selectedStudentId,
      weekLabel: weekLabel.trim() || "Weekly Report",
      summary: weeklySummary.trim(),
      strengths: weeklyStrengths.trim(),
      focusAreas: weeklyFocus.trim(),
      skills,
      teacherName: actorName,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...weeklyReports];
    setWeeklyReports(next);
    try { localStorage.setItem(`nst_weekly_reports_${schoolId}`, JSON.stringify(next)); } catch {}
    await syncSchoolSubcollection(schoolId, "student_weekly_reports", next);
    setWeeklySummary("");
    setWeeklyStrengths("");
    setWeeklyFocus("");
    toast.success("Weekly learning report & 6-skill scores published!");
  };

  const handleAwardBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !badgeTitle.trim()) {
      toast.error("Select student and achievement title.");
      return;
    }
    const entry: StudentPortfolioItem = {
      id: generateId("port"),
      schoolId,
      studentId: selectedStudentId,
      title: badgeTitle.trim(),
      category: badgeCat,
      date: new Date().toISOString().slice(0, 10),
      description: badgeDesc.trim() || "Recognized for excellence.",
      awardedBy: actorName,
    };
    const next = [entry, ...portfolio];
    setPortfolio(next);
    try { localStorage.setItem(`nst_portfolio_${schoolId}`, JSON.stringify(next)); } catch {}
    await syncSchoolSubcollection(schoolId, "student_portfolio", next);
    setBadgeTitle("");
    setBadgeDesc("");
    toast.success("Achievement added to Student Digital Portfolio!");
  };

  const handleSaveCheckup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const all = await loadSchoolSubcollection<StudentHealthRecord>(schoolId, "student_health_records", `nst_health_records_${schoolId}`);
    const existing = all.find((r) => r.studentId === selectedStudentId);
    const updated: StudentHealthRecord = {
      ...(existing || { id: `hr_${selectedStudentId}`, schoolId, studentId: selectedStudentId, vaccinations: [] }),
      heightCm: healthEdit.heightCm ? Number(healthEdit.heightCm) : existing?.heightCm,
      weightKg: healthEdit.weightKg ? Number(healthEdit.weightKg) : existing?.weightKg,
      allergies: healthEdit.allergies.trim() || existing?.allergies,
      lastCheckupDate: healthEdit.lastCheckupDate || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    };
    const nextAll = [updated, ...all.filter((r) => r.studentId !== selectedStudentId)];
    try { localStorage.setItem(`nst_health_records_${schoolId}`, JSON.stringify(nextAll)); } catch {}
    await syncSchoolSubcollection(schoolId, "student_health_records", nextAll);
    toast.success("Student medical checkup record updated.");
  };

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosTitle.trim() || !sosMsg.trim()) {
      toast.error("Title and alert message are required.");
      return;
    }
    const alert: SchoolEmergencyAlert = {
      id: generateId("sos"),
      schoolId,
      title: sosTitle.trim(),
      message: sosMsg.trim(),
      severity: sosSeverity,
      category: sosCategory,
      createdAt: new Date().toISOString(),
      createdBy: actorName,
      active: true,
    };
    const next = [alert, ...alerts];
    setAlerts(next);
    try { localStorage.setItem(`nst_emergency_alerts_${schoolId}`, JSON.stringify(next)); } catch {}
    await syncSchoolSubcollection(schoolId, "emergency_alerts", next);
    sendSchoolPushNotification({
      schoolId,
      title: `🚨 ${alert.title}`,
      body: alert.message,
      schoolBroadcast: true,
      urgent: true,
    }).catch(() => {});
    setSosTitle("");
    setSosMsg("");
    toast.success("Emergency alert broadcast live to all Parent & Student Dashboards!");
  };

  const handleResolveAlert = async (id: string) => {
    const next = alerts.map((a) => (a.id === id ? { ...a, active: false } : a));
    setAlerts(next);
    try { localStorage.setItem(`nst_emergency_alerts_${schoolId}`, JSON.stringify(next)); } catch {}
    await syncSchoolSubcollection(schoolId, "emergency_alerts", next);
    toast.success("Alert marked resolved.");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              Student Growth, Diary, Health &amp; Safety Broadcast
            </h2>
            <p className="text-xs text-slate-400">
              Publish daily learning diaries, 6-skill evaluations, achievement badges, and emergency safety alerts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: "diary", label: "Daily Diary" },
            { id: "skills", label: "Weekly Skills" },
            { id: "portfolio", label: "Portfolio Badges" },
            { id: "health", label: "Health Checkup" },
            ...(canBroadcastEmergency ? [{ id: "emergency", label: "SOS Broadcast" }] : []),
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

      {/* Common Class & Student Selector */}
      {tab !== "emergency" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedStudentId("");
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section ? `(${c.section})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-bold mb-1">Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
            >
              {classStudents.length === 0 ? (
                <option value="">No students in class</option>
              ) : (
                classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Roll #{s.rollNo})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}

      {tab === "diary" && (
        <form onSubmit={handleSaveDiary} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-white">
          <h3 className="text-sm font-black flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Log Daily Classwork &amp; Activity Diary</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Target</label>
              <select value={diaryTarget} onChange={(e) => setDiaryTarget(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700">
                <option value="ALL_CLASS">Entire Selected Class</option>
                <option value="STUDENT">Selected Student Only</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Date</label>
              <input type="date" value={diaryDate} onChange={(e) => setDiaryDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Engagement / Mood</label>
              <select value={moodTag} onChange={(e) => setMoodTag(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700">
                <option value="excellent">Excellent / Participative</option>
                <option value="active">Active &amp; Attentive</option>
                <option value="needs_attention">Needs Support</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-bold mb-1">Topics Taught Today *</label>
            <textarea required rows={2} value={topicsTaught} onChange={(e) => setTopicsTaught(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" placeholder="e.g. Chapter 4 Algebra exercises and lab demonstration..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Homework Note</label>
              <input type="text" value={homeworkNote} onChange={(e) => setHomeworkNote(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Behavior / Observation</label>
              <input type="text" value={behaviorNote} onChange={(e) => setBehaviorNote(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer">
            Publish Daily Diary
          </button>
        </form>
      )}

      {tab === "skills" && (
        <form onSubmit={handleSaveWeekly} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs text-white">
          <h3 className="text-sm font-black flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Submit Weekly Learning Report &amp; 6-Skill Ratings (1-5)</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(skills) as Array<keyof StudentSkillRatings>).map((k) => (
              <div key={k} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="flex justify-between font-bold mb-1 capitalize">
                  <span>{k}</span>
                  <span className="text-amber-400 tabular-nums">{skills[k]}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={skills[k]}
                  onChange={(e) => setSkills({ ...skills, [k]: Number(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Week Label</label>
              <input type="text" value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Key Strengths</label>
              <input type="text" value={weeklyStrengths} onChange={(e) => setWeeklyStrengths(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Focus Areas</label>
              <input type="text" value={weeklyFocus} onChange={(e) => setWeeklyFocus(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-bold mb-1">Teacher Weekly Summary *</label>
            <textarea required rows={2} value={weeklySummary} onChange={(e) => setWeeklySummary(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer">
            Publish Weekly Evaluation
          </button>
        </form>
      )}

      {tab === "portfolio" && (
        <form onSubmit={handleAwardBadge} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-white">
          <h3 className="text-sm font-black flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Award Student Achievement / Portfolio Badge</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Achievement Title *</label>
              <input required type="text" value={badgeTitle} onChange={(e) => setBadgeTitle(e.target.value)} placeholder="e.g. Science Olympiad Gold Merit" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Category</label>
              <select value={badgeCat} onChange={(e) => setBadgeCat(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700">
                <option value="academic">Academic</option>
                <option value="sports">Sports</option>
                <option value="art">Art &amp; Culture</option>
                <option value="project">Project</option>
                <option value="certificate">Certificate</option>
                <option value="badge">Special Badge</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-bold mb-1">Details</label>
            <textarea rows={2} value={badgeDesc} onChange={(e) => setBadgeDesc(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer">
            Add to Student Portfolio
          </button>
        </form>
      )}

      {tab === "health" && (
        <form onSubmit={handleSaveCheckup} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-white">
          <h3 className="text-sm font-black flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <span>Log School Health Camp / Checkup Measurement</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Height (cm)</label>
              <input type="number" value={healthEdit.heightCm} onChange={(e) => setHealthEdit({ ...healthEdit, heightCm: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Weight (kg)</label>
              <input type="number" value={healthEdit.weightKg} onChange={(e) => setHealthEdit({ ...healthEdit, weightKg: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Allergies / Note</label>
              <input type="text" value={healthEdit.allergies} onChange={(e) => setHealthEdit({ ...healthEdit, allergies: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Checkup Date</label>
              <input type="date" value={healthEdit.lastCheckupDate} onChange={(e) => setHealthEdit({ ...healthEdit, lastCheckupDate: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black cursor-pointer">
            Update Checkup Record
          </button>
        </form>
      )}

      {tab === "emergency" && canBroadcastEmergency && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleBroadcastAlert} className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 space-y-3 text-xs text-white">
            <h3 className="text-sm font-black text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Emergency SOS / Urgent Closure Broadcast</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Severity</label>
                <select value={sosSeverity} onChange={(e) => setSosSeverity(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700">
                  <option value="CRITICAL">CRITICAL (Red Banner)</option>
                  <option value="WARNING">WARNING (Amber Banner)</option>
                  <option value="INFO">INFO (Blue Banner)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Category</label>
                <select value={sosCategory} onChange={(e) => setSosCategory(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700">
                  <option value="CLOSURE">School Closure / Holiday</option>
                  <option value="TRANSPORT_DELAY">Bus / Transport Delay</option>
                  <option value="WEATHER">Weather Advisory</option>
                  <option value="SAFETY_DRILL">Safety Notice</option>
                  <option value="MEDICAL">Medical Advisory</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Alert Headline *</label>
              <input required type="text" value={sosTitle} onChange={(e) => setSosTitle(e.target.value)} placeholder="e.g. Heavy Rain Holiday Tomorrow" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Alert Message *</label>
              <textarea required rows={3} value={sosMsg} onChange={(e) => setSosMsg(e.target.value)} placeholder="Detailed guidance for parents & students..." className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center justify-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Broadcast Live Alert Now</span>
            </button>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-white">
            <h3 className="text-sm font-black">Broadcast History</h3>
            {alerts.length === 0 ? (
              <p className="text-slate-400 py-4">No emergency alerts broadcast yet.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-white">{a.title}</p>
                      <p className="text-slate-400 mt-0.5">{a.message}</p>
                      <span className="text-[10px] text-slate-500">
                        {a.severity} · {a.active ? "ACTIVE ON PORTALS" : "Resolved"}
                      </span>
                    </div>
                    {a.active && (
                      <button type="button" onClick={() => handleResolveAlert(a.id)} className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 font-bold cursor-pointer shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
