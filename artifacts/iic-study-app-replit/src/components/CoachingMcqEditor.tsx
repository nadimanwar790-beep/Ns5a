import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Layers, RefreshCw, CheckCircle2 } from 'lucide-react';
import { normalizeMcqPaste, parseMCQText } from '../utils/mcqParser';
import { normalizeMcqForStorage } from '../utils/mcqStructure';
import { extractMatchColumns, buildMatchStatements, cleanMatchQuestionStem } from '../utils/questionTypeDetector';
import type { MatchColumnData, MatchColumnRow, MCQQuestionType } from '../types';

export interface CoachingMcqEditorItem {
  id: string;
  topic?: string;
  questionNumber?: string | number;
  question: string;
  statements?: string[];
  matchColumns?: MatchColumnData;
  questionType?: MCQQuestionType;
  passage?: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  concept?: string;
  examTip?: string;
  difficultyLevel?: string;
}

interface Props {
  value: CoachingMcqEditorItem[];
  onChange: (items: CoachingMcqEditorItem[]) => void;
  accent?: 'emerald' | 'green';
  compact?: boolean;
}

const makeId = () => `mcq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const emptyMcq = (): CoachingMcqEditorItem => ({
  id: makeId(),
  topic: '',
  questionNumber: '',
  question: '',
  statements: [],
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
});

function normalizeItem(item: any): CoachingMcqEditorItem {
  let matchColumns = item?.matchColumns;
  if (!matchColumns && item?.question) {
    matchColumns = extractMatchColumns(item.question, item.statements);
  }
  let statements = Array.isArray(item?.statements) ? item.statements : [];
  if (matchColumns && statements.length === 0) {
    statements = buildMatchStatements(matchColumns);
  }

  return {
    id: item?.id || makeId(),
    topic: item?.topic || '',
    questionNumber: item?.questionNumber ?? '',
    question: item?.question || '',
    statements,
    matchColumns: matchColumns || undefined,
    questionType: item?.questionType || (matchColumns ? 'MATCH_COLUMN' : undefined),
    passage: item?.passage || undefined,
    options: [...(item?.options || ['', '', '', '']), '', '', '', ''].slice(0, 4),
    correctAnswer: Number.isInteger(item?.correctAnswer) ? item.correctAnswer : 0,
    explanation: item?.explanation || '',
    concept: item?.concept || '',
    examTip: item?.examTip || '',
    difficultyLevel: item?.difficultyLevel || '',
  };
}

export function CoachingMcqEditor({ value, onChange, accent = 'emerald', compact = false }: Props) {
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const color = accent === 'green' ? 'green' : 'emerald';
  const panelClass = accent === 'green'
    ? 'bg-green-50 border-green-200'
    : 'bg-emerald-50 border-emerald-200';
  const labelClass = accent === 'green' ? 'text-green-700' : 'text-emerald-700';
  const buttonClass = accent === 'green'
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-emerald-600 hover:bg-emerald-700';
  const items = (value || []).map(normalizeItem);

  const updateItem = (index: number, patch: Partial<CoachingMcqEditorItem>) => {
    onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const updateOption = (index: number, optionIndex: number, text: string) => {
    onChange(items.map((item, i) => {
      if (i !== index) return item;
      const options = [...item.options];
      options[optionIndex] = text;
      return { ...item, options };
    }));
  };

  const updateStatement = (index: number, statementIndex: number, text: string) => {
    onChange(items.map((item, i) => {
      if (i !== index) return item;
      const statements = [...(item.statements || [])];
      statements[statementIndex] = text;
      return { ...item, statements };
    }));
  };

  const addStatement = (index: number) => {
    onChange(items.map((item, i) => i === index
      ? { ...item, statements: [...(item.statements || []), ''] }
      : item
    ));
  };

  const removeStatement = (index: number, statementIndex: number) => {
    onChange(items.map((item, i) => i === index
      ? { ...item, statements: (item.statements || []).filter((_, si) => si !== statementIndex) }
      : item
    ));
  };

  // Helper: update list 1 or list 2 from textareas
  const updateMatchListText = (index: number, listType: 'left' | 'right', rawText: string) => {
    const item = items[index];
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const existingMC = item.matchColumns || {
      list1Title: "खण्ड 'अ' (सूची-I)",
      list2Title: "खण्ड 'ब' (सूची-II)",
      rows: []
    };

    let newRows: MatchColumnRow[] = [...existingMC.rows];
    const maxCount = Math.max(newRows.length, lines.length, 4);

    while (newRows.length < maxCount) {
      const idx = newRows.length;
      newRows.push({
        leftKey: String.fromCharCode(65 + idx),
        leftText: '',
        rightKey: String(idx + 1),
        rightText: ''
      });
    }

    if (listType === 'left') {
      lines.forEach((line, i) => {
        const clean = line.replace(/^[a-dA-D1-4IVXivx][\.\:\)\-]?\s*/, '').trim();
        const keyMatch = line.match(/^([a-dA-D1-4IVXivx])[\.\:\)\-]/);
        const key = keyMatch ? keyMatch[1].toUpperCase() : String.fromCharCode(65 + i);
        if (newRows[i]) {
          newRows[i] = { ...newRows[i], leftKey: key, leftText: clean || line };
        }
      });
    } else {
      lines.forEach((line, i) => {
        const clean = line.replace(/^[a-dA-D1-4IVXivx][\.\:\)\-]?\s*/, '').trim();
        const keyMatch = line.match(/^([a-dA-D1-4IVXivx])[\.\:\)\-]/);
        const key = keyMatch ? keyMatch[1] : String(i + 1);
        if (newRows[i]) {
          newRows[i] = { ...newRows[i], rightKey: key, rightText: clean || line };
        }
      });
    }

    // Filter out rows that have neither left nor right text if beyond lines length
    const activeRows = newRows.filter((r, i) => i < Math.max(lines.length, 2) || r.leftText || r.rightText);

    const updatedMC: MatchColumnData = {
      ...existingMC,
      rows: activeRows.length > 0 ? activeRows : newRows.slice(0, 4)
    };

    const stmts = buildMatchStatements(updatedMC);

    updateItem(index, {
      matchColumns: updatedMC,
      questionType: 'MATCH_COLUMN',
      statements: stmts.length > 0 ? stmts : item.statements
    });
  };

  const parseBulk = () => {
    const raw = bulkText.trim();
    if (!raw) return;
    const parsed = parseMCQText(normalizeMcqPaste(raw));
    const list = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    const added = list.map((q: any, index: number) => {
      let matchColumns = q.matchColumns || extractMatchColumns(q.question, q.statements);
      let statements = q.statements || [];
      if (matchColumns && (!statements || statements.length === 0)) {
        statements = buildMatchStatements(matchColumns);
      }
      return normalizeItem({
        ...q,
        ...normalizeMcqForStorage(q, index),
        id: makeId(),
        question: (q.question || '').replace(/<br\/?>/g, '\n').trim(),
        options: (q.options || ['', '', '', '']).slice(0, 4),
        correctAnswer: q.correctAnswer ?? 0,
        statements,
        matchColumns,
        questionType: q.questionType || (matchColumns ? 'MATCH_COLUMN' : undefined),
        explanation: q.explanation || '',
      });
    });

    if (added.length > 0) {
      onChange([...items, ...added]);
      setBulkText('');
      setShowBulk(false);
    }
  };

  return (
    <div className={`${panelClass} border rounded-lg p-3 space-y-2`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className={`text-[10px] font-bold ${labelClass} uppercase flex items-center gap-1`}>
          📝 Coaching MCQs ({items.length})
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShowBulk(v => !v)}
            className="bg-amber-500 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-amber-600"
          >
            📋 Bulk Paste
          </button>
          <button
            type="button"
            onClick={() => {
              const item = emptyMcq();
              onChange([...items, item]);
              setOpenId(item.id);
            }}
            className={`${buttonClass} text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1`}
          >
            <Plus size={10} /> Add MCQ
          </button>
        </div>
      </div>

      {showBulk && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2.5 space-y-2">
          <div className="space-y-1">
            <p className="text-[10px] text-amber-800 font-bold">
              💡 <b>Coaching & Competition Format:</b> Q1., A-D, Answer:, Explanation:, aur <b>सूची-I व सूची-II (Match questions)</b> समर्थित हैं।
            </p>
            <p className="text-[9px] text-amber-700">
              Match question me सूची-I व सूची-II paste karein — system apne aap dono suchi ke alag 2 boxes me parse karega aur question me dikhayega!
            </p>
          </div>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={'<TOPIC: भारतीय इतिहास>\nQ1. सूची-I को सूची-II से सुमेलित कीजिए और सही कूट चुनिए:\nसूची-I (युद्ध)\nA. बक्सर का युद्ध\nB. प्लासी का युद्ध\nC. हल्दीघाटी का युद्ध\nD. पानीपत का द्वितीय युद्ध\nसूची-II (वर्ष)\n1. 1764\n2. 1757\n3. 1576\n4. 1556\nकूट:\nA) A-1, B-2, C-3, D-4\nB) A-2, B-1, C-4, D-3\nC) A-1, B-2, C-4, D-3\nD) A-4, B-3, C-2, D-1\nAnswer: A\nExplanation: बक्सर का युद्ध 1764 में हुआ था...'}
            className="w-full p-2 border border-amber-300 rounded text-[11px] font-mono outline-none min-h-[160px] resize-y focus:border-amber-500 bg-white"
          />
          <div className="flex gap-1.5">
            <button type="button" onClick={parseBulk} className="flex-1 bg-amber-600 text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-amber-700">
              Parse & Add All (Auto-Detect सूची व Statements)
            </button>
            <button type="button" onClick={() => { setBulkText(''); setShowBulk(false); }} className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-slate-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.map((mcq, index) => {
        const expanded = openId === mcq.id || items.length <= 1;
        const hasMatch = Boolean(mcq.matchColumns && mcq.matchColumns.rows && mcq.matchColumns.rows.length > 0);

        return (
          <div key={mcq.id} className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2 relative shadow-2xs">
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 rounded"
              title="MCQ delete karein"
            >
              <Trash2 size={12} />
            </button>
            <button
              type="button"
              onClick={() => setOpenId(expanded ? null : mcq.id)}
              className="w-full pr-7 flex items-center gap-2 text-left"
            >
              <span className="text-[10px] font-black text-emerald-700">Q{index + 1}</span>
              <span className="flex-1 text-[11px] font-bold text-slate-700 truncate">
                {mcq.topic ? `${mcq.topic} · ` : ''}{mcq.question || 'Question likhein...'}
              </span>
              {hasMatch && (
                <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  🔗 सूची (Match)
                </span>
              )}
              {expanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
            </button>

            {expanded && (
              <div className="space-y-2.5 pt-1">
                <input
                  type="text"
                  value={mcq.questionNumber ?? ''}
                  onChange={e => updateItem(index, { questionNumber: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                  placeholder="Question number, e.g. 1"
                  aria-label="Question number"
                />
                <input
                  type="text"
                  value={mcq.topic || ''}
                  onChange={e => updateItem(index, { topic: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                  placeholder="Topic (optional), e.g. रासायनिक अभिक्रियाएँ"
                />
                <textarea
                  value={mcq.question}
                  onChange={e => updateItem(index, { question: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none min-h-[70px] resize-y focus:border-emerald-500"
                  placeholder="Question / intro / closing question (उदा. सूची-I को सूची-II से सुमेलित कीजिए:)"
                />

                {/* ── TOGGLES FOR सूची (MATCH COLUMNS) & STATEMENTS (कथन) ── */}
                <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (hasMatch) {
                          updateItem(index, { matchColumns: undefined });
                        } else {
                          const ext = extractMatchColumns(mcq.question, mcq.statements);
                          const initial: MatchColumnData = ext || {
                            list1Title: "खण्ड 'अ' (सूची-I)",
                            list2Title: "खण्ड 'ब' (सूची-II)",
                            rows: [
                              { leftKey: 'A', leftText: '', rightKey: '1', rightText: '' },
                              { leftKey: 'B', leftText: '', rightKey: '2', rightText: '' },
                              { leftKey: 'C', leftText: '', rightKey: '3', rightText: '' },
                              { leftKey: 'D', leftText: '', rightKey: '4', rightText: '' },
                            ]
                          };
                          const stmts = buildMatchStatements(initial);
                          updateItem(index, {
                            matchColumns: initial,
                            questionType: 'MATCH_COLUMN',
                            statements: stmts.length > 0 ? stmts : mcq.statements
                          });
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black flex items-center gap-1.5 transition-all ${
                        hasMatch
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <Layers size={11} />
                      <span>{hasMatch ? '✓ सूची Boxes सक्रिय' : '+ सूची का अलग 2 Box (सूची-I व सूची-II)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addStatement(index)}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center gap-1"
                    >
                      <Plus size={10} /> + Statement (कथन)
                    </button>
                  </div>

                  {hasMatch && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx = mcq.matchColumns!.rows.length;
                        const updatedMC = {
                          ...mcq.matchColumns!,
                          rows: [
                            ...mcq.matchColumns!.rows,
                            { leftKey: String.fromCharCode(65 + nextIdx), leftText: '', rightKey: String(nextIdx + 1), rightText: '' }
                          ]
                        };
                        updateItem(index, {
                          matchColumns: updatedMC,
                          statements: buildMatchStatements(updatedMC)
                        });
                      }}
                      className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1"
                    >
                      <Plus size={10} /> + सूची Row जोड़ें
                    </button>
                  )}
                </div>

                {/* ── 2 SEPARATE DEDICATED BOXES FOR सूची-I AND सूची-II ── */}
                {hasMatch && mcq.matchColumns && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-900 uppercase flex items-center gap-1.5">
                        <Layers size={12} className="text-indigo-600" />
                        <span>सूची-I व सूची-II के 2 अलग-अलग Boxes</span>
                      </span>
                      <span className="text-[9px] text-indigo-600 font-semibold">
                        (Dono suchi alag box me bharein — question me saaf dikhega)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* ── BOX 1: सूची - I (खण्ड 'अ' / List I) ── */}
                      <div className="rounded-lg border border-indigo-200 bg-white p-2 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                          <span className="text-[10px] font-black text-indigo-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            Box 1: सूची - I (खण्ड 'अ')
                          </span>
                          <span className="text-[9px] font-mono text-indigo-500 font-bold">List I</span>
                        </div>
                        <input
                          type="text"
                          value={mcq.matchColumns.list1Title || ''}
                          onChange={e => {
                            const updatedMC = { ...mcq.matchColumns!, list1Title: e.target.value };
                            updateItem(index, { matchColumns: updatedMC });
                          }}
                          placeholder="शीर्षक (उदा. सूची - I (विटामिन))"
                          className="w-full p-1 border border-indigo-100 rounded text-[11px] font-bold text-indigo-900 bg-indigo-50/40 outline-none focus:border-indigo-400"
                        />
                        <textarea
                          rows={4}
                          value={mcq.matchColumns.rows.map((r, ri) => `${r.leftKey || String.fromCharCode(65 + ri)}. ${r.leftText}`).join('\n')}
                          onChange={e => updateMatchListText(index, 'left', e.target.value)}
                          placeholder={'A. विटामिन A\nB. विटामिन B1\nC. विटामिन C\nD. विटामिन D'}
                          className="w-full p-1.5 border border-indigo-200 rounded text-[11px] outline-none focus:border-indigo-500 font-medium resize-y bg-white min-h-[90px]"
                        />
                        <div className="space-y-1 pt-0.5">
                          {mcq.matchColumns.rows.map((r, ri) => (
                            <div key={ri} className="flex items-center gap-1.5 text-[11px] bg-indigo-50/60 px-2 py-1 rounded border border-indigo-100">
                              <span className="w-4 h-4 rounded bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                {r.leftKey || String.fromCharCode(65 + ri)}
                              </span>
                              <input
                                type="text"
                                value={r.leftText}
                                onChange={e => {
                                  const updatedRows = [...mcq.matchColumns!.rows];
                                  updatedRows[ri] = { ...updatedRows[ri], leftText: e.target.value };
                                  const updatedMC = { ...mcq.matchColumns!, rows: updatedRows };
                                  updateItem(index, {
                                    matchColumns: updatedMC,
                                    statements: buildMatchStatements(updatedMC)
                                  });
                                }}
                                placeholder={`Item ${String.fromCharCode(65 + ri)}...`}
                                className="flex-1 bg-transparent border-0 outline-none text-[11px] font-medium text-slate-800"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── BOX 2: सूची - II (खण्ड 'ब' / List II) ── */}
                      <div className="rounded-lg border border-emerald-200 bg-white p-2 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            Box 2: सूची - II (खण्ड 'ब')
                          </span>
                          <span className="text-[9px] font-mono text-emerald-500 font-bold">List II</span>
                        </div>
                        <input
                          type="text"
                          value={mcq.matchColumns.list2Title || ''}
                          onChange={e => {
                            const updatedMC = { ...mcq.matchColumns!, list2Title: e.target.value };
                            updateItem(index, { matchColumns: updatedMC });
                          }}
                          placeholder="शीर्षक (उदा. सूची - II (रोग))"
                          className="w-full p-1 border border-emerald-100 rounded text-[11px] font-bold text-emerald-900 bg-emerald-50/40 outline-none focus:border-emerald-400"
                        />
                        <textarea
                          rows={4}
                          value={mcq.matchColumns.rows.map((r, ri) => `${r.rightKey || String(ri + 1)}. ${r.rightText}`).join('\n')}
                          onChange={e => updateMatchListText(index, 'right', e.target.value)}
                          placeholder={'1. रतौंधी\n2. बेरी-बेरी\n3. स्कर्वी\n4. रिकेट्स'}
                          className="w-full p-1.5 border border-emerald-200 rounded text-[11px] outline-none focus:border-emerald-500 font-medium resize-y bg-white min-h-[90px]"
                        />
                        <div className="space-y-1 pt-0.5">
                          {mcq.matchColumns.rows.map((r, ri) => (
                            <div key={ri} className="flex items-center gap-1.5 text-[11px] bg-emerald-50/60 px-2 py-1 rounded border border-emerald-100">
                              <span className="w-4 h-4 rounded bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                {r.rightKey || String(ri + 1)}
                              </span>
                              <input
                                type="text"
                                value={r.rightText}
                                onChange={e => {
                                  const updatedRows = [...mcq.matchColumns!.rows];
                                  updatedRows[ri] = { ...updatedRows[ri], rightText: e.target.value };
                                  const updatedMC = { ...mcq.matchColumns!, rows: updatedRows };
                                  updateItem(index, {
                                    matchColumns: updatedMC,
                                    statements: buildMatchStatements(updatedMC)
                                  });
                                }}
                                placeholder={`Item ${ri + 1}...`}
                                className="flex-1 bg-transparent border-0 outline-none text-[11px] font-medium text-slate-800"
                              />
                              {mcq.matchColumns!.rows.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedRows = mcq.matchColumns!.rows.filter((_, idx) => idx !== ri);
                                    const updatedMC = { ...mcq.matchColumns!, rows: updatedRows };
                                    updateItem(index, {
                                      matchColumns: updatedMC,
                                      statements: buildMatchStatements(updatedMC)
                                    });
                                  }}
                                  className="text-red-400 hover:text-red-600 p-0.5"
                                  title="Row delete karein"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quick Row Pairs Summary */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>✓ सूची के जोड़े अपने आप Statements Box और Question Display में सिंक रहेंगे</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanStem = cleanMatchQuestionStem(mcq.question);
                          updateItem(index, { question: cleanStem });
                        }}
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Question Stem साफ़ करें
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STATEMENTS BOX (कथन आधारित प्रश्न या सूची का बैकअप) ── */}
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-indigo-700 uppercase">
                      Numbered Statements / कथन Box {(mcq.statements || []).length > 0 && `(${mcq.statements!.length})`}
                    </label>
                    <div className="flex items-center gap-2">
                      {!hasMatch && (
                        <button
                          type="button"
                          onClick={() => {
                            const ext = extractMatchColumns(mcq.question, mcq.statements);
                            if (ext) {
                              updateItem(index, { matchColumns: ext, questionType: 'MATCH_COLUMN' });
                            }
                          }}
                          className="text-[9px] font-bold text-indigo-700 hover:underline"
                        >
                          ⚡ Statements से 2 सूची Box बनाएं
                        </button>
                      )}
                      <button type="button" onClick={() => addStatement(index)} className="text-[10px] font-bold text-indigo-600 hover:underline">+ Statement</button>
                    </div>
                  </div>
                  <textarea
                    value={(mcq.statements || []).join('\n')}
                    onChange={e => {
                      const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
                      updateItem(index, { statements: lines.length > 0 ? lines : undefined });
                    }}
                    placeholder="Statements (kathan) yahan likhein — har statement nayi line me (उदा. 1. कथन एक...)"
                    rows={2}
                    className="w-full p-1.5 border border-indigo-200 bg-white rounded text-xs outline-none focus:border-indigo-500 placeholder-indigo-300 resize-none"
                  />
                  {(mcq.statements || []).length > 0 && (
                    <div className="space-y-1">
                      {mcq.statements!.map((statement, statementIndex) => (
                        <div key={statementIndex} className="flex items-start gap-1 bg-white/70 p-1 rounded border border-indigo-50">
                          <span className="text-[10px] font-black text-indigo-500 pt-1">{statementIndex + 1}.</span>
                          <span className="flex-1 text-[11px] text-slate-700 font-medium leading-snug">{statement}</span>
                          <button type="button" onClick={() => removeStatement(index, statementIndex)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {mcq.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-start gap-1">
                      <input
                        type="radio"
                        name={`coaching-mcq-answer-${mcq.id}`}
                        checked={mcq.correctAnswer === optionIndex}
                        onChange={() => updateItem(index, { correctAnswer: optionIndex })}
                        className="mt-2 shrink-0 accent-emerald-600"
                        aria-label={`Correct option ${String.fromCharCode(65 + optionIndex)}`}
                      />
                      <textarea
                        value={option}
                        onChange={e => updateOption(index, optionIndex, e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded text-[11px] outline-none min-h-[36px] resize-y focus:border-emerald-500"
                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                      />
                    </div>
                  ))}
                </div>
                <textarea
                  value={mcq.explanation || ''}
                  onChange={e => updateItem(index, { explanation: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-[11px] outline-none min-h-[55px] resize-y focus:border-emerald-500"
                  placeholder="Explanation (optional)"
                />
                <p className="text-[9px] text-slate-500">✓ Sahi answer ke saamne radio select karein</p>
              </div>
            )}
          </div>
        );
      })}

      {!compact && items.length === 0 && (
        <p className="text-[10px] text-slate-500 text-center py-2">Add MCQ ya Bulk Paste se questions add karein.</p>
      )}
    </div>
  );
}

export default CoachingMcqEditor;