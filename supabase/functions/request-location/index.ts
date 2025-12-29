import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationRequest {
  phone: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone }: LocationRequest = await req.json();
    
    console.log("Request location for phone:", phone);

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Get ALL active webhooks
    const { data: webhooks, error: webhookError } = await supabase
      .from("webhook_settings")
      .select("*")
      .eq("is_active", true);

    if (webhookError) {
      console.error("Error fetching webhooks:", webhookError);
    }

    console.log("All active webhooks:", webhooks?.length || 0);

    // Filter webhooks that should handle location requests
    const locationWebhooks = webhooks?.filter(w => 
      w.events?.includes("location.request") || 
      w.events?.includes("whatsapp.message") ||
      w.events?.includes("whatsapp")
    ) || [];

    console.log("Filtered location webhooks:", locationWebhooks.length);

    // Get location request template
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("name", "location_request")
      .eq("is_active", true)
      .maybeSingle();

    // Default message if no template found
    let message = `📍 مرحباً!

لإتمام طلبك، نحتاج لموقع التوصيل.

الرجاء إرسال موقعك الحالي عبر:
1. اضغط على أيقونة المرفقات (📎)
2. اختر "الموقع" (Location)
3. أرسل موقعك الحالي

شكراً لك! 🚚`;

    if (template) {
      message = template.template;
    }

    // Send WhatsApp message via webhook
    let webhookSent = false;
    let webhookResponses: string[] = [];
    
    if (locationWebhooks.length > 0) {
      for (const webhook of locationWebhooks) {
        try {
          const webhookPayload = {
            type: "location_request",
            event: "location.request",
            phone: formattedPhone,
            message: message,
            timestamp: new Date().toISOString(),
            data: {
              phone: formattedPhone,
              message: message
            }
          };

          console.log("Sending location request to webhook:", webhook.url, webhook.name);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "DeliveryPlatform-Location/1.0",
              ...(webhook.secret_token && { "X-Webhook-Secret": webhook.secret_token })
            },
            body: JSON.stringify(webhookPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          const responseText = await response.text();
          console.log(`Webhook ${webhook.name} response: ${response.status} - ${responseText}`);
          webhookResponses.push(`${webhook.name}: ${response.status}`);

          if (response.ok) {
            webhookSent = true;
            console.log("Location request sent successfully via webhook:", webhook.name);
          } else {
            console.error("Webhook response not ok:", response.status, responseText);
          }
        } catch (error: any) {
          console.error("Error sending to webhook:", webhook.name, error.message || error);
          webhookResponses.push(`${webhook.name}: error - ${error.message || 'unknown'}`);
        }
      }
    } else {
      console.log("No webhooks configured for location.request");
    }

    // Update OTP session to mark that location was requested
    const { error: updateError } = await supabase
      .from("otp_sessions")
      .update({
        updated_at: new Date().toISOString()
      })
      .eq("phone", formattedPhone)
      .gt("expires_at", new Date().toISOString());

    if (updateError) {
      console.error("Error updating OTP session:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Location request sent via WhatsApp",
        webhook_sent: webhookSent,
        webhooks_found: locationWebhooks.length,
        webhook_responses: webhookResponses
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Request location error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
