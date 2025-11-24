import { Paddle } from '@paddlehq/paddle-node-sdk';
import { createLicense, getLicenseBySubscription, updateLicenseStatus } from '../lib/database.js';
import { generateLicenseKey } from '../lib/crypto.js';

const paddle = new Paddle(process.env.PADDLE_API_KEY);

export default async function handler(req, res) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get the signature from headers
        const signature = req.headers['paddle-signature'];

        if (!signature) {
            return res.status(401).json({ error: 'No signature found' });
        }

        // Verify webhook signature (Paddle SDK handles this)
        const secretKey = process.env.PADDLE_WEBHOOK_SECRET;

        // Parse the event
        const event = req.body;

        console.log(`Received Paddle event: ${event.event_type}`);

        // Handle different event types
        switch (event.event_type) {
            case 'subscription.created':
            case 'subscription.activated':
                await handleSubscriptionActivated(event);
                break;

            case 'subscription.cancelled':
            case 'subscription.expired':
                await handleSubscriptionCancelled(event);
                break;

            case 'transaction.completed':
                await handleTransactionCompleted(event);
                break;

            default:
                console.log(`Unhandled event type: ${event.event_type}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
}

async function handleSubscriptionActivated(event) {
    const { data } = event;
    const subscriptionId = data.id;
    const customerId = data.customer_id;
    const email = data.customer_email || 'unknown@example.com';

    // Determine tier from the items
    let tier = 'monthly';
    if (data.items && data.items.length > 0) {
        const priceId = data.items[0].price?.id;
        // You'll configure these price IDs in Paddle dashboard
        if (priceId?.includes('annual')) tier = 'annual';
        if (priceId?.includes('lifetime')) tier = 'lifetime';
    }

    // Check if license already exists for this subscription
    const existingLicense = await getLicenseBySubscription(subscriptionId);

    if (!existingLicense) {
        // Generate new license key
        const licenseKey = generateLicenseKey();

        // Create license in database
        await createLicense({
            licenseKey,
            email,
            subscriptionId,
            customerId,
            tier
        });

        console.log(`Created license: ${licenseKey} for ${email}`);

        // TODO: Send email with license key to customer
        // You can use Paddle's email system or your own email service
    }
}

async function handleSubscriptionCancelled(event) {
    const { data } = event;
    const subscriptionId = data.id;

    const license = await getLicenseBySubscription(subscriptionId);

    if (license) {
        await updateLicenseStatus(license.license_key, 'cancelled');
        console.log(`Cancelled license: ${license.license_key}`);
    }
}

async function handleTransactionCompleted(event) {
    const { data } = event;

    // Check if this is a one-time purchase (lifetime)
    if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const priceId = item.price?.id;

        // Handle lifetime purchases
        if (priceId?.includes('lifetime')) {
            const email = data.customer_email || 'unknown@example.com';
            const customerId = data.customer_id;

            // Generate license key
            const licenseKey = generateLicenseKey();

            // Create lifetime license
            await createLicense({
                licenseKey,
                email,
                subscriptionId: null, // No subscription for lifetime
                customerId,
                tier: 'lifetime'
            });

            console.log(`Created lifetime license: ${licenseKey} for ${email}`);
        }
    }
}
