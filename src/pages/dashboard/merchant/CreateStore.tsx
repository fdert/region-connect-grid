import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Store, Phone, MapPin, DollarSign, Loader2, ArrowLeft, Image, Upload, Tag } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import MultiCategorySelect from "@/components/merchant/MultiCategorySelect";

interface Category {
  id: string;
  name: string;
  name_ar: string;
}

interface StoreForm {
  name: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  delivery_fee: number;
  min_order_amount: number;
  logo_url: string;
  cover_url: string;
  category_ids: string[];
}

const CreateStore = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<StoreForm>({
    name: "",
    description: "",
    phone: "",
    address: "",
    city: "",
    delivery_fee: 0,
    min_order_amount: 0,
    logo_url: "",
    cover_url: "",
    category_ids: [],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, name_ar")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      
      if (error) throw error;
      return data as Category[];
    },
  });

  // Check if user already has a store
  const { data: existingStore, isLoading: checkingStore } = useQuery({
    queryKey: ["check-merchant-store"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("stores")
        .select("id")
        .eq("merchant_id", user.id)
        .maybeSingle();
      
      return data;
    },
  });

  // Upload image to storage
  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('store-assets')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // Handle logo change
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle cover change
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create store mutation
  const createMutation = useMutation({
    mutationFn: async (data: StoreForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      setIsUploading(true);
      let logoUrl = data.logo_url;
      let coverUrl = data.cover_url;

      try {
        // Upload logo if selected
        if (logoFile) {
          logoUrl = await uploadImage(logoFile, `logos/${user.id}`);
        }
        // Upload cover if selected
        if (coverFile) {
          coverUrl = await uploadImage(coverFile, `covers/${user.id}`);
        }
      } finally {
        setIsUploading(false);
      }
      
      // Create store
      const { data: newStore, error } = await supabase
        .from("stores")
        .insert({
          merchant_id: user.id,
          name: data.name,
          description: data.description,
          phone: data.phone,
          address: data.address,
          city: data.city,
          delivery_fee: data.delivery_fee,
          min_order_amount: data.min_order_amount,
          logo_url: logoUrl || null,
          cover_url: coverUrl || null,
          category_id: data.category_ids[0] || null,
          is_active: false,
          is_approved: false,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Insert store categories
      if (data.category_ids.length > 0 && newStore) {
        const categoryInserts = data.category_ids.map(categoryId => ({
          store_id: newStore.id,
          category_id: categoryId,
        }));
        
        await supabase.from("store_categories").insert(categoryInserts);
      }
    },
    onSuccess: () => {
      toast.success("تم إنشاء المتجر بنجاح! في انتظار موافقة الإدارة");
      navigate("/merchant");
    },
    onError: (error: any) => {
      console.error("Error creating store:", error);
      toast.error("حدث خطأ أثناء إنشاء المتجر");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("يرجى إدخال اسم المتجر");
      return;
    }
    if (!form.phone) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }
    if (!form.city) {
      toast.error("يرجى إدخال المدينة");
      return;
    }
    createMutation.mutate(form);
  };

  if (checkingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if store already exists
  if (existingStore) {
    navigate("/merchant");
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Store className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">إنشاء متجر جديد</h1>
              <p className="text-muted-foreground">أنشئ متجرك وابدأ البيع على سوقنا</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                المعلومات الأساسية
              </CardTitle>
              <CardDescription>اسم المتجر ووصفه</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>اسم المتجر *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: مطعم الشام"
                />
              </div>
              <div>
                <Label>تصنيفات المتجر *</Label>
                <MultiCategorySelect
                  categories={categories}
                  selectedIds={form.category_ids}
                  onChange={(ids) => setForm({ ...form, category_ids: ids })}
                  placeholder="اختر تصنيفات المتجر"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  يمكنك اختيار أكثر من تصنيف للمتجر
                </p>
              </div>
              <div>
                <Label>وصف المتجر</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف مختصر عن متجرك ونوع المنتجات أو الخدمات التي تقدمها"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Store Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                صور المتجر
              </CardTitle>
              <CardDescription>شعار المتجر وصورة الخلفية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div>
                <Label>شعار المتجر</Label>
                <div className="mt-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  {logoPreview ? (
                    <div className="relative w-32 h-32">
                      <img 
                        src={logoPreview} 
                        alt="Logo Preview" 
                        className="w-full h-full object-cover rounded-xl border"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-1 left-1"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        تغيير
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">رفع شعار</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover */}
              <div>
                <Label>صورة الخلفية (الغلاف)</Label>
                <div className="mt-2">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                  {coverPreview ? (
                    <div className="relative">
                      <img 
                        src={coverPreview} 
                        alt="Cover Preview" 
                        className="w-full h-40 object-cover rounded-xl border"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 left-2"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <Image className="w-4 h-4 ml-1" />
                        تغيير
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">اضغط لرفع صورة الخلفية</span>
                      <span className="text-xs text-muted-foreground mt-1">يُفضل أبعاد 1200×400</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                معلومات التواصل
              </CardTitle>
              <CardDescription>رقم الهاتف وعنوان المتجر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>رقم الهاتف *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>المدينة *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="الرياض"
                  />
                </div>
                <div>
                  <Label>العنوان</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="الحي، الشارع"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                إعدادات التوصيل
              </CardTitle>
              <CardDescription>رسوم التوصيل والحد الأدنى للطلب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>رسوم التوصيل (ر.س)</Label>
                  <Input
                    type="number"
                    value={form.delivery_fee}
                    onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>الحد الأدنى للطلب (ر.س)</Label>
                  <Input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notice */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-amber-800 text-sm">
                <strong>ملاحظة:</strong> سيتم مراجعة طلبك من قبل الإدارة. ستتلقى إشعاراً عند الموافقة على متجرك.
              </p>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button 
            type="submit" 
            size="lg" 
            disabled={createMutation.isPending || isUploading} 
            className="w-full gap-2"
          >
            {(createMutation.isPending || isUploading) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Store className="w-4 h-4" />
            )}
            {isUploading ? "جاري رفع الصور..." : "إنشاء المتجر"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateStore;
