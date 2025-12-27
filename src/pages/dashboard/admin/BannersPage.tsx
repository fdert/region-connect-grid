import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit2, Image, ExternalLink, Type, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  position: string;
  sort_order: number;
  is_active: boolean;
}

interface AnnouncementBar {
  id: string;
  text: string;
  background_color: string;
  text_color: string;
  font_size: number;
  is_active: boolean;
  link_url: string | null;
  speed: number;
}

const positions = [
  { value: "hero_center", label: "بانر الهيرو المركزي" },
  { value: "home_top", label: "أعلى الصفحة الرئيسية" },
  { value: "home_middle", label: "وسط الصفحة الرئيسية" },
  { value: "home_bottom", label: "أسفل الصفحة الرئيسية" },
  { value: "stores_page", label: "صفحة المتاجر" },
  { value: "categories_page", label: "صفحة التصنيفات" },
];

const BannersPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link_url: "",
    position: "home_top",
    is_active: true
  });

  // Announcement Bar State
  const [announcement, setAnnouncement] = useState<AnnouncementBar | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    text: "",
    background_color: "#dc2626",
    text_color: "#ffffff",
    font_size: 14,
    is_active: false,
    link_url: "",
    speed: 50
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchBanners();
    fetchAnnouncement();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("position")
        .order("sort_order");

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from("announcement_bar")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setAnnouncement(data);
        setAnnouncementForm({
          text: data.text || "",
          background_color: data.background_color || "#dc2626",
          text_color: data.text_color || "#ffffff",
          font_size: data.font_size || 14,
          is_active: data.is_active || false,
          link_url: data.link_url || "",
          speed: data.speed || 50
        });
      }
    } catch (error) {
      console.error("Error fetching announcement:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(formData)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast({ title: "تم تحديث البنر بنجاح" });
      } else {
        const { error } = await supabase
          .from("banners")
          .insert([{ ...formData, sort_order: banners.length }]);
        if (error) throw error;
        toast({ title: "تم إضافة البنر بنجاح" });
      }
      
      setIsDialogOpen(false);
      setEditingBanner(null);
      setFormData({ title: "", image_url: "", link_url: "", position: "home_top", is_active: true });
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast({ title: "خطأ في حفظ البنر", variant: "destructive" });
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      position: banner.position,
      is_active: banner.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا البنر؟")) return;
    
    try {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف البنر" });
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast({ title: "خطأ في حذف البنر", variant: "destructive" });
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);
      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error("Error toggling banner:", error);
    }
  };

  const saveAnnouncement = async () => {
    try {
      if (announcement) {
        const { error } = await supabase
          .from("announcement_bar")
          .update(announcementForm)
          .eq("id", announcement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("announcement_bar")
          .insert([announcementForm]);
        if (error) throw error;
      }
      toast({ title: "تم حفظ الشريط الإعلاني" });
      fetchAnnouncement();
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast({ title: "خطأ في حفظ الشريط", variant: "destructive" });
    }
  };

  const groupedBanners = banners.reduce((acc, banner) => {
    if (!acc[banner.position]) acc[banner.position] = [];
    acc[banner.position].push(banner);
    return acc;
  }, {} as Record<string, Banner[]>);

  return (
    <AdminLayout title="إدارة البنرات والإعلانات">
      <Tabs defaultValue="banners" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="banners" className="gap-2">
            <Image className="w-4 h-4" />
            البنرات
          </TabsTrigger>
          <TabsTrigger value="announcement" className="gap-2">
            <Type className="w-4 h-4" />
            الشريط الإعلاني
          </TabsTrigger>
        </TabsList>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">إدارة البنرات الإعلانية في المنصة</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => {
                  setEditingBanner(null);
                  setFormData({ title: "", image_url: "", link_url: "", position: "home_top", is_active: true });
                }}>
                  <Plus className="w-4 h-4" />
                  إضافة بنر
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingBanner ? "تعديل البنر" : "إضافة بنر جديد"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>عنوان البنر</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="عنوان البنر (اختياري)"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>رابط الصورة *</Label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/banner.jpg"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>رابط البنر</Label>
                    <Input
                      value={formData.link_url}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      placeholder="https://example.com/page"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>موقع البنر</Label>
                    <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>تفعيل البنر</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    {editingBanner ? "حفظ التعديلات" : "إضافة البنر"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {positions.map(pos => (
            <Card key={pos.value}>
              <CardHeader>
                <CardTitle className="text-lg">{pos.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {groupedBanners[pos.value]?.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedBanners[pos.value].map((banner) => (
                      <div key={banner.id} className="border rounded-xl overflow-hidden group">
                        <div className="aspect-video bg-muted relative">
                          {banner.image_url ? (
                            <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" onClick={() => handleEdit(banner)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDelete(banner.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{banner.title || "بدون عنوان"}</p>
                            {banner.link_url && (
                              <a href={banner.link_url} target="_blank" className="text-xs text-primary flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                رابط
                              </a>
                            )}
                          </div>
                          <Switch checked={banner.is_active} onCheckedChange={() => toggleActive(banner)} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">لا توجد بنرات في هذا الموقع</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Announcement Bar Tab */}
        <TabsContent value="announcement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                الشريط الإعلاني المتحرك
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview */}
              <div className="rounded-lg overflow-hidden border">
                <p className="text-sm text-muted-foreground px-4 py-2 bg-muted">معاينة الشريط:</p>
                <div
                  className="w-full overflow-hidden py-2"
                  style={{
                    backgroundColor: announcementForm.background_color,
                  }}
                >
                  <div
                    className="whitespace-nowrap animate-marquee"
                    style={{
                      color: announcementForm.text_color,
                      fontSize: `${announcementForm.font_size}px`,
                    }}
                  >
                    <span>
                      {announcementForm.text || "نص الإعلان هنا..."} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcementForm.text || "نص الإعلان هنا..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>نص الإعلان</Label>
                  <Input
                    value={announcementForm.text}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, text: e.target.value })}
                    placeholder="🔥 مرحباً بكم - تسوقوا الآن! 🔥"
                  />
                </div>

                <div className="space-y-2">
                  <Label>رابط (اختياري)</Label>
                  <Input
                    value={announcementForm.link_url}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, link_url: e.target.value })}
                    placeholder="https://example.com/offers"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      لون الخلفية
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={announcementForm.background_color}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, background_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={announcementForm.background_color}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, background_color: e.target.value })}
                        placeholder="#dc2626"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      لون النص
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={announcementForm.text_color}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, text_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={announcementForm.text_color}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, text_color: e.target.value })}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>حجم الخط: {announcementForm.font_size}px</Label>
                  <Slider
                    value={[announcementForm.font_size]}
                    onValueChange={(v) => setAnnouncementForm({ ...announcementForm, font_size: v[0] })}
                    min={10}
                    max={24}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>سرعة الحركة: {announcementForm.speed}%</Label>
                  <Slider
                    value={[announcementForm.speed]}
                    onValueChange={(v) => setAnnouncementForm({ ...announcementForm, speed: v[0] })}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-base font-medium">تفعيل الشريط الإعلاني</Label>
                    <p className="text-sm text-muted-foreground">سيظهر في أعلى جميع الصفحات</p>
                  </div>
                  <Switch
                    checked={announcementForm.is_active}
                    onCheckedChange={(v) => setAnnouncementForm({ ...announcementForm, is_active: v })}
                  />
                </div>

                <Button onClick={saveAnnouncement} className="w-full">
                  حفظ إعدادات الشريط الإعلاني
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default BannersPage;