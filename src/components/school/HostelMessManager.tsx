// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Home,
  Bed,
  Utensils,
  ClipboardList,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Calendar,
  AlertTriangle,
  IndianRupee,
  Search,
  Printer,
  X,
  Sparkles,
  ShieldCheck,
  Moon
} from "lucide-react";
import type {
  School,
  HostelBuilding,
  HostelRoom,
  HostelBedAllocation,
  MessMenuDay,
  HostelAttendanceRecord,
  SchoolStudent,
  SchoolClass
} from "../../school-types";
import {
  loadSchoolSubcollection,
  syncSchoolSubcollection,
  loadSchoolSettingBlob,
  saveSchoolSettingBlob
} from "../../utils/schoolCloudSync";
import { printElementInIframe } from "./AdmissionFormPrintModal";

interface Props {
  school: School;
  students?: SchoolStudent[];
  classes?: SchoolClass[];
  onBack?: () => void;
}

const DEFAULT_BUILDINGS: HostelBuilding[] = [
  {
    id: "bld_aryabhata",
    schoolId: "demo_school",
    name: "Aryabhata Boys Hostel (Block A)",
    type: "BOYS",
    wardenName: "Mr. Rajeev Nambiar",
    wardenPhone: "+91 98765 22001",
    totalRooms: 24,
    floors: 3,
  },
  {
    id: "bld_gargi",
    schoolId: "demo_school",
    name: "Gargi Girls Hostel (Block B)",
    type: "GIRLS",
    wardenName: "Mrs. Meenakshi Soni",
    wardenPhone: "+91 98765 22002",
    totalRooms: 18,
    floors: 2,
  },
];

const DEFAULT_ROOMS: HostelRoom[] = [
  { id: "rm_101", schoolId: "demo_school", buildingId: "bld_aryabhata", roomNumber: "A-101", floor: 1, capacity: 4, monthlyRent: 4500 },
  { id: "rm_102", schoolId: "demo_school", buildingId: "bld_aryabhata", roomNumber: "A-102", floor: 1, capacity: 4, monthlyRent: 4500 },
  { id: "rm_201", schoolId: "demo_school", buildingId: "bld_aryabhata", roomNumber: "A-201", floor: 2, capacity: 3, monthlyRent: 5000 },
  { id: "rm_g101", schoolId: "demo_school", buildingId: "bld_gargi", roomNumber: "B-101", floor: 1, capacity: 3, monthlyRent: 4800 },
  { id: "rm_g102", schoolId: "demo_school", buildingId: "bld_gargi", roomNumber: "B-102", floor: 1, capacity: 4, monthlyRent: 4500 },
];

const DEFAULT_ALLOCATIONS: HostelBedAllocation[] = [
  {
    id: "alloc_1",
    schoolId: "demo_school",
    buildingId: "bld_aryabhata",
    buildingName: "Aryabhata Boys Hostel",
    roomId: "rm_101",
    roomNumber: "A-101",
    bedNumber: "Bed #1",
    studentId: "std_101",
    studentName: "Aman Kumar Verma",
    className: "Class 10-A",
    allocatedAt: "2026-04-05",
    monthlyFee: 4500,
    guardianPhone: "+91 98765 11223",
    status: "OCCUPIED",
  },
  {
    id: "alloc_2",
    schoolId: "demo_school",
    buildingId: "bld_aryabhata",
    buildingName: "Aryabhata Boys Hostel",
    roomId: "rm_101",
    roomNumber: "A-101",
    bedNumber: "Bed #2",
    studentId: "std_102",
    studentName: "Devansh Rathore",
    className: "Class 10-B",
    allocatedAt: "2026-04-06",
    monthlyFee: 4500,
    guardianPhone: "+91 98765 11224",
    status: "OCCUPIED",
  },
  {
    id: "alloc_3",
    schoolId: "demo_school",
    buildingId: "bld_gargi",
    buildingName: "Gargi Girls Hostel",
    roomId: "rm_g101",
    roomNumber: "B-101",
    bedNumber: "Bed #1",
    studentId: "std_201",
    studentName: "Pooja Sharma",
    className: "Class 9-A",
    allocatedAt: "2026-04-05",
    monthlyFee: 4800,
    guardianPhone: "+91 98765 11225",
    status: "OCCUPIED",
  },
];

const DEFAULT_MESS_MENU: MessMenuDay[] = [
  { day: "Monday", breakfast: "Aloo Paratha + Curd + Tea/Milk", lunch: "Rajma Masala + Jeera Rice + Chapati + Salad", eveningSnacks: "Veg Cutlet / Biscuits + Tea", dinner: "Paneer Butter Masala + Roti + Dal Tadka + Kheer", specialDiet: "Boiled Egg (Optional)" },
  { day: "Tuesday", breakfast: "Poha + Jalebi / Sprouted Chana + Milk", lunch: "Kadhi Pakora + Steamed Rice + Roti + Aloo Gobi", eveningSnacks: "Samosa + Green Chutney + Tea", dinner: "Mix Veg + Dal Makhani + Butter Roti + Gulab Jamun" },
  { day: "Wednesday", breakfast: "Idli Sambhar + Coconut Chutney + Milk", lunch: "Chole Bhature / Chole Chawal + Boondi Raita", eveningSnacks: "Sweet Corn Chaat + Tea", dinner: "Egg Curry / Shahi Paneer + Roti + Jeera Pulao" },
  { day: "Thursday", breakfast: "Stuffed Onion Paratha + Pickle + Milk", lunch: "Yellow Dal Fry + Rice + Seasonal Bhindi + Salad", eveningSnacks: "Bread Pakora + Tomato Sauce", dinner: "Matar Mushroom / Dal Tadka + Chapati + Ice Cream" },
  { day: "Friday", breakfast: "Upma with Veggies + Peanut Chutney + Milk", lunch: "Dal Palak + Rice + Roti + Aloo Jeera + Papad", eveningSnacks: "Bhel Puri / Fruit Bowl + Tea", dinner: "Chicken Curry (Optional) / Malai Kofta + Naan + Pulao" },
  { day: "Saturday", breakfast: "Methi Thepla / Poori Sabzi + Halwa + Milk", lunch: "Khichdi with Desi Ghee + Baingan Bharta + Papad", eveningSnacks: "Patties / Mathri + Tea", dinner: "Dal Fry + Kadhai Paneer + Tandoori Roti + Rasgulla" },
  { day: "Sunday", breakfast: "Special Chana Bhature / Sandwich + Badam Milk", lunch: "Special Dum Biryani (Veg/Non-Veg) + Raita + Sweet", eveningSnacks: "Cream Rolls + Coffee/Tea", dinner: "Light Veg Pulav + Dal Tadka + Custard", specialDiet: "Sunday Special Feast Day" },
];

export const HostelMessManager: React.FC<Props> = ({
  school,
  students = [],
  classes = [],
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"rooms" | "allocations" | "menu" | "attendance">("rooms");

  const isDemo = Boolean(school?.id && (school.id === "demo_school" || school.id.startsWith("demo_")));

  const [buildings, setBuildings] = useState<HostelBuilding[]>(() => {
    try {
      const saved = localStorage.getItem(`hostel_bld_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return isDemo ? DEFAULT_BUILDINGS : [];
  });

  const [rooms, setRooms] = useState<HostelRoom[]>(() => {
    try {
      const saved = localStorage.getItem(`hostel_rooms_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return isDemo ? DEFAULT_ROOMS : [];
  });

  const [allocations, setAllocations] = useState<HostelBedAllocation[]>(() => {
    try {
      const saved = localStorage.getItem(`hostel_alloc_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return isDemo ? DEFAULT_ALLOCATIONS : [];
  });

  const [messMenu, setMessMenu] = useState<MessMenuDay[]>(() => {
    try {
      const saved = localStorage.getItem(`hostel_menu_${school?.id || "demo"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MESS_MENU;
  });

  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, "PRESENT" | "NIGHT_OUT" | "LEAVE" | "ABSENT">>({});
  const messMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const sid = school?.id;
    if (!sid) return;
    const cacheSuffix = sid || "demo";
    loadSchoolSubcollection<HostelBuilding>(sid, "hostel_buildings", `hostel_bld_${cacheSuffix}`).then((data) => {
      if (active && data.length > 0) setBuildings(data);
    });
    loadSchoolSubcollection<HostelRoom>(sid, "hostel_rooms", `hostel_rooms_${cacheSuffix}`).then((data) => {
      if (active && data.length > 0) setRooms(data);
    });
    loadSchoolSubcollection<HostelBedAllocation>(sid, "hostel_allocations", `hostel_alloc_${cacheSuffix}`).then((data) => {
      if (active && data.length > 0) setAllocations(data);
    });
    loadSchoolSettingBlob<MessMenuDay[]>(sid, "hostel_mess_menu", `hostel_menu_${cacheSuffix}`, DEFAULT_MESS_MENU).then((menu) => {
      if (active && Array.isArray(menu) && menu.length > 0) setMessMenu(menu);
    });
    return () => { active = false; };
  }, [school?.id]);

  useEffect(() => {
    let active = true;
    const sid = school?.id;
    if (!sid) return;
    loadSchoolSettingBlob<Record<string, "PRESENT" | "NIGHT_OUT" | "LEAVE" | "ABSENT">>(
      sid,
      `hostel_rollcall_${attendanceDate}`,
      `hostel_rollcall_${sid || "demo"}_${attendanceDate}`,
      {}
    ).then((rec) => {
      if (active && rec && typeof rec === "object") setAttendanceRecords(rec);
    });
    return () => { active = false; };
  }, [school?.id, attendanceDate]);

  // Add Room Modal State
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomBuildingId, setNewRoomBuildingId] = useState(buildings[0]?.id || "");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomCapacity, setNewRoomCapacity] = useState(4);
  const [newRoomRent, setNewRoomRent] = useState(4500);

  // Add Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocStudentName, setAllocStudentName] = useState("");
  const [allocClassName, setAllocClassName] = useState("Class 10-A");
  const [allocRoomId, setAllocRoomId] = useState(rooms[0]?.id || "");
  const [allocBedNo, setAllocBedNo] = useState("Bed #1");
  const [allocPhone, setAllocPhone] = useState("+91 98765 00000");
  const [allocRent, setAllocRent] = useState(4500);

  const saveRooms = (updated: HostelRoom[]) => {
    setRooms(updated);
    try {
      localStorage.setItem(`hostel_rooms_${school?.id || "demo"}`, JSON.stringify(updated));
    } catch {}
    syncSchoolSubcollection(school?.id, "hostel_rooms", updated);
  };

  const saveAllocations = (updated: HostelBedAllocation[]) => {
    setAllocations(updated);
    try {
      localStorage.setItem(`hostel_alloc_${school?.id || "demo"}`, JSON.stringify(updated));
    } catch {}
    syncSchoolSubcollection(school?.id, "hostel_allocations", updated);
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) {
      toast.error("Please enter a room number.");
      return;
    }

    const newRecord: HostelRoom = {
      id: `rm_${Date.now()}`,
      schoolId: school.id,
      buildingId: newRoomBuildingId,
      roomNumber: newRoomNumber.trim().toUpperCase(),
      floor: Number(newRoomFloor),
      capacity: Number(newRoomCapacity),
      monthlyRent: Number(newRoomRent),
    };

    saveRooms([...rooms, newRecord]);
    setShowAddRoomModal(false);
    setNewRoomNumber("");
    toast.success(`Room ${newRecord.roomNumber} added to hostel inventory.`);
  };

  const handleCreateAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocStudentName.trim()) {
      toast.error("Please enter student name.");
      return;
    }

    const selectedRoom = rooms.find((r) => r.id === allocRoomId);
    const selectedBld = buildings.find((b) => b.id === selectedRoom?.buildingId);

    const newAlloc: HostelBedAllocation = {
      id: `alloc_${Date.now()}`,
      schoolId: school.id,
      buildingId: selectedRoom?.buildingId || "",
      buildingName: selectedBld?.name || "Hostel",
      roomId: allocRoomId,
      roomNumber: selectedRoom?.roomNumber || "Room",
      bedNumber: allocBedNo,
      studentId: `std_${Date.now().toString().slice(-4)}`,
      studentName: allocStudentName.trim(),
      className: allocClassName,
      allocatedAt: new Date().toISOString().split("T")[0],
      monthlyFee: Number(allocRent),
      guardianPhone: allocPhone.trim(),
      status: "OCCUPIED",
    };

    saveAllocations([...allocations, newAlloc]);
    setShowAllocateModal(false);
    setAllocStudentName("");
    toast.success(`Bed allocated to ${newAlloc.studentName}.`);
  };

  const handleToggleAttendance = (studentId: string, currentStatus: string) => {
    const cycle: Record<string, "PRESENT" | "NIGHT_OUT" | "LEAVE" | "ABSENT"> = {
      PRESENT: "NIGHT_OUT",
      NIGHT_OUT: "LEAVE",
      LEAVE: "ABSENT",
      ABSENT: "PRESENT",
    };
    const next = cycle[currentStatus || "PRESENT"] || "PRESENT";
    setAttendanceRecords((prev) => {
      const nextRecords = { ...prev, [studentId]: next };
      saveSchoolSettingBlob(
        school?.id,
        `hostel_rollcall_${attendanceDate}`,
        `hostel_rollcall_${school?.id || "demo"}_${attendanceDate}`,
        nextRecords
      );
      return nextRecords;
    });
  };

  const totalBedsCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const occupiedBeds = allocations.length;
  const vacantBeds = Math.max(0, totalBedsCapacity - occupiedBeds);
  const monthlyHostelRevenue = allocations.reduce((sum, a) => sum + a.monthlyFee, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-orange-500/20">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Hostel &amp; Mess Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Residential Wing
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Room bed allocation, 7-day mess menu planner, night roll-call &amp; hostel fees
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "rooms" && (
            <button
              type="button"
              onClick={() => setShowAddRoomModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Room</span>
            </button>
          )}

          {activeTab === "allocations" && (
            <button
              type="button"
              onClick={() => setShowAllocateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer shadow active:scale-95"
            >
              <Bed className="w-4 h-4" />
              <span>+ Allocate Bed</span>
            </button>
          )}

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Bed Capacity</span>
          <span className="text-xl sm:text-2xl font-black text-white">{totalBedsCapacity} Beds</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-center">
          <span className="text-[10px] font-bold text-indigo-300 uppercase block">Occupied Beds</span>
          <span className="text-xl sm:text-2xl font-black text-indigo-300">{occupiedBeds} Boarders</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-center">
          <span className="text-[10px] font-bold text-emerald-300 uppercase block">Available Vacant Beds</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">{vacantBeds} Free</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/30 text-center">
          <span className="text-[10px] font-bold text-amber-300 uppercase block">Hostel Fee Revenue/Mo</span>
          <span className="text-xl sm:text-2xl font-black text-amber-400">
            ₹{monthlyHostelRevenue.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "rooms"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-slate-800/80 text-slate-400 hover:text-white"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Buildings &amp; Rooms ({rooms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("allocations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "allocations"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-800/80 text-slate-400 hover:text-white"
          }`}
        >
          <Bed className="w-4 h-4" />
          <span>Bed Allocation ({allocations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "menu"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-slate-800/80 text-slate-400 hover:text-white"
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>7-Day Mess Menu Planner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === "attendance"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-800/80 text-slate-400 hover:text-white"
          }`}
        >
          <Moon className="w-4 h-4" />
          <span>Night Roll-Call &amp; Passes</span>
        </button>
      </div>

      {/* TAB 1: BUILDINGS & ROOMS */}
      {activeTab === "rooms" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {buildings.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${b.type === "BOYS" ? "bg-blue-500/20 text-blue-300" : "bg-rose-500/20 text-rose-300"}`}>
                    {b.type} HOSTEL
                  </span>
                  <span className="text-xs text-slate-400">{b.floors} Floors &bull; {b.totalRooms} Rooms</span>
                </div>
                <h3 className="text-base font-black text-white">{b.name}</h3>
                <p className="text-xs text-slate-300 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Warden: {b.wardenName} ({b.wardenPhone})</span>
                </p>
              </div>
            ))}
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            <h4 className="text-sm font-black text-white mb-3">Hostel Rooms Inventory</h4>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Room No</th>
                  <th className="py-2.5 px-3">Hostel Block</th>
                  <th className="py-2.5 px-3 text-center">Floor</th>
                  <th className="py-2.5 px-3 text-center">Capacity</th>
                  <th className="py-2.5 px-3 text-center">Occupied</th>
                  <th className="py-2.5 px-3 text-right">Monthly Rent</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {rooms.map((r) => {
                  const bld = buildings.find((b) => b.id === r.buildingId);
                  const occCount = allocations.filter((a) => a.roomId === r.id).length;
                  const isFull = occCount >= r.capacity;
                  return (
                    <tr key={r.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-bold text-white font-mono">{r.roomNumber}</td>
                      <td className="py-3 px-3 text-slate-300">{bld?.name || "Hostel Block"}</td>
                      <td className="py-3 px-3 text-center">{r.floor}</td>
                      <td className="py-3 px-3 text-center font-bold text-white">{r.capacity} Beds</td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-400">{occCount} / {r.capacity}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-400">₹{r.monthlyRent}/mo</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isFull ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                          {isFull ? "Full" : "Vacant Available"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BED ALLOCATION */}
      {activeTab === "allocations" && (
        <div className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            <h4 className="text-sm font-black text-white mb-3">Active Boarders &amp; Allocated Students</h4>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Building &amp; Room</th>
                  <th className="py-2.5 px-3">Bed No</th>
                  <th className="py-2.5 px-3">Guardian Phone</th>
                  <th className="py-2.5 px-3 text-right">Hostel Fee</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-bold text-white">{a.studentName}</td>
                    <td className="py-3 px-3 font-semibold text-indigo-300">{a.className}</td>
                    <td className="py-3 px-3 text-slate-300">{a.buildingName} &bull; <b className="text-white">{a.roomNumber}</b></td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{a.bedNumber}</td>
                    <td className="py-3 px-3">{a.guardianPhone}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-400">₹{a.monthlyFee}/mo</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = allocations.filter((item) => item.id !== a.id);
                          saveAllocations(updated);
                          toast.success(`Bed vacated for ${a.studentName}.`);
                        }}
                        className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px] font-bold cursor-pointer"
                      >
                        Vacate Bed
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 7-DAY MESS MENU */}
      {activeTab === "menu" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-400" />
              <span>Weekly Nutritious Meal Schedule (7 Days)</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                if (messMenuRef.current) {
                  printElementInIframe(
                    messMenuRef.current,
                    `Weekly Mess Menu - ${school?.name || "Hostel"}`,
                    `
                      body { color: #0f172a !important; background: #fff !important; }
                      .mess-menu-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
                      .mess-menu-card { background: #fff !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; page-break-inside: avoid; }
                      .mess-menu-card * { color: #1e293b !important; }
                    `
                  );
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Mess Menu</span>
            </button>
          </div>

          <div ref={messMenuRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mess-menu-grid">
            {messMenu.map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 mess-menu-card">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-black text-sm text-amber-400">{m.day}</span>
                  {m.specialDiet && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {m.specialDiet}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-300 block">☕ Breakfast (7:30 - 8:30 AM)</span>
                    <p className="text-slate-300">{m.breakfast}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 block">🍛 Lunch (1:00 - 2:00 PM)</span>
                    <p className="text-slate-300">{m.lunch}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-300 block">🍪 Evening Tea (5:00 - 5:30 PM)</span>
                    <p className="text-slate-300">{m.eveningSnacks}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-300 block">🍲 Dinner (8:00 - 9:00 PM)</span>
                    <p className="text-slate-300">{m.dinner}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: NIGHT ROLL-CALL & ATTENDANCE */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <label className="text-xs font-bold text-slate-300">Roll-Call Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Present</span>
              <span className="flex items-center gap-1 text-amber-400"><Clock className="w-3.5 h-3.5" /> Night-Out</span>
              <span className="flex items-center gap-1 text-blue-400"><Calendar className="w-3.5 h-3.5" /> Home Leave</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Student Name</th>
                  <th className="py-2 px-3">Room &amp; Bed</th>
                  <th className="py-2 px-3">Guardian Contact</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Tap to Toggle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allocations.map((a) => {
                  const curStatus = attendanceRecords[a.studentId] || "PRESENT";
                  return (
                    <tr key={a.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3 font-bold text-white">{a.studentName}</td>
                      <td className="py-3 px-3 font-mono">{a.roomNumber} &bull; {a.bedNumber}</td>
                      <td className="py-3 px-3">{a.guardianPhone}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            curStatus === "PRESENT"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : curStatus === "NIGHT_OUT"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          }`}
                        >
                          {curStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(a.studentId, curStatus)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition cursor-pointer"
                        >
                          Change Status ↻
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white">Add New Hostel Room</h3>
              <button onClick={() => setShowAddRoomModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Select Hostel Block</label>
                <select
                  value={newRoomBuildingId}
                  onChange={(e) => setNewRoomBuildingId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Room Number</label>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="e.g. A-204"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Floor Level</label>
                  <input
                    type="number"
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Bed Capacity</label>
                  <input
                    type="number"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                    min={1}
                    max={12}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={newRoomRent}
                    onChange={(e) => setNewRoomRent(Number(e.target.value))}
                    min={100}
                    step={100}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddRoomModal(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl">
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE BED MODAL */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white">Allocate Hostel Bed</h3>
              <button onClick={() => setShowAllocateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateAllocation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Student Name *</label>
                <input
                  type="text"
                  required
                  value={allocStudentName}
                  onChange={(e) => setAllocStudentName(e.target.value)}
                  placeholder="e.g. Vikas Jha"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Class</label>
                  <input
                    type="text"
                    value={allocClassName}
                    onChange={(e) => setAllocClassName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Select Room</label>
                  <select
                    value={allocRoomId}
                    onChange={(e) => setAllocRoomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.roomNumber} ({r.capacity} Beds)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Bed Tag</label>
                  <input
                    type="text"
                    value={allocBedNo}
                    onChange={(e) => setAllocBedNo(e.target.value)}
                    placeholder="Bed #1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={allocRent}
                    onChange={(e) => setAllocRent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Guardian Emergency Phone</label>
                <input
                  type="text"
                  required
                  value={allocPhone}
                  onChange={(e) => setAllocPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAllocateModal(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl">
                  Confirm Bed Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
