import React, { useState } from 'react';
import {
  Download,
  Share2,
  Copy,
  Check,
  FileCode,
  ChevronDown,
} from 'lucide-react';
import {
  downloadOfflineHTMLFile,
  shareContent,
} from '../utils/exportUtils';

interface ExportActionMenuProps {
  title: string;
  filename?: string;
  getHTMLContent: () => string;
  getPlainText?: () => string;
  language: 'hi' | 'en';
  extraStyles?: string;
  className?: string;
}

export const ExportActionMenu: React.FC<ExportActionMenuProps> = ({
  title,
  filename = 'geometry_solution',
  getHTMLContent,
  getPlainText,
  language,
  extraStyles,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleDownloadHTML = () => {
    setDropdownOpen(false);
    const html = getHTMLContent();
    downloadOfflineHTMLFile(filename, title, html, extraStyles);
    showStatus(language === 'hi' ? 'ऑफ़लाइन HTML फ़ाइल डाउनलोड हो गई!' : 'Offline HTML file downloaded!');
  };

  const handleCopyText = async () => {
    setDropdownOpen(false);
    const text = getPlainText ? getPlainText() : title;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showStatus(language === 'hi' ? 'टेक्स्ट कॉपी हो गया!' : 'Text copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    setDropdownOpen(false);
    const text = getPlainText ? getPlainText() : title;
    const ok = await shareContent(title, text);
    if (ok) {
      showStatus(language === 'hi' ? 'शेयर विकल्प खुला' : 'Share opened');
    }
  };

  return (
    <div className={`relative z-40 inline-flex items-center gap-1.5 ${className}`}>
      {/* Toast feedback */}
      {statusMsg && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white font-medium text-xs px-3 py-1 rounded-lg shadow-lg whitespace-nowrap animate-fade-in pointer-events-none">
          {statusMsg}
        </div>
      )}

      {/* Primary Direct Download Button */}
      <button
        onClick={handleDownloadHTML}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
        title={language === 'hi' ? 'ऑफ़लाइन HTML फ़ाइल डाउनलोड करें' : 'Download Offline HTML'}
      >
        <Download className="w-3.5 h-3.5 text-white" />
        <span>{language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
      </button>

      {/* More Export / Share Options Dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium shadow-md transition-all active:scale-95 cursor-pointer"
          title={language === 'hi' ? 'डाउनलोड व शेयर विकल्प' : 'Download & Share Options'}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'}`} />
        </button>

        {/* Dropdown Menu - floats securely above all canvases and diagrams */}
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-[9990]"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-2 z-[9999] text-xs space-y-1.5 ring-1 ring-white/10 animate-scale-up">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                <span>{language === 'hi' ? 'डाउनलोड व शेयर विकल्प' : 'Download & Share Options'}</span>
                <span className="text-[10px] text-emerald-400 font-mono">100% Offline</span>
              </div>

              {/* 1. Offline HTML Download */}
              <button
                onClick={handleDownloadHTML}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-indigo-950/80 text-left text-slate-200 hover:text-white transition-all group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-100 flex items-center gap-1">
                    <span>{language === 'hi' ? 'ऑफ़लाइन HTML फ़ाइल (.html)' : 'Offline Webpage (.html)'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'hi' ? 'बिना इंटरनेट किसी भी ब्राउज़र में खुलेगी' : 'Opens in any browser offline'}
                  </div>
                </div>
              </button>

              {/* 2. Copy Solution Text */}
              <button
                onClick={handleCopyText}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-indigo-950/80 text-left text-slate-200 hover:text-white transition-all group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-100">
                    {language === 'hi' ? 'पूरा हल टेक्स्ट कॉपी करें' : 'Copy Full Text / Solution'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'hi' ? 'क्लिपबोर्ड में कॉपी करें' : 'Copy directly to clipboard'}
                  </div>
                </div>
              </button>

              {/* 3. Share to WhatsApp / Mobile Apps */}
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-indigo-950/80 text-left text-slate-200 hover:text-white transition-all group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-100">
                    {language === 'hi' ? 'मोबाइल शेयर (WhatsApp / Apps)' : 'Share (WhatsApp / Apps)'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'hi' ? 'मोबाइल ऐप्स में सीधे भेजें' : 'Share to mobile applications'}
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quick Copy Text Button */}
      <button
        onClick={handleCopyText}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-all active:scale-95 cursor-pointer"
        title={language === 'hi' ? 'पूरा हल टेक्स्ट कॉपी करें' : 'Copy text to clipboard'}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">
          {copied ? (language === 'hi' ? 'कॉपी हुआ' : 'कॉपी') : (language === 'hi' ? 'कॉपी' : 'Copy')}
        </span>
      </button>
    </div>
  );
};

