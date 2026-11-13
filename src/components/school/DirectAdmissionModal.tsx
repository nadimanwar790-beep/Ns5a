import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  UserPlus,
  Zap,
  ClipboardList,
  IndianRupee,
  Bus,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Printer,
  Loader2,
  FileCheck2,
  AlertCircle,
} from "lucide-react";
import { DirectUploadButton } from "../DirectUploadButton";
import { getDynamicAcademicSessionLabel } from "../../utils/safeBrowserActions";
import {
  saveStudent,
  updateStudent,
  saveFee,
  generateId,
  generateNextAdmissionNo,
  saveSchoolUserProfile,
  getLocalStudents,
  setLocalStudents,
  isStudentInClass,
  getTeachers,
  getStaffEmployees,
  getSchoolReferralSettings,
  saveSchoolReferralSettings,
} from "../../school-firebase";
import { saveUserToLive } from "../../firebase";
import { enrollStudentFromPhotoUrl } from "../../utils/faceRecognitionEngine";
import type {
  School,
  SchoolClass,
  SchoolSession,
  SchoolStudent,
  MonthlyFee,
  ReferralCommissionScope,
  ReferralCommissionDuration,
  SeniorStream,
} from "../../school-types";
import {
  detectFamilySiblings,
  mergeSchoolReferrerList,
  type ReferrerOption,
} from "../../utils/schoolReferralSiblingEngine";
import {
  canRoleGiveDiscount,
  clampDiscountAmount,
  getSilentMaxDiscountAmount,
  buildSplitPayModeInfo,
  recordDiscountEntry,
  DISPLAY_DISCOUNT_LABEL,
} from "../../utils/schoolDiscountAndPayment";
import { AdmissionReferralAndSiblingPanel } from "./AdmissionReferralAndSiblingPanel";
import {
  BLOOD_GROUPS,
  ADMISSION_CATEGORIES,
  ADMISSION_DOCUMENT_OPTIONS,
  SENIOR_STREAMS,
  isSeniorClass,
  sortSchoolClasses,
  getDefaultSubjectsForClass,
} from "../../school-types";

interface FeeLineDraft {
  id: string;
  description: string;
  due: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  classes: SchoolClass[];
  activeSession: SchoolSession | null;
  defaultClassId?: string;
  existingStudents?: SchoolStudent[];
  adminUid?: string;
  userRole?: string;
  actorName?: string;
  onSuccess: (student: SchoolStudent, admissionFee?: MonthlyFee | null) => void;
}

interface BatchStudentDraft {
  id: string;
  name: string;
  classId: string;
  className: string;
  fatherName: string;
  motherName: string;
  phone: string;
  whatsappNo: string;
  gender: "male" | "female" | "other";
  rollNo: string;
  admissionNo: string;
  monthlyFee: number;
  baseMonthlyFee: number;
  usesBus: boolean;
  busRoute: string;
  busFee: number;
  feeLines: FeeLineDraft[];
  grossTotal: number;
  concession: number;
}

export const DirectAdmissionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  classes,
  activeSession,
  defaultClassId,
  existingStudents = [],
  adminUid = "admin",
  userRole = "SCHOOL_ADMIN",
  actorName = "School Admin",
  onSuccess,
}) => {
  const canGiveDiscount = useMemo(() => canRoleGiveDiscount(userRole), [userRole]);
  const sortedClasses = useMemo(() => sortSchoolClasses(classes), [classes]);
  const [entryMode, setEntryMode] = useState<"quick" | "full">("full");
  const [classId, setClassId] = useState<string>(defaultClassId || classes[0]?.id || "");
  const [stream, setStream] = useState<SeniorStream>("Science");
  const [admissionNo, setAdmissionNo] = useState<string>("");
  const [admissionDate, setAdmissionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rollNo, setRollNo] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [category, setCategory] = useState<string>("General");
  const [apaarId, setApaarId] = useState<string>("");
  const [aadhaarNo, setAadhaarNo] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Parents & Contact
  const [fatherName, setFatherName] = useState<string>("");
  const [fatherOccupation, setFatherOccupation] = useState<string>("");
  const [fatherAadhaar, setFatherAadhaar] = useState<string>("");
  const [fatherPhone, setFatherPhone] = useState<string>("");
  const [fatherWhatsapp, setFatherWhatsapp] = useState<string>("");
  const [motherName, setMotherName] = useState<string>("");
  const [motherOccupation, setMotherOccupation] = useState<string>("");
  const [motherAadhaar, setMotherAadhaar] = useState<string>("");
  const [motherPhone, setMotherPhone] = useState<string>("");
  const [motherWhatsapp, setMotherWhatsapp] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [whatsappNo, setWhatsappNo] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Address, Previous School & Statutory Compliance Fields
  const [admissionType, setAdmissionType] = useState<"NEW" | "READMISSION">("NEW");
  const [religion, setReligion] = useState<string>("Hindu");
  const [nationality, setNationality] = useState<string>("Indian");
  const [annualIncome, setAnnualIncome] = useState<string>("");
  const [identificationMark, setIdentificationMark] = useState<string>("");
  const [medicalHistory, setMedicalHistory] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");
  const [emergencyRelation, setEmergencyRelation] = useState<string>("");
  const [emergencyWhatsapp, setEmergencyWhatsapp] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [previousSchool, setPreviousSchool] = useState<string>("");
  const [previousMarks, setPreviousMarks] = useState<string>("");

  // Transport & Monthly Tuition
  const [baseMonthlyFee, setBaseMonthlyFee] = useState<number>(0);
  const [monthlyFee, setMonthlyFee] = useState<number>(0);
  const [usesBus, setUsesBus] = useState<boolean>(false);
  const [busRoute, setBusRoute] = useState<string>("");
  const [busFee, setBusFee] = useState<number>(0);

  // Sibling / Same Family Discount & Teacher 10% Referral
  const [referrers, setReferrers] = useState<ReferrerOption[]>([]);
  const [referredByTeacherId, setReferredByTeacherId] = useState<string>("");
  const [customTeacherName, setCustomTeacherName] = useState<string>("");
  const [commissionPct, setCommissionPct] = useState<number>(10);
  const [commissionScope, setCommissionScope] = useState<ReferralCommissionScope>("all_fees");
  const [commissionDuration, setCommissionDuration] = useState<ReferralCommissionDuration>("1_year");
  const [manualSiblingMarked, setManualSiblingMarked] = useState<boolean>(false);
  const [siblingDiscountPct, setSiblingDiscountPct] = useState<number>(0);
  const [applyMonthlySiblingDiscount, setApplyMonthlySiblingDiscount] = useState<boolean>(false);

  // Documents Checklist
  const [submittedDocs, setSubmittedDocs] = useState<string[]>([
    "Birth Certificate (जन्म प्रमाण पत्र)",
    "Student Aadhaar Card (छात्र आधार)",
    "Passport Photos (पासपोर्ट फोटो)",
  ]);

  // Instant Admission Fee Collection (with Online + Offline Split Payment & Multi-Admission Batch)
  const [collectFeeNow, setCollectFeeNow] = useState<boolean>(true);
  const [feeLines, setFeeLines] = useState<FeeLineDraft[]>([]);
  const [concession, setConcession] = useState<number>(0);
  const [onlinePaidInput, setOnlinePaidInput] = useState<string>("0");
  const [offlinePaidInput, setOfflinePaidInput] = useState<string>("");
  const [paidManuallyEdited, setPaidManuallyEdited] = useState<boolean>(false);
  const [payRefNo, setPayRefNo] = useState<string>("");

  // Multi-Admission Batch (2-3 Admissions together)
  const [batchQueue, setBatchQueue] = useState<BatchStudentDraft[]>([]);
  const [batchDiscountMode, setBatchDiscountMode] = useState<"per_head" | "one_time_total">("per_head");
  const [batchTotalDiscount, setBatchTotalDiscount] = useState<number>(0);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) || null,
    [classes, classId]
  );

  useEffect(() => {
    if (selectedClass?.stream && (selectedClass.stream === "Science" || selectedClass.stream === "Commerce" || selectedClass.stream === "Arts")) {
      setStream(selectedClass.stream as SeniorStream);
    }
  }, [selectedClass]);

  // Build dynamic fee rows from selected class feeStructure & Admin enabledHeads
  // Build dynamic fee rows from selected class feeStructure & Admin enabledHeads
  const buildDefaultFeeLinesForClass = (cls: SchoolClass | null, includeBus: boolean, customBusAmt?: number): FeeLineDraft[] => {
    const fs = cls?.feeStructure;
    const lines: FeeLineDraft[] = [];
    if (fs) {
      const toggles = fs.enabledHeads;
      const admEnabled = typeof toggles?.admissionFee === "boolean" ? toggles.admissionFee : Number(fs.admissionFee) > 0;
      const regEnabled = typeof toggles?.registrationFee === "boolean" ? toggles.registrationFee : Number(fs.registrationFee) > 0;
      const examEnabled = typeof toggles?.examinationFee === "boolean" ? toggles.examinationFee : Number(fs.examinationFee) > 0;
      const devEnabled = typeof toggles?.developmentCharge === "boolean" ? toggles.developmentCharge : Number(fs.developmentCharge) > 0;
      const annEnabled = typeof toggles?.annualCharges === "boolean" ? toggles.annualCharges : Number(fs.annualCharges) > 0;
      const tuiEnabled = typeof toggles?.tuitionFee === "boolean" ? toggles.tuitionFee : Number(fs.tuitionFee) > 0;
      const idEnabled = typeof toggles?.idCardCharge === "boolean" ? toggles.idCardCharge : true;
      const diaryEnabled = typeof toggles?.diaryCharge === "boolean" ? toggles.diaryCharge : true;
      const tieEnabled = typeof toggles?.tieBeltCharge === "boolean" ? toggles.tieBeltCharge : true;
      const cauEnabled = typeof toggles?.cautionMoney === "boolean" ? toggles.cautionMoney : Number(fs.cautionMoney) > 0;
      const busEnabled = typeof toggles?.busFee === "boolean" ? toggles.busFee : true;

      if (admEnabled && Number(fs.admissionFee || 0) >= 0) {
        lines.push({ id: "fs_adm", description: "Admission Fee (प्रवेश शुल्क)", due: Number(fs.admissionFee || 0) });
      }
      if (regEnabled && Number(fs.registrationFee || 0) >= 0) {
        lines.push({ id: "fs_reg", description: "Registration & Form Fee (फॉर्म शुल्क)", due: Number(fs.registrationFee || 0) });
      }
      if (idEnabled || diaryEnabled || tieEnabled) {
        lines.push({ id: "fs_kit", description: "ID Card, Diary & Tie-Belt (आईडी व डायरी)", due: Number(fs.idCardCharge || 100) + Number(fs.diaryCharge || 100) + Number(fs.tieBeltCharge || 100) });
      }
      if (tuiEnabled && Number(fs.tuitionFee || 0) >= 0) {
        lines.push({ id: "fs_tui", description: "1st Month Tuition Fee (मासिक शिक्षण शुल्क)", due: Number(fs.tuitionFee || 0) });
      }
      if (examEnabled && Number(fs.examinationFee || 0) > 0) {
        lines.push({ id: "fs_exam", description: "Examination Fee (परीक्षा शुल्क)", due: Number(fs.examinationFee || 0) });
      }
      if (devEnabled && Number(fs.developmentCharge || 0) > 0) {
        lines.push({ id: "fs_dev", description: "Development Charge (विकास शुल्क)", due: Number(fs.developmentCharge || 0) });
      }
      if (annEnabled && Number(fs.annualCharges || 0) >= 0) {
        lines.push({ id: "fs_ann", description: "Annual Charges (वार्षिक शुल्क)", due: Number(fs.annualCharges || 0) });
      }
      if (cauEnabled && Number(fs.cautionMoney || 0) >= 0) {
        lines.push({ id: "fs_cau", description: "Caution / Kit Fee (कॉशन व किट शुल्क)", due: Number(fs.cautionMoney || 0) });
      }
      if (Array.isArray(fs.customHeads)) {
        fs.customHeads.forEach((h, idx) => {
          if (h.enabled !== false && Number(h.amount || 0) >= 0) {
            lines.push({ id: `fs_cust_${idx}`, description: h.name, due: Number(h.amount || 0) });
          }
        });
      }
      if (busEnabled && includeBus) {
        const bAmt = customBusAmt !== undefined ? customBusAmt : Number(fs.busFee || 0);
        if (bAmt > 0) {
          lines.push({ id: "fs_bus", description: "Transport / Bus Fee (वाहन शुल्क)", due: bAmt });
        }
      }
    }

    if (lines.length === 0 && !fs?.enabledHeads) {
      const defTuition = Number(cls?.defaultFee || 0) || 350;
      lines.push(
        { id: "def_1", description: "Admission Fee (प्रवेश शुल्क)", due: 1000 },
        { id: "def_2", description: "Registration & Form Fee (फॉर्म शुल्क)", due: 200 },
        { id: "def_3", description: "ID Card, Diary & Tie-Belt (आईडी व डायरी)", due: 300 },
        { id: "def_4", description: "1st Month Tuition Fee (प्रथम माह शुल्क)", due: defTuition },
        { id: "def_5", description: "Examination Fee (परीक्षा शुल्क)", due: 300 },
        { id: "def_6", description: "Development Charge (विकास शुल्क)", due: 300 }
      );
      if (includeBus && (customBusAmt || 0) > 0) {
        lines.push({ id: "def_bus", description: "Transport / Bus Fee (वाहन शुल्क)", due: Number(customBusAmt) });
      }
    }
    return lines;
  };

  // Initialize when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const initialClsId = defaultClassId || classes[0]?.id || "";
    setClassId(initialClsId);
    setAdmissionNo(generateNextAdmissionNo(school, existingStudents.length));
    setAdmissionDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setPaidManuallyEdited(false);
    setReferredByTeacherId("");
    setCustomTeacherName("");
    setManualSiblingMarked(false);
    setSiblingDiscountPct(0);
    setApplyMonthlySiblingDiscount(false);
    setConcession(0);

    Promise.all([
      getTeachers(school.id).catch(() => []),
      getStaffEmployees(school.id).catch(() => []),
      getSchoolReferralSettings(school.id).catch(() => null),
    ]).then(([tList, sList, refSettings]) => {
      setReferrers(mergeSchoolReferrerList(tList, sList));
      if (refSettings) {
        setCommissionPct(Number(refSettings.defaultCommissionPct ?? 10));
        setCommissionScope(refSettings.commissionScope || "all_fees");
        setCommissionDuration(refSettings.commissionDuration || "1_year");
      }
    });
  }, [isOpen, school.id]);

  // Update class-linked defaults (next roll no, monthly tuition, bus fee, admission fee heads)
  useEffect(() => {
    if (!isOpen) return;
    const cls = classes.find((c) => c.id === classId) || null;
    const classStudents = existingStudents.filter((s) => isStudentInClass(s, classId, cls?.name));
    const maxRoll = classStudents.reduce((max, s) => {
      const num = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    setRollNo(String(maxRoll + 1));

    const nextMonthly = Number(cls?.feeStructure?.tuitionFee ?? cls?.defaultFee ?? 0);
    setBaseMonthlyFee(nextMonthly);
    setMonthlyFee(nextMonthly);

    const nextBus = Number(cls?.feeStructure?.busFee ?? 0);
    setBusFee(nextBus);

    setFeeLines(buildDefaultFeeLinesForClass(cls, usesBus, nextBus));
    setPaidManuallyEdited(false);
  }, [classId, isOpen]);

  // Sync bus row when usesBus or busFee changes
  useEffect(() => {
    setFeeLines((prev) => {
      const withoutBus = prev.filter((l) => l.id !== "fs_bus" && l.id !== "def_bus");
      if (usesBus && Number(busFee) > 0) {
        return [...withoutBus, { id: "fs_bus", description: `Transport / Bus Fee (${busRoute || "School Bus"})`, due: Number(busFee) }];
      }
      return withoutBus;
    });
  }, [usesBus, busFee, busRoute]);

  const studentPoolForFamilyCheck = useMemo(() => {
    const locals = getLocalStudents(school.id);
    const map = new Map<string, SchoolStudent>();
    existingStudents.forEach((s) => s?.id && map.set(s.id, s));
    locals.forEach((s) => s?.id && map.set(s.id, s));
    return Array.from(map.values());
  }, [existingStudents, school.id, isOpen]);

  const siblingDetection = useMemo(
    () =>
      detectFamilySiblings(
        {
          fatherName,
          motherName,
          whatsappNo: whatsappNo || phone,
          phone,
          fatherAadhaar,
          motherAadhaar,
          aadhaarNo,
          address,
        },
        studentPoolForFamilyCheck
      ),
    [fatherName, motherName, whatsappNo, phone, fatherAadhaar, motherAadhaar, aadhaarNo, address, studentPoolForFamilyCheck]
  );

  const grossTotal = useMemo(
    () => feeLines.reduce((sum, item) => sum + (Number(item.due) || 0), 0),
    [feeLines]
  );
  const busLineTotal = useMemo(
    () =>
      feeLines.reduce(
        (sum, item) =>
          item.id === "fs_bus" || item.id === "def_bus" || /bus|transport|वाहन/i.test(item.description)
            ? sum + (Number(item.due) || 0)
            : sum,
        0
      ),
    [feeLines]
  );
  const eligibleGrossExclBus = Math.max(0, grossTotal - busLineTotal);
  const effectiveConcession = useMemo(() => {
    if (!canGiveDiscount) return 0;
    return clampDiscountAmount(grossTotal, concession);
  }, [canGiveDiscount, grossTotal, concession]);

  const netPayable = Math.max(0, grossTotal - effectiveConcession);
  const netPayableExclBus = Math.max(0, netPayable - busLineTotal);

  const batchGrossSum = useMemo(
    () => batchQueue.reduce((s, b) => s + b.grossTotal, 0) + (name.trim() ? grossTotal : 0),
    [batchQueue, name, grossTotal]
  );

  const effectiveBatchTotalDiscount = useMemo(() => {
    if (!canGiveDiscount) return 0;
    if (batchQueue.length === 0) return effectiveConcession;
    if (batchDiscountMode === "one_time_total") {
      return clampDiscountAmount(batchGrossSum, batchTotalDiscount);
    }
    return (
      batchQueue.reduce((s, b) => s + clampDiscountAmount(b.grossTotal, b.concession), 0) +
      (name.trim() ? effectiveConcession : 0)
    );
  }, [canGiveDiscount, batchQueue, batchDiscountMode, batchGrossSum, batchTotalDiscount, effectiveConcession, name]);

  const effectiveCombinedNetPayable = Math.max(0, batchGrossSum - effectiveBatchTotalDiscount);

  useEffect(() => {
    if (!paidManuallyEdited) {
      setOnlinePaidInput("0");
      setOfflinePaidInput(String(batchQueue.length > 0 ? effectiveCombinedNetPayable : netPayable));
    }
  }, [netPayable, effectiveCombinedNetPayable, batchQueue.length, paidManuallyEdited]);

  const onlinePaidNow = Math.max(0, Number(onlinePaidInput) || 0);
  const offlinePaidNow = Math.max(0, Number(offlinePaidInput) || 0);
  const paidNow = onlinePaidNow + offlinePaidNow;
  const targetPayableForSummary = batchQueue.length > 0 ? effectiveCombinedNetPayable : netPayable;
  const balanceDue = Math.max(0, targetPayableForSummary - paidNow);

  const eligiblePaidNowExclBus =
    netPayable > 0 && netPayableExclBus > 0
      ? Math.min(netPayableExclBus, Math.round(paidNow * (netPayableExclBus / netPayable)))
      : 0;
  const eligibleDueExclBus = Math.max(0, netPayableExclBus - eligiblePaidNowExclBus);

  const handleApplySiblingPresetPct = (pct: number) => {
    if (!canGiveDiscount) return;
    const safePct = Math.min(10, Math.max(0, pct));
    setSiblingDiscountPct(safePct);
    const admDisc = safePct > 0 ? clampDiscountAmount(grossTotal, Math.round((eligibleGrossExclBus * safePct) / 100)) : 0;
    setConcession(admDisc);
    setPaidManuallyEdited(false);
    if (applyMonthlySiblingDiscount) {
      const mDisc = safePct > 0 ? Math.round((baseMonthlyFee * safePct) / 100) : 0;
      setMonthlyFee(Math.max(0, baseMonthlyFee - mDisc));
    }
  };

  const handleToggleMonthlySiblingDiscount = (enabled: boolean) => {
    if (!canGiveDiscount) return;
    setApplyMonthlySiblingDiscount(enabled);
    if (enabled && siblingDiscountPct > 0) {
      const mDisc = Math.round((baseMonthlyFee * siblingDiscountPct) / 100);
      setMonthlyFee(Math.max(0, baseMonthlyFee - mDisc));
    } else {
      setMonthlyFee(baseMonthlyFee);
    }
  };

  const handleAddToBatchQueue = () => {
    if (!name.trim()) {
      setError("बैच में जोड़ने के लिए छात्र का नाम (Student Name) भरें।");
      return;
    }
    if (batchQueue.length >= 2) {
      setError("एक बार में अधिकतम 3 छात्रों का बैच जोड़ा जा सकता है।");
      return;
    }
    const draft: BatchStudentDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: name.trim(),
      classId,
      className: selectedClass ? `${selectedClass.name}${selectedClass.section ? ` (${selectedClass.section})` : ""}` : "",
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      phone: phone.trim() || fatherPhone.trim() || whatsappNo.trim(),
      whatsappNo: whatsappNo.trim() || fatherWhatsapp.trim() || phone.trim(),
      gender,
      rollNo: rollNo.trim() || String(existingStudents.filter((s) => isStudentInClass(s, classId)).length + batchQueue.length + 1),
      admissionNo: admissionNo.trim() || generateNextAdmissionNo(school, existingStudents.length + batchQueue.length),
      monthlyFee: Number(monthlyFee) || 0,
      baseMonthlyFee: baseMonthlyFee || Number(monthlyFee) || 0,
      usesBus,
      busRoute: busRoute.trim(),
      busFee: Number(busFee) || 0,
      feeLines: [...feeLines],
      grossTotal,
      concession: canGiveDiscount ? effectiveConcession : 0,
    };
    setBatchQueue((prev) => [...prev, draft]);
    // Reset student-specific fields while keeping family/parent details for easy sibling multi-admission
    setName("");
    setRollNo("");
    setAdmissionNo("");
    setConcession(0);
    setPaidManuallyEdited(false);
    setError(null);
  };

  if (!isOpen) return null;

  const toggleDoc = (docName: string) => {
    setSubmittedDocs((prev) =>
      prev.includes(docName) ? prev.filter((d) => d !== docName) : [...prev, docName]
    );
  };

  const addCustomFeeLine = (presetName = "", presetAmt = 0) => {
    setFeeLines((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        description: presetName || "Custom Charge (Books / Dress / Kit)",
        due: presetAmt,
      },
    ]);
  };

  const handleSaveAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("कृपया छात्र का पूरा नाम (Student Full Name) भरें।");
      return;
    }
    if (!classId) {
      setError("कृपया पहले एक Class चुनें।");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const studentId = generateId();
      const finalAdmNo = admissionNo.trim() || generateNextAdmissionNo(school, existingStudents.length);
      const finalRoll = rollNo.trim() || "1";
      const receiptNo = collectFeeNow && grossTotal > 0 ? `ADM-${Math.floor(10000 + Math.random() * 90000)}` : undefined;

      const isFamilyMarked = siblingDetection.isExactFamily || manualSiblingMarked;
      const linkedSiblings =
        siblingDetection.exactMatches.length > 0
          ? siblingDetection.exactMatches
          : manualSiblingMarked
          ? siblingDetection.partialMatches
          : [];
      const siblingIds = linkedSiblings.map((s) => s.id);
      const resolvedFamilyGroupId = isFamilyMarked
        ? siblingDetection.familyGroupId || `FAM_${studentId.slice(-6)}`
        : undefined;

      const selectedRefObj = referrers.find((r) => r.id === referredByTeacherId);
      const resolvedRefId =
        referredByTeacherId === "__custom__"
          ? customTeacherName.trim()
            ? `custom_tea_${customTeacherName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
            : undefined
          : referredByTeacherId || undefined;
      const resolvedRefName =
        referredByTeacherId === "__custom__"
          ? customTeacherName.trim() || undefined
          : selectedRefObj?.name || undefined;

      const monthlySiblingConcession =
        isFamilyMarked && applyMonthlySiblingDiscount
          ? Math.max(0, baseMonthlyFee - (Number(monthlyFee) || 0))
          : 0;

      const isSenior = isSeniorClass(selectedClass?.name);
      const chosenStream = isSenior ? (selectedClass?.stream || stream) : undefined;

      const splitPayInfo = buildSplitPayModeInfo({
        onlineAmount: onlinePaidNow,
        offlineAmount: offlinePaidNow,
        date: new Date(admissionDate || Date.now()).toLocaleDateString("en-GB"),
        number: payRefNo.trim() || "-",
      });

      // Helper to save a single student + fee + discount ledger entry
      const saveSingleStudentBundle = async (
        draft: {
          name: string;
          classId: string;
          className: string;
          rollNo: string;
          admissionNo: string;
          gender: "male" | "female" | "other";
          fatherName: string;
          motherName: string;
          phone: string;
          whatsappNo: string;
          monthlyFee: number;
          baseMonthlyFee: number;
          usesBus: boolean;
          busRoute: string;
          busFee: number;
          feeLines: FeeLineDraft[];
          grossTotal: number;
          concessionAmt: number;
          allocatedPaidOnline: number;
          allocatedPaidOffline: number;
          isPrimaryForm: boolean;
          discountWhereLabel: string;
        }
      ): Promise<{ student: SchoolStudent; fee: MonthlyFee | null }> => {
        const sId = generateId();
        const sAdmNo = draft.admissionNo || generateNextAdmissionNo(school, existingStudents.length);
        const sRoll = draft.rollNo || "1";
        const sNetPayable = Math.max(0, draft.grossTotal - draft.concessionAmt);
        const sPaidTotal = draft.allocatedPaidOnline + draft.allocatedPaidOffline;
        const sBalanceDue = Math.max(0, sNetPayable - sPaidTotal);
        const sReceiptNo = collectFeeNow && draft.grossTotal > 0 ? `ADM-${Math.floor(10000 + Math.random() * 90000)}` : undefined;

        const sObj: SchoolStudent = {
          id: sId,
          schoolId: school.id,
          sessionId: activeSession?.id || "",
          classId: draft.classId,
          className: draft.className,
          stream: draft.isPrimaryForm ? chosenStream : undefined,
          name: draft.name,
          rollNo: sRoll,
          admissionNo: sAdmNo,
          gender: draft.gender,
          dateOfBirth: draft.isPrimaryForm ? (dateOfBirth || undefined) : undefined,
          bloodGroup: draft.isPrimaryForm ? (bloodGroup || undefined) : undefined,
          category: draft.isPrimaryForm ? (category || "General") : "General",
          apaarId: draft.isPrimaryForm ? (apaarId.trim() || undefined) : undefined,
          aadhaarNo: draft.isPrimaryForm ? (aadhaarNo.trim() || undefined) : undefined,
          fatherName: draft.fatherName || undefined,
          fatherOccupation: draft.isPrimaryForm ? (fatherOccupation.trim() || undefined) : undefined,
          fatherAadhaar: draft.isPrimaryForm ? (fatherAadhaar.trim() || undefined) : undefined,
          fatherPhone: draft.isPrimaryForm ? (fatherPhone.trim() || undefined) : undefined,
          fatherWhatsapp: draft.isPrimaryForm ? (fatherWhatsapp.trim() || undefined) : undefined,
          motherName: draft.motherName || undefined,
          motherOccupation: draft.isPrimaryForm ? (motherOccupation.trim() || undefined) : undefined,
          motherAadhaar: draft.isPrimaryForm ? (motherAadhaar.trim() || undefined) : undefined,
          motherPhone: draft.isPrimaryForm ? (motherPhone.trim() || undefined) : undefined,
          motherWhatsapp: draft.isPrimaryForm ? (motherWhatsapp.trim() || undefined) : undefined,
          phone: draft.phone || undefined,
          whatsappNo: draft.whatsappNo || undefined,
          email: draft.isPrimaryForm ? (email.trim() || undefined) : undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          pincode: pincode.trim() || undefined,
          previousSchool: draft.isPrimaryForm ? (previousSchool.trim() || undefined) : undefined,
          previousMarks: draft.isPrimaryForm ? (previousMarks.trim() || undefined) : undefined,
          religion: religion.trim() || undefined,
          nationality: nationality.trim() || undefined,
          annualIncome: annualIncome.trim() || undefined,
          identificationMark: draft.isPrimaryForm ? (identificationMark.trim() || undefined) : undefined,
          medicalHistory: draft.isPrimaryForm ? (medicalHistory.trim() || undefined) : undefined,
          emergencyContact: emergencyContact.trim() || undefined,
          emergencyPhone: emergencyPhone.trim() || undefined,
          emergencyRelation: emergencyRelation.trim() || undefined,
          emergencyWhatsapp: emergencyWhatsapp.trim() || undefined,
          admissionType,
          photoUrl: draft.isPrimaryForm ? (photoUrl || undefined) : undefined,
          usesBus: draft.usesBus,
          busRoute: draft.usesBus ? draft.busRoute : undefined,
          busFee: draft.usesBus ? draft.busFee : 0,
          submittedDocs,
          admissionReceiptNo: sReceiptNo,
          admissionTotalAmount: collectFeeNow ? sNetPayable : 0,
          admissionPaidAmount: collectFeeNow ? sPaidTotal : 0,
          admissionDueBalance: collectFeeNow && sBalanceDue > 0 ? sBalanceDue : 0,
          advanceMonthlyFeePaid: false,
          advanceMonthlyFeeDue: draft.monthlyFee,
          advanceMonthlyFeeMonth: (admissionDate || new Date().toISOString()).slice(0, 7),
          monthlyFee: draft.monthlyFee,
          baseMonthlyFee: draft.baseMonthlyFee || draft.monthlyFee,
          referredByTeacherId: resolvedRefId,
          referredByTeacherName: resolvedRefName,
          referralCommissionPct: resolvedRefId ? Number(commissionPct) || 10 : undefined,
          referralCommissionScope: resolvedRefId ? commissionScope : undefined,
          referralCommissionDuration: resolvedRefId ? commissionDuration : undefined,
          familyGroupId: resolvedFamilyGroupId,
          isSiblingMarked: isFamilyMarked || undefined,
          siblingStudentIds: siblingIds.length > 0 ? siblingIds : undefined,
          siblingDiscountPct: canGiveDiscount && isFamilyMarked && siblingDiscountPct > 0 ? Math.min(10, siblingDiscountPct) : undefined,
          siblingDiscountAmount: canGiveDiscount && monthlySiblingConcession > 0 ? monthlySiblingConcession : undefined,
          admissionSiblingDiscount: canGiveDiscount && isFamilyMarked && draft.concessionAmt > 0 ? draft.concessionAmt : undefined,
          joinDate: admissionDate || new Date().toISOString().slice(0, 10),
          active: true,
          createdAt: new Date().toISOString(),
        };

        const saved = await saveStudent(sObj);

        try {
          const curLocals = getLocalStudents(school.id);
          setLocalStudents(school.id, [saved, ...curLocals.filter((s) => s.id !== saved.id)]);
          const safeSlug = (school.code || school.id || "school").toLowerCase().replace(/[^a-z0-9]/g, "") || "school";
          const studentEmail =
            saved.email ||
            `${sAdmNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@${safeSlug}.edu.in`;

          await saveSchoolUserProfile({
            uid: saved.id,
            schoolId: school.id,
            role: "SCHOOL_STUDENT",
            name: saved.name,
            email: studentEmail,
            studentRef: saved.id,
            classId: draft.classId,
            sessionId: activeSession?.id || "2026-27",
          }).catch(() => {});

          saveUserToLive(
            {
              id: saved.id,
              uid: saved.id,
              displayId: `ROLL-${saved.rollNo}`,
              name: saved.name,
              email: studentEmail,
              mobile: saved.phone || "",
              role: "STUDENT",
              schoolId: school.id,
              classLevel: draft.classId,
              stream: chosenStream || "General",
              credits: 100,
              diamonds: 50,
              streak: 1,
              totalScore: 0,
              profileCompleted: true,
              subscriptionTier: "PRO",
              provider: "qr_student_id",
              isQrLogin: true,
              admissionNo: saved.admissionNo,
              rollNo: saved.rollNo,
              fatherName: saved.fatherName,
              motherName: saved.motherName,
              bloodGroup: saved.bloodGroup,
              monthlyFee: saved.monthlyFee,
            },
            { immediate: true }
          ).catch(() => {});

          // Auto-enroll biometric Face ID for new student so logout -> Face login works seamlessly
          if (saved.photoUrl) {
            enrollStudentFromPhotoUrl({
              id: saved.id,
              schoolId: school.id,
              name: saved.name,
              rollNo: String(saved.rollNo || ""),
              classId: saved.classId,
              className: saved.className,
              photoUrl: saved.photoUrl,
            }).catch(() => {});
          }
        } catch {}

        let savedFeeRec: MonthlyFee | null = null;
        if (collectFeeNow && draft.grossTotal > 0 && sReceiptNo) {
          const validItems = draft.feeLines
            .filter((l) => l.description.trim() && Number(l.due) >= 0)
            .map((l, idx) => ({
              id: l.id,
              slNo: idx + 1,
              description: l.description.trim(),
              due: Number(l.due) || 0,
              con: idx === 0 ? Math.min(Number(l.due) || 0, draft.concessionAmt) : 0,
              paid: Number(l.due) || 0,
            }));

          const sPayMode = buildSplitPayModeInfo({
            onlineAmount: draft.allocatedPaidOnline,
            offlineAmount: draft.allocatedPaidOffline,
            date: splitPayInfo.date,
            number: payRefNo.trim() || "-",
          });

          savedFeeRec = {
            schoolId: school.id,
            sessionId: activeSession?.id || "2026-27",
            studentId: saved.id,
            studentName: saved.name,
            rollNo: saved.rollNo,
            classId: draft.classId,
            month: (admissionDate || new Date().toISOString()).slice(0, 7),
            amount: sNetPayable,
            monthlyAmount: draft.monthlyFee,
            paid: sPaidTotal >= sNetPayable,
            paidDate: new Date().toISOString(),
            paidBy: adminUid,
            receiptNo: sReceiptNo,
            paidAmount: sPaidTotal,
            balanceDue: sBalanceDue,
            concession: draft.concessionAmt,
            siblingDiscountAmount: isFamilyMarked && draft.concessionAmt > 0 ? draft.concessionAmt : undefined,
            referredByTeacherId: resolvedRefId,
            referredByTeacherName: resolvedRefName,
            note: draft.concessionAmt > 0
              ? `${draft.discountWhereLabel} • Waived (Not carried forward)`
              : undefined,
            feeType: "admission",
            receiptCategory: "admission",
            includeBusFee: draft.usesBus,
            busFeeAmount: draft.usesBus ? draft.busFee : 0,
            busRoute: draft.usesBus ? draft.busRoute : undefined,
            payModeInfo: sPayMode,
            items: validItems,
          };
          await saveFee(savedFeeRec);
        }

        if (canGiveDiscount && draft.concessionAmt > 0) {
          recordDiscountEntry(school.id, {
            studentId: saved.id,
            studentName: saved.name,
            className: draft.className,
            rollNo: saved.rollNo,
            category: batchQueue.length > 0 ? "multi_admission" : "admission",
            whereLabel: draft.discountWhereLabel,
            grossAmount: draft.grossTotal,
            discountAmount: draft.concessionAmt,
            discountPct: draft.grossTotal > 0 ? Math.round((draft.concessionAmt / draft.grossTotal) * 1000) / 10 : 5,
            givenByName: actorName,
            givenByRole: userRole,
            note: `Online ₹${draft.allocatedPaidOnline} + Offline ₹${draft.allocatedPaidOffline}`,
          });
        }

        return { student: saved, fee: savedFeeRec };
      };

      // Build combined list (queued batch + current form)
      const allDrafts = [
        ...batchQueue.map((b) => ({
          name: b.name,
          classId: b.classId,
          className: b.className,
          rollNo: b.rollNo,
          admissionNo: b.admissionNo,
          gender: b.gender,
          fatherName: b.fatherName,
          motherName: b.motherName,
          phone: b.phone,
          whatsappNo: b.whatsappNo,
          monthlyFee: b.monthlyFee,
          baseMonthlyFee: b.baseMonthlyFee,
          usesBus: b.usesBus,
          busRoute: b.busRoute,
          busFee: b.busFee,
          feeLines: b.feeLines,
          grossTotal: b.grossTotal,
          rawConcession: b.concession,
          isPrimaryForm: false,
        })),
        {
          name: name.trim(),
          classId,
          className: selectedClass ? `${selectedClass.name}${selectedClass.section ? ` (${selectedClass.section})` : ""}` : "",
          rollNo: finalRoll,
          admissionNo: finalAdmNo,
          gender,
          fatherName: fatherName.trim(),
          motherName: motherName.trim(),
          phone: phone.trim() || fatherPhone.trim() || whatsappNo.trim(),
          whatsappNo: whatsappNo.trim() || fatherWhatsapp.trim() || phone.trim(),
          monthlyFee: Number(monthlyFee) || 0,
          baseMonthlyFee: baseMonthlyFee || Number(monthlyFee) || 0,
          usesBus,
          busRoute: busRoute.trim(),
          busFee: Number(busFee) || 0,
          feeLines,
          grossTotal,
          rawConcession: effectiveConcession,
          isPrimaryForm: true,
        },
      ];

      const totalGrossAll = allDrafts.reduce((s, d) => s + d.grossTotal, 0);
      let remainingOneTimeDisc = batchQueue.length > 0 && batchDiscountMode === "one_time_total" ? effectiveBatchTotalDiscount : 0;
      let remainingOnline = onlinePaidNow;
      let remainingOffline = offlinePaidNow;

      let primarySaved: { student: SchoolStudent; fee: MonthlyFee | null } | null = null;
      for (let i = 0; i < allDrafts.length; i++) {
        const d = allDrafts[i];
        let discAmt = 0;
        let whereLabel = "Admission Fee";
        if (canGiveDiscount) {
          if (batchQueue.length > 0 && batchDiscountMode === "one_time_total") {
            whereLabel = "Multi-Admission (One-Time Total)";
            if (i === allDrafts.length - 1) {
              discAmt = Math.min(d.grossTotal, remainingOneTimeDisc);
            } else {
              const share = totalGrossAll > 0 ? Math.round((d.grossTotal / totalGrossAll) * effectiveBatchTotalDiscount) : 0;
              discAmt = Math.min(remainingOneTimeDisc, share);
              remainingOneTimeDisc = Math.max(0, remainingOneTimeDisc - discAmt);
            }
          } else {
            whereLabel = batchQueue.length > 0 ? "Multi-Admission (Per Head)" : "Admission Fee";
            discAmt = clampDiscountAmount(d.grossTotal, d.rawConcession);
          }
        }

        const dNet = Math.max(0, d.grossTotal - discAmt);
        const allocOnline = Math.min(dNet, remainingOnline);
        remainingOnline = Math.max(0, remainingOnline - allocOnline);
        const allocOffline = Math.min(Math.max(0, dNet - allocOnline), remainingOffline);
        remainingOffline = Math.max(0, remainingOffline - allocOffline);

        const res = await saveSingleStudentBundle({
          ...d,
          concessionAmt: discAmt,
          allocatedPaidOnline: allocOnline,
          allocatedPaidOffline: allocOffline,
          discountWhereLabel: whereLabel,
        });

        if (isFamilyMarked && resolvedFamilyGroupId && linkedSiblings.length > 0) {
          linkedSiblings.forEach((sib) => {
            const mergedSibIds = Array.from(new Set([...(sib.siblingStudentIds || []), res.student.id]));
            void updateStudent(school.id, sib.id, {
              familyGroupId: sib.familyGroupId || resolvedFamilyGroupId,
              isSiblingMarked: true,
              siblingStudentIds: mergedSibIds,
            });
          });
        }

        if (d.isPrimaryForm) {
          primarySaved = res;
        }
      }

      if (primarySaved) {
        onSuccess(primarySaved.student, primarySaved.fee);
      }
    } catch (err: any) {
      console.error("Admission save error:", err);
      setError(err?.message || "Admission save करने में समस्या आई।");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/25 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                नया छात्र नामांकन (New Student Admission)
              </h2>
              <p className="text-xs text-blue-200/80">
                {school.name} • {activeSession?.name || `Session ${getDynamicAcademicSessionLabel()}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Mode Switcher */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setEntryMode("quick")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                entryMode === "quick"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Quick Entry (15s)</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode("full")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                entryMode === "full"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>📋 Full Admission + Receipt</span>
            </button>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Save होते ही Form + Receipt प्रिंट खुलेगा
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAdmission} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Academic & Photo Strip */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-16 h-20 rounded-xl border-2 border-dashed border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 text-center px-1">Passport Photo</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white">
                    Student Photo (Camera / Gallery)
                  </p>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    ID Card, Marksheet और Admission Form पर छपेगी
                  </p>
                  <DirectUploadButton
                    kind="image"
                    compact
                    currentUrl={photoUrl}
                    onUploaded={(url) => setPhotoUrl(url)}
                    onClear={() => setPhotoUrl("")}
                  />
                </div>
              </div>

              <div className="w-full sm:w-48">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Admission Date</label>
                <input
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Select Class *
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white"
                >
                  {sortedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section ? `(${cls.section})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Admission No. (Auto / Editable)
                </label>
                <input
                  type="text"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  placeholder="e.g. NSTZ-2026-001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono font-bold text-blue-700 dark:text-blue-300"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Roll Number *
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {isSeniorClass(selectedClass?.name) && (
              <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>🔬 Senior Secondary Stream (11वीं / 12वीं स्ट्रीम चयन) *</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    Mandatory for {selectedClass?.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SENIOR_STREAMS.map((st) => {
                    const isSel = stream === st.id;
                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => setStream(st.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSel
                            ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {st.icon} {st.id}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-indigo-900 dark:text-indigo-200 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <span className="font-bold">स्ट्रीम विषय (Pre-configured Subjects): </span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {getDefaultSubjectsForClass(selectedClass?.name || "Class 11", stream).join(", ")}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Student Full Name (छात्र का पूरा नाम) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Student Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Gender (लिंग)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-white"
                >
                  <option value="male">Male (छात्र)</option>
                  <option value="female">Female (छात्रा)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Date of Birth (जन्मतिथि)
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block mb-1">
                  🩸 Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-white"
                >
                  <option value="">Select (Optional)</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Calling Mobile (मोबाइल)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPhone(val);
                    if (!whatsappNo) setWhatsappNo(val);
                  }}
                  placeholder="10-digit Mobile"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Father's Name (पिता का नाम)
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Father's Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Mother's Name (माता का नाम)
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Mother's Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                  WhatsApp No. (Family Match)
                </label>
                <input
                  type="tel"
                  value={whatsappNo}
                  onChange={(e) => setWhatsappNo(e.target.value)}
                  placeholder="WhatsApp Mobile"
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                  Monthly Tuition Fee (₹/माह)
                </label>
                <input
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-sm font-black text-emerald-700 dark:text-emerald-300"
                />
              </div>
            </div>

            {/* Online Admission Matching Structure: Aadhaar & Address (Powers Auto Sibling Detection) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2.5 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mb-1">
                  💳 Student Aadhaar (छात्र आधार)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit UIDAI"
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                  💳 Father Aadhaar (पिता का आधार)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={fatherAadhaar}
                  onChange={(e) => setFatherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit Aadhaar"
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-pink-600 dark:text-pink-400 block mb-1">
                  💳 Mother Aadhaar (माता का आधार)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={motherAadhaar}
                  onChange={(e) => setMotherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit Aadhaar"
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-pink-900 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  📍 Village / Address (गाँव/मोहल्ला/पता)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Village / Street Address"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SAME-FAMILY SIBLING AUTO-DISCOUNT & TEACHER 10% REFERRAL COMMISSION */}
          <AdmissionReferralAndSiblingPanel
            siblingDetection={siblingDetection}
            manualSiblingMarked={manualSiblingMarked}
            onManualSiblingChange={setManualSiblingMarked}
            siblingDiscountPct={siblingDiscountPct}
            siblingAdmissionDiscountAmt={effectiveConcession}
            applyMonthlySiblingDiscount={applyMonthlySiblingDiscount}
            baseMonthlyTuition={baseMonthlyFee}
            eligibleAdmissionGrossExclBus={eligibleGrossExclBus}
            onApplySiblingPresetPct={handleApplySiblingPresetPct}
            onCustomAdmissionDiscountChange={(amt) => {
              if (!canGiveDiscount) return;
              setSiblingDiscountPct(0);
              setConcession(clampDiscountAmount(grossTotal, amt));
              setPaidManuallyEdited(false);
            }}
            onToggleMonthlySiblingDiscount={handleToggleMonthlySiblingDiscount}
            canGiveDiscount={canGiveDiscount}
            referrers={referrers}
            referredByTeacherId={referredByTeacherId}
            customTeacherName={customTeacherName}
            commissionPct={commissionPct}
            commissionScope={commissionScope}
            commissionDuration={commissionDuration}
            eligiblePaidNowExclBus={collectFeeNow ? eligiblePaidNowExclBus : 0}
            eligibleDueExclBus={collectFeeNow ? eligibleDueExclBus : netPayableExclBus}
            onSelectReferrer={setReferredByTeacherId}
            onCustomTeacherNameChange={setCustomTeacherName}
            onCommissionPctChange={setCommissionPct}
            onCommissionScopeChange={setCommissionScope}
            onCommissionDurationChange={(dur) => {
              setCommissionDuration(dur);
              void saveSchoolReferralSettings(school.id, { commissionDuration: dur });
            }}
          />

          {/* FULL ADMISSION EXTRA DETAILS */}
          {entryMode === "full" && (
            <>
              <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    UDISE+ / Aadhaar / Statutory &amp; Address Details (प्रवेश विवरण)
                  </h4>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAdmissionType("NEW")}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        admissionType === "NEW"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      New Admission
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdmissionType("READMISSION")}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        admissionType === "READMISSION"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      Re-Admission
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Category (वर्ग)</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                    >
                      {ADMISSION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Student Aadhaar (12-Digit)</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={aadhaarNo}
                      onChange={(e) => setAadhaarNo(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="XXXX XXXX XXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Father Occupation</label>
                    <input
                      type="text"
                      value={fatherOccupation}
                      onChange={(e) => setFatherOccupation(e.target.value)}
                      placeholder="e.g. Farmer / Business"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Father Aadhaar</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={fatherAadhaar}
                      onChange={(e) => setFatherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="12-digit Aadhaar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Mother Occupation</label>
                    <input
                      type="text"
                      value={motherOccupation}
                      onChange={(e) => setMotherOccupation(e.target.value)}
                      placeholder="e.g. Homemaker / Teacher"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Mother Aadhaar</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={motherAadhaar}
                      onChange={(e) => setMotherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="12-digit Aadhaar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Father & Mother Numbers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block mb-1">📞 Father Mobile (पिता का मोबाइल)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={fatherPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFatherPhone(val);
                        if (!phone || phone === fatherPhone) setPhone(val);
                      }}
                      placeholder="10-digit Mobile"
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">💬 Father WhatsApp (पिता व्हाट्सएप)</label>
                      {fatherPhone && fatherWhatsapp !== fatherPhone && (
                        <button
                          type="button"
                          onClick={() => setFatherWhatsapp(fatherPhone)}
                          className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                        >
                          Same as Mobile
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={fatherWhatsapp}
                      onChange={(e) => setFatherWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="WhatsApp No."
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-pink-700 dark:text-pink-300 block mb-1">📱 Mother Mobile (माता का मोबाइल)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit Mobile"
                      className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">💬 Mother WhatsApp (माता व्हाट्सएप)</label>
                      {motherPhone && motherWhatsapp !== motherPhone && (
                        <button
                          type="button"
                          onClick={() => setMotherWhatsapp(motherPhone)}
                          className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                        >
                          Same as Mobile
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={motherWhatsapp}
                      onChange={(e) => setMotherWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="WhatsApp No."
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">💬 WhatsApp Number (व्हाट्सएप नंबर)</label>
                      {phone && whatsappNo !== phone && (
                        <button
                          type="button"
                          onClick={() => setWhatsappNo(phone)}
                          className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                        >
                          Same as Calling
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={whatsappNo}
                      onChange={(e) => setWhatsappNo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="WhatsApp Mobile Number"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400">📞 Calling Mobile (प्राथमिक मोबाइल)</label>
                      <div className="flex items-center gap-1">
                        {fatherPhone && phone !== fatherPhone && (
                          <button
                            type="button"
                            onClick={() => setPhone(fatherPhone)}
                            className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                          >
                            पिता
                          </button>
                        )}
                        {motherPhone && phone !== motherPhone && (
                          <button
                            type="button"
                            onClick={() => setPhone(motherPhone)}
                            className="text-[10px] text-pink-600 hover:underline cursor-pointer"
                          >
                            माता
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit Calling Mobile"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Religion (धर्म)</label>
                    <input
                      type="text"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      placeholder="Hindu / Muslim / Sikh"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Nationality</label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="Indian"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Annual Family Income (₹/yr)</label>
                    <input
                      type="text"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Medical / Allergy Note</label>
                  <input
                    type="text"
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    placeholder="Normal / Fit"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
                  <div>
                    <label className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block mb-1">Emergency Person</label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="Uncle / Guardian Name"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block mb-1">Emergency Mobile</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Emergency Phone"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block mb-1">Emergency Relation</label>
                    <input
                      type="text"
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      placeholder="Uncle / Brother"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">💬 Emergency WhatsApp</label>
                      {emergencyPhone && emergencyWhatsapp !== emergencyPhone && (
                        <button
                          type="button"
                          onClick={() => setEmergencyWhatsapp(emergencyPhone)}
                          className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                        >
                          Same as Mobile
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={emergencyWhatsapp}
                      onChange={(e) => setEmergencyWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="WhatsApp No."
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Village / Mohalla / Street Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Complete residential address"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">City / District</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City / District"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">PIN Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                      placeholder="6-digit PIN"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Bus Facility Toggle */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={usesBus}
                      onChange={(e) => setUsesBus(e.target.checked)}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <Bus className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      School Bus / Van Transport सुविधा चाहिए
                    </span>
                  </label>

                  {usesBus && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={busRoute}
                        onChange={(e) => setBusRoute(e.target.value)}
                        placeholder="Stop / Route Name"
                        className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white w-44"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">Bus ₹:</span>
                        <input
                          type="number"
                          value={busFee}
                          onChange={(e) => setBusFee(Number(e.target.value))}
                          className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold w-24 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Submitted Checklist */}
              <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>जमा किए गए दस्तावेज़ (Documents Submitted — फॉर्म पर प्रिंट होंगे)</span>
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-600">{submittedDocs.length} Selected</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ADMISSION_DOCUMENT_OPTIONS.map((docItem) => {
                    const active = submittedDocs.includes(docItem);
                    return (
                      <label
                        key={docItem}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition select-none ${
                          active
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleDoc(docItem)}
                          className="w-3.5 h-3.5 accent-emerald-600"
                        />
                        <span className="truncate">{docItem}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Instant Admission Fee Collection & Receipt */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={collectFeeNow}
                  onChange={(e) => setCollectFeeNow(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
                  अभी Admission Fee जमा करें और फॉर्म के साथ रसीद निकालें
                </span>
              </label>

              {collectFeeNow && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addCustomFeeLine("Books & Copy Set (किताबें)", 1200)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                  >
                    + Books
                  </button>
                  <button
                    type="button"
                    onClick={() => addCustomFeeLine("School Uniform / Dress (ड्रेस)", 950)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                  >
                    + Dress
                  </button>
                  <button
                    type="button"
                    onClick={() => addCustomFeeLine("", 0)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
              )}
            </div>

            {collectFeeNow && (
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1.5">
                  {feeLines.map((line, index) => (
                    <div key={line.id} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">{index + 1}.</span>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          setFeeLines((prev) =>
                            prev.map((item) => (item.id === line.id ? { ...item, description: e.target.value } : item))
                          )
                        }
                        placeholder="Fee Head Name"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={line.due}
                          onChange={(e) =>
                            setFeeLines((prev) =>
                              prev.map((item) =>
                                item.id === line.id ? { ...item, due: Math.max(0, Number(e.target.value)) } : item
                              )
                            )
                          }
                          className="w-full pl-6 pr-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-right text-slate-800 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeeLines((prev) => prev.filter((item) => item.id !== line.id))}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Remove Fee Head"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Multi-Admission Batch (2-3 Students) Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800/70 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-black text-indigo-800 dark:text-indigo-300">
                        👨‍👩‍👧‍👦 एक साथ 2–3 एडमिशन (Multi-Admission Batch: {batchQueue.length + 1}/3)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {canGiveDiscount
                          ? "2–3 एडमिशन एक साथ करने पर Per-Head या Total पर एक बार Discount दे सकते हैं।"
                          : "एक साथ 2–3 छात्रों का एडमिशन एक ही रसीद/भुगतान में दर्ज करें।"}
                      </p>
                    </div>
                    {batchQueue.length < 2 && (
                      <button
                        type="button"
                        onClick={handleAddToBatchQueue}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black cursor-pointer inline-flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Next Student ({batchQueue.length + 1}→{batchQueue.length + 2})
                      </button>
                    )}
                  </div>

                  {batchQueue.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                      {batchQueue.map((b, idx) => (
                        <div key={b.id} className="flex items-center justify-between gap-2 text-[11px] bg-indigo-50/70 dark:bg-indigo-950/30 px-2.5 py-1.5 rounded-lg">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            #{idx + 1} {b.name} ({b.className}) — ₹{b.grossTotal.toLocaleString("en-IN")}
                            {canGiveDiscount && batchDiscountMode === "per_head" && b.concession > 0 && (
                              <span className="text-emerald-600 ml-1.5">(-₹{b.concession})</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBatchQueue((p) => p.filter((x) => x.id !== b.id))}
                            className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                          >
                            हटाएं
                          </button>
                        </div>
                      ))}

                      {canGiveDiscount && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase">Discount Type:</span>
                          <button
                            type="button"
                            onClick={() => setBatchDiscountMode("per_head")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer border ${
                              batchDiscountMode === "per_head"
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200"
                            }`}
                          >
                            Per-Head (अलग-अलग)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBatchDiscountMode("one_time_total")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer border ${
                              batchDiscountMode === "one_time_total"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200"
                            }`}
                          >
                            Only One Total Discount (कुल पर एक बार)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Role-based Discount Notice for Teacher */}
                {!canGiveDiscount && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    ⚠️ नोट: छूट (Discount) देने का विकल्प केवल Admin / Accountant के पास है। कम राशि जमा करने पर शेष राशि Due (बकाया) में गिनी जाएगी।
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/60">
                  {canGiveDiscount && (
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          {batchQueue.length > 0 && batchDiscountMode === "one_time_total"
                            ? "Total Discount (₹)"
                            : "Discount (₹)"}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const targetGross = batchQueue.length > 0 && batchDiscountMode === "one_time_total" ? batchGrossSum : grossTotal;
                            const fivePct = Math.round((targetGross * 5) / 100);
                            if (batchQueue.length > 0 && batchDiscountMode === "one_time_total") {
                              setBatchTotalDiscount(fivePct);
                            } else {
                              setConcession(fivePct);
                            }
                            setPaidManuallyEdited(false);
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-black cursor-pointer"
                        >
                          {DISPLAY_DISCOUNT_LABEL}
                        </button>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={batchQueue.length > 0 && batchDiscountMode === "one_time_total" ? batchTotalDiscount : concession}
                        onChange={(e) => {
                          const rawVal = Math.max(0, Number(e.target.value));
                          if (batchQueue.length > 0 && batchDiscountMode === "one_time_total") {
                            setBatchTotalDiscount(clampDiscountAmount(batchGrossSum, rawVal));
                          } else {
                            setConcession(clampDiscountAmount(grossTotal, rawVal));
                          }
                          setPaidManuallyEdited(false);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 block mb-1">
                      Online / UPI (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={onlinePaidInput}
                      onChange={(e) => {
                        setPaidManuallyEdited(true);
                        setOnlinePaidInput(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border-2 border-blue-400 bg-white dark:bg-slate-900 text-xs font-black text-blue-700 dark:text-blue-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block mb-1">
                      Offline / Cash (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={offlinePaidInput}
                      onChange={(e) => {
                        setPaidManuallyEdited(true);
                        setOfflinePaidInput(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 text-xs font-black text-emerald-700 dark:text-emerald-300"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      UTR / Ref No (Optional)
                    </label>
                    <input
                      type="text"
                      value={payRefNo}
                      onChange={(e) => setPayRefNo(e.target.value)}
                      placeholder="Ref / UTR No"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-xl px-3.5 py-2 border border-emerald-200 dark:border-emerald-800 text-xs">
                  <span>
                    Total: <strong>₹{(batchQueue.length > 0 ? batchGrossSum : grossTotal).toLocaleString("en-IN")}</strong>
                    {canGiveDiscount && (batchQueue.length > 0 ? effectiveBatchTotalDiscount : effectiveConcession) > 0 && (
                      <span className="text-emerald-600 font-bold ml-2">
                        Discount: -₹{(batchQueue.length > 0 ? effectiveBatchTotalDiscount : effectiveConcession).toLocaleString("en-IN")}
                      </span>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-blue-700 dark:text-blue-400 font-bold">
                      Online: ₹{onlinePaidNow.toLocaleString("en-IN")}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      Offline: ₹{offlinePaidNow.toLocaleString("en-IN")}
                    </span>
                    <span className="text-slate-900 dark:text-white font-black">
                      Paid: ₹{paidNow.toLocaleString("en-IN")}
                    </span>
                    <span className={`font-black ${balanceDue > 0 ? "text-rose-600" : "text-slate-500"}`}>
                      Balance Due: ₹{balanceDue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Admission...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>
                    {collectFeeNow && grossTotal > 0
                      ? "Save Admission & Print Form + Receipt"
                      : "Save Admission & Print Form"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
