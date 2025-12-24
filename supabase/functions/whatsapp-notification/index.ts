import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  phone?: string;
  template_name: string;
  order_id?: string;
  special_order_id?: string;
  variables?: Record<string, string>;
  webhook_url?: string;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  // Remove any remaining unreplaced variables
  message = message.replace(/\{\{[^}]+\}\}/g, '');
  return message.trim();
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

  return order;
}

// Build variables from order data
function buildOrderVariables(order: any): Record<string, string> {
  const statusLabels: Record<string, string> = {
    'new': 'جديد',
    'accepted_by_merchant': 'تم قبوله من التاجر',
    'preparing': 'قيد التحضير',
    'ready': 'جاهز للتوصيل',
    'assigned_to_courier': 'تم تعيين مندوب',
    'picked_up': 'تم الاستلام',
    'on_the_way': 'في الطريق',
    'delivered': 'تم التوصيل',
    'cancelled': 'ملغي',
    'failed': 'فشل التوصيل'
  };

  return {
    order_number: order.order_number || '',
    order_status: statusLabels[order.status] || order.status || '',
    order_total: order.total?.toString() || '0',
    order_subtotal: order.subtotal?.toString() || '0',
    delivery_fee: order.delivery_fee?.toString() || '0',
    delivery_address: order.delivery_address || '',
    delivery_notes: order.delivery_notes || '',
    payment_method: order.payment_method === 'cash' ? 'نقداً عند التوصيل' : order.payment_method || '',
    customer_name: order.customer?.full_name || '',
    customer_phone: order.customer_phone || order.customer?.phone || '',
    store_name: order.stores?.name || '',
    store_phone: order.stores?.phone || '',
    store_address: order.stores?.address || '',
    courier_name: order.courier?.full_name || '',
    courier_phone: order.courier?.phone || '',
    created_at: order.created_at ? new Date(order.created_at).toLocaleString('ar-SA') : '',
    updated_at: order.updated_at ? new Date(order.updated_at).toLocaleString('ar-SA') : ''
  };
}

// Build variables from special order data
function buildSpecialOrderVariables(order: any): Record<string, string> {
  const statusLabels: Record<string, string> = {
    'pending': 'قيد الانتظار',
    'verified': 'تم التحقق',
    'assigned': 'تم تعيين مندوب',
    'picked_up': 'تم الاستلام',
    'on_the_way': 'في الطريق',
    'delivered': 'تم التوصيل',
    'cancelled': 'ملغي'
  };

  return {
    order_number: order.order_number || '',
    order_status: statusLabels[order.status] || order.status || '',
    order_total: order.total?.toString() || '0',
    delivery_fee: order.delivery_fee?.toString() || '0',
    service_name: order.special_services?.name_ar || order.special_services?.name || '',
    sender_name: order.sender_name || '',
    sender_phone: order.sender_phone || '',
    sender_address: order.sender_address || '',
    recipient_name: order.recipient_name || '',
    recipient_phone: order.recipient_phone || '',
    recipient_address: order.recipient_address || '',
    package_type: order.package_type || '',
    package_size: order.package_size || '',
    package_description: order.package_description || '',
    distance_km: order.distance_km?.toString() || '',
    notes: order.notes || '',
    verification_code: order.verification_code || '',
    payment_method: order.payment_method === 'cash' ? 'نقداً عند التوصيل' : order.payment_method || '',
    created_at: order.created_at ? new Date(order.created_at).toLocaleString('ar-SA') : ''
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

    const { 
      phone, 
      template_name, 
      order_id, 
      special_order_id, 
      variables: customVariables, 
      webhook_url 
    }: NotificationRequest = await req.json();

    if (!template_name) {
      return new Response(
        JSON.stringify({ error: "Missing template_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing WhatsApp notification with template ${template_name}`);

    // Determine target phone and build variables based on order type
    let targetPhone = phone;
    let variables: Record<string, string> = customVariables || {};

    // Fetch real order data if order_id is provided
    if (order_id) {
      const orderDetails = await getOrderDetails(supabase, order_id);
      if (orderDetails) {
        variables = { ...buildOrderVariables(orderDetails), ...customVariables };
        // Use customer phone from order if not provided
        if (!targetPhone) {
          targetPhone = orderDetails.customer_phone || orderDetails.customer?.phone;
        }
        console.log(`Loaded order data for ${orderDetails.order_number}`);
      }
    }

    // Fetch real special order data if special_order_id is provided
    if (special_order_id) {
      const specialOrderDetails = await getSpecialOrderDetails(supabase, special_order_id);
      if (specialOrderDetails) {
        variables = { ...buildSpecialOrderVariables(specialOrderDetails), ...customVariables };
        // Use sender or recipient phone from special order if not provided
        if (!targetPhone) {
          targetPhone = specialOrderDetails.sender_phone;
        }
        console.log(`Loaded special order data for ${specialOrderDetails.order_number}`);
      }
    }

    if (!targetPhone) {
      return new Response(
        JSON.stringify({ error: "No phone number provided or found in order data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        JSON.stringify({ error: `Template '${template_name}' not found or inactive` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables in template
    const message = replaceVariables(templateData.template, variables);

    console.log(`Message prepared for ${targetPhone}: ${message.substring(0, 100)}...`);

    // Get webhook URL from webhook_settings if not provided
    let targetWebhookUrl = webhook_url;
    
    if (!targetWebhookUrl) {
      const { data: webhooks } = await supabase
        .from("webhook_settings")
        .select("url, secret_token")
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
          message_preview: message,
          target_phone: targetPhone
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    const formattedPhone = targetPhone.startsWith("+") ? targetPhone : `+${targetPhone}`;

    // Send to n8n webhook for WhatsApp delivery
    const webhookPayload = {
      event: "whatsapp_notification",
      timestamp: new Date().toISOString(),
      data: {
        phone: formattedPhone,
        message,
        template_name,
        order_id: order_id || null,
        special_order_id: special_order_id || null,
        variables
      }
    };

    console.log(`Sending to webhook: ${targetWebhookUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const webhookResponse = await fetch(targetWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DeliveryPlatform-WhatsApp/1.0"
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`Webhook response status: ${webhookResponse.status}`);

      return new Response(
        JSON.stringify({ 
          success: webhookResponse.ok, 
          message: webhookResponse.ok ? "Notification sent to WhatsApp webhook" : "Webhook returned error",
          webhook_status: webhookResponse.status,
          target_phone: formattedPhone,
          message_preview: message.substring(0, 100)
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Webhook request timed out (15s)",
            target_phone: formattedPhone 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw fetchError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("WhatsApp notification error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
