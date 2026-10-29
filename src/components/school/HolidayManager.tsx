// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Calendar, Plus, Trash2, Tag, Sparkles, AlertCircle, ChevronLeft,
  Search, CheckCircle2, Clock, MapPin, Sun, Moon, Info, ShieldAlert
} from "lucide-react";
import {
  getDemoSchoolDataset,
  addCustomHoliday,
  removeCustomHoliday,
  type FestivalHoliday,
  ACADEMIC_MONTHS,
} from "./demoDataStore";

interface Props {
  schoolId: string;
  adminUid?: string;
  schoolName?: string;
  onBack: () => void;
}

export const HolidayManager: React.FC<Props> = ({ schoolId, adminUid, schoolName, onBack }) => {
  const [holidays, setHolidays] = useState<FestivalHoliday[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State for Adding Festival Holiday
  const [form, setForm] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    endDate: "",
    type: "festival" as FestivalHoliday["type"],
    description: "",
    applicableTo: "all",
  });

  const loadHolidays = () => {
    const dataset = getDemoSchoolDataset();
    setHolidays([...dataset.holidays]);
  };

  useEffect(() => {
    loadHolidays();
  }, [schoolId]);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) {
      alert("Kripya Holiday Name aur Date bharein!");
      return;
    }

    const created = addCustomHoliday({
      name: form.name.trim(),
      date: form.date,
      endDate: form.endDate || undefined,
      type: form.type,
      description: form.description.trim() || `${form.name} ki chhutti ghoshit ki gayi hai.`,
    });

    loadHolidays();
    setShowAddModal(false);
    setForm({
      name: "",
      date: new Date().toISOString().split("T")[0],
      endDate: "",
      type: "festival",
      description: "",
      applicableTo: "all",
    });

    setNotification(`✅ "${created.name}" festival holiday kamyabi se add ho gayi! Attendance calendar update ho gaya.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteHoliday = (id: string, name: string) => {
    if (!confirm(`Kya aap "${name}" ko holidays list se hatana chahte hain?`)) return;
    removeCustomHoliday(id);
    loadHolidays();
    setNotification(`🗑️ "${name}" holiday hata di gayi.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter logic
  const filteredHolidays = holidays.filter(h => {
    if (filterType !== "all" && h.type !== filterType) return false;
    if (selectedMonth !== "all" && !h.date.startsWith(selectedMonth)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return h.name.toLowerCase().includes(q) || h.description.toLowerCase().includes(q);
    }
    return true;
  });

  const getTypeBadge = (type: FestivalHoliday["type"]) => {
    switch (type) {
      case "festival":
        return { label: "Festival Holiday", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300" };
      case "national":
        return { label: "National Holiday", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-emerald-300" };
      case "vacation":
        return { label: "School Vacation", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300" };
      case "weather":
        return { label: "Weather / Cold Wave", color: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200 border-cyan-300" };
      case "local":
      default:
        return { label: "Local / Special", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-300" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Wapas jayein"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Festival Holidays & Chhutti Manager
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  1-Year Calendar
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Annual festivals, gazetted holidays aur nayi festival chhutti add karne ka admin power
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Festival Holiday</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-emerald-700 hover:underline text-xs">OK</button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Holidays</p>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">{holidays.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Full 1-Year Academic</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Festivals</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
              {holidays.filter(h => h.type === "festival").length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Diwali, Chhath, Holi, Eid...</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">National Days</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {holidays.filter(h => h.type === "national").length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">15 Aug, 26 Jan, 2 Oct</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vacations & Breaks</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {holidays.filter(h => h.type === "vacation").length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Summer & Winter Breaks</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Festival ya chhutti ka naam khojein (e.g. Diwali, Chhath, Holi)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "Sabhi" },
                { id: "festival", label: "🎉 Festival" },
                { id: "national", label: "🇮🇳 National" },
                { id: "vacation", label: "🏖️ Vacation" },
                { id: "weather", label: "❄️ Weather" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setFilterType(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    filterType === t.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month Selector Pills */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Mahina:</span>
            <button
              onClick={() => setSelectedMonth("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                selectedMonth === "all"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              All 12 Months
            </button>
            {ACADEMIC_MONTHS.map(m => (
              <button
                key={m.code}
                onClick={() => setSelectedMonth(m.code)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                  selectedMonth === m.code
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {m.short}
              </button>
            ))}
          </div>
        </div>

        {/* Holidays List / Cards */}
        {filteredHolidays.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Koi Holiday Match Nahi Hui</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Chune gaye filter ya search ke anusar koi holiday nahi mili. "+ Add Festival Holiday" button se nayi chhutti add karein.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHolidays.map((holiday, idx) => {
              const badge = getTypeBadge(holiday.type);
              const dateObj = new Date(holiday.date);
              const formattedDate = dateObj.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
              });
              const isMultiDay = !!holiday.endDate;
              const formattedEndDate = isMultiDay
                ? new Date(holiday.endDate!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : null;

              return (
                <div
                  key={holiday.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                >
                  {/* Decorative corner tag */}
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                    <div className="absolute transform rotate-45 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 text-[9px] font-black py-0.5 right-[-35px] top-[18px] w-[120px] text-center">
                      {holiday.type.toUpperCase()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2 pr-6 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {!holiday.isPreloaded && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          Admin Added
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-rose-600 transition-colors">
                      {holiday.name}
                    </h3>

                    <div className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>
                        {formattedDate} {isMultiDay && `se ${formattedEndDate} tak`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                      {holiday.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> School Closed
                    </span>

                    {!holiday.isPreloaded ? (
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                        className="text-xs text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold flex items-center gap-1 transition-colors"
                        title="Delete this holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">Gazetted</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Festival Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Add Festival / Special Holiday
                  </h3>
                  <p className="text-xs text-slate-400">Power to declare and record school holidays</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Holiday / Festival Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Local Fair Holiday, Cold Wave Closure, Chhath Additional Day"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Holiday Type
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="festival">🎉 Festival Holiday</option>
                    <option value="national">🇮🇳 National Holiday</option>
                    <option value="vacation">🏖️ Vacation / Break</option>
                    <option value="weather">❄️ Weather / Cold Wave</option>
                    <option value="local">🏛️ Local / Administrative</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Applicable To
                  </label>
                  <select
                    value={form.applicableTo}
                    onChange={e => setForm({ ...form, applicableTo: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="all">Sabhi (Students + Teachers)</option>
                    <option value="students">Sirf Students (Teachers reporting)</option>
                    <option value="primary">Pre-Primary & Primary Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Circular Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Karan ya vivaran likhein (e.g. 'Sheet lahar ke chalte DM ke nirdeshanusar avakash ghoshit')..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  Save & Publish Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
