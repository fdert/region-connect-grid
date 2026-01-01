import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "../DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Store, Phone, MapPin, Clock, DollarSign, Loader2, Save, Image, Upload, Tag, Navigation, Truck, Link } from "lucide-react";
import { parseCoordinatesFromUrl } from "@/lib/distance";
import { toast } from "sonner";
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
  is_active: boolean;
  logo_url: string;
  cover_url: string;
  category_ids: string[];
  location_lat: number | null;
  location_lng: number | null;
  location_url: string;
  base_delivery_fee: number;
  price_per_km: number;
  free_delivery_radius_km: number;
}

const MerchantSettings = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StoreForm>({
    name: "",
    description: "",
    phone: "",
    address: "",
    city: "",
    delivery_fee: 0,
    min_order_amount: 0,
    is_active: false,
    logo_url: "",
    cover_url: "",
    category_ids: [],
    location_lat: null,
    location_lng: null,
    location_url: "",
    base_delivery_fee: 5,
    price_per_km: 2,
    free_delivery_radius_km: 0,
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

  // Get current user's store with categories
  const { data: store, isLoading } = useQuery({
    queryKey: ["merchant-store-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: storeData, error } = await supabase
        .from("stores")
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Fetch store categories
      if (storeData) {
        const { data: storeCategories } = await supabase
          .from("store_categories")
          .select("category_id")
          .eq("store_id", storeData.id);
        
        return {
          ...storeData,
          category_ids: storeCategories?.map(sc => sc.category_id) || []
        };
      }
      
      return storeData;
    },
  });

  // Update form when store data is loaded
  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || "",
        description: store.description || "",
        phone: store.phone || "",
        address: store.address || "",
        city: store.city || "",
        delivery_fee: store.delivery_fee || 0,
        min_order_amount: store.min_order_amount || 0,
        is_active: store.is_active || false,
        logo_url: store.logo_url || "",
        cover_url: store.cover_url || "",
        category_ids: (store as any).category_ids || [],
        location_lat: (store as any).location_lat || null,
        location_lng: (store as any).location_lng || null,
        location_url: (store as any).location_url || "",
        base_delivery_fee: (store as any).base_delivery_fee || 5,
        price_per_km: (store as any).price_per_km || 2,
        free_delivery_radius_km: (store as any).free_delivery_radius_km || 0,
      });
      setLogoPreview(store.logo_url || "");
      setCoverPreview(store.cover_url || "");
    }
  }, [store]);

  // Parse location from URL
  const handleLocationUrlChange = (url: string) => {
    setForm({ ...form, location_url: url });
    
    if (url) {
      const coords = parseCoordinatesFromUrl(url);
      if (coords) {
        setForm(prev => ({
          ...prev,
          location_url: url,
          location_lat: coords.lat,
          location_lng: coords.lng,
        }));
        toast.success("تم استخراج الإحداثيات من الرابط بنجاح");
      }
    } else {
      setForm(prev => ({
        ...prev,
        location_url: "",
        location_lat: null,
        location_lng: null,
      }));
    }
  };

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

  // Update store mutation
  const updateMutation = useMutation({
    mutationFn: async (data: StoreForm) => {
      if (!store?.id) throw new Error("No store found");
      
      setIsUploading(true);
      let logoUrl = data.logo_url;
      let coverUrl = data.cover_url;

      try {
        // Upload logo if selected
        if (logoFile) {
          logoUrl = await uploadImage(logoFile, `logos/${store.merchant_id}`);
        }
        // Upload cover if selected
        if (coverFile) {
          coverUrl = await uploadImage(coverFile, `covers/${store.merchant_id}`);
        }
      } finally {
        setIsUploading(false);
      }
      
      const { error } = await supabase
        .from("stores")
        .update({
          name: data.name,
          description: data.description,
          phone: data.phone,
          address: data.address,
          city: data.city,
          delivery_fee: data.delivery_fee,
          min_order_amount: data.min_order_amount,
          is_active: data.is_active,
          logo_url: logoUrl || null,
          cover_url: coverUrl || null,
          category_id: data.category_ids[0] || null,
          location_lat: data.location_lat,
          location_lng: data.location_lng,
          location_url: data.location_url || null,
          base_delivery_fee: data.base_delivery_fee,
          price_per_km: data.price_per_km,
          free_delivery_radius_km: data.free_delivery_radius_km,
        } as any)
        .eq("id", store.id);
      
      if (error) throw error;

      // Update store categories
      await supabase.from("store_categories").delete().eq("store_id", store.id);
      
      if (data.category_ids.length > 0) {
        const categoryInserts = data.category_ids.map(categoryId => ({
          store_id: store.id,
          category_id: categoryId,
        }));
        
        await supabase.from("store_categories").insert(categoryInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-store-settings"] });
      setLogoFile(null);
      setCoverFile(null);
      toast.success("تم حفظ الإعدادات بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("يرجى إدخال اسم المتجر");
      return;
    }
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="merchant">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!store) {
    return (
      <DashboardLayout role="merchant">
        <Card>
          <CardContent className="p-8 text-center">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">لا يوجد متجر</h2>
            <p className="text-muted-foreground">
              لم يتم العثور على متجر مرتبط بحسابك. يرجى التواصل مع الدعم.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">إعدادات المتجر</h1>
          <p className="text-muted-foreground">تحديث معلومات وإعدادات متجرك</p>
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
                  placeholder="أدخل اسم المتجر"
                />
              </div>
              <div>
                <Label>تصنيفات المتجر</Label>
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
                  placeholder="وصف مختصر عن متجرك"
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
            <CardContent className="space-y-6">
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
                <Label>رقم الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>المدينة</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="المدينة"
                  />
                </div>
                <div>
                  <Label>العنوان</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="العنوان التفصيلي"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                موقع المتجر
              </CardTitle>
              <CardDescription>حدد موقع المتجر لحساب رسوم التوصيل تلقائياً</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>رابط موقع المتجر (Google Maps)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={form.location_url}
                    onChange={(e) => handleLocationUrlChange(e.target.value)}
                    placeholder="الصق رابط Google Maps هنا"
                    dir="ltr"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (form.location_url) {
                        window.open(form.location_url, '_blank');
                      }
                    }}
                    disabled={!form.location_url}
                  >
                    <Link className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  انسخ رابط الموقع من تطبيق Google Maps والصقه هنا
                </p>
              </div>
              
              {form.location_lat && form.location_lng && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
                  <p className="text-sm text-success font-medium">✅ تم تحديد موقع المتجر</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    الإحداثيات: {form.location_lat.toFixed(6)}, {form.location_lng.toFixed(6)}
                  </p>
                  <a 
                    href={`https://maps.google.com/?q=${form.location_lat},${form.location_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    عرض على الخريطة
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                إعدادات التوصيل
              </CardTitle>
              <CardDescription>رسوم التوصيل والحد الأدنى للطلب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>رسوم التوصيل الأساسية (ر.س)</Label>
                  <Input
                    type="number"
                    value={form.base_delivery_fee}
                    onChange={(e) => setForm({ ...form, base_delivery_fee: Number(e.target.value) })}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label>سعر الكيلومتر (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={form.price_per_km}
                    onChange={(e) => setForm({ ...form, price_per_km: Number(e.target.value) })}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label>نطاق التوصيل المجاني (كم)</Label>
                  <Input
                    type="number"
                    value={form.free_delivery_radius_km}
                    onChange={(e) => setForm({ ...form, free_delivery_radius_km: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>رسوم التوصيل الثابتة (ر.س) - اختياري</Label>
                  <Input
                    type="number"
                    value={form.delivery_fee}
                    onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">تُستخدم إذا لم يتم تحديد موقع المتجر</p>
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

          {/* Store Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                حالة المتجر
              </CardTitle>
              <CardDescription>تفعيل أو إيقاف المتجر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">المتجر مفتوح</p>
                  <p className="text-sm text-muted-foreground">
                    {form.is_active 
                      ? "المتجر نشط ويستقبل الطلبات" 
                      : "المتجر مغلق ولا يستقبل طلبات"
                    }
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Approval Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {store.is_approved ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-green-600 font-medium">المتجر معتمد</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-yellow-600 font-medium">في انتظار الاعتماد</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button type="submit" size="lg" disabled={updateMutation.isPending || isUploading} className="w-full sm:w-auto gap-2">
            {(updateMutation.isPending || isUploading) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isUploading ? "جاري رفع الصور..." : "حفظ الإعدادات"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default MerchantSettings;
