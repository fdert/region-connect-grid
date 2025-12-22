import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Image, GripVertical, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  position: string;
  sort_order: number;
  is_active: boolean;
}

const positions = [
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
  const { toast } = useToast();

  useEffect(() => {
    fetchBanners();
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

  const groupedBanners = banners.reduce((acc, banner) => {
    if (!acc[banner.position]) acc[banner.position] = [];
    acc[banner.position].push(banner);
    return acc;
  }, {} as Record<string, Banner[]>);

  return (
    <AdminLayout title="إدارة البنرات">
      <div className="flex justify-between items-center mb-6">
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
        <Card key={pos.value} className="mb-6">
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
    </AdminLayout>
  );
};

export default BannersPage;
