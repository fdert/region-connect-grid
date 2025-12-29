import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Truck, DollarSign, MapPin, Save, Loader2, Info } from "lucide-react";

interface DeliverySettings {
  default_base_fee: number;
  default_price_per_km: number;
  default_free_radius_km: number;
  min_delivery_fee: number;
  max_delivery_fee: number;
  platform_delivery_commission: number;
}

export default function DeliverySettingsPage() {
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<DeliverySettings>({
    default_base_fee: 5,
    default_price_per_km: 2,
    default_free_radius_km: 0,
    min_delivery_fee: 5,
    max_delivery_fee: 50,
    platform_delivery_commission: 0,
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
          base_delivery_fee: settings.default_base_fee,
          price_per_km: settings.default_price_per_km,
          free_delivery_radius_km: settings.default_free_radius_km,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(settings);
  };

  if (isLoading) {
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>رسوم التوصيل الأساسية (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.default_base_fee}
                    onChange={(e) => setSettings({ ...settings, default_base_fee: Number(e.target.value) })}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">الرسوم الثابتة لكل طلب</p>
                </div>
                <div className="space-y-2">
                  <Label>سعر الكيلومتر (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.default_price_per_km}
                    onChange={(e) => setSettings({ ...settings, default_price_per_km: Number(e.target.value) })}
                    placeholder="2"
                  />
                  <p className="text-xs text-muted-foreground">السعر لكل كيلومتر من المسافة</p>
                </div>
                <div className="space-y-2">
                  <Label>نطاق التوصيل المجاني (كم)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.default_free_radius_km}
                    onChange={(e) => setSettings({ ...settings, default_free_radius_km: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">المسافة المجانية من المتجر</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">معادلة حساب رسوم التوصيل:</p>
                    <p className="text-muted-foreground mt-1">
                      رسوم التوصيل = الرسوم الأساسية + (المسافة - نطاق التوصيل المجاني) × سعر الكيلومتر
                    </p>
                    <p className="text-muted-foreground mt-1">
                      مثال: إذا كانت المسافة 5 كم → {settings.default_base_fee} + ({Math.max(5 - settings.default_free_radius_km, 0)} × {settings.default_price_per_km}) = {settings.default_base_fee + (Math.max(5 - settings.default_free_radius_km, 0) * settings.default_price_per_km)} ر.س
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
      </div>
    </AdminLayout>
  );
}
