import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, MessageSquare, Copy, Info, Variable } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WhatsAppTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  is_active: boolean;
}

// Template types based on webhook events
const templateTypes = [
  // Customer notifications
  { 
    value: "order_created", 
    label: "طلب جديد - للعميل", 
    event: "order.created",
    description: "يُرسل للعميل عند إنشاء طلب جديد",
    category: "customer"
  },
  { 
    value: "order_accepted_customer", 
    label: "تم قبول الطلب - للعميل", 
    event: "order.accepted",
    description: "يُرسل للعميل عند قبول الطلب من التاجر",
    category: "customer"
  },
  { 
    value: "order_preparing_customer", 
    label: "جاري التحضير - للعميل", 
    event: "order.preparing",
    description: "يُرسل للعميل عند بدء تحضير الطلب",
    category: "customer"
  },
  { 
    value: "order_ready_customer", 
    label: "الطلب جاهز - للعميل", 
    event: "order.ready",
    description: "يُرسل للعميل عندما يكون الطلب جاهزاً",
    category: "customer"
  },
  { 
    value: "courier_assigned", 
    label: "تعيين مندوب - للعميل", 
    event: "courier.assigned",
    description: "يُرسل للعميل عند تعيين مندوب للطلب",
    category: "customer"
  },
  { 
    value: "order_picked_up_customer", 
    label: "تم الاستلام - للعميل", 
    event: "order.picked_up",
    description: "يُرسل للعميل عندما يستلم المندوب الطلب",
    category: "customer"
  },
  { 
    value: "order_on_way_customer", 
    label: "في الطريق - للعميل", 
    event: "order.on_the_way",
    description: "يُرسل للعميل عندما يكون الطلب في الطريق",
    category: "customer"
  },
  { 
    value: "order_delivered", 
    label: "تم التوصيل - للعميل", 
    event: "order.delivered",
    description: "يُرسل للعميل عند اكتمال توصيل الطلب",
    category: "customer"
  },
  { 
    value: "order_cancelled_customer", 
    label: "تم الإلغاء - للعميل", 
    event: "order.cancelled",
    description: "يُرسل للعميل عند إلغاء الطلب",
    category: "customer"
  },
  
  // Merchant notifications
  { 
    value: "order_new_merchant", 
    label: "طلب جديد - للتاجر", 
    event: "order.new_merchant",
    description: "يُرسل للتاجر عند استلام طلب جديد",
    category: "merchant"
  },
  { 
    value: "order_courier_assigned_merchant", 
    label: "تعيين مندوب - للتاجر", 
    event: "courier.assigned_merchant",
    description: "يُرسل للتاجر عند تعيين مندوب للطلب",
    category: "merchant"
  },
  { 
    value: "order_picked_up_merchant", 
    label: "تم الاستلام - للتاجر", 
    event: "order.picked_up_merchant",
    description: "يُرسل للتاجر عندما يستلم المندوب الطلب",
    category: "merchant"
  },
  { 
    value: "order_delivered_merchant", 
    label: "تم التوصيل - للتاجر", 
    event: "order.delivered_merchant",
    description: "يُرسل للتاجر عند اكتمال توصيل الطلب",
    category: "merchant"
  },
  
  // Courier notifications
  { 
    value: "order_assigned_courier", 
    label: "طلب جديد - للمندوب", 
    event: "order.assigned_courier",
    description: "يُرسل للمندوب عند تعيينه لطلب",
    category: "courier"
  },
  { 
    value: "order_ready_courier", 
    label: "الطلب جاهز - للمندوب", 
    event: "order.ready_courier",
    description: "يُرسل للمندوب عندما يكون الطلب جاهزاً للاستلام",
    category: "courier"
  },
  
  // Special orders
  { 
    value: "special_order_created", 
    label: "طلب خاص جديد", 
    event: "special_order.created",
    description: "يُرسل عند إنشاء طلب توصيل خاص",
    category: "special"
  },
  { 
    value: "special_order_verified", 
    label: "تم التحقق - طلب خاص", 
    event: "special_order.verified",
    description: "يُرسل عند التحقق من الطلب الخاص",
    category: "special"
  },
  { 
    value: "special_order_courier_assigned", 
    label: "تعيين مندوب - طلب خاص", 
    event: "special_order.courier_assigned",
    description: "يُرسل عند تعيين مندوب للطلب الخاص",
    category: "special"
  },
  { 
    value: "special_order_picked_up", 
    label: "تم الاستلام - طلب خاص", 
    event: "special_order.picked_up",
    description: "يُرسل عند استلام الشحنة",
    category: "special"
  },
  { 
    value: "special_order_on_way", 
    label: "في الطريق - طلب خاص", 
    event: "special_order.on_way",
    description: "يُرسل عندما تكون الشحنة في الطريق",
    category: "special"
  },
  { 
    value: "special_order_delivered", 
    label: "تم التوصيل - طلب خاص", 
    event: "special_order.delivered",
    description: "يُرسل عند اكتمال توصيل الشحنة",
    category: "special"
  },
  { 
    value: "special_order_cancelled", 
    label: "تم الإلغاء - طلب خاص", 
    event: "special_order.cancelled",
    description: "يُرسل عند إلغاء الطلب الخاص",
    category: "special"
  },
  
  // General
  { 
    value: "order_status_changed", 
    label: "تغيير حالة الطلب", 
    event: "order.status_changed",
    description: "قالب عام لأي تغيير في حالة الطلب",
    category: "general"
  },
  { 
    value: "special_order_status_changed", 
    label: "تغيير حالة الطلب الخاص", 
    event: "special_order.status_changed",
    description: "قالب عام لأي تغيير في حالة الطلب الخاص",
    category: "general"
  },
  { 
    value: "support_ticket_created", 
    label: "تذكرة دعم جديدة", 
    event: "support.ticket_created",
    description: "يُرسل عند إنشاء تذكرة دعم",
    category: "support"
  },
  { 
    value: "support_ticket_updated", 
    label: "تحديث تذكرة دعم", 
    event: "support.ticket_updated",
    description: "يُرسل عند تحديث تذكرة الدعم",
    category: "support"
  },
  { 
    value: "welcome_message", 
    label: "رسالة ترحيب", 
    event: "user.registered",
    description: "يُرسل عند تسجيل مستخدم جديد",
    category: "general"
  },
  { 
    value: "custom", 
    label: "مخصص", 
    event: "custom",
    description: "قالب مخصص لأي استخدام",
    category: "general"
  },
];

// Available variables per template type - Comprehensive list
const variablesByType: Record<string, { name: string; description: string }[]> = {
  // Common order variables for all order-related templates
  order_created: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "customer_phone", description: "رقم هاتف العميل" },
    { name: "order_number", description: "رقم الطلب" },
    { name: "order_status", description: "حالة الطلب (عربي)" },
    { name: "order_status_en", description: "Order Status (English)" },
    { name: "order_total", description: "المبلغ الإجمالي" },
    { name: "order_subtotal", description: "المبلغ قبل التوصيل" },
    { name: "delivery_fee", description: "رسوم التوصيل" },
    { name: "delivery_address", description: "عنوان التوصيل" },
    { name: "delivery_notes", description: "ملاحظات التوصيل" },
    { name: "store_name", description: "اسم المتجر" },
    { name: "store_phone", description: "رقم المتجر" },
    { name: "store_address", description: "عنوان المتجر" },
    { name: "items_count", description: "عدد المنتجات" },
    { name: "items_list", description: "قائمة المنتجات (عربي)" },
    { name: "items_list_en", description: "Items List (English)" },
    { name: "payment_method", description: "طريقة الدفع (عربي)" },
    { name: "payment_method_en", description: "Payment Method (English)" },
    { name: "payment_status", description: "حالة الدفع (عربي)" },
    { name: "payment_status_en", description: "Payment Status (English)" },
    { name: "is_paid", description: "هل مدفوع (نعم/لا)" },
    { name: "is_paid_en", description: "Is Paid (Yes/No)" },
    { name: "order_summary", description: "ملخص الطلب الكامل (عربي)" },
    { name: "order_summary_en", description: "Full Order Summary (English)" },
    { name: "order_date", description: "تاريخ الطلب (عربي)" },
    { name: "order_date_en", description: "Order Date (English)" },
  ],
  // Merchant templates
  order_new_merchant: [
    { name: "merchant_name", description: "اسم التاجر" },
    { name: "merchant_phone", description: "رقم التاجر" },
    { name: "store_name", description: "اسم المتجر" },
    { name: "order_number", description: "رقم الطلب" },
    { name: "order_total", description: "المبلغ الإجمالي" },
    { name: "order_subtotal", description: "المبلغ قبل التوصيل" },
    { name: "delivery_fee", description: "رسوم التوصيل" },
    { name: "platform_commission", description: "عمولة المنصة" },
    { name: "items_count", description: "عدد المنتجات" },
    { name: "items_list", description: "قائمة المنتجات" },
    { name: "customer_name", description: "اسم العميل" },
    { name: "customer_phone", description: "رقم العميل" },
    { name: "delivery_address", description: "عنوان التوصيل" },
    { name: "payment_method", description: "طريقة الدفع" },
    { name: "payment_status", description: "حالة الدفع" },
    { name: "order_summary", description: "ملخص الطلب الكامل" },
  ],
  // Courier templates (bilingual)
  order_assigned_courier: [
    { name: "courier_name", description: "اسم المندوب / Courier Name" },
    { name: "courier_phone", description: "رقم المندوب / Courier Phone" },
    { name: "order_number", description: "رقم الطلب / Order Number" },
    { name: "order_status", description: "حالة الطلب (عربي)" },
    { name: "order_status_en", description: "Order Status (English)" },
    { name: "order_total", description: "المبلغ الإجمالي / Total Amount" },
    { name: "delivery_fee", description: "رسوم التوصيل / Delivery Fee" },
    { name: "store_name", description: "اسم المتجر / Store Name" },
    { name: "store_phone", description: "رقم المتجر / Store Phone" },
    { name: "store_address", description: "عنوان المتجر / Store Address" },
    { name: "customer_name", description: "اسم العميل / Customer Name" },
    { name: "customer_phone", description: "رقم العميل / Customer Phone" },
    { name: "delivery_address", description: "عنوان التوصيل / Delivery Address" },
    { name: "delivery_notes", description: "ملاحظات التوصيل / Delivery Notes" },
    { name: "payment_method", description: "طريقة الدفع (عربي)" },
    { name: "payment_method_en", description: "Payment Method (English)" },
    { name: "payment_status", description: "حالة الدفع (عربي)" },
    { name: "payment_status_en", description: "Payment Status (English)" },
    { name: "is_paid", description: "هل مدفوع (نعم/لا)" },
    { name: "is_paid_en", description: "Is Paid (Yes/No)" },
    { name: "items_count", description: "عدد المنتجات / Items Count" },
    { name: "items_list", description: "قائمة المنتجات (عربي)" },
    { name: "items_list_en", description: "Items List (English)" },
    { name: "order_summary", description: "ملخص الطلب (عربي)" },
    { name: "order_summary_en", description: "Order Summary (English)" },
  ],
  order_ready_courier: [
    { name: "courier_name", description: "اسم المندوب / Courier Name" },
    { name: "order_number", description: "رقم الطلب / Order Number" },
    { name: "store_name", description: "اسم المتجر / Store Name" },
    { name: "store_phone", description: "رقم المتجر / Store Phone" },
    { name: "store_address", description: "عنوان المتجر / Store Address" },
    { name: "order_total", description: "المبلغ الإجمالي / Total Amount" },
    { name: "payment_status", description: "حالة الدفع (عربي)" },
    { name: "payment_status_en", description: "Payment Status (English)" },
    { name: "order_summary", description: "ملخص الطلب (عربي)" },
    { name: "order_summary_en", description: "Order Summary (English)" },
  ],
  // Special order templates
  special_order_created: [
    { name: "order_number", description: "رقم الطلب" },
    { name: "order_status", description: "حالة الطلب (عربي)" },
    { name: "order_status_en", description: "Order Status (English)" },
    { name: "order_total", description: "المبلغ الإجمالي" },
    { name: "delivery_fee", description: "رسوم التوصيل" },
    { name: "distance_km", description: "المسافة (كم)" },
    { name: "service_name", description: "اسم الخدمة (عربي)" },
    { name: "service_name_en", description: "Service Name (English)" },
    { name: "sender_name", description: "اسم المرسل" },
    { name: "sender_phone", description: "رقم المرسل" },
    { name: "sender_address", description: "عنوان المرسل" },
    { name: "recipient_name", description: "اسم المستلم" },
    { name: "recipient_phone", description: "رقم المستلم" },
    { name: "recipient_address", description: "عنوان المستلم" },
    { name: "package_type", description: "نوع الشحنة" },
    { name: "package_size", description: "حجم الشحنة" },
    { name: "package_description", description: "وصف الشحنة" },
    { name: "payment_method", description: "طريقة الدفع (عربي)" },
    { name: "payment_method_en", description: "Payment Method (English)" },
    { name: "payment_status", description: "حالة الدفع (عربي)" },
    { name: "payment_status_en", description: "Payment Status (English)" },
    { name: "verification_code", description: "كود التحقق" },
    { name: "order_summary", description: "ملخص الطلب (عربي)" },
    { name: "order_summary_en", description: "Order Summary (English)" },
  ],
  // Special order courier (bilingual)
  special_order_courier_assigned: [
    { name: "courier_name", description: "اسم المندوب / Courier Name" },
    { name: "courier_phone", description: "رقم المندوب / Courier Phone" },
    { name: "order_number", description: "رقم الطلب / Order Number" },
    { name: "order_status", description: "حالة الطلب (عربي)" },
    { name: "order_status_en", description: "Order Status (English)" },
    { name: "order_total", description: "المبلغ الإجمالي / Total Amount" },
    { name: "delivery_fee", description: "رسوم التوصيل / Delivery Fee" },
    { name: "distance_km", description: "المسافة / Distance (km)" },
    { name: "service_name", description: "اسم الخدمة (عربي)" },
    { name: "service_name_en", description: "Service Name (English)" },
    { name: "sender_name", description: "اسم المرسل / Sender Name" },
    { name: "sender_phone", description: "رقم المرسل / Sender Phone" },
    { name: "sender_address", description: "عنوان المرسل / Sender Address" },
    { name: "recipient_name", description: "اسم المستلم / Recipient Name" },
    { name: "recipient_phone", description: "رقم المستلم / Recipient Phone" },
    { name: "recipient_address", description: "عنوان المستلم / Recipient Address" },
    { name: "package_type", description: "نوع الشحنة / Package Type" },
    { name: "package_size", description: "حجم الشحنة / Package Size" },
    { name: "package_description", description: "وصف الشحنة / Package Description" },
    { name: "payment_method", description: "طريقة الدفع (عربي)" },
    { name: "payment_method_en", description: "Payment Method (English)" },
    { name: "payment_status", description: "حالة الدفع (عربي)" },
    { name: "payment_status_en", description: "Payment Status (English)" },
    { name: "is_paid", description: "هل مدفوع (نعم/لا)" },
    { name: "is_paid_en", description: "Is Paid (Yes/No)" },
    { name: "order_summary", description: "ملخص الطلب (عربي)" },
    { name: "order_summary_en", description: "Order Summary (English)" },
  ],
  order_status_changed: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "order_number", description: "رقم الطلب" },
    { name: "order_status", description: "الحالة الجديدة (عربي)" },
    { name: "order_status_en", description: "New Status (English)" },
    { name: "order_total", description: "المبلغ الإجمالي" },
    { name: "delivery_fee", description: "رسوم التوصيل" },
    { name: "payment_status", description: "حالة الدفع" },
    { name: "store_name", description: "اسم المتجر" },
    { name: "courier_name", description: "اسم المندوب" },
    { name: "courier_phone", description: "رقم المندوب" },
    { name: "order_summary", description: "ملخص الطلب الكامل" },
  ],
  order_delivered: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "order_number", description: "رقم الطلب" },
    { name: "order_total", description: "المبلغ الإجمالي" },
    { name: "order_subtotal", description: "المبلغ قبل التوصيل" },
    { name: "delivery_fee", description: "رسوم التوصيل" },
    { name: "payment_method", description: "طريقة الدفع" },
    { name: "payment_status", description: "حالة الدفع" },
    { name: "store_name", description: "اسم المتجر" },
    { name: "courier_name", description: "اسم المندوب" },
    { name: "order_summary", description: "ملخص الطلب الكامل" },
  ],
  courier_assigned: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "order_number", description: "رقم الطلب" },
    { name: "courier_name", description: "اسم المندوب" },
    { name: "courier_phone", description: "رقم المندوب" },
    { name: "store_name", description: "اسم المتجر" },
    { name: "order_total", description: "المبلغ الإجمالي" },
    { name: "delivery_fee", description: "رسوم التوصيل" },
    { name: "payment_status", description: "حالة الدفع" },
  ],
  support_ticket_created: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "ticket_number", description: "رقم التذكرة" },
    { name: "ticket_subject", description: "موضوع التذكرة" },
    { name: "ticket_message", description: "نص الرسالة" },
    { name: "order_number", description: "رقم الطلب (إن وجد)" },
  ],
  support_ticket_updated: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "ticket_number", description: "رقم التذكرة" },
    { name: "ticket_status", description: "حالة التذكرة" },
    { name: "reply_message", description: "نص الرد" },
    { name: "admin_name", description: "اسم الموظف" },
  ],
  welcome_message: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "customer_phone", description: "رقم الهاتف" },
  ],
  custom: [
    { name: "customer_name", description: "اسم العميل" },
    { name: "customer_phone", description: "رقم الهاتف" },
    { name: "order_number", description: "رقم الطلب" },
    { name: "store_name", description: "اسم المتجر" },
    { name: "order_total", description: "المبلغ الإجمالي" },
    { name: "delivery_fee", description: "رسوم التوصيل" },
    { name: "payment_status", description: "حالة الدفع" },
    { name: "payment_method", description: "طريقة الدفع" },
    { name: "order_summary", description: "ملخص الطلب" },
    { name: "courier_name", description: "اسم المندوب" },
    { name: "courier_phone", description: "رقم المندوب" },
  ],
};

// Function to get variables - fallback to common order variables or custom
const getVariablesForType = (type: string) => {
  if (variablesByType[type]) {
    return variablesByType[type];
  }
  // For courier templates, return bilingual courier variables
  if (type.includes('courier')) {
    return variablesByType.order_assigned_courier;
  }
  // For special order templates
  if (type.includes('special')) {
    return variablesByType.special_order_created;
  }
  // Default to order_created variables for most order-related templates
  if (type.includes('order')) {
    return variablesByType.order_created;
  }
  return variablesByType.custom;
};

const WhatsAppTemplatesPage = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedType, setSelectedType] = useState<string>("order_created");
  const [formData, setFormData] = useState({
    name: "",
    template: "",
    variables: [] as string[],
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        template: formData.template,
        variables: formData.variables,
        is_active: formData.is_active
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("whatsapp_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast({ title: "تم تحديث القالب بنجاح" });
      } else {
        const { error } = await supabase
          .from("whatsapp_templates")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "تم إضافة القالب بنجاح" });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      if (error.code === "23505") {
        toast({ title: "اسم القالب موجود مسبقاً", variant: "destructive" });
      } else {
        toast({ title: "خطأ في حفظ القالب", variant: "destructive" });
      }
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setSelectedType("order_created");
    setFormData({ name: "order_created", template: "", variables: [], is_active: true });
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    // Try to find matching type
    const matchedType = templateTypes.find(t => t.value === template.name);
    setSelectedType(matchedType ? matchedType.value : "custom");
    setFormData({
      name: template.name,
      template: template.template,
      variables: template.variables || [],
      is_active: template.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    
    try {
      const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف القالب" });
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const copyTemplate = (template: string) => {
    navigator.clipboard.writeText(template);
    toast({ title: "تم نسخ القالب" });
  };

  const insertVariable = (varName: string) => {
    const variable = `{{${varName}}}`;
    setFormData(prev => ({
      ...prev,
      template: prev.template + variable,
      variables: prev.variables.includes(varName) ? prev.variables : [...prev.variables, varName]
    }));
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      name: type,
      variables: []
    }));
  };

  const getTemplateTypeLabel = (name: string) => {
    return templateTypes.find(t => t.value === name)?.label || name;
  };

  const availableVariables = getVariablesForType(selectedType);

  return (
    <AdminLayout title="قوالب رسائل واتساب">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            إدارة قوالب الرسائل
          </CardTitle>
          <CardDescription>
            أنشئ قوالب رسائل واتساب مرتبطة بأحداث النظام المختلفة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              عدد القوالب: {templates.length} | المفعلة: {templates.filter(t => t.is_active).length}
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  إضافة قالب
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? "تعديل القالب" : "إضافة قالب جديد"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Template Type Selection */}
                  <div className="space-y-2">
                    <Label>نوع القالب *</Label>
                    <Select value={selectedType} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع القالب" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span>{type.label}</span>
                              <span className="text-xs text-muted-foreground">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      الحدث المرتبط: <code className="bg-muted px-1 rounded">{templateTypes.find(t => t.value === selectedType)?.event}</code>
                    </p>
                  </div>

                  {/* Available Variables */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Variable className="w-4 h-4" />
                      المتغيرات المتاحة
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg max-h-36 overflow-y-auto">
                      <TooltipProvider>
                        {availableVariables.map(variable => (
                          <Tooltip key={variable.name}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => insertVariable(variable.name)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-background border rounded-md text-xs font-mono hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                {`{{${variable.name}}}`}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{variable.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      انقر على المتغير لإضافته للرسالة
                    </p>
                  </div>
                  
                  {/* Message Template */}
                  <div className="space-y-2">
                    <Label>نص الرسالة *</Label>
                    <Textarea
                      value={formData.template}
                      onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                      placeholder={`مرحباً {{customer_name}}!\n\nتم استلام طلبك رقم {{order_number}} بنجاح.\n\nالمبلغ الإجمالي: {{order_total}} ر.س`}
                      className="min-h-[180px] font-mono text-sm"
                      dir="rtl"
                      required
                    />
                  </div>

                  {/* Selected Variables */}
                  {formData.variables.length > 0 && (
                    <div className="space-y-2">
                      <Label>المتغيرات المستخدمة</Label>
                      <div className="flex flex-wrap gap-1">
                        {formData.variables.map(v => (
                          <Badge key={v} variant="secondary" className="font-mono text-xs">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <Label>تفعيل القالب</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    {editingTemplate ? "حفظ التعديلات" : "إضافة القالب"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{getTemplateTypeLabel(template.name)}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">{template.name}</p>
                  </div>
                </div>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "مفعل" : "معطل"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap mb-3 max-h-32 overflow-y-auto" dir="rtl">
                {template.template}
              </pre>
              
              {template.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.variables.map(v => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => copyTemplate(template.template)} className="gap-1">
                  <Copy className="w-3 h-3" />
                  نسخ
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(template)} className="gap-1">
                  <Edit2 className="w-3 h-3" />
                  تعديل
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-3 h-3" />
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {templates.length === 0 && !isLoading && (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">لا توجد قوالب</p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة أول قالب
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default WhatsAppTemplatesPage;
