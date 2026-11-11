import React, { useState } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  Copy,
  HelpCircle,
  Loader2,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';

interface AiSolverTabProps {
  language: 'hi' | 'en';
}

export const AiSolverTab: React.FC<AiSolverTabProps> = ({ language }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState<'white_page' | 'dark_card'>('white_page');
  const [copied, setCopied] = useState(false);

  const sampleQuestions = [
    {
      hi: 'एक 5 सेमी के घन को बाहर से नीले रंग से रंगा गया और 1 सेमी के टुकड़ों में काटा गया। 1, 2 और 3 सतह रंगे घनों की संख्या बताओ।',
      en: 'A 5 cm cube is painted blue and cut into 1 cm cubes. Find number of 1-face, 2-face and 3-face painted cubes.',
    },
    {
      hi: 'एक बेलन (Cylinder) की त्रिज्या 7 सेमी और ऊंचाई 10 सेमी है। इसका आयतन और कुल पृष्ठ क्षेत्रफल ज्ञात करें।',
      en: 'A cylinder has radius 7 cm and height 10 cm. Find its volume and total surface area.',
    },
    {
      hi: 'एक घनाभ की लंबाई 12 सेमी, चौड़ाई 9 सेमी और ऊंचाई 8 सेमी है। इसके सबसे लंबे विकर्ण की लंबाई क्या होगी?',
      en: 'A cuboid has length 12 cm, width 9 cm and height 8 cm. What is the length of its longest diagonal?',
    },
    {
      hi: 'पासे (Dice) में जब दो फलक उभयनिष्ठ (Common) हों, तो विपरीत सतह कैसे पहचानी जाती है? नियम समझाइए।',
      en: 'In dice reasoning, how do we find opposite faces when two faces are common? Explain the rule.',
    },
  ];

  const handleSolve = async (promptText?: string) => {
    const q = promptText || question;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setSolution(null);

    try {
      const res = await fetch('/api/ai/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, language }),
      });

      const data = await res.json();
      if (data.answer) {
        setSolution(data.answer);
      } else {
        setError(data.error || 'Failed to solve question');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!solution) return;
    const full = `[प्रश्न / Question]:\n${question}\n\n[हल / Solution]:\n${solution}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {language === 'hi' ? 'AI गणित व रीज़निंग डाउट सॉल्वर' : 'AI Math & Reasoning Solver'}
              <span className="text-[10px] font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded-full">
                Gemini
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'hi'
                ? 'घन, घनाभ, पासा, बेलन, शंकु से जुड़ा कोई भी प्रश्न पूछें — किताब की तरह श्वेत पृष्ठ पर हल प्रस्तुत होगा।'
                : 'Ask any 3D geometry or reasoning question — get textbook-grade derivations on a white page.'}
            </p>
          </div>
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-3 shadow-xl">
        <textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            language === 'hi'
              ? 'यहाँ अपना गणित या रीज़निंग प्रश्न लिखें... (जैसे: एक 6 सेमी घन को काटा गया...)'
              : 'Type your math or reasoning question here...'
          }
          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
        />

        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            {language === 'hi' ? '💡 शॉर्टकट, सूत्र व 3D स्टेप्स के साथ उत्तर मिलेगा' : '💡 With formulas and shortcuts'}
          </span>
          <button
            onClick={() => handleSolve()}
            disabled={loading || !question.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'hi' ? 'हल किया जा रहा है...' : 'Solving...'}
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                {language === 'hi' ? 'स्टेप-बाय-स्टेप हल करें' : 'Solve Step-by-Step'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sample Question Prompts */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400">
          {language === 'hi' ? 'उदाहरण प्रश्न (क्लिक करके तुरंत हल देखें):' : 'Popular Exam Questions:'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(language === 'hi' ? q.hi : q.en);
                handleSolve(language === 'hi' ? q.hi : q.en);
              }}
              className="p-3 text-left bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs text-slate-300 transition-all flex items-start gap-2 group"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 group-hover:rotate-12 transition-transform" />
              <span>{language === 'hi' ? q.hi : q.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Solution Display Area */}
      {solution && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Style Selector Toolbar */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-lg">
            <div className="flex items-center gap-2 pl-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">
                {language === 'hi' ? 'हल प्रस्तुति स्वरूप:' : 'Solution Presentation:'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPresentationMode('white_page')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    presentationMode === 'white_page'
                      ? 'bg-white text-slate-900 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📖 {language === 'hi' ? 'श्वेत पुस्तक पृष्ठ' : 'White Page'}</span>
                </button>
                <button
                  onClick={() => setPresentationMode('dark_card')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    presentationMode === 'dark_card'
                      ? 'bg-indigo-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌙 {language === 'hi' ? 'डार्क कार्ड' : 'Dark Mode'}</span>
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all"
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (language === 'hi' ? 'कॉपी हुआ' : 'Copied') : (language === 'hi' ? 'कॉपी' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* White Textbook Page Rendering */}
          {presentationMode === 'white_page' ? (
            <div className="w-full bg-white text-slate-900 border-2 border-slate-300 rounded-2xl shadow-2xl overflow-hidden relative">
              {/* Header Ribbon */}
              <div className="bg-slate-100 border-b-2 border-slate-300 px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-indigo-900 text-white font-mono font-bold text-[10px] uppercase">
                    AI Solved Problem
                  </span>
                  <span className="text-xs font-serif font-bold text-slate-800">
                    {language === 'hi' ? 'पाठ्यपुस्तक मानक विस्तृत हल' : 'Textbook Standard Derivation'}
                  </span>
                </div>
                <span className="text-[11px] font-serif italic text-slate-500">
                  📖 {language === 'hi' ? 'श्वेत पृष्ठ संस्करण' : 'White Page Edition'}
                </span>
              </div>

              <div className="relative p-6 sm:p-8 md:p-10 space-y-6">
                {/* Red Margin Line */}
                <div className="absolute top-0 bottom-0 left-4 w-[2px] bg-red-400/60 pointer-events-none" />

                {/* Problem Box */}
                <div className="ml-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif text-slate-900 leading-relaxed">
                  <span className="font-bold mr-1">{language === 'hi' ? 'प्रश्न:' : 'Problem:'}</span>
                  {question}
                </div>

                {/* Derivation Content */}
                <div className="ml-4 p-4 rounded-xl bg-white border-2 border-slate-200 font-mono text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-line space-y-2 shadow-xs">
                  {solution}
                </div>

                {/* Footer */}
                <div className="ml-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>3D Geometry & Reasoning Master • Verified Solution</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/95 border border-indigo-900/60 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4" />
                  {language === 'hi' ? 'विस्तृत हल व 3D ट्रिक (Detailed Solution)' : 'Detailed Solution & Shortcuts'}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line space-y-2">
                {solution}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
};

