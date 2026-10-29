import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  UserCheck, 
  GraduationCap, 
  ShieldCheck,
  Calendar,
  CreditCard,
  QrCode
} from 'lucide-react';
import { Student } from '../../types';
import { INITIAL_STUDENTS } from './feeReceiptUtils';

interface StudentSchoolPanelProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onSelectForFee?: (student: Student) => void;
}

export const StudentSchoolPanel: React.FC<StudentSchoolPanelProps> = ({
  students = INITIAL_STUDENTS,
  onAddStudent,
  onSelectForFee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);

  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    fatherName: '',
    motherName: '',
    classGrade: 'X',
    section: 'A',
    rollNo: '',
    admissionNo: `DPS/2025/${Math.floor(1000 + Math.random() * 9000)}`,
    phone: '',
    email: '',
    address: 'Patna, Bihar',
    monthlyFee: 3850,
    duesAmount: 0,
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.rollNo) return;
    const student: Student = {
      id: `std-${Date.now()}`,
      rollNo: newStudent.rollNo || '01',
      admissionNo: newStudent.admissionNo || `DPS/2025/1101`,
      name: newStudent.name || 'New Student',
      fatherName: newStudent.fatherName || 'Father Name',
      motherName: newStudent.motherName || 'Mother Name',
      classGrade: newStudent.classGrade || 'X',
      section: newStudent.section || 'A',
      phone: newStudent.phone || '9876543210',
      email: newStudent.email || 'student@example.com',
      photoUrl: newStudent.photoUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80',
      address: newStudent.address || 'Patna',
      admissionDate: new Date().toISOString().split('T')[0],
      monthlyFee: Number(newStudent.monthlyFee) || 3850,
      duesAmount: Number(newStudent.duesAmount) || 0,
    };
    onAddStudent(student);
    setShowAddModal(false);
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.includes(searchTerm) ||
      s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'All' || s.classGrade === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            DPS Student Directory & Profiles
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Student records with photo identity, roll numbers, and quick fee collection link
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Student Profile
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student by name, roll no or admission no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300"
        >
          <option value="All">All Classes</option>
          <option value="X">Class X</option>
          <option value="IX">Class IX</option>
          <option value="VIII">Class VIII</option>
        </select>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((std) => (
          <div
            key={std.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition-all hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3.5">
                <img
                  src={std.photoUrl}
                  alt={std.name}
                  className="w-14 h-16 rounded-lg object-cover border-2 border-emerald-500/40 shadow-md shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      Roll #{std.rollNo}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Class {std.classGrade}-{std.section}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-1 truncate">
                    {std.name}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Father: {std.fatherName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Adm: {std.admissionNo}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>+91 {std.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Monthly Fee: <strong>₹{std.monthlyFee}</strong></span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px]">Fee Status:</span>
                  {std.duesAmount === 0 ? (
                    <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> No Dues
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold text-[11px]">
                      Due: ₹{std.duesAmount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForCard(std)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                Digital ID Card
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Digital ID Card Modal */}
      {selectedStudentForCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border-2 border-emerald-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            {/* School Header */}
            <div className="border-b-2 border-emerald-800 pb-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-800 text-amber-300 font-black text-xs flex items-center justify-center mx-auto border-2 border-amber-400 mb-1">
                DPS
              </div>
              <h3 className="font-extrabold text-sm uppercase text-slate-900 tracking-wide">
                DELHI PUBLIC SCHOOL
              </h3>
              <p className="text-[10px] text-slate-600 font-medium">Patna, Bihar • CBSE Affiliated</p>
              <div className="mt-1 inline-block bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                STUDENT IDENTITY CARD
              </div>
            </div>

            {/* Photo & QR */}
            <div className="flex justify-center items-center gap-4 my-3">
              <img
                src={selectedStudentForCard.photoUrl}
                alt={selectedStudentForCard.name}
                className="w-20 h-24 object-cover rounded-lg border-2 border-slate-800 shadow"
              />
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`DPS-ID:${selectedStudentForCard.admissionNo}:${selectedStudentForCard.name}`)}`}
                  alt="Student QR Code"
                  className="w-19 h-19 object-contain"
                />
              </div>
            </div>

            <h4 className="text-base font-extrabold text-slate-900">
              {selectedStudentForCard.name}
            </h4>
            <p className="text-xs text-emerald-800 font-bold">
              Class {selectedStudentForCard.classGrade} - {selectedStudentForCard.section} (Roll: {selectedStudentForCard.rollNo})
            </p>
            <p className="text-[11px] text-slate-600 font-mono mt-0.5">
              Adm No: {selectedStudentForCard.admissionNo}
            </p>

            <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-700 text-left space-y-1">
              <div><strong>Father:</strong> {selectedStudentForCard.fatherName}</div>
              <div><strong>Emergency:</strong> +91 {selectedStudentForCard.phone}</div>
              <div><strong>Address:</strong> {selectedStudentForCard.address}</div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudentForCard(null)}
              className="mt-5 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Close ID Card
            </button>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Student Profile</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    placeholder="e.g. Priya Kumari"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={newStudent.rollNo}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    placeholder="e.g. 15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Class</label>
                  <select
                    value={newStudent.classGrade}
                    onChange={(e) => setNewStudent({ ...newStudent, classGrade: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  >
                    <option value="X">Class X</option>
                    <option value="IX">Class IX</option>
                    <option value="VIII">Class VIII</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Section</label>
                  <input
                    type="text"
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    placeholder="9835xxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Photo URL</label>
                <input
                  type="text"
                  value={newStudent.photoUrl}
                  onChange={(e) => setNewStudent({ ...newStudent, photoUrl: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
