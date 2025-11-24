# Paddle Payment Integration Setup Guide

This guide will walk you through setting up Paddle payment processing for your News Curator Chrome extension.

## Prerequisites

-  A Paddle account (sign up at [paddle.com](https://paddle.com))
- Access to Vercel for backend deployment
- Basic familiarity with command line tools

## Step 1: Create Your Paddle Account

1. Go to [paddle.com](https://paddle.com) and sign up
2. Complete the vendor registration process
3. Since you're in Honduras, Paddle will handle all tax compliance automatically
4. Verify your email and complete your business profile

## Step 2: Set Up Products in Paddle Dashboard

1. Log into your Paddle dashboard
2. Navigate to **Catalog** > **Products**
3. Create three products:

### Monthly Subscription
- **Name**: News Curator Pro - Monthly
- **Type**: Subscription
- **Price**: $4.99 USD
- **Billing Cycle**: Monthly
- **Trial Period**: 7 days (optional)

### Annual Subscription
- **Name**: News Curator Pro - Annual
- **Type**: Subscription  
- **Price**: $49.00 USD
- **Billing Cycle**: Annual
- Note the price ID (e.g., `pri_01hsv...`)

### Lifetime License  
- **Name**: News Curator Pro - Lifetime
- **Type**: One-time
- **Price**: $79.00 USD

## Step 3: Configure Webhooks

1. In Paddle Dashboard, go to **Developer Tools** > **Webhooks**
2. Click **Add Webhook Endpoint**
3. You'll add the URL after deploying your backend (Step 6)
4. Select these events:
   - `subscription.created`
   - `subscription.activated`
   - `subscription.cancelled`
   - `subscription.expired`
   - `transaction.completed`
5. Save the **Webhook Secret** - you'll need this later

## Step 4: Get Your API Keys

1. Go to **Developer Tools** > **Authentication**
2. Create a new **API Key**
3. Copy and save:
   - Vendor ID
   - API Key
   - Keep these secure!

## Step 5: Set Up Vercel Backend

### Install Vercel CLI
```powershell
npm install -g vercel
```

### Initialize Vercel Project
```powershell
cd backend
vercel login
vercel
```

Follow the prompts:
- Link to existing project? **No**
- Project name: **newscurator-backend**
- Directory: **.**

### Set Up Vercel Postgres Database

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **Postgres** 
6. Choose a name: **newscurator-db**
7. Select region closest to you
8. Copy the connection string

### Add Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** > **Environment Variables**
2. Add the following variables:

```
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_webhook_secret
PADDLE_VENDOR_ID=your_vendor_id
PADDLE_PRICE_MONTHLY=pri_xxx_monthly
PADDLE_PRICE_ANNUAL=pri_xxx_annual
PADDLE_PRICE_LIFETIME=pri_xxx_lifetime
POSTGRES_URL=your_postgres_connection_string
```

## Step 6: Initialize Database

1. Install dependencies:
```powershell
cd backend
npm install
```

2. Create a test script to initialize the database:

**backend/scripts/init-db.js**:
```javascript
import { initDatabase } from '../lib/database.js';

async function  run() {
  try {
    await initDatabase();
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
```

3. Run it:
```powershell
node scripts/init-db.js
```

## Step 7: Deploy Backend to Vercel

```powershell
cd backend
vercel --prod
```

You'll get a deployment URL like: `https://newscurator-backend.vercel.app`

## Step 8: Update Webhook URL in Paddle

1. Go back to Paddle Dashboard > **Webhooks**
2. Edit your webhook configuration
3. Set **Endpoint URL** to: `https://your-backend.vercel.app/api/paddle-webhook`
4. Save

## Step 9: Update Extension Code

1. Open `src/lib/stores/subscription.js`
2. Update the API URL:
```javascript
const API_URL = 'https://your-backend.vercel.app/api';
```

3. Open `src/components/UpgradeModal.svelte`
4. Update Paddle configuration with your actual IDs:
```javascript
const PADDLE_VENDOR_ID = "your_vendor_id";
const PRICING = {
    monthly: { price: "$4.99", priceId: "pri_xxx_monthly", period: "/month" },
    annual: { price: "$49.00", priceId: "pri_xxx_annual", period: "/year", save: "Save 17%" },
    lifetime: { price: "$79.00", priceId: "pri_xxx_lifetime", period: "one-time" }
};
```

## Step 10: Test in Sandbox Mode

1. In Paddle Dashboard, make sure you're in **Sandbox mode**
2. Use test card numbers from [Paddle docs](https://developer.paddle.com/concepts/payment-methods/credit-debit-card)
3. Test the complete flow:
   - Click "Upgrade to Pro" in your extension
   - Complete checkout with test card
   - Verify webhook receives the event
   - Check license key is created in database
   - Activate license in extension

Test card: `4242 4242 4242 4242`, any future expiry, any CVC

## Step 11: Go Live

Once testing is complete:

1. Switch Paddle to **Live mode**
2. Update API keys in Vercel environment variables (use live keys)
3. Update webhook URL to use live endpoint
4. Deploy your Chrome extension to the Chrome Web Store
5. Start accepting real payments!

## Monitoring & Support

### Check Payments
- Paddle Dashboard > **Transactions**

### View Subscriptions
- Paddle Dashboard > **Subscriptions**

### Check Logs
```powershell
vercel logs
```

### Database Queries
Use Vercel dashboard to run SQL queries on your database

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct
- Verify webhook secret matches
- Check Vercel logs for errors

### License validation failing
- Verify API URL is correct in extension
- Check CORS headers in API
- Verify database connection

### Database errors
- Check Postgres connection string
- Verify database schema is initialized
- Check Vercel logs

## Getting Help

- **Paddle Support**: help@paddle.com
- **Vercel Support**: https://vercel.com/support  
- **Extension Issues**: Check browser console for errors

## Next Steps

- Set up email notifications for new sales
- Add analytics tracking
- Create customer dashboard
- Implement referral program
- Add more payment options

Congratulations! Your Paddle integration is complete! 🎉
