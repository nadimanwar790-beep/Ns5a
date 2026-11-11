import React, { useState } from 'react';
import { ActiveTab, Geometry2DParams, Geometry2DShapeType } from '../types';
import { calculateGeometry2D } from '../utils/mathFormulas2D';
import {
  Square,
  RectangleHorizontal,
  Diamond,
  Compass,
  CircleDot,
  CheckCircle2,
  Sparkles,
  Layers,
  RotateCw,
  Eye,
  EyeOff,
  BookOpen,
  Info,
  Maximize2,
  Minimize2,
  Tv,
  HelpCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface Geometry2DTabProps {
  language: 'hi' | 'en';
  projectorMode?: boolean;
  diagramOnlyMode?: boolean;
  onToggleDiagramOnly?: () => void;
  onCancelDiagramOnly?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  selectedShapeType?: Geometry2DShapeType;
  onSelectShapeType?: (shape: Geometry2DShapeType) => void;
  onOpenQASolver?: (shapeId?: string) => void;
}

const SHAPE_CATEGORIES = [
  {
    categoryHi: 'चतुर्भुज (Quadrilaterals)',
    categoryEn: 'Quadrilaterals',
    shapes: [
      { id: 'square' as Geometry2DShapeType, nameHi: 'वर्ग', nameEn: 'Square', icon: Square },
      { id: 'rectangle' as Geometry2DShapeType, nameHi: 'आयत', nameEn: 'Rectangle', icon: RectangleHorizontal },
      { id: 'rhombus' as Geometry2DShapeType, nameHi: 'समचतुर्भुज', nameEn: 'Rhombus', icon: Diamond },
      { id: 'parallelogram' as Geometry2DShapeType, nameHi: 'समानांतर चतुर्भुज', nameEn: 'Parallelogram', icon: Layers },
      { id: 'trapezium' as Geometry2DShapeType, nameHi: 'समलंब चतुर्भुज', nameEn: 'Trapezium', icon: Compass },
      { id: 'kite' as Geometry2DShapeType, nameHi: 'पतंग', nameEn: 'Kite', icon: Diamond },
      { id: 'cyclic_quadrilateral' as Geometry2DShapeType, nameHi: 'चक्रीय चतुर्भुज', nameEn: 'Cyclic Quad', icon: CircleDot },
    ],
  },
  {
    categoryHi: 'त्रिभुज (Triangles)',
    categoryEn: 'Triangles',
    shapes: [
      { id: 'equilateral_triangle' as Geometry2DShapeType, nameHi: 'समबाहु त्रिभुज', nameEn: 'Equilateral Δ', icon: Layers },
      { id: 'right_triangle' as Geometry2DShapeType, nameHi: 'समकोण त्रिभुज', nameEn: 'Right Δ (90°)', icon: Layers },
      { id: 'isosceles_triangle' as Geometry2DShapeType, nameHi: 'समद्विबाहु त्रिभुज', nameEn: 'Isosceles Δ', icon: Layers },
      { id: 'scalene_triangle' as Geometry2DShapeType, nameHi: 'विषमबाहु त्रिभुज (हीरोन)', nameEn: 'Scalene Δ', icon: Layers },
    ],
  },
  {
    categoryHi: 'वृत्त व वृत्तखंड (Circles & Sectors)',
    categoryEn: 'Circles & Sectors',
    shapes: [
      { id: 'circle' as Geometry2DShapeType, nameHi: 'वृत्त', nameEn: 'Circle', icon: CircleDot },
      { id: 'semicircle' as Geometry2DShapeType, nameHi: 'अर्धवृत्त', nameEn: 'Semicircle', icon: CircleDot },
      { id: 'ring' as Geometry2DShapeType, nameHi: 'वलय (Ring / Annulus)', nameEn: 'Annulus / Ring', icon: CircleDot },
      { id: 'sector' as Geometry2DShapeType, nameHi: 'त्रिज्यखंड', nameEn: 'Sector', icon: CircleDot },
    ],
  },
];

export const Geometry2DTab: React.FC<Geometry2DTabProps> = ({
  language,
  projectorMode = false,
  diagramOnlyMode = false,
  onToggleDiagramOnly,
  onCancelDiagramOnly,
  onSelectTab,
  selectedShapeType,
  onSelectShapeType,
  onOpenQASolver,
}) => {
  const [params, setParams] = useState<Geometry2DParams>({
    type: selectedShapeType || 'square',
    sideA: 8,
    sideB: 8,
    sideC: 8,
    sideD: 8,
    diagonal1: 11.31,
    diagonal2: 11.31,
    angleDeg: 90,
    height: 8,
    showDiagonals: true,
    showAngles: true,
    showAltitudes: true,
    showIncircle: false,
    showCircumcircle: false,
    color: '#3b82f6',
  });

  const [activeStepTab, setActiveStepTab] = useState<'steps' | 'formulas' | 'properties'>('steps');
  const [isCompactSettingsOpen, setIsCompactSettingsOpen] = useState(false);

  const metrics = calculateGeometry2D(params);

  const updateParam = (key: keyof Geometry2DParams, val: any) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const handleShapeSelect = (sId: Geometry2DShapeType) => {
    onSelectShapeType?.(sId);
    switch (sId) {
      case 'square':
        setParams((p) => ({ ...p, type: sId, sideA: 8 }));
        break;
      case 'rectangle':
        setParams((p) => ({ ...p, type: sId, sideA: 12, sideB: 7 }));
        break;
      case 'rhombus':
        setParams((p) => ({ ...p, type: sId, diagonal1: 16, diagonal2: 12, sideA: 10 }));
        break;
      case 'parallelogram':
        setParams((p) => ({ ...p, type: sId, sideA: 8, sideB: 14, angleDeg: 60, height: 6.93 }));
        break;
      case 'trapezium':
        setParams((p) => ({ ...p, type: sId, sideA: 10, sideB: 18, sideC: 6, sideD: 6, height: 5 }));
        break;
      case 'kite':
        setParams((p) => ({ ...p, type: sId, sideA: 6, sideB: 10, diagonal1: 10, diagonal2: 14 }));
        break;
      case 'cyclic_quadrilateral':
        setParams((p) => ({ ...p, type: sId, sideA: 7, sideB: 6, sideC: 8, sideD: 5 }));
        break;
      case 'equilateral_triangle':
        setParams((p) => ({ ...p, type: sId, sideA: 10 }));
        break;
      case 'right_triangle':
        setParams((p) => ({ ...p, type: sId, sideA: 12, sideB: 5 }));
        break;
      case 'isosceles_triangle':
        setParams((p) => ({ ...p, type: sId, sideA: 10, sideB: 12 }));
        break;
      case 'scalene_triangle':
        setParams((p) => ({ ...p, type: sId, sideA: 7, sideB: 8, sideC: 9 }));
        break;
      case 'circle':
        setParams((p) => ({ ...p, type: sId, sideA: 7 }));
        break;
      case 'semicircle':
        setParams((p) => ({ ...p, type: sId, sideA: 7 }));
        break;
      case 'ring':
        setParams((p) => ({ ...p, type: sId, sideA: 10, sideB: 6 }));
        break;
      case 'sector':
        setParams((p) => ({ ...p, type: sId, sideA: 8, angleDeg: 90 }));
        break;
      default:
        setParams((p) => ({ ...p, type: sId }));
    }
  };

  React.useEffect(() => {
    if (selectedShapeType && selectedShapeType !== params.type) {
      handleShapeSelect(selectedShapeType);
    }
  }, [selectedShapeType]);

  // Render SVG based on active geometry type
  const renderGeometrySVG = () => {
    const width = 640;
    const height = 400;
    const cx = width / 2;
    const cy = height / 2;

    switch (params.type) {
      case 'square': {
        const side = Math.min(220, Math.max(90, params.sideA * 14));
        const x1 = cx - side / 2;
        const y1 = cy - side / 2;
        const x2 = cx + side / 2;
        const y2 = cy + side / 2;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {/* Circumcircle */}
            {params.showCircumcircle && (
              <circle
                cx={cx}
                cy={cy}
                r={(side * Math.SQRT2) / 2}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            )}
            {/* Incircle */}
            {params.showIncircle && (
              <circle
                cx={cx}
                cy={cy}
                r={side / 2}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            )}
            {/* Square Polygon */}
            <polygon
              points={`${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Diagonals */}
            {params.showDiagonals && (
              <>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
                <line x1={x2} y1={y1} x2={x1} y2={y2} stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
                <text x={cx + 12} y={cy - 12} fill="#f43f5e" fontSize="13" fontWeight="bold">
                  d = {metrics.diagonal1?.toFixed(1)} cm
                </text>
              </>
            )}
            {/* 90 deg corner markers */}
            {params.showAngles && (
              <>
                <path d={`M ${x1 + 14} ${y1} L ${x1 + 14} ${y1 + 14} L ${x1} ${y1 + 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d={`M ${x2 - 14} ${y1} L ${x2 - 14} ${y1 + 14} L ${x2} ${y1 + 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d={`M ${x2 - 14} ${y2} L ${x2 - 14} ${y2 - 14} L ${x2} ${y2 - 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d={`M ${x1 + 14} ${y2} L ${x1 + 14} ${y2 - 14} L ${x1} ${y2 - 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
              </>
            )}
            {/* Vertices */}
            <circle cx={x1} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x1 - 18} y={y1 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">A</text>
            <circle cx={x2} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y1 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={x2} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y2 + 20} fill="#94a3b8" fontSize="13" fontWeight="bold">C</text>
            <circle cx={x1} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x1 - 18} y={y2 + 20} fill="#94a3b8" fontSize="13" fontWeight="bold">D</text>

            {/* Labels */}
            <text x={cx} y={y2 + 26} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              a = {params.sideA} cm
            </text>
            <text x={x2 + 30} y={cy + 4} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              a = {params.sideA} cm
            </text>
          </svg>
        );
      }

      case 'rectangle': {
        const l = Math.min(260, Math.max(100, params.sideA * 13));
        const b = Math.min(170, Math.max(60, (params.sideB || 7) * 13));
        const x1 = cx - l / 2;
        const y1 = cy - b / 2;
        const x2 = cx + l / 2;
        const y2 = cy + b / 2;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {params.showCircumcircle && (
              <circle
                cx={cx}
                cy={cy}
                r={Math.hypot(l, b) / 2}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            )}
            <polygon
              points={`${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showDiagonals && (
              <>
                <line x1={x1} y1={y2} x2={x2} y2={y1} stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
                <text x={cx} y={cy - 14} fill="#f43f5e" textAnchor="middle" fontSize="13" fontWeight="bold">
                  d = {metrics.diagonal1?.toFixed(1)} cm
                </text>
              </>
            )}
            {/* 90 deg corner markers */}
            {params.showAngles && (
              <>
                <path d={`M ${x1 + 14} ${y1} L ${x1 + 14} ${y1 + 14} L ${x1} ${y1 + 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d={`M ${x2 - 14} ${y1} L ${x2 - 14} ${y1 + 14} L ${x2} ${y1 + 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d={`M ${x2 - 14} ${y2} L ${x2 - 14} ${y2 - 14} L ${x2} ${y2 - 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <path d={`M ${x1 + 14} ${y2} L ${x1 + 14} ${y2 - 14} L ${x1} ${y2 - 14}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
              </>
            )}
            <circle cx={x1} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x1 - 18} y={y1 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">A</text>
            <circle cx={x2} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y1 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={x2} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y2 + 20} fill="#94a3b8" fontSize="13" fontWeight="bold">C</text>
            <circle cx={x1} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x1 - 18} y={y2 + 20} fill="#94a3b8" fontSize="13" fontWeight="bold">D</text>

            <text x={cx} y={y2 + 26} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              l = {params.sideA} cm
            </text>
            <text x={x2 + 32} y={cy + 4} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              b = {params.sideB} cm
            </text>
          </svg>
        );
      }

      case 'rhombus': {
        const d1 = Math.min(280, Math.max(120, (params.diagonal1 || 16) * 12));
        const d2 = Math.min(200, Math.max(80, (params.diagonal2 || 12) * 12));

        const ptTop = { x: cx, y: cy - d2 / 2 };
        const ptRight = { x: cx + d1 / 2, y: cy };
        const ptBottom = { x: cx, y: cy + d2 / 2 };
        const ptLeft = { x: cx - d1 / 2, y: cy };

        // inradius circle radius in SVG
        const sideSvg = 0.5 * Math.hypot(d1, d2);
        const inradiusSvg = (d1 * d2) / (4 * sideSvg);

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {params.showIncircle && (
              <circle cx={cx} cy={cy} r={inradiusSvg} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
            )}
            <polygon
              points={`${ptTop.x},${ptTop.y} ${ptRight.x},${ptRight.y} ${ptBottom.x},${ptBottom.y} ${ptLeft.x},${ptLeft.y}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showDiagonals && (
              <>
                <line x1={ptLeft.x} y1={ptLeft.y} x2={ptRight.x} y2={ptRight.y} stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5 3" />
                <line x1={ptTop.x} y1={ptTop.y} x2={ptBottom.x} y2={ptBottom.y} stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
                <text x={cx + 18} y={cy - 12} fill="#f43f5e" fontSize="13" fontWeight="bold">
                  d₁ = {params.diagonal1 || 16} cm
                </text>
                <text x={cx - 65} y={cy + 30} fill="#10b981" fontSize="13" fontWeight="bold">
                  d₂ = {params.diagonal2 || 12} cm
                </text>
              </>
            )}
            {/* 90 deg center intersection marker */}
            <path d={`M ${cx + 12} ${cy} L ${cx + 12} ${cy - 12} L ${cx} ${cy - 12}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r="3.5" fill="#38bdf8" />
            <text x={cx + 14} y={cy + 16} fill="#38bdf8" fontSize="11" fontWeight="bold">90°</text>

            <circle cx={ptTop.x} cy={ptTop.y} r="4.5" fill="#38bdf8" />
            <text x={ptTop.x} y={ptTop.y - 10} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">A</text>
            <circle cx={ptRight.x} cy={ptRight.y} r="4.5" fill="#38bdf8" />
            <text x={ptRight.x + 12} y={ptRight.y + 5} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={ptBottom.x} cy={ptBottom.y} r="4.5" fill="#38bdf8" />
            <text x={ptBottom.x} y={ptBottom.y + 22} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">C</text>
            <circle cx={ptLeft.x} cy={ptLeft.y} r="4.5" fill="#38bdf8" />
            <text x={ptLeft.x - 20} y={ptLeft.y + 5} fill="#94a3b8" fontSize="13" fontWeight="bold">D</text>

            <text x={(ptTop.x + ptRight.x) / 2 + 16} y={(ptTop.y + ptRight.y) / 2 - 8} fill="#fbbf24" fontSize="12" fontWeight="bold">
              a = {metrics.diagonal1 && metrics.diagonal2 ? (0.5 * Math.hypot(metrics.diagonal1, metrics.diagonal2)).toFixed(1) : params.sideA} cm
            </text>
          </svg>
        );
      }

      case 'parallelogram': {
        const b = 220;
        const h = 120;
        const shift = 60;
        const x1 = cx - b / 2 - shift / 2;
        const y1 = cy + h / 2;
        const x2 = x1 + b;
        const y2 = y1;
        const x3 = x2 + shift;
        const y3 = cy - h / 2;
        const x4 = x1 + shift;
        const y4 = y3;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            <polygon
              points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showAltitudes && (
              <>
                <line x1={x4} y1={y4} x2={x4} y2={y1} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
                <path d={`M ${x4 + 10} ${y1} L ${x4 + 10} ${y1 - 10} L ${x4} ${y1 - 10}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <text x={x4 - 28} y={cy} fill="#f59e0b" fontSize="13" fontWeight="bold">
                  h = {metrics.altitude?.toFixed(1)} cm
                </text>
              </>
            )}
            {params.showDiagonals && (
              <>
                <line x1={x1} y1={y1} x2={x3} y2={y3} stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
                <line x1={x2} y1={y2} x2={x4} y2={y4} stroke="#10b981" strokeWidth="2" strokeDasharray="5 3" />
              </>
            )}
            {params.showAngles && (
              <text x={x1 + 25} y={y1 - 8} fill="#38bdf8" fontSize="12" fontWeight="bold">
                θ = {params.angleDeg || 60}°
              </text>
            )}
            <circle cx={x1} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x1 - 16} y={y1 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">A</text>
            <circle cx={x2} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y2 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={x3} cy={y3} r="4.5" fill="#38bdf8" />
            <text x={x3 + 10} y={y3 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">C</text>
            <circle cx={x4} cy={y4} r="4.5" fill="#38bdf8" />
            <text x={x4 - 16} y={y4 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">D</text>

            <text x={cx - shift / 2} y={y1 + 26} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              Base b = {params.sideB} cm
            </text>
            <text x={x3 + 24} y={cy} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              Side a = {params.sideA} cm
            </text>
          </svg>
        );
      }

      case 'trapezium': {
        const topA = 130;
        const bottomB = 260;
        const h = 120;
        const x1 = cx - bottomB / 2;
        const y1 = cy + h / 2;
        const x2 = cx + bottomB / 2;
        const y2 = y1;
        const x3 = cx + topA / 2;
        const y3 = cy - h / 2;
        const x4 = cx - topA / 2;
        const y4 = y3;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            <polygon
              points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showAltitudes && (
              <>
                <line x1={x4} y1={y4} x2={x4} y2={y1} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
                <path d={`M ${x4 + 10} ${y1} L ${x4 + 10} ${y1 - 10} L ${x4} ${y1 - 10}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <text x={x4 + 12} y={cy} fill="#f59e0b" fontSize="13" fontWeight="bold">
                  h = {params.height || 5} cm
                </text>
              </>
            )}
            {/* Median line */}
            <line
              x1={(x1 + x4) / 2}
              y1={cy}
              x2={(x2 + x3) / 2}
              y2={cy}
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />
            <text x={cx} y={cy - 10} fill="#10b981" textAnchor="middle" fontSize="12" fontWeight="bold">
              मध्यिका (Median) = {((params.sideA + (params.sideB || 0)) / 2).toFixed(1)} cm
            </text>

            <circle cx={x1} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x1 - 16} y={y1 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">A</text>
            <circle cx={x2} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y2 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={x3} cy={y3} r="4.5" fill="#38bdf8" />
            <text x={x3 + 10} y={y3 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">C</text>
            <circle cx={x4} cy={y4} r="4.5" fill="#38bdf8" />
            <text x={x4 - 16} y={y4 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">D</text>

            <text x={cx} y={y3 - 12} fill="#38bdf8" textAnchor="middle" fontSize="13" fontWeight="bold">
              a = {params.sideA} cm
            </text>
            <text x={cx} y={y1 + 26} fill="#38bdf8" textAnchor="middle" fontSize="13" fontWeight="bold">
              b = {params.sideB} cm
            </text>
          </svg>
        );
      }

      case 'kite': {
        const d1 = Math.min(220, Math.max(100, (params.diagonal1 || 10) * 14));
        const d2 = Math.min(260, Math.max(120, (params.diagonal2 || 14) * 14));
        const topRatio = 0.35;
        const topH = d2 * topRatio;
        const botH = d2 * (1 - topRatio);

        const ptTop = { x: cx, y: cy - topH };
        const ptRight = { x: cx + d1 / 2, y: cy };
        const ptBottom = { x: cx, y: cy + botH };
        const ptLeft = { x: cx - d1 / 2, y: cy };

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            <polygon
              points={`${ptTop.x},${ptTop.y} ${ptRight.x},${ptRight.y} ${ptBottom.x},${ptBottom.y} ${ptLeft.x},${ptLeft.y}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showDiagonals && (
              <>
                <line x1={ptLeft.x} y1={ptLeft.y} x2={ptRight.x} y2={ptRight.y} stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5 3" />
                <line x1={ptTop.x} y1={ptTop.y} x2={ptBottom.x} y2={ptBottom.y} stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
                <text x={cx + 12} y={cy - 10} fill="#f43f5e" fontSize="12" fontWeight="bold">
                  d₁ = {params.diagonal1 || 10} cm
                </text>
                <text x={cx + 12} y={cy + 50} fill="#10b981" fontSize="12" fontWeight="bold">
                  d₂ = {params.diagonal2 || 14} cm
                </text>
              </>
            )}
            {/* 90 deg center angle */}
            <path d={`M ${cx + 10} ${cy} L ${cx + 10} ${cy - 10} L ${cx} ${cy - 10}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />

            <circle cx={ptTop.x} cy={ptTop.y} r="4.5" fill="#38bdf8" />
            <text x={ptTop.x} y={ptTop.y - 10} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">A</text>
            <circle cx={ptRight.x} cy={ptRight.y} r="4.5" fill="#38bdf8" />
            <text x={ptRight.x + 12} y={ptRight.y + 4} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={ptBottom.x} cy={ptBottom.y} r="4.5" fill="#38bdf8" />
            <text x={ptBottom.x} y={ptBottom.y + 20} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">C</text>
            <circle cx={ptLeft.x} cy={ptLeft.y} r="4.5" fill="#38bdf8" />
            <text x={ptLeft.x - 20} y={ptLeft.y + 4} fill="#94a3b8" fontSize="13" fontWeight="bold">D</text>

            <text x={(ptTop.x + ptLeft.x) / 2 - 16} y={(ptTop.y + ptLeft.y) / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              a = {params.sideA} cm
            </text>
            <text x={(ptBottom.x + ptLeft.x) / 2 - 20} y={(ptBottom.y + ptLeft.y) / 2 + 10} fill="#fbbf24" fontSize="12" fontWeight="bold">
              b = {params.sideB} cm
            </text>
          </svg>
        );
      }

      case 'cyclic_quadrilateral': {
        const R = 140;
        // 4 points on the circle circumference
        const angles = [-130, -40, 50, 140].map((deg) => (deg * Math.PI) / 180);
        const pts = angles.map((rad) => ({
          x: cx + R * Math.cos(rad),
          y: cy + R * Math.sin(rad),
        }));

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {/* Circumcircle */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx={cx} cy={cy} r="3.5" fill="#10b981" />
            <text x={cx + 10} y={cy - 6} fill="#10b981" fontSize="11" fontWeight="bold">
              R = {metrics.circumradius?.toFixed(1) || '7.5'} cm
            </text>

            {/* Inscribed Polygon */}
            <polygon
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Diagonals */}
            {params.showDiagonals && (
              <>
                <line x1={pts[0].x} y1={pts[0].y} x2={pts[2].x} y2={pts[2].y} stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
                <line x1={pts[1].x} y1={pts[1].y} x2={pts[3].x} y2={pts[3].y} stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
              </>
            )}

            {/* Vertices */}
            {['A', 'B', 'C', 'D'].map((name, i) => (
              <g key={name}>
                <circle cx={pts[i].x} cy={pts[i].y} r="4.5" fill="#38bdf8" />
                <text
                  x={pts[i].x + (pts[i].x > cx ? 12 : -20)}
                  y={pts[i].y + (pts[i].y > cy ? 18 : -10)}
                  fill="#94a3b8"
                  fontSize="13"
                  fontWeight="bold"
                >
                  {name}
                </text>
              </g>
            ))}

            {/* Opposite Angles Badge */}
            <text x={cx} y={height - 20} fill="#38bdf8" textAnchor="middle" fontSize="13" fontWeight="bold">
              ∠A + ∠C = 180° • ∠B + ∠D = 180° (संपूरक कोण)
            </text>
          </svg>
        );
      }

      case 'equilateral_triangle': {
        const side = Math.min(260, Math.max(120, params.sideA * 16));
        const h = (Math.sqrt(3) / 2) * side;
        const ptTop = { x: cx, y: cy - (2 / 3) * h };
        const ptLeft = { x: cx - side / 2, y: cy + (1 / 3) * h };
        const ptRight = { x: cx + side / 2, y: cy + (1 / 3) * h };

        const inradius = h / 3;
        const circumradius = (2 / 3) * h;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {params.showCircumcircle && (
              <circle cx={cx} cy={cy} r={circumradius} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 4" />
            )}
            {params.showIncircle && (
              <circle cx={cx} cy={cy} r={inradius} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
            )}
            <polygon
              points={`${ptTop.x},${ptTop.y} ${ptRight.x},${ptRight.y} ${ptLeft.x},${ptLeft.y}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showAltitudes && (
              <>
                <line x1={ptTop.x} y1={ptTop.y} x2={cx} y2={ptLeft.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
                <path d={`M ${cx + 10} ${ptLeft.y} L ${cx + 10} ${ptLeft.y - 10} L ${cx} ${ptLeft.y - 10}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <text x={cx + 14} y={cy} fill="#f59e0b" fontSize="13" fontWeight="bold">
                  h = {metrics.altitude?.toFixed(1)} cm
                </text>
              </>
            )}
            {params.showAngles && (
              <>
                <text x={ptTop.x} y={ptTop.y + 35} fill="#38bdf8" textAnchor="middle" fontSize="11" fontWeight="bold">60°</text>
                <text x={ptLeft.x + 30} y={ptLeft.y - 10} fill="#38bdf8" fontSize="11" fontWeight="bold">60°</text>
                <text x={ptRight.x - 45} y={ptRight.y - 10} fill="#38bdf8" fontSize="11" fontWeight="bold">60°</text>
              </>
            )}
            <circle cx={ptTop.x} cy={ptTop.y} r="4.5" fill="#38bdf8" />
            <text x={ptTop.x} y={ptTop.y - 12} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">A</text>
            <circle cx={ptLeft.x} cy={ptLeft.y} r="4.5" fill="#38bdf8" />
            <text x={ptLeft.x - 16} y={ptLeft.y + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={ptRight.x} cy={ptRight.y} r="4.5" fill="#38bdf8" />
            <text x={ptRight.x + 10} y={ptRight.y + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">C</text>

            <text x={cx} y={ptLeft.y + 26} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              a = {params.sideA} cm
            </text>
          </svg>
        );
      }

      case 'right_triangle': {
        const b = Math.min(240, Math.max(100, params.sideA * 13));
        const p = Math.min(180, Math.max(70, (params.sideB || 5) * 13));
        const x1 = cx - b / 2;
        const y1 = cy + p / 2;
        const x2 = cx + b / 2;
        const y2 = y1;
        const x3 = x1;
        const y3 = cy - p / 2;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            <polygon
              points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* 90 deg right angle marker */}
            <path d={`M ${x1 + 14} ${y1} L ${x1 + 14} ${y1 - 14} L ${x1} ${y1 - 14}`} fill="none" stroke="#38bdf8" strokeWidth="2" />
            <text x={x1 + 18} y={y1 - 18} fill="#38bdf8" fontSize="11" fontWeight="bold">90°</text>

            <circle cx={x3} cy={y3} r="4.5" fill="#38bdf8" />
            <text x={x3 - 16} y={y3 - 8} fill="#94a3b8" fontSize="13" fontWeight="bold">A</text>
            <circle cx={x1} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x1 - 16} y={y1 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={x2} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y2 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">C</text>

            <text x={cx} y={y1 + 26} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              Base = {params.sideA} cm
            </text>
            <text x={x1 - 32} y={cy} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              Perp = {params.sideB} cm
            </text>
            <text x={(x2 + x3) / 2 + 20} y={cy - 12} fill="#f43f5e" fontSize="13" fontWeight="bold">
              कर्ण (H) = {Math.hypot(params.sideA, params.sideB || 0).toFixed(1)} cm
            </text>
          </svg>
        );
      }

      case 'isosceles_triangle': {
        const b = Math.min(240, Math.max(100, (params.sideB || 12) * 12));
        const a = Math.min(200, Math.max(90, params.sideA * 12));
        const h = Math.sqrt(Math.max(400, a * a - (b * b) / 4));

        const ptTop = { x: cx, y: cy - h / 2 };
        const ptLeft = { x: cx - b / 2, y: cy + h / 2 };
        const ptRight = { x: cx + b / 2, y: cy + h / 2 };

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            <polygon
              points={`${ptTop.x},${ptTop.y} ${ptRight.x},${ptRight.y} ${ptLeft.x},${ptLeft.y}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showAltitudes && (
              <>
                <line x1={ptTop.x} y1={ptTop.y} x2={cx} y2={ptLeft.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
                <path d={`M ${cx + 10} ${ptLeft.y} L ${cx + 10} ${ptLeft.y - 10} L ${cx} ${ptLeft.y - 10}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <text x={cx + 14} y={cy} fill="#f59e0b" fontSize="13" fontWeight="bold">
                  h = {metrics.altitude?.toFixed(1)} cm
                </text>
              </>
            )}
            <circle cx={ptTop.x} cy={ptTop.y} r="4.5" fill="#38bdf8" />
            <text x={ptTop.x} y={ptTop.y - 12} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">A</text>
            <circle cx={ptLeft.x} cy={ptLeft.y} r="4.5" fill="#38bdf8" />
            <text x={ptLeft.x - 16} y={ptLeft.y + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={ptRight.x} cy={ptRight.y} r="4.5" fill="#38bdf8" />
            <text x={ptRight.x + 10} y={ptRight.y + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">C</text>

            <text x={(ptTop.x + ptLeft.x) / 2 - 20} y={(ptTop.y + ptLeft.y) / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              a = {params.sideA} cm
            </text>
            <text x={(ptTop.x + ptRight.x) / 2 + 12} y={(ptTop.y + ptRight.y) / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              a = {params.sideA} cm
            </text>
            <text x={cx} y={ptLeft.y + 26} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              Base b = {params.sideB} cm
            </text>
          </svg>
        );
      }

      case 'scalene_triangle': {
        const a = params.sideA || 7;
        const b = params.sideB || 8;
        const c = params.sideC || 9;

        // Law of cosines for angle A at (pt1)
        const cosA = Math.max(-0.99, Math.min(0.99, (b * b + c * c - a * a) / (2 * b * c)));
        const angleA = Math.acos(cosA);

        const scale = 18;
        const cSvg = c * scale;
        const bSvg = b * scale;

        const x1 = cx - cSvg / 2;
        const y1 = cy + 50;
        const x2 = cx + cSvg / 2;
        const y2 = y1;
        const x3 = x1 + bSvg * Math.cos(angleA);
        const y3 = y1 - bSvg * Math.sin(angleA);

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {params.showCircumcircle && metrics.circumradius && (
              <circle
                cx={cx}
                cy={cy}
                r={metrics.circumradius * (scale * 0.8)}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            )}
            <polygon
              points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {params.showAltitudes && (
              <line x1={x3} y1={y3} x2={x3} y2={y1} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
            )}
            <circle cx={x1} cy={y1} r="4.5" fill="#38bdf8" />
            <text x={x1 - 16} y={y1 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">A</text>
            <circle cx={x2} cy={y2} r="4.5" fill="#38bdf8" />
            <text x={x2 + 10} y={y2 + 18} fill="#94a3b8" fontSize="13" fontWeight="bold">B</text>
            <circle cx={x3} cy={y3} r="4.5" fill="#38bdf8" />
            <text x={x3} y={y3 - 10} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">C</text>

            <text x={cx} y={y1 + 26} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              c = {c} cm
            </text>
            <text x={(x1 + x3) / 2 - 20} y={(y1 + y3) / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              b = {b} cm
            </text>
            <text x={(x2 + x3) / 2 + 12} y={(y2 + y3) / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              a = {a} cm
            </text>
          </svg>
        );
      }

      case 'circle': {
        const r = Math.min(140, Math.max(60, params.sideA * 14));
        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            <circle cx={cx} cy={cy} r={r} fill={params.color} fillOpacity="0.22" stroke={params.color} strokeWidth="3.5" />
            <circle cx={cx} cy={cy} r="4.5" fill="#fbbf24" />
            <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="#fbbf24" strokeWidth="2.5" />
            <text x={cx + r / 2} y={cy - 10} fill="#fbbf24" textAnchor="middle" fontSize="13" fontWeight="bold">
              r = {params.sideA} cm
            </text>
            <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={cx} y={cy + 26} fill="#94a3b8" textAnchor="middle" fontSize="12" fontWeight="bold">
              व्यास (Diameter d) = {(params.sideA * 2).toFixed(1)} cm
            </text>
          </svg>
        );
      }

      case 'semicircle': {
        const r = Math.min(140, Math.max(60, params.sideA * 14));
        const baseY = cy + 40;
        const xLeft = cx - r;
        const xRight = cx + r;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {/* Semicircle Path */}
            <path
              d={`M ${xLeft} ${baseY} A ${r} ${r} 0 0 1 ${xRight} ${baseY} Z`}
              fill={params.color}
              fillOpacity="0.22"
              stroke={params.color}
              strokeWidth="3.5"
            />
            {/* Center Point */}
            <circle cx={cx} cy={baseY} r="4.5" fill="#fbbf24" />
            <text x={cx} y={baseY + 20} fill="#94a3b8" textAnchor="middle" fontSize="12" fontWeight="bold">O (Center)</text>

            {/* Radius line vertical */}
            <line x1={cx} y1={baseY} x2={cx} y2={baseY - r} stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 3" />
            <text x={cx + 12} y={baseY - r / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              r = {params.sideA} cm
            </text>

            {/* Diameter Base */}
            <line x1={xLeft} y1={baseY} x2={xRight} y2={baseY} stroke="#38bdf8" strokeWidth="2.5" />
            <text x={cx} y={baseY + 38} fill="#38bdf8" textAnchor="middle" fontSize="13" fontWeight="bold">
              व्यास (Base 2r) = {(params.sideA * 2).toFixed(1)} cm
            </text>

            {/* Arc length label */}
            <text x={cx} y={baseY - r - 12} fill="#10b981" textAnchor="middle" fontSize="13" fontWeight="bold">
              चाप (Arc) = πr = {(Math.PI * params.sideA).toFixed(1)} cm
            </text>
          </svg>
        );
      }

      case 'ring': {
        const R = Math.min(140, Math.max(80, params.sideA * 12));
        const r = Math.min(R - 20, Math.max(30, (params.sideB || params.sideA * 0.6) * 12));

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {/* Donut Ring Path using evenodd */}
            <path
              d={`M ${cx} ${cy - R} A ${R} ${R} 0 1 0 ${cx} ${cy + R} A ${R} ${R} 0 1 0 ${cx} ${cy - R} Z M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`}
              fill={params.color}
              fillOpacity="0.25"
              fillRule="evenodd"
              stroke={params.color}
              strokeWidth="3"
            />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r="4" fill="#fbbf24" />

            {/* Outer Radius R */}
            <line x1={cx} y1={cy} x2={cx + R * 0.866} y2={cy - R * 0.5} stroke="#38bdf8" strokeWidth="2" />
            <text x={cx + (R * 0.866) / 2 + 10} y={cy - (R * 0.5) / 2 - 10} fill="#38bdf8" fontSize="12" fontWeight="bold">
              R = {params.sideA} cm
            </text>

            {/* Inner Radius r */}
            <line x1={cx} y1={cy} x2={cx - r * 0.866} y2={cy + r * 0.5} stroke="#f43f5e" strokeWidth="2" />
            <text x={cx - (r * 0.866) / 2 - 25} y={cy + (r * 0.5) / 2 + 15} fill="#f43f5e" fontSize="12" fontWeight="bold">
              r = {params.sideB} cm
            </text>

            {/* Width bar */}
            <text x={cx} y={height - 20} fill="#10b981" textAnchor="middle" fontSize="13" fontWeight="bold">
              वलय की चौड़ाई (Width w = R - r) = {(params.sideA - (params.sideB || 0)).toFixed(1)} cm
            </text>
          </svg>
        );
      }

      case 'sector': {
        const r = Math.min(150, Math.max(70, params.sideA * 14));
        const theta = Math.min(359, Math.max(10, params.angleDeg || 90));
        const rad = (theta * Math.PI) / 180;

        // Align sector symmetrically around top or from 0 to theta
        const startAngle = -Math.PI / 2 - rad / 2;
        const endAngle = -Math.PI / 2 + rad / 2;

        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);

        const largeArcFlag = theta > 180 ? 1 : 0;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
            <rect width={width} height={height} fill="#020617" />
            {/* Ghost full circle */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Sector Pie Slice */}
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={params.color}
              fillOpacity="0.25"
              stroke={params.color}
              strokeWidth="3.5"
            />
            {/* Center Vertex */}
            <circle cx={cx} cy={cy} r="4.5" fill="#fbbf24" />
            <text x={cx} y={cy + 22} fill="#94a3b8" textAnchor="middle" fontSize="12" fontWeight="bold">O</text>

            {/* Angle arc */}
            <circle cx={cx} cy={cy} r={r * 0.25} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
            <text x={cx} y={cy - r * 0.35} fill="#38bdf8" textAnchor="middle" fontSize="13" fontWeight="bold">
              θ = {theta}°
            </text>

            {/* Radii labels */}
            <text x={(cx + x1) / 2 - 20} y={(cy + y1) / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              r = {params.sideA} cm
            </text>
            <text x={(cx + x2) / 2 + 15} y={(cy + y2) / 2} fill="#fbbf24" fontSize="12" fontWeight="bold">
              r = {params.sideA} cm
            </text>

            {/* Arc length Callout */}
            <text x={cx} y={height - 20} fill="#10b981" textAnchor="middle" fontSize="13" fontWeight="bold">
              चाप की लंबाई (Arc Length L) = {((theta / 360) * 2 * Math.PI * params.sideA).toFixed(2)} cm
            </text>
          </svg>
        );
      }

      default: {
        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <rect width={width} height={height} fill="#020617" />
            <circle cx={cx} cy={cy} r="100" fill={params.color} fillOpacity="0.25" stroke={params.color} strokeWidth="3" />
            <text x={cx} y={cy} fill="#fbbf24" textAnchor="middle" fontSize="14" fontWeight="bold">
              Area = {metrics.area.toFixed(1)} cm²
            </text>
          </svg>
        );
      }
    }
  };

  // =========================================================================
  // ONLY DIAGRAM MODE (ZEN DIAGRAM VIEW)
  // Everything else is hidden, only the 2D diagram is shown with a single cancel button
  // =========================================================================
  if (diagramOnlyMode) {
    const currentShapeObj = SHAPE_CATEGORIES.flatMap((c) => c.shapes).find((s) => s.id === params.type);
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col justify-center items-center overflow-hidden select-none">
        {/* Full Viewport 2D SVG Canvas */}
        <div className="w-full h-full flex items-center justify-center p-2 sm:p-6">
          <div className="w-full max-w-6xl h-[88vh] rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl">
            {renderGeometrySVG()}
          </div>
        </div>

        {/* 1. Only Button to Cancel / Exit Diagram Mode */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            id="btn-cancel-diagram-mode-2d"
            onClick={onCancelDiagramOnly}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm shadow-2xl border-2 border-white/20 transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
            title="Exit Diagram Mode"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{language === 'hi' ? 'डायग्राम मोड बंद करें (Esc)' : 'Exit Diagram Mode (Esc)'}</span>
          </button>
        </div>

        {/* Floating Title Badge at Top Center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white flex items-center gap-2 shadow-xl pointer-events-none max-w-[90vw] truncate">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">{currentShapeObj?.nameHi || params.type} (2D Geometry Diagram)</span>
        </div>

        {/* Floating Quick Formulas Pill at Bottom Center */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-4 text-xs text-white shadow-2xl">
          <span className="text-amber-300 font-mono font-bold">Area = {metrics.area.toFixed(2)} cm²</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-300 font-mono font-bold">Perimeter = {metrics.perimeter.toFixed(2)} cm</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${projectorMode ? 'w-full max-w-full' : 'max-w-7xl mx-auto'}`}>
      {/* Top Banner / Teaching Header in Projector Mode */}
      {projectorMode && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{language === 'hi' ? '16:9 स्मार्टबोर्ड व प्रोजेक्टर क्लासरूम मोड' : '16:9 Smartboard & Projector Classroom Mode'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE TEACHING
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {language === 'hi'
                  ? 'अध्यापक व छात्रों के लिए बड़े व स्पष्ट आरेख, कॉम्पैक्ट कंट्रोल बार'
                  : 'Large high-contrast diagrams with compact controls for projection'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-trigger-only-diagram-2d-proj"
              onClick={onToggleDiagramOnly}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'केवल डायग्राम' : 'Only Diagram'}</span>
            </button>
            <span className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-700 text-indigo-300 font-mono text-xs font-bold">
              {metrics.area.toFixed(2)} cm² (क्षेत्रफल)
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-700 text-emerald-300 font-mono text-xs font-bold">
              {metrics.perimeter.toFixed(2)} cm (परिमाप)
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className={`flex flex-col ${projectorMode ? 'lg:flex-row' : 'lg:flex-row'} gap-5`}>
        {/* LEFT COLUMN / DOMINANT CANVAS */}
        <div className={`${projectorMode ? 'lg:w-8/12' : 'lg:w-7/12'} flex flex-col gap-4`}>
          {/* Top Toolbar: Active Shape & Controls */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 sm:p-3 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Square className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <span>
                    {language === 'hi'
                      ? SHAPE_CATEGORIES.flatMap((c) => c.shapes).find((s) => s.id === params.type)?.nameHi || '2D आकृति'
                      : SHAPE_CATEGORIES.flatMap((c) => c.shapes).find((s) => s.id === params.type)?.nameEn || '2D Shape'}
                  </span>
                  <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    100% Offline
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Overlays / Style Settings Button */}
              <button
                onClick={() => setIsCompactSettingsOpen(!isCompactSettingsOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isCompactSettingsOpen
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/60'
                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'विशेषताएँ व रंग' : 'Overlays & Color'}</span>
              </button>

              {/* Only Diagram Button */}
              <button
                id="btn-trigger-only-diagram-2d"
                onClick={onToggleDiagramOnly}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title={language === 'hi' ? 'केवल डायग्राम मोड (बाकी सब छिपाएं)' : 'Only Diagram Mode'}
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'hi' ? 'केवल डायग्राम' : 'Only Diagram'}</span>
              </button>
            </div>
          </div>

          {/* Expandable Settings / Overlays Drawer */}
          {isCompactSettingsOpen && (
            <div className="p-3 bg-slate-950/90 rounded-xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-medium">{language === 'hi' ? 'रंग:' : 'Color:'}</label>
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => updateParam('color', e.target.value)}
                  className="w-7 h-7 rounded-md cursor-pointer border border-slate-700 bg-transparent"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={params.showDiagonals}
                    onChange={(e) => updateParam('showDiagonals', e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  {language === 'hi' ? 'विकर्ण (Diagonals)' : 'Diagonals'}
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={params.showAngles}
                    onChange={(e) => updateParam('showAngles', e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  {language === 'hi' ? 'कोण (Angles)' : 'Angles'}
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={params.showAltitudes}
                    onChange={(e) => updateParam('showAltitudes', e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  {language === 'hi' ? 'ऊंचाई (Altitude)' : 'Altitude'}
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={params.showIncircle}
                    onChange={(e) => updateParam('showIncircle', e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  {language === 'hi' ? 'अंतःवृत्त (Incircle)' : 'Incircle'}
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={params.showCircumcircle}
                    onChange={(e) => updateParam('showCircumcircle', e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  {language === 'hi' ? 'परिवृत्त (Circumcircle)' : 'Circumcircle'}
                </label>
              </div>
            </div>
          )}

          {/* 2D Interactive Vector Canvas Card */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>
                  {language === 'hi'
                    ? `${SHAPE_CATEGORIES.flatMap((c) => c.shapes).find((s) => s.id === params.type)?.nameHi || 'आकृति'} (इंटरएक्टिव 2D आरेख)`
                    : `${SHAPE_CATEGORIES.flatMap((c) => c.shapes).find((s) => s.id === params.type)?.nameEn || 'Shape'} (Interactive 2D Diagram)`}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
                  A: {metrics.area.toFixed(1)} cm²
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  P: {metrics.perimeter.toFixed(1)} cm
                </span>
              </div>
            </div>

            {/* SVG Canvas Stage */}
            <div
              className={`w-full relative bg-slate-950 flex items-center justify-center ${
                projectorMode ? 'h-[440px]' : 'h-[360px]'
              }`}
            >
              {renderGeometrySVG()}
            </div>

            {/* Canvas Quick Controls Ribbon */}
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={params.showDiagonals}
                    onChange={(e) => updateParam('showDiagonals', e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                  />
                  <span>{language === 'hi' ? 'विकर्ण (Diagonals)' : 'Diagonals'}</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={params.showAltitudes}
                    onChange={(e) => updateParam('showAltitudes', e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                  />
                  <span>{language === 'hi' ? 'शीर्षलंब / ऊंचाई' : 'Altitude'}</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={params.showCircumcircle}
                    onChange={(e) => updateParam('showCircumcircle', e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                  />
                  <span>{language === 'hi' ? 'परिवृत्त' : 'Circumcircle'}</span>
                </label>

                <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={params.showIncircle}
                    onChange={(e) => updateParam('showIncircle', e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                  />
                  <span>{language === 'hi' ? 'अंतःवृत्त' : 'Incircle'}</span>
                </label>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">{language === 'hi' ? 'रंग:' : 'Color:'}</span>
                {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateParam('color', c)}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      params.color === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN / COMPACT SETTINGS & DERIVATIONS */}
        <div className={`${projectorMode ? 'lg:w-4/12' : 'lg:w-5/12'} flex flex-col gap-4`}>
          {/* Param Sliders Card */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'hi' ? 'मान व माप (Parameters)' : 'Parameters & Dimensions'}</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                Real-time
              </span>
            </div>

            <div className="space-y-3">
              {/* Main Dimension 1: Side A / Length / Outer Radius */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-slate-300">
                    {params.type === 'circle' || params.type === 'semicircle'
                      ? language === 'hi' ? 'त्रिज्या (Radius r)' : 'Radius (r)'
                      : params.type === 'ring'
                      ? language === 'hi' ? 'बाह्य त्रिज्या (Outer Radius R)' : 'Outer Radius (R)'
                      : params.type === 'sector'
                      ? language === 'hi' ? 'त्रिज्या (Radius r)' : 'Radius (r)'
                      : params.type === 'rectangle'
                      ? language === 'hi' ? 'लंबाई (Length l)' : 'Length (l)'
                      : params.type === 'trapezium'
                      ? language === 'hi' ? 'समानांतर भुजा 1 (Parallel Side a)' : 'Parallel Side 1 (a)'
                      : params.type === 'right_triangle'
                      ? language === 'hi' ? 'आधार (Base b)' : 'Base (b)'
                      : params.type === 'rhombus'
                      ? language === 'hi' ? 'विकर्ण 1 (Diagonal d₁)' : 'Diagonal 1 (d₁)'
                      : params.type === 'kite'
                      ? language === 'hi' ? 'छोटी भुजा (Short Side a)' : 'Short Side (a)'
                      : params.type === 'isosceles_triangle'
                      ? language === 'hi' ? 'समान भुजा (Side a)' : 'Equal Side (a)'
                      : language === 'hi' ? 'भुजा (Side a)' : 'Side (a)'}
                  </span>
                  <span className="text-indigo-400 font-mono font-bold">{params.sideA} cm</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="0.5"
                    value={params.sideA}
                    onChange={(e) => updateParam('sideA', Number(e.target.value))}
                    className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0.1"
                    value={params.sideA}
                    onChange={(e) => updateParam('sideA', Math.max(0.1, Number(e.target.value)))}
                    className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Main Dimension 2: Side B / Breadth / Inner Radius / Diagonal 2 */}
              {(params.type === 'rectangle' ||
                params.type === 'rhombus' ||
                params.type === 'parallelogram' ||
                params.type === 'trapezium' ||
                params.type === 'kite' ||
                params.type === 'right_triangle' ||
                params.type === 'isosceles_triangle' ||
                params.type === 'scalene_triangle' ||
                params.type === 'cyclic_quadrilateral' ||
                params.type === 'ring') && (
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-300">
                      {params.type === 'rectangle'
                        ? language === 'hi' ? 'चौड़ाई (Breadth b)' : 'Breadth (b)'
                        : params.type === 'rhombus'
                        ? language === 'hi' ? 'विकर्ण 2 (Diagonal d₂)' : 'Diagonal 2 (d₂)'
                        : params.type === 'kite'
                        ? language === 'hi' ? 'लंबी भुजा (Long Side b)' : 'Long Side (b)'
                        : params.type === 'trapezium'
                        ? language === 'hi' ? 'समानांतर भुजा 2 (Parallel Side b)' : 'Parallel Side 2 (b)'
                        : params.type === 'ring'
                        ? language === 'hi' ? 'आंतरिक त्रिज्या (Inner Radius r)' : 'Inner Radius (r)'
                        : params.type === 'right_triangle'
                        ? language === 'hi' ? 'लंब (Perpendicular p)' : 'Perpendicular (p)'
                        : params.type === 'isosceles_triangle'
                        ? language === 'hi' ? 'आधार (Base b)' : 'Base (b)'
                        : language === 'hi' ? 'भुजा (Side b)' : 'Side (b)'}
                    </span>
                    <span className="text-indigo-400 font-mono font-bold">{params.sideB || 8} cm</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="0.5"
                      value={params.sideB || 8}
                      onChange={(e) => updateParam('sideB', Number(e.target.value))}
                      className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      value={params.sideB || 8}
                      onChange={(e) => updateParam('sideB', Math.max(0.1, Number(e.target.value)))}
                      className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-white focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Side C for Scalene Triangle, Cyclic Quad, Trapezium */}
              {(params.type === 'scalene_triangle' || params.type === 'cyclic_quadrilateral') && (
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-300">{language === 'hi' ? 'भुजा 3 (Side c)' : 'Side (c)'}</span>
                    <span className="text-indigo-400 font-mono font-bold">{params.sideC || 9} cm</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="0.5"
                      value={params.sideC || 9}
                      onChange={(e) => updateParam('sideC', Number(e.target.value))}
                      className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      value={params.sideC || 9}
                      onChange={(e) => updateParam('sideC', Math.max(0.1, Number(e.target.value)))}
                      className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-white"
                    />
                  </div>
                </div>
              )}

              {/* Side D for Cyclic Quad */}
              {params.type === 'cyclic_quadrilateral' && (
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-300">{language === 'hi' ? 'भुजा 4 (Side d)' : 'Side (d)'}</span>
                    <span className="text-indigo-400 font-mono font-bold">{params.sideD || 5} cm</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="0.5"
                      value={params.sideD || 5}
                      onChange={(e) => updateParam('sideD', Number(e.target.value))}
                      className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      value={params.sideD || 5}
                      onChange={(e) => updateParam('sideD', Math.max(0.1, Number(e.target.value)))}
                      className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-white"
                    />
                  </div>
                </div>
              )}

              {/* Angle Deg Input for Sector, Parallelogram */}
              {(params.type === 'sector' || params.type === 'parallelogram') && (
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-300">
                      {params.type === 'sector'
                        ? language === 'hi' ? 'त्रिज्यखंड कोण (Sector Angle θ)' : 'Sector Angle (θ)'
                        : language === 'hi' ? 'आंतरिक कोण (Angle θ)' : 'Angle (θ)'}
                    </span>
                    <span className="text-amber-400 font-mono font-bold">{params.angleDeg || 60}°</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min="10"
                      max={params.type === 'sector' ? '350' : '150'}
                      step="5"
                      value={params.angleDeg || 60}
                      onChange={(e) => updateParam('angleDeg', Number(e.target.value))}
                      className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="1"
                      max="360"
                      value={params.angleDeg || 60}
                      onChange={(e) => updateParam('angleDeg', Math.max(1, Math.min(360, Number(e.target.value))))}
                      className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-white"
                    />
                  </div>
                </div>
              )}

              {/* Trapezium Height */}
              {params.type === 'trapezium' && (
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-300">{language === 'hi' ? 'लंबवत ऊंचाई (Height h)' : 'Height (h)'}</span>
                    <span className="text-amber-400 font-mono font-bold">{params.height || 5} cm</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.5"
                      value={params.height || 5}
                      onChange={(e) => updateParam('height', Number(e.target.value))}
                      className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      value={params.height || 5}
                      onChange={(e) => updateParam('height', Math.max(0.1, Number(e.target.value)))}
                      className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Derivation Steps & Formulas Card */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-3">
              <button
                onClick={() => setActiveStepTab('steps')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeStepTab === 'steps' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'hi' ? 'हल व गणना (Steps)' : 'Steps'}
              </button>
              <button
                onClick={() => setActiveStepTab('formulas')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeStepTab === 'formulas' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'hi' ? 'सूत्र (Formulas)' : 'Formulas'}
              </button>
              <button
                onClick={() => setActiveStepTab('properties')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeStepTab === 'properties' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'hi' ? 'गुणधर्म (Theorems)' : 'Theorems'}
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1 text-xs">
              {activeStepTab === 'steps' && (
                <div className="space-y-1.5">
                  {(language === 'hi' ? metrics.stepsHi : metrics.stepsEn).map((st, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-slate-200">
                      {st}
                    </div>
                  ))}
                </div>
              )}

              {activeStepTab === 'formulas' && (
                <div className="space-y-1.5">
                  {Object.entries(language === 'hi' ? metrics.formulasHi : metrics.formulasEn).map(([k, v], i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-medium">{k}</span>
                      <span className="text-indigo-300 font-mono font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeStepTab === 'properties' && (
                <div className="space-y-1.5">
                  {(language === 'hi' ? metrics.propertiesHi : metrics.propertiesEn).map((pr, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pr}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
