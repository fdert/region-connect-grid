import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncomingMessage {
  // Darcoom webhook format
  from?: string;
  phone?: string;
  sender?: string;
  message?: string;
  text?: string;
  body?: string;
  content?: string;
  messageId?: string;
  message_id?: string;
  id?: string;
  timestamp?: string;
  time?: string;
  created_at?: string;
  // Additional fields
  type?: string;
  status?: string;
  event?: string;
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

    // Log the raw request for debugging
    const rawBody = await req.text();
    console.log("Incoming webhook body:", rawBody);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Parse the body
    let data: IncomingMessage;
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Try URL-encoded form data
      const params = new URLSearchParams(rawBody);
      data = Object.fromEntries(params.entries()) as unknown as IncomingMessage;
    }

    console.log("Parsed webhook data:", data);

    // Extract phone number (handle different field names)
    const phone = data.from || data.phone || data.sender || "";
    
    // Extract message content (handle different field names)
    const message = data.message || data.text || data.body || data.content || "";
    
    // Extract message ID (handle different field names)
    const externalMessageId = data.messageId || data.message_id || data.id || null;
    
    // Check if this is a status update or actual message
    const eventType = data.event || data.type || data.status;
    
    if (eventType && ['delivered', 'read', 'sent', 'failed'].includes(eventType.toLowerCase())) {
      // This is a status update, update existing message
      console.log(`Status update received: ${eventType} for message ${externalMessageId}`);
      
      if (externalMessageId) {
        const { error } = await supabase
          .from("whatsapp_messages")
          .update({ 
            status: eventType.toLowerCase(),
            updated_at: new Date().toISOString()
          })
          .eq("external_message_id", externalMessageId);
        
        if (error) {
          console.error("Error updating message status:", error);
        } else {
          console.log("Message status updated successfully");
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, type: "status_update", status: eventType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // This is an incoming message
    if (!phone || !message) {
      console.log("Missing phone or message in webhook data");
      return new Response(
        JSON.stringify({ success: false, error: "Missing phone or message" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for lookup
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('966') && cleanPhone.length > 9) {
      cleanPhone = cleanPhone.substring(3);
    }
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    console.log(`Incoming message from ${phone} (cleaned: ${cleanPhone}): ${message}`);

    // Find the most recent outgoing message to this phone to link as reply
    const { data: lastOutgoing } = await supabase
      .from("whatsapp_messages")
      .select("id, order_id, special_order_id")
      .eq("direction", "outgoing")
      .or(`phone.ilike.%${cleanPhone}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Save incoming message
    const { data: savedMessage, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        direction: "incoming",
        phone: phone,
        message: message,
        status: "received",
        external_message_id: externalMessageId,
        reply_to_message_id: lastOutgoing?.id || null,
        order_id: lastOutgoing?.order_id || null,
        special_order_id: lastOutgoing?.special_order_id || null,
        metadata: {
          raw_data: data,
          received_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving incoming message:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Incoming message saved:", savedMessage?.id);

    // Check for auto-reply settings
    const { data: autoReplySettings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "whatsapp_auto_reply_settings")
      .maybeSingle();

    if (autoReplySettings?.value) {
      const settings = typeof autoReplySettings.value === 'string' 
        ? JSON.parse(autoReplySettings.value) 
        : autoReplySettings.value;
      
      if (settings.is_enabled && settings.auto_reply_message) {
        console.log("Auto-reply enabled, sending response...");
        
        // Send auto-reply using the notification function
        try {
          const { error: replyError } = await supabase.functions.invoke("whatsapp-notification", {
            body: {
              phone: phone,
              template_name: "auto_reply",
              variables: {
                message: settings.auto_reply_message
              }
            }
          });
          
          if (replyError) {
            console.error("Error sending auto-reply:", replyError);
          } else {
            console.log("Auto-reply sent successfully");
          }
        } catch (e) {
          console.error("Exception sending auto-reply:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        type: "incoming_message",
        message_id: savedMessage?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
