import jsPDF from "jspdf";
import { renderHtmlToCanvasSafe } from "./safePdfCapture";
import { FORMAT_DISPLAY_LABEL } from "./entranceTestEngine";
import type { EntranceTestPaperSet, EntranceTestQuestion, School } from "../school-types";

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

const SHARED_PDF_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif;
    background: #ffffff;
    color: #0f172a;
    width: 794px;
  }
  .exam-sheet {
    width: 794px;
    min-height: 1120px;
    padding: 14px 18px 12px 18px;
    background: #ffffff;
    color: #0f172a;
    position: relative;
  }
  .page-header {
    border: 1.5px solid #0f172a;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: #f8fafc;
  }
  .school-title {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.35px;
    color: #0f172a;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .school-sub {
    font-size: 9px;
    color: #475569;
    text-align: center;
    margin-top: 2px;
  }
  .meta-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
    padding-top: 5px;
    border-top: 1px dashed #94a3b8;
    font-size: 9.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .student-strip {
    display: flex;
    gap: 12px;
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid #cbd5e1;
    font-size: 9px;
    color: #1e293b;
  }
  .student-field { flex: 1; border-bottom: 1px dotted #94a3b8; padding-bottom: 1px; }
  .cont-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1.2px solid #0f172a;
    border-radius: 5px;
    background: #f8fafc;
    padding: 5px 10px;
    margin-bottom: 8px;
    font-size: 9.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .cont-school {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.25px;
  }
  .columns-wrap {
    display: table;
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }
  .exam-col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
  }
  .exam-col-left {
    padding-right: 10px;
    border-right: 1px solid #cbd5e1;
  }
  .exam-col-right {
    padding-left: 10px;
  }
  .side-label {
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #475569;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 2px;
    margin-bottom: 4px;
  }
  .q-card {
    border-bottom: 1px dashed #e2e8f0;
    padding: 3px 2px 5px 2px;
    margin-bottom: 4px;
    background: #ffffff;
  }
  .q-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
    font-size: 8px;
    font-weight: 700;
    color: #475569;
  }
  .q-num {
    font-size: 9.5px;
    font-weight: 800;
    color: #0f172a;
  }
  .q-tag {
    background: #f1f5f9;
    color: #334155;
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid #cbd5e1;
    font-size: 7.5px;
  }
  .q-passage {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 8.5px;
    line-height: 1.3;
    color: #334155;
    margin-bottom: 3px;
  }
  .q-text {
    font-size: 9.5px;
    font-weight: 700;
    line-height: 1.3;
    color: #0f172a;
    margin-bottom: 3px;
  }
  .opt-grid {
    width: 100%;
    font-size: 0;
  }
  .opt-grid .opt-item {
    display: inline-block;
    vertical-align: top;
    width: 48.8%;
    margin-right: 2.2%;
    margin-bottom: 2px;
  }
  .opt-grid .opt-item:nth-child(2n) {
    margin-right: 0;
  }
  .opt-grid-single {
    width: 100%;
  }
  .opt-grid-single .opt-item {
    display: block;
    width: 100%;
    margin-bottom: 2px;
  }
  .opt-item {
    font-size: 8.6px;
    line-height: 1.25;
    color: #1e293b;
    padding: 2px 4px;
    border-radius: 3px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  .opt-letter {
    font-weight: 800;
    color: #0f172a;
    margin-right: 3px;
  }
  .key-banner {
    background: #0f172a;
    color: #ffffff;
    border-radius: 6px;
    padding: 9px 14px;
    margin-bottom: 9px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .key-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }
  .key-table th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 800;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
  }
  .key-table td {
    padding: 3.5px 6px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    line-height: 1.28;
    color: #1e293b;
  }
  .key-badge {
    display: inline-block;
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
    border-radius: 3px;
    padding: 0.5px 5px;
    font-weight: 800;
    font-size: 9px;
  }
  .footer-note {
    margin-top: 8px;
    padding-top: 5px;
    border-top: 1px solid #cbd5e1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5px;
    font-weight: 600;
    color: #475569;
  }
`;

function renderQuestionHtml(q: EntranceTestQuestion, index: number): string {
  const maxOptLen = Math.max(...q.options.map((o) => String(o || "").length));
  const useSingleColOpts = maxOptLen > 30;
  return `
    <div class="q-card">
      <div class="q-top">
        <span class="q-num">Q.${index + 1} <span style="font-weight:600;font-size:8px;color:#475569;">(${escapeHtml(q.subject)})</span></span>
        <span class="q-tag">${escapeHtml(FORMAT_DISPLAY_LABEL[q.format] || q.format)} · 1M</span>
      </div>
      ${
        q.passage
          ? `<div class="q-passage"><strong>Passage:</strong> ${escapeHtml(q.passage)}</div>`
          : ""
      }
      <div class="q-text">${escapeHtml(q.question)}</div>
      <div class="${useSingleColOpts ? "opt-grid-single" : "opt-grid"}">
        ${q.options
          .map(
            (opt, oi) =>
              `<div class="opt-item"><span class="opt-letter">(${OPTION_LETTERS[oi]})</span>${escapeHtml(
                opt
              )}</div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function estimateQuestionWeight(q: EntranceTestQuestion): number {
  const maxOptLen = Math.max(...q.options.map((o) => String(o || "").length));
  let w = 1.0;
  if (q.passage) w += Math.ceil(q.passage.length / 80) * 0.45 + 0.3;
  if (q.question.length > 75) w += 0.35;
  if (q.question.length > 140) w += 0.35;
  if (maxOptLen > 30) w += 0.45;
  return w;
}

function paginateQuestionsForA4(questions: EntranceTestQuestion[]): EntranceTestQuestion[][] {
  // Page 1 (with full school masthead): ~20 to 24 MCQs across Side 1 & Side 2
  // Page 2+ (compact school header): ~25 to 30 MCQs across Side 1 & Side 2
  const pages: EntranceTestQuestion[][] = [];
  let current: EntranceTestQuestion[] = [];
  let weight = 0;

  questions.forEach((q, idx) => {
    const isFirstPage = pages.length === 0;
    const maxWeight = isFirstPage ? 24.5 : 29.5;
    const maxCount = isFirstPage ? 24 : 30;
    const itemWeight = estimateQuestionWeight(q);

    if (
      current.length > 0 &&
      (current.length >= maxCount || weight + itemWeight > maxWeight)
    ) {
      pages.push(current);
      current = [];
      weight = 0;
    }
    current.push(q);
    weight += itemWeight;
    if (idx === questions.length - 1 && current.length > 0) {
      pages.push(current);
    }
  });

  return pages;
}

function chunkAnswerRows<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function downloadEntrancePaperPdf(params: {
  school?: Pick<School, "name" | "code" | "address" | "phone"> | null;
  paper: EntranceTestPaperSet;
  mode: "full" | "questions_only";
  studentName?: string;
  scoreSummary?: {
    score: number;
    total: number;
    percentage: number;
    badge: string;
    headline: string;
    isDirectEligible: boolean;
  };
}): Promise<void> {
  const { school, paper, mode, studentName, scoreSummary } = params;
  const schoolName = school?.name || "LIFE MAKER PUBLIC SCHOOL";
  const schoolSub = [school?.address, school?.phone ? `Ph: ${school.phone}` : ""]
    .filter(Boolean)
    .join(" · ");

  const questionPages = paginateQuestionsForA4(paper.questions);
  const totalPart1Pages = questionPages.length;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  const appendCanvasPage = (canvas: HTMLCanvasElement, isFirst: boolean) => {
    if (!isFirst) pdf.addPage();
    const imgData = canvas.toDataURL("image/jpeg", 0.94);
    const ratio = canvas.height / Math.max(1, canvas.width);
    const rawHeightMm = pageWidthMm * ratio;
    const fitScale = rawHeightMm > pageHeightMm ? pageHeightMm / rawHeightMm : 1;
    const drawW = pageWidthMm * fitScale;
    const drawH = rawHeightMm * fitScale;
    const offsetX = (pageWidthMm - drawW) / 2;
    pdf.addImage(imgData, "JPEG", offsetX, 0, drawW, drawH);
  };

  let runningIndex = 0;
  for (let pIdx = 0; pIdx < questionPages.length; pIdx++) {
    const chunk = questionPages[pIdx];
    const startNumber = runningIndex + 1;
    const endNumber = runningIndex + chunk.length;
    const leftCount = Math.ceil(chunk.length / 2);
    const leftItems = chunk.slice(0, leftCount);
    const rightItems = chunk.slice(leftCount);

    const scoreBannerHtml =
      scoreSummary
        ? `
          <div style="margin-top:6px;padding:5px 8px;border-radius:4px;border:1px solid ${
            scoreSummary.isDirectEligible ? "#16a34a" : "#d97706"
          };background:${
            scoreSummary.isDirectEligible ? "#f0fdf4" : "#fffbeb"
          };display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:8.5px;">
            <div>
              <strong style="color:${
                scoreSummary.isDirectEligible ? "#166534" : "#92400e"
              };">${escapeHtml(scoreSummary.badge)}</strong>
              <span style="color:#1e293b;margin-left:6px;">${escapeHtml(scoreSummary.headline)}</span>
            </div>
            <div style="font-weight:800;color:#0f172a;white-space:nowrap;">
              Score: ${scoreSummary.score}/${scoreSummary.total} (${scoreSummary.percentage}%)
            </div>
          </div>
        `
        : "";

    const headerHtml =
      pIdx === 0
        ? `
        <div class="page-header">
          <div class="school-title">${escapeHtml(schoolName)}</div>
          ${schoolSub ? `<div class="school-sub">${escapeHtml(schoolSub)}</div>` : ""}
          <div class="meta-bar">
            <span>ENTRANCE &amp; SCHOLARSHIP EXAM · ${escapeHtml(paper.classLabel.toUpperCase())}</span>
            <span>Code: ${escapeHtml(paper.setId)} · Page 1/${totalPart1Pages}</span>
            <span>Time: ${paper.durationMinutes} Min · Qs: ${paper.totalQuestions} · Marks: ${paper.maxMarks}</span>
          </div>
          <div class="student-strip">
            <div class="student-field"><strong>Student Name:</strong> ${escapeHtml(studentName || "")}</div>
            <div class="student-field"><strong>Mobile / Roll No:</strong> </div>
            <div class="student-field"><strong>Date:</strong> </div>
          </div>
          ${scoreBannerHtml}
        </div>
      `
        : `
        <div class="cont-bar">
          <span class="cont-school">${escapeHtml(schoolName)}</span>
          <span>${escapeHtml(paper.classLabel)} Entrance Test · ${escapeHtml(paper.setId)} (Q.${startNumber}–Q.${endNumber})</span>
          <span>Page ${pIdx + 1} of ${totalPart1Pages}</span>
        </div>
      `;

    const leftHtml = leftItems
      .map((q) => {
        const html = renderQuestionHtml(q, runningIndex);
        runningIndex += 1;
        return html;
      })
      .join("");

    const rightHtml = rightItems
      .map((q) => {
        const html = renderQuestionHtml(q, runningIndex);
        runningIndex += 1;
        return html;
      })
      .join("");

    const pageHtml = `
      <div class="exam-sheet">
        ${headerHtml}
        <div class="columns-wrap">
          <div class="exam-col exam-col-left">
            <div class="side-label">Side 1 · Q.${startNumber} – Q.${startNumber + leftItems.length - 1}</div>
            ${leftHtml}
          </div>
          <div class="exam-col exam-col-right">
            ${
              rightItems.length > 0
                ? `<div class="side-label">Side 2 · Q.${startNumber + leftItems.length} – Q.${endNumber}</div>${rightHtml}`
                : ""
            }
          </div>
        </div>
        <div class="footer-note">
          <span><strong>${escapeHtml(schoolName)}</strong> · ${escapeHtml(paper.classLabel)} (${escapeHtml(paper.setId)})</span>
          <span>All Qs carry 1 mark · No negative marking · Page ${pIdx + 1}/${totalPart1Pages}</span>
        </div>
      </div>
    `;

    const canvas = await renderHtmlToCanvasSafe(pageHtml, SHARED_PDF_CSS, {
      widthPx: 794,
      scale: 2,
      backgroundColor: "#ffffff",
    });
    appendCanvasPage(canvas, pIdx === 0);
  }

  // PART 2: Separate Answer Key Page(s) — School Name on every sheet!
  if (mode === "full") {
    const keyedItems = paper.questions.map((q, idx) => ({ q, qNo: idx + 1 }));
    const keyChunks = chunkAnswerRows(keyedItems, 28);

    for (let kIdx = 0; kIdx < keyChunks.length; kIdx++) {
      const rows = keyChunks[kIdx];
      const keyPageHtml = `
        <div class="exam-sheet">
          <div class="key-banner">
            <div>
              <div style="font-size:13px;font-weight:800;letter-spacing:0.3px;text-transform:uppercase;color:#fde68a;">${escapeHtml(schoolName)}</div>
              <div style="font-size:11.5px;font-weight:800;margin-top:2px;">PART 2: OFFICIAL ANSWER KEY &amp; SOLUTIONS · ${escapeHtml(paper.classLabel)} (${escapeHtml(paper.setId)})</div>
            </div>
            <div style="text-align:right;font-size:9.5px;color:#e2e8f0;font-weight:700;">
              Sheet ${kIdx + 1} / ${keyChunks.length}<br/>Total Qs: ${paper.totalQuestions} · ${paper.durationMinutes} Min
            </div>
          </div>

          <table class="key-table">
            <thead>
              <tr>
                <th style="width:38px;">Q.No</th>
                <th style="width:82px;">Subject</th>
                <th style="width:42px;">Ans</th>
                <th style="width:150px;">Correct Option</th>
                <th>Brief Explanation / Solution</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(({ q, qNo }) => {
                  const letter = OPTION_LETTERS[q.correctIndex] || "A";
                  const optText = q.options[q.correctIndex] || "";
                  return `
                    <tr>
                      <td style="font-weight:800;text-align:center;">Q.${qNo}</td>
                      <td style="font-weight:600;color:#334155;">${escapeHtml(q.subject)}</td>
                      <td style="text-align:center;"><span class="key-badge">${letter}</span></td>
                      <td style="font-weight:700;color:#0f172a;">${escapeHtml(optText)}</td>
                      <td>${escapeHtml(q.explanation)}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>

          <div class="footer-note">
            <span><strong>${escapeHtml(schoolName)}</strong> · Official Answer Key</span>
            <span>${escapeHtml(paper.classLabel)} (${escapeHtml(paper.setId)}) · Sheet ${kIdx + 1}/${keyChunks.length}</span>
          </div>
        </div>
      `;

      const keyCanvas = await renderHtmlToCanvasSafe(keyPageHtml, SHARED_PDF_CSS, {
        widthPx: 794,
        scale: 2,
        backgroundColor: "#ffffff",
      });
      appendCanvasPage(keyCanvas, false);
    }
  }

  const safeCode = (school?.code || schoolName || "SCHOOL")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 18);
  const suffix = mode === "full" ? "Question_And_AnswerKey" : "QuestionPaper";
  pdf.save(`${safeCode}_Class${paper.classLevel}_${paper.setId}_${suffix}.pdf`);
}
