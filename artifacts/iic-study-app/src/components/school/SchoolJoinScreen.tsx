// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getAllSchools, getSessions, getClasses,
  verifySchoolLockCode, saveSchoolUserProfile, linkStudentAccount
} from "../../school-firebase";
import type { School, SchoolSession, SchoolClass, SchoolUserProfile } from "../../school-types";
import {
  School as SchoolIcon, Lock, Unlock, ChevronRight, ChevronLeft,
  Loader2, Search, CheckCircle, ArrowLeft, BookOpen, Link2, User, Phone, Hash, ShieldCheck, AlertCircle
} from "lucide-react";

interface Props {
  uid: string;
  displayName: string;
  email: string;
  onJoined: () => void;
  onBack?: () => void;
}

export const SchoolJoinScreen: React.FC<Props> = ({ uid, displayName, email, onJoined, onBack }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Form fields as requested: Name, Mobile Number, Roll Number
  const [studentName, setStudentName] = useState(displayName || "");
  const [mobileNumber, setMobileNumber] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState<{ success: boolean; message: string } | null>(null);

  // Staff / Teacher Lock Code tab
  const [entryMode, setEntryMode] = useState<"student" | "staff_lock">("student");
  const [lockCode, setLockCode] = useState("");
  const [lockError, setLockError] = useState("");
  const [verifyingLock, setVerifyingLock] = useState(false);

  useEffect(() => {
    getAllSchools()
      .then(list => setSchools(list.filter(s => s.active)))
      .catch(() => {})
      .finally(() => setLoadingSchools(false));
  }, []);

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSchool = async (school: School) => {
    setSelectedSchool(school);
    setLinkResult(null);
    setLockError("");
    try {
      const sess = await getSessions(school.id);
      const active = sess.find(s => s.active) || sess[0];
      if (active) {
        const cls = await getClasses(school.id, active.id);
        setClasses(cls);
        if (cls.length > 0) setSelectedClassId(cls[0].id);
      }
    } catch (e) {}
  };

  const handleVerifyStudentLink = async () => {
    if (!selectedSchool) return;
    if (!studentName.trim()) {
      return setLinkResult({ success: false, message: "Kripya apna poora Naam daalein." });
    }
    if (!mobileNumber.trim() || mobileNumber.replace(/\D/g, "").length < 10) {
      return setLinkResult({ success: false, message: "Kripya 10 ankon ka Mobile Number daalein." });
    }
    if (!rollNumber.trim()) {
      return setLinkResult({ success: false, message: "Kripya apna Roll Number daalein." });
    }

    setLinking(true);
    setLinkResult(null);

    try {
      const res = await linkStudentAccount(
        selectedSchool.id,
        uid,
        studentName.trim(),
        mobileNumber.trim(),
        rollNumber.trim(),
        selectedClassId || undefined
      );

      setLinkResult(res);

      if (res.success) {
        setTimeout(() => {
          onJoined();
        }, 1200);
      }
    } catch (err: any) {
      setLinkResult({
        success: false,
        message: err?.message || "❌ Record match nahi hua. Kripya apna Naam, Roll Number aur Mobile Number dobara check karein."
      });
    } finally {
      setLinking(false);
    }
  };

  const handleStaffLockVerify = async () => {
    if (!selectedSchool || !lockCode.trim()) return;
    setVerifyingLock(true);
    setLockError("");
    try {
      const ok = await verifySchoolLockCode(selectedSchool.id, lockCode.trim());
      if (ok) {
        const profile: SchoolUserProfile = {
          uid,
          schoolId: selectedSchool.id,
          role: "SCHOOL_ADMIN",
          name: displayName || email,
          email,
        };
        await saveSchoolUserProfile(profile);
        onJoined();
      } else {
        setLockError("Galat lock code. Dobara try karein ya School Admin se lein.");
      }
    } catch (e: any) {
      setLockError(e?.message || "Error verifying lock code.");
    } finally {
      setVerifyingLock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 px-4 py-5 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (selectedSchool) {
                setSelectedSchool(null);
                setLinkResult(null);
              } else if (onBack) {
                onBack();
              }
            }}
            className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {selectedSchool ? "Schools List" : "Student Dashboard"}
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-amber-300">
            IIC × NSTA SCHOOL ECOSYSTEM
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!selectedSchool ? (
          /* STEP 1: SELECT SCHOOL */
          <div className="space-y-4">
            <div className="text-center space-y-1 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md mb-3">
                <SchoolIcon className="w-9 h-9" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Apna School Chunein</h1>
              <p className="text-xs text-slate-500">
                School select karke apna Naam, Mobile Number aur Roll Number verify karein.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="School ka naam ya pata search karein..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white shadow-sm"
              />
            </div>

            {loadingSchools ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <SchoolIcon className="w-10 h-10 mx-auto opacity-30 text-indigo-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Koi school nahi mila</p>
                <p className="text-xs">Super Admin ne abhi koi school create nahi kiya hai.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSchools.map(school => (
                  <button
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-3.5 text-left group"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg shadow-sm"
                      style={{ background: school.bannerColor || "#4f46e5" }}
                    >
                      {school.logoUrl ? (
                        <img src={school.logoUrl} alt={school.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        school.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 dark:text-white text-base leading-tight truncate group-hover:text-indigo-600 transition-colors">
                        {school.name}
                      </p>
                      {school.address && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{school.address}</p>
                      )}
                      {school.tagline && (
                        <p className="text-[11px] text-indigo-500 font-semibold truncate">{school.tagline}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <span className="text-xs font-bold hidden sm:inline">Select</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: STUDENT DETAILS FORM (NAME + MOBILE + ROLL NO MATCHING) */
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* School Header Banner */}
            <div
              className="p-5 text-white text-center relative"
              style={{ background: selectedSchool.bannerColor || "linear-gradient(to right, #4338ca, #6366f1)" }}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2 font-black text-xl shadow">
                {selectedSchool.logoUrl ? (
                  <img src={selectedSchool.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  selectedSchool.name.slice(0, 1).toUpperCase()
                )}
              </div>
              <h2 className="text-xl font-black">{selectedSchool.name}</h2>
              {selectedSchool.address && (
                <p className="text-xs text-white/80 mt-0.5">{selectedSchool.address}</p>
              )}
            </div>

            {/* Tab switch: Student Link vs Admin/Staff Lock */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-1">
              <button
                onClick={() => setEntryMode("student")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  entryMode === "student" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow" : "text-slate-500"
                }`}
              >
                <User className="w-4 h-4" /> Student Link & Enter
              </button>
              <button
                onClick={() => setEntryMode("staff_lock")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  entryMode === "staff_lock" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow" : "text-slate-500"
                }`}
              >
                <Lock className="w-4 h-4" /> Staff / Admin Passcode
              </button>
            </div>

            {entryMode === "student" ? (
              <div className="p-6 space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 text-xs text-indigo-800 dark:text-indigo-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Student Verification System
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-indigo-300">
                    Apna <strong>Poora Naam</strong>, <strong>Mobile Number</strong> aur <strong>Roll Number</strong> daalein.
                    System aapke school record se match karega. Match hone par hi aapka account link hoga.
                  </p>
                </div>

                {/* Field 1: Student Name */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> Aapka Poora Naam (Student Name) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Field 2: Mobile Number */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Field 3: Roll Number */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" /> Roll Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12 ya 101"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Optional Class Selector */}
                {classes.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Kaksha (Class):
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={e => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold"
                    >
                      <option value="">Sabhi Classes mein khojein</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Result Alert */}
                {linkResult && (
                  <div
                    className={`p-4 rounded-xl text-xs font-bold flex items-start gap-2.5 ${
                      linkResult.success
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200"
                        : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border border-rose-200"
                    }`}
                  >
                    {linkResult.success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>{linkResult.message}</div>
                  </div>
                )}

                <button
                  onClick={handleVerifyStudentLink}
                  disabled={linking}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                >
                  {linking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Data Match Kiya Ja Raha Hai...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" /> Verify & Link Student Account
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* STAFF LOCK CODE VIEW */
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1">
                  <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                  <h3 className="font-black text-slate-800 dark:text-white text-sm">School Passcode Required</h3>
                  <p className="text-xs text-slate-400">
                    Agar aap teacher ya admin hain to school ka lock code daalkar enter karein.
                  </p>
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Enter school passcode..."
                    value={lockCode}
                    onChange={e => { setLockCode(e.target.value); setLockError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleStaffLockVerify()}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center text-lg font-black tracking-widest text-slate-900 dark:text-white"
                  />
                  {lockError && <p className="text-xs text-rose-500 font-bold mt-1 text-center">{lockError}</p>}
                </div>

                <button
                  onClick={handleStaffLockVerify}
                  disabled={verifyingLock || !lockCode.trim()}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md"
                >
                  {verifyingLock ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock & Enter"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
