import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Store, Truck, Loader2, CheckCircle, Home, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const ReviewOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  
  // Store review
  const [storeRating, setStoreRating] = useState(0);
  const [storeComment, setStoreComment] = useState("");
  
  // Courier review
  const [courierRating, setCourierRating] = useState(0);
  const [courierComment, setCourierComment] = useState("");

  useEffect(() => {
    if (orderId && orderId !== ':orderId') {
      fetchOrder();
    } else {
      setIsLoading(false);
      setInvalidLink(true);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!orderId || !uuidRegex.test(orderId)) {
      setIsLoading(false);
      setInvalidLink(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(id, name, logo_url)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("الطلب غير موجود");
        navigate('/');
        return;
      }
      
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error("حدث خطأ في تحميل الطلب");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (storeRating === 0 && courierRating === 0) {
      toast.error("يرجى إضافة تقييم واحد على الأقل");
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit store review - use customer_id from order for guests
      if (storeRating > 0 && order.store?.id) {
        const userId = user?.id || order.customer_id;
        
        const { error: storeError } = await supabase
          .from('store_reviews')
          .insert({
            store_id: order.store.id,
            order_id: order.id,
            user_id: userId,
            rating: storeRating,
            comment: storeComment || null,
          });

        if (storeError) {
          console.error('Store review error:', storeError);
          throw storeError;
        }

        // Update store rating
        const { data: reviews } = await supabase
          .from('store_reviews')
          .select('rating')
          .eq('store_id', order.store.id);

        if (reviews && reviews.length > 0) {
          const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          await supabase
            .from('stores')
            .update({ 
              rating: avgRating,
              total_reviews: reviews.length 
            })
            .eq('id', order.store.id);
        }
      }

      // Submit courier review - use customer_id from order for guests
      if (courierRating > 0 && order.courier_id) {
        const customerId = user?.id || order.customer_id;
        
        const { error: courierError } = await supabase
          .from('courier_reviews')
          .insert({
            courier_id: order.courier_id,
            order_id: order.id,
            customer_id: customerId,
            rating: courierRating,
            comment: courierComment || null,
          });

        if (courierError) {
          console.error('Courier review error:', courierError);
          throw courierError;
        }
      }

      setSubmitted(true);
      toast.success("شكراً لتقييمك!");
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalidLink || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">رابط التقييم غير صحيح</h1>
            <p className="text-muted-foreground mb-6">
              يرجى التأكد من استخدام الرابط الصحيح المرسل إليك عبر الواتساب
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              <Home className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">شكراً لتقييمك!</h1>
            <p className="text-muted-foreground mb-6">تقييمك يساعدنا في تحسين خدماتنا</p>
            <Button onClick={() => navigate('/')} className="w-full">
              <Home className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StarRating = ({ rating, onChange }: { rating: number; onChange: (r: number) => void }) => (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`w-10 h-10 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">تقييم الطلب #{order?.order_number}</h1>
          <p className="text-muted-foreground">ساعدنا في تحسين خدماتنا بتقييمك</p>
        </div>

        {/* Store Review */}
        {order?.store && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {order.store.logo_url ? (
                    <img src={order.store.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <span className="block">تقييم المتجر</span>
                  <span className="text-sm font-normal text-muted-foreground">{order.store.name}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StarRating rating={storeRating} onChange={setStoreRating} />
              {storeRating > 0 && (
                <Textarea
                  placeholder="اكتب تعليقك عن المتجر (اختياري)"
                  value={storeComment}
                  onChange={(e) => setStoreComment(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Courier Review */}
        {order?.courier_id && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <span className="block">تقييم المندوب</span>
                  <span className="text-sm font-normal text-muted-foreground">خدمة التوصيل</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StarRating rating={courierRating} onChange={setCourierRating} />
              {courierRating > 0 && (
                <Textarea
                  placeholder="اكتب تعليقك عن المندوب (اختياري)"
                  value={courierComment}
                  onChange={(e) => setCourierComment(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              )}
            </CardContent>
          </Card>
        )}

        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || (storeRating === 0 && courierRating === 0)}
          className="w-full h-14 text-lg"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "إرسال التقييم"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ReviewOrder;
