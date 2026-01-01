import MobileLayout from "@/components/courier/MobileLayout";
import PaymentConfirmationDialog from "@/components/courier/PaymentConfirmationDialog";
import CourierDeliveryMap from "@/components/tracking/CourierDeliveryMap";
import { 
  Package, 
  MapPin,
  Clock,
  Navigation,
  Loader2,
  Search,
  CheckCircle,
  Phone,
  Truck,
  ArrowUpDown,
  Filter,
  CreditCard,
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { useCourierGPS } from "@/hooks/useCourierGPS";
import { parseCoordinatesFromUrl } from "@/lib/distance";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type OrderStatus = Database['public']['Enums']['order_status'];

const statusLabels: Record<string, string> = {
  "assigned_to_courier": "تم تعيينك",
  "picked_up": "تم الاستلام",
  "on_the_way": "في الطريق",
  "delivered": "تم التسليم",
  "ready": "جاهز"
};

const statusColors: Record<string, string> = {
  "assigned_to_courier": "bg-cyan-500",
  "ready": "bg-yellow-500",
  "picked_up": "bg-indigo-500",
  "on_the_way": "bg-primary",
  "delivered": "bg-green-500",
};

const MobileOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showStoreMap, setShowStoreMap] = useState(false);
  const [showCustomerMap, setShowCustomerMap] = useState(false);
  const [courierLocation, setCourierLocation] = useState<{lat: number; lng: number} | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const gpsState = useCourierGPS(
    selectedOrder?.id || null, 
    selectedOrder?.status === 'picked_up' || selectedOrder?.status === 'on_the_way'
  );

  // Update courier location from GPS
  useEffect(() => {
    if (gpsState.position) {
      setCourierLocation({
        lat: gpsState.position.lat,
        lng: gpsState.position.lng
      });
    }
  }, [gpsState.position]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['courier-all-orders-mobile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name, address, city, phone, logo_url, location_lat, location_lng)
        `)
        .eq('courier_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, oldStatus }: { orderId: string; newStatus: OrderStatus; oldStatus?: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;

      try {
        const { notifyOrderStatusChange } = await import('@/lib/notifications');
        await notifyOrderStatusChange(orderId, newStatus, oldStatus);
      } catch (err) {
        console.error('Notification failed:', err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-all-orders-mobile'] });
      toast.success("تم تحديث الحالة");
      setSelectedOrder(null);
    },
    onError: () => {
      toast.error("حدث خطأ");
    }
  });

  const activeStatuses = ['assigned_to_courier', 'ready', 'picked_up', 'on_the_way'];
  
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone?.includes(searchTerm) ||
      order.store?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "active") {
      return matchesSearch && activeStatuses.includes(order.status || '');
    } else if (filterStatus === "completed") {
      return matchesSearch && order.status === 'delivered';
    }
    return matchesSearch;
  }) || [];

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM - hh:mm a', { locale: ar });
  };

  const openGoogleMaps = (lat?: number | null, lng?: number | null, address?: string | null) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const callPhone = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  if (isLoading) {
    return (
      <MobileLayout title="الطلبات">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  const activeCount = orders?.filter(o => activeStatuses.includes(o.status || '')).length || 0;
  const completedCount = orders?.filter(o => o.status === 'delivered').length || 0;

  return (
    <MobileLayout title="الطلبات">
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الطلب أو المتجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 h-12 rounded-xl"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            className="rounded-full whitespace-nowrap"
          >
            الكل ({orders?.length || 0})
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("active")}
            className="rounded-full whitespace-nowrap"
          >
            نشطة ({activeCount})
          </Button>
          <Button
            variant={filterStatus === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("completed")}
            className="rounded-full whitespace-nowrap"
          >
            مكتملة ({completedCount})
          </Button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <Sheet key={order.id}>
                <SheetTrigger asChild>
                  <div 
                    className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{order.order_number}</span>
                        <Badge className={`${statusColors[order.status || '']} text-white border-0 text-xs`}>
                          {statusLabels[order.status || '']}
                        </Badge>
                      </div>
                      <span className="font-bold text-primary">{order.delivery_fee || 0} ر.س</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="truncate max-w-[50%]">{order.store?.name}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(order.created_at || '')}
                      </span>
                    </div>
                  </div>
                </SheetTrigger>
                
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
                  <SheetHeader className="p-4 border-b border-border">
                    <SheetTitle className="flex items-center justify-between">
                      <span>{order.order_number}</span>
                      <Badge className={`${statusColors[order.status || '']} text-white border-0`}>
                        {statusLabels[order.status || '']}
                      </Badge>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="p-4 space-y-4 overflow-y-auto h-[calc(85vh-120px)]">
                    {/* GPS Status */}
                    {(order.status === 'picked_up' || order.status === 'on_the_way') && (
                      <div className={`rounded-xl p-3 ${gpsState.isTracking ? 'bg-primary/10' : 'bg-muted'}`}>
                        <div className="flex items-center gap-2">
                          <MapPin className={`w-4 h-4 ${gpsState.isTracking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-medium">
                            {gpsState.isTracking ? 'تتبع GPS مفعّل - موقعك يُرسل للعميل' : 'تتبع GPS متوقف'}
                          </span>
                        </div>
                        {gpsState.accuracy && (
                          <span className="text-xs text-muted-foreground block mt-1">
                            الدقة: {Math.round(gpsState.accuracy)} متر
                          </span>
                        )}
                      </div>
                    )}

                    {/* Store Info */}
                    <div className="bg-muted/50 rounded-xl p-4">
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        الاستلام من
                      </h3>
                      <div className="space-y-2">
                        <p className="font-medium">{order.store?.name}</p>
                        <p className="text-sm text-muted-foreground">{order.store?.address || order.store?.city}</p>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setShowStoreMap(!showStoreMap)}
                          >
                            <Navigation className="w-4 h-4 ml-1" />
                            الملاحة
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openGoogleMaps(order.store?.location_lat, order.store?.location_lng, order.store?.address)}
                          >
                            <Map className="w-4 h-4" />
                          </Button>
                          {order.store?.phone && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => callPhone(order.store.phone)}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Store Navigation Map */}
                        {showStoreMap && order.store?.location_lat && order.store?.location_lng && (
                          <div className="mt-3">
                            <CourierDeliveryMap
                              orderId={order.id}
                              storeLocation={null}
                              customerLocation={{ lat: order.store.location_lat, lng: order.store.location_lng }}
                              courierLocation={courierLocation}
                              storeName={order.store?.name}
                              destinationType="store"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-muted/50 rounded-xl p-4">
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Navigation className="w-4 h-4 text-green-500" />
                        </div>
                        التوصيل إلى
                      </h3>
                      <div className="space-y-2">
                        <p className="font-medium">{order.customer_phone || 'العميل'}</p>
                        <p className="text-sm text-muted-foreground">{order.delivery_address || 'لم يتم تحديد العنوان'}</p>
                        {order.delivery_notes && (
                          <p className="text-sm text-muted-foreground bg-yellow-500/10 p-2 rounded-lg">
                            📝 {order.delivery_notes}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setShowCustomerMap(!showCustomerMap)}
                          >
                            <Navigation className="w-4 h-4 ml-1" />
                            الملاحة
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              const customerCoords = order.delivery_address ? parseCoordinatesFromUrl(order.delivery_address) : null;
                              if (customerCoords) {
                                openGoogleMaps(customerCoords.lat, customerCoords.lng, null);
                              } else {
                                openGoogleMaps(null, null, order.delivery_address);
                              }
                            }}
                          >
                            <Map className="w-4 h-4" />
                          </Button>
                          {order.customer_phone && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => callPhone(order.customer_phone!)}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Customer Navigation Map */}
                        {showCustomerMap && (
                          <div className="mt-3">
                            <CourierDeliveryMap
                              orderId={order.id}
                              storeLocation={
                                order.store?.location_lat && order.store?.location_lng
                                  ? { lat: order.store.location_lat, lng: order.store.location_lng }
                                  : null
                              }
                              customerLocation={
                                (() => {
                                  if (order.delivery_address) {
                                    const parsed = parseCoordinatesFromUrl(order.delivery_address);
                                    if (parsed) return parsed;
                                  }
                                  return null;
                                })()
                              }
                              courierLocation={courierLocation}
                              storeName={order.store?.name}
                              destinationType="customer"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="bg-muted/50 rounded-xl p-4">
                      <h3 className="font-bold mb-3">تفاصيل الطلب</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رسوم التوصيل</span>
                          <span className="font-bold text-primary">{order.delivery_fee || 0} ر.س</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">إجمالي الطلب</span>
                          <span className="font-bold">{order.total || 0} ر.س</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">طريقة الدفع</span>
                          <span>{order.payment_method === 'cash' ? 'نقداً' : 'إلكتروني'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">التاريخ</span>
                          <span>{formatDate(order.created_at || '')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-t border-border bg-background">
                    {(order.status === 'assigned_to_courier' || order.status === 'ready') && (
                      <Button 
                        className="w-full h-14 text-lg"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'picked_up', oldStatus: order.status || undefined })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-5 h-5 ml-2" />
                        تم الاستلام من المتجر
                      </Button>
                    )}
                    {order.status === 'picked_up' && (
                      <Button 
                        className="w-full h-14 text-lg"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'on_the_way', oldStatus: order.status || undefined })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Truck className="w-5 h-5 ml-2" />
                        في الطريق للعميل
                      </Button>
                    )}
                    {order.status === 'on_the_way' && (
                      <Button 
                        className="w-full h-14 text-lg bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowPaymentDialog(true);
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CreditCard className="w-5 h-5 ml-2" />
                        تأكيد التسليم والدفع
                      </Button>
                    )}
                    {order.status === 'delivered' && (
                      <div className="bg-green-500/10 rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-medium text-green-600">تم تسليم الطلب بنجاح</p>
                        {order.payment_confirmed && (
                          <p className="text-xs text-muted-foreground mt-1">
                            تم استلام {order.amount_received} ر.س - {order.payment_method === 'cash' ? 'نقداً' : 'بالبطاقة'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            ))}
          </div>
        )}
      </div>

      {/* Payment Confirmation Dialog */}
      {selectedOrder && (
        <PaymentConfirmationDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          order={selectedOrder}
          onConfirm={() => {
            queryClient.invalidateQueries({ queryKey: ['courier-all-orders-mobile'] });
            setSelectedOrder(null);
          }}
        />
      )}
    </MobileLayout>
  );
};

export default MobileOrders;
