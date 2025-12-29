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
  recipient_type?: 'customer' | 'merchant' | 'courier' | 'all';
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

// Format phone number to international format
function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '966' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('966') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }
  return '+' + cleaned;
}

// Send WhatsApp message using the same API as OTP
async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const appKey = Deno.env.get("WHATSAPP_APP_KEY");
  const authKey = Deno.env.get("WHATSAPP_AUTH_KEY");

  if (!appKey || !authKey) {
    console.error("WhatsApp API credentials not configured");
    return { success: false, error: "WhatsApp API credentials not configured" };
  }

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`Sending WhatsApp message to: ${formattedPhone}`);

  try {
    const formData = new FormData();
    formData.append("appkey", appKey);
    formData.append("authkey", authKey);
    formData.append("to", formattedPhone);
    formData.append("message", message);

    const response = await fetch("https://darcoom.com/wsender/public/api/create-message", {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();
    console.log(`WhatsApp API response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      return { success: false, error: `API returned ${response.status}: ${responseText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: error.message };
  }
}

// Helper function to get order details with related data
async function getOrderDetails(supabase: any, orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      stores:store_id (id, name, phone, address, merchant_id)
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

  // Get merchant profile
  let merchantProfile = null;
  if (order.stores?.merchant_id) {
    const { data: merchant } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", order.stores.merchant_id)
      .maybeSingle();
    merchantProfile = merchant;
  }

  return {
    ...order,
    customer: customerProfile,
    courier: courierProfile,
    merchant: merchantProfile
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
    courier: courierProfile
  };
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

  const statusLabelsEn: Record<string, string> = {
    'new': 'New',
    'accepted_by_merchant': 'Accepted',
    'preparing': 'Preparing',
    'ready': 'Ready',
    'assigned_to_courier': 'Courier Assigned',
    'picked_up': 'Picked Up',
    'on_the_way': 'On The Way',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'failed': 'Failed'
  };

  const paymentMethodLabels: Record<string, string> = {
    'cash': 'نقداً عند التوصيل',
    'card': 'بطاقة',
    'wallet': 'المحفظة',
    'online': 'دفع إلكتروني'
  };

  const paymentMethodLabelsEn: Record<string, string> = {
    'cash': 'Cash on Delivery',
    'card': 'Card',
    'wallet': 'Wallet',
    'online': 'Online Payment'
  };

  // Parse items to get count and list
  let itemsCount = 0;
  let itemsList = '';
  let itemsListEn = '';
  try {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    if (Array.isArray(items)) {
      itemsCount = items.length;
      itemsList = items.map((item: any) => `• ${item.name || item.product_name} x${item.quantity || 1} - ${item.price || 0} ر.س`).join('\n');
      itemsListEn = items.map((item: any) => `• ${item.name || item.product_name} x${item.quantity || 1} - ${item.price || 0} SAR`).join('\n');
    }
  } catch (e) {
    console.error("Error parsing items:", e);
  }

  // Payment status
  const isPaid = order.paid === true;
  const paymentStatus = isPaid ? '✅ مدفوع' : '❌ غير مدفوع';
  const paymentStatusEn = isPaid ? '✅ Paid' : '❌ Not Paid';

  // Format currency values
  const formatCurrency = (val: number) => val?.toFixed(2) || '0.00';

  return {
    // Basic order info
    order_number: order.order_number || '',
    order_status: statusLabels[order.status] || order.status || '',
    order_status_en: statusLabelsEn[order.status] || order.status || '',
    
    // Amounts
    order_total: formatCurrency(order.total),
    order_subtotal: formatCurrency(order.subtotal),
    delivery_fee: formatCurrency(order.delivery_fee),
    platform_commission: formatCurrency(order.platform_commission),
    
    // Payment info
    payment_method: paymentMethodLabels[order.payment_method] || order.payment_method || '',
    payment_method_en: paymentMethodLabelsEn[order.payment_method] || order.payment_method || '',
    payment_status: paymentStatus,
    payment_status_en: paymentStatusEn,
    is_paid: isPaid ? 'نعم' : 'لا',
    is_paid_en: isPaid ? 'Yes' : 'No',
    
    // Delivery info
    delivery_address: order.delivery_address || '',
    delivery_notes: order.delivery_notes || '',
    
    // Customer info
    customer_name: order.customer?.full_name || '',
    customer_phone: order.customer_phone || order.customer?.phone || '',
    
    // Store info
    store_name: order.stores?.name || '',
    store_phone: order.stores?.phone || '',
    store_address: order.stores?.address || '',
    
    // Merchant info
    merchant_name: order.merchant?.full_name || '',
    merchant_phone: order.merchant?.phone || '',
    
    // Courier info
    courier_name: order.courier?.full_name || '',
    courier_phone: order.courier?.phone || '',
    
    // Items
    items_count: itemsCount.toString(),
    items_list: itemsList,
    items_list_en: itemsListEn,
    
    // Order summary (formatted block)
    order_summary: `📦 رقم الطلب: ${order.order_number}\n💰 المبلغ: ${formatCurrency(order.subtotal)} ر.س\n🚚 رسوم التوصيل: ${formatCurrency(order.delivery_fee)} ر.س\n💵 الإجمالي: ${formatCurrency(order.total)} ر.س\n${paymentStatus} | ${paymentMethodLabels[order.payment_method] || order.payment_method || ''}`,
    order_summary_en: `📦 Order #: ${order.order_number}\n💰 Subtotal: ${formatCurrency(order.subtotal)} SAR\n🚚 Delivery: ${formatCurrency(order.delivery_fee)} SAR\n💵 Total: ${formatCurrency(order.total)} SAR\n${paymentStatusEn} | ${paymentMethodLabelsEn[order.payment_method] || order.payment_method || ''}`,
    
    // Dates
    order_date: order.created_at ? new Date(order.created_at).toLocaleString('ar-SA') : '',
    order_date_en: order.created_at ? new Date(order.created_at).toLocaleString('en-US') : '',
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

  const statusLabelsEn: Record<string, string> = {
    'pending': 'Pending',
    'verified': 'Verified',
    'assigned': 'Courier Assigned',
    'picked_up': 'Picked Up',
    'on_the_way': 'On The Way',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };

  const paymentMethodLabels: Record<string, string> = {
    'cash': 'نقداً عند التوصيل',
    'card': 'بطاقة',
    'wallet': 'المحفظة',
    'online': 'دفع إلكتروني'
  };

  const paymentMethodLabelsEn: Record<string, string> = {
    'cash': 'Cash on Delivery',
    'card': 'Card',
    'wallet': 'Wallet',
    'online': 'Online Payment'
  };

  // Payment status
  const isPaid = order.paid === true;
  const paymentStatus = isPaid ? '✅ مدفوع' : '❌ غير مدفوع';
  const paymentStatusEn = isPaid ? '✅ Paid' : '❌ Not Paid';

  // Format currency
  const formatCurrency = (val: number) => val?.toFixed(2) || '0.00';

  return {
    // Basic order info
    order_number: order.order_number || '',
    order_status: statusLabels[order.status] || order.status || '',
    order_status_en: statusLabelsEn[order.status] || order.status || '',
    
    // Amounts
    order_total: formatCurrency(order.total),
    delivery_fee: formatCurrency(order.delivery_fee),
    distance_km: order.distance_km?.toFixed(1) || '',
    
    // Payment info
    payment_method: paymentMethodLabels[order.payment_method] || order.payment_method || '',
    payment_method_en: paymentMethodLabelsEn[order.payment_method] || order.payment_method || '',
    payment_status: paymentStatus,
    payment_status_en: paymentStatusEn,
    is_paid: isPaid ? 'نعم' : 'لا',
    is_paid_en: isPaid ? 'Yes' : 'No',
    
    // Service info
    service_name: order.special_services?.name_ar || order.special_services?.name || '',
    service_name_en: order.special_services?.name || '',
    
    // Sender info
    sender_name: order.sender_name || '',
    sender_phone: order.sender_phone || '',
    sender_address: order.sender_address || '',
    
    // Recipient info
    recipient_name: order.recipient_name || '',
    recipient_phone: order.recipient_phone || '',
    recipient_address: order.recipient_address || '',
    
    // Package info
    package_type: order.package_type || '',
    package_size: order.package_size || '',
    package_description: order.package_description || '',
    package_weight: order.package_weight?.toString() || '',
    notes: order.notes || '',
    
    // Verification
    verification_code: order.verification_code || '',
    is_verified: order.is_verified ? 'نعم' : 'لا',
    is_verified_en: order.is_verified ? 'Yes' : 'No',
    
    // Courier info
    courier_name: order.courier?.full_name || '',
    courier_phone: order.courier?.phone || '',
    
    // Order summary (formatted block)
    order_summary: `📦 رقم الطلب: ${order.order_number}\n🚚 رسوم التوصيل: ${formatCurrency(order.delivery_fee)} ر.س\n💵 الإجمالي: ${formatCurrency(order.total)} ر.س\n📍 المسافة: ${order.distance_km?.toFixed(1) || '-'} كم\n${paymentStatus} | ${paymentMethodLabels[order.payment_method] || order.payment_method || ''}`,
    order_summary_en: `📦 Order #: ${order.order_number}\n🚚 Delivery: ${formatCurrency(order.delivery_fee)} SAR\n💵 Total: ${formatCurrency(order.total)} SAR\n📍 Distance: ${order.distance_km?.toFixed(1) || '-'} km\n${paymentStatusEn} | ${paymentMethodLabelsEn[order.payment_method] || order.payment_method || ''}`,
    
    // Dates
    created_at: order.created_at ? new Date(order.created_at).toLocaleString('ar-SA') : '',
    created_at_en: order.created_at ? new Date(order.created_at).toLocaleString('en-US') : ''
  };
}

// Get recipient phones based on recipient_type
function getRecipientPhones(
  order: any, 
  recipientType: string, 
  isSpecialOrder: boolean
): string[] {
  const phones: string[] = [];

  if (isSpecialOrder) {
    // Special order recipients
    switch (recipientType) {
      case 'customer':
        if (order.sender_phone) phones.push(order.sender_phone);
        break;
      case 'recipient':
        if (order.recipient_phone) phones.push(order.recipient_phone);
        break;
      case 'courier':
        if (order.courier?.phone) phones.push(order.courier.phone);
        break;
      case 'all':
        if (order.sender_phone) phones.push(order.sender_phone);
        if (order.recipient_phone) phones.push(order.recipient_phone);
        if (order.courier?.phone) phones.push(order.courier.phone);
        break;
      default:
        if (order.sender_phone) phones.push(order.sender_phone);
    }
  } else {
    // Regular order recipients
    switch (recipientType) {
      case 'customer':
        const customerPhone = order.customer_phone || order.customer?.phone;
        if (customerPhone) phones.push(customerPhone);
        break;
      case 'merchant':
        if (order.stores?.phone) phones.push(order.stores.phone);
        if (order.merchant?.phone) phones.push(order.merchant.phone);
        break;
      case 'courier':
        if (order.courier?.phone) phones.push(order.courier.phone);
        break;
      case 'all':
        const custPhone = order.customer_phone || order.customer?.phone;
        if (custPhone) phones.push(custPhone);
        if (order.stores?.phone) phones.push(order.stores.phone);
        if (order.courier?.phone) phones.push(order.courier.phone);
        break;
      default:
        const defaultPhone = order.customer_phone || order.customer?.phone;
        if (defaultPhone) phones.push(defaultPhone);
    }
  }

  // Remove duplicates and empty values
  return [...new Set(phones.filter(p => p && p.trim()))];
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
      recipient_type = 'customer'
    }: NotificationRequest = await req.json();

    if (!template_name) {
      return new Response(
        JSON.stringify({ error: "Missing template_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing WhatsApp notification: template=${template_name}, recipient_type=${recipient_type}`);

    // Determine target phones and build variables based on order type
    let targetPhones: string[] = phone ? [phone] : [];
    let variables: Record<string, string> = customVariables || {};
    let isSpecialOrder = false;

    // Fetch real order data if order_id is provided
    if (order_id) {
      const orderDetails = await getOrderDetails(supabase, order_id);
      if (orderDetails) {
        variables = { ...buildOrderVariables(orderDetails), ...customVariables };
        if (targetPhones.length === 0) {
          targetPhones = getRecipientPhones(orderDetails, recipient_type, false);
        }
        console.log(`Loaded order data for ${orderDetails.order_number}, recipients: ${targetPhones.join(', ')}`);
      }
    }

    // Fetch real special order data if special_order_id is provided
    if (special_order_id) {
      isSpecialOrder = true;
      const specialOrderDetails = await getSpecialOrderDetails(supabase, special_order_id);
      if (specialOrderDetails) {
        variables = { ...buildSpecialOrderVariables(specialOrderDetails), ...customVariables };
        if (targetPhones.length === 0) {
          targetPhones = getRecipientPhones(specialOrderDetails, recipient_type, true);
        }
        console.log(`Loaded special order data for ${specialOrderDetails.order_number}, recipients: ${targetPhones.join(', ')}`);
      }
    }

    if (targetPhones.length === 0) {
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
      console.log(`Template '${template_name}' not found or inactive`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Template '${template_name}' not found or inactive`,
          template_name 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables in template
    const message = replaceVariables(templateData.template, variables);

    console.log(`Message prepared: ${message.substring(0, 100)}...`);

    // Send to all recipient phones
    const results: { phone: string; success: boolean; error?: string }[] = [];
    
    for (const targetPhone of targetPhones) {
      const result = await sendWhatsAppMessage(targetPhone, message);
      results.push({ phone: targetPhone, ...result });
      
      // Small delay between messages to avoid rate limiting
      if (targetPhones.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    console.log(`Notification sent: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: allSuccess,
        message: `Sent to ${successCount}/${results.length} recipients`,
        results,
        message_preview: message.substring(0, 100)
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
