import React from "react";
import type { SocialPlatformKey } from "../../utils/safeBrowserActions";

export const InstagramBrandIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const YouTubeBrandIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.498 6.186a2.997 2.997 0 0 0-2.11-2.12C19.527 3.5 12 3.5 12 3.5s-7.527 0-9.388.566a2.997 2.997 0 0 0-2.11 2.12C0 8.055 0 12 0 12s0 3.945.502 5.814a2.997 2.997 0 0 0 2.11 2.12C4.473 20.5 12 20.5 12 20.5s7.527 0 9.388-.566a2.997 2.997 0 0 0 2.11-2.12C24 15.945 24 12 24 12s0-3.945-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const FacebookBrandIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
  </svg>
);

export const WhatsAppBrandIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.531.078-1.203.109-1.938-.125-.453-.141-1.031-.328-1.766-.641-3.109-1.344-5.141-4.484-5.297-4.688-.156-.203-1.266-1.688-1.266-3.219s.797-2.281 1.078-2.594c.281-.313.609-.391.813-.391.203 0 .406 0 .578.016.188.016.438-.078.688.516.25.609.859 2.094.938 2.25.078.156.125.344.031.547-.094.203-.141.328-.281.5-.141.172-.297.375-.422.5-.141.141-.281.297-.125.578.156.281.703 1.156 1.516 1.875 1.047.922 1.922 1.203 2.203 1.344.281.141.453.109.625-.078.172-.188.719-.844.906-1.125.188-.281.391-.234.656-.141.266.094 1.688.797 1.984.938.297.141.484.219.563.344.078.125.078.719-.172 1.422z" />
  </svg>
);

export const renderSocialPlatformIcon = (key: SocialPlatformKey, className = "w-5 h-5") => {
  switch (key) {
    case "instagram":
      return <InstagramBrandIcon className={className} />;
    case "youtube":
      return <YouTubeBrandIcon className={className} />;
    case "facebook":
      return <FacebookBrandIcon className={className} />;
    case "whatsapp_group":
      return <WhatsAppBrandIcon className={className} />;
  }
};
