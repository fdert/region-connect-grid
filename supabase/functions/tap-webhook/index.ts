import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    
    console.log('Received Tap webhook:', JSON.stringify(payload, null, 2));

    const chargeId = payload.id;
    const status = payload.status;
    const orderId = payload.metadata?.orderId || payload.reference?.order;
    const orderType = payload.metadata?.orderType || 'regular';

    if (!orderId) {
      console.error('No order ID in webhook payload');
      return new Response(
        JSON.stringify({ success: false, error: 'No order ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing webhook for order ${orderId}, status: ${status}`);

    // Handle different webhook events
    if (status === 'CAPTURED') {
      // Payment successful
      console.log(`Payment captured for order ${orderId}`);
      
      if (orderType === 'special') {
        // Update special order
        const { error: updateError } = await supabase
          .from('special_orders')
          .update({
            paid: true,
            payment_method: 'tap',
            payment_confirmed: true,
            payment_confirmed_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('Error updating special order:', updateError);
        }
      } else {
        // Update regular order
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            paid: true,
            payment_method: 'tap',
            payment_confirmed: true,
            payment_confirmed_at: new Date().toISOString(),
            card_transaction_number: chargeId
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('Error updating order:', updateError);
        }

        // Record payment
        const { data: order } = await supabase
          .from('orders')
          .select('total, customer_id, store_id, customer_phone')
          .eq('id', orderId)
          .single();

        if (order) {
          const { error: paymentError } = await supabase
            .from('payment_records')
            .insert({
              order_id: orderId,
              courier_id: order.customer_id, // Using customer_id as a placeholder
              payment_type: 'tap',
              amount_received: order.total,
              store_id: order.store_id,
              customer_phone: order.customer_phone,
              transaction_number: chargeId
            });

          if (paymentError) {
            console.error('Error recording payment:', paymentError);
          }
        }
      }

      console.log(`Order ${orderId} marked as paid`);

    } else if (status === 'FAILED' || status === 'DECLINED' || status === 'CANCELLED') {
      // Payment failed
      console.log(`Payment failed for order ${orderId}: ${status}`);
      
      // You might want to update the order status or notify the customer
      // For now, we just log it

    } else if (status === 'INITIATED') {
      // Payment initiated - customer redirected to payment page
      console.log(`Payment initiated for order ${orderId}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing Tap webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
