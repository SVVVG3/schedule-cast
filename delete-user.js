// Script to delete a user from the database for testing
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The FID of the user to delete
const userFid = 466111;

async function deleteUser() {
  try {
    // First check if the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('fid', userFid)
      .maybeSingle();
      
    if (userError) {
      console.error('Error looking up user:', userError);
      return;
    }
    
    if (!user) {
      console.log(`No user found with FID ${userFid}`);
      return;
    }
    
    console.log(`Found user with ID ${user.id}, proceeding with deletion...`);
    
    // Also delete any scheduled casts for this user
    const { error: deleteCastsError } = await supabase
      .from('scheduled_casts')
      .delete()
      .eq('fid', userFid);
      
    if (deleteCastsError) {
      console.error('Error deleting scheduled casts:', deleteCastsError);
    } else {
      console.log(`Successfully deleted scheduled casts for user with FID ${userFid}`);
    }
    
    // Now delete the user
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('fid', userFid);
      
    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
    } else {
      console.log(`Successfully deleted user with FID ${userFid}`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the deletion function
deleteUser(); 