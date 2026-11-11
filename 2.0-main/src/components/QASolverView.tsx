import React, { useState, useEffect } from 'react';
import {
  UNIVERSAL_FORMULA_MODULES,
  UniversalFormulaModule,
} from '../utils/universalVariableSolvers';
import { OfflineSolution } from '../utils/mathEngineOffline';
import { TextbookWhitePage } from './TextbookWhitePage';
import {
  Calculator,
  RotateCcw,
  Box,
  Compass,
} from 'lucide-react';

interface QASolverViewProps {
  language: 'hi' | 'en';
  defaultDimension?: '3d' | '2d';
  initialShapeId?: string;
}

export const QASolverView: React.FC<QASolverViewProps> = ({
  language,
  defaultDimension = '3d',
  initialShapeId,
}) => {
  const [qaDimension, setQaDimension] = useState<'3d' | '2d'>(defaultDimension);

  // Selected module for variable solver
  const [selectedModuleId, setSelectedModuleId] = useState<string>(() => {
    if (initialShapeId) {
      const match = UNIVERSAL_FORMULA_MODULES.find((m) => m.id === initialShapeId);
      if (match) return match.id;
    }
    return defaultDimension === '3d' ? 'cylinder' : 'rectangle';
  });

  const currentModule =
    UNIVERSAL_FORMULA_MODULES.find((m) => m.id === selectedModuleId) ||
    UNIVERSAL_FORMULA_MODULES[0];

  // Inputs for Variable Solver
  const [variableInputs, setVariableInputs] = useState<Record<string, string>>(() => {
    const defaultMod =
      UNIVERSAL_FORMULA_MODULES.find((m) => m.id === selectedModuleId) ||
      UNIVERSAL_FORMULA_MODULES[0];
    const firstPreset = defaultMod.presets[0];
    const initial: Record<string, string> = {};
    defaultMod.variables.forEach((v) => {
      const val = firstPreset?.values[v.key];
      initial[v.key] = val !== null && val !== undefined ? String(val) : '';
    });
    return initial;
  });

  const [universalSolution, setUniversalSolution] = useState<OfflineSolution>(() => {
    const defaultMod =
      UNIVERSAL_FORMULA_MODULES.find((m) => m.id === selectedModuleId) ||
      UNIVERSAL_FORMULA_MODULES[0];
    const firstPreset = defaultMod.presets[0];
    return defaultMod.solve(firstPreset?.values || {});
  });

  // Synchronize when initialShapeId changes
  useEffect(() => {
    if (initialShapeId) {
      const match = UNIVERSAL_FORMULA_MODULES.find((m) => m.id === initialShapeId);
      if (match) {
        handleSelectModule(match);
      }
    }
  }, [initialShapeId]);

  // Synchronize with external dimension toggle
  useEffect(() => {
    if (defaultDimension && defaultDimension !== qaDimension) {
      setQaDimension(defaultDimension);
    }
  }, [defaultDimension]);

  // Sync dimension changes
  useEffect(() => {
    const is3DMod =
      currentModule.categoryEn.includes('3D') ||
      currentModule.categoryEn.includes('Solid') ||
      currentModule.id === 'cylinder' ||
      currentModule.id === 'cone' ||
      currentModule.id === 'sphere' ||
      currentModule.id === 'cube' ||
      currentModule.id === 'cuboid' ||
      currentModule.id === 'cube_cutting';
    if (qaDimension === '3d' && !is3DMod) {
      const first3D = UNIVERSAL_FORMULA_MODULES.find(
        (m) => m.categoryEn.includes('3D') || m.id === 'cylinder' || m.id === 'cube'
      );
      if (first3D) handleSelectModule(first3D);
    } else if (qaDimension === '2d' && is3DMod) {
      const first2D = UNIVERSAL_FORMULA_MODULES.find(
        (m) => m.categoryEn.includes('2D') || m.id === 'rectangle' || m.id === 'square'
      );
      if (first2D) handleSelectModule(first2D);
    }
  }, [qaDimension]);

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

    const numInputs: Record<string, number | null> = {};
    Object.entries(newInputs).forEach(([k, valStr]) => {
      const str = String(valStr ?? '');
      const parsed = parseFloat(str);
      numInputs[k] = isNaN(parsed) || str.trim() === '' ? null : parsed;
    });

    setUniversalSolution(mod.solve(numInputs));
  };

  // Handle variable change
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

  // Apply preset
  const handleApplyPreset = (presetValues: Record<string, number | null>) => {
    const newInputs: Record<string, string> = {};
    currentModule.variables.forEach((v) => {
      const val = presetValues[v.key];
      newInputs[v.key] = val !== null && val !== undefined ? String(val) : '';
    });
    setVariableInputs(newInputs);
    setUniversalSolution(currentModule.solve(presetValues));
  };

  // Clear inputs
  const handleClearModuleInputs = () => {
    const cleared: Record<string, string> = {};
    currentModule.variables.forEach((v) => {
      cleared[v.key] = '';
    });
    setVariableInputs(cleared);
    setUniversalSolution(currentModule.solve({}));
  };

  // Filter formula modules by 3D or 2D
  const filteredModules = UNIVERSAL_FORMULA_MODULES.filter((m) => {
    const is3D =
      m.categoryEn.includes('3D') ||
      m.categoryEn.includes('Solid') ||
      m.id === 'cylinder' ||
      m.id === 'cone' ||
      m.id === 'sphere' ||
      m.id === 'cube' ||
      m.id === 'cuboid' ||
      m.id === 'cube_cutting' ||
      m.id === 'hollow_cylinder' ||
      m.id === 'hemisphere' ||
      m.id === 'frustum';
    return qaDimension === '3d' ? is3D : !is3D;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-12">
      {/* 1. SHAPE SELECTION CHIPS */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
        {filteredModules.map((mod) => {
          const isSelected = mod.id === selectedModuleId;
          return (
            <button
              key={mod.id}
              onClick={() => handleSelectModule(mod)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? qaDimension === '3d'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span className="text-base">{mod.icon}</span>
              <span>{language === 'hi' ? mod.nameHi : mod.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN SOLVER WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Variable Inputs & Presets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentModule.icon}</span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'hi' ? currentModule.nameHi : currentModule.nameEn}
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400">
                    {currentModule.badge}
                  </span>
                </div>
              </div>

              <button
                onClick={handleClearModuleInputs}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs flex items-center gap-1 transition-all cursor-pointer"
                title="Clear All Inputs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">{language === 'hi' ? 'साफ़ करें' : 'Clear'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
              {language === 'hi' ? currentModule.descriptionHi : currentModule.descriptionEn}
            </p>

            {/* Variable Inputs Grid */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{language === 'hi' ? 'मान दर्ज करें (Input Values):' : 'Enter Values:'}</span>
                <span className="text-[10px] text-emerald-400 font-normal">
                  {language === 'hi' ? 'ऑटो कैलकुलेट' : 'Auto Calculate'}
                </span>
              </div>

              {currentModule.variables.map((v) => {
                const currentVal = variableInputs[v.key] ?? '';
                return (
                  <div
                    key={v.key}
                    className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-indigo-300 font-mono text-xs flex items-center justify-center font-bold">
                          {v.symbol}
                        </span>
                        <span>{language === 'hi' ? v.labelHi : v.labelEn}</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {language === 'hi' ? v.unitHi : v.unitEn}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={currentVal}
                      onChange={(e) => handleVariableChange(v.key, e.target.value)}
                      placeholder={v.placeholder || (language === 'hi' ? 'मान भरें या खाली छोड़ें...' : 'Enter value or leave blank...')}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                );
              })}
            </div>

            {/* Quick Exam Presets */}
            {currentModule.presets && currentModule.presets.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  {language === 'hi' ? '⚡ त्वरित परीक्षा उदाहरण (Quick Presets):' : '⚡ Quick Exam Presets:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {currentModule.presets.map((pr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplyPreset(pr.values)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                    >
                      <div className="font-bold text-indigo-400">{language === 'hi' ? pr.nameHi : pr.nameEn}</div>
                      <div className="text-[10px] text-slate-400 truncate">{language === 'hi' ? pr.descriptionHi : pr.descriptionEn}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Step-by-Step Textbook Solution */}
        <div className="lg:col-span-7">
          <TextbookWhitePage
            solution={universalSolution}
            language={language}
            onPrint={() => window.print()}
          />
        </div>
      </div>
    </div>
  );
};
