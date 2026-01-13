import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

type PaymentStatus = "loading" | "success" | "failed" | "pending";

const PaymentResult = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [orderNumber, setOrderNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const orderId = searchParams.get("order_id");
  const tapId = searchParams.get("tap_id");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!orderId) {
        setStatus("failed");
        setErrorMessage("رقم الطلب غير موجود");
        return;
      }

      try {
        // Check order status from database
        const { data: order, error } = await supabase
          .from("orders")
          .select("id, order_number, paid, payment_confirmed")
          .eq("id", orderId)
          .single();

        if (error || !order) {
          setStatus("failed");
          setErrorMessage("لم يتم العثور على الطلب");
          return;
        }

        setOrderNumber(order.order_number);

        // Check payment status
        if (order.paid || order.payment_confirmed) {
          setStatus("success");
          // Clear cart on successful payment
          await clearCart();
          
          // Send WhatsApp notification
          try {
            const { notifyNewOrder } = await import('@/lib/notifications');
            await notifyNewOrder(order.id);
          } catch (notifyError) {
            console.error('Failed to send new order notification:', notifyError);
          }
        } else {
          // Wait a moment and check again (webhook might be processing)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: updatedOrder } = await supabase
            .from("orders")
            .select("paid, payment_confirmed")
            .eq("id", orderId)
            .single();

          if (updatedOrder?.paid || updatedOrder?.payment_confirmed) {
            setStatus("success");
            await clearCart();
          } else {
            // Check URL params for payment status
            const tapStatus = searchParams.get("status");
            if (tapStatus === "CAPTURED") {
              setStatus("success");
              await clearCart();
            } else if (tapStatus === "FAILED" || tapStatus === "DECLINED" || tapStatus === "CANCELLED") {
              setStatus("failed");
              setErrorMessage("تم رفض عملية الدفع");
            } else {
              setStatus("pending");
            }
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        setStatus("failed");
        setErrorMessage("حدث خطأ أثناء التحقق من حالة الدفع");
      }
    };

    checkPaymentStatus();
  }, [orderId, searchParams, clearCart]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">جاري التحقق من الدفع...</h1>
            <p className="text-muted-foreground">
              يرجى الانتظار بينما نتحقق من حالة الدفع
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-success">تم الدفع بنجاح!</h1>
            <p className="text-muted-foreground mb-4">
              شكراً لطلبك. سنقوم بتجهيزه في أقرب وقت.
            </p>
            {orderNumber && (
              <p className="text-lg font-semibold text-primary mb-8">
                رقم الطلب: {orderNumber}
              </p>
            )}
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
        );

      case "failed":
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-destructive">فشل الدفع</h1>
            <p className="text-muted-foreground mb-4">
              {errorMessage || "لم تتم عملية الدفع بنجاح. يرجى المحاولة مرة أخرى."}
            </p>
            {orderNumber && (
              <p className="text-sm text-muted-foreground mb-8">
                رقم الطلب: {orderNumber}
              </p>
            )}
            <div className="space-y-3">
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/checkout")}
              >
                إعادة المحاولة
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/cart")}
              >
                العودة للسلة
              </Button>
            </div>
          </div>
        );

      case "pending":
        return (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-12 h-12 text-warning" />
            </div>
            <h1 className="text-2xl font-bold mb-2">قيد المعالجة</h1>
            <p className="text-muted-foreground mb-4">
              لا يزال الدفع قيد المعالجة. سنقوم بإعلامك عند اكتمال العملية.
            </p>
            {orderNumber && (
              <p className="text-lg font-semibold text-primary mb-8">
                رقم الطلب: {orderNumber}
              </p>
            )}
            <div className="space-y-3">
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/customer")}
              >
                عرض طلباتي
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
        );
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {renderContent()}
        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentResult;
