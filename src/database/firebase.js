// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBz6rMajzMlOWiUR8ATHYVv1zag2DzRSac",
    authDomain: "bdrs-a4bd0.firebaseapp.com",
    projectId: "bdrs-a4bd0",
    storageBucket: "bdrs-a4bd0.firebasestorage.app",
    messagingSenderId: "114269228277",
    appId: "1:114269228277:web:7c109c1a1360cb800289bc",
    measurementId: "G-BJ7B9NZ126"
};

import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

// Enable persistent local cache so data loads instantly across tabs/reloads
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);
export const functions = getFunctions(app);