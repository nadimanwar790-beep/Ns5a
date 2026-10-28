// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X, PenTool, Check, RotateCcw, Trash2, Upload, Shield, Award,
  CreditCard, FileText, CheckCircle2, AlertCircle, Sparkles, User, Download
} from "lucide-react";
import type { School } from "../../school-types";
import { updateSchool } from "../../school-firebase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  schoolId: string;
  onSignaturesUpdated?: (updated: { principalSignatureUrl?: string; directorSignatureUrl?: string }) => void;
}

interface Point {
  x: number;
  y: number;
}

export const DigitalSignatureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  schoolId,
  onSignaturesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<"principal" | "director">("principal");
  const [principalSig, setPrincipalSig] = useState<string>(school?.principalSignatureUrl || "");
  const [directorSig, setDirectorSig] = useState<string>(school?.directorSignatureUrl || "");

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [penColor, setPenColor] = useState<string>("#1e3a8a"); // Default Royal Blue Ink
  const [penWidth, setPenWidth] = useState<number>(3);
  const [saving, setSaving] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if school prop updates
  useEffect(() => {
    if (school) {
      setPrincipalSig(school.principalSignatureUrl || "");
      setDirectorSig(school.directorSignatureUrl || "");
    }
  }, [school]);

  // Redraw canvas from strokes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid guide line for signing baseline
    const dpr = window.devicePixelRatio || 1;
    const baselineY = (canvas.height / dpr) * 0.72;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Subtle dotted baseline
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.moveTo(20, baselineY);
    ctx.lineTo(canvas.width / dpr - 20, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Baseline hint label
    ctx.font = "9px Inter, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Sign above this line (Aapka signature is line ke upar banayein)", 24, baselineY + 14);

    // Draw all completed strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    const allStrokes = [...strokes, currentStroke].filter(s => s.length > 0);

    for (const stroke of allStrokes) {
      if (stroke.length < 2) {
        if (stroke.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke[0].x, stroke[0].y, penWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = penColor;
          ctx.fill();
        }
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);

      for (let i = 1; i < stroke.length; i++) {
        // Quadratic curve smoothing
        const p1 = stroke[i - 1];
        const p2 = stroke[i];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [strokes, currentStroke, penColor, penWidth]);

  // Resize canvas for high DPI
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 480;
    const height = 180;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    redrawCanvas();
  }, [isOpen, activeTab, redrawCanvas]);

  // Pointer drawing handlers (Universal for Touch, Mouse, and Stylus)
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const pt = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);
    setCurrentStroke(prev => [...prev, pt]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);

    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  // Convert canvas to transparent PNG data URL
  const exportCanvasAsPng = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return null;

    // Create a temporary offscreen canvas with just the signature strokes (without the guide line)
    const dpr = window.devicePixelRatio || 1;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return null;

    tempCtx.scale(dpr, dpr);
    tempCtx.lineCap = "round";
    tempCtx.lineJoin = "round";
    tempCtx.strokeStyle = penColor;
    tempCtx.lineWidth = penWidth;

    for (const stroke of strokes) {
      if (stroke.length < 2) {
        if (stroke.length === 1) {
          tempCtx.beginPath();
          tempCtx.arc(stroke[0].x, stroke[0].y, penWidth / 2, 0, Math.PI * 2);
          tempCtx.fillStyle = penColor;
          tempCtx.fill();
        }
        continue;
      }
      tempCtx.beginPath();
      tempCtx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        const p1 = stroke[i - 1];
        const p2 = stroke[i];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        tempCtx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      tempCtx.stroke();
    }

    return tempCanvas.toDataURL("image/png");
  };

  // Apply current drawn signature to active tab
  const handleApplyDrawnSignature = () => {
    const dataUrl = exportCanvasAsPng();
    if (!dataUrl) {
      alert("Kripya pehle screen par signature draw karein.");
      return;
    }
    if (activeTab === "principal") {
      setPrincipalSig(dataUrl);
    } else {
      setDirectorSig(dataUrl);
    }
    handleClear();
  };

  // Upload signature from file / photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Kripya image file (PNG, JPG) select karein.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        if (activeTab === "principal") {
          setPrincipalSig(result);
        } else {
          setDirectorSig(result);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Save to Firebase & School profile
  const handleSaveEverywhere = async () => {
    // If there are unapplied strokes on canvas, apply them first
    let finalPrincipal = principalSig;
    let finalDirector = directorSig;

    if (strokes.length > 0) {
      const drawn = exportCanvasAsPng();
      if (drawn) {
        if (activeTab === "principal") finalPrincipal = drawn;
        else finalDirector = drawn;
      }
    }

    setSaving(true);
    try {
      await updateSchool(schoolId, {
        principalSignatureUrl: finalPrincipal || "",
        directorSignatureUrl: finalDirector || "",
      });

      if (onSignaturesUpdated) {
        onSignaturesUpdated({
          principalSignatureUrl: finalPrincipal,
          directorSignatureUrl: finalDirector,
        });
      }

      setSavedSuccessMsg("✅ Signature successfully save ho gaya! Ab yeh ID Card, Fee Receipt, Certificate, Marksheet aur Admit Card par automatic lag gaya hai.");
      setTimeout(() => {
        setSavedSuccessMsg(null);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error("Failed to save signatures:", err);
      alert("Signature save karne mein error aaya: " + (err?.message || "Please retry"));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentActiveSig = activeTab === "principal" ? principalSig : directorSig;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight text-white flex items-center gap-2">
                <span>Digital Signatures Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-normal">
                  Universal Auto-Apply
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Screen par sign karein — ID Card, Fee Receipt, Marksheet &amp; Certificates par automatic lag jayega
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Principal vs Director */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab("principal"); handleClear(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === "principal"
                ? "bg-blue-600 text-white shadow-blue-500/30 scale-[1.01]"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <span className="text-base">🎓</span>
            <span>Principal Signature</span>
            {principalSig && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("director"); handleClear(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === "director"
                ? "bg-blue-600 text-white shadow-blue-500/30 scale-[1.01]"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
            }`}
          >
            <span className="text-base">👔</span>
            <span>Director / Manager Signature</span>
            {directorSig && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-1" />}
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {savedSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedSuccessMsg}</span>
            </div>
          )}

          {/* Current Saved Signature Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-inner">
                {currentActiveSig ? (
                  <img src={currentActiveSig} alt="Signature" className="max-w-full max-h-full object-contain filter contrast-125" />
                ) : (
                  <PenTool className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{activeTab === "principal" ? "Principal" : "Director"} Ka Active Signature:</span>
                  {currentActiveSig ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-bold">
                      Saved &amp; Active
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full font-bold">
                      Not Added Yet
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  {currentActiveSig
                    ? "Yeh signature har document par print ho raha hai."
                    : "Neeche screen par ungli/mouse se sign karein ya image upload karein."}
                </p>
              </div>
            </div>

            {currentActiveSig && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === "principal") setPrincipalSig("");
                  else setDirectorSig("");
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>

          {/* Interactive Digital Signature Drawing Pad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-blue-600" />
                <span>Screen Par Sign Karein (Touch / Stylus / Mouse):</span>
              </label>

              <div className="flex items-center gap-2">
                {/* Ink Color Selection */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {[
                    { color: "#1e3a8a", name: "Royal Blue" },
                    { color: "#0f172a", name: "Deep Black" },
                    { color: "#312e81", name: "Indigo" },
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setPenColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-5 h-5 rounded-full transition-all ${
                        penColor === c.color ? "ring-2 ring-blue-500 scale-110 shadow-sm" : "opacity-70 hover:opacity-100"
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Pen Width */}
                <select
                  value={penWidth}
                  onChange={e => setPenWidth(Number(e.target.value))}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value={2}>Fine Pen (2px)</option>
                  <option value={3}>Medium Pen (3px)</option>
                  <option value={4}>Bold Pen (4px)</option>
                </select>
              </div>
            </div>

            {/* Canvas Box */}
            <div className="relative rounded-2xl border-2 border-dashed border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-950 overflow-hidden shadow-inner touch-none select-none">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-[180px] cursor-crosshair block"
              />

              {strokes.length === 0 && !isDrawing && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                  <PenTool className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-xs font-semibold">Ungli ya Stylus se yahan sign karein</span>
                  <span className="text-[10px] text-slate-400">Touch &amp; Mouse supported</span>
                </div>
              )}
            </div>

            {/* Drawing Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Stroke</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={strokes.length === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 disabled:opacity-40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Pad</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Upload scan option */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                  <span>Upload Signature Photo</span>
                </button>

                {/* Apply drawn signature button */}
                <button
                  type="button"
                  onClick={handleApplyDrawnSignature}
                  disabled={strokes.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 shadow-xs transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Use This Signature</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Document Visualizer: Where this signature appears */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Kahan-Kahan Yeh Signature Automatic Lagega:</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { title: "Student ID Card", icon: "🪪", desc: "Principal Signature Box" },
                { title: "Fee Receipts", icon: "💰", desc: "Auth. Signatory on slip" },
                { title: "Report Card / Marks", icon: "📊", desc: "Head of Institution" },
                { title: "Certificates / TC", icon: "📜", desc: "Official Authorized Sign" },
              ].map(item => (
                <div key={item.title} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-base mb-0.5">{item.icon}</div>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight">{item.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveEverywhere}
            disabled={saving}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{saving ? "Saving Signatures..." : "Save Signatures Everywhere (सब जगह लागू करें)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
