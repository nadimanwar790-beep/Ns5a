// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
} from "@vis.gl/react-google-maps";
import {
  Bus,
  Phone,
  Navigation,
  ExternalLink,
  Layers,
  Crosshair,
  Maximize2,
  MapPin,
  Radio,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { BusLiveLocation } from "../../school-types";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";

interface LiveBusGoogleMapProps {
  buses: BusLiveLocation[];
  selectedBusId?: string;
  onSelectBus?: (busId: string) => void;
  heightClass?: string;
  schoolId?: string;
  schoolCode?: string;
}

interface LatLngPoint {
  lat: number;
  lng: number;
}

const DEFAULT_FALLBACK_CENTER: LatLngPoint = { lat: 28.4595, lng: 77.0266 };

function hasValidCoords(bus?: BusLiveLocation | null): boolean {
  if (!bus) return false;
  const lat = Number(bus.latitude);
  const lng = Number(bus.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function getShortBusLabel(busNumber?: string): string {
  const raw = String(busNumber || "Bus").trim();
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1];
  return raw.split(" ")[0] || "Bus";
}

interface BusMarkerProps {
  bus: BusLiveLocation;
  isSelected: boolean;
  isInfoOpen: boolean;
  onSelect: (busId: string) => void;
  onCloseInfo: () => void;
}

const BusAdvancedMarker: React.FC<BusMarkerProps> = ({
  bus,
  isSelected,
  isInfoOpen,
  onSelect,
  onCloseInfo,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isLive = bus.tripStatus === "started";
  const pos: LatLngPoint = {
    lat: Number(bus.latitude),
    lng: Number(bus.longitude),
  };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={pos}
        zIndex={isSelected ? 1000 : isLive ? 500 : 100}
        title={`${bus.busNumber} • ${isLive ? `${bus.speed} km/h LIVE` : "Depot Idle"}`}
        onClick={() => onSelect(bus.busId)}
      >
        <div
          className="flex flex-col items-center cursor-pointer select-none"
          style={{ transform: "translateY(-4px)" }}
        >
          {/* Floating label pill */}
          <div
            className={`mb-1 px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg border flex items-center gap-1 whitespace-nowrap transition-transform ${
              isSelected
                ? "bg-amber-400 text-slate-950 border-white scale-105"
                : isLive
                  ? "bg-emerald-600 text-white border-emerald-200"
                  : "bg-slate-800 text-slate-200 border-slate-500"
            }`}
          >
            {isLive && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            )}
            <span>{getShortBusLabel(bus.busNumber)}</span>
            {isLive && <span>• {bus.speed} km/h</span>}
          </div>

          {/* Bus pin badge */}
          <div className="relative flex items-center justify-center">
            {isLive && (
              <span className="absolute -inset-1.5 rounded-full bg-emerald-400/40 animate-pulse" />
            )}
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center border-2 shadow-xl transition-transform ${
                isSelected
                  ? "bg-amber-500 text-slate-950 border-white scale-110"
                  : isLive
                    ? "bg-emerald-500 text-slate-950 border-white"
                    : "bg-slate-700 text-slate-100 border-slate-300"
              }`}
            >
              <Bus size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div
            className={`w-2 h-2 rotate-45 -mt-1 border-r border-b ${
              isSelected
                ? "bg-amber-500 border-white"
                : isLive
                  ? "bg-emerald-500 border-white"
                  : "bg-slate-700 border-slate-300"
            }`}
          />
        </div>
      </AdvancedMarker>

      {isInfoOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={270}
          onCloseClick={onCloseInfo}
        >
          <div className="p-1 text-slate-900 space-y-2 min-w-[210px]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-xs text-slate-900 leading-tight">
                  {bus.busNumber}
                </p>
                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                  {bus.route}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                  isLive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {isLive ? `LIVE • ${bus.speed} km/h` : "Idle"}
              </span>
            </div>

            <div className="bg-slate-100 rounded-lg p-2 space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">ड्राइवर:</span>
                <span className="font-bold text-slate-900 truncate">
                  {bus.driverName || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">करंट स्टॉप:</span>
                <span className="font-bold text-indigo-700 truncate">
                  {bus.currentStop || "Depot"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">GPS:</span>
                <span className="font-mono text-[10px] text-slate-700">
                  {Number(bus.latitude).toFixed(5)}, {Number(bus.longitude).toFixed(5)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              {bus.driverPhone && (
                <a
                  href={`tel:${bus.driverPhone}`}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                >
                  <Phone size={12} /> Call Driver
                </a>
              )}
              <button
                type="button"
                onClick={() =>
                  safeOpenExternalUrl(
                    `https://www.google.com/maps?q=${bus.latitude},${bus.longitude}`
                  )
                }
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <ExternalLink size={12} /> Open Maps
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface MapContentProps {
  busesWithCoords: BusLiveLocation[];
  selectedBus: BusLiveLocation | null;
  followSelected: boolean;
  trailByBus: Record<string, LatLngPoint[]>;
  fitTrigger: number;
  openInfoBusId: string | null;
  onSelectBus: (busId: string) => void;
  onCloseInfo: () => void;
}

const MapContent: React.FC<MapContentProps> = ({
  busesWithCoords,
  selectedBus,
  followSelected,
  trailByBus,
  fitTrigger,
  openInfoBusId,
  onSelectBus,
  onCloseInfo,
}) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const initialFitDoneRef = useRef<boolean>(false);

  // Pan smoothly to selected bus when followSelected is enabled or selection changes
  useEffect(() => {
    if (!map || !followSelected || !selectedBus || !hasValidCoords(selectedBus)) {
      return;
    }
    const target = {
      lat: Number(selectedBus.latitude),
      lng: Number(selectedBus.longitude),
    };
    map.panTo(target);
    const currentZoom = map.getZoom();
    if (!currentZoom || currentZoom < 14) {
      map.setZoom(15);
    }
  }, [
    map,
    followSelected,
    selectedBus?.busId,
    selectedBus?.latitude,
    selectedBus?.longitude,
  ]);

  // Fit bounds on initial mount or when Fit All button is clicked
  useEffect(() => {
    if (!map || busesWithCoords.length === 0) return;
    if (initialFitDoneRef.current && fitTrigger === 0) return;

    if (busesWithCoords.length === 1) {
      const b = busesWithCoords[0];
      map.panTo({ lat: Number(b.latitude), lng: Number(b.longitude) });
      map.setZoom(15);
      initialFitDoneRef.current = true;
      return;
    }

    if (typeof google !== "undefined" && google.maps?.LatLngBounds) {
      const bounds = new google.maps.LatLngBounds();
      busesWithCoords.forEach((b) => {
        bounds.extend({ lat: Number(b.latitude), lng: Number(b.longitude) });
      });
      map.fitBounds(bounds, 56);
      initialFitDoneRef.current = true;
    }
  }, [map, fitTrigger, busesWithCoords.length]);

  // Draw live GPS breadcrumb trail for the selected bus
  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps?.Polyline) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const path = selectedBus ? trailByBus[selectedBus.busId] || [] : [];
    if (path.length >= 2) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#f59e0b",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, selectedBus?.busId, trailByBus]);

  return (
    <>
      {busesWithCoords.map((bus) => (
        <BusAdvancedMarker
          key={bus.busId}
          bus={bus}
          isSelected={selectedBus?.busId === bus.busId}
          isInfoOpen={openInfoBusId === bus.busId}
          onSelect={onSelectBus}
          onCloseInfo={onCloseInfo}
        />
      ))}
    </>
  );
};

interface MapViewportProps {
  busesWithCoords: BusLiveLocation[];
  selectedBus: BusLiveLocation | null;
  onSelectBus?: (busId: string) => void;
  heightClass: string;
}

const MapViewportInner: React.FC<MapViewportProps> = ({
  busesWithCoords,
  selectedBus,
  onSelectBus,
  heightClass,
}) => {
  const apiStatus = useApiLoadingStatus();
  const [mapType, setMapType] = useState<"roadmap" | "hybrid">("roadmap");
  const [followSelected, setFollowSelected] = useState<boolean>(true);
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [openInfoBusId, setOpenInfoBusId] = useState<string | null>(null);
  const [trailByBus, setTrailByBus] = useState<Record<string, LatLngPoint[]>>({});

  // Trigger quota banner if Google Maps authentication fails
  useEffect(() => {
    if (apiStatus === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
    }
  }, [apiStatus]);

  // Append live GPS coordinates to breadcrumb history per bus (max 60 points)
  useEffect(() => {
    if (busesWithCoords.length === 0) return;
    setTrailByBus((prev) => {
      let changed = false;
      const next: Record<string, LatLngPoint[]> = { ...prev };
      for (const b of busesWithCoords) {
        const pt = { lat: Number(b.latitude), lng: Number(b.longitude) };
        const existing = next[b.busId] || [];
        const last = existing[existing.length - 1];
        if (
          !last ||
          Math.abs(last.lat - pt.lat) > 0.00003 ||
          Math.abs(last.lng - pt.lng) > 0.00003
        ) {
          next[b.busId] = [...existing.slice(-59), pt];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [busesWithCoords]);

  const handleSelectMarker = useCallback(
    (busId: string) => {
      setOpenInfoBusId(busId);
      setFollowSelected(true);
      if (onSelectBus) onSelectBus(busId);
    },
    [onSelectBus]
  );

  const initialCenter: LatLngPoint =
    selectedBus && hasValidCoords(selectedBus)
      ? { lat: Number(selectedBus.latitude), lng: Number(selectedBus.longitude) }
      : busesWithCoords[0]
        ? {
            lat: Number(busesWithCoords[0].latitude),
            lng: Number(busesWithCoords[0].longitude),
          }
        : DEFAULT_FALLBACK_CENTER;

  if (
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div
        className={`relative w-full ${heightClass} rounded-2xl bg-slate-900 border border-amber-500/40 flex flex-col items-center justify-center p-5 text-center space-y-3`}
      >
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <div>
          <p className="text-sm font-black text-white">
            Google Map load nahi ho paya
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Network ya API quota ke karan map render nahi ho saka. Aap seedha Google Maps app mein live location khol sakte hain.
          </p>
        </div>
        {selectedBus && hasValidCoords(selectedBus) && (
          <button
            type="button"
            onClick={() =>
              safeOpenExternalUrl(
                `https://www.google.com/maps?q=${selectedBus.latitude},${selectedBus.longitude}`
              )
            }
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink size={14} /> Open in Google Maps
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-inner`}
    >
      {apiStatus === APILoadingStatus.LOADING && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <span className="text-xs font-bold">Real Google Map load ho raha hai...</span>
        </div>
      )}

      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={initialCenter}
        defaultZoom={busesWithCoords.length > 1 ? 13 : 15}
        mapTypeId={mapType}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
        style={{ width: "100%", height: "100%" }}
        onDragstart={() => setFollowSelected(false)}
      >
        <MapContent
          busesWithCoords={busesWithCoords}
          selectedBus={selectedBus}
          followSelected={followSelected}
          trailByBus={trailByBus}
          fitTrigger={fitTrigger}
          openInfoBusId={openInfoBusId}
          onSelectBus={handleSelectMarker}
          onCloseInfo={() => setOpenInfoBusId(null)}
        />
      </GoogleMap>

      {/* Top-Left Live Status Pill */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none">
        {selectedBus && hasValidCoords(selectedBus) ? (
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-700 text-[11px] font-bold text-white shadow-lg flex items-center gap-1.5 backdrop-blur-md">
            {selectedBus.tripStatus === "started" ? (
              <Radio size={12} className="text-emerald-400 animate-pulse" />
            ) : (
              <MapPin size={12} className="text-amber-400" />
            )}
            <span>{getShortBusLabel(selectedBus.busNumber)}</span>
            <span className="text-amber-300 font-mono">
              {selectedBus.speed} km/h
            </span>
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-500/40 text-[11px] font-bold text-amber-200 shadow-lg flex items-center gap-1.5 backdrop-blur-md">
            <Navigation size={12} className="text-amber-400" />
            <span>Driver GPS signal ka intezaar hai...</span>
          </div>
        )}
      </div>

      {/* Top-Right Interactive Map Controls */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            setMapType((prev) => (prev === "roadmap" ? "hybrid" : "roadmap"))
          }
          className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 text-white border border-slate-700 text-[11px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-md cursor-pointer transition"
          title="Switch Road / Satellite View"
        >
          <Layers size={13} className="text-sky-400" />
          <span>{mapType === "roadmap" ? "Satellite" : "Road Map"}</span>
        </button>

        <button
          type="button"
          onClick={() => setFollowSelected((prev) => !prev)}
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-md cursor-pointer transition ${
            followSelected
              ? "bg-amber-500 text-slate-950 border-amber-300"
              : "bg-slate-950/90 hover:bg-slate-800 text-slate-200 border-slate-700"
          }`}
          title="Auto-Follow Selected Bus"
        >
          <Crosshair size={13} />
          <span className="hidden sm:inline">
            {followSelected ? "Following" : "Follow"}
          </span>
        </button>

        {busesWithCoords.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setFollowSelected(false);
              setFitTrigger((c) => c + 1);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 text-white border border-slate-700 text-[11px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-md cursor-pointer transition"
            title="Show All Buses on Map"
          >
            <Maximize2 size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">All</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const LiveBusGoogleMap: React.FC<LiveBusGoogleMapProps> = ({
  buses,
  selectedBusId,
  onSelectBus,
  heightClass = "h-[300px] sm:h-[360px]",
  schoolId,
  schoolCode,
}) => {
  const envKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "").trim();
  const normalizedSchoolId = (schoolId || "").trim();
  const normalizedSchoolCode = (schoolCode || "").trim();
  const hasSchoolLookup = Boolean(normalizedSchoolId || normalizedSchoolCode);
  const [apiKey, setApiKey] = useState<string>(hasSchoolLookup ? "" : envKey);
  const [keyLoading, setKeyLoading] = useState<boolean>(hasSchoolLookup ? true : !envKey);

  useEffect(() => {
    if (!hasSchoolLookup && envKey) {
      setApiKey(envKey);
      setKeyLoading(false);
      return;
    }

    let active = true;
    setKeyLoading(true);
    const params = new URLSearchParams();
    if (normalizedSchoolId) params.set("schoolId", normalizedSchoolId);
    if (normalizedSchoolCode) params.set("schoolCode", normalizedSchoolCode);
    const queryStr = params.toString();

    fetch(`/api/public-config/maps-key${queryStr ? `?${queryStr}` : ""}`)
      .then((r) => (r.ok ? r.json() : { apiKey: "" }))
      .then((data) => {
        if (!active) return;
        const serverKey = String(data?.apiKey || "").trim();
        setApiKey(serverKey || envKey);
        setKeyLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setApiKey(envKey);
        setKeyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [envKey, hasSchoolLookup, normalizedSchoolId, normalizedSchoolCode]);

  const busesWithCoords = buses.filter((b) => hasValidCoords(b));
  const selectedBus =
    buses.find((b) => b.busId === selectedBusId) || buses[0] || null;

  if (keyLoading) {
    return (
      <div
        className={`w-full ${heightClass} rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-300`}
      >
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <span className="text-xs font-bold">Google Maps configure ho raha hai...</span>
      </div>
    );
  }

  if (!apiKey) {
    if (selectedBus && hasValidCoords(selectedBus)) {
      const lat = Number(selectedBus.latitude);
      const lng = Number(selectedBus.longitude);
      const pad = 0.012;
      const bbox = `${(lng - pad).toFixed(6)},${(lat - pad).toFixed(6)},${(lng + pad).toFixed(6)},${(lat + pad).toFixed(6)}`;
      const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
        bbox
      )}&layer=mapnik&marker=${lat},${lng}`;
      return (
        <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-700 bg-slate-900`}>
          <iframe
            title={`Live Map - ${selectedBus.busNumber}`}
            src={osmEmbedUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
            <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-700 text-[11px] font-bold text-white shadow-lg pointer-events-auto truncate">
              <span className="text-emerald-400 mr-1.5">●</span>
              {selectedBus.busNumber} ({lat.toFixed(4)}, {lng.toFixed(4)})
            </div>
            <button
              type="button"
              onClick={() =>
                safeOpenExternalUrl(`https://www.google.com/maps?q=${lat},${lng}`)
              }
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-lg cursor-pointer pointer-events-auto shrink-0"
            >
              <ExternalLink size={12} /> Google Maps
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`w-full ${heightClass} rounded-2xl bg-slate-900 border border-amber-500/40 flex flex-col items-center justify-center p-5 text-center space-y-2.5`}
      >
        <AlertTriangle className="w-7 h-7 text-amber-400" />
        <div>
          <p className="text-sm font-black text-white">
            लाइव लोकेशन की प्रतीक्षा है
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            "यात्रा शुरू करें" या "1-Tap Live GPS" दबाएं अथवा Google Maps Share Link अटैच करें — लाइव मैप यहीं दिखेगा।
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      key={apiKey}
      apiKey={apiKey}
      libraries={["marker"]}
      language="en"
      region="IN"
    >
      <MapViewportInner
        busesWithCoords={busesWithCoords}
        selectedBus={selectedBus}
        onSelectBus={onSelectBus}
        heightClass={heightClass}
      />
    </APIProvider>
  );
};
