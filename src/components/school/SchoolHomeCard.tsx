// @ts-nocheck
import React, { useState, useEffect } from "react";
import type { School } from "../../school-types";
import {
  MapPin, Users, Shield, ChevronRight, RefreshCw, QrCode,
  CheckCircle2, Clock, Sparkles, School as SchoolIcon, Building2, Globe, UserPlus
} from "lucide-react";
import { checkTodayStudentAttendance } from "../../school-firebase";

interface Props {
  school: School;
  onOpen: () => void;
  onChangeSchool: () => void;
  onOpenQrScanner?: () => void;
  onOpenWebsite?: () => void;
  onOpenAdmission?: () => void;
  studentId?: string;
  studentClassId?: string;
  themeAccent?: string;
  cardBg?: string;
  card3D?: boolean;
  isDarkMode?: boolean;
}

export const SchoolHomeCard: React.FC<Props> = ({
  school,
  onOpen,
  onChangeSchool,
  onOpenQrScanner,
  onOpenWebsite,
  onOpenAdmission,
  studentId,
  studentClassId,
  themeAccent,
  cardBg,
  card3D = false,
  isDarkMode = false,
}) => {
  if (!school) return null;

  const accent = themeAccent || school.bannerColor || "#6366f1";
  const bg = cardBg || (isDarkMode ? "#0f172a" : "#ffffff");
  const initial = (school.name || "SC").trim().slice(0, 2).toUpperCase();

  const [attendanceStatus, setAttendanceStatus] = useState<{
    checked: boolean;
    present: boolean;
    date: string;
  }>({ checked: false, present: false, date: "" });

  useEffect(() => {
    let isMounted = true;
    if (school?.id && studentId) {
      checkTodayStudentAttendance(school.id, studentClassId || "class_10", studentId)
        .then((res) => {
          if (isMounted) {
            setAttendanceStatus({ checked: true, present: res.present, date: res.date });
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [school?.id, studentId, studentClassId]);

  const cardStyle: React.CSSProperties = card3D
    ? {
        background: bg,
        border: `2px solid ${accent}`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.85) inset, 0 4px 0 ${accent}bb, 0 7px 18px ${accent}28`,
        transform: "translateY(-1px)",
      }
    : {
        background: bg,
        border: `2px solid ${accent}`,
        boxShadow: `0 2px 10px ${accent}18`,
      };

  const chipStyle: React.CSSProperties = {
    background: isDarkMode ? "rgba(255,255,255,0.06)" : `${accent}10`,
    border: `1px solid ${accent}25`,
    color: isDarkMode ? "#e2e8f0" : "#1e293b",
  };

  return (
    <div
      id="home-school-card"
      className="nst-card-animated w-full rounded-2xl overflow-hidden transition-all text-left"
      style={cardStyle}
    >
      {/* Card Header & School Identity */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* School Logo or Initials */}
            <div
              className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-xs overflow-hidden border"
              style={{ background: `${accent}15`, borderColor: `${accent}35` }}
            >
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={school.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-sm tracking-tight" style={{ color: accent }}>
                  {initial}
                </span>
              )}
            </div>

            {/* School Name & Meta */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}18`, color: accent }}
                >
                  🏫 My School
                </span>
                {school.code && (
                  <span className="text-[10px] font-bold text-slate-400">
                    #{school.code}
                  </span>
                )}
              </div>
              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight line-clamp-1">
                {school.name}
              </h4>
              {school.address && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin size={10} className="shrink-0" />
                  <span className="truncate">{school.address}</span>
                </p>
              )}
            </div>
          </div>

          {/* Today's Attendance Badge */}
          <div className="shrink-0">
            {attendanceStatus.checked && attendanceStatus.present ? (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
                <CheckCircle2 size={12} />
                <span>Present Today</span>
              </span>
            ) : (
              <span
                className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs"
                style={{
                  background: `${accent}18`,
                  color: accent,
                  border: `1px solid ${accent}35`,
                }}
              >
                <Clock size={11} />
                <span>Haziri Baki</span>
              </span>
            )}
          </div>
        </div>

        {/* Feature / Ecosystem highlights chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded-lg" style={chipStyle}>
            📅 Timetable
          </span>
          <span className="px-2 py-0.5 rounded-lg" style={chipStyle}>
            📋 Smart Class
          </span>
          <span className="px-2 py-0.5 rounded-lg" style={chipStyle}>
            📢 Notices
          </span>
          <span className="px-2 py-0.5 rounded-lg" style={chipStyle}>
            📊 Marksheet
          </span>
        </div>
      </div>

      {/* Action Buttons: Open Dashboard, and Change School */}
      <div
        className="mt-1 pt-2.5 pb-3 px-4 border-t flex flex-wrap items-center gap-2"
        style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : `${accent}20` }}
      >

        {/* Open School Portal Button */}
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-white"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
            boxShadow: `0 4px 14px ${accent}35`,
          }}
        >
          <span>School Kholein</span>
          <ChevronRight size={14} />
        </button>

        {/* Change School Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChangeSchool();
          }}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold border active:scale-95 transition-all cursor-pointer flex items-center gap-1 ${
            isDarkMode
              ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
          }`}
          title="Change or Switch School"
        >
          <RefreshCw size={12} />
          <span>Badlo</span>
        </button>
      </div>
    </div>
  );
};
