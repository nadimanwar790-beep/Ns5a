// Shared QR Verification URL Builders & Backwards-Compatible Token Parsers
// Ensures EVERY QR code opens a real clickable HTTPS link in Chrome (showing the real document with VERIFIED watermark),
// while 100% preserving ID Card Attendance scanning & App QR Login tokens.

export type VerifyDocumentType =
  | "idcard"
  | "driver_id"
  | "marksheet"
  | "fee_receipt"
  | "admit_card"
  | "certificate"
  | "admission"
  | "gate_pass";

export function getQrBaseOrigin(): string {
  try {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
  } catch {}
  return "https://nsta.app";
}

function cleanPart(val: unknown): string {
  return String(val ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function encPart(val: unknown): string {
  return encodeURIComponent(cleanPart(val));
}

export function safeDecodeUriPart(val: unknown): string {
  const s = String(val ?? "");
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export interface StudentIdQrInput {
  schoolId?: string;
  studentId?: string;
  rollNo?: string;
  classId?: string;
  studentName?: string;
  admissionNo?: string;
  phone?: string;
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  dob?: string;
  address?: string;
  monthlyFee?: number | string;
  className?: string;
  schoolName?: string;
}

export function buildStudentIdToken(input: StudentIdQrInput): string {
  return `NSTA-SCHOOL:${[
    encPart(input.schoolId || ""),
    encPart(input.studentId || ""),
    encPart(input.rollNo || ""),
    encPart(input.classId || ""),
    encPart(cleanPart(input.studentName).slice(0, 32)),
    encPart(input.admissionNo || ""),
    encPart(input.phone || ""),
    encPart(cleanPart(input.fatherName).slice(0, 28)),
    encPart(cleanPart(input.motherName).slice(0, 28)),
    encPart(input.bloodGroup || ""),
    encPart(input.dob || ""),
    encPart(cleanPart(input.address).slice(0, 40)),
    encPart(input.monthlyFee ?? ""),
    encPart(cleanPart(input.className).slice(0, 24)),
    encPart(cleanPart(input.schoolName).slice(0, 48)),
  ].join(":")}`;
}

export function buildStudentIdCardQrUrl(input: StudentIdQrInput): string {
  const origin = getQrBaseOrigin();
  const token = buildStudentIdToken(input);
  const params = new URLSearchParams();
  params.set("verify", "doc");
  params.set("type", "idcard");
  if (input.schoolId) params.set("s", cleanPart(input.schoolId));
  if (input.studentId) params.set("u", cleanPart(input.studentId));
  return `${origin}/?${params.toString()}#${token}`;
}

export interface StaffIdQrInput {
  isAdmin?: boolean;
  schoolId?: string;
  staffId?: string;
  empId?: string;
  department?: string;
  name?: string;
  admNo?: string;
  phone?: string;
  fatherName?: string;
  motherName?: string;
  bloodGroup?: string;
  dob?: string;
  address?: string;
  designation?: string;
  schoolName?: string;
}

export function buildStaffIdToken(input: StaffIdQrInput): string {
  return `NSTA-SCHOOL-STAFF:${[
    encPart(input.schoolId || "school"),
    encPart(input.staffId || ""),
    encPart(input.empId || input.staffId || ""),
    encPart(cleanPart(input.department).slice(0, 32)),
    encPart(cleanPart(input.name).slice(0, 36)),
    encPart(input.admNo || ""),
    encPart(input.phone || ""),
    encPart(cleanPart(input.fatherName).slice(0, 28)),
    encPart(cleanPart(input.motherName).slice(0, 28)),
    encPart(input.bloodGroup || ""),
    encPart(input.dob || ""),
    encPart(cleanPart(input.address).slice(0, 40)),
    encPart("0"),
    encPart(cleanPart(input.designation).slice(0, 32)),
    encPart(cleanPart(input.schoolName).slice(0, 48)),
  ].join(":")}`;
}

export function buildStaffIdCardQrUrl(input: StaffIdQrInput): string {
  const origin = getQrBaseOrigin();
  const token = buildStaffIdToken(input);
  const params = new URLSearchParams();
  params.set("verify", "doc");
  params.set("type", "idcard");
  params.set("role", input.isAdmin ? "admin" : "staff");
  if (input.schoolId) params.set("s", cleanPart(input.schoolId));
  if (input.staffId) params.set("u", cleanPart(input.staffId));
  return `${origin}/?${params.toString()}#${token}`;
}

export interface DriverIdQrInput {
  schoolId?: string;
  busId?: string;
  busNumber?: string;
  route?: string;
  driverName?: string;
  driverPhone?: string;
  schoolCode?: string;
  schoolName?: string;
}

export function buildDriverIdToken(input: DriverIdQrInput): string {
  return `NSTA-SCHOOL-DRIVER:${[
    encPart(input.schoolId || ""),
    encPart(input.busId || ""),
    encPart(input.busNumber || ""),
    encPart(cleanPart(input.route).slice(0, 40)),
    encPart(cleanPart(input.driverName).slice(0, 36)),
    encPart(input.driverPhone || ""),
    encPart(input.schoolCode || ""),
    encPart(cleanPart(input.schoolName).slice(0, 48)),
  ].join(":")}`;
}

export function buildDriverIdCardQrUrl(input: DriverIdQrInput): string {
  const origin = getQrBaseOrigin();
  const token = buildDriverIdToken(input);
  const params = new URLSearchParams();
  params.set("verify", "doc");
  params.set("type", "driver_id");
  if (input.schoolId) params.set("s", cleanPart(input.schoolId));
  if (input.busId) params.set("busId", cleanPart(input.busId));
  return `${origin}/?${params.toString()}#${token}`;
}

export interface FeeReceiptQrInput {
  receiptNo?: string;
  receiptTitle?: string;
  isDueDemand?: boolean;
  schoolId?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  studentId?: string;
  studentName?: string;
  fatherName?: string;
  motherName?: string;
  className?: string;
  rollNo?: string;
  admissionNo?: string;
  session?: string;
  receiptDate?: string;
  receiptTime?: string;
  paymentMode?: string;
  grandTotal?: number;
  totalPaid?: number;
  balanceDue?: number;
  totalConcession?: number;
  lastPaidAmount?: number;
  lastPaidDate?: string;
  previousDueAmount?: number;
  previousDueMonth?: string;
  items?: Array<{ description: string; due: number; con: number; paid: number }>;
  upiId?: string;
  signatoryTitle?: string;
  phone?: string;
}

export function buildFeeReceiptQrUrl(input: FeeReceiptQrInput): string {
  const origin = getQrBaseOrigin();
  const loginToken = `NSTA-SCHOOL:${[
    encPart(input.schoolId || "school_campus"),
    encPart(input.studentId || ""),
    encPart(input.rollNo || ""),
    encPart(input.className || ""),
    encPart(cleanPart(input.studentName).slice(0, 32)),
    encPart(input.admissionNo || ""),
    encPart(input.phone || ""),
  ].join(":")}`;

  const compactItems = (input.items || []).slice(0, 8).map((it) => [
    cleanPart(it.description).slice(0, 34),
    Number(it.due || 0),
    Number(it.con || 0),
    Number(it.paid || 0),
  ]);

  const compactPayload: Record<string, unknown> = {
    t: "fee_receipt",
    rno: cleanPart(input.receiptNo),
    tit: cleanPart(input.receiptTitle).slice(0, 48),
    dem: input.isDueDemand ? 1 : 0,
    sid: cleanPart(input.schoolId),
    sn: cleanPart(input.schoolName).slice(0, 52),
    sa: cleanPart(input.schoolAddress).slice(0, 64),
    sp: cleanPart(input.schoolPhone).slice(0, 30),
    uid: cleanPart(input.studentId),
    nm: cleanPart(input.studentName).slice(0, 40),
    fn: cleanPart(input.fatherName).slice(0, 36),
    mn: cleanPart(input.motherName).slice(0, 36),
    cl: cleanPart(input.className).slice(0, 24),
    rl: cleanPart(input.rollNo).slice(0, 16),
    adm: cleanPart(input.admissionNo).slice(0, 28),
    ph: cleanPart(input.phone).slice(0, 20),
    ss: cleanPart(input.session).slice(0, 20),
    dt: cleanPart(input.receiptDate).slice(0, 28),
    tm: cleanPart(input.receiptTime).slice(0, 16),
    pm: cleanPart(input.paymentMode).slice(0, 24),
    gt: Number(input.grandTotal || 0),
    tp: Number(input.totalPaid || 0),
    bd: Number(input.balanceDue || 0),
    cn: Number(input.totalConcession || 0),
    lp: Number(input.lastPaidAmount || 0),
    lpd: cleanPart(input.lastPaidDate).slice(0, 24),
    pd: Number(input.previousDueAmount || 0),
    pdm: cleanPart(input.previousDueMonth).slice(0, 24),
    it: compactItems,
    upi: cleanPart(input.upiId).slice(0, 48),
    sig: cleanPart(input.signatoryTitle).slice(0, 32),
  };

  let url = `${origin}/?verify=doc&type=fee_receipt&s=${encPart(input.schoolId || "")}&u=${encPart(input.studentId || "")}&rno=${encPart(input.receiptNo || "")}&data=${encodeURIComponent(JSON.stringify(compactPayload))}#${loginToken}`;
  if (url.length > 1400) {
    // Trim non-essential strings so QR stays crisp and easy to scan
    compactPayload.sa = cleanPart(input.schoolAddress).slice(0, 32);
    compactPayload.it = compactItems.slice(0, 5).map(([d, due, con, paid]) => [String(d).slice(0, 20), due, con, paid]);
    url = `${origin}/?verify=doc&type=fee_receipt&s=${encPart(input.schoolId || "")}&u=${encPart(input.studentId || "")}&rno=${encPart(input.receiptNo || "")}&data=${encodeURIComponent(JSON.stringify(compactPayload))}#${loginToken}`;
  }
  return url;
}

export interface AdmitCardQrInput {
  schoolId?: string;
  schoolName?: string;
  schoolCode?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  examName?: string;
  session?: string;
  studentId?: string;
  rollNo?: string;
  admNo?: string;
  name?: string;
  fatherName?: string;
  phone?: string;
  className?: string;
  centerName?: string;
  examController?: string;
  principalTitle?: string;
  timetable?: Array<{ subject: string; date: string; time: string; room?: string }>;
}

export function buildAdmitCardQrUrl(input: AdmitCardQrInput): string {
  const origin = getQrBaseOrigin();
  const payload: Record<string, unknown> = {
    t: "admit_card",
    sid: cleanPart(input.schoolId),
    sn: cleanPart(input.schoolName).slice(0, 52),
    sc: cleanPart(input.schoolCode).slice(0, 24),
    sa: cleanPart(input.schoolAddress).slice(0, 60),
    sp: cleanPart(input.schoolPhone).slice(0, 28),
    ex: cleanPart(input.examName).slice(0, 48),
    ss: cleanPart(input.session).slice(0, 20),
    uid: cleanPart(input.studentId),
    rl: cleanPart(input.rollNo).slice(0, 16),
    adm: cleanPart(input.admNo).slice(0, 28),
    nm: cleanPart(input.name).slice(0, 40),
    fn: cleanPart(input.fatherName).slice(0, 36),
    ph: cleanPart(input.phone).slice(0, 20),
    cl: cleanPart(input.className).slice(0, 24),
    ctr: cleanPart(input.centerName).slice(0, 52),
    ec: cleanPart(input.examController).slice(0, 30),
    pt: cleanPart(input.principalTitle).slice(0, 32),
    tt: (input.timetable || []).slice(0, 10).map((r) => [
      cleanPart(r.subject).slice(0, 22),
      cleanPart(r.date).slice(0, 16),
      cleanPart(r.time).slice(0, 22),
      cleanPart(r.room || "Room 1").slice(0, 12),
    ]),
  };

  let url = `${origin}/?verify=doc&type=admit_card&s=${encPart(input.schoolId || "")}&u=${encPart(input.studentId || "")}&data=${encodeURIComponent(JSON.stringify(payload))}`;
  if (url.length > 1350) {
    payload.tt = (input.timetable || []).slice(0, 6).map((r) => [
      cleanPart(r.subject).slice(0, 16),
      cleanPart(r.date).slice(0, 14),
      cleanPart(r.time).slice(0, 16),
      cleanPart(r.room || "").slice(0, 8),
    ]);
    url = `${origin}/?verify=doc&type=admit_card&s=${encPart(input.schoolId || "")}&u=${encPart(input.studentId || "")}&data=${encodeURIComponent(JSON.stringify(payload))}`;
  }
  return url;
}

export interface CertificateQrInput {
  schoolId?: string;
  studentId?: string;
  schoolName?: string;
  candidateName?: string;
  rollNo?: string;
  admNo?: string;
  fatherName?: string;
  className?: string;
  dispatchNo?: string;
  session?: string;
  certType?: string;
  certTitle?: string;
  issueDate?: string;
  reason?: string;
  remarks?: string;
  rank?: string;
  percentage?: string;
  division?: string;
  customBodyText?: string;
}

export function buildCertificateQrUrl(input: CertificateQrInput): string {
  const origin = getQrBaseOrigin();
  const payload: Record<string, unknown> = {
    t: "certificate",
    sid: cleanPart(input.schoolId),
    uid: cleanPart(input.studentId),
    sn: cleanPart(input.schoolName).slice(0, 56),
    nm: cleanPart(input.candidateName).slice(0, 44),
    rl: cleanPart(input.rollNo).slice(0, 18),
    adm: cleanPart(input.admNo).slice(0, 28),
    fn: cleanPart(input.fatherName).slice(0, 40),
    cl: cleanPart(input.className).slice(0, 26),
    cno: cleanPart(input.dispatchNo).slice(0, 28),
    ss: cleanPart(input.session).slice(0, 20),
    ct: cleanPart(input.certType || "tc").slice(0, 20),
    tit: cleanPart(input.certTitle || "Transfer & Character Certificate").slice(0, 52),
    dt: cleanPart(input.issueDate).slice(0, 20),
    rs: cleanPart(input.reason).slice(0, 60),
    rm: cleanPart(input.remarks).slice(0, 70),
    rk: cleanPart(input.rank).slice(0, 24),
    pc: cleanPart(input.percentage).slice(0, 14),
    dv: cleanPart(input.division).slice(0, 24),
    bd: cleanPart(input.customBodyText).slice(0, 180),
  };

  const params = new URLSearchParams();
  params.set("verify", "doc");
  params.set("type", "certificate");
  if (input.schoolId) params.set("s", cleanPart(input.schoolId));
  if (input.studentId) params.set("u", cleanPart(input.studentId));
  if (input.dispatchNo) params.set("cNo", cleanPart(input.dispatchNo));
  params.set("data", JSON.stringify(payload));
  return `${origin}/?${params.toString()}`;
}

export interface AdmissionQrInput {
  schoolId?: string;
  schoolName?: string;
  studentId?: string;
  admNo?: string;
  applicationNo?: string;
  studentName?: string;
  fatherName?: string;
  motherName?: string;
  className?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  admissionType?: string;
  receiptNo?: string;
  totalDue?: number;
  totalCon?: number;
  totalPaid?: number;
  balanceDue?: number;
  paidDate?: string;
  paymentMode?: string;
  collectorName?: string;
  items?: Array<{ description: string; due: number; con: number; paid: number }>;
}

export function buildAdmissionQrUrl(input: AdmissionQrInput): string {
  const origin = getQrBaseOrigin();
  const payload: Record<string, unknown> = {
    t: "admission",
    sid: cleanPart(input.schoolId),
    sn: cleanPart(input.schoolName).slice(0, 52),
    uid: cleanPart(input.studentId),
    adm: cleanPart(input.admNo).slice(0, 28),
    app: cleanPart(input.applicationNo).slice(0, 28),
    nm: cleanPart(input.studentName).slice(0, 42),
    fn: cleanPart(input.fatherName).slice(0, 36),
    mn: cleanPart(input.motherName).slice(0, 36),
    cl: cleanPart(input.className).slice(0, 24),
    dob: cleanPart(input.dob).slice(0, 16),
    gn: cleanPart(input.gender).slice(0, 12),
    ph: cleanPart(input.phone).slice(0, 20),
    at: cleanPart(input.admissionType).slice(0, 16),
    rno: cleanPart(input.receiptNo).slice(0, 28),
    td: Number(input.totalDue || 0),
    tc: Number(input.totalCon || 0),
    tp: Number(input.totalPaid || 0),
    bd: Number(input.balanceDue || 0),
    dt: cleanPart(input.paidDate).slice(0, 24),
    pm: cleanPart(input.paymentMode).slice(0, 20),
    col: cleanPart(input.collectorName).slice(0, 32),
    it: (input.items || []).slice(0, 6).map((i) => [
      cleanPart(i.description).slice(0, 32),
      Number(i.due || 0),
      Number(i.con || 0),
      Number(i.paid || 0),
    ]),
  };

  const params = new URLSearchParams();
  params.set("verify", "doc");
  params.set("type", "admission");
  if (input.schoolId) params.set("s", cleanPart(input.schoolId));
  if (input.studentId) params.set("u", cleanPart(input.studentId));
  if (input.admNo) params.set("adm", cleanPart(input.admNo));
  params.set("data", JSON.stringify(payload));
  return `${origin}/?${params.toString()}`;
}

export interface GatePassQrInput {
  schoolId?: string;
  schoolName?: string;
  passNumber?: string;
  name?: string;
  phone?: string;
  purpose?: string;
  personToMeet?: string;
  reason?: string;
  timeStamp?: string;
  passKind?: "visitor" | "student_exit";
}

export function buildGatePassQrUrl(input: GatePassQrInput): string {
  const origin = getQrBaseOrigin();
  const payload = {
    t: "gate_pass",
    sid: cleanPart(input.schoolId),
    sn: cleanPart(input.schoolName).slice(0, 52),
    pno: cleanPart(input.passNumber).slice(0, 28),
    nm: cleanPart(input.name).slice(0, 42),
    ph: cleanPart(input.phone).slice(0, 20),
    pur: cleanPart(input.purpose).slice(0, 48),
    mt: cleanPart(input.personToMeet).slice(0, 40),
    rs: cleanPart(input.reason).slice(0, 60),
    tm: cleanPart(input.timeStamp).slice(0, 28),
    pk: input.passKind || "visitor",
  };
  const params = new URLSearchParams();
  params.set("verify", "doc");
  params.set("type", "gate_pass");
  if (input.schoolId) params.set("s", cleanPart(input.schoolId));
  if (input.passNumber) params.set("pass", cleanPart(input.passNumber));
  params.set("data", JSON.stringify(payload));
  return `${origin}/?${params.toString()}`;
}

/**
 * Extracts raw NSTA-SCHOOL:..., NSTA-SCHOOL-STAFF:..., or NSTA-SCHOOL-DRIVER:...
 * token from EITHER legacy raw string OR new Chrome-clickable URL (#NSTA-...).
 */
export function extractEmbeddedNstaToken(
  rawText: string,
  prefix: "NSTA-SCHOOL-STAFF:" | "NSTA-SCHOOL:" | "NSTA-SCHOOL-DRIVER:" | "NSTA-STAFF:" | "NSTA-DRIVER:"
): string | null {
  const text = String(rawText || "").trim();
  const idx = text.indexOf(prefix);
  if (idx === -1) return null;
  const after = text.slice(idx + prefix.length);
  // Stop at newline if multi-line legacy receipt
  return after.split(/[\r\n]/)[0];
}
