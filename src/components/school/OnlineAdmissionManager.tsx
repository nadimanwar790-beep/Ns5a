// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "react-qr-code";
import {
  ChevronLeft,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  Phone,
  FileText,
  GraduationCap,
  Send,
  IndianRupee,
  Printer,
  ShieldCheck,
  ReceiptText,
  Bus,
  Plus,
  Trash2,
  Scissors,
  AlertCircle,
  FileCheck2,
  Upload,
  Camera,
  Sparkles,
  Copy,
  Smartphone,
  BadgeCheck,
  ExternalLink,
  QrCode,
  Image as ImageIcon,
  CheckCheck,
  Lock,
} from "lucide-react";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import type {
  School,
  SchoolClass,
  SchoolSession,
  AdmissionApplication,
  SchoolStudent,
  MonthlyFee,
} from "../../school-types";
import {
  BLOOD_GROUPS,
  ADMISSION_CATEGORIES,
  ADMISSION_DOCUMENT_OPTIONS,
} from "../../school-types";
import {
  getAdmissionApplications,
  saveAdmissionApplication,
  updateAdmissionStatus,
  saveStudent,
  saveFee,
  generateId,
  generateNextAdmissionNo,
  getLocalStudents,
  setLocalStudents,
  getLocalFees,
  saveSchoolUserProfile,
  isStudentInClass,
  getLocalClasses,
  subscribeToClasses,
  shouldUseDemoForSchool,
  isDemoRecord,
} from "../../school-firebase";
import { saveUserToLive } from "../../firebase";
import { DirectUploadButton } from "../DirectUploadButton";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { AdmissionFormPrintModal, type AdmissionPrintMode } from "./AdmissionFormPrintModal";

// Clean class label helper: prevents duplicate "(B)" if the class name already contains "Section B"
export const formatClassLabel = (c?: SchoolClass | null): string => {
  if (!c) return "";
  const name = (c.name || "").trim();
  const sec = (c.section || "").trim();
  if (!sec) return name;
  const nameLower = name.toLowerCase();
  const secLower = sec.toLowerCase();
  if (
    nameLower.includes(`section ${secLower}`) ||
    nameLower.includes(`sec ${secLower}`) ||
    nameLower.includes(`(${secLower})`) ||
    nameLower.endsWith(` ${secLower}`) ||
    nameLower.endsWith(`-${secLower}`)
  ) {
    return name;
  }
  return `${name} (Section ${sec})`;
};

// Real official fee extractor for a class (No mock / hardcoded fallbacks to 1500 & 800!)
export const getClassFees = (cls?: SchoolClass | null) => {
  if (!cls) {
    return {
      admissionFee: 0,
      annualCharges: 0,
      tuitionFee: 0,
      cautionMoney: 0,
      customHeads: [] as any[],
      totalPayable: 0,
    };
  }

  const fs = cls.feeStructure;
  // Exact real admission fee configured by school admin:
  const admissionFee = fs?.admissionFee !== undefined
    ? Math.max(0, Number(fs.admissionFee))
    : (cls as any)?.admissionFee !== undefined
    ? Math.max(0, Number((cls as any).admissionFee))
    : 0;

  // Exact real annual / development charges configured:
  const annualCharges = fs?.annualCharges !== undefined
    ? Math.max(0, Number(fs.annualCharges))
    : fs?.developmentFee !== undefined
    ? Math.max(0, Number(fs.developmentFee))
    : (cls as any)?.annualCharges !== undefined
    ? Math.max(0, Number((cls as any).annualCharges))
    : 0;

  // Exact real tuition fee / monthly fee:
  const tuitionFee = fs?.tuitionFee !== undefined
    ? Math.max(0, Number(fs.tuitionFee))
    : cls.defaultFee !== undefined
    ? Math.max(0, Number(cls.defaultFee))
    : 0;

  const cautionMoney = fs?.cautionMoney !== undefined ? Math.max(0, Number(fs.cautionMoney)) : 0;
  const customHeads = Array.isArray(fs?.customHeads) ? fs.customHeads : [];
  const customHeadsTotal = customHeads.reduce((s, h) => s + (Math.max(0, Number(h.amount)) || 0), 0);

  // Exact total payable at admission
  let totalPayable = admissionFee + annualCharges + cautionMoney + customHeadsTotal;
  // If no admission or annual charges were configured, but a monthly tuition fee exists:
  if (totalPayable === 0 && tuitionFee > 0) {
    totalPayable = tuitionFee;
  }

  return {
    admissionFee,
    annualCharges,
    tuitionFee,
    cautionMoney,
    customHeads,
    totalPayable,
  };
};

interface Props {
  school: School;
  classes: SchoolClass[];
  sessions: SchoolSession[];
  activeSession: SchoolSession | null;
  isAdmin?: boolean;
  onBack: () => void;
}

interface FeeItemRow {
  id: string;
  description: string;
  due: number;
}

export const OnlineAdmissionManager: React.FC<Props> = ({
  school,
  classes: propClasses,
  sessions,
  activeSession,
  isAdmin = true,
  onBack,
}) => {
  // Live classes list: strictly shows only classes created for this school!
  const [classesList, setClassesList] = useState<SchoolClass[]>(() => {
    try {
      const local = getLocalClasses(school.id);
      const realLocal = local.filter((c: any) => !isDemoRecord(c));
      if (realLocal.length > 0) return realLocal;
      if (propClasses && propClasses.length > 0) {
        const realProp = propClasses.filter((c: any) => !isDemoRecord(c));
        if (realProp.length > 0) return realProp;
      }
      if (shouldUseDemoForSchool(school.id)) {
        return local.length > 0 ? local : (propClasses || []);
      }
      return [];
    } catch {
      return propClasses || [];
    }
  });

  // Alias classes so all existing references use the live real classes of this school
  const classes = classesList;

  // Real-time synchronization: when school admin creates/updates/deletes a class, it updates immediately!
  useEffect(() => {
    const syncClasses = () => {
      const local = getLocalClasses(school.id);
      const realLocal = local.filter((c: any) => !isDemoRecord(c));
      if (realLocal.length > 0) {
        setClassesList(realLocal);
        return;
      }
      if (shouldUseDemoForSchool(school.id)) {
        setClassesList(local.length > 0 ? local : (propClasses || []));
      } else {
        setClassesList([]);
      }
    };
    syncClasses();

    const unsub = subscribeToClasses(school.id, activeSession?.id || "", (latest) => {
      const real = latest.filter((c: any) => !isDemoRecord(c));
      if (real.length > 0) {
        setClassesList(real);
      } else if (shouldUseDemoForSchool(school.id)) {
        setClassesList(latest);
      } else {
        setClassesList([]);
      }
    });

    if (typeof window !== "undefined") {
      window.addEventListener("school-idb-hydrated", syncClasses);
    }
    return () => {
      if (typeof unsub === "function") unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("school-idb-hydrated", syncClasses);
      }
    };
  }, [school.id, activeSession?.id]);

  const [activeTab, setActiveTab] = useState<"applications" | "new_form">(
    isAdmin ? "applications" : "new_form"
  );
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<AdmissionApplication | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Enroll Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingApp, setEnrollingApp] = useState<AdmissionApplication | null>(null);
  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollRollNo, setEnrollRollNo] = useState("");
  const [enrollMonthlyFee, setEnrollMonthlyFee] = useState("0");
  const [enrollPhotoUrl, setEnrollPhotoUrl] = useState("");
  const [enrollStudentAadhaar, setEnrollStudentAadhaar] = useState("");
  const [enrollFatherAadhaar, setEnrollFatherAadhaar] = useState("");
  const [enrollMotherAadhaar, setEnrollMotherAadhaar] = useState("");
  const [enrollApaarId, setEnrollApaarId] = useState("");
  const [enrollUsesBus, setEnrollUsesBus] = useState(false);
  const [enrollBusRoute, setEnrollBusRoute] = useState("");
  const [enrollBusFee, setEnrollBusFee] = useState(0);
  const [enrollSubmittedDocs, setEnrollSubmittedDocs] = useState<string[]>([]);

  // Dynamic Admission Fee Items in Enroll Modal
  const [enrollFeeItems, setEnrollFeeItems] = useState<FeeItemRow[]>([]);
  const [enrollConcession, setEnrollConcession] = useState<number>(0);
  const [enrollPaidAmount, setEnrollPaidAmount] = useState<string>("");
  const [enrollPaidManual, setEnrollPaidManual] = useState<boolean>(false);
  const [enrollPayMode, setEnrollPayMode] = useState("Cash");
  const [enrollPayRef, setEnrollPayRef] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Online Payment Screenshot & Next Sequential Roll No state
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [submittingScreenshot, setSubmittingScreenshot] = useState<boolean>(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);
  const [confirmedAdmission, setConfirmedAdmission] = useState<{
    student: SchoolStudent;
    assignedRollNo: string;
    existingCount: number;
    totalPayable: number;
    admissionCharge: number;
    annualCharge: number;
    receiptNo: string;
    feeRecord?: MonthlyFee | null;
  } | null>(null);
  const screenshotFileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline Reject Confirmation State (Replaces window.confirm)
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("Criteria / Documents incomplete");

  // Print & Receipt Modals
  const [printStudioState, setPrintStudioState] = useState<{
    open: boolean;
    student?: Partial<SchoolStudent> | null;
    application?: Partial<AdmissionApplication> | null;
    className?: string;
    feeRecord?: MonthlyFee | null;
    mode?: AdmissionPrintMode;
  }>({ open: false });

  const [posReceiptState, setPosReceiptState] = useState<{
    open: boolean;
    student: SchoolStudent | null;
    fee: MonthlyFee | null;
  }>({ open: false, student: null, fee: null });

  // Form State
  const [form, setForm] = useState({
    admissionType: "NEW" as "NEW" | "READMISSION",
    studentName: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    category: "General",
    religion: "Hindu",
    nationality: "Indian",
    bloodGroup: "",
    apaarId: "",
    photoUrl: "",
    classId: classes[0]?.id || "",
    previousSchool: "",
    previousMarks: "",
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    annualIncome: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelation: "Parent / Guardian",
    identificationMark: "",
    medicalHistory: "Fit / No major condition",
    aadhaarNo: "",
    fatherAadhaar: "",
    motherAadhaar: "",
    phone: "",
    whatsappNo: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    usesBus: false,
    busRoute: "",
    submittedDocs: [
      "Birth Certificate (जन्म प्रमाण पत्र)",
      "Student Aadhaar Card (छात्र आधार)",
      "Passport Photos (पासपोर्ट फोटो)",
    ] as string[],
  });

  // Keep form.classId pointing to a valid class in classesList
  useEffect(() => {
    if (classesList.length > 0) {
      setForm((prev) => {
        const exists = classesList.some((c) => c.id === prev.classId);
        if (!exists || !prev.classId) {
          return { ...prev, classId: classesList[0].id };
        }
        return prev;
      });
    }
  }, [classesList]);

  useEffect(() => {
    fetchApplications();
  }, [school.id]);

  const fetchApplications = async () => {
    setLoading(true);
    const data = await getAdmissionApplications(school.id);
    setApplications(data);
    setLoading(false);
  };

  const buildDefaultFeeItems = (cls: SchoolClass | undefined, withBus: boolean, customBusAmt?: number): FeeItemRow[] => {
    const fs = cls?.feeStructure;
    const rows: FeeItemRow[] = [];
    if (fs) {
      if (Number(fs.admissionFee) > 0) {
        rows.push({ id: "fs_adm", description: "Admission Fee (प्रवेश शुल्क)", due: Number(fs.admissionFee) });
      }
      if (Number(fs.tuitionFee) > 0) {
        rows.push({ id: "fs_tui", description: "1st Month Tuition Fee (प्रथम माह शिक्षण शुल्क)", due: Number(fs.tuitionFee) });
      }
      if (Number(fs.annualCharges) > 0) {
        rows.push({ id: "fs_ann", description: "Annual & Development Charges (वार्षिक विकास शुल्क)", due: Number(fs.annualCharges) });
      }
      if (Number(fs.cautionMoney) > 0) {
        rows.push({ id: "fs_cau", description: "Caution Money / Registration", due: Number(fs.cautionMoney) });
      }
      if (Array.isArray(fs.customHeads)) {
        fs.customHeads.forEach((h, i) => {
          if (Number(h.amount) > 0) {
            rows.push({ id: `fs_c_${i}`, description: h.name, due: Number(h.amount) });
          }
        });
      }
      if (withBus) {
        const bAmt = customBusAmt !== undefined ? customBusAmt : Number(fs.busFee || 0);
        if (bAmt > 0) {
          rows.push({ id: "fs_bus", description: "Transport / Bus Fee (वाहन शुल्क)", due: bAmt });
        }
      }
    }

    if (rows.length === 0) {
      const fees = getClassFees(cls);
      if (fees.admissionFee > 0) {
        rows.push({ id: "adm_1", description: "Admission Fee (प्रवेश शुल्क)", due: fees.admissionFee });
      }
      if (fees.annualCharges > 0) {
        rows.push({ id: "adm_2", description: "Annual / Development Fund (वार्षिक विकास कोष)", due: fees.annualCharges });
      }
      if (fees.tuitionFee > 0) {
        rows.push({ id: "adm_tui", description: "1st Month Tuition Fee (प्रथम माह शुल्क)", due: fees.tuitionFee });
      }
      if (withBus && (customBusAmt || 0) > 0) {
        rows.push({ id: "fs_bus", description: "Transport / Bus Fee (वाहन शुल्क)", due: Number(customBusAmt) });
      }
      if (rows.length === 0) {
        rows.push({ id: "adm_0", description: "Admission Fee (प्रवेश शुल्क)", due: 0 });
      }
    }
    return rows;
  };

  const openEnrollModal = (app: AdmissionApplication) => {
    const selectedCls = classes.find((c) => c.id === app.classId) || classes[0];
    const targetClsId = selectedCls?.id || app.classId || "";
    const localStudents = getLocalStudents(school.id);
    const clsStudents = localStudents.filter((s) => isStudentInClass(s, targetClsId, selectedCls?.name));
    const maxRoll = clsStudents.reduce((m, s) => {
      const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
      return !isNaN(n) && n > m ? n : m;
    }, 0);

    const defMonthly = Number(selectedCls?.feeStructure?.tuitionFee ?? selectedCls?.defaultFee ?? 0);
    const defBus = Number(app.busFee ?? selectedCls?.feeStructure?.busFee ?? 0);
    const wantsBus = Boolean(app.usesBus);

    setEnrollingApp(app);
    setEnrollClassId(targetClsId);
    setEnrollRollNo(String(maxRoll + 1));
    setEnrollMonthlyFee(String(defMonthly));
    setEnrollPhotoUrl(app.photoUrl || "");
    setEnrollStudentAadhaar(app.aadhaarNo || "");
    setEnrollFatherAadhaar(app.fatherAadhaar || "");
    setEnrollMotherAadhaar(app.motherAadhaar || "");
    setEnrollApaarId(app.apaarId || "");
    setEnrollUsesBus(wantsBus);
    setEnrollBusRoute(app.busRoute || "");
    setEnrollBusFee(defBus);
    setEnrollSubmittedDocs(
      app.submittedDocs && app.submittedDocs.length > 0
        ? app.submittedDocs
        : ["Birth Certificate (जन्म प्रमाण पत्र)", "Student Aadhaar Card (छात्र आधार)", "Passport Photos (पासपोर्ट फोटो)"]
    );
    setEnrollFeeItems(buildDefaultFeeItems(selectedCls, wantsBus, defBus));
    setEnrollConcession(0);
    setEnrollPaidManual(false);
    setEnrollPayMode("Cash");
    setEnrollPayRef("");
    setEnrollError(null);
    setShowEnrollModal(true);
  };

  // Sync bus fee row inside Enroll Modal
  useEffect(() => {
    if (!showEnrollModal) return;
    setEnrollFeeItems((prev) => {
      const rest = prev.filter((r) => r.id !== "fs_bus");
      if (enrollUsesBus && Number(enrollBusFee) > 0) {
        return [...rest, { id: "fs_bus", description: `Transport / Bus Fee (${enrollBusRoute || "Bus"})`, due: Number(enrollBusFee) }];
      }
      return rest;
    });
  }, [enrollUsesBus, enrollBusFee, enrollBusRoute, showEnrollModal]);

  const enrollGrossTotal = useMemo(
    () => enrollFeeItems.reduce((sum, r) => sum + (Number(r.due) || 0), 0),
    [enrollFeeItems]
  );
  const enrollNetPayable = Math.max(0, enrollGrossTotal - (Number(enrollConcession) || 0));

  useEffect(() => {
    if (!enrollPaidManual) {
      setEnrollPaidAmount(String(enrollNetPayable));
    }
  }, [enrollNetPayable, enrollPaidManual]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.fatherName.trim() || !form.phone.trim()) {
      setFormError("कृपया छात्र का नाम, पिता का नाम और मोबाइल नंबर अवश्य भरें।");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const selectedCls = classes.find((c) => c.id === form.classId);
      const appNo = generateNextAdmissionNo(school, applications.length);
      const newApp: AdmissionApplication = {
        id: generateId(),
        schoolId: school.id,
        applicationNo: appNo,
        studentName: form.studentName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        category: form.category,
        religion: form.religion,
        nationality: form.nationality,
        annualIncome: form.annualIncome.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
        emergencyRelation: form.emergencyRelation.trim() || undefined,
        identificationMark: form.identificationMark.trim() || undefined,
        medicalHistory: form.medicalHistory.trim() || undefined,
        admissionType: form.admissionType || "NEW",
        bloodGroup: form.bloodGroup || undefined,
        apaarId: form.apaarId.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
        classId: form.classId,
        className: selectedCls ? formatClassLabel(selectedCls) : "General",
        previousSchool: form.previousSchool.trim() || undefined,
        previousMarks: form.previousMarks.trim() || undefined,
        fatherName: form.fatherName.trim(),
        fatherOccupation: form.fatherOccupation.trim() || undefined,
        motherName: form.motherName.trim(),
        motherOccupation: form.motherOccupation.trim() || undefined,
        aadhaarNo: form.aadhaarNo.trim() || undefined,
        fatherAadhaar: form.fatherAadhaar.trim() || undefined,
        motherAadhaar: form.motherAadhaar.trim() || undefined,
        phone: form.phone.trim(),
        whatsappNo: form.whatsappNo.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        usesBus: form.usesBus,
        busRoute: form.usesBus ? form.busRoute.trim() : undefined,
        busFee: form.usesBus ? Number(selectedCls?.feeStructure?.busFee || 0) : 0,
        submittedDocs: form.submittedDocs,
        status: "pending",
        appliedAt: new Date().toISOString(),
      };

      await saveAdmissionApplication(school.id, newApp);
      setSubmittedApp(newApp);
      setPaymentScreenshot(null);
      setTransactionRef("");
      setConfirmedAdmission(null);
      setScreenshotError(null);
      fetchApplications();
    } catch (err: any) {
      setFormError("आवेदन जमा करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndEnroll = async () => {
    if (!enrollingApp || !enrollClassId) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      const selectedCls = classes.find((c) => c.id === enrollClassId);
      const studentId = generateId();
      const paidAdmissionAmt = Math.max(0, Number(enrollPaidAmount) || 0);
      const balanceAmt = Math.max(0, enrollNetPayable - paidAdmissionAmt);
      const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;
      const paidIso = new Date().toISOString();

      const newStudent: SchoolStudent = {
        id: studentId,
        schoolId: school.id,
        sessionId: activeSession?.id || sessions[0]?.id || "",
        classId: enrollClassId,
        className: selectedCls ? `${selectedCls.name} ${selectedCls.section || ""}`.trim() : enrollingApp.className || "Class",
        name: enrollingApp.studentName,
        rollNo: enrollRollNo.trim() || "1",
        admissionNo: enrollingApp.applicationNo,
        gender: enrollingApp.gender,
        category: enrollingApp.category || "General",
        religion: enrollingApp.religion || "Hindu",
        nationality: enrollingApp.nationality || "Indian",
        annualIncome: enrollingApp.annualIncome,
        emergencyContact: enrollingApp.emergencyContact,
        emergencyPhone: enrollingApp.emergencyPhone,
        emergencyRelation: enrollingApp.emergencyRelation,
        identificationMark: enrollingApp.identificationMark,
        medicalHistory: enrollingApp.medicalHistory,
        admissionType: enrollingApp.admissionType || "NEW",
        apaarId: enrollApaarId.trim() || enrollingApp.apaarId || undefined,
        fatherName: enrollingApp.fatherName,
        fatherOccupation: enrollingApp.fatherOccupation,
        motherName: enrollingApp.motherName,
        motherOccupation: enrollingApp.motherOccupation,
        aadhaarNo: enrollStudentAadhaar.trim() || enrollingApp.aadhaarNo || undefined,
        fatherAadhaar: enrollFatherAadhaar.trim() || enrollingApp.fatherAadhaar || undefined,
        motherAadhaar: enrollMotherAadhaar.trim() || enrollingApp.motherAadhaar || undefined,
        phone: enrollingApp.phone,
        whatsappNo: enrollingApp.whatsappNo,
        email: enrollingApp.email,
        dateOfBirth: enrollingApp.dateOfBirth,
        bloodGroup: enrollingApp.bloodGroup || undefined,
        address: enrollingApp.address,
        city: enrollingApp.city,
        pincode: enrollingApp.pincode,
        previousSchool: enrollingApp.previousSchool,
        previousMarks: enrollingApp.previousMarks,
        photoUrl: enrollPhotoUrl || enrollingApp.photoUrl || undefined,
        usesBus: enrollUsesBus,
        busRoute: enrollUsesBus ? enrollBusRoute.trim() : undefined,
        busFee: enrollUsesBus ? Number(enrollBusFee) || 0 : 0,
        submittedDocs: enrollSubmittedDocs,
        admissionReceiptNo: receiptNo,
        monthlyFee: Number(enrollMonthlyFee) || 0,
        joinDate: paidIso.slice(0, 10),
        active: true,
        createdAt: paidIso,
      };

      const savedStudent = await saveStudent(newStudent);

      // Strictly school-isolated cache & login profile (no cross-school copying!)
      try {
        const curLocals = getLocalStudents(school.id);
        setLocalStudents(school.id, [savedStudent, ...curLocals.filter((s) => s.id !== savedStudent.id)]);

        const safeSlug = (school.code || school.id || "school").toLowerCase().replace(/[^a-z0-9]/g, "") || "school";
        const studentEmail =
          enrollingApp.email ||
          `${savedStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@${safeSlug}.edu.in`;

        await saveSchoolUserProfile({
          uid: savedStudent.id,
          schoolId: school.id,
          role: "SCHOOL_STUDENT",
          name: savedStudent.name,
          email: studentEmail,
          studentRef: savedStudent.id,
          classId: enrollClassId,
          sessionId: activeSession?.id || "2026-27",
        }).catch(() => {});

        saveUserToLive(
          {
            id: savedStudent.id,
            uid: savedStudent.id,
            displayId: `ROLL-${savedStudent.rollNo}`,
            name: savedStudent.name,
            email: studentEmail,
            mobile: savedStudent.phone,
            role: "STUDENT",
            schoolId: school.id,
            classLevel: enrollClassId,
            stream: "General",
            credits: 100,
            diamonds: 50,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            subscriptionTier: "PRO",
            provider: "qr_student_id",
            isQrLogin: true,
            admissionNo: savedStudent.admissionNo,
            rollNo: savedStudent.rollNo,
            fatherName: savedStudent.fatherName,
            motherName: savedStudent.motherName,
            bloodGroup: savedStudent.bloodGroup,
            monthlyFee: savedStudent.monthlyFee,
          },
          { immediate: true }
        ).catch(() => {});
      } catch (cacheErr) {
        console.warn("Student profile sync notice:", cacheErr);
      }

      const finalItems = enrollFeeItems
        .filter((it) => it.description.trim() && Number(it.due) >= 0)
        .map((it, idx) => ({
          id: it.id,
          slNo: idx + 1,
          description: it.description.trim(),
          due: Number(it.due) || 0,
          con: idx === 0 ? Math.min(Number(it.due) || 0, Number(enrollConcession) || 0) : 0,
          paid: Number(it.due) || 0,
        }));

      const admissionFeeRecord: MonthlyFee = {
        schoolId: school.id,
        sessionId: activeSession?.id || "2026-27",
        studentId: savedStudent.id,
        studentName: savedStudent.name,
        rollNo: savedStudent.rollNo,
        classId: enrollClassId,
        month: paidIso.slice(0, 7),
        amount: enrollNetPayable,
        monthlyAmount: Number(enrollMonthlyFee) || 0,
        paid: paidAdmissionAmt >= enrollNetPayable,
        paidDate: paidIso,
        receiptNo,
        paidAmount: paidAdmissionAmt,
        balanceDue: balanceAmt,
        concession: Number(enrollConcession) || 0,
        feeType: "admission",
        receiptCategory: "admission",
        includeBusFee: enrollUsesBus,
        busFeeAmount: enrollUsesBus ? Number(enrollBusFee) || 0 : 0,
        busRoute: enrollUsesBus ? enrollBusRoute : undefined,
        payModeInfo: {
          payMode: enrollPayMode,
          date: new Date().toLocaleDateString("en-GB"),
          bank: enrollPayMode === "Cash" ? "School Counter" : enrollPayMode,
          number: enrollPayRef.trim() || "-",
        },
        items: finalItems,
      };

      await saveFee(admissionFeeRecord);

      const savedFeeDetails: AdmissionApplication["admissionFeeDetails"] = {
        admissionFee: finalItems[0]?.due || 0,
        registrationFee: finalItems[1]?.due || 0,
        developmentFee: finalItems[2]?.due || 0,
        idKitFee: finalItems[3]?.due || 0,
        examFund: finalItems[4]?.due || 0,
        concession: Number(enrollConcession) || 0,
        totalPayable: enrollNetPayable,
        paidAmount: paidAdmissionAmt,
        balanceDue: balanceAmt,
        paymentMode: enrollPayMode,
        receiptNo,
        paidDate: paidIso,
        items: finalItems,
      };

      await updateAdmissionStatus(school.id, enrollingApp.id, "approved", {
        enrolledStudentId: savedStudent.id,
        assignedRollNo: savedStudent.rollNo,
        classId: enrollClassId,
        className: savedStudent.className,
        photoUrl: savedStudent.photoUrl,
        aadhaarNo: savedStudent.aadhaarNo,
        fatherAadhaar: savedStudent.fatherAadhaar,
        motherAadhaar: savedStudent.motherAadhaar,
        apaarId: savedStudent.apaarId,
        usesBus: savedStudent.usesBus,
        busRoute: savedStudent.busRoute,
        busFee: savedStudent.busFee,
        submittedDocs: enrollSubmittedDocs,
        monthlyFee: savedStudent.monthlyFee,
        admissionFeeDetails: savedFeeDetails,
        remarks: `Enrolled (Roll #${savedStudent.rollNo}). Receipt #${receiptNo}`,
      });

      setShowEnrollModal(false);
      setSuccessToast(`🎉 ${savedStudent.name} नामांकित हो गए (Roll #${savedStudent.rollNo})! फॉर्म + रसीद प्रिंट तैयार है।`);
      setTimeout(() => setSuccessToast(null), 5000);
      fetchApplications();

      // Open Combined Single A4 Print Studio (Form + Receipt)
      setPrintStudioState({
        open: true,
        student: savedStudent,
        application: { ...enrollingApp, admissionFeeDetails: savedFeeDetails, assignedRollNo: savedStudent.rollNo },
        className: savedStudent.className,
        feeRecord: admissionFeeRecord,
        mode: "combined",
      });
    } catch (err: any) {
      setEnrollError("Enrollment failed: " + (err?.message || "Please retry"));
    } finally {
      setEnrolling(false);
    }
  };

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setScreenshotError("फ़ाइल का साइज़ 8MB से कम होना चाहिए।");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPaymentScreenshot(dataUrl);
      setScreenshotError(null);
    };
    reader.onerror = () => {
      setScreenshotError("फ़ाइल पढ़ने में त्रुटि हुई, कृपया पुनः प्रयास करें।");
    };
    reader.readAsDataURL(file);
  };

  const handleSendPaymentScreenshot = async () => {
    if (!submittedApp) return;
    if (!paymentScreenshot && !transactionRef.trim()) {
      setScreenshotError("कृपया भुगतान का स्क्रीनशॉट अपलोड करें या UTR / Transaction No. दर्ज करें।");
      return;
    }
    setSubmittingScreenshot(true);
    setScreenshotError(null);
    try {
      const selectedCls = classes.find((c) => c.id === submittedApp.classId);
      const fees = getClassFees(selectedCls);
      const admissionFee = fees.admissionFee;
      const annualCharges = fees.annualCharges;
      const totalPayable = fees.totalPayable;

      // 1. Roll number sequential calculation: "jitna hoga student ushke baad wala"
      const localStudents = getLocalStudents(school.id);
      const targetClsId = selectedCls?.id || submittedApp.classId || "";
      const clsStudents = localStudents.filter((s) =>
        isStudentInClass(s, targetClsId, selectedCls?.name || submittedApp.className)
      );
      const maxRoll = clsStudents.reduce((m, s) => {
        const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > m ? n : m;
      }, 0);
      const nextRollNo = String(Math.max(clsStudents.length + 1, maxRoll + 1));

      const studentId = generateId();
      const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;
      const paidIso = new Date().toISOString();
      const tuitionFee = fees.tuitionFee;

      // 2. Save new enrolled student
      const newStudent: SchoolStudent = {
        id: studentId,
        schoolId: school.id,
        sessionId: activeSession?.id || sessions[0]?.id || "2026-27",
        classId: targetClsId,
        className: selectedCls ? formatClassLabel(selectedCls) : submittedApp.className,
        name: submittedApp.studentName,
        rollNo: nextRollNo,
        admissionNo: submittedApp.applicationNo,
        gender: submittedApp.gender,
        category: submittedApp.category || "General",
        religion: submittedApp.religion || "Hindu",
        nationality: submittedApp.nationality || "Indian",
        fatherName: submittedApp.fatherName,
        motherName: submittedApp.motherName,
        phone: submittedApp.phone,
        whatsappNo: submittedApp.whatsappNo,
        email: submittedApp.email,
        dateOfBirth: submittedApp.dateOfBirth,
        bloodGroup: submittedApp.bloodGroup,
        address: submittedApp.address,
        city: submittedApp.city,
        pincode: submittedApp.pincode,
        photoUrl: submittedApp.photoUrl,
        monthlyFee: tuitionFee,
        admissionReceiptNo: receiptNo,
        joinDate: paidIso.slice(0, 10),
        active: true,
        createdAt: paidIso,
      };

      const savedStudent = await saveStudent(newStudent);
      const curLocals = getLocalStudents(school.id);
      setLocalStudents(school.id, [savedStudent, ...curLocals.filter((s) => s.id !== savedStudent.id)]);

      // Sync user profile so student can login if needed
      try {
        const safeSlug = (school.code || school.id || "school").toLowerCase().replace(/[^a-z0-9]/g, "") || "school";
        const studentEmail =
          submittedApp.email ||
          `${savedStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@${safeSlug}.edu.in`;

        await saveSchoolUserProfile({
          uid: savedStudent.id,
          schoolId: school.id,
          role: "SCHOOL_STUDENT",
          name: savedStudent.name,
          email: studentEmail,
          studentRef: savedStudent.id,
          classId: targetClsId,
          sessionId: activeSession?.id || "2026-27",
        }).catch(() => {});
      } catch (e) {}

      // 3. Save fee record for Admission + Annual charges
      const finalItems = [
        {
          id: "1",
          slNo: 1,
          description: "Admission Fee (प्रवेश शुल्क)",
          due: admissionFee,
          con: 0,
          paid: admissionFee,
        },
        {
          id: "2",
          slNo: 2,
          description: "Annual & Development Charge (वार्षिक शुल्क)",
          due: annualCharges,
          con: 0,
          paid: annualCharges,
        },
      ];

      const admissionFeeRecord: MonthlyFee = {
        schoolId: school.id,
        sessionId: activeSession?.id || "2026-27",
        studentId: savedStudent.id,
        studentName: savedStudent.name,
        rollNo: savedStudent.rollNo,
        classId: targetClsId,
        month: paidIso.slice(0, 7),
        amount: totalPayable,
        monthlyAmount: tuitionFee,
        paid: true,
        paidDate: paidIso,
        receiptNo,
        paidAmount: totalPayable,
        balanceDue: 0,
        concession: 0,
        feeType: "admission",
        receiptCategory: "admission",
        payModeInfo: {
          payMode: "Online UPI (Screenshot)",
          date: new Date().toLocaleDateString("en-GB"),
          bank: "UPI / Net Banking",
          number: transactionRef.trim() || `UPI-${Date.now().toString().slice(-6)}`,
        },
        items: finalItems,
      };

      await saveFee(admissionFeeRecord);

      // 4. Update application status to approved with allocated roll no and screenshot
      const savedFeeDetails: AdmissionApplication["admissionFeeDetails"] = {
        admissionFee,
        registrationFee: 0,
        developmentFee: annualCharges,
        idKitFee: 0,
        examFund: 0,
        concession: 0,
        totalPayable,
        paidAmount: totalPayable,
        balanceDue: 0,
        paymentMode: "Online UPI (Screenshot)",
        receiptNo,
        paidDate: paidIso,
        items: finalItems,
      };

      await updateAdmissionStatus(school.id, submittedApp.id, "approved", {
        enrolledStudentId: savedStudent.id,
        assignedRollNo: nextRollNo,
        paymentScreenshotUrl: paymentScreenshot || undefined,
        transactionRef: transactionRef.trim() || undefined,
        admissionFeeDetails: savedFeeDetails,
        remarks: `Online Paid & Screenshot Submitted (Roll #${nextRollNo}). Receipt #${receiptNo}`,
      });

      // 5. Send Live Push Notification to School Admin
      try {
        await sendSchoolPushNotification({
          schoolId: school.id,
          title: `🎉 New Online Admission: ${submittedApp.studentName}`,
          body: `${submittedApp.studentName} ne ${submittedApp.className} me online admission liya hai. Total Fee: ₹${totalPayable} (प्रवेश: ₹${admissionFee} + वार्षिक: ₹${annualCharges}). पेमेंट स्क्रीनशॉट प्राप्त हुआ! आबंटित रोल नंबर: #${nextRollNo}.`,
          urgent: true,
          type: "FEE_RECEIPT",
        });
      } catch (pushErr) {
        console.warn("Push notification error:", pushErr);
      }

      // 6. Save alert to localStorage & dispatch event so School Admin panel shows live alert banner immediately
      try {
        const alertItem = {
          id: generateId(),
          schoolId: school.id,
          studentName: submittedApp.studentName,
          className: submittedApp.className,
          rollNo: nextRollNo,
          applicationNo: submittedApp.applicationNo,
          amount: totalPayable,
          admissionCharge: admissionFee,
          annualCharge: annualCharges,
          screenshotUrl: paymentScreenshot,
          transactionRef: transactionRef.trim(),
          timestamp: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem(`school_admission_alerts_${school.id}`) || "[]");
        localStorage.setItem(`school_admission_alerts_${school.id}`, JSON.stringify([alertItem, ...existing]));
        window.dispatchEvent(new CustomEvent("school-admission-alert", { detail: alertItem }));
      } catch (e) {}

      // 7. Update UI state to confirmed!
      setConfirmedAdmission({
        student: savedStudent,
        assignedRollNo: nextRollNo,
        existingCount: clsStudents.length,
        totalPayable,
        admissionCharge: admissionFee,
        annualCharge: annualCharges,
        receiptNo,
        feeRecord: admissionFeeRecord,
      });

      setSuccessToast(`🎉 एडमिशन पक्का हो गया! आपको रोल नंबर #${nextRollNo} आवंटित हुआ है और स्क्रीनशॉट एडमिन को भेज दिया गया है।`);
      fetchApplications();
    } catch (err: any) {
      setScreenshotError("स्क्रीनशॉट सबमिट करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSubmittingScreenshot(false);
    }
  };

  // Resolve real student & real admission fee for any approved application (Zero fake ₹5300!)
  const resolveApplicationStudentAndFee = (app: AdmissionApplication): { student: SchoolStudent; fee: MonthlyFee | null } => {
    const locals = getLocalStudents(school.id);
    const matchedStudent =
      locals.find(
        (s) =>
          (app.enrolledStudentId && s.id === app.enrolledStudentId) ||
          (s.admissionNo && s.admissionNo === app.applicationNo)
      ) || null;

    const student: SchoolStudent = matchedStudent || {
      id: app.enrolledStudentId || app.id,
      schoolId: school.id,
      sessionId: activeSession?.id || "2026-27",
      classId: app.classId,
      className: app.className,
      name: app.studentName,
      rollNo: app.assignedRollNo || "1",
      admissionNo: app.applicationNo,
      gender: app.gender,
      category: app.category,
      religion: app.religion || "Hindu",
      nationality: app.nationality || "Indian",
      annualIncome: app.annualIncome,
      emergencyContact: app.emergencyContact,
      emergencyPhone: app.emergencyPhone,
      emergencyRelation: app.emergencyRelation,
      identificationMark: app.identificationMark,
      medicalHistory: app.medicalHistory,
      admissionType: app.admissionType || "NEW",
      apaarId: app.apaarId,
      fatherName: app.fatherName,
      fatherOccupation: app.fatherOccupation,
      motherName: app.motherName,
      motherOccupation: app.motherOccupation,
      aadhaarNo: app.aadhaarNo,
      fatherAadhaar: app.fatherAadhaar,
      motherAadhaar: app.motherAadhaar,
      phone: app.phone,
      whatsappNo: app.whatsappNo,
      email: app.email,
      dateOfBirth: app.dateOfBirth,
      bloodGroup: app.bloodGroup,
      address: app.address,
      city: app.city,
      pincode: app.pincode,
      previousSchool: app.previousSchool,
      previousMarks: app.previousMarks,
      photoUrl: app.photoUrl,
      usesBus: app.usesBus,
      busRoute: app.busRoute,
      busFee: app.busFee,
      submittedDocs: app.submittedDocs,
      monthlyFee: Number(app.monthlyFee || 0),
      joinDate: (app.reviewedAt || app.appliedAt).slice(0, 10),
      active: true,
      createdAt: app.appliedAt,
    };

    const localFees = getLocalFees(school.id);
    const savedFee =
      localFees.find((f) => {
        const isAdm = f.feeType === "admission" || f.receiptCategory === "admission";
        if (!isAdm) return false;
        if (app.admissionFeeDetails?.receiptNo && f.receiptNo === app.admissionFeeDetails.receiptNo) return true;
        if (student.id && f.studentId === student.id) return true;
        return false;
      }) || null;

    if (savedFee) {
      return { student, fee: savedFee };
    }

    if (app.admissionFeeDetails) {
      const d = app.admissionFeeDetails;
      const items =
        d.items && d.items.length > 0
          ? d.items
          : [
              d.admissionFee > 0 && { id: "1", slNo: 1, description: "Admission Fee (प्रवेश शुल्क)", due: d.admissionFee, con: 0, paid: d.admissionFee },
              d.registrationFee > 0 && { id: "2", slNo: 2, description: "Registration & Form Fee", due: d.registrationFee, con: 0, paid: d.registrationFee },
              d.developmentFee > 0 && { id: "3", slNo: 3, description: "Annual / Development Fund", due: d.developmentFee, con: 0, paid: d.developmentFee },
              d.idKitFee > 0 && { id: "4", slNo: 4, description: "Student Kit, ID Card & Diary", due: d.idKitFee, con: 0, paid: d.idKitFee },
              d.examFund > 0 && { id: "5", slNo: 5, description: "Exam & Activity Charges", due: d.examFund, con: 0, paid: d.examFund },
            ].filter(Boolean);

      return {
        student,
        fee: {
          schoolId: school.id,
          sessionId: activeSession?.id || "2026-27",
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          classId: student.classId,
          month: (d.paidDate || app.appliedAt).slice(0, 7),
          amount: d.totalPayable,
          monthlyAmount: student.monthlyFee,
          paid: d.paidAmount >= d.totalPayable,
          paidDate: d.paidDate || app.reviewedAt || app.appliedAt,
          receiptNo: d.receiptNo || `ADM-${app.applicationNo.replace(/\D/g, "").slice(-5) || "1001"}`,
          paidAmount: d.paidAmount,
          balanceDue: d.balanceDue,
          concession: d.concession || 0,
          feeType: "admission",
          receiptCategory: "admission",
          payModeInfo: {
            payMode: d.paymentMode || "Cash",
            date: new Date(d.paidDate || app.appliedAt).toLocaleDateString("en-GB"),
            bank: "",
            number: "-",
          },
          items,
        },
      };
    }

    return { student, fee: null };
  };

  const handleConfirmReject = async (app: AdmissionApplication) => {
    await updateAdmissionStatus(school.id, app.id, "rejected", {
      remarks: rejectReason.trim() || "Application declined",
    });
    setRejectingAppId(null);
    fetchApplications();
  };

  const toggleFormDoc = (docLabel: string) => {
    setForm((prev) => ({
      ...prev,
      submittedDocs: prev.submittedDocs.includes(docLabel)
        ? prev.submittedDocs.filter((d) => d !== docLabel)
        : [...prev.submittedDocs, docLabel],
    }));
  };

  const toggleEnrollDoc = (docLabel: string) => {
    setEnrollSubmittedDocs((prev) =>
      prev.includes(docLabel) ? prev.filter((d) => d !== docLabel) : [...prev, docLabel]
    );
  };

  const filteredApps = applications.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.studentName.toLowerCase().includes(q) ||
        a.applicationNo.toLowerCase().includes(q) ||
        a.fatherName.toLowerCase().includes(q) ||
        a.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h1 className="text-base sm:text-lg font-black tracking-tight">
              Online Admission &amp; Print Portal
            </h1>
          </div>
          <div className="text-xs text-blue-200 hidden sm:block font-semibold">
            {school.name}
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 mt-5">
        {/* Mode Tabs */}
        {isAdmin && (
          <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 w-fit">
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "applications"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <FileText className="w-4 h-4" /> Applications ({applications.length})
            </button>
            <button
              onClick={() => {
                setSubmittedApp(null);
                setActiveTab("new_form");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "new_form"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <UserPlus className="w-4 h-4" /> + New Admission Form
            </button>
          </div>
        )}

        {/* 1. ADMIN APPLICATIONS REVIEW LIST */}
        {activeTab === "applications" && isAdmin && (
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Applications", count: applications.length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
                { label: "Pending Review", count: applications.filter((a) => a.status === "pending").length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
                { label: "Approved & Enrolled", count: applications.filter((a) => a.status === "approved").length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "Rejected", count: applications.filter((a) => a.status === "rejected").length, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
              ].map((s, idx) => (
                <div key={idx} className={`${s.bg} p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700`}>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className={`text-2xl font-black mt-1 tabular-nums ${s.color}`}>{s.count}</p>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, App No, phone..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
                />
              </div>
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
                {(["all", "pending", "approved", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                      statusFilter === st
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Applications List */}
            {loading ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm font-bold">
                Loading admission applications...
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-black text-slate-700 dark:text-slate-200 text-base">
                  No Admission Applications Yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  नया आवेदन भरने के लिए "+ New Admission Form" पर क्लिक करें।
                </p>
                <button
                  onClick={() => setActiveTab("new_form")}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
                >
                  + Fill New Admission Form
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 font-black text-blue-600">
                          {app.photoUrl ? (
                            <img src={app.photoUrl} alt={app.studentName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{app.studentName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-black">
                              {app.applicationNo}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                              Class: {app.className}
                            </span>
                            {app.status === "pending" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                            {app.status === "approved" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Enrolled {app.assignedRollNo ? `(Roll #${app.assignedRollNo})` : ""}
                              </span>
                            )}
                            {app.status === "rejected" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {app.studentName}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              ({app.gender}, DOB: {app.dateOfBirth || "N/A"})
                            </span>
                            {app.bloodGroup && (
                              <span className="ml-2 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                🩸 {app.bloodGroup}
                              </span>
                            )}
                          </h3>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                            <span>👨 Father: <strong>{app.fatherName}</strong></span>
                            <span>👩 Mother: <strong>{app.motherName || "—"}</strong></span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" /> {app.phone}
                            </span>
                            {app.admissionFeeDetails && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                💰 Paid: ₹{Number(app.admissionFeeDetails.paidAmount || 0).toLocaleString("en-IN")}
                                {app.admissionFeeDetails.balanceDue > 0 ? ` (Due ₹${app.admissionFeeDetails.balanceDue})` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {app.paymentScreenshotUrl && (
                          <button
                            type="button"
                            onClick={() => setViewScreenshotUrl(app.paymentScreenshotUrl)}
                            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="पेमेंट स्क्रीनशॉट देखें"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span>स्क्रीनशॉट देखें</span>
                          </button>
                        )}
                        {app.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setPrintStudioState({
                                  open: true,
                                  application: app,
                                  className: app.className,
                                  mode: "form_only",
                                })
                              }
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> फॉर्म प्रिंट
                            </button>
                            <button
                              type="button"
                              onClick={() => openEnrollModal(app)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <Check className="w-4 h-4" /> Approve &amp; Enroll
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingAppId(rejectingAppId === app.id ? null : app.id);
                                setRejectReason("Criteria / Documents incomplete");
                              }}
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-4 h-4" /> Reject
                            </button>
                          </>
                        )}

                        {app.status === "approved" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const { student, fee } = resolveApplicationStudentAndFee(app);
                                setPrintStudioState({
                                  open: true,
                                  student,
                                  application: app,
                                  className: student.className || app.className,
                                  feeRecord: fee,
                                  mode: fee ? "combined" : "form_only",
                                });
                              }}
                              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <Scissors className="w-3.5 h-3.5" /> फॉर्म + रसीद (A4)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const { student, fee } = resolveApplicationStudentAndFee(app);
                                setPrintStudioState({
                                  open: true,
                                  student,
                                  application: app,
                                  className: student.className || app.className,
                                  feeRecord: fee,
                                  mode: "receipt_only",
                                });
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                              title="प्रवेश शुल्क रसीद अलग से प्रिंट करें"
                            >
                              <ReceiptText className="w-3.5 h-3.5" /> प्रवेश रसीद (Receipt)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const { student, fee } = resolveApplicationStudentAndFee(app);
                                if (fee) {
                                  setPosReceiptState({ open: true, student, fee });
                                } else {
                                  setPrintStudioState({
                                    open: true,
                                    student,
                                    application: app,
                                    className: student.className || app.className,
                                    feeRecord: null,
                                    mode: "receipt_only",
                                  });
                                }
                              }}
                              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                              <ReceiptText className="w-3.5 h-3.5" /> POS / रसीद
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Reject Confirmation Bar */}
                    {rejectingAppId === app.id && (
                      <div className="pt-3 border-t border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-center gap-2 bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-xl">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                          Reject {app.studentName}? Reason:
                        </span>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 bg-white dark:bg-slate-900 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(app)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingAppId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. ADMISSION APPLICATION FORM */}
        {activeTab === "new_form" && (
          <div className="max-w-3xl mx-auto">
            {submittedApp ? (
              (() => {
                const targetCls = classes.find((c) => c.id === submittedApp.classId);
                const fees = getClassFees(targetCls);
                const admissionFee = fees.admissionFee;
                const annualCharges = fees.annualCharges;
                const totalPayable = fees.totalPayable;
                const schoolUpiId = school.upiId || school.adminEmail || `${(school.code || "school").toLowerCase()}@upi`;
                const upiPaymentUri = `upi://pay?pa=${encodeURIComponent(schoolUpiId)}&pn=${encodeURIComponent(school.name || "School")}&am=${totalPayable}&cu=INR&tn=${encodeURIComponent(`Adm-${submittedApp.applicationNo}`)}`;

                // If confirmed after submitting screenshot
                if (confirmedAdmission) {
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-300 dark:border-emerald-700 space-y-6">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                          🎉 Online Admission Confirmed
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                          मुबारक हो! आपका एडमिशन पक्का हो गया
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                          फीस रसीद व छात्र नामांकन रिकॉर्ड सफलतापूर्वक दर्ज हो गया है।
                        </p>
                      </div>

                      {/* Allocated Roll Number Highlight Box */}
                      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-15">
                          <GraduationCap className="w-32 h-32" />
                        </div>
                        <p className="text-xs uppercase font-extrabold tracking-widest text-amber-100">
                          🎓 आवंटित छात्र क्रमांक (Allocated Roll Number)
                        </p>
                        <div className="text-5xl sm:text-6xl font-black my-2 tracking-tight drop-shadow-md">
                          Roll #{confirmedAdmission.assignedRollNo}
                        </div>
                        <div className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-xs px-4 py-1.5 rounded-full text-xs font-bold text-white/95">
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>
                            कक्षा {submittedApp.className} के कुल {confirmedAdmission.existingCount} छात्रों के बाद अगला रोल नंबर मिला है
                          </span>
                        </div>
                      </div>

                      {/* Details & Fee Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                          <p className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider mb-2">छात्र व आवेदन विवरण</p>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Application No:</span>
                            <strong className="font-mono text-indigo-600 dark:text-indigo-400">{submittedApp.applicationNo}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Student Name:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.studentName}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Class Enrolled:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.className}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Father's Name:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.fatherName}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mobile:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.phone}</strong>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
                          <p className="font-extrabold text-emerald-700 dark:text-emerald-400 uppercase text-[10px] tracking-wider mb-2">जमा शुल्क विवरण (Paid)</p>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>प्रवेश शुल्क (Admission Charge):</span>
                            <strong className="text-slate-900 dark:text-white">₹{confirmedAdmission.admissionCharge}</strong>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>वार्षिक शुल्क (Annual Charge):</span>
                            <strong className="text-slate-900 dark:text-white">₹{confirmedAdmission.annualCharge}</strong>
                          </div>
                          <div className="pt-2 border-t border-emerald-300 dark:border-emerald-800 flex justify-between text-sm font-black text-emerald-700 dark:text-emerald-300">
                            <span>कुल भुगतान (Total Paid):</span>
                            <span>₹{confirmedAdmission.totalPayable}</span>
                          </div>
                          <div className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Payment Screenshot & Push Notification sent to School Admin</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Screenshot Preview if submitted */}
                      {paymentScreenshot && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={paymentScreenshot} alt="Payment Proof" className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-600 shrink-0" />
                            <div className="text-left text-xs">
                              <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                <span>पेमेंट स्क्रीनशॉट संलग्न है</span>
                              </p>
                              {transactionRef && <p className="text-[11px] text-slate-500 font-mono">Ref / UTR: {transactionRef}</p>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewScreenshotUrl(paymentScreenshot)}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded-lg text-slate-800 dark:text-white hover:bg-slate-300 cursor-pointer"
                          >
                            देखें
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPrintStudioState({
                              open: true,
                              student: confirmedAdmission.student,
                              application: { ...submittedApp, assignedRollNo: confirmedAdmission.assignedRollNo },
                              className: submittedApp.className,
                              feeRecord: confirmedAdmission.feeRecord,
                              mode: "combined",
                            });
                          }}
                          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" /> फॉर्म + रसीद प्रिंट करें (A4)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPrintStudioState({
                              open: true,
                              student: confirmedAdmission.student,
                              application: { ...submittedApp, assignedRollNo: confirmedAdmission.assignedRollNo },
                              className: submittedApp.className,
                              feeRecord: confirmedAdmission.feeRecord,
                              mode: "receipt_only",
                            });
                          }}
                          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition cursor-pointer"
                        >
                          <ReceiptText className="w-4 h-4" /> सिर्फ फीस रसीद (Receipt)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSubmittedApp(null);
                            setConfirmedAdmission(null);
                            setPaymentScreenshot(null);
                            setTransactionRef("");
                          }}
                          className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs sm:text-sm font-bold active:scale-95 transition cursor-pointer"
                        >
                          Submit Another Application
                        </button>
                      </div>
                    </div>
                  );
                }

                // If not yet confirmed -> Show Fee Breakdown + UPI QR + Screenshot Upload
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
                    {/* Header */}
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                        चरण 2: शुल्क भुगतान एवं स्क्रीनशॉट
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        प्रवेश आवेदन दर्ज हो गया!
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Application No:{" "}
                        <strong className="font-mono text-indigo-600 dark:text-indigo-400 text-sm sm:text-base">
                          {submittedApp.applicationNo}
                        </strong>{" "}
                        • {submittedApp.studentName} ({submittedApp.className})
                      </p>
                    </div>

                    {/* Step 1: Fee Charges Breakdown Box (Admission + Annual Charge) - Strictly Fixed & Non-editable */}
                    <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-slate-50 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-slate-900/80 rounded-2xl p-5 border border-indigo-200/90 dark:border-indigo-800/70 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            कक्षा {submittedApp.className} का निर्धारित आधिकारिक शुल्क (Fixed Official Charges)
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-300/80 dark:border-amber-800">
                          <Lock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                          <span>फिक्स शुल्क (Non-Editable)</span>
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span>प्रवेश शुल्क (Admission Charge)</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Exact</span>
                            </p>
                            <p className="text-[11px] text-slate-500">कक्षा {submittedApp.className} के लिए एकमुश्त प्रवेश शुल्क</p>
                          </div>
                          <span className="text-base font-black text-slate-900 dark:text-white font-mono">₹{admissionFee}</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span>वार्षिक व विकास शुल्क (Annual Charge)</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Exact</span>
                            </p>
                            <p className="text-[11px] text-slate-500">वार्षिक खेल, गतिविधि, लैब एवं स्कूल विकास निधि</p>
                          </div>
                          <span className="text-base font-black text-slate-900 dark:text-white font-mono">₹{annualCharges}</span>
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-emerald-600 text-white rounded-xl shadow-md">
                          <div>
                            <span className="font-black text-sm block">कुल देय राशि (Exact Total Payable Amount):</span>
                            <span className="text-[10px] text-emerald-100 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-200" />
                              <span>कोई कमी या बदलाव (कम/बेशी) देय नहीं है</span>
                            </span>
                          </div>
                          <span className="text-xl sm:text-2xl font-black font-mono">₹{totalPayable}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Pay via UPI QR Code */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-center space-y-4">
                      <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <QrCode className="w-5 h-5" />
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                          UPI QR कोड स्कैन करके ₹{totalPayable} का भुगतान करें
                        </h3>
                      </div>

                      <div className="inline-block p-4 bg-white rounded-2xl shadow-md border-2 border-slate-200">
                        <QRCode value={upiPaymentUri} size={150} />
                      </div>

                      <div className="space-y-2 max-w-sm mx-auto">
                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <span className="text-slate-500 font-semibold">School UPI ID:</span>
                          <span className="font-mono font-black text-slate-800 dark:text-white">{schoolUpiId}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(schoolUpiId);
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                            }}
                            className="p-1 text-indigo-600 hover:text-indigo-700 cursor-pointer"
                            title="Copy UPI ID"
                          >
                            {copiedUpi ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>

                        <a
                          href={upiPaymentUri}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>PhonePe / GPay / Paytm से ₹{totalPayable} Pay करें</span>
                        </a>
                      </div>
                    </div>

                    {/* Step 3: Upload Screenshot & Send */}
                    <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl p-5 border-2 border-dashed border-amber-300 dark:border-amber-700 space-y-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            पेमेंट का स्क्रीनशॉट भेजें (Upload Screenshot)
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            स्क्रीनशॉट भेजते ही स्कूल एडमिन को <strong>लाइव नोटिफिकेशन</strong> चला जाएगा और छात्र को <strong>कक्षा के छात्रों के बाद का रोल नंबर</strong> तुरंत मिल जाएगा।
                          </p>
                        </div>
                      </div>

                      {/* File input button & preview */}
                      <input
                        type="file"
                        ref={screenshotFileInputRef}
                        accept="image/*"
                        onChange={handleScreenshotFileChange}
                        className="hidden"
                      />

                      {paymentScreenshot ? (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={paymentScreenshot}
                              alt="Payment Screenshot Preview"
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                            />
                            <div className="text-left text-xs">
                              <p className="font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>स्क्रीनशॉट चुना गया</span>
                              </p>
                              <p className="text-[11px] text-slate-500">तैयार है भेजने के लिए</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPaymentScreenshot(null)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => screenshotFileInputRef.current?.click()}
                          className="w-full py-4 border-2 border-dashed border-amber-400 dark:border-amber-600 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700/60 transition flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Camera className="w-6 h-6 text-amber-600" />
                          <span className="text-xs font-black">कैमरा / गैलरी से पेमेंट स्क्रीनशॉट अपलोड करें</span>
                          <span className="text-[10px] text-slate-400">JPG, PNG या WebP फ़ाइल (अधिकतम 8MB)</span>
                        </button>
                      )}

                      {/* Optional UTR / Reference ID */}
                      <div className="text-left">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          UPI Ref / Transaction UTR No. (वैकल्पिक):
                        </label>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="e.g. 512398471923 या UTR नंबर"
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                      </div>

                      {screenshotError && (
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{screenshotError}</span>
                        </div>
                      )}

                      {/* Send Button */}
                      <button
                        type="button"
                        onClick={handleSendPaymentScreenshot}
                        disabled={submittingScreenshot}
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                      >
                        {submittingScreenshot ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>स्क्रीनशॉट भेजा जा रहा है व रोल नंबर आवंटित हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>स्क्रीनशॉट भेजें और एडमिशन पक्का करें (Get Roll Number)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPrintStudioState({
                            open: true,
                            application: submittedApp,
                            className: submittedApp.className,
                            mode: "form_only",
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" /> फॉर्म प्रिंट करें (A4)
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            const appToEnroll = submittedApp;
                            setSubmittedApp(null);
                            setActiveTab("applications");
                            openEnrollModal(appToEnroll);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> एडमिन: नकद फीस जमा करें
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSubmittedApp(null)}
                        className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        वापस जाएं
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <form
                onSubmit={handleSubmitForm}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-6"
              >
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {school.name} — Admission Form
                      </h2>
                      <p className="text-xs text-slate-500">
                        Academic Session {activeSession?.name || "2026-27"} • Official Registration
                      </p>
                    </div>
                  </div>

                  {/* Photo Upload in Form */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-14 rounded-lg border border-dashed border-indigo-400 overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 shrink-0">
                      {form.photoUrl ? (
                        <img src={form.photoUrl} alt="Applicant" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-400 text-center font-bold px-1">Photo</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">Student Photo</p>
                      <DirectUploadButton
                        kind="image"
                        compact
                        currentUrl={form.photoUrl}
                        onUploaded={(url) => setForm((p) => ({ ...p, photoUrl: url }))}
                        onClear={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Admission Type Toggle */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      प्रवेश का प्रकार (Admission Type)
                    </span>
                    <p className="text-[11px] text-slate-500">क्या यह नया नामांकन है या अगली कक्षा में पुनः प्रवेश?</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, admissionType: "NEW" })}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        form.admissionType === "NEW"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      ✓ NEW ADMISSION (नया प्रवेश)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, admissionType: "READMISSION" })}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        form.admissionType === "READMISSION"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      RE-ADMISSION / PROMOTION (पुनः प्रवेश)
                    </button>
                  </div>
                </div>

                {/* Student Bio-Data */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                    1. Student Bio-Data (छात्र का विवरण)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.studentName}
                        onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                        placeholder="e.g. Aarav Kumar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Applying For Class *
                      </label>
                      {classes.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>इस स्कूल में अभी कोई कक्षा उपलब्ध नहीं है। कृपया स्कूल एडमिन से क्लास जोड़ने को कहें।</span>
                        </div>
                      ) : (
                        <select
                          value={form.classId}
                          onChange={(e) => setForm({ ...form, classId: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {classes.map((c) => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {formatClassLabel(c)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Class Fee Guarantee Banner (Strictly Non-Editable / Real Fixed Amount) */}
                    {(() => {
                      const curCls = classes.find((c) => c.id === form.classId) || classes[0];
                      if (!curCls) return null;
                      const fees = getClassFees(curCls);
                      const curAdmFee = fees.admissionFee;
                      const curAnnualFee = fees.annualCharges;
                      const curTotal = fees.totalPayable;
                      const curClsLabel = formatClassLabel(curCls);
                      return (
                        <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 dark:text-emerald-300">
                              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>
                                {curClsLabel ? `कक्षा ${curClsLabel}` : "चयनित कक्षा"} का निर्धारित ऑफिशियल शुल्क (Fixed Official Charges)
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>नॉन-एडिटेबल (Fixed)</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700">
                              <p className="text-[10px] text-slate-500 font-bold">प्रवेश शुल्क</p>
                              <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">₹{curAdmFee}</p>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700">
                              <p className="text-[10px] text-slate-500 font-bold">वार्षिक शुल्क</p>
                              <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">₹{curAnnualFee}</p>
                            </div>
                            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                              <p className="text-[10px] text-emerald-100 font-bold">कुल देय राशि</p>
                              <p className="text-sm sm:text-base font-black font-mono">₹{curTotal}</p>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              स्कूल द्वारा निर्धारित फिक्स शुल्क: फीस में कोई कमी या बदलाव (कम/बेशी) करने का विकल्प नहीं है। फॉर्म सबमिट करने पर सीधे ₹{curTotal} पे करने का ऑप्शन आएगा।
                            </span>
                          </p>
                        </div>
                      );
                    })()}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Gender
                        </label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                          className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="male" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Male</option>
                          <option value="female" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Female</option>
                          <option value="other" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-rose-600 mb-1">
                          Blood Grp
                        </label>
                        <select
                          value={form.bloodGroup}
                          onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                          className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Optional</option>
                          {BLOOD_GROUPS.map((bg) => (
                            <option key={bg} value={bg} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Category
                        </label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {ADMISSION_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Religion (धर्म)
                        </label>
                        <input
                          type="text"
                          value={form.religion}
                          onChange={(e) => setForm({ ...form, religion: e.target.value })}
                          placeholder="e.g. Hindu / Muslim"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Nationality (राष्ट्रीयता)
                        </label>
                        <input
                          type="text"
                          value={form.nationality}
                          onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                          placeholder="Indian"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Student Aadhaar (12-Digit)
                        </label>
                        <input
                          type="text"
                          maxLength={14}
                          value={form.aadhaarNo}
                          onChange={(e) => setForm({ ...form, aadhaarNo: e.target.value.replace(/[^\d\s]/g, "") })}
                          placeholder="XXXX XXXX XXXX"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          APAAR / PEN ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={form.apaarId}
                          onChange={(e) => setForm({ ...form, apaarId: e.target.value })}
                          placeholder="UDISE+ APAAR / PEN"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Identification Mark (पहचान चिन्ह)
                      </label>
                      <input
                        type="text"
                        value={form.identificationMark}
                        onChange={(e) => setForm({ ...form, identificationMark: e.target.value })}
                        placeholder="e.g. Mole on forehead / Cut mark on arm"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Medical History / Allergies (स्वास्थ्य विवरण)
                      </label>
                      <input
                        type="text"
                        value={form.medicalHistory}
                        onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                        placeholder="e.g. None / Normal / Asthma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Previous School Name
                      </label>
                      <input
                        type="text"
                        value={form.previousSchool}
                        onChange={(e) => setForm({ ...form, previousSchool: e.target.value })}
                        placeholder="Last attended school"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Previous Class / Marks %
                      </label>
                      <input
                        type="text"
                        value={form.previousMarks}
                        onChange={(e) => setForm({ ...form, previousMarks: e.target.value })}
                        placeholder="e.g. 88% in Class 5"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent & Contact Details */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                    2. Parent &amp; Contact Information (अभिभावक विवरण)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Father's Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fatherName}
                        onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                        placeholder="Father's Full Name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Father's Occupation &amp; Aadhaar
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={form.fatherOccupation}
                          onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })}
                          placeholder="Occupation"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          maxLength={14}
                          value={form.fatherAadhaar}
                          onChange={(e) => setForm({ ...form, fatherAadhaar: e.target.value.replace(/[^\d\s]/g, "") })}
                          placeholder="Father Aadhaar"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        value={form.motherName}
                        onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                        placeholder="Mother's Full Name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Mother's Occupation &amp; Aadhaar
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={form.motherOccupation}
                          onChange={(e) => setForm({ ...form, motherOccupation: e.target.value })}
                          placeholder="Occupation"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          maxLength={14}
                          value={form.motherAadhaar}
                          onChange={(e) => setForm({ ...form, motherAadhaar: e.target.value.replace(/[^\d\s]/g, "") })}
                          placeholder="Mother Aadhaar"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Primary Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="10-digit Mobile Number"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          WhatsApp No.
                        </label>
                        <input
                          type="tel"
                          value={form.whatsappNo}
                          onChange={(e) => setForm({ ...form, whatsappNo: e.target.value })}
                          placeholder="WhatsApp"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Family Annual Income (वार्षिक आय)
                        </label>
                        <input
                          type="text"
                          value={form.annualIncome}
                          onChange={(e) => setForm({ ...form, annualIncome: e.target.value })}
                          placeholder="e.g. ₹1,50,000 / year"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Emergency Contact Person (आपातकालीन संपर्क)
                        </label>
                        <input
                          type="text"
                          value={form.emergencyContact}
                          onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                          placeholder="Name of Uncle / Guardian"
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Emergency Phone No.
                        </label>
                        <input
                          type="tel"
                          value={form.emergencyPhone}
                          onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                          placeholder="Emergency Mobile"
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Relation with Student
                        </label>
                        <input
                          type="text"
                          value={form.emergencyRelation}
                          onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
                          placeholder="e.g. Uncle / Brother"
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Residential Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="House / Village / Street"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          City / District
                        </label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="City"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          PIN Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
                          placeholder="PIN Code"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transport & Documents */}
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.usesBus}
                        onChange={(e) => setForm({ ...form, usesBus: e.target.checked })}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <Bus className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        School Bus / Transport Facility Required
                      </span>
                    </label>
                    {form.usesBus && (
                      <input
                        type="text"
                        value={form.busRoute}
                        onChange={(e) => setForm({ ...form, busRoute: e.target.value })}
                        placeholder="Nearest Bus Stop / Route"
                        className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold sm:w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    )}
                  </div>

                  {isAdmin && (
                    <div>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-emerald-600" />
                        <span>Documents Submitted with Form:</span>
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {ADMISSION_DOCUMENT_OPTIONS.map((docItem) => {
                          const checked = form.submittedDocs.includes(docItem);
                          return (
                            <label
                              key={docItem}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                                checked
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200"
                                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFormDoc(docItem)}
                                className="w-3.5 h-3.5 accent-emerald-600"
                              />
                              <span className="truncate">{docItem}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Submitting Application..." : "Submit Admission Application"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* APPROVE & ENROLL + ADMISSION FEE RECEIPT MODAL */}
      {showEnrollModal && enrollingApp && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-6 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Direct Student Enrollment &amp; Receipt
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Approve &amp; Enroll: {enrollingApp.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  App No: <strong className="font-mono">{enrollingApp.applicationNo}</strong> • Father: {enrollingApp.fatherName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {enrollError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {enrollError}
              </div>
            )}

            {/* Photo + Class + Roll + Monthly Fee */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-14 h-16 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                  {enrollPhotoUrl ? (
                    <img src={enrollPhotoUrl} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold text-center px-1">Photo</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Student Photo</p>
                  <DirectUploadButton
                    kind="image"
                    compact
                    currentUrl={enrollPhotoUrl}
                    onUploaded={(url) => setEnrollPhotoUrl(url)}
                    onClear={() => setEnrollPhotoUrl("")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 flex-1 w-full">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Assign Class</label>
                  <select
                    value={enrollClassId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setEnrollClassId(nextId);
                      const cls = classes.find((c) => c.id === nextId);
                      setEnrollMonthlyFee(String(cls?.feeStructure?.tuitionFee ?? cls?.defaultFee ?? 0));
                      setEnrollFeeItems(buildDefaultFeeItems(cls, enrollUsesBus, Number(cls?.feeStructure?.busFee || 0)));
                      setEnrollPaidManual(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {formatClassLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Roll No.</label>
                  <input
                    type="text"
                    value={enrollRollNo}
                    onChange={(e) => setEnrollRollNo(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={enrollMonthlyFee}
                    onChange={(e) => setEnrollMonthlyFee(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Aadhaar / APAAR & Bus */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Student Aadhaar</label>
                <input
                  type="text"
                  maxLength={14}
                  value={enrollStudentAadhaar}
                  onChange={(e) => setEnrollStudentAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Father Aadhaar</label>
                <input
                  type="text"
                  maxLength={14}
                  value={enrollFatherAadhaar}
                  onChange={(e) => setEnrollFatherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Mother Aadhaar</label>
                <input
                  type="text"
                  maxLength={14}
                  value={enrollMotherAadhaar}
                  onChange={(e) => setEnrollMotherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">APAAR / PEN ID</label>
                <input
                  type="text"
                  value={enrollApaarId}
                  onChange={(e) => setEnrollApaarId(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
            </div>

            {/* Documents Verified Checklist */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300">
                Documents Verified (प्रवेश फॉर्म पर [✓] छपेगा)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ADMISSION_DOCUMENT_OPTIONS.map((docItem) => {
                  const active = enrollSubmittedDocs.includes(docItem);
                  return (
                    <label
                      key={docItem}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        active
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleEnrollDoc(docItem)}
                        className="w-3.5 h-3.5 accent-emerald-600"
                      />
                      <span className="truncate">{docItem}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Admission Fee Items */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4" /> Admission Fee Breakdown (प्रवेश शुल्क रसीद)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEnrollFeeItems((p) => [
                        ...p,
                        { id: `bk_${Date.now()}`, description: "Books & Stationery Set (किताबें)", due: 1200 },
                      ])
                    }
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 text-[11px] font-bold text-emerald-700 cursor-pointer"
                  >
                    + Books
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEnrollFeeItems((p) => [
                        ...p,
                        { id: `dr_${Date.now()}`, description: "School Uniform / Dress (ड्रेस)", due: 950 },
                      ])
                    }
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 text-[11px] font-bold text-emerald-700 cursor-pointer"
                  >
                    + Dress
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEnrollFeeItems((p) => [
                        ...p,
                        { id: `cu_${Date.now()}`, description: "Other Admission Charge", due: 0 },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {enrollFeeItems.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        setEnrollFeeItems((p) =>
                          p.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r))
                        )
                      }
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                    />
                    <input
                      type="number"
                      value={row.due}
                      onChange={(e) =>
                        setEnrollFeeItems((p) =>
                          p.map((r) => (r.id === row.id ? { ...r, due: Math.max(0, Number(e.target.value)) } : r))
                        )
                      }
                      className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-black text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setEnrollFeeItems((p) => p.filter((r) => r.id !== row.id))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Concession (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={enrollConcession}
                    onChange={(e) => setEnrollConcession(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={enrollPaidAmount}
                    onChange={(e) => {
                      setEnrollPaidManual(true);
                      setEnrollPaidAmount(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 text-xs font-black text-emerald-700 dark:text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Pay Mode</label>
                  <select
                    value={enrollPayMode}
                    onChange={(e) => setEnrollPayMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  >
                    <option value="Cash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Cash (नकद)</option>
                    <option value="Online / UPI" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">UPI / QR</option>
                    <option value="Bank Transfer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Bank Transfer</option>
                    <option value="Cheque" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Ref / UTR No</label>
                  <input
                    type="text"
                    value={enrollPayRef}
                    onChange={(e) => setEnrollPayRef(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-emerald-200">
                <span>
                  Net Payable: <strong>₹{enrollNetPayable.toLocaleString("en-IN")}</strong>
                </span>
                <span className="font-black text-emerald-700">
                  Paid: ₹{(Number(enrollPaidAmount) || 0).toLocaleString("en-IN")} • Due: ₹
                  {Math.max(0, enrollNetPayable - (Number(enrollPaidAmount) || 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveAndEnroll}
                disabled={enrolling}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                <span>{enrolling ? "Enrolling..." : "Confirm & Print Form + Receipt"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMBINED A4 ADMISSION FORM + RECEIPT PRINT STUDIO */}
      {printStudioState.open && (
        <AdmissionFormPrintModal
          isOpen={printStudioState.open}
          onClose={() => setPrintStudioState({ open: false })}
          school={school}
          student={printStudioState.student}
          application={printStudioState.application}
          className={printStudioState.className}
          sessionName={activeSession?.name || "2026-27"}
          feeRecord={printStudioState.feeRecord || null}
          initialMode={printStudioState.mode}
        />
      )}

      {/* STANDALONE POS / WHATSAPP RECEIPT MODAL */}
      {posReceiptState.open && posReceiptState.fee && posReceiptState.student && (
        <OfficialFeeReceiptModal
          isOpen={posReceiptState.open}
          onClose={() => setPosReceiptState({ open: false, student: null, fee: null })}
          school={school}
          fee={posReceiptState.fee}
          student={posReceiptState.student}
          className={
            formatClassLabel(classes.find((c) => c.id === posReceiptState.student?.classId)) ||
            posReceiptState.student?.className ||
            "Class"
          }
          sessionName={activeSession?.name || "2026-27"}
        />
      )}

      {/* SCREENSHOT FULL PREVIEW MODAL */}
      {viewScreenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 relative shadow-2xl border border-slate-300 dark:border-slate-700 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span>Payment Screenshot Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewScreenshotUrl(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] overflow-auto rounded-xl bg-slate-950 flex items-center justify-center p-2">
              <img src={viewScreenshotUrl} alt="Payment Screenshot" className="max-h-[65vh] object-contain rounded-lg shadow-md" />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setViewScreenshotUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
