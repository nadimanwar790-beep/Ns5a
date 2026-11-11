// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Bus, Navigation, MapPin, Gauge, Phone, ExternalLink,
  RefreshCw, Radio, CheckCircle2, Clock, AlertCircle,
  Sliders, Shield, Play
} from "lucide-react";
import type { School, BusLiveLocation } from "../../school-types";
import { rtdb } from "../../firebase";
import { ref as dbRef, onValue } from "firebase/database";

interface Props {
  school: School;
  onOpenDriverConsole?: () => void;
  onClose?: () => void;
}

const DEFAULT_BUS_FLEET = [
  {
    busId: "bus-01",
    busNumber: "DL-1PC-4590 (Bus #01)",
    route: "Route 1: City Center → Sector 45 → Campus",
    driverName: "Rameshwar Singh",
    driverPhone: "9818023450",
    latitude: 28.4595,
    longitude: 77.0266,
    speed: 34,
    heading: 45,
    accuracy: 6,
    tripStatus: "started",
    tripType: "morning_pickup",
    lastUpdated: new Date().toISOString(),
    currentStop: "Sector 45 Market",
    totalStops: 5,
    completedStops: ["City Center Metro", "Sector 43 Chowk", "Sector 45 Market"],
  },
  {
    busId: "bus-02",
    busNumber: "DL-1PC-8821 (Bus #02)",
    route: "Route 2: Railway Station → Civil Lines → Campus",
    driverName: "Suraj Pal Yadav",
    driverPhone: "9871109923",
    latitude: 28.4682,
    longitude: 77.0384,
    speed: 0,
    heading: 0,
    accuracy: 10,
    tripStatus: "idle",
    tripType: "morning_pickup",
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    currentStop: "Depot Parking",
    totalStops: 5,
    completedStops: [],
  },
  {
    busId: "bus-03",
    busNumber: "DL-1PC-3312 (Bus #03)",
    route: "Route 3: South Extension → DLF Phase 1 → Campus",
    driverName: "Dharmendra Kumar",
    driverPhone: "9823419088",
    latitude: 28.4750,
    longitude: 77.0450,
    speed: 42,
    heading: 120,
    accuracy: 5,
    tripStatus: "started",
    tripType: "morning_pickup",
    lastUpdated: new Date().toISOString(),
    currentStop: "DLF Ph 1 Roundabout",
    totalStops: 4,
    completedStops: ["South Ext Market", "DLF Ph 1 Roundabout"],
  },
];

export const AdminBusFleetRadar: React.FC<Props> = ({ school, onOpenDriverConsole, onClose }) => {
  const [buses, setBuses] = useState<BusLiveLocation[]>(DEFAULT_BUS_FLEET);
  const [selectedBusId, setSelectedBusId] = useState<string>("bus-01");
  const [filterMode, setFilterMode] = useState<"all" | "active">("all");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Subscribe to live bus updates
  useEffect(() => {
    // 1. Check local bus states
    const loadLocalBuses = () => {
      const updated = DEFAULT_BUS_FLEET.map((baseBus) => {
        try {
          const raw = localStorage.getItem(`nst_live_bus_${school?.id || "default"}_${baseBus.busId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            return { ...baseBus, ...parsed };
          }
        } catch {}
        return baseBus;
      });
      setBuses(updated);
      setLastRefreshed(new Date());
    };

    loadLocalBuses();

    // 2. Window event listener for instant local sync
    const handleBusUpdate = (e: any) => {
      const live = e?.detail as BusLiveLocation;
      if (live && live.busId) {
        setBuses((prev) =>
          prev.map((b) => (b.busId === live.busId ? { ...b, ...live } : b))
        );
        setLastRefreshed(new Date());
      }
    };
    window.addEventListener("nst_bus_location_update", handleBusUpdate);

    // 3. Firebase RTDB listener if connected
    let unsubRtdb: any = null;
    if (rtdb && school?.id) {
      try {
        const qRef = dbRef(rtdb, `school_bus_locations/${school.id}`);
        unsubRtdb = onValue(qRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            const busArr = Object.values(data) as BusLiveLocation[];
            if (busArr.length > 0) {
              setBuses((prev) => {
                const map = new Map(prev.map((p) => [p.busId, p]));
                busArr.forEach((b) => map.set(b.busId, { ...map.get(b.busId), ...b }));
                return Array.from(map.values());
              });
              setLastRefreshed(new Date());
            }
          }
        });
      } catch (e) {
        console.warn("[AdminBusFleetRadar] RTDB listen notice:", e);
      }
    }

    const interval = setInterval(loadLocalBuses, 4000);

    return () => {
      window.removeEventListener("nst_bus_location_update", handleBusUpdate);
      clearInterval(interval);
      if (unsubRtdb && typeof unsubRtdb === "function") unsubRtdb();
    };
  }, [school?.id]);

  const activeBuses = buses.filter((b) => b.tripStatus === "started");
  const displayList = filterMode === "active" ? activeBuses : buses;
  const currentSelectedBus = buses.find((b) => b.busId === selectedBusId) || buses[0];

  // Helper to construct Google Maps link
  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Bus size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">
                Live Bus Fleet Radar (लाइव बस ट्रैकर)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                {activeBuses.length} Active On Route
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time GPS telemetry • Auto-syncing every 3-5 seconds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDriverConsole && (
            <button
              type="button"
              onClick={onOpenDriverConsole}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Navigation size={14} /> Open Driver Mobile Mode
            </button>
          )}

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                filterMode === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({buses.length})
            </button>
            <button
              onClick={() => setFilterMode("active")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                filterMode === "active" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Active ({activeBuses.length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left List + Right Interactive Vector Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Fleet List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {displayList.map((bus) => {
            const isSelected = bus.busId === selectedBusId;
            const isLive = bus.tripStatus === "started";

            return (
              <div
                key={bus.busId}
                onClick={() => setSelectedBusId(bus.busId)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{bus.busNumber}</span>
                  </div>

                  {isLive ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black animate-pulse">
                      <Radio size={12} className="animate-spin" /> LIVE • {bus.speed} km/h
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold">
                      Depot Idle
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 font-medium mb-2 line-clamp-1">{bus.route}</p>

                {/* Sub details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-indigo-400" />
                    <span className="truncate max-w-[150px]">{bus.currentStop || "Depot"}</span>
                  </span>
                  <span className="font-mono text-slate-500">
                    {new Date(bus.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Radar & Vehicle HUD (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
          {/* Top Info Bar */}
          <div className="flex items-start justify-between gap-3 z-10">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                Vehicle Telemetry Tracker
              </span>
              <h3 className="text-base font-black text-white">{currentSelectedBus.busNumber}</h3>
              <p className="text-xs text-slate-400">{currentSelectedBus.route}</p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getGoogleMapsUrl(currentSelectedBus.latitude, currentSelectedBus.longitude)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <ExternalLink size={13} /> Maps Link
              </a>
              <a
                href={`tel:${currentSelectedBus.driverPhone}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
              >
                <Phone size={13} /> Call Driver
              </a>
            </div>
          </div>

          {/* Interactive Simulated Vector Radar Visualizer */}
          <div className="my-6 relative w-full h-56 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
            {/* Concentric Radar Rings */}
            <div className="absolute w-52 h-52 rounded-full border border-indigo-500/10 animate-ping"></div>
            <div className="absolute w-44 h-44 rounded-full border border-indigo-500/20"></div>
            <div className="absolute w-28 h-28 rounded-full border border-indigo-500/25"></div>
            <div className="absolute w-12 h-12 rounded-full border border-indigo-500/30"></div>

            {/* Grid crosshairs */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-indigo-500/10"></div>
            <div className="absolute inset-y-0 left-1/2 w-px bg-indigo-500/10"></div>

            {/* Center Vehicle Pin with Pulse */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <span className="absolute -inset-2 rounded-full bg-amber-400 opacity-30 animate-pulse"></span>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xl shadow-amber-500/30">
                  <Bus size={20} />
                </div>
              </div>
              <div className="mt-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-[11px] font-mono font-bold text-amber-300 shadow-md">
                {currentSelectedBus.speed} km/h • {currentSelectedBus.tripStatus === "started" ? "MOVING" : "STOPPED"}
              </div>
            </div>

            {/* Simulated Road Path Trail */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <path
                d="M 20 180 Q 150 110, 250 120 T 450 60"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
            </svg>
          </div>

          {/* Telemetry Metrics Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-3 border-t border-slate-800/80">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">ड्राइवर का नाम</span>
              <span className="text-xs font-bold text-white truncate block">{currentSelectedBus.driverName}</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">करंट स्टॉप</span>
              <span className="text-xs font-bold text-indigo-400 truncate block">
                {currentSelectedBus.currentStop || "Depot"}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">GPS अक्षांश / देशांतर</span>
              <span className="text-xs font-bold font-mono text-slate-200 block truncate">
                {currentSelectedBus.latitude.toFixed(4)}, {currentSelectedBus.longitude.toFixed(4)}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">स्टॉप्स प्रगति</span>
              <span className="text-xs font-bold font-mono text-emerald-400 block">
                {currentSelectedBus.completedStops?.length || 0} / {currentSelectedBus.totalStops || 4}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
