import { supabase } from "@/integrations/supabase/client";

// Status labels for orders
const orderStatusLabels: Record<string, string> = {
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

// Status labels for special orders
const specialOrderStatusLabels: Record<string, string> = {
  'pending': 'قيد الانتظار',
  'verified': 'تم التحقق',
  'assigned': 'تم تعيين مندوب',
  'picked_up': 'تم الاستلام',
  'on_the_way': 'في الطريق',
  'delivered': 'تم التوصيل',
  'cancelled': 'ملغي'
};

// Template names for different events - matching database template names
export const NOTIFICATION_TEMPLATES = {
  // Order templates - Customer (matching database names)
  ORDER_CREATED_CUSTOMER: 'new_order',
  ORDER_ACCEPTED_CUSTOMER: 'order_accepted_by_merchant',
  ORDER_PREPARING_CUSTOMER: 'order_preparing',
  ORDER_READY_CUSTOMER: 'order_ready',
  ORDER_COURIER_ASSIGNED_CUSTOMER: 'courier_assigned',
  ORDER_PICKED_UP_CUSTOMER: 'order_picked_up',
  ORDER_ON_WAY_CUSTOMER: 'order_on_the_way',
  ORDER_DELIVERED_CUSTOMER: 'order_delivered',
  ORDER_CANCELLED_CUSTOMER: 'order_cancelled',
  
  // Order templates - Merchant
  ORDER_NEW_MERCHANT: 'new_order_merchant',
  ORDER_COURIER_ASSIGNED_MERCHANT: 'courier_assigned_merchant',
  ORDER_PICKED_UP_MERCHANT: 'order_picked_up_merchant',
  ORDER_DELIVERED_MERCHANT: 'order_delivered_merchant',
  
  // Order templates - Courier
  ORDER_ASSIGNED_COURIER: 'order_assigned_courier',
  ORDER_READY_COURIER: 'order_ready_courier',
  
  // Special order templates
  SPECIAL_ORDER_CREATED: 'new_special_order',
  SPECIAL_ORDER_VERIFIED: 'special_order_verified',
  SPECIAL_ORDER_COURIER_ASSIGNED: 'special_order_courier_assigned',
  SPECIAL_ORDER_PICKED_UP: 'special_order_picked_up',
  SPECIAL_ORDER_ON_WAY: 'special_order_on_the_way',
  SPECIAL_ORDER_DELIVERED: 'special_order_delivered',
  SPECIAL_ORDER_CANCELLED: 'special_order_cancelled',
  
  // General status change
  ORDER_STATUS_CHANGED: 'order_status_changed',
  SPECIAL_ORDER_STATUS_CHANGED: 'special_order_status_changed',
};

// Trigger webhook for order events
export async function triggerOrderWebhook(
  event: string,
  orderId: string,
  additionalData?: Record<string, any>
): Promise<{ success: boolean; error?: string; data?: any }> {
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
): Promise<{ success: boolean; error?: string; data?: any }> {
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

// Send WhatsApp notification for regular orders
export async function sendOrderWhatsAppNotification(
  templateName: string,
  orderId: string,
  recipientType: 'customer' | 'merchant' | 'courier' | 'all' = 'customer',
  additionalVariables?: Record<string, string>
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    console.log(`Sending WhatsApp notification: template=${templateName}, order=${orderId}, recipient=${recipientType}`);
    
    const { data, error } = await supabase.functions.invoke('whatsapp-notification', {
      body: {
        template_name: templateName,
        order_id: orderId,
        recipient_type: recipientType,
        variables: additionalVariables
      }
    });

    if (error) {
      console.error('WhatsApp notification error:', error);
      return { success: false, error: error.message };
    }

    console.log('WhatsApp notification result:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('WhatsApp notification error:', error);
    return { success: false, error: error.message };
  }
}

// Send WhatsApp notification for special orders
export async function sendSpecialOrderWhatsAppNotification(
  templateName: string,
  specialOrderId: string,
  recipientType: 'customer' | 'recipient' | 'courier' | 'all' = 'customer',
  additionalVariables?: Record<string, string>
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    console.log(`Sending special order WhatsApp notification: template=${templateName}, order=${specialOrderId}, recipient=${recipientType}`);
    
    const { data, error } = await supabase.functions.invoke('whatsapp-notification', {
      body: {
        template_name: templateName,
        special_order_id: specialOrderId,
        recipient_type: recipientType,
        variables: additionalVariables
      }
    });

    if (error) {
      console.error('WhatsApp notification error:', error);
      return { success: false, error: error.message };
    }

    console.log('WhatsApp notification result:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('WhatsApp notification error:', error);
    return { success: false, error: error.message };
  }
}

// Notify all parties about order status change
export async function notifyOrderStatusChange(
  orderId: string,
  newStatus: string,
  oldStatus?: string
): Promise<void> {
  const additionalVariables = {
    old_status: oldStatus ? orderStatusLabels[oldStatus] || oldStatus : '',
    new_status: orderStatusLabels[newStatus] || newStatus,
    status_message: getStatusMessage(newStatus)
  };

  // Trigger webhook
  await triggerOrderWebhook('order.status_changed', orderId, { 
    new_status: newStatus, 
    old_status: oldStatus 
  });

  // Determine which templates to use based on status
  switch (newStatus) {
    case 'new':
      // Notify merchant about new order
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_NEW_MERCHANT, orderId, 'merchant');
      // Notify customer about order creation
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_CREATED_CUSTOMER, orderId, 'customer');
      break;
      
    case 'accepted_by_merchant':
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_ACCEPTED_CUSTOMER, orderId, 'customer', additionalVariables);
      break;
      
    case 'preparing':
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_PREPARING_CUSTOMER, orderId, 'customer', additionalVariables);
      break;
      
    case 'ready':
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_READY_CUSTOMER, orderId, 'customer', additionalVariables);
      break;
      
    case 'assigned_to_courier':
      // Notify customer
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_COURIER_ASSIGNED_CUSTOMER, orderId, 'customer', additionalVariables);
      // Notify merchant
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_COURIER_ASSIGNED_MERCHANT, orderId, 'merchant');
      // Notify courier
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_ASSIGNED_COURIER, orderId, 'courier');
      break;
      
    case 'picked_up':
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_PICKED_UP_CUSTOMER, orderId, 'customer', additionalVariables);
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_PICKED_UP_MERCHANT, orderId, 'merchant');
      break;
      
    case 'on_the_way':
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_ON_WAY_CUSTOMER, orderId, 'customer', additionalVariables);
      break;
      
    case 'delivered':
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_DELIVERED_CUSTOMER, orderId, 'customer', additionalVariables);
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_DELIVERED_MERCHANT, orderId, 'merchant');
      break;
      
    case 'cancelled':
    case 'failed':
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_CANCELLED_CUSTOMER, orderId, 'customer', additionalVariables);
      break;
      
    default:
      // Generic status change notification
      await sendOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGED, orderId, 'customer', additionalVariables);
  }
}

// Notify about special order status change
export async function notifySpecialOrderStatusChange(
  specialOrderId: string,
  newStatus: string,
  oldStatus?: string
): Promise<void> {
  const additionalVariables = {
    old_status: oldStatus ? specialOrderStatusLabels[oldStatus] || oldStatus : '',
    new_status: specialOrderStatusLabels[newStatus] || newStatus,
    status_message: getSpecialOrderStatusMessage(newStatus)
  };

  // Trigger webhook
  await triggerSpecialOrderWebhook('special_order.status_changed', specialOrderId, { 
    new_status: newStatus, 
    old_status: oldStatus 
  });

  switch (newStatus) {
    case 'pending':
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_CREATED, specialOrderId, 'customer');
      break;
      
    case 'verified':
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_VERIFIED, specialOrderId, 'customer', additionalVariables);
      break;
      
    case 'assigned':
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_COURIER_ASSIGNED, specialOrderId, 'customer', additionalVariables);
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_COURIER_ASSIGNED, specialOrderId, 'courier');
      break;
      
    case 'picked_up':
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_PICKED_UP, specialOrderId, 'customer', additionalVariables);
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_PICKED_UP, specialOrderId, 'recipient');
      break;
      
    case 'on_the_way':
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_ON_WAY, specialOrderId, 'customer', additionalVariables);
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_ON_WAY, specialOrderId, 'recipient');
      break;
      
    case 'delivered':
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_DELIVERED, specialOrderId, 'customer', additionalVariables);
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_DELIVERED, specialOrderId, 'recipient');
      break;
      
    case 'cancelled':
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_CANCELLED, specialOrderId, 'customer', additionalVariables);
      break;
      
    default:
      await sendSpecialOrderWhatsAppNotification(NOTIFICATION_TEMPLATES.SPECIAL_ORDER_STATUS_CHANGED, specialOrderId, 'customer', additionalVariables);
  }
}

// Get human-readable status message
function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'new': 'تم استلام طلبك بنجاح وسيتم مراجعته قريباً',
    'accepted_by_merchant': 'تم قبول طلبك من قبل المتجر',
    'preparing': 'جاري تحضير طلبك الآن',
    'ready': 'طلبك جاهز وفي انتظار المندوب',
    'assigned_to_courier': 'تم تعيين مندوب لتوصيل طلبك',
    'picked_up': 'المندوب استلم طلبك من المتجر',
    'on_the_way': 'طلبك في الطريق إليك',
    'delivered': 'تم توصيل طلبك بنجاح',
    'cancelled': 'تم إلغاء الطلب',
    'failed': 'فشل توصيل الطلب'
  };
  return messages[status] || 'تم تحديث حالة طلبك';
}

// Get human-readable special order status message
function getSpecialOrderStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'pending': 'تم استلام طلب التوصيل الخاص بك',
    'verified': 'تم التحقق من طلبك بنجاح',
    'assigned': 'تم تعيين مندوب لاستلام شحنتك',
    'picked_up': 'تم استلام شحنتك من المرسل',
    'on_the_way': 'شحنتك في الطريق للمستلم',
    'delivered': 'تم توصيل شحنتك بنجاح',
    'cancelled': 'تم إلغاء طلب التوصيل'
  };
  return messages[status] || 'تم تحديث حالة طلبك';
}

// Convenience functions
export async function notifyNewOrder(orderId: string): Promise<void> {
  await notifyOrderStatusChange(orderId, 'new');
}

export async function notifyOrderDelivered(orderId: string): Promise<void> {
  await notifyOrderStatusChange(orderId, 'delivered');
}

export async function notifyCourierAssigned(orderId: string): Promise<void> {
  await notifyOrderStatusChange(orderId, 'assigned_to_courier');
}

export async function notifyNewSpecialOrder(specialOrderId: string): Promise<void> {
  await notifySpecialOrderStatusChange(specialOrderId, 'pending');
}
