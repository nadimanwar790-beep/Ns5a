import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Play,
  Search,
  SlidersHorizontal,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import "./_group.css";

type Screen = "create" | "setup";
type LimitMode = "ALL" | "PER_LESSON" | "PER_SUBJECT" | "TOTAL";
type TimerMode = "PER_QUESTION" | "TOTAL_TEST" | "MIX";

const battleSets = [
  { id: "bihar-history", emoji: "🏛️", name: "Bihar SSC — Modern History", subject: "History", questions: 48, tag: "POPULAR", badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "lucent-gk", emoji: "📘", name: "Lucent Samanya Gyan — General Knowledge", subject: "General Knowledge", questions: 72, tag: "LUCENT", badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { id: "indian-polity", emoji: "⚖️", name: "Indian Polity — Fundamental Rights", subject: "Polity", questions: 36, tag: "NOTES", badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  { id: "science-basics", emoji: "🔬", name: "General Science — Basic Concepts", subject: "Science", questions: 54, tag: "NEW", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
];

const sourceControl = "px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500";

export function Current() {
  const [screen, setScreen] = useState<Screen>("create");
  const [roomName, setRoomName] = useState("Mission Bihar SSC & Lucent MCQ Battle");
  const [roomPassword, setRoomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [duration, setDuration] = useState(30);
  const [capacity, setCapacity] = useState(30);
  const [theme, setTheme] = useState("blue");
  const [mcqType, setMcqType] = useState<"PROJECTOR_MODE" | "REVISION_HUB">("PROJECTOR_MODE");
  const [domain, setDomain] = useState<"ACADEMIC" | "COMPETITION">("ACADEMIC");
  const [selectedSet, setSelectedSet] = useState("bihar-history");
  const [search, setSearch] = useState("");
  const [limitMode, setLimitMode] = useState<LimitMode>("ALL");
  const [timerMode, setTimerMode] = useState<TimerMode>("PER_QUESTION");
  const [timerDuration, setTimerDuration] = useState(30);
  const [action, setAction] = useState<"LAUNCH" | "SCHEDULE">("LAUNCH");
  const [upgradeNotice, setUpgradeNotice] = useState(false);

  const isFreeUser = true;
  const filteredSets = battleSets.filter((set) => set.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="study-room-preview min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center p-3 sm:p-4">
        <div className="mb-3 flex w-full max-w-lg items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-950/90 p-1.5 shadow-xl">
          <span className="pl-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Current · Study Room</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setScreen("create")} className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${screen === "create" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>Create room</button>
            <button type="button" onClick={() => setScreen("setup")} className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${screen === "setup" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>Host setup</button>
          </div>
        </div>

        {screen === "create" ? (
          /* Source: GroupStudyModal.tsx — CREATE ROOM MODAL (lines 7224–7424).
             Values and event handlers are local preview state only. */
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3.5 text-slate-100 max-h-[86vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Trophy size={18} className="text-indigo-400" /> Naya MCQ Study Room Banayein
              </h3>
              <button type="button" onClick={() => setScreen("setup")} className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer" aria-label="Close create room and inspect host setup">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); setScreen("setup"); }} className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Room Name:</label>
                <input type="text" required placeholder="e.g. Mission Bihar SSC & Lucent MCQ Battle" value={roomName} onChange={(event) => setRoomName(event.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500" />
              </div>

              {/* Optional Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Password <span className="text-slate-400 font-normal">(Optional / Marzi Hai)</span></span>
                  <span className="text-[10px] text-emerald-400 font-bold">🔓 Khali chhodne par Public</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Khali chhodein ya secret password daalein (e.g. 1234)" value={roomPassword} onChange={(event) => setRoomPassword(event.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none pr-10 shadow-inner" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Agar password khali chhodenge to koi bhi student direct confirmation ke sath room me enter kar sakega.</p>
              </div>

              {/* Informational Card: MCQ Mode & Chapter Selection happens inside the Room Lobby */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 text-xs text-slate-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <div className="space-y-1">
                  <p className="font-bold text-white text-xs">MCQ Mode & Chapter Selection:</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">Room banne ke baad aap Room Lobby me <b>🎯 MCQ Mode</b> ya <b>⚡ MCQ + Mode</b> chunn sakte hain, question choose karke turant <b>🚀 Launch</b> ya <b>⏰ Schedule</b> kar sakte hain.</p>
                </div>
              </div>

              {/* Room Duration Selection based on Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Duration (Time Limit):</span>
                  <span className="text-[10px] text-amber-300 font-bold">30 Min Max (Free Plan)</span>
                </label>
                <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none">
                  {[15, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} Minutes</option>)}
                </select>
              </div>

              {/* Room Capacity (Max Members) Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Capacity (Kitne Log Jud Sakenge):</span>
                  <button type="button" onClick={() => setUpgradeNotice(!upgradeNotice)} className="text-[10px] text-amber-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"><span>ℹ️ Rules Dekhein</span></button>
                </label>
                <select value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
                  <option value={30}>🎯 30 Members (Standard Batch - Recommended for Best Speed)</option>
                  <option value={15}>👥 15 Members (Small Study Circle - Ultra Fast)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">💡 Zero-lag atomic live sync ke sath 100 students tak bina kisi rukawat ke live quiz khel sakte hain.</p>
              </div>

              {/* ── ROOM COLOR THEME SELECTOR ── */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Room Theme / Color:</span>
                  <span className="text-[10px] text-indigo-300 font-bold">{theme === "blue" ? "🔵 Midnight Blue" : theme === "black" ? "⚫ AMOLED Black" : "⚪ Clean White"}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["blue", "black", "white"] as const).map((color) => (
                    <button key={color} type="button" onClick={() => setTheme(color)} className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${theme === color ? color === "blue" ? "bg-indigo-600/30 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-500" : color === "black" ? "bg-zinc-900 border-zinc-500 text-white shadow-sm ring-1 ring-zinc-400" : "bg-white border-slate-300 text-slate-900 shadow-sm ring-1 ring-slate-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"}`}>
                      <span>{color === "blue" ? "🔵 Blue" : color === "black" ? "⚫ Black" : "⚪ White"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px]">
                <span className="text-slate-400">Daily Room Limit:</span>
                <span className="font-bold"><span className="text-indigo-300 font-bold">1/2 Used Today (FREE Plan)</span></span>
              </div>
              {upgradeNotice && <p className="text-[10px] text-amber-300">Free plan limits: 30 min maximum · up to 30 members · 2 rooms each day.</p>}
              <button type="submit" className="w-full py-3 rounded-xl font-black text-xs text-white shadow-xl active:scale-95 transition cursor-pointer shrink-0 bg-indigo-600">🚀 Room Banayein (Lobby Kholein)</button>
            </form>
          </div>
        ) : (
          <section className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl max-h-[86vh] flex flex-col">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Room Lobby · Host Setup</p>
                <h2 className="mt-0.5 truncate text-sm font-black text-white">{roomName || "Naya MCQ Study Room"}</h2>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">FREE HOST</span>
            </div>
            <div className="overflow-y-auto pr-1">
              {/* Source: GroupStudyModal.tsx — host setup and question selection
                  (lines 4394–5620). UI classes/order are extracted; app services,
                  lesson catalog and host callbacks are isolated and mocked here. */}
              <div className="space-y-3.5 max-w-lg mx-auto pt-2 text-left">
                {/* 1. Mode Switcher (🎯 MCQ vs ⚡ MCQ +) */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200 flex items-center gap-1.5"><span>1. MCQ Battle Mode:</span></span>
                    <span className="text-[10px] font-bold text-slate-400">{mcqType === "REVISION_HUB" ? "⚡ MCQ + Active" : "🎯 MCQ Mode Active"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setMcqType("PROJECTOR_MODE")} className={`p-2.5 rounded-xl border text-left cursor-pointer transition relative ${mcqType !== "REVISION_HUB" ? "bg-cyan-600/30 border-cyan-400 text-white shadow ring-1 ring-cyan-500/50" : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"}`}>
                      <div className="flex items-center justify-between"><span className="text-xs font-black flex items-center gap-1"><span>🎯</span> MCQ Mode</span>{mcqType !== "REVISION_HUB" && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}</div>
                      <p className="text-[9px] text-slate-300 mt-0.5">Syllabus & All Competition Books</p>
                    </button>
                    <button type="button" onClick={() => { if (isFreeUser) { setUpgradeNotice(true); return; } setMcqType("REVISION_HUB"); }} className={`p-2.5 rounded-xl border text-left cursor-pointer transition relative ${isFreeUser ? "bg-slate-950/50 border-slate-800 text-slate-500 hover:border-amber-500/40" : mcqType === "REVISION_HUB" ? "bg-purple-600/30 border-purple-400 text-white shadow ring-1 ring-purple-500/50" : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"}`}>
                      <div className="flex items-center justify-between"><span className="text-xs font-black flex items-center gap-1"><span>⚡</span> MCQ + Mode {isFreeUser && <span className="text-[10px] text-amber-400 font-bold ml-1">🔒 PRO</span>}</span></div>
                      <p className="text-[9px] text-slate-300 mt-0.5">{isFreeUser ? "🔒 Pro/Ultra Host Only (Locked)" : "Revision Hub & Only Lucent Comp"}</p>
                    </button>
                  </div>

                  {/* 1.1 Sub-Category: Academic Syllabus vs Competition */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1"><span>2. Section Chunein:</span></span>
                      <span className="text-[9px] text-amber-300 font-bold">{mcqType === "REVISION_HUB" ? "⚡ Board Syllabus" : domain === "COMPETITION" ? "🎯 Sabhi Competition Books" : "🎯 Academic Notes & HW"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button type="button" onClick={() => setDomain("ACADEMIC")} className={`px-3 py-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${domain === "ACADEMIC" ? "bg-cyan-600 text-white border-cyan-400 shadow" : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"}`}><span>📚</span><span>Academic Syllabus</span></button>
                      <button type="button" onClick={() => setDomain("COMPETITION")} className={`px-3 py-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${domain === "COMPETITION" ? "bg-amber-600 text-white border-amber-400 shadow" : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"}`}><span>🏆</span><span>Competition {mcqType === "REVISION_HUB" ? "(Only Lucent)" : "(All Books)"}</span></button>
                    </div>
                  </div>
                </div>

                {/* 2. Advanced Exam Timer Mode Controller (Host Setup) */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5"><Clock size={15} className="text-amber-400" /> Test Timing Mode:</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{timerMode === "PER_QUESTION" ? "⚡ Per-Question" : timerMode === "TOTAL_TEST" ? "⏱️ Full Exam Mode" : "📳 Mix / Alert Mode"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button type="button" onClick={() => setTimerMode("PER_QUESTION")} className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${timerMode === "PER_QUESTION" ? "bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md" : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"}`}>
                      <div className="flex items-center justify-between mb-1"><span className="text-xs font-black text-amber-300 flex items-center gap-1">⚡ Per-Question</span>{timerMode === "PER_QUESTION" && <span className="w-2 h-2 rounded-full bg-amber-400" />}</div>
                      <p className="text-[10px] text-slate-300 leading-snug">Har sawal ka fix timer (10s-60s). Auto-next rapid fire battle.</p>
                    </button>
                    <button type="button" onClick={() => setTimerMode("TOTAL_TEST")} className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${timerMode === "TOTAL_TEST" ? "bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400/50 shadow-md" : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"}`}>
                      <div className="flex items-center justify-between mb-1"><span className="text-xs font-black text-emerald-300 flex items-center gap-1">⏱️ Total Test Time</span>{timerMode === "TOTAL_TEST" && <span className="w-2 h-2 rounded-full bg-emerald-400" />}</div>
                      <p className="text-[10px] text-slate-300 leading-snug">Pura test ka timer. Question Grid se jump & time up par auto-submit.</p>
                    </button>
                    <button type="button" onClick={() => setTimerMode("MIX")} className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${timerMode === "MIX" ? "bg-purple-500/20 border-purple-400 text-white ring-1 ring-purple-400/50 shadow-md" : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"}`}>
                      <div className="flex items-center justify-between mb-1"><span className="text-xs font-black text-purple-300 flex items-center gap-1">📳 Mix (Vibrate Alert)</span>{timerMode === "MIX" && <span className="w-2 h-2 rounded-full bg-purple-400" />}</div>
                      <p className="text-[10px] text-slate-300 leading-snug">No auto-next. Time hone par mobile vibrate karega & Grid se switch.</p>
                    </button>
                  </div>
                  {timerMode === "PER_QUESTION" && <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-300">Har Sawal Ka Time:</span><span className="text-xs font-black text-amber-400">{timerDuration} Sec</span></div>
                    <div className="grid grid-cols-6 gap-1.5">{[10, 15, 20, 30, 45, 60].map((sec) => <button key={sec} type="button" onClick={() => setTimerDuration(sec)} className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${timerDuration === sec ? "bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{sec}s</button>)}</div>
                  </div>}
                </div>

                {/* 3. Filter Section based on Mode & Domain — Academic syllabus */}
                <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-cyan-300">Class Chunein:</span><span className="text-[10px] text-slate-400 font-bold">Notes & Homework Sets</span></div>
                    <div className="flex flex-wrap gap-1">
                      {["Sabhi Classes", "Class 10", "Class 11", "Class 12"].map((label, index) => <button key={label} type="button" className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${index === 1 ? "bg-cyan-500 text-slate-950 shadow-md" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"}`}>{label}</button>)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-cyan-300 block">Category:</span>
                    <div className="flex flex-wrap gap-1">
                      {["Sabhi", "📖 Notes ke MCQs", "📝 Homework"].map((label, index) => <button key={label} type="button" className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${index === 0 ? "bg-cyan-500 text-slate-950 shadow-md" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"}`}>{label}</button>)}
                    </div>
                  </div>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="🔍 Lesson ka naam search karein (Math, Science, Chapter)..." className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400" />
                  </div>
                </div>

                {/* 4. Lesson Selection List with Multi-Select Powers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><span className="text-cyan-300 flex items-center gap-1.5"><BookOpen size={14} className="text-cyan-400" /><span>Lesson Chunein:</span></span></span>
                    <span className="text-[10px] font-black text-slate-400">{filteredSets.length} Lessons Uplabdh</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400 text-[10px]">🎓 Free Host: Single lesson battle test</span>
                    <button type="button" onClick={() => setUpgradeNotice(!upgradeNotice)} className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">Multiple Lessons Unlock Karein →</button>
                  </div>
                  {upgradeNotice && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200">⭐ Basic & Ultra Host: Multi-Lesson Battle — upgrade to choose multiple lessons.</p>}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {filteredSets.map((set) => {
                      const isSelected = selectedSet === set.id;
                      return <div key={set.id} onClick={() => setSelectedSet(set.id)} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-left ${isSelected ? "bg-cyan-600/25 border-cyan-400 text-white ring-1 ring-cyan-500/50 shadow-md" : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
                        <input type="radio" name="mcqSet" checked={isSelected} onChange={() => setSelectedSet(set.id)} className="w-4 h-4 text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer shrink-0" />
                        <span className="text-xl shrink-0">{set.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5"><p className="text-xs font-black truncate">{set.name}</p><span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 ${set.badgeColor}`}>{set.tag}</span></div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{set.questions} Questions • {set.subject || "General"}</p>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="shrink-0 text-cyan-400" />}
                      </div>;
                    })}
                  </div>
                </div>

                {/* ── QUESTION LIMIT & CUSTOMIZATION PANEL (Basic & Ultra) ── */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200 flex items-center gap-1.5"><SlidersHorizontal size={14} className="text-amber-400" /><span>Question Limits & Order (🔒 Basic & Ultra)</span></span>
                    <button type="button" onClick={() => setUpgradeNotice(!upgradeNotice)} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black cursor-pointer">Upgrade Power ⚡</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([{ id: "ALL", label: "Sabhi (All)" }, { id: "PER_LESSON", label: "Per Lesson" }, { id: "PER_SUBJECT", label: "Per Subject" }, { id: "TOTAL", label: "Total Limit" }] as const).map((mode) => <button key={mode.id} type="button" onClick={() => { if (mode.id !== "ALL") setUpgradeNotice(true); else setLimitMode(mode.id); }} className={`py-1.5 px-1 rounded-xl text-[10px] font-black transition cursor-pointer text-center ${limitMode === mode.id ? "bg-amber-500 text-slate-950 font-black shadow" : "bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white"}`}>{mode.label}</button>)}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-[11px] text-slate-300 font-bold">Sawaal Ka Order:</span>
                    <div className="flex items-center gap-1.5"><button type="button" className="px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">🎲 Shuffled (Random)</button><button type="button" className="px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer bg-slate-800 text-slate-400">📋 Sequential</button></div>
                  </div>
                </div>

                {/* ── ULTRA USER QUESTION INSPECTOR CARD ── */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 to-purple-950/40 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5"><span className="text-xs font-black text-amber-300 flex items-center gap-1">👑 Ultra Question Inspector</span><span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">ULTRA VIP</span></div>
                    <p className="text-[10px] text-slate-300 mt-0.5">Host sare questions scroll karke padh aur select kar sakta hai (Ultra exclusive)</p>
                  </div>
                  <button type="button" onClick={() => setUpgradeNotice(true)} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer shrink-0">🔍 Sawal Chunein (48)</button>
                </div>

                {/* 5. Launch or Schedule Action Section (Last Step after choosing questions) */}
                <div className="space-y-3 pt-1">
                  <div className="p-1 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => setAction("LAUNCH")} className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${action === "LAUNCH" ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}><Play size={13} className="fill-current" /><span>🚀 Abhi Shuru Karein</span></button>
                    <button type="button" onClick={() => { setAction("SCHEDULE"); setUpgradeNotice(true); }} className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${action === "SCHEDULE" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}><Clock size={13} /><span>⏰ Schedule Karein</span><span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">VIP</span></button>
                  </div>
                  {action === "SCHEDULE" ? <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between"><span className="text-xs font-black text-amber-300 flex items-center gap-1.5"><Clock size={14} className="text-amber-400" /> Test Shuru Hone Ka Samay Set Karein:</span><span className="text-[10px] font-bold text-slate-400">24-Hour Format</span></div>
                    <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-400">Date:<input type="date" className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white" /></label><label className="text-[10px] font-bold text-slate-400">Time:<input type="time" className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white" /></label></div>
                    <p className="text-[10px] text-amber-300">Schedule test is available to Basic and Ultra members.</p>
                  </div> : <button type="button" onClick={() => setScreen("create")} className={`w-full py-3.5 rounded-xl font-black text-sm shadow-xl active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 ${mcqType === "REVISION_HUB" ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-900/30"}`}><Play size={16} className="fill-current" /><span>🚀 Launch MCQ Battle Now ({timerDuration}s/Q)</span></button>}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
      <span className="sr-only"><Crown /> Mock preview uses local state and example lessons only.</span>
    </main>
  );
}
