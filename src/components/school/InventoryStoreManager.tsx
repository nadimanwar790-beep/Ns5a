// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag, Plus, Search, Tag, AlertTriangle, Printer, Trash2,
  Edit3, CheckCircle2, Check, IndianRupee, QrCode, Filter, ChevronLeft,
  Package, Receipt, ArrowRight, Sparkles, RefreshCw, Clock
} from "lucide-react";
import type {
  School, SchoolStudent, SchoolClass,
  StoreInventoryItem, StoreSaleRecord, StoreReservationBooking
} from "../../school-types";
import { speakNotification } from "../../utils/voiceNotifyEngine";

interface Props {
  school: School;
  students?: SchoolStudent[];
  classes?: SchoolClass[];
  isAdmin?: boolean;
  onBack?: () => void;
}

const STORE_CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "uniform", label: "Uniforms (वर्दी)" },
  { id: "books", label: "Books & Notebooks (किताबें)" },
  { id: "accessories", label: "Tie, Belt & Badges (टाई, बेल्ट)" },
  { id: "stationery", label: "Stationery (स्टेशनरी)" },
  { id: "sports", label: "Sports & Activity (खेलकूद)" }
];

export const InventoryStoreManager: React.FC<Props> = ({
  school,
  students = [],
  classes = [],
  isAdmin = true,
  onBack
}) => {
  const invStorageKey = useMemo(() => `nst_school_store_items_${school?.id || "default"}`, [school?.id]);
  const salesStorageKey = useMemo(() => `nst_school_store_sales_${school?.id || "default"}`, [school?.id]);
  const resStorageKey = useMemo(() => `nst_school_store_reservations_${school?.id || "default"}`, [school?.id]);

  // Inventory Items List
  const [items, setItems] = useState<StoreInventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(invStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "item-1",
        schoolId: school?.id || "",
        itemCode: "UNIF-01",
        name: "School Uniform Shirt (White)",
        category: "uniform",
        sizeOrVariant: "Size 32",
        purchasePrice: 280,
        salePrice: 380,
        stockQuantity: 45,
        lowStockAlert: 10,
        unit: "Pcs",
        updatedAt: new Date().toISOString()
      },
      {
        id: "item-2",
        schoolId: school?.id || "",
        itemCode: "UNIF-02",
        name: "School Uniform Trouser / Pant (Navy Blue)",
        category: "uniform",
        sizeOrVariant: "Size 32",
        purchasePrice: 350,
        salePrice: 480,
        stockQuantity: 30,
        lowStockAlert: 8,
        unit: "Pcs",
        updatedAt: new Date().toISOString()
      },
      {
        id: "item-3",
        schoolId: school?.id || "",
        itemCode: "ACC-01",
        name: "School Belt & Tie Combo Set",
        category: "accessories",
        sizeOrVariant: "Standard",
        purchasePrice: 110,
        salePrice: 180,
        stockQuantity: 6,
        lowStockAlert: 10, // Low stock trigger
        unit: "Set",
        updatedAt: new Date().toISOString()
      },
      {
        id: "item-4",
        schoolId: school?.id || "",
        itemCode: "BK-10",
        name: "Complete NCERT Class 10 Textbook Set",
        category: "books",
        sizeOrVariant: "Full Set (6 Books)",
        purchasePrice: 950,
        salePrice: 1150,
        stockQuantity: 22,
        lowStockAlert: 5,
        unit: "Set",
        updatedAt: new Date().toISOString()
      },
      {
        id: "item-5",
        schoolId: school?.id || "",
        itemCode: "STAT-01",
        name: "Four-Line Notebook Bundle (Pack of 6)",
        category: "stationery",
        sizeOrVariant: "172 Pages",
        purchasePrice: 150,
        salePrice: 220,
        stockQuantity: 80,
        lowStockAlert: 15,
        unit: "Pack",
        updatedAt: new Date().toISOString()
      }
    ];
  });

  // Sales Records List
  const [sales, setSales] = useState<StoreSaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(salesStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Online Student 24-Hour Reservations List
  const [reservations, setReservations] = useState<StoreReservationBooking[]>(() => {
    try {
      const saved = localStorage.getItem(resStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Clock ticker for countdown
  const [currentEpoch, setCurrentEpoch] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setCurrentEpoch(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Sync with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(invStorageKey, JSON.stringify(items));
    } catch {}
  }, [items, invStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(salesStorageKey, JSON.stringify(sales));
    } catch {}
  }, [sales, salesStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(resStorageKey, JSON.stringify(reservations));
    } catch {}
  }, [reservations, resStorageKey]);

  // Check auto-expiry of bookings and restore stock
  useEffect(() => {
    let stockChanged = false;
    let invCopy = [...items];

    const updatedRes = reservations.map((res) => {
      if (res.status === "reserved" && new Date(res.expiresAt).getTime() <= currentEpoch) {
        stockChanged = true;
        res.items.forEach((booked) => {
          const itm = invCopy.find((i) => i.id === booked.itemId);
          if (itm) {
            itm.stockQuantity += booked.quantity;
          }
        });
        return { ...res, status: "expired" as const };
      }
      return res;
    });

    if (stockChanged) {
      setItems(invCopy);
      setReservations(updatedRes);
      try {
        localStorage.setItem(invStorageKey, JSON.stringify(invCopy));
        localStorage.setItem(resStorageKey, JSON.stringify(updatedRes));
      } catch {}
    }
  }, [currentEpoch]);

  // Tab View: "inventory" vs "bookings" vs "sales_history"
  const [activeTab, setActiveTab] = useState<"inventory" | "bookings" | "sales_history">("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Fulfill a reservation (Mark Handed Over & Paid)
  const handleFulfillReservation = (res: StoreReservationBooking) => {
    const receiptNo = `STR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const saleRecord: StoreSaleRecord = {
      id: `sale-${Date.now()}`,
      schoolId: school.id,
      receiptNo,
      studentId: res.studentId,
      studentName: res.studentName,
      className: res.className,
      rollNo: res.rollNo,
      items: res.items.map((line) => ({
        itemId: line.itemId,
        itemName: `${line.itemName} ${line.sizeOrVariant ? `(${line.sizeOrVariant})` : ""}`,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.subtotal,
      })),
      totalAmount: res.totalAmount,
      paymentMode: "cash",
      date: new Date().toISOString().split("T")[0],
      soldBy: "Store Manager",
    };

    const nextSales = [saleRecord, ...sales];
    const nextReservations = reservations.map((r) =>
      r.id === res.id ? { ...r, status: "collected" as const, collectedAt: new Date().toISOString() } : r
    );

    setSales(nextSales);
    setReservations(nextReservations);
    localStorage.setItem(salesStorageKey, JSON.stringify(nextSales));
    localStorage.setItem(resStorageKey, JSON.stringify(nextReservations));

    setPrintableReceipt(saleRecord);
    speakNotification(
      "स्टोर रसीद जारी",
      `${res.studentName} का आर्डर ${res.id} का सामान सौंप दिया गया और रसीद जारी हो गई।`
    );
  };

  // Cancel reservation and restore stock
  const handleCancelReservation = (res: StoreReservationBooking) => {
    const nextItems = items.map((itm) => {
      const match = res.items.find((i) => i.itemId === itm.id);
      if (match) {
        return { ...itm, stockQuantity: itm.stockQuantity + match.quantity };
      }
      return itm;
    });

    const nextReservations = reservations.map((r) =>
      r.id === res.id ? { ...r, status: "cancelled" as const } : r
    );

    setItems(nextItems);
    setReservations(nextReservations);
    localStorage.setItem(invStorageKey, JSON.stringify(nextItems));
    localStorage.setItem(resStorageKey, JSON.stringify(nextReservations));
    speakNotification("बुकिंग रद्द", `ऑर्डर ${res.id} रद्द करके स्टॉक वापस जोड़ दिया गया।`);
  };

  const activeReservationsCount = useMemo(() => {
    return reservations.filter((r) => r.status === "reserved" && new Date(r.expiresAt).getTime() > currentEpoch).length;
  }, [reservations, currentEpoch]);

  // Add Item Modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemFormName, setItemFormName] = useState("");
  const [itemFormCode, setItemFormCode] = useState(`ITM-${items.length + 101}`);
  const [itemFormCategory, setItemFormCategory] = useState<StoreInventoryItem["category"]>("uniform");
  const [itemFormVariant, setItemFormVariant] = useState("");
  const [itemFormPurchasePrice, setItemFormPurchasePrice] = useState(200);
  const [itemFormSalePrice, setItemFormSalePrice] = useState(300);
  const [itemFormStock, setItemFormStock] = useState(25);
  const [itemFormLowAlert, setItemFormLowAlert] = useState(5);
  const [itemFormUnit, setItemFormUnit] = useState("Pcs");

  // Quick Sale / Billing Modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [billStudentId, setBillStudentId] = useState("");
  const [billItems, setBillItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [billPaymentMode, setBillPaymentMode] = useState<"cash" | "online_upi" | "card">("cash");

  // Printable Receipt State
  const [printableReceipt, setPrintableReceipt] = useState<StoreSaleRecord | null>(null);

  // Statistics
  const totalStockValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.stockQuantity * item.salePrice), 0);
  }, [items]);

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.stockQuantity <= item.lowStockAlert);
  }, [items]);

  const totalSalesRevenue = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedCat !== "all" && item.category !== selectedCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.itemCode.toLowerCase().includes(q) ||
          (item.sizeOrVariant && item.sizeOrVariant.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [items, selectedCat, searchQuery]);

  // Add Item
  const handleSaveItem = () => {
    if (!itemFormName.trim()) {
      alert("Kripya Item ka naam enter karein.");
      return;
    }

    const newItem: StoreInventoryItem = {
      id: `item-${Date.now()}`,
      schoolId: school.id,
      itemCode: itemFormCode.trim() || `ITM-${Math.floor(100 + Math.random() * 900)}`,
      name: itemFormName.trim(),
      category: itemFormCategory,
      sizeOrVariant: itemFormVariant.trim() || undefined,
      purchasePrice: Number(itemFormPurchasePrice) || 0,
      salePrice: Number(itemFormSalePrice) || 0,
      stockQuantity: Number(itemFormStock) || 0,
      lowStockAlert: Number(itemFormLowAlert) || 5,
      unit: itemFormUnit || "Pcs",
      updatedAt: new Date().toISOString()
    };

    setItems(prev => [newItem, ...prev]);
    setShowAddItemModal(false);
    setItemFormName("");
    setItemFormVariant("");
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    if (window.confirm("Kya aap sach me yeh item inventory se hatana chahte hain?")) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  // Add line to bill
  const handleAddBillLine = (itemId: string) => {
    setBillItems(prev => {
      const exist = prev.find(p => p.itemId === itemId);
      if (exist) {
        return prev.map(p => p.itemId === itemId ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { itemId, quantity: 1 }];
    });
  };

  // Calculate bill total
  const billTotalAmount = useMemo(() => {
    return billItems.reduce((sum, line) => {
      const itm = items.find(i => i.id === line.itemId);
      return sum + (itm ? itm.salePrice * line.quantity : 0);
    }, 0);
  }, [billItems, items]);

  // Complete Sale & Print Bill
  const handleCompleteSale = () => {
    if (billItems.length === 0) {
      alert("Kripya kam se kam ek item select karein.");
      return;
    }

    const selectedStd = students.find(s => s.id === billStudentId);
    const cls = selectedStd ? classes.find(c => c.id === selectedStd.classId) : null;

    const receiptNo = `STR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const saleRecord: StoreSaleRecord = {
      id: `sale-${Date.now()}`,
      schoolId: school.id,
      receiptNo,
      studentId: selectedStd?.id,
      studentName: selectedStd?.name || "Counter Customer",
      className: cls?.name,
      rollNo: selectedStd?.rollNo,
      items: billItems.map(line => {
        const itm = items.find(i => i.id === line.itemId)!;
        return {
          itemId: itm.id,
          itemName: `${itm.name} ${itm.sizeOrVariant ? `(${itm.sizeOrVariant})` : ""}`,
          quantity: line.quantity,
          unitPrice: itm.salePrice,
          subtotal: itm.salePrice * line.quantity
        };
      }),
      totalAmount: billTotalAmount,
      paymentMode: billPaymentMode,
      date: new Date().toISOString().split("T")[0],
      soldBy: "Store Manager"
    };

    // Deduct stock from inventory
    setItems(prev => prev.map(item => {
      const soldLine = billItems.find(b => b.itemId === item.id);
      if (soldLine) {
        return {
          ...item,
          stockQuantity: Math.max(0, item.stockQuantity - soldLine.quantity)
        };
      }
      return item;
    }));

    setSales(prev => [saleRecord, ...prev]);
    setShowBillModal(false);
    setBillItems([]);
    setBillStudentId("");
    setPrintableReceipt(saleRecord);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-slate-900 text-white px-4 py-4 sm:py-6 shadow-md border-b border-amber-800/40 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider border border-amber-400/30">
                  School Stationery & Uniform Store
                </span>
                <span className="text-slate-300 text-xs font-semibold">
                  Inventory & POS Billing
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-amber-400" />
                <span>School Store & Inventory (स्टॉक व बिलिंग)</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBillModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>+ New Sale / Quick Bill</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddItemModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center gap-1.5 transition border border-white/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Item</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Stock Value</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalStockValue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{items.length} Products in Stock</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Low Stock Alert</p>
            <p className={`text-2xl font-black mt-1 ${lowStockItems.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {lowStockItems.length} Items
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Need Reordering</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Store Sales</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalSalesRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{sales.length} Invoices Generated</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "inventory"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Store Catalog ({items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "bookings"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Online Bookings ({reservations.length})</span>
            {activeReservationsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black animate-pulse">
                {activeReservationsCount} Active
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sales_history")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "sales_history"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Sales &amp; Receipts ({sales.length})</span>
          </button>
        </div>

        {/* ── 1. INVENTORY CATALOG TAB ── */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            {/* Search and Category Filter */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search item by name, code (e.g. UNIF-01)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                {STORE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCat(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCat === cat.id
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                      <th className="p-3 font-black">Code</th>
                      <th className="p-3 font-black">Item Name & Variant</th>
                      <th className="p-3 font-black">Category</th>
                      <th className="p-3 font-black">Sale Price</th>
                      <th className="p-3 font-black">Stock Status</th>
                      <th className="p-3 font-black text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredItems.map(item => {
                      const isLow = item.stockQuantity <= item.lowStockAlert;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                          <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                            {item.itemCode}
                          </td>
                          <td className="p-3">
                            <p className="font-black text-slate-900 dark:text-white">{item.name}</p>
                            {item.sizeOrVariant && (
                              <p className="text-[10px] text-slate-400 font-medium">Variant: {item.sizeOrVariant}</p>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 font-black text-emerald-600 dark:text-emerald-400">
                            ₹{item.salePrice} <span className="text-[10px] font-normal text-slate-400">/ {item.unit}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-black ${isLow ? "text-rose-600" : "text-slate-800 dark:text-white"}`}>
                                {item.stockQuantity} {item.unit}
                              </span>
                              {isLow && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200">
                                  Low Stock
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddBillLine(item.id);
                                  setShowBillModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                              >
                                Sell
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. ONLINE 24-HOUR STUDENT BOOKINGS TAB ── */}
        {activeTab === "bookings" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Student Online Bookings (24-Hour Reservations)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  छात्रों द्वारा 24 घंटे के लिए बुक की गई सामग्री। समय समाप्त होने पर स्टॉक अपने आप वापस रिस्टोर हो जाएगा।
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {activeReservationsCount} Pending Collection
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <th className="p-3 font-black">Order ID</th>
                    <th className="p-3 font-black">Student</th>
                    <th className="p-3 font-black">Items Booked</th>
                    <th className="p-3 font-black">Booked Time</th>
                    <th className="p-3 font-black">24H Window Timer</th>
                    <th className="p-3 font-black text-right">Amount</th>
                    <th className="p-3 font-black text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        अभी कोई ऑनलाइन बुकिंग प्राप्त नहीं हुई है।
                      </td>
                    </tr>
                  ) : (
                    reservations.map((booking) => {
                      const isReserved = booking.status === "reserved";
                      const isCollected = booking.status === "collected";
                      const isExpired = booking.status === "expired" || (isReserved && new Date(booking.expiresAt).getTime() <= currentEpoch);

                      const diffMs = new Date(booking.expiresAt).getTime() - currentEpoch;
                      let timeRemaining = "EXPIRED";
                      if (diffMs > 0) {
                        const totalSecs = Math.floor(diffMs / 1000);
                        const h = Math.floor(totalSecs / 3600);
                        const m = Math.floor((totalSecs % 3600) / 60);
                        const s = totalSecs % 60;
                        timeRemaining = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                      }

                      return (
                        <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                          <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                            {booking.id}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-white">
                            <p>{booking.studentName}</p>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {booking.className} • Roll {booking.rollNo || "--"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {booking.items.map((i) => `${i.itemName} (x${i.quantity})`).join(", ")}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {new Date(booking.bookedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="p-3">
                            {isCollected ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black text-[10px]">
                                ✓ Collected &amp; Paid
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                                Expired (Stock Restored)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-500 font-mono font-black text-xs animate-pulse">
                                ⏳ {timeRemaining} remaining
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-black text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                            ₹{booking.totalAmount}
                          </td>
                          <td className="p-3 text-center">
                            {isReserved && !isExpired && (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleFulfillReservation(booking)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Hand Over &amp; Paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelReservation(booking)}
                                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-[11px] cursor-pointer"
                                  title="Cancel Booking & Restore Stock"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 3. SALES HISTORY TAB ── */}
        {activeTab === "sales_history" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <th className="p-3 font-black">Receipt No</th>
                    <th className="p-3 font-black">Date</th>
                    <th className="p-3 font-black">Student / Customer</th>
                    <th className="p-3 font-black">Items Summary</th>
                    <th className="p-3 font-black">Mode</th>
                    <th className="p-3 font-black text-right">Amount</th>
                    <th className="p-3 font-black text-right">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Abhi koi sale nahi hui hai. Upar diye "+ New Sale / Quick Bill" button se pehli bikri karein.
                      </td>
                    </tr>
                  ) : (
                    sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {sale.receiptNo}
                        </td>
                        <td className="p-3 font-mono text-slate-500">{sale.date}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-white">
                          <p>{sale.studentName}</p>
                          {sale.className && <span className="text-[10px] text-slate-400 font-normal">{sale.className}</span>}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {sale.items.map(i => `${i.itemName} (x${i.quantity})`).join(", ")}
                        </td>
                        <td className="p-3 uppercase font-bold text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                            {sale.paymentMode}
                          </span>
                        </td>
                        <td className="p-3 font-black text-right text-emerald-600 dark:text-emerald-400">
                          ₹{sale.totalAmount}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPrintableReceipt(sale)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD ITEM MODAL ── */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                <span>Add Store Item to Catalog</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Item Name (वस्तु का नाम) *
              </label>
              <input
                type="text"
                value={itemFormName}
                onChange={e => setItemFormName(e.target.value)}
                placeholder="e.g. School Track Pant, Maths Notebook"
                className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={itemFormCategory}
                  onChange={e => setItemFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
                >
                  <option value="uniform">Uniforms</option>
                  <option value="books">Books & Notebooks</option>
                  <option value="accessories">Tie & Belts</option>
                  <option value="stationery">Stationery</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Size / Variant
                </label>
                <input
                  type="text"
                  value={itemFormVariant}
                  onChange={e => setItemFormVariant(e.target.value)}
                  placeholder="e.g. Size 34, 180 Pgs"
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Sale Price (₹) *
                </label>
                <input
                  type="number"
                  value={itemFormSalePrice}
                  onChange={e => setItemFormSalePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold text-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Initial Stock Qty
                </label>
                <input
                  type="number"
                  value={itemFormStock}
                  onChange={e => setItemFormStock(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveItem}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Save Product
              </button>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BILLING & SALE MODAL ── */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Store Billing & Invoice (बिक्री रसीद)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBillModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Select student */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Select Student / Customer
              </label>
              <select
                value={billStudentId}
                onChange={e => setBillStudentId(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
              >
                <option value="">Counter Customer / Walk-in</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Roll #{s.rollNo || "—"})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Item to add */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Select Items to Sell
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700">
                {items.filter(i => i.stockQuantity > 0).map(i => {
                  const inBill = billItems.find(b => b.itemId === i.id);
                  return (
                    <div key={i.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white">{i.name}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">₹{i.salePrice}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {inBill && (
                          <span className="font-black text-emerald-600 text-xs">
                            x{inBill.quantity}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddBillLine(i.id)}
                          className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px]"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart Summary */}
            {billItems.length > 0 && (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="flex items-center justify-between font-black text-xs text-emerald-900 dark:text-emerald-200">
                  <span>Total Amount Due:</span>
                  <span className="text-base text-emerald-600">₹{billTotalAmount}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                  <span className="font-bold text-slate-600">Payment:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={billPaymentMode === "cash"} onChange={() => setBillPaymentMode("cash")} />
                    <span>Cash</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={billPaymentMode === "online_upi"} onChange={() => setBillPaymentMode("online_upi")} />
                    <span>UPI / Online</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={billItems.length === 0}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Complete Sale & Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setShowBillModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINTABLE STORE RECEIPT MODAL ── */}
      {printableReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border space-y-4 font-mono">
            <div className="text-center border-b pb-3">
              <h3 className="font-black text-lg uppercase">{school?.name || "School Store"}</h3>
              <p className="text-[10px] text-slate-500">{school?.address}</p>
              <p className="text-xs font-bold mt-1">OFFICIAL STORE RECEIPT</p>
              <p className="text-[10px] text-slate-400">Invoice: #{printableReceipt.receiptNo}</p>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{printableReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{printableReceipt.studentName}</span>
              </div>
              {printableReceipt.className && (
                <div className="flex justify-between">
                  <span>Class:</span>
                  <span>{printableReceipt.className}</span>
                </div>
              )}
            </div>

            <div className="border-t border-b py-2 text-xs space-y-1">
              {printableReceipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.itemName} (x{it.quantity})</span>
                  <span>₹{it.subtotal}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-black text-sm">
              <span>TOTAL PAID:</span>
              <span>₹{printableReceipt.totalAmount}</span>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-2 border-t">
              <p>Mode: {printableReceipt.paymentMode.toUpperCase()}</p>
              <p className="mt-1">Thank you! Items once sold cannot be returned.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintableReceipt(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
