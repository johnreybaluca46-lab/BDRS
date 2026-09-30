import { adminAuth, adminDb } from './_lib/firebase-admin.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Rate limiting: 5 requests per hour per email
const MAX_REQUESTS_PER_HOUR = 5;

export default async function handler(req, res) {
    // CORS Headers to allow requests from any origin (Native app or Web)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    if (!adminAuth || !adminDb) {
        return res.status(500).json({ success: false, message: 'Backend configuration error.' });
    }

    const { email, type } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    
    const normalizedEmail = email.trim().toLowerCase();

    // Generic error response to avoid account enumeration
    const genericError = () => {
        return res.status(200).json({ 
            success: false, 
            message: 'If your account is registered and verified, you will receive an OTP shortly.'
        });
    };

    try {
        // 1. Rate Limiting Check
        const rateLimitRef = adminDb.collection('rate_limits').doc(`otp_email_${normalizedEmail}`);
        const rateLimitDoc = await rateLimitRef.get();
        let requestsCount = 0;
        const now = Date.now();
        const oneHourMs = 60 * 60 * 1000;

        if (rateLimitDoc.exists) {
            const data = rateLimitDoc.data();
            if (now - data.firstRequestAt < oneHourMs) {
                requestsCount = data.count;
                if (requestsCount >= MAX_REQUESTS_PER_HOUR) {
                    return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
                }
            } else {
                // Reset after 1 hour
                requestsCount = 0;
            }
        }

        // 2. Find User by Email
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(normalizedEmail);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                return genericError();
            }
            throw error;
        }

        const uid = userRecord.uid;

        // 3. Fetch Resident Document
        const residentDoc = await adminDb.collection('residents').doc(uid).get();
        if (!residentDoc.exists) {
            return genericError();
        }

        const residentData = residentDoc.data();
        
        // 4. Check Status
        if (residentData.status !== 'Approved') {
            return genericError();
        }

        // 5. Check Resend Cooldown (60s)
        // We can query otp_requests to see if an OTP was generated in the last 60 seconds
        const recentOtpQuery = await adminDb.collection('otp_requests')
            .where('uid', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
            
        if (!recentOtpQuery.empty) {
            const recentOtp = recentOtpQuery.docs[0].data();
            const createdAtMs = recentOtp.createdAt.toMillis();
            if (now - createdAtMs < 60000) {
                return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP.' });
            }
        }

        // 5.5 Invalidate Previous OTPs
        const activeOtpsQuery = await adminDb.collection('otp_requests')
            .where('uid', '==', uid)
            .where('used', '==', false)
            .get();
            
        if (!activeOtpsQuery.empty) {
            const batch = adminDb.batch();
            activeOtpsQuery.docs.forEach(doc => {
                batch.update(doc.ref, { used: true, invalidatedByNewRequest: true });
            });
            await batch.commit();
        }

        // 6. Generate OTP and Hash
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
        
        const requestId = crypto.randomUUID();
        
        // 7. Store OTP Request
        const otpRef = adminDb.collection('otp_requests').doc(requestId);
        await otpRef.set({
            uid: uid,
            email: normalizedEmail,
            otpHash: otpHash,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromMillis(now + 5 * 60 * 1000), // 5 mins
            attempts: 0,
            used: false,
            emailStatus: 'pending'
        });

        // 8. Update Rate Limit
        await rateLimitRef.set({
            count: requestsCount + 1,
            firstRequestAt: requestsCount === 0 ? now : (rateLimitDoc.exists ? rateLimitDoc.data().firstRequestAt : now)
        }, { merge: true });

        // 9. Send Email via EmailJS REST API
        try {
            const emailjsPayload = {
                service_id: 'service_w1ob7up',
                template_id: 'template_q894rgg',
                user_id: 'KMMrcnP9uoVqdFJAy',
                template_params: {
                    to_name: residentData.firstName || 'Resident',
                    email: normalizedEmail,
                    otp_code: otpCode
                }
            };

            const emailjsResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailjsPayload)
            });

            if (!emailjsResponse.ok) {
                console.error(`EmailJS API error: ${emailjsResponse.status} ${emailjsResponse.statusText}`);
                const errorText = await emailjsResponse.text();
                console.error('EmailJS details:', errorText);
                await otpRef.update({ emailStatus: 'failed', used: true });
                return res.status(500).json({ success: false, message: 'Email service is currently unavailable. Please try again later.' });
            }

            await otpRef.update({ emailStatus: 'sent' });

        } catch (emailError) {
            console.error('Failed to send email OTP via EmailJS:', emailError);
            await otpRef.update({ emailStatus: 'failed', used: true });
            return res.status(500).json({ success: false, message: 'Email service is currently offline. Please try again later.' });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'A verification code has been sent to your email address.',
            requestId 
        });

    } catch (err) {
        console.error('Request OTP Error:', err);
        return res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
}
