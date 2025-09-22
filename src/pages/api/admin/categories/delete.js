import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing category ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { data, error } = await supabaseAdmin
      .from('category_pages')
      .delete()
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
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}