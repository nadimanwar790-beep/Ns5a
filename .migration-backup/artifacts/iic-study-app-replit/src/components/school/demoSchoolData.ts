import {
  currentMonthStr,
  getSessions,
  saveClass,
  saveExam,
  saveFee,
  saveSession,
  saveStudent,
  saveSubject,
} from "../../school-firebase";
import type { ExamEntry, SchoolClass, SchoolSession, SchoolStudent } from "../../school-types";

export const DEMO_SESSION_ID = "demo_session_2026_27";
export const DEMO_SESSION_NAME = "DEMO • 2026-27";

const classNames = ["Play", ...Array.from({ length: 10 }, (_, index) => `Class ${index + 1}`)];
const subjectNames = [
  "English",
  "Hindi",
  "Mathematics",
  "Environmental Studies",
  "General Science",
  "Social Studies",
  "Computer Studies",
  "General Knowledge",
  "Art & Craft",
  "Physical Education",
];
const demoFirstNames = ["Aarav", "Anaya", "Vivaan", "Diya", "Ishaan", "Saanvi", "Advik", "Myra", "Reyansh", "Aadhya"];

export async function seedDemoSchoolData(schoolId: string, adminUid: string) {
  const existingSessions = await getSessions(schoolId);
  const existingDemoSession = existingSessions.find(session => session.id === DEMO_SESSION_ID);
  const session: SchoolSession = {
    id: DEMO_SESSION_ID,
    schoolId,
    name: DEMO_SESSION_NAME,
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    active: existingDemoSession?.active || false,
    createdAt: existingDemoSession?.createdAt || new Date().toISOString(),
  };

  await saveSession(session);
  const month = currentMonthStr();
  const today = new Date().toISOString().slice(0, 10);
  const createdClasses: SchoolClass[] = [];
  let studentCount = 0;
  let subjectCount = 0;
  let examCount = 0;

  for (const [classIndex, name] of classNames.entries()) {
    const classKey = classIndex === 0 ? "play" : String(classIndex);
    const classId = `demo_class_${classKey}`;
    const defaultFee = 500 + classIndex * 125;
    const schoolClass: SchoolClass = {
      id: classId,
      schoolId,
      sessionId: session.id,
      name,
      section: "A",
      defaultFee,
      createdAt: session.createdAt,
    };
    createdClasses.push(schoolClass);

    const subjects = subjectNames.map((subjectName, subjectIndex) => ({
      id: `demo_subject_${classKey}_${subjectIndex + 1}`,
      schoolId,
      sessionId: session.id,
      classId,
      name: subjectName,
      createdAt: session.createdAt,
    }));

    const students: SchoolStudent[] = demoFirstNames.map((firstName, studentIndex) => {
      const studentNo = studentIndex + 1;
      const suffix = String(studentNo).padStart(2, "0");
      return {
        id: `demo_student_${classKey}_${suffix}`,
        schoolId,
        sessionId: session.id,
        classId,
        name: `${firstName} Demo ${suffix}`,
        rollNo: String(classIndex * 100 + studentNo),
        admissionNo: `D-${classKey.toUpperCase()}-${suffix}`,
        fatherName: `Demo Guardian ${suffix}`,
        motherName: `Demo Parent ${suffix}`,
        phone: "",
        dateOfBirth: `201${Math.max(0, 7 - Math.min(classIndex, 7))}-06-${String(10 + studentIndex).padStart(2, "0")}`,
        monthlyFee: defaultFee,
        joinDate: "2026-04-01",
        active: true,
        createdAt: session.createdAt,
      };
    });

    const exams: ExamEntry[] = subjects.map((subject, subjectIndex) => {
      const studentMarks: ExamEntry["studentMarks"] = {};
      students.forEach((student, studentIndex) => {
        studentMarks[student.id] = {
          marks: 55 + ((classIndex * 7 + studentIndex * 3 + subjectIndex * 5) % 46),
          studentName: student.name,
          rollNo: student.rollNo,
        };
      });
      return {
        id: `demo_exam_${classKey}_${subjectIndex + 1}`,
        schoolId,
        sessionId: session.id,
        classId,
        subjectId: subject.id,
        subjectName: subject.name,
        examName: "Demo Term 1",
        examDate: "2026-10-15",
        maxMarks: 100,
        markedBy: adminUid,
        studentMarks,
        createdAt: session.createdAt,
      };
    });

    const fees = students.map((student, studentIndex) => {
      const isPaid = studentIndex < 6;
      return saveFee({
        schoolId,
        sessionId: session.id,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        classId,
        month,
        amount: defaultFee,
        paid: isPaid,
        paidDate: isPaid ? today : undefined,
        paidBy: isPaid ? adminUid : undefined,
        receiptNo: isPaid ? `DEMO-RCP-${classKey}-${String(studentIndex + 1).padStart(2, "0")}-${month}` : undefined,
        note: "Demo monthly fee",
      });
    });

    await saveClass(schoolClass);
    await Promise.all([
      ...subjects.map(saveSubject),
      ...students.map(saveStudent),
      ...exams.map(saveExam),
      ...fees,
    ]);

    studentCount += students.length;
    subjectCount += subjects.length;
    examCount += exams.length;
  }

  return {
    session,
    classes: createdClasses.length,
    students: studentCount,
    subjects: subjectCount,
    exams: examCount,
    month,
  };
}
