import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
  Sparkles,
  Link,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { uploadToTelegramStorage, resolveTelegramUrl } from '../services/telegramStorageService';
import { compressImage, uploadImageToImgBB } from '../services/imgbbService';
import type { MCQItem } from '../types';

interface AdminMcqImageEditorModalProps {
  question: MCQItem;
  questionIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    imageUrl: string;
    imageWidth: string | number;
    imageAlign: 'left' | 'center' | 'right';
    imagePosition: 'above_question' | 'below_question' | 'after_options';
  }) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
}

/** Converts base64 Data URL to Blob */
function dataUrlToBlob(dataUrl: string, defaultMime = 'image/jpeg'): Blob {
  try {
    const parts = dataUrl.split(';base64,');
    const mime = parts[0]?.replace('data:', '') || defaultMime;
    const byteString = atob(parts[1] || parts[0]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  } catch {
    return new Blob([], { type: defaultMime });
  }
}

export const AdminMcqImageEditorModal: React.FC<AdminMcqImageEditorModalProps> = ({
  question,
  questionIndex,
  isOpen,
  onClose,
  onSave,
  onRemove,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>(question.imageUrl || '');
  const [imageWidth, setImageWidth] = useState<number>(
    typeof question.imageWidth === 'number'
      ? question.imageWidth
      : typeof question.imageWidth === 'string' && question.imageWidth.endsWith('%')
      ? parseInt(question.imageWidth, 10) || 100
      : 100
  );
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>(
    question.imageAlign || 'center'
  );
  const [imagePosition, setImagePosition] = useState<'above_question' | 'below_question' | 'after_options'>(
    question.imagePosition || 'below_question'
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(15);
    setUploadStage('फ़ोटो को ऑप्टिमाइज़ किया जा रहा है…');
    setErrorMsg(null);
    setSuccessNote(null);

    try {
      // 1. Client-side compression: Downsamples high-resolution mobile camera photos (e.g. 5-15MB)
      // to high-quality web-ready JPEG (~150-250KB) to ensure rapid, fail-safe transfer.
      let compressedDataUrl = '';
      try {
        compressedDataUrl = await compressImage(file, 1400, 1400, 0.84);
        setUploadProgress(35);
      } catch (cErr) {
        console.warn('[AdminMcqImageEditor] Canvas compression warning:', cErr);
      }

      let finalUrl = '';

      // 2. Strategy A: Telegram Cloud Storage via compressed blob
      setUploadStage('क्लाउड स्टोरेज में सुरक्षित किया जा रहा है…');
      try {
        const payloadBlob = compressedDataUrl ? dataUrlToBlob(compressedDataUrl) : file;
        const res = await uploadToTelegramStorage(payloadBlob, {
          fileName: `mcq_q${questionIndex + 1}_${Date.now()}.jpg`,
          caption: `MCQ Q${questionIndex + 1} Diagram`,
          timeoutMs: 20000,
          onProgress: (p) => setUploadProgress(Math.max(35, Math.min(85, p))),
        });

        if (res?.url) {
          finalUrl = res.url;
          setSuccessNote('☁️ Photo Cloud Storage में सफलतापूर्वक अपलोड हो गई!');
        }
      } catch (tgErr: any) {
        console.warn('[AdminMcqImageEditor] Telegram upload skipped/failed:', tgErr?.message || tgErr);
      }

      // 3. Strategy B: ImgBB / multi-cloud fallback if Telegram failed or blocked by ISP
      if (!finalUrl) {
        try {
          setUploadStage('बैकअप क्लाउड सर्वर से जोड़ा जा रहा है…');
          setUploadProgress(65);
          const cloudUrl = await uploadImageToImgBB(file, `mcq_q${questionIndex + 1}_${Date.now()}.jpg`);
          if (cloudUrl && !cloudUrl.startsWith('data:')) {
            finalUrl = cloudUrl;
            setSuccessNote('☁️ Photo बैकअप क्लाउड में अपलोड हो गई!');
          }
        } catch (imgbbErr) {
          console.warn('[AdminMcqImageEditor] ImgBB fallback failed:', imgbbErr);
        }
      }

      // 4. Strategy C: High-Quality In-App Compact Base64 (Guaranteed 100% resilient fallback)
      // Works even without external internet connectivity, never fails, zero CORS issues.
      if (!finalUrl) {
        setUploadStage('ऑप्टिमाइज़्ड फ़ोटो लोड हो रही है…');
        setUploadProgress(85);
        try {
          const compactData = await compressImage(file, 1000, 1000, 0.78);
          finalUrl = compactData || compressedDataUrl;
          setSuccessNote('⚡ Photo सुरक्षित रूप से लोड हो गई (Direct In-App Storage)!');
        } catch {
          finalUrl = compressedDataUrl;
        }
      }

      if (finalUrl) {
        setCurrentUrl(finalUrl);
        setUploadProgress(100);
      } else {
        throw new Error('फ़ोटो लोड नहीं हो सकी। कृपया दोबारा कोशिश करें या सीधा लिंक डालें।');
      }
    } catch (err: any) {
      console.warn('[AdminMcqImageEditor] Upload warning handled gracefully:', err);
      // Last-ditch: Read directly as Data URL
      try {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setCurrentUrl(String(ev.target.result));
            setSuccessNote('⚡ Photo लोड हो गई!');
            setUploadProgress(100);
          }
        };
        reader.readAsDataURL(file);
      } catch {
        setErrorMsg(err?.message || 'फ़ोटो अपलोड में समस्या आई। आप नीचे "इमेज लिंक (URL)" विकल्प से भी फोटो लगा सकते हैं।');
      }
    } finally {
      setUploading(false);
      setUploadStage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      setErrorMsg('कृपया वैध इमेज लिंक दर्ज करें।');
      return;
    }
    setCurrentUrl(trimmed);
    setCustomUrlInput('');
    setShowUrlInput(false);
    setErrorMsg(null);
    setSuccessNote('🔗 इमेज लिंक सफ़लतापूर्वक सेट हो गया!');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!currentUrl) {
        await onRemove();
      } else {
        await onSave({
          imageUrl: currentUrl,
          imageWidth: `${imageWidth}%`,
          imageAlign,
          imagePosition,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Save करते समय समस्या आई।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      setCurrentUrl('');
      await onRemove();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Photo हटाने में समस्या आई।');
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100005] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 leading-tight">
                MCQ Q{questionIndex + 1} · Picture Manager
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                HD Cloud & Local Resilient Storage (Zero-Failure)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-left flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 text-xs ml-2">✕</button>
            </div>
          )}

          {successNote && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{successNote}</span>
            </div>
          )}

          {/* Hidden File Input for Direct Gallery / Camera Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Action Buttons: Direct File Upload + URL Input Toggle */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {uploading ? (
                <>
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                    <span>{uploadStage || 'अपलोड हो रहा है…'} ({uploadProgress}%)</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-48 h-1.5 bg-indigo-100 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Upload size={16} />
                    <span>{currentUrl ? '🔄 Photo बदलें (Gallery / Camera)' : '📷 Direct Photo Upload करें (Gallery / Camera)'}</span>
                  </div>
                  <span className="text-[10px] text-indigo-500 font-normal">
                    स्वचालित कंप्रेशन व हाई-स्पीड मल्टी-क्लाउड स्टोरेज
                  </span>
                </>
              )}
            </button>

            {/* Direct URL Accordion Button */}
            <div className="flex justify-between items-center px-1">
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition"
              >
                <Link size={12} />
                <span>{showUrlInput ? '🔗 URL इनपुट छिपाएं' : '🔗 या सीधे इमेज URL / वेब लिंक से जोड़ें'}</span>
              </button>
            </div>

            {/* Direct URL Input Field */}
            {showUrlInput && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex gap-2 animate-in fade-in">
                <input
                  type="url"
                  placeholder="https://... इमेज का लिंक पेस्ट करें"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition"
                >
                  लागू करें
                </button>
              </div>
            )}
          </div>

          {/* Live Preview & Sizing Controls (Only when image exists) */}
          {currentUrl && (
            <div className="space-y-4 pt-1">
              {/* Size Slider & Presets */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">
                    📐 Photo Ka Size (बड़ा / छोटा):
                  </span>
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-indigo-600 text-white">
                    {imageWidth}%
                  </span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={imageWidth}
                  onChange={(e) => setImageWidth(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { label: 'छोटा (30%)', val: 30 },
                    { label: 'मध्यम (50%)', val: 50 },
                    { label: 'बड़ा (75%)', val: 75 },
                    { label: 'फुल (100%)', val: 100 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setImageWidth(preset.val)}
                      className={`py-1 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                        imageWidth === preset.val
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Placement / Position Selector */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">📌 Photo Placement:</span>
                  <span className="text-[10px] text-slate-500 font-semibold">कहाँ दिखाना है?</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {[
                    { pos: 'above_question' as const, label: 'Question से ऊपर' },
                    { pos: 'below_question' as const, label: 'Question के नीचे (Default)' },
                    { pos: 'after_options' as const, label: 'Options के नीचे (सबसे नीचे)' },
                  ].map(({ pos, label }) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setImagePosition(pos)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-bold transition-all ${
                        imagePosition === pos
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {imagePosition === pos ? '✓ ' : ''}{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment Controls */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">📍 संरेखण (Alignment):</span>
                <div className="flex items-center gap-1">
                  {[
                    { align: 'left' as const, icon: AlignLeft, label: 'बाएँ' },
                    { align: 'center' as const, icon: AlignCenter, label: 'बीच में' },
                    { align: 'right' as const, icon: AlignRight, label: 'दाएँ' },
                  ].map(({ align, icon: Icon, label }) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setImageAlign(align)}
                      className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10.5px] font-bold transition-all ${
                        imageAlign === align
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={label}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Frame */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-900/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Live Question Preview:
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    विद्यार्थियों को ऐसा दिखेगा
                  </span>
                </div>
                <div
                  className={`flex ${
                    imageAlign === 'left' ? 'justify-start' : imageAlign === 'right' ? 'justify-end' : 'justify-center'
                  }`}
                >
                  <div
                    className="rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm transition-all duration-150"
                    style={{ width: `${imageWidth}%`, maxWidth: '100%' }}
                  >
                    <img
                      src={resolveTelegramUrl(currentUrl)}
                      alt="MCQ Diagram Preview"
                      className="w-full h-auto object-contain max-h-[220px]"
                      onError={(e) => {
                        console.warn('[AdminMcqImageEditor] Preview load warning:', currentUrl);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          {currentUrl ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleRemove}
              className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Trash2 size={14} />
              <span>हटाएँ</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || uploading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>✓ Save Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
