import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  phone: string;
  template_name: string;
  variables: Record<string, string>;
  webhook_url?: string;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return message;
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

    const { phone, template_name, variables, webhook_url }: NotificationRequest = await req.json();

    if (!phone || !template_name) {
      return new Response(
        JSON.stringify({ error: "Missing phone or template_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending WhatsApp notification to ${phone} using template ${template_name}`);

    // Fetch template from database
    const { data: templateData, error: templateError } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("name", template_name)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError) {
      console.error("Error fetching template:", templateError);
      throw templateError;
    }

    if (!templateData) {
      return new Response(
        JSON.stringify({ error: `Template '${template_name}' not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables in template
    const message = replaceVariables(templateData.template, variables || {});

    console.log(`Message to send: ${message}`);

    // Get webhook URL from webhook_settings if not provided
    let targetWebhookUrl = webhook_url;
    
    if (!targetWebhookUrl) {
      const { data: webhooks } = await supabase
        .from("webhook_settings")
        .select("url")
        .eq("is_active", true)
        .contains("events", ["whatsapp"])
        .limit(1);

      if (webhooks && webhooks.length > 0) {
        targetWebhookUrl = webhooks[0].url;
      }
    }

    if (!targetWebhookUrl) {
      console.log("No webhook URL configured for WhatsApp");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No WhatsApp webhook URL configured",
          message_preview: message 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to n8n webhook for WhatsApp delivery
    const webhookPayload = {
      event: "whatsapp_notification",
      timestamp: new Date().toISOString(),
      data: {
        phone: phone.startsWith("+") ? phone : `+${phone}`,
        message,
        template_name,
        variables
      }
    };

    console.log(`Sending to webhook: ${targetWebhookUrl}`);

    const webhookResponse = await fetch(targetWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log(`Webhook response status: ${webhookResponse.status}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent to WhatsApp webhook",
        webhook_status: webhookResponse.status
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("WhatsApp notification error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
