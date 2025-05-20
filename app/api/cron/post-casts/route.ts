import { NextResponse } from 'next/server';
import { main as postScheduledCasts } from '@/cron/postScheduledCasts';

/**
 * API route to run the scheduled casts posting job
 * 
 * This endpoint is designed to be called by Vercel Cron or other schedulers.
 * It requires a secret key to prevent unauthorized access.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret if provided in environment
    const url = new URL(request.url);
    const providedSecret = url.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    // Only check secret if one is configured
    if (expectedSecret && providedSecret !== expectedSecret) {
      console.error('Invalid cron secret provided');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only allow this in production or if debug flag is set
    const isProduction = process.env.NODE_ENV === 'production';
    const debugMode = url.searchParams.get('debug') === 'true';
    
    if (!isProduction && !debugMode) {
      console.warn('Cron job skipped in development mode without debug flag');
      return NextResponse.json(
        { message: 'Skipped in development. Add ?debug=true to run anyway.' },
        { status: 200 }
      );
    }
    
    // Run the cron job
    console.log('Running scheduled casts posting job via API route');
    const result = await postScheduledCasts();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error) {
    console.error('Error running cron job:', error);
    return NextResponse.json(
      { error: 'Failed to run posting job', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// Add OPTIONS method to support CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 