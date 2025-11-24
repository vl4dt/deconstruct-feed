import { sql } from '@vercel/postgres';

/**
 * Initialize database schema
 */
export async function initDatabase() {
    await sql`
    CREATE TABLE IF NOT EXISTS licenses (
      id SERIAL PRIMARY KEY,
      license_key VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      paddle_subscription_id VARCHAR(255),
      paddle_customer_id VARCHAR(255),
      status VARCHAR(50) NOT NULL,
      tier VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      last_validated_at TIMESTAMP
    )
  `;

    await sql`
    CREATE INDEX IF NOT EXISTS idx_license_key ON licenses(license_key)
  `;

    await sql`
    CREATE INDEX IF NOT EXISTS idx_paddle_subscription ON licenses(paddle_subscription_id)
  `;
}

/**
 * Create a new license
 */
export async function createLicense(data) {
    const { licenseKey, email, subscriptionId, customerId, tier } = data;

    // Calculate expiration date
    let expiresAt = null;
    if (tier === 'monthly') {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (tier === 'annual') {
        expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
    // lifetime has no expiration

    const result = await sql`
    INSERT INTO licenses (
      license_key, 
      email, 
      paddle_subscription_id,
      paddle_customer_id,
      status, 
      tier,
      expires_at
    )
    VALUES (
      ${licenseKey}, 
      ${email}, 
      ${subscriptionId || null},
      ${customerId || null},
      'active', 
      ${tier},
      ${expiresAt}
    )
    RETURNING *
  `;

    return result.rows[0];
}

/**
 * Get license by key
 */
export async function getLicense(licenseKey) {
    const result = await sql`
    SELECT * FROM licenses 
    WHERE license_key = ${licenseKey}
    LIMIT 1
  `;

    return result.rows[0] || null;
}

/**
 * Get license by Paddle subscription ID
 */
export async function getLicenseBySubscription(subscriptionId) {
    const result = await sql`
    SELECT * FROM licenses 
    WHERE paddle_subscription_id = ${subscriptionId}
    LIMIT 1
  `;

    return result.rows[0] || null;
}

/**
 * Update license status
 */
export async function updateLicenseStatus(licenseKey, status) {
    const result = await sql`
    UPDATE licenses 
    SET status = ${status}
    WHERE license_key = ${licenseKey}
    RETURNING *
  `;

    return result.rows[0] || null;
}

/**
 * Update license validation timestamp
 */
export async function updateLastValidated(licenseKey) {
    await sql`
    UPDATE licenses 
    SET last_validated_at = CURRENT_TIMESTAMP
    WHERE license_key = ${licenseKey}
  `;
}

/**
 * Check if license is valid
 */
export function isLicenseValid(license) {
    if (!license) return false;
    if (license.status !== 'active') return false;

    // Check expiration for non-lifetime licenses
    if (license.expires_at) {
        const now = new Date();
        const expiresAt = new Date(license.expires_at);
        if (now > expiresAt) return false;
    }

    return true;
}
