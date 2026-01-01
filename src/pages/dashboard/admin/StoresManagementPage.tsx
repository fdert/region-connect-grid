import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Search, Store, Star, MapPin, CheckCircle, XCircle, 
  Edit, Navigation, Loader2, Truck, Phone, DollarSign, Link 
} from "lucide-react";
import { parseCoordinatesFromUrl } from "@/lib/distance";
import MultiCategorySelect from "@/components/merchant/MultiCategorySelect";

interface StoreFormData {
  name: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  delivery_fee: number;
  min_order_amount: number;
  is_active: boolean;
  is_approved: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_url: string;
  base_delivery_fee: number;
  price_per_km: number;
  free_delivery_radius_km: number;
  category_ids: string[];
}

export default function StoresManagementPage() {
  const [search, setSearch] = useState("");
  const [editingStore, setEditingStore] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [form, setForm] = useState<StoreFormData>({
    name: "",
    description: "",
    phone: "",
    address: "",
    city: "",
    delivery_fee: 0,
    min_order_amount: 0,
    is_active: false,
    is_approved: false,
    location_lat: null,
    location_lng: null,
    location_url: "",
    base_delivery_fee: 5,
    price_per_km: 2,
    free_delivery_radius_km: 0,
    category_ids: [],
  });
  
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, name_ar")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: stores, isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Update form when editing store changes
  useEffect(() => {
    const loadStoreCategories = async () => {
      if (editingStore) {
        // Fetch store categories
        const { data: storeCategories } = await supabase
          .from("store_categories")
          .select("category_id")
          .eq("store_id", editingStore.id);
        
        setForm({
          name: editingStore.name || "",
          description: editingStore.description || "",
          phone: editingStore.phone || "",
          address: editingStore.address || "",
          city: editingStore.city || "",
          delivery_fee: editingStore.delivery_fee || 0,
          min_order_amount: editingStore.min_order_amount || 0,
          is_active: editingStore.is_active || false,
          is_approved: editingStore.is_approved || false,
          location_lat: editingStore.location_lat || null,
          location_lng: editingStore.location_lng || null,
          location_url: editingStore.location_url || "",
          base_delivery_fee: editingStore.base_delivery_fee || 5,
          price_per_km: editingStore.price_per_km || 2,
          free_delivery_radius_km: editingStore.free_delivery_radius_km || 0,
          category_ids: storeCategories?.map(sc => sc.category_id) || [],
        });
      }
    };
    loadStoreCategories();
  }, [editingStore]);

  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ storeId, isApproved }: { storeId: string; isApproved: boolean }) => {
      const { error } = await supabase
        .from("stores")
        .update({ is_approved: isApproved })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast({ title: "تم تحديث حالة المتجر" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("stores")
        .update({ is_active: isActive })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast({ title: "تم تحديث حالة التفعيل" });
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (data: StoreFormData & { id: string }) => {
      const { id, category_ids, ...updateData } = data;
      const { error } = await supabase
        .from("stores")
        .update({
          ...updateData,
          category_id: category_ids[0] || null,
        } as any)
        .eq("id", id);
      if (error) throw error;

      // Update store categories
      await supabase.from("store_categories").delete().eq("store_id", id);
      
      if (category_ids.length > 0) {
        const categoryInserts = category_ids.map(categoryId => ({
          store_id: id,
          category_id: categoryId,
        }));
        await supabase.from("store_categories").insert(categoryInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setIsDialogOpen(false);
      setEditingStore(null);
      toast({ title: "تم تحديث بيانات المتجر بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث بيانات المتجر", variant: "destructive" });
    },
  });

  const handleEditStore = (store: any) => {
    setEditingStore(store);
    setIsDialogOpen(true);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "خطأ", description: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setForm({
          ...form,
          location_lat: lat,
          location_lng: lng,
          location_url: `https://www.google.com/maps?q=${lat},${lng}`,
        });
        setLocationLoading(false);
        toast({ title: "تم تحديد الموقع بنجاح" });
      },
      () => {
        setLocationLoading(false);
        toast({ title: "خطأ", description: "فشل في تحديد الموقع", variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    updateStoreMutation.mutate({ ...form, id: editingStore.id });
  };

  const filteredStores = stores?.filter((store) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      store.name.toLowerCase().includes(searchLower) ||
      store.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout title="إدارة المتاجر">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المتاجر</h1>
            <p className="text-muted-foreground">عرض والموافقة على المتاجر وتعديل بياناتها</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stores?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي المتاجر</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stores?.filter((s) => s.is_approved).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">متاجر معتمدة</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <XCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stores?.filter((s) => !s.is_approved).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">بانتظار الموافقة</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Navigation className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stores?.filter((s: any) => s.location_lat && s.location_lng).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">لديها موقع</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو المدينة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 max-w-md"
          />
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المتجر</TableHead>
                <TableHead className="text-right">المدينة</TableHead>
                <TableHead className="text-right">التقييم</TableHead>
                <TableHead className="text-right">رسوم التوصيل</TableHead>
                <TableHead className="text-right">الموقع</TableHead>
                <TableHead className="text-right">معتمد</TableHead>
                <TableHead className="text-right">مفعل</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredStores?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    لا يوجد متاجر
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores?.map((store: any) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {store.logo_url ? (
                          <img
                            src={store.logo_url}
                            alt={store.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Store className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {store.city || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {store.rating?.toFixed(1) || "0.0"}
                        <span className="text-xs text-muted-foreground">
                          ({store.total_reviews})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{store.base_delivery_fee || store.delivery_fee} ر.س أساسي</p>
                        <p className="text-xs text-muted-foreground">{store.price_per_km || 2} ر.س/كم</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {store.location_lat && store.location_lng ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Navigation className="w-3 h-3 mr-1" />
                          محدد
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          غير محدد
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={store.is_approved || false}
                        onCheckedChange={(checked) =>
                          toggleApprovalMutation.mutate({
                            storeId: store.id,
                            isApproved: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={store.is_active || false}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            storeId: store.id,
                            isActive: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditStore(store)}
                        className="gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        تعديل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Store Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المتجر</DialogTitle>
            <DialogDescription>تعديل معلومات وإعدادات المتجر</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Store className="w-4 h-4" />
                المعلومات الأساسية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم المتجر</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تصنيفات المتجر</Label>
                  <MultiCategorySelect
                    categories={categories}
                    selectedIds={form.category_ids}
                    onChange={(ids) => setForm({ ...form, category_ids: ids })}
                    placeholder="اختر تصنيفات المتجر"
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك اختيار أكثر من تصنيف
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" />
                معلومات التواصل
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                موقع المتجر
              </h3>
              
              {/* Primary: Location URL input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  رابط موقع خرائط جوجل
                </Label>
                <Input
                  type="url"
                  value={form.location_url}
                  onChange={(e) => {
                    const url = e.target.value;
                    setForm({ ...form, location_url: url });
                    
                    // Auto-extract coordinates from URL
                    if (url) {
                      const coords = parseCoordinatesFromUrl(url);
                      if (coords) {
                        setForm(prev => ({
                          ...prev,
                          location_url: url,
                          location_lat: coords.lat,
                          location_lng: coords.lng
                        }));
                        toast({
                          title: "تم استخراج الإحداثيات",
                          description: `خط العرض: ${coords.lat}, خط الطول: ${coords.lng}`,
                        });
                      }
                    }
                  }}
                  placeholder="https://www.google.com/maps?q=24.7136,46.6753"
                  dir="ltr"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  الصق رابط الموقع من خرائط جوجل وسيتم استخراج الإحداثيات تلقائياً
                </p>
              </div>

              {/* Extracted coordinates display */}
              {form.location_lat && form.location_lng && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">الإحداثيات المستخرجة:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">خط العرض: </span>
                      <span dir="ltr">{form.location_lat}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">خط الطول: </span>
                      <span dir="ltr">{form.location_lng}</span>
                    </div>
                  </div>
                  {Math.abs(form.location_lat) <= 90 && Math.abs(form.location_lng) <= 180 ? (
                    <a
                      href={`https://www.google.com/maps?q=${form.location_lat},${form.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      عرض على خرائط جوجل
                    </a>
                  ) : (
                    <p className="text-sm text-destructive">
                      ⚠️ إحداثيات غير صحيحة!
                    </p>
                  )}
                </div>
              )}

              {/* Alternative: Get location from browser */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="gap-2"
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  تحديد الموقع من المتصفح
                </Button>
                <span className="text-xs text-muted-foreground">أو</span>
              </div>
            </div>

            {/* Delivery Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4" />
                إعدادات التوصيل
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>رسوم التوصيل الأساسية (ر.س)</Label>
                  <Input
                    type="number"
                    value={form.base_delivery_fee}
                    onChange={(e) => setForm({ ...form, base_delivery_fee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>سعر الكيلومتر (ر.س)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={form.price_per_km}
                    onChange={(e) => setForm({ ...form, price_per_km: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>نطاق التوصيل المجاني (كم)</Label>
                  <Input
                    type="number"
                    value={form.free_delivery_radius_km}
                    onChange={(e) => setForm({ ...form, free_delivery_radius_km: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رسوم التوصيل الثابتة (ر.س)</Label>
                  <Input
                    type="number"
                    value={form.delivery_fee}
                    onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأدنى للطلب (ر.س)</Label>
                  <Input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                الحالة
              </h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_approved}
                    onCheckedChange={(checked) => setForm({ ...form, is_approved: checked })}
                  />
                  <Label>معتمد</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                  <Label>مفعل</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateStoreMutation.isPending}>
                {updateStoreMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
