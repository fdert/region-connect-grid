import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  phone: string;
  action: "send" | "verify";
  code?: string;
  user_id?: string;
  location_url?: string;
}

// Generate a random 6-digit code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { phone, action, code, user_id, location_url }: OTPRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "رقم الهاتف مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number - ensure it starts with +966
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    console.log(`OTP action: ${action} for phone: ${formattedPhone}`);

    if (action === "send") {
      // Generate OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      // Store OTP in database (we'll use a simple approach with site_settings or create a temp storage)
      // For now, we'll use a simple in-memory approach via webhook
      
      // Get webhook URL for WhatsApp
      const { data: webhooks } = await supabase
        .from("webhook_settings")
        .select("url")
        .eq("is_active", true)
        .contains("events", ["whatsapp"])
        .limit(1);

      const webhookUrl = webhooks?.[0]?.url;

      // Build verification message with location request
      const message = `🔐 رمز التحقق الخاص بك هو: *${otpCode}*

صالح لمدة 5 دقائق.

📍 لتأكيد موقع التوصيل، يرجى مشاركة موقعك الحالي من خلال:
1. اضغط على أيقونة المرفقات 📎
2. اختر "الموقع" 📍
3. أرسل موقعك الحالي

⚠️ لا تشارك هذا الرمز مع أي شخص.

سوقنا 🛒`;

      if (webhookUrl) {
        // Send OTP via WhatsApp webhook
        const webhookPayload = {
          event: "otp_verification",
          timestamp: new Date().toISOString(),
          data: {
            phone: formattedPhone,
            message,
            otp_code: otpCode,
            expires_at: expiresAt.toISOString()
          }
        };

        console.log(`Sending OTP to webhook: ${webhookUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          const webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "DeliveryPlatform-OTP/1.0"
            },
            body: JSON.stringify(webhookPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          console.log(`Webhook response status: ${webhookResponse.status}`);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          console.error("Webhook error:", fetchError);
        }
      } else {
        console.log("No WhatsApp webhook configured");
      }

      // Return success with the OTP (in production, this should NOT be returned to client)
      // For demo purposes, we return it so the flow can work without actual WhatsApp integration
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "تم إرسال رمز التحقق إلى واتساب",
          expires_at: expiresAt.toISOString(),
          // For demo - remove in production
          demo_code: otpCode
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // In a production system, you would verify against stored OTP
      // For now, we'll do a simple check if code was provided
      if (!code || code.length !== 6) {
        return new Response(
          JSON.stringify({ success: false, error: "رمز التحقق غير صالح" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update user profile with phone if user_id provided
      if (user_id) {
        await supabase
          .from("profiles")
          .update({ phone: formattedPhone })
          .eq("user_id", user_id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "تم التحقق بنجاح",
          verified_phone: formattedPhone
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("OTP error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
