import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

interface WebhookSettings {
  id: string;
  url: string;
  secret_token: string | null;
  events: string[];
  is_active: boolean;
}

async function sendWebhook(webhook: WebhookSettings, payload: WebhookPayload) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "DeliveryPlatform-Webhook/1.0",
    "X-Webhook-Event": payload.event
  };

  // Add HMAC signature if secret token is set
  if (webhook.secret_token) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhook.secret_token),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(JSON.stringify(payload))
    );
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    headers["X-Webhook-Signature"] = `sha256=${signatureHex}`;
  }

  try {
    console.log(`Sending webhook to ${webhook.url} for event ${payload.event}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`Webhook response: ${response.status}`);
    return { success: response.ok, status: response.status };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Webhook error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// Helper function to get order details with related data
async function getOrderDetails(supabase: any, orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      stores:store_id (id, name, phone, address)
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    console.error("Error fetching order:", error);
    return null;
  }

  // Get customer profile
  const { data: customerProfile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("user_id", order.customer_id)
    .maybeSingle();

  // Get courier profile if assigned
  let courierProfile = null;
  if (order.courier_id) {
    const { data: courier } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", order.courier_id)
      .maybeSingle();
    courierProfile = courier;
  }

  return {
    ...order,
    customer: customerProfile,
    courier: courierProfile
  };
}

// Helper function to get special order details
async function getSpecialOrderDetails(supabase: any, orderId: string) {
  const { data: order, error } = await supabase
    .from("special_orders")
    .select(`
      *,
      special_services:service_id (id, name, name_ar)
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    console.error("Error fetching special order:", error);
    return null;
  }

  // Get customer profile
  const { data: customerProfile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("user_id", order.customer_id)
    .maybeSingle();

  // Get courier profile if assigned
  let courierProfile = null;
  if (order.courier_id) {
    const { data: courier } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", order.courier_id)
      .maybeSingle();
    courierProfile = courier;
  }

  return {
    ...order,
    customer: customerProfile,
    courier: courierProfile
  };
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

    const { event, order_id, special_order_id, data: customData } = await req.json();

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Missing event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook event: ${event}`);

    // Prepare data based on event type
    let enrichedData: Record<string, any> = customData || {};

    // Fetch real order data if order_id is provided
    if (order_id) {
      const orderDetails = await getOrderDetails(supabase, order_id);
      if (orderDetails) {
        enrichedData = {
          order_id: orderDetails.id,
          order_number: orderDetails.order_number,
          status: orderDetails.status,
          total: orderDetails.total,
          subtotal: orderDetails.subtotal,
          delivery_fee: orderDetails.delivery_fee,
          payment_method: orderDetails.payment_method,
          paid: orderDetails.paid,
          delivery_address: orderDetails.delivery_address,
          delivery_notes: orderDetails.delivery_notes,
          created_at: orderDetails.created_at,
          updated_at: orderDetails.updated_at,
          items: orderDetails.items,
          store: orderDetails.stores ? {
            id: orderDetails.stores.id,
            name: orderDetails.stores.name,
            phone: orderDetails.stores.phone,
            address: orderDetails.stores.address
          } : null,
          customer: orderDetails.customer ? {
            name: orderDetails.customer.full_name,
            phone: orderDetails.customer_phone || orderDetails.customer.phone
          } : null,
          courier: orderDetails.courier ? {
            name: orderDetails.courier.full_name,
            phone: orderDetails.courier.phone
          } : null,
          ...customData
        };
      }
    }

    // Fetch real special order data if special_order_id is provided
    if (special_order_id) {
      const specialOrderDetails = await getSpecialOrderDetails(supabase, special_order_id);
      if (specialOrderDetails) {
        enrichedData = {
          order_id: specialOrderDetails.id,
          order_number: specialOrderDetails.order_number,
          status: specialOrderDetails.status,
          total: specialOrderDetails.total,
          delivery_fee: specialOrderDetails.delivery_fee,
          payment_method: specialOrderDetails.payment_method,
          paid: specialOrderDetails.paid,
          created_at: specialOrderDetails.created_at,
          updated_at: specialOrderDetails.updated_at,
          service: specialOrderDetails.special_services ? {
            id: specialOrderDetails.special_services.id,
            name: specialOrderDetails.special_services.name,
            name_ar: specialOrderDetails.special_services.name_ar
          } : null,
          sender: {
            name: specialOrderDetails.sender_name,
            phone: specialOrderDetails.sender_phone,
            address: specialOrderDetails.sender_address
          },
          recipient: {
            name: specialOrderDetails.recipient_name,
            phone: specialOrderDetails.recipient_phone,
            address: specialOrderDetails.recipient_address
          },
          package: {
            type: specialOrderDetails.package_type,
            size: specialOrderDetails.package_size,
            weight: specialOrderDetails.package_weight,
            description: specialOrderDetails.package_description
          },
          courier: specialOrderDetails.courier ? {
            name: specialOrderDetails.courier.full_name,
            phone: specialOrderDetails.courier.phone
          } : null,
          distance_km: specialOrderDetails.distance_km,
          notes: specialOrderDetails.notes,
          ...customData
        };
      }
    }

    // Fetch active webhooks that subscribe to this event
    const { data: webhooks, error } = await supabase
      .from("webhook_settings")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching webhooks:", error);
      throw error;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: enrichedData,
    };

    // Filter webhooks that subscribe to this event and send
    const results = [];
    for (const webhook of webhooks || []) {
      // Check if webhook subscribes to this event
      const eventMatches = webhook.events.some((e: string) => {
        if (e === "*") return true;
        if (e === event) return true;
        // Match event category (e.g., "order.*" matches "order.created")
        if (e.endsWith(".*")) {
          const category = e.replace(".*", "");
          return event.startsWith(category + ".");
        }
        return false;
      });

      if (eventMatches) {
        const result = await sendWebhook(webhook, payload);
        results.push({ webhook_id: webhook.id, name: webhook.name, ...result });
      }
    }

    console.log(`Sent ${results.length} webhooks for event ${event}`);

    return new Response(
      JSON.stringify({ success: true, event, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
