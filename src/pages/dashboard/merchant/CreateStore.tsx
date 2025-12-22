import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Store, Phone, MapPin, DollarSign, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface StoreForm {
  name: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  delivery_fee: number;
  min_order_amount: number;
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

  // Create store mutation
  const createMutation = useMutation({
    mutationFn: async (data: StoreForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
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
          is_active: false,
          is_approved: false,
        });
      
      if (error) throw error;
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
            disabled={createMutation.isPending} 
            className="w-full gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Store className="w-4 h-4" />
            )}
            إنشاء المتجر
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateStore;
