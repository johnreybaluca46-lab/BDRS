import { adminAuth, adminDb } from './_lib/firebase-admin.js';

// Rate limiting: 10 requests per hour per email for verification
const MAX_REQUESTS_PER_HOUR = 10;

export default async function handler(req, res) {
    // CORS Headers
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

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    
    const normalizedEmail = email.trim().toLowerCase();

    // Generic error response to avoid account enumeration
    const genericError = () => {
        return res.status(200).json({ 
            success: false, 
            message: 'If the account is registered and eligible for recovery, you will proceed to the next step. (Account not found)'
        });
    };

    try {
        // 1. Rate Limiting Check
        const rateLimitRef = adminDb.collection('rate_limits').doc(`verify_email_${normalizedEmail}`);
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
                requestsCount = 0;
            }
        }

        // Update Rate Limit
        await rateLimitRef.set({
            count: requestsCount + 1,
            firstRequestAt: requestsCount === 0 ? now : (rateLimitDoc.exists ? rateLimitDoc.data().firstRequestAt : now)
        }, { merge: true });

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
        if (!contactNumber) {
            return genericError();
        }

        // 5. Generate masked phone number (e.g. 09•••••••45)
        let maskedNumber = "";
        if (contactNumber.length >= 4) {
            maskedNumber = contactNumber.slice(0, 2) + "•••••••" + contactNumber.slice(-2);
        } else {
            maskedNumber = "••••";
        }

        return res.status(200).json({
            success: true,
            maskedNumber: maskedNumber,
            message: 'Email verified successfully.'
        });

    } catch (err) {
        console.error('Verify Email Error:', err);
        return res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
}
