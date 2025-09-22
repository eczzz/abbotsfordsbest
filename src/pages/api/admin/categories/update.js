import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    
    // Log the entire request body to see what data we're receiving
    console.log('Category update request body:', JSON.stringify(body, null, 2));
    
    const { 
      id,
      page_title, 
      category_name, 
      slug, 
      description, 
      icon_name,
      featured_business_1_id, 
      featured_business_2_id, 
      featured_business_3_id 
    } = body;
    
    // Log the extracted category_name specifically
    console.log('Extracted category_name:', category_name);
   console.log('API update.js: Category ID to update:', id);
    
    if (!id || !page_title || !category_name || !slug || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if slug already exists for a different category
    const { data: existingCategory } = await supabaseAdmin
      .from('category_pages')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .single();
    
    if (existingCategory) {
      return new Response(JSON.stringify({ error: 'Slug already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Log the update data being sent to Supabase
    const updateData = {
      page_title,
      category_name,
      slug,
      description,
      icon_name: icon_name || 'Building',
      featured_business_1_id: featured_business_1_id || null,
      featured_business_2_id: featured_business_2_id || null,
      featured_business_3_id: featured_business_3_id || null,
      updated_at: new Date().toISOString()
    };
    console.log('Update data being sent to Supabase:', JSON.stringify(updateData, null, 2));
    
    const { data, error } = await supabaseAdmin
      .from('category_pages')
      .update(updateData)
      .eq('id', id)
      .select();
    
    // Log the Supabase response
    console.log('Supabase update response - data:', JSON.stringify(data, null, 2));
    
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