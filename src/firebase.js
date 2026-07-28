import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Firebase web configuration is public application metadata. Keeping the
  // deployed values as fallbacks prevents native CI builds from crashing when
  // the Vite environment variables are not exported by the build runner.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD0cZY5-ja7bXbwWMt7_i4xVnjPsTZvZ1w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gohar-traders.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gohar-traders",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gohar-traders.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "713511917994",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:713511917994:web:a2e45f572d1a9c981533d3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HJ5PSP1P46",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Analytics is optional and is unavailable in some browsers/environments.
export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null,
);
