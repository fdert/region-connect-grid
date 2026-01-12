import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeRequest {
  orderId: string;
  orderType: 'regular' | 'special';
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  redirectUrl: string;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ChargeRequest = await req.json();
    const { orderId, orderType, amount, customerName, customerEmail, customerPhone, redirectUrl, description } = body;

    console.log('Creating Tap charge for order:', orderId);

    // Get payment settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('gateway_name', 'tap')
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching payment settings:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment gateway not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!settings.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment gateway is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the appropriate secret key based on mode
    const secretKey = settings.mode === 'live' 
      ? settings.live_secret_key 
      : settings.test_secret_key;

    if (!secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const currency = settings.settings?.currency || 'SAR';
    const language = settings.settings?.language || 'ar';

    // Create charge request to Tap
    const chargeData = {
      amount,
      currency,
      threeDSecure: true,
      save_card: false,
      description: description || `Order #${orderId}`,
      statement_descriptor: 'Souqna Store',
      metadata: {
        orderId,
        orderType
      },
      reference: {
        order: orderId
      },
      receipt: {
        email: !!customerEmail,
        sms: true
      },
      customer: {
        first_name: customerName.split(' ')[0] || customerName,
        last_name: customerName.split(' ').slice(1).join(' ') || '',
        email: customerEmail || '',
        phone: {
          country_code: customerPhone.startsWith('+966') ? '966' : 
                        customerPhone.startsWith('+971') ? '971' : '966',
          number: customerPhone.replace(/^\+\d{2,3}/, '').replace(/^0/, '')
        }
      },
      source: {
        id: 'src_all'  // Allow all payment methods
      },
      redirect: {
        url: redirectUrl
      },
      post: {
        url: `${supabaseUrl}/functions/v1/tap-webhook`
      }
    };

    console.log('Sending charge request to Tap:', JSON.stringify(chargeData, null, 2));

    const tapResponse = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'lang_code': language
      },
      body: JSON.stringify(chargeData)
    });

    const tapData = await tapResponse.json();

    if (!tapResponse.ok) {
      console.error('Tap charge creation failed:', tapData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: tapData.errors?.[0]?.description || 'Failed to create charge' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Tap charge created successfully:', tapData.id);

    // Return the payment URL for redirect
    return new Response(
      JSON.stringify({
        success: true,
        chargeId: tapData.id,
        paymentUrl: tapData.transaction?.url,
        status: tapData.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating Tap charge:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
