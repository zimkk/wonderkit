# Deploy WonderKit to Vercel

## Prerequisites
- Vercel account (free tier works for development)
- PostgreSQL database with pgvector (Supabase, Neon, or Railway recommended)
- Optionally: Stripe, Resend, Cloudflare R2

## Steps

### 1. Fork and import
1. Fork `https://github.com/zimkk/wonderkit`
2. In Vercel dashboard: **Add New → Project → Import Git Repository**
3. Select your fork

### 2. Set environment variables
In Vercel project settings → Environment Variables, add:

**Required:**
```
DATABASE_URL=postgresql://...         # Connection string with ?sslmode=require
AUTH_SECRET=<generate: openssl rand -base64 32>
AUTH_URL=https://your-app.vercel.app
```

**AI (at least one required for Chat):**
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
```

**Stripe (billing — optional):**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

**Email (optional — dev console transport used without this):**
```
RESEND_API_KEY=re_...
EMAIL_FROM=WonderKit <noreply@yourdomain.com>
```

**Storage (optional):**
```
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=wonderkit
R2_PUBLIC_URL=https://cdn.yourdomain.com
```

**Inngest (optional — local dev works without):**
```
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

### 3. Run database migrations
After first deploy, run in your database shell:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
Then trigger migrations via the Vercel CLI or your CI pipeline:
```bash
npx prisma migrate deploy
```

### 4. Set up Stripe webhook
In Stripe dashboard → Webhooks → Add endpoint:
- URL: `https://your-app.vercel.app/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 5. Set up Inngest
In Inngest dashboard → Apps → Sync URL:
`https://your-app.vercel.app/api/inngest`

### 6. First login
Visit your app, enter your email, and check Vercel logs for the magic link (or inbox if Resend is configured).

To grant superadmin:
```sql
UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'your@email.com';
```
