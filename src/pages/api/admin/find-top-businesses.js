import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper function to format phone numbers
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (xxx) xxx-xxxx for 10-digit numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Format as +x (xxx) xxx-xxxx for 11-digit numbers starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return original if can't format
  return phone;
}

// Main function to find and process businesses using Gemini with Google Search grounding
async function findAndProcessBusinessesWithAI(categoryName, cityName, genAI) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} }]
  });
  
  const prompt = `You are helping to create a comprehensive business directory. I need you to find the top 3 businesses for "${categoryName}" in "${cityName}" using Google Search, then extract and process their information.

SEARCH AND EXTRACT REQUIREMENTS:
1. Search Google for the top 3 businesses in the "${categoryName}" category located specifically in "${cityName}"
2. For each business, you must extract or find:
   - Business name
   - Complete address (must be in ${cityName})
   - Phone number
   - Website URL
   - Email address (visit the business website and check homepage, /contact, /about pages - if no email found, use null)
   - Business description/services from their website or Google Business Profile

PROCESSING REQUIREMENTS:
3. Generate a comprehensive business description (approximately 700 characters) that includes:
   - Services offered and specialties related to "${categoryName}"
   - What makes them unique or highly rated
   - Service area (mention "${cityName}" and surrounding areas if appropriate)
   - Years of experience if available
   - Key selling points for local customers

4. Create an array of business categories in slug format based on the business type:
   - Examples: "Auto Glass Repair" → ["auto-glass-repair", "automotive-services"]
   - Examples: "Italian Restaurant" → ["italian-restaurant", "restaurants", "dining"]
   - Examples: "Hair Salon" → ["hair-salon", "beauty-services", "personal-care"]

IMPORTANT REQUIREMENTS:
- Only include businesses that are actually located in "${cityName}" (verify addresses)
- Visit business websites to find email addresses when possible
- Return exactly 3 businesses (or fewer if less than 3 qualify)
- Return ONLY valid JSON, no additional text or explanations

OUTPUT FORMAT:
Return a JSON array of business objects with this exact structure:

[
  {
    "name": "Business Name",
    "address": "123 Main St, ${cityName}, Province/State",
    "phone": "(604) 555-1234",
    "email": "contact@business.com",
    "website": "https://www.business.com",
    "description": "Comprehensive 700-character description including services, specialties, service area, and unique selling points...",
    "categories": ["category-1", "category-2"]
  }
]

Begin your search now for "${categoryName}" businesses in "${cityName}".`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();
  
  if (!responseText) {
    throw new Error('No response from Gemini AI service');
  }

  // Parse JSON response
  let businessData;
  try {
    let jsonString = responseText.trim();
    
    // Remove markdown code blocks if present
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      // Try to find JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }
    
    businessData = JSON.parse(jsonString);
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', parseError);
    console.error('Raw Gemini response:', responseText);
    throw new Error('Failed to parse business data from Gemini response. The AI response was not in the expected JSON format.');
  }

  // Validate that we got an array
  if (!Array.isArray(businessData)) {
    throw new Error('Gemini response was not a valid array of businesses');
  }

  // Validate and clean each business object
  const validBusinesses = businessData.filter(business => {
    return business.name && business.address && business.address.toLowerCase().includes(cityName.toLowerCase());
  }).map(business => ({
    name: business.name || '',
    address: business.address || '',
    phone: formatPhoneNumber(business.phone) || '',
    email: business.email || null,
    website: business.website || '',
    description: business.description || '',
    categories: Array.isArray(business.categories) ? business.categories : []
  }));

  return validBusinesses;
}

export async function POST({ request }) {
  try {
    // Check for required API key
    if (!import.meta.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY);

    const body = await request.json();
    const { categoryName, cityName } = body;
    
    if (!categoryName || !cityName) {
      return new Response(JSON.stringify({ error: 'Category name and city name are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting Gemini-powered business search for "${categoryName}" in "${cityName}"`);

    // Use Gemini with Google Search grounding to find and process businesses
    const businesses = await findAndProcessBusinessesWithAI(categoryName, cityName, genAI);
    
    if (businesses.length === 0) {
      return new Response(JSON.stringify({ 
        error: `No businesses found for "${categoryName}" in "${cityName}". Please try different search terms.` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${businesses.length} businesses using Gemini with Google Search grounding`);

    // Convert to final business submission format
    const finalBusinesses = businesses.map(business => ({
      name: business.name,
      address: business.address,
      phone: business.phone,
      email: business.email,
      website: business.website,
      description: business.description,
      categories: business.categories,
      new_category: null,
      backlink_url: null,
      friends: false,
      similar: false,
      status: 'pending'
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      data: finalBusinesses,
      searchTerms: {
        category: categoryName,
        city: cityName
      },
      metadata: {
        method: 'gemini_grounding',
        businessCount: finalBusinesses.length,
        groundingEnabled: true
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API error:', error);
    
    // Handle specific Gemini errors
    if (error.message?.includes('API_KEY_INVALID')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid Gemini API key. Please check your configuration.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (error.message?.includes('QUOTA_EXCEEDED')) {
      return new Response(JSON.stringify({ 
        error: 'Gemini API quota exceeded. Please check your API usage and billing.' 
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (error.message?.includes('SAFETY')) {
      return new Response(JSON.stringify({ 
        error: 'Content was blocked by Gemini safety filters. Please try a different search.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to find businesses. Please try again later.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}