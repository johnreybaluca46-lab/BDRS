const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase-admin/app");
const crypto = require("crypto");

initializeApp();

const db = getFirestore();
const auth = getAuth();

/**
 * submitRegistration
 * Called by a newly authenticated resident.
 * Ensures idempotency and securely sets up the initial registration documents.
 */
exports.submitRegistration = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const uid = request.auth.uid;
    const data = request.data;

    // Check idempotency: If user already has a registration, return it.
    const existingRef = await db.collection("residents").where("userId", "==", uid).limit(1).get();
    if (!existingRef.empty) {
        const existingData = existingRef.docs[0].data();
        return {
            id: existingData.id,
            qrToken: existingData.qrToken,
            status: existingData.status,
        };
    }

    // Generate secure unpredictable QR token
    const qrToken = crypto.randomUUID();

    // Generate RES Number (e.g., RES-2026-XXXXX)
    // We use crypto.randomInt for a better random distribution than Math.random()
    const year = new Date().getFullYear();
    const randomNum = crypto.randomInt(10000, 99999);
    const newId = `RES-${year}-${randomNum}`;

    const timestamp = FieldValue.serverTimestamp();

    // Construct resident data safely
    const residentData = {
        id: newId,
        userId: uid,
        status: "Pending",
        qrToken: qrToken,
        timestamp: timestamp,
        emailAddress: data.emailAddress || "",
        fullName: data.fullName || "",
        dateOfBirth: data.dateOfBirth || "",
        civilStatus: data.civilStatus || "",
        sex: data.sex || "",
        contactNumber: data.contactNumber || "",
        purok: data.purok || "",
        houseNo: data.houseNo || "",
        occupation: data.occupation || "",
        lengthOfStay: data.lengthOfStay || "",
        placeOfBirth: data.placeOfBirth || "",
        nationality: data.nationality || "Filipino",
        completeAddress: data.completeAddress || "",
        photo2x2: data.photo2x2 || null
    };

    const publicStatusData = {
        resNumber: newId,
        status: "Pending",
        submittedAt: timestamp,
        updatedAt: timestamp
    };

    try {
        const batch = db.batch();
        batch.set(db.collection("residents").doc(newId), residentData);
        batch.set(db.collection("registration_status").doc(qrToken), publicStatusData);
        
        // Commit Firestore writes first
        await batch.commit();

        // After successful commit, update Custom Claims
        await auth.setCustomUserClaims(uid, { role: "resident", status: "pending" });

        return {
            id: newId,
            qrToken: qrToken,
            status: "Pending"
        };
    } catch (error) {
        console.error("Error in submitRegistration:", error);
        throw new HttpsError("internal", "Failed to submit registration.");
    }
});

/**
 * approveRejectRegistration
 * Called by Admin to securely update a resident's status.
 * Utilizes a Firestore Transaction to prevent concurrency issues and replay attacks.
 */
exports.approveRejectRegistration = onCall(async (request) => {
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new HttpsError("permission-denied", "Requires Admin authorization.");
    }

    const { residentId, action } = request.data;
    if (!residentId || !action) {
        throw new HttpsError("invalid-argument", "Missing residentId or action.");
    }

    if (action !== "Approved" && action !== "Rejected") {
        throw new HttpsError("invalid-argument", "Action must be Approved or Rejected.");
    }

    const adminName = request.auth.token.name || request.auth.token.email || "Admin";

    let residentUserId = null;

    try {
        await db.runTransaction(async (t) => {
            const residentRef = db.collection("residents").doc(residentId);
            const residentDoc = await t.get(residentRef);

            if (!residentDoc.exists) {
                throw new HttpsError("not-found", "Resident registration not found.");
            }

            const residentData = residentDoc.data();
            
            if (residentData.status !== "Pending") {
                throw new HttpsError("failed-precondition", "Registration is no longer Pending.");
            }

            residentUserId = residentData.userId;
            const qrToken = residentData.qrToken;
            const timestamp = FieldValue.serverTimestamp();

            // Update Resident Document
            t.update(residentRef, { status: action });

            // Update Public Status Document
            if (qrToken) {
                const publicStatusRef = db.collection("registration_status").doc(qrToken);
                t.update(publicStatusRef, { status: action, updatedAt: timestamp });
            }

            // Create Notification
            const notifRef = db.collection("notifications").doc();
            t.set(notifRef, {
                userId: residentUserId, // Link safely to the user's Auth UID
                type: action === "Approved" ? "RESIDENT_APPROVED" : "RESIDENT_REJECTED",
                residentName: residentData.fullName || "Resident",
                timestamp: timestamp
            });

            // Create Audit Log
            const auditRef = db.collection("activity_logs").doc();
            t.set(auditRef, {
                action: "Resident Account Status Changed",
                targetType: "resident_profile",
                targetId: residentId,
                description: `${action} resident registration for ${residentData.fullName || 'Unknown'}`,
                adminId: request.auth.uid,
                adminEmail: request.auth.token.email || "",
                timestamp: timestamp
            });
        });

        // After successful transaction, update Firebase Auth Custom Claims
        if (residentUserId) {
            await auth.setCustomUserClaims(residentUserId, { role: "resident", status: action.toLowerCase() });
            
            if (action === "Rejected") {
                await auth.revokeRefreshTokens(residentUserId);
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error in approveRejectRegistration:", error);
        // Rethrow HttpsErrors directly
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to process approval/rejection.");
    }
});

/**
 * syncUserClaims
 * A secure reconciliation function. Discards client payload and derives state from Firestore.
 */
exports.syncUserClaims = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const uid = request.auth.uid;

    try {
        // Query the authoritative resident document
        const snapshot = await db.collection("residents").where("userId", "==", uid).limit(1).get();
        if (snapshot.empty) {
            throw new HttpsError("not-found", "Resident record not found.");
        }

        const residentData = snapshot.docs[0].data();
        const authoritativeStatus = residentData.status ? residentData.status.toLowerCase() : "pending";

        // Re-apply the correct Custom Claim based strictly on the backend fetch
        await auth.setCustomUserClaims(uid, { role: "resident", status: authoritativeStatus });
        
        if (authoritativeStatus === "rejected") {
            await auth.revokeRefreshTokens(uid);
        }

        return { success: true, status: authoritativeStatus };
    } catch (error) {
        console.error("Error in syncUserClaims:", error);
        throw new HttpsError("internal", "Failed to sync user claims.");
    }
});
