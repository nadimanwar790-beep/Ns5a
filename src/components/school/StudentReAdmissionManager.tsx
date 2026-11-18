// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import type {
  School,
  SchoolClass,
  SchoolSession,
  SchoolStudent,
  MonthlyFee,
} from "../../school-types";
import { sortSchoolClasses } from "../../school-types";
import {
  saveStudent,
  updateStudent,
  deleteStudent,
  saveClass,
  saveFee,
  getClasses,
  getStudents,
  getLocalStudents,
  getLocalFees,
  getStudentFees,
  getSchoolFeeHistory,
  saveSchoolUserProfile,
  generateId,
  todayStr,
  currentMonthStr,
  isDemoSessionId,
  isDemoRecord,
} from "../../school-firebase";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { AdmissionFormPrintModal, type AdmissionPrintMode } from "./AdmissionFormPrintModal";
import { maskSensitive2Chars } from "./feeReceiptUtils";
import {
  computeCompleteBackLedger,
  getSessionStartDateDefault,
  isRollCollision,
  resolveTargetClassRates,
  suggestNextAvailableRollNo,
  type BackLedgerSummary,
} from "../../utils/reAdmissionUtils";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  UserCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  History,
  Copy,
  Printer,
  Bus,
  FileText,
  ReceiptText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckSquare,
  Square,
  Layers,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  school: School;
  sessions: SchoolSession[];
  allClasses: SchoolClass[];
  allStudents: SchoolStudent[];
  activeSession: SchoolSession | null;
  onBack: () => void;
  onActivateSession?: (session: SchoolSession) => void;
  onReAdmitted?: (newStudent: SchoolStudent) => void;
  onUndoReAdmitted?: (removedStudentId: string) => void;
}

interface PrintStudioState {
  open: boolean;
  student: SchoolStudent | null;
  fee: MonthlyFee | null;
  className: string;
  mode: AdmissionPrintMode;
}

export const StudentReAdmissionManager: React.FC<Props> = ({
  school,
  sessions,
  allClasses,
  allStudents,
  activeSession,
  onBack,
  onActivateSession,
  onReAdmitted,
  onUndoReAdmitted,
}) => {
  const [workspaceMode, setWorkspaceMode] = useState<"single" | "bulk">("single");
  const [statusFilter, setStatusFilter] = useState<"pending" | "done" | "all">("pending");
  const [allSessionClasses, setAllSessionClasses] = useState<SchoolClass[]>([]);
  const [allSessionStudents, setAllSessionStudents] = useState<SchoolStudent[]>([]);
  const [locallyRemovedIds, setLocallyRemovedIds] = useState<string[]>([]);
  const [locallyAddedStudents, setLocallyAddedStudents] = useState<SchoolStudent[]>([]);

  // Load classes & students across ALL sessions (since parent panel may only subscribe to activeSession.id)
  useEffect(() => {
    let cancelled = false;
    if (!school?.id) return;
    Promise.all([
      getClasses(school.id).catch(() => []),
      getStudents(school.id).catch(() => []),
    ])
      .then(([clsList, stuList]) => {
        if (cancelled) return;
        if (Array.isArray(clsList)) {
          setAllSessionClasses(clsList.filter((c) => c && !isDemoRecord(c)));
        }
        if (Array.isArray(stuList)) {
          setAllSessionStudents(stuList.filter((s) => s && !isDemoRecord(s)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [school?.id, sessions?.length]);

  const realSessions = useMemo(
    () =>
      (sessions || []).filter(
        (s) => s && s.id && s.name && !isDemoSessionId(s.id) && !(s as any).isDemo
      ),
    [sessions]
  );

  const realStudents = useMemo(() => {
    const map = new Map<string, SchoolStudent>();
    const locals = school?.id ? getLocalStudents(school.id) : [];
    [...locals, ...(allStudents || []), ...(allSessionStudents || [])].forEach((s) => {
      if (s && s.active !== false && !isDemoRecord(s) && !locallyRemovedIds.includes(s.id)) {
        map.set(s.id, s);
      }
    });
    locallyAddedStudents.forEach((s) => {
      if (s && s.active !== false && !locallyRemovedIds.includes(s.id)) {
        map.set(s.id, s);
      }
    });
    return Array.from(map.values());
  }, [school?.id, allStudents, allSessionStudents, locallyAddedStudents, locallyRemovedIds]);

  const realClasses = useMemo(() => {
    const map = new Map<string, SchoolClass>();
    [...(allClasses || []), ...(allSessionClasses || [])].forEach((c) => {
      if (c && !isDemoRecord(c)) {
        map.set(c.id, c);
      }
    });
    return Array.from(map.values());
  }, [allClasses, allSessionClasses]);

  const defaultTargetSessionId = useMemo(() => {
    if (activeSession && !isDemoSessionId(activeSession.id)) return activeSession.id;
    return realSessions[0]?.id || "";
  }, [activeSession, realSessions]);

  const [targetSessionId, setTargetSessionId] = useState<string>(defaultTargetSessionId);

  const defaultSourceSessionId = useMemo(() => {
    const otherWithStudents = realSessions.find(
      (s) =>
        s.id !== targetSessionId &&
        realStudents.some((st) => st.sessionId === s.id)
    );
    if (otherWithStudents) return otherWithStudents.id;
    const anyOther = realSessions.find((s) => s.id !== targetSessionId);
    return anyOther?.id || realSessions[0]?.id || "";
  }, [realSessions, realStudents, targetSessionId]);

  const [sourceSessionId, setSourceSessionId] = useState<string>(defaultSourceSessionId);

  useEffect(() => {
    if (!targetSessionId && defaultTargetSessionId) {
      setTargetSessionId(defaultTargetSessionId);
    }
  }, [defaultTargetSessionId, targetSessionId]);

  useEffect(() => {
    if (!sourceSessionId || sourceSessionId === targetSessionId) {
      const alt =
        realSessions.find(
          (s) =>
            s.id !== targetSessionId &&
            realStudents.some((st) => st.sessionId === s.id)
        ) || realSessions.find((s) => s.id !== targetSessionId);
      if (alt) setSourceSessionId(alt.id);
    }
  }, [targetSessionId, sourceSessionId, realSessions, realStudents]);

  const sourceSession = useMemo(
    () => realSessions.find((s) => s.id === sourceSessionId) || null,
    [realSessions, sourceSessionId]
  );
  const targetSession = useMemo(
    () => realSessions.find((s) => s.id === targetSessionId) || null,
    [realSessions, targetSessionId]
  );

  const sourceClasses = useMemo(
    () => sortSchoolClasses(realClasses.filter((c) => c.sessionId === sourceSessionId)),
    [realClasses, sourceSessionId]
  );

  const targetClasses = useMemo(
    () => sortSchoolClasses(realClasses.filter((c) => c.sessionId === targetSessionId)),
    [realClasses, targetSessionId]
  );

  const targetSessionStudents = useMemo(
    () => realStudents.filter((s) => s.sessionId === targetSessionId),
    [realStudents, targetSessionId]
  );

  const [sourceClassFilter, setSourceClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [schoolFeeCache, setSchoolFeeCache] = useState<MonthlyFee[]>([]);
  const [loadingFees, setLoadingFees] = useState<boolean>(false);

  // Single Student Re-Admission Form States
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [newSection, setNewSection] = useState<string>("");
  const [newRollNo, setNewRollNo] = useState<string>("");
  const [newMonthlyFee, setNewMonthlyFee] = useState<string>("");
  const [newUsesBus, setNewUsesBus] = useState<boolean>(false);
  const [newBusFee, setNewBusFee] = useState<string>("");
  const [effectiveJoinDate, setEffectiveJoinDate] = useState<string>("");
  const [reAdmCounterDate, setReAdmCounterDate] = useState<string>(() => todayStr());
  const [reAdmissionFee, setReAdmissionFee] = useState<string>("0");
  const [carriedBackDueInput, setCarriedBackDueInput] = useState<string>("0");
  const [backDueEditedManually, setBackDueEditedManually] = useState<boolean>(false);
  const [waiverNote, setWaiverNote] = useState<string>("");
  const [paidNow, setPaidNow] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [remarks, setRemarks] = useState<string>("");
  const [showMonthAudit, setShowMonthAudit] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);
  const [copyingClasses, setCopyingClasses] = useState<boolean>(false);
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(false);

  // Auto-filled editable Student Bio-Data States
  const [showProfileEditor, setShowProfileEditor] = useState<boolean>(true);
  const [editName, setEditName] = useState<string>("");
  const [editAdmNo, setEditAdmNo] = useState<string>("");
  const [editDob, setEditDob] = useState<string>("");
  const [editGender, setEditGender] = useState<"male" | "female" | "other">("male");
  const [editFatherName, setEditFatherName] = useState<string>("");
  const [editMotherName, setEditMotherName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editWhatsapp, setEditWhatsapp] = useState<string>("");
  const [editAadhaar, setEditAadhaar] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");

  // Last Completed / Document Studio States
  const [lastCompleted, setLastCompleted] = useState<{
    student: SchoolStudent;
    fee: MonthlyFee;
    className: string;
  } | null>(null);

  const [printStudio, setPrintStudio] = useState<PrintStudioState>({
    open: false,
    student: null,
    fee: null,
    className: "",
    mode: "combined",
  });

  const [receiptPreview, setReceiptPreview] = useState<{
    fee: MonthlyFee;
    student: SchoolStudent;
    className: string;
  } | null>(null);

  // Bulk Class Re-Admission States
  const [bulkSourceClassId, setBulkSourceClassId] = useState<string>("");
  const [bulkTargetClassId, setBulkTargetClassId] = useState<string>("");
  const [bulkTargetSection, setBulkTargetSection] = useState<string>("");
  const [bulkSessionStartDate, setBulkSessionStartDate] = useState<string>("");
  const [bulkUniformReAdmFee, setBulkUniformReAdmFee] = useState<string>("0");
  const [bulkAutoRoll, setBulkAutoRoll] = useState<boolean>(true);
  const [bulkCarryBackDue, setBulkCarryBackDue] = useState<boolean>(true);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkRollOverrides, setBulkRollOverrides] = useState<Record<string, string>>({});
  const [bulkDueOverrides, setBulkDueOverrides] = useState<Record<string, string>>({});
  const [bulkMonthlyOverrides, setBulkMonthlyOverrides] = useState<Record<string, string>>({});
  const [bulkSaving, setBulkSaving] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<string>("");
  const [bulkResults, setBulkResults] = useState<
    { student: SchoolStudent; fee: MonthlyFee; className: string; carriedDue: number }[]
  >([]);

  // Sync session start date defaults when target session changes
  useEffect(() => {
    const startDef = getSessionStartDateDefault(targetSession);
    setEffectiveJoinDate(startDef);
    setBulkSessionStartDate(startDef);
  }, [targetSession?.id]);

  // Sync bulk source/target class defaults
  useEffect(() => {
    if (sourceClasses.length > 0 && !sourceClasses.some((c) => c.id === bulkSourceClassId)) {
      setBulkSourceClassId(sourceClasses[0].id);
    }
  }, [sourceClasses, bulkSourceClassId]);

  useEffect(() => {
    if (!bulkSourceClassId || targetClasses.length === 0) return;
    const idx = sourceClasses.findIndex((c) => c.id === bulkSourceClassId);
    let suggested: SchoolClass | undefined;
    if (idx >= 0 && idx + 1 < sourceClasses.length) {
      const nextName = (sourceClasses[idx + 1]?.name || "").toLowerCase().trim();
      suggested = targetClasses.find((tc) => (tc.name || "").toLowerCase().trim() === nextName);
    }
    if (!suggested) {
      const curName = (sourceClasses[idx]?.name || "").toLowerCase().trim();
      suggested = targetClasses.find((tc) => (tc.name || "").toLowerCase().trim() === curName) || targetClasses[0];
    }
    if (suggested) {
      setBulkTargetClassId(suggested.id);
      const rates = resolveTargetClassRates(suggested);
      setBulkUniformReAdmFee(String(rates.defaultReAdmissionFee || 0));
    }
  }, [bulkSourceClassId, sourceClasses, targetClasses]);

  // Load fee history across school + source session
  useEffect(() => {
    let cancelled = false;
    const loadFees = async () => {
      if (!school?.id) return;
      setLoadingFees(true);
      try {
        const local = getLocalFees(school.id) || [];
        if (!cancelled) setSchoolFeeCache(local.filter((f) => f && !isDemoRecord(f)));
        const [remoteSrc, remoteAll] = await Promise.all([
          sourceSessionId ? getSchoolFeeHistory(school.id, sourceSessionId).catch(() => []) : Promise.resolve([]),
          getSchoolFeeHistory(school.id).catch(() => []),
        ]);
        if (!cancelled) {
          const map = new Map<string, MonthlyFee>();
          [...local, ...(remoteAll || []), ...(remoteSrc || [])].forEach((f, idx) => {
            if (f && !isDemoRecord(f)) {
              const key = `${f.studentId}_${f.month}_${f.receiptNo || f.id || idx}`;
              map.set(key, f);
            }
          });
          setSchoolFeeCache(Array.from(map.values()));
        }
      } catch {}
      if (!cancelled) setLoadingFees(false);
    };
    loadFees();
    return () => {
      cancelled = true;
    };
  }, [school?.id, sourceSessionId]);

  // Set of source student IDs / admissionNos already re-admitted into targetSessionId
  const alreadyReAdmittedMap = useMemo(() => {
    const map = new Map<string, SchoolStudent>();
    realStudents
      .filter((s) => s.sessionId === targetSessionId)
      .forEach((s) => {
        if (s.previousStudentId) map.set(s.previousStudentId, s);
        if (s.admissionNo) map.set(`adm:${s.admissionNo.trim().toLowerCase()}`, s);
      });
    return map;
  }, [realStudents, targetSessionId]);

  const isAlreadyReAdmitted = (st: SchoolStudent): SchoolStudent | undefined => {
    return (
      alreadyReAdmittedMap.get(st.id) ||
      (st.admissionNo
        ? alreadyReAdmittedMap.get(`adm:${st.admissionNo.trim().toLowerCase()}`)
        : undefined)
    );
  };

  const sourceStudents = useMemo(() => {
    return realStudents
      .filter((s) => s.sessionId === sourceSessionId)
      .filter((s) => sourceClassFilter === "all" || s.classId === sourceClassFilter)
      .filter((s) => {
        const done = Boolean(isAlreadyReAdmitted(s));
        if (statusFilter === "pending") return !done;
        if (statusFilter === "done") return done;
        return true;
      })
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(q) ||
          (s.fatherName || "").toLowerCase().includes(q) ||
          (s.admissionNo || "").toLowerCase().includes(q) ||
          (s.rollNo || "").toLowerCase().includes(q) ||
          (s.phone || "").includes(q)
        );
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [realStudents, sourceSessionId, sourceClassFilter, statusFilter, searchQuery, alreadyReAdmittedMap]);

  const selectedStudent = useMemo(
    () => sourceStudents.find((s) => s.id === selectedStudentId) || null,
    [sourceStudents, selectedStudentId]
  );

  // Detailed fee ledger for selected student
  const [selectedStudentFees, setSelectedStudentFees] = useState<MonthlyFee[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!selectedStudent || !school?.id) {
      setSelectedStudentFees([]);
      return;
    }
    const localMatch = schoolFeeCache.filter((f) => f.studentId === selectedStudent.id);
    setSelectedStudentFees(localMatch);
    getStudentFees(school.id, selectedStudent.id)
      .then((list) => {
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          const merged = new Map<string, MonthlyFee>();
          [...localMatch, ...list].forEach((f, idx) => {
            if (f && !isDemoRecord(f)) {
              merged.set(`${f.month}_${f.receiptNo || f.id || idx}`, f);
            }
          });
          setSelectedStudentFees(Array.from(merged.values()));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.id, school?.id, schoolFeeCache]);

  const selectedLedger: BackLedgerSummary | null = useMemo(() => {
    if (!selectedStudent) return null;
    return computeCompleteBackLedger(
      selectedStudent,
      selectedStudentFees,
      sourceSession,
      sourceClasses
    );
  }, [selectedStudent, selectedStudentFees, sourceSession, sourceClasses]);

  const existingTargetStudent = useMemo(
    () => (selectedStudent ? isAlreadyReAdmitted(selectedStudent) : undefined),
    [selectedStudent, alreadyReAdmittedMap]
  );

  // Populate defaults whenever selected student or target classes change
  useEffect(() => {
    if (!selectedStudent) return;
    setConfirmUndoId(null);
    setShowMonthAudit(false);
    setBackDueEditedManually(false);
    setWaiverNote(existingTargetStudent?.previousSessionDueWaivedNote || "");

    const bioSrc = existingTargetStudent || selectedStudent;
    setEditName(bioSrc.name || "");
    setEditAdmNo(bioSrc.admissionNo || "");
    setEditDob(bioSrc.dateOfBirth || "");
    setEditGender((bioSrc.gender as "male" | "female" | "other") || "male");
    setEditFatherName(bioSrc.fatherName || "");
    setEditMotherName(bioSrc.motherName || "");
    setEditPhone(bioSrc.phone || "");
    setEditWhatsapp(bioSrc.whatsappNo || bioSrc.phone || "");
    setEditAadhaar(bioSrc.aadhaarNo || "");
    setEditAddress(bioSrc.address || "");

    if (existingTargetStudent) {
      // Edit mode for already re-admitted student
      setTargetClassId(existingTargetStudent.classId || "");
      setNewSection(existingTargetStudent.section || "");
      setNewRollNo(existingTargetStudent.rollNo || "");
      setNewMonthlyFee(String(existingTargetStudent.monthlyFee ?? 0));
      setNewUsesBus(Boolean(existingTargetStudent.usesBus));
      setNewBusFee(String(existingTargetStudent.busFee ?? 0));
      setEffectiveJoinDate(
        existingTargetStudent.joinDate || getSessionStartDateDefault(targetSession)
      );
      setReAdmCounterDate(existingTargetStudent.reAdmissionDate || todayStr());
      setReAdmissionFee(String(existingTargetStudent.reAdmissionFee ?? 0));
      setPaidNow(String(existingTargetStudent.reAdmissionPaidAmount ?? 0));
      setCarriedBackDueInput(String(existingTargetStudent.previousSessionDue ?? 0));
      setBackDueEditedManually(true);
      setRemarks("");
      return;
    }

    const srcClsIdx = sourceClasses.findIndex((c) => c.id === selectedStudent.classId);
    let suggestedTargetClass: SchoolClass | undefined;
    if (targetClasses.length > 0) {
      if (srcClsIdx >= 0 && srcClsIdx + 1 < sourceClasses.length) {
        const nextSrcName = (sourceClasses[srcClsIdx + 1]?.name || "").toLowerCase().trim();
        suggestedTargetClass = targetClasses.find(
          (tc) => (tc.name || "").toLowerCase().trim() === nextSrcName
        );
      }
      if (!suggestedTargetClass && selectedStudent.className) {
        const sameName = targetClasses.find(
          (tc) =>
            (tc.name || "").toLowerCase().trim() ===
            (selectedStudent.className || "").toLowerCase().trim()
        );
        suggestedTargetClass = sameName;
      }
      if (!suggestedTargetClass) {
        suggestedTargetClass = targetClasses[0];
      }
    }

    const resolvedClsId = suggestedTargetClass?.id || "";
    const resolvedSection = selectedStudent.section || (suggestedTargetClass?.sections?.[0] ?? "");
    setTargetClassId(resolvedClsId);
    setNewSection(resolvedSection);

    const suggestedRoll = resolvedClsId
      ? suggestNextAvailableRollNo(targetSessionStudents, resolvedClsId, resolvedSection)
      : selectedStudent.rollNo || "1";
    setNewRollNo(suggestedRoll);

    const rates = resolveTargetClassRates(suggestedTargetClass, resolvedSection, selectedStudent);
    setNewMonthlyFee(String(rates.monthlyTuition));
    setNewUsesBus(Boolean(selectedStudent.usesBus));
    setNewBusFee(String(rates.busFee));
    setEffectiveJoinDate(getSessionStartDateDefault(targetSession));
    setReAdmCounterDate(todayStr());
    setReAdmissionFee(String(rates.defaultReAdmissionFee || 0));
    setPaidNow("0");
    setRemarks("");
  }, [selectedStudent?.id, existingTargetStudent?.id, targetClasses.length]);

  // Keep carriedBackDueInput synced with auto-calculated ledger until admin manually overrides it
  useEffect(() => {
    if (!selectedLedger || backDueEditedManually || existingTargetStudent) return;
    setCarriedBackDueInput(String(selectedLedger.totalBackDue));
  }, [selectedLedger?.totalBackDue, backDueEditedManually, existingTargetStudent]);

  const rollCollisionStudent = useMemo(
    () =>
      isRollCollision(
        newRollNo,
        targetSessionStudents,
        targetClassId,
        newSection,
        existingTargetStudent?.id
      ),
    [newRollNo, targetSessionStudents, targetClassId, newSection, existingTargetStudent?.id]
  );

  const handleCopyClassesToTarget = async () => {
    if (!school?.id || !targetSessionId || sourceClasses.length === 0) return;
    setCopyingClasses(true);
    try {
      let created = 0;
      const newOnes: SchoolClass[] = [];
      for (const sc of sourceClasses) {
        const exists = targetClasses.some(
          (tc) => (tc.name || "").toLowerCase().trim() === (sc.name || "").toLowerCase().trim()
        );
        if (exists) continue;
        const newCls: SchoolClass = {
          ...sc,
          id: generateId("cls"),
          sessionId: targetSessionId,
          createdAt: new Date().toISOString(),
        };
        await saveClass(newCls);
        newOnes.push(newCls);
        created++;
      }
      if (newOnes.length > 0) {
        setAllSessionClasses((prev) => [...prev, ...newOnes]);
      }
      toast.success(
        created > 0
          ? `${created} कक्षाएं व Fee Structure नए सत्र (${targetSession?.name}) में कॉपी हो गईं!`
          : "सभी कक्षाएं पहले से लक्ष्य सत्र में मौजूद हैं।"
      );
    } catch {
      toast.error("कक्षाएं कॉपी करने में समस्या आई।");
    } finally {
      setCopyingClasses(false);
    }
  };

  const autoBackDueAmount = selectedLedger?.totalBackDue || 0;
  const effectiveBackDueAmount = Math.max(0, Number(carriedBackDueInput || 0));
  const waivedDueAmount = Math.max(0, autoBackDueAmount - effectiveBackDueAmount);
  const parsedReAdmFee = Math.max(0, Number(reAdmissionFee || 0));
  const parsedPaidNow = Math.max(0, Number(paidNow || 0));
  const totalPayable = effectiveBackDueAmount + parsedReAdmFee;
  const remainingBackDue = Math.max(0, totalPayable - parsedPaidNow);

  const buildReAdmissionFeeDoc = (
    studentObj: SchoolStudent,
    backAmt: number,
    reAdmAmt: number,
    paidAmt: number,
    remBack: number,
    receiptNo: string,
    counterDate: string,
    mode: string,
    noteText?: string
  ): MonthlyFee => {
    const feeItems = [];
    let sl = 1;
    if (backAmt > 0) {
      feeItems.push({
        id: "back_session_due",
        slNo: sl++,
        description: `पिछला सत्र बकाया (${sourceSession?.name || "Back Session"})`,
        due: backAmt,
        con: 0,
        paid: Math.min(backAmt, paidAmt),
      });
    }
    if (reAdmAmt > 0) {
      const leftForReAdm = Math.max(0, paidAmt - backAmt);
      feeItems.push({
        id: "readmission_fee",
        slNo: sl++,
        description: `पुनः प्रवेश शुल्क (${targetSession?.name || ""})`,
        due: reAdmAmt,
        con: 0,
        paid: Math.min(reAdmAmt, leftForReAdm),
      });
    }
    if (feeItems.length === 0) {
      feeItems.push({
        id: "readmission_reg",
        slNo: 1,
        description: `पुनः प्रवेश पंजीकरण (${sourceSession?.name || ""} → ${targetSession?.name || ""})`,
        due: 0,
        con: 0,
        paid: 0,
      });
    }

    const totalBill = backAmt + reAdmAmt;
    return {
      id: `readm_${studentObj.id}_${counterDate}`,
      schoolId: school.id,
      sessionId: targetSession?.id || studentObj.sessionId,
      studentId: studentObj.id,
      studentName: studentObj.name,
      rollNo: studentObj.rollNo,
      classId: studentObj.classId,
      className: studentObj.className,
      month: currentMonthStr(),
      amount: totalBill,
      monthlyAmount: reAdmAmt,
      arrearsAmount: backAmt,
      paidAmount: paidAmt,
      balanceDue: remBack,
      paid: remBack === 0 && paidAmt >= totalBill,
      paidDate: paidAmt > 0 ? counterDate : undefined,
      receiptNo,
      feeType: "admission",
      receiptCategory: "admission",
      admissionNo: studentObj.admissionNo,
      fatherName: studentObj.fatherName,
      payModeInfo: {
        payMode: mode as any,
        date: counterDate,
      },
      items: feeItems,
      note:
        noteText?.trim() ||
        `Re-Admission (${sourceSession?.name || ""} → ${targetSession?.name || ""}) | Paid: ₹${paidAmt} | Carried Back Due: ₹${remBack}`,
    };
  };

  const handleConfirmReAdmission = async () => {
    if (!selectedStudent || !targetSession) {
      toast.error("कृपया छात्र और लक्ष्य सत्र चुनें।");
      return;
    }
    if (!targetClassId) {
      toast.error("कृपया नए सत्र की कक्षा चुनें (या पहले कक्षाएं कॉपी करें)।");
      return;
    }
    if (sourceSessionId === targetSessionId) {
      toast.error("स्रोत सत्र और लक्ष्य सत्र अलग-अलग होने चाहिए।");
      return;
    }

    setSaving(true);
    try {
      const targetCls = targetClasses.find((c) => c.id === targetClassId);
      const counterDate = reAdmCounterDate || todayStr();
      const joinDt = effectiveJoinDate || getSessionStartDateDefault(targetSession);
      const isEditingExisting = Boolean(existingTargetStudent);
      const targetStudentId = existingTargetStudent?.id || generateId("stu");
      const receiptNo =
        existingTargetStudent?.reAdmissionReceiptNo ||
        `READM-${Date.now().toString().slice(-6)}`;

      const savedStudent: SchoolStudent = {
        ...(existingTargetStudent || selectedStudent),
        id: targetStudentId,
        name: editName.trim() || selectedStudent.name,
        admissionNo: editAdmNo.trim() || selectedStudent.admissionNo,
        dateOfBirth: editDob || selectedStudent.dateOfBirth,
        gender: editGender || selectedStudent.gender,
        fatherName: editFatherName.trim() || selectedStudent.fatherName,
        motherName: editMotherName.trim() || selectedStudent.motherName,
        phone: editPhone.trim() || selectedStudent.phone,
        whatsappNo: editWhatsapp.trim() || editPhone.trim() || selectedStudent.whatsappNo,
        aadhaarNo: editAadhaar.trim() || selectedStudent.aadhaarNo,
        address: editAddress.trim() || selectedStudent.address,
        sessionId: targetSession.id,
        classId: targetClassId,
        className: targetCls?.name || selectedStudent.className,
        section: newSection.trim() || undefined,
        rollNo: newRollNo.trim() || selectedStudent.rollNo || "1",
        monthlyFee: Number(newMonthlyFee || 0),
        usesBus: newUsesBus,
        busFee: newUsesBus ? Number(newBusFee || 0) : 0,
        joinDate: joinDt,
        active: true,
        admissionType: "READMISSION",
        previousStudentId: selectedStudent.id,
        previousSessionId: sourceSession?.id || selectedStudent.sessionId,
        previousSessionName: sourceSession?.name || "पिछला सत्र",
        previousClassName: selectedStudent.className || "",
        previousSessionDue: isEditingExisting ? effectiveBackDueAmount : remainingBackDue,
        previousSessionDueInitial: isEditingExisting
          ? existingTargetStudent?.previousSessionDueInitial ?? effectiveBackDueAmount
          : effectiveBackDueAmount,
        previousSessionDueWaived: waivedDueAmount,
        previousSessionDueWaivedNote: waiverNote.trim() || undefined,
        reAdmissionFee: parsedReAdmFee,
        reAdmissionDate: counterDate,
        reAdmissionReceiptNo: receiptNo,
        reAdmissionPaidAmount: parsedPaidNow,
        admissionDueBalance: 0,
      };

      await saveStudent(savedStudent);
      setLocallyAddedStudents((prev) => [
        savedStudent,
        ...prev.filter((s) => s.id !== savedStudent.id),
      ]);

      const feeDoc = buildReAdmissionFeeDoc(
        savedStudent,
        effectiveBackDueAmount,
        parsedReAdmFee,
        parsedPaidNow,
        isEditingExisting ? effectiveBackDueAmount : remainingBackDue,
        receiptNo,
        counterDate,
        paymentMode,
        remarks
      );

      await saveFee(feeDoc);

      if (savedStudent.phone) {
        try {
          await saveSchoolUserProfile(`student_${school.id}_${savedStudent.id}`, {
            role: "student",
            schoolId: school.id,
            schoolName: school.name,
            studentId: savedStudent.id,
            studentName: savedStudent.name,
            className: savedStudent.className,
            admissionNo: savedStudent.admissionNo,
            phone: savedStudent.phone,
          });
        } catch {}
      }

      if (onReAdmitted) onReAdmitted(savedStudent);

      setLastCompleted({
        student: savedStudent,
        fee: feeDoc,
        className: savedStudent.className || "",
      });

      toast.success(
        isEditingExisting
          ? `${savedStudent.name} का पुनः प्रवेश रिकॉर्ड अपडेट हो गया!`
          : `${savedStudent.name} का पुनः प्रवेश (${targetSession.name}) में सफलतापूर्वक हो गया!`
      );
    } catch (err) {
      console.error("Re-admission failed:", err);
      toast.error("पुनः प्रवेश सेव करने में त्रुटि हुई।");
    } finally {
      setSaving(false);
    }
  };

  const handleUndoReAdmission = async (targetSt: SchoolStudent) => {
    if (!school?.id || !targetSt?.id) return;
    setSaving(true);
    try {
      await deleteStudent(school.id, targetSt.id);
      setLocallyRemovedIds((prev) => [...prev, targetSt.id]);
      setLocallyAddedStudents((prev) => prev.filter((s) => s.id !== targetSt.id));
      if (onUndoReAdmitted) onUndoReAdmitted(targetSt.id);
      setConfirmUndoId(null);
      if (lastCompleted?.student?.id === targetSt.id) {
        setLastCompleted(null);
      }
      toast.success(`${targetSt.name} का नया सत्र पुनः प्रवेश रद्द कर दिया गया (पुराना रिकॉर्ड सुरक्षित है)।`);
    } catch (err) {
      toast.error("पुनः प्रवेश रद्द करने में त्रुटि हुई।");
    } finally {
      setSaving(false);
    }
  };

  // ── BULK CLASS RE-ADMISSION HELPERS ──────────────────────────────────────────
  const bulkEligibleStudents = useMemo(() => {
    return realStudents
      .filter((s) => s.sessionId === sourceSessionId)
      .filter((s) => !bulkSourceClassId || s.classId === bulkSourceClassId)
      .sort((a, b) => {
        const na = parseInt(String(a.rollNo || "9999"), 10);
        const nb = parseInt(String(b.rollNo || "9999"), 10);
        if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [realStudents, sourceSessionId, bulkSourceClassId]);

  const bulkLedgerMap = useMemo(() => {
    const map = new Map<string, BackLedgerSummary>();
    for (const st of bulkEligibleStudents) {
      map.set(
        st.id,
        computeCompleteBackLedger(
          st,
          schoolFeeCache.filter((f) => f.studentId === st.id),
          sourceSession,
          sourceClasses
        )
      );
    }
    return map;
  }, [bulkEligibleStudents, schoolFeeCache, sourceSession, sourceClasses]);

  // Pre-select pending students and calculate sequential roll numbers when bulk source/target changes
  useEffect(() => {
    const pending = bulkEligibleStudents.filter((s) => !isAlreadyReAdmitted(s));
    setBulkSelectedIds(pending.map((s) => s.id));

    if (bulkTargetClassId && bulkTargetClassId !== "ALUMNI") {
      const startRoll = parseInt(
        suggestNextAvailableRollNo(targetSessionStudents, bulkTargetClassId, bulkTargetSection),
        10
      ) || 1;
      const rolls: Record<string, string> = {};
      const tgtCls = targetClasses.find((c) => c.id === bulkTargetClassId);
      const monthlyMap: Record<string, string> = {};
      pending.forEach((st, idx) => {
        rolls[st.id] = bulkAutoRoll ? String(startRoll + idx) : st.rollNo || String(idx + 1);
        const rates = resolveTargetClassRates(tgtCls, bulkTargetSection || st.section, st);
        monthlyMap[st.id] = String(rates.monthlyTuition);
      });
      setBulkRollOverrides(rolls);
      setBulkMonthlyOverrides(monthlyMap);
    }
    setBulkDueOverrides({});
  }, [bulkSourceClassId, bulkTargetClassId, bulkTargetSection, bulkAutoRoll, bulkEligibleStudents.length]);

  const handleBulkConfirm = async () => {
    if (!targetSession || !bulkTargetClassId || bulkSelectedIds.length === 0) {
      toast.error("कृपया लक्ष्य कक्षा और कम से कम एक छात्र चुनें।");
      return;
    }
    if (sourceSessionId === targetSessionId) {
      toast.error("स्रोत सत्र और लक्ष्य सत्र अलग होने चाहिए।");
      return;
    }

    setBulkSaving(true);
    setBulkResults([]);
    const isAlumni = bulkTargetClassId === "ALUMNI";
    const targetCls = targetClasses.find((c) => c.id === bulkTargetClassId);
    const selectedList = bulkEligibleStudents.filter(
      (s) => bulkSelectedIds.includes(s.id) && !isAlreadyReAdmitted(s)
    );
    const reAdmAmt = Math.max(0, Number(bulkUniformReAdmFee || 0));
    const counterDate = todayStr();
    const joinDt = bulkSessionStartDate || getSessionStartDateDefault(targetSession);
    const completedList: { student: SchoolStudent; fee: MonthlyFee; className: string; carriedDue: number }[] = [];

    try {
      for (let i = 0; i < selectedList.length; i++) {
        const st = selectedList[i];
        setBulkProgress(`पुनः प्रवेश: ${st.name} (${i + 1}/${selectedList.length})...`);

        if (isAlumni) {
          await updateStudent(school.id, st.id, { active: false });
          continue;
        }

        const ledger = bulkLedgerMap.get(st.id);
        const autoDue = ledger?.totalBackDue || 0;
        const editedDueStr = bulkDueOverrides[st.id];
        const carriedDue = bulkCarryBackDue
          ? Math.max(0, editedDueStr !== undefined ? Number(editedDueStr || 0) : autoDue)
          : 0;
        const waived = Math.max(0, autoDue - carriedDue);
        const roll = (bulkRollOverrides[st.id] || st.rollNo || String(i + 1)).trim();
        const monthlyRate = Number(
          bulkMonthlyOverrides[st.id] ||
            resolveTargetClassRates(targetCls, bulkTargetSection || st.section, st).monthlyTuition
        );
        const receiptNo = `READM-${Date.now().toString().slice(-5)}-${i + 1}`;
        const newId = generateId("stu");

        const newSt: SchoolStudent = {
          ...st,
          id: newId,
          sessionId: targetSession.id,
          classId: bulkTargetClassId,
          className: targetCls?.name || st.className,
          section: (bulkTargetSection || st.section || "").trim() || undefined,
          rollNo: roll,
          monthlyFee: monthlyRate,
          usesBus: Boolean(st.usesBus),
          busFee: st.usesBus ? Number(st.busFee || targetCls?.feeStructure?.busFee || 0) : 0,
          joinDate: joinDt,
          active: true,
          admissionType: "READMISSION",
          previousStudentId: st.id,
          previousSessionId: sourceSession?.id || st.sessionId,
          previousSessionName: sourceSession?.name || "पिछला सत्र",
          previousClassName: st.className || "",
          previousSessionDue: carriedDue,
          previousSessionDueInitial: carriedDue,
          previousSessionDueWaived: waived,
          reAdmissionFee: reAdmAmt,
          reAdmissionDate: counterDate,
          reAdmissionReceiptNo: receiptNo,
          reAdmissionPaidAmount: 0,
          admissionDueBalance: 0,
        };

        await saveStudent(newSt);
        setLocallyAddedStudents((prev) => [newSt, ...prev.filter((x) => x.id !== newSt.id)]);
        if (onReAdmitted) onReAdmitted(newSt);

        const feeDoc = buildReAdmissionFeeDoc(
          newSt,
          carriedDue,
          reAdmAmt,
          0,
          carriedDue + reAdmAmt,
          receiptNo,
          counterDate,
          "Cash",
          `Bulk Class Re-Admission (${sourceSession?.name || ""} → ${targetSession.name})`
        );
        await saveFee(feeDoc);

        if (newSt.phone) {
          try {
            await saveSchoolUserProfile(`student_${school.id}_${newSt.id}`, {
              role: "student",
              schoolId: school.id,
              schoolName: school.name,
              studentId: newSt.id,
              studentName: newSt.name,
              className: newSt.className,
              admissionNo: newSt.admissionNo,
              phone: newSt.phone,
            });
          } catch {}
        }

        completedList.push({
          student: newSt,
          fee: feeDoc,
          className: newSt.className || "",
          carriedDue: carriedDue + reAdmAmt,
        });
      }

      setBulkResults(completedList);
      toast.success(
        isAlumni
          ? `${selectedList.length} छात्रों को Alumni / Pass-Out मार्क किया गया।`
          : `${completedList.length} छात्रों का बल्क पुनः प्रवेश (${targetSession.name}) में पूर्ण हुआ!`
      );
    } catch (err) {
      console.error("Bulk re-admission failed:", err);
      toast.error("बल्क पुनः प्रवेश में त्रुटि आई।");
    } finally {
      setBulkSaving(false);
      setBulkProgress("");
    }
  };

  const openPrintStudioFor = (
    st: SchoolStudent,
    fee: MonthlyFee | null,
    clsName: string,
    mode: AdmissionPrintMode
  ) => {
    setPrintStudio({
      open: true,
      student: st,
      fee,
      className: clsName,
      mode,
    });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Top Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                सत्र पुनः प्रवेश (Session Re-Admission)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Single + Bulk Class Re-Admission · पूरा माह-वार बकाया ऑडिट · A4 Form/Slip &amp; WhatsApp/NSTA शेयर
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSession && isDemoSessionId(activeSession.id) && realSessions.length > 0 && (
              <button
                type="button"
                onClick={() => onActivateSession?.(realSessions[0])}
                className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                Real सत्र पर स्विच करें
              </button>
            )}

            {/* Mode Segmented Toggle */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setWorkspaceMode("single")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  workspaceMode === "single"
                    ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Single Student
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode("bulk")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  workspaceMode === "bulk"
                    ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Bulk Class Re-Admission
              </button>
            </div>
          </div>
        </div>

        {/* Source & Target Session Selector */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              पिछला सत्र (Source / Back Session)
            </label>
            <select
              value={sourceSessionId}
              onChange={(e) => {
                setSourceSessionId(e.target.value);
                setSourceClassFilter("all");
                setSelectedStudentId("");
                setLastCompleted(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100"
            >
              {realSessions.map((s) => {
                const count = realStudents.filter((st) => st.sessionId === s.id).length;
                const clsCount = realClasses.filter((c) => c.sessionId === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({count} छात्र · {clsCount} कक्षाएं)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">
              नया सत्र जिसमें प्रवेश लेना है (Target Session)
            </label>
            <select
              value={targetSessionId}
              onChange={(e) => {
                setTargetSessionId(e.target.value);
                setLastCompleted(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-sm font-bold text-slate-900 dark:text-white"
            >
              {realSessions.map((s) => {
                const count = realStudents.filter((st) => st.sessionId === s.id).length;
                const clsCount = realClasses.filter((c) => c.sessionId === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({count} Re-Admitted · {clsCount} कक्षाएं)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Cascade Selector: Old Class -> Old Student (Single Mode) */}
        {workspaceMode === "single" && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-indigo-50/60 dark:bg-indigo-950/25 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/70">
            <div>
              <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                पुरानी कक्षा चुनें (Old Class in {sourceSession?.name || "Source Session"})
              </label>
              <select
                value={sourceClassFilter}
                onChange={(e) => {
                  setSourceClassFilter(e.target.value);
                  setSelectedStudentId("");
                  setLastCompleted(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-sm font-bold text-slate-800 dark:text-slate-100"
              >
                <option value="all">सभी कक्षाएं ({realStudents.filter((s) => s.sessionId === sourceSessionId).length} छात्र)</option>
                {sourceClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                छात्र चुनें (Select Student — चुनते ही पूरा फॉर्म व Due दिखेगा)
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setLastCompleted(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-600 text-sm font-black text-slate-900 dark:text-white"
              >
                <option value="">-- छात्र चुनें ({sourceStudents.length}) --</option>
                {sourceStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} · {st.className || "Class"} (Roll {st.rollNo || "—"} · पिता: {st.fatherName || "—"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Missing Target Classes Banner */}
        {targetSession && targetClasses.length === 0 && sourceClasses.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <strong className="block">लक्ष्य सत्र ({targetSession.name}) में अभी कोई कक्षा नहीं बनी है।</strong>
              <span>पुनः प्रवेश शुरू करने के लिए पिछले सत्र ({sourceSession?.name}) से कक्षाएं व Fee Structure कॉपी करें।</span>
            </div>
            <button
              type="button"
              onClick={handleCopyClassesToTarget}
              disabled={copyingClasses}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copyingClasses ? "कॉपी हो रही..." : "पिछले सत्र से कक्षाएं कॉपी करें"}
            </button>
          </div>
        )}
      </div>

      {realSessions.length < 2 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-bold">पुनः प्रवेश (Re-Admission) के लिए कम से कम 2 शैक्षणिक सत्र होने चाहिए।</p>
            <p className="text-xs mt-1 opacity-85">
              पहले Academic Sessions से नया सत्र (जैसे 2027-28) जोड़ें, फिर पुराने सत्र से छात्रों का नए सत्र में पुनः प्रवेश करें।
            </p>
          </div>
        </div>
      )}

      {/* Post-Re-Admission Document Completion Bar (Single Mode) */}
      {lastCompleted && workspaceMode === "single" && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                पुनः प्रवेश पूर्ण: {lastCompleted.student.name} · {lastCompleted.className} (Roll #{lastCompleted.student.rollNo})
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-mono tabular-nums">
                Receipt: {lastCompleted.fee.receiptNo} · Paid: ₹{Number(lastCompleted.fee.paidAmount || 0).toLocaleString("en-IN")} · Carried Due on Monthly Slips: ₹{Number(lastCompleted.student.previousSessionDue || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openPrintStudioFor(
                  lastCompleted.student,
                  lastCompleted.fee,
                  lastCompleted.className,
                  "combined"
                )
              }
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              A4 Form + Slip &amp; WhatsApp / NSTA Share
            </button>
            <button
              type="button"
              onClick={() =>
                openPrintStudioFor(
                  lastCompleted.student,
                  lastCompleted.fee,
                  lastCompleted.className,
                  "receipt_only"
                )
              }
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              A4 Fee Slip Only
            </button>
            <button
              type="button"
              onClick={() =>
                setReceiptPreview({
                  fee: lastCompleted.fee,
                  student: lastCompleted.student,
                  className: lastCompleted.className,
                })
              }
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ReceiptText className="w-3.5 h-3.5" />
              POS Receipt
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ SINGLE STUDENT MODE ══════════════ */}
      {workspaceMode === "single" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Source Students List */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col max-h-[78vh]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                पिछले सत्र के छात्र ({sourceStudents.length})
              </h3>
              {loadingFees && (
                <span className="text-xs font-semibold text-blue-600">लेजर ऑडिट लोड...</span>
              )}
            </div>

            {/* Filter Tabs (Pending / Done / All) */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-2.5">
              {(
                [
                  { id: "pending", label: "बाकी (Pending)" },
                  { id: "done", label: "हो चुके (Done)" },
                  { id: "all", label: "सभी (All)" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusFilter(t.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition whitespace-nowrap truncate cursor-pointer ${
                    statusFilter === t.id
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="नाम, पिता का नाम, Adm No..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>
              <select
                value={sourceClassFilter}
                onChange={(e) => setSourceClassFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="all">सभी कक्षाएं</option>
                {sourceClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sourceStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {statusFilter === "pending"
                    ? "इस फ़िल्टर में कोई शेष छात्र नहीं मिला (या सभी का Re-Admission हो चुका है)।"
                    : "चयनित पुराने सत्र में कोई छात्र नहीं मिला।"}
                </div>
              ) : (
                sourceStudents.map((st) => {
                  const alreadyInTarget = isAlreadyReAdmitted(st);
                  const quickLedger = computeCompleteBackLedger(
                    st,
                    schoolFeeCache.filter((f) => f.studentId === st.id),
                    sourceSession,
                    sourceClasses
                  );
                  const isSelected = selectedStudentId === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStudentId(st.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {st.name}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {st.className || "Class"} · Roll {st.rollNo || "—"} · Adm {st.admissionNo || "—"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          पिता: {st.fatherName || "—"}
                          {alreadyInTarget ? ` · Re-Admitted (${alreadyInTarget.className})` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono tabular-nums">
                        {alreadyInTarget ? (
                          <span className="text-xs font-bold text-emerald-600 block">
                            Re-Admitted
                          </span>
                        ) : null}
                        {quickLedger.totalBackDue > 0 ? (
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                            Due ₹{quickLedger.totalBackDue.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 block">Clear ₹0</span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Paid ₹{quickLedger.totalPaid.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Back-Data Audit + Target Enrollment Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
            {!selectedStudent ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center text-center text-slate-400 px-6">
                <History className="w-12 h-12 mb-3 text-blue-500/60" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                  बाईं ओर से किसी छात्र को चुनें
                </p>
                <p className="text-xs mt-1 max-w-md text-slate-500 dark:text-slate-400">
                  छात्र चुनते ही उसका पिछला पूरा माह-वार लेजर (असंकलित माह सहित) ऑडिट होकर दिखेगा। आप बकाया माफ़/एडजस्ट कर सकते हैं और कन्फर्म करते ही A4 Slip व Form प्रिंट या WhatsApp/NSTA पर भेज सकते हैं।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Student Identity Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedStudent.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Adm: <strong className="font-mono">{selectedStudent.admissionNo || "—"}</strong> · पिता: {maskSensitiveData ? maskSensitive2Chars(selectedStudent.fatherName, true) : (selectedStudent.fatherName || "—")} · माता: {maskSensitiveData ? maskSensitive2Chars(selectedStudent.motherName, true) : (selectedStudent.motherName || "—")} · मोबाइल: {maskSensitiveData ? maskSensitive2Chars(selectedStudent.phone, true) : (selectedStudent.phone || "—")} · पिछली कक्षा: <strong>{selectedStudent.className || "—"}</strong> (Roll {selectedStudent.rollNo || "—"})
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMaskSensitiveData((prev) => !prev)}
                    className={`p-1.5 rounded-xl flex items-center justify-center border transition cursor-pointer shrink-0 ${
                      maskSensitiveData
                        ? "bg-amber-600 text-white border-amber-500 hover:bg-amber-500"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                    }`}
                    title={maskSensitiveData ? "संवेदनशील डेटा छिपा है (पूरा दिखाने के लिए क्लिक करें)" : "मोबाइल, आधार, पिता व माता का नाम 2 अक्षर के बाद xxxx में छुपाएं"}
                    aria-label={maskSensitiveData ? "Show sensitive data" : "Mask sensitive data"}
                  >
                    {maskSensitiveData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {existingTargetStudent && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {targetSession?.name}: {existingTargetStudent.className} (Roll {existingTargetStudent.rollNo})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          openPrintStudioFor(
                            existingTargetStudent,
                            buildReAdmissionFeeDoc(
                              existingTargetStudent,
                              Number(existingTargetStudent.previousSessionDueInitial ?? existingTargetStudent.previousSessionDue ?? 0),
                              Number(existingTargetStudent.reAdmissionFee ?? 0),
                              Number(existingTargetStudent.reAdmissionPaidAmount ?? 0),
                              Number(existingTargetStudent.previousSessionDue ?? 0),
                              existingTargetStudent.reAdmissionReceiptNo || "READM-SLIP",
                              existingTargetStudent.reAdmissionDate || todayStr(),
                              "Cash"
                            ),
                            existingTargetStudent.className || "",
                            "combined"
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        A4 Form/Slip &amp; Share
                      </button>

                      {confirmUndoId === existingTargetStudent.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUndoReAdmission(existingTargetStudent)}
                            disabled={saving}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                          >
                            Confirm Undo
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUndoId(null)}
                            className="px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmUndoId(existingTargetStudent.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Undo Re-Admission
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Back Session Full Month-Wise Audit Summary */}
                {selectedLedger && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-blue-600" />
                        पिछला सत्र लेजर ऑडिट ({sourceSession?.name})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMonthAudit(!showMonthAudit)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showMonthAudit ? "माह-वार तालिका छुपाएं" : `माह-वार विवरण देखें (${selectedLedger.monthTimeline.length} माह)`}
                        {showMonthAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
                      <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] font-sans font-bold text-slate-400 block">कुल सत्र बिल</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          ₹{selectedLedger.totalBilled.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] font-sans font-bold text-emerald-600 block">कुल जमा</span>
                        <span className="text-sm font-black text-emerald-600">
                          ₹{selectedLedger.totalPaid.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-amber-200 dark:border-amber-800">
                        <span className="text-[11px] font-sans font-bold text-amber-600 block">असंकलित माह Due</span>
                        <span className="text-sm font-black text-amber-600">
                          ₹{selectedLedger.ungeneratedMonthsDue.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-rose-200 dark:border-rose-800">
                        <span className="text-[11px] font-sans font-bold text-rose-600 block">ऑटो पिछला बकाया</span>
                        <span className="text-sm font-black text-rose-600">
                          ₹{selectedLedger.totalBackDue.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Month-by-month audit table */}
                    {showMonthAudit && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs font-mono tabular-nums">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans">
                            <tr>
                              <th className="py-1.5 px-2.5">माह</th>
                              <th className="py-1.5 px-2 text-right">अपेक्षित</th>
                              <th className="py-1.5 px-2 text-right">जमा</th>
                              <th className="py-1.5 px-2 text-right">शेष</th>
                              <th className="py-1.5 px-2.5 text-right">स्थिति</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {selectedLedger.monthTimeline.map((row) => (
                              <tr key={row.monthCode}>
                                <td className="py-1.5 px-2.5 font-sans font-bold text-slate-800 dark:text-slate-200">
                                  {row.label}
                                </td>
                                <td className="py-1.5 px-2 text-right">₹{row.expectedAmount.toLocaleString("en-IN")}</td>
                                <td className="py-1.5 px-2 text-right text-emerald-600">₹{row.paidAmount.toLocaleString("en-IN")}</td>
                                <td className="py-1.5 px-2 text-right font-bold text-rose-600">
                                  {row.dueAmount > 0 ? `₹${row.dueAmount.toLocaleString("en-IN")}` : "₹0"}
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-sans text-[11px] font-bold">
                                  {row.status === "paid" ? (
                                    <span className="text-emerald-600">Paid</span>
                                  ) : row.status === "partial" ? (
                                    <span className="text-amber-600">Partial</span>
                                  ) : row.status === "ungenerated_unpaid" ? (
                                    <span className="text-rose-600">असंकलित बकाया</span>
                                  ) : row.status === "unpaid_saved" ? (
                                    <span className="text-rose-600">Unpaid</span>
                                  ) : (
                                    <span className="text-slate-400">Exempt</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Editable / Waive Carried Back Due */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          आगे ले जाने वाला पिछला बकाया (Edit / Waive ₹)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={carriedBackDueInput}
                            onChange={(e) => {
                              setCarriedBackDueInput(e.target.value);
                              setBackDueEditedManually(true);
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-black text-rose-600 dark:text-rose-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCarriedBackDueInput("0");
                              setBackDueEditedManually(true);
                            }}
                            className="px-2.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap cursor-pointer"
                          >
                            Waive ₹0
                          </button>
                          {backDueEditedManually && (
                            <button
                              type="button"
                              onClick={() => {
                                setBackDueEditedManually(false);
                                setCarriedBackDueInput(String(autoBackDueAmount));
                              }}
                              className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                              title="ऑटो बकाया वापस लाएं"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          छूट / एडजस्टमेंट कारण (यदि बकाया बदला गया हो)
                          {waivedDueAmount > 0 && (
                            <span className="ml-1.5 text-amber-600 font-bold">
                              (माफ़ राशि: ₹{waivedDueAmount.toLocaleString("en-IN")})
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={waiverNote}
                          onChange={(e) => setWaiverNote(e.target.value)}
                          placeholder="उदा. Principal Waiver / Settlement Discount..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-Filled Editable Student Bio-Data Form */}
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      भरा हुआ छात्र विवरण (Auto-Filled Form — आवश्यकतानुसार सुधारें)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProfileEditor((v) => !v)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {showProfileEditor ? "विवरण संक्षिप्त करें" : "पूरा भरा हुआ फॉर्म देखें"}
                      {showProfileEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {showProfileEditor && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          छात्र का नाम (Student Name)
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Admission No
                        </label>
                        <input
                          type="text"
                          value={editAdmNo}
                          onChange={(e) => setEditAdmNo(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Date of Birth / Gender
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="date"
                            value={editDob}
                            onChange={(e) => setEditDob(e.target.value)}
                            className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value as any)}
                            className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          पिता का नाम (Father's Name)
                        </label>
                        <input
                          type="text"
                          value={editFatherName}
                          onChange={(e) => setEditFatherName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          माता का नाम (Mother's Name)
                        </label>
                        <input
                          type="text"
                          value={editMotherName}
                          onChange={(e) => setEditMotherName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          मोबाइल / WhatsApp
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="Mobile"
                            className="w-1/2 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                          />
                          <input
                            type="tel"
                            value={editWhatsapp}
                            onChange={(e) => setEditWhatsapp(e.target.value)}
                            placeholder="WhatsApp"
                            className="w-1/2 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Aadhaar No
                        </label>
                        <input
                          type="text"
                          value={editAadhaar}
                          onChange={(e) => setEditAadhaar(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          पता (Address)
                        </label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Target Session Class, Section, Roll & Fee Setup */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    नया सत्र प्रवेश विवरण ({targetSession?.name})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        लक्ष्य कक्षा (Target Class) *
                      </label>
                      <select
                        value={targetClassId}
                        onChange={(e) => {
                          const cid = e.target.value;
                          setTargetClassId(cid);
                          const cls = targetClasses.find((c) => c.id === cid);
                          const nextSec = newSection || cls?.sections?.[0] || "";
                          const rates = resolveTargetClassRates(cls, nextSec, selectedStudent);
                          setNewMonthlyFee(String(rates.monthlyTuition));
                          setNewBusFee(String(rates.busFee));
                          setReAdmissionFee(String(rates.defaultReAdmissionFee || 0));
                          if (!existingTargetStudent && cid) {
                            setNewRollNo(suggestNextAvailableRollNo(targetSessionStudents, cid, nextSec));
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                      >
                        <option value="">-- कक्षा चुनें --</option>
                        {targetClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        सेक्शन (Section)
                      </label>
                      <select
                        value={newSection}
                        onChange={(e) => {
                          const sec = e.target.value;
                          setNewSection(sec);
                          const cls = targetClasses.find((c) => c.id === targetClassId);
                          const rates = resolveTargetClassRates(cls, sec, selectedStudent);
                          setNewMonthlyFee(String(rates.monthlyTuition));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                      >
                        <option value="">Common</option>
                        {Array.from(
                          new Set([
                            ...(targetClasses.find((c) => c.id === targetClassId)?.sections || []),
                            "A",
                            "B",
                            "C",
                          ])
                        ).map((sec) => (
                          <option key={sec} value={sec}>
                            Section {sec}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        नया Roll No
                      </label>
                      <input
                        type="text"
                        value={newRollNo}
                        onChange={(e) => setNewRollNo(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-sm font-mono font-bold text-slate-900 dark:text-white ${
                          rollCollisionStudent
                            ? "border-amber-500"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                        placeholder="Roll No"
                      />
                      {rollCollisionStudent && (
                        <span className="text-[11px] text-amber-600 font-bold block mt-0.5">
                          Roll {newRollNo} पहले से {rollCollisionStudent.name} को मिला है
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        मासिक ट्यूशन शुल्क (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newMonthlyFee}
                        onChange={(e) => setNewMonthlyFee(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        सत्र शुल्क प्रारंभ तिथि (Session Start)
                      </label>
                      <input
                        type="date"
                        value={effectiveJoinDate}
                        onChange={(e) => setEffectiveJoinDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        रसीद दिनांक (Counter Date)
                      </label>
                      <input
                        type="date"
                        value={reAdmCounterDate}
                        onChange={(e) => setReAdmCounterDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Bus Toggle */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUsesBus}
                        onChange={(e) => setNewUsesBus(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <Bus className="w-4 h-4 text-blue-600" />
                      स्कूल बस सेवा (Transport)
                    </label>
                    {newUsesBus && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">बस शुल्क ₹</span>
                        <input
                          type="number"
                          min="0"
                          value={newBusFee}
                          onChange={(e) => setNewBusFee(e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fee Collection & Remaining Back-Due Calculation */}
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          नया Re-Admission शुल्क (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={reAdmissionFee}
                          onChange={(e) => setReAdmissionFee(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                          अभी जमा राशि (Paid Now ₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={paidNow}
                          onChange={(e) => setPaidNow(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-sm font-mono font-black text-emerald-700 dark:text-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          भुगतान माध्यम (Mode)
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                        >
                          <option value="Cash">Cash (नकद)</option>
                          <option value="UPI">UPI / PhonePe / GPay</option>
                          <option value="Bank">Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/70 dark:border-blue-800/60 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-slate-600 dark:text-slate-300 font-semibold font-mono tabular-nums">
                          Carried Back Due (₹{effectiveBackDueAmount.toLocaleString("en-IN")}) + Re-Adm Fee (₹
                          {parsedReAdmFee.toLocaleString("en-IN")}) ={" "}
                          <strong>Total ₹{totalPayable.toLocaleString("en-IN")}</strong>
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-bold">
                          {(existingTargetStudent ? effectiveBackDueAmount : remainingBackDue) > 0
                            ? `शेष ₹${(existingTargetStudent ? effectiveBackDueAmount : remainingBackDue).toLocaleString("en-IN")} हर मासिक Fee Slip में जुड़ेगा।`
                            : "पूरा बकाया चुकता (मासिक Fee Slip पर कोई पिछला बकाया नहीं जुड़ेगा)"}
                        </p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-[11px] font-sans font-bold text-slate-500 block">
                          Fee Slip में जुड़ने वाला बकाया
                        </span>
                        <span
                          className={`text-lg font-black ${
                            (existingTargetStudent ? effectiveBackDueAmount : remainingBackDue) > 0
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          ₹{(existingTargetStudent ? effectiveBackDueAmount : remainingBackDue).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="टिप्पणी / नोट (वैकल्पिक)..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmReAdmission}
                      disabled={saving || !targetClassId || sourceSessionId === targetSessionId}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-black transition flex items-center gap-2 cursor-pointer"
                    >
                      {existingTargetStudent ? <Pencil className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      {saving
                        ? "सेव हो रहा है..."
                        : existingTargetStudent
                        ? `Re-Admission अपडेट करें (${targetSession?.name || ""})`
                        : `पुनः प्रवेश कन्फर्म करें (${targetSession?.name || ""})`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ══════════════ BULK CLASS RE-ADMISSION MODE ══════════════ */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                पुरानी कक्षा (Source Class)
              </label>
              <select
                value={bulkSourceClassId}
                onChange={(e) => setBulkSourceClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
              >
                {sourceClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-blue-600 mb-1">
                नई कक्षा (Target Class)
              </label>
              <select
                value={bulkTargetClassId}
                onChange={(e) => {
                  setBulkTargetClassId(e.target.value);
                  const cls = targetClasses.find((c) => c.id === e.target.value);
                  if (cls) {
                    setBulkUniformReAdmFee(String(resolveTargetClassRates(cls).defaultReAdmissionFee || 0));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-sm font-bold"
              >
                <option value="">-- कक्षा चुनें --</option>
                {targetClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="ALUMNI">Pass-Out / Alumni (निष्क्रिय करें)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                सेक्शन (Section)
              </label>
              <select
                value={bulkTargetSection}
                onChange={(e) => setBulkTargetSection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
              >
                <option value="">Keep Previous / Common</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Re-Admission शुल्क (₹ प्रति छात्र)
              </label>
              <input
                type="number"
                min="0"
                value={bulkUniformReAdmFee}
                onChange={(e) => setBulkUniformReAdmFee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                सत्र शुल्क प्रारंभ तिथि
              </label>
              <input
                type="date"
                value={bulkSessionStartDate}
                onChange={(e) => setBulkSessionStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkAutoRoll}
                  onChange={(e) => setBulkAutoRoll(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                Roll No ऑटो-सीक्वेंस में सेट करें
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkCarryBackDue}
                  onChange={(e) => setBulkCarryBackDue(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                पिछला बकाया (Auto Back Due) साथ ले जाएं
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const pending = bulkEligibleStudents.filter((s) => !isAlreadyReAdmitted(s));
                  if (bulkSelectedIds.length === pending.length) {
                    setBulkSelectedIds([]);
                  } else {
                    setBulkSelectedIds(pending.map((s) => s.id));
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {bulkSelectedIds.length > 0 ? "सभी अनचेक करें" : "सभी Pending चुनें"}
              </button>
              <button
                type="button"
                onClick={handleBulkConfirm}
                disabled={bulkSaving || !bulkTargetClassId || bulkSelectedIds.length === 0 || sourceSessionId === targetSessionId}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                {bulkSaving
                  ? bulkProgress || "प्रोसेस हो रहा..."
                  : `चयनित ${bulkSelectedIds.length} छात्रों का Re-Admission करें`}
              </button>
            </div>
          </div>

          {/* Bulk Roster Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-2.5 w-10">चुनें</th>
                  <th className="p-2.5">छात्र व Adm No</th>
                  <th className="p-2.5">पुराना Roll</th>
                  <th className="p-2.5">नया Roll</th>
                  <th className="p-2.5 text-right">ऑटो बकाया</th>
                  <th className="p-2.5 text-right">Carry Back Due (Edit ₹)</th>
                  <th className="p-2.5 text-right">मासिक ट्यूशन (₹)</th>
                  <th className="p-2.5 text-right">स्थिति</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                {bulkEligibleStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center font-sans text-slate-400">
                      चयनित कक्षा में कोई छात्र नहीं मिला।
                    </td>
                  </tr>
                ) : (
                  bulkEligibleStudents.map((st) => {
                    const already = isAlreadyReAdmitted(st);
                    const checked = bulkSelectedIds.includes(st.id);
                    const ledger = bulkLedgerMap.get(st.id);
                    const autoDue = ledger?.totalBackDue || 0;
                    const editedDue =
                      bulkDueOverrides[st.id] !== undefined
                        ? bulkDueOverrides[st.id]
                        : String(bulkCarryBackDue ? autoDue : 0);
                    return (
                      <tr
                        key={st.id}
                        className={already ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}
                      >
                        <td className="p-2.5">
                          {already ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setBulkSelectedIds((prev) =>
                                  prev.includes(st.id) ? prev.filter((x) => x !== st.id) : [...prev, st.id]
                                )
                              }
                              className="text-blue-600 cursor-pointer"
                            >
                              {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                            </button>
                          )}
                        </td>
                        <td className="p-2.5 font-sans">
                          <span className="font-bold text-slate-900 dark:text-white block">{st.name}</span>
                          <span className="text-[11px] text-slate-500">
                            Adm {st.admissionNo || "—"} · पिता: {st.fatherName || "—"}
                          </span>
                        </td>
                        <td className="p-2.5">{st.rollNo || "—"}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            disabled={Boolean(already)}
                            value={already ? already.rollNo : bulkRollOverrides[st.id] ?? st.rollNo ?? ""}
                            onChange={(e) =>
                              setBulkRollOverrides((prev) => ({ ...prev, [st.id]: e.target.value }))
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-right text-rose-600 font-bold">
                          ₹{autoDue.toLocaleString("en-IN")}
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            disabled={Boolean(already) || !bulkCarryBackDue}
                            value={already ? String(already.previousSessionDue ?? 0) : editedDue}
                            onChange={(e) =>
                              setBulkDueOverrides((prev) => ({ ...prev, [st.id]: e.target.value }))
                            }
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-right"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            disabled={Boolean(already)}
                            value={
                              already
                                ? String(already.monthlyFee ?? 0)
                                : bulkMonthlyOverrides[st.id] ?? String(st.monthlyFee ?? 0)
                            }
                            onChange={(e) =>
                              setBulkMonthlyOverrides((prev) => ({ ...prev, [st.id]: e.target.value }))
                            }
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-right"
                          />
                        </td>
                        <td className="p-2.5 text-right font-sans">
                          {already ? (
                            <span className="text-emerald-600 font-bold">
                              Done ({already.className})
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Batch Completion Summary with quick A4 Print/Share links */}
          {bulkResults.length > 0 && (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Batch Re-Admission Summary ({bulkResults.length} छात्र सफल)
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {bulkResults.map((r) => (
                  <div
                    key={r.student.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">
                        {r.student.name} (Roll #{r.student.rollNo})
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Slip Due: ₹{r.carriedDue.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPrintStudioFor(r.student, r.fee, r.className, "combined")}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      Print A4 / Share
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* A4 Re-Admission Form + Fee Slip Studio (with Print, PDF, WhatsApp & NSTA Share) */}
      {printStudio.open && printStudio.student && (
        <AdmissionFormPrintModal
          isOpen={printStudio.open}
          onClose={() => setPrintStudio((p) => ({ ...p, open: false }))}
          school={school}
          student={printStudio.student}
          className={printStudio.className}
          sessionName={targetSession?.name || "2026-27"}
          feeRecord={printStudio.fee}
          initialMode={printStudio.mode}
          defaultMasked={maskSensitiveData}
        />
      )}

      {/* POS / Thermal Receipt Preview */}
      {receiptPreview && (
        <OfficialFeeReceiptModal
          fee={receiptPreview.fee}
          student={receiptPreview.student}
          school={school}
          className={receiptPreview.className}
          sessionName={targetSession?.name || "2026-27"}
          onClose={() => setReceiptPreview(null)}
          defaultMasked={maskSensitiveData}
        />
      )}
    </div>
  );
};
