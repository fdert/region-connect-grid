import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Send
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

const defaultSettings: WhatsAppSettings = {
  app_key: "",
  auth_key: "",
  api_url: "https://darcoom.com/wsender/public/api/create-message",
  is_active: true,
  provider_name: "Darcoom WSender",
};

const WhatsAppSettingsPage = () => {
  const queryClient = useQueryClient();
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [formData, setFormData] = useState<WhatsAppSettings>(defaultSettings);

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

      if (error) throw error;

      const updatedSettings = {
        ...formData,
        last_tested_at: new Date().toISOString(),
        test_status: 'success' as const,
      };
      
      setFormData(updatedSettings);
      saveMutation.mutate(updatedSettings);
      toast.success("تم الاتصال بنجاح! تحقق من رسالة الواتساب");
    } catch (error: any) {
      const updatedSettings = {
        ...formData,
        last_tested_at: new Date().toISOString(),
        test_status: 'failed' as const,
      };
      
      setFormData(updatedSettings);
      toast.error(`فشل الاتصال: ${error.message}`);
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
      <div className="space-y-6 max-w-4xl">
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
      </div>
    </AdminLayout>
  );
};

export default WhatsAppSettingsPage;
