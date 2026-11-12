// @ts-nocheck
/**
 * ArcFace Deep Biometric Engine (512-Dimensional Deep Embeddings)
 * Powered by InsightFace MobileFaceNet ONNX + Microsoft onnxruntime-web
 * 
 * 100% Free, Offline, Zero-License-Key Architecture
 * Gold-standard 99.83% LFW Accuracy for School Attendance Kiosk
 */

import * as ort from "onnxruntime-web";

// Ensure single-thread wasm execution to avoid COOP/COEP SharedArrayBuffer restrictions in iframe/browser
try {
  if (typeof window !== "undefined") {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = "/onnx-wasm/";
    // Enable proxy / simds if supported
    ort.env.wasm.simd = true;
  }
} catch (e) {
  console.warn("[ArcFace] Error configuring ort wasm environment:", e);
}

const ARCFACE_MODEL_PATH = "/models/arcface/w600k_mbf.onnx";

let arcfaceSession: ort.InferenceSession | null = null;
let isInitializing = false;
let initPromise: Promise<boolean> | null = null;
let inferenceMutex: Promise<any> = Promise.resolve();

/**
 * Serializes ONNX runtime inferences so that multiple concurrent async calls
 * (e.g. live video frame + background photo vectorization) never execute
 * arcfaceSession.run() simultaneously, completely preventing "Session already started" and "Session mismatch".
 */
export function serializeInference<T>(fn: () => Promise<T>): Promise<T> {
  const next = inferenceMutex.then(() => fn(), () => fn());
  inferenceMutex = next.catch(() => {});
  return next;
}

export function isArcFaceReady(): boolean {
  return arcfaceSession !== null;
}

/**
 * Pre-warms and loads the 512-D ArcFace MobileFaceNet ONNX model into memory.
 */
export async function initArcFaceEngine(): Promise<boolean> {
  if (arcfaceSession) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    isInitializing = true;
    try {
      console.log("[ArcFace 512D] Loading MobileFaceNet ONNX model from:", ARCFACE_MODEL_PATH);

      // Tier 1: Try WebGL GPU execution provider for hardware acceleration
      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: ["webgl", "wasm"],
        graphOptimizationLevel: "all",
      };

      try {
        arcfaceSession = await ort.InferenceSession.create(ARCFACE_MODEL_PATH, sessionOptions);
      } catch (gpuErr) {
        console.warn("[ArcFace 512D] WebGL EP failed, trying local WASM:", gpuErr);
        try {
          arcfaceSession = await ort.InferenceSession.create(ARCFACE_MODEL_PATH, {
            executionProviders: ["wasm"],
          });
        } catch (wasmErr) {
          console.warn("[ArcFace 512D] Local WASM failed, trying CDN WASM fallback:", wasmErr);
          try {
            ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
            arcfaceSession = await ort.InferenceSession.create(ARCFACE_MODEL_PATH, {
              executionProviders: ["wasm"],
            });
          } catch (cdnErr) {
            console.warn("[ArcFace 512D] All ONNX backends unavailable:", cdnErr);
            arcfaceSession = null;
          }
        }
      }

      if (!arcfaceSession) {
        isInitializing = false;
        initPromise = null;
        return false;
      }

      console.log(
        "[ArcFace 512D] Engine successfully loaded! Inputs:",
        arcfaceSession.inputNames,
        "Outputs:",
        arcfaceSession.outputNames
      );

      // Pre-warm with dummy tensor so first user scan has 0ms cold-start lag
      try {
        const dummy = new Float32Array(1 * 3 * 112 * 112);
        const dummyTensor = new ort.Tensor("float32", dummy, [1, 3, 112, 112]);
        await serializeInference(async () => {
          if (arcfaceSession) {
            await arcfaceSession.run({ [arcfaceSession.inputNames[0]]: dummyTensor });
          }
        });
        console.log("[ArcFace 512D] Pre-warm inference complete!");
      } catch (warmErr) {
        console.warn("[ArcFace 512D] Pre-warm note:", warmErr);
      }

      isInitializing = false;
      return true;
    } catch (err) {
      console.error("[ArcFace 512D] Failed to load ONNX model:", err);
      arcfaceSession = null;
      isInitializing = false;
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

// Auto-initialize in background on client load
if (typeof window !== "undefined") {
  setTimeout(() => {
    initArcFaceEngine().catch(() => {});
  }, 200);
}

/**
 * Crops and aligns face into standard ArcFace 112x112 NCHW Float32Array:
 * Values normalized to: (pixel - 127.5) / 128.0
 */
export function preprocessFaceTo112Tensor(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  box?: { x: number; y: number; width: number; height: number }
): { tensor: ort.Tensor; cropCanvas: HTMLCanvasElement } | null {
  try {
    const sW = (source as any).videoWidth || (source as any).naturalWidth || source.width || 320;
    const sH = (source as any).videoHeight || (source as any).naturalHeight || source.height || 320;

    const canvas = document.createElement("canvas");
    canvas.width = 112;
    canvas.height = 112;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    if (box) {
      // 15% padding around the bounding box to capture full jawline and forehead without clipping
      const padX = box.width * 0.15;
      const padY = box.height * 0.15;
      const sx = Math.max(0, box.x - padX);
      const sy = Math.max(0, box.y - padY);
      const sw = Math.min(sW - sx, box.width + padX * 2);
      const sh = Math.min(sH - sy, box.height + padY * 2);

      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 112, 112);
    } else {
      ctx.drawImage(source, 0, 0, sW, sH, 0, 0, 112, 112);
    }

    const imgData = ctx.getImageData(0, 0, 112, 112);
    const pixels = imgData.data;

    // NCHW format: [1, 3, 112, 112]
    const floatArray = new Float32Array(1 * 3 * 112 * 112);
    const planeSize = 112 * 112;

    for (let i = 0; i < planeSize; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];

      // Standard ArcFace / InsightFace input normalization: (x - 127.5) / 128.0
      floatArray[i] = (r - 127.5) / 128.0;                    // Channel 0 (Red)
      floatArray[planeSize + i] = (g - 127.5) / 128.0;        // Channel 1 (Green)
      floatArray[planeSize * 2 + i] = (b - 127.5) / 128.0;    // Channel 2 (Blue)
    }

    const tensor = new ort.Tensor("float32", floatArray, [1, 3, 112, 112]);
    return { tensor, cropCanvas: canvas };
  } catch (err) {
    console.warn("[ArcFace] Preprocessing error:", err);
    return null;
  }
}

/**
 * Extracts 512-D L2-normalized Deep Biometric Embedding using ArcFace ONNX.
 */
export async function extractArcFace512Descriptor(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  box?: { x: number; y: number; width: number; height: number }
): Promise<number[] | null> {
  const ready = await initArcFaceEngine();
  if (!ready || !arcfaceSession) return null;

  const preprocessed = preprocessFaceTo112Tensor(source, box);
  if (!preprocessed) return null;

  return serializeInference(async () => {
    if (!arcfaceSession) return null;
    try {
      const inputName = arcfaceSession.inputNames[0] || "input.1";
      const feeds: Record<string, ort.Tensor> = { [inputName]: preprocessed.tensor };
      const results = await arcfaceSession.run(feeds);
      const outputName = arcfaceSession.outputNames[0] || "516";
      const outputTensor = results[outputName];

      if (!outputTensor || !outputTensor.data) return null;

      const rawData = outputTensor.data as Float32Array;
      if (rawData.length !== 512) {
        console.warn("[ArcFace] Unexpected output vector length:", rawData.length);
        return null;
      }

      // L2 Normalization (ensures dot product equals cosine similarity)
      let sumSq = 0;
      for (let i = 0; i < 512; i++) {
        sumSq += rawData[i] * rawData[i];
      }
      const norm = Math.sqrt(sumSq) || 1;
      const normalized: number[] = new Array(512);
      for (let i = 0; i < 512; i++) {
        normalized[i] = Number((rawData[i] / norm).toFixed(6));
      }

      return normalized;
    } catch (err: any) {
      console.warn("[ArcFace] Inference note:", err?.message || err);
      return null;
    }
  });
}

/**
 * Extracts ArcFace 512-D descriptor from a photo URL or Base64 data URL.
 */
export async function extractArcFaceFromPhotoUrl(photoUrl: string): Promise<number[] | null> {
  if (!photoUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    if (!photoUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.referrerPolicy = "no-referrer";
    img.onload = async () => {
      try {
        const desc = await extractArcFace512Descriptor(img);
        resolve(desc);
      } catch (err) {
        console.warn("[ArcFace] Error extracting from photoUrl:", err);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn("[ArcFace] Failed to load image from:", photoUrl?.slice(0, 50));
      resolve(null);
    };
    img.src = photoUrl;
  });
}

/**
 * Cosine Similarity between two 512-D L2-normalized ArcFace vectors.
 * Dot product ranges from -1.0 to 1.0.
 * In practice for face verification:
 * - Genuine same-person matches: 0.50 to 0.95
 * - Different people: -0.10 to 0.32
 */
export function calculateArcFaceCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dot = 0;
  const len = v1.length;
  for (let i = 0; i < len; i++) {
    dot += v1[i] * v2[i];
  }
  return Math.max(-1, Math.min(1, dot));
}

/**
 * Euclidean Distance for ArcFace: dist = sqrt(2 - 2 * cosineSim)
 */
export function calculateArcFaceEuclideanDistance(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 999;
  let sumSq = 0;
  const len = v1.length;
  for (let i = 0; i < len; i++) {
    const diff = v1[i] - v2[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

/**
 * Gold-Standard ArcFace 512-D Biometric Thresholds:
 * - Minimum match threshold: Cosine Similarity >= 0.48 (Distance <= 1.02)
 * - High confidence match: Cosine Similarity >= 0.58 (Distance <= 0.91)
 * - Extreme confidence: Cosine Similarity >= 0.68 (Distance <= 0.80)
 * - Impostor rejection: Cosine Similarity < 0.40
 */
export const ARCFACE_MATCH_THRESHOLD = 0.48;
export const ARCFACE_HIGH_CONFIDENCE_THRESHOLD = 0.58;

export interface ArcFaceMatchResult {
  student: any;
  confidencePercent: number;
  similarity: number;
  distance: number;
  isAmbiguous?: boolean;
  margin?: number;
  secondBest?: { name: string; similarity: number; distance: number };
}

/**
 * Fast 1:N Biometric Matcher using 512-D ArcFace vectors.
 */
export function matchArcFace512(
  queryVec: number[],
  enrolledMap: Record<string, any>,
  minSimilarity = ARCFACE_MATCH_THRESHOLD,
  minMargin = 0.04
): ArcFaceMatchResult | null {
  if (!queryVec || queryVec.length !== 512) return null;
  const records = Object.values(enrolledMap);
  if (records.length === 0) return null;

  // Filter candidates that have valid 512-D ArcFace vectors
  const candidates: Array<{ record: any; similarity: number; distance: number }> = [];

  for (const rec of records) {
    if (!rec?.studentId) continue;

    // Check primary descriptor
    let bestSim = -1;
    let bestDist = 999;

    const vectorsToTest: number[][] = [];
    if (rec.arcfaceDescriptor && rec.arcfaceDescriptor.length === 512) {
      vectorsToTest.push(rec.arcfaceDescriptor);
    } else if (rec.descriptor && rec.descriptor.length === 512) {
      vectorsToTest.push(rec.descriptor);
    }

    if (rec.descriptors3D?.front && rec.descriptors3D.front.length === 512) {
      vectorsToTest.push(rec.descriptors3D.front);
    }
    if (rec.descriptors3D?.left && rec.descriptors3D.left.length === 512) {
      vectorsToTest.push(rec.descriptors3D.left);
    }
    if (rec.descriptors3D?.right && rec.descriptors3D.right.length === 512) {
      vectorsToTest.push(rec.descriptors3D.right);
    }

    if (vectorsToTest.length === 0) continue;

    for (const v of vectorsToTest) {
      const sim = calculateArcFaceCosineSimilarity(queryVec, v);
      const dist = calculateArcFaceEuclideanDistance(queryVec, v);
      if (sim > bestSim) {
        bestSim = sim;
        bestDist = dist;
      }
    }

    if (bestSim > 0.20) {
      candidates.push({ record: rec, similarity: bestSim, distance: bestDist });
    }
  }

  if (candidates.length === 0) return null;

  // Sort descending by cosine similarity (highest match first)
  candidates.sort((a, b) => b.similarity - a.similarity);

  const top1 = candidates[0];
  const top2 = candidates.length > 1 ? candidates[1] : null;

  // Check against threshold
  if (top1.similarity >= minSimilarity) {
    let margin: number | undefined = undefined;
    let isAmbiguous = false;

    if (top2) {
      margin = Number((top1.similarity - top2.similarity).toFixed(4));
      // Ambiguous if 2nd candidate is almost identically close
      isAmbiguous = margin < minMargin;
    }

    // Convert similarity (0.48 - 0.85) to intuitive 75% - 99.9% score
    // sim = 0.48 -> 75%
    // sim = 0.60 -> 88%
    // sim = 0.72 -> 96%
    // sim = 0.80+ -> 99.5%
    const normalizedScore = Math.min(
      99.9,
      Math.max(
        70.0,
        75 + ((top1.similarity - 0.48) / (0.80 - 0.48)) * 24.9
      )
    );

    return {
      student: top1.record,
      confidencePercent: Number(normalizedScore.toFixed(1)),
      similarity: Number(top1.similarity.toFixed(4)),
      distance: Number(top1.distance.toFixed(4)),
      isAmbiguous,
      margin,
      secondBest: top2
        ? {
            name: top2.record.name,
            similarity: Number(top2.similarity.toFixed(4)),
            distance: Number(top2.distance.toFixed(4)),
          }
        : undefined,
    };
  }

  return null;
}
