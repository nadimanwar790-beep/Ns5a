// @ts-nocheck
import React, { useState } from "react";
import type { School, SchoolClass, SchoolSession, SchoolStudent } from "../../school-types";
import { promoteStudents } from "../../school-firebase";
import {
  TrendingUp, ChevronLeft, ArrowRight, CheckSquare, Square, CheckCircle,
  AlertCircle, Users, Sparkles, RefreshCw
} from "lucide-react";

interface Props {
  schoolId: string;
  sessions: SchoolSession[];
  classes: SchoolClass[];
  students: SchoolStudent[];
  onBack: () => void;
  onRefreshData?: () => void;
}

export const StudentPromotionManager: React.FC<Props> = ({
  schoolId,
  sessions,
  classes,
  students,
  onBack,
  onRefreshData,
}) => {
  const [fromSessionId, setFromSessionId] = useState(sessions[0]?.id || "");
  const [fromClassId, setFromClassId] = useState(classes[0]?.id || "");
  const [toSessionId, setToSessionId] = useState(sessions[1]?.id || sessions[0]?.id || "");
  const [toClassId, setToClassId] = useState(classes[1]?.id || classes[0]?.id || "");

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<{ success: boolean; count: number } | null>(null);

  // Eligible students in source session and class
  const eligibleStudents = students.filter(s => {
    const classMatch = !fromClassId || s.classId === fromClassId;
    const sessionMatch = !fromSessionId || s.sessionId === fromSessionId;
    return classMatch && sessionMatch;
  });

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === eligibleStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleStudents.map(s => s.id));
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePromote = async () => {
    if (!toClassId || !toSessionId || selectedStudentIds.length === 0) return;
    setPromoting(true);
    setPromoteResult(null);
    try {
      const res = await promoteStudents(schoolId, toClassId, toSessionId, selectedStudentIds);
      setPromoteResult(res);
      setSelectedStudentIds([]);
      onRefreshData?.();
    } catch (err: any) {
      alert("Error promoting students: " + (err?.message || "Unknown error"));
    } finally {
      setPromoting(false);
    }
  };

  const sourceClassName = classes.find(c => c.id === fromClassId)?.name || "Current Class";
  const targetClassName = classes.find(c => c.id === toClassId)?.name || "Target Class";
  const sourceSessionName = sessions.find(s => s.id === fromSessionId)?.name || "Current Session";
  const targetSessionName = sessions.find(s => s.id === toSessionId)?.name || "Target Session";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-violet-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-indigo-600" />
            Student Class Promotion System
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Varshik pariksha ke baad sabhi pass chhatron ko ek click me agle session aur class me promote karein.
          </p>
        </div>

        {/* Source and Destination Session/Class Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FROM BOX */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full">
              Step 1: Kahan Se Promote Karna Hai (Source)
            </span>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Session:</label>
                <select
                  value={fromSessionId}
                  onChange={e => { setFromSessionId(e.target.value); setSelectedStudentIds([]); }}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.active ? "(Active)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Current Class:</label>
                <select
                  value={fromClassId}
                  onChange={e => { setFromClassId(e.target.value); setSelectedStudentIds([]); }}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TO BOX */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-sm space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
              Step 2: Kis Class Mein Bhejna Hai (Target)
            </span>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Target Session:</label>
                <select
                  value={toSessionId}
                  onChange={e => setToSessionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Target Next Class:</label>
                <select
                  value={toClassId}
                  onChange={e => setToClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Promotion Arrow Banner */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-300" />
            <div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Promotion Route</p>
              <p className="text-base font-black">
                {sourceClassName} ({sourceSessionName}) <span className="mx-2">➔</span> {targetClassName} ({targetSessionName})
              </p>
            </div>
          </div>
          <button
            onClick={handlePromote}
            disabled={promoting || selectedStudentIds.length === 0}
            className="px-6 py-2.5 bg-white text-indigo-700 font-black text-xs rounded-xl shadow hover:bg-indigo-50 disabled:opacity-50 transition-all flex items-center gap-1.5 active:scale-95"
          >
            {promoting ? "Promoting..." : `Promote Selected (${selectedStudentIds.length})`}
          </button>
        </div>

        {promoteResult && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>🎉 {promoteResult.count} chhatron ko safaltapoorvak {targetClassName} mein promote kar diya gaya hai!</span>
          </div>
        )}

        {/* Student Checklist */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b dark:border-slate-700">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              {selectedStudentIds.length === eligibleStudents.length && eligibleStudents.length > 0 ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedStudentIds.length === eligibleStudents.length && eligibleStudents.length > 0 ? "Sabhi Deselect Karein" : "Sabhi Chhatron Ko Chunein"} ({eligibleStudents.length})
            </button>
            <span className="text-xs text-slate-400">
              {selectedStudentIds.length} chhatra select kiye gaye
            </span>
          </div>

          {eligibleStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Is class/session mein koi chhatra nahi mila.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {eligibleStudents.map(student => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/30 shadow-sm"
                        : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="text-indigo-600">
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-xs">{student.name}</p>
                        <p className="text-[10px] text-slate-400">Roll: {student.rollNo} · {student.phone || "No Phone"}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Eligible
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
