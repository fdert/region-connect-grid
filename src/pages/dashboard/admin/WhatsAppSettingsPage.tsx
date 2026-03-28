import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Info,
  Link2,
  Shield,
  Send,
  Webhook,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Clock,
  Bot
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface WhatsAppSettings {
  id?: string;
  app_key: string;
  auth_key: string;
  api_url: string;
  is_active: boolean;
  provider_name: string;
  last_tested_at?: string;
  test_status?: 'success' | 'failed' | null;
}

interface AutoReplySettings {
  is_enabled: boolean;
  auto_reply_message: string;
}

interface WhatsAppMessage {
  id: string;
  direction: 'outgoing' | 'incoming';
  phone: string;
  message: string;
  template_name: string | null;
  status: string;
  created_at: string;
  order_id: string | null;
  special_order_id: string | null;
}

const defaultSettings: WhatsAppSettings = {
  app_key: "",
  auth_key: "",
  api_url: "https://whats-app-connect-portal.replit.app/api/wa/send/text",
  is_active: true,
  provider_name: "WhatsApp Connect Portal",
};

const defaultAutoReplySettings: AutoReplySettings = {
  is_enabled: false,
  auto_reply_message: "شكراً لتواصلك معنا! سيتم الرد عليك في أقرب وقت ممكن.",
};

const WhatsAppSettingsPage = () => {
  const queryClient = useQueryClient();
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [formData, setFormData] = useState<WhatsAppSettings>(defaultSettings);
  const [autoReplyData, setAutoReplyData] = useState<AutoReplySettings>(defaultAutoReplySettings);

  // Get webhook URL
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  // Fetch WhatsApp settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["whatsapp-api-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "whatsapp_api_settings")
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        const savedSettings = typeof data.value === 'string' 
          ? JSON.parse(data.value) 
          : data.value;
        setFormData({ ...defaultSettings, ...savedSettings, id: data.id });
        return { ...defaultSettings, ...savedSettings, id: data.id };
      }
      
      return null;
    },
  });

  // Fetch auto-reply settings
  const { data: autoReplySettings } = useQuery({
    queryKey: ["whatsapp-auto-reply-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "whatsapp_auto_reply_settings")
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        const savedSettings = typeof data.value === 'string' 
          ? JSON.parse(data.value) 
          : data.value;
        setAutoReplyData({ ...defaultAutoReplySettings, ...savedSettings });
        return { ...defaultAutoReplySettings, ...savedSettings };
      }
      
      return defaultAutoReplySettings;
    },
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["whatsapp-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: WhatsAppSettings) => {
      const settingsToSave = {
        app_key: data.app_key,
        auth_key: data.auth_key,
        api_url: data.api_url,
        is_active: data.is_active,
        provider_name: data.provider_name,
        last_tested_at: data.last_tested_at,
        test_status: data.test_status,
      };

      if (data.id) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: settingsToSave })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ 
            key: "whatsapp_api_settings", 
            value: settingsToSave 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات API الواتساب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-api-settings"] });
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
      console.error(error);
    },
  });

  // Save auto-reply settings mutation
  const saveAutoReplyMutation = useMutation({
    mutationFn: async (data: AutoReplySettings) => {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "whatsapp_auto_reply_settings")
        .maybeSingle();

      const valueToSave = JSON.parse(JSON.stringify({
        is_enabled: data.is_enabled,
        auto_reply_message: data.auto_reply_message,
      }));

      if (existing?.id) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: valueToSave })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert([{ 
            key: "whatsapp_auto_reply_settings", 
            value: valueToSave
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الرد التلقائي");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-auto-reply-settings"] });
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
      console.error(error);
    },
  });

  // Delete settings mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!formData.id) return;
      
      const { error } = await supabase
        .from("site_settings")
        .delete()
        .eq("id", formData.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف إعدادات API بنجاح");
      setFormData(defaultSettings);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-api-settings"] });
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء حذف الإعدادات");
      console.error(error);
    },
  });

  // Test connection
  const handleTestConnection = async () => {
    if (!formData.app_key || !formData.auth_key) {
      toast.error("يرجى إدخال مفاتيح API أولاً");
      return;
    }

    if (!testPhone) {
      toast.error("يرجى إدخال رقم هاتف للاختبار");
      return;
    }

    setIsTesting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-notification", {
        body: {
          phone: testPhone,
          template_name: "test_connection",
          variables: {
            message: "🔔 اختبار اتصال ناجح!\n\nتم إرسال هذه الرسالة للتأكد من صحة إعدادات API الواتساب."
          }
        }
      });

      if (error) {
        throw new Error(error.message || "خطأ في الاتصال بالخادم");
      }

      // Check the response data for success/failure
      if (data?.success === false) {
        const errorDetail = data?.error || "فشل إرسال الرسالة - تحقق من مفاتيح API ورقم الهاتف";
        const updatedSettings = {
          ...formData,
          last_tested_at: new Date().toISOString(),
          test_status: 'failed' as const,
        };
        setFormData(updatedSettings);
        saveMutation.mutate(updatedSettings);
        toast.error(`❌ فشل الإرسال: ${errorDetail}`, { duration: 8000 });
        return;
      }

      const updatedSettings = {
        ...formData,
        last_tested_at: new Date().toISOString(),
        test_status: 'success' as const,
      };
      
      setFormData(updatedSettings);
      saveMutation.mutate(updatedSettings);
      toast.success("✅ تم إرسال رسالة الاختبار بنجاح! تحقق من الواتساب", { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    } catch (error: any) {
      console.error("Test connection error:", error);
      const updatedSettings = {
        ...formData,
        last_tested_at: new Date().toISOString(),
        test_status: 'failed' as const,
      };
      
      setFormData(updatedSettings);
      saveMutation.mutate(updatedSettings);
      toast.error(`❌ فشل الاتصال: ${error.message}`, { duration: 8000 });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!formData.app_key || !formData.auth_key) {
      toast.error("يرجى إدخال جميع مفاتيح API المطلوبة");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleSaveAutoReply = () => {
    saveAutoReplyMutation.mutate(autoReplyData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">تم الإرسال</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">تم التسليم</Badge>;
      case 'read':
        return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">تمت القراءة</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">فشل</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">وارد</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="إعدادات API الواتساب">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="إعدادات API الواتساب">
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="auto-reply" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            الرد التلقائي
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            الرسائل
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 max-w-4xl">
          {/* Status Card */}
          <Card className="border-2 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    formData.is_active && formData.app_key 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                      : 'bg-muted'
                  }`}>
                    <MessageSquare className={`w-6 h-6 ${
                      formData.is_active && formData.app_key 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">حالة الاتصال</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {formData.is_active && formData.app_key ? (
                        <>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                            متصل
                          </Badge>
                          {formData.test_status === 'success' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                              تم اختباره
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                          <XCircle className="w-3 h-3 ml-1" />
                          غير متصل
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Label htmlFor="is-active" className="text-sm text-muted-foreground">
                    تفعيل الخدمة
                  </Label>
                  <Switch
                    id="is-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                مفاتيح API
              </CardTitle>
              <CardDescription>
                أدخل مفاتيح API الخاصة بخدمة إرسال رسائل الواتساب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Name */}
              <div className="space-y-2">
                <Label htmlFor="provider-name">اسم مزود الخدمة</Label>
                <Input
                  id="provider-name"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="مثال: Darcoom WSender"
                />
              </div>

              {/* API URL */}
              <div className="space-y-2">
                <Label htmlFor="api-url" className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  رابط API
                </Label>
                <Input
                  id="api-url"
                  value={formData.api_url}
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  placeholder="https://api.example.com/send-message"
                  dir="ltr"
                />
              </div>

              <Separator />

              {/* App Key */}
              <div className="space-y-2">
                <Label htmlFor="app-key" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  App Key (مفتاح التطبيق)
                </Label>
                <div className="relative">
                  <Input
                    id="app-key"
                    type={showAppKey ? "text" : "password"}
                    value={formData.app_key}
                    onChange={(e) => setFormData({ ...formData, app_key: e.target.value })}
                    placeholder="أدخل مفتاح التطبيق"
                    className="pl-10"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowAppKey(!showAppKey)}
                  >
                    {showAppKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Auth Key */}
              <div className="space-y-2">
                <Label htmlFor="auth-key" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Auth Key (مفتاح المصادقة)
                </Label>
                <div className="relative">
                  <Input
                    id="auth-key"
                    type={showAuthKey ? "text" : "password"}
                    value={formData.auth_key}
                    onChange={(e) => setFormData({ ...formData, auth_key: e.target.value })}
                    placeholder="أدخل مفتاح المصادقة"
                    className="pl-10"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowAuthKey(!showAuthKey)}
                  >
                    {showAuthKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">ملاحظة مهمة:</p>
                    <p>يتم استخدام هذه المفاتيح لإرسال إشعارات الطلبات والتحديثات للعملاء والتجار والمناديب عبر الواتساب.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                اختبار الاتصال
              </CardTitle>
              <CardDescription>
                أرسل رسالة اختبار للتحقق من صحة الإعدادات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="رقم الهاتف للاختبار (مثال: 0512345678)"
                    dir="ltr"
                  />
                </div>
                <Button 
                  onClick={handleTestConnection} 
                  disabled={isTesting || !formData.app_key || !formData.auth_key}
                  variant="outline"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                      جاري الاختبار...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-2" />
                      إرسال رسالة اختبار
                    </>
                  )}
                </Button>
              </div>
              
              {formData.last_tested_at && (
                <div className={`text-sm flex items-center gap-2 ${
                  formData.test_status === 'success' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formData.test_status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  آخر اختبار: {new Date(formData.last_tested_at).toLocaleString('ar-SA')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={!formData.id || deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف الإعدادات
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد من حذف إعدادات API؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف جميع مفاتيح API المحفوظة. لن يتمكن النظام من إرسال رسائل واتساب بعد الحذف.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ الإعدادات
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook" className="space-y-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                إعدادات Webhook لاستقبال الردود
              </CardTitle>
              <CardDescription>
                استخدم هذا الرابط في إعدادات مزود خدمة الواتساب لاستقبال ردود الرسائل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>رابط Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-medium mb-2">كيفية الإعداد:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>انسخ رابط Webhook أعلاه</li>
                      <li>اذهب إلى لوحة تحكم مزود الخدمة (Darcoom)</li>
                      <li>ابحث عن إعدادات Webhook أو Callback URL</li>
                      <li>الصق الرابط واحفظ الإعدادات</li>
                      <li>الآن سيتم استقبال جميع ردود الرسائل تلقائياً</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Supported Events */}
              <div className="space-y-3">
                <Label>الأحداث المدعومة</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-sm">الرسائل الواردة</p>
                      <p className="text-xs text-muted-foreground">استقبال ردود العملاء</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">تحديث الحالة</p>
                      <p className="text-xs text-muted-foreground">تم التسليم / تمت القراءة</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto Reply Tab */}
        <TabsContent value="auto-reply" className="space-y-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                الرد التلقائي
              </CardTitle>
              <CardDescription>
                إعداد رسالة رد تلقائي عند استقبال رسائل من العملاء
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    autoReplyData.is_enabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'
                  }`}>
                    <Bot className={`w-5 h-5 ${
                      autoReplyData.is_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">تفعيل الرد التلقائي</p>
                    <p className="text-sm text-muted-foreground">إرسال رد تلقائي عند استقبال أي رسالة</p>
                  </div>
                </div>
                <Switch
                  checked={autoReplyData.is_enabled}
                  onCheckedChange={(checked) => setAutoReplyData({ ...autoReplyData, is_enabled: checked })}
                />
              </div>

              {/* Auto Reply Message */}
              <div className="space-y-2">
                <Label htmlFor="auto-reply-message">نص الرد التلقائي</Label>
                <Textarea
                  id="auto-reply-message"
                  value={autoReplyData.auto_reply_message}
                  onChange={(e) => setAutoReplyData({ ...autoReplyData, auto_reply_message: e.target.value })}
                  placeholder="أدخل نص الرد التلقائي..."
                  rows={4}
                />
              </div>

              <Button onClick={handleSaveAutoReply} disabled={saveAutoReplyMutation.isPending}>
                {saveAutoReplyMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    حفظ الإعدادات
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    سجل الرسائل
                  </CardTitle>
                  <CardDescription>
                    جميع الرسائل المرسلة والمستقبلة
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تحديث
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages && messages.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border ${
                          msg.direction === 'incoming'
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              msg.direction === 'incoming'
                                ? 'bg-emerald-100 dark:bg-emerald-900'
                                : 'bg-blue-100 dark:bg-blue-900'
                            }`}>
                              {msg.direction === 'incoming' ? (
                                <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm" dir="ltr">{msg.phone}</span>
                                {getStatusBadge(msg.status)}
                                {msg.template_name && (
                                  <Badge variant="secondary" className="text-xs">
                                    {msg.template_name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: ar })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                  <p>لا توجد رسائل بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default WhatsAppSettingsPage;
