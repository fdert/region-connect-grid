import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function scrapePageProducts(apiKey: string, url: string): Promise<any[]> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      formats: ['extract'],
      extract: {
        prompt: `Extract ALL products from this e-commerce page. For each product:
- name: Product name/title (REQUIRED)
- description: Product description if available  
- price: Current price as number (remove currency symbols like SAR, ر.س, $, etc)
- compare_price: Original/old price before discount as number
- image_url: Full URL of product image (must start with http)
- stock: Stock quantity, default to 100

IMPORTANT: Extract EVERY product visible. Look in product grids, lists, cards, carousels.`,
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
      },
      onlyMainContent: false,
      waitFor: 5000,
      timeout: 60000,
    }),
  });

  if (!response.ok) {
    console.error('Firecrawl page scrape failed:', response.status);
    return [];
  }

  const data = await response.json();
  
  // Extract products from response
  if (data.data?.extract?.products) {
    return data.data.extract.products;
  } else if (data.extract?.products) {
    return data.extract.products;
  } else if (Array.isArray(data.data?.extract)) {
    return data.data.extract;
  }
  
  return [];
}

async function discoverProductPages(apiKey: string, baseUrl: string): Promise<string[]> {
  try {
    // Use map to find all URLs on the site, then filter for product/pagination pages
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: baseUrl,
        limit: 100,
        includeSubdomains: false,
      }),
    });

    if (!mapResponse.ok) {
      console.log('Map endpoint failed, using single page scrape');
      return [baseUrl];
    }

    const mapData = await mapResponse.json();
    const links = mapData.links || mapData.data?.links || [];
    
    if (!Array.isArray(links) || links.length === 0) {
      return [baseUrl];
    }

    // Parse the base URL to understand the pattern
    const urlObj = new URL(baseUrl);
    const basePath = urlObj.pathname;
    
    // Filter for pagination URLs (page=2, ?p=2, /page/2, etc.)
    const paginationPatterns = [
      /[?&]page=\d+/i,
      /[?&]p=\d+/i,
      /\/page\/\d+/i,
      /[?&]offset=\d+/i,
    ];
    
    const paginationUrls = links.filter((link: string) => {
      // Check if link is related to the same category/section
      if (!link.includes(basePath) && !link.includes(urlObj.host)) {
        return false;
      }
      // Check for pagination patterns
      return paginationPatterns.some(pattern => pattern.test(link));
    });

    // Return base URL plus any pagination URLs found (limit to 5 pages)
    const uniqueUrls = [baseUrl, ...paginationUrls.slice(0, 4)];
    console.log(`Found ${uniqueUrls.length} pages to scrape`);
    return [...new Set(uniqueUrls)];
  } catch (error) {
    console.error('Error discovering pages:', error);
    return [baseUrl];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, categoryId, scrapeAllPages = false } = await req.json();

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
    console.log('Scrape all pages:', scrapeAllPages);

    let allProducts: any[] = [];

    if (scrapeAllPages) {
      // Discover and scrape multiple pages
      const pagesToScrape = await discoverProductPages(apiKey, formattedUrl);
      console.log('Pages to scrape:', pagesToScrape);

      for (const pageUrl of pagesToScrape) {
        console.log('Scraping page:', pageUrl);
        const pageProducts = await scrapePageProducts(apiKey, pageUrl);
        console.log(`Found ${pageProducts.length} products on ${pageUrl}`);
        allProducts = allProducts.concat(pageProducts);
      }
    } else {
      // Single page scrape
      allProducts = await scrapePageProducts(apiKey, formattedUrl);
    }

    console.log('Total extracted products count:', allProducts.length);

    // Clean, validate and deduplicate products
    const seenNames = new Set<string>();
    const cleanedProducts = allProducts
      .filter((p: any) => p && p.name && typeof p.name === 'string' && p.name.trim())
      .filter((p: any) => {
        const normalizedName = p.name.trim().toLowerCase();
        if (seenNames.has(normalizedName)) {
          return false; // Skip duplicate
        }
        seenNames.add(normalizedName);
        return true;
      })
      .map((p: any) => ({
        name: p.name.trim(),
        description: p.description?.trim() || '',
        price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
        compare_price: typeof p.compare_price === 'number' ? p.compare_price : parseFloat(p.compare_price) || null,
        image_url: p.image_url?.trim() || '',
        stock: typeof p.stock === 'number' ? p.stock : parseInt(p.stock) || 100,
        category_id: categoryId || null,
      }));

    console.log(`Successfully extracted ${cleanedProducts.length} unique products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        products: cleanedProducts,
        total: cleanedProducts.length,
        source_url: formattedUrl,
        message: cleanedProducts.length > 0 
          ? `تم جلب ${cleanedProducts.length} منتج بنجاح`
          : 'لم يتم العثور على منتجات. تأكد من أن الرابط يحتوي على صفحة منتجات.'
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
