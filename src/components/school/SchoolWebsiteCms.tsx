import React, { useEffect, useState } from "react";
import {
  Camera,
  ChevronLeft,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Video,
  Copy,
  Check,
  Crown,
  Lock,
  Code2,
  Calculator,
  X,
  Megaphone,
  Wand2,
  ExternalLink,
  Percent,
  Tag,
  ArrowLeft,
  ArrowRight,
  Images,
} from "lucide-react";
import { toast } from "sonner";
import {
  hasCustomWebsiteCmsAccess,
  sortSchoolClasses,
  type AdmissionOfferConfig,
  type AdmissionOfferImage,
  type School,
  type SchoolClass,
  type SchoolGalleryItem,
  type SchoolTeacher,
  type SchoolWebsiteConfig,
  type SchoolWebsiteHighlight,
} from "../../school-types";
import {
  deleteSchoolGalleryItem,
  getClasses,
  getLocalClasses,
  getSchoolGallery,
  saveSchoolGalleryItem,
  updateSchool,
  updateTeacher,
} from "../../school-firebase";
import { compressImageFileToDataUrl } from "../../utils/imageCompression";
import { computeClassAdmissionOfferBreakdown } from "../../utils/admissionOfferUtils";
import {
  DEFAULT_GLOBAL_DEVELOPER,
  saveGlobalDeveloperConfig,
  subscribeToGlobalDeveloperConfig,
  type GlobalWebsiteDeveloperConfig,
} from "../../utils/globalDeveloperConfig";
import {
  buildDefaultSchoolTickerItems,
  parseCustomTickerItems,
  stripEmailFromTickerText,
} from "../../utils/schoolTickerUtils";
import {
  getDynamicAcademicSessionLabel,
  getUpcomingAdmissionSessionLabel,
  isSessionOlderOrEqual,
  normalizeSocialUrl,
  safeOpenExternalUrl,
  type SocialPlatformKey,
} from "../../utils/safeBrowserActions";
import { renderSocialPlatformIcon } from "./SchoolSocialIcons";

interface Props {
  school: School;
  teachers: SchoolTeacher[];
  isSuperAdmin?: boolean;
  onSchoolUpdated?: (updated: School) => void;
  onTeacherUpdated?: (teacherId: string, patch: Partial<SchoolTeacher>) => void;
  onPreviewWebsite: () => void;
  onUpgradePlan?: () => void;
  onBack: () => void;
}

const DEFAULT_HIGHLIGHTS: SchoolWebsiteHighlight[] = [
  {
    title: "AI Face Attendance",
    description:
      "Instant morning gate attendance verification with automatic real-time arrival updates for parents.",
    badge: "Smart Campus",
  },
  {
    title: "QR Verified Marksheets & ID Cards",
    description:
      "Every report card, transfer certificate, and student ID carries a scannable QR verification code.",
    badge: "Authentic",
  },
  {
    title: "Transparent Fee Passbook",
    description:
      "Itemized digital fee receipts, clear monthly ledger history, and instant due notifications.",
    badge: "100% Clear",
  },
];

export const SchoolWebsiteCms: React.FC<Props> = ({
  school,
  teachers,
  isSuperAdmin = false,
  onSchoolUpdated,
  onTeacherUpdated,
  onPreviewWebsite,
  onUpgradePlan,
  onBack,
}) => {
  const hasCustomWebsite = hasCustomWebsiteCmsAccess(school);
  const existingCfg: SchoolWebsiteConfig = school?.websiteConfig || {};
  const runningSession = getDynamicAcademicSessionLabel();
  const autoUpcomingSession = getUpcomingAdmissionSessionLabel(runningSession);
  const defaultSession =
    existingCfg.admissionSessionLabel && !isSessionOlderOrEqual(existingCfg.admissionSessionLabel, runningSession)
      ? existingCfg.admissionSessionLabel
      : autoUpcomingSession;

  const [activeTab, setActiveTab] = useState<"hero" | "offer" | "leadership" | "teachers" | "memories" | "contact">("hero");
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Admission Offer (% OFF + Multi-Photo Carousel) State
  const existingOffer: AdmissionOfferConfig = existingCfg.admissionOffer || {};
  const [offerEnabled, setOfferEnabled] = useState<boolean>(Boolean(existingOffer.enabled));
  const [offerBadgeText, setOfferBadgeText] = useState<string>(
    existingOffer.badgeText || "Special Admission Offer"
  );
  const [offerTitle, setOfferTitle] = useState<string>(
    existingOffer.title || `Early Bird Admission Offer · Session ${defaultSession}`
  );
  const [offerSubtitle, setOfferSubtitle] = useState<string>(
    existingOffer.subtitle ||
      "Complete class-wise admission fee package breakdown with instant percentage discount applied at admission."
  );
  const [offerDiscountPercent, setOfferDiscountPercent] = useState<number>(
    Math.max(0, Math.min(90, Number(existingOffer.discountPercent ?? 0)))
  );
  const [offerValidTill, setOfferValidTill] = useState<string>(existingOffer.validTill || "");
  const [offerApplyScope, setOfferApplyScope] = useState<"all" | "admission_only">(
    existingOffer.applyScope === "admission_only" ? "admission_only" : "all"
  );
  const [offerTermsNote, setOfferTermsNote] = useState<string>(
    existingOffer.termsNote || "Valid on new & online portal admissions for the active session."
  );
  const [offerImages, setOfferImages] = useState<AdmissionOfferImage[]>(
    Array.isArray(existingOffer.images) ? existingOffer.images : []
  );
  const [offerUrlDraft, setOfferUrlDraft] = useState<string>("");
  const [offerCaptionDraft, setOfferCaptionDraft] = useState<string>("");
  const [cmsClasses, setCmsClasses] = useState<SchoolClass[]>(() =>
    sortSchoolClasses(getLocalClasses(school.id))
  );
  const [offerPreviewClassId, setOfferPreviewClassId] = useState<string>("");

  // Core Website Form State
  const [admissionsOpen, setAdmissionsOpen] = useState<boolean>(existingCfg.admissionsOpen ?? true);
  const [admissionSessionLabel, setAdmissionSessionLabel] = useState<string>(defaultSession);
  const [heroBadgeText, setHeroBadgeText] = useState<string>(
    existingCfg.heroBadgeText || `Admissions Open · Session ${defaultSession}`
  );
  const [heroHeadline, setHeroHeadline] = useState<string>(
    existingCfg.heroHeadline || `Welcome to ${school.name}`
  );
  const [heroSubheadline, setHeroSubheadline] = useState<string>(
    existingCfg.heroSubheadline ||
      school.tagline ||
      "Discipline, modern smart classrooms, caring mentors, and a transparent digital parent portal."
  );
  const [heroBannerUrl, setHeroBannerUrl] = useState<string>(existingCfg.heroBannerUrl || "");
  const [tagline, setTagline] = useState<string>(school.tagline || "");
  const [bannerColor, setBannerColor] = useState<string>(school.bannerColor || "#1e3a8a");
  const [isDefaultPublic, setIsDefaultPublic] = useState<boolean>(Boolean(school.isDefaultPublicWebsite));

  // Top Publicity Scrolling Ticker (Email ID excluded)
  const [topTickerEnabled, setTopTickerEnabled] = useState<boolean>(existingCfg.topTickerEnabled ?? true);
  const [topTickerSpeed, setTopTickerSpeed] = useState<"slow" | "normal" | "fast">(
    existingCfg.topTickerSpeed || "slow"
  );
  const [topTickerText, setTopTickerText] = useState<string>(existingCfg.topTickerText || "");

  // Leadership & Website Roles (Each Role Separated with Individual Name & Photo)
  const [principalName, setPrincipalName] = useState<string>(school.principalName || "");
  const [principalPhotoUrl, setPrincipalPhotoUrl] = useState<string>(school.principalPhotoUrl || "");
  const [subPrincipalName, setSubPrincipalName] = useState<string>(
    school.subPrincipalName || existingCfg.subPrincipalName || ""
  );
  const [subPrincipalPhotoUrl, setSubPrincipalPhotoUrl] = useState<string>(
    school.subPrincipalPhotoUrl || existingCfg.subPrincipalPhotoUrl || ""
  );
  const [directorName, setDirectorName] = useState<string>(school.directorName || "");
  const [directorPhotoUrl, setDirectorPhotoUrl] = useState<string>(
    school.directorPhotoUrl || existingCfg.directorPhotoUrl || ""
  );
  const [managerName, setManagerName] = useState<string>(school.managerName || "");
  const [managerPhotoUrl, setManagerPhotoUrl] = useState<string>(
    school.managerPhotoUrl || existingCfg.managerPhotoUrl || ""
  );
  // Website Accountant is explicitly kept separate from school.accountantName (ERP / Fee Receipts)
  const [websiteAccountantName, setWebsiteAccountantName] = useState<string>(
    existingCfg.websiteAccountantName || ""
  );
  const [websiteAccountantPhotoUrl, setWebsiteAccountantPhotoUrl] = useState<string>(
    existingCfg.websiteAccountantPhotoUrl || ""
  );
  const [digitalCreatorName, setDigitalCreatorName] = useState<string>(
    school.digitalCreatorName || existingCfg.digitalCreatorName || ""
  );
  const [digitalCreatorPhotoUrl, setDigitalCreatorPhotoUrl] = useState<string>(
    school.digitalCreatorPhotoUrl || existingCfg.digitalCreatorPhotoUrl || ""
  );

  // Global Developer Config (Default across all schools; Life Maker Super Admin only)
  const [globalDeveloper, setGlobalDeveloper] = useState<GlobalWebsiteDeveloperConfig>(
    DEFAULT_GLOBAL_DEVELOPER
  );
  const [devDraftName, setDevDraftName] = useState<string>(DEFAULT_GLOBAL_DEVELOPER.name);
  const [devDraftRole, setDevDraftRole] = useState<string>(DEFAULT_GLOBAL_DEVELOPER.roleTitle);
  const [devDraftOrg, setDevDraftOrg] = useState<string>(DEFAULT_GLOBAL_DEVELOPER.organization);
  const [devDraftPhotoUrl, setDevDraftPhotoUrl] = useState<string>(DEFAULT_GLOBAL_DEVELOPER.photoUrl);
  const [savingGlobalDev, setSavingGlobalDev] = useState(false);

  const [principalMessage, setPrincipalMessage] = useState<string>(
    existingCfg.principalMessage ||
      `At ${school.name}, our commitment is to blend strong academic foundations with digital transparency, safety, and character building for every student.`
  );
  const [aboutSchool, setAboutSchool] = useState<string>(
    existingCfg.aboutSchool ||
      `${school.name}${school.address ? `, located at ${school.address},` : ""} provides structured K-12 education supported by our real-time School Management System.`
  );

  // Highlights (USPs)
  const [highlights, setHighlights] = useState<SchoolWebsiteHighlight[]>(() =>
    Array.isArray(existingCfg.highlights) && existingCfg.highlights.length > 0
      ? existingCfg.highlights
      : DEFAULT_HIGHLIGHTS
  );

  // Hidden Teacher IDs
  const [hiddenTeacherIds, setHiddenTeacherIds] = useState<string[]>(
    Array.isArray(existingCfg.hiddenTeacherIds) ? existingCfg.hiddenTeacherIds : []
  );

  // Contact, Maps & Social Links
  const [phone, setPhone] = useState<string>(school.phone || "");
  const [whatsappNumber, setWhatsappNumber] = useState<string>(
    existingCfg.whatsappNumber || school.phone || ""
  );
  const [email, setEmail] = useState<string>(school.email || "");
  const [address, setAddress] = useState<string>(school.address || "");
  const [officeHours, setOfficeHours] = useState<string>(
    existingCfg.officeHours || "Mon – Sat · 8:00 AM – 2:30 PM"
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>(existingCfg.googleMapsUrl || "");
  const [instagramUrl, setInstagramUrl] = useState<string>(existingCfg.instagramUrl || "");
  const [youtubeUrl, setYoutubeUrl] = useState<string>(existingCfg.youtubeUrl || "");
  const [facebookUrl, setFacebookUrl] = useState<string>(existingCfg.facebookUrl || "");
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState<string>(existingCfg.whatsappGroupUrl || "");

  // Gallery & Memories
  const [galleryItems, setGalleryItems] = useState<SchoolGalleryItem[]>([]);
  const [newMemTitle, setNewMemTitle] = useState("");
  const [newMemCategory, setNewMemCategory] = useState<SchoolGalleryItem["category"]>("ANNUAL");
  const [newMemDate, setNewMemDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newMemMediaType, setNewMemMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [newMemUrl, setNewMemUrl] = useState("");
  const [newMemVideoUrl, setNewMemVideoUrl] = useState("");
  const [newMemDesc, setNewMemDesc] = useState("");
  const [addingMem, setAddingMem] = useState(false);

  useEffect(() => {
    let active = true;
    getSchoolGallery(school.id)
      .then((remote) => {
        if (!active) return;
        let merged = [...remote];
        try {
          const localRaw = localStorage.getItem(`school_memories_${school.id}`);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (Array.isArray(parsed)) {
              parsed.forEach((m: any) => {
                if (m?.id && !merged.some((x) => x.id === m.id)) {
                  merged.push({
                    id: m.id,
                    schoolId: school.id,
                    title: m.title || "Campus Memory",
                    category: m.category || "CAMPUS",
                    imageUrl: m.url || m.imageUrl || "",
                    videoUrl: m.videoUrl || "",
                    mediaType: m.type === "VIDEO" ? "VIDEO" : "IMAGE",
                    description: m.description || "",
                    date: m.date || "",
                    createdAt: m.date || new Date().toISOString(),
                  } as any);
                }
              });
            }
          }
        } catch {}
        setGalleryItems(merged);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [school.id]);

  useEffect(() => {
    const unsub = subscribeToGlobalDeveloperConfig((cfg) => {
      setGlobalDeveloper(cfg);
      setDevDraftName(cfg.name);
      setDevDraftRole(cfg.roleTitle);
      setDevDraftOrg(cfg.organization);
      setDevDraftPhotoUrl(cfg.photoUrl);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let active = true;
    const localCls = sortSchoolClasses(getLocalClasses(school.id));
    if (localCls.length > 0) {
      setCmsClasses(localCls);
      setOfferPreviewClassId((prev) => prev || localCls[0].id);
    }
    getClasses(school.id)
      .then((cls) => {
        if (!active || !Array.isArray(cls) || cls.length === 0) return;
        const sorted = sortSchoolClasses(cls);
        setCmsClasses(sorted);
        setOfferPreviewClassId((prev) => prev || sorted[0].id);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [school.id]);

  const handleCompressAndSet = async (
    file: File | undefined,
    key: string,
    onResult: (dataUrl: string) => void | Promise<void>
  ) => {
    if (!file) return;
    setUploadingKey(key);
    try {
      const isHero = key === "hero";
      const res = await compressImageFileToDataUrl(file, {
        maxWidth: isHero ? 1400 : 600,
        maxHeight: isHero ? 900 : 600,
        maxSizeBytes: isHero ? 240 * 1024 : 120 * 1024,
      });
      await onResult(res.dataUrl);
      toast.success(`फोटो सफलतापूर्वक ऑप्टिमाइज़ होकर सेट हुई (${res.sizeKB} KB ${res.format.toUpperCase()})`);
    } catch (err) {
      console.warn("Image compression failed:", err);
      toast.error("फोटो प्रोसेस नहीं हो पाई। कृपया दूसरी इमेज चुनें।");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleUploadMultipleOfferImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingKey("offer_multi");
    const added: AdmissionOfferImage[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const res = await compressImageFileToDataUrl(file, {
          maxWidth: 1200,
          maxHeight: 800,
          maxSizeBytes: 220 * 1024,
        });
        added.push({
          id: `offer_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.dataUrl,
          caption: offerCaptionDraft.trim() || "",
        });
      }
      if (added.length > 0) {
        setOfferImages((prev) => [...prev, ...added]);
        setOfferCaptionDraft("");
        toast.success(`${added.length} ऑफर फोटो जोड़ी गईं! अब "Save Website Changes" दबाएं।`);
      }
    } catch (err) {
      console.warn("Offer image upload failed:", err);
      toast.error("फोटो अपलोड करने में समस्या आई।");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleAddOfferImageUrl = () => {
    const clean = offerUrlDraft.trim();
    if (!clean) {
      toast.error("कृपया Image URL दर्ज करें।");
      return;
    }
    setOfferImages((prev) => [
      ...prev,
      {
        id: `offer_url_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: clean,
        caption: offerCaptionDraft.trim() || "",
      },
    ]);
    setOfferUrlDraft("");
    setOfferCaptionDraft("");
    toast.success("Offer Image URL जोड़ा गया!");
  };

  const moveOfferImage = (idx: number, dir: -1 | 1) => {
    setOfferImages((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleTeacherPhotoUpload = async (teacher: SchoolTeacher, file: File | undefined) => {
    await handleCompressAndSet(file, `teacher_${teacher.id}`, async (dataUrl) => {
      await updateTeacher(school.id, teacher.id, { photoUrl: dataUrl });
      onTeacherUpdated?.(teacher.id, { photoUrl: dataUrl });
    });
  };

  const handleSaveGlobalDeveloper = async () => {
    if (!isSuperAdmin) return;
    setSavingGlobalDev(true);
    try {
      const updated = await saveGlobalDeveloperConfig({
        name: devDraftName.trim() || DEFAULT_GLOBAL_DEVELOPER.name,
        roleTitle: devDraftRole.trim() || DEFAULT_GLOBAL_DEVELOPER.roleTitle,
        organization: devDraftOrg.trim() || DEFAULT_GLOBAL_DEVELOPER.organization,
        photoUrl: devDraftPhotoUrl.trim(),
      });
      setGlobalDeveloper(updated);
      toast.success("Global Developer Profile updated across ALL schools!");
    } catch (err) {
      console.warn("Failed to save global developer config:", err);
      toast.error("Global Developer अपडेट सेव नहीं हो सका।");
    } finally {
      setSavingGlobalDev(false);
    }
  };

  const handleSaveWebsiteConfig = async () => {
    setSaving(true);
    try {
      const nextCfg: SchoolWebsiteConfig = {
        ...existingCfg,
        admissionsOpen,
        admissionSessionLabel: admissionSessionLabel.trim() || defaultSession,
        heroBadgeText: heroBadgeText.trim(),
        heroHeadline: heroHeadline.trim(),
        heroSubheadline: heroSubheadline.trim(),
        heroBannerUrl: heroBannerUrl.trim(),
        principalMessage: principalMessage.trim(),
        aboutSchool: aboutSchool.trim(),
        subPrincipalName: subPrincipalName.trim(),
        subPrincipalPhotoUrl: subPrincipalPhotoUrl.trim(),
        directorPhotoUrl: directorPhotoUrl.trim(),
        managerPhotoUrl: managerPhotoUrl.trim(),
        websiteAccountantName: websiteAccountantName.trim(),
        websiteAccountantPhotoUrl: websiteAccountantPhotoUrl.trim(),
        digitalCreatorName: digitalCreatorName.trim(),
        digitalCreatorPhotoUrl: digitalCreatorPhotoUrl.trim(),
        whatsappNumber: whatsappNumber.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        officeHours: officeHours.trim(),
        highlights,
        hiddenTeacherIds,
        topTickerEnabled,
        topTickerSpeed,
        topTickerText: stripEmailFromTickerText(topTickerText),
        instagramUrl: normalizeSocialUrl(instagramUrl, "instagram"),
        youtubeUrl: normalizeSocialUrl(youtubeUrl, "youtube"),
        facebookUrl: normalizeSocialUrl(facebookUrl, "facebook"),
        whatsappGroupUrl: normalizeSocialUrl(whatsappGroupUrl, "whatsapp_group"),
        admissionOffer: {
          enabled: offerEnabled,
          badgeText: offerBadgeText.trim() || "Special Admission Offer",
          title: offerTitle.trim() || `Admission Offer · Session ${admissionSessionLabel || defaultSession}`,
          subtitle: offerSubtitle.trim(),
          discountPercent: Math.max(0, Math.min(90, Math.round(Number(offerDiscountPercent || 0)))),
          validTill: offerValidTill.trim(),
          applyScope: offerApplyScope,
          termsNote: offerTermsNote.trim(),
          images: offerImages.filter((im) => Boolean(im?.url?.trim())).map((im) => ({
            id: im.id,
            url: im.url.trim(),
            caption: (im.caption || "").trim(),
          })),
        },
        updatedAt: new Date().toISOString(),
      };

      const patch: Partial<School> = {
        tagline: tagline.trim(),
        bannerColor,
        principalName: principalName.trim(),
        principalPhotoUrl: principalPhotoUrl.trim(),
        subPrincipalName: subPrincipalName.trim(),
        subPrincipalPhotoUrl: subPrincipalPhotoUrl.trim(),
        directorName: directorName.trim(),
        directorPhotoUrl: directorPhotoUrl.trim(),
        managerName: managerName.trim(),
        managerPhotoUrl: managerPhotoUrl.trim(),
        digitalCreatorName: digitalCreatorName.trim(),
        digitalCreatorPhotoUrl: digitalCreatorPhotoUrl.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        isDefaultPublicWebsite: isDefaultPublic,
        websiteConfig: nextCfg,
      };

      await updateSchool(school.id, patch);
      const updatedSchool: School = { ...school, ...patch };
      onSchoolUpdated?.(updatedSchool);

      try {
        if (isDefaultPublic) {
          localStorage.setItem("nst_default_public_school_id", school.id);
        }
      } catch {}

      toast.success("स्कूल वेबसाइट सेटिंग्स सफलतापूर्वक सेव हो गईं!");
    } catch (err) {
      console.warn("Failed to save website CMS settings:", err);
      toast.error("वेबसाइट सेटिंग्स सेव नहीं हो सकीं।");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMemoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemTitle.trim()) {
      toast.error("कृपया Memory / Photo का शीर्षक लिखें।");
      return;
    }
    const finalImageUrl = newMemMediaType === "IMAGE" ? newMemUrl.trim() : "";
    const finalVideoUrl = newMemMediaType === "VIDEO" ? newMemVideoUrl.trim() : "";
    if (newMemMediaType === "IMAGE" && !finalImageUrl) {
      toast.error("कृपया फोटो अपलोड करें या Image URL डालें।");
      return;
    }
    if (newMemMediaType === "VIDEO" && !finalVideoUrl) {
      toast.error("कृपया YouTube वीडियो लिंक डालें।");
      return;
    }

    setAddingMem(true);
    try {
      const newItem: SchoolGalleryItem & {
        videoUrl?: string;
        mediaType?: string;
        description?: string;
        date?: string;
      } = {
        id: `mem_${Date.now()}`,
        schoolId: school.id,
        title: newMemTitle.trim(),
        category: newMemCategory,
        imageUrl: finalImageUrl || "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1000&q=80",
        videoUrl: finalVideoUrl,
        mediaType: newMemMediaType,
        description: newMemDesc.trim(),
        date: newMemDate,
        createdAt: new Date().toISOString(),
      };

      await saveSchoolGalleryItem(school.id, newItem);

      // Sync to school_memories_${schoolId} as well for backwards compatibility
      try {
        const curRaw = localStorage.getItem(`school_memories_${school.id}`);
        const cur = curRaw ? JSON.parse(curRaw) : [];
        const legacyItem = {
          id: newItem.id,
          title: newItem.title,
          category: newItem.category,
          date: newMemDate,
          type: newMemMediaType,
          url: newItem.imageUrl,
          videoUrl: finalVideoUrl,
          description: newMemDesc.trim() || "School event memory",
          tags: [newMemCategory],
          likes: 0,
        };
        localStorage.setItem(
          `school_memories_${school.id}`,
          JSON.stringify([legacyItem, ...(Array.isArray(cur) ? cur.filter((x: any) => x.id !== newItem.id) : [])])
        );
      } catch {}

      setGalleryItems((prev) => [newItem, ...prev]);
      setNewMemTitle("");
      setNewMemUrl("");
      setNewMemVideoUrl("");
      setNewMemDesc("");
      toast.success("स्कूल मेमोरी वेबसाइट गैलरी में जुड़ गई!");
    } catch {
      toast.error("मेमोरी सेव करने में समस्या आई।");
    } finally {
      setAddingMem(false);
    }
  };

  const handleDeleteMemoryItem = async (itemId: string) => {
    try {
      await deleteSchoolGalleryItem(school.id, itemId);
      setGalleryItems((prev) => prev.filter((x) => x.id !== itemId));
      try {
        const curRaw = localStorage.getItem(`school_memories_${school.id}`);
        if (curRaw) {
          const cur = JSON.parse(curRaw);
          if (Array.isArray(cur)) {
            localStorage.setItem(
              `school_memories_${school.id}`,
              JSON.stringify(cur.filter((x: any) => x.id !== itemId))
            );
          }
        }
      } catch {}
      toast.success("गैलरी से फोटो हटाई गई।");
    } catch {
      toast.error("हटाने में समस्या आई।");
    }
  };

  const toggleTeacherVisibility = (teacherId: string) => {
    setHiddenTeacherIds((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    );
  };

  const directSchoolUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?school=${encodeURIComponent(school.id)}`
      : `/?school=${encodeURIComponent(school.id)}`;

  if (!hasCustomWebsite) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={onPreviewWebsite}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Default Website देखें</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700/70 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Custom Website CMS — 👑 Elite Plan Required
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              आपका स्कूल अभी <strong>⚡ Lite Plan</strong> पर है। Lite प्लान में आपकी वेबसाइट पर{" "}
              <strong>Default School Website</strong> (स्कूल का नाम, पता, क्लास फ़ीस व ऑनलाइन एडमिशन फॉर्म) लाइव रहता है —
              कस्टम फोटो, बैनर, प्रिंसिपल/टीचर फोटो या गैलरी बदलाव नहीं किए जा सकते।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-black text-blue-700 dark:text-blue-400">⚡ Lite Plan (Current)</p>
              <p className="text-slate-600 dark:text-slate-400">
                डिफ़ॉल्ट स्कूल डेटा, फ़ीस टेबल व ऑनलाइन एडमिशन 2027–28 (No Custom Photos/CMS)
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-1">
              <p className="font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>Elite / White-Label Plan</span>
              </p>
              <p className="text-amber-900/80 dark:text-amber-200/80">
                कस्टम हीरो बैनर, प्रिंसिपल व टीचर फोटो, मेमोरीज़ गैलरी व कस्टम वेबसाइट एडिटिंग अनलॉक
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onUpgradePlan && (
              <button
                type="button"
                onClick={onUpgradePlan}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>Upgrade to Elite Plan</span>
              </button>
            )}
            <button
              type="button"
              onClick={onPreviewWebsite}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>View Default School Website</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(directSchoolUrl);
      setCopiedLink(true);
      toast.success("डायरेक्ट वेबसाइट लिंक कॉपी हो गया!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.info(directSchoolUrl);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Website Manager &amp; CMS (स्कूल वेबसाइट कंट्रोल)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {school.name} की पब्लिक वेबसाइट के बैनर, प्रिंसिपल संदेश, शिक्षक फोटो व मेमोरी गैलरी यहाँ से बदलें।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyShareUrl}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "लिंक कॉपी हुआ" : "Share Link"}</span>
          </button>
          <button
            type="button"
            onClick={onPreviewWebsite}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Website</span>
          </button>
          <button
            type="button"
            onClick={handleSaveWebsiteConfig}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : "Save Website Changes"}</span>
          </button>
        </div>
      </div>

      {/* CMS Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "hero", label: "Hero Banner & Admission", icon: Sparkles },
          {
            id: "offer",
            label:
              offerEnabled && offerDiscountPercent > 0
                ? `Admission Offer (${offerDiscountPercent}% OFF)`
                : "Admission Offer (% OFF)",
            icon: Percent,
          },
          { id: "leadership", label: "Leadership, Roles & USPs", icon: ShieldCheck },
          { id: "teachers", label: `Teachers & Photos (${teachers.length})`, icon: Users },
          { id: "memories", label: `Memories & Gallery (${galleryItems.length})`, icon: Camera },
          { id: "contact", label: "Contact, Social & Map", icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition cursor-pointer ${
                active
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: HERO BANNER & ADMISSIONS */}
      {activeTab === "hero" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Admission Session Label (सत्र)
              </label>
              <input
                type="text"
                value={admissionSessionLabel}
                onChange={(e) => setAdmissionSessionLabel(e.target.value)}
                placeholder="2027–28"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Top Admission Kicker / Badge Text
              </label>
              <input
                type="text"
                value={heroBadgeText}
                onChange={(e) => setHeroBadgeText(e.target.value)}
                placeholder="Admissions Open · Session 2027–28"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Main Website Headline (मुख्य शीर्षक)
              </label>
              <input
                type="text"
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
                placeholder="Future-Ready Campus, Smart Attendance & Transparent Parent Connect"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Hero Subheadline / Description (विवरण)
              </label>
              <textarea
                rows={2}
                value={heroSubheadline}
                onChange={(e) => setHeroSubheadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                School Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Excellence in Education & Discipline"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Brand Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bannerColor}
                  onChange={(e) => setBannerColor(e.target.value)}
                  className="w-11 h-10 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={bannerColor}
                  onChange={(e) => setBannerColor(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Hero Banner Image Upload + Preview */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7 space-y-2.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-200 block">
                School Hero Banner Image (WebP/JPEG ऑटो-कम्प्रेशन ≤ 250 KB)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold inline-flex items-center gap-2 cursor-pointer">
                  {uploadingKey === "hero" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{uploadingKey === "hero" ? "Compressing..." : "Upload Campus Banner Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleCompressAndSet(e.target.files?.[0], "hero", (url) => setHeroBannerUrl(url))
                    }
                  />
                </label>
                {heroBannerUrl && (
                  <button
                    type="button"
                    onClick={() => setHeroBannerUrl("")}
                    className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 font-bold cursor-pointer"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
              <input
                type="text"
                value={heroBannerUrl}
                onChange={(e) => setHeroBannerUrl(e.target.value)}
                placeholder="Or paste Image URL..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
              />
            </div>
            <div className="md:col-span-5 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
              {heroBannerUrl ? (
                <img src={heroBannerUrl} alt="Hero Banner Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4 text-xs text-slate-400">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-60" />
                  Default School Campus Image Active
                </div>
              )}
            </div>
          </div>

          {/* Top Publicity Ticker / Scrolling Marquee Editor */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                  <Megaphone className="w-4 h-4 text-amber-500" />
                  <span>Top Scrolling Publicity Ticker (ऊपर वाली चलती हुई प्रचार पट्टी)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  वेबसाइट के सबसे ऊपर धीरे-धीरे (और स्वाइप होने वाली) पट्टी में स्कूल के प्रचार की पूरी जानकारी दिखेगी — <strong>Email ID को छोड़कर</strong>। हर नई लाइन या <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">|</code> से अलग पॉइंट जुड़ते हैं।
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const generated = buildDefaultSchoolTickerItems({
                      school: {
                        ...school,
                        tagline,
                        phone,
                        address,
                        principalName,
                        websiteConfig: {
                          ...existingCfg,
                          whatsappNumber,
                          officeHours,
                        },
                      },
                      sessionLabel: admissionSessionLabel || defaultSession,
                      admissionsOpen,
                      highlights,
                    });
                    setTopTickerText(generated.join("\n"));
                    toast.success("स्कूल प्रचार के मुख्य पॉइंट्स (Email के बिना) भर दिए गए!");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-400/40 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto-Fill Promo Details (No Email)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={topTickerEnabled}
                  onChange={(e) => setTopTickerEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span>Enable Top Scrolling &amp; Swipeable Publicity Bar</span>
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="font-bold text-slate-600 dark:text-slate-300">Scroll Speed (रफ़्तार):</span>
                <select
                  value={topTickerSpeed}
                  onChange={(e) => setTopTickerSpeed(e.target.value as "slow" | "normal" | "fast")}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="slow">Slow (आस्ते-आस्ते · Default)</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Custom Publicity Ticker Lines (प्रचार संदेश — हर लाइन अलग आइटम बनेगी, खाली छोड़ने पर ऑटो-जनरेट होगा)
              </label>
              <textarea
                rows={4}
                value={topTickerText}
                onChange={(e) => setTopTickerText(e.target.value)}
                placeholder={`उदाहरण (हर लाइन में एक प्रचार जानकारी लिखें, Email ID न लिखें):\n${school.name} — Quality Education & Smart Campus\nAdmissions Open Session ${admissionSessionLabel || defaultSession}\nAdmission Helpline: ${phone || "9525400122"}\nCampus Address: ${address || "Main Road"}\nSmart Classrooms · AI Face Attendance · Safe Transport`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 leading-relaxed"
              />
              {(() => {
                const previewItems =
                  parseCustomTickerItems(topTickerText).length > 0
                    ? parseCustomTickerItems(topTickerText)
                    : buildDefaultSchoolTickerItems({
                        school: {
                          ...school,
                          tagline,
                          phone,
                          address,
                          principalName,
                          websiteConfig: {
                            ...existingCfg,
                            whatsappNumber,
                            officeHours,
                          },
                        },
                        sessionLabel: admissionSessionLabel || defaultSession,
                        admissionsOpen,
                        highlights,
                      });
                return (
                  <div className="mt-2 p-2.5 rounded-xl bg-[#070D19] text-slate-200 border border-slate-800 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-3 whitespace-nowrap text-[11px]">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0">
                        Live Strip Preview:
                      </span>
                      {previewItems.map((it, i) => (
                        <React.Fragment key={i}>
                          <span className="text-slate-100">{it}</span>
                          {i < previewItems.length - 1 && <span className="text-amber-400">•</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-6 text-xs">
            <label className="flex items-center gap-2.5 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={admissionsOpen}
                onChange={(e) => setAdmissionsOpen(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              <span>Show "Admissions Open" Banner &amp; Apply Online CTA</span>
            </label>
            <label className="flex items-center gap-2.5 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={isDefaultPublic}
                onChange={(e) => setIsDefaultPublic(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <span>Set as Default Landing School on Public Website (/)</span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 1.5: ADMISSION OFFER (% OFF + MULTIPLE OFFER PHOTOS CAROUSEL + LIVE PACKAGE PREVIEW) */}
      {activeTab === "offer" && (
        <div className="space-y-5 text-xs">
          {/* Card 1: Offer Activation & % Discount Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span>Admission Offer &amp; Package Discount Control (एडमिशन ऑफर व % छूट)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  यहाँ जितना <strong>% OFF</strong> सेट करेंगे, पब्लिक वेबसाइट और ऑनलाइन एडमिशन पोर्टल पर अभिभावकों को पूरा कक्षा-वार एडमिशन पैकेज (किस मद का कितना पैसा) और उतने % की छूट अपने-आप दिख जाएगी।
                </p>
              </div>
              <label className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-950 text-white border border-amber-400/40 font-bold cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={offerEnabled}
                  onChange={(e) => setOfferEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-400"
                />
                <span>{offerEnabled ? "Offer Active on Website ✓" : "Enable Offer Showcase"}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* % OFF Input + Quick Presets */}
              <div className="md:col-span-5 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-300/80 dark:border-amber-800/70 space-y-3">
                <label className="font-black text-slate-900 dark:text-amber-200 flex items-center justify-between">
                  <span>Admission Offer Discount (% OFF)</span>
                  <span className="font-mono text-base text-amber-700 dark:text-amber-400 tabular-nums">
                    {offerDiscountPercent}% OFF
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={offerDiscountPercent}
                    onChange={(e) =>
                      setOfferDiscountPercent(Math.max(0, Math.min(90, Number(e.target.value || 0))))
                    }
                    className="w-28 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700 font-mono text-base font-black text-slate-900 dark:text-white tabular-nums"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 10, 15, 20, 25, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setOfferDiscountPercent(pct);
                          if (pct > 0 && !offerEnabled) setOfferEnabled(true);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-bold tabular-nums border cursor-pointer transition ${
                          offerDiscountPercent === pct
                            ? "bg-slate-950 text-amber-400 border-slate-950 dark:bg-amber-400 dark:text-slate-950"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Discount Scope (छूट किस पर लागू होगी?)
                  </label>
                  <select
                    value={offerApplyScope}
                    onChange={(e) =>
                      setOfferApplyScope(e.target.value === "admission_only" ? "admission_only" : "all")
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                  >
                    <option value="all">Full Admission Package (पूरे एडमिशन पैकेज पर % OFF)</option>
                    <option value="admission_only">Admission &amp; Registration Heads Only (प्रवेश/पंजीकरण पर)</option>
                  </select>
                </div>
              </div>

              {/* Offer Texts */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Offer Kicker / Label
                  </label>
                  <input
                    type="text"
                    value={offerBadgeText}
                    onChange={(e) => setOfferBadgeText(e.target.value)}
                    placeholder="Special Admission Offer"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Valid Till / Deadline (अंतिम तिथि)
                  </label>
                  <input
                    type="text"
                    value={offerValidTill}
                    onChange={(e) => setOfferValidTill(e.target.value)}
                    placeholder="e.g. 31 March 2027"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Offer Headline (ऑफर मुख्य शीर्षक)
                  </label>
                  <input
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="Early Bird Admission Package Offer"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Offer Subtitle / Highlight Note
                  </label>
                  <input
                    type="text"
                    value={offerSubtitle}
                    onChange={(e) => setOfferSubtitle(e.target.value)}
                    placeholder="Transparent class-wise package breakdown with instant admission savings."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Footnote / Terms (शर्तें व नियम)
                  </label>
                  <input
                    type="text"
                    value={offerTermsNote}
                    onChange={(e) => setOfferTermsNote(e.target.value)}
                    placeholder="Applicable on new admissions & online applications."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Multi-Image Offer Carousel Manager */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Images className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
                  <span>Multiple Offer Pictures &amp; Swipe Carousel ({offerImages.length} Photos)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  आप एक से अधिक ऑफर पोस्टर या कैंपस फोटो जोड़ सकते हैं — वेबसाइट पर एक स्लाइड दिखेगी और स्वाइप करने पर अगली फोटो आएगी।
                </p>
              </div>
              <label className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs">
                {uploadingKey === "offer_multi" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{uploadingKey === "offer_multi" ? "Uploading..." : "Upload Offer Photos (Multiple)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadMultipleOfferImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <input
                type="text"
                value={offerUrlDraft}
                onChange={(e) => setOfferUrlDraft(e.target.value)}
                placeholder="Or paste Image URL (https://...)"
                className="sm:col-span-5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
              <input
                type="text"
                value={offerCaptionDraft}
                onChange={(e) => setOfferCaptionDraft(e.target.value)}
                placeholder="Optional slide caption (e.g. 20% Off Early Bird Poster)"
                className="sm:col-span-5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={handleAddOfferImageUrl}
                className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add URL</span>
              </button>
            </div>

            {offerImages.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
                <Images className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-semibold">अभी कोई अलग Offer फोटो अपलोड नहीं हुई है।</p>
                <p className="text-[11px] mt-1">
                  ऊपर &ldquo;Upload Offer Photos (Multiple)&rdquo; से एक साथ कई फोटो चुनें — जब तक कोई फोटो न जुड़े, डिफ़ॉल्ट कैंपस फोटो स्लाइडर में दिखेगी।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {offerImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative aspect-[16/10] bg-slate-900">
                      <img src={img.url} alt={img.caption || `Offer Slide ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-amber-300 text-[10px] font-mono font-bold">
                        Slide {idx + 1} / {offerImages.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-2.5">
                      <input
                        type="text"
                        value={img.caption || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOfferImages((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, caption: val } : x))
                          );
                        }}
                        placeholder="Slide caption (optional)..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveOfferImage(idx, -1)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                            title="Move Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === offerImages.length - 1}
                            onClick={() => moveOfferImage(idx, 1)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 cursor-pointer"
                            title="Move Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOfferImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Live Admission Package Breakdown Preview */}
          {cmsClasses.length > 0 && (() => {
            const previewCls =
              cmsClasses.find((c) => c.id === offerPreviewClassId) || cmsClasses[0];
            const previewPkg = computeClassAdmissionOfferBreakdown(previewCls, {
              enabled: true,
              discountPercent: offerDiscountPercent,
              applyScope: offerApplyScope,
            });
            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      <span>Live Admission Package Breakdown Preview (कक्षा-वार पैकेज प्रीव्यू)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Online Admission → Fee Setup में सेट किए गए प्रत्येक मद पर {offerDiscountPercent}% OFF का लाइव कैलकुलेशन:
                    </p>
                  </div>
                  <select
                    value={previewCls.id}
                    onChange={(e) => setOfferPreviewClassId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
                  >
                    {cmsClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {previewPkg.items.map((it) => (
                    <div key={it.key} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-950/50">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{it.label}</span>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        {it.discountAmount > 0 && (
                          <span className="text-slate-400 line-through">₹{it.originalAmount.toLocaleString("en-IN")}</span>
                        )}
                        <span className="font-black text-slate-950 dark:text-white">
                          ₹{it.finalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#070D19] text-white">
                    <div>
                      <span className="font-bold block">Total Admission Package ({previewCls.name})</span>
                      {previewPkg.offerDiscountTotal > 0 && (
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          Offer Savings: -₹{previewPkg.offerDiscountTotal.toLocaleString("en-IN")} ({previewPkg.discountPercent}% OFF)
                        </span>
                      )}
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      {previewPkg.offerDiscountTotal > 0 && (
                        <span className="text-slate-400 line-through mr-2 text-xs">
                          ₹{previewPkg.originalTotal.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className="text-lg font-black text-amber-400">
                        ₹{previewPkg.discountedTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: LEADERSHIP ROLES, PRINCIPAL DESK & DIGITAL USPs */}
      {activeTab === "leadership" && (
        <div className="space-y-5">
          {/* Card 1: Principal Desk (Separated from Director) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Principal Desk (प्रिंसिपल — अलग प्रोफाइल व संदेश)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Principal का नाम, फोटो और संदेश वेबसाइट के &ldquo;From the Principal&apos;s Desk&rdquo; कार्ड पर दिखता है।
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                Role: Principal
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  {principalPhotoUrl ? (
                    <img src={principalPhotoUrl} alt="Principal" className="w-full h-full object-cover" />
                  ) : (
                    <UserCheck className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer">
                    {uploadingKey === "principal" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>{principalPhotoUrl ? "Change Photo" : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleCompressAndSet(e.target.files?.[0], "principal", (url) => setPrincipalPhotoUrl(url))
                      }
                    />
                  </label>
                  {principalPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPrincipalPhotoUrl("")}
                      className="px-2.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={principalPhotoUrl}
                  onChange={(e) => setPrincipalPhotoUrl(e.target.value)}
                  placeholder="Or paste Principal photo URL..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                />
              </div>
              <div className="md:col-span-8 space-y-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Principal Name (प्रिंसिपल का नाम)
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="e.g. Dr. Shahid Khan"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Principal&apos;s Message (अभिभावकों के लिए संदेश)
                  </label>
                  <textarea
                    rows={3}
                    value={principalMessage}
                    onChange={(e) => setPrincipalMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">About School</label>
                  <textarea
                    rows={2}
                    value={aboutSchool}
                    onChange={(e) => setAboutSchool(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Separated Leadership & Website Team Roles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-xs">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Separated Institutional &amp; Website Roles (सभी पद अलग-अलग नाम व फोटो)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sub Principal, Director, Manager, Website Accountant और Tech &amp; Digital Media Incharge सभी के लिए अलग नाम व फोटो जोड़ें। ये पब्लिक वेबसाइट पर अलग-अलग कार्ड में दिखेंगे।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  key: "sub_principal",
                  title: "Sub Principal (उप-प्रिंसिपल)",
                  name: subPrincipalName,
                  setName: setSubPrincipalName,
                  photo: subPrincipalPhotoUrl,
                  setPhoto: setSubPrincipalPhotoUrl,
                  placeholder: "e.g. Mohd. Tariq",
                },
                {
                  key: "director",
                  title: "Director (डायरेक्टर)",
                  name: directorName,
                  setName: setDirectorName,
                  photo: directorPhotoUrl,
                  setPhoto: setDirectorPhotoUrl,
                  placeholder: "e.g. Ehsan Hussain",
                },
                {
                  key: "manager",
                  title: "Manager (मैनेजर)",
                  name: managerName,
                  setName: setManagerName,
                  photo: managerPhotoUrl,
                  setPhoto: setManagerPhotoUrl,
                  placeholder: "e.g. Imran Ahmad",
                },
                {
                  key: "website_accountant",
                  title: "Accountant (Website Only)",
                  name: websiteAccountantName,
                  setName: setWebsiteAccountantName,
                  photo: websiteAccountantPhotoUrl,
                  setPhoto: setWebsiteAccountantPhotoUrl,
                  placeholder: "Website Accountant Name",
                  isWebsiteAccountant: true,
                },
                {
                  key: "digital_creator",
                  title: "Tech & Digital Media Incharge",
                  name: digitalCreatorName,
                  setName: setDigitalCreatorName,
                  photo: digitalCreatorPhotoUrl,
                  setPhoto: setDigitalCreatorPhotoUrl,
                  placeholder: "e.g. Tech & Media Incharge Name",
                },
              ].map((role) => {
                const busy = uploadingKey === role.key;
                const initials = (role.name || role.title).slice(0, 2).toUpperCase();
                return (
                  <div
                    key={role.key}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-xs">{role.title}</span>
                        {role.isWebsiteAccountant && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <Calculator className="w-3 h-3" />
                            <span>Website</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-amber-400 font-black flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                          {role.photo ? (
                            <img src={role.photo} alt={role.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{initials}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <label className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold inline-flex items-center gap-1 cursor-pointer text-[11px]">
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                              <span>{role.photo ? "Change Photo" : "Upload Photo"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleCompressAndSet(e.target.files?.[0], role.key, (url) => role.setPhoto(url))
                                }
                              />
                            </label>
                            {role.photo && (
                              <button
                                type="button"
                                onClick={() => role.setPhoto("")}
                                className="px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 font-bold text-[11px] cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={role.photo}
                            onChange={(e) => role.setPhoto(e.target.value)}
                            placeholder="Or paste photo URL..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1 text-[11px]">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={role.name}
                          onChange={(e) => role.setName(e.target.value)}
                          placeholder={role.placeholder}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold"
                        />
                      </div>
                    </div>

                    {role.isWebsiteAccountant && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                        <span className="truncate">
                          School ERP Receipt Accountant:{" "}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {school.accountantName || "Not Set"}
                          </strong>
                        </span>
                        {school.accountantName && (
                          <button
                            type="button"
                            onClick={() => setWebsiteAccountantName(school.accountantName || "")}
                            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0 cursor-pointer"
                          >
                            Copy ERP Name
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Global Developer Profile (Default Across All Schools — Life Maker Only) */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Developer Profile (Global — Life Maker)</span>
                    {!isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-bold">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isSuperAdmin
                      ? "Super Admin (Life Maker) Control: Updating here changes the Developer name & photo across ALL schools."
                      : "यह डिफ़ॉल्ट Developer प्रोफाइल सभी स्कूलों की वेबसाइट पर एक जैसी रहती है। इसे केवल Life Maker (Super Admin) ही बदल सकते हैं।"}
                  </p>
                </div>
              </div>
            </div>

            {!isSuperAdmin ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-amber-400/30 flex items-center justify-center shrink-0">
                    {globalDeveloper.photoUrl ? (
                      <img
                        src={globalDeveloper.photoUrl}
                        alt={globalDeveloper.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black text-amber-400">
                        {globalDeveloper.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">{globalDeveloper.name}</div>
                    <div className="text-xs text-amber-400 font-semibold mt-0.5">
                      Developer · {globalDeveloper.roleTitle}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Powered by {globalDeveloper.organization}
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-bold shrink-0">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Life Maker Global Managed</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-4 flex flex-col items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-amber-400/40 flex items-center justify-center">
                      {devDraftPhotoUrl ? (
                        <img src={devDraftPhotoUrl} alt={devDraftName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-amber-400">
                          {(devDraftName || "LM").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <label className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black inline-flex items-center gap-1 cursor-pointer text-[11px]">
                        {uploadingKey === "global_dev" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Camera className="w-3 h-3" />
                        )}
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleCompressAndSet(e.target.files?.[0], "global_dev", (url) => setDevDraftPhotoUrl(url))
                          }
                        />
                      </label>
                      {devDraftPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setDevDraftPhotoUrl("")}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 font-bold text-[11px] cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Developer Name</label>
                      <input
                        type="text"
                        value={devDraftName}
                        onChange={(e) => setDevDraftName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-300 block mb-1">Organization / Brand</label>
                      <input
                        type="text"
                        value={devDraftOrg}
                        onChange={(e) => setDevDraftOrg(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-300 block mb-1">Role / Designation</label>
                      <input
                        type="text"
                        value={devDraftRole}
                        onChange={(e) => setDevDraftRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-300 block mb-1">Developer Photo URL (Optional)</label>
                      <input
                        type="text"
                        value={devDraftPhotoUrl}
                        onChange={(e) => setDevDraftPhotoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveGlobalDeveloper}
                    disabled={savingGlobalDev}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingGlobalDev ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{savingGlobalDev ? "Updating All Schools..." : "Save Global Developer (All Schools)"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-xs">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              School Digital Strengths / USP Highlights (3 मुख्य विशेषताएं)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {highlights.map((hl, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <label className="font-bold text-slate-500 block">Highlight {idx + 1} Title</label>
                  <input
                    type="text"
                    value={hl.title}
                    onChange={(e) =>
                      setHighlights((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                  />
                  <label className="font-bold text-slate-500 block">Description</label>
                  <textarea
                    rows={3}
                    value={hl.description}
                    onChange={(e) =>
                      setHighlights((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEACHERS PHOTOS & VISIBILITY */}
      {activeTab === "teachers" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Teachers Website Showcase &amp; Photos (शिक्षक फोटो अपलोड)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              किसी भी शिक्षक की फोटो अपलोड करें (ऑटो कम्प्रेशन WebP/JPEG) या वेबसाइट पर दिखाना/छुपाना चुनें।
            </p>
          </div>
          {teachers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              पहले Staff / Teachers डायरेक्टरी में शिक्षक जोड़ें, वे यहाँ अपने-आप दिखेंगे।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {teachers.map((t) => {
                const isHidden = hiddenTeacherIds.includes(t.id);
                const busy = uploadingKey === `teacher_${t.id}`;
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border transition space-y-3 ${
                      isHidden
                        ? "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 opacity-75"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center shrink-0">
                        {t.photoUrl ? (
                          <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          t.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-900 dark:text-white truncate">{t.name}</h4>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                          {t.designation || t.qualification || "Faculty"}
                        </p>
                        {t.experience && <p className="text-[11px] text-slate-500">{t.experience}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center inline-flex items-center justify-center gap-1.5 cursor-pointer">
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        <span>{t.photoUrl ? "Change Photo" : "Upload Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleTeacherPhotoUpload(t, e.target.files?.[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleTeacherVisibility(t.id)}
                        className={`py-2 px-3 rounded-lg border font-bold inline-flex items-center gap-1 cursor-pointer ${
                          isHidden
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                            : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                        }`}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isHidden ? "Hidden" : "Visible"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEMORIES & PHOTO GALLERY */}
      {activeTab === "memories" && (
        <div className="space-y-5">
          <form
            onSubmit={handleAddMemoryItem}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-xs"
          >
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add School Memory / Photo to Website Gallery (वेबसाइट मेमोरी जोड़ें)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newMemTitle}
                  onChange={(e) => setNewMemTitle(e.target.value)}
                  placeholder="Annual Day Celebration"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Category</label>
                <select
                  value={newMemCategory}
                  onChange={(e) => setNewMemCategory(e.target.value as SchoolGalleryItem["category"])}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="ANNUAL">Annual Fest</option>
                  <option value="SPORTS">Sports Meet</option>
                  <option value="EXPO">Science &amp; AI Expo</option>
                  <option value="CAMPUS">Campus Life</option>
                  <option value="TOUR">Picnic &amp; Tour</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Date</label>
                <input
                  type="date"
                  value={newMemDate}
                  onChange={(e) => setNewMemDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Media Type</label>
                <select
                  value={newMemMediaType}
                  onChange={(e) => setNewMemMediaType(e.target.value as "IMAGE" | "VIDEO")}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="IMAGE">Photo (WebP/JPEG)</option>
                  <option value="VIDEO">YouTube Video</option>
                </select>
              </div>
            </div>

            {newMemMediaType === "IMAGE" ? (
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <label className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer shrink-0">
                  {uploadingKey === "memory_new" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{uploadingKey === "memory_new" ? "Compressing..." : "Upload Compressed Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleCompressAndSet(e.target.files?.[0], "memory_new", (url) => setNewMemUrl(url))
                    }
                  />
                </label>
                <input
                  type="text"
                  value={newMemUrl}
                  onChange={(e) => setNewMemUrl(e.target.value)}
                  placeholder="Or paste photo URL..."
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
            ) : (
              <input
                type="text"
                value={newMemVideoUrl}
                onChange={(e) => setNewMemVideoUrl(e.target.value)}
                placeholder="Paste YouTube video link (https://youtube.com/watch?v=...)"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newMemDesc}
                onChange={(e) => setNewMemDesc(e.target.value)}
                placeholder="Short caption or description..."
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <button
                type="submit"
                disabled={addingMem}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shrink-0"
              >
                {addingMem ? "Publishing..." : "Publish to Website Gallery"}
              </button>
            </div>
          </form>

          {/* Existing Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryItems.map((item: any) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-slate-950 relative">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.mediaType === "VIDEO" && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {item.category} {item.date ? `· ${item.date}` : ""}
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteMemoryItem(item.id)}
                    className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CONTACT, SOCIAL LINKS, WHATSAPP GROUP & GOOGLE MAPS */}
      {activeTab === "contact" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Office Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">WhatsApp Admission Desk Number</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Office Hours</label>
              <input
                type="text"
                value={officeHours}
                onChange={(e) => setOfficeHours(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">School Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Google Maps Link (Optional)</label>
              <input
                type="text"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {/* Official Social Media & WhatsApp Group Links */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 text-xs">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Official Social Pages &amp; WhatsApp Group (स्कूल के ऑफिशियल पेज और ग्रुप लिंक)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                जिस प्लेटफॉर्म का लिंक डालेंगे, वेबसाइट पर उसका आइकन तुरंत <strong>Active</strong> हो जाएगा और टैप करने पर यूज़र सीधे स्कूल के ऑफिशियल पेज/ग्रुप पर जाएँगे।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  {
                    key: "instagram" as SocialPlatformKey,
                    label: "Instagram Official Page",
                    value: instagramUrl,
                    setValue: setInstagramUrl,
                    placeholder: "https://instagram.com/your_school or @your_school",
                    activeIconClass: "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-sm",
                    activeBorderClass: "border-pink-300 dark:border-pink-800 bg-pink-50/40 dark:bg-pink-950/20",
                  },
                  {
                    key: "youtube" as SocialPlatformKey,
                    label: "YouTube Official Channel",
                    value: youtubeUrl,
                    setValue: setYoutubeUrl,
                    placeholder: "https://youtube.com/@your_school",
                    activeIconClass: "bg-[#FF0000] text-white shadow-sm",
                    activeBorderClass: "border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20",
                  },
                  {
                    key: "facebook" as SocialPlatformKey,
                    label: "Facebook Official Page",
                    value: facebookUrl,
                    setValue: setFacebookUrl,
                    placeholder: "https://facebook.com/your_school_page",
                    activeIconClass: "bg-[#1877F2] text-white shadow-sm",
                    activeBorderClass: "border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20",
                  },
                  {
                    key: "whatsapp_group" as SocialPlatformKey,
                    label: "WhatsApp Official Group Invite Link",
                    value: whatsappGroupUrl,
                    setValue: setWhatsappGroupUrl,
                    placeholder: "https://chat.whatsapp.com/...",
                    activeIconClass: "bg-[#25D366] text-white shadow-sm",
                    activeBorderClass: "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20",
                  },
                ]
              ).map((item) => {
                const normalized = normalizeSocialUrl(item.value, item.key);
                const isActive = Boolean(normalized);
                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-xl border transition space-y-2.5 ${
                      isActive
                        ? item.activeBorderClass
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                            isActive
                              ? item.activeIconClass
                              : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          {renderSocialPlatformIcon(item.key, "w-4 h-4")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 dark:text-white truncate">{item.label}</div>
                          <div className="text-[10px] font-bold">
                            {isActive ? (
                              <span className="text-emerald-600 dark:text-emerald-400">● Active on Website</span>
                            ) : (
                              <span className="text-slate-400">○ Inactive (Add link to activate)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => safeOpenExternalUrl(normalized)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Test Link"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => item.setValue("")}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer"
                            title="Clear link"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => item.setValue(e.target.value)}
                      placeholder={item.placeholder}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
