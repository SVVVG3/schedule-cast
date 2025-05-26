import { supabase } from '@/lib/supabase';

interface AuthUser {
  id: string;
  fid: number;
  username: string | null;
  display_name: string | null;
  signer_uuid: string | null;
}

interface AuthResult {
  authenticated: boolean;
  user?: AuthUser;
  error?: string;
}

// Helper to authenticate using various methods (Bearer token, FID param, etc.)
export async function authenticateUser(req: Request): Promise<AuthResult> {
  try {
    // First try to get auth data from the Authorization header
    const authHeader = req.headers.get('Authorization');
    
    // If we have a Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // For now, we'll assume the token is just the FID
        // In a production app, you'd use a proper JWT or other token
        const fid = parseInt(token, 10);
        
        if (isNaN(fid)) {
          return { authenticated: false, error: 'Invalid token format' };
        }
        
        // Get user data from Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('fid', fid)
          .maybeSingle();
          
        if (userError || !userData) {
          return { authenticated: false, error: 'User not found' };
        }
        
        return { 
          authenticated: true, 
          user: {
            id: userData.id,
            fid: userData.fid,
            username: userData.username,
            display_name: userData.display_name,
            signer_uuid: userData.signer_uuid
          }
        };
      } catch (error) {
        console.error('Error processing Bearer token:', error);
        return { authenticated: false, error: 'Authentication token error' };
      }
    }
    
    // If no Authorization header, check for FID in query parameters
    // This is a fallback for API routes where cookies might not be accessible
    const url = new URL(req.url);
    const fidParam = url.searchParams.get('fid');
    
    if (fidParam) {
      try {
        const fid = parseInt(fidParam, 10);
        
        if (isNaN(fid)) {
          return { authenticated: false, error: 'Invalid FID format' };
        }
        
        // Get user data from Supabase
        console.log(`[auth] Fetching user with FID: ${fid}, type: ${typeof fid}`);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('fid', fid)
          .maybeSingle();
          
        if (userError) {
          console.error('[auth] Error fetching user by FID:', userError);
          return { authenticated: false, error: 'Error finding user' };
        }
        
        if (!userData) {
          console.log('[auth] No user found with FID:', fid);
          return { authenticated: false, error: 'User not found' };
        }
        
        return { 
          authenticated: true, 
          user: {
            id: userData.id,
            fid: userData.fid,
            username: userData.username,
            display_name: userData.display_name,
            signer_uuid: userData.signer_uuid
          }
        };
      } catch (error) {
        console.error('Error processing FID param:', error);
        return { authenticated: false, error: 'Authentication parameter error' };
      }
    }
    
    // As a last resort, look for auth state in localStorage in client components
    // For server components, this won't work but it's handled by the error case
    return { authenticated: false, error: 'No authentication credentials found' };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { authenticated: false, error: 'Authentication error' };
  }
} 