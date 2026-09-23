import { adminAuth, adminDb } from './_lib/firebase-admin.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Rate limiting: 5 requests per hour per email
const MAX_REQUESTS_PER_HOUR = 5;

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

    if (!adminAuth || !adminDb) {
        return res.status(500).json({ success: false, message: 'Backend configuration error.' });
    }

    const { email, mobileNumber } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!mobileNumber || typeof mobileNumber !== 'string') {
        return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const providedMobile = mobileNumber.trim();

    // Generic error response to avoid account enumeration
    const genericError = () => {
        return res.status(200).json({ 
            success: false, 
            message: 'Invalid email or mobile number.'
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

        const contactNumber = residentData.contactNumber;
        if (!contactNumber || contactNumber !== providedMobile) {
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

        // 6. Generate OTP and Hash
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
        
        const requestId = crypto.randomUUID();
        
        // 7. Store OTP Request
        const otpRef = adminDb.collection('otp_requests').doc(requestId);
        await otpRef.set({
            uid: uid,
            email: normalizedEmail,
            contactNumberMasked: "*".repeat(Math.max(0, contactNumber.length - 4)) + contactNumber.slice(-4),
            otpHash: otpHash,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromMillis(now + 5 * 60 * 1000), // 5 mins
            attempts: 0,
            used: false,
            smsStatus: 'pending'
        });

        // 8. Update Rate Limit
        await rateLimitRef.set({
            count: requestsCount + 1,
            firstRequestAt: requestsCount === 0 ? now : (rateLimitDoc.exists ? rateLimitDoc.data().firstRequestAt : now)
        }, { merge: true });

        // 9. Send SMS via Traccar Gateway
        let traccarUrl = process.env.TRACCAR_SMS_URL;
        let traccarToken = process.env.TRACCAR_API_TOKEN;

        // Fallback for local Vercel CLI bug where process.env is missing
        if (!traccarUrl || !traccarToken) {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const envPath = path.resolve(process.cwd(), '.env.local');
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const urlMatch = envContent.match(/TRACCAR_SMS_URL="?([^"\n]+)"?/);
                    const tokenMatch = envContent.match(/TRACCAR_API_TOKEN="?([^"\n]+)"?/);
                    if (urlMatch) traccarUrl = urlMatch[1];
                    if (tokenMatch) traccarToken = tokenMatch[1];
                }
            } catch (e) {
                console.error("Failed to fallback read .env.local", e);
            }
        }

        if (!traccarUrl || !traccarToken) {
            console.error('Traccar configuration missing in environment variables.');
            await otpRef.update({ smsStatus: 'failed', used: true });
            return res.status(500).json({ success: false, message: 'Debug Error: Missing TRACCAR_SMS_URL or TRACCAR_API_TOKEN in .env.local' });
        }

        try {
            const smsPayload = {
                to: contactNumber,
                message: `Your BDRS password reset OTP is: ${otpCode}. It expires in 5 minutes. Do not share this code with anyone.`
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const traccarRes = await fetch(traccarUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': traccarToken
                },
                body: JSON.stringify(smsPayload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!traccarRes.ok) {
                console.error(`Traccar API error: ${traccarRes.status} ${traccarRes.statusText}`);
                await otpRef.update({ smsStatus: 'failed', used: true });
                return res.status(500).json({ success: false, message: 'SMS Gateway is currently unavailable. Please try again later.' });
            }

            await otpRef.update({ smsStatus: 'sent' });

            // Note: Traccar SMS app returns standard OK response if queued. 
        } catch (smsError) {
            console.error('Failed to communicate with Traccar SMS Gateway:', smsError);
            await otpRef.update({ smsStatus: 'failed', used: true });
            if (smsError.name === 'AbortError') {
                return res.status(504).json({ success: false, message: 'SMS Gateway connection timed out. Please try again later.' });
            }
            return res.status(500).json({ success: false, message: 'SMS Gateway is currently offline. Please try again later.' });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'A verification code has been sent to your mobile number.',
            requestId 
        });

    } catch (err) {
        console.error('Request OTP Error:', err);
        return res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
}
