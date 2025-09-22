import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST({ request }) {
  try {
    if (!import.meta.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate that it's a Google-related URL
    if (!url.includes('google.com') && !url.includes('maps.app.goo.gl') && !url.includes('share.google')) {
      return new Response(JSON.stringify({ error: 'Please provide a valid Google Business Profile or Google Maps URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const prompt = `Please visit the following Google Business Profile or Google Maps URL and extract the business information: ${url}

Extract the following information and return it as a JSON object with these exact keys. If information is missing from the Google Business Profile, please search for the business website or other online resources to find complete details:

- name: Business name
- address: Full business address
- phone: Phone number (format: (xxx) xxx-xxxx if possible)
- email: Email address (search the business website or contact pages if not on Google profile)
- website: Website URL (search if not directly available on Google profile)
- description: Comprehensive business description of approximately 700 characters that includes services offered, specialties, years in business, service area, and what makes them unique
- categories: Array of business categories/types (e.g., ["restaurant", "italian-food", "dining"])

Important guidelines:
1. Use web browsing to find missing information like email addresses by visiting the business website
2. If any information is still not available after searching, use null for that field
3. For the description, aim for exactly 700 characters - make it comprehensive and informative
4. Include details about services, experience, location served, and unique selling points in the description
5. Search multiple sources if needed to create a complete business profile
6. For categories, try to match common business types that would be suitable for a local directory
7. Ensure phone numbers are properly formatted
8. Make sure website URLs include the protocol (http:// or https://)
9. Return only valid JSON, no additional text or explanations

Example response format:
{
  "name": "Example Business",
  "address": "123 Main St, Abbotsford, BC V2S 1A1",
  "phone": "(604) 555-1234",
  "email": "info@example.com",
  "website": "https://www.example.com",
  "description": "A local business providing quality services to the Abbotsford community since 1995. Specializing in professional consulting, project management, and business development services for small to medium enterprises. Known for personalized attention, competitive pricing, and exceptional customer service. Serving Abbotsford, Chilliwack, and surrounding Fraser Valley communities with over 25 years of combined experience. Family-owned and operated with a commitment to helping local businesses grow and succeed in today's competitive marketplace.",
  "categories": ["professional-services", "consulting"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    if (!responseText) {
      return new Response(JSON.stringify({ error: 'No response from Gemini AI service' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Try to parse the JSON response
    let extractedData;
    try {
      // Try parsing the raw response first
      try {
        extractedData = JSON.parse(responseText);
      } catch (directParseError) {
        // If direct parsing fails, try to extract JSON from markdown or wrapped content
        let jsonString = responseText;
        
        // Remove markdown code blocks (```json ... ``` or ``` ... ```)
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
        } else {
          // Try to find JSON object in the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          }
        }
        
        // Clean up common formatting issues
        jsonString = jsonString.trim();
        
        extractedData = JSON.parse(jsonString);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw Gemini response:', responseText);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse extracted data. The AI response was not in the expected JSON format. Please try again.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate required fields
    if (!extractedData.name) {
      return new Response(JSON.stringify({ 
        error: 'Could not extract business name from the provided URL. Please check the URL and try again.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure categories is an array
    if (!Array.isArray(extractedData.categories)) {
      extractedData.categories = [];
    }

    // Set default values for missing fields
    const businessData = {
      name: extractedData.name || '',
      address: extractedData.address || '',
      phone: extractedData.phone || '',
      email: extractedData.email || '',
      website: extractedData.website || '',
      description: extractedData.description || '',
      categories: extractedData.categories || [],
      new_category: null,
      backlink_url: null,
      friends: false,
      similar: false,
      status: 'pending'
    };

    return new Response(JSON.stringify({ 
      success: true, 
      data: businessData 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    
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
        error: 'Content was blocked by Gemini safety filters. Please try a different URL.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Failed to extract business data. Please try again later.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}