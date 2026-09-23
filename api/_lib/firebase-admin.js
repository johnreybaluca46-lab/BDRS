import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

if (!getApps().length) {
    try {
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
                // Fix for Vercel sometimes double-escaping newlines in the private key
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
            } catch (e) {
                // Fallback: Check if it's base64 encoded
                const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
                serviceAccount = JSON.parse(decoded);
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
            }
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
