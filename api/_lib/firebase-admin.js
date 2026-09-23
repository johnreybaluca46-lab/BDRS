import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
            } catch (e1) {
                try {
                    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
                    serviceAccount = JSON.parse(decoded);
                    if (serviceAccount.private_key) {
                        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                    }
                } catch (e2) {
                    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON or Base64.');
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
