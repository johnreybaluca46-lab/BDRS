import admin from 'firebase-admin';
import { applyCors } from './_lib/cors.js';
import { getUserRole } from './_lib/roles.js';
import { adminDb } from './_lib/firebase-admin.js';
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

let cachedSettings = null;
let lastSettingsFetch = 0;
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
        if (!process.env.GROQ_API_KEY) {
            console.error("[CHAT][resident] GROQ_API_KEY is not configured");
            return res.status(500).json({ error: "AI service is not configured" });
        }
        
        const { createGroq } = await import('@ai-sdk/groq');
        const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
        const reqId = 'req_' + Math.random().toString(36).substr(2, 6);
        const startTime = Date.now();
        console.log(`[CHAT][resident][${reqId}] auth=start role=pending req_start`);

        let uid = null;
        let isResident = false;

        if (process.env.NODE_ENV !== 'production') {
            uid = 'dev-resident-user';
            isResident = true;
        } else {
            const cookies = parseCookies(req.headers.cookie);
            const sessionCookie = cookies.__session || '';
            if (!sessionCookie) return res.status(401).json({ error: 'Unauthorized' });
            
            try {
                const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, false);
                uid = decodedClaims.uid;
                
                if (roleCache[uid] !== undefined) {
                    isResident = roleCache[uid];
                } else {
                    const roleInfo = await getUserRole(uid);
                    isResident = (roleInfo && roleInfo.role === 'resident');
                    roleCache[uid] = isResident;
                    setTimeout(() => { delete roleCache[uid]; }, 300000);
                }
            } catch (err) {
                console.log(`[CHAT][resident][${reqId}] error=invalid_session`);
                return res.status(401).json({ error: 'Invalid session' });
            }

            if (!isResident) {
                console.log(`[CHAT][resident][${reqId}] error=forbidden_role`);
                return res.status(403).json({ error: 'Forbidden. Resident role required.' });
            }
        }
        
        console.log(`[CHAT][resident][${reqId}] auth=success role=resident`);

        const rateLimitKey = 'res_' + uid;
        const rateLimitRef = adminDb.collection('_rateLimits').doc(rateLimitKey);
        
        try {
            await adminDb.runTransaction(async (transaction) => {
                const docSnap = await transaction.get(rateLimitRef);
                const now = Date.now();
                const windowMs = 60000;
                const maxRequests = 60;
                let timestamps = docSnap.exists ? (docSnap.data().requests || []) : [];
                timestamps = timestamps.filter(t => now - t < windowMs);
                if (timestamps.length >= maxRequests) throw new Error('RATE_LIMIT_EXCEEDED');
                timestamps.push(now);
                transaction.set(rateLimitRef, { requests: timestamps });
            });
        } catch (err) {
            if (err.message === 'RATE_LIMIT_EXCEEDED') {
                console.log(`[CHAT][resident][${reqId}] rate_limit=exceeded duration=${Date.now() - startTime}ms`);
                return res.status(429).json({ error: 'Too many requests.' });
            }
            console.warn(`[CHAT][resident][${reqId}] rate_limit=bypassed error=${err.message}`);
        }
        
        const { messages } = req.body || {};
        if (!messages || !Array.isArray(messages)) {
            console.log(`[CHAT][resident][${reqId}] error=invalid_messages`);
            return res.status(400).json({ error: 'Invalid messages' });
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
            const txt = lastMessage.content.toLowerCase();
            const credentialRegex = /\b(password|passwords|otp|otps|one-time password|one time password|verification code|pin|pins|recovery code|reset token|reset code|session token|session cookie|api key|private key|authentication token|access token|secret key)\b/;
            const intentRegex = /\b(what is|what's|show|give|tell|is my|is this|check|verify|confirm|reveal|get|forgot|my|the|find|dump)\b/;
            if (credentialRegex.test(txt) && (intentRegex.test(txt) || txt.length < 40)) {
                 console.log(`[CHAT][resident][${reqId}] intent=credential_block`);
                 return res.status(200).json({ text: "I can't provide, reveal, or verify passwords, OTPs, PINs, recovery codes, or other authentication credentials." });
            }
        }
        
        if (!cachedSettings || Date.now() - lastSettingsFetch > 300000) {
            const settingsSnap = await adminDb.collection('settings').doc('general').get();
            cachedSettings = settingsSnap.exists ? settingsSnap.data() : {};
            lastSettingsFetch = Date.now();
        }
        const settings = cachedSettings;
        
        const systemPrompt = `You are the BDRS Resident Assistant.
You assist the currently authenticated resident.
You may answer general BDRS questions and provide information about the authenticated resident's own requests when authorized server-side.
Never access another resident's information.
Never trust a UID supplied by the client.
The authenticated resident identity comes only from the verified server-side session.
Never reveal passwords, OTPs, PINs, recovery codes, reset tokens, session cookies, API keys, private keys, or authentication tokens.
Do not invent request status, payment information, fees, or dates.
Use authorized tools when personal request information is required.

BDRS Knowledge Base:
- Office Hours: ${settings.officeHours || 'Not specified'}
- Contact: ${settings.contactNumber || 'Not specified'}
- Address: ${settings.address || 'Not specified'}`;

        const tools = {
            getMyRequests: tool({
                description: 'Get the current user\'s document requests and their statuses. Use this when the user asks about their pending documents, payments, or past requests.',
                parameters: z.object({}),
                execute: async () => {
                    try {
                        const q = adminDb.collection('requests').where('userId', '==', uid);
                        const snaps = await q.get();
                        if (snaps.empty) return { message: "You have no document requests on file." };
                        let requests = snaps.docs.map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                type: data.type,
                                status: data.status,
                                totalFee: data.totalFee,
                                deliveryMethod: data.deliveryMethod,
                                timestampMillis: data.timestamp ? data.timestamp.toMillis() : 0,
                                createdAt: data.timestamp ? data.timestamp.toDate().toISOString() : null
                            };
                        });
                        requests.sort((a, b) => b.timestampMillis - a.timestampMillis);
                        return { requests: requests.slice(0, 10).map(({timestampMillis, ...rest}) => rest) };
                    } catch (error) {
                        console.error(`[CHAT][resident][${reqId}] tool=getMyRequests error=${error.message}`);
                        return { error: "DATA_UNAVAILABLE", message: "Could not retrieve requests at this time." };
                    }
                },
            })
        };

        console.log(`[CHAT][resident][${reqId}] gemini=start`);

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
                    console.log(`[CHAT][resident][${reqId}] gemini=quota duration=${Date.now() - startTime}ms`);
                    return res.status(200).json({ text: `I'm sorry, the AI service is currently experiencing high demand and has reached its daily quota limit.` });
                } else {
                    console.error(`[CHAT][resident][${reqId}] gemini=error type=${err.name} msg=${err.message} duration=${Date.now() - startTime}ms`);
                    throw err;
                }
            }
        }
        
        console.log(`[CHAT][resident][${reqId}] gemini=success duration=${Date.now() - startTime}ms`);
        
        let finalOutput = result?.text || "I'm sorry, I couldn't process that request right now. Please try again.";
        return res.status(200).json({ text: finalOutput });

    } catch (error) {
        console.error('Resident Chat API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
