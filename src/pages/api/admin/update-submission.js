import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export async function POST({ request }) {
  try {
    const bodyText = await request.text();
    
    if (!bodyText.trim()) {
      console.error('Received empty request body.');
      return new Response(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Failed to parse JSON from request body:', parseError, 'Raw body:', bodyText);
      return new Response(JSON.stringify({ error: 'Malformed JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { id, status } = body;
    
    if (!id || !status) {
      console.error('Missing required fields (id or status) after JSON parsing. Parsed body:', body);
      return new Response(JSON.stringify({ error: 'Missing required fields (id or status)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { data, error } = await supabaseAdmin
      .from('business_submissions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('API error (uncaught):', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}