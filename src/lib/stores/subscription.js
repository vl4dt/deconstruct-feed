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
        error: null,
        usage: {
            scriptsGenerated: 0,
            podcastsGenerated: 0,
            deepDives: 0,
            lastReset: Date.now()
        }
    });

    // Validation check interval (24 hours)
    const VALIDATION_INTERVAL = 24 * 60 * 60 * 1000;
    let validationTimer = null;

    // Free tier limits
    const FREE_LIMITS = {
        scripts: 3,
        podcasts: 3,
        deepDives: 3
    };

    async function validateLicense(licenseKey, forceValidate = false) {
        try {
            // Dev mode bypass
            if (licenseKey === 'DEV_MODE_LICENSE') {
                const devLicenseData = {
                    isPro: true,
                    licenseKey: 'DEV_MODE_LICENSE',
                    tier: 'Pro',
                    expiresAt: null,
                    email: 'dev@example.com',
                    error: null
                };
                update(s => ({ ...s, ...devLicenseData, loading: false }));
                return devLicenseData;
            }

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

    async function loadUsage() {
        const data = await chrome.storage.local.get(['usage']);
        const now = Date.now();
        let usage = data.usage || {
            scriptsGenerated: 0,
            deepDives: 0,
            lastReset: now
        };

        // Check for monthly reset
        const lastReset = new Date(usage.lastReset);
        const currentDate = new Date(now);

        if (lastReset.getMonth() !== currentDate.getMonth() ||
            lastReset.getFullYear() !== currentDate.getFullYear()) {
            // Reset usage
            usage = {
                scriptsGenerated: 0,
                deepDives: 0,
                lastReset: now
            };
            await chrome.storage.local.set({ usage });
        }

        update(s => ({ ...s, usage }));
    }

    return {
        subscribe,

        init: async () => {
            const result = await chrome.storage.local.get(['licenseKey', 'cachedLicenseData']);

            // Load usage data
            await loadUsage();

            if (result.licenseKey) {
                await validateLicense(result.licenseKey);
            } else if (result.cachedLicenseData) {
                // Dev mode: use cached Pro status if exists
                update(s => ({ ...s, ...result.cachedLicenseData, loading: false }));
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
                error: null,
                usage: { // Keep usage tracking even if downgraded
                    scriptsGenerated: 0,
                    deepDives: 0,
                    lastReset: Date.now()
                }
            });
            await loadUsage(); // Reload usage to ensure it's up to date
        },

        // Usage Limit Methods
        checkLimit: (feature) => {
            let isPro = false;
            let usage = null;

            // Get current state synchronously for check
            update(s => {
                isPro = s.isPro;
                usage = s.usage;
                return s;
            });

            if (isPro) return true;

            if (feature === 'script') {
                return usage.scriptsGenerated < FREE_LIMITS.scripts;
            } else if (feature === 'podcast') {
                return (usage.podcastsGenerated || 0) < FREE_LIMITS.podcasts;
            } else if (feature === 'deepDive') {
                return usage.deepDives < FREE_LIMITS.deepDives;
            }

            return true;
        },

        incrementUsage: async (feature) => {
            let currentUsage = null;

            update(s => {
                currentUsage = { ...s.usage };
                if (feature === 'script') {
                    currentUsage.scriptsGenerated++;
                } else if (feature === 'podcast') {
                    currentUsage.podcastsGenerated = (currentUsage.podcastsGenerated || 0) + 1;
                } else if (feature === 'deepDive') {
                    currentUsage.deepDives++;
                }
                return { ...s, usage: currentUsage };
            });

            await chrome.storage.local.set({ usage: currentUsage });
        },

        getLimits: () => FREE_LIMITS,

        // Dev mode helpers (remove in production)
        upgrade: async () => {
            const licenseData = {
                isPro: true,
                licenseKey: 'DEV_MODE_LICENSE',
                tier: 'Pro',
                expiresAt: null,
                email: 'dev@example.com',
                error: null
            };

            // Save to storage so it persists across reloads
            await chrome.storage.local.set({
                licenseKey: 'DEV_MODE_LICENSE',
                cachedLicenseData: licenseData,
                lastValidated: Date.now()
            });

            update(s => ({ ...s, ...licenseData, loading: false }));
        },
        downgrade: async () => {
            await chrome.storage.local.remove(['licenseKey', 'lastValidated', 'cachedLicenseData']);
            update(s => ({
                ...s,
                isPro: false,
                licenseKey: null,
                tier: null,
                expiresAt: null,
                email: null,
                error: null,
                loading: false
            }));
            await loadUsage();
        }
    };
}

export const userSubscription = createSubscriptionStore();

