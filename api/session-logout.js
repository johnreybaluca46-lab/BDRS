import admin from 'firebase-admin';
import { applyCors } from './_lib/cors.js';

function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(c => {
        let [name, ...rest] = c.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });
    return list;
}

export default async function handler(req, res) {
    applyCors(req, res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // CSRF Protection
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ error: 'Missing CSRF protection header' });
    }
    
    try {
        const cookies = parseCookies(req.headers.cookie);
        const sessionCookie = cookies.__session || '';
        
        if (sessionCookie) {
            const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
            // Revoke all refresh tokens for this user, killing all active sessions
            await admin.auth().revokeRefreshTokens(decodedClaims.uid);
        }
    } catch (error) {
        // Ignore token errors on logout (they are already logged out effectively)
        console.log("Logout token error ignored:", error.message);
    }
    
    // Clear the cookie
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const cookieOptions = isProd 
        ? `HttpOnly; Max-Age=0; Path=/; SameSite=None; Secure`
        : `HttpOnly; Max-Age=0; Path=/; SameSite=Lax`;
    res.setHeader('Set-Cookie', `__session=; ${cookieOptions}`);
    
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
}
