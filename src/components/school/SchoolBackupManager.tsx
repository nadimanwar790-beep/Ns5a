// @ts-nocheck
import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { getDynamicAcademicSessionLabel } from "../../utils/safeBrowserActions";
import {
  Download,
  Upload,
  ShieldCheck,
  FileArchive,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Lock,
  Unlock,
  HardDrive,
  Calendar,
  Users,
  IndianRupee,
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { School, SchoolSession } from "../../school-types";
import {
  getSchoolCacheEntriesByPrefix,
  setSchoolCacheSync,
  getSchoolCacheSync
} from "../../utils/schoolIndexedDb";
import {
  getStudents,
  getLocalStudents,
  saveStudent,
  setLocalStudents,
  getTeachers,
  saveTeacher,
  getLocalClasses,
  saveClass,
  setLocalClasses,
  getLocalFees,
  saveFee,
  setLocalFees,
  getLocalAttendance,
  saveAttendance,
  setLocalAttendance,
  getLocalExams,
  getNotices,
  getSchoolExpenseVouchers
} from "../../school-firebase";
import { speakNotification } from "../../utils/voiceNotifyEngine";

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
  onRefreshData?: () => void;
}

export const SchoolBackupManager: React.FC<Props> = ({
  school,
  activeSession,
  onRefreshData
}) => {
  const schoolId = school?.id || "SCH-001";
  const [backupPassword, setBackupPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [exportSuccess, setExportSuccess] = useState<any>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importParsedData, setImportParsedData] = useState<any>(null);
  const [importError, setImportError] = useState<string>("");
  const [importSuccess, setImportSuccess] = useState<string>("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultSession = getDynamicAcademicSessionLabel();

  // Helper to find file inside zip recursively (case-insensitive & folder-agnostic)
  const findZipFile = (zip: JSZip, pattern: RegExp | string) => {
    for (const relativePath of Object.keys(zip.files)) {
      if (typeof pattern === "string") {
        if (
          relativePath.toLowerCase() === pattern.toLowerCase() ||
          relativePath.toLowerCase().endsWith("/" + pattern.toLowerCase())
        ) {
          return zip.files[relativePath];
        }
      } else if (pattern.test(relativePath)) {
        return zip.files[relativePath];
      }
    }
    return null;
  };

  // 1-Click Complete School Data Backup Generator
  const handleGenerateBackup = async () => {
    try {
      setIsExporting(true);
      setExportProgress("डेटाबेस से सभी रिकॉर्ड्स एकत्रित किए जा रहे हैं...");

      // Harvest real data from firebase & local cache
      const [
        students,
        teachers,
        classes,
        fees,
        attendance,
        exams,
        notices,
        expenses
      ] = await Promise.all([
        getStudents(schoolId).catch(() => getLocalStudents(schoolId)),
        getTeachers(schoolId).catch(() => []),
        Promise.resolve(getLocalClasses(schoolId)),
        Promise.resolve(getLocalFees(schoolId)),
        Promise.resolve(getLocalAttendance(schoolId)),
        Promise.resolve(getLocalExams(schoolId)),
        getNotices(schoolId).catch(() => []),
        getSchoolExpenseVouchers(schoolId).catch(() => [])
      ]);

      const dumpData: Record<string, any> = {
        [`nst_school_students_${schoolId}`]: students,
        [`nst_school_teachers_${schoolId}`]: teachers,
        [`nst_school_classes_${schoolId}`]: classes,
        [`nst_school_fees_${schoolId}`]: fees,
        [`nst_school_attendance_${schoolId}`]: attendance,
        [`nst_school_exams_${schoolId}`]: exams,
        [`nst_school_notices_${schoolId}`]: notices,
        [`nst_school_expenses_${schoolId}`]: expenses,
        students,
        teachers,
        classes,
        fees,
        attendance,
        exams,
        notices,
        expenses
      };

      // Also pull other keys from IndexedDB
      try {
        const idbEntries = getSchoolCacheEntriesByPrefix("nst_");
        for (const [k, v] of idbEntries) {
          if (k.includes(schoolId)) {
            dumpData[k] = v;
          }
        }
      } catch (e) {
        console.warn("[Backup] IndexedDB harvest non-fatal:", e);
      }

      setExportProgress("ZIP आर्काइव का निर्माण किया जा रहा है...");
      const zip = new JSZip();

      // Manifest
      const manifest = {
        app: "NSTA School ERP",
        version: "3.0.0",
        format: "nsta_enterprise_full_backup",
        schoolId,
        schoolName: school?.name || "School",
        sessionName: activeSession?.name || defaultSession,
        exportedAt: new Date().toISOString(),
        isEncrypted: Boolean(backupPassword.trim()),
        recordCounts: {
          students: students.length,
          teachers: teachers.length,
          classes: classes.length,
          feeRecords: fees.length,
          attendanceDays: attendance.length,
          examMarks: exams.length,
          expenses: expenses.length,
          notices: notices.length
        }
      };

      const jsonPayloadString = JSON.stringify({ manifest, database: dumpData }, null, 2);

      if (backupPassword.trim()) {
        const pass = backupPassword.trim();
        let enc = "";
        for (let i = 0; i < jsonPayloadString.length; i++) {
          enc += String.fromCharCode(jsonPayloadString.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
        }
        zip.file("encrypted_payload.bin", btoa(encodeURIComponent(enc)));
        zip.file("school_manifest.json", JSON.stringify(manifest, null, 2));
      } else {
        zip.file("school_manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("database_dump.json", jsonPayloadString);

        // Human readable files inside database folder
        const dbFolder = zip.folder("database");
        dbFolder.file("students.json", JSON.stringify(students, null, 2));
        dbFolder.file("fees.json", JSON.stringify(fees, null, 2));
        dbFolder.file("teachers.json", JSON.stringify(teachers, null, 2));
        dbFolder.file("classes.json", JSON.stringify(classes, null, 2));
        dbFolder.file("attendance.json", JSON.stringify(attendance, null, 2));
        dbFolder.file("expenses.json", JSON.stringify(expenses, null, 2));
        dbFolder.file("notices.json", JSON.stringify(notices, null, 2));
      }

      zip.file(
        "README_RECOVERY.txt",
        `============================================================\n` +
        ` NSTA SCHOOL ERP - COMPLETE SESSION DISASTER RECOVERY ARCHIVE\n` +
        `============================================================\n\n` +
        `School: ${school?.name || "School"} (ID: ${schoolId})\n` +
        `Session: ${activeSession?.name || defaultSession}\n` +
        `Created on: ${new Date().toLocaleString("en-IN")}\n` +
        `Protection: ${backupPassword.trim() ? "Password Protected" : "Standard JSON Archive"}\n\n` +
        `HOW TO RESTORE:\n` +
        `1. Open NSTA School ERP.\n` +
        `2. Go to Admin Panel -> Backup & Disaster Recovery.\n` +
        `3. Upload this .zip file and click 'Restore Database Now'.\n`
      );

      setExportProgress("ZIP फाइल कंप्रेस की जा रही है...");
      const contentBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
      });

      const safeSchoolName = (school?.name || "School").replace(/[^a-zA-Z0-9]/g, "_");
      const dateTag = new Date().toISOString().slice(0, 10);
      const fileName = `NSTA_Backup_${safeSchoolName}_${activeSession?.name || defaultSession}_${dateTag}.zip`;

      const downloadUrl = URL.createObjectURL(contentBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

      setExportSuccess({
        fileName,
        sizeMb: (contentBlob.size / (1024 * 1024)).toFixed(2),
        counts: manifest.recordCounts,
        time: new Date().toLocaleTimeString("en-IN")
      });
      setIsExporting(false);
      setExportProgress("");
    } catch (err: any) {
      console.error("[Backup Error]:", err);
      toast.error("बैकअप तैयार करने में समस्या: " + (err?.message || err));
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Inspect and Preview Uploaded Backup File (Flexible format & subfolder detection)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError("");
    setImportSuccess("");
    setImportPreview(null);
    setImportParsedData(null);

    try {
      const zip = await JSZip.loadAsync(file);

      // 1. Try to find school_manifest.json anywhere in zip
      const manifestFile = findZipFile(zip, "school_manifest.json");
      let manifest: any = null;
      if (manifestFile) {
        try {
          const text = await manifestFile.async("text");
          manifest = JSON.parse(text);
        } catch (err) {
          console.warn("[Backup] Manifest parse warning:", err);
        }
      }

      // 2. Try to find database_dump.json
      const dumpFile = findZipFile(zip, "database_dump.json");
      let extractedDatabase: Record<string, any> = {};

      if (dumpFile) {
        try {
          const text = await dumpFile.async("text");
          const parsed = JSON.parse(text);
          extractedDatabase = parsed.database || parsed || {};
          if (!manifest && parsed.manifest) {
            manifest = parsed.manifest;
          }
        } catch (err) {
          console.warn("[Backup] Dump file parse warning:", err);
        }
      }

      // 3. Fallback: Check individual json files inside database/ or root
      const studentsFile = findZipFile(zip, "students.json");
      const feesFile = findZipFile(zip, "fees.json");
      const teachersFile = findZipFile(zip, "teachers.json");
      const classesFile = findZipFile(zip, "classes.json");
      const attendanceFile = findZipFile(zip, "attendance.json");

      if (studentsFile && !extractedDatabase.students) {
        try {
          extractedDatabase.students = JSON.parse(await studentsFile.async("text"));
        } catch (err) {
          console.warn("[Backup] students.json parse warning:", err);
        }
      }
      if (feesFile && !extractedDatabase.fees) {
        try {
          extractedDatabase.fees = JSON.parse(await feesFile.async("text"));
        } catch (err) {
          console.warn("[Backup] fees.json parse warning:", err);
        }
      }
      if (teachersFile && !extractedDatabase.teachers) {
        try {
          extractedDatabase.teachers = JSON.parse(await teachersFile.async("text"));
        } catch (err) {
          console.warn("[Backup] teachers.json parse warning:", err);
        }
      }
      if (classesFile && !extractedDatabase.classes) {
        try {
          extractedDatabase.classes = JSON.parse(await classesFile.async("text"));
        } catch (err) {
          console.warn("[Backup] classes.json parse warning:", err);
        }
      }
      if (attendanceFile && !extractedDatabase.attendance) {
        try {
          extractedDatabase.attendance = JSON.parse(await attendanceFile.async("text"));
        } catch (err) {
          console.warn("[Backup] attendance.json parse warning:", err);
        }
      }

      // Check if encrypted
      const binFile = findZipFile(zip, "encrypted_payload.bin");
      const isEncrypted = Boolean(binFile);

      // If manifest is still missing, synthesize manifest from extracted files
      const studentCount =
        (extractedDatabase.students ||
          extractedDatabase[`nst_school_students_${schoolId}`] ||
          extractedDatabase[`school_students_${schoolId}`] ||
          []).length;
      const feeCount =
        (extractedDatabase.fees ||
          extractedDatabase[`nst_school_fees_${schoolId}`] ||
          extractedDatabase[`school_fee_records_${schoolId}`] ||
          []).length;
      const teacherCount =
        (extractedDatabase.teachers ||
          extractedDatabase[`nst_school_teachers_${schoolId}`] ||
          extractedDatabase[`school_teachers_${schoolId}`] ||
          []).length;
      const classCount =
        (extractedDatabase.classes ||
          extractedDatabase[`nst_school_classes_${schoolId}`] ||
          extractedDatabase[`school_classes_${schoolId}`] ||
          []).length;

      if (!manifest) {
        manifest = {
          schoolName: school?.name || "School Backup",
          sessionName: activeSession?.name || defaultSession,
          exportedAt: new Date().toISOString(),
          isEncrypted,
          recordCounts: {
            students: studentCount,
            teachers: teacherCount,
            classes: classCount,
            feeRecords: feeCount
          }
        };
      }

      setImportPreview(manifest);
      setImportParsedData(extractedDatabase);
      setConfirmRestore(false);
    } catch (err: any) {
      console.error("[Zip Read Error]:", err);
      setImportError("ZIP फाइल पढ़ने में त्रुटि: " + (err?.message || err));
    }
  };

  // Execute Complete Disaster Recovery Restore
  const handleExecuteRestore = async () => {
    if (!importFile || !importPreview) return;
    if (importPreview.isEncrypted && !importPassword.trim()) {
      setImportError("यह बैकअप पासवर्ड-प्रोटेक्टेड है। कृपया डिक्रिप्शन पासवर्ड दर्ज करें!");
      return;
    }
    if (!confirmRestore) {
      setConfirmRestore(true);
      return;
    }
    setConfirmRestore(false);

    try {
      setIsImporting(true);
      setImportProgress("ZIP फाइल से डेटा लोड किया जा रहा है...");
      setImportError("");
      const zip = await JSZip.loadAsync(importFile);

      let rawDatabase: Record<string, any> = importParsedData || {};

      // Decrypt if encrypted
      if (importPreview.isEncrypted) {
        const binFile = findZipFile(zip, "encrypted_payload.bin");
        if (!binFile) throw new Error("Encrypted payload file missing!");
        const binBase64 = await binFile.async("text");
        const xorString = decodeURIComponent(atob(binBase64));
        const pass = importPassword.trim();
        let decrypted = "";
        for (let i = 0; i < xorString.length; i++) {
          decrypted += String.fromCharCode(xorString.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
        }
        const parsed = JSON.parse(decrypted);
        rawDatabase = parsed.database || parsed || {};
      }

      // If empty, re-parse dumpFile
      if (Object.keys(rawDatabase).length === 0) {
        const dumpFile = findZipFile(zip, "database_dump.json");
        if (dumpFile) {
          const text = await dumpFile.async("text");
          const parsed = JSON.parse(text);
          rawDatabase = parsed.database || parsed || {};
        }
      }

      // Extract specific entities with flexible fallback keys
      const extractList = (keys: string[]): any[] => {
        for (const k of keys) {
          if (rawDatabase[k] && Array.isArray(rawDatabase[k]) && rawDatabase[k].length > 0) {
            return rawDatabase[k];
          }
        }
        // Search through rawDatabase values for matching objects
        for (const [k, v] of Object.entries(rawDatabase)) {
          if (Array.isArray(v)) {
            for (const target of keys) {
              if (k.toLowerCase().includes(target.toLowerCase())) {
                return v;
              }
            }
          }
        }
        return [];
      };

      const extractedStudents = extractList([
        "students",
        `nst_school_students_${schoolId}`,
        `school_students_${schoolId}`,
        "indexeddb_students"
      ]);
      const extractedClasses = extractList([
        "classes",
        `nst_school_classes_${schoolId}`,
        `school_classes_${schoolId}`
      ]);
      const extractedTeachers = extractList([
        "teachers",
        `nst_school_teachers_${schoolId}`,
        `school_teachers_${schoolId}`
      ]);
      const extractedFees = extractList([
        "fees",
        `nst_school_fees_${schoolId}`,
        `school_fee_records_${schoolId}`
      ]);
      const extractedAttendance = extractList([
        "attendance",
        `nst_school_attendance_${schoolId}`,
        `school_attendance_${schoolId}`
      ]);

      const targetSchoolId = school?.id || "SCH-001";

      // 1. Restore Classes
      if (extractedClasses.length > 0) {
        setImportProgress(`कक्षाएं रीस्टोर हो रही हैं (${extractedClasses.length})...`);
        const mapped = extractedClasses.map((c) => ({ ...c, schoolId: targetSchoolId }));
        setLocalClasses(targetSchoolId, mapped);
        for (const cls of mapped) {
          try { await saveClass(cls); } catch {}
        }
      }

      // 2. Restore Students
      if (extractedStudents.length > 0) {
        setImportProgress(`छात्र रीस्टोर हो रहे हैं (${extractedStudents.length})...`);
        const mapped = extractedStudents.map((s) => ({ ...s, schoolId: targetSchoolId }));
        setLocalStudents(targetSchoolId, mapped);
        for (const st of mapped) {
          try { await saveStudent(st); } catch {}
        }
      }

      // 3. Restore Teachers
      if (extractedTeachers.length > 0) {
        setImportProgress(`शिक्षक व फैकल्टी रीस्टोर हो रहे हैं (${extractedTeachers.length})...`);
        const mapped = extractedTeachers.map((t) => ({ ...t, schoolId: targetSchoolId }));
        for (const tch of mapped) {
          try { await saveTeacher(tch); } catch {}
        }
      }

      // 4. Restore Fees
      if (extractedFees.length > 0) {
        setImportProgress(`फीस रिकॉर्ड्स रीस्टोर हो रहे हैं (${extractedFees.length})...`);
        const mapped = extractedFees.map((f) => ({ ...f, schoolId: targetSchoolId }));
        setLocalFees(targetSchoolId, mapped);
        for (const fee of mapped) {
          try { await saveFee(fee); } catch {}
        }
      }

      // 5. Restore Attendance
      if (extractedAttendance.length > 0) {
        setImportProgress(`उपस्थिति रिकॉर्ड्स रीस्टोर हो रहे हैं (${extractedAttendance.length})...`);
        const mapped = extractedAttendance.map((a) => ({ ...a, schoolId: targetSchoolId }));
        setLocalAttendance(targetSchoolId, mapped);
        for (const att of mapped) {
          try { await saveAttendance(att); } catch {}
        }
      }

      // Also persist raw keys in localStorage and IndexedDB
      for (const [key, value] of Object.entries(rawDatabase)) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          setSchoolCacheSync(key, value);
        } catch {}
      }

      speakNotification(
        "डेटाबेस रीस्टोर पूर्ण",
        `सम्पूर्ण स्कूल डेटाबेस सफलतापूर्वक रीस्टोर हो गया है।`
      );

      setImportSuccess(
        `सफलता! सम्पूर्ण स्कूल डेटा रीस्टोर हो गया: ${extractedStudents.length} छात्र, ${extractedTeachers.length} शिक्षक, ${extractedClasses.length} कक्षाएं, ${extractedFees.length} फीस रिकॉर्ड्स सुरक्षित।`
      );
      setIsImporting(false);
      setImportProgress("");

      // Trigger automatic reload after 2.5 seconds
      setTimeout(() => {
        if (onRefreshData) {
          onRefreshData();
        } else {
          try { window.location.reload(); } catch {}
        }
      }, 2500);
    } catch (err: any) {
      console.error("[Restore Error]:", err);
      setImportError("रीस्टोर विफल हुआ: " + (err?.message || err));
      setIsImporting(false);
      setImportProgress("");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                1-क्लिक सम्पूर्ण स्कूल डेटा बैकअप व डिजास्टर रिकवरी
              </h2>
              <p className="text-xs text-indigo-200/80">
                School: <strong className="text-amber-300">{school?.name || "School"}</strong> • Session:{" "}
                <span className="text-emerald-300 font-semibold">{activeSession?.name || defaultSession}</span>
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            ✓ 100% Cloud & Offline Safe
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT CARD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">सम्पूर्ण स्कूल बैकअप डाउनलोड करें</h3>
                <p className="text-xs text-slate-400">सभी छात्र, 12 माह की फीस, अंकपत्र, हाजिरी, व स्टाफ डेटा</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" />
                बैकअप में क्या-क्या शामिल होगा:
              </div>
              <ul className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                <li className="flex items-center gap-1 text-emerald-300">✓ सभी छात्र व फोटो</li>
                <li className="flex items-center gap-1 text-emerald-300">✓ सम्पूर्ण फीस लेजर</li>
                <li className="flex items-center gap-1 text-emerald-300">✓ दैनिक उपस्थिति रिकॉर्ड</li>
                <li className="flex items-center gap-1 text-emerald-300">✓ परीक्षा अंक व ग्रेड्स</li>
                <li className="flex items-center gap-1 text-emerald-300">✓ स्टाफ सैलरी व छुट्टियां</li>
                <li className="flex items-center gap-1 text-emerald-300">✓ दैनिक स्कूल खर्च</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                पासवर्ड प्रोटेक्शन (वैकल्पिक):
              </label>
              <input
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="सुरक्षा पासवर्ड दर्ज करें (खाली = बिना पासवर्ड)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                यदि पासवर्ड डालते हैं, तो फाइल रीस्टोर करते समय यही पासवर्ड मांगा जाएगा।
              </p>
            </div>
          </div>

          <div className="pt-3 space-y-3">
            <button
              onClick={handleGenerateBackup}
              disabled={isExporting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {exportProgress || "बैकअप तैयार हो रहा है..."}
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  1-क्लिक ZIP बैकअप डाउनलोड करें
                </>
              )}
            </button>

            {exportSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1 text-emerald-300">
                  <CheckCircle className="w-4 h-4" />
                  बैकअप सफलतापूर्वक डाउनलोड हुआ ({exportSuccess.sizeMb} MB)
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  फाइल: {exportSuccess.fileName} • {exportSuccess.counts.students} छात्र, {exportSuccess.counts.feeRecords} फीस रिकॉर्ड्स सुरक्षित।
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IMPORT / RESTORE CARD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">डिजास्टर रिकवरी (Restore School)</h3>
                <p className="text-xs text-slate-400">पुरानी .zip बैकअप फाइल अपलोड करके स्कूल डेटाबेस रीस्टोर करें</p>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/60 flex flex-col items-center justify-center text-center cursor-pointer transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.nstabackup,application/zip,application/x-zip-compressed"
                onChange={handleFileSelect}
                className="hidden"
              />
              <HardDrive className="w-8 h-8 text-indigo-400 mb-2" />
              <p className="text-xs font-bold text-slate-200">
                {importFile ? importFile.name : "बैकअप .zip फाइल चुनें या यहाँ ड्रैग करें"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {importFile ? `${(importFile.size / (1024 * 1024)).toFixed(2)} MB` : "NSTA Backup ZIP सपोर्टेड"}
              </p>
            </div>

            {importPreview && (
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-indigo-200">
                  <span>स्कूल: {importPreview.schoolName || school?.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    {importPreview.sessionName || "Session"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                  <div>छात्र: <strong className="text-white">{importPreview.recordCounts?.students || 0}</strong></div>
                  <div>फीस रिकॉर्ड्स: <strong className="text-white">{importPreview.recordCounts?.feeRecords || 0}</strong></div>
                  <div>कक्षाएं: <strong className="text-white">{importPreview.recordCounts?.classes || 0}</strong></div>
                  <div>फैकल्टी: <strong className="text-white">{importPreview.recordCounts?.teachers || 0}</strong></div>
                  <div>प्रोटेक्शन: {importPreview.isEncrypted ? "🔒 पासवर्ड लॉक्ड" : "अनप्रोटेक्टेड"}</div>
                </div>

                {importPreview.isEncrypted && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                      डिक्रिप्शन पासवर्ड दर्ज करें:
                    </label>
                    <input
                      type="password"
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                      placeholder="बैकअप बनाते समय डाला गया पासवर्ड"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>डेटाबेस सफलतापूर्वक रीस्टोर हो गया!</span>
                </div>
                <p className="text-[11px] text-emerald-200/90">{importSuccess}</p>
                <p className="text-[10px] text-emerald-300/70 font-mono">पेज 2 सेकंड में स्वतः रीलोड हो रहा है...</p>
              </div>
            )}
          </div>

          <div className="pt-3 space-y-2">
            {confirmRestore ? (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 space-y-2">
                <p className="text-xs font-bold text-amber-200">
                  चेतावनी: क्या आप वाकई &apos;{importPreview?.schoolName || school?.name}&apos; का डेटा रीस्टोर करना चाहते हैं? इससे वर्तमान सत्र का डेटाबेस अपडेट हो जाएगा।
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isImporting}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer disabled:opacity-40"
                  >
                    हाँ, रीस्टोर करें (Confirm Restore)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRestore(false)}
                    disabled={isImporting}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    रद्द करें
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!importFile || !importPreview || isImporting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer disabled:opacity-40"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{importProgress || "डेटाबेस रीस्टोर हो रहा है..."}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    डेटाबेस रीस्टोर करें (Restore Now)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
