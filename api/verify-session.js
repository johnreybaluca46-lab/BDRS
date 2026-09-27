import admin from 'firebase-admin';
import { applyCors } from './_lib/cors.js';
import { getUserRole } from './_lib/roles.js';

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
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
        const cookies = parseCookies(req.headers.cookie);
        const sessionCookie = cookies.__session || '';
        
        if (!sessionCookie) {
            return res.status(401).json({ error: 'No session cookie' });
        }
        
        // Verify the session cookie
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
        const uid = decodedClaims.uid;
        
        // Double check authorization role
        const roleInfo = await getUserRole(uid);
        if (!roleInfo) {
            // Revoke immediately if role was removed
            const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
            const cookieOptions = isProd 
                ? `HttpOnly; Max-Age=0; Path=/; SameSite=None; Secure`
                : `HttpOnly; Max-Age=0; Path=/; SameSite=Lax`;
            res.setHeader('Set-Cookie', `__session=; ${cookieOptions}`);
            return res.status(403).json({ error: 'Unauthorized role' });
        }
        
        // Mint a short-lived custom token for the client to use in memory
        const customToken = await admin.auth().createCustomToken(uid, { role: roleInfo.role });
        
        return res.status(200).json({ 
            success: true, 
            customToken,
            role: roleInfo.role,
            user: roleInfo.data
        });
        
    } catch (error) {
        console.error('Verify session error:', error);
        // If cookie is invalid or expired, clear it
        const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
        const cookieOptions = isProd 
            ? `HttpOnly; Max-Age=0; Path=/; SameSite=None; Secure`
            : `HttpOnly; Max-Age=0; Path=/; SameSite=Lax`;
        res.setHeader('Set-Cookie', `__session=; ${cookieOptions}`);
        return res.status(401).json({ error: 'UNAUTHORIZED REQUEST' });
    }
}
