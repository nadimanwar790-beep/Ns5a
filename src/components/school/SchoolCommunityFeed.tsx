import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Camera,
  Video,
  Send,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  X,
  Calendar,
  Megaphone,
  Pin,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bell,
  ChevronLeft,
  Image as ImageIcon,
  BookOpen,
  Lock,
  Unlock,
  Youtube,
  Link2,
} from "lucide-react";
import {
  subscribeToSchoolCommunityPosts,
  subscribeToNotices,
  subscribeToSchoolHolidays,
  saveSchoolCommunityPost,
  deleteSchoolCommunityPost,
  toggleSchoolCommunityLike,
  addSchoolCommunityComment,
  deleteSchoolCommunityComment,
  saveSchoolHoliday,
  deleteSchoolHoliday,
  saveNotice,
  deleteNotice,
  extractYouTubeVideoId,
  type SchoolCommunityPost,
  type SchoolCommunityComment,
} from "../../school-firebase";
import { uploadImageToImgBB } from "../../services/imgbbService";
import { uploadToCloudinary, getOptimizedVideoUrl } from "../../services/cloudinaryService";
import { resolveTelegramUrl } from "../../services/telegramStorageService";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { getDemoSchoolDataset, isDemoDataEnabled, removeCustomHoliday } from "./demoDataStore";

export interface SchoolCommunityFeedProps {
  schoolId: string;
  schoolName?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "ADMIN" | "TEACHER" | "STUDENT";
  studentClassId?: string;
  studentClassName?: string;
  classes?: Array<{ id: string; name: string; section?: string }>;
  initialFilter?: "ALL" | "HOLIDAY" | "NOTICE" | "EVENT_MEDIA" | "HOMEWORK";
  onBack?: () => void;
}

type FeedFilter = "ALL" | "HOLIDAY" | "NOTICE" | "EVENT_MEDIA" | "HOMEWORK";

export const SchoolCommunityFeed: React.FC<SchoolCommunityFeedProps> = ({
  schoolId,
  schoolName = "School Campus",
  currentUserId,
  currentUserName,
  currentUserRole,
  studentClassId,
  studentClassName,
  classes = [],
  initialFilter = "ALL",
  onBack,
}) => {
  const canCreateOfficialPost = currentUserRole === "ADMIN" || currentUserRole === "TEACHER";
  const safeUserKey = useMemo(
    () => String(currentUserId || "guest").replace(/[.#$[\]/]/g, "_"),
    [currentUserId]
  );

  const [communityPosts, setCommunityPosts] = useState<SchoolCommunityPost[]>([]);
  const [liveNotices, setLiveNotices] = useState<any[]>([]);
  const [liveHolidays, setLiveHolidays] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>(initialFilter);
  const [showComposer, setShowComposer] = useState<boolean>(false);

  // Composer States
  const [postCategory, setPostCategory] = useState<SchoolCommunityPost["category"]>("NOTICE");
  const [postTitle, setPostTitle] = useState("");
  const [postText, setPostText] = useState("");
  const [targetClassId, setTargetClassId] = useState<string>("ALL");
  const [holidayStart, setHolidayStart] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [holidayEnd, setHolidayEnd] = useState<string>("");
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [commentsEnabled, setCommentsEnabled] = useState<boolean>(true);
  const [sendPushAlert, setSendPushAlert] = useState<boolean>(true);

  // Media Upload States
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>("");
  const [uploadingMedia, setUploadingMedia] = useState<"NONE" | "IMAGE" | "VIDEO">("NONE");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Lightbox & Comments UI States
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [openCommentsMap, setOpenCommentsMap] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  // Real-time Subscriptions scoped strictly to schoolId
  useEffect(() => {
    if (!schoolId) return;
    const unsubPosts = subscribeToSchoolCommunityPosts(schoolId, (posts) => {
      setCommunityPosts(posts);
    });
    const unsubNotices = subscribeToNotices(schoolId, (notices) => {
      setLiveNotices(notices);
    });
    const unsubHolidays = subscribeToSchoolHolidays(schoolId, (holidays) => {
      setLiveHolidays(holidays);
    });

    return () => {
      unsubPosts();
      unsubNotices();
      unsubHolidays();
    };
  }, [schoolId]);

  const showToast = (type: "ok" | "err", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Merge community_posts + notices + holidays seamlessly without duplicates
  const unifiedFeed = useMemo(() => {
    const map = new Map<string, SchoolCommunityPost>();

    // 1. Primary Community Posts
    for (const p of communityPosts) {
      if (p.schoolId && p.schoolId !== schoolId) continue;
      // If student, filter class-targeted posts to either ALL or student's own class
      if (
        currentUserRole === "STUDENT" &&
        p.classId &&
        p.classId !== "ALL" &&
        studentClassId &&
        p.classId !== studentClassId &&
        (!p.className || !studentClassName || p.className.toLowerCase() !== studentClassName.toLowerCase())
      ) {
        continue;
      }
      map.set(p.id, p);
    }

    // 2. Live Notices from NoticeBoardManager (if not already mirrored)
    for (const n of liveNotices) {
      if (n.schoolId && n.schoolId !== schoolId) continue;
      const mirrorId = `notice_${n.id}`;
      const alreadyHas = Array.from(map.values()).some(
        (existing) => existing.id === mirrorId || (existing.title && n.title && existing.title === n.title && existing.category === "NOTICE")
      );
      if (!alreadyHas) {
        map.set(mirrorId, {
          id: mirrorId,
          schoolId,
          schoolName,
          title: n.title || "Official Circular",
          text: n.content || n.body || n.message || "",
          category: n.category === "holiday" ? "HOLIDAY" : "NOTICE",
          authorId: n.createdBy || "admin",
          authorName: `${schoolName} Office`,
          authorRole: "ADMIN",
          isPinned: n.priority === "urgent" || n.important === true,
          commentsEnabled: true,
          createdAt: n.createdAt || new Date().toISOString(),
        });
      }
    }

    // 3. Live Holidays from HolidayManager (if not already mirrored)
    for (const h of liveHolidays) {
      if (h.schoolId && h.schoolId !== schoolId) continue;
      const mirrorId = `holiday_${h.id}`;
      const alreadyHas = Array.from(map.values()).some(
        (existing) =>
          existing.id === mirrorId ||
          (existing.category === "HOLIDAY" && existing.title?.toLowerCase() === (h.name || "").toLowerCase())
      );
      if (!alreadyHas && h.name) {
        map.set(mirrorId, {
          id: mirrorId,
          schoolId,
          schoolName,
          title: `${h.name} — अवकाश सूचना`,
          text: h.description || `${h.name} के अवसर पर विद्यालय बंद रहेगा।`,
          category: "HOLIDAY",
          holidayStartDate: h.startDate || h.date,
          holidayEndDate: h.endDate,
          authorId: "admin",
          authorName: `${schoolName} Administration`,
          authorRole: "ADMIN",
          isPinned: false,
          commentsEnabled: false,
          createdAt: h.createdAt || `${h.startDate || "2026-04-01"}T08:00:00.000Z`,
        });
      }
    }

    // 4. Demo fallback ONLY if demo mode is enabled for default demo school and feed is empty
    if (map.size === 0 && isDemoDataEnabled() && schoolId === "dps_gurgaon_sector45") {
      const demo = getDemoSchoolDataset();
      (demo?.holidays || []).slice(0, 3).forEach((dh: any, i: number) => {
        map.set(`demo_hol_${i}`, {
          id: `demo_hol_${i}`,
          schoolId,
          schoolName,
          title: `${dh.name} (Holiday Notice)`,
          text: dh.description || "विद्यालय में अवकाश घोषित है।",
          category: "HOLIDAY",
          holidayStartDate: dh.date,
          holidayEndDate: dh.endDate,
          authorId: "demo_admin",
          authorName: `${schoolName} Principal Office`,
          authorRole: "ADMIN",
          createdAt: `${dh.date}T08:00:00.000Z`,
        });
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [communityPosts, liveNotices, liveHolidays, schoolId, schoolName, currentUserRole, studentClassId, studentClassName]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === "ALL") return unifiedFeed;
    if (activeFilter === "EVENT_MEDIA") {
      return unifiedFeed.filter((p) => p.category === "EVENT_MEDIA" || Boolean(p.imageUrl) || Boolean(p.videoUrl));
    }
    return unifiedFeed.filter((p) => p.category === activeFilter);
  }, [unifiedFeed, activeFilter]);

  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const hols = [...liveHolidays];
    if (hols.length === 0 && isDemoDataEnabled() && schoolId === "dps_gurgaon_sector45") {
      return (getDemoSchoolDataset()?.holidays || []).filter((h: any) => h.date >= today).slice(0, 6);
    }
    return hols
      .filter((h: any) => (h.endDate || h.startDate || h.date || "") >= today)
      .sort((a: any, b: any) => (a.startDate || a.date || "").localeCompare(b.startDate || b.date || ""))
      .slice(0, 6);
  }, [liveHolidays, schoolId]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Instant local preview so user doesn't have to wait to see their photo
    const localPreview = URL.createObjectURL(file);
    setUploadedImageUrl(localPreview);
    setUploadingMedia("IMAGE");
    setUploadProgress(30);

    try {
      // Fast client-side compressed upload (1280px Web JPEG under 200KB)
      const url = await uploadImageToImgBB(file, `school_${schoolId}_${Date.now()}.jpg`, {
        isHd: false,
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.82,
      });
      setUploadedImageUrl(url);
      setUploadProgress(100);
      showToast("ok", "⚡ Photo instant attach ho gayi!");
    } catch (err: any) {
      showToast("err", err?.message || "Photo cloud upload me samasya aayi par preview attach hai.");
    } finally {
      setUploadingMedia("NONE");
    }
  };

  const handleVideoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 45 * 1024 * 1024) {
      showToast("err", "Video 45 MB se chhota chunein taaki tezi se upload aur play ho sake.");
      return;
    }

    // Instant local preview
    const localVideoUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(localVideoUrl);
    setUploadingMedia("VIDEO");
    setUploadProgress(15);
    try {
      const result = await uploadToCloudinary(file, "video", (pct) => setUploadProgress(pct));
      setUploadedVideoUrl(result.secure_url || result.url);
      setUploadProgress(100);
      showToast("ok", "⚡ Video safaltapoorvak attach ho gaya hai.");
    } catch (err: any) {
      showToast("err", err?.message || "Video upload me samasya aayi.");
    } finally {
      setUploadingMedia("NONE");
    }
  };

  const handleAddVideoLink = () => {
    const rawUrl = window.prompt("YouTube ya Google Drive video ka link paste karein (0-second instant attach):");
    if (!rawUrl || !rawUrl.trim()) return;
    setUploadedVideoUrl(rawUrl.trim());
    showToast("ok", "⚡ Video link instant jud gaya!");
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !postTitle.trim() && !uploadedImageUrl && !uploadedVideoUrl) {
      showToast("err", "Post likhein ya Photo/Video jodein.");
      return;
    }

    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const postId = `scpost_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const selectedClassObj = classes.find((c) => c.id === targetClassId);

      const newPost: SchoolCommunityPost = {
        id: postId,
        schoolId,
        schoolName,
        title:
          postTitle.trim() ||
          (postCategory === "HOLIDAY"
            ? "अवकाश सूचना (Holiday Notice)"
            : postCategory === "NOTICE"
            ? "आधिकारिक सूचना (Official Notice)"
            : postCategory === "HOMEWORK"
            ? "क्लास अपडेट (Class Update)"
            : "कैंपस अपडेट (School Community)"),
        text: postText.trim(),
        category: postCategory,
        imageUrl: uploadedImageUrl || undefined,
        videoUrl: uploadedVideoUrl || undefined,
        holidayStartDate: postCategory === "HOLIDAY" ? holidayStart : undefined,
        holidayEndDate: postCategory === "HOLIDAY" && holidayEnd ? holidayEnd : undefined,
        classId: targetClassId !== "ALL" ? targetClassId : undefined,
        className: selectedClassObj?.name || undefined,
        authorId: currentUserId,
        authorName: currentUserName || (currentUserRole === "ADMIN" ? "Principal Office" : "Class Teacher"),
        authorRole: currentUserRole,
        isPinned,
        commentsEnabled,
        likes: {},
        comments: {},
        createdAt: nowIso,
      };

      await saveSchoolCommunityPost(newPost);

      // Keep Holiday Calendar & Notice Board 100% live-synced automatically!
      if (postCategory === "HOLIDAY" && holidayStart) {
        await saveSchoolHoliday(schoolId, {
          id: `hol_${postId}`,
          schoolId,
          name: newPost.title || "School Holiday",
          startDate: holidayStart,
          endDate: holidayEnd || holidayStart,
          type: "festival",
          description: newPost.text || `${newPost.title} के अवसर पर विद्यालय बंद रहेगा।`,
          createdAt: nowIso,
        } as any);
      } else if (postCategory === "NOTICE") {
        await saveNotice({
          id: `ntc_${postId}`,
          schoolId,
          title: newPost.title || "School Notice",
          content: newPost.text,
          category: "general",
          priority: isPinned ? "urgent" : "normal",
          targetAudience: targetClassId === "ALL" ? "all" : "students",
          targetClassId: targetClassId !== "ALL" ? targetClassId : undefined,
          createdBy: currentUserId,
          createdAt: nowIso,
        } as any);
      }

      // Send Lock-Screen Push Notification to all linked parents/students of THIS schoolId
      if (sendPushAlert && canCreateOfficialPost) {
        const isMemory = postCategory === "EVENT_MEDIA" || Boolean(uploadedImageUrl || uploadedVideoUrl);
        const pushType = postCategory === "HOLIDAY" ? "SCHOOL_HOLIDAY" : "SCHOOL_NOTICE";
        const mediaTag = uploadedVideoUrl ? " [Video 🎥]" : uploadedImageUrl ? " [Photo 📷]" : "";
        const dateNote =
          postCategory === "HOLIDAY" && holidayStart
            ? ` (${holidayEnd && holidayEnd !== holidayStart ? `${holidayStart} से ${holidayEnd}` : holidayStart})`
            : "";

        const categoryPrefix = postCategory === "HOLIDAY"
          ? "🏖️ अवकाश सूचना"
          : (isMemory ? "📸 School Memory & Event" : "📢 विद्यालय सूचना");

        const targetUrl = isMemory
          ? `/?schoolPortal=1&schoolId=${encodeURIComponent(schoolId)}&schoolTab=events_memories`
          : `/?schoolPortal=1&schoolId=${encodeURIComponent(schoolId)}&schoolTab=community`;

        void sendSchoolPushNotification({
          schoolId,
          classId: targetClassId !== "ALL" ? targetClassId : undefined,
          type: pushType,
          title: `${schoolName} • ${categoryPrefix}: ${newPost.title}${mediaTag}`,
          body: `${(newPost.text || "नया अपडेट देखने के लिए टैप करें").slice(0, 140)}${dateNote}`,
          url: targetUrl,
          urgent: true,
        });
      }

      // Reset form
      setPostTitle("");
      setPostText("");
      setUploadedImageUrl("");
      setUploadedVideoUrl("");
      setHolidayEnd("");
      setIsPinned(false);
      setShowComposer(false);
      showToast(
        "ok",
        sendPushAlert
          ? "Community Post लाइव हो गई और जुड़े छात्रों को Lock-Screen Push भेज दिया गया!"
          : "Community Post सफलतापूर्वक लाइव हो गई!"
      );
    } catch (err: any) {
      showToast("err", err?.message || "Post publish karne me samasya aayi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (post: SchoolCommunityPost) => {
    if (post.id.startsWith("notice_") || post.id.startsWith("holiday_") || post.id.startsWith("demo_")) {
      // Promote mirrored item to community_posts on first like so reactions persist live
      const promoted: SchoolCommunityPost = {
        ...post,
        likes: { ...(post.likes || {}), [safeUserKey]: true },
      };
      await saveSchoolCommunityPost(promoted);
      return;
    }
    const alreadyLiked = Boolean(post.likes?.[safeUserKey]);
    await toggleSchoolCommunityLike(schoolId, post.id, currentUserId, alreadyLiked);
  };

  const handleAddComment = async (post: SchoolCommunityPost) => {
    const draft = (commentDrafts[post.id] || "").trim();
    if (!draft) return;
    const newComment: SchoolCommunityComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: currentUserId,
      userName: currentUserName || "Member",
      userRole: currentUserRole,
      text: draft,
      createdAt: new Date().toISOString(),
    };

    setCommentDrafts((prev) => ({ ...prev, [post.id]: "" }));

    if (post.id.startsWith("notice_") || post.id.startsWith("holiday_")) {
      await saveSchoolCommunityPost({
        ...post,
        comments: { ...(post.comments || {}), [newComment.id]: newComment },
      });
    } else {
      await addSchoolCommunityComment(schoolId, post.id, newComment);
    }
  };

  const handleSharePost = async (post: SchoolCommunityPost) => {
    const shareText = `${schoolName}\n${post.title ? `${post.title}\n` : ""}${post.text || ""}${
      post.holidayStartDate ? `\nDate: ${post.holidayStartDate}${post.holidayEndDate ? ` to ${post.holidayEndDate}` : ""}` : ""
    }`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: post.title || schoolName, text: shareText });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        showToast("ok", "संदेश कॉपी हो गया — अब कहीं भी शेयर करें।");
      } catch {}
    }
  };

  const handleToggleCommentsAllowed = async (post: SchoolCommunityPost) => {
    if (!canCreateOfficialPost) return;
    await saveSchoolCommunityPost({
      ...post,
      commentsEnabled: post.commentsEnabled === false ? true : false,
    });
  };

  const handleDeletePost = async (post: SchoolCommunityPost) => {
    try {
      // 1. Delete from community_posts
      await deleteSchoolCommunityPost(schoolId, post.id);

      // 2. If it is a holiday, remove from school holidays calendar & custom holidays
      if (
        post.category === "HOLIDAY" ||
        post.id.startsWith("holiday_") ||
        post.id.startsWith("holpost_") ||
        post.id.startsWith("hol_")
      ) {
        const cleanHolidayId = post.id.replace(/^(holiday_|holpost_|hol_)/, "");
        await deleteSchoolHoliday(schoolId, cleanHolidayId);
        await deleteSchoolHoliday(schoolId, post.id);
        removeCustomHoliday(cleanHolidayId);
        removeCustomHoliday(post.id);
      }

      // 3. If it is a notice, remove from notices
      if (post.id.startsWith("notice_") || post.id.startsWith("ntc_")) {
        const cleanNoticeId = post.id.replace(/^(notice_|ntc_)/, "");
        await deleteNotice(schoolId, cleanNoticeId);
        await deleteNotice(schoolId, post.id);
      }

      // Immediate optimistic update
      setCommunityPosts((prev) => prev.filter((p) => p.id !== post.id));
      setLiveNotices((prev) => prev.filter((n) => n.id !== post.id && `notice_${n.id}` !== post.id));
      setLiveHolidays((prev) => prev.filter((h) => h.id !== post.id && `holiday_${h.id}` !== post.id));

      setConfirmDeleteId(null);
      showToast("ok", "पोस्ट / अवकाश सफलतापूर्वक हटा दिया गया (Deleted successfully)");
    } catch (err: any) {
      showToast("err", err?.message || "Delete karne me samasya aayi.");
    }
  };

  const formatPostTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryLabel = (cat: SchoolCommunityPost["category"]) => {
    switch (cat) {
      case "HOLIDAY":
        return "Holiday Announcement";
      case "NOTICE":
        return "Official Circular";
      case "EVENT_MEDIA":
        return "Campus Media";
      case "HOMEWORK":
        return "Class Update";
      default:
        return "Community Update";
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer shrink-0"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {schoolName} Community &amp; Notices
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              छुट्टी की सूचना, आधिकारिक नोटिस, स्कूल फ़ोटो और वीडियो लाइव फ़ीड
            </p>
          </div>
        </div>

        {canCreateOfficialPost && (
          <button
            onClick={() => setShowComposer((v) => !v)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>{showComposer ? "Close Composer" : "+ Post Photo / Video / Chhutti"}</span>
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toastMsg.type === "ok"
              ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-200"
              : "bg-rose-950/70 border-rose-700/60 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin / Teacher Rich Media & Holiday Composer */}
      {canCreateOfficialPost && showComposer && (
        <form
          onSubmit={handlePublishPost}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Create School Community Post</h3>
            <span className="text-xs text-slate-400">
              Posting as {currentUserName} · {currentUserRole}
            </span>
          </div>

          {/* Post Type Segmented Control */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {[
              { id: "NOTICE", label: "Official Notice", icon: Megaphone },
              { id: "HOLIDAY", label: "Holiday (छुट्टी)", icon: Calendar },
              { id: "EVENT_MEDIA", label: "Photo / Video", icon: ImageIcon },
              { id: "HOMEWORK", label: "Class Update", icon: BookOpen },
            ].map((item) => {
              const Icon = item.icon;
              const active = postCategory === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPostCategory(item.id as any);
                    if (item.id === "HOLIDAY") setIsPinned(true);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    active ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Holiday Date Range Picker */}
          {postCategory === "HOLIDAY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">छुट्टी शुरू होने की तारीख *</label>
                <input
                  type="date"
                  value={holidayStart}
                  onChange={(e) => setHolidayStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">कब तक (Optional End Date)</label>
                <input
                  type="date"
                  value={holidayEnd}
                  min={holidayStart}
                  onChange={(e) => setHolidayEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Title & Class Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-300 block mb-1">शीर्षक (Headline)</label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder={
                  postCategory === "HOLIDAY"
                    ? "उदा. छठ पूजा / शीतकालीन अवकाश सूचना"
                    : "उदा. वार्षिक खेलकूद समारोह / अभिभावक मीटिंग"
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">किस क्लास के लिए</label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">पूरे स्कूल के लिए (All Classes)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section ? `(${cls.section})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Post Message */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">विवरण / संदेश</label>
            <textarea
              rows={3}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="पूरी जानकारी यहाँ लिखें..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 resize-y"
            />
          </div>

          {/* Media Previews */}
          {(uploadedImageUrl || uploadedVideoUrl || uploadingMedia !== "NONE") && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              {uploadingMedia !== "NONE" && (
                <div className="flex items-center gap-3 text-xs text-emerald-300">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    {uploadingMedia === "VIDEO" ? "Video upload ho raha hai..." : "HD Photo process ho rahi hai..."} (
                    {uploadProgress}%)
                  </span>
                </div>
              )}

              {uploadedImageUrl && (
                <div className="relative inline-block">
                  <img
                    src={resolveTelegramUrl(uploadedImageUrl)}
                    alt="Attached preview"
                    className="max-h-52 rounded-xl border border-slate-700 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setUploadedImageUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/90 text-rose-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {uploadedVideoUrl && (
                <div className="relative max-w-md">
                  {extractYouTubeVideoId(uploadedVideoUrl) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeVideoId(uploadedVideoUrl)}`}
                      title="YouTube Video Preview"
                      className="w-full aspect-video rounded-xl border border-slate-700 bg-black"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={getOptimizedVideoUrl(uploadedVideoUrl)}
                      controls
                      playsInline
                      className="w-full max-h-56 rounded-xl border border-slate-700 bg-black"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setUploadedVideoUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/90 text-rose-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Media Upload Buttons & Push Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePick}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                className="hidden"
                onChange={handleVideoPick}
              />

              <button
                type="button"
                disabled={uploadingMedia !== "NONE"}
                onClick={() => photoInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Add Photo (⚡ Fast)</span>
              </button>

              <button
                type="button"
                disabled={uploadingMedia !== "NONE"}
                onClick={() => videoInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Video className="w-4 h-4 text-sky-400" />
                <span>Upload Video</span>
              </button>

              <button
                type="button"
                onClick={handleAddVideoLink}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-red-500/30 text-red-300"
                title="YouTube ya Drive video link paste karein (0-second instant attach)"
              >
                <Youtube className="w-4 h-4 text-red-400" />
                <span>Link Video (0s ⚡)</span>
              </button>

              <label className="flex items-center gap-1.5 text-xs text-slate-300 px-2 py-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span>Pin Top</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-300 px-2 py-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendPushAlert}
                  onChange={(e) => setSendPushAlert(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Lock-Screen Push भेजें</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingMedia !== "NONE"}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{submitting ? "Publishing..." : "Publish Now"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Interactive Filter Segmented Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
        {[
          { id: "ALL", label: `All Feed (${unifiedFeed.length})` },
          { id: "HOLIDAY", label: "Holidays (छुट्टी)" },
          { id: "NOTICE", label: "Official Notices" },
          { id: "EVENT_MEDIA", label: "Photos & Videos" },
          { id: "HOMEWORK", label: "Class Updates" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as FeedFilter)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeFilter === tab.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upcoming Holidays Horizontal Strip (when viewing All or Holiday) */}
      {(activeFilter === "ALL" || activeFilter === "HOLIDAY") && upcomingHolidays.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-white">Upcoming School Holidays &amp; Festivals</h3>
            <span className="text-xs text-slate-400">{upcomingHolidays.length} Scheduled</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {upcomingHolidays.map((hol: any, idx: number) => {
              const start = hol.startDate || hol.date || "";
              const end = hol.endDate && hol.endDate !== start ? ` to ${hol.endDate}` : "";
              return (
                <div
                  key={hol.id || `up-hol-${idx}`}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{hol.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                      {start}
                      {end}
                    </p>
                  </div>
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Community Feed Stream */}
      {filteredPosts.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
          <Megaphone className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">अभी इस सेक्शन में कोई पोस्ट नहीं है</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            जैसे ही स्कूल एडमिन या टीचर कोई छुट्टी का नोटिस, फोटो या वीडियो शेयर करेंगे, यहाँ तुरंत लाइव दिखेगा।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const likeKeys = Object.keys(post.likes || {});
            const isLiked = Boolean(post.likes?.[safeUserKey]);
            const commentsArr = Object.values(post.comments || {}).sort((a, b) =>
              (a.createdAt || "").localeCompare(b.createdAt || "")
            );
            const commentsOpen = Boolean(openCommentsMap[post.id]);
            const canDelete =
              currentUserRole === "ADMIN" ||
              (currentUserRole === "TEACHER" && (post.authorId === currentUserId || post.authorRole === "TEACHER")) ||
              post.authorId === currentUserId;

            return (
              <article
                key={post.id}
                className={`rounded-2xl bg-slate-900 border transition overflow-hidden ${
                  post.category === "HOLIDAY"
                    ? "border-amber-500/40"
                    : post.isPinned
                    ? "border-emerald-500/40"
                    : "border-slate-800"
                }`}
              >
                {/* Post Header */}
                <div className="p-4 sm:px-5 sm:pt-5 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        post.category === "HOLIDAY"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {(post.authorName || "S").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{post.authorName}</span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs text-slate-400">{getCategoryLabel(post.category)}</span>
                        {post.className && (
                          <>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-emerald-400 font-medium">{post.className}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>{formatPostTime(post.createdAt)}</span>
                        {post.isPinned && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                              <Pin className="w-3 h-3" /> Pinned
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Admin / Author Controls */}
                  {canDelete && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCommentsAllowed(post)}
                        className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title={post.commentsEnabled === false ? "Enable Comments" : "Disable Comments"}
                      >
                        {post.commentsEnabled === false ? (
                          <Lock className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>

                      {confirmDeleteId === post.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition shadow-xs flex items-center gap-1 active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{post.category === "HOLIDAY" ? "Delete Holiday" : "Delete"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(post.id)}
                          className={`p-1.5 sm:p-2 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                            post.category === "HOLIDAY"
                              ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30"
                              : "text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                          }`}
                          title={post.category === "HOLIDAY" ? "Delete Holiday Announcement" : "Delete Post"}
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          {post.category === "HOLIDAY" && (
                            <span className="text-[11px] font-bold text-rose-300 hidden sm:inline">Delete Holiday</span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Post Body */}
                <div className="px-4 sm:px-5 pb-3 space-y-2">
                  {post.title && <h3 className="text-sm sm:text-base font-bold text-white">{post.title}</h3>}

                  {post.category === "HOLIDAY" && post.holidayStartDate && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                      <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        अवकाश तिथि:{" "}
                        <strong className="font-mono">
                          {post.holidayStartDate}
                          {post.holidayEndDate && post.holidayEndDate !== post.holidayStartDate
                            ? ` से ${post.holidayEndDate}`
                            : ""}
                        </strong>
                      </span>
                    </div>
                  )}

                  {post.text && (
                    <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">{post.text}</p>
                  )}
                </div>

                {/* Rich Photo Attachment */}
                {post.imageUrl && (
                  <div className="px-4 sm:px-5 pb-3">
                    <div
                      onClick={() => setLightboxImage(resolveTelegramUrl(post.imageUrl!))}
                      className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer group max-h-[460px] flex items-center justify-center"
                    >
                      <img
                        src={resolveTelegramUrl(post.imageUrl)}
                        alt={post.title || "School Community Photo"}
                        className="w-full max-h-[460px] object-contain group-hover:scale-[1.01] transition-transform"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}

                {/* Rich Video Attachment */}
                {post.videoUrl && (
                  <div className="px-4 sm:px-5 pb-3">
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                      {extractYouTubeVideoId(post.videoUrl) ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeVideoId(post.videoUrl)}`}
                          title={post.title || "School Community Video"}
                          className="w-full aspect-video rounded-xl"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={getOptimizedVideoUrl(post.videoUrl)}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full max-h-[440px]"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Action Bar: Like, Comment, Share, Download */}
                <div className="px-4 sm:px-5 py-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => void handleToggleLike(post)}
                      className={`inline-flex items-center gap-1.5 font-semibold transition cursor-pointer ${
                        isLiked ? "text-rose-400" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                      <span className="tabular-nums">{likeKeys.length > 0 ? likeKeys.length : "Like"}</span>
                    </button>

                    {post.commentsEnabled !== false && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCommentsMap((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                        }
                        className="inline-flex items-center gap-1.5 font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="tabular-nums">
                          {commentsArr.length > 0 ? `${commentsArr.length} Comments` : "Comment"}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleSharePost(post)}
                      className="inline-flex items-center gap-1.5 font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>

                  {post.imageUrl && (
                    <a
                      href={resolveTelegramUrl(post.imageUrl)}
                      download={`school_post_${post.id}.jpg`}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 font-semibold transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save</span>
                    </a>
                  )}
                </div>

                {/* Expandable Comments Section */}
                {commentsOpen && post.commentsEnabled !== false && (
                  <div className="px-4 sm:px-5 py-3 bg-slate-950/70 border-t border-slate-800 space-y-3">
                    {commentsArr.length > 0 && (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {commentsArr.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-bold text-white">{c.userName}</span>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-400">{c.userRole}</span>
                              </div>
                              <p className="text-xs text-slate-300 mt-0.5 break-words">{c.text}</p>
                            </div>
                            {(canCreateOfficialPost || c.userId === currentUserId) && (
                              <button
                                type="button"
                                onClick={() => void deleteSchoolCommunityComment(schoolId, post.id, c.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer shrink-0"
                                title="Delete comment"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentDrafts[post.id] || ""}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddComment(post);
                          }
                        }}
                        placeholder="अपना रिप्लाई लिखें..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => void handleAddComment(post)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Full view"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] object-contain rounded-xl"
          />
        </div>
      )}
    </div>
  );
};

export default SchoolCommunityFeed;
