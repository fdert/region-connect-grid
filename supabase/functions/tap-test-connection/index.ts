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

    console.log(`Testing Tap connection in ${mode} mode with key: ${secretKey.substring(0, 10)}...`);

    // Validate key format
    const isTestKey = secretKey.startsWith('sk_test_');
    const isLiveKey = secretKey.startsWith('sk_live_');
    
    if (!isTestKey && !isLiveKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid key format. Key should start with sk_test_ or sk_live_' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Test the connection by creating a test charge initiation
    const response = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 1,
        currency: 'SAR',
        customer_initiated: true,
        threeDSecure: true,
        save_card: false,
        description: 'Test connection',
        customer: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          phone: {
            country_code: '966',
            number: '500000000'
          }
        },
        source: { id: 'src_all' },
        redirect: { url: 'https://example.com' }
      })
    });

    const data = await response.json();
    console.log('Tap API response:', JSON.stringify(data));

    // If we get a charge ID or transaction URL, the connection is working
    if (data.id || data.transaction?.url) {
      console.log('Tap connection successful - charge created:', data.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم التحقق من الاتصال بنجاح',
          chargeId: data.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for authentication errors
    if (data.errors) {
      const errorDesc = data.errors[0]?.description || 'Unknown error';
      console.error('Tap API error:', errorDesc);
      
      // Handle specific error cases
      if (errorDesc.includes('authentication') || errorDesc.includes('Unauthorized') || errorDesc.includes('Invalid')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'المفتاح غير صحيح أو منتهي الصلاحية. يرجى التحقق من المفتاح من لوحة تحكم Tap' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorDesc 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // If response is OK but no errors, consider it successful
    if (response.ok || response.status === 200) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم التحقق من صيغة المفتاح'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'فشل في الاتصال بـ Tap. تحقق من المفتاح.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    console.error('Error testing Tap connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
