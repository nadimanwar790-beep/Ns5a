// @ts-nocheck
import { ref, set, get, onValue, off, update, remove } from 'firebase/database';
import { rtdb } from '../firebase';

export interface ActiveSessionData {
  sessionId: string;
  userId: string;
  userName?: string;
  device?: string;
  updatedAt: number;
}

export interface LoginChallengeData {
  challengeId: string;
  otp: string;
  otpHash: string;
  requestingDevice: string;
  createdAt: number;
  expiresAt: number;
  attemptsRemaining: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

export interface LoginQrPayload {
  type: 'NSTA_LOGIN_QR';
  uid: string;
  email?: string;
  mobile?: string;
  displayId?: string;
  name?: string;
  ts: number;
  exp?: number;
  nonce?: string;
  isExpired?: boolean;
}

export const hashOtp = async (otp: string, salt: string): Promise<string> => {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${otp.trim()}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Basic fallback hash if Web Crypto unavailable
    let hash = 0;
    const str = `${salt}:${otp.trim()}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `fb_${Math.abs(hash)}`;
  }
};

export const generateSessionId = (): string => {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const initUserSession = async (user: any): Promise<string> => {
  const userId = user?.uid || user?.id;
  if (!userId || user?.isGuest) return '';

  const sessionId = generateSessionId();
  try {
    localStorage.setItem('nst_session_id', sessionId);
  } catch {}

  try {
    const sessionRef = ref(rtdb, `user_active_sessions/${userId}`);
    const sessionData: ActiveSessionData = {
      sessionId,
      userId,
      userName: user.name || 'User',
      device: typeof navigator !== 'undefined' ? (navigator.userAgent || 'Web Client') : 'Web Client',
      updatedAt: Date.now(),
    };
    await set(sessionRef, sessionData);
  } catch (err) {
    console.warn('[SessionManager] Failed to register session in RTDB:', err);
  }

  return sessionId;
};

export const sendSessionHeartbeat = async (userId: string) => {
  if (!userId) return;
  try {
    const sessionRef = ref(rtdb, `user_active_sessions/${userId}/updatedAt`);
    await set(sessionRef, Date.now());
  } catch {}
};

export const checkActiveRemoteSession = async (userId: string): Promise<ActiveSessionData | null> => {
  if (!userId) return null;
  try {
    const sessionRef = ref(rtdb, `user_active_sessions/${userId}`);
    const snapshot = await get(sessionRef);
    if (!snapshot.exists()) return null;

    const data = snapshot.val() as ActiveSessionData;
    if (!data || !data.sessionId) return null;

    // Check if session belongs to this same browser instance
    let localSessionId: string | null = null;
    try {
      localSessionId = localStorage.getItem('nst_session_id');
    } catch {}

    if (localSessionId && data.sessionId === localSessionId) {
      return null;
    }

    // Deadlock Prevention: If previous device has been inactive for > 24 hours,
    // consider it stale/dead/lost and allow seamless direct login!
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (data.updatedAt && Date.now() - data.updatedAt > TWENTY_FOUR_HOURS) {
      console.info('[SessionManager] Stale session detected (>24h). Allowing direct login.');
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[SessionManager] checkActiveRemoteSession error:', err);
    return null;
  }
};

export const createLoginChallenge = async (
  userId: string,
  requestingDeviceName?: string
): Promise<{ challengeId: string; otp: string; expiresAt: number }> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const challengeId = `chall_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = Date.now() + 120000; // 2 minutes validity
  const otpHash = await hashOtp(otp, challengeId);

  const deviceName = requestingDeviceName || (typeof navigator !== 'undefined'
    ? (/iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'iPhone'
        : /Android/i.test(navigator.userAgent)
          ? 'Android Mobile'
          : 'Naya Browser / Device')
    : 'Naya Mobile');

  const challengeData: LoginChallengeData = {
    challengeId,
    otp, // Read by Device A approval modal
    otpHash, // Cryptographic hash for rate-limited verification
    requestingDevice: deviceName,
    createdAt: Date.now(),
    expiresAt,
    attemptsRemaining: 3, // Rate limiting: Max 3 attempts
    status: 'PENDING',
  };

  const challengeRef = ref(rtdb, `login_challenges/${userId}`);
  await set(challengeRef, challengeData);

  return { challengeId, otp, expiresAt };
};

export const listenToLoginChallenge = (
  userId: string,
  onChallenge: (challenge: LoginChallengeData | null) => void
): (() => void) => {
  if (!userId) return () => {};

  const challengeRef = ref(rtdb, `login_challenges/${userId}`);
  const listener = onValue(
    challengeRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChallenge(null);
        return;
      }
      const data = snapshot.val() as LoginChallengeData;
      if (!data) {
        onChallenge(null);
        return;
      }

      if (data.status === 'PENDING' && Date.now() < data.expiresAt && (data.attemptsRemaining ?? 3) > 0) {
        onChallenge(data);
      } else {
        onChallenge(null);
      }
    },
    (err) => {
      console.warn('[SessionManager] Login challenge listener error:', err);
    }
  );

  return () => {
    try {
      off(challengeRef, 'value', listener);
    } catch {}
  };
};

export const verifyLoginChallengeOtp = async (
  userId: string,
  challengeId: string,
  inputOtp: string
): Promise<{ success: boolean; message?: string; locked?: boolean }> => {
  if (!userId || !challengeId || !inputOtp) {
    return { success: false, message: 'OTP aur details avashyak hain.' };
  }

  try {
    const challengeRef = ref(rtdb, `login_challenges/${userId}`);
    const snapshot = await get(challengeRef);
    if (!snapshot.exists()) {
      return { success: false, message: 'Login request prapt nahi hui ya expire ho gayi.' };
    }

    const data = snapshot.val() as LoginChallengeData;
    if (!data || data.challengeId !== challengeId) {
      return { success: false, message: 'Amanaya (Invalid) login challenge.' };
    }

    if (data.status === 'REJECTED') {
      return { success: false, message: 'Dusre mobile ne is login request ko mana (reject) kar diya.' };
    }

    if (Date.now() > data.expiresAt) {
      await update(challengeRef, { status: 'EXPIRED' });
      return { success: false, message: 'OTP expire ho chuka hai. Kripya dobara QR scan karein.' };
    }

    // Rate Limiting Check
    const attempts = data.attemptsRemaining ?? 3;
    if (attempts <= 0) {
      await update(challengeRef, { status: 'EXPIRED' });
      return {
        success: false,
        locked: true,
        message: '3 baar galat OTP enter karne ke karan yeh request lock ho gayi hai. Naya QR scan karein.',
      };
    }

    // Cryptographic hash comparison
    const candidateHash = await hashOtp(inputOtp.trim(), challengeId);
    const isMatch = candidateHash === data.otpHash || inputOtp.trim() === data.otp;

    if (!isMatch) {
      const remaining = attempts - 1;
      if (remaining <= 0) {
        await update(challengeRef, {
          attemptsRemaining: 0,
          status: 'EXPIRED',
        });
        return {
          success: false,
          locked: true,
          message: 'Suraksha niyam: 3 baar galat OTP! Request radd (locked) kar di gayi hai.',
        };
      } else {
        await update(challengeRef, { attemptsRemaining: remaining });
        return {
          success: false,
          message: `Galat OTP! Kripya sahi 6-digit OTP dalein (${remaining} koshish baaki).`,
        };
      }
    }

    // Valid OTP! Mark approved
    await update(challengeRef, { status: 'APPROVED' });
    return { success: true };
  } catch (err: any) {
    return { success: false, message: 'OTP verify karne me truti: ' + (err?.message || 'Unknown error') };
  }
};

export const rejectLoginChallenge = async (userId: string, challengeId: string): Promise<void> => {
  try {
    const challengeRef = ref(rtdb, `login_challenges/${userId}`);
    await update(challengeRef, { status: 'REJECTED' });
  } catch (err) {
    console.warn('[SessionManager] Failed to reject login challenge:', err);
  }
};

export const clearLoginChallenge = async (userId: string): Promise<void> => {
  try {
    const challengeRef = ref(rtdb, `login_challenges/${userId}`);
    await remove(challengeRef);
  } catch (err) {
    console.warn('[SessionManager] Failed to clear login challenge:', err);
  }
};

export const listenToUserSession = (
  userId: string,
  onConflict: (remoteData: ActiveSessionData) => void
): (() => void) => {
  if (!userId) return () => {};

  const sessionRef = ref(rtdb, `user_active_sessions/${userId}`);

  const listener = onValue(
    sessionRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const remoteData = snapshot.val() as ActiveSessionData;
      if (!remoteData || !remoteData.sessionId) return;

      let localSessionId: string | null = null;
      try {
        localSessionId = localStorage.getItem('nst_session_id');
      } catch {}

      if (localSessionId && remoteData.sessionId !== localSessionId) {
        console.warn('[SessionManager] Device conflict detected.');
        onConflict(remoteData);
      }
    },
    (err) => {
      console.warn('[SessionManager] Session listener error:', err);
    }
  );

  return () => {
    try {
      off(sessionRef, 'value', listener);
    } catch {}
  };
};

export const clearLocalSession = () => {
  try {
    localStorage.removeItem('nst_session_id');
  } catch {}
};

/**
 * Generates dynamic, short-lived (60s default) QR Token with timestamp, nonce, and expiration.
 */
export const generateLoginQrToken = (user: any, ttlSeconds: number = 60): string => {
  const now = Date.now();
  const payload: LoginQrPayload = {
    type: 'NSTA_LOGIN_QR',
    uid: user.uid || user.id,
    email: user.email || '',
    mobile: user.mobile || '',
    displayId: user.displayId || '',
    name: user.name || 'Student',
    ts: now,
    exp: now + ttlSeconds * 1000,
    nonce: Math.random().toString(36).substring(2, 9),
  };
  return JSON.stringify(payload);
};

export const parseLoginQrToken = (raw: string): LoginQrPayload | null => {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();

  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed && (parsed.type === 'NSTA_LOGIN_QR' || parsed.uid)) {
        const uid = parsed.uid || parsed.id;
        const ts = parsed.ts || Date.now();
        const exp = parsed.exp || (ts + 120000); // 2 min default if not specified
        const isExpired = Date.now() > (exp + 30000); // 30s clock skew tolerance

        return {
          type: 'NSTA_LOGIN_QR',
          uid,
          email: parsed.email || '',
          mobile: parsed.mobile || '',
          displayId: parsed.displayId || '',
          name: parsed.name || 'Student',
          ts,
          exp,
          nonce: parsed.nonce || '',
          isExpired,
        };
      }
    } catch {}
  }

  if (clean.startsWith('NSTA_LOGIN:') || clean.startsWith('NSTA:')) {
    const parts = clean.split(':');
    const uid = parts[1]?.trim();
    if (uid) {
      return {
        type: 'NSTA_LOGIN_QR',
        uid,
        email: '',
        mobile: '',
        displayId: '',
        name: 'Student',
        ts: Date.now(),
        isExpired: false,
      };
    }
  }

  return null;
};


