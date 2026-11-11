import React, { useState, useEffect } from 'react';
import {
  solveMathProblemOffline,
  OFFLINE_FORMULA_BANK,
  OfflineSolution,
} from '../utils/mathEngineOffline';
import {
  UNIVERSAL_FORMULA_MODULES,
  UniversalFormulaModule,
} from '../utils/universalVariableSolvers';
import { TextbookWhitePage } from './TextbookWhitePage';
import {
  Calculator,
  Search,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Target,
  Sliders,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface OfflineSolverTabProps {
  language: 'hi' | 'en';
}

const SAMPLE_QUESTIONS_HI = [
  'एक आयत का क्षेत्रफल 120 सेमी² और लंबाई 15 सेमी है, इसकी चौड़ाई, परिमाप और विकर्ण ज्ञात करें।',
  'एक बेलन का आयतन 1540 सेमी³ और त्रिज्या 7 सेमी है, इसकी ऊंचाई व वक्र पृष्ठ निकालें।',
  'एक वर्ग का क्षेत्रफल 144 सेमी² है, इसकी भुजा, परिमाप और विकर्ण क्या होगा?',
  'एक शंकु का आयतन 314 सेमी³ और ऊंचाई 12 सेमी है, इसकी त्रिज्या व तिर्यक ऊंचाई ज्ञात करें।',
  'एक समचतुर्भुज का क्षेत्रफल 96 सेमी² और एक विकर्ण 16 सेमी है, दूसरा विकर्ण व भुजा बताएं।',
  'एक घनाभ का आयतन 720 सेमी³, लंबाई 12 सेमी और चौड़ाई 10 सेमी है, ऊंचाई ज्ञात करें।',
  'एक समलंब चतुर्भुज का क्षेत्रफल 120 सेमी², ऊंचाई 8 सेमी और एक भुजा 12 सेमी है, दूसरी भुजा बताएं।',
  'साधारण ब्याज: मूलधन 5000 रु, समय 3 वर्ष, ब्याज 1500 रु है तो ब्याज दर ज्ञात करें।',
  'एक 6 सेमी भुजा वाले रंगे हुए घन को 1 सेमी के छोटे घनों में काटा गया। 2 सतह रंगे घन कितने होंगे?',
  'एक मानक पासे में 3 के विपरीत कौन सा अंक होगा?',
];

const SAMPLE_QUESTIONS_EN = [
  'A rectangle has area 120 sq cm and length 15 cm. Find its breadth, perimeter and diagonal.',
  'A cylinder has volume 1540 cu cm and radius 7 cm. Find its height and curved surface area.',
  'A square has area 144 sq cm. Find its side, perimeter and diagonal.',
  'A cone has volume 314 cu cm and height 12 cm. Find its radius and slant height.',
  'A rhombus has area 96 sq cm and one diagonal 16 cm. Find the other diagonal and side.',
  'A cuboid has volume 720 cu cm, length 12 cm and breadth 10 cm. Find height.',
  'A trapezium has area 120 sq cm, height 8 cm and one parallel side 12 cm. Find the other side.',
  'Simple Interest: Principal 5000, Time 3 yrs, SI 1500. Find Rate %.',
  'A painted cube of side 6 cm is cut into 1 cm cubes. How many have 2 faces painted?',
  'In a standard dice, which number is opposite to 3?',
];

export const OfflineSolverTab: React.FC<OfflineSolverTabProps> = ({ language }) => {
  const [activeMode, setActiveMode] = useState<'universal_variable_solver' | 'smart_solver' | 'formula_bank'>('universal_variable_solver');

  // Selected Universal Formula Module
  const [selectedModuleId, setSelectedModuleId] = useState<string>(UNIVERSAL_FORMULA_MODULES[0].id);
  const currentModule = UNIVERSAL_FORMULA_MODULES.find((m) => m.id === selectedModuleId) || UNIVERSAL_FORMULA_MODULES[0];

  // Category Filter for Universal Modules
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Input Values for Universal Formula (string or null so user can type freely or leave blank)
  const [variableInputs, setVariableInputs] = useState<Record<string, string>>(() => {
    // default to first preset of Rectangle (A=120, l=15)
    return {
      area: '120',
      length: '15',
      breadth: '',
      perimeter: '',
      diagonal: '',
    };
  });

  // Calculate Universal Solution
  const [universalSolution, setUniversalSolution] = useState<OfflineSolution>(() => {
    return UNIVERSAL_FORMULA_MODULES[0].solve({ area: 120, length: 15 });
  });

  // Handle module selection
  const handleSelectModule = (mod: UniversalFormulaModule) => {
    setSelectedModuleId(mod.id);
    const firstPreset = mod.presets[0];
    const newInputs: Record<string, string> = {};

    mod.variables.forEach((v) => {
      const presetVal = firstPreset?.values[v.key];
      newInputs[v.key] = presetVal !== null && presetVal !== undefined ? String(presetVal) : '';
    });

    setVariableInputs(newInputs);

    // Convert string inputs to numeric or null
    const numInputs: Record<string, number | null> = {};
    Object.entries(newInputs).forEach(([k, valStr]) => {
      const str = String(valStr ?? '');
      const parsed = parseFloat(str);
      numInputs[k] = isNaN(parsed) || str.trim() === '' ? null : parsed;
    });

    setUniversalSolution(mod.solve(numInputs));
  };

  // Handle variable input change
  const handleVariableChange = (key: string, valueStr: string) => {
    const updated = { ...variableInputs, [key]: valueStr };
    setVariableInputs(updated);

    const numInputs: Record<string, number | null> = {};
    Object.entries(updated).forEach(([k, valStr]) => {
      const str = String(valStr ?? '');
      const parsed = parseFloat(str);
      numInputs[k] = isNaN(parsed) || str.trim() === '' ? null : parsed;
    });

    setUniversalSolution(currentModule.solve(numInputs));
  };

  // Apply Quick Preset
  const handleApplyPreset = (presetValues: Record<string, number | null>) => {
    const newInputs: Record<string, string> = {};
    currentModule.variables.forEach((v) => {
      const val = presetValues[v.key];
      newInputs[v.key] = val !== null && val !== undefined ? String(val) : '';
    });
    setVariableInputs(newInputs);
    setUniversalSolution(currentModule.solve(presetValues));
  };

  // Clear all inputs for current module
  const handleClearModuleInputs = () => {
    const cleared: Record<string, string> = {};
    currentModule.variables.forEach((v) => {
      cleared[v.key] = '';
    });
    setVariableInputs(cleared);
    setUniversalSolution(currentModule.solve({}));
  };

  // Natural Language Solver State
  const [query, setQuery] = useState(
    language === 'hi'
      ? 'एक आयत का क्षेत्रफल 120 सेमी² और लंबाई 15 सेमी है, इसकी चौड़ाई क्या होगी?'
      : 'A rectangle has area 120 sq cm and length 15 cm. Find its breadth.'
  );

  const [textSolution, setTextSolution] = useState<OfflineSolution | null>(null);
  const [formulaSearch, setFormulaSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSolveTextQuery = (qToSolve?: string) => {
    const text = qToSolve || query;
    if (!text.trim()) return;
    const res = solveMathProblemOffline(text);
    setTextSolution(res);
  };

  const copySolutionToClipboard = (sol: OfflineSolution) => {
    if (!sol) return;
    const text = [
      `=== ${language === 'hi' ? sol.titleHi : sol.titleEn} ===`,
      `[${language === 'hi' ? 'दिया गया है' : 'Given Data'}]:`,
      ...sol.givenData.map((d) => `• ${language === 'hi' ? d.labelHi : d.labelEn}: ${d.value}`),
      sol.toFindHi ? `[${language === 'hi' ? 'ज्ञात करना है' : 'To Find'}]: ${language === 'hi' ? sol.toFindHi : sol.toFindEn}` : '',
      `\n[${language === 'hi' ? 'चरणबद्ध हल' : 'Step-by-Step Solution'}]:`,
      ...(language === 'hi' ? sol.stepsHi : sol.stepsEn).map((s) => `${s}`),
      `\n[${language === 'hi' ? 'अंतिम उत्तर' : 'Final Answer'}]: ${language === 'hi' ? sol.finalAnswerHi : sol.finalAnswerEn}`,
      `\n[${language === 'hi' ? 'प्रयुक्त सूत्र' : 'Formulas'}]: ${sol.formulasUsed.join(', ')}`,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter formula bank
  const filteredFormulas = OFFLINE_FORMULA_BANK.filter(
    (f) =>
      f.nameHi.toLowerCase().includes(formulaSearch.toLowerCase()) ||
      f.nameEn.toLowerCase().includes(formulaSearch.toLowerCase()) ||
      f.formula.toLowerCase().includes(formulaSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(formulaSearch.toLowerCase())
  );

  // Filter Modules by Category
  const categories = ['all', '2D', '3D', 'Arithmetic', 'Reasoning'];
  const filteredModules = UNIVERSAL_FORMULA_MODULES.filter((m) => {
    if (activeCategoryFilter === 'all') return true;
    if (activeCategoryFilter === '2D') return m.categoryEn.includes('2D');
    if (activeCategoryFilter === '3D') return m.categoryEn.includes('3D');
    if (activeCategoryFilter === 'Arithmetic') return m.categoryEn.includes('Arithmetic') || m.categoryEn.includes('Commercial') || m.categoryEn.includes('Kinematics');
    if (activeCategoryFilter === 'Reasoning') return m.categoryEn.includes('Reasoning');
    return true;
  });

  return (
    <div className="flex flex-col gap-6 p-3 md:p-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'hi' ? '100% ऑफ़लाइन गणित सॉल्वर (बिना AI के शत-प्रतिशत सटीक)' : '100% Offline Textbook Step-by-Step Solver'}</span>
            </div>
            <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>
                {language === 'hi'
                  ? 'सूत्र चर सॉल्वर (Fill-in-the-Blank Formula Engine)'
                  : 'Universal Formula & Unknown Variable Solver'}
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {language === 'hi'
                ? 'सूत्र के ज्ञात मान भरें और जिस मान को पता करना हो उसे खाली छोड़ें — ऐप किताब की तरह पक्षांतरण (Transposition) कर चरणबद्ध हल करेगा!'
                : 'Fill known values in any formula and leave whichever variable you want to find blank — the app isolates the unknown and shows full textbook derivation!'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0">
            <button
              id="btn-mode-universal"
              onClick={() => setActiveMode('universal_variable_solver')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'universal_variable_solver'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'समीकरण व चर सॉल्वर (Fill-in)' : 'Formula Variables'}</span>
            </button>
            <button
              id="btn-mode-smart"
              onClick={() => {
                setActiveMode('smart_solver');
                if (!textSolution) handleSolveTextQuery();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'smart_solver'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'प्रश्न लिख कर हल करें' : 'Word Problem Solver'}</span>
            </button>
            <button
              id="btn-mode-formulas"
              onClick={() => setActiveMode('formula_bank')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'formula_bank'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'सम्पूर्ण सूत्र बैंक' : 'Formula Cheatsheet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: Universal Fill-in-the-blank Formula Solver */}
      {activeMode === 'universal_variable_solver' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Shape / Topic Selector + Variable Input Fields */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Shape & Module Selector */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>{language === 'hi' ? 'विषय या आकृति चुनें:' : 'Select Formula Topic:'}</span>
                </h3>
                <div className="flex gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-all ${
                        activeCategoryFilter === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat === 'all' ? (language === 'hi' ? 'सभी' : 'All') : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of formula modules */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredModules.map((mod) => {
                  const isSelected = mod.id === selectedModuleId;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleSelectModule(mod)}
                      className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50'
                          : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{mod.icon}</span>
                        <span className="font-bold text-xs truncate">
                          {language === 'hi' ? mod.nameHi.split('(')[0] : mod.nameEn}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-300 mt-1 truncate">
                        {mod.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Variables Form Card */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="text-base">{currentModule.icon}</span>
                    <span>{language === 'hi' ? currentModule.nameHi : currentModule.nameEn}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {currentModule.mainFormulaText}
                  </div>
                </div>

                <button
                  onClick={handleClearModuleInputs}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-800/50 px-2 py-1 rounded-lg transition-all"
                  title="Clear inputs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{language === 'hi' ? 'खाली करें' : 'Clear'}</span>
                </button>
              </div>

              {/* Instructions banner */}
              <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl p-2.5 flex items-start gap-2 text-xs text-indigo-300">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'hi' ? currentModule.descriptionHi : currentModule.descriptionEn}
                </span>
              </div>

              {/* All Variable Input Rows */}
              <div className="space-y-3">
                {currentModule.variables.map((v) => {
                  const valStr = variableInputs[v.key] ?? '';
                  const isBlank = valStr.trim() === '';

                  return (
                    <div
                      key={v.key}
                      className={`p-3 rounded-xl border transition-all ${
                        isBlank
                          ? 'bg-slate-950/90 border-dashed border-indigo-500/40 shadow-inner'
                          : 'bg-slate-950 border-slate-800 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-950 text-indigo-300 flex items-center justify-center font-mono font-bold text-xs border border-indigo-800/60 shadow-sm">
                            {v.symbol}
                          </span>
                          <span>{language === 'hi' ? v.labelHi : v.labelEn}</span>
                        </label>

                        {isBlank ? (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {language === 'hi' ? '🔍 अज्ञात (हल होगा)' : '🔍 Unknown (To Calculate)'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            ✓ {language === 'hi' ? 'दिया गया मान' : 'Given'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="any"
                            value={valStr}
                            onChange={(e) => handleVariableChange(v.key, e.target.value)}
                            placeholder={
                              language === 'hi'
                                ? `मान भरें (या खाली छोड़ें ज्ञात करने के लिए)`
                                : `Enter value (or leave blank to find)`
                            }
                            className="w-full pl-3 pr-16 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs md:text-sm font-mono font-bold text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 pointer-events-none">
                            {language === 'hi' ? v.unitHi : v.unitEn}
                          </span>
                        </div>

                        {/* Quick clear single field */}
                        {valStr && (
                          <button
                            onClick={() => handleVariableChange(v.key, '')}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs"
                            title="Make Blank"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 1-Click Example Presets */}
              {currentModule.presets && currentModule.presets.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'hi' ? '1-क्लिक उदाहरण (Quick Fill Examples):' : 'Quick Examples:'}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {currentModule.presets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleApplyPreset(preset.values)}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-600/50 text-slate-300 hover:text-white transition-all text-left"
                      >
                        {language === 'hi' ? preset.nameHi : preset.nameEn}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: High-contrast Step-by-Step Textbook Solution Display */}
          <div className="lg:col-span-7">
            <SolutionDisplayCard
              solution={universalSolution}
              language={language}
              questionText={
                language === 'hi'
                  ? `${currentModule.nameHi} - ${Object.entries(variableInputs)
                      .filter(([_, v]) => String(v || '').trim() !== '')
                      .map(([k, v]) => `${currentModule.variables.find((x) => x.key === k)?.labelHi || k} = ${v}`)
                      .join(', ')}`
                  : `${currentModule.nameEn} - ${Object.entries(variableInputs)
                      .filter(([_, v]) => String(v || '').trim() !== '')
                      .map(([k, v]) => `${currentModule.variables.find((x) => x.key === k)?.labelEn || k} = ${v}`)
                      .join(', ')}`
              }
              onCopy={() => copySolutionToClipboard(universalSolution)}
              copied={copied}
            />
          </div>
        </div>
      )}

      {/* MODE 2: Natural Language Word Problem Solver */}
      {activeMode === 'smart_solver' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Text Query Input & Sample Problems */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span>{language === 'hi' ? 'अपना प्रश्न या संख्याएं दर्ज करें' : 'Enter Problem or Numbers'}</span>
              </label>

              <div className="relative mt-2">
                <textarea
                  rows={4}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'जैसे: एक आयत का क्षेत्रफल 120 और लंबाई 15 है चौड़ाई क्या होगी?'
                      : 'e.g. A rectangle has area 120 and length 15 find breadth'
                  }
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <button
                  id="btn-solve-offline"
                  onClick={() => handleSolveTextQuery()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-950 cursor-pointer"
                >
                  <Cpu className="w-4 h-4" />
                  <span>{language === 'hi' ? 'ऑफ़लाइन हल करें' : 'Solve Step-by-Step'}</span>
                </button>

                <button
                  onClick={() => {
                    setQuery('');
                    setTextSolution(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 font-medium"
                >
                  {language === 'hi' ? 'साफ करें' : 'Clear'}
                </button>
              </div>
            </div>

            {/* Quick Sample Questions Card */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{language === 'hi' ? 'उदाहरण प्रश्न (क्लिक करके तुरंत हल करें)' : 'Sample Questions (Click to solve)'}</span>
              </h3>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {(language === 'hi' ? SAMPLE_QUESTIONS_HI : SAMPLE_QUESTIONS_EN).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(q);
                      handleSolveTextQuery(q);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 text-xs text-slate-300 hover:text-white transition-all flex items-start gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Step-by-Step Offline Solution Display */}
          <div className="lg:col-span-7">
            {textSolution ? (
              <SolutionDisplayCard
                solution={textSolution}
                language={language}
                questionText={query}
                onCopy={() => copySolutionToClipboard(textSolution)}
                copied={copied}
              />
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500">
                <Calculator className="w-12 h-12 mb-3 text-slate-700" />
                <p className="text-sm">
                  {language === 'hi'
                    ? 'बाईं ओर अपना प्रश्न दर्ज करें या उदाहरण प्रश्न पर क्लिक करें।'
                    : 'Enter your question on the left or click any sample problem.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: Universal Formula Bank */}
      {activeMode === 'formula_bank' && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>{language === 'hi' ? 'सम्पूर्ण सूत्र बैंक व व्युत्क्रम नियम (All Formulas & Inverse Rules)' : 'Universal Formula & Inverse Rule Cheatsheet'}</span>
            </h2>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={formulaSearch}
                onChange={(e) => setFormulaSearch(e.target.value)}
                placeholder={language === 'hi' ? 'सूत्र खोजें (जैसे: आयत, बेलन)...' : 'Search formulas...'}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFormulas.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {language === 'hi' ? item.nameHi : item.nameEn}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {item.category}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 text-indigo-300 font-mono text-xs font-semibold leading-relaxed overflow-x-auto">
                  {item.formula}
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'hi' ? item.descriptionHi : item.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponent: Textbook-Style Solution Display Card
// -------------------------------------------------------------

interface SolutionDisplayCardProps {
  solution: OfflineSolution;
  language: 'hi' | 'en';
  questionText?: string;
  onCopy: () => void;
  copied: boolean;
}

const SolutionDisplayCard: React.FC<SolutionDisplayCardProps> = ({
  solution,
  language,
  questionText,
  onCopy,
  copied,
}) => {
  const [viewFormat, setViewFormat] = useState<'white_textbook' | 'dark_card'>('white_textbook');

  return (
    <div className="space-y-4">
      {/* View Format Selector Ribbon */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <div className="flex items-center gap-2 pl-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white">
            {language === 'hi' ? 'हल प्रस्तुति शैली (Solution Presentation):' : 'Presentation Style:'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewFormat('white_textbook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewFormat === 'white_textbook'
                ? 'bg-white text-slate-900 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📖</span>
            <span>{language === 'hi' ? 'श्वेत पुस्तक पृष्ठ (White Book Page)' : 'White Textbook Page'}</span>
          </button>

          <button
            onClick={() => setViewFormat('dark_card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewFormat === 'dark_card'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌙</span>
            <span>{language === 'hi' ? 'डार्क कार्ड (Dark Mode)' : 'Dark Card'}</span>
          </button>
        </div>
      </div>

      {viewFormat === 'white_textbook' ? (
        <TextbookWhitePage
          solution={solution}
          language={language}
          questionText={questionText}
        />
      ) : (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
          {/* Solution Header */}
          <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {solution.category}
              </span>
              <h2 className="text-base md:text-lg font-bold text-white mt-1.5 leading-snug">
                {language === 'hi' ? solution.titleHi : solution.titleEn}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                title="Copy Solution"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? (language === 'hi' ? 'कॉपी हो गया' : 'Copied') : (language === 'hi' ? 'हल कॉपी करें' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* Given Data Block (दिया गया है) */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>{language === 'hi' ? 'दिया गया है (Given Data):' : 'Given Data:'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {solution.givenData.map((d, i) => (
                <div key={i} className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs">
                  <div className="text-slate-400 text-[11px]">{language === 'hi' ? d.labelHi : d.labelEn}</div>
                  <div className="font-mono font-bold text-indigo-300 mt-0.5">{d.value}</div>
                </div>
              ))}
            </div>
            {solution.toFindHi && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-xs text-amber-300 flex items-center gap-1.5">
                <span className="font-bold">{language === 'hi' ? 'ज्ञात करना है (To Find):' : 'To Find:'}</span>
                <span>{language === 'hi' ? solution.toFindHi : solution.toFindEn}</span>
              </div>
            )}
          </div>

          {/* Step-by-Step Textbook Derivation (चरणबद्ध हल) */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>{language === 'hi' ? 'किताब की तरह चरणबद्ध हल (Step-by-Step Derivation):' : 'Step-by-Step Textbook Solution:'}</span>
            </h3>

            <div className="space-y-2">
              {(language === 'hi' ? solution.stepsHi : solution.stepsEn).map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 font-mono text-xs md:text-sm text-slate-200 leading-relaxed"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Highlighted Final Answer Box (अंतिम उत्तर) */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-950 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-xl">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === 'hi' ? '★ अंतिम उत्तर (Final Answer)' : '★ Final Answer'}</span>
            </div>
            <div className="text-sm md:text-base font-bold font-mono text-white leading-relaxed">
              {language === 'hi' ? solution.finalAnswerHi : solution.finalAnswerEn}
            </div>
          </div>

          {/* Formulas Used & Pro-Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                {language === 'hi' ? 'प्रयुक्त सूत्र (Formulas Used)' : 'Formulas Used'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {solution.formulasUsed.map((f, i) => (
                  <span key={i} className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {solution.tipsHi && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-bold">{language === 'hi' ? 'किताब का नियम: ' : 'Rule: '}</span>
                  {language === 'hi' ? solution.tipsHi : solution.tipsEn}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
