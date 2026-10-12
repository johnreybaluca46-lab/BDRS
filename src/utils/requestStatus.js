/**
 * Utility functions for resolving document request status and expiration.
 */

export const EXPIRATION_DAYS = 7;
export const EXPIRATION_MS = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

export function getApprovedDate(req) {
  if (!req?.approvedAt) return null;
  if (req.approvedAt.toDate) return req.approvedAt.toDate();
  if (req.approvedAt.seconds) return new Date(req.approvedAt.seconds * 1000);
  if (req.approvedAt instanceof Date) return req.approvedAt;
  return new Date(req.approvedAt);
}

export function isRequestExpired(req) {
  if (!req) return false;
  if (req.expired === true) return true;
  
  const statusLower = req.status?.toLowerCase();
  if (statusLower === 'expired') return true;
  if (req.type === 'TRASHED_EXPIRED') return true;
  if (req.trashReason && req.trashReason.toLowerCase().includes('expire')) return true;

  // Check 7-day expiration from approval for Approved or Processing Payment
  if (statusLower === 'approved' || statusLower === 'processing payment') {
    const approvedDate = getApprovedDate(req);
    if (approvedDate) {
      const expiryDate = new Date(approvedDate.getTime() + EXPIRATION_MS);
      if (new Date() > expiryDate) {
        return true;
      }
    }
  }

  // If in Trash and without rejection reason or has expired flag
  if (statusLower === 'trash' || statusLower === 'trashed') {
    if (req.expired === true) return true;
    if (!req.rejectionReason && req.approvedAt) {
      const approvedDate = getApprovedDate(req);
      if (approvedDate && new Date() > new Date(approvedDate.getTime() + EXPIRATION_MS)) {
        return true;
      }
    }
  }

  return false;
}

export function getResolvedStatus(req) {
  if (!req) return 'Pending';
  
  if (isRequestExpired(req)) {
    return 'Expired';
  }

  const s = req.status?.toLowerCase();
  if (s === 'completed') return 'Completed';
  if (s === 'processing payment') return 'Processing Payment';
  if (s === 'approved') return 'Approved';
  if (s === 'pending' || s === 'processing') return 'Pending';
  if (s === 'rejected' || s === 'trash' || s === 'trashed') return 'Rejected';

  return req.status || 'Pending';
}

export function getExpiryDate(req) {
  const approvedDate = getApprovedDate(req);
  if (!approvedDate) return null;
  return new Date(approvedDate.getTime() + EXPIRATION_MS);
}
