export function validatePasswordStrength(pwd) {
    if (typeof pwd !== 'string') return false;
    if (pwd.length < 12) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return false;
    
    const commonPatterns = /^(password|123456|qwerty|admin|password123|12345678|123456789|1234567890)$/i;
    if (commonPatterns.test(pwd)) return false;

    return true;
}

export function maskPhoneNumber(phone) {
    if (!phone || phone.length < 4) return "****";
    return "*".repeat(phone.length - 4) + phone.slice(-4);
}
