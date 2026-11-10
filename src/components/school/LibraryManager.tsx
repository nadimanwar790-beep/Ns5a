// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Book, BookOpen, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  RotateCcw, ArrowRight, Printer, Trash2, Edit3, Filter, Users,
  Bookmark, ChevronLeft, Calendar, Sparkles, Tag, IndianRupee,
  ShoppingBag, Shirt, PenTool, Image as ImageIcon, Upload, Check,
  Package, X, Eye, Phone, User, CheckCheck, RefreshCw, AlertCircle
} from "lucide-react";
import type {
  School, SchoolStudent, SchoolTeacher, SchoolClass
} from "../../school-types";

interface Props {
  school: School;
  students?: SchoolStudent[];
  teachers?: SchoolTeacher[];
  classes?: SchoolClass[];
  isAdmin?: boolean;
  currentStudent?: SchoolStudent;
  currentTeacherId?: string;
  onBack?: () => void;
}

export type InventoryType = "BOOK" | "DRESS" | "STATIONERY";

export interface LibraryStoreItem {
  id: string;
  schoolId: string;
  itemType: InventoryType; // "BOOK" | "DRESS" | "STATIONERY"
  code: string; // SKU or Accession No (e.g. LIB-1001, DRS-2001, STN-3001)
  title: string;
  authorOrBrand?: string;
  subCategory: string;
  targetClass?: string; // e.g. "Class 10", "All Classes", "Size 32"
  shelfLocation?: string; // e.g. "Rack A-3", "Store Room 1"
  imageUrl?: string;
  rate: number; // MRP / Regular Rate in ₹
  discountPct: number; // Discount % (e.g. 10%, 20%)
  discountedPrice: number; // Final School Price in ₹ (Rate - Discount)
  totalStock: number; // Total stock quantity
  availableStock: number; // Currently available
  addedAt: string;
}

export interface ItemBookingRecord {
  id: string;
  schoolId: string;
  itemId: string;
  itemTitle: string;
  itemType: InventoryType;
  code: string;
  borrowerType: "student" | "teacher" | "staff";
  borrowerId: string;
  borrowerName: string;
  borrowerClass?: string;
  borrowerRoll?: string;
  borrowerPhone?: string;
  quantityBooked: number;
  ratePerUnit: number;
  totalAmount: number;
  bookingDate: string;
  dueDate?: string; // for books return
  status: "issued" | "returned" | "delivered" | "booked";
  returnDate?: string;
  paymentStatus: "paid" | "unpaid" | "fee_ledger";
  notes?: string;
}

// Preset visual images for fast 1-tap photo selection
const PRESET_IMAGES = {
  BOOK: [
    { label: "Physics Book", url: "https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=400&q=80" },
    { label: "Maths Book", url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80" },
    { label: "Literature Book", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80" },
    { label: "Science & Bio", url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&q=80" },
    { label: "Notebook 6-Pack", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80" },
  ],
  DRESS: [
    { label: "School Shirt & Tie", url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80" },
    { label: "Winter Blazer (Navy)", url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80" },
    { label: "School Tracksuit", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80" },
    { label: "P.T. Sports Uniform", url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&q=80" },
    { label: "School Belt & Socks", url: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=400&q=80" },
  ],
  STATIONERY: [
    { label: "Geometry Box & Tools", url: "https://images.unsplash.com/photo-1585336261026-6a84eb771340?w=400&q=80" },
    { label: "School Backpack / Bag", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80" },
    { label: "Art & Colouring Kit", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80" },
    { label: "Pen & Pencil Box", url: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=80" },
    { label: "Water Bottle & Lunch", url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80" },
  ]
};

export const LibraryManager: React.FC<Props> = ({
  school,
  students = [],
  teachers = [],
  classes = [],
  isAdmin = true,
  currentStudent,
  currentTeacherId,
  onBack
}) => {
  const schoolId = school?.id || "SCH-001";
  const itemsStorageKey = useMemo(() => `nst_school_inventory_items_${schoolId}`, [schoolId]);
  const bookingsStorageKey = useMemo(() => `nst_school_inventory_bookings_${schoolId}`, [schoolId]);

  // ── 1. INVENTORY ITEMS STATE (Books, Dresses, Stationery) ─────────────────
  const [items, setItems] = useState<LibraryStoreItem[]>(() => {
    try {
      const saved = localStorage.getItem(itemsStorageKey);
      if (saved) return JSON.parse(saved);
      // Migrate legacy library books if any
      const legacyLib = localStorage.getItem(`nst_school_lib_books_${schoolId}`);
      if (legacyLib) {
        const parsed = JSON.parse(legacyLib);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: any) => ({
            id: b.id || `item-${Date.now()}`,
            schoolId,
            itemType: "BOOK",
            code: b.accessionNo || "LIB-1001",
            title: b.title || "Library Book",
            authorOrBrand: b.author || "Author",
            subCategory: b.category || "General",
            targetClass: "All Classes",
            shelfLocation: b.shelfLocation || "Rack A",
            imageUrl: PRESET_IMAGES.BOOK[0].url,
            rate: 350,
            discountPct: 15,
            discountedPrice: 298,
            totalStock: b.totalCopies || 5,
            availableStock: b.availableCopies !== undefined ? b.availableCopies : (b.totalCopies || 5),
            addedAt: b.addedAt || new Date().toISOString().split("T")[0]
          }));
        }
      }
    } catch {}

    // Initial rich realistic seed dataset
    return [
      {
        id: "item-b1",
        schoolId,
        itemType: "BOOK",
        code: "LIB-1001",
        title: "Concepts of Physics (Vol 1)",
        authorOrBrand: "Dr. H.C. Verma",
        subCategory: "Science & Physics",
        targetClass: "Class 11-12",
        shelfLocation: "Rack A-3",
        imageUrl: PRESET_IMAGES.BOOK[0].url,
        rate: 450,
        discountPct: 15,
        discountedPrice: 382,
        totalStock: 12,
        availableStock: 9,
        addedAt: "2026-01-10"
      },
      {
        id: "item-b2",
        schoolId,
        itemType: "BOOK",
        code: "LIB-1002",
        title: "Secondary School Mathematics",
        authorOrBrand: "R.S. Aggarwal",
        subCategory: "Mathematics",
        targetClass: "Class 9-10",
        shelfLocation: "Rack B-1",
        imageUrl: PRESET_IMAGES.BOOK[1].url,
        rate: 390,
        discountPct: 10,
        discountedPrice: 351,
        totalStock: 20,
        availableStock: 16,
        addedAt: "2026-01-15"
      },
      {
        id: "item-d1",
        schoolId,
        itemType: "DRESS",
        code: "DRS-2001",
        title: "Boys Regular Uniform Shirt (Sky Blue)",
        authorOrBrand: "Mafatlal Fabric",
        subCategory: "Boys Uniform",
        targetClass: "Class 6-8 (Size 32)",
        shelfLocation: "Almirah 2, Shelf B",
        imageUrl: PRESET_IMAGES.DRESS[0].url,
        rate: 550,
        discountPct: 20,
        discountedPrice: 440,
        totalStock: 35,
        availableStock: 28,
        addedAt: "2026-02-01"
      },
      {
        id: "item-d2",
        schoolId,
        itemType: "DRESS",
        code: "DRS-2002",
        title: "Winter School Blazer with Crest",
        authorOrBrand: "Raymond Wool Blend",
        subCategory: "Winter Uniform",
        targetClass: "Class 9-12 (Size 36)",
        shelfLocation: "Almirah 1, Shelf A",
        imageUrl: PRESET_IMAGES.DRESS[1].url,
        rate: 1800,
        discountPct: 25,
        discountedPrice: 1350,
        totalStock: 15,
        availableStock: 11,
        addedAt: "2026-02-10"
      },
      {
        id: "item-s1",
        schoolId,
        itemType: "STATIONERY",
        code: "STN-3001",
        title: "Camlin Scholar Geometry Box",
        authorOrBrand: "Camlin Kokuyo",
        subCategory: "Maths & Geometry",
        targetClass: "Class 6-12",
        shelfLocation: "Box A-10",
        imageUrl: PRESET_IMAGES.STATIONERY[0].url,
        rate: 180,
        discountPct: 10,
        discountedPrice: 162,
        totalStock: 50,
        availableStock: 42,
        addedAt: "2026-02-15"
      },
      {
        id: "item-s2",
        schoolId,
        itemType: "STATIONERY",
        code: "STN-3002",
        title: "Heavy Duty School Ergonomic Backpack",
        authorOrBrand: "Skybags / Wildcraft",
        subCategory: "School Bags",
        targetClass: "All Classes",
        shelfLocation: "Store Rack C",
        imageUrl: PRESET_IMAGES.STATIONERY[1].url,
        rate: 1200,
        discountPct: 30,
        discountedPrice: 840,
        totalStock: 25,
        availableStock: 20,
        addedAt: "2026-02-20"
      }
    ];
  });

  // ── 2. BOOKINGS & ISSUES LEDGER STATE (Who booked what) ─────────────────
  const [bookings, setBookings] = useState<ItemBookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(bookingsStorageKey);
      if (saved) return JSON.parse(saved);
      // Migrate legacy issues if any
      const legacyIssues = localStorage.getItem(`nst_school_lib_issues_${schoolId}`);
      if (legacyIssues) {
        const parsed = JSON.parse(legacyIssues);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((i: any) => ({
            id: i.id || `issue-${Date.now()}`,
            schoolId,
            itemId: i.bookId || "item-b1",
            itemTitle: i.bookTitle || "Physics Vol 1",
            itemType: "BOOK",
            code: i.accessionNo || "LIB-1001",
            borrowerType: i.borrowerType || "student",
            borrowerId: i.borrowerId || "std-1",
            borrowerName: i.borrowerName || "Student",
            borrowerClass: i.borrowerClass || "Class 10",
            borrowerRoll: i.borrowerRoll || "01",
            borrowerPhone: i.borrowerPhone || "9876543210",
            quantityBooked: 1,
            ratePerUnit: 382,
            totalAmount: 382,
            bookingDate: i.issueDate || "2026-03-01",
            dueDate: i.dueDate || "2026-03-15",
            status: i.status || "issued",
            returnDate: i.returnDate,
            paymentStatus: "paid"
          }));
        }
      }
    } catch {}

    return [
      {
        id: "bookg-1",
        schoolId,
        itemId: "item-b1",
        itemTitle: "Concepts of Physics (Vol 1)",
        itemType: "BOOK",
        code: "LIB-1001",
        borrowerType: "student",
        borrowerId: students[0]?.id || "std-101",
        borrowerName: students[0]?.name || "Aarav Sharma",
        borrowerClass: "Class 11-A",
        borrowerRoll: "04",
        borrowerPhone: "9876543210",
        quantityBooked: 1,
        ratePerUnit: 382,
        totalAmount: 382,
        bookingDate: "2026-03-01",
        dueDate: "2026-03-15",
        status: "issued",
        paymentStatus: "paid",
        notes: "Reading for Unit Test"
      },
      {
        id: "bookg-2",
        schoolId,
        itemId: "item-d1",
        itemTitle: "Boys Regular Uniform Shirt (Sky Blue)",
        itemType: "DRESS",
        code: "DRS-2001",
        borrowerType: "student",
        borrowerId: students[1]?.id || "std-102",
        borrowerName: students[1]?.name || "Rohan Verma",
        borrowerClass: "Class 7-B",
        borrowerRoll: "12",
        borrowerPhone: "9812345678",
        quantityBooked: 2,
        ratePerUnit: 440,
        totalAmount: 880,
        bookingDate: "2026-03-02",
        status: "booked",
        paymentStatus: "paid",
        notes: "Summer session uniform order"
      },
      {
        id: "bookg-3",
        schoolId,
        itemId: "item-s1",
        itemTitle: "Camlin Scholar Geometry Box",
        itemType: "STATIONERY",
        code: "STN-3001",
        borrowerType: "student",
        borrowerId: students[2]?.id || "std-103",
        borrowerName: students[2]?.name || "Pooja Patel",
        borrowerClass: "Class 8-A",
        borrowerRoll: "08",
        borrowerPhone: "9789012345",
        quantityBooked: 1,
        ratePerUnit: 162,
        totalAmount: 162,
        bookingDate: "2026-03-03",
        status: "delivered",
        paymentStatus: "paid",
        notes: "Delivered at school store counter"
      }
    ];
  });

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(itemsStorageKey, JSON.stringify(items));
    } catch {}
  }, [items, itemsStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(bookingsStorageKey, JSON.stringify(bookings));
    } catch {}
  }, [bookings, bookingsStorageKey]);

  // Active View Filter
  const [activeCategory, setActiveCategory] = useState<"ALL" | InventoryType>("ALL");
  const [activeTab, setActiveTab] = useState<"catalog" | "bookings_ledger">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>("ALL");

  // ── MODALS STATE ────────────────────────────────────────────────────────
  // 1. Add / Edit Item Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryStoreItem | null>(null);
  const [formType, setFormType] = useState<InventoryType>("BOOK");
  const [formTitle, setFormTitle] = useState("");
  const [formAuthorBrand, setFormAuthorBrand] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formSubCat, setFormSubCat] = useState("");
  const [formTargetClass, setFormTargetClass] = useState("");
  const [formShelf, setFormShelf] = useState("");
  const [formRate, setFormRate] = useState<number>(350);
  const [formDiscountPct, setFormDiscountPct] = useState<number>(10);
  const [formStock, setFormStock] = useState<number>(10);
  const [formImageUrl, setFormImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Book / Issue Item Modal
  const [bookingTargetItem, setBookingTargetItem] = useState<LibraryStoreItem | null>(null);
  const [bookBorrowerType, setBookBorrowerType] = useState<"student" | "teacher" | "staff">("student");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [customBorrowerName, setCustomBorrowerName] = useState("");
  const [customBorrowerClass, setCustomBorrowerClass] = useState("");
  const [customBorrowerPhone, setCustomBorrowerPhone] = useState("");
  const [bookQuantity, setBookQuantity] = useState(1);
  const [bookDueDate, setBookDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [bookPaymentMode, setBookPaymentMode] = useState<"paid" | "unpaid" | "fee_ledger">("paid");
  const [bookNotes, setBookNotes] = useState("");

  // Open Add Modal
  const handleOpenAddModal = (presetType: InventoryType = "BOOK") => {
    setEditingItem(null);
    setFormType(presetType);
    setFormTitle("");
    setFormAuthorBrand("");
    setFormCode(
      presetType === "BOOK"
        ? `LIB-${Math.floor(1000 + Math.random() * 9000)}`
        : presetType === "DRESS"
        ? `DRS-${Math.floor(2000 + Math.random() * 8000)}`
        : `STN-${Math.floor(3000 + Math.random() * 7000)}`
    );
    setFormSubCat(
      presetType === "BOOK"
        ? "Science & Maths"
        : presetType === "DRESS"
        ? "Daily Uniform"
        : "School Stationery"
    );
    setFormTargetClass("All Classes");
    setFormShelf("Store Room Shelf 1");
    setFormRate(presetType === "DRESS" ? 650 : presetType === "BOOK" ? 350 : 150);
    setFormDiscountPct(10);
    setFormStock(15);
    setFormImageUrl(PRESET_IMAGES[presetType][0].url);
    setShowItemModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: LibraryStoreItem) => {
    setEditingItem(item);
    setFormType(item.itemType);
    setFormTitle(item.title);
    setFormAuthorBrand(item.authorOrBrand || "");
    setFormCode(item.code);
    setFormSubCat(item.subCategory);
    setFormTargetClass(item.targetClass || "");
    setFormShelf(item.shelfLocation || "");
    setFormRate(item.rate);
    setFormDiscountPct(item.discountPct);
    setFormStock(item.totalStock);
    setFormImageUrl(item.imageUrl || "");
    setShowItemModal(true);
  };

  // Image upload handler (converts to base64 data URL)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("कृपया 2MB से कम साइज की फोटो चुनें।");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Item (Add or Update)
  const handleSaveItem = () => {
    if (!formTitle.trim()) {
      toast.error("कृपया आइटम का नाम अवश्य भरें।");
      return;
    }

    const rateVal = Math.max(0, Number(formRate) || 0);
    const discVal = Math.max(0, Math.min(100, Number(formDiscountPct) || 0));
    const discounted = Math.round(rateVal - (rateVal * discVal) / 100);
    const totalStk = Math.max(0, Number(formStock) || 0);

    if (editingItem) {
      // Update existing item
      const bookedCount = editingItem.totalStock - editingItem.availableStock;
      const updatedAvailable = Math.max(0, totalStk - bookedCount);

      setItems(prev =>
        prev.map(it =>
          it.id === editingItem.id
            ? {
                ...it,
                itemType: formType,
                title: formTitle.trim(),
                authorOrBrand: formAuthorBrand.trim(),
                code: formCode.trim() || it.code,
                subCategory: formSubCat.trim() || "General",
                targetClass: formTargetClass.trim() || "All",
                shelfLocation: formShelf.trim(),
                imageUrl: formImageUrl || it.imageUrl,
                rate: rateVal,
                discountPct: discVal,
                discountedPrice: discounted,
                totalStock: totalStk,
                availableStock: updatedAvailable
              }
            : it
        )
      );
      toast.success(`✅ "${formTitle}" सफलतापूर्वक अपडेट हुआ!`);
    } else {
      // Create new item
      const newItem: LibraryStoreItem = {
        id: `inv-${Date.now()}`,
        schoolId,
        itemType: formType,
        code: formCode.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        title: formTitle.trim(),
        authorOrBrand: formAuthorBrand.trim(),
        subCategory: formSubCat.trim() || "General",
        targetClass: formTargetClass.trim() || "All",
        shelfLocation: formShelf.trim() || "Store Rack 1",
        imageUrl: formImageUrl || PRESET_IMAGES[formType][0].url,
        rate: rateVal,
        discountPct: discVal,
        discountedPrice: discounted,
        totalStock: totalStk,
        availableStock: totalStk,
        addedAt: new Date().toISOString().split("T")[0]
      };
      setItems(prev => [newItem, ...prev]);
      toast.success(`🎉 नया आइटम "${formTitle}" स्टॉक में दर्ज हो गया!`);
    }
    setShowItemModal(false);
  };

  // Delete Item
  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`क्या आप "${name}" को स्थायी रूप से स्टॉक से हटाना चाहते हैं?`)) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("आइटम हटा दिया गया।");
    }
  };

  // ── BOOK / ISSUE ITEM HANDLER ───────────────────────────────────────────
  const handleOpenBookModal = (item: LibraryStoreItem) => {
    if (item.availableStock <= 0) {
      toast.error("यह आइटम अभी आउट-ऑफ-स्टॉक (Out of Stock) है!");
      return;
    }
    setBookingTargetItem(item);
    setBookQuantity(1);
    setSelectedStudentId(students[0]?.id || "");
    setSelectedTeacherId(teachers[0]?.id || "");
    setCustomBorrowerName("");
    setCustomBorrowerClass("");
    setCustomBorrowerPhone("");
    setBookPaymentMode("paid");
    setBookNotes("");
  };

  const handleConfirmBooking = () => {
    if (!bookingTargetItem) return;

    if (bookQuantity <= 0 || bookQuantity > bookingTargetItem.availableStock) {
      toast.error(`मान्य संख्या चुनें (उपलब्ध स्टॉक: ${bookingTargetItem.availableStock})`);
      return;
    }

    let bName = "Borrower";
    let bClass = "General";
    let bRoll = "—";
    let bPhone = "";
    let bId = "unknown";

    if (bookBorrowerType === "student") {
      const st = students.find(s => s.id === selectedStudentId);
      if (st) {
        bName = st.name;
        bClass = st.className || "Class";
        bRoll = st.rollNo || "—";
        bPhone = st.phone || "";
        bId = st.id;
      } else if (customBorrowerName.trim()) {
        bName = customBorrowerName.trim();
        bClass = customBorrowerClass.trim() || "Student";
        bPhone = customBorrowerPhone.trim();
        bId = `guest-st-${Date.now()}`;
      }
    } else {
      const tc = teachers.find(t => t.id === selectedTeacherId);
      if (tc) {
        bName = tc.name;
        bClass = "Faculty";
        bPhone = tc.phone || "";
        bId = tc.id;
      } else if (customBorrowerName.trim()) {
        bName = customBorrowerName.trim();
        bClass = "Staff";
        bPhone = customBorrowerPhone.trim();
        bId = `guest-tc-${Date.now()}`;
      }
    }

    const totalAmt = bookingTargetItem.discountedPrice * bookQuantity;
    const initialStatus = bookingTargetItem.itemType === "BOOK" ? "issued" : "booked";

    const newRecord: ItemBookingRecord = {
      id: `bk-${Date.now()}`,
      schoolId,
      itemId: bookingTargetItem.id,
      itemTitle: bookingTargetItem.title,
      itemType: bookingTargetItem.itemType,
      code: bookingTargetItem.code,
      borrowerType: bookBorrowerType,
      borrowerId: bId,
      borrowerName: bName,
      borrowerClass: bClass,
      borrowerRoll: bRoll,
      borrowerPhone: bPhone,
      quantityBooked: bookQuantity,
      ratePerUnit: bookingTargetItem.discountedPrice,
      totalAmount: totalAmt,
      bookingDate: new Date().toISOString().split("T")[0],
      dueDate: bookingTargetItem.itemType === "BOOK" ? bookDueDate : undefined,
      status: initialStatus,
      paymentStatus: bookPaymentMode,
      notes: bookNotes.trim()
    };

    // Decrease available stock of the item
    setItems(prev =>
      prev.map(it =>
        it.id === bookingTargetItem.id
          ? { ...it, availableStock: Math.max(0, it.availableStock - bookQuantity) }
          : it
      )
    );

    // Append to bookings
    setBookings(prev => [newRecord, ...prev]);
    setBookingTargetItem(null);
    toast.success(
      `🎉 ${bName} के नाम पर ${bookQuantity} x "${bookingTargetItem.title}" सफलतापूर्वक बुक/इश्यू हो गया!`
    );
  };

  // Mark Book Returned
  const handleMarkReturned = (record: ItemBookingRecord) => {
    const today = new Date().toISOString().split("T")[0];
    setBookings(prev =>
      prev.map(b => (b.id === record.id ? { ...b, status: "returned", returnDate: today } : b))
    );
    // Increase stock back
    setItems(prev =>
      prev.map(it =>
        it.id === record.itemId
          ? { ...it, availableStock: Math.min(it.totalStock, it.availableStock + record.quantityBooked) }
          : it
      )
    );
    toast.success(`📖 "${record.itemTitle}" सुरक्षित वापस जमा हो गई और स्टॉक में +${record.quantityBooked} जुड़ गया!`);
  };

  // Mark Dress / Stationery Delivered
  const handleMarkDelivered = (record: ItemBookingRecord) => {
    setBookings(prev =>
      prev.map(b => (b.id === record.id ? { ...b, status: "delivered" } : b))
    );
    toast.success(`👕 "${record.itemTitle}" छात्र को डिलीवर मार्क कर दिया गया!`);
  };

  // Delete booking record
  const handleDeleteBooking = (record: ItemBookingRecord) => {
    if (window.confirm("क्या आप यह बुकिंग रिकॉर्ड हटाना चाहते हैं?")) {
      if (record.status !== "returned") {
        // Rollback stock
        setItems(prev =>
          prev.map(it =>
            it.id === record.itemId
              ? { ...it, availableStock: Math.min(it.totalStock, it.availableStock + record.quantityBooked) }
              : it
          )
        );
      }
      setBookings(prev => prev.filter(b => b.id !== record.id));
      toast.success("बुकिंग रिकॉर्ड हटा दिया गया।");
    }
  };

  // ── FILTERED DATA ────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (activeCategory !== "ALL" && it.itemType !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          it.title.toLowerCase().includes(q) ||
          it.code.toLowerCase().includes(q) ||
          (it.authorOrBrand && it.authorOrBrand.toLowerCase().includes(q)) ||
          it.subCategory.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, activeCategory, searchQuery]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (activeCategory !== "ALL" && b.itemType !== activeCategory) return false;
      if (ledgerStatusFilter !== "ALL" && b.status !== ledgerStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.borrowerName.toLowerCase().includes(q) ||
          b.itemTitle.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          (b.borrowerClass && b.borrowerClass.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [bookings, activeCategory, ledgerStatusFilter, searchQuery]);

  // Overall KPIs
  const totalStockSum = useMemo(() => items.reduce((s, i) => s + (i.totalStock || 0), 0), [items]);
  const availableStockSum = useMemo(() => items.reduce((s, i) => s + (i.availableStock || 0), 0), [items]);
  const activeBookingsCount = useMemo(
    () => bookings.filter(b => b.status === "issued" || b.status === "booked").length,
    [bookings]
  );
  const totalValuation = useMemo(
    () => items.reduce((s, i) => s + i.discountedPrice * i.totalStock, 0),
    [items]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 text-slate-800 dark:text-slate-100">
      {/* ── TOP BANNER ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white px-4 py-5 shadow-lg border-b border-emerald-800/40 print:hidden">
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
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 text-[11px] font-black uppercase tracking-wider border border-emerald-400/30">
                  Library &amp; School Store
                </span>
                <span className="text-slate-300 text-xs font-semibold">
                  पुस्तकालय, ड्रेस व स्टेशनरी स्टॉक
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <span>Library &amp; Store Management System</span>
              </h1>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition border border-white/20 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>प्रिंट रजिस्टर</span>
            </button>

            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("BOOK")}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  title="नई किताब जोड़ें"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ बुक जोड़ें</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("DRESS")}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  title="नई ड्रेस/यूनिफॉर्म जोड़ें"
                >
                  <Shirt className="w-4 h-4" />
                  <span>+ ड्रेस जोड़ें</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal("STATIONERY")}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  title="स्टेशनरी आइटम जोड़ें"
                >
                  <PenTool className="w-4 h-4" />
                  <span>+ स्टेशनरी जोड़ें</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        {/* ── KPI TILES ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>कुल इन्वेंटरी</span>
              <Package className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {totalStockSum} <span className="text-xs text-slate-400 font-normal">यूनिट्स</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{items.length} अलग-अलग आइटम्स</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>उपलब्ध स्टॉक</span>
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
              {availableStockSum} <span className="text-xs text-slate-400 font-normal">रेडी</span>
            </p>
            <p className="text-[11px] text-teal-600/80 dark:text-teal-400/80 mt-0.5">इश्यू/वितरण हेतु तैयार</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>बुक / जारी सामान</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {activeBookingsCount} <span className="text-xs text-slate-400 font-normal">छात्रों के पास</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">किताबें व ऑर्डर पेंडिंग</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>स्टॉक वैल्यूएशन</span>
              <IndianRupee className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
              ₹{totalValuation.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">स्कूल डिस्काउंटेड रेट पर</p>
          </div>
        </div>

        {/* ── MAIN TABS (CATALOG vs BOOKING LEDGER) ───────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Package className="w-4 h-4 text-emerald-500" />
              <span>स्टॉक कैटलॉग (Items &amp; Rates)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("bookings_ledger")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                activeTab === "bookings_ledger"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>किसके पास क्या बुक है (Allocation Ledger)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {bookings.length}
              </span>
            </button>
          </div>

          {/* Category Filter Pills (Books / Dress / Stationery) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeCategory === "ALL"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              सभी ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("BOOK")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeCategory === "BOOK"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>📚 किताबें (Books)</span>
              <span className="text-[10px] opacity-80">
                ({items.filter(i => i.itemType === "BOOK").length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("DRESS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeCategory === "DRESS"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>👕 ड्रेस (Uniforms)</span>
              <span className="text-[10px] opacity-80">
                ({items.filter(i => i.itemType === "DRESS").length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("STATIONERY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeCategory === "STATIONERY"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>✏️ स्टेशनरी (Stationery)</span>
              <span className="text-[10px] opacity-80">
                ({items.filter(i => i.itemType === "STATIONERY").length})
              </span>
            </button>
          </div>
        </div>

        {/* ── SEARCH & FILTER BAR ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "catalog"
                  ? "आइटम का नाम, लेखक, ब्रांड या कोड (LIB-1001 / DRS-2001) से खोजें..."
                  : "छात्र का नाम, क्लास, रोल नंबर या आइटम के नाम से खोजें..."
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>

          {activeTab === "bookings_ledger" && (
            <select
              value={ledgerStatusFilter}
              onChange={e => setLedgerStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">सभी स्थितियां (All Status)</option>
              <option value="issued">जारी / छात्र के पास (Issued/Booked)</option>
              <option value="returned">वापस जमा (Returned)</option>
              <option value="delivered">डिलीवर हो गया (Delivered)</option>
            </select>
          )}
        </div>

        {/* ── TAB 1: STOCK CATALOG (WITH PICS, RATES, DISCOUNTS & STOCK) ─────── */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                  📦
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  कोई आइटम नहीं मिला
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  अपनी लाइब्रेरी, ड्रेस या स्टेशनरी स्टॉक में नया आइटम जोड़ने के लिए ऊपर दिए गए बटन पर क्लिक करें।
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal("BOOK")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    + नया आइटम जोड़ें
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => {
                  const isOutOfStock = item.availableStock <= 0;
                  const isLowStock = item.availableStock > 0 && item.availableStock <= 3;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md hover:border-emerald-400 transition overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Image Container with Badges */}
                        <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                              <ImageIcon className="w-10 h-10 opacity-40" />
                              <span className="text-[11px] mt-1 font-bold">तस्वीर उपलब्ध नहीं</span>
                            </div>
                          )}

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                item.itemType === "BOOK"
                                  ? "bg-emerald-600 text-white"
                                  : item.itemType === "DRESS"
                                  ? "bg-cyan-600 text-white"
                                  : "bg-purple-600 text-white"
                              }`}
                            >
                              {item.itemType === "BOOK"
                                ? "📚 किताब"
                                : item.itemType === "DRESS"
                                ? "👕 ड्रेस"
                                : "✏️ स्टेशनरी"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white font-mono text-[10px] font-bold">
                              #{item.code}
                            </span>
                          </div>

                          {/* Discount Tag */}
                          {item.discountPct > 0 && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black shadow-md flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              <span>{item.discountPct}% छूट</span>
                            </div>
                          )}

                          {/* Stock Status Pill */}
                          <div className="absolute bottom-2 left-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                                isOutOfStock
                                  ? "bg-red-600/90 text-white"
                                  : isLowStock
                                  ? "bg-amber-500/90 text-slate-950"
                                  : "bg-emerald-600/90 text-white"
                              }`}
                            >
                              {isOutOfStock
                                ? "Out of Stock"
                                : isLowStock
                                ? `अंतिम ${item.availableStock} शेष`
                                : `स्टॉक में: ${item.availableStock}`}
                            </span>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-4 space-y-2.5">
                          <div>
                            <p className="text-[11px] font-bold text-slate-400">
                              {item.subCategory} • {item.targetClass || "All"}
                            </p>
                            <h3 className="font-black text-sm text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                              {item.title}
                            </h3>
                            {item.authorOrBrand && (
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {item.itemType === "BOOK" ? "लेखक:" : "ब्रांड:"} {item.authorOrBrand}
                              </p>
                            )}
                          </div>

                          {/* Price & Discount HUD */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400">स्कूल रेट:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  ₹{item.discountedPrice}
                                </span>
                                {item.discountPct > 0 && (
                                  <span className="text-xs line-through text-slate-400 tabular-nums">
                                    ₹{item.rate}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400">उपलब्ध / कुल:</span>
                              <p className="text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums">
                                {item.availableStock} / {item.totalStock}
                              </p>
                            </div>
                          </div>

                          {/* Location Shelf */}
                          {item.shelfLocation && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span>📍 स्थान:</span>
                              <strong className="text-slate-600 dark:text-slate-300">
                                {item.shelfLocation}
                              </strong>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                        <button
                          type="button"
                          onClick={() => handleOpenBookModal(item)}
                          disabled={isOutOfStock}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{item.itemType === "BOOK" ? "इश्यू करें" : "बुक करें / दें"}</span>
                        </button>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                              title="एडिट करें"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.title)}
                              className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                              title="हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: BOOKINGS & ALLOCATION LEDGER (WHO BOOKED WHAT) ──────────── */}
        {activeTab === "bookings_ledger" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    छात्र व स्टाफ आवंटन बहीखाता (Issued &amp; Booked Items Ledger)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    किसके पास कौन-सी किताब, ड्रेस या स्टेशनरी है और वापसी/डिलीवरी की क्या स्थिति है
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black border border-indigo-200 dark:border-indigo-800">
                  कुल {filteredBookings.length} आवंटन रिकॉर्ड्स
                </span>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    इस फिल्टर में कोई बुकिंग या इश्यू रिकॉर्ड नहीं है।
                  </p>
                  <p>कैटलॉग में जाकर किसी भी छात्र को बुक या इश्यू करें।</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">छात्र / स्टाफ विवरण</th>
                        <th className="p-3">सामान विवरण (Item)</th>
                        <th className="p-3">प्रकार</th>
                        <th className="p-3 text-center">संख्या (Qty)</th>
                        <th className="p-3 text-right">मूल्य (Amount)</th>
                        <th className="p-3">तारीख व वापसी (Dates)</th>
                        <th className="p-3">स्थिति (Status)</th>
                        <th className="p-3 text-right">एक्शन</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 tabular-nums">
                      {filteredBookings.map(rec => {
                        const isReturned = rec.status === "returned";
                        const isDelivered = rec.status === "delivered";
                        const isOverdue =
                          rec.status === "issued" &&
                          rec.dueDate &&
                          new Date().toISOString().split("T")[0] > rec.dueDate;

                        return (
                          <tr
                            key={rec.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition ${
                              isOverdue ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                            }`}
                          >
                            {/* Borrower */}
                            <td className="p-3 font-medium">
                              <p className="font-black text-slate-900 dark:text-white">
                                {rec.borrowerName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {rec.borrowerClass} {rec.borrowerRoll !== "—" ? `• Roll #${rec.borrowerRoll}` : ""}
                              </p>
                              {rec.borrowerPhone && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{rec.borrowerPhone}</span>
                                </p>
                              )}
                            </td>

                            {/* Item */}
                            <td className="p-3">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {rec.itemTitle}
                              </p>
                              <span className="font-mono text-[10px] text-slate-400">
                                #{rec.code}
                              </span>
                            </td>

                            {/* Type */}
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                  rec.itemType === "BOOK"
                                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                                    : rec.itemType === "DRESS"
                                    ? "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300"
                                    : "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300"
                                }`}
                              >
                                {rec.itemType === "BOOK"
                                  ? "किताब"
                                  : rec.itemType === "DRESS"
                                  ? "ड्रेस"
                                  : "स्टेशनरी"}
                              </span>
                            </td>

                            {/* Qty */}
                            <td className="p-3 text-center font-black text-slate-800 dark:text-slate-200">
                              {rec.quantityBooked}
                            </td>

                            {/* Amount */}
                            <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                              ₹{rec.totalAmount}
                              <span className="block text-[9px] font-normal text-slate-400">
                                {rec.paymentStatus === "paid" ? "✅ चुकता" : "⚠️ बाकी"}
                              </span>
                            </td>

                            {/* Dates */}
                            <td className="p-3 text-[11px] text-slate-500">
                              <div>बुकिंग: <strong>{rec.bookingDate}</strong></div>
                              {rec.dueDate && (
                                <div className={isOverdue ? "text-rose-600 font-bold" : ""}>
                                  ड्यू: {rec.dueDate} {isOverdue ? "(Overdue ⚠️)" : ""}
                                </div>
                              )}
                              {rec.returnDate && (
                                <div className="text-teal-600 font-bold">
                                  वापसी: {rec.returnDate}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              {isReturned ? (
                                <span className="px-2 py-1 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 text-[10px] font-black inline-flex items-center gap-1">
                                  <CheckCheck className="w-3 h-3" />
                                  <span>वापस जमा</span>
                                </span>
                              ) : isDelivered ? (
                                <span className="px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>डिलीवर हुआ</span>
                                </span>
                              ) : isOverdue ? (
                                <span className="px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-black inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>समय समाप्त</span>
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-black inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{rec.itemType === "BOOK" ? "छात्र के पास" : "बुक / लंबित"}</span>
                                </span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {rec.itemType === "BOOK" && !isReturned && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkReturned(rec)}
                                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] cursor-pointer shadow-xs transition active:scale-95"
                                    title="किताब वापस जमा करें"
                                  >
                                    वापस लें
                                  </button>
                                )}

                                {rec.itemType !== "BOOK" && !isDelivered && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkDelivered(rec)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer shadow-xs transition active:scale-95"
                                    title="छात्र को डिलीवर करें"
                                  >
                                    डिलीवर करें
                                  </button>
                                )}

                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBooking(rec)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer transition"
                                    title="रिकॉर्ड हटाएं"
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
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD / EDIT INVENTORY ITEM ──────────────────────────────── */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-8 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    {editingItem ? "आइटम एडिट करें" : "नया आइटम स्टॉक में जोड़ें"}
                  </h3>
                  <p className="text-[11px] text-slate-400">फोटो, रेट, डिस्काउंट और स्टॉक दर्ज करें</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {/* Category selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  सामान का प्रकार (Category) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("BOOK");
                      if (!formImageUrl) setFormImageUrl(PRESET_IMAGES.BOOK[0].url);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === "BOOK"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span>📚 किताब (Book)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("DRESS");
                      if (!formImageUrl) setFormImageUrl(PRESET_IMAGES.DRESS[0].url);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === "DRESS"
                        ? "bg-cyan-600 text-white border-cyan-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span>👕 ड्रेस (Dress)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("STATIONERY");
                      if (!formImageUrl) setFormImageUrl(PRESET_IMAGES.STATIONERY[0].url);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === "STATIONERY"
                        ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span>✏️ स्टेशनरी</span>
                  </button>
                </div>
              </div>

              {/* Title & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    आइटम का नाम (Title/Name) *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Physics Class 11, Summer Shirt..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    {formType === "BOOK" ? "लेखक (Author)" : "ब्रांड / फैब्रिक (Brand)"}
                  </label>
                  <input
                    type="text"
                    value={formAuthorBrand}
                    onChange={e => setFormAuthorBrand(e.target.value)}
                    placeholder="e.g. NCERT, Raymond, Camlin..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Photo / Image Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  सामान की तस्वीर (Item Picture) *
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    {formImageUrl ? (
                      <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>गैलरी / कैमरा से फोटो अपलोड करें</span>
                    </button>
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={e => setFormImageUrl(e.target.value)}
                      placeholder="या इमेज URL पेस्ट करें (https://...)"
                      className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none"
                    />
                  </div>
                </div>

                {/* Preset image chips */}
                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">
                    या तैयार फोटो चुनें:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {PRESET_IMAGES[formType].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormImageUrl(p.url)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 transition cursor-pointer ${
                          formImageUrl === p.url
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rate & Discount Calculation HUD */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    मूल्य / MRP (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formRate}
                    onChange={e => setFormRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    छूट / Discount (%) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formDiscountPct}
                    onChange={e => setFormDiscountPct(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-sm outline-none text-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    अंतिम स्कूल रेट
                  </label>
                  <div className="w-full px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl font-black text-sm text-emerald-700 dark:text-emerald-300 tabular-nums">
                    ₹{Math.round(formRate - (formRate * formDiscountPct) / 100)}
                  </div>
                </div>
              </div>

              {/* Stock Quantity & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    कुल स्टॉक संख्या (Total Stock) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formStock}
                    onChange={e => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    रैक / स्टोर स्थान (Shelf Location)
                  </label>
                  <input
                    type="text"
                    value={formShelf}
                    onChange={e => setFormShelf(e.target.value)}
                    placeholder="e.g. Rack A-2, Cupboard 3"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* SKU Code & Class Target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    आइटम कोड / SKU
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    कक्षा या साइज (Class/Size)
                  </label>
                  <input
                    type="text"
                    value={formTargetClass}
                    onChange={e => setFormTargetClass(e.target.value)}
                    placeholder="e.g. Class 10, Size 34"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md"
              >
                {editingItem ? "अपडेट सुरक्षित करें" : "+ स्टॉक में दर्ज करें"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ISSUE / BOOK ITEM MODAL (WHO TO GIVE) ─────────────────── */}
      {bookingTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    {bookingTargetItem.itemType === "BOOK" ? "किताब इश्यू करें" : "सामान बुक करें व दें"}
                  </h3>
                  <p className="text-[11px] text-slate-400">छात्र या स्टाफ को आवंटित करें</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingTargetItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Brief */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              {bookingTargetItem.imageUrl && (
                <img
                  src={bookingTargetItem.imageUrl}
                  alt={bookingTargetItem.title}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="font-black text-xs text-slate-900 dark:text-white truncate">
                  {bookingTargetItem.title}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span>कोड: #{bookingTargetItem.code}</span>
                  <span>•</span>
                  <span>रेट: ₹{bookingTargetItem.discountedPrice}</span>
                  <span>•</span>
                  <span className="text-emerald-500 font-bold">
                    उपलब्ध: {bookingTargetItem.availableStock}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Borrower Type */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookBorrowerType("student")}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    bookBorrowerType === "student"
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  छात्र (Student)
                </button>
                <button
                  type="button"
                  onClick={() => setBookBorrowerType("teacher")}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    bookBorrowerType === "teacher"
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  शिक्षक / स्टाफ
                </button>
              </div>

              {/* Select or type borrower */}
              {bookBorrowerType === "student" ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    छात्र चुनें (Select Enrolled Student) *
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none text-slate-900 dark:text-white"
                  >
                    {students.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.className || "Class"} (Roll #{st.rollNo || "•"}, Adm #{st.admissionNo})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    शिक्षक / स्टाफ चुनें (Select Faculty) *
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none text-slate-900 dark:text-white"
                  >
                    {teachers.map(tc => (
                      <option key={tc.id} value={tc.id}>
                        {tc.name} — {tc.phone || "Faculty"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    आवंटित संख्या (Quantity) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={bookingTargetItem.availableStock}
                    value={bookQuantity}
                    onChange={e => setBookQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    {bookingTargetItem.itemType === "BOOK" ? "वापसी ड्यू तारीख *" : "भुगतान स्थिति"}
                  </label>
                  {bookingTargetItem.itemType === "BOOK" ? (
                    <input
                      type="date"
                      value={bookDueDate}
                      onChange={e => setBookDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                    />
                  ) : (
                    <select
                      value={bookPaymentMode}
                      onChange={e => setBookPaymentMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                    >
                      <option value="paid">✅ नकद / Paid</option>
                      <option value="unpaid">⚠️ बकाया (Unpaid)</option>
                      <option value="fee_ledger">📜 मासिक फीस में जोड़ें</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Bill preview */}
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <span>कुल बिल राशि ({bookQuantity} यूनिट):</span>
                <span className="text-sm font-black">
                  ₹{bookingTargetItem.discountedPrice * bookQuantity}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBookingTargetItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-md"
              >
                {bookingTargetItem.itemType === "BOOK" ? "इश्यू करें" : "बुक करें / डिलीवर करें"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryManager;
