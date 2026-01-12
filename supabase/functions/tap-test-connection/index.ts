import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { secretKey, mode } = await req.json();

    if (!secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Secret key is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Testing Tap connection in ${mode} mode...`);

    // Test the connection by fetching business info from Tap
    const response = await fetch('https://api.tap.company/v2/business', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Tap connection successful:', data.name);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection successful',
          businessName: data.name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Tap connection failed:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.errors?.[0]?.description || 'Connection failed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Error testing Tap connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
