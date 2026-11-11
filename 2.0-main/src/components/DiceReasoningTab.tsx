import React, { useState, useEffect } from 'react';
import { ThreeCanvas } from './ThreeCanvas';
import {
  Award,
  Box,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dices,
  Eye,
  HelpCircle,
  Layers,
  Lightbulb,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Sparkles,
  Trash2,
  Maximize2,
  X,
} from 'lucide-react';
import { ActiveTab, SingleDiceView } from '../types';

interface DiceReasoningTabProps {
  language: 'hi' | 'en';
  diagramOnlyMode?: boolean;
  onToggleDiagramOnly?: () => void;
  onCancelDiagramOnly?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
}

export const DiceReasoningTab: React.FC<DiceReasoningTabProps> = ({
  language,
  diagramOnlyMode = false,
  onToggleDiagramOnly,
  onCancelDiagramOnly,
  onSelectTab,
}) => {
  const [subTab, setSubTab] = useState<'opposite_solver' | 'open_dice' | 'standard_vs_ordinary'>(
    'opposite_solver'
  );

  // Multi-Dice State: 1 to 4 Dice
  const [diceCount, setDiceCount] = useState<number>(2);
  const [diceList, setDiceList] = useState<SingleDiceView[]>([
    { id: 1, top: 3, front: 1, right: 2, labelHi: 'पासा I', labelEn: 'Dice I' },
    { id: 2, top: 3, front: 5, right: 4, labelHi: 'पासा II', labelEn: 'Dice II' },
    { id: 3, top: 2, front: 4, right: 6, labelHi: 'पासा III', labelEn: 'Dice III' },
    { id: 4, top: 1, front: 6, right: 3, labelHi: 'पासा IV', labelEn: 'Dice IV' },
  ]);

  const [activeDiceIndex, setActiveDiceIndex] = useState<number>(0);

  // Open Dice Net & Step-by-Step 3D Unfolding State
  const [unfoldStep, setUnfoldStep] = useState<number>(0); // 0 (closed) to 5 (full net)
  const [unfoldProgress, setUnfoldProgress] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [stepMode, setStepMode] = useState<boolean>(true);

  // Auto-play interval for sequential unfolding
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying && subTab === 'open_dice') {
      interval = setInterval(() => {
        setUnfoldStep((prev) => {
          if (prev >= 5) {
            return 0; // loop back
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, subTab]);

  // Update unfold progress when unfoldStep changes in step mode
  useEffect(() => {
    if (stepMode) {
      setUnfoldProgress(unfoldStep / 5);
    }
  }, [unfoldStep, stepMode]);

  // Handler to update a face of a dice
  const handleFaceChange = (
    index: number,
    face: 'top' | 'front' | 'right',
    value: number
  ) => {
    const val = Math.min(6, Math.max(1, value || 1));
    setDiceList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [face]: val };
      return next;
    });
  };

  // Add / Remove Dice (1 to 4)
  const handleAddDice = () => {
    if (diceCount < 4) {
      const newCount = diceCount + 1;
      setDiceCount(newCount);
      setActiveDiceIndex(newCount - 1);
    }
  };

  const handleRemoveDice = () => {
    if (diceCount > 1) {
      const newCount = diceCount - 1;
      setDiceCount(newCount);
      if (activeDiceIndex >= newCount) {
        setActiveDiceIndex(newCount - 1);
      }
    }
  };

  // Multi-Dice Presets
  const applyPreset = (presetName: string) => {
    if (presetName === '1_dice_standard') {
      setDiceCount(1);
      setDiceList([
        { id: 1, top: 1, front: 2, right: 3, labelHi: 'पासा (मानक)', labelEn: 'Standard Dice' },
      ]);
    } else if (presetName === '2_dice_1common') {
      setDiceCount(2);
      setDiceList([
        { id: 1, top: 3, front: 1, right: 2, labelHi: 'पासा I', labelEn: 'Dice I' },
        { id: 2, top: 3, front: 5, right: 4, labelHi: 'पासा II', labelEn: 'Dice II' },
      ]);
    } else if (presetName === '2_dice_2common') {
      setDiceCount(2);
      setDiceList([
        { id: 1, top: 2, front: 4, right: 1, labelHi: 'पासा I', labelEn: 'Dice I' },
        { id: 2, top: 2, front: 4, right: 6, labelHi: 'पासा II', labelEn: 'Dice II' },
      ]);
    } else if (presetName === '3_dice_exam') {
      setDiceCount(3);
      setDiceList([
        { id: 1, top: 6, front: 2, right: 3, labelHi: 'पासा I', labelEn: 'Dice I' },
        { id: 2, top: 6, front: 3, right: 5, labelHi: 'पासा II', labelEn: 'Dice II' },
        { id: 3, top: 5, front: 4, right: 6, labelHi: 'पासा III', labelEn: 'Dice III' },
      ]);
    } else if (presetName === '4_dice_ssc_cgl') {
      setDiceCount(4);
      setDiceList([
        { id: 1, top: 4, front: 1, right: 2, labelHi: 'पासा I (SSC)', labelEn: 'Dice I' },
        { id: 2, top: 4, front: 2, right: 3, labelHi: 'पासा II (SSC)', labelEn: 'Dice II' },
        { id: 3, top: 4, front: 5, right: 6, labelHi: 'पासा III (SSC)', labelEn: 'Dice III' },
        { id: 4, top: 1, front: 2, right: 4, labelHi: 'पासा IV (SSC)', labelEn: 'Dice IV' },
      ]);
    }
  };

  // Comprehensive Multi-Dice Reasoning Engine
  const analyzeMultiDice = () => {
    const activeDice = diceList.slice(0, diceCount);

    if (diceCount === 1) {
      const d = activeDice[0];
      const sum1 = d.top + d.front;
      const sum2 = d.front + d.right;
      const sum3 = d.top + d.right;
      const isOrdinary = sum1 === 7 || sum2 === 7 || sum3 === 7;

      return {
        type: 'single',
        isOrdinary,
        titleHi: isOrdinary
          ? 'साधारण पासा (Ordinary Dice) - पड़ोसी सतहों का योग 7 है'
          : 'मानक पासा (Standard Dice) - विपरीत सतहों का योग 7 होगा',
        titleEn: isOrdinary
          ? 'Ordinary Dice (Adjacent sum = 7)'
          : 'Standard Dice (Opposite sum = 7)',
        explanationHi: isOrdinary
          ? `दिखने वाले फलकों में योग 7 आ रहा है (उदा: ${sum1 === 7 ? `${d.top}+${d.front}` : sum2 === 7 ? `${d.front}+${d.right}` : `${d.top}+${d.right}`}=7)। अतः यह साधारण पासा है। बिना अन्य पासे के निश्चित विपरीत ज्ञात नहीं किया जा सकता।`
          : `दिखने वाली किसी भी 2 पड़ोसी सतहों का योग 7 नहीं है। अतः यह मानक पासा है। नियमतः विपरीत सतहों का योग 7 होगा।`,
        opposites: isOrdinary
          ? []
          : [
              { a: d.top, b: 7 - d.top },
              { a: d.front, b: 7 - d.front },
              { a: d.right, b: 7 - d.right },
            ],
        steps: [
          `शीर्ष (Top) = ${d.top}, सामने (Front) = ${d.front}, दायां (Right) = ${d.right}`,
          isOrdinary
            ? `पड़ोसी योग = 7 होने से विपरीत ज्ञात करने के लिए दूसरा दृश्य आवश्यक है।`
            : `मानक नियम: 1↔6, 2↔5, 3↔4 (प्रत्येक जोड़े का योग 7 है)`,
        ],
      };
    }

    // Multi-dice (2, 3, or 4 dice): Cross-pair analysis
    const pairsAnalysis: {
      diceA: number;
      diceB: number;
      common: number[];
      rule: string;
      descriptionHi: string;
      descriptionEn: string;
      deduced: { a: number; b: number }[];
    }[] = [];

    const confirmedOpposites: Record<number, number> = {};
    const adjacentMap: Record<number, Set<number>> = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
      5: new Set(),
      6: new Set(),
    };

    // Populate adjacent neighbors
    activeDice.forEach((d) => {
      const faces = [d.top, d.front, d.right];
      faces.forEach((f1) => {
        faces.forEach((f2) => {
          if (f1 !== f2) {
            adjacentMap[f1]?.add(f2);
            adjacentMap[f2]?.add(f1);
          }
        });
      });
    });

    // Check all combinations of pairs (i, j)
    for (let i = 0; i < activeDice.length; i++) {
      for (let j = i + 1; j < activeDice.length; j++) {
        const d1 = activeDice[i];
        const d2 = activeDice[j];
        const v1 = [d1.top, d1.front, d1.right];
        const v2 = [d2.top, d2.front, d2.right];
        const common = v1.filter((x) => v2.includes(x));

        if (common.length === 1) {
          const c = common[0];
          // Determine cyclic order from common face
          const idx1 = v1.indexOf(c);
          const idx2 = v2.indexOf(c);
          const order1 = [v1[idx1], v1[(idx1 + 1) % 3], v1[(idx1 + 2) % 3]];
          const order2 = [v2[idx2], v2[(idx2 + 1) % 3], v2[(idx2 + 2) % 3]];

          const pair1 = { a: order1[1], b: order2[1] };
          const pair2 = { a: order1[2], b: order2[2] };

          if (pair1.a !== pair1.b) {
            confirmedOpposites[pair1.a] = pair1.b;
            confirmedOpposites[pair1.b] = pair1.a;
          }
          if (pair2.a !== pair2.b) {
            confirmedOpposites[pair2.a] = pair2.b;
            confirmedOpposites[pair2.b] = pair2.a;
          }

          // Remaining common face is opposite to the 6th unseen number
          const allNums = [1, 2, 3, 4, 5, 6];
          const used = new Set([...order1, ...order2]);
          const missing = allNums.find((n) => !used.has(n));
          if (missing) {
            confirmedOpposites[c] = missing;
            confirmedOpposites[missing] = c;
          }

          pairsAnalysis.push({
            diceA: i + 1,
            diceB: j + 1,
            common,
            rule: 'one_common',
            descriptionHi: `पासा ${i + 1} और पासा ${j + 1} में अंक ${c} कॉमन है। क्लॉकवाइज (घड़ी की दिशा) नियम: [${order1.join(' → ')}] और [${order2.join(' → ')}]. अतः ${pair1.a} ⟷ ${pair1.b} और ${pair2.a} ⟷ ${pair2.b}!`,
            descriptionEn: `Dice ${i + 1} & ${j + 1} have common face ${c}. Clockwise rule yields: ${pair1.a} ⟷ ${pair1.b} and ${pair2.a} ⟷ ${pair2.b}.`,
            deduced: [pair1, pair2, ...(missing ? [{ a: c, b: missing }] : [])],
          });
        } else if (common.length === 2) {
          const rem1 = v1.find((x) => !v2.includes(x))!;
          const rem2 = v2.find((x) => !v1.includes(x))!;
          if (rem1 && rem2 && rem1 !== rem2) {
            confirmedOpposites[rem1] = rem2;
            confirmedOpposites[rem2] = rem1;
          }

          pairsAnalysis.push({
            diceA: i + 1,
            diceB: j + 1,
            common,
            rule: 'two_common',
            descriptionHi: `पासा ${i + 1} और पासा ${j + 1} में दो अंक (${common.join(', ')}) कॉमन हैं। नियमतः बची हुई तीसरी सतहें (${rem1} ⟷ ${rem2}) परस्पर विपरीत होंगी!`,
            descriptionEn: `Dice ${i + 1} & ${j + 1} have two common faces (${common.join(', ')}). Remaining faces (${rem1} ⟷ ${rem2}) are opposite!`,
            deduced: [{ a: rem1, b: rem2 }],
          });
        }
      }
    }

    // Elimination Rule: if a face has 4 distinct neighbors, the 6th number must be opposite!
    [1, 2, 3, 4, 5, 6].forEach((n) => {
      const neighbors = Array.from(adjacentMap[n] || []);
      if (neighbors.length >= 4) {
        const missing = [1, 2, 3, 4, 5, 6].find((x) => x !== n && !neighbors.includes(x));
        if (missing) {
          confirmedOpposites[n] = missing;
          confirmedOpposites[missing] = n;
        }
      }
    });

    // Format resolved distinct opposite pairs
    const seen = new Set<number>();
    const resolvedPairs: { a: number; b: number }[] = [];
    Object.entries(confirmedOpposites).forEach(([k, v]) => {
      const numK = parseInt(k, 10);
      if (!seen.has(numK) && !seen.has(v)) {
        resolvedPairs.push({ a: numK, b: v });
        seen.add(numK);
        seen.add(v);
      }
    });

    return {
      type: 'multi',
      pairsAnalysis,
      resolvedPairs,
      adjacentMap,
    };
  };

  const reasoningResult = analyzeMultiDice();

  // Face unfolding names & descriptions
  const unfoldStepsDetails = [
    {
      step: 0,
      nameHi: '0. पूर्ण बंद 3D पासा',
      nameEn: '0. Closed 3D Cube',
      descHi: 'सभी 6 फलक जुड़े हुए हैं। केवल 3 सतहें दिख रही हैं।',
      descEn: 'Standard solid cube view.',
    },
    {
      step: 1,
      nameHi: '1. ऊपर का फलक खुला (Top Opened)',
      nameEn: '1. Top Face Unfolded',
      descHi: 'शीर्ष फलक ऊपर की ओर 90° हिंग पर खुल गया।',
      descEn: 'Top face flipped up 90° along top edge.',
    },
    {
      step: 2,
      nameHi: '2. नीचे का फलक खुला (Bottom Opened)',
      nameEn: '2. Bottom Face Unfolded',
      descHi: 'तल का फलक नीचे की ओर 90° हिंग पर खुल गया।',
      descEn: 'Bottom face flipped down 90° along bottom edge.',
    },
    {
      step: 3,
      nameHi: '3. बायां फलक खुला (Left Opened)',
      nameEn: '3. Left Face Unfolded',
      descHi: 'बायां फलक बाईं ओर 90° हिंग पर सीधा हो गया।',
      descEn: 'Left face flipped left 90° along left edge.',
    },
    {
      step: 4,
      nameHi: '4. दायां फलक खुला (Right Opened)',
      nameEn: '4. Right Face Unfolded',
      descHi: 'दायां फलक दाईं ओर 90° हिंग पर सीधा हो गया।',
      descEn: 'Right face flipped right 90° along right edge.',
    },
    {
      step: 5,
      nameHi: '5. पिछला फलक खुला - सम्पूर्ण 2D नेट',
      nameEn: '5. Back Face Unfolded (Full Net)',
      descHi: 'पिछला फलक भी बाहर निकलकर 2D क्रॉस नेट में बदल गया!',
      descEn: 'Back face fully extends flat forming complete 2D Net!',
    },
  ];

  // =========================================================================
  // ONLY DIAGRAM MODE (ZEN DIAGRAM VIEW)
  // Everything else is hidden, only the 3D dice diagram is shown with a single cancel button
  // =========================================================================
  if (diagramOnlyMode) {
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col justify-center items-center overflow-hidden select-none">
        {/* Full Viewport 3D Canvas */}
        <div className="w-full h-full">
          <ThreeCanvas
            mode="dice"
            diceParams={{
              diceList: diceList.slice(0, diceCount),
              activeDiceIndex,
              isUnfolded: subTab === 'open_dice',
              unfoldProgress,
            }}
            language={language}
          />
        </div>

        {/* 1. Only Button to Cancel / Exit Diagram Mode */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            id="btn-cancel-diagram-mode-dice"
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
          <span className="truncate">
            {language === 'hi'
              ? subTab === 'open_dice'
                ? `पासा 3D नेट अनफोल्डिंग (स्टेप ${unfoldStep}/5)`
                : `पासा 3D रीज़निंग (${diceCount} पासे)`
              : subTab === 'open_dice'
              ? `3D Dice Net Unfolding (Step ${unfoldStep}/5)`
              : `3D Dice Reasoning (${diceCount} Dice)`}
          </span>
        </div>

        {/* Floating Unfolding Step Controls at Bottom if in open_dice mode */}
        {subTab === 'open_dice' && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-2 text-xs text-white shadow-2xl">
            <span className="text-slate-400 font-semibold mr-1">{language === 'hi' ? 'स्टेप:' : 'Step:'}</span>
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStepMode(true);
                  setUnfoldStep(s);
                }}
                className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all ${
                  unfoldStep === s
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {s === 0 ? 'बंद' : s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub Tab Navigation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 sm:p-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <button
            onClick={() => setSubTab('opposite_solver')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'opposite_solver'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'पासा विश्लेषक (1 से 4 पासे)' : 'Multi-Dice Solver (1-4 Dice)'}</span>
          </button>

          <button
            onClick={() => {
              setSubTab('open_dice');
              setStepMode(true);
              setUnfoldStep(1);
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'open_dice'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'एक-एक कर पासा खोलें (Step 3D Net)' : 'Step-by-Step 3D Unfold'}</span>
          </button>

          <button
            onClick={() => setSubTab('standard_vs_ordinary')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'standard_vs_ordinary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'मानक vs साधारण पासा नियम' : 'Dice Concepts & Rules'}</span>
          </button>
        </div>

        <button
          id="btn-trigger-only-diagram-dice"
          onClick={onToggleDiagramOnly}
          className="py-1.5 px-2.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          title={language === 'hi' ? 'केवल डायग्राम मोड (बाकी सब छिपाएं)' : 'Only Diagram Mode'}
        >
          <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'hi' ? 'केवल डायग्राम' : 'Only Diagram'}</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* MODE 1: MULTI-DICE REASONING SOLVER (1 to 4 Dice)                  */}
      {/* =================================================================== */}
      {subTab === 'opposite_solver' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 3D Canvas (Renders 1 to 4 Dice simultaneously) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="h-[430px] sm:h-[490px]">
              <ThreeCanvas
                mode="dice"
                diceParams={{
                  diceList: diceList.slice(0, diceCount),
                  activeDiceIndex,
                  isUnfolded: false,
                  unfoldProgress: 0,
                }}
                language={language}
              />
            </div>

            {/* Competitive Exam Presets */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'hi' ? 'प्रतियोगी परीक्षा प्रश्न प्रीसेट:' : 'Official Exam Presets:'}</span>
                </span>
                <span className="text-[11px] text-indigo-400 font-mono">
                  {diceCount} {language === 'hi' ? 'पासे सक्रिय' : 'Dice Active'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => applyPreset('1_dice_standard')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-600 text-slate-300 text-xs transition-all"
                >
                  1 पासा (मानक परीक्षण)
                </button>
                <button
                  onClick={() => applyPreset('2_dice_1common')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-600 text-slate-300 text-xs transition-all"
                >
                  2 पासे: 1 Common Face (SSC CGL)
                </button>
                <button
                  onClick={() => applyPreset('2_dice_2common')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-600 text-slate-300 text-xs transition-all"
                >
                  2 पासे: 2 Common Faces (RRB)
                </button>
                <button
                  onClick={() => applyPreset('3_dice_exam')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-600 text-slate-300 text-xs transition-all"
                >
                  3 पासे: रेलवे NTPC समस्या
                </button>
                <button
                  onClick={() => applyPreset('4_dice_ssc_cgl')}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 font-semibold text-xs transition-all"
                >
                  ★ 4 पासे: SSC CGL 4-Dice Master
                </button>
              </div>
            </div>
          </div>

          {/* Right: Multi-Dice Controls & Mathematical Reasoning */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Dice Count Selector */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Dices className="w-4 h-4 text-indigo-400" />
                  <span>{language === 'hi' ? 'पासों की संख्या (1 से 4):' : 'Number of Dice (1 to 4):'}</span>
                </label>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setDiceCount(num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                        diceCount === num
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {num} {num === 1 ? (language === 'hi' ? 'पासा' : 'Dice') : (language === 'hi' ? 'पासे' : 'Dice')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Dice Face Editors */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {diceList.slice(0, diceCount).map((d, idx) => {
                  const isSelected = activeDiceIndex === idx;
                  return (
                    <div
                      key={d.id}
                      onClick={() => setActiveDiceIndex(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                            {idx + 1}
                          </span>
                          <span>{language === 'hi' ? d.labelHi : d.labelEn}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Top:{d.top} | Front:{d.front} | Right:{d.right}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-indigo-300 font-medium block mb-1">
                            {language === 'hi' ? 'ऊपर (Top)' : 'Top'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={d.top}
                            onChange={(e) =>
                              handleFaceChange(idx, 'top', parseInt(e.target.value, 10))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-blue-300 font-medium block mb-1">
                            {language === 'hi' ? 'सामने (Front)' : 'Front'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={d.front}
                            onChange={(e) =>
                              handleFaceChange(idx, 'front', parseInt(e.target.value, 10))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-amber-300 font-medium block mb-1">
                            {language === 'hi' ? 'दायां (Right)' : 'Right'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={d.right}
                            onChange={(e) =>
                              handleFaceChange(idx, 'right', parseInt(e.target.value, 10))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-xs font-mono font-bold text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Multi-Dice Reasoning Solution Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'hi' ? 'विपरीत सतह विश्लेषण परिणाम' : 'Opposite Faces Result'}</span>
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {diceCount} {language === 'hi' ? 'पासे विश्लेषित' : 'Dice Analyzed'}
                </span>
              </div>

              {reasoningResult.type === 'single' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p className="font-bold text-indigo-300 mb-1">{reasoningResult.titleHi}</p>
                    <p>{reasoningResult.explanationHi}</p>
                  </div>

                  {reasoningResult.opposites.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {reasoningResult.opposites.map((p, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-around font-mono font-bold text-xs"
                        >
                          <span className="text-indigo-300">{p.a}</span>
                          <span className="text-slate-400 text-[10px]">⟷</span>
                          <span className="text-emerald-400">{p.b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Step-by-step pair deductions */}
                  <div className="space-y-2">
                    {reasoningResult.pairsAnalysis?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed"
                      >
                        <div className="font-bold text-indigo-300 text-[11px] mb-1">
                          • {language === 'hi' ? `पासा ${item.diceA} vs पासा ${item.diceB} तुलना:` : `Dice ${item.diceA} vs Dice ${item.diceB}:`}
                        </div>
                        <p>{language === 'hi' ? item.descriptionHi : item.descriptionEn}</p>
                      </div>
                    ))}
                  </div>

                  {/* Confirmed Opposite Pairs Matrix */}
                  {reasoningResult.resolvedPairs && reasoningResult.resolvedPairs.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                        {language === 'hi' ? '★ प्राप्त विपरीत जोड़े (Opposite Pairs):' : '★ Confirmed Opposite Pairs:'}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {reasoningResult.resolvedPairs.map((p, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-700/60 flex items-center justify-between shadow-sm"
                          >
                            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs font-mono shadow">
                              {p.a}
                            </span>
                            <span className="text-xs text-indigo-300 font-bold">⟷</span>
                            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs font-mono shadow">
                              {p.b}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 2: STEP-BY-STEP SEQUENTIAL 3D OPEN DICE UNFOLDING              */}
      {/* =================================================================== */}
      {subTab === 'open_dice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 3D Unfolding Stage with Hinge Animation */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="h-[440px] sm:h-[500px]">
              <ThreeCanvas
                mode="dice"
                diceParams={{
                  diceValues: [1, 6, 2, 5, 3, 4],
                  isUnfolded: true,
                  unfoldProgress,
                  unfoldStep,
                  stepByStepMode: stepMode,
                }}
                language={language}
              />
            </div>

            {/* Sequential Step Selector & Auto Play Controls */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md ${
                      isAutoPlaying
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isAutoPlaying ? (language === 'hi' ? 'रोकें' : 'Pause') : (language === 'hi' ? 'ऑटो प्ले एनीमेशन' : 'Auto Play')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setUnfoldStep(0);
                      setUnfoldProgress(0);
                      setIsAutoPlaying(false);
                    }}
                    className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all text-xs"
                    title="Reset"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setUnfoldStep((p) => Math.max(0, p - 1));
                    }}
                    disabled={unfoldStep === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-40 border border-slate-800 text-xs font-medium"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{language === 'hi' ? 'पिछला फलक' : 'Prev'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setUnfoldStep((p) => Math.min(5, p + 1));
                    }}
                    disabled={unfoldStep === 5}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 text-xs font-semibold shadow-md"
                  >
                    <span>{language === 'hi' ? 'अगला फलक खोलें' : 'Next Face'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 6 Step Buttons (0 to 5) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {unfoldStepsDetails.map((s) => (
                  <button
                    key={s.step}
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setStepMode(true);
                      setUnfoldStep(s.step);
                    }}
                    className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
                      unfoldStep === s.step
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800/90'
                    }`}
                  >
                    <span className="text-xs font-mono">Step {s.step}</span>
                    <span className="text-[10px] truncate w-full mt-0.5">
                      {s.step === 0
                        ? 'बंद पासा'
                        : s.step === 1
                        ? 'Top ऊपर'
                        : s.step === 2
                        ? 'Bottom नीचे'
                        : s.step === 3
                        ? 'Left बायां'
                        : s.step === 4
                        ? 'Right दायां'
                        : 'Back पूरा नेट'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Smooth Continuous Slider */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-xs font-medium mb-1">
                  <span className="text-slate-400">
                    {language === 'hi' ? 'स्मूथ हिंग स्लाइडर (0° से 90°):' : 'Continuous Hinge Slider:'}
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {Math.round(unfoldProgress * 100)}% ({unfoldStep}/5 खुले फलक)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={unfoldProgress}
                  onChange={(e) => {
                    setIsAutoPlaying(false);
                    setStepMode(false);
                    const val = parseFloat(e.target.value);
                    setUnfoldProgress(val);
                    setUnfoldStep(Math.round(val * 5));
                  }}
                  className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right: Active Unfolding Step Explanation & 2D Cross Net */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Active Step Status Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>{unfoldStepsDetails[unfoldStep].nameHi}</span>
                </h4>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Step {unfoldStep} of 5
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed p-3 bg-slate-950 rounded-xl border border-slate-800">
                {unfoldStepsDetails[unfoldStep].descHi}
              </p>

              {/* 2D Cross Net Diagram */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center">
                <div className="text-[11px] font-semibold text-slate-400 mb-2.5">
                  {language === 'hi' ? 'खुला पासा (2D Flat Cross Net स्वरूप):' : '2D Cross Net Layout:'}
                </div>

                <div className="grid grid-cols-4 gap-1 w-44 text-center text-[11px] font-mono font-bold">
                  <div></div>
                  <div
                    className={`p-2 rounded-md border transition-all ${
                      unfoldStep >= 1
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                        : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50'
                    }`}
                  >
                    1 (Top)
                  </div>
                  <div></div>
                  <div></div>

                  <div
                    className={`p-2 rounded-md border transition-all ${
                      unfoldStep >= 3
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                        : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50'
                    }`}
                  >
                    3 (Left)
                  </div>
                  <div className="bg-blue-600 text-white p-2 rounded-md border border-blue-400 shadow">
                    2 (Front)
                  </div>
                  <div
                    className={`p-2 rounded-md border transition-all ${
                      unfoldStep >= 4
                        ? 'bg-amber-600 text-white border-amber-400 shadow'
                        : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50'
                    }`}
                  >
                    4 (Right)
                  </div>
                  <div
                    className={`p-2 rounded-md border transition-all ${
                      unfoldStep >= 5
                        ? 'bg-purple-600 text-white border-purple-400 shadow'
                        : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50'
                    }`}
                  >
                    5 (Back)
                  </div>

                  <div></div>
                  <div
                    className={`p-2 rounded-md border transition-all ${
                      unfoldStep >= 2
                        ? 'bg-rose-600 text-white border-rose-400 shadow'
                        : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50'
                    }`}
                  >
                    6 (Bottom)
                  </div>
                  <div></div>
                  <div></div>
                </div>
              </div>

              {/* Fundamental Open Dice Net Theorems */}
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <p>
                    <strong className="text-white">
                      {language === 'hi' ? 'एकांतर फलक नियम (Alternate Face):' : 'Alternate Face Rule:'}
                    </strong>{' '}
                    {language === 'hi'
                      ? 'सीधी रेखा में 1 बॉक्स छोड़कर अगला बॉक्स विपरीत होता है (1 ⟷ 6 और 3 ⟷ 4).'
                      : 'Skipping one box in line gives opposite faces (1 ⟷ 6 and 3 ⟷ 4).'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <p>
                    <strong className="text-white">
                      {language === 'hi' ? 'Z-नियम (Z-Pattern):' : 'Z-Rule for Opposites:'}
                    </strong>{' '}
                    {language === 'hi'
                      ? 'Z-आकार के दोनों बाहरी सिरों पर मौजूद फलक विपरीत होते हैं (2 ⟷ 5).'
                      : 'The two ends of the Z-shape are opposite to each other (2 ⟷ 5).'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 3: STANDARD VS ORDINARY DICE CONCEPTS                         */}
      {/* =================================================================== */}
      {subTab === 'standard_vs_ordinary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-indigo-900/50 rounded-2xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400 text-indigo-300 flex items-center justify-center font-bold text-sm">
                1
              </span>
              <h4 className="text-base font-bold text-white">
                {language === 'hi' ? 'मानक पासा (Standard Dice)' : 'Standard Dice'}
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'hi'
                ? 'मानक पासा वह होता है जिसमें किन्हीं भी दो विपरीत सतहों (Opposite Faces) का योग हमेशा 7 होता है।'
                : 'A Standard Dice is one where the sum of any two opposite faces is always exactly 7.'}
            </p>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-indigo-300">
                {language === 'hi' ? 'नियम और पहचान:' : 'Key Rules & Identification:'}
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center justify-between p-1.5 rounded bg-slate-900">
                  <span>1 के विपरीत:</span> <span className="font-mono font-bold text-white">6 (1 + 6 = 7)</span>
                </li>
                <li className="flex items-center justify-between p-1.5 rounded bg-slate-900">
                  <span>2 के विपरीत:</span> <span className="font-mono font-bold text-white">5 (2 + 5 = 7)</span>
                </li>
                <li className="flex items-center justify-between p-1.5 rounded bg-slate-900">
                  <span>3 के विपरीत:</span> <span className="font-mono font-bold text-white">4 (3 + 4 = 7)</span>
                </li>
                <li className="text-amber-400 text-[11px] pt-1">
                  ⚠️ {language === 'hi' ? 'किन्हीं भी 2 पास वाली (पड़ोसी) सतहों का योग 7 कभी नहीं हो सकता!' : 'No two adjacent visible faces sum to 7!'}
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-emerald-900/50 rounded-2xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-400 text-emerald-300 flex items-center justify-center font-bold text-sm">
                2
              </span>
              <h4 className="text-base font-bold text-white">
                {language === 'hi' ? 'सामान्य / साधारण पासा (Ordinary Dice)' : 'Ordinary / General Dice'}
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'hi'
                ? 'साधारण पासा वह होता है जिसमें दिखने वाली किन्हीं भी दो निकटवर्ती (पड़ोसी) सतहों का योग 7 हो जाता है।'
                : 'An Ordinary / General dice is one where the sum of any two adjacent visible faces equals 7.'}
            </p>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-emerald-300">
                {language === 'hi' ? 'नियम और पहचान:' : 'Key Rules & Identification:'}
              </div>
              <ul className="space-y-1.5 text-slate-300 leading-relaxed">
                <li>• यदि दिखने वाली सतहों में (4, 3) या (5, 2) या (6, 1) दिख जाए, तो वह साधारण पासा है।</li>
                <li>• इसमें विपरीत सतह निश्चित नहीं होती, जब तक अन्य स्थितियां न दी गई हों।</li>
                <li>• इसमें 1-Common Face या 2-Common Face नियम लगाकर विपरीत सतह ज्ञात की जाती है।</li>
                <li>• 4 पासों वाले प्रश्नों में एलिमिनेशन तकनीक (Adjacent Elimination) लगाई जाती है।</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

