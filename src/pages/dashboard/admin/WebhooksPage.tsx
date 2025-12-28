import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Webhook, Copy, Eye, EyeOff, PlayCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WebhookSetting {
  id: string;
  name: string;
  url: string;
  secret_token: string | null;
  events: string[];
  is_active: boolean;
}

const availableEvents = [
  { value: "order.created", label: "إنشاء طلب جديد" },
  { value: "order.status_changed", label: "تغيير حالة الطلب" },
  { value: "order.delivered", label: "تم التوصيل" },
  { value: "courier.assigned", label: "تعيين مندوب" },
  { value: "support.ticket_created", label: "تذكرة دعم جديدة" },
  { value: "support.ticket_updated", label: "تحديث تذكرة دعم" },
  { value: "whatsapp.message", label: "إرسال رسائل واتساب" },
  { value: "whatsapp.otp", label: "إرسال رمز التحقق OTP" },
  { value: "location.request", label: "طلب موقع العميل" },
  { value: "location.receive", label: "استقبال موقع العميل" },
];

const WebhooksPage = () => {
  const [webhooks, setWebhooks] = useState<WebhookSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookSetting | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    secret_token: "",
    events: [] as string[],
    is_active: true
  });
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from("webhook_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        url: formData.url,
        secret_token: formData.secret_token || null,
        events: formData.events,
        is_active: formData.is_active
      };

      if (editingWebhook) {
        const { error } = await supabase
          .from("webhook_settings")
          .update(payload)
          .eq("id", editingWebhook.id);
        if (error) throw error;
        toast({ title: "تم تحديث الـ Webhook بنجاح" });
      } else {
        const { error } = await supabase
          .from("webhook_settings")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "تم إضافة الـ Webhook بنجاح" });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchWebhooks();
    } catch (error) {
      console.error("Error saving webhook:", error);
      toast({ title: "خطأ في حفظ الـ Webhook", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingWebhook(null);
    setFormData({ name: "", url: "", secret_token: "", events: [], is_active: true });
  };

  const handleEdit = (webhook: WebhookSetting) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret_token: webhook.secret_token || "",
      events: webhook.events || [],
      is_active: webhook.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الـ Webhook؟")) return;
    
    try {
      const { error } = await supabase.from("webhook_settings").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف الـ Webhook" });
      fetchWebhooks();
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  const handleTestWebhook = async (webhook: WebhookSetting) => {
    setTestingWebhookId(webhook.id);
    
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ 
          title: "يجب تسجيل الدخول", 
          description: "الرجاء تسجيل الدخول لاختبار الـ Webhook",
          variant: "destructive" 
        });
        return;
      }

      console.log("Testing webhook:", webhook.url);
      
      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: {
          webhookId: webhook.id,
          url: webhook.url,
          secretToken: webhook.secret_token,
          events: webhook.events
        }
      });

      console.log("Test webhook response:", data, error);

      if (error) {
        console.error("Function invoke error:", error);
        throw new Error(error.message || "خطأ في استدعاء الدالة");
      }

      if (data?.success) {
        toast({ 
          title: "نجح الاختبار ✓", 
          description: `تم إرسال طلب تجريبي - الاستجابة: ${data.statusCode}` 
        });
      } else {
        toast({ 
          title: "فشل الاختبار", 
          description: data?.error || `فشل الاتصال بالـ Webhook${data?.statusCode ? ` (${data.statusCode})` : ''}`,
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error("Error testing webhook:", error);
      toast({ 
        title: "خطأ في الاختبار", 
        description: error.message || "تعذر الاتصال بالويب هوك",
        variant: "destructive" 
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  return (
    <AdminLayout title="إعدادات Webhooks">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ربط n8n بالمنصة</CardTitle>
          <CardDescription>
            أضف رابط الـ Webhook من n8n لتلقي الإشعارات وإرسال رسائل الواتساب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              عدد الـ Webhooks المفعلة: {webhooks.filter(w => w.is_active).length}
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  إضافة Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingWebhook ? "تعديل Webhook" : "إضافة Webhook جديد"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>الاسم *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="n8n WhatsApp Webhook"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>رابط الـ Webhook *</Label>
                    <Input
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://your-n8n.app/webhook/..."
                      dir="ltr"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>مفتاح التوقيع (Secret Token)</Label>
                    <div className="relative">
                      <Input
                        type={showSecret ? "text" : "password"}
                        value={formData.secret_token}
                        onChange={(e) => setFormData({ ...formData, secret_token: e.target.value })}
                        placeholder="اختياري - لتأمين الـ Webhook"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>الأحداث المشتركة</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableEvents.map(event => (
                        <label key={event.value} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                          <Checkbox
                            checked={formData.events.includes(event.value)}
                            onCheckedChange={() => toggleEvent(event.value)}
                          />
                          <span className="text-sm">{event.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>تفعيل الـ Webhook</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    {editingWebhook ? "حفظ التعديلات" : "إضافة الـ Webhook"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Webhook className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{webhook.name}</h3>
                    <Badge variant={webhook.is_active ? "default" : "secondary"}>
                      {webhook.is_active ? "مفعل" : "معطل"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <code className="bg-muted px-2 py-1 rounded text-xs" dir="ltr">
                      {webhook.url.slice(0, 50)}...
                    </code>
                    <button onClick={() => copyToClipboard(webhook.url)} className="hover:text-foreground">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {webhook.events?.map(event => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {availableEvents.find(e => e.value === event)?.label || event}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleTestWebhook(webhook)}
                    disabled={testingWebhookId === webhook.id}
                    title="اختبار الـ Webhook"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    {testingWebhookId === webhook.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlayCircle className="w-4 h-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(webhook)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(webhook.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {webhooks.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Webhook className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد Webhooks مضافة</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default WebhooksPage;
