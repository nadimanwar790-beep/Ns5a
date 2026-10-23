// @ts-nocheck
import React, { useState } from "react";
import { UserPlus, X, Save, User, Phone, Calendar, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { DirectUploadButton } from "../DirectUploadButton";
import { saveStudent, generateId } from "../../school-firebase";
import type { School, SchoolClass, SchoolStudent } from "../../school-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classes: SchoolClass[];
  defaultClassId?: string;
  onStudentAdded: (student: SchoolStudent) => void;
}

export const QuickAddStudentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  classes,
  defaultClassId,
  onStudentAdded,
}) => {
  const [classId, setClassId] = useState<string>(defaultClassId || classes[0]?.id || "");
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [admissionNo, setAdmissionNo] = useState(() => "ADM-" + Math.floor(100 + Math.random() * 900));
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("2010-05-15");
  const [photoUrl, setPhotoUrl] = useState("");
  const [monthlyFee, setMonthlyFee] = useState<number>(500);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Kripya student ka full name enter karein.");
      return;
    }
    if (!rollNo.trim()) {
      setError("Roll Number zaroori hai.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const studentId = generateId();
      const newStudent: SchoolStudent = {
        id: studentId,
        schoolId,
        sessionId: "",
        classId,
        name: name.trim(),
        rollNo: rollNo.trim(),
        admissionNo: admissionNo.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        phone: phone.trim(),
        dateOfBirth,
        photoUrl,
        monthlyFee: Number(monthlyFee) || 0,
        active: true,
        joinDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      };

      await saveStudent(newStudent);
      onStudentAdded(newStudent);
      onClose();
    } catch (err: any) {
      console.error("Failed to add student:", err);
      setError(err?.message || "Student save karne mein error aaya.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight text-white">Naya Student Add Karein</h2>
              <p className="text-xs text-emerald-200 font-medium">Turant marksheet, admit card aur certificate banayein</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Class & Roll */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Class / Kaksha *
              </label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={rollNo}
                onChange={e => setRollNo(e.target.value)}
                placeholder="e.g. 101"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Student Full Name & Adm No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Aman Kumar Sharma"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Admission / Reg Number
              </label>
              <input
                type="text"
                value={admissionNo}
                onChange={e => setAdmissionNo(e.target.value)}
                placeholder="e.g. ADM-101"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Father & Mother Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Father's Name
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
                placeholder="Shri Rajesh Sharma"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mother's Name
              </label>
              <input
                type="text"
                value={motherName}
                onChange={e => setMotherName(e.target.value)}
                placeholder="Smt. Geeta Devi"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Phone & Date of Birth */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Guardian Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Student Photo */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-14 h-16 rounded-xl bg-white dark:bg-slate-700 border-2 border-emerald-200 dark:border-slate-600 overflow-hidden flex items-center justify-center shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Student Photo (Upload ya link):
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <DirectUploadButton
                  kind="image"
                  compact
                  currentUrl={photoUrl}
                  onUploaded={url => setPhotoUrl(url)}
                  onClear={() => setPhotoUrl("")}
                  label="Upload Photo"
                />
                <input
                  type="text"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="Photo image URL..."
                  className="flex-1 min-w-[140px] px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "✓ Student Save & Select Karein"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
