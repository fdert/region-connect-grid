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

    // Try to send WhatsApp message directly via API (like OTP)
    const whatsappAppKey = Deno.env.get("WHATSAPP_APP_KEY");
    const whatsappAuthKey = Deno.env.get("WHATSAPP_AUTH_KEY");
    
    let whatsappSent = false;
    
    if (whatsappAppKey && whatsappAuthKey) {
      console.log("Sending location request directly via WhatsApp API to:", formattedPhone);
      
      try {
        const formData = new FormData();
        formData.append("appkey", whatsappAppKey);
        formData.append("authkey", whatsappAuthKey);
        formData.append("to", formattedPhone);
        formData.append("message", message);

        const response = await fetch("https://darcoom.com/wsender/public/api/create-message", {
          method: "POST",
          body: formData
        });

        const responseText = await response.text();
        console.log("WhatsApp API response:", response.status, responseText);
        
        if (response.ok) {
          whatsappSent = true;
          console.log("Location request sent successfully via WhatsApp API");
        }
      } catch (error: any) {
        console.error("Error sending WhatsApp message directly:", error.message || error);
      }
    } else {
      console.log("WhatsApp API credentials not found, falling back to webhook");
      
      // Fallback to webhook
      const { data: webhooks } = await supabase
        .from("webhook_settings")
        .select("*")
        .eq("is_active", true)
        .contains("events", ["location.request"]);

      if (webhooks && webhooks.length > 0) {
        for (const webhook of webhooks) {
          try {
            const webhookPayload = {
              type: "location_request",
              event: "location.request",
              phone: formattedPhone,
              message: message,
              timestamp: new Date().toISOString()
            };

            const response = await fetch(webhook.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(webhookPayload)
            });

            if (response.ok) {
              whatsappSent = true;
              console.log("Location request sent via webhook:", webhook.name);
            }
          } catch (error: any) {
            console.error("Webhook error:", error.message);
          }
        }
      }
    }

    // Update OTP session to mark that location was requested
    await supabase
      .from("otp_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("phone", formattedPhone)
      .gt("expires_at", new Date().toISOString());

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Location request sent via WhatsApp",
        whatsapp_sent: whatsappSent
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
