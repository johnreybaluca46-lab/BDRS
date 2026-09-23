import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

if (!getApps().length) {
    try {
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } else {
            const localPath = path.resolve(process.cwd(), 'service-account.json');
            if (fs.existsSync(localPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(localPath, 'utf8'));
            } else {
                console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing. Firebase Admin will not initialize.");
            }
        }
        
        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error('Firebase Admin initialization error', error);
    }
}

export const adminAuth = getApps().length ? getAuth() : null;
export const adminDb = getApps().length ? getFirestore() : null;
