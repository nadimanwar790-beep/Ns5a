// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Bus, Play, Square, Navigation, Phone, ShieldAlert,
  CheckCircle2, Clock, MapPin, Gauge, AlertTriangle,
  Radio, Volume2, ArrowLeft, RefreshCw, Smartphone
} from "lucide-react";
import type { School, BusLiveLocation } from "../../school-types";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { rtdb } from "../../firebase";
import { ref as dbRef, set, onValue } from "firebase/database";

interface Props {
  school: School;
  onBack?: () => void;
  initialBusId?: string;
}

const DEFAULT_BUSES = [
  {
    id: "bus-01",
    busNumber: "DL-1PC-4590 (Bus #01)",
    route: "Route 1: City Center → Sector 45 → Institutional Area",
    driverName: "Rameshwar Singh (ड्राइवर)",
    driverPhone: "9818023450",
    stops: ["City Center Metro", "Sector 43 Chowk", "Sector 45 Market", "Green Valley Gate", "School Main Gate"]
  },
  {
    id: "bus-02",
    busNumber: "DL-1PC-8821 (Bus #02)",
    route: "Route 2: Railway Station → Civil Lines → School Campus",
    driverName: "Suraj Pal Yadav (ड्राइवर)",
    driverPhone: "9871109923",
    stops: ["Railway Colony", "Civil Lines Crossing", "Model Town Gate 2", "Vikas Marg", "School Main Gate"]
  },
  {
    id: "bus-03",
    busNumber: "DL-1PC-3312 (Bus #03)",
    route: "Route 3: South Extension → DLF Phase 1 → Campus",
    driverName: "Dharmendra Kumar (ड्राइवर)",
    driverPhone: "9823419088",
    stops: ["South Ext Market", "DLF Ph 1 Roundabout", "Cyber Hub Road", "School Main Gate"]
  }
];

export const DriverTripConsole: React.FC<Props> = ({ school, onBack, initialBusId }) => {
  const [selectedBusId, setSelectedBusId] = useState(initialBusId || DEFAULT_BUSES[0].id);
  const selectedBus = DEFAULT_BUSES.find(b => b.id === selectedBusId) || DEFAULT_BUSES[0];

  const [tripType, setTripType] = useState<"morning_pickup" | "afternoon_drop">("morning_pickup");
  const [isTripActive, setIsTripActive] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [completedStops, setCompletedStops] = useState<string[]>([]);
  const [tripDuration, setTripDuration] = useState(0); // in seconds
  const [distanceKm, setDistanceKm] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const tripIntervalRef = useRef<any>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Sync bus live state key
  const storageKey = `nst_live_bus_${school?.id || "default"}_${selectedBus.id}`;

  // Check if there was an active trip saved locally
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tripStatus === "started") {
          setIsTripActive(true);
          setTripType(parsed.tripType || "morning_pickup");
          if (parsed.latitude && parsed.longitude) {
            setCoords({ lat: parsed.latitude, lng: parsed.longitude });
          }
          if (parsed.completedStops) {
            setCompletedStops(parsed.completedStops);
          }
        }
      }
    } catch {}
  }, [storageKey]);

  // Trip duration timer
  useEffect(() => {
    if (isTripActive) {
      tripIntervalRef.current = setInterval(() => {
        setTripDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (tripIntervalRef.current) clearInterval(tripIntervalRef.current);
    }
    return () => {
      if (tripIntervalRef.current) clearInterval(tripIntervalRef.current);
    };
  }, [isTripActive]);

  // Broadcast location updates to Realtime Database & LocalStorage
  const broadcastLocation = (update: Partial<BusLiveLocation>) => {
    const payload: BusLiveLocation = {
      busId: selectedBus.id,
      busNumber: selectedBus.busNumber,
      route: selectedBus.route,
      driverName: selectedBus.driverName,
      driverPhone: selectedBus.driverPhone,
      latitude: update.latitude ?? coords?.lat ?? 28.4595,
      longitude: update.longitude ?? coords?.lng ?? 77.0266,
      speed: update.speed ?? currentSpeed,
      heading: update.heading ?? 0,
      accuracy: update.accuracy ?? gpsAccuracy ?? 10,
      tripStatus: update.tripStatus ?? (isTripActive ? "started" : "idle"),
      tripType: tripType,
      lastUpdated: new Date().toISOString(),
      currentStop: update.currentStop || (completedStops[completedStops.length - 1] || "Starting Depot"),
      totalStops: selectedBus.stops.length,
      completedStops: update.completedStops ?? completedStops,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      localStorage.setItem(`nst_last_active_bus_${school?.id || "default"}`, selectedBus.id);
      window.dispatchEvent(new CustomEvent("nst_bus_location_update", { detail: payload }));

      // Also sync to Firebase RTDB if online
      if (rtdb && school?.id) {
        set(dbRef(rtdb, `school_bus_locations/${school.id}/${selectedBus.id}`), payload).catch(() => {});
      }
    } catch (e) {
      console.warn("[DriverTripConsole] Broadcast error:", e);
    }
  };

  // Start Trip Handler
  const handleStartTrip = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS is not supported on this device.");
      alert("आपके मोबाइल में GPS उपलब्ध नहीं है।");
      return;
    }

    setGpsError(null);
    setIsTripActive(true);
    setTripDuration(0);
    setDistanceKm(0);
    setCompletedStops([]);

    speakNotification("यात्रा शुरू", `${selectedBus.busNumber} की लाइव लोकेशन शुरू हो चुकी है।`);

    // High accuracy watchPosition
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy, heading } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setGpsAccuracy(Math.round(accuracy));

        // Speed conversion (m/s to km/h)
        let kmh = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : 0;

        // Odometer distance approximation
        if (lastCoordsRef.current) {
          const dt = (Date.now() - lastCoordsRef.current.time) / 1000;
          const R = 6371; // km
          const dLat = ((latitude - lastCoordsRef.current.lat) * Math.PI) / 180;
          const dLng = ((longitude - lastCoordsRef.current.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lastCoordsRef.current.lat * Math.PI) / 180) *
              Math.cos((latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const stepKm = R * c;

          if (stepKm > 0.005 && stepKm < 2) {
            setDistanceKm((prev) => Number((prev + stepKm).toFixed(2)));
            if (kmh === 0 && dt > 0) {
              kmh = Math.round((stepKm / (dt / 3600)));
            }
          }
        }

        lastCoordsRef.current = { lat: latitude, lng: longitude, time: Date.now() };
        setCurrentSpeed(kmh > 120 ? 0 : kmh);

        broadcastLocation({
          latitude,
          longitude,
          speed: kmh,
          heading: heading || 0,
          accuracy,
          tripStatus: "started",
        });
      },
      (err) => {
        console.warn("[DriverTripConsole] GPS Watch error:", err);
        setGpsError(err.message || "GPS Signal Weak");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    // Initial broadcast
    broadcastLocation({ tripStatus: "started" });
  };

  // End Trip Handler
  const handleEndTrip = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTripActive(false);
    setCurrentSpeed(0);

    speakNotification("यात्रा समाप्त", `${selectedBus.busNumber} की यात्रा सफलतापूर्वक समाप्त हो गई है।`);

    broadcastLocation({
      tripStatus: "ended",
      speed: 0,
    });
  };

  // Mark stop completed
  const toggleStop = (stopName: string) => {
    const next = completedStops.includes(stopName)
      ? completedStops.filter((s) => s !== stopName)
      : [...completedStops, stopName];
    setCompletedStops(next);
    broadcastLocation({ completedStops: next, currentStop: stopName });
    speakNotification("स्टॉप पार हुआ", `${stopName} चेकपॉइंट दर्ज किया गया।`);
  };

  // Format time (HH:MM:SS)
  const formatTripTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                <Bus size={18} />
              </span>
              <h1 className="text-base font-black tracking-wide text-white">
                Driver Console (ड्राइवर मोड)
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              {school?.name || "School Bus Fleet"} • GPS Live Streaming
            </p>
          </div>
        </div>

        {/* Live Pulse Indicator */}
        <div className="flex items-center gap-2">
          {isTripActive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold animate-pulse">
              <Radio size={14} className="animate-spin" /> LIVE GPS
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold">
              Idle in Depot
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-xl mx-auto w-full space-y-4">
        {/* Bus Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            वाहन व रूट चुनें (Select Bus & Route):
          </label>
          <select
            value={selectedBusId}
            disabled={isTripActive}
            onChange={(e) => setSelectedBusId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          >
            {DEFAULT_BUSES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.busNumber} — {b.driverName}
              </option>
            ))}
          </select>

          {/* Route Description */}
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <MapPin size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <span>{selectedBus.route}</span>
          </div>

          {/* Trip Type Selector */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isTripActive}
              onClick={() => setTripType("morning_pickup")}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                tripType === "morning_pickup"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              🌅 सुबह पिकअप (Morning)
            </button>
            <button
              type="button"
              disabled={isTripActive}
              onClick={() => setTripType("afternoon_drop")}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                tripType === "afternoon_drop"
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-sm"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              🌇 दोपहर ड्रॉप (Afternoon)
            </button>
          </div>
        </div>

        {/* Speedometer & Live Telemetry HUD */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-3 left-4 text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Gauge size={14} className="text-amber-400" />
            <span>SPEEDOMETER</span>
          </div>

          <div className="absolute top-3 right-4 text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Clock size={14} className="text-cyan-400" />
            <span className="tabular-nums font-bold text-white">{formatTripTime(tripDuration)}</span>
          </div>

          {/* Large Speed Display */}
          <div className="my-6">
            <span className="text-7xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_25px_rgba(251,191,36,0.25)]">
              {currentSpeed}
            </span>
            <span className="text-sm font-bold text-amber-400 block mt-1 uppercase tracking-widest">
              KM / HOUR
            </span>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80 text-center">
            <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">कुल दूरी (Trip)</span>
              <span className="text-sm font-bold text-slate-100 font-mono tabular-nums">{distanceKm} km</span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">GPS सटीकता</span>
              <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                {gpsAccuracy !== null ? `±${gpsAccuracy}m` : "Checking..."}
              </span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">स्टॉप्स पूरे</span>
              <span className="text-sm font-bold text-indigo-400 font-mono tabular-nums">
                {completedStops.length} / {selectedBus.stops.length}
              </span>
            </div>
          </div>

          {gpsError && (
            <div className="mt-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
              <AlertTriangle size={15} />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* Big Start / End Trip Button */}
        <div>
          {!isTripActive ? (
            <button
              type="button"
              onClick={handleStartTrip}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg tracking-wide shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play size={24} fill="currentColor" />
              <span>यात्रा शुरू करें (START LIVE TRIP)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEndTrip}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-lg tracking-wide shadow-xl shadow-rose-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Square size={22} fill="currentColor" />
              <span>यात्रा समाप्त करें (END TRIP)</span>
            </button>
          )}
        </div>

        {/* Checkpoint Stops Checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={14} className="text-amber-400" />
              रूट स्टॉप्स चेकलिस्ट (Route Checkpoints):
            </h3>
            <span className="text-[11px] text-slate-400">टैप करके स्टॉप पार करें</span>
          </div>

          <div className="space-y-2">
            {selectedBus.stops.map((stop, idx) => {
              const isDone = completedStops.includes(stop);
              return (
                <div
                  key={stop}
                  onClick={() => isTripActive && toggleStop(stop)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isDone
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700"
                  } ${!isTripActive ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isDone ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold">{stop}</span>
                  </div>

                  <div>
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emergency SOS & Support */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">School Dispatch Helpline</p>
              <p className="text-[11px] text-slate-400">आपातकालीन संपर्क: +91 9811023450</p>
            </div>
          </div>
          <a
            href="tel:9811023450"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            कॉल करें
          </a>
        </div>
      </main>
    </div>
  );
};
