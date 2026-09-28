import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB...",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "bdrs-3a5fc.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "bdrs-3a5fc",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "bdrs-3a5fc.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "739343015408",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:739343015408:web:9349c89326b528c1"
};

// We will just read the config from bdrs/src/database/firebase.js
