// @ts-nocheck
/**
 * NSTA Voice Notification Engine
 * Provides smart, human-grade text-to-speech for all incoming school & student notifications
 * (Fee alerts, Attendance in/out, Homework, Messenger chats, Store bookings, Driver updates).
 */

export interface VoiceNotifyConfig {
  enabled: boolean;
  rate: number; // 0.8 to 1.5 (default 1.0)
  pitch: number; // 0.8 to 1.2 (default 1.0)
  volume: number; // 0 to 1 (default 1.0)
  preferredLang: "hi-IN" | "en-IN" | "en-US";
}

const STORAGE_KEY = "nst_voice_notification_config";

export const getVoiceNotifyConfig = (): VoiceNotifyConfig => {
  if (typeof window === "undefined") {
    return { enabled: true, rate: 1.0, pitch: 1.0, volume: 1.0, preferredLang: "hi-IN" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: true, rate: 1.0, pitch: 1.0, volume: 1.0, preferredLang: "hi-IN" };
};

export const saveVoiceNotifyConfig = (cfg: Partial<VoiceNotifyConfig>): VoiceNotifyConfig => {
  const current = getVoiceNotifyConfig();
  const next = { ...current, ...cfg };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
};

// Text cleaner specifically optimized for Indian school announcements
export const cleanTextForSpeech = (text: string): string => {
  if (!text) return "";

  let clean = text;

  // Replace Rupees symbol with "रुपये"
  clean = clean.replace(/₹\s*([0-9,]+)/g, "$1 रुपये");
  clean = clean.replace(/Rs\.?\s*([0-9,]+)/gi, "$1 रुपये");

  // Clean common abbreviations
  clean = clean.replace(/\bAdm\.?\s*No\.?:?\s*([a-zA-Z0-9_-]+)/gi, "एडमिशन नंबर $1");
  clean = clean.replace(/\bRoll\s*No\.?:?\s*([0-9]+)/gi, "रोल नंबर $1");
  clean = clean.replace(/\bStd\.?\b/gi, "कक्षा");
  clean = clean.replace(/\bSec\.?\b/gi, "सेक्शन");

  // Clean emojis and special symbols
  clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F0F5}\u{1F200}-\u{1F270}]/gu, " ");

  // Strip Markdown characters (*, _, #, ~, `, [, ])
  clean = clean.replace(/[*_#~`[\]()]/g, " ");

  // Collapse consecutive whitespaces
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
};

// Find the best matching Hindi or Indian voice available on device
export const pickBestVoice = (voices: SpeechSynthesisVoice[], preferredLang: string = "hi-IN"): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) return null;

  // Priority 1: Exact language match for Hindi
  const hiVoice = voices.find(v => v.lang === "hi-IN" || v.lang.startsWith("hi"));
  if (preferredLang.startsWith("hi") && hiVoice) return hiVoice;

  // Priority 2: Indian English
  const inEnVoice = voices.find(v => v.lang === "en-IN" || v.name.toLowerCase().includes("india"));
  if (inEnVoice) return inEnVoice;

  // Priority 3: Google Hindi / Google Indian English if installed
  const googleVoice = voices.find(v => v.name.toLowerCase().includes("google") && (v.lang.includes("hi") || v.lang.includes("in")));
  if (googleVoice) return googleVoice;

  // Priority 4: Default language voice
  const langMatch = voices.find(v => v.lang.startsWith(preferredLang.slice(0, 2)));
  if (langMatch) return langMatch;

  return voices[0] || null;
};

let isSpeakingActive = false;

/**
 * Main speech trigger for any notification title & body
 */
export const speakNotification = (
  title: string,
  body?: string,
  options?: { force?: boolean; rate?: number }
): boolean => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  const config = getVoiceNotifyConfig();
  if (!config.enabled && !options?.force) {
    return false;
  }

  try {
    const rawContent = body ? `${title}. ${body}` : title;
    const cleanSpeech = cleanTextForSpeech(rawContent);
    if (!cleanSpeech) return false;

    // Cancel any previous speech so notifications don't overlap awkwardly
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = options?.rate || config.rate || 1.0;
    utterance.pitch = config.pitch || 1.0;
    utterance.volume = config.volume || 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voice = pickBestVoice(voices, config.preferredLang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = config.preferredLang || "hi-IN";
    }

    utterance.onstart = () => {
      isSpeakingActive = true;
      window.dispatchEvent(new CustomEvent("nst_voice_speaking_state", { detail: { speaking: true, text: cleanSpeech } }));
    };

    utterance.onend = () => {
      isSpeakingActive = false;
      window.dispatchEvent(new CustomEvent("nst_voice_speaking_state", { detail: { speaking: false } }));
    };

    utterance.onerror = (e) => {
      isSpeakingActive = false;
      console.warn("[VoiceNotifyEngine] Speech error:", e);
      window.dispatchEvent(new CustomEvent("nst_voice_speaking_state", { detail: { speaking: false } }));
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("[VoiceNotifyEngine] Failed to speak notification:", err);
    return false;
  }
};

/**
 * Stop currently playing voice
 */
export const stopVoiceNotification = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      isSpeakingActive = false;
      window.dispatchEvent(new CustomEvent("nst_voice_speaking_state", { detail: { speaking: false } }));
    } catch {}
  }
};

/**
 * Play a test voice sample
 */
export const testVoiceNotificationSample = () => {
  return speakNotification(
    "नमस्ते!",
    "स्कूल नोटिफिकेशन आवाज़ सक्रिय है। अब सभी ज़रूरी संदेश बोलकर सुनाए जाएंगे।",
    { force: true }
  );
};

// Global Listener initialization - connects to foreground notifications & tap-to-speak
if (typeof window !== "undefined") {
  // 1. Listen for foreground push/in-app notifications
  window.addEventListener("nst_foreground_notification", (event: any) => {
    const detail = event?.detail;
    if (detail && (detail.title || detail.body)) {
      speakNotification(detail.title || "नया नोटिफिकेशन", detail.body);
    }
  });

  // 2. Listen for explicit voice notice events
  window.addEventListener("nst_voice_speak_notice", (event: any) => {
    const detail = event?.detail;
    if (detail && (detail.title || detail.text)) {
      speakNotification(detail.title || detail.text, detail.body);
    }
  });
}
