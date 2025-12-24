import { supabase } from "@/integrations/supabase/client";

// Trigger webhook for order events
export async function triggerOrderWebhook(
  event: string,
  orderId: string,
  additionalData?: Record<string, any>
) {
  try {
    const { data, error } = await supabase.functions.invoke("send-webhook", {
      body: {
        event,
        order_id: orderId,
        data: additionalData
      }
    });

    if (error) {
      console.error("Error triggering order webhook:", error);
      return { success: false, error: error.message };
    }

    console.log(`Webhook triggered for ${event}:`, data);
    return { success: true, data };
  } catch (err: any) {
    console.error("Failed to trigger webhook:", err);
    return { success: false, error: err.message };
  }
}

// Trigger webhook for special order events
export async function triggerSpecialOrderWebhook(
  event: string,
  specialOrderId: string,
  additionalData?: Record<string, any>
) {
  try {
    const { data, error } = await supabase.functions.invoke("send-webhook", {
      body: {
        event,
        special_order_id: specialOrderId,
        data: additionalData
      }
    });

    if (error) {
      console.error("Error triggering special order webhook:", error);
      return { success: false, error: error.message };
    }

    console.log(`Webhook triggered for ${event}:`, data);
    return { success: true, data };
  } catch (err: any) {
    console.error("Failed to trigger webhook:", err);
    return { success: false, error: err.message };
  }
}

// Send WhatsApp notification for order
export async function sendOrderWhatsAppNotification(
  templateName: string,
  orderId: string,
  phone?: string,
  additionalVariables?: Record<string, string>
) {
  try {
    const { data, error } = await supabase.functions.invoke("whatsapp-notification", {
      body: {
        template_name: templateName,
        order_id: orderId,
        phone,
        variables: additionalVariables
      }
    });

    if (error) {
      console.error("Error sending WhatsApp notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`WhatsApp notification sent for order:`, data);
    return { success: true, data };
  } catch (err: any) {
    console.error("Failed to send WhatsApp notification:", err);
    return { success: false, error: err.message };
  }
}

// Send WhatsApp notification for special order
export async function sendSpecialOrderWhatsAppNotification(
  templateName: string,
  specialOrderId: string,
  phone?: string,
  additionalVariables?: Record<string, string>
) {
  try {
    const { data, error } = await supabase.functions.invoke("whatsapp-notification", {
      body: {
        template_name: templateName,
        special_order_id: specialOrderId,
        phone,
        variables: additionalVariables
      }
    });

    if (error) {
      console.error("Error sending WhatsApp notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`WhatsApp notification sent for special order:`, data);
    return { success: true, data };
  } catch (err: any) {
    console.error("Failed to send WhatsApp notification:", err);
    return { success: false, error: err.message };
  }
}

// Convenience function to trigger both webhook and WhatsApp for order status change
export async function notifyOrderStatusChange(
  orderId: string,
  newStatus: string,
  oldStatus?: string
) {
  const event = `order.status_changed`;
  
  // Map status to template name - matches templates in whatsapp_templates table
  const statusTemplateMap: Record<string, string> = {
    'new': 'new_order',
    'accepted_by_merchant': 'order_accepted_by_merchant',
    'preparing': 'order_preparing',
    'ready': 'order_ready',
    'assigned_to_courier': 'courier_assigned',
    'picked_up': 'order_picked_up',
    'on_the_way': 'order_on_the_way',
    'delivered': 'order_delivered',
    'cancelled': 'order_cancelled'
  };

  // Trigger webhook
  await triggerOrderWebhook(event, orderId, { 
    new_status: newStatus, 
    old_status: oldStatus 
  });

  // Send WhatsApp if template exists for this status
  const templateName = statusTemplateMap[newStatus];
  if (templateName) {
    await sendOrderWhatsAppNotification(templateName, orderId);
  }
}

// Convenience function for special order status change
export async function notifySpecialOrderStatusChange(
  specialOrderId: string,
  newStatus: string,
  oldStatus?: string
) {
  const event = `special_order.status_changed`;
  
  // Map status to template name for special orders
  const specialStatusTemplateMap: Record<string, string> = {
    'pending': 'verification_code',
    'verified': 'special_order_verified',
    'accepted': 'special_order_accepted',
    'assigned': 'courier_assigned',
    'picked_up': 'special_order_picked_up',
    'on_the_way': 'special_order_on_the_way',
    'delivered': 'special_order_delivered',
    'cancelled': 'special_order_cancelled'
  };

  // Trigger webhook
  await triggerSpecialOrderWebhook(event, specialOrderId, { 
    new_status: newStatus, 
    old_status: oldStatus 
  });

  // Send WhatsApp if template exists for this status
  const templateName = specialStatusTemplateMap[newStatus];
  if (templateName) {
    await sendSpecialOrderWhatsAppNotification(templateName, specialOrderId);
  }
}

// Convenience function for new order notification
export async function notifyNewOrder(orderId: string) {
  await triggerOrderWebhook('order.created', orderId);
  await sendOrderWhatsAppNotification('new_order', orderId);
}

// Convenience function for order delivered notification
export async function notifyOrderDelivered(orderId: string) {
  await triggerOrderWebhook('order.delivered', orderId);
  await sendOrderWhatsAppNotification('order_delivered', orderId);
}

// Convenience function for courier assigned notification
export async function notifyCourierAssigned(orderId: string, courierName?: string) {
  await triggerOrderWebhook('courier.assigned', orderId, { courier_name: courierName });
  await sendOrderWhatsAppNotification('courier_assigned', orderId, undefined, { courier_name: courierName || '' });
}

// Convenience function for new special order notification
export async function notifyNewSpecialOrder(specialOrderId: string) {
  await triggerSpecialOrderWebhook('special_order.created', specialOrderId);
  await sendSpecialOrderWhatsAppNotification('new_special_order', specialOrderId);
}
