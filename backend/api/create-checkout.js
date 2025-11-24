// CORS headers for Chrome extension
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, restrict this
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
        const { tier = 'monthly', email } = req.body;

        // Map tier to Paddle price ID
        // You'll get these from your Paddle dashboard after creating products
        const priceIds = {
            monthly: process.env.PADDLE_PRICE_MONTHLY,
            annual: process.env.PADDLE_PRICE_ANNUAL,
            lifetime: process.env.PADDLE_PRICE_LIFETIME
        };

        const priceId = priceIds[tier];

        if (!priceId) {
            return res.status(400).headers(corsHeaders).json({
                error: 'Invalid tier selected'
            });
        }

        // Paddle Checkout URL - simpler approach using Paddle.js on frontend
        // The extension will use Paddle.js to open checkout directly
        // This endpoint just returns the price ID
        return res.status(200).headers(corsHeaders).json({
            priceId,
            tier,
            // For Paddle Classic, you would return a checkout URL
            // For Paddle Billing (new version), use Paddle.js on frontend
            success: true
        });

    } catch (error) {
        console.error('Checkout creation error:', error);
        return res.status(500).headers(corsHeaders).json({
            error: 'Failed to create checkout'
        });
    }
}
