import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  phone: string;
  action: "send" | "verify" | "check_location";
  code?: string;
  user_id?: string;
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

    const { phone, action, code, user_id }: OTPRequest = await req.json();

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

    // Check location action - poll for location from WhatsApp
    if (action === "check_location") {
      console.log(`Checking location for phone: ${formattedPhone}`);
      
      // Find verified session with location updated in last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data: sessionWithLocation } = await supabase
        .from("otp_sessions")
        .select("*")
        .eq("phone", formattedPhone)
        .eq("is_verified", true)
        .not("location_lat", "is", null)
        .not("location_lng", "is", null)
        .gt("updated_at", twoMinutesAgo)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionWithLocation) {
        // Check if location is valid (not 0,0)
        const hasValidLocation = 
          sessionWithLocation.location_lat !== 0 || sessionWithLocation.location_lng !== 0;

        console.log(`Found session with location: id=${sessionWithLocation.id}, lat=${sessionWithLocation.location_lat}, lng=${sessionWithLocation.location_lng}, updated=${sessionWithLocation.updated_at}`);

        if (hasValidLocation) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              has_location: true,
              session_id: sessionWithLocation.id,
              location: {
                lat: sessionWithLocation.location_lat,
                lng: sessionWithLocation.location_lng,
                address: sessionWithLocation.location_address,
                url: sessionWithLocation.location_url
              }
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.log("No session with recent location found");
      return new Response(
        JSON.stringify({ success: true, has_location: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send") {
      // Generate OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      // Store OTP in database
      const { error: insertError } = await supabase
        .from("otp_sessions")
        .insert({
          phone: formattedPhone,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
      }
      
      // Build verification message with location request
      const message = `🔐 رمز التحقق الخاص بك هو: *${otpCode}*

صالح لمدة 5 دقائق.

📍 لتأكيد موقع التوصيل، يرجى مشاركة موقعك الحالي من خلال:
1. اضغط على أيقونة المرفقات 📎
2. اختر "الموقع" 📍
3. أرسل موقعك الحالي

⚠️ لا تشارك هذا الرمز مع أي شخص.

سوقنا 🛒`;

      let whatsappSent = false;

      // Get WhatsApp API credentials from environment
      const whatsappAppKey = Deno.env.get("WHATSAPP_APP_KEY");
      const whatsappAuthKey = Deno.env.get("WHATSAPP_AUTH_KEY");

      if (whatsappAppKey && whatsappAuthKey) {
        // Send WhatsApp message directly via API
        console.log(`Sending WhatsApp message directly to: ${formattedPhone}`);

        try {
          const formData = new FormData();
          formData.append("appkey", whatsappAppKey);
          formData.append("authkey", whatsappAuthKey);
          formData.append("to", formattedPhone);
          formData.append("message", message);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const whatsappResponse = await fetch("https://darcoom.com/wsender/public/api/create-message", {
            method: "POST",
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          const responseText = await whatsappResponse.text();
          console.log(`WhatsApp API response: ${whatsappResponse.status} - ${responseText}`);
          whatsappSent = whatsappResponse.ok;
        } catch (fetchError: any) {
          console.error("WhatsApp API error:", fetchError.message || fetchError);
        }
      } else {
        console.log("WhatsApp API credentials not configured, trying webhook fallback...");
        
        // Fallback to webhook if no direct API credentials
        const { data: webhooks } = await supabase
          .from("webhook_settings")
          .select("*")
          .eq("is_active", true)
          .contains("events", ["whatsapp.otp"])
          .limit(1);

        const webhook = webhooks?.[0];

        if (webhook) {
          const webhookPayload = {
            event: "whatsapp.otp",
            type: "otp_verification",
            timestamp: new Date().toISOString(),
            phone: formattedPhone,
            message,
            data: {
              phone: formattedPhone,
              message,
              otp_code: otpCode,
              expires_at: expiresAt.toISOString()
            }
          };

          console.log(`Sending OTP to webhook: ${webhook.url}`);

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const webhookResponse = await fetch(webhook.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "DeliveryPlatform-OTP/1.0",
                ...(webhook.secret_token && { "X-Webhook-Secret": webhook.secret_token })
              },
              body: JSON.stringify(webhookPayload),
              signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log(`Webhook response status: ${webhookResponse.status}`);
            whatsappSent = webhookResponse.ok;
          } catch (fetchError: any) {
            console.error("Webhook error:", fetchError);
          }
        } else {
          console.log("No WhatsApp webhook configured for OTP");
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "تم إرسال رمز التحقق إلى واتساب",
          expires_at: expiresAt.toISOString(),
          whatsapp_sent: whatsappSent,
          // For demo - remove in production
          demo_code: otpCode
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!code || code.length !== 6) {
        return new Response(
          JSON.stringify({ success: false, error: "رمز التحقق غير صالح" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify OTP against stored session
      const { data: otpSession, error: fetchError } = await supabase
        .from("otp_sessions")
        .select("*")
        .eq("phone", formattedPhone)
        .eq("otp_code", code)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !otpSession) {
        console.log("OTP verification failed:", { fetchError, code, phone: formattedPhone });
        return new Response(
          JSON.stringify({ success: false, error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark session as verified
      await supabase
        .from("otp_sessions")
        .update({ is_verified: true, updated_at: new Date().toISOString() })
        .eq("id", otpSession.id);

      console.log("OTP verified successfully for session:", otpSession.id);

      // Update user profile with phone if user_id provided
      if (user_id) {
        await supabase
          .from("profiles")
          .update({ phone: formattedPhone })
          .eq("user_id", user_id);
      }

      // Return location if available and valid
      const hasValidLocation = 
        otpSession.location_lat !== null && 
        otpSession.location_lng !== null &&
        (otpSession.location_lat !== 0 || otpSession.location_lng !== 0);

      const locationData = hasValidLocation ? {
        lat: otpSession.location_lat,
        lng: otpSession.location_lng,
        address: otpSession.location_address,
        url: otpSession.location_url
      } : null;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "تم التحقق بنجاح",
          verified_phone: formattedPhone,
          location: locationData
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
