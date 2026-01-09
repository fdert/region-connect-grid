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
import { Plus, Trash2, Edit2, Image, ExternalLink, Type, Palette, Video, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  video_url: string | null;
  media_type: string;
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
    video_url: "",
    media_type: "image",
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
    
    const dataToSave = {
      title: formData.title,
      image_url: formData.media_type === 'image' ? formData.image_url : formData.image_url, // thumbnail for video
      video_url: formData.media_type === 'video' ? formData.video_url : null,
      media_type: formData.media_type,
      link_url: formData.link_url,
      position: formData.position,
      is_active: formData.is_active
    };

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(dataToSave)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast({ title: "تم تحديث البنر بنجاح" });
      } else {
        const { error } = await supabase
          .from("banners")
          .insert([{ ...dataToSave, sort_order: banners.length }]);
        if (error) throw error;
        toast({ title: "تم إضافة البنر بنجاح" });
      }
      
      setIsDialogOpen(false);
      setEditingBanner(null);
      setFormData({ title: "", image_url: "", video_url: "", media_type: "image", link_url: "", position: "home_top", is_active: true });
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
      video_url: banner.video_url || "",
      media_type: banner.media_type || "image",
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
            <div>
              <p className="text-muted-foreground">إدارة البنرات الإعلانية (صور وفيديو)</p>
              <p className="text-xs text-muted-foreground mt-1">
                مقاسات مقترحة: سطح المكتب 1920×400 | الجوال 800×400
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => {
                  setEditingBanner(null);
                  setFormData({ title: "", image_url: "", video_url: "", media_type: "image", link_url: "", position: "home_top", is_active: true });
                }}>
                  <Plus className="w-4 h-4" />
                  إضافة بنر
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
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

                  {/* Media Type Selection */}
                  <div className="space-y-3">
                    <Label>نوع المحتوى</Label>
                    <RadioGroup
                      value={formData.media_type}
                      onValueChange={(v) => setFormData({ ...formData, media_type: v })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2 border rounded-lg px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors flex-1">
                        <RadioGroupItem value="image" id="image" />
                        <Label htmlFor="image" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Image className="w-5 h-5 text-primary" />
                          صورة
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 border rounded-lg px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors flex-1">
                        <RadioGroupItem value="video" id="video" />
                        <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Video className="w-5 h-5 text-primary" />
                          فيديو
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.media_type === 'image' ? (
                    <div className="space-y-2">
                      <Label>رابط الصورة *</Label>
                      <Input
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://example.com/banner.jpg"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        مقاس مقترح: 1920×400 بكسل (نسبة 5:1)
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>رابط الفيديو *</Label>
                        <Input
                          value={formData.video_url}
                          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                          placeholder="https://example.com/banner.mp4"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          يدعم: MP4, WebM - مقاس مقترح: 1920×400 بكسل
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>صورة مصغرة (اختياري)</Label>
                        <Input
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="https://example.com/thumbnail.jpg"
                        />
                        <p className="text-xs text-muted-foreground">
                          تظهر قبل تحميل الفيديو
                        </p>
                      </div>
                    </>
                  )}
                  
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
                        <div className="aspect-[5/2] bg-muted relative">
                          {banner.media_type === 'video' && banner.video_url ? (
                            <div className="relative w-full h-full">
                              <video
                                src={banner.video_url}
                                poster={banner.image_url}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                              />
                              <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                فيديو
                              </div>
                            </div>
                          ) : banner.image_url ? (
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
                            <p className="font-medium text-sm flex items-center gap-1">
                              {banner.media_type === 'video' && <Video className="w-3 h-3" />}
                              {banner.title || "بدون عنوان"}
                            </p>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>حجم الخط: {announcementForm.font_size}px</Label>
                    <Slider
                      value={[announcementForm.font_size]}
                      onValueChange={([v]) => setAnnouncementForm({ ...announcementForm, font_size: v })}
                      min={10}
                      max={24}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>سرعة التحريك: {announcementForm.speed}</Label>
                    <Slider
                      value={[announcementForm.speed]}
                      onValueChange={([v]) => setAnnouncementForm({ ...announcementForm, speed: v })}
                      min={10}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">تفعيل الشريط الإعلاني</Label>
                    <p className="text-sm text-muted-foreground">سيظهر أعلى الموقع</p>
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