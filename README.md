# Schedule Cast - Farcaster Scheduling Mini App

Schedule Cast is a Farcaster mini app that allows users to schedule posts (casts) to be published at future times.

## Features

- **Farcaster Authentication**: Log in with your Farcaster account using Sign In With Neynar (SIWN)
- **Neynar Integration**: Get write access to Farcaster via SIWN authentication
- **Schedule Casts**: Choose a date and time to publish your cast
- **Dashboard**: Manage your scheduled casts

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account (for the database)
- A Neynar Developer account (for Farcaster authentication and write access)

### Environment Setup

Create a `.env.local` file in the project root with the following variables:

```
# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Neynar API
NEYNAR_API_KEY=your_neynar_api_key 
NEXT_PUBLIC_NEYNAR_CLIENT_ID=your_neynar_client_id

# Migrations (development only)
MIGRATION_SECRET_KEY=your_secret_key
```

### Neynar Setup

1. Go to the [Neynar Developer Portal](https://dev.neynar.com)
2. Create or select your app
3. In the Settings tab:
   - Update the app name and logo URL
   - Add your app's domain to Authorized Origins (e.g., `https://your-app.com`)
   - Set permissions to "Read and write"
4. Copy your Client ID to `NEXT_PUBLIC_NEYNAR_CLIENT_ID` in your `.env.local` file
5. Copy your API Key to `NEYNAR_API_KEY` in your `.env.local` file

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run database migrations:
   ```
   curl -X POST -H "Content-Type: application/json" -d '{"key":"your_secret_key"}' http://localhost:3000/api/migrate
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Technologies

- **Next.js 15+ (App Router)**: For the frontend and API routes
- **Supabase**: For the database and storage
- **Neynar**: For Farcaster authentication and write access with SIWN
- **Tailwind CSS**: For styling
- **TypeScript**: For type safety

## Architecture

The app follows a straightforward architecture:

1. **Frontend**: Next.js app with Tailwind CSS for styling
2. **Authentication**: Neynar SIWN for Farcaster login and delegated signers
3. **Database**: Supabase PostgreSQL 
4. **API**: Next.js API routes
5. **Scheduled Tasks**: Cron job to check and publish scheduled casts

## Setting Up Scheduled Casts Posting

For scheduled casts to be posted at their designated times, you need to set up a cron job or scheduler to run the posting script.

### Option 1: Manual Testing

To test the cron job manually:

```bash
# Install ts-node if not already installed
npm install -g ts-node

# Run the cron job manually
node scripts/run-cron.js
```

### Option 2: Serverless Function (Recommended)

For production use, it's recommended to set up a serverless function that runs every minute. This can be done with:

1. **Vercel Cron Jobs**:
   - Add a cron configuration to your `vercel.json` file:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/post-casts",
         "schedule": "* * * * *"
       }
     ]
   }
   ```
   - Create an API route at `app/api/cron/post-casts/route.ts` that calls the main function from `cron/postScheduledCasts.ts`

2. **AWS Lambda with EventBridge**:
   - Deploy the cron script as a Lambda function
   - Set up an EventBridge rule to trigger it every minute

3. **GitHub Actions**:
   - Set up a GitHub workflow that runs on a schedule
   - Use the workflow to call your API endpoint or run the script directly

### Option 3: Traditional Cron Job

If you're hosting on a server with cron access:

```bash
# Edit crontab
crontab -e

# Add this line to run every minute
* * * * * cd /path/to/your/app && node scripts/run-cron.js >> /var/log/scheduler-casts.log 2>&1
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. 