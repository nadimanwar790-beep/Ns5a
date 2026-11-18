// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  X, Bus, Save, Search, Check,
  IndianRupee, Users, CheckCircle2,
  MapPin, Sliders, Crosshair, Link2,
  Route as RouteIcon, UserCheck, Plus, Edit3, Trash2, Phone, Clock, QrCode, ShieldCheck
} from "lucide-react";
import type {
  SchoolClass,
  SchoolStudent,
  SchoolBusDriver,
  SchoolBusRoute,
  BusRouteStop,
} from "../../school-types";
import { updateClassFeeStructure, updateStudent } from "../../school-firebase";
import { toast } from "sonner";
import { AdminBusFleetRadar } from "./AdminBusFleetRadar";
import { DriverTripConsole } from "./DriverTripConsole";
import { DriverIdCardModal, type DriverIdCardData } from "./DriverIdCardModal";
import {
  resolveGoogleMapsLocationInput,
  type StudentHomePin,
} from "../../utils/busProximity";
import { rtdb } from "../../firebase";
import { ref as dbRef, set as rtdbSet } from "firebase/database";
import {
  loadTransportData,
  getLocalDrivers,
  getLocalRoutes,
  saveDriverRecord,
  deleteDriverRecord,
  saveRouteRecord,
  deleteRouteRecord,
} from "../../utils/schoolTransportStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  classes: SchoolClass[];
  students: SchoolStudent[];
  initialClassId?: string;
  onUpdated: () => void;
  isEmbedded?: boolean;
}

export const BusTransportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  schoolCode,
  classes = [],
  students = [],
  initialClassId,
  onUpdated,
  isEmbedded = false,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || classes[0]?.id || ""
  );
  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  const [classBusFee, setClassBusFee] = useState<number>(() => {
    return Number(currentClass?.feeStructure?.busFee ?? 1000);
  });

  // Configured Routes & Drivers Master state
  const [routes, setRoutes] = useState<SchoolBusRoute[]>(() => getLocalRoutes(schoolId));
  const [drivers, setDrivers] = useState<SchoolBusDriver[]>(() => getLocalDrivers(schoolId));

  // Local student bus state map
  const [studentBusMap, setStudentBusMap] = useState<
    Record<
      string,
      {
        usesBus: boolean;
        busRoute: string;
        busStop?: string;
        busFee: number;
        busNumber?: string;
        driverName?: string;
        driverPhone?: string;
        conductorName?: string;
        conductorPhone?: string;
        custom?: boolean;
        homeLat?: number;
        homeLng?: number;
        homeAddress?: string;
      }
    >
  >({});
  const [editingPinStudentId, setEditingPinStudentId] = useState<string | null>(null);
  const [pinInputText, setPinInputText] = useState<string>("");
  const [activeViewTab, setActiveViewTab] = useState<
    "students" | "routes" | "drivers" | "live_radar" | "driver_console"
  >("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Route Editor state
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [rName, setRName] = useState("");
  const [rCode, setRCode] = useState("");
  const [rBusNumber, setRBusNumber] = useState("");
  const [rDriverId, setRDriverId] = useState("");
  const [rDriverName, setRDriverName] = useState("");
  const [rDriverPhone, setRDriverPhone] = useState("");
  const [rConductorName, setRConductorName] = useState("");
  const [rConductorPhone, setRConductorPhone] = useState("");
  const [rMonthlyFee, setRMonthlyFee] = useState<number>(900);
  const [rStops, setRStops] = useState<BusRouteStop[]>([
    { id: `stp_${Date.now()}_1`, stopName: "", pickupTime: "07:15", dropTime: "14:20", distanceKm: 3 },
  ]);

  // Driver Editor state
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [dName, setDName] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dLicenseNo, setDLicenseNo] = useState("");
  const [dLicenseExpiry, setDLicenseExpiry] = useState("2028-12-31");
  const [dAadhaar4, setDAadhaar4] = useState("");
  const [dConductorName, setDConductorName] = useState("");
  const [dConductorPhone, setDConductorPhone] = useState("");
  const [dBusNumber, setDBusNumber] = useState("");
  const [dStatus, setDStatus] = useState<"ACTIVE" | "ON_LEAVE" | "INACTIVE">("ACTIVE");
  const [driverIdCardData, setDriverIdCardData] = useState<DriverIdCardData | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    const refresh = () => {
      loadTransportData(schoolId).then((res) => {
        if (!active) return;
        setRoutes(res.routes);
        setDrivers(res.drivers);
      });
    };
    refresh();
    window.addEventListener("school-transport-updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("school-transport-updated", refresh);
    };
  }, [schoolId]);

  // Sync state whenever selected class or students change
  useEffect(() => {
    const targetClass = classes.find(c => c.id === selectedClassId) || classes[0];
    const initialFee = Number(targetClass?.feeStructure?.busFee !== undefined ? targetClass.feeStructure.busFee : 1000);
    setClassBusFee(initialFee);

    let cachedPins: Record<string, StudentHomePin> = {};
    try {
      const rawPins = localStorage.getItem(`nst_student_home_pins_${schoolId}`);
      if (rawPins) cachedPins = JSON.parse(rawPins) || {};
    } catch {}

    const defaultRouteName = routes[0]?.routeName || "";
    const initialMap: Record<string, any> = {};
    students.forEach(st => {
      const pinFallback = cachedPins[st.id];
      initialMap[st.id] = {
        usesBus: Boolean(st.usesBus),
        busRoute: st.busRoute || defaultRouteName,
        busStop: (st as any).busStop || "",
        busFee: st.busFee !== undefined ? Number(st.busFee) : initialFee,
        busNumber: st.busNumber || "",
        driverName: st.driverName || "",
        driverPhone: st.driverPhone || "",
        conductorName: st.conductorName || "",
        conductorPhone: st.conductorPhone || "",
        custom: st.busFee !== undefined && st.busFee !== initialFee,
        homeLat: st.homeLat ?? pinFallback?.homeLat,
        homeLng: st.homeLng ?? pinFallback?.homeLng,
        homeAddress: st.homeAddress || st.address || pinFallback?.homeAddress || "",
      };
    });
    setStudentBusMap(initialMap);
  }, [selectedClassId, classes, students, schoolId]);

  if (!isOpen) return null;

  const classStudents = students.filter(s => {
    if (!selectedClassId) return true;
    const sC = (s.classId || "").toLowerCase();
    const tC = selectedClassId.toLowerCase();
    return sC === tC || sC.startsWith(tC) || tC.startsWith(sC);
  });

  const filteredStudents = classStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.rollNo || "").toLowerCase().includes(q);
  });

  const findRouteMatch = (routeLabel: string) =>
    routes.find(
      (r) => r.routeName === routeLabel || r.id === routeLabel || r.routeCode === routeLabel
    );

  const toggleStudentBus = (studentId: string) => {
    setStudentBusMap(prev => {
      const defaultRoute = routes[0];
      const cur = prev[studentId] || {
        usesBus: false,
        busRoute: defaultRoute?.routeName || "",
        busFee: defaultRoute?.monthlyFee || classBusFee,
      };
      const nextUses = !cur.usesBus;
      const matched = findRouteMatch(cur.busRoute) || defaultRoute;
      return {
        ...prev,
        [studentId]: {
          ...cur,
          usesBus: nextUses,
          busRoute: cur.busRoute || matched?.routeName || "",
          busFee: cur.busFee || matched?.monthlyFee || classBusFee,
          busNumber: cur.busNumber || matched?.busNumber || "",
          driverName: cur.driverName || matched?.driverName || "",
          driverPhone: cur.driverPhone || matched?.driverPhone || "",
          conductorName: cur.conductorName || matched?.conductorName || "",
          conductorPhone: cur.conductorPhone || matched?.conductorPhone || "",
        },
      };
    });
  };

  const updateStudentRoute = (studentId: string, busRoute: string) => {
    const matched = findRouteMatch(busRoute);
    setStudentBusMap(prev => {
      const cur = prev[studentId] || { usesBus: true, busRoute, busFee: classBusFee };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          busRoute,
          busStop: matched?.stops?.[0]?.stopName || cur.busStop || "",
          busFee: matched && matched.monthlyFee > 0 ? matched.monthlyFee : cur.busFee,
          custom: matched && matched.monthlyFee > 0 ? true : cur.custom,
          busNumber: matched?.busNumber || cur.busNumber || "",
          driverName: matched?.driverName || cur.driverName || "",
          driverPhone: matched?.driverPhone || cur.driverPhone || "",
          conductorName: matched?.conductorName || cur.conductorName || "",
          conductorPhone: matched?.conductorPhone || cur.conductorPhone || "",
        },
      };
    });
  };

  const updateStudentStop = (studentId: string, busStop: string) => {
    setStudentBusMap(prev => {
      const cur = prev[studentId] || { usesBus: true, busRoute: "", busFee: classBusFee };
      return {
        ...prev,
        [studentId]: { ...cur, busStop },
      };
    });
  };

  const handleClassBusFeeChange = (newFee: number) => {
    setClassBusFee(newFee);
    setStudentBusMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(stId => {
        if (!next[stId].custom) {
          next[stId] = { ...next[stId], busFee: newFee };
        }
      });
      return next;
    });
  };

  const updateStudentFee = (studentId: string, feeStr: string) => {
    const feeNum = Number(feeStr) || 0;
    setStudentBusMap(prev => {
      const cur = prev[studentId] || { usesBus: true, busRoute: "", busFee: classBusFee };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          busFee: feeNum,
          custom: true,
        },
      };
    });
  };

  const handleSelectAll = (enable: boolean) => {
    const defaultRoute = routes[0];
    setStudentBusMap(prev => {
      const next = { ...prev };
      classStudents.forEach(st => {
        const prevItem = next[st.id];
        next[st.id] = {
          ...(prevItem || {}),
          usesBus: enable,
          busRoute: prevItem?.busRoute || defaultRoute?.routeName || "",
          busFee: prevItem?.busFee || defaultRoute?.monthlyFee || classBusFee,
          busNumber: prevItem?.busNumber || defaultRoute?.busNumber || "",
          driverName: prevItem?.driverName || defaultRoute?.driverName || "",
          driverPhone: prevItem?.driverPhone || defaultRoute?.driverPhone || "",
          conductorName: prevItem?.conductorName || defaultRoute?.conductorName || "",
          conductorPhone: prevItem?.conductorPhone || defaultRoute?.conductorPhone || "",
        };
      });
      return next;
    });
  };

  const applyStudentHomeCoords = (student: SchoolStudent, lat: number, lng: number, label?: string) => {
    setStudentBusMap((prev) => {
      const cur = prev[student.id] || { usesBus: true, busRoute: "", busFee: classBusFee };
      return {
        ...prev,
        [student.id]: {
          ...cur,
          usesBus: true,
          homeLat: lat,
          homeLng: lng,
          homeAddress: label ?? cur.homeAddress ?? student.address ?? "",
        },
      };
    });

    const pinRecord: StudentHomePin = {
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo,
      className: currentClass?.name || student.className || "",
      busRoute: studentBusMap[student.id]?.busRoute || student.busRoute || routes[0]?.routeName || "",
      homeLat: lat,
      homeLng: lng,
      homeAddress: label ?? student.address ?? "",
      updatedAt: new Date().toISOString(),
    };

    try {
      const key = `nst_student_home_pins_${schoolId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      existing[student.id] = pinRecord;
      localStorage.setItem(key, JSON.stringify(existing));
      if (rtdb && schoolId) {
        rtdbSet(dbRef(rtdb, `schools/${schoolId}/student_home_pins/${student.id}`), pinRecord).catch(() => {});
      }
    } catch {}

    setEditingPinStudentId(null);
    setPinInputText("");
    toast.success(`${student.name} ke ghar ka GPS pin (${lat.toFixed(4)}, ${lng.toFixed(4)}) save ho gaya!`);
  };

  const handleApplyPinLink = async (student: SchoolStudent) => {
    const parsed = await resolveGoogleMapsLocationInput(pinInputText);
    if (!parsed) {
      toast.error("Valid Google Maps link ya 'lat, lng' daalein (jaise: 28.4595, 77.0266)");
      return;
    }
    applyStudentHomeCoords(student, parsed.lat, parsed.lng);
  };

  const handleCaptureCurrentGpsForStudent = (student: SchoolStudent) => {
    if (!navigator.geolocation) {
      toast.error("Device me GPS supported nahi hai.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyStudentHomeCoords(
          student,
          Number(pos.coords.latitude.toFixed(6)),
          Number(pos.coords.longitude.toFixed(6))
        );
      },
      (err) => {
        toast.error(err?.message || "GPS location capture nahi ho saki.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSuccessMsg("");
    try {
      if (currentClass) {
        const curStruct = currentClass.feeStructure || {
          admissionFee: 65000,
          tuitionFee: Number(currentClass.defaultFee || 19140),
          cautionMoney: 60000,
          annualCharges: 23320,
          busFee: classBusFee,
        };
        await updateClassFeeStructure(schoolId, currentClass.id, {
          ...curStruct,
          busFee: Number(classBusFee) || 0,
        });
      }

      const promises: Promise<any>[] = [];
      const cachedPins: Record<string, StudentHomePin> = (() => {
        try {
          return JSON.parse(localStorage.getItem(`nst_student_home_pins_${schoolId}`) || "{}") || {};
        } catch {
          return {};
        }
      })();

      for (const st of classStudents) {
        const busState = studentBusMap[st.id];
        if (busState) {
          const matchedRoute = findRouteMatch(busState.busRoute);
          const updatePayload: any = {
            usesBus: Boolean(busState.usesBus),
            busRoute: busState.busRoute || matchedRoute?.routeName || "",
            busStop: busState.busStop || "",
            busFee: Number(busState.busFee || classBusFee),
            busNumber: busState.busNumber || matchedRoute?.busNumber || st.busNumber || "",
            driverName: busState.driverName || matchedRoute?.driverName || st.driverName || "",
            driverPhone: busState.driverPhone || matchedRoute?.driverPhone || st.driverPhone || "",
            conductorName: busState.conductorName || matchedRoute?.conductorName || st.conductorName || "",
            conductorPhone: busState.conductorPhone || matchedRoute?.conductorPhone || st.conductorPhone || "",
          };
          if (typeof busState.homeLat === "number" && typeof busState.homeLng === "number") {
            updatePayload.homeLat = busState.homeLat;
            updatePayload.homeLng = busState.homeLng;
            if (busState.homeAddress) updatePayload.homeAddress = busState.homeAddress;

            const pinRecord: StudentHomePin = {
              studentId: st.id,
              studentName: st.name,
              rollNo: st.rollNo,
              className: currentClass?.name || st.className || "",
              busRoute: updatePayload.busRoute,
              homeLat: busState.homeLat,
              homeLng: busState.homeLng,
              homeAddress: busState.homeAddress || st.address || "",
              updatedAt: new Date().toISOString(),
            };
            cachedPins[st.id] = pinRecord;
            if (rtdb && schoolId) {
              rtdbSet(dbRef(rtdb, `schools/${schoolId}/student_home_pins/${st.id}`), pinRecord).catch(() => {});
            }
          }
          promises.push(updateStudent(schoolId, st.id, updatePayload));
        }
      }
      try {
        localStorage.setItem(`nst_student_home_pins_${schoolId}`, JSON.stringify(cachedPins));
      } catch {}
      await Promise.all(promises);

      setSuccessMsg(`Bus Fee (₹${classBusFee}), Bus Roster, Driver Details aur Ghar GPS Pins save ho gaye!`);
      onUpdated();
      setTimeout(() => {
        setSuccessMsg("");
      }, 3500);
    } catch (err: any) {
      console.error("Error saving bus details:", err);
      toast.error("Bus settings save karne me error aaya: " + (err?.message || "Please retry"));
    } finally {
      setSaving(false);
    }
  };

  // ── Route Master Handlers ──
  const openNewRouteForm = () => {
    setEditingRouteId(null);
    setRName("");
    setRCode(`R-0${routes.length + 1}`);
    setRBusNumber("");
    setRDriverId(drivers[0]?.id || "");
    setRDriverName(drivers[0]?.name || "");
    setRDriverPhone(drivers[0]?.phone || "");
    setRConductorName(drivers[0]?.conductorName || "");
    setRConductorPhone(drivers[0]?.conductorPhone || "");
    setRMonthlyFee(classBusFee || 900);
    setRStops([
      { id: `stp_${Date.now()}_1`, stopName: "", pickupTime: "07:10", dropTime: "14:25", distanceKm: 5 },
      { id: `stp_${Date.now()}_2`, stopName: "School Main Gate", pickupTime: "07:50", dropTime: "13:55", distanceKm: 0 },
    ]);
    setShowRouteForm(true);
  };

  const openEditRouteForm = (r: SchoolBusRoute) => {
    setEditingRouteId(r.id);
    setRName(r.routeName);
    setRCode(r.routeCode || "");
    setRBusNumber(r.busNumber || "");
    setRDriverId(r.driverId || "");
    setRDriverName(r.driverName || "");
    setRDriverPhone(r.driverPhone || "");
    setRConductorName(r.conductorName || "");
    setRConductorPhone(r.conductorPhone || "");
    setRMonthlyFee(Number(r.monthlyFee || 0));
    setRStops(
      r.stops && r.stops.length > 0
        ? r.stops
        : [{ id: `stp_${Date.now()}`, stopName: "Main Chowk", pickupTime: "07:20", dropTime: "14:15", distanceKm: 3 }]
    );
    setShowRouteForm(true);
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName.trim() || !rBusNumber.trim()) {
      toast.error("Route Name aur Bus Number dono zaroori hain.");
      return;
    }
    const cleanStops = rStops.filter((s) => s.stopName.trim());
    if (cleanStops.length === 0) {
      toast.error("Kam se kam 1 Bus Stop add karein.");
      return;
    }
    const existing = routes.find((r) => r.id === editingRouteId);
    const routeObj: SchoolBusRoute = {
      id: editingRouteId || `route_${Date.now()}`,
      schoolId,
      routeName: rName.trim(),
      routeCode: rCode.trim() || `R-${routes.length + 1}`,
      busId: existing?.busId || `bus_${Date.now()}`,
      busNumber: rBusNumber.trim(),
      driverId: rDriverId || undefined,
      driverName: rDriverName.trim() || "Bus Driver",
      driverPhone: rDriverPhone.trim(),
      conductorName: rConductorName.trim(),
      conductorPhone: rConductorPhone.trim(),
      monthlyFee: Number(rMonthlyFee) || 0,
      stops: cleanStops.map((s) => ({ ...s, stopName: s.stopName.trim() })),
      active: true,
      updatedAt: new Date().toISOString(),
    };
    const next = await saveRouteRecord(schoolId, routeObj);
    setRoutes(next);
    setShowRouteForm(false);
    toast.success(`Route "${routeObj.routeName}" saved!`);
  };

  const handleDeleteRoute = async (routeId: string) => {
    const next = await deleteRouteRecord(schoolId, routeId);
    setRoutes(next);
    toast.success("Route deleted.");
  };

  // ── Driver Master Handlers ──
  const openNewDriverForm = () => {
    setEditingDriverId(null);
    setDName("");
    setDPhone("");
    setDLicenseNo("");
    setDLicenseExpiry("2028-12-31");
    setDAadhaar4("");
    setDConductorName("");
    setDConductorPhone("");
    setDBusNumber("");
    setDStatus("ACTIVE");
    setShowDriverForm(true);
  };

  const openEditDriverForm = (d: SchoolBusDriver) => {
    setEditingDriverId(d.id);
    setDName(d.name);
    setDPhone(d.phone);
    setDLicenseNo(d.licenseNo || "");
    setDLicenseExpiry(d.licenseExpiry || "2028-12-31");
    setDAadhaar4(d.aadhaarLast4 || "");
    setDConductorName(d.conductorName || "");
    setDConductorPhone(d.conductorPhone || "");
    setDBusNumber(d.assignedBusNumber || "");
    setDStatus(d.status || "ACTIVE");
    setShowDriverForm(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dName.trim() || !dPhone.trim()) {
      toast.error("Driver Name aur Mobile Number zaroori hain.");
      return;
    }
    const existing = drivers.find((d) => d.id === editingDriverId);
    const driverObj: SchoolBusDriver = {
      id: editingDriverId || `drv_${Date.now()}`,
      schoolId,
      name: dName.trim(),
      phone: dPhone.trim(),
      licenseNo: dLicenseNo.trim() || "PENDING",
      licenseExpiry: dLicenseExpiry || "2028-12-31",
      aadhaarLast4: dAadhaar4.trim().slice(-4),
      conductorName: dConductorName.trim(),
      conductorPhone: dConductorPhone.trim(),
      assignedBusId: existing?.assignedBusId,
      assignedBusNumber: dBusNumber.trim(),
      status: dStatus,
      updatedAt: new Date().toISOString(),
    };
    const next = await saveDriverRecord(schoolId, driverObj);
    setDrivers(next);
    setShowDriverForm(false);
    toast.success(`Driver "${driverObj.name}" saved!`);
  };

  const handleDeleteDriver = async (driverId: string) => {
    const next = await deleteDriverRecord(schoolId, driverId);
    setDrivers(next);
    toast.success("Driver deleted.");
  };

  const busCount = classStudents.filter(s => studentBusMap[s.id]?.usesBus).length;
  const totalBusRevenue = classStudents.reduce((sum, s) => {
    const info = studentBusMap[s.id];
    return sum + (info?.usesBus ? Number(info.busFee || classBusFee) : 0);
  }, 0);

  return (
    <div className={isEmbedded ? "w-full max-w-5xl mx-auto my-2" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"}>
      <div className={`bg-white dark:bg-slate-900 rounded-3xl w-full ${isEmbedded ? "max-w-5xl shadow-xl" : "max-w-4xl my-4 max-h-[92vh] shadow-2xl"} border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-800 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                Transport, Driver &amp; Route Manager
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-300 text-slate-950 uppercase">
                  {routes.length} Routes · {drivers.length} Drivers
                </span>
              </h2>
              <p className="text-xs text-teal-100">
                Routes, Stops, Drivers aur Student Bus Roster ek hi jagah manage karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: "students", label: "1. Student Bus Roster", icon: Users, activeCls: "bg-teal-700 text-white shadow-sm" },
            { id: "routes", label: `2. Routes & Stops (${routes.length})`, icon: RouteIcon, activeCls: "bg-indigo-600 text-white shadow-sm" },
            { id: "drivers", label: `3. Drivers Directory (${drivers.length})`, icon: UserCheck, activeCls: "bg-violet-600 text-white shadow-sm" },
            { id: "live_radar", label: "4. Live Bus Radar", icon: MapPin, activeCls: "bg-amber-600 text-white shadow-sm" },
            { id: "driver_console", label: "5. Driver Console", icon: Bus, activeCls: "bg-emerald-600 text-white shadow-sm" },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveViewTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeViewTab === tab.id
                    ? tab.activeCls
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 4: LIVE RADAR */}
        {activeViewTab === "live_radar" && (
          <div className="p-4 flex-1 overflow-y-auto">
            <AdminBusFleetRadar
              school={{ id: schoolId, name: schoolName || "Institutional Campus", code: schoolCode } as any}
              onOpenDriverConsole={() => setActiveViewTab("driver_console")}
            />
          </div>
        )}

        {/* TAB 5: DRIVER CONSOLE */}
        {activeViewTab === "driver_console" && (
          <div className="flex-1 overflow-y-auto">
            <DriverTripConsole
              school={{ id: schoolId, name: schoolName || "Institutional Campus", code: schoolCode } as any}
              onBack={() => setActiveViewTab("live_radar")}
            />
          </div>
        )}

        {/* TAB 2: ROUTES & STOPS MASTER */}
        {activeViewTab === "routes" && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  School Bus Routes, Stops &amp; Timings Master
                </h3>
                <p className="text-xs text-slate-500">
                  Yahan banaye gaye routes aur monthly fee Admission Form aur Student Bus Roster me automatically dikhenge
                </p>
              </div>
              <button
                type="button"
                onClick={openNewRouteForm}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus size={14} /> Add New Route &amp; Stops
              </button>
            </div>

            {showRouteForm && (
              <form
                onSubmit={handleSaveRoute}
                className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase text-indigo-800 dark:text-indigo-300">
                    {editingRouteId ? "Edit Route & Stops" : "Create New Bus Route"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowRouteForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Route Name *</label>
                    <input
                      type="text"
                      required
                      value={rName}
                      onChange={(e) => setRName(e.target.value)}
                      placeholder="e.g. Route 4 — Green Valley to Campus"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Route Code &amp; Fee (₹/mo)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={rCode}
                        onChange={(e) => setRCode(e.target.value)}
                        placeholder="R-04"
                        className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                      />
                      <input
                        type="number"
                        value={rMonthlyFee}
                        onChange={(e) => setRMonthlyFee(Number(e.target.value) || 0)}
                        placeholder="₹900"
                        className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assigned Bus / Vehicle *</label>
                    <input
                      type="text"
                      required
                      value={rBusNumber}
                      onChange={(e) => setRBusNumber(e.target.value)}
                      placeholder="e.g. Bus #04 (UP-16-AB-9921)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Registered Driver</label>
                    <select
                      value={rDriverId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setRDriverId(id);
                        const d = drivers.find((x) => x.id === id);
                        if (d) {
                          setRDriverName(d.name);
                          setRDriverPhone(d.phone);
                          if (d.conductorName) setRConductorName(d.conductorName);
                          if (d.conductorPhone) setRConductorPhone(d.conductorPhone);
                          if (d.assignedBusNumber && !rBusNumber) setRBusNumber(d.assignedBusNumber);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="">-- Custom / Manual Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Driver Name &amp; Phone</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={rDriverName}
                        onChange={(e) => setRDriverName(e.target.value)}
                        placeholder="Driver Name"
                        className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      <input
                        type="tel"
                        value={rDriverPhone}
                        onChange={(e) => setRDriverPhone(e.target.value)}
                        placeholder="Mobile"
                        className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Conductor / Helper Name</label>
                    <input
                      type="text"
                      value={rConductorName}
                      onChange={(e) => setRConductorName(e.target.value)}
                      placeholder="Conductor Name (Optional)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Conductor Phone</label>
                    <input
                      type="tel"
                      value={rConductorPhone}
                      onChange={(e) => setRConductorPhone(e.target.value)}
                      placeholder="Helper Mobile"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Stops Editor */}
                <div className="space-y-2 pt-2 border-t border-indigo-200 dark:border-indigo-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      Route Stops &amp; Pickup/Drop Timings ({rStops.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRStops((prev) => [
                          ...prev,
                          {
                            id: `stp_${Date.now()}`,
                            stopName: "",
                            pickupTime: "07:25",
                            dropTime: "14:15",
                            distanceKm: 2,
                          },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Stop
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {rStops.map((st, idx) => (
                      <div key={st.id} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                        <span className="col-span-1 text-center font-mono font-bold text-slate-500">#{idx + 1}</span>
                        <input
                          type="text"
                          value={st.stopName}
                          onChange={(e) =>
                            setRStops((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, stopName: e.target.value } : x))
                            )
                          }
                          placeholder="Stop Name (e.g. Central Chowk)"
                          className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <input
                          type="time"
                          value={st.pickupTime}
                          onChange={(e) =>
                            setRStops((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, pickupTime: e.target.value } : x))
                            )
                          }
                          title="Pickup Time"
                          className="col-span-2 px-1.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                        <input
                          type="time"
                          value={st.dropTime}
                          onChange={(e) =>
                            setRStops((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, dropTime: e.target.value } : x))
                            )
                          }
                          title="Drop Time"
                          className="col-span-2 px-1.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setRStops((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={rStops.length <= 1}
                          className="col-span-2 px-2 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-600 disabled:opacity-30 font-bold cursor-pointer flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRouteForm(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} /> Save Route &amp; Sync Fleet
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {routes.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {r.routeCode || "ROUTE"}
                        </span>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{r.routeName}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.busNumber} · Fee: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">₹{r.monthlyFee}/mo</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditRouteForm(r)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                        title="Edit Route"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoute(r.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Delete Route"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Driver: <strong>{r.driverName}</strong> ({r.driverPhone || "N/A"})</span>
                    {r.conductorName && <span>Helper: {r.conductorName}</span>}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {r.stops.map((s, idx) => (
                      <div key={s.id || idx} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {idx + 1}. {s.stopName}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums">
                          Pick {s.pickupTime || "—"} · Drop {s.dropTime || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {routes.length === 0 && (
                <div className="md:col-span-2 p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                  Abhi koi route add nahi hua hai. "+ Add New Route & Stops" par click karke pehla route banayein.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DRIVERS DIRECTORY */}
        {activeViewTab === "drivers" && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Verified Bus Drivers &amp; Conductors Directory
                </h3>
                <p className="text-xs text-slate-500">
                  Drivers ke Driving License, Aadhaar verification, Phone aur QR ID Cards manage karein
                </p>
              </div>
              <button
                type="button"
                onClick={openNewDriverForm}
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus size={14} /> Add New Driver
              </button>
            </div>

            {showDriverForm && (
              <form
                onSubmit={handleSaveDriver}
                className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/25 border border-violet-200 dark:border-violet-800 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black uppercase text-violet-800 dark:text-violet-300">
                    {editingDriverId ? "Edit Driver Profile" : "Register New Driver & Conductor"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowDriverForm(false)}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Driver Full Name *</label>
                    <input
                      type="text"
                      required
                      value={dName}
                      onChange={(e) => setDName(e.target.value)}
                      placeholder="e.g. Rajesh Yadav"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Driver Mobile *</label>
                    <input
                      type="tel"
                      required
                      value={dPhone}
                      onChange={(e) => setDPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Driving License No.</label>
                    <input
                      type="text"
                      value={dLicenseNo}
                      onChange={(e) => setDLicenseNo(e.target.value)}
                      placeholder="e.g. DL-04-2020001928"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">License Expiry Date</label>
                    <input
                      type="date"
                      value={dLicenseExpiry}
                      onChange={(e) => setDLicenseExpiry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Aadhaar Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={dAadhaar4}
                      onChange={(e) => setDAadhaar4(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 4821"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assigned Bus Number</label>
                    <input
                      type="text"
                      value={dBusNumber}
                      onChange={(e) => setDBusNumber(e.target.value)}
                      placeholder="e.g. Bus #01 (DL-1PC-4521)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Conductor / Helper Name</label>
                    <input
                      type="text"
                      value={dConductorName}
                      onChange={(e) => setDConductorName(e.target.value)}
                      placeholder="Helper Name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Conductor Phone</label>
                    <input
                      type="tel"
                      value={dConductorPhone}
                      onChange={(e) => setDConductorPhone(e.target.value)}
                      placeholder="Helper Mobile"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Duty Status</label>
                    <select
                      value={dStatus}
                      onChange={(e) => setDStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                    >
                      <option value="ACTIVE">ACTIVE (On Duty)</option>
                      <option value="ON_LEAVE">ON LEAVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDriverForm(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} /> Save Driver Profile
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {drivers.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{d.name}</h4>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            d.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {d.phone} {d.assignedBusNumber ? `· ${d.assignedBusNumber}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setDriverIdCardData({
                            busId: d.assignedBusId || d.id,
                            busNumber: d.assignedBusNumber || "School Bus",
                            route:
                              routes.find((r) => r.driverId === d.id || r.driverName === d.name)?.routeName ||
                              "Assigned Campus Route",
                            driverName: d.name,
                            driverPhone: d.phone,
                          })
                        }
                        className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 cursor-pointer"
                        title="Driver QR ID Card"
                      >
                        <QrCode size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditDriverForm(d)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Edit Driver"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDriver(d.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 cursor-pointer"
                        title="Delete Driver"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span>DL: <strong className="font-mono text-slate-800 dark:text-slate-200">{d.licenseNo}</strong> (Exp: {d.licenseExpiry})</span>
                    {d.aadhaarLast4 && <span>Aadhaar: XXXX-{d.aadhaarLast4}</span>}
                    {d.conductorName && <span>Helper: {d.conductorName} ({d.conductorPhone || "—"})</span>}
                  </div>
                </div>
              ))}
              {drivers.length === 0 && (
                <div className="md:col-span-2 p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                  Abhi koi driver registered nahi hai. "+ Add New Driver" button par click karein.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: STUDENT BUS ROSTER */}
        {activeViewTab === "students" && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Section 1: Class Selector & Class Bus Fee Setting */}
            <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-3">
              <span className="text-[11px] font-black uppercase text-teal-800 dark:text-teal-300 tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-600" />
                1. Class &amp; Default Bus Fee Setting:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Class Chunein:
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Is Class Ki Monthly Bus Fee (₹):
                    </label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">Route Fee Auto-Syncs</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    {[0, 500, 800, 1000, 1200, 1500, 2000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleClassBusFeeChange(amt)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                          classBusFee === amt
                            ? "bg-teal-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={classBusFee}
                      onChange={e => handleClassBusFeeChange(Number(e.target.value) || 0)}
                      placeholder="e.g. 800 ya 1200"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Student Bus Roster */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Bus className="w-4 h-4 text-teal-600" />
                    2. Students Ko Bus Route &amp; Stop Assign Karein:
                  </h4>
                  <p className="text-xs text-slate-500">
                    {busCount} of {classStudents.length} bache bus se ja rahe hain · Expected Bus Fee: <strong>₹{totalBusRevenue.toLocaleString("en-IN")}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveViewTab("routes")}
                    className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 text-[11px] font-bold cursor-pointer"
                  >
                    + Manage Routes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 text-[11px] font-bold cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Student name ya roll no se filter karein..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white"
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                {filteredStudents.map(st => {
                  const busInfo = studentBusMap[st.id] || { usesBus: false, busRoute: "", busFee: classBusFee };
                  const isBusActive = Boolean(busInfo.usesBus);
                  const hasPin = Number.isFinite(busInfo.homeLat) && Number.isFinite(busInfo.homeLng);
                  const isEditingPin = editingPinStudentId === st.id;
                  const matchedRoute = findRouteMatch(busInfo.busRoute);

                  return (
                    <div
                      key={st.id}
                      className={`p-3 flex flex-col gap-2 transition ${
                        isBusActive ? "bg-teal-50/40 dark:bg-teal-950/20" : ""
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleStudentBus(st.id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer shrink-0 ${
                              isBusActive
                                ? "bg-teal-600 text-white shadow-xs"
                                : "border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            }`}
                            title={isBusActive ? "Bus Band Karein" : "Bus Shuru Karein"}
                          >
                            {isBusActive && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-sm text-slate-900 dark:text-white">
                                {st.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Roll {st.rollNo}
                              </span>
                              {hasPin && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                  Home Pin Saved
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {isBusActive ? (
                                <span className="text-teal-700 dark:text-teal-300 font-bold">
                                  Bus Active (+₹{Number(busInfo.busFee || classBusFee).toLocaleString("en-IN")})
                                  {busInfo.driverName ? ` · Driver: ${busInfo.driverName}` : ""}
                                </span>
                              ) : (
                                <span className="text-slate-400">Bus Se Nahi Jata (Normal)</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {isBusActive && (
                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                            {routes.length > 0 ? (
                              <select
                                value={matchedRoute ? matchedRoute.routeName : "__custom__"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "__custom__") updateStudentRoute(st.id, "");
                                  else updateStudentRoute(st.id, val);
                                }}
                                className="w-40 px-2 py-1 text-xs font-semibold rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              >
                                {routes.map((r) => (
                                  <option key={r.id} value={r.routeName}>
                                    {r.routeCode ? `${r.routeCode}: ` : ""}{r.routeName} (₹{r.monthlyFee})
                                  </option>
                                ))}
                                <option value="__custom__">+ Custom Route/Stop</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Route/Stop"
                                value={busInfo.busRoute}
                                onChange={e => updateStudentRoute(st.id, e.target.value)}
                                className="w-32 px-2 py-1 text-xs font-semibold rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            )}

                            {matchedRoute && matchedRoute.stops.length > 0 && (
                              <select
                                value={busInfo.busStop || ""}
                                onChange={(e) => updateStudentStop(st.id, e.target.value)}
                                className="w-32 px-2 py-1 text-xs font-semibold rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              >
                                <option value="">Select Stop</option>
                                {matchedRoute.stops.map((sp) => (
                                  <option key={sp.id} value={sp.stopName}>
                                    {sp.stopName} ({sp.pickupTime})
                                  </option>
                                ))}
                              </select>
                            )}

                            {!matchedRoute && routes.length > 0 && (
                              <input
                                type="text"
                                placeholder="Custom Route/Stop"
                                value={busInfo.busRoute}
                                onChange={e => updateStudentRoute(st.id, e.target.value)}
                                className="w-28 px-2 py-1 text-xs font-semibold rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            )}

                            <div className="w-20">
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                                <input
                                  type="number"
                                  placeholder="Fee"
                                  value={busInfo.busFee}
                                  onChange={e => updateStudentFee(st.id, e.target.value)}
                                  className="w-full pl-4 pr-1 py-1 text-right text-xs font-black rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 tabular-nums"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPinStudentId(isEditingPin ? null : st.id);
                                setPinInputText(
                                  hasPin ? `${busInfo.homeLat}, ${busInfo.homeLng}` : ""
                                );
                              }}
                              className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer border transition ${
                                hasPin
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400/50 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-400/50 text-amber-700 dark:text-amber-300"
                              }`}
                              title="Ghar ka GPS Location save karein"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{hasPin ? "Update Pin" : "Set Home Pin"}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {isBusActive && isEditingPin && (
                        <div className="mt-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={pinInputText}
                            onChange={(e) => setPinInputText(e.target.value)}
                            placeholder="Google Maps link paste karein ya lat,lng (e.g. 28.4595, 77.0266)"
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-white"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyPinLink(st)}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Link2 className="w-3 h-3" /> Save Link
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCaptureCurrentGpsForStudent(st)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Crosshair className="w-3 h-3" /> My GPS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Koi student nahi mila.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {activeViewTab === "students" && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-teal-700/20 flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Changes..." : "Save Bus Settings & Apply to Fee Slip"}</span>
            </button>
          </div>
        )}
      </div>

      {driverIdCardData && (
        <DriverIdCardModal
          isOpen={true}
          onClose={() => setDriverIdCardData(null)}
          school={{ id: schoolId, name: schoolName || "School", code: schoolCode } as any}
          driver={driverIdCardData}
        />
      )}
    </div>
  );
};
