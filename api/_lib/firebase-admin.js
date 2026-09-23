import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing. Firebase Admin will not initialize.");
        } else {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error('Firebase Admin initialization error', error);
    }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
