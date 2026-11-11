import React, { useEffect, useState } from 'react';
import { ActiveTab, ShapeParams, ShapeType } from '../types';
import { calculateShapeMetrics } from '../utils/mathFormulas';
import { ThreeCanvas } from './ThreeCanvas';
import { ExportActionMenu } from './ExportActionMenu';
import {
  Box,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Expand,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  Split,
  Tv,
  Wand2,
  X,
} from 'lucide-react';

interface ShapeVisualizerTabProps {
  language: 'hi' | 'en';
  projectorMode?: boolean;
  focusMode?: boolean;
  onToggleFocus?: () => void;
  diagramOnlyMode?: boolean;
  onToggleDiagramOnly?: () => void;
  onCancelDiagramOnly?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  selectedShapeType?: ShapeType;
  onSelectShapeType?: (shape: ShapeType) => void;
  onOpenQASolver?: (shapeId?: string) => void;
}

export const ShapeVisualizerTab: React.FC<ShapeVisualizerTabProps> = ({
  language,
  projectorMode = false,
  focusMode = false,
  onToggleFocus,
  diagramOnlyMode = false,
  onToggleDiagramOnly,
  onCancelDiagramOnly,
  onSelectTab,
  selectedShapeType,
  onSelectShapeType,
  onOpenQASolver,
}) => {
  const [params, setParams] = useState<ShapeParams>({
    type: selectedShapeType || 'cylinder',
    radius: 4,
    radiusOuter: 5,
    radiusTop: 2,
    height: 7,
    length: 5,
    width: 4,
    color: '#3b82f6',
    wireframe: false,
    transparent: false,
    opacity: 0.75,
    showDimensions: true,
    showCrossSection: false,
    explodedParts: 0,
    showLabels: true,
    unrollNet: false,
    unfoldStep: 0,
    unfoldProgress: 0,
  });

  useEffect(() => {
    if (selectedShapeType && selectedShapeType !== params.type) {
      setParams((prev) => ({ ...prev, type: selectedShapeType }));
    }
  }, [selectedShapeType]);

  const [viewLayout, setViewLayout] = useState<'split' | 'widescreen169'>(projectorMode ? 'widescreen169' : 'split');
  const [shapeCategory, setShapeCategory] = useState<'all' | 'curved' | 'prisms' | 'pyramids'>('all');
  const [activeSubView, setActiveSubView] = useState<'dimensions' | 'deconstruct' | 'formulas'>('dimensions');

  useEffect(() => {
    if (projectorMode) {
      setViewLayout('widescreen169');
    }
  }, [projectorMode]);
  const [isAutoExploding, setIsAutoExploding] = useState(false);
  const [isAutoUnfolding, setIsAutoUnfolding] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [isCompactSettingsOpen, setIsCompactSettingsOpen] = useState(false);

  const metrics = calculateShapeMetrics(params);

  // Helper for shape unfold steps
  const getShapeUnfoldSteps = (type: ShapeType, lang: 'hi' | 'en') => {
    switch (type) {
      case 'cube':
      case 'cuboid':
        return [
          { step: 0, label: lang === 'hi' ? '3D ठोस (Solid Box)' : 'Solid Box', desc: lang === 'hi' ? 'सभी 6 फलक जुड़े हुए 3D रूप में' : 'All 6 faces closed in 3D' },
          { step: 1, label: lang === 'hi' ? 'चरण 1: ऊपरी फलक (Top Face)' : 'Step 1: Top Face', desc: lang === 'hi' ? 'ऊपरी फलक 90° ऊपर 2D में खुला' : 'Top face unfolds upward' },
          { step: 2, label: lang === 'hi' ? 'चरण 2: निचला फलक (Bottom Face)' : 'Step 2: Bottom Face', desc: lang === 'hi' ? 'निचला फलक 90° नीचे 2D में खुला' : 'Bottom face unfolds downward' },
          { step: 3, label: lang === 'hi' ? 'चरण 3: बायां फलक (Left Face)' : 'Step 3: Left Face', desc: lang === 'hi' ? 'बायां फलक 90° बाईं ओर खुला' : 'Left face unfolds to the left' },
          { step: 4, label: lang === 'hi' ? 'चरण 4: दायां फलक (Right Face)' : 'Step 4: Right Face', desc: lang === 'hi' ? 'दायां फलक 90° दाईं ओर खुला' : 'Right face unfolds to the right' },
          { step: 5, label: lang === 'hi' ? 'चरण 5: पूर्ण 2D क्रॉस नेट (Full Net)' : 'Step 5: Full 2D Net', desc: lang === 'hi' ? 'पीछे का फलक खुला (कुल क्षेत्रफल = 2(lb+bh+hl))' : 'Back face opens, full 2D cross net formed' },
        ];
      case 'cylinder':
        return [
          { step: 0, label: lang === 'hi' ? '3D बंद बेलन (Solid Cylinder)' : 'Solid Cylinder', desc: lang === 'hi' ? 'पूर्ण 3D बेलन (ठोस)' : 'Complete 3D cylinder' },
          { step: 1, label: lang === 'hi' ? 'चरण 1: ऊपरी वृत्त सिरा (Top: πr²)' : 'Step 1: Top Circle (πr²)', desc: lang === 'hi' ? 'ऊपरी वृत्ताकार ढक्कन अलग होकर 2D में आ गया' : 'Top lid detaches into 2D' },
          { step: 2, label: lang === 'hi' ? 'चरण 2: निचला आधार वृत्त (Base: πr²)' : 'Step 2: Base Circle (πr²)', desc: lang === 'hi' ? 'निचला आधार वृत्त अलग होकर 2D में आ गया' : 'Bottom base detaches into 2D' },
          { step: 3, label: lang === 'hi' ? 'चरण 3: वक्र पृष्ठ खुला (Unrolling)' : 'Step 3: Unrolling Mantle', desc: lang === 'hi' ? 'वक्र पृष्ठ सीम से खुलना शुरू हुआ' : 'Curved mantle begins unrolling' },
          { step: 4, label: lang === 'hi' ? 'चरण 4: पूर्ण 2D आयत नेट (2πr × h)' : 'Step 4: Full 2D Sheet Net', desc: lang === 'hi' ? 'पूर्ण समतल 2D नेट (आयताकार शीट 2πr×h + 2 वृत्त πr²)' : 'Full 2D Net: 2πr × h rectangle + 2 circles' },
        ];
      case 'cone':
        return [
          { step: 0, label: lang === 'hi' ? '3D बंद शंकु (Solid Cone)' : 'Solid Cone', desc: lang === 'hi' ? 'पूर्ण 3D शंकु' : 'Complete 3D cone' },
          { step: 1, label: lang === 'hi' ? 'चरण 1: आधार वृत्त (Base: πr²)' : 'Step 1: Base Circle (πr²)', desc: lang === 'hi' ? 'आधार वृत्त समतल 2D में खुला' : 'Base circle unfolds flat' },
          { step: 2, label: lang === 'hi' ? 'चरण 2: वक्र पृष्ठ खुला (Sector: πrl)' : 'Step 2: Unrolling Sector (πrl)', desc: lang === 'hi' ? 'शंकु का वक्र पृष्ठ तिर्यक रेखा पर कटकर त्रिज्यखंड बना' : 'Slant mantle opens into circular sector' },
          { step: 3, label: lang === 'hi' ? 'चरण 3: पूर्ण 2D नेट (Sector + Base)' : 'Step 3: Full 2D Net', desc: lang === 'hi' ? 'कुल पृष्ठीय क्षेत्रफल = πrl + πr²' : 'Total 2D Surface Net = πrl + πr²' },
        ];
      case 'pyramid':
        return [
          { step: 0, label: lang === 'hi' ? '3D बंद पिरामिड (Solid Pyramid)' : 'Solid Pyramid', desc: lang === 'hi' ? 'पूर्ण 3D पिरामिड' : 'Complete 3D pyramid' },
          { step: 1, label: lang === 'hi' ? 'चरण 1: सामने का त्रिभुज खुला' : 'Step 1: Front Triangle', desc: lang === 'hi' ? 'सामने का त्रिभुजाकार फलक नीचे 2D में खुला' : 'Front triangle unfolds down' },
          { step: 2, label: lang === 'hi' ? 'चरण 2: पीछे का त्रिभुज खुला' : 'Step 2: Back Triangle', desc: lang === 'hi' ? 'पीछे का त्रिभुजाकार फलक ऊपर 2D में खुला' : 'Back triangle unfolds up' },
          { step: 3, label: lang === 'hi' ? 'चरण 3: बायां त्रिभुज खुला' : 'Step 3: Left Triangle', desc: lang === 'hi' ? 'बायां त्रिभुजाकार फलक बाईं ओर खुला' : 'Left triangle unfolds left' },
          { step: 4, label: lang === 'hi' ? 'चरण 4: दायां त्रिभुज खुला' : 'Step 4: Right Triangle', desc: lang === 'hi' ? 'दायां त्रिभुजाकार फलक दाईं ओर खुला' : 'Right triangle unfolds right' },
          { step: 5, label: lang === 'hi' ? 'चरण 5: पूर्ण 2D स्टार नेट (Star Net)' : 'Step 5: Full 2D Star Net', desc: lang === 'hi' ? 'केंद्रीय वर्ग a² + 4 समद्विबाहु त्रिभुज' : 'Central square a² + 4 triangle petals' },
        ];
      case 'prism':
        return [
          { step: 0, label: lang === 'hi' ? '3D बंद प्रिज्म (Solid Prism)' : 'Solid Prism', desc: lang === 'hi' ? 'पूर्ण 3D प्रिज्म' : 'Complete 3D prism' },
          { step: 1, label: lang === 'hi' ? 'चरण 1: ऊपरी त्रिभुज सिरा खुला' : 'Step 1: Top Triangle', desc: lang === 'hi' ? 'ऊपरी त्रिभुजाकार सिरा ऊपर खुला' : 'Top triangular lid unfolds' },
          { step: 2, label: lang === 'hi' ? 'चरण 2: निचला त्रिभुज आधार खुला' : 'Step 2: Bottom Triangle', desc: lang === 'hi' ? 'निचला त्रिभुजाकार आधार नीचे खुला' : 'Bottom triangle unfolds' },
          { step: 3, label: lang === 'hi' ? 'चरण 3: बायां आयताकार फलक खुला' : 'Step 3: Left Rectangle', desc: lang === 'hi' ? 'बायां आयत 90° बाईं ओर खुला' : 'Left rectangle unfolds' },
          { step: 4, label: lang === 'hi' ? 'चरण 4: दायां आयताकार फलक खुला' : 'Step 4: Right Rectangle', desc: lang === 'hi' ? 'दायां आयत 90° दाईं ओर खुला' : 'Right rectangle unfolds' },
          { step: 5, label: lang === 'hi' ? 'चरण 5: पूर्ण 2D प्रिज्म नेट (Full Net)' : 'Step 5: Full 2D Net', desc: lang === 'hi' ? '3 संलग्न आयत + 2 त्रिभुज' : '3 adjacent rectangles + 2 triangular caps' },
        ];
      case 'frustum':
        return [
          { step: 0, label: lang === 'hi' ? '3D बंद छिन्नक (Solid Frustum)' : 'Solid Frustum', desc: lang === 'hi' ? 'पूर्ण 3D बाल्टी/छिन्नक' : 'Complete 3D frustum' },
          { step: 1, label: lang === 'hi' ? 'चरण 1: ऊपरी वृत्त सिरा (πr₂²)' : 'Step 1: Top Circle (πr₂²)', desc: lang === 'hi' ? 'ऊपरी छोटा वृत्ताकार सिरा खुला' : 'Top circle unfolds' },
          { step: 2, label: lang === 'hi' ? 'चरण 2: निचला आधार वृत्त (πr₁²)' : 'Step 2: Base Circle (πr₁²)', desc: lang === 'hi' ? 'निचला बड़ा वृत्ताकार सिरा खुला' : 'Bottom circle unfolds' },
          { step: 3, label: lang === 'hi' ? 'चरण 3: तिर्यक वक्र पृष्ठ खुला' : 'Step 3: Lateral Band Unrolls', desc: lang === 'hi' ? 'वक्र पृष्ठ वलयाकार त्रिज्यखंड के रूप में खुला' : 'Slanted mantle opens into annular sector' },
          { step: 4, label: lang === 'hi' ? 'चरण 4: पूर्ण 2D नेट (Full Net)' : 'Step 4: Full 2D Net', desc: lang === 'hi' ? 'कुल क्षेत्रफल = π(r₁+r₂)l + πr₁² + πr₂²' : 'Total Area = π(r₁+r₂)l + πr₁² + πr₂²' },
        ];
      case 'wheel':
        return [
          { step: 0, label: lang === 'hi' ? '3D ठोस पहिया (Solid 3D Wheel)' : 'Solid 3D Wheel', desc: lang === 'hi' ? 'पूर्ण 3D पहिया (टायर, रिम, स्पोक्स, एक्सल)' : 'Complete 3D wheel with rim & spokes' },
          { step: 1, label: lang === 'hi' ? 'चरण 1: 3D घटक अलग (3D Exploded View)' : 'Step 1: Exploded 3D Parts', desc: lang === 'hi' ? 'टायर रबर, स्टील रिम व केंद्रीय हब 3D में अलग' : 'Tire, steel rim and central hub separate in 3D' },
          { step: 2, label: lang === 'hi' ? 'चरण 2: परिधि अनरोलिंग (Circumference 2πr)' : 'Step 2: Unrolling Circumference', desc: lang === 'hi' ? 'पहिए की परिधि सड़क पर 2πr सीधी रेखा में खुलना शुरू' : 'Circumference rolls out along the ground track' },
          { step: 3, label: lang === 'hi' ? 'चरण 3: 1 चक्कर दूरी = 2πr (Full Revolution)' : 'Step 3: 1 Rev = 2πr Distance', desc: lang === 'hi' ? '1 चक्कर में तय दूरी = 2πr (रोलर संपर्क क्षेत्रफल = 2πr × w)' : 'Distance in 1 revolution = 2πr (contact area = 2πr × w)' },
        ];
      default:
        return [
          { step: 0, label: lang === 'hi' ? '3D ठोस (Solid)' : 'Solid', desc: lang === 'hi' ? 'पूर्ण 3D आकृति' : 'Solid 3D shape' },
          { step: 1, label: lang === 'hi' ? 'घटक विखंडन (Exploded)' : 'Exploded Parts', desc: lang === 'hi' ? '3D घटक अलग-अलग' : 'Separated 3D components' },
          { step: 2, label: lang === 'hi' ? '2D समतल रूपांतरण (2D Net)' : '2D Transformation', desc: lang === 'hi' ? 'क्षेत्रफल व आयतन संबंध' : 'Surface area breakdown' },
        ];
    }
  };

  const unfoldSteps = getShapeUnfoldSteps(params.type, language);
  const currentUnfoldStep = params.unfoldStep ?? 0;

  // Auto-unfold animation step loop
  useEffect(() => {
    if (!isAutoUnfolding) return;
    const maxS = unfoldSteps.length - 1;
    const timer = setInterval(() => {
      setParams((prev) => {
        const curStep = prev.unfoldStep ?? 0;
        const nextStep = curStep >= maxS ? 0 : curStep + 1;
        return {
          ...prev,
          unfoldStep: nextStep,
          unfoldProgress: nextStep / maxS,
        };
      });
    }, 1600);
    return () => clearInterval(timer);
  }, [isAutoUnfolding, unfoldSteps.length]);

  // Auto-deconstruct oscillation loop
  useEffect(() => {
    if (!isAutoExploding) return;
    let dir = 1;
    const timer = setInterval(() => {
      setParams((prev) => {
        let next = (prev.explodedParts || 0) + 0.025 * dir;
        if (next >= 0.85) {
          next = 0.85;
          dir = -1;
        } else if (next <= 0.02) {
          next = 0;
          dir = 1;
        }
        return { ...prev, explodedParts: Number(next.toFixed(3)) };
      });
    }, 45);
    return () => clearInterval(timer);
  }, [isAutoExploding]);

  const shapeList: { type: ShapeType; nameHi: string; nameEn: string; icon: string; defaultParams: Partial<ShapeParams> }[] = [
    {
      type: 'cylinder',
      nameHi: 'बेलन (Cylinder)',
      nameEn: 'Cylinder',
      icon: '🛢️',
      defaultParams: { radius: 4, height: 7, color: '#3b82f6' },
    },
    {
      type: 'hollow_cylinder',
      nameHi: 'खोखला बेलन (Hollow)',
      nameEn: 'Hollow Cylinder',
      icon: '🔘',
      defaultParams: { radius: 3, radiusOuter: 5, height: 8, color: '#06b6d4' },
    },
    {
      type: 'cone',
      nameHi: 'शंकु (Cone)',
      nameEn: 'Cone',
      icon: '🍦',
      defaultParams: { radius: 3, height: 4, color: '#f59e0b' },
    },
    {
      type: 'cube',
      nameHi: 'घन (Cube)',
      nameEn: 'Cube',
      icon: '🧊',
      defaultParams: { length: 5, color: '#10b981' },
    },
    {
      type: 'cuboid',
      nameHi: 'घनाभ (Cuboid)',
      nameEn: 'Cuboid',
      icon: '📦',
      defaultParams: { length: 6, width: 4, height: 3, color: '#8b5cf6' },
    },
    {
      type: 'sphere',
      nameHi: 'गोला (Sphere)',
      nameEn: 'Sphere',
      icon: '🔮',
      defaultParams: { radius: 4.5, color: '#ec4899' },
    },
    {
      type: 'hemisphere',
      nameHi: 'अर्धगोला (Hemisphere)',
      nameEn: 'Hemisphere',
      icon: '🥣',
      defaultParams: { radius: 4.5, color: '#14b8a6' },
    },
    {
      type: 'frustum',
      nameHi: 'छिन्नक (Frustum)',
      nameEn: 'Frustum',
      icon: '🪣',
      defaultParams: { radius: 4.5, radiusTop: 2, height: 6, color: '#f97316' },
    },
    {
      type: 'prism',
      nameHi: 'प्रिज्म (Prism)',
      nameEn: 'Triangular Prism',
      icon: '📐',
      defaultParams: { length: 5, height: 7, color: '#a855f7' },
    },
    {
      type: 'wheel',
      nameHi: 'पहिया (Wheel / Roller)',
      nameEn: 'Wheel',
      icon: '⚙️',
      defaultParams: { radius: 4, width: 1.5, height: 1.5, color: '#475569' },
    },
    {
      type: 'pyramid',
      nameHi: 'पिरामिड (Pyramid)',
      nameEn: 'Square Pyramid',
      icon: '⛺',
      defaultParams: { length: 5, height: 6, color: '#eab308' },
    },
  ];

  const handleSelectShape = (shape: (typeof shapeList)[0]) => {
    setParams((prev) => ({
      ...prev,
      type: shape.type,
      ...shape.defaultParams,
    }));
    onSelectShapeType?.(shape.type);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormula(id);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  const r = params.radius;
  const h = params.height;
  const topBaseArea = Math.PI * r * r;
  const botBaseArea = Math.PI * r * r;
  const csaArea = 2 * Math.PI * r * h;
  const tsaArea = csaArea + topBaseArea + botBaseArea;

  const currentShapeObj = shapeList.find((s) => s.type === params.type) || shapeList[0];

  const getShapePlainText = () => {
    const sName = language === 'hi' ? currentShapeObj.nameHi : currentShapeObj.nameEn;
    const formulas = language === 'hi' ? metrics.formulasHi : metrics.formulasEn;
    return [
      `=== 3D Geometry: ${sName} ===`,
      `[Dimensions / विमाएं]:`,
      params.radius ? `  • Radius (r): ${params.radius} cm` : '',
      params.height ? `  • Height (h): ${params.height} cm` : '',
      params.length ? `  • Length (l): ${params.length} cm` : '',
      params.width ? `  • Width (w): ${params.width} cm` : '',
      params.slantHeight ? `  • Slant Height (l): ${params.slantHeight.toFixed(2)} cm` : '',
      `\n[Calculated Metrics / गणना किए गए मान]:`,
      `  • Volume (आयतन V): ${metrics.volume.toFixed(2)} cm³`,
      `  • Curved Surface Area (वक्र पृष्ठ CSA): ${metrics.curvedSurfaceArea.toFixed(2)} cm²`,
      `  • Total Surface Area (कुल पृष्ठ TSA): ${metrics.totalSurfaceArea.toFixed(2)} cm²`,
      `\n[Formulas / सूत्र]:`,
      ...Object.entries(formulas).map(([k, v]) => `  • ${k}: ${v}`),
    ].filter(Boolean).join('\n');
  };

  const getShapeHTMLBody = () => {
    const sName = language === 'hi' ? currentShapeObj.nameHi : currentShapeObj.nameEn;
    const formulas = language === 'hi' ? metrics.formulasHi : metrics.formulasEn;
    const formulaPills = Object.entries(formulas)
      .map(([k, v]) => `<div class="formula-pill"><strong>${k}:</strong> ${v}</div>`)
      .join('');

    return `
      <div class="page-title">${sName} - 3D Mathematical Analysis</div>
      
      <div class="section-title">1. ${language === 'hi' ? 'दिए गए माप (Dimensions)' : 'Input Dimensions'}</div>
      <div class="grid-data">
        ${params.radius ? `<div class="data-card"><div class="data-label">त्रिज्या (Radius r)</div><div class="data-value">${params.radius} cm</div></div>` : ''}
        ${params.height ? `<div class="data-card"><div class="data-label">ऊंचाई (Height h)</div><div class="data-value">${params.height} cm</div></div>` : ''}
        ${params.length ? `<div class="data-card"><div class="data-label">लंबाई (Length l)</div><div class="data-value">${params.length} cm</div></div>` : ''}
        ${params.width ? `<div class="data-card"><div class="data-label">चौड़ाई (Width w/b)</div><div class="data-value">${params.width} cm</div></div>` : ''}
      </div>
      
      <div class="section-title">2. ${language === 'hi' ? 'मानक सूत्र (Standard Formulas)' : 'Standard Formulas'}</div>
      <div class="formula-box">
        ${formulaPills}
      </div>
      
      <div class="section-title">3. ${language === 'hi' ? 'गणना परिणाम (Calculated Results)' : 'Calculated Results'}</div>
      <div class="grid-data">
        <div class="data-card" style="background:#ecfdf5; border-color:#a7f3d0;">
          <div class="data-label" style="color:#059669;">आयतन (Volume V)</div>
          <div class="data-value" style="color:#064e3b;">${metrics.volume.toFixed(2)} cm³</div>
        </div>
        <div class="data-card" style="background:#eff6ff; border-color:#bfdbfe;">
          <div class="data-label" style="color:#2563eb;">वक्र पृष्ठ (Curved Surface CSA)</div>
          <div class="data-value" style="color:#1e3a8a;">${metrics.curvedSurfaceArea.toFixed(2)} cm²</div>
        </div>
        <div class="data-card" style="background:#faf5ff; border-color:#e9d5ff;">
          <div class="data-label" style="color:#9333ea;">कुल पृष्ठ (Total Surface TSA)</div>
          <div class="data-value" style="color:#581c87;">${metrics.totalSurfaceArea.toFixed(2)} cm²</div>
        </div>
      </div>
    `;
  };

  // =========================================================================
  // ONLY DIAGRAM MODE (ZEN DIAGRAM VIEW)
  // Everything else is hidden, only the 3D solid diagram is shown with a single cancel button
  // =========================================================================
  if (diagramOnlyMode) {
    const currentShape = shapeList.find((s) => s.type === params.type);
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col justify-center items-center overflow-hidden select-none">
        {/* Full Viewport 3D Canvas */}
        <div className="w-full h-full">
          <ThreeCanvas
            mode="shape"
            shapeParams={params}
            language={language}
          />
        </div>

        {/* 1. Only Button to Cancel / Exit Diagram Mode */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            id="btn-cancel-diagram-mode-shape"
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
          <span className="truncate">{currentShape?.nameHi || params.type} (3D Diagram)</span>
        </div>

        {/* Minimal Floating Explode Slider at Bottom Center if deconstructible */}
        {(params.type === 'cylinder' || params.type === 'wheel' || params.type === 'cone' || params.type === 'frustum' || params.type === 'cube' || params.type === 'cuboid' || params.type === 'pyramid' || params.type === 'prism' || params.type === 'hollow_cylinder' || params.type === 'hemisphere' || params.type === 'sphere') && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-3 text-xs text-white shadow-2xl">
            <span className="text-slate-300 font-semibold">{language === 'hi' ? 'घटक पृथक्करण:' : 'Deconstruct:'}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={params.explodedParts || 0}
              onChange={(e) => setParams({ ...params, explodedParts: parseFloat(e.target.value) })}
              className="w-28 sm:w-36 accent-indigo-500 h-1.5 cursor-pointer"
            />
            <span className="font-mono text-indigo-400 font-bold">{Math.round((params.explodedParts || 0) * 100)}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Shape Title, Style Popover, View Mode Switcher */}
      <div className="relative z-30 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 sm:p-3 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-lg shrink-0">
            {currentShapeObj.icon || '📐'}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
              <span>{language === 'hi' ? currentShapeObj.nameHi : currentShapeObj.nameEn}</span>
              <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Offline
              </span>
            </h2>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Style Toggle */}
          <button
            onClick={() => setIsCompactSettingsOpen(!isCompactSettingsOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isCompactSettingsOpen
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/60'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <span>🎨</span>
            <span>{language === 'hi' ? 'रंग व स्टाइल' : 'Style'}</span>
          </button>

          {/* Export & Download Menu */}
          <ExportActionMenu
            title={`3D Geometry: ${language === 'hi' ? currentShapeObj.nameHi : currentShapeObj.nameEn}`}
            filename={`3d_shape_${params.type}_${Date.now()}`}
            getHTMLContent={getShapeHTMLBody}
            getPlainText={getShapePlainText}
            language={language}
          />

          {/* Only Diagram Button */}
          <button
            id="btn-trigger-only-diagram-shapes"
            onClick={onToggleDiagramOnly}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white transition-all shadow-sm cursor-pointer"
            title={language === 'hi' ? 'केवल डायग्राम मोड (बाकी सब छिपाएं)' : 'Only Diagram Mode'}
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'hi' ? 'केवल डायग्राम' : 'Only Diagram'}</span>
          </button>

          {/* Split / 16:9 Screen Layout Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              id="btn-mode-split"
              onClick={() => setViewLayout('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewLayout === 'split'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'विभाजित' : 'Split'}</span>
            </button>

            <button
              id="btn-mode-169"
              onClick={() => setViewLayout('widescreen169')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewLayout === 'widescreen169'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-cyan-300" />
              <span>{language === 'hi' ? '16:9 स्क्रीन' : '16:9 View'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Settings Popover / Expandable Bar */}
      {isCompactSettingsOpen && (
        <div className="p-3 bg-slate-950/90 rounded-xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <label className="text-slate-400 font-medium">{language === 'hi' ? 'रंग (Color):' : 'Color:'}</label>
            <input
              type="color"
              value={params.color}
              onChange={(e) => setParams({ ...params, color: e.target.value })}
              className="w-7 h-7 rounded-md cursor-pointer border border-slate-700 bg-transparent"
            />
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={params.showLabels !== false}
                onChange={(e) => setParams({ ...params, showLabels: e.target.checked })}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              {language === 'hi' ? '3D लेबल (Labels)' : '3D Labels'}
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={params.wireframe}
                onChange={(e) => setParams({ ...params, wireframe: e.target.checked })}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              {language === 'hi' ? 'जालीदार (Wireframe)' : 'Wireframe'}
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={params.transparent}
                onChange={(e) => setParams({ ...params, transparent: e.target.checked })}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              {language === 'hi' ? 'पारदर्शी (Transparent)' : 'Transparent'}
            </label>
          </div>
        </div>
      )}

      {/* 16:9 WIDESCREEN CINEMATIC MODE */}
      {viewLayout === 'widescreen169' ? (
        <div className="space-y-4">
          {/* Main 16:9 Aspect Ratio 3D Canvas Box */}
          <div className="relative w-full aspect-[16/9] min-h-[460px] max-h-[76vh] bg-slate-950 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
            <ThreeCanvas mode="shape" shapeParams={params} language={language} />

            {/* Floating Top-Right Mini Stats in 16:9 Mode */}
            <div className="absolute top-3 right-3 hidden sm:flex items-center gap-2 pointer-events-auto bg-slate-900/85 backdrop-blur-md p-1.5 px-3 rounded-2xl border border-slate-700/80 text-xs shadow-xl">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">{language === 'hi' ? 'आयतन (Vol)' : 'Vol'}</span>
                <span className="text-white font-mono font-bold">{metrics.volume.toFixed(1)} cm³</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-700 mx-1" />
              <div className="flex flex-col">
                <span className="text-[10px] text-emerald-400 font-medium">{language === 'hi' ? 'वक्र पृष्ठ (CSA)' : 'CSA'}</span>
                <span className="text-emerald-300 font-mono font-bold">{metrics.curvedSurfaceArea.toFixed(1)} cm²</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-700 mx-1" />
              <div className="flex flex-col">
                <span className="text-[10px] text-amber-400 font-medium">{language === 'hi' ? 'कुल पृष्ठ (TSA)' : 'TSA'}</span>
                <span className="text-amber-300 font-mono font-bold">{metrics.totalSurfaceArea.toFixed(1)} cm²</span>
              </div>
            </div>

            {/* Floating Bottom-Center Quick Deconstruct Bar */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto max-w-3xl bg-slate-900/90 backdrop-blur-md p-2.5 sm:px-4 rounded-2xl border border-indigo-500/40 shadow-2xl flex flex-wrap items-center justify-between sm:justify-center gap-3 text-xs pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  ⚡ {language === 'hi' ? 'पार्ट्स अलग करें:' : 'Separate Parts:'}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={params.explodedParts || 0}
                  onChange={(e) => {
                    setIsAutoExploding(false);
                    setParams({ ...params, explodedParts: parseFloat(e.target.value) });
                  }}
                  className="w-24 sm:w-36 accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-amber-300 font-bold w-10 text-right">
                  {Math.round((params.explodedParts || 0) * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsAutoExploding(false);
                    setParams({ ...params, explodedParts: (params.explodedParts || 0) > 0.4 ? 0 : 0.85 });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium"
                >
                  {(params.explodedParts || 0) > 0.4
                    ? language === 'hi'
                      ? '🔄 जोड़ें'
                      : 'Assemble'
                    : language === 'hi'
                    ? '💥 अलग करें'
                    : 'Explode'}
                </button>

                <button
                  onClick={() => setIsAutoExploding(!isAutoExploding)}
                  className={`px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1 ${
                    isAutoExploding
                      ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  {isAutoExploding ? (language === 'hi' ? 'रोकें' : 'Pause') : (language === 'hi' ? 'ऑटो लूप' : 'Auto Loop')}
                </button>

                {params.type === 'cylinder' && (
                  <button
                    onClick={() => setParams({ ...params, unrollNet: !params.unrollNet })}
                    className={`px-2.5 py-1 rounded-lg font-medium border transition-all ${
                      params.unrollNet
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {params.unrollNet
                      ? language === 'hi'
                        ? 'खोखला बेलन'
                        : 'Tube View'
                      : language === 'hi'
                      ? 'खुला आयत (2πr×h)'
                      : 'Unroll 2D Sheet'}
                  </button>
                )}

                <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white ml-1">
                  <input
                    type="checkbox"
                    checked={params.showLabels !== false}
                    onChange={(e) => setParams({ ...params, showLabels: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-600"
                  />
                  <span>{language === 'hi' ? '3D लेबल' : '3D Labels'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Compact 16:9 Quick Setting Panel (Collapsible / Sleek) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                {language === 'hi' ? 'त्वरित माप व नियंत्रण (Compact Controls)' : 'Quick Dimension Controls'}
              </h4>
              <button
                onClick={() => setIsCompactSettingsOpen(!isCompactSettingsOpen)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                {isCompactSettingsOpen ? (language === 'hi' ? 'छोटा करें' : 'Collapse') : (language === 'hi' ? 'विस्तार करें' : 'Expand All')}
                {isCompactSettingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Compact Dimension Sliders in 16:9 mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              {/* Radius */}
              {(params.type === 'cylinder' ||
                params.type === 'hollow_cylinder' ||
                params.type === 'wheel' ||
                params.type === 'cone' ||
                params.type === 'sphere' ||
                params.type === 'hemisphere' ||
                params.type === 'frustum') && (
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{language === 'hi' ? 'त्रिज्या (r):' : 'Radius (r):'}</span>
                    <span className="text-indigo-400 font-mono font-bold">{params.radius} cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={params.radius}
                      onChange={(e) => setParams({ ...params, radius: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={params.radius}
                      onChange={(e) => setParams({ ...params, radius: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                      className="w-14 px-1.5 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {/* Outer Radius */}
              {params.type === 'hollow_cylinder' && (
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{language === 'hi' ? 'बाहरी त्रिज्या (R):' : 'Outer R:'}</span>
                    <span className="text-cyan-400 font-mono font-bold">{params.radiusOuter || 5} cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="0.5"
                      value={params.radiusOuter || 5}
                      onChange={(e) => setParams({ ...params, radiusOuter: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={params.radiusOuter || 5}
                      onChange={(e) =>
                        setParams({ ...params, radiusOuter: Math.max(0.1, parseFloat(e.target.value) || 1) })
                      }
                      className="w-14 px-1.5 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {/* Height */}
              {(params.type === 'cylinder' ||
                params.type === 'hollow_cylinder' ||
                params.type === 'cone' ||
                params.type === 'cuboid' ||
                params.type === 'frustum' ||
                params.type === 'prism' ||
                params.type === 'pyramid') && (
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{language === 'hi' ? 'ऊंचाई (h):' : 'Height (h):'}</span>
                    <span className="text-indigo-400 font-mono font-bold">{params.height} cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="0.5"
                      value={params.height}
                      onChange={(e) => setParams({ ...params, height: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={params.height}
                      onChange={(e) => setParams({ ...params, height: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                      className="w-14 px-1.5 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {/* Length */}
              {(params.type === 'cube' ||
                params.type === 'cuboid' ||
                params.type === 'prism' ||
                params.type === 'pyramid') && (
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">
                      {params.type === 'cube' ? (language === 'hi' ? 'भुजा (a):' : 'Side (a):') : (language === 'hi' ? 'लंबाई (l):' : 'Length (l):')}
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">{params.length} cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="0.5"
                      value={params.length}
                      onChange={(e) => setParams({ ...params, length: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={params.length}
                      onChange={(e) => setParams({ ...params, length: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                      className="w-14 px-1.5 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {/* Width for Cuboid & Wheel */}
              {(params.type === 'cuboid' || params.type === 'wheel') && (
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">
                      {params.type === 'wheel' ? (language === 'hi' ? 'पहिया चौड़ाई (w):' : 'Width (w):') : (language === 'hi' ? 'चौड़ाई (b):' : 'Breadth (b):')}
                    </span>
                    <span className="text-purple-400 font-mono font-bold">{params.width} cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={params.width}
                      onChange={(e) => setParams({ ...params, width: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={params.width}
                      onChange={(e) => setParams({ ...params, width: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                      className="w-14 px-1.5 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD VIEW WITH CLEAN TABBED SUBVIEWS (Dimensions | Deconstruct & 2D Net | Formulas & Steps) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (6 cols): 3D Interactive Canvas & Quick Info */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            <div className="h-[430px] sm:h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-950">
              <ThreeCanvas mode="shape" shapeParams={params} language={language} />

              {/* Floating Shape Title Badge */}
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-bold text-white flex items-center gap-2 shadow-lg pointer-events-none">
                <span>{currentShapeObj.icon}</span>
                <span>{language === 'hi' ? currentShapeObj.nameHi : currentShapeObj.nameEn}</span>
              </div>
            </div>

            {/* Quick Metrics Bar directly beneath 3D Canvas */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
              <div className="bg-slate-950/80 p-2 rounded-lg border border-indigo-900/30 text-center">
                <div className="text-[10px] text-indigo-300 font-medium">{language === 'hi' ? 'आयतन (Vol)' : 'Volume'}</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-white mt-0.5 truncate">
                  {metrics.volume.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">cm³</span>
                </div>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-lg border border-emerald-900/30 text-center">
                <div className="text-[10px] text-emerald-300 font-medium">{language === 'hi' ? 'वक्र पृष्ठ (CSA)' : 'CSA'}</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-white mt-0.5 truncate">
                  {metrics.curvedSurfaceArea.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">cm²</span>
                </div>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-lg border border-amber-900/30 text-center">
                <div className="text-[10px] text-amber-300 font-medium">{language === 'hi' ? 'कुल पृष्ठ (TSA)' : 'TSA'}</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-white mt-0.5 truncate">
                  {metrics.totalSurfaceArea.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">cm²</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (6 cols): Tabbed Professional Controls */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            {/* Sub-View Navigation Tabs */}
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
              <button
                onClick={() => setActiveSubView('dimensions')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeSubView === 'dimensions'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? '1. माप व परिमाप' : '1. Dimensions & Stats'}</span>
              </button>

              <button
                onClick={() => setActiveSubView('deconstruct')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeSubView === 'deconstruct'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? '2. डीकंस्ट्रक्ट व 2D नेट' : '2. Deconstruct & Net'}</span>
              </button>

              <button
                onClick={() => setActiveSubView('formulas')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeSubView === 'formulas'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? '3. सूत्र व स्टेप्स' : '3. Formulas & Steps'}</span>
              </button>
            </div>

            {/* TAB 1: DIMENSIONS & STATS */}
            {activeSubView === 'dimensions' && (
              <div className="space-y-3">
                {/* Dimension Sliders & Number Inputs */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      {language === 'hi' ? 'माप दर्ज करें (Input Dimensions)' : 'Set Dimensions'}
                    </span>
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono">
                      {params.type.toUpperCase()}
                    </span>
                  </h4>

                  <div className="space-y-3.5">
                    {/* Radius Slider (Cylinder, Cone, Sphere, Hemisphere, Wheel, Frustum) */}
                    {(params.type === 'cylinder' ||
                      params.type === 'cone' ||
                      params.type === 'sphere' ||
                      params.type === 'hemisphere' ||
                      params.type === 'wheel' ||
                      params.type === 'frustum') && (
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-slate-300">
                            {params.type === 'frustum'
                              ? language === 'hi'
                                ? 'निचली त्रिज्या (Bottom Radius r₁)'
                                : 'Bottom Radius (r₁)'
                              : language === 'hi'
                              ? 'त्रिज्या (Radius r)'
                              : 'Radius (r)'}
                          </span>
                          <span className="text-indigo-300 font-mono font-bold">{params.radius} cm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={params.radius}
                            onChange={(e) => setParams({ ...params, radius: parseFloat(e.target.value) })}
                            className="flex-1 accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={params.radius}
                            onChange={(e) => setParams({ ...params, radius: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                            className="w-16 px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Top Radius for Frustum */}
                    {params.type === 'frustum' && (
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-slate-300">
                            {language === 'hi' ? 'ऊपरी त्रिज्या (Top Radius r₂)' : 'Top Radius (r₂)'}
                          </span>
                          <span className="text-indigo-300 font-mono font-bold">{params.radius2 || 1.5} cm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.5"
                            max="8"
                            step="0.5"
                            value={params.radius2 || 1.5}
                            onChange={(e) => setParams({ ...params, radius2: parseFloat(e.target.value) })}
                            className="flex-1 accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={params.radius2 || 1.5}
                            onChange={(e) => setParams({ ...params, radius2: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                            className="w-16 px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Height Slider */}
                    {params.type !== 'sphere' && params.type !== 'hemisphere' && params.type !== 'cube' && (
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-slate-300">
                            {params.type === 'wheel'
                              ? language === 'hi'
                                ? 'चौड़ाई / लंबाई (Width w)'
                                : 'Roller Width (w)'
                              : language === 'hi'
                              ? 'ऊंचाई (Height h)'
                              : 'Height (h)'}
                          </span>
                          <span className="text-indigo-300 font-mono font-bold">{params.height} cm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.5"
                            max="12"
                            step="0.5"
                            value={params.height}
                            onChange={(e) => setParams({ ...params, height: parseFloat(e.target.value) })}
                            className="flex-1 accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={params.height}
                            onChange={(e) => setParams({ ...params, height: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                            className="w-16 px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Length for Cube, Cuboid, Prism, Pyramid */}
                    {(params.type === 'cube' ||
                      params.type === 'cuboid' ||
                      params.type === 'prism' ||
                      params.type === 'pyramid') && (
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-slate-300">
                            {params.type === 'cube' || params.type === 'prism' || params.type === 'pyramid'
                              ? language === 'hi'
                                ? 'भुजा (Side / Base a)'
                                : 'Side / Base (a)'
                              : language === 'hi'
                              ? 'लंबाई (Length l)'
                              : 'Length (l)'}
                          </span>
                          <span className="text-indigo-300 font-mono font-bold">{params.length} cm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={params.length}
                            onChange={(e) => setParams({ ...params, length: parseFloat(e.target.value) })}
                            className="flex-1 accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={params.length}
                            onChange={(e) => setParams({ ...params, length: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                            className="w-16 px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Width for Cuboid */}
                    {params.type === 'cuboid' && (
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-slate-300">{language === 'hi' ? 'चौड़ाई (Width b)' : 'Width (b)'}</span>
                          <span className="text-indigo-300 font-mono font-bold">{params.width} cm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={params.width}
                            onChange={(e) => setParams({ ...params, width: parseFloat(e.target.value) })}
                            className="flex-1 accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={params.width}
                            onChange={(e) => setParams({ ...params, width: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                            className="w-16 px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Calculation Cards Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-900/90 border border-indigo-900/50 rounded-xl p-3">
                    <div className="text-[11px] font-medium text-indigo-300">
                      {language === 'hi' ? 'आयतन (Volume V)' : 'Volume (V)'}
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {metrics.volume.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400">cm³</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {(params.type === 'cylinder' && 'π × r² × h') ||
                        (params.type === 'cone' && '(1/3)π × r² × h') ||
                        (params.type === 'cube' && 'a³') ||
                        (params.type === 'cuboid' && 'l × b × h') ||
                        (params.type === 'sphere' && '(4/3)π × r³') ||
                        (params.type === 'hemisphere' && '(2/3)π × r³') ||
                        '(1/3)πh(r1²+r2²+r1r2)'}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-900/50 rounded-xl p-3">
                    <div className="text-[11px] font-medium text-emerald-300">
                      {language === 'hi' ? 'वक्र पृष्ठ (CSA / LSA)' : 'Curved Area (CSA)'}
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {metrics.curvedSurfaceArea.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400">cm²</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {(params.type === 'cylinder' && '2 × π × r × h') ||
                        (params.type === 'cone' && 'π × r × l') ||
                        (params.type === 'cube' && '4 × a²') ||
                        (params.type === 'cuboid' && '2h(l + b)') ||
                        '4 × π × r²'}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-amber-900/50 rounded-xl p-3">
                    <div className="text-[11px] font-medium text-amber-300">
                      {language === 'hi' ? 'संपूर्ण पृष्ठ (TSA)' : 'Total Area (TSA)'}
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {metrics.totalSurfaceArea.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400">cm²</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {(params.type === 'cylinder' && '2πr(r + h)') ||
                        (params.type === 'cone' && 'πr(l + r)') ||
                        (params.type === 'cube' && '6 × a²') ||
                        (params.type === 'cuboid' && '2(lb + bh + hl)') ||
                        (params.type === 'hemisphere' && '3 × π × r²') ||
                        '4 × π × r²'}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-purple-900/50 rounded-xl p-3">
                    <div className="text-[11px] font-medium text-purple-300">
                      {metrics.slantHeight
                        ? language === 'hi'
                          ? 'तिर्यक ऊंचाई (Slant Height l)'
                          : 'Slant Height (l)'
                        : metrics.spaceDiagonal
                        ? language === 'hi'
                          ? 'विकर्ण (Space Diagonal)'
                          : 'Space Diagonal (d)'
                        : language === 'hi'
                        ? 'व्यास (Diameter)'
                        : 'Diameter (d)'}
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {(metrics.slantHeight || metrics.spaceDiagonal || params.radius * 2).toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400">cm</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {metrics.slantHeight ? '√(r² + h²)' : metrics.spaceDiagonal ? '√(l² + b² + h²)' : '2 × r'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DECONSTRUCT & 2D NET UNFOLDING */}
            {activeSubView === 'deconstruct' && (
              <div className="space-y-3">
                {/* 3D to 2D Step-by-Step Net Unfolding Studio */}
                <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📦➡️📄</span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-indigo-300">
                          {language === 'hi'
                            ? '3D से 2D नेट अनफोल्डिंग लैब'
                            : 'Step-by-Step 3D to 2D Net Unfolding'}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {unfoldSteps[currentUnfoldStep]?.desc || (language === 'hi' ? 'ठोस से समतल 2D नेट' : 'Solid to 2D flat net')}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-800/60">
                      {language === 'hi' ? `चरण ${currentUnfoldStep}/${unfoldSteps.length - 1}` : `Step ${currentUnfoldStep}/${unfoldSteps.length - 1}`}
                    </span>
                  </div>

                  {/* Step Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 my-3">
                    {unfoldSteps.map((s) => (
                      <button
                        key={s.step}
                        onClick={() => {
                          setIsAutoUnfolding(false);
                          setIsAutoExploding(false);
                          setParams({
                            ...params,
                            unfoldStep: s.step,
                            unfoldProgress: s.step / (unfoldSteps.length - 1),
                            explodedParts: 0,
                          });
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all truncate ${
                          currentUnfoldStep === s.step
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={s.label}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Smooth Progress Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{language === 'hi' ? '3D ठोस (0%)' : '3D Solid (0%)'}</span>
                      <span className="text-indigo-300 font-mono font-bold">
                        {Math.round((params.unfoldProgress || (currentUnfoldStep / (unfoldSteps.length - 1))) * 100)}% {language === 'hi' ? 'खुला' : 'Unfolded'}
                      </span>
                      <span>{language === 'hi' ? '2D नेट (100%)' : '2D Net (100%)'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={params.unfoldProgress !== undefined ? params.unfoldProgress : currentUnfoldStep / (unfoldSteps.length - 1)}
                      onChange={(e) => {
                        setIsAutoUnfolding(false);
                        setIsAutoExploding(false);
                        const val = parseFloat(e.target.value);
                        const stepIdx = Math.round(val * (unfoldSteps.length - 1));
                        setParams({
                          ...params,
                          unfoldProgress: val,
                          unfoldStep: stepIdx,
                          explodedParts: 0,
                        });
                      }}
                      className="w-full accent-indigo-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-xs border-t border-slate-800/80 mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setIsAutoUnfolding(false);
                          const prevS = Math.max(0, currentUnfoldStep - 1);
                          setParams({
                            ...params,
                            unfoldStep: prevS,
                            unfoldProgress: prevS / (unfoldSteps.length - 1),
                            explodedParts: 0,
                          });
                        }}
                        disabled={currentUnfoldStep === 0}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 font-medium transition-all"
                      >
                        {language === 'hi' ? '◀ पिछला' : '◀ Prev'}
                      </button>
                      <button
                        onClick={() => {
                          setIsAutoUnfolding(false);
                          const nextS = Math.min(unfoldSteps.length - 1, currentUnfoldStep + 1);
                          setParams({
                            ...params,
                            unfoldStep: nextS,
                            unfoldProgress: nextS / (unfoldSteps.length - 1),
                            explodedParts: 0,
                          });
                        }}
                        disabled={currentUnfoldStep === unfoldSteps.length - 1}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white border border-indigo-400 font-medium transition-all"
                      >
                        {language === 'hi' ? 'अगला ▶' : 'Next ▶'}
                      </button>
                      <button
                        onClick={() => setIsAutoUnfolding(!isAutoUnfolding)}
                        className={`px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1 transition-all ${
                          isAutoUnfolding
                            ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                            : 'bg-slate-800 text-indigo-300 hover:text-white border-slate-700'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        {isAutoUnfolding ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'ऑटो लूप' : 'Loop')}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setIsAutoUnfolding(false);
                        setParams({
                          ...params,
                          unfoldStep: 0,
                          unfoldProgress: 0,
                          explodedParts: 0,
                          unrollNet: false,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-all"
                    >
                      {language === 'hi' ? '🔄 रीसेट' : '🔄 Reset'}
                    </button>
                  </div>
                </div>

                {/* Exploded Parts Controller Card */}
                <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
                      <span>⚡</span>
                      {language === 'hi'
                        ? '3D घटक पृथक्करण (Exploded View)'
                        : 'Component Separation & Exploded View'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                      {Math.round((params.explodedParts || 0) * 100)}% {language === 'hi' ? 'अलग' : 'Separated'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={params.explodedParts || 0}
                      onChange={(e) => {
                        setIsAutoExploding(false);
                        setParams({ ...params, explodedParts: parseFloat(e.target.value) });
                      }}
                      className="w-full accent-amber-400 bg-slate-800 h-2.5 rounded-lg cursor-pointer"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setIsAutoExploding(false);
                            setIsAutoUnfolding(false);
                            setParams({ ...params, explodedParts: 0.85, unfoldStep: 0, unfoldProgress: 0 });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-all"
                        >
                          {language === 'hi' ? '💥 अलग करें' : '💥 Separate'}
                        </button>
                        <button
                          onClick={() => {
                            setIsAutoExploding(false);
                            setParams({ ...params, explodedParts: 0 });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-all"
                        >
                          {language === 'hi' ? '🔄 जोड़ें' : '🔄 Assemble'}
                        </button>
                        <button
                          onClick={() => setIsAutoExploding(!isAutoExploding)}
                          className={`px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1 transition-all ${
                            isAutoExploding
                              ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                              : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {isAutoExploding ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'ऑटो लूप' : 'Loop')}
                        </button>
                      </div>

                      {params.type === 'cylinder' && (
                        <button
                          onClick={() => setParams({ ...params, unrollNet: !params.unrollNet })}
                          className={`px-2.5 py-1 rounded-lg font-medium border transition-all ${
                            params.unrollNet
                              ? 'bg-cyan-600 text-white border-cyan-400'
                              : 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {params.unrollNet
                            ? language === 'hi'
                              ? 'खोखला बेलन (Tube)'
                              : 'Tube View'
                            : language === 'hi'
                            ? 'खुला वक्र पृष्ठ (2πr×h)'
                            : 'Unroll 2D Sheet'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Deconstructed Parts Breakdown for Cylinder/Wheel */}
                {params.type === 'cylinder' && (
                  <div className="bg-slate-900/90 border border-indigo-900/60 rounded-2xl p-3.5 backdrop-blur-md">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <span>🛢️</span>
                      {language === 'hi' ? 'बेलन के घटक (Parts Analysis)' : 'Cylinder Parts Analysis'}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-emerald-500/30">
                        <div className="text-[10px] text-emerald-400 font-bold">{language === 'hi' ? 'शीर्ष ढक्कन (Top)' : 'Top Base'}</div>
                        <div className="font-mono text-emerald-300 text-xs font-bold mt-0.5">πr² = {topBaseArea.toFixed(1)} cm²</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-indigo-500/30">
                        <div className="text-[10px] text-indigo-400 font-bold">{language === 'hi' ? 'वक्र पृष्ठ (CSA)' : 'Curved'}</div>
                        <div className="font-mono text-indigo-300 text-xs font-bold mt-0.5">2πrh = {csaArea.toFixed(1)} cm²</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-cyan-500/30">
                        <div className="text-[10px] text-cyan-400 font-bold">{language === 'hi' ? 'निचला तला (Base)' : 'Bottom'}</div>
                        <div className="font-mono text-cyan-300 text-xs font-bold mt-0.5">πr² = {botBaseArea.toFixed(1)} cm²</div>
                      </div>
                    </div>
                  </div>
                )}

                {params.type === 'wheel' && (
                  <div className="bg-slate-900/90 border border-amber-900/60 rounded-2xl p-3.5 backdrop-blur-md">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <span>⚙️</span>
                      {language === 'hi' ? 'पहिया / रोलर विश्लेषण (Wheel Breakdown)' : 'Wheel & Roller Analysis'}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-amber-500/30">
                        <div className="text-[10px] text-amber-400 font-bold">{language === 'hi' ? '1 चक्कर दूरी (2πr)' : '1 Rev Dist'}</div>
                        <div className="font-mono text-amber-300 text-xs font-bold mt-0.5">{(2 * Math.PI * r).toFixed(1)} cm</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-emerald-500/30">
                        <div className="text-[10px] text-emerald-400 font-bold">{language === 'hi' ? 'दबाया क्षेत्र (2πrw)' : 'Contact Area'}</div>
                        <div className="font-mono text-emerald-300 text-xs font-bold mt-0.5">{(2 * Math.PI * r * (params.width || 1.5)).toFixed(1)} cm²</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-cyan-500/30">
                        <div className="text-[10px] text-cyan-400 font-bold">{language === 'hi' ? '1 किमी में चक्कर' : 'Revs in 1km'}</div>
                        <div className="font-mono text-cyan-300 text-xs font-bold mt-0.5">{(100000 / (2 * Math.PI * r)).toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FORMULAS & STEP-BY-STEP SOLUTION */}
            {activeSubView === 'formulas' && (
              <div className="space-y-3">
                {/* Formulas Reference */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>{language === 'hi' ? 'सूत्र निर्देशिका (Formula Reference)' : 'Formulas Reference'}</span>
                    <span className="text-[10px] text-indigo-400 font-normal">Click to copy</span>
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(language === 'hi' ? metrics.formulasHi : metrics.formulasEn).map(([key, formula]) => (
                      <div
                        key={key}
                        onClick={() => copyText(formula, key)}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/60 cursor-pointer transition-all text-xs"
                      >
                        <span className="text-slate-300 font-medium">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                            {formula}
                          </span>
                          {copiedFormula === key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step-by-Step Derivation */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                  <h4 className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                    {language === 'hi'
                      ? 'स्टेप-बाय-स्टेप गणना (Detailed Steps)'
                      : 'Detailed Step-by-Step Calculation'}
                  </h4>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {(language === 'hi' ? metrics.stepsHi : metrics.stepsEn).map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200"
                      >
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-700/60 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <p className="font-mono pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
