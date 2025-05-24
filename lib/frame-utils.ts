export function isFrameEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false; // Server-side
  }
  
  return window.location.pathname.startsWith('/miniapp') ||
         window.location.search.includes('miniApp=true') ||
         window.parent !== window; // Basic iframe detection
}

export function isMiniAppRoute(): boolean {
  if (typeof window === 'undefined') {
    return false; // Server-side
  }
  
  return window.location.pathname.startsWith('/miniapp');
} 