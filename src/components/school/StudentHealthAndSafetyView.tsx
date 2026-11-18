import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  ArrowLeft,
  HeartPulse,
  ShieldCheck,
  MessageSquare,
  Plus,
  Trash2,
  Save,
  UserCheck,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AuthorizedPickupPerson,
  SchoolStudent,
  StudentHealthRecord,
} from "../../school-types";
import {
  loadSchoolSubcollection,
  syncSchoolSubcollection,
} from "../../utils/schoolCloudSync";
import { generateId } from "../../school-firebase";
import { DirectUploadButton } from "../DirectUploadButton";
import { ParentTeacherQueryManager } from "./ParentTeacherQueryManager";

interface Props {
  schoolId: string;
  schoolName?: string;
  student: SchoolStudent;
  onBack?: () => void;
}

const DEFAULT_VACCINES = [
  { id: "v_bcg", name: "BCG", date: "", status: "DONE" as const },
  { id: "v_dpt", name: "DPT Booster", date: "", status: "DONE" as const },
  { id: "v_mmr", name: "MMR", date: "", status: "DONE" as const },
  { id: "v_polio", name: "Polio OPV", date: "", status: "DONE" as const },
  { id: "v_hepb", name: "Hepatitis B", date: "", status: "DONE" as const },
  { id: "v_typhoid", name: "Typhoid", date: "", status: "DUE" as const },
  { id: "v_tt", name: "TT / Td Booster", date: "", status: "DUE" as const },
];

export const StudentHealthAndSafetyView: React.FC<Props> = ({
  schoolId,
  schoolName,
  student,
  onBack,
}) => {
  const [subTab, setSubTab] = useState<"pickup" | "health" | "grievance">("pickup");
  const [pickups, setPickups] = useState<AuthorizedPickupPerson[]>([]);
  const [health, setHealth] = useState<StudentHealthRecord>(() => ({
    id: `hr_${student.id}`,
    schoolId,
    studentId: student.id,
    bloodGroup: student.bloodGroup || "",
    heightCm: undefined,
    weightKg: undefined,
    allergies: student.medicalHistory || "",
    chronicConditions: "",
    emergencyContactName: student.emergencyContact || student.fatherName || "",
    emergencyContactPhone: student.emergencyPhone || student.phone || "",
    doctorName: "",
    lastCheckupDate: "",
    vaccinations: DEFAULT_VACCINES,
    updatedAt: new Date().toISOString(),
  }));

  const [newGuardian, setNewGuardian] = useState({
    name: "",
    relation: "Father",
    phone: "",
    aadhaarLast4: "",
    photoUrl: "",
  });

  useEffect(() => {
    let active = true;
    if (!schoolId || !student?.id) return;

    loadSchoolSubcollection<AuthorizedPickupPerson>(
      schoolId,
      "authorized_pickup_persons",
      `nst_pickup_persons_${schoolId}`
    ).then((rows) => {
      if (!active) return;
      setPickups(rows.filter((p) => p.studentId === student.id));
    });

    loadSchoolSubcollection<StudentHealthRecord>(
      schoolId,
      "student_health_records",
      `nst_health_records_${schoolId}`
    ).then((rows) => {
      if (!active) return;
      const found = rows.find((r) => r.studentId === student.id);
      if (found) setHealth(found);
    });

    return () => {
      active = false;
    };
  }, [schoolId, student?.id]);

  const bmiValue = useMemo(() => {
    const h = Number(health.heightCm || 0);
    const w = Number(health.weightKg || 0);
    if (h <= 0 || w <= 0) return null;
    const hm = h / 100;
    return (w / (hm * hm)).toFixed(1);
  }, [health.heightCm, health.weightKg]);

  const handleAddPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuardian.name.trim() || !newGuardian.phone.trim()) {
      toast.error("Guardian name and mobile number are required.");
      return;
    }
    const allExisting = await loadSchoolSubcollection<AuthorizedPickupPerson>(
      schoolId,
      "authorized_pickup_persons",
      `nst_pickup_persons_${schoolId}`
    );
    const code = `PKP-${Math.floor(1000 + Math.random() * 9000)}`;
    const entry: AuthorizedPickupPerson = {
      id: generateId("pkp"),
      schoolId,
      studentId: student.id,
      name: newGuardian.name.trim(),
      relation: newGuardian.relation.trim() || "Guardian",
      phone: newGuardian.phone.trim(),
      aadhaarLast4: newGuardian.aadhaarLast4.replace(/\D/g, "").slice(-4) || "0000",
      photoUrl: newGuardian.photoUrl || undefined,
      pickupCode: code,
      verifiedByAdmin: true,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const nextAll = [entry, ...allExisting];
    try {
      localStorage.setItem(`nst_pickup_persons_${schoolId}`, JSON.stringify(nextAll));
    } catch {}
    await syncSchoolSubcollection(
      schoolId,
      "authorized_pickup_persons",
      nextAll
    );
    setPickups(nextAll.filter((p) => p.studentId === student.id));
    setNewGuardian({ name: "", relation: "Father", phone: "", aadhaarLast4: "", photoUrl: "" });
    toast.success(`Authorized Guardian added with Pickup Code ${code}`);
  };

  const handleDeletePickup = async (id: string) => {
    const allExisting = await loadSchoolSubcollection<AuthorizedPickupPerson>(
      schoolId,
      "authorized_pickup_persons",
      `nst_pickup_persons_${schoolId}`
    );
    const nextAll = allExisting.filter((p) => p.id !== id);
    try {
      localStorage.setItem(`nst_pickup_persons_${schoolId}`, JSON.stringify(nextAll));
    } catch {}
    await syncSchoolSubcollection(
      schoolId,
      "authorized_pickup_persons",
      nextAll
    );
    setPickups(nextAll.filter((p) => p.studentId === student.id));
    toast.success("Pickup guardian removed.");
  };

  const handleSaveHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    const allExisting = await loadSchoolSubcollection<StudentHealthRecord>(
      schoolId,
      "student_health_records",
      `nst_health_records_${schoolId}`
    );
    const updated: StudentHealthRecord = {
      ...health,
      id: health.id || `hr_${student.id}`,
      schoolId,
      studentId: student.id,
      updatedAt: new Date().toISOString(),
    };
    const nextAll = [updated, ...allExisting.filter((r) => r.studentId !== student.id)];
    try {
      localStorage.setItem(`nst_health_records_${schoolId}`, JSON.stringify(nextAll));
    } catch {}
    await syncSchoolSubcollection(
      schoolId,
      "student_health_records",
      nextAll
    );
    setHealth(updated);
    toast.success("Health & Vaccination record saved.");
  };

  const toggleVaccine = (id: string) => {
    setHealth((prev) => ({
      ...prev,
      vaccinations: prev.vaccinations.map((v) =>
        v.id === id ? { ...v, status: v.status === "DONE" ? "DUE" : "DONE" } : v
      ),
    }));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Child Safety, Health Record &amp; Parent Helpdesk</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage verified pickup guardians, emergency medical details, and grievance tickets.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab("pickup")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "pickup" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Pickup Guardians ({pickups.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("health")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "health" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Health &amp; Vaccines
          </button>
          <button
            type="button"
            onClick={() => setSubTab("grievance")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "grievance" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Helpdesk &amp; Tickets
          </button>
        </div>
      </div>

      {/* SUBTAB 1: AUTHORIZED PICKUP PERSONS */}
      {subTab === "pickup" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form
            onSubmit={handleAddPickup}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs text-white"
          >
            <h3 className="text-sm font-black flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Authorize Pickup Person</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              School gate security will match Guardian Photo, Aadhaar Last-4, and Pickup QR Code before releasing your child.
            </p>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newGuardian.name}
                onChange={(e) => setNewGuardian({ ...newGuardian, name: e.target.value })}
                placeholder="e.g. Rajesh Kumar Sharma"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Relation</label>
                <select
                  value={newGuardian.relation}
                  onChange={(e) => setNewGuardian({ ...newGuardian, relation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Uncle / Aunt">Uncle / Aunt</option>
                  <option value="Guardian">Approved Guardian</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Aadhaar Last 4</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newGuardian.aadhaarLast4}
                  onChange={(e) =>
                    setNewGuardian({ ...newGuardian, aadhaarLast4: e.target.value.replace(/\D/g, "") })
                  }
                  placeholder="1234"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={newGuardian.phone}
                onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Guardian Photo (Optional)</label>
              <DirectUploadButton
                kind="image"
                compact
                currentUrl={newGuardian.photoUrl}
                onUploaded={(url) => setNewGuardian({ ...newGuardian, photoUrl: url })}
                onClear={() => setNewGuardian({ ...newGuardian, photoUrl: "" })}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer"
            >
              Generate Pickup Verification Pass
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {pickups.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                No authorized pickup guardians added yet. Add Father, Mother, or trusted relative on the left.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pickups.map((p) => (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h4 className="text-sm font-black text-white truncate">{p.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          {p.relation} · Aadhaar ****{p.aadhaarLast4}
                        </p>
                        <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 tabular-nums">
                          <Phone className="w-3 h-3" />
                          {p.phone}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-black">
                            {p.pickupCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePickup(p.id)}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                            title="Remove guardian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-1.5 rounded-lg shrink-0">
                      <QRCode
                        value={JSON.stringify({
                          type: "NSTA_PICKUP_PASS",
                          schoolId,
                          studentId: student.id,
                          code: p.pickupCode,
                          name: p.name,
                        })}
                        size={64}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: HEALTH & VACCINATION RECORD */}
      {subTab === "health" && (
        <form onSubmit={handleSaveHealth} className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span>Emergency Medical Card</span>
              </h3>
              {bmiValue && (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold tabular-nums">
                  BMI: {bmiValue}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Blood Group</label>
                <input
                  type="text"
                  value={health.bloodGroup || ""}
                  onChange={(e) => setHealth({ ...health, bloodGroup: e.target.value })}
                  placeholder="O+"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={health.heightCm || ""}
                  onChange={(e) => setHealth({ ...health, heightCm: Number(e.target.value) || undefined })}
                  placeholder="142"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={health.weightKg || ""}
                  onChange={(e) => setHealth({ ...health, weightKg: Number(e.target.value) || undefined })}
                  placeholder="36"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={health.allergies || ""}
                  onChange={(e) => setHealth({ ...health, allergies: e.target.value })}
                  placeholder="None / Peanuts / Dust"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Family Doctor / Clinic</label>
                <input
                  type="text"
                  value={health.doctorName || ""}
                  onChange={(e) => setHealth({ ...health, doctorName: e.target.value })}
                  placeholder="Dr. A. K. Verma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={health.emergencyContactName || ""}
                  onChange={(e) => setHealth({ ...health, emergencyContactName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Emergency Contact Mobile</label>
                <input
                  type="tel"
                  value={health.emergencyContactPhone || ""}
                  onChange={(e) => setHealth({ ...health, emergencyContactPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Health &amp; Vaccination Record</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-black text-white pb-2 border-b border-slate-800">
              Immunization &amp; Vaccination Checklist
            </h3>
            <div className="space-y-2">
              {health.vaccinations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => toggleVaccine(v.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 ${v.status === "DONE" ? "text-emerald-400" : "text-slate-600"}`}
                    />
                    <span className="font-bold text-slate-200">{v.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      v.status === "DONE"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </form>
      )}

      {/* SUBTAB 3: PARENT GRIEVANCE & COMPLAINT TICKETS */}
      {subTab === "grievance" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-300">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>Submit grievances, bus/fee tickets, or leave queries directly to Teachers &amp; Admin.</span>
          </div>
          <ParentTeacherQueryManager
            school={{ id: schoolId, name: schoolName || "School" } as any}
            currentUserRole="STUDENT"
            currentStudent={student}
            currentUserId={student.id}
            currentUserName={student.name}
          />
        </div>
      )}
    </div>
  );
};
