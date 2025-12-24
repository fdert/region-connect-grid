import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookId, url, secretToken, events } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Testing webhook: ${url}`);

    // Create test payload
    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "هذا طلب تجريبي من منصة التوصيل",
        webhookId,
        configuredEvents: events || [],
        testId: crypto.randomUUID()
      }
    };

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "DeliveryPlatform-Webhook/1.0",
      "X-Webhook-Event": "test"
    };

    // Add HMAC signature if secret token is provided
    if (secretToken) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secretToken),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(JSON.stringify(testPayload))
      );
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      headers["X-Webhook-Signature"] = `sha256=${signatureHex}`;
    }

    // Send test request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`Webhook test response: ${response.status}`);

      return new Response(
        JSON.stringify({
          success: response.ok,
          statusCode: response.status,
          statusText: response.statusText
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({ success: false, error: "انتهت مهلة الاتصال (10 ثواني)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Error testing webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "فشل الاتصال بالـ Webhook" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
