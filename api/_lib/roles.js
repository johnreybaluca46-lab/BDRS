import { adminDb } from './firebase-admin.js';
import admin from 'firebase-admin';

export async function getUserRole(uid) {
    // Check if user is an admin
    const adminDoc = await adminDb.collection('admin_profiles').doc(uid).get();
    if (adminDoc.exists) {
        const data = adminDoc.data();
        if (data.status === 'Disabled' || data.status === 'Disabled Account') {
            throw new Error('Account disabled');
        }
        return { role: 'admin', data: data };
    }

    // Check if user is a resident
    const residentDoc = await adminDb.collection('residents').doc(uid).get();
    if (residentDoc.exists) {
        const data = residentDoc.data();
        if (data.status !== 'Approved') {
            throw new Error('Resident not approved');
        }
        return { role: 'resident', data: data };
    }

    return null;
}
