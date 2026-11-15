// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Bus, Navigation, MapPin, Gauge, Phone, ExternalLink,
  RefreshCw, Radio, CheckCircle2, Clock, AlertCircle,
  Sliders, Shield, Play, Map as MapIcon, Plus, Copy, Link2, X, Home, Crosshair, QrCode
} from "lucide-react";
import type { School, BusLiveLocation, SchoolStudent } from "../../school-types";
import { shouldUseDemoForSchool, updateStudent } from "../../school-firebase";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";
import { rtdb } from "../../firebase";
import { ref as dbRef, onValue, set as rtdbSet } from "firebase/database";
import { toast } from "sonner";
import { syncSchoolSubcollection } from "../../utils/schoolCloudSync";
import { LiveBusGoogleMap } from "./LiveBusGoogleMap";
import { DriverIdCardModal, type DriverIdCardData } from "./DriverIdCardModal";
import {
  type StudentHomePin,
  parseLatLngInput,
  haversineMeters,
  computeBearingDeg,
  formatDistanceShort,
  getProximityStatus,
} from "../../utils/busProximity";

interface Props {
  school: School;
  onOpenDriverConsole?: () => void;
  onClose?: () => void;
  currentStudent?: Partial<SchoolStudent> | null;
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

export const AdminBusFleetRadar: React.FC<Props> = ({
  school,
  onOpenDriverConsole,
  onClose,
  currentStudent,
}) => {
  const isDemo = shouldUseDemoForSchool(school?.id);
  const canManageFleet = Boolean(onOpenDriverConsole);
  const [buses, setBuses] = useState<BusLiveLocation[]>(() => (isDemo ? DEFAULT_BUS_FLEET : []));
  const [selectedBusId, setSelectedBusId] = useState<string>(() => (isDemo ? "bus-01" : ""));
  const [filterMode, setFilterMode] = useState<"all" | "active">("all");
  const [visualizerMode, setVisualizerMode] = useState<"map" | "radar">("radar");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [showAddBusModal, setShowAddBusModal] = useState<boolean>(false);
  const [newBusNumber, setNewBusNumber] = useState("");
  const [newBusRoute, setNewBusRoute] = useState("");
  const [newBusStops, setNewBusStops] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [homePins, setHomePins] = useState<StudentHomePin[]>([]);
  const [selfPinInput, setSelfPinInput] = useState<string>("");
  const [showSelfPinBox, setShowSelfPinBox] = useState<boolean>(false);
  const [selectedDriverForIdCard, setSelectedDriverForIdCard] = useState<DriverIdCardData | null>(null);

  const buildDriverPortalUrl = (bus?: BusLiveLocation | null) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams();
    params.set("driverConsole", "1");
    if (school?.id) params.set("schoolId", school.id);
    if (school?.code) params.set("schoolCode", school.code);
    if (school?.name) params.set("schoolName", school.name);
    if (bus?.busId) params.set("busId", bus.busId);
    if (bus?.busNumber) params.set("busNumber", bus.busNumber);
    if (bus?.route) params.set("route", bus.route);
    if (bus?.driverName) params.set("driverName", bus.driverName);
    if (bus?.driverPhone) params.set("driverPhone", bus.driverPhone);
    return `${origin}/?${params.toString()}`;
  };

  const handleCopyDriverLink = async (bus?: BusLiveLocation | null) => {
    const url = buildDriverPortalUrl(bus);
    try {
      await navigator.clipboard?.writeText(url);
      toast.success(
        bus
          ? `${bus.busNumber} ka Driver Dashboard Link copy ho gaya! Driver ke WhatsApp par bhej dein.`
          : "Driver Dashboard Link copy ho gaya!"
      );
    } catch {
      toast.info(url);
    }
  };

  const handleAddQuickBus = (e: React.FormEvent) => {
    e.preventDefault();
    const sid = school?.id || "default";
    if (!newBusNumber.trim()) {
      toast.error("Kripya Bus Number daalein.");
      return;
    }
    const stopsArr = newBusStops
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const busId = `bus_${Date.now()}`;
    const newRecord: any = {
      id: busId,
      schoolId: sid,
      vehicleNumber: newBusNumber.trim(),
      model: "School Bus",
      route: newBusRoute.trim() || "Main School Route",
      stops: stopsArr.length > 0 ? stopsArr : ["Start Point", "Main Chowk", "School Main Gate"],
      driverName: newDriverName.trim() || "Driver",
      driverPhone: newDriverPhone.trim(),
      fitnessExpiryDate: "",
      insuranceExpiryDate: "",
      pollutionPucExpiryDate: "",
      roadTaxExpiryDate: "",
      permitExpiryDate: "",
    };

    try {
      const existingRaw = localStorage.getItem(`bus_fitness_${sid}`);
      const existingList = existingRaw ? JSON.parse(existingRaw) : [];
      const nextFitnessList = Array.isArray(existingList) ? [newRecord, ...existingList] : [newRecord];
      localStorage.setItem(`bus_fitness_${sid}`, JSON.stringify(nextFitnessList));
      syncSchoolSubcollection(sid, "bus_fitness", nextFitnessList);

      if (rtdb && sid) {
        const fleetObj: Record<string, any> = {};
        nextFitnessList.forEach((r: any) => {
          if (!r?.id) return;
          fleetObj[r.id] = {
            id: r.id,
            vehicleNumber: r.vehicleNumber || "",
            route: r.route || r.model || "Main Route",
            stops: Array.isArray(r.stops) ? r.stops : [],
            driverName: r.driverName || "",
            driverPhone: r.driverPhone || "",
          };
        });
        rtdbSet(dbRef(rtdb, `schools/${sid}/bus_fleet`), fleetObj).catch(() => {});
      }
    } catch (err) {
      console.warn("[AdminBusFleetRadar] Quick add bus warning:", err);
    }

    const liveEntry: BusLiveLocation = {
      busId,
      busNumber: newRecord.vehicleNumber,
      route: newRecord.route,
      driverName: newRecord.driverName,
      driverPhone: newRecord.driverPhone,
      latitude: 0,
      longitude: 0,
      speed: 0,
      heading: 0,
      accuracy: 0,
      tripStatus: "idle",
      tripType: "morning_pickup",
      lastUpdated: new Date().toISOString(),
      currentStop: newRecord.stops[0] || "Depot",
      totalStops: newRecord.stops.length,
      completedStops: [],
    };
    setBuses((prev) => [liveEntry, ...prev.filter((b) => b.busId !== busId)]);
    setSelectedBusId(busId);
    setNewBusNumber("");
    setNewBusRoute("");
    setNewBusStops("");
    setNewDriverName("");
    setNewDriverPhone("");
    setShowAddBusModal(false);
    setSelectedDriverForIdCard({
      busId,
      busNumber: liveEntry.busNumber,
      route: liveEntry.route,
      driverName: liveEntry.driverName,
      driverPhone: liveEntry.driverPhone,
      stops: newRecord.stops,
    });
    toast.success(`Bus "${liveEntry.busNumber}" add ho gayi aur Driver ID Card (QR) ban gaya!`);
  };

  // Subscribe to live bus updates
  useEffect(() => {
    const sid = school?.id || "";
    const demoMode = shouldUseDemoForSchool(sid);

    // 1. Check local bus states
    const loadLocalBuses = () => {
      if (demoMode) {
        const updated = DEFAULT_BUS_FLEET.map((baseBus) => {
          try {
            const raw = localStorage.getItem(`nst_live_bus_${sid || "default"}_${baseBus.busId}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              return { ...baseBus, ...parsed };
            }
          } catch (err) {
            console.warn("[AdminBusFleetRadar] Demo bus parse warning:", err);
          }
          return baseBus;
        });
        setBuses(updated);
        setLastRefreshed(new Date());
        return;
      }

      // Real school: load from configured fitness vehicles + any live bus telemetry keys
      const map = new Map<string, BusLiveLocation>();
      try {
        const fitRaw = sid ? localStorage.getItem(`bus_fitness_${sid}`) : null;
        if (fitRaw) {
          const fitList = JSON.parse(fitRaw);
          if (Array.isArray(fitList)) {
            fitList.forEach((v: any, idx: number) => {
              const busId = v.id || `bus_${idx + 1}`;
              map.set(busId, {
                busId,
                busNumber: v.vehicleNumber || `Bus #${idx + 1}`,
                route: v.route || "Configured Route",
                driverName: v.driverName || "—",
                driverPhone: v.driverPhone || "",
                latitude: Number(v.latitude || 0),
                longitude: Number(v.longitude || 0),
                speed: 0,
                heading: 0,
                accuracy: 0,
                tripStatus: "idle",
                tripType: "morning_pickup",
                lastUpdated: new Date().toISOString(),
                currentStop: "Depot",
                totalStops: 0,
                completedStops: [],
              });
            });
          }
        }
      } catch (err) {
        console.warn("[AdminBusFleetRadar] Fitness list parse warning:", err);
      }

      if (sid) {
        try {
          const livePrefix = `nst_live_bus_${sid}_`;
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(livePrefix)) {
              const raw = localStorage.getItem(k);
              if (raw) {
                const parsed = JSON.parse(raw) as BusLiveLocation;
                const bid = parsed.busId || k.slice(livePrefix.length);
                map.set(bid, { ...(map.get(bid) || {}), ...parsed, busId: bid });
              }
            }
          }
        } catch (err) {
          console.warn("[AdminBusFleetRadar] Live bus storage warning:", err);
        }
      }

      setBuses((prev) => {
        // Preserve any RTDB entries already loaded in memory while merging local updates
        const merged = new Map<string, BusLiveLocation>(prev.map((b) => [b.busId, b]));
        map.forEach((val, key) => merged.set(key, { ...(merged.get(key) || {}), ...val }));
        return Array.from(merged.values());
      });
      setLastRefreshed(new Date());
    };

    loadLocalBuses();

    // 2. Window event listener for instant local sync
    const handleBusUpdate = (e: any) => {
      const live = e?.detail as BusLiveLocation;
      if (live && live.busId) {
        setBuses((prev) => {
          const exists = prev.some((b) => b.busId === live.busId);
          if (!exists) return [...prev, live];
          return prev.map((b) => (b.busId === live.busId ? { ...b, ...live } : b));
        });
        setLastRefreshed(new Date());
      }
    };
    window.addEventListener("nst_bus_location_update", handleBusUpdate);

    // 3. Firebase RTDB listeners (locations + configured fleet)
    let unsubRtdbLoc1: any = null;
    let unsubRtdbLoc2: any = null;
    let unsubRtdbFleet: any = null;
    if (rtdb && sid) {
      const mergeIncomingLocations = (busArr: BusLiveLocation[]) => {
        if (busArr.length === 0) return;
        setBuses((prev) => {
          const map = new Map(prev.map((p) => [p.busId, p]));
          busArr.forEach((b) => {
            if (b?.busId) map.set(b.busId, { ...map.get(b.busId), ...b });
          });
          return Array.from(map.values());
        });
        setLastRefreshed(new Date());
      };

      try {
        unsubRtdbLoc1 = onValue(dbRef(rtdb, `school_bus_locations/${sid}`), (snap) => {
          if (snap.exists()) {
            mergeIncomingLocations(Object.values(snap.val()) as BusLiveLocation[]);
          }
        });
      } catch (e) {
        console.warn("[AdminBusFleetRadar] RTDB listen notice:", e);
      }

      try {
        unsubRtdbLoc2 = onValue(dbRef(rtdb, `schools/${sid}/bus_locations`), (snap) => {
          if (snap.exists()) {
            mergeIncomingLocations(Object.values(snap.val()) as BusLiveLocation[]);
          }
        });
      } catch {}

      try {
        unsubRtdbFleet = onValue(dbRef(rtdb, `schools/${sid}/bus_fleet`), (snap) => {
          if (snap.exists()) {
            const rawFleet = snap.val() || {};
            const fleetArr = Object.values(rawFleet) as any[];
            if (fleetArr.length > 0) {
              setBuses((prev) => {
                const map = new Map(prev.map((p) => [p.busId, p]));
                fleetArr.forEach((v: any) => {
                  if (!v?.id) return;
                  const existing = map.get(v.id);
                  if (!existing) {
                    map.set(v.id, {
                      busId: v.id,
                      busNumber: v.vehicleNumber || "School Bus",
                      route: v.route || "Configured Route",
                      driverName: v.driverName || "—",
                      driverPhone: v.driverPhone || "",
                      latitude: 0,
                      longitude: 0,
                      speed: 0,
                      heading: 0,
                      accuracy: 0,
                      tripStatus: "idle",
                      tripType: "morning_pickup",
                      lastUpdated: new Date().toISOString(),
                      currentStop: Array.isArray(v.stops) && v.stops[0] ? v.stops[0] : "Depot",
                      totalStops: Array.isArray(v.stops) ? v.stops.length : 0,
                      completedStops: [],
                    });
                  }
                });
                return Array.from(map.values());
              });
            }
          }
        });
      } catch {}
    }

    const interval = setInterval(loadLocalBuses, 4000);

    return () => {
      window.removeEventListener("nst_bus_location_update", handleBusUpdate);
      clearInterval(interval);
      if (typeof unsubRtdbLoc1 === "function") unsubRtdbLoc1();
      if (typeof unsubRtdbLoc2 === "function") unsubRtdbLoc2();
      if (typeof unsubRtdbFleet === "function") unsubRtdbFleet();
    };
  }, [school?.id]);

  // Subscribe to saved Student Home GPS Pins (100% Free Haversine Proximity Tracking)
  useEffect(() => {
    const sid = school?.id || "";
    const loadLocalPins = () => {
      const list: StudentHomePin[] = [];
      if (sid) {
        try {
          const raw = localStorage.getItem(`nst_student_home_pins_${sid}`);
          if (raw) {
            const obj = JSON.parse(raw) || {};
            Object.values(obj).forEach((p: any) => {
              if (Number.isFinite(Number(p?.homeLat)) && Number.isFinite(Number(p?.homeLng))) {
                list.push({
                  ...p,
                  homeLat: Number(p.homeLat),
                  homeLng: Number(p.homeLng),
                });
              }
            });
          }
        } catch {}
      }
      if (isDemo && list.length === 0) {
        list.push(
          {
            studentId: "demo_st_1",
            studentName: "Aarav Sharma",
            className: "Class 5",
            rollNo: "04",
            busRoute: "Route 1",
            homeLat: 28.4604,
            homeLng: 77.0274,
          },
          {
            studentId: "demo_st_2",
            studentName: "Priya Verma",
            className: "Class 3",
            rollNo: "11",
            busRoute: "Route 1",
            homeLat: 28.4632,
            homeLng: 77.0305,
          },
          {
            studentId: "demo_st_3",
            studentName: "Rohan Gupta",
            className: "Class 7",
            rollNo: "18",
            busRoute: "Route 1",
            homeLat: 28.4685,
            homeLng: 77.0358,
          }
        );
      }
      if (list.length > 0) {
        setHomePins((prev) => {
          const map = new Map<string, StudentHomePin>(prev.map((p) => [p.studentId, p]));
          list.forEach((p) => map.set(p.studentId, p));
          return Array.from(map.values());
        });
      }
    };

    loadLocalPins();

    let unsubPins: any = null;
    if (rtdb && sid) {
      try {
        unsubPins = onValue(dbRef(rtdb, `schools/${sid}/student_home_pins`), (snap) => {
          if (!snap.exists()) return;
          const val = snap.val() || {};
          const arr = Object.values(val).filter(
            (p: any) => p?.studentId && Number.isFinite(Number(p?.homeLat)) && Number.isFinite(Number(p?.homeLng))
          ) as StudentHomePin[];
          if (arr.length > 0) {
            setHomePins(
              arr.map((p) => ({
                ...p,
                homeLat: Number(p.homeLat),
                homeLng: Number(p.homeLng),
              }))
            );
          }
        });
      } catch {}
    }

    return () => {
      if (typeof unsubPins === "function") unsubPins();
    };
  }, [school?.id, isDemo]);

  const saveSelfHomePin = async (lat: number, lng: number) => {
    const sid = school?.id;
    const stId = currentStudent?.id;
    if (!sid || !stId) return;
    const pinRecord: StudentHomePin = {
      studentId: stId,
      studentName: currentStudent?.name || "Student",
      rollNo: currentStudent?.rollNo,
      className: currentStudent?.className,
      busRoute: currentStudent?.busRoute || "Route 1",
      homeLat: lat,
      homeLng: lng,
      homeAddress: currentStudent?.address || "",
      updatedAt: new Date().toISOString(),
    };
    setHomePins((prev) => [pinRecord, ...prev.filter((p) => p.studentId !== stId)]);
    try {
      const k = `nst_student_home_pins_${sid}`;
      const existing = JSON.parse(localStorage.getItem(k) || "{}");
      existing[stId] = pinRecord;
      localStorage.setItem(k, JSON.stringify(existing));
      if (rtdb) {
        await rtdbSet(dbRef(rtdb, `schools/${sid}/student_home_pins/${stId}`), pinRecord);
      }
      await updateStudent(sid, stId, { homeLat: lat, homeLng: lng });
    } catch {}
    setShowSelfPinBox(false);
    setSelfPinInput("");
    toast.success("Aapke ghar ka GPS location save ho gaya! Ab bus door se hi live distance dikhegi.");
  };

  const handleCaptureSelfHomeGps = () => {
    if (!navigator.geolocation) {
      toast.error("Aapke mobile me GPS supported nahi hai.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveSelfHomePin(
          Number(pos.coords.latitude.toFixed(6)),
          Number(pos.coords.longitude.toFixed(6))
        );
      },
      (err) => {
        toast.error(err?.message || "GPS permission allow karein ya Google Maps link paste karein.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveSelfPinLink = () => {
    const parsed = parseLatLngInput(selfPinInput);
    if (!parsed) {
      toast.error("Valid Google Maps location link ya 'lat, lng' daalein.");
      return;
    }
    saveSelfHomePin(parsed.lat, parsed.lng);
  };

  const activeBuses = buses.filter((b) => b.tripStatus === "started");
  const displayList = filterMode === "active" ? activeBuses : buses;
  const currentSelectedBus = buses.find((b) => b.busId === selectedBusId) || buses[0] || null;

  const busHasValidCoords = Boolean(
    currentSelectedBus &&
      Number.isFinite(Number(currentSelectedBus.latitude)) &&
      Number.isFinite(Number(currentSelectedBus.longitude)) &&
      (Math.abs(Number(currentSelectedBus.latitude)) > 0.001 ||
        Math.abs(Number(currentSelectedBus.longitude)) > 0.001)
  );

  const proximityList = React.useMemo(() => {
    if (!busHasValidCoords || !currentSelectedBus) return [];
    const bLat = Number(currentSelectedBus.latitude);
    const bLng = Number(currentSelectedBus.longitude);
    return homePins
      .map((pin) => {
        const distM = haversineMeters(bLat, bLng, pin.homeLat, pin.homeLng);
        const bearingDeg = computeBearingDeg(bLat, bLng, pin.homeLat, pin.homeLng);
        return {
          ...pin,
          distanceMeters: distM,
          bearingDeg,
          status: getProximityStatus(distM),
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [busHasValidCoords, currentSelectedBus, homePins]);

  const mySelfProximity = currentStudent?.id
    ? proximityList.find((p) => p.studentId === currentStudent.id) || null
    : null;
  const mySavedPin = currentStudent?.id
    ? homePins.find((p) => p.studentId === currentStudent.id) || null
    : null;

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

        <div className="flex flex-wrap items-center gap-2">
          {canManageFleet && (
            <button
              type="button"
              onClick={() => setShowAddBusModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus size={14} /> Add Bus &amp; Driver
            </button>
          )}
          {onOpenDriverConsole && (
            <button
              type="button"
              onClick={onOpenDriverConsole}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Navigation size={14} /> Driver Console
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

      {/* School Admin Quick 3-Step Setup Strip */}
      {canManageFleet && (
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-300 space-y-0.5">
            <p className="font-black text-amber-300 text-[11px] uppercase tracking-wider">
              School Bus Setup (3 Aasan Steps):
            </p>
            <p className="text-[11px] text-slate-400">
              1) <strong className="text-white">Add Bus &amp; Driver</strong> dabakar bus jodein (saath hi <strong className="text-amber-300">Driver ID Card + QR</strong> ban jayega) → 2) Driver apne ID Card ka <strong className="text-white">QR Code scan</strong> karke app me login karega → 3) Driver <strong className="text-emerald-300">Start Trip</strong> dabayega aur live tracking chalu ho jayegi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {currentSelectedBus && (
              <button
                type="button"
                onClick={() =>
                  setSelectedDriverForIdCard({
                    busId: currentSelectedBus.busId,
                    busNumber: currentSelectedBus.busNumber,
                    route: currentSelectedBus.route,
                    driverName: currentSelectedBus.driverName || "Bus Driver",
                    driverPhone: currentSelectedBus.driverPhone || "",
                  })
                }
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <QrCode size={14} />
                <span>Driver ID Card (QR)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleCopyDriverLink(currentSelectedBus)}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Link2 size={14} />
              <span>{currentSelectedBus ? "Copy Driver Link" : "Copy Driver Portal Link"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid: Left List + Right Interactive Vector Radar */}
      {!currentSelectedBus ? (
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto">
            <Bus size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white">अभी कोई लाइव बस या रूट दर्ज नहीं है</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              पहले अपने स्कूल की बस और ड्राइवर का नाम जोड़ें, फिर ड्राइवर को उसका अलग Mobile GPS Link भेजें।
            </p>
          </div>
          {canManageFleet && (
            <button
              type="button"
              onClick={() => setShowAddBusModal(true)}
              className="mx-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={16} /> Add First School Bus &amp; Driver
            </button>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Fleet List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {displayList.map((bus) => {
            const isSelected = bus.busId === currentSelectedBus.busId;
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
                    {bus.lastUpdated ? new Date(bus.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setVisualizerMode("radar")}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    visualizerMode === "radar"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Radio size={12} /> Free Live Radar
                </button>
                <button
                  type="button"
                  onClick={() => setVisualizerMode("map")}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    visualizerMode === "map"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MapIcon size={12} /> Google Map
                </button>
              </div>
              {Number(currentSelectedBus.latitude) !== 0 && Number(currentSelectedBus.longitude) !== 0 && (
                <button
                  type="button"
                  onClick={() => safeOpenExternalUrl(getGoogleMapsUrl(currentSelectedBus.latitude, currentSelectedBus.longitude))}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                >
                  <ExternalLink size={13} /> Maps App
                </button>
              )}
              {currentSelectedBus.driverPhone && (
                <a
                  href={`tel:${currentSelectedBus.driverPhone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Phone size={13} /> Call Driver
                </a>
              )}
            </div>
          </div>

          {/* Student Self-Home Pin Banner (Free Live Distance to My Home) */}
          {currentStudent?.id && (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    {mySelfProximity ? (
                      <p className="font-black text-emerald-200">
                        आपका घर बस से {formatDistanceShort(mySelfProximity.distanceMeters)} दूर है • {mySelfProximity.status.label}
                      </p>
                    ) : mySavedPin ? (
                      <p className="font-bold text-emerald-200">
                        आपके घर का GPS Pin सेव है ({mySavedPin.homeLat.toFixed(4)}, {mySavedPin.homeLng.toFixed(4)}) — बस चलते ही लाइव दूरी दिखेगी।
                      </p>
                    ) : (
                      <p className="font-bold text-amber-200">
                        अपने घर का GPS Pin सेव करें (100% Free) — बस घर के पास आते ही तुरंत पता चलेगा!
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCaptureSelfHomeGps}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Crosshair size={12} /> {mySavedPin ? "Update My Home GPS" : "Save My Home GPS"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSelfPinBox((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                  >
                    {showSelfPinBox ? "Close" : "Paste Link"}
                  </button>
                </div>
              </div>
              {showSelfPinBox && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={selfPinInput}
                    onChange={(e) => setSelfPinInput(e.target.value)}
                    placeholder="Google Maps link paste karein ya lat,lng (e.g. 28.4595, 77.0266)"
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSelfPinLink}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Save Location
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Interactive 100% FREE Live Proximity Radar OR Real Google Map */}
          {visualizerMode === "map" ? (
            <div className="my-4">
              <LiveBusGoogleMap
                buses={displayList}
                selectedBusId={currentSelectedBus?.busId}
                onSelectBus={(bid) => setSelectedBusId(bid)}
                heightClass="h-[290px] sm:h-[340px]"
                schoolId={school?.id}
                schoolCode={school?.code}
              />
            </div>
          ) : (
            <div className="my-4 relative w-full h-64 sm:h-72 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 flex items-center justify-center overflow-hidden">
              {/* Range Ring Labels (100% Free Haversine Radar) */}
              <span className="absolute top-2 left-3 text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/30 z-10">
                100% FREE LIVE GHAR RADAR • 2 KM RANGE
              </span>
              <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono z-10">
                {homePins.length} Ghar Pins Tracked
              </span>

              {/* Concentric Range Circles */}
              <div className="absolute w-60 h-60 rounded-full border border-emerald-500/15"></div>
              <div className="absolute w-44 h-44 rounded-full border border-cyan-500/20"></div>
              <div className="absolute w-24 h-24 rounded-full border border-amber-500/25"></div>
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800"></div>
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800"></div>

              {/* Plotted Student Houses at True Bearing & Distance */}
              {proximityList.slice(0, 12).map((pin) => {
                const maxRadiusPx = 112;
                const clampedDist = Math.min(pin.distanceMeters, 2200);
                const radiusPx = Math.max(24, (clampedDist / 2200) * maxRadiusPx);
                const rad = ((pin.bearingDeg - 90) * Math.PI) / 180;
                const x = Math.cos(rad) * radiusPx;
                const y = Math.sin(rad) * radiusPx;
                const isNear = pin.distanceMeters <= 500;
                const isArrived = pin.distanceMeters <= 150;

                return (
                  <div
                    key={pin.studentId}
                    style={{
                      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`,
                    }}
                    className="absolute z-10 flex flex-col items-center pointer-events-auto"
                    title={`${pin.studentName} — ${formatDistanceShort(pin.distanceMeters)}`}
                  >
                    <div
                      className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black border shadow-md whitespace-nowrap flex items-center gap-1 ${
                        isArrived
                          ? "bg-emerald-500 text-slate-950 border-white animate-bounce"
                          : isNear
                            ? "bg-amber-500 text-slate-950 border-amber-200"
                            : "bg-slate-900/95 text-cyan-200 border-cyan-500/40"
                      }`}
                    >
                      <Home size={9} />
                      <span>{pin.studentName.split(" ")[0]}</span>
                      <span className="opacity-80 font-mono">
                        {formatDistanceShort(pin.distanceMeters)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Center Bus Pin */}
              <div className="relative z-20 flex flex-col items-center">
                <div className="relative">
                  <span className="absolute -inset-2 rounded-full bg-amber-400 opacity-30 animate-pulse"></span>
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xl shadow-amber-500/30">
                    <Bus size={20} />
                  </div>
                </div>
                <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 shadow-md">
                  {currentSelectedBus.speed} km/h •{" "}
                  {currentSelectedBus.tripStatus === "started" ? "LIVE" : "DEPOT"}
                </div>
              </div>
            </div>
          )}

          {/* LIVE FREE HOUSE PROXIMITY BOARD (Visible in BOTH Radar & Map modes) */}
          <div className="mb-3 rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <Home size={14} /> किसके घर के पास गाड़ी पहुँची (Live Free Distance)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                {proximityList.length} Homes Linked
              </span>
            </div>

            {proximityList.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                {homePins.length === 0
                  ? "अभी किसी बच्चे के घर का GPS Pin सेव नहीं है। Student Bus Roster में 'Set Home Pin' या Student App से घर का लोकेशन सेव करें।"
                  : "बस का लाइव GPS शुरू होते ही सभी बच्चों के घर की दूरी यहाँ मीटर/किमी में दिखेगी।"}
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {proximityList.slice(0, 12).map((item) => (
                  <div
                    key={item.studentId}
                    className={`px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      item.studentId === currentStudent?.id
                        ? "bg-emerald-950/50 border-emerald-500/50"
                        : "bg-slate-950/80 border-slate-800"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">
                        {item.studentName}
                        {item.className ? (
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                            ({item.className})
                          </span>
                        ) : null}
                      </p>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${item.status.badgeClass}`}
                      >
                        {item.status.label}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-sm text-amber-300 block">
                        {formatDistanceShort(item.distanceMeters)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          safeOpenExternalUrl(
                            `https://www.google.com/maps?q=${item.homeLat},${item.homeLng}`
                          )
                        }
                        className="text-[10px] text-indigo-300 hover:underline cursor-pointer"
                      >
                        Home Pin ↗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telemetry Metrics Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-3 border-t border-slate-800/80">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">ड्राइवर का नाम</span>
              <span className="text-xs font-bold text-white truncate block">{currentSelectedBus.driverName || "—"}</span>
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
                {Number(currentSelectedBus.latitude || 0).toFixed(4)}, {Number(currentSelectedBus.longitude || 0).toFixed(4)}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">स्टॉप्स प्रगति</span>
              <span className="text-xs font-bold font-mono text-emerald-400 block">
                {currentSelectedBus.completedStops?.length || 0} / {currentSelectedBus.totalStops || 0}
              </span>
            </div>
          </div>

          {canManageFleet && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                Driver ke login ke liye ID Card QR ya direct link:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDriverForIdCard({
                      busId: currentSelectedBus.busId,
                      busNumber: currentSelectedBus.busNumber,
                      route: currentSelectedBus.route,
                      driverName: currentSelectedBus.driverName || "Bus Driver",
                      driverPhone: currentSelectedBus.driverPhone || "",
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow"
                >
                  <QrCode size={13} /> Driver ID Card
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyDriverLink(currentSelectedBus)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Copy size={13} /> Copy Driver Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Quick Add Bus & Driver Modal */}
      {showAddBusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Bus className="w-5 h-5 text-emerald-400" />
                <span>Add School Bus &amp; Driver</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBusModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddQuickBus} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Bus / Vehicle Number *</label>
                <input
                  type="text"
                  required
                  value={newBusNumber}
                  onChange={(e) => setNewBusNumber(e.target.value)}
                  placeholder="e.g. DL-1PC-4590 (Bus #1)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Route Name</label>
                <input
                  type="text"
                  value={newBusRoute}
                  onChange={(e) => setNewBusRoute(e.target.value)}
                  placeholder="e.g. Route 1: City Center → Sector 45 → School"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Bus Stops (Comma separated)</label>
                <input
                  type="text"
                  value={newBusStops}
                  onChange={(e) => setNewBusStops(e.target.value)}
                  placeholder="e.g. Metro Gate, Main Market, Sector 45, School Gate"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Driver Name</label>
                  <input
                    type="text"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    placeholder="e.g. Rameshwar Singh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Driver Phone</label>
                  <input
                    type="tel"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    placeholder="e.g. 9818023450"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBusModal(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl cursor-pointer"
                >
                  Save Bus &amp; Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Official ID Card & QR Generator Modal */}
      <DriverIdCardModal
        isOpen={Boolean(selectedDriverForIdCard)}
        onClose={() => setSelectedDriverForIdCard(null)}
        driver={selectedDriverForIdCard}
        school={school}
      />
    </div>
  );
};
