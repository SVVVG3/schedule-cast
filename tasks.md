# MVP Build Plan: Farcaster Scheduled Cast Mini App

This document breaks down the MVP build into granular, testable tasks.

---

## Phase 1: Project Setup

### 1. Initialize Next.js App
- [x] Start a new Next.js project with `app/` directory structure
- [x] Created project structure according to architecture.md
- [x] Set up with TypeScript, ESLint, and Tailwind CSS
- [x] Confirm app runs with `npm run dev`

### 2. Set up Supabase Project
- [x] Create new Supabase project
- [x] Enable Supabase Auth
- [x] Copy API URL and anon/public key to `.env.local`

### 3. Connect Supabase to App
- [x] Install `@supabase/supabase-js`
- [x] Create `lib/supabase.ts` with Supabase client
- [x] Test by calling `supabase.auth.getSession()` in a route

---

## Phase 2: Authentication

### 4. Implement Authentication
- [x] Initially planned for Farcaster OAuth
- [x] Implemented email magic link authentication as a temporary solution
- [x] Transitioned to Privy for Farcaster authentication
- [x] Created `lib/privy.tsx` with PrivyProviderWrapper
- [x] Created AuthButton component for login/logout with Privy
- [x] Implemented auto-login detection for Farcaster mini app
- [x] Updated app layout to use Privy provider

### 5. Store User Info in Supabase
- [x] Created migrations for `users` table with `fid`, `username`, `display_name`, etc.
- [x] Implemented `syncUserToSupabase` function in user-service.ts
- [x] Created UserContext to manage user state between Privy and Supabase
- [x] Integrated UserProvider in app layout
- [x] Updated Navbar to use Privy authentication

---

## Phase 3: Schedule Casts

### 6. Create CastForm Component
- [x] Created simple form with:
  - Cast content textarea
  - Date and time inputs for scheduling
  - Optional channel ID field
- [x] Hooked up form state with react-hook-form
- [x] Added validation for future dates/times
- [x] Implemented success/error states

### 7. Submit Cast to Supabase
- [x] Created API route at /api/casts
- [x] Implemented POST handler to save casts to database
- [x] Added error handling and validation
- [x] Created migrations for scheduled_casts table

### 8. Create User Dashboard
- [x] Created `app/dashboard/page.tsx`
- [x] Implemented protection for authenticated users only
- [x] Created ScheduledCasts component to fetch and display casts
- [x] Added two-column layout for form and scheduled casts

---

## Phase 4: Posting Logic

### 9. Neynar API Setup
- [x] Get Neynar API key
- [x] Create `lib/neynar.ts` with `POST /v2/farcaster/cast` wrapper
- [x] Added `createSigner` and `getSignerInfo` functions
- [x] Created test endpoint at `/api/test-neynar`
- [x] Added test UI at `/api-test` for manual testing
- [x] Implemented `getOrCreateSigner` function in user-service
- [x] Added TypeScript types for Neynar API responses

### 10. Scheduled Posting Cron
- [x] Create `cron/postScheduledCasts.ts`
- [x] Query for due casts: `scheduled_at <= now() AND posted = false`
- [x] For each cast:
  - Get `signer_uuid`
  - Post via Neynar API
  - If success, mark as `posted = true`
- [x] Create API route for Vercel Cron at `/api/cron/post-casts`
- [x] Set up Vercel config with cron job scheduling

---

## Phase 5: Testing & Finishing

### 11. Test Auth Flow
- [x] Set up test Privy app for Farcaster login
- [x] Confirm user created in Supabase after login

### 12. Test Scheduling Flow
- [x] Schedule a cast 2–3 minutes in the future
- [x] Confirm it shows in dashboard

### 13. Test Posting Flow
- [x] Wait for cron to run
- [x] Confirm cast is posted on Farcaster
- [x] Check it's marked as `posted = true` in DB

---

## Phase 6: Neynar Integration Updates

### 14. Replacing Manual Signer Creation with SIWN
- [x] Successfully posted test cast to Farcaster using SIWN
- [x] Fixed Neynar API endpoints and headers to match documentation
- [x] Created reusable `NeynarSignInButton` component for SIWN
- [x] Added API endpoint for storing signer information from SIWN
- [x] **DISCOVERY:** Sign in with Neynar (SIWN) can replace Privy authentication

### 15. Transition from Privy to Sign in with Neynar (SIWN)
- [x] Create migration for updating users table to store SIWN information
- [x] Create new authentication context provider using SIWN
  - [x] Create `lib/auth-context.tsx` to handle SIWN authentication state
  - [x] Add methods for sign-in, sign-out, and checking auth state
  - [x] Implement user data fetching from Supabase after SIWN
- [x] Replace Privy integration in UI
  - [x] Remove PrivyProvider from app layout
  - [x] Replace AuthButton component with NeynarSignInButton
  - [x] Update navbar and other UI components to use SIWN auth state
- [x] Update API routes to use SIWN authentication
  - [x] Modify `/api/casts` to work with SIWN user data
  - [x] Ensure all protected routes check for SIWN authentication

### 16. Clean up and Documentation
- [x] Remove Privy dependencies from package.json
- [x] Remove Privy-related code and files:
  - [x] `lib/privy.tsx`
  - [x] Privy integration in user-context
- [x] Update README with SIWN authentication instructions
- [x] Document SIWN integration approach in architecture.md

---

## Key Discoveries & Progress

1. **2025-05-20: Sign in with Neynar (SIWN) Success**
   - Successfully integrated Sign in with Neynar (SIWN) which handles both authentication and signer creation/delegation in one step
   - This eliminates the need for manual signer creation and complex approval flows
   - SIWN provides a much more streamlined user experience than the previous approach

2. **2025-05-20: Eliminated Need for Privy**
   - Discovered that SIWN can completely replace Privy for Farcaster authentication
   - SIWN provides user profile data and authentication state similar to Privy
   - This simplifies our architecture by removing one dependency (Privy)

3. **2025-05-20: Simplified API Flow**
   - Fixed issues with Neynar API integration:
     - Corrected endpoint URLs from `snapchain-api.neynar.com` to `api.neynar.com`
     - Fixed header names from `api-key` to `x-api-key`
     - Improved error handling and logging
   - Successfully posted first test cast to Farcaster using SIWN signer

4. **2025-05-20: Implemented Cron Job for Scheduled Posting**
   - Created a cron job that checks for scheduled casts and posts them
   - Implemented via API route that can be triggered by Vercel Cron
   - Successfully posted multiple scheduled casts to Farcaster

5. **2025-05-20: Completed Project MVP**
   - Removed Privy dependencies and cleaned up codebase
   - Updated documentation to reflect SIWN authentication flow
   - Fixed database schema issues for storing scheduled casts results
   - Created comprehensive migration for new Supabase schema

---

## Done [x]

You now have a working MVP that:
- Authenticates users via Farcaster using Sign in with Neynar
- Allows scheduling future casts
- Posts them at the right time
- Provides a clean, modern UI for managing scheduled casts
