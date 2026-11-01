// @ts-nocheck
import React, { useState, useEffect } from "react";
import type { SchoolNotice, SchoolHoliday } from "../../school-types";
import {
  saveNotice, getNotices, deleteNotice, generateId, todayStr,
  getSchoolHolidays, saveSchoolHoliday, deleteSchoolHoliday
} from "../../school-firebase";
import {
  Bell, ChevronLeft, Plus, Trash2, Calendar, Tag, AlertTriangle,
  Pin, Sparkles, CheckCircle2, Megaphone, Clock, Filter, Sun, PartyPopper
} from "lucide-react";

interface Props {
  schoolId: string;
  adminUid: string;
  isAdmin?: boolean;
  onBack: () => void;
}

const MONTHS_FILTER_LIST = [
  { id: "all", label: "All Months (Full Year)" },
  { id: "2026-04", label: "Apr 2026" },
  { id: "2026-05", label: "May 2026" },
  { id: "2026-06", label: "Jun 2026" },
  { id: "2026-07", label: "Jul 2026" },
  { id: "2026-08", label: "Aug 2026" },
  { id: "2026-09", label: "Sep 2026" },
  { id: "2026-10", label: "Oct 2026" },
  { id: "2026-11", label: "Nov 2026" },
  { id: "2026-12", label: "Dec 2026" },
  { id: "2027-01", label: "Jan 2027" },
  { id: "2027-02", label: "Feb 2027" },
  { id: "2027-03", label: "Mar 2027" },
];

export const NoticeBoardManager: React.FC<Props> = ({
  schoolId,
  adminUid,
  isAdmin = true,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"notices" | "holidays">("notices");
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  // Notice form
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "notice" as SchoolNotice["type"],
    audience: "all" as SchoolNotice["audience"],
    date: todayStr(),
    pinned: false,
  });

  // Holiday form
  const [holidayForm, setHolidayForm] = useState({
    title: "",
    startDate: todayStr(),
    endDate: todayStr(),
    days: 1,
    type: "festival" as SchoolHoliday["type"],
    description: "",
  });

  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listNotices, listHolidays] = await Promise.all([
        getNotices(schoolId),
        getSchoolHolidays(schoolId),
      ]);
      setNotices(listNotices);
      setHolidays(listHolidays);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleCreateNotice = async () => {
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
    } catch (e: any) {
      alert("Error saving notice: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Kya aap is notice ko delete karna chahte hain?")) return;
    await deleteNotice(schoolId, id);
    setNotices(prev => prev.filter(n => n.id !== id));
  };

  const handleCreateHoliday = async () => {
    if (!holidayForm.title.trim()) return;
    setSaving(true);
    try {
      const h: SchoolHoliday = {
        id: generateId(),
        schoolId,
        title: holidayForm.title.trim(),
        startDate: holidayForm.startDate,
        endDate: holidayForm.endDate,
        days: Number(holidayForm.days) || 1,
        type: holidayForm.type,
        description: holidayForm.description.trim(),
        createdAt: new Date().toISOString(),
        createdBy: adminUid,
      };
      await saveSchoolHoliday(schoolId, h);
      setHolidays(prev => [...prev, h].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setHolidayForm({
        title: "",
        startDate: todayStr(),
        endDate: todayStr(),
        days: 1,
        type: "festival",
        description: "",
      });
      setShowAddHolidayForm(false);
    } catch (e: any) {
      alert("Error saving holiday: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Kya aap is festival holiday ko delete karna chahte hain?")) return;
    await deleteSchoolHoliday(schoolId, id);
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  const typeBadges = {
    notice: { label: "General Notice", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    circular: { label: "Circular", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
    holiday: { label: "Holiday Notice", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    event: { label: "School Event", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  };

  // Filter notices by type AND month
  const filteredNotices = notices.filter(n => {
    const matchesType = filterType === "all" || n.type === filterType;
    const matchesMonth = filterMonth === "all" || n.date.startsWith(filterMonth);
    return matchesType && matchesMonth;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 px-4 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {activeTab === "notices" ? (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Naya Notice Jodein
                </button>
              ) : (
                <button
                  onClick={() => setShowAddHolidayForm(!showAddHolidayForm)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nayi Chhutti (Holiday) Jodein
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-7 h-7 text-indigo-600" />
              School Notice Board & Festival Holidays
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              1-Year Notices (month-wise filtered) aur Festival Holidays Management ka pura adhikaar (Power).
            </p>
          </div>

          {/* Tab Switcher: Notices vs Festival Holidays */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab("notices")}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                activeTab === "notices"
                  ? "bg-white dark:bg-slate-700 text-indigo-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              📢 Notices ({notices.length})
            </button>
            <button
              onClick={() => setActiveTab("holidays")}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                activeTab === "holidays"
                  ? "bg-white dark:bg-slate-700 text-rose-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              🏖️ Festival Holidays ({holidays.length})
            </button>
          </div>
        </div>

        {/* ── TAB 1: NOTICES ── */}
        {activeTab === "notices" && (
          <div className="space-y-4">
            {/* Month-Wise Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Month-Wise Filter (1-Year Academic Notices):
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Showing {filteredNotices.length} of {notices.length} notices
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {MONTHS_FILTER_LIST.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setFilterMonth(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      filterMonth === m.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: "all", label: "Sabhi Categories" },
                { id: "holiday", label: "🏖️ Holiday Notices" },
                { id: "notice", label: "📢 General Notices" },
                { id: "circular", label: "📜 Official Circulars" },
                { id: "event", label: "🎉 School Events" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    filterType === f.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
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
                    <label className="text-xs font-bold text-slate-500 block mb-1">Notice Content:</label>
                    <textarea
                      rows={4}
                      placeholder="Suchna ka poora vivaran yahan likhein..."
                      value={form.content}
                      onChange={e => setForm({ ...form, content: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pin-notice"
                      checked={form.pinned}
                      onChange={e => setForm({ ...form, pinned: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="pin-notice" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      📌 Is notice ko upar Pin karein (Important)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNotice}
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Publish ho raha hai..." : "Publish Notice"}
                  </button>
                </div>
              </div>
            )}

            {/* Notices List */}
            {loading ? (
              <div className="text-center py-12 text-slate-400">Notices load ho rahe hain...</div>
            ) : filteredNotices.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Bell className="w-10 h-10 mx-auto opacity-30 text-indigo-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Is month ya category me koi notice nahi mila</p>
                <p className="text-xs">Upar diye filters ko change karein ya naya notice publish karein.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotices.map(n => {
                  const badge = typeBadges[n.type] || typeBadges.notice;
                  return (
                    <div
                      key={n.id}
                      className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border transition-all ${
                        n.pinned
                          ? "border-amber-400 dark:border-amber-500/50 bg-gradient-to-r from-amber-50/20 to-white dark:from-amber-950/10 dark:to-slate-800"
                          : "border-slate-100 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {n.pinned && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5" /> PINNED
                              </span>
                            )}
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(n.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <span className="text-xs text-slate-400">· Audience: <strong className="text-slate-600 dark:text-slate-300 capitalize">{n.audience}</strong></span>
                          </div>

                          <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                            {n.title}
                          </h3>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Notice delete karein"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-wrap leading-relaxed">
                        {n.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: FESTIVAL HOLIDAYS CALENDAR ── */}
        {activeTab === "holidays" && (
          <div className="space-y-4">
            {/* Add Holiday Form */}
            {showAddHolidayForm && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-rose-500 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <PartyPopper className="w-5 h-5 text-rose-600" />
                    Nayi Festival / Vacation Chhutti Jodein (Admin Power)
                  </h3>
                  <button onClick={() => setShowAddHolidayForm(false)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Festival / Holiday Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Chhath Puja, Diwali Break, Summer Vacation..."
                        value={holidayForm.title}
                        onChange={e => setHolidayForm({ ...holidayForm, title: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Chhutti Type:</label>
                      <select
                        value={holidayForm.type}
                        onChange={e => setHolidayForm({ ...holidayForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                      >
                        <option value="festival">🎉 Festival / Tyohar</option>
                        <option value="national">🇮🇳 National Holiday</option>
                        <option value="vacation">🏖️ Vacation / Seasonal Break</option>
                        <option value="emergency">⚠️ Emergency / Special Holiday</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Kab Se (Start Date):</label>
                      <input
                        type="date"
                        value={holidayForm.startDate}
                        onChange={e => setHolidayForm({ ...holidayForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Kab Tak (End Date):</label>
                      <input
                        type="date"
                        value={holidayForm.endDate}
                        onChange={e => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Kul Din (Total Days):</label>
                      <input
                        type="number"
                        min="1"
                        value={holidayForm.days}
                        onChange={e => setHolidayForm({ ...holidayForm, days: Number(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Description (Vivaran):</label>
                    <input
                      type="text"
                      placeholder="e.g. Festival celebrated with joy, school reopens on Monday..."
                      value={holidayForm.description}
                      onChange={e => setHolidayForm({ ...holidayForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddHolidayForm(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateHoliday}
                    disabled={saving}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Festival Holiday"}
                  </button>
                </div>
              </div>
            )}

            {/* Holidays List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    Annual Academic Festival & Vacation Calendar (2026-27)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kul {holidays.length} chhuttiyan tayyar hain. Admin ke paas naya jodne aur delete karne ka full control hai.
                  </p>
                </div>
              </div>

              {holidays.length === 0 ? (
                <div className="text-center py-10 text-slate-400">Koi holiday record nahi mila.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {holidays.map(h => (
                    <div
                      key={h.id}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-slate-900 dark:text-white text-sm">
                            {h.title}
                          </h4>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteHoliday(h.id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            h.type === "festival"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              : h.type === "national"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}>
                            {h.type}
                          </span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                            {h.days} {h.days === 1 ? "Day" : "Days"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-bold">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {h.startDate === h.endDate ? h.startDate : `${h.startDate} to ${h.endDate}`}
                        </span>
                        {h.description && (
                          <span className="truncate max-w-[150px] text-[11px] text-slate-400" title={h.description}>
                            {h.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
