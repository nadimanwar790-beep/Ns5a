// @ts-nocheck
import React, { useState, useEffect } from "react";
import type { SchoolNotice } from "../../school-types";
import { saveNotice, getNotices, deleteNotice, generateId, todayStr } from "../../school-firebase";
import {
  Bell, ChevronLeft, Plus, Trash2, Calendar, Tag, AlertTriangle,
  Pin, Sparkles, CheckCircle2, Megaphone, Clock
} from "lucide-react";

interface Props {
  schoolId: string;
  adminUid: string;
  isAdmin?: boolean;
  onBack: () => void;
}

export const NoticeBoardManager: React.FC<Props> = ({
  schoolId,
  adminUid,
  isAdmin = true,
  onBack,
}) => {
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "notice" as SchoolNotice["type"],
    audience: "all" as SchoolNotice["audience"],
    date: todayStr(),
    pinned: false,
  });
  const [saving, setSaving] = useState(false);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const list = await getNotices(schoolId);
      setNotices(list);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadNotices();
  }, [schoolId]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const notice: SchoolNotice = {
        id: generateId(),
        schoolId,
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        audience: form.audience,
        date: form.date,
        createdAt: new Date().toISOString(),
        createdBy: adminUid,
        pinned: form.pinned,
      };
      await saveNotice(notice);
      setNotices(prev => [notice, ...prev]);
      setForm({
        title: "",
        content: "",
        type: "notice",
        audience: "all",
        date: todayStr(),
        pinned: false,
      });
      setShowAddForm(false);
    } catch (e) {
      alert("Error saving notice: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kya aap is notice ko delete karna chahte hain?")) return;
    await deleteNotice(schoolId, id);
    setNotices(prev => prev.filter(n => n.id !== id));
  };

  const typeBadges = {
    notice: { label: "General Notice", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    circular: { label: "Circular", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
    holiday: { label: "Holiday Notice", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    event: { label: "School Event", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  };

  const filteredNotices = notices.filter(n => filterType === "all" || n.type === filterType);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 px-4 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Naya Notice Jodein
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            School Notice Board & Circulars
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            School ki sabhi zaroori suchnayein, chhuttiyon ki list aur aane wale karyakram yahan live publish hote hain.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "Sabhi Notices" },
            { id: "holiday", label: "🏖️ Chhuttiyan (Holidays)" },
            { id: "notice", label: "📢 General Notices" },
            { id: "circular", label: "📜 Circulars" },
            { id: "event", label: "🎉 School Events" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterType === f.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Add Notice Form Modal / Accordion */}
        {showAddForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-indigo-500 shadow-md space-y-4">
            <h3 className="font-black text-slate-900 dark:text-white text-base">Naya Notice Publish Karein</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Notice Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Holiday Announcement, Sports Day 2026..."
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Category:</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  >
                    <option value="notice">General Notice</option>
                    <option value="holiday">Holiday Notice</option>
                    <option value="circular">Official Circular</option>
                    <option value="event">School Event</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Audience:</label>
                  <select
                    value={form.audience}
                    onChange={e => setForm({ ...form, audience: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  >
                    <option value="all">Sabhi Ke Liye (All)</option>
                    <option value="students">Sirf Students</option>
                    <option value="teachers">Sirf Teachers</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Date:</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Notice Details / Content:</label>
                <textarea
                  rows={4}
                  placeholder="Notice ka poora vivran likhein..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinnedNotice"
                  checked={form.pinned}
                  onChange={e => setForm({ ...form, pinned: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="pinnedNotice" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  📌 Is notice ko top par Pin karein (Important)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !form.title.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow"
                >
                  {saving ? "Publishing..." : "Publish Karein"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notices Feed */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">Notices load ho rahe hain...</div>
        ) : filteredNotices.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <Bell className="w-10 h-10 mx-auto opacity-30 text-indigo-500" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Koi notice uplabdh nahi hai</p>
            <p className="text-xs">Naye notices yahan sabhi chhatron aur staff ko dikhenge.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotices.map(notice => {
              const badge = typeBadges[notice.type] || typeBadges.notice;
              return (
                <div
                  key={notice.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border transition-all ${
                    notice.pinned
                      ? "border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-400"
                      : "border-slate-100 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.pinned && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {notice.date}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(notice.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 leading-snug">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {notice.content}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Target: {notice.audience === "all" ? "All School" : notice.audience.toUpperCase()}</span>
                    <span>Official Circular</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
