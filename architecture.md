# Farcaster Scheduled Cast Mini App – Architecture Overview

This document outlines the full architecture of a Farcaster Mini App that allows users to **schedule casts** to be posted at a future time, using **Next.js**, **Supabase**, and **Neynar**.

---

## 🧱 Tech Stack

- **Frontend**: Next.js (app router)
- **Database**: Supabase (PostgreSQL)
- **Backend Tasks**: Cron jobs or scheduled serverless functions
- **Farcaster Auth & API**: Neynar with Sign In With Neynar (SIWN)

---

## 📁 File & Folder Structure

```
farcaster-scheduler/
├── app/                        # Next.js app router
│   ├── layout.tsx
│   ├── page.tsx                # Home page with form
│   ├── dashboard/              # User dashboard
│   │   └── page.tsx
│   └── api/                    # API routes
│       ├── casts/              # Endpoints for managing casts
│       │   └── route.ts
│       └── cron/               # Scheduled tasks endpoints
│           └── post-casts/     # Cron trigger for posting
│               └── route.ts
│
├── components/                 # Reusable React components
│   ├── CastForm.tsx            # Form to schedule a cast
│   ├── ScheduledCasts.tsx      # List of scheduled casts
│   └── NeynarSignInButton.tsx  # SIWN authentication button
│
├── lib/                        # Utility logic
│   ├── neynar.ts               # API client for Neynar
│   ├── supabase.ts             # Supabase client init
│   ├── auth-context.tsx        # SIWN authentication context
│   └── user-context.tsx        # User data management
│
├── cron/                       # Scheduled tasks
│   └── postScheduledCasts.ts   # Posts casts at the right time
│
├── database/                   # SQL migrations
│   ├── migrations/             # Database migration files
│   │   ├── 01_create_users_table.sql
│   │   ├── 02_create_scheduled_casts_table.sql
│   │   └── ...
│   └── README.md               # Migration documentation
│
├── scripts/                    # Utility scripts
│   └── apply-migration.js      # Script to apply DB migrations
│
├── .env.local                  # API keys, secrets
├── vercel.json                 # Vercel deployment config with cron
├── README.md
└── package.json
```

---

## 🔄 App Flow: How the Pieces Connect

### 1. **User Authentication**
- Uses Sign In With Neynar (SIWN) for Farcaster authentication
- User clicks "Sign In With Farcaster" button to initiate SIWN flow
- On successful authentication, stores user info in `users` table:
  - `fid` (Farcaster ID)
  - `username`
  - `display_name`
  - `signer_uuid` (for posting on user's behalf)
  - Other profile information

### 2. **Scheduling a Cast**
- Authenticated user fills out the form in `<CastForm />`
- Submits:
  - Cast content
  - Optional channel ID/target
  - Scheduled datetime
- Data is stored in `scheduled_casts` table in Supabase

### 3. **Posting a Scheduled Cast**
- A cron job (triggered via Vercel Cron) runs every minute
- The job:
  - Queries Supabase for casts due to post (`scheduled_at <= now() AND posted = false`)
  - Uses Neynar API with user's `signer_uuid` to post cast via `POST /v2/farcaster/cast`
  - Marks each successfully posted cast as `posted = true`
  - Stores API response in the `result` column

---

## 🧠 State Management

| State | Location | Description |
|-------|----------|-------------|
| Authentication | Auth Context | Manages SIWN authentication state |
| User Profile | User Context | Stores and provides user profile data from Supabase |
| Scheduled Casts | Supabase `scheduled_casts` table | Stores content, time, and posted flag |
| Form State | React Hook Form | Manages cast scheduling form state |

---

## 🗃️ Supabase Schema (PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid INTEGER NOT NULL UNIQUE,
  username TEXT,
  display_name TEXT,
  custody_address TEXT,
  avatar_url TEXT,
  signer_uuid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Casts Table
CREATE TABLE scheduled_casts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  fid INTEGER,
  content TEXT NOT NULL,
  channel_id TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  posted BOOLEAN DEFAULT FALSE,
  signer_uuid TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔐 Neynar Integration

### Authentication with SIWN
- Use Neynar's Sign In With Neynar (SIWN) for authentication
- Implementation:
  1. User clicks "Sign In With Farcaster" button
  2. SIWN flow opens in a popup
  3. User approves the login with their Farcaster account
  4. App receives authentication token and user data
  5. User info is stored in Supabase

### Posting Cast
- Use `POST /v2/farcaster/cast` with:
  - `signer_uuid` from the user's record
  - `text` content for the cast
  - Optional `channel_id` if posting to a specific channel

---

## 🔁 Cron Job: `postScheduledCasts.ts`

Runs every minute via Vercel Cron:

1. Fetches due casts from Supabase:
   ```sql
   SELECT * FROM scheduled_casts
   WHERE scheduled_at <= NOW() AND posted = false
   ```

2. For each cast:
   - Posts to Farcaster via Neynar API
   - On success, updates the cast:
     ```sql
     UPDATE scheduled_casts 
     SET posted = true, result = {...apiResponse}
     WHERE id = ?
     ```

---

## ✅ Summary

- ✅ Fully serverless architecture (Vercel + Supabase)
- ✅ Streamlined authentication with SIWN
- ✅ No need for separate signer creation flows
- ✅ Automated posting via serverless cron jobs
- ✅ Scalable to multiple users and scheduled casts

---

## 🧪 Next Steps (MVP Plan)

- [ ] Set up Supabase project + tables
- [ ] Configure Neynar API keys
- [ ] Build `CastForm` and `Dashboard` UI
- [ ] Implement OAuth login with Farcaster
- [ ] Store scheduled casts
- [ ] Deploy scheduled poster (serverless function or CRON)
