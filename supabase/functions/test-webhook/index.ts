import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { webhookId, url, secretToken, events, testPhone } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Testing webhook: ${url}`);

    // Create realistic test payload that mimics a real order
    const testPayload = {
      event: "order.created",
      timestamp: new Date().toISOString(),
      data: {
        // Order info
        order_id: "test-" + crypto.randomUUID().substring(0, 8),
        order_number: "ORD-" + new Date().toISOString().slice(0, 10).replace(/-/g, '') + "-" + Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
        status: "new",
        total: 150.00,
        subtotal: 135.00,
        delivery_fee: 15.00,
        payment_method: "cash",
        paid: false,
        delivery_address: "حي النزهة، شارع الملك فهد، الرياض",
        delivery_notes: "الطابق الثاني، شقة 5",
        created_at: new Date().toISOString(),
        
        // Customer info
        customer: {
          name: "عميل تجريبي",
          phone: testPhone || "+966500000000"
        },
        
        // Store info
        store: {
          id: "test-store-id",
          name: "متجر تجريبي",
          phone: "+966500000001",
          address: "الرياض، المملكة العربية السعودية"
        },
        
        // Courier info (for assigned orders)
        courier: {
          name: "مندوب تجريبي",
          phone: "+966500000002"
        },
        
        // Order items
        items: [
          {
            name: "منتج تجريبي 1",
            quantity: 2,
            price: 50.00,
            total: 100.00
          },
          {
            name: "منتج تجريبي 2",
            quantity: 1,
            price: 35.00,
            total: 35.00
          }
        ],
        
        // WhatsApp specific fields for n8n
        phone: testPhone || "+966500000000",
        to: testPhone || "+966500000000",
        message: "مرحباً! تم استلام طلبك رقم ORD-TEST-0001 بنجاح. سيتم تجهيزه في أقرب وقت.",
        
        // Meta info
        webhook_id: webhookId,
        configured_events: events || [],
        is_test: true,
        test_id: crypto.randomUUID()
      }
    };

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "DeliveryPlatform-Webhook/1.0",
      "X-Webhook-Event": "test",
      "X-Test-Mode": "true"
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
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text().catch(() => "");
      console.log(`Webhook test response: ${response.status} - ${responseText.substring(0, 200)}`);

      return new Response(
        JSON.stringify({
          success: response.ok,
          statusCode: response.status,
          statusText: response.statusText,
          testData: {
            order_number: testPayload.data.order_number,
            customer_phone: testPayload.data.customer.phone,
            store_name: testPayload.data.store.name
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({ success: false, error: "انتهت مهلة الاتصال (15 ثانية)" }),
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
