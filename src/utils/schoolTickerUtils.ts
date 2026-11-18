import type { School, SchoolWebsiteHighlight } from "../school-types";

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Strips any email addresses so promotional ticker items stay strictly focused
 * on school publicity details (never exposing email IDs in the top bar).
 */
export const stripEmailFromTickerText = (raw: string): string => {
  return String(raw || "")
    .replace(EMAIL_PATTERN, "")
    .replace(/\b(e-?mail|mail\s*id)\s*[:\-]?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

/**
 * Parses admin-edited ticker text (supports `|`, `•`, or newline separated entries)
 * and removes any accidental email addresses.
 */
export const parseCustomTickerItems = (raw?: string): string[] => {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/\r?\n|\s*\|\s*|\s*•\s*/g)
    .map((part) => stripEmailFromTickerText(part))
    .filter((part) => part.length > 0);
};

/**
 * Builds rich, full school promotional details (explicitly excluding email ID)
 * for the slow-scrolling & swipeable top website ticker.
 */
export const buildDefaultSchoolTickerItems = (params: {
  school: Partial<School>;
  sessionLabel: string;
  admissionsOpen: boolean;
  regNo?: string;
  highlights?: SchoolWebsiteHighlight[];
}): string[] => {
  const { school, sessionLabel, admissionsOpen, regNo, highlights } = params;
  const items: string[] = [];

  const schoolName = stripEmailFromTickerText(school.name || "");
  if (schoolName) {
    items.push(
      school.tagline
        ? `${schoolName} — ${stripEmailFromTickerText(school.tagline)}`
        : schoolName
    );
  }

  if (admissionsOpen) {
    items.push(`Admissions Open for Session ${sessionLabel} · Apply Online Today`);
  }

  if (school.affiliation) {
    items.push(`${stripEmailFromTickerText(school.affiliation)} · Quality Education & Discipline`);
  }

  const phoneRaw = stripEmailFromTickerText(
    school.websiteConfig?.whatsappNumber || school.phone || ""
  );
  if (phoneRaw) {
    items.push(`Admission Helpline: ${phoneRaw}`);
  }

  const addressRaw = stripEmailFromTickerText(school.address || "");
  if (addressRaw) {
    items.push(`Campus Address: ${addressRaw}`);
  }

  if (regNo) {
    items.push(`Reg. No: ${regNo}`);
  }

  if (school.principalName) {
    items.push(`Principal: ${stripEmailFromTickerText(school.principalName)}`);
  }

  if (Array.isArray(highlights) && highlights.length > 0) {
    const titles = highlights
      .map((h) => stripEmailFromTickerText(h?.title || ""))
      .filter(Boolean);
    if (titles.length > 0) {
      items.push(`Key Facilities: ${titles.join(" · ")}`);
    }
  } else {
    items.push("Smart Classrooms · AI Face Attendance · QR Verified Marksheets · Transparent Fee Ledger");
  }

  const officeHours = stripEmailFromTickerText(school.websiteConfig?.officeHours || "");
  if (officeHours) {
    items.push(`Office Hours: ${officeHours}`);
  }

  return items.filter(Boolean);
};
