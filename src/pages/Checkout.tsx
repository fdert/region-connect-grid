import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  CreditCard, 
  Banknote, 
  MapPin, 
  Phone, 
  User,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  Store
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const checkoutSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(10, "رقم الجوال غير صالح"),
  address: z.string().min(10, "العنوان مطلوب"),
  notes: z.string().optional()
});

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    notes: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deliveryFee = 15;
  const platformCommission = subtotal * 0.05; // 5% commission
  const total = subtotal + deliveryFee;

  // Group items by store
  const itemsByStore = items.reduce((acc, item) => {
    const storeId = item.store_id;
    if (!acc[storeId]) {
      acc[storeId] = {
        store_name: item.store_name,
        items: []
      };
    }
    acc[storeId].items.push(item);
    return acc;
  }, {} as Record<string, { store_name: string; items: typeof items }>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = checkoutSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول لإتمام الطلب",
        variant: "destructive"
      });
      navigate("/auth/login");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create orders for each store
      for (const [storeId, { items: storeItems }] of Object.entries(itemsByStore)) {
        const storeSubtotal = storeItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const storeCommission = storeSubtotal * 0.05;

        const orderData = {
          order_number: `ORD-${Date.now()}`, // Will be overwritten by trigger
          customer_id: user.id,
          store_id: storeId,
          items: storeItems.map(item => ({
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image
          })),
          subtotal: storeSubtotal,
          delivery_fee: deliveryFee,
          platform_commission: storeCommission,
          total: storeSubtotal + deliveryFee,
          delivery_address: formData.address,
          delivery_notes: formData.notes,
          customer_phone: formData.phone,
          payment_method: paymentMethod
        };

        const { data: order, error } = await supabase
          .from("orders")
          .insert(orderData as any)
          .select("id, order_number")
          .single();

        if (error) throw error;
        
        setOrderNumber(order.order_number);

        // Add timeline entry
        await supabase.from("order_timeline").insert({
          order_id: order.id,
          status: "new" as const,
          note: "تم إنشاء الطلب",
          created_by: user.id
        } as any);

        // Send WhatsApp notification for new order
        try {
          const { notifyNewOrder } = await import('@/lib/notifications');
          await notifyNewOrder(order.id);
        } catch (notifyError) {
          console.error('Failed to send new order notification:', notifyError);
        }
      }

      // Clear cart
      await clearCart();
      
      setOrderComplete(true);
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء الطلب",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">تم تأكيد طلبك!</h1>
            <p className="text-muted-foreground mb-4">
              شكراً لطلبك. سنقوم بتجهيزه في أقرب وقت.
            </p>
            <p className="text-lg font-semibold text-primary mb-8">
              رقم الطلب: {orderNumber}
            </p>
            <div className="space-y-3">
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/customer")}
              >
                تتبع طلبك
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/stores")}
              >
                متابعة التسوق
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">إتمام الطلب</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Info */}
              <div className="bg-card rounded-2xl border p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  معلومات التوصيل
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <div className="relative">
                      <Input
                        id="name"
                        placeholder="أدخل اسمك"
                        className={`h-12 pr-12 ${errors.name ? 'border-destructive' : ''}`}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    </div>
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الجوال</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="05xxxxxxxx"
                        className={`h-12 pr-12 ${errors.phone ? 'border-destructive' : ''}`}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        dir="ltr"
                      />
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    </div>
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address">عنوان التوصيل</Label>
                    <Textarea
                      id="address"
                      placeholder="أدخل عنوان التوصيل بالتفصيل (الحي، الشارع، رقم المبنى)"
                      className={`min-h-[100px] ${errors.address ? 'border-destructive' : ''}`}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                    <Textarea
                      id="notes"
                      placeholder="أي تعليمات خاصة للتوصيل"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-card rounded-2xl border p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  طريقة الدفع
                </h2>
                
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="cash" id="cash" />
                      <Banknote className="w-6 h-6 text-success" />
                      <div>
                        <p className="font-medium">الدفع عند الاستلام</p>
                        <p className="text-sm text-muted-foreground">ادفع نقداً للمندوب</p>
                      </div>
                    </label>

                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="card" id="card" />
                      <CreditCard className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-medium">بطاقة ائتمان</p>
                        <p className="text-sm text-muted-foreground">Visa, Mastercard, mada</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Order Items */}
              <div className="bg-card rounded-2xl border overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/50">
                  <h2 className="text-lg font-bold">المنتجات</h2>
                </div>
                
                {Object.entries(itemsByStore).map(([storeId, { store_name, items: storeItems }]) => (
                  <div key={storeId}>
                    <div className="px-6 py-3 bg-muted/30 flex items-center gap-2 text-sm">
                      <Store className="w-4 h-4" />
                      <span className="font-medium">{store_name}</span>
                    </div>
                    <div className="divide-y">
                      {storeItems.map((item) => (
                        <div key={item.product_id} className="px-6 py-4 flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">الكمية: {item.quantity}</p>
                          </div>
                          <p className="font-bold">{(item.price * item.quantity).toFixed(2)} ر.س</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4">ملخص الطلب</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المجموع الفرعي</span>
                    <span>{subtotal.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>رسوم التوصيل</span>
                    <span>{deliveryFee.toFixed(2)} ر.س</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>الإجمالي</span>
                    <span className="text-primary">{total.toFixed(2)} ر.س</span>
                  </div>
                </div>

                <Button 
                  type="submit"
                  variant="hero" 
                  size="xl" 
                  className="w-full gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جارٍ تأكيد الطلب...
                    </>
                  ) : (
                    "تأكيد الطلب"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default Checkout;
