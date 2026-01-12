import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CreditCard, 
  Settings, 
  Key, 
  Shield, 
  Globe,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentSettings {
  id: string;
  gateway_name: string;
  is_active: boolean;
  mode: 'test' | 'live';
  test_public_key: string | null;
  test_secret_key: string | null;
  live_public_key: string | null;
  live_secret_key: string | null;
  webhook_url: string | null;
  settings: {
    currency?: string;
    language?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

const PaymentSettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState(false);
  const [formData, setFormData] = useState<Partial<PaymentSettings>>({});
  const [isTesting, setIsTesting] = useState(false);

  // Fetch payment settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['payment-settings', 'tap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('gateway_name', 'tap')
        .single();
      
      if (error) throw error;
      return data as PaymentSettings;
    }
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PaymentSettings>) => {
      const { error } = await supabase
        .from('payment_settings')
        .update({
          is_active: data.is_active,
          mode: data.mode,
          test_public_key: data.test_public_key,
          test_secret_key: data.test_secret_key,
          live_public_key: data.live_public_key,
          live_secret_key: data.live_secret_key,
          webhook_url: data.webhook_url,
          settings: data.settings
        })
        .eq('gateway_name', 'tap');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الدفع بنجاح"
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive"
      });
      console.error('Error updating settings:', error);
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const secretKey = formData.mode === 'test' 
        ? formData.test_secret_key 
        : formData.live_secret_key;

      if (!secretKey) {
        toast({
          title: "خطأ",
          description: "يرجى إدخال المفتاح السري أولاً",
          variant: "destructive"
        });
        return;
      }

      // Test the connection by calling Tap API
      const response = await supabase.functions.invoke('tap-test-connection', {
        body: { 
          secretKey,
          mode: formData.mode
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({
          title: "نجح الاتصال",
          description: "تم التحقق من الاتصال بـ Tap بنجاح"
        });
      } else {
        throw new Error(response.data?.error || 'فشل الاتصال');
      }
    } catch (error: any) {
      toast({
        title: "فشل الاتصال",
        description: error.message || "تعذر الاتصال ببوابة Tap",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSettings = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  if (isLoading) {
    return (
      <AdminLayout title="إعدادات الدفع">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="إعدادات الدفع">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>فشل في تحميل إعدادات الدفع</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  const webhookUrl = `${window.location.origin}/api/tap-webhook`;

  return (
    <AdminLayout title="إعدادات الدفع">
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    بوابة الدفع Tap
                    {formData.is_active ? (
                      <Badge className="bg-green-500 text-white">مفعّل</Badge>
                    ) : (
                      <Badge variant="secondary">معطّل</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    إعدادات الربط مع بوابة الدفع الإلكتروني Tap
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="active-switch">تفعيل البوابة</Label>
                  <Switch
                    id="active-switch"
                    checked={formData.is_active || false}
                    onCheckedChange={(checked) => updateFormField('is_active', checked)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="credentials" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              مفاتيح API
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Webhook
            </TabsTrigger>
          </TabsList>

          {/* API Credentials Tab */}
          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    مفاتيح الوصول API
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? (
                      <><EyeOff className="w-4 h-4 ml-2" /> إخفاء</>
                    ) : (
                      <><Eye className="w-4 h-4 ml-2" /> إظهار</>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  احصل على مفاتيح API من{" "}
                  <a 
                    href="https://dashboard.tap.company" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    لوحة تحكم Tap
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Selection */}
                <div className="space-y-2">
                  <Label>الوضع</Label>
                  <Select
                    value={formData.mode || 'test'}
                    onValueChange={(value) => updateFormField('mode', value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          وضع الاختبار
                        </span>
                      </SelectItem>
                      <SelectItem value="live">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          وضع الإنتاج
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.mode === 'test' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      أنت في وضع الاختبار. استخدم البطاقات التجريبية لاختبار المدفوعات.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Test Keys */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    مفاتيح الاختبار (Test)
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="test-public">المفتاح العام (Public Key)</Label>
                      <Input
                        id="test-public"
                        type={showSecrets ? "text" : "password"}
                        placeholder="pk_test_..."
                        value={formData.test_public_key || ''}
                        onChange={(e) => updateFormField('test_public_key', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="test-secret">المفتاح السري (Secret Key)</Label>
                      <Input
                        id="test-secret"
                        type={showSecrets ? "text" : "password"}
                        placeholder="sk_test_..."
                        value={formData.test_secret_key || ''}
                        onChange={(e) => updateFormField('test_secret_key', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Keys */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    مفاتيح الإنتاج (Live)
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="live-public">المفتاح العام (Public Key)</Label>
                      <Input
                        id="live-public"
                        type={showSecrets ? "text" : "password"}
                        placeholder="pk_live_..."
                        value={formData.live_public_key || ''}
                        onChange={(e) => updateFormField('live_public_key', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="live-secret">المفتاح السري (Secret Key)</Label>
                      <Input
                        id="live-secret"
                        type={showSecrets ? "text" : "password"}
                        placeholder="sk_live_..."
                        value={formData.live_secret_key || ''}
                        onChange={(e) => updateFormField('live_secret_key', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    )}
                    اختبار الاتصال
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  إعدادات الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">العملة</Label>
                    <Select
                      value={formData.settings?.currency || 'SAR'}
                      onValueChange={(value) => updateSettings('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                        <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                        <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                        <SelectItem value="BHD">دينار بحريني (BHD)</SelectItem>
                        <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
                        <SelectItem value="OMR">ريال عماني (OMR)</SelectItem>
                        <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                        <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">لغة صفحة الدفع</Label>
                    <Select
                      value={formData.settings?.language || 'ar'}
                      onValueChange={(value) => updateSettings('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h4 className="font-medium">طرق الدفع المدعومة</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { id: 'mada', name: 'مدى', icon: '💳' },
                      { id: 'visa', name: 'Visa', icon: '💳' },
                      { id: 'mastercard', name: 'Mastercard', icon: '💳' },
                      { id: 'applepay', name: 'Apple Pay', icon: '🍎' }
                    ].map((method) => (
                      <div 
                        key={method.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span>{method.icon}</span>
                          <span>{method.name}</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          مدعوم
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhook Tab */}
          <TabsContent value="webhook">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  إعدادات Webhook
                </CardTitle>
                <CardDescription>
                  قم بإضافة هذا الرابط في إعدادات Webhook في لوحة تحكم Tap
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>رابط Webhook للإشعارات</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        toast({
                          title: "تم النسخ",
                          description: "تم نسخ رابط Webhook"
                        });
                      }}
                    >
                      نسخ
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    أضف هذا الرابط في Tap Dashboard → Developers → Webhooks
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    سيتم استلام إشعارات عند اكتمال الدفع أو فشله تلقائياً من خلال Webhook
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium">أحداث Webhook المدعومة</h4>
                  <div className="space-y-2">
                    {[
                      'CHARGE.CAPTURED - تم التقاط المبلغ بنجاح',
                      'CHARGE.FAILED - فشل الدفع',
                      'REFUND.CAPTURED - تم استرداد المبلغ'
                    ].map((event) => (
                      <div key={event} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {event}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setFormData(settings || {})}>
            إلغاء التغييرات
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : null}
            حفظ الإعدادات
          </Button>
        </div>

        {/* Documentation Link */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  للمزيد من المعلومات حول Tap API
                </span>
              </div>
              <a 
                href="https://developers.tap.company/reference/api-actions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                وثائق API
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PaymentSettingsPage;
