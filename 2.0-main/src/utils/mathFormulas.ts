import { CubeCutParams, CubeFace, MiniCubeData, MiniCubeType, ShapeParams } from '../types';

export interface MensurationResult {
  volume: number;
  curvedSurfaceArea: number;
  totalSurfaceArea: number;
  slantHeight?: number;
  spaceDiagonal?: number;
  perimeter?: number;
  stepsHi: string[];
  stepsEn: string[];
  formulasHi: { [key: string]: string };
  formulasEn: { [key: string]: string };
}

export function calculateShapeMetrics(params: ShapeParams): MensurationResult {
  const { type, radius, radiusOuter = radius * 1.5, radiusTop = 0, height, length, width } = params;
  const PI = Math.PI;

  switch (type) {
    case 'cylinder': {
      // बेलन
      const r = Math.max(0.1, radius);
      const h = Math.max(0.1, height);
      const volume = PI * r * r * h;
      const csa = 2 * PI * r * h;
      const tsa = 2 * PI * r * (r + h);

      return {
        volume,
        curvedSurfaceArea: csa,
        totalSurfaceArea: tsa,
        stepsHi: [
          `त्रिज्या (r) = ${r} सेमी, ऊंचाई (h) = ${h} सेमी`,
          `आयतन (Volume) = π × r² × h = 3.1416 × ${r}² × ${h} = ${volume.toFixed(2)} घन सेमी`,
          `वक्र पृष्ठ क्षेत्रफल (CSA) = 2 × π × r × h = 2 × 3.1416 × ${r} × ${h} = ${csa.toFixed(2)} वर्ग सेमी`,
          `कुल पृष्ठ क्षेत्रफल (TSA) = 2 × π × r × (r + h) = 2 × 3.1416 × ${r} × (${r} + ${h}) = ${tsa.toFixed(2)} वर्ग सेमी`,
        ],
        stepsEn: [
          `Radius (r) = ${r} cm, Height (h) = ${h} cm`,
          `Volume (V) = πr²h = π × ${r}² × ${h} = ${volume.toFixed(2)} cu cm`,
          `Curved Surface Area (CSA) = 2πrh = 2 × π × ${r} × ${h} = ${csa.toFixed(2)} sq cm`,
          `Total Surface Area (TSA) = 2πr(r + h) = ${tsa.toFixed(2)} sq cm`,
        ],
        formulasHi: {
          'आयतन (Volume)': 'V = π · r² · h',
          'वक्र पृष्ठ (CSA)': 'CSA = 2 · π · r · h',
          'कुल पृष्ठ (TSA)': 'TSA = 2 · π · r · (r + h)',
          'आधार का क्षेत्रफल': 'Area = π · r²',
        },
        formulasEn: {
          'Volume': 'V = π · r² · h',
          'Curved Surface Area (CSA)': 'CSA = 2 · π · r · h',
          'Total Surface Area (TSA)': 'TSA = 2 · π · r · (r + h)',
          'Base Area': 'A = π · r²',
        },
      };
    }

    case 'hollow_cylinder': {
      // खोखला बेलन (Hollow Cylinder / Pipe)
      const r = Math.max(0.1, radius); // inner radius
      const R = Math.max(r + 0.1, radiusOuter); // outer radius
      const h = Math.max(0.1, height);
      const volume = PI * (R * R - r * r) * h;
      const csa = 2 * PI * (R + r) * h; // Inner CSA + Outer CSA
      const tsa = 2 * PI * (R + r) * (h + R - r);

      return {
        volume,
        curvedSurfaceArea: csa,
        totalSurfaceArea: tsa,
        stepsHi: [
          `बाह्य त्रिज्या (R) = ${R} सेमी, आंतरिक त्रिज्या (r) = ${r} सेमी, ऊंचाई (h) = ${h} सेमी`,
          `धातु का आयतन (Volume) = π(R² - r²)h = π(${R}² - ${r}²) × ${h} = ${volume.toFixed(2)} घन सेमी`,
          `वक्र पृष्ठ (CSA) = बाह्य CSA + आंतरिक CSA = 2πRh + 2πrh = 2π(R + r)h = ${csa.toFixed(2)} वर्ग सेमी`,
          `कुल पृष्ठ (TSA) = CSA + 2 × (πR² - πr²) = 2π(R + r)(h + R - r) = ${tsa.toFixed(2)} वर्ग सेमी`,
        ],
        stepsEn: [
          `Outer radius (R) = ${R} cm, Inner radius (r) = ${r} cm, Height (h) = ${h} cm`,
          `Material Volume (V) = π(R² - r²)h = ${volume.toFixed(2)} cu cm`,
          `Curved Surface Area (CSA) = 2π(R + r)h = ${csa.toFixed(2)} sq cm`,
          `Total Surface Area (TSA) = 2π(R + r)(h + R - r) = ${tsa.toFixed(2)} sq cm`,
        ],
        formulasHi: {
          'आयतन (Volume)': 'V = π · (R² - r²) · h',
          'वक्र पृष्ठ (CSA)': 'CSA = 2 · π · (R + r) · h',
          'कुल पृष्ठ (TSA)': 'TSA = 2 · π · (R + r) · (h + R - r)',
          'रिंग आधार क्षेत्रफल': 'A = π · (R² - r²)',
        },
        formulasEn: {
          'Volume': 'V = π · (R² - r²) · h',
          'Curved Surface Area': 'CSA = 2 · π · (R + r) · h',
          'Total Surface Area': 'TSA = 2 · π · (R + r) · (h + R - r)',
          'Ring Base Area': 'A = π · (R² - r²)',
        },
      };
    }

    case 'wheel': {
      // पहिया (Wheel / Roller)
      const r = Math.max(0.1, radius);
      const w = Math.max(0.1, width || height || 1.5);
      const circumference = 2 * PI * r;
      const faceArea = PI * r * r;
      const contactArea = 2 * PI * r * w; // Road contact area per turn (roller)
      const volume = faceArea * w;
      const tsa = contactArea + 2 * faceArea;
      const revsIn1Km = (100000 / circumference).toFixed(1);

      return {
        volume,
        curvedSurfaceArea: contactArea,
        totalSurfaceArea: tsa,
        perimeter: circumference,
        stepsHi: [
          `पहिए की त्रिज्या (r) = ${r} सेमी, व्यास (D) = ${(2 * r).toFixed(2)} सेमी, चौड़ाई (w) = ${w} सेमी`,
          `1 चक्कर में तय की गई दूरी = परिधि (Circumference) = 2 × π × r = 2 × 3.1416 × ${r} = ${circumference.toFixed(2)} सेमी`,
          `रोलर का 1 चक्कर में दबाया गया क्षेत्रफल = 2 × π × r × w = ${contactArea.toFixed(2)} वर्ग सेमी`,
          `पहिए का सम्मुख क्षेत्रफल (Face Area) = π × r² = 3.1416 × ${r}² = ${faceArea.toFixed(2)} वर्ग सेमी`,
          `1 किलोमीटर (1,00,000 सेमी) दूरी में कुल चक्कर = 1,00,000 ÷ ${circumference.toFixed(2)} = ${revsIn1Km} चक्कर`,
        ],
        stepsEn: [
          `Wheel radius (r) = ${r} cm, Diameter (D) = ${(2 * r).toFixed(2)} cm, Width (w) = ${w} cm`,
          `Distance in 1 revolution = Circumference (C) = 2πr = 2 × π × ${r} = ${circumference.toFixed(2)} cm`,
          `Road surface area rolled in 1 turn = 2πr × w = ${contactArea.toFixed(2)} sq cm`,
          `Wheel circular face area = πr² = π × ${r}² = ${faceArea.toFixed(2)} sq cm`,
          `Revolutions required for 1 km distance = 100,000 / ${circumference.toFixed(2)} = ${revsIn1Km} revs`,
        ],
        formulasHi: {
          '1 चक्कर में दूरी (Circumference)': 'दूरी = 2 · π · r = π · D',
          'पहिए का व्यास (Diameter)': 'D = 2 · r',
          'चक्करों की संख्या (Revolutions)': 'N = कुल दूरी ÷ 2πr',
          'रोलर संपर्क क्षेत्रफल (Road Area)': 'Area = 2 · π · r · w',
          'पहिया वृत्ताकार क्षेत्रफल': 'A = π · r²',
        },
        formulasEn: {
          'Distance in 1 rev (Circumference)': 'Distance = 2 · π · r = π · D',
          'Wheel Diameter': 'D = 2 · r',
          'Number of Revolutions': 'N = Total Distance ÷ (2πr)',
          'Roller Road Area in 1 turn': 'Area = 2 · π · r · w',
          'Circular Face Area': 'A = π · r²',
        },
      };
    }

    case 'cone': {
      // शंकु
      const r = Math.max(0.1, radius);
      const h = Math.max(0.1, height);
      const l = Math.sqrt(r * r + h * h);
      const volume = (1 / 3) * PI * r * r * h;
      const csa = PI * r * l;
      const tsa = PI * r * (l + r);

      return {
        volume,
        curvedSurfaceArea: csa,
        totalSurfaceArea: tsa,
        slantHeight: l,
        stepsHi: [
          `त्रिज्या (r) = ${r}, ऊंचाई (h) = ${h}`,
          `तिर्यक ऊंचाई (l) = √(r² + h²) = √(${r}² + ${h}²) = √(${(r * r + h * h).toFixed(2)}) = ${l.toFixed(2)} इकाई`,
          `आयतन (Volume) = (1/3) × π × r² × h = (1/3) × 3.1416 × ${r}² × ${h} = ${volume.toFixed(2)} घन इकाई`,
          `वक्र पृष्ठ (CSA) = π × r × l = 3.1416 × ${r} × ${l.toFixed(2)} = ${csa.toFixed(2)} वर्ग इकाई`,
          `कुल पृष्ठ (TSA) = π × r × (l + r) = ${tsa.toFixed(2)} वर्ग इकाई`,
        ],
        stepsEn: [
          `Radius (r) = ${r}, Height (h) = ${h}`,
          `Slant Height (l) = √(r² + h²) = ${l.toFixed(2)}`,
          `Volume (V) = (1/3)πr²h = ${volume.toFixed(2)} cu units`,
          `Curved Surface Area (CSA) = πrl = ${csa.toFixed(2)} sq units`,
          `Total Surface Area (TSA) = πr(l + r) = ${tsa.toFixed(2)} sq units`,
        ],
        formulasHi: {
          'तिर्यक ऊंचाई (Slant Height)': 'l = √(r² + h²)',
          'आयतन (Volume)': 'V = (1/3) · π · r² · h',
          'वक्र पृष्ठ (CSA)': 'CSA = π · r · l',
          'कुल पृष्ठ (TSA)': 'TSA = π · r · (l + r)',
        },
        formulasEn: {
          'Slant Height (l)': 'l = √(r² + h²)',
          'Volume': 'V = (1/3) · π · r² · h',
          'Curved Surface Area': 'CSA = π · r · l',
          'Total Surface Area': 'TSA = π · r · (l + r)',
        },
      };
    }

    case 'cube': {
      // घन
      const a = Math.max(0.1, length);
      const volume = a * a * a;
      const csa = 4 * a * a;
      const tsa = 6 * a * a;
      const diagonal = a * Math.sqrt(3);

      return {
        volume,
        curvedSurfaceArea: csa,
        totalSurfaceArea: tsa,
        spaceDiagonal: diagonal,
        stepsHi: [
          `भुजा (Side a) = ${a} इकाई`,
          `आयतन (Volume) = a³ = ${a}³ = ${volume.toFixed(2)} घन इकाई`,
          `पार्श्व पृष्ठ क्षेत्रफल (LSA) = 4 × a² = 4 × ${a}² = ${csa.toFixed(2)} वर्ग इकाई`,
          `कुल पृष्ठ क्षेत्रफल (TSA) = 6 × a² = 6 × ${a}² = ${tsa.toFixed(2)} वर्ग इकाई`,
          `मुख्य विकर्ण (Body Diagonal) = a × √3 = ${a} × 1.732 = ${diagonal.toFixed(2)} इकाई`,
        ],
        stepsEn: [
          `Side length (a) = ${a}`,
          `Volume (V) = a³ = ${a}³ = ${volume.toFixed(2)} cu units`,
          `Lateral Surface Area (LSA) = 4a² = ${csa.toFixed(2)} sq units`,
          `Total Surface Area (TSA) = 6a² = ${tsa.toFixed(2)} sq units`,
          `Body Diagonal (d) = a√3 = ${diagonal.toFixed(2)} units`,
        ],
        formulasHi: {
          'आयतन (Volume)': 'V = a³',
          'पार्श्व पृष्ठ (LSA)': 'LSA = 4 · a²',
          'कुल पृष्ठ (TSA)': 'TSA = 6 · a²',
          'विकर्ण (Body Diagonal)': 'd = a · √3',
        },
        formulasEn: {
          'Volume': 'V = a³',
          'Lateral Surface Area': 'LSA = 4 · a²',
          'Total Surface Area': 'TSA = 6 · a²',
          'Space Diagonal': 'd = a · √3',
        },
      };
    }

    case 'cuboid': {
      // घनाभ
      const l = Math.max(0.1, length);
      const b = Math.max(0.1, width);
      const h = Math.max(0.1, height);
      const volume = l * b * h;
      const csa = 2 * h * (l + b);
      const tsa = 2 * (l * b + b * h + h * l);
      const diagonal = Math.sqrt(l * l + b * b + h * h);

      return {
        volume,
        curvedSurfaceArea: csa,
        totalSurfaceArea: tsa,
        spaceDiagonal: diagonal,
        stepsHi: [
          `लंबाई (l) = ${l}, चौड़ाई (b) = ${b}, ऊंचाई (h) = ${h}`,
          `आयतन (Volume) = l × b × h = ${l} × ${b} × ${h} = ${volume.toFixed(2)} घन इकाई`,
          `चारों दीवारों का क्षेत्रफल (LSA) = 2 × h × (l + b) = 2 × ${h} × (${l} + ${b}) = ${csa.toFixed(2)} वर्ग इकाई`,
          `कुल पृष्ठ क्षेत्रफल (TSA) = 2 × (lb + bh + hl) = ${tsa.toFixed(2)} वर्ग इकाई`,
          `लंबा विकर्ण (Body Diagonal) = √(l² + b² + h²) = ${diagonal.toFixed(2)} इकाई`,
        ],
        stepsEn: [
          `Length (l) = ${l}, Breadth (b) = ${b}, Height (h) = ${h}`,
          `Volume (V) = l × b × h = ${volume.toFixed(2)} cu units`,
          `Area of 4 walls (LSA) = 2h(l + b) = ${csa.toFixed(2)} sq units`,
          `Total Surface Area (TSA) = 2(lb + bh + hl) = ${tsa.toFixed(2)} sq units`,
          `Body Diagonal (d) = √(l² + b² + h²) = ${diagonal.toFixed(2)} units`,
        ],
        formulasHi: {
          'आयतन (Volume)': 'V = l · b · h',
          'पार्श्व पृष्ठ / 4 दीवारें': 'LSA = 2 · h · (l + b)',
          'कुल पृष्ठ (TSA)': 'TSA = 2 · (l·b + b·h + h·l)',
          'विकर्ण (Body Diagonal)': 'd = √(l² + b² + h²)',
        },
        formulasEn: {
          'Volume': 'V = l · b · h',
          'Lateral Surface Area': 'LSA = 2 · h · (l + b)',
          'Total Surface Area': 'TSA = 2 · (l·b + b·h + h·l)',
          'Space Diagonal': 'd = √(l² + b² + h²)',
        },
      };
    }

    case 'sphere': {
      // गोला
      const r = Math.max(0.1, radius);
      const volume = (4 / 3) * PI * Math.pow(r, 3);
      const tsa = 4 * PI * r * r;

      return {
        volume,
        curvedSurfaceArea: tsa,
        totalSurfaceArea: tsa,
        stepsHi: [
          `त्रिज्या (r) = ${r} इकाई`,
          `आयतन (Volume) = (4/3) × π × r³ = (4/3) × 3.1416 × ${r}³ = ${volume.toFixed(2)} घन इकाई`,
          `पृष्ठ क्षेत्रफल (Surface Area) = 4 × π × r² = 4 × 3.1416 × ${r}² = ${tsa.toFixed(2)} वर्ग इकाई`,
        ],
        stepsEn: [
          `Radius (r) = ${r}`,
          `Volume (V) = (4/3)πr³ = ${volume.toFixed(2)} cu units`,
          `Surface Area (TSA) = 4πr² = ${tsa.toFixed(2)} sq units`,
        ],
        formulasHi: {
          'आयतन (Volume)': 'V = (4/3) · π · r³',
          'कुल पृष्ठ (TSA)': 'TSA = 4 · π · r²',
        },
        formulasEn: {
          'Volume': 'V = (4/3) · π · r³',
          'Total Surface Area': 'TSA = 4 · π · r²',
        },
      };
    }

    case 'hemisphere': {
      // अर्धगोला
      const r = Math.max(0.1, radius);
      const volume = (2 / 3) * PI * Math.pow(r, 3);
      const csa = 2 * PI * r * r;
      const tsa = 3 * PI * r * r;

      return {
        volume,
        curvedSurfaceArea: csa,
        totalSurfaceArea: tsa,
        stepsHi: [
          `त्रिज्या (r) = ${r} इकाई`,
          `आयतन (Volume) = (2/3) × π × r³ = (2/3) × 3.1416 × ${r}³ = ${volume.toFixed(2)} घन इकाई`,
          `वक्र पृष्ठ (CSA) = 2 × π × r² = 2 × 3.1416 × ${r}² = ${csa.toFixed(2)} वर्ग इकाई`,
          `कुल पृष्ठ (TSA) = 3 × π × r² = 3 × 3.1416 × ${r}² = ${tsa.toFixed(2)} वर्ग इकाई`,
        ],
        stepsEn: [
          `Radius (r) = ${r}`,
          `Volume (V) = (2/3)πr³ = ${volume.toFixed(2)} cu units`,
          `Curved Surface Area (CSA) = 2πr² = ${csa.toFixed(2)} sq units`,
          `Total Surface Area (TSA) = 3πr² = ${tsa.toFixed(2)} sq units`,
        ],
        formulasHi: {
          'आयतन (Volume)': 'V = (2/3) · π · r³',
          'वक्र पृष्ठ (CSA)': 'CSA = 2 · π · r²',
          'कुल पृष्ठ (TSA)': 'TSA = 3 · π · r²',
        },
        formulasEn: {
          'Volume': 'V = (2/3) · π · r³',
          'Curved Surface Area': 'CSA = 2 · π · r²',
          'Total Surface Area': 'TSA = 3 · π · r²',
        },
      };
    }

    case 'frustum': {
      // छिन्नक
      const r1 = Math.max(0.1, radius);
      const r2 = Math.max(0.05, radiusTop);
      const h = Math.max(0.1, height);
      const l = Math.sqrt(h * h + Math.pow(r1 - r2, 2));
      const volume = (1 / 3) * PI * h * (r1 * r1 + r2 * r2 + r1 * r2);
      const csa = PI * l * (r1 + r2);
      const tsa = csa + PI * r1 * r1 + PI * r2 * r2;

      return {
        volume,
        curvedSurfaceArea: csa,
        totalSurfaceArea: tsa,
        slantHeight: l,
        stepsHi: [
          `निचली त्रिज्या (r1) = ${r1}, ऊपरी त्रिज्या (r2) = ${r2}, ऊंचाई (h) = ${h}`,
          `तिर्यक ऊंचाई (l) = √(h² + (r1 - r2)²) = ${l.toFixed(2)} इकाई`,
          `आयतन (Volume) = (1/3)πh(r1² + r2² + r1·r2) = ${volume.toFixed(2)} घन इकाई`,
          `वक्र पृष्ठ (CSA) = πl(r1 + r2) = ${csa.toFixed(2)} वर्ग इकाई`,
          `कुल पृष्ठ (TSA) = CSA + πr1² + πr2² = ${tsa.toFixed(2)} वर्ग इकाई`,
        ],
        stepsEn: [
          `Bottom radius (r1) = ${r1}, Top radius (r2) = ${r2}, Height (h) = ${h}`,
          `Slant Height (l) = √(h² + (r1 - r2)²) = ${l.toFixed(2)}`,
          `Volume (V) = (1/3)πh(r1² + r2² + r1·r2) = ${volume.toFixed(2)} cu units`,
          `Curved Surface Area (CSA) = πl(r1 + r2) = ${csa.toFixed(2)} sq units`,
          `Total Surface Area (TSA) = CSA + πr1² + πr2² = ${tsa.toFixed(2)} sq units`,
        ],
        formulasHi: {
          'तिर्यक ऊंचाई (l)': 'l = √(h² + (r1 - r2)²)',
          'आयतन (Volume)': 'V = (1/3) · π · h · (r1² + r2² + r1·r2)',
          'वक्र पृष्ठ (CSA)': 'CSA = π · l · (r1 + r2)',
          'कुल पृष्ठ (TSA)': 'TSA = CSA + π·r1² + π·r2²',
        },
        formulasEn: {
          'Slant Height (l)': 'l = √(h² + (r1 - r2)²)',
          'Volume': 'V = (1/3) · π · h · (r1² + r2² + r1·r2)',
          'Curved Surface Area': 'CSA = π · l · (r1 + r2)',
          'Total Surface Area': 'TSA = CSA + π·r1² + π·r2²',
        },
      };
    }

    case 'prism': {
      // समबाहु त्रिभुजाकार प्रिज्म (Equilateral Triangular Prism)
      const a = Math.max(0.1, length); // side of base triangle
      const h = Math.max(0.1, height); // height of prism
      const baseArea = (Math.sqrt(3) / 4) * a * a;
      const basePerimeter = 3 * a;
      const lsa = basePerimeter * h; // 3 * a * h
      const tsa = lsa + 2 * baseArea;
      const volume = baseArea * h;

      return {
        volume,
        curvedSurfaceArea: lsa,
        totalSurfaceArea: tsa,
        stepsHi: [
          `आधार त्रिभुज की भुजा (a) = ${a} सेमी, प्रिज्म की ऊंचाई (h) = ${h} सेमी`,
          `आधार का क्षेत्रफल = (√3 / 4) × a² = ${(baseArea).toFixed(2)} वर्ग सेमी`,
          `आयतन (Volume) = आधार का क्षेत्रफल × ऊंचाई = ${baseArea.toFixed(2)} × ${h} = ${volume.toFixed(2)} घन सेमी`,
          `पार्श्व पृष्ठ (LSA) = आधार का परिमाप × ऊंचाई = (3 × ${a}) × ${h} = ${lsa.toFixed(2)} वर्ग सेमी`,
          `कुल पृष्ठ (TSA) = LSA + 2 × (आधार का क्षेत्रफल) = ${lsa.toFixed(2)} + 2(${baseArea.toFixed(2)}) = ${tsa.toFixed(2)} वर्ग सेमी`,
        ],
        stepsEn: [
          `Base Triangle Side (a) = ${a} cm, Prism Height (h) = ${h} cm`,
          `Base Area = (√3 / 4)a² = ${baseArea.toFixed(2)} sq cm`,
          `Volume (V) = Base Area × Height = ${volume.toFixed(2)} cu cm`,
          `Lateral Surface Area (LSA) = Base Perimeter × Height = ${lsa.toFixed(2)} sq cm`,
          `Total Surface Area (TSA) = LSA + 2(Base Area) = ${tsa.toFixed(2)} sq cm`,
        ],
        formulasHi: {
          'आयतन (Volume)': 'V = आधार का क्षेत्रफल · h',
          'पार्श्व पृष्ठ (LSA)': 'LSA = आधार का परिमाप · h',
          'कुल पृष्ठ (TSA)': 'TSA = LSA + 2 · (आधार का क्षेत्रफल)',
          'समबाहु आधार': 'A = (√3 / 4) · a²',
        },
        formulasEn: {
          'Volume': 'V = Base Area · h',
          'Lateral Surface Area': 'LSA = Base Perimeter · h',
          'Total Surface Area': 'TSA = LSA + 2(Base Area)',
          'Equilateral Base Area': 'A = (√3 / 4)a²',
        },
      };
    }

    case 'pyramid': {
      // वर्गाकार पिरामिड (Square-based Pyramid)
      const a = Math.max(0.1, length); // base side
      const h = Math.max(0.1, height); // vertical height
      const l = Math.sqrt(h * h + Math.pow(a / 2, 2)); // slant height
      const baseArea = a * a;
      const basePerimeter = 4 * a;
      const lsa = 0.5 * basePerimeter * l; // 2 * a * l
      const tsa = lsa + baseArea;
      const volume = (1 / 3) * baseArea * h;

      return {
        volume,
        curvedSurfaceArea: lsa,
        totalSurfaceArea: tsa,
        slantHeight: l,
        stepsHi: [
          `वर्गाकार आधार भुजा (a) = ${a} सेमी, ऊर्ध्वाधर ऊंचाई (h) = ${h} सेमी`,
          `तिर्यक ऊंचाई (Slant Height l) = √(h² + (a/2)²) = √(${h}² + ${(a / 2).toFixed(2)}²) = ${l.toFixed(2)} सेमी`,
          `आयतन (Volume) = (1/3) × आधार क्षेत्रफल × ऊंचाई = (1/3) × ${a}² × ${h} = ${volume.toFixed(2)} घन सेमी`,
          `पार्श्व पृष्ठ (LSA) = ½ × आधार परिमाप × तिर्यक ऊंचाई = ½ × (4 × ${a}) × ${l.toFixed(2)} = ${lsa.toFixed(2)} वर्ग सेमी`,
          `कुल पृष्ठ (TSA) = LSA + a² = ${lsa.toFixed(2)} + ${baseArea.toFixed(2)} = ${tsa.toFixed(2)} वर्ग सेमी`,
        ],
        stepsEn: [
          `Square Base Side (a) = ${a} cm, Height (h) = ${h} cm`,
          `Slant Height (l) = √(h² + (a/2)²) = ${l.toFixed(2)} cm`,
          `Volume (V) = (1/3) × Base Area × Height = ${volume.toFixed(2)} cu cm`,
          `Lateral Surface Area (LSA) = ½ × Base Perimeter × Slant Height = ${lsa.toFixed(2)} sq cm`,
          `Total Surface Area (TSA) = LSA + Base Area = ${tsa.toFixed(2)} sq cm`,
        ],
        formulasHi: {
          'तिर्यक ऊंचाई (l)': 'l = √(h² + (a/2)²)',
          'आयतन (Volume)': 'V = (1/3) · a² · h',
          'पार्श्व पृष्ठ (LSA)': 'LSA = 2 · a · l',
          'कुल पृष्ठ (TSA)': 'TSA = 2·a·l + a²',
        },
        formulasEn: {
          'Slant Height (l)': 'l = √(h² + (a/2)²)',
          'Volume': 'V = (1/3) · a² · h',
          'Lateral Surface Area': 'LSA = 2 · a · l',
          'Total Surface Area': 'TSA = 2al + a²',
        },
      };
    }
  }
}

// -------------------------------------------------------------
// Cube / Cuboid Cutting & Slicing Generator (Supports Up to 1000 Mini Cubes)
// -------------------------------------------------------------

export function generateMiniCubes(params: CubeCutParams): {
  miniCubes: MiniCubeData[];
  counts: {
    total: number;
    corner3Faces: number;
    edge2Faces: number;
    central1Face: number;
    inner0Faces: number;
    customMatchCount?: number;
  };
  formulas: {
    n: number;
    total: string;
    corner: string;
    edge: string;
    central: string;
    inner: string;
  };
} {
  const {
    isCuboid,
    n,
    nx,
    ny,
    nz,
    faceColors,
    filterType,
    filterColor,
    filterMinPainted = 1,
    slicePlane,
    sliceLayer,
  } = params;

  // Supports high limits safely
  const countX = isCuboid ? Math.max(1, Math.min(10, nx)) : Math.max(1, Math.min(10, n));
  const countY = isCuboid ? Math.max(1, Math.min(10, ny)) : Math.max(1, Math.min(10, n));
  const countZ = isCuboid ? Math.max(1, Math.min(10, nz)) : Math.max(1, Math.min(10, n));

  const miniCubes: MiniCubeData[] = [];

  let cornerCount = 0;
  let edgeCount = 0;
  let centralCount = 0;
  let innerCount = 0;
  let customMatchCount = 0;

  for (let x = 0; x < countX; x++) {
    for (let y = 0; y < countY; y++) {
      for (let z = 0; z < countZ; z++) {
        const paintedFaces: { face: CubeFace; color: string }[] = [];

        // Check if on outer boundaries
        if (x === 0) paintedFaces.push({ face: 'left', color: faceColors.left });
        if (x === countX - 1) paintedFaces.push({ face: 'right', color: faceColors.right });
        if (y === countY - 1) paintedFaces.push({ face: 'top', color: faceColors.top });
        if (y === 0) paintedFaces.push({ face: 'bottom', color: faceColors.bottom });
        if (z === countZ - 1) paintedFaces.push({ face: 'front', color: faceColors.front });
        if (z === 0) paintedFaces.push({ face: 'back', color: faceColors.back });

        const paintedCount = paintedFaces.length;
        let type: MiniCubeType = 'inner';

        if (paintedCount === 3) {
          type = 'corner';
          cornerCount++;
        } else if (paintedCount === 2) {
          type = 'edge';
          edgeCount++;
        } else if (paintedCount === 1) {
          type = 'central';
          centralCount++;
        } else {
          type = 'inner';
          innerCount++;
        }

        // Apply Layer Slicing Plane
        let isVisible = true;
        if (slicePlane === 'x' && sliceLayer !== -1 && x !== sliceLayer) isVisible = false;
        if (slicePlane === 'y' && sliceLayer !== -1 && y !== sliceLayer) isVisible = false;
        if (slicePlane === 'z' && sliceLayer !== -1 && z !== sliceLayer) isVisible = false;

        // Apply Filter Highlight
        let isHighlighted = false;
        if (filterType === 'all') {
          isHighlighted = true;
        } else if (filterType === 'corner' && type === 'corner') {
          isHighlighted = true;
        } else if (filterType === 'edge' && type === 'edge') {
          isHighlighted = true;
        } else if (filterType === 'central' && type === 'central') {
          isHighlighted = true;
        } else if (filterType === 'inner' && type === 'inner') {
          isHighlighted = true;
        } else if (filterType === 'min_painted' && paintedCount >= filterMinPainted) {
          isHighlighted = true;
        } else if (filterType === 'custom_color' && filterColor) {
          isHighlighted = paintedFaces.some((p) => p.color.toLowerCase() === filterColor.toLowerCase());
        }

        if (isHighlighted) customMatchCount++;

        miniCubes.push({
          id: `cube-${x}-${y}-${z}`,
          x,
          y,
          z,
          facesPaintedCount: paintedCount,
          paintedFaces,
          type,
          isVisible,
          isHighlighted,
        });
      }
    }
  }

  const total = countX * countY * countZ;

  // Exact formulas calculation
  let formulas = {
    n: n,
    total: `${n}³ = ${Math.pow(n, 3)}`,
    corner: 'Always 8 (शीर्ष घन / 3 Faces)',
    edge: `12 × (n - 2) = 12 × (${n} - 2) = ${12 * Math.max(0, n - 2)}`,
    central: `6 × (n - 2)² = 6 × (${n} - 2)² = ${6 * Math.pow(Math.max(0, n - 2), 2)}`,
    inner: `(n - 2)³ = (${n} - 2)³ = ${Math.pow(Math.max(0, n - 2), 3)}`,
  };

  if (isCuboid) {
    const nx_2 = Math.max(0, countX - 2);
    const ny_2 = Math.max(0, countY - 2);
    const nz_2 = Math.max(0, countZ - 2);
    formulas = {
      n: countX,
      total: `nx × ny × nz = ${countX} × ${countY} × ${countZ} = ${total}`,
      corner: `8 (शीर्ष घन)`,
      edge: `4 × [(nx-2) + (ny-2) + (nz-2)] = 4 × [${nx_2} + ${ny_2} + ${nz_2}] = ${4 * (nx_2 + ny_2 + nz_2)}`,
      central: `2 × [(nx-2)(ny-2) + (ny-2)(nz-2) + (nz-2)(nx-2)] = ${2 * (nx_2 * ny_2 + ny_2 * nz_2 + nz_2 * nx_2)}`,
      inner: `(nx-2) × (ny-2) × (nz-2) = ${nx_2 * ny_2 * nz_2}`,
    };
  }

  return {
    miniCubes,
    counts: {
      total,
      corner3Faces: cornerCount,
      edge2Faces: edgeCount,
      central1Face: centralCount,
      inner0Faces: innerCount,
      customMatchCount,
    },
    formulas,
  };
}
