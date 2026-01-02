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
  Truck,
  Receipt
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PhoneVerification, { LocationInfo } from "@/components/checkout/PhoneVerification";
import { calculateRoadDistance, calculateDeliveryFee } from "@/lib/distance";
import { calculateOrderVatSummary, OrderVatSummary } from "@/lib/vatCalculations";

type CheckoutStep = "verification" | "payment";

interface StoreDeliveryInfo {
  store_id: string;
  store_name: string;
  distance_km: number;
  delivery_fee: number;
  store_location: { lat: number; lng: number } | null;
  error?: string;
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
  const [commissionRate, setCommissionRate] = useState(10); // نسبة العمولة الافتراضية
  const [vatRate, setVatRate] = useState(15); // نسبة الضريبة الافتراضية

  // Get unique store IDs from cart items
  const storeIds = [...new Set(items.map(item => item.store_id))];

  // Calculate total delivery fee
  const totalDeliveryFee = storeDeliveryInfo.reduce((acc, store) => acc + store.delivery_fee, 0);
  const total = subtotal + totalDeliveryFee;
  
  // Check if there are any delivery calculation errors
  const hasDeliveryErrors = storeDeliveryInfo.some(info => info.error);

  // جلب إعدادات العمولة والضريبة
  useEffect(() => {
    const fetchSettings = async () => {
      const { data: settings } = await supabase
        .from('commission_settings')
        .select('*')
        .eq('is_active', true);
      
      if (settings) {
        const platformComm = settings.find(s => s.applies_to === 'platform');
        const taxSetting = settings.find(s => s.applies_to === 'tax');
        
        if (platformComm) setCommissionRate(Number(platformComm.percentage));
        if (taxSetting) setVatRate(Number(taxSetting.percentage));
      }
    };
    fetchSettings();
  }, []);

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

        // Calculate road distance for each store
        const deliveryInfoPromises = (stores || []).map(async (store) => {
          let distance = 0;
          let fee = 0;
          let errorMsg: string | undefined;

          if (store.location_lat && store.location_lng) {
            // Calculate road distance using OSRM API
            const roadResult = await calculateRoadDistance(
              store.location_lat,
              store.location_lng,
              customerLocation.lat,
              customerLocation.lng
            );
            
            if (roadResult.success) {
              distance = roadResult.distance_km;
              console.log(`Road distance from ${store.name}: ${distance} km`);

              // Calculate delivery fee: price_per_km × distance
              fee = calculateDeliveryFee(
                distance,
                Number(store.price_per_km) || 2
              );
            } else {
              console.error(`Failed to calculate distance for ${store.name}:`, 'error' in roadResult ? roadResult.error : 'Unknown error');
              errorMsg = 'error' in roadResult ? roadResult.error : 'فشل في حساب المسافة';
            }
          } else {
            errorMsg = "موقع المتجر غير محدد";
          }

          return {
            store_id: store.id,
            store_name: store.name,
            distance_km: distance,
            delivery_fee: fee,
            store_location: store.location_lat && store.location_lng 
              ? { lat: store.location_lat, lng: store.location_lng }
              : null,
            error: errorMsg
          };
        });

        const deliveryInfo = await Promise.all(deliveryInfoPromises);
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

    if (hasDeliveryErrors) {
      toast({
        title: "خطأ في حساب رسوم التوصيل",
        description: "لا يمكن إتمام الطلب بسبب خطأ في حساب رسوم التوصيل. تأكد من صحة موقع التوصيل وموقع المتجر.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create orders for each store
      for (const [storeId, { items: storeItems }] of Object.entries(itemsByStore)) {
        const storeDeliveryFee = getStoreDeliveryFee(storeId);
        
        // حساب الملخص الضريبي الكامل للطلب
        const vatSummary = calculateOrderVatSummary(
          storeItems.map(item => ({
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          storeDeliveryFee,
          vatRate,
          commissionRate
        );

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
          subtotal: vatSummary.subtotal_inc_vat,
          subtotal_ex_vat: vatSummary.subtotal_ex_vat,
          vat_on_products: vatSummary.vat_on_products,
          delivery_fee: storeDeliveryFee,
          delivery_fee_ex_vat: vatSummary.delivery_fee_ex_vat,
          vat_on_delivery: vatSummary.vat_on_delivery,
          platform_commission: vatSummary.total_commission_inc_vat,
          total_commission_ex_vat: vatSummary.total_commission_ex_vat,
          total_commission_vat: vatSummary.total_commission_vat,
          total_merchant_payout: vatSummary.total_merchant_payout,
          tax_amount: vatSummary.vat_on_products + vatSummary.vat_on_delivery,
          total: vatSummary.order_total,
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

        // حفظ تفاصيل بنود الطلب مع snapshot الضريبي
        const orderItemDetails = vatSummary.items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price_ex_vat: item.unit_price_ex_vat,
          vat_rate: item.vat_rate,
          line_subtotal_ex_vat: item.line_subtotal_ex_vat,
          line_vat_amount: item.line_vat_amount,
          line_total: item.line_total,
          commission_rate: item.commission_rate,
          commission_ex_vat: item.commission_ex_vat,
          commission_vat: item.commission_vat,
          commission_total: item.commission_total,
          merchant_payout: item.merchant_payout
        }));

        await supabase.from("order_item_details").insert(orderItemDetails as any);

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
                          <div key={info.store_id} className={`flex items-center justify-between p-3 rounded-xl ${info.error ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
                            <div className="flex items-center gap-3">
                              <Store className={`w-5 h-5 ${info.error ? 'text-destructive' : 'text-muted-foreground'}`} />
                              <div>
                                <p className="font-medium">{info.store_name}</p>
                                {info.error ? (
                                  <p className="text-xs text-destructive">
                                    {info.error}
                                  </p>
                                ) : info.distance_km > 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    المسافة: {info.distance_km.toFixed(1)} كم
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-left">
                              {info.error ? (
                                <p className="font-bold text-destructive">خطأ</p>
                              ) : (
                                <>
                                  <p className="font-bold text-primary">{info.delivery_fee.toFixed(2)} ر.س</p>
                                  <p className="text-xs text-muted-foreground">رسوم التوصيل</p>
                                </>
                              )}
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
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                ملخص الطلب
              </h2>
              
              <div className="space-y-4 mb-6">
                {/* حساب الملخص الضريبي للعرض */}
                {(() => {
                  const allItems = items.map(item => ({
                    product_id: item.product_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                  }));
                  const summary = calculateOrderVatSummary(allItems, totalDeliveryFee, vatRate, commissionRate);
                  
                  return (
                    <>
                      {/* إجمالي المنتجات شامل الضريبة */}
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">إجمالي المنتجات</span>
                          <p className="text-xs text-muted-foreground">شامل ضريبة القيمة المضافة {vatRate}%</p>
                        </div>
                        <span className="font-semibold">{summary.subtotal_inc_vat.toFixed(2)} ر.س</span>
                      </div>
                      
                      {/* رسوم التوصيل شامل الضريبة */}
                      {totalDeliveryFee > 0 && (
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">رسوم التوصيل</span>
                            <p className="text-xs text-muted-foreground">شامل ضريبة القيمة المضافة {vatRate}%</p>
                          </div>
                          <span className="font-semibold">{totalDeliveryFee.toFixed(2)} ر.س</span>
                        </div>
                      )}

                      {/* فاصل */}
                      <div className="border-t border-dashed border-border my-2" />
                      
                      {/* الإجمالي المطلوب - بشكل مميز */}
                      <div className="bg-primary/10 rounded-xl p-4 -mx-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-lg">الإجمالي المطلوب</span>
                            <p className="text-xs text-muted-foreground">شامل جميع الضرائب والرسوم</p>
                          </div>
                          <span className="font-bold text-2xl text-primary">{summary.order_total.toFixed(2)} ر.س</span>
                        </div>
                      </div>

                      {/* ملاحظة توضيحية */}
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        الأسعار شاملة ضريبة القيمة المضافة 15%
                      </p>
                    </>
                  );
                })()}
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
