// @ts-nocheck
import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
  X,
  HelpCircle
} from 'lucide-react';
import { SystemSettings, CustomPracticeSetEntry, MCQItem } from '../types';
import { parseMCQText, normalizeMcqPaste } from '../utils/mcqParser';
import { hapticLight, hapticStrong } from '../utils/haptic';
import McqQuestionDisplay from './McqQuestionDisplay';

interface Props {
  settings?: SystemSettings;
  onSaveSettings: (updated: SystemSettings) => Promise<void> | void;
  onBack: () => void;
  isSaving?: boolean;
}

export const AdminPracticeSetManager: React.FC<Props> = ({
  settings,
  onSaveSettings,
  onBack,
  isSaving = false
}) => {
  const customSets: CustomPracticeSetEntry[] = settings?.customPracticeSets || [];

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [setType, setSetType] = useState<'BASIC' | 'ULTRA'>('BASIC');
  const [targetExam, setTargetExam] = useState('Bihar Police Constable');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativePenalty, setNegativePenalty] = useState(0);
  const [rawMcqText, setRawMcqText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<MCQItem[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setDescription('');
    setSetType('BASIC');
    setTargetExam('Bihar Police Constable');
    setDurationMinutes(60);
    setNegativeMarking(false);
    setNegativePenalty(0);
    setRawMcqText('');
    setParsedQuestions([]);
    setIsEditorOpen(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: CustomPracticeSetEntry) => {
    setEditingId(item.id);
    setTitle(item.title);
    setSubtitle(item.subtitle || '');
    setDescription(item.description || '');
    setSetType(item.type);
    setTargetExam(item.targetExam || '');
    setDurationMinutes(item.durationMinutes);
    setNegativeMarking(item.negativeMarking);
    setNegativePenalty(item.negativePenalty || 0);
    setParsedQuestions(item.questions || []);

    // Format questions back into text for editing
    const textRepr = (item.questions || []).map((q, i) => {
      const opts = (q.options || []).map((o, oi) => `${String.fromCharCode(65 + oi)}) ${o}`).join('\n');
      return `**Question ${i + 1}**\n❓ Question: ${q.question}\n${opts}\n✅ Correct Answer: ${q.options[q.correctAnswer] || ''}\nExplanation: ${q.explanation || ''}`;
    }).join('\n\n');
    setRawMcqText(textRepr);

    setIsEditorOpen(true);
  };

  const handleTypeChange = (type: 'BASIC' | 'ULTRA') => {
    setSetType(type);
    if (type === 'BASIC') {
      setDurationMinutes(60);
      setNegativeMarking(false);
      setNegativePenalty(0);
      setTargetExam('Bihar Police Constable');
    } else {
      setDurationMinutes(120);
      setNegativeMarking(true);
      setNegativePenalty(0.25);
      setTargetExam('BSSC Inter Level / SSC CGL');
    }
  };

  const handleParseQuestions = (text: string) => {
    setRawMcqText(text);
    if (!text.trim()) {
      setParsedQuestions([]);
      return;
    }
    try {
      const normalized = normalizeMcqPaste(text);
      const parsed = parseMCQText(normalized);
      const qList = Array.isArray(parsed) ? parsed : (parsed?.questions || []);
      setParsedQuestions(qList);
    } catch {
      // keep current
    }
  };

  const handleSaveSet = async () => {
    if (!title.trim()) {
      setStatusMsg({ text: 'कृपया सेट का शीर्षक (Title) अवश्य दर्ज करें।', type: 'error' });
      return;
    }

    let finalQuestions = parsedQuestions;
    if (finalQuestions.length === 0 && rawMcqText.trim()) {
      const normalized = normalizeMcqPaste(rawMcqText);
      const parsed = parseMCQText(normalized);
      finalQuestions = Array.isArray(parsed) ? parsed : (parsed?.questions || []);
    }

    if (finalQuestions.length === 0) {
      setStatusMsg({ text: 'कृपया कम से कम 1 प्रश्न दर्ज करें।', type: 'error' });
      return;
    }

    const newSet: CustomPracticeSetEntry = {
      id: editingId || `custom_set_${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || `${finalQuestions.length} प्रश्न · ${durationMinutes} मिनट`,
      description: description.trim() || `${targetExam} स्पेशल अभ्यास सेट।`,
      type: setType,
      targetExam: targetExam.trim(),
      durationMinutes: Number(durationMinutes) || 60,
      negativeMarking: Boolean(negativeMarking),
      negativePenalty: negativeMarking ? Number(negativePenalty || 0.25) : 0,
      marksPerQuestion: 1,
      questions: finalQuestions,
      createdAt: new Date().toISOString(),
      isPublished: true
    };

    let updatedList: CustomPracticeSetEntry[] = [];
    if (editingId) {
      updatedList = customSets.map(s => s.id === editingId ? newSet : s);
    } else {
      updatedList = [newSet, ...customSets];
    }

    const updatedSettings = {
      ...settings,
      customPracticeSets: updatedList
    };

    try {
      await onSaveSettings(updatedSettings);
      setStatusMsg({ text: 'कस्टम प्रैक्टिस सेट सफलतापूर्वक सहेजा गया! ✅', type: 'success' });
      setTimeout(() => {
        resetForm();
        setStatusMsg(null);
      }, 1200);
    } catch {
      setStatusMsg({ text: 'सहेजने में त्रुटि हुई। कृपया पुनः प्रयास करें।', type: 'error' });
    }
  };

  const handleDeleteSet = async (id: string) => {
    if (!confirm('क्या आप वाकई इस कस्टम प्रैक्टिस सेट को हटाना चाहते हैं?')) return;
    const updatedList = customSets.filter(s => s.id !== id);
    const updatedSettings = {
      ...settings,
      customPracticeSets: updatedList
    };
    try {
      await onSaveSettings(updatedSettings);
      setStatusMsg({ text: 'प्रैक्टिस सेट हटा दिया गया।', type: 'success' });
      setTimeout(() => setStatusMsg(null), 2000);
    } catch {
      setStatusMsg({ text: 'हटाने में समस्या आई।', type: 'error' });
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="text-xl font-black text-slate-800">
                Custom Practice Set Manager
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              बिहार पुलिस (Basic 60m) व BSSC / SSC (Ultra 120m) के कस्टम ऑफिशियल टेस्ट बनाएं व मैनेज करें
            </p>
          </div>
        </div>

        {!isEditorOpen && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create New Custom Set</span>
          </button>
        )}
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ── CREATE / EDIT FORM ── */}
      {isEditorOpen ? (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <Edit3 size={18} className="text-indigo-600" />
              <span>{editingId ? 'Edit Practice Set' : 'Create Custom Practice Set'}</span>
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Set Title (शीर्षक) *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="उदा. बिहार पुलिस सिपाही - ऑफिशियल मॉक टेस्ट 01"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Target Exam */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Target Exam (लक्षित परीक्षा)</label>
              <input
                type="text"
                value={targetExam}
                onChange={e => setTargetExam(e.target.value)}
                placeholder="उदा. Bihar Police / BSSC Inter Level"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Set Type Radio */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Set Type (प्रकार) *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('BASIC')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    setType === 'BASIC'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-black text-xs">👮 BASIC SET</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">60 Min · No Negative (Bihar Police)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('ULTRA')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    setType === 'ULTRA'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-black text-xs">🏛️ ULTRA SET</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">120 Min · -0.25 Negative (BSSC/SSC)</div>
                </button>
              </div>
            </div>

            {/* Duration & Negative penalty */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Duration (Minutes)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Negative Penalty</label>
                <input
                  type="number"
                  step="0.05"
                  value={negativePenalty}
                  disabled={!negativeMarking}
                  onChange={e => setNegativePenalty(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Subtitle / Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Description (विवरण)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="उदा. 100 प्रश्नों का संपूर्ण परीक्षा पैटर्न आधारित टेस्ट"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold outline-none"
            />
          </div>

          {/* MCQ Paste Input Area */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-600" />
                <span>MCQ Questions Paste Area (प्रश्नों का टेक्स्ट पेस्ट करें) *</span>
              </label>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Parsed: {parsedQuestions.length} Questions
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              मानक स्वरूप (Question, Options A/B/C/D, Correct Answer, Explanation) स्वतः पहचान लिया जाता है।
            </p>
            <textarea
              rows={10}
              value={rawMcqText}
              onChange={e => handleParseQuestions(e.target.value)}
              placeholder={`**Question 1**\n❓ Question: बिहार में 1857 की क्रांति का नेतृत्व किसने किया था?\nA) कुंवर सिंह\nB) नाना साहेब\nC) अमर सिंह\nD) पीर अली\n✅ Correct Answer: कुंवर सिंह\nExplanation: जगदीशपुर के वीर कुंवर सिंह ने 1857 की क्रांति का नेतृत्व किया था।`}
              className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />

            {/* Live Questions Preview */}
            {parsedQuestions.length > 0 && (
              <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <span>👁️ प्रश्नों का लाइव प्रीव्यू ({parsedQuestions.length} प्रश्न पहचाने गए)</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 font-bold bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                    सूची Boxes व Statement Boxes सक्रिय
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
                  {parsedQuestions.map((q, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          Q{idx + 1}
                        </span>
                        {q.questionType && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {q.questionType}
                          </span>
                        )}
                      </div>
                      <McqQuestionDisplay q={q} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1">
                        {q.options?.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
                              oi === q.correctAnswer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + oi)})</span>
                            <span className="truncate">{opt}</span>
                            {oi === q.correctAnswer && <span className="ml-auto text-emerald-600 font-black">✓</span>}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                          💡 <span className="font-bold text-slate-700">व्याख्या:</span> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSet}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save & Publish Practice Set'}</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ── EXISTING CUSTOM SETS LIST ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">
            Published Custom Sets ({customSets.length})
          </h3>
          <span className="text-xs text-slate-500">
            छात्रों के Practice Sets पेज पर 'Official Admin Set' के रूप में दिखते हैं।
          </span>
        </div>

        {customSets.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
            <div className="text-3xl">📝</div>
            <div className="font-bold text-slate-700 text-sm">अभी कोई कस्टम प्रैक्टिस सेट नहीं बना है।</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              ऊपर 'Create New Custom Set' बटन पर क्लिक करके बिहार पुलिस या BSSC के ऑफिशियल टेस्ट बना सकते हैं।
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {customSets.map(set => (
              <div
                key={set.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      set.type === 'BASIC'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {set.type === 'BASIC' ? '👮 Basic Set (60m)' : '🏛️ Ultra Set (120m)'}
                    </span>

                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(set.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-900 text-sm">
                    {set.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {set.description || set.subtitle}
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 font-bold">
                    <span>📄 {set.questions?.length || 0} Questions</span>
                    <span>⏱️ {set.durationMinutes} Min</span>
                    <span>{set.negativeMarking ? `⚠️ -${set.negativePenalty || 0.25} Neg` : '✅ No Neg'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(set)}
                    className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                    title="Edit Set"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSet(set.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Set"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
