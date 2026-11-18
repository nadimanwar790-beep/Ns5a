// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import QRCode from "react-qr-code";
import {
  ShieldCheck,
  CheckCircle2,
  Printer,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  AlertCircle,
  Bus,
  Award,
  Calendar,
  Clock,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import {
  getAllSchools,
  getSchool,
  getStudent,
  getStudents,
  getTeachers,
  getClasses,
} from "../../school-firebase";
import { getDynamicAcademicSessionLabel } from "../../utils/safeBrowserActions";
import {
  extractEmbeddedNstaToken,
  safeDecodeUriPart,
} from "../../utils/qrVerifyUrl";
import {
  generateDpsReceiptHtml,
  DPS_RECEIPT_CSS,
  getSavedSchoolLogo,
  getVisibleSchoolRegNo,
  formatAcademicSession,
  type DpsReceiptData,
} from "./feeReceiptUtils";

interface Props {
  verifyType?: "marksheet" | "certificate" | "idcard" | string;
  dataParam?: string;
  onBack?: () => void;
}

const SCOPED_DPS_CSS = DPS_RECEIPT_CSS
  .replace(/@page\s*\{[^}]*\}/g, "")
  .replace(/html,\s*body\s*\{[^}]*\}/g, ".dps-receipt-scope { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000000; background: #ffffff; }")
  .replace(/(^|\n)\s*\*\s*\{/g, "$1.dps-receipt-scope * {");

const VerifiedWatermarkOverlay: React.FC<{ label?: string; docNo?: string }> = ({
  label = "VERIFIED",
  docNo,
}) => (
  <div
    className="pointer-events-none select-none absolute inset-0 z-20 overflow-hidden"
    aria-hidden="true"
  >
    {/* Subtle diagonal watermark grid across the authentic document */}
    <div className="absolute -inset-12 flex flex-col justify-evenly items-center -rotate-[24deg] opacity-[0.075]">
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="flex items-center gap-12 whitespace-nowrap text-emerald-700 font-black tracking-[0.28em] text-xl sm:text-2xl uppercase"
        >
          <span>{label} &bull; GENUINE</span>
          <span>OFFICIAL VERIFIED</span>
          <span>{label} &bull; GENUINE</span>
        </div>
      ))}
    </div>

    {/* Crisp Official Circular/Box Stamp Watermark */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.16]">
      <div className="border-[3.5px] border-dashed border-emerald-700 rounded-2xl px-6 py-2.5 text-center bg-emerald-50/20">
        <div className="text-emerald-800 font-black text-2xl sm:text-4xl tracking-[0.22em] uppercase leading-none">
          {label}
        </div>
        <div className="text-[9px] sm:text-[10px] font-extrabold text-emerald-800 tracking-[0.18em] uppercase mt-1">
          AUTHENTIC SCHOOL RECORD{docNo ? ` • ${docNo}` : ""}
        </div>
      </div>
    </div>

    {/* Corner Seal Badge */}
    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white shadow-md border border-emerald-300/70">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      <span className="text-[9px] font-black tracking-widest uppercase">VERIFIED</span>
    </div>
  </div>
);

const SchoolLogoImg: React.FC<{
  logoUrl?: string;
  schoolName?: string;
  className?: string;
}> = ({ logoUrl, schoolName, className = "w-14 h-14" }) => {
  const [failed, setFailed] = useState(false);
  const initials = (schoolName || "SC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "SC";

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={schoolName || "School Logo"}
        onError={() => setFailed(true)}
        className={`${className} object-contain rounded-lg bg-white p-0.5 border border-slate-200 shadow-sm shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 border-2 border-amber-400 text-amber-300 font-black text-lg flex items-center justify-center shadow-sm shrink-0`}
    >
      {initials}
    </div>
  );
};

export const DocumentVerificationView: React.FC<Props> = ({
  verifyType = "marksheet",
  dataParam,
  onBack,
}) => {
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const parseAndEnrich = async () => {
      try {
        const p = new URLSearchParams(window.location.search);
        const rawHash = window.location.hash || "";
        const rawFullUrl = `${window.location.search}${rawHash}`;

        // 1) Check embedded NSTA tokens in hash or URL (#NSTA-SCHOOL:..., #NSTA-SCHOOL-STAFF:..., #NSTA-SCHOOL-DRIVER:...)
        const driverToken = extractEmbeddedNstaToken(rawFullUrl, "NSTA-SCHOOL-DRIVER:");
        const staffToken = extractEmbeddedNstaToken(rawFullUrl, "NSTA-SCHOOL-STAFF:");
        const studentToken = extractEmbeddedNstaToken(rawFullUrl, "NSTA-SCHOOL:");

        // 2) Check ?data=... JSON payload
        const urlJsonData =
          dataParam ||
          p.get("data") ||
          (p.get("id")?.trim().startsWith("{") ? p.get("id") : null);

        let parsedJson: any = null;
        if (urlJsonData) {
          try {
            parsedJson = JSON.parse(decodeURIComponent(urlJsonData));
          } catch {
            try {
              parsedJson = JSON.parse(urlJsonData);
            } catch {}
          }
        }

        const urlTypeParam =
          p.get("v") === "id"
            ? "idcard"
            : parsedJson?.t || parsedJson?.type || p.get("type") || verifyType;

        let initialRecord: any = null;

        // Priority A: Fee Receipt, Admit Card, Certificate, Marksheet, Admission, Gate Pass with ?data= JSON
        if (parsedJson && typeof parsedJson === "object") {
          const t = parsedJson.t || parsedJson.type || urlTypeParam || "marksheet";
          if (t === "fee_receipt") {
            initialRecord = {
              type: "fee_receipt",
              officialVerified: true,
              schoolId: parsedJson.sid || p.get("s") || "",
              school: parsedJson.sn || "Registered School",
              schoolAddress: parsedJson.sa || "",
              schoolPhone: parsedJson.sp || "",
              studentId: parsedJson.uid || p.get("u") || "",
              receiptNo: parsedJson.rno || p.get("rno") || "REC-01",
              receiptTitle: parsedJson.tit || "OFFICIAL FEE RECEIPT",
              isDueDemand: Boolean(parsedJson.dem),
              student: parsedJson.nm || "Student",
              fatherName: parsedJson.fn || "",
              motherName: parsedJson.mn || "",
              class: parsedJson.cl || "",
              roll: parsedJson.rl || "",
              regNo: parsedJson.adm || "",
              phone: parsedJson.ph || "",
              session: parsedJson.ss || getDynamicAcademicSessionLabel(),
              date: parsedJson.dt || new Date().toLocaleDateString("en-IN"),
              time: parsedJson.tm || "",
              paymentMode: parsedJson.pm || "Cash / Counter",
              grandTotal: Number(parsedJson.gt || 0),
              totalPaid: Number(parsedJson.tp || 0),
              balanceDue: Number(parsedJson.bd || 0),
              totalConcession: Number(parsedJson.cn || 0),
              lastPaidAmount: Number(parsedJson.lp || 0),
              lastPaidDate: parsedJson.lpd || "",
              previousDueAmount: Number(parsedJson.pd || 0),
              previousDueMonth: parsedJson.pdm || "",
              items: Array.isArray(parsedJson.it)
                ? parsedJson.it.map((row: any, idx: number) =>
                    Array.isArray(row)
                      ? {
                          id: `item_${idx}`,
                          description: String(row[0] || "Fee"),
                          due: Number(row[1] || 0),
                          con: Number(row[2] || 0),
                          paid: Number(row[3] || 0),
                        }
                      : row
                  )
                : [],
              upiId: parsedJson.upi || "",
              signatoryTitle: parsedJson.sig || "",
            };
          } else if (t === "admit_card") {
            initialRecord = {
              type: "admit_card",
              officialVerified: true,
              schoolId: parsedJson.sid || p.get("s") || "",
              school: parsedJson.sn || "Registered School",
              schoolCode: parsedJson.sc || "",
              schoolAddress: parsedJson.sa || "",
              schoolPhone: parsedJson.sp || "",
              examName: parsedJson.ex || "Annual Examination",
              session: parsedJson.ss || getDynamicAcademicSessionLabel(),
              studentId: parsedJson.uid || p.get("u") || "",
              roll: parsedJson.rl || "—",
              regNo: parsedJson.adm || "—",
              student: parsedJson.nm || "Student",
              fatherName: parsedJson.fn || "",
              phone: parsedJson.ph || "",
              class: parsedJson.cl || "—",
              centerName: parsedJson.ctr || parsedJson.sn || "Main School Campus",
              examController: parsedJson.ec || "Controller of Examinations",
              principalTitle: parsedJson.pt || "Principal",
              timetable: Array.isArray(parsedJson.tt)
                ? parsedJson.tt.map((r: any) =>
                    Array.isArray(r)
                      ? { subject: r[0], date: r[1], time: r[2], room: r[3] || "Room 1" }
                      : r
                  )
                : [],
            };
          } else if (t === "certificate") {
            initialRecord = {
              type: "certificate",
              officialVerified: true,
              schoolId: parsedJson.sid || p.get("s") || "",
              studentId: parsedJson.uid || p.get("u") || "",
              school: parsedJson.sn || parsedJson.school || "Registered School",
              schoolCode: parsedJson.sc || parsedJson.schoolCode || "",
              student: parsedJson.nm || parsedJson.student || "Student",
              roll: parsedJson.rl || parsedJson.roll || "—",
              regNo: parsedJson.adm || parsedJson.regNo || "—",
              fatherName: parsedJson.fn || parsedJson.fatherName || "",
              class: parsedJson.cl || parsedJson.class || "—",
              certificateNo: parsedJson.cno || parsedJson.certificateNo || p.get("cNo") || "—",
              session: parsedJson.ss || parsedJson.session || getDynamicAcademicSessionLabel(),
              certType: parsedJson.ct || "tc",
              certificateType: parsedJson.tit || parsedJson.certificateType || "Official Certificate",
              issueDate: parsedJson.dt || parsedJson.issueDate || parsedJson.date || new Date().toLocaleDateString("en-IN"),
              date: parsedJson.dt || parsedJson.date || new Date().toLocaleDateString("en-IN"),
              reason: parsedJson.rs || parsedJson.reason || "",
              remarks: parsedJson.rm || parsedJson.remarks || "",
              rank: parsedJson.rk || parsedJson.rank || "",
              percentage: parsedJson.pc || parsedJson.percentage || "",
              division: parsedJson.dv || parsedJson.division || "",
              customBodyText: parsedJson.bd || parsedJson.customBodyText || "",
            };
          } else if (t === "admission") {
            initialRecord = {
              type: "admission",
              officialVerified: true,
              schoolId: parsedJson.sid || p.get("s") || "",
              school: parsedJson.sn || "Registered School",
              studentId: parsedJson.uid || p.get("u") || "",
              regNo: parsedJson.adm || p.get("adm") || "—",
              applicationNo: parsedJson.app || parsedJson.adm || "—",
              student: parsedJson.nm || "Applicant",
              fatherName: parsedJson.fn || "",
              motherName: parsedJson.mn || "",
              class: parsedJson.cl || "—",
              dob: parsedJson.dob || "",
              gender: parsedJson.gn || "",
              phone: parsedJson.ph || "",
              admissionType: parsedJson.at || "New Admission",
              receiptNo: parsedJson.rno || "NA",
              totalDue: Number(parsedJson.td || 0),
              totalCon: Number(parsedJson.tc || 0),
              totalPaid: Number(parsedJson.tp || 0),
              balanceDue: Number(parsedJson.bd || 0),
              date: parsedJson.dt || new Date().toLocaleDateString("en-IN"),
              paymentMode: parsedJson.pm || "Cash / Counter",
              collectorName: parsedJson.col || "Admissions Office",
              items: Array.isArray(parsedJson.it)
                ? parsedJson.it.map((row: any) =>
                    Array.isArray(row)
                      ? { description: row[0], due: Number(row[1] || 0), con: Number(row[2] || 0), paid: Number(row[3] || 0) }
                      : row
                  )
                : [],
            };
          } else if (t === "gate_pass") {
            initialRecord = {
              type: "gate_pass",
              officialVerified: true,
              schoolId: parsedJson.sid || p.get("s") || "",
              school: parsedJson.sn || "Registered School",
              passNumber: parsedJson.pno || p.get("pass") || "PASS-01",
              student: parsedJson.nm || "Authorized Visitor / Student",
              phone: parsedJson.ph || "",
              purpose: parsedJson.pur || "Campus Visit",
              personToMeet: parsedJson.mt || "School Office",
              reason: parsedJson.rs || "",
              timeStamp: parsedJson.tm || new Date().toLocaleString("en-IN"),
              passKind: parsedJson.pk || "visitor",
            };
          } else if (t === "marksheet") {
            const rawSubjs = Array.isArray(parsedJson.subjs)
              ? parsedJson.subjs.map((row: any) =>
                  Array.isArray(row)
                    ? { name: String(row[0] || "Subject"), max: Number(row[1] || 100), obt: Number(row[2] || 0), grade: String(row[3] || "") }
                    : row
                )
              : Array.isArray(parsedJson.subjects)
              ? parsedJson.subjects
              : [];
            initialRecord = {
              type: "marksheet",
              officialVerified: true,
              schoolId: parsedJson.sid || p.get("s") || "",
              studentId: parsedJson.uid || p.get("u") || "",
              school: parsedJson.school || parsedJson.sn || "Registered School",
              schoolCode: parsedJson.schoolCode || parsedJson.sc || "",
              student: parsedJson.student || parsedJson.nm || "Student",
              fatherName: parsedJson.fatherName || parsedJson.fn || "",
              motherName: parsedJson.motherName || parsedJson.mn || "",
              roll: parsedJson.roll || parsedJson.rl || "—",
              regNo: parsedJson.regNo || parsedJson.adm || "—",
              class: parsedJson.class || parsedJson.cl || "—",
              section: parsedJson.sec || parsedJson.section || "",
              session: parsedJson.session || parsedJson.ss || getDynamicAcademicSessionLabel(),
              examName: parsedJson.ex || parsedJson.examName || "Annual Examination",
              wing: parsedJson.wing || "",
              classRank: parsedJson.classRank || "",
              sectionRank: parsedJson.sectionRank || "",
              total: parsedJson.total || "—",
              pct: parsedJson.pct ?? "",
              gpa: parsedJson.gpa || "—",
              grade: parsedJson.grade || "—",
              status: parsedJson.status || "VERIFIED",
              attendance: parsedJson.att || parsedJson.attendance || "",
              teacherName: parsedJson.tn || "Class Teacher",
              examControllerName: parsedJson.ecn || "Controller of Examinations",
              principalName: parsedJson.pn || "Principal",
              date: parsedJson.date || new Date().toISOString().split("T")[0],
              photoUrl: parsedJson.photoUrl || "",
              subjects: rawSubjs,
            };
          } else {
            initialRecord = {
              ...parsedJson,
              type: t,
              officialVerified: parsedJson.officialVerified !== false,
              schoolId: parsedJson.sid || parsedJson.schoolId || p.get("s") || "",
              studentId: parsedJson.uid || parsedJson.studentId || p.get("u") || "",
            };
          }
        }
        // Priority B: Bus Driver ID Card (#NSTA-SCHOOL-DRIVER:...)
        else if (driverToken) {
          const pts = driverToken.split(":");
          initialRecord = {
            type: "driver_id",
            officialVerified: true,
            schoolId: safeDecodeUriPart(pts[0]) || p.get("s") || "",
            busId: safeDecodeUriPart(pts[1]) || p.get("busId") || "",
            busNumber: safeDecodeUriPart(pts[2]) || "BUS-01",
            route: safeDecodeUriPart(pts[3]) || "School Transport Route",
            student: safeDecodeUriPart(pts[4]) || "Authorized Driver",
            phone: safeDecodeUriPart(pts[5]) || "Registered",
            schoolCode: safeDecodeUriPart(pts[6]) || "",
            school: safeDecodeUriPart(pts[7]) || "Registered School",
            session: getDynamicAcademicSessionLabel(),
          };
        }
        // Priority C: Teacher or Admin ID Card (#NSTA-SCHOOL-STAFF:...)
        else if (staffToken) {
          const pts = staffToken.split(":");
          const staffId = safeDecodeUriPart(pts[1]) || p.get("u") || "";
          const roleParam = p.get("role") || "";
          const isAdminCard =
            roleParam === "admin" ||
            staffId.toUpperCase() === "ADMIN-01" ||
            /principal|director|admin/i.test(safeDecodeUriPart(pts[13]));
          initialRecord = {
            type: "idcard",
            cardRole: isAdminCard ? "admin" : "teacher",
            officialVerified: true,
            schoolId: safeDecodeUriPart(pts[0]) || p.get("s") || "",
            staffId,
            studentId: staffId,
            roll: safeDecodeUriPart(pts[2]) || staffId || "STAFF",
            department: safeDecodeUriPart(pts[3]) || (isAdminCard ? "Administration" : "Faculty"),
            class: safeDecodeUriPart(pts[13]) || (isAdminCard ? "School Head / Principal" : "Teaching Faculty"),
            student: safeDecodeUriPart(pts[4]) || "Staff Member",
            regNo: safeDecodeUriPart(pts[5]) || staffId || "—",
            phone: safeDecodeUriPart(pts[6]) || "Registered",
            fatherName: safeDecodeUriPart(pts[7]) || "",
            motherName: safeDecodeUriPart(pts[8]) || "",
            bloodGroup: safeDecodeUriPart(pts[9]) || "",
            dob: safeDecodeUriPart(pts[10]) || "",
            address: safeDecodeUriPart(pts[11]) || "",
            designation: safeDecodeUriPart(pts[13]) || (isAdminCard ? "Principal / School Head" : "Teacher"),
            school: safeDecodeUriPart(pts[14]) || "Registered School",
            session: getDynamicAcademicSessionLabel(),
          };
        }
        // Priority D: Student ID Card (#NSTA-SCHOOL:...)
        else if (studentToken) {
          const pts = studentToken.split(":");
          initialRecord = {
            type: "idcard",
            cardRole: "student",
            officialVerified: true,
            schoolId: safeDecodeUriPart(pts[0]) || p.get("s") || "",
            studentId: safeDecodeUriPart(pts[1]) || p.get("u") || "",
            roll: safeDecodeUriPart(pts[2]) || "—",
            classId: safeDecodeUriPart(pts[3]) || "",
            student: safeDecodeUriPart(pts[4]) || "Student",
            regNo: safeDecodeUriPart(pts[5]) || "—",
            phone: safeDecodeUriPart(pts[6]) || "Registered",
            fatherName: safeDecodeUriPart(pts[7]) || "",
            motherName: safeDecodeUriPart(pts[8]) || "",
            bloodGroup: safeDecodeUriPart(pts[9]) || "",
            dob: safeDecodeUriPart(pts[10]) || "",
            address: safeDecodeUriPart(pts[11]) || "",
            class: safeDecodeUriPart(pts[13]) || (pts[3] ? `Class ${safeDecodeUriPart(pts[3]).slice(0, 10)}` : "—"),
            school: safeDecodeUriPart(pts[14]) || "Registered School",
            session: getDynamicAcademicSessionLabel(),
          };
        }
        // Priority E: Legacy Query-Param Verification URL
        else {
          const urlName = p.get("n") || p.get("name") || p.get("studentName");
          const urlRoll = p.get("r") || p.get("roll") || p.get("rollNo");
          const urlSchoolId = p.get("s") || p.get("schoolId") || p.get("school") || "";
          const urlSchoolName = p.get("schoolName") || "";
          const urlCertNo = p.get("cNo") || p.get("certNo") || p.get("dispatchNo") || "";
          const urlCertTitle = p.get("certTitle") || p.get("title") || "";
          const urlSession = p.get("session") || getDynamicAcademicSessionLabel();
          const urlIdParam = p.get("id") || "";
          const urlStudentId = p.get("u") || p.get("uid") || p.get("studentId") || urlIdParam || "";
          const urlAdmNo = p.get("adm") || p.get("admNo") || p.get("regNo") || urlIdParam || "";
          const urlClassId = p.get("c") || p.get("classId") || "";
          const urlPass = p.get("pass") || "";

          if (urlName || urlRoll || urlCertNo || urlIdParam || urlPass || p.get("v") === "id" || p.get("verify")) {
            initialRecord = {
              type: urlTypeParam,
              cardRole: p.get("role") === "admin" ? "admin" : p.get("role") === "staff" ? "teacher" : "student",
              officialVerified: true,
              schoolId: urlSchoolId,
              studentId: urlStudentId,
              classId: urlClassId,
              school: urlSchoolName ? safeDecodeUriPart(urlSchoolName) : (urlSchoolId || "Registered School"),
              schoolCode: urlSchoolId ? `SCH-${urlSchoolId.slice(0, 10).toUpperCase()}` : "—",
              student: urlName ? safeDecodeUriPart(urlName) : (urlIdParam ? `Record ${urlIdParam}` : "Verified Student"),
              roll: urlRoll || "—",
              regNo: urlAdmNo ? safeDecodeUriPart(urlAdmNo) : (urlStudentId ? `REG-${urlStudentId.slice(0, 8)}` : "—"),
              class: urlClassId ? `Class ${urlClassId.slice(0, 6)}` : "—",
              session: urlSession,
              certificateNo: urlCertNo ? safeDecodeUriPart(urlCertNo) : "—",
              certificateType: urlCertTitle ? safeDecodeUriPart(urlCertTitle) : "Official Certificate",
              passNumber: urlPass,
              status: "VERIFIED",
              date: new Date().toISOString().split("T")[0],
              photoUrl: "",
              phone: "Official Record",
            };
          }
        }

        if (!initialRecord) {
          if (active) {
            setDocData({
              type: verifyType,
              officialVerified: false,
              school: "Verification Record Not Found",
              status: "UNVERIFIED",
            });
            setLoading(false);
          }
          return;
        }

        if (active) {
          setDocData(initialRecord);
          setLoading(false);
        }

        // Async live enrichment from Firestore / Local Cache (school logo, signatures, live photo, class name)
        const targetSchoolQuery = initialRecord.schoolId || p.get("s") || p.get("schoolId") || "";
        const targetStudentId = initialRecord.studentId || p.get("u") || p.get("uid") || "";
        const targetAdmNo = initialRecord.regNo && initialRecord.regNo !== "—" ? initialRecord.regNo : "";

        if (targetSchoolQuery || targetStudentId) {
          let resolvedSchool = targetSchoolQuery
            ? await getSchool(targetSchoolQuery).catch(() => null)
            : null;
          if (!resolvedSchool && targetSchoolQuery) {
            const allSchools = await getAllSchools().catch(() => []);
            const q = targetSchoolQuery.trim().toLowerCase();
            resolvedSchool =
              allSchools.find(
                (s) =>
                  s.id?.toLowerCase() === q ||
                  s.code?.toLowerCase() === q ||
                  s.name?.toLowerCase().replace(/[^a-z0-9]+/g, "_") === q
              ) || null;
          }

          const targetSid = resolvedSchool?.id || targetSchoolQuery;
          let resolvedStudent: any = null;
          let resolvedTeacher: any = null;
          let resolvedClassName = "";

          if (targetSid) {
            if (initialRecord.cardRole === "teacher") {
              const teachers = await getTeachers(targetSid).catch(() => []);
              const qT = (initialRecord.staffId || targetStudentId || "").trim().toLowerCase();
              resolvedTeacher =
                teachers.find(
                  (t) =>
                    t.id?.toLowerCase() === qT ||
                    t.employeeId?.toLowerCase() === qT ||
                    (initialRecord.phone && t.phone === initialRecord.phone)
                ) || null;
            } else if (initialRecord.cardRole !== "admin" && initialRecord.type !== "driver_id") {
              if (targetStudentId) {
                resolvedStudent = await getStudent(targetSid, targetStudentId).catch(() => null);
              }
              if (!resolvedStudent && (targetAdmNo || initialRecord.roll !== "—")) {
                const allStudents = await getStudents(targetSid).catch(() => []);
                const qLookup = (targetAdmNo || initialRecord.roll || "").trim().toLowerCase();
                resolvedStudent =
                  allStudents.find(
                    (st) =>
                      st.id?.toLowerCase() === qLookup ||
                      st.admissionNo?.toLowerCase() === qLookup ||
                      st.rollNo?.toLowerCase() === qLookup
                  ) || null;
              }
            }

            if (initialRecord.classId || resolvedStudent?.classId) {
              const clsList = await getClasses(targetSid).catch(() => []);
              const cid = resolvedStudent?.classId || initialRecord.classId;
              const matchedClass = clsList.find((c) => c.id === cid);
              if (matchedClass) {
                resolvedClassName = matchedClass.section
                  ? `${matchedClass.name} (${matchedClass.section})`
                  : matchedClass.name;
              }
            }
          }

          if (active && (resolvedSchool || resolvedStudent || resolvedTeacher || resolvedClassName)) {
            setDocData((prev: any) => {
              if (!prev) return prev;
              const isAdminCard = prev.cardRole === "admin";
              return {
                ...prev,
                schoolId: resolvedSchool?.id || prev.schoolId,
                school: resolvedSchool?.name || prev.school,
                schoolCode: getVisibleSchoolRegNo(resolvedSchool, resolvedSchool?.code || prev.schoolCode),
                schoolAddress: resolvedSchool?.address || prev.schoolAddress,
                schoolPhone: resolvedSchool?.phone || resolvedSchool?.mobile || prev.schoolPhone,
                schoolEmail: resolvedSchool?.email || prev.schoolEmail,
                schoolAffiliation: resolvedSchool?.affiliation || prev.schoolAffiliation,
                schoolLogoUrl: getSavedSchoolLogo(resolvedSchool?.logoUrl, resolvedSchool?.id || prev.schoolId),
                principalName: resolvedSchool?.principalName || prev.principalName,
                principalSignatureUrl: resolvedSchool?.principalSignatureUrl || prev.principalSignatureUrl,
                principalPhotoUrl: resolvedSchool?.principalPhotoUrl || prev.principalPhotoUrl,
                directorName: resolvedSchool?.directorName || prev.directorName,
                directorSignatureUrl: resolvedSchool?.directorSignatureUrl || prev.directorSignatureUrl,
                examControllerName: resolvedSchool?.examControllerName || prev.examControllerName,
                examControllerSignatureUrl:
                  resolvedSchool?.examControllerSignatureUrl || prev.examControllerSignatureUrl,
                managerName: resolvedSchool?.managerName || prev.managerName,
                managerSignatureUrl: resolvedSchool?.managerSignatureUrl || prev.managerSignatureUrl,
                accountantName: resolvedSchool?.accountantName || prev.accountantName,
                accountantSignatureUrl:
                  resolvedSchool?.accountantSignatureUrl || prev.accountantSignatureUrl,
                upiId: resolvedSchool?.upiId || prev.upiId,

                student:
                  resolvedStudent?.name ||
                  resolvedTeacher?.name ||
                  (isAdminCard ? resolvedSchool?.principalName || prev.student : prev.student),
                roll: resolvedStudent?.rollNo || resolvedTeacher?.employeeId || prev.roll,
                regNo: resolvedStudent?.admissionNo || resolvedTeacher?.employeeId || prev.regNo,
                class: resolvedClassName || resolvedStudent?.className || prev.class,
                fatherName: resolvedStudent?.fatherName || prev.fatherName,
                motherName: resolvedStudent?.motherName || prev.motherName,
                dob: resolvedStudent?.dob || prev.dob,
                bloodGroup: resolvedStudent?.bloodGroup || prev.bloodGroup,
                address: resolvedStudent?.address || resolvedTeacher?.address || prev.address,
                phone: resolvedStudent?.phone || resolvedTeacher?.phone || prev.phone,
                photoUrl:
                  resolvedStudent?.photoUrl ||
                  resolvedTeacher?.photoUrl ||
                  (isAdminCard ? resolvedSchool?.principalPhotoUrl : "") ||
                  prev.photoUrl,
                designation: resolvedTeacher?.designation || prev.designation,
                qualification: resolvedTeacher?.qualification || prev.qualification,
              };
            });
          }
        }
      } catch (err) {
        console.warn("[DocVerify] Verification parse warning:", err);
        if (active) {
          setDocData({
            type: verifyType,
            officialVerified: false,
            school: "Verification Error",
            status: "UNVERIFIED",
          });
          setLoading(false);
        }
      }
    };

    parseAndEnrich();
    return () => {
      active = false;
    };
  }, [verifyType, dataParam]);

  const type = docData?.type || verifyType;

  // Build real DPS Fee Receipt HTML when type === "fee_receipt"
  const renderedFeeReceiptHtml = useMemo(() => {
    if (type !== "fee_receipt" || !docData?.officialVerified) return "";
    const dpsData: DpsReceiptData = {
      schoolName: docData.school || "Registered School",
      schoolAddress: docData.schoolAddress || "School Academic Campus",
      schoolLogoUrl: docData.schoolLogoUrl || getSavedSchoolLogo("", docData.schoolId),
      schoolPhone: docData.schoolPhone || "",
      schoolEmail: docData.schoolEmail || "",
      schoolAffiliation: docData.schoolAffiliation || "",
      receiptNo: docData.receiptNo || "REC-01",
      admissionNo: docData.regNo || "—",
      studentName: docData.student || "Student",
      fatherName: docData.fatherName || "",
      motherName: docData.motherName || "",
      studentId: docData.studentId || "",
      schoolId: docData.schoolId || "",
      rollNo: docData.roll || "",
      phone: docData.phone || "",
      studentPhotoUrl: docData.photoUrl || "",
      installment: docData.session || "",
      receiptDate: docData.date || new Date().toLocaleDateString("en-IN"),
      session: formatAcademicSession(docData.session),
      className: docData.class || "—",
      counterNo: docData.isDueDemand ? "DUE-DEMAND" : "DPS-RECEIPT",
      receiptTitle: docData.receiptTitle || (docData.isDueDemand ? "FEE DEMAND SLIP" : "OFFICIAL FEE RECEIPT"),
      items:
        Array.isArray(docData.items) && docData.items.length > 0
          ? docData.items
          : [
              {
                id: "fee_total",
                description: docData.isDueDemand ? "Total Fee Payable" : "School Fee Received",
                due: Number(docData.grandTotal || docData.totalPaid || docData.balanceDue || 0),
                con: Number(docData.totalConcession || 0),
                paid: Number(docData.totalPaid || 0),
              },
            ],
      balanceDue: docData.balanceDue,
      lastPaidAmount: docData.lastPaidAmount || undefined,
      lastPaidDate: docData.lastPaidDate || undefined,
      lastDueAmount: docData.previousDueAmount || undefined,
      lastDueDate: docData.previousDueMonth || undefined,
      payModeInfo: {
        payMode: docData.paymentMode || "Cash / Counter",
        date: docData.date || "",
        bank: "",
        number: docData.receiptNo || "",
      },
      upiId: docData.upiId || "",
      showDigitalSignature: true,
      principalName: docData.principalName || "Principal",
      principalSignatureUrl: docData.principalSignatureUrl || "",
      accountantName: docData.accountantName || "",
      accountantSignatureUrl: docData.accountantSignatureUrl || "",
      managerName: docData.managerName || "",
      managerSignatureUrl: docData.managerSignatureUrl || "",
      signatoryTitle: docData.signatoryTitle || docData.principalName || "Principal",
      signatoryMode: "both",
    };
    return generateDpsReceiptHtml(dpsData, { layout: "full" });
  }, [type, docData]);

  const effectiveLogo = getSavedSchoolLogo(docData?.schoolLogoUrl, docData?.schoolId);

  const docTypeLabelMap: Record<string, string> = {
    idcard:
      docData?.cardRole === "admin"
        ? "Official School Head / Admin ID Card"
        : docData?.cardRole === "teacher"
        ? "Official Faculty / Staff ID Card"
        : "Official Student ID Card",
    driver_id: "Official Transport Bus Driver ID Card",
    marksheet: "Official Academic Marksheet",
    fee_receipt: docData?.isDueDemand ? "Official Fee Demand Slip" : "Official School Fee Receipt",
    admit_card: "Official Examination Admit Card",
    certificate: docData?.certificateType || "Official School Certificate",
    admission: "Official Admission Confirmation & Fee Slip",
    gate_pass:
      docData?.passKind === "student_exit"
        ? "Official Student Gate Exit Pass"
        : "Official Campus Visitor Gate Pass",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto animate-pulse">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-slate-300">Verifying Official Document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-6 flex flex-col items-center print:bg-white print:p-0">
      {/* Top Action Bar (hidden during print) */}
      <div className="w-full max-w-4xl mb-4 flex items-center justify-between gap-2 print:hidden">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-300 hover:text-white font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        ) : (
          <a
            href="/"
            className="flex items-center gap-1.5 text-blue-300 hover:text-white font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Open School App
          </a>
        )}

        {docData?.officialVerified && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        )}
      </div>

      {/* Invalid / Empty State */}
      {!docData?.officialVerified ? (
        <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-xl text-slate-100 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
              {onBack ? (
                <FileCheck2 className="w-7 h-7 text-amber-400" />
              ) : (
                <AlertCircle className="w-7 h-7 text-rose-400" />
              )}
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-base text-white">
                {onBack
                  ? "QR Document Verification Portal Ready"
                  : "अमान्य या अधूरा सत्यापन कोड (Invalid Verification QR)"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {onBack
                  ? "स्कूल के किसी भी दस्तावेज़ — ID Card (Student / Teacher / Admin / Driver), Marksheet, Fee Receipt, Admit Card, Certificate, Admission Slip या Gate Pass — का QR कोड फोन कैमरे या Google Lens से स्कैन करने पर यह पेज सीधे Chrome ब्राउज़र में असली दस्तावेज़ VERIFIED वॉटरमार्क के साथ दिखाता है।"
                  : "इस QR कोड में वैध दस्तावेज़ रिकॉर्ड नहीं मिला। कृपया स्कूल द्वारा जारी आधिकारिक दस्तावेज़ का QR कोड स्कैन करें।"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Compact Verified Status Strip (screen only) */}
          <div className="w-full max-w-4xl bg-emerald-950/90 border border-emerald-500/50 rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-2 shadow-lg text-emerald-100 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-white">
                    {docTypeLabelMap[type] || "Official School Document"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    ✓ VERIFIED GENUINE
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/90">
                  {docData.school} &bull; Verified in Chrome Browser
                </p>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              1. REAL FEE RECEIPT / DEMAND SLIP (Exact DPS Layout + Watermark)
             ════════════════════════════════════════════════════════════════ */}
          {type === "fee_receipt" && (
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-3 sm:p-5 relative overflow-hidden border-2 border-slate-300 print:border-0 print:shadow-none print:p-0">
              <style>{SCOPED_DPS_CSS}</style>
              <div className="relative dps-receipt-scope">
                <div dangerouslySetInnerHTML={{ __html: renderedFeeReceiptHtml }} />
                <VerifiedWatermarkOverlay
                  label="VERIFIED"
                  docNo={docData.receiptNo ? `#${docData.receiptNo}` : undefined}
                />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              2. REAL ID CARD (Student / Teacher / Admin) + VERIFIED WATERMARK
             ════════════════════════════════════════════════════════════════ */}
          {type === "idcard" && (
            <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-5 print:gap-4">
              {/* Front Side of Real CR80 Portrait ID Card */}
              <div className="relative w-[330px] bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border-[3px] border-slate-900 print:shadow-none">
                {/* School Banner Header */}
                <div
                  className={`p-3.5 text-white text-center relative border-b-4 border-amber-400 ${
                    docData.cardRole === "admin"
                      ? "bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900"
                      : docData.cardRole === "teacher"
                      ? "bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900"
                      : "bg-gradient-to-r from-indigo-950 via-blue-900 to-indigo-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <SchoolLogoImg
                      logoUrl={effectiveLogo}
                      schoolName={docData.school}
                      className="w-11 h-11"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-black uppercase tracking-tight text-amber-300 leading-tight line-clamp-2">
                        {docData.school || "Registered School"}
                      </h2>
                      {docData.schoolAddress && (
                        <p className="text-[9px] text-slate-200 leading-tight mt-0.5 line-clamp-1">
                          {docData.schoolAddress}
                        </p>
                      )}
                      <p className="text-[8.5px] text-amber-200/90 font-bold mt-0.5">
                        {docData.schoolAffiliation
                          ? `Aff: ${docData.schoolAffiliation}`
                          : docData.schoolCode
                          ? `Code: ${docData.schoolCode}`
                          : "Official Campus"}
                        {docData.schoolPhone ? ` • ${docData.schoolPhone}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-widest">
                    {docData.cardRole === "admin"
                      ? "SCHOOL HEAD • ADMIN ID CARD"
                      : docData.cardRole === "teacher"
                      ? "FACULTY / STAFF ID CARD"
                      : `STUDENT IDENTITY CARD • ${docData.session || getDynamicAcademicSessionLabel()}`}
                  </div>
                </div>

                {/* Photo & Name */}
                <div className="p-4 text-center space-y-2.5 bg-gradient-to-b from-slate-50 to-white">
                  <div className="w-24 h-28 mx-auto rounded-xl border-[3px] border-indigo-900 bg-slate-100 overflow-hidden shadow-md flex items-center justify-center">
                    {docData.photoUrl ? (
                      <img
                        src={docData.photoUrl}
                        alt={docData.student}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-indigo-950 uppercase tracking-tight leading-tight">
                      {docData.student}
                    </h3>
                    <p className="text-xs font-extrabold text-indigo-700 mt-0.5">
                      {docData.cardRole === "student"
                        ? `${docData.class || "Student"} • Roll #${docData.roll || "—"}`
                        : docData.designation || docData.class || "Faculty"}
                    </p>
                  </div>

                  {/* Structured ID Details Table */}
                  <div className="text-[11px] text-left bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                    {docData.regNo && docData.regNo !== "—" && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 font-bold">
                          {docData.cardRole === "student" ? "Adm / Reg No:" : "Staff ID:"}
                        </span>
                        <span className="font-black text-slate-900">{docData.regNo}</span>
                      </div>
                    )}
                    {docData.fatherName && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 font-bold">Father's Name:</span>
                        <span className="font-bold text-slate-800 text-right">{docData.fatherName}</span>
                      </div>
                    )}
                    {docData.motherName && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 font-bold">Mother's Name:</span>
                        <span className="font-bold text-slate-800 text-right">{docData.motherName}</span>
                      </div>
                    )}
                    {docData.dob && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 font-bold">Date of Birth:</span>
                        <span className="font-bold text-slate-800">{docData.dob}</span>
                      </div>
                    )}
                    {docData.bloodGroup && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 font-bold">Blood Group:</span>
                        <span className="font-black text-rose-700">{docData.bloodGroup}</span>
                      </div>
                    )}
                    {docData.phone && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 font-bold">Mobile / Contact:</span>
                        <span className="font-bold text-slate-900">{docData.phone}</span>
                      </div>
                    )}
                    {docData.address && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 font-bold shrink-0">Address:</span>
                        <span className="font-semibold text-slate-700 text-right line-clamp-2">
                          {docData.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: QR + Principal Signature */}
                  <div className="pt-2 border-t border-slate-200 flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-white border border-slate-300 rounded-lg">
                        <QRCode value={window.location.href} size={50} level="L" />
                      </div>
                      <div className="text-left">
                        <span className="text-[8px] font-black text-emerald-700 uppercase block">
                          Verified Digital ID
                        </span>
                        <span className="text-[8px] text-slate-500 font-semibold block">
                          Scan for Record
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {docData.principalSignatureUrl ? (
                        <img
                          src={docData.principalSignatureUrl}
                          alt="Principal Sign"
                          className="h-7 object-contain ml-auto mb-0.5"
                        />
                      ) : (
                        <div className="h-5" />
                      )}
                      <div className="border-t border-slate-400 pt-0.5">
                        <p className="text-[9px] font-black text-slate-900">
                          {docData.principalName || "Principal"}
                        </p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">
                          Issuing Authority
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <VerifiedWatermarkOverlay
                  label="VERIFIED"
                  docNo={docData.regNo && docData.regNo !== "—" ? docData.regNo : docData.roll}
                />
              </div>

              {/* Back Side Summary Card */}
              <div className="relative w-[330px] bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl border-2 border-slate-700 p-4 space-y-3 print:shadow-none">
                <div className="border-b-2 border-indigo-900 pb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">
                      Official Card Back &amp; Terms
                    </p>
                    <p className="text-[9px] text-slate-500 font-semibold">{docData.school}</p>
                  </div>
                  <SchoolLogoImg
                    logoUrl={effectiveLogo}
                    schoolName={docData.school}
                    className="w-8 h-8"
                  />
                </div>

                <ul className="text-[10.5px] text-slate-700 space-y-1.5 list-disc pl-4 leading-snug">
                  <li>This identity card is the property of <b>{docData.school}</b>.</li>
                  <li>Must be carried daily inside campus and during school transport.</li>
                  <li>Attendance &amp; portal QR login are active on this verified card.</li>
                  <li>If found, kindly return to the school office immediately.</li>
                </ul>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-[10.5px] space-y-1">
                  <div className="font-black text-indigo-950 uppercase text-[9.5px]">
                    School Office Helpline
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Phone className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                    <span>{docData.schoolPhone || "Contact School Office"}</span>
                  </div>
                  {docData.schoolAddress && (
                    <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-indigo-700 shrink-0 mt-0.5" />
                      <span>{docData.schoolAddress}</span>
                    </div>
                  )}
                </div>

                <VerifiedWatermarkOverlay label="VERIFIED" />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              3. REAL DRIVER ID CARD + VERIFIED WATERMARK
             ════════════════════════════════════════════════════════════════ */}
          {type === "driver_id" && (
            <div className="relative w-full max-w-sm bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border-[3px] border-amber-500 print:shadow-none">
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-4 border-b-4 border-amber-400">
                <div className="flex items-center gap-3">
                  <SchoolLogoImg
                    logoUrl={effectiveLogo}
                    schoolName={docData.school}
                    className="w-12 h-12"
                  />
                  <div>
                    <h2 className="text-sm font-black uppercase text-amber-300 leading-tight">
                      {docData.school}
                    </h2>
                    <p className="text-[10px] text-slate-300 font-semibold">
                      Official Transport Duty Pass &bull; {docData.schoolCode || "TRANSPORT"}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest">
                  <Bus className="w-3.5 h-3.5" /> Authorized Bus Driver ID
                </div>
              </div>

              <div className="p-5 space-y-4 text-center bg-gradient-to-b from-amber-50/40 to-white">
                <div className="w-20 h-20 rounded-2xl bg-amber-100 border-2 border-amber-500 mx-auto flex items-center justify-center shadow">
                  <Bus className="w-10 h-10 text-amber-700" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-950 uppercase">{docData.student}</h3>
                  <span className="inline-block mt-1 px-3 py-1 rounded-lg bg-slate-900 text-amber-300 text-xs font-black tracking-wider">
                    BUS NO: {docData.busNumber || "—"}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-left space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 font-bold">Assigned Route:</span>
                    <span className="font-black text-slate-900 text-right">{docData.route || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 font-bold">Driver Mobile:</span>
                    <span className="font-black text-emerald-700">{docData.phone || "—"}</span>
                  </div>
                  {docData.schoolPhone && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-bold">School Helpline:</span>
                      <span className="font-bold text-slate-800">{docData.schoolPhone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="p-1 bg-white border border-slate-300 rounded-lg">
                    <QRCode value={window.location.href} size={54} level="L" />
                  </div>
                  <div className="text-right">
                    {docData.principalSignatureUrl && (
                      <img
                        src={docData.principalSignatureUrl}
                        alt="Principal Sign"
                        className="h-7 object-contain ml-auto mb-0.5"
                      />
                    )}
                    <p className="text-[10px] font-black text-slate-900">
                      {docData.principalName || "Transport / Principal"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Authorized Seal</p>
                  </div>
                </div>
              </div>

              <VerifiedWatermarkOverlay label="VERIFIED" docNo={docData.busNumber} />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              4. REAL ACADEMIC MARKSHEET + VERIFIED WATERMARK
             ════════════════════════════════════════════════════════════════ */}
          {type === "marksheet" && (
            <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border-[4px] border-indigo-950 p-4 sm:p-6 print:shadow-none print:rounded-none">
              <div className="border-2 border-amber-500/80 rounded-xl p-3 sm:p-5 space-y-4">
                {/* School Crest & Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-indigo-950 pb-3.5">
                  <SchoolLogoImg
                    logoUrl={effectiveLogo}
                    schoolName={docData.school}
                    className="w-16 h-16"
                  />
                  <div className="text-center flex-1">
                    <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-indigo-950 leading-tight">
                      {docData.school}
                    </h1>
                    {docData.schoolAddress && (
                      <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                        {docData.schoolAddress}
                        {docData.schoolPhone ? ` • Ph: ${docData.schoolPhone}` : ""}
                      </p>
                    )}
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                      {docData.schoolAffiliation
                        ? `Affiliation: ${docData.schoolAffiliation}`
                        : docData.schoolCode
                        ? `School Code: ${docData.schoolCode}`
                        : "Recognized Academic Institution"}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-amber-300 text-[10px] font-black uppercase">
                      {docData.session || getDynamicAcademicSessionLabel()}
                    </span>
                    {docData.wing && (
                      <span className="text-[10px] font-bold text-slate-600 mt-1">{docData.wing}</span>
                    )}
                  </div>
                </div>

                {/* Statement of Marks Banner */}
                <div className="bg-gradient-to-r from-indigo-950 via-blue-900 to-indigo-950 text-amber-300 text-center py-2 px-4 rounded-lg shadow-sm">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest">
                    STATEMENT OF MARKS &bull; {docData.examName || "ANNUAL EXAMINATION"}
                  </h2>
                </div>

                {/* Student Info + Photo */}
                <div className="flex flex-col-reverse sm:flex-row items-start justify-between gap-4 bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 flex-1 w-full">
                    <div>
                      <span className="text-slate-500 font-bold">Student Name: </span>
                      <span className="font-black text-slate-950 uppercase">{docData.student}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Roll No: </span>
                      <span className="font-black text-indigo-800">{docData.roll || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Father's Name: </span>
                      <span className="font-bold text-slate-900">{docData.fatherName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Reg / Adm No: </span>
                      <span className="font-black text-slate-900">{docData.regNo || "—"}</span>
                    </div>
                    {docData.motherName && (
                      <div>
                        <span className="text-slate-500 font-bold">Mother's Name: </span>
                        <span className="font-bold text-slate-900">{docData.motherName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 font-bold">Class &amp; Sec: </span>
                      <span className="font-black text-indigo-900">
                        {docData.class}
                        {docData.section ? ` (${docData.section})` : ""}
                      </span>
                    </div>
                    {docData.attendance && (
                      <div>
                        <span className="text-slate-500 font-bold">Attendance: </span>
                        <span className="font-bold text-emerald-800">{docData.attendance} Days</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 font-bold">Result Status: </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black uppercase text-[10px]">
                        {docData.status || "PASSED"}
                      </span>
                    </div>
                  </div>

                  <div className="w-20 h-24 rounded-lg border-2 border-indigo-900 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-sm mx-auto sm:mx-0">
                    {docData.photoUrl ? (
                      <img src={docData.photoUrl} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Subject-wise Marks Table */}
                {Array.isArray(docData.subjects) && docData.subjects.length > 0 && (
                  <div className="overflow-x-auto border border-slate-300 rounded-xl">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-950 text-white text-left">
                          <th className="py-2 px-2.5 font-black uppercase text-[10px] w-10">#</th>
                          <th className="py-2 px-2.5 font-black uppercase text-[10px]">Subject</th>
                          <th className="py-2 px-2.5 font-black uppercase text-[10px] text-center">Max Marks</th>
                          <th className="py-2 px-2.5 font-black uppercase text-[10px] text-center">Obtained</th>
                          <th className="py-2 px-2.5 font-black uppercase text-[10px] text-center">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {docData.subjects.map((sub: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                            <td className="py-1.5 px-2.5 font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-bold text-slate-900 uppercase">
                              {sub.name || sub.subject}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-semibold text-slate-700">
                              {sub.max ?? 100}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-black text-indigo-900">
                              {sub.obt ?? sub.obtained ?? 0}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-black text-emerald-700">
                              {sub.grade || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Overall Performance & Ranks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Grand Total</span>
                    <span className="text-base font-black text-indigo-950">{docData.total || "—"}</span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Percentage / GPA</span>
                    <span className="text-base font-black text-indigo-950">
                      {docData.pct ? `${docData.pct}%` : docData.gpa || "—"}
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Final Grade</span>
                    <span className="text-base font-black text-emerald-700">{docData.grade || "—"}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Rank Standing</span>
                    <span className="text-xs font-black text-amber-900">
                      {docData.classRank ? `Class: ${docData.classRank}` : docData.status || "Verified"}
                      {docData.sectionRank ? ` • Sec: ${docData.sectionRank}` : ""}
                    </span>
                  </div>
                </div>

                {/* Footer: QR + 3 Authority Signatures */}
                <div className="pt-4 border-t-2 border-indigo-950 flex flex-wrap items-end justify-between gap-4 text-[11px]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-white border border-slate-300 rounded-lg">
                      <QRCode value={window.location.href} size={52} level="L" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-xs">Verified Result</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Date: {docData.date}</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="h-7" />
                    <div className="border-t border-slate-500 px-3 pt-0.5">
                      <p className="font-bold text-slate-900">{docData.teacherName || "Class Teacher"}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Class Teacher</p>
                    </div>
                  </div>

                  <div className="text-center">
                    {docData.examControllerSignatureUrl ? (
                      <img
                        src={docData.examControllerSignatureUrl}
                        alt="Exam Controller"
                        className="h-7 object-contain mx-auto"
                      />
                    ) : (
                      <div className="h-7" />
                    )}
                    <div className="border-t border-slate-500 px-3 pt-0.5">
                      <p className="font-bold text-slate-900">
                        {docData.examControllerName || "Exam Controller"}
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Exam Controller</p>
                    </div>
                  </div>

                  <div className="text-center">
                    {docData.principalSignatureUrl ? (
                      <img
                        src={docData.principalSignatureUrl}
                        alt="Principal"
                        className="h-7 object-contain mx-auto"
                      />
                    ) : (
                      <div className="h-7" />
                    )}
                    <div className="border-t border-slate-500 px-3 pt-0.5">
                      <p className="font-black text-indigo-950">{docData.principalName || "Principal"}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Principal &amp; Seal</p>
                    </div>
                  </div>
                </div>
              </div>

              <VerifiedWatermarkOverlay label="VERIFIED" docNo={docData.regNo} />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              5. REAL ADMIT CARD / HALL TICKET + VERIFIED WATERMARK
             ════════════════════════════════════════════════════════════════ */}
          {type === "admit_card" && (
            <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border-[3px] border-slate-900 p-5 sm:p-6 space-y-4 print:shadow-none print:rounded-none">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-3">
                <SchoolLogoImg
                  logoUrl={effectiveLogo}
                  schoolName={docData.school}
                  className="w-16 h-16"
                />
                <div className="text-center flex-1">
                  <h1 className="text-lg sm:text-2xl font-black uppercase text-slate-950 leading-tight">
                    {docData.school}
                  </h1>
                  {docData.schoolAddress && (
                    <p className="text-[11px] font-semibold text-slate-600">
                      {docData.schoolAddress}
                      {docData.schoolPhone ? ` • Ph: ${docData.schoolPhone}` : ""}
                    </p>
                  )}
                  <div className="mt-1.5 inline-block px-4 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[11px] font-black uppercase tracking-widest">
                    ADMIT CARD / PROVISIONAL HALL TICKET
                  </div>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <span className="text-[10px] font-black text-indigo-800 uppercase block">
                    Session {docData.session}
                  </span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">
                    {docData.examName}
                  </span>
                </div>
              </div>

              {/* Candidate Particulars */}
              <div className="flex flex-col-reverse sm:flex-row items-start justify-between gap-4 bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 flex-1 w-full">
                  <div>
                    <span className="text-slate-500 font-bold">Candidate Name: </span>
                    <span className="font-black text-slate-950 uppercase">{docData.student}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Roll No: </span>
                    <span className="font-black text-indigo-800 text-sm">{docData.roll}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Father's Name: </span>
                    <span className="font-bold text-slate-900">{docData.fatherName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Admission No: </span>
                    <span className="font-black text-slate-900">{docData.regNo || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Class: </span>
                    <span className="font-black text-indigo-900">{docData.class}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Exam Name: </span>
                    <span className="font-bold text-slate-900">{docData.examName}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-bold">Examination Center: </span>
                    <span className="font-black text-slate-900">{docData.centerName}</span>
                  </div>
                </div>

                <div className="w-20 h-24 rounded-lg border-2 border-slate-900 bg-white overflow-hidden shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                  {docData.photoUrl ? (
                    <img src={docData.photoUrl} alt="Candidate" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Exam Timetable */}
              {Array.isArray(docData.timetable) && docData.timetable.length > 0 && (
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-left">
                        <th className="py-2 px-3 font-black uppercase text-[10px]">Subject</th>
                        <th className="py-2 px-3 font-black uppercase text-[10px]">Date</th>
                        <th className="py-2 px-3 font-black uppercase text-[10px]">Timing</th>
                        <th className="py-2 px-3 font-black uppercase text-[10px]">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {docData.timetable.map((row: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{row.subject}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-700">{row.date}</td>
                          <td className="py-1.5 px-3 font-semibold text-indigo-800">{row.time}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-700">{row.room || "Room 1"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-4 border-t-2 border-slate-900 flex items-end justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white border border-slate-300 rounded-lg">
                    <QRCode value={window.location.href} size={50} level="L" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">Verified Hall Ticket</span>
                </div>
                <div className="text-center">
                  {docData.examControllerSignatureUrl && (
                    <img
                      src={docData.examControllerSignatureUrl}
                      alt="Controller"
                      className="h-7 object-contain mx-auto"
                    />
                  )}
                  <div className="border-t border-slate-500 px-3 pt-0.5">
                    <p className="font-bold text-slate-900">
                      {docData.examController || docData.examControllerName || "Exam Controller"}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Controller of Exams</p>
                  </div>
                </div>
                <div className="text-center">
                  {docData.principalSignatureUrl && (
                    <img
                      src={docData.principalSignatureUrl}
                      alt="Principal"
                      className="h-7 object-contain mx-auto"
                    />
                  )}
                  <div className="border-t border-slate-500 px-3 pt-0.5">
                    <p className="font-black text-slate-950">
                      {docData.principalName || docData.principalTitle || "Principal"}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Principal</p>
                  </div>
                </div>
              </div>

              <VerifiedWatermarkOverlay label="VERIFIED" docNo={docData.roll} />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              6. REAL CERTIFICATE (TC / Character / Merit / Bonafide / Custom)
             ════════════════════════════════════════════════════════════════ */}
          {type === "certificate" && (
            <div className="relative w-full max-w-3xl bg-[#fffdf7] text-slate-900 rounded-2xl shadow-2xl overflow-hidden border-[6px] border-double border-amber-700 p-5 sm:p-8 print:shadow-none print:rounded-none">
              <div className="border-2 border-indigo-950/80 rounded-xl p-5 sm:p-8 text-center space-y-5 relative">
                {/* School Header */}
                <div className="flex flex-col items-center space-y-2">
                  <SchoolLogoImg
                    logoUrl={effectiveLogo}
                    schoolName={docData.school}
                    className="w-16 h-16"
                  />
                  <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-indigo-950">
                    {docData.school}
                  </h1>
                  {docData.schoolAddress && (
                    <p className="text-xs font-semibold text-slate-600">{docData.schoolAddress}</p>
                  )}
                  <div className="flex items-center justify-between w-full text-[11px] font-bold text-slate-600 border-y border-amber-300 py-1.5 mt-2">
                    <span>Cert / Dispatch No: <b className="text-indigo-950">{docData.certificateNo || "—"}</b></span>
                    <span>Session: <b className="text-indigo-950">{docData.session}</b></span>
                    <span>Date: <b className="text-indigo-950">{docData.issueDate || docData.date}</b></span>
                  </div>
                </div>

                {/* Certificate Ribbon Title */}
                <div className="inline-block px-6 py-1.5 rounded-full bg-gradient-to-r from-indigo-950 via-blue-900 to-indigo-950 text-amber-300 text-sm sm:text-base font-black uppercase tracking-widest shadow">
                  {docData.certificateType || "OFFICIAL CERTIFICATE"}
                </div>

                {/* Formal Citation Body */}
                <div className="max-w-2xl mx-auto font-serif text-sm sm:text-base text-slate-800 leading-relaxed space-y-3">
                  {docData.customBodyText ? (
                    <p>{docData.customBodyText}</p>
                  ) : (
                    <p>
                      This is to officially certify that{" "}
                      <strong className="text-indigo-950 underline decoration-amber-500 decoration-2 underline-offset-4">
                        {docData.student}
                      </strong>
                      {docData.fatherName ? (
                        <>
                          , Son/Daughter of <strong>{docData.fatherName}</strong>
                        </>
                      ) : null}
                      , Class <strong>{docData.class || "—"}</strong>, Roll No{" "}
                      <strong>{docData.roll || "—"}</strong>, Admission No{" "}
                      <strong>{docData.regNo || "—"}</strong>, is a bona fide &amp; verified scholar of{" "}
                      <strong>{docData.school}</strong> during academic session{" "}
                      <strong>{docData.session}</strong>.
                    </p>
                  )}

                  {(docData.rank || docData.percentage || docData.division || docData.reason || docData.remarks) && (
                    <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 text-xs font-sans text-slate-800 space-y-1">
                      {(docData.rank || docData.percentage || docData.division) && (
                        <p className="font-bold text-indigo-950">
                          {docData.rank ? `Rank / Position: ${docData.rank}  ` : ""}
                          {docData.percentage ? `• Score: ${docData.percentage}%  ` : ""}
                          {docData.division ? `• Division: ${docData.division}` : ""}
                        </p>
                      )}
                      {docData.reason && <p><b>Reason / Subject:</b> {docData.reason}</p>}
                      {docData.remarks && <p><b>Conduct &amp; Remarks:</b> {docData.remarks}</p>}
                    </div>
                  )}
                </div>

                {/* Seal + QR + Principal Signature */}
                <div className="pt-6 border-t border-amber-300 flex items-end justify-between gap-4 text-xs text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-white border border-slate-300 rounded-lg">
                      <QRCode value={window.location.href} size={54} level="L" />
                    </div>
                    <div>
                      <p className="font-black text-emerald-700 text-[11px]">DIGITALLY VERIFIED</p>
                      <p className="text-[10px] text-slate-500">Institutional Registry</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex w-16 h-16 rounded-full border-2 border-amber-600 bg-amber-100/80 items-center justify-center text-center shadow-inner">
                    <Award className="w-8 h-8 text-amber-700" />
                  </div>

                  <div className="text-right">
                    {docData.principalSignatureUrl && (
                      <img
                        src={docData.principalSignatureUrl}
                        alt="Principal Signature"
                        className="h-9 object-contain ml-auto mb-1"
                      />
                    )}
                    <div className="border-t border-slate-700 pt-1 px-2">
                      <p className="font-serif font-black text-indigo-950 text-sm">
                        {docData.principalName || "Principal"}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Authorized Signatory &amp; Seal
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <VerifiedWatermarkOverlay label="VERIFIED" docNo={docData.certificateNo} />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              7. REAL ADMISSION CONFIRMATION & RECEIPT + VERIFIED WATERMARK
             ════════════════════════════════════════════════════════════════ */}
          {type === "admission" && (
            <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border-[3px] border-slate-900 p-5 sm:p-6 space-y-4 print:shadow-none print:rounded-none">
              <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-3">
                <SchoolLogoImg
                  logoUrl={effectiveLogo}
                  schoolName={docData.school}
                  className="w-14 h-14"
                />
                <div className="text-center flex-1">
                  <h1 className="text-lg sm:text-2xl font-black uppercase text-slate-950">
                    {docData.school}
                  </h1>
                  {docData.schoolAddress && (
                    <p className="text-[11px] font-semibold text-slate-600">{docData.schoolAddress}</p>
                  )}
                  <div className="mt-1 inline-block px-4 py-0.5 rounded-full bg-indigo-950 text-amber-300 text-[11px] font-black uppercase tracking-widest">
                    ADMISSION CONFIRMATION &amp; FEE RECEIPT
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 flex-1">
                  <div>
                    <span className="text-slate-500 font-bold">Student Name: </span>
                    <span className="font-black text-slate-950 uppercase">{docData.student}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Admission No: </span>
                    <span className="font-black text-indigo-800">{docData.regNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Father's Name: </span>
                    <span className="font-bold text-slate-900">{docData.fatherName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Receipt No: </span>
                    <span className="font-black text-slate-900">{docData.receiptNo}</span>
                  </div>
                  {docData.motherName && (
                    <div>
                      <span className="text-slate-500 font-bold">Mother's Name: </span>
                      <span className="font-bold text-slate-900">{docData.motherName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 font-bold">Admitted Class: </span>
                    <span className="font-black text-indigo-900">{docData.class}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">DOB / Gender: </span>
                    <span className="font-bold text-slate-800">
                      {docData.dob || "—"} {docData.gender ? `(${docData.gender})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Admission Type: </span>
                    <span className="font-bold text-emerald-700">{docData.admissionType}</span>
                  </div>
                </div>

                <div className="w-20 h-24 rounded-lg border-2 border-slate-900 bg-white overflow-hidden shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                  {docData.photoUrl ? (
                    <img src={docData.photoUrl} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
              </div>

              {Array.isArray(docData.items) && docData.items.length > 0 && (
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-left">
                        <th className="py-2 px-3 font-black uppercase text-[10px]">Fee Particulars</th>
                        <th className="py-2 px-3 font-black uppercase text-[10px] text-right">Due (₹)</th>
                        <th className="py-2 px-3 font-black uppercase text-[10px] text-right">Conc (₹)</th>
                        <th className="py-2 px-3 font-black uppercase text-[10px] text-right">Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {docData.items.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{it.description}</td>
                          <td className="py-1.5 px-3 text-right">₹{Number(it.due || 0).toLocaleString("en-IN")}</td>
                          <td className="py-1.5 px-3 text-right text-amber-700">₹{Number(it.con || 0).toLocaleString("en-IN")}</td>
                          <td className="py-1.5 px-3 text-right font-black text-emerald-700">₹{Number(it.paid || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Payable</span>
                  <span className="text-sm font-black text-slate-900">₹{Number(docData.totalDue || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Paid</span>
                  <span className="text-sm font-black text-emerald-700">₹{Number(docData.totalPaid || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Balance Due</span>
                  <span className="text-sm font-black text-rose-700">₹{Number(docData.balanceDue || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Mode / Date</span>
                  <span className="text-xs font-black text-indigo-950">{docData.paymentMode} • {docData.date}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-900 flex items-end justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white border border-slate-300 rounded-lg">
                    <QRCode value={window.location.href} size={50} level="L" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">Verified Admission</span>
                </div>
                <div className="text-right">
                  {docData.principalSignatureUrl && (
                    <img
                      src={docData.principalSignatureUrl}
                      alt="Principal"
                      className="h-7 object-contain ml-auto mb-0.5"
                    />
                  )}
                  <p className="font-black text-slate-950">{docData.principalName || "Principal"}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">
                    Admission Desk ({docData.collectorName})
                  </p>
                </div>
              </div>

              <VerifiedWatermarkOverlay label="VERIFIED" docNo={docData.regNo} />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              8. REAL SECURITY GATE / EXIT PASS + VERIFIED WATERMARK
             ════════════════════════════════════════════════════════════════ */}
          {type === "gate_pass" && (
            <div className="relative w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border-[3px] border-slate-900 p-5 space-y-4 print:shadow-none">
              <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3">
                <SchoolLogoImg
                  logoUrl={effectiveLogo}
                  schoolName={docData.school}
                  className="w-12 h-12"
                />
                <div>
                  <h2 className="text-sm font-black uppercase text-slate-950">{docData.school}</h2>
                  <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                    {docData.passKind === "student_exit"
                      ? "OFFICIAL STUDENT EARLY EXIT GATE PASS"
                      : "OFFICIAL CAMPUS VISITOR SECURITY PASS"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs">
                <span className="font-black tracking-wider">PASS NO: {docData.passNumber}</span>
                <span className="text-amber-300 font-bold">{docData.timeStamp}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-bold">
                    {docData.passKind === "student_exit" ? "Student Name:" : "Visitor Name:"}
                  </span>
                  <span className="font-black text-slate-950">{docData.student}</span>
                </div>
                {docData.phone && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 font-bold">Mobile No:</span>
                    <span className="font-bold text-slate-900">{docData.phone}</span>
                  </div>
                )}
                {docData.purpose && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 font-bold">Purpose:</span>
                    <span className="font-bold text-indigo-900 text-right">{docData.purpose}</span>
                  </div>
                )}
                {docData.personToMeet && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 font-bold">Person / Escort:</span>
                    <span className="font-bold text-slate-900 text-right">{docData.personToMeet}</span>
                  </div>
                )}
                {docData.reason && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 font-bold">Remarks / Reason:</span>
                    <span className="font-semibold text-slate-800 text-right">{docData.reason}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="p-1 bg-white border border-slate-300 rounded-lg">
                  <QRCode value={window.location.href} size={56} level="L" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-700 uppercase">Gate Security Verified</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Valid for Single Campus Exit/Entry</p>
                </div>
              </div>

              <VerifiedWatermarkOverlay label="VERIFIED" docNo={docData.passNumber} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
