import admin from 'firebase-admin';
import { applyCors } from './_lib/cors.js';
import { getUserRole } from './_lib/roles.js';
import { adminDb } from './_lib/firebase-admin.js';
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});
import { generateText, tool } from 'ai';
import { z } from 'zod';

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

const roleCache = {};
const getTimeoutSignal = (ms) => {
    if (AbortSignal && AbortSignal.timeout) return AbortSignal.timeout(ms);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
};

export default async function handler(req, res) {
    applyCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        const reqId = 'req_' + Math.random().toString(36).substr(2, 6);
        const startTime = Date.now();
        console.log(`[CHAT][admin][${reqId}] auth=start role=pending req_start`);

        let uid = null;
        let isAdmin = false;

        if (process.env.NODE_ENV !== 'production') {
            uid = 'dev-admin-user';
            isAdmin = true;
        } else {
            const cookies = parseCookies(req.headers.cookie);
            const sessionCookie = cookies.__session || '';
            if (!sessionCookie) return res.status(401).json({ error: 'Unauthorized' });
            
            try {
                const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, false);
                uid = decodedClaims.uid;
                
                if (roleCache[uid] !== undefined) {
                    isAdmin = roleCache[uid];
                } else {
                    const roleInfo = await getUserRole(uid);
                    isAdmin = (roleInfo && roleInfo.role === 'admin');
                    roleCache[uid] = isAdmin;
                    setTimeout(() => { delete roleCache[uid]; }, 300000);
                }
            } catch (err) {
                console.log(`[CHAT][admin][${reqId}] error=invalid_session`);
                return res.status(401).json({ error: 'Invalid session' });
            }

            if (!isAdmin) {
                console.log(`[CHAT][admin][${reqId}] error=forbidden_role`);
                return res.status(403).json({ error: 'Forbidden. Admin role required.' });
            }
        }
        
        console.log(`[CHAT][admin][${reqId}] auth=success role=admin`);

        const rateLimitKey = 'admin_' + uid;
        const rateLimitRef = adminDb.collection('_rateLimits').doc(rateLimitKey);
        
        try {
            await adminDb.runTransaction(async (transaction) => {
                const docSnap = await transaction.get(rateLimitRef);
                const now = Date.now();
                const windowMs = 60000;
                const maxRequests = 100;
                let timestamps = docSnap.exists ? (docSnap.data().requests || []) : [];
                timestamps = timestamps.filter(t => now - t < windowMs);
                if (timestamps.length >= maxRequests) throw new Error('RATE_LIMIT_EXCEEDED');
                timestamps.push(now);
                transaction.set(rateLimitRef, { requests: timestamps });
            });
        } catch (err) {
            if (err.message === 'RATE_LIMIT_EXCEEDED') {
                console.log(`[CHAT][admin][${reqId}] rate_limit=exceeded duration=${Date.now() - startTime}ms`);
                return res.status(429).json({ error: 'Too many requests.' });
            }
            console.warn(`[CHAT][admin][${reqId}] rate_limit=bypassed error=${err.message}`);
        }
        
        const { messages } = req.body || {};
        if (!messages || !Array.isArray(messages)) {
            console.log(`[CHAT][admin][${reqId}] error=invalid_messages`);
            return res.status(400).json({ error: 'Invalid messages' });
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
            const txt = lastMessage.content.toLowerCase();
            const credentialRegex = /\b(password|passwords|otp|otps|one-time password|one time password|verification code|pin|pins|recovery code|reset token|reset code|session token|session cookie|api key|private key|authentication token|access token|secret key)\b/;
            const intentRegex = /\b(what is|what's|show|give|tell|is my|is this|check|verify|confirm|reveal|get|forgot|my|the|find|dump)\b/;
            if (credentialRegex.test(txt) && (intentRegex.test(txt) || txt.length < 40)) {
                 console.log(`[CHAT][admin][${reqId}] intent=credential_block`);
                 return res.status(200).json({ text: "I can't provide, reveal, or verify passwords, OTPs, PINs, recovery codes, or other authentication credentials." });
            }
        }
        
        const systemPrompt = `You are the BDRS Admin Assistant.
You assist authorized BDRS administrators/staff with administrative workflows and authorized system information.
Only use information exposed through explicitly authorized server-side tools.
Never assume that an admin has unrestricted database access.
Never allow arbitrary Firestore queries, arbitrary collection access, arbitrary document paths, or arbitrary UID access.
Never reveal passwords, OTPs, PINs, recovery codes, reset tokens, session cookies, API keys, private keys, or authentication tokens.
Do not expose sensitive information unnecessarily.
Only provide the minimum information necessary for the requested administrative task.`;

        const tools = {
            getSystemStats: tool({
                description: 'Get basic system statistics such as the total number of document requests and residents.',
                parameters: z.object({}),
                execute: async () => {
                    try {
                        const reqCount = (await adminDb.collection('requests').count().get()).data().count;
                        const resCount = (await adminDb.collection('residents').count().get()).data().count;
                        return { totalRequests: reqCount, totalResidents: resCount };
                    } catch (error) {
                        console.error(`[CHAT][admin][${reqId}] tool=getSystemStats error=${error.message}`);
                        return { error: "DATA_UNAVAILABLE", message: "Could not retrieve system stats." };
                    }
                },
            }),
            getPendingRequestsCount: tool({
                description: 'Get the number of pending document requests.',
                parameters: z.object({}),
                execute: async () => {
                    try {
                        const reqCount = (await adminDb.collection('requests').where('status', '==', 'Pending').count().get()).data().count;
                        return { pendingRequests: reqCount };
                    } catch (error) {
                        console.error(`[CHAT][admin][${reqId}] tool=getPendingRequestsCount error=${error.message}`);
                        return { error: "DATA_UNAVAILABLE", message: "Could not retrieve pending requests count." };
                    }
                },
            })
        };

        console.log(`[CHAT][admin][${reqId}] gemini=start`);

        const cleanMessages = messages.map(m => ({ role: m.role, content: m.content }));
        const model = groq('openai/gpt-oss-20b');
        
        let result;
        let attempts = 0;
        const maxAttempts = 1;
        
        while (attempts < maxAttempts) {
            attempts++;
            try {
                result = await generateText({
                    model: model,
                    system: systemPrompt,
                    messages: cleanMessages,
                    maxSteps: 3,
                    maxRetries: 0,
                    abortSignal: getTimeoutSignal(8000),
                    tools: tools,
                });
                break;
            } catch (err) {
                const isQuotaError = err.message.toLowerCase().includes('quota') || err.message.includes('429');
                if (isQuotaError) {
                    console.log(`[CHAT][admin][${reqId}] gemini=quota duration=${Date.now() - startTime}ms`);
                    return res.status(200).json({ text: `I'm sorry, the AI service is currently experiencing high demand and has reached its daily quota limit.` });
                } else {
                    console.error(`[CHAT][admin][${reqId}] gemini=error type=${err.name} msg=${err.message} duration=${Date.now() - startTime}ms`);
                    throw err;
                }
            }
        }
        
        console.log(`[CHAT][admin][${reqId}] gemini=success duration=${Date.now() - startTime}ms`);
        
        let finalOutput = result?.text || "I'm sorry, I couldn't process that request right now. Please try again.";
        return res.status(200).json({ text: finalOutput });

    } catch (error) {
        console.error('Admin Chat API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
