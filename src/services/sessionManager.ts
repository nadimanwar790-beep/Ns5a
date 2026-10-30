// @ts-nocheck
import { ref, set, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase';

export interface ActiveSessionData {
  sessionId: string;
  userId: string;
  userName?: string;
  device?: string;
  updatedAt: number;
}

export interface LoginQrPayload {
  type: 'NSTA_LOGIN_QR';
  uid: string;
  email?: string;
  mobile?: string;
  displayId?: string;
  name?: string;
  ts: number;
}

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

export const listenToUserSession = (
  userId: string,
  onConflict: (remoteData: ActiveSessionData) => void
): (() => void) => {
  if (!userId) return () => {};

  const sessionRef = ref(rtdb, `user_active_sessions/${userId}`);
  
  const listener = onValue(sessionRef, (snapshot) => {
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
  }, (err) => {
    console.warn('[SessionManager] Session listener error:', err);
  });

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

export const generateLoginQrToken = (user: any): string => {
  const payload: LoginQrPayload = {
    type: 'NSTA_LOGIN_QR',
    uid: user.uid || user.id,
    email: user.email || '',
    mobile: user.mobile || '',
    displayId: user.displayId || '',
    name: user.name || 'Student',
    ts: Date.now(),
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
        return {
          type: 'NSTA_LOGIN_QR',
          uid: parsed.uid || parsed.id,
          email: parsed.email || '',
          mobile: parsed.mobile || '',
          displayId: parsed.displayId || '',
          name: parsed.name || 'Student',
          ts: parsed.ts || Date.now(),
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
      };
    }
  }

  return null;
};
