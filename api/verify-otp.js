import { adminDb } from './_lib/firebase-admin.js';
import crypto from 'crypto';
import admin from 'firebase-admin';

export default async function handler(req, res) {
    // CORS Headers to allow requests from Firebase Hosting
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    if (!adminDb) {
        return res.status(500).json({ success: false, message: 'Backend configuration error.' });
    }

    const { requestId, otp } = req.body;
    
    if (!requestId || !otp || typeof otp !== 'string' || otp.length !== 6) {
        return res.status(400).json({ success: false, message: 'Valid OTP and request ID are required.' });
    }

    try {
        const otpRef = adminDb.collection('otp_requests').doc(requestId);
        const submittedHash = crypto.createHash('sha256').update(otp).digest('hex');
        
        // We use a transaction to prevent race conditions on attempt counts or double-usage
        const result = await adminDb.runTransaction(async (t) => {
            const doc = await t.get(otpRef);
            
            if (!doc.exists) {
                return { status: 400, message: 'Invalid or expired OTP request.' };
            }
            
            const data = doc.data();
            
            if (data.used) {
                return { status: 400, message: 'This OTP has already been used.' };
            }
            
            if (data.smsStatus === 'failed') {
                return { status: 400, message: 'This OTP request is invalid due to delivery failure.' };
            }
            
            if (data.attempts >= 5) {
                return { status: 400, message: 'Maximum attempts reached. Please request a new OTP.' };
            }
            
            const now = Date.now();
            if (now > data.expiresAt.toMillis()) {
                return { status: 400, message: 'This OTP has expired. Please request a new one.' };
            }
            
            if (data.otpHash !== submittedHash) {
                // Increment attempt
                t.update(otpRef, { attempts: admin.firestore.FieldValue.increment(1) });
                return { status: 400, message: 'Incorrect OTP.' };
            }
            
            // Success - Mark as used
            t.update(otpRef, { used: true });
            
            // Issue reset token
            const resetToken = crypto.randomUUID();
            const tokenRef = adminDb.collection('password_reset_tokens').doc(resetToken);
            
            t.set(tokenRef, {
                uid: data.uid,
                expiresAt: admin.firestore.Timestamp.fromMillis(now + 15 * 60 * 1000), // 15 mins
                status: 'available', // states: available -> processing -> consumed
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return { status: 200, resetToken };
        });

        if (result.status !== 200) {
            return res.status(result.status).json({ success: false, message: result.message });
        }

        return res.status(200).json({ success: true, resetToken: result.resetToken });

    } catch (err) {
        console.error('Verify OTP Error:', err);
        return res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
}
