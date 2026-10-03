import admin from 'firebase-admin';
import { applyCors } from './_lib/cors.js';
import { adminDb } from './_lib/firebase-admin.js';


let cachedSettings = null;
let lastSettingsFetch = 0;

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
            console.error("[CHAT][public] GROQ_API_KEY is not configured");
            return res.status(500).json({ error: "AI service is not configured" });
        }
        
        const { createGroq } = await import('@ai-sdk/groq');
        const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
        const { generateText } = await import('ai');
        const reqId = 'req_' + Math.random().toString(36).substr(2, 6);
        const startTime = Date.now();
        console.log(`[CHAT][public][${reqId}] auth=none role=public req_start`);

        const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'guest';
        const rateLimitKey = 'public_' + clientIp;
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
                console.log(`[CHAT][public][${reqId}] rate_limit=exceeded duration=${Date.now() - startTime}ms`);
                return res.status(429).json({ error: 'Too many requests. Please try again later.' });
            }
            console.warn(`[CHAT][public][${reqId}] rate_limit=bypassed error=${err.message}`);
        }
        
        const { messages } = req.body || {};
        if (!messages || !Array.isArray(messages)) {
            console.log(`[CHAT][public][${reqId}] error=invalid_messages`);
            return res.status(400).json({ error: 'Invalid messages array' });
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
            const txt = lastMessage.content.toLowerCase();
            const credentialRegex = /\b(password|passwords|otp|otps|one-time password|one time password|verification code|pin|pins|recovery code|reset token|reset code|session token|session cookie|api key|private key|authentication token|access token|secret key)\b/;
            const intentRegex = /\b(what is|what's|show|give|tell|is my|is this|check|verify|confirm|reveal|get|forgot|my|the|find|dump)\b/;
            
            if (credentialRegex.test(txt) && (intentRegex.test(txt) || txt.length < 40)) {
                 console.log(`[CHAT][public][${reqId}] intent=credential_block`);
                 return res.status(200).json({ text: "I can't provide, reveal, or verify passwords, OTPs, PINs, recovery codes, or other authentication credentials through the BDRS Assistant." });
            }
        }
        
        if (!cachedSettings || Date.now() - lastSettingsFetch > 300000) {
            const settingsSnap = await adminDb.collection('settings').doc('general').get();
            cachedSettings = settingsSnap.exists ? settingsSnap.data() : {};
            lastSettingsFetch = Date.now();
        }
        const settings = cachedSettings;
        
        if (lastMessage && lastMessage.role === 'user') {
            const txt = lastMessage.content.toLowerCase();
            const isDocQuery = txt.includes('what documents can i request') || txt.includes('what documents') || txt === 'documents';
            const isHoursQuery = txt.includes('office hours') || (txt.includes('what time') && txt.includes('open'));
            const isPaymentQuery = txt.includes('how does payment work') || txt.includes('how to pay');
            const isIndigencyFeeQuery = (txt.includes('indigency') || txt.includes('indigent')) && (txt.includes('fee') || txt.includes('free') || txt.includes('cost') || txt.includes('pay'));

            if (isDocQuery) {
                const docsList = (settings.documents || []).map(d => `- ${d.title}: ₱${d.firstCopyFee}`).join('\n');
                console.log(`[CHAT][public][${reqId}] faq=true type=docQuery duration=${Date.now() - startTime}ms`);
                return res.status(200).json({ text: `Here are the documents you can request:\n${docsList}\n\nYou can request these directly through the BDRS app.` });
            }
            if (isHoursQuery) {
                console.log(`[CHAT][public][${reqId}] faq=true type=hoursQuery duration=${Date.now() - startTime}ms`);
                return res.status(200).json({ text: `Our office hours are: ${settings.officeHours || 'Not specified'}.\nLunch break: ${settings.lunchBreak || 'Not specified'}.` });
            }
            if (isPaymentQuery) {
                console.log(`[CHAT][public][${reqId}] faq=true type=paymentQuery duration=${Date.now() - startTime}ms`);
                return res.status(200).json({ text: `Payments can typically be made at the barangay hall cashier upon claiming your document. Please check your request status for specific payment instructions.` });
            }
            if (isIndigencyFeeQuery) {
                const doc = (settings.documents || []).find(d => d.title && d.title.toLowerCase().includes('indigency'));
                if (doc) {
                    const isFree = doc.firstCopyFee == 0 || doc.firstCopyFee === '0';
                    console.log(`[CHAT][public][${reqId}] faq=true type=indigencyFeeQuery duration=${Date.now() - startTime}ms`);
                    return res.status(200).json({ text: `The Certificate of Indigency ${isFree ? 'is free of charge (₱0)' : `costs ₱${doc.firstCopyFee} for the first copy`}. Processing time is ${doc.processingTime}.` });
                }
            }
        }
        
        console.log(`[CHAT][public][${reqId}] faq=false gemini=start`);
        
    const systemPrompt = `You are the public BDRS Assistant.
You help visitors understand the Barangay Document Request System.
Only provide public BDRS information.
Never access or reveal private resident information, administrative information, credentials, authentication information, security logs, API keys, session cookies, passwords, OTPs, recovery codes, or reset tokens.
Do not claim to know information that is not provided by the BDRS public configuration.
Use configured BDRS settings for fees, office hours, services, and processing information.
If information is unavailable, say that the information is not currently available.
FORMATTING INSTRUCTIONS:
Always use clean, readable Markdown (headings, bold text, numbered lists).
Prefer clean step-by-step lists over large Markdown tables. Only use tables for simple comparative data.

BDRS Knowledge Base:
- Office Hours: ${settings.officeHours || 'Not specified'}
- Lunch Break: ${settings.lunchBreak || 'Not specified'}
- Contact: ${settings.contactNumber || 'Not specified'}
- Address: ${settings.address || 'Not specified'}
- Barangay Name: ${settings.barangayName || 'Not specified'}

Available Documents and Fees:
${(settings.documents || []).map(doc => `- ${doc.title}: ${doc.desc}. Fee: ₱${doc.firstCopyFee} (Additional copies: ₱${doc.additionalCopyFee}). Processing time: ${doc.processingTime}`).join('\n')}

Registration Information (Public Knowledge):
- How to create an account: Users must visit the BDRS Resident Registration page, complete the form, and upload the required documents.
- Required information: Active Gmail address, full name, date of birth, civil status, sex, contact number, purok/zone, house/block no, occupation, length of stay, place of birth, nationality, complete address, a formal 2x2 photo (white background), and a valid ID (Barangay ID, Voter's ID, or National ID).
- Registration Status: After submission, the account status is initially "Pending". Users receive a Registration ID (RES-Number) and QR code.
- Approval Process: Barangay administrators manually review and approve pending registrations (typically within 1 to 2 days). No automatic approval emails or SMS notifications are sent.
- Login while Pending: Users cannot access the resident dashboard while their account is "Pending". They must wait for the admin to change their status to "Approved".
- Rejected Registrations: If an account is rejected by the admin, the user will be blocked from accessing the system and must register again with correct details or visit the barangay hall.`;

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
                });
                break;
            } catch (err) {
                const isQuotaError = err.message.toLowerCase().includes('quota') || err.message.includes('429');
                    
                if (isQuotaError) {
                    let waitTimeText = "";
                    const retryMatch = err.message.match(/Please retry in ([^.]+)\./i);
                    if (retryMatch && retryMatch[1]) waitTimeText = ` (Resets in: ${retryMatch[1]})`;
                    console.log(`[CHAT][public][${reqId}] gemini=quota duration=${Date.now() - startTime}ms`);
                    return res.status(200).json({ text: `I'm sorry, the AI service is currently experiencing high demand and has reached its daily quota limit. Please try again later.${waitTimeText}` });
                } else {
                    console.error(`[CHAT][public][${reqId}] gemini=error type=${err.name} msg=${err.message} duration=${Date.now() - startTime}ms`);
                    throw err;
                }
            }
        }
        
        console.log(`[CHAT][public][${reqId}] gemini=success duration=${Date.now() - startTime}ms`);
        let finalOutput = result?.text || "I'm sorry, I couldn't process that request right now. Please try again.";
        return res.status(200).json({ text: finalOutput });

    } catch (error) {
        console.error('Public Chat API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
