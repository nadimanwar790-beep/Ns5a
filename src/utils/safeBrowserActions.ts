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

export function formatCleanSessionName(raw?: string | null): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return getDynamicAcademicSessionLabel();
  const cleaned = trimmed
    .replace(/^academic\s+session\s+/i, "")
    .replace(/^session\s+/i, "")
    .trim();
  return cleaned || getDynamicAcademicSessionLabel();
}

export function parseSessionStartYear(label?: string | null): number | null {
  const match = String(label || "").match(/(20\d{2})/);
  if (!match) return null;
  const yr = Number(match[1]);
  return Number.isFinite(yr) ? yr : null;
}

export function isSessionOlderOrEqual(
  candidateLabel?: string | null,
  referenceLabel?: string | null
): boolean {
  const candYr = parseSessionStartYear(candidateLabel);
  const refYr = parseSessionStartYear(referenceLabel) ?? parseSessionStartYear(getDynamicAcademicSessionLabel());
  if (candYr === null || refYr === null) return true;
  return candYr <= refYr;
}

export function isOctoberToMarchAdmissionWindow(date: Date = new Date()): boolean {
  const month = date.getMonth(); // 0-indexed: 0=Jan..2=Mar, 3=Apr..8=Sep, 9=Oct..11=Dec
  return month >= 9 || month < 3;
}

/**
 * Computes the target Academic Session label for Online Admissions & Website Banners:
 * - April to September: returns the CURRENT running session (e.g. "2026-27").
 * - October to March: returns the auto-created NEXT upcoming session (e.g. "2027-28").
 */
export function getUpcomingAdmissionSessionLabel(
  currentSessionName?: string | null,
  sessionsList?: Array<{ name?: string; active?: boolean; startDate?: string }>,
  date: Date = new Date()
): string {
  const activeFromList = Array.isArray(sessionsList)
    ? sessionsList.find((s) => s?.active)?.name
    : undefined;
  const fallbackDynamic = getDynamicAcademicSessionLabel(date);
  const resolvedCurrentClean = formatCleanSessionName(
    currentSessionName || activeFromList || fallbackDynamic
  );
  const currentYr =
    parseSessionStartYear(currentSessionName) ??
    parseSessionStartYear(activeFromList) ??
    parseSessionStartYear(fallbackDynamic) ??
    date.getFullYear();

  // April through September: Admissions advertise and target the CURRENT running session
  if (!isOctoberToMarchAdmissionWindow(date)) {
    return resolvedCurrentClean;
  }

  // October through March: Admissions target the auto-created NEXT session
  if (Array.isArray(sessionsList) && sessionsList.length > 0) {
    const futureSessions = sessionsList
      .map((s) => ({
        label: formatCleanSessionName(s?.name || ""),
        year: parseSessionStartYear(s?.name || s?.startDate),
      }))
      .filter((item): item is { label: string; year: number } => item.year !== null && item.year > currentYr)
      .sort((a, b) => a.year - b.year);

    if (futureSessions.length > 0) {
      return futureSessions[0].label;
    }
  }

  const nextStartYear = currentYr + 1;
  const nextEndShort = String((nextStartYear + 1) % 100).padStart(2, "0");
  return `${nextStartYear}-${nextEndShort}`;
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

export type SocialPlatformKey = "instagram" | "youtube" | "facebook" | "whatsapp_group";

/**
 * Normalizes a school social/community link so handles or bare domains become valid https:// URLs
 * and unsafe schemes (javascript:, data:) are rejected.
 */
export function normalizeSocialUrl(raw?: string | null, platform?: SocialPlatformKey): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).trim();
    if (!handle) return "";
    if (platform === "instagram") return `https://instagram.com/${handle}`;
    if (platform === "youtube") return `https://youtube.com/@${handle}`;
    if (platform === "facebook") return `https://facebook.com/${handle}`;
  }

  if (platform === "whatsapp_group" && !trimmed.includes(".") && !trimmed.includes("/")) {
    return `https://chat.whatsapp.com/${trimmed}`;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

