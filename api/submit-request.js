import { adminDb } from './_lib/firebase-admin.js';
import { applyCors } from './_lib/cors.js';
import { getUserRole } from './_lib/roles.js';
import admin from 'firebase-admin';

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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Base64 images can be large
    },
  },
};

export default async function handler(req, res) {
    applyCors(req, res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
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
        if (!roleInfo || roleInfo.role !== 'resident') {
            return res.status(403).json({ error: 'Unauthorized role' });
        }
        
        const { newId, type, formData, images, copies } = req.body;

        if (!newId || !type || !formData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fetch settings
        const settingsSnap = await adminDb.collection('settings').doc('general').get();
        if (!settingsSnap.exists) {
            return res.status(500).json({ error: 'Settings not found' });
        }
        const settings = settingsSnap.data();

        // Normalize document type to match settings IDs
        let normalizedId = type.toLowerCase().replace(/ /g, '_');
        
        // Find document config
        const docConfig = settings.documents?.find(d => 
            d.id === normalizedId || d.title === type || d.name === type
        );

        if (!docConfig) {
            return res.status(400).json({ error: 'Invalid document type' });
        }

        if (docConfig.status === 'inactive') {
            return res.status(400).json({ error: 'This document is currently unavailable.' });
        }

        if (formData.deliveryMethod === 'Online PDF') {
            // Legacy documents without isOnlinePaymentActive default to true
            const isOnlineActive = docConfig.isOnlinePaymentActive !== false;
            if (!isOnlineActive) {
                return res.status(400).json({ error: 'Online PDF is currently unavailable for this document.' });
            }
        }

        // Calculate totalFee securely on the server
        let fee = 0;
        if (type === 'Business Clearance') {
            if (formData.applicationType === 'New') fee = parseFloat(docConfig.firstCopyFee) || 0;
            else if (formData.applicationType === 'Renewal') fee = parseFloat(docConfig.renewalFee) || 0;
            else if (formData.applicationType === 'Closure') fee = parseFloat(docConfig.closureFee) || 0;
        } else {
            fee = parseFloat(docConfig.firstCopyFee) || 0;
        }
        
        // Multiply by copies if needed (some forms pass copies, some don't. Default to 1)
        const parsedCopies = parseInt(copies) || 1;
        const totalFee = (fee * parsedCopies).toFixed(2);

        // Prepare request document
        const requestData = {
            id: newId,
            type: type,
            status: "Pending",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            totalFee: totalFee,
            userId: uid,
            ...formData,
            copies: parsedCopies.toString(),
            ...images,
        };

        const batch = adminDb.batch();
        
        // Create Request using .create() for idempotency / prevent overwrite
        const requestRef = adminDb.collection('requests').doc(newId);
        batch.create(requestRef, requestData);

        // Notifications
        if (settings?.notificationSettings?.admin_new_request !== false) {
            const adminNotifRef = adminDb.collection('notifications').doc();
            batch.set(adminNotifRef, {
                requestId: newId,
                type: "NEW",
                documentType: type,
                residentName: formData.fullName || 'Resident',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        if (settings?.notificationSettings?.resident_req_confirmation !== false) {
            const residentNotifRef = adminDb.collection('notifications').doc();
            batch.set(residentNotifRef, {
                requestId: newId,
                userId: uid,
                type: "SUBMITTED",
                documentType: type,
                residentName: formData.fullName || 'Resident',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();

        return res.status(200).json({ success: true, id: newId });
        
    } catch (error) {
        console.error('Submit request error:', error);
        if (error.code === 6) { // ALREADY_EXISTS from create()
             return res.status(409).json({ error: 'Request ID already exists' });
        }
        return res.status(500).json({ error: 'Failed to submit request' });
    }
}
