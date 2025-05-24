// Debug logging utility for mobile environments
export const debugLog = async (event: string, data: any = {}, fid?: number) => {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    data,
    fid: fid || null
  };
  
  // Always log to console (for web debugging)
  console.log(`[DEBUG] ${event}`, logData);
  
  // Try to log to our API (for mobile debugging)
  try {
    await fetch('/api/debug-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
        fid: fid || null
      }),
    });
  } catch (error) {
    // Silently fail if API logging doesn't work
    console.warn('[DEBUG] Failed to log to API:', error);
  }
}; 