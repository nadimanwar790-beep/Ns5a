import { Geometry2DParams } from '../types';

export interface Geometry2DResult {
  area: number;
  perimeter: number;
  diagonal1?: number;
  diagonal2?: number;
  altitude?: number;
  inradius?: number;
  circumradius?: number;
  angles?: number[];
  stepsHi: string[];
  stepsEn: string[];
  formulasHi: Record<string, string>;
  formulasEn: Record<string, string>;
  propertiesHi: string[];
  propertiesEn: string[];
}

export function calculateGeometry2D(params: Geometry2DParams): Geometry2DResult {
  const {
    type,
    sideA,
    sideB = sideA,
    sideC = sideA,
    sideD = sideB,
    diagonal1,
    diagonal2,
    angleDeg = 60,
    height,
  } = params;

  const PI = Math.PI;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  switch (type) {
    case 'square': {
      // वर्ग (Square)
      const a = Math.max(0.1, sideA);
      const area = a * a;
      const perimeter = 4 * a;
      const d = a * Math.SQRT2;
      const inradius = a / 2;
      const circumradius = (a * Math.SQRT2) / 2;

      return {
        area,
        perimeter,
        diagonal1: d,
        diagonal2: d,
        inradius,
        circumradius,
        angles: [90, 90, 90, 90],
        stepsHi: [
          `भुजा (Side a) = ${a} सेमी`,
          `क्षेत्रफल (Area) = a² = ${a}² = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = 4 × a = 4 × ${a} = ${perimeter.toFixed(2)} सेमी`,
          `विकर्ण (Diagonal d) = a × √2 = ${a} × 1.414 = ${d.toFixed(2)} सेमी`,
          `अंतःवृत्त की त्रिज्या (Inradius r) = a / 2 = ${(a / 2).toFixed(2)} सेमी`,
          `परिवृत्त की त्रिज्या (Circumradius R) = a / √2 = ${circumradius.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Side (a) = ${a} cm`,
          `Area (A) = a² = ${a}² = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = 4a = 4 × ${a} = ${perimeter.toFixed(2)} cm`,
          `Diagonal (d) = a√2 = ${a} × 1.414 = ${d.toFixed(2)} cm`,
          `Inradius (r) = a / 2 = ${(a / 2).toFixed(2)} cm`,
          `Circumradius (R) = a / √2 = ${circumradius.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = a² = (d²) / 2',
          'परिमाप (Perimeter)': 'P = 4 · a',
          'विकर्ण (Diagonal)': 'd = a · √2',
          'अंतःवृत्त त्रिज्या (r)': 'r = a / 2',
          'परिवृत्त त्रिज्या (R)': 'R = a / √2',
        },
        formulasEn: {
          'Area': 'A = a² = d² / 2',
          'Perimeter': 'P = 4a',
          'Diagonal': 'd = a√2',
          'Inradius': 'r = a / 2',
          'Circumradius': 'R = a / √2',
        },
        propertiesHi: [
          'सभी चारों भुजाएं बराबर और समानांतर होती हैं।',
          'प्रत्येक आंतरिक कोण 90° का होता है।',
          'दोनों विकर्ण बराबर होते हैं और एक-दूसरे को 90° पर समद्विभाजित (Bisect at 90°) करते हैं।',
        ],
        propertiesEn: [
          'All 4 sides are equal and opposite sides are parallel.',
          'Each interior angle is exactly 90°.',
          'Diagonals are equal and bisect each other perpendicularly at 90°.',
        ],
      };
    }

    case 'rectangle': {
      // आयत (Rectangle)
      const l = Math.max(0.1, sideA);
      const b = Math.max(0.1, sideB);
      const area = l * b;
      const perimeter = 2 * (l + b);
      const d = Math.sqrt(l * l + b * b);
      const circumradius = d / 2;

      return {
        area,
        perimeter,
        diagonal1: d,
        diagonal2: d,
        circumradius,
        angles: [90, 90, 90, 90],
        stepsHi: [
          `लंबाई (Length l) = ${l} सेमी, चौड़ाई (Breadth b) = ${b} सेमी`,
          `क्षेत्रफल (Area) = l × b = ${l} × ${b} = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = 2 × (l + b) = 2 × (${l} + ${b}) = ${perimeter.toFixed(2)} सेमी`,
          `विकर्ण (Diagonal d) = √(l² + b²) = √(${l}² + ${b}²) = √(${(l * l + b * b).toFixed(2)}) = ${d.toFixed(2)} सेमी`,
          `परिवृत्त त्रिज्या (Circumradius R) = d / 2 = ${(d / 2).toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Length (l) = ${l} cm, Breadth (b) = ${b} cm`,
          `Area (A) = l × b = ${l} × ${b} = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = 2(l + b) = 2 × (${l} + ${b}) = ${perimeter.toFixed(2)} cm`,
          `Diagonal (d) = √(l² + b²) = √(${l}² + ${b}²) = ${d.toFixed(2)} cm`,
          `Circumradius (R) = d / 2 = ${(d / 2).toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = l · b',
          'परिमाप (Perimeter)': 'P = 2 · (l + b)',
          'विकर्ण (Diagonal)': 'd = √(l² + b²)',
          'लंबाई (l)': 'l = √(d² - b²) = A / b',
          'चौड़ाई (b)': 'b = √(d² - l²) = A / l',
        },
        formulasEn: {
          'Area': 'A = l · b',
          'Perimeter': 'P = 2(l + b)',
          'Diagonal': 'd = √(l² + b²)',
          'Length': 'l = √(d² - b²)',
          'Breadth': 'b = √(d² - l²)',
        },
        propertiesHi: [
          'आमने-सामने की भुजाएं बराबर और समानांतर होती हैं।',
          'चारों आंतरिक कोण 90° के होते हैं।',
          'दोनों विकर्ण लंबाई में बराबर होते हैं और एक-दूसरे को समद्विभाजित करते हैं।',
        ],
        propertiesEn: [
          'Opposite sides are equal and parallel.',
          'All four internal angles are 90°.',
          'Diagonals are equal in length and bisect each other.',
        ],
      };
    }

    case 'parallelogram': {
      // समानांतर चतुर्भुज (Parallelogram)
      const a = Math.max(0.1, sideA); // side
      const b = Math.max(0.1, sideB); // base
      const theta = Math.min(170, Math.max(10, angleDeg));
      const rad = toRad(theta);
      const h = height !== undefined ? height : a * Math.sin(rad);
      const area = b * h;
      const perimeter = 2 * (a + b);
      // Diagonals by law of cosines:
      const d1 = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(rad));
      const d2 = Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(rad));

      return {
        area,
        perimeter,
        diagonal1: d1,
        diagonal2: d2,
        altitude: h,
        angles: [theta, 180 - theta, theta, 180 - theta],
        stepsHi: [
          `आधार (Base b) = ${b} सेमी, पार्श्व भुजा (Side a) = ${a} सेमी, कोण (θ) = ${theta}°`,
          `ऊंचाई (Height h) = a × sin(θ) = ${a} × sin(${theta}°) = ${h.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = आधार × ऊंचाई = ${b} × ${h.toFixed(2)} = ${area.toFixed(2)} वर्ग सेमी`,
          `क्षेत्रफल (त्रिकोणमिति) = a × b × sin(θ) = ${a} × ${b} × sin(${theta}°) = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = 2 × (a + b) = 2 × (${a} + ${b}) = ${perimeter.toFixed(2)} सेमी`,
          `विकर्ण 1 (d₁) = √(a² + b² - 2ab cos θ) = ${d1.toFixed(2)} सेमी`,
          `विकर्ण 2 (d₂) = √(a² + b² + 2ab cos θ) = ${d2.toFixed(2)} सेमी`,
          `अपोलोनियस प्रमेय: d₁² + d₂² = 2(a² + b²) = ${(d1 * d1 + d2 * d2).toFixed(1)} ≈ ${(2 * (a * a + b * b)).toFixed(1)}`,
        ],
        stepsEn: [
          `Base (b) = ${b} cm, Side (a) = ${a} cm, Angle (θ) = ${theta}°`,
          `Height (h) = a × sin(θ) = ${a} × sin(${theta}°) = ${h.toFixed(2)} cm`,
          `Area (A) = Base × Height = ${b} × ${h.toFixed(2)} = ${area.toFixed(2)} cm²`,
          `Area (Trig) = ab sin(θ) = ${a} × ${b} × sin(${theta}°) = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = 2(a + b) = 2 × (${a} + ${b}) = ${perimeter.toFixed(2)} cm`,
          `Diagonal 1 (d₁) = ${d1.toFixed(2)} cm, Diagonal 2 (d₂) = ${d2.toFixed(2)} cm`,
          `Apollonius Identity: d₁² + d₂² = 2(a² + b²)`,
        ],
        formulasHi: {
          'क्षेत्रफल (आधार × ऊंचाई)': 'A = b · h',
          'क्षेत्रफल (कोण विधि)': 'A = a · b · sin(θ)',
          'परिमाप (Perimeter)': 'P = 2 · (a + b)',
          'विकर्ण संबंध': 'd₁² + d₂² = 2 · (a² + b²)',
        },
        formulasEn: {
          'Area (Base × Height)': 'A = b · h',
          'Area (Trig formula)': 'A = a · b · sin(θ)',
          'Perimeter': 'P = 2(a + b)',
          'Diagonals Identity': 'd₁² + d₂² = 2(a² + b²)',
        },
        propertiesHi: [
          'सम्मुख भुजाएं समान और समानांतर होती हैं (AB = CD, AD = BC)।',
          'सम्मुख कोण बराबर होते हैं (∠A = ∠C, ∠B = ∠D) और आसन्न कोणों का योग 180° होता है।',
          'विकर्ण एक-दूसरे को समद्विभाजित करते हैं (परंतु लंबवत या बराबर नहीं होते)।',
        ],
        propertiesEn: [
          'Opposite sides are parallel and congruent.',
          'Opposite angles are equal; adjacent angles sum to 180°.',
          'Diagonals bisect each other (not necessarily perpendicular or equal).',
        ],
      };
    }

    case 'rhombus': {
      // समचतुर्भुज (Rhombus)
      let a = Math.max(0.1, sideA);
      let d1 = diagonal1 || 8;
      let d2 = diagonal2 || 6;

      // If diagonals provided, calculate side
      if (diagonal1 && diagonal2) {
        d1 = diagonal1;
        d2 = diagonal2;
        a = 0.5 * Math.sqrt(d1 * d1 + d2 * d2);
      } else {
        d1 = 2 * a * Math.sin(toRad(angleDeg / 2));
        d2 = 2 * a * Math.cos(toRad(angleDeg / 2));
      }

      const area = 0.5 * d1 * d2;
      const perimeter = 4 * a;
      const inradius = (d1 * d2) / (4 * a); // h / 2
      const altitude = (d1 * d2) / (2 * a);

      return {
        area,
        perimeter,
        diagonal1: d1,
        diagonal2: d2,
        altitude,
        inradius,
        angles: [angleDeg, 180 - angleDeg, angleDeg, 180 - angleDeg],
        stepsHi: [
          `विकर्ण 1 (d₁) = ${d1.toFixed(2)} सेमी, विकर्ण 2 (d₂) = ${d2.toFixed(2)} सेमी`,
          `भुजा (Side a) = ½ × √(d₁² + d₂²) = ½ × √(${d1.toFixed(1)}² + ${d2.toFixed(1)}²) = ${a.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = ½ × d₁ × d₂ = ½ × ${d1.toFixed(2)} × ${d2.toFixed(2)} = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = 4 × a = 4 × ${a.toFixed(2)} = ${perimeter.toFixed(2)} सेमी`,
          `ऊंचाई (Altitude h) = Area / a = ${area.toFixed(2)} / ${a.toFixed(2)} = ${altitude.toFixed(2)} सेमी`,
          `अंतःवृत्त त्रिज्या (Inradius r) = h / 2 = ${(altitude / 2).toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Diagonal 1 (d₁) = ${d1.toFixed(2)} cm, Diagonal 2 (d₂) = ${d2.toFixed(2)} cm`,
          `Side (a) = ½√(d₁² + d₂²) = ${a.toFixed(2)} cm`,
          `Area (A) = ½ × d₁ × d₂ = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = 4a = ${perimeter.toFixed(2)} cm`,
          `Altitude (h) = Area / a = ${altitude.toFixed(2)} cm`,
          `Inradius (r) = h / 2 = ${(altitude / 2).toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = ½ · d₁ · d₂ = a · h = a² · sin(θ)',
          'भुजा (Side a)': 'a = ½ · √(d₁² + d₂²)',
          'परिमाप (Perimeter)': 'P = 4 · a',
          'ऊंचाई (Altitude)': 'h = (d₁ · d₂) / (2 · a)',
          'विकर्ण संबंध': '4 · a² = d₁² + d₂²',
        },
        formulasEn: {
          'Area': 'A = ½ · d₁ · d₂ = a · h',
          'Side': 'a = ½ · √(d₁² + d₂²)',
          'Perimeter': 'P = 4a',
          'Altitude': 'h = (d₁ · d₂) / (2a)',
          'Diagonals Identity': '4a² = d₁² + d₂²',
        },
        propertiesHi: [
          'सभी चारों भुजाएं बराबर होती हैं (AB = BC = CD = DA)।',
          'दोनों विकर्ण एक-दूसरे को 90° (समकोण) पर समद्विभाजित करते हैं।',
          'विकर्ण शीर्ष कोणों (Vertex angles) को भी समद्विभाजित करते हैं।',
        ],
        propertiesEn: [
          'All 4 sides are equal.',
          'Diagonals bisect each other perpendicularly at 90°.',
          'Diagonals bisect the vertex angles.',
        ],
      };
    }

    case 'trapezium': {
      // समलंब चतुर्भुज (Trapezium / Trapezoid)
      const a = Math.max(0.1, sideA); // parallel top
      const b = Math.max(0.1, sideB); // parallel bottom
      const c = Math.max(0.1, sideC); // non-parallel left
      const d = Math.max(0.1, sideD); // non-parallel right
      const h = height !== undefined ? Math.max(0.1, height) : 4;
      const area = 0.5 * (a + b) * h;
      const perimeter = a + b + c + d;
      const median = (a + b) / 2; // मध्यिका

      return {
        area,
        perimeter,
        altitude: h,
        stepsHi: [
          `समानांतर भुजाएं: a = ${a} सेमी, b = ${b} सेमी`,
          `असमानांतर भुजाएं: c = ${c} सेमी, d = ${d} सेमी`,
          `ऊंचाई / लंबवत दूरी (h) = ${h} सेमी`,
          `मध्यिका (Median / Midline) = (a + b) / 2 = (${a} + ${b}) / 2 = ${median.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = ½ × (समानांतर भुजाओं का योग) × ऊंचाई`,
          `= ½ × (${a} + ${b}) × ${h} = ½ × ${(a + b).toFixed(2)} × ${h} = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = a + b + c + d = ${a} + ${b} + ${c} + ${d} = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Parallel sides: a = ${a} cm, b = ${b} cm`,
          `Non-parallel sides: c = ${c} cm, d = ${d} cm`,
          `Height / Distance (h) = ${h} cm`,
          `Median (Mid-segment) = (a + b) / 2 = ${median.toFixed(2)} cm`,
          `Area (A) = ½ × (a + b) × h = ½ × ${(a + b).toFixed(2)} × ${h} = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = a + b + c + d = ${perimeter.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = ½ · (a + b) · h = मध्यिका × h',
          'परिमाप (Perimeter)': 'P = a + b + c + d',
          'मध्यिका (Mid-segment)': 'm = (a + b) / 2',
          'समद्विबाहु समलंब विकर्ण': 'd = √(ab + c²)',
        },
        formulasEn: {
          'Area': 'A = ½(a + b)h = Median × h',
          'Perimeter': 'P = a + b + c + d',
          'Median': 'm = (a + b) / 2',
          'Isosceles Diagonal': 'd = √(ab + c²)',
        },
        propertiesHi: [
          'भुजाओं का केवल एक जोड़ा समानांतर होता है (AB || CD)।',
          'मध्यिका की लंबाई समानांतर भुजाओं के समांतर माध्य (a+b)/2 के बराबर होती है।',
          'समद्विबाहु समलंब (Isosceles Trapezium) में असमानांतर भुजाएं और विकर्ण बराबर होते हैं।',
        ],
        propertiesEn: [
          'Exactly one pair of opposite sides is parallel (AB || CD).',
          'The mid-segment (median) connects the midpoints of non-parallel legs and equals (a+b)/2.',
          'In an isosceles trapezium, non-parallel sides are equal and base angles are equal.',
        ],
      };
    }

    case 'kite': {
      // पतंग (Kite)
      const a = Math.max(0.1, sideA);
      const b = Math.max(0.1, sideB);
      const d1 = diagonal1 || 8;
      const d2 = diagonal2 || 6;
      const area = 0.5 * d1 * d2;
      const perimeter = 2 * (a + b);

      return {
        area,
        perimeter,
        diagonal1: d1,
        diagonal2: d2,
        stepsHi: [
          `आसन्न भुजाएं: a = ${a} सेमी, b = ${b} सेमी`,
          `विकर्ण: d₁ = ${d1} सेमी, d₂ = ${d2} सेमी`,
          `क्षेत्रफल (Area) = ½ × d₁ × d₂ = ½ × ${d1} × ${d2} = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = 2 × (a + b) = 2 × (${a} + ${b}) = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Adjacent pairs: a = ${a} cm, b = ${b} cm`,
          `Diagonals: d₁ = ${d1} cm, d₂ = ${d2} cm`,
          `Area (A) = ½ × d₁ × d₂ = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = 2(a + b) = ${perimeter.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = ½ · d₁ · d₂',
          'परिमाप (Perimeter)': 'P = 2 · (a + b)',
        },
        formulasEn: {
          'Area': 'A = ½ · d₁ · d₂',
          'Perimeter': 'P = 2(a + b)',
        },
        propertiesHi: [
          'आसन्न भुजाओं के दो जोड़े बराबर होते हैं।',
          'दोनों विकर्ण एक-दूसरे को 90° पर काटते हैं।',
          'मुख्य विकर्ण दूसरे विकर्ण को समद्विभाजित करता है।',
        ],
        propertiesEn: [
          'Two distinct pairs of adjacent equal sides.',
          'Diagonals intersect perpendicularly at 90°.',
          'The main diagonal bisects the other diagonal.',
        ],
      };
    }

    case 'cyclic_quadrilateral': {
      // चक्रीय चतुर्भुज (Cyclic Quadrilateral)
      const a = Math.max(0.1, sideA);
      const b = Math.max(0.1, sideB);
      const c = Math.max(0.1, sideC);
      const d = Math.max(0.1, sideD);
      const perimeter = a + b + c + d;
      const s = perimeter / 2; // Semi-perimeter

      // Brahmagupta's Formula: Area = sqrt((s-a)(s-b)(s-c)(s-d))
      const diffProduct = (s - a) * (s - b) * (s - c) * (s - d);
      const area = diffProduct > 0 ? Math.sqrt(diffProduct) : 0;

      // Diagonals by Brahmagupta's diagonals formula:
      const d1 = Math.sqrt(((a * c + b * d) * (a * b + c * d)) / (a * d + b * c));
      const d2 = Math.sqrt(((a * c + b * d) * (a * d + b * c)) / (a * b + c * d));

      // Circumradius R = 1/(4*Area) * sqrt((ab+cd)(ac+bd)(ad+bc))
      const circumradius =
        area > 0
          ? (1 / (4 * area)) *
            Math.sqrt((a * b + c * d) * (a * c + b * d) * (a * d + b * c))
          : undefined;

      return {
        area,
        perimeter,
        diagonal1: d1,
        diagonal2: d2,
        circumradius,
        stepsHi: [
          `चारों भुजाएं: a = ${a}, b = ${b}, c = ${c}, d = ${d} सेमी`,
          `अर्ध-परिमाप (s) = (a + b + c + d) / 2 = ${s.toFixed(2)} सेमी`,
          `ब्रह्मगुप्त सूत्र (Brahmagupta Formula): Area = √[(s-a)(s-b)(s-c)(s-d)]`,
          `= √[(${s - a})(${s - b})(${s - c})(${s - d})] = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = a + b + c + d = ${perimeter.toFixed(2)} सेमी`,
          `टॉलेमी प्रमेय (Ptolemy Theorem): d₁ × d₂ = (a × c) + (b × d) = ${(a * c + b * d).toFixed(2)}`,
          `परिवृत्त त्रिज्या (R) = ${circumradius ? circumradius.toFixed(2) + ' सेमी' : 'N/A'}`,
        ],
        stepsEn: [
          `Sides: a = ${a}, b = ${b}, c = ${c}, d = ${d} cm`,
          `Semi-perimeter (s) = (a+b+c+d)/2 = ${s.toFixed(2)} cm`,
          `Brahmagupta's Area = √[(s-a)(s-b)(s-c)(s-d)] = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = ${perimeter.toFixed(2)} cm`,
          `Ptolemy's Theorem: d₁ · d₂ = ac + bd = ${(a * c + b * d).toFixed(2)}`,
          `Circumradius (R) = ${circumradius ? circumradius.toFixed(2) + ' cm' : 'N/A'}`,
        ],
        formulasHi: {
          'क्षेत्रफल (ब्रह्मगुप्त सूत्र)': 'A = √[(s-a)(s-b)(s-c)(s-d)]',
          'टॉलेमी प्रमेय': 'd₁ · d₂ = (a · c) + (b · d)',
          'सम्मुख कोण योग': '∠A + ∠C = 180°, ∠B + ∠D = 180°',
          'परिवृत्त त्रिज्या (R)': 'R = ¼A · √[(ab+cd)(ac+bd)(ad+bc)]',
        },
        formulasEn: {
          'Area (Brahmagupta)': 'A = √[(s-a)(s-b)(s-c)(s-d)]',
          'Ptolemy Theorem': 'd₁ · d₂ = ac + bd',
          'Opposite Angles': '∠A + ∠C = 180°, ∠B + ∠D = 180°',
          'Circumradius (R)': 'R = ¼A · √[(ab+cd)(ac+bd)(ad+bc)]',
        },
        propertiesHi: [
          'सभी चारों शीर्ष (Vertices) एक ही वृत्त की परिधि पर स्थित होते हैं।',
          'सम्मुख कोण संपूरक (Supplementary) होते हैं, अर्थात ∠A + ∠C = 180° और ∠B + ∠D = 180°।',
          'टॉलेमी प्रमेय: विकर्णों का गुणनफल = सम्मुख भुजाओं के गुणनफलों का योग (d₁·d₂ = ac + bd)।',
        ],
        propertiesEn: [
          'All four vertices lie on the circumference of a single circle.',
          'Opposite angles are supplementary: ∠A + ∠C = 180° and ∠B + ∠D = 180°.',
          'Ptolemy Theorem: Product of diagonals equals sum of products of opposite sides (d₁·d₂ = ac + bd).',
        ],
      };
    }

    case 'equilateral_triangle': {
      // समबाहु त्रिभुज (Equilateral Triangle)
      const a = Math.max(0.1, sideA);
      const area = (Math.sqrt(3) / 4) * a * a;
      const perimeter = 3 * a;
      const h = (Math.sqrt(3) / 2) * a;
      const inradius = a / (2 * Math.sqrt(3));
      const circumradius = a / Math.sqrt(3);

      return {
        area,
        perimeter,
        altitude: h,
        inradius,
        circumradius,
        angles: [60, 60, 60],
        stepsHi: [
          `भुजा (Side a) = ${a} सेमी`,
          `ऊंचाई / शीर्षलंब (h) = (√3 / 2) × a = 0.866 × ${a} = ${h.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = (√3 / 4) × a² = 0.433 × ${a}² = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = 3 × a = 3 × ${a} = ${perimeter.toFixed(2)} सेमी`,
          `अंतःवृत्त त्रिज्या (Inradius r) = a / (2√3) = ${inradius.toFixed(2)} सेमी`,
          `परिवृत्त त्रिज्या (Circumradius R) = a / √3 = ${circumradius.toFixed(2)} सेमी (R = 2r)`,
        ],
        stepsEn: [
          `Side (a) = ${a} cm`,
          `Altitude (h) = (√3 / 2)a = ${h.toFixed(2)} cm`,
          `Area (A) = (√3 / 4)a² = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = 3a = ${perimeter.toFixed(2)} cm`,
          `Inradius (r) = a / (2√3) = ${inradius.toFixed(2)} cm`,
          `Circumradius (R) = a / √3 = ${circumradius.toFixed(2)} cm (R = 2r)`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = (√3 / 4) · a²',
          'ऊंचाई (Height)': 'h = (√3 / 2) · a',
          'परिमाप (Perimeter)': 'P = 3 · a',
          'अंतःवृत्त त्रिज्या (r)': 'r = a / (2√3) = h / 3',
          'परिवृत्त त्रिज्या (R)': 'R = a / √3 = 2h / 3',
        },
        formulasEn: {
          'Area': 'A = (√3 / 4)a²',
          'Altitude': 'h = (√3 / 2)a',
          'Perimeter': 'P = 3a',
          'Inradius (r)': 'r = a / (2√3) = h / 3',
          'Circumradius (R)': 'R = a / √3 = 2h / 3',
        },
        propertiesHi: [
          'तीनों भुजाएं बराबर और तीनों आंतरिक कोण 60° के होते हैं।',
          'माध्यिका, शीर्षलंब, कोण समद्विभाजक और लंब समद्विभाजक सभी संपाती (coincident) होते हैं।',
          'परिवृत्त की त्रिज्या अंतःवृत्त की त्रिज्या की दोगुनी (R = 2r) होती है।',
        ],
        propertiesEn: [
          'All 3 sides equal, all 3 angles equal to 60°.',
          'Median, altitude, and angle bisectors are all identical lines.',
          'Circumradius is exactly twice the inradius (R = 2r).',
        ],
      };
    }

    case 'right_triangle': {
      // समकोण त्रिभुज (Right-angled Triangle)
      const b = Math.max(0.1, sideA); // base
      const p = Math.max(0.1, sideB); // perpendicular
      const h = Math.sqrt(b * b + p * p); // hypotenuse (karn)
      const area = 0.5 * b * p;
      const perimeter = b + p + h;
      const inradius = (b + p - h) / 2;
      const circumradius = h / 2;
      const altitudeOnHypotenuse = (b * p) / h;

      return {
        area,
        perimeter,
        altitude: altitudeOnHypotenuse,
        inradius,
        circumradius,
        angles: [90, Math.round((Math.asin(p / h) * 180) / PI), Math.round((Math.asin(b / h) * 180) / PI)],
        stepsHi: [
          `आधार (Base) = ${b} सेमी, लंब (Perpendicular) = ${p} सेमी`,
          `पाइथागोरस प्रमेय: कर्ण (Hypotenuse) = √(आधार² + लंब²) = √(${b}² + ${p}²) = ${h.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = ½ × आधार × लंब = ½ × ${b} × ${p} = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = आधार + लंब + कर्ण = ${b} + ${p} + ${h.toFixed(2)} = ${perimeter.toFixed(2)} सेमी`,
          `कर्ण पर डाले गए लंब की लंबाई = (आधार × लंब) / कर्ण = ${altitudeOnHypotenuse.toFixed(2)} सेमी`,
          `अंतःवृत्त त्रिज्या (Inradius r) = (P + B - H) / 2 = ${inradius.toFixed(2)} सेमी`,
          `परिवृत्त त्रिज्या (Circumradius R) = H / 2 = ${(h / 2).toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Base (b) = ${b} cm, Perpendicular (p) = ${p} cm`,
          `Pythagoras Theorem: Hypotenuse (h) = √(b² + p²) = ${h.toFixed(2)} cm`,
          `Area (A) = ½ × b × p = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = b + p + h = ${perimeter.toFixed(2)} cm`,
          `Altitude on Hypotenuse = (b × p) / h = ${altitudeOnHypotenuse.toFixed(2)} cm`,
          `Inradius (r) = (p + b - h) / 2 = ${inradius.toFixed(2)} cm`,
          `Circumradius (R) = h / 2 = ${(h / 2).toFixed(2)} cm`,
        ],
        formulasHi: {
          'पाइथागोरस प्रमेय': 'कर्ण² = आधार² + लंब²',
          'क्षेत्रफल (Area)': 'A = ½ · आधार · लंब',
          'परिमाप (Perimeter)': 'P = b + p + h',
          'अंतःवृत्त त्रिज्या (r)': 'r = (b + p - h) / 2 = A / s',
          'परिवृत्त त्रिज्या (R)': 'R = कर्ण / 2',
        },
        formulasEn: {
          'Pythagorean Theorem': 'h² = b² + p²',
          'Area': 'A = ½ · b · p',
          'Perimeter': 'P = b + p + h',
          'Inradius (r)': 'r = (b + p - h) / 2',
          'Circumradius (R)': 'R = h / 2',
        },
        propertiesHi: [
          'एक कोण 90° का होता है और अन्य दो कोण न्यूनकोण व पूरक (Complementary) होते हैं।',
          'परिकेंद्र (Circumcenter) हमेशा कर्ण के मध्य बिंदु पर स्थित होता है।',
        ],
        propertiesEn: [
          'One angle is 90°; the other two are complementary acute angles.',
          'The circumcenter is the exact midpoint of the hypotenuse.',
        ],
      };
    }

    case 'isosceles_triangle': {
      // समद्विबाहु त्रिभुज (Isosceles Triangle)
      const a = Math.max(0.1, sideA); // equal side
      const b = Math.max(0.1, sideB); // base
      const h = Math.sqrt(Math.max(0.01, a * a - (b * b) / 4));
      const area = (b / 4) * Math.sqrt(Math.max(0.01, 4 * a * a - b * b));
      const perimeter = 2 * a + b;

      return {
        area,
        perimeter,
        altitude: h,
        stepsHi: [
          `समान भुजाएं (a) = ${a} सेमी, आधार (b) = ${b} सेमी`,
          `ऊंचाई (h) = √(a² - b²/4) = ${h.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = (b / 4) × √(4a² - b²) = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = 2a + b = 2 × ${a} + ${b} = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Equal sides (a) = ${a} cm, Base (b) = ${b} cm`,
          `Altitude (h) = √(a² - b²/4) = ${h.toFixed(2)} cm`,
          `Area (A) = (b / 4)√(4a² - b²) = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = 2a + b = ${perimeter.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = (b / 4) · √(4a² - b²)',
          'ऊंचाई (Altitude)': 'h = √(a² - b²/4)',
          'परिमाप (Perimeter)': 'P = 2a + b',
        },
        formulasEn: {
          'Area': 'A = (b / 4)√(4a² - b²)',
          'Altitude': 'h = √(a² - b²/4)',
          'Perimeter': 'P = 2a + b',
        },
        propertiesHi: [
          'दो भुजाएं बराबर होती हैं और उनके सम्मुख कोण भी बराबर होते हैं।',
          'शीर्ष से आधार पर डाला गया लंब आधार को समद्विभाजित करता है।',
        ],
        propertiesEn: [
          'Two sides are equal, and angles opposite to equal sides are equal.',
          'The altitude to the base bisects the base and the vertex angle.',
        ],
      };
    }

    case 'scalene_triangle': {
      // विषमबाहु त्रिभुज (Scalene Triangle - Heron's formula)
      const a = Math.max(0.1, sideA);
      const b = Math.max(0.1, sideB);
      const c = Math.max(0.1, sideC);
      const perimeter = a + b + c;
      const s = perimeter / 2;
      const diffProduct = s * (s - a) * (s - b) * (s - c);
      const area = diffProduct > 0 ? Math.sqrt(diffProduct) : 0;
      const inradius = s > 0 ? area / s : 0;
      const circumradius = area > 0 ? (a * b * c) / (4 * area) : 0;

      return {
        area,
        perimeter,
        inradius,
        circumradius,
        stepsHi: [
          `भुजाएं: a = ${a}, b = ${b}, c = ${c} सेमी`,
          `अर्ध-परिमाप (s) = (a + b + c) / 2 = ${s.toFixed(2)} सेमी`,
          `हीरोन का सूत्र (Heron's Formula): Area = √[s(s-a)(s-b)(s-c)]`,
          `= √[${s.toFixed(1)} × ${(s - a).toFixed(1)} × ${(s - b).toFixed(1)} × ${(s - c).toFixed(1)}] = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = a + b + c = ${perimeter.toFixed(2)} सेमी`,
          `अंतःवृत्त त्रिज्या (r) = Area / s = ${inradius.toFixed(2)} सेमी`,
          `परिवृत्त त्रिज्या (R) = (abc) / (4 × Area) = ${circumradius.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Sides: a = ${a}, b = ${b}, c = ${c} cm`,
          `Semi-perimeter (s) = (a+b+c)/2 = ${s.toFixed(2)} cm`,
          `Heron's Formula: Area = √[s(s-a)(s-b)(s-c)] = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = a + b + c = ${perimeter.toFixed(2)} cm`,
          `Inradius (r) = Area / s = ${inradius.toFixed(2)} cm`,
          `Circumradius (R) = abc / (4 × Area) = ${circumradius.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (हीरोन सूत्र)': 'A = √[s · (s-a) · (s-b) · (s-c)]',
          'अर्ध-परिमाप (s)': 's = (a + b + c) / 2',
          'अंतःवृत्त त्रिज्या (r)': 'r = A / s',
          'परिवृत्त त्रिज्या (R)': 'R = (a · b · c) / (4 · A)',
        },
        formulasEn: {
          'Area (Heron Formula)': 'A = √[s(s-a)(s-b)(s-c)]',
          'Semi-perimeter (s)': 's = (a + b + c) / 2',
          'Inradius (r)': 'r = A / s',
          'Circumradius (R)': 'R = abc / (4A)',
        },
        propertiesHi: [
          'तीनों भुजाएं और तीनों कोण असमान होते हैं।',
          'किन्हीं दो भुजाओं का योग हमेशा तीसरी भुजा से बड़ा होता है (a + b > c)।',
        ],
        propertiesEn: [
          'All three sides and angles are unequal.',
          'Triangle Inequality: Sum of any two sides is strictly greater than the third side (a + b > c).',
        ],
      };
    }

    case 'circle': {
      // वृत्त (Circle)
      const r = Math.max(0.1, sideA);
      const area = PI * r * r;
      const perimeter = 2 * PI * r; // Circumference
      const diameter = 2 * r;

      return {
        area,
        perimeter,
        stepsHi: [
          `त्रिज्या (Radius r) = ${r} सेमी, व्यास (Diameter d) = ${diameter} सेमी`,
          `क्षेत्रफल (Area) = π × r² = 3.1416 × ${r}² = ${area.toFixed(2)} वर्ग सेमी`,
          `परिधि / परिमाप (Circumference) = 2 × π × r = 2 × 3.1416 × ${r} = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Radius (r) = ${r} cm, Diameter (d) = ${diameter} cm`,
          `Area (A) = πr² = π × ${r}² = ${area.toFixed(2)} cm²`,
          `Circumference (C) = 2πr = 2 × π × ${r} = ${perimeter.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = π · r² = (π · d²) / 4',
          'परिधि (Circumference)': 'C = 2 · π · r = π · d',
          'व्यास (Diameter)': 'd = 2 · r',
        },
        formulasEn: {
          'Area': 'A = πr² = (πd²) / 4',
          'Circumference': 'C = 2πr = πd',
          'Diameter': 'd = 2r',
        },
        propertiesHi: [
          'केंद्र से परिधि की दूरी हमेशा समान (त्रिज्या r) होती है।',
          'व्यास वृत्त की सबसे बड़ी जीवा (Longest Chord) होती है।',
          'अर्धवृत्त में बना कोण हमेशा समकोण (90°) होता है।',
        ],
        propertiesEn: [
          'All points on circumference are equidistant (radius r) from center.',
          'Diameter is the longest chord of the circle.',
          'Angle inscribed in a semicircle is always a right angle (90°).',
        ],
      };
    }

    case 'semicircle': {
      // अर्धवृत्त (Semicircle)
      const r = Math.max(0.1, sideA);
      const area = 0.5 * PI * r * r;
      const perimeter = PI * r + 2 * r; // πr + 2r (or r(π + 2) = 36/7 * r)

      return {
        area,
        perimeter,
        stepsHi: [
          `त्रिज्या (r) = ${r} सेमी`,
          `क्षेत्रफल (Area) = ½ × π × r² = ½ × 3.1416 × ${r}² = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = πr + 2r = (22/7 + 2) × r = (36/7) × ${r} = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Radius (r) = ${r} cm`,
          `Area (A) = ½πr² = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = πr + 2r = r(π + 2) ≈ (36/7)r = ${perimeter.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = ½ · π · r²',
          'परिमाप (Perimeter)': 'P = π · r + 2 · r = (36 / 7) · r',
        },
        formulasEn: {
          'Area': 'A = ½πr²',
          'Perimeter': 'P = πr + 2r = (36/7)r',
        },
        propertiesHi: [
          'अर्धवृत्त का परिमाप केवल वक्र भाग नहीं, बल्कि व्यास (2r) सहित होता है: (π+2)r.',
        ],
        propertiesEn: [
          'Perimeter includes the curved arc (πr) plus the diameter base (2r): r(π+2).',
        ],
      };
    }

    case 'ring': {
      // वलय (Circular Ring / Annulus)
      const R = Math.max(0.2, sideA); // outer radius
      const r = Math.min(R - 0.1, Math.max(0.1, sideB || R / 2)); // inner radius
      const area = PI * (R * R - r * r);
      const perimeter = 2 * PI * (R + r);
      const width = R - r;

      return {
        area,
        perimeter,
        stepsHi: [
          `बाह्य त्रिज्या (Outer Radius R) = ${R} सेमी, आंतरिक त्रिज्या (Inner Radius r) = ${r} सेमी`,
          `चौड़ाई (Width w) = R - r = ${width.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = π × (R² - r²) = π × (R + r)(R - r) = ${area.toFixed(2)} वर्ग सेमी`,
          `कुल परिमाप (Total Boundary) = 2πR + 2πr = 2π(R + r) = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Outer radius (R) = ${R} cm, Inner radius (r) = ${r} cm`,
          `Ring width = R - r = ${width.toFixed(2)} cm`,
          `Area (A) = π(R² - r²) = π(R + r)(R - r) = ${area.toFixed(2)} cm²`,
          `Total Boundary = 2π(R + r) = ${perimeter.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = π · (R² - r²) = π · (R + r) · (R - r)',
          'चौड़ाई (Width)': 'w = R - r',
          'कुल परिमाप': 'P = 2 · π · (R + r)',
        },
        formulasEn: {
          'Area': 'A = π(R² - r²)',
          'Width': 'w = R - r',
          'Total Perimeter': 'P = 2π(R + r)',
        },
        propertiesHi: [
          'दो संकेंद्रीय वृत्तों (Concentric circles) के बीच का वृत्ताकार क्षेत्र वलय कहलाता है।',
        ],
        propertiesEn: [
          'The region between two concentric circles with a common center.',
        ],
      };
    }

    case 'sector': {
      // त्रिज्यखंड (Sector of a circle)
      const r = Math.max(0.1, sideA);
      const theta = Math.min(360, Math.max(1, angleDeg));
      const arcLength = (theta / 360) * (2 * PI * r);
      const area = (theta / 360) * (PI * r * r); // or 0.5 * arcLength * r
      const perimeter = arcLength + 2 * r;

      return {
        area,
        perimeter,
        stepsHi: [
          `त्रिज्या (r) = ${r} सेमी, कोण (θ) = ${theta}°`,
          `चाप की लंबाई (Arc Length L) = (θ / 360) × 2πr = (${theta} / 360) × 2 × 3.1416 × ${r} = ${arcLength.toFixed(2)} सेमी`,
          `क्षेत्रफल (Area) = (θ / 360) × πr² = (${theta} / 360) × 3.1416 × ${r}² = ${area.toFixed(2)} वर्ग सेमी`,
          `क्षेत्रफल (चाप विधि) = ½ × L × r = ½ × ${arcLength.toFixed(2)} × ${r} = ${area.toFixed(2)} वर्ग सेमी`,
          `परिमाप (Perimeter) = चाप की लंबाई + 2r = ${arcLength.toFixed(2)} + 2(${r}) = ${perimeter.toFixed(2)} सेमी`,
        ],
        stepsEn: [
          `Radius (r) = ${r} cm, Sector Angle (θ) = ${theta}°`,
          `Arc Length (L) = (θ / 360) × 2πr = ${arcLength.toFixed(2)} cm`,
          `Area (A) = (θ / 360) × πr² = ½ × L × r = ${area.toFixed(2)} cm²`,
          `Perimeter (P) = L + 2r = ${perimeter.toFixed(2)} cm`,
        ],
        formulasHi: {
          'क्षेत्रफल (Area)': 'A = (θ / 360) · π · r² = ½ · L · r',
          'चाप की लंबाई (Arc Length L)': 'L = (θ / 360) · 2 · π · r',
          'परिमाप (Perimeter)': 'P = L + 2 · r',
        },
        formulasEn: {
          'Area': 'A = (θ / 360) · πr² = ½ · L · r',
          'Arc Length': 'L = (θ / 360) · 2πr',
          'Perimeter': 'P = L + 2r',
        },
        propertiesHi: [
          'वृत्त की दो त्रिज्याओं और उनके बीच के चाप से घिरा क्षेत्र त्रिज्यखंड कहलाता है।',
        ],
        propertiesEn: [
          'The portion of a circle enclosed by two radii and an arc.',
        ],
      };
    }

    case 'path_rectangle': {
      // आयत/वर्ग के चारों ओर या अंदर रास्ता (Path Around / Inside Rectangle or Square)
      const l = Math.max(0.1, sideA);
      const b = Math.max(0.1, sideB || sideA);
      const w = Math.max(0.1, params.pathWidth ?? 2);
      const isInner = !!params.isInnerPath;
      const ratePaving = params.costPerSqUnit ?? 15; // ₹ per m²
      const rateTurf = params.turfCostPerSqUnit ?? 5; // ₹ per m²
      const rateFence = params.fenceCostPerUnit ?? 25; // ₹ per m

      let outerL = 0;
      let outerB = 0;
      let innerL = 0;
      let innerB = 0;
      let fieldArea = 0;
      let lawnArea = 0;
      let pathArea = 0;
      let outerPerimeter = 0;
      let innerPerimeter = 0;

      if (!isInner) {
        // Path is OUTSIDE the rectangular field of dimensions l × b
        innerL = l;
        innerB = b;
        outerL = l + 2 * w;
        outerB = b + 2 * w;
        fieldArea = innerL * innerB; // original field/lawn area
        const totalOuterArea = outerL * outerB;
        pathArea = totalOuterArea - fieldArea; // 2w(l + b + 2w)
        lawnArea = fieldArea;
        outerPerimeter = 2 * (outerL + outerB);
        innerPerimeter = 2 * (innerL + innerB);
      } else {
        // Path is INSIDE the rectangular field of dimensions l × b
        outerL = l;
        outerB = b;
        innerL = Math.max(0, l - 2 * w);
        innerB = Math.max(0, b - 2 * w);
        const totalOuterArea = outerL * outerB;
        lawnArea = innerL * innerB; // remaining inner lawn
        pathArea = totalOuterArea - lawnArea; // 2w(l + b - 2w)
        fieldArea = totalOuterArea;
        outerPerimeter = 2 * (outerL + outerB);
        innerPerimeter = 2 * (innerL + innerB);
      }

      const costPath = pathArea * ratePaving;
      const costLawn = lawnArea * rateTurf;
      const costFenceOuter = outerPerimeter * rateFence;

      return {
        area: pathArea,
        perimeter: outerPerimeter,
        diagonal1: Math.hypot(outerL, outerB),
        diagonal2: Math.hypot(innerL, innerB),
        stepsHi: [
          `स्थिति: ${isInner ? 'मैदान के अंदर की ओर रास्ता (Inside Path)' : 'मैदान के चारों ओर बाहर रास्ता (Outside Path)'}`,
          `मूल मैदान: लंबाई = ${l} मी, चौड़ाई = ${b} मी | रास्ते की चौड़ाई (w) = ${w} मी`,
          isInner
            ? `भीतरी लॉन की विमाएं: l' = ${l} - 2(${w}) = ${innerL} मी, b' = ${b} - 2(${w}) = ${innerB} मी`
            : `रास्ते सहित बाहरी विमाएं: L = ${l} + 2(${w}) = ${outerL} मी, B = ${b} + 2(${w}) = ${outerB} मी`,
          `बाहरी कुल क्षेत्रफल = ${outerL} × ${outerB} = ${(outerL * outerB).toFixed(2)} वर्ग मीटर (मी²)`,
          `भीतरी मैदान का क्षेत्रफल = ${innerL} × ${innerB} = ${(innerL * innerB).toFixed(2)} वर्ग मीटर (मी²)`,
          `रास्ते का क्षेत्रफल (Path Area) = बाहरी क्षेत्रफल - भीतरी क्षेत्रफल = ${(outerL * outerB).toFixed(2)} - ${(innerL * innerB).toFixed(2)} = ${pathArea.toFixed(2)} मी²`,
          `शॉर्टकट सूत्र: ${isInner ? 'Area = 2w(l + b - 2w)' : 'Area = 2w(l + b + 2w)'} = ${pathArea.toFixed(2)} मी²`,
          `\n[लागत एवं बाउंड्री खर्च]:`,
          `• रास्ते पर फर्श/टाइल बिछाने का खर्च (₹${ratePaving}/मी²) = ${pathArea.toFixed(2)} × ${ratePaving} = ₹${costPath.toFixed(2)}`,
          `• लॉन में घास लगाने का खर्च (₹${rateTurf}/मी²) = ${lawnArea.toFixed(2)} × ${rateTurf} = ₹${costLawn.toFixed(2)}`,
          `• बाहरी बाउंड्री पर तारबंदी का खर्च (₹${rateFence}/मी) = ${outerPerimeter.toFixed(2)} × ${rateFence} = ₹${costFenceOuter.toFixed(2)}`,
        ],
        stepsEn: [
          `Configuration: ${isInner ? 'Path INSIDE the field' : 'Path OUTSIDE the field'}`,
          `Original Dimensions: Length = ${l} m, Breadth = ${b} m | Path Width (w) = ${w} m`,
          isInner
            ? `Inner Lawn Dimensions: l' = ${l} - 2(${w}) = ${innerL} m, b' = ${b} - 2(${w}) = ${innerB} m`
            : `Outer Dimensions with Path: L = ${l} + 2(${w}) = ${outerL} m, B = ${b} + 2(${w}) = ${outerB} m`,
          `Outer Area = ${outerL} × ${outerB} = ${(outerL * outerB).toFixed(2)} sq m`,
          `Inner Area = ${innerL} × ${innerB} = ${(innerL * innerB).toFixed(2)} sq m`,
          `Path Area = Outer Area - Inner Area = ${pathArea.toFixed(2)} sq m`,
          `Direct Formula: ${isInner ? '2w(l + b - 2w)' : '2w(l + b + 2w)'} = ${pathArea.toFixed(2)} m²`,
          `Cost of Paving Path (@ ₹${ratePaving}/m²) = ₹${costPath.toFixed(2)}`,
          `Cost of Turfing Lawn (@ ₹${rateTurf}/m²) = ₹${costLawn.toFixed(2)}`,
          `Outer Boundary Fencing (@ ₹${rateFence}/m) = ₹${costFenceOuter.toFixed(2)}`,
        ],
        formulasHi: {
          'बाहरी रास्ते का क्षेत्रफल': 'A_path = 2w(l + b + 2w) = (l+2w)(b+2w) - lb',
          'भीतरी रास्ते का क्षेत्रफल': 'A_path = 2w(l + b - 2w) = lb - (l-2w)(b-2w)',
          'वर्ग का बाहरी रास्ता': 'A_path = 4w(a + w)',
          'वर्ग का भीतरी रास्ता': 'A_path = 4w(a - w)',
          'रास्ते की लागत': 'खर्च = A_path × दर (₹/मी²)',
        },
        formulasEn: {
          'Outside Path Area': 'A_path = 2w(l + b + 2w) = (l+2w)(b+2w) - lb',
          'Inside Path Area': 'A_path = 2w(l + b - 2w) = lb - (l-2w)(b-2w)',
          'Square Outside Path': 'A_path = 4w(a + w)',
          'Square Inside Path': 'A_path = 4w(a - w)',
          'Cost Calculation': 'Cost = Path Area × Rate per sq unit',
        },
        propertiesHi: [
          'रास्ते का क्षेत्रफल हमेशा बड़े बाहरी आयत और छोटे भीतरी आयत के क्षेत्रफलों का अंतर होता है।',
          'बाहरी रास्ते में लंबाई और चौड़ाई दोनों तरफ 2w बढ़ती हैं; भीतरी रास्ते में दोनों तरफ 2w घटती हैं।',
        ],
        propertiesEn: [
          'Path area is always the difference between outer and inner rectangle areas.',
          'For outer paths, each dimension increases by 2w; for inner paths, each decreases by 2w.',
        ],
      };
    }

    case 'path_cross': {
      // बीचो-बीच समकोण पर परस्पर काटते रास्ते (Cross-Paths in Center)
      const l = Math.max(0.1, sideA);
      const b = Math.max(0.1, sideB || sideA);
      const w = Math.max(0.1, params.pathWidth ?? 2);
      const ratePaving = params.costPerSqUnit ?? 20;
      const rateTurf = params.turfCostPerSqUnit ?? 8;

      const areaPathL = l * w; // path parallel to length
      const areaPathB = b * w; // path parallel to breadth
      const areaIntersection = w * w; // central common square
      const totalCrossPathArea = areaPathL + areaPathB - areaIntersection; // w(l + b - w)
      const fieldArea = l * b;
      const remainingLawnArea = fieldArea - totalCrossPathArea; // (l - w)(b - w)
      const lawnQuadrantL = (l - w) / 2;
      const lawnQuadrantB = (b - w) / 2;

      const costPaving = totalCrossPathArea * ratePaving;
      const costTurfing = remainingLawnArea * rateTurf;

      return {
        area: totalCrossPathArea,
        perimeter: 2 * (l + b),
        stepsHi: [
          `मैदान: लंबाई l = ${l} मी, चौड़ाई b = ${b} मी | क्रॉस रास्ते की चौड़ाई w = ${w} मी`,
          `1. लंबाई के समानांतर रास्ते का क्षेत्रफल = l × w = ${l} × ${w} = ${areaPathL.toFixed(2)} मी²`,
          `2. चौड़ाई के समानांतर रास्ते का क्षेत्रफल = b × w = ${b} × ${w} = ${areaPathB.toFixed(2)} मी²`,
          `3. बीच के उभयनिष्ठ (Common) चौराहे का क्षेत्रफल = w² = ${w} × ${w} = ${areaIntersection.toFixed(2)} मी²`,
          `4. कुल क्रॉस रास्ते का क्षेत्रफल = (l × w) + (b × w) - w² = ${areaPathL.toFixed(2)} + ${areaPathB.toFixed(2)} - ${areaIntersection.toFixed(2)} = ${totalCrossPathArea.toFixed(2)} मी²`,
          `शॉर्टकट सूत्र: w(l + b - w) = ${w} × (${l} + ${b} - ${w}) = ${totalCrossPathArea.toFixed(2)} मी²`,
          `5. शेष बचे 4 लॉन टुकड़ों का कुल क्षेत्रफल = (l - w)(b - w) = (${l} - ${w}) × (${b} - ${w}) = ${remainingLawnArea.toFixed(2)} मी²`,
          `प्रत्येक 1 लॉन कोने का क्षेत्रफल = ${remainingLawnArea.toFixed(2)} / 4 = ${(remainingLawnArea / 4).toFixed(2)} मी²`,
          `\n[खर्च की गणना]:`,
          `• रास्तों पर बजरी/ईंट बिछाने का खर्च (₹${ratePaving}/मी²) = ${totalCrossPathArea.toFixed(2)} × ${ratePaving} = ₹${costPaving.toFixed(2)}`,
          `• 4 कोनों में घास लगाने का खर्च (₹${rateTurf}/मी²) = ${remainingLawnArea.toFixed(2)} × ${rateTurf} = ₹${costTurfing.toFixed(2)}`,
        ],
        stepsEn: [
          `Dimensions: Length l = ${l} m, Breadth b = ${b} m | Road Width w = ${w} m`,
          `1. Area of road parallel to length = l × w = ${l} × ${w} = ${areaPathL.toFixed(2)} sq m`,
          `2. Area of road parallel to breadth = b × w = ${b} × ${w} = ${areaPathB.toFixed(2)} sq m`,
          `3. Central common square area = w² = ${w}² = ${areaIntersection.toFixed(2)} sq m`,
          `4. Total Cross-Road Area = lw + bw - w² = ${totalCrossPathArea.toFixed(2)} sq m`,
          `Direct formula: w(l + b - w) = ${w}(${l} + ${b} - ${w}) = ${totalCrossPathArea.toFixed(2)} m²`,
          `5. Remaining 4 Lawn quadrants area = (l - w)(b - w) = ${remainingLawnArea.toFixed(2)} sq m`,
          `Each individual lawn patch = ${remainingLawnArea.toFixed(2)} / 4 = ${(remainingLawnArea / 4).toFixed(2)} m²`,
          `Paving cost (@ ₹${ratePaving}/m²) = ₹${costPaving.toFixed(2)}`,
          `Turfing lawn cost (@ ₹${rateTurf}/m²) = ₹${costTurfing.toFixed(2)}`,
        ],
        formulasHi: {
          'क्रॉस रास्ते का क्षेत्रफल': 'A_cross = lw + bw - w² = w(l + b - w)',
          'शेष 4 लॉन का क्षेत्रफल': 'A_lawn = (l - w)(b - w) = Total - A_cross',
          'प्रत्येक लॉन टुकड़ा': 'A_single_lawn = [(l - w)(b - w)] / 4',
          'सड़क पक्की करने का खर्च': 'Cost = A_cross × दर (₹/मी²)',
        },
        formulasEn: {
          'Crossroads Area': 'A_cross = lw + bw - w² = w(l + b - w)',
          'Remaining Lawn Area': 'A_lawn = (l - w)(b - w)',
          'Each Lawn Quadrant': 'A_single_lawn = [(l - w)(b - w)] / 4',
          'Paving Cost': 'Cost = A_cross × Rate per sq m',
        },
        propertiesHi: [
          'बीच के उभयनिष्ठ वर्ग (Intersection) को दो बार जुड़ने से रोकने के लिए एक बार घटाया (Subtract) जाता है।',
          'शेष 4 लॉन के टुकड़े मिलकर एक नया आयत (l - w) × (b - w) बनाते हैं।',
        ],
        propertiesEn: [
          'The intersection square w² is subtracted once to avoid double-counting.',
          'The remaining 4 lawn quarters assemble into a rectangle of (l - w) × (b - w).',
        ],
      };
    }

    case 'path_circle': {
      // वृत्ताकार रास्ते व वलय (Circular Path / Annulus)
      const r = Math.max(0.1, sideB || 14); // inner radius
      const w = Math.max(0.1, params.pathWidth ?? 3.5); // path width
      const R = r + w; // outer radius
      const ratePaving = params.costPerSqUnit ?? 25;
      const rateFence = params.fenceCostPerUnit ?? 30;

      const innerArea = PI * r * r;
      const outerArea = PI * R * R;
      const pathArea = outerArea - innerArea; // π(R² - r²) = πw(2r + w)
      const innerCirc = 2 * PI * r;
      const outerCirc = 2 * PI * R;
      const circDiff = outerCirc - innerCirc; // 2πw

      const costPaving = pathArea * ratePaving;
      const costOuterFence = outerCirc * rateFence;
      const costInnerFence = innerCirc * rateFence;

      return {
        area: pathArea,
        perimeter: outerCirc,
        stepsHi: [
          `आंतरिक त्रिज्या (r) = ${r} मी | रास्ते की चौड़ाई (w) = ${w} मी`,
          `बाहरी त्रिज्या (R) = r + w = ${r} + ${w} = ${R} मी`,
          `1. बाहरी वृत्त का क्षेत्रफल = π × R² = (22/7) × ${R}² = ${outerArea.toFixed(2)} मी²`,
          `2. भीतरी पार्क का क्षेत्रफल = π × r² = (22/7) × ${r}² = ${innerArea.toFixed(2)} मी²`,
          `3. वृत्ताकार रास्ते का क्षेत्रफल = π(R² - r²) = π(R - r)(R + r) = (22/7) × ${w} × ${R + r} = ${pathArea.toFixed(2)} मी²`,
          `शॉर्टकट सूत्र: πw(2r + w) = (22/7) × ${w} × (${2 * r} + ${w}) = ${pathArea.toFixed(2)} मी²`,
          `4. परिधियों की गणना:`,
          `• भीतरी परिधि (Inner Circumference) = 2πr = 2 × (22/7) × ${r} = ${innerCirc.toFixed(2)} मी`,
          `• बाहरी परिधि (Outer Circumference) = 2πR = 2 × (22/7) × ${R} = ${outerCirc.toFixed(2)} मी`,
          `• दोनों परिधियों का अंतर = 2π(R - r) = 2πw = 2 × (22/7) × ${w} = ${circDiff.toFixed(2)} मी`,
          `\n[खर्च की गणना]:`,
          `• रास्ते पर बजरी/टाइल बिछाने का खर्च (₹${ratePaving}/मी²) = ${pathArea.toFixed(2)} × ${ratePaving} = ₹${costPaving.toFixed(2)}`,
          `• बाहरी किनारे पर तारबंदी (₹${rateFence}/मी) = ${outerCirc.toFixed(2)} × ${rateFence} = ₹${costOuterFence.toFixed(2)}`,
        ],
        stepsEn: [
          `Inner Radius (r) = ${r} m | Path Width (w) = ${w} m`,
          `Outer Radius (R) = r + w = ${r} + ${w} = ${R} m`,
          `1. Outer Circle Area = πR² = ${outerArea.toFixed(2)} sq m`,
          `2. Inner Circle Area = πr² = ${innerArea.toFixed(2)} sq m`,
          `3. Circular Path Area = π(R² - r²) = π(R - r)(R + r) = ${pathArea.toFixed(2)} sq m`,
          `Direct formula: πw(2r + w) = ${pathArea.toFixed(2)} sq m`,
          `4. Inner Circumference = 2πr = ${innerCirc.toFixed(2)} m`,
          `Outer Circumference = 2πR = ${outerCirc.toFixed(2)} m`,
          `Circumference Difference = 2πw = ${circDiff.toFixed(2)} m`,
          `Paving Cost (@ ₹${ratePaving}/m²) = ₹${costPaving.toFixed(2)}`,
          `Outer Boundary Fencing (@ ₹${rateFence}/m) = ₹${costOuterFence.toFixed(2)}`,
        ],
        formulasHi: {
          'वृत्ताकार रास्ते का क्षेत्रफल': 'A_path = π(R² - r²) = π(R - r)(R + r) = πw(2r + w)',
          'परिधियों का अंतर': 'C_outer - C_inner = 2π(R - r) = 2πw',
          'बाहरी त्रिज्या (R)': 'R = r + w = √(r² + A_path/π)',
          'रास्ते पर काम का खर्च': 'Cost = A_path × दर (₹/मी²)',
        },
        formulasEn: {
          'Circular Path Area': 'A_path = π(R² - r²) = π(R - r)(R + r) = πw(2r + w)',
          'Circumference Difference': 'ΔC = 2π(R - r) = 2πw',
          'Outer Radius': 'R = r + w',
          'Paving Cost': 'Cost = Path Area × Rate per sq m',
        },
        propertiesHi: [
          'दो संकेंद्रीय वृत्तों के बीच का क्षेत्र वृत्ताकार मार्ग या वलय (Ring) कहलाता है।',
          'दोनों परिधियों का अंतर हमेशा 2πw होता है, जो पार्क की त्रिज्या पर निर्भर नहीं करता।',
        ],
        propertiesEn: [
          'The region between two concentric circular boundaries forms the circular track/ring.',
          'The difference between outer and inner circumferences is strictly 2πw regardless of radius.',
        ],
      };
    }

    case 'running_track': {
      // धावन पथ / रनिंग ट्रैक (2 Straight sides + 2 Semicircular ends)
      const straightL = Math.max(1, params.straightLength ?? 106); // e.g. 106m or 84.39m (Olympic standard)
      const innerR = Math.max(1, sideB || 36.5); // inner lane radius
      const w = Math.max(0.5, params.pathWidth ?? 10); // total track width
      const outerR = innerR + w;

      const innerPerimeter = 2 * straightL + 2 * PI * innerR;
      const outerPerimeter = 2 * straightL + 2 * PI * outerR;
      const perimeterDiff = 2 * PI * w; // lane stagger

      // Track area: 2 rectangles (L × w) + 1 complete ring π(outerR² - innerR²)
      const straightTrackArea = 2 * (straightL * w);
      const curvedTrackArea = PI * (outerR * outerR - innerR * innerR);
      const totalTrackArea = straightTrackArea + curvedTrackArea;

      // Inside playing field area: 1 rectangle (L × 2*innerR) + 1 circle π*innerR²
      const innerFieldArea = straightL * (2 * innerR) + PI * innerR * innerR;

      return {
        area: totalTrackArea,
        perimeter: innerPerimeter,
        stepsHi: [
          `ट्रैक संरचना: 2 समानांतर सीधे भाग (L = ${straightL} मी) + 2 अर्धवृत्ताकार मोड़ (r = ${innerR} मी)`,
          `ट्रैक की कुल चौड़ाई (w) = ${w} मी | बाहरी मोड़ त्रिज्या (R) = ${innerR} + ${w} = ${outerR} मी`,
          `1. भीतरी ट्रैक की परिधि (कुल दौड़ दूरी) = 2L + 2πr = 2(${straightL}) + 2 × (22/7) × ${innerR} = ${(2 * straightL).toFixed(2)} + ${(2 * PI * innerR).toFixed(2)} = ${innerPerimeter.toFixed(2)} मी (मानक ~400 मी)`,
          `2. बाहरी ट्रैक की परिधि = 2L + 2πR = 2(${straightL}) + 2 × (22/7) × ${outerR} = ${outerPerimeter.toFixed(2)} मी`,
          `3. लेन स्टैगर (दौड़ने की रेखाओं का अंतर) = 2πw = 2 × (22/7) × ${w} = ${perimeterDiff.toFixed(2)} मी`,
          `4. ट्रैक का कुल क्षेत्रफल:`,
          `• 2 सीधे भागों का क्षेत्रफल = 2 × (L × w) = 2 × (${straightL} × ${w}) = ${straightTrackArea.toFixed(2)} मी²`,
          `• 2 अर्धवृत्तों (पूरे वलय) का क्षेत्रफल = π(R² - r²) = (22/7) × (${outerR}² - ${innerR}²) = ${curvedTrackArea.toFixed(2)} मी²`,
          `• कुल धावन पथ क्षेत्रफल = ${straightTrackArea.toFixed(2)} + ${curvedTrackArea.toFixed(2)} = ${totalTrackArea.toFixed(2)} वर्ग मीटर (मी²)`,
          `5. भीतरी खेल मैदान (Football/Field) का क्षेत्रफल = (L × 2r) + πr² = (${straightL} × ${2 * innerR}) + ${(PI * innerR * innerR).toFixed(2)} = ${innerFieldArea.toFixed(2)} मी²`,
        ],
        stepsEn: [
          `Track Layout: 2 Parallel Straights (L = ${straightL} m) + 2 Semicircular curves (r = ${innerR} m)`,
          `Track Width (w) = ${w} m | Outer Curve Radius (R) = ${innerR} + ${w} = ${outerR} m`,
          `1. Inner Running Distance (Perimeter) = 2L + 2πr = ${innerPerimeter.toFixed(2)} m (Standard 400m race track)`,
          `2. Outer Running Distance = 2L + 2πR = ${outerPerimeter.toFixed(2)} m`,
          `3. Stagger distance between lanes = 2πw = ${perimeterDiff.toFixed(2)} m`,
          `4. Track Area:`,
          `• Straight segments area = 2(L × w) = ${straightTrackArea.toFixed(2)} sq m`,
          `• Curved semicircular ends area = π(R² - r²) = ${curvedTrackArea.toFixed(2)} sq m`,
          `• Total Running Track Area = ${totalTrackArea.toFixed(2)} sq m`,
          `5. Inner Field Area (Lawn/Football) = 2rL + πr² = ${innerFieldArea.toFixed(2)} sq m`,
        ],
        formulasHi: {
          'भीतरी ट्रैक परिमाप': 'P_inner = 2L + 2πr (मानक = 400 मी)',
          'बाहरी ट्रैक परिमाप': 'P_outer = 2L + 2π(r + w)',
          'लेन स्टैगर दूरी': 'Stagger = 2πw',
          'ट्रैक का कुल क्षेत्रफल': 'A_track = 2Lw + π(R² - r²) = 2Lw + πw(2r + w)',
          'भीतरी मैदान का क्षेत्रफल': 'A_inner_field = 2rL + πr²',
        },
        formulasEn: {
          'Inner Track Perimeter': 'P_inner = 2L + 2πr (400m Olympic standard)',
          'Outer Track Perimeter': 'P_outer = 2L + 2π(r + w)',
          'Lane Stagger': 'Stagger = 2πw',
          'Total Track Area': 'A_track = 2Lw + πw(2r + w)',
          'Inner Playing Field Area': 'A_field = 2rL + πr²',
        },
        propertiesHi: [
          'अंतर्राष्ट्रीय 400 मीटर रनिंग ट्रैक में 2 सीधे भाग और 2 अर्धवृत्ताकार मोड़ होते हैं।',
          'बाहरी लेन वाले धावकों को समान दूरी तय कराने के लिए 2πw की आगे की छूट (Stagger) दी जाती है।',
        ],
        propertiesEn: [
          'Standard 400m athletic tracks consist of 2 parallel straightaways and 2 semicircular ends.',
          'Outer lane runners receive a staggered start of 2πw to equalize total race distance.',
        ],
      };
    }
  }
}
