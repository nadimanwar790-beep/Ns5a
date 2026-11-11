export type ShapeType =
  | 'cylinder'          // बेलन
  | 'hollow_cylinder'   // खोखला बेलन
  | 'wheel'             // पहिया (Wheel / Roller)
  | 'cone'              // शंकु
  | 'cube'              // घन
  | 'cuboid'            // घनाभ
  | 'sphere'            // गोला
  | 'hemisphere'        // अर्धगोला
  | 'frustum'           // छिन्नक
  | 'prism'             // प्रिज्म
  | 'pyramid';          // पिरामिड

export interface ShapeParams {
  type: ShapeType;
  radius: number;         // r (त्रिज्या / आंतरिक त्रिज्या)
  radiusOuter?: number;   // R (बाह्य त्रिज्या for hollow cylinder)
  radiusTop?: number;     // r2 for frustum
  height: number;         // h (ऊंचाई)
  length: number;         // l (लंबाई / आधार)
  width: number;          // b (चौड़ाई)
  slantHeight?: number;   // l (तिर्यक ऊंचाई)
  color: string;
  wireframe: boolean;
  transparent: boolean;
  opacity: number;
  showDimensions: boolean;
  showCrossSection: boolean;
  explodedParts?: number; // 0 (combined) to 1 (fully separated parts)
  showLabels?: boolean;   // 3D labels for individual separated parts
  unrollNet?: boolean;    // unroll curved surface into flat 2D rectangle/sector
  unfoldStep?: number;   // 0 (closed 3D) to max steps (2D net)
  unfoldProgress?: number; // 0 (closed 3D) to 1 (full 2D flat net)
  aspectRatioMode?: 'standard' | '16:9' | 'fullscreen';
}

// 2D Shapes & All Quadrilaterals Types
export type Geometry2DShapeType =
  | 'square'                // वर्ग
  | 'rectangle'             // आयत
  | 'parallelogram'         // समानांतर चतुर्भुज
  | 'rhombus'               // समचतुर्भुज
  | 'trapezium'             // समलंब चतुर्भुज
  | 'kite'                  // पतंग
  | 'cyclic_quadrilateral'  // चक्रीय चतुर्भुज
  | 'equilateral_triangle'  // समबाहु त्रिभुज
  | 'right_triangle'        // समकोण त्रिभुज
  | 'isosceles_triangle'    // समद्विबाहु त्रिभुज
  | 'scalene_triangle'      // विषमबाहु त्रिभुज
  | 'circle'                // वृत्त
  | 'semicircle'            // अर्धवृत्त
  | 'ring'                  // वलय (Annulus)
  | 'sector'                // त्रिज्यखंड
  | 'path_rectangle'        // आयत/वर्ग के चारों ओर या अंदर रास्ता (Pathway Around/Inside)
  | 'path_cross'            // बीचो-बीच समकोण पर परस्पर काटते रास्ते (Cross-Paths in Center)
  | 'path_circle'           // वृत्ताकार रास्ते व वलय (Circular Path / Annulus Track)
  | 'running_track';        // धावन पथ / रनिंग ट्रैक (Athletic Running Track)

export interface Geometry2DParams {
  type: Geometry2DShapeType;
  sideA: number;        // Side a / Length / Base / Outer Radius
  sideB?: number;       // Side b / Breadth / Height / Inner Radius
  sideC?: number;       // Side c (e.g. for triangles/trapezium)
  sideD?: number;       // Side d (for cyclic quad / trapezium)
  diagonal1?: number;   // d1 for rhombus / kite
  diagonal2?: number;   // d2 for rhombus / kite
  angleDeg?: number;    // Angle in degrees (e.g. for parallelogram / sector)
  height?: number;      // Altitude / Height
  pathWidth?: number;   // w (रास्ते की चौड़ाई / Path Width)
  isInnerPath?: boolean;// true if path is inside field, false if outside
  costPerSqUnit?: number; // रास्ते पर फर्श/बजरी/टाइल बिछाने की दर (₹/m²)
  turfCostPerSqUnit?: number; // शेष लॉन/मैदान में घास लगाने की दर (₹/m²)
  fenceCostPerUnit?: number; // चारदीवारी / तारबंदी की दर (₹/m)
  straightLength?: number; // रनिंग ट्रैक के सीधे भाग की लंबाई L
  trackLanes?: number;  // रनिंग ट्रैक में लेनों की संख्या
  showDiagonals: boolean;
  showAngles: boolean;
  showAltitudes: boolean;
  showIncircle: boolean;
  showCircumcircle: boolean;
  color: string;
}

export type CubeFace = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

export interface FaceColors {
  top: string;
  bottom: string;
  front: string;
  back: string;
  left: string;
  right: string;
}

export type MiniCubeType = 'corner' | 'edge' | 'central' | 'inner';

export interface MiniCubeData {
  id: string;
  x: number;
  y: number;
  z: number;
  facesPaintedCount: number;
  paintedFaces: {
    face: CubeFace;
    color: string;
  }[];
  type: MiniCubeType;
  isVisible: boolean;
  isHighlighted: boolean;
}

export interface CubeCutParams {
  isCuboid: boolean;
  n: number;           // for cube (up to 10, i.e., 1000 mini cubes)
  nx: number;          // for cuboid cuts in X (up to 10)
  ny: number;          // for cuboid cuts in Y (up to 10)
  nz: number;          // for cuboid cuts in Z (up to 10)
  dimensionX: number;  // in cm (supports custom large values)
  dimensionY: number;  // in cm
  dimensionZ: number;  // in cm
  faceColors: FaceColors;
  explosion: number;   // 0 to 2.5
  filterType: 'all' | 'corner' | 'edge' | 'central' | 'inner' | 'custom_color' | 'min_painted';
  filterColor?: string;
  filterMinPainted?: number;
  slicePlane: 'none' | 'x' | 'y' | 'z';
  sliceLayer: number;
}

export type ActiveTab =
  | 'cutting_lab'
  | 'shapes_3d'
  | 'geometry_2d'
  | 'dice_reasoning'
  | 'offline_solver'
  | 'quiz_practice';

// Multi-Dice Reasoning Types (up to 4 dice)
export interface SingleDiceView {
  id: number;
  top: number;
  front: number;
  right: number;
  bottom?: number;
  left?: number;
  back?: number;
  labelHi?: string;
  labelEn?: string;
}

export interface Dice3DParams {
  diceList?: SingleDiceView[]; // Supports 1, 2, 3, or 4 dice in 3D
  activeDiceIndex?: number;
  isUnfolded?: boolean;
  unfoldProgress?: number; // 0 to 1
  unfoldStep?: number; // 0 (closed), 1 (top), 2 (bottom), 3 (left), 4 (right), 5 (back / full net)
  stepByStepMode?: boolean;
  diceValues?: [number, number, number, number, number, number]; // legacy single dice [top, bottom, front, back, left, right]
}

export interface QuizQuestion {
  id: string;
  topic: 'cube_cutting' | 'dice_reasoning' | 'mensuration' | 'geometry_2d';
  titleHi: string;
  titleEn: string;
  questionHi: string;
  questionEn: string;
  optionsHi: string[];
  optionsEn: string[];
  correctIndex: number;
  explanationHi: string;
  explanationEn: string;
  formula: string;
  visualParams?: {
    shape?: ShapeType;
    n?: number;
    cuts?: number;
    dimensions?: [number, number, number];
  };
}
