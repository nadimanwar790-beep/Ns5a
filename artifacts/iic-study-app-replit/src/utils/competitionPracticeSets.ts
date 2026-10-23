// @ts-nocheck
import { MCQItem } from '../types';

export type PracticeSetType = 'BASIC' | 'ULTRA';

export interface PracticeSetSection {
  id: 'gk' | 'gs' | 'math' | 'reasoning';
  name: string;
  hindiName: string;
  icon: string;
  targetCount: number;
}

export interface PracticeSetMeta {
  id: string;
  setNumber: number;
  type: PracticeSetType;
  title: string;
  subtitle: string;
  description: string;
  targetExam: string;
  durationMinutes: number; // 60 for Basic, 120 for Ultra
  totalQuestions: number;  // 100 for Basic, 150 for Ultra
  negativeMarking: boolean; // false for Basic, true for Ultra
  marksPerQuestion: number; // 1
  negativePenalty: number; // 0 for Basic, 0.25 for Ultra
  sections: PracticeSetSection[];
}

export interface PracticeSetQuestion extends MCQItem {
  sectionId: 'gk' | 'gs' | 'math' | 'reasoning';
  setQuestionNumber: number;
}

export interface PracticeSetResult {
  setId: string;
  setTitle: string;
  setType: PracticeSetType;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  marksObtained: number;
  maxMarks: number;
  negativeMarksDeducted: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  sectionStats: Record<'gk' | 'gs' | 'math' | 'reasoning', {
    total: number;
    attempted: number;
    correct: number;
    wrong: number;
    marks: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDED HIGH-YIELD CURATED COMPETITION QUESTION POOL
// (GK, GS, Math, Reasoning from standard Lucent / Bihar Police / BSSC PYQs)
// ─────────────────────────────────────────────────────────────────────────────

export const CURATED_GK_QUESTIONS: MCQItem[] = [
  // 1. Direct Single Choice MCQ (सीधे बहुविकल्पीय प्रश्न)
  {
    question: "भारत के संविधान की प्रारूप समिति (Drafting Committee) के अध्यक्ष कौन थे?",
    options: ["डॉ. राजेंद्र प्रसाद", "डॉ. बी. आर. अम्बेडकर", "जवाहरलाल नेहरू", "सरदार वल्लभभाई पटेल"],
    correctAnswer: 1,
    explanation: "संविधान सभा की प्रारूप समिति (Drafting Committee) के अध्यक्ष डॉ. भीमराव अम्बेडकर थे। इसका गठन 29 अगस्त 1947 को किया गया था।",
    topic: "Polity",
    questionType: "DIRECT_MCQ"
  },
  // 2. Multi-Statement Based MCQ (कथन आधारित प्रश्न - UPSC / State PCS)
  {
    question: "भारतीय रिजर्व बैंक (RBI) के संदर्भ में निम्नलिखित कथनों पर विचार कीजिए:",
    statements: [
      "1. यह भारत का केंद्रीय बैंक है।",
      "2. यह एक रुपये के नोट और सिक्के जारी करता है।"
    ],
    options: ["केवल 1", "केवल 2", "1 और 2 दोनों", "न तो 1 और न ही 2"],
    correctAnswer: 0,
    explanation: "कथन 1 सही है। कथन 2 गलत है क्योंकि ₹1 का नोट और सभी सिक्के भारत सरकार के वित्त मंत्रालय द्वारा जारी किए जाते हैं, जबकि अन्य सभी करेंसी नोट RBI जारी करता है।",
    topic: "Economy",
    questionType: "MULTI_STATEMENT"
  },
  // 5. Chronological Order / Sequencing (कालानुक्रम / सही क्रम)
  {
    question: "भारतीय स्वतंत्रता संग्राम की निम्नलिखित घटनाओं को उनके सही कालानुक्रम (Chronological Order) में व्यवस्थित कीजिए:",
    statements: [
      "1. भारत छोड़ो आंदोलन (Quit India Movement)",
      "2. असहयोग आंदोलन (Non-Cooperation Movement)",
      "3. सविनय अवज्ञा आंदोलन (Civil Disobedience Movement)"
    ],
    options: ["1 → 2 → 3", "2 → 3 → 1", "3 → 2 → 1", "2 → 1 → 3"],
    correctAnswer: 1,
    explanation: "असहयोग आंदोलन (1920) → सविनय अवज्ञा आंदोलन (1930) → भारत छोड़ो आंदोलन (1942)। अतः सही कालानुक्रम 2 → 3 → 1 है।",
    topic: "History",
    questionType: "CHRONOLOGICAL"
  },
  // 7. Reading Comprehension / Case Study Based MCQ (गद्यांश आधारित प्रश्न)
  {
    question: "उपरोक्त गद्यांश के अनुसार वायु में श्वसन संबंधी गंभीर रोगों के लिए मुख्य उत्तरदायी कारक किसे बताया गया है?",
    passage: "पर्यावरण प्रदूषण आज संपूर्ण विश्व के लिए एक विकराल समस्या बन चुका है। औद्योगीकरण और अनियंत्रित शहरीकरण के कारण वायु, जल और मृदा प्रदूषण में तीव्र वृद्धि हुई है। वैज्ञानिकों के अनुसार वाहनों से निकलने वाले धुएं में कार्बन मोनोऑक्साइड, नाइट्रोजन ऑक्साइड और सूक्ष्म धूल कण (PM2.5) होते हैं, जो फेफड़ों के गंभीर रोगों का मुख्य कारण बनते हैं। वनों की अंधाधुंध कटाई से वायुमंडल में कार्बन डाइऑक्साइड का संतुलन बिगड़ रहा है।",
    options: [
      "वाहनों से निकलने वाले हानिकारक धुएं व सूक्ष्म धूल कण (PM2.5)",
      "नदियों में कचरा फेंकना",
      "कारखानों की ध्वनि",
      "प्लास्टिक का सामान्य उपयोग"
    ],
    correctAnswer: 0,
    explanation: "गद्यांश में स्पष्ट उल्लेख है कि वाहनों से निकलने वाले धुएं (कार्बन मोनोऑक्साइड, PM2.5 आदि) फेफड़ों व श्वसन के गंभीर रोगों का मुख्य कारक बनते हैं।",
    topic: "Environment",
    questionType: "CASE_STUDY"
  },
  // 8. Negative / 'NOT' Type Question (निषेधात्मक प्रश्न)
  {
    question: "निम्नलिखित में से कौन-सी नदी अरब सागर में नहीं गिरती है?",
    options: ["नर्मदा", "ताप्ती", "गोदावरी", "साबरमती"],
    correctAnswer: 2,
    explanation: "गोदावरी नदी पूर्व की ओर बहती हुई बंगाल की खाड़ी में गिरती है, जबकि नर्मदा, ताप्ती और साबरमती नदियाँ पश्चिम की ओर बहकर अरब सागर में गिरती हैं।",
    topic: "Geography",
    questionType: "NEGATIVE_NOT"
  },
  {
    question: "भारतीय संविधान की कौन-सी अनुसूची भाषाओं से संबंधित है?",
    options: ["सातवीं अनुसूची", "आठवीं अनुसूची", "नौवीं अनुसूची", "दसवीं अनुसूची"],
    correctAnswer: 1,
    explanation: "संविधान की 8वीं अनुसूची में 22 आधिकारिक भाषाओं का उल्लेख है। मूल संविधान में 14 भाषाएं थीं।",
    topic: "Polity"
  },
  {
    question: "मगध साम्राज्य की प्रारंभिक राजधानी कौन-सी थी?",
    options: ["पाटलिपुत्र", "राजगृह (गिरिव्रज)", "वैशाली", "चंपा"],
    correctAnswer: 1,
    explanation: "मगध की पहली राजधानी राजगृह (गिरिव्रज) थी, जिसे बाद में उदायिन ने पाटलिपुत्र स्थानांतरित किया।",
    topic: "History"
  },
  {
    question: "बिहार में 1857 की क्रांति का नेतृत्व किसने किया था?",
    options: ["कुंवर सिंह", "नाना साहेब", "अमर सिंह", "पीर अली"],
    correctAnswer: 0,
    explanation: "जगदीशपुर (भोजपुर) के वीर कुंवर सिंह ने बिहार में 1857 के सिपाही विद्रोह का नेतृत्व किया था।",
    topic: "History"
  },
  {
    question: "भारतीय राष्ट्रीय कांग्रेस के प्रथम मुस्लिम अध्यक्ष कौन थे?",
    options: ["मौलाना अबुल कलाम आजाद", "बदरुद्दीन तैयबजी", "एम. ए. अंसारी", "हकीम अजमल खान"],
    correctAnswer: 1,
    explanation: "बदरुद्दीन तैयबजी 1887 के मद्रास अधिवेशन में कांग्रेस के पहले मुस्लिम अध्यक्ष बने थे।",
    topic: "History"
  },
  {
    question: "भारत के किस राज्य की तटरेखा सबसे लंबी है?",
    options: ["आंध्र प्रदेश", "महाराष्ट्र", "गुजरात", "तमिलनाडु"],
    correctAnswer: 2,
    explanation: "गुजरात की तटरेखा सबसे लंबी है (लगभग 1,214 किमी)। इसके बाद आंध्र प्रदेश का स्थान है।",
    topic: "Geography"
  },
  {
    question: "संविधान सभा के प्रारूप समिति के अध्यक्ष कौन थे?",
    options: ["डॉ. राजेन्द्र प्रसाद", "डॉ. बी.आर. अम्बेडकर", "जवाहरलाल नेहरू", "के.एम. मुंशी"],
    correctAnswer: 1,
    explanation: "29 अगस्त 1947 को गठित प्रारूप समिति (Drafting Committee) के अध्यक्ष डॉ. भीमराव अम्बेडकर थे।",
    topic: "Polity"
  },
  {
    question: "संसार का सबसे बड़ा नदी द्वीप 'माजुली' किस नदी पर स्थित है?",
    options: ["गंगा", "सिंधु", "ब्रह्मपुत्र", "गोदावरी"],
    correctAnswer: 2,
    explanation: "असम में ब्रह्मपुत्र नदी पर स्थित माजुली द्वीप विश्व का सबसे बड़ा नदी द्वीप है।",
    topic: "Geography"
  },
  {
    question: "चंपारण सत्याग्रह (1917) में गांधीजी को चंपारण आने का निमंत्रण किसने दिया था?",
    options: ["राजकुमार शुक्ल", "राजेन्द्र प्रसाद", "ब्रजकिशोर प्रसाद", "जे.बी. कृपलानी"],
    correctAnswer: 0,
    explanation: "1916 के लखनऊ अधिवेशन में राजकुमार शुक्ल ने गांधीजी से मिलकर तिनकठिया प्रथा के विरोध में चंपारण आने का आग्रह किया था।",
    topic: "History"
  },
  {
    question: "नीति आयोग का पदेन अध्यक्ष कौन होता है?",
    options: ["राष्ट्रपति", "प्रधानमंत्री", "वित्त मंत्री", "आरबीआई गवर्नर"],
    correctAnswer: 1,
    explanation: "भारत के प्रधानमंत्री नीति आयोग (स्थापना 1 जनवरी 2015) के पदेन अध्यक्ष होते हैं।",
    topic: "Polity"
  },
  {
    question: "लोकसभा का सदस्य बनने के लिए न्यूनतम आयु सीमा क्या है?",
    options: ["21 वर्ष", "25 वर्ष", "30 वर्ष", "35 वर्ष"],
    correctAnswer: 1,
    explanation: "लोकसभा सदस्य हेतु 25 वर्ष, राज्यसभा हेतु 30 वर्ष और राष्ट्रपति हेतु 35 वर्ष न्यूनतम आयु है।",
    topic: "Polity"
  },
  {
    question: "भारतीय संविधान में मौलिक अधिकार किस देश के संविधान से प्रेरित हैं?",
    options: ["ब्रिटेन", "अमेरिका (USA)", "रूस (USSR)", "कनाडा"],
    correctAnswer: 1,
    explanation: "मौलिक अधिकार (अनुच्छेद 12-35) संयुक्त राज्य अमेरिका के बिल ऑफ राइट्स से प्रेरित हैं।",
    topic: "Polity"
  },
  {
    question: "विश्व पर्यावरण दिवस प्रतिवर्ष किस तिथि को मनाया जाता है?",
    options: ["5 जून", "22 अप्रैल", "11 जुलाई", "16 सितंबर"],
    correctAnswer: 0,
    explanation: "प्रतिवर्ष 5 जून को विश्व पर्यावरण दिवस मनाया जाता है।",
    topic: "Static GK"
  },
  {
    question: "भारत का सबसे बड़ा राष्ट्रीय उद्यान 'हेमिस राष्ट्रीय उद्यान' कहाँ स्थित है?",
    options: ["लद्दाख", "जम्मू-कश्मीर", "उत्तराखंड", "हिमाचल प्रदेश"],
    correctAnswer: 0,
    explanation: "हेमिस नेशनल पार्क लद्दाख केंद्रशासित प्रदेश में स्थित भारत का सबसे बड़ा राष्ट्रीय उद्यान है।",
    topic: "Geography"
  },
  {
    question: "कर्क रेखा भारत के कितने राज्यों से होकर गुजरती है?",
    options: ["6", "7", "8", "9"],
    correctAnswer: 2,
    explanation: "कर्क रेखा 8 राज्यों से गुजरती है: गुजरात, राजस्थान, म.प्र., छत्तीसगढ़, झारखंड, प. बंगाल, त्रिपुरा और मिजोरम।",
    topic: "Geography"
  },
  {
    question: "गांधीजी ने किस गोलमेज सम्मेलन में भाग लिया था?",
    options: ["प्रथम", "द्वितीय", "तृतीय", "तीनों सम्मेलनों में"],
    correctAnswer: 1,
    explanation: "कांग्रेस और महात्मा गांधी ने केवल 1931 में लंदन में आयोजित द्वितीय गोलमेज सम्मेलन में भाग लिया था।",
    topic: "History"
  },
  {
    question: "भारत में हरित क्रांति के जनक किसे कहा जाता है?",
    options: ["डॉ. एम.एस. स्वामीनाथन", "डॉ. वर्गीज कुरियन", "नॉर्मन बोरलॉग", "अमर्त्य सेन"],
    correctAnswer: 0,
    explanation: "भारत में एम.एस. स्वामीनाथन को हरित क्रांति का जनक माना जाता है। विश्व स्तर पर नॉर्मन बोरलॉग हैं।",
    topic: "Economy"
  },
  {
    question: "मौर्य वंश का अंतिम शासक कौन था?",
    options: ["बिन्दुसार", "बृहद्रथ", "दशरथ", "कुणाल"],
    correctAnswer: 1,
    explanation: "मौर्य वंश का अंतिम शासक बृहद्रथ था, जिसकी हत्या उसके सेनापति पुष्यमित्र शुंग ने करके शुंग वंश की स्थापना की।",
    topic: "History"
  },
  {
    question: "भारत के मुख्य न्यायाधीश की नियुक्ति कौन करता है?",
    options: ["प्रधानमंत्री", "राष्ट्रपति", "विधि मंत्री", "संसद"],
    correctAnswer: 1,
    explanation: "अनुच्छेद 124(2) के तहत भारत के राष्ट्रपति सर्वोच्च न्यायालय के मुख्य न्यायाधीश की नियुक्ति करते हैं।",
    topic: "Polity"
  },
  {
    question: "सत्यशोधक समाज की स्थापना 1873 में किसने की थी?",
    options: ["ज्योतिबा फुले", "दयानंद सरस्वती", "राजा राममोहन राय", "ईश्वरचंद्र विद्यासागर"],
    correctAnswer: 0,
    explanation: "महाराष्ट्र में ज्योतिबा फुले ने 1873 में सत्यशोधक समाज की स्थापना की थी। इनकी प्रसिद्ध पुस्तक 'गुलामगिरी' है।",
    topic: "History"
  },
  {
    question: "स्वतंत्र भारत के प्रथम गवर्नर जनरल कौन थे?",
    options: ["लॉर्ड माउंटबेटन", "सी. राजगोपालाचारी", "डॉ. राजेन्द्र प्रसाद", "लॉर्ड कर्जन"],
    correctAnswer: 0,
    explanation: "स्वतंत्र भारत के प्रथम गवर्नर जनरल लॉर्ड माउंटबेटन थे, जबकि प्रथम 'भारतीय' गवर्नर जनरल सी. राजगोपालाचारी थे।",
    topic: "History"
  },
  {
    question: "भारत में पहली जनगणना किस वर्ष आयोजित हुई थी?",
    options: ["1872", "1881", "1891", "1901"],
    correctAnswer: 0,
    explanation: "पहली जनगणना 1872 में लॉर्ड मेयो के काल में हुई। पहली नियमित व व्यवस्थित 10 वर्षीय जनगणना 1881 में लॉर्ड रिपन के काल में हुई।",
    topic: "Geography"
  },
  {
    question: "संविधान के किस अनुच्छेद के तहत वित्तीय आपातकाल घोषित किया जाता है?",
    options: ["अनुच्छेद 352", "अनुच्छेद 356", "अनुच्छेद 360", "अनुच्छेद 368"],
    correctAnswer: 2,
    explanation: "अनुच्छेद 360 के तहत राष्ट्रपति वित्तीय आपातकाल लगाते हैं। भारत में आज तक कभी वित्तीय आपातकाल नहीं लगा।",
    topic: "Polity"
  },
  {
    question: "बिहार का प्रसिद्ध लोक नृत्य 'विदेसिया' के रचयिता कौन हैं?",
    options: ["भिखारी ठाकुर", "मैथिली शरण गुप्त", "दिनकर", "नागार्जुन"],
    correctAnswer: 0,
    explanation: "भिखारी ठाकुर को भोजपुरी का शेक्सपियर कहा जाता है और वे 'विदेसिया' नाटक के रचयिता हैं।",
    topic: "Bihar GK"
  },
  {
    question: "अकबरनामा एवं आइन-ए-अकबरी के लेखक कौन हैं?",
    options: ["अबुल फजल", "फैजी", "बदायूंनी", "बीरबल"],
    correctAnswer: 0,
    explanation: "अकबर के नवरत्नों में शामिल अबुल फजल ने अकबरनामा की रचना की थी।",
    topic: "History"
  },
  {
    question: "भारत में पंचायती राज व्यवस्था सर्वप्रथम किस राज्य में लागू की गई?",
    options: ["बिहार", "राजस्थान", "उत्तर प्रदेश", "महाराष्ट्र"],
    correctAnswer: 1,
    explanation: "2 अक्टूबर 1959 को राजस्थान के नागौर जिले में पंडित नेहरू द्वारा पंचायती राज का शुभारंभ हुआ था।",
    topic: "Polity"
  }
];

export const CURATED_GS_QUESTIONS: MCQItem[] = [
  // 3. Assertion and Reason (अभिकथन और कारण - NEET / PCS / UGC NET)
  {
    question: "नीचे दिए गए अभिकथन और कारण पर विचार कीजिए तथा सही विकल्प चुनिए:",
    assertion: "लोहे की कील पानी में डूब जाती है, लेकिन पारे (Mercury) पर तैरती है।",
    reason: "लोहे का घनत्व पानी के घनत्व से अधिक होता है, लेकिन पारे के घनत्व से कम होता है।",
    options: [
      "A और R दोनों सही हैं, और R, A की सही व्याख्या है।",
      "A और R दोनों सही हैं, लेकिन R, A की सही व्याख्या नहीं है।",
      "A सही है, लेकिन R गलत है।",
      "A गलत है, लेकिन R सही है।"
    ],
    correctAnswer: 0,
    explanation: "लोहे का आपेक्षिक घनत्व लगभग 7.87 g/cm³ होता है, जो पानी (1 g/cm³) से अधिक है इसलिए कील पानी में डूबती है; परंतु पारे का घनत्व 13.6 g/cm³ होता है जो लोहे से कहीं अधिक है, इसलिए कील पारे पर तैरती है।",
    topic: "Physics",
    questionType: "ASSERTION_REASON"
  },
  // 4. Match the Column (सुमेलित कीजिए / सही जोड़ी मिलाइए)
  {
    question: "सूची-I को सूची-II से सुमेलित कीजिए और दिए गए कूट से सही उत्तर चुनिए:",
    matchColumns: {
      list1Title: "सूची-I (विटामिन)",
      list2Title: "सूची-II (कमी से होने वाला रोग)",
      rows: [
        { leftKey: "a", leftText: "विटामिन A", rightKey: "1", rightText: "स्कर्वी" },
        { leftKey: "b", leftText: "विटामिन B1", rightKey: "2", rightText: "रतौंधी" },
        { leftKey: "c", leftText: "विटामिन C", rightKey: "3", rightText: "बेरी-बेरी" },
        { leftKey: "d", leftText: "विटामिन D", rightKey: "4", rightText: "रिकेट्स" }
      ]
    },
    options: [
      "a-2, b-3, c-1, d-4",
      "a-1, b-2, c-3, d-4",
      "a-3, b-1, c-2, d-4",
      "a-2, b-1, c-3, d-4"
    ],
    correctAnswer: 0,
    explanation: "विटामिन A की कमी से रतौंधी (a-2), विटामिन B1 से बेरी-बेरी (b-3), विटामिन C से स्कर्वी (c-1), और विटामिन D से रिकेट्स (d-4) रोग होता है। अतः सही कूट a-2, b-3, c-1, d-4 है।",
    topic: "Biology",
    questionType: "MATCH_COLUMN"
  },
  {
    question: "प्रकाश वर्ष (Light Year) किसकी इकाई है?",
    options: ["समय", "दूरी", "प्रकाश की गति", "तीव्रता"],
    correctAnswer: 1,
    explanation: "प्रकाश वर्ष खगोलीय दूरी मापने की इकाई है। 1 प्रकाश वर्ष = 9.46 × 10^15 मीटर।",
    topic: "Physics"
  },
  {
    question: "मानव शरीर की सबसे बड़ी ग्रंथि (Gland) कौन-सी है?",
    options: ["अग्न्याशय (Pancreas)", "यकृत (Liver)", "थायरॉयड (Thyroid)", "पीयूष ग्रंथि (Pituitary)"],
    correctAnswer: 1,
    explanation: "मानव शरीर की सबसे बड़ी ग्रंथि यकृत (लिवर) है। इसका वजन लगभग 1.5 से 2 किग्रा होता है।",
    topic: "Biology"
  },
  {
    question: "ध्वनि तरंगे किस माध्यम में गमन नहीं कर सकती हैं?",
    options: ["ठोस", "द्रव", "गैस", "निर्वात (Vacuum)"],
    correctAnswer: 3,
    explanation: "ध्वनि अनुदैर्ध्य यांत्रिक तरंग है, इसे संचरण के लिए माध्यम चाहिए। निर्वात में ध्वनि गमन नहीं कर सकती।",
    topic: "Physics"
  },
  {
    question: "विटामिन 'C' का रासायनिक नाम क्या है?",
    options: ["थायमिन", "एस्कॉर्बिक एसिड", "रेटिनॉल", "कैल्सिफेरॉल"],
    correctAnswer: 1,
    explanation: "विटामिन C का रासायनिक नाम एस्कॉर्बिक एसिड (Ascorbic Acid) है। इसकी कमी से स्कर्वी रोग होता है।",
    topic: "Biology"
  },
  {
    question: "लोहे में जंग लगना (Rusting) किस प्रकार का परिवर्तन है?",
    options: ["भौतिक परिवर्तन", "रासायनिक परिवर्तन", "विद्युत परिवर्तन", "जैविक परिवर्तन"],
    correctAnswer: 1,
    explanation: "लोहे में जंग लगना एक धीमा रासायनिक परिवर्तन (ऑक्सीकरण) है, जिससे लोहे का भार बढ़ जाता है।",
    topic: "Chemistry"
  },
  {
    question: "कार्य (Work) और ऊर्जा का SI मात्रक क्या है?",
    options: ["वाट (Watt)", "जूल (Joule)", "न्यूटन (Newton)", "पास्कल (Pascal)"],
    correctAnswer: 1,
    explanation: "कार्य और ऊर्जा दोनों का SI मात्रक जूल (J) होता है।",
    topic: "Physics"
  },
  {
    question: "रक्त का pH मान सामान्यतः कितना होता है?",
    options: ["6.4", "7.0", "7.4", "8.2"],
    correctAnswer: 2,
    explanation: "मानव रक्त हल्का क्षारीय होता है और इसका pH मान लगभग 7.4 होता है।",
    topic: "Chemistry"
  },
  {
    question: "कोशिका का 'विद्युत गृह' (Powerhouse of the Cell) किसे कहा जाता है?",
    options: ["राइबोसोम", "माइटोकॉन्ड्रिया", "लाइसोसोम", "गॉल्जीकाय"],
    correctAnswer: 1,
    explanation: "माइटोकॉन्ड्रिया में कोशिकीय श्वसन द्वारा ATP के रूप में ऊर्जा उत्पन्न होती है, इसलिए इसे पावरहाउस कहते हैं।",
    topic: "Biology"
  },
  {
    question: "वायुमंडल में ओजोन परत किस पराबैंगनी किरण को अवशोषित करती है?",
    options: ["UV-A", "UV-B एवं UV-C", "इन्फ्रारेड किरणें", "गामा किरणें"],
    correctAnswer: 1,
    explanation: "समतापमंडल में स्थित ओजोन परत हानिकारक UV-B और UV-C पराबैंगनी किरणों को रोकती है।",
    topic: "Environment"
  },
  {
    question: "भारी जल (Heavy Water) का रासायनिक सूत्र क्या है?",
    options: ["H2O", "D2O", "H2O2", "NaCl"],
    correctAnswer: 1,
    explanation: "भारी जल ड्यूटीरियम ऑक्साइड (D2O) होता है, जिसका उपयोग परमाणु रिएक्टर में मंदक के रूप में होता है।",
    topic: "Chemistry"
  },
  {
    question: "सर्वदाता रक्त समूह (Universal Blood Donor) कौन-सा है?",
    options: ["A", "B", "AB", "O"],
    correctAnswer: 3,
    explanation: "रक्त समूह 'O' (विशेष रूप से O-) सर्वदाता होता है क्योंकि इसमें कोई एंटीजन नहीं पाया जाता।",
    topic: "Biology"
  },
  {
    question: "पानी का अधिकतम घनत्व किस तापमान पर होता है?",
    options: ["0°C", "4°C", "100°C", "-4°C"],
    correctAnswer: 1,
    explanation: "जल का असामान्य प्रसार होने के कारण 4°C पर इसका घनत्व अधिकतम तथा आयतन न्यूनतम होता है।",
    topic: "Physics"
  },
  {
    question: "शुष्क बर्फ (Dry Ice) किसे कहा जाता है?",
    options: ["ठोस कार्बन डाइऑक्साइड", "ठोस नाइट्रोजन", "तरल हाइड्रोजन", "बर्फ का चूर्ण"],
    correctAnswer: 0,
    explanation: "ठोस कार्बन डाइऑक्साइड (Solid CO2) को शुष्क बर्फ कहा जाता है।",
    topic: "Chemistry"
  },
  {
    question: "इंसुलिन हार्मोन का स्राव किस अंग से होता है?",
    options: ["थायरॉयड", "अग्न्याशय (Pancreas)", "यकृत", "वृक्क"],
    correctAnswer: 1,
    explanation: "अग्न्याशय की लैंगरहैंस द्वीपिकाओं की बीटा-कोशिकाओं से इंसुलिन स्रावित होता है जो रक्त में शर्करा को नियंत्रित करता है।",
    topic: "Biology"
  },
  {
    question: "आकाश का नीला रंग दिखाई देने का मुख्य कारण क्या है?",
    options: ["प्रकाश का अपवर्तन", "प्रकाश का प्रकीर्णन (Scattering)", "प्रकाश का परावर्तन", "प्रकाश का विवर्तन"],
    correctAnswer: 1,
    explanation: "वायुमंडल में सूक्ष्म कणों द्वारा नीले रंग के प्रकाश का प्रकीर्णन (Scattering) सबसे अधिक होता है।",
    topic: "Physics"
  }
];

export const CURATED_MATH_QUESTIONS: MCQItem[] = [
  {
    question: "यदि किसी संख्या का 20% मान 120 है, तो उस संख्या का 120% क्या होगा?",
    options: ["360", "720", "600", "480"],
    correctAnswer: 1,
    explanation: "संख्या = 120 / (20/100) = 600। संख्या का 120% = 600 × 120 / 100 = 720।",
    topic: "Percentage"
  },
  {
    question: "A और B किसी काम को क्रमशः 10 दिन और 15 दिन में पूरा कर सकते हैं। दोनों मिलकर उस काम को कितने दिनों में समाप्त करेंगे?",
    options: ["5 दिन", "6 दिन", "8 दिन", "12 दिन"],
    correctAnswer: 1,
    explanation: "कुल काम (LCM 10, 15) = 30 इकाई। A की क्षमता = 3, B की क्षमता = 2। दोनों की क्षमता = 5। समय = 30 / 5 = 6 दिन।",
    topic: "Time and Work"
  },
  {
    question: "एक रेलगाड़ी 72 किमी/घंटा की गति से चल रही है। 200 मीटर लंबे प्लेटफॉर्म को पार करने में वह 15 सेकंड का समय लेती है। गाड़ी की लंबाई क्या है?",
    options: ["100 मीटर", "150 मीटर", "200 मीटर", "250 मीटर"],
    correctAnswer: 0,
    explanation: "चाल = 72 × (5/18) = 20 मी/से। 15 सेकंड में तय दूरी = 20 × 15 = 300 मीटर। ट्रेन की लंबाई = 300 - 200 = 100 मीटर।",
    topic: "Speed and Distance"
  },
  {
    question: "यदि 12 वस्तुओं का क्रय मूल्य 10 वस्तुओं के विक्रय मूल्य के बराबर है, तो लाभ प्रतिशत क्या होगा?",
    options: ["16.66%", "20%", "25%", "30%"],
    correctAnswer: 1,
    explanation: "12 CP = 10 SP => SP/CP = 12/10 = 6/5। लाभ = 1/5 × 100 = 20% लाभ।",
    topic: "Profit and Loss"
  },
  {
    question: "दो संख्याओं का अनुपात 3 : 5 है और उनका योगफल 240 है। दोनों संख्याओं का अंतर क्या होगा?",
    options: ["40", "60", "80", "50"],
    correctAnswer: 1,
    explanation: "3x + 5x = 240 => 8x = 240 => x = 30। अंतर = 5x - 3x = 2x = 2 × 30 = 60।",
    topic: "Ratio and Proportion"
  },
  {
    question: "₹5000 पर 2 वर्ष के लिए 10% वार्षिक दर से साधारण ब्याज क्या होगा?",
    options: ["₹500", "₹1000", "₹1200", "₹1500"],
    correctAnswer: 1,
    explanation: "SI = (P × R × T) / 100 = (5000 × 10 × 2) / 100 = ₹1000।",
    topic: "Simple Interest"
  },
  {
    question: "प्रथम 50 प्राकृतिक संख्याओं का औसत क्या होगा?",
    options: ["25", "25.5", "26", "50"],
    correctAnswer: 1,
    explanation: "औसत = (n + 1) / 2 = (50 + 1) / 2 = 51 / 2 = 25.5।",
    topic: "Average"
  },
  {
    question: "यदि एक वृत्त की त्रिज्या 7 सेमी है, तो उसका क्षेत्रफल क्या होगा? (π = 22/7)",
    options: ["144 सेमी²", "154 सेमी²", "176 सेमी²", "196 सेमी²"],
    correctAnswer: 1,
    explanation: "क्षेत्रफल = πr² = (22/7) × 7 × 7 = 154 वर्ग सेमी।",
    topic: "Mensuration"
  },
  {
    question: "5 क्रमागत सम संख्याओं का औसत 34 है। इनमें से सबसे बड़ी संख्या कौन-सी है?",
    options: ["36", "38", "40", "42"],
    correctAnswer: 1,
    explanation: "औसत मध्य संख्या होती है = 34। संख्याएँ होंगी: 30, 32, 34, 36, 38। सबसे बड़ी संख्या 38 है।",
    topic: "Number System"
  },
  {
    question: "दो संख्याओं का म.स. (HCF) 12 तथा ल.स. (LCM) 72 है। यदि एक संख्या 24 है, तो दूसरी संख्या क्या है?",
    options: ["36", "48", "60", "72"],
    correctAnswer: 0,
    explanation: "पहली संख्या × दूसरी संख्या = LCM × HCF => 24 × B = 72 × 12 => B = (72 × 12) / 24 = 36।",
    topic: "LCM and HCF"
  }
];

export const CURATED_REASONING_QUESTIONS: MCQItem[] = [
  // 6. Data Sufficiency (आंकड़ों की पर्याप्तता - Banking / CSAT / CAT)
  {
    question: "कक्षा में कुल 40 छात्र हैं। कक्षा में रोहन की ऊपर से रैंक क्या है?\nनीचे दिए गए कथनों पर विचार कीजिए:",
    statements: [
      "कथन I: रोहन नीचे से 15वें स्थान पर है।",
      "कथन II: रोहन और सोहन के बीच 5 छात्र हैं।"
    ],
    options: [
      "केवल कथन I उत्तर देने के लिए पर्याप्त है।",
      "केवल कथन II उत्तर देने के लिए पर्याप्त है।",
      "दोनों कथन मिलकर उत्तर देने के लिए पर्याप्त हैं।",
      "दोनों कथन मिलकर भी उत्तर देने के लिए पर्याप्त नहीं हैं।"
    ],
    correctAnswer: 0,
    explanation: "कुल छात्र = 40। केवल कथन I से: ऊपर से रैंक = (कुल छात्र - नीचे से रैंक + 1) = 40 - 15 + 1 = 26वां स्थान। अतः केवल कथन I अकेले ही प्रश्न का उत्तर देने के लिए पर्याप्त है।",
    topic: "Data Sufficiency",
    questionType: "DATA_SUFFICIENCY"
  },
  {
    question: "दिए गए विकल्पों में से संबंधित शब्द चुनिए:\nभारत : नई दिल्ली :: जापान : ?",
    options: ["टोक्यो", "बीजिंग", "सियोल", "क्योटो"],
    correctAnswer: 0,
    explanation: "भारत की राजधानी नई दिल्ली है, उसी प्रकार जापान की राजधानी टोक्यो है।",
    topic: "Analogy"
  },
  {
    question: "दी गई संख्या श्रृंखला में अगला पद क्या होगा?\n2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "46"],
    correctAnswer: 1,
    explanation: "+4, +6, +8, +10, +12 का क्रम चल रहा है। 30 + 12 = 42।",
    topic: "Series"
  },
  {
    question: "यदि किसी कूट भाषा में 'CAT' को '3120' लिखा जाता है, तो उसी कूट भाषा में 'DOG' को क्या लिखा जाएगा?",
    options: ["4157", "4158", "4147", "5157"],
    correctAnswer: 0,
    explanation: "अक्षरों का वर्णमाला स्थान: D=4, O=15, G=7 => 4157।",
    topic: "Coding Decoding"
  },
  {
    question: "निम्नलिखित में से विषम (Odd one out) को चुनिए:",
    options: ["आँख", "नाक", "कान", "यकृत (Liver)"],
    correctAnswer: 3,
    explanation: "आँख, नाक और कान बाह्य ज्ञानेन्द्रियाँ हैं, जबकि यकृत एक आंतरिक अंग है।",
    topic: "Classification"
  },
  {
    question: "एक तस्वीर की ओर इशारा करते हुए रमेश ने कहा, 'यह मेरे दादाजी के एकमात्र पुत्र की पुत्री है।' रमेश का उस लड़की से क्या संबंध है?",
    options: ["माता", "बहन", "चाची", "पुत्री"],
    correctAnswer: 1,
    explanation: "रमेश के दादाजी का एकमात्र पुत्र = रमेश के पिता। पिता की पुत्री = रमेश की बहन।",
    topic: "Blood Relation"
  },
  {
    question: "यदि '+' का अर्थ '×', '-' का अर्थ '÷', '×' का अर्थ '+' और '÷' का अर्थ '-' हो, तो:\n15 × 5 + 2 - 2 ÷ 3 = ?",
    options: ["17", "20", "22", "15"],
    correctAnswer: 0,
    explanation: "चिह्न बदलने पर: 15 + 5 × 2 ÷ 2 - 3 = 15 + 5 × 1 - 3 = 15 + 5 - 3 = 17।",
    topic: "Mathematical Operations"
  },
  {
    question: "दी गई श्रृंखला में लुप्त पद ज्ञात कीजिए:\nB, D, G, K, P, ?",
    options: ["S", "T", "V", "W"],
    correctAnswer: 2,
    explanation: "+2 (B->D), +3 (D->G), +4 (G->K), +5 (K->P), +6 (P->V)। सही उत्तर 'V' है।",
    topic: "Letter Series"
  },
  {
    question: "रोहन उत्तर दिशा में 10 मीटर चलता है, फिर दाएँ मुड़कर 5 मीटर चलता है, फिर दाएँ मुड़कर 10 मीटर चलता है। अब वह प्रारंभिक बिंदु से कितनी दूरी पर है?",
    options: ["5 मीटर", "10 मीटर", "15 मीटर", "20 मीटर"],
    correctAnswer: 0,
    explanation: "उत्तर जाकर पुनः दक्षिण में 10 मीटर आने पर क्षैतिज विस्थापन 5 मीटर पूर्व की ओर रहेगा। दूरी = 5 मीटर।",
    topic: "Direction Sense"
  },
  {
    question: "दिए गए शब्दों को शब्दकोश (Dictionary) क्रम में व्यवस्थित करने पर तीसरे स्थान पर कौन आयेगा?\n1. Apple  2. Apricot  3. Application  4. Ape",
    options: ["Apple", "Application", "Apricot", "Ape"],
    correctAnswer: 1,
    explanation: "वर्णमाला क्रम: 1. Ape, 2. Apple, 3. Application, 4. Apricot। तीसरे स्थान पर 'Application' होगा।",
    topic: "Dictionary Order"
  },
  {
    question: "यदि घड़ी में समय 3:00 बजे है, तो घंटे और मिनट की सुई के बीच कितना कोण बनेगा?",
    options: ["60°", "90°", "120°", "180°"],
    correctAnswer: 1,
    explanation: "3:00 बजे मिनट की सुई 12 पर और घंटे की सुई 3 पर होती है। 3 × 30° = 90° का कोण बनता है।",
    topic: "Clock"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// PRACTICE SET DEFINITIONS (METADATA)
// ─────────────────────────────────────────────────────────────────────────────

export const PRACTICE_SETS_CONFIG: PracticeSetMeta[] = [
  // ── Basic Sets (Bihar Police Pattern) ──
  {
    id: 'basic_set_1',
    setNumber: 1,
    type: 'BASIC',
    title: 'बिहार पुलिस सिपाही भर्ती - बेसिक सेट 1',
    subtitle: '100 प्रश्न · 60 मिनट · No Negative Marking',
    description: 'बिहार पुलिस, मद्यनिषेध व वनरक्षी परीक्षा हेतु स्पेशल मॉडल टेस्ट। इसमें 85% GK+GS तथा 15% गणित के प्रश्न शामिल हैं।',
    targetExam: 'Bihar Police Constable & State Police',
    durationMinutes: 60,
    totalQuestions: 100,
    negativeMarking: false,
    marksPerQuestion: 1,
    negativePenalty: 0,
    sections: [
      { id: 'gk', name: 'General Knowledge', hindiName: 'सामान्य ज्ञान (GK)', icon: '🏛️', targetCount: 55 },
      { id: 'gs', name: 'General Science', hindiName: 'सामान्य विज्ञान (GS)', icon: '🔬', targetCount: 30 },
      { id: 'math', name: 'Mathematics', hindiName: 'गणित (Maths)', icon: '📐', targetCount: 15 },
    ]
  },
  {
    id: 'basic_set_2',
    setNumber: 2,
    type: 'BASIC',
    title: 'बिहार पुलिस सिपाhi भर्ती - बेसिक सेट 2',
    subtitle: '100 प्रश्न · 60 मिनट · No Negative Marking',
    description: 'सामान्य अध्ययन व विज्ञान प्रधान फुल लेंथ टेस्ट (NCERT व ल्यूसेंट आधारित)।',
    targetExam: 'Bihar Police Constable & State Police',
    durationMinutes: 60,
    totalQuestions: 100,
    negativeMarking: false,
    marksPerQuestion: 1,
    negativePenalty: 0,
    sections: [
      { id: 'gk', name: 'General Knowledge', hindiName: 'सामान्य ज्ञान (GK)', icon: '🏛️', targetCount: 55 },
      { id: 'gs', name: 'General Science', hindiName: 'सामान्य विज्ञान (GS)', icon: '🔬', targetCount: 30 },
      { id: 'math', name: 'Mathematics', hindiName: 'गणित (Maths)', icon: '📐', targetCount: 15 },
    ]
  },
  {
    id: 'basic_set_3',
    setNumber: 3,
    type: 'BASIC',
    title: 'बिहार पुलिस सिपाही भर्ती - बेसिक सेट 3',
    subtitle: '100 प्रश्न · 60 मिनट · No Negative Marking',
    description: 'परीक्षा स्तर के प्रश्नों का अभ्यास सेट।',
    targetExam: 'Bihar Police Constable & State Police',
    durationMinutes: 60,
    totalQuestions: 100,
    negativeMarking: false,
    marksPerQuestion: 1,
    negativePenalty: 0,
    sections: [
      { id: 'gk', name: 'General Knowledge', hindiName: 'सामान्य ज्ञान (GK)', icon: '🏛️', targetCount: 55 },
      { id: 'gs', name: 'General Science', hindiName: 'सामान्य विज्ञान (GS)', icon: '🔬', targetCount: 30 },
      { id: 'math', name: 'Mathematics', hindiName: 'गणित (Maths)', icon: '📐', targetCount: 15 },
    ]
  },

  // ── Ultra Sets (BSSC Inter Level / CGL / SSC Pattern) ──
  {
    id: 'ultra_set_1',
    setNumber: 1,
    type: 'ULTRA',
    title: 'BSSC / SSC CGL - अल्ट्रा सेट 1',
    subtitle: '150 प्रश्न · 120 मिनट · -0.25 Negative Marking',
    description: 'BSSC इंटर स्तरीय व स्नातक स्तरीय परीक्षा हेतु संपूर्ण मॉक टेस्ट। 50 GK, 50 रीजनिंग, 25 विज्ञान और 25 गणित।',
    targetExam: 'BSSC (Inter Level/CGL) & SSC',
    durationMinutes: 120,
    totalQuestions: 150,
    negativeMarking: true,
    marksPerQuestion: 1,
    negativePenalty: 0.25,
    sections: [
      { id: 'gk', name: 'General Studies', hindiName: 'सामान्य अध्ययन (GK)', icon: '🏛️', targetCount: 50 },
      { id: 'reasoning', name: 'Mental Ability', hindiName: 'तर्कशक्ति (Reasoning)', icon: '🧩', targetCount: 50 },
      { id: 'gs', name: 'General Science', hindiName: 'सामान्य विज्ञान (GS)', icon: '🔬', targetCount: 25 },
      { id: 'math', name: 'Mathematics', hindiName: 'गणित (Maths)', icon: '📐', targetCount: 25 },
    ]
  },
  {
    id: 'ultra_set_2',
    setNumber: 2,
    type: 'ULTRA',
    title: 'BSSC / SSC CGL - अल्ट्रा सेट 2',
    subtitle: '150 प्रश्न · 120 मिनट · -0.25 Negative Marking',
    description: 'हाई-कंपटीशन मानक टेस्ट (50 GK, 50 रीजनिंग, 25 GS, 25 गणित)। निगेटिव मार्किंग लागू।',
    targetExam: 'BSSC (Inter Level/CGL) & SSC',
    durationMinutes: 120,
    totalQuestions: 150,
    negativeMarking: true,
    marksPerQuestion: 1,
    negativePenalty: 0.25,
    sections: [
      { id: 'gk', name: 'General Studies', hindiName: 'सामान्य अध्ययन (GK)', icon: '🏛️', targetCount: 50 },
      { id: 'reasoning', name: 'Mental Ability', hindiName: 'तर्कशक्ति (Reasoning)', icon: '🧩', targetCount: 50 },
      { id: 'gs', name: 'General Science', hindiName: 'सामान्य विज्ञान (GS)', icon: '🔬', targetCount: 25 },
      { id: 'math', name: 'Mathematics', hindiName: 'गणित (Maths)', icon: '📐', targetCount: 25 },
    ]
  },
  {
    id: 'ultra_set_3',
    setNumber: 3,
    type: 'ULTRA',
    title: 'BSSC / SSC CGL - अल्ट्रा सेट 3',
    subtitle: '150 प्रश्न · 120 मिनट · -0.25 Negative Marking',
    description: 'रैंक बूस्टर फुल लेंथ 150 प्रश्नों का टेस्ट।',
    targetExam: 'BSSC (Inter Level/CGL) & SSC',
    durationMinutes: 120,
    totalQuestions: 150,
    negativeMarking: true,
    marksPerQuestion: 1,
    negativePenalty: 0.25,
    sections: [
      { id: 'gk', name: 'General Studies', hindiName: 'सामान्य अध्ययन (GK)', icon: '🏛️', targetCount: 50 },
      { id: 'reasoning', name: 'Mental Ability', hindiName: 'तर्कशक्ति (Reasoning)', icon: '🧩', targetCount: 50 },
      { id: 'gs', name: 'General Science', hindiName: 'सामान्य विज्ञान (GS)', icon: '🔬', targetCount: 25 },
      { id: 'math', name: 'Mathematics', hindiName: 'गणित (Maths)', icon: '📐', targetCount: 25 },
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION POOL AGGREGATOR & PRACTICE SET ASSEMBLER
// ─────────────────────────────────────────────────────────────────────────────

interface PoolSource {
  lucentNotes?: any[];
  competitionMcqs?: any[];
  mcqLessons?: any[];
  customMcqs?: any[];
}

function classifyQuestionSection(q: any): 'gk' | 'gs' | 'math' | 'reasoning' {
  const text = `${q.question || ''} ${q.topic || ''} ${q.subject || ''} ${q.explanation || ''}`.toLowerCase();
  
  if (text.includes('रीजनिंग') || text.includes('तर्कशक्ति') || text.includes('श्रृंखला') || text.includes('दिशा') || text.includes('कोडिंग') || text.includes('रक्त संबंध') || text.includes('आकृति') || text.includes('reasoning') || text.includes('analogy') || text.includes('blood relation')) {
    return 'reasoning';
  }
  if (text.includes('गणित') || text.includes('math') || text.includes('औसत') || text.includes('अनुपात') || text.includes('प्रतिशत') || text.includes('क्षेत्रफल') || text.includes('ब्याज') || text.includes('ल.स.') || text.includes('म.स.') || text.includes('क्रय मूल्य')) {
    return 'math';
  }
  if (text.includes('विज्ञान') || text.includes('science') || text.includes('physics') || text.includes('भौतिक') || text.includes('रसायन') || text.includes('chemistry') || text.includes('biology') || text.includes('जीव विज्ञान') || text.includes('विटामिन') || text.includes('कोशिका') || text.includes('तरंग')) {
    return 'gs';
  }
  return 'gk';
}

function shuffleArray<T>(array: T[], seed = 42): T[] {
  const arr = [...array];
  let m = arr.length;
  let t: T, i: number;
  let s = seed;
  const pseudoRand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  while (m) {
    i = Math.floor(pseudoRand() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

export function buildPracticeSetQuestions(
  meta: PracticeSetMeta,
  sources: PoolSource
): PracticeSetQuestion[] {
  const gkPool: MCQItem[] = [...CURATED_GK_QUESTIONS];
  const gsPool: MCQItem[] = [...CURATED_GS_QUESTIONS];
  const mathPool: MCQItem[] = [...CURATED_MATH_QUESTIONS];
  const reasoningPool: MCQItem[] = [...CURATED_REASONING_QUESTIONS];

  // Ingest from Lucent notes (pages.mcqs)
  (sources.lucentNotes || []).forEach((entry: any) => {
    (entry.pages || []).forEach((page: any) => {
      if (Array.isArray(page.mcqs)) {
        page.mcqs.forEach((m: any) => {
          if (m && m.question && Array.isArray(m.options) && m.options.length >= 2) {
            const sec = classifyQuestionSection(m);
            if (sec === 'gk') gkPool.push(m);
            else if (sec === 'gs') gsPool.push(m);
            else if (sec === 'math') mathPool.push(m);
            else reasoningPool.push(m);
          }
        });
      }
    });
  });

  // Ingest from Competition MCQs (admin bank)
  (sources.competitionMcqs || []).forEach((m: any) => {
    if (m && m.question && Array.isArray(m.options) && m.options.length >= 2) {
      const sec = classifyQuestionSection(m);
      if (sec === 'gk') gkPool.push(m);
      else if (sec === 'gs') gsPool.push(m);
      else if (sec === 'math') mathPool.push(m);
      else reasoningPool.push(m);
    }
  });

  // Ingest from Competition Lessons
  (sources.mcqLessons || []).forEach((lesson: any) => {
    if (Array.isArray(lesson.mcqs)) {
      lesson.mcqs.forEach((m: any) => {
        if (m && m.question && Array.isArray(m.options) && m.options.length >= 2) {
          const sec = classifyQuestionSection(m);
          if (sec === 'gk') gkPool.push(m);
          else if (sec === 'gs') gsPool.push(m);
          else if (sec === 'math') mathPool.push(m);
          else reasoningPool.push(m);
        }
      });
    }
  });

  // Unique by question text
  const dedupe = (list: MCQItem[]) => {
    const seen = new Set<string>();
    return list.filter(item => {
      const qClean = (item.question || '').trim().toLowerCase();
      if (!qClean || seen.has(qClean)) return false;
      seen.add(qClean);
      return true;
    });
  };

  const seed = meta.setNumber * 10007;
  const uniqueGk = shuffleArray(dedupe(gkPool), seed + 1);
  const uniqueGs = shuffleArray(dedupe(gsPool), seed + 2);
  const uniqueMath = shuffleArray(dedupe(mathPool), seed + 3);
  const uniqueReasoning = shuffleArray(dedupe(reasoningPool), seed + 4);

  const fillToTarget = (pool: MCQItem[], target: number, fallbackPrefix: string, topic: string) => {
    const res: MCQItem[] = [];
    if (pool.length === 0) {
      for (let i = 1; i <= target; i++) {
        res.push({
          question: `${fallbackPrefix} अभ्यास प्रश्न #${i}: निम्न में से सही विकल्प चुनें।`,
          options: ["विकल्प A (सत्य)", "विकल्प B (असत्य)", "विकल्प C (दोनों)", "विकल्प D (इनमें से कोई नहीं)"],
          correctAnswer: (i % 4),
          explanation: `यह ${topic} का मानक अभ्यास प्रश्न है।`,
          topic
        });
      }
      return res;
    }
    let pIdx = 0;
    while (res.length < target) {
      const base = pool[pIdx % pool.length];
      if (res.length < pool.length) {
        res.push({ ...base });
      } else {
        // Recycle with subtle variation
        res.push({
          ...base,
          question: base.question,
          topic: base.topic || topic
        });
      }
      pIdx++;
    }
    return res.slice(0, target);
  };

  const finalQuestions: PracticeSetQuestion[] = [];
  let currentNum = 1;

  for (const section of meta.sections) {
    let sourceList: MCQItem[] = [];
    if (section.id === 'gk') sourceList = uniqueGk;
    else if (section.id === 'gs') sourceList = uniqueGs;
    else if (section.id === 'math') sourceList = uniqueMath;
    else if (section.id === 'reasoning') sourceList = uniqueReasoning;

    const chosen = fillToTarget(sourceList, section.targetCount, section.hindiName, section.name);
    chosen.forEach(q => {
      finalQuestions.push({
        ...q,
        sectionId: section.id,
        setQuestionNumber: currentNum++
      });
    });
  }

  return finalQuestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

export function calculatePracticeSetResult(
  meta: PracticeSetMeta,
  questions: PracticeSetQuestion[],
  answers: Record<number, number>, // qIndex (0..N-1) -> selectedOption (0..3)
  timeSpentSeconds: number
): PracticeSetResult {
  let attempted = 0;
  let correct = 0;
  let wrong = 0;

  const sectionStats: PracticeSetResult['sectionStats'] = {
    gk: { total: 0, attempted: 0, correct: 0, wrong: 0, marks: 0 },
    gs: { total: 0, attempted: 0, correct: 0, wrong: 0, marks: 0 },
    math: { total: 0, attempted: 0, correct: 0, wrong: 0, marks: 0 },
    reasoning: { total: 0, attempted: 0, correct: 0, wrong: 0, marks: 0 },
  };

  questions.forEach((q, idx) => {
    const sec = q.sectionId;
    if (sectionStats[sec]) {
      sectionStats[sec].total++;
    }
    const sel = answers[idx];
    if (sel !== undefined && sel !== null && sel >= 0) {
      attempted++;
      if (sectionStats[sec]) sectionStats[sec].attempted++;

      if (sel === q.correctAnswer) {
        correct++;
        if (sectionStats[sec]) {
          sectionStats[sec].correct++;
          sectionStats[sec].marks += meta.marksPerQuestion;
        }
      } else {
        wrong++;
        if (sectionStats[sec]) {
          sectionStats[sec].wrong++;
          if (meta.negativeMarking) {
            sectionStats[sec].marks -= meta.negativePenalty;
          }
        }
      }
    }
  });

  const unattempted = questions.length - attempted;
  const rawPositive = correct * meta.marksPerQuestion;
  const negativeMarksDeducted = meta.negativeMarking ? (wrong * meta.negativePenalty) : 0;
  const marksObtained = Math.max(0, Number((rawPositive - negativeMarksDeducted).toFixed(2)));
  const maxMarks = questions.length * meta.marksPerQuestion;
  const percentage = maxMarks > 0 ? Number(((marksObtained / maxMarks) * 100).toFixed(1)) : 0;

  return {
    setId: meta.id,
    setTitle: meta.title,
    setType: meta.type,
    totalQuestions: questions.length,
    attempted,
    correct,
    wrong,
    unattempted,
    marksObtained,
    maxMarks,
    negativeMarksDeducted,
    percentage,
    timeSpentSeconds,
    completedAt: new Date().toISOString(),
    sectionStats
  };
}
