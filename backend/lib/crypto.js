import { customAlphabet } from 'nanoid';

// Generate license key in format: XXXX-XXXX-XXXX-XXXX
export function generateLicenseKey() {
    const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);
    return `${nanoid()}-${nanoid()}-${nanoid()}-${nanoid()}`;
}

// Validate license key format
export function isValidLicenseFormat(key) {
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(key);
}
