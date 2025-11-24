# News Curator Backend API

Backend API for News Curator Chrome extension licensing and payments via Paddle.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Vercel account
- Paddle account
- Vercel Postgres database

### Installation

```powershell
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```powershell
cp .env.example .env
```

Required variables:
- `PADDLE_API_KEY` - From Paddle Dashboard → Developer Tools → Authentication
- `PADDLE_WEBHOOK_SECRET` - From Paddle Dashboard → Webhooks
- `PADDLE_VENDOR_ID` - Your Paddle vendor ID
- `PADDLE_PRICE_MONTHLY` - Price ID for monthly subscription
- `PADDLE_PRICE_ANNUAL` - Price ID for annual subscription  
- `PADDLE_PRICE_LIFETIME` - Price ID for lifetime license
- `POSTGRES_URL` - Vercel Postgres connection string

### Local Development

```powershell
vercel dev
```

This starts a local server at `http://localhost:3000`

### Deployment

```powershell
# Deploy to production
vercel --prod

# View deployment logs
vercel logs
```

## API Endpoints

### `POST /api/paddle-webhook`
Receives Paddle webhook events for subscription lifecycle:
- `subscription.created`
- `subscription.activated`
- `subscription.cancelled`
- `subscription.expired`
- `transaction.completed`

### `POST /api/validate-license`
Validates a license key and returns status.

**Request:**
```json
{
  "licenseKey": "ABCD-1234-EFGH-5678"
}
```

**Response:**
```json
{
  "valid": true,
  "status": "active",
  "tier": "annual",
  "expiresAt": "2025-11-24T00:00:00.000Z",
  "email": "user@example.com"
}
```

### `POST /api/create-checkout`
Returns Paddle price ID for checkout.

**Request:**
```json
{
  "tier": "annual",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "priceId": "pri_xxx_annual",
  "tier": "annual",
  "success": true
}
```

## Database Schema

```sql
CREATE TABLE licenses (
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
);
```

## Project Structure

```
backend/
├── api/
│   ├── paddle-webhook.js    # Webhook event handler
│   ├── validate-license.js  # License validation
│   └── create-checkout.js   # Checkout helper
├── lib/
│   ├── database.js          # DB operations
│   └── crypto.js            # License key generation
├── .env.example             # Environment template
├── vercel.json              # Vercel config
└── package.json             # Dependencies
```

## License Key Format

License keys are generated in the format: `XXXX-XXXX-XXXX-XXXX`

Example: `A7B3-K9P2-M4N6-Z8R1`

- Uses alphanumeric characters (excluding ambiguous ones: 0, O, 1, I, L)
- Case-insensitive
- Cryptographically secure random generation

## Webhook Security

The webhook endpoint verifies requests using Paddle's signature to prevent unauthorized access.

## Error Handling

All API endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid input)
- `401` - Unauthorized (invalid webhook signature)
- `404` - Not found (license key doesn't exist)
- `405` - Method not allowed
- `500` - Server error

## Monitoring

### View Logs
```powershell
vercel logs
```

### Database Queries
Access via Vercel Dashboard → Storage → Your Database → Query

### Webhook Events
Monitor in Paddle Dashboard → Developer Tools → Webhooks → Event Logs

## Support

For issues or questions:
1. Check [PADDLE_SETUP.md](../PADDLE_SETUP.md) for setup instructions
2. Review Vercel logs for errors
3. Verify environment variables are set correctly
4. Check Paddle webhook event logs

## License

MIT
