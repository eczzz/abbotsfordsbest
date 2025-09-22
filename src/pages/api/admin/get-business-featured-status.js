import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export async function GET({ url }) {
  try {
    const businessId = url.searchParams.get('businessId');
    
    if (!businessId) {
      return new Response(JSON.stringify({ error: 'Missing businessId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Query category_pages to find where this business is featured
    const { data: categoryPages, error } = await supabaseAdmin
      .from('category_pages')
      .select('slug, featured_business_1_id, featured_business_2_id, featured_business_3_id')
      .or(`featured_business_1_id.eq.${businessId},featured_business_2_id.eq.${businessId},featured_business_3_id.eq.${businessId}`);
    
    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract the category slugs and positions where this business is featured
    const featuredCategories = [];
    if (categoryPages) {
      categoryPages.forEach(page => {
        if (page.featured_business_1_id === businessId) {
          featuredCategories.push({ slug: page.slug, position: 1 });
        }
        if (page.featured_business_2_id === businessId) {
          featuredCategories.push({ slug: page.slug, position: 2 });
        }
        if (page.featured_business_3_id === businessId) {
          featuredCategories.push({ slug: page.slug, position: 3 });
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      featuredCategories 
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