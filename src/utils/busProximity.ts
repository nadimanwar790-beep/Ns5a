export interface StudentHomePin {
  studentId: string;
  studentName: string;
  rollNo?: string;
  className?: string;
  busRoute?: string;
  homeLat: number;
  homeLng: number;
  homeAddress?: string;
  updatedAt?: string;
}

export type ProximityStage = "arrived" | "very_near" | "approaching" | "enroute";

export interface ProximityStatus {
  stage: ProximityStage;
  label: string;
  shortLabel: string;
  badgeClass: string;
}

/**
 * Extracts latitude and longitude from Google Maps URLs or raw "lat, lng" text.
 * 100% local & free (no API calls).
 */
export function parseLatLngInput(rawInput: string): { lat: number; lng: number } | null {
  const input = (rawInput || "").trim().replace(/%2C/gi, ",");
  if (!input) return null;

  const patterns = [
    /[?&]q=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]query=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]ll=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]center=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /\/(?:search|place|dir)\/[^/?#]*?(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/i,
    /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];

  for (const re of patterns) {
    const m = input.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001)
      ) {
        return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
      }
    }
  }
  return null;
}

export async function resolveGoogleMapsLocationInput(
  rawInput: string
): Promise<{ lat: number; lng: number } | null> {
  const direct = parseLatLngInput(rawInput);
  if (direct) return direct;

  const trimmed = (rawInput || "").trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    const isGoogleMapsHost =
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "g.co" ||
      host.includes("google.");
    if (!isGoogleMapsHost) return null;

    const res = await fetch("/api/resolve-maps-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.ok && Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) {
      return {
        lat: Number(Number(data.lat).toFixed(6)),
        lng: Number(Number(data.lng).toFixed(6)),
      };
    }
  } catch {}
  return null;
}

/**
 * Computes Haversine distance in meters between two GPS points.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes compass bearing (0..360 degrees, 0=North) from point 1 to point 2.
 */
export function computeBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatDistanceShort(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function getProximityStatus(meters: number): ProximityStatus {
  if (meters <= 150) {
    return {
      stage: "arrived",
      label: "🏠 घर के गेट पर पहुँच गई!",
      shortLabel: "GATE PAR",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse",
    };
  }
  if (meters <= 500) {
    return {
      stage: "very_near",
      label: "🚌 बहुत करीब (1-2 मिनट)",
      shortLabel: "VERY NEAR",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/50",
    };
  }
  if (meters <= 1000) {
    return {
      stage: "approaching",
      label: "🔔 1 KM के अंदर आ गई",
      shortLabel: "UNDER 1 KM",
      badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50",
    };
  }
  return {
    stage: "enroute",
    label: "📍 रास्ते में है",
    shortLabel: "ON ROUTE",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  };
}
