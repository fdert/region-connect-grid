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
    
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    console.log(`Webhook response: ${response.status}`);
    return { success: response.ok, status: response.status };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Webhook error: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
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

    const { event, data } = await req.json();

    if (!event || !data) {
      return new Response(
        JSON.stringify({ error: "Missing event or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook event: ${event}`);

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
      data,
    };

    // Filter webhooks that subscribe to this event and send
    const results = [];
    for (const webhook of webhooks || []) {
      if (webhook.events.includes(event) || webhook.events.includes("*")) {
        const result = await sendWebhook(webhook, payload);
        results.push({ webhook_id: webhook.id, ...result });
      }
    }

    console.log(`Sent ${results.length} webhooks for event ${event}`);

    return new Response(
      JSON.stringify({ success: true, results }),
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
