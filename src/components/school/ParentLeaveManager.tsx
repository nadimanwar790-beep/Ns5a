// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  User,
  Filter,
  Search,
  Check,
  X,
  FileText,
  BadgeAlert
} from "lucide-react";
import { School, SchoolStudent } from "../../school-types";

export interface StudentLeaveApplication {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  rollNo?: string;
  parentMobile?: string;
  reasonType: "SICKNESS" | "WEDDING" | "TRAVEL" | "URGENT_WORK" | "OTHER";
  reasonText: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  totalDays: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  teacherRemarks?: string;
}

const REASON_LABELS = {
  SICKNESS: "बीमारी / बुखार (Sickness / Health)",
  WEDDING: "पारिवारिक शादी (Family Wedding)",
  TRAVEL: "गाँव / बाहर यात्रा (Village / Travel)",
  URGENT_WORK: "अति आवश्यक घरेलू कार्य (Urgent Work)",
  OTHER: "अन्य कारण (Other)"
};

interface Props {
  school: School | null;
  mode: "TEACHER_ADMIN" | "PARENT_STUDENT";
  currentStudent?: SchoolStudent | null;
  onLeaveUpdated?: () => void;
}

export const ParentLeaveManager: React.FC<Props> = ({
  school,
  mode = "TEACHER_ADMIN",
  currentStudent,
  onLeaveUpdated
}) => {
  const schoolId = school?.id || "SCH-001";
  const leavesStorageKey = `school_leaves_${schoolId}`;

  const [leaves, setLeaves] = useState<StudentLeaveApplication[]>(() => {
    try {
      const raw = localStorage.getItem(leavesStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        id: "leave_1",
        schoolId,
        studentId: currentStudent?.id || "STU-101",
        studentName: currentStudent?.name || "Rohan Kumar",
        className: currentStudent?.className || "Class 10-A",
        rollNo: currentStudent?.rollNo || "14",
        parentMobile: "9876543210",
        reasonType: "SICKNESS",
        reasonText: "तेज बुखार और डॉक्टर की सलाह पर 2 दिन का विश्राम",
        fromDate: today,
        toDate: today,
        totalDays: 1,
        status: "PENDING",
        appliedAt: new Date().toISOString()
      }
    ];
  });

  // Modal / Form state for parent
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formReasonType, setFormReasonType] = useState<"SICKNESS" | "WEDDING" | "TRAVEL" | "URGENT_WORK" | "OTHER">("SICKNESS");
  const [formReasonText, setFormReasonText] = useState("");
  const [formFromDate, setFormFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formToDate, setFormToDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Teacher Review state
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState<StudentLeaveApplication | null>(null);
  const [teacherRemarkInput, setTeacherRemarkInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const saveLeaves = (updated: StudentLeaveApplication[]) => {
    setLeaves(updated);
    try {
      localStorage.setItem(leavesStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Leaves save error:", e);
    }
  };

  // Filtered leaves list
  const displayedLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (mode === "PARENT_STUDENT" && currentStudent?.id && l.studentId !== currentStudent.id) {
        return false;
      }
      if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.studentName.toLowerCase().includes(q) ||
          l.className.toLowerCase().includes(q) ||
          (l.rollNo && l.rollNo.toLowerCase().includes(q)) ||
          l.reasonText.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leaves, mode, currentStudent, filterStatus, searchQuery]);

  // Handle Parent Apply
  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReasonText.trim()) {
      alert("कृपया छुट्टी का विवरण लिखें!");
      return;
    }

    const d1 = new Date(formFromDate);
    const d2 = new Date(formToDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newApp: StudentLeaveApplication = {
      id: `leave_${Date.now()}`,
      schoolId,
      studentId: currentStudent?.id || "STU-PARENT",
      studentName: currentStudent?.name || "Student",
      className: currentStudent?.className || "Class 10",
      rollNo: currentStudent?.rollNo || "",
      parentMobile: currentStudent?.parentPhone || currentStudent?.mobile || "",
      reasonType: formReasonType,
      reasonText: formReasonText.trim(),
      fromDate: formFromDate,
      toDate: formToDate,
      totalDays: days,
      status: "PENDING",
      appliedAt: new Date().toISOString()
    };

    saveLeaves([newApp, ...leaves]);
    setShowApplyModal(false);
    setFormReasonText("");
    alert("छुट्टी का आवेदन क्लास टीचर के पास भेज दिया गया है!");
    onLeaveUpdated?.();
  };

  // Handle Teacher Approve / Reject
  const handleTeacherAction = (leaveId: string, action: "APPROVED" | "REJECTED") => {
    const updated = leaves.map((l) => {
      if (l.id === leaveId) {
        return {
          ...l,
          status: action,
          reviewedBy: "Class Teacher",
          reviewedAt: new Date().toISOString(),
          teacherRemarks: teacherRemarkInput.trim() || (action === "APPROVED" ? "छुट्टी स्वीकृत" : "अस्वीकृत")
        };
      }
      return l;
    });

    saveLeaves(updated);
    setSelectedLeaveForReview(null);
    setTeacherRemarkInput("");

    // If approved, sync into attendance register so student gets 'L' on excused dates
    if (action === "APPROVED") {
      try {
        const attKey = `school_attendance_${schoolId}`;
        const rawAtt = localStorage.getItem(attKey);
        const attData = rawAtt ? JSON.parse(rawAtt) : {};
        const targetLeave = leaves.find((l) => l.id === leaveId);
        if (targetLeave) {
          // Mark 'L' for target dates
          const start = new Date(targetLeave.fromDate);
          const end = new Date(targetLeave.toDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            if (!attData[dateStr]) attData[dateStr] = {};
            attData[dateStr][targetLeave.studentId] = "L";
          }
          localStorage.setItem(attKey, JSON.stringify(attData));
        }
      } catch (e) {
        console.warn("Attendance auto-sync error:", e);
      }
    }

    onLeaveUpdated?.();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              डिजिटल लीव एप्लीकेशन व अप्रूवल डेस्क (Student Leave Desk)
            </h3>
            <p className="text-xs text-slate-400">
              {mode === "PARENT_STUDENT"
                ? "अभिभावक द्वारा छुट्टी की अर्जी व शिक्षक द्वारा अनुमोदन स्थिति"
                : "कक्षा शिक्षक व एडमिन द्वारा 1-टैप में छुट्टी स्वीकृत/अस्वीकृत करें (हाजिरी से ऑटो-लिंक्ड)"}
            </p>
          </div>
        </div>

        {mode === "PARENT_STUDENT" ? (
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            + छुट्टी की अर्जी भेजें
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">फिल्टर:</span>
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-semibold focus:outline-none"
            >
              <option value="ALL">सभी आवेदन ({leaves.length})</option>
              <option value="PENDING">लंबित (Pending - {leaves.filter((l) => l.status === "PENDING").length})</option>
              <option value="APPROVED">स्वीकृत (Approved)</option>
              <option value="REJECTED">अस्वीकृत (Rejected)</option>
            </select>
          </div>
        )}
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {displayedLeaves.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs">
            कोई छुट्टी आवेदन उपलब्ध नहीं है।
          </div>
        ) : (
          displayedLeaves.map((app) => (
            <div
              key={app.id}
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                app.status === "PENDING"
                  ? "bg-amber-950/20 border-amber-500/40"
                  : app.status === "APPROVED"
                  ? "bg-slate-900/90 border-emerald-500/30"
                  : "bg-slate-900/90 border-rose-500/30"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white">{app.studentName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {app.className} {app.rollNo ? `(Roll: ${app.rollNo})` : ""}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-300">
                    {REASON_LABELS[app.reasonType] || app.reasonType}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{app.reasonText}</p>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                  <span>📅 तारीख: <strong>{app.fromDate}</strong> से <strong>{app.toDate}</strong> ({app.totalDays} दिन)</span>
                  <span>• आवेदन: {new Date(app.appliedAt).toLocaleDateString("en-IN")}</span>
                </div>
                {app.teacherRemarks && (
                  <div className="text-[11px] text-emerald-300 font-semibold pt-1">
                    शिक्षक टिप्पणी: "{app.teacherRemarks}"
                  </div>
                )}
              </div>

              {/* Status or Teacher Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {app.status === "PENDING" ? (
                  mode === "TEACHER_ADMIN" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTeacherAction(app.id, "APPROVED")}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        स्वीकार करें
                      </button>
                      <button
                        onClick={() => handleTeacherAction(app.id, "REJECTED")}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        अस्वीकार
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      समीक्षा लंबित (Pending)
                    </span>
                  )
                ) : app.status === "APPROVED" ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    स्वीकृत (Approved)
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    अस्वीकृत (Rejected)
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* PARENT APPLY LEAVE MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                छुट्टी के लिए आवेदन करें
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">छुट्टी का मुख्य कारण चुनें *</label>
                <select
                  value={formReasonType}
                  onChange={(e: any) => setFormReasonType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="SICKNESS">बीमारी / बुखार (Sickness / Health)</option>
                  <option value="WEDDING">पारिवारिक शादी (Family Wedding)</option>
                  <option value="TRAVEL">गाँव / बाहर यात्रा (Village / Travel)</option>
                  <option value="URGENT_WORK">अति आवश्यक घरेलू कार्य (Urgent Work)</option>
                  <option value="OTHER">अन्य कारण (Other)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">कब से (From Date) *</label>
                  <input
                    type="date"
                    required
                    value={formFromDate}
                    onChange={(e) => setFormFromDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">कब तक (To Date) *</label>
                  <input
                    type="date"
                    required
                    value={formToDate}
                    onChange={(e) => setFormToDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">विस्तृत कारण लिखें *</label>
                <textarea
                  rows={3}
                  required
                  value={formReasonText}
                  onChange={(e) => setFormReasonText(e.target.value)}
                  placeholder="कृपया अवकाश का कारण स्पष्ट रूप से लिखें..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20"
                >
                  आवेदन भेजें (Submit)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
