import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  PenTool,
  Check,
  RotateCcw,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { uploadImageToImgBB } from "../../services/imgbbService";

interface Point {
  x: number;
  y: number;
}

export const removeSignatureWhiteBackground = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.width;
      const h = img.height;
      if (!w || !h) {
        resolve(dataUrl);
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const cornerCoords = [
          0,
          (w - 1) * 4,
          (h - 1) * w * 4,
          ((h - 1) * w + (w - 1)) * 4,
        ];
        let darkCorners = 0;
        for (const idx of cornerCoords) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a > 200 && r < 35 && g < 35 && b < 42) {
            darkCorners++;
          }
        }

        if (darkCorners >= 3) {
          const totalPixels = w * h;
          const visited = new Uint8Array(totalPixels);
          const queue = new Int32Array(totalPixels);
          let head = 0;
          let tail = 0;

          const isDarkBg = (pIdx: number) => {
            const i = pIdx * 4;
            const a = data[i + 3];
            if (a === 0) return true;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (b - r >= 22 || b > 55) return false;
            return r < 38 && g < 38 && b < 44;
          };

          const enqueue = (pIdx: number) => {
            if (!visited[pIdx] && isDarkBg(pIdx)) {
              visited[pIdx] = 1;
              queue[tail++] = pIdx;
            }
          };

          for (let x = 0; x < w; x++) {
            enqueue(x);
            enqueue((h - 1) * w + x);
          }
          for (let y = 0; y < h; y++) {
            enqueue(y * w);
            enqueue(y * w + (w - 1));
          }

          while (head < tail) {
            const curr = queue[head++];
            data[curr * 4 + 3] = 0;
            const cx = curr % w;
            const cy = (curr - cx) / w;
            if (cx > 0) enqueue(curr - 1);
            if (cx < w - 1) enqueue(curr + 1);
            if (cy > 0) enqueue(curr - w);
            if (cy < h - 1) enqueue(curr + w);
          }
        }

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          if (darkCorners >= 3 && brightness > 160) {
            data[i] = 30;
            data[i + 1] = 58;
            data[i + 2] = 138;
            data[i + 3] = 255;
          } else if (darkCorners < 3) {
            if (brightness > 205) {
              data[i + 3] = 0;
            } else if (brightness > 165) {
              const alpha = 255 - Math.round(((brightness - 165) / 40) * 255);
              data[i + 3] = Math.min(data[i + 3], Math.max(0, alpha));
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  initialSignatureUrl?: string;
  uploadPrefix?: string;
  onSaveSignature: (url: string) => Promise<void> | void;
}

export const TeacherSignatureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  subtitle = "स्क्रीन पर साइन करें या साइन फोटो अपलोड करें (ऑटो ट्रांसपेरेंट PNG)",
  initialSignatureUrl = "",
  uploadPrefix = "sig_custom",
  onSaveSignature,
}) => {
  const [sigUrl, setSigUrl] = useState<string>(initialSignatureUrl || "");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [penColor, setPenColor] = useState<string>("#1e3a8a");
  const [penWidth, setPenWidth] = useState<number>(3);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSigUrl(initialSignatureUrl || "");
      setStrokes([]);
      setCurrentStroke([]);
      setErrorMsg(null);
    }
  }, [isOpen, initialSignatureUrl]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    const baselineY = (canvas.height / dpr) * 0.72;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.moveTo(20, baselineY);
    ctx.lineTo(canvas.width / dpr - 20, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "9px Inter, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Sign above this line (साइन यहाँ बनाएं)", 24, baselineY + 14);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    const allStrokes = [...strokes, currentStroke].filter((s) => s.length > 0);
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

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 460;
    const height = 165;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    redrawCanvas();
  }, [isOpen, redrawCanvas]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentStroke([getCanvasPoint(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    setCurrentStroke((prev) => [...prev, getCanvasPoint(e)]);
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
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const exportCanvasAsPng = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return null;
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
        tempCtx.quadraticCurveTo(
          p1.x,
          p1.y,
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2
        );
      }
      tempCtx.stroke();
    }
    return tempCanvas.toDataURL("image/png");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    if (!file.type.startsWith("image/")) {
      setErrorMsg("कृपया PNG या JPG फोटो अपलोड करें।");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      if (raw) {
        const cleanPng = await removeSignatureWhiteBackground(raw);
        setSigUrl(cleanPng);
        setStrokes([]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    setErrorMsg(null);
    let finalUrl = sigUrl;
    if (strokes.length > 0) {
      const drawn = exportCanvasAsPng();
      if (drawn) finalUrl = drawn;
    }
    setSaving(true);
    try {
      if (finalUrl && finalUrl.startsWith("data:image/")) {
        try {
          finalUrl = await uploadImageToImgBB(
            finalUrl,
            `${uploadPrefix}_${Date.now()}.png`,
            { preservePng: true }
          );
        } catch (err) {
          console.warn("[TeacherSignatureModal] Cloud upload fallback:", err);
        }
      }
      await onSaveSignature(finalUrl || "");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Signature save karne me samasya aayi.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">{title}</h3>
              <p className="text-[11px] text-blue-200">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Preview */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-24 h-12 rounded-xl bg-white border border-slate-300 flex items-center justify-center p-1 overflow-hidden">
                {sigUrl ? (
                  <img src={sigUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold">No Sign</span>
                )}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  {sigUrl ? "Active Signature Preview" : "Signature Not Added"}
                </div>
                <div className="text-[10px] text-slate-500">
                  Marksheet, Rules व Appointment Letter पर दिखेगा
                </div>
              </div>
            </div>
            {sigUrl && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    const cleaned = await removeSignatureWhiteBackground(sigUrl);
                    setSigUrl(cleaned);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Transparent
                </button>
                <button
                  type="button"
                  onClick={() => setSigUrl("")}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            )}
          </div>

          {/* Drawing Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                Draw Signature (यहाँ साइन बनाएं):
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {["#1e3a8a", "#0f172a", "#312e81"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPenColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full ${
                        penColor === c ? "ring-2 ring-blue-500 scale-110" : "opacity-70"
                      }`}
                    />
                  ))}
                </div>
                <select
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value={2}>Fine</option>
                  <option value={3}>Medium</option>
                  <option value={4}>Bold</option>
                </select>
              </div>
            </div>

            <div className="relative rounded-2xl border-2 border-dashed border-blue-400 bg-white overflow-hidden touch-none select-none">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-[165px] cursor-crosshair block bg-white"
              />
              {strokes.length === 0 && !isDrawing && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                  <PenTool className="w-6 h-6 opacity-40 mb-1" />
                  <span className="text-[11px] font-semibold">उंगली या माउस से साइन करें</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStrokes((p) => p.slice(0, -1))}
                  disabled={strokes.length === 0}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Undo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStrokes([]);
                    setCurrentStroke([]);
                  }}
                  disabled={strokes.length === 0}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear Pad
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-500" /> Upload Photo
                </button>
                <button
                  type="button"
                  disabled={strokes.length === 0}
                  onClick={() => {
                    const png = exportCanvasAsPng();
                    if (png) {
                      setSigUrl(png);
                      setStrokes([]);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Apply Draw
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Signature"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
