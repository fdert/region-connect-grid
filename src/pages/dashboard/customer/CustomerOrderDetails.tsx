import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { 
  ArrowRight,
  Package, 
  Clock,
  Loader2,
  MapPin,
  Store,
  Phone,
  CheckCircle,
  Star,
  Truck,
  Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseCoordinatesFromUrl } from "@/lib/distance";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";

const statusLabels: Record<string, string> = {
  "new": "جديد",
  "accepted_by_merchant": "تم القبول",
  "preparing": "قيد التحضير",
  "ready": "جاهز",
  "assigned_to_courier": "تم تعيين مندوب",
  "picked_up": "تم الاستلام",
  "on_the_way": "في الطريق",
  "delivered": "تم التسليم",
  "cancelled": "ملغي",
  "failed": "فشل"
};

const statusColors: Record<string, string> = {
  "new": "bg-info",
  "accepted_by_merchant": "bg-blue-500",
  "preparing": "bg-warning",
  "ready": "bg-orange-500",
  "assigned_to_courier": "bg-cyan-500",
  "picked_up": "bg-indigo-500",
  "on_the_way": "bg-primary",
  "delivered": "bg-success",
  "cancelled": "bg-destructive",
  "failed": "bg-destructive"
};

const getOrderProgress = (status: string): number => {
  const progressMap: Record<string, number> = {
    "new": 10,
    "accepted_by_merchant": 20,
    "preparing": 40,
    "ready": 50,
    "assigned_to_courier": 60,
    "picked_up": 70,
    "on_the_way": 85,
    "delivered": 100,
    "cancelled": 0,
    "failed": 0
  };
  return progressMap[status] || 0;
};

const CustomerOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ['customer-order-details', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, store:stores(id, name, logo_url, address, phone, location_lat, location_lng)`)
        .eq('id', id)
        .eq('customer_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
    refetchInterval: 10000
  });

  const { data: timeline } = useQuery({
    queryKey: ['order-timeline', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_timeline')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: 10000
  });

  const { data: existingReview } = useQuery({
    queryKey: ['order-review', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_reviews')
        .select('*')
        .eq('order_id', id)
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['customer-order-details', id] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_timeline', filter: `order_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['order-timeline', id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('store_reviews').insert({
        store_id: order?.store_id, user_id: user?.id, order_id: order?.id, rating, comment: reviewComment || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-review'] });
      setIsRatingOpen(false);
      setRating(0);
      setReviewComment("");
      toast({ title: "شكراً لك!", description: "تم إرسال تقييمك بنجاح" });
    },
    onError: () => { toast({ title: "خطأ", description: "حدث خطأ أثناء إرسال التقييم", variant: "destructive" }); }
  });

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy - hh:mm a', { locale: ar });
  const formatTimeAgo = (date: string) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  const getItemsCount = (items: unknown) => Array.isArray(items) ? items.length : 0;

  if (isLoading) {
    return (<DashboardLayout role="customer"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  if (!order) {
    return (<DashboardLayout role="customer"><div className="text-center py-12"><Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h2 className="text-xl font-bold mb-2">الطلب غير موجود</h2><Button onClick={() => navigate('/customer/orders')}>العودة للطلبات</Button></div></DashboardLayout>);
  }

  const canRate = order.status === 'delivered' && !existingReview;
  const isActive = !['delivered', 'cancelled', 'failed'].includes(order.status || '');
  const items = Array.isArray(order.items) ? order.items : [];
  
  // Check if order is in delivery status (courier assigned and on the way)
  const isInDelivery = ['assigned_to_courier', 'picked_up', 'on_the_way'].includes(order.status || '');
  
  // Get store location
  const storeLocation = order.store?.location_lat && order.store?.location_lng
    ? { lat: Number(order.store.location_lat), lng: Number(order.store.location_lng) }
    : null;
  
  // Parse customer location from delivery address if it contains coordinates URL
  const customerLocation = order.delivery_address 
    ? parseCoordinatesFromUrl(order.delivery_address) 
    : null;

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customer/orders')}><ArrowRight className="w-5 h-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">{formatTimeAgo(order.created_at || '')}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium text-primary-foreground ${statusColors[order.status || 'new']}`}>{statusLabels[order.status || 'new']}</span>
        </div>

        {isActive && (
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <h3 className="font-bold mb-4">حالة الطلب</h3>
            <Progress value={getOrderProgress(order.status || 'new')} className="h-3 mb-3" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>تم الطلب</span><span>قيد التحضير</span><span>في الطريق</span><span>تم التسليم</span></div>
          </div>
        )}

        {/* Live Tracking Map - Show when courier is assigned */}
        {isInDelivery && (storeLocation || customerLocation) && (
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              تتبع الطلب مباشرة
            </h3>
            <OrderTrackingMap
              orderId={order.id}
              storeLocation={storeLocation}
              customerLocation={customerLocation}
              storeName={order.store?.name}
            />
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h3 className="font-bold mb-4">تتبع الطلب</h3>
          <div className="space-y-4">
            {timeline && timeline.length > 0 ? timeline.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index === timeline.length - 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><CheckCircle className="w-5 h-5" /></div>
                  {index < timeline.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="font-medium">{statusLabels[event.status]}</div>
                  {event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}
                  <div className="text-xs text-muted-foreground mt-1">{formatDate(event.created_at || '')}</div>
                </div>
              </div>
            )) : (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground"><Package className="w-5 h-5" /></div>
                <div><div className="font-medium">تم استلام الطلب</div><div className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at || '')}</div></div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h3 className="font-bold mb-4">تفاصيل الطلب ({getItemsCount(order.items)} منتجات)</h3>
          <div className="space-y-3">
            {items.map((item: { name?: string; quantity?: number; price?: number; image?: string }, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center overflow-hidden">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div><div className="font-medium">{item.name}</div><div className="text-sm text-muted-foreground">الكمية: {item.quantity}</div></div>
                </div>
                <div className="font-bold">{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()} ر.س</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">المجموع الفرعي</span><span>{Number(order.subtotal || 0).toLocaleString()} ر.س</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">رسوم التوصيل</span><span>{Number(order.delivery_fee || 0).toLocaleString()} ر.س</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>الإجمالي</span><span className="text-primary">{Number(order.total || 0).toLocaleString()} ر.س</span></div>
          </div>
        </div>

        {canRate && <Button className="w-full gap-2" size="lg" onClick={() => setIsRatingOpen(true)}><Star className="w-5 h-5" />قيّم طلبك</Button>}

        {existingReview && (
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <h3 className="font-bold mb-4">تقييمك</h3>
            <div className="flex items-center gap-1 mb-2">{[1,2,3,4,5].map((star) => <Star key={star} className={`w-5 h-5 ${star <= existingReview.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />)}</div>
            {existingReview.comment && <p className="text-muted-foreground">{existingReview.comment}</p>}
          </div>
        )}

        <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>تقييم الطلب</DialogTitle></DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">كيف كانت تجربتك مع هذا الطلب؟</p>
                <div className="flex items-center justify-center gap-2">
                  {[1,2,3,4,5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} className="p-1 transition-transform hover:scale-110">
                      <Star className={`w-10 h-10 transition-colors ${star <= (hoveredRating || rating) ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>تعليق (اختياري)</Label>
                <Textarea placeholder="شاركنا رأيك..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
              </div>
              <Button className="w-full" disabled={rating === 0 || submitReviewMutation.isPending} onClick={() => submitReviewMutation.mutate()}>
                {submitReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال التقييم'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CustomerOrderDetails;
