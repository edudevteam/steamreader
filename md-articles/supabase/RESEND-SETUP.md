# Resend Email Setup for STEAM Reader

This guide covers setting up Resend for transactional emails with Supabase.

## Overview

There are two ways to use Resend with Supabase:

1. **Native Integration** (Recommended) - One-click connection in Resend dashboard
2. **Edge Functions** - Call Resend API directly for custom emails (welcome emails, notifications)

---

## Part 1: Connect Resend to Supabase (One-Click)

Resend has a native Supabase integration that automatically configures SMTP for all auth emails.

### Steps:

1. Log into [Resend Dashboard](https://resend.com)
2. Go to **Settings** → **Integrations**
3. Click **Connect to Supabase**
4. Authorize the connection
5. Select your Supabase project
6. Done!

All Supabase Auth emails (password reset, email confirmation) now go through Resend automatically.

### Verify Your Domain (Required for Production)

1. In Resend, go to **Domains**
2. Add your domain (e.g., `steamreader.com`)
3. Add the DNS records Resend provides
4. Wait for verification

### Customize Email Templates (Optional)

In Supabase Dashboard → Project Settings → Authentication → Email Templates:

- **Confirm signup** - Sent when user signs up
- **Reset Password** - Password reset emails
- **Magic Link** - For passwordless login (if enabled)
- **Change Email** - When user changes their email

---

## Part 2: Deploy Edge Functions for Custom Emails

For custom emails (welcome emails, notifications), use Supabase Edge Functions.

### Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm
npm install -g supabase

# or use npx
npx supabase
```

### Step 2: Link Your Project

```bash
cd md-articles

# Login to Supabase
supabase login

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Set Environment Variables

```bash
# Set your Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Step 4: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy send-email
supabase functions deploy send-welcome-email
```

### Step 5: Test the Functions

```bash
# Test send-email function
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Hello from STEAM Reader!</p>"
  }'
```

---

## Part 3: Trigger Welcome Email on Signup

Add a database trigger to send welcome emails automatically.

### Option A: Database Trigger (Recommended)

Add this to your schema.sql or run in SQL Editor:

```sql
-- Function to call the welcome email Edge Function
CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
BEGIN
  payload := json_build_object(
    'email', NEW.email,
    'displayName', NEW.raw_user_meta_data->>'display_name'
  );

  -- Call the Edge Function (requires pg_net extension)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-welcome-email',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )::jsonb,
    body := payload::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user signup
CREATE TRIGGER on_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email();
```

> **Note:** This requires the `pg_net` extension. Enable it in Supabase Dashboard → Database → Extensions.

### Option B: Call from Frontend (Simpler)

Call the Edge Function from your signup success handler:

```typescript
// In your AuthContext or signup page
const sendWelcomeEmail = async (email: string, displayName?: string) => {
  try {
    await supabase.functions.invoke('send-welcome-email', {
      body: { email, displayName }
    })
  } catch (error) {
    console.error('Failed to send welcome email:', error)
  }
}
```

---

## Troubleshooting

### Emails not sending?

1. **Check Resend dashboard** - Look for failed deliveries
2. **Verify your domain** - Emails won't send from unverified domains
3. **Check spam folder** - First emails often go to spam
4. **Check Supabase logs** - Dashboard → Logs → Edge Functions

### Domain verification

For production, verify your domain in Resend:

1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `steamreader.com`)
3. Add the DNS records Resend provides
4. Wait for verification (usually < 1 hour)

### Testing without a verified domain

For development, Resend allows sending to your own email from their default domain:
- Use `onboarding@resend.dev` as the sender
- Can only send to the email address associated with your Resend account

---

## Environment Variables Summary

### Supabase Dashboard (Project Settings → Edge Functions)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Your Resend API key |

### Cloudflare Pages (for build-time sync)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for sync script) |
| `VITE_SUPABASE_URL` | Supabase URL (public, for React app) |
| `VITE_SUPABASE_ANON_KEY` | Anon key (public, for React app) |
