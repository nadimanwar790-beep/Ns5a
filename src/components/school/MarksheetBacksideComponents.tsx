import React, { useState } from "react";
import QRCode from "react-qr-code";
import {
  Sparkles, Upload, Image as ImageIcon, Wand2,
  User, X, RefreshCw, Check, Quote, Award, ShieldCheck, Smartphone, Users
} from "lucide-react";
import type { School, SchoolStudent } from "../../school-types";
import type { SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { cleanLogoUrl, getSavedSchoolLogo } from "./feeReceiptUtils";
import {
  DEFAULT_POSTER_CONFIG,
  ENGLISH_THOUGHTS_BANK,
  PRESET_ENGLISH_CBSE_HIGHLIGHTS,
  PRESET_HINDI_CBSE_HIGHLIGHTS,
  buildSafeErpAppQrUrl,
  getTop10ThoughtsForStudent,
  removeBackgroundToWhiteDataUrl,
  type EnglishThoughtItem,
  type PosterLeaderCard,
  type SchoolPosterConfig,
  type StudentCutoutSettings,
} from "./marksheetBacksideUtils";

interface SchoolPosterHalfCardProps {
  school: School;
  schoolDetails: SchoolHeaderDetails;
  posterConfig: SchoolPosterConfig;
  sessionText: string;
  compactPaSize?: boolean;
}

export const SchoolPosterHalfCard: React.FC<SchoolPosterHalfCardProps> = ({
  school,
  schoolDetails,
  posterConfig,
  sessionText,
  compactPaSize = false,
}) => {
  const logoUrl = getSavedSchoolLogo(schoolDetails.logoUrl, school?.id);

  const themePalette =
    posterConfig.theme === "vibrant_campus"
      ? {
          headerBg: "bg-gradient-to-r from-emerald-900 via-green-800 to-emerald-900",
          taglineBar: "bg-amber-300 text-emerald-950",
          accentBg: "bg-amber-400 text-slate-950",
          borderColor: "border-emerald-900",
          curriculumBg: "bg-rose-700 text-white",
          classPillBg: "bg-indigo-950 text-amber-300",
          sectionTitleBg: "bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-700 text-white",
          highlightBg: "bg-emerald-50/75 border-emerald-200",
          badgeDot: "bg-emerald-700 text-white",
          leaderBg: "bg-gradient-to-b from-emerald-950 to-slate-900 text-white border-amber-400/70",
          mottoBg: "bg-emerald-800 text-amber-300",
        }
      : posterConfig.theme === "emerald_gold"
      ? {
          headerBg: "bg-emerald-950",
          taglineBar: "bg-amber-400 text-emerald-950",
          accentBg: "bg-amber-400 text-emerald-950",
          borderColor: "border-emerald-900",
          curriculumBg: "bg-emerald-800 text-amber-100",
          classPillBg: "bg-slate-900 text-amber-300",
          sectionTitleBg: "bg-emerald-900 text-amber-200",
          highlightBg: "bg-emerald-50/90 border-emerald-200",
          badgeDot: "bg-emerald-700 text-white",
          leaderBg: "bg-emerald-950 text-white border-amber-400/60",
          mottoBg: "bg-emerald-900 text-amber-300",
        }
      : posterConfig.theme === "crimson_royal"
      ? {
          headerBg: "bg-rose-950",
          taglineBar: "bg-amber-400 text-rose-950",
          accentBg: "bg-amber-400 text-rose-950",
          borderColor: "border-rose-900",
          curriculumBg: "bg-rose-800 text-white",
          classPillBg: "bg-slate-950 text-amber-300",
          sectionTitleBg: "bg-rose-900 text-amber-200",
          highlightBg: "bg-rose-50/80 border-rose-200",
          badgeDot: "bg-rose-700 text-white",
          leaderBg: "bg-rose-950 text-white border-amber-400/60",
          mottoBg: "bg-rose-900 text-amber-200",
        }
      : {
          headerBg: "bg-slate-950",
          taglineBar: "bg-amber-400 text-slate-950",
          accentBg: "bg-amber-400 text-slate-950",
          borderColor: "border-slate-900",
          curriculumBg: "bg-indigo-900 text-white",
          classPillBg: "bg-slate-900 text-amber-300",
          sectionTitleBg: "bg-indigo-950 text-amber-200",
          highlightBg: "bg-indigo-50/80 border-indigo-200",
          badgeDot: "bg-indigo-800 text-white",
          leaderBg: "bg-slate-900 text-white border-amber-400/60",
          mottoBg: "bg-indigo-950 text-amber-300",
        };

  if (posterConfig.mode === "upload" && posterConfig.uploadedImageUrl) {
    return (
      <div
        className={`marksheet-poster-card w-full h-full ${compactPaSize ? "min-h-[168mm] print:min-h-0" : "min-h-[164mm] print:min-h-0"} bg-white border-2 border-slate-900 rounded-lg overflow-hidden flex flex-col justify-between box-border`}
      >
        <div className="flex-1 w-full h-full flex items-center justify-center bg-white overflow-hidden">
          <img
            src={posterConfig.uploadedImageUrl}
            alt={`${schoolDetails.schoolName || "School"} Poster`}
            className={`w-full h-full ${posterConfig.imageFit === "contain" ? "object-contain" : "object-cover"}`}
          />
        </div>
        <div className="bg-slate-900 text-white px-2.5 py-1 flex items-center justify-between text-[8px] font-bold shrink-0">
          <span className="uppercase tracking-wider truncate">{schoolDetails.schoolName}</span>
          <span className="text-amber-300 truncate">
            {schoolDetails.phone ? `Helpline: ${schoolDetails.phone}` : sessionText}
          </span>
        </div>
      </div>
    );
  }

  const verifyUrl = buildSafeErpAppQrUrl(schoolDetails.erpAppUrl, school?.id);
  const highlightsList = (posterConfig.highlights || DEFAULT_POSTER_CONFIG.highlights).slice(0, 14);
  const useTwoColFeatures = highlightsList.length > 7;
  const leaders = (posterConfig.leadershipStrip || DEFAULT_POSTER_CONFIG.leadershipStrip).slice(0, 3);

  return (
    <div
      className={`marksheet-poster-card w-full h-full ${compactPaSize ? "min-h-[168mm] print:min-h-0" : "min-h-[164mm] print:min-h-0"} bg-white border-2 ${themePalette.borderColor} rounded-lg overflow-hidden flex flex-col justify-between box-border`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Top School Tagline + Header Banner */}
      <div className={`${themePalette.headerBg} text-white px-2.5 pt-1.5 pb-2 text-center relative shrink-0`}>
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className={`px-2 py-0.5 rounded-full ${themePalette.taglineBar} font-black text-[7.5px] uppercase tracking-wider truncate`}>
            ✨ {posterConfig.tagline || "Discipline, Devotion, Dedication"}
          </span>
          <span className={`px-2 py-0.5 rounded-full ${themePalette.accentBg} font-black text-[7px] uppercase tracking-wider shrink-0 shadow-xs`}>
            {posterConfig.admissionBadge || `ADMISSIONS OPEN • ${sessionText}`}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          {logoUrl ? (
            <img
              src={cleanLogoUrl(logoUrl)}
              alt="Logo"
              className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 border border-amber-300/80 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              {(schoolDetails.schoolName || "SC").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-left min-w-0 flex-1">
            <h2 className="text-[13.5px] font-black uppercase tracking-tight text-white leading-none truncate">
              {schoolDetails.schoolName || "SCHOOL ACADEMY"}
            </h2>
            {schoolDetails.address && (
              <p className="text-[7.5px] text-amber-200 font-bold truncate mt-0.5">
                📍 {schoolDetails.address}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wide ${themePalette.curriculumBg}`}>
                {posterConfig.curriculumLine || schoolDetails.affiliation || "CBSE Curriculum"}
              </span>
              {posterConfig.classRangeBadge && (
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black ${themePalette.classPillBg}`}>
                  {posterConfig.classRangeBadge}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Editable Features Body */}
      <div className="px-2.5 py-1.5 flex-1 min-h-0 flex flex-col justify-between gap-1.5 bg-gradient-to-b from-white to-slate-50/70">
        {/* Features Title Ribbon */}
        <div className={`px-2.5 py-1 rounded-md text-center font-black text-[9px] uppercase tracking-wider shadow-2xs shrink-0 ${themePalette.sectionTitleBg}`}>
          {posterConfig.featuresTitle || "हमारी विशेषताएँ • KEY SCHOOL HIGHLIGHTS"}
        </div>

        {/* Numbered Highlights Grid (1..14) */}
        <div className={`grid ${useTwoColFeatures ? "grid-cols-2 gap-1" : "grid-cols-1 gap-1.5"} flex-1 content-center`}>
          {highlightsList.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md border ${themePalette.highlightBg}`}
            >
              <span className={`w-4 h-4 rounded-full ${themePalette.badgeDot} text-[7.5px] font-black flex items-center justify-center shrink-0`}>
                {idx + 1}
              </span>
              <span className={`${useTwoColFeatures ? "text-[7.5px]" : "text-[8.5px]"} font-bold text-slate-900 leading-tight`}>
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* 3-Box Leadership Strip (Principal, Manager, Director) */}
        {leaders.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 shrink-0">
            {leaders.map((leader, idx) => {
              const fallbackPhoto =
                idx === 0
                  ? leader.photoUrl || posterConfig.principalPhotoUrl || schoolDetails.principalPhotoUrl
                  : idx === 2
                  ? leader.photoUrl || posterConfig.directorPhotoUrl || schoolDetails.directorPhotoUrl
                  : leader.photoUrl;
              const resolvedName =
                leader.name ||
                (idx === 0 ? schoolDetails.principalName : idx === 2 ? schoolDetails.directorName : "") ||
                leader.role;
              return (
                <div
                  key={idx}
                  className={`rounded-lg border px-1.5 py-1 text-center flex flex-col items-center justify-center ${themePalette.leaderBg}`}
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    {fallbackPhoto ? (
                      <img
                        src={fallbackPhoto}
                        alt={resolvedName}
                        className="w-5 h-5 rounded-full object-cover object-top border border-amber-300 bg-white shrink-0"
                      />
                    ) : null}
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[6.5px] font-black uppercase tracking-wider">
                      {leader.role}
                    </span>
                  </div>
                  <p className="text-[8px] font-black text-white leading-tight truncate w-full">
                    {resolvedName}
                  </p>
                  {leader.qualification && (
                    <p className="text-[6.2px] font-semibold text-amber-200/90 leading-tight line-clamp-2 mt-0.5">
                      {leader.qualification}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Motto + Contact + App/Portal QR Footer */}
        <div className="border-t-2 border-slate-900 pt-1.5 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0 flex-1 space-y-0.5 text-[7.5px]">
            <div className="flex items-center gap-1.5">
              {posterConfig.bottomMotto && (
                <span className={`px-2 py-0.5 rounded font-black text-[7.5px] italic shrink-0 ${themePalette.mottoBg}`}>
                  {posterConfig.bottomMotto}
                </span>
              )}
              <p className="font-black text-slate-900 uppercase tracking-tight truncate">
                {posterConfig.footerNote}
              </p>
            </div>
            <p className="text-indigo-950 font-black truncate">
              {schoolDetails.phone ? `📞 Helpline: ${schoolDetails.phone}` : ""}
              {schoolDetails.phone && schoolDetails.email ? " • " : ""}
              {schoolDetails.email ? `✉️ ${schoolDetails.email}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="text-right leading-none">
              <span className="text-[6.5px] font-bold text-slate-500 uppercase block">School</span>
              <span className="text-[7px] font-black text-indigo-900">Portal QR</span>
            </div>
            <div className="p-0.5 bg-white border border-slate-400 rounded">
              <QRCode value={verifyUrl} size={28} level="M" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StudentThoughtBackHalfCardProps {
  studentName: string;
  classNameText: string;
  sectionName: string;
  rollNo: string;
  sessionText: string;
  overallPct: number;
  classRankText: string;
  attendancePct: number;
  hasFail?: boolean;
  photoUrl: string;
  cutoutSettings?: StudentCutoutSettings;
  selectedThoughtIds?: string[];
  schoolName: string;
  principalName?: string;
  schoolId?: string;
  schoolDetails?: SchoolHeaderDetails;
  posterConfig?: SchoolPosterConfig;
}

export const StudentThoughtBackHalfCard: React.FC<StudentThoughtBackHalfCardProps> = ({
  studentName,
  classNameText,
  sectionName,
  rollNo,
  sessionText,
  overallPct,
  classRankText,
  attendancePct,
  hasFail,
  photoUrl,
  cutoutSettings,
  selectedThoughtIds,
  schoolName,
  principalName,
  schoolId,
  schoolDetails,
  posterConfig,
}) => {
  const numericRank = parseInt(classRankText || "99", 10);
  const { tierLabel, top10, defaultSelectedIds } = getTop10ThoughtsForStudent({
    overallPct,
    classRankNum: isNaN(numericRank) ? 99 : numericRank,
    attendancePct,
    hasFail,
  });

  const activeIds =
    selectedThoughtIds && selectedThoughtIds.length === 6
      ? selectedThoughtIds
      : defaultSelectedIds;

  const pickedThoughts: EnglishThoughtItem[] = activeIds
    .map(id => top10.find(t => t.id === id) || ENGLISH_THOUGHTS_BANK.find(t => t.id === id))
    .filter((t): t is EnglishThoughtItem => Boolean(t));

  while (pickedThoughts.length < 6) {
    const fallback = top10.find(t => !pickedThoughts.some(p => p.id === t.id)) || ENGLISH_THOUGHTS_BANK[pickedThoughts.length];
    if (fallback) pickedThoughts.push(fallback);
    else break;
  }

  const leftThoughts = pickedThoughts.slice(0, 3);
  const rightThoughts = pickedThoughts.slice(3, 6);

  const hasCutout = Boolean(cutoutSettings?.cutoutDataUrl);
  const displayImage = cutoutSettings?.cutoutDataUrl || photoUrl;
  const zoom = cutoutSettings?.zoom ?? 1.08;
  const offsetY = cutoutSettings?.offsetY ?? 4;

  const cfg = posterConfig || DEFAULT_POSTER_CONFIG;
  const showLeadership = cfg.showLeadershipOnThoughts !== false;
  const showErpAppQr = cfg.showErpAppQrOnThoughts !== false;

  const resolvedPrincipalPhoto = cfg.principalPhotoUrl || schoolDetails?.principalPhotoUrl || "";
  const resolvedDirectorPhoto = cfg.directorPhotoUrl || schoolDetails?.directorPhotoUrl || "";
  const resolvedPrincipalName =
    cfg.principalHonorName ||
    cfg.leadershipStrip?.[0]?.name ||
    principalName ||
    schoolDetails?.principalName ||
    "Principal Sir";
  const resolvedDirectorName =
    cfg.directorHonorName ||
    cfg.leadershipStrip?.[2]?.name ||
    schoolDetails?.directorName ||
    "Director Sir";

  const erpAppQrValue = buildSafeErpAppQrUrl(schoolDetails?.erpAppUrl, schoolId);
  const rawErpBenefits = (
    schoolDetails?.erpAppFeatures && schoolDetails.erpAppFeatures.length > 0
      ? schoolDetails.erpAppFeatures
      : cfg.erpAppFeatures || DEFAULT_POSTER_CONFIG.erpAppFeatures
  ).slice(0, 6);

  const LEGACY_ERP_DESC_MAP: Record<string, string> = {
    "live events & school updates": "School circulars, functions, admit card & digital marksheet.",
    "live study track & homework": "Daily homework, class notes, syllabus progress & marks.",
    "live school bus tracking": "Real-time van/bus route location & pickup/drop alerts.",
    "monthly fee alerts & online fee pay": "Due reminders, online fee payment & digital receipts.",
    "school store (books & uniforms)": "Order books/uniforms & apply for instant admission.",
    "instant online admission": "Apply online, pay admission fee & link student ID instantly.",
  };

  const parsedErpBenefits = rawErpBenefits.map(item => {
    const colonIdx = item.indexOf(":");
    if (colonIdx > 0) {
      return {
        title: item.slice(0, colonIdx).trim(),
        desc: item.slice(colonIdx + 1).trim(),
      };
    }
    const clean = item.trim();
    return {
      title: clean,
      desc: LEGACY_ERP_DESC_MAP[clean.toLowerCase()] || "Instant real-time school updates & direct parent access.",
    };
  });

  return (
    <div
      className="marksheet-thought-card w-full h-full min-h-[164mm] print:min-h-0 bg-white border-2 border-slate-900 rounded-lg overflow-hidden flex flex-col justify-between p-2 box-border"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Top Dark Navy Celebration Header */}
      <div className="bg-[#1a253c] text-white rounded-md px-3 py-1 text-center shadow-xs shrink-0">
        <span className="text-[7px] font-extrabold uppercase tracking-[0.2em] text-amber-300 block leading-none">
          Student Profile
        </span>
        <h3 className="text-[11.5px] font-black uppercase tracking-wide text-amber-400 leading-tight mt-0.5 truncate">
          {tierLabel}
        </h3>

        <div className="grid grid-cols-3 border-t border-slate-500/50 pt-1 mt-1 items-center">
          <div className="px-1 min-w-0">
            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-300 block truncate">
              {studentName || "STUDENT CANDIDATE"}
            </span>
            <span className="text-[11px] font-black text-amber-400 leading-tight block">
              Roll #{rollNo || "01"}
            </span>
          </div>
          <div className="px-1 border-x border-slate-500/60 min-w-0">
            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-300 block">
              CLASS RANK
            </span>
            <span className="text-[11px] font-black text-white leading-tight block">
              #{classRankText || "01"}
            </span>
          </div>
          <div className="px-1 min-w-0">
            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-300 block">
              OVERALL
            </span>
            <span className="text-[11px] font-black text-white leading-tight block">
              {overallPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-[6px] font-semibold text-slate-300/90 mt-0.5 truncate">
          Class: {classNameText} ({sectionName}) &bull; Session {sessionText}
        </p>
      </div>

      {/* Main Showcase: TOP 70% Equal Portrait Frames & 6 Quotes + BOTTOM 30% Spacious ERP App Card */}
      <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 pt-1.5 pb-1 bg-white">
        <div className="flex-1 min-h-0 flex flex-col justify-evenly gap-1.5">
          {/* ROW 1: Thoughts #1-#2 Left | Student Large Equal Photo Center | Thoughts #3-#4 Right */}
          <div className="grid grid-cols-[1fr_124px_1fr] gap-1.5 items-center min-h-0">
            {/* Left Quote Bubbles (Thoughts 1 & 2) */}
            <div className="h-[130px] flex flex-col justify-between gap-1">
              {leftThoughts.slice(0, 2).map((thought) => (
                <div
                  key={thought.id}
                  className="flex-1 min-h-0 rounded-xl border border-sky-200/90 bg-[#eef5fc] px-2 py-1 flex flex-col justify-center gap-0.5 shadow-2xs overflow-hidden"
                >
                  <p className="text-[7px] font-semibold text-slate-800 leading-snug italic line-clamp-3">
                    <span className="font-black text-slate-600 not-italic mr-0.5">&ldquo;</span>
                    {thought.text}
                    <span className="font-black text-slate-600 not-italic ml-0.5">&rdquo;</span>
                  </p>
                  <span className="text-[5.8px] font-black uppercase tracking-wider text-slate-600 text-right block truncate">
                    &mdash; {thought.author}
                  </span>
                </div>
              ))}
            </div>

            {/* Center: Student Hero Photo (Large Equal Portrait Frame) */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-[114px] h-[130px] p-1 bg-white border-2 border-slate-300 shadow-sm rounded-md overflow-hidden flex items-center justify-center shrink-0">
                {displayImage ? (
                  hasCutout ? (
                    <img
                      src={displayImage}
                      alt={studentName}
                      className="w-full h-full object-contain object-bottom bg-white select-none"
                      style={{
                        transform: `scale(${zoom}) translateY(${offsetY}%)`,
                        transformOrigin: "center bottom",
                      }}
                    />
                  ) : (
                    <img
                      src={displayImage}
                      alt={studentName}
                      className="w-full h-full object-cover object-top bg-white select-none"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-1">
                    <User className="w-12 h-12 text-slate-300" />
                    <span className="text-[6.8px] font-bold uppercase tracking-wider text-slate-400">
                      Student Photo
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[7.5px] font-black uppercase tracking-tight text-slate-950 leading-tight truncate w-full mt-0.5">
                {studentName || "STUDENT CANDIDATE"}
              </p>
              <span className="text-[5.8px] font-extrabold uppercase tracking-wider text-slate-600 leading-none">
                &ndash; STUDENT (ROLL #{rollNo})
              </span>
            </div>

            {/* Right Quote Bubbles (Thoughts 3 & 4) */}
            <div className="h-[130px] flex flex-col justify-between gap-1">
              {[leftThoughts[2], rightThoughts[0]].filter(Boolean).map((thought) => (
                <div
                  key={thought.id}
                  className="flex-1 min-h-0 rounded-xl border border-emerald-200/90 bg-[#edf7f0] px-2 py-1 flex flex-col justify-center gap-0.5 shadow-2xs overflow-hidden"
                >
                  <p className="text-[7px] font-semibold text-slate-800 leading-snug italic line-clamp-3">
                    <span className="font-black text-slate-600 not-italic mr-0.5">&ldquo;</span>
                    {thought.text}
                    <span className="font-black text-slate-600 not-italic ml-0.5">&rdquo;</span>
                  </p>
                  <span className="text-[5.8px] font-black uppercase tracking-wider text-slate-600 text-right block truncate">
                    &mdash; {thought.author}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 2: Principal Bottom-Left | Thoughts #5 & #6 Center | Director Bottom-Right */}
          <div className="grid grid-cols-[124px_1fr_124px] gap-1.5 items-center min-h-0">
            {/* Bottom-Left: Principal Large Equal Photo + Name */}
            <div className="flex flex-col items-center justify-center text-center">
              {showLeadership ? (
                <>
                  <div className="w-[114px] h-[130px] p-1 bg-white border-2 border-slate-300 shadow-sm rounded-md overflow-hidden flex items-center justify-center shrink-0">
                    {resolvedPrincipalPhoto ? (
                      <img
                        src={resolvedPrincipalPhoto}
                        alt={resolvedPrincipalName}
                        className="w-full h-full object-cover object-top bg-white select-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-1">
                        <User className="w-12 h-12 text-indigo-300" />
                        <span className="text-[6.8px] font-bold uppercase tracking-wider text-slate-400">
                          Principal Photo
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-[7.2px] font-black uppercase tracking-tight text-slate-950 leading-tight truncate w-full mt-0.5">
                    {resolvedPrincipalName}
                  </p>
                  <span className="text-[5.8px] font-extrabold uppercase tracking-wider text-slate-600 leading-none">
                    &ndash; PRINCIPAL
                  </span>
                </>
              ) : null}
            </div>

            {/* Bottom-Center: Thoughts #5 & #6 Side-by-Side Between Principal & Director */}
            <div className={`${showLeadership ? "" : "col-span-3"} h-[130px] grid grid-cols-2 gap-1.5 items-stretch`}>
              {rightThoughts.slice(1, 3).map((thought, idx) => (
                <div
                  key={thought.id}
                  className={`rounded-xl border px-2 py-1.5 flex flex-col justify-center gap-1 shadow-2xs overflow-hidden ${
                    idx === 0
                      ? "border-sky-200/90 bg-[#eef5fc]"
                      : "border-amber-200/90 bg-[#fbf5eb]"
                  }`}
                >
                  <p className="text-[7.1px] font-semibold text-slate-800 leading-snug italic line-clamp-5">
                    <span className="font-black text-slate-600 not-italic mr-0.5">&ldquo;</span>
                    {thought.text}
                    <span className="font-black text-slate-600 not-italic ml-0.5">&rdquo;</span>
                  </p>
                  <span className="text-[5.8px] font-black uppercase tracking-wider text-slate-600 text-right block truncate">
                    &mdash; {thought.author}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom-Right: Director Large Equal Photo + Name */}
            <div className="flex flex-col items-center justify-center text-center">
              {showLeadership ? (
                <>
                  <div className="w-[114px] h-[130px] p-1 bg-white border-2 border-slate-300 shadow-sm rounded-md overflow-hidden flex items-center justify-center shrink-0">
                    {resolvedDirectorPhoto ? (
                      <img
                        src={resolvedDirectorPhoto}
                        alt={resolvedDirectorName}
                        className="w-full h-full object-cover object-top bg-white select-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-1">
                        <User className="w-12 h-12 text-emerald-300" />
                        <span className="text-[6.8px] font-bold uppercase tracking-wider text-slate-400">
                          Director Photo
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-[7.2px] font-black uppercase tracking-tight text-slate-950 leading-tight truncate w-full mt-0.5">
                    {resolvedDirectorName}
                  </p>
                  <span className="text-[5.8px] font-extrabold uppercase tracking-wider text-slate-600 leading-none">
                    &ndash; DIRECTOR
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* BOTTOM ENLARGED (~30%): SCHOOL ERP MOBILE APP – FEATURES, BENEFITS & SETUP GUIDE */}
        {showErpAppQr && (
          <div className="flex flex-col justify-end shrink-0 pt-1">
            <div className="mx-auto -mb-2.5 relative z-10 px-4 py-0.5 rounded-full bg-[#1a253c] text-amber-300 text-[7.5px] font-black uppercase tracking-wider shadow-xs border border-amber-400/50">
              {cfg.erpAppTitle || "SCHOOL ERP MOBILE APP"} &ndash; FEATURES, BENEFITS &amp; SETUP GUIDE
            </div>
            <div className="rounded-2xl border-2 border-slate-400 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 pt-3.5 pb-2 px-2.5 flex flex-col gap-1.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                {/* Left Enlarged QR Code + Scan Label */}
                <div className="shrink-0 flex flex-col items-center bg-white border-2 border-[#1a253c] rounded-xl p-1.5 shadow-2xs">
                  <QRCode value={erpAppQrValue} size={74} level="M" />
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-[#1a253c] text-amber-300 text-[5.8px] font-black uppercase tracking-wider leading-none">
                    Scan to Download
                  </span>
                </div>

                {/* Right 6 Detailed Feature Cards (Heading + Description) */}
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-1.5">
                  {parsedErpBenefits.map((feat, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-300/90 bg-white px-1.5 py-1 shadow-2xs flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-3 h-3 rounded-full bg-[#1a253c] text-amber-300 text-[6px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-[7px] font-black text-[#1a253c] leading-tight truncate">
                          {feat.title}
                        </span>
                      </div>
                      <p className="text-[6px] font-medium text-slate-700 leading-tight mt-0.5 line-clamp-2">
                        {feat.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clear 3-Step Setup & ID Card QR Linking Bar */}
              <div className="px-2.5 py-1 rounded-full bg-[#1a253c] text-amber-300 text-[6.2px] font-extrabold text-center tracking-wide">
                {cfg.erpAppStepNote || "How to Start: 1. Scan QR to Download App → 2. Create Parent/Student Account → 3. Scan Student ID Card QR Code to Link Profile"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Honor Footer */}
      <div className="border-t border-slate-300 pt-0.5 flex items-center justify-between text-[6.5px] shrink-0">
        <div className="flex items-center gap-1 font-bold text-slate-700">
          <Award className="w-2.5 h-2.5 text-amber-600 shrink-0" />
          <span>With Best Wishes for Your Bright Academic Future</span>
        </div>
        <div className="font-black text-[#1a253c] uppercase tracking-wide truncate max-w-[45%] text-right">
          {resolvedPrincipalName ? `${resolvedPrincipalName} • ` : ""}
          {schoolName}
        </div>
      </div>
    </div>
  );
};

interface BacksideStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  schoolDetails: SchoolHeaderDetails;
  onUpdateSchoolDetails?: (next: SchoolHeaderDetails) => void;
  sessionText: string;
  currentStudent: SchoolStudent | null;
  studentName: string;
  classNameText: string;
  sectionName: string;
  rollNo: string;
  overallPct: number;
  classRankText: string;
  attendancePct: number;
  hasFail?: boolean;
  studentPhoto: string;
  allStudents: SchoolStudent[];
  posterConfig: SchoolPosterConfig;
  onSavePosterConfig: (next: SchoolPosterConfig) => void;
  cutoutsMap: Record<string, StudentCutoutSettings>;
  onUpdateCutoutsMap: (next: Record<string, StudentCutoutSettings>) => void;
  studentThoughtsMap: Record<string, string[]>;
  onUpdateThoughtsMap: (next: Record<string, string[]>) => void;
}

export const BacksideStudioModal: React.FC<BacksideStudioModalProps> = ({
  isOpen,
  onClose,
  school,
  schoolDetails,
  onUpdateSchoolDetails,
  sessionText,
  currentStudent,
  studentName,
  classNameText,
  sectionName,
  rollNo,
  overallPct,
  classRankText,
  attendancePct,
  hasFail,
  studentPhoto,
  allStudents,
  posterConfig,
  onSavePosterConfig,
  cutoutsMap,
  onUpdateCutoutsMap,
  studentThoughtsMap,
  onUpdateThoughtsMap,
}) => {
  const [activeTab, setActiveTab] = useState<"thoughts" | "cutout" | "poster" | "erp">("poster");
  const [sensitivity, setSensitivity] = useState<number>(
    (currentStudent && cutoutsMap[currentStudent.id]?.sensitivity) || 36
  );
  const [zoom, setZoom] = useState<number>(
    (currentStudent && cutoutsMap[currentStudent.id]?.zoom) || 1.08
  );
  const [offsetY, setOffsetY] = useState<number>(
    (currentStudent && cutoutsMap[currentStudent.id]?.offsetY) || 4
  );
  const [isProcessingCutout, setIsProcessingCutout] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeStudentId = currentStudent?.id || "single_demo";
  const activePhotoUrl = studentPhoto || (currentStudent as any)?.photoUrl || "";
  const activeCutout = cutoutsMap[activeStudentId];

  const numericRank = parseInt(classRankText || "99", 10);
  const { tierLabel, top10, defaultSelectedIds } = getTop10ThoughtsForStudent({
    overallPct,
    classRankNum: isNaN(numericRank) ? 99 : numericRank,
    attendancePct,
    hasFail,
  });

  const savedSelectedIds = studentThoughtsMap[activeStudentId];
  const currentSelectedIds =
    savedSelectedIds && savedSelectedIds.length > 0 ? savedSelectedIds : defaultSelectedIds;

  const toggleThoughtId = (id: string) => {
    const exists = currentSelectedIds.includes(id);
    let nextIds: string[];
    if (exists) {
      nextIds = currentSelectedIds.filter(x => x !== id);
    } else if (currentSelectedIds.length >= 6) {
      nextIds = [...currentSelectedIds.slice(0, 5), id];
    } else {
      nextIds = [...currentSelectedIds, id];
    }
    onUpdateThoughtsMap({
      ...studentThoughtsMap,
      [activeStudentId]: nextIds,
    });
  };

  const resetThoughtsToAuto = () => {
    const next = { ...studentThoughtsMap };
    delete next[activeStudentId];
    onUpdateThoughtsMap(next);
  };

  const handleRunCutout = async (customSens = sensitivity) => {
    if (!activePhotoUrl) return;
    setIsProcessingCutout(true);
    try {
      const processed = await removeBackgroundToWhiteDataUrl(activePhotoUrl, customSens);
      onUpdateCutoutsMap({
        ...cutoutsMap,
        [activeStudentId]: {
          cutoutDataUrl: processed,
          sensitivity: customSens,
          zoom,
          offsetY,
        },
      });
    } finally {
      setIsProcessingCutout(false);
    }
  };

  const handleFrameChange = (nextZoom: number, nextOffsetY: number) => {
    setZoom(nextZoom);
    setOffsetY(nextOffsetY);
    const existing = cutoutsMap[activeStudentId];
    onUpdateCutoutsMap({
      ...cutoutsMap,
      [activeStudentId]: {
        cutoutDataUrl: existing?.cutoutDataUrl || activePhotoUrl,
        sensitivity: existing?.sensitivity ?? sensitivity,
        zoom: nextZoom,
        offsetY: nextOffsetY,
      },
    });
  };

  const handleBatchCutoutAll = async () => {
    const targets = allStudents.filter(s => Boolean((s as any).photoUrl));
    if (targets.length === 0) {
      setBatchStatus("No student photos found to process.");
      return;
    }
    setIsProcessingCutout(true);
    setBatchStatus(`Processing 0/${targets.length}...`);
    const nextMap = { ...cutoutsMap };
    for (let i = 0; i < targets.length; i++) {
      const st = targets[i];
      const src = (st as any).photoUrl;
      if (src) {
        const processed = await removeBackgroundToWhiteDataUrl(src, sensitivity);
        nextMap[st.id] = {
          cutoutDataUrl: processed,
          sensitivity,
          zoom: nextMap[st.id]?.zoom ?? 1.08,
          offsetY: nextMap[st.id]?.offsetY ?? 4,
        };
      }
      setBatchStatus(`Processed ${i + 1}/${targets.length} students...`);
    }
    onUpdateCutoutsMap(nextMap);
    setIsProcessingCutout(false);
    setBatchStatus(`✅ White-BG cutout completed for ${targets.length} students!`);
    setTimeout(() => setBatchStatus(null), 4000);
  };

  const handleLeaderPhotoUpload = (
    roleKey: "principal" | "director",
    file: File | undefined,
    autoWhiteBg = true
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const finalImg = autoWhiteBg ? await removeBackgroundToWhiteDataUrl(raw, 34) : raw;
      if (roleKey === "principal") {
        onSavePosterConfig({ ...posterConfig, principalPhotoUrl: finalImg });
      } else {
        onSavePosterConfig({ ...posterConfig, directorPhotoUrl: finalImg });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateLeaderCard = (idx: number, patch: Partial<PosterLeaderCard>) => {
    const base = [...(posterConfig.leadershipStrip || DEFAULT_POSTER_CONFIG.leadershipStrip)];
    while (base.length <= idx) {
      base.push({ role: "Authority", name: "", qualification: "" });
    }
    base[idx] = { ...base[idx], ...patch };
    onSavePosterConfig({ ...posterConfig, leadershipStrip: base });
  };

  const leadersList = posterConfig.leadershipStrip || DEFAULT_POSTER_CONFIG.leadershipStrip;
  const liveErpQrUrl = buildSafeErpAppQrUrl(schoolDetails.erpAppUrl, school?.id);

  return (
    <div className="fixed inset-0 z-50 print:hidden bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Marksheet Page 2 Studio
            </span>
            <h3 className="text-base sm:text-lg font-black">
              Editable School Poster, Principal/Director Photos, ERP App QR &amp; 6 Thoughts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("poster")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition ${
              activeTab === "poster"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>1. Editable School Poster</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cutout")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition ${
              activeTab === "cutout"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>2. Student Cutout &amp; Principal/Director Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("erp")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition ${
              activeTab === "erp"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>3. School ERP App QR &amp; Features</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("thoughts")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition ${
              activeTab === "thoughts"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>4. 6 English Thoughts (Top 10)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: THEME-BASED EDITABLE SCHOOL POSTER */}
          {activeTab === "poster" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSavePosterConfig({ ...posterConfig, mode: "auto" })}
                      className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer border ${
                        posterConfig.mode === "auto"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300"
                      }`}
                    >
                      ✨ Theme Editable Poster (HD)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSavePosterConfig({ ...posterConfig, mode: "upload" })}
                      className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer border ${
                        posterConfig.mode === "upload"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300"
                      }`}
                    >
                      🖼️ Upload Custom Image
                    </button>
                  </div>

                  {posterConfig.mode === "upload" ? (
                    <div className="space-y-3">
                      <label className="block border-2 border-dashed border-indigo-400 rounded-2xl p-5 text-center cursor-pointer hover:bg-indigo-50/50 transition">
                        <Upload className="w-7 h-7 text-indigo-600 mx-auto mb-1" />
                        <span className="text-xs font-black text-slate-800 dark:text-white block">
                          Upload School Poster Image (JPG / PNG)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              onSavePosterConfig({
                                ...posterConfig,
                                mode: "upload",
                                uploadedImageUrl: reader.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">Image Fit:</span>
                        <button
                          type="button"
                          onClick={() => onSavePosterConfig({ ...posterConfig, imageFit: "cover" })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${posterConfig.imageFit === "cover" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}
                        >
                          Fill Full Area
                        </button>
                        <button
                          type="button"
                          onClick={() => onSavePosterConfig({ ...posterConfig, imageFit: "contain" })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${posterConfig.imageFit === "contain" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}
                        >
                          Fit Without Crop
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: "vibrant_campus", label: "Campus Green" },
                          { id: "indigo_gold", label: "Indigo Gold" },
                          { id: "emerald_gold", label: "Emerald Gold" },
                          { id: "crimson_royal", label: "Crimson Royal" },
                        ].map(th => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => onSavePosterConfig({ ...posterConfig, theme: th.id as any })}
                            className={`py-1.5 px-1 rounded-lg text-[10.5px] font-black cursor-pointer border ${
                              posterConfig.theme === th.id
                                ? "bg-slate-900 text-amber-300 border-slate-900"
                                : "bg-white text-slate-700 border-slate-300"
                            }`}
                          >
                            {th.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10.5px] font-bold block mb-0.5">Top Tagline:</label>
                          <input
                            type="text"
                            value={posterConfig.tagline || ""}
                            onChange={e => onSavePosterConfig({ ...posterConfig, tagline: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold block mb-0.5">Admission Badge:</label>
                          <input
                            type="text"
                            value={posterConfig.admissionBadge}
                            onChange={e => onSavePosterConfig({ ...posterConfig, admissionBadge: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10.5px] font-bold block mb-0.5">Curriculum Line:</label>
                          <input
                            type="text"
                            value={posterConfig.curriculumLine || ""}
                            onChange={e => onSavePosterConfig({ ...posterConfig, curriculumLine: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold block mb-0.5">Class Range Pill:</label>
                          <input
                            type="text"
                            value={posterConfig.classRangeBadge || ""}
                            onChange={e => onSavePosterConfig({ ...posterConfig, classRangeBadge: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10.5px] font-bold">School Highlights / विशेषताएँ (1 per line, up to 14):</label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => onSavePosterConfig({ ...posterConfig, highlights: PRESET_HINDI_CBSE_HIGHLIGHTS })}
                              className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-black cursor-pointer"
                            >
                              Hindi Preset (12)
                            </button>
                            <button
                              type="button"
                              onClick={() => onSavePosterConfig({ ...posterConfig, highlights: PRESET_ENGLISH_CBSE_HIGHLIGHTS })}
                              className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-black cursor-pointer"
                            >
                              English Preset (12)
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={5}
                          value={(posterConfig.highlights || []).join("\n")}
                          onChange={e =>
                            onSavePosterConfig({
                              ...posterConfig,
                              highlights: e.target.value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 14),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900"
                        />
                      </div>

                      {/* 3-Box Leadership Strip Editor */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Management Strip (Principal / Manager / Director)
                        </span>
                        {[0, 1, 2].map(idx => {
                          const item = leadersList[idx] || { role: "", name: "", qualification: "" };
                          return (
                            <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                              <input
                                type="text"
                                placeholder="Role"
                                value={item.role}
                                onChange={e => updateLeaderCard(idx, { role: e.target.value })}
                                className="col-span-3 px-2 py-1 rounded-lg border text-[11px] font-bold bg-slate-50 dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                placeholder="Name"
                                value={item.name}
                                onChange={e => updateLeaderCard(idx, { name: e.target.value })}
                                className="col-span-4 px-2 py-1 rounded-lg border text-[11px] font-bold bg-slate-50 dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                placeholder="Qualification"
                                value={item.qualification}
                                onChange={e => updateLeaderCard(idx, { qualification: e.target.value })}
                                className="col-span-5 px-2 py-1 rounded-lg border text-[11px] bg-slate-50 dark:bg-slate-800"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10.5px] font-bold block mb-0.5">Bottom Motto:</label>
                          <input
                            type="text"
                            value={posterConfig.bottomMotto || ""}
                            onChange={e => onSavePosterConfig({ ...posterConfig, bottomMotto: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold block mb-0.5">Footer Note:</label>
                          <input
                            type="text"
                            value={posterConfig.footerNote}
                            onChange={e => onSavePosterConfig({ ...posterConfig, footerNote: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  School Poster Half-Page Live Preview:
                </p>
                <div className="border rounded-xl overflow-hidden shadow-md bg-white max-w-[440px] mx-auto">
                  <SchoolPosterHalfCard
                    school={school}
                    schoolDetails={schoolDetails}
                    posterConfig={posterConfig}
                    sessionText={sessionText}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENT BODY CUTOUT + PRINCIPAL & DIRECTOR PHOTOS */}
          {activeTab === "cutout" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 space-y-3">
                {/* Principal & Director Sir Portrait Section */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-600" />
                      Principal &amp; Director Sir Photos (Thoughts Card)
                    </h4>
                    <label className="flex items-center gap-1.5 text-xs font-black cursor-pointer">
                      <input
                        type="checkbox"
                        checked={posterConfig.showLeadershipOnThoughts !== false}
                        onChange={e => onSavePosterConfig({ ...posterConfig, showLeadershipOnThoughts: e.target.checked })}
                        className="accent-indigo-600"
                      />
                      <span>Show on Card</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-center">
                      <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase block">Principal Sir</span>
                      <div className="w-14 h-14 mx-auto rounded-full border-2 border-indigo-500 bg-white overflow-hidden flex items-center justify-center">
                        {posterConfig.principalPhotoUrl ? (
                          <img src={posterConfig.principalPhotoUrl} alt="Principal" className="w-full h-full object-cover object-top" />
                        ) : (
                          <User className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={schoolDetails.principalName || "Principal Name"}
                        value={posterConfig.principalHonorName || ""}
                        onChange={e => onSavePosterConfig({ ...posterConfig, principalHonorName: e.target.value })}
                        className="w-full px-2 py-1 rounded border text-[10.5px] font-bold bg-slate-50 dark:bg-slate-900"
                      />
                      <div className="flex gap-1 justify-center">
                        <label className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold cursor-pointer">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleLeaderPhotoUpload("principal", e.target.files?.[0], true)}
                          />
                        </label>
                        {posterConfig.principalPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => onSavePosterConfig({ ...posterConfig, principalPhotoUrl: "" })}
                            className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-center">
                      <span className="text-[10px] font-black text-emerald-900 dark:text-emerald-300 uppercase block">Director Sir</span>
                      <div className="w-14 h-14 mx-auto rounded-full border-2 border-emerald-500 bg-white overflow-hidden flex items-center justify-center">
                        {posterConfig.directorPhotoUrl ? (
                          <img src={posterConfig.directorPhotoUrl} alt="Director" className="w-full h-full object-cover object-top" />
                        ) : (
                          <User className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={schoolDetails.directorName || "Director Name"}
                        value={posterConfig.directorHonorName || ""}
                        onChange={e => onSavePosterConfig({ ...posterConfig, directorHonorName: e.target.value })}
                        className="w-full px-2 py-1 rounded border text-[10.5px] font-bold bg-slate-50 dark:bg-slate-900"
                      />
                      <div className="flex gap-1 justify-center">
                        <label className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleLeaderPhotoUpload("director", e.target.files?.[0], true)}
                          />
                        </label>
                        {posterConfig.directorPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => onSavePosterConfig({ ...posterConfig, directorPhotoUrl: "" })}
                            className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Cutout Processor */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4 text-indigo-600" />
                      Student Cutout Processor (Pure White BG)
                    </h4>
                    <button
                      type="button"
                      onClick={handleBatchCutoutAll}
                      disabled={isProcessingCutout}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      ⚡ Auto-Cutout All Class
                    </button>
                  </div>

                  {batchStatus && (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
                      {batchStatus}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>Background Removal Sensitivity:</span>
                      <span className="font-mono text-indigo-600">{sensitivity}</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={85}
                      value={sensitivity}
                      onChange={e => setSensitivity(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span>Body Zoom:</span>
                        <span className="font-mono">{zoom.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.85}
                        max={1.65}
                        step={0.05}
                        value={zoom}
                        onChange={e => handleFrameChange(Number(e.target.value), offsetY)}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span>Vertical Shift:</span>
                        <span className="font-mono">{offsetY}%</span>
                      </div>
                      <input
                        type="range"
                        min={-15}
                        max={22}
                        step={1}
                        value={offsetY}
                        onChange={e => handleFrameChange(zoom, Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRunCutout(sensitivity)}
                      disabled={isProcessingCutout || !activePhotoUrl}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{isProcessingCutout ? "Processing..." : "Remove BG → Pure White"}</span>
                    </button>
                    {activeCutout && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...cutoutsMap };
                          delete next[activeStudentId];
                          onUpdateCutoutsMap(next);
                        }}
                        className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold cursor-pointer"
                      >
                        Reset Original
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Pure White Cutout Preview ({studentName || "Student"}):
                </p>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-100">
                  <div className="bg-white rounded-xl p-2 border text-center">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Original Photo</span>
                    <div className="h-52 flex items-center justify-center overflow-hidden bg-slate-50 rounded-lg">
                      {activePhotoUrl ? (
                        <img src={activePhotoUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <User className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-2 border-2 border-emerald-500 text-center">
                    <span className="text-[10px] font-black text-emerald-700 block mb-1">White-BG Cutout</span>
                    <div className="h-52 flex items-end justify-center overflow-hidden bg-white rounded-lg relative">
                      {(activeCutout?.cutoutDataUrl || activePhotoUrl) ? (
                        <img
                          src={activeCutout?.cutoutDataUrl || activePhotoUrl}
                          alt="Cutout"
                          className="max-h-full max-w-full object-contain bg-white"
                          style={{
                            transform: `scale(${zoom}) translateY(${offsetY}%)`,
                            transformOrigin: "center bottom",
                          }}
                        />
                      ) : (
                        <User className="w-10 h-10 text-slate-300 my-auto" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHOOL ERP APP QR & FEATURES */}
          {activeTab === "erp" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      School ERP App Download QR &amp; Benefits
                    </h4>
                    <label className="flex items-center gap-1.5 text-xs font-black cursor-pointer">
                      <input
                        type="checkbox"
                        checked={posterConfig.showErpAppQrOnThoughts !== false}
                        onChange={e => onSavePosterConfig({ ...posterConfig, showErpAppQrOnThoughts: e.target.checked })}
                        className="accent-emerald-600"
                      />
                      <span>Show on Card</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      School ERP App Download Link (Synced with School Details):
                    </label>
                    <input
                      type="url"
                      value={schoolDetails.erpAppUrl || ""}
                      onChange={e => {
                        if (onUpdateSchoolDetails) {
                          onUpdateSchoolDetails({ ...schoolDetails, erpAppUrl: e.target.value });
                        }
                      }}
                      placeholder="https://play.google.com/store/apps/... ya APK/Web App link daalein"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs font-bold bg-white dark:bg-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tip: &quot;School Details&quot; modal me save karne par ye link sabhi users ke liye Firebase me permanently save ho jata hai.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">Card Heading:</label>
                    <input
                      type="text"
                      value={posterConfig.erpAppTitle || "SCHOOL ERP MOBILE APP"}
                      onChange={e => onSavePosterConfig({ ...posterConfig, erpAppTitle: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      School ERP App Features / Benefits (up to 6 lines — &quot;Title: Short Detail&quot; format):
                    </label>
                    <textarea
                      rows={6}
                      value={(posterConfig.erpAppFeatures || DEFAULT_POSTER_CONFIG.erpAppFeatures).join("\n")}
                      onChange={e =>
                        onSavePosterConfig({
                          ...posterConfig,
                          erpAppFeatures: e.target.value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 6),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">Scan &amp; Link Step Instructions:</label>
                    <input
                      type="text"
                      value={posterConfig.erpAppStepNote || ""}
                      onChange={e => onSavePosterConfig({ ...posterConfig, erpAppStepNote: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white text-center space-y-3 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                    Live ERP App QR Preview
                  </span>
                  <div className="inline-block p-3 bg-white border-2 border-indigo-900 rounded-2xl shadow-sm">
                    <QRCode value={liveErpQrUrl} size={118} level="M" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-600 break-all px-2">{liveErpQrUrl}</p>
                  <div className="p-2.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold">
                    {posterConfig.erpAppStepNote || DEFAULT_POSTER_CONFIG.erpAppStepNote}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 6 ENGLISH THOUGHTS */}
          {activeTab === "thoughts" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-3">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                      Smart Matched for: {studentName || "Student"} ({overallPct.toFixed(1)}% • Rank #{classRankText})
                    </span>
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      Category: {tierLabel} — Top 10 Suitable English Thoughts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${currentSelectedIds.length === 6 ? "bg-emerald-600 text-white" : "bg-amber-500 text-slate-950"}`}>
                      {currentSelectedIds.length}/6 Selected
                    </span>
                    <button
                      type="button"
                      onClick={resetThoughtsToAuto}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-xs font-bold border border-slate-300 dark:border-slate-600 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Auto Top 6
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {top10.map((item, i) => {
                    const selIdx = currentSelectedIds.indexOf(item.id);
                    const isPicked = selIdx !== -1;
                    const sideTag = !isPicked ? "" : selIdx < 3 ? `Left #${selIdx + 1}` : `Right #${selIdx - 2}`;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleThoughtId(item.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                          isPicked
                            ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-xs"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black ${
                          isPicked ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                        }`}>
                          {isPicked ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                            "{item.text}"
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-semibold text-slate-500">
                              — {item.author} • <span className="uppercase">{item.category.replace("_", " ")}</span>
                            </span>
                            {isPicked && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-600 text-white">
                                {sideTag}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Live Honor Card Preview (Thoughts + Leadership + Student + ERP QR):
                </p>
                <div className="border rounded-xl overflow-hidden shadow-md bg-white scale-[0.98] origin-top">
                  <StudentThoughtBackHalfCard
                    studentName={studentName}
                    classNameText={classNameText}
                    sectionName={sectionName}
                    rollNo={rollNo}
                    sessionText={sessionText}
                    overallPct={overallPct}
                    classRankText={classRankText}
                    attendancePct={attendancePct}
                    hasFail={hasFail}
                    photoUrl={activePhotoUrl}
                    cutoutSettings={activeCutout}
                    selectedThoughtIds={currentSelectedIds}
                    schoolName={schoolDetails.schoolName}
                    principalName={schoolDetails.principalName}
                    schoolId={school?.id}
                    schoolDetails={schoolDetails}
                    posterConfig={posterConfig}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            All poster, leadership photos, ERP App QR &amp; thoughts auto-save cleanly.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer shadow-sm"
          >
            Done &amp; Save
          </button>
        </div>
      </div>
    </div>
  );
};
