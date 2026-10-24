// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Trash2,
  ArrowLeft,
  BookOpen,
  CheckSquare,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Eye,
  Filter,
  RefreshCw,
  X,
  HelpCircle,
  Zap,
  Check,
  Search,
  ListChecks,
  Shuffle,
  ChevronRight,
  FolderPlus,
  Settings2,
  CheckCheck,
  Award
} from 'lucide-react';
import { parseMCQText, normalizeMcqPaste } from '../utils/mcqParser';
import { saveMcqLesson, deleteMcqLesson, subscribeMcqLessons, saveSystemSettings } from '../firebase';
import { CustomPracticeSetEntry, SubjectMcqPoolEntry, MCQItem } from '../types';
import { hapticLight, hapticStrong } from '../utils/haptic';
import McqQuestionDisplay from './McqQuestionDisplay';

// ── AVAILABLE SUBJECT METADATA ───────────────────────────────────────────────
export const SUBJECT_OPTIONS = [
  { id: 'MATH', label: 'गणित (Mathematics)', icon: '🔢', color: 'from-blue-600 to-indigo-600', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', sectionId: 'math' },
  { id: 'SCIENCE', label: 'सामान्य विज्ञान (Science)', icon: '🔬', color: 'from-emerald-600 to-teal-600', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', sectionId: 'gs' },
  { id: 'SOCIAL_SCIENCE', label: 'सामाजिक विज्ञान (Social Science)', icon: '🌍', color: 'from-amber-600 to-orange-600', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', sectionId: 'gk' },
  { id: 'GK_CA', label: 'सामान्य ज्ञान व समसामयिकी (GK/CA)', icon: '📖', color: 'from-purple-600 to-pink-600', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30', sectionId: 'gk' },
  { id: 'HINDI', label: 'सामान्य हिंदी (Hindi)', icon: '🇮🇳', color: 'from-red-600 to-rose-600', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30', sectionId: 'gk' },
  { id: 'ENGLISH', label: 'General English', icon: '🔤', color: 'from-cyan-600 to-blue-600', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', sectionId: 'gk' },
  { id: 'REASONING', label: 'तर्कशक्ति (Reasoning)', icon: '🧠', color: 'from-violet-600 to-purple-600', badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30', sectionId: 'reasoning' },
  { id: 'BSEB', label: 'BSEB बोर्ड स्पेशल (Bihar Board)', icon: '🟠', color: 'from-orange-600 to-amber-600', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30', sectionId: 'gk' },
];

export const TARGET_EXAMS = [
  { id: 'Bihar Police Constable', label: '👮 बिहार पुलिस सिपाही' },
  { id: 'BSSC Inter Level / CGL', label: '🏛️ BSSC इंटर / CGL' },
  { id: 'BSEB Bihar Board (10th/12th)', label: '🟠 BSEB बोर्ड (10th/12th)' },
  { id: 'SSC GD / CGL / CHSL', label: '⚡ SSC GD / CHSL' },
  { id: 'All Exams (सभी प्रतियोगी परीक्षाएं)', label: '🌐 ऑल कॉम्पिटिशन' },
];

// Starter Subject Pools with high quality questions if database is empty
const STARTER_POOLS: SubjectMcqPoolEntry[] = [
  {
    id: 'starter_math_set_1',
    subject: 'MATH',
    subjectLabel: 'गणित (Mathematics)',
    setName: 'गणित (Math) - सेट 1',
    targetExam: 'Bihar Police Constable',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'sm_1',
        question: 'यदि किसी संख्या का 20% 120 है, तो उस संख्या का 120% क्या होगा?',
        options: ['720', '360', '240', '480'],
        correctAnswer: 0,
        explanation: 'संख्या = 120 / 0.20 = 600। अतः 600 का 120% = 600 × 1.2 = 720।'
      },
      {
        id: 'sm_2',
        question: 'प्रथम 50 प्राकृतिक संख्याओं का औसत क्या होगा?',
        options: ['25', '25.5', '26', '26.5'],
        correctAnswer: 1,
        explanation: 'औसत = (n + 1) / 2 = (50 + 1) / 2 = 25.5।'
      },
      {
        id: 'sm_3',
        question: 'एक रेलगाड़ी 72 किमी/घंटा की गति से चल रही है, उसकी गति मीटर/सेकंड में क्या होगी?',
        options: ['15 m/s', '20 m/s', '25 m/s', '30 m/s'],
        correctAnswer: 1,
        explanation: '72 × (5 / 18) = 20 मीटर/सेकंड।'
      },
      {
        id: 'sm_4',
        question: 'यदि क्रय मूल्य ₹500 है और विक्रय मूल्य ₹600 है, तो लाभ प्रतिशत क्या होगा?',
        options: ['10%', '15%', '20%', '25%'],
        correctAnswer: 2,
        explanation: 'लाभ = ₹100। लाभ % = (100 / 500) × 100 = 20%।'
      },
      {
        id: 'sm_5',
        question: 'दो संख्याओं का महत्तम समापवर्तक (HCF) 12 तथा LCM 72 है। यदि एक संख्या 24 है तो दूसरी क्या होगी?',
        options: ['36', '48', '18', '72'],
        correctAnswer: 0,
        explanation: 'दूसरी संख्या = (HCF × LCM) / पहली संख्या = (12 × 72) / 24 = 36।'
      }
    ]
  },
  {
    id: 'starter_science_set_1',
    subject: 'SCIENCE',
    subjectLabel: 'सामान्य विज्ञान (Science)',
    setName: 'विज्ञान (Science) - सेट 1',
    targetExam: 'Bihar Police Constable',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'ss_1',
        question: 'प्रकाश वर्ष (Light Year) निम्नलिखित में से किसका मात्रक है?',
        options: ['समय', 'दूरी (Distance)', 'प्रकाश की तीव्रता', 'द्रव्यमान'],
        correctAnswer: 1,
        explanation: 'प्रकाश वर्ष खगोलीय दूरी मापने का मात्रक है।'
      },
      {
        id: 'ss_2',
        question: 'मनुष्य के शरीर में रक्त का pH मान लगभग कितना होता है?',
        options: ['6.4', '7.0', '7.4', '8.2'],
        correctAnswer: 2,
        explanation: 'मानव रक्त का pH मान 7.35 से 7.45 के बीच (हल्का क्षारीय) होता है।'
      },
      {
        id: 'ss_3',
        question: 'कोशिका का "पावर हाउस" (Powerhouse of the Cell) किसे कहा जाता है?',
        options: ['राइबोसोम', 'माइटोकॉन्ड्रिया', 'लाइसोसोम', 'गॉल्जीकाय'],
        correctAnswer: 1,
        explanation: 'माइटोकॉन्ड्रिया में ATP के रूप में ऊर्जा उत्पन्न होती है, इसलिए इसे पावरहाउस कहते हैं।'
      },
      {
        id: 'ss_4',
        question: 'पानी का घनत्व अधिकतम किस तापमान पर होता है?',
        options: ['0°C', '4°C', '100°C', '-4°C'],
        correctAnswer: 1,
        explanation: 'जल का घनत्व 4°C (277 K) पर सर्वाधिक होता है।'
      },
      {
        id: 'ss_5',
        question: 'वाहन चालकों द्वारा पीछे का दृश्य देखने के लिए किस दर्पण का उपयोग किया जाता है?',
        options: ['अवतल दर्पण', 'उत्तल दर्पण (Convex Mirror)', 'समतल दर्पण', 'परवलयिक दर्पण'],
        correctAnswer: 1,
        explanation: 'उत्तल दर्पण बड़ा दृष्टि क्षेत्र (wider field of view) और सीधा प्रतिबिम्ब बनाता है।'
      }
    ]
  },
  {
    id: 'starter_social_set_1',
    subject: 'SOCIAL_SCIENCE',
    subjectLabel: 'सामाजिक विज्ञान (Social Science)',
    setName: 'सामाजिक विज्ञान - सेट 1',
    targetExam: 'Bihar Police Constable',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'sss_1',
        question: 'बिहार में 1857 के महान विद्रोह का नेतृत्व किसने किया था?',
        options: ['नाना साहब', 'बाबू कुंवर सिंह', 'तात्या टोपे', 'मंगल पांडे'],
        correctAnswer: 1,
        explanation: 'जगदीशपुर (आरा) के 80 वर्षीय वीर कुंवर सिंह ने बिहार में 1857 के विद्रोह का नेतृत्व किया था।'
      },
      {
        id: 'sss_2',
        question: 'पाटलिपुत्र नगर की स्थापना किस प्राचीन शासक ने की थी?',
        options: ['बिम्बिसार', 'अजातशत्रु', 'उदयन (Udayin)', 'चन्द्रगुप्त मौर्य'],
        correctAnswer: 2,
        explanation: 'हर्यक वंश के राजा उदयन ने गंगा और सोन नदी के संगम पर पाटलिपुत्र नगर बसाया।'
      },
      {
        id: 'sss_3',
        question: 'महात्मा गांधी ने भारत में अपना पहला सत्याग्रह "चंपारण सत्याग्रह" किस वर्ष शुरू किया?',
        options: ['1915', '1917', '1919', '1920'],
        correctAnswer: 1,
        explanation: 'राजकुमार शुक्ल के आग्रह पर गांधीजी अप्रैल 1917 में चंपारण आए और तिनकठिया प्रथा के विरुद्ध आंदोलन किया।'
      },
      {
        id: 'sss_4',
        question: 'भारतीय संविधान की प्रस्तावना में "समाजवादी" और "धर्मनिरपेक्ष" शब्द किस संशोधन द्वारा जोड़े गए?',
        options: ['42वां संशोधन (1976)', '44वां संशोधन', '52वां संशोधन', '73वां संशोधन'],
        correctAnswer: 0,
        explanation: '42वें संविधान संशोधन अधिनियम 1976 द्वारा प्रस्तावना में समाजवादी, पंथनिरपेक्ष और अखंडता शब्द जोड़े गए।'
      },
      {
        id: 'sss_5',
        question: 'स्वतंत्र भारत के प्रथम राष्ट्रपति डॉ. राजेंद्र प्रसाद का जन्म बिहार के किस स्थान पर हुआ था?',
        options: ['पटना', 'जीरादेई (सीवान)', 'नालंदा', 'मुजफ्फरपुर'],
        correctAnswer: 1,
        explanation: 'देशरत्न डॉ. राजेंद्र प्रसाद का जन्म 3 दिसंबर 1884 को सीवान के जीरादेई गांव में हुआ था।'
      }
    ]
  }
];

interface Props {
  onBack: () => void;
  settings?: any;
  onSaveSettings?: (updated: any) => Promise<void> | void;
}

type MainTab = 'SUBJECT_POOLS' | 'GENERATOR' | 'ACTIVE_SETS' | 'HISTORY';

export const AdminCompetitionMcqManager: React.FC<Props> = ({
  onBack,
  settings,
  onSaveSettings
}) => {
  // Navigation Tabs
  const [tab, setTab] = useState<MainTab>('SUBJECT_POOLS');

  // Firestore lessons
  const [allLessons, setAllLessons] = useState<any[]>([]);

  // Feedback Alert
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlert({ text, type });
    setTimeout(() => setAlert(null), 4500);
  };

  // ── 1. SUBJECT MCQ POOLS STATE ─────────────────────────────────────────────
  const subjectPools: SubjectMcqPoolEntry[] = useMemo(() => {
    if (settings?.subjectMcqPools && settings.subjectMcqPools.length > 0) {
      return settings.subjectMcqPools;
    }
    return STARTER_POOLS;
  }, [settings?.subjectMcqPools]);

  // Form state for creating / editing a Subject MCQ Pool
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [poolSubject, setPoolSubject] = useState<string>('MATH');
  const [poolSetName, setPoolSetName] = useState<string>('गणित (Math) - सेट 1');
  const [poolTargetExam, setPoolTargetExam] = useState<string>('Bihar Police Constable');
  const [poolPasteText, setPoolPasteText] = useState<string>('');
  const [poolParsedQuestions, setPoolParsedQuestions] = useState<MCQItem[]>([]);
  const [poolSubjectFilter, setPoolSubjectFilter] = useState<string>('ALL');
  const [poolSearchTerm, setPoolSearchTerm] = useState<string>('');

  // ── 2. PRACTICE SET GENERATOR STATE ────────────────────────────────────────
  const customPracticeSets: CustomPracticeSetEntry[] = useMemo(() => {
    return settings?.customPracticeSets || [];
  }, [settings?.customPracticeSets]);

  const [genPreset, setGenPreset] = useState<'BIHAR_POLICE' | 'BSSC' | 'BSEB' | 'CUSTOM'>('BIHAR_POLICE');
  const [genTitle, setGenTitle] = useState('बिहार पुलिस सिपाही - फुल प्रैक्टिस सेट #1');
  const [genSubtitle, setGenSubtitle] = useState('100 प्रश्न · 60 मिनट · No Negative Marking');
  const [genDescription, setGenDescription] = useState('बिहार पुलिस सिपाhi नवीनतम सिलेबस पर आधारित सम्पूर्ण मॉक टेस्ट');
  const [genType, setGenType] = useState<'BASIC' | 'ULTRA'>('BASIC');
  const [genTargetExam, setGenTargetExam] = useState('Bihar Police Constable');
  const [genDuration, setGenDuration] = useState(60);
  const [genNegativeMarking, setGenNegativeMarking] = useState(false);
  const [genNegativePenalty, setGenNegativePenalty] = useState(0);

  // Selected pools in Generator: poolId -> questions count to take (or 'ALL')
  const [selectedPoolConfig, setSelectedPoolConfig] = useState<Record<string, { enabled: boolean; count: number }>>({});

  // Generated / Loaded Staging Questions with individual 'selected' state for unselection!
  interface StagingQuestion extends MCQItem {
    stagingId: string;
    sourcePoolId: string;
    subjectId: string;
    subjectLabel: string;
    selected: boolean;
  }
  const [stagingQuestions, setStagingQuestions] = useState<StagingQuestion[]>([]);
  const [stagingFilterSubject, setStagingFilterSubject] = useState<string>('ALL');
  const [stagingSearch, setStagingSearch] = useState<string>('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  // Modals
  const [previewModalData, setPreviewModalData] = useState<{ title: string; questions: MCQItem[] } | null>(null);
  const [savingLoading, setSavingLoading] = useState(false);

  // Initialize selected pools on mount or change
  useEffect(() => {
    const initialConfig: Record<string, { enabled: boolean; count: number }> = {};
    subjectPools.forEach(p => {
      initialConfig[p.id] = { enabled: true, count: p.questions.length };
    });
    setSelectedPoolConfig(prev => Object.keys(prev).length === 0 ? initialConfig : prev);
  }, [subjectPools]);

  // Real-time parse for subject pool input
  useEffect(() => {
    if (!poolPasteText.trim()) {
      setPoolParsedQuestions([]);
      return;
    }
    const normalized = normalizeMcqPaste(poolPasteText);
    const parsed = parseMCQText(normalized);
    setPoolParsedQuestions(Array.isArray(parsed) ? parsed : (parsed?.questions || []));
  }, [poolPasteText]);

  // Subscribe to legacy Firestore lessons
  useEffect(() => {
    const unsub = subscribeMcqLessons((lessons) => {
      setAllLessons(lessons.filter(l => l.classLevel === 'COMPETITION' || l.subject === 'MCQ_PRACTICE'));
    });
    return unsub;
  }, []);

  // Preset setter for Practice Set Generator
  const handleApplyGenPreset = (key: 'BIHAR_POLICE' | 'BSSC' | 'BSEB' | 'CUSTOM') => {
    setGenPreset(key);
    hapticLight();
    if (key === 'BIHAR_POLICE') {
      setGenType('BASIC');
      setGenDuration(60);
      setGenNegativeMarking(false);
      setGenNegativePenalty(0);
      setGenTargetExam('Bihar Police Constable');
      setGenTitle(`बिहार पुलिस सिपाही - फुल प्रैक्टिस सेट #${customPracticeSets.length + 1}`);
      setGenSubtitle('100 प्रश्न · 60 मिनट · No Negative Marking');
      setGenDescription('बिहार पुलिस सिपाही भर्ती परीक्षा नवीनतम 80% GK/GS + Math पैटर्न पर आधारित');
    } else if (key === 'BSSC') {
      setGenType('ULTRA');
      setGenDuration(120);
      setGenNegativeMarking(true);
      setGenNegativePenalty(0.25);
      setGenTargetExam('BSSC Inter Level / CGL');
      setGenTitle(`BSSC इंटर स्तरीय - महा मॉक टेस्ट #${customPracticeSets.length + 1}`);
      setGenSubtitle('150 प्रश्न · 120 मिनट · -0.25 Negative Marking');
      setGenDescription('BSSC इंटर स्तरीय परीक्षा पैटर्न: 50 GK, 50 Reasoning, 25 सामान्य विज्ञान, 25 गणित');
    } else if (key === 'BSEB') {
      setGenType('BASIC');
      setGenDuration(60);
      setGenNegativeMarking(false);
      setGenNegativePenalty(0);
      setGenTargetExam('BSEB Bihar Board (10th/12th)');
      setGenTitle(`BSEB बिहार बोर्ड - स्पेशल ऑब्जेक्टिव सेट #${customPracticeSets.length + 1}`);
      setGenSubtitle('ऑब्जेक्टिव प्रश्न · 60 मिनट · बिहार बोर्ड स्पेशल');
      setGenDescription('BSEB मैट्रिक / इंटरमीडिएट बोर्ड परीक्षा के लिए महत्वपूर्ण ऑब्जेक्टिव प्रश्नों का सेट');
    } else {
      setGenTargetExam('All Exams (सभी प्रतियोगी परीक्षाएं)');
    }
  };

  // ── SAVE SUBJECT MCQ POOL ──────────────────────────────────────────────────
  const handleSaveSubjectPool = async () => {
    if (!poolSetName.trim()) {
      showAlert('कृपया सेट का नाम दर्ज करें (उदा. गणित सेट 1)', 'error');
      return;
    }
    if (poolParsedQuestions.length === 0) {
      showAlert('कोई प्रश्न डिटेक्ट नहीं हुआ! कृपया नीचे दिए गए फॉर्मेट में प्रश्न पेस्ट करें।', 'error');
      return;
    }

    setSavingLoading(true);
    hapticLight();
    try {
      const subjectObj = SUBJECT_OPTIONS.find(s => s.id === poolSubject) || SUBJECT_OPTIONS[0];
      const newPool: SubjectMcqPoolEntry = {
        id: editingPoolId || `pool_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        subject: poolSubject,
        subjectLabel: subjectObj.label,
        setName: poolSetName.trim(),
        targetExam: poolTargetExam,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: poolParsedQuestions.map((q, idx) => ({
          ...q,
          id: q.id || `q_${Date.now()}_${idx}`,
          sectionId: subjectObj.sectionId
        }))
      };

      const updatedPools = editingPoolId
        ? subjectPools.map(p => p.id === editingPoolId ? newPool : p)
        : [newPool, ...subjectPools];

      const newSettings = {
        ...settings,
        subjectMcqPools: updatedPools
      };

      if (onSaveSettings) await onSaveSettings(newSettings);
      await saveSystemSettings(newSettings);

      showAlert(`🎉 "${poolSetName}" (${poolParsedQuestions.length} प्रश्न) विषय बैंक में सुरक्षित हो गया!`);
      // Reset form
      setEditingPoolId(null);
      setPoolPasteText('');
      setPoolParsedQuestions([]);
      setPoolSetName('');
    } catch (err: any) {
      console.error(err);
      showAlert('सेव करने में त्रुटि: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSavingLoading(false);
    }
  };

  // Delete a subject pool
  const handleDeleteSubjectPool = async (poolId: string, name: string) => {
    if (!window.confirm(`क्या आप वाकई विषय सेट "${name}" को हटाना चाहते हैं?`)) return;
    hapticStrong();
    setSavingLoading(true);
    try {
      const updated = subjectPools.filter(p => p.id !== poolId);
      const newSettings = {
        ...settings,
        subjectMcqPools: updated
      };
      if (onSaveSettings) await onSaveSettings(newSettings);
      await saveSystemSettings(newSettings);
      showAlert(`विषय सेट "${name}" हटा दिया गया।`);
    } catch (err: any) {
      showAlert('डिलीट करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setSavingLoading(false);
    }
  };

  // Edit existing subject pool
  const handleEditSubjectPool = (pool: SubjectMcqPoolEntry) => {
    setEditingPoolId(pool.id);
    setPoolSubject(pool.subject);
    setPoolSetName(pool.setName);
    setPoolTargetExam(pool.targetExam || 'Bihar Police Constable');
    // Format questions back into pasteable text
    const textLines: string[] = [];
    pool.questions.forEach((q, i) => {
      if (q.passage?.trim()) {
        textLines.push(`Q${i + 1}. <PASSAGE>`, q.passage.trim(), `</PASSAGE> ${q.question}`);
      } else {
        textLines.push(`Q${i + 1}. ${q.question}`);
      }
      const optLabels = ['A', 'B', 'C', 'D'];
      q.options.forEach((opt, oi) => {
        textLines.push(`${optLabels[oi]}) ${opt}`);
      });
      const correctLabel = optLabels[q.correctAnswer] || 'A';
      textLines.push(`Answer: ${correctLabel}`);
      if (q.explanation) {
        textLines.push(`Explanation: ${q.explanation}`);
      }
      textLines.push('');
    });
    setPoolPasteText(textLines.join('\n'));
    setTab('SUBJECT_POOLS');
    showAlert(`✏️ "${pool.setName}" एडिट मोड में लोड किया गया।`);
  };

  // ── 2. GENERATE STAGING QUESTIONS FROM SELECTED POOLS ──────────────────────
  const handleGenerateQuestions = () => {
    hapticLight();
    const loaded: StagingQuestion[] = [];

    subjectPools.forEach(pool => {
      const cfg = selectedPoolConfig[pool.id];
      if (!cfg || !cfg.enabled) return;

      const subjectObj = SUBJECT_OPTIONS.find(s => s.id === pool.subject) || SUBJECT_OPTIONS[0];
      const countToTake = Math.min(cfg.count || pool.questions.length, pool.questions.length);
      const sliced = pool.questions.slice(0, countToTake);

      sliced.forEach((q, idx) => {
        loaded.push({
          ...q,
          stagingId: `${pool.id}_${idx}_${Date.now()}`,
          sourcePoolId: pool.id,
          subjectId: pool.subject,
          subjectLabel: subjectObj.label,
          sectionId: subjectObj.sectionId,
          selected: true // By default, all loaded questions are included!
        });
      });
    });

    if (loaded.length === 0) {
      showAlert('कृपया कम से कम एक विषय सेट (Subject Pool) को टिक करें!', 'error');
      return;
    }

    setStagingQuestions(loaded);
    showAlert(`⚡ ${loaded.length} प्रश्न लोड हो गए! अब आप नीचे देखकर किसी भी प्रश्न को अन-सेलेक्ट (हटा) सकते हैं।`);
  };

  // Toggle individual question selection ("unselect kar sakega ki set me ye question na rahega")
  const handleToggleQuestionSelect = (stagingId: string) => {
    hapticLight();
    setStagingQuestions(prev =>
      prev.map(q => q.stagingId === stagingId ? { ...q, selected: !q.selected } : q)
    );
  };

  // Select All / Deselect All
  const handleSetAllSelection = (select: boolean) => {
    hapticLight();
    setStagingQuestions(prev => prev.map(q => ({ ...q, selected: select })));
  };

  // Filtered Staging Questions for display
  const filteredStagingQuestions = useMemo(() => {
    return stagingQuestions.filter(q => {
      if (stagingFilterSubject !== 'ALL' && q.subjectId !== stagingFilterSubject) {
        return false;
      }
      if (stagingSearch.trim()) {
        const needle = stagingSearch.toLowerCase();
        const matchesQ = q.question.toLowerCase().includes(needle);
        const matchesOpts = q.options.some(o => o.toLowerCase().includes(needle));
        if (!matchesQ && !matchesOpts) return false;
      }
      return true;
    });
  }, [stagingQuestions, stagingFilterSubject, stagingSearch]);

  // Selected Count Statistics
  const selectedCount = useMemo(() => {
    return stagingQuestions.filter(q => q.selected).length;
  }, [stagingQuestions]);

  const subjectBreakdown = useMemo(() => {
    const counts: Record<string, { label: string; count: number; icon: string }> = {};
    stagingQuestions.filter(q => q.selected).forEach(q => {
      if (!counts[q.subjectId]) {
        const sub = SUBJECT_OPTIONS.find(s => s.id === q.subjectId);
        counts[q.subjectId] = {
          label: sub?.label.split(' ')[0] || q.subjectId,
          icon: sub?.icon || '📝',
          count: 0
        };
      }
      counts[q.subjectId].count += 1;
    });
    return Object.values(counts);
  }, [stagingQuestions]);

  // ── 3. SAVE ASSEMBLED PRACTICE SET ─────────────────────────────────────────
  const handlePublishPracticeSet = async () => {
    const finalQuestions = stagingQuestions.filter(q => q.selected);

    if (finalQuestions.length === 0) {
      showAlert('सेट में कम से कम 1 प्रश्न चयनित होना चाहिए!', 'error');
      return;
    }
    if (!genTitle.trim()) {
      showAlert('कृपया प्रैक्टिस सेट का शीर्षक (Title) दर्ज करें!', 'error');
      return;
    }

    setSavingLoading(true);
    hapticStrong();
    try {
      const setEntry: CustomPracticeSetEntry = {
        id: editingSetId || `custom_set_${Date.now()}`,
        title: genTitle.trim(),
        subtitle: genSubtitle.trim() || `${finalQuestions.length} प्रश्न · ${genDuration} मिनट`,
        description: genDescription.trim(),
        type: genType,
        targetExam: genTargetExam,
        durationMinutes: Number(genDuration) || (genType === 'ULTRA' ? 120 : 60),
        negativeMarking: genNegativeMarking,
        negativePenalty: genNegativeMarking ? Number(genNegativePenalty) : 0,
        marksPerQuestion: 1,
        questions: finalQuestions.map((q, idx) => ({
          id: q.id || `q_${idx + 1}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          sectionId: q.sectionId || 'gk'
        })),
        createdAt: new Date().toISOString(),
        isPublished: true
      };

      const currentSets = settings?.customPracticeSets || [];
      const updatedSets = editingSetId
        ? currentSets.map(s => s.id === editingSetId ? setEntry : s)
        : [setEntry, ...currentSets];

      const newSettings = {
        ...settings,
        customPracticeSets: updatedSets
      };

      if (onSaveSettings) await onSaveSettings(newSettings);
      await saveSystemSettings(newSettings);

      showAlert(`🎉 बधाई! "${setEntry.title}" (${finalQuestions.length} प्रश्न) सफलतापूर्वक प्रकाशित हो गया!`);
      setEditingSetId(null);
      setTab('ACTIVE_SETS');
    } catch (err: any) {
      showAlert('सेव करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setSavingLoading(false);
    }
  };

  // Edit an existing Practice Set in the Generator
  const handleEditActiveSet = (set: CustomPracticeSetEntry) => {
    hapticLight();
    setEditingSetId(set.id);
    setGenTitle(set.title);
    setGenSubtitle(set.subtitle || '');
    setGenDescription(set.description || '');
    setGenType(set.type);
    setGenTargetExam(set.targetExam || 'Bihar Police Constable');
    setGenDuration(set.durationMinutes || 60);
    setGenNegativeMarking(Boolean(set.negativeMarking));
    setGenNegativePenalty(set.negativePenalty || 0);

    // Load existing questions into staging area
    const loadedStaging: StagingQuestion[] = (set.questions || []).map((q, idx) => ({
      ...q,
      stagingId: `edit_${set.id}_${idx}`,
      sourcePoolId: 'existing',
      subjectId: q.sectionId === 'math' ? 'MATH' : q.sectionId === 'gs' ? 'SCIENCE' : 'SOCIAL_SCIENCE',
      subjectLabel: q.sectionId === 'math' ? 'गणित' : q.sectionId === 'gs' ? 'विज्ञान' : 'सामान्य ज्ञान',
      sectionId: q.sectionId || 'gk',
      selected: true
    }));
    setStagingQuestions(loadedStaging);
    setTab('GENERATOR');
    showAlert(`✏️ "${set.title}" को जेनरेटर में एडिट के लिए लोड किया गया।`);
  };

  // Delete an existing practice set
  const handleDeleteActiveSet = async (setId: string, title: string) => {
    if (!window.confirm(`क्या आप वाकई प्रैक्टिस सेट "${title}" को हटाना चाहते हैं?`)) return;
    hapticStrong();
    setSavingLoading(true);
    try {
      const currentSets = settings?.customPracticeSets || [];
      const updated = currentSets.filter(s => s.id !== setId);
      const newSettings = {
        ...settings,
        customPracticeSets: updated
      };
      if (onSaveSettings) await onSaveSettings(newSettings);
      await saveSystemSettings(newSettings);
      showAlert(`प्रैक्टिस सेट "${title}" हटा दिया गया।`);
    } catch (err: any) {
      showAlert('डिलीट त्रुटि: ' + err.message, 'error');
    } finally {
      setSavingLoading(false);
    }
  };

  // Quick sample paste helper for subject pool
  const handleInsertSampleTemplate = () => {
    hapticLight();
    const sample = `Q1. 1857 के क्रांति में बिहार का नेतृत्व किसने किया था?
A) नाना साहब
B) कुंवर सिंह
C) तात्या टोपे
D) मंगल पांडे
Answer: B
Explanation: जगदीशपुर के बाबू कुंवर सिंह ने बिहार में 1857 के विद्रोह का नेतृत्व किया था।

Q2. पटना उच्च न्यायालय की स्थापना किस वर्ष हुई थी?
A) 1912
B) 1916
C) 1919
D) 1925
Answer: B
Explanation: पटना उच्च न्यायालय की स्थापना 9 फरवरी 1916 को हुई थी।

Q3. बिहार की सबसे लंबी नदी कौन सी है?
A) गंडक
B) कोसी
C) गंगा
D) सोन
Answer: C
Explanation: गंगा नदी बिहार में लगभग 445 किमी की दूरी तय करती है।`;
    setPoolPasteText(sample);
    if (!poolSetName) setPoolSetName('बिहार सामान्य ज्ञान - सेट 1');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* ── TOP HEADER ── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title="वापस जाएं"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                🎯 Exam Set Manager & Generator
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✨ Subject-Wise Modular System
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              प्रैक्टिस सेट व विषय MCQ प्रबंधन
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              विषय चुनकर (गणित, विज्ञान, GK आदि) अलग-अलग प्रश्न बैंक बनाएं और फिर <strong>जेनरेटर से चुनकर पूरा मॉक टेस्ट असेंबल</strong> करें — जहाँ आप तय कर सकते हैं कि सेट में कौन-सा प्रश्न रहेगा और कौन-सा अन-सेलेक्ट रहेगा!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setTab('GENERATOR');
                handleGenerateQuestions();
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Zap size={14} className="fill-current text-amber-300" />
              <span>⚡ सेट जेनरेटर खोलें</span>
            </button>
          </div>
        </div>

        {/* ── MAIN NAVIGATION TABS ── */}
        <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-700/60 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { hapticLight(); setTab('SUBJECT_POOLS'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              tab === 'SUBJECT_POOLS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <FolderPlus size={14} />
            <span>1. विषय MCQ बैंक ({subjectPools.length} सेट्स)</span>
          </button>

          <button
            type="button"
            onClick={() => { hapticLight(); setTab('GENERATOR'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              tab === 'GENERATOR'
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Zap size={14} className="text-amber-300" />
            <span>2. ⚡ प्रैक्टिस सेट जेनरेटर</span>
            {stagingQuestions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-purple-900 text-purple-200 rounded text-[10px]">
                {selectedCount}/{stagingQuestions.length}Q
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { hapticLight(); setTab('ACTIVE_SETS'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              tab === 'ACTIVE_SETS'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <CheckCheck size={14} />
            <span>3. सक्रिय प्रैक्टिस सेट्स ({customPracticeSets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { hapticLight(); setTab('HISTORY'); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              tab === 'HISTORY'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <BookOpen size={13} />
            <span>4. लेसन्स हिस्ट्री ({allLessons.length})</span>
          </button>
        </div>
      </div>

      {/* ── ALERT BANNER ── */}
      {alert && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all shadow-lg animate-in fade-in duration-200 ${
          alert.type === 'success'
            ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40'
            : 'bg-rose-950/80 text-rose-200 border border-rose-500/40'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> : <AlertCircle size={18} className="text-rose-400 shrink-0" />}
          <span className="flex-1 leading-relaxed">{alert.text}</span>
          <button type="button" onClick={() => setAlert(null)} className="p-1 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: SUBJECT MCQ POOLS (विषय-वार MCQ बैंक / प्रश्न जोड़ें) ─────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'SUBJECT_POOLS' && (
        <div className="space-y-6">
          {/* ── ADD / EDIT SUBJECT SET FORM ── */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-xl space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <FolderPlus size={18} />
                </span>
                <div>
                  <h2 className="text-base font-black text-white">
                    {editingPoolId ? 'विषय MCQ सेट अपडेट करें' : 'नया विषय MCQ सेट जोड़ें (Subject MCQ Pool)'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    विषय चुनें, सेट का नाम लिखें और प्रश्न पेस्ट करें — बाद में जेनरेटर में इन्हें जोड़कर पूरा टेस्ट बना सकेंगे।
                  </p>
                </div>
              </div>

              {editingPoolId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPoolId(null);
                    setPoolPasteText('');
                    setPoolSetName('');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 hover:text-white"
                >
                  कैंसिल (नया बनाएं)
                </button>
              )}
            </div>

            {/* Subject Selector Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                <span>1. विषय चुनें (Select Subject):</span>
                <span className="text-[10px] text-indigo-400 font-bold">
                  {SUBJECT_OPTIONS.find(s => s.id === poolSubject)?.label}
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SUBJECT_OPTIONS.map(sub => {
                  const isSelected = poolSubject === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setPoolSubject(sub.id);
                        if (!poolSetName || poolSetName.includes('सेट')) {
                          const matchingPools = subjectPools.filter(p => p.subject === sub.id);
                          setPoolSetName(`${sub.label.split(' ')[0]} - सेट ${matchingPools.length + 1}`);
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? `bg-gradient-to-r ${sub.color} text-white border-white/30 shadow-md font-black ring-2 ring-indigo-400/30`
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      <span className="text-lg">{sub.icon}</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-black truncate">{sub.label.split(' ')[0]}</div>
                        <div className="text-[10px] text-slate-300 truncate">{sub.label.split('(')[1]?.replace(')', '') || sub.id}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Set Name & Target Exam */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300">
                  2. सेट का नाम (Set / Topic Name): <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={poolSetName}
                  onChange={(e) => setPoolSetName(e.target.value)}
                  placeholder="उदा. गणित - सेट 1 या विज्ञान - सेट 2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300">
                  3. लक्षित परीक्षा टैग (Target Exam Tag):
                </label>
                <select
                  value={poolTargetExam}
                  onChange={(e) => setPoolTargetExam(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                >
                  {TARGET_EXAMS.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Paste Questions Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-400" />
                  <span>4. MCQs पेस्ट करें (Paste Bulk Questions):</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsertSampleTemplate}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-[11px] font-bold border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} />
                    <span>नमूना प्रश्न लोड करें</span>
                  </button>
                  {poolParsedQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewModalData({ title: poolSetName || 'Question Preview', questions: poolParsedQuestions })}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={11} />
                      <span>प्रश्नों को देखें ({poolParsedQuestions.length})</span>
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={9}
                value={poolPasteText}
                onChange={(e) => setPoolPasteText(e.target.value)}
                placeholder={`नीचे दिए गए किसी भी आसान फॉर्मेट में प्रश्न पेस्ट करें:

Q1. प्रकाश वर्ष किसका मात्रक है?
A) समय
B) दूरी
C) प्रकाश की तीव्रता
D) द्रव्यमान
Answer: B
Explanation: प्रकाश वर्ष खगोलीय दूरी मापने का मात्रक है।`}
                className="w-full p-3.5 rounded-2xl bg-slate-950/70 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
              />

              {/* Realtime Detection Banner */}
              <div className="flex items-center justify-between text-xs px-2 py-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ListChecks size={13} className="text-indigo-400" />
                  <span>डिटेक्ट हुए प्रश्न:</span>
                  <strong className={poolParsedQuestions.length > 0 ? 'text-emerald-400 text-sm' : 'text-slate-500'}>
                    {poolParsedQuestions.length}
                  </strong>
                </span>
                <span className="text-[11px] text-slate-400">
                  स्वीकृत फॉर्मेट: Q1. / A) B) C) D) / Answer: A
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveSubjectPool}
                disabled={savingLoading || poolParsedQuestions.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Save size={15} />
                <span>{editingPoolId ? 'अपडेट सुरक्षित करें' : `💾 विषय बैंक में सुरक्षित करें (${poolParsedQuestions.length} प्रश्न)`}</span>
              </button>
            </div>
          </div>

          {/* ── LIST OF SAVED SUBJECT POOLS ── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FolderPlus size={16} className="text-indigo-400" />
                  <span>मौजूदा विषय MCQ बैंक (Saved Subject Sets)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {subjectPools.length} सेट्स
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  इनमें से प्रश्न चुनकर आप कभी भी <strong>⚡ सेट जेनरेटर</strong> में नया टेस्ट बना सकते हैं।
                </p>
              </div>

              {/* Search & Subject Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="सेट खोजें..."
                    value={poolSearchTerm}
                    onChange={(e) => setPoolSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold w-36 sm:w-44 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setPoolSubjectFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 cursor-pointer ${
                  poolSubjectFilter === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                सभी विषय ({subjectPools.length})
              </button>
              {SUBJECT_OPTIONS.map(sub => {
                const count = subjectPools.filter(p => p.subject === sub.id).length;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setPoolSubjectFilter(sub.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer ${
                      poolSubjectFilter === sub.id
                        ? 'bg-indigo-600 text-white font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>{sub.icon}</span>
                    <span>{sub.label.split(' ')[0]}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Pools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {subjectPools
                .filter(p => {
                  if (poolSubjectFilter !== 'ALL' && p.subject !== poolSubjectFilter) return false;
                  if (poolSearchTerm.trim()) {
                    const matchName = p.setName.toLowerCase().includes(poolSearchTerm.toLowerCase());
                    const matchExam = (p.targetExam || '').toLowerCase().includes(poolSearchTerm.toLowerCase());
                    if (!matchName && !matchExam) return false;
                  }
                  return true;
                })
                .map(pool => {
                  const subObj = SUBJECT_OPTIONS.find(s => s.id === pool.subject) || SUBJECT_OPTIONS[0];
                  return (
                    <div
                      key={pool.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-indigo-500/50 transition shadow-md space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${subObj.badgeColor}`}>
                            <span>{subObj.icon}</span>
                            <span>{subObj.label.split(' ')[0]}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                            {pool.questions.length} प्रश्न
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white leading-snug">
                          {pool.setName}
                        </h4>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span className="text-slate-500">परीक्षा:</span>
                          <span className="text-slate-300 font-bold">{pool.targetExam || 'General'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setPreviewModalData({ title: pool.setName, questions: pool.questions })}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition"
                          title="प्रश्न देखें"
                        >
                          <Eye size={12} className="text-indigo-400" />
                          <span>देखें</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditSubjectPool(pool)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                          title="एडिट करें"
                        >
                          <Settings2 size={13} className="text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubjectPool(pool.id, pool.setName)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 cursor-pointer"
                          title="हटाएं"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: PRACTICE SET GENERATOR (⚡ असेंबलर व क्वेश्चन अन-सेलेक्टर) ─ */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'GENERATOR' && (
        <div className="space-y-6">
          {/* ── STEP 1: TEST METADATA & PRESETS ── */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-xl space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                  <Zap size={18} className="fill-current text-amber-300" />
                </span>
                <div>
                  <h2 className="text-base font-black text-white">
                    कदम 1: टेस्ट सेटिंग्स व परीक्षा पैटर्न
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    परीक्षा का नाम, समय व नेगेटिव मार्किंग तय करें।
                  </p>
                </div>
              </div>

              {/* 1-Click Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyGenPreset('BIHAR_POLICE')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                    genPreset === 'BIHAR_POLICE'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  👮 बिहार पुलिस (60m)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyGenPreset('BSSC')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                    genPreset === 'BSSC'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  🏛️ BSSC (120m)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyGenPreset('BSEB')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                    genPreset === 'BSEB'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  🟠 BSEB बोर्ड
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-black text-slate-300">
                  प्रैक्टिस सेट का नाम (Title): <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="उदा. बिहार पुलिस सिपाही - फुल प्रैक्टिस सेट #1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300">
                  सेट प्रकार (Tier Level):
                </label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none"
                >
                  <option value="BASIC">बेसिक (Basic VIP - 60 Min)</option>
                  <option value="ULTRA">अल्ट्रा (Ultra VIP - 120 Min)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300">
                  समय (अवधि मिनटों में):
                </label>
                <input
                  type="number"
                  value={genDuration}
                  onChange={(e) => setGenDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300">
                  नेगेटिव मार्किंग (Negative Marking):
                </label>
                <div className="flex items-center gap-3 h-10">
                  <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genNegativeMarking}
                      onChange={(e) => {
                        setGenNegativeMarking(e.target.checked);
                        if (e.target.checked && genNegativePenalty === 0) setGenNegativePenalty(0.25);
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span>सक्रिय करें</span>
                  </label>
                  {genNegativeMarking && (
                    <input
                      type="number"
                      step="0.05"
                      value={genNegativePenalty}
                      onChange={(e) => setGenNegativePenalty(Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-bold text-center"
                      title="कटौती अंक"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300">
                  लक्षित परीक्षा (Exam Target):
                </label>
                <select
                  value={genTargetExam}
                  onChange={(e) => setGenTargetExam(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none"
                >
                  {TARGET_EXAMS.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── STEP 2: CHOOSE WHICH SUBJECT POOLS TO PULL FROM ── */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    <ListChecks size={16} />
                  </span>
                  <span>कदम 2: किन विषय सेट्स से प्रश्न उठाने हैं? (Select Pools)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  प्रत्येक विषय से कितने प्रश्न लोड करने हैं, वह चुनें। फिर नीचे <strong>"⚡ प्रश्न लोड करें"</strong> दबाएं।
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateQuestions}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Zap size={14} className="fill-current text-amber-300" />
                <span>⚡ प्रश्न लोड व जेनरेट करें</span>
              </button>
            </div>

            {/* Pools Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subjectPools.map(pool => {
                const cfg = selectedPoolConfig[pool.id] || { enabled: true, count: pool.questions.length };
                const subObj = SUBJECT_OPTIONS.find(s => s.id === pool.subject) || SUBJECT_OPTIONS[0];

                return (
                  <div
                    key={pool.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      cfg.enabled
                        ? 'bg-slate-800/90 border-indigo-500/50 shadow-md'
                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => {
                          hapticLight();
                          setSelectedPoolConfig(prev => ({
                            ...prev,
                            [pool.id]: {
                              enabled: e.target.checked,
                              count: prev[pool.id]?.count || pool.questions.length
                            }
                          }));
                        }}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 cursor-pointer"
                      />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${subObj.badgeColor}`}>
                            {subObj.icon} {subObj.label.split(' ')[0]}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (उपलब्ध: {pool.questions.length}Q)
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-white truncate mt-1">
                          {pool.setName}
                        </h4>

                        {cfg.enabled && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold">कितने प्रश्न लें:</span>
                            <input
                              type="number"
                              min={1}
                              max={pool.questions.length}
                              value={cfg.count}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSelectedPoolConfig(prev => ({
                                  ...prev,
                                  [pool.id]: {
                                    ...prev[pool.id],
                                    count: Math.max(1, Math.min(pool.questions.length, val))
                                  }
                                }));
                              }}
                              className="w-16 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-bold text-center"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPoolConfig(prev => ({
                                  ...prev,
                                  [pool.id]: { ...prev[pool.id], count: pool.questions.length }
                                }));
                              }}
                              className="text-[10px] text-indigo-400 hover:underline"
                            >
                              सभी
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── STEP 3: INTERACTIVE QUESTION SELECTOR & UNSELECT GRID ── */}
          {/* USER: "admin set me kon kon question aayefa dekh sakega aur unselect jar sakega ki set me ye question na rahega" */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Eye size={16} />
                  </span>
                  <h3 className="text-base font-black text-white">
                    कदम 3: प्रश्नों की जांच और चयन (Question Inspector & Unselect)
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  यहाँ आप हर एक प्रश्न को देखकर टिक या अन-टिक (Unselect) कर सकते हैं। जो प्रश्न अन-टिक होगा, वह सेट में शामिल नहीं होगा।
                </p>
              </div>

              {/* Action Buttons: Select All / Deselect All / Publish */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSetAllSelection(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1 cursor-pointer transition"
                >
                  <Check size={12} />
                  <span>सभी चुनें ({stagingQuestions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllSelection(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 text-xs font-black flex items-center gap-1 cursor-pointer transition"
                >
                  <X size={12} />
                  <span>सभी हटाएं</span>
                </button>
              </div>
            </div>

            {/* Live Count & Subject Breakdown Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  सेट में शामिल प्रश्नों की संख्या:
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">
                    {selectedCount}
                  </span>
                  <span className="text-xs text-slate-400">
                    / {stagingQuestions.length} कुल प्रश्न
                  </span>
                  {selectedCount === 0 && (
                    <span className="text-xs text-rose-400 font-bold ml-2">
                      ⚠️ कृपया कम से कम 1 प्रश्न शामिल करें
                    </span>
                  )}
                </div>
              </div>

              {/* Subject Breakdown Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {subjectBreakdown.map((b, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1"
                  >
                    <span>{b.icon}</span>
                    <span>{b.label}:</span>
                    <strong className="text-emerald-400">{b.count}</strong>
                  </span>
                ))}
              </div>

              {/* Direct Publish Button */}
              <button
                type="button"
                onClick={handlePublishPracticeSet}
                disabled={savingLoading || selectedCount === 0}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Save size={14} />
                <span>💾 यह सेट प्रकाशित करें ({selectedCount} Qs)</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setStagingFilterSubject('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 cursor-pointer ${
                    stagingFilterSubject === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  सभी ({stagingQuestions.length})
                </button>
                {SUBJECT_OPTIONS.map(sub => {
                  const count = stagingQuestions.filter(q => q.subjectId === sub.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setStagingFilterSubject(sub.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer ${
                        stagingFilterSubject === sub.id
                          ? 'bg-indigo-600 text-white font-black'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.label.split(' ')[0]}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="प्रश्न खोजें..."
                  value={stagingSearch}
                  onChange={(e) => setStagingSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold w-full sm:w-56 focus:outline-none"
                />
              </div>
            </div>

            {/* Questions Cards List */}
            {stagingQuestions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                <div className="text-3xl">📥</div>
                <div className="text-sm font-bold text-slate-300">
                  कोई प्रश्न लोड नहीं हुआ है!
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  ऊपर दिए गए कदम 2 में विषय सेट्स को टिक करें और <strong>"⚡ प्रश्न लोड व जेनरेट करें"</strong> बटन दबाएं।
                </p>
                <button
                  type="button"
                  onClick={handleGenerateQuestions}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 cursor-pointer"
                >
                  अभी प्रश्न लोड करें
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredStagingQuestions.map((q, idx) => {
                  const isIncluded = q.selected;
                  const optLabels = ['A', 'B', 'C', 'D'];
                  const subObj = SUBJECT_OPTIONS.find(s => s.id === q.subjectId);

                  return (
                    <div
                      key={q.stagingId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isIncluded
                          ? 'bg-slate-850 bg-slate-900 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox & Header */}
                        <div className="flex items-start gap-3 flex-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => handleToggleQuestionSelect(q.stagingId)}
                              className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </label>

                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700">
                                प्रश्न #{idx + 1}
                              </span>
                              {subObj && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${subObj.badgeColor}`}>
                                  {subObj.icon} {subObj.label.split(' ')[0]}
                                </span>
                              )}
                              {isIncluded ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                                  <Check size={10} /> शामिल है (Included)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                                  <X size={10} /> हटाया गया (Excluded)
                                </span>
                              )}
                            </div>

                            {/* Question text */}
                            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                              {q.question}
                            </p>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {q.options.map((opt, oi) => {
                                const isCorrect = q.correctAnswer === oi;
                                return (
                                  <div
                                    key={oi}
                                    className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                                      isCorrect
                                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 font-bold'
                                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                                    }`}
                                  >
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                                      isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                                    }`}>
                                      {optLabels[oi]}
                                    </span>
                                    <span className="flex-1 truncate">{opt}</span>
                                    {isCorrect && <Check size={12} className="text-emerald-400 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation if any */}
                            {q.explanation && (
                              <p className="text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded-xl border border-slate-800/60 leading-relaxed">
                                💡 <strong className="text-slate-300">व्याख्या:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Unselect / Select Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionSelect(q.stagingId)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                            isIncluded
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isIncluded ? '✕ सेट से हटाएं' : '✓ वापस शामिल करें'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Final Publish Banner */}
            {stagingQuestions.length > 0 && (
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  चयनित: <strong className="text-emerald-400">{selectedCount}</strong> प्रश्न · अवधि: <strong>{genDuration} मिनट</strong> · प्रकार: <strong>{genType}</strong>
                </div>

                <button
                  type="button"
                  onClick={handlePublishPracticeSet}
                  disabled={savingLoading || selectedCount === 0}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Save size={16} />
                  <span>💾 यह प्रैक्टिस सेट प्रकाशित करें ({selectedCount} Qs)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: ACTIVE PRACTICE SETS (📋 सक्रिय प्रैक्टिस सेट्स) ────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'ACTIVE_SETS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <CheckCheck size={18} className="text-emerald-400" />
                <span>सक्रिय प्रैक्टिस सेट्स (Active Practice Sets)</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {customPracticeSets.length} सेट्स
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ये सेट्स विद्यार्थी सीधे <strong>Practice Sets (मॉक टेस्ट)</strong> स्क्रीन पर देकर अपनी तैयारी का आकलन कर सकते हैं।
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                setEditingSetId(null);
                setTab('GENERATOR');
                handleGenerateQuestions();
              }}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus size={14} />
              <span>नया सेट असेंबल करें</span>
            </button>
          </div>

          {customPracticeSets.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="text-4xl">📝</div>
              <h3 className="text-base font-bold text-white">कोई प्रैक्टिस सेट नहीं बना है!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                <strong>⚡ प्रैक्टिस सेट जेनरेटर</strong> टैब में जाकर विषय सेट्स को टिक करें और कुछ ही सेकंडों में नया मॉक टेस्ट बनाएं।
              </p>
              <button
                type="button"
                onClick={() => {
                  setTab('GENERATOR');
                  handleGenerateQuestions();
                }}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 cursor-pointer"
              >
                ⚡ पहला प्रैक्टिस सेट बनाएं
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customPracticeSets.map((set, idx) => {
                const isUltra = set.type === 'ULTRA';
                return (
                  <div
                    key={set.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-700/80 hover:border-indigo-500/50 transition shadow-lg space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          isUltra
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {isUltra ? '⚡ Ultra Set (120m)' : '👮 Basic Set (60m)'}
                        </span>

                        <span className="text-[11px] text-slate-400 font-bold">
                          #{idx + 1}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white leading-snug">
                        {set.title}
                      </h3>

                      <p className="text-xs text-slate-300 line-clamp-2">
                        {set.description || set.subtitle}
                      </p>

                      {/* Specs badges */}
                      <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700 text-slate-300 flex items-center gap-1">
                          <Clock size={12} className="text-indigo-400" />
                          <span>{set.durationMinutes} मिनट</span>
                        </span>
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700 text-slate-300 flex items-center gap-1">
                          <FileText size={12} className="text-indigo-400" />
                          <span>{set.questions?.length || 0} प्रश्न</span>
                        </span>
                        {set.negativeMarking ? (
                          <span className="bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded-md border border-rose-500/20 text-[11px]">
                            -{set.negativePenalty || 0.25} Negative
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[11px]">
                            No Negative
                          </span>
                        )}
                        <span className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/20 text-[11px]">
                          {set.targetExam || 'General'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setPreviewModalData({ title: set.title, questions: set.questions || [] })}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <Eye size={13} className="text-indigo-400" />
                        <span>प्रश्न देखें ({set.questions?.length || 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditActiveSet(set)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                        title="जेनरेटर में एडिट करें"
                      >
                        <Settings2 size={14} className="text-amber-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteActiveSet(set.id, set.title)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 cursor-pointer"
                        title="डिलीट करें"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: FIRESTORE LESSONS HISTORY (📚 प्रश्न बैंक इतिहास) ───────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-400" />
              <span>Firestore MCQ लेसन्स इतिहास ({allLessons.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allLessons.map(lesson => (
              <div key={lesson.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {lesson.classLevel} · {lesson.subject}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {lesson.questions?.length || 0} Qs
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewModalData({ title: lesson.title, questions: lesson.questions || [] })}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Eye size={12} /> प्रश्न देखें
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`क्या आप "${lesson.title}" को डिलीट करना चाहते हैं?`)) return;
                      await deleteMcqLesson(lesson.id);
                      showAlert('लेसन हटा दिया गया।');
                    }}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} /> हटाएं
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUESTION PREVIEW MODAL ── */}
      {previewModalData && (
        <div className="fixed inset-0 z-[1000005] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  {previewModalData.title}
                </h3>
                <p className="text-xs text-slate-400">
                  कुल {previewModalData.questions.length} प्रश्न उपलब्ध
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalData(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {previewModalData.questions.map((q, idx) => {
                const optLabels = ['A', 'B', 'C', 'D'];
                return (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/20 text-indigo-300">
                        Q{idx + 1}
                      </span>
                    </div>
                    <McqQuestionDisplay q={q} variant="dark" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {q.options?.map((opt, oi) => {
                        const isCorrect = q.correctAnswer === oi;
                        return (
                          <div
                            key={oi}
                            className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 border ${
                              isCorrect
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="font-bold">{optLabels[oi]})</span>
                            <span className="flex-1 truncate">{opt}</span>
                            {isCorrect && <Check size={11} className="text-emerald-400" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-lg leading-relaxed">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
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
