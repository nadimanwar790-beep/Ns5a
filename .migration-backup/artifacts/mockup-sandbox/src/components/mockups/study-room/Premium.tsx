import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Crown,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Play,
  Search,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import "./_group.css";

type Screen = "create" | "setup";
type TimerMode = "PER_QUESTION" | "TOTAL_TEST" | "MIX";
type Lesson = { id: string; name: string; subject: string; questions: number; tag: string };

const lessons: Lesson[] = [
  { id: "bihar-history", name: "Bihar SSC — Modern History", subject: "History", questions: 48, tag: "POPULAR" },
  { id: "lucent-gk", name: "Lucent Samanya Gyan — General Knowledge", subject: "General Knowledge", questions: 72, tag: "LUCENT" },
  { id: "indian-polity", name: "Indian Polity — Fundamental Rights", subject: "Polity", questions: 36, tag: "NOTES" },
  { id: "science-basics", name: "General Science — Basic Concepts", subject: "Science", questions: 54, tag: "NEW" },
];

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

export function Premium() {
  const [screen, setScreen] = useState<Screen>("create");
  const [roomName, setRoomName] = useState("Mission Bihar SSC & Lucent MCQ Battle");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [duration, setDuration] = useState(30);
  const [capacity, setCapacity] = useState(30);
  const [theme, setTheme] = useState("blue");
  const [mcqType, setMcqType] = useState<"PROJECTOR_MODE" | "REVISION_HUB">("PROJECTOR_MODE");
  const [domain, setDomain] = useState<"ACADEMIC" | "COMPETITION">("ACADEMIC");
  const [search, setSearch] = useState("");
  const [selectedLesson, setSelectedLesson] = useState("bihar-history");
  const [timerMode, setTimerMode] = useState<TimerMode>("PER_QUESTION");
  const [timerDuration, setTimerDuration] = useState(30);
  const [totalMinutes, setTotalMinutes] = useState(30);
  const [mixPace, setMixPace] = useState(30);
  const [limitMode, setLimitMode] = useState("ALL");
  const [order, setOrder] = useState<"SHUFFLED" | "SEQUENTIAL">("SHUFFLED");
  const [classFilter, setClassFilter] = useState("Class 10");
  const [category, setCategory] = useState("Sabhi");
  const [action, setAction] = useState<"LAUNCH" | "SCHEDULE">("LAUNCH");
  const [upgradeNotice, setUpgradeNotice] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const filteredLessons = useMemo(
    () => lessons.filter((lesson) => lesson.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  );
  const isFreeUser = true;

  const smallLabel = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#707d8c]";
  const field = "w-full rounded-xl border border-[#d9e0e3] bg-[#fbfcfa] px-3.5 py-2.5 text-[13px] text-[#1e2b38] outline-none transition placeholder:text-[#a5afb7] focus:border-[#428b83] focus:ring-2 focus:ring-[#428b83]/10";
  const section = "rounded-2xl border border-[#dfe5e5] bg-[#fffefa] p-4 sm:p-[18px]";
  const mutedButton = "rounded-xl border border-[#dfe4e4] bg-[#fbfcfa] text-[#5f6d78] transition hover:border-[#abbcba] hover:text-[#253840]";

  return (
    <main className="premium-room min-h-[100dvh] bg-[#e9efed] px-3 py-5 text-[#25333e] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-[1100px] flex-col">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d454a] text-[#f3f4e9] shadow-sm">
              <BookOpen size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#73817f]">Sankalp · Live assessment</p>
              <p className="mt-0.5 text-sm font-semibold tracking-[-0.02em] text-[#20323a]">Study Room</p>
            </div>
          </div>
          <div className="flex rounded-xl border border-[#d3ddda] bg-[#f7f9f6] p-1">
            {(["create", "setup"] as const).map((tab, index) => (
              <button
                key={tab}
                type="button"
                onClick={() => setScreen(tab)}
                className={cx(
                  "rounded-lg px-3.5 py-2 text-[11px] font-semibold transition",
                  screen === tab ? "bg-[#244c50] text-white shadow-sm" : "text-[#687773] hover:text-[#233b3d]",
                )}
              >
                <span className="mr-1.5 font-mono text-[9px] opacity-70">0{index + 1}</span>
                {tab === "create" ? "Create room" : "Host setup"}
              </button>
            ))}
          </div>
        </header>

        {screen === "create" ? (
          <div className="mx-auto grid w-full max-w-[920px] flex-1 overflow-hidden rounded-[26px] border border-[#d8e1de] bg-[#f8f9f5] shadow-[0_20px_60px_rgba(39,64,62,0.10)] md:grid-cols-[0.78fr_1.22fr]">
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#20484c] p-8 text-[#f3f4ec] md:flex">
              <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-white/10" />
              <div className="absolute -right-12 -top-8 h-48 w-48 rounded-full border border-white/10" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#d1dfd8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c9a66b]" /> HOST WORKSPACE
                </span>
                <h1 className="mt-8 max-w-[280px] font-['DM_Sans'] text-[32px] font-semibold leading-[1.08] tracking-[-0.05em]">
                  Set the room.
                  <br />Set the standard.
                </h1>
                <p className="mt-4 max-w-[270px] text-[13px] leading-6 text-[#c1d1cc]">
                  Ek focused live room mein apne batch ke saath MCQ test conduct karein.
                </p>
              </div>
              <div className="relative border-t border-white/15 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a7bfba]">Room setup</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">01</div>
                  <div className="h-px flex-1 bg-white/20" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-xs">02</div>
                  <div className="h-px flex-1 bg-white/20" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-xs">03</div>
                </div>
                <div className="mt-2 flex justify-between text-[9px] text-[#a7bfba]">
                  <span>Room</span><span>Test setup</span><span>Launch</span>
                </div>
              </div>
            </aside>
            <section className="flex min-h-0 flex-col p-5 sm:p-8">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72817e]">01 / Room details</p>
                  <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.04em] text-[#22353b]">Naya study room banayein</h2>
                  <p className="mt-1 text-xs text-[#76827f]">Pehle room details set karein. Test lobby mein configure hoga.</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e0e5e1] bg-white text-[#395f60]">
                  <Trophy size={17} />
                </div>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); setScreen("setup"); }} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <div>
                  <label className={smallLabel}>Room name</label>
                  <input required value={roomName} onChange={(event) => setRoomName(event.target.value)} className={field} placeholder="e.g. Mission Bihar SSC & Lucent MCQ Battle" />
                </div>
                <div>
                  <label className={smallLabel}>Room password <span className="normal-case tracking-normal text-[#9aa49f]">(optional / marzi hai)</span></label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className={`${field} pr-11`} placeholder="Password khali chhod sakte hain" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8985] hover:text-[#31595a]" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#73817b]"><Info size={12} className="text-[#528779]" /> Khali chhodne par room public rahega; student confirmation ke baad join kar sakte hain.</p>
                </div>
                <div className="flex gap-3 rounded-xl border border-[#dce6df] bg-[#edf4ef] p-3.5">
                  <div className="mt-0.5 text-[#45766c]"><Info size={16} /></div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#345b52]">MCQ mode aur chapter selection lobby mein</p>
                    <p className="mt-1 text-[11px] leading-[1.6] text-[#647771]">Room banne ke baad MCQ Mode ya MCQ + Mode chunein, questions select karein aur test turant launch ya schedule karein.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={smallLabel}>Room duration <span className="normal-case tracking-normal text-[#b08b52]">· 30 min max</span></label>
                    <div className="relative">
                      <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className={`${field} appearance-none pr-8`}>
                        {[15, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                      </select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7c8985]" />
                    </div>
                  </div>
                  <div>
                    <label className={smallLabel}>Room capacity <button type="button" onClick={() => setUpgradeNotice(!upgradeNotice)} className="normal-case tracking-normal text-[#a27f4b] hover:underline">Rules dekhein</button></label>
                    <div className="relative">
                      <select value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className={`${field} appearance-none pr-8`}>
                        <option value={30}>30 members · Standard batch</option><option value={15}>15 members · Study circle</option>
                      </select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7c8985]" />
                    </div>
                  </div>
                </div>
                <p className="-mt-2 text-[10px] leading-relaxed text-[#87918c]">Live sync ke saath room mein participants real-time test de sakte hain.</p>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className={smallLabel + " mb-0"}>Room theme / color</label>
                    <span className="text-[10px] font-semibold text-[#6c827c]">{theme === "blue" ? "Midnight blue" : theme === "black" ? "AMOLED black" : "Clean white"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([{ id: "blue", label: "Blue", swatch: "#244e55" }, { id: "black", label: "Black", swatch: "#273136" }, { id: "white", label: "White", swatch: "#f7f8f4" }] as const).map((option) => (
                      <button key={option.id} type="button" onClick={() => setTheme(option.id)} className={cx("flex items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition", theme === option.id ? "border-[#4d827a] bg-[#edf4f0] text-[#294c4a] ring-1 ring-[#4d827a]/20" : "border-[#dfe4e0] bg-[#fbfcfa] text-[#65716e] hover:border-[#aabbb5]")}>
                        <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: option.swatch }} />{option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#e0e5e1] bg-[#f2f5f1] px-3.5 py-3 text-[11px]">
                  <span className="text-[#75817c]">Daily room limit</span><span className="font-semibold text-[#4b6d66]">1 / 2 used today <span className="font-normal text-[#89948e]">· Free plan</span></span>
                </div>
                {upgradeNotice && <p className="rounded-lg border border-[#dfcda9] bg-[#f7f1e6] px-3 py-2 text-[10px] leading-relaxed text-[#816c4c]">Free plan limits: 30 min maximum · up to 30 members · 2 rooms each day.</p>}
                <button type="submit" className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#244f53] px-4 py-3 text-[12px] font-semibold text-white shadow-[0_6px_14px_rgba(36,79,83,0.16)] transition hover:bg-[#1c4246] active:scale-[0.99]">
                  Create room <span className="text-white/60">·</span> Open lobby <ArrowLeft size={15} className="rotate-180" />
                </button>
              </form>
            </section>
          </div>
        ) : (
          <section className="mx-auto flex min-h-0 w-full max-w-[920px] flex-1 flex-col overflow-hidden rounded-[26px] border border-[#d8e1de] bg-[#f8f9f5] shadow-[0_20px_60px_rgba(39,64,62,0.10)]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e6e2] bg-[#fbfcf9] px-5 py-4 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setScreen("create")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dfe5e2] text-[#64746f] transition hover:bg-[#eef3ef]" aria-label="Back to room details"><ArrowLeft size={15} /></button>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#7e8984]">Room lobby <span className="mx-1 text-[#b3bcb6]">/</span> Host setup</p>
                  <h1 className="mt-0.5 truncate text-[14px] font-semibold tracking-[-0.02em] text-[#263940]">{roomName || "Naya MCQ Study Room"}</h1>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e4dc] bg-[#eef5ef] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#507568]"><span className="h-1.5 w-1.5 rounded-full bg-[#6a9b7f]" /> Free host</span>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
              <div className="mx-auto max-w-[700px] space-y-3.5">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#73827d]">02 / Configure assessment</p><h2 className="mt-1 text-[20px] font-semibold tracking-[-0.045em] text-[#20343a]">Test ko taiyaar karein</h2></div>
                  <span className="hidden text-[10px] text-[#8a9590] sm:block">Step 2 of 3 <span className="ml-2 inline-flex gap-1 align-middle"><i className="h-1.5 w-5 rounded-full bg-[#4d8177]" /><i className="h-1.5 w-5 rounded-full bg-[#4d8177]" /><i className="h-1.5 w-5 rounded-full bg-[#d6ddda]" /></span></span>
                </div>

                <div className={section}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#83908b]">01 · Format & section</p><h3 className="mt-1 text-[13px] font-semibold text-[#2d4147]">MCQ Battle Mode</h3></div>
                    <span className="rounded-lg bg-[#edf3ef] px-2.5 py-1.5 text-[9px] font-semibold text-[#53736b]">{mcqType === "REVISION_HUB" ? "MCQ + active" : "MCQ mode active"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setMcqType("PROJECTOR_MODE")} className={cx("rounded-xl border p-3 text-left transition", mcqType === "PROJECTOR_MODE" ? "border-[#56837c] bg-[#eff5f1] ring-1 ring-[#56837c]/15" : "border-[#e2e7e3] bg-[#fbfcfa] hover:border-[#b7c7c0]")}>
                      <span className="flex items-center justify-between text-[12px] font-semibold text-[#2c4b4b]">MCQ Mode {mcqType === "PROJECTOR_MODE" && <Check size={14} className="text-[#548376]" />}</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-[#7d8983]">Syllabus & all competition books</span>
                    </button>
                    <button type="button" onClick={() => { if (isFreeUser) { setUpgradeNotice(true); return; } setMcqType("REVISION_HUB"); }} className={cx("rounded-xl border p-3 text-left transition", isFreeUser ? "border-[#e5e1d8] bg-[#f7f6f1] text-[#8d8b81] hover:border-[#d5c7a8]" : mcqType === "REVISION_HUB" ? "border-[#8c7d69] bg-[#f4f0e8]" : "border-[#e2e7e3] bg-[#fbfcfa] hover:border-[#b7c7c0]")}>
                      <span className="flex items-center justify-between text-[12px] font-semibold text-[#46524f]">MCQ + Mode <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#9a7c4c]"><LockKeyhole size={11} /> PRO</span></span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-[#898f88]">Revision Hub · Pro / Ultra host only</span>
                    </button>
                  </div>
                  <div className="mt-3 border-t border-[#e8ece8] pt-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-[#50605e]">02 · Section chunein</span><span className="text-[9px] text-[#89938d]">{domain === "ACADEMIC" ? "Academic notes & HW" : "Sabhi competition books"}</span></div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setDomain("ACADEMIC")} className={cx("rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition", domain === "ACADEMIC" ? "border-[#4f817a] bg-[#315f60] text-white" : mutedButton)}>Academic syllabus</button>
                      <button type="button" onClick={() => setDomain("COMPETITION")} className={cx("rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition", domain === "COMPETITION" ? "border-[#b08a54] bg-[#95784d] text-white" : mutedButton)}>Competition {mcqType === "REVISION_HUB" ? "(Only Lucent)" : "(All books)"}</button>
                    </div>
                  </div>
                </div>

                <div className={section}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5f0e5] text-[#99794a]"><Clock3 size={15} /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#87928b]">03 · Timing</p><h3 className="text-[13px] font-semibold text-[#2d4147]">Test timing mode</h3></div></div>
                    <span className="rounded-lg border border-[#e4e8e1] bg-[#f5f6f1] px-2.5 py-1.5 text-[9px] font-semibold text-[#64736d]">{timerMode === "PER_QUESTION" ? "Per-question" : timerMode === "TOTAL_TEST" ? "Full exam" : "Mix / alert"}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([
                      ["PER_QUESTION", "Per-question", "Har sawal ka fix timer. Auto-next rapid-fire battle."],
                      ["TOTAL_TEST", "Total test time", "Pura test ka timer. Grid se jump; time up par auto-submit."],
                      ["MIX", "Mix · alert mode", "No auto-next. Time hone par alert; grid se switch karein."],
                    ] as const).map(([value, title, description]) => (
                      <button key={value} type="button" onClick={() => setTimerMode(value)} className={cx("rounded-xl border p-3 text-left transition", timerMode === value ? "border-[#b89a67] bg-[#f7f2e8] ring-1 ring-[#b89a67]/15" : "border-[#e2e7e3] bg-[#fbfcfa] hover:border-[#c4cfc9]")}>
                        <span className="flex items-center justify-between text-[11px] font-semibold text-[#4f554c]">{title}{timerMode === value && <Check size={13} className="text-[#9c8050]" />}</span>
                        <span className="mt-1.5 block text-[9px] leading-[1.55] text-[#808982]">{description}</span>
                      </button>
                    ))}
                  </div>
                  {timerMode === "PER_QUESTION" && <div className="mt-3 border-t border-[#e8ece8] pt-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-[#58655f]">Har sawal ka time</span><span className="font-mono text-[11px] font-semibold text-[#8d744a]">{timerDuration} sec</span></div><div className="grid grid-cols-6 gap-1.5">{[10, 15, 20, 30, 45, 60].map((sec) => <button key={sec} type="button" onClick={() => setTimerDuration(sec)} className={cx("rounded-lg py-2 font-mono text-[10px] font-semibold transition", timerDuration === sec ? "bg-[#b59866] text-white" : "bg-[#f2f4ef] text-[#69756e] hover:bg-[#e8ede7]")}>{sec}s</button>)}</div></div>}
                  {(timerMode === "TOTAL_TEST" || timerMode === "MIX") && <div className="mt-3 border-t border-[#e8ece8] pt-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-[#58655f]">Total exam time</span><span className="font-mono text-[11px] font-semibold text-[#648475]">{totalMinutes} min</span></div><div className="grid grid-cols-7 gap-1">{[5, 10, 15, 20, 30, 45, 60].map((minute) => <button key={minute} type="button" onClick={() => setTotalMinutes(minute)} className={cx("rounded-lg py-2 font-mono text-[9px] font-semibold transition", totalMinutes === minute ? "bg-[#628778] text-white" : "bg-[#f2f4ef] text-[#69756e] hover:bg-[#e8ede7]")}>{minute}m</button>)}</div>{timerMode === "MIX" && <div className="mt-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-[#58655f]">Ideal question pace · alert</span><span className="font-mono text-[11px] font-semibold text-[#8d744a]">{mixPace} sec</span></div><div className="grid grid-cols-5 gap-1.5">{[15, 20, 30, 45, 60].map((sec) => <button key={sec} type="button" onClick={() => setMixPace(sec)} className={cx("rounded-lg py-2 font-mono text-[10px] font-semibold transition", mixPace === sec ? "bg-[#b59866] text-white" : "bg-[#f2f4ef] text-[#69756e] hover:bg-[#e8ede7]")}>{sec}s</button>)}</div></div>}</div>}
                </div>

                <div className={section}>
                  <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#83908b]">04 · Academic filters</p><h3 className="mt-1 text-[13px] font-semibold text-[#2d4147]">Class & category</h3></div><span className="text-[9px] font-medium text-[#87938d]">Notes & homework sets</span></div>
                  <p className={smallLabel}>Class chunein</p><div className="mb-3 flex flex-wrap gap-1.5">{["Sabhi Classes", "Class 10", "Class 11", "Class 12"].map((label) => <button key={label} type="button" onClick={() => setClassFilter(label)} className={cx("rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition", classFilter === label ? "bg-[#315f60] text-white" : mutedButton)}>{label}</button>)}</div>
                  <p className={smallLabel}>Category</p><div className="mb-3 flex flex-wrap gap-1.5">{["Sabhi", "Notes ke MCQs", "Homework"].map((label) => <button key={label} type="button" onClick={() => setCategory(label)} className={cx("rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition", category === label ? "bg-[#315f60] text-white" : mutedButton)}>{label}</button>)}</div>
                  <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#929e97]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${field} pl-9`} placeholder="Lesson search karein: Math, Science, Chapter..." /></div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#83908b]">05 · Question source</p><h3 className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-[#2d4147]"><BookOpen size={14} className="text-[#58847a]" /> Lesson chunein</h3></div><span className="text-[10px] font-medium text-[#87918c]">{filteredLessons.length} lessons available</span></div>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e0e6e1] bg-[#f1f4ef] px-3 py-2.5"><span className="text-[10px] text-[#718078]">Free host: single lesson battle test</span><button type="button" onClick={() => setUpgradeNotice(!upgradeNotice)} className="shrink-0 text-[10px] font-semibold text-[#93794c] hover:underline">Multiple lessons unlock karein</button></div>
                  {upgradeNotice && <p className="rounded-lg border border-[#dfcda9] bg-[#f7f1e6] p-2.5 text-[10px] text-[#816c4c]">Basic & Ultra Host: Multi-Lesson Battle — upgrade to choose multiple lessons.</p>}
                  <div className="space-y-1.5">
                    {filteredLessons.length ? filteredLessons.map((lesson) => {
                      const selected = selectedLesson === lesson.id;
                      return <button key={lesson.id} type="button" onClick={() => setSelectedLesson(lesson.id)} className={cx("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition", selected ? "border-[#57867d] bg-[#eff5f1] ring-1 ring-[#57867d]/15" : "border-[#e1e7e2] bg-[#fffefa] hover:border-[#b8c8c1]")}>
                        <span className={cx("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-[#528277] bg-[#528277] text-white" : "border-[#bdc8c2]")}>{selected && <Check size={10} />}</span>
                        <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-[11px] font-semibold text-[#34464b]">{lesson.name}</span><span className="rounded border border-[#e0e6de] bg-[#f4f6f0] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.08em] text-[#748277]">{lesson.tag}</span></span><span className="mt-1 block text-[9px] text-[#849089]">{lesson.questions} questions <span className="mx-1 text-[#c5ccc6]">·</span>{lesson.subject}</span></span>
                        <CheckCircle2 size={15} className={cx("shrink-0", selected ? "text-[#528277]" : "text-transparent")} />
                      </button>;
                    }) : <div className="rounded-xl border border-dashed border-[#d5ded8] bg-[#f5f7f3] px-4 py-6 text-center"><Search size={17} className="mx-auto text-[#91a098]" /><p className="mt-2 text-[11px] font-semibold text-[#65736c]">Koi lesson nahi mila</p><p className="mt-1 text-[10px] text-[#929c95]">Search ko edit karke phir try karein.</p></div>}
                  </div>
                </div>

                <div className={section}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><SlidersHorizontal size={14} className="text-[#9b8052]" /><h3 className="text-[12px] font-semibold text-[#39494a]">Question limits & order</h3><span className="text-[9px] text-[#92866f]">Basic & Ultra</span></div><button type="button" onClick={() => setUpgradeNotice(!upgradeNotice)} className="rounded-lg border border-[#e4d5b7] bg-[#f7f2e8] px-2.5 py-1.5 text-[9px] font-semibold text-[#8b724b]">Upgrade options</button></div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{[{ id: "ALL", label: "Sabhi (All)" }, { id: "PER_LESSON", label: "Per lesson" }, { id: "PER_SUBJECT", label: "Per subject" }, { id: "TOTAL", label: "Total limit" }].map((mode) => <button key={mode.id} type="button" onClick={() => { if (mode.id !== "ALL") setUpgradeNotice(true); else setLimitMode(mode.id); }} className={cx("rounded-lg px-2 py-2 text-[9px] font-semibold transition", limitMode === mode.id ? "bg-[#b59866] text-white" : mutedButton)}>{mode.label}</button>)}</div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8ece8] pt-3"><span className="text-[10px] font-semibold text-[#67746e]">Sawaal ka order</span><div className="flex gap-1.5">{([["SHUFFLED", "Shuffled · Random"], ["SEQUENTIAL", "Sequential"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setOrder(value)} className={cx("rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold transition", order === value ? "border-[#9ab6a6] bg-[#edf4ed] text-[#557662]" : mutedButton)}>{label}</button>)}</div></div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4dccb] bg-[#f6f3eb] p-4">
                  <div><div className="flex items-center gap-2"><Crown size={14} className="text-[#a08451]" /><span className="text-[11px] font-semibold text-[#665a43]">Ultra Question Inspector</span><span className="rounded bg-[#e6dcc5] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.08em] text-[#806c44]">ULTRA VIP</span></div><p className="mt-1 text-[10px] leading-relaxed text-[#878171]">Host sare questions dekh aur select kar sakta hai. Ultra exclusive.</p></div>
                  <button type="button" onClick={() => setUpgradeNotice(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#d7c7a7] bg-[#fffdf7] px-3 py-2 text-[10px] font-semibold text-[#7d6946] transition hover:bg-white"><Search size={12} /> Sawal chunein ({lessons.find((lesson) => lesson.id === selectedLesson)?.questions ?? 48})</button>
                </div>

                <div className="rounded-2xl border border-[#dfe5e1] bg-[#fffefa] p-4 sm:p-[18px]">
                  <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#83908b]">06 · Publish</p><h3 className="mt-1 text-[13px] font-semibold text-[#2d4147]">Launch ya schedule karein</h3></div><span className="text-[9px] text-[#8a948e]">Last step</span></div>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#eef1ed] p-1">
                    <button type="button" onClick={() => setAction("LAUNCH")} className={cx("flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-semibold transition", action === "LAUNCH" ? "bg-[#315f60] text-white shadow-sm" : "text-[#738078] hover:text-[#3e5653]")}><Play size={13} /> Abhi shuru karein</button>
                    <button type="button" onClick={() => { setAction("SCHEDULE"); setUpgradeNotice(true); }} className={cx("flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-semibold transition", action === "SCHEDULE" ? "bg-[#e8dfcb] text-[#6e5b39] shadow-sm" : "text-[#738078] hover:text-[#3e5653]")}><CalendarClock size={14} /> Schedule karein <span className="rounded border border-[#d9cba9] px-1 py-0.5 text-[8px] text-[#8b7448]">VIP</span></button>
                  </div>
                  {action === "SCHEDULE" ? <div className="mt-3 rounded-xl border border-[#e4dcc9] bg-[#f8f6ef] p-3.5">
                    <div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#695a3e]"><Clock3 size={14} /> Test shuru hone ka samay</span><span className="text-[9px] text-[#989080]">24-hour format</span></div>
                    <div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-semibold text-[#7f7a6b]">Date<input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className={`${field} mt-1`} /></label><label className="text-[9px] font-semibold text-[#7f7a6b]">Time<input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className={`${field} mt-1`} /></label></div>
                    <p className="mt-2 text-[9px] text-[#978765]">Scheduling Basic aur Ultra members ke liye available hai.</p>
                  </div> : <button type="button" onClick={() => setScreen("create")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#244f53] px-4 py-3.5 text-[12px] font-semibold text-white shadow-[0_6px_14px_rgba(36,79,83,0.16)] transition hover:bg-[#1c4246] active:scale-[0.99]"><Play size={14} fill="currentColor" /> Launch MCQ Battle <span className="font-mono text-[10px] text-white/70">· {timerDuration}s / Q</span></button>}
                </div>
              </div>
            </div>
          </section>
        )}
        <footer className="mx-auto mt-4 flex w-full max-w-[920px] items-center justify-between px-1 text-[9px] text-[#899691]">
          <span>ASSESSMENT ROOM <span className="mx-1.5 text-[#b5c0bb]">·</span> LOCAL PREVIEW</span>
          <span className="inline-flex items-center gap-1"><LockKeyhole size={10} /> Room controls stay with host</span>
        </footer>
      </div>
    </main>
  );
}
