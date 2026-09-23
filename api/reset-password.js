import { adminAuth, adminDb } from './_lib/firebase-admin.js';
import { validatePasswordStrength } from './_lib/validation.js';

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

    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || typeof resetToken !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid request.' });
    }

    if (!validatePasswordStrength(newPassword)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password does not meet the security requirements.' 
        });
    }

    const tokenRef = adminDb.collection('password_reset_tokens').doc(resetToken);

    try {
        // Step 1: Transaction to claim the token (available -> processing)
        const claimResult = await adminDb.runTransaction(async (t) => {
            const doc = await t.get(tokenRef);
            
            if (!doc.exists) {
                return { success: false, status: 400, message: 'Invalid or expired reset token.' };
            }
            
            const data = doc.data();
            
            if (data.status !== 'available') {
                return { success: false, status: 400, message: 'This reset token has already been used or is currently processing.' };
            }
            
            const now = Date.now();
            if (now > data.expiresAt.toMillis()) {
                return { success: false, status: 400, message: 'This reset token has expired.' };
            }
            
            // Claim the token
            t.update(tokenRef, { status: 'processing' });
            
            return { success: true, uid: data.uid };
        });

        if (!claimResult.success) {
            return res.status(claimResult.status).json({ success: false, message: claimResult.message });
        }

        const uid = claimResult.uid;

        // Step 2: Update Firebase Auth (Outside the transaction to avoid side-effects during retries)
        try {
            await adminAuth.updateUser(uid, {
                password: newPassword
            });
        } catch (authError) {
            console.error('Firebase Auth Update Error:', authError);
            
            // Rollback token to 'available' so user can try again
            await tokenRef.update({ status: 'available' });
            
            return res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
        }

        // Step 3: Mark token as consumed (or delete it)
        await tokenRef.delete();

        return res.status(200).json({ success: true, message: 'Password reset successfully.' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        return res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
}
