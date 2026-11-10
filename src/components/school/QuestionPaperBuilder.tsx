// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  BookOpen,
  Award,
  Clock,
  Layers,
  HelpCircle,
  CheckCircle,
  Copy
} from "lucide-react";
import { School, SchoolSession } from "../../school-types";

export interface ExamQuestion {
  id: string;
  section: "A" | "B" | "C" | "D" | "E";
  qNo: number;
  questionText: string;
  options?: string[]; // For Section A MCQs
  orQuestionText?: string; // For Section D internal choice
  marks: number;
  answerKeyText?: string;
}

const SAMPLE_QUESTION_BANK: Record<string, ExamQuestion[]> = {
  "Class 10 - Science": [
    { id: "q1", section: "A", qNo: 1, questionText: "Fe2O3 + 2Al -> Al2O3 + 2Fe. ऊपर दी गई अभिक्रिया किस प्रकार की है?", options: ["संयोजन अभिक्रिया", "द्विविस्थापन अभिक्रिया", "वियोजन अभिक्रिया", "विस्थापन अभिक्रिया"], marks: 1, answerKeyText: "उत्तर: (d) विस्थापन अभिक्रिया" },
    { id: "q2", section: "A", qNo: 2, questionText: "मानव नेत्र के किस भाग पर किसी वस्तु का प्रतिबिम्ब बनता है?", options: ["कॉर्निया", "परितारिका", "पुतली", "दृष्टिपटल (रेटिना)"], marks: 1, answerKeyText: "उत्तर: (d) दृष्टिपटल (रेटिना)" },
    { id: "q3", section: "A", qNo: 3, questionText: "विद्युत धारा का SI मात्रक क्या है?", options: ["वोल्ट", "एम्पियर", "ओम", "वाट"], marks: 1, answerKeyText: "उत्तर: (b) एम्पियर" },
    { id: "q4", section: "B", qNo: 4, questionText: "उभयधर्मी ऑक्साइड क्या होते हैं? किन्हीं दो उभयधर्मी ऑक्साइडों के नाम और सूत्र लिखिए।", marks: 2, answerKeyText: "उत्तर: जो अम्ल और क्षार दोनों से क्रिया करते हैं। उदाहरण: Al2O3, ZnO." },
    { id: "q5", section: "B", qNo: 5, questionText: "प्रकाश के परावर्तन के दोनों नियम लिखिए।", marks: 2, answerKeyText: "उत्तर: 1. आपतित किरण, परावर्तित किरण व अभिलंब एक ही तल में होते हैं। 2. आपतन कोण = परावर्तन कोण।" },
    { id: "q6", section: "C", qNo: 6, questionText: "पादपों में जाइलम तथा फ्लोएम द्वारा पदार्थों के संवहन में क्या अंतर है?", marks: 3, answerKeyText: "उत्तर: जाइलम जल व खनिज का ऊपर संवहन करता है। फ्लोएम भोजन का दोनों दिशाओं में संवहन करता है।" },
    { id: "q7", section: "D", qNo: 7, questionText: "मानव हृदय की संरचना का स्वच्छ नामांकित चित्र बनाइए तथा इसके दोहरे परिसंचरण को समझाइए।", orQuestionText: "मानव उत्सर्जन तंत्र का नामांकित चित्र बनाकर नेफ्रॉन (वृक्काणु) की कार्यप्रणाली स्पष्ट कीजिए।", marks: 5, answerKeyText: "उत्तर: हृदय का नामांकित चित्र + अलिंद/निलय द्वारा रक्त का दो बार गुजरना दोहरा परिसंचरण है।" },
    { id: "q8", section: "E", qNo: 8, questionText: "केस आधारित प्रश्न: एक छात्र ने 15 cm फोकस दूरी वाले अवतल दर्पण के सामने 30 cm की दूरी पर एक मोमबत्ती रखी। (a) प्रतिबिम्ब की स्थिति ज्ञात कीजिए? (b) प्रतिबिम्ब का आकार और प्रकृति क्या होगी?", marks: 4, answerKeyText: "उत्तर: (a) v = -30 cm (वक्रता केंद्र पर)। (b) वास्तविक, उल्टा तथा वस्तु के बराबर आकार।" }
  ],
  "Class 10 - Mathematics": [
    { id: "qm1", section: "A", qNo: 1, questionText: "यदि द्विघात समीकरण 2x² - kx + 3 = 0 के दोनों मूल बराबर हों, तो k का मान होगा:", options: ["±2√6", "±√6", "±3", "±4"], marks: 1, answerKeyText: "उत्तर: (a) D = k² - 24 = 0 => k = ±2√6" },
    { id: "qm2", section: "A", qNo: 2, questionText: "समांतर श्रेणी 3, 8, 13, 18,... का कौन सा पद 78 है?", options: ["12वां", "14वां", "16वां", "18वां"], marks: 1, answerKeyText: "उत्तर: (c) an = a + (n-1)d = 3 + (n-1)5 = 78 => n = 16" },
    { id: "qm3", section: "B", qNo: 3, questionText: "सिद्ध कीजिए कि √5 एक अपरिमेय संख्या है।", marks: 2, answerKeyText: "उत्तर: विरोधाभास विधि (Contradiction method) द्वारा मानकर p/q रूप में सिद्ध करना।" },
    { id: "qm4", section: "C", qNo: 4, questionText: "बिंदुओं (4, -1) और (-2, -3) को जोड़ने वाले रेखाखंड को समत्रिभाजित करने वाले बिंदुओं के निर्देशांक ज्ञात कीजिए।", marks: 3, answerKeyText: "उत्तर: विभाजन सूत्र (Section Formula) द्वारा P(2, -5/3) और Q(0, -7/3)।" },
    { id: "qm5", section: "D", qNo: 5, questionText: "एक 80 m चौड़ी सड़क के दोनों ओर आमने-सामने समान लंबाई वाले दो खंभे लगे हुए हैं। इन दोनों खंभों के बीच सड़क के एक बिंदु से खंभों के शिखर के उन्नयन कोण 60° और 30° हैं। खंभों की ऊंचाई और खंभों से बिंदु की दूरी ज्ञात कीजिए।", orQuestionText: "सिद्ध कीजिए कि किसी वृत्त के बाह्य बिंदु से खींची गई दो स्पर्श रेखाओं की लंबाइयां बराबर होती हैं।", marks: 5, answerKeyText: "उत्तर: ऊंचाई = 20√3 m, दूरियां = 20 m और 60 m।" }
  ]
};

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
}

export const QuestionPaperBuilder: React.FC<Props> = ({ school, activeSession }) => {
  const schoolId = school?.id || "SCH-001";
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [selectedSubject, setSelectedSubject] = useState("Science");
  const [examTitle, setExamTitle] = useState("अर्धवार्षिक परीक्षा (Half Yearly Examination - 2026-27)");
  const [timeAllowed, setTimeAllowed] = useState("3 Hours (3 घंटे)");
  const [maxMarks, setMaxMarks] = useState(80);

  const bankKey = `${selectedClass} - ${selectedSubject}`;
  const [questions, setQuestions] = useState<ExamQuestion[]>(() => {
    return SAMPLE_QUESTION_BANK["Class 10 - Science"] || [];
  });

  const [activePrintView, setActivePrintView] = useState<"QUESTION_PAPER" | "MARKING_SCHEME" | null>(null);

  // Switch subject bank
  const handleSubjectChange = (newSub: string) => {
    setSelectedSubject(newSub);
    const key = `${selectedClass} - ${newSub}`;
    if (SAMPLE_QUESTION_BANK[key]) {
      setQuestions(SAMPLE_QUESTION_BANK[key]);
    }
  };

  const totalCalculatedMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + q.marks, 0);
  }, [questions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 shadow-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              परीक्षा प्रश्न-पत्र व ब्लूप्रिंट जनरेटर (Question Paper Builder)
            </h2>
            <p className="text-xs text-slate-400">
              CBSE व स्टेट बोर्ड ब्लूप्रिंट, आंतरिक विकल्प ('अथवा'), A4 प्रिंट लेआउट व उत्तर कुंजी
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActivePrintView("QUESTION_PAPER")}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            प्रश्न-पत्र प्रिंट (Question Paper)
          </button>
          <button
            onClick={() => setActivePrintView("MARKING_SCHEME")}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Award className="w-4 h-4" />
            उत्तर कुंजी (Marking Scheme)
          </button>
        </div>
      </div>

      {/* Blueprint Header Settings */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-bold mb-1">कक्षा (Class)</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
          >
            <option value="Class 10">Class 10 (दसवीं)</option>
            <option value="Class 9">Class 9 (नौवीं)</option>
            <option value="Class 8">Class 8 (आठवीं)</option>
            <option value="Class 12">Class 12 (बारहवीं)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">विषय (Subject)</label>
          <select
            value={selectedSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
          >
            <option value="Science">Science (विज्ञान)</option>
            <option value="Mathematics">Mathematics (गणित)</option>
            <option value="Social Science">Social Science (सामाजिक विज्ञान)</option>
            <option value="Hindi">Hindi (हिंदी)</option>
            <option value="English">English</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">अधिकतम अंक (Max Marks)</label>
          <input
            type="number"
            value={maxMarks}
            onChange={(e) => setMaxMarks(parseInt(e.target.value) || 80)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">समय सीमा (Time)</label>
          <input
            type="text"
            value={timeAllowed}
            onChange={(e) => setTimeAllowed(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
          />
        </div>
      </div>

      {/* Questions Assembly Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              प्रश्न-पत्र ब्लूप्रिंट व प्रश्न सूची ({questions.length} प्रश्न)
            </h3>
            <p className="text-xs text-slate-400">
              कुल जोड़े गए अंक: <strong className="text-emerald-400">{totalCalculatedMarks} / {maxMarks} Marks</strong>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    SECTION {q.section}
                  </span>
                  <span className="font-bold text-xs text-white">प्र. सं. {q.qNo}.</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 text-xs font-bold">
                  [{q.marks} {q.marks === 1 ? "अंक" : "अंक"}]
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium">{q.questionText}</p>

              {q.options && (
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                  {q.options.map((opt, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      ({String.fromCharCode(97 + i)}) {opt}
                    </div>
                  ))}
                </div>
              )}

              {q.orQuestionText && (
                <div className="mt-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                  <div className="font-bold text-amber-400 uppercase text-[10px] mb-1">अथवा (OR Choice):</div>
                  <p>{q.orQuestionText}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PRINT PREVIEW MODAL */}
      {activePrintView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-white text-slate-950 rounded-3xl w-full max-w-4xl p-8 shadow-2xl overflow-y-auto max-h-[92vh] space-y-6">
            {/* Header of Question Paper */}
            <div className="text-center border-b pb-4 space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-wide text-slate-950">{school?.name || "DELHI PUBLIC SCHOOL"}</h1>
              <p className="text-xs text-slate-600 font-bold uppercase">{examTitle}</p>
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-2 border-t mt-2">
                <div>विषय / Subject: <span className="uppercase">{selectedSubject} ({selectedClass})</span></div>
                <div>समय / Time: <span>{timeAllowed}</span></div>
                <div>पूर्णांक / Max Marks: <span>{maxMarks}</span></div>
              </div>
            </div>

            {/* Roll Number Box & General Instructions */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-3 rounded-xl bg-slate-50 border text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900">सामान्य निर्देश (General Instructions):</div>
                <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                  <li>सभी प्रश्न अनिवार्य हैं। (All questions are compulsory).</li>
                  <li>खंड क में 1 अंक वाले वस्तुनिष्ठ प्रश्न हैं।</li>
                  <li>खंड घ में आंतरिक विकल्प (Internal Choice) दिया गया है।</li>
                </ul>
              </div>
              <div className="border border-slate-400 p-2 rounded text-center shrink-0">
                <div className="text-[10px] font-bold text-slate-500">नामांक / ROLL NO:</div>
                <div className="w-32 h-6 border-b border-dashed border-slate-400 mt-1"></div>
              </div>
            </div>

            {/* Questions Body or Marking Scheme */}
            {activePrintView === "QUESTION_PAPER" ? (
              <div className="space-y-4 text-xs leading-relaxed">
                {questions.map((q) => (
                  <div key={q.id} className="pb-3 border-b border-slate-200">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>प्र. {q.qNo}. {q.questionText}</span>
                      <span className="shrink-0 ml-2">[{q.marks}]</span>
                    </div>
                    {q.options && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pl-4 text-slate-800">
                        {q.options.map((opt, i) => (
                          <div key={i}>({String.fromCharCode(97 + i)}) {opt}</div>
                        ))}
                      </div>
                    )}
                    {q.orQuestionText && (
                      <div className="mt-3 text-center">
                        <span className="font-bold text-xs uppercase px-2 py-0.5 bg-slate-200 rounded">अथवा / OR</span>
                        <div className="text-left mt-2 pl-4 italic text-slate-800">
                          {q.orQuestionText}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* MARKING SCHEME / ANSWER KEY */
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 font-bold">
                  शिक्षक मूल्यांकन उत्तर कुंजी (Teacher Marking Scheme & Model Answers)
                </div>
                {questions.map((q) => (
                  <div key={q.id} className="p-3 rounded-xl bg-slate-50 border space-y-1">
                    <div className="font-bold text-slate-900 flex justify-between">
                      <span>प्र. {q.qNo} [{q.marks} अंक]</span>
                    </div>
                    <div className="text-slate-700">{q.questionText}</div>
                    <div className="text-emerald-800 font-semibold bg-emerald-50 p-2 rounded mt-1">
                      {q.answerKeyText || "मॉडल उत्तर: मुख्य बिंदुओं और व्याख्या के आधार पर अंक आवंटित करें।"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow"
              >
                <Printer className="w-4 h-4" />
                A4 पेपर पर प्रिंट करें (Print Ready)
              </button>
              <button
                onClick={() => setActivePrintView(null)}
                className="px-5 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
