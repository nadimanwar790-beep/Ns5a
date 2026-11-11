import { uploadToTelegramStorage, resolveTelegramUrl, dataUrlToBlob } from './telegramStorageService';
import { compressImage } from './imgbbService';

// Telegram Cloud Storage powered Media Service (Drop-in replacement for Cloudinary)
// Provides unlimited free media hosting for Video, Audio, PDF, and Images
export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  duration?: number;
  resource_type: string;
  bytes: number;
}

export const CLOUDINARY_CONFIG = {
  cloudName: 'nsta_telegram_vault',
  uploadPreset: 'telegram_cloud',
  folder: 'nsta_media',
};

export type CloudinaryMediaKind = 'video' | 'audio' | 'pdf' | 'image' | 'auto';

/**
 * Universal media upload powered by Telegram Cloud Storage.
 * Automatically compresses high-resolution camera images to lightweight web formats for ultra-fast uploads.
 * Retains Cloudinary API signature for backwards compatibility across all UI components.
 */
export const uploadToCloudinary = async (
  file: File,
  resourceType: CloudinaryMediaKind = 'auto',
  onProgress?: (progressPercent: number) => void
): Promise<CloudinaryUploadResult> => {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isVideoOrAudio =
    resourceType === 'video' ||
    resourceType === 'audio' ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    /\.(mp4|webm|mov|m4v|mkv|mp3|wav|m4a|ogg|aac|flac)$/.test(name);
  const isPdf =
    resourceType === 'pdf' ||
    mime === 'application/pdf' ||
    name.endsWith('.pdf');

  const targetResourceType = isVideoOrAudio ? 'video' : isPdf ? 'pdf' : 'image';

  // Instant client-side compression for images (>180KB) to reduce 10MB to 150KB
  let uploadPayload: File | Blob = file;
  if (targetResourceType === 'image' && file.size > 180 * 1024) {
    try {
      if (onProgress) onProgress(8);
      const isPng = mime === 'image/png' || name.endsWith('.png');
      const compressedData = await compressImage(file, 1400, 1400, 0.82, isPng);
      if (compressedData && compressedData.startsWith('data:')) {
        uploadPayload = dataUrlToBlob(compressedData, isPng ? 'image/png' : 'image/jpeg');
      }
    } catch (cErr) {
      console.warn('[uploadToCloudinary] Pre-compression skipped:', cErr);
    }
  }

  try {
    if (onProgress) onProgress(15);

    const tgRes = await uploadToTelegramStorage(uploadPayload, {
      fileName: file.name,
      caption: `NSTA ${targetResourceType.toUpperCase()}: ${file.name}`,
      onProgress: (pct) => {
        if (onProgress) onProgress(pct);
      },
    });

    const format = file.name.split('.').pop()?.toLowerCase() || 'bin';

    return {
      url: tgRes.url,
      secure_url: tgRes.url,
      public_id: tgRes.fileId,
      format,
      resource_type: targetResourceType,
      bytes: tgRes.fileSize || file.size,
    };
  } catch (err: any) {
    console.error('[Media Upload via Telegram] Upload failed:', err);
    let errMsg = err?.message || 'Media upload fail ho gaya';
    if (
      errMsg.includes('Unexpected end of JSON') ||
      errMsg.includes('Failed to execute') ||
      errMsg.includes('SyntaxError')
    ) {
      errMsg = 'Storage server se response nahi mila. Kripya apna internet connection check karein ya chhota video upload karein.';
    }
    throw new Error(errMsg);
  }
};

/**
 * Generates safe, optimized streaming URL.
 * Automatically resolves Telegram URLs to prevent CORS blocks and enable Range seeking.
 */
export const getOptimizedVideoUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  return resolveTelegramUrl(rawUrl);
};
