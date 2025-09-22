import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

function toPostgresArrayLiteral(jsArray) {
  if (!Array.isArray(jsArray) || jsArray.length === 0) {
    return '{}';
  }
  
  // Escape any quotes in the array elements and wrap in PostgreSQL array literal format
  const escapedElements = jsArray.map(item => {
    if (typeof item !== 'string') return '';
    // Escape any existing quotes and wrap in quotes if needed
    return item.replace(/"/g, '\\"');
  }).filter(item => item !== '');
  
  return `{${escapedElements.join(',')}}`;
}

function normalizeFeaturedCategories(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const validCategories = [];
  for (const entry of value) {
    if (typeof entry === 'object' && entry !== null && entry.slug && entry.position) {
      const slug = typeof entry.slug === 'string' ? entry.slug.trim() : '';
      const position = parseInt(entry.position);
      
      if (slug && position >= 1 && position <= 3) {
        validCategories.push({
          slug: slug,
          position: position
        });
      }
    }
  }

  return validCategories;
}

function handleRpcError(error) {
  console.error('Supabase RPC error:', error);

  let structuredDetails = null;
  if (error?.details) {
    if (typeof error.details === 'string') {
      try {
        structuredDetails = JSON.parse(error.details);
      } catch (parseError) {
        structuredDetails = null;
      }
    } else if (typeof error.details === 'object') {
      structuredDetails = error.details;
    }
  }

  const responseBody = {
    error: structuredDetails?.message || error?.message || 'Database error',
    details: structuredDetails || error?.details || null,
    code: structuredDetails?.code || error?.code || 'rpc_error'
  };

  let status = 500;
  switch (structuredDetails?.type) {
    case 'validation_error':
      status = 400;
      break;
    case 'conflict':
      status = 409;
      break;
    case 'not_found':
      status = 404;
      break;
    default:
      if (error?.code === 'P0001') {
        status = 400;
      }
  }

  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  try {
    const body = await request.json();

    const {
      categoriesToFeature = [],
      categoriesToUnfeature = [],
      ...payload
    } = body || {};

    const {
      name,
      address,
      phone,
      email,
      website,
      categories,
      new_category,
      description,
      backlink_url,
      logo_url,
      status,
      friends,
      similar
    } = payload;

    if (!name || !address || !phone || !email || !website || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedCategories = normalizeSlugArray(categories);
    const trimmedNewCategory = new_category ? new_category.trim() : '';

    if (sanitizedCategories.length === 0 && !trimmedNewCategory) {
      return new Response(JSON.stringify({ error: 'Either categories must be selected or a new category must be suggested' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const submissionData = {
      name,
      address,
      phone,
      email,
      website,
      categories: toPostgresArrayLiteral(normalizeSlugArray(categories)),
      new_category: trimmedNewCategory || null,
      description,
      backlink_url: backlink_url || null,
      friends: typeof friends === 'boolean' ? friends : false,
      similar: typeof similar === 'boolean' ? similar : false,
      status: status || 'pending'
    };

    if (logo_url) {
      submissionData.logo_url = logo_url;
    }

    // Helper function for categories array (still needed for submission data)
    function normalizeSlugArray(value) {
      if (!Array.isArray(value)) {
        return [];
      }

      const unique = new Set();
      for (const entry of value) {
        if (typeof entry !== 'string') continue;
        const trimmed = entry.trim();
        if (trimmed) {
          unique.add(trimmed);
        }
      }

      return Array.from(unique);
    }

    const { data, error } = await supabaseAdmin.rpc('admin_save_submission_with_featured', {
      submission_data: submissionData,
      categories_to_feature: normalizeFeaturedCategories(categoriesToFeature),
      categories_to_unfeature: normalizeFeaturedCategories(categoriesToUnfeature)
    });

    if (error) {
      return handleRpcError(error);
    }

    return new Response(JSON.stringify({
      success: true,
      data: data?.submission || null,
      featured: data?.featured || [],
      unfeatured: data?.unfeatured || []
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
