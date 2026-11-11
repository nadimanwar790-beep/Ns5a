import { OfflineSolution } from './mathEngineOffline';

export interface VariableDef {
  key: string;
  symbol: string;
  labelHi: string;
  labelEn: string;
  unitHi: string;
  unitEn: string;
  placeholder?: string;
  isMainTarget?: boolean;
}

export interface QuickExamplePreset {
  nameHi: string;
  nameEn: string;
  values: Record<string, number | null>;
  descriptionHi: string;
  descriptionEn: string;
}

export interface UniversalFormulaModule {
  id: string;
  nameHi: string;
  nameEn: string;
  categoryHi: string;
  categoryEn: string;
  icon: string;
  badge: string;
  mainFormulaText: string;
  descriptionHi: string;
  descriptionEn: string;
  variables: VariableDef[];
  presets: QuickExamplePreset[];
  solve: (inputs: Record<string, number | null | undefined>) => OfflineSolution;
}

// -------------------------------------------------------------
// Universal Formula Modules Registry
// -------------------------------------------------------------

export const UNIVERSAL_FORMULA_MODULES: UniversalFormulaModule[] = [
  // 1. आयत (Rectangle): A, l, b, P, d
  {
    id: 'rectangle',
    nameHi: 'आयत (Rectangle)',
    nameEn: 'Rectangle',
    categoryHi: '2D क्षेत्रमिति (2D Mensuration)',
    categoryEn: '2D Geometry',
    icon: '▭',
    badge: 'A = l × b | P = 2(l+b)',
    mainFormulaText: 'क्षेत्रफल A = l × b | परिमाप P = 2(l + b) | विकर्ण d = √(l² + b²)',
    descriptionHi: 'क्षेत्रफल (A), लंबाई (l), चौड़ाई (b), परिमाप (P), या विकर्ण (d) में से कोई भी 2 मान भरें, बाकी सभी मान अपने आप निकल जाएंगे।',
    descriptionEn: 'Fill any 2 values among Area, Length, Breadth, Perimeter, Diagonal; the remaining values will be calculated automatically.',
    variables: [
      { key: 'area', symbol: 'A', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'length', symbol: 'l', labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'breadth', symbol: 'b', labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'perimeter', symbol: 'P', labelHi: 'परिमाप (Perimeter P)', labelEn: 'Perimeter (P)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'diagonal', symbol: 'd', labelHi: 'विकर्ण (Diagonal d)', labelEn: 'Diagonal (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
    ],
    presets: [
      {
        nameHi: 'A = 120, l = 15 ⇒ चौड़ाई (b) निकालें',
        nameEn: 'A = 120, l = 15 ⇒ Find Breadth (b)',
        values: { area: 120, length: 15, breadth: null, perimeter: null, diagonal: null },
        descriptionHi: 'क्षेत्रफल व लंबाई दी है, चौड़ाई व परिमाप ज्ञात करना।',
        descriptionEn: 'Given Area and Length, find Breadth and Perimeter.',
      },
      {
        nameHi: 'P = 46, l = 15 ⇒ चौड़ाई (b) व A निकालें',
        nameEn: 'P = 46, l = 15 ⇒ Find Breadth & Area',
        values: { area: null, length: 15, breadth: null, perimeter: 46, diagonal: null },
        descriptionHi: 'परिमाप व लंबाई दी है, चौड़ाई व क्षेत्रफल ज्ञात करना।',
        descriptionEn: 'Given Perimeter and Length, find Breadth and Area.',
      },
      {
        nameHi: 'l = 20, b = 10 ⇒ A, P व विकर्ण निकालें',
        nameEn: 'l = 20, b = 10 ⇒ Find A, P & Diagonal',
        values: { area: null, length: 20, breadth: 10, perimeter: null, diagonal: null },
        descriptionHi: 'लंबाई व चौड़ाई दी है, क्षेत्रफल, परिमाप व विकर्ण ज्ञात करना।',
        descriptionEn: 'Given Length and Breadth, calculate Area, Perimeter, and Diagonal.',
      },
      {
        nameHi: 'd = 13, l = 12 ⇒ चौड़ाई (b) व A निकालें',
        nameEn: 'd = 13, l = 12 ⇒ Find Breadth & Area',
        values: { area: null, length: 12, breadth: null, perimeter: null, diagonal: 13 },
        descriptionHi: 'विकर्ण व लंबाई से चौड़ाई व क्षेत्रफल निकालें (पाइथागोरस प्रमेय)।',
        descriptionEn: 'Find breadth and area from diagonal and length using Pythagoras theorem.',
      },
    ],
    solve: (inputs) => {
      const A = inputs.area;
      const l = inputs.length;
      const b = inputs.breadth;
      const P = inputs.perimeter;
      const d = inputs.diagonal;

      let calcL: number | null = null;
      let calcB: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      // Record Givens
      if (A !== null && A !== undefined) givenData.push({ labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` });
      if (l !== null && l !== undefined) givenData.push({ labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} सेमी` });
      if (b !== null && b !== undefined) givenData.push({ labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', value: `${b} सेमी` });
      if (P !== null && P !== undefined) givenData.push({ labelHi: 'परिमाप (Perimeter P)', labelEn: 'Perimeter (P)', value: `${P} सेमी` });
      if (d !== null && d !== undefined) givenData.push({ labelHi: 'विकर्ण (Diagonal d)', labelEn: 'Diagonal (d)', value: `${d} सेमी` });

      if (l && b) {
        calcL = l;
        calcB = b;
        stepsHi.push(`चरण 1 (मानक सूत्र): आयत का क्षेत्रफल (A) = लंबाई (l) × चौड़ाई (b)`);
        stepsHi.push(`चरण 2 (मान रखने पर): A = ${l} × ${b} = ${(l * b).toFixed(2)} सेमी²`);
        stepsEn.push(`Step 1 (Formula): Area (A) = Length (l) × Breadth (b)`);
        stepsEn.push(`Step 2 (Calculation): A = ${l} × ${b} = ${(l * b).toFixed(2)} cm²`);
        formulas.push('A = l × b', 'P = 2(l + b)', 'd = √(l² + b²)');
      } else if (A && l) {
        calcL = l;
        calcB = A / l;
        stepsHi.push(`चरण 1 (मानक सूत्र): क्षेत्रफल (A) = लंबाई (l) × चौड़ाई (b)`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${A} = ${l} × b`);
        stepsHi.push(`चरण 3 (पक्षांतरण द्वारा चौड़ाई b अलग करने पर): b = A / l = ${A} / ${l} = ${calcB.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): Area (A) = Length (l) × Breadth (b)`);
        stepsEn.push(`Step 2 (Substitution): ${A} = ${l} × b`);
        stepsEn.push(`Step 3 (Transposition for b): b = A / l = ${A} / ${l} = ${calcB.toFixed(2)} cm`);
        formulas.push('b = A / l', 'P = 2(l + b)', 'd = √(l² + b²)');
      } else if (A && b) {
        calcB = b;
        calcL = A / b;
        stepsHi.push(`चरण 1 (मानक सूत्र): क्षेत्रफल (A) = लंबाई (l) × चौड़ाई (b)`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${A} = l × ${b}`);
        stepsHi.push(`चरण 3 (पक्षांतरण द्वारा लंबाई l अलग करने पर): l = A / b = ${A} / ${b} = ${calcL.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): Area (A) = Length (l) × Breadth (b)`);
        stepsEn.push(`Step 2 (Substitution): ${A} = l × ${b}`);
        stepsEn.push(`Step 3 (Transposition for l): l = A / b = ${A} / ${b} = ${calcL.toFixed(2)} cm`);
        formulas.push('l = A / b', 'P = 2(l + b)', 'd = √(l² + b²)');
      } else if (P && l) {
        calcL = l;
        calcB = P / 2 - l;
        stepsHi.push(`चरण 1 (मानक सूत्र): परिमाप (P) = 2 × (लंबाई + चौड़ाई)`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${P} = 2 × (${l} + b)`);
        stepsHi.push(`चरण 3 (2 से भाग देने पर): (${l} + b) = ${P} / 2 = ${(P / 2).toFixed(2)}`);
        stepsHi.push(`चरण 4 (पक्षांतरण): b = ${(P / 2).toFixed(2)} - ${l} = ${calcB.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): Perimeter (P) = 2(l + b)`);
        stepsEn.push(`Step 2 (Substitution): ${P} = 2(${l} + b)`);
        stepsEn.push(`Step 3 (Divide by 2): (l + b) = ${P / 2}`);
        stepsEn.push(`Step 4 (Transposition): b = ${P / 2} - ${l} = ${calcB.toFixed(2)} cm`);
        formulas.push('b = (P / 2) - l', 'A = l × b', 'd = √(l² + b²)');
      } else if (P && b) {
        calcB = b;
        calcL = P / 2 - b;
        stepsHi.push(`चरण 1 (मानक सूत्र): परिमाप (P) = 2 × (लंबाई + चौड़ाई)`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${P} = 2 × (l + ${b})`);
        stepsHi.push(`चरण 3 (2 से भाग देने पर): (l + ${b}) = ${P} / 2 = ${(P / 2).toFixed(2)}`);
        stepsHi.push(`चरण 4 (पक्षांतरण): l = ${(P / 2).toFixed(2)} - ${b} = ${calcL.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): Perimeter (P) = 2(l + b)`);
        stepsEn.push(`Step 2 (Substitution): ${P} = 2(l + ${b})`);
        stepsEn.push(`Step 3 (Divide by 2): (l + b) = ${P / 2}`);
        stepsEn.push(`Step 4 (Transposition): l = ${P / 2} - ${b} = ${calcL.toFixed(2)} cm`);
        formulas.push('l = (P / 2) - b', 'A = l × b', 'd = √(l² + b²)');
      } else if (d && l) {
        calcL = l;
        if (d * d >= l * l) {
          calcB = Math.sqrt(d * d - l * l);
          stepsHi.push(`चरण 1 (पाइथागोरस प्रमेय): विकर्ण² (d²) = लंबाई² (l²) + चौड़ाई² (b²)`);
          stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${d}² = ${l}² + b² ⇒ ${d * d} = ${l * l} + b²`);
          stepsHi.push(`चरण 3 (पक्षांतरण): b² = ${d * d} - ${l * l} = ${d * d - l * l}`);
          stepsHi.push(`चरण 4 (वर्गमूल): b = √(${d * d - l * l}) = ${calcB.toFixed(2)} सेमी`);
          stepsEn.push(`Step 1 (Pythagoras): d² = l² + b²`);
          stepsEn.push(`Step 2: ${d}² = ${l}² + b² ⇒ ${d * d} = ${l * l} + b²`);
          stepsEn.push(`Step 3: b = √(${d * d - l * l}) = ${calcB.toFixed(2)} cm`);
          formulas.push('b = √(d² - l²)', 'A = l × b', 'P = 2(l + b)');
        }
      } else if (d && b) {
        calcB = b;
        if (d * d >= b * b) {
          calcL = Math.sqrt(d * d - b * b);
          stepsHi.push(`चरण 1 (पाइथागोरस प्रमेय): d² = l² + b² ⇒ l = √(d² - b²)`);
          stepsHi.push(`चरण 2: l = √(${d}² - ${b}²) = √(${d * d - b * b}) = ${calcL.toFixed(2)} सेमी`);
          stepsEn.push(`Step 1 (Pythagoras): l = √(d² - b²)`);
          stepsEn.push(`Step 2: l = √(${d * d - b * b}) = ${calcL.toFixed(2)} cm`);
          formulas.push('l = √(d² - b²)', 'A = l × b', 'P = 2(l + b)');
        }
      }

      if (calcL !== null && calcB !== null && !isNaN(calcL) && !isNaN(calcB)) {
        const finalArea = calcL * calcB;
        const finalP = 2 * (calcL + calcB);
        const finalD = Math.hypot(calcL, calcB);

        stepsHi.push(`\n[अतिरिक्त गणनाएं]:`);
        stepsHi.push(`• क्षेत्रफल (Area A) = l × b = ${calcL.toFixed(2)} × ${calcB.toFixed(2)} = ${finalArea.toFixed(2)} सेमी²`);
        stepsHi.push(`• परिमाप (Perimeter P) = 2(l + b) = 2(${calcL.toFixed(2)} + ${calcB.toFixed(2)}) = ${finalP.toFixed(2)} सेमी`);
        stepsHi.push(`• विकर्ण (Diagonal d) = √(l² + b²) = √(${calcL.toFixed(2)}² + ${calcB.toFixed(2)}²) = ${finalD.toFixed(2)} सेमी`);

        stepsEn.push(`\n[Derived Parameters]:`);
        stepsEn.push(`• Area = ${finalArea.toFixed(2)} cm²`);
        stepsEn.push(`• Perimeter = ${finalP.toFixed(2)} cm`);
        stepsEn.push(`• Diagonal = ${finalD.toFixed(2)} cm`);

        return {
          titleHi: `आयत का पूर्ण हल (l = ${calcL.toFixed(2)} सेमी, b = ${calcB.toFixed(2)} सेमी)`,
          titleEn: `Complete Rectangle Solution (l = ${calcL.toFixed(2)} cm, b = ${calcB.toFixed(2)} cm)`,
          category: '2D Geometry: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'अज्ञात राशि व शेष सभी माप (Area, Length, Breadth, Perimeter, Diagonal)',
          toFindEn: 'Missing Unknowns and All Derived Properties',
          stepsHi,
          stepsEn,
          finalAnswerHi: `लंबाई (l) = ${calcL.toFixed(2)} सेमी | चौड़ाई (b) = ${calcB.toFixed(2)} सेमी | क्षेत्रफल (A) = ${finalArea.toFixed(2)} सेमी² | परिमाप (P) = ${finalP.toFixed(2)} सेमी | विकर्ण (d) = ${finalD.toFixed(2)} सेमी`,
          finalAnswerEn: `Length = ${calcL.toFixed(2)} cm | Breadth = ${calcB.toFixed(2)} cm | Area = ${finalArea.toFixed(2)} cm² | Perimeter = ${finalP.toFixed(2)} cm | Diagonal = ${finalD.toFixed(2)} cm`,
          formulasUsed: formulas,
          tipsHi: 'किताब का नियम: हमेशा पहले अज्ञात राशि को समीकरण के एक तरफ रखकर पक्षांतरण करें।',
          tipsEn: 'Textbook rule: Always isolate the unknown variable on one side by transposition.',
        };
      }

      return {
        titleHi: 'आयत (Rectangle): मान भरें',
        titleEn: 'Rectangle: Enter Values',
        category: '2D Geometry',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'कम से कम कोई 2 मान भरें (उदा: A व l, या P व b, या l व b)',
        toFindEn: 'Fill at least any 2 values (e.g. A & l, or P & b, or l & b)',
        stepsHi: [
          'कृपया ऊपर दिए गए इनपुट में से कोई भी 2 मान भरें और बाकी खाली छोड़ें।',
          'ऐप छूटे हुए अज्ञात मान को सूत्र लगाकर तुरंत निकाल देगा!',
        ],
        stepsEn: [
          'Please fill any 2 parameters above and leave the rest blank.',
          'The app will automatically calculate the missing unknown values with textbook steps!',
        ],
        finalAnswerHi: 'कृपया 2 मान भरें या नीचे दिए गए क्विक प्रीसेट बटन पर क्लिक करें।',
        finalAnswerEn: 'Please enter 2 values or click a quick preset button below.',
        formulasUsed: ['A = l × b', 'P = 2(l + b)', 'd = √(l² + b²)'],
      };
    },
  },

  // 1B. आयत व वर्ग के रास्ते (Pathways Around/Inside Rectangle & Square)
  {
    id: 'path_rectangle',
    nameHi: 'आयत व वर्ग के रास्ते (Path Around / Inside)',
    nameEn: 'Rectangle & Square Pathways',
    categoryHi: '2D क्षेत्रमिति (2D Mensuration)',
    categoryEn: '2D Geometry',
    icon: '🛣️',
    badge: 'A_path = 2w(l+b±2w)',
    mainFormulaText: 'बाहरी रास्ता A = 2w(l + b + 2w) | भीतरी रास्ता A = 2w(l + b - 2w) | वर्ग का रास्ता = 4w(a ± w)',
    descriptionHi: 'मैदान की लंबाई (l), चौड़ाई (b), रास्ते की चौड़ाई (w), स्थिति (0=बाहर, 1=अंदर), रास्ते का क्षेत्रफल (A_path), या दर (₹/मी²) भरें।',
    descriptionEn: 'Enter field length, breadth, path width, position (0=outside, 1=inside), path area, or paving rate.',
    variables: [
      { key: 'length', symbol: 'l', labelHi: 'मैदान की लंबाई (Length l)', labelEn: 'Field Length (l)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'breadth', symbol: 'b', labelHi: 'मैदान की चौड़ाई (Breadth b / Side a)', labelEn: 'Field Breadth (b)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'pathWidth', symbol: 'w', labelHi: 'रास्ते की चौड़ाई (Path Width w)', labelEn: 'Path Width (w)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'isInside', symbol: 'Pos', labelHi: 'स्थिति (0=बाहर, 1=अंदर)', labelEn: 'Type (0=Outside, 1=Inside)', unitHi: '0 / 1', unitEn: '0 / 1' },
      { key: 'pathArea', symbol: 'A_p', labelHi: 'रास्ते का क्षेत्रफल (Path Area)', labelEn: 'Path Area (A_p)', unitHi: 'मी² (m²)', unitEn: 'sq m' },
      { key: 'ratePaving', symbol: 'Rate', labelHi: 'रास्ते की लागत दर (Rate ₹/m²)', labelEn: 'Paving Rate (₹/m²)', unitHi: '₹/मी²', unitEn: '₹/sq m' },
    ],
    presets: [
      {
        nameHi: 'l = 45m, b = 30m, w = 2.5m (बाहर) ⇒ रास्ता व ₹15/मी² पर खर्च',
        nameEn: 'l = 45m, b = 30m, w = 2.5m (Outside) ⇒ Area & Cost @ ₹15/m²',
        values: { length: 45, breadth: 30, pathWidth: 2.5, isInside: 0, pathArea: null, ratePaving: 15 },
        descriptionHi: '45m × 30m मैदान के चारों ओर 2.5m चौड़े बाहरी रास्ते का क्षेत्रफल व लागत।',
        descriptionEn: 'Area and cost of 2.5m wide outside path around 45m × 30m field.',
      },
      {
        nameHi: 'l = 60m, b = 40m, w = 3m (अंदर) ⇒ रास्ता व भीतरी लॉन',
        nameEn: 'l = 60m, b = 40m, w = 3m (Inside) ⇒ Path & Lawn Area',
        values: { length: 60, breadth: 40, pathWidth: 3, isInside: 1, pathArea: null, ratePaving: 20 },
        descriptionHi: '60m × 40m मैदान के अंदर की ओर 3m चौड़े रास्ते का क्षेत्रफल व शेष लॉन।',
        descriptionEn: 'Area of 3m wide inside path and remaining lawn in 60m × 40m field.',
      },
      {
        nameHi: 'वर्ग a = 30m, w = 2m (बाहर) ⇒ रास्ते का क्षेत्रफल',
        nameEn: 'Square a = 30m, w = 2m (Outside) ⇒ Path Area',
        values: { length: 30, breadth: 30, pathWidth: 2, isInside: 0, pathArea: null, ratePaving: null },
        descriptionHi: '30m भुजा वाले वर्गाकार पार्क के बाहर 2m रास्ते का क्षेत्रफल (4w(a+w))।',
        descriptionEn: 'Square park 30m with 2m outside path.',
      },
      {
        nameHi: 'l = 50m, b = 40m, A_path = 576m² ⇒ रास्ते की चौड़ाई (w) निकालें',
        nameEn: 'l = 50m, b = 40m, A_path = 576m² ⇒ Find Path Width (w)',
        values: { length: 50, breadth: 40, pathWidth: null, isInside: 0, pathArea: 576, ratePaving: null },
        descriptionHi: 'रास्ते का क्षेत्रफल 576m² दिया है, रास्ते की चौड़ाई w ज्ञात करना।',
        descriptionEn: 'Given path area 576 sq m, find path width w.',
      },
    ],
    solve: (inputs) => {
      const l = inputs.length;
      const b = inputs.breadth || inputs.length; // defaults to square if breadth not given
      let w = inputs.pathWidth;
      const isInside = inputs.isInside === 1;
      let pathArea = inputs.pathArea;
      const rate = inputs.ratePaving ?? 15;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (l !== null && l !== undefined) givenData.push({ labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} मी` });
      if (b !== null && b !== undefined) givenData.push({ labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', value: `${b} मी` });
      if (w !== null && w !== undefined) givenData.push({ labelHi: 'रास्ते की चौड़ाई (w)', labelEn: 'Path Width (w)', value: `${w} मी` });
      givenData.push({ labelHi: 'रास्ते की स्थिति', labelEn: 'Position', value: isInside ? 'अंदर की ओर (Inside)' : 'बाहर की ओर (Outside)' });
      if (pathArea !== null && pathArea !== undefined) givenData.push({ labelHi: 'रास्ते का क्षेत्रफल', labelEn: 'Path Area', value: `${pathArea} मी²` });
      if (inputs.ratePaving) givenData.push({ labelHi: 'दर (Rate)', labelEn: 'Rate', value: `₹${inputs.ratePaving}/मी²` });

      // Case 1: Given l, b, pathArea and need to find w (Quadratic equation solving)
      if (l && b && pathArea && (w === null || w === undefined)) {
        if (!isInside) {
          // 4w^2 + 2(l+b)w - pathArea = 0
          const A_quad = 4;
          const B_quad = 2 * (l + b);
          const C_quad = -pathArea;
          const disc = B_quad * B_quad - 4 * A_quad * C_quad;
          if (disc >= 0) {
            w = (-B_quad + Math.sqrt(disc)) / (2 * A_quad);
            stepsHi.push(`चरण 1: बाहरी रास्ते का सूत्र: A = 2w(l + b + 2w) = 4w² + 2(l + b)w`);
            stepsHi.push(`चरण 2: मान रखने पर: 4w² + 2(${l} + ${b})w = ${pathArea} ⇒ 4w² + ${2 * (l + b)}w - ${pathArea} = 0`);
            stepsHi.push(`चरण 3 (द्विघात सूत्र): w = [-B ± √(B² - 4AC)] / 2A`);
            stepsHi.push(`चरण 4: w = [ -${B_quad} + √(${B_quad * B_quad} - 4(4)(${C_quad})) ] / 8 = ${w.toFixed(2)} मी`);
            stepsEn.push(`Step 1: Formula: A_path = 4w² + 2(l + b)w`);
            stepsEn.push(`Step 2: 4w² + ${2 * (l + b)}w - ${pathArea} = 0`);
            stepsEn.push(`Step 3: Solving quadratic equation gives w = ${w.toFixed(2)} m`);
            formulas.push('4w² + 2(l+b)w - A = 0', 'w = [-b + √(b²-4ac)] / 2a');
          }
        } else {
          // Inside: 4w^2 - 2(l+b)w + pathArea = 0
          const A_quad = 4;
          const B_quad = -2 * (l + b);
          const C_quad = pathArea;
          const disc = B_quad * B_quad - 4 * A_quad * C_quad;
          if (disc >= 0) {
            w = (-B_quad - Math.sqrt(disc)) / (2 * A_quad);
            stepsHi.push(`चरण 1: भीतरी रास्ते का सूत्र: A = 2w(l + b - 2w) = 2(l + b)w - 4w²`);
            stepsHi.push(`चरण 2: 4w² - ${2 * (l + b)}w + ${pathArea} = 0`);
            stepsHi.push(`चरण 3: द्विघात हल करने पर: w = ${w.toFixed(2)} मी`);
            stepsEn.push(`Step 1: Formula: 4w² - 2(l + b)w + A_path = 0`);
            stepsEn.push(`Step 2: Solving quadratic equation gives w = ${w.toFixed(2)} m`);
            formulas.push('4w² - 2(l+b)w + A = 0');
          }
        }
      }

      // Case 2: Given l, b, w -> calculate everything
      if (l && b && w !== null && w !== undefined && w > 0) {
        let outerL = 0;
        let outerB = 0;
        let innerL = 0;
        let innerB = 0;

        if (!isInside) {
          innerL = l;
          innerB = b;
          outerL = l + 2 * w;
          outerB = b + 2 * w;
          const outerA = outerL * outerB;
          const innerA = innerL * innerB;
          pathArea = outerA - innerA;

          stepsHi.push(`चरण 1 (बाहरी विमाएं): रास्ते सहित बाहरी लंबाई L = ${l} + 2(${w}) = ${outerL} मी, चौड़ाई B = ${b} + 2(${w}) = ${outerB} मी`);
          stepsHi.push(`चरण 2 (क्षेत्रफल गणना):`);
          stepsHi.push(`• बाहरी कुल क्षेत्रफल = ${outerL} × ${outerB} = ${outerA.toFixed(2)} मी²`);
          stepsHi.push(`• भीतरी मूल मैदान = ${innerL} × ${innerB} = ${innerA.toFixed(2)} मी²`);
          stepsHi.push(`चरण 3 (रास्ते का क्षेत्रफल): A = बाहरी क्षेत्रफल - भीतरी क्षेत्रफल = ${outerA.toFixed(2)} - ${innerA.toFixed(2)} = ${pathArea.toFixed(2)} मी²`);
          stepsHi.push(`शॉर्टकट सूत्र: 2w(l + b + 2w) = 2(${w}) × (${l} + ${b} + 2(${w})) = ${pathArea.toFixed(2)} मी²`);

          stepsEn.push(`Step 1 (Outer Dimensions): L = ${l} + 2(${w}) = ${outerL} m, B = ${b} + 2(${w}) = ${outerB} m`);
          stepsEn.push(`Step 2: Outer Area = ${outerL} × ${outerB} = ${outerA.toFixed(2)} sq m, Inner Field = ${innerL} × ${innerB} = ${innerA.toFixed(2)} sq m`);
          stepsEn.push(`Step 3: Path Area = Outer Area - Inner Area = ${pathArea.toFixed(2)} sq m`);
          stepsEn.push(`Direct Shortcut: 2w(l + b + 2w) = ${pathArea.toFixed(2)} m²`);
          formulas.push('A_outside = 2w(l + b + 2w)', 'L = l + 2w', 'B = b + 2w');
        } else {
          outerL = l;
          outerB = b;
          innerL = Math.max(0, l - 2 * w);
          innerB = Math.max(0, b - 2 * w);
          const outerA = outerL * outerB;
          const innerA = innerL * innerB;
          pathArea = outerA - innerA;

          stepsHi.push(`चरण 1 (भीतरी लॉन की विमाएं): l' = ${l} - 2(${w}) = ${innerL} मी, b' = ${b} - 2(${w}) = ${innerB} मी`);
          stepsHi.push(`चरण 2 (क्षेत्रफल गणना):`);
          stepsHi.push(`• मूल मैदान का क्षेत्रफल = ${outerL} × ${outerB} = ${outerA.toFixed(2)} मी²`);
          stepsHi.push(`• भीतरी लॉन का क्षेत्रफल = ${innerL} × ${innerB} = ${innerA.toFixed(2)} मी²`);
          stepsHi.push(`चरण 3 (रास्ते का क्षेत्रफल): A = कुल क्षेत्रफल - लॉन का क्षेत्रफल = ${outerA.toFixed(2)} - ${innerA.toFixed(2)} = ${pathArea.toFixed(2)} मी²`);
          stepsHi.push(`शॉर्टकट सूत्र: 2w(l + b - 2w) = 2(${w}) × (${l} + ${b} - 2(${w})) = ${pathArea.toFixed(2)} मी²`);

          stepsEn.push(`Step 1 (Inner Lawn Dimensions): l' = ${l} - 2(${w}) = ${innerL} m, b' = ${b} - 2(${w}) = ${innerB} m`);
          stepsEn.push(`Step 2: Field Area = ${outerL} × ${outerB} = ${outerA.toFixed(2)} sq m, Lawn Area = ${innerL} × ${innerB} = ${innerA.toFixed(2)} sq m`);
          stepsEn.push(`Step 3: Path Area = Field Area - Lawn Area = ${pathArea.toFixed(2)} sq m`);
          stepsEn.push(`Direct Shortcut: 2w(l + b - 2w) = ${pathArea.toFixed(2)} m²`);
          formulas.push('A_inside = 2w(l + b - 2w)', 'l\' = l - 2w', 'b\' = b - 2w');
        }

        const totalCost = pathArea * rate;
        const outerPerimeter = 2 * (outerL + outerB);
        const innerPerimeter = 2 * (innerL + innerB);

        stepsHi.push(`\n[लागत एवं बाउंड्री खर्च]:`);
        stepsHi.push(`• रास्ते पर टाइल/फर्श बिछाने का खर्च (@ ₹${rate}/मी²) = ${pathArea.toFixed(2)} × ${rate} = ₹${totalCost.toFixed(2)}`);
        stepsHi.push(`• बाहरी बाउंड्री परिमाप = 2(${outerL} + ${outerB}) = ${outerPerimeter.toFixed(2)} मी`);
        stepsHi.push(`• भीतरी बाउंड्री परिमाप = 2(${innerL} + ${innerB}) = ${innerPerimeter.toFixed(2)} मी`);

        stepsEn.push(`\n[Cost & Boundary]:`);
        stepsEn.push(`• Paving Cost (@ ₹${rate}/sq m) = ${pathArea.toFixed(2)} × ${rate} = ₹${totalCost.toFixed(2)}`);
        stepsEn.push(`• Outer Perimeter = ${outerPerimeter.toFixed(2)} m`);
        stepsEn.push(`• Inner Perimeter = ${innerPerimeter.toFixed(2)} m`);

        return {
          titleHi: `रास्ते का संपूर्ण हल (${isInside ? 'भीतरी रास्ता' : 'बाहरी रास्ता'}, चौड़ाई = ${w.toFixed(2)} मी)`,
          titleEn: `Pathway Complete Solution (${isInside ? 'Inside Path' : 'Outside Path'}, Width = ${w.toFixed(2)} m)`,
          category: '2D Mensuration: रास्ते एवं लॉन',
          givenData,
          toFindHi: 'रास्ते का क्षेत्रफल, चौड़ाई व कुल लागत',
          toFindEn: 'Path Area, Width, and Total Cost',
          stepsHi,
          stepsEn,
          finalAnswerHi: `रास्ते का क्षेत्रफल = ${pathArea.toFixed(2)} वर्ग मीटर | रास्ते की चौड़ाई = ${w.toFixed(2)} मी | लागत (@ ₹${rate}/मी²) = ₹${totalCost.toFixed(2)}`,
          finalAnswerEn: `Path Area = ${pathArea.toFixed(2)} sq m | Path Width = ${w.toFixed(2)} m | Cost (@ ₹${rate}/m²) = ₹${totalCost.toFixed(2)}`,
          formulasUsed: formulas,
          tipsHi: 'याद रखें: बाहरी रास्ते में 2w जुड़ता है: 2w(l+b+2w); भीतरी रास्ते में 2w घटता है: 2w(l+b-2w)।',
          tipsEn: 'Remember: Outside path adds 2w: 2w(l+b+2w); Inside path subtracts 2w: 2w(l+b-2w).',
        };
      }

      return {
        titleHi: 'आयत/वर्ग का रास्ता: मान भरें',
        titleEn: 'Pathways: Enter Values',
        category: '2D Mensuration',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'मान भरें' }],
        toFindHi: 'लंबाई l, चौड़ाई b व रास्ते की चौड़ाई w भरें',
        toFindEn: 'Enter Length l, Breadth b and Path Width w',
        stepsHi: ['कृपया मैदान की लंबाई, चौड़ाई और रास्ते की चौड़ाई भरें या क्विक प्रीसेट चुनें।'],
        stepsEn: ['Please enter field dimensions and path width or choose a preset.'],
        finalAnswerHi: 'कृपया मान भरें।',
        finalAnswerEn: 'Please enter values.',
        formulasUsed: ['A_outside = 2w(l + b + 2w)', 'A_inside = 2w(l + b - 2w)'],
      };
    },
  },

  // 1C. बीचो-बीच समकोण पर काटते रास्ते (Cross-Paths / Crossroads in Center)
  {
    id: 'path_cross',
    nameHi: 'बीचो-बीच क्रॉस रास्ते (Crossroads in Center)',
    nameEn: 'Crossroads in Center',
    categoryHi: '2D क्षेत्रमिति (2D Mensuration)',
    categoryEn: '2D Geometry',
    icon: '➕',
    badge: 'A_cross = w(l + b - w)',
    mainFormulaText: 'क्रॉस रास्ते का क्षेत्रफल A = w(l + b - w) | शेष 4 लॉन का क्षेत्रफल = (l - w)(b - w)',
    descriptionHi: 'आयताकार/वर्गाकार मैदान के बीचो-बीच परस्पर समकोण पर काटती सड़कों का क्षेत्रफल व लॉन की लागत।',
    descriptionEn: 'Area of 2 perpendicular intersecting roads in the middle and remaining lawn area.',
    variables: [
      { key: 'length', symbol: 'l', labelHi: 'मैदान की लंबाई (Length l)', labelEn: 'Field Length (l)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'breadth', symbol: 'b', labelHi: 'मैदान की चौड़ाई (Breadth b)', labelEn: 'Field Breadth (b)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'pathWidth', symbol: 'w', labelHi: 'रास्ते की चौड़ाई (Road Width w)', labelEn: 'Road Width (w)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'pathArea', symbol: 'A_c', labelHi: 'क्रॉस रास्ते का क्षेत्रफल', labelEn: 'Crossroads Area', unitHi: 'मी² (m²)', unitEn: 'sq m' },
      { key: 'lawnArea', symbol: 'A_lawn', labelHi: 'शेष 4 लॉन का कुल क्षेत्रफल', labelEn: 'Remaining Lawn Area', unitHi: 'मी² (m²)', unitEn: 'sq m' },
      { key: 'ratePaving', symbol: 'Rate', labelHi: 'सड़क लागत दर (₹/m²)', labelEn: 'Paving Rate (₹/m²)', unitHi: '₹/मी²', unitEn: '₹/sq m' },
    ],
    presets: [
      {
        nameHi: 'l = 70m, b = 50m, w = 5m ⇒ क्रॉस सड़कें व लॉन का क्षेत्रफल',
        nameEn: 'l = 70m, b = 50m, w = 5m ⇒ Crossroads & Lawn Area',
        values: { length: 70, breadth: 50, pathWidth: 5, pathArea: null, lawnArea: null, ratePaving: 20 },
        descriptionHi: '70m × 50m मैदान में बीचो-बीच 5m चौड़ी दो परस्पर काटती सड़कें।',
        descriptionEn: 'Two 5m cross roads in 70m × 50m park.',
      },
      {
        nameHi: 'l = 80m, b = 60m, w = 4m ⇒ सड़क खर्च @ ₹25/मी²',
        nameEn: 'l = 80m, b = 60m, w = 4m ⇒ Cost @ ₹25/m²',
        values: { length: 80, breadth: 60, pathWidth: 4, pathArea: null, lawnArea: null, ratePaving: 25 },
        descriptionHi: '80m × 60m मैदान में 4m चौड़े क्रॉस रास्ते पर बजरी बिछाने का खर्च।',
        descriptionEn: 'Paving cost of 4m crossroads in 80m × 60m field.',
      },
      {
        nameHi: 'वर्ग a = 60m, w = 3m ⇒ क्रॉस रास्ता व 4 लॉन',
        nameEn: 'Square a = 60m, w = 3m ⇒ Cross Roads & 4 Lawns',
        values: { length: 60, breadth: 60, pathWidth: 3, pathArea: null, lawnArea: null, ratePaving: null },
        descriptionHi: '60m भुजा वाले वर्गाकार मैदान में बीचो-बीच 3m चौड़ी क्रॉस सड़कें।',
        descriptionEn: '3m crossroads in 60m square field.',
      },
    ],
    solve: (inputs) => {
      const l = inputs.length;
      const b = inputs.breadth || inputs.length;
      const w = inputs.pathWidth;
      const rate = inputs.ratePaving ?? 20;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (l) givenData.push({ labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} मी` });
      if (b) givenData.push({ labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', value: `${b} मी` });
      if (w) givenData.push({ labelHi: 'सड़क की चौड़ाई (w)', labelEn: 'Road Width (w)', value: `${w} मी` });
      if (inputs.ratePaving) givenData.push({ labelHi: 'दर (Rate)', labelEn: 'Rate', value: `₹${inputs.ratePaving}/मी²` });

      if (l && b && w) {
        const areaRoadL = l * w;
        const areaRoadB = b * w;
        const areaSquareCommon = w * w;
        const crossArea = areaRoadL + areaRoadB - areaSquareCommon; // w(l + b - w)
        const totalFieldArea = l * b;
        const lawnArea = (l - w) * (b - w);
        const singleLawnArea = lawnArea / 4;
        const totalCost = crossArea * rate;

        stepsHi.push(`चरण 1 (लंबाई के समानांतर सड़क): क्षेत्रफल = l × w = ${l} × ${w} = ${areaRoadL.toFixed(2)} मी²`);
        stepsHi.push(`चरण 2 (चौड़ाई के समानांतर सड़क): क्षेत्रफल = b × w = ${b} × ${w} = ${areaRoadB.toFixed(2)} मी²`);
        stepsHi.push(`चरण 3 (उभयनिष्ठ चौराहे का क्षेत्रफल): A_center = w² = ${w}² = ${areaSquareCommon.toFixed(2)} मी²`);
        stepsHi.push(`चरण 4 (कुल क्रॉस सड़क का क्षेत्रफल): A = (l × w) + (b × w) - w² = ${areaRoadL.toFixed(2)} + ${areaRoadB.toFixed(2)} - ${areaSquareCommon.toFixed(2)} = ${crossArea.toFixed(2)} मी²`);
        stepsHi.push(`शॉर्टकट सूत्र: w(l + b - w) = ${w} × (${l} + ${b} - ${w}) = ${crossArea.toFixed(2)} मी²`);
        stepsHi.push(`चरण 5 (शेष 4 लॉन का कुल क्षेत्रफल): (l - w)(b - w) = (${l} - ${w}) × (${b} - ${w}) = ${lawnArea.toFixed(2)} मी²`);
        stepsHi.push(`• प्रत्येक 1 लॉन कोने का क्षेत्रफल = ${lawnArea.toFixed(2)} / 4 = ${singleLawnArea.toFixed(2)} मी²`);
        stepsHi.push(`\n[लागत गणना]:`);
        stepsHi.push(`• सड़क पक्की करने का कुल खर्च (@ ₹${rate}/मी²) = ${crossArea.toFixed(2)} × ${rate} = ₹${totalCost.toFixed(2)}`);

        stepsEn.push(`Step 1 (Road || Length): Area = l × w = ${l} × ${w} = ${areaRoadL.toFixed(2)} sq m`);
        stepsEn.push(`Step 2 (Road || Breadth): Area = b × w = ${b} × ${w} = ${areaRoadB.toFixed(2)} sq m`);
        stepsEn.push(`Step 3 (Center Intersection): Area = w² = ${w}² = ${areaSquareCommon.toFixed(2)} sq m`);
        stepsEn.push(`Step 4 (Total Crossroads Area): lw + bw - w² = ${crossArea.toFixed(2)} sq m`);
        stepsEn.push(`Direct Formula: w(l + b - w) = ${crossArea.toFixed(2)} m²`);
        stepsEn.push(`Step 5 (Remaining 4 Lawns Area): (l - w)(b - w) = ${lawnArea.toFixed(2)} sq m`);
        stepsEn.push(`• Area of each single lawn corner = ${singleLawnArea.toFixed(2)} sq m`);
        stepsEn.push(`Paving Cost (@ ₹${rate}/m²) = ₹${totalCost.toFixed(2)}`);

        formulas.push('A_cross = w(l + b - w)', 'A_lawn = (l - w)(b - w)', 'Cost = A_cross × Rate');

        return {
          titleHi: `क्रॉस रास्तों का हल (लंबाई = ${l} मी, चौड़ाई = ${b} मी, सड़क = ${w} मी)`,
          titleEn: `Crossroads Solution (l = ${l} m, b = ${b} m, w = ${w} m)`,
          category: '2D Mensuration: क्रॉस सड़कें',
          givenData,
          toFindHi: 'सड़कों का क्षेत्रफल, लॉन का क्षेत्रफल व लागत',
          toFindEn: 'Crossroads Area, Lawn Area, and Paving Cost',
          stepsHi,
          stepsEn,
          finalAnswerHi: `क्रॉस रास्तों का क्षेत्रफल = ${crossArea.toFixed(2)} मी² | शेष 4 लॉन का क्षेत्रफल = ${lawnArea.toFixed(2)} मी² (प्रत्येक = ${singleLawnArea.toFixed(2)} मी²) | कुल खर्च (@ ₹${rate}/मी²) = ₹${totalCost.toFixed(2)}`,
          finalAnswerEn: `Crossroads Area = ${crossArea.toFixed(2)} sq m | Remaining Lawns = ${lawnArea.toFixed(2)} sq m (each = ${singleLawnArea.toFixed(2)} sq m) | Cost = ₹${totalCost.toFixed(2)}`,
          formulasUsed: formulas,
          tipsHi: 'बीच के वर्ग w² को 1 बार घटाया जाता है क्योंकि दोनों सड़कें वहां मिलती हैं।',
          tipsEn: 'Subtract w² once to eliminate overlapping intersection.',
        };
      }

      return {
        titleHi: 'क्रॉस सड़कें: मान भरें',
        titleEn: 'Crossroads: Enter Values',
        category: '2D Mensuration',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'मान भरें' }],
        toFindHi: 'लंबाई l, चौड़ाई b और सड़क की चौड़ाई w भरें',
        toFindEn: 'Enter Length, Breadth and Road Width',
        stepsHi: ['कृपया मैदान की विमाएं भरें।'],
        stepsEn: ['Please enter dimensions.'],
        finalAnswerHi: 'कृपया मान भरें।',
        finalAnswerEn: 'Please enter values.',
        formulasUsed: ['A_cross = w(l + b - w)'],
      };
    },
  },

  // 1D. वृत्ताकार रास्ता व वलय (Circular Path / Ring / Annulus)
  {
    id: 'path_circle_annulus',
    nameHi: 'वृत्ताकार रास्ता व वलय (Circular Path / Ring)',
    nameEn: 'Circular Path & Annulus Ring',
    categoryHi: '2D क्षेत्रमिति (2D Mensuration)',
    categoryEn: '2D Geometry',
    icon: '🎯',
    badge: 'A = π(R² - r²) = πw(2r+w)',
    mainFormulaText: 'रास्ते का क्षेत्रफल A = π(R² - r²) = πw(2r + w) | परिधियों का अंतर = 2πw',
    descriptionHi: 'भीतरी त्रिज्या (r), बाहरी त्रिज्या (R), रास्ते की चौड़ाई (w), परिधियों का अंतर (ΔC), या लागत की गणना।',
    descriptionEn: 'Calculate circular path area, inner/outer radii, width, difference in circumferences, and cost.',
    variables: [
      { key: 'radiusInner', symbol: 'r', labelHi: 'भीतरी त्रिज्या (Inner Radius r)', labelEn: 'Inner Radius (r)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'radiusOuter', symbol: 'R', labelHi: 'बाहरी त्रिज्या (Outer Radius R)', labelEn: 'Outer Radius (R)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'pathWidth', symbol: 'w', labelHi: 'रास्ते की चौड़ाई (Width w)', labelEn: 'Path Width (w)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'circDiff', symbol: 'ΔC', labelHi: 'परिधियों का अंतर (ΔC = 2πw)', labelEn: 'Circumference Diff (ΔC)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'pathArea', symbol: 'A', labelHi: 'रास्ते का क्षेत्रफल (Path Area)', labelEn: 'Path Area (A)', unitHi: 'मी² (m²)', unitEn: 'sq m' },
      { key: 'ratePaving', symbol: 'Rate', labelHi: 'लागत दर (₹/m²)', labelEn: 'Paving Rate (₹/m²)', unitHi: '₹/मी²', unitEn: '₹/sq m' },
    ],
    presets: [
      {
        nameHi: 'r = 14m, w = 3.5m ⇒ रास्ते का क्षेत्रफल व परिधियों का अंतर',
        nameEn: 'r = 14m, w = 3.5m ⇒ Area & Circumference Diff',
        values: { radiusInner: 14, radiusOuter: null, pathWidth: 3.5, circDiff: null, pathArea: null, ratePaving: 25 },
        descriptionHi: '14m त्रिज्या वाले वृत्ताकार पार्क के बाहर 3.5m चौड़ा रास्ता।',
        descriptionEn: '3.5m path around 14m circular park.',
      },
      {
        nameHi: 'परिधियों का अंतर ΔC = 44m ⇒ रास्ते की चौड़ाई w निकालें',
        nameEn: 'ΔC = 44m ⇒ Find Path Width (w)',
        values: { radiusInner: null, radiusOuter: null, pathWidth: null, circDiff: 44, pathArea: null, ratePaving: null },
        descriptionHi: 'बाहरी और भीतरी परिधियों का अंतर 44 मी है, रास्ते की चौड़ाई w ज्ञात करें।',
        descriptionEn: 'Difference in circumferences is 44m, find width w.',
      },
      {
        nameHi: 'R = 21m, r = 14m ⇒ वलय का क्षेत्रफल व ₹30/मी² पर खर्च',
        nameEn: 'R = 21m, r = 14m ⇒ Ring Area & Cost @ ₹30/m²',
        values: { radiusInner: 14, radiusOuter: 21, pathWidth: null, circDiff: null, pathArea: null, ratePaving: 30 },
        descriptionHi: 'बाहरी त्रिज्या 21m व भीतरी 14m वाले वलय का क्षेत्रफल व खर्च।',
        descriptionEn: 'Annulus ring with R=21m, r=14m.',
      },
    ],
    solve: (inputs) => {
      let r = inputs.radiusInner;
      let R = inputs.radiusOuter;
      let w = inputs.pathWidth;
      const dC = inputs.circDiff;
      let area = inputs.pathArea;
      const rate = inputs.ratePaving ?? 25;
      const PI = 22 / 7;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (r) givenData.push({ labelHi: 'भीतरी त्रिज्या (r)', labelEn: 'Inner Radius (r)', value: `${r} मी` });
      if (R) givenData.push({ labelHi: 'बाहरी त्रिज्या (R)', labelEn: 'Outer Radius (R)', value: `${R} मी` });
      if (w) givenData.push({ labelHi: 'चौड़ाई (w)', labelEn: 'Width (w)', value: `${w} मी` });
      if (dC) givenData.push({ labelHi: 'परिधियों का अंतर (ΔC)', labelEn: 'Circumference Diff', value: `${dC} मी` });

      // If ΔC given -> w = ΔC / (2π)
      if (dC && !w) {
        w = dC / (2 * Math.PI);
        stepsHi.push(`चरण 1 (परिधि अंतर सूत्र): 2πR - 2πr = 2π(R - r) = 2πw = ${dC} मी`);
        stepsHi.push(`चरण 2 (पक्षांतरण): रास्ते की चौड़ाई w = ${dC} / (2 × 22/7) = ${w.toFixed(2)} मी`);
        stepsEn.push(`Step 1: 2πw = ${dC} m`);
        stepsEn.push(`Step 2: w = ${dC} / (2π) = ${w.toFixed(2)} m`);
        formulas.push('w = ΔC / 2π');
      }

      if (r && w && !R) R = r + w;
      if (R && w && !r) r = R - w;
      if (R && r && !w) w = R - r;

      if (r && R) {
        const areaOuter = PI * R * R;
        const areaInner = PI * r * r;
        area = areaOuter - areaInner;
        const circInner = 2 * PI * r;
        const circOuter = 2 * PI * R;
        const circDiffCalc = circOuter - circInner;
        const cost = area * rate;

        stepsHi.push(`चरण 1: भीतरी त्रिज्या r = ${r} मी, बाहरी त्रिज्या R = ${R} मी (चौड़ाई w = ${w?.toFixed(2)} मी)`);
        stepsHi.push(`चरण 2: बाहरी वृत्त का क्षेत्रफल = πR² = (22/7) × ${R}² = ${areaOuter.toFixed(2)} मी²`);
        stepsHi.push(`चरण 3: भीतरी पार्क का क्षेत्रफल = πr² = (22/7) × ${r}² = ${areaInner.toFixed(2)} मी²`);
        stepsHi.push(`चरण 4: रास्ते का क्षेत्रफल = π(R² - r²) = (22/7) × (${R}² - ${r}²) = ${area.toFixed(2)} मी²`);
        stepsHi.push(`शॉर्टकट सूत्र: π(R - r)(R + r) = (22/7) × ${w?.toFixed(2)} × ${(R + r).toFixed(2)} = ${area.toFixed(2)} मी²`);
        stepsHi.push(`चरण 5: परिधियों की गणना:`);
        stepsHi.push(`• भीतरी परिधि = 2πr = 2 × (22/7) × ${r} = ${circInner.toFixed(2)} मी`);
        stepsHi.push(`• बाहरी परिधि = 2πR = 2 × (22/7) × ${R} = ${circOuter.toFixed(2)} मी`);
        stepsHi.push(`• परिधियों का अंतर = 2πw = ${circDiffCalc.toFixed(2)} मी`);
        stepsHi.push(`\n[लागत गणना]:`);
        stepsHi.push(`• रास्ते पर काम का खर्च (@ ₹${rate}/मी²) = ${area.toFixed(2)} × ${rate} = ₹${cost.toFixed(2)}`);

        stepsEn.push(`Step 1: r = ${r} m, R = ${R} m, width w = ${w?.toFixed(2)} m`);
        stepsEn.push(`Step 2: Outer Area = πR² = ${areaOuter.toFixed(2)} sq m`);
        stepsEn.push(`Step 3: Inner Area = πr² = ${areaInner.toFixed(2)} sq m`);
        stepsEn.push(`Step 4: Path Area = π(R² - r²) = ${area.toFixed(2)} sq m`);
        stepsEn.push(`Step 5: Inner Circumference = ${circInner.toFixed(2)} m, Outer = ${circOuter.toFixed(2)} m`);
        stepsEn.push(`Circumference Difference = ${circDiffCalc.toFixed(2)} m`);
        stepsEn.push(`Total Cost (@ ₹${rate}/m²) = ₹${cost.toFixed(2)}`);

        formulas.push('A = π(R² - r²) = πw(2r + w)', 'ΔC = 2πw', 'Cost = A × Rate');

        return {
          titleHi: `वृत्ताकार रास्ते का हल (r = ${r} मी, R = ${R} मी, w = ${w?.toFixed(2)} मी)`,
          titleEn: `Circular Path Solution (r = ${r} m, R = ${R} m, w = ${w?.toFixed(2)} m)`,
          category: '2D Mensuration: वृत्ताकार मार्ग',
          givenData,
          toFindHi: 'रास्ते का क्षेत्रफल, त्रिज्याएं व परिधियों का अंतर',
          toFindEn: 'Path Area, Radii, and Circumference Difference',
          stepsHi,
          stepsEn,
          finalAnswerHi: `रास्ते का क्षेत्रफल = ${area.toFixed(2)} मी² | चौड़ाई (w) = ${w?.toFixed(2)} मी | परिधियों का अंतर = ${circDiffCalc.toFixed(2)} मी | कुल खर्च = ₹${cost.toFixed(2)}`,
          finalAnswerEn: `Path Area = ${area.toFixed(2)} sq m | Width = ${w?.toFixed(2)} m | Circumference Diff = ${circDiffCalc.toFixed(2)} m | Cost = ₹${cost.toFixed(2)}`,
          formulasUsed: formulas,
          tipsHi: 'परिधियों का अंतर हमेशा 2πw होता है, चाहे त्रिज्या कितनी भी बड़ी क्यों न हो।',
          tipsEn: 'Difference between circumferences is strictly 2πw regardless of circle size.',
        };
      }

      return {
        titleHi: 'वृत्ताकार रास्ता: मान भरें',
        titleEn: 'Circular Path: Enter Values',
        category: '2D Mensuration',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'मान भरें' }],
        toFindHi: 'भीतरी त्रिज्या r व चौड़ाई w भरें',
        toFindEn: 'Enter Inner Radius and Width',
        stepsHi: ['कृपया मान भरें।'],
        stepsEn: ['Please enter values.'],
        finalAnswerHi: 'कृपया मान भरें।',
        finalAnswerEn: 'Please enter values.',
        formulasUsed: ['A = π(R² - r²)'],
      };
    },
  },

  // 1E. पहिए के चक्कर, दूरी व चाल (Wheel Revolutions, Distance & Speed)
  {
    id: 'wheel_revolutions',
    nameHi: 'पहिए के चक्कर व दूरी (Wheel Revolutions & Distance)',
    nameEn: 'Wheel Revolutions & Distance',
    categoryHi: '2D क्षेत्रमिति (2D Mensuration)',
    categoryEn: '2D Geometry',
    icon: '⚙️',
    badge: 'दूरी = N × 2πr | N = D / 2πr',
    mainFormulaText: '1 चक्कर की दूरी = 2πr | कुल दूरी D = N × 2πr | चक्करों की संख्या N = कुल दूरी / 2πr',
    descriptionHi: 'पहिए की त्रिज्या (r सेमी), व्यास (d सेमी), कुल दूरी (D किमी/मी), चक्करों की संख्या (N), समय व चाल निकालें।',
    descriptionEn: 'Calculate wheel revolutions, distance travelled, wheel diameter, speed, and time.',
    variables: [
      { key: 'radiusCm', symbol: 'r', labelHi: 'पहिए की त्रिज्या (Radius r)', labelEn: 'Wheel Radius (r)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'diameterCm', symbol: 'd', labelHi: 'पहिए का व्यास (Diameter d)', labelEn: 'Wheel Diameter (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'distanceKm', symbol: 'D', labelHi: 'कुल दूरी (Distance D in km)', labelEn: 'Total Distance (D in km)', unitHi: 'किमी (km)', unitEn: 'km' },
      { key: 'revolutions', symbol: 'N', labelHi: 'चक्करों की संख्या (Revolutions N)', labelEn: 'Revolutions (N)', unitHi: 'चक्कर', unitEn: 'revs' },
      { key: 'timeMins', symbol: 't', labelHi: 'समय (Time in mins)', labelEn: 'Time (mins)', unitHi: 'मिनट', unitEn: 'mins' },
    ],
    presets: [
      {
        nameHi: 'r = 28 सेमी, D = 88 किमी ⇒ चक्करों की संख्या (N) निकालें',
        nameEn: 'r = 28 cm, D = 88 km ⇒ Find Revolutions (N)',
        values: { radiusCm: 28, diameterCm: null, distanceKm: 88, revolutions: null, timeMins: null },
        descriptionHi: '28 सेमी त्रिज्या का पहिया 88 किमी चलने में कितने चक्कर लगाएगा?',
        descriptionEn: 'How many revolutions will a 28cm wheel make in 88km?',
      },
      {
        nameHi: 'd = 70 सेमी, N = 2000 चक्कर ⇒ तय की गई कुल दूरी',
        nameEn: 'd = 70 cm, N = 2000 revs ⇒ Distance Travelled',
        values: { radiusCm: null, diameterCm: 70, distanceKm: null, revolutions: 2000, timeMins: null },
        descriptionHi: '70 सेमी व्यास वाला पहिया 2000 चक्करों में कितनी दूरी तय करेगा?',
        descriptionEn: 'Distance travelled by 70cm diameter wheel in 2000 revolutions.',
      },
      {
        nameHi: 'r = 35 सेमी, N = 5000 चक्कर, समय = 10 मिनट ⇒ चाल (km/h)',
        nameEn: 'r = 35 cm, N = 5000 revs, Time = 10 min ⇒ Speed (km/h)',
        values: { radiusCm: 35, diameterCm: null, distanceKm: null, revolutions: 5000, timeMins: 10 },
        descriptionHi: '35 सेमी त्रिज्या का पहिया 10 मिनट में 5000 चक्कर लगाता है, गाड़ी की चाल निकालें।',
        descriptionEn: 'Calculate car speed in km/h.',
      },
    ],
    solve: (inputs) => {
      let r = inputs.radiusCm;
      let d = inputs.diameterCm;
      let D_km = inputs.distanceKm;
      let N = inputs.revolutions;
      const t = inputs.timeMins;
      const PI = 22 / 7;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (d && !r) r = d / 2;
      if (r && !d) d = 2 * r;

      if (r) givenData.push({ labelHi: 'पहिए की त्रिज्या (r)', labelEn: 'Radius (r)', value: `${r} सेमी (${(r / 100).toFixed(3)} मी)` });
      if (d) givenData.push({ labelHi: 'पहिए का व्यास (d)', labelEn: 'Diameter (d)', value: `${d} सेमी` });
      if (D_km) givenData.push({ labelHi: 'कुल दूरी (D)', labelEn: 'Distance (D)', value: `${D_km} किमी (${D_km * 1000} मी)` });
      if (N) givenData.push({ labelHi: 'चक्कर (N)', labelEn: 'Revolutions (N)', value: `${N}` });
      if (t) givenData.push({ labelHi: 'समय (Time)', labelEn: 'Time', value: `${t} मिनट` });

      if (r) {
        const circumMeters = (2 * PI * r) / 100; // 1 revolution in meters

        // Case 1: Given r and Distance -> Find N
        if (D_km && !N) {
          const distMeters = D_km * 1000;
          N = distMeters / circumMeters;

          stepsHi.push(`चरण 1 (1 चक्कर में तय दूरी = परिधि): C = 2πr = 2 × (22/7) × ${r} = ${(2 * PI * r).toFixed(2)} सेमी = ${circumMeters.toFixed(4)} मीटर`);
          stepsHi.push(`चरण 2 (कुल दूरी को मीटर में बदलना): D = ${D_km} किमी = ${D_km} × 1000 = ${distMeters.toLocaleString()} मीटर`);
          stepsHi.push(`चरण 3 (चक्करों की संख्या N): N = कुल दूरी / 1 चक्कर की दूरी = ${distMeters.toLocaleString()} / ${circumMeters.toFixed(4)} = ${Math.round(N).toLocaleString()} चक्कर`);

          stepsEn.push(`Step 1 (1 Revolution Distance = Circumference): C = 2πr = ${circumMeters.toFixed(4)} meters`);
          stepsEn.push(`Step 2 (Distance in meters): D = ${distMeters.toLocaleString()} m`);
          stepsEn.push(`Step 3 (Revolutions N): N = Distance / Circumference = ${Math.round(N).toLocaleString()} revolutions`);
          formulas.push('C = 2πr', 'N = D / C');
        } else if (N && !D_km) {
          // Case 2: Given r and N -> Find Distance
          const distMeters = N * circumMeters;
          D_km = distMeters / 1000;

          stepsHi.push(`चरण 1: पहिए की परिधि = 2πr = 2 × (22/7) × ${r} = ${(2 * PI * r).toFixed(2)} सेमी = ${circumMeters.toFixed(4)} मीटर`);
          stepsHi.push(`चरण 2: कुल दूरी D = N × परिधि = ${N} × ${circumMeters.toFixed(4)} = ${distMeters.toFixed(2)} मीटर = ${D_km.toFixed(3)} किमी`);

          stepsEn.push(`Step 1: Circumference = 2πr = ${circumMeters.toFixed(4)} m`);
          stepsEn.push(`Step 2: Total Distance = N × C = ${distMeters.toFixed(2)} m = ${D_km.toFixed(3)} km`);
          formulas.push('D = N × 2πr');
        }

        let speedKmh = 0;
        if (D_km && t && t > 0) {
          speedKmh = (D_km / t) * 60;
          stepsHi.push(`चरण 4 (चाल की गणना): चाल = दूरी / समय = ${D_km.toFixed(2)} किमी / (${t}/60 घंटा) = ${speedKmh.toFixed(2)} किमी/घंटा (km/h)`);
          stepsEn.push(`Step 4 (Speed): Speed = Distance / Time = ${speedKmh.toFixed(2)} km/h`);
          formulas.push('Speed = D / (t / 60)');
        }

        return {
          titleHi: `पहिए के चक्कर व दूरी का हल (त्रिज्या = ${r} सेमी, व्यास = ${d} सेमी)`,
          titleEn: `Wheel Revolutions & Distance Solution (Radius = ${r} cm, Diameter = ${d} cm)`,
          category: '2D Mensuration: पहिए की गति',
          givenData,
          toFindHi: 'चक्करों की संख्या N, कुल दूरी D व चाल',
          toFindEn: 'Revolutions N, Distance D, and Speed',
          stepsHi,
          stepsEn,
          finalAnswerHi: `1 चक्कर में दूरी = ${circumMeters.toFixed(4)} मी | कुल चक्कर = ${Math.round(N || 0).toLocaleString()} | कुल दूरी = ${D_km?.toFixed(3)} किमी (${((D_km || 0) * 1000).toFixed(1)} मी)${speedKmh ? ` | चाल = ${speedKmh.toFixed(2)} km/h` : ''}`,
          finalAnswerEn: `Circumference = ${circumMeters.toFixed(4)} m | Revolutions = ${Math.round(N || 0).toLocaleString()} | Distance = ${D_km?.toFixed(3)} km${speedKmh ? ` | Speed = ${speedKmh.toFixed(2)} km/h` : ''}`,
          formulasUsed: formulas,
          tipsHi: 'हमेशा याद रखें: 1 चक्कर = 2πr (पहिए की परिधि)। दूरी और त्रिज्या की इकाइयां (मी/किमी/सेमी) समान रखें।',
          tipsEn: '1 Revolution = 2πr (Circumference). Always align units (cm, m, km).',
        };
      }

      return {
        titleHi: 'पहिए के चक्कर: मान भरें',
        titleEn: 'Wheel: Enter Values',
        category: '2D Mensuration',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'मान भरें' }],
        toFindHi: 'पहिए की त्रिज्या r व कुल दूरी D या चक्कर N भरें',
        toFindEn: 'Enter Wheel Radius and Distance/Revolutions',
        stepsHi: ['कृपया मान भरें।'],
        stepsEn: ['Please enter values.'],
        finalAnswerHi: 'कृपया मान भरें।',
        finalAnswerEn: 'Please enter values.',
        formulasUsed: ['D = N × 2πr'],
      };
    },
  },

  // 1F. कमरे की 4 दीवारें, पुताई व फर्श की टाइलें (Room 4 Walls & Floor Tiles)
  {
    id: 'room_walls_tiles',
    nameHi: 'कमरे की 4 दीवारें व टाइलें (Room 4 Walls & Tiles)',
    nameEn: 'Room 4 Walls & Floor Tiles',
    categoryHi: '2D व 3D क्षेत्रमिति',
    categoryEn: 'Mensuration Applications',
    icon: '🏠',
    badge: '4 दीवारें = 2h(l+b) | टाइलें = A / (t_l × t_b)',
    mainFormulaText: '4 दीवारों का क्षेत्रफल = 2h(l + b) | छत सहित पुताई = 2h(l + b) + lb - खिड़की/दरवाजे | टाइल संख्या = फर्श / टाइल',
    descriptionHi: 'कमरे की लंबाई (l), चौड़ाई (b), ऊंचाई (h), दरवाजे/खिड़कियों का क्षेत्रफल, पुताई खर्च व फर्श टाइलों की संख्या।',
    descriptionEn: 'Area of 4 walls 2h(l+b), whitewashing area, number of floor tiles, and total renovation cost.',
    variables: [
      { key: 'roomL', symbol: 'l', labelHi: 'कमरे की लंबाई (Length l)', labelEn: 'Room Length (l)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'roomB', symbol: 'b', labelHi: 'कमरे की चौड़ाई (Breadth b)', labelEn: 'Room Breadth (b)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'roomH', symbol: 'h', labelHi: 'कमरे की ऊंचाई (Height h)', labelEn: 'Room Height (h)', unitHi: 'मी (m)', unitEn: 'm' },
      { key: 'doorsArea', symbol: 'A_doors', labelHi: 'दरवाजे/खिड़की क्षेत्रफल (Doors/Windows)', labelEn: 'Doors/Windows Area', unitHi: 'मी² (m²)', unitEn: 'sq m' },
      { key: 'tileLengthCm', symbol: 't_l', labelHi: 'टाइल की लंबाई (Tile Length)', labelEn: 'Tile Length', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'tileBreadthCm', symbol: 't_b', labelHi: 'टाइल की चौड़ाई (Tile Breadth)', labelEn: 'Tile Breadth', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'rateWhitewash', symbol: 'Rate', labelHi: 'पुताई की दर (₹/m²)', labelEn: 'Whitewash Rate (₹/m²)', unitHi: '₹/मी²', unitEn: '₹/sq m' },
    ],
    presets: [
      {
        nameHi: 'l = 12m, b = 8m, h = 4m, दरवाजे = 15m² ⇒ 4 दीवारें व पुताई खर्च',
        nameEn: 'l = 12m, b = 8m, h = 4m, Doors = 15m² ⇒ 4 Walls & Whitewash',
        values: { roomL: 12, roomB: 8, roomH: 4, doorsArea: 15, tileLengthCm: null, tileBreadthCm: null, rateWhitewash: 12 },
        descriptionHi: '12m × 8m × 4m कमरे में 4 दीवारों का क्षेत्रफल व ₹12/मी² पर पुताई खर्च।',
        descriptionEn: '4 walls and whitewashing cost in 12m × 8m × 4m room.',
      },
      {
        nameHi: 'l = 15m, b = 10m, टाइल 50cm × 40cm ⇒ कुल आवश्यक टाइलें',
        nameEn: 'l = 15m, b = 10m, Tile 50cm × 40cm ⇒ Total Tiles Needed',
        values: { roomL: 15, roomB: 10, roomH: 3.5, doorsArea: 0, tileLengthCm: 50, tileBreadthCm: 40, rateWhitewash: null },
        descriptionHi: '15m × 10m हॉल के फर्श पर 50cm × 40cm की कितनी टाइलें लगेंगी?',
        descriptionEn: 'Number of 50cm × 40cm tiles for 15m × 10m floor (750 tiles).',
      },
    ],
    solve: (inputs) => {
      const l = inputs.roomL;
      const b = inputs.roomB;
      const h = inputs.roomH || 3.5;
      const aDoors = inputs.doorsArea ?? 0;
      const tl = inputs.tileLengthCm;
      const tb = inputs.tileBreadthCm;
      const rateW = inputs.rateWhitewash ?? 12;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (l) givenData.push({ labelHi: 'लंबाई (l)', labelEn: 'Length (l)', value: `${l} मी` });
      if (b) givenData.push({ labelHi: 'चौड़ाई (b)', labelEn: 'Breadth (b)', value: `${b} मी` });
      if (h) givenData.push({ labelHi: 'ऊंचाई (h)', labelEn: 'Height (h)', value: `${h} मी` });
      if (aDoors > 0) givenData.push({ labelHi: 'खिड़की/दरवाजे (A_doors)', labelEn: 'Doors/Windows', value: `${aDoors} मी²` });
      if (tl && tb) givenData.push({ labelHi: 'टाइल का आकार', labelEn: 'Tile Size', value: `${tl} सेमी × ${tb} सेमी` });

      if (l && b) {
        const floorArea = l * b;
        const ceilingArea = l * b;
        const wallsArea = 2 * h * (l + b);
        const whitewashWallsOnly = Math.max(0, wallsArea - aDoors);
        const whitewashWallsAndCeiling = Math.max(0, wallsArea + ceilingArea - aDoors);
        const costWallsOnly = whitewashWallsOnly * rateW;
        const costWithCeiling = whitewashWallsAndCeiling * rateW;

        stepsHi.push(`चरण 1 (फर्श व छत का क्षेत्रफल): A_floor = l × b = ${l} × ${b} = ${floorArea.toFixed(2)} मी²`);
        stepsHi.push(`चरण 2 (4 दीवारों का क्षेत्रफल): A_walls = 2h(l + b) = 2 × ${h} × (${l} + ${b}) = ${wallsArea.toFixed(2)} मी²`);

        stepsEn.push(`Step 1 (Floor Area): A_floor = l × b = ${floorArea.toFixed(2)} sq m`);
        stepsEn.push(`Step 2 (4 Walls Area): A_walls = 2h(l + b) = ${wallsArea.toFixed(2)} sq m`);
        formulas.push('A_4walls = 2h(l + b)', 'A_floor = l × b');

        if (aDoors > 0) {
          stepsHi.push(`चरण 3 (दरवाजे/खिड़कियां घटाने पर शुद्ध दीवारें): ${wallsArea.toFixed(2)} - ${aDoors} = ${whitewashWallsOnly.toFixed(2)} मी²`);
          stepsEn.push(`Step 3 (Net Wall Area): ${wallsArea.toFixed(2)} - ${aDoors} = ${whitewashWallsOnly.toFixed(2)} sq m`);
        }

        stepsHi.push(`चरण 4 (पुताई खर्च गणना @ ₹${rateW}/मी²):`);
        stepsHi.push(`• केवल 4 दीवारों की पुताई खर्च = ${whitewashWallsOnly.toFixed(2)} × ${rateW} = ₹${costWallsOnly.toFixed(2)}`);
        stepsHi.push(`• 4 दीवारें + छत की पुताई खर्च = (${whitewashWallsOnly.toFixed(2)} + ${ceilingArea}) × ${rateW} = ${whitewashWallsAndCeiling.toFixed(2)} × ${rateW} = ₹${costWithCeiling.toFixed(2)}`);

        stepsEn.push(`• Whitewashing cost (4 Walls only) = ₹${costWallsOnly.toFixed(2)}`);
        stepsEn.push(`• Whitewashing cost (Walls + Ceiling) = ₹${costWithCeiling.toFixed(2)}`);

        let tileCount = 0;
        if (tl && tb && tl > 0 && tb > 0) {
          const singleTileAreaSqMeters = (tl / 100) * (tb / 100);
          tileCount = Math.ceil(floorArea / singleTileAreaSqMeters);

          stepsHi.push(`\n[फर्श की टाइलें]:`);
          stepsHi.push(`• 1 टाइल का क्षेत्रफल = (${tl}/100) × (${tb}/100) = ${singleTileAreaSqMeters.toFixed(4)} मी²`);
          stepsHi.push(`• कुल आवश्यक टाइलें = फर्श का क्षेत्रफल / 1 टाइल का क्षेत्रफल = ${floorArea.toFixed(2)} / ${singleTileAreaSqMeters.toFixed(4)} = ${tileCount.toLocaleString()} टाइलें`);

          stepsEn.push(`\n[Floor Tiles]:`);
          stepsEn.push(`• 1 Tile Area = ${singleTileAreaSqMeters.toFixed(4)} sq m`);
          stepsEn.push(`• Total Tiles Needed = ${floorArea.toFixed(2)} / ${singleTileAreaSqMeters.toFixed(4)} = ${tileCount.toLocaleString()} tiles`);
          formulas.push('Tiles = Floor Area / (t_l × t_b)');
        }

        return {
          titleHi: `कमरे की 4 दीवारें व टाइलों का हल (l = ${l} मी, b = ${b} मी, h = ${h} मी)`,
          titleEn: `Room 4 Walls & Renovation Solution (l = ${l} m, b = ${b} m, h = ${h} m)`,
          category: 'क्षेत्रमिति अनुप्रयोग',
          givenData,
          toFindHi: '4 दीवारों का क्षेत्रफल, पुताई खर्च व टाइलें',
          toFindEn: '4 Walls Area, Whitewash Cost, and Tile Count',
          stepsHi,
          stepsEn,
          finalAnswerHi: `4 दीवारों का क्षेत्रफल = ${wallsArea.toFixed(2)} मी² | पुताई खर्च (दीवारें + छत) = ₹${costWithCeiling.toFixed(2)}${tileCount ? ` | कुल टाइलें = ${tileCount.toLocaleString()} टाइलें` : ''}`,
          finalAnswerEn: `4 Walls Area = ${wallsArea.toFixed(2)} sq m | Whitewash Cost (Walls + Ceiling) = ₹${costWithCeiling.toFixed(2)}${tileCount ? ` | Total Tiles = ${tileCount.toLocaleString()} tiles` : ''}`,
          formulasUsed: formulas,
          tipsHi: 'सूत्र याद रखें: 4 दीवारें = 2h(l + b) = आधार का परिमाप × ऊंचाई।',
          tipsEn: '4 Walls Area = 2h(l + b) = Perimeter of base × Height.',
        };
      }

      return {
        titleHi: 'कमरे की दीवारें: मान भरें',
        titleEn: 'Room Walls: Enter Values',
        category: 'Mensuration Applications',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'मान भरें' }],
        toFindHi: 'लंबाई l, चौड़ाई b व ऊंचाई h भरें',
        toFindEn: 'Enter Length, Breadth, and Height',
        stepsHi: ['कृपया कमरे की विमाएं भरें।'],
        stepsEn: ['Please enter room dimensions.'],
        finalAnswerHi: 'कृपया मान भरें।',
        finalAnswerEn: 'Please enter values.',
        formulasUsed: ['A = 2h(l + b)'],
      };
    },
  },

  // 2. बेलन (Cylinder): V, r, h, CSA, TSA, BaseArea
  {
    id: 'cylinder',
    nameHi: 'बेलन (Cylinder)',
    nameEn: 'Cylinder',
    categoryHi: '3D ठोस (3D Solids)',
    categoryEn: '3D Mensuration',
    icon: '🛢️',
    badge: 'V = πr²h | CSA = 2πrh',
    mainFormulaText: 'आयतन V = πr²h | वक्र पृष्ठ CSA = 2πrh | कुल पृष्ठ TSA = 2πr(r + h) | आधार का क्षेत्रफल = πr²',
    descriptionHi: 'आयतन (V), त्रिज्या (r), ऊंचाई (h), वक्र पृष्ठ (CSA), या कुल पृष्ठ (TSA) में से कोई भी 2 मान भरें, बाकी अज्ञात मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 2 values among Volume, Radius, Height, CSA, TSA; the app will solve the missing unknowns.',
    variables: [
      { key: 'volume', symbol: 'V', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', unitHi: 'सेमी³ (cm³)', unitEn: 'cu cm' },
      { key: 'radius', symbol: 'r', labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'height', symbol: 'h', labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'csa', symbol: 'CSA', labelHi: 'वक्र पृष्ठ (Curved Surface CSA)', labelEn: 'Curved Surface (CSA)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'tsa', symbol: 'TSA', labelHi: 'कुल पृष्ठ (Total Surface TSA)', labelEn: 'Total Surface (TSA)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'baseArea', symbol: 'B', labelHi: 'आधार क्षेत्रफल (Base Area πr²)', labelEn: 'Base Area', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
    ],
    presets: [
      {
        nameHi: 'V = 1540, r = 7 ⇒ ऊंचाई (h) निकालें',
        nameEn: 'V = 1540, r = 7 ⇒ Find Height (h)',
        values: { volume: 1540, radius: 7, height: null, csa: null, tsa: null, baseArea: null },
        descriptionHi: 'आयतन व त्रिज्या दी है, ऊंचाई, CSA व TSA निकालें।',
        descriptionEn: 'Given Volume and Radius, find Height, CSA, and TSA.',
      },
      {
        nameHi: 'CSA = 440, r = 7 ⇒ ऊंचाई (h) व V निकालें',
        nameEn: 'CSA = 440, r = 7 ⇒ Find Height & Volume',
        values: { volume: null, radius: 7, height: null, csa: 440, tsa: null, baseArea: null },
        descriptionHi: 'वक्र पृष्ठ व त्रिज्या दी है, ऊंचाई व आयतन निकालें।',
        descriptionEn: 'Given CSA and Radius, find Height and Volume.',
      },
      {
        nameHi: 'V = 1540, h = 10 ⇒ त्रिज्या (r) निकालें',
        nameEn: 'V = 1540, h = 10 ⇒ Find Radius (r)',
        values: { volume: 1540, radius: null, height: 10, csa: null, tsa: null, baseArea: null },
        descriptionHi: 'आयतन व ऊंचाई से त्रिज्या व पृष्ठ क्षेत्रफल निकालें।',
        descriptionEn: 'Given Volume and Height, find Radius and Surface Areas.',
      },
      {
        nameHi: 'r = 7, h = 10 ⇒ V, CSA, TSA सब निकालें',
        nameEn: 'r = 7, h = 10 ⇒ Find V, CSA, TSA',
        values: { volume: null, radius: 7, height: 10, csa: null, tsa: null, baseArea: null },
        descriptionHi: 'त्रिज्या व ऊंचाई दी है, सभी मान सीधे ज्ञात करें।',
        descriptionEn: 'Given Radius and Height, calculate all cylinder properties.',
      },
    ],
    solve: (inputs) => {
      const V = inputs.volume;
      const r = inputs.radius;
      const h = inputs.height;
      const csa = inputs.csa;
      const tsa = inputs.tsa;
      const baseArea = inputs.baseArea;

      let calcR: number | null = null;
      let calcH: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (V !== null && V !== undefined) givenData.push({ labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` });
      if (r !== null && r !== undefined) givenData.push({ labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', value: `${r} सेमी` });
      if (h !== null && h !== undefined) givenData.push({ labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', value: `${h} सेमी` });
      if (csa !== null && csa !== undefined) givenData.push({ labelHi: 'वक्र पृष्ठ (CSA)', labelEn: 'CSA', value: `${csa} सेमी²` });
      if (tsa !== null && tsa !== undefined) givenData.push({ labelHi: 'कुल पृष्ठ (TSA)', labelEn: 'TSA', value: `${tsa} सेमी²` });
      if (baseArea !== null && baseArea !== undefined) givenData.push({ labelHi: 'आधार क्षेत्रफल (Base Area)', labelEn: 'Base Area', value: `${baseArea} सेमी²` });

      if (r && h) {
        calcR = r;
        calcH = h;
        stepsHi.push(`चरण 1 (मानक सूत्र): बेलन का आयतन (V) = π × r² × h`);
        stepsHi.push(`चरण 2 (मान रखने पर): V = (22/7) × ${r}² × ${h} = ${(Math.PI * r * r * h).toFixed(2)} सेमी³`);
        stepsEn.push(`Step 1 (Formula): Cylinder Volume (V) = πr²h`);
        stepsEn.push(`Step 2 (Calculation): V = π × ${r}² × ${h} = ${(Math.PI * r * r * h).toFixed(2)} cu cm`);
        formulas.push('V = πr²h', 'CSA = 2πrh', 'TSA = 2πr(r + h)');
      } else if (V && r) {
        calcR = r;
        calcH = V / (Math.PI * r * r);
        stepsHi.push(`चरण 1 (मानक सूत्र): आयतन (V) = π × r² × h`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${V} = (22/7) × ${r}² × h = ${(Math.PI * r * r).toFixed(2)} × h`);
        stepsHi.push(`चरण 3 (पक्षांतरण द्वारा ऊंचाई h अलग करने पर): h = V / (πr²) = ${V} / ${(Math.PI * r * r).toFixed(2)} = ${calcH.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): Volume (V) = πr²h`);
        stepsEn.push(`Step 2: ${V} = π × ${r}² × h = ${(Math.PI * r * r).toFixed(2)} × h`);
        stepsEn.push(`Step 3: h = V / (πr²) = ${calcH.toFixed(2)} cm`);
        formulas.push('h = V / (πr²)', 'CSA = 2πrh', 'TSA = 2πr(r + h)');
      } else if (V && h) {
        calcH = h;
        calcR = Math.sqrt(V / (Math.PI * h));
        stepsHi.push(`चरण 1 (मानक सूत्र): आयतन (V) = π × r² × h`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${V} = (22/7) × r² × ${h} = ${(Math.PI * h).toFixed(2)} × r²`);
        stepsHi.push(`चरण 3 (पक्षांतरण): r² = ${V} / ${(Math.PI * h).toFixed(2)} = ${(V / (Math.PI * h)).toFixed(2)}`);
        stepsHi.push(`चरण 4 (वर्गमूल लेने पर): r = √(${(V / (Math.PI * h)).toFixed(2)}) = ${calcR.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): Volume (V) = πr²h`);
        stepsEn.push(`Step 2: r² = V / (πh) = ${(V / (Math.PI * h)).toFixed(2)}`);
        stepsEn.push(`Step 3: r = √(V / πh) = ${calcR.toFixed(2)} cm`);
        formulas.push('r = √(V / (πh))', 'CSA = 2πrh', 'TSA = 2πr(r + h)');
      } else if (csa && r) {
        calcR = r;
        calcH = csa / (2 * Math.PI * r);
        stepsHi.push(`चरण 1 (मानक सूत्र): वक्र पृष्ठ (CSA) = 2 × π × r × h`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${csa} = 2 × (22/7) × ${r} × h = ${(2 * Math.PI * r).toFixed(2)} × h`);
        stepsHi.push(`चरण 3 (पक्षांतरण द्वारा ऊंचाई h अलग करने पर): h = CSA / (2πr) = ${csa} / ${(2 * Math.PI * r).toFixed(2)} = ${calcH.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): CSA = 2πrh`);
        stepsEn.push(`Step 2: ${csa} = 2π(${r})h = ${(2 * Math.PI * r).toFixed(2)} × h`);
        stepsEn.push(`Step 3: h = CSA / (2πr) = ${calcH.toFixed(2)} cm`);
        formulas.push('h = CSA / (2πr)', 'V = πr²h', 'TSA = 2πr(r + h)');
      } else if (csa && h) {
        calcH = h;
        calcR = csa / (2 * Math.PI * h);
        stepsHi.push(`चरण 1 (मानक सूत्र): वक्र पृष्ठ (CSA) = 2 × π × r × h`);
        stepsHi.push(`चरण 2 (पक्षांतरण द्वारा त्रिज्या r अलग करने पर): r = CSA / (2πh) = ${csa} / ${(2 * Math.PI * h).toFixed(2)} = ${calcR.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1 (Formula): CSA = 2πrh`);
        stepsEn.push(`Step 2: r = CSA / (2πh) = ${calcR.toFixed(2)} cm`);
        formulas.push('r = CSA / (2πh)', 'V = πr²h', 'TSA = 2πr(r + h)');
      } else if (baseArea && V) {
        calcR = Math.sqrt(baseArea / Math.PI);
        calcH = V / baseArea;
        stepsHi.push(`चरण 1 (आधार क्षेत्रफल): Base Area = πr² = ${baseArea} सेमी² ⇒ r = √(Base Area / π) = ${calcR.toFixed(2)} सेमी`);
        stepsHi.push(`चरण 2 (आयतन संबंध): V = Base Area × h ⇒ h = V / Base Area = ${V} / ${baseArea} = ${calcH.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: r = √(Base Area / π) = ${calcR.toFixed(2)} cm`);
        stepsEn.push(`Step 2: h = V / Base Area = ${calcH.toFixed(2)} cm`);
        formulas.push('h = V / Base Area', 'r = √(Base Area / π)', 'CSA = 2πrh');
      }

      if (calcR !== null && calcH !== null && !isNaN(calcR) && !isNaN(calcH)) {
        const finalV = Math.PI * calcR * calcR * calcH;
        const finalCSA = 2 * Math.PI * calcR * calcH;
        const finalTSA = 2 * Math.PI * calcR * (calcR + calcH);
        const finalBase = Math.PI * calcR * calcR;

        stepsHi.push(`\n[अतिरिक्त गणनाएं]:`);
        stepsHi.push(`• आयतन (Volume V) = πr²h = (22/7) × ${calcR.toFixed(2)}² × ${calcH.toFixed(2)} = ${finalV.toFixed(2)} सेमी³`);
        stepsHi.push(`• वक्र पृष्ठ (CSA) = 2πrh = 2 × (22/7) × ${calcR.toFixed(2)} × ${calcH.toFixed(2)} = ${finalCSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• कुल पृष्ठ (TSA) = 2πr(r + h) = 2 × (22/7) × ${calcR.toFixed(2)} × (${calcR.toFixed(2)} + ${calcH.toFixed(2)}) = ${finalTSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• आधार क्षेत्रफल (Base Area) = πr² = ${finalBase.toFixed(2)} सेमी²`);

        stepsEn.push(`\n[Derived Parameters]:`);
        stepsEn.push(`• Volume (V) = ${finalV.toFixed(2)} cu cm`);
        stepsEn.push(`• Curved Surface (CSA) = ${finalCSA.toFixed(2)} sq cm`);
        stepsEn.push(`• Total Surface (TSA) = ${finalTSA.toFixed(2)} sq cm`);
        stepsEn.push(`• Base Area = ${finalBase.toFixed(2)} sq cm`);

        return {
          titleHi: `बेलन का पूर्ण हल (r = ${calcR.toFixed(2)} सेमी, h = ${calcH.toFixed(2)} सेमी)`,
          titleEn: `Complete Cylinder Solution (r = ${calcR.toFixed(2)} cm, h = ${calcH.toFixed(2)} cm)`,
          category: '3D Mensuration: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'अज्ञात ऊंचाई, त्रिज्या, आयतन व पृष्ठ क्षेत्रफल',
          toFindEn: 'Missing Height, Radius, Volume, and Surface Areas',
          stepsHi,
          stepsEn,
          finalAnswerHi: `त्रिज्या (r) = ${calcR.toFixed(2)} सेमी | ऊंचाई (h) = ${calcH.toFixed(2)} सेमी | आयतन (V) = ${finalV.toFixed(2)} सेमी³ | वक्र पृष्ठ (CSA) = ${finalCSA.toFixed(2)} सेमी² | कुल पृष्ठ (TSA) = ${finalTSA.toFixed(2)} सेमी²`,
          finalAnswerEn: `Radius = ${calcR.toFixed(2)} cm | Height = ${calcH.toFixed(2)} cm | Volume = ${finalV.toFixed(2)} cm³ | CSA = ${finalCSA.toFixed(2)} cm² | TSA = ${finalTSA.toFixed(2)} cm²`,
          formulasUsed: formulas,
          tipsHi: 'बेलन का आयतन हमेशा (आधार का क्षेत्रफल × ऊंचाई) होता है।',
          tipsEn: 'Cylinder volume is always (Base Area × Height).',
        };
      }

      return {
        titleHi: 'बेलन (Cylinder): मान भरें',
        titleEn: 'Cylinder: Enter Values',
        category: '3D Mensuration',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'कम से कम कोई 2 मान भरें (उदा: V व r, या CSA व r, या r व h)',
        toFindEn: 'Fill at least 2 values (e.g. V & r, or CSA & r, or r & h)',
        stepsHi: [
          'कृपया बेलन के इनपुट में से कोई भी 2 मान भरें और बाकी खाली छोड़ें।',
          'खाली छोड़े गए मान को ऐप तुरंत किताब की तरह चरणबद्ध तरीके से निकाल देगा!',
        ],
        stepsEn: [
          'Please enter any 2 parameters above and leave the rest blank.',
          'The app will calculate all missing values with step-by-step NCERT formulas.',
        ],
        finalAnswerHi: 'कृपया 2 मान भरें या नीचे दिए गए क्विक प्रीसेट पर क्लिक करें।',
        finalAnswerEn: 'Please enter 2 values or click a quick preset below.',
        formulasUsed: ['V = πr²h', 'CSA = 2πrh', 'TSA = 2πr(r + h)'],
      };
    },
  },

  // 3. शंकु (Cone): V, r, h, l, CSA, TSA
  {
    id: 'cone',
    nameHi: 'शंकु (Cone)',
    nameEn: 'Cone',
    categoryHi: '3D ठोस (3D Solids)',
    categoryEn: '3D Mensuration',
    icon: '🍦',
    badge: 'V = ⅓πr²h | l = √(r²+h²)',
    mainFormulaText: 'आयतन V = ⅓πr²h | तिर्यक ऊंचाई l = √(r² + h²) | CSA = πrl | TSA = πr(r + l)',
    descriptionHi: 'आयतन (V), त्रिज्या (r), ऊंचाई (h), तिर्यक ऊंचाई (l), CSA में से कोई भी 2 मान भरें, छूटा हुआ मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 2 values among Volume, Radius, Height, Slant Height, CSA; the app will solve missing values.',
    variables: [
      { key: 'volume', symbol: 'V', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', unitHi: 'सेमी³ (cm³)', unitEn: 'cu cm' },
      { key: 'radius', symbol: 'r', labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'height', symbol: 'h', labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'slantHeight', symbol: 'l', labelHi: 'तिर्यक ऊंचाई (Slant Height l)', labelEn: 'Slant Height (l)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'csa', symbol: 'CSA', labelHi: 'वक्र पृष्ठ (Curved Surface CSA)', labelEn: 'Curved Surface (CSA)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'tsa', symbol: 'TSA', labelHi: 'कुल पृष्ठ (Total Surface TSA)', labelEn: 'Total Surface (TSA)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
    ],
    presets: [
      {
        nameHi: 'V = 314, h = 12 ⇒ त्रिज्या (r) व l निकालें',
        nameEn: 'V = 314, h = 12 ⇒ Find Radius & Slant Height',
        values: { volume: 314, radius: null, height: 12, slantHeight: null, csa: null, tsa: null },
        descriptionHi: 'आयतन व ऊंचाई दी है, त्रिज्या, तिर्यक ऊंचाई व CSA निकालें।',
        descriptionEn: 'Given Volume and Height, find Radius, Slant Height, and CSA.',
      },
      {
        nameHi: 'r = 3, h = 4 ⇒ l, V, CSA निकालें',
        nameEn: 'r = 3, h = 4 ⇒ Find l, V, CSA',
        values: { volume: null, radius: 3, height: 4, slantHeight: null, csa: null, tsa: null },
        descriptionHi: 'त्रिज्या व ऊंचाई दी है (3-4-5 पाइथागोरस त्रिक)।',
        descriptionEn: 'Given Radius and Height (3-4-5 Pythagorean triplet).',
      },
      {
        nameHi: 'CSA = 220, r = 7 ⇒ l व h निकालें',
        nameEn: 'CSA = 220, r = 7 ⇒ Find Slant Height & Height',
        values: { volume: null, radius: 7, height: null, slantHeight: null, csa: 220, tsa: null },
        descriptionHi: 'वक्र पृष्ठ व त्रिज्या से तिर्यक ऊंचाई व ऊंचाई निकालें।',
        descriptionEn: 'Find Slant Height and Height from CSA and Radius.',
      },
    ],
    solve: (inputs) => {
      const V = inputs.volume;
      const r = inputs.radius;
      const h = inputs.height;
      const l = inputs.slantHeight;
      const csa = inputs.csa;

      let calcR: number | null = null;
      let calcH: number | null = null;
      let calcL: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (V !== null && V !== undefined) givenData.push({ labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` });
      if (r !== null && r !== undefined) givenData.push({ labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', value: `${r} सेमी` });
      if (h !== null && h !== undefined) givenData.push({ labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', value: `${h} सेमी` });
      if (l !== null && l !== undefined) givenData.push({ labelHi: 'तिर्यक ऊंचाई (Slant Height l)', labelEn: 'Slant Height (l)', value: `${l} सेमी` });
      if (csa !== null && csa !== undefined) givenData.push({ labelHi: 'वक्र पृष्ठ (CSA)', labelEn: 'CSA', value: `${csa} सेमी²` });

      if (r && h) {
        calcR = r;
        calcH = h;
        calcL = Math.hypot(r, h);
        stepsHi.push(`चरण 1 (तिर्यक ऊंचाई): l = √(r² + h²) = √(${r}² + ${h}²) = √(${r * r + h * h}) = ${calcL.toFixed(2)} सेमी`);
        stepsHi.push(`चरण 2 (आयतन सूत्र): V = ⅓ × π × r² × h = ⅓ × (22/7) × ${r}² × ${h} = ${(Math.PI * r * r * h / 3).toFixed(2)} सेमी³`);
        stepsEn.push(`Step 1: Slant Height l = √(r² + h²) = ${calcL.toFixed(2)} cm`);
        stepsEn.push(`Step 2: Volume V = ⅓πr²h = ${(Math.PI * r * r * h / 3).toFixed(2)} cu cm`);
        formulas.push('l = √(r² + h²)', 'V = ⅓πr²h', 'CSA = πrl');
      } else if (V && h) {
        calcH = h;
        calcR = Math.sqrt((3 * V) / (Math.PI * h));
        calcL = Math.hypot(calcR, calcH);
        stepsHi.push(`चरण 1 (मानक सूत्र): शंकु का आयतन (V) = ⅓ × π × r² × h`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${V} = ⅓ × π × r² × ${h}`);
        stepsHi.push(`चरण 3 (पक्षांतरण): r² = (3 × ${V}) / (π × ${h}) = ${(3 * V / (Math.PI * h)).toFixed(2)}`);
        stepsHi.push(`चरण 4 (त्रिज्या r): r = √(${(3 * V / (Math.PI * h)).toFixed(2)}) = ${calcR.toFixed(2)} सेमी`);
        stepsHi.push(`चरण 5 (तिर्यक ऊंचाई l): l = √(r² + h²) = √(${calcR.toFixed(2)}² + ${h}²) = ${calcL.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: V = ⅓πr²h`);
        stepsEn.push(`Step 2: r² = (3V) / (πh) = ${(3 * V / (Math.PI * h)).toFixed(2)}`);
        stepsEn.push(`Step 3: r = ${calcR.toFixed(2)} cm, l = ${calcL.toFixed(2)} cm`);
        formulas.push('r = √(3V / (πh))', 'l = √(r² + h²)', 'CSA = πrl');
      } else if (V && r) {
        calcR = r;
        calcH = (3 * V) / (Math.PI * r * r);
        calcL = Math.hypot(calcR, calcH);
        stepsHi.push(`चरण 1: आयतन V = ⅓πr²h ⇒ h = (3 × V) / (π × r²) = (3 × ${V}) / (π × ${r}²) = ${calcH.toFixed(2)} सेमी`);
        stepsHi.push(`चरण 2: तिर्यक ऊंचाई l = √(r² + h²) = √(${r}² + ${calcH.toFixed(2)}²) = ${calcL.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: h = (3V) / (πr²) = ${calcH.toFixed(2)} cm`);
        stepsEn.push(`Step 2: l = √(r² + h²) = ${calcL.toFixed(2)} cm`);
        formulas.push('h = 3V / (πr²)', 'l = √(r² + h²)', 'CSA = πrl');
      } else if (csa && r) {
        calcR = r;
        calcL = csa / (Math.PI * r);
        if (calcL >= calcR) {
          calcH = Math.sqrt(calcL * calcL - calcR * calcR);
        } else {
          calcH = 0;
        }
        stepsHi.push(`चरण 1: वक्र पृष्ठ CSA = π × r × l ⇒ l = CSA / (π × r) = ${csa} / (π × ${r}) = ${calcL.toFixed(2)} सेमी`);
        stepsHi.push(`चरण 2: ऊंचाई h = √(l² - r²) = √(${calcL.toFixed(2)}² - ${r}²) = ${calcH.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Slant height l = CSA / (πr) = ${calcL.toFixed(2)} cm`);
        stepsEn.push(`Step 2: Height h = √(l² - r²) = ${calcH.toFixed(2)} cm`);
        formulas.push('l = CSA / (πr)', 'h = √(l² - r²)', 'V = ⅓πr²h');
      } else if (r && l) {
        calcR = r;
        calcL = l;
        if (l >= r) {
          calcH = Math.sqrt(l * l - r * r);
        } else {
          calcH = 0;
        }
        stepsHi.push(`चरण 1: ऊंचाई h = √(l² - r²) = √(${l}² - ${r}²) = ${calcH.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Height h = √(l² - r²) = ${calcH.toFixed(2)} cm`);
        formulas.push('h = √(l² - r²)', 'V = ⅓πr²h', 'CSA = πrl');
      }

      if (calcR !== null && calcH !== null && calcL !== null) {
        const finalV = (Math.PI * calcR * calcR * calcH) / 3;
        const finalCSA = Math.PI * calcR * calcL;
        const finalTSA = Math.PI * calcR * (calcR + calcL);

        stepsHi.push(`\n[अतिरिक्त गणनाएं]:`);
        stepsHi.push(`• आयतन (Volume V) = ⅓πr²h = ${finalV.toFixed(2)} सेमी³`);
        stepsHi.push(`• वक्र पृष्ठ (CSA) = πrl = ${finalCSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• कुल पृष्ठ (TSA) = πr(r + l) = ${finalTSA.toFixed(2)} सेमी²`);

        return {
          titleHi: `शंकु का पूर्ण हल (r = ${calcR.toFixed(2)} सेमी, h = ${calcH.toFixed(2)} सेमी, l = ${calcL.toFixed(2)} सेमी)`,
          titleEn: `Cone Solution (r = ${calcR.toFixed(2)} cm, h = ${calcH.toFixed(2)} cm, l = ${calcL.toFixed(2)} cm)`,
          category: '3D Mensuration: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'तिर्यक ऊंचाई (l), ऊंचाई (h), त्रिज्या (r), आयतन (V), CSA व TSA',
          toFindEn: 'Slant Height, Height, Radius, Volume, and Surface Areas',
          stepsHi,
          stepsEn,
          finalAnswerHi: `त्रिज्या (r) = ${calcR.toFixed(2)} सेमी | ऊंचाई (h) = ${calcH.toFixed(2)} सेमी | तिर्यक ऊंचाई (l) = ${calcL.toFixed(2)} सेमी | आयतन (V) = ${finalV.toFixed(2)} सेमी³ | CSA = ${finalCSA.toFixed(2)} सेमी² | TSA = ${finalTSA.toFixed(2)} सेमी²`,
          finalAnswerEn: `Radius = ${calcR.toFixed(2)} cm | Height = ${calcH.toFixed(2)} cm | Slant Height = ${calcL.toFixed(2)} cm | Volume = ${finalV.toFixed(2)} cm³ | CSA = ${finalCSA.toFixed(2)} cm²`,
          formulasUsed: formulas,
          tipsHi: 'शंकु में त्रिज्या (r), ऊंचाई (h) और तिर्यक ऊंचाई (l) एक समकोण त्रिभुज बनाते हैं: l² = r² + h²।',
          tipsEn: 'Radius (r), Height (h) and Slant Height (l) form a right triangle: l² = r² + h².',
        };
      }

      return {
        titleHi: 'शंकु (Cone): मान भरें',
        titleEn: 'Cone: Enter Values',
        category: '3D Mensuration',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'कम से कम कोई 2 मान भरें (उदा: V व h, या r व h, या CSA व r)',
        toFindEn: 'Fill at least 2 parameters (e.g. V & h, or r & h, or CSA & r)',
        stepsHi: [
          'कृपया शंकु के इनपुट में से कोई 2 मान भरें और बाकी खाली छोड़ें।',
          'ऐप छूटे हुए मान (त्रिज्या, ऊंचाई, तिर्यक ऊंचाई) को अपने आप निकाल देगा!',
        ],
        stepsEn: [
          'Please enter any 2 parameters above and leave the rest blank.',
          'The app will calculate the missing slant height, volume, and areas automatically.',
        ],
        finalAnswerHi: 'कृपया 2 मान भरें या क्विक प्रीसेट पर क्लिक करें।',
        finalAnswerEn: 'Please enter 2 values or click a quick preset below.',
        formulasUsed: ['V = ⅓πr²h', 'l = √(r² + h²)', 'CSA = πrl'],
      };
    },
  },

  // 4. वर्ग (Square): a, A, P, d
  {
    id: 'square',
    nameHi: 'वर्ग (Square)',
    nameEn: 'Square',
    categoryHi: '2D क्षेत्रमिति (2D Mensuration)',
    categoryEn: '2D Geometry',
    icon: '⬛',
    badge: 'A = a² | P = 4a | d = a√2',
    mainFormulaText: 'क्षेत्रफल A = a² | परिमाप P = 4a | विकर्ण d = a√2 | भुजा a = √A = P/4 = d/√2',
    descriptionHi: 'भुजा (a), क्षेत्रफल (A), परिमाप (P), या विकर्ण (d) में से केवल कोई 1 मान भरें, बाकी सभी 3 मान अपने आप निकल जाएंगे।',
    descriptionEn: 'Enter just 1 parameter among Side (a), Area (A), Perimeter (P), Diagonal (d); all remaining values will be calculated.',
    variables: [
      { key: 'side', symbol: 'a', labelHi: 'भुजा (Side a)', labelEn: 'Side (a)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'area', symbol: 'A', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'perimeter', symbol: 'P', labelHi: 'परिमाप (Perimeter P)', labelEn: 'Perimeter (P)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'diagonal', symbol: 'd', labelHi: 'विकर्ण (Diagonal d)', labelEn: 'Diagonal (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
    ],
    presets: [
      {
        nameHi: 'A = 144 ⇒ भुजा (a), P व d निकालें',
        nameEn: 'A = 144 ⇒ Find Side, P & Diagonal',
        values: { side: null, area: 144, perimeter: null, diagonal: null },
        descriptionHi: 'क्षेत्रफल से भुजा, परिमाप व विकर्ण ज्ञात करना।',
        descriptionEn: 'Given Area, find Side, Perimeter, and Diagonal.',
      },
      {
        nameHi: 'P = 48 ⇒ भुजा (a) व क्षेत्रफल (A) निकालें',
        nameEn: 'P = 48 ⇒ Find Side & Area',
        values: { side: null, area: null, perimeter: 48, diagonal: null },
        descriptionHi: 'परिमाप से भुजा व क्षेत्रफल ज्ञात करना।',
        descriptionEn: 'Given Perimeter, find Side and Area.',
      },
      {
        nameHi: 'd = 10√2 (14.14) ⇒ भुजा व A निकालें',
        nameEn: 'd = 14.14 ⇒ Find Side & Area',
        values: { side: null, area: null, perimeter: null, diagonal: 14.142 },
        descriptionHi: 'विकर्ण से भुजा व क्षेत्रफल ज्ञात करना।',
        descriptionEn: 'Given Diagonal, find Side and Area.',
      },
      {
        nameHi: 'a = 12 ⇒ A, P व d सब निकालें',
        nameEn: 'a = 12 ⇒ Find A, P, d',
        values: { side: 12, area: null, perimeter: null, diagonal: null },
        descriptionHi: 'भुजा से क्षेत्रफल, परिमाप व विकर्ण ज्ञात करना।',
        descriptionEn: 'Given Side, calculate Area, Perimeter, and Diagonal.',
      },
    ],
    solve: (inputs) => {
      let side: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (inputs.side) {
        side = inputs.side;
        givenData.push({ labelHi: 'भुजा (Side a)', labelEn: 'Side (a)', value: `${side} सेमी` });
        stepsHi.push(`चरण 1: दी गई भुजा a = ${side} सेमी`);
        stepsEn.push(`Step 1: Given side a = ${side} cm`);
        formulas.push('A = a²', 'P = 4a', 'd = a√2');
      } else if (inputs.area) {
        const A = inputs.area;
        side = Math.sqrt(A);
        givenData.push({ labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` });
        stepsHi.push(`चरण 1 (मानक सूत्र): क्षेत्रफल (A) = भुजा² (a²)`);
        stepsHi.push(`चरण 2 (वर्गमूल लेने पर): a = √A = √${A} = ${side.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Area (A) = a²`);
        stepsEn.push(`Step 2: a = √A = √${A} = ${side.toFixed(2)} cm`);
        formulas.push('a = √A', 'P = 4a', 'd = a√2');
      } else if (inputs.perimeter) {
        const P = inputs.perimeter;
        side = P / 4;
        givenData.push({ labelHi: 'परिमाप (Perimeter P)', labelEn: 'Perimeter (P)', value: `${P} सेमी` });
        stepsHi.push(`चरण 1 (मानक सूत्र): परिमाप (P) = 4 × भुजा (4a)`);
        stepsHi.push(`चरण 2 (पक्षांतरण): a = P / 4 = ${P} / 4 = ${side.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Perimeter (P) = 4a`);
        stepsEn.push(`Step 2: a = P / 4 = ${side.toFixed(2)} cm`);
        formulas.push('a = P / 4', 'A = a²', 'd = a√2');
      } else if (inputs.diagonal) {
        const d = inputs.diagonal;
        side = d / Math.SQRT2;
        givenData.push({ labelHi: 'विकर्ण (Diagonal d)', labelEn: 'Diagonal (d)', value: `${d} सेमी` });
        stepsHi.push(`चरण 1 (मानक सूत्र): विकर्ण (d) = a × √2`);
        stepsHi.push(`चरण 2 (पक्षांतरण): a = d / √2 = ${d} / 1.4142 = ${side.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Diagonal d = a√2`);
        stepsEn.push(`Step 2: a = d / √2 = ${side.toFixed(2)} cm`);
        formulas.push('a = d / √2', 'A = a²', 'P = 4a');
      }

      if (side !== null && !isNaN(side)) {
        const finalA = side * side;
        const finalP = 4 * side;
        const finalD = side * Math.SQRT2;

        stepsHi.push(`\n[सभी मानों की गणना]:`);
        stepsHi.push(`• भुजा (Side a) = ${side.toFixed(2)} सेमी`);
        stepsHi.push(`• क्षेत्रफल (Area A) = a² = ${side.toFixed(2)}² = ${finalA.toFixed(2)} सेमी²`);
        stepsHi.push(`• परिमाप (Perimeter P) = 4 × a = 4 × ${side.toFixed(2)} = ${finalP.toFixed(2)} सेमी`);
        stepsHi.push(`• विकर्ण (Diagonal d) = a × √2 = ${side.toFixed(2)} × 1.4142 = ${finalD.toFixed(2)} सेमी`);

        stepsEn.push(`\n[All Parameters]:`);
        stepsEn.push(`• Side = ${side.toFixed(2)} cm`);
        stepsEn.push(`• Area = ${finalA.toFixed(2)} cm²`);
        stepsEn.push(`• Perimeter = ${finalP.toFixed(2)} cm`);
        stepsEn.push(`• Diagonal = ${finalD.toFixed(2)} cm`);

        return {
          titleHi: `वर्ग का पूर्ण हल (भुजा a = ${side.toFixed(2)} सेमी)`,
          titleEn: `Complete Square Solution (Side a = ${side.toFixed(2)} cm)`,
          category: '2D Geometry: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'भुजा (a), क्षेत्रफल (A), परिमाप (P), विकर्ण (d)',
          toFindEn: 'Side, Area, Perimeter, Diagonal',
          stepsHi,
          stepsEn,
          finalAnswerHi: `भुजा (a) = ${side.toFixed(2)} सेमी | क्षेत्रफल (A) = ${finalA.toFixed(2)} सेमी² | परिमाप (P) = ${finalP.toFixed(2)} सेमी | विकर्ण (d) = ${finalD.toFixed(2)} सेमी`,
          finalAnswerEn: `Side = ${side.toFixed(2)} cm | Area = ${finalA.toFixed(2)} cm² | Perimeter = ${finalP.toFixed(2)} cm | Diagonal = ${finalD.toFixed(2)} cm`,
          formulasUsed: formulas,
          tipsHi: 'वर्ग का क्षेत्रफल विकर्ण के पदों में: A = d² / 2 भी होता है।',
          tipsEn: 'Square area in terms of diagonal: A = d² / 2.',
        };
      }

      return {
        titleHi: 'वर्ग (Square): कोई 1 मान भरें',
        titleEn: 'Square: Enter 1 Value',
        category: '2D Geometry',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'भुजा, क्षेत्रफल, परिमाप या विकर्ण में से कोई भी 1 मान भरें',
        toFindEn: 'Enter any 1 parameter among Side, Area, Perimeter, or Diagonal',
        stepsHi: ['कृपया कोई 1 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter any 1 value and leave the rest blank.'],
        finalAnswerHi: 'कृपया 1 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 1 value or select a preset.',
        formulasUsed: ['A = a²', 'P = 4a', 'd = a√2'],
      };
    },
  },

  // 5. वृत्त (Circle): r, d, C, A
  {
    id: 'circle',
    nameHi: 'वृत्त (Circle)',
    nameEn: 'Circle',
    categoryHi: '2D क्षेत्रमिति (2D Mensuration)',
    categoryEn: '2D Geometry',
    icon: '⭕',
    badge: 'A = πr² | C = 2πr | d = 2r',
    mainFormulaText: 'क्षेत्रफल A = πr² | परिधि C = 2πr = πd | व्यास d = 2r | त्रिज्या r = d/2 = C/(2π) = √(A/π)',
    descriptionHi: 'त्रिज्या (r), व्यास (d), परिधि (C), या क्षेत्रफल (A) में से केवल कोई 1 मान भरें, बाकी सभी 3 मान ऐप तुरंत हल करेगा।',
    descriptionEn: 'Enter just 1 parameter among Radius, Diameter, Circumference, Area; the remaining 3 will be solved.',
    variables: [
      { key: 'radius', symbol: 'r', labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'diameter', symbol: 'd', labelHi: 'व्यास (Diameter d)', labelEn: 'Diameter (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'circumference', symbol: 'C', labelHi: 'परिधि (Circumference C)', labelEn: 'Circumference (C)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'area', symbol: 'A', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
    ],
    presets: [
      {
        nameHi: 'A = 154 ⇒ त्रिज्या (r), परिधि व व्यास निकालें',
        nameEn: 'A = 154 ⇒ Find Radius, C & d',
        values: { radius: null, diameter: null, circumference: null, area: 154 },
        descriptionHi: 'क्षेत्रफल 154 से त्रिज्या 7, परिधि 44 सेमी ज्ञात करना।',
        descriptionEn: 'Given Area = 154, find Radius = 7 and Circumference = 44.',
      },
      {
        nameHi: 'C = 88 ⇒ त्रिज्या (r) व क्षेत्रफल (A) निकालें',
        nameEn: 'C = 88 ⇒ Find Radius & Area',
        values: { radius: null, diameter: null, circumference: 88, area: null },
        descriptionHi: 'परिधि 88 से त्रिज्या 14 व क्षेत्रफल 616 सेमी² निकालना।',
        descriptionEn: 'Given Circumference = 88, find Radius and Area.',
      },
      {
        nameHi: 'd = 14 ⇒ त्रिज्या (r), परिधि (C) व A निकालें',
        nameEn: 'd = 14 ⇒ Find r, C & Area',
        values: { radius: null, diameter: 14, circumference: null, area: null },
        descriptionHi: 'व्यास 14 से त्रिज्या 7, परिधि 44 व क्षेत्रफल 154।',
        descriptionEn: 'Given Diameter = 14, find Radius, Circumference, and Area.',
      },
    ],
    solve: (inputs) => {
      let r: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (inputs.radius) {
        r = inputs.radius;
        givenData.push({ labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', value: `${r} सेमी` });
        stepsHi.push(`चरण 1: दी गई त्रिज्या r = ${r} सेमी`);
        stepsEn.push(`Step 1: Given radius r = ${r} cm`);
        formulas.push('d = 2r', 'C = 2πr', 'A = πr²');
      } else if (inputs.diameter) {
        const d = inputs.diameter;
        r = d / 2;
        givenData.push({ labelHi: 'व्यास (Diameter d)', labelEn: 'Diameter (d)', value: `${d} सेमी` });
        stepsHi.push(`चरण 1 (सूत्र): त्रिज्या (r) = व्यास / 2`);
        stepsHi.push(`चरण 2: r = ${d} / 2 = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Radius r = d / 2 = ${d} / 2 = ${r.toFixed(2)} cm`);
        formulas.push('r = d / 2', 'C = 2πr', 'A = πr²');
      } else if (inputs.circumference) {
        const C = inputs.circumference;
        r = C / (2 * Math.PI);
        givenData.push({ labelHi: 'परिधि (Circumference C)', labelEn: 'Circumference (C)', value: `${C} सेमी` });
        stepsHi.push(`चरण 1 (मानक सूत्र): परिधि (C) = 2 × π × r`);
        stepsHi.push(`चरण 2 (पक्षांतरण): r = C / (2π) = ${C} / (2 × 22/7) = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Circumference C = 2πr`);
        stepsEn.push(`Step 2: r = C / (2π) = ${r.toFixed(2)} cm`);
        formulas.push('r = C / (2π)', 'd = 2r', 'A = πr²');
      } else if (inputs.area) {
        const A = inputs.area;
        r = Math.sqrt(A / Math.PI);
        givenData.push({ labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` });
        stepsHi.push(`चरण 1 (मानक सूत्र): वृत्त का क्षेत्रफल (A) = π × r²`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${A} = (22/7) × r²`);
        stepsHi.push(`चरण 3 (पक्षांतरण): r² = ${A} / (22/7) = ${(A / Math.PI).toFixed(2)}`);
        stepsHi.push(`चरण 4 (वर्गमूल): r = √(${(A / Math.PI).toFixed(2)}) = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Area A = πr²`);
        stepsEn.push(`Step 2: r² = A / π = ${(A / Math.PI).toFixed(2)}`);
        stepsEn.push(`Step 3: r = √(A / π) = ${r.toFixed(2)} cm`);
        formulas.push('r = √(A / π)', 'd = 2r', 'C = 2πr');
      }

      if (r !== null && !isNaN(r)) {
        const finalD = 2 * r;
        const finalC = 2 * Math.PI * r;
        const finalA = Math.PI * r * r;

        stepsHi.push(`\n[सभी मानों की गणना]:`);
        stepsHi.push(`• त्रिज्या (Radius r) = ${r.toFixed(2)} सेमी`);
        stepsHi.push(`• व्यास (Diameter d) = 2r = 2 × ${r.toFixed(2)} = ${finalD.toFixed(2)} सेमी`);
        stepsHi.push(`• परिधि (Circumference C) = 2πr = 2 × (22/7) × ${r.toFixed(2)} = ${finalC.toFixed(2)} सेमी`);
        stepsHi.push(`• क्षेत्रफल (Area A) = πr² = (22/7) × ${r.toFixed(2)}² = ${finalA.toFixed(2)} सेमी²`);

        return {
          titleHi: `वृत्त का पूर्ण हल (त्रिज्या r = ${r.toFixed(2)} सेमी)`,
          titleEn: `Circle Solution (Radius r = ${r.toFixed(2)} cm)`,
          category: '2D Geometry: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'त्रिज्या (r), व्यास (d), परिधि (C), क्षेत्रफल (A)',
          toFindEn: 'Radius, Diameter, Circumference, Area',
          stepsHi,
          stepsEn,
          finalAnswerHi: `त्रिज्या (r) = ${r.toFixed(2)} सेमी | व्यास (d) = ${finalD.toFixed(2)} सेमी | परिधि (C) = ${finalC.toFixed(2)} सेमी | क्षेत्रफल (A) = ${finalA.toFixed(2)} सेमी²`,
          finalAnswerEn: `Radius = ${r.toFixed(2)} cm | Diameter = ${finalD.toFixed(2)} cm | Circumference = ${finalC.toFixed(2)} cm | Area = ${finalA.toFixed(2)} cm²`,
          formulasUsed: formulas,
          tipsHi: 'यदि त्रिज्या 7 का गुणज हो (जैसे 7, 14, 21, 28...), तो परिधि = 44, 88, 132... और क्षेत्रफल = 154, 616, 1386... होता है।',
          tipsEn: 'Radius multiple of 7 shortcut: r=7 => C=44, A=154; r=14 => C=88, A=616.',
        };
      }

      return {
        titleHi: 'वृत्त (Circle): कोई 1 मान भरें',
        titleEn: 'Circle: Enter 1 Value',
        category: '2D Geometry',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'त्रिज्या, व्यास, परिधि या क्षेत्रफल में से कोई 1 मान भरें',
        toFindEn: 'Enter any 1 value among Radius, Diameter, Circumference, Area',
        stepsHi: ['कृपया कोई 1 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 1 value and leave the rest blank.'],
        finalAnswerHi: 'कृपया 1 मान भरें या प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 1 value or select a preset.',
        formulasUsed: ['A = πr²', 'C = 2πr', 'd = 2r'],
      };
    },
  },

  // 6. साधारण ब्याज (Simple Interest): P, R, T, SI, A
  {
    id: 'simple_interest',
    nameHi: 'साधारण ब्याज (Simple Interest - SI)',
    nameEn: 'Simple Interest',
    categoryHi: 'अंकगणित व वाणिज्य (Commercial Math)',
    categoryEn: 'Arithmetic',
    icon: '💰',
    badge: 'SI = (P × R × T) / 100',
    mainFormulaText: 'ब्याज SI = (P × R × T)/100 | मिश्रधन A = P + SI | मूलधन P = (SI × 100)/(R × T) | दर R = (SI × 100)/(P × T) | समय T = (SI × 100)/(P × R)',
    descriptionHi: 'मूलधन (P), ब्याज दर (R %), समय (T वर्ष), साधारण ब्याज (SI), या मिश्रधन (A) में से कोई भी 3 मान भरें, छूटा हुआ मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 3 values among Principal, Rate %, Time (years), SI, or Total Amount; the app will solve the blank variable.',
    variables: [
      { key: 'principal', symbol: 'P', labelHi: 'मूलधन (Principal P)', labelEn: 'Principal (P)', unitHi: '₹', unitEn: '₹' },
      { key: 'rate', symbol: 'R', labelHi: 'ब्याज दर (Rate R % वार्षिक)', labelEn: 'Rate (R % p.a.)', unitHi: '%', unitEn: '%' },
      { key: 'time', symbol: 'T', labelHi: 'समय (Time T वर्ष)', labelEn: 'Time (T years)', unitHi: 'वर्ष (yrs)', unitEn: 'yrs' },
      { key: 'si', symbol: 'SI', labelHi: 'साधारण ब्याज (Simple Interest SI)', labelEn: 'Simple Interest (SI)', unitHi: '₹', unitEn: '₹' },
      { key: 'amount', symbol: 'A', labelHi: 'मिश्रधन (Total Amount A)', labelEn: 'Total Amount (A)', unitHi: '₹', unitEn: '₹' },
    ],
    presets: [
      {
        nameHi: 'SI = 1200, R = 10%, T = 2 वर्ष ⇒ मूलधन (P) निकालें',
        nameEn: 'SI = 1200, R = 10%, T = 2 yrs ⇒ Find Principal (P)',
        values: { principal: null, rate: 10, time: 2, si: 1200, amount: null },
        descriptionHi: 'ब्याज, दर व समय से मूलधन ज्ञात करना।',
        descriptionEn: 'Given SI, Rate, and Time, find Principal and Total Amount.',
      },
      {
        nameHi: 'P = 5000, SI = 1500, T = 3 वर्ष ⇒ दर (R %) निकालें',
        nameEn: 'P = 5000, SI = 1500, T = 3 yrs ⇒ Find Rate (R %)',
        values: { principal: 5000, rate: null, time: 3, si: 1500, amount: null },
        descriptionHi: 'मूलधन, ब्याज व समय से ब्याज दर (R %) ज्ञात करना।',
        descriptionEn: 'Given Principal, SI, and Time, find Rate %.',
      },
      {
        nameHi: 'P = 8000, R = 5%, T = 3 वर्ष ⇒ ब्याज (SI) व मिश्रधन (A) निकालें',
        nameEn: 'P = 8000, R = 5%, T = 3 yrs ⇒ Find SI & Amount',
        values: { principal: 8000, rate: 5, time: 3, si: null, amount: null },
        descriptionHi: 'मूलधन, दर व समय से ब्याज व मिश्रधन ज्ञात करना।',
        descriptionEn: 'Calculate SI and Total Amount from P, R, and T.',
      },
    ],
    solve: (inputs) => {
      let P = inputs.principal;
      let R = inputs.rate;
      let T = inputs.time;
      let SI = inputs.si;
      const A = inputs.amount;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (P !== null && P !== undefined) givenData.push({ labelHi: 'मूलधन (P)', labelEn: 'Principal (P)', value: `₹${P}` });
      if (R !== null && R !== undefined) givenData.push({ labelHi: 'ब्याज दर (R)', labelEn: 'Rate (R)', value: `${R}% वार्षिक` });
      if (T !== null && T !== undefined) givenData.push({ labelHi: 'समय (T)', labelEn: 'Time (T)', value: `${T} वर्ष` });
      if (SI !== null && SI !== undefined) givenData.push({ labelHi: 'साधारण ब्याज (SI)', labelEn: 'Simple Interest (SI)', value: `₹${SI}` });
      if (A !== null && A !== undefined) givenData.push({ labelHi: 'मिश्रधन (A)', labelEn: 'Total Amount (A)', value: `₹${A}` });

      if (A && P && !SI) {
        SI = A - P;
        stepsHi.push(`चरण (ब्याज संबंध): SI = मिश्रधन (A) - मूलधन (P) = ${A} - ${P} = ₹${SI}`);
        stepsEn.push(`Step: SI = Amount - Principal = ${A} - ${P} = ₹${SI}`);
      }

      if (P && R && T && !SI) {
        SI = (P * R * T) / 100;
        stepsHi.push(`चरण 1 (मानक सूत्र): साधारण ब्याज (SI) = (P × R × T) / 100`);
        stepsHi.push(`चरण 2 (मान रखने पर): SI = (${P} × ${R} × ${T}) / 100 = ₹${SI.toFixed(2)}`);
        stepsEn.push(`Step 1 (Formula): SI = (P × R × T) / 100`);
        stepsEn.push(`Step 2 (Calculation): SI = (${P} × ${R} × ${T}) / 100 = ₹${SI.toFixed(2)}`);
        formulas.push('SI = (P × R × T) / 100', 'A = P + SI');
      } else if (SI && R && T && !P) {
        P = (SI * 100) / (R * T);
        stepsHi.push(`चरण 1 (मानक सूत्र): SI = (P × R × T) / 100`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${SI} = (P × ${R} × ${T}) / 100`);
        stepsHi.push(`चरण 3 (पक्षांतरण द्वारा मूलधन P अलग करने पर): P = (SI × 100) / (R × T) = (${SI} × 100) / (${R} × ${T}) = ₹${P.toFixed(2)}`);
        stepsEn.push(`Step 1: SI = (P × R × T) / 100`);
        stepsEn.push(`Step 2: P = (SI × 100) / (R × T) = ₹${P.toFixed(2)}`);
        formulas.push('P = (SI × 100) / (R × T)', 'A = P + SI');
      } else if (SI && P && T && !R) {
        R = (SI * 100) / (P * T);
        stepsHi.push(`चरण 1 (मानक सूत्र): SI = (P × R × T) / 100`);
        stepsHi.push(`चरण 2 (पक्षांतरण द्वारा दर R अलग करने पर): R = (SI × 100) / (P × T) = (${SI} × 100) / (${P} × ${T}) = ${R.toFixed(2)}%`);
        stepsEn.push(`Step 1: Rate R = (SI × 100) / (P × T) = ${R.toFixed(2)}%`);
        formulas.push('R = (SI × 100) / (P × T)', 'A = P + SI');
      } else if (SI && P && R && !T) {
        T = (SI * 100) / (P * R);
        stepsHi.push(`चरण 1 (मानक सूत्र): SI = (P × R × T) / 100`);
        stepsHi.push(`चरण 2 (पक्षांतरण द्वारा समय T अलग करने पर): T = (SI × 100) / (P × R) = (${SI} × 100) / (${P} × ${R}) = ${T.toFixed(2)} वर्ष`);
        stepsEn.push(`Step 1: Time T = (SI × 100) / (P × R) = ${T.toFixed(2)} years`);
        formulas.push('T = (SI × 100) / (P × R)', 'A = P + SI');
      }

      if (P !== null && P !== undefined && R !== null && R !== undefined && T !== null && T !== undefined && SI !== null && SI !== undefined) {
        const finalA = P + SI;
        stepsHi.push(`\n[अंतिम परिणाम]:`);
        stepsHi.push(`• मूलधन (P) = ₹${P.toFixed(2)}`);
        stepsHi.push(`• ब्याज दर (R) = ${R.toFixed(2)}% वार्षिक`);
        stepsHi.push(`• समय (T) = ${T.toFixed(2)} वर्ष`);
        stepsHi.push(`• साधारण ब्याज (SI) = ₹${SI.toFixed(2)}`);
        stepsHi.push(`• मिश्रधन (Total Amount A) = P + SI = ₹${P.toFixed(2)} + ₹${SI.toFixed(2)} = ₹${finalA.toFixed(2)}`);

        return {
          titleHi: `साधारण ब्याज का पूर्ण हल (SI = ₹${SI.toFixed(2)}, A = ₹${finalA.toFixed(2)})`,
          titleEn: `Simple Interest Solution (SI = ₹${SI.toFixed(2)}, Amount = ₹${finalA.toFixed(2)})`,
          category: 'Commercial Math: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'अज्ञात मूलधन, दर, समय, ब्याज या मिश्रधन',
          toFindEn: 'Missing Principal, Rate, Time, Interest, or Amount',
          stepsHi,
          stepsEn,
          finalAnswerHi: `मूलधन (P) = ₹${P.toFixed(2)} | दर (R) = ${R.toFixed(2)}% | समय (T) = ${T.toFixed(2)} वर्ष | ब्याज (SI) = ₹${SI.toFixed(2)} | मिश्रधन (A) = ₹${finalA.toFixed(2)}`,
          finalAnswerEn: `Principal = ₹${P.toFixed(2)} | Rate = ${R.toFixed(2)}% | Time = ${T.toFixed(2)} yrs | SI = ₹${SI.toFixed(2)} | Amount = ₹${finalA.toFixed(2)}`,
          formulasUsed: formulas,
          tipsHi: 'मिश्रधन (Amount) = मूलधन (Principal) + ब्याज (Interest)',
          tipsEn: 'Amount = Principal + Simple Interest',
        };
      }

      return {
        titleHi: 'साधारण ब्याज: मान भरें',
        titleEn: 'Simple Interest: Enter Values',
        category: 'Commercial Math',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'कम से कम कोई 3 मान भरें (उदा: SI, R, T से P निकालें)',
        toFindEn: 'Fill at least 3 values (e.g. SI, R, T to find P)',
        stepsHi: ['कृपया P, R, T, SI में से कोई 3 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter any 3 parameters and leave the rest blank.'],
        finalAnswerHi: 'कृपया 3 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 3 values or click a preset.',
        formulasUsed: ['SI = (P × R × T) / 100', 'P = (SI × 100) / (R × T)'],
      };
    },
  },

  // 7. चाल, दूरी व समय (Speed, Distance, Time)
  {
    id: 'speed_distance_time',
    nameHi: 'चाल, दूरी व समय (Speed, Distance & Time)',
    nameEn: 'Speed, Distance & Time',
    categoryHi: 'अंकगणित व गति (Kinematics & Math)',
    categoryEn: 'Kinematics',
    icon: '⚡',
    badge: 'D = S × T | S = D/T | T = D/S',
    mainFormulaText: 'दूरी D = चाल S × समय T | चाल S = D / T | समय T = D / S | किमी/घंटा से मी/से = × (5/18)',
    descriptionHi: 'दूरी (D), चाल (S), या समय (T) में से कोई भी 2 मान भरें, छूटा हुआ तीसरा मान ऐप इकाई रूपांतरण सहित निकाल देगा।',
    descriptionEn: 'Enter any 2 values among Distance, Speed, Time; the app will solve the third with unit conversion.',
    variables: [
      { key: 'distance', symbol: 'D', labelHi: 'दूरी (Distance D)', labelEn: 'Distance (D)', unitHi: 'किमी (km)', unitEn: 'km' },
      { key: 'speed', symbol: 'S', labelHi: 'चाल (Speed S)', labelEn: 'Speed (S)', unitHi: 'किमी/घंटा (km/h)', unitEn: 'km/h' },
      { key: 'time', symbol: 'T', labelHi: 'समय (Time T)', labelEn: 'Time (T)', unitHi: 'घंटे (hours)', unitEn: 'hours' },
    ],
    presets: [
      {
        nameHi: 'D = 360 किमी, S = 60 किमी/घं ⇒ समय (T) निकालें',
        nameEn: 'D = 360 km, S = 60 km/h ⇒ Find Time (T)',
        values: { distance: 360, speed: 60, time: null },
        descriptionHi: 'दूरी व चाल से समय ज्ञात करना।',
        descriptionEn: 'Given Distance and Speed, find Time.',
      },
      {
        nameHi: 'D = 450 किमी, T = 5 घंटे ⇒ चाल (S) निकालें',
        nameEn: 'D = 450 km, T = 5 hrs ⇒ Find Speed (S)',
        values: { distance: 450, speed: null, time: 5 },
        descriptionHi: 'दूरी व समय से चाल (किमी/घं व मी/से में) ज्ञात करना।',
        descriptionEn: 'Given Distance and Time, find Speed in km/h and m/s.',
      },
      {
        nameHi: 'S = 72 किमी/घं, T = 2.5 घंटे ⇒ दूरी (D) निकालें',
        nameEn: 'S = 72 km/h, T = 2.5 hrs ⇒ Find Distance (D)',
        values: { distance: null, speed: 72, time: 2.5 },
        descriptionHi: 'चाल व समय से तय की गई कुल दूरी निकालना।',
        descriptionEn: 'Calculate Distance from Speed and Time.',
      },
    ],
    solve: (inputs) => {
      let D = inputs.distance;
      let S = inputs.speed;
      let T = inputs.time;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (D !== null && D !== undefined) givenData.push({ labelHi: 'दूरी (Distance D)', labelEn: 'Distance (D)', value: `${D} किमी` });
      if (S !== null && S !== undefined) givenData.push({ labelHi: 'चाल (Speed S)', labelEn: 'Speed (S)', value: `${S} किमी/घंटा` });
      if (T !== null && T !== undefined) givenData.push({ labelHi: 'समय (Time T)', labelEn: 'Time (T)', value: `${T} घंटे` });

      if (S && T && !D) {
        D = S * T;
        stepsHi.push(`चरण 1 (मानक सूत्र): दूरी (D) = चाल (S) × समय (T)`);
        stepsHi.push(`चरण 2 (गणना): D = ${S} × ${T} = ${D.toFixed(2)} किमी`);
        stepsEn.push(`Step 1: Distance (D) = Speed (S) × Time (T)`);
        stepsEn.push(`Step 2: D = ${S} × ${T} = ${D.toFixed(2)} km`);
        formulas.push('D = S × T');
      } else if (D && S && !T) {
        T = D / S;
        stepsHi.push(`चरण 1 (मानक सूत्र): समय (T) = दूरी (D) / चाल (S)`);
        stepsHi.push(`चरण 2 (गणना): T = ${D} / ${S} = ${T.toFixed(2)} घंटे (${(T * 60).toFixed(0)} मिनट)`);
        stepsEn.push(`Step 1: Time (T) = Distance (D) / Speed (S)`);
        stepsEn.push(`Step 2: T = ${D} / ${S} = ${T.toFixed(2)} hours (${(T * 60).toFixed(0)} mins)`);
        formulas.push('T = D / S');
      } else if (D && T && !S) {
        S = D / T;
        const speedMS = S * (5 / 18);
        stepsHi.push(`चरण 1 (मानक सूत्र): चाल (S) = दूरी (D) / समय (T)`);
        stepsHi.push(`चरण 2 (गणना): S = ${D} / ${T} = ${S.toFixed(2)} किमी/घंटा`);
        stepsHi.push(`चरण 3 (मीटर/सेकंड में रूपांतरण): S = ${S.toFixed(2)} × (5/18) = ${speedMS.toFixed(2)} मी/से`);
        stepsEn.push(`Step 1: Speed (S) = Distance (D) / Time (T) = ${S.toFixed(2)} km/h`);
        stepsEn.push(`Step 2: In m/s = ${S.toFixed(2)} × (5/18) = ${speedMS.toFixed(2)} m/s`);
        formulas.push('S = D / T', '1 km/h = 5/18 m/s');
      }

      if (D !== null && D !== undefined && S !== null && S !== undefined && T !== null && T !== undefined) {
        const speedMS = S * (5 / 18);
        return {
          titleHi: `चाल, दूरी व समय का हल (D = ${D.toFixed(2)} किमी, S = ${S.toFixed(2)} किमी/घं, T = ${T.toFixed(2)} घंटे)`,
          titleEn: `Speed, Distance & Time Solution`,
          category: 'Arithmetic: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'अज्ञात दूरी, चाल या समय',
          toFindEn: 'Missing Distance, Speed, or Time',
          stepsHi,
          stepsEn,
          finalAnswerHi: `दूरी (D) = ${D.toFixed(2)} किमी | चाल (S) = ${S.toFixed(2)} किमी/घंटा (${speedMS.toFixed(2)} मी/से) | समय (T) = ${T.toFixed(2)} घंटे (${(T * 60).toFixed(0)} मिनट)`,
          finalAnswerEn: `Distance = ${D.toFixed(2)} km | Speed = ${S.toFixed(2)} km/h (${speedMS.toFixed(2)} m/s) | Time = ${T.toFixed(2)} hours`,
          formulasUsed: formulas,
          tipsHi: 'किमी/घंटा को मी/सेकंड में बदलने के लिए 5/18 से गुणा करें; मी/सेकंड को किमी/घंटा में बदलने के लिए 18/5 से गुणा करें।',
          tipsEn: 'Multiply by 5/18 to convert km/h to m/s; multiply by 18/5 to convert m/s to km/h.',
        };
      }

      return {
        titleHi: 'चाल, दूरी व समय: कोई 2 मान भरें',
        titleEn: 'Speed, Distance & Time: Enter 2 Values',
        category: 'Arithmetic',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'दूरी, चाल या समय में से कोई 2 मान भरें',
        toFindEn: 'Enter any 2 values among Distance, Speed, Time',
        stepsHi: ['कृपया कोई 2 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 2 values and leave the rest blank.'],
        finalAnswerHi: 'कृपया 2 मान भरें या प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 2 values or select a preset.',
        formulasUsed: ['D = S × T', 'S = D / T', 'T = D / S'],
      };
    },
  },

  // 8. समचतुर्भुज (Rhombus): d1, d2, A, a, P
  {
    id: 'rhombus',
    nameHi: 'समचतुर्भुज (Rhombus)',
    nameEn: 'Rhombus',
    categoryHi: '2D चतुर्भुज (2D Quadrilaterals)',
    categoryEn: '2D Geometry',
    icon: '◇',
    badge: 'A = ½·d₁·d₂ | a = ½√(d₁²+d₂²)',
    mainFormulaText: 'क्षेत्रफल A = ½ × d₁ × d₂ | भुजा a = ½√(d₁² + d₂²) | परिमाप P = 4a | d₂ = 2A / d₁',
    descriptionHi: 'विकर्ण 1 (d₁), विकर्ण 2 (d₂), क्षेत्रफल (A), भुजा (a), या परिमाप (P) में से कोई भी 2 मान भरें, छूटे हुए मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 2 values among Diagonal 1, Diagonal 2, Area, Side, Perimeter; the app will solve missing values.',
    variables: [
      { key: 'd1', symbol: 'd₁', labelHi: 'पहला विकर्ण (Diagonal d₁)', labelEn: 'Diagonal 1 (d₁)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'd2', symbol: 'd₂', labelHi: 'दूसरा विकर्ण (Diagonal d₂)', labelEn: 'Diagonal 2 (d₂)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'area', symbol: 'A', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'side', symbol: 'a', labelHi: 'भुजा (Side a)', labelEn: 'Side (a)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'perimeter', symbol: 'P', labelHi: 'परिमाप (Perimeter P)', labelEn: 'Perimeter (P)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
    ],
    presets: [
      {
        nameHi: 'A = 96, d₁ = 16 ⇒ दूसरा विकर्ण (d₂) व भुजा निकालें',
        nameEn: 'A = 96, d₁ = 16 ⇒ Find d₂ & Side',
        values: { d1: 16, d2: null, area: 96, side: null, perimeter: null },
        descriptionHi: 'क्षेत्रफल व एक विकर्ण से दूसरा विकर्ण व भुजा ज्ञात करना।',
        descriptionEn: 'Given Area and one Diagonal, find the other Diagonal and Side.',
      },
      {
        nameHi: 'd₁ = 12, d₂ = 16 ⇒ A, भुजा (a) व P निकालें',
        nameEn: 'd₁ = 12, d₂ = 16 ⇒ Find A, Side & Perimeter',
        values: { d1: 12, d2: 16, area: null, side: null, perimeter: null },
        descriptionHi: 'दोनों विकर्णों से क्षेत्रफल, भुजा व परिमाप ज्ञात करना।',
        descriptionEn: 'Given both diagonals, calculate Area, Side, and Perimeter.',
      },
    ],
    solve: (inputs) => {
      let d1 = inputs.d1;
      let d2 = inputs.d2;
      const A = inputs.area;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (d1 !== null && d1 !== undefined) givenData.push({ labelHi: 'पहला विकर्ण (d₁)', labelEn: 'Diagonal 1 (d₁)', value: `${d1} सेमी` });
      if (d2 !== null && d2 !== undefined) givenData.push({ labelHi: 'दूसरा विकर्ण (d₂)', labelEn: 'Diagonal 2 (d₂)', value: `${d2} सेमी` });
      if (A !== null && A !== undefined) givenData.push({ labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` });

      if (A && d1 && !d2) {
        d2 = (2 * A) / d1;
        stepsHi.push(`चरण 1 (मानक सूत्र): समचतुर्भुज का क्षेत्रफल (A) = ½ × d₁ × d₂`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${A} = ½ × ${d1} × d₂ = ${(d1 / 2).toFixed(2)} × d₂`);
        stepsHi.push(`चरण 3 (पक्षांतरण): d₂ = (2 × ${A}) / ${d1} = ${d2.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Area = ½ · d₁ · d₂`);
        stepsEn.push(`Step 2: d₂ = (2A) / d₁ = (2 × ${A}) / ${d1} = ${d2.toFixed(2)} cm`);
        formulas.push('d₂ = 2A / d₁', 'a = ½√(d₁² + d₂²)', 'P = 4a');
      } else if (d1 && d2 && !A) {
        stepsHi.push(`चरण 1: क्षेत्रफल A = ½ × d₁ × d₂ = ½ × ${d1} × ${d2} = ${(0.5 * d1 * d2).toFixed(2)} सेमी²`);
        stepsEn.push(`Step 1: Area = ½ × ${d1} × ${d2} = ${(0.5 * d1 * d2).toFixed(2)} cm²`);
        formulas.push('A = ½ · d₁ · d₂', 'a = ½√(d₁² + d₂²)', 'P = 4a');
      }

      if (d1 && d2) {
        const finalA = 0.5 * d1 * d2;
        const finalSide = 0.5 * Math.hypot(d1, d2);
        const finalP = 4 * finalSide;

        stepsHi.push(`चरण (भुजा सूत्र): भुजा a = ½ × √(d₁² + d₂²) = ½ × √(${d1}² + ${d2}²) = ½ × √(${d1 * d1 + d2 * d2}) = ${finalSide.toFixed(2)} सेमी`);
        stepsHi.push(`चरण (परिमाप): P = 4 × a = 4 × ${finalSide.toFixed(2)} = ${finalP.toFixed(2)} सेमी`);

        return {
          titleHi: `समचतुर्भुज का पूर्ण हल (d₁ = ${d1} सेमी, d₂ = ${d2.toFixed(2)} सेमी)`,
          titleEn: `Rhombus Solution`,
          category: '2D Geometry: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'दूसरा विकर्ण (d₂), क्षेत्रफल (A), भुजा (a), परिमाप (P)',
          toFindEn: 'Diagonal 2, Area, Side, Perimeter',
          stepsHi,
          stepsEn,
          finalAnswerHi: `दूसरा विकर्ण (d₂) = ${d2.toFixed(2)} सेमी | क्षेत्रफल (A) = ${finalA.toFixed(2)} सेमी² | भुजा (a) = ${finalSide.toFixed(2)} सेमी | परिमाप (P) = ${finalP.toFixed(2)} सेमी`,
          finalAnswerEn: `d₂ = ${d2.toFixed(2)} cm | Area = ${finalA.toFixed(2)} cm² | Side = ${finalSide.toFixed(2)} cm | Perimeter = ${finalP.toFixed(2)} cm`,
          formulasUsed: formulas,
          tipsHi: 'समचतुर्भुज के विकर्ण एक-दूसरे को 90° पर समद्विभाजित करते हैं।',
          tipsEn: 'Diagonals of a rhombus bisect each other at right angles (90°).',
        };
      }

      return {
        titleHi: 'समचतुर्भुज (Rhombus): मान भरें',
        titleEn: 'Rhombus: Enter Values',
        category: '2D Geometry',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'कम से कम कोई 2 मान भरें (उदा: A व d₁ से d₂ निकालें)',
        toFindEn: 'Enter at least 2 values',
        stepsHi: ['कृपया कोई 2 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 2 values and leave the rest blank.'],
        finalAnswerHi: 'कृपया 2 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 2 values or select a preset.',
        formulasUsed: ['A = ½ · d₁ · d₂', 'a = ½√(d₁² + d₂²)'],
      };
    },
  },

  // 9. घनाभ (Cuboid): l, b, h, V, TSA, d
  {
    id: 'cuboid',
    nameHi: 'घनाभ (Cuboid)',
    nameEn: 'Cuboid',
    categoryHi: '3D ठोस (3D Solids)',
    categoryEn: '3D Mensuration',
    icon: '📦',
    badge: 'V = l·b·h | TSA = 2(lb+bh+hl)',
    mainFormulaText: 'आयतन V = l × b × h | कुल पृष्ठ TSA = 2(lb + bh + hl) | विकर्ण d = √(l² + b² + h²) | 4 दीवारें = 2h(l + b)',
    descriptionHi: 'आयतन (V), लंबाई (l), चौड़ाई (b), ऊंचाई (h) में से कोई भी 3 मान भरें, छूटा हुआ अज्ञात मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 3 values among Volume, Length, Breadth, Height; the app will solve the missing unknown.',
    variables: [
      { key: 'volume', symbol: 'V', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', unitHi: 'सेमी³ (cm³)', unitEn: 'cu cm' },
      { key: 'length', symbol: 'l', labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'breadth', symbol: 'b', labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'height', symbol: 'h', labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'tsa', symbol: 'TSA', labelHi: 'कुल पृष्ठ (Total Surface TSA)', labelEn: 'TSA', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'diagonal', symbol: 'd', labelHi: 'विकर्ण (Diagonal / Longest Rod)', labelEn: 'Diagonal (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
    ],
    presets: [
      {
        nameHi: 'V = 720, l = 12, b = 10 ⇒ ऊंचाई (h) व TSA निकालें',
        nameEn: 'V = 720, l = 12, b = 10 ⇒ Find Height & TSA',
        values: { volume: 720, length: 12, breadth: 10, height: null, tsa: null, diagonal: null },
        descriptionHi: 'आयतन, लंबाई व चौड़ाई से ऊंचाई व संपूर्ण पृष्ठ निकालना।',
        descriptionEn: 'Given Volume, Length, and Breadth, find Height and TSA.',
      },
      {
        nameHi: 'l = 8, b = 6, h = 10 ⇒ V, TSA व विकर्ण निकालें',
        nameEn: 'l = 8, b = 6, h = 10 ⇒ Find V, TSA, Diagonal',
        values: { volume: null, length: 8, breadth: 6, height: 10, tsa: null, diagonal: null },
        descriptionHi: 'लंबाई, चौड़ाई व ऊंचाई से सभी मान ज्ञात करना।',
        descriptionEn: 'Calculate Volume, TSA, and Diagonal from dimensions.',
      },
    ],
    solve: (inputs) => {
      let V = inputs.volume;
      let l = inputs.length;
      let b = inputs.breadth;
      let h = inputs.height;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (V !== null && V !== undefined) givenData.push({ labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` });
      if (l !== null && l !== undefined) givenData.push({ labelHi: 'लंबाई (Length l)', labelEn: 'Length (l)', value: `${l} सेमी` });
      if (b !== null && b !== undefined) givenData.push({ labelHi: 'चौड़ाई (Breadth b)', labelEn: 'Breadth (b)', value: `${b} सेमी` });
      if (h !== null && h !== undefined) givenData.push({ labelHi: 'ऊंचाई (Height h)', labelEn: 'Height (h)', value: `${h} सेमी` });

      if (V && l && b && !h) {
        h = V / (l * b);
        stepsHi.push(`चरण 1 (मानक सूत्र): घनाभ का आयतन (V) = l × b × h`);
        stepsHi.push(`चरण 2 (मान प्रतिस्थापन): ${V} = ${l} × ${b} × h = ${l * b} × h`);
        stepsHi.push(`चरण 3 (पक्षांतरण): h = V / (l × b) = ${V} / ${l * b} = ${h.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Volume V = l × b × h`);
        stepsEn.push(`Step 2: h = V / (l × b) = ${V} / ${l * b} = ${h.toFixed(2)} cm`);
        formulas.push('h = V / (l × b)', 'TSA = 2(lb + bh + hl)', 'd = √(l² + b² + h²)');
      } else if (l && b && h && !V) {
        V = l * b * h;
        stepsHi.push(`चरण 1: आयतन V = l × b × h = ${l} × ${b} × ${h} = ${V.toFixed(2)} सेमी³`);
        stepsEn.push(`Step 1: Volume V = l × b × h = ${V.toFixed(2)} cu cm`);
        formulas.push('V = l × b × h', 'TSA = 2(lb + bh + hl)', 'd = √(l² + b² + h²)');
      }

      if (l && b && h) {
        const finalV = l * b * h;
        const finalTSA = 2 * (l * b + b * h + h * l);
        const finalFourWalls = 2 * h * (l + b);
        const finalD = Math.hypot(l, b, h);

        stepsHi.push(`\n[अतिरिक्त गणनाएं]:`);
        stepsHi.push(`• कुल पृष्ठ (TSA) = 2(lb + bh + hl) = 2(${l * b} + ${(b * h).toFixed(2)} + ${(h * l).toFixed(2)}) = ${finalTSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• 4 दीवारों का क्षेत्रफल = 2h(l + b) = 2 × ${h.toFixed(2)} × (${l} + ${b}) = ${finalFourWalls.toFixed(2)} सेमी²`);
        stepsHi.push(`• विकर्ण (कमरे में रखी जाने वाली सबसे लंबी छड़) = √(l² + b² + h²) = ${finalD.toFixed(2)} सेमी`);

        return {
          titleHi: `घनाभ का पूर्ण हल (l = ${l} सेमी, b = ${b} सेमी, h = ${h.toFixed(2)} सेमी)`,
          titleEn: `Cuboid Solution`,
          category: '3D Mensuration: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'ऊंचाई (h), आयतन (V), संपूर्ण पृष्ठ (TSA), विकर्ण (d)',
          toFindEn: 'Height, Volume, TSA, Diagonal',
          stepsHi,
          stepsEn,
          finalAnswerHi: `ऊंचाई (h) = ${h.toFixed(2)} सेमी | आयतन (V) = ${finalV.toFixed(2)} सेमी³ | कुल पृष्ठ (TSA) = ${finalTSA.toFixed(2)} सेमी² | विकर्ण (d) = ${finalD.toFixed(2)} सेमी`,
          finalAnswerEn: `Height = ${h.toFixed(2)} cm | Volume = ${finalV.toFixed(2)} cm³ | TSA = ${finalTSA.toFixed(2)} cm² | Diagonal = ${finalD.toFixed(2)} cm`,
          formulasUsed: formulas,
          tipsHi: 'कमरे में रखी जा सकने वाली सबसे लंबी छड़ की लंबाई = विकर्ण = √(l² + b² + h²)।',
          tipsEn: 'Longest rod placed in a room = Diagonal = √(l² + b² + h²).',
        };
      }

      return {
        titleHi: 'घनाभ (Cuboid): मान भरें',
        titleEn: 'Cuboid: Enter Values',
        category: '3D Mensuration',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'कम से कम कोई 3 मान भरें (उदा: V, l, b से h निकालें)',
        toFindEn: 'Enter at least 3 values',
        stepsHi: ['कृपया V, l, b, h में से कोई 3 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 3 values and leave the rest blank.'],
        finalAnswerHi: 'कृपया 3 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 3 values or select a preset.',
        formulasUsed: ['V = l × b × h', 'h = V / (l × b)', 'TSA = 2(lb + bh + hl)'],
      };
    },
  },

  // 10. गोला (Sphere): r, d, V, SA
  {
    id: 'sphere',
    nameHi: 'गोला (Sphere)',
    nameEn: 'Sphere',
    categoryHi: '3D ठोस (3D Solids)',
    categoryEn: '3D Mensuration',
    icon: '⚽',
    badge: 'V = ⁴/₃πr³ | SA = 4πr²',
    mainFormulaText: 'आयतन V = ⁴/₃πr³ | कुल पृष्ठ क्षेत्रफल SA = 4πr² | व्यास d = 2r | त्रिज्या r = ³√(3V / 4π) = √(SA / 4π)',
    descriptionHi: 'त्रिज्या (r), व्यास (d), आयतन (V), या पृष्ठ क्षेत्रफल (SA) में से केवल कोई 1 मान भरें, बाकी सभी मान ऐप तुरंत हल करेगा।',
    descriptionEn: 'Enter just 1 parameter among Radius, Diameter, Volume, Surface Area; the app will solve all remaining values.',
    variables: [
      { key: 'radius', symbol: 'r', labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'diameter', symbol: 'd', labelHi: 'व्यास (Diameter d)', labelEn: 'Diameter (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'volume', symbol: 'V', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', unitHi: 'सेमी³ (cm³)', unitEn: 'cu cm' },
      { key: 'surfaceArea', symbol: 'SA', labelHi: 'पृष्ठ क्षेत्रफल (Surface Area SA)', labelEn: 'Surface Area (SA)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
    ],
    presets: [
      {
        nameHi: 'SA = 616 ⇒ त्रिज्या (r) व आयतन (V) निकालें',
        nameEn: 'SA = 616 ⇒ Find Radius & Volume',
        values: { radius: null, diameter: null, volume: null, surfaceArea: 616 },
        descriptionHi: 'पृष्ठ क्षेत्रफल से त्रिज्या 7 व आयतन ज्ञात करना।',
        descriptionEn: 'Given Surface Area = 616, find Radius and Volume.',
      },
      {
        nameHi: 'r = 7 ⇒ V व SA निकालें',
        nameEn: 'r = 7 ⇒ Find Volume & SA',
        values: { radius: 7, diameter: null, volume: null, surfaceArea: null },
        descriptionHi: 'त्रिज्या 7 से आयतन 1437.33 व SA 616।',
        descriptionEn: 'Calculate Volume and Surface Area from Radius.',
      },
    ],
    solve: (inputs) => {
      let r: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (inputs.radius) {
        r = inputs.radius;
        givenData.push({ labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', value: `${r} सेमी` });
        stepsHi.push(`चरण 1: दी गई त्रिज्या r = ${r} सेमी`);
        stepsEn.push(`Step 1: Given radius r = ${r} cm`);
        formulas.push('V = ⁴/₃πr³', 'SA = 4πr²');
      } else if (inputs.diameter) {
        const d = inputs.diameter;
        r = d / 2;
        givenData.push({ labelHi: 'व्यास (Diameter d)', labelEn: 'Diameter (d)', value: `${d} सेमी` });
        stepsHi.push(`चरण 1: त्रिज्या r = d / 2 = ${d} / 2 = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Radius r = d / 2 = ${r.toFixed(2)} cm`);
        formulas.push('r = d / 2', 'V = ⁴/₃πr³', 'SA = 4πr²');
      } else if (inputs.surfaceArea) {
        const sa = inputs.surfaceArea;
        r = Math.sqrt(sa / (4 * Math.PI));
        givenData.push({ labelHi: 'पृष्ठ क्षेत्रफल (SA)', labelEn: 'Surface Area (SA)', value: `${sa} सेमी²` });
        stepsHi.push(`चरण 1 (मानक सूत्र): गोले का पृष्ठ क्षेत्रफल (SA) = 4 × π × r²`);
        stepsHi.push(`चरण 2 (पक्षांतरण): r² = SA / (4π) = ${sa} / (4 × 22/7) = ${(sa / (4 * Math.PI)).toFixed(2)}`);
        stepsHi.push(`चरण 3 (वर्गमूल लेने पर): r = √(${(sa / (4 * Math.PI)).toFixed(2)}) = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: SA = 4πr²`);
        stepsEn.push(`Step 2: r = √(SA / 4π) = ${r.toFixed(2)} cm`);
        formulas.push('r = √(SA / 4π)', 'V = ⁴/₃πr³');
      } else if (inputs.volume) {
        const v = inputs.volume;
        r = Math.cbrt((3 * v) / (4 * Math.PI));
        givenData.push({ labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${v} सेमी³` });
        stepsHi.push(`चरण 1 (मानक सूत्र): गोले का आयतन (V) = ⁴/₃ × π × r³`);
        stepsHi.push(`चरण 2 (पक्षांतरण): r³ = (3 × V) / (4π) = ${(3 * v / (4 * Math.PI)).toFixed(2)}`);
        stepsHi.push(`चरण 3 (घनमूल लेने पर): r = ³√(${(3 * v / (4 * Math.PI)).toFixed(2)}) = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: V = ⁴/₃πr³`);
        stepsEn.push(`Step 2: r = ³√(3V / 4π) = ${r.toFixed(2)} cm`);
        formulas.push('r = ³√(3V / 4π)', 'SA = 4πr²');
      }

      if (r !== null && !isNaN(r)) {
        const finalV = (4 / 3) * Math.PI * Math.pow(r, 3);
        const finalSA = 4 * Math.PI * r * r;
        const finalD = 2 * r;

        stepsHi.push(`\n[सभी मानों की गणना]:`);
        stepsHi.push(`• त्रिज्या (r) = ${r.toFixed(2)} सेमी | व्यास (d) = ${finalD.toFixed(2)} सेमी`);
        stepsHi.push(`• आयतन (Volume V) = ⁴/₃πr³ = ⁴/₃ × (22/7) × ${r.toFixed(2)}³ = ${finalV.toFixed(2)} सेमी³`);
        stepsHi.push(`• पृष्ठ क्षेत्रफल (SA) = 4πr² = 4 × (22/7) × ${r.toFixed(2)}² = ${finalSA.toFixed(2)} सेमी²`);

        return {
          titleHi: `गोले का पूर्ण हल (त्रिज्या r = ${r.toFixed(2)} सेमी)`,
          titleEn: `Sphere Solution (r = ${r.toFixed(2)} cm)`,
          category: '3D Mensuration: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'त्रिज्या (r), व्यास (d), आयतन (V), पृष्ठ क्षेत्रफल (SA)',
          toFindEn: 'Radius, Diameter, Volume, Surface Area',
          stepsHi,
          stepsEn,
          finalAnswerHi: `त्रिज्या (r) = ${r.toFixed(2)} सेमी | व्यास (d) = ${finalD.toFixed(2)} सेमी | आयतन (V) = ${finalV.toFixed(2)} सेमी³ | पृष्ठ क्षेत्रफल (SA) = ${finalSA.toFixed(2)} सेमी²`,
          finalAnswerEn: `Radius = ${r.toFixed(2)} cm | Volume = ${finalV.toFixed(2)} cm³ | SA = ${finalSA.toFixed(2)} cm²`,
          formulasUsed: formulas,
          tipsHi: 'गोले का वक्र पृष्ठ और कुल पृष्ठ एक ही (4πr²) होता है।',
          tipsEn: 'For a sphere, curved surface and total surface are identical: 4πr².',
        };
      }

      return {
        titleHi: 'गोला (Sphere): कोई 1 मान भरें',
        titleEn: 'Sphere: Enter 1 Value',
        category: '3D Mensuration',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'त्रिज्या, व्यास, आयतन या पृष्ठ क्षेत्रफल में से कोई 1 मान भरें',
        toFindEn: 'Enter any 1 value among Radius, Diameter, Volume, Surface Area',
        stepsHi: ['कृपया कोई 1 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 1 value and leave the rest blank.'],
        finalAnswerHi: 'कृपया 1 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 1 value or select a preset.',
        formulasUsed: ['V = ⁴/₃πr³', 'SA = 4πr²'],
      };
    },
  },

  // 11. घन (Cube): a, V, TSA, LSA, d
  {
    id: 'cube',
    nameHi: 'घन (Cube)',
    nameEn: 'Cube',
    categoryHi: '3D ठोस (3D Solids)',
    categoryEn: '3D Mensuration',
    icon: '🧊',
    badge: 'V = a³ | TSA = 6a² | d = a√3',
    mainFormulaText: 'आयतन V = a³ | कुल पृष्ठ TSA = 6a² | पार्श्व पृष्ठ LSA = 4a² | विकर्ण d = a√3 | भुजा a = ³√V = √(TSA/6) = d/√3',
    descriptionHi: 'भुजा (a), आयतन (V), कुल पृष्ठ (TSA), पार्श्व पृष्ठ (LSA), या विकर्ण (d) में से कोई भी 1 मान भरें, बाकी सभी 4 मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 1 parameter among Side (a), Volume (V), TSA, LSA, Diagonal (d); all remaining 4 values will be solved.',
    variables: [
      { key: 'side', symbol: 'a', labelHi: 'भुजा (Side a)', labelEn: 'Side (a)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'volume', symbol: 'V', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', unitHi: 'सेमी³ (cm³)', unitEn: 'cu cm' },
      { key: 'tsa', symbol: 'TSA', labelHi: 'कुल पृष्ठ (Total Surface TSA)', labelEn: 'Total Surface (TSA)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'lsa', symbol: 'LSA', labelHi: 'पार्श्व पृष्ठ (Lateral Surface 4a²)', labelEn: 'Lateral Surface (LSA)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'diagonal', symbol: 'd', labelHi: 'विकर्ण (Diagonal d)', labelEn: 'Diagonal (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
    ],
    presets: [
      {
        nameHi: 'V = 512 ⇒ भुजा (a), TSA व विकर्ण निकालें',
        nameEn: 'V = 512 ⇒ Find Side, TSA & Diagonal',
        values: { side: null, volume: 512, tsa: null, lsa: null, diagonal: null },
        descriptionHi: 'आयतन 512 से भुजा 8, TSA 384 व विकर्ण 8√3 ज्ञात करना।',
        descriptionEn: 'Given Volume = 512, find Side, TSA, and Diagonal.',
      },
      {
        nameHi: 'TSA = 150 ⇒ भुजा (a) व आयतन (V) निकालें',
        nameEn: 'TSA = 150 ⇒ Find Side & Volume',
        values: { side: null, volume: null, tsa: 150, lsa: null, diagonal: null },
        descriptionHi: 'कुल पृष्ठ से भुजा 5 व आयतन 125 ज्ञात करना।',
        descriptionEn: 'Given TSA = 150, find Side and Volume.',
      },
      {
        nameHi: 'a = 6 ⇒ V, TSA, LSA व विकर्ण निकालें',
        nameEn: 'a = 6 ⇒ Find All',
        values: { side: 6, volume: null, tsa: null, lsa: null, diagonal: null },
        descriptionHi: 'भुजा 6 से सभी मान ज्ञात करना।',
        descriptionEn: 'Given side = 6, calculate all parameters.',
      },
    ],
    solve: (inputs) => {
      let a: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (inputs.side) {
        a = inputs.side;
        givenData.push({ labelHi: 'भुजा (Side a)', labelEn: 'Side (a)', value: `${a} सेमी` });
        stepsHi.push(`चरण 1: दी गई भुजा a = ${a} सेमी`);
        stepsEn.push(`Step 1: Given side a = ${a} cm`);
        formulas.push('V = a³', 'TSA = 6a²', 'LSA = 4a²', 'd = a√3');
      } else if (inputs.volume) {
        const V = inputs.volume;
        a = Math.cbrt(V);
        givenData.push({ labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${V} सेमी³` });
        stepsHi.push(`चरण 1 (मानक सूत्र): घन का आयतन (V) = भुजा³ (a³)`);
        stepsHi.push(`चरण 2 (घनमूल लेने पर): a = ³√V = ³√${V} = ${a.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: V = a³`);
        stepsEn.push(`Step 2: a = ³√V = ${a.toFixed(2)} cm`);
        formulas.push('a = ³√V', 'TSA = 6a²', 'd = a√3');
      } else if (inputs.tsa) {
        const tsa = inputs.tsa;
        a = Math.sqrt(tsa / 6);
        givenData.push({ labelHi: 'कुल पृष्ठ (TSA)', labelEn: 'Total Surface (TSA)', value: `${tsa} सेमी²` });
        stepsHi.push(`चरण 1 (मानक सूत्र): कुल पृष्ठ (TSA) = 6 × a²`);
        stepsHi.push(`चरण 2 (पक्षांतरण): a² = TSA / 6 = ${tsa} / 6 = ${(tsa / 6).toFixed(2)}`);
        stepsHi.push(`चरण 3 (वर्गमूल): a = √(${(tsa / 6).toFixed(2)}) = ${a.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: TSA = 6a²`);
        stepsEn.push(`Step 2: a = √(TSA / 6) = ${a.toFixed(2)} cm`);
        formulas.push('a = √(TSA / 6)', 'V = a³', 'd = a√3');
      } else if (inputs.lsa) {
        const lsa = inputs.lsa;
        a = Math.sqrt(lsa / 4);
        givenData.push({ labelHi: 'पार्श्व पृष्ठ (LSA)', labelEn: 'Lateral Surface (LSA)', value: `${lsa} सेमी²` });
        stepsHi.push(`चरण 1: LSA = 4 × a² ⇒ a = √(LSA / 4) = √(${lsa} / 4) = ${a.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: a = √(LSA / 4) = ${a.toFixed(2)} cm`);
        formulas.push('a = √(LSA / 4)', 'V = a³', 'TSA = 6a²');
      } else if (inputs.diagonal) {
        const d = inputs.diagonal;
        a = d / Math.sqrt(3);
        givenData.push({ labelHi: 'विकर्ण (Diagonal d)', labelEn: 'Diagonal (d)', value: `${d} सेमी` });
        stepsHi.push(`चरण 1 (मानक सूत्र): विकर्ण (d) = a × √3`);
        stepsHi.push(`चरण 2 (पक्षांतरण): a = d / √3 = ${d} / 1.732 = ${a.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Diagonal d = a√3`);
        stepsEn.push(`Step 2: a = d / √3 = ${a.toFixed(2)} cm`);
        formulas.push('a = d / √3', 'V = a³', 'TSA = 6a²');
      }

      if (a !== null && !isNaN(a)) {
        const finalV = Math.pow(a, 3);
        const finalTSA = 6 * a * a;
        const finalLSA = 4 * a * a;
        const finalD = a * Math.sqrt(3);

        stepsHi.push(`\n[सभी मानों की गणना]:`);
        stepsHi.push(`• भुजा (Side a) = ${a.toFixed(2)} सेमी`);
        stepsHi.push(`• आयतन (Volume V) = a³ = ${a.toFixed(2)}³ = ${finalV.toFixed(2)} सेमी³`);
        stepsHi.push(`• कुल पृष्ठ (TSA) = 6a² = 6 × ${a.toFixed(2)}² = ${finalTSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• पार्श्व पृष्ठ (LSA) = 4a² = 4 × ${a.toFixed(2)}² = ${finalLSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• विकर्ण (Diagonal d) = a√3 = ${a.toFixed(2)} × 1.732 = ${finalD.toFixed(2)} सेमी`);

        return {
          titleHi: `घन का पूर्ण हल (भुजा a = ${a.toFixed(2)} सेमी)`,
          titleEn: `Cube Solution (Side a = ${a.toFixed(2)} cm)`,
          category: '3D Mensuration: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'भुजा (a), आयतन (V), कुल पृष्ठ (TSA), पार्श्व पृष्ठ (LSA), विकर्ण (d)',
          toFindEn: 'Side, Volume, TSA, LSA, Diagonal',
          stepsHi,
          stepsEn,
          finalAnswerHi: `भुजा (a) = ${a.toFixed(2)} सेमी | आयतन (V) = ${finalV.toFixed(2)} सेमी³ | कुल पृष्ठ (TSA) = ${finalTSA.toFixed(2)} सेमी² | विकर्ण (d) = ${finalD.toFixed(2)} सेमी`,
          finalAnswerEn: `Side = ${a.toFixed(2)} cm | Volume = ${finalV.toFixed(2)} cm³ | TSA = ${finalTSA.toFixed(2)} cm² | Diagonal = ${finalD.toFixed(2)} cm`,
          formulasUsed: formulas,
          tipsHi: 'घन में 6 फलक (Faces), 12 किनारे (Edges) और 8 शीर्ष (Vertices) होते हैं।',
          tipsEn: 'Cube has 6 faces, 12 edges, and 8 vertices.',
        };
      }

      return {
        titleHi: 'घन (Cube): कोई 1 मान भरें',
        titleEn: 'Cube: Enter 1 Value',
        category: '3D Mensuration',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'भुजा, आयतन, TSA या विकर्ण में से कोई 1 मान भरें',
        toFindEn: 'Enter any 1 value among Side, Volume, TSA, Diagonal',
        stepsHi: ['कृपया कोई 1 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 1 value and leave the rest blank.'],
        finalAnswerHi: 'कृपया 1 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 1 value or select a preset.',
        formulasUsed: ['V = a³', 'TSA = 6a²', 'd = a√3'],
      };
    },
  },

  // 12. अर्धगोला (Hemisphere): r, d, V, CSA, TSA
  {
    id: 'hemisphere',
    nameHi: 'अर्धगोला (Hemisphere)',
    nameEn: 'Hemisphere',
    categoryHi: '3D ठोस (3D Solids)',
    categoryEn: '3D Mensuration',
    icon: '🥣',
    badge: 'V = ⅔πr³ | CSA = 2πr² | TSA = 3πr²',
    mainFormulaText: 'आयतन V = ⅔πr³ | वक्र पृष्ठ CSA = 2πr² | कुल पृष्ठ TSA = 3πr² | आधार क्षेत्रफल = πr²',
    descriptionHi: 'त्रिज्या (r), व्यास (d), आयतन (V), CSA या TSA में से केवल कोई 1 मान भरें, बाकी सभी मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 1 value among Radius, Diameter, Volume, CSA, TSA; all remaining values will be calculated.',
    variables: [
      { key: 'radius', symbol: 'r', labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'diameter', symbol: 'd', labelHi: 'व्यास (Diameter d)', labelEn: 'Diameter (d)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'volume', symbol: 'V', labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', unitHi: 'सेमी³ (cm³)', unitEn: 'cu cm' },
      { key: 'csa', symbol: 'CSA', labelHi: 'वक्र पृष्ठ (CSA 2πr²)', labelEn: 'CSA (2πr²)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'tsa', symbol: 'TSA', labelHi: 'कुल पृष्ठ (TSA 3πr²)', labelEn: 'TSA (3πr²)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
    ],
    presets: [
      {
        nameHi: 'CSA = 308 ⇒ त्रिज्या (r), V व TSA निकालें',
        nameEn: 'CSA = 308 ⇒ Find Radius, V & TSA',
        values: { radius: null, diameter: null, volume: null, csa: 308, tsa: null },
        descriptionHi: 'वक्र पृष्ठ 308 से त्रिज्या 7, TSA 462 व आयतन निकालना।',
        descriptionEn: 'Given CSA = 308, find Radius = 7, TSA = 462, and Volume.',
      },
      {
        nameHi: 'r = 7 ⇒ V, CSA व TSA निकालें',
        nameEn: 'r = 7 ⇒ Find V, CSA, TSA',
        values: { radius: 7, diameter: null, volume: null, csa: null, tsa: null },
        descriptionHi: 'त्रिज्या 7 से CSA = 308, TSA = 462, V = 718.67 सेमी³।',
        descriptionEn: 'Calculate Volume and Surface Areas from Radius = 7.',
      },
    ],
    solve: (inputs) => {
      let r: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (inputs.radius) {
        r = inputs.radius;
        givenData.push({ labelHi: 'त्रिज्या (Radius r)', labelEn: 'Radius (r)', value: `${r} सेमी` });
        stepsHi.push(`चरण 1: दी गई त्रिज्या r = ${r} सेमी`);
        stepsEn.push(`Step 1: Given radius r = ${r} cm`);
        formulas.push('V = ⅔πr³', 'CSA = 2πr²', 'TSA = 3πr²');
      } else if (inputs.csa) {
        const csa = inputs.csa;
        r = Math.sqrt(csa / (2 * Math.PI));
        givenData.push({ labelHi: 'वक्र पृष्ठ (CSA)', labelEn: 'CSA', value: `${csa} सेमी²` });
        stepsHi.push(`चरण 1 (मानक सूत्र): CSA = 2 × π × r²`);
        stepsHi.push(`चरण 2 (पक्षांतरण): r² = CSA / (2π) = ${csa} / (2 × 22/7) = ${(csa / (2 * Math.PI)).toFixed(2)}`);
        stepsHi.push(`चरण 3 (वर्गमूल): r = √(${(csa / (2 * Math.PI)).toFixed(2)}) = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: CSA = 2πr²`);
        stepsEn.push(`Step 2: r = √(CSA / 2π) = ${r.toFixed(2)} cm`);
        formulas.push('r = √(CSA / 2π)', 'TSA = 3πr²', 'V = ⅔πr³');
      } else if (inputs.tsa) {
        const tsa = inputs.tsa;
        r = Math.sqrt(tsa / (3 * Math.PI));
        givenData.push({ labelHi: 'कुल पृष्ठ (TSA)', labelEn: 'TSA', value: `${tsa} सेमी²` });
        stepsHi.push(`चरण 1 (मानक सूत्र): TSA = 3 × π × r²`);
        stepsHi.push(`चरण 2: r = √(TSA / 3π) = √(${tsa} / (3 × 22/7)) = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: TSA = 3πr²`);
        stepsEn.push(`Step 2: r = √(TSA / 3π) = ${r.toFixed(2)} cm`);
        formulas.push('r = √(TSA / 3π)', 'CSA = 2πr²', 'V = ⅔πr³');
      } else if (inputs.volume) {
        const v = inputs.volume;
        r = Math.cbrt((3 * v) / (2 * Math.PI));
        givenData.push({ labelHi: 'आयतन (Volume V)', labelEn: 'Volume (V)', value: `${v} सेमी³` });
        stepsHi.push(`चरण 1: V = ⅔πr³ ⇒ r = ³√(3V / 2π) = ${r.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: r = ³√(3V / 2π) = ${r.toFixed(2)} cm`);
        formulas.push('r = ³√(3V / 2π)', 'CSA = 2πr²', 'TSA = 3πr²');
      }

      if (r !== null && !isNaN(r)) {
        const finalV = (2 / 3) * Math.PI * Math.pow(r, 3);
        const finalCSA = 2 * Math.PI * r * r;
        const finalTSA = 3 * Math.PI * r * r;
        const finalBase = Math.PI * r * r;

        stepsHi.push(`\n[सभी मानों की गणना]:`);
        stepsHi.push(`• त्रिज्या (r) = ${r.toFixed(2)} सेमी | व्यास (d) = ${(2 * r).toFixed(2)} सेमी`);
        stepsHi.push(`• आयतन (Volume V) = ⅔πr³ = ⅔ × (22/7) × ${r.toFixed(2)}³ = ${finalV.toFixed(2)} सेमी³`);
        stepsHi.push(`• वक्र पृष्ठ (CSA) = 2πr² = 2 × (22/7) × ${r.toFixed(2)}² = ${finalCSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• कुल पृष्ठ (TSA) = 3πr² = 3 × (22/7) × ${r.toFixed(2)}² = ${finalTSA.toFixed(2)} सेमी²`);
        stepsHi.push(`• आधार वृत्त क्षेत्रफल = πr² = ${finalBase.toFixed(2)} सेमी²`);

        return {
          titleHi: `अर्धगोले का पूर्ण हल (त्रिज्या r = ${r.toFixed(2)} सेमी)`,
          titleEn: `Hemisphere Solution (r = ${r.toFixed(2)} cm)`,
          category: '3D Mensuration: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'त्रिज्या (r), आयतन (V), वक्र पृष्ठ (CSA), कुल पृष्ठ (TSA)',
          toFindEn: 'Radius, Volume, CSA, TSA',
          stepsHi,
          stepsEn,
          finalAnswerHi: `त्रिज्या (r) = ${r.toFixed(2)} सेमी | आयतन (V) = ${finalV.toFixed(2)} सेमी³ | वक्र पृष्ठ (CSA) = ${finalCSA.toFixed(2)} सेमी² | कुल पृष्ठ (TSA) = ${finalTSA.toFixed(2)} सेमी²`,
          finalAnswerEn: `Radius = ${r.toFixed(2)} cm | Volume = ${finalV.toFixed(2)} cm³ | CSA = ${finalCSA.toFixed(2)} cm² | TSA = ${finalTSA.toFixed(2)} cm²`,
          formulasUsed: formulas,
          tipsHi: 'ठोस अर्धगोले का TSA = वक्र पृष्ठ (2πr²) + ऊपर का समतल वृत्त (πr²) = 3πr²।',
          tipsEn: 'Solid hemisphere TSA = Curved surface (2πr²) + Flat circular top (πr²) = 3πr².',
        };
      }

      return {
        titleHi: 'अर्धगोला (Hemisphere): कोई 1 मान भरें',
        titleEn: 'Hemisphere: Enter 1 Value',
        category: '3D Mensuration',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'त्रिज्या, आयतन, CSA या TSA में से कोई 1 मान भरें',
        toFindEn: 'Enter any 1 value',
        stepsHi: ['कृपया कोई 1 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 1 value and leave the rest blank.'],
        finalAnswerHi: 'कृपया 1 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 1 value or select a preset.',
        formulasUsed: ['V = ⅔πr³', 'CSA = 2πr²', 'TSA = 3πr²'],
      };
    },
  },

  // 13. समलंब चतुर्भुज (Trapezium): a, b, h, A
  {
    id: 'trapezium',
    nameHi: 'समलंब चतुर्भुज (Trapezium)',
    nameEn: 'Trapezium',
    categoryHi: '2D चतुर्भुज (2D Quadrilaterals)',
    categoryEn: '2D Geometry',
    icon: '⏢',
    badge: 'A = ½(a + b)h',
    mainFormulaText: 'क्षेत्रफल A = ½ × (a + b) × h | b = (2A / h) - a | h = 2A / (a + b) | मध्यिका = (a + b)/2',
    descriptionHi: 'क्षेत्रफल (A), पहली समानांतर भुजा (a), दूसरी समानांतर भुजा (b), ऊंचाई (h) में से कोई 3 मान भरें, छूटा हुआ मान ऐप हल करेगा।',
    descriptionEn: 'Enter any 3 values among Area, Parallel Side 1, Parallel Side 2, Height; the app will solve the blank unknown.',
    variables: [
      { key: 'area', symbol: 'A', labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', unitHi: 'सेमी² (cm²)', unitEn: 'sq cm' },
      { key: 'sideA', symbol: 'a', labelHi: 'पहली समानांतर भुजा (Side a)', labelEn: 'Side (a)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'sideB', symbol: 'b', labelHi: 'दूसरी समानांतर भुजा (Side b)', labelEn: 'Side (b)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'height', symbol: 'h', labelHi: 'ऊंचाई / लंबवत दूरी (Height h)', labelEn: 'Height (h)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
    ],
    presets: [
      {
        nameHi: 'A = 120, h = 8, a = 12 ⇒ दूसरी भुजा (b) निकालें',
        nameEn: 'A = 120, h = 8, a = 12 ⇒ Find Side (b)',
        values: { area: 120, sideA: 12, sideB: null, height: 8 },
        descriptionHi: 'क्षेत्रफल, ऊंचाई व पहली भुजा से दूसरी भुजा ज्ञात करना।',
        descriptionEn: 'Given Area, Height, and Side a, find Side b.',
      },
      {
        nameHi: 'a = 10, b = 20, h = 6 ⇒ क्षेत्रफल (A) निकालें',
        nameEn: 'a = 10, b = 20, h = 6 ⇒ Find Area (A)',
        values: { area: null, sideA: 10, sideB: 20, height: 6 },
        descriptionHi: 'दोनों समांतर भुजाओं व ऊंचाई से क्षेत्रफल निकालना।',
        descriptionEn: 'Calculate Area from both parallel sides and height.',
      },
    ],
    solve: (inputs) => {
      let A = inputs.area;
      let a = inputs.sideA;
      let b = inputs.sideB;
      let h = inputs.height;

      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (A !== null && A !== undefined) givenData.push({ labelHi: 'क्षेत्रफल (Area A)', labelEn: 'Area (A)', value: `${A} सेमी²` });
      if (a !== null && a !== undefined) givenData.push({ labelHi: 'पहली भुजा (a)', labelEn: 'Side a', value: `${a} सेमी` });
      if (b !== null && b !== undefined) givenData.push({ labelHi: 'दूसरी भुजा (b)', labelEn: 'Side b', value: `${b} सेमी` });
      if (h !== null && h !== undefined) givenData.push({ labelHi: 'ऊंचाई (h)', labelEn: 'Height (h)', value: `${h} सेमी` });

      if (a && b && h && !A) {
        A = 0.5 * (a + b) * h;
        stepsHi.push(`चरण 1 (मानक सूत्र): समलंब का क्षेत्रफल (A) = ½ × (a + b) × h`);
        stepsHi.push(`चरण 2: A = ½ × (${a} + ${b}) × ${h} = ½ × ${a + b} × ${h} = ${A.toFixed(2)} सेमी²`);
        stepsEn.push(`Step 1: Area = ½(a + b)h`);
        stepsEn.push(`Step 2: A = ½ × (${a} + ${b}) × ${h} = ${A.toFixed(2)} cm²`);
        formulas.push('A = ½(a + b)h');
      } else if (A && h && a && !b) {
        const sum = (2 * A) / h;
        b = sum - a;
        stepsHi.push(`चरण 1 (मानक सूत्र): A = ½ × (a + b) × h`);
        stepsHi.push(`चरण 2 (2 से गुणा करने पर): 2A = (a + b) × h`);
        stepsHi.push(`चरण 3 (h से भाग देने पर): (a + b) = (2 × ${A}) / ${h} = ${(2 * A).toFixed(2)} / ${h} = ${sum.toFixed(2)}`);
        stepsHi.push(`चरण 4 (पक्षांतरण): b = ${sum.toFixed(2)} - ${a} = ${b.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: A = ½(a + b)h`);
        stepsEn.push(`Step 2: (a + b) = 2A / h = ${sum.toFixed(2)}`);
        stepsEn.push(`Step 3: b = ${sum.toFixed(2)} - ${a} = ${b.toFixed(2)} cm`);
        formulas.push('b = (2A / h) - a');
      } else if (A && h && b && !a) {
        const sum = (2 * A) / h;
        a = sum - b;
        stepsHi.push(`चरण 1: a = (2A / h) - b = (2 × ${A}) / ${h} - ${b} = ${a.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: a = (2A / h) - b = ${a.toFixed(2)} cm`);
        formulas.push('a = (2A / h) - b');
      } else if (A && a && b && !h) {
        h = (2 * A) / (a + b);
        stepsHi.push(`चरण 1: ऊंचाई h = (2 × A) / (a + b) = (2 × ${A}) / (${a} + ${b}) = ${h.toFixed(2)} सेमी`);
        stepsEn.push(`Step 1: Height h = 2A / (a + b) = ${h.toFixed(2)} cm`);
        formulas.push('h = 2A / (a + b)');
      }

      if (a !== null && a !== undefined && b !== null && b !== undefined && h !== null && h !== undefined && A !== null && A !== undefined) {
        const median = (a + b) / 2;
        stepsHi.push(`\n• मध्यिका (Median) = (a + b)/2 = (${a.toFixed(2)} + ${b.toFixed(2)}) / 2 = ${median.toFixed(2)} सेमी`);

        return {
          titleHi: `समलंब चतुर्भुज का हल (A = ${A.toFixed(2)} सेमी², a = ${a.toFixed(2)} सेमी, b = ${b.toFixed(2)} सेमी, h = ${h.toFixed(2)} सेमी)`,
          titleEn: `Trapezium Solution`,
          category: '2D Geometry: सर्व-चर समीकरण हल',
          givenData,
          toFindHi: 'अज्ञात भुजा (b/a), ऊंचाई (h) या क्षेत्रफल (A)',
          toFindEn: 'Missing Side, Height, or Area',
          stepsHi,
          stepsEn,
          finalAnswerHi: `क्षेत्रफल (A) = ${A.toFixed(2)} सेमी² | भुजा a = ${a.toFixed(2)} सेमी | भुजा b = ${b.toFixed(2)} सेमी | ऊंचाई h = ${h.toFixed(2)} सेमी | मध्यिका = ${median.toFixed(2)} सेमी`,
          finalAnswerEn: `Area = ${A.toFixed(2)} cm² | Side a = ${a.toFixed(2)} cm | Side b = ${b.toFixed(2)} cm | Height = ${h.toFixed(2)} cm | Median = ${median.toFixed(2)} cm`,
          formulasUsed: formulas,
          tipsHi: 'समलंब का क्षेत्रफल = (समानांतर भुजाओं का योग / 2) × ऊंचाई = मध्यिका × ऊंचाई।',
          tipsEn: 'Trapezium Area = (Sum of parallel sides / 2) × Height = Median × Height.',
        };
      }

      return {
        titleHi: 'समलंब (Trapezium): कोई 3 मान भरें',
        titleEn: 'Trapezium: Enter 3 Values',
        category: '2D Geometry',
        givenData: givenData.length ? givenData : [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'कम से कम कोई 3 मान भरें (उदा: A, h, a से b निकालें)',
        toFindEn: 'Enter at least 3 values',
        stepsHi: ['कृपया कोई 3 मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter 3 values and leave the rest blank.'],
        finalAnswerHi: 'कृपया 3 मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter 3 values or select a preset.',
        formulasUsed: ['A = ½(a + b)h', 'b = (2A / h) - a'],
      };
    },
  },

  // 14. घन कटिंग व रीज़निंग (Cube Slicing & Painting Reasoning)
  {
    id: 'cube_cutting_reasoning',
    nameHi: 'घन काटना व रंगाई रीज़निंग (Cube Slicing & Reasoning)',
    nameEn: 'Cube Slicing & Painting',
    categoryHi: 'रीज़निंग व लॉजिक (Reasoning & Logic)',
    categoryEn: 'Reasoning',
    icon: '🎲',
    badge: 'N = n³ | 3-Face: 8 | 2-Face: 12(n-2)',
    mainFormulaText: 'कुल छोटे घन N = n³ | 3 सतह रंगे = 8 (कोने) | 2 सतह रंगे = 12(n - 2) (किनारे) | 1 सतह रंगा = 6(n - 2)² (फलक) | 0 सतह (रंगहीन) = (n - 2)³ | कुल कट्स = 3(n - 1)',
    descriptionHi: 'बड़े घन की भुजा (L), छोटे घन की भुजा (s), कुल टुकड़े (N), या विभाजन संख्या (n) में से कोई 1 मान भरें, सभी प्रकार के रंगे घनों की संख्या ऐप निकाल देगा।',
    descriptionEn: 'Enter large cube side (L), small cube side (s), total cubes (N), or parts (n); the app will compute all face counts.',
    variables: [
      { key: 'n', symbol: 'n', labelHi: 'प्रति भुजा टुकड़े (Parts n = L/s)', labelEn: 'Parts per side (n)', unitHi: 'भाग', unitEn: 'parts' },
      { key: 'totalCubes', symbol: 'N', labelHi: 'कुल छोटे घन (Total Cubes N = n³)', labelEn: 'Total Mini Cubes (N)', unitHi: 'घन', unitEn: 'cubes' },
      { key: 'largeSide', symbol: 'L', labelHi: 'बड़े घन की भुजा (Large Side L)', labelEn: 'Large Cube Side (L)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
      { key: 'smallSide', symbol: 's', labelHi: 'छोटे घन की भुजा (Small Side s)', labelEn: 'Small Cube Side (s)', unitHi: 'सेमी (cm)', unitEn: 'cm' },
    ],
    presets: [
      {
        nameHi: 'L = 6 सेमी, s = 1 सेमी ⇒ 2-सतह, 1-सतह व रंगहीन निकालें',
        nameEn: 'L = 6 cm, s = 1 cm ⇒ Find All Face Counts',
        values: { n: null, totalCubes: null, largeSide: 6, smallSide: 1 },
        descriptionHi: '6 सेमी घन को 1 सेमी में काटा गया: n = 6, N = 216।',
        descriptionEn: 'Cut 6cm cube into 1cm cubes: n = 6, N = 216.',
      },
      {
        nameHi: 'N = 125 कुल घन ⇒ n, कट्स व 2-सतह रंगे निकालें',
        nameEn: 'N = 125 Total ⇒ Find n, Cuts & 2-Face',
        values: { n: null, totalCubes: 125, largeSide: null, smallSide: null },
        descriptionHi: 'कुल 125 घनों से n = 5 व अन्य मान निकालना।',
        descriptionEn: 'From 125 total cubes, n = 5.',
      },
      {
        nameHi: 'n = 4 ⇒ 3, 2, 1, 0 फलक रंगे घन निकालें',
        nameEn: 'n = 4 ⇒ Find 3, 2, 1, 0 Painted Faces',
        values: { n: 4, totalCubes: null, largeSide: null, smallSide: null },
        descriptionHi: 'n = 4 (कुल 64 घन): 3-सतह=8, 2-सतह=24, 1-सतह=24, रंगहीन=8।',
        descriptionEn: 'For n = 4, calculate all painted faces.',
      },
    ],
    solve: (inputs) => {
      let n: number | null = null;
      const givenData: { labelHi: string; labelEn: string; value: string }[] = [];
      const stepsHi: string[] = [];
      const stepsEn: string[] = [];
      const formulas: string[] = [];

      if (inputs.largeSide && inputs.smallSide) {
        const L = inputs.largeSide;
        const s = inputs.smallSide;
        n = Math.round(L / s);
        givenData.push({ labelHi: 'बड़े घन की भुजा (L)', labelEn: 'Large Side (L)', value: `${L} सेमी` });
        givenData.push({ labelHi: 'छोटे घन की भुजा (s)', labelEn: 'Small Side (s)', value: `${s} सेमी` });
        stepsHi.push(`चरण 1 (विभाजन n): n = बड़े घन की भुजा / छोटे घन की भुजा = ${L} / ${s} = ${n}`);
        stepsEn.push(`Step 1: n = L / s = ${L} / ${s} = ${n}`);
        formulas.push('n = L / s', 'Total = n³', '3-Faces = 8', '2-Faces = 12(n-2)', '1-Face = 6(n-2)²', '0-Face = (n-2)³');
      } else if (inputs.totalCubes) {
        const N = inputs.totalCubes;
        n = Math.round(Math.cbrt(N));
        givenData.push({ labelHi: 'कुल छोटे घन (N)', labelEn: 'Total Cubes (N)', value: `${N}` });
        stepsHi.push(`चरण 1 (घनमूल): n = ³√N = ³√${N} = ${n}`);
        stepsEn.push(`Step 1: n = ³√N = ${n}`);
        formulas.push('n = ³√Total', '2-Faces = 12(n-2)', '1-Face = 6(n-2)²', '0-Face = (n-2)³');
      } else if (inputs.n) {
        n = inputs.n;
        givenData.push({ labelHi: 'प्रति भुजा भाग (n)', labelEn: 'Parts (n)', value: `${n}` });
        stepsHi.push(`चरण 1: दिया गया विभाजन n = ${n}`);
        stepsEn.push(`Step 1: Given n = ${n}`);
        formulas.push('Total = n³', '3-Faces = 8', '2-Faces = 12(n-2)', '1-Face = 6(n-2)²', '0-Face = (n-2)³');
      }

      if (n !== null && !isNaN(n) && n >= 1) {
        const totalN = Math.pow(n, 3);
        const threeFace = n >= 2 ? 8 : 1;
        const twoFace = n >= 2 ? 12 * (n - 2) : 0;
        const oneFace = n >= 2 ? 6 * Math.pow(n - 2, 2) : 0;
        const zeroFace = n >= 2 ? Math.pow(n - 2, 3) : 0;
        const totalCuts = 3 * (n - 1);

        stepsHi.push(`\n[रीज़निंग सूत्रों द्वारा मान]:`);
        stepsHi.push(`• कुल छोटे घन (N) = n³ = ${n}³ = ${totalN}`);
        stepsHi.push(`• कुल कट्स (Cuts) = 3 × (n - 1) = 3 × (${n} - 1) = ${totalCuts}`);
        stepsHi.push(`• 3 सतह रंगे घन (कोनों पर / Corners) = 8`);
        stepsHi.push(`• 2 सतह रंगे घन (किनारों पर / Edges) = 12 × (n - 2) = 12 × (${n} - 2) = ${twoFace}`);
        stepsHi.push(`• 1 सतह रंगा घन (फलकों पर / Faces) = 6 × (n - 2)² = 6 × (${n} - 2)² = ${oneFace}`);
        stepsHi.push(`• 0 सतह रंगे (रंगहीन / Inner core) = (n - 2)³ = (${n} - 2)³ = ${zeroFace}`);

        return {
          titleHi: `घन विच्छेदन रीज़निंग हल (n = ${n}, कुल घन = ${totalN})`,
          titleEn: `Cube Slicing Reasoning Solution (n = ${n}, N = ${totalN})`,
          category: 'Reasoning: घन काटना व रंगाई',
          givenData,
          toFindHi: 'सभी प्रकार के रंगे घनों की संख्या व कट्स',
          toFindEn: 'All painted face counts and cuts',
          stepsHi,
          stepsEn,
          finalAnswerHi: `कुल घन = ${totalN} | 3-सतह = 8 | 2-सतह = ${twoFace} | 1-सतह = ${oneFace} | रंगहीन (0-सतह) = ${zeroFace} | कुल कट्स = ${totalCuts}`,
          finalAnswerEn: `Total = ${totalN} | 3-Faces = 8 | 2-Faces = ${twoFace} | 1-Face = ${oneFace} | 0-Face = ${zeroFace} | Cuts = ${totalCuts}`,
          formulasUsed: formulas,
          tipsHi: 'जांच (Verification): 8 + 12(n-2) + 6(n-2)² + (n-2)³ = n³ (कुल योग हमेशा n³ के बराबर होगा)।',
          tipsEn: 'Verification: 8 + 12(n-2) + 6(n-2)² + (n-2)³ = n³.',
        };
      }

      return {
        titleHi: 'घन काटना (Cube Cutting): कोई 1 मान भरें',
        titleEn: 'Cube Cutting: Enter 1 Value',
        category: 'Reasoning',
        givenData: [{ labelHi: 'स्थिति', labelEn: 'Status', value: 'कोई मान नहीं भरा गया' }],
        toFindHi: 'बड़े व छोटे घन की भुजा, या कुल घन N, या n भरें',
        toFindEn: 'Enter Large/Small sides, or Total N, or n',
        stepsHi: ['कृपया कोई मान भरें और बाकी खाली छोड़ें।'],
        stepsEn: ['Please enter values and leave the rest blank.'],
        finalAnswerHi: 'कृपया मान भरें या क्विक प्रीसेट चुनें।',
        finalAnswerEn: 'Please enter values or select a preset.',
        formulasUsed: ['Total = n³', '2-Faces = 12(n-2)', '1-Face = 6(n-2)²', '0-Face = (n-2)³'],
      };
    },
  },
];

