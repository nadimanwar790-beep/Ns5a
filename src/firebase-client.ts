import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBEDKZVPgwOPCccjWdKSShfvSqC3REDa0c",
  authDomain: "iic-nst.firebaseapp.com",
  databaseURL: "https://iic-nst-default-rtdb.firebaseio.com",
  projectId: "iic-nst",
  storageBucket: "iic-nst.firebasestorage.app",
  messagingSenderId: "984309241322",
  appId: "1:984309241322:web:4dae35987732d630e64e93",
  measurementId: "G-QX0XT7RSQX"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export default app;
