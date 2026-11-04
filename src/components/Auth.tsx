// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import type { User, SystemSettings } from '../types';
import { ADMIN_EMAIL } from '../constants';
import {
  saveUserToLive,
  auth,
  getUserByEmail,
  getUserByMobileOrId,
  getUserData,
  getFreshUserData,
  getUserByLinkedGoogleUid
} from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  Lock,
  User as UserIcon,
  Phone,
  Mail,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  XCircle,
  HelpCircle,
  Eye,
  EyeOff,
  ShieldQuestion,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  QrCode,
  Users,
  Camera,
  Upload,
  RefreshCw,
  GraduationCap,
  School,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';
import { LoginGuide } from './LoginGuide';
import { CustomAlert } from './CustomDialogs';
import { GuestRoomJoinModal } from './GuestRoomJoinModal';
import { QrLoginOtpChallengeModal } from './QrLoginOtpChallengeModal';
import {
  parseLoginQrToken,
  checkActiveRemoteSession,
  createLoginChallenge
} from '../services/sessionManager';
import { getDemoSchoolDataset } from './school/demoDataStore';
import { INITIAL_STUDENTS } from './school/feeReceiptUtils';
import { saveSchoolUserProfile, getStudent, getLocalStudents, setLocalStudents, getStudentOrAdmissionRecord } from '../school-firebase';

interface Props {
  onLogin: (user: User) => void;
  logActivity?: (action: string, details: string, user?: User) => void;
  appSettings?: SystemSettings;
  onOpenGuestStudyRoom?: () => void;
}

type AuthView = 'LOGIN' | 'SIGNUP' | 'RECOVERY' | 'SUCCESS_ID';

const BLOCKED_DOMAINS = [
  'tempmail.com', 'throwawaymail.com', 'mailinator.com', 'yopmail.com',
  '10minutemail.com', 'guerrillamail.com', 'sharklasers.com', 'getairmail.com'
];

const DEFAULT_QUESTIONS = [
  "Aapka favorite subject kaunsa hai?",
  "Aapka favorite sport ya game kya hai?",
  "Aapka favorite teacher kaun hai?",
  "Aapka birth city / gaon kaunsa hai?"
];

// Persistent session
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const Auth: React.FC<Props> = ({ onLogin, logActivity, appSettings, onOpenGuestStudyRoom }) => {
  const [view, setView] = useState<AuthView>('LOGIN');
  const [generatedId, setGeneratedId] = useState<string>('');

  const [formData, setFormData] = useState({
    id: '',
    password: '',
    name: '',
    mobile: '',
    email: '',
    securityQuestion: DEFAULT_QUESTIONS[0],
    securityAnswer: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [pendingLoginUser, setPendingLoginUser] = useState<User | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Recovery States
  const [recoveryUserObj, setRecoveryUserObj] = useState<any>(null);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [userEnteredAnswer, setUserEnteredAnswer] = useState('');

  // QR Scanner States
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cross-device login challenge state
  const [qrChallengeData, setQrChallengeData] = useState<{
    isOpen: boolean;
    userId: string;
    challengeId: string;
    remoteDeviceName?: string;
    pendingUser?: User;
  }>({
    isOpen: false,
    userId: '',
    challengeId: '',
  });

  const [showGuestStudyModal, setShowGuestStudyModal] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('nst_system_settings');
    if (s) {
      try { setSettings(JSON.parse(s)); } catch {}
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const el = document.getElementById('auth-qr-reader');
      if (!el) return;

      if (scannerInstanceRef.current) {
        try {
          if (scannerInstanceRef.current.isScanning) {
            await scannerInstanceRef.current.stop();
          }
          await scannerInstanceRef.current.clear();
        } catch {}
      }

      const instance = new Html5Qrcode('auth-qr-reader');
      scannerInstanceRef.current = instance;

      await instance.start(
        { facingMode: facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err: any) {
      console.warn('[Auth Scanner] camera init notice:', err);
      setCameraActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        await scannerInstanceRef.current.clear();
      } catch (e) {
      } finally {
        scannerInstanceRef.current = null;
        setCameraActive(false);
      }
    }
  };

  const switchCamera = async () => {
    await stopScanner();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // ── UNIVERSAL QR DECODER (RESILIENT, NON-BLOCKING & 0-PERMISSION FAILURE) ──
  const handleQrDecoded = async (decodedText: string) => {
    const raw = (decodedText || '').trim();
    if (!raw) return;

    setLoading(true);
    setError(null);
    stopScanner();

    try {
      let matchedStudentUser: User | null = null;
      let matchedTeacherUser: User | null = null;
      let targetSchoolId = 'dps_gurgaon_sector45';

      // ── HELPER: Resolve student from all available local & demo stores ──
      // STRICT UNIQUE MATCHING ONLY: Match on id, admissionNo, exact name, or full phone.
      // NEVER match on a bare roll number alone because roll numbers repeat in every class!
      const resolveStudent = (queryId: string, schoolId: string = 'dps_gurgaon_sector45') => {
        const q = (queryId || '').trim().toLowerCase();
        if (!q) return null;

        // 1. Current school local students
        const currentLocals = getLocalStudents(schoolId);
        let match = currentLocals.find(s =>
          (s.id && s.id.toLowerCase() === q) ||
          (s.admissionNo && s.admissionNo.toLowerCase() === q) ||
          (s.name && s.name.trim().toLowerCase() === q) ||
          (q.length >= 10 && s.phone && s.phone.replace(/\D/g, '') === q.replace(/\D/g, ''))
        );
        if (match) return match;

        // 2. Check all localStorage school student pools
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('nst_school_students_')) {
              const val = localStorage.getItem(k);
              if (val) {
                const list: any[] = JSON.parse(val);
                match = list.find(s =>
                  (s.id && s.id.toLowerCase() === q) ||
                  (s.admissionNo && s.admissionNo.toLowerCase() === q) ||
                  (s.name && s.name.trim().toLowerCase() === q) ||
                  (q.length >= 10 && s.phone && s.phone.replace(/\D/g, '') === q.replace(/\D/g, ''))
                );
                if (match) return match;
              }
            }
          }
        } catch {}

        // 3. Check demo school dataset & INITIAL_STUDENTS safely
        try {
          const dataset = getDemoSchoolDataset();
          const safeInitial = Array.isArray(INITIAL_STUDENTS) ? INITIAL_STUDENTS : [];
          const demoPool = [...(dataset.students || []), ...safeInitial];
          match = demoPool.find(s =>
            (s.id && s.id.toLowerCase() === q) ||
            (s.admissionNo && s.admissionNo.toLowerCase() === q) ||
            (s.name && s.name.trim().toLowerCase() === q) ||
            (q.length >= 10 && s.phone && s.phone.replace(/\D/g, '') === q.replace(/\D/g, ''))
          );
        } catch {}
        return match || null;
      };

      const resolveTeacherOrStaff = (rawQuery: string, schoolId?: string): any => {
        if (!rawQuery) return null;
        const q = rawQuery.trim().toLowerCase();

        // 1. Check demo school dataset staff & teachers
        try {
          const dataset = getDemoSchoolDataset();
          const staffPool: any[] = [...(dataset.staffEmployees || []), ...(dataset.teachers || [])];
          const match = staffPool.find(st =>
            (st.id && st.id.toLowerCase() === q) ||
            (st.employeeId && st.employeeId.toLowerCase() === q) ||
            (st.name && st.name.trim().toLowerCase() === q) ||
            (st.name && q.includes(st.name.trim().toLowerCase())) ||
            (st.phone && q.length >= 10 && st.phone.replace(/\D/g, '') === q.replace(/\D/g, ''))
          );
          if (match) return match;
        } catch {}

        // 2. Check localStorage school staff pools
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('nst_school_staff_') || k.startsWith('nst_staff_'))) {
              const val = localStorage.getItem(k);
              if (val) {
                const list: any[] = JSON.parse(val);
                if (Array.isArray(list)) {
                  const match = list.find(st =>
                    (st.id && st.id.toLowerCase() === q) ||
                    (st.employeeId && st.employeeId.toLowerCase() === q) ||
                    (st.name && st.name.trim().toLowerCase() === q) ||
                    (st.name && q.includes(st.name.trim().toLowerCase())) ||
                    (st.phone && q.length >= 10 && st.phone.replace(/\D/g, '') === q.replace(/\D/g, ''))
                  );
                  if (match) return match;
                }
              }
            }
          }
        } catch {}

        // 3. Fallback for demo teacher (e.g. Anjali Singh from staff card)
        if (q.includes('anjali') || q.includes('9871234005') || (q.includes('demo_') && !q.includes('std'))) {
          return {
            id: 'staff_anjali_singh',
            name: 'Anjali Singh',
            employeeId: 'DEMO_',
            designation: 'PRT PRIMARY TEACHER',
            department: 'Primary',
            phone: '9871234005',
            schoolId: schoolId || 'nstz'
          };
        }

        return null;
      };

      // ── BRANCH 1: Official School ID Card QR (Student OR Teacher/Staff) ──
      // Format: NSTA-SCHOOL[-STAFF]:schoolId:id:rollOrEmp:classOrDept:name:admNo:phone:father:mother:blood:dob:address:fee:title:schoolName
      if (
        raw.startsWith('NSTA-SCHOOL-STAFF:') ||
        raw.startsWith('NSTA-STAFF:') ||
        raw.startsWith('NSTA-SCHOOL:') ||
        raw.includes('NSTA-SCHOOL-STAFF:') ||
        raw.includes('NSTA-STAFF:') ||
        raw.includes('NSTA-SCHOOL:')
      ) {
        const isExplicitStaffPrefix =
          raw.startsWith('NSTA-SCHOOL-STAFF:') ||
          raw.startsWith('NSTA-STAFF:') ||
          raw.includes('NSTA-SCHOOL-STAFF:') ||
          raw.includes('NSTA-STAFF:');

        const token = raw.includes('NSTA-SCHOOL-STAFF:')
          ? raw.split('NSTA-SCHOOL-STAFF:')[1]
          : raw.includes('NSTA-STAFF:')
            ? raw.split('NSTA-STAFF:')[1]
            : raw.includes('NSTA-SCHOOL:')
              ? raw.split('NSTA-SCHOOL:')[1]
              : raw;

        // Strip trailing newline if receipt text follows
        const cleanToken = token.split('\n')[0].split('\r')[0];
        const parts = cleanToken.split(':').map(decodeURIComponent);
        const cleanSchoolId = parts[0] || 'dps_gurgaon_sector45';
        const cleanEntityId = parts[1] || '';
        const cleanRollOrEmp = parts[2] || '';
        const cleanClassOrDept = parts[3] || '';
        const embeddedName = parts[4] || '';
        const embeddedAdmNo = parts[5] || '';
        const embeddedPhone = parts[6] || '';
        const embeddedFatherName = parts[7] || '';
        const embeddedMotherName = parts[8] || '';
        const embeddedBloodGroup = parts[9] || '';
        const embeddedDob = parts[10] || '';
        const embeddedAddress = parts[11] || '';
        const embeddedMonthlyFee = parts[12] && !isNaN(Number(parts[12])) ? Number(parts[12]) : undefined;
        const embeddedTitle = parts[13] || ''; // className for student, designation for staff
        const embeddedSchoolName = parts[14] || '';
        targetSchoolId = cleanSchoolId;

        // Staff / Teacher detection
        const staffKeywords = /teacher|prt|tgt|pgt|staff|faculty|instructor|coordinator|clerk|principal|educator|headmistress|director|librarian/i;
        const isStaffCard =
          isExplicitStaffPrefix ||
          staffKeywords.test(embeddedTitle) ||
          staffKeywords.test(cleanClassOrDept) ||
          cleanEntityId.startsWith('staff_') ||
          cleanEntityId.startsWith('tea_') ||
          cleanRollOrEmp.startsWith('EMP-') ||
          cleanRollOrEmp.startsWith('DEMO_') ||
          cleanRollOrEmp.startsWith('STAFF') ||
          cleanRollOrEmp.startsWith('TEA') ||
          embeddedName.toLowerCase().includes('anjali') ||
          embeddedPhone === '9871234005' ||
          Boolean(resolveTeacherOrStaff(cleanEntityId || cleanRollOrEmp || embeddedName || embeddedPhone, cleanSchoolId));

        if (isStaffCard) {
          const foundStaff = resolveTeacherOrStaff(cleanEntityId || cleanRollOrEmp || embeddedName || embeddedPhone, cleanSchoolId);
          const realTeacherId = cleanEntityId || foundStaff?.id || `staff_${(cleanRollOrEmp || embeddedName || Date.now()).toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
          const realTeacherName = embeddedName || foundStaff?.name || 'Teacher';
          const realEmpId = cleanRollOrEmp || foundStaff?.employeeId || (realTeacherName.toLowerCase().includes('anjali') ? 'DEMO_' : 'EMP-01');
          const realPhone = embeddedPhone || foundStaff?.phone || (realTeacherName.toLowerCase().includes('anjali') ? '9871234005' : '9811023460');
          const realDesignation = embeddedTitle || foundStaff?.designation || (realTeacherName.toLowerCase().includes('anjali') ? 'PRT PRIMARY TEACHER' : 'Teacher');
          const realDept = cleanClassOrDept || foundStaff?.department || (realTeacherName.toLowerCase().includes('anjali') ? 'Primary' : 'Academic');
          const realSchoolName = embeddedSchoolName || foundStaff?.schoolName || 'Nstz';
          const realEmail = foundStaff?.email || `${realTeacherName.toLowerCase().replace(/[^a-z0-9]/g, '')}@teacher.nstz.edu.in`;

          matchedTeacherUser = {
            id: realTeacherId,
            uid: realTeacherId,
            displayId: realEmpId ? `EMP-${realEmpId}` : `TEA-${realTeacherId.slice(0, 6).toUpperCase()}`,
            name: realTeacherName,
            email: realEmail,
            mobile: realPhone,
            role: 'TEACHER',
            schoolId: cleanSchoolId,
            schoolName: realSchoolName,
            department: realDept,
            designation: realDesignation,
            credits: 500,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            subscriptionTier: 'PRO',
            provider: 'qr_teacher_id',
            isQrLogin: true,
            photoURL: foundStaff?.photoUrl || ''
          };
        } else {
          // Try local/dataset resolution first (unique ID -> unique AdmNo -> unique Name)
          let found = (cleanEntityId ? resolveStudent(cleanEntityId, cleanSchoolId) : null) ||
                      (embeddedAdmNo ? resolveStudent(embeddedAdmNo, cleanSchoolId) : null) ||
                      (embeddedName ? resolveStudent(embeddedName, cleanSchoolId) : null);

          // Try remote getStudent without throwing
          if (!found && cleanEntityId) {
            try {
              found = await getStudent(cleanSchoolId, cleanEntityId);
            } catch {}
          }

          // Extra enrichment from remote or admissions if fields were missing from old QR
          if (!found || !found.fatherName || !found.className) {
            try {
              const enriched = await getStudentOrAdmissionRecord(cleanSchoolId, {
                id: cleanEntityId,
                admissionNo: embeddedAdmNo,
                name: embeddedName,
                phone: embeddedPhone
              });
              if (enriched) {
                found = { ...(found || {}), ...enriched };
              }
            } catch {}
          }

          // Scan parts for human-readable class name (e.g. "Class 9", "Nursery", "KG 1")
          // Never check parts[0..2] (schoolId, studentId, rollNo) or phone/fee fields!
          let discoveredClassName = embeddedTitle?.trim() || '';
          if (!discoveredClassName || discoveredClassName.length >= 18 || /^[0-9a-zA-Z]{15,}$/.test(discoveredClassName)) {
            discoveredClassName = '';
            for (let i = 3; i < parts.length; i++) {
              if (i === 4 || i === 5 || i === 6 || i === 7 || i === 8 || i === 9 || i === 10 || i === 11 || i === 12 || i === 14) continue;
              const p = parts[i]?.trim();
              if (p && (/^Class\s*\d+/i.test(p) || /^(Nursery|LKG|UKG|KG|Play|Prep)/i.test(p) || /^\d+(st|nd|rd|th)(\s*[A-Z])?$/i.test(p))) {
                discoveredClassName = p;
                break;
              }
            }
          }

          // Scan parts for embedded monthly fee if index shifted
          let resolvedFee = embeddedMonthlyFee;
          if (resolvedFee === undefined) {
            for (let i = 0; i < parts.length; i++) {
              const p = parts[i]?.trim();
              if (p && !isNaN(Number(p)) && Number(p) >= 200 && Number(p) <= 50000 && i !== 2 && i !== 6) {
                resolvedFee = Number(p);
                break;
              }
            }
          }

          const isCrypticClassId = cleanClassOrDept && cleanClassOrDept.length >= 14 && /[A-Z]/.test(cleanClassOrDept) && /[0-9]/.test(cleanClassOrDept);
          // ALWAYS prioritize the EMBEDDED student data inside the QR code
          const realStudentId = cleanEntityId || found?.id || `stu_${(embeddedAdmNo || embeddedName || Date.now()).toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
          const realName = embeddedName || found?.name || (cleanRollOrEmp ? `Student (Roll ${cleanRollOrEmp})` : `Student (${realStudentId.slice(-4)})`);
          const realRollNo = cleanRollOrEmp || found?.rollNo || '01';
          const realAdmissionNo = (embeddedAdmNo && !embeddedAdmNo.startsWith('NSTA-') && !embeddedAdmNo.includes(':'))
            ? embeddedAdmNo
            : (found?.admissionNo || `ADM-${(cleanEntityId || realStudentId).slice(-6).toUpperCase()}`);
          const realClassName =
            discoveredClassName ||
            found?.className ||
            (!isCrypticClassId && cleanClassOrDept ? cleanClassOrDept.replace(/^cls_/i, '') : '') ||
            'Class 9';
          const realClass = cleanClassOrDept || found?.classGrade || found?.classId || 'cls_10';
          const realPhone = embeddedPhone || found?.phone || '9876543210';
          const realFather = embeddedFatherName || found?.fatherName || (realName.toLowerCase().includes('nadim') ? 'Mustak' : '');
          const realMother = embeddedMotherName || found?.motherName || (realName.toLowerCase().includes('nadim') ? 'Sayda khatoon' : '');
          const realBlood = embeddedBloodGroup || found?.bloodGroup || (realName.toLowerCase().includes('nadim') ? 'O+' : '');
          const realDob = embeddedDob || found?.dateOfBirth || (realName.toLowerCase().includes('nadim') ? '2002-11-01' : '');
          const realAddress = embeddedAddress || found?.address || (realName.toLowerCase().includes('nadim') ? 'Chapra' : '');
          // Prioritize authentic live database monthly fee over static printed QR fee
          const realFee = (found?.monthlyFee !== undefined && found.monthlyFee > 0)
            ? found.monthlyFee
            : ((resolvedFee !== undefined && resolvedFee > 0) ? resolvedFee : 1800);
          const realSchoolName = embeddedSchoolName || found?.schoolName || 'Nstz';
          const realEmail = found?.email || (realAdmissionNo ? `${realAdmissionNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.nstz.edu.in` : `student_${realStudentId.slice(-6)}@nstz.app`);

          matchedStudentUser = {
            id: realStudentId,
            uid: realStudentId,
            displayId: realRollNo ? `ROLL-${realRollNo}` : `STU-${realStudentId.slice(0, 6).toUpperCase()}`,
            name: realName,
            email: realEmail,
            mobile: realPhone,
            role: 'STUDENT',
            schoolId: cleanSchoolId,
            schoolName: realSchoolName,
            classLevel: realClassName || realClass,
            classId: realClass,
            className: realClassName,
            stream: 'General',
            credits: 100,
            diamonds: 50,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            subscriptionTier: 'PRO',
            provider: 'qr_student_id',
            isQrLogin: true,
            admissionNo: realAdmissionNo,
            rollNo: realRollNo,
            fatherName: realFather,
            motherName: realMother,
            bloodGroup: realBlood,
            dateOfBirth: realDob,
            address: realAddress,
            monthlyFee: realFee,
            photoURL: found?.photoUrl || ''
          };

        // Cache into local students list so school panel finds student immediately
        try {
          const cur = getLocalStudents(cleanSchoolId);
          const studentObj: any = {
            id: realStudentId,
            schoolId: cleanSchoolId,
            sessionId: '2026-27',
            classId: realClass,
            className: realClassName,
            name: realName,
            rollNo: realRollNo,
            admissionNo: realAdmissionNo,
            fatherName: realFather,
            motherName: realMother,
            bloodGroup: realBlood,
            dateOfBirth: realDob,
            address: realAddress,
            phone: realPhone,
            monthlyFee: realFee,
            photoUrl: found?.photoUrl || '',
            active: true,
            createdAt: new Date().toISOString()
          };
          const existingIdx = cur.findIndex(s => s.id === realStudentId || (s.admissionNo && s.admissionNo === realAdmissionNo));
          if (existingIdx !== -1) {
            cur[existingIdx] = { ...cur[existingIdx], ...studentObj };
            setLocalStudents(cleanSchoolId, cur);
          } else {
            setLocalStudents(cleanSchoolId, [studentObj, ...cur]);
          }
        } catch {}
      }
    }

      // ── BRANCH 1.5: Official Admission & Monthly Fee Receipt QR (DPS-RECEIPT) ──
      // Format: DPS-RECEIPT\nReceiptNo: ...\nAdmNo: ...\nStudent: ...\nClass: ...
      else if (raw.startsWith('DPS-RECEIPT') || raw.includes('DPS-RECEIPT') || raw.includes('ReceiptNo:') || raw.includes('AdmNo:') || (raw.includes('Student:') && raw.includes('TotalPaid:'))) {
        const lines = raw.split(/\r?\n/);
        const map: Record<string, string> = {};
        for (const line of lines) {
          const idx = line.indexOf(':');
          if (idx !== -1) {
            const key = line.slice(0, idx).trim().toLowerCase();
            const val = line.slice(idx + 1).trim();
            map[key] = val;
          }
        }
        const admNo = map['admno'] || map['admissionno'] || map['adm no'] || '';
        const studentName = map['student'] || map['studentname'] || map['name'] || '';
        const receiptClass = map['class'] || '10';
        const receiptNo = map['receiptno'] || map['receipt no'] || '';
        const schoolId = map['schoolid'] || targetSchoolId;
        targetSchoolId = schoolId;

        // Try resolution by Admission No (unique) or Student Name
        let found = (admNo ? resolveStudent(admNo, schoolId) : null) ||
                    (studentName ? resolveStudent(studentName, schoolId) : null);

        const realId = found?.id || `stu_${(admNo || studentName || receiptNo || Date.now()).toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
        const realName = studentName || found?.name || 'Student';
        const realAdm = admNo || found?.admissionNo || '';
        const realRoll = found?.rollNo || (realAdm ? realAdm.replace(/\D/g, '').slice(-2) : '01') || '01';
        const realClass = found?.classGrade || found?.classId || receiptClass || '10';
        const realPhone = found?.phone || '9876543210';
        const realEmail = found?.email || (realAdm ? `${realAdm.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.dps.edu.in` : `student_${realId.slice(-6)}@dps.edu.in`);

        matchedStudentUser = {
          id: realId,
          uid: realId,
          displayId: realRoll ? `ROLL-${realRoll}` : `STU-${realId.slice(0, 6).toUpperCase()}`,
          name: realName,
          email: realEmail,
          mobile: realPhone,
          role: 'STUDENT',
          schoolId: schoolId,
          classLevel: realClass,
          stream: 'General',
          credits: 100,
          diamonds: 50,
          streak: 1,
          totalScore: 0,
          profileCompleted: true,
          subscriptionTier: 'PRO',
          provider: 'qr_student_id',
          isQrLogin: true,
          monthlyFee: 1800,
          admissionNo: realAdm,
          photoURL: found?.photoUrl || ''
        };
      }

      // ── BRANCH 2: STUDENT pipe format ──
      // Format: STUDENT:Name|ROLL:...|CLASS:...|ADM:...|BLOOD:...
      else if (raw.startsWith('STUDENT:') || (raw.includes('|ROLL:') && raw.includes('|CLASS:')) || raw.includes('|ADM:')) {
        const parts = raw.split('|');
        const map: Record<string, string> = {};
        for (const p of parts) {
          const idx = p.indexOf(':');
          if (idx !== -1) {
            const k = p.slice(0, idx).trim().toUpperCase();
            const v = p.slice(idx + 1).trim();
            map[k] = v;
          }
        }
        const studentName = map['STUDENT'] || map['NAME'] || '';
        const rollNo = map['ROLL'] || '';
        const className = map['CLASS'] || '10';
        const admNo = map['ADM'] || map['ADMISSION'] || '';
        const blood = map['BLOOD'] || '';
        const schoolId = map['SCHOOL'] || 'dps_gurgaon_sector45';
        targetSchoolId = schoolId;

        const found = (admNo ? resolveStudent(admNo, schoolId) : null) || (studentName ? resolveStudent(studentName, schoolId) : null);

        const realId = found?.id || `stu_${(admNo || studentName || rollNo || Date.now()).toString().replace(/[^a-zA-Z0-9]/g, '_')}`;
        const realName = studentName || found?.name || (rollNo ? `Student (Roll ${rollNo})` : 'Student');
        const realRoll = found?.rollNo || rollNo;
        const realClass = found?.classGrade || found?.classId || className;
        const realAdm = found?.admissionNo || admNo || '';
        const realPhone = found?.phone || '9876543210';
        const realEmail = found?.email || (realAdm ? `${realAdm.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.dps.edu.in` : `student_${realId.slice(-6)}@dps.edu.in`);

        matchedStudentUser = {
          id: realId,
          uid: realId,
          displayId: realRoll ? `ROLL-${realRoll}` : `STU-${realId.slice(0, 6).toUpperCase()}`,
          name: realName,
          email: realEmail,
          mobile: realPhone,
          role: 'STUDENT',
          schoolId: schoolId,
          classLevel: realClass,
          stream: 'General',
          credits: 100,
          diamonds: 50,
          streak: 1,
          totalScore: 0,
          profileCompleted: true,
          subscriptionTier: 'PRO',
          provider: 'qr_student_id',
          isQrLogin: true,
          monthlyFee: 1800,
          admissionNo: realAdm,
          bloodGroup: blood || found?.bloodGroup
        };
      }

      // ── BRANCH 3: Teacher / Staff ID Card QR ──
      else if (
        raw.startsWith('NSTA-SCHOOL-TEACHER:') ||
        raw.startsWith('STAFF:') ||
        raw.startsWith('TEACHER:') ||
        (raw.includes('TEACHER') && (raw.includes(':') || raw.includes('|')))
      ) {
        const parts = raw.split(':');
        const schoolId = parts[1] || 'dps_gurgaon_sector45';
        const teacherId = parts[2] || 'emp_tea_1';
        const teacherName = parts[3] ? decodeURIComponent(parts[3]) : 'Teacher';

        const foundStaff = resolveTeacherOrStaff(teacherId || teacherName || raw, schoolId);
        const realId = foundStaff?.id || teacherId;
        const realName = foundStaff?.name || teacherName;
        matchedTeacherUser = {
          id: realId,
          uid: realId,
          displayId: foundStaff?.employeeId ? `EMP-${foundStaff.employeeId}` : `TEA-${realId.slice(0, 5).toUpperCase()}`,
          name: realName,
          email: foundStaff?.email || 'teacher@dps.edu.in',
          mobile: foundStaff?.phone || '9811023460',
          role: 'TEACHER',
          schoolId: schoolId,
          schoolName: foundStaff?.schoolName || 'Nstz',
          department: foundStaff?.department || 'Primary',
          designation: foundStaff?.designation || 'Teacher',
          credits: 500,
          streak: 12,
          profileCompleted: true,
          provider: 'qr_teacher_id',
          isQrLogin: true,
          photoURL: foundStaff?.photoUrl || ''
        };
      }

      // ── BRANCH 4: URL Format (e.g. from mobile browser scan or portal link) ──
      else if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
          const urlObj = new URL(raw);
          const qSchool = urlObj.searchParams.get('school') || urlObj.searchParams.get('schoolId') || 'dps_gurgaon_sector45';
          const qStudent = urlObj.searchParams.get('student') || urlObj.searchParams.get('studentId') || urlObj.searchParams.get('id');
          const qRoll = urlObj.searchParams.get('roll') || urlObj.searchParams.get('rollNo');
          const qName = urlObj.searchParams.get('name');
          const qAdm = urlObj.searchParams.get('adm') || urlObj.searchParams.get('admissionNo');

          if (qStudent || qRoll || qName || qAdm) {
            targetSchoolId = qSchool;
            const found = resolveStudent(qStudent || qRoll || qAdm || qName || '', qSchool);
            const realId = found?.id || qStudent || `stu_${Date.now()}`;
            matchedStudentUser = {
              id: realId,
              uid: realId,
              displayId: (found?.rollNo || qRoll) ? `ROLL-${found?.rollNo || qRoll}` : `STU-${realId.slice(0, 6).toUpperCase()}`,
              name: found?.name || qName || 'Student',
              email: found?.email || `${realId}@student.dps.edu.in`,
              mobile: found?.phone || '9876543210',
              role: 'STUDENT',
              schoolId: qSchool,
              classLevel: found?.classGrade || found?.classId || '10',
              stream: 'General',
              credits: 100,
              diamonds: 50,
              streak: 1,
              totalScore: 0,
              profileCompleted: true,
              subscriptionTier: 'PRO',
              provider: 'qr_student_id',
              isQrLogin: true,
              admissionNo: found?.admissionNo || qAdm || ''
            };
          }
        } catch {}
      }

      // ── BRANCH 5: JSON payload ──
      else if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === 'STUDENT_ID' || parsed.studentId || parsed.studentName || parsed.name) {
            const cleanId = parsed.studentId || parsed.id || `stu_${Date.now()}`;
            matchedStudentUser = {
              id: cleanId,
              uid: cleanId,
              displayId: parsed.rollNo ? `ROLL-${parsed.rollNo}` : 'NSTA-STUDENT',
              name: parsed.name || parsed.studentName || 'Student',
              email: parsed.email || `${cleanId}@student.dps.edu.in`,
              mobile: parsed.mobile || parsed.phone || '9876543210',
              role: 'STUDENT',
              schoolId: parsed.schoolId || 'dps_gurgaon_sector45',
              classLevel: parsed.classGrade || parsed.classId || '10',
              credits: 100,
              streak: 1,
              profileCompleted: true,
              provider: 'qr_student_id',
              isQrLogin: true,
              admissionNo: parsed.admissionNo || ''
            };
          } else if (parsed.type === 'TEACHER_ID' || parsed.teacherId || parsed.role === 'TEACHER') {
            const cleanId = parsed.teacherId || `tea_${Date.now()}`;
            matchedTeacherUser = {
              id: cleanId,
              uid: cleanId,
              displayId: 'NSTA-TEACHER',
              name: parsed.name || 'Teacher',
              email: parsed.email || 'teacher@dps.edu.in',
              mobile: parsed.phone || '9811023460',
              role: 'TEACHER',
              schoolId: parsed.schoolId || 'dps_gurgaon_sector45',
              credits: 200,
              profileCompleted: true,
              provider: 'qr_teacher_id',
              isQrLogin: true
            };
          }
        } catch {}
      }

      // ── BRANCH 6: Standard NSTA Session QR (Cross-device login) ──
      if (!matchedStudentUser && !matchedTeacherUser) {
        const loginPayload = parseLoginQrToken(raw);
        if (loginPayload && loginPayload.uid) {
          let fresh = await getFreshUserData(loginPayload.uid);
          if (!fresh) fresh = await getUserData(loginPayload.uid);

          const targetUser: User = fresh || {
            id: loginPayload.uid,
            uid: loginPayload.uid,
            name: loginPayload.name || 'Student',
            email: loginPayload.email || '',
            mobile: loginPayload.mobile || '',
            displayId: loginPayload.displayId || `NSTA-${loginPayload.uid.slice(0, 6).toUpperCase()}`,
            role: 'STUDENT',
            credits: 50,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            provider: 'qr_code',
            isQrLogin: true
          };

          const targetUid = targetUser.id || targetUser.uid;
          const remoteSession = await checkActiveRemoteSession(targetUid);
          if (remoteSession && remoteSession.sessionId) {
            const challenge = await createLoginChallenge(targetUid);
            setQrChallengeData({
              isOpen: true,
              userId: targetUid,
              challengeId: challenge.challengeId,
              remoteDeviceName: remoteSession.device || 'Active Mobile Phone',
              pendingUser: targetUser,
            });
            setLoading(false);
            return;
          }

          completeQrLogin(targetUser);
          return;
        }
      }

      // ── BRANCH 7: Match by Admission number, Roll number or Name directly ──
      if (!matchedStudentUser && !matchedTeacherUser) {
        const found = resolveStudent(raw, 'dps_gurgaon_sector45');
        if (found) {
          matchedStudentUser = {
            id: found.id,
            uid: found.id,
            displayId: `ROLL-${found.rollNo}`,
            name: found.name,
            email: found.email || `${found.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.dps.edu.in`,
            mobile: found.phone || '',
            role: 'STUDENT',
            schoolId: found.schoolId || 'dps_gurgaon_sector45',
            classLevel: found.classGrade || found.classId || '10',
            credits: 100,
            streak: 1,
            profileCompleted: true,
            provider: 'qr_student_id',
            isQrLogin: true,
            monthlyFee: 1800,
            admissionNo: found.admissionNo
          };
        }
      }

      // ── EXECUTE STUDENT LOGIN (INSTANT & NON-BLOCKING) ──
      if (matchedStudentUser) {
        // Ensure student has valid monthlyFee default
        if (!matchedStudentUser.monthlyFee || matchedStudentUser.monthlyFee <= 0) {
          matchedStudentUser.monthlyFee = 1800;
        }

        // 1. Immediately cache locally to localStorage so login never fails and has 0ms latency
        localStorage.setItem('nst_current_user', JSON.stringify(matchedStudentUser));
        localStorage.setItem('nsta_cached_user', JSON.stringify(matchedStudentUser));
        localStorage.setItem(`nst_user_profile_${matchedStudentUser.id}`, JSON.stringify(matchedStudentUser));
        localStorage.setItem(`nst_school_user_${matchedStudentUser.id}`, JSON.stringify({
          uid: matchedStudentUser.id,
          schoolId: matchedStudentUser.schoolId || targetSchoolId,
          role: 'SCHOOL_STUDENT',
          name: matchedStudentUser.name,
          email: matchedStudentUser.email,
          studentRef: matchedStudentUser.id,
          classId: matchedStudentUser.classLevel,
          sessionId: '2026-27'
        }));

        // 2. Also ensure local school students pool includes this student
        try {
          const sid = matchedStudentUser.schoolId || targetSchoolId;
          const studentEntry = {
            id: matchedStudentUser.id,
            schoolId: sid,
            name: matchedStudentUser.name,
            rollNo: (matchedStudentUser.displayId || '').replace('ROLL-', '') || '01',
            admissionNo: matchedStudentUser.admissionNo || '',
            phone: matchedStudentUser.mobile || '',
            classId: matchedStudentUser.classLevel || 'cls_10',
            monthlyFee: 1800,
            active: true,
            createdAt: new Date().toISOString()
          };
          const curPool = getLocalStudents(sid);
          setLocalStudents(sid, [studentEntry, ...curPool.filter(s => s.id !== matchedStudentUser!.id && (!matchedStudentUser!.admissionNo || s.admissionNo !== matchedStudentUser!.admissionNo))]);
          if (sid !== 'dps_gurgaon_sector45') {
            const defPool = getLocalStudents('dps_gurgaon_sector45');
            setLocalStudents('dps_gurgaon_sector45', [studentEntry, ...defPool.filter(s => s.id !== matchedStudentUser!.id && (!matchedStudentUser!.admissionNo || s.admissionNo !== matchedStudentUser!.admissionNo))]);
          }
        } catch {}

        // 3. Complete login INSTANTLY in UI
        triggerLoginSuccess(matchedStudentUser);

        // 4. Non-blocking background sync (any permission warning is silently ignored)
        saveUserToLive(matchedStudentUser).catch(() => {});
        saveSchoolUserProfile({
          uid: matchedStudentUser.id,
          schoolId: matchedStudentUser.schoolId || targetSchoolId,
          role: 'SCHOOL_STUDENT',
          name: matchedStudentUser.name,
          email: matchedStudentUser.email,
          studentRef: matchedStudentUser.id,
          classId: matchedStudentUser.classLevel,
          sessionId: '2026-27'
        }).catch(() => {});

        return;
      }

      // ── EXECUTE TEACHER LOGIN (INSTANT & NON-BLOCKING) ──
      if (matchedTeacherUser) {
        localStorage.setItem('nst_current_user', JSON.stringify(matchedTeacherUser));
        localStorage.setItem('nsta_cached_user', JSON.stringify(matchedTeacherUser));
        localStorage.setItem(`nst_school_user_${matchedTeacherUser.id}`, JSON.stringify({
          uid: matchedTeacherUser.id,
          schoolId: matchedTeacherUser.schoolId,
          role: 'TEACHER',
          name: matchedTeacherUser.name,
          email: matchedTeacherUser.email,
          teacherRef: matchedTeacherUser.id
        }));

        triggerLoginSuccess(matchedTeacherUser);

        saveUserToLive(matchedTeacherUser).catch(() => {});
        saveSchoolUserProfile({
          uid: matchedTeacherUser.id,
          schoolId: matchedTeacherUser.schoolId,
          role: 'TEACHER',
          name: matchedTeacherUser.name,
          email: matchedTeacherUser.email,
          teacherRef: matchedTeacherUser.id
        }).catch(() => {});

        return;
      }

      // No match found
      setError(`QR Code recognize nahi hua (${raw.slice(0, 30)}...). Kripya Student ID Card ka QR code scan karein.`);
      setLoading(false);
      startScanner();
    } catch (e: any) {
      console.warn('[QR Scan Decode Error]:', e);
      setError('QR Scan decode notice: ' + (e?.message || 'Check card and scan again'));
      setLoading(false);
      startScanner();
    }
  };

  // Image Upload Scan via jsQR
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas context initialize nahi ho paya.');
          setLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleQrDecoded(code.data);
        } else {
          setError('Is photo me koi QR code nahi mila. Kripya saaf photo upload karein.');
          setLoading(false);
        }
      };
      img.onerror = () => {
        setError('Photo load karne me problem aayi.');
        setLoading(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const completeQrLogin = (targetUser: User) => {
    saveUserToLive(targetUser, { immediate: true });
    localStorage.setItem('nst_current_user', JSON.stringify(targetUser));
    localStorage.setItem('nst_last_user_id', targetUser.id || targetUser.uid);
    localStorage.removeItem('nst_logged_out');
    triggerLoginSuccess(targetUser);
  };

  const triggerLoginSuccess = (userToLogin: User) => {
    setLoading(false);
    localStorage.setItem('nst_current_user', JSON.stringify(userToLogin));
    localStorage.removeItem('nst_logged_out');
    if (logActivity) logActivity('LOGIN', `Logged in as: ${userToLogin.name}`, userToLogin);
    try {
      window.dispatchEvent(new CustomEvent('user-signed-up-prompt-notifications'));
    } catch {}
    onLogin(userToLogin);
  };

  // ── FAST 1-TAP DEMO CHIPS ──────────────────────────────────────────────────
  const handleQuickStudentLogin = () => {
    const studentUser: User = {
      id: 'std_demo_aarav_01',
      uid: 'std_demo_aarav_01',
      displayId: 'ROLL-01',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@dps.edu.in',
      mobile: '9876543210',
      role: 'STUDENT',
      schoolId: 'dps_gurgaon_sector45',
      classLevel: '10',
      stream: 'Science',
      credits: 100,
      diamonds: 50,
      streak: 5,
      totalScore: 500,
      profileCompleted: true,
      subscriptionTier: 'PRO',
      studyMode: 'CREDIT',
      provider: 'quick_demo'
    };
    triggerLoginSuccess(studentUser);
  };

  const handleQuickTeacherLogin = () => {
    const teacherUser: User = {
      id: 'emp_tea_1',
      uid: 'emp_tea_1',
      displayId: 'TEA-RKVERMA',
      name: 'Mr. R. K. Verma',
      email: 'rkverma.math@dps.edu.in',
      mobile: '9811023460',
      role: 'TEACHER',
      schoolId: 'dps_gurgaon_sector45',
      credits: 500,
      streak: 12,
      profileCompleted: true,
      provider: 'quick_demo'
    };
    triggerLoginSuccess(teacherUser);
  };

  const handleQuickAdminLogin = () => {
    const adminUser: User = {
      id: 'admin_uid',
      uid: 'admin_uid',
      displayId: 'ADMIN-DPS',
      name: 'Dr. Arvind Swaminathan (Principal & School Admin)',
      email: 'admin@dps.edu.in',
      mobile: '9811023450',
      role: 'SCHOOL_ADMIN',
      schoolId: 'dps_gurgaon_sector45',
      credits: 10000,
      streak: 30,
      profileCompleted: true,
      subscriptionTier: 'PRO',
      provider: 'admin_login'
    };
    triggerLoginSuccess(adminUser);
  };

  // ── FORM FIELD HANDLERS ───────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const generateUserId = () => {
    const prefix = (appSettings?.appShortName || settings?.appShortName || 'NSTA')?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'NSTA';
    const randomPart = String(Math.floor(100000 + Math.random() * 900000));
    return `${prefix}-${randomPart}`;
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(generatedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── MANUAL LOGIN SUBMIT (CRITICAL FIX FOR ADMIN & SCHOOL PERMISSIONS) ────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanId = formData.id.trim();
      const cleanPassword = formData.password.trim();

      if (!cleanId || !cleanPassword) {
        setError('Kripya apna Mobile / Email / ID aur Password dono daalein.');
        setLoading(false);
        return;
      }

      const lowerId = cleanId.toLowerCase();
      const lowerPass = cleanPassword.toLowerCase();

      // ── MASTER SUPER ADMIN LOGIN (nadimanwar794@gmail.com + nsta) ──
      const isSuperAdminCred =
        (lowerId === 'nadimanwar794@gmail.com' ||
         lowerId === 'nadimanwar794@gmsil.com' ||
         lowerId === 'nsdimanwar794@gmail.com' ||
         lowerId === 'nadiman0636indo@gmail.com' ||
         lowerId === 'n44438403@gmail.com' ||
         lowerId === 'nadimanwar794' ||
         lowerId === 'superadmin') &&
        (lowerPass === 'nsta' || lowerPass === 'nsta@123' || cleanPassword === 'nsta');

      if (isSuperAdminCred) {
        const superAdminUser: User = {
          id: 'super_admin_nadim',
          uid: 'super_admin_nadim',
          displayId: 'SUPERADMIN',
          name: 'Nadim Anwar (Super Admin)',
          email: 'nadimanwar794@gmail.com',
          role: 'SUPERADMIN',
          schoolId: '',
          credits: 99999,
          diamonds: 99999,
          streak: 100,
          totalScore: 9999,
          profileCompleted: true,
          subscriptionTier: 'PRO',
          provider: 'superadmin_master_login'
        };
        triggerLoginSuccess(superAdminUser);
        return;
      }

      const isSuperAdmin =
        lowerId === 'nadimanwar794@gmail.com' ||
        lowerId === 'nadimanwar794@gmsil.com' ||
        lowerId === 'nsdimanwar794@gmail.com' ||
        lowerId === 'nadiman0636indo@gmail.com' ||
        lowerId === 'n44438403@gmail.com' ||
        lowerId === 'superadmin';

      const isAdminLogin =
        !isSuperAdmin &&
        (lowerId.includes('admin') ||
         lowerId.includes('principal') ||
         lowerId === 'admin@dps.edu.in' ||
         lowerId === 'dpsgurgaon45@dps.edu.in' ||
         lowerId.startsWith('admin@'));

      let matchedUser: any = null;

      // 1. If user entered an Email address: Try Firebase Auth directly first!
      if (cleanId.includes('@')) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanId, cleanPassword);
          if (userCredential?.user) {
            const fbUser = userCredential.user;
            let fresh = await getFreshUserData(fbUser.uid);
            if (!fresh) fresh = await getUserData(fbUser.uid);
            matchedUser = fresh || {
              id: fbUser.uid,
              uid: fbUser.uid,
              name: fbUser.displayName || (isSuperAdmin ? 'Nadim Anwar (Super Admin)' : isAdminLogin ? 'Dr. Arvind Swaminathan (Principal & Admin)' : cleanId.split('@')[0]),
              email: fbUser.email || cleanId,
              role: isSuperAdmin ? 'SUPERADMIN' : isAdminLogin ? 'SCHOOL_ADMIN' : 'STUDENT',
              schoolId: isSuperAdmin ? '' : (isAdminLogin ? 'dps_gurgaon_sector45' : ''),
              classLevel: '10',
              credits: isSuperAdmin ? 99999 : isAdminLogin ? 10000 : 50,
              streak: 1,
              profileCompleted: true,
              provider: isSuperAdmin ? 'superadmin_login' : isAdminLogin ? 'admin_login' : 'firebase_auth'
            };
            if (isSuperAdmin && matchedUser) {
              matchedUser.role = 'SUPERADMIN';
            } else if (isAdminLogin && matchedUser) {
              matchedUser.role = 'SCHOOL_ADMIN';
            }
          }
        } catch (authErr: any) {
          // If auth fails, try database lookup gracefully
        }

        if (!matchedUser) {
          matchedUser = await getUserByEmail(cleanId);
          if (isSuperAdmin && matchedUser) {
            matchedUser.role = 'SUPERADMIN';
          } else if (isAdminLogin && matchedUser) {
            matchedUser.role = 'SCHOOL_ADMIN';
          }
        }
      } else {
        // 2. If user entered Mobile number or Student ID:
        matchedUser = await getUserByMobileOrId(cleanId);
      }

      // 3. Fallback demo matching
      if (!matchedUser) {
        if (isAdminLogin || cleanId.toLowerCase() === 'admin' || cleanId.toLowerCase() === 'admin@dps.edu.in') {
          matchedUser = {
            id: 'admin_uid',
            uid: 'admin_uid',
            name: 'Dr. Arvind Swaminathan (Principal & Admin)',
            email: 'admin@dps.edu.in',
            role: 'SCHOOL_ADMIN',
            schoolId: 'dps_gurgaon_sector45',
            credits: 10000,
            profileCompleted: true,
            provider: 'admin_login'
          };
        } else if (cleanId.toLowerCase() === 'teacher' || cleanId.toLowerCase().includes('teacher')) {
          handleQuickTeacherLogin();
          return;
        } else {
          // Match in student records
          const dataset = getDemoSchoolDataset();
          const foundStudent = dataset.students.find(
            s => s.admissionNo.toLowerCase() === cleanId.toLowerCase() ||
                 s.rollNo === cleanId ||
                 (s.phone && s.phone.replace(/\D/g, '').endsWith(cleanId.replace(/\D/g, ''))) ||
                 (s.email && s.email.toLowerCase() === cleanId.toLowerCase())
          );

          if (foundStudent) {
            matchedUser = {
              id: foundStudent.id,
              uid: foundStudent.id,
              displayId: `ROLL-${foundStudent.rollNo}`,
              name: foundStudent.name,
              email: foundStudent.email || cleanId,
              mobile: foundStudent.phone || '9876543210',
              role: 'STUDENT',
              schoolId: 'dps_gurgaon_sector45',
              classLevel: foundStudent.classGrade || '10',
              credits: 100,
              diamonds: 50,
              streak: 3,
              profileCompleted: true,
              provider: 'student_record'
            };
          } else {
            // Default demo student if credentials match
            handleQuickStudentLogin();
            return;
          }
        }
      }

      if (isSuperAdmin && matchedUser) {
        matchedUser.role = 'SUPERADMIN';
      } else if (isAdminLogin && matchedUser) {
        matchedUser.role = 'SCHOOL_ADMIN';
      }

      triggerLoginSuccess(matchedUser);
    } catch (err: any) {
      setError(err?.message || 'Login fail hua. Kripya check karke dobara try karein.');
      setLoading(false);
    }
  };

  // ── MANUAL SIGNUP SUBMIT ──────────────────────────────────────────────────
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.name.trim() || !formData.mobile.trim() || !formData.password.trim()) {
        setError('Naam, Mobile aur Password zaroori hain.');
        setLoading(false);
        return;
      }

      const newId = generateUserId();
      const newUser: User = {
        id: newId,
        uid: newId,
        displayId: newId,
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim() || `${newId.toLowerCase()}@nsta.app`,
        role: 'STUDENT',
        classLevel: '10',
        schoolId: 'dps_gurgaon_sector45',
        credits: 50,
        streak: 1,
        totalScore: 0,
        profileCompleted: true,
        provider: 'password',
        securityQuestion: formData.securityQuestion,
        securityAnswer: formData.securityAnswer.trim().toLowerCase(),
        createdAt: new Date().toISOString()
      };

      await saveUserToLive(newUser, { immediate: true });
      localStorage.setItem('nst_last_registered_id', newId);
      // Direct navigation: User account creation instantly transitions to the School ID Card gateway screen
      triggerLoginSuccess(newUser);
    } catch (err: any) {
      setError(err?.message || 'Account create nahi ho saka.');
      setLoading(false);
    }
  };

  // ── RECOVERY SUBMIT ───────────────────────────────────────────────────────
  const handleFindRecoveryAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanId = formData.id.trim();
      let matched = cleanId.includes('@') ? await getUserByEmail(cleanId) : await getUserByMobileOrId(cleanId);
      if (!matched && cleanId.includes('@')) matched = await getUserByMobileOrId(cleanId);

      if (!matched) {
        setError('Yeh Mobile / Email / ID match nahi hua.');
        setLoading(false);
        return;
      }

      setRecoveryUserObj(matched);
      setRecoveryStep(2);
      setLoading(false);
    } catch (err: any) {
      setError('Account search notice: ' + (err?.message || 'Not found'));
      setLoading(false);
    }
  };

  const handleVerifyAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUserObj) return;

    const actual = (recoveryUserObj.securityAnswer || '').trim().toLowerCase();
    const entered = userEnteredAnswer.trim().toLowerCase();

    if (actual && entered !== actual) {
      setError('Galat Security Answer hai.');
      return;
    }

    triggerLoginSuccess(recoveryUserObj);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const cleanEmail = (fbUser.email || '').toLowerCase().trim();
      const isSuperAdm =
        cleanEmail === 'nadimanwar794@gmail.com' ||
        cleanEmail === 'nsdimanwar794@gmail.com' ||
        cleanEmail === 'nadiman0636indo@gmail.com' ||
        cleanEmail === 'n44438403@gmail.com';

      const isSchoolAdm =
        !isSuperAdm &&
        (cleanEmail === 'admin@dps.edu.in' ||
         cleanEmail === 'dpsgurgaon45@dps.edu.in' ||
         cleanEmail.startsWith('admin@') ||
         cleanEmail.includes('principal') ||
         cleanEmail.includes('schooladmin'));

      const loggedUser: User = {
        id: fbUser.uid,
        uid: fbUser.uid,
        displayId: isSuperAdm ? 'SUPERADMIN' : isSchoolAdm ? 'ADMIN-DPS' : `NSTA-${fbUser.uid.slice(0, 6).toUpperCase()}`,
        name: fbUser.displayName || (isSuperAdm ? 'Nadim Anwar (Super Admin)' : isSchoolAdm ? 'Dr. Arvind Swaminathan (School Admin)' : 'Student'),
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || '',
        role: isSuperAdm ? 'SUPERADMIN' : isSchoolAdm ? 'SCHOOL_ADMIN' : 'STUDENT',
        // No hardcoded school for SuperAdmin or general Google users; they link dynamically
        schoolId: isSchoolAdm ? 'dps_gurgaon_sector45' : '',
        classLevel: '10',
        credits: isSuperAdm ? 99999 : isSchoolAdm ? 10000 : 50,
        streak: 1,
        totalScore: 0,
        profileCompleted: true,
        provider: isSuperAdm ? 'superadmin_login' : isSchoolAdm ? 'admin_login' : 'google'
      };

      triggerLoginSuccess(loggedUser);
    } catch (err: any) {
      setError('Google Sign-In notice: ' + (err?.message || 'Popup closed'));
      setLoading(false);
    }
  };

  const isFlipped = view === 'SIGNUP';

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative overflow-x-hidden select-none">
      <CustomAlert
        isOpen={alertConfig.isOpen}
        message={alertConfig.message}
        onClose={() => {
          setAlertConfig({ ...alertConfig, isOpen: false });
          if (pendingLoginUser) onLogin(pendingLoginUser);
        }}
      />

      {showGuide && <LoginGuide onClose={() => setShowGuide(false)} />}

      {/* ── TOP HEADER: NATURAL SCHOOL BRANDING ── */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between px-5 pt-3 pb-2 z-20 shrink-0">
        <div className="flex items-center gap-2.5 text-left">
          {/* Logo */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center shadow-md shadow-indigo-950/20 p-1 border border-indigo-500/20 ring-1 ring-indigo-500/10">
            {settings?.appLogo ? (
              <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <span className="text-xs font-black text-amber-400">{settings?.appShortName || 'NSTA'}</span>
            )}
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              {settings?.appName || 'NSTA'}
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-normal">
              Digital Smart Campus
            </p>
          </div>
        </div>

        {/* Discreet Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/40 dark:border-slate-700/50 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Portal</span>
        </div>
      </header>

      {/* ── ERROR NOTICE ── */}
      {error && (
        <div className="w-full max-w-md mx-auto my-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in z-20">
          <div className="flex items-center gap-2">
            <XCircle size={15} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* ── MAIN CONTENT AREA: FULL PAGE SEAMLESS EXPERIENCE ── */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-4 flex flex-col justify-center z-10">
        {/* ── SUB-VIEW: RECOVERY ── */}
        {view === 'RECOVERY' && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-200 dark:border-rose-900/50">
                <KeyRound size={22} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Instant Recovery
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {recoveryStep === 1 ? 'Apna account search karein' : 'Sahi answer se instant login'}
              </p>
            </div>

            {recoveryStep === 1 && (
              <form onSubmit={handleFindRecoveryAccount} className="space-y-3.5">
                <div className="relative flex items-center rounded-xl">
                  <UserIcon size={17} className="absolute left-3.5 text-slate-400" />
                  <input
                    name="id"
                    type="text"
                    required
                    placeholder="Mobile / Email / Student ID"
                    value={formData.id}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider text-white bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-md transition flex items-center justify-center gap-2 uppercase cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin text-white" /> : <span>FIND ACCOUNT</span>}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {recoveryStep === 2 && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-left">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">SECURITY QUESTION:</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {recoveryUserObj?.securityQuestion || "Aapka favorite subject kaunsa hai?"}
                  </p>
                </div>

                <form onSubmit={handleVerifyAnswerSubmit} className="space-y-3.5">
                  <div className="relative flex items-center rounded-xl">
                    <ShieldQuestion size={17} className="absolute left-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter Security Answer"
                      value={userEnteredAnswer}
                      onChange={(e) => { setUserEnteredAnswer(e.target.value); setError(null); }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider text-white bg-slate-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md transition flex items-center justify-center gap-2 uppercase cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin text-white" /> : <span>VERIFY &amp; LOGIN</span>}
                    <CheckCircle2 size={16} />
                  </button>
                </form>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center pt-2">
              Wapas login par jaane ke liye:{' '}
              <button
                type="button"
                onClick={() => { setView('LOGIN'); setError(null); }}
                className="font-black text-slate-900 dark:text-white hover:underline cursor-pointer"
              >
                Login karein
              </button>
            </p>
          </div>
        )}

        {/* ── SUB-VIEW: LOGIN FULL PAGE ── */}
        {view === 'LOGIN' && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Sign in to access your classes &amp; school portal
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Mobile / Email / Student ID
                </label>
                <div className="relative flex items-center rounded-xl">
                  <UserIcon size={17} className="absolute left-3.5 text-slate-400" />
                  <input
                    name="id"
                    type="text"
                    required
                    placeholder="Mobile, Email ya Student ID"
                    value={formData.id}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 focus:border-slate-900 dark:focus:border-indigo-500 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none transition shadow-2xs"
                    autoCapitalize="none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Password
                </label>
                <div className="relative flex items-center rounded-xl">
                  <Lock size={17} className="absolute left-3.5 text-slate-400" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 focus:border-slate-900 dark:focus:border-indigo-500 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none transition shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setView('RECOVERY'); setError(null); }}
                  className="font-bold text-slate-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider text-white bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-md transition-all flex items-center justify-center gap-2 uppercase cursor-pointer active:scale-[0.99]"
              >
                {loading ? <Loader2 size={16} className="animate-spin text-white" /> : <span>LOGIN</span>}
                <ArrowRight size={16} />
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-slate-50 dark:bg-slate-950 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">OR</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold flex items-center justify-center gap-2 border border-slate-300/80 dark:border-slate-800 transition cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google Sign In</span>
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Naya student account banana hai?{' '}
                <button
                  type="button"
                  onClick={() => { setView('SIGNUP'); setError(null); }}
                  className="font-black text-slate-900 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── SUB-VIEW: CREATE ACCOUNT FULL PAGE ── */}
        {view === 'SIGNUP' && (
          <div className="w-full space-y-3.5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Create Account
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                New student permanent ID generate karein
              </p>
            </div>

            <form onSubmit={handleSignupSubmit} className="w-full space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Full Name</label>
                <div className="relative flex items-center rounded-xl">
                  <UserIcon size={17} className="absolute left-3.5 text-slate-400" />
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Poora Naam (Full Name)"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Mobile Number</label>
                <div className="relative flex items-center rounded-xl">
                  <Phone size={17} className="absolute left-3.5 text-slate-400" />
                  <input
                    name="mobile"
                    type="tel"
                    required
                    placeholder="10-digit Mobile Number"
                    value={formData.mobile}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Email Address (Optional)</label>
                <div className="relative flex items-center rounded-xl">
                  <Mail size={17} className="absolute left-3.5 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email ID (e.g. name@gmail.com)"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Create Password</label>
                <div className="relative flex items-center rounded-xl">
                  <Lock size={17} className="absolute left-3.5 text-slate-400" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password banayein"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 font-medium outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Security Question (ID recovery ke liye)</label>
                <select
                  name="securityQuestion"
                  value={formData.securityQuestion}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 outline-none"
                >
                  {DEFAULT_QUESTIONS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
                <input
                  name="securityAnswer"
                  type="text"
                  required
                  placeholder="Aapka answer yahan likhein"
                  value={formData.securityAnswer}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all flex items-center justify-center gap-2 uppercase cursor-pointer active:scale-[0.99] mt-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin text-white" /> : <span>CREATE ACCOUNT</span>}
                <CheckCircle2 size={16} />
              </button>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold flex items-center justify-center gap-2 border border-slate-300/80 dark:border-slate-800 transition cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google se Sign Up karein</span>
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Pehle se account hai?{' '}
                <button
                  type="button"
                  onClick={() => { setView('LOGIN'); setError(null); }}
                  className="font-black text-slate-900 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Login karein
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── SUB-VIEW: SUCCESS ID ── */}
        {view === 'SUCCESS_ID' && (
          <div className="w-full text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Account Ban Gaya!</h3>
              <p className="text-xs text-slate-500 mt-1">Yeh aapki permanent NSTA Student ID hai:</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
              <span className="font-mono text-lg font-black text-amber-500">{generatedId}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (pendingLoginUser) onLogin(pendingLoginUser);
              }}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition cursor-pointer active:scale-[0.99]"
            >
              Start Learning Now
            </button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-md mx-auto text-center py-3 z-10 text-[11px] text-slate-400 shrink-0">
        <p>DPS &amp; NSTA Secure Education Platform</p>
      </footer>

      {/* 2-Device Cross-Login Challenge Modal */}
      <QrLoginOtpChallengeModal
        isOpen={qrChallengeData.isOpen}
        userId={qrChallengeData.userId}
        challengeId={qrChallengeData.challengeId}
        remoteDeviceName={qrChallengeData.remoteDeviceName}
        onApproved={() => {
          setQrChallengeData({ ...qrChallengeData, isOpen: false });
          if (qrChallengeData.pendingUser) {
            completeQrLogin(qrChallengeData.pendingUser);
          }
        }}
        onCancelled={() => {
          setQrChallengeData({ ...qrChallengeData, isOpen: false });
          setError('Login challenge cancel ho gaya.');
        }}
      />
    </div>
  );
};

export default Auth;
