import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, categoryId } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping products from URL:', formattedUrl);

    // Use Firecrawl to scrape with JSON extraction - correct v2 format
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: [
          {
            type: 'json',
            prompt: `Extract all products from this page. For each product, extract:
- name: Product name/title (required)
- description: Product description
- price: Current price as a number (no currency symbols)
- compare_price: Original/old price if there's a discount, as a number
- image_url: Main product image URL (full URL)
- stock: Stock quantity if available, default to 100

Return as an array of product objects. Extract as many products as possible from the page.`,
            schema: {
              type: 'object',
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      price: { type: 'number' },
                      compare_price: { type: 'number' },
                      image_url: { type: 'string' },
                      stock: { type: 'number' }
                    },
                    required: ['name']
                  }
                }
              },
              required: ['products']
            }
          }
        ],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    console.log('Firecrawl response status:', response.status);
    console.log('Firecrawl response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract products from response - handle multiple response formats
    let products = [];
    
    // Try json format first (v2 API)
    if (data.data?.json?.products) {
      products = data.data.json.products;
    } else if (data.json?.products) {
      products = data.json.products;
    } else if (Array.isArray(data.data?.json)) {
      products = data.data.json;
    } else if (Array.isArray(data.json)) {
      products = data.json;
    }
    // Fallback to extract format
    else if (data.data?.extract?.products) {
      products = data.data.extract.products;
    } else if (data.extract?.products) {
      products = data.extract.products;
    } else if (Array.isArray(data.data?.extract)) {
      products = data.data.extract;
    } else if (Array.isArray(data.extract)) {
      products = data.extract;
    }

    console.log('Extracted products count:', products.length);

    // Clean and validate products
    const cleanedProducts = products
      .filter((p: any) => p && p.name && typeof p.name === 'string' && p.name.trim())
      .map((p: any) => ({
        name: p.name.trim(),
        description: p.description?.trim() || '',
        price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
        compare_price: typeof p.compare_price === 'number' ? p.compare_price : parseFloat(p.compare_price) || null,
        image_url: p.image_url?.trim() || '',
        stock: typeof p.stock === 'number' ? p.stock : parseInt(p.stock) || 100,
        category_id: categoryId || null,
      }));

    console.log(`Successfully extracted ${cleanedProducts.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        products: cleanedProducts,
        total: cleanedProducts.length,
        source_url: formattedUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape products';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
