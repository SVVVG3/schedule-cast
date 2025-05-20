/**
 * Script to manually run the scheduled casts posting cron job
 * 
 * This is useful for testing or running the job manually when
 * a proper cron scheduler is not set up yet.
 */

// Load environment variables from .env.local
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
} catch (e) {
  console.log('No dotenv package installed, skipping .env.local loading');
}

// Need to register typescript compilation
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2019',
    esModuleInterop: true,
  },
});

async function run() {
  try {
    console.log('Running scheduled casts posting job...');
    
    // Import the main function from the cron job
    const { main } = require('../cron/postScheduledCasts');
    
    // Run the job
    const result = await main();
    
    console.log('Job completed with result:', result);
    
    // Exit after a small delay to ensure all logs are flushed
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Failed to run cron job:', error);
    process.exit(1);
  }
}

run(); 