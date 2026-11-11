import React, { useState } from 'react';
import { ActiveTab, CubeCutParams, CubeFace, FaceColors, MiniCubeData } from '../types';
import { generateMiniCubes } from '../utils/mathFormulas';
import { ThreeCanvas } from './ThreeCanvas';
import { ExportActionMenu } from './ExportActionMenu';
import { Box, CheckCircle2, ChevronRight, Eye, Filter, Info, Layers, Maximize2, Palette, Sparkles, Wand2, X } from 'lucide-react';

interface CubeCuttingLabTabProps {
  language: 'hi' | 'en';
  focusMode?: boolean;
  onToggleFocus?: () => void;
  diagramOnlyMode?: boolean;
  onToggleDiagramOnly?: () => void;
  onCancelDiagramOnly?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
}

export const CubeCuttingLabTab: React.FC<CubeCuttingLabTabProps> = ({
  language,
  focusMode = false,
  onToggleFocus,
  diagramOnlyMode = false,
  onToggleDiagramOnly,
  onCancelDiagramOnly,
  onSelectTab,
}) => {
  const [params, setParams] = useState<CubeCutParams>({
    isCuboid: false,
    n: 3, // 3x3x3 = 27 mini cubes
    nx: 4,
    ny: 3,
    nz: 2,
    dimensionX: 6,
    dimensionY: 6,
    dimensionZ: 6,
    faceColors: {
      top: 'red',
      bottom: 'red',
      front: 'blue',
      back: 'blue',
      left: 'green',
      right: 'green',
    },
    explosion: 0.35, // floating exploded view
    filterType: 'all',
    filterColor: undefined,
    slicePlane: 'none',
    sliceLayer: -1,
  });

  const [selectedCube, setSelectedCube] = useState<MiniCubeData | null>(null);

  const { miniCubes, counts, formulas } = generateMiniCubes(params);

  const availableColors = [
    { name: 'Red', hex: '#ef4444', value: 'red', labelHi: 'लाल' },
    { name: 'Blue', hex: '#3b82f6', value: 'blue', labelHi: 'नीला' },
    { name: 'Green', hex: '#10b981', value: 'green', labelHi: 'हरा' },
    { name: 'Yellow', hex: '#eab308', value: 'yellow', labelHi: 'पीला' },
    { name: 'Orange', hex: '#f97316', value: 'orange', labelHi: 'नारंगी' },
    { name: 'Purple', hex: '#a855f7', value: 'purple', labelHi: 'बैंगनी' },
    { name: 'Pink', hex: '#ec4899', value: 'pink', labelHi: 'गुलाबी' },
    { name: 'White', hex: '#f8fafc', value: 'white', labelHi: 'सफेद' },
    { name: 'Black', hex: '#0f172a', value: 'black', labelHi: 'काला' },
  ];

  // Presets for face coloring
  const applyPresetColoring = (preset: 'all_red' | 'opposite_same' | 'all_distinct' | 'all_blue') => {
    let newColors: FaceColors;
    if (preset === 'all_red') {
      newColors = { top: 'red', bottom: 'red', front: 'red', back: 'red', left: 'red', right: 'red' };
    } else if (preset === 'all_blue') {
      newColors = { top: 'blue', bottom: 'blue', front: 'blue', back: 'blue', left: 'blue', right: 'blue' };
    } else if (preset === 'opposite_same') {
      newColors = { top: 'red', bottom: 'red', front: 'blue', back: 'blue', left: 'green', right: 'green' };
    } else {
      newColors = { top: 'red', bottom: 'yellow', front: 'blue', back: 'green', left: 'orange', right: 'purple' };
    }
    setParams((prev) => ({ ...prev, faceColors: newColors }));
  };

  const currentCount = params.isCuboid ? params.nx : params.n;
  const totalCuts = params.isCuboid
    ? Math.max(0, params.nx - 1) + Math.max(0, params.ny - 1) + Math.max(0, params.nz - 1)
    : 3 * Math.max(0, params.n - 1);

  const getCubePlainText = () => {
    const title = params.isCuboid
      ? `Cuboid Slicing (${params.nx}×${params.ny}×${params.nz})`
      : `Cube Slicing (${params.n}×${params.n}×${params.n})`;
    return [
      `=== ${title} ===`,
      `[Total Cuts / कुल कट]: ${totalCuts}`,
      `[Total Small Cubes / कुल छोटे घन]: ${counts.total}`,
      `\n[Breakdown of Painted Faces / रंगे फलकों की संख्या]:`,
      `  • 3 Faces Painted (Corner Cubes): ${counts.corner3Faces} [Formula: ${formulas.corner}]`,
      `  • 2 Faces Painted (Middle Edge Cubes): ${counts.edge2Faces} [Formula: ${formulas.edge}]`,
      `  • 1 Face Painted (Central Face Cubes): ${counts.central1Face} [Formula: ${formulas.central}]`,
      `  • 0 Faces Painted (Inner Core Cubes): ${counts.inner0Faces} [Formula: ${formulas.inner}]`,
    ].join('\n');
  };

  const getCubeHTMLBody = () => {
    const title = params.isCuboid
      ? `${language === 'hi' ? 'घनाभ कटिंग प्रयोगशाला' : 'Cuboid Slicing Lab'} (${params.nx}×${params.ny}×${params.nz})`
      : `${language === 'hi' ? 'घन कटिंग प्रयोगशाला' : 'Cube Slicing Lab'} (${params.n}×${params.n}×${params.n})`;

    return `
      <div class="page-title">${title}</div>
      
      <div class="section-title">1. ${language === 'hi' ? 'बुनियादी पैरामीटर' : 'Basic Parameters'}</div>
      <div class="grid-data">
        <div class="data-card">
          <div class="data-label">${language === 'hi' ? 'विभाजन (n)' : 'Division (n)'}</div>
          <div class="data-value">${params.isCuboid ? `${params.nx} × ${params.ny} × ${params.nz}` : `${params.n} × ${params.n} × ${params.n}`}</div>
        </div>
        <div class="data-card">
          <div class="data-label">${language === 'hi' ? 'कुल कट (Cuts)' : 'Total Cuts'}</div>
          <div class="data-value">${totalCuts}</div>
        </div>
        <div class="data-card">
          <div class="data-label">${language === 'hi' ? 'कुल छोटे घन' : 'Total Mini Cubes'}</div>
          <div class="data-value">${counts.total}</div>
        </div>
      </div>
      
      <div class="section-title">2. ${language === 'hi' ? 'रंगे हुए फलकों का विभाजन व सूत्र' : 'Painted Faces Breakdown & Formulas'}</div>
      <div class="grid-data">
        <div class="data-card" style="background:#fee2e2; border-color:#fca5a5;">
          <div class="data-label" style="color:#b91c1c;">3 फलक रंगे (Corner/शीर्ष)</div>
          <div class="data-value" style="color:#7f1d1d;">${counts.corner3Faces}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">सूत्र: ${formulas.corner}</div>
        </div>
        <div class="data-card" style="background:#fef3c7; border-color:#fcd34d;">
          <div class="data-label" style="color:#b45309;">2 फलक रंगे (Edge/मध्य)</div>
          <div class="data-value" style="color:#78350f;">${counts.edge2Faces}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">सूत्र: ${formulas.edge}</div>
        </div>
        <div class="data-card" style="background:#dbeafe; border-color:#93c5fd;">
          <div class="data-label" style="color:#1d4ed8;">1 फलक रंगा (Face/केंद्रीय)</div>
          <div class="data-value" style="color:#1e3a8a;">${counts.central1Face}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">सूत्र: ${formulas.central}</div>
        </div>
        <div class="data-card" style="background:#f3f4f6; border-color:#d1d5db;">
          <div class="data-label" style="color:#4b5563;">0 फलक रंगे (Inner/अंतःकेंद्रीय)</div>
          <div class="data-value" style="color:#111827;">${counts.inner0Faces}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">सूत्र: ${formulas.inner}</div>
        </div>
      </div>
    `;
  };

  // =========================================================================
  // ONLY DIAGRAM MODE (ZEN DIAGRAM VIEW)
  // Everything else is hidden, only the 3D diagram is shown with a single cancel button
  // =========================================================================
  if (diagramOnlyMode) {
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col justify-center items-center overflow-hidden select-none">
        {/* Full Viewport 3D Canvas */}
        <div className="w-full h-full">
          <ThreeCanvas
            mode="cube_cutting"
            cubeCutParams={params}
            selectedCube={selectedCube}
            onSelectMiniCube={(cube) => setSelectedCube(cube)}
            language={language}
          />
        </div>

        {/* 1. Only Button to Cancel / Exit Diagram Mode */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            id="btn-cancel-diagram-mode-cube"
            onClick={onCancelDiagramOnly}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm shadow-2xl border-2 border-white/20 transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
            title="Exit Diagram Mode"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{language === 'hi' ? 'डायग्राम मोड बंद करें (Esc)' : 'Exit Diagram Mode (Esc)'}</span>
          </button>
        </div>

        {/* Floating Title Badge at Top Center (Unobstructed from 3D controls at top-left) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white flex items-center gap-2 shadow-xl pointer-events-none max-w-[90vw] truncate">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          <span>{language === 'hi' ? `${params.isCuboid ? 'घनाभ' : 'घन'} 3D डायग्राम` : '3D Cube Slicing Diagram'}</span>
          <span className="text-slate-400 font-mono">
            ({params.isCuboid ? `${params.nx}×${params.ny}×${params.nz}` : `${params.n}×${params.n}×${params.n}`})
          </span>
        </div>

        {/* Minimal Floating Explode Slider HUD at Bottom */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-3 text-xs text-white shadow-2xl">
          <span className="text-slate-300 font-semibold">{language === 'hi' ? 'टुकड़ों का फैलाव:' : 'Explode:'}</span>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={params.explosion}
            onChange={(e) => setParams({ ...params, explosion: parseFloat(e.target.value) })}
            className="w-28 sm:w-36 accent-indigo-500 h-1.5 cursor-pointer"
          />
          <span className="font-mono text-indigo-400 font-bold">{Math.round(params.explosion * 100)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Controls: Cube / Cuboid Toggle & Color Presets */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Cube vs Cuboid switch */}
          <div className="flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              id="btn-mode-cube"
              onClick={() => setParams((p) => ({ ...p, isCuboid: false }))}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                !params.isCuboid
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'घन (Cube)' : 'Cube'}</span>
            </button>
            <button
              id="btn-mode-cuboid"
              onClick={() => setParams((p) => ({ ...p, isCuboid: true }))}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                params.isCuboid
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'घनाभ (Cuboid)' : 'Cuboid'}</span>
            </button>
          </div>

          {/* Quick Trigger for Only Diagram Mode & Export */}
          <ExportActionMenu
            title={params.isCuboid ? 'Cuboid Cutting Lab' : 'Cube Cutting Lab'}
            filename={`cube_slicing_${params.isCuboid ? 'cuboid' : 'cube'}_${Date.now()}`}
            getHTMLContent={getCubeHTMLBody}
            getPlainText={getCubePlainText}
            language={language}
          />

          <button
            id="btn-trigger-only-diagram-cube"
            onClick={onToggleDiagramOnly}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title={language === 'hi' ? 'केवल डायग्राम मोड (बाकी सब छिपाएं)' : 'Only Diagram Mode'}
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'hi' ? 'केवल डायग्राम' : 'Only Diagram'}</span>
          </button>
        </div>

        {/* Quick Color Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
            <Palette className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">{language === 'hi' ? 'रंग:' : 'Color:'}</span>
          </span>
          <button
            onClick={() => applyPresetColoring('all_red')}
            className="px-2 py-1 rounded text-[11px] font-medium bg-red-950/80 text-red-300 border border-red-800/60 hover:bg-red-900/80 transition-all shrink-0"
          >
            {language === 'hi' ? 'सभी लाल' : 'All Red'}
          </button>
          <button
            onClick={() => applyPresetColoring('opposite_same')}
            className="px-2 py-1 rounded text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60 hover:bg-blue-900/80 transition-all shrink-0"
          >
            {language === 'hi' ? 'विपरीत समान' : 'Opposite'}
          </button>
          <button
            onClick={() => applyPresetColoring('all_distinct')}
            className="px-2 py-1 rounded text-[11px] font-medium bg-purple-950/80 text-purple-300 border border-purple-800/60 hover:bg-purple-900/80 transition-all shrink-0"
          >
            {language === 'hi' ? '6 अलग रंग' : '6 Colors'}
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 3D Canvas + Slicing Controls */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className={`${focusMode ? 'h-[62vh] sm:h-[580px] min-h-[420px]' : 'h-[50vh] sm:h-[480px] min-h-[360px]'} transition-all`}>
            <ThreeCanvas
              mode="cube_cutting"
              cubeCutParams={params}
              selectedCube={selectedCube}
              onSelectMiniCube={(cube) => setSelectedCube(cube)}
              language={language}
            />
          </div>

          {/* Explosion & Layer Slicing Slider Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            {/* Exploded View Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  {language === 'hi'
                    ? '3D टुकड़ों का फैलाव (Exploded / Separation View):'
                    : 'Explode / Separation Slider:'}
                </span>
                <span className="font-mono text-indigo-400 font-bold">
                  {Math.round(params.explosion * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={params.explosion}
                onChange={(e) => setParams({ ...params, explosion: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 bg-slate-800 h-2.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{language === 'hi' ? 'जुड़ा हुआ (Assembled)' : 'Together'}</span>
                <span>{language === 'hi' ? 'मध्यम फैलाव (Separated)' : 'Separated'}</span>
                <span>{language === 'hi' ? 'पूर्णतः अलग (Fully Exploded)' : 'Fully Exploded'}</span>
              </div>
            </div>

            {/* Layer Cross-Section Slicer */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  {language === 'hi' ? 'आंतरिक परत देखें (Layer Cut):' : 'Inspect Layer:'}
                </span>
                <select
                  value={params.slicePlane}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      slicePlane: e.target.value as any,
                      sliceLayer: e.target.value === 'none' ? -1 : 0,
                    })
                  }
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                >
                  <option value="none">{language === 'hi' ? 'सभी परतें (All Layers)' : 'All Layers'}</option>
                  <option value="y">{language === 'hi' ? 'Y-अक्ष (Top to Bottom)' : 'Y-Axis (Horizontal)'}</option>
                  <option value="x">{language === 'hi' ? 'X-अक्ष (Left to Right)' : 'X-Axis (Vertical)'}</option>
                  <option value="z">{language === 'hi' ? 'Z-अक्ष (Front to Back)' : 'Z-Axis (Depth)'}</option>
                </select>
              </div>

              {params.slicePlane !== 'none' && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{language === 'hi' ? 'परत संख्या:' : 'Layer:'}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: currentCount }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setParams({ ...params, sliceLayer: idx })}
                        className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all ${
                          params.sliceLayer === idx
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Slicing Parameters & Reasoning Formulas */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Slice Controls Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-400" />
                {language === 'hi' ? 'काटने के पैरामीटर (Slicing Parameters)' : 'Slicing Controls'}
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                {counts.total} {language === 'hi' ? 'कुल टुकड़े' : 'Total Pieces'}
              </span>
            </h4>

            {!params.isCuboid ? (
              /* Cube Cuts Slider */
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-300">
                      {language === 'hi' ? 'घन का विभाजन (n cuts / भाग):' : 'Cube division (n):'}
                    </span>
                    <span className="font-mono text-indigo-400 font-bold">
                      n = {params.n} ({params.n}³ = {counts.total} {language === 'hi' ? 'टुकड़े' : 'cubes'})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="2"
                      max="10"
                      step="1"
                      value={params.n}
                      onChange={(e) => setParams({ ...params, n: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 bg-slate-800 h-2.5 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={params.n}
                      onChange={(e) => setParams({ ...params, n: Math.min(10, Math.max(2, parseInt(e.target.value) || 2)) })}
                      className="w-14 px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-center text-white"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>n=2 (8)</span>
                    <span>n=4 (64)</span>
                    <span>n=6 (216)</span>
                    <span>n=8 (512)</span>
                    <span>n=10 (1000)</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Cuboid Cuts Sliders */
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-300">
                      {language === 'hi' ? 'X-दिशा विभाजन (nx):' : 'X-cuts (nx):'}
                    </span>
                    <span className="font-mono text-indigo-400 font-bold">{params.nx}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={params.nx}
                    onChange={(e) => setParams({ ...params, nx: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-300">
                      {language === 'hi' ? 'Y-दिशा विभाजन (ny):' : 'Y-cuts (ny):'}
                    </span>
                    <span className="font-mono text-indigo-400 font-bold">{params.ny}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={params.ny}
                    onChange={(e) => setParams({ ...params, ny: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-300">
                      {language === 'hi' ? 'Z-दिशा विभाजन (nz):' : 'Z-cuts (nz):'}
                    </span>
                    <span className="font-mono text-indigo-400 font-bold">{params.nz}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={params.nz}
                    onChange={(e) => setParams({ ...params, nz: parseInt(e.target.value) })}
                    className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Individual Face Coloring Matrix */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                {language === 'hi' ? '6 फलकों के रंग चुनें (Face Colors):' : 'Color Individual Faces:'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { face: 'top', labelHi: 'ऊपरी (Top)', labelEn: 'Top' },
                    { face: 'bottom', labelHi: 'निचली (Bottom)', labelEn: 'Bottom' },
                    { face: 'front', labelHi: 'सामने (Front)', labelEn: 'Front' },
                    { face: 'back', labelHi: 'पीछे (Back)', labelEn: 'Back' },
                    { face: 'left', labelHi: 'बाईं (Left)', labelEn: 'Left' },
                    { face: 'right', labelHi: 'दाईं (Right)', labelEn: 'Right' },
                  ] as { face: CubeFace; labelHi: string; labelEn: string }[]
                ).map(({ face, labelHi, labelEn }) => (
                  <div key={face} className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 mb-1">
                      {language === 'hi' ? labelHi : labelEn}
                    </div>
                    <select
                      value={params.faceColors[face]}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          faceColors: { ...params.faceColors, [face]: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-md text-xs py-1 px-1 text-white capitalize"
                    >
                      {availableColors.map((c) => (
                        <option key={c.value} value={c.value}>
                          {language === 'hi' ? c.labelHi : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reasoning Piece Categories & Formulas (Corner, Edge, Central, Inner) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>{language === 'hi' ? 'रीज़निंग वर्गीकरण व सूत्र' : 'Reasoning Classification & Formulas'}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {language === 'hi' ? `कुल कट: ${totalCuts}` : `Total Cuts: ${totalCuts}`}
              </span>
            </h4>

            {/* 3 Faces Painted (Corner / शीर्ष) */}
            <div
              onClick={() => setParams({ ...params, filterType: params.filterType === 'corner' ? 'all' : 'corner' })}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                params.filterType === 'corner'
                  ? 'bg-amber-950/70 border-amber-400 ring-1 ring-amber-400/50'
                  : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                  <span className="text-xs font-bold text-white">
                    {language === 'hi' ? '3 फलक रंगे हुए (शीर्ष घन / Corner)' : '3 Faces Painted (Corner Cubes)'}
                  </span>
                </div>
                <span className="text-base font-mono font-bold text-amber-400">{counts.corner3Faces}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {language === 'hi'
                  ? 'सूत्र: सदैव 8 होते हैं (कोनों पर स्थित)'
                  : 'Formula: Always 8 (Located at the 8 vertices)'}
              </div>
            </div>

            {/* 2 Faces Painted (Middle / Edge / मध्य) */}
            <div
              onClick={() => setParams({ ...params, filterType: params.filterType === 'edge' ? 'all' : 'edge' })}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                params.filterType === 'edge'
                  ? 'bg-blue-950/70 border-blue-400 ring-1 ring-blue-400/50'
                  : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
                  <span className="text-xs font-bold text-white">
                    {language === 'hi' ? '2 फलक रंगे हुए (मध्य घन / Edge)' : '2 Faces Painted (Edge/Middle Cubes)'}
                  </span>
                </div>
                <span className="text-base font-mono font-bold text-blue-400">{counts.edge2Faces}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {language === 'hi' ? `सूत्र: 12 × (n - 2) = ${formulas.edge}` : `Formula: 12(n - 2) = ${formulas.edge}`}
              </div>
            </div>

            {/* 1 Face Painted (Central / केंद्रीय) */}
            <div
              onClick={() => setParams({ ...params, filterType: params.filterType === 'central' ? 'all' : 'central' })}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                params.filterType === 'central'
                  ? 'bg-emerald-950/70 border-emerald-400 ring-1 ring-emerald-400/50'
                  : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  <span className="text-xs font-bold text-white">
                    {language === 'hi' ? '1 फलक रंगा हुआ (केंद्रीय घन / Central)' : '1 Face Painted (Central Cubes)'}
                  </span>
                </div>
                <span className="text-base font-mono font-bold text-emerald-400">{counts.central1Face}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {language === 'hi'
                  ? `सूत्र: 6 × (n - 2)² = ${formulas.central}`
                  : `Formula: 6(n - 2)² = ${formulas.central}`}
              </div>
            </div>

            {/* 0 Faces Painted (Inner / अंतःकेंद्रीय / बिना रंग) */}
            <div
              onClick={() => setParams({ ...params, filterType: params.filterType === 'inner' ? 'all' : 'inner' })}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                params.filterType === 'inner'
                  ? 'bg-purple-950/70 border-purple-400 ring-1 ring-purple-400/50'
                  : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                  <span className="text-xs font-bold text-white">
                    {language === 'hi'
                      ? '0 फलक रंगे हुए / रंगहीन (अंतःकेंद्रीय घन)'
                      : '0 Faces / Colourless (Inner Cubes)'}
                  </span>
                </div>
                <span className="text-base font-mono font-bold text-purple-400">{counts.inner0Faces}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {language === 'hi' ? `सूत्र: (n - 2)³ = ${formulas.inner}` : `Formula: (n - 2)³ = ${formulas.inner}`}
              </div>
            </div>

            {/* Filter Reset Button */}
            {params.filterType !== 'all' && (
              <button
                onClick={() => setParams({ ...params, filterType: 'all' })}
                className="w-full py-1.5 text-xs text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/50 rounded-lg transition-all"
              >
                {language === 'hi' ? 'सारे टुकड़े दिखाएं (Reset Filter)' : 'Show All Pieces'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mini Cube Selected Inspection Drawer Card */}
      {selectedCube && (
        <div className="bg-slate-900/95 border-2 border-amber-400/70 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                {language === 'hi' ? 'चयनित टुकड़े की 3D जांच (Piece Inspector)' : 'Selected Piece Inspector'}
              </span>
              <h4 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                <span>
                  {selectedCube.type === 'corner'
                    ? language === 'hi'
                      ? 'शीर्ष घन (Corner Cube)'
                      : 'Corner Cube (शीर्ष घन)'
                    : selectedCube.type === 'edge'
                    ? language === 'hi'
                      ? 'मध्य घन (Edge Cube)'
                      : 'Edge Cube (मध्य घन)'
                    : selectedCube.type === 'central'
                    ? language === 'hi'
                      ? 'केंद्रीय घन (Central Cube)'
                      : 'Central Cube (केंद्रीय घन)'
                    : language === 'hi'
                    ? 'अंतःकेंद्रीय घन (Inner Colourless Cube)'
                    : 'Inner Core Cube (अंतःकेंद्रीय घन)'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Coordinates: ({selectedCube.x + 1}, {selectedCube.y + 1}, {selectedCube.z + 1})
                </span>
              </h4>
            </div>

            <button
              onClick={() => setSelectedCube(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">{language === 'hi' ? 'रंगे हुए फलक' : 'Painted Faces Count'}</div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {selectedCube.facesPaintedCount} / 6
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">{language === 'hi' ? 'रंग विवरण' : 'Painted Face Details'}</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedCube.paintedFaces.length > 0 ? (
                  selectedCube.paintedFaces.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-medium border text-white capitalize"
                      style={{ backgroundColor: `${p.color}33`, borderColor: p.color }}
                    >
                      {p.face}: {p.color}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-purple-400 font-medium">
                    {language === 'hi' ? 'कोई रंग नहीं (रंगहीन अंदरूनी हिस्सा)' : 'Unpainted Inner Core'}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">{language === 'hi' ? 'परीक्षा ट्रिक' : 'Reasoning Shortcut'}</div>
              <div className="text-xs text-indigo-300 mt-1 font-medium">
                {selectedCube.type === 'corner' && 'कोनों के टुकड़े हमेशा 8 होते हैं, चाहे n कोई भी हो।'}
                {selectedCube.type === 'edge' && 'किनारों के टुकड़े = 12 × (n - 2)'}
                {selectedCube.type === 'central' && 'सतह के केंद्र के टुकड़े = 6 × (n - 2)²'}
                {selectedCube.type === 'inner' && 'अंदर छिपे टुकड़े = (n - 2)³'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
