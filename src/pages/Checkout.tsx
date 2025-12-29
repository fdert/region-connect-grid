import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  CreditCard, 
  Banknote, 
  CheckCircle2,
  Loader2,
  ShoppingBag,
  Store,
  ArrowRight,
  MapPin,
  Truck
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PhoneVerification, { LocationInfo } from "@/components/checkout/PhoneVerification";
import { calculateDistance, calculateDeliveryFee } from "@/lib/distance";

type CheckoutStep = "verification" | "payment";

interface StoreDeliveryInfo {
  store_id: string;
  store_name: string;
  distance_km: number;
  delivery_fee: number;
  store_location: { lat: number; lng: number } | null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<CheckoutStep>("verification");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerLocation, setCustomerLocation] = useState<LocationInfo | null>(null);
  const [notes, setNotes] = useState("");
  const [storeDeliveryInfo, setStoreDeliveryInfo] = useState<StoreDeliveryInfo[]>([]);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  // Get unique store IDs from cart items
  const storeIds = [...new Set(items.map(item => item.store_id))];

  // Calculate total delivery fee
  const totalDeliveryFee = storeDeliveryInfo.reduce((acc, store) => acc + store.delivery_fee, 0);
  const total = subtotal + totalDeliveryFee;

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

  // Fetch store locations and calculate delivery fees when customer location is set
  useEffect(() => {
    const calculateDeliveryForStores = async () => {
      if (!customerLocation || storeIds.length === 0) return;

      setIsCalculatingDelivery(true);
      
      try {
        // Fetch store information including location
        const { data: stores, error } = await supabase
          .from("stores")
          .select("id, name, location_lat, location_lng, base_delivery_fee, price_per_km, free_delivery_radius_km, delivery_fee")
          .in("id", storeIds);

        if (error) throw error;

        const deliveryInfo: StoreDeliveryInfo[] = (stores || []).map(store => {
          let distance = 0;
          let fee = Number(store.delivery_fee) || 15; // Default fee if no location

          if (store.location_lat && store.location_lng) {
            // Calculate distance
            distance = calculateDistance(
              store.location_lat,
              store.location_lng,
              customerLocation.lat,
              customerLocation.lng
            );

            // Calculate delivery fee: price_per_km × distance
            fee = calculateDeliveryFee(
              distance,
              Number(store.price_per_km) || 2
            );
          }

          return {
            store_id: store.id,
            store_name: store.name,
            distance_km: distance,
            delivery_fee: fee,
            store_location: store.location_lat && store.location_lng 
              ? { lat: store.location_lat, lng: store.location_lng }
              : null
          };
        });

        setStoreDeliveryInfo(deliveryInfo);
      } catch (error) {
        console.error("Error calculating delivery:", error);
        // Set default delivery fees if calculation fails
        const defaultInfo: StoreDeliveryInfo[] = storeIds.map(storeId => ({
          store_id: storeId,
          store_name: itemsByStore[storeId]?.store_name || "",
          distance_km: 0,
          delivery_fee: 15,
          store_location: null
        }));
        setStoreDeliveryInfo(defaultInfo);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    calculateDeliveryForStores();
  }, [customerLocation, storeIds.join(",")]);

  // Set default delivery fee if no customer location
  useEffect(() => {
    if (!customerLocation && storeDeliveryInfo.length === 0 && storeIds.length > 0) {
      const defaultInfo: StoreDeliveryInfo[] = storeIds.map(storeId => ({
        store_id: storeId,
        store_name: itemsByStore[storeId]?.store_name || "",
        distance_km: 0,
        delivery_fee: 15,
        store_location: null
      }));
      setStoreDeliveryInfo(defaultInfo);
    }
  }, [storeIds.length]);

  const handleVerificationComplete = (phone: string, address: string, location?: LocationInfo) => {
    setVerifiedPhone(phone);
    setDeliveryAddress(address);
    if (location) {
      setCustomerLocation(location);
    }
    setStep("payment");
  };

  const getStoreDeliveryFee = (storeId: string): number => {
    const info = storeDeliveryInfo.find(s => s.store_id === storeId);
    return info?.delivery_fee || 15;
  };

  const getStoreDistance = (storeId: string): number => {
    const info = storeDeliveryInfo.find(s => s.store_id === storeId);
    return info?.distance_km || 0;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول لإتمام الطلب",
        variant: "destructive"
      });
      navigate("/auth/login");
      return;
    }

    if (!verifiedPhone || !deliveryAddress) {
      toast({
        title: "خطأ",
        description: "يجب التحقق من رقم الجوال وإدخال عنوان التوصيل",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create orders for each store
      for (const [storeId, { items: storeItems }] of Object.entries(itemsByStore)) {
        const storeSubtotal = storeItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const storeDeliveryFee = getStoreDeliveryFee(storeId);
        const storeCommission = storeSubtotal * 0.05;

        const orderData = {
          order_number: `ORD-${Date.now()}`,
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
          delivery_fee: storeDeliveryFee,
          platform_commission: storeCommission,
          total: storeSubtotal + storeDeliveryFee,
          delivery_address: deliveryAddress,
          delivery_notes: notes,
          customer_phone: verifiedPhone,
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`flex items-center gap-2 ${step === "verification" ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === "verification" ? "bg-primary text-primary-foreground" : 
                  step === "payment" ? "bg-primary/20 text-primary" : "bg-muted"
                }`}>
                  {step === "payment" ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                </div>
                <span className="font-medium hidden sm:inline">التحقق من الرقم</span>
              </div>
              <div className={`flex-1 h-1 ${step === "payment" ? "bg-primary" : "bg-muted"}`} />
              <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  2
                </div>
                <span className="font-medium hidden sm:inline">الدفع والتأكيد</span>
              </div>
            </div>

            {/* Step Content */}
            {step === "verification" && (
              <PhoneVerification 
                onVerified={handleVerificationComplete}
                onBack={() => navigate("/cart")}
              />
            )}

            {step === "payment" && (
              <>
                {/* Verified Info */}
                <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-success">تم التحقق بنجاح</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{verifiedPhone}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setStep("verification")}
                  >
                    تغيير
                  </Button>
                </div>

                {/* Delivery Address */}
                <div className="bg-card rounded-2xl border p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    عنوان التوصيل
                  </h2>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="whitespace-pre-line text-sm">{deliveryAddress}</p>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">ملاحظات إضافية (اختياري)</label>
                    <Textarea
                      placeholder="أي تعليمات خاصة للتوصيل"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Delivery Fees by Store */}
                {storeDeliveryInfo.length > 0 && (
                  <div className="bg-card rounded-2xl border p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      تفاصيل التوصيل
                    </h2>
                    
                    {isCalculatingDelivery ? (
                      <div className="flex items-center justify-center py-4 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">جاري حساب رسوم التوصيل...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {storeDeliveryInfo.map((info) => (
                          <div key={info.store_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <Store className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{info.store_name}</p>
                                {info.distance_km > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    المسافة: {info.distance_km.toFixed(1)} كم
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-primary">{info.delivery_fee.toFixed(2)} ر.س</p>
                              <p className="text-xs text-muted-foreground">رسوم التوصيل</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                      <div className="px-6 py-3 bg-muted/30 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4" />
                          <span className="font-medium">{store_name}</span>
                        </div>
                        {getStoreDistance(storeId) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {getStoreDistance(storeId).toFixed(1)} كم
                          </span>
                        )}
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
              </>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">ملخص الطلب</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>مبلغ الطلبات</span>
                  <span>{subtotal.toFixed(2)} ر.س</span>
                </div>
                
                {storeDeliveryInfo.length > 0 && (
                  <>
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-muted-foreground mb-2">رسوم التوصيل:</p>
                      {storeDeliveryInfo.map((info) => (
                        <div key={info.store_id} className="flex justify-between text-sm text-muted-foreground py-1">
                          <span className="truncate max-w-[150px]">{info.store_name}</span>
                          <span>{info.delivery_fee.toFixed(2)} ر.س</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>إجمالي التوصيل</span>
                      <span>{totalDeliveryFee.toFixed(2)} ر.س</span>
                    </div>
                  </>
                )}
                
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>الإجمالي المطلوب</span>
                  <span className="text-primary">{total.toFixed(2)} ر.س</span>
                </div>
              </div>

              {step === "payment" && (
                <Button 
                  variant="hero" 
                  size="xl" 
                  className="w-full gap-2"
                  disabled={isSubmitting || isCalculatingDelivery}
                  onClick={handleSubmit}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;
