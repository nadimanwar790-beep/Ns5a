// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Book, BookOpen, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  RotateCcw, ArrowRight, Printer, Trash2, Edit3, Filter, Users,
  Bookmark, ChevronLeft, Calendar, Sparkles, Tag, IndianRupee
} from "lucide-react";
import type {
  School, SchoolStudent, SchoolTeacher, SchoolClass,
  LibraryBook, BookIssueRecord
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

const CATEGORIES = [
  "All Categories",
  "Mathematics",
  "Science & Physics",
  "Hindi Sahitya",
  "English Literature",
  "Social Science & History",
  "Encyclopedia & Reference",
  "Computers & Coding",
  "Moral & Story Books"
];

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
  const booksKey = useMemo(() => `nst_school_lib_books_${school?.id || "default"}`, [school?.id]);
  const issuesKey = useMemo(() => `nst_school_lib_issues_${school?.id || "default"}`, [school?.id]);

  // Books List
  const [books, setBooks] = useState<LibraryBook[]>(() => {
    try {
      const saved = localStorage.getItem(booksKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "book-1",
        schoolId: school?.id || "",
        accessionNo: "LIB-1001",
        title: "Concepts of Physics (Vol 1)",
        author: "Dr. H.C. Verma",
        category: "Science & Physics",
        shelfLocation: "Rack A-3",
        totalCopies: 5,
        availableCopies: 4,
        addedAt: "2026-01-10"
      },
      {
        id: "book-2",
        schoolId: school?.id || "",
        accessionNo: "LIB-1002",
        title: "Secondary School Mathematics (Class 10)",
        author: "R.S. Aggarwal",
        category: "Mathematics",
        shelfLocation: "Rack B-1",
        totalCopies: 8,
        availableCopies: 7,
        addedAt: "2026-01-12"
      },
      {
        id: "book-3",
        schoolId: school?.id || "",
        accessionNo: "LIB-1003",
        title: "Godan (गोदान)",
        author: "Munshi Premchand",
        category: "Hindi Sahitya",
        shelfLocation: "Rack C-4",
        totalCopies: 4,
        availableCopies: 4,
        addedAt: "2026-02-01"
      },
      {
        id: "book-4",
        schoolId: school?.id || "",
        accessionNo: "LIB-1004",
        title: "Wings of Fire: An Autobiography",
        author: "Dr. A.P.J. Abdul Kalam",
        category: "Encyclopedia & Reference",
        shelfLocation: "Rack D-2",
        totalCopies: 6,
        availableCopies: 5,
        addedAt: "2026-02-15"
      }
    ];
  });

  // Issue Records
  const [issues, setIssues] = useState<BookIssueRecord[]>(() => {
    try {
      const saved = localStorage.getItem(issuesKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "issue-1",
        schoolId: school?.id || "",
        bookId: "book-1",
        bookTitle: "Concepts of Physics (Vol 1)",
        accessionNo: "LIB-1001",
        borrowerType: "student",
        borrowerId: students[0]?.id || "std-1",
        borrowerName: students[0]?.name || "Aarav Kumar",
        borrowerClass: "Class 10",
        borrowerRoll: "01",
        issueDate: "2026-03-01",
        dueDate: "2026-03-15",
        status: "issued"
      }
    ];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(booksKey, JSON.stringify(books));
    } catch {}
  }, [books, booksKey]);

  useEffect(() => {
    try {
      localStorage.setItem(issuesKey, JSON.stringify(issues));
    } catch {}
  }, [issues, issuesKey]);

  // Tab View: Catalog vs Issue / Return Register
  const [activeTab, setActiveTab] = useState<"catalog" | "circulation" | "my_books">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  // Add Book Modal
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [bookFormTitle, setBookFormTitle] = useState("");
  const [bookFormAuthor, setBookFormAuthor] = useState("");
  const [bookFormAccNo, setBookFormAccNo] = useState(`LIB-${1000 + books.length + 1}`);
  const [bookFormCategory, setBookFormCategory] = useState("Science & Physics");
  const [bookFormShelf, setBookFormShelf] = useState("Rack A-1");
  const [bookFormCopies, setBookFormCopies] = useState(3);

  // Issue Book Modal
  const [issuingBook, setIssuingBook] = useState<LibraryBook | null>(null);
  const [issueBorrowerType, setIssueBorrowerType] = useState<"student" | "teacher">("student");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState("");
  const [issueDays, setIssueDays] = useState(14);

  // Calculated KPIs
  const totalBooksCount = useMemo(() => books.reduce((acc, b) => acc + (b.totalCopies || 1), 0), [books]);
  const activeIssuesCount = useMemo(() => issues.filter(i => i.status === "issued" || i.status === "overdue").length, [issues]);
  const availableBooksCount = useMemo(() => Math.max(0, totalBooksCount - activeIssuesCount), [totalBooksCount, activeIssuesCount]);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      if (selectedCategory !== "All Categories" && b.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.accessionNo.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [books, selectedCategory, searchQuery]);

  // Add new book
  const handleAddBook = () => {
    if (!bookFormTitle.trim() || !bookFormAuthor.trim()) {
      toast.error("Kripya Book Title aur Author ka naam enter karein.");
      return;
    }

    const newBook: LibraryBook = {
      id: `book-${Date.now()}`,
      schoolId: school.id,
      accessionNo: bookFormAccNo.trim() || `LIB-${Math.floor(1000 + Math.random() * 9000)}`,
      title: bookFormTitle.trim(),
      author: bookFormAuthor.trim(),
      category: bookFormCategory,
      shelfLocation: bookFormShelf.trim() || "Main Stack",
      totalCopies: Number(bookFormCopies) || 1,
      availableCopies: Number(bookFormCopies) || 1,
      addedAt: new Date().toISOString().split("T")[0]
    };

    setBooks(prev => [newBook, ...prev]);
    setShowAddBookModal(false);
    setBookFormTitle("");
    setBookFormAuthor("");
  };

  // Issue Book
  const handleConfirmIssue = () => {
    if (!issuingBook || !selectedBorrowerId) {
      toast.error("Kripya student ya teacher select karein.");
      return;
    }

    let borrowerName = "Borrower";
    let borrowerClass = "";
    let borrowerRoll = "";

    if (issueBorrowerType === "student") {
      const std = students.find(s => s.id === selectedBorrowerId);
      if (std) {
        borrowerName = std.name;
        borrowerRoll = std.rollNo || "";
        const cls = classes.find(c => c.id === std.classId);
        borrowerClass = cls?.name || "Class";
      }
    } else {
      const tch = teachers.find(t => t.id === selectedBorrowerId);
      if (tch) {
        borrowerName = tch.name;
        borrowerClass = "Faculty";
      }
    }

    const today = new Date();
    const dueDateObj = new Date(today.getTime() + issueDays * 86400000);

    const newIssue: BookIssueRecord = {
      id: `issue-${Date.now()}`,
      schoolId: school.id,
      bookId: issuingBook.id,
      bookTitle: issuingBook.title,
      accessionNo: issuingBook.accessionNo,
      borrowerType: issueBorrowerType,
      borrowerId: selectedBorrowerId,
      borrowerName,
      borrowerClass,
      borrowerRoll,
      issueDate: today.toISOString().split("T")[0],
      dueDate: dueDateObj.toISOString().split("T")[0],
      status: "issued"
    };

    // Update book available copies
    setBooks(prev => prev.map(b => b.id === issuingBook.id ? { ...b, availableCopies: Math.max(0, b.availableCopies - 1) } : b));
    setIssues(prev => [newIssue, ...prev]);
    setIssuingBook(null);
    setSelectedBorrowerId("");
    toast.success(`📖 "${issuingBook.title}" successfully issue ho gayi!`);
  };

  // Return Book
  const handleReturnBook = (record: BookIssueRecord) => {
    const today = new Date().toISOString().split("T")[0];
    const isLate = new Date(today) > new Date(record.dueDate);
    let fine = 0;
    if (isLate) {
      const diffDays = Math.ceil((new Date(today).getTime() - new Date(record.dueDate).getTime()) / 86400000);
      fine = Math.max(0, diffDays * 5); // ₹5/day fine
    }

    setIssues(prev => prev.map(i => {
      if (i.id === record.id) {
        return {
          ...i,
          status: "returned",
          returnDate: today,
          fineAmount: fine,
          finePaid: fine > 0 ? true : undefined
        };
      }
      return i;
    }));

    // Increment available book count
    setBooks(prev => prev.map(b => b.id === record.bookId ? { ...b, availableCopies: b.availableCopies + 1 } : b));

    if (fine > 0) {
      alert(`✅ Book wapas ho gayi! Late fine amount: ₹${fine}`);
    } else {
      alert(`✅ Book successfully returned!`);
    }
  };

  // Delete Book
  const handleDeleteBook = (id: string) => {
    if (window.confirm("Kya aap sach me yeh book catalog se hatana chahte hain?")) {
      setBooks(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-4 py-4 sm:py-6 shadow-md border-b border-emerald-800/40 print:hidden">
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
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider border border-emerald-400/30">
                  Resource Center
                </span>
                <span className="text-slate-300 text-xs font-semibold">
                  School Digital Library
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                <Book className="w-6 h-6 text-emerald-400" />
                <span>Library Management System (पुस्तकालय प्रबंधन)</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center gap-1.5 transition border border-white/20 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>Print Register</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddBookModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Book</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Books</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalBooksCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{books.length} Unique Titles</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Currently Issued</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{activeIssuesCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">With Students & Staff</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Available on Shelf</p>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">{availableBooksCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Ready for Issue</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "catalog"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Books Catalog ({books.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("circulation")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "circulation"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Issue & Return Register ({issues.length})</span>
          </button>
        </div>

        {/* ── 1. CATALOG TAB ── */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {/* Search & Category Filter */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Title, Author, Accession No (e.g. LIB-1001)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Books Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBooks.map((b) => {
                const isAvailable = b.availableCopies > 0;
                return (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {b.accessionNo}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        }`}>
                          {isAvailable ? `${b.availableCopies} in Stock` : "Out of Stock"}
                        </span>
                      </div>

                      <h4 className="font-black text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {b.title}
                      </h4>

                      <p className="text-xs text-slate-500 font-medium">
                        By <strong className="text-slate-700 dark:text-slate-300">{b.author}</strong>
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                          {b.category}
                        </span>
                        <span>•</span>
                        <span>{b.shelfLocation}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIssuingBook(b)}
                          disabled={!isAvailable}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black disabled:opacity-50 transition active:scale-95 shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Issue Book (किताब दें)</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(b.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 2. CIRCULATION REGISTER TAB ── */}
        {activeTab === "circulation" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <th className="p-3 font-black">Accession / Book</th>
                    <th className="p-3 font-black">Borrower</th>
                    <th className="p-3 font-black">Issue Date</th>
                    <th className="p-3 font-black">Due Date</th>
                    <th className="p-3 font-black">Status</th>
                    <th className="p-3 font-black text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {issues.map((rec) => {
                    const isLate = rec.status === "issued" && new Date(rec.dueDate) < new Date(new Date().toISOString().split("T")[0]);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          <p>{rec.bookTitle}</p>
                          <span className="font-mono text-[10px] text-slate-400">{rec.accessionNo}</span>
                        </td>
                        <td className="p-3">
                          <p className="font-black text-slate-800 dark:text-white">{rec.borrowerName}</p>
                          <p className="text-[10px] text-slate-400">{rec.borrowerClass} {rec.borrowerRoll ? `• Roll #${rec.borrowerRoll}` : ""}</p>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                          {rec.issueDate}
                        </td>
                        <td className="p-3 font-mono">
                          <span className={isLate ? "text-rose-600 font-bold" : "text-slate-600 dark:text-slate-300"}>
                            {rec.dueDate}
                          </span>
                        </td>
                        <td className="p-3">
                          {rec.status === "returned" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black">
                              <CheckCircle2 className="w-3 h-3" /> Returned ({rec.returnDate})
                            </span>
                          ) : isLate ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-black">
                              <Clock className="w-3 h-3" /> Issued
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {rec.status === "issued" && isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleReturnBook(rec)}
                              className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                            >
                              Receive Return
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD BOOK MODAL ── */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Book className="w-5 h-5 text-emerald-600" />
                <span>Add Book to Library Catalog</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBookModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Book Title *
              </label>
              <input
                type="text"
                value={bookFormTitle}
                onChange={e => setBookFormTitle(e.target.value)}
                placeholder="e.g. Discovery of India"
                className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Author Name *
              </label>
              <input
                type="text"
                value={bookFormAuthor}
                onChange={e => setBookFormAuthor(e.target.value)}
                placeholder="e.g. Jawaharlal Nehru"
                className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Accession No / Barcode
                </label>
                <input
                  type="text"
                  value={bookFormAccNo}
                  onChange={e => setBookFormAccNo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Total Copies
                </label>
                <input
                  type="number"
                  min="1"
                  value={bookFormCopies}
                  onChange={e => setBookFormCopies(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={bookFormCategory}
                  onChange={e => setBookFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
                >
                  {CATEGORIES.filter(c => c !== "All Categories").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Shelf / Rack Location
                </label>
                <input
                  type="text"
                  value={bookFormShelf}
                  onChange={e => setBookFormShelf(e.target.value)}
                  placeholder="e.g. Rack B-2"
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleAddBook}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Save Book
              </button>
              <button
                type="button"
                onClick={() => setShowAddBookModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ISSUE BOOK MODAL ── */}
      {issuingBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-600">Issue Book</p>
                <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                  {issuingBook.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIssuingBook(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setIssueBorrowerType("student"); setSelectedBorrowerId(""); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition ${
                  issueBorrowerType === "student" ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-xs" : "text-slate-500"
                }`}
              >
                Student (छात्र)
              </button>
              <button
                type="button"
                onClick={() => { setIssueBorrowerType("teacher"); setSelectedBorrowerId(""); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition ${
                  issueBorrowerType === "teacher" ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-xs" : "text-slate-500"
                }`}
              >
                Teacher (अध्यापक)
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Select {issueBorrowerType === "student" ? "Enrolled Student" : "Faculty Member"} *
              </label>
              <select
                value={selectedBorrowerId}
                onChange={e => setSelectedBorrowerId(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">-- Choose Member --</option>
                {issueBorrowerType === "student"
                  ? students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Roll #{s.rollNo || "—"})
                      </option>
                    ))
                  : teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.designation || "Faculty"})
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Loan Duration (दिनों की संख्या)
              </label>
              <div className="flex gap-2">
                {[7, 14, 21, 30].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setIssueDays(d)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black border transition ${
                      issueDays === d
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmIssue}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Confirm Issue
              </button>
              <button
                type="button"
                onClick={() => setIssuingBook(null)}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
