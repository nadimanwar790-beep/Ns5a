export interface EnglishThoughtItem {
  id: string;
  text: string;
  author: string;
  category: "top_ranker" | "high_achiever" | "rising_star" | "encouragement" | "discipline" | "wisdom";
}

export interface PosterLeaderCard {
  role: string;
  name: string;
  qualification: string;
  photoUrl?: string;
}

export interface SchoolPosterConfig {
  mode: "auto" | "upload";
  uploadedImageUrl: string;
  imageFit: "cover" | "contain";
  theme: "indigo_gold" | "emerald_gold" | "crimson_royal" | "vibrant_campus";
  tagline: string;
  admissionBadge: string;
  headline: string;
  subHeadline: string;
  curriculumLine: string;
  classRangeBadge: string;
  featuresTitle: string;
  highlights: string[];
  leadershipStrip: PosterLeaderCard[];
  bottomMotto: string;
  footerNote: string;
  // Student Honor + Thoughts Card (Page 2 Right) Enhancements
  showLeadershipOnThoughts: boolean;
  principalPhotoUrl: string;
  directorPhotoUrl: string;
  principalHonorName: string;
  directorHonorName: string;
  showErpAppQrOnThoughts: boolean;
  erpAppTitle: string;
  erpAppFeatures: string[];
  erpAppStepNote: string;
}

export interface StudentCutoutSettings {
  cutoutDataUrl: string;
  sensitivity: number;
  zoom: number;
  offsetY: number;
}

export const PRESET_HINDI_CBSE_HIGHLIGHTS: string[] = [
  "सभी विषयों की पढ़ाई अंग्रेजी माध्यम व CBSE पैटर्न पर",
  "अनुभवी, प्रशिक्षित एवं योग्य शिक्षकगण द्वारा शिक्षण",
  "आधुनिक, सुरक्षित भवन एवं स्वच्छ शैक्षणिक वातावरण",
  "पूरे स्कूल परिसर में CCTV कैमरे से सुरक्षा व्यवस्था",
  "खेलकूद के लिए पार्क एवं खेल-मैदान की उचित व्यवस्था",
  "स्मार्ट क्लासरूम, कम्प्यूटर शिक्षा व Science Lab सुविधा",
  "सुरक्षित स्कूल वैन / ट्रांसपोर्ट की सुविधा उपलब्ध",
  "कक्षा VI से X तक NCERT Book से विशेष पढ़ाई व्यवस्था",
  "विद्यार्थियों के लिए प्रतिदिन शुद्ध R.O. पेयजल व्यवस्था",
  "विद्यालय समय के बाद कमजोर छात्रों हेतु अतिरिक्त कक्षाएं",
  "विद्यार्थी एवं शिक्षक का आदर्श अनुपात 30:1",
  "शैक्षणिक भ्रमण (Educational Tour) व सर्वांगीण विकास",
];

export const PRESET_ENGLISH_CBSE_HIGHLIGHTS: string[] = [
  "100% English Medium CBSE Pattern Curriculum",
  "Experienced, Trained & CTET/STET Qualified Faculty",
  "Safe, Clean & Disciplined Modern School Campus",
  "24x7 CCTV Camera Surveillance Across All Classrooms",
  "Dedicated Playground & Indoor/Outdoor Sports Facilities",
  "Smart Classrooms, Computer Education & Science Lab",
  "Safe GPS-Tracked School Van & Transport Facility",
  "NCERT Concept Mastery Program from Class VI to X",
  "Pure R.O. Drinking Water & Hygienic Campus Care",
  "Extra Remedial Classes & Daily Personal Attention",
  "Balanced 30:1 Student-Teacher Ratio for Quality Learning",
  "Annual Educational Tours, Olympiads & Cultural Events",
];

export const DEFAULT_POSTER_CONFIG: SchoolPosterConfig = {
  mode: "auto",
  uploadedImageUrl: "",
  imageFit: "cover",
  theme: "vibrant_campus",
  tagline: "Discipline, Devotion, Dedication",
  admissionBadge: "ADMISSIONS OPEN • SESSION 2026-27",
  headline: "SHAPING BRIGHT FUTURES WITH DISCIPLINE & EXCELLENCE",
  subHeadline: "A Complete English Medium School Based on CBSE Curriculum",
  curriculumLine: "A complete English Medium School Based on CBSE Curriculum",
  classRangeBadge: "Class : Nursery to X (CBSE BOARD)",
  featuresTitle: "हमारी विशेषताएँ • KEY SCHOOL HIGHLIGHTS",
  highlights: PRESET_HINDI_CBSE_HIGHLIGHTS,
  leadershipStrip: [
    {
      role: "Principal",
      name: "Shahid Hussain Khan",
      qualification: "M.A (English Hons.) + B.Ed • CTET + STET Qualified",
    },
    {
      role: "Manager",
      name: "Vikash Kumar",
      qualification: "M.Sc. (Physics Hons.) + B.Ed • CTET + STET Qualified",
    },
    {
      role: "Director",
      name: "Md. Ehsan Hussain",
      qualification: "M.Sc. (Maths Hons.) + B.Ed • CTET + STET Qualified",
    },
  ],
  bottomMotto: "Bright Future... Together...",
  footerNote: "Visit School Office for Admission Enquiry & Campus Tour",
  showLeadershipOnThoughts: true,
  principalPhotoUrl: "",
  directorPhotoUrl: "",
  principalHonorName: "",
  directorHonorName: "",
  showErpAppQrOnThoughts: true,
  erpAppTitle: "SCHOOL ERP MOBILE APP",
  erpAppFeatures: [
    "Live Study Track & Homework: Daily homework, class notes, syllabus progress & marks.",
    "Live Attendance & Face ID Alerts: Instant IN/OUT alerts & monthly attendance record.",
    "Live School Bus GPS Tracking: Real-time van/bus route location & pickup/drop alerts.",
    "Monthly Fee Alerts & Online Pay: Due reminders, online fee payment & digital receipts.",
    "Live Events, Notices & Result PDF: School circulars, admit card & digital marksheet.",
    "School Store & Online Admission: Order books/uniforms & apply for instant admission.",
  ],
  erpAppStepNote: "How to Start: 1. Scan QR to Download App → 2. Create Parent/Student Account → 3. Scan Student ID Card QR Code to Link Profile",
};

export const ENGLISH_THOUGHTS_BANK: EnglishThoughtItem[] = [
  // Top Ranker (Rank 1-3 / 90%+)
  {
    id: "tr_1",
    category: "top_ranker",
    text: "Excellence is never an accident; it is always the result of sincere effort and intelligent direction.",
    author: "Aristotle",
  },
  {
    id: "tr_2",
    category: "top_ranker",
    text: "Your dedication today has built a shining milestone; keep reaching higher with humility and curiosity.",
    author: "Academic Honor",
  },
  {
    id: "tr_3",
    category: "top_ranker",
    text: "True toppers do not just master textbooks; they lead with character, kindness, and lifelong learning.",
    author: "School Merit Roll",
  },
  {
    id: "tr_4",
    category: "top_ranker",
    text: "Success is sweetest when earned through steady focus, honest hard work, and respect for teachers.",
    author: "Principal's Desk",
  },
  {
    id: "tr_5",
    category: "top_ranker",
    text: "Great achievements begin with daily discipline. Stay humble in victory and hungry for new knowledge.",
    author: "Scholar's Creed",
  },
  {
    id: "tr_6",
    category: "top_ranker",
    text: "Standing at the top is a proud moment; staying curious is what turns talent into greatness.",
    author: "Honor Citation",
  },
  {
    id: "tr_7",
    category: "top_ranker",
    text: "Let this brilliant rank be your stepping stone toward even bigger dreams and noble service.",
    author: "Faculty Blessing",
  },
  {
    id: "tr_8",
    category: "top_ranker",
    text: "Champions are made when preparation meets determination day after day in the classroom.",
    author: "Merit Note",
  },

  // High Achiever (75%-89%)
  {
    id: "ha_1",
    category: "high_achiever",
    text: "Success is the sum of small, consistent efforts repeated with focus day in and day out.",
    author: "Robert Collier",
  },
  {
    id: "ha_2",
    category: "high_achiever",
    text: "You have built a strong foundation of knowledge; one extra step of focus will take you to the very top.",
    author: "Academic Advisor",
  },
  {
    id: "ha_3",
    category: "high_achiever",
    text: "Discipline turns good abilities into remarkable achievements. Keep shining with confidence.",
    author: "Mentor's Note",
  },
  {
    id: "ha_4",
    category: "high_achiever",
    text: "Every hour spent learning with patience adds lasting strength to your bright future.",
    author: "Progress Insight",
  },
  {
    id: "ha_5",
    category: "high_achiever",
    text: "Aim higher with every term—your steady progress proves you are capable of extraordinary results.",
    author: "Class Teacher",
  },
  {
    id: "ha_6",
    category: "high_achiever",
    text: "Knowledge grows sharpest when paired with curiosity, neat presentation, and daily revision.",
    author: "Study Wisdom",
  },
  {
    id: "ha_7",
    category: "high_achiever",
    text: "Believe in your strengths, polish your skills daily, and the best ranks will follow naturally.",
    author: "Principal's Note",
  },

  // Rising Star (60%-74% or positive growth)
  {
    id: "rs_1",
    category: "rising_star",
    text: "Steady progress is the surest path to greatness. Every step forward builds lasting confidence.",
    author: "Growth Mindset",
  },
  {
    id: "rs_2",
    category: "rising_star",
    text: "Do not compare your pace with others—compete with yesterday and celebrate every upward step.",
    author: "Student Inspiration",
  },
  {
    id: "rs_3",
    category: "rising_star",
    text: "Behind every rising star is quiet persistence, regular practice, and a willingness to improve.",
    author: "Academic Council",
  },
  {
    id: "rs_4",
    category: "rising_star",
    text: "You are closer to excellence than you think—consistent revision will unlock your true potential.",
    author: "Class Mentor",
  },
  {
    id: "rs_5",
    category: "rising_star",
    text: "Learning is a journey of curiosity; keep asking questions and your grades will soar even higher.",
    author: "Faculty Note",
  },
  {
    id: "rs_6",
    category: "rising_star",
    text: "Small improvements every week create remarkable transformations by the end of the session.",
    author: "Smart Study",
  },
  {
    id: "rs_7",
    category: "rising_star",
    text: "Confidence grows each time you turn a difficult chapter into your favorite strength.",
    author: "Teacher's Blessing",
  },

  // Encouragement (<60% or needs support)
  {
    id: "en_1",
    category: "encouragement",
    text: "Every expert was once a beginner who kept trying until the lessons became clear.",
    author: "Helen Hayes",
  },
  {
    id: "en_2",
    category: "encouragement",
    text: "A report card is only a checkpoint, never a limit—your brightest chapters are still ahead of you.",
    author: "Principal's Encouragement",
  },
  {
    id: "en_3",
    category: "encouragement",
    text: "Mistakes are proof that you are learning. Rise with fresh determination and daily practice.",
    author: "Growth Spirit",
  },
  {
    id: "en_4",
    category: "encouragement",
    text: "Strength does not come from winning every time; it comes from never giving up when things feel tough.",
    author: "Courage Note",
  },
  {
    id: "en_5",
    category: "encouragement",
    text: "With regular attendance, focused revision, and self-belief, every weak subject can become a strength.",
    author: "Academic Mentor",
  },
  {
    id: "en_6",
    category: "encouragement",
    text: "Start where you are, use what you learn each day, and watch your confidence blossom.",
    author: "Arthur Ashe",
  },
  {
    id: "en_7",
    category: "encouragement",
    text: "Great oaks grow from patient seeds; keep nurturing your daily habits with courage.",
    author: "Wisdom Line",
  },

  // Discipline & Attendance
  {
    id: "di_1",
    category: "discipline",
    text: "Showing up regularly with a positive attitude is the silent secret behind every confident learner.",
    author: "Discipline Honor",
  },
  {
    id: "di_2",
    category: "discipline",
    text: "Punctuality and classroom attentiveness build habits that bring success far beyond school exams.",
    author: "Character Citation",
  },
  {
    id: "di_3",
    category: "discipline",
    text: "Respect for time, teachers, and books shapes a mind ready to conquer any challenge.",
    author: "School Values",
  },
  {
    id: "di_4",
    category: "discipline",
    text: "Consistent attendance keeps every concept connected—stay regular and stay unstoppable.",
    author: "Attendance Merit",
  },
  {
    id: "di_5",
    category: "discipline",
    text: "Good manners, neat habits, and steady presence make a student admired by all.",
    author: "Moral Education",
  },

  // Universal Wisdom
  {
    id: "wi_1",
    category: "wisdom",
    text: "Education is the most powerful weapon you can use to build a brighter, kinder world.",
    author: "Nelson Mandela",
  },
  {
    id: "wi_2",
    category: "wisdom",
    text: "Dream big, work honestly, stay kind, and never stop being proud of how far you have come.",
    author: "Annual Wishes",
  },
  {
    id: "wi_3",
    category: "wisdom",
    text: "Roots of education grow deeper with patience, and its fruits shine through a lifetime of wisdom.",
    author: "Aristotle",
  },
  {
    id: "wi_4",
    category: "wisdom",
    text: "Believe in yourself and all that you are—there is something inside you greater than any obstacle.",
    author: "Christian Larson",
  },
  {
    id: "wi_5",
    category: "wisdom",
    text: "A curious mind and a grateful heart are the finest ornaments any student can wear.",
    author: "Campus Motto",
  },
];

export function getTop10ThoughtsForStudent(params: {
  overallPct: number;
  classRankNum: number;
  attendancePct: number;
  hasFail?: boolean;
}): {
  tierLabel: string;
  top10: EnglishThoughtItem[];
  defaultSelectedIds: string[];
} {
  const { overallPct, classRankNum, attendancePct, hasFail } = params;

  let primaryCat: EnglishThoughtItem["category"] = "rising_star";
  let secondaryCat: EnglishThoughtItem["category"] = "high_achiever";
  let tierLabel = "Rising Scholar (60%–74%)";

  if (!hasFail && (classRankNum <= 3 || overallPct >= 88)) {
    primaryCat = "top_ranker";
    secondaryCat = "high_achiever";
    tierLabel = classRankNum <= 3 ? `Top Merit Rank #${classRankNum}` : `Distinction Achiever (${overallPct.toFixed(0)}%)`;
  } else if (!hasFail && overallPct >= 75) {
    primaryCat = "high_achiever";
    secondaryCat = "top_ranker";
    tierLabel = `High Achiever (${overallPct.toFixed(0)}%)`;
  } else if (!hasFail && overallPct >= 58) {
    primaryCat = "rising_star";
    secondaryCat = "high_achiever";
    tierLabel = `Steady Growth (${overallPct.toFixed(0)}%)`;
  } else {
    primaryCat = "encouragement";
    secondaryCat = "rising_star";
    tierLabel = "Encouragement & Comeback";
  }

  const primary = ENGLISH_THOUGHTS_BANK.filter(t => t.category === primaryCat);
  const discipline = ENGLISH_THOUGHTS_BANK.filter(t => t.category === "discipline");
  const secondary = ENGLISH_THOUGHTS_BANK.filter(t => t.category === secondaryCat);
  const wisdom = ENGLISH_THOUGHTS_BANK.filter(t => t.category === "wisdom");

  const ranked: EnglishThoughtItem[] = [];
  const pushUnique = (item?: EnglishThoughtItem) => {
    if (item && !ranked.some(r => r.id === item.id)) ranked.push(item);
  };

  // Interleave best 4 primary + 2 discipline (if high attendance, prioritize discipline earlier) + 2 secondary + 2 wisdom = Top 10
  primary.slice(0, 4).forEach(pushUnique);
  if (attendancePct >= 80) {
    discipline.slice(0, 2).forEach(pushUnique);
    wisdom.slice(0, 2).forEach(pushUnique);
    secondary.slice(0, 2).forEach(pushUnique);
  } else {
    secondary.slice(0, 2).forEach(pushUnique);
    wisdom.slice(0, 2).forEach(pushUnique);
    discipline.slice(0, 2).forEach(pushUnique);
  }

  // Top up to 10 from remaining pool if needed
  [...primary.slice(4), ...secondary, ...wisdom, ...discipline].forEach(item => {
    if (ranked.length < 10) pushUnique(item);
  });

  const top10 = ranked.slice(0, 10);
  const defaultSelectedIds = top10.slice(0, 6).map(t => t.id);

  return { tierLabel, top10, defaultSelectedIds };
}

/**
 * Client-side edge-aware background remover:
 * Flood-fills connected outer background pixels similar to the border palette
 * and converts them into pure #FFFFFF white with smooth shoulder/hair feathering,
 * keeping the student's body & face crisp and clean.
 */
export async function removeBackgroundToWhiteDataUrl(
  imageSrc: string,
  sensitivity = 36
): Promise<string> {
  if (!imageSrc || typeof document === "undefined") return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    if (!imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      try {
        const maxDim = 560;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(24, Math.round((img.width || 300) * scale));
        const h = Math.max(24, Math.round((img.height || 360) * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Collect border color clusters from top, left, right edges (avoid bottom shirt edge)
        const borderSamples: Array<[number, number, number]> = [];
        const addSample = (x: number, y: number) => {
          const i = (y * w + x) * 4;
          if (data[i + 3] > 20) {
            borderSamples.push([data[i], data[i + 1], data[i + 2]]);
          }
        };

        const stepX = Math.max(1, Math.floor(w / 18));
        const stepY = Math.max(1, Math.floor(h / 18));
        for (let x = 0; x < w; x += stepX) {
          addSample(x, 1);
          addSample(x, 3);
        }
        for (let y = 0; y < Math.floor(h * 0.72); y += stepY) {
          addSample(1, y);
          addSample(w - 2, y);
        }

        if (borderSamples.length === 0) {
          resolve(imageSrc);
          return;
        }

        // Compute median-like representative top-left / top-right / top colors (up to 6 clusters)
        const palette: Array<[number, number, number]> = [];
        for (const s of borderSamples) {
          const close = palette.some(
            p => Math.abs(p[0] - s[0]) + Math.abs(p[1] - s[1]) + Math.abs(p[2] - s[2]) < 45
          );
          if (!close) {
            palette.push(s);
            if (palette.length >= 8) break;
          }
        }

        const colorDist = (r: number, g: number, b: number) => {
          let minD = 9999;
          for (let k = 0; k < palette.length; k++) {
            const p = palette[k];
            const dr = r - p[0];
            const dg = g - p[1];
            const db = b - p[2];
            const d = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.75;
            if (d < minD) minD = d;
          }
          return minD;
        };

        // Center safety shield so inner face/chest is never accidentally eaten even if light-colored shirt matches wall
        const cx = w * 0.5;
        const cy = h * 0.44;
        const innerRx = w * 0.16;
        const innerRy = h * 0.20;

        const tol = Math.max(14, Math.min(95, sensitivity));
        const visited = new Uint8Array(w * h);
        const isBg = new Uint8Array(w * h);

        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const trySeed = (x: number, y: number) => {
          const idx = y * w + x;
          if (visited[idx]) return;
          const p = idx * 4;
          if (data[p + 3] < 25 || colorDist(data[p], data[p + 1], data[p + 2]) <= tol * 1.15) {
            visited[idx] = 1;
            isBg[idx] = 1;
            queue[tail++] = idx;
          }
        };

        for (let x = 0; x < w; x++) {
          trySeed(x, 0);
          trySeed(x, 1);
        }
        for (let y = 0; y < Math.floor(h * 0.85); y++) {
          trySeed(0, y);
          trySeed(w - 1, y);
        }

        while (head < tail) {
          const idx = queue[head++];
          const x = idx % w;
          const y = (idx - x) / w;

          const neighbors = [
            x > 0 ? idx - 1 : -1,
            x < w - 1 ? idx + 1 : -1,
            y > 0 ? idx - w : -1,
            y < h - 1 ? idx + w : -1,
          ];

          for (let n = 0; n < 4; n++) {
            const nIdx = neighbors[n];
            if (nIdx < 0 || visited[nIdx]) continue;
            visited[nIdx] = 1;

            const nx = nIdx % w;
            const ny = (nIdx - nx) / w;
            // Protect central face/torso core
            const dx = (nx - cx) / innerRx;
            const dy = (ny - cy) / innerRy;
            if (dx * dx + dy * dy < 1) continue;

            const np = nIdx * 4;
            const dist = colorDist(data[np], data[np + 1], data[np + 2]);
            if (data[np + 3] < 25 || dist <= tol) {
              isBg[nIdx] = 1;
              queue[tail++] = nIdx;
            }
          }
        }

        // Convert background pixels to pure white (#FFFFFF) with 1px soft feathering on foreground edges
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const p = idx * 4;
            if (isBg[idx]) {
              data[p] = 255;
              data[p + 1] = 255;
              data[p + 2] = 255;
              data[p + 3] = 255;
            } else {
              // Count adjacent background neighbors for subtle anti-aliased edge blend
              let bgAdj = 0;
              if (x > 0 && isBg[idx - 1]) bgAdj++;
              if (x < w - 1 && isBg[idx + 1]) bgAdj++;
              if (y > 0 && isBg[idx - w]) bgAdj++;
              if (y < h - 1 && isBg[idx + w]) bgAdj++;
              if (bgAdj > 0) {
                const blend = Math.min(0.42, bgAdj * 0.14);
                data[p] = Math.round(data[p] * (1 - blend) + 255 * blend);
                data[p + 1] = Math.round(data[p + 1] * (1 - blend) + 255 * blend);
                data[p + 2] = Math.round(data[p + 2] * (1 - blend) + 255 * blend);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

const posterStorageKey = (schoolId: string) => `nst_marksheet_poster_${schoolId || "default"}`;
const thoughtsStorageKey = (schoolId: string) => `nst_marksheet_thoughts_${schoolId || "default"}`;
const cutoutsStorageKey = (schoolId: string) => `nst_marksheet_cutouts_${schoolId || "default"}`;

export function loadSavedPosterConfig(schoolId: string): SchoolPosterConfig {
  try {
    const raw = localStorage.getItem(posterStorageKey(schoolId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_POSTER_CONFIG,
        ...parsed,
        highlights: Array.isArray(parsed.highlights) && parsed.highlights.length > 0 ? parsed.highlights : DEFAULT_POSTER_CONFIG.highlights,
        leadershipStrip: Array.isArray(parsed.leadershipStrip) && parsed.leadershipStrip.length > 0 ? parsed.leadershipStrip : DEFAULT_POSTER_CONFIG.leadershipStrip,
        erpAppFeatures: Array.isArray(parsed.erpAppFeatures) && parsed.erpAppFeatures.length > 0 ? parsed.erpAppFeatures : DEFAULT_POSTER_CONFIG.erpAppFeatures,
      };
    }
  } catch {}
  return DEFAULT_POSTER_CONFIG;
}

export const DEFAULT_ERP_APP_DOWNLOAD_URL =
  "https://www.mediafire.com/file/izwctjhm11r4pcd/DOC-20261109-WA0000.apk/file";

export function buildSafeErpAppQrUrl(erpAppUrl?: string, _schoolId?: string): string {
  const trimmed = (erpAppUrl || "").trim();
  if (trimmed && trimmed.length <= 1000) return trimmed;
  if (trimmed.length > 1000) return trimmed.slice(0, 1000);
  return DEFAULT_ERP_APP_DOWNLOAD_URL;
}

export function savePosterConfig(schoolId: string, config: SchoolPosterConfig): void {
  try {
    localStorage.setItem(posterStorageKey(schoolId), JSON.stringify(config));
  } catch {}
}

export function loadSavedStudentThoughtsMap(schoolId: string): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(thoughtsStorageKey(schoolId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveStudentThoughtsMap(schoolId: string, map: Record<string, string[]>): void {
  try {
    localStorage.setItem(thoughtsStorageKey(schoolId), JSON.stringify(map));
  } catch {}
}

export function loadSavedCutoutsMap(schoolId: string): Record<string, StudentCutoutSettings> {
  try {
    const raw = localStorage.getItem(cutoutsStorageKey(schoolId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveCutoutsMap(schoolId: string, map: Record<string, StudentCutoutSettings>): void {
  try {
    localStorage.setItem(cutoutsStorageKey(schoolId), JSON.stringify(map));
  } catch {}
}
