import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, ChevronRight, HelpCircle, RefreshCw, Sparkles, XCircle } from 'lucide-react';

interface PracticeQuizTabProps {
  language: 'hi' | 'en';
}

export const PracticeQuizTab: React.FC<PracticeQuizTabProps> = ({ language }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const quizQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      topic: 'cube_cutting',
      titleHi: 'घन काटना (Cube Cutting)',
      titleEn: 'Cube Slicing Reasoning',
      questionHi: 'एक 6 सेमी भुजा वाले घन को सभी तरफ से लाल रंग से रंगा जाता है और 1 सेमी भुजा वाले छोटे घनों में काटा जाता है। ऐसे कितने छोटे घन होंगे जिनकी केवल 2 सतहें रंगी होंगी?',
      questionEn: 'A cube of 6 cm is painted red on all faces and cut into 1 cm unit cubes. How many small cubes will have exactly 2 painted faces?',
      optionsHi: ['48 घन', '36 घन', '24 घन', '64 घन'],
      optionsEn: ['48 cubes', '36 cubes', '24 cubes', '64 cubes'],
      correctIndex: 0, // 12 * (6 - 2) = 48
      formula: '12 × (n - 2) = 12 × (6 - 2) = 12 × 4 = 48',
      explanationHi: 'यहाँ n = 6 / 1 = 6 है। केवल 2 सतह रंगे घन (मध्य घन) किनारों (Edges) पर स्थित होते हैं। अतः सूत्र = 12 × (n - 2) = 12 × (6 - 2) = 12 × 4 = 48 छोटे घन।',
      explanationEn: 'Here n = 6/1 = 6. Cubes with 2 painted faces (Edge cubes) lie on the 12 edges. Formula: 12 × (n - 2) = 12 × (6 - 2) = 48 cubes.',
    },
    {
      id: 'q2',
      topic: 'cube_cutting',
      titleHi: 'रंगहीन घन (Colourless Inner Cubes)',
      titleEn: 'Colourless / Inner Cubes',
      questionHi: 'एक रंगे हुए 4 सेमी के घन को 1 सेमी के टुकड़ों में काटा गया। ऐसे कितने घन होंगे जिनकी किसी भी सतह पर रंग नहीं होगा?',
      questionEn: 'A painted 4 cm cube is cut into 1 cm cubes. How many cubes will have NO paint on any surface (0 painted faces)?',
      optionsHi: ['8 घन', '16 घन', '24 घन', '0 घन'],
      optionsEn: ['8 cubes', '16 cubes', '24 cubes', '0 cubes'],
      correctIndex: 0, // (4-2)^3 = 8
      formula: '(n - 2)³ = (4 - 2)³ = 2³ = 8',
      explanationHi: 'रंगहीन घन (Inner Cubes) अंदर के भाग में होते हैं। सूत्र = (n - 2)³ = (4 - 2)³ = 2³ = 8 घन।',
      explanationEn: 'Unpainted inner cubes formula: (n - 2)³ = (4 - 2)³ = 2³ = 8 cubes.',
    },
    {
      id: 'q3',
      topic: 'mensuration',
      titleHi: 'बेलन का आयतन (Cylinder Volume)',
      titleEn: 'Cylinder Volume & Scaling',
      questionHi: 'यदि एक बेलन (Cylinder) की त्रिज्या को दोगुना और ऊंचाई को आधा कर दिया जाए, तो उसके आयतन में क्या परिवर्तन होगा?',
      questionEn: 'If the radius of a cylinder is doubled and its height is halved, what happens to its volume?',
      optionsHi: ['दोगुना (2 गुना)', 'समान रहेगा (No change)', 'चार गुना (4 गुना)', 'आधा (1/2)'],
      optionsEn: ['Doubled (2x)', 'Remains Same', '4 times', 'Halved (1/2)'],
      correctIndex: 0, // V = pi * (2r)^2 * (h/2) = pi * 4r^2 * h/2 = 2 * (pi*r^2*h)
      formula: 'V₂ = π × (2r)² × (h/2) = 2 × (πr²h) = 2 × V₁',
      explanationHi: 'बेलन का प्रारंभिक आयतन V₁ = πr²h है। नई त्रिज्या = 2r, नई ऊंचाई = h/2. नया आयतन V₂ = π(2r)²(h/2) = π(4r²)(h/2) = 2πr²h = 2 V₁. अतः आयतन 2 गुना हो जाएगा।',
      explanationEn: 'Initial Volume V₁ = πr²h. New radius = 2r, new height = h/2. New Volume V₂ = π(2r)²(h/2) = 2πr²h = 2V₁. So volume doubles.',
    },
    {
      id: 'q4',
      topic: 'dice_reasoning',
      titleHi: 'मानक पासा (Standard Dice Reasoning)',
      titleEn: 'Standard Dice Reasoning',
      questionHi: 'एक मानक पासे (Standard Dice) में यदि ऊपरी सतह पर अंक 3 है, तो उसके ठीक विपरीत (Bottom) सतह पर कौन सा अंक होगा?',
      questionEn: 'In a standard dice, if the top face has the number 3, what number is on the bottom (opposite) face?',
      optionsHi: ['4', '5', '6', '1'],
      optionsEn: ['4', '5', '6', '1'],
      correctIndex: 0, // 7 - 3 = 4
      formula: '7 - 3 = 4 (मानक पासे में विपरीत सतहों का योग 7 होता है)',
      explanationHi: 'मानक पासे (Standard Dice) का मुख्य नियम है कि विपरीत सतहों का योग हमेशा 7 होता है (1+6=7, 2+5=7, 3+4=7)। अतः 3 के विपरीत 7 - 3 = 4 होगा।',
      explanationEn: 'In a standard die, opposite faces always sum to 7. Therefore, opposite of 3 is 7 - 3 = 4.',
    },
    {
      id: 'q5',
      topic: 'mensuration',
      titleHi: 'शंकु की तिर्यक ऊंचाई (Cone Slant Height)',
      titleEn: 'Cone Slant Height',
      questionHi: 'एक शंकु की त्रिज्या 6 सेमी और ऊंचाई 8 सेमी है। उसकी तिर्यक ऊंचाई (Slant Height l) कितनी होगी?',
      questionEn: 'A cone has a base radius of 6 cm and height of 8 cm. What is its slant height (l)?',
      optionsHi: ['10 सेमी', '12 सेमी', '14 सेमी', '15 सेमी'],
      optionsEn: ['10 cm', '12 cm', '14 cm', '15 cm'],
      correctIndex: 0, // sqrt(36 + 64) = sqrt(100) = 10
      formula: 'l = √(r² + h²) = √(6² + 8²) = √(36 + 64) = √100 = 10 cm',
      explanationHi: 'शंकु की तिर्यक ऊंचाई का सूत्र l = √(r² + h²) होता है। l = √(6² + 8²) = √(36 + 64) = √100 = 10 सेमी।',
      explanationEn: 'Slant height l = √(r² + h²) = √(6² + 8²) = √100 = 10 cm.',
    },
  ];

  const currentQ = quizQuestions[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    setShowExplanation(true);

    if (idx === currentQ.correctIndex) {
      setScore((s) => s + 1);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < quizQuestions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowExplanation(false);
    setScore(0);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Score Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between backdrop-blur-md">
        <div>
          <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
            {language === 'hi' ? 'रीज़निंग व गणित अभ्यास टेस्ट' : 'Interactive Math & Reasoning Quiz'}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
            {language === 'hi' ? 'घन, पासा, बेलन व शंकु अभ्यास' : '3D Shapes & Dice Mastery'}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400">{language === 'hi' ? 'अंक (Score)' : 'Score'}</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              {score} / {quizQuestions.length}
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400">{language === 'hi' ? 'प्रश्न' : 'Question'}</div>
            <div className="text-sm font-bold text-indigo-400 font-mono">
              {currentIdx + 1} / {quizQuestions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md space-y-5">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
            {language === 'hi' ? currentQ.titleHi : currentQ.titleEn}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Q{currentIdx + 1} of {quizQuestions.length}
          </span>
        </div>

        <h4 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
          {language === 'hi' ? currentQ.questionHi : currentQ.questionEn}
        </h4>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {(language === 'hi' ? currentQ.optionsHi : currentQ.optionsEn).map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;
            let btnStyle = 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700';

            if (isAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500 shadow-lg shadow-emerald-500/20';
              } else if (isSelected) {
                btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-300 ring-1 ring-rose-500';
              } else {
                btnStyle = 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between ${btnStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>

                {isAnswered && (
                  <div>
                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Card when answered */}
        {showExplanation && (
          <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-900/50 space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {language === 'hi' ? 'हल और सूत्र (Solution & Formula):' : 'Step-by-Step Solution:'}
              </span>
              <span className="font-mono bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                {currentQ.formula}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {language === 'hi' ? currentQ.explanationHi : currentQ.explanationEn}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800/80">
          <button
            onClick={handleRestart}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'hi' ? 'शुरू से रीसेट' : 'Restart Quiz'}
          </button>

          {isAnswered && (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
            >
              {currentIdx === quizQuestions.length - 1 ? (
                language === 'hi' ? (
                  'समाप्त (Completed)'
                ) : (
                  'Completed'
                )
              ) : (
                <>
                  {language === 'hi' ? 'अगला प्रश्न (Next)' : 'Next Question'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
