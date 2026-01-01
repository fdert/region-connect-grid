import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Truck, DollarSign, MapPin, Save, Loader2, Info, Map, AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface DeliverySettings {
  default_price_per_km: number;
  min_delivery_fee: number;
  max_delivery_fee: number;
  platform_delivery_commission: number;
}

interface MapSettings {
  provider: "openstreetmap" | "mapbox";
  mapbox_api_key: string;
  usage_warning_shown: boolean;
  last_usage_check: string | null;
}

export default function DeliverySettingsPage() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [settings, setSettings] = useState<DeliverySettings>({
    default_price_per_km: 2,
    min_delivery_fee: 5,
    max_delivery_fee: 50,
    platform_delivery_commission: 0,
  });

  const [mapSettings, setMapSettings] = useState<MapSettings>({
    provider: "openstreetmap",
    mapbox_api_key: "",
    usage_warning_shown: false,
    last_usage_check: null,
  });

  // Fetch delivery settings
  const { isLoading } = useQuery({
    queryKey: ["delivery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "delivery_settings")
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        const val = data.value as unknown as DeliverySettings;
        setSettings(val);
      }
      return data;
    },
  });

  // Fetch map settings
  const { isLoading: isMapLoading } = useQuery({
    queryKey: ["map-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "map_settings")
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        const val = data.value as unknown as MapSettings;
        setMapSettings(val);
      }
      return data;
    },
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: DeliverySettings) => {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "delivery_settings")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: newSettings as any })
          .eq("key", "delivery_settings");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "delivery_settings", value: newSettings as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  // Save map settings mutation
  const saveMapMutation = useMutation({
    mutationFn: async (newSettings: MapSettings) => {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "map_settings")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: newSettings as any })
          .eq("key", "map_settings");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "map_settings", value: newSettings as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["map-settings"] });
      toast({ title: "تم حفظ إعدادات الخرائط بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حفظ إعدادات الخرائط", variant: "destructive" });
    },
  });

  // Apply to all stores mutation
  const applyToAllMutation = useMutation({
    mutationFn: async () => {
      // First get all store IDs
      const { data: stores, error: fetchError } = await supabase
        .from("stores")
        .select("id");
      
      if (fetchError) throw fetchError;
      
      if (!stores || stores.length === 0) {
        throw new Error("لا توجد متاجر لتحديثها");
      }

      // Update each store with the new delivery settings
      const storeIds = stores.map(s => s.id);
      const { error } = await supabase
        .from("stores")
        .update({
          price_per_km: settings.default_price_per_km,
        })
        .in("id", storeIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم تطبيق الإعدادات على جميع المتاجر" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تطبيق الإعدادات", variant: "destructive" });
    },
  });

  const handleMapProviderChange = (useMapbox: boolean) => {
    setMapSettings({
      ...mapSettings,
      provider: useMapbox ? "mapbox" : "openstreetmap",
    });
  };

  const handleSaveMapSettings = () => {
    if (mapSettings.provider === "mapbox" && !mapSettings.mapbox_api_key.trim()) {
      toast({ 
        title: "خطأ", 
        description: "يرجى إدخال Mapbox API Key لتفعيل خرائط Mapbox", 
        variant: "destructive" 
      });
      return;
    }
    saveMapMutation.mutate(mapSettings);
  };

  const dismissUsageWarning = () => {
    const newSettings = { ...mapSettings, usage_warning_shown: true };
    setMapSettings(newSettings);
    saveMapMutation.mutate(newSettings);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(settings);
  };

  if (isLoading || isMapLoading) {
    return (
      <AdminLayout title="إعدادات التوصيل">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="إعدادات التوصيل">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">إعدادات التوصيل</h1>
          <p className="text-muted-foreground">تحديد الأسعار الافتراضية لحساب رسوم التوصيل</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Default Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                الأسعار الافتراضية
              </CardTitle>
              <CardDescription>
                هذه الأسعار تُطبق على المتاجر الجديدة أو التي لم تحدد أسعارها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>سعر الكيلومتر (ر.س)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={settings.default_price_per_km}
                  onChange={(e) => setSettings({ ...settings, default_price_per_km: Number(e.target.value) })}
                  placeholder="2"
                />
                <p className="text-xs text-muted-foreground">السعر لكل كيلومتر من المسافة بين المتجر ومكان التوصيل</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">معادلة حساب رسوم التوصيل:</p>
                    <p className="text-muted-foreground mt-1">
                      رسوم التوصيل = سعر الكيلومتر × المسافة
                    </p>
                    <p className="text-muted-foreground mt-1">
                      مثال: إذا كانت المسافة 5 كم → {settings.default_price_per_km} × 5 = {settings.default_price_per_km * 5} ر.س
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                حدود رسوم التوصيل
              </CardTitle>
              <CardDescription>
                تحديد الحد الأدنى والأقصى لرسوم التوصيل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>الحد الأدنى (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.min_delivery_fee}
                    onChange={(e) => setSettings({ ...settings, min_delivery_fee: Number(e.target.value) })}
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.max_delivery_fee}
                    onChange={(e) => setSettings({ ...settings, max_delivery_fee: Number(e.target.value) })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>عمولة المنصة من التوصيل (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={settings.platform_delivery_commission}
                    onChange={(e) => setSettings({ ...settings, platform_delivery_commission: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ الإعدادات
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => applyToAllMutation.mutate()}
              disabled={applyToAllMutation.isPending}
              className="gap-2"
            >
              {applyToAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              تطبيق على جميع المتاجر
            </Button>
          </div>
        </form>

        {/* Map Settings Section */}
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-xl font-bold mb-4">إعدادات الخرائط</h2>
          <p className="text-muted-foreground mb-6">اختر مزود الخرائط المناسب لتتبع الطلبات</p>

          <div className="grid gap-6">
            {/* Map Provider Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  مزود الخرائط
                </CardTitle>
                <CardDescription>
                  اختر بين OpenStreetMap (مجاني بالكامل) أو Mapbox (خطة مجانية محدودة)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OpenStreetMap Option */}
                <div className={`p-4 rounded-lg border-2 transition-all ${mapSettings.provider === "openstreetmap" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mapSettings.provider === "openstreetmap" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Map className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">OpenStreetMap + Leaflet.js</h3>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">مجاني 100%</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">خرائط مفتوحة المصدر بدون قيود استخدام</p>
                      </div>
                    </div>
                    <Switch
                      checked={mapSettings.provider === "openstreetmap"}
                      onCheckedChange={() => handleMapProviderChange(false)}
                    />
                  </div>
                  {mapSettings.provider === "openstreetmap" && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">مفعّل حالياً - لا يتطلب API Key</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mapbox Option */}
                <div className={`p-4 rounded-lg border-2 transition-all ${mapSettings.provider === "mapbox" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mapSettings.provider === "mapbox" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Map className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Mapbox</h3>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">خطة مجانية محدودة</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">خرائط متقدمة مع 25,000 طلب مجاني شهرياً</p>
                      </div>
                    </div>
                    <Switch
                      checked={mapSettings.provider === "mapbox"}
                      onCheckedChange={() => handleMapProviderChange(true)}
                    />
                  </div>

                  {mapSettings.provider === "mapbox" && (
                    <div className="mt-4 space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>تنبيه مهم</AlertTitle>
                        <AlertDescription>
                          خطة Mapbox المجانية تتضمن 25,000 طلب شهرياً. بعد تجاوز الحد، قد تُفرض رسوم. 
                          ننصح بمراقبة استخدامك في لوحة تحكم Mapbox.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label htmlFor="mapbox-api-key">Mapbox API Key (Public Token)</Label>
                        <div className="relative">
                          <Input
                            id="mapbox-api-key"
                            type={showApiKey ? "text" : "password"}
                            value={mapSettings.mapbox_api_key}
                            onChange={(e) => setMapSettings({ ...mapSettings, mapbox_api_key: e.target.value })}
                            placeholder="pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="pl-4 pr-10"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          احصل على API Key من{" "}
                          <a 
                            href="https://account.mapbox.com/access-tokens/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            لوحة تحكم Mapbox
                          </a>
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" />
                          نصائح لإدارة الاستخدام:
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>راقب استخدامك في لوحة تحكم Mapbox بانتظام</li>
                          <li>عند اقتراب الحد المجاني، انتقل إلى OpenStreetMap</li>
                          <li>يمكنك تغيير API Key في أي وقت عند الحاجة</li>
                          <li>الخرائط المخزنة مؤقتاً تقلل من الطلبات</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Usage Warning Alert */}
                {mapSettings.provider === "mapbox" && !mapSettings.usage_warning_shown && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>تذكير بحدود الاستخدام</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2">
                      <span>
                        تأكد من مراقبة استخدامك لـ Mapbox. عند انتهاء الخطة المجانية، يمكنك:
                      </span>
                      <ul className="list-disc list-inside text-sm">
                        <li>التبديل إلى OpenStreetMap (مجاني بالكامل)</li>
                        <li>إنشاء حساب Mapbox جديد للحصول على حد مجاني جديد</li>
                        <li>الترقية إلى خطة مدفوعة في Mapbox</li>
                      </ul>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={dismissUsageWarning}
                        className="w-fit mt-2"
                      >
                        فهمت، لا تظهر مرة أخرى
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save Map Settings Button */}
                <Button 
                  onClick={handleSaveMapSettings} 
                  disabled={saveMapMutation.isPending}
                  className="gap-2"
                >
                  {saveMapMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  حفظ إعدادات الخرائط
                </Button>
              </CardContent>
            </Card>

            {/* Current Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  الحالة الحالية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${mapSettings.provider === "openstreetmap" ? "bg-green-500" : "bg-blue-500"}`} />
                  <div>
                    <p className="font-medium">
                      {mapSettings.provider === "openstreetmap" 
                        ? "OpenStreetMap + Leaflet.js" 
                        : "Mapbox"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {mapSettings.provider === "openstreetmap" 
                        ? "مجاني بالكامل - بدون قيود" 
                        : mapSettings.mapbox_api_key 
                          ? "API Key مُعد - 25,000 طلب/شهر" 
                          : "يتطلب إدخال API Key"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
