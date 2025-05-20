import { NextResponse } from 'next/server';
import { main as runPostScheduledCasts } from '@/cron/postScheduledCasts';

/**
 * API endpoint to run the scheduled cast posting cron job on demand
 * 
 * This allows manual triggering of the job for testing and debugging
 */
export async function POST(request: Request) {
  try {
    console.log('[post-scheduled-casts] Running scheduled cast posting job on demand');
    
    // Run the cron job
    const result = await runPostScheduledCasts();
    
    console.log('[post-scheduled-casts] Job completed:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[post-scheduled-casts] Error running job:', error);
    return NextResponse.json(
      { error: `Error running scheduled cast posting job: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 