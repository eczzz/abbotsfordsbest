import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing submission ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // First, check if the submission exists
    const { data: existingSubmission, error: fetchError } = await supabaseAdmin
      .from('business_submissions')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingSubmission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Delete the submission
    const { data, error } = await supabaseAdmin
      .from('business_submissions')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ 
        error: 'Database error', 
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Submission "${existingSubmission.name}" deleted successfully`,
      data 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}