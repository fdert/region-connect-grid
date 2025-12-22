import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Type, Image, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const fonts = [
  { value: "Tajawal", label: "تجوال" },
  { value: "Cairo", label: "القاهرة" },
  { value: "Almarai", label: "المراعي" },
  { value: "IBM Plex Sans Arabic", label: "IBM عربي" },
  { value: "Noto Sans Arabic", label: "نوتو عربي" },
];

const ThemePage = () => {
  const [settings, setSettings] = useState<ThemeSettings>({
    primaryColor: "#10b981",
    secondaryColor: "#fbbf24",
    accentColor: "#f97316",
    fontFamily: "Tajawal",
    logoUrl: null,
    faviconUrl: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "theme")
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        setSettings(data.value as unknown as ThemeSettings);
      }
    } catch (error) {
      console.error("Error fetching theme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          key: "theme",
          value: settings as any,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });

      if (error) throw error;
      toast({ title: "تم حفظ إعدادات المظهر بنجاح" });
    } catch (error) {
      console.error("Error saving theme:", error);
      toast({ title: "خطأ في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      primaryColor: "#10b981",
      secondaryColor: "#fbbf24",
      accentColor: "#f97316",
      fontFamily: "Tajawal",
      logoUrl: null,
      faviconUrl: null
    });
  };

  return (
    <AdminLayout title="المظهر والألوان">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                الألوان
              </CardTitle>
              <CardDescription>تخصيص ألوان المنصة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>اللون الأساسي</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>اللون الثانوي</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>لون التمييز</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="w-12 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                الخطوط
              </CardTitle>
              <CardDescription>اختيار خط المنصة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>الخط الأساسي</Label>
                <Select value={settings.fontFamily} onValueChange={(v) => setSettings({ ...settings, fontFamily: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map(font => (
                      <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logo & Favicon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                الشعار والأيقونة
              </CardTitle>
              <CardDescription>شعار المنصة وأيقونة التبويب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>رابط الشعار</Label>
                <Input
                  value={settings.logoUrl || ""}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label>رابط الأيقونة (Favicon)</Label>
                <Input
                  value={settings.faviconUrl || ""}
                  onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
            <Button variant="outline" onClick={resetToDefaults} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              إعادة للافتراضي
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>معاينة</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="p-6 rounded-xl border"
                style={{ fontFamily: settings.fontFamily }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    س
                  </div>
                  <span className="font-bold">سوقنا</span>
                </div>
                
                <div className="space-y-3">
                  <button 
                    className="w-full py-2 px-4 rounded-lg text-white font-medium"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    زر أساسي
                  </button>
                  <button 
                    className="w-full py-2 px-4 rounded-lg text-white font-medium"
                    style={{ backgroundColor: settings.secondaryColor }}
                  >
                    زر ثانوي
                  </button>
                  <button 
                    className="w-full py-2 px-4 rounded-lg text-white font-medium"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    زر تمييز
                  </button>
                </div>
                
                <p className="mt-4 text-sm text-muted-foreground">
                  نص تجريبي لمعاينة الخط المختار
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ThemePage;
