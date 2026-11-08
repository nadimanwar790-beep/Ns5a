// @ts-nocheck
import React from "react";
import type { DailyClassLecture } from "../../school-types";
import { extractYouTubeVideoId } from "../../school-firebase";
import { CustomPlayer } from "../CustomPlayer";
import { rotateScreen } from "../../utils/displayPrefs";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lecture: DailyClassLecture | null;
  fallbackUrl?: string;
  fallbackTitle?: string;
}

export const YouTubeLectureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lecture,
  fallbackUrl,
  fallbackTitle,
}) => {
  if (!isOpen) return null;

  const url = lecture?.youtubeUrl || fallbackUrl || (lecture?.youtubeVideoId ? `https://youtu.be/${lecture.youtubeVideoId}` : "");
  const title = lecture?.topic || fallbackTitle || "Classroom Lecture Video";
  const fullTitle = lecture?.subjectName ? `${title} • ${lecture.subjectName}` : title;

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-[500] animate-in fade-in duration-150">
      <div className="flex-1 relative">
        <div style={{ position: "absolute", inset: 0 }}>
          <CustomPlayer
            videoUrl={url}
            videoTitle={fullTitle}
            brandingText={lecture?.className ? `NSTA • ${lecture.className}` : "NSTA School"}
            onBack={onClose}
            onRotate={async () => {
              await rotateScreen();
            }}
          />
        </div>
      </div>
    </div>
  );
};

