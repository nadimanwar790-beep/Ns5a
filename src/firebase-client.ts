import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCtjCnVHwFIj9NPWZnVXcm4Ayw5YZJna54",
  authDomain: "nst2512-6a2e4.firebaseapp.com",
  databaseURL: "https://nst2512-6a2e4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nst2512-6a2e4",
  storageBucket: "nst2512-6a2e4.firebasestorage.app",
  messagingSenderId: "1041659780014",
  appId: "1:1041659780014:web:26db9e156334f2de87063f",
  measurementId: "G-VRSSQK3TB0"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(() => {});
}
export default app;
