// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Sparkles,
  Award,
  Clock,
  Layers,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Settings2,
  Columns2,
  AlertCircle,
  Calendar,
  Check,
  X,
  BookOpen
} from "lucide-react";
import { School, SchoolSession } from "../../school-types";

export interface ExamQuestion {
  id: string;
  section: "A" | "B" | "C" | "D" | "E";
  qNo: number;
  questionText: string;
  options?: string[]; // For Section A MCQs (e.g. 4 options)
  orQuestionText?: string; // For Section D/internal choice ('अथवा')
  marks: number;
  answerKeyText?: string; // Teacher model answer / marking key
}

const SECTION_METADATA: Record<string, { label: string; desc: string; defaultMarks: number }> = {
  A: { label: "खण्ड 'क' (Section A)", desc: "वस्तुनिष्ठ प्रश्न (MCQ / Objective)", defaultMarks: 1 },
  B: { label: "खण्ड 'ख' (Section B)", desc: "अति लघु उत्तरीय (Very Short Answer)", defaultMarks: 2 },
  C: { label: "खण्ड 'ग' (Section C)", desc: "लघु उत्तरीय (Short Answer)", defaultMarks: 3 },
  D: { label: "खण्ड 'घ' (Section D)", desc: "दीर्घ उत्तरीय व अथवा विकल्प (Long Answer / OR)", defaultMarks: 5 },
  E: { label: "खण्ड 'ङ' (Section E)", desc: "केस आधारित / स्रोत आधारित (Case-Based)", defaultMarks: 4 },
};

const STANDARD_EXAM_PRESETS = [
  "Unit Test - 1 (इकाई परीक्षा 1)",
  "Unit Test - 2 (इकाई परीक्षा 2)",
  "Periodic Assessment - 1 (PA-1)",
  "Periodic Assessment - 2 (PA-2)",
  "Quarterly Examination (त्रैमासिक परीक्षा)",
  "Mid-Term Examination (मध्य-सत्र परीक्षा)",
  "Half Yearly Examination (अर्धवार्षिक परीक्षा 2026-27)",
  "Pre-Board Examination (प्री-बोर्ड परीक्षा)",
  "Annual Board Examination 2026-27 (वार्षिक परीक्षा)",
];

const DEFAULT_INSTRUCTIONS = [
  "सभी प्रश्न अनिवार्य हैं। (All questions are compulsory).",
  "इस प्रश्न-पत्र में कुल 5 खण्ड हैं: खण्ड क, खण्ड ख, खण्ड ग, खण्ड घ और खण्ड ङ।",
  "खण्ड 'क' में 1 अंक वाले वस्तुनिष्ठ प्रश्न हैं।",
  "खण्ड 'घ' में कुछ प्रश्नों में आंतरिक विकल्प (Internal Choice 'अथवा') दिया गया है।",
  "कैलकुलेटर या किसी भी इलेक्ट्रॉनिक उपकरण का प्रयोग वर्जित है।"
];

const INITIAL_SCIENCE_QUESTIONS: ExamQuestion[] = [
  { id: "q1", section: "A", qNo: 1, questionText: "Fe₂O₃ + 2Al → Al₂O₃ + 2Fe. ऊपर दी गई अभिक्रिया किस प्रकार की है?", options: ["संयोजन अभिक्रिया", "द्विविस्थापन अभिक्रिया", "वियोजन अभिक्रिया", "विस्थापन अभिक्रिया"], marks: 1, answerKeyText: "उत्तर: (d) विस्थापन अभिक्रिया" },
  { id: "q2", section: "A", qNo: 2, questionText: "मानव नेत्र के किस भाग पर किसी वस्तु का प्रतिबिम्ब बनता है?", options: ["कॉर्निया", "परितारिका", "पुतली", "दृष्टिपटल (रेटिना)"], marks: 1, answerKeyText: "उत्तर: (d) दृष्टिपटल (रेटिना)" },
  { id: "q3", section: "A", qNo: 3, questionText: "विद्युत धारा का SI मात्रक क्या है?", options: ["वोल्ट (V)", "एम्पियर (A)", "ओम (Ω)", "वाट (W)"], marks: 1, answerKeyText: "उत्तर: (b) एम्पियर (A)" },
  { id: "q4", section: "A", qNo: 4, questionText: "लिटमस विलयन जो बैंगनी रंग का रंजक होता है, किस पौधे से निकाला जाता है?", options: ["लाइकेन", "लाल पत्तागोभी", "हल्दी", "पेटूनिया"], marks: 1, answerKeyText: "उत्तर: (a) लाइकेन" },
  { id: "q5", section: "B", qNo: 5, questionText: "उभयधर्मी ऑक्साइड क्या होते हैं? किन्हीं दो उभयधर्मी ऑक्साइडों के नाम और सूत्र लिखिए।", marks: 2, answerKeyText: "उत्तर: जो अम्ल और क्षार दोनों से क्रिया करके लवण व जल बनाते हैं। उदाहरण: Al₂O₃, ZnO." },
  { id: "q6", section: "B", qNo: 6, questionText: "प्रकाश के परावर्तन के दोनों नियम लिखिए।", marks: 2, answerKeyText: "उत्तर: 1. आपतित किरण, परावर्तित किरण व अभिलंब एक ही तल में होते हैं। 2. आपतन कोण = परावर्तन कोण।" },
  { id: "q7", section: "C", qNo: 7, questionText: "पादपों में जाइलम तथा फ्लोएम द्वारा पदार्थों के संवहन में क्या अंतर है?", marks: 3, answerKeyText: "उत्तर: जाइलम जल व खनिज लवण का नीचे से ऊपर संवहन करता है। फ्लोएम भोजन का पत्तियों से सभी अंगों में संवहन करता है।" },
  { id: "q8", section: "C", qNo: 8, questionText: "ओम का नियम लिखिए तथा इसका गणितीय सूत्र स्पष्ट कीजिए।", marks: 3, answerKeyText: "उत्तर: V = I × R (नियत ताप पर चालक के सिरों का विभवांतर प्रवाहित धारा के समानुपाती होता है)।" },
  { id: "q9", section: "D", qNo: 9, questionText: "मानव हृदय की संरचना का स्वच्छ नामांकित चित्र बनाइए तथा इसके दोहरे परिसंचरण को समझाइए।", orQuestionText: "मानव उत्सर्जन तंत्र का नामांकित चित्र बनाकर नेफ्रॉन (वृक्काणु) की कार्यप्रणाली स्पष्ट कीजिए।", marks: 5, answerKeyText: "उत्तर: हृदय का चित्र (अलिंद/निलय) + शुद्ध व अशुद्ध रक्त का पृथक् संचरण दोहरा परिसंचरण कहलाता है।" },
  { id: "q10", section: "E", qNo: 10, questionText: "केस आधारित प्रश्न: 15 cm फोकस दूरी वाले अवतल दर्पण के सामने 30 cm की दूरी पर एक मोमबत्ती रखी गई है।\n(a) प्रतिबिम्ब की स्थिति (v) ज्ञात कीजिए।\n(b) प्रतिबिम्ब की प्रकृति और आवर्धन क्या होगा?", marks: 4, answerKeyText: "उत्तर: (a) v = -30 cm (दर्पण के सामने 30 cm पर वक्रता केंद्र पर)। (b) वास्तविक, उल्टा तथा आवर्धन m = -1." }
];

const INITIAL_MATHS_QUESTIONS: ExamQuestion[] = [
  { id: "qm1", section: "A", qNo: 1, questionText: "यदि द्विघात समीकरण 2x² - kx + 3 = 0 के दोनों मूल बराबर हों, तो k का मान होगा:", options: ["±2√6", "±√6", "±3", "±4"], marks: 1, answerKeyText: "उत्तर: (a) D = k² - 24 = 0 => k = ±2√6" },
  { id: "qm2", section: "A", qNo: 2, questionText: "समांतर श्रेणी 3, 8, 13, 18,... का कौन सा पद 78 है?", options: ["12वां", "14वां", "16वां", "18वां"], marks: 1, answerKeyText: "उत्तर: (c) an = a + (n-1)d = 3 + 5(n-1) = 78 => n = 16" },
  { id: "qm3", section: "A", qNo: 3, questionText: "बिंदु (-3, 4) की x-अक्ष से लम्बवत् दूरी क्या होगी?", options: ["3 इकाई", "4 इकाई", "-3 इकाई", "5 इकाई"], marks: 1, answerKeyText: "उत्तर: (b) 4 इकाई (y-निर्देशांक का परिमाण)" },
  { id: "qm4", section: "B", qNo: 4, questionText: "सिद्ध कीजिए कि √5 एक अपरिमेय संख्या है।", marks: 2, answerKeyText: "उत्तर: विरोधाभास विधि (Contradiction method) द्वारा p/q मानकर सह-अभाज्य गुणनखंड असम्भव सिद्ध करना।" },
  { id: "qm5", section: "B", qNo: 5, questionText: "द्विघात बहुपद x² + 7x + 10 के शून्यक ज्ञात कीजिए तथा शून्यकों और गुणांकों के संबंध की सत्यता की जांच कीजिए।", marks: 2, answerKeyText: "उत्तर: शून्यक = -2 और -5. योगफल = -7 = -b/a, गुणनफल = 10 = c/a." },
  { id: "qm6", section: "C", qNo: 6, questionText: "बिंदुओं (4, -1) और (-2, -3) को जोड़ने वाले रेखाखंड को समत्रिभाजित करने वाले बिंदुओं के निर्देशांक ज्ञात कीजिए।", marks: 3, answerKeyText: "उत्तर: विभाजन सूत्र से P(2, -5/3) और Q(0, -7/3)।" },
  { id: "qm7", section: "D", qNo: 7, questionText: "एक 80 m चौड़ी सड़क के दोनों ओर आमने-सामने समान लंबाई वाले दो खंभे लगे हैं। सड़क के एक बिंदु से खंभों के शिखर के उन्नयन कोण 60° और 30° हैं। खंभों की ऊंचाई और खंभों से बिंदु की दूरियां ज्ञात कीजिए।", orQuestionText: "सिद्ध कीजिए कि किसी बाह्य बिंदु से वृत्त पर खींची गई दो स्पर्श रेखाओं की लंबाइयां बराबर होती हैं।", marks: 5, answerKeyText: "उत्तर: ऊंचाई = 20√3 m, दूरियां = 20 m व 60 m।" }
];

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
}

export const QuestionPaperBuilder: React.FC<Props> = ({ school, activeSession }) => {
  const schoolId = school?.id || "SCH-DPS";
  const defaultSchoolName = school?.name || "DELHI PUBLIC SCHOOL GURGAON";
  const defaultAffiliation = school?.affiliation || "Affiliated to CBSE, New Delhi • Affiliation Code: 1030456";

  // Core Exam Metadata
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [selectedSubject, setSelectedSubject] = useState("Science");
  const [subjectCode, setSubjectCode] = useState("086");
  const [customExamTitle, setCustomExamTitle] = useState("Half Yearly Examination (अर्धवार्षिक परीक्षा 2026-27)");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [timeAllowed, setTimeAllowed] = useState("3 Hours (3 घंटे)");
  const [maxMarks, setMaxMarks] = useState(80);

  // School Header Customization
  const [schoolName, setSchoolName] = useState(defaultSchoolName);
  const [schoolSubHeader, setSchoolSubHeader] = useState(defaultAffiliation);
  const [schoolAddress, setSchoolAddress] = useState(school?.address || "Sector 45, Urban Estate, Gurgaon, Haryana");
  const [schoolLogo, setSchoolLogo] = useState(school?.logoUrl || "");
  const [showHeaderSettings, setShowHeaderSettings] = useState(false);

  // Instructions
  const [instructions, setInstructions] = useState<string[]>(DEFAULT_INSTRUCTIONS);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // Layout & Density for 1-to-2 page fitting
  const [pageDensity, setPageDensity] = useState<"compact" | "ultra_compact" | "standard">("compact");
  const [useTwoColumnsForMCQ, setUseTwoColumnsForMCQ] = useState(true);

  // Storage key
  const storageKey = `nst_qp_${schoolId}_${selectedClass}_${selectedSubject}`;

  // Questions List
  const [questions, setQuestions] = useState<ExamQuestion[]>(() => {
    try {
      const saved = localStorage.getItem(`nst_qp_${schoolId}_Class 10_Science`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SCIENCE_QUESTIONS;
  });

  // Active Print / Preview View
  const [activePrintView, setActivePrintView] = useState<"QUESTION_PAPER" | "MARKING_SCHEME" | null>(null);

  // Add / Edit Modal State
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  // Form fields for Question Modal
  const [modalSection, setModalSection] = useState<"A" | "B" | "C" | "D" | "E">("A");
  const [modalMarks, setModalMarks] = useState<number>(1);
  const [modalText, setModalText] = useState("");
  const [modalHasOptions, setModalHasOptions] = useState(true);
  const [modalOptions, setModalOptions] = useState<string[]>(["", "", "", ""]);
  const [modalHasOrChoice, setModalHasOrChoice] = useState(false);
  const [modalOrText, setModalOrText] = useState("");
  const [modalAnswerKey, setModalAnswerKey] = useState("");

  // Persist questions on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(questions));
    } catch {}
  }, [questions, storageKey]);

  // Handle Class or Subject change
  const handleSubjectChange = (newSub: string) => {
    setSelectedSubject(newSub);
    const codeMap: Record<string, string> = {
      Science: "086",
      Mathematics: "041",
      "Social Science": "087",
      Hindi: "002",
      English: "184",
    };
    if (codeMap[newSub]) setSubjectCode(codeMap[newSub]);

    const newKey = `nst_qp_${schoolId}_${selectedClass}_${newSub}`;
    try {
      const saved = localStorage.getItem(newKey);
      if (saved) {
        setQuestions(JSON.parse(saved));
        return;
      }
    } catch {}

    if (newSub === "Mathematics") {
      setQuestions(INITIAL_MATHS_QUESTIONS);
    } else {
      setQuestions(INITIAL_SCIENCE_QUESTIONS);
    }
  };

  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    const newKey = `nst_qp_${schoolId}_${newClass}_${selectedSubject}`;
    try {
      const saved = localStorage.getItem(newKey);
      if (saved) {
        setQuestions(JSON.parse(saved));
      }
    } catch {}
  };

  // Re-calculate Total Marks
  const totalCalculatedMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  }, [questions]);

  // Open Modal for New Question
  const handleOpenAddModal = (targetSection: "A" | "B" | "C" | "D" | "E" = "A") => {
    setEditingQuestion(null);
    setModalSection(targetSection);
    const defM = SECTION_METADATA[targetSection]?.defaultMarks || 1;
    setModalMarks(defM);
    setModalText("");
    setModalHasOptions(targetSection === "A");
    setModalOptions(["", "", "", ""]);
    setModalHasOrChoice(targetSection === "D");
    setModalOrText("");
    setModalAnswerKey("");
    setIsQuestionModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (q: ExamQuestion) => {
    setEditingQuestion(q);
    setModalSection(q.section);
    setModalMarks(q.marks);
    setModalText(q.questionText);
    setModalHasOptions(Boolean(q.options && q.options.length > 0));
    setModalOptions(q.options && q.options.length === 4 ? [...q.options] : ["", "", "", ""]);
    setModalHasOrChoice(Boolean(q.orQuestionText));
    setModalOrText(q.orQuestionText || "");
    setModalAnswerKey(q.answerKeyText || "");
    setIsQuestionModalOpen(true);
  };

  // Save Question (Add or Update)
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalText.trim()) return;

    if (editingQuestion) {
      // Update existing
      setQuestions((prev) =>
        prev.map((item) => {
          if (item.id === editingQuestion.id) {
            return {
              ...item,
              section: modalSection,
              marks: Number(modalMarks) || 1,
              questionText: modalText.trim(),
              options: modalHasOptions ? modalOptions.map((o) => o.trim()).filter(Boolean) : undefined,
              orQuestionText: modalHasOrChoice ? modalOrText.trim() : undefined,
              answerKeyText: modalAnswerKey.trim(),
            };
          }
          return item;
        })
      );
    } else {
      // Add new question
      const newQNo = questions.length > 0 ? Math.max(...questions.map((q) => q.qNo || 0)) + 1 : 1;
      const newQ: ExamQuestion = {
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        section: modalSection,
        qNo: newQNo,
        questionText: modalText.trim(),
        options: modalHasOptions ? modalOptions.map((o) => o.trim()).filter(Boolean) : undefined,
        orQuestionText: modalHasOrChoice ? modalOrText.trim() : undefined,
        marks: Number(modalMarks) || 1,
        answerKeyText: modalAnswerKey.trim(),
      };
      setQuestions((prev) => [...prev, newQ]);
    }

    setIsQuestionModalOpen(false);
  };

  // Delete Question
  const handleDeleteQuestion = (id: string) => {
    if (window.confirm("क्या आप इस प्रश्न को हटाना चाहते हैं?")) {
      setQuestions((prev) => {
        const filtered = prev.filter((q) => q.id !== id);
        // Re-number questions sequentially
        return filtered.map((q, idx) => ({ ...q, qNo: idx + 1 }));
      });
    }
  };

  // Duplicate Question
  const handleDuplicateQuestion = (q: ExamQuestion) => {
    const clone: ExamQuestion = {
      ...q,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      qNo: questions.length + 1,
      questionText: `${q.questionText} (Copy)`,
    };
    setQuestions((prev) => [...prev, clone]);
  };

  // Move Question Up / Down
  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === questions.length - 1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;

    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((q, idx) => ({ ...q, qNo: idx + 1 }));
    });
  };

  // Quick Change Marks
  const handleQuickChangeMarks = (qId: string, newMarks: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, marks: Math.max(1, newMarks) } : q))
    );
  };

  // Reset to Default Bank
  const handleResetToDefaultBank = () => {
    if (window.confirm("क्या आप इस विषय के सभी प्रश्नों को डिफ़ॉल्ट CBSE ब्लूप्रिंट में रीसेट करना चाहते हैं?")) {
      if (selectedSubject === "Mathematics") {
        setQuestions(INITIAL_MATHS_QUESTIONS);
      } else {
        setQuestions(INITIAL_SCIENCE_QUESTIONS);
      }
    }
  };

  // Group questions by section
  const questionsBySection = useMemo(() => {
    const map: Record<string, ExamQuestion[]> = { A: [], B: [], C: [], D: [], E: [] };
    for (const q of questions) {
      if (map[q.section]) {
        map[q.section].push(q);
      } else {
        map.A.push(q);
      }
    }
    return map;
  }, [questions]);

  // Density CSS Styles for 1-to-2 page fit
  const getDensityClasses = () => {
    if (pageDensity === "ultra_compact") {
      return {
        wrapper: "text-[10px] leading-tight space-y-1.5",
        qPad: "py-1 border-b border-slate-300",
        optGrid: "grid grid-cols-2 sm:grid-cols-4 gap-1 text-[9.5px] mt-0.5",
        headerSpace: "space-y-0.5 pb-2 mb-2",
        sectionHead: "text-[10px] font-black py-0.5 px-2 bg-slate-100 rounded my-1",
      };
    }
    if (pageDensity === "compact") {
      return {
        wrapper: "text-[11px] leading-normal space-y-2",
        qPad: "py-1.5 border-b border-slate-200",
        optGrid: "grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10.5px] mt-1",
        headerSpace: "space-y-1 pb-2.5 mb-2.5",
        sectionHead: "text-[11px] font-black py-1 px-2.5 bg-slate-100 rounded my-1.5",
      };
    }
    return {
      wrapper: "text-xs leading-relaxed space-y-3",
      qPad: "py-2.5 border-b border-slate-200",
      optGrid: "grid grid-cols-2 gap-2 text-xs mt-1.5",
      headerSpace: "space-y-2 pb-3.5 mb-3.5",
      sectionHead: "text-xs font-black py-1.5 px-3 bg-slate-100 rounded my-2",
    };
  };

  const density = getDensityClasses();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── TOP HERO BANNER ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 shadow-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                परीक्षा प्रश्न-पत्र व ब्लूप्रिंट जनरेटर
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                A4 1-2 Page Fit
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              कस्टम प्रश्न जोड़ें, अंक निर्धारित करें, F.M. व परीक्षा विवरण सेट करें और A4 1-2 पेज में प्रिंट लें
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => setShowHeaderSettings(!showHeaderSettings)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition shadow-xs"
          >
            <Settings2 className="w-4 h-4 text-purple-400" />
            <span>स्कूल व परीक्षा हैडर</span>
          </button>

          <button
            onClick={() => setActivePrintView("QUESTION_PAPER")}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer transition active:scale-[0.99]"
          >
            <Printer className="w-4 h-4" />
            <span>प्रश्न-पत्र प्रिंट (A4)</span>
          </button>

          <button
            onClick={() => setActivePrintView("MARKING_SCHEME")}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs flex items-center gap-2 border border-purple-500/30 cursor-pointer transition"
          >
            <Award className="w-4 h-4 text-purple-400" />
            <span>उत्तर कुंजी (Marking Key)</span>
          </button>
        </div>
      </div>

      {/* ── SCHOOL HEADER & EXAM DETAILS CARD (EXPANDABLE) ── */}
      {showHeaderSettings && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-black text-white">
                स्कूल नाम व प्रश्न-पत्र शीर्ष विवरण (School Header & Details)
              </h3>
            </div>
            <button
              onClick={() => setShowHeaderSettings(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕ बंद करें
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">स्कूल का नाम (School Name)</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="DELHI PUBLIC SCHOOL GURGAON"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">बोर्ड / मान्यता उप-शीर्षक (Affiliation / Sub-title)</label>
              <input
                type="text"
                value={schoolSubHeader}
                onChange={(e) => setSchoolSubHeader(e.target.value)}
                placeholder="Affiliated to CBSE, New Delhi • Affiliation No: 1030456"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">स्कूल पता / टैगलाइन (Address / Tagline)</label>
              <input
                type="text"
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                placeholder="Sector 45, Urban Estate, Gurgaon, Haryana"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">लोगो URL (School Logo Image URL)</label>
              <input
                type="text"
                value={schoolLogo}
                onChange={(e) => setSchoolLogo(e.target.value)}
                placeholder="https://... logo.png"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">परीक्षा की तारीख (Exam Date)</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">विषय कोड (Subject Code)</label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="086"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── EXAM CONFIGURATION & FULL MARKS (FM) CONTROLLER ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Class Selector */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>कक्षा (Class)</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
            >
              <option value="Class 10">Class 10 (दसवीं)</option>
              <option value="Class 9">Class 9 (नौवीं)</option>
              <option value="Class 8">Class 8 (आठवीं)</option>
              <option value="Class 7">Class 7 (सातवीं)</option>
              <option value="Class 6">Class 6 (छठी)</option>
              <option value="Class 11">Class 11 (ग्यारहवीं)</option>
              <option value="Class 12">Class 12 (बारहवीं)</option>
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>विषय (Subject)</span>
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
            >
              <option value="Science">Science (विज्ञान)</option>
              <option value="Mathematics">Mathematics (गणित)</option>
              <option value="Social Science">Social Science (सामाजिक विज्ञान)</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="English">English</option>
            </select>
          </div>

          {/* Exam Name Selector & Custom Input */}
          <div className="sm:col-span-2">
            <label className="block text-slate-400 font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>कौन से एग्जाम का पेपर है (Exam Name)</span>
              </span>
              <span className="text-[10px] text-purple-300">Preset चुनें या टाइप करें</span>
            </label>
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) setCustomExamTitle(e.target.value);
                }}
                className="w-2/5 px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 font-bold text-[11px]"
              >
                <option value="">-- Presets --</option>
                {STANDARD_EXAM_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={customExamTitle}
                onChange={(e) => setCustomExamTitle(e.target.value)}
                placeholder="उदा. Annual Board Examination 2026-27"
                className="w-3/5 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Full Marks (FM) + Time Allowed + Density Controller */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800/80">
          {/* Full Marks (FM) */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 flex items-center justify-between">
              <span>पूर्णांक / अधिकतम अंक (F.M. / Max Marks)</span>
              <span className="text-[10px] text-amber-400 font-black">{maxMarks} Marks</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {[20, 25, 40, 50, 70, 80, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaxMarks(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                      maxMarks === preset
                        ? "bg-purple-600 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {preset}M
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Allowed */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>समय सीमा (Time Allowed)</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={timeAllowed}
                onChange={(e) => setTimeAllowed(e.target.value)}
                placeholder="3 Hours (3 घंटे)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {["45 Min", "1.5 Hours", "2 Hours", "3 Hours"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeAllowed(`${t} (${t.includes("Min") ? "45 मिनट" : `${t.split(" ")[0]} घंटे`})`)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                      timeAllowed.includes(t)
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Page Budget & 1-2 Pages A4 Density Selector */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Columns2 className="w-3.5 h-3.5 text-purple-400" />
                <span>A4 पेज साइज बजट (1-2 Page Fit)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">1 से 2 पेज फिट</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPageDensity("ultra_compact")}
                className={`p-1.5 rounded-xl text-center border font-bold text-[10px] cursor-pointer transition ${
                  pageDensity === "ultra_compact"
                    ? "bg-purple-600/30 border-purple-500 text-purple-200"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                1-पेज फिट (Ultra)
              </button>
              <button
                type="button"
                onClick={() => setPageDensity("compact")}
                className={`p-1.5 rounded-xl text-center border font-bold text-[10px] cursor-pointer transition ${
                  pageDensity === "compact"
                    ? "bg-purple-600/30 border-purple-500 text-purple-200"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                मानक 2-पेज (Compact)
              </button>
              <button
                type="button"
                onClick={() => setPageDensity("standard")}
                className={`p-1.5 rounded-xl text-center border font-bold text-[10px] cursor-pointer transition ${
                  pageDensity === "standard"
                    ? "bg-purple-600/30 border-purple-500 text-purple-200"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                विस्तृत (Standard)
              </button>
            </div>
          </div>
        </div>

        {/* Live Marks Balancing Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              कुल प्रश्न: <strong className="text-white">{questions.length}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              कुल जोड़े गए अंक:{" "}
              <strong className="text-emerald-400 font-black text-sm">
                {totalCalculatedMarks} / {maxMarks} Marks (F.M.)
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {totalCalculatedMarks === maxMarks ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                पूर्णांक पूर्णतः संतुलित (F.M. Balanced)
              </span>
            ) : totalCalculatedMarks < maxMarks ? (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                {maxMarks - totalCalculatedMarks} अंक और जोड़ना बाकी है
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                {totalCalculatedMarks - maxMarks} अंक अधिक हो गए हैं
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── QUESTION ACTIONS & ADD BUTTONS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAddModal("A")}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer transition active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>+ नया प्रश्न जोड़ें (Add Question)</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {(["A", "B", "C", "D", "E"] as const).map((sec) => (
              <button
                key={sec}
                onClick={() => handleOpenAddModal(sec)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                + खण्ड {sec} ({SECTION_METADATA[sec]?.defaultMarks}M)
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefaultBank}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold border border-slate-800 flex items-center gap-1.5 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>CBSE बैंक रीसेट</span>
          </button>
        </div>
      </div>

      {/* ── QUESTIONS LIST GROUPED BY SECTION ── */}
      <div className="space-y-5">
        {(["A", "B", "C", "D", "E"] as const).map((sec) => {
          const secQuestions = questionsBySection[sec] || [];
          const secMeta = SECTION_METADATA[sec];
          const secMarksTotal = secQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

          return (
            <div
              key={sec}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl"
            >
              {/* Section Header */}
              <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs tracking-wider">
                    SECTION {sec}
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-white">{secMeta.label}</h4>
                    <p className="text-[11px] text-slate-400">
                      {secMeta.desc} • {secQuestions.length} प्रश्न • कुल {secMarksTotal} अंक
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddModal(sec)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-slate-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>खण्ड {sec} में जोड़ें</span>
                </button>
              </div>

              {/* Questions inside Section */}
              <div className="p-4 space-y-3">
                {secQuestions.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    इस खण्ड में अभी कोई प्रश्न नहीं है। "+ खण्ड {sec} में जोड़ें" बटन दबाकर प्रश्न जोड़ें।
                  </div>
                ) : (
                  secQuestions.map((q, localIdx) => {
                    const globalIdx = questions.findIndex((item) => item.id === q.id);

                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition space-y-2.5"
                      >
                        {/* Top Question Row: No, Marks, Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-white font-black text-xs flex items-center justify-center">
                              {q.qNo}
                            </span>
                            <span className="text-xs font-bold text-slate-300">
                              प्रश्न संख्या {q.qNo}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Inline Marks Adjuster */}
                            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
                              <span className="px-2 text-amber-400 font-bold">
                                {q.marks} {q.marks === 1 ? "अंक" : "अंक"}
                              </span>
                              <div className="flex flex-col border-l border-slate-700 pl-0.5">
                                <button
                                  type="button"
                                  title="+1 अंक"
                                  onClick={() => handleQuickChangeMarks(q.id, q.marks + 1)}
                                  className="text-[9px] text-slate-400 hover:text-white px-1 leading-none cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  title="-1 अंक"
                                  onClick={() => handleQuickChangeMarks(q.id, q.marks - 1)}
                                  className="text-[9px] text-slate-400 hover:text-white px-1 leading-none cursor-pointer"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>

                            {/* Move Up/Down */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={globalIdx === 0}
                                onClick={() => handleMoveQuestion(globalIdx, "up")}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                title="ऊपर ले जाएं"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={globalIdx === questions.length - 1}
                                onClick={() => handleMoveQuestion(globalIdx, "down")}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                title="नीचे ले जाएं"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Edit / Clone / Delete */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(q)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer"
                              title="एडिट करें"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(q)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              title="कॉपी / डुप्लीकेट"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer"
                              title="डिलीट करें"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Text */}
                        <p className="text-xs text-slate-100 font-medium whitespace-pre-line leading-relaxed">
                          {q.questionText}
                        </p>

                        {/* Options if MCQ */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-1">
                            {q.options.map((opt, i) => (
                              <div
                                key={i}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                              >
                                <span className="font-bold text-amber-400">
                                  ({String.fromCharCode(97 + i)})
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* OR / अथवा Internal Choice */}
                        {q.orQuestionText && (
                          <div className="mt-2 p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200">
                            <span className="font-black text-amber-400 uppercase text-[10px] tracking-wider block mb-1">
                              अथवा (OR Alternative Choice):
                            </span>
                            <p className="whitespace-pre-line">{q.orQuestionText}</p>
                          </div>
                        )}

                        {/* Answer Key if available */}
                        {q.answerKeyText && (
                          <div className="text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                            <span className="font-bold">मॉडल उत्तर / Key:</span> {q.answerKeyText}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── QUESTION ADD / EDIT MODAL ── */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  {editingQuestion ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingQuestion ? "प्रश्न सम्पादित करें (Edit Question)" : "नया प्रश्न जोड़ें (Add Question)"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    कक्षा: {selectedClass} • विषय: {selectedSubject}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Section Selector */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">खण्ड (Section)</label>
                  <select
                    value={modalSection}
                    onChange={(e) => {
                      const s = e.target.value as "A" | "B" | "C" | "D" | "E";
                      setModalSection(s);
                      setModalMarks(SECTION_METADATA[s]?.defaultMarks || 1);
                      if (s === "A") setModalHasOptions(true);
                      if (s === "D") setModalHasOrChoice(true);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                  >
                    <option value="A">खण्ड 'क' (Section A) - वस्तुनिष्ठ (1 Mark)</option>
                    <option value="B">खण्ड 'ख' (Section B) - अति लघु (2 Marks)</option>
                    <option value="C">खण्ड 'ग' (Section C) - लघु उत्तरीय (3 Marks)</option>
                    <option value="D">खण्ड 'घ' (Section D) - दीर्घ उत्तरीय / अथवा (5 Marks)</option>
                    <option value="E">खण्ड 'ङ' (Section E) - केस आधारित (4 Marks)</option>
                  </select>
                </div>

                {/* Question Marks */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    इस प्रश्न के अंक (Marks for this Question)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={modalMarks}
                      onChange={(e) => setModalMarks(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-black text-sm"
                    />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModalMarks(m)}
                          className={`px-2 py-2 rounded-lg font-black text-xs cursor-pointer ${
                            modalMarks === m ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {m}M
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Question Text */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  प्रश्न का विवरण (Question Text in Hindi / English)
                </label>
                <textarea
                  required
                  rows={3}
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder="यहाँ प्रश्न लिखें... (उदा. विद्युत धारा का SI मात्रक क्या है?)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium leading-relaxed"
                />
              </div>

              {/* MCQ Options Toggle & Fields */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">
                    वस्तुनिष्ठ विकल्प (4 Multiple Choice Options)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-purple-400 font-bold">
                    <input
                      type="checkbox"
                      checked={modalHasOptions}
                      onChange={(e) => setModalHasOptions(e.target.checked)}
                      className="rounded border-slate-700 text-purple-600"
                    />
                    <span>विकल्प जोड़ें (a, b, c, d)</span>
                  </label>
                </div>

                {modalHasOptions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {["a", "b", "c", "d"].map((letter, idx) => (
                      <div key={letter} className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                          ({letter})
                        </span>
                        <input
                          type="text"
                          value={modalOptions[idx] || ""}
                          onChange={(e) => {
                            const copy = [...modalOptions];
                            copy[idx] = e.target.value;
                            setModalOptions(copy);
                          }}
                          placeholder={`Option (${letter})`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OR / अथवा Internal Choice Toggle & Field */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">
                    आंतरिक विकल्प / अथवा (OR Alternative Question)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-amber-400 font-bold">
                    <input
                      type="checkbox"
                      checked={modalHasOrChoice}
                      onChange={(e) => setModalHasOrChoice(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500"
                    />
                    <span>'अथवा' प्रश्न शामिल करें</span>
                  </label>
                </div>

                {modalHasOrChoice && (
                  <textarea
                    rows={2}
                    value={modalOrText}
                    onChange={(e) => setModalOrText(e.target.value)}
                    placeholder="अथवा वाला वैकल्पिक प्रश्न लिखें..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                  />
                )}
              </div>

              {/* Teacher Marking Scheme / Model Answer */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  शिक्षक उत्तर कुंजी / मॉडल उत्तर (Marking Scheme / Model Answer)
                </label>
                <input
                  type="text"
                  value={modalAnswerKey}
                  onChange={(e) => setModalAnswerKey(e.target.value)}
                  placeholder="उदा. उत्तर: (b) एम्पियर (A)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  {editingQuestion ? "अपडेट करें" : "प्रश्न जोड़ें"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRINT & PREVIEW MODAL (A4 1-2 PAGE PACKING) ── */}
      {activePrintView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 text-slate-950 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
            {/* Modal Controls Header (no-print) */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white no-print">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {activePrintView === "QUESTION_PAPER"
                      ? "A4 प्रश्न-पत्र प्रिंट पूर्वावलोकन (1-2 Page Format)"
                      : "शिक्षक मूल्यांकन उत्तर कुंजी (Marking Scheme)"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedClass} • {selectedSubject} • F.M.: {maxMarks} • समय: {timeAllowed}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Density Switcher inside print view */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setPageDensity("ultra_compact")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                      pageDensity === "ultra_compact"
                        ? "bg-purple-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    1-पेज (Ultra)
                  </button>
                  <button
                    onClick={() => setPageDensity("compact")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                      pageDensity === "compact"
                        ? "bg-purple-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    2-पेज (Compact)
                  </button>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>A4 प्रिंट करें (Print PDF)</span>
                </button>

                <button
                  onClick={() => setActivePrintView(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Document Viewport (Clean White A4 Sheet Format) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-800/60 flex justify-center">
              <div
                id="exam-question-paper-print"
                className="bg-white text-slate-950 w-full max-w-[210mm] p-6 sm:p-8 rounded-2xl shadow-2xl print-only-container"
                style={{
                  minHeight: "297mm",
                  boxSizing: "border-box",
                }}
              >
                {/* ── SCHOOL OFFICIAL HEADER ── */}
                <div className={`text-center border-b-2 border-slate-900 ${density.headerSpace}`}>
                  <div className="flex items-center justify-center gap-3">
                    {schoolLogo && (
                      <img
                        src={schoolLogo}
                        alt="Logo"
                        className="w-12 h-12 object-contain rounded-lg shrink-0"
                      />
                    )}
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950 font-serif leading-tight">
                        {schoolName}
                      </h1>
                      {schoolSubHeader && (
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          {schoolSubHeader}
                        </p>
                      )}
                      {schoolAddress && (
                        <p className="text-[9.5px] text-slate-600 font-medium">
                          {schoolAddress}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Exam Title & Session Badge */}
                  <div className="pt-1.5 pb-0.5">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-slate-100 border border-slate-400 font-black text-xs uppercase tracking-wide text-slate-900">
                      {customExamTitle}
                    </span>
                  </div>

                  {/* Subject, Class, Time & Max Marks Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-300 text-[11px] font-bold text-slate-900">
                    <div className="text-left">
                      विषय: <span className="uppercase font-black">{selectedSubject} ({selectedClass})</span>
                      {subjectCode && <span className="text-[10px] text-slate-600"> [Code: {subjectCode}]</span>}
                    </div>
                    <div className="text-center">
                      समय / Time: <span className="font-black">{timeAllowed}</span>
                    </div>
                    <div className="text-right">
                      पूर्णांक / F.M.: <span className="font-black text-xs">{maxMarks} Marks</span>
                    </div>
                  </div>
                </div>

                {/* ── STUDENT DETAILS FILL BAR & GENERAL INSTRUCTIONS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-[10.5px] my-2">
                  <div className="sm:col-span-2 space-y-0.5">
                    <div className="font-black text-slate-900 underline">
                      सामान्य निर्देश (General Instructions):
                    </div>
                    <ul className="list-decimal list-inside text-[10px] text-slate-700 space-y-0.5">
                      {instructions.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5 border sm:border-l sm:border-t-0 sm:border-r-0 sm:border-b-0 border-slate-300 sm:pl-3 pt-1 sm:pt-0">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span>नामांक / ROLL NO:</span>
                      <div className="w-24 border-b border-dotted border-slate-900 h-4"></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span>नाम / NAME:</span>
                      <div className="w-24 border-b border-dotted border-slate-900 h-4"></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span>दिनांक / DATE:</span>
                      <span className="font-mono text-[10px]">{examDate}</span>
                    </div>
                  </div>
                </div>

                {/* ── QUESTIONS BODY OR MARKING SCHEME ── */}
                {activePrintView === "QUESTION_PAPER" ? (
                  <div className={density.wrapper}>
                    {(["A", "B", "C", "D", "E"] as const).map((sec) => {
                      const secList = questionsBySection[sec] || [];
                      if (secList.length === 0) return null;
                      const secMeta = SECTION_METADATA[sec];

                      return (
                        <div key={sec} className="space-y-1">
                          {/* Section Header Banner */}
                          <div className={`flex items-center justify-between font-black text-slate-950 border-b border-slate-400 ${density.sectionHead}`}>
                            <span>{secMeta.label} - {secMeta.desc}</span>
                            <span>[{secList.reduce((s, q) => s + q.marks, 0)} Marks]</span>
                          </div>

                          {/* Section Questions */}
                          <div className="space-y-1">
                            {secList.map((q) => (
                              <div
                                key={q.id}
                                className={`${density.qPad} break-inside-avoid`}
                                style={{ pageBreakInside: "avoid" }}
                              >
                                <div className="flex justify-between items-start gap-2 font-bold text-slate-950">
                                  <div className="flex-1">
                                    <span className="font-black mr-1.5">प्र. {q.qNo}.</span>
                                    <span className="font-medium whitespace-pre-line">{q.questionText}</span>
                                  </div>
                                  <span className="font-black shrink-0 text-slate-900">
                                    [{q.marks}]
                                  </span>
                                </div>

                                {/* Options if MCQ */}
                                {q.options && q.options.length > 0 && (
                                  <div className={`${density.optGrid} pl-5 font-normal text-slate-800`}>
                                    {q.options.map((opt, optIdx) => (
                                      <div key={optIdx} className="truncate">
                                        <span className="font-bold mr-1">
                                          ({String.fromCharCode(97 + optIdx)})
                                        </span>
                                        <span>{opt}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* OR / अथवा Choice */}
                                {q.orQuestionText && (
                                  <div className="mt-1 text-center pl-4">
                                    <span className="font-black text-[9.5px] uppercase px-2 py-0.2 bg-slate-200 border border-slate-400 rounded">
                                      अथवा / OR
                                    </span>
                                    <div className="text-left mt-0.5 text-slate-800 italic">
                                      {q.orQuestionText}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Paper Footer / End indicator */}
                    <div className="pt-3 pb-2 text-center border-t border-slate-300 mt-4 space-y-1">
                      <div className="text-[10px] font-black tracking-widest uppercase text-slate-700">
                        *** ALL THE BEST / परीक्षा के लिए शुभकामनाएं ***
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1 font-bold">
                        <span>{schoolName} • Page 1 of 2</span>
                        <span>वीक्षक हस्ताक्षर / Invigilator's Sign</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── MARKING SCHEME / ANSWER KEY ── */
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded bg-purple-50 border border-purple-300 text-purple-950 font-black text-center text-xs">
                      शिक्षक मूल्यांकन उत्तर कुंजी व अंक आवंटन योजना (Model Answers & Marking Scheme)
                    </div>

                    <div className="space-y-2">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-300 space-y-1 break-inside-avoid"
                        >
                          <div className="flex justify-between font-black text-slate-900">
                            <span>खण्ड {q.section} • प्रश्न संख्या {q.qNo}</span>
                            <span>[{q.marks} अंक]</span>
                          </div>
                          <p className="text-slate-800 text-[11px] font-medium">{q.questionText}</p>
                          <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-950 text-[11px] font-bold">
                            {q.answerKeyText || "मॉडल उत्तर: सही अवधारणा, नामांकित आरेख अथवा सूत्रों के आधार पर अंक आवंटित करें।"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
