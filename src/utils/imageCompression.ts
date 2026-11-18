// Client-side Canvas API Image Compression (WebP with JPEG fallback, <= 200-300 KB)

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeBytes?: number;
  initialQuality?: number;
  minQuality?: number;
}

const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Invalid image file"));
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });

const estimateDataUrlBytes = (dataUrl: string): number => {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return dataUrl.length;
  const base64 = dataUrl.slice(commaIdx + 1);
  return Math.floor((base64.length * 3) / 4);
};

export const compressImageFileToDataUrl = async (
  file: File,
  options: CompressImageOptions = {}
): Promise<{ dataUrl: string; sizeKB: number; format: "webp" | "jpeg" }> => {
  const {
    maxWidth = 1280,
    maxHeight = 960,
    maxSizeBytes = 250 * 1024, // 250 KB default target
    initialQuality = 0.82,
    minQuality = 0.42,
  } = options;

  const img = await loadImageFromFile(file);

  let targetW = img.naturalWidth || img.width || maxWidth;
  let targetH = img.naturalHeight || img.height || maxHeight;

  const scaleFactor = Math.min(1, maxWidth / targetW, maxHeight / targetH);
  targetW = Math.max(1, Math.round(targetW * scaleFactor));
  targetH = Math.max(1, Math.round(targetH * scaleFactor));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  // Test whether the browser truly encodes WebP via canvas
  canvas.width = 4;
  canvas.height = 4;
  const webpSupported = canvas.toDataURL("image/webp", 0.8).startsWith("data:image/webp");
  const mime = webpSupported ? "image/webp" : "image/jpeg";
  const format: "webp" | "jpeg" = webpSupported ? "webp" : "jpeg";

  let width = targetW;
  let height = targetH;
  let bestDataUrl = "";

  // Iteratively reduce quality, and if still oversized, shrink dimensions slightly
  for (let pass = 0; pass < 3; pass++) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = initialQuality;
    while (quality >= minQuality) {
      const candidate = canvas.toDataURL(mime, quality);
      bestDataUrl = candidate;
      const byteSize = estimateDataUrlBytes(candidate);
      if (byteSize <= maxSizeBytes) {
        return {
          dataUrl: candidate,
          sizeKB: Math.max(1, Math.round(byteSize / 1024)),
          format,
        };
      }
      quality -= 0.1;
    }

    width = Math.max(320, Math.round(width * 0.78));
    height = Math.max(240, Math.round(height * 0.78));
  }

  const finalBytes = estimateDataUrlBytes(bestDataUrl);
  return {
    dataUrl: bestDataUrl,
    sizeKB: Math.max(1, Math.round(finalBytes / 1024)),
    format,
  };
};
