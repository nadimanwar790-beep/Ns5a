// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag, Tag, Clock, CheckCircle2,
  IndianRupee, ShieldCheck, Search, X, Receipt, CreditCard, RefreshCw
} from "lucide-react";
import type {
  School,
  SchoolStudent,
  StoreInventoryItem,
  StoreReservationBooking,
  StoreSaleRecord,
} from "../../school-types";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import {
  loadSchoolSubcollection,
  syncSchoolSubcollection,
  saveSchoolSubdoc,
  loadMergedStoreSales,
  loadMergedStoreReservations,
} from "../../utils/schoolCloudSync";
import {
  fetchSchoolRazorpayConfig,
  startStudentRazorpayStoreCheckout,
  type PublicRazorpayConfig,
} from "../../utils/razorpayCheckout";
import { formatStorePaymentModeLabel } from "../../utils/paymentBreakdown";
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

export const StudentSchoolStore: React.FC<Props> = ({ school, student }) => {
  const schoolId = school?.id || "default";
  const invStorageKey = `nst_school_store_items_${schoolId}`;
  const resStorageKey = `nst_school_store_reservations_${schoolId}`;
  const salesStorageKey = `nst_school_store_sales_${schoolId}`;

  const [items, setItems] = useState<StoreInventoryItem[]>([]);
  const [reservations, setReservations] = useState<StoreReservationBooking[]>([]);
  const [sales, setSales] = useState<StoreSaleRecord[]>([]);
  const [selectedCat, setSelectedCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"catalog" | "my_bookings">("catalog");
  const [loadingCloud, setLoadingCloud] = useState(false);

  // Razorpay Online Payment config + busy state
  const [rzpConfig, setRzpConfig] = useState<PublicRazorpayConfig | null>(null);
  const [payingOnlineId, setPayingOnlineId] = useState<string | null>(null);

  // Booking / Direct Purchase Modal State
  const [bookingItem, setBookingItem] = useState<StoreInventoryItem | null>(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState<StoreReservationBooking | null>(null);
  const [paidOnlineSuccess, setPaidOnlineSuccess] = useState<StoreSaleRecord | null>(null);

  // Time ticker for countdown
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load items, reservations, sales (Local + Firestore + RTDB) and Razorpay config
  const loadData = async () => {
    setLoadingCloud(true);
    try {
      const [cloudInv, cloudRes, cloudSales, cfg] = await Promise.all([
        loadSchoolSubcollection<StoreInventoryItem>(schoolId, "store_items", invStorageKey),
        loadMergedStoreReservations<StoreReservationBooking>(schoolId, resStorageKey),
        loadMergedStoreSales<StoreSaleRecord>(schoolId, salesStorageKey),
        fetchSchoolRazorpayConfig(schoolId),
      ]);

      let invList: StoreInventoryItem[] = Array.isArray(cloudInv) ? [...cloudInv] : [];
      let resList: StoreReservationBooking[] = Array.isArray(cloudRes) ? [...cloudRes] : [];
      const salesList: StoreSaleRecord[] = Array.isArray(cloudSales) ? [...cloudSales] : [];

      // Check for auto-expired unpaid reservations (>24h) and restore stock
      let hasStockRestored = false;
      const currentEpoch = Date.now();

      resList = resList.map((res) => {
        if (
          res.status === "reserved" &&
          !res.razorpayPaymentId &&
          new Date(res.expiresAt).getTime() <= currentEpoch
        ) {
          hasStockRestored = true;
          res.items.forEach((booked) => {
            const itm = invList.find((i) => i.id === booked.itemId);
            if (itm) {
              itm.stockQuantity += booked.quantity;
            }
          });
          return { ...res, status: "expired" as const };
        }
        return res;
      });

      if (hasStockRestored) {
        try {
          localStorage.setItem(invStorageKey, JSON.stringify(invList));
          localStorage.setItem(resStorageKey, JSON.stringify(resList));
        } catch {}
        syncSchoolSubcollection(schoolId, "store_items", invList).catch(() => {});
        syncSchoolSubcollection(schoolId, "store_reservations", resList).catch(() => {});
      }

      setItems(invList);
      setReservations(resList);
      setSales(salesList);
      setRzpConfig(cfg);
    } catch (e) {
      console.warn("[StudentSchoolStore] Load error:", e);
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

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

  // My reservations & paid online orders
  const myReservations = useMemo(() => {
    return reservations.filter((r) => r.studentId === student.id);
  }, [reservations, student.id]);

  const mySales = useMemo(() => {
    return sales.filter((s) => s.studentId === student.id);
  }, [sales, student.id]);

  const activeReservations = myReservations.filter((r) => r.status === "reserved");

  // 1) 24-Hour Reservation (Pay at Counter)
  const handleConfirmBooking = async () => {
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
      schoolId,
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
          subtotal,
        },
      ],
      totalAmount: subtotal,
      bookedAt: bookedAtIso,
      expiresAt: expiresAtIso,
      status: "reserved",
      notes: "School store 24-hr student reservation",
    };

    const nextItems = items.map((i) =>
      i.id === bookingItem.id
        ? { ...i, stockQuantity: Math.max(0, i.stockQuantity - bookingQty) }
        : i
    );
    const nextReservations = [newBooking, ...reservations];

    try {
      localStorage.setItem(invStorageKey, JSON.stringify(nextItems));
      localStorage.setItem(resStorageKey, JSON.stringify(nextReservations));
      setItems(nextItems);
      setReservations(nextReservations);
      setBookingSuccess(newBooking);
      setBookingItem(null);

      await Promise.allSettled([
        saveSchoolSubdoc(schoolId, "store_reservations", newBooking),
        syncSchoolSubcollection(schoolId, "store_items", nextItems),
      ]);

      speakNotification(
        "स्टोर बुकिंग सफल",
        `आपका ऑर्डर ${orderId} 24 घंटे के लिए बुक हो गया है। कृपया स्कूल काउंटर से प्राप्त करें।`
      );
    } catch (e: any) {
      toast.error("Booking error: " + (e?.message || "Retry"));
    }
  };

  // 2) Direct Online Payment via Razorpay (NSTA Online) from Catalog Modal
  const handlePayOnlineForItem = async () => {
    if (!bookingItem || bookingQty <= 0) return;
    if (bookingItem.stockQuantity < bookingQty) {
      toast.error("माफ़ करें, पर्याप्त स्टॉक उपलब्ध नहीं है।");
      return;
    }

    const subtotal = bookingItem.salePrice * bookingQty;
    const itemPayload = {
      itemId: bookingItem.id,
      itemName: bookingItem.name,
      category: bookingItem.category,
      sizeOrVariant: bookingItem.sizeOrVariant,
      quantity: bookingQty,
      unitPrice: bookingItem.salePrice,
      subtotal,
    };

    setPayingOnlineId(bookingItem.id);
    await startStudentRazorpayStoreCheckout({
      schoolId,
      schoolName: school?.name || "School Store",
      student,
      items: [itemPayload],
      totalAmount: subtotal,
      onSuccess: async ({ receiptNo, paymentId, orderId, sale }) => {
        setPayingOnlineId(null);
        const nowIso = new Date().toISOString();
        const paidSale: StoreSaleRecord = sale || {
          id: `sale-rzp-${orderId}`,
          schoolId,
          receiptNo,
          studentId: student.id,
          studentName: student.name,
          className: student.className || "",
          rollNo: student.rollNo || "",
          items: [
            {
              itemId: itemPayload.itemId,
              itemName: itemPayload.sizeOrVariant
                ? `${itemPayload.itemName} (${itemPayload.sizeOrVariant})`
                : itemPayload.itemName,
              quantity: itemPayload.quantity,
              unitPrice: itemPayload.unitPrice,
              subtotal: itemPayload.subtotal,
            },
          ],
          totalAmount: subtotal,
          paymentMode: "nsta_online",
          date: nowIso.slice(0, 10),
          soldBy: "NSTA Online (Razorpay)",
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          updatedAt: nowIso,
        };

        // Deduct stock permanently and persist sale + stock to cloud & localStorage
        const nextItems = items.map((i) =>
          i.id === bookingItem.id
            ? { ...i, stockQuantity: Math.max(0, i.stockQuantity - bookingQty) }
            : i
        );
        const nextSales = [paidSale, ...sales.filter((s) => s.id !== paidSale.id)];

        try {
          localStorage.setItem(invStorageKey, JSON.stringify(nextItems));
          localStorage.setItem(salesStorageKey, JSON.stringify(nextSales));
        } catch {}

        setItems(nextItems);
        setSales(nextSales);
        setBookingItem(null);
        setPaidOnlineSuccess(paidSale);

        await Promise.allSettled([
          saveSchoolSubdoc(schoolId, "store_sales", paidSale),
          syncSchoolSubcollection(schoolId, "store_items", nextItems),
        ]);

        toast.success(`ऑनलाइन पेमेंट सफल! रसीद #${receiptNo}`);
        speakNotification(
          "स्टोर पेमेंट सफल",
          `₹${subtotal} का स्कूल स्टोर भुगतान सफल हो गया। आपकी रसीद ${receiptNo} तैयार है।`
        );
      },
      onError: (msg) => {
        setPayingOnlineId(null);
        toast.error(msg || "ऑनलाइन पेमेंट पूरा नहीं हो सका");
      },
      onDismiss: () => {
        setPayingOnlineId(null);
      },
    });
  };

  // 3) Pay Online for an Existing 24-Hour Reservation (Stock already deducted at booking time!)
  const handlePayOnlineForReservation = async (res: StoreReservationBooking) => {
    setPayingOnlineId(res.id);
    await startStudentRazorpayStoreCheckout({
      schoolId,
      schoolName: school?.name || "School Store",
      student,
      items: res.items,
      totalAmount: res.totalAmount,
      reservationId: res.id,
      onSuccess: async ({ receiptNo, paymentId, orderId, sale }) => {
        setPayingOnlineId(null);
        const nowIso = new Date().toISOString();
        const paidSale: StoreSaleRecord = sale || {
          id: `sale-rzp-${orderId}`,
          schoolId,
          receiptNo,
          studentId: student.id,
          studentName: student.name,
          className: student.className || "",
          rollNo: student.rollNo || "",
          reservationId: res.id,
          items: res.items.map((it) => ({
            itemId: it.itemId,
            itemName: it.sizeOrVariant ? `${it.itemName} (${it.sizeOrVariant})` : it.itemName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
          })),
          totalAmount: res.totalAmount,
          paymentMode: "nsta_online",
          date: nowIso.slice(0, 10),
          soldBy: "NSTA Online (Razorpay)",
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          updatedAt: nowIso,
        };

        const updatedBooking: StoreReservationBooking = {
          ...res,
          status: "collected",
          collectedAt: nowIso,
          collectedBy: "NSTA Online (Razorpay)",
          paymentMode: "nsta_online",
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          paidAt: nowIso,
          receiptNo,
        };

        const nextReservations = reservations.map((r) => (r.id === res.id ? updatedBooking : r));
        const nextSales = [paidSale, ...sales.filter((s) => s.id !== paidSale.id)];

        try {
          localStorage.setItem(resStorageKey, JSON.stringify(nextReservations));
          localStorage.setItem(salesStorageKey, JSON.stringify(nextSales));
        } catch {}

        setReservations(nextReservations);
        setSales(nextSales);
        setPaidOnlineSuccess(paidSale);

        await Promise.allSettled([
          saveSchoolSubdoc(schoolId, "store_reservations", updatedBooking),
          saveSchoolSubdoc(schoolId, "store_sales", paidSale),
        ]);

        toast.success(`बुकिंग का ऑनलाइन पेमेंट सफल! रसीद #${receiptNo}`);
      },
      onError: (msg) => {
        setPayingOnlineId(null);
        toast.error(msg || "ऑनलाइन पेमेंट पूरा नहीं हो सका");
      },
      onDismiss: () => {
        setPayingOnlineId(null);
      },
    });
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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black tracking-wide text-white">
                School Store (स्कूल स्टोर)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                24H Reservation
              </span>
              {rzpConfig?.enabled && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> NSTA Online Pay
                </span>
              )}
            </div>
            <p className="text-xs text-amber-100 mt-0.5">
              स्कूल की ड्रेस, किताबें व सामग्री {rzpConfig?.enabled ? "सीधे ऑनलाइन पे करें या 24 घंटे के लिए बुक करें!" : "बिना अग्रिम भुगतान 24 घंटे के लिए बुक करें!"}
            </p>
          </div>
        </div>

        {/* Tab switch & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loadingCloud}
            className="p-2 rounded-xl bg-black/30 hover:bg-black/50 text-amber-100 border border-white/10 cursor-pointer"
            title="स्टॉक व ऑर्डर रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCloud ? "animate-spin" : ""}`} />
          </button>
          <div className="flex items-center bg-black/30 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "my_bookings"
                  ? "bg-white text-slate-950 shadow-md"
                  : "text-amber-100 hover:text-white"
              }`}
            >
              ऑर्डर व रसीद ({myReservations.length + mySales.length})
              {activeReservations.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  {activeReservations.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PAID ONLINE RECEIPT CONFIRMATION MODAL */}
      {paidOnlineSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black tracking-wider uppercase">
                NSTA Online Paid ✓
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                Receipt #{paidOnlineSuccess.receiptNo}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                पेमेंट सफल हो गया है! कृपया स्कूल स्टोर काउंटर पर यह रसीद दिखाकर सामग्री प्राप्त करें।
              </p>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5">
              {paidOnlineSuccess.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span>{it.itemName} (×{it.quantity})</span>
                  <strong className="text-white">₹{it.subtotal}</strong>
                </div>
              ))}
              <div className="border-t border-slate-800 pt-2 flex justify-between text-slate-200 font-black">
                <span>कुल भुगतान (NSTA Online):</span>
                <span className="text-emerald-400">₹{paidOnlineSuccess.totalAmount}</span>
              </div>
              {paidOnlineSuccess.razorpayPaymentId && (
                <div className="text-[10px] font-mono text-slate-400 pt-1">
                  Payment ID: {paidOnlineSuccess.razorpayPaymentId}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setPaidOnlineSuccess(null);
                setActiveTab("my_bookings");
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              मेरी रसीदें देखें (View Receipts)
            </button>
          </div>
        </div>
      )}

      {/* 24H RESERVATION SUCCESS CONFIRMATION MODAL */}
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

      {/* BOOKING / ONLINE PAY MODAL */}
      {bookingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm text-white">स्टोर सामग्री खरीदें / बुक करें</h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
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
                  className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono font-bold text-base text-white">
                  {bookingQty}
                </span>
                <button
                  type="button"
                  onClick={() => setBookingQty((prev) => Math.min(bookingItem.stockQuantity, prev + 1))}
                  className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer"
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
              <span className="text-slate-300">कुल राशि (Total Payable):</span>
              <strong className="text-base font-black text-amber-300">
                ₹{(bookingItem.salePrice * bookingQty).toLocaleString("en-IN")}
              </strong>
            </div>

            {/* Action Buttons: Online Pay + 24H Counter Reserve */}
            <div className="space-y-2 pt-1">
              {rzpConfig?.enabled ? (
                <button
                  type="button"
                  disabled={payingOnlineId === bookingItem.id}
                  onClick={handlePayOnlineForItem}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {payingOnlineId === bookingItem.id
                      ? "Razorpay खुल रहा है..."
                      : `Pay Online Now ₹${bookingItem.salePrice * bookingQty} (NSTA Online)`}
                  </span>
                </button>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] text-slate-400 text-center">
                  ऑनलाइन पेमेंट स्कूल द्वारा सक्रिय होने पर यहाँ UPI / Card बटन दिखेगा।
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookingItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  24h बुक करें (Pay at Counter)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATALOG VIEW */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
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
                  className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
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

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
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
                      className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        isOutOfStock
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                          : rzpConfig?.enabled
                          ? "bg-gradient-to-r from-emerald-500 to-amber-500 hover:brightness-110 text-slate-950 shadow-md active:scale-95"
                          : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95"
                      }`}
                    >
                      <ShoppingBag size={13} />
                      <span>{rzpConfig?.enabled ? "खरीदें / Pay Online" : "24h बुक करें"}</span>
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

      {/* MY BOOKINGS & PAID STORE RECEIPTS VIEW */}
      {activeTab === "my_bookings" && (
        <div className="space-y-4">
          {/* Paid Store Receipts (NSTA Online / QR / Counter) */}
          {mySales.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-black px-1">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" />
                  मेरी भुगतान रसीदें (Paid Store Receipts)
                </span>
                <span>{mySales.length} रसीद</span>
              </div>
              {mySales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setPaidOnlineSuccess(sale)}
                  className="p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/90 text-left space-y-2 cursor-pointer hover:border-emerald-400/60 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-300">
                      #{sale.receiptNo}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                      ✓ {formatStorePaymentModeLabel(sale)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {sale.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-300">
                        <span>{it.itemName} × {it.quantity}</span>
                        <strong className="text-white font-mono">₹{it.subtotal}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{sale.date}</span>
                    <strong className="text-emerald-400 font-black text-sm">
                      कुल जमा: ₹{sale.totalAmount}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 24-Hour Reservations */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
            <span>आपकी 24-Hr बुकिंग (Store Reservations):</span>
            <span>कुल: {myReservations.length}</span>
          </div>

          <div className="space-y-3">
            {myReservations.map((res) => {
              const isReserved = res.status === "reserved";
              const isCollected = res.status === "collected";
              const isExpired =
                res.status === "expired" ||
                (isReserved && new Date(res.expiresAt).getTime() <= nowTs);
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
                        ✓ {res.paymentMode === "nsta_online" || res.razorpayPaymentId ? "NSTA Online Paid ✓" : "प्राप्त व भुगतान हो गया"}
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

                  <div className="space-y-1 my-2">
                    {res.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-300">
                        <span>{it.itemName} ({it.sizeOrVariant || "Standard"}) × {it.quantity}</span>
                        <strong className="text-white font-mono">₹{it.subtotal}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="text-slate-400">
                      बुक किया: {new Date(res.bookedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div>
                        <span className="text-slate-400 mr-1.5">कुल राशि:</span>
                        <strong className="text-amber-400 font-black text-sm">₹{res.totalAmount}</strong>
                      </div>
                      {isReserved && !isExpired && rzpConfig?.enabled && (
                        <button
                          type="button"
                          disabled={payingOnlineId === res.id}
                          onClick={() => handlePayOnlineForReservation(res)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-60"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{payingOnlineId === res.id ? "खुल रहा है..." : "Pay Online Now"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {myReservations.length === 0 && mySales.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                आपने अभी तक कोई सामग्री बुक या ऑनलाइन ऑर्डर नहीं की है।
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
