// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag, Tag, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, IndianRupee, ShieldCheck, Sparkles, Filter,
  Search, X, Receipt, Check, AlertCircle, RefreshCw
} from "lucide-react";
import type { School, SchoolStudent, StoreInventoryItem, StoreReservationBooking } from "../../school-types";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { toast } from "sonner";

interface Props {
  school: School;
  student: SchoolStudent;
  onBack?: () => void;
}

const CATEGORIES = [
  { id: "all", label: "All Items (सभी)" },
  { id: "uniform", label: "Uniform (वर्दी)" },
  { id: "books", label: "Books & Copies (किताबें)" },
  { id: "accessories", label: "Tie & Belt (टाई-बेल्ट)" },
  { id: "stationery", label: "Stationery (स्टेशनरी)" },
];

export const StudentSchoolStore: React.FC<Props> = ({ school, student, onBack }) => {
  const invStorageKey = `nst_school_store_items_${school?.id || "default"}`;
  const resStorageKey = `nst_school_store_reservations_${school?.id || "default"}`;

  const [items, setItems] = useState<StoreInventoryItem[]>([]);
  const [reservations, setReservations] = useState<StoreReservationBooking[]>([]);
  const [selectedCat, setSelectedCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"catalog" | "my_bookings">("catalog");

  // Booking Modal State
  const [bookingItem, setBookingItem] = useState<StoreInventoryItem | null>(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState<StoreReservationBooking | null>(null);

  // Time ticker for countdown
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load items and reservations
  const loadData = () => {
    try {
      const rawInv = localStorage.getItem(invStorageKey);
      let invList: StoreInventoryItem[] = rawInv ? JSON.parse(rawInv) : [];

      const rawRes = localStorage.getItem(resStorageKey);
      let resList: StoreReservationBooking[] = rawRes ? JSON.parse(rawRes) : [];

      // Check for auto-expired reservations (>24h) and restore stock
      let hasStockRestored = false;
      const currentEpoch = Date.now();

      resList = resList.map((res) => {
        if (res.status === "reserved" && new Date(res.expiresAt).getTime() <= currentEpoch) {
          // Expire booking and restore stock
          hasStockRestored = true;
          res.items.forEach((booked) => {
            const itm = invList.find((i) => i.id === booked.itemId);
            if (itm) {
              itm.stockQuantity += booked.quantity;
            }
          });
          return { ...res, status: "expired" };
        }
        return res;
      });

      if (hasStockRestored) {
        localStorage.setItem(invStorageKey, JSON.stringify(invList));
        localStorage.setItem(resStorageKey, JSON.stringify(resList));
      }

      setItems(invList);
      setReservations(resList);
    } catch (e) {
      console.warn("[StudentSchoolStore] Load error:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [invStorageKey, resStorageKey]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCat === "all" || item.category === selectedCat;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.sizeOrVariant && item.sizeOrVariant.toLowerCase().includes(q)) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [items, selectedCat, searchQuery]);

  // My active & past reservations
  const myReservations = useMemo(() => {
    return reservations.filter((r) => r.studentId === student.id);
  }, [reservations, student.id]);

  const activeReservations = myReservations.filter((r) => r.status === "reserved");

  // Handle Book Item Submission
  const handleConfirmBooking = () => {
    if (!bookingItem || bookingQty <= 0) return;
    if (bookingItem.stockQuantity < bookingQty) {
      toast.error("माफ़ करें, पर्याप्त स्टॉक उपलब्ध नहीं है।");
      return;
    }

    const orderId = `ORD-24H-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookedAtIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const subtotal = bookingItem.salePrice * bookingQty;

    const newBooking: StoreReservationBooking = {
      id: orderId,
      schoolId: school.id,
      studentId: student.id,
      studentName: student.name,
      className: student.className || "Class",
      rollNo: student.rollNo,
      phone: student.phone,
      items: [
        {
          itemId: bookingItem.id,
          itemName: bookingItem.name,
          category: bookingItem.category,
          sizeOrVariant: bookingItem.sizeOrVariant,
          quantity: bookingQty,
          unitPrice: bookingItem.salePrice,
          subtotal: subtotal,
        },
      ],
      totalAmount: subtotal,
      bookedAt: bookedAtIso,
      expiresAt: expiresAtIso,
      status: "reserved",
      notes: "School store 24-hr student reservation",
    };

    // Deduct stock temporarily
    const nextItems = items.map((i) =>
      i.id === bookingItem.id ? { ...i, stockQuantity: Math.max(0, i.stockQuantity - bookingQty) } : i
    );
    const nextReservations = [newBooking, ...reservations];

    try {
      localStorage.setItem(invStorageKey, JSON.stringify(nextItems));
      localStorage.setItem(resStorageKey, JSON.stringify(nextReservations));
      setItems(nextItems);
      setReservations(nextReservations);
      setBookingSuccess(newBooking);
      setBookingItem(null);

      speakNotification(
        "स्टोर बुकिंग सफल",
        `आपका ऑर्डर ${orderId} 24 घंटे के लिए बुक हो गया है। कृपया स्कूल काउंटर से प्राप्त करें।`
      );
    } catch (e) {
      toast.error("Booking error: " + (e?.message || "Retry"));
    }
  };

  // Helper to format remaining time
  const getRemainingTimeStr = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - nowTs;
    if (diffMs <= 0) return "EXPIRED";

    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 rounded-3xl p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-2xl shadow-inner">
            <ShoppingBag className="w-6 h-6 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wide text-white">
                School Store (स्कूल स्टोर)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                24H Reservation
              </span>
            </div>
            <p className="text-xs text-amber-100">
              स्कूल की आधिकारिक ड्रेस, पुस्तकें व सामग्री देखें और बिना किसी अग्रिम भुगतान के 24 घंटे के लिए बुक करें!
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-black/30 p-1 rounded-2xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "catalog"
                ? "bg-white text-slate-950 shadow-md"
                : "text-amber-100 hover:text-white"
            }`}
          >
            सामग्री सूची (Store)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my_bookings")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === "my_bookings"
                ? "bg-white text-slate-950 shadow-md"
                : "text-amber-100 hover:text-white"
            }`}
          >
            मेरी बुकिंग (Orders)
            {activeReservations.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {activeReservations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl">
              ✓
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black tracking-wider uppercase">
                24 घंटे के लिए आरक्षित (Reserved)
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                Order #{bookingSuccess.id}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                सामान आपके लिए 24 घंटे के लिए स्कूल स्टोर पर सुरक्षित रख दिया गया है।
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                समय सीमा (Pickup Window Remaining):
              </span>
              <span className="text-2xl font-black font-mono tracking-wider text-amber-400 tabular-nums">
                {getRemainingTimeStr(bookingSuccess.expiresAt)}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                24 घंटे बाद यह बुकिंग स्वतः रद्द होकर स्टॉक में वापस चली जाएगी।
              </p>
            </div>

            {/* Item Details */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>सामग्री:</span>
                <strong className="text-white">{bookingSuccess.items[0]?.itemName}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>मात्रा:</span>
                <strong className="text-white">{bookingSuccess.items[0]?.quantity} Pcs</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>भुगतान योग्य राशि:</span>
                <strong className="text-emerald-400 font-bold">₹{bookingSuccess.totalAmount}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setBookingSuccess(null);
                setActiveTab("my_bookings");
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              बुकिंग वाउचर देखें (View Voucher)
            </button>
          </div>
        </div>
      )}

      {/* BOOKING INPUT MODAL */}
      {bookingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm text-white">सामग्री बुक करें (Book Item)</h3>
              </div>
              <button
                onClick={() => setBookingItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex gap-3 items-center">
              {bookingItem.imageUrl && (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
                  <img src={bookingItem.imageUrl} alt={bookingItem.name} className="w-full h-full object-contain p-1" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate">{bookingItem.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {bookingItem.sizeOrVariant} • Code: {bookingItem.itemCode}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">स्कूल मूल्य:</span>
                  <span className="text-base font-black text-amber-400">₹{bookingItem.salePrice}</span>
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                मात्रा चुनें (Quantity):
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBookingQty((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold text-lg flex items-center justify-center"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono font-bold text-base text-white">
                  {bookingQty}
                </span>
                <button
                  type="button"
                  onClick={() => setBookingQty((prev) => Math.min(bookingItem.stockQuantity, prev + 1))}
                  className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold text-lg flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 text-center">
                उपलब्ध स्टॉक: {bookingItem.stockQuantity} {bookingItem.unit || "Pcs"}
              </p>
            </div>

            {/* Total */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300">कुल देय राशि (Pay at Counter):</span>
              <strong className="text-base font-black text-amber-300">
                ₹{bookingItem.salePrice * bookingQty}
              </strong>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer"
              >
                24 घंटे के लिए बुक करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATALOG VIEW */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Search & Categories */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ड्रेस, यूनिफॉर्म या किताबें खोजें..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedCat === cat.id
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Store Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredItems.map((item) => {
              const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= (item.lowStockAlert || 5);
              const isOutOfStock = item.stockQuantity <= 0;

              return (
                <div
                  key={item.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono uppercase font-bold">
                        {item.itemCode || "ITEM"}
                      </span>
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                          Only {item.stockQuantity} left!
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          In Stock ({item.stockQuantity})
                        </span>
                      )}
                    </div>

                    {item.imageUrl && (
                      <div className="w-full h-32 rounded-xl overflow-hidden mb-2.5 bg-slate-950/80 border border-slate-800 flex items-center justify-center">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                      </div>
                    )}

                    <h4 className="text-sm font-black text-white line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{item.sizeOrVariant || "Standard Size"}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">मूल्य (Price):</span>
                      <span className="text-base font-black text-amber-400">₹{item.salePrice}</span>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => {
                        setBookingItem(item);
                        setBookingQty(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isOutOfStock
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                          : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95"
                      }`}
                    >
                      <ShoppingBag size={13} />
                      <span>24h बुक करें</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
              कोई सामग्री नहीं मिली।
            </div>
          )}
        </div>
      )}

      {/* MY BOOKINGS VIEW */}
      {activeTab === "my_bookings" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>आपकी आरक्षित सामग्री (Your 24-Hr Bookings):</span>
            <span>कुल: {myReservations.length}</span>
          </div>

          <div className="space-y-3">
            {myReservations.map((res) => {
              const isReserved = res.status === "reserved";
              const isCollected = res.status === "collected";
              const isExpired = res.status === "expired" || (isReserved && new Date(res.expiresAt).getTime() <= nowTs);
              const remainingTimeStr = getRemainingTimeStr(res.expiresAt);

              return (
                <div
                  key={res.id}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isReserved && !isExpired
                      ? "bg-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/10"
                      : isCollected
                      ? "bg-slate-900/60 border-emerald-500/30"
                      : "bg-slate-900/40 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs text-amber-300">
                      {res.id}
                    </span>

                    {isCollected ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                        ✓ प्राप्त व भुगतान हो गया (Collected)
                      </span>
                    ) : isExpired ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                        समय समाप्त (Expired)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black animate-pulse flex items-center gap-1">
                        <Clock size={11} /> {remainingTimeStr} शेष
                      </span>
                    )}
                  </div>

                  {/* Items in reservation */}
                  <div className="space-y-1 my-2">
                    {res.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-300">
                        <span>{it.itemName} ({it.sizeOrVariant || "Standard"}) × {it.quantity}</span>
                        <strong className="text-white font-mono">₹{it.subtotal}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      बुक किया: {new Date(res.bookedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div>
                      <span className="text-slate-400 mr-2">कुल राशि:</span>
                      <strong className="text-amber-400 font-black text-sm">₹{res.totalAmount}</strong>
                    </div>
                  </div>
                </div>
              );
            })}

            {myReservations.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                आपने अभी तक कोई सामग्री बुक नहीं की है।
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
