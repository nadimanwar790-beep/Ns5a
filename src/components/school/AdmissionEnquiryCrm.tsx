import React, { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Phone,
  Calendar,
  MapPin,
  Search,
  CheckCircle2,
  ArrowRight,
  Users,
  Plus,
  X,
  MessageCircle,
  Save,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ClassSeatConfig,
  School,
  SchoolClass,
  SchoolPublicInquiry,
  SchoolStudent,
} from "../../school-types";
import { sortSchoolClasses } from "../../school-types";
import {
  generateId,
  getSchoolPublicInquiries,
  isStudentInClass,
  saveSchoolPublicInquiry,
  shouldUseDemoForSchool,
  updateSchoolPublicInquiry,
} from "../../school-firebase";
import {
  loadSchoolSubcollection,
  syncSchoolSubcollection,
} from "../../utils/schoolCloudSync";
import { safeOpenExternalUrl } from "../../utils/safeBrowserActions";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  onConvertToAdmission?: (prefill: {
    studentName: string;
    parentName: string;
    phone: string;
    classId?: string;
    className?: string;
    inquiryId?: string;
  }) => void;
}

type InquiryStage = NonNullable<SchoolPublicInquiry["status"]>;

const STAGE_META: Record<InquiryStage, { label: string; badge: string }> = {
  new: { label: "New Lead", badge: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  contacted: { label: "Contacted", badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  visit_scheduled: { label: "Campus Visit", badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  applied: { label: "Applied", badge: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  admitted: { label: "Admitted", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  resolved: { label: "Resolved", badge: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  lost: { label: "Closed / Lost", badge: "bg-slate-700/60 text-slate-400 border-slate-600" },
};

const DEMO_INQUIRIES = (schoolId: string): SchoolPublicInquiry[] => [
  {
    id: "inq_demo_1",
    schoolId,
    name: "Rajeshwar Verma",
    studentName: "Ananya Verma",
    phone: "9811245601",
    studentClass: "Class 5",
    inquiryType: "campus_visit",
    source: "website",
    status: "visit_scheduled",
    visitDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    visitTime: "10:30 AM",
    followUpDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    counsellorName: "Ms. Shalini Tiwari",
    message: "Interested in smart classroom & Sector 45 bus pickup route.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "inq_demo_2",
    schoolId,
    name: "Sandeep Kulkarni",
    studentName: "Kabir Kulkarni",
    phone: "9871402289",
    studentClass: "Class 8",
    inquiryType: "admission",
    source: "walkin",
    status: "contacted",
    followUpDate: new Date().toISOString().slice(0, 10),
    counsellorName: "Mr. Vikram Rawat",
    message: "Requested sibling fee discount info for two children.",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "inq_demo_3",
    schoolId,
    name: "Meena Sharma",
    studentName: "Vihaan Sharma",
    phone: "9899123304",
    studentClass: "Class 1",
    inquiryType: "general",
    source: "whatsapp",
    status: "new",
    message: "Please share nursery/class 1 annual fee structure and morning bus timings.",
    createdAt: new Date().toISOString(),
  },
];

export const AdmissionEnquiryCrm: React.FC<Props> = ({
  school,
  classes,
  students,
  onConvertToAdmission,
}) => {
  const schoolId = school?.id || "";
  const sortedClasses = useMemo(() => sortSchoolClasses(classes || []), [classes]);
  const [subTab, setSubTab] = useState<"leads" | "seats">("leads");
  const [inquiries, setInquiries] = useState<SchoolPublicInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<"all" | InquiryStage>("all");
  const [search, setSearch] = useState("");
  const [seatConfigs, setSeatConfigs] = useState<ClassSeatConfig[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<SchoolPublicInquiry | null>(null);
  const [leadForm, setLeadForm] = useState({
    parentName: "",
    studentName: "",
    phone: "",
    studentClass: "",
    source: "phone" as NonNullable<SchoolPublicInquiry["source"]>,
    inquiryType: "admission" as NonNullable<SchoolPublicInquiry["inquiryType"]>,
    visitDate: "",
    visitTime: "",
    followUpDate: "",
    counsellorName: "",
    message: "",
  });

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      if (!schoolId) return;
      setLoading(true);
      const [rows, seats] = await Promise.all([
        getSchoolPublicInquiries(schoolId),
        loadSchoolSubcollection<ClassSeatConfig>(
          schoolId,
          "class_seat_configs",
          `nst_class_seats_${schoolId}`
        ),
      ]);
      if (!active) return;

      if (rows.length === 0 && shouldUseDemoForSchool(schoolId)) {
        const seededFlag = `nst_crm_demo_seeded_${schoolId}`;
        if (!localStorage.getItem(seededFlag)) {
          localStorage.setItem(seededFlag, "1");
          const seeded = DEMO_INQUIRIES(schoolId);
          for (const item of seeded) {
            await saveSchoolPublicInquiry(schoolId, item);
          }
          setInquiries(seeded);
        } else {
          setInquiries([]);
        }
      } else {
        setInquiries(rows);
      }

      setSeatConfigs(seats);
      setLoading(false);
    };
    loadAll();
    return () => {
      active = false;
    };
  }, [schoolId]);

  const funnelStats = useMemo(() => {
    const total = inquiries.length;
    const newCount = inquiries.filter((i) => !i.status || i.status === "new").length;
    const contacted = inquiries.filter((i) => i.status === "contacted").length;
    const visits = inquiries.filter((i) => i.status === "visit_scheduled").length;
    const applied = inquiries.filter((i) => i.status === "applied").length;
    const admitted = inquiries.filter((i) => i.status === "admitted").length;
    const conversionPct = total > 0 ? Math.round(((applied + admitted) / total) * 100) : 0;
    return { total, newCount, contacted, visits, applied, admitted, conversionPct };
  }, [inquiries]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((inq) => {
      const stage = (inq.status || "new") as InquiryStage;
      if (stageFilter !== "all" && stage !== stageFilter) return false;
      if (!q) return true;
      return (
        (inq.name || "").toLowerCase().includes(q) ||
        (inq.studentName || "").toLowerCase().includes(q) ||
        (inq.phone || "").toLowerCase().includes(q) ||
        (inq.studentClass || "").toLowerCase().includes(q)
      );
    });
  }, [inquiries, stageFilter, search]);

  const handleStageChange = async (inq: SchoolPublicInquiry, status: InquiryStage) => {
    setInquiries((prev) => prev.map((x) => (x.id === inq.id ? { ...x, status } : x)));
    await updateSchoolPublicInquiry(schoolId, inq.id, { status });
    toast.success(`Lead stage updated to ${STAGE_META[status].label}`);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.parentName.trim() || !leadForm.phone.trim()) {
      toast.error("Parent name and mobile number are required.");
      return;
    }
    const payload: SchoolPublicInquiry = {
      id: generateId("inq"),
      schoolId,
      name: leadForm.parentName.trim(),
      studentName: leadForm.studentName.trim() || undefined,
      phone: leadForm.phone.trim(),
      studentClass: leadForm.studentClass || sortedClasses[0]?.name || "Class 1",
      source: leadForm.source,
      inquiryType: leadForm.inquiryType,
      status: leadForm.visitDate ? "visit_scheduled" : "new",
      visitDate: leadForm.visitDate || undefined,
      visitTime: leadForm.visitTime || undefined,
      followUpDate: leadForm.followUpDate || undefined,
      counsellorName: leadForm.counsellorName.trim() || undefined,
      message: leadForm.message.trim() || "Walk-in / Phone admission enquiry",
      createdAt: new Date().toISOString(),
    };
    await saveSchoolPublicInquiry(schoolId, payload);
    setInquiries((prev) => [payload, ...prev]);
    setShowAddModal(false);
    setLeadForm({
      parentName: "",
      studentName: "",
      phone: "",
      studentClass: "",
      source: "phone",
      inquiryType: "admission",
      visitDate: "",
      visitTime: "",
      followUpDate: "",
      counsellorName: "",
      message: "",
    });
    toast.success("Admission inquiry saved to CRM.");
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    const patch: Partial<SchoolPublicInquiry> = {
      followUpDate: editingLead.followUpDate || undefined,
      visitDate: editingLead.visitDate || undefined,
      visitTime: editingLead.visitTime || undefined,
      counsellorName: editingLead.counsellorName || undefined,
      remarks: editingLead.remarks || undefined,
      status: editingLead.status || "contacted",
    };
    setInquiries((prev) => prev.map((x) => (x.id === editingLead.id ? { ...x, ...patch } : x)));
    await updateSchoolPublicInquiry(schoolId, editingLead.id, patch);
    setEditingLead(null);
    toast.success("Follow-up notes & schedule saved.");
  };

  const handleUpdateSeatConfig = (cls: SchoolClass, field: "totalSeats" | "reservedSeats", val: number) => {
    const clean = Math.max(0, Number(val) || 0);
    setSeatConfigs((prev) => {
      const existing = prev.find((s) => s.classId === cls.id);
      const nextItem: ClassSeatConfig = existing
        ? { ...existing, [field]: clean, updatedAt: new Date().toISOString() }
        : {
            id: `seat_${cls.id}`,
            schoolId,
            classId: cls.id,
            className: cls.section ? `${cls.name} (${cls.section})` : cls.name,
            totalSeats: field === "totalSeats" ? clean : 40,
            reservedSeats: field === "reservedSeats" ? clean : 0,
            updatedAt: new Date().toISOString(),
          };
      const next = [nextItem, ...prev.filter((s) => s.classId !== cls.id)];
      try {
        localStorage.setItem(`nst_class_seats_${schoolId}`, JSON.stringify(next));
      } catch {}
      syncSchoolSubcollection(schoolId, "class_seat_configs", next);
      return next;
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Admission Enquiry CRM &amp; Seat Availability</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track website, walk-in, and campus visit leads from initial inquiry to confirmed enrollment.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:flex-nowrap sm:items-center sm:gap-2">
          <button
            type="button"
            onClick={() => setSubTab("leads")}
            className={`w-full sm:w-auto px-1.5 sm:px-3 py-2 rounded-xl text-[10.5px] sm:text-xs font-black flex items-center justify-center min-w-0 transition cursor-pointer ${
              subTab === "leads"
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <span className="truncate">Lead Funnel ({inquiries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("seats")}
            className={`w-full sm:w-auto px-1.5 sm:px-3 py-2 rounded-xl text-[10.5px] sm:text-xs font-black flex items-center justify-center min-w-0 transition cursor-pointer ${
              subTab === "seats"
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <span className="truncate">Class Seat Matrix ({sortedClasses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-1.5 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 min-w-0 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Add Enquiry</span>
          </button>
        </div>
      </div>

      {/* Funnel Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Total Leads", val: funnelStats.total, color: "text-white" },
          { label: "New / Unread", val: funnelStats.newCount, color: "text-sky-400" },
          { label: "Contacted", val: funnelStats.contacted, color: "text-indigo-400" },
          { label: "Campus Visits", val: funnelStats.visits, color: "text-amber-400" },
          { label: "Admitted", val: funnelStats.admitted + funnelStats.applied, color: "text-emerald-400" },
          { label: "Conversion", val: `${funnelStats.conversionPct}%`, color: "text-emerald-300" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-400 block">{stat.label}</span>
            <span className={`text-xl font-black tabular-nums mt-0.5 block ${stat.color}`}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>

      {subTab === "leads" ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search parent, student, phone, or class..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "new", "contacted", "visit_scheduled", "applied", "admitted", "lost"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStageFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                    stageFilter === st
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  {st === "all" ? "All Leads" : STAGE_META[st].label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              Loading admission inquiries...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
              No inquiries match the current filter. Enquiries submitted from the Public School Website appear here automatically.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredLeads.map((inq) => {
                const stage = (inq.status || "new") as InquiryStage;
                const cleanPhone = (inq.phone || "").replace(/\D/g, "");
                return (
                  <div
                    key={inq.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-white">
                              {inq.studentName || inq.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${STAGE_META[stage].badge}`}>
                              {STAGE_META[stage].label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Parent: <strong className="text-slate-200">{inq.name}</strong> · Target:{" "}
                            <strong className="text-emerald-400">{inq.studentClass || "General"}</strong>
                            {inq.source ? ` · via ${inq.source.replace("_", " ")}` : ""}
                          </p>
                        </div>
                        <select
                          value={stage}
                          onChange={(e) => handleStageChange(inq, e.target.value as InquiryStage)}
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer"
                        >
                          {Object.entries(STAGE_META).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {inq.message && (
                        <p className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
                          {inq.message}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 tabular-nums text-slate-200 font-semibold">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          {inq.phone}
                        </span>
                        {inq.visitDate && (
                          <span className="flex items-center gap-1 text-amber-300 font-semibold">
                            <MapPin className="w-3 h-3" />
                            Visit: {inq.visitDate} {inq.visitTime || ""}
                          </span>
                        )}
                        {inq.followUpDate && (
                          <span className="flex items-center gap-1 text-sky-300 font-semibold">
                            <Calendar className="w-3 h-3" />
                            Follow-up: {inq.followUpDate}
                          </span>
                        )}
                      </div>

                      {inq.remarks && (
                        <p className="text-[11px] text-indigo-300">
                          Counsellor Note: {inq.remarks}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingLead({ ...inq })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                        >
                          Schedule / Note
                        </button>
                        {cleanPhone.length >= 10 && (
                          <button
                            type="button"
                            onClick={() =>
                              safeOpenExternalUrl(
                                `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                                  `Namaste ${inq.name}, thank you for contacting ${school.name} regarding admission for ${
                                    inq.studentName || "your ward"
                                  } (${inq.studentClass || "Class"}). Let us know a convenient time for a campus visit!`
                                )}`
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </button>
                        )}
                      </div>

                      {onConvertToAdmission && stage !== "admitted" && (
                        <button
                          type="button"
                          onClick={() => {
                            const matchedCls = sortedClasses.find(
                              (c) =>
                                c.name.toLowerCase() === (inq.studentClass || "").toLowerCase() ||
                                `${c.name} (${c.section})`.toLowerCase() === (inq.studentClass || "").toLowerCase()
                            );
                            handleStageChange(inq, "applied");
                            onConvertToAdmission({
                              studentName: inq.studentName || "",
                              parentName: inq.name || "",
                              phone: inq.phone || "",
                              classId: matchedCls?.id,
                              className: inq.studentClass,
                              inquiryId: inq.id,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Convert to Admission</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Class-wise Seat Capacity Matrix */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Class-Wise Seat Capacity &amp; Vacancy Monitor</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Auto-syncs live occupied seats from student roster
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Total Seats</th>
                  <th className="py-3 px-4">Enrolled</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">Vacant Seats</th>
                  <th className="py-3 px-4">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sortedClasses.map((cls) => {
                  const cfg = seatConfigs.find((s) => s.classId === cls.id);
                  const totalSeats = cfg?.totalSeats ?? 40;
                  const reserved = cfg?.reservedSeats ?? 0;
                  const occupied = students.filter((st) => isStudentInClass(st, cls.id, cls.name)).length;
                  const vacant = Math.max(0, totalSeats - occupied - reserved);
                  const pct = totalSeats > 0 ? Math.min(100, Math.round(((occupied + reserved) / totalSeats) * 100)) : 0;
                  return (
                    <tr key={cls.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-bold text-white">
                        {cls.name} {cls.section ? `(${cls.section})` : ""}
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          min={0}
                          value={totalSeats}
                          onChange={(e) => handleUpdateSeatConfig(cls, "totalSeats", Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold tabular-nums"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-400 tabular-nums">{occupied}</td>
                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          min={0}
                          value={reserved}
                          onChange={(e) => handleUpdateSeatConfig(cls, "reservedSeats", Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-bold tabular-nums"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-black tabular-nums">
                        <span className={vacant > 5 ? "text-sky-400" : vacant > 0 ? "text-amber-400" : "text-rose-400"}>
                          {vacant} Open
                        </span>
                      </td>
                      <td className="py-2.5 px-4 w-44">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold tabular-nums text-slate-400">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Walk-In / Phone Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateLead}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-white"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Log New Admission Enquiry</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Parent Name *</label>
                <input
                  type="text"
                  required
                  value={leadForm.parentName}
                  onChange={(e) => setLeadForm({ ...leadForm, parentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Student Name</label>
                <input
                  type="text"
                  value={leadForm.studentName}
                  onChange={(e) => setLeadForm({ ...leadForm, studentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Class Seeking</label>
                <select
                  value={leadForm.studentClass}
                  onChange={(e) => setLeadForm({ ...leadForm, studentClass: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                >
                  <option value="">Select Class</option>
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Enquiry Source</label>
                <select
                  value={leadForm.source}
                  onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                >
                  <option value="walkin">Walk-In Campus</option>
                  <option value="phone">Phone Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="website">School Website</option>
                  <option value="referral">Parent/Teacher Referral</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Campus Visit Date</label>
                <input
                  type="date"
                  value={leadForm.visitDate}
                  onChange={(e) => setLeadForm({ ...leadForm, visitDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Enquiry Notes</label>
              <textarea
                rows={2}
                value={leadForm.message}
                onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                placeholder="Parent requirements, transport route query, scholarship interest..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer">
                Save Enquiry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Follow-up & Visit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFollowUp}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-white"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black">Follow-up &amp; Visit Scheduler</h3>
              <button type="button" onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-400">
              Lead: <strong className="text-white">{editingLead.name}</strong> ({editingLead.phone})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={editingLead.followUpDate || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Campus Visit Date</label>
                <input
                  type="date"
                  value={editingLead.visitDate || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, visitDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Visit Time</label>
                <input
                  type="text"
                  placeholder="10:30 AM"
                  value={editingLead.visitTime || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, visitTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Counsellor</label>
                <input
                  type="text"
                  placeholder="Staff Name"
                  value={editingLead.counsellorName || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, counsellorName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Call Remarks / Next Step</label>
              <textarea
                rows={3}
                value={editingLead.remarks || ""}
                onChange={(e) => setEditingLead({ ...editingLead, remarks: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingLead(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center gap-1.5 cursor-pointer">
                <Save className="w-3.5 h-3.5" />
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
