import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, FolderOpen, Trash2, Edit, Image, Upload } from "lucide-react";

// Default category images for preview
const defaultCategoryImages: Record<string, string> = {
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop",
  restaurants: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop",
  fashion: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop",
  games: "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=200&h=200&fit=crop",
  health: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop",
  grocery: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&h=200&fit=crop",
  default: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop",
};

export default function CategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [icon, setIcon] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({
        name,
        name_ar: nameAr,
        icon,
        image_url: imageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "تم إضافة التصنيف بنجاح" });
      resetForm();
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("categories")
        .update({
          name,
          name_ar: nameAr,
          icon,
          image_url: imageUrl,
        })
        .eq("id", editingCategory.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "تم تحديث التصنيف بنجاح" });
      resetForm();
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: isActive })
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "تم حذف التصنيف" });
    },
    onError: () => {
      toast({ title: "لا يمكن حذف التصنيف", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setNameAr("");
    setIcon("");
    setImageUrl("");
    setEditingCategory(null);
    setIsDialogOpen(false);
    setShowImagePicker(false);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setNameAr(category.name_ar);
    setIcon(category.icon || "");
    setImageUrl(category.image_url || "");
    setShowImagePicker(false);
    setIsDialogOpen(true);
  };

  const suggestedImages = [
    { name: "إلكترونيات", url: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop", icon: "💻" },
    { name: "مطاعم", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop", icon: "🍽️" },
    { name: "أزياء", url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop", icon: "👗" },
    { name: "ألعاب", url: "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=200&h=200&fit=crop", icon: "🎮" },
    { name: "صحة وجمال", url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop", icon: "💄" },
    { name: "أثاث", url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop", icon: "🛋️" },
    { name: "بقالة", url: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&h=200&fit=crop", icon: "🥬" },
    { name: "حلويات", url: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&h=200&fit=crop", icon: "🍫" },
    { name: "مشروبات", url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&h=200&fit=crop", icon: "🧃" },
    { name: "زهور", url: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=200&fit=crop", icon: "💐" },
    { name: "صيدلية", url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop", icon: "💊" },
    { name: "رياضة", url: "https://images.unsplash.com/photo-1461896836934- voices-of-freedom?w=200&h=200&fit=crop", icon: "⚽" },
  ];

  return (
    <AdminLayout title="إدارة التصنيفات">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة التصنيفات</h1>
            <p className="text-muted-foreground">إضافة وتعديل تصنيفات المنتجات</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة تصنيف
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الاسم (English)</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Category name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم (عربي)</Label>
                    <Input
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      placeholder="اسم التصنيف"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>الأيقونة (emoji أو رمز)</Label>
                  <Input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="🍔"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["🛒", "🍔", "👗", "💻", "🎮", "💄", "🛋️", "🥬", "💐", "💊", "⚽", "📚"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`text-2xl p-2 rounded-lg hover:bg-muted transition-colors ${icon === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    الصورة التعبيرية
                  </Label>
                  
                  {/* Current Image Preview */}
                  {imageUrl && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-primary/20 mx-auto">
                      <img 
                        src={imageUrl} 
                        alt="صورة التصنيف"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/80"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... أو اختر من الصور المقترحة"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    {showImagePicker ? "إخفاء الصور المقترحة" : "اختر من الصور المقترحة"}
                  </Button>

                  {showImagePicker && (
                    <div className="grid grid-cols-4 gap-2 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
                      {suggestedImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setImageUrl(img.url);
                            if (!icon) setIcon(img.icon);
                          }}
                          className={`relative rounded-lg overflow-hidden aspect-square hover:ring-2 hover:ring-primary transition-all ${imageUrl === img.url ? 'ring-2 ring-primary' : ''}`}
                        >
                          <img 
                            src={img.url} 
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                            {img.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => editingCategory ? updateMutation.mutate() : createMutation.mutate()}
                  disabled={!name || !nameAr || createMutation.isPending || updateMutation.isPending}
                  className="w-full"
                >
                  {editingCategory ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">الاسم (English)</TableHead>
                <TableHead className="text-right">الترتيب</TableHead>
                <TableHead className="text-right">مفعل</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : categories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    لا يوجد تصنيفات
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name_ar}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                            {category.icon || <FolderOpen className="h-5 w-5" />}
                          </div>
                        )}
                        <span className="font-medium">{category.name_ar}</span>
                      </div>
                    </TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={category.is_active || false}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            categoryId: category.id,
                            isActive: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
