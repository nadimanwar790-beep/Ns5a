// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  X, MapPin, Compass, Navigation, Save, Loader2,
  CheckCircle2, AlertCircle, ExternalLink, ShieldCheck,
  RotateCw, Sparkles, Building2, Sliders, Info
} from "lucide-react";
import type { School } from "../../school-types";
import {
  getLiveBrowserPosition,
  calculateDistanceMeters,
  formatDistance,
  checkCampusGeofence
} from "../../utils/geoUtils";
import { saveSchoolLiveLocation } from "../../school-firebase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School | null;
  onLocationSaved?: (newLocation: {
    latitude: number;
    longitude: number;
    locationRadiusMeters: number;
    locationAddress?: string;
  }) => void;
}

export const SchoolLocationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  onLocationSaved,
}) => {
  const [lat, setLat] = useState<number | string>(school?.latitude || "");
  const [lng, setLng] = useState<number | string>(school?.longitude || "");
  const [radius, setRadius] = useState<number>(school?.locationRadiusMeters || 200);
  const [address, setAddress] = useState<string>(school?.locationAddress || school?.address || "");
  const [geoFenceEnabled, setGeoFenceEnabled] = useState<boolean>(
    school?.geoFenceEnabled !== undefined ? school.geoFenceEnabled : true
  );

  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live test distance state
  const [currentTestDistance, setCurrentTestDistance] = useState<{
    meters: number;
    isInside: boolean;
    accuracy?: number;
  } | null>(null);

  useEffect(() => {
    if (school) {
      setLat(school.latitude || "");
      setLng(school.longitude || "");
      setRadius(school.locationRadiusMeters || 200);
      setAddress(school.locationAddress || school.address || "");
      setGeoFenceEnabled(school.geoFenceEnabled !== undefined ? school.geoFenceEnabled : true);
    }
  }, [school]);

  // Test live distance if coordinates exist
  useEffect(() => {
    if (isOpen && typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      getLiveBrowserPosition()
        .then((pos) => {
          const d = calculateDistanceMeters(pos.latitude, pos.longitude, lat, lng);
          setCurrentTestDistance({
            meters: d,
            isInside: d <= (radius || 200),
            accuracy: pos.accuracy,
          });
        })
        .catch(() => {
          // Silent catch on init
        });
    }
  }, [isOpen, lat, lng, radius]);

  if (!isOpen || !school) return null;

  const handleCaptureLiveLocation = async () => {
    setCapturing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const pos = await getLiveBrowserPosition();
      setLat(Number(pos.latitude.toFixed(6)));
      setLng(Number(pos.longitude.toFixed(6)));

      // Auto-set test distance
      setCurrentTestDistance({
        meters: 0,
        isInside: true,
        accuracy: pos.accuracy,
      });

      setSuccessMsg(`✓ लाइव GPS लोकेशन सफलतापूर्वक कैप्चर हुई! सटीकता: ±${Math.round(pos.accuracy || 5)}m`);
    } catch (err: any) {
      setErrorMsg(err?.message || "GPS लोकेशन प्राप्त करने में विफल।");
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    const latNum = typeof lat === "string" ? parseFloat(lat) : lat;
    const lngNum = typeof lng === "string" ? parseFloat(lng) : lng;

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setErrorMsg("कृपया मान्य अक्षांश (Latitude) व देशांतर (Longitude) दर्ज करें।");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await saveSchoolLiveLocation(school.id, {
        latitude: latNum,
        longitude: lngNum,
        locationRadiusMeters: radius,
        locationAddress: address,
        geoFenceEnabled,
      });

      setSuccessMsg("✓ स्कूल की लाइव लोकेशन व जियोफेंस सफलतापूर्वक सेव हो गई!");
      if (onLocationSaved) {
        onLocationSaved({
          latitude: latNum,
          longitude: lngNum,
          locationRadiusMeters: radius,
          locationAddress: address,
        });
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg("लोकेशन सेव करने में त्रुटि: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const hasValidCoords =
    typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng);

  const googleMapsUrl = hasValidCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.name + " " + (address || school.address || ""))}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  स्कूल लाइव लोकेशन व जियोफेंस (School Live GPS)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                  GEOFENCE
                </span>
              </div>
              <p className="text-xs text-blue-200/90 font-medium">
                स्कूल परिसर की सटीक GPS लोकेशन सेट करें जिससे हाजिरी परिसर के अंदर ही लग सके
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1-Tap Live GPS Capture Hero Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 dark:from-indigo-950/30 dark:via-slate-800 dark:to-teal-950/30 border border-indigo-200 dark:border-indigo-800/60 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>वर्तमान स्थान को स्कूल बनाएं (Auto-Detect GPS)</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  यदि आप वर्तमान में स्कूल परिसर में उपस्थित हैं, तो नीचे बटन दबाकर सटीक GPS कैप्चर करें।
                </p>
              </div>

              <button
                type="button"
                onClick={handleCaptureLiveLocation}
                disabled={capturing}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {capturing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>GPS खोज रहे हैं...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4" />
                    <span>📡 Capture Live GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* Current Test Status */}
            {currentTestDistance && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
                  currentTestDistance.isInside
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{currentTestDistance.isInside ? "🎯" : "📍"}</span>
                  <div>
                    <p className="font-black">
                      {currentTestDistance.isInside
                        ? `आप स्कूल परिसर के अंदर हैं (${formatDistance(currentTestDistance.meters)})`
                        : `आप स्कूल परिसर से ${formatDistance(currentTestDistance.meters)} दूर हैं`}
                    </p>
                    <p className="text-[10px] opacity-80 font-normal">
                      जियोफेंस सीमा: {radius} मीटर • जीपीएस सटीकता: ±{Math.round(currentTestDistance.accuracy || 5)}m
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 shrink-0">
                  {currentTestDistance.isInside ? "VERIFIED IN-CAMPUS" : "OUTSIDE RADIUS"}
                </span>
              </div>
            )}
          </div>

          {/* Form Fields: Lat, Lng, Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                अक्षांश (Latitude)
              </label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="28.459497"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                देशांतर (Longitude)
              </label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="77.026638"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  जियोफेंस रेडियस (Campus Geofence Radius): <span className="text-blue-600 dark:text-blue-400 font-black">{radius} मीटर</span>
                </label>
                <span className="text-[11px] text-slate-400">अनुशंसित: 150m - 300m</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>50m (छोटा परिसर)</span>
                <span>200m (मध्यम स्कूल)</span>
                <span>500m (बड़ा कैंपस)</span>
                <span>1000m (1 किमी)</span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                स्कूल पता / लैंडमार्क (Campus Address)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Sector 45, Urban Estate, Gurgaon, Haryana 122003"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Geofence Enforcement Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-xs text-slate-800 dark:text-white">
                  हाजिरी के समय लोकेशन सत्यापन (Location Verification on Punch)
                </p>
                <p className="text-[10px] text-slate-400">
                  हाजिरी दर्ज करते समय जांचेगा कि छात्र/शिक्षक/एडमिन स्कूल परिसर में मौजूद हैं या नहीं
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={geoFenceEnabled}
                onChange={(e) => setGeoFenceEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Google Maps External Link */}
          <div className="flex items-center justify-between text-xs pt-1">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Maps पर लोकेशन देखें / जांचें →</span>
            </a>
            {hasValidCoords && (
              <span className="font-mono text-[11px] text-slate-400">
                GPS: {Number(lat).toFixed(4)}°, {Number(lng).toFixed(4)}°
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            रद्द करें (Cancel)
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasValidCoords}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>सेव हो रहा है...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>💾 लोकेशन सेव करें (Save Live GPS)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
