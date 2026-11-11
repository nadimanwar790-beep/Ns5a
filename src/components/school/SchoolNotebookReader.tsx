// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Volume2, VolumeX, Play, Pause, Square, ArrowLeft, ArrowRight,
  BookOpen, Sparkles, ZoomIn, ZoomOut, RotateCcw, Copy, Check, School as SchoolIcon
} from "lucide-react";
import type { LucentNoteEntry, LucentNotePage } from "../../types";
import { formatSamsungNotesToHtml } from "./ClassCurriculumNotesManager";
import { toast } from "sonner";

interface Props {
  entry: LucentNoteEntry;
  currentPage: LucentNotePage;
  pageIndex: number;
  totalPages: number;
  onPageChange: (idx: number) => void;
  onBack: () => void;
  schoolName?: string;
  isDarkMode?: boolean;
}

export const SchoolNotebookReader: React.FC<Props> = ({
  entry,
  currentPage,
  pageIndex,
  totalPages,
  onPageChange,
  onBack,
  schoolName,
  isDarkMode = false,
}) => {
  // TTS State — calm audio player without auto-highlight jumps
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<number>(16);
  const [copied, setCopied] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean plain text for speech synthesis
  const getPlainText = (): string => {
    const raw = currentPage.chunkNotes || currentPage.content || "";
    // Remove HTML tags if present, clean whitespace
    return raw
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Stop speech when component unmounts or page changes
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [pageIndex, entry.id]);

  const handleTogglePlay = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Aapke browser mein Text-to-Speech support nahi hai.");
      return;
    }

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    const textToSpeak = getPlainText();
    if (!textToSpeak) {
      toast.error("Is page par koi text nahi hai sunne ke liye.");
      return;
    }

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.rate = speed;

    // Detect Hindi / English
    const hasHindi = /[\u0900-\u097F]/.test(textToSpeak);
    utter.lang = hasHindi ? "hi-IN" : "en-IN";

    utter.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utter.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utter.onerror = (e) => {
      console.warn("[SchoolNotebookReader] TTS error:", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const handleStop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleCycleSpeed = () => {
    const nextSpeed = speed === 1.0 ? 1.25 : speed === 1.25 ? 1.5 : 1.0;
    setSpeed(nextSpeed);
    if (isPlaying && !isPaused) {
      // Re-trigger with updated speed
      handleStop();
      setTimeout(handleTogglePlay, 50);
    }
  };

  const handleCopyPage = () => {
    const text = getPlainText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render HTML content: if htmlNotes exists and has HTML, use it; otherwise format via Samsung Notes formatter
  const renderFormattedHtml = (): string => {
    if (currentPage.htmlNotes && currentPage.htmlNotes.includes("<")) {
      return currentPage.htmlNotes;
    }
    return formatSamsungNotesToHtml(currentPage.chunkNotes || currentPage.content || "");
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f3ef] text-slate-900"}`}>
      {/* ── Top Bar ── */}
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-amber-200/80 shadow-xs"
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <SchoolIcon size={12} /> {entry.schoolName || schoolName || "School Curriculum"}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Class {entry.classLevel} · {entry.subject}
              </span>
            </div>
            <h1 className="text-sm font-black truncate max-w-xs sm:max-w-md">
              {entry.lessonTitle}
            </h1>
          </div>
        </div>

        {/* Zoom & Utility Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFontSize(s => Math.max(13, s - 1))}
            className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
            title="Font Chhota Karein"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setFontSize(s => Math.min(22, s + 1))}
            className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
            title="Font Bada Karein"
          >
            A+
          </button>
          <button
            type="button"
            onClick={handleCopyPage}
            className={`p-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              isDarkMode ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
            title="Copy Notes Text"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* ── Main Continuous Notebook Surface (Samsung Notes / Gemini Format) ── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 pb-28">
        <div className={`max-w-2xl mx-auto rounded-3xl p-6 sm:p-10 transition-all shadow-sm border relative ${
          isDarkMode
            ? "bg-slate-900/90 border-slate-800 text-slate-200"
            : "bg-[#fffefc] border-amber-200/60 text-slate-800"
        }`}
        style={{
          // Subtle notebook paper lines in light mode
          backgroundImage: isDarkMode
            ? "none"
            : "radial-gradient(#e5e7eb 0.75px, transparent 0.75px)",
          backgroundSize: "16px 16px"
        }}
        >
          {/* Notebook Header Stamp */}
          <div className="pb-4 mb-6 border-b border-amber-200/50 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                📖 {entry.bookName || "Class Curriculum"} · Page {currentPage.pageNo || pageIndex + 1}
              </p>
              <h2 className="text-xl sm:text-2xl font-black mt-1 text-slate-900 dark:text-white leading-tight">
                {entry.lessonTitle}
              </h2>
            </div>
            {currentPage.date && (
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                {new Date(currentPage.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Formatted Content — Clean Samsung Notes / Gemini typography */}
          <div
            className="prose dark:prose-invert max-w-none leading-relaxed transition-all font-sans"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: renderFormattedHtml() }}
          />

          {/* Bottom Page Navigation */}
          {totalPages > 1 && (
            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                disabled={pageIndex <= 0}
                onClick={() => onPageChange(pageIndex - 1)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft size={14} /> Previous Page
              </button>

              <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                Page {pageIndex + 1} / {totalPages}
              </span>

              <button
                type="button"
                disabled={pageIndex >= totalPages - 1}
                onClick={() => onPageChange(pageIndex + 1)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Next Page <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Calm TTS Audio Player (Zero Auto-Highlight Jumps) ── */}
      <div className="fixed bottom-6 right-4 sm:right-8 z-40 animate-in fade-in slide-in-from-bottom-3">
        <div className="bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700/80">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 ${
              isPlaying && !isPaused
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/30"
                : "bg-white/15 hover:bg-white/25 text-white"
            }`}
            title={isPlaying ? (isPaused ? "Resume TTS" : "Pause TTS") : "Play Voice Notes"}
          >
            {isPlaying && !isPaused ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </button>

          {/* Audio Label / Playing Wave */}
          <div className="hidden sm:flex flex-col">
            <span className="text-[11px] font-black leading-tight flex items-center gap-1.5">
              <span>Voiceover</span>
              {isPlaying && !isPaused && (
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
                  <span className="w-1 h-2 bg-amber-400 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-3.5 bg-amber-400 rounded-full animate-pulse delay-150" />
                </span>
              )}
            </span>
            <span className="text-[9px] text-slate-400">
              {isPlaying ? (isPaused ? "Paused" : "Reading calmly…") : "Listen to Notes"}
            </span>
          </div>

          {/* Speed Toggle Button */}
          <button
            type="button"
            onClick={handleCycleSpeed}
            className="text-[11px] font-black bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition cursor-pointer"
            title="Speech Speed"
          >
            {speed}x
          </button>

          {/* Stop Button (only when playing) */}
          {isPlaying && (
            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 rounded-full hover:bg-white/15 text-slate-400 hover:text-white transition cursor-pointer"
              title="Stop TTS"
            >
              <Square size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
