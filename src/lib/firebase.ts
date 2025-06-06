
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnMIylHrc_3wXDc3lSYE2Digg9AWI3o1M",
  authDomain: "chronoprint-fac66.firebaseapp.com",
  projectId: "chronoprint-fac66",
  storageBucket: "chronoprint-fac66.firebasestorage.app",
  messagingSenderId: "931385438561",
  appId: "1:931385438561:web:5bcd810a8eb35b9cb61520"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
