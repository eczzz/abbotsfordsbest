import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    
    const { 
      page_title, 
      category_name, 
      slug, 
      description, 
      icon_name,
      featured_business_1_id, 
      featured_business_2_id, 
      featured_business_3_id 
    } = body;
    
    if (!page_title || !category_name || !slug || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if slug already exists
    const { data: existingCategory } = await supabaseAdmin
      .from('category_pages')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (existingCategory) {
      return new Response(JSON.stringify({ error: 'Slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { data, error } = await supabaseAdmin
      .from('category_pages')
      .insert([{
        page_title,
        category_name,
        slug,
        description,
        icon_name: icon_name || 'Building',
        featured_business_1_id: featured_business_1_id || null,
        featured_business_2_id: featured_business_2_id || null,
        featured_business_3_id: featured_business_3_id || null
      }])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      }), {
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