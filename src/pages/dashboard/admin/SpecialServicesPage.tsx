import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, Truck, Settings, DollarSign } from "lucide-react";

interface SpecialService {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  base_price: number | null;
  price_per_km: number | null;
  price_per_100m: number | null;
  min_price: number | null;
  max_distance_km: number | null;
  requires_verification: boolean | null;
  sort_order: number | null;
}

const SpecialServicesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<SpecialService | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    icon: "Package",
    base_price: 0,
    price_per_km: 2.5,
    price_per_100m: 0.25,
    min_price: 15,
    max_distance_km: 50,
    requires_verification: true,
    is_active: true,
    sort_order: 0,
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["special-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_services")
        .select("*")
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data as SpecialService[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("special_services").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-services"] });
      toast.success("تم إضافة الخدمة بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء إضافة الخدمة");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase.from("special_services").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-services"] });
      toast.success("تم تحديث الخدمة بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء تحديث الخدمة");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("special_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-services"] });
      toast.success("تم حذف الخدمة بنجاح");
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء حذف الخدمة");
      console.error(error);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("special_services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-services"] });
      toast.success("تم تحديث حالة الخدمة");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      description: "",
      description_ar: "",
      icon: "Package",
      base_price: 0,
      price_per_km: 2.5,
      price_per_100m: 0.25,
      min_price: 15,
      max_distance_km: 50,
      requires_verification: true,
      is_active: true,
      sort_order: 0,
    });
    setEditingService(null);
  };

  const handleEdit = (service: SpecialService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      name_ar: service.name_ar,
      description: service.description || "",
      description_ar: service.description_ar || "",
      icon: service.icon || "Package",
      base_price: service.base_price || 0,
      price_per_km: service.price_per_km || 2.5,
      price_per_100m: service.price_per_100m || 0.25,
      min_price: service.min_price || 15,
      max_distance_km: service.max_distance_km || 50,
      requires_verification: service.requires_verification ?? true,
      is_active: service.is_active,
      sort_order: service.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <AdminLayout title="الخدمات الخاصة">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الخدمات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{services?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الخدمات النشطة</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {services?.filter(s => s.is_active).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">متوسط السعر/كم</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {services?.length
                  ? (services.reduce((acc, s) => acc + (s.price_per_km || 0), 0) / services.length).toFixed(2)
                  : 0} ر.س
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">إدارة الخدمات الخاصة</h2>
            <p className="text-sm text-muted-foreground">إضافة وتعديل خدمات التوصيل الخاصة</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة خدمة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingService ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم الخدمة (English)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Special Delivery"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم الخدمة (عربي)</Label>
                    <Input
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="توصيل خاص"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الوصف (English)</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Service description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف (عربي)</Label>
                    <Textarea
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      placeholder="وصف الخدمة"
                    />
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      إعدادات التسعير
                    </CardTitle>
                    <CardDescription>تحديد أسعار الخدمة حسب المسافة</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>السعر الأساسي</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.base_price}
                        onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>سعر الكيلومتر</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price_per_km}
                        onChange={(e) => setFormData({ ...formData, price_per_km: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>سعر 100 متر</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price_per_100m}
                        onChange={(e) => setFormData({ ...formData, price_per_100m: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الحد الأدنى للسعر</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.min_price}
                        onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>أقصى مسافة (كم)</Label>
                    <Input
                      type="number"
                      value={formData.max_distance_km}
                      onChange={(e) => setFormData({ ...formData, max_distance_km: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ترتيب العرض</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.requires_verification}
                      onCheckedChange={(checked) => setFormData({ ...formData, requires_verification: checked })}
                    />
                    <Label>يتطلب تحقق برسالة واتساب</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>نشط</Label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    {editingService ? "تحديث" : "إضافة"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Services Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الخدمة</TableHead>
                  <TableHead>السعر/كم</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>أقصى مسافة</TableHead>
                  <TableHead>التحقق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : services?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد خدمات حالياً
                    </TableCell>
                  </TableRow>
                ) : (
                  services?.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{service.name_ar}</div>
                            <div className="text-xs text-muted-foreground">{service.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{service.price_per_km} ر.س</TableCell>
                      <TableCell>{service.min_price} ر.س</TableCell>
                      <TableCell>{service.max_distance_km} كم</TableCell>
                      <TableCell>
                        <Badge variant={service.requires_verification ? "default" : "secondary"}>
                          {service.requires_verification ? "مطلوب" : "غير مطلوب"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: service.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(service.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SpecialServicesPage;
