import { writable } from 'svelte/store';

// Backend API URL - you'll update this with your Vercel deployment URL
const API_URL = 'https://your-backend.vercel.app/api';

function createSubscriptionStore() {
    const { subscribe, set, update } = writable({
        isPro: false,
        loading: true,
        licenseKey: null,
        tier: null,
        expiresAt: null,
        email: null,
        lastValidated: null,
        error: null
    });

    // Validation check interval (24 hours)
    const VALIDATION_INTERVAL = 24 * 60 * 60 * 1000;
    let validationTimer = null;

    async function validateLicense(licenseKey, forceValidate = false) {
        try {
            // Check if we need to validate
            const cached = await chrome.storage.local.get(['lastValidated', 'cachedLicenseData']);

            if (!forceValidate && cached.lastValidated && cached.cachedLicenseData) {
                const timeSinceValidation = Date.now() - cached.lastValidated;

                // Use cached data if validation was recent (within 24 hours)
                if (timeSinceValidation < VALIDATION_INTERVAL) {
                    update(s => ({
                        ...s,
                        ...cached.cachedLicenseData,
                        loading: false
                    }));
                    scheduleNextValidation();
                    return cached.cachedLicenseData;
                }
            }

            // Call backend API to validate
            const response = await fetch(`${API_URL}/validate-license`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ licenseKey })
            });

            const data = await response.json();

            if (data.valid) {
                const licenseData = {
                    isPro: true,
                    licenseKey,
                    tier: data.tier,
                    expiresAt: data.expiresAt,
                    email: data.email,
                    error: null
                };

                // Cache the validation result
                await chrome.storage.local.set({
                    lastValidated: Date.now(),
                    cachedLicenseData: licenseData
                });

                update(s => ({ ...s, ...licenseData, loading: false }));
                scheduleNextValidation();
                return licenseData;
            } else {
                throw new Error(data.error || 'License validation failed');
            }
        } catch (error) {
            console.error('License validation error:', error);

            // On error, use cached data if available (grace period)
            const cached = await chrome.storage.local.get(['cachedLicenseData']);
            if (cached.cachedLicenseData) {
                update(s => ({
                    ...s,
                    ...cached.cachedLicenseData,
                    error: 'Offline mode - could not verify license',
                    loading: false
                }));
                scheduleNextValidation();
                return cached.cachedLicenseData;
            }

            // No cached data, mark as free
            update(s => ({
                ...s,
                isPro: false,
                error: error.message,
                loading: false
            }));
            return null;
        }
    }

    function scheduleNextValidation() {
        if (validationTimer) {
            clearTimeout(validationTimer);
        }

        // Revalidate after 24 hours
        validationTimer = setTimeout(async () => {
            const state = await chrome.storage.local.get(['licenseKey']);
            if (state.licenseKey) {
                await validateLicense(state.licenseKey, true);
            }
        }, VALIDATION_INTERVAL);
    }

    return {
        subscribe,

        init: async () => {
            const result = await chrome.storage.local.get(['licenseKey']);

            if (result.licenseKey) {
                await validateLicense(result.licenseKey);
            } else {
                update(s => ({ ...s, isPro: false, loading: false }));
            }
        },

        activateLicense: async (licenseKey) => {
            update(s => ({ ...s, loading: true, error: null }));

            // Validate the license
            const result = await validateLicense(licenseKey, true);

            if (result) {
                // Save license key
                await chrome.storage.local.set({ licenseKey });
                return { success: true };
            } else {
                return { success: false, error: 'Invalid license key' };
            }
        },

        deactivateLicense: async () => {
            // Clear all license data
            await chrome.storage.local.remove(['licenseKey', 'lastValidated', 'cachedLicenseData']);

            // Clear validation timer
            if (validationTimer) {
                clearTimeout(validationTimer);
            }

            // Reset to free tier
            set({
                isPro: false,
                loading: false,
                licenseKey: null,
                tier: null,
                expiresAt: null,
                email: null,
                lastValidated: null,
                error: null
            });
        },

        // Dev mode helpers (remove in production)
        upgrade: async () => {
            await chrome.storage.local.set({ isPro: true });
            update(s => ({ ...s, isPro: true }));
        },
        downgrade: async () => {
            await chrome.storage.local.set({ isPro: false });
            update(s => ({ ...s, isPro: false }));
        }
    };
}

export const userSubscription = createSubscriptionStore();

