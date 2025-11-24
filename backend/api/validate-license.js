import { getLicense, isLicenseValid, updateLastValidated } from '../lib/database.js';
import { isValidLicenseFormat } from '../lib/crypto.js';

// CORS headers for Chrome extension
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, restrict this to your extension ID
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).headers(corsHeaders).json({});
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { licenseKey } = req.body;

        // Validate input
        if (!licenseKey || typeof licenseKey !== 'string') {
            return res.status(400).headers(corsHeaders).json({
                valid: false,
                error: 'License key is required'
            });
        }

        // Check format
        if (!isValidLicenseFormat(licenseKey)) {
            return res.status(400).headers(corsHeaders).json({
                valid: false,
                error: 'Invalid license key format'
            });
        }

        // Get license from database
        const license = await getLicense(licenseKey);

        if (!license) {
            return res.status(404).headers(corsHeaders).json({
                valid: false,
                error: 'License key not found'
            });
        }

        // Check if license is valid
        const valid = isLicenseValid(license);

        if (valid) {
            // Update last validated timestamp
            await updateLastValidated(licenseKey);
        }

        // Return validation result
        return res.status(200).headers(corsHeaders).json({
            valid,
            status: license.status,
            tier: license.tier,
            expiresAt: license.expires_at,
            email: license.email
        });

    } catch (error) {
        console.error('Validation error:', error);
        return res.status(500).headers(corsHeaders).json({
            valid: false,
            error: 'Validation service error'
        });
    }
}
