import { jsPDF } from "jspdf";
import type { AttendanceRecord, SchoolStudent } from "../school-types";

export interface MatrixPdfSection {
  className: string;
  month: string; // YYYY-MM
  students: SchoolStudent[];
  records: AttendanceRecord[];
}

export interface MatrixPdfOptions {
  schoolName?: string;
  filename: string;
  sections: MatrixPdfSection[];
}

const WEEKDAYS_2 = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const hasNonLatin1 = (text: string): boolean => /[^\u0000-\u00FF]/.test(text);

const unicodeCache = new Map<string, { dataUrl: string; aspect: number }>();

function renderUnicodeToDataUrl(
  text: string,
  opts: { fontSizePx: number; bold?: boolean; color: string; align?: "left" | "center" | "right" }
): { dataUrl: string; aspect: number } | null {
  if (typeof document === "undefined") return null;
  const key = `${text}|${opts.fontSizePx}|${opts.bold ? 1 : 0}|${opts.color}`;
  const cached = unicodeCache.get(key);
  if (cached) return cached;

  try {
    const scale = 3;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const font = `${opts.bold ? "700" : "500"} ${opts.fontSizePx * scale}px system-ui, -apple-system, "Noto Sans Devanagari", "Segoe UI", sans-serif`;
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const w = Math.max(8, Math.ceil(metrics.width + 6 * scale));
    const h = Math.max(12, Math.ceil(opts.fontSizePx * 1.45 * scale));

    canvas.width = w;
    canvas.height = h;
    ctx.font = font;
    ctx.fillStyle = opts.color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(text, 2 * scale, h / 2 + 1);

    const dataUrl = canvas.toDataURL("image/png");
    const res = { dataUrl, aspect: w / h };
    unicodeCache.set(key, res);
    return res;
  } catch {
    return null;
  }
}

function drawTextSafe(
  pdf: jsPDF,
  rawText: string,
  x: number,
  yBaseline: number,
  opts: {
    fontSize?: number;
    bold?: boolean;
    color?: [number, number, number];
    align?: "left" | "center" | "right";
    maxWidth?: number;
  } = {}
) {
  const fontSize = opts.fontSize ?? 8;
  const bold = opts.bold ?? false;
  const color = opts.color ?? [15, 23, 42];
  const align = opts.align ?? "left";
  const maxWidth = opts.maxWidth;

  let text = String(rawText ?? "");
  if (!text) return;

  if (hasNonLatin1(text)) {
    const colorHex = `rgb(${color[0]},${color[1]},${color[2]})`;
    const rendered = renderUnicodeToDataUrl(text, {
      fontSizePx: Math.round(fontSize * 1.35),
      bold,
      color: colorHex,
    });
    if (rendered) {
      const hMm = fontSize * 0.42;
      let wMm = hMm * rendered.aspect;
      let finalHMm = hMm;
      if (maxWidth && wMm > maxWidth) {
        const ratio = maxWidth / wMm;
        wMm = maxWidth;
        finalHMm = hMm * ratio;
      }
      let drawX = x;
      if (align === "center") drawX = x - wMm / 2;
      else if (align === "right") drawX = x - wMm;
      const drawY = yBaseline - finalHMm * 0.78;
      pdf.addImage(rendered.dataUrl, "PNG", drawX, drawY, wMm, finalHMm);
      return;
    }
  }

  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(fontSize);
  pdf.setTextColor(color[0], color[1], color[2]);

  if (maxWidth && pdf.getTextWidth(text) > maxWidth) {
    while (text.length > 1 && pdf.getTextWidth(text + "…") > maxWidth) {
      text = text.slice(0, -1);
    }
    text = text.length > 0 ? text + "…" : "";
  }

  pdf.text(text, x, yBaseline, { align });
}

const formatMonthTitle = (monthStr: string): string => {
  try {
    const [y, m] = monthStr.split("-").map(Number);
    if (!y || !m) return monthStr;
    return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
};

export function generateAttendanceMatrixPdf(options: MatrixPdfOptions): {
  totalPages: number;
  filename: string;
} {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN_X = 7;
  const USABLE_W = PAGE_W - MARGIN_X * 2; // 283mm
  const BOTTOM_LIMIT_Y = PAGE_H - 13; // 197mm

  const ROLL_W = 9;
  const DAY_W = 5.75; // 31 * 5.75 = 178.25mm
  const RUN_W = 11;
  const P_W = 11;
  const L_W = 11;
  const A_W = 11;
  const PCT_W = 12.75;
  const SUMMARY_W = RUN_W + P_W + L_W + A_W + PCT_W; // 56.75mm

  const HEADER_BAR_H = 16;
  const TABLE_HEADER_H = 9;
  const ROW_H = 5.5;

  let isFirstPageOverall = true;

  const validSections = options.sections.length > 0 ? options.sections : [];

  for (const section of validSections) {
    const [yStr, mStr] = section.month.split("-");
    const yr = parseInt(yStr, 10) || new Date().getFullYear();
    const mn = parseInt(mStr, 10) || 1;
    const daysInMonth = new Date(yr, mn, 0).getDate();
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const NAME_W = USABLE_W - ROLL_W - daysArr.length * DAY_W - SUMMARY_W;

    // Deduplicate monthly records by date
    const recordByDate = new Map<string, AttendanceRecord>();
    section.records.forEach((rec) => {
      const d = String(rec?.date || "");
      if (d.startsWith(section.month)) {
        recordByDate.set(d, rec);
      }
    });
    const schoolRunningDays = recordByDate.size;

    const sortedStudents = [...section.students].sort((a, b) => {
      const rA = parseInt(String(a.rollNo || "0"), 10);
      const rB = parseInt(String(b.rollNo || "0"), 10);
      if (Number.isFinite(rA) && Number.isFinite(rB) && rA !== rB) return rA - rB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    const drawPageChrome = (isContinuation: boolean) => {
      if (!isFirstPageOverall) {
        pdf.addPage("a4", "landscape");
      }
      isFirstPageOverall = false;

      const yTop = 6.5;

      // Top Header Banner
      pdf.setFillColor(15, 23, 42); // Slate 900
      pdf.roundedRect(MARGIN_X, yTop, USABLE_W, HEADER_BAR_H, 2, 2, "F");

      const schoolTitle = options.schoolName?.trim() || "School Attendance Register";
      drawTextSafe(pdf, schoolTitle, MARGIN_X + 4, yTop + 6.2, {
        fontSize: 11.5,
        bold: true,
        color: [255, 255, 255],
        maxWidth: 155,
      });

      const subTitle = `${section.className}  |  ${formatMonthTitle(section.month)}${isContinuation ? "  (Continued)" : ""}`;
      drawTextSafe(pdf, subTitle, MARGIN_X + 4, yTop + 12.2, {
        fontSize: 8.5,
        bold: false,
        color: [203, 213, 225],
        maxWidth: 165,
      });

      // Right Stats Chips in Header
      const statX = MARGIN_X + USABLE_W - 4;
      drawTextSafe(
        pdf,
        `Students: ${sortedStudents.length}   |   School Running Days: ${schoolRunningDays}`,
        statX,
        yTop + 6.5,
        {
          fontSize: 8.5,
          bold: true,
          color: [110, 231, 183], // Emerald 300
          align: "right",
        }
      );
      drawTextSafe(
        pdf,
        `A4 Landscape 31-Day Matrix`,
        statX,
        yTop + 12.2,
        {
          fontSize: 7.2,
          color: [148, 163, 184],
          align: "right",
        }
      );

      // Table Header Row
      const thY = yTop + HEADER_BAR_H + 2;
      let curX = MARGIN_X;

      // Roll Header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(curX, thY, ROLL_W, TABLE_HEADER_H, "F");
      drawTextSafe(pdf, "Roll", curX + ROLL_W / 2, thY + 5.7, {
        fontSize: 7.2,
        bold: true,
        color: [255, 255, 255],
        align: "center",
      });
      curX += ROLL_W;

      // Student Name Header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(curX, thY, NAME_W, TABLE_HEADER_H, "F");
      drawTextSafe(pdf, "Student Name", curX + 2, thY + 5.7, {
        fontSize: 7.5,
        bold: true,
        color: [255, 255, 255],
      });
      curX += NAME_W;

      // Days 1..daysInMonth Header
      daysArr.forEach((d) => {
        const dow = new Date(yr, mn - 1, d).getDay();
        const isSun = dow === 0;
        if (isSun) {
          pdf.setFillColor(146, 64, 14); // Amber 800
        } else {
          pdf.setFillColor(30, 41, 59);
        }
        pdf.rect(curX, thY, DAY_W, TABLE_HEADER_H, "F");
        drawTextSafe(pdf, String(d), curX + DAY_W / 2, thY + 3.8, {
          fontSize: 6.5,
          bold: true,
          color: isSun ? [254, 243, 199] : [255, 255, 255],
          align: "center",
        });
        drawTextSafe(pdf, WEEKDAYS_2[dow], curX + DAY_W / 2, thY + 7.4, {
          fontSize: 5.2,
          color: isSun ? [253, 230, 138] : [148, 163, 184],
          align: "center",
        });
        curX += DAY_W;
      });

      // Summary Headers: Run, P, L, A, %
      const sumHeaders: Array<{ label: string; w: number; bg: [number, number, number] }> = [
        { label: "Run", w: RUN_W, bg: [51, 65, 85] },
        { label: "P", w: P_W, bg: [6, 95, 70] },
        { label: "L", w: L_W, bg: [146, 64, 14] },
        { label: "A", w: A_W, bg: [159, 18, 57] },
        { label: "%", w: PCT_W, bg: [55, 48, 163] },
      ];
      sumHeaders.forEach((sh) => {
        pdf.setFillColor(sh.bg[0], sh.bg[1], sh.bg[2]);
        pdf.rect(curX, thY, sh.w, TABLE_HEADER_H, "F");
        drawTextSafe(pdf, sh.label, curX + sh.w / 2, thY + 5.7, {
          fontSize: 7.2,
          bold: true,
          color: [255, 255, 255],
          align: "center",
        });
        curX += sh.w;
      });

      // Outer border for table header
      pdf.setDrawColor(100, 116, 139);
      pdf.setLineWidth(0.2);
      pdf.rect(MARGIN_X, thY, USABLE_W, TABLE_HEADER_H, "S");

      // Draw vertical dividers in header
      let gridX = MARGIN_X + ROLL_W;
      pdf.line(gridX, thY, gridX, thY + TABLE_HEADER_H);
      gridX += NAME_W;
      pdf.line(gridX, thY, gridX, thY + TABLE_HEADER_H);
      daysArr.forEach(() => {
        gridX += DAY_W;
        pdf.line(gridX, thY, gridX, thY + TABLE_HEADER_H);
      });
      [RUN_W, P_W, L_W, A_W].forEach((w) => {
        gridX += w;
        pdf.line(gridX, thY, gridX, thY + TABLE_HEADER_H);
      });

      return thY + TABLE_HEADER_H;
    };

    let curY = drawPageChrome(false);

    if (sortedStudents.length === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(MARGIN_X, curY, USABLE_W, 9, "F");
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(MARGIN_X, curY, USABLE_W, 9, "S");
      drawTextSafe(
        pdf,
        `No students enrolled in ${section.className} for ${formatMonthTitle(section.month)}.`,
        MARGIN_X + USABLE_W / 2,
        curY + 5.8,
        { fontSize: 8.5, color: [100, 116, 139], align: "center" }
      );
      continue;
    }

    let totalPresentAll = 0;
    let totalLateAll = 0;
    let totalAbsentAll = 0;
    let totalRecordedAll = 0;

    sortedStudents.forEach((st, idx) => {
      if (curY + ROW_H > BOTTOM_LIMIT_Y) {
        curY = drawPageChrome(true);
      }

      let pCount = 0;
      let lCount = 0;
      let aCount = 0;
      let recordedDays = 0;

      const rowBg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      pdf.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
      pdf.rect(MARGIN_X, curY, USABLE_W, ROW_H, "F");

      let curX = MARGIN_X;

      // Roll
      drawTextSafe(pdf, String(st.rollNo || idx + 1), curX + ROLL_W / 2, curY + 3.8, {
        fontSize: 6.8,
        bold: true,
        color: [71, 85, 105],
        align: "center",
        maxWidth: ROLL_W - 1,
      });
      curX += ROLL_W;

      // Student Name
      drawTextSafe(pdf, String(st.name || "Student"), curX + 1.5, curY + 3.8, {
        fontSize: 7.0,
        bold: true,
        color: [15, 23, 42],
        align: "left",
        maxWidth: NAME_W - 2.5,
      });
      curX += NAME_W;

      // Day Cells
      daysArr.forEach((d) => {
        const dateStr = `${section.month}-${String(d).padStart(2, "0")}`;
        const dow = new Date(yr, mn - 1, d).getDay();
        const isSun = dow === 0;
        const rec = recordByDate.get(dateStr);
        const entry = rec?.students?.[st.id];

        let cellText = "-";
        let fill: [number, number, number] | null = null;
        let textColor: [number, number, number] = [148, 163, 184];
        let isCellBold = false;

        if (rec && entry !== undefined) {
          recordedDays++;
          if (entry.status === "leave") {
            cellText = "LV";
            fill = [219, 234, 254];
            textColor = [29, 78, 216];
            isCellBold = true;
          } else if (entry.status === "bunk") {
            aCount++;
            cellText = "B";
            fill = [243, 232, 255];
            textColor = [126, 34, 206];
            isCellBold = true;
          } else if (entry.present) {
            pCount++;
            if (entry.status === "late") {
              lCount++;
              cellText = "L";
              fill = [254, 243, 199];
              textColor = [180, 83, 9];
              isCellBold = true;
            } else {
              cellText = "P";
              fill = [220, 252, 231];
              textColor = [21, 128, 61];
              isCellBold = true;
            }
          } else {
            aCount++;
            cellText = "A";
            fill = [254, 226, 226];
            textColor = [185, 28, 28];
            isCellBold = true;
          }
        } else if (isSun) {
          cellText = "Su";
          fill = [254, 249, 195];
          textColor = [161, 98, 7];
        }

        if (fill) {
          pdf.setFillColor(fill[0], fill[1], fill[2]);
          pdf.rect(curX, curY, DAY_W, ROW_H, "F");
        }

        drawTextSafe(pdf, cellText, curX + DAY_W / 2, curY + 3.8, {
          fontSize: cellText === "LV" || cellText === "Su" ? 5.6 : 6.4,
          bold: isCellBold,
          color: textColor,
          align: "center",
        });

        curX += DAY_W;
      });

      totalPresentAll += pCount;
      totalLateAll += lCount;
      totalAbsentAll += aCount;
      totalRecordedAll += recordedDays;

      const rowRunDays = recordedDays > 0 ? recordedDays : schoolRunningDays;
      const pct = recordedDays > 0 ? Math.round((pCount / recordedDays) * 100) : 0;

      // Summary cells: Run, P, L, A, %
      pdf.setFillColor(241, 245, 249);
      pdf.rect(curX, curY, RUN_W, ROW_H, "F");
      drawTextSafe(pdf, String(rowRunDays), curX + RUN_W / 2, curY + 3.8, {
        fontSize: 6.8,
        bold: true,
        color: [51, 65, 85],
        align: "center",
      });
      curX += RUN_W;

      pdf.setFillColor(236, 253, 245);
      pdf.rect(curX, curY, P_W, ROW_H, "F");
      drawTextSafe(pdf, String(pCount), curX + P_W / 2, curY + 3.8, {
        fontSize: 6.8,
        bold: true,
        color: [21, 128, 61],
        align: "center",
      });
      curX += P_W;

      pdf.setFillColor(255, 251, 235);
      pdf.rect(curX, curY, L_W, ROW_H, "F");
      drawTextSafe(pdf, String(lCount), curX + L_W / 2, curY + 3.8, {
        fontSize: 6.8,
        bold: true,
        color: [180, 83, 9],
        align: "center",
      });
      curX += L_W;

      pdf.setFillColor(255, 241, 242);
      pdf.rect(curX, curY, A_W, ROW_H, "F");
      drawTextSafe(pdf, String(aCount), curX + A_W / 2, curY + 3.8, {
        fontSize: 6.8,
        bold: true,
        color: [190, 18, 60],
        align: "center",
      });
      curX += A_W;

      pdf.setFillColor(pct >= 75 ? 236 : 255, pct >= 75 ? 253 : 241, pct >= 75 ? 245 : 242);
      pdf.rect(curX, curY, PCT_W, ROW_H, "F");
      drawTextSafe(pdf, `${pct}%`, curX + PCT_W / 2, curY + 3.8, {
        fontSize: 6.8,
        bold: true,
        color: pct >= 75 ? [21, 128, 61] : [190, 18, 60],
        align: "center",
      });

      // Row Grid Lines
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.15);
      pdf.rect(MARGIN_X, curY, USABLE_W, ROW_H, "S");
      let gx = MARGIN_X + ROLL_W;
      pdf.line(gx, curY, gx, curY + ROW_H);
      gx += NAME_W;
      pdf.line(gx, curY, gx, curY + ROW_H);
      daysArr.forEach(() => {
        gx += DAY_W;
        pdf.line(gx, curY, gx, curY + ROW_H);
      });
      [RUN_W, P_W, L_W, A_W].forEach((w) => {
        gx += w;
        pdf.line(gx, curY, gx, curY + ROW_H);
      });

      curY += ROW_H;
    });

    // Totals Summary Row at bottom of class section
    if (curY + 6.5 > BOTTOM_LIMIT_Y) {
      curY = drawPageChrome(true);
    }
    const TOT_H = 6;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(MARGIN_X, curY, USABLE_W, TOT_H, "F");
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.25);
    pdf.rect(MARGIN_X, curY, USABLE_W, TOT_H, "S");

    const labelSpanW = ROLL_W + NAME_W + daysArr.length * DAY_W;
    drawTextSafe(
      pdf,
      `Class Totals (${sortedStudents.length} Students)  ·  School Running Days: ${schoolRunningDays}`,
      MARGIN_X + 3,
      curY + 4.1,
      { fontSize: 7.2, bold: true, color: [15, 23, 42] }
    );

    let tx = MARGIN_X + labelSpanW;
    pdf.line(tx, curY, tx, curY + TOT_H);
    drawTextSafe(pdf, String(schoolRunningDays), tx + RUN_W / 2, curY + 4.1, {
      fontSize: 7.2,
      bold: true,
      color: [15, 23, 42],
      align: "center",
    });
    tx += RUN_W;
    pdf.line(tx, curY, tx, curY + TOT_H);
    drawTextSafe(pdf, String(totalPresentAll), tx + P_W / 2, curY + 4.1, {
      fontSize: 7.2,
      bold: true,
      color: [21, 128, 61],
      align: "center",
    });
    tx += P_W;
    pdf.line(tx, curY, tx, curY + TOT_H);
    drawTextSafe(pdf, String(totalLateAll), tx + L_W / 2, curY + 4.1, {
      fontSize: 7.2,
      bold: true,
      color: [180, 83, 9],
      align: "center",
    });
    tx += L_W;
    pdf.line(tx, curY, tx, curY + TOT_H);
    drawTextSafe(pdf, String(totalAbsentAll), tx + A_W / 2, curY + 4.1, {
      fontSize: 7.2,
      bold: true,
      color: [190, 18, 60],
      align: "center",
    });
    tx += A_W;
    pdf.line(tx, curY, tx, curY + TOT_H);
    const overallPct = totalRecordedAll > 0 ? Math.round((totalPresentAll / totalRecordedAll) * 100) : 0;
    drawTextSafe(pdf, `${overallPct}%`, tx + PCT_W / 2, curY + 4.1, {
      fontSize: 7.2,
      bold: true,
      color: [55, 48, 163],
      align: "center",
    });
  }

  // Stamp clean Legend & Page X of Y footer on every page
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_X, PAGE_H - 9.5, MARGIN_X + USABLE_W, PAGE_H - 9.5);

    drawTextSafe(
      pdf,
      "Legend: P = Present  |  L = Late  |  A = Absent  |  LV = Leave  |  B = Bunk  |  Su = Sunday  |  Run = School Running Days  |  - = Holiday",
      MARGIN_X,
      PAGE_H - 5.2,
      { fontSize: 6.8, color: [100, 116, 139] }
    );

    drawTextSafe(
      pdf,
      `Page ${p} of ${totalPages}`,
      MARGIN_X + USABLE_W,
      PAGE_H - 5.2,
      { fontSize: 7.2, bold: true, color: [51, 65, 85], align: "right" }
    );
  }

  pdf.save(options.filename);
  return { totalPages, filename: options.filename };
}
