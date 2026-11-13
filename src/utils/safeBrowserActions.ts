import { toast } from "sonner";
import { SUPPORT_PHONE } from "../constants";

export const CENTRAL_SUPPORT_PHONE = SUPPORT_PHONE;
export const CENTRAL_ADMIN_WHATSAPP_NUMBER = `91${SUPPORT_PHONE}`;

/**
 * Computes the current Indian Academic Session label (April–March) dynamically,
 * e.g., "2026-27" instead of hardcoding a fixed year string.
 */
export function getDynamicAcademicSessionLabel(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0=Jan .. 3=Apr
  const startYear = month >= 3 ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

/**
 * Opens an external URL (WhatsApp, PDF, Drive) safely in both browsers and Android WebView / iframes
 * without relying on raw window.open popups that may be silently blocked.
 */
export function safeOpenExternalUrl(url: string, fallbackNotice?: string): boolean {
  if (!url || typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch (err) {
    console.warn("[safeOpenExternalUrl] Anchor navigation failed, trying clipboard fallback:", err);
    try {
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.info(fallbackNotice || "लिंक क्लिपबोर्ड पर कॉपी हो गया है।");
    } catch {
      toast.error("लिंक खोलने में समस्या आई।");
    }
    return false;
  }
}
