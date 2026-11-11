export interface OfflineSolution {
  titleHi: string;
  titleEn: string;
  category: string;
  givenData: { labelHi: string; labelEn: string; value: string }[];
  toFindHi?: string;
  toFindEn?: string;
  stepsHi: string[];
  stepsEn: string[];
  finalAnswerHi: string;
  finalAnswerEn: string;
  formulasUsed: string[];
  tipsHi?: string;
  tipsEn?: string;
}

// -------------------------------------------------------------
// Interactive Reverse / Target Math Solver Engine (Preset Solver)
// -------------------------------------------------------------

export interface ReversePresetDef {
  id: string;
  shapeHi: string;
  shapeEn: string;
  category: string;
  targetNameHi: string;
  targetNameEn: string;
  targetSymbol: string;
  unit: string;
  inputs: {
    key: string;
    labelHi: string;
    labelEn: string;
    symbol: string;
    defaultVal: number;
    unit: string;
  }[];
  solve: (vals: Record<string, number>) => OfflineSolution;
}

export const REVERSE_SOLVER_PRESETS: ReversePresetDef[] = [
  // 1. Rectangle: Given Area & Length -> Find Breadth
  {
    id: 'rect_area_len_to_breadth',
    shapeHi: 'आयत (Rectangle)',
    shapeEn: 'Rectangle',
    category: '2D Geometry (क्षेत्रमिति)',
    targetNameHi: 'चौड़ाई (Breadth b)',
    targetNameEn: 'Breadth (b)',
    targetSymbol: 'b',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'area', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', symbol: 'A', defaultVal: 120, unit: 'सेमी² (cm²)' },
      { key: 'length', labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', symbol: 'l', defaultVal: 15, unit: 'सेमी (cm)' },
    ],
    solve: ({ area, length }) => {
      const l = length > 0 ? length : 1;
      const b = area / l;
      const perimeter = 2 * (l + b);
      const diagonal = Math.hypot(l, b);
      return {
        titleHi: `आयत की चौड़ाई ज्ञात करना (क्षेत्रफल A = ${area} सेमी², लंबाई l = ${l} सेमी)`,
        titleEn: `Find Rectangle Breadth (Area = ${area} cm², Length = ${l} cm)`,
        category: '2D Geometry: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${area} सेमी²` },
          { labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} सेमी` },
        ],
        toFindHi: 'चौड़ाई (Breadth b), परिमाप (P) और विकर्ण (d)',
        toFindEn: 'Breadth (b), Perimeter (P) and Diagonal (d)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): आयत का क्षेत्रफल (A) = लंबाई (l) × चौड़ाई (b)`,
          `चरण 2 (मान प्रतिस्थापित करने पर): ${area} = ${l} × b`,
          `चरण 3 (पक्षांतरण करने पर): b = ${area} / ${l}`,
          `चौड़ाई (b) = ${b.toFixed(2)} सेमी`,
          `चरण 4 (अतिरिक्त - परिमाप): P = 2(l + b) = 2(${l} + ${b.toFixed(2)}) = ${perimeter.toFixed(2)} सेमी`,
          `चरण 5 (अतिरिक्त - विकर्ण): d = √(l² + b²) = √(${l}² + ${b.toFixed(2)}²) = √(${((l * l) + (b * b)).toFixed(2)}) = ${diagonal.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Area (A) = Length (l) × Breadth (b)`,
          `Step 2 (Substitution): ${area} = ${l} × b`,
          `Step 3 (Transposition): b = ${area} / ${l} => b = ${b.toFixed(2)} cm`,
          `Step 4 (Perimeter): P = 2(l + b) = 2(${l} + ${b.toFixed(2)}) = ${perimeter.toFixed(2)} cm`,
          `Step 5 (Diagonal): d = √(l² + b²) = √(${l * l} + ${(b * b).toFixed(2)}) = ${diagonal.toFixed(2)} cm`,
        ],
        finalAnswerHi: `चौड़ाई (b) = ${b.toFixed(2)} सेमी | परिमाप = ${perimeter.toFixed(2)} सेमी | विकर्ण = ${diagonal.toFixed(2)} सेमी`,
        finalAnswerEn: `Breadth (b) = ${b.toFixed(2)} cm | Perimeter = ${perimeter.toFixed(2)} cm | Diagonal = ${diagonal.toFixed(2)} cm`,
        formulasUsed: ['b = Area / l', 'P = 2(l + b)', 'd = √(l² + b²)'],
        tipsHi: 'किताब की तरह: हमेशा पहले मानक सूत्र लिखें, फिर मान रखकर अज्ञात राशि (b) को एक तरफ रखकर भाग दें।',
        tipsEn: 'Textbook method: Write the standard formula first, substitute known values, and transpose to isolate the target variable.',
      };
    },
  },

  // 2. Rectangle: Given Perimeter & Length -> Find Breadth
  {
    id: 'rect_perim_len_to_breadth',
    shapeHi: 'आयत (Rectangle)',
    shapeEn: 'Rectangle',
    category: '2D Geometry (क्षेत्रमिति)',
    targetNameHi: 'चौड़ाई व क्षेत्रफल (Breadth & Area)',
    targetNameEn: 'Breadth & Area',
    targetSymbol: 'b, A',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'perimeter', labelHi: 'परिमाप (Perimeter P)', labelEn: 'Perimeter (P)', symbol: 'P', defaultVal: 46, unit: 'सेमी (cm)' },
      { key: 'length', labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', symbol: 'l', defaultVal: 15, unit: 'सेमी (cm)' },
    ],
    solve: ({ perimeter, length }) => {
      const p = perimeter > 0 ? perimeter : 20;
      const l = length > 0 ? length : 5;
      const b = (p / 2) - l;
      const area = l * b;
      return {
        titleHi: `आयत की चौड़ाई व क्षेत्रफल ज्ञात करना (परिमाप P = ${p} सेमी, लंबाई l = ${l} सेमी)`,
        titleEn: `Find Rectangle Breadth & Area (Perimeter = ${p} cm, Length = ${l} cm)`,
        category: '2D Geometry: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'परिमाप (Perimeter P)', labelEn: 'Perimeter (P)', value: `${p} सेमी` },
          { labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} सेमी` },
        ],
        toFindHi: 'चौड़ाई (Breadth b) और क्षेत्रफल (Area A)',
        toFindEn: 'Breadth (b) and Area (A)',
        stepsHi: [
          `चरण 1 (सूत्र): आयत का परिमाप = 2 × (लंबाई + चौड़ाई)`,
          `चरण 2: ${p} = 2 × (${l} + b)`,
          `चरण 3: दोनों पक्षों को 2 से भाग देने पर: (${l} + b) = ${p} / 2 = ${(p / 2).toFixed(2)}`,
          `चरण 4: b = ${(p / 2).toFixed(2)} - ${l} = ${b.toFixed(2)} सेमी`,
          `चरण 5: क्षेत्रफल (A) = l × b = ${l} × ${b.toFixed(2)} = ${area.toFixed(2)} सेमी²`,
        ],
        stepsEn: [
          `Step 1 (Formula): Perimeter (P) = 2 × (l + b)`,
          `Step 2: ${p} = 2 × (${l} + b)`,
          `Step 3: Divide by 2: (l + b) = ${p} / 2 = ${(p / 2).toFixed(2)}`,
          `Step 4: b = ${(p / 2).toFixed(2)} - ${l} = ${b.toFixed(2)} cm`,
          `Step 5: Area (A) = l × b = ${l} × ${b.toFixed(2)} = ${area.toFixed(2)} sq cm`,
        ],
        finalAnswerHi: `चौड़ाई (b) = ${b.toFixed(2)} सेमी | क्षेत्रफल (A) = ${area.toFixed(2)} वर्ग सेमी`,
        finalAnswerEn: `Breadth (b) = ${b.toFixed(2)} cm | Area (A) = ${area.toFixed(2)} sq cm`,
        formulasUsed: ['b = (P / 2) - l', 'Area = l × b'],
      };
    },
  },

  // 3. Square: Given Area -> Find Side, Perimeter & Diagonal
  {
    id: 'square_area_to_side',
    shapeHi: 'वर्ग (Square)',
    shapeEn: 'Square',
    category: '2D Geometry (क्षेत्रमिति)',
    targetNameHi: 'भुजा, परिमाप व विकर्ण (Side, P & d)',
    targetNameEn: 'Side, Perimeter & Diagonal',
    targetSymbol: 'a, P, d',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'area', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', symbol: 'A', defaultVal: 144, unit: 'सेमी² (cm²)' },
    ],
    solve: ({ area }) => {
      const A = Math.max(0.1, area);
      const side = Math.sqrt(A);
      const perimeter = 4 * side;
      const diagonal = side * Math.SQRT2;
      return {
        titleHi: `वर्ग की भुजा, परिमाप व विकर्ण ज्ञात करना (क्षेत्रफल A = ${A} सेमी²)`,
        titleEn: `Find Square Side & Diagonal (Area A = ${A} cm²)`,
        category: '2D Geometry: व्युत्क्रम हल (Reverse Solving)',
        givenData: [{ labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` }],
        toFindHi: 'भुजा (a), परिमाप (P), विकर्ण (d)',
        toFindEn: 'Side (a), Perimeter (P), Diagonal (d)',
        stepsHi: [
          `चरण 1 (सूत्र): वर्ग का क्षेत्रफल (A) = भुजा² (a²)`,
          `चरण 2: ${A} = a²`,
          `चरण 3 (वर्गमूल लेने पर): a = √(${A}) = ${side.toFixed(2)} सेमी`,
          `चरण 4 (परिमाप): P = 4 × a = 4 × ${side.toFixed(2)} = ${perimeter.toFixed(2)} सेमी`,
          `चरण 5 (विकर्ण): d = a × √2 = ${side.toFixed(2)} × 1.4142 = ${diagonal.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Area (A) = a²`,
          `Step 2: ${A} = a²`,
          `Step 3 (Square Root): a = √${A} = ${side.toFixed(2)} cm`,
          `Step 4 (Perimeter): P = 4a = 4 × ${side.toFixed(2)} = ${perimeter.toFixed(2)} cm`,
          `Step 5 (Diagonal): d = a√2 = ${side.toFixed(2)} × 1.4142 = ${diagonal.toFixed(2)} cm`,
        ],
        finalAnswerHi: `भुजा (a) = ${side.toFixed(2)} सेमी | परिमाप (P) = ${perimeter.toFixed(2)} सेमी | विकर्ण (d) = ${diagonal.toFixed(2)} सेमी`,
        finalAnswerEn: `Side (a) = ${side.toFixed(2)} cm | Perimeter (P) = ${perimeter.toFixed(2)} cm | Diagonal (d) = ${diagonal.toFixed(2)} cm`,
        formulasUsed: ['a = √Area', 'P = 4a', 'd = a√2'],
      };
    },
  },

  // 4. Cylinder: Given Volume & Radius -> Find Height
  {
    id: 'cylinder_vol_radius_to_height',
    shapeHi: 'बेलन (Cylinder)',
    shapeEn: 'Cylinder',
    category: '3D Mensuration (त्रिविमीय)',
    targetNameHi: 'ऊंचाई (Height h)',
    targetNameEn: 'Height (h)',
    targetSymbol: 'h',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'volume', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', symbol: 'V', defaultVal: 1540, unit: 'सेमी³ (cm³)' },
      { key: 'radius', labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', symbol: 'r', defaultVal: 7, unit: 'सेमी (cm)' },
    ],
    solve: ({ volume, radius }) => {
      const V = volume > 0 ? volume : 100;
      const r = radius > 0 ? radius : 1;
      const baseArea = Math.PI * r * r;
      const h = V / baseArea;
      const csa = 2 * Math.PI * r * h;
      const tsa = 2 * Math.PI * r * (r + h);
      return {
        titleHi: `बेलन की ऊंचाई ज्ञात करना (आयतन V = ${V} सेमी³, त्रिज्या r = ${r} सेमी)`,
        titleEn: `Find Cylinder Height (Volume V = ${V} cm³, Radius r = ${r} cm)`,
        category: '3D Mensuration: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` },
          { labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', value: `${r} सेमी` },
        ],
        toFindHi: 'ऊंचाई (Height h), वक्र पृष्ठ (CSA), कुल पृष्ठ (TSA)',
        toFindEn: 'Height (h), Curved Surface Area (CSA), Total Surface Area (TSA)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): बेलन का आयतन (V) = π × r² × h`,
          `चरण 2: ${V} = (22/7) × (${r})² × h`,
          `चरण 3: ${V} = (22/7) × ${r * r} × h = ${(Math.PI * r * r).toFixed(2)} × h`,
          `चरण 4 (पक्षांतरण): h = ${V} / (${(Math.PI * r * r).toFixed(2)}) = ${h.toFixed(2)} सेमी`,
          `चरण 5 (वक्र पृष्ठ CSA): CSA = 2 × π × r × h = 2 × (22/7) × ${r} × ${h.toFixed(2)} = ${csa.toFixed(2)} सेमी²`,
          `चरण 6 (कुल पृष्ठ TSA): TSA = 2πr(r + h) = 2 × (22/7) × ${r} × (${r} + ${h.toFixed(2)}) = ${tsa.toFixed(2)} सेमी²`,
        ],
        stepsEn: [
          `Step 1 (Formula): Cylinder Volume (V) = πr²h`,
          `Step 2: ${V} = π × ${r}² × h = ${(Math.PI * r * r).toFixed(2)} × h`,
          `Step 3 (Transposition): h = ${V} / (π × ${r}²) = ${h.toFixed(2)} cm`,
          `Step 4 (CSA): 2πrh = 2 × π × ${r} × ${h.toFixed(2)} = ${csa.toFixed(2)} sq cm`,
          `Step 5 (TSA): 2πr(r + h) = ${tsa.toFixed(2)} sq cm`,
        ],
        finalAnswerHi: `ऊंचाई (h) = ${h.toFixed(2)} सेमी | CSA = ${csa.toFixed(2)} सेमी² | TSA = ${tsa.toFixed(2)} सेमी²`,
        finalAnswerEn: `Height (h) = ${h.toFixed(2)} cm | CSA = ${csa.toFixed(2)} sq cm | TSA = ${tsa.toFixed(2)} sq cm`,
        formulasUsed: ['h = V / (πr²)', 'CSA = 2πrh', 'TSA = 2πr(r + h)'],
      };
    },
  },

  // 5. Cylinder: Given CSA & Radius -> Find Height
  {
    id: 'cylinder_csa_radius_to_height',
    shapeHi: 'बेलन (Cylinder)',
    shapeEn: 'Cylinder',
    category: '3D Mensuration (त्रिविमीय)',
    targetNameHi: 'ऊंचाई व आयतन (Height & Volume)',
    targetNameEn: 'Height & Volume',
    targetSymbol: 'h, V',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'csa', labelHi: 'वक्र पृष्ठ (Curved Surface Area CSA)', labelEn: 'CSA', symbol: 'CSA', defaultVal: 440, unit: 'सेमी² (cm²)' },
      { key: 'radius', labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', symbol: 'r', defaultVal: 7, unit: 'सेमी (cm)' },
    ],
    solve: ({ csa, radius }) => {
      const A = Math.max(1, csa);
      const r = Math.max(0.1, radius);
      const h = A / (2 * Math.PI * r);
      const vol = Math.PI * r * r * h;
      return {
        titleHi: `बेलन की ऊंचाई व आयतन ज्ञात करना (CSA = ${A} सेमी², r = ${r} सेमी)`,
        titleEn: `Find Cylinder Height & Volume (CSA = ${A} cm², Radius = ${r} cm)`,
        category: '3D Mensuration: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'वक्र पृष्ठ (CSA)', labelEn: 'CSA', value: `${A} सेमी²` },
          { labelHi: 'त्रिज्या (r)', labelEn: 'Radius (r)', value: `${r} सेमी` },
        ],
        toFindHi: 'ऊंचाई (h) और आयतन (V)',
        toFindEn: 'Height (h) and Volume (V)',
        stepsHi: [
          `चरण 1 (सूत्र): CSA = 2 × π × r × h`,
          `चरण 2: ${A} = 2 × (22/7) × ${r} × h`,
          `चरण 3: ${A} = ${(2 * Math.PI * r).toFixed(2)} × h`,
          `चरण 4 (पक्षांतरण): h = ${A} / ${(2 * Math.PI * r).toFixed(2)} = ${h.toFixed(2)} सेमी`,
          `चरण 5 (आयतन): V = π × r² × h = (22/7) × ${r}² × ${h.toFixed(2)} = ${vol.toFixed(2)} सेमी³`,
        ],
        stepsEn: [
          `Step 1 (Formula): CSA = 2πrh`,
          `Step 2: ${A} = 2 × π × ${r} × h`,
          `Step 3: h = ${A} / (2πr) = ${h.toFixed(2)} cm`,
          `Step 4: Volume (V) = πr²h = ${vol.toFixed(2)} cu cm`,
        ],
        finalAnswerHi: `ऊंचाई (h) = ${h.toFixed(2)} सेमी | आयतन (V) = ${vol.toFixed(2)} घन सेमी`,
        finalAnswerEn: `Height (h) = ${h.toFixed(2)} cm | Volume (V) = ${vol.toFixed(2)} cu cm`,
        formulasUsed: ['h = CSA / (2πr)', 'V = πr²h'],
      };
    },
  },

  // 6. Cone: Given Volume & Height -> Find Radius & Slant Height
  {
    id: 'cone_vol_height_to_radius',
    shapeHi: 'शंकु (Cone)',
    shapeEn: 'Cone',
    category: '3D Mensuration (त्रिविमीय)',
    targetNameHi: 'त्रिज्या व तिर्यक ऊंचाई (Radius & Slant Height)',
    targetNameEn: 'Radius & Slant Height',
    targetSymbol: 'r, l',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'volume', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', symbol: 'V', defaultVal: 314.16, unit: 'सेमी³ (cm³)' },
      { key: 'height', labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', symbol: 'h', defaultVal: 12, unit: 'सेमी (cm)' },
    ],
    solve: ({ volume, height }) => {
      const V = Math.max(1, volume);
      const h = Math.max(0.1, height);
      const rSquared = (3 * V) / (Math.PI * h);
      const r = Math.sqrt(rSquared);
      const l = Math.hypot(r, h);
      const csa = Math.PI * r * l;
      return {
        titleHi: `शंकु की त्रिज्या व तिर्यक ऊंचाई ज्ञात करना (V = ${V} सेमी³, h = ${h} सेमी)`,
        titleEn: `Find Cone Radius & Slant Height (Volume V = ${V} cm³, Height h = ${h} cm)`,
        category: '3D Mensuration: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` },
          { labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', value: `${h} सेमी` },
        ],
        toFindHi: 'त्रिज्या (r), तिर्यक ऊंचाई (l), वक्र पृष्ठ (CSA)',
        toFindEn: 'Radius (r), Slant Height (l), CSA',
        stepsHi: [
          `चरण 1 (मानक सूत्र): शंकु का आयतन (V) = (1/3) × π × r² × h`,
          `चरण 2: ${V} = (1/3) × π × r² × ${h}`,
          `चरण 3: 3 × ${V} = π × ${h} × r²`,
          `चरण 4: r² = (3 × ${V}) / (π × ${h}) = ${(3 * V).toFixed(2)} / ${(Math.PI * h).toFixed(2)} = ${rSquared.toFixed(2)}`,
          `चरण 5: r = √(${rSquared.toFixed(2)}) = ${r.toFixed(2)} सेमी`,
          `चरण 6 (तिर्यक ऊंचाई l): l = √(r² + h²) = √(${r.toFixed(2)}² + ${h}²) = √(${((r * r) + (h * h)).toFixed(2)}) = ${l.toFixed(2)} सेमी`,
          `चरण 7 (वक्र पृष्ठ CSA): CSA = π × r × l = 3.1416 × ${r.toFixed(2)} × ${l.toFixed(2)} = ${csa.toFixed(2)} सेमी²`,
        ],
        stepsEn: [
          `Step 1 (Formula): Volume (V) = ⅓πr²h`,
          `Step 2: ${V} = ⅓ × π × r² × ${h}`,
          `Step 3: r² = 3V / (πh) = ${(3 * V).toFixed(2)} / ${(Math.PI * h).toFixed(2)} = ${rSquared.toFixed(2)}`,
          `Step 4: r = √(${rSquared.toFixed(2)}) = ${r.toFixed(2)} cm`,
          `Step 5 (Slant Height l): l = √(r² + h²) = ${l.toFixed(2)} cm`,
          `Step 6 (CSA): CSA = πrl = ${csa.toFixed(2)} sq cm`,
        ],
        finalAnswerHi: `त्रिज्या (r) = ${r.toFixed(2)} सेमी | तिर्यक ऊंचाई (l) = ${l.toFixed(2)} सेमी | CSA = ${csa.toFixed(2)} सेमी²`,
        finalAnswerEn: `Radius (r) = ${r.toFixed(2)} cm | Slant Height (l) = ${l.toFixed(2)} cm | CSA = ${csa.toFixed(2)} sq cm`,
        formulasUsed: ['r = √(3V / πh)', 'l = √(r² + h²)', 'CSA = πrl'],
      };
    },
  },

  // 7. Rhombus: Given Area & Diagonal 1 -> Find Diagonal 2, Side & Perimeter
  {
    id: 'rhombus_area_d1_to_d2',
    shapeHi: 'समचतुर्भुज (Rhombus)',
    shapeEn: 'Rhombus',
    category: '2D Quadrilaterals (चतुर्भुज)',
    targetNameHi: 'दूसरा विकर्ण व भुजा (Diagonal 2 & Side)',
    targetNameEn: 'Diagonal 2 & Side',
    targetSymbol: 'd₂, a',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'area', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', symbol: 'A', defaultVal: 96, unit: 'सेमी² (cm²)' },
      { key: 'd1', labelHi: 'पहला विकर्ण (Diagonal d₁)', labelEn: 'Diagonal 1 (d₁)', symbol: 'd₁', defaultVal: 16, unit: 'सेमी (cm)' },
    ],
    solve: ({ area, d1 }) => {
      const A = Math.max(1, area);
      const diag1 = Math.max(0.1, d1);
      const d2 = (2 * A) / diag1;
      const side = 0.5 * Math.hypot(diag1, d2);
      const perimeter = 4 * side;
      return {
        titleHi: `समचतुर्भुज का दूसरा विकर्ण व भुजा ज्ञात करना (A = ${A} सेमी², d₁ = ${diag1} सेमी)`,
        titleEn: `Find Rhombus Diagonal 2 & Side (Area = ${A} cm², d₁ = ${diag1} cm)`,
        category: '2D Quadrilaterals: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` },
          { labelHi: 'पहला विकर्ण (d₁)', labelEn: 'Diagonal 1 (d₁)', value: `${diag1} सेमी` },
        ],
        toFindHi: 'दूसरा विकर्ण (d₂), भुजा (a), परिमाप (P)',
        toFindEn: 'Diagonal 2 (d₂), Side (a), Perimeter (P)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): समचतुर्भुज का क्षेत्रफल = ½ × d₁ × d₂`,
          `चरण 2: ${A} = ½ × ${diag1} × d₂`,
          `चरण 3: ${A} = ${(diag1 / 2).toFixed(2)} × d₂`,
          `चरण 4 (पक्षांतरण): d₂ = (2 × ${A}) / ${diag1} = ${(2 * A).toFixed(2)} / ${diag1} = ${d2.toFixed(2)} सेमी`,
          `चरण 5 (भुजा a): a = ½ × √(d₁² + d₂²) = ½ × √(${diag1}² + ${d2.toFixed(2)}²) = ½ × √(${((diag1 * diag1) + (d2 * d2)).toFixed(2)}) = ${side.toFixed(2)} सेमी`,
          `चरण 6 (परिमाप): P = 4 × a = 4 × ${side.toFixed(2)} = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Area = ½ × d₁ × d₂`,
          `Step 2: ${A} = ½ × ${diag1} × d₂`,
          `Step 3: d₂ = 2A / d₁ = ${(2 * A).toFixed(2)} / ${diag1} = ${d2.toFixed(2)} cm`,
          `Step 4 (Side a): a = ½√(d₁² + d₂²) = ½√(${diag1 * diag1} + ${(d2 * d2).toFixed(2)}) = ${side.toFixed(2)} cm`,
          `Step 5 (Perimeter): P = 4a = ${perimeter.toFixed(2)} cm`,
        ],
        finalAnswerHi: `दूसरा विकर्ण (d₂) = ${d2.toFixed(2)} सेमी | भुजा (a) = ${side.toFixed(2)} सेमी | परिमाप = ${perimeter.toFixed(2)} सेमी`,
        finalAnswerEn: `Diagonal 2 (d₂) = ${d2.toFixed(2)} cm | Side (a) = ${side.toFixed(2)} cm | Perimeter = ${perimeter.toFixed(2)} cm`,
        formulasUsed: ['d₂ = 2A / d₁', 'a = ½√(d₁² + d₂²)', 'P = 4a'],
      };
    },
  },

  // 8. Circle: Given Area -> Find Radius & Circumference
  {
    id: 'circle_area_to_radius',
    shapeHi: 'वृत्त (Circle)',
    shapeEn: 'Circle',
    category: '2D Geometry (क्षेत्रमिति)',
    targetNameHi: 'त्रिज्या, व्यास व परिधि (Radius, d & C)',
    targetNameEn: 'Radius, Diameter & Circumference',
    targetSymbol: 'r, d, C',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'area', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', symbol: 'A', defaultVal: 154, unit: 'सेमी² (cm²)' },
    ],
    solve: ({ area }) => {
      const A = Math.max(0.1, area);
      const r = Math.sqrt(A / Math.PI);
      const d = 2 * r;
      const circumference = 2 * Math.PI * r;
      return {
        titleHi: `वृत्त की त्रिज्या व परिधि ज्ञात करना (क्षेत्रफल A = ${A} सेमी²)`,
        titleEn: `Find Circle Radius & Circumference (Area = ${A} cm²)`,
        category: '2D Geometry: व्युत्क्रम हल (Reverse Solving)',
        givenData: [{ labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` }],
        toFindHi: 'त्रिज्या (r), व्यास (d), परिधि (C)',
        toFindEn: 'Radius (r), Diameter (d), Circumference (C)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): वृत्त का क्षेत्रफल (A) = π × r² = (22/7) × r²`,
          `चरण 2: ${A} = (22/7) × r²`,
          `चरण 3: r² = (${A} × 7) / 22 = ${(A / Math.PI).toFixed(2)}`,
          `चरण 4 (वर्गमूल लेने पर): r = √(${ (A / Math.PI).toFixed(2) }) = ${r.toFixed(2)} सेमी`,
          `चरण 5 (व्यास): d = 2 × r = 2 × ${r.toFixed(2)} = ${d.toFixed(2)} सेमी`,
          `चरण 6 (परिधि): C = 2 × π × r = 2 × (22/7) × ${r.toFixed(2)} = ${circumference.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Area (A) = πr²`,
          `Step 2: ${A} = π × r²`,
          `Step 3: r² = A / π = ${(A / Math.PI).toFixed(2)}`,
          `Step 4: r = √(A / π) = ${r.toFixed(2)} cm`,
          `Step 5: Diameter d = 2r = ${d.toFixed(2)} cm`,
          `Step 6: Circumference C = 2πr = ${circumference.toFixed(2)} cm`,
        ],
        finalAnswerHi: `त्रिज्या (r) = ${r.toFixed(2)} सेमी | व्यास (d) = ${d.toFixed(2)} सेमी | परिधि (C) = ${circumference.toFixed(2)} सेमी`,
        finalAnswerEn: `Radius (r) = ${r.toFixed(2)} cm | Diameter (d) = ${d.toFixed(2)} cm | Circumference = ${circumference.toFixed(2)} cm`,
        formulasUsed: ['r = √(Area / π)', 'Diameter = 2r', 'C = 2πr'],
      };
    },
  },

  // 9. Cube: Given Volume -> Find Side, TSA & Diagonal
  {
    id: 'cube_vol_to_side',
    shapeHi: 'घन (Cube)',
    shapeEn: 'Cube',
    category: '3D Mensuration (त्रिविमीय)',
    targetNameHi: 'भुजा, कुल पृष्ठ व विकर्ण (Side, TSA & Diagonal)',
    targetNameEn: 'Side, TSA & Diagonal',
    targetSymbol: 'a, TSA, d',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'volume', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', symbol: 'V', defaultVal: 512, unit: 'सेमी³ (cm³)' },
    ],
    solve: ({ volume }) => {
      const V = Math.max(0.1, volume);
      const side = Math.cbrt(V);
      const tsa = 6 * side * side;
      const lsa = 4 * side * side;
      const diagonal = side * Math.sqrt(3);
      return {
        titleHi: `घन की भुजा, संपूर्ण पृष्ठ व विकर्ण ज्ञात करना (आयतन V = ${V} सेमी³)`,
        titleEn: `Find Cube Side, TSA & Space Diagonal (Volume = ${V} cm³)`,
        category: '3D Mensuration: व्युत्क्रम हल (Reverse Solving)',
        givenData: [{ labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` }],
        toFindHi: 'भुजा (a), कुल पृष्ठ (TSA), विकर्ण (d)',
        toFindEn: 'Side (a), Total Surface Area (TSA), Space Diagonal (d)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): घन का आयतन (V) = भुजा³ (a³)`,
          `चरण 2: ${V} = a³`,
          `चरण 3 (घनमूल / Cube Root लेने पर): a = ³√(${V}) = ${side.toFixed(2)} सेमी`,
          `चरण 4 (संपूर्ण पृष्ठ क्षेत्रफल TSA): TSA = 6 × a² = 6 × (${side.toFixed(2)})² = 6 × ${(side * side).toFixed(2)} = ${tsa.toFixed(2)} सेमी²`,
          `चरण 5 (वक्र पृष्ठ LSA): LSA = 4 × a² = 4 × ${(side * side).toFixed(2)} = ${lsa.toFixed(2)} सेमी²`,
          `चरण 6 (मुख्य विकर्ण): d = a × √3 = ${side.toFixed(2)} × 1.732 = ${diagonal.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Volume (V) = a³`,
          `Step 2: ${V} = a³`,
          `Step 3: a = ³√${V} = ${side.toFixed(2)} cm`,
          `Step 4: TSA = 6a² = 6 × ${(side * side).toFixed(2)} = ${tsa.toFixed(2)} sq cm`,
          `Step 5: LSA = 4a² = ${lsa.toFixed(2)} sq cm`,
          `Step 6: Space Diagonal = a√3 = ${diagonal.toFixed(2)} cm`,
        ],
        finalAnswerHi: `भुजा (a) = ${side.toFixed(2)} सेमी | संपूर्ण पृष्ठ (TSA) = ${tsa.toFixed(2)} सेमी² | विकर्ण = ${diagonal.toFixed(2)} सेमी`,
        finalAnswerEn: `Side (a) = ${side.toFixed(2)} cm | TSA = ${tsa.toFixed(2)} sq cm | Diagonal = ${diagonal.toFixed(2)} cm`,
        formulasUsed: ['a = ³√Volume', 'TSA = 6a²', 'd = a√3'],
      };
    },
  },

  // 10. Cuboid: Given Volume, Length & Breadth -> Find Height
  {
    id: 'cuboid_vol_lb_to_height',
    shapeHi: 'घनाभ (Cuboid)',
    shapeEn: 'Cuboid',
    category: '3D Mensuration (त्रिविमीय)',
    targetNameHi: 'ऊंचाई व संपूर्ण पृष्ठ (Height & TSA)',
    targetNameEn: 'Height & TSA',
    targetSymbol: 'h, TSA',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'volume', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', symbol: 'V', defaultVal: 720, unit: 'सेमी³ (cm³)' },
      { key: 'length', labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', symbol: 'l', defaultVal: 12, unit: 'सेमी (cm)' },
      { key: 'breadth', labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', symbol: 'b', defaultVal: 10, unit: 'सेमी (cm)' },
    ],
    solve: ({ volume, length, breadth }) => {
      const V = Math.max(1, volume);
      const l = Math.max(0.1, length);
      const b = Math.max(0.1, breadth);
      const baseArea = l * b;
      const h = V / baseArea;
      const tsa = 2 * (l * b + b * h + h * l);
      const diagonal = Math.hypot(l, b, h);
      return {
        titleHi: `घनाभ की ऊंचाई व कुल पृष्ठ ज्ञात करना (V = ${V} सेमी³, l = ${l} सेमी, b = ${b} सेमी)`,
        titleEn: `Find Cuboid Height & TSA (Volume = ${V} cm³, Length = ${l} cm, Breadth = ${b} cm)`,
        category: '3D Mensuration: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` },
          { labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} सेमी` },
          { labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', value: `${b} सेमी` },
        ],
        toFindHi: 'ऊंचाई (h), संपूर्ण पृष्ठ (TSA), विकर्ण (d)',
        toFindEn: 'Height (h), TSA, Diagonal (d)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): घनाभ का आयतन (V) = लंबाई (l) × चौड़ाई (b) × ऊंचाई (h)`,
          `चरण 2: ${V} = ${l} × ${b} × h`,
          `चरण 3: ${V} = ${baseArea.toFixed(2)} × h`,
          `चरण 4 (पक्षांतरण): h = ${V} / ${baseArea.toFixed(2)} = ${h.toFixed(2)} सेमी`,
          `चरण 5 (संपूर्ण पृष्ठ TSA): TSA = 2(lb + bh + hl) = 2(${l * b} + ${(b * h).toFixed(2)} + ${(h * l).toFixed(2)}) = ${tsa.toFixed(2)} सेमी²`,
          `चरण 6 (कमरे का सबसे लंबा बांस / विकर्ण): d = √(l² + b² + h²) = √(${l}² + ${b}² + ${h.toFixed(2)}²) = ${diagonal.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Volume (V) = l × b × h`,
          `Step 2: ${V} = ${l} × ${b} × h = ${baseArea.toFixed(2)} × h`,
          `Step 3: h = V / (l × b) = ${V} / ${baseArea.toFixed(2)} = ${h.toFixed(2)} cm`,
          `Step 4: TSA = 2(lb + bh + hl) = ${tsa.toFixed(2)} sq cm`,
          `Step 5: Longest rod (Diagonal) = √(l² + b² + h²) = ${diagonal.toFixed(2)} cm`,
        ],
        finalAnswerHi: `ऊंचाई (h) = ${h.toFixed(2)} सेमी | कुल पृष्ठ (TSA) = ${tsa.toFixed(2)} सेमी² | विकर्ण = ${diagonal.toFixed(2)} सेमी`,
        finalAnswerEn: `Height (h) = ${h.toFixed(2)} cm | TSA = ${tsa.toFixed(2)} sq cm | Diagonal = ${diagonal.toFixed(2)} cm`,
        formulasUsed: ['h = V / (l × b)', 'TSA = 2(lb + bh + hl)', 'd = √(l² + b² + h²)'],
      };
    },
  },

  // 11. Trapezium: Given Area, Height & Side A -> Find Side B
  {
    id: 'trap_area_h_a_to_b',
    shapeHi: 'समलंब चतुर्भुज (Trapezium)',
    shapeEn: 'Trapezium',
    category: '2D Quadrilaterals (चतुर्भुज)',
    targetNameHi: 'दूसरी समानांतर भुजा (Parallel Side b)',
    targetNameEn: 'Parallel Side (b)',
    targetSymbol: 'b',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'area', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', symbol: 'A', defaultVal: 120, unit: 'सेमी² (cm²)' },
      { key: 'height', labelHi: 'ऊंचाई / लंबवत दूरी (h)', labelEn: 'Height (h)', symbol: 'h', defaultVal: 8, unit: 'सेमी (cm)' },
      { key: 'sideA', labelHi: 'पहली समानांतर भुजा (a)', labelEn: 'Side a', symbol: 'a', defaultVal: 12, unit: 'सेमी (cm)' },
    ],
    solve: ({ area, height, sideA }) => {
      const A = Math.max(1, area);
      const h = Math.max(0.1, height);
      const a = Math.max(0.1, sideA);
      const sumOfSides = (2 * A) / h;
      const b = sumOfSides - a;
      return {
        titleHi: `समलंब की दूसरी भुजा ज्ञात करना (A = ${A} सेमी², h = ${h} सेमी, a = ${a} सेमी)`,
        titleEn: `Find Trapezium Parallel Side b (Area = ${A} cm², h = ${h} cm, a = ${a} cm)`,
        category: '2D Quadrilaterals: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` },
          { labelHi: 'ऊंचाई (h)', labelEn: 'Height (h)', value: `${h} सेमी` },
          { labelHi: 'पहली भुजा (a)', labelEn: 'Side a', value: `${a} सेमी` },
        ],
        toFindHi: 'दूसरी समानांतर भुजा (b) और मध्यिका (Median)',
        toFindEn: 'Parallel Side (b) and Mid-segment (Median)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): समलंब का क्षेत्रफल (A) = ½ × (a + b) × h`,
          `चरण 2: ${A} = ½ × (${a} + b) × ${h}`,
          `चरण 3: 2 × ${A} = (${a} + b) × ${h}`,
          `चरण 4: (${a} + b) = (2 × ${A}) / ${h} = ${(2 * A).toFixed(2)} / ${h} = ${sumOfSides.toFixed(2)}`,
          `चरण 5 (पक्षांतरण): b = ${sumOfSides.toFixed(2)} - ${a} = ${b.toFixed(2)} सेमी`,
          `चरण 6 (मध्यिका): मध्यिका = (a + b) / 2 = ${sumOfSides.toFixed(2)} / 2 = ${(sumOfSides / 2).toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Area = ½(a + b)h`,
          `Step 2: ${A} = ½ × (${a} + b) × ${h}`,
          `Step 3: (a + b) = 2A / h = ${(2 * A).toFixed(2)} / ${h} = ${sumOfSides.toFixed(2)}`,
          `Step 4: b = ${sumOfSides.toFixed(2)} - ${a} = ${b.toFixed(2)} cm`,
          `Step 5: Median = (a + b) / 2 = ${(sumOfSides / 2).toFixed(2)} cm`,
        ],
        finalAnswerHi: `दूसरी समानांतर भुजा (b) = ${b.toFixed(2)} सेमी | मध्यिका = ${(sumOfSides / 2).toFixed(2)} सेमी`,
        finalAnswerEn: `Parallel Side (b) = ${b.toFixed(2)} cm | Median = ${(sumOfSides / 2).toFixed(2)} cm`,
        formulasUsed: ['b = (2A / h) - a', 'Median = (a + b) / 2'],
      };
    },
  },

  // 12. Triangle: Given Area & Base -> Find Height
  {
    id: 'triangle_area_base_to_height',
    shapeHi: 'त्रिभुज (Triangle)',
    shapeEn: 'Triangle',
    category: '2D Geometry (क्षेत्रमिति)',
    targetNameHi: 'ऊंचाई (Height h)',
    targetNameEn: 'Height (h)',
    targetSymbol: 'h',
    unit: 'सेमी (cm)',
    inputs: [
      { key: 'area', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', symbol: 'A', defaultVal: 60, unit: 'सेमी² (cm²)' },
      { key: 'base', labelHi: 'आधार (Base b)', labelEn: 'Base (b)', symbol: 'b', defaultVal: 12, unit: 'सेमी (cm)' },
    ],
    solve: ({ area, base }) => {
      const A = Math.max(1, area);
      const b = Math.max(0.1, base);
      const h = (2 * A) / b;
      return {
        titleHi: `त्रिभुज की ऊंचाई ज्ञात करना (क्षेत्रफल A = ${A} सेमी², आधार b = ${b} सेमी)`,
        titleEn: `Find Triangle Height (Area = ${A} cm², Base = ${b} cm)`,
        category: '2D Geometry: व्युत्क्रम हल (Reverse Solving)',
        givenData: [
          { labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` },
          { labelHi: 'आधार (Base b)', labelEn: 'Base (b)', value: `${b} सेमी` },
        ],
        toFindHi: 'ऊंचाई (Height h)',
        toFindEn: 'Height (h)',
        stepsHi: [
          `चरण 1 (मानक सूत्र): त्रिभुज का क्षेत्रफल = ½ × आधार × ऊंचाई`,
          `चरण 2: ${A} = ½ × ${b} × h`,
          `चरण 3: 2 × ${A} = ${b} × h`,
          `चरण 4: h = (2 × ${A}) / ${b} = ${(2 * A).toFixed(2)} / ${b} = ${h.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Step 1 (Formula): Area = ½ × Base × Height`,
          `Step 2: ${A} = ½ × ${b} × h`,
          `Step 3: h = 2A / b = ${(2 * A).toFixed(2)} / ${b} = ${h.toFixed(2)} cm`,
        ],
        finalAnswerHi: `ऊंचाई (h) = ${h.toFixed(2)} सेमी`,
        finalAnswerEn: `Height (h) = ${h.toFixed(2)} cm`,
        formulasUsed: ['h = 2A / Base'],
      };
    },
  },
];

// -------------------------------------------------------------
// Offline Natural Language Question Parser & Rule-Based Engine
// -------------------------------------------------------------

export function solveMathProblemOffline(rawQuery: string): OfflineSolution {
  const query = rawQuery.toLowerCase().trim();

  // Extract all numbers (integers & decimals)
  const numbers = (rawQuery.match(/(\d+(\.\d+)?)/g) || []).map(Number);

  // Check for Reverse Indicators ("पूछे", "ज्ञात करें", "चौड़ाई क्या होगी", "ऊंचाई क्या होगी", "area diya ho", "volume diya")
  const isReverseIntent =
    query.includes('दिया') ||
    query.includes('given') ||
    query.includes('ज्ञात') ||
    query.includes('निकाले') ||
    query.includes('क्या होगी') ||
    query.includes('क्या होगा') ||
    query.includes('find') ||
    query.includes('calculate') ||
    query.includes('pata');

  // 1. RECTANGLE (आयत)
  if (
    query.includes('आयत') ||
    query.includes('rectangle') ||
    query.includes('aayat') ||
    query.includes('ayata')
  ) {
    // Sub-case A: Area & Length given -> Find Breadth
    if (
      (query.includes('क्षेत्रफल') || query.includes('area')) &&
      (query.includes('चौड़ाई') || query.includes('breadth') || query.includes('width') || query.includes('chaulai') || query.includes('chaurai')) &&
      numbers.length >= 2
    ) {
      const area = Math.max(numbers[0], numbers[1]);
      const length = Math.min(numbers[0], numbers[1]);
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'rect_area_len_to_breadth')!;
      return preset.solve({ area, length });
    }

    // Sub-case B: Perimeter & Length given -> Find Breadth
    if (
      (query.includes('परिमाप') || query.includes('perimeter')) &&
      (query.includes('चौड़ाई') || query.includes('breadth') || query.includes('chaulai')) &&
      numbers.length >= 2
    ) {
      const perimeter = Math.max(numbers[0], numbers[1]);
      const length = Math.min(numbers[0], numbers[1]);
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'rect_perim_len_to_breadth')!;
      return preset.solve({ perimeter, length });
    }

    // Default Forward Rectangle
    const l = numbers[0] || 15;
    const b = numbers[1] || 8;
    const area = l * b;
    const perimeter = 2 * (l + b);
    const d = Math.hypot(l, b);

    return {
      titleHi: `आयत का समाधान (लंबाई l = ${l} सेमी, चौड़ाई b = ${b} सेमी)`,
      titleEn: `Rectangle Solution (Length = ${l} cm, Breadth = ${b} cm)`,
      category: '2D Geometry (द्विविमीय क्षेत्रमिति)',
      givenData: [
        { labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} सेमी` },
        { labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', value: `${b} सेमी` },
      ],
      toFindHi: 'क्षेत्रफल (Area), परिमाप (Perimeter), विकर्ण (Diagonal)',
      toFindEn: 'Area, Perimeter, Diagonal',
      stepsHi: [
        `चरण 1: क्षेत्रफल (Area) = लंबाई × चौड़ाई = ${l} × ${b} = ${area.toFixed(2)} वर्ग सेमी (सेमी²)`,
        `चरण 2: परिमाप (Perimeter) = 2 × (लंबाई + चौड़ाई) = 2 × (${l} + ${b}) = ${perimeter.toFixed(2)} सेमी`,
        `चरण 3: विकर्ण (Diagonal) = √(l² + b²) = √(${l}² + ${b}²) = √(${((l * l) + (b * b)).toFixed(2)}) = ${d.toFixed(2)} सेमी`,
      ],
      stepsEn: [
        `Step 1: Area = l × b = ${l} × ${b} = ${area.toFixed(2)} sq cm`,
        `Step 2: Perimeter = 2(l + b) = 2 × (${l} + ${b}) = ${perimeter.toFixed(2)} cm`,
        `Step 3: Diagonal = √(l² + b²) = √(${l * l + b * b}) = ${d.toFixed(2)} cm`,
      ],
      finalAnswerHi: `क्षेत्रफल = ${area.toFixed(2)} सेमी² | परिमाप = ${perimeter.toFixed(2)} सेमी | विकर्ण = ${d.toFixed(2)} सेमी`,
      finalAnswerEn: `Area = ${area.toFixed(2)} sq cm | Perimeter = ${perimeter.toFixed(2)} cm | Diagonal = ${d.toFixed(2)} cm`,
      formulasUsed: ['Area = l × b', 'Perimeter = 2(l + b)', 'Diagonal = √(l² + b²)'],
    };
  }

  // 2. CYLINDER / BELAN (बेलन)
  if (
    query.includes('बेलन') ||
    query.includes('cylinder') ||
    query.includes('belan')
  ) {
    // Reverse Subcase A: Volume & Radius given -> Find Height
    if (
      (query.includes('आयतन') || query.includes('volume')) &&
      (query.includes('ऊंचाई') || query.includes('height') || query.includes('unchai')) &&
      numbers.length >= 2
    ) {
      const volume = Math.max(numbers[0], numbers[1]);
      const radius = Math.min(numbers[0], numbers[1]);
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'cylinder_vol_radius_to_height')!;
      return preset.solve({ volume, radius });
    }

    // Reverse Subcase B: CSA & Radius given -> Find Height
    if (
      (query.includes('वक्र') || query.includes('csa') || query.includes('surface')) &&
      (query.includes('ऊंचाई') || query.includes('height') || query.includes('unchai')) &&
      numbers.length >= 2
    ) {
      const csa = Math.max(numbers[0], numbers[1]);
      const radius = Math.min(numbers[0], numbers[1]);
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'cylinder_csa_radius_to_height')!;
      return preset.solve({ csa, radius });
    }

    // Default Forward Cylinder
    const r = numbers[0] || 7;
    const h = numbers[1] || 10;
    const vol = Math.PI * r * r * h;
    const csa = 2 * Math.PI * r * h;
    const tsa = 2 * Math.PI * r * (r + h);

    return {
      titleHi: `बेलन का समाधान (त्रिज्या r = ${r} सेमी, ऊंचाई h = ${h} सेमी)`,
      titleEn: `Cylinder Solution (Radius r = ${r} cm, Height h = ${h} cm)`,
      category: '3D Mensuration (त्रिविमीय क्षेत्रमिति)',
      givenData: [
        { labelHi: 'त्रिज्या (r)', labelEn: 'Radius (r)', value: `${r} सेमी` },
        { labelHi: 'ऊंचाई (h)', labelEn: 'Height (h)', value: `${h} सेमी` },
      ],
      toFindHi: 'आयतन (Volume), वक्र पृष्ठ (CSA), कुल पृष्ठ (TSA)',
      toFindEn: 'Volume (V), CSA, TSA',
      stepsHi: [
        `चरण 1: आयतन (Volume) = π × r² × h = (22/7) × ${r}² × ${h} = ${vol.toFixed(2)} घन सेमी (सेमी³)`,
        `चरण 2: वक्र पृष्ठ (CSA) = 2 × π × r × h = 2 × (22/7) × ${r} × ${h} = ${csa.toFixed(2)} वर्ग सेमी (सेमी²)`,
        `चरण 3: कुल पृष्ठ (TSA) = 2 × π × r × (r + h) = 2 × (22/7) × ${r} × (${r} + ${h}) = ${tsa.toFixed(2)} सेमी²`,
      ],
      stepsEn: [
        `Step 1: Volume (V) = πr²h = π × ${r}² × ${h} = ${vol.toFixed(2)} cu cm`,
        `Step 2: Curved Surface Area (CSA) = 2πrh = 2 × π × ${r} × ${h} = ${csa.toFixed(2)} sq cm`,
        `Step 3: Total Surface Area (TSA) = 2πr(r + h) = ${tsa.toFixed(2)} sq cm`,
      ],
      finalAnswerHi: `आयतन = ${vol.toFixed(2)} सेमी³ | CSA = ${csa.toFixed(2)} सेमी² | TSA = ${tsa.toFixed(2)} सेमी²`,
      finalAnswerEn: `Volume = ${vol.toFixed(2)} cu cm | CSA = ${csa.toFixed(2)} sq cm | TSA = ${tsa.toFixed(2)} sq cm`,
      formulasUsed: ['V = π · r² · h', 'CSA = 2 · π · r · h', 'TSA = 2 · π · r · (r + h)'],
    };
  }

  // 3. CONE / SANKU (शंकु)
  if (
    query.includes('शंकु') ||
    query.includes('cone') ||
    query.includes('sanku')
  ) {
    if (
      (query.includes('आयतन') || query.includes('volume')) &&
      (query.includes('त्रिज्या') || query.includes('radius') || query.includes('trijya')) &&
      numbers.length >= 2
    ) {
      const volume = Math.max(numbers[0], numbers[1]);
      const height = Math.min(numbers[0], numbers[1]);
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'cone_vol_height_to_radius')!;
      return preset.solve({ volume, height });
    }

    const r = numbers[0] || 6;
    const h = numbers[1] || 8;
    const l = Math.hypot(r, h);
    const vol = (1 / 3) * Math.PI * r * r * h;
    const csa = Math.PI * r * l;
    const tsa = Math.PI * r * (l + r);

    return {
      titleHi: `शंकु का समाधान (त्रिज्या r = ${r} सेमी, ऊंचाई h = ${h} सेमी)`,
      titleEn: `Cone Solution (Radius r = ${r} cm, Height h = ${h} cm)`,
      category: '3D Mensuration (त्रिविमीय क्षेत्रमिति)',
      givenData: [
        { labelHi: 'त्रिज्या (r)', labelEn: 'Radius (r)', value: `${r} सेमी` },
        { labelHi: 'ऊंचाई (h)', labelEn: 'Height (h)', value: `${h} सेमी` },
      ],
      toFindHi: 'तिर्यक ऊंचाई (l), आयतन (V), CSA, TSA',
      toFindEn: 'Slant Height (l), Volume (V), CSA, TSA',
      stepsHi: [
        `चरण 1: तिर्यक ऊंचाई (Slant Height l) = √(r² + h²) = √(${r}² + ${h}²) = √(${((r * r) + (h * h)).toFixed(2)}) = ${l.toFixed(2)} सेमी`,
        `चरण 2: आयतन (Volume) = (1/3) × π × r² × h = (1/3) × 3.1416 × ${r}² × ${h} = ${vol.toFixed(2)} सेमी³`,
        `चरण 3: वक्र पृष्ठ (CSA) = π × r × l = 3.1416 × ${r} × ${l.toFixed(2)} = ${csa.toFixed(2)} सेमी²`,
        `चरण 4: कुल पृष्ठ (TSA) = π × r × (l + r) = 3.1416 × ${r} × (${l.toFixed(2)} + ${r}) = ${tsa.toFixed(2)} सेमी²`,
      ],
      stepsEn: [
        `Step 1: Slant height (l) = √(r² + h²) = ${l.toFixed(2)} cm`,
        `Step 2: Volume = ⅓πr²h = ${vol.toFixed(2)} cu cm`,
        `Step 3: Curved Surface Area (CSA) = πrl = ${csa.toFixed(2)} sq cm`,
        `Step 4: Total Surface Area (TSA) = πr(l + r) = ${tsa.toFixed(2)} sq cm`,
      ],
      finalAnswerHi: `तिर्यक ऊंचाई = ${l.toFixed(2)} सेमी | आयतन = ${vol.toFixed(2)} सेमी³ | CSA = ${csa.toFixed(2)} सेमी² | TSA = ${tsa.toFixed(2)} सेमी²`,
      finalAnswerEn: `Slant Height = ${l.toFixed(2)} cm | Volume = ${vol.toFixed(2)} cu cm | CSA = ${csa.toFixed(2)} sq cm | TSA = ${tsa.toFixed(2)} sq cm`,
      formulasUsed: ['l = √(r² + h²)', 'V = ⅓ · π · r² · h', 'CSA = π · r · l', 'TSA = π · r · (l + r)'],
    };
  }

  // 4. RHOMBUS (समचतुर्भुज)
  if (
    query.includes('समचतुर्भुज') ||
    query.includes('rhombus') ||
    query.includes('samchaturbhuj')
  ) {
    if (
      (query.includes('क्षेत्रफल') || query.includes('area')) &&
      (query.includes('विकर्ण') || query.includes('diagonal')) &&
      numbers.length >= 2
    ) {
      const area = Math.max(numbers[0], numbers[1]);
      const d1 = Math.min(numbers[0], numbers[1]);
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'rhombus_area_d1_to_d2')!;
      return preset.solve({ area, d1 });
    }

    const d1 = numbers[0] || 16;
    const d2 = numbers[1] || 12;
    const area = 0.5 * d1 * d2;
    const side = 0.5 * Math.hypot(d1, d2);
    const perimeter = 4 * side;
    const h = area / side;

    return {
      titleHi: `समचतुर्भुज का समाधान (विकर्ण d₁ = ${d1} सेमी, d₂ = ${d2} सेमी)`,
      titleEn: `Rhombus Solution (Diagonals d₁ = ${d1} cm, d₂ = ${d2} cm)`,
      category: '2D Quadrilaterals (चतुर्भुज)',
      givenData: [
        { labelHi: 'विकर्ण 1 (d₁)', labelEn: 'Diagonal 1 (d₁)', value: `${d1} सेमी` },
        { labelHi: 'विकर्ण 2 (d₂)', labelEn: 'Diagonal 2 (d₂)', value: `${d2} सेमी` },
      ],
      toFindHi: 'क्षेत्रफल (Area), भुजा (Side a), परिमाप (P), ऊंचाई (h)',
      toFindEn: 'Area, Side (a), Perimeter (P), Altitude (h)',
      stepsHi: [
        `चरण 1: क्षेत्रफल = ½ × d₁ × d₂ = ½ × ${d1} × ${d2} = ${area.toFixed(2)} सेमी²`,
        `चरण 2: भुजा (Side a) = ½ × √(d₁² + d₂²) = ½ × √(${d1 * d1} + ${d2 * d2}) = ${side.toFixed(2)} सेमी`,
        `चरण 3: परिमाप (Perimeter) = 4 × भुजा = 4 × ${side.toFixed(2)} = ${perimeter.toFixed(2)} सेमी`,
        `चरण 4: ऊंचाई (Altitude) = क्षेत्रफल / भुजा = ${area.toFixed(2)} / ${side.toFixed(2)} = ${h.toFixed(2)} सेमी`,
      ],
      stepsEn: [
        `Step 1: Area = ½ × d₁ × d₂ = ${area.toFixed(2)} sq cm`,
        `Step 2: Side (a) = ½√(d₁² + d₂²) = ${side.toFixed(2)} cm`,
        `Step 3: Perimeter = 4a = ${perimeter.toFixed(2)} cm`,
        `Step 4: Altitude (h) = Area / a = ${h.toFixed(2)} cm`,
      ],
      finalAnswerHi: `क्षेत्रफल = ${area.toFixed(2)} सेमी² | भुजा = ${side.toFixed(2)} सेमी | परिमाप = ${perimeter.toFixed(2)} सेमी`,
      finalAnswerEn: `Area = ${area.toFixed(2)} sq cm | Side = ${side.toFixed(2)} cm | Perimeter = ${perimeter.toFixed(2)} cm`,
      formulasUsed: ['Area = ½ · d₁ · d₂', 'Side = ½√(d₁² + d₂²)', 'Perimeter = 4a', '4a² = d₁² + d₂²'],
    };
  }

  // 5. SQUARE (वर्ग)
  if (
    query.includes('वर्ग') ||
    query.includes('square') ||
    query.includes('varg')
  ) {
    if (query.includes('क्षेत्रफल') && numbers.length >= 1 && isReverseIntent) {
      const area = numbers[0];
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'square_area_to_side')!;
      return preset.solve({ area });
    }

    const a = numbers[0] || 8;
    const area = a * a;
    const perimeter = 4 * a;
    const d = a * Math.SQRT2;
    return {
      titleHi: `वर्ग का समाधान (भुजा a = ${a} सेमी)`,
      titleEn: `Square Solution (Side a = ${a} cm)`,
      category: '2D Geometry (द्विविमीय क्षेत्रमिति)',
      givenData: [{ labelHi: 'भुजा (Side a)', labelEn: 'Side (a)', value: `${a} सेमी` }],
      toFindHi: 'क्षेत्रफल (Area), परिमाप (Perimeter), विकर्ण (Diagonal)',
      toFindEn: 'Area, Perimeter, Diagonal',
      stepsHi: [
        `चरण 1: क्षेत्रफल = भुजा² = ${a}² = ${area.toFixed(2)} वर्ग सेमी (सेमी²)`,
        `चरण 2: परिमाप = 4 × भुजा = 4 × ${a} = ${perimeter.toFixed(2)} सेमी`,
        `चरण 3: विकर्ण = भुजा × √2 = ${a} × 1.414 = ${d.toFixed(2)} सेमी`,
      ],
      stepsEn: [
        `Step 1: Area = a² = ${a}² = ${area.toFixed(2)} sq cm`,
        `Step 2: Perimeter = 4a = 4 × ${a} = ${perimeter.toFixed(2)} cm`,
        `Step 3: Diagonal = a√2 = ${a} × 1.414 = ${d.toFixed(2)} cm`,
      ],
      finalAnswerHi: `क्षेत्रफल = ${area.toFixed(2)} सेमी² | परिमाप = ${perimeter.toFixed(2)} सेमी | विकर्ण = ${d.toFixed(2)} सेमी`,
      finalAnswerEn: `Area = ${area.toFixed(2)} sq cm | Perimeter = ${perimeter.toFixed(2)} cm | Diagonal = ${d.toFixed(2)} cm`,
      formulasUsed: ['Area = a²', 'Perimeter = 4a', 'Diagonal = a√2'],
    };
  }

  // 6. CIRCLE (वृत्त)
  if (
    query.includes('वृत्त') ||
    query.includes('circle') ||
    query.includes('vritt')
  ) {
    if (query.includes('क्षेत्रफल') && numbers.length >= 1 && isReverseIntent) {
      const area = numbers[0];
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'circle_area_to_radius')!;
      return preset.solve({ area });
    }

    const r = numbers[0] || 7;
    const area = Math.PI * r * r;
    const circ = 2 * Math.PI * r;
    const d = 2 * r;
    return {
      titleHi: `वृत्त का समाधान (त्रिज्या r = ${r} सेमी)`,
      titleEn: `Circle Solution (Radius r = ${r} cm)`,
      category: '2D Geometry (द्विविमीय क्षेत्रमिति)',
      givenData: [{ labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', value: `${r} सेमी` }],
      toFindHi: 'क्षेत्रफल (Area), परिधि (Circumference), व्यास (Diameter)',
      toFindEn: 'Area, Circumference, Diameter',
      stepsHi: [
        `चरण 1: क्षेत्रफल = π × r² = (22/7) × ${r}² = ${area.toFixed(2)} सेमी²`,
        `चरण 2: परिधि (Circumference) = 2 × π × r = 2 × (22/7) × ${r} = ${circ.toFixed(2)} सेमी`,
        `चरण 3: व्यास (Diameter d) = 2 × r = ${d.toFixed(2)} सेमी`,
      ],
      stepsEn: [
        `Step 1: Area = πr² = ${area.toFixed(2)} sq cm`,
        `Step 2: Circumference = 2πr = ${circ.toFixed(2)} cm`,
        `Step 3: Diameter d = 2r = ${d.toFixed(2)} cm`,
      ],
      finalAnswerHi: `क्षेत्रफल = ${area.toFixed(2)} सेमी² | परिधि = ${circ.toFixed(2)} सेमी | व्यास = ${d.toFixed(2)} सेमी`,
      finalAnswerEn: `Area = ${area.toFixed(2)} sq cm | Circumference = ${circ.toFixed(2)} cm | Diameter = ${d.toFixed(2)} cm`,
      formulasUsed: ['Area = πr²', 'Circumference = 2πr', 'Diameter = 2r'],
    };
  }

  // 7. CUBE (घन)
  if (
    query.includes('घन') &&
    !query.includes('घनाभ') &&
    !query.includes('कट') &&
    !query.includes('रंग')
  ) {
    if (query.includes('आयतन') && numbers.length >= 1 && isReverseIntent) {
      const volume = numbers[0];
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'cube_vol_to_side')!;
      return preset.solve({ volume });
    }

    const a = numbers[0] || 6;
    const vol = a * a * a;
    const tsa = 6 * a * a;
    const lsa = 4 * a * a;
    const d = a * Math.sqrt(3);

    return {
      titleHi: `घन का समाधान (भुजा a = ${a} सेमी)`,
      titleEn: `Cube Solution (Side a = ${a} cm)`,
      category: '3D Mensuration (त्रिविमीय क्षेत्रमिति)',
      givenData: [{ labelHi: 'भुजा (Side a)', labelEn: 'Side (a)', value: `${a} सेमी` }],
      toFindHi: 'आयतन (Volume), संपूर्ण पृष्ठ (TSA), विकर्ण (d)',
      toFindEn: 'Volume, TSA, Diagonal',
      stepsHi: [
        `चरण 1: आयतन (Volume) = a³ = ${a}³ = ${vol.toFixed(2)} सेमी³`,
        `चरण 2: संपूर्ण पृष्ठ (TSA) = 6 × a² = 6 × ${a * a} = ${tsa.toFixed(2)} सेमी²`,
        `चरण 3: वक्र पृष्ठ (LSA) = 4 × a² = 4 × ${a * a} = ${lsa.toFixed(2)} सेमी²`,
        `चरण 4: मुख्य विकर्ण = a√3 = ${a} × 1.732 = ${d.toFixed(2)} सेमी`,
      ],
      stepsEn: [
        `Step 1: Volume = a³ = ${vol.toFixed(2)} cu cm`,
        `Step 2: TSA = 6a² = ${tsa.toFixed(2)} sq cm`,
        `Step 3: LSA = 4a² = ${lsa.toFixed(2)} sq cm`,
        `Step 4: Space Diagonal = a√3 = ${d.toFixed(2)} cm`,
      ],
      finalAnswerHi: `आयतन = ${vol.toFixed(2)} सेमी³ | TSA = ${tsa.toFixed(2)} सेमी² | विकर्ण = ${d.toFixed(2)} सेमी`,
      finalAnswerEn: `Volume = ${vol.toFixed(2)} cu cm | TSA = ${tsa.toFixed(2)} sq cm | Diagonal = ${d.toFixed(2)} cm`,
      formulasUsed: ['V = a³', 'TSA = 6a²', 'LSA = 4a²', 'd = a√3'],
    };
  }

  // 8. CUBOID (घनाभ)
  if (
    query.includes('घनाभ') ||
    query.includes('cuboid') ||
    query.includes('ghanabh')
  ) {
    if (
      (query.includes('आयतन') || query.includes('volume')) &&
      (query.includes('ऊंचाई') || query.includes('height') || query.includes('unchai')) &&
      numbers.length >= 3
    ) {
      const volume = Math.max(...numbers);
      const others = numbers.filter((n) => n !== volume);
      const length = others[0] || 12;
      const breadth = others[1] || 10;
      const preset = REVERSE_SOLVER_PRESETS.find((p) => p.id === 'cuboid_vol_lb_to_height')!;
      return preset.solve({ volume, length, breadth });
    }

    const l = numbers[0] || 12;
    const b = numbers[1] || 8;
    const h = numbers[2] || 6;
    const vol = l * b * h;
    const tsa = 2 * (l * b + b * h + h * l);
    const walls = 2 * h * (l + b);
    const d = Math.hypot(l, b, h);

    return {
      titleHi: `घनाभ का समाधान (l = ${l}, b = ${b}, h = ${h} सेमी)`,
      titleEn: `Cuboid Solution (l = ${l}, b = ${b}, h = ${h} cm)`,
      category: '3D Mensuration (त्रिविमीय क्षेत्रमिति)',
      givenData: [
        { labelHi: 'लंबाई (l)', labelEn: 'Length (l)', value: `${l} सेमी` },
        { labelHi: 'चौड़ाई (b)', labelEn: 'Breadth (b)', value: `${b} सेमी` },
        { labelHi: 'ऊंचाई (h)', labelEn: 'Height (h)', value: `${h} सेमी` },
      ],
      toFindHi: 'आयतन (V), 4 दीवारों का क्षेत्रफल, कुल पृष्ठ (TSA), विकर्ण (d)',
      toFindEn: 'Volume (V), 4 Walls Area, TSA, Diagonal (d)',
      stepsHi: [
        `चरण 1: आयतन = l × b × h = ${l} × ${b} × ${h} = ${vol.toFixed(2)} सेमी³`,
        `चरण 2: 4 दीवारों का क्षेत्रफल = 2h(l + b) = 2 × ${h} × (${l} + ${b}) = ${walls.toFixed(2)} सेमी²`,
        `चरण 3: कुल पृष्ठ (TSA) = 2(lb + bh + hl) = 2(${l * b} + ${b * h} + ${h * l}) = ${tsa.toFixed(2)} सेमी²`,
        `चरण 4: मुख्य विकर्ण = √(l² + b² + h²) = √(${l * l} + ${b * b} + ${h * h}) = ${d.toFixed(2)} सेमी`,
      ],
      stepsEn: [
        `Step 1: Volume = l × b × h = ${vol.toFixed(2)} cu cm`,
        `Step 2: 4 Walls Area = 2h(l + b) = ${walls.toFixed(2)} sq cm`,
        `Step 3: TSA = 2(lb + bh + hl) = ${tsa.toFixed(2)} sq cm`,
        `Step 4: Space Diagonal = √(l² + b² + h²) = ${d.toFixed(2)} cm`,
      ],
      finalAnswerHi: `आयतन = ${vol.toFixed(2)} सेमी³ | TSA = ${tsa.toFixed(2)} सेमी² | विकर्ण = ${d.toFixed(2)} सेमी`,
      finalAnswerEn: `Volume = ${vol.toFixed(2)} cu cm | TSA = ${tsa.toFixed(2)} sq cm | Diagonal = ${d.toFixed(2)} cm`,
      formulasUsed: ['V = l·b·h', '4 Walls = 2h(l + b)', 'TSA = 2(lb+bh+hl)', 'd = √(l²+b²+h²)'],
    };
  }

  // 9. CUBE CUTTING (घन का कटना व रंगना)
  if (
    query.includes('कट') ||
    query.includes('रंग') ||
    query.includes('cube cut') ||
    query.includes('painted') ||
    query.includes('रंगे') ||
    query.includes('सतह')
  ) {
    let n = 4;
    if (numbers.length >= 2 && numbers[0] > numbers[1]) {
      n = Math.round(numbers[0] / numbers[1]); // Big cube side / small cube side
    } else if (numbers.length >= 1) {
      n = Math.min(10, Math.max(2, Math.round(numbers[0])));
    }

    const total = n * n * n;
    const corner = 8;
    const edge = 12 * Math.max(0, n - 2);
    const central = 6 * Math.pow(Math.max(0, n - 2), 2);
    const inner = Math.pow(Math.max(0, n - 2), 3);
    const cuts = 3 * (n - 1);

    return {
      titleHi: `घन काटने और रंगने का रीज़निंग समाधान (n = ${n})`,
      titleEn: `Cube Cutting & Coloring Reasoning Solution (n = ${n})`,
      category: 'Reasoning: Cube Cutting (घन विच्छेदन)',
      givenData: [
        { labelHi: 'n का मान (बड़ी भुजा / छोटी भुजा)', labelEn: 'Value of n (Big Side / Small Side)', value: `${n}` },
      ],
      toFindHi: 'कुल छोटे घन, 3-सतह, 2-सतह, 1-सतह, 0-सतह रंगे घन और कट्स',
      toFindEn: 'Total mini cubes, 3-faces, 2-faces, 1-face, 0-face painted & cuts',
      stepsHi: [
        `चरण 1: कुल छोटे घनों की संख्या = n³ = ${n}³ = ${total}`,
        `चरण 2: कुल आवश्यक कट्स (Total Cuts) = 3 × (n - 1) = 3 × (${n} - 1) = ${cuts} कट्स`,
        `चरण 3: 3 सतह रंगे हुए घन (शीर्ष घन / Corners) = हमेशा 8`,
        `चरण 4: 2 सतह रंगे हुए घन (मध्य घन / Edges) = 12 × (n - 2) = 12 × (${n} - 2) = ${edge}`,
        `चरण 5: 1 सतह रंगे हुए घन (केंद्रीय घन / Faces) = 6 × (n - 2)² = 6 × (${n} - 2)² = ${central}`,
        `चरण 6: 0 सतह रंगे हुए / रंगहीन घन (आंतरिक / Inner) = (n - 2)³ = (${n} - 2)³ = ${inner}`,
        `सत्यापन: 8 + ${edge} + ${central} + ${inner} = ${8 + edge + central + inner} = ${total} (सत्य)`,
      ],
      stepsEn: [
        `Step 1: Total mini cubes = n³ = ${n}³ = ${total}`,
        `Step 2: Total cuts needed = 3(n - 1) = 3 × (${n} - 1) = ${cuts} cuts`,
        `Step 3: 3-Faces painted (Corners) = 8 always`,
        `Step 4: 2-Faces painted (Edges) = 12(n - 2) = 12 × (${n} - 2) = ${edge}`,
        `Step 5: 1-Face painted (Centrals) = 6(n - 2)² = 6 × (${n} - 2)² = ${central}`,
        `Step 6: 0-Faces painted / Colorless (Inner) = (n - 2)³ = ${inner}`,
        `Verification: 8 + ${edge} + ${central} + ${inner} = ${total}`,
      ],
      finalAnswerHi: `कुल = ${total} | 3-सतह = 8 | 2-सतह = ${edge} | 1-सतह = ${central} | रंगहीन = ${inner} | कट्स = ${cuts}`,
      finalAnswerEn: `Total = ${total} | 3-Faces = 8 | 2-Faces = ${edge} | 1-Face = ${central} | 0-Faces = ${inner} | Cuts = ${cuts}`,
      formulasUsed: [
        'Total = n³',
        '3-Faces = 8',
        '2-Faces = 12(n - 2)',
        '1-Face = 6(n - 2)²',
        '0-Faces = (n - 2)³',
        'Cuts = 3(n - 1)',
      ],
    };
  }

  // 10. DICE REASONING (पासा)
  if (
    query.includes('पासा') ||
    query.includes('विपरीत') ||
    query.includes('dice') ||
    query.includes('opposite')
  ) {
    const num = numbers[0] || 3;
    const oppStandard = 7 - num;

    return {
      titleHi: `पासा रीज़निंग समाधान (मानक व सामान्य पासा नियम)`,
      titleEn: `Dice Reasoning Solution (Standard & General Rules)`,
      category: 'Reasoning: Dice (पासा)',
      givenData: [
        { labelHi: 'दी गई सतह (Given Face)', labelEn: 'Given Face', value: `${num}` },
      ],
      toFindHi: 'विपरीत फलक (Opposite Face)',
      toFindEn: 'Opposite Face',
      stepsHi: [
        `नियम 1 (मानक पासा / Standard Dice): विपरीत सतहों का योग हमेशा 7 होता है (Opposite Sum = 7)।`,
        `अतः ${num} के विपरीत = 7 - ${num} = ${oppStandard}`,
        `नियम 2 (सामान्य पासा 1-कॉमन नियम): यदि दो पासों में 1 अंक कॉमन हो, तो उस कॉमन अंक से घड़ी की दिशा (Clockwise) में घूमें।`,
        `नियम 3 (सामान्य पासा 2-कॉमन नियम): यदि दो पासों में 2 अंक समान हों, तो शेष बचे हुए दोनों अंक एक-दूसरे के विपरीत होते हैं।`,
        `नियम 4 (खुला पासा / Open Dice): एक सीधी रेखा में एकांतर सतह (Alternate face, 1 छोड़कर 1) एक-दूसरे के विपरीत होती है।`,
      ],
      stepsEn: [
        `Rule 1 (Standard Dice): Opposite faces always sum to 7. Opposite of ${num} = 7 - ${num} = ${oppStandard}.`,
        `Rule 2 (1-Common Face Rule): When 1 face is common in two views, rotate clockwise from that common face to pair opposites.`,
        `Rule 3 (2-Common Faces Rule): When 2 faces are common, the remaining uncommon faces are strictly opposite to each other.`,
        `Rule 4 (Open Dice Rule): In an unfolded dice, alternate boxes along a straight line are opposite to each other.`,
      ],
      finalAnswerHi: `मानक पासे में ${num} के विपरीत सतह = ${oppStandard}`,
      finalAnswerEn: `In Standard Dice, face opposite to ${num} = ${oppStandard}`,
      formulasUsed: [
        'Standard Dice: A + B = 7',
        'Clockwise Rotation from Common Face',
        'Open Dice: Alternate Boxes are Opposite',
      ],
    };
  }

  // 11. Default Universal Geometry Solver
  const n1 = numbers[0] || 120;
  const n2 = numbers[1] || 15;
  // If user passed rectangle style
  const defaultPreset = REVERSE_SOLVER_PRESETS[0];
  return defaultPreset.solve({ area: n1, length: n2 });
}

// -------------------------------------------------------------
// Offline Cheatsheet & Formula Bank
// -------------------------------------------------------------

export interface FormulaItem {
  nameHi: string;
  nameEn: string;
  category: string;
  formula: string;
  descriptionHi: string;
  descriptionEn: string;
}

export const OFFLINE_FORMULA_BANK: FormulaItem[] = [
  {
    nameHi: 'आयत (Rectangle) - सीधा व व्युत्क्रम',
    nameEn: 'Rectangle (Direct & Reverse)',
    category: '2D Quadrilaterals',
    formula: 'Area = l × b  ⇒  b = Area/l  |  l = Area/b  |  P = 2(l + b)  |  d = √(l² + b²)',
    descriptionHi: 'क्षेत्रफल व लंबाई दी हो तो चौड़ाई = Area / l; परिमाप दिया हो तो b = (P/2) - l।',
    descriptionEn: 'If Area & length are given, breadth = Area / l; if perimeter given, b = (P/2) - l.',
  },
  {
    nameHi: 'वर्ग (Square) - सीधा व व्युत्क्रम',
    nameEn: 'Square (Direct & Reverse)',
    category: '2D Quadrilaterals',
    formula: 'Area = a²  ⇒  a = √Area  |  P = 4a  ⇒  a = P/4  |  d = a√2  ⇒  a = d/√2  |  Area = d²/2',
    descriptionHi: 'क्षेत्रफल से भुजा = √Area; विकर्ण से भुजा = d/√2 व क्षेत्रफल = d²/2।',
    descriptionEn: 'From Area, side = √Area; from diagonal, side = d/√2 & Area = d²/2.',
  },
  {
    nameHi: 'बेलन (Cylinder) - सीधा व व्युत्क्रम',
    nameEn: 'Cylinder (Direct & Reverse)',
    category: '3D Mensuration',
    formula: 'V = πr²h  ⇒  h = V / (πr²)  |  r = √(V / πh)  |  CSA = 2πrh  ⇒  h = CSA / (2πr)',
    descriptionHi: 'आयतन व त्रिज्या दी हो तो ऊंचाई = V/(πr²); CSA दिया हो तो h = CSA/(2πr)।',
    descriptionEn: 'From volume & radius, height = V/(πr²); from CSA, h = CSA/(2πr).',
  },
  {
    nameHi: 'शंकु (Cone) - सीधा व व्युत्क्रम',
    nameEn: 'Cone (Direct & Reverse)',
    category: '3D Mensuration',
    formula: 'V = ⅓πr²h  ⇒  h = 3V / (πr²)  |  r = √(3V / πh)  |  l = √(r² + h²)  |  CSA = πrl',
    descriptionHi: 'आयतन व ऊंचाई से त्रिज्या r = √(3V / πh); तिर्यक ऊंचाई l = √(r² + h²)।',
    descriptionEn: 'From volume & height, r = √(3V / πh); slant height l = √(r² + h²).',
  },
  {
    nameHi: 'समचतुर्भुज (Rhombus) - सीधा व व्युत्क्रम',
    nameEn: 'Rhombus (Direct & Reverse)',
    category: '2D Quadrilaterals',
    formula: 'Area = ½·d₁·d₂  ⇒  d₂ = 2·Area / d₁  |  a = ½√(d₁² + d₂²)  |  P = 4a',
    descriptionHi: 'क्षेत्रफल व एक विकर्ण से दूसरा विकर्ण d₂ = 2A/d₁; भुजा a = ½√(d₁² + d₂²)।',
    descriptionEn: 'From area and 1 diagonal, d₂ = 2A/d₁; side a = ½√(d₁² + d₂²).',
  },
  {
    nameHi: 'समलंब चतुर्भुज (Trapezium)',
    nameEn: 'Trapezium',
    category: '2D Quadrilaterals',
    formula: 'Area = ½(a + b)h  ⇒  b = (2Area / h) - a  |  h = 2Area / (a + b)  |  Median = (a + b)/2',
    descriptionHi: 'क्षेत्रफल व ऊंचाई से दूसरी भुजा b = (2A/h) - a; ऊंचाई h = 2A/(a+b)।',
    descriptionEn: 'From area and height, other parallel side b = (2A/h) - a; height h = 2A/(a+b).',
  },
  {
    nameHi: 'घन (Cube) - सीधा व व्युत्क्रम',
    nameEn: 'Cube (Direct & Reverse)',
    category: '3D Mensuration',
    formula: 'V = a³  ⇒  a = ³√V  |  TSA = 6a²  ⇒  a = √(TSA / 6)  |  d = a√3  ⇒  a = d/√3',
    descriptionHi: 'आयतन से भुजा a = ³√V; कुल पृष्ठ से a = √(TSA/6); विकर्ण से a = d/√3।',
    descriptionEn: 'From volume, side = ³√V; from TSA, side = √(TSA/6); from diagonal, side = d/√3.',
  },
  {
    nameHi: 'घनाभ (Cuboid)',
    nameEn: 'Cuboid',
    category: '3D Mensuration',
    formula: 'V = l·b·h  ⇒  h = V / (l·b)  |  4 Walls = 2h(l + b)  |  TSA = 2(lb+bh+hl)  |  d = √(l²+b²+h²)',
    descriptionHi: 'आयतन से ऊंचाई h = V/(l·b); कमरे की 4 दीवारों का क्षेत्रफल = 2h(l+b)।',
    descriptionEn: 'From volume, height h = V/(l·b); area of 4 walls = 2h(l+b).',
  },
  {
    nameHi: 'वृत्त (Circle) - सीधा व व्युत्क्रम',
    nameEn: 'Circle (Direct & Reverse)',
    category: '2D Geometry',
    formula: 'Area = πr²  ⇒  r = √(Area / π)  |  C = 2πr  ⇒  r = C / (2π)  |  d = 2r',
    descriptionHi: 'क्षेत्रफल से त्रिज्या r = √(A/π); परिधि से r = C/(2π)।',
    descriptionEn: 'From area, radius r = √(A/π); from circumference, r = C/(2π).',
  },
  {
    nameHi: 'घन विच्छेदन (Cube Cutting Reasoning)',
    nameEn: 'Cube Slicing Rules',
    category: 'Reasoning',
    formula: 'Total = n³  ⇒  n = ³√Total  |  3-Faces = 8  |  2-Faces = 12(n-2)  |  1-Face = 6(n-2)²  |  0-Face = (n-2)³  |  Cuts = 3(n-1)',
    descriptionHi: 'कुल छोटे घनों से n = ³√Total; कट्स = 3(n-1)।',
    descriptionEn: 'From total mini cubes, n = ³√Total; cuts = 3(n-1).',
  },
  {
    nameHi: 'पासा नियम (Dice Reasoning Rules)',
    nameEn: 'Dice Rules',
    category: 'Reasoning',
    formula: 'Standard: Opp Sum = 7 (Opp = 7 - Face)  |  1-Common: Clockwise Rule  |  2-Common: Remaining are Opp',
    descriptionHi: 'मानक पासे में विपरीत = 7 - Face; सामान्य पासे में कॉमन से क्लॉकवाइज घूमें।',
    descriptionEn: 'Standard dice opposite = 7 - Face; general dice uses clockwise rotation.',
  },
];
