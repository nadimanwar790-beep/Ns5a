import React, { useState } from 'react';
import { BookOpen, CheckCircle, Brain, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizQuestion {
  id: number;
  question: string;
  subject: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const SAMPLE_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    subject: 'CBSE Class X - Science',
    question: 'Which of the following is the balanced chemical equation for the reaction of rust formation?',
    options: [
      '4Fe + 3O2 + 2xH2O → 2Fe2O3.xH2O',
      '2Fe + O2 → 2FeO',
      'Fe + H2O → Fe(OH)2',
      'Fe2O3 + 3H2 → 2Fe + 3H2O',
    ],
    correctAnswer: 0,
    explanation: 'Iron reacts with atmospheric oxygen and moisture to form hydrated ferric oxide (rust): 4Fe + 3O2 + 2xH2O → 2Fe2O3.xH2O.',
  },
  {
    id: 2,
    subject: 'CBSE Class X - Mathematics',
    question: 'If the discriminant of a quadratic equation ax² + bx + c = 0 is greater than 0, the roots are:',
    options: [
      'Real and equal',
      'Real and distinct',
      'No real roots',
      'Purely imaginary',
    ],
    correctAnswer: 1,
    explanation: 'When D = b² - 4ac > 0, the quadratic equation has two real and distinct roots.',
  },
  {
    id: 3,
    subject: 'CBSE Class X - Science',
    question: 'What is the power of a convex lens with focal length 25 cm?',
    options: ['+4 D', '-4 D', '+0.25 D', '+2.5 D'],
    correctAnswer: 0,
    explanation: 'Power P = 1 / f(in meters) = 1 / 0.25m = +4 Dioptres (D).',
  },
];

export const StudyTools: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQ = SAMPLE_QUESTIONS[currentIdx];

  const handleOptionSelect = (index: number) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(index);
    setShowExplanation(true);
    if (index === currentQ.correctAnswer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < SAMPLE_QUESTIONS.length) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOpt(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setScore(0);
    setIsFinished(false);
    setShowExplanation(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">NSTA CBSE Quick Revision & Quiz</h2>
              <p className="text-xs text-slate-400">Class 10 CBSE Board Exam practice modules</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
            Score: {score}/{SAMPLE_QUESTIONS.length}
          </span>
        </div>

        {!isFinished ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-emerald-400">{currentQ.subject}</span>
              <span>Question {currentIdx + 1} of {SAMPLE_QUESTIONS.length}</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-sm font-semibold text-white leading-relaxed">
                {currentQ.question}
              </p>
            </div>

            <div className="space-y-2">
              {currentQ.options.map((opt, idx) => {
                let btnStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800';
                if (selectedOpt !== null) {
                  if (idx === currentQ.correctAnswer) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                  } else if (idx === selectedOpt) {
                    btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleOptionSelect(idx)}
                    disabled={selectedOpt !== null}
                    className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {selectedOpt !== null && idx === currentQ.correctAnswer && (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
                <strong className="text-emerald-400">Explanation: </strong>
                {currentQ.explanation}
              </div>
            )}

            {selectedOpt !== null && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                >
                  {currentIdx + 1 < SAMPLE_QUESTIONS.length ? 'Next Question →' : 'See Results'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Trophy className="w-14 h-14 text-amber-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Quiz Completed!</h3>
            <p className="text-slate-300 text-sm">
              You scored <strong className="text-emerald-400 text-lg">{score}</strong> out of {SAMPLE_QUESTIONS.length}
            </p>
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
