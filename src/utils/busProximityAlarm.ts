// @ts-nocheck
/**
 * Bus Proximity Geofencing & Audio Arrival Alarm Engine
 * Computes exact distance using the Haversine formula and sounds a synthesized
 * vehicle arrival chime when bus is within <= 1.0 km of the student's stop.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export function calculateDistanceKm(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Synthesized Loud Web Audio Bus Horn / Arrival Chime
export function playBusArrivalAlarmChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    // Chime Tone 1 (High frequency attention ding)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Chime Tone 2 (Double Ding after 200ms)
    setTimeout(() => {
      try {
        const now2 = ctx.currentTime;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now2);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now2 + 0.2); // D6
        gain2.gain.setValueAtTime(0.6, now2);
        gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now2);
        osc2.stop(now2 + 0.6);
      } catch {}
    }, 200);

    // Vibration pattern on Android
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([400, 150, 400, 150, 400]);
    }
  } catch (e) {
    console.warn("[BusAlarm] Web audio chime playback notice:", e);
  }
}

// Cooldown tracker to avoid spamming
const lastAlarmTimestamps = new Map<string, number>();

export function checkAndTriggerBusProximity(
  busLocation: LatLng,
  stopLocation: LatLng,
  stopName: string,
  routeLabel: string = "Bus"
): { isWithinRange: boolean; distanceKm: number } {
  const dist = calculateDistanceKm(busLocation, stopLocation);
  const isWithin = dist <= 1.0; // 1.0 KM threshold

  if (isWithin) {
    const key = `${stopName}__${Math.floor(Date.now() / (1000 * 60 * 15))}`; // 15-min cooldown
    const last = lastAlarmTimestamps.get(key) || 0;
    if (Date.now() - last > 15 * 60 * 1000) {
      lastAlarmTimestamps.set(key, Date.now());
      playBusArrivalAlarmChime();

      // Show browser notification if permitted
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(`🚌 स्कूल बस आपके स्टॉप (${stopName}) से 1 KM दूर है!`, {
            body: `${routeLabel} बस आपके स्टॉप के करीब पहुंच रही है। कृपया बच्चे को लेकर स्टॉप पर पहुंचे।`,
            icon: "/icons/icon-192.png?v=3"
          });
        } catch {}
      }
    }
  }

  return { isWithinRange: isWithin, distanceKm: parseFloat(dist.toFixed(2)) };
}
