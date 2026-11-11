// @ts-nocheck
import React, { useState } from "react";
import {
  Bus,
  Fuel,
  Gauge,
  Calendar,
  AlertTriangle,
  Plus,
  Clock,
  Printer,
  X,
  FileCheck,
  CheckCircle2,
  TrendingUp,
  IndianRupee,
  Phone,
  ShieldAlert,
  Share2
} from "lucide-react";
import type { School, VehicleFuelLog, VehicleFitnessRecord } from "../../school-types";

interface Props {
  school: School;
  onClose: () => void;
}

const DEFAULT_FITNESS_RECORDS: VehicleFitnessRecord[] = [
  {
    id: "fit_bus1",
    schoolId: "demo_school",
    vehicleNumber: "DL 01 AB 1234 (Bus #1)",
    model: "Tata Starbus 42 Seater",
    driverName: "Sanjay Kumar",
    driverPhone: "+91 98765 33001",
    fitnessExpiryDate: "2027-04-15",
    insuranceExpiryDate: "2026-11-28", // Expiring soon in ~18 days!
    pollutionPucExpiryDate: "2026-12-10",
    roadTaxExpiryDate: "2027-03-31",
    permitExpiryDate: "2028-05-20",
  },
  {
    id: "fit_bus2",
    schoolId: "demo_school",
    vehicleNumber: "DL 01 CD 5678 (Bus #2)",
    model: "Ashok Leyland 50 Seater",
    driverName: "Rameshwar Yadav",
    driverPhone: "+91 98765 33002",
    fitnessExpiryDate: "2026-11-05", // EXPIRED 5 days ago!
    insuranceExpiryDate: "2027-02-14",
    pollutionPucExpiryDate: "2027-01-20",
    roadTaxExpiryDate: "2027-03-31",
    permitExpiryDate: "2027-09-15",
  },
  {
    id: "fit_van1",
    schoolId: "demo_school",
    vehicleNumber: "DL 02 EF 9012 (Van #1)",
    model: "Force Traveller 24 Seater",
    driverName: "Kuldeep Sharma",
    driverPhone: "+91 98765 33003",
    fitnessExpiryDate: "2027-06-30",
    insuranceExpiryDate: "2027-08-15",
    pollutionPucExpiryDate: "2026-11-20", // Expiring soon in 10 days!
    roadTaxExpiryDate: "2027-03-31",
    permitExpiryDate: "2028-11-10",
  },
];

const DEFAULT_FUEL_LOGS: VehicleFuelLog[] = [
  {
    id: "fuel_1",
    schoolId: "demo_school",
    vehicleNumber: "DL 01 AB 1234 (Bus #1)",
    date: "2026-11-10",
    fuelType: "DIESEL",
    quantityUnits: 45,
    ratePerUnit: 92.5,
    totalAmount: 4162.5,
    odometerStartKm: 42150,
    odometerEndKm: 42330,
    totalKmDriven: 180,
    mileageKmPerUnit: 4.0,
    driverName: "Sanjay Kumar",
    pumpName: "Indian Oil Petrol Pump, NH-48",
    receiptNumber: "IOC-88421",
  },
  {
    id: "fuel_2",
    schoolId: "demo_school",
    vehicleNumber: "DL 01 CD 5678 (Bus #2)",
    date: "2026-11-09",
    fuelType: "DIESEL",
    quantityUnits: 50,
    ratePerUnit: 92.5,
    totalAmount: 4625.0,
    odometerStartKm: 58200,
    odometerEndKm: 58410,
    totalKmDriven: 210,
    mileageKmPerUnit: 4.2,
    driverName: "Rameshwar Yadav",
    pumpName: "Bharat Petroleum Highway",
    receiptNumber: "BP-9014",
  },
  {
    id: "fuel_3",
    schoolId: "demo_school",
    vehicleNumber: "DL 02 EF 9012 (Van #1)",
    date: "2026-11-08",
    fuelType: "CNG",
    quantityUnits: 18,
    ratePerUnit: 78.0,
    totalAmount: 1404.0,
    odometerStartKm: 31200,
    odometerEndKm: 31340,
    totalKmDriven: 140,
    mileageKmPerUnit: 7.77,
    driverName: "Kuldeep Sharma",
    pumpName: "IGL CNG Station Sector 4",
    receiptNumber: "IGL-332",
  },
];

export const BusFleetLogbookModal: React.FC<Props> = ({ school, onClose }) => {
  const [activeTab, setActiveTab] = useState<"fitness" | "fuel">("fitness");
  const isDemo = Boolean(school?.id && (school.id === "demo_school" || school.id.startsWith("demo_")));

  const [fitnessRecords, setFitnessRecords] = useState<VehicleFitnessRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`bus_fitness_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return isDemo ? DEFAULT_FITNESS_RECORDS : [];
  });

  const [fuelLogs, setFuelLogs] = useState<VehicleFuelLog[]>(() => {
    try {
      const saved = localStorage.getItem(`bus_fuel_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return isDemo ? DEFAULT_FUEL_LOGS : [];
  });

  // New Fuel Log Form
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [fuelVehicle, setFuelVehicle] = useState(fitnessRecords[0]?.vehicleNumber || "");
  const [fuelDate, setFuelDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [fuelType, setFuelType] = useState<"DIESEL" | "CNG" | "PETROL">("DIESEL");
  const [fuelQuantity, setFuelQuantity] = useState(40);
  const [fuelRate, setFuelRate] = useState(92.5);
  const [startKm, setStartKm] = useState(42330);
  const [endKm, setEndKm] = useState(42510);
  const [driverName, setDriverName] = useState("Sanjay Kumar");
  const [receiptNumber, setReceiptNumber] = useState("");

  const saveFuelLogs = (updated: VehicleFuelLog[]) => {
    setFuelLogs(updated);
    try {
      localStorage.setItem(`bus_fuel_${school?.id || "demo"}`, JSON.stringify(updated));
    } catch {}
  };

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const driven = Math.max(0, endKm - startKm);
    const calculatedMileage = fuelQuantity > 0 ? Number((driven / fuelQuantity).toFixed(2)) : 0;
    const totalCost = Number((fuelQuantity * fuelRate).toFixed(2));

    const newLog: VehicleFuelLog = {
      id: `fuel_${Date.now()}`,
      schoolId: school.id,
      vehicleNumber: fuelVehicle,
      date: fuelDate,
      fuelType,
      quantityUnits: Number(fuelQuantity),
      ratePerUnit: Number(fuelRate),
      totalAmount: totalCost,
      odometerStartKm: Number(startKm),
      odometerEndKm: Number(endKm),
      totalKmDriven: driven,
      mileageKmPerUnit: calculatedMileage,
      driverName,
      receiptNumber: receiptNumber.trim() || `RCP-${Date.now().toString().slice(-4)}`,
    };

    saveFuelLogs([newLog, ...fuelLogs]);
    setShowAddFuelModal(false);
  };

  // Helper to compute expiry days
  const getExpiryStatus = (dateStr: string) => {
    if (!dateStr) return { days: 999, label: "Not Set", color: "text-slate-400 bg-slate-800" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, label: `🔴 EXPIRED (${Math.abs(diffDays)}d ago)`, color: "text-rose-300 bg-rose-500/20 border-rose-500/40" };
    }
    if (diffDays <= 30) {
      return { days: diffDays, label: `⚠️ ${diffDays} days left`, color: "text-amber-300 bg-amber-500/20 border-amber-500/40 animate-pulse" };
    }
    return { days: diffDays, label: `✓ Valid (${diffDays}d)`, color: "text-emerald-300 bg-emerald-500/20 border-emerald-500/40" };
  };

  const totalFuelCost = fuelLogs.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalKmDriven = fuelLogs.reduce((sum, l) => sum + l.totalKmDriven, 0);
  const avgMileage = totalKmDriven > 0 && fuelLogs.reduce((sum, l) => sum + l.quantityUnits, 0) > 0
    ? (totalKmDriven / fuelLogs.reduce((sum, l) => sum + l.quantityUnits, 0)).toFixed(1)
    : "4.5";

  const handleSendRenewalAlert = (bus: VehicleFitnessRecord, docName: string, expiryDate: string) => {
    const msg = `🚨 *URGENT TRANSPORT DOCUMENT RENEWAL ALERT*\nSchool: ${school?.name || "School"}\nVehicle: ${bus.vehicleNumber}\nDocument: ${docName}\nExpiry Date: ${expiryDate}\nPlease renew immediately with RTO / Insurance Company to prevent traffic fines or route stoppage.\n- Admin Office`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">
                  Bus Fleet Fuel, Mileage &amp; Fitness Logbook
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  RTO &amp; Fuel Compliance
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                RTO Fitness &amp; Insurance expiry countdown, daily diesel/CNG mileage &amp; fuel costs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "fuel" && (
              <button
                type="button"
                onClick={() => setShowAddFuelModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Log Fuel Entry</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fleet KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Fleet</span>
            <span className="text-xl font-black text-white">{fitnessRecords.length} Buses/Vans</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30">
            <span className="text-[10px] text-emerald-300 uppercase font-bold block">Total Fuel Expense</span>
            <span className="text-xl font-black text-emerald-300">₹{totalFuelCost.toLocaleString("en-IN")}</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/30">
            <span className="text-[10px] text-indigo-300 uppercase font-bold block">Total Distance Run</span>
            <span className="text-xl font-black text-indigo-300">{totalKmDriven} KM</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/30">
            <span className="text-[10px] text-amber-300 uppercase font-bold block">Average Mileage</span>
            <span className="text-xl font-black text-amber-300">{avgMileage} KM / L</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("fitness")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === "fitness"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>RTO Fitness &amp; Document Expiry Alarms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fuel")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === "fuel"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            <Fuel className="w-4 h-4" />
            <span>Daily Fuel &amp; Mileage Logbook ({fuelLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: RTO FITNESS & DOCUMENT EXPIRY */}
        {activeTab === "fitness" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fitnessRecords.map((bus) => {
                const fitStatus = getExpiryStatus(bus.fitnessExpiryDate);
                const insStatus = getExpiryStatus(bus.insuranceExpiryDate);
                const pucStatus = getExpiryStatus(bus.pollutionPucExpiryDate);
                const taxStatus = getExpiryStatus(bus.roadTaxExpiryDate);

                return (
                  <div key={bus.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-sm text-white">{bus.vehicleNumber}</h4>
                        <p className="text-[11px] text-slate-400">{bus.model}</p>
                      </div>
                      <span className="p-2 rounded-xl bg-slate-900 text-amber-400">
                        <Bus className="w-4 h-4" />
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 pt-1 border-t border-slate-800">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Driver: {bus.driverName} ({bus.driverPhone})</span>
                    </p>

                    <div className="space-y-2 text-xs pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">RTO Fitness:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${fitStatus.color}`}>
                          {fitStatus.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vehicle Insurance:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${insStatus.color}`}>
                          {insStatus.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pollution (PUC):</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${pucStatus.color}`}>
                          {pucStatus.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Road Tax Expiry:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${taxStatus.color}`}>
                          {taxStatus.label}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleSendRenewalAlert(bus, "Fitness / Insurance", bus.insuranceExpiryDate)}
                        className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-slate-950 font-black text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Expiry Alert</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: FUEL & MILEAGE LOGBOOK */}
        {activeTab === "fuel" && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Fuel Type</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                    <th className="py-2.5 px-3 text-center">KM Run</th>
                    <th className="py-2.5 px-3 text-center">Mileage</th>
                    <th className="py-2.5 px-3">Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {fuelLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-bold text-slate-300">{log.date}</td>
                      <td className="py-3 px-3 font-bold text-white">{log.vehicleNumber}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${log.fuelType === "CNG" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                          {log.fuelType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">{log.quantityUnits} {log.fuelType === "CNG" ? "Kg" : "L"}</td>
                      <td className="py-3 px-3 text-right text-slate-400">₹{log.ratePerUnit}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-400">₹{log.totalAmount.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-300">{log.totalKmDriven} KM</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-black text-[11px]">
                          {log.mileageKmPerUnit} KM/L
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{log.driverName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADD FUEL MODAL */}
        {showAddFuelModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-amber-400" />
                  <span>Log Daily Fuel &amp; Mileage</span>
                </h3>
                <button onClick={() => setShowAddFuelModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddFuel} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Select Vehicle</label>
                  <select
                    value={fuelVehicle}
                    onChange={(e) => setFuelVehicle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    {fitnessRecords.map((b) => (
                      <option key={b.id} value={b.vehicleNumber}>{b.vehicleNumber}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Date</label>
                    <input
                      type="date"
                      value={fuelDate}
                      onChange={(e) => setFuelDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Fuel Type</label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value="DIESEL">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="PETROL">Petrol</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Quantity (Liters / Kg)</label>
                    <input
                      type="number"
                      value={fuelQuantity}
                      onChange={(e) => setFuelQuantity(Number(e.target.value))}
                      step={0.5}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Rate (₹ per Unit)</label>
                    <input
                      type="number"
                      value={fuelRate}
                      onChange={(e) => setFuelRate(Number(e.target.value))}
                      step={0.5}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Start Odometer KM</label>
                    <input
                      type="number"
                      value={startKm}
                      onChange={(e) => setStartKm(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">End Odometer KM</label>
                    <input
                      type="number"
                      value={endKm}
                      onChange={(e) => setEndKm(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Driver Name</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Pump Slip No</label>
                    <input
                      type="text"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="e.g. SLIP-892"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddFuelModal(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer">
                    Save Fuel Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
