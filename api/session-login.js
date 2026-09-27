import admin from 'firebase-admin';
import { applyCors } from './_lib/cors.js';
import { getUserRole } from './_lib/roles.js';

export default async function handler(req, res) {
    applyCors(req, res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // CSRF Protection: Require X-Requested-With header
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ error: 'Missing CSRF protection header' });
    }

    const { idToken } = req.body;
    if (!idToken) {
        return res.status(400).json({ error: 'Missing ID token' });
    }

    try {
        // Verify the ID token first
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        // Ensure user has a valid role (Admin or Approved Resident)
        const roleInfo = await getUserRole(uid);
        if (!roleInfo) {
            return res.status(403).json({ error: 'Unauthorized user role' });
        }
        
        // Create session cookie (expires in 24 hours)
        const expiresIn = 60 * 60 * 24 * 1000;
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        
        // Use SameSite=None; Secure to support cross-site Firebase Hosting -> Vercel API in production
        const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
        const cookieOptions = isProd 
            ? `HttpOnly; Max-Age=${expiresIn / 1000}; Path=/; SameSite=None; Secure`
            : `HttpOnly; Max-Age=${expiresIn / 1000}; Path=/; SameSite=Lax`;
        
        res.setHeader('Set-Cookie', `__session=${sessionCookie}; ${cookieOptions}`);
        
        return res.status(200).json({ success: true, role: roleInfo.role, user: roleInfo.data });
    } catch (error) {
        console.error('Session login error:', error);
        return res.status(401).json({ error: error.message || 'UNAUTHORIZED REQUEST' });
    }
}
