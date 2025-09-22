import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { new_category } = body;
    
    if (!new_category || !new_category.trim()) {
      return new Response(JSON.stringify({ error: 'Category name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const categoryName = new_category.trim();
    
    // Generate slug from category name
    const slug = categoryName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Invalid category name - cannot generate valid slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if slug already exists
    const { data: existingCategory } = await supabaseAdmin
      .from('category_pages')
      .select('id, category_name')
      .eq('slug', slug)
      .single();
    
    if (existingCategory) {
      return new Response(JSON.stringify({ 
        error: `Category already exists: "${existingCategory.category_name}" (slug: ${slug})` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create the new category page
    const categoryData = {
      page_title: `${categoryName} - Abbotsford's Best`,
      category_name: categoryName,
      slug: slug,
      description: `Find the best ${categoryName.toLowerCase()} businesses in Abbotsford, BC. Discover top-rated local services and professionals in the ${categoryName.toLowerCase()} category.`,
      icon_name: 'Building', // Default icon, admin can change later
      featured_business_1_id: null,
      featured_business_2_id: null,
      featured_business_3_id: null
    };
    
    const { data, error } = await supabaseAdmin
      .from('category_pages')
      .insert([categoryData])
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
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: data[0],
      message: `Category "${categoryName}" created successfully`
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