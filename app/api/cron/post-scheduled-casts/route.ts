import { NextResponse } from 'next/server';
import { postScheduledCasts } from '@/cron/postScheduledCasts';

/**
 * API endpoint to run the scheduled cast posting cron job on demand
 * 
 * This allows manual triggering of the job for testing and debugging
 */
export async function POST(request: Request) {
  try {
    console.log('[post-scheduled-casts] Running scheduled cast posting job on demand');
    
    // Run the cron job
    await postScheduledCasts();
    
    console.log('[post-scheduled-casts] Job completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled cast posting job completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[post-scheduled-casts] Error running job:', error);
    return NextResponse.json(
      { error: `Error running scheduled cast posting job: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 