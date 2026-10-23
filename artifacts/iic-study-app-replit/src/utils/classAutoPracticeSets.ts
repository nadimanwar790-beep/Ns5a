// @ts-nocheck
import { MCQItem } from '../types';
import { PracticeSetMeta } from './competitionPracticeSets';

export interface ClassSubjectConfig {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  aliases: string[];
}

export const CLASS_10_SUBJECTS: ClassSubjectConfig[] = [
  {
    id: 'math',
    name: 'गणित (Mathematics)',
    shortName: 'गणित',
    icon: '🔢',
    color: 'emerald',
    aliases: ['math', 'mathematics', 'गणित', 'maths']
  },
  {
    id: 'science',
    name: 'विज्ञान (Science)',
    shortName: 'विज्ञान',
    icon: '🔬',
    color: 'cyan',
    aliases: ['science', 'विज्ञान', 'vigyan', 'physics', 'chemistry', 'biology']
  },
  {
    id: 'social_science',
    name: 'सामाजिक विज्ञान (Social Science)',
    shortName: 'सामाजिक विज्ञान',
    icon: '🌍',
    color: 'amber',
    aliases: ['social_science', 'social science', 'सामाजिक विज्ञान', 'sst', 'history', 'geography', 'polity', 'economics']
  },
  {
    id: 'hindi',
    name: 'हिंदी (Hindi)',
    shortName: 'हिंदी',
    icon: '📖',
    color: 'rose',
    aliases: ['hindi', 'हिंदी', 'hindi1', 'hindi2', 'गोधूलि', 'वर्णिका']
  },
  {
    id: 'sanskrit',
    name: 'संस्कृत (Sanskrit)',
    shortName: 'संस्कृत',
    icon: '📜',
    color: 'purple',
    aliases: ['sanskrit', 'संस्कृत', 'piyusham']
  },
  {
    id: 'english',
    name: 'English (अंग्रेजी)',
    shortName: 'English',
    icon: '🔤',
    color: 'blue',
    aliases: ['english', 'अंग्रेजी', 'eng', 'panorama']
  }
];

export const CLASS_12_SUBJECTS: ClassSubjectConfig[] = [
  {
    id: 'physics',
    name: 'भौतिक विज्ञान (Physics)',
    shortName: 'Physics',
    icon: '⚡',
    color: 'blue',
    aliases: ['physics', 'भौतिक विज्ञान', 'भौतिकी', 'phy']
  },
  {
    id: 'chemistry',
    name: 'रसायन विज्ञान (Chemistry)',
    shortName: 'Chemistry',
    icon: '🧪',
    color: 'purple',
    aliases: ['chemistry', 'रसायन विज्ञान', 'रसायन', 'chem']
  },
  {
    id: 'biology',
    name: 'जीव विज्ञान (Biology)',
    shortName: 'Biology',
    icon: '🧬',
    color: 'emerald',
    aliases: ['biology', 'जीव विज्ञान', 'जीवविज्ञान', 'bio']
  },
  {
    id: 'math',
    name: 'गणित (Mathematics)',
    shortName: 'गणित',
    icon: '🔢',
    color: 'amber',
    aliases: ['math', 'mathematics', 'गणित', 'maths']
  },
  {
    id: 'hindi',
    name: 'हिंदी (Hindi 100 Marks)',
    shortName: 'हिंदी',
    icon: '📖',
    color: 'rose',
    aliases: ['hindi', 'हिंदी', 'दिगंत']
  },
  {
    id: 'english',
    name: 'English (100 Marks)',
    shortName: 'English',
    icon: '🔤',
    color: 'cyan',
    aliases: ['english', 'अंग्रेजी', 'rainbow']
  },
  {
    id: 'history',
    name: 'इतिहास (History)',
    shortName: 'इतिहास',
    icon: '🏛️',
    color: 'orange',
    aliases: ['history', 'इतिहास']
  },
  {
    id: 'geography',
    name: 'भूगोल (Geography)',
    shortName: 'भूगोल',
    icon: '🗺️',
    color: 'teal',
    aliases: ['geography', 'भूगोल']
  },
  {
    id: 'political_science',
    name: 'राजनीति विज्ञान (Pol Science)',
    shortName: 'राजनीति विज्ञान',
    icon: '⚖️',
    color: 'indigo',
    aliases: ['political_science', 'polity', 'राजनीति विज्ञान', 'नागरिक शास्त्र']
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-YIELD CURATED BOARD QUESTIONS POOL (To guarantee Set 1 readiness)
// ─────────────────────────────────────────────────────────────────────────────

const SEED_QUESTIONS_CLASS_10_MATH: MCQItem[] = [
  {
    question: "यदि दो संख्याओं का HCF = 15 और LCM = 90 है, तथा एक संख्या 30 है, तो दूसरी संख्या क्या होगी?",
    options: ["45", "60", "75", "90"],
    correctAnswer: 0,
    explanation: "सूत्र: पहली संख्या × दूसरी संख्या = HCF × LCM => 30 × दूसरी = 15 × 90 = 1350 => दूसरी = 1350/30 = 45।",
    topic: "वास्तविक संख्याएं"
  },
  {
    question: "द्विघात समीकरण 2x² - 4x + 3 = 0 का विविक्तकर (Discriminant, D) क्या होगा?",
    options: ["-8", "8", "-16", "16"],
    correctAnswer: 0,
    explanation: "D = b² - 4ac = (-4)² - 4(2)(3) = 16 - 24 = -8।",
    topic: "द्विघात समीकरण"
  },
  {
    question: "समानांतर श्रेणी (AP) 3, 8, 13, 18, ... का 10वां पद क्या है?",
    options: ["48", "53", "43", "50"],
    correctAnswer: 0,
    explanation: "a = 3, d = 5; a₁₀ = a + (10 - 1)d = 3 + 9×5 = 3 + 45 = 48।",
    topic: "समानांतर श्रेणी"
  },
  {
    question: "बिंदुओं (2, 3) और (4, 1) के बीच की दूरी क्या होगी?",
    options: ["2√2 इकाई", "4 इकाई", "2 इकाई", "3√2 इकाई"],
    correctAnswer: 0,
    explanation: "दूरी = √[(4-2)² + (1-3)²] = √[4 + 4] = √8 = 2√2।",
    topic: "निर्देशांक ज्यामिति"
  },
  {
    question: "यदि tan θ = 4/3 हो, तो sin θ का मान क्या होगा?",
    options: ["4/5", "3/5", "5/4", "3/4"],
    correctAnswer: 0,
    explanation: "लम्ब = 4, आधार = 3, कर्ण = √(4² + 3²) = 5। अतः sin θ = लम्ब/कर्ण = 4/5।",
    topic: "त्रिकोणमिति"
  },
  {
    question: "वृत्त की सबसे बड़ी जीवा (Largest chord) को क्या कहते हैं?",
    options: ["व्यास (Diameter)", "त्रिज्या (Radius)", "स्पर्श रेखा", "चाप"],
    correctAnswer: 0,
    explanation: "वृत्त की सबसे बड़ी जीवा वृत्त का व्यास कहलाती है, जो केंद्र से होकर गुजरती है।",
    topic: "वृत्त"
  },
  {
    question: "एक शंकु के आयतन का सूत्र क्या है?",
    options: ["(1/3)πr²h", "πr²h", "(2/3)πr³", "4/3πr³"],
    correctAnswer: 0,
    explanation: "शंकु का आयतन = (1/3) × π × r² × h होता है।",
    topic: "पृष्ठीय क्षेत्रफल और आयतन"
  },
  {
    question: "आंकड़ों 2, 4, 6, 8, 10 का माध्य (Mean) क्या होगा?",
    options: ["6", "5", "7", "8"],
    correctAnswer: 0,
    explanation: "माध्य = (2+4+6+8+10)/5 = 30/5 = 6।",
    topic: "सांख्यिकी"
  },
  {
    question: "एक पासे को एक बार फेंकने पर अभाज्य संख्या (Prime Number) आने की प्रायिकता क्या है?",
    options: ["1/2", "1/3", "2/3", "1/6"],
    correctAnswer: 0,
    explanation: "अभाज्य संख्याएं {2, 3, 5} कुल 3 हैं। कुल परिणाम 6 हैं। प्रायिकता = 3/6 = 1/2।",
    topic: "प्रायिकता"
  },
  {
    question: "दो समरूप त्रिभुजों के क्षेत्रफलों का अनुपात 64:121 है, तो उनकी संगत भुजाओं का अनुपात क्या होगा?",
    options: ["8:11", "11:8", "64:121", "4:11"],
    correctAnswer: 0,
    explanation: "क्षेत्रफल का अनुपात = (भुजाओं का अनुपात)² => भुजाओं का अनुपात = √(64/121) = 8/11।",
    topic: "त्रिभुज"
  },
  {
    question: "बिंदु (-3, -5) कार्तीय तल के किस चतुर्थांश (Quadrant) में स्थित है?",
    options: ["तृतीय (Third)", "प्रथम (First)", "द्वितीय (Second)", "चतुर्थ (Fourth)"],
    correctAnswer: 0,
    explanation: "x < 0 तथा y < 0 होने पर बिंदु तृतीय चतुर्थांश में होता है।",
    topic: "निर्देशांक ज्यामिति"
  },
  {
    question: "sin² 63° + sin² 27° का मान क्या होगा?",
    options: ["1", "0", "2", "-1"],
    correctAnswer: 0,
    explanation: "sin 27° = cos(90°-27°) = cos 63° => sin² 63° + cos² 63° = 1।",
    topic: "त्रिकोणमिति"
  },
  {
    question: "रैखिक समीकरण युग्म a₁x + b₁y + c₁ = 0 तथा a₂x + b₂y + c₂ = 0 में यदि a₁/a₂ ≠ b₁/b₂ हो, तो हल कितने होंगे?",
    options: ["अद्वितीय हल (एक हल)", "अनंत हल", "कोई हल नहीं", "दो हल"],
    correctAnswer: 0,
    explanation: "a₁/a₂ ≠ b₁/b₂ स्थिति में रेखाएं प्रतिच्छेदी होती हैं और अद्वितीय हल होता है।",
    topic: "दो चरों वाले रैखिक समीकरण"
  },
  {
    question: "त्रिघात बहुपद के अधिकतम कितने शून्यक हो सकते हैं?",
    options: ["3", "2", "1", "4"],
    correctAnswer: 0,
    explanation: "त्रिघात बहुपद की घात 3 होती है, अतः इसके अधिकतम 3 शून्यक हो सकते हैं।",
    topic: "बहुपद"
  },
  {
    question: "π (पाई) एक कैसी संख्या है?",
    options: ["अपरिमेय संख्या (Irrational)", "परिमेय संख्या (Rational)", "पूर्णांक", "प्राकृत"],
    correctAnswer: 0,
    explanation: "π एक अपरिमेय संख्या है क्योंकि इसका दशमलव प्रसार अशांत अनावर्ती होता है।",
    topic: "वास्तविक संख्याएं"
  },
  {
    question: "किसी वृत्त के बाह्य बिंदु से वृत्त पर कितनी स्पर्श रेखाएं खींची जा सकती हैं?",
    options: ["2", "1", "असंख्य", "3"],
    correctAnswer: 0,
    explanation: "किसी बाह्य बिंदु से किसी वृत्त पर अधिकतम 2 स्पर्श रेखाएं खींची जा सकती हैं और दोनों की लंबाई बराबर होती है।",
    topic: "वृत्त"
  },
  {
    question: "माध्यक = 3 × माध्यिका - 2 × _____ ?",
    options: ["माध्य (Mean)", "बहुलक (Mode)", "प्रसार", "विचलन"],
    correctAnswer: 0,
    explanation: "अनुभवजन्य संबंध: बहुलक = 3(माध्यक) - 2(माध्य)।",
    topic: "सांख्यिकी"
  },
  {
    question: "यदि एक वृत्त की परिधि 44 सेमी है, तो इसकी त्रिज्या क्या होगी?",
    options: ["7 सेमी", "14 सेमी", "21 सेमी", "3.5 सेमी"],
    correctAnswer: 0,
    explanation: "2πr = 44 => 2 × (22/7) × r = 44 => r = 7 सेमी।",
    topic: "वृत्त से संबंधित क्षेत्रफल"
  },
  {
    question: "मूलबिंदु (Origin) के निर्देशांक क्या होते हैं?",
    options: ["(0, 0)", "(1, 1)", "(0, 1)", "(1, 0)"],
    correctAnswer: 0,
    explanation: "मूलबिंदु के निर्देशांक सदैव (0, 0) होते हैं।",
    topic: "निर्देशांक ज्यामिति"
  },
  {
    question: "tan 45° का संख्यात्मक मान क्या है?",
    options: ["1", "√3", "1/√3", "0"],
    correctAnswer: 0,
    explanation: "tan 45° का मान सदैव 1 होता है।",
    topic: "त्रिकोणमिति"
  },
  {
    question: "यदि किसी घटना के घटने की प्रायिकता P(E) = 0.05 है, तो 'E नहीं' की प्रायिकता क्या होगी?",
    options: ["0.95", "0.05", "1.05", "0.5"],
    correctAnswer: 0,
    explanation: "P(नहीं E) = 1 - P(E) = 1 - 0.05 = 0.95।",
    topic: "प्रायिकता"
  },
  {
    question: "यदि एक अर्धवृत्त का व्यास 14 सेमी है, तो इसका परिमाप क्या होगा?",
    options: ["36 सेमी", "44 सेमी", "22 सेमी", "28 सेमी"],
    correctAnswer: 0,
    explanation: "r = 7 सेमी; अर्धवृत्त का परिमाप = πr + 2r = (22/7 × 7) + 14 = 22 + 14 = 36 सेमी।",
    topic: "वृत्त से संबंधित क्षेत्रफल"
  },
  {
    question: "प्रथम 5 विषम प्राकृत संख्याओं का माध्य क्या है?",
    options: ["5", "4", "6", "25"],
    correctAnswer: 0,
    explanation: "संख्याएं: 1, 3, 5, 7, 9; योग = 25; माध्य = 25/5 = 5।",
    topic: "सांख्यिकी"
  },
  {
    question: "यदि 2cos 3θ = 1 हो, तो θ का मान क्या होगा?",
    options: ["20°", "10°", "30°", "15°"],
    correctAnswer: 0,
    explanation: "cos 3θ = 1/2 = cos 60° => 3θ = 60° => θ = 20°।",
    topic: "त्रिकोणमिति"
  },
  {
    question: "बिंदु P(-6, 8) की मूल बिंदु से दूरी क्या होगी?",
    options: ["10 इकाई", "8 इकाई", "6 इकाई", "14 इकाई"],
    correctAnswer: 0,
    explanation: "दूरी = √[(-6)² + (8)²] = √[36 + 64] = √100 = 10 इकाई।",
    topic: "निर्देशांक ज्यामिति"
  }
];

const SEED_QUESTIONS_CLASS_10_SCIENCE: MCQItem[] = [
  {
    question: "प्रकाश के परावर्तन के कितने नियम हैं?",
    options: ["दो (2)", "एक (1)", "तीन (3)", "चार (4)"],
    correctAnswer: 0,
    explanation: "प्रकाश के परावर्तन के दो मुख्य नियम हैं: आपतित किरण, परावर्तित किरण और अभिलंब एक ही तल में होते हैं, तथा आपतन कोण = परावर्तन कोण।",
    topic: "भौतिकी"
  },
  {
    question: "दाढ़ी बनाने में किस प्रकार के दर्पण का उपयोग किया जाता है?",
    options: ["अवतल दर्पण (Concave Mirror)", "उत्तल दर्पण", "समतल दर्पण", "उत्तलावतल दर्पण"],
    correctAnswer: 0,
    explanation: "अवतल दर्पण निकट की वस्तु का सीधा और बड़ा (आवर्धित) प्रतिबिम्ब बनाता है।",
    topic: "भौतिकी"
  },
  {
    question: "विद्युत धारा का SI मात्रक क्या होता है?",
    options: ["एम्पीयर (Ampere)", "वोल्ट (Volt)", "ओम (Ohm)", "वाट (Watt)"],
    correctAnswer: 0,
    explanation: "विद्युत धारा का SI मात्रक एम्पीयर (A) है।",
    topic: "भौतिकी"
  },
  {
    question: "मानव नेत्र के किस भाग पर किसी वस्तु का प्रतिबिम्ब बनता है?",
    options: ["दृष्टिपटल या रेटिना (Retina)", "कॉर्निया", "परितारिका", "पुतली"],
    correctAnswer: 0,
    explanation: "रेटिना (दृष्टिपटल) पर वास्तविक और उल्टा प्रतिबिम्ब बनता है।",
    topic: "भौतिकी"
  },
  {
    question: "लिटमस पत्र किस पौधे से प्राप्त किया जाता है?",
    options: ["लाइकेन (Lichen)", "थैलोफाइटा", "जिम्नोस्पर्म", "फर्न"],
    correctAnswer: 0,
    explanation: "लिटमस एक प्राकृतिक सूचक है जो लाइकेन (शैक) पौधे से प्राप्त होता है।",
    topic: "रसायन विज्ञान"
  },
  {
    question: "शुद्ध जल का pH मान कितना होता है?",
    options: ["7 (उदासीन)", "0", "14", "1"],
    correctAnswer: 0,
    explanation: "शुद्ध जल उदासीन होता है, इसलिए इसका pH मान 7 होता है।",
    topic: "रसायन विज्ञान"
  },
  {
    question: "लोहे को जंग से सुरक्षित रखने के लिए किस धातु की परत चढ़ाई जाती है (यशदलेपन)?",
    options: ["जिंक (जस्ता)", "तांबा", "सोना", "एल्युमिनियम"],
    correctAnswer: 0,
    explanation: "गैल्वनीकरण (यशदलेपन) में लोहे पर जिंक (जस्ता) की पतली परत चढ़ाई जाती है।",
    topic: "रसायन विज्ञान"
  },
  {
    question: "कार्बन की संयोजकता (Valency) कितनी होती है?",
    options: ["4", "2", "3", "1"],
    correctAnswer: 0,
    explanation: "कार्बन का परमाणु क्रमांक 6 है (इलेक्ट्रॉनिक विन्यास 2, 4), अतः संयोजकता 4 (चतुःसंयोजी) होती है।",
    topic: "रसायन विज्ञान"
  },
  {
    question: "क्लोरोफिल वर्णक का रंग कैसा होता है?",
    options: ["हरा (Green)", "नीला", "लाल", "सफेद"],
    correctAnswer: 0,
    explanation: "क्लोरोफिल हरा वर्णक है जो पौधों में प्रकाश संश्लेषण के लिए आवश्यक है।",
    topic: "जीव विज्ञान"
  },
  {
    question: "रक्त का थक्का बनाने में कौन-सी रुधिर कणिका सहायक होती है?",
    options: ["प्लेटलेट्स (रक्त बिम्बाणु)", "लाल रक्त कण (RBC)", "श्वेत रक्त कण (WBC)", "प्लाज्मा"],
    correctAnswer: 0,
    explanation: "प्लेटलेट्स (थ्रोम्बोसाइट्स) रक्त का थक्का जमाने में मुख्य भूमिका निभाती हैं।",
    topic: "जीव विज्ञान"
  },
  {
    question: "मानव हृदय में कितने कोष्ठ (Chambers) होते हैं?",
    options: ["चार (4)", "दो (2)", "तीन (3)", "एक (1)"],
    correctAnswer: 0,
    explanation: "मानव हृदय में 4 कोष्ठ होते हैं: दो अलिंद (Atria) और दो निलय (Ventricles)।",
    topic: "जीव विज्ञान"
  },
  {
    question: "वृक्क (Kidney) की रचनात्मक एवं कार्यात्मक इकाई को क्या कहते हैं?",
    options: ["नेफ्रॉन (Nephron)", "न्यूरॉन", "ग्लोमेरुलस", "मूत्रवाहिनी"],
    correctAnswer: 0,
    explanation: "नेफ्रॉन वृक्क की आधारभूत कार्यात्मक इकाई है जो रक्त को छानकर मूत्र बनाती है।",
    topic: "जीव विज्ञान"
  },
  {
    question: "मस्तिष्क का कौन-सा भाग शरीर के संतुलन और मुद्रा को नियंत्रित करता है?",
    options: ["अनुमस्तिष्क (Cerebellum)", "प्रमस्तिष्क (Cerebrum)", "मेडुला", "पोंस"],
    correctAnswer: 0,
    explanation: "अनुमस्तिष्क (सेरिबेलम) ऐच्छिक क्रियाओं की परिशुद्धि और शरीर का संतुलन बनाए रखता है।",
    topic: "जीव विज्ञान"
  },
  {
    question: "मेंडल ने अपने आनुवंशिकी प्रयोगों के लिए किस पौधे का चयन किया था?",
    options: ["मटर (Garden Pea)", "चना", "सरसों", "गेहूं"],
    correctAnswer: 0,
    explanation: "ग्रेगर जॉन मेंडल ने मटर के पौधे (Pisum sativum) का चयन किया था।",
    topic: "जीव विज्ञान"
  },
  {
    question: "ओजोन परत वायुमंडल के किस स्तर में पाई जाती है?",
    options: ["समताप मंडल (Stratosphere)", "क्षोभ मंडल", "मध्य मंडल", "आयन मंडल"],
    correctAnswer: 0,
    explanation: "ओजोन परत समताप मंडल में पाई जाती है और सूर्य की हानिकारक पराबैंगनी (UV) किरणों से रक्षा करती है।",
    topic: "पर्यावरण"
  },
  {
    question: "विभवान्तर मापने वाले यंत्र को क्या कहा जाता है?",
    options: ["वोल्टमीटर (Voltmeter)", "एमीटर", "गैल्वेनोमीटर", "लैक्टोमीटर"],
    correctAnswer: 0,
    explanation: "विभवान्तर को वोल्टमीटर द्वारा मापा जाता है, जिसे परिपथ में समानांतर क्रम में जोड़ा जाता है।",
    topic: "भौतिकी"
  },
  {
    question: "प्रतिरोध का SI मात्रक क्या होता है?",
    options: ["ओम (Ω)", "ओम-मीटर", "जूल", "कूलॉम"],
    correctAnswer: 0,
    explanation: "विद्युत प्रतिरोध का SI मात्रक ओम (Ohm, Ω) है।",
    topic: "भौतिकी"
  },
  {
    question: "बेकिंग सोडा (खाने का सोडा) का रासायनिक सूत्र क्या है?",
    options: ["NaHCO₃", "Na₂CO₃·10H₂O", "NaOH", "CaOCl₂"],
    correctAnswer: 0,
    explanation: "बेकिंग सोडा का रासायनिक नाम सोडियम हाइड्रोजन कार्बोनेट (NaHCO₃) है।",
    topic: "रसायन विज्ञान"
  },
  {
    question: "प्लास्टर ऑफ पेरिस (POP) का रासायनिक सूत्र क्या है?",
    options: ["CaSO₄·½H₂O", "CaSO₄·2H₂O", "CaSO₄", "CaCl₂"],
    correctAnswer: 0,
    explanation: "जिप्सम को 373 K पर गर्म करने पर प्लास्टर ऑफ पेरिस (CaSO₄·½H₂O) प्राप्त होता है।",
    topic: "रसायन विज्ञान"
  },
  {
    question: "अमीबा में भोजन का अंतर्ग्रहण किसके द्वारा होता है?",
    options: ["कूटपाद (Pseudopodia)", "मुख गुहा", "सिलिया", "स्पर्शक"],
    correctAnswer: 0,
    explanation: "अमीबा कूटपादों की मदद से भोजन को घेरकर खाद्य रिक्तिका में ग्रहण करता है।",
    topic: "जीव विज्ञान"
  },
  {
    question: "पत्तियों में गैसों का आदान-प्रदान किसके माध्यम से होता है?",
    options: ["रंध्र (Stomata)", "मध्य शिरा", "जाइलम", "फ्लोएम"],
    correctAnswer: 0,
    explanation: "पत्तियों की सतह पर सूक्ष्म छिद्र होते हैं जिन्हें रंध्र (स्टोमेटा) कहते हैं।",
    topic: "जीव विज्ञान"
  },
  {
    question: "विद्युत बल्ब का फिलामेंट किस धातु का बना होता है?",
    options: ["टंगस्टन (Tungsten)", "नाइक्रोम", "तांबा", "लोहा"],
    correctAnswer: 0,
    explanation: "टंगस्टन का गलनांक बहुत उच्च (लगभग 3422°C) होता है, इसलिए बल्ब का तंतु इसी का बनता है।",
    topic: "भौतिकी"
  },
  {
    question: "स्पेक्ट्रम प्राप्त करने के लिए किसका उपयोग किया जाता है?",
    options: ["प्रिज्म (Prism)", "कांच की सिल्ली", "उत्तल लेंस", "अवतल दर्पण"],
    correctAnswer: 0,
    explanation: "प्रिज्म से होकर गुजरने पर श्वेत प्रकाश सात रंगों में विभाजित हो जाता है (वर्ण विक्षेपण)।",
    topic: "भौतिकी"
  },
  {
    question: "चिपको आंदोलन का मुख्य उद्देश्य किसकी सुरक्षा करना था?",
    options: ["वृक्षों की (वन संरक्षण)", "जल की", "मिट्टी की", "बिजली की"],
    correctAnswer: 0,
    explanation: "चिपको आंदोलन सुंदरलाल बहुगुणा और गौरा देवी के नेतृत्व में पेड़ों की कटाई रोकने के लिए चलाया गया था।",
    topic: "पर्यावरण"
  },
  {
    question: "सीएनजी (CNG) का मुख्य घटक क्या है?",
    options: ["मीथेन (Methane)", "ईथेन", "प्रोपेन", "ब्यूटेन"],
    correctAnswer: 0,
    explanation: "संपीड़ित प्राकृतिक गैस (CNG) का मुख्य घटक मीथेन (CH₄, लगभग 85-90%) होता है।",
    topic: "रसायन विज्ञान"
  }
];

const SEED_QUESTIONS_CLASS_12_PHYSICS: MCQItem[] = [
  {
    question: "विद्युत क्षेत्र (Electric Field) की तीव्रता का SI मात्रक क्या होता है?",
    options: ["N/C या V/m", "J/C", "C/m²", "N·m"],
    correctAnswer: 0,
    explanation: "E = F/q => N/C अथवा E = -dV/dr => V/m होता है।",
    topic: "विद्युतस्थैतिकी"
  },
  {
    question: "समांतर पट्टिका संधारित्र की धारिता (Capacitance) बढ़ाने के लिए क्या करना चाहिए?",
    options: ["पट्टिकाओं के बीच परावैद्युतांक (Dielectric) रखना", "पट्टिकाओं की दूरी बढ़ाना", "पट्टिकाओं का क्षेत्रफल घटाना", "विभवांतर घटाना"],
    correctAnswer: 0,
    explanation: "C = (K·ε₀·A)/d => K (परावैद्युतांक) बढ़ाने पर धारिता बढ़ती है।",
    topic: "संधारित्र"
  },
  {
    question: "किरचॉफ का प्रथम नियम (संधि नियम) किस संरक्षण सिद्धांत पर आधारित है?",
    options: ["आवेश संरक्षण (Conservation of Charge)", "ऊर्जा संरक्षण", "संवेग संरक्षण", "द्रव्यमान संरक्षण"],
    correctAnswer: 0,
    explanation: "किरचॉफ का संधि नियम आवेश संरक्षण पर और लूप नियम ऊर्जा संरक्षण पर आधारित है।",
    topic: "धारा विद्युत"
  },
  {
    question: "लेंज का नियम (Lenz's Law) किस सिद्धांत का परिणाम है?",
    options: ["ऊर्जा संरक्षण (Conservation of Energy)", "आवेश संरक्षण", "संवेग संरक्षण", "द्रव्यमान संरक्षण"],
    correctAnswer: 0,
    explanation: "प्रेरित विद्युत वाहक बल ऊर्जा संरक्षण सिद्धांत का पालन करता है।",
    topic: "विद्युतचुंबकीय प्रेरण"
  },
  {
    question: "प्रकाश तंतु (Optical Fiber) किस प्रकाशीय परिघटना पर कार्य करता है?",
    options: ["पूर्ण आंतरिक परावर्तन (Total Internal Reflection)", "अपवर्तन", "विवर्तन", "ध्रुवण"],
    correctAnswer: 0,
    explanation: "ऑप्टिकल फाइबर कोर और क्लैडिंग के बीच पूर्ण आंतरिक परावर्तन के सिद्धांत पर संकेत संचालित करता है।",
    topic: "किरण प्रकाशिकी"
  },
  {
    question: "यंग के द्वि-स्लिट प्रयोग में फ्रिंज चौड़ाई (β) का सूत्र क्या है?",
    options: ["β = λD/d", "β = λd/D", "β = Dd/λ", "β = λ/(Dd)"],
    correctAnswer: 0,
    explanation: "फ्रिंज चौड़ाई β = (λ × D)/d होती है, जहाँ D स्लिट से पर्दे की दूरी और d स्लिटों के बीच दूरी है।",
    topic: "तरंग प्रकाशिकी"
  },
  {
    question: "प्रकाश विद्युत प्रभाव में उत्सर्जित प्रकाश-इलेक्ट्रॉनों की अधिकतम गतिज ऊर्जा किस पर निर्भर करती है?",
    options: ["आपतित प्रकाश की आवृत्ति पर (Frequency)", "प्रकाश की तीव्रता पर", "प्रकाश के वेग पर", "समय पर"],
    correctAnswer: 0,
    explanation: "आइंस्टीन समीकरण: K_max = hν - Φ => गतिज ऊर्जा आपतित प्रकाश की आवृत्ति पर निर्भर करती है।",
    topic: "विकिरण और द्रव्य की द्वैत प्रकृति"
  },
  {
    question: "हाइड्रोजन परमाणु की मूल अवस्था (Ground State) में ऊर्जा कितनी होती है?",
    options: ["-13.6 eV", "+13.6 eV", "-3.4 eV", "0 eV"],
    correctAnswer: 0,
    explanation: "E_n = -13.6/n² eV => n=1 के लिए E₁ = -13.6 eV।",
    topic: "परमाणु"
  },
  {
    question: "p-प्रकार के अर्धचालक में मुख्य धारावाहक (Majority Carriers) क्या होते हैं?",
    options: ["होल (Holes/कोटर)", "इलेक्ट्रॉन", "प्रोटॉन", "न्यूट्रॉन"],
    correctAnswer: 0,
    explanation: "त्रिसंयोजी अशुद्धि मिलाने पर p-प्रकार के अर्धचालक बनते हैं जिनमें होल्स बहुसंख्यक होते हैं।",
    topic: "अर्धचालक इलेक्ट्रॉनिकी"
  },
  {
    question: "ट्रांसफार्मर किस धारा पर कार्य करता है?",
    options: ["केवल प्रत्यावर्ती धारा (AC only)", "केवल दिष्ट धारा (DC only)", "AC और DC दोनों", "इनमें से कोई नहीं"],
    correctAnswer: 0,
    explanation: "ट्रांसफार्मर अन्योन्य प्रेरण पर आधारित है जिसके लिए परिवर्ती चुंबकीय फ्लक्स (AC) अनिवार्य है।",
    topic: "प्रत्यावर्ती धारा"
  }
];

// Helper to normalize subject strings for robust matching
function normalizeSubject(str: string): string {
  return String(str || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
}

/**
 * Deterministic hash of string for stable sorted sequence
 */
function stringHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Builds automatic subject-wise practice sets for Class 10 or 12.
 * Deterministic chunking: Set 1 has the exact same questions for all users.
 * When new questions are added to a subject, Set 2, Set 3 auto-appear!
 */
export function buildClassAutoPracticeSets(
  classLevel: '10' | '12',
  allLessons: any[] = [],
  settings?: any
): (PracticeSetMeta & { isClassSet: boolean; classLevel: string; subjectId: string; customQuestions: MCQItem[] })[] {
  const configs = classLevel === '10' ? CLASS_10_SUBJECTS : CLASS_12_SUBJECTS;
  const SET_SIZE = 25; // 25 questions per standardized set

  const generatedSets: any[] = [];

  configs.forEach(cfg => {
    // 1. Gather all questions for this subject from real lessons
    const matchedLessons = (allLessons || []).filter(l => {
      const cls = String(l.classLevel || '').trim();
      if (cls !== classLevel && cls !== `CLASS_${classLevel}`) return false;

      const sub = normalizeSubject(l.subject);
      const title = normalizeSubject(l.lessonTitle);
      return cfg.aliases.some(a => {
        const normAlias = normalizeSubject(a);
        return sub.includes(normAlias) || title.includes(normAlias);
      });
    });

    const gatheredQuestions: MCQItem[] = [];
    const seenQuestionTexts = new Set<string>();

    matchedLessons.forEach(l => {
      const qList = Array.isArray(l.questions) ? l.questions : Array.isArray(l.mcqs) ? l.mcqs : [];
      qList.forEach(q => {
        const txt = (q.question || '').trim();
        if (txt && !seenQuestionTexts.has(txt)) {
          seenQuestionTexts.add(txt);
          gatheredQuestions.push({
            ...q,
            topic: q.topic || cfg.shortName
          });
        }
      });
    });

    // 2. Also check settings?.subjectMcqPools or settings?.classMcqs
    (settings?.subjectMcqPools || []).forEach(pool => {
      if (pool.classLevel === classLevel || (!pool.classLevel && cfg.aliases.some(a => normalizeSubject(pool.subject || pool.subjectLabel).includes(normalizeSubject(a))))) {
        (pool.questions || []).forEach(q => {
          const txt = (q.question || '').trim();
          if (txt && !seenQuestionTexts.has(txt)) {
            seenQuestionTexts.add(txt);
            gatheredQuestions.push(q);
          }
        });
      }
    });

    // 3. Guarantee Set 1 readiness with seed pool if subject pool has few items
    let seedPool: MCQItem[] = [];
    if (classLevel === '10') {
      if (cfg.id === 'math') seedPool = SEED_QUESTIONS_CLASS_10_MATH;
      else if (cfg.id === 'science') seedPool = SEED_QUESTIONS_CLASS_10_SCIENCE;
      else seedPool = SEED_QUESTIONS_CLASS_10_SCIENCE; // fallback base
    } else {
      if (cfg.id === 'physics') seedPool = SEED_QUESTIONS_CLASS_12_PHYSICS;
      else seedPool = SEED_QUESTIONS_CLASS_12_PHYSICS; // fallback base
    }

    seedPool.forEach(sq => {
      const txt = (sq.question || '').trim();
      if (txt && !seenQuestionTexts.has(txt)) {
        seenQuestionTexts.add(txt);
        gatheredQuestions.push(sq);
      }
    });

    // 4. Sort questions deterministically by stable hash so Set 1 is 100% IDENTICAL for all users
    gatheredQuestions.sort((a, b) => {
      const ha = stringHash(a.question || '');
      const hb = stringHash(b.question || '');
      return ha - hb;
    });

    // 5. Partition questions into standard batches of SET_SIZE (Set 1, Set 2, Set 3...)
    const totalSetsForSubject = Math.max(1, Math.ceil(gatheredQuestions.length / SET_SIZE));

    for (let setIdx = 0; setIdx < totalSetsForSubject; setIdx++) {
      const start = setIdx * SET_SIZE;
      let batch = gatheredQuestions.slice(start, start + SET_SIZE);

      // If last batch has at least 10 questions but < 25, pad with deterministic seed questions
      if (batch.length < SET_SIZE && batch.length >= 10) {
        let pIdx = 0;
        while (batch.length < SET_SIZE) {
          batch.push({ ...seedPool[pIdx % seedPool.length] });
          pIdx++;
        }
      } else if (batch.length < 10 && setIdx > 0) {
        // Not enough questions to form a complete new set yet
        continue;
      }

      const setNum = setIdx + 1;
      const setId = `class_${classLevel}_${cfg.id}_set_${setNum}`;

      generatedSets.push({
        id: setId,
        setNumber: (classLevel === '10' ? 1000 : 2000) + (cfg.id.length * 10) + setNum,
        type: 'BASIC' as const,
        title: `कक्षा ${classLevel} ${cfg.shortName} - सेट ${setNum}`,
        subtitle: `${batch.length} प्रश्न · 25 मिनट · बोर्ड परीक्षा स्पेशल`,
        description: `कक्षा ${classLevel} (${cfg.name}) के महत्वपूर्ण वस्तुनिष्ठ प्रश्नों का अभ्यास सेट ${setNum}। पूरे बिहार के विद्यार्थियों के साथ साप्ताहिक लाइव रैंकिंग!`,
        targetExam: `कक्षा ${classLevel} बोर्ड परीक्षा`,
        durationMinutes: 25,
        totalQuestions: batch.length,
        negativeMarking: false,
        marksPerQuestion: 1,
        negativePenalty: 0,
        classLevel,
        subjectId: cfg.id,
        subjectLabel: cfg.name,
        subjectIcon: cfg.icon,
        isClassSet: true,
        isAutoGenerated: true,
        sections: [
          {
            id: 'gk',
            name: cfg.name,
            hindiName: cfg.name,
            icon: cfg.icon,
            targetCount: batch.length
          }
        ],
        customQuestions: batch.map((q, qIndex) => ({
          ...q,
          sectionId: 'gk',
          setQuestionNumber: qIndex + 1
        }))
      });
    }
  });

  return generatedSets;
}
